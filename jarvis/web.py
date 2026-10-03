"""Interface graphique de Jarvis : un petit serveur local + une page web ouverte dans sa propre fenêtre."""

import json
import os
import platform
import shutil
import socket
import subprocess
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import ollama

from .brain import MODEL, Brain

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


def open_window(url: str) -> None:
    edge = _find_edge()
    if edge:
        subprocess.Popen([edge, f"--app={url}", "--window-size=520,820"])
    else:
        webbrowser.open(url)


def serve(brain: Brain) -> None:
    lock = threading.Lock()  # une seule question à la fois pour le cerveau
    state = {"shutdown_timer": None}

    def cancel_shutdown() -> None:
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
            if self.path in ("/", "/index.html"):
                self._send(200, PAGE.read_bytes(), "text/html; charset=utf-8")
            elif self.path == "/api/info":
                self._json({"model": MODEL})
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
            if self.path == "/api/reset":
                with lock:
                    brain.reset()
                self._json({"ok": True})
                return

            if self.path != "/api/chat":
                self._send(404, b"", "text/plain")
                return

            text = json.loads(raw or b"{}").get("text", "").strip()
            if not text:
                self._json({"reply": "", "tools": []})
                return

            tools: list[dict] = []
            try:
                with lock:
                    reply = brain.ask(text, on_tool=lambda n, a: tools.append({"name": n, "args": a}))
            except (ConnectionError, httpx.ConnectError):
                reply = "Je n'arrive pas à joindre Ollama. Vérifie que l'application Ollama est lancée."
            except ollama.ResponseError as e:
                reply = f"Mon cerveau a rencontré une erreur : {e.error}"
            self._json({"reply": reply, "tools": tools})

    port = _free_port()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"

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
