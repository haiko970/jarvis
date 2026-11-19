# Supervision hydrogène — site de Bouin (maquette)

Plateforme de supervision **simulée** qui suit l'hydrogène produit à Bouin (Vendée), de l'électrolyseur
jusqu'aux clients. Maquette pédagogique indépendante, sans lien avec l'entreprise.

**Ouvrir :** double-cliquer sur `index.html` (Edge ou Chrome).

- **`index.html` — Le voyage d'une particule** : on fait défiler la page (ou flèches ▲ ▼ du clavier) et on suit
  une particule : électricité du vent → eau de mer → électrolyse → purification → compression → conteneur → camion → client.
  Elle s'arrête à chaque endroit où elle est transformée. Marche sans internet.
- **`supervision.html` — Tableau de bord** (la vue 3D a besoin d'internet pour Three.js) :

- **① Usine 3D** : vue du site, flux animés (électricité, eau, hydrogène, refroidissement), clic sur un équipement = fiche.
- **② Parcours dans l'usine** : schéma de procédé animé, cliquable.
- **③ Transport & clients** : camions sur la carte, journal des lots, suivi d'un lot en 5 étapes, stocks chez les clients.

Les données marquées **RÉEL** viennent de sources publiques (liens en bas de page). Tout ce qui est marqué
**SIM** est une estimation cohérente (le modèle et ses hypothèses sont en haut du script, objet `P`).
