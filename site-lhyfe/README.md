# Site Lhyfe — maquette

Page unique en HTML, CSS et JavaScript, sans outil de compilation.

1. **La manutention** : une vidéo pilotée par le défilement (le chariot charge le conteneur sur le camion).
2. **Les services** : bandeau noir, grandes lettres « HYDROGÈNE VERT » derrière le camion, cinq cartes.
3. **La suite en 3D, dans la même scène** (`assets/port3d.js`) : la dernière image de la vidéo est
   remplacée au pixel près par la 3D, puis le camion continue jusqu'au port. Un chariot porte-conteneurs
   prend le conteneur et le pose sur un navire, le camion repart, le navire traverse un parc éolien en mer
   (avec une plateforme d'hydrogène flottante) et accoste au port de destination : carte de fin « Livré. Vert. ».
4. **Chiffres, sites, contact.**

Pour l'ouvrir : lancer un petit serveur dans ce dossier, puis ouvrir http://localhost:8000 dans Edge.

    python -m http.server 8000

Les vidéos sont chargées depuis Internet ; polices et Three.js sont dans `assets/`.
Mode enregistrement image par image : ajouter `?rec=1` à l'adresse.
Maquette non officielle : chiffres issus de sources publiques (novembre 2026).
