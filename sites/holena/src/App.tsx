import { useEffect, useState } from 'react';
import { MapPin, Menu, RotateCcw, X } from 'lucide-react';
import couvertureLivre from './assets/livre-une-autre-fois-dans-l-ouest.jpg';
import photoChili from './assets/chili-cahuil.jpg';
import logoMer from './assets/logo-mer-en-commun.png';
import photoMaras from './assets/maras.jpg';
import Intro from './Intro';
import logoHolenaFond from './assets/logo-holena-hd.png';
import Collectif from './Collectif';
import Rubrique from './Rubrique';
import { RUBRIQUES, type Rubrique as RubriqueType } from './rubriques';

type IdRubrique = RubriqueType['id'];


// Page d'origine du projet, ouverte par le bouton et le lien de la carte
const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';

const NAV = [
  { number: '01', label: 'LE_PROJET', delay: 350 },
  { number: '02', label: 'PONTS_DU_SEL', delay: 450 },
  { number: '03', label: 'EXPERTISES', delay: 550 },
  { number: '04', label: 'CONTACT', delay: 650 },
];

function NavItem({ number, label, delay }: { number: string; label: string; delay: number }) {
  return (
    <div className="flex items-center gap-[3px] anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span className="font-manrope text-[#AFDDFF]/80 text-[13px] leading-[15.6px]">{number}.</span>
      <span className="font-manrope text-white text-[13px] leading-[15.6px] cursor-pointer hover:text-[#AFDDFF] transition-colors">
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

function ConnectorLine({ x1, y1, x2, y2, delay }: { x1: string; y1: string; x2: string; y2: string; delay: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none anim-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const SQUARE = 'absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in overflow-hidden';

function NodeLabel({ title, text, maxW, className, anim, delay, onClick }: {
  title: string; text: string; maxW: string; className: string; anim: string; delay: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group absolute text-left pointer-events-auto ${className} ${anim}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap group-hover:text-[#AFDDFF] transition-colors">{title}</span>
      <p className={`font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px] ${maxW}`}>{text}</p>
      <span className="inline-block font-manrope text-[#AFDDFF] text-[11px] leading-[14px] mt-[6px] group-hover:underline">EN_SAVOIR_PLUS →</span>
    </button>
  );
}

// Les quatre « nœuds » : HOLENA (Guérande), le Pérou, le Chili et le label « La Mer en Commun »
function CentralNodes({ onOuvrir }: { onOuvrir: (id: IdRubrique) => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {/* 1. HOLENA — le logo tourne lentement */}
      <button onClick={() => onOuvrir('guerande')} className={`${SQUARE} top-[27%] left-[60%] bg-black/40 pointer-events-auto hover:border-[#AFDDFF] transition-colors`} style={{ animationDelay: '1500ms' }}>
        <img src={couvertureLivre} alt="Couverture du livre « Une autre fois dans l’Ouest »" className="w-full h-full object-cover object-[50%_14%]" />
      </button>
      <NodeLabel
        title="[ HOLENA — GUÉRANDE ]"
        onClick={() => onOuvrir('guerande')}
        text="« Récolter le sel » en breton. Le terroir de départ de chaque pont."
        maxW="max-w-[160px]"
        className="top-[14%] left-[26%]"
        anim="anim-slide-left"
        delay={1100}
      />

      {/* 2. Pérou — photo des salines de Maras */}
      <button onClick={() => onOuvrir('perou')} className={`${SQUARE} top-[58%] left-[32%] pointer-events-auto hover:border-[#AFDDFF] transition-colors`} style={{ animationDelay: '1800ms' }}>
        <img src={photoMaras} alt="Chemin vers les salines de Maras, au Pérou" className="w-full h-full object-cover" />
      </button>
      <NodeLabel
        title="[ PÉROU — SEL DE MARAS ]"
        onClick={() => onOuvrir('perou')}
        text="Salines artisanales des Andes, un patrimoine vivant."
        maxW="max-w-[160px]"
        className="top-[76%] left-[3%]"
        anim="anim-slide-left"
        delay={1400}
      />

      {/* 3. Chili — la cabane à sel de Cahuil */}
      <button onClick={() => onOuvrir('chili')} className={`${SQUARE} top-[63%] left-[50%] bg-black/40 pointer-events-auto hover:border-[#AFDDFF] transition-colors`} style={{ animationDelay: '2100ms' }}>
        <img src={photoChili} alt="Cabane à sel au bord de la lagune de Cahuil, au Chili" className="w-full h-full object-cover object-[22%_50%]" />
      </button>
      <NodeLabel
        title="[ CHILI — ZONE DE CAHUIL ]"
        onClick={() => onOuvrir('chili')}
        text="Action reconnue par le label national « La Mer en Commun »."
        maxW="max-w-[180px]"
        className="top-[50%] left-[78%]"
        anim="anim-slide-right"
        delay={1700}
      />

      {/* 4. Label « La Mer en Commun » */}
      <button onClick={() => onOuvrir('label')} className={`${SQUARE} top-[30%] left-[84%] bg-black/40 pointer-events-auto hover:border-[#AFDDFF] transition-colors`} style={{ animationDelay: '2300ms' }}>
        <img src={logoMer} alt="Label La Mer en Commun" className="w-full h-full object-contain" />
      </button>
      <NodeLabel
        title="[ LABEL — LA MER EN COMMUN ]"
        onClick={() => onOuvrir('label')}
        text="L’action « Les Ponts du Sel : Chili » reçoit le label national La Mer en Commun."
        maxW="max-w-[190px]"
        className="top-[14%] left-[68%]"
        anim="anim-slide-right"
        delay={1900}
      />

      <ConnectorLine x1="38%" y1="17%" x2="52%" y2="17%" delay={1200} />
      <ConnectorLine x1="52%" y1="17%" x2="60%" y2="27%" delay={1400} />
      <ConnectorLine x1="32%" y1="58%" x2="20%" y2="74%" delay={1500} />
      <ConnectorLine x1="20%" y1="74%" x2="6%" y2="74%" delay={1700} />
      <ConnectorLine x1="78%" y1="53%" x2="63%" y2="53%" delay={1800} />
      <ConnectorLine x1="63%" y1="53%" x2="50%" y2="63%" delay={2000} />
      <ConnectorLine x1="79%" y1="23%" x2="84%" y2="30%" delay={2100} />
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
  // siteLance : le site commence ses animations (pendant que le logo s'efface)
  // introFinie : l'écran d'intro est retiré
  const [siteLance, setSiteLance] = useState(false);
  const [introFinie, setIntroFinie] = useState(false);
  // On attend que la page soit vraiment à l'écran avant de lancer l'intro
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  // collectifOuvert : la sous-page « Le collectif HOLENA » (adresse de la page + #collectif)
  const [collectifOuvert, setCollectifOuvert] = useState(() => window.location.hash === '#collectif');

  const ouvrirCollectif = () => {
    setMenuOpen(false);
    setCollectifOuvert(true);
    try { history.replaceState(null, '', '#collectif'); } catch { /* sans importance */ }
  };
  const fermerCollectif = () => {
    setCollectifOuvert(false);
    try { history.replaceState(null, '', ' '); } catch { /* sans importance */ }
  };

  // rubrique : la sous-page ouverte (Guérande, Pérou, Chili ou Label), aussi dans l'adresse (#chili…)
  const [rubrique, setRubrique] = useState<IdRubrique | null>(() => {
    const h = window.location.hash.slice(1);
    return RUBRIQUES.some((r) => r.id === h) ? (h as IdRubrique) : null;
  });
  const ouvrirRubrique = (id: IdRubrique) => {
    setMenuOpen(false);
    setRubrique(id);
    try { history.replaceState(null, '', `#${id}`); } catch { /* sans importance */ }
  };
  const fermerRubrique = () => {
    setRubrique(null);
    try { history.replaceState(null, '', ' '); } catch { /* sans importance */ }
  };

  useEffect(() => {
    const quandVisible = () => !document.hidden && setPageVisible(true);
    document.addEventListener('visibilitychange', quandVisible);
    return () => document.removeEventListener('visibilitychange', quandVisible);
  }, []);

  const revoirIntro = () => {
    setMenuOpen(false);
    setSiteLance(false);
    setIntroFinie(false);
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
      {/* Le logo assemblé par l'intro reste en toile de fond, au même endroit et à la même taille */}
      <img
        src={logoHolenaFond}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(70vw,60vh,460px)] aspect-[1040/1102] opacity-[0.16] pointer-events-none"
      />

      <div className="relative z-10 w-full h-full">
        {/* Bandeau du haut : « Découvrir le collectif HOLENA » */}
        <button
          onClick={ouvrirCollectif}
          className="group absolute top-0 left-0 w-full h-[36px] z-20 flex items-center justify-center gap-[10px] bg-[#AFDDFF] hover:bg-[#c8e8ff] transition-colors anim-fade-in"
          style={{ animationDelay: '150ms' }}
        >
          <span className="text-black text-[12px] leading-none">&#10022;</span>
          <span className="font-manrope text-black text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wide">
            Découvrir le collectif HOLENA
          </span>
          <span className="font-manrope text-black text-[13px] leading-none transition-transform group-hover:translate-x-[3px]">→</span>
        </button>

        <nav className="absolute top-[36px] left-0 w-full flex items-center px-5 md:px-[35px] py-5 md:py-[27px]">
          <div className="flex items-center gap-[40px]">
            <span
              className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              HOLENA // PONTS DU SEL
            </span>
            <div className="hidden xl:flex items-center gap-[40px]">
              {NAV.map((n) => <NavItem key={n.number} {...n} />)}
            </div>
          </div>

          <button
            className="ml-auto flex items-center gap-[6px] font-manrope text-white/60 text-[12px] leading-[15.6px] tracking-wide whitespace-nowrap hover:text-[#AFDDFF] transition-colors anim-fade-in"
            style={{ animationDelay: '700ms' }}
            onClick={revoirIntro}
          >
            <RotateCcw className="w-[13px] h-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">REVOIR L'INTRO</span>
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
              {/* sur téléphone, le menu donne accès aux 4 rubriques et au collectif */}
              {[
                ...RUBRIQUES.map((r) => ({ number: r.numero, label: r.court.toUpperCase(), ouvrir: () => ouvrirRubrique(r.id) })),
                { number: '05', label: 'LE_COLLECTIF', ouvrir: ouvrirCollectif },
              ].map((n, i) => (
                <div
                  key={n.number}
                  className={`transition-all duration-500 ${EASE} ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                  style={{ transitionDelay: menuOpen ? `${150 + i * 75}ms` : '0ms' }}
                >
                  <button className="flex items-center gap-3" onClick={n.ouvrir}>
                    <span className="font-manrope text-[#AFDDFF]/80 text-[14px] leading-[1]">{n.number}.</span>
                    <span className="font-manrope text-white text-[28px] leading-[1.2] tracking-tight">{n.label}</span>
                  </button>
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

        {/* La citation, en petit et en italique, à la place du grand titre */}
        <blockquote
          className="font-graphik italic text-white/90 font-normal leading-[1.35] absolute anim-fade-up text-[17px] sm:text-[19px] md:text-[22px] top-[170px] sm:top-[190px] md:top-[208px] left-5 md:left-[35px] max-w-[300px] sm:max-w-[380px] md:max-w-[420px]"
          style={{ animationDelay: '400ms' }}
        >
          « Quand le vent souffle, certains construisent des murs, d’autres fabriquent des moulins. »
        </blockquote>

        <GridLines />
        <CentralNodes onOuvrir={ouvrirRubrique} />

        <div className="absolute bottom-5 md:bottom-[35px] left-5 md:left-[35px] right-5 md:right-[35px] flex flex-col md:flex-row items-start md:items-end justify-between gap-5 md:gap-0 pointer-events-none">
          <a
            href={PAGE_PROJET}
            target="_blank"
            rel="noreferrer"
            className="bg-[#AFDDFF] px-[16px] md:px-[20px] py-[10px] md:py-[12px] flex items-center gap-[10px] hover:bg-[#c8e8ff] transition-colors anim-fade-up pointer-events-auto"
            style={{ animationDelay: '900ms' }}
          >
            <span className="text-black text-[16px] leading-none">&#10022;</span>
            <span className="font-manrope text-black text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wide">
              Découvrir les Ponts du Sel
            </span>
          </a>

          <div className="relative max-w-[280px] hidden sm:block anim-slide-right pointer-events-auto" style={{ animationDelay: '1100ms' }}>
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
              <a
                href={PAGE_PROJET}
                target="_blank"
                rel="noreferrer"
                className="relative block font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] cursor-pointer hover:underline"
              >
                VOIR_LE_PROJET_HOLENA
              </a>
            </div>
          </div>
        </div>
      </div>
      <Collectif ouvert={collectifOuvert} onFermer={fermerCollectif} />
      <Rubrique id={rubrique} onFermer={fermerRubrique} onAller={ouvrirRubrique} />
      </>
      )}
    </section>
  );
}
