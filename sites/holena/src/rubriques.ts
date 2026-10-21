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
  | { type: 'liens'; titre: string; liens: { texte: string; url: string }[] }
  | { type: 'aCompleter'; titre: string; consigne: string };

export type Rubrique = {
  id: 'guerande' | 'perou' | 'chili' | 'label';
  numero: string;
  court: string; // nom court pour les menus
  surtitre: string;
  titre: string;
  chapo: string; // phrase d'introduction
  lien?: string; // la page d'origine sur piaf.solutions (sinon la page HOLENA)
  image: { src: string; alt: string; contenir?: boolean; portrait?: boolean }; // portrait : image en hauteur (couverture)
  blocs: Bloc[];
};

const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';
const PAGE_CHILI = 'https://www.piaf.solutions/fr/2025/06/12/programme-holena-les-ponts-du-sel/';
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
    chapo: 'Sel de Maras : un trésor des Andes protégé par une Indication Géographique, la première du Pérou.',
    image: { src: photoMaras, alt: 'Chemin vers les salines de Maras, au Pérou' },
    blocs: [
      {
        type: 'texte',
        titre: 'Un trésor des Andes',
        paragraphes: [
          'Niché dans les hauteurs vertigineuses des Andes péruviennes, à plus de 3 000 mètres d’altitude, le Sel de Maras incarne une tradition millénaire, un savoir-faire ancestral et un produit d’exception.',
          'Aujourd’hui, grâce à HOLENA, ce joyau de la gastronomie péruvienne bénéficie d’un statut officiel : l’Indication Géographique (IG) délivrée par l’INDECOPI, une première pour le Pérou et pour la communauté andine.',
        ],
      },
      {
        type: 'infos',
        titre: 'En bref',
        lignes: [
          { label: 'Où', valeur: 'Maras, dans les Andes péruviennes, à plus de 3 000 m d’altitude' },
          { label: 'Qui récolte', valeur: 'Les communautés de Maras Ayllu et Pinchingoto, regroupées dans l’entreprise sociale MARASAL' },
          { label: 'Comment', valeur: 'Évaporation solaire de sources d’eau salée, dans plus de 4 000 bassins en terrasse' },
          { label: 'Reconnaissance', valeur: 'Indication Géographique délivrée par l’INDECOPI en octobre 2024, la première du Pérou' },
          { label: 'Avec le soutien de', valeur: 'Projet péruano-suisse PESIPRO (Coopération Économique Suisse, SECO) et appui technique de PIAF via HOLENA' },
        ],
      },
      {
        type: 'texte',
        titre: 'Un héritage ancestral vivant',
        paragraphes: [
          'Le Sel de Maras est extrait à la main par les communautés de Maras Ayllu et Pinchingoto, regroupées au sein de l’entreprise sociale MARASAL. Leur méthode repose sur un procédé naturel d’évaporation solaire de sources d’eau salée. L’eau est répartie par gravité dans plus de 4 000 bassins construits en terrasse sur fonds d’argile, à flanc de montagne, où se forme le précieux cristal de sel.',
          'Ce sel de source, unique en son genre, se distingue par sa richesse minérale et ses caractéristiques singulières :',
        ],
      },
      {
        type: 'liste',
        titre: 'Ce qui le rend unique',
        elements: [
          'Origine de haute montagne',
          'Procédé 100 % naturel par gravité et évaporation solaire',
          'Extraction manuelle selon des techniques communautaires ancestrales',
          'Production durable et équitable par des communautés locales',
        ],
      },
      {
        type: 'texte',
        titre: 'Vers une protection internationale',
        paragraphes: [
          'Grâce au soutien du projet de coopération péruano-suisse PESIPRO, financé par la Coopération Économique Suisse (SECO), et avec l’appui technique de l’agence française PIAF via le programme HOLENA, le Sel de Maras s’est doté d’un solide cahier des charges. Celui-ci a porté la demande d’Indication Géographique officielle, obtenue auprès de l’INDECOPI en octobre 2024.',
          'Ce signe officiel d’origine permet non seulement de garantir l’origine et la qualité du produit, mais aussi de renforcer sa protection contre les usages frauduleux sur les marchés nationaux et internationaux.',
        ],
      },
      {
        type: 'texte',
        titre: 'Un sel, une identité, un avenir collectif',
        paragraphes: [
          'La reconnaissance IG ne protège pas seulement un produit : elle valorise un territoire, une culture, et soutient des centaines de familles qui perpétuent ce savoir-faire unique. Ce modèle de production communautaire inspire par son lien fort avec l’environnement, sa gouvernance collective et son ancrage local.',
          'En tant que première Indication Géographique du Pérou, la Sal de Maras ouvre la voie à d’autres produits emblématiques du pays. Elle devient un emblème de qualité, d’authenticité et de développement durable. Elle incarne aussi une nouvelle forme de fierté nationale et d’engagement pour la valorisation du patrimoine immatériel péruvien.',
        ],
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
    lien: PAGE_CHILI,
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
    chapo: 'L’action d’HOLENA reconnue par le label national « La Mer en commun » : Les Ponts du Sel, exemple emblématique d’un patrimoine vivant relié à la mer.',
    image: { src: logoMer, alt: 'Label La Mer en Commun — Année de la mer', contenir: true },
    blocs: [
      {
        type: 'texte',
        titre: '2025, l’Année de la Mer',
        paragraphes: [
          'En 2025, l’Année de la Mer place l’océan au centre des grands défis contemporains : climat, biodiversité, ressources, souveraineté, culture, échanges et transmission.',
          'À travers le label « La Mer en commun », l’État valorise les initiatives qui participent à une meilleure compréhension du rôle fondamental de la mer dans nos vies, nos territoires et notre avenir collectif.',
          'Dans ce cadre, le label décerné à HOLENA marque la reconnaissance du projet « Les Ponts du Sel » comme un exemple emblématique de patrimoine vivant, durable et universellement relié à la mer.',
        ],
      },
      {
        type: 'texte',
        titre: 'L’action d’HOLENA labellisée « La Mer en commun » 2025',
        paragraphes: [
          'Le projet « Les Ponts du Sel », porté par HOLENA, a créé cette année un échange entre les traditions salicoles artisanales du Chili et celles des marais salants de Guérande.',
          'Les salines artisanales chiliennes, dans des zones comme Cáhuil ou Barrancas, sont reconnues pour leurs techniques ancestrales : un savoir transmis de génération en génération, qui combine l’eau de mer, le vent, le soleil et le geste humain. Ce sel n’est pas un simple produit : il incarne un patrimoine immatériel, un lien fort entre l’homme et la mer.',
        ],
      },
      {
        type: 'liste',
        titre: 'Pourquoi c’est important',
        elements: [
          'Cela valorise un patrimoine vivant souvent méconnu en Europe : les salines artisanales chiliennes dialoguent avec un patrimoine français et local, celui des marais salants de Guérande.',
          'Le projet montre que la mer n’est pas un simple décor : c’est un objet culturel, social, économique et humain. Le sel n’est pas « qu’un condiment », mais un lien entre l’océan, le climat, les traditions et les communautés.',
          'En labellisant un tel projet, La Mer en commun ouvre la voie à des coopérations internationales : échanges de savoir-faire et solidarités entre territoires littoraux, au-delà des frontières.',
          'Cela sensibilise le grand public à des réalités parfois éloignées, et contribue à une éducation maritime, patrimoniale et citoyenne.',
        ],
      },
      {
        type: 'texte',
        titre: 'Les Ponts du Sel Chili / Guérande : l’ambassadeur d’une mer partagée',
        paragraphes: [
          'Le label n’est pas seulement un logo : c’est une reconnaissance, un geste symbolique vers la mer, ses cultures, ses gens. En 2025, l’événement Les Ponts du Sel fait du sel chilien un messager de la mer.',
          'Grâce à cette labellisation, HOLENA gagne une nouvelle visibilité pour son action en faveur d’un patrimoine vivant, mémoire de l’océan, et invitation à découvrir, respecter et partager.',
        ],
      },
      {
        type: 'liens',
        titre: 'Pour aller plus loin',
        liens: [
          { texte: 'Le label « La Mer en commun » et l’Année de la Mer (mer.gouv.fr)', url: 'https://www.mer.gouv.fr/mer-en-commun/la-mer-en-commun' },
          { texte: 'Le programme HOLENA Les Ponts du Sel avec le Chili (piaf.solutions)', url: PAGE_CHILI },
        ],
      },
    ],
  },
];
