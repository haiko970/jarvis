"""Commandes système : fermer Jarvis, éteindre ou redémarrer le PC (avec un délai pour annuler)."""

import platform
import re
import subprocess

SHUTDOWN_DELAY = 30  # secondes laissées pour enregistrer son travail ou dire « annule »

# Mis à True quand Jarvis doit se fermer après sa réponse (lu par l'interface).
STATE = {"quit": False, "restart": False, "theme": None}


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "fermer_jarvis",
        "description": "Ferme Jarvis (l'assistant lui-même), quand l'utilisateur lui demande de se fermer ou de s'éteindre.",
        "input_schema": _schema({}, []),
    },
    {
        "name": "eteindre_ordinateur",
        "description": (
            f"Éteint ou redémarre l'ordinateur (toutes les applications se ferment) dans {SHUTDOWN_DELAY} secondes. "
            "À utiliser seulement si l'utilisateur demande clairement d'éteindre, fermer ou redémarrer son ordinateur."
        ),
        "input_schema": _schema({"action": {"type": "string", "enum": ["eteindre", "redemarrer"]}}, ["action"]),
    },
    {
        "name": "annuler_extinction",
        "description": "Annule une extinction ou un redémarrage de l'ordinateur programmé.",
        "input_schema": _schema({}, []),
    },
]


def fermer_jarvis() -> str:
    STATE["quit"] = True
    return "Jarvis va se fermer juste après cette réponse : dis simplement au revoir."


def eteindre_ordinateur(action: str = "eteindre") -> str:
    restart = action == "redemarrer"
    if platform.system() == "Windows":
        message = f"Jarvis {'redémarre' if restart else 'éteint'} l'ordinateur. Enregistre ton travail !"
        cmd = ["shutdown", "/r" if restart else "/s", "/t", str(SHUTDOWN_DELAY), "/c", message]
    elif platform.system() == "Darwin":
        cmd = ["osascript", "-e", f'tell app "System Events" to {"restart" if restart else "shut down"}']
    else:
        cmd = ["shutdown", "-r" if restart else "-h", "+1"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return f"Impossible de {'redémarrer' if restart else 'éteindre'} l'ordinateur : {result.stderr.strip()}"
    verb = "redémarrer" if restart else "s'éteindre"
    return (
        f"L'ordinateur va {verb} dans {SHUTDOWN_DELAY} secondes "
        "et toutes les applications vont se fermer. Rappelle à l'utilisateur qu'il peut dire « annule »."
    )


def annuler_extinction() -> str:
    cmd = ["shutdown", "/a"] if platform.system() == "Windows" else ["shutdown", "-c"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return "Aucune extinction n'était prévue."
    return "Extinction annulée."


HANDLERS = {
    "fermer_jarvis": fermer_jarvis,
    "eteindre_ordinateur": eteindre_ordinateur,
    "annuler_extinction": annuler_extinction,
}


# ---------- Commandes reconnues directement, sans passer par le cerveau (plus rapide et plus sûr) ----------
def _norm(text: str) -> str:
    text = text.lower().replace("’", "'")
    text = re.sub(r"^(ok |dis |hey |eh )?jarvis[\s,.!]*", "", text.strip())
    return re.sub(r"[\s.!?,]+$", "", text)


_PC = r"(?:mon |l'|le |la )?(?:ordi(?:nateur)?|pc|machine)"
QUICK = [
    ("annuler", re.compile(r"^(?:annule|annuler)(?: (?:tout|l'extinction|l'arr[eê]t|le red[eé]marrage))?$|^n'[eé]teins pas")),
    ("redemarrer", re.compile(rf"^(?:red[eé]marre|relance)(?:[- ]le)? {_PC}\b")),
    ("eteindre", re.compile(rf"^(?:ferme|[eé]teins|arr[eê]te|coupe)(?:[- ]le)? {_PC}\b")),
    ("fermer_jarvis", re.compile(r"^(?:ferme|[eé]teins|arr[eê]te|quitte)[- ]toi$|^(?:au revoir|bonne nuit|quitte|ferme jarvis)$")),
]


def quick_command(text: str) -> str | None:
    """Renvoie le nom de la commande si la phrase en est une, sinon None."""
    phrase = _norm(text)
    for name, pattern in QUICK:
        if pattern.search(phrase):
            return name
    return None


def run_quick(name: str) -> str:
    """Exécute une commande rapide et renvoie la phrase que Jarvis doit dire."""
    if name == "fermer_jarvis":
        fermer_jarvis()
        return "À bientôt ! Je me mets en veille."
    if name == "annuler":
        return "C'est annulé, l'ordinateur reste allumé." if "annulée" in annuler_extinction() else "Il n'y avait rien à annuler."
    result = eteindre_ordinateur(name)
    if result.startswith("Impossible"):
        return result
    verb = "redémarre" if name == "redemarrer" else "s'éteint"
    return (
        f"Très bien. L'ordinateur {verb} dans {SHUTDOWN_DELAY} secondes et tes applications vont se fermer. "
        "Enregistre ton travail, ou dis « annule » si tu as changé d'avis."
    )
