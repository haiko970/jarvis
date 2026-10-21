import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import logoHolenaHd from './assets/logo-holena-hd.png';
import Intro from './Intro';
import APropos from './APropos';
import Planete from './Planete';

// Page d'origine du projet
const PAGE_PROJET = 'https://www.piaf.solutions/fr/2023/03/11/le-pont-du-sel/';

// Le texte qui tourne doucement autour du logo
const TEXTE_CERCLE =
  'Récolter le sel · Bâtir des ponts · Guérande · Maras · Cahuil · Coopération · Solidarité · ';

function CercleDeTexte() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full anim-tourne" aria-hidden="true">
      <defs>
        <path id="cercle" d="M100,100 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" />
      </defs>
      <circle cx="100" cy="100" r="99" fill="none" stroke="var(--filet)" strokeWidth="0.3" />
      <text fill="var(--sel-doux)" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '5.2px', letterSpacing: '1.6px' }}>
        <textPath href="#cercle" textLength="574" lengthAdjust="spacing">
          {TEXTE_CERCLE.toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
}

export default function App() {
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
    setAproposOuvert(false);
    setSiteLance(false);
    setIntroFinie(false);
  };

  return (
    <section className="relative w-full h-screen overflow-hidden bg-[var(--noir)] text-[var(--sel)]">
      {pageVisible && !introFinie && <Intro onSortie={() => setSiteLance(true)} onFin={() => setIntroFinie(true)} />}

      {siteLance && (
        <>
          {/* une lueur très douce derrière le logo */}
          <div
            className="absolute inset-0 pointer-events-none anim-fade-in"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(205,183,154,0.08), transparent 42%)' }}
          />

          {/* ---------- En-tête ---------- */}
          <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-[12px] px-5 md:px-[48px] py-5 md:py-[28px]">
            <span className="font-manrope text-[13px] leading-[16px] tracking-[0.38em] anim-fade-up" style={{ animationDelay: '100ms' }}>
              HOLENA
            </span>

            {/* L'onglet « Le collectif HOLENA, qui sommes-nous ? » */}
            <button
              onClick={() => setAproposOuvert(true)}
              className="md:absolute md:left-1/2 md:-translate-x-1/2 font-manrope text-[12px] md:text-[13px] leading-[16px] whitespace-nowrap px-[14px] py-[8px] border border-[var(--filet)] rounded-full hover:border-[var(--sable)] hover:text-[var(--sable)] transition-colors anim-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              <span className="hidden md:inline">
                Le collectif HOLENA, <span className="font-serif-sel italic text-[16px]">qui sommes-nous ?</span>
              </span>
              <span className="md:hidden">Qui sommes-nous ?</span>
            </button>

            <button
              onClick={revoirIntro}
              aria-label="Revoir l'intro"
              className="flex items-center gap-[8px] text-[var(--sel-doux)] hover:text-[var(--sable)] transition-colors anim-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <RotateCcw className="w-[13px] h-[13px]" strokeWidth={1.5} />
              <span className="hidden lg:inline etiquette">Revoir l’intro</span>
            </button>
          </header>

          {/* ---------- Le logo, au centre ---------- */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(52vw,30vh)] md:w-[min(24vw,32vh,340px)] aspect-[1040/940]">
            <img
              src={logoHolenaHd}
              alt="Logo HOLENA"
              className="absolute inset-0 w-full h-full"
              style={{ opacity: introFinie ? 1 : 0 }}
            />
            {/* cercle de texte autour du logo */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square pointer-events-none anim-fade-in"
              style={{ animationDelay: '600ms' }}
            >
              <CercleDeTexte />
            </div>
          </div>

          {/* ---------- La citation ---------- */}
          <div className="absolute left-5 right-5 top-[88px] md:left-[48px] md:right-auto md:top-[104px] lg:top-1/2 lg:-translate-y-1/2 max-w-[520px] lg:max-w-[260px] xl:max-w-[340px]">
            <span className="block etiquette text-[var(--sable)] anim-fade-up" style={{ animationDelay: '400ms' }}>
              Coopération internationale
            </span>
            <blockquote
              className="font-serif-sel italic text-[19px] leading-[25px] md:text-[22px] md:leading-[29px] xl:text-[27px] xl:leading-[34px] mt-[12px] anim-fade-up"
              style={{ animationDelay: '500ms', textWrap: 'balance' } as CSSProperties}
            >
              « Quand le vent se lève, certains construisent des murs. Et d’autres des moulins. »
            </blockquote>
            <div className="hidden lg:block w-[44px] h-px bg-[var(--sable)] mt-[24px] anim-trait" style={{ animationDelay: '900ms' }} />
            <p
              className="hidden lg:block font-manrope text-[13px] leading-[20px] text-[var(--sel-doux)] mt-[20px] anim-fade-up"
              style={{ animationDelay: '800ms' }}
            >
              Conseil, expertise technique et juridique pour faire reconnaître les produits des producteurs artisans et
              paysans, au service des communautés locales et des écosystèmes.
            </p>
            <a
              href={PAGE_PROJET}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-[6px] mt-[20px] font-manrope text-[13px] leading-[16px] border-b border-[var(--sable)] pb-[3px] hover:text-[var(--sable)] transition-colors anim-fade-up"
              style={{ animationDelay: '1000ms' }}
            >
              Découvrir les Ponts du Sel
              <ArrowUpRight className="w-[13px] h-[13px]" strokeWidth={1.5} />
            </a>
          </div>

          {/* ---------- Bas de page ---------- */}
          <div className="absolute bottom-5 md:bottom-[40px] left-5 right-5 md:left-[48px] md:right-[48px] flex items-end justify-between gap-[24px]">
            <p
              className="hidden lg:block font-manrope text-[12px] leading-[18px] text-[var(--sel-doux)] max-w-[300px] anim-fade-up"
              style={{ animationDelay: '1100ms' }}
            >
              <span className="font-serif-sel italic text-[16px] text-[var(--sel)]">Holena</span> : « récolter le sel » en breton.
            </p>
            <div className="w-full md:w-auto md:ml-auto anim-fade-up" style={{ animationDelay: '1200ms' }}>
              <Planete />
            </div>
          </div>

          <APropos ouvert={aproposOuvert} onFermer={() => setAproposOuvert(false)} />
        </>
      )}
    </section>
  );
}
