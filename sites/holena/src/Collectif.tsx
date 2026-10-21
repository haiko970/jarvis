import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MEMBRES } from './membres';

const EASE = 'ease-[cubic-bezier(0.76,0,0.24,1)]';

const VALEURS = [
  'Protection et valorisation des patrimoines immatériels',
  'Coopération internationale',
  'Pour une économie territoriale durable, ancrée dans l’écologie humaine',
  'Pratiques agronomiques et artisanales respectées et valorisées',
];

// Silhouette affichée tant qu'il n'y a pas de photo
function Silhouette() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      <rect width="100" height="100" fill="#0d1418" />
      <circle cx="50" cy="40" r="17" fill="#AFDDFF" opacity="0.35" />
      <path d="M18,92 C20,68 34,60 50,60 C66,60 80,68 82,92 Z" fill="#AFDDFF" opacity="0.35" />
    </svg>
  );
}

// La sous-page « Le collectif HOLENA » : les 7 membres experts
export default function Collectif({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  // La touche Échap ramène à l'accueil
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  return (
    <div
      className={`fixed inset-0 z-[55] bg-black overflow-y-auto transition-all duration-700 ${EASE} ${ouvert ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 translate-y-6'}`}
      aria-hidden={!ouvert}
    >
      <div className="max-w-[1180px] mx-auto px-5 md:px-[35px] pt-5 md:pt-[27px] pb-[60px]">
        {/* en-tête de la sous-page */}
        <div className="flex items-center justify-between">
          <button
            onClick={onFermer}
            className="flex items-center gap-[8px] font-manrope text-white text-[13px] leading-[15.6px] hover:text-[#AFDDFF] transition-colors"
          >
            <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={1.5} />
            Retour à l’accueil
          </button>
          <span className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px]">HOLENA</span>
        </div>

        {/* présentation du collectif */}
        <div className="mt-[56px] md:mt-[80px] max-w-[720px]">
          <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ LE COLLECTIF ]</span>
          <h1 className="font-graphik text-white text-[40px] md:text-[64px] leading-[1.05] mt-[14px]">HOLENA</h1>
          <p className="font-manrope text-white/80 text-[16px] md:text-[18px] leading-[1.5] mt-[16px]">
            Un nouveau collectif d’experts au service de la valorisation territoriale durable des activités économiques
            traditionnelles.
          </p>
        </div>

        <div className="mt-[48px] grid grid-cols-1 md:grid-cols-3 gap-[32px] md:gap-[40px] border-t border-white/10 pt-[32px]">
          <section>
            <h2 className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">01. VALEURS</h2>
            <ul className="mt-[14px] flex flex-col gap-[10px]">
              {VALEURS.map((v) => (
                <li key={v} className="flex gap-[10px] font-manrope text-white/70 text-[14px] leading-[21px]">
                  <span className="text-[#AFDDFF] leading-[21px]">&#10022;</span>
                  {v}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">02. MISSION</h2>
            <p className="mt-[14px] font-manrope text-white/70 text-[14px] leading-[21px]">
              Mobiliser une équipe pluridisciplinaire de haut niveau, pour favoriser le développement des coopératives et
              organisations liées à un territoire, des pratiques artisanales ou un produit qui se démarque du marché.
            </p>
            <p className="mt-[12px] font-manrope text-white/50 text-[13px] leading-[20px]">
              Professionnels de l’accompagnement, de l’assistance technique et de la construction de narratifs propres,
              authentiques et percutants, nous avons à cœur de mener des démarches participatives qui mènent à la
              construction et l’opérationnalisation d’IG, et plus largement à l’accompagnement des collectifs de
              producteurs et artisans pour la valorisation durable de leur activité et de leur territoire.
            </p>
          </section>
          <section>
            <h2 className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">03. VISION</h2>
            <p className="mt-[14px] font-graphik text-white text-[22px] md:text-[26px] leading-[1.25]">
              Un monde où chaque région, chaque communauté, a les moyens de défendre et valoriser son patrimoine culturel
              et économique.
            </p>
          </section>
        </div>

        <div className="mt-[72px] md:mt-[96px]">
          <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ L’ÉQUIPE ]</span>
          <h2 className="font-graphik text-white text-[30px] md:text-[44px] leading-[1.1] mt-[12px]">Les sept experts</h2>
        </div>

        {/* les 7 membres */}
        <ul className="mt-[36px] md:mt-[48px] flex flex-wrap justify-center gap-x-[24px] gap-y-[40px]">
          {MEMBRES.map((m, i) => (
            <li
              key={i}
              className={`w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] flex flex-col items-center text-center border-t border-white/10 pt-[28px] transition-all duration-700 ${EASE} ${ouvert ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: ouvert ? `${200 + i * 80}ms` : '0ms' }}
            >
              <span className="block w-[112px] h-[112px] rounded-full overflow-hidden ring-1 ring-[#AFDDFF]/70 ring-offset-4 ring-offset-black">
                {m.photo ? <img src={m.photo} alt={m.nom} className="w-full h-full object-cover" /> : <Silhouette />}
              </span>
              <span className="font-manrope text-[#AFDDFF]/80 text-[12px] leading-[15.6px] mt-[22px]">
                {String(i + 1).padStart(2, '0')}.
              </span>
              <h2 className="font-graphik text-white text-[22px] leading-[1.15] mt-[6px]">{m.nom}</h2>
              <span className="font-manrope text-[#AFDDFF] text-[12px] leading-[16px] mt-[6px] uppercase tracking-wide">
                {m.expertise}
              </span>
              <p className="font-manrope text-white/60 text-[13px] leading-[20px] mt-[12px] max-w-[260px]">{m.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
