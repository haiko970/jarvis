"""Le cerveau de Jarvis : une IA gratuite qui tourne sur ton PC grâce à Ollama."""

import datetime
import os
import threading

import ollama

from . import config
from .tools import TOOLS, run_tool

# Le cerveau se choisit dans les réglages (qwen3:8b par défaut) ; JARVIS_MODEL dans .env a priorité.
MODEL = os.environ.get("JARVIS_MODEL") or config.load()["cerveau"]
KEEP_ALIVE = "4h"  # garde le cerveau en mémoire : pas de long rechargement entre deux questions
MAX_MESSAGES = 40  # au-delà, on oublie le début de la conversation (moins de texte à relire = plus rapide)
# JARVIS_CPU=1 : ne pas utiliser la carte graphique (utile si son pilote est trop ancien)
FORCE_CPU = os.environ.get("JARVIS_CPU", "").strip() in ("1", "oui", "true")

GPU_CRASH_HINT = """
⚠️  La carte graphique a planté (pilote probablement trop ancien) : Jarvis passe sur le processeur.
    Il marche, mais plus lentement. Pour retrouver la vitesse, mets à jour le pilote de ta carte
    graphique (https://www.nvidia.com/fr-fr/drivers/), puis redémarre ton PC.
    (Jarvis s'en souviendra : il utilisera directement le processeur aux prochains démarrages.)
"""

SYSTEM_PROMPT = """Tu es Jarvis, l'assistant personnel de l'utilisateur, inspiré de l'IA d'Iron Man.
Tu parles toujours français.
Tu tournes sur l'ordinateur de l'utilisateur et tu peux agir dessus grâce à tes outils
(ouvrir des sites et des applications, gérer des notes, consulter l'heure, la météo et le système,
chercher sur internet, régler le volume, contrôler la musique et Spotify, programmer des minuteurs
et des rappels). Utilise un outil dès qu'il est utile plutôt que d'inventer une réponse,
en particulier pour l'heure, la date, la météo et l'actualité.
Tes réponses peuvent être lues à voix haute : sois concis (2 à 4 phrases en général),
évite le Markdown, les listes à puces et les émojis sauf si on te demande un texte détaillé."""


def build_system_prompt() -> str:
    settings = config.load()
    style = config.PERSONNALITES.get(settings["personnalite"], config.PERSONNALITES["majordome"])[1]
    parts = [SYSTEM_PROMPT, f"Ta personnalité : {style}"]
    profile = []
    if settings["prenom"]:
        profile.append(f"- Prénom : {settings['prenom']} (utilise-le de temps en temps)")
    if settings["ville"]:
        profile.append(f"- Ville : {settings['ville']} (ville par défaut pour la météo et les questions locales)")
    if settings["a_propos"].strip():
        profile.append(f"- Présentation écrite par l'utilisateur : {settings['a_propos'].strip()}")
    profile += [f"- {s}" for s in settings["souvenirs"]]
    if profile:
        parts.append("Ce que tu sais sur l'utilisateur :\n" + "\n".join(profile))
    parts.append(
        "Sers-toi de ces informations sans redemander ce que tu sais déjà. "
        "Quand l'utilisateur te confie une info personnelle durable, retiens-la avec retenir_info ; "
        "quand l'utilisateur mentionne sa ville, enregistre-la avec definir_ville."
    )
    parts.append(f"Nous sommes le {datetime.date.today().strftime('%d/%m/%Y')}.")
    return "\n\n".join(parts)

# Format attendu par Ollama pour décrire les outils
OLLAMA_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["input_schema"],
        },
    }
    for t in TOOLS
]


