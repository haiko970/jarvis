"""Pouvoirs supplémentaires : volume, musique, Spotify, minuteurs et rappels."""

import datetime
import os
import platform
import queue
import shutil
import subprocess
import threading
import urllib.parse
import webbrowser

SYSTEM = platform.system()

# Les minuteurs qui sonnent déposent ici leur message ; l'interface (ou le terminal) vient les chercher.
EVENTS: "queue.Queue[str]" = queue.Queue()

_timers: list[dict] = []
_timers_lock = threading.Lock()


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "volume",
        "description": (
            "Change le volume du son de l'ordinateur. action : 'monter', 'baisser', 'muet' "
            "(couper ou remettre le son) ou 'regler' (avec niveau entre 0 et 100)."
        ),
        "input_schema": _schema(
            {
                "action": {"type": "string", "enum": ["monter", "baisser", "muet", "regler"]},
                "niveau": {"type": "integer", "description": "Volume voulu de 0 à 100, seulement pour 'regler'"},
            },
            ["action"],
        ),
    },
    {
        "name": "controle_musique",
        "description": (
            "Contrôle la musique ou la vidéo en cours (Spotify, YouTube, lecteur…) : "
            "'lecture_pause', 'suivant' ou 'precedent'."
        ),
        "input_schema": _schema(
            {"action": {"type": "string", "enum": ["lecture_pause", "suivant", "precedent"]}},
            ["action"],
        ),
    },
    {
        "name": "spotify_rechercher",
        "description": "Ouvre Spotify sur la recherche d'un artiste, d'une chanson, d'un album ou d'une playlist.",
        "input_schema": _schema({"recherche": {"type": "string"}}, ["recherche"]),
    },
    {
        "name": "minuteur",
        "description": (
            "Programme un minuteur ou un rappel. Donne SOIT dans_minutes (ex. 10, ou 0.5 pour 30 secondes), "
            "SOIT heure au format HH:MM (ex. '18:30'). message = ce qu'il faudra rappeler."
        ),
        "input_schema": _schema(
            {
                "message": {"type": "string"},
                "dans_minutes": {"type": "number"},
                "heure": {"type": "string", "description": "HH:MM"},
            },
            ["message"],
        ),
    },
    {
        "name": "lister_minuteurs",
        "description": "Liste les minuteurs et rappels en cours.",
        "input_schema": _schema({}, []),
    },
    {
        "name": "annuler_minuteurs",
        "description": "Annule tous les minuteurs et rappels en cours.",
        "input_schema": _schema({}, []),
    },
]


# ---------- Touches multimédia (Windows) ----------
VK = {"volume_muet": 0xAD, "volume_bas": 0xAE, "volume_haut": 0xAF,
      "suivant": 0xB0, "precedent": 0xB1, "lecture_pause": 0xB3}


def _press(key: str, times: int = 1) -> None:
    import ctypes

    for _ in range(times):
        ctypes.windll.user32.keybd_event(VK[key], 0, 0, 0)
        ctypes.windll.user32.keybd_event(VK[key], 0, 2, 0)  # 2 = touche relâchée


def _run(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=5).stdout.strip()


def volume(action: str, niveau: int | None = None) -> str:
    if action == "regler" and niveau is None:
        return "Il faut préciser le niveau (0 à 100)."
    if niveau is not None:
        niveau = max(0, min(100, int(niveau)))

    if SYSTEM == "Windows":
        # Chaque appui sur une touche volume = 2 %.
        if action == "monter":
            _press("volume_haut", 5)
        elif action == "baisser":
            _press("volume_bas", 5)
        elif action == "muet":
            _press("volume_muet")
        else:
            _press("volume_bas", 50)  # on descend à 0…
            _press("volume_haut", round(niveau / 2))  # …puis on remonte au bon niveau
    elif SYSTEM == "Darwin":
        if action == "muet":
            muted = _run(["osascript", "-e", "output muted of (get volume settings)"]) == "true"
            _run(["osascript", "-e", f"set volume output muted {str(not muted).lower()}"])
        else:
            current = int(_run(["osascript", "-e", "output volume of (get volume settings)"]) or 50)
            target = {"monter": current + 10, "baisser": current - 10}.get(action, niveau)
            _run(["osascript", "-e", f"set volume output volume {max(0, min(100, target))}"])
    else:
        if not shutil.which("pactl"):
            return "Contrôle du volume non disponible sur ce système."
        arg = {"monter": "+10%", "baisser": "-10%"}.get(action, f"{niveau}%")
        if action == "muet":
            _run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "toggle"])
        else:
            _run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", arg])

    return {
        "monter": "Volume augmenté.",
        "baisser": "Volume baissé.",
        "muet": "Son coupé ou rétabli.",
    }.get(action, f"Volume réglé à {niveau} %.")


