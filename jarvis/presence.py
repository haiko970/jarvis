"""Présence intelligente : y a-t-il quelqu'un dans la pièce ? Jarvis croise plusieurs indices gratuits.

- ⌨️ clavier et souris du PC : le signe le plus sûr (quelqu'un vient de s'en servir) ;
- 📶 mouvement WiFi (RuView) : le WiFi du PC ne voit que le MOUVEMENT, pas une personne immobile.
  On ne garde que les mouvements nets et répétés (pas un seul pic isolé) ;
- 🎤 bruits de la pièce (voix, pas…) : seulement si le micro écoute déjà pour le clap. Rien n'est
  enregistré : on regarde juste si le niveau sonore dépasse le bruit de fond.

Une personne qui lit ou dort ne fait aucun signe pendant un moment : Jarvis ne dit donc « personne »
qu'après un long moment sans AUCUN signe (15 minutes par défaut, réglable). Fini le clignotement."""

import platform
import threading
import time

from . import clap, config, ruview

SIGNES = {"clavier": 0.0, "mouvement": 0.0, "son": 0.0}  # dernière fois que chaque indice a été vu
NOMS = {"clavier": "clavier ou souris", "mouvement": "mouvement (WiFi)", "son": "bruit dans la pièce"}
_mouvements: list[float] = []  # heures des dernières mesures « ça bouge » de RuView
_lance = {"ok": False}


def _inactivite_pc() -> float | None:
    """Secondes depuis la dernière touche ou le dernier mouvement de souris (Windows)."""
    if platform.system() != "Windows":
        return None
    import ctypes

    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

    info = LASTINPUTINFO(ctypes.sizeof(LASTINPUTINFO), 0)
    if not ctypes.windll.user32.GetLastInputInfo(ctypes.byref(info)):
        return None
    maintenant = ctypes.windll.kernel32.GetTickCount() & 0xFFFFFFFF
    return ((maintenant - info.dwTime) & 0xFFFFFFFF) / 1000


def _mesurer() -> None:
    now = time.time()
    inactif = _inactivite_pc()
    if inactif is not None:
        SIGNES["clavier"] = max(SIGNES["clavier"], now - inactif)
    # RuView : un mouvement compte s'il est net, et confirmé par 2 mesures en 10 secondes
    try:
        if ruview.en_marche():
            d = ruview._get("/api/v1/sensing/latest", timeout=1)
            c = d.get("classification") or {}
            if c.get("motion_level") == "present_moving" and float(c.get("confidence") or 0) >= 0.4:
                _mouvements.append(now)
            del _mouvements[:-10]
            if sum(1 for t in _mouvements if now - t < 10) >= 2:
                SIGNES["mouvement"] = now
    except Exception:
        pass
    # Le micro (s'il écoute déjà pour le clap) : un bruit qui dure, comme une voix ou des pas
    SIGNES["son"] = max(SIGNES["son"], clap.ACTIVITE["t"])


def demarrer() -> None:
    """Mesure les indices toutes les 3 secondes (très léger)."""
    if _lance["ok"]:
        return
    _lance["ok"] = True

    def boucle():
        while True:
            try:
                _mesurer()
            except Exception:
                pass
            time.sleep(3)

    threading.Thread(target=boucle, daemon=True).start()


def _duree(s: float) -> str:
    if s < 60:
        return "à l'instant"
    m = int(s // 60)
    return f"il y a {m} min" if m < 60 else f"il y a {m // 60} h {m % 60:02d}"


def etat() -> dict:
    """L'avis de Jarvis sur la pièce, avec ce qui le lui fait penser."""
    demarrer()
    now = time.time()
    delai = max(1, int(config.load().get("presence_delai_min", 15))) * 60
    vus = {k: now - t for k, t in SIGNES.items() if t > 0}
    indices = {k: _duree(v) for k, v in vus.items()}
    if not vus:
        return {"etat": "inconnu", "texte": "Pas encore d'indice", "indices": indices, "certitude": 0,
                "pc_windows": platform.system() == "Windows"}
    source, depuis = min(vus.items(), key=lambda kv: kv[1])
    if vus.get("clavier", 1e9) < 90:
        e, texte, certitude = "present", "Tu es devant le PC", 99
    elif depuis < 120:
        e, texte, certitude = "present", "Quelqu'un est là", 85 if source == "son" else 80
    elif depuis < delai:
        e, texte = "calme", "Quelqu'un est sûrement là (calme)"
        certitude = round(80 - 50 * depuis / delai)
    else:
        e, texte, certitude = "absent", "Personne", min(95, round(60 + 35 * (depuis - delai) / delai))
    return {"etat": e, "texte": texte, "certitude": certitude, "dernier": NOMS[source], "depuis": _duree(depuis),
            "indices": indices, "delai_min": delai // 60, "pc_windows": platform.system() == "Windows"}


def phrase() -> str:
    """Pour Jarvis, à voix haute."""
    p = etat()
    if p["etat"] == "inconnu":
        return "Je n'ai encore aucun indice de présence. Je surveille le clavier, la souris, le WiFi et le micro."
    texte = {"present": "Il y a quelqu'un dans la pièce", "calme": "Il y a sûrement quelqu'un, mais tout est calme",
             "absent": "Je pense qu'il n'y a personne"}[p["etat"]]
    if p["etat"] == "present" and p["texte"] == "Tu es devant le PC":
        texte = "Tu es devant le PC : quelqu'un vient de se servir du clavier ou de la souris"
    texte += f" (dernier signe de vie : {p['dernier']}, {p['depuis']})."
    try:
        r = ruview.etat()
        if r.get("marche") and r.get("respiration"):
            texte += f" Le capteur estime une respiration vers {r['respiration']} par minute."
    except Exception:
        pass
    return texte
