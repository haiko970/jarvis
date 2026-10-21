import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, X } from 'lucide-react';
import Globe from './Globe';
import { ESCALES } from './escales';

const EASE = 'ease-[cubic-bezier(0.76,0,0.24,1)]';

// La petite planète du sel, comme celle du Petit Prince :
// petite dans un coin, et quand on clique dessus, on l'explore en grand.
export default function Planete() {
  const [ouverte, setOuverte] = useState(false);
  const [choix, setChoix] = useState<number | null>(null);

  // La touche Échap referme l'exploration
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && setOuverte(false);
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, []);

  const s = choix === null ? null : ESCALES[choix];

  return (
    <>
      {/* ---------- La petite planète ---------- */}
      <button
        onClick={() => setOuverte(true)}
        className="group flex items-center gap-[14px] text-left"
        aria-label="Explorer la petite planète du sel"
      >
        <span className="block text-right">
          <span className="block etiquette text-[var(--sable)]">Petite planète du sel</span>
          <span className="block font-serif-sel italic text-[18px] leading-[22px] mt-[4px] group-hover:text-[var(--sable)] transition-colors">
            Explorer les trois marais
          </span>
          <span className="hidden md:flex justify-end items-center gap-[4px] font-manrope text-[11px] text-[var(--sel-doux)] mt-[4px]">
            Guérande · Maras · Cahuil <ArrowUpRight className="w-[11px] h-[11px]" strokeWidth={1.5} />
          </span>
        </span>
        <span className="block w-[92px] h-[92px] md:w-[124px] md:h-[124px] shrink-0 transition-transform duration-700 group-hover:scale-[1.06]">
          {!ouverte && <Globe />}
        </span>
      </button>

      {/* ---------- L'exploration en grand (placée directement dans la page) ---------- */}
      {createPortal(
      <div className={`fixed inset-0 z-[55] transition-all duration-700 ${EASE} ${ouverte ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-[var(--noir)]/95 backdrop-blur-md" onClick={() => setOuverte(false)} />

        <div className="relative h-full flex flex-col md:flex-row pointer-events-none">
          {/* colonne de texte */}
          <div className="order-2 md:order-1 md:w-[380px] shrink-0 px-5 md:pl-[48px] md:pr-0 pb-5 md:py-[48px] flex flex-col pointer-events-auto overflow-y-auto">
            <span className="hidden md:block etiquette text-[var(--sable)]">Les Ponts du Sel</span>
            <h2 className="hidden md:block font-serif-sel italic text-[44px] leading-[46px] mt-[12px]">
              Trois marais salants,
              <br />
              une même planète.
            </h2>
            <p className="hidden md:block font-manrope text-[13px] leading-[20px] text-[var(--sel-doux)] mt-[16px]">
              À partir de Guérande, HOLENA tisse des ponts avec les salines artisanales du monde.
            </p>

            {/* les trois sites */}
            <ul className="flex md:flex-col gap-[8px] md:gap-0 md:mt-[32px] md:border-t md:border-[var(--filet)]">
              {ESCALES.map((x, i) => (
                <li key={x.numero} className="flex-1 md:flex-none">
                  <button
                    onClick={() => setChoix(i)}
                    className={`w-full flex items-baseline gap-[10px] md:gap-[14px] px-[10px] md:px-0 py-[10px] md:py-[14px] border md:border-0 md:border-b border-[var(--filet)] text-left transition-colors ${choix === i ? 'text-[var(--sable)] border-[var(--sable)]' : 'hover:text-[var(--sable)]'}`}
                  >
                    <span className="hidden md:inline font-manrope text-[11px] tabular-nums text-[var(--sel-doux)]">{x.numero}</span>
                    <span className="font-serif-sel italic text-[17px] md:text-[22px] leading-[22px]">{x.court}</span>
                    <span className="hidden md:inline etiquette ml-auto text-[var(--sel-doux)]">{x.pays}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* la fiche du site choisi */}
            <div className="mt-[18px] md:mt-[28px] min-h-[120px]">
              {s ? (
                <a key={choix} href={s.lien} target="_blank" rel="noreferrer" className="group flex gap-[16px] carte-entre">
                  <span className="block w-[96px] h-[96px] md:w-[110px] md:h-[110px] shrink-0 overflow-hidden border border-[var(--filet)]">
                    <span className="block w-full h-full transition-transform duration-700 group-hover:scale-[1.06]">{s.image}</span>
                  </span>
                  <span className="min-w-0 flex flex-col">
                    <span className="etiquette text-[var(--sable)]">{s.pays}</span>
                    <span className="font-serif-sel italic text-[24px] leading-[26px] mt-[4px]">{s.titre}</span>
                    <span className="font-manrope text-[11px] text-[var(--sel-doux)] mt-[2px]">{s.altitude}</span>
                    <span className="font-manrope text-[12px] leading-[17px] text-[var(--sel-doux)] mt-[6px]">{s.texte}</span>
                    <span className="font-manrope text-[11px] text-[var(--sable)] mt-[8px] flex items-center gap-[4px]">
                      Voir le projet <ArrowUpRight className="w-[12px] h-[12px]" strokeWidth={1.5} />
                    </span>
                  </span>
                </a>
              ) : (
                <p className="font-manrope text-[12px] leading-[18px] text-[var(--sel-doux)]">
                  Faites tourner la planète, puis touchez un point pour découvrir un marais salant.
                </p>
              )}
            </div>
          </div>

          {/* le globe */}
          <div className="order-1 md:order-2 relative flex-1 min-h-0 h-[58vh] md:h-full pointer-events-auto">
            {ouverte && <Globe interactif noms selection={choix} onSelect={setChoix} />}
            <span className="absolute bottom-[10px] md:bottom-[40px] left-1/2 -translate-x-1/2 etiquette text-[var(--sel-doux)] whitespace-nowrap pointer-events-none">
              Glisser pour tourner · Toucher un point
            </span>
          </div>
        </div>

        <button
          onClick={() => setOuverte(false)}
          aria-label="Fermer la planète"
          className="absolute top-5 right-5 md:top-[28px] md:right-[48px] w-[40px] h-[40px] flex items-center justify-center border border-[var(--filet)] rounded-full hover:border-[var(--sable)] hover:text-[var(--sable)] transition-colors"
        >
          <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
      </div>,
      document.body,
      )}
    </>
  );
}
