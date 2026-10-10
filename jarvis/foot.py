"""Le foot : score, dernier résultat et prochain match de l'équipe préférée de l'utilisateur.

Les données viennent du site d'ESPN (gratuit, sans compte ni clé)."""

import datetime
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request

from . import config

API = "https://site.api.espn.com/apis/site/v2/sports/soccer"
# Championnats où chercher l'équipe (France d'abord)
LEAGUES = {
    "fra.1": "Ligue 1", "fra.2": "Ligue 2", "eng.1": "Premier League", "esp.1": "Liga",
    "ita.1": "Serie A", "ger.1": "Bundesliga", "por.1": "Liga Portugal", "ned.1": "Eredivisie", "bel.1": "Pro League",
}
# Surnoms courants → nom complet
ALIASES = {
    "psg": "paris saint germain", "paris": "paris saint germain", "om": "marseille", "ol": "lyon",
    "fcn": "nantes", "losc": "lille", "asse": "saint etienne", "sainte": "saint etienne", "asm": "monaco",
    "barca": "barcelona", "real": "real madrid", "man u": "manchester united", "man city": "manchester city",
    "city": "manchester city", "united": "manchester united", "bayern": "bayern munich", "juve": "juventus",
    "inter": "internazionale", "inter milan": "internazionale", "milan": "ac milan", "atletico": "atletico madrid",
}

TOOLS = [
    {
        "name": "score_equipe",
        "description": (
            "Score en direct, dernier résultat et prochain match d'une équipe de foot. "
            "Sans nom d'équipe : l'équipe préférée de l'utilisateur."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"equipe": {"type": "string", "description": "nom de l'équipe, vide pour l'équipe préférée"}},
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "definir_equipe",
        "description": "Enregistre l'équipe de foot préférée de l'utilisateur (ex. « mon équipe c'est le FC Nantes »).",
        "input_schema": {
            "type": "object",
            "properties": {"equipe": {"type": "string"}},
            "required": ["equipe"],
            "additionalProperties": False,
        },
    },
]

_cache: dict = {}


def _get(url: str, seconds: int = 60) -> dict:
    """Lit une page d'ESPN (gardée en mémoire un moment pour ne pas la redemander sans arrêt)."""
    if url in _cache and time.time() - _cache[url][0] < seconds:
        return _cache[url][1]
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Jarvis"})
    with urllib.request.urlopen(request, timeout=10) as r:
        data = json.load(r)
    _cache[url] = (time.time(), data)
    return data


