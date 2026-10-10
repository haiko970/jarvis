"""Le ciel : phase de la lune, lever et coucher du soleil, passages de la Station spatiale (ISS)."""

import datetime
import json
import math
import time
import urllib.request
from pathlib import Path

from . import config

TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"
TLE_FILE = Path.home() / ".jarvis_iss.json"  # l'orbite de l'ISS, mise à jour une fois par jour
SYNODIC = 29.530588853  # durée d'un cycle de la lune, en jours
EARTH_RADIUS = 6378.137  # km

TOOLS = [
    {
        "name": "ciel",
        "description": (
            "Le ciel : phase de la lune, prochaine pleine lune, lever et coucher du soleil, "
            "et quand la Station spatiale internationale (ISS) est visible à l'œil nu depuis chez l'utilisateur."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    }
]

_coords_cache: dict = {}


def _coords() -> tuple[float, float, str]:
    """Latitude et longitude de la ville enregistrée."""
    ville = config.load()["ville"]
    if not ville:
        raise ValueError("ville inconnue : dis à Jarvis dans quelle ville tu habites")
    if ville not in _coords_cache:
        from .brief import _geocode

        _coords_cache[ville] = _geocode(ville)
    return _coords_cache[ville]


# ---------- Calculs d'astronomie (précis à une minute près, largement suffisant) ----------
def _julian(t: datetime.datetime) -> float:
    return t.timestamp() / 86400 + 2440587.5


def _sun(jd: float) -> tuple[float, float, tuple[float, float, float]]:
    """Ascension droite et déclinaison du soleil (radians), et sa direction dans l'espace."""
    n = jd - 2451545.0
    mean_long = math.radians((280.460 + 0.9856474 * n) % 360)
    anomaly = math.radians((357.528 + 0.9856003 * n) % 360)
    lam = mean_long + math.radians(1.915) * math.sin(anomaly) + math.radians(0.020) * math.sin(2 * anomaly)
    eps = math.radians(23.439 - 0.0000004 * n)
    ra = math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam))
    dec = math.asin(math.sin(eps) * math.sin(lam))
    direction = (math.cos(lam), math.cos(eps) * math.sin(lam), math.sin(eps) * math.sin(lam))
    return ra, dec, direction


