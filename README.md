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

## 1. Installation

1. Installe **Python 3.10 ou plus récent** : https://www.python.org/downloads/
   (sous Windows, coche bien **« Add Python to PATH »** pendant l'installation).
2. Télécharge ce projet (bouton vert **Code → Download ZIP**, puis décompresse-le) ou clone-le avec git.
3. Ouvre un terminal dans le dossier du projet, puis lance :

   ```bash
   python -m venv .venv
   # Windows :
   .venv\Scripts\activate
   # macOS / Linux :
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

## 2. Ta clé API

1. Crée un compte sur https://console.anthropic.com et ajoute un peu de crédit.
2. Va dans **Settings → API Keys** et crée une clé.
3. Copie le fichier `.env.example` en `.env`, puis remplace `sk-ant-...` par ta clé.

> ⚠️ Ne partage jamais ton fichier `.env` : il contient ta clé secrète (il est déjà ignoré par git).

## 3. Lancer Jarvis

**Mode texte** (tu écris, il répond) :

```bash
python -m jarvis
```

**Mode vocal** (tu parles au micro, il te répond à voix haute) : installe d'abord les dépendances vocales.

```bash
pip install -r requirements-voix.txt
python -m jarvis --voix
```

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
