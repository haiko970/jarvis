"""RuView : savoir si quelqu'un est dans la pièce grâce au WiFi (https://github.com/ruvnet/RuView).

RuView est un programme à part, installé une fois avec « installer_ruview.bat » dans le dossier
personnel (~/RuView), donc hors du dossier de Jarvis : la mise à jour de Jarvis n'y touche pas.
Jarvis lance son petit serveur en arrière-plan et lui demande ce qu'il voit.

Sans capteur, RuView écoute la force du WiFi du PC : il devine seulement s'il y a quelqu'un
et si ça bouge. Avec une carte ESP32-S3 (~9 €), il peut aussi estimer la respiration."""

import json
import platform
import subprocess
import time
import urllib.request
from pathlib import Path

from . import config

DOSSIER = Path.home() / "RuView"
PORT = 3000  # écran et données de RuView : http://127.0.0.1:3000
PORT_WS = 3001
SOURCES = {
    "wifi": "le WiFi du PC (présence et mouvement, approximatif)",
    "esp32": "un capteur ESP32 (plus précis, respiration)",
    "simulate": "des données de démonstration (pour essayer)",
}
TOOLS = [
    {
        "name": "presence_piece",
        "description": (
            "Dit s'il y a quelqu'un dans la pièce et si ça bouge, grâce au capteur WiFi RuView "
            "(et la respiration si un capteur ESP32 est branché)."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    }
]

_process: dict = {"p": None}
ETATS = {
    "absent": "personne",
    "present_still": "quelqu'un d'immobile",
    "present_moving": "quelqu'un qui bouge",
}


def programme() -> Path:
    """Le serveur de RuView compilé par installer_ruview.bat."""
    nom = "sensing-server.exe" if platform.system() == "Windows" else "sensing-server"
    return DOSSIER / "v2" / "target" / "release" / nom


def installe() -> bool:
    return programme().exists()


def _get(chemin: str, timeout: float = 2) -> dict:
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{chemin}", timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def en_marche() -> bool:
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=1).close()
        return True
    except Exception:
        return False


def demarrer() -> tuple[bool, str]:
    """Lance le serveur RuView en arrière-plan (sans fenêtre noire)."""
    if en_marche():
        return True, "RuView est déjà lancé."
    if not installe():
        return False, "RuView n'est pas installé : double-clique sur « installer_ruview.bat » dans le dossier de Jarvis."
    source = config.load()["ruview_source"]
    commande = [str(programme()), "--source", source, "--http-port", str(PORT), "--ws-port", str(PORT_WS)]
    if source == "wifi":
        commande += ["--tick-ms", "500"]  # le WiFi du PC ne donne pas plus de 2 mesures par seconde
    options = {}
    if platform.system() == "Windows":
        options["creationflags"] = subprocess.CREATE_NO_WINDOW
    journal = open(Path.home() / ".jarvis_ruview.log", "w", encoding="utf-8")
    try:
        # Lancé depuis v2 : RuView y trouve son écran (dossier ../ui).
        _process["p"] = subprocess.Popen(commande, cwd=DOSSIER / "v2", stdout=journal, stderr=subprocess.STDOUT, **options)
    except OSError as e:
        return False, f"Impossible de lancer RuView : {e}"
    for _ in range(30):  # jusqu'à 15 secondes pour démarrer
        time.sleep(0.5)
        if en_marche():
            return True, "RuView est lancé."
        if _process["p"].poll() is not None:
            break
    return False, "RuView ne démarre pas. Regarde le fichier .jarvis_ruview.log dans ton dossier personnel."


def arreter() -> None:
    """Arrête RuView s'il a été lancé par Jarvis."""
    p = _process["p"]
    if p and p.poll() is None:
        p.terminate()
        try:
            p.wait(timeout=5)  # on attend qu'il libère sa place (le port 3000)
        except subprocess.TimeoutExpired:
            p.kill()
    _process["p"] = None


def demarrage_auto() -> None:
    """Au lancement de Jarvis : démarre RuView s'il est installé et activé dans les réglages."""
    if config.load()["ruview_actif"] and installe():
        demarrer()


def etat() -> dict:
    """Ce que RuView voit en ce moment, en version simple pour le tableau de bord."""
    if not installe() and not en_marche():
        return {"installe": False, "marche": False}
    try:
        d = _get("/api/v1/sensing/latest")
    except Exception:
        return {"installe": True, "marche": False, "actif": config.load()["ruview_actif"]}
    if "classification" not in d:  # « no data yet » ou mesures trop anciennes
        return {"installe": True, "marche": True, "attente": True, "source": d.get("source", "")}
    c = d["classification"]
    vitals = d.get("vital_signs") or {}
    respiration = vitals.get("breathing_rate_bpm")
    if not respiration or vitals.get("breathing_confidence", 0) < 0.3:
        respiration = None
    return {
        "installe": True,
        "marche": True,
        "source": d.get("source", ""),
        "presence": bool(c.get("presence")),
        "mouvement": c.get("motion_level", ""),
        "confiance": round(float(c.get("confidence") or 0) * 100),
        "personnes": d.get("estimated_persons"),
        "respiration": round(respiration) if respiration else None,
    }


def phrase(e: dict) -> str:
    """L'état de la pièce en une phrase, pour Jarvis."""
    if not e["installe"]:
        return "RuView n'est pas installé : double-clique sur installer_ruview.bat dans le dossier de Jarvis."
    if not e["marche"]:
        return "RuView n'est pas lancé. Active-le dans les Réglages, rubrique Présence."
    if e.get("attente"):
        return "RuView démarre, il n'a pas encore de mesure."
    texte = f"RuView détecte {ETATS.get(e['mouvement'], 'quelqu’un' if e['presence'] else 'personne')}"
    texte += f" dans la pièce (sûr à {e['confiance']} %)"
    if e["presence"] and e.get("personnes") and e["personnes"] > 1:
        texte += f", environ {e['personnes']} personnes"
    if e.get("respiration"):
        texte += f", respiration vers {e['respiration']} par minute"
    if e["source"] in ("simulate", "simulated"):
        texte += ". Attention, ce sont des données de démonstration"
    elif e["source"] == "wifi":
        texte += ". Avec le WiFi du PC seul, c'est une estimation"
    return texte + "."


def _presence_piece() -> str:
    return phrase(etat())


HANDLERS = {"presence_piece": _presence_piece}
