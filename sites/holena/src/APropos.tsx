import { useEffect } from 'react';
import { X } from 'lucide-react';
import logoHolenaHd from './assets/logo-holena-hd.png';

// Panneau « Le collectif HOLENA, qui sommes-nous ? »
// Les textes viennent de la page HOLENA du site piaf.solutions.

const EXPERTISES = [
  'Patrimoine culturel',
  'Ethnologie et socio-histoire',
  'Environnement',
  'Tourisme de savoir-faire',
  'Muséographie et événementiel',
  'Valorisation économique',
  'Production',
  'Création et réactivation de signes d’origine et de qualité',
  'Organisation collective des producteurs',
  'Cahiers des charges et plans de contrôle',
  'Impact territorial durable',
  'Études de marché',
];

const EASE = 'ease-[cubic-bezier(0.76,0,0.24,1)]';

export default function APropos({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  // La touche Échap ferme le panneau
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  return (
    <div className={`fixed inset-0 z-[55] transition-all duration-500 ${EASE} ${ouvert ? 'visible' : 'invisible'}`}>
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-500 ${EASE} ${ouvert ? 'opacity-100' : 'opacity-0'}`}
        onClick={onFermer}
      />
      <aside
        className={`absolute top-0 right-0 h-full w-full md:w-[600px] bg-[var(--noir)] border-l border-[var(--filet)] overflow-y-auto transition-transform duration-500 ${EASE} ${ouvert ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Le collectif HOLENA, qui sommes-nous ?"
      >
        <div className="px-5 md:px-[40px] pt-[24px] pb-[48px]">
          <div className="flex items-start justify-between">
            <span className="font-manrope text-[var(--sable)] text-[13px] leading-[15.6px] tracking-wide pt-[12px]">
              [ QUI SOMMES-NOUS ? ]
            </span>
            <button className="w-[40px] h-[40px] flex items-center justify-center" aria-label="Fermer" onClick={onFermer}>
              <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center gap-[20px] mt-[24px]">
            <img src={logoHolenaHd} alt="Logo HOLENA" className="w-[110px] shrink-0" />
            <h2 className="font-serif-sel italic text-white text-[30px] md:text-[36px] leading-[1.1]">Le collectif HOLENA</h2>
          </div>

          <div className="font-manrope text-white/80 text-[14px] leading-[22px] mt-[32px] flex flex-col gap-[16px]">
            <p>
              <em>HOLENA</em>* est un projet de <strong className="text-white font-medium">coopération internationale</strong> et
              de <strong className="text-white font-medium">solidarité</strong> qui vise à soutenir les{' '}
              <strong className="text-white font-medium">producteurs</strong> et organisations de producteurs artisans et
              paysans dans le monde entier, dans la recherche de développement durable, à travers la reconnaissance et
              l’activation d’impact territorial durable à partir d’une politique de labels de qualité et d’origine.
            </p>
            <p>
              En mettant en lumière leurs savoir-faire, en renforçant leurs capacités et en œuvrant à la{' '}
              <strong className="text-white font-medium">reconnaissance de leurs produits</strong> iconiques, HOLENA cherche
              à bâtir des ponts entre les territoires, les cultures et les acteurs engagés.
            </p>
            <p>
              Notre action repose sur des <strong className="text-white font-medium">missions de conseil, d’expertise technique
              et juridique</strong>, avec un objectif clair : accompagner la mise en place de{' '}
              <strong className="text-white font-medium">Dénominations d’Origine Contrôlée (AOC)</strong> ou d’
              <strong className="text-white font-medium">Indications Géographiques Protégées (IGP)</strong> là où cela a du
              sens et peut générer un impact positif pour les communautés locales, les écosystèmes et la chaîne de valeur.
            </p>
          </div>

          <h3 className="font-manrope text-white text-[14px] leading-[20px] font-medium mt-[32px]">
            Un accompagnement pas à pas, à 360°, avec et autour de l’activité de production :
          </h3>
          <ul className="flex flex-wrap gap-[8px] mt-[14px]">
            {EXPERTISES.map((e) => (
              <li key={e} className="font-manrope text-[var(--sable)] text-[12px] leading-[15.6px] border border-[var(--filet)] px-[8px] py-[5px]">
                {e}
              </li>
            ))}
          </ul>

          <p className="font-manrope italic text-white/50 text-[12px] leading-[18px] mt-[32px] pt-[20px] border-t border-[var(--filet)]">
            * Holena : « récolter le sel » en breton. Un mot-racine pour un projet ancré dans la transmission des savoirs,
            des gestes, le développement durable des territoires et la juste rémunération du travail des producteurs.
          </p>
        </div>
      </aside>
    </div>
  );
}
