"""Compte à rebours jusqu'aux vacances d'été (un point par jour de l'année scolaire)."""

import datetime

from . import config


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "jours_avant_vacances",
        "description": "Dit combien de jours il reste avant les vacances d'été.",
        "input_schema": _schema({}, []),
    },
]


def _first_saturday_of_july(year: int) -> datetime.date:
    day = datetime.date(year, 7, 1)
    return day + datetime.timedelta(days=(5 - day.weekday()) % 7)


def school_year(today: datetime.date | None = None) -> tuple[datetime.date, datetime.date]:
    """(rentrée, début des vacances d'été) : les dates des réglages, sinon le calendrier habituel
    (rentrée le 1er septembre, vacances le premier samedi de juillet)."""
    today = today or datetime.date.today()
    s = config.load()
    try:
        start = datetime.date.fromisoformat(s["rentree"]) if s["rentree"] else None
        end = datetime.date.fromisoformat(s["vacances_ete"]) if s["vacances_ete"] else None
    except ValueError:
        start = end = None
    if start and end and start < end and today <= end + datetime.timedelta(days=60):
        return start, end
    year = today.year if today.month >= 9 else today.year - 1
    return datetime.date(year, 9, 1), _first_saturday_of_july(year + 1)


def countdown(today: datetime.date | None = None) -> dict:
    today = today or datetime.date.today()
    start, end = school_year(today)
    total = (end - start).days
    passed = max(0, min(total, (today - start).days))
    return {
        "rentree": start.isoformat(), "vacances": end.isoformat(), "total": total,
        "passes": passed, "restants": max(0, (end - today).days), "en_vacances": today >= end,
    }


def jours_avant_vacances() -> str:
    c = countdown()
    if c["en_vacances"]:
        return "Ce sont les vacances d'été !"
    end = datetime.date.fromisoformat(c["vacances"])
    weeks, days = divmod(c["restants"], 7)
    return (
        f"Plus que {c['restants']} jours avant les vacances d'été (le {end.day}/{end.month:02d}/{end.year}), "
        f"soit {weeks} semaines et {days} jours. L'année scolaire est passée à {round(100 * c['passes'] / c['total'])} %."
    )


HANDLERS = {"jours_avant_vacances": jours_avant_vacances}
