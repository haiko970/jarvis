# 🤖 Jarvis — ton assistant personnel

Un assistant inspiré du Jarvis d'Iron Man, qui tourne sur ton ordinateur. Tu peux lui écrire ou lui parler.
Son « cerveau » est Claude, l'IA d'Anthropic. Il peut agir sur ton PC :

- 🕒 te donner la date et l'heure
- 🌐 ouvrir des sites web (« ouvre YouTube »)
- 🚀 lancer des applications (« lance la calculatrice », « ouvre Spotify »)
- 📝 retenir des notes et des rappels (« note que je dois appeler maman »)
- 💻 te donner des infos sur ton ordinateur (espace disque, système)
- 🔎 chercher sur internet (météo, actualités, questions diverses)
- 💬 discuter, expliquer, rédiger, traduire…

Il fonctionne sous Windows, macOS et Linux.

## 🚀 Démarrage rapide (le plus simple)

1. Installe **Python** depuis https://www.python.org/downloads/
   (sous Windows, coche bien **« Add python.exe to PATH »** au début de l'installation).
2. Télécharge Jarvis : https://github.com/haiko970/jarvis/archive/refs/heads/claude/adoring-mayer-u2tfmy.zip
   puis fais un clic droit sur le fichier ZIP → **Extraire tout**.
3. Crée ta clé API sur https://console.anthropic.com (**Settings → API Keys**, après avoir ajouté un peu de crédit).
4. Dans le dossier extrait, **double-clique** sur :
   - `lancer_jarvis.bat` sous Windows (ou `lancer_jarvis_voix.bat` pour lui parler au micro) ;
   - `lancer_jarvis.command` sous macOS.
5. La première fois, tout s'installe tout seul, puis on te demande de coller ta clé. C'est tout !

> ⚠️ Ta clé est enregistrée dans un fichier `.env`. Ne le partage jamais : il contient ta clé secrète.
> Pour changer de clé, supprime simplement le fichier `.env` et relance Jarvis.

## Installation manuelle (pour les curieux)

```bash
python -m venv .venv
# Windows :
.venv\Scripts\activate
# macOS / Linux :
source .venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-voix.txt   # optionnel, pour le mode vocal
```

Copie `.env.example` en `.env` et mets-y ta clé, puis lance Jarvis avec `python -m jarvis`
(ou `python -m jarvis --voix` pour le mode vocal).

Ajoute `--mot-cle` pour qu'il ne réponde que lorsque ta phrase contient « Jarvis »
(par exemple « Jarvis, quelle heure est-il ? »).

Dans la conversation :
- `oublie` → efface la conversation et repart de zéro
- `quitter` ou `au revoir` → ferme Jarvis

### Problèmes avec le micro ?

- **Windows** : si `pip install PyAudio` échoue, mets à jour pip (`python -m pip install --upgrade pip`) puis réessaie.
- **macOS** : `brew install portaudio` puis `pip install PyAudio`.
- **Linux** : `sudo apt install portaudio19-dev python3-pyaudio espeak-ng` puis réinstalle.
- La reconnaissance vocale utilise le service gratuit de Google et a donc besoin d'internet.

## 4. Personnaliser ton Jarvis

- **Sa personnalité** : modifie `SYSTEM_PROMPT` dans `jarvis/brain.py`.
- **De nouveaux pouvoirs** : dans `jarvis/tools.py`, écris une fonction Python, décris-la dans
  la liste `TOOLS` et ajoute-la à `HANDLERS`. Jarvis saura l'utiliser tout seul.
- **Rapidité ou réflexion** : dans `.env`, `JARVIS_EFFORT=low` (rapide, par défaut) ou `high` (plus réfléchi).

## Organisation du code

```
jarvis/
├── __main__.py   # la boucle de conversation (texte ou voix)
├── brain.py      # le dialogue avec Claude et l'utilisation des outils
├── tools.py      # les actions que Jarvis peut faire sur ton PC
└── voice.py      # micro → texte et texte → voix
```
