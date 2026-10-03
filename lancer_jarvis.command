#!/bin/bash
# macOS / Linux : double-clique (ou lance ./lancer_jarvis.command) pour installer et lancer Jarvis.
# Pour le mode vocal : ./lancer_jarvis.command voix
cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERREUR] Python n'est pas installé. Installe-le depuis https://www.python.org/downloads/"
  read -r -p "Appuie sur Entrée pour fermer..."
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "=== Première installation de Jarvis, patiente une ou deux minutes... ==="
  python3 -m venv .venv && .venv/bin/python -m pip install --upgrade pip \
    && .venv/bin/python -m pip install -r requirements.txt || {
      echo "[ERREUR] L'installation a échoué."; read -r -p "Appuie sur Entrée..."; exit 1; }
fi

if [ "$1" = "voix" ] && ! .venv/bin/python -c "import speech_recognition, pyttsx3, pyaudio" 2>/dev/null; then
  echo "=== Installation du mode vocal... ==="
  .venv/bin/python -m pip install -r requirements-voix.txt
fi

while [ ! -f .env ]; do
  echo "Colle ta clé API Anthropic (elle commence par sk-ant-) puis appuie sur Entrée :"
  read -r CLE
  [ -n "$CLE" ] && echo "ANTHROPIC_API_KEY=$CLE" > .env && echo "Clé enregistrée."
done

if [ "$1" = "voix" ]; then
  .venv/bin/python -m jarvis --voix
else
  .venv/bin/python -m jarvis
fi
read -r -p "Appuie sur Entrée pour fermer..."
