"""Mise à jour automatique : compare la version installée à celle publiée sur GitHub et l'installe."""

import io
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
REPO = "haiko970/jarvis"
BRANCH = "claude/adoring-mayer-u2tfmy"
# « refs/heads/… » : l'adresse complète de la branche, que GitHub garde moins longtemps en cache
REMOTE_VERSION = f"https://raw.githubusercontent.com/{REPO}/refs/heads/{BRANCH}/jarvis/version.json"
ZIP_URL = f"https://github.com/{REPO}/archive/refs/heads/{BRANCH}.zip"
KEEP = {".venv", ".env", ".git"}  # jamais remplacés (installation Python, réglages locaux)

_cache = {"time": 0.0, "data": None}


def local_version() -> dict:
    try:
        return json.loads((Path(__file__).parent / "version.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"version": "0"}


def _as_tuple(version: str) -> tuple:
    return tuple(int(p) for p in version.split(".") if p.isdigit())


def check(force: bool = False) -> dict:
    """{installee, disponible, nouveautes, a_jour} — vérifié au plus toutes les 10 minutes."""
    if not force and _cache["data"] and time.time() - _cache["time"] < 600:
        return _cache["data"]
    current = local_version()["version"]
    result = {"installee": current, "disponible": None, "nouveautes": "", "maj": False}
    try:
        url = f"{REMOTE_VERSION}?t={int(time.time())}"  # évite une vieille copie en cache
        with urllib.request.urlopen(url, timeout=10) as r:
            remote = json.loads(r.read().decode("utf-8"))
        result.update(disponible=remote["version"], nouveautes=remote.get("nouveautes", ""))
        result["maj"] = _as_tuple(remote["version"]) > _as_tuple(current)
    except Exception as e:
        result["erreur"] = str(e)
    _cache.update(time=time.time(), data=result)
    return result


def install() -> tuple[bool, str]:
    """Télécharge la dernière version et remplace les fichiers de Jarvis (pas les réglages)."""
    try:
        with urllib.request.urlopen(ZIP_URL, timeout=120) as r:
            archive = zipfile.ZipFile(io.BytesIO(r.read()))
    except Exception as e:
        return False, f"Téléchargement impossible : {e}"
    try:
        from . import ruview

        ruview.arreter()  # sous Windows, un programme en marche ne peut pas être remplacé
    except Exception:
        pass
    try:
        with tempfile.TemporaryDirectory() as tmp:
            archive.extractall(tmp)
            roots = [p for p in Path(tmp).iterdir() if (p / "jarvis" / "__main__.py").exists()]
            if not roots:
                return False, "L'archive téléchargée ne ressemble pas à Jarvis : mise à jour annulée."
            root = roots[0]
            nouveaux = [f for f in sorted(root.rglob("*")) if f.is_file() and f.relative_to(root).parts[0] not in KEEP]
            echecs = []
            # version.json en dernier : si quelque chose rate, Jarvis reproposera la mise à jour
            nouveaux.sort(key=lambda f: f.name == "version.json")
            for f in nouveaux:
                cible = PROJECT_DIR / f.relative_to(root)
                try:
                    _remplacer(f, cible)
                except Exception as e:
                    echecs.append(f"{f.relative_to(root)} ({e.__class__.__name__})")
    except Exception as e:
        return False, f"Installation impossible : {e}"
    _cache["data"] = None
    if echecs:
        return False, ("Mise à jour incomplète, ces fichiers étaient bloqués : " + ", ".join(echecs[:4])
                       + ". Ferme complètement Jarvis (icône près de l'horloge → Quitter) et réessaie.")
    return True, f"Jarvis est passé à la version {local_version()['version']}."


def _remplacer(source: Path, cible: Path) -> None:
    """Copie un fichier, sauf s'il n'a pas changé. Sous Windows, un fichier occupé (un programme
    en marche…) ne peut pas être écrasé mais peut être renommé : on le met de côté puis on copie."""
    if cible.exists() and cible.stat().st_size == source.stat().st_size and cible.read_bytes() == source.read_bytes():
        return  # identique : rien à faire (et rien à bloquer)
    cible.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(source, cible)
    except PermissionError:
        ancien = cible.with_name(cible.name + f".ancien{int(time.time())}")
        os.replace(cible, ancien)  # le fichier occupé change juste de nom
        shutil.copy2(source, cible)
        try:
            ancien.unlink()
        except OSError:
            pass  # encore utilisé : il sera supprimé à la prochaine mise à jour
    for vieux in cible.parent.glob(cible.name + ".ancien*"):  # ménage des fois précédentes
        try:
            vieux.unlink()
        except OSError:
            pass


def restart(discret: bool = False) -> None:
    """Relance Jarvis dans une nouvelle fenêtre puis ferme l'ancienne fenêtre noire.
    discret=True (mise à jour faite pendant la veille) : il revient en veille, sans fenêtre."""
    if platform.system() == "Windows":
        launcher = PROJECT_DIR / "lancer_jarvis.bat"
        if discret and (PROJECT_DIR / "lancer_discret.vbs").exists():
            subprocess.Popen(["wscript", str(PROJECT_DIR / "lancer_discret.vbs")], cwd=PROJECT_DIR)
        else:
            subprocess.Popen(["cmd", "/c", "start", "Jarvis", str(launcher)], cwd=PROJECT_DIR)
        try:  # l'ancienne fenêtre noire ne doit pas relire un lanceur qui vient d'être remplacé
            import psutil

            parent = psutil.Process().parent()
            if parent and parent.name().lower() == "cmd.exe":
                parent.kill()
        except Exception:
            pass
    else:
        subprocess.Popen([sys.executable, "-m", "jarvis"], cwd=PROJECT_DIR, start_new_session=True)
    os._exit(0)