def _simple(text: str) -> str:
    text = unicodedata.normalize("NFD", (text or "").lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    # Les petits mots qui ne servent pas à reconnaître une équipe
    words = [w for w in text.split() if w not in {"fc", "le", "la", "les", "l", "de", "du", "club", "sc", "ac", "as", "cf", "afc"}]
    return " ".join(words) or text


def find_team(name: str) -> dict | None:
    """Cherche une équipe dans les championnats connus. Renvoie {id, ligue, nom, logo}."""
    wanted = _simple(name)
    wanted = _simple(ALIASES.get(wanted, ALIASES.get(name.lower().strip(), wanted)))
    if not wanted:
        return None
    partial = None
    for league in LEAGUES:
        try:
            data = _get(f"{API}/{league}/teams", 86400)
        except Exception:
            continue
        for entry in data.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", []):
            team = entry.get("team", entry)
            names = {_simple(team.get(k, "")) for k in ("displayName", "shortDisplayName", "name", "location", "nickname")}
            names.discard("")
            found = {
                "id": str(team["id"]), "ligue": league, "nom": team.get("displayName", ""),
                "logo": (team.get("logos") or [{}])[0].get("href", ""),
            }
            if wanted in names or _simple(team.get("abbreviation", "")) == wanted:
                return found
            if not partial and any(wanted in n.split() or (len(wanted) > 3 and wanted in n) for n in names):
                partial = found
    return partial


def _team() -> dict:
    """L'équipe préférée (cherchée une seule fois, puis retenue)."""
    s = config.load()
    if not s["equipe"]:
        raise ValueError("pas d'équipe préférée : demande à l'utilisateur quelle est son équipe")
    if s["equipe_id"] and s["equipe_ligue"]:
        return {"id": s["equipe_id"], "ligue": s["equipe_ligue"], "nom": s["equipe_nom"] or s["equipe"], "logo": s["equipe_logo"]}
    team = find_team(s["equipe"])
    if not team:
        raise ValueError(f"équipe « {s['equipe']} » introuvable")
    config.save({"equipe_id": team["id"], "equipe_ligue": team["ligue"], "equipe_nom": team["nom"], "equipe_logo": team["logo"]})
    return team


def _score(value) -> str | None:
    if isinstance(value, dict):
        value = value.get("displayValue", value.get("value"))
    if value in (None, ""):
        return None
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return str(value)


def _match(event: dict, team_id: str) -> dict | None:
    """Transforme un match d'ESPN en quelque chose de simple."""
    try:
        competition = event["competitions"][0]
        status = (competition.get("status") or event.get("status") or {})
        kind = status.get("type", {})
        sides = {}
        for c in competition["competitors"]:
            team = c.get("team", {})
            sides[c.get("homeAway", "home")] = {
                "id": str(team.get("id", c.get("id", ""))),
                "nom": team.get("shortDisplayName") or team.get("displayName", "?"),
                "logo": team.get("logo") or (team.get("logos") or [{}])[0].get("href", ""),
                "score": _score(c.get("score")),
                "gagne": c.get("winner"),
            }
        home, away = sides["home"], sides["away"]
    except (KeyError, IndexError, TypeError):
        return None
    date = datetime.datetime.fromisoformat(event["date"].replace("Z", "+00:00")).astimezone()
    state = kind.get("state", "pre")  # pre = pas commencé, in = en cours, post = terminé
    match = {
        "date": date.date().isoformat(), "heure": date.strftime("%Hh%M"), "etat": state,
        "detail": status.get("displayClock") if state == "in" else kind.get("shortDetail", ""),
        "domicile": home, "exterieur": away, "resultat": None, "a_domicile": home["id"] == team_id,
        "competition": (event.get("league") or {}).get("name") or competition.get("type", {}).get("text", ""),
    }
    if kind.get("name") in ("STATUS_POSTPONED", "STATUS_CANCELED"):
        match["etat"] = "reporte"
    if state != "pre" and home["score"] is not None and away["score"] is not None:
        mine, other = (home, away) if home["id"] == team_id else (away, home)
        try:
            a, b = int(mine["score"]), int(other["score"])
            match["resultat"] = "V" if a > b else "D" if a < b else "N"
        except ValueError:
            pass
    return match


def team_data(name: str = "") -> dict:
    """Match en direct, dernier résultat et prochain match."""
    team = find_team(name) if name.strip() else _team()
    if not team:
        raise ValueError(f"équipe « {name} » introuvable")
    base = f"{API}/{team['ligue']}/teams/{team['id']}"
    data = {"equipe": team["nom"], "logo": team["logo"], "ligue": LEAGUES.get(team["ligue"], ""),
            "direct": None, "dernier": None, "prochain": None}

    # Le calendrier : les matchs déjà joués…
    events = []
    try:
        events += _get(f"{base}/schedule", 600).get("events", [])
    except Exception:
        pass
    # … et les prochains (fiche de l'équipe)
    try:
        events += _get(base, 600).get("team", {}).get("nextEvent", [])
    except Exception:
        pass
    # Le tableau des scores du jour, pour le direct (rafraîchi toutes les minutes)
    try:
        for event in _get(f"{API}/{team['ligue']}/scoreboard", 60).get("events", []):
            if any(str(c.get("team", {}).get("id", c.get("id"))) == team["id"] for c in event.get("competitions", [{}])[0].get("competitors", [])):
                events.append(event)
    except Exception:
        pass

    matches = {}
    for event in events:
        m = _match(event, team["id"])
        if m:
            matches[event.get("id", m["date"] + m["heure"])] = m  # le plus récent (tableau des scores) gagne
    ordered = sorted(matches.values(), key=lambda m: (m["date"], m["heure"]))
    data["direct"] = next((m for m in ordered if m["etat"] == "in"), None)
    played = [m for m in ordered if m["etat"] == "post"]
    upcoming = [m for m in ordered if m["etat"] == "pre"]
    data["dernier"] = played[-1] if played else None
    data["prochain"] = upcoming[0] if upcoming else None
    if not (data["direct"] or data["dernier"] or data["prochain"]):
        raise ValueError("aucun match trouvé pour cette équipe")
    return data


def _when(m: dict) -> str:
    day = datetime.date.fromisoformat(m["date"])
    delta = (day - datetime.date.today()).days
    if delta == 0:
        return f"aujourd'hui à {m['heure']}"
    if delta == 1:
        return f"demain à {m['heure']}"
    if delta == -1:
        return "hier"
    from .brief import french_date

    return f"{french_date(day).replace(f' {day.year}', '')}" + (f" à {m['heure']}" if delta > 0 else "")


def _line(m: dict) -> str:
    return f"{m['domicile']['nom']} {m['domicile']['score']} - {m['exterieur']['score']} {m['exterieur']['nom']}"


def describe(data: dict) -> str:
    lines = [f"{data['equipe']} ({data['ligue']}) :"]
    if data["direct"]:
        m = data["direct"]
        lines.append(f"EN DIRECT : {_line(m)} ({m['detail']}).")
    if data["dernier"]:
        m = data["dernier"]
        word = {"V": "victoire", "N": "match nul", "D": "défaite"}.get(m["resultat"], "résultat")
        lines.append(f"Dernier match ({_when(m)}) : {_line(m)}, {word}.")
    if data["prochain"]:
        m = data["prochain"]
        lines.append(f"Prochain match : {m['domicile']['nom']} contre {m['exterieur']['nom']}, {_when(m)}.")
    return "\n".join(lines)


def score_equipe(equipe: str = "") -> str:
    try:
        return describe(team_data(equipe))
    except ValueError as e:
        return f"Impossible : {e}."
    except Exception as e:
        return f"Je n'arrive pas à joindre le site des scores : {e}"


def definir_equipe(equipe: str) -> str:
    team = find_team(equipe)
    if not team:
        return f"Je ne trouve pas l'équipe « {equipe} » dans les grands championnats d'Europe. Demande le nom exact."
    config.save({"equipe": equipe, "equipe_id": team["id"], "equipe_ligue": team["ligue"],
                 "equipe_nom": team["nom"], "equipe_logo": team["logo"]})
    return f"C'est noté : l'équipe préférée est {team['nom']} ({LEAGUES[team['ligue']]})."


def brief_section() -> str | None:
    """Pour le brief : le résultat d'hier et le match d'aujourd'hui ou de demain."""
    if not config.load()["equipe"]:
        return None
    data = team_data()
    parts = []
    today = datetime.date.today()
    if data["direct"]:
        parts.append(f"Match en cours : {_line(data['direct'])}.")
    m = data["dernier"]
    if m and (today - datetime.date.fromisoformat(m["date"])).days <= 2:
        word = {"V": "victoire", "N": "match nul", "D": "défaite"}.get(m["resultat"], "résultat")
        parts.append(f"Dernier match ({_when(m)}) : {_line(m)}, {word}.")
    m = data["prochain"]
    if m and (datetime.date.fromisoformat(m["date"]) - today).days <= 1:
        parts.append(f"Match {_when(m)} : {m['domicile']['nom']} contre {m['exterieur']['nom']}.")
    return " ".join(parts) or None


HANDLERS = {"score_equipe": score_equipe, "definir_equipe": definir_equipe}
