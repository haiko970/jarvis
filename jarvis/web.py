"""Interface graphique de Jarvis : un petit serveur local + une page web ouverte dans sa propre fenêtre."""

import json
import os
import platform
import shutil
import socket
import subprocess
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import ollama

from . import brief as brief_module
from . import config, dashboard, elevenlabs, musique, powers, pronote, systeme
from .brain import MODEL, Brain
from .powers import EVENTS

PAGE = Path(__file__).parent / "static" / "index.html"
PREFERRED_PORT = 8765


def _free_port() -> int:
    for port in (PREFERRED_PORT, 0):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", port))
                return s.getsockname()[1]
            except OSError:
                continue
    raise RuntimeError("Aucun port libre")


def _find_edge() -> str | None:
    """Edge est installé sur tous les Windows et sait ouvrir une page comme une vraie appli."""
    if platform.system() != "Windows":
        return None
    candidates = [shutil.which("msedge")]
    for base in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles")):
        if base:
            candidates.append(os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
    return next((c for c in candidates if c and os.path.exists(c)), None)


def close_app_window() -> None:
    """Plan B pour « ferme-toi » : demande à Windows de fermer la fenêtre « J.A.R.V.I.S. »."""
    if platform.system() != "Windows":
        return
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
    for hwnd in found:
        user32.PostMessageW(hwnd, 0x0010, 0, 0)  # WM_CLOSE


def open_window(url: str) -> None:
    edge = _find_edge()
    if edge:
        # autoplay : permet à Jarvis de lire le brief à voix haute sans attendre un clic
        subprocess.Popen([edge, f"--app={url}", "--window-size=1366,800", "--start-maximized", "--autoplay-policy=no-user-gesture-required"])
    else:
        webbrowser.open(url)


def serve(brain: Brain, with_brief: bool = False) -> None:
    lock = threading.Lock()  # une seule question à la fois pour le cerveau
    state = {"shutdown_timer": None}

    def cancel_shutdown() -> None:
        if systeme.STATE["quit"]:
            return  # « ferme-toi » a été demandé : plus rien n'annule l'arrêt
        if state["shutdown_timer"]:
            state["shutdown_timer"].cancel()
            state["shutdown_timer"] = None

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args) -> None:  # pas de journal technique dans la fenêtre noire
            pass

        def _send(self, code: int, body: bytes, content_type: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _json(self, data: dict, code: int = 200) -> None:
            self._send(code, json.dumps(data, ensure_ascii=False).encode(), "application/json")

        def do_GET(self) -> None:
            cancel_shutdown()
            if self.path.split("?")[0] in ("/", "/index.html"):
                self._send(200, PAGE.read_bytes(), "text/html; charset=utf-8")
            elif self.path == "/jsQR.js":
                self._send(200, (PAGE.parent / "jsQR.js").read_bytes(), "text/javascript; charset=utf-8")
            elif self.path.startswith("/api/dashboard"):
                self._json(dashboard.collect(force="force=1" in self.path))
            elif self.path == "/api/media":
                self._json(musique.now_playing())
            elif self.path == "/api/system":
                self._json(dashboard.system())
            elif self.path == "/api/info":
                self._json({"model": MODEL})
            elif self.path == "/api/settings":
                personalities = {k: v[0] for k, v in config.PERSONNALITES.items()}
                settings = config.load()
                settings.pop("mail_mdp_secours", None)  # les secrets ne sortent jamais
                settings.pop("elevenlabs_cle_secours", None)
                settings.pop("pronote_mdp_secours", None)
                settings.pop("pronote_jeton_secours", None)
                self._json({
                    "settings": settings,
                    "mail_services": {k: v[0] for k, v in brief_module.MAIL_SERVICES.items()},
                    "mail_ok": brief_module.mail_configured(),
                    "elevenlabs_ok": bool(config.get_secret("elevenlabs_cle")),
                    "pronote_ok": pronote.configured(),
                    "pronote_ents": pronote.ent_choices(),
                    "autostart_supported": brief_module.autostart_supported(),
                    "autostart": brief_module.autostart_enabled(),
                    "personnalites": personalities,
                    "cerveaux": config.CERVEAUX,
                    "cerveau_actuel": MODEL,
                })
            elif self.path == "/api/script":
                self._json({"code": brief_module.google_script()})
            elif self.path == "/api/events":
                events = []
                while not EVENTS.empty():
                    events.append(EVENTS.get_nowait())
                self._json({"events": events})
            else:
                self._send(404, b"", "text/plain")

        def do_POST(self) -> None:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b""

            if self.path == "/api/bye":
                # La fenêtre a été fermée : on s'arrête, sauf si elle revient (simple rechargement).
                cancel_shutdown()
                state["shutdown_timer"] = threading.Timer(3, server.shutdown)
                state["shutdown_timer"].start()
                self._send(204, b"", "text/plain")
                return

            cancel_shutdown()
            if self.path == "/api/settings":
                changes = json.loads(raw or b"{}")
                changes.pop("mail_mdp_secours", None)
                changes.pop("elevenlabs_cle_secours", None)
                changes.pop("pronote_mdp_secours", None)
                changes.pop("pronote_jeton_secours", None)
                before = config.load()
                after = config.save(changes)
                with lock:
                    if before["personnalite"] != after["personnalite"]:
                        brain.reset()  # nouvelle personnalité : on repart d'une conversation neuve
                    else:
                        brain.refresh_profile()
                self._json({"settings": after})
                return

            if self.path == "/api/tts":
                # Voix ElevenLabs : renvoie le MP3 de la phrase, ou une erreur que la page affichera.
                text = json.loads(raw or b"{}").get("text", "").strip()
                try:
                    self._send(200, elevenlabs.synthesize(text), "audio/mpeg")
                except RuntimeError as e:
                    self._json({"erreur": str(e)}, code=502)
                return

            if self.path == "/api/elevenlabs":
                data = json.loads(raw or b"{}")
                if data.get("cle", "").strip():
                    config.set_secret("elevenlabs_cle", data["cle"].strip())
                config.save({
                    "elevenlabs_voix_id": data.get("voix_id", "").strip(),
                    "voix_moteur": "elevenlabs" if data.get("actif") else "navigateur",
                })
                if not data.get("actif"):
                    self._json({"ok": True, "message": "Jarvis reprend sa voix normale."})
                    return
                try:
                    elevenlabs.synthesize("Test.")
                    self._json({"ok": True, "message": "Voix ElevenLabs activée !"})
                except RuntimeError as e:
                    config.save({"voix_moteur": "navigateur"})
                    self._json({"ok": False, "message": str(e)})
                return

            if self.path == "/api/pronote_qr":
                data = json.loads(raw or b"{}")
                try:
                    qr = json.loads(data.get("qr", ""))
                    assert {"login", "jeton", "url"} <= set(qr)
                except (ValueError, TypeError, AssertionError):
                    self._json({"ok": False, "message": "Ce QR code n'est pas un QR code de connexion Pronote."})
                    return
                ok, message = pronote.qr_login(qr, data.get("pin", ""))
                self._json({"ok": ok, "message": message})
                return

            if self.path == "/api/pronote":
                data = json.loads(raw or b"{}")
                config.save({k: data.get(k, "").strip() for k in ("pronote_url", "pronote_identifiant", "pronote_ent") if k in data})
                if data.get("mot_de_passe"):
                    config.set_secret("pronote_mdp", data["mot_de_passe"])
                ok, message = pronote.test()
                self._json({"ok": ok, "message": message})
                return

            if self.path == "/api/media":
                action = json.loads(raw or b"{}").get("action", "")
                if action == "ouvrir":
                    from .tools import ouvrir_application

                    ouvrir_application("spotify")
                elif action in ("lecture_pause", "suivant", "precedent"):
                    powers.controle_musique(action)
                time.sleep(0.6)  # le temps que Spotify change de morceau
                self._json(musique.now_playing())
                return

            if self.path == "/api/brief":
                self._stream_answer("", collect_brief=True)
                return

            if self.path == "/api/autostart":
                ok, message = brief_module.set_autostart(bool(json.loads(raw or b"{}").get("on")))
                self._json({"ok": ok, "message": message, "enabled": brief_module.autostart_enabled()})
                return

            if self.path == "/api/mail":
                data = json.loads(raw or b"{}")
                keys = ("mail_service", "mail_adresse", "mail_serveur", "mail_script_url")
                config.save({k: data.get(k, "").strip() for k in keys if k in data})
                if data.get("mail_service") == "gmail_script":
                    ok, message = brief_module.test_mail()
                    self._json({"ok": ok, "message": message})
                    return
                if data.get("mot_de_passe"):
                    brief_module.save_mail_password(data["mail_adresse"].strip(), data["mot_de_passe"].replace(" ", ""))
                if not data.get("mail_adresse"):
                    self._json({"ok": False, "message": "Indique ton adresse mail."})
                    return
                ok, message = brief_module.test_mail()
                self._json({"ok": ok, "message": message})
                return

            if self.path == "/api/reset":
                with lock:
                    brain.reset()
                self._json({"ok": True})
                return

            if self.path != "/api/chat":
                self._send(404, b"", "text/plain")
                return

            text = json.loads(raw or b"{}").get("text", "").strip()
            command = systeme.quick_command(text)
            if command:
                self._stream_answer("", quick=command)
            else:
                self._stream_answer(text)

        def _stream_answer(self, text: str, collect_brief: bool = False, quick: str | None = None) -> None:
            # La réponse est envoyée morceau par morceau (une ligne JSON par morceau),
            # pour l'afficher et la lire à voix haute pendant qu'elle s'écrit.
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

            def emit(event: dict) -> None:
                self.wfile.write((json.dumps(event, ensure_ascii=False) + "\n").encode())
                self.wfile.flush()

            def finish() -> None:
                if systeme.STATE["quit"]:
                    # « Ferme-toi » : la page dit au revoir, ferme sa fenêtre, puis Jarvis s'arrête.
                    emit({"type": "action", "action": "quit"})
                    if state["shutdown_timer"]:
                        state["shutdown_timer"].cancel()
                    def stop() -> None:
                        try:
                            close_app_window()
                        finally:
                            server.shutdown()

                    state["shutdown_timer"] = threading.Timer(9, stop)
                    state["shutdown_timer"].start()
                emit({"type": "done"})

            try:
                if quick:
                    # Commande système reconnue directement (fermer Jarvis, éteindre le PC…)
                    tool = {"annuler": "annuler_extinction", "fermer_jarvis": "fermer_jarvis"}.get(quick, "eteindre_ordinateur")
                    emit({"type": "tool", "name": tool, "args": {}})
                    emit({"type": "text", "text": systeme.run_quick(quick)})
                    text = ""
                if collect_brief:
                    emit({"type": "tool", "name": "brief_du_jour", "args": {}})
                    text = brief_module.BRIEF_PROMPT + brief_module.brief_du_jour()
                if not text:
                    finish()
                    return
                with lock:
                    for event in brain.ask_stream(text):
                        if event[0] == "text":
                            emit({"type": "text", "text": event[1]})
                        else:
                            emit({"type": "tool", "name": event[1], "args": event[2]})
            except (BrokenPipeError, ConnectionResetError):
                return  # la fenêtre a été fermée pendant la réponse
            except (ConnectionError, httpx.ConnectError):
                emit({"type": "error", "text": "Je n'arrive pas à joindre Ollama. Vérifie que l'application Ollama est lancée."})
            except ollama.ResponseError as e:
                emit({"type": "error", "text": f"Mon cerveau a rencontré une erreur : {e.error}"})
            finish()

    port = _free_port()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/" + ("?brief=1" if with_brief else "")

    print(f"\n✅ Jarvis est prêt : sa fenêtre va s'ouvrir ({url})")
    print("   Tu peux réduire cette fenêtre noire, mais ne la ferme pas.")
    print("   Pour quitter, ferme simplement la fenêtre de Jarvis.\n")
    open_window(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
