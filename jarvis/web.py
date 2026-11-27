"""Interface graphique de Jarvis : un petit serveur local + une page web ouverte dans sa propre fenêtre."""

import datetime
import json
import os
import platform
import re
import shutil
import socket
import subprocess
import threading
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import ollama

from . import brief as brief_module
from . import config, dashboard, elevenlabs, maj, musique, powers, pronote, sentinelle, systeme, theme
from . import discret as discret_module
from . import ciel, connaissances, foot, godseye, modules, oeil, ruview, sporteasy
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


def _jarvis_window_front() -> bool:
    """Remet la fenêtre de Jarvis devant si elle est déjà ouverte. Renvoie False s'il n'y en a pas."""
    if platform.system() != "Windows":
        return False
    import ctypes

    windows = sentinelle._jarvis_windows()
    for hwnd in windows:
        ctypes.windll.user32.ShowWindow(hwnd, 9)  # restaurer si réduite
        ctypes.windll.user32.SetForegroundWindow(hwnd)
    return bool(windows)


def serve(brain: Brain, with_brief: bool = False, discret: bool = False) -> None:
    lock = threading.Lock()  # une seule question à la fois pour le cerveau
    # last_page : dernière fois que la fenêtre a donné signe de vie (pour savoir si elle est ouverte)
    state = {"shutdown_timer": None, "last_page": 0.0, "warm": not discret}

    def wake_brain() -> None:
        """En mode discret, le cerveau ne se charge qu'à la première ouverture (le PC démarre plus vite)."""
        if not state["warm"]:
            state["warm"] = True
            threading.Thread(target=brain.warm_up, daemon=True).start()

    def page_open() -> bool:
        return time.time() - state["last_page"] < 8

    def show_window(brief: bool | None = None) -> None:
        """Ouvre la fenêtre de Jarvis (ou la remet devant). Le brief n'est fait qu'une fois par jour."""
        wake_brain()
        if page_open() and _jarvis_window_front():
            return
        if brief is None:
            brief = config.load()["dernier_brief"] != datetime.date.today().isoformat()
        open_window(url_base + ("?brief=1" if brief else ""))

    def quit_jarvis() -> None:
        systeme.STATE["quit"] = True
        schedule_stop(0.5)

    def notify_loop() -> None:
        """Fenêtre fermée : les rappels et annonces arrivent en notification Windows."""
        while True:
            time.sleep(3)
            if not page_open() and not EVENTS.empty() and discret_module.notify(EVENTS.queue[0]):
                EVENTS.get_nowait()

    def schedule_stop(delay: float) -> None:
        """Ferme la fenêtre de Jarvis puis arrête le serveur après `delay` secondes."""
        if state["shutdown_timer"]:
            state["shutdown_timer"].cancel()

        def stop() -> None:
            try:
                close_app_window()
            finally:
                server.shutdown()

        state["shutdown_timer"] = threading.Timer(delay, stop)
        state["shutdown_timer"].start()

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

        def _oeil(self) -> None:
            """L'œil de Jarvis : avions, bateaux, satellites, séismes et caméras en direct."""
            url = urllib.parse.urlparse(self.path)
            q = {k: v[0] for k, v in urllib.parse.parse_qs(url.query).items()}
            quoi = url.path.rsplit("/", 1)[-1]
            try:
                lat, lon = float(q.get("lat", 0)), float(q.get("lon", 0))
                if quoi == "avions":
                    lat, lon = max(-85, min(85, lat)), ((lon + 540) % 360) - 180
                    self._json(oeil.avions_large(lat, lon) if q.get("large") else oeil.avions(lat, lon))
                elif quoi == "militaires":
                    self._json(oeil.avions_militaires())
                elif quoi == "bateaux":
                    self._json(oeil.bateaux(lat, lon))
                elif quoi == "satellites":
                    self._json(oeil.satellites(q.get("groupe", "principaux")))
                elif quoi == "seismes":
                    self._json(oeil.seismes())
                elif quoi == "cameras":
                    self._json(oeil.cameras(lat, lon) if "lat" in q else oeil.cameras())
                else:
                    self._send(404, b"", "text/plain")
            except Exception as e:  # service injoignable : la page affiche le message
                self._json({"erreur": "service injoignable pour le moment" + (f" ({e})" if str(e) else "")}, code=502)

        def do_GET(self) -> None:
            cancel_shutdown()
            if self.path != "/api/info":  # /api/info sert seulement à voir si Jarvis tourne déjà
                state["last_page"] = time.time()
                wake_brain()
            if self.path.split("?")[0] in ("/", "/index.html"):
                self._send(200, PAGE.read_bytes(), "text/html; charset=utf-8")
            elif self.path == "/jsQR.js":
                self._send(200, (PAGE.parent / "jsQR.js").read_bytes(), "text/javascript; charset=utf-8")
            elif re.fullmatch(r"/(lib|js)/[\w.-]+\.(js|json)", self.path) and (PAGE.parent / self.path.lstrip("/")).is_file():
                # Les scripts de la page (static/js) et les bibliothèques de la carte de la Terre (static/lib)
                kind = "text/javascript" if self.path.endswith(".js") else "application/json"
                self._send(200, (PAGE.parent / self.path.lstrip("/")).read_bytes(), kind + "; charset=utf-8")
            elif self.path == "/api/connaissances":
                self._json(connaissances.load())
            elif self.path == "/api/terre":
                self._json(ciel.earth_data())
            elif self.path.startswith("/api/oeil/"):
                self._oeil()
            elif self.path.startswith("/api/dashboard"):
                self._json(dashboard.collect(force="force=1" in self.path))
            elif self.path == "/api/media":
                self._json(musique.now_playing())
            elif self.path.startswith("/api/update"):
                self._json(maj.check(force="force=1" in self.path))
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
                settings.pop("sentinelle_code_secours", None)
                settings.pop("sporteasy_ics_secours", None)
                settings.pop("aisstream_cle_secours", None)
                settings.pop("windy_cle_secours", None)
                self._json({
                    "settings": settings,
                    "mail_services": {k: v[0] for k, v in brief_module.MAIL_SERVICES.items()},
                    "mail_ok": brief_module.mail_configured(),
                    "elevenlabs_ok": bool(config.get_secret("elevenlabs_cle")),
                    "pronote_ok": pronote.configured(),
                    "sporteasy_ok": sporteasy.configured(),
                    "oeil_cles": oeil.cles_ok(),
                    "pronote_ents": pronote.ent_choices(),
                    "autostart_supported": brief_module.autostart_supported(),
                    "autostart": brief_module.autostart_enabled(),
                    "personnalites": personalities,
                    "cerveaux": config.CERVEAUX,
                    "cerveau_actuel": MODEL,
                })
            elif self.path == "/api/script":
                self._json({"code": brief_module.google_script()})
            elif self.path == "/api/sentinelle":
                self._json(sentinelle.status())
            elif self.path.startswith("/api/sentinelle/photo?n="):
                photo = sentinelle.photo_path(self.path.split("=", 1)[1])
                if photo:
                    self._send(200, photo.read_bytes(), "image/jpeg")
                else:
                    self._send(404, b"", "text/plain")
            elif self.path == "/api/sentinelle/rapport":
                self._json({"rapport": [i for i in sentinelle._load_report() if not i.get("vu")]})
            elif self.path == "/api/foot":
                try:
                    self._json({"ok": True, "data": foot.team_data() if config.load()["equipe"] else None})
                except Exception as e:
                    self._json({"ok": False, "erreur": str(e)})
            elif self.path == "/api/ruview":
                self._json(ruview.etat())
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
                sentinelle.page_closed()  # fermée pendant la surveillance : le PC se verrouille
                state["last_page"] = 0.0
                if discret and not systeme.STATE["quit"]:
                    # Mode discret : Jarvis reste en arrière-plan, prêt à revenir (Ctrl + Alt + J)
                    self._send(204, b"", "text/plain")
                    return
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
                changes.pop("sentinelle_code_secours", None)
                changes.pop("sporteasy_ics_secours", None)
                changes.pop("aisstream_cle_secours", None)
                changes.pop("windy_cle_secours", None)
                before = config.load()
                if "equipe" in changes and changes["equipe"].strip() != before["equipe"]:
                    # Nouvelle équipe : on la cherchera de nouveau sur ESPN
                    changes.update(equipe=changes["equipe"].strip(), equipe_id="", equipe_ligue="", equipe_nom="", equipe_logo="")
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

            if self.path == "/api/update":
                ok, message = maj.install()
                if ok:  # on redémarre sur la nouvelle version
                    systeme.STATE["quit"] = True
                    systeme.STATE["restart"] = True
                    schedule_stop(4)
                self._json({"ok": ok, "message": message})
                return

            if self.path == "/api/ouvrir":
                # Un deuxième lancement de Jarvis (raccourci du Bureau…) : on ouvre la fenêtre de celui-ci
                threading.Thread(target=show_window, daemon=True).start()
                self._json({"ok": True})
                return

            if self.path == "/api/brief":
                config.save({"dernier_brief": datetime.date.today().isoformat()})
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

            if self.path == "/api/connaissances":
                data = json.loads(raw or b"{}")
                if data.get("action") == "oublier_lien":
                    connaissances.forget_link(str(data.get("de")), str(data.get("rel")), str(data.get("vers")))
                elif data.get("action") == "oublier_noeud":
                    connaissances.forget(connaissances.load()["noeuds"].get(str(data.get("id")), {}).get("nom", ""))
                elif data.get("action") == "ajouter":
                    connaissances.add(str(data.get("de", "")), str(data.get("rel", "")), str(data.get("vers", "")), source="manuel")
                self._json(connaissances.load())
                return

            if self.path == "/api/sporteasy":
                lien = str(json.loads(raw or b"{}").get("lien", "")).strip()
                if lien and not re.match(r"^(https?|webcal)://", lien):
                    self._json({"ok": False, "message": "Ce n'est pas un lien : copie le lien qui commence par « webcal:// » ou « https:// »."})
                    return
                config.set_secret("sporteasy_ics", lien)
                dashboard._cache["data"] = None
                if not lien:
                    self._json({"ok": True, "message": "SportEasy est déconnecté."})
                    return
                try:
                    items = sporteasy.events(30)
                    nxt = next((e for e in items if not e["annule"]), None)
                    message = f"Connexion réussie : {len(items)} événement(s) dans les 30 prochains jours."
                    if nxt:
                        message += f" Prochain : {sporteasy.describe(nxt)}."
                    self._json({"ok": True, "message": message})
                except Exception as e:
                    self._json({"ok": False, "message": f"Impossible de lire l'agenda SportEasy : {e}"})
                return

            if self.path == "/api/oeil/cles":
                data = json.loads(raw or b"{}")
                for nom in ("aisstream", "windy"):
                    if nom in data:
                        config.set_secret(f"{nom}_cle", str(data[nom]).strip())
                self._json({"ok": True, **oeil.cles_ok()})
                return

            if self.path == "/api/godseye":
                ok, message = godseye.ouvrir()
                self._json({"ok": ok, "message": message})
                return

            if self.path == "/api/ruview":
                action = json.loads(raw or b"{}").get("action")
                if action == "ecran":  # l'écran 3D de RuView, dans le navigateur
                    ok, message = ruview.demarrer()
                    if ok:
                        webbrowser.open(f"http://127.0.0.1:{ruview.PORT}/ui/index.html")
                elif action == "arreter":
                    ruview.arreter()
                    ok, message = True, "RuView est arrêté."
                else:  # « demarrer » ou « relancer » (après un changement de capteur)
                    if action == "relancer":
                        ruview.arreter()
                    ok, message = ruview.demarrer()
                self._json({"ok": ok, "message": message, **ruview.etat()})
                return

            if self.path == "/api/sentinelle":
                data = json.loads(raw or b"{}")
                action = data.get("action")
                if action == "activer":
                    ok, message = sentinelle.activer()
                    self._json({"ok": ok, "message": message})
                elif action == "annuler":
                    self._json({"ok": sentinelle.annuler_depart()})
                elif action == "code":
                    ok, message = sentinelle.set_code(str(data.get("code", "")))
                    self._json({"ok": ok, "message": message})
                elif action == "desarmer":
                    self._json(sentinelle.desarmer(str(data.get("code", ""))))
                elif action == "activite":
                    sentinelle.activite()
                    self._json({"ok": True})
                elif action == "photo":
                    self._json({"ok": bool(sentinelle.save_photo(data.get("image", "")))})
                elif action == "vu":
                    items = sentinelle._load_report()
                    for i in items:
                        i["vu"] = True
                    sentinelle._save_report(items)
                    self._json({"ok": True})
                else:
                    self._json({"ok": False}, 400)
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
            if not command and godseye.quick(text):  # « ouvre God's Eye », « le monde en direct »
                self._stream_answer("", quick="godseye")
                return
            module = None if command else modules.quick_module(text)
            if module:
                self._stream_answer("", quick="module:" + json.dumps(module, ensure_ascii=False))
                return
            vue = None if command else theme.quick_view(text)
            if vue:
                self._stream_answer("", quick="vue:" + vue)
                return
            couleur = None if command else theme.quick_theme(text)
            if not command and sentinelle.quick(text):
                self._stream_answer("", quick="sentinelle")
            elif couleur:
                self._stream_answer("", quick="theme:" + couleur)
            elif command:
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
                if systeme.STATE.get("theme"):  # « mets le thème Iron Man » : la page change de couleur
                    emit({"type": "action", "action": "theme", "theme": systeme.STATE["theme"]})
                    systeme.STATE["theme"] = None
                if systeme.STATE["quit"]:
                    # « Ferme-toi » : la page dit au revoir, ferme sa fenêtre, puis Jarvis s'arrête.
                    emit({"type": "action", "action": "quit"})
                    schedule_stop(9)
                emit({"type": "done"})

            try:
                if quick == "sentinelle":
                    emit({"type": "tool", "name": "activer_sentinelle", "args": {}})
                    emit({"type": "text", "text": sentinelle.activer_sentinelle()})
                    quick, text = None, ""
                if quick == "godseye":
                    emit({"type": "tool", "name": "ouvrir_gods_eye", "args": {}})
                    emit({"type": "text", "text": godseye.ouvrir()[1]})
                    quick, text = None, ""
                if quick and quick.startswith("module:"):
                    # « Ouvre la carte » : la page envoie le bras chercher le module
                    action = json.loads(quick[7:])
                    emit({"type": "action", "action": "module", "module": action["module"], "cible": action.get("cible")})
                    emit({"type": "text", "text": action["texte"]})
                    quick, text = None, ""
                if quick and quick.startswith("vue:"):
                    config.save({"vue": quick[4:], "vue_choisie": True})
                    emit({"type": "action", "action": "vue", "vue": quick[4:]})
                    emit({"type": "text", "text": {"orbe": "Voici l'orbe seule."}.get(quick[4:], "Voici l'orbe avec tes infos.")})
                    quick, text = None, ""
                if quick and quick.startswith("theme:"):
                    emit({"type": "tool", "name": "changer_theme", "args": {}})
                    emit({"type": "text", "text": theme.run_quick(quick[6:])})
                    quick, text = None, ""
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
                try:  # ce que Jarvis sait déjà des personnes et des choses citées
                    context = connaissances.context_for(text)
                except Exception:
                    context = None
                with lock:
                    for event in brain.ask_stream(text, context):
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
    url_base = f"http://127.0.0.1:{port}/"
    url = url_base + ("?brief=1" if with_brief else "")

    if discret:
        # Au démarrage du PC : pas de fenêtre, Jarvis attend près de l'horloge
        print(f"\n✅ Jarvis attend en arrière-plan ({url_base}). Ouvre-le avec {discret_module.RACCOURCI}.\n")
        discret_module.start_tray(show_window, lambda: show_window(brief=True), quit_jarvis)
        discret_module.start_hotkey(show_window)
        threading.Thread(target=notify_loop, daemon=True).start()
        threading.Timer(4, discret_module.notify, args=(
            f"Je suis prêt. Clique sur mon icône près de l'horloge, ou appuie sur {discret_module.RACCOURCI}.",
        )).start()
    else:
        print(f"\n✅ Jarvis est prêt : sa fenêtre va s'ouvrir ({url})")
        print("   Tu peux réduire cette fenêtre noire, mais ne la ferme pas.")
        print("   Pour quitter, ferme simplement la fenêtre de Jarvis.\n")
        open_window(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        discret_module.stop_tray()
        server.server_close()
