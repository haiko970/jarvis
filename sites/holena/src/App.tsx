import { useEffect, useState } from 'react';
import { MapPin, Menu, RotateCcw, X } from 'lucide-react';
import logoHolenaHd from './assets/logo-holena-hd.png';
import logoMer from './assets/logo-mer-en-commun.png';
import photoMaras from './assets/maras.jpg';
import Intro from './Intro';
import APropos from './APropos';
import { CARTE_H, CARTE_L, PART_LOGO } from './carte';

// Page d'origine du projet, ouverte par le bouton et le lien de la carte
const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';

const NAV = [
  { number: '01', label: 'PONTS_DU_SEL', delay: 450, apropos: false },
  { number: '02', label: 'EXPERTISES', delay: 550, apropos: true },
  { number: '03', label: 'CONTACT', delay: 650, apropos: false },
];

function NavItem({ number, label, delay, onClick }: { number: string; label: string; delay: number; onClick?: () => void }) {
  return (
    <div className="flex items-center gap-[3px] anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span className="font-manrope text-[#AFDDFF]/80 text-[13px] leading-[15.6px]">{number}.</span>
      <span
        className="font-manrope text-white text-[13px] leading-[15.6px] cursor-pointer hover:text-[#AFDDFF] transition-colors whitespace-nowrap"
        onClick={onClick}
      >
        {label}
      </span>
    </div>
  );
}

// Petite pastille bleue « LA MER EN COMMUN » (le label obtenu par l'action au Chili)
function LabelChip() {
  return (
    <span className="font-manrope bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px] text-black text-[13px] leading-[15.6px] whitespace-nowrap">
      LA_MER_EN_COMMUN
    </span>
  );
}

const verticalPositions = ['12.6%', '37.5%', '61.9%', '86.2%'];
const horizontalPositions = ['32.7%', '71.4%'];

function GridLines() {
  return (
    <>
      {verticalPositions.map((left, i) => (
        <div
          key={`v${i}`}
          className="absolute top-0 h-full w-px bg-white/[0.04] anim-grid-v"
          style={{ left, animationDelay: `${600 + i * 100}ms` }}
        />
      ))}
      {horizontalPositions.map((top, i) => (
        <div
          key={`h${i}`}
          className="absolute left-0 w-full h-px bg-white/[0.04] anim-grid-h"
          style={{ top, animationDelay: `${800 + i * 150}ms` }}
        />
      ))}
      {horizontalPositions.map((top, hi) =>
        verticalPositions.map((left, vi) => (
          <div
            key={`p${hi}-${vi}`}
            className="absolute anim-scale-in"
            style={{ top, left, animationDelay: `${1000 + (hi * 4 + vi) * 80}ms` }}
          >
            <div className="absolute w-[10px] h-px bg-white/70 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-px h-[10px] bg-white/70 -translate-x-1/2 -translate-y-1/2" />
          </div>
        )),
      )}
    </>
  );
}

// Position dans la carte (coordonnées sur 1000 × 560) → pourcentages CSS
const px = (x: number) => `${(x / CARTE_L) * 100}%`;
const py = (y: number) => `${(y / CARTE_H) * 100}%`;

// Les trois flèches qui partent du logo
const FLECHES = [
  { nom: 'guerande', x1: 600, y1: 160, x2: 690, y2: 92, delay: 1300 },
  { nom: 'perou', x1: 370, y1: 335, x2: 212, y2: 392, delay: 1500 },
  { nom: 'chili', x1: 640, y1: 300, x2: 790, y2: 352, delay: 1700 },
];

function Fleches() {
  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox={`0 0 ${CARTE_L} ${CARTE_H}`}>
      <defs>
        <marker id="pointe" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10" fill="none" stroke="#AFDDFF" strokeWidth="1.5" />
        </marker>
      </defs>
      {FLECHES.map((f) => (
        <g key={f.nom} className="anim-fade-in" style={{ animationDelay: `${f.delay}ms` }}>
          <line
            x1={f.x1}
            y1={f.y1}
            x2={f.x2}
            y2={f.y2}
            pathLength={100}
            stroke="#AFDDFF"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            markerEnd="url(#pointe)"
            className="anim-draw-line"
            style={{ animationDelay: `${f.delay}ms` }}
          />
          {/* point de départ, au bord du logo */}
          <circle cx={f.x1} cy={f.y1} r="2.5" fill="#AFDDFF" />
        </g>
      ))}
    </svg>
  );
}

