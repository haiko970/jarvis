"""Réglages de Jarvis (prénom, personnalité, voix…), enregistrés dans un petit fichier."""

import json
from pathlib import Path

CONFIG_FILE = Path.home() / ".jarvis_config.json"

DEFAULTS = {
    "prenom": "",
    "ville": "",  # ville par défaut pour la météo
    "a_propos": "",  # ce que l'utilisateur veut que Jarvis sache sur lui
    "souvenirs": [],  # infos retenues au fil des conversations
    "personnalite": "majordome",
    "voix": "",  # nom de la voix choisie dans l'interface ("" = choix automatique)
    "vitesse": 1.0,
    "hauteur": 1.0,
    "ecoute_permanente": False,
    "cerveau": "qwen3:8b",  # modèle Ollama utilisé (appliqué au prochain démarrage)
    "processeur_seulement": False,  # mis à True si la carte graphique a planté
    "mail_service": "gmail",
    "mail_adresse": "",
    "mail_serveur": "",  # seulement pour un service « autre »
    "mail_mdp_secours": "",  # utilisé seulement si le coffre-fort de Windows est indisponible
    "agenda_ics": "",  # lien secret iCal de l'agenda (Google Agenda, Outlook…)
}

CERVEAUX = {
    "qwen3:1.7b": "⚡⚡⚡ Éclair — très rapide, plus limité (1,4 Go)",
    "qwen3:4b": "⚡⚡ Rapide — bon compromis (2,5 Go)",
    "qwen3:8b": "⚡ Malin — le plus intelligent, plus lent (5,2 Go)",
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
