"""Réglages de Jarvis (prénom, personnalité, voix…), enregistrés dans un petit fichier."""

import json
from pathlib import Path

CONFIG_FILE = Path.home() / ".jarvis_config.json"

DEFAULTS = {
    "prenom": "",
    "personnalite": "majordome",
    "voix": "",  # nom de la voix choisie dans l'interface ("" = choix automatique)
    "vitesse": 1.0,
    "hauteur": 1.0,
    "ecoute_permanente": False,
}

PERSONNALITES = {
    "majordome": (
        "Majordome britannique",
        "Tu as le ton poli, efficace et pince-sans-rire du Jarvis d'Iron Man. Tu vouvoies l'utilisateur.",
    ),
    "drole": (
        "Drôle et taquin",
        "Tu es plein d'humour : blagues, jeux de mots et taquineries gentilles, sans jamais oublier d'aider. "
        "Tu tutoies l'utilisateur.",
    ),
    "copain": (
        "Pote décontracté",
        "Tu parles comme un ami proche, de façon détendue et chaleureuse. Tu tutoies l'utilisateur.",
    ),
    "serieux": (
        "Sérieux et efficace",
        "Tu es sobre, précis et direct : pas de blague, juste l'essentiel. Tu vouvoies l'utilisateur.",
    ),
}


def load() -> dict:
    data = dict(DEFAULTS)
    try:
        data.update(json.loads(CONFIG_FILE.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        pass
    return data


def save(changes: dict) -> dict:
    data = load()
    data.update({k: v for k, v in changes.items() if k in DEFAULTS})
    CONFIG_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data