def _sidereal(jd: float) -> float:
    """Angle de rotation de la Terre (temps sidéral de Greenwich), en radians."""
    return math.radians((280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360)


def sun_altitude(t: datetime.datetime, lat: float, lon: float) -> float:
    jd = _julian(t)
    ra, dec, _ = _sun(jd)
    hour_angle = _sidereal(jd) + math.radians(lon) - ra
    la = math.radians(lat)
    return math.degrees(math.asin(math.sin(la) * math.sin(dec) + math.cos(la) * math.cos(dec) * math.cos(hour_angle)))


def sun_times(day: datetime.date, lat: float, lon: float) -> dict:
    """Heures de lever et de coucher du soleil (heure locale de l'ordinateur)."""
    start = datetime.datetime.combine(day, datetime.time()).astimezone()
    result = {"lever": None, "coucher": None}
    previous = sun_altitude(start, lat, lon)
    for minute in range(2, 24 * 60 + 1, 2):
        t = start + datetime.timedelta(minutes=minute)
        alt = sun_altitude(t, lat, lon)
        if previous < -0.833 <= alt and not result["lever"]:
            result["lever"] = t
        if previous >= -0.833 > alt and not result["coucher"]:
            result["coucher"] = t
        previous = alt
    return result


PHASES = [
    (0.033, "Nouvelle lune"), (0.216, "Premier croissant"), (0.283, "Premier quartier"),
    (0.466, "Lune gibbeuse croissante"), (0.533, "Pleine lune"), (0.716, "Lune gibbeuse décroissante"),
    (0.783, "Dernier quartier"), (0.966, "Dernier croissant"), (1.01, "Nouvelle lune"),
]


def moon(t: datetime.datetime | None = None) -> dict:
    """Phase de la lune (calcul moyen : à quelques heures près)."""
    t = t or datetime.datetime.now().astimezone()
    reference = datetime.datetime(2000, 1, 6, 18, 14, tzinfo=datetime.timezone.utc)  # une nouvelle lune connue
    age = ((t - reference).total_seconds() / 86400) % SYNODIC
    fraction = age / SYNODIC
    name = next(label for limit, label in PHASES if fraction < limit)
    to_full = (0.5 - fraction) % 1 * SYNODIC
    to_new = (1 - fraction) % 1 * SYNODIC
    return {
        "nom": name,
        "age": round(age, 1),
        "fraction": round(fraction, 3),  # 0 = nouvelle lune, 0,5 = pleine lune
        "eclairee": round(100 * (1 - math.cos(2 * math.pi * fraction)) / 2),
        "pleine_lune": (t + datetime.timedelta(days=to_full)).date().isoformat(),
        "nouvelle_lune": (t + datetime.timedelta(days=to_new)).date().isoformat(),
    }


# ---------- La Station spatiale internationale ----------
def _tle() -> tuple[str, str]:
    cached = {}
    if TLE_FILE.exists():
        try:
            cached = json.loads(TLE_FILE.read_text(encoding="utf-8"))
        except ValueError:
            cached = {}
    if cached and time.time() - cached.get("time", 0) < 86400:
        return cached["l1"], cached["l2"]
    try:
        request = urllib.request.Request(TLE_URL, headers={"User-Agent": "Jarvis"})
        with urllib.request.urlopen(request, timeout=10) as r:
            lines = [l.strip() for l in r.read().decode().splitlines() if l.strip()]
        l1, l2 = next(l for l in lines if l.startswith("1 ")), next(l for l in lines if l.startswith("2 "))
        TLE_FILE.write_text(json.dumps({"time": time.time(), "l1": l1, "l2": l2}), encoding="utf-8")
        return l1, l2
    except Exception:
        if cached and time.time() - cached.get("time", 0) < 7 * 86400:
            return cached["l1"], cached["l2"]  # pas d'internet : l'orbite d'il y a quelques jours suffit
        raise


DIRECTIONS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
DIRECTION_NAMES = {"N": "nord", "NE": "nord-est", "E": "est", "SE": "sud-est", "S": "sud", "SO": "sud-ouest", "O": "ouest", "NO": "nord-ouest"}


def _compass(azimuth: float) -> str:
    return DIRECTIONS[round(azimuth / 45) % 8]


def iss_passes(lat: float, lon: float, hours: int = 72, start: datetime.datetime | None = None,
               tle: tuple[str, str] | None = None) -> list[dict]:
    """Passages de l'ISS visibles à l'œil nu : il fait nuit chez toi, mais la station est encore au soleil."""
    from sgp4.api import Satrec

    sat = Satrec.twoline2rv(*(tle or _tle()))
    la, lo = math.radians(lat), math.radians(lon)
    # Position de l'observateur (sur l'ellipsoïde terrestre)
    e2 = 0.00669438
    n = EARTH_RADIUS / math.sqrt(1 - e2 * math.sin(la) ** 2)
    obs = (n * math.cos(la) * math.cos(lo), n * math.cos(la) * math.sin(lo), n * (1 - e2) * math.sin(la))
    east = (-math.sin(lo), math.cos(lo), 0.0)
    north = (-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la))
    up = (math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la))

    start = (start or datetime.datetime.now().astimezone()).astimezone(datetime.timezone.utc)
    passes, current = [], None
    for step in range(0, hours * 3600, 10):
        t = start + datetime.timedelta(seconds=step)
        jd = _julian(t)
        error, r, _ = sat.sgp4(math.floor(jd - 0.5) + 0.5, jd - (math.floor(jd - 0.5) + 0.5))
        if error:
            continue
        g = _sidereal(jd)
        x, y = math.cos(g) * r[0] + math.sin(g) * r[1], -math.sin(g) * r[0] + math.cos(g) * r[1]
        d = (x - obs[0], y - obs[1], r[2] - obs[2])
        dist = math.sqrt(sum(c * c for c in d))
        elevation = math.degrees(math.asin(sum(a * b for a, b in zip(d, up)) / dist))
        if elevation < 10:
            if current:
                passes.append(current)
                current = None
            continue
        azimuth = math.degrees(math.atan2(sum(a * b for a, b in zip(d, east)), sum(a * b for a, b in zip(d, north)))) % 360
        # La station brille seulement si elle est au soleil… et qu'il fait nuit chez toi
        _, _, s = _sun(jd)
        along = sum(a * b for a, b in zip(r, s))
        sunlit = along > 0 or math.sqrt(sum((a - along * b) ** 2 for a, b in zip(r, s))) > EARTH_RADIUS
        visible = sunlit and sun_altitude(t, lat, lon) < -6
        if not current:
            current = {"debut": t, "fin": t, "max": elevation, "de": _compass(azimuth), "vers": _compass(azimuth), "visible": visible}
        current["fin"], current["vers"] = t, _compass(azimuth)
        current["max"] = max(current["max"], elevation)
        current["visible"] = current["visible"] or visible
    result = []
    for p in passes:
        if not p["visible"]:
            continue
        local = p["debut"].astimezone()
        result.append({
            "date": local.date().isoformat(), "heure": local.strftime("%Hh%M"),
            "duree": max(1, round((p["fin"] - p["debut"]).total_seconds() / 60)),
            "hauteur": round(p["max"]), "de": p["de"], "vers": p["vers"],
        })
    return result


