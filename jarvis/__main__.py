"""Point d'entrée : python -m jarvis [--terminal | --voix]"""

import argparse
import sys
import threading

import httpx
import ollama
from dotenv import load_dotenv

from .brain import MODEL, Brain
from .powers import EVENTS

WAKE_WORD = "jarvis"
QUIT_WORDS = {"quitter", "exit", "quit", "au revoir", "bonne nuit"}


OLLAMA_MISSING = """
❌ Je n'arrive pas à joindre Ollama.
   1. Vérifie qu'Ollama est installé : https://ollama.com/download
   2. Lance l'application Ollama (une petite icône de lama apparaît près de l'horloge).
   3. Relance Jarvis.
"""


def show_download(progress) -> None:
    if progress.total and progress.completed:
        pct = progress.completed * 100 // progress.total
        size = progress.total / 1e9
        print(f"\r📥 Téléchargement du cerveau de Jarvis ({size:.1f} Go) : {pct:3d} %", end="", flush=True)
    elif progress.status == "success":
        print("\n✅ Cerveau téléchargé !")
    elif progress.status:
        print(f"\r📥 {progress.status:<60}", end="", flush=True)


def show_tool(name: str, args: dict) -> None:
    print(f"   ⚙️  {name} {args if args else ''}")


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Jarvis, ton assistant personnel")
    parser.add_argument("--terminal", action="store_true", help="discuter dans le terminal, sans interface")
    parser.add_argument("--voix", action="store_true", help="parler à Jarvis au micro, dans le terminal")
    parser.add_argument(
        "--mot-cle",
        action="store_true",
        help="en mode voix, ne répondre que si la phrase contient « Jarvis »",
    )
    args = parser.parse_args()

    brain = Brain()
    try:
        brain.ensure_model(on_progress=show_download)
    except (ConnectionError, httpx.ConnectError):
        print(OLLAMA_MISSING)
        sys.exit(1)
    except ollama.ResponseError as e:
        print(f"\n❌ Impossible de télécharger le modèle {MODEL} : {e.error}")
        sys.exit(1)

    # Pendant que la fenêtre s'ouvre, le cerveau se réveille et lit ses instructions.
    threading.Thread(target=brain.warm_up, daemon=True).start()

    if not (args.terminal or args.voix):
        from .web import serve

        serve(brain)
        return

    def print_events() -> None:  # les rappels qui sonnent pendant qu'on discute
        while True:
            print(f"\n🤖 Jarvis : {EVENTS.get()}\n")

    threading.Thread(target=print_events, daemon=True).start()

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
        except (ConnectionError, httpx.ConnectError):
            print(OLLAMA_MISSING)
            continue
        except ollama.ResponseError as e:
            reply = f"Mon cerveau a rencontré une erreur : {e.error}"

        print(f"🤖 Jarvis : {reply}\n")
        if voice:
            voice.say(reply)

    goodbye = "À bientôt."
    print(f"🤖 Jarvis : {goodbye}")
    if voice:
        voice.say(goodbye)


if __name__ == "__main__":
    main()