function Destination({ titre, court, texte, className, anim, delay, align = 'left' }: {
  titre: string; court: string; texte: string; className: string; anim: string; delay: number; align?: 'left' | 'right';
}) {
  return (
    <div className={`absolute ${className} ${anim} ${align === 'right' ? 'text-right' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <span className="font-manrope text-white text-[10px] md:text-[13px] leading-[15.6px] whitespace-nowrap">
        <span className="hidden md:inline">{titre}</span>
        <span className="md:hidden">{court}</span>
      </span>
      <p className="hidden md:block font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px] max-w-[190px]">{texte}</p>
    </div>
  );
}

const CARRE = 'absolute w-[9%] aspect-square border border-white/80 anim-scale-in overflow-hidden';

// Le centre de la page : le logo HOLENA et ses trois flèches
function Carte({ logoVisible }: { logoVisible: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,1100px,117.86vh)] aspect-[1000/560] pointer-events-none">
      {/* le logo : il est déjà là, l'intro vient se poser exactement dessus */}
      <img
        src={logoHolenaHd}
        alt="Logo HOLENA"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-[1040/940]"
        style={{ width: `${PART_LOGO * 100}%`, opacity: logoVisible ? 1 : 0 }}
      />

      <Fleches />

      {/* Pérou */}
      <div className={CARRE} style={{ left: px(112), top: py(352), animationDelay: '1800ms' }}>
        <img src={photoMaras} alt="Chemin vers les salines de Maras, au Pérou" className="w-full h-full object-cover" />
      </div>

      {/* Chili */}
      <div className={`${CARRE} bg-black/40`} style={{ left: px(795), top: py(338), animationDelay: '2000ms' }}>
        <img src={logoMer} alt="Label La Mer en Commun" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

// Les textes des trois destinations, placés dans la carte
function TextesCarte() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,1100px,117.86vh)] aspect-[1000/560] pointer-events-none">
      <div className="absolute" style={{ left: px(700), top: py(48) }}>
        <Destination
          titre="[ GUÉRANDE — FRANCE ]"
          court="[ GUÉRANDE ]"
          texte="Le terroir de départ : l’expérience des paludiers de Guérande."
          className="left-0 top-0"
          anim="anim-slide-right"
          delay={1500}
        />
      </div>
      <div className="absolute" style={{ left: px(112), top: py(470) }}>
        <Destination
          titre="[ PÉROU — SEL DE MARAS ]"
          court="[ PÉROU ]"
          texte="Salines artisanales des Andes, un patrimoine vivant."
          className="left-0 top-0"
          anim="anim-slide-left"
          delay={1700}
        />
      </div>
      <div className="absolute" style={{ left: px(795), top: py(262) }}>
        <Destination
          titre="[ CHILI — ZONE DE CAHUIL ]"
          court="[ CHILI ]"
          texte="Action reconnue par le label national « La Mer en Commun »."
          className="left-0 top-0"
          anim="anim-slide-right"
          delay={1900}
        />
      </div>
    </div>
  );
}

// Grains de sel : positions fixes (pas d'aléatoire, le rendu reste stable)
const GRAINS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  size: 1 + (i % 3),
  duration: 14 + ((i * 7) % 12),
  delay: -((i * 3.1) % 20),
}));

function SaltGrains() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {GRAINS.map((g, i) => (
        <span
          key={i}
          className="absolute bottom-[-10px] rounded-full bg-white/60 anim-grain"
          style={{ left: g.left, width: g.size, height: g.size, animationDuration: `${g.duration}s`, animationDelay: `${g.delay}s` }}
        />
      ))}
    </div>
  );
}

const EASE = 'ease-[cubic-bezier(0.76,0,0.24,1)]';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  // aproposOuvert : le panneau « Le collectif HOLENA, qui sommes-nous ? »
  const [aproposOuvert, setAproposOuvert] = useState(false);
  // siteLance : le site commence ses animations (pendant que l'intro s'efface)
  // introFinie : l'écran d'intro est retiré
  const [siteLance, setSiteLance] = useState(false);
  const [introFinie, setIntroFinie] = useState(false);
  // On attend que la page soit vraiment à l'écran avant de lancer l'intro
  const [pageVisible, setPageVisible] = useState(!document.hidden);

  useEffect(() => {
    const quandVisible = () => !document.hidden && setPageVisible(true);
    document.addEventListener('visibilitychange', quandVisible);
    return () => document.removeEventListener('visibilitychange', quandVisible);
  }, []);

  const revoirIntro = () => {
    setMenuOpen(false);
    setAproposOuvert(false);
    setSiteLance(false);
    setIntroFinie(false);
  };

  const ouvrirApropos = () => {
    setMenuOpen(false);
    setAproposOuvert(true);
  };

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      {pageVisible && !introFinie && <Intro onSortie={() => setSiteLance(true)} onFin={() => setIntroFinie(true)} />}
      {siteLance && (
      <>
      {/* Fond : photo de Maras, assombrie pour que le texte blanc reste lisible */}
      <div className="absolute inset-0 anim-fade-in">
        <img src={photoMaras} alt="" className="absolute inset-0 w-full h-full object-cover blur-[3px] anim-ken-burns" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
      </div>
      <SaltGrains />

      <div className="relative z-10 w-full h-full">
        <GridLines />
        <Carte logoVisible={introFinie} />
        <TextesCarte />

        <nav className="absolute top-0 left-0 w-full flex items-center px-5 md:px-[35px] py-5 md:py-[27px]">
          <div className="flex items-center gap-[20px] xl:gap-[40px]">
            <span
              className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              HOLENA<span className="hidden sm:inline"> // PONTS DU SEL</span>
            </span>

            {/* L'onglet « Le collectif HOLENA, qui sommes-nous ? » */}
            <button
              className="font-manrope text-white text-[12px] md:text-[13px] leading-[15.6px] whitespace-nowrap border border-[#AFDDFF]/70 px-[10px] py-[6px] hover:bg-[#AFDDFF] hover:text-black transition-colors anim-fade-up"
              style={{ animationDelay: '350ms' }}
              onClick={ouvrirApropos}
            >
              <span className="hidden md:inline">Le collectif HOLENA, qui sommes-nous ?</span>
              <span className="md:hidden">Qui sommes-nous ?</span>
            </button>

            <div className="hidden xl:flex items-center gap-[40px]">
              {NAV.map((n) => (
                <NavItem key={n.number} {...n} onClick={n.apropos ? ouvrirApropos : undefined} />
              ))}
            </div>
          </div>

          <button
            className="ml-auto flex items-center gap-[6px] font-manrope text-white/60 text-[12px] leading-[15.6px] tracking-wide whitespace-nowrap hover:text-[#AFDDFF] transition-colors anim-fade-in"
            style={{ animationDelay: '700ms' }}
            onClick={revoirIntro}
            aria-label="Revoir l'intro"
          >
            <RotateCcw className="w-[13px] h-[13px]" strokeWidth={1.5} />
            <span className="hidden lg:inline">REVOIR L'INTRO</span>
          </button>

          <div className="hidden 2xl:flex items-center gap-[12px] ml-[32px] anim-slide-right" style={{ animationDelay: '600ms' }}>
            <MapPin className="w-[15px] h-[15px] text-white" strokeWidth={1.5} />
            <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap">Guérande, France</span>
            <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] whitespace-nowrap">[ EN COURS ]</span>
            <span className="font-manrope text-white text-[13px] leading-[15.6px] ml-[20px] whitespace-nowrap">LABEL :</span>
            <LabelChip />
          </div>

          <button
            className="xl:hidden ml-[12px] relative w-[40px] h-[40px] flex items-center justify-center anim-fade-in"
            style={{ animationDelay: '400ms' }}
            aria-label="Ouvrir ou fermer le menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`absolute transition-all duration-300 ${EASE} ${menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
              <Menu className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </span>
            <span className={`absolute transition-all duration-300 ${EASE} ${menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
              <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </span>
          </button>
        </nav>

        {/* Menu mobile */}
        <div className={`fixed inset-0 z-50 xl:hidden transition-all duration-500 ${EASE} ${menuOpen ? 'visible' : 'invisible'}`}>
          <div
            className={`absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-500 ${EASE} ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMenuOpen(false)}
          />
          <div className={`relative h-full flex flex-col px-5 pt-24 pb-10 transition-all duration-500 ${EASE} ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <button
              className="absolute top-5 right-5 w-[40px] h-[40px] flex items-center justify-center"
              aria-label="Fermer le menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </button>
            <div className="flex flex-col gap-8">
              {[{ number: '00', label: 'QUI_SOMMES_NOUS', apropos: true }, ...NAV].map((n, i) => (
                <div
                  key={n.number}
                  className={`transition-all duration-500 ${EASE} ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                  style={{ transitionDelay: menuOpen ? `${150 + i * 75}ms` : '0ms' }}
                >
                  <div className="flex items-center gap-3 cursor-pointer" onClick={n.apropos ? ouvrirApropos : undefined}>
                    <span className="font-manrope text-[#AFDDFF]/80 text-[14px] leading-[1]">{n.number}.</span>
                    <span className="font-manrope text-white text-[28px] leading-[1.2] tracking-tight">{n.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`mt-auto pt-10 border-t border-white/10 transition-all duration-500 ${EASE} ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: menuOpen ? '450ms' : '0ms' }}
            >
              <div className="flex items-center gap-[10px] mb-3">
                <MapPin className="w-[15px] h-[15px] text-white" strokeWidth={1.5} />
                <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap">Guérande, France</span>
                <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] whitespace-nowrap">[ EN COURS ]</span>
              </div>
              <div className="flex items-center gap-[8px]">
                <span className="font-manrope text-white text-[13px] leading-[15.6px]">LABEL :</span>
                <LabelChip />
              </div>
            </div>
          </div>
        </div>

        {/* La citation : en italique, entre guillemets, en petit */}
        <blockquote
          className="font-graphik italic text-white/90 font-normal leading-[1.35] absolute anim-fade-up text-[16px] sm:text-[18px] md:text-[20px] xl:text-[22px] top-[96px] md:top-[118px] left-5 md:left-[35px] max-w-[300px] sm:max-w-[380px] xl:max-w-[440px]"
          style={{ animationDelay: '400ms' }}
        >
          « Quand le vent se lève, certains construisent des murs. Et d’autres des moulins. »
        </blockquote>

        <div className="absolute bottom-5 md:bottom-[35px] left-5 md:left-[35px] right-5 md:right-[35px] flex flex-col md:flex-row items-start md:items-end justify-between gap-5 md:gap-0">
          <a
            href={PAGE_PROJET}
            target="_blank"
            rel="noreferrer"
            className="bg-[#AFDDFF] px-[16px] md:px-[20px] py-[10px] md:py-[12px] flex items-center gap-[10px] hover:bg-[#c8e8ff] transition-colors anim-fade-up"
            style={{ animationDelay: '900ms' }}
          >
            <span className="text-black text-[16px] leading-none">&#10022;</span>
            <span className="font-manrope text-black text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wide">
              Découvrir les Ponts du Sel
            </span>
          </a>

          <div className="relative max-w-[280px] hidden xl:block anim-slide-right" style={{ animationDelay: '1100ms' }}>
            <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] px-[6px] py-[2px] inline-block mb-[10px]">
              AOP · IGP — UN ACCOMPAGNEMENT À 360°
            </span>
            <div className="relative p-[20px]">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 168" preserveAspectRatio="none">
                <polygon
                  points="0.5,0.5 279.5,0.5 279.5,167.5 30,167.5 0.5,137.5"
                  fill="none"
                  stroke="#AFDDFF"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <p className="relative font-manrope text-white text-[13px] leading-[18px] mb-[18px]">
                Conseil, expertise technique et juridique pour faire reconnaître les produits des producteurs
                artisans et paysans, au service des communautés locales et des écosystèmes.
              </p>
              <button
                onClick={ouvrirApropos}
                className="relative block font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] cursor-pointer hover:underline"
              >
                QUI_SOMMES_NOUS
              </button>
            </div>
          </div>
        </div>
      </div>

      <APropos ouvert={aproposOuvert} onFermer={() => setAproposOuvert(false)} />
      </>
      )}
    </section>
  );
}
