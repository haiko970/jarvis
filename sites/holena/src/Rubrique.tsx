import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { RUBRIQUES, PAGE_PROJET, type Bloc, type Rubrique as R } from './rubriques';

const EASE = 'ease-[cubic-bezier(0.76,0,0.24,1)]';
const TITRE_BLOC = 'font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] uppercase';

function AfficheBloc({ b }: { b: Bloc }) {
  switch (b.type) {
    case 'texte':
      return (
        <section>
          {b.titre && <h2 className={TITRE_BLOC}>{b.titre}</h2>}
          <div className={`flex flex-col gap-[14px] ${b.titre ? 'mt-[14px]' : ''}`}>
            {b.paragraphes.map((p, i) => (
              <p key={i} className="font-manrope text-white/75 text-[15px] leading-[24px]">{p}</p>
            ))}
          </div>
        </section>
      );
    case 'liste':
      return (
        <section>
          <h2 className={TITRE_BLOC}>{b.titre}</h2>
          <ul className="mt-[14px] flex flex-wrap gap-[8px]">
            {b.elements.map((e) => (
              <li key={e} className="font-manrope text-[#AFDDFF] text-[12px] leading-[15.6px] border border-[#AFDDFF]/40 px-[8px] py-[5px]">
                {e}
              </li>
            ))}
          </ul>
        </section>
      );
    case 'infos':
      return (
        <section>
          <h2 className={TITRE_BLOC}>{b.titre}</h2>
          <dl className="mt-[14px] border-t border-white/10">
            {b.lignes.map((l) => (
              <div key={l.label} className="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-[16px] py-[12px] border-b border-white/10">
                <dt className="font-manrope text-white/45 text-[13px] leading-[20px]">{l.label}</dt>
                <dd className="font-manrope text-white text-[14px] leading-[20px]">{l.valeur}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case 'image':
      return (
        <figure>
          <img src={b.src} alt={b.alt} className="w-full border border-white/10" />
          {b.legende && <figcaption className="font-manrope text-white/45 text-[12px] mt-[8px]">{b.legende}</figcaption>}
        </figure>
      );
    case 'aCompleter':
      return (
        <section className="border border-dashed border-[#AFDDFF]/50 p-[20px]">
          <h2 className={TITRE_BLOC}>{b.titre}</h2>
          <p className="font-manrope text-white/50 text-[13px] leading-[20px] mt-[10px]">Texte à venir.</p>
          {/* consigne pour la personne qui complète le site */}
          <p className="sr-only">{b.consigne}</p>
        </section>
      );
  }
}

// Une sous-page : HOLENA Guérande, Pérou, Chili ou Label
export default function Rubrique({ id, onFermer, onAller }: {
  id: R['id'] | null;
  onFermer: () => void;
  onAller: (id: R['id']) => void;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const index = RUBRIQUES.findIndex((r) => r.id === id);
  // On garde la dernière rubrique affichée pendant l'animation de fermeture
  const derniere = useRef<R>(RUBRIQUES[0]);
  if (index >= 0) derniere.current = RUBRIQUES[index];
  const r = derniere.current;
  const i = RUBRIQUES.indexOf(r);
  const precedente = RUBRIQUES[(i + RUBRIQUES.length - 1) % RUBRIQUES.length];
  const suivante = RUBRIQUES[(i + 1) % RUBRIQUES.length];
  const ouvert = index >= 0;

  // La touche Échap ramène à l'accueil
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  // Nouvelle rubrique : on remonte en haut de la page
  useEffect(() => {
    boite.current?.scrollTo({ top: 0 });
  }, [id]);

  return (
    <div
      ref={boite}
      className={`fixed inset-0 z-[55] bg-black overflow-y-auto transition-all duration-700 ${EASE} ${ouvert ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 translate-y-6'}`}
      aria-hidden={!ouvert}
    >
      <div key={r.id} className="max-w-[1100px] mx-auto px-5 md:px-[35px] pt-5 md:pt-[27px] pb-[60px]">
        {/* en-tête */}
        <div className="flex items-center justify-between">
          <button
            onClick={onFermer}
            className="flex items-center gap-[8px] font-manrope text-white text-[13px] leading-[15.6px] hover:text-[#AFDDFF] transition-colors"
          >
            <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={1.5} />
            Retour à l’accueil
          </button>
          {/* accès direct aux 4 rubriques */}
          <nav className="hidden md:flex items-center gap-[28px]">
            {RUBRIQUES.map((x) => (
              <button
                key={x.id}
                onClick={() => onAller(x.id)}
                className={`flex items-center gap-[3px] font-manrope text-[13px] leading-[15.6px] transition-colors ${x.id === r.id ? 'text-[#AFDDFF]' : 'text-white hover:text-[#AFDDFF]'}`}
              >
                <span className="text-[#AFDDFF]/80">{x.numero}.</span>
                {x.court}
              </button>
            ))}
          </nav>
          <span className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px]">HOLENA</span>
        </div>

        {/* haut de page : image + titre */}
        <header className="mt-[48px] md:mt-[72px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-[28px] md:gap-[48px] items-center anim-fade-up">
          <div className={`aspect-square md:aspect-[4/3] border border-white/80 overflow-hidden ${r.image.contenir ? `bg-[#05080a] ${r.image.portrait ? 'p-[3%]' : 'p-[12%]'}` : ''}`}>
            <img src={r.image.src} alt={r.image.alt} className={`w-full h-full ${r.image.contenir ? 'object-contain' : 'object-cover'}`} />
          </div>
          <div className="min-w-0">
            <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">{r.surtitre}</span>
            <h1 className="font-graphik text-white text-[34px] md:text-[52px] leading-[1.05] mt-[14px]">{r.titre}</h1>
            <p className="font-graphik italic text-white/80 text-[18px] md:text-[21px] leading-[1.4] mt-[18px]">{r.chapo}</p>
          </div>
        </header>

        {/* contenu */}
        <div className="mt-[56px] max-w-[760px] flex flex-col gap-[40px]">
          {r.blocs.map((b, n) => (
            <div key={n} className="anim-fade-up" style={{ animationDelay: `${150 + n * 80}ms` }}>
              <AfficheBloc b={b} />
            </div>
          ))}
          <a
            href={PAGE_PROJET}
            target="_blank"
            rel="noreferrer"
            className="self-start font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] hover:underline"
          >
            VOIR_LA_PAGE_SUR_PIAF.SOLUTIONS ↗
          </a>
        </div>

        {/* rubrique précédente / suivante */}
        <div className="mt-[72px] pt-[24px] border-t border-white/10 grid grid-cols-2 gap-[16px]">
          <button onClick={() => onAller(precedente.id)} className="group text-left">
            <span className="flex items-center gap-[6px] font-manrope text-white/45 text-[12px]">
              <ArrowLeft className="w-[13px] h-[13px]" strokeWidth={1.5} /> Précédent
            </span>
            <span className="block font-graphik text-white text-[18px] md:text-[24px] mt-[6px] group-hover:text-[#AFDDFF] transition-colors">
              {precedente.titre}
            </span>
          </button>
          <button onClick={() => onAller(suivante.id)} className="group text-right">
            <span className="flex items-center justify-end gap-[6px] font-manrope text-white/45 text-[12px]">
              Suivant <ArrowRight className="w-[13px] h-[13px]" strokeWidth={1.5} />
            </span>
            <span className="block font-graphik text-white text-[18px] md:text-[24px] mt-[6px] group-hover:text-[#AFDDFF] transition-colors">
              {suivante.titre}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
