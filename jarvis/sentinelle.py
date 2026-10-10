"""Mode sentinelle : Jarvis surveille le PC pendant ton absence.

Si quelqu'un touche la souris ou le clavier, Jarvis demande le code secret. Sans le bon code
au bout de 20 secondes : « Accès non autorisé », photo avec la webcam et PC verrouillé."""

import base64
import datetime
import hmac
import json
import platform
import re
import threading
import time
from pathlib import Path

from . import config

DEPART = 15  # secondes pour partir après l'activation
DELAI_CODE = 20  # secondes pour taper le code quand quelqu'un touche au PC
ESSAIS = 3  # mauvais codes acceptés avant l'alarme
REPORT_FILE = Path.home() / ".jarvis_sentinelle.json"

_lock = threading.Lock()
STATE = {
    "etat": "off",  # off, depart, armee, alerte, intrusion
    "depuis": 0.0,  # début de l'état actuel
    "active_le": "",  # heure d'activation
    "essais": 0,
    "photos_alerte": [],  # photos prises pendant l'alerte en cours
}
_baseline = {"tick": None}


def _schema() -> dict:
    return {"type": "object", "properties": {}, "required": [], "additionalProperties": False}


TOOLS = [
    {
        "name": "activer_sentinelle",
        "description": (
            "Active le mode sentinelle : Jarvis surveille le PC pendant l'absence de l'utilisateur. "
            "Si quelqu'un y touche sans taper le code secret, il le prend en photo et verrouille le PC."
        ),
        "input_schema": _schema(),
    },
    {
        "name": "rapport_sentinelle",
        "description": "Dit si quelqu'un a essayé d'utiliser le PC pendant le mode sentinelle, et ouvre le dossier des photos.",
        "input_schema": _schema(),
    },
]


