"""Outils locaux que Jarvis peut utiliser sur ton ordinateur."""

import datetime
import json
import platform
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

from . import brief, config, jeux, musique, powers, pronote, systeme, temps_jeu, theme, vacances
from . import ciel, foot, sentinelle

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
        "input_schema": _schema({}, []),
    },
    {
        "name": "ouvrir_site_web",
        "description": "Ouvre une URL dans le navigateur par défaut de l'utilisateur.",
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
        "input_schema": _schema(
            {"nom": {"type": "string", "description": "Nom de l'application ou de l'exécutable"}},
            ["nom"],
        ),
    },
    {
        "name": "infos_systeme",
        "description": "Donne des infos sur l'ordinateur : système, processeur, espace disque.",
        "input_schema": _schema({}, []),
    },
    {
        "name": "ajouter_note",
        "description": "Enregistre une note ou un rappel pour l'utilisateur.",
        "input_schema": _schema({"texte": {"type": "string"}}, ["texte"]),
    },
    {
        "name": "lire_notes",
        "description": "Relit toutes les notes enregistrées par l'utilisateur.",
        "input_schema": _schema({}, []),
    },
    {
        "name": "meteo",
        "description": (
            "Donne la météo actuelle et les prévisions pour aujourd'hui, demain et après-demain, "
            "y compris la force et la direction du vent et les rafales. "
            "Laisse 'ville' vide pour utiliser la ville de l'utilisateur."
        ),
        "input_schema": _schema({"ville": {"type": "string", "description": "ex. Paris (facultatif)"}}, []),
    },
    {
        "name": "definir_ville",
        "description": "Enregistre la ville où habite l'utilisateur (utilisée par défaut pour la météo).",
        "input_schema": _schema({"ville": {"type": "string"}}, ["ville"]),
    },
    {
        "name": "retenir_info",
        "description": (
            "Retient pour toujours une information sur l'utilisateur (goûts, famille, animaux, travail, "
            "anniversaire, habitudes…). À utiliser quand il te demande de retenir quelque chose "
            "ou quand il te confie une info personnelle durable."
        ),
        "input_schema": _schema({"info": {"type": "string", "description": "Phrase courte, ex. « Son chat s'appelle Moka »"}}, ["info"]),
    },
    {
        "name": "oublier_info",
        "description": "Oublie une information retenue sur l'utilisateur, quand il te le demande.",
        "input_schema": _schema({"info": {"type": "string", "description": "Mots-clés de l'info à oublier"}}, ["info"]),
    },
    {
        "name": "recherche_web",
        "description": "Cherche sur internet (actualités, faits récents, informations que tu ne connais pas).",
        "input_schema": _schema({"requete": {"type": "string"}}, ["requete"]),
    },
    {
        "name": "effacer_notes",
        "description": "Supprime toutes les notes. À n'utiliser que si l'utilisateur le demande explicitement.",
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


BEAUFORT = [  # (vitesse max en km/h, force, nom du vent)
    (1, 0, "calme"), (5, 1, "très légère brise"), (11, 2, "légère brise"), (19, 3, "petite brise"),
    (28, 4, "jolie brise"), (38, 5, "bonne brise"), (49, 6, "vent frais"), (61, 7, "grand frais"),
    (74, 8, "coup de vent"), (88, 9, "fort coup de vent"), (102, 10, "tempête"), (117, 11, "violente tempête"),
]


def beaufort(kmh: float) -> tuple[int, str]:
    for limit, force, name in BEAUFORT:
        if kmh <= limit:
            return force, name
    return 12, "ouragan"


def _wind_dir_fr(point: str) -> str:
    """« WNW » (anglais) → « ONO » (français)."""
    return point.upper().replace("W", "O")


def weather_data(ville: str = "") -> dict:
    """Météo structurée (pour le tableau de bord et pour les réponses de Jarvis)."""
    ville = (ville or "").strip() or config.load()["ville"]
    if not ville:
        raise ValueError("ville inconnue")
    url = f"https://wttr.in/{urllib.parse.quote(ville)}?format=j1&lang=fr"
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.load(r)

    def describe(block: dict) -> str:
        return (block.get("lang_fr") or block["weatherDesc"])[0]["value"].strip()

    now = data["current_condition"][0]
    days = []
    for label, day in zip(("Aujourd'hui", "Demain", "Après-demain"), data["weather"]):
        midday = day["hourly"][len(day["hourly"]) // 2]
        days.append({
            "label": label, "date": day["date"], "desc": describe(midday), "code": int(midday.get("weatherCode", 0)),
            "min": int(day["mintempC"]), "max": int(day["maxtempC"]), "pluie": int(midday.get("chanceofrain", 0) or 0),
        })
    for d, day in zip(days, data["weather"]):
        d["vent_max"] = max(int(h.get("windspeedKmph", 0) or 0) for h in day["hourly"])
        d["rafales_max"] = max(int(h.get("WindGustKmph", 0) or 0) for h in day["hourly"])

    # Rafales : prévision du créneau de 3 h en cours
    import datetime as _dt

    hourly_today = data["weather"][0]["hourly"]
    current_slot = hourly_today[min(_dt.datetime.now().hour // 3, len(hourly_today) - 1)]
    wind = int(now.get("windspeedKmph", 0) or 0)
    force, wind_name = beaufort(wind)
    return {
        "ville": ville,
        "temp": int(now["temp_C"]), "ressenti": int(now["FeelsLikeC"]), "desc": describe(now),
        "code": int(now.get("weatherCode", 0)), "humidite": int(now.get("humidity", 0) or 0),
        "vent": wind, "rafales": max(wind, int(current_slot.get("WindGustKmph", 0) or 0)),
        "vent_dir": _wind_dir_fr(now.get("winddir16Point", "") or ""), "vent_deg": int(now.get("winddirDegree", 0) or 0),
        "beaufort": force, "vent_nom": wind_name, "jours": days,
    }


def meteo(ville: str = "") -> str:
    try:
        w = weather_data(ville)
    except ValueError:
        return (
            "Ville inconnue. Demande à l'utilisateur quelle est sa ville, "
            "puis enregistre-la avec definir_ville."
        )
    lines = [
        f"Maintenant à {w['ville']} : {w['desc']}, {w['temp']}°C (ressenti {w['ressenti']}°C). "
        f"Vent {w['vent_nom']} (force {w['beaufort']} Beaufort) : {w['vent']} km/h venant du {w['vent_dir']}, "
        f"rafales jusqu'à {w['rafales']} km/h."
    ]
    for d in w["jours"]:
        lines.append(
            f"{d['label']} ({d['date']}) : {d['desc']}, de {d['min']}°C à {d['max']}°C, risque de pluie {d['pluie']} %, "
            f"vent jusqu'à {d['vent_max']} km/h (rafales {d['rafales_max']} km/h)."
        )
    return "\n".join(lines)


def definir_ville(ville: str) -> str:
    config.save({"ville": ville.strip()})
    return f"Ville enregistrée : {ville}."


def retenir_info(info: str) -> str:
    souvenirs = config.load()["souvenirs"]
    if info.strip() and info.strip() not in souvenirs:
        souvenirs.append(info.strip())
        config.save({"souvenirs": souvenirs})
    return f"C'est retenu : {info}"


def oublier_info(info: str) -> str:
    souvenirs = config.load()["souvenirs"]
    words = [w for w in info.lower().split() if len(w) > 2]
    kept = [s for s in souvenirs if not (words and all(w in s.lower() for w in words))]
    if len(kept) == len(souvenirs):
        return "Je n'ai trouvé aucun souvenir correspondant."
    config.save({"souvenirs": kept})
    return f"{len(souvenirs) - len(kept)} souvenir(s) oublié(s)."


def recherche_web(requete: str) -> str:
    from ddgs import DDGS

    results = DDGS().text(requete, region="fr-fr", max_results=5)
    if not results:
        return "Aucun résultat."
    return "\n\n".join(f"{r['title']}\n{r['body']}\n{r['href']}" for r in results)


HANDLERS = {
    "obtenir_date_heure": obtenir_date_heure,
    "ouvrir_site_web": ouvrir_site_web,
    "ouvrir_application": ouvrir_application,
    "infos_systeme": infos_systeme,
    "ajouter_note": ajouter_note,
    "lire_notes": lire_notes,
    "meteo": meteo,
    "definir_ville": definir_ville,
    "retenir_info": retenir_info,
    "oublier_info": oublier_info,
    "recherche_web": recherche_web,
    "effacer_notes": effacer_notes,
}

TOOLS += powers.TOOLS + brief.TOOLS + pronote.TOOLS + systeme.TOOLS + jeux.TOOLS + musique.TOOLS + temps_jeu.TOOLS + vacances.TOOLS + theme.TOOLS
TOOLS += ciel.TOOLS + foot.TOOLS + sentinelle.TOOLS
HANDLERS.update(powers.HANDLERS)
HANDLERS.update(brief.HANDLERS)
HANDLERS.update(pronote.HANDLERS)
HANDLERS.update(systeme.HANDLERS)
HANDLERS.update(jeux.HANDLERS)
HANDLERS.update(musique.HANDLERS)
HANDLERS.update(temps_jeu.HANDLERS)
HANDLERS.update(vacances.HANDLERS)
HANDLERS.update(theme.HANDLERS)
HANDLERS.update(ciel.HANDLERS)
HANDLERS.update(foot.HANDLERS)
HANDLERS.update(sentinelle.HANDLERS)


def run_tool(name: str, args: dict) -> tuple[str, bool]:
    """Exécute un outil. Renvoie (résultat, est_une_erreur)."""
    handler = HANDLERS.get(name)
    if handler is None:
        return f"Outil inconnu : {name}", True
    try:
        return handler(**args), False
    except Exception as e:  # on renvoie l'erreur à l'IA plutôt que de planter
        return f"Erreur : {e}", True
