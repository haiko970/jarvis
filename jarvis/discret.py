"""Mode discret : au démarrage du PC, Jarvis attend en arrière-plan au lieu d'ouvrir sa fenêtre.

- une petite icône près de l'horloge (clic = ouvrir Jarvis, clic droit = menu) ;
- le raccourci clavier Ctrl + Alt + J ouvre Jarvis de n'importe où ;
- les rappels et annonces arrivent en notification quand la fenêtre est fermée.
Tout est prévu pour Windows ; ailleurs, ces petits plus sont simplement ignorés."""

import json
import platform
import threading
import urllib.request
from pathlib import Path

from . import config

RACCOURCI = "Ctrl + Alt + J"
ICON = Path(__file__).parent / "static" / "jarvis.ico"
_tray = {"icon": None}


# ---------- Une seule copie de Jarvis à la fois ----------
def already_running(port: int) -> bool:
    """Si Jarvis tourne déjà (en arrière-plan), on lui demande d'ouvrir sa fenêtre et on renvoie True."""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/info", timeout=2) as r:
            if "model" not in json.load(r):
                return False
        request = urllib.request.Request(f"http://127.0.0.1:{port}/api/ouvrir", data=b"{}", method="POST")
        urllib.request.urlopen(request, timeout=5).close()
        return True
    except Exception:
        return False


# ---------- L'icône près de l'horloge ----------
def start_tray(open_window, run_brief, quit_jarvis) -> None:
    """Affiche l'icône de Jarvis près de l'horloge (Windows, avec pystray)."""
    if platform.system() != "Windows":
        return
    try:
        import pystray
        from PIL import Image
    except ImportError:
        return  # pas grave : le raccourci clavier marche quand même

    def menu_open(icon, item):
        open_window()

    def menu_brief(icon, item):
        run_brief()

    def menu_quit(icon, item):
        icon.stop()
        quit_jarvis()

    icon = pystray.Icon(
        "jarvis",
        Image.open(ICON),
        f"Jarvis — clic pour ouvrir ({RACCOURCI})",
        menu=pystray.Menu(
            pystray.MenuItem("Ouvrir Jarvis", menu_open, default=True),
            pystray.MenuItem("Mon brief du jour", menu_brief),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quitter Jarvis", menu_quit),
        ),
    )
    _tray["icon"] = icon
    threading.Thread(target=icon.run, daemon=True).start()


def stop_tray() -> None:
    if _tray["icon"]:
        try:
            _tray["icon"].stop()
        except Exception:
            pass


def notify(text: str, title: str = "Jarvis") -> bool:
    """Petite notification Windows (depuis l'icône). Renvoie False si impossible."""
    icon = _tray["icon"]
    if not icon:
        return False
    try:
        icon.notify(text[:250], title)
        return True
    except Exception:
        return False


# ---------- Le raccourci clavier Ctrl + Alt + J ----------
def start_hotkey(open_window) -> None:
    if platform.system() != "Windows":
        return

    def loop() -> None:
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32
        # 0x0001 = Alt, 0x0002 = Ctrl, 0x4000 = ne pas répéter si la touche reste enfoncée
        if not user32.RegisterHotKey(None, 1, 0x0001 | 0x0002 | 0x4000, ord("J")):
            return  # déjà pris par un autre programme
        msg = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == 0x0312:  # WM_HOTKEY
                threading.Thread(target=open_window, daemon=True).start()

    threading.Thread(target=loop, daemon=True).start()


def enabled() -> bool:
    return config.load()["demarrage_mode"] == "discret"
