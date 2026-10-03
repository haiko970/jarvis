"""Le cerveau de Jarvis : la conversation avec Claude et la boucle d'outils."""

import os

import anthropic

from .tools import TOOLS, run_tool

MODEL = os.environ.get("JARVIS_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("JARVIS_EFFORT", "low")  # low = réponses rapides, idéal pour discuter

SYSTEM_PROMPT = """Tu es Jarvis, l'assistant personnel de l'utilisateur, inspiré du majordome IA d'Iron Man.
Tu parles français, avec un ton poli, efficace et une pointe d'humour britannique.
Tu tournes sur l'ordinateur de l'utilisateur et tu peux agir dessus grâce à tes outils
(ouvrir des sites et des applications, gérer des notes, consulter l'heure et le système)
ainsi que chercher sur le web.
Tes réponses peuvent être lues à voix haute : sois concis (2 à 4 phrases en général),
évite le Markdown, les listes à puces et les émojis sauf si on te demande un texte détaillé."""

SERVER_TOOLS = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 3}]


class Brain:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic()
        self.messages: list[dict] = []

    def reset(self) -> None:
        self.messages = []

    def ask(self, text: str, on_tool=None) -> str:
        """Envoie un message à Claude, exécute les outils demandés et renvoie la réponse finale."""
        self.messages.append({"role": "user", "content": text})

        for _ in range(10):  # garde-fou contre les boucles infinies
            response = self.client.beta.messages.create(
                model=MODEL,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                tools=TOOLS + SERVER_TOOLS,
                messages=self.messages,
                output_config={"effort": EFFORT},
                cache_control={"type": "ephemeral"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
            # On garde le contenu complet (blocs de réflexion compris) : l'historique doit rester intact.
            self.messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "refusal":
                return "Désolé, je ne peux pas répondre à cette demande."

            if response.stop_reason == "pause_turn":
                continue  # recherche web longue : on relance pour que Claude termine

            if response.stop_reason != "tool_use":
                return _text_of(response) or "(pas de réponse)"

            results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                if on_tool:
                    on_tool(block.name, block.input)
                output, is_error = run_tool(block.name, dict(block.input))
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                        "is_error": is_error,
                    }
                )
            self.messages.append({"role": "user", "content": results})

        return "Je me suis un peu perdu dans mes actions, peux-tu reformuler ?"


def _text_of(response) -> str:
    return "".join(b.text for b in response.content if b.type == "text").strip()