class Brain:
    def __init__(self) -> None:
        self.client = ollama.Client()
        self.think = False  # pas de « réflexion » à voix basse : réponses plus rapides
        self.cpu_only = FORCE_CPU or config.load()["processeur_seulement"]
        self.lock = threading.RLock()  # une seule réflexion à la fois
        self.reset()

    def reset(self) -> None:
        self.messages: list = [{"role": "system", "content": build_system_prompt()}]

    def refresh_profile(self) -> None:
        """Met à jour les infos sur l'utilisateur sans effacer la conversation."""
        self.messages[0] = {"role": "system", "content": build_system_prompt()}

    def ensure_model(self, on_progress=None) -> None:
        """Vérifie qu'Ollama tourne et télécharge le modèle s'il n'est pas encore là."""
        installed = {m.model for m in self.client.list().models}
        if MODEL in installed or f"{MODEL}:latest" in installed:
            return
        for progress in self.client.pull(MODEL, stream=True):
            if on_progress:
                on_progress(progress)

    def warm_up(self) -> None:
        """Charge le cerveau et lui fait lire ses instructions à l'avance (à lancer en arrière-plan)."""
        with self.lock:
            try:
                messages = self.messages + [{"role": "user", "content": "Bonjour"}]
                for _ in self._stream(messages, {"num_predict": 1}):
                    pass
            except Exception:
                pass  # pas grave : ce n'était qu'un échauffement

    def _recover(self, error: ollama.ResponseError) -> bool:
        """Essaie de corriger une erreur connue. Renvoie True s'il faut réessayer."""
        text = str(error).lower()
        # Certains modèles ne connaissent pas l'option « think » : on réessaie sans.
        if self.think is not None and "think" in text:
            self.think = None
            return True
        # La carte graphique plante (souvent un pilote trop ancien) : on passe sur le processeur.
        if not self.cpu_only and ("cuda" in text or "llama-server process has terminated" in text):
            print(GPU_CRASH_HINT)
            self.cpu_only = True
            config.save({"processeur_seulement": True})
            return True
        return False

    def _stream(self, messages: list, extra_options: dict | None = None):
        """Envoie la conversation au cerveau et renvoie sa réponse morceau par morceau."""
        for _ in range(3):
            options = {"num_gpu": 0} if self.cpu_only else {}
            options.update(extra_options or {})
            started = False
            try:
                for chunk in self.client.chat(
                    model=MODEL,
                    messages=messages,
                    tools=OLLAMA_TOOLS,
                    think=self.think,
                    options=options or None,
                    keep_alive=KEEP_ALIVE,
                    stream=True,
                ):
                    started = True
                    yield chunk
                return
            except ollama.ResponseError as e:
                if started or not self._recover(e):
                    raise

    def _trim(self) -> None:
        # On coupe par gros morceaux (et pas à chaque message) pour que le cerveau garde
        # en cache le début de la conversation, ce qui lui évite de tout relire.
        if len(self.messages) <= MAX_MESSAGES:
            return
        rest = self.messages[-(MAX_MESSAGES // 2):]
        while rest and rest[0]["role"] != "user":
            rest.pop(0)
        self.messages = [self.messages[0]] + rest

    def ask_stream(self, text: str):
        """Pose une question. Renvoie au fur et à mesure ("text", morceau) et ("tool", nom, arguments)."""
        with self.lock:
            self.messages.append({"role": "user", "content": text})
            self._trim()
            said_something = False

            for _ in range(8):  # garde-fou contre les boucles infinies
                content, calls = "", []
                for chunk in self._stream(self.messages):
                    message = chunk.message
                    if message.content:
                        if not content and said_something:
                            yield ("text", " ")
                        content += message.content
                        yield ("text", message.content)
                    if message.tool_calls:
                        calls.extend(message.tool_calls)
                said_something = said_something or bool(content.strip())
                self.messages.append({"role": "assistant", "content": content, "tool_calls": calls or None})

                if not calls:
                    if not said_something:
                        yield ("text", "(pas de réponse)")
                    return

                for call in calls:
                    name, args = call.function.name, dict(call.function.arguments or {})
                    yield ("tool", name, args)
                    output, _ = run_tool(name, args)
                    if name in ("definir_ville", "retenir_info", "oublier_info"):
                        self.refresh_profile()
                    self.messages.append({"role": "tool", "content": output, "tool_name": name})

            yield ("text", "Je me suis un peu perdu dans mes actions, peux-tu reformuler ?")

    def ask(self, text: str, on_tool=None) -> str:
        """Comme ask_stream, mais renvoie la réponse complète d'un coup."""
        reply = ""
        for event in self.ask_stream(text):
            if event[0] == "text":
                reply += event[1]
            elif on_tool:
                on_tool(event[1], event[2])
        return reply.strip()
