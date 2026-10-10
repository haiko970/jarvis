# 🤖 Jarvis — ton assistant personnel

Un assistant inspiré du Jarvis d'Iron Man, qui tourne sur ton ordinateur, avec un **tableau de bord
holographique** façon Iron Man : réacteur animé, horloge, météo et marées illustrées, journée,
tâches, mails et jauges du PC. Tu peux lui écrire ou lui parler.
Son « cerveau » est une IA **gratuite qui tourne directement sur ton ordinateur** grâce à
[Ollama](https://ollama.com) : pas d'abonnement, pas de clé, et tes conversations restent chez toi.
Il faut un PC avec au moins 8 Go de mémoire vive (16 Go recommandés) et ~6 Go d'espace disque.

Il peut agir sur ton PC :

- 🕒 te donner la date et l'heure
- 🌐 ouvrir des sites web (« ouvre YouTube »)
- 🚀 lancer des applications (« lance la calculatrice », « ouvre Spotify »)
- 📝 retenir des notes et des rappels (« note que je dois appeler maman »)
- 💻 te donner des infos sur ton ordinateur (espace disque, système)
- 🌦️ donner la météo (aujourd'hui, demain, après-demain), chez toi ou ailleurs, avec la force du vent
  (boussole, rafales, échelle de Beaufort)
- 🧠 se souvenir de toi : ta ville, tes goûts, tes infos (« retiens que mon anniversaire est le 12 mars »)
- 🔎 chercher sur internet (actualités, questions diverses)
- 🔊 régler le volume (« monte le son », « mets le volume à 30 », « coupe le son »)
- 🎵 contrôler la musique et les vidéos (pause, suivant, précédent), chercher sur Spotify et afficher
  le morceau en cours sur le tableau de bord
- 🎮 lancer tes jeux Steam et Epic Games à la voix (« lance Rocket League », « lance GTA ») et compter
  ton temps de jeu (graphique des 7 derniers jours)
- 🏖️ afficher le compte à rebours des vacances d'été : un point par jour de l'année scolaire
- 🎨 changer les couleurs de l'interface : J.A.R.V.I.S. (bleu), Iron Man (rouge et or), Hulk (vert),
  Thanos (violet) ou Furtif (blanc) — dans ⚙️ Réglages ou en disant « Jarvis, mets le thème Iron Man »
- 🛡️ surveiller le PC quand tu pars (« Jarvis, surveille le PC ») : si quelqu'un touche à la souris ou au
  clavier sans taper ton code secret, « Accès non autorisé », photo avec la webcam et PC verrouillé
- ⚽ donner le score de ton équipe de foot (en direct pendant les matchs), son dernier résultat et son prochain match
- ⚽ suivre ton club sur SportEasy : matchs, entraînements, convocations et heure de rendez-vous
  (⚙️ Réglages → « Mon équipe de foot » → colle le lien « Synchronisation Calendrier » de SportEasy)
- 🌙 décrire le ciel : phase de la lune, lever et coucher du soleil, et quand voir passer la Station spatiale
- 🔄 se mettre à jour tout seul (proposé au démarrage, ou ⚙️ → « Mises à jour »)
- ⏰ programmer des minuteurs et des rappels (« rappelle-moi dans 10 minutes de sortir les pâtes »)
- 👂 se réveiller quand tu dis « Jarvis » (à activer en bas de la fenêtre)
- ⏻ se fermer (« Jarvis, ferme-toi »), éteindre ou redémarrer le PC (« ferme mon ordi » : extinction
  dans 30 secondes, « annule » pour l'arrêter)
- ✅ gérer ta liste de tâches (« ajoute à ma liste : appeler le dentiste demain »)
- 📧 lire tes mails non lus (Gmail sans mot de passe grâce à un petit script Google, ou Outlook, Yahoo, Orange, Free…) sans les marquer comme lus
- 🎓 lire **Pronote** : emploi du temps (cours annulés, profs absents), devoirs et notes
  (connexion par QR code, comme l'appli mobile, qui marche avec tous les ENT ; outil non officiel *pronotepy*)
- 🌊 donner les heures de marée haute et basse (estimation)
- 📅 lire ton agenda (Google Agenda ou tout agenda avec un lien iCal)
- ☀️ te faire un **brief du jour** et **se lancer tout seul quand tu allumes ton PC**
  (activé automatiquement sous Windows, désactivable dans ⚙️ Réglages → « Brief du jour »)
- 💬 discuter, expliquer, rédiger, traduire…

Il fonctionne sous Windows, macOS et Linux.

## 🚀 Démarrage rapide (le plus simple)

1. Installe **Python** depuis https://www.python.org/downloads/
2. Installe **Ollama** depuis https://ollama.com/download (bouton « Download for Windows »), puis lance-le.
3. Télécharge Jarvis : https://github.com/haiko970/jarvis/archive/refs/heads/claude/adoring-mayer-u2tfmy.zip
   puis fais un clic droit sur le fichier ZIP → **Extraire tout**.
4. Dans le dossier extrait, **double-clique** sur :
   - `lancer_jarvis.bat` sous Windows ;
   - `lancer_jarvis.command` sous macOS.
5. La première fois, Jarvis s'installe et télécharge son « cerveau » (~5 Go, une seule fois).
6. La fenêtre de Jarvis s'ouvre. Écris ta demande, ou clique sur 🎙️ (ou sur le réacteur) pour lui parler.
   Pour quitter, ferme simplement la fenêtre de Jarvis.
7. Pour avoir Jarvis sur ton Bureau, double-clique sur `creer_raccourci_bureau.bat`
   (déplace d'abord le dossier de Jarvis là où tu veux le garder, par exemple dans Documents).

> 💡 Le micro et la voix utilisent ceux de Microsoft Edge, qui est installé sur tous les Windows :
> Jarvis s'ouvre donc dans une fenêtre Edge, même si ton navigateur habituel est Firefox ou Chrome.

## Installation manuelle (pour les curieux)

```bash
python -m venv .venv
# Windows :
.venv\Scripts\activate
# macOS / Linux :
source .venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-voix.txt   # optionnel, pour le mode vocal
python -m jarvis               # interface graphique
python -m jarvis --terminal    # dans le terminal, sans interface
python -m jarvis --voix        # dans le terminal, au micro (avec requirements-voix.txt)
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

## 🛠️ Dépannage

- **« CUDA error » ou « llama-server process has terminated »** : le pilote de ta carte graphique NVIDIA
  est trop ancien pour Ollama. Jarvis passe alors tout seul sur le processeur (plus lent).
  Pour retrouver la vitesse, mets à jour ton pilote sur https://www.nvidia.com/fr-fr/drivers/
  puis redémarre ton PC. Pour forcer le processeur, ajoute `JARVIS_CPU=1` dans un fichier `.env`.
- **« Je n'arrive pas à joindre Ollama »** : lance l'application Ollama depuis le menu Démarrer.
- **Jarvis est trop lent** : dans ⚙️ → « Son cerveau », choisis « Rapide » ou « Éclair », puis relance Jarvis.

## 4. Personnaliser ton Jarvis

- **Une voix ultra-réaliste** : ⚙️ → « Sa voix » → « ElevenLabs », avec ta clé gratuite et l'identifiant de la voix.
- **Sa voix, son caractère, ton prénom, ta ville, ses souvenirs** : clique sur ⚙️ en haut à droite de la fenêtre de Jarvis.
- **Ses instructions de base** : modifie `SYSTEM_PROMPT` dans `jarvis/brain.py`.
- **De nouveaux pouvoirs** : dans `jarvis/tools.py`, écris une fonction Python, décris-la dans
  la liste `TOOLS` et ajoute-la à `HANDLERS`. Jarvis saura l'utiliser tout seul.
- **Changer de cerveau** : crée un fichier `.env` (copie de `.env.example`) et mets par exemple
  `JARVIS_MODEL=qwen3:4b` pour un cerveau plus petit et plus rapide si ton PC rame.
  Liste des cerveaux compatibles : https://ollama.com/search?c=tools

## Organisation du code

```
jarvis/
├── __main__.py   # le démarrage, et le mode terminal (texte ou voix)
├── web.py        # l'interface graphique (petit serveur local + fenêtre)
├── dashboard.py  # les données du tableau de bord (météo, marées, journée, PC…)
├── static/index.html  # le design de l'interface
├── brain.py      # le dialogue avec l'IA (Ollama) et l'utilisation des outils
├── tools.py      # les actions que Jarvis peut faire sur ton PC
├── powers.py     # volume, musique, Spotify, minuteurs
├── musique.py    # morceau en cours sur Spotify
├── jeux.py       # jeux Steam et Epic Games
├── systeme.py    # fermer Jarvis, éteindre ou redémarrer le PC
├── temps_jeu.py  # statistiques de temps de jeu
├── vacances.py   # compte à rebours des vacances d'été
├── theme.py      # thèmes de couleur de l'interface
├── sentinelle.py # mode sentinelle (surveillance du PC)
├── foot.py       # scores de l'équipe préférée (ESPN)
├── sporteasy.py  # matchs et convocations du club (lien d'agenda SportEasy)
├── ciel.py       # lune, soleil et passages de l'ISS
├── maj.py        # mise à jour automatique depuis GitHub
├── version.json  # numéro de version (à augmenter à chaque nouveauté)
├── brief.py      # tâches, mails, agenda, brief du jour, démarrage automatique
├── pronote.py    # emploi du temps, devoirs et notes Pronote
├── elevenlabs.py # voix ElevenLabs (option)
├── config.py     # les réglages (voix, personnalité, prénom)
└── voice.py      # micro → texte et texte → voix
```

## Crédits

- [pronotepy](https://github.com/bain3/pronotepy) (MIT) pour Pronote
- [jsQR](https://github.com/cozmo/jsQR) (Apache 2.0) pour lire les QR codes, inclus dans `jarvis/static/jsQR.js`
