"""Le cerveau de Jarvis : une IA gratuite qui tourne sur ton PC grâce à Ollama."""

import datetime
import os

import ollama

from .tools import TOOLS, run_tool

# qwen3:8b : bon en français, sait utiliser des outils, tourne bien avec 16 Go de RAM.
MODEL = os.environ.get("JARVIS_MODEL", "qwen3:8b")
# JARVIS_CPU=1 : ne pas utiliser la carte graphique (utile si son pilote est trop ancien)
FORCE_CPU = os.environ.get("JARVIS_CPU", "").strip() in ("1", "oui", "true")

GPU_CRASH_HINT = """
⚠️  La carte graphique a planté (pilote probablement trop ancien) : Jarvis passe sur le processeur.
    Il marche, mais plus lentement. Pour retrouver la vitesse, mets à jour le pilote de ta carte
    graphique (https://www.nvidia.com/fr-fr/drivers/), puis redémarre ton PC.
"""

SYSTEM_PROMPT = """Tu es Jarvis, l'assistant personnel de l'utilisateur, inspiré du majordome IA d'Iron Man.
Tu parles toujours français, avec un ton poli, efficace et une pointe d'humour britannique.
Tu tournes sur l'ordinateur de l'utilisateur et tu peux agir dessus grâce à tes outils
(ouvrir des sites et des applications, gérer des notes, consulter l'heure, la météo et le système,
chercher sur internet). Utilise un outil dès qu'il est utile plutôt que d'inventer une réponse,
en particulier pour l'heure, la date, la météo et l'actualité.
Tes réponses peuvent être lues à voix haute : sois concis (2 à 4 phrases en général),
évite le Markdown, les listes à puces et les émojis sauf si on te demande un texte détaillé."""

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
        self.options = {"num_gpu": 0} if FORCE_CPU else None
        self.reset()

    def reset(self) -> None:
        today = datetime.date.today().strftime("%d/%m/%Y")
        self.messages: list = [
            {"role": "system", "content": f"{SYSTEM_PROMPT}\nNous sommes le {today}."}
        ]

    def ensure_model(self, on_progress=None) -> None:
        """Vérifie qu'Ollama tourne et télécharge le modèle s'il n'est pas encore là."""
        installed = {m.model for m in self.client.list().models}
        if MODEL in installed or f"{MODEL}:latest" in installed:
            return
        for progress in self.client.pull(MODEL, stream=True):
            if on_progress:
                on_progress(progress)

    def _chat(self):
        try:
            return self.client.chat(
                model=MODEL,
                messages=self.messages,
                tools=OLLAMA_TOOLS,
                think=self.think,
                options=self.options,
            )
        except ollama.ResponseError as e:
            error = str(e).lower()
            # Certains modèles ne connaissent pas l'option « think » : on réessaie sans.
            if self.think is not None and "think" in error:
                self.think = None
                return self._chat()
            # La carte graphique plante (souvent un pilote trop ancien) : on passe sur le processeur.
            if self.options is None and ("cuda" in error or "llama-server process has terminated" in error):
                print(GPU_CRASH_HINT)
                self.options = {"num_gpu": 0}
                return self._chat()
            raise

    def ask(self, text: str, on_tool=None) -> str:
        """Envoie un message à l'IA, exécute les outils demandés et renvoie la réponse finale."""
        self.messages.append({"role": "user", "content": text})

        for _ in range(8):  # garde-fou contre les boucles infinies
            message = self._chat().message
            self.messages.append(message)

            if not message.tool_calls:
                return (message.content or "").strip() or "(pas de réponse)"

            for call in message.tool_calls:
                name, args = call.function.name, dict(call.function.arguments or {})
                if on_tool:
                    on_tool(name, args)
                output, _ = run_tool(name, args)
                self.messages.append({"role": "tool", "content": output, "tool_name": name})

        return "Je me suis un peu perdu dans mes actions, peux-tu reformuler ?"
