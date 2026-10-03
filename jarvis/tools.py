"""Outils locaux que Jarvis peut utiliser sur ton ordinateur."""

import datetime
import json
import platform
import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

NOTES_FILE = Path.home() / ".jarvis_notes.json"


def _schema(properties: dict, required: list[str]) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


TOOLS = [
    {
        "name": "obtenir_date_heure",
        "description": "Donne la date et l'heure actuelles de l'ordinateur.",
        "strict": True,
        "input_schema": _schema({}, []),
    },
    {
        "name": "ouvrir_site_web",
        "description": "Ouvre une URL dans le navigateur par défaut de l'utilisateur.",
        "strict": True,
        "input_schema": _schema(
            {"url": {"type": "string", "description": "URL complète, ex. https://youtube.com"}},
            ["url"],
        ),
    },
    {
        "name": "ouvrir_application",
        "description": (
            "Lance une application installée sur l'ordinateur "
            "(ex. 'notepad', 'calc', 'Spotify', 'firefox')."
        ),
        "strict": True,
        "input_schema": _schema(
            {"nom": {"type": "string", "description": "Nom de l'application ou de l'exécutable"}},
            ["nom"],
        ),
    },
    {
        "name": "infos_systeme",
        "description": "Donne des infos sur l'ordinateur : système, processeur, espace disque.",
        "strict": True,
        "input_schema": _schema({}, []),
    },
    {
        "name": "ajouter_note",
        "description": "Enregistre une note ou un rappel pour l'utilisateur.",
        "strict": True,
        "input_schema": _schema({"texte": {"type": "string"}}, ["texte"]),
    },
    {
        "name": "lire_notes",
        "description": "Relit toutes les notes enregistrées par l'utilisateur.",
        "strict": True,
        "input_schema": _schema({}, []),
    },
    {
        "name": "effacer_notes",
        "description": "Supprime toutes les notes. À n'utiliser que si l'utilisateur le demande explicitement.",
        "strict": True,
        "input_schema": _schema({}, []),
    },
]


def obtenir_date_heure() -> str:
    return datetime.datetime.now().strftime("%A %d %B %Y, %H:%M:%S")


def ouvrir_site_web(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Ouvert : {url}"


def ouvrir_application(nom: str) -> str:
    system = platform.system()
    try:
        if system == "Windows":
            # 'start' trouve aussi les applis enregistrées (ex. spotify, calc)
            subprocess.Popen(["cmd", "/c", "start", "", nom], shell=False)
        elif system == "Darwin":
            subprocess.Popen(["open", "-a", nom])
        else:
            exe = shutil.which(nom) or shutil.which(nom.lower())
            if not exe:
                return f"Application introuvable : {nom}"
            subprocess.Popen([exe], start_new_session=True)
    except OSError as e:
        return f"Impossible d'ouvrir {nom} : {e}"
    return f"Lancement de {nom}"


def infos_systeme() -> str:
    disk = shutil.disk_usage(Path.home())
    return json.dumps(
        {
            "systeme": f"{platform.system()} {platform.release()}",
            "machine": platform.machine(),
            "processeur": platform.processor() or "inconnu",
            "python": sys.version.split()[0],
            "disque_libre_go": round(disk.free / 1e9, 1),
            "disque_total_go": round(disk.total / 1e9, 1),
        },
        ensure_ascii=False,
    )


def _load_notes() -> list[dict]:
    if NOTES_FILE.exists():
        return json.loads(NOTES_FILE.read_text(encoding="utf-8"))
    return []


def ajouter_note(texte: str) -> str:
    notes = _load_notes()
    notes.append({"date": datetime.datetime.now().isoformat(timespec="minutes"), "texte": texte})
    NOTES_FILE.write_text(json.dumps(notes, ensure_ascii=False, indent=2), encoding="utf-8")
    return f"Note enregistrée ({len(notes)} au total)."


def lire_notes() -> str:
    notes = _load_notes()
    if not notes:
        return "Aucune note."
    return "\n".join(f"- [{n['date']}] {n['texte']}" for n in notes)


def effacer_notes() -> str:
    NOTES_FILE.unlink(missing_ok=True)
    return "Toutes les notes ont été supprimées."


HANDLERS = {
    "obtenir_date_heure": obtenir_date_heure,
    "ouvrir_site_web": ouvrir_site_web,
    "ouvrir_application": ouvrir_application,
    "infos_systeme": infos_systeme,
    "ajouter_note": ajouter_note,
    "lire_notes": lire_notes,
    "effacer_notes": effacer_notes,
}


def run_tool(name: str, args: dict) -> tuple[str, bool]:
    """Exécute un outil. Renvoie (résultat, est_une_erreur)."""
    handler = HANDLERS.get(name)
    if handler is None:
        return f"Outil inconnu : {name}", True
    try:
        return handler(**args), False
    except Exception as e:  # on renvoie l'erreur à Claude plutôt que de planter
        return f"Erreur : {e}", True
