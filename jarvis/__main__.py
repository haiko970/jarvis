"""Point d'entrée : python -m jarvis [--voix]"""

import argparse
import os
import sys

import anthropic
from dotenv import load_dotenv

from .brain import Brain

WAKE_WORD = "jarvis"
QUIT_WORDS = {"quitter", "exit", "quit", "au revoir", "bonne nuit"}


def show_tool(name: str, args: dict) -> None:
    print(f"   ⚙️  {name} {args if args else ''}")


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Jarvis, ton assistant personnel")
    parser.add_argument("--voix", action="store_true", help="parler à Jarvis au micro")
    parser.add_argument(
        "--mot-cle",
        action="store_true",
        help="en mode voix, ne répondre que si la phrase contient « Jarvis »",
    )
    args = parser.parse_args()

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("❌ Clé API manquante. Copie .env.example en .env et mets-y ta clé ANTHROPIC_API_KEY.")
        sys.exit(1)

    brain = Brain()
    voice = None
    if args.voix:
        try:
            from .voice import Voice

            voice = Voice()
        except Exception as e:
            print(f"⚠️  Mode vocal indisponible ({e}). On passe en mode texte.")

    greeting = "Bonjour, je suis Jarvis. Que puis-je faire pour vous ?"
    print(f"\n🤖 Jarvis : {greeting}")
    print("   (tape « quitter » pour sortir, « oublie » pour effacer la conversation)\n")
    if voice:
        voice.say(greeting)

    while True:
        if voice:
            print("🎧 J'écoute…")
            text = voice.listen()
            if not text:
                continue
            print(f"🧑 Toi : {text}")
            if args.mot_cle:
                if WAKE_WORD not in text.lower():
                    continue
        else:
            try:
                text = input("🧑 Toi : ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if not text:
                continue

        lowered = text.lower().strip(" .!?")
        if lowered in QUIT_WORDS:
            break
        if lowered in {"oublie", "reset", "nouvelle conversation"}:
            brain.reset()
            print("🤖 Jarvis : Conversation effacée.\n")
            continue

        try:
            reply = brain.ask(text, on_tool=show_tool)
        except anthropic.AuthenticationError:
            print("❌ Clé API invalide. Vérifie ANTHROPIC_API_KEY dans ton fichier .env.")
            break
        except anthropic.RateLimitError:
            reply = "Je suis un peu débordé, réessaie dans quelques secondes."
        except anthropic.APIConnectionError:
            reply = "Je n'arrive pas à joindre mes serveurs. Vérifie ta connexion internet."
        except anthropic.APIStatusError as e:
            reply = f"Une erreur est survenue côté serveur ({e.status_code})."

        print(f"🤖 Jarvis : {reply}\n")
        if voice:
            voice.say(reply)

    goodbye = "À bientôt."
    print(f"🤖 Jarvis : {goodbye}")
    if voice:
        voice.say(goodbye)


if __name__ == "__main__":
    main()
