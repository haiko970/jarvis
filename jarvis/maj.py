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
REMOTE_VERSION = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/jarvis/version.json"
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
    """{installee, disponible, nouveautes, a_jour} — vérifié au plus une fois par heure."""
    if not force and _cache["data"] and time.time() - _cache["time"] < 3600:
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
    with tempfile.TemporaryDirectory() as tmp:
        archive.extractall(tmp)
        roots = [p for p in Path(tmp).iterdir() if (p / "jarvis" / "__main__.py").exists()]
        if not roots:
            return False, "L'archive téléchargée ne ressemble pas à Jarvis : mise à jour annulée."
        root = roots[0]
        for item in root.iterdir():
            if item.name in KEEP:
                continue
            target = PROJECT_DIR / item.name
            if item.is_dir():
                shutil.copytree(item, target, dirs_exist_ok=True)
            else:
                shutil.copy2(item, target)
    _cache["data"] = None
    return True, f"Jarvis est passé à la version {local_version()['version']}."


def restart() -> None:
    """Relance Jarvis dans une nouvelle fenêtre puis ferme l'ancienne fenêtre noire."""
    if platform.system() == "Windows":
        launcher = PROJECT_DIR / "lancer_jarvis.bat"
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