def photo_folder() -> Path:
    pictures = Path.home() / "Pictures"
    folder = pictures / "Jarvis sentinelle" if pictures.exists() else Path.home() / ".jarvis_sentinelle"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _load_report() -> list[dict]:
    try:
        return json.loads(REPORT_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def _save_report(items: list[dict]) -> None:
    REPORT_FILE.write_text(json.dumps(items[-50:], ensure_ascii=False, indent=2), encoding="utf-8")


def code_configured() -> bool:
    return bool(config.get_secret("sentinelle_code"))


def set_code(code: str) -> tuple[bool, str]:
    code = code.strip()
    if not re.fullmatch(r"\d{4,8}", code):
        return False, "Le code doit faire de 4 à 8 chiffres."
    if STATE["etat"] != "off":
        return False, "Impossible de changer le code pendant que la sentinelle est active."
    config.set_secret("sentinelle_code", code)
    return True, "Code secret enregistré."


# ---------- Windows : savoir si quelqu'un touche au PC, mettre Jarvis devant, verrouiller ----------
def _last_input() -> int | None:
    """Moment du dernier clic ou de la dernière touche (Windows seulement)."""
    if platform.system() != "Windows":
        return None
    import ctypes

    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

    info = LASTINPUTINFO()
    info.cbSize = ctypes.sizeof(info)
    ctypes.windll.user32.GetLastInputInfo(ctypes.byref(info))
    return info.dwTime


def _jarvis_windows() -> list:
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    found = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def visit(hwnd, _):
        length = user32.GetWindowTextLengthW(hwnd)
        if length:
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            if buffer.value.startswith("J.A.R.V.I.S."):
                found.append(hwnd)
        return True

    user32.EnumWindows(visit, 0)
    return found


def _bring_to_front(on_top: bool) -> None:
    """Met la fenêtre de Jarvis au premier plan (et au-dessus de tout pendant l'alerte)."""
    if platform.system() != "Windows":
        return
    try:
        import ctypes

        user32 = ctypes.windll.user32
        for hwnd in _jarvis_windows():
            if on_top:
                user32.ShowWindow(hwnd, 9)  # restaurer si réduite
                user32.keybd_event(0x12, 0, 0, 0)  # petite astuce (touche Alt) pour que Windows accepte
                user32.keybd_event(0x12, 0, 2, 0)
                user32.SetForegroundWindow(hwnd)
            user32.SetWindowPos(hwnd, -1 if on_top else -2, 0, 0, 0, 0, 0x0001 | 0x0002)  # au-dessus de tout, ou plus
    except Exception:
        pass


def lock_pc() -> None:
    if platform.system() == "Windows":
        import ctypes

        ctypes.windll.user32.LockWorkStation()


# ---------- Les étapes ----------
def _set(etat: str) -> None:
    STATE["etat"], STATE["depuis"] = etat, time.time()


def activer() -> tuple[bool, str]:
    if not code_configured():
        return False, "Choisis d'abord un code secret dans ⚙️ Réglages → Sentinelle."
    with _lock:
        if STATE["etat"] != "off":
            return True, "La sentinelle est déjà active."
        _set("depart")
        STATE["active_le"] = datetime.datetime.now().strftime("%Hh%M")
        STATE["essais"] = 0
        STATE["photos_alerte"] = []
    threading.Thread(target=_watch, daemon=True).start()
    return True, f"Sentinelle activée dans {DEPART} secondes : tu peux partir."


def _watch() -> None:
    """Surveille la souris et le clavier (Windows), et gère les délais."""
    while STATE["etat"] != "off":
        now = time.time()
        with _lock:
            etat, depuis = STATE["etat"], STATE["depuis"]
            if etat == "depart" and now - depuis >= DEPART:
                _set("armee")
                _baseline["tick"] = _last_input()
            elif etat == "armee" and _baseline["tick"] is not None and _last_input() != _baseline["tick"]:
                _start_alert()
            elif etat == "alerte" and now - depuis >= DELAI_CODE:
                _intrusion()
        time.sleep(0.3)


def _start_alert() -> None:
    _set("alerte")
    STATE["essais"] = 0
    STATE["photos_alerte"] = []
    threading.Thread(target=_bring_to_front, args=(True,), daemon=True).start()


def _intrusion() -> None:
    _set("intrusion")
    items = _load_report()
    items.append({
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "photos": list(STATE["photos_alerte"]),
        "vu": False,
    })
    _save_report(items)
    if config.load()["sentinelle_verrou"]:
        # On laisse 6 secondes à Jarvis pour dire « Accès non autorisé » et prendre la photo
        threading.Timer(6, lock_pc).start()


def activite() -> None:
    """La page a vu bouger la souris ou une touche (utile hors Windows)."""
    with _lock:
        if STATE["etat"] == "armee":
            _start_alert()


def page_closed() -> None:
    """Quelqu'un ferme la fenêtre de Jarvis pendant la surveillance : verrouillage immédiat."""
    with _lock:
        if STATE["etat"] in ("armee", "alerte"):
            _intrusion()
            lock_pc()


def annuler_depart() -> bool:
    with _lock:
        if STATE["etat"] == "depart":
            _set("off")
            return True
    return False


def desarmer(code: str) -> dict:
    stored = config.get_secret("sentinelle_code") or ""
    with _lock:
        if STATE["etat"] == "off":
            return {"ok": True, "rapport": []}
        if not stored or not hmac.compare_digest(code.strip(), stored):
            STATE["essais"] += 1
            if STATE["etat"] == "alerte" and STATE["essais"] >= ESSAIS:
                _intrusion()
            return {"ok": False, "reste": max(0, ESSAIS - STATE["essais"])}
        was_alert = STATE["etat"] == "alerte"
        _set("off")
        if was_alert:
            # C'était toi : les photos de cette alerte ne servent à rien
            for name in STATE["photos_alerte"]:
                (photo_folder() / name).unlink(missing_ok=True)
        STATE["photos_alerte"] = []
    threading.Thread(target=_bring_to_front, args=(False,), daemon=True).start()
    items = _load_report()
    report = [i for i in items if not i.get("vu")]
    for i in items:
        i["vu"] = True
    if report:
        _save_report(items)
    return {"ok": True, "rapport": report}


def save_photo(data_url: str) -> str | None:
    """Enregistre une photo de la webcam envoyée par la page."""
    if STATE["etat"] not in ("alerte", "intrusion"):
        return None
    match = re.match(r"data:image/jpeg;base64,(.+)", data_url or "")
    if not match:
        return None
    name = datetime.datetime.now().strftime("intrus_%Y-%m-%d_%Hh%M_%S.jpg")
    (photo_folder() / name).write_bytes(base64.b64decode(match[1]))
    with _lock:
        STATE["photos_alerte"].append(name)
        if STATE["etat"] == "intrusion":  # la photo arrive juste après le déclenchement : on l'ajoute au rapport
            items = _load_report()
            if items and name not in items[-1]["photos"]:
                items[-1]["photos"].append(name)
                _save_report(items)
    return name


def photo_path(name: str) -> Path | None:
    if not re.fullmatch(r"intrus_[\w-]+\.jpg", name or ""):
        return None
    path = photo_folder() / name
    return path if path.exists() else None


def status() -> dict:
    etat, depuis = STATE["etat"], STATE["depuis"]
    reste = None
    if etat == "depart":
        reste = max(0, round(DEPART - (time.time() - depuis)))
    elif etat == "alerte":
        reste = max(0, round(DELAI_CODE - (time.time() - depuis)))
    return {"etat": etat, "reste": reste, "active_le": STATE["active_le"], "essais": STATE["essais"], "code_ok": code_configured()}


# ---------- Ce que Jarvis peut faire à la voix ----------
def activer_sentinelle() -> str:
    ok, message = activer()
    return message if ok else f"Impossible : {message}"


def rapport_sentinelle() -> str:
    items = _load_report()
    if not items:
        return "Personne n'a essayé d'utiliser le PC pendant le mode sentinelle."
    lines = [f"{len(items)} intrusion(s) enregistrée(s). Les plus récentes :"]
    for i in items[-5:]:
        d = datetime.datetime.strptime(i["date"], "%Y-%m-%d %H:%M:%S")
        lines.append(f"- le {d.strftime('%d/%m à %Hh%M')}, {len(i['photos'])} photo(s)")
    try:
        if platform.system() == "Windows":
            import os

            os.startfile(photo_folder())
            lines.append("Le dossier des photos est ouvert.")
    except OSError:
        pass
    return "\n".join(lines)


HANDLERS = {"activer_sentinelle": activer_sentinelle, "rapport_sentinelle": rapport_sentinelle}

# Phrases reconnues directement : « surveille le PC », « mode sentinelle »…
QUICK = re.compile(
    r"^(?:ok |dis |hey )?(?:jarvis[\s,.!]*)?(?:surveille(?:[- ]le)? (?:mon |le |l')?(?:pc|ordi(?:nateur)?|bureau|chambre)"
    r"|(?:active|lance|mets|met|passe en)(?: le| la)? (?:mode )?sentinelle|mode sentinelle)\b"
)


def quick(text: str) -> bool:
    return bool(QUICK.search(text.lower().replace("’", "'").strip()))