def sky_data() -> dict:
    """Tout le ciel d'aujourd'hui, pour le tableau de bord et pour les réponses."""
    lat, lon, name = _coords()
    today = datetime.date.today()
    sun = sun_times(today, lat, lon)
    data = {
        "lieu": name,
        "lune": moon(),
        "lever": sun["lever"].strftime("%Hh%M") if sun["lever"] else None,
        "coucher": sun["coucher"].strftime("%Hh%M") if sun["coucher"] else None,
        "iss": None,
    }
    try:
        data["iss"] = iss_passes(lat, lon)
    except Exception as e:
        data["iss_erreur"] = str(e)
    return data


def _day_label(iso: str, hour: int) -> str:
    day = datetime.date.fromisoformat(iso)
    delta = (day - datetime.date.today()).days
    moment = "soir" if hour >= 12 else "matin"
    if delta == 0:
        return f"ce {moment}"
    if delta == 1:
        return f"demain {moment}"
    from .brief import french_date

    return f"{french_date(day).replace(f' {day.year}', '')} au {moment}"


def _le(direction: str) -> str:
    name = DIRECTION_NAMES[direction]
    return f"l'{name}" if name[0] in "eo" else f"le {name}"


def _de(direction: str) -> str:
    name = DIRECTION_NAMES[direction]
    return f"de l'{name}" if name[0] in "eo" else f"du {name}"


def describe_pass(p: dict) -> str:
    when = _day_label(p["date"], int(p["heure"][:2]))
    hauteur = "très haut dans le ciel" if p["hauteur"] >= 50 else "haut dans le ciel" if p["hauteur"] >= 30 else "assez bas sur l'horizon"
    return (
        f"{when} à {p['heure']}, pendant environ {p['duree']} minutes, {hauteur} : "
        f"elle arrive {_de(p['de'])} et part vers {_le(p['vers'])}"
    )


def ciel() -> str:
    data = sky_data()
    lune = data["lune"]
    from .brief import french_date

    lines = [f"Ciel à {data['lieu']} :"]
    if data["lever"] and data["coucher"]:
        lines.append(f"Soleil : lever à {data['lever']}, coucher à {data['coucher']}.")
    lines.append(f"Lune : {lune['nom']}, éclairée à {lune['eclairee']} %.")
    if lune["nom"] != "Pleine lune":
        lines.append(f"Prochaine pleine lune vers le {french_date(datetime.date.fromisoformat(lune['pleine_lune']))}.")
    if data["iss"] is None:
        lines.append(f"Station spatiale : impossible de calculer ses passages ({data.get('iss_erreur', 'pas d’internet')}).")
    elif not data["iss"]:
        lines.append("Station spatiale : aucun passage visible à l'œil nu dans les 3 prochains jours.")
    else:
        lines.append("Station spatiale (ISS), visible à l'œil nu comme une étoile très brillante qui avance sans clignoter :")
        lines += [f"- {describe_pass(p)}." for p in data["iss"][:4]]
    return "\n".join(lines)


def brief_section() -> str | None:
    """Pour le brief du matin : la pleine lune et l'ISS ce soir, seulement s'il y a quelque chose à voir."""
    data = sky_data()
    parts = []
    tonight = [p for p in data["iss"] or [] if p["date"] == datetime.date.today().isoformat()]
    if tonight:
        parts.append("La Station spatiale passe " + describe_pass(tonight[0]) + ".")
    if data["lune"]["nom"] == "Pleine lune":
        parts.append("C'est la pleine lune ce soir.")
    return " ".join(parts) or None


HANDLERS = {"ciel": ciel}
