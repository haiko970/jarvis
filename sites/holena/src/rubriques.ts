import logoHolenaHd from './assets/logo-holena-hd.png';
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
  | { type: 'aCompleter'; titre: string; consigne: string };

export type Rubrique = {
  id: 'guerande' | 'perou' | 'chili' | 'label';
  numero: string;
  court: string; // nom court pour les menus
  surtitre: string;
  titre: string;
  chapo: string; // phrase d'introduction
  image: { src: string; alt: string; contenir?: boolean };
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
    image: { src: logoHolenaHd, alt: 'Logo HOLENA', contenir: true },
    blocs: [
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
    chapo: 'Accueil d’une délégation de paludiers chiliens sur la presqu’île guérandaise.',
    image: { src: photoChili, alt: 'Cabane à sel au bord de la lagune de Cahuil, au Chili' },
    blocs: [
      {
        type: 'infos',
        titre: 'Les Ponts du Sel — Chili',
        lignes: [
          { label: 'Où', valeur: 'Presqu’île guérandaise' },
          { label: 'Quand', valeur: 'Du 15 au 20 juillet 2025' },
          { label: 'Au programme', valeur: 'Expositions · Projections · Rencontres' },
          {
            label: 'Organisé par',
            valeur: 'HOLENA, avec le festival Les Nuits Salines et le soutien du Ministère des Cultures du Chili',
          },
          { label: 'Distinction', valeur: 'Action reconnue par le label national « La Mer en Commun »' },
        ],
      },
      { type: 'image', src: afficheChili, alt: 'Affiche « Les Ponts du Sel — Chili », juillet 2025', legende: 'L’affiche de l’édition 2025.' },
      {
        type: 'aCompleter',
        titre: 'Le projet au Chili',
        consigne: 'Coller ici le texte de la sous-page « Chili : Zone de Cahuil » du site piaf.solutions.',
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
