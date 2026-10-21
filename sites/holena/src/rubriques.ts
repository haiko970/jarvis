import couvertureLivre from './assets/livre-une-autre-fois-dans-l-ouest.jpg';
import logoMer from './assets/logo-mer-en-commun.png';
import photoMaras from './assets/maras.jpg';
import photoChili from './assets/chili-cahuil.jpg';
import afficheChili from './assets/affiche-chili-2025.jpg';

// ---------------------------------------------------------------
// Le contenu des 4 sous-pages : HOLENA Guérande, Pérou, Chili, Label.
// Les textes viennent de la page HOLENA du site piaf.solutions et de l'affiche
// « Les Ponts du Sel — Chili ». Les blocs « aCompleter » s'affichent en
// pointillés sur le site : il faut y coller le texte des sous-pages piaf.solutions.
// ---------------------------------------------------------------

export type Bloc =
  | { type: 'texte'; titre?: string; paragraphes: string[] }
  | { type: 'liste'; titre: string; elements: string[] }
  | { type: 'infos'; titre: string; lignes: { label: string; valeur: string }[] }
  | { type: 'image'; src: string; alt: string; legende?: string }
  | { type: 'programme'; titre: string; dates: { quand: string; titre: string; detail?: string; lieu: string }[] }
  | { type: 'aCompleter'; titre: string; consigne: string };

export type Rubrique = {
  id: 'guerande' | 'perou' | 'chili' | 'label';
  numero: string;
  court: string; // nom court pour les menus
  surtitre: string;
  titre: string;
  chapo: string; // phrase d'introduction
  image: { src: string; alt: string; contenir?: boolean; portrait?: boolean }; // portrait : image en hauteur (couverture)
  blocs: Bloc[];
};

const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';
export { PAGE_PROJET };

