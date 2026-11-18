# Site Lhyfe — maquette

Page unique en HTML, CSS et JavaScript, sans outil de compilation.

1. **La manutention** : une vidéo pilotée par le défilement (le chariot charge le conteneur sur le camion).
2. **Les services** : bandeau noir, grandes lettres « HYDROGÈNE VERT » derrière le camion, cinq cartes.
3. **La suite en 3D, dans la même scène** (`assets/port3d.js`) : la dernière image de la vidéo est
   remplacée au pixel près par la 3D, puis le camion continue jusqu'au port. Un chariot porte-conteneurs
   prend le conteneur et le pose sur un navire, le camion repart, le navire traverse un parc éolien en mer
   (avec une plateforme d'hydrogène flottante) et accoste au port de destination : carte de fin « Livré. Vert. ».
4. **Chiffres, sites, contact.**

Pour l'ouvrir : double-cliquer sur `index.html` (Edge, Chrome ou Firefox). Une connexion Internet est
nécessaire pour la vidéo. Supprimer d'abord tout ancien dossier `site-lhyfe` pour ne pas ouvrir l'ancienne version.

Si la 3D (WebGL) n'est pas disponible sur l'ordinateur, la même scène est jouée automatiquement avec des
images pré-calculées (`assets/frames/`). Pour forcer ce mode : ajouter `?images` à l'adresse.

Les vidéos sont chargées depuis Internet ; polices et Three.js sont dans `assets/`.
Mode enregistrement image par image : ajouter `?rec=1` à l'adresse.
Maquette non officielle : chiffres issus de sources publiques (novembre 2026).
