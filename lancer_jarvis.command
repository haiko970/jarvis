#!/bin/bash
# macOS / Linux : double-clique (ou lance ./lancer_jarvis.command) pour installer et lancer Jarvis.
# Pour le mode vocal : ./lancer_jarvis.command voix
cd "$(dirname "$0")" || exit 1

pause_exit() { read -r -p "Appuie sur Entrée pour fermer..."; exit 1; }

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERREUR] Python n'est pas installé. Installe-le depuis https://www.python.org/downloads/"
  pause_exit
fi
if ! command -v ollama >/dev/null 2>&1 && [ ! -d /Applications/Ollama.app ]; then
  echo "[ERREUR] Ollama n'est pas installé. Télécharge-le sur https://ollama.com/download"
  pause_exit
fi

if [ ! -x .venv/bin/python ]; then
  echo "=== Première installation de Jarvis, patiente une ou deux minutes... ==="
  python3 -m venv .venv && .venv/bin/python -m pip install --upgrade pip || pause_exit
fi
echo "Vérification des composants..."
.venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt || pause_exit

if [ "$1" = "voix" ] && ! .venv/bin/python -c "import speech_recognition, pyttsx3, pyaudio" 2>/dev/null; then
  echo "=== Installation du mode vocal... ==="
  .venv/bin/python -m pip install -r requirements-voix.txt
fi

if [ "$1" = "voix" ]; then
  .venv/bin/python -m jarvis --voix
else
  .venv/bin/python -m jarvis
fi
read -r -p "Appuie sur Entrée pour fermer..."
