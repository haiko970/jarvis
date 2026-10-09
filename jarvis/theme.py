"""Thèmes de couleur de l'interface : J.A.R.V.I.S., Iron Man, Hulk, Thanos, Furtif."""

import re
import unicodedata

from . import config, systeme

THEMES = {
    "jarvis": "J.A.R.V.I.S. (bleu)",
    "iron": "Iron Man (rouge et or)",
    "hulk": "Hulk (vert et violet)",
    "thanos": "Thanos (violet et or)",
    "furtif": "Furtif (blanc argenté)",
}

# Les mots qu'on peut dire pour chaque thème
NOMS = {
    "jarvis": ["jarvis", "bleu", "normal", "classique", "de base", "par defaut", "d'origine"],
    "iron": ["iron man", "ironman", "iron", "rouge", "doré", "dore", "tony stark", "stark"],
    "hulk": ["hulk", "vert", "verte"],
    "thanos": ["thanos", "violet", "violette", "mauve"],
    "furtif": ["furtif", "blanc", "argent", "argenté", "argente", "gris", "stealth"],
}

TOOLS = [
    {
        "name": "changer_theme",
        "description": (
            "Change les couleurs de l'interface de Jarvis. Thèmes : jarvis (bleu), iron (Iron Man, rouge et or), "
            "hulk (vert et violet), thanos (violet et or), furtif (blanc argenté)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"theme": {"type": "string", "enum": list(THEMES)}},
            "required": ["theme"],
            "additionalProperties": False,
        },
    }
]


def _simple(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower().replace("’", "'"))
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def find_theme(text: str) -> str | None:
    """Trouve le thème dont on parle (« Iron Man », « rouge »…), sinon None."""
    phrase = " " + re.sub(r"[^a-z' ]+", " ", _simple(text)) + " "
    for key, words in NOMS.items():
        if key == "jarvis":
            continue  # « Jarvis » est souvent dit juste pour l'appeler : on le teste à part
        if any(f" {_simple(w)} " in phrase for w in words):
            return key
    if any(f" {_simple(w)} " in phrase for w in NOMS["jarvis"] if w != "jarvis"):
        return "jarvis"
    if phrase.count(" jarvis ") >= 1 and re.search(r"theme (de |du )?jarvis", phrase):
        return "jarvis"
    return None


def changer_theme(theme: str) -> str:
    key = theme if theme in THEMES else find_theme(theme)
    if not key:
        return "Thème inconnu. Thèmes possibles : " + ", ".join(THEMES.values())
    config.save({"theme": key})
    systeme.STATE["theme"] = key  # l'interface change de couleur à la fin de la réponse
    return f"Thème {THEMES[key]} activé."


HANDLERS = {"changer_theme": changer_theme}


# Commande rapide, sans passer par le cerveau : « mets le thème Iron Man », « passe en rouge »…
_QUICK = re.compile(r"\b(theme|couleurs?|mode)\b|\b(mets?|passe|change)[- ]?(toi)? (en|au) ")


def quick_theme(text: str) -> str | None:
    phrase = _simple(text)
    if not _QUICK.search(phrase) or len(phrase.split()) > 10:
        return None
    return find_theme(re.sub(r"^\W*(ok |dis |hey |eh )?jarvis\W*", "", phrase))


def run_quick(key: str) -> str:
    changer_theme(key)
    return f"C'est fait, je passe au thème {THEMES[key]}."
