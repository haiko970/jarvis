# HOLENA — Les Ponts du Sel (site animé)

Une seule page plein écran, animée, qui présente le projet HOLENA.

- **Voir le site tout de suite** : double-clique sur `dist/index.html` (il s'ouvre dans Edge).
- **Modifier le site** : les textes sont dans `src/App.tsx`, les images dans `src/assets/`.
  Ensuite, dans ce dossier : `npm install` (une seule fois), puis `npm run dev` pour voir les
  changements en direct, et `npm run build` pour refaire `dist/index.html`.

## Extension WordPress (piaf.solutions)

Le dossier `wordpress/` contient l'extension « HOLENA — Les Ponts du Sel ». Pour la fabriquer : créer un
dossier `holena-ponts-du-sel/` avec `holena-ponts-du-sel.php`, `readme.txt` et `site/index.html`
(copie de `dist/index.html`), puis le compresser en `holena-ponts-du-sel.zip`.
Dans WordPress : Extensions → Ajouter → Téléverser, puis le code court `[holena]` dans une page
(ou `[holena page="chili"]` pour ouvrir une rubrique).