export const RUBRIQUES: Rubrique[] = [
  {
    id: 'guerande',
    court: 'Guérande',
    numero: '01',
    surtitre: '[ HOLENA — GUÉRANDE ]',
    titre: 'HOLENA Guérande',
    chapo:
      'À partir du terroir et de l’expérience privilégiée de Guérande, HOLENA intervient dans plusieurs régions du monde.',
    image: { src: couvertureLivre, alt: 'Couverture du livre « Une autre fois dans l’Ouest »', contenir: true, portrait: true },
    blocs: [
      {
        type: 'texte',
        titre: 'Le livre',
        paragraphes: [
          '« Une autre fois dans l’Ouest » : 50 années de renaissance du sel de Guérande. Un livre du collectif HOLENA.',
        ],
      },
      {
        type: 'texte',
        titre: 'Le projet',
        paragraphes: [
          'HOLENA* est un projet de coopération internationale et de solidarité qui vise à soutenir les producteurs et organisations de producteurs artisans et paysans dans le monde entier, dans la recherche de développement durable, à travers la reconnaissance et l’activation d’impact territorial durable à partir d’une politique de labels de qualité et d’origine.',
          'En mettant en lumière leurs savoir-faire, en renforçant leurs capacités et en œuvrant à la reconnaissance de leurs produits iconiques, HOLENA cherche à bâtir des ponts entre les territoires, les cultures et les acteurs engagés.',
          'Notre action repose sur des missions de conseil, d’expertise technique et juridique, avec un objectif clair : accompagner la mise en place de Dénominations d’Origine Contrôlée (AOC) ou d’Indications Géographiques Protégées (IGP) là où cela a du sens et peut générer un impact positif pour les communautés locales, les écosystèmes et la chaîne de valeur.',
        ],
      },
      {
        type: 'texte',
        titre: 'Les Ponts du Sel',
        paragraphes: [
          'Chaque projet part du terrain, des besoins exprimés par les producteurs, et se développe en lien avec des partenaires locaux, publics ou associatifs.',
          'Ces projets prennent différentes formes : accompagnement à la labellisation, ateliers de formation, diagnostics partagés, ou encore échanges de pratiques entre salines artisanales. Ils ont tous en commun de défendre un patrimoine vivant, souvent menacé, mais porteur d’avenir.',
        ],
      },
      {
        type: 'liste',
        titre: 'Un accompagnement à 360°',
        elements: [
          'Patrimoine culturel',
          'Ethnologie et socio-histoire',
          'Environnement',
          'Tourisme de savoir-faire',
          'Muséographie et événementiel',
          'Valorisation économique',
          'Création et réactivation de signes d’origine et de qualité',
          'Organisation collective des producteurs',
          'Cahiers des charges et plans de contrôle',
          'Impact territorial durable',
          'Études de marché',
        ],
      },
      {
        type: 'texte',
        paragraphes: [
          '* Holena : « récolter le sel » en breton. Un mot-racine pour un projet ancré dans la transmission des savoirs, des gestes, le développement durable des territoires et la juste rémunération du travail des producteurs.',
        ],
      },
    ],
  },
  {
    id: 'perou',
    court: 'Pérou',
    numero: '02',
    surtitre: '[ PÉROU — SEL DE MARAS ]',
    titre: 'Pérou : Sel de Maras',
    chapo: 'Salines artisanales des Andes, un patrimoine vivant.',
    image: { src: photoMaras, alt: 'Chemin vers les salines de Maras, au Pérou' },
    blocs: [
      {
        type: 'aCompleter',
        titre: 'Le projet au Pérou',
        consigne: 'Coller ici le texte de la sous-page « Pérou : Sel de Maras » du site piaf.solutions.',
      },
    ],
  },
  {
    id: 'chili',
    court: 'Chili',
    numero: '03',
    surtitre: '[ CHILI — ZONE DE CAHUIL ]',
    titre: 'Chili : Zone de Cahuil',
    chapo: 'Le Chili à l’honneur lors des Ponts du Sel 2025 : du 14 au 20 juillet, HOLENA accueille une délégation de paludiers chiliens dans la presqu’île de Guérande.',
    image: { src: photoChili, alt: 'Cabane à sel au bord de la lagune de Cahuil, au Chili' },
    blocs: [
      {
        type: 'texte',
        titre: 'Le Chili à l’honneur',
        paragraphes: [
          'Du 14 au 20 juillet 2025, HOLENA accueille une délégation de paludiers chiliens dans la presqu’île de Guérande. Cette rencontre s’inscrit dans le programme Les Ponts du Sel, porté par l’ONG PIAF, avec le soutien du Ministère des Cultures du Chili.',
          'Après l’exposition Le Sel des Incas et la saison Sel Pérou ! en 2022, le programme Les Ponts du Sel du collectif HOLENA revient cette année en recevant une délégation de productrices et de producteurs du littoral du sud du Chili (zone de Cahuil, région O’Higgins).',
          'Les Ponts du Sel visent à créer des échanges entre les écosystèmes du sel artisanal de Guérande et l’international. Le collectif HOLENA intervient sur les questions de valorisation culturelle et économique et de développement territorial durable.',
        ],
      },
      {
        type: 'infos',
        titre: 'En bref',
        lignes: [
          { label: 'Où', valeur: 'Presqu’île guérandaise : Guérande, Batz-sur-Mer, Le Pouliguen' },
          { label: 'Quand', valeur: 'Du 14 au 20 juillet 2025 (parcours photographique du 7 au 20 juillet)' },
          { label: 'Pour qui', valeur: 'Le grand public comme les professionnels' },
          { label: 'Organisé par', valeur: 'HOLENA (ONG PIAF), en partenariat avec le festival Les Nuits Salines' },
          { label: 'Avec le soutien de', valeur: 'Ministère des Cultures du Chili et de nombreux partenaires territoriaux' },
          { label: 'Distinction', valeur: 'Action reconnue par le label national « La Mer en Commun »' },
        ],
      },
      {
        type: 'programme',
        titre: 'Le programme',
        dates: [
          { quand: 'Du 7 au 20 juillet', titre: 'Visages et paysages du sel chilien', detail: 'Parcours photographique en 3 étapes : Terre de Sel, Musée des Marais Salants, Chapelle du Mûrier.', lieu: 'Guérande et Batz-sur-Mer' },
          { quand: '15 juillet, 11h', titre: 'Vernissage de l’exposition et accueil des paludiers chiliens', lieu: 'Terre de Sel (Guérande)' },
          { quand: '15, 16 et 17 juillet', titre: 'Rencontres et visites professionnelles', detail: 'Un programme dédié à la délégation chilienne.', lieu: 'Presqu’île guérandaise' },
          { quand: '16 juillet, 11h', titre: 'Projection du documentaire « Les Hommes du sel »', detail: 'Chili, 52 min, VOST. Rencontre entre paludiers du Chili et de la presqu’île, avec l’ONG UniverSel, suivie d’un verre de l’amitié. Entrée libre.', lieu: 'Cinéma Pax (Le Pouliguen)' },
          { quand: '17 juillet, 20h', titre: 'Soirée documentaires et échanges', detail: '« Les Hommes du sel » (Chili, 52 min, VOST), suivi de « Guérande, un peu de la beauté du monde » (France, 52 min). Débat professionnel en présence des paludiers chiliens, puis verre de l’amitié. Tarifs habituels.', lieu: 'Cinéma Pax (Le Pouliguen)' },
          { quand: '18, 19 et 20 juillet', titre: 'Stand chilien au festival Les Nuits Salines', detail: 'Sur le village du festival : vente de sel chilien et démonstrations de savoir-faire.', lieu: 'Batz-sur-Mer' },
          { quand: '19 juillet, 11h', titre: 'Visite commentée de l’exposition par les paludiers chiliens', lieu: 'Chapelle Notre-Dame-du-Mûrier (Batz-sur-Mer)' },
          { quand: '19 juillet, 16h', titre: 'Visages et paysages du sel du Chili : rencontre-conférence', detail: 'Rencontre publique avec les paludiers chiliens.', lieu: 'Musée des Marais Salants (Batz-sur-Mer)' },
        ],
      },
      {
        type: 'texte',
        titre: 'Un projet international et solidaire',
        paragraphes: [
          'HOLENA poursuit ici sa mission de développement durable par l’appui aux organisations de petits producteurs. Après avoir mis en valeur les salines péruviennes de Maras, l’ONG met à l’honneur le sud du Chili, notamment la zone de Cahuil, Boyeruca, Lo Valdivia et La Villa, dans la région O’Higgins.',
          'Le programme repose sur une idée simple : favoriser les échanges culturels et la transmission des savoirs pour une meilleure valorisation économique et un impact territorial durable. Ainsi, chaque édition des Ponts du Sel construit des ponts durables entre les territoires.',
        ],
      },
      { type: 'image', src: afficheChili, alt: 'Affiche « Les Ponts du Sel — Chili », juillet 2025', legende: 'L’affiche de l’édition 2025.' },
      {
        type: 'liste',
        titre: 'Partenaires du projet 2025',
        elements: [
          'Ministère des Cultures du Chili',
          'Festival Les Nuits Salines',
          'Cap Atlantique La Baule-Guérande Agglo',
          'Musée des Marais Salants',
          'Terre de Sel',
          'Coopérative Le Guérandais',
          'Ville de Batz-sur-Mer',
          'Ville du Pouliguen',
          'Ciné Phare',
          'Galerie Hasy',
          'ONG UniverSel',
          'APROSELA',
          'Artisans du sel',
          'EFEA formation paludiers',
          'Groupe Westhotel',
          'Les Jardins d’Aliwen',
        ],
      },
      {
        type: 'texte',
        paragraphes: ['* HOLENA signifie en langue bretonne « récolter le sel ».'],
      },
    ],
  },
  {
    id: 'label',
    court: 'Label',
    numero: '04',
    surtitre: '[ LABEL — LA MER EN COMMUN ]',
    titre: 'Le label « La Mer en Commun »',
    chapo: 'L’action d’HOLENA « Les Ponts du Sel : Chili » se voit décerner le label national La Mer en Commun.',
    image: { src: logoMer, alt: 'Label La Mer en Commun — Année de la mer', contenir: true },
    blocs: [
      {
        type: 'aCompleter',
        titre: 'À propos du label',
        consigne: 'Coller ici le texte de l’article « L’action d’HOLENA reconnue par le label national La Mer en Commun » du site piaf.solutions.',
      },
    ],
  },
];
