"""SportEasy : tes matchs, entraînements et convocations, grâce au lien d'agenda de SportEasy.

Dans SportEasy : onglet Calendrier → « Synchronisation Calendrier » → copier le lien.
Ce lien contient les événements auxquels tu participes (là où tu es convoqué)."""

import datetime
import re
import time
import urllib.request

from . import config

TOOLS = [
    {
        "name": "mes_matchs",
        "description": (
            "Les prochains matchs, entraînements et convocations de l'utilisateur dans son club de foot (SportEasy) : "
            "date, heure, lieu, adversaire et heure de rendez-vous."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"jours": {"type": "integer", "description": "nombre de jours à regarder (14 par défaut)"}},
            "required": [],
            "additionalProperties": False,
        },
    }
]

_cache: dict = {"time": 0.0, "url": "", "data": None}


def link() -> str:
    return config.get_secret("sporteasy_ics").strip()


def configured() -> bool:
    return bool(link())


def _calendar():
    """Télécharge l'agenda SportEasy (gardé 15 minutes en mémoire)."""
    import icalendar

    url = link().replace("webcal://", "https://")
    if not url:
        raise ValueError("SportEasy n'est pas relié : colle le lien d'agenda dans ⚙️ Réglages → SportEasy")
    if _cache["data"] is None or _cache["url"] != url or time.time() - _cache["time"] > 900:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Jarvis"})
        with urllib.request.urlopen(request, timeout=20) as r:
            _cache.update(data=icalendar.Calendar.from_ical(r.read()), url=url, time=time.time())
    return _cache["data"]


def _kind(title: str) -> str:
    t = title.lower()
    if re.search(r"entra[iî]nement|training|s[ée]ance", t):
        return "entrainement"
    if re.search(r"tournoi|plateau|stage", t):
        return "tournoi"
    if re.search(r"match|coupe|championnat|amical| vs | - |contre", t):
        return "match"
    return "autre"


def _rdv(description: str) -> str | None:
    """Heure de rendez-vous si SportEasy l'écrit dans la description (« RDV 13h15 »…)."""
    m = re.search(r"(?:rdv|rendez[- ]vous|convocation|arriv[ée]e)\D{0,25}(\d{1,2})\s*[h:]\s*(\d{2})?", description, re.I)
    return f"{int(m[1]):02d}h{m[2] or '00'}" if m else None


def events(days: int = 14, start: datetime.date | None = None) -> list[dict]:
    import recurring_ical_events

    start = start or datetime.date.today()
    cal = _calendar()
    result = []
    for ev in recurring_ical_events.of(cal).between(start, start + datetime.timedelta(days=days)):
        begin = ev.get("DTSTART").dt
        title = " ".join(str(ev.get("SUMMARY") or "(sans titre)").split())
        description = str(ev.get("DESCRIPTION") or "")
        if isinstance(begin, datetime.datetime):
            if begin.tzinfo:
                begin = begin.astimezone().replace(tzinfo=None)
            day, hour = begin.date(), begin.strftime("%Hh%M")
        else:
            day, hour = begin, None
        result.append({
            "date": day.isoformat(), "heure": hour, "titre": title, "type": _kind(title),
            "lieu": " ".join(str(ev.get("LOCATION") or "").split()), "rdv": _rdv(description),
            "annule": str(ev.get("STATUS") or "").upper() == "CANCELLED",
        })
    result.sort(key=lambda e: (e["date"], e["heure"] or ""))
    return result


def next_event() -> dict | None:
    """Le prochain match ou entraînement des 10 prochains jours (pour le tableau de bord)."""
    now = datetime.datetime.now()
    for e in events(10):
        if e["annule"]:
            continue
        if e["date"] > now.date().isoformat() or not e["heure"] or e["heure"] >= now.strftime("%Hh%M"):
            return e
    return None


def _when(e: dict) -> str:
    from .brief import french_date

    day = datetime.date.fromisoformat(e["date"])
    delta = (day - datetime.date.today()).days
    label = "aujourd'hui" if delta == 0 else "demain" if delta == 1 else french_date(day).replace(f" {day.year}", "")
    return f"{label} à {e['heure']}" if e["heure"] else label


def describe(e: dict) -> str:
    text = f"{e['titre']}, {_when(e)}"
    if e["rdv"]:
        text += f", rendez-vous à {e['rdv']}"
    if e["lieu"]:
        text += f", lieu : {e['lieu']}"
    if e["annule"]:
        text += " (ANNULÉ)"
    return text


def mes_matchs(jours: int = 14) -> str:
    try:
        items = events(max(1, min(int(jours or 14), 60)))
    except ValueError as e:
        return str(e)
    if not items:
        return f"Aucun match ni entraînement prévu dans les {jours} prochains jours sur SportEasy."
    return "Prochains événements SportEasy (là où l'utilisateur est convoqué) :\n" + "\n".join(f"- {describe(e)}." for e in items)


def today_items(day: datetime.date) -> list[dict]:
    """Pour la colonne « Aujourd'hui » du tableau de bord."""
    return [e for e in events(1, day) if e["date"] == day.isoformat()]


def brief_section() -> str | None:
    if not configured():
        return None
    items = [e for e in events(2) if not e["annule"]]
    return "\n".join(f"- {describe(e)}." for e in items) or None


HANDLERS = {"mes_matchs": mes_matchs}
