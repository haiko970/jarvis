import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import logoMer from './assets/logo-mer-en-commun.png';
import photoMaras from './assets/maras.jpg';

// Page d'origine du projet HOLENA
const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';

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
      {/* reflets d'eau */}
      <rect x="27" y="33" width="31" height="20" fill="#cdb79a" opacity="0.08" />
      <rect x="66" y="63" width="28" height="28" fill="#f3efe8" opacity="0.05" />
      {/* les mulons de sel */}
      {[[14, 16], [50, 16], [80, 16], [13, 44], [80, 44], [19, 78], [49, 78], [80, 78]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill="#f3efe8" opacity="0.9" />
      ))}
    </svg>
  );
}

type Escale = { numero: string; lieu: string; titre: string; texte: string; image: ReactNode; lien: string };

// Liens des trois escales : pour l'instant ils mènent tous à la page HOLENA.
// Remplacer par l'adresse exacte de chaque page quand on l'aura.
const ESCALES: Escale[] = [
  {
    numero: '01',
    lieu: 'France',
    titre: 'Guérande',
    texte: 'Le terroir de départ : l’expérience des paludiers de Guérande.',
    image: <MaraisGuerande />,
    lien: PAGE_PROJET,
  },
  {
    numero: '02',
    lieu: 'Pérou',
    titre: 'Sel de Maras',
    texte: 'Salines artisanales des Andes, un patrimoine vivant.',
    image: <img src={photoMaras} alt="Chemin vers les salines de Maras, au Pérou" className="w-full h-full object-cover" />,
    lien: PAGE_PROJET,
  },
  {
    numero: '03',
    lieu: 'Chili',
    titre: 'Zone de Cahuil',
    texte: 'Action reconnue par le label national « La Mer en Commun ».',
    image: <img src={logoMer} alt="Label La Mer en Commun" className="w-full h-full object-contain p-[6px] bg-[#0b0b0a]" />,
    lien: PAGE_PROJET,
  },
];

// Le petit carrousel « Les Ponts du Sel » : une escale à la fois,
// avec des flèches, et qui avance tout seul (sauf quand la souris est dessus).
export default function Escales() {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (pause) return;
    const minuteur = window.setTimeout(() => setI((n) => (n + 1) % ESCALES.length), 6500);
    return () => window.clearTimeout(minuteur);
  }, [i, pause]);

  const e = ESCALES[i];
  const aller = (pas: number) => setI((n) => (n + pas + ESCALES.length) % ESCALES.length);

  return (
    <aside
      className="w-full md:w-[360px]"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      aria-label="Les Ponts du Sel : les trois escales"
    >
      <div className="flex items-center justify-between pb-[10px] border-b border-[var(--filet)]">
        <span className="etiquette text-[var(--sel-doux)]">Les Ponts du Sel</span>
        <div className="flex items-center gap-[12px]">
          <span className="font-manrope text-[11px] tabular-nums text-[var(--sel-doux)]">
            <span className="text-[var(--sel)]">{e.numero}</span> / 0{ESCALES.length}
          </span>
          <button
            onClick={() => aller(-1)}
            aria-label="Escale précédente"
            className="w-[26px] h-[26px] flex items-center justify-center border border-[var(--filet)] hover:border-[var(--sable)] hover:text-[var(--sable)] transition-colors"
          >
            <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => aller(1)}
            aria-label="Escale suivante"
            className="w-[26px] h-[26px] flex items-center justify-center border border-[var(--filet)] hover:border-[var(--sable)] hover:text-[var(--sable)] transition-colors"
          >
            <ChevronRight className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <a key={i} href={e.lien} target="_blank" rel="noreferrer" className="group flex gap-[16px] pt-[14px] carte-entre">
        <div className="w-[84px] h-[84px] md:w-[96px] md:h-[96px] shrink-0 overflow-hidden border border-[var(--filet)]">
          <div className="w-full h-full transition-transform duration-700 group-hover:scale-[1.06]">{e.image}</div>
        </div>
        <div className="min-w-0 flex flex-col">
          <span className="etiquette text-[var(--sable)]">{e.lieu}</span>
          <span className="font-serif-sel italic text-[24px] leading-[26px] mt-[4px]">{e.titre}</span>
          <span className="font-manrope text-[12px] leading-[17px] text-[var(--sel-doux)] mt-[4px]">{e.texte}</span>
          <span className="font-manrope text-[11px] leading-[14px] text-[var(--sable)] mt-auto pt-[6px] flex items-center gap-[4px]">
            Voir le projet
            <ArrowUpRight className="w-[12px] h-[12px] transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" strokeWidth={1.5} />
          </span>
        </div>
      </a>

      {/* petits points : on peut aussi cliquer dessus */}
      <div className="flex gap-[6px] mt-[14px]">
        {ESCALES.map((x, n) => (
          <button
            key={x.numero}
            onClick={() => setI(n)}
            aria-label={`Aller à ${x.titre}`}
            className={`h-[2px] transition-all duration-500 ${n === i ? 'w-[28px] bg-[var(--sable)]' : 'w-[12px] bg-[var(--filet)] hover:bg-[var(--sel-doux)]'}`}
          />
        ))}
      </div>
    </aside>
  );
}
