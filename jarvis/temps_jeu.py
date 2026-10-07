"""Statistiques de jeu : compte, minute par minute, le temps passé sur chaque jeu Steam/Epic."""

import datetime
import json
import os
import threading
import time
from pathlib import Path

from . import jeux

STATS_FILE = Path.home() / ".jarvis_temps_jeu.json"
TICK = 60  # on regarde quels jeux tournent toutes les minutes
_lock = threading.Lock()


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "temps_de_jeu",
        "description": "Dit combien de temps l'utilisateur a joué aux jeux vidéo (aujourd'hui, cette semaine ou ce mois), par jeu.",
        "input_schema": _schema(
            {"periode": {"type": "string", "enum": ["aujourdhui", "semaine", "mois"]}}, []
        ),
    },
]


def load() -> dict:
    try:
        return json.loads(STATS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save(stats: dict) -> None:
    STATS_FILE.write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding="utf-8")


def running_games(games: list[dict]) -> set[str]:
    """Noms des jeux dont au moins un programme tourne en ce moment."""
    import psutil

    folders = [(os.path.normcase(g["dossier"]).rstrip("\\/") + os.sep, g["nom"]) for g in games if g.get("dossier")]
    found = set()
    for proc in psutil.process_iter(["exe"]):
        exe = proc.info.get("exe")
        if not exe:
            continue
        exe = os.path.normcase(exe)
        for folder, name in folders:
            if exe.startswith(folder):
                found.add(name)
    return found


def add_minutes(names: set[str], minutes: int = 1, day: datetime.date | None = None) -> None:
    if not names:
        return
    key = (day or datetime.date.today()).isoformat()
    with _lock:
        stats = load()
        today = stats.setdefault(key, {})
        for name in names:
            today[name] = today.get(name, 0) + minutes
        _save(stats)


def tracker_loop() -> None:
    """À lancer en arrière-plan : note chaque minute les jeux en cours."""
    games, refreshed = [], 0.0
    while True:
        try:
            if time.time() - refreshed > 600:  # la liste des jeux installés est relue toutes les 10 min
                games, refreshed = jeux.installed_games(), time.time()
            add_minutes(running_games(games))
        except Exception:
            pass
        time.sleep(TICK)


def summary(days: int) -> dict:
    """Minutes par jeu et par jour sur les `days` derniers jours (aujourd'hui compris)."""
    stats = load()
    today = datetime.date.today()
    per_day, per_game = [], {}
    for i in range(days - 1, -1, -1):
        d = today - datetime.timedelta(days=i)
        entry = stats.get(d.isoformat(), {})
        per_day.append({"date": d.isoformat(), "minutes": sum(entry.values())})
        for name, minutes in entry.items():
            per_game[name] = per_game.get(name, 0) + minutes
    top = sorted(per_game.items(), key=lambda kv: kv[1], reverse=True)
    return {
        "jours": per_day,
        "jeux": [{"nom": n, "minutes": m} for n, m in top],
        "total": sum(per_game.values()),
        "aujourdhui": per_day[-1]["minutes"] if per_day else 0,
    }


def _duration(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    return f"{h} h {m:02d}" if h else f"{m} min"


def temps_de_jeu(periode: str = "semaine") -> str:
    days = {"aujourdhui": 1, "semaine": 7, "mois": 30}.get(periode, 7)
    s = summary(days)
    label = {"aujourdhui": "aujourd'hui", "semaine": "ces 7 derniers jours", "mois": "ces 30 derniers jours"}.get(periode, "ces 7 derniers jours")
    if not s["total"]:
        return f"Aucun temps de jeu enregistré {label}."
    details = ", ".join(f"{g['nom']} {_duration(g['minutes'])}" for g in s["jeux"][:5])
    return f"Temps de jeu {label} : {_duration(s['total'])} au total. Détail : {details}."


HANDLERS = {"temps_de_jeu": temps_de_jeu}
