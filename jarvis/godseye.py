"""God's Eye View : la Terre en 3D en direct (avions, bateaux, satellites, séismes, caméras…).

Projet : https://github.com/bilawalsidhu/gods-eye-view
Il s'installe en un clic avec l'application Pinokio. Jarvis ne l'installe pas lui-même : il le
retrouve quand il tourne (Pinokio choisit son adresse) et l'ouvre dans le navigateur."""

import re
import unicodedata
import urllib.request
import webbrowser
from concurrent.futures import ThreadPoolExecutor

from . import config

PAGE_PINOKIO = "https://pinokio.co/apps/github-com-bilawalsidhu-gods-eye-view"
# 4173 : lancement « à la main » ; 42000 et plus : les adresses que Pinokio donne d'habitude
PORTS = [4173] + list(range(42000, 42100))

TOOLS = [
    {
        "name": "ouvrir_gods_eye",
        "description": (
            "Ouvre God's Eye View, la Terre en 3D en direct (avions, bateaux, satellites, séismes, caméras). "
            "À utiliser quand l'utilisateur veut voir le monde en direct ou demande God's Eye."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    }
]


def _est_gods_eye(url: str, timeout: float = 0.6) -> bool:
    """Vrai si l'adresse répond et que c'est bien God's Eye View (le titre de sa page)."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return "God's Eye View" in r.read(4000).decode("utf-8", "ignore")
    except Exception:
        return False


def trouver() -> str | None:
    """L'adresse de God's Eye View s'il tourne, sinon None."""
    connue = config.load()["godseye_url"].strip()
    if connue and _est_gods_eye(connue, timeout=1.5):
        return connue
    adresses = [f"http://127.0.0.1:{p}/" for p in PORTS]
    with ThreadPoolExecutor(max_workers=32) as pool:  # on essaie toutes les adresses en même temps
        for url, ok in zip(adresses, pool.map(_est_gods_eye, adresses)):
            if ok:
                if url != connue:
                    config.save({"godseye_url": url})
                return url
    return None


def ouvrir() -> tuple[bool, str]:
    """Ouvre God's Eye View s'il tourne, sinon la page Pinokio pour l'installer ou le lancer."""
    url = trouver()
    if url:
        webbrowser.open(url)
        return True, "Voici la Terre en direct, avec God's Eye View."
    webbrowser.open(PAGE_PINOKIO)
    return False, (
        "God's Eye View n'est pas lancé. J'ouvre sa page Pinokio : clique sur Install la première fois, "
        "puis sur Start. Redemande-moi ensuite, je l'ouvrirai."
    )


def quick(text: str) -> bool:
    """Reconnaît « ouvre God's Eye », « montre-moi le monde en direct »…"""
    t = unicodedata.normalize("NFD", text.lower().replace("’", "'"))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    if re.search(r"god'?s? ?eyes?|(?:oe|œ)il de dieu", t):
        return True
    return bool(re.search(r"(?:monde|terre|planete) en (?:direct|live|temps reel)", t))


def _ouvrir_gods_eye() -> str:
    return ouvrir()[1]


HANDLERS = {"ouvrir_gods_eye": _ouvrir_gods_eye}