def controle_musique(action: str) -> str:
    if SYSTEM == "Windows":
        _press(action)
    elif shutil.which("playerctl"):
        _run(["playerctl", {"lecture_pause": "play-pause", "suivant": "next", "precedent": "previous"}[action]])
    elif SYSTEM == "Darwin":
        cmd = {"lecture_pause": "playpause", "suivant": "next track", "precedent": "previous track"}[action]
        _run(["osascript", "-e", f'tell application "Spotify" to {cmd}'])
    else:
        return "Contrôle de la musique non disponible sur ce système."
    return {"lecture_pause": "Lecture/pause.", "suivant": "Morceau suivant.", "precedent": "Morceau précédent."}[action]


def spotify_rechercher(recherche: str) -> str:
    uri = "spotify:search:" + urllib.parse.quote(recherche)
    try:
        if SYSTEM == "Windows":
            os.startfile(uri)  # ouvre l'appli Spotify si elle est installée
        elif SYSTEM == "Darwin":
            subprocess.run(["open", uri], check=True)
        else:
            subprocess.run(["xdg-open", uri], check=True)
    except (OSError, subprocess.CalledProcessError):
        webbrowser.open("https://open.spotify.com/search/" + urllib.parse.quote(recherche))
        return f"Spotify n'est pas installé : recherche « {recherche} » ouverte sur le site de Spotify."
    return f"Recherche « {recherche} » ouverte dans Spotify. L'utilisateur doit cliquer sur lecture."


# ---------- Minuteurs et rappels ----------
def _ring(timer: dict) -> None:
    with _timers_lock:
        if timer in _timers:
            _timers.remove(timer)
    message = f"⏰ Rappel : {timer['message']}"
    EVENTS.put(message)
    if SYSTEM == "Windows":
        # Petite fenêtre au premier plan, pour ne pas rater le rappel même si Jarvis est réduit.
        import ctypes

        threading.Thread(
            target=ctypes.windll.user32.MessageBoxW,
            args=(None, timer["message"], "Jarvis - Rappel", 0x40 | 0x10000 | 0x40000),
            daemon=True,
        ).start()


def minuteur(message: str, dans_minutes: float | None = None, heure: str | None = None) -> str:
    now = datetime.datetime.now()
    if heure:
        h, m = (int(x) for x in heure.replace("h", ":").split(":")[:2])
        when = now.replace(hour=h, minute=m, second=0, microsecond=0)
        if when <= now:
            when += datetime.timedelta(days=1)
    elif dans_minutes is not None:
        when = now + datetime.timedelta(minutes=float(dans_minutes))
    else:
        return "Il faut préciser dans combien de minutes ou à quelle heure."

    timer = {"message": message, "quand": when}
    t = threading.Timer((when - now).total_seconds(), _ring, args=(timer,))
    t.daemon = True
    timer["thread"] = t
    with _timers_lock:
        _timers.append(timer)
    t.start()
    return f"Rappel « {message} » programmé pour {when.strftime('%H:%M:%S')}."


def lister_minuteurs() -> str:
    with _timers_lock:
        if not _timers:
            return "Aucun minuteur en cours."
        return "\n".join(f"- {t['quand'].strftime('%H:%M:%S')} : {t['message']}" for t in _timers)


def annuler_minuteurs() -> str:
    with _timers_lock:
        count = len(_timers)
        for t in _timers:
            t["thread"].cancel()
        _timers.clear()
    return f"{count} minuteur(s) annulé(s)."


HANDLERS = {
    "volume": volume,
    "controle_musique": controle_musique,
    "spotify_rechercher": spotify_rechercher,
    "minuteur": minuteur,
    "lister_minuteurs": lister_minuteurs,
    "annuler_minuteurs": annuler_minuteurs,
}
