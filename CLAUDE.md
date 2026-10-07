# Jarvis — consignes pour les contributeurs

- Assistant personnel en français pour un utilisateur débutant (Windows, Ollama local, interface HUD dans Edge).
- **À chaque changement publié, augmenter `jarvis/version.json`** (format `AAAA.MM.JJ.n`) et résumer les
  nouveautés en une phrase : c'est ce que la mise à jour automatique (`jarvis/maj.py`) compare à GitHub.
- Les données de l'utilisateur vivent hors du dossier (`~/.jarvis_*.json`, coffre-fort Windows) : la mise à
  jour remplace les fichiers du projet sauf `.venv`, `.env` et `.git`.
- Textes, commentaires et messages en français, avec un vocabulaire simple.
