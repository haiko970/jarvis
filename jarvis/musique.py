"""Musique en cours sur Spotify (lue dans le titre de la fenêtre Spotify, sans connexion à un compte)."""

import platform

PAUSED_TITLES = {"spotify", "spotify premium", "spotify free", "spotify gratuit"}


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "musique_en_cours",
        "description": "Dit quelle musique joue en ce moment sur Spotify (titre et artiste).",
        "input_schema": _schema({}, []),
    },
]


def _window_titles_of(process_name: str) -> list[str]:
    """Titres des fenêtres visibles appartenant au programme donné (Windows)."""
    import ctypes
    from ctypes import wintypes

    import psutil

    pids = {p.pid for p in psutil.process_iter(["name"]) if (p.info["name"] or "").lower() == process_name}
    if not pids:
        return []
    user32 = ctypes.windll.user32
    titles = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def visit(hwnd, _):
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        length = user32.GetWindowTextLengthW(hwnd)
        if pid.value in pids and length:
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            titles.append(buffer.value)
        return True

    user32.EnumWindows(visit, 0)
    return titles


def parse_titles(titles: list[str] | None) -> dict:
    """Transforme les titres de fenêtre Spotify en infos lisibles."""
    if titles is None:
        return {"lance": False}
    for title in titles:
        if " - " in title and title.lower() not in PAUSED_TITLES:
            artist, track = title.split(" - ", 1)
            return {"lance": True, "lecture": True, "artiste": artist.strip(), "titre": track.strip()}
    if any(t.lower() in PAUSED_TITLES for t in titles):
        return {"lance": True, "lecture": False}
    if any(t.lower() in ("advertisement", "publicité", "spotify advertisement") for t in titles):
        return {"lance": True, "lecture": True, "artiste": "", "titre": "Publicité"}
    return {"lance": bool(titles), "lecture": False}


def now_playing() -> dict:
    if platform.system() != "Windows":
        return {"lance": False, "indisponible": True}
    try:
        titles = _window_titles_of("spotify.exe")
    except Exception:
        return {"lance": False, "indisponible": True}
    return parse_titles(titles if titles else None)


def musique_en_cours() -> str:
    state = now_playing()
    if not state.get("lance"):
        return "Spotify n'est pas ouvert."
    if not state.get("lecture"):
        return "Spotify est ouvert mais en pause."
    if state["titre"] == "Publicité":
        return "C'est une publicité qui passe sur Spotify."
    return f"En ce moment sur Spotify : {state['titre']}, de {state['artiste']}."


HANDLERS = {"musique_en_cours": musique_en_cours}
