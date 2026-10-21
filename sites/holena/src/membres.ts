// Les 7 membres experts du collectif HOLENA.
// PHOTOS : mettre chaque photo dans src/assets/membres/, l'importer ici,
// puis l'ajouter dans « photo ». Tant qu'il n'y a pas de photo, le médaillon affiche une silhouette.
// Les descriptions décrivent le rôle de chacun dans le collectif : à relire et à ajuster.

export type Membre = {
  nom: string;
  expertise: string;
  description: string; // deux phrases
  photo?: string;
};

export const MEMBRES: Membre[] = [
  {
    nom: 'Charles Perraud',
    expertise: 'Expert SIQO et organisation de producteurs',
    description:
      'Accompagne la création et la réactivation des signes officiels de qualité et d’origine (SIQO). Aide les producteurs à s’organiser collectivement autour de leur cahier des charges.',
  },
  {
    nom: 'Nicolas Mezzalira',
    expertise: 'Expert coopération internationale et storytelling',
    description:
      'Construit les partenariats entre les territoires, ici et à l’autre bout du monde. Donne à chaque projet un récit propre, authentique et percutant.',
  },
  {
    nom: 'Laurent Pacoud',
    expertise: 'Expert stratégie économique et développement durable',
    description:
      'Définit avec les collectifs une stratégie économique solide et durable. Veille à une juste rémunération du travail des producteurs et au respect de leur territoire.',
  },
  {
    nom: 'Anatole Danto',
    expertise: 'Expert patrimoine culturel immatériel',
    description:
      'Identifie et protège les savoirs, les gestes et les traditions qui font la valeur d’un produit. Porte la reconnaissance de ce patrimoine vivant auprès des institutions.',
  },
  {
    nom: 'Gildas Buron',
    expertise: 'Expert ethnohistoire',
    description:
      'Retrace l’histoire des communautés de producteurs et de leurs pratiques. Ses recherches nourrissent l’ancrage historique de chaque démarche d’indication géographique.',
  },
  {
    nom: 'Mikael Simonin',
    expertise: 'Experte muséographie et tourisme',
    description:
      'Imagine des expositions et des parcours de visite autour des savoir-faire. Aide les territoires à accueillir le public tout en préservant l’activité des producteurs.',
  },
  {
    nom: 'Thierry Merré',
    expertise: 'Expert valorisation visuelle',
    description:
      'Met en images les territoires, les gestes et les produits. Crée les supports visuels qui donnent à voir la force de chaque projet.',
  },
];
