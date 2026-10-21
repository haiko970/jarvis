import type { ReactNode } from 'react';
import logoMer from './assets/logo-mer-en-commun.png';
import photoMaras from './assets/maras.jpg';

// Page d'origine du projet HOLENA
export const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';

// Guérande n'a pas de photo : on dessine les marais salants vus du ciel
// (les bassins, et les petits tas de sel blanc qu'on appelle des « mulons »).
function MaraisGuerande() {
  const bassins = [
    [4, 6, 28, 20], [36, 6, 26, 20], [66, 6, 30, 20],
    [4, 30, 18, 26], [26, 30, 34, 26], [64, 30, 32, 26],
    [4, 60, 30, 34], [38, 60, 22, 34], [64, 60, 32, 34],
  ];
  const teintes = ['#24231f', '#2c2a25', '#34312b', '#2a2824', '#3a362f', '#26241f', '#302d27', '#363229', '#28261f'];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-label="Marais salants de Guérande vus du ciel" role="img">
      <rect width="100" height="100" fill="#1a1916" />
      {bassins.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={teintes[i]} stroke="#cdb79a" strokeOpacity="0.35" strokeWidth="0.5" />
      ))}
      <rect x="27" y="33" width="31" height="20" fill="#cdb79a" opacity="0.08" />
      <rect x="66" y="63" width="28" height="28" fill="#f3efe8" opacity="0.05" />
      {[[14, 16], [50, 16], [80, 16], [13, 44], [80, 44], [19, 78], [49, 78], [80, 78]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill="#f3efe8" opacity="0.9" />
      ))}
    </svg>
  );
}

export type Escale = {
  numero: string;
  pays: string;
  titre: string;
  court: string; // nom affiché sur le globe
  coord: [number, number]; // longitude, latitude
  altitude: string;
  texte: string;
  image: ReactNode;
  lien: string;
};

// Les trois marais salants. Les liens mènent pour l'instant tous à la page HOLENA :
// remplacer par l'adresse exacte de chaque page quand on l'aura.
export const ESCALES: Escale[] = [
  {
    numero: '01',
    pays: 'France',
    titre: 'Guérande',
    court: 'Guérande',
    coord: [-2.43, 47.32],
    altitude: 'Au niveau de la mer',
    texte: 'Le terroir de départ : l’expérience des paludiers de Guérande, partagée avec les salines du monde.',
    image: <MaraisGuerande />,
    lien: PAGE_PROJET,
  },
  {
    numero: '02',
    pays: 'Pérou',
    titre: 'Sel de Maras',
    court: 'Maras',
    coord: [-72.15, -13.3],
    altitude: 'Plus de 3 000 m, dans les Andes',
    texte: 'Salines artisanales des Andes, un patrimoine vivant, souvent menacé, mais porteur d’avenir.',
    image: <img src={photoMaras} alt="Chemin vers les salines de Maras, au Pérou" className="w-full h-full object-cover" />,
    lien: PAGE_PROJET,
  },
  {
    numero: '03',
    pays: 'Chili',
    titre: 'Zone de Cahuil',
    court: 'Cahuil',
    coord: [-72.02, -34.48],
    altitude: 'Sur la côte Pacifique',
    texte: 'Action reconnue par le label national « La Mer en Commun ».',
    image: <img src={logoMer} alt="Label La Mer en Commun" className="w-full h-full object-contain p-[8px] bg-[#0b0b0a]" />,
    lien: PAGE_PROJET,
  },
];
