"""Données du tableau de bord : météo, marées, journée, tâches, mails et état du PC."""

import datetime
import shutil
import threading
import time
from pathlib import Path

from . import brief, ciel, config, foot, pronote, sporteasy, temps_jeu, vacances

CACHE_SECONDS = 600  # les infos d'internet sont rafraîchies toutes les 10 minutes
_cache: dict = {"time": 0.0, "data": None}
_lock = threading.Lock()


def _safe(func):
    """Une rubrique en panne ne doit pas casser tout le tableau de bord."""
    try:
        return {"ok": True, "data": func()}
    except Exception as e:
        return {"ok": False, "erreur": str(e)}


def _weather():
    from .tools import weather_data

    return weather_data() if config.load()["ville"] else None


def _tides():
    s = config.load()
    if not (s["maree_lieu"] or s["ville"]):
        return None
    data = brief.tide_data()
    return data if data["disponible"] else None


def _day():
    today = datetime.date.today()
    items = []
    if pronote.configured():
        for l in pronote.lessons_data(today):
            items.append({
                "heure": l["debut"], "fin": l["fin"], "titre": l["matiere"], "type": "cours",
                "detail": l["salle"] and f"salle {l['salle']}", "annule": l["annule"],
                "statut": l["statut"], "controle": l["controle"],
            })
    if sporteasy.configured():
        try:
            for e in sporteasy.today_items(today):
                icon = {"match": "⚽ ", "entrainement": "🏃 ", "tournoi": "🏆 "}.get(e["type"], "")
                detail = " · ".join(x for x in (e["rdv"] and f"RDV {e['rdv']}", e["lieu"]) if x)
                items.append({"heure": e["heure"] or "toute la journée", "titre": icon + e["titre"], "type": "rdv",
                              "detail": detail, "annule": e["annule"], "statut": "ANNULÉ" if e["annule"] else ""})
        except Exception:
            pass  # pas d'internet : le reste de la journée s'affiche quand même
    events = brief.agenda_events(today)
    for heure, titre in events or []:
        items.append({"heure": heure.replace(":", "h"), "titre": titre, "type": "rdv"})
    items.sort(key=lambda i: (i["heure"] != "toute la journée", i["heure"]))
    return items


def _tasks():
    today = datetime.date.today().isoformat()
    todo = [t for t in brief._load_tasks() if not t["fait"]]
    todo.sort(key=lambda t: (t["date"] is None, t["date"] or ""))
    return [{"texte": t["texte"], "date": t["date"], "retard": bool(t["date"] and t["date"] < today)} for t in todo[:6]]


def _mails():
    if not brief.mail_configured():
        return None
    mails = brief.fetch_unread()
    return {"nombre": len(mails), "liste": [{"de": m["de"], "sujet": m["sujet"]} for m in mails[:4]]}


def _homework():
    if not pronote.configured():
        return None
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    with pronote._lock:
        homework = [h for h in pronote._get_client().homework(tomorrow, tomorrow) if not h.done]
    return [{"matiere": h.subject.name, "texte": " ".join((h.description or "").split())[:90]} for h in homework]


def collect(force: bool = False) -> dict:
    with _lock:
        if not force and _cache["data"] and time.time() - _cache["time"] < CACHE_SECONDS:
            return _cache["data"]
        s = config.load()
        data = {
            "prenom": s["prenom"],
            "meteo": _safe(_weather),
            "marees": _safe(_tides),
            "journee": _safe(_day),
            "devoirs": _safe(_homework),
            "taches": _safe(_tasks),
            "mails": _safe(_mails),
            "vacances": _safe(vacances.countdown),
            "jeux": _safe(lambda: temps_jeu.summary(7)),
            "ciel": _safe(lambda: ciel.sky_data() if s["ville"] else None),
            "foot": _safe(lambda: foot.team_data() if s["equipe"] else None),
            "club": _safe(lambda: sporteasy.next_event() if sporteasy.configured() else None),
            "maj": datetime.datetime.now().strftime("%H:%M"),
        }
        _cache.update(time=time.time(), data=data)
        return data


def system() -> dict:
    """État du PC en direct (pour les jauges)."""
    try:
        import psutil
    except ImportError:
        disk = shutil.disk_usage(Path.home())
        return {"cpu": None, "ram": None, "disque": round(100 * disk.used / disk.total), "batterie": None}
    battery = psutil.sensors_battery() if hasattr(psutil, "sensors_battery") else None
    return {
        "cpu": round(psutil.cpu_percent(interval=None)),
        "ram": round(psutil.virtual_memory().percent),
        "disque": round(psutil.disk_usage(str(Path.home())).percent),
        "batterie": round(battery.percent) if battery else None,
        "secteur": bool(battery.power_plugged) if battery else None,
    }
