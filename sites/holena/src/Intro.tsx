import type { CSSProperties } from 'react';
import logoHolenaHd from './assets/logo-holena-hd.png';

// Nombre de bandes qui composent le logo
const NB_BANDES = 18;

// Chaque bande arrive d'un côté différent (gauche, droite, haut, bas),
// avec une petite rotation. Pas d'aléatoire : l'animation est toujours la même.
const COTES = [
  { x: '-130vw', y: '0' },
  { x: '130vw', y: '0' },
  { x: '0', y: '-120vh' },
  { x: '0', y: '120vh' },
];

const BANDES = Array.from({ length: NB_BANDES }, (_, i) => {
  const cote = COTES[(i * 3 + Math.floor(i / 4)) % 4];
  return {
    fx: cote.x,
    fy: cote.y,
    rot: `${((i * 7) % 5 - 2) * 6}deg`,
    // ordre d'arrivée mélangé, pour que les bandes ne tombent pas dans l'ordre
    delay: 150 + ((i * 5) % NB_BANDES) * 70,
  };
});

// Moments clés (en millisecondes)
const FIN_BANDES = 150 + (NB_BANDES - 1) * 70 + 1100; // la dernière bande est en place
const DEBUT_SORTIE = FIN_BANDES + 700; // le logo s'efface et le site commence

type Props = {
  onSortie: () => void; // le logo commence à s'effacer : on lance le site
  onFin: () => void; // l'intro est terminée : on la retire
};

export default function Intro({ onSortie, onFin }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black intro-sortie"
      style={{ animationDelay: `${DEBUT_SORTIE}ms` }}
      onAnimationStart={(e) => e.animationName === 'introSortie' && onSortie()}
      onAnimationEnd={(e) => e.animationName === 'introSortie' && onFin()}
    >
      <div
        className="relative w-[min(70vw,60vh,460px)] aspect-[1040/940] logo-sortie"
        style={{ animationDelay: `${DEBUT_SORTIE}ms` }}
      >
        {BANDES.map((b, i) => {
          const style = {
            '--fx': b.fx,
            '--fy': b.fy,
            '--rot': b.rot,
            top: `${(i * 100) / NB_BANDES}%`,
            animationDelay: `${b.delay}ms`,
          } as CSSProperties;
          return (
            <div key={i}>
              {/* le trait bleu qui file devant la bande */}
              <div className="absolute left-0 w-full h-px bg-[#AFDDFF] trait-in" style={style} />
              {/* la bande : un morceau du logo */}
              <div
                className="absolute left-0 w-full bande-in"
                style={{
                  ...style,
                  // un léger chevauchement évite les fines lignes entre les bandes
                  height: `calc(${100 / NB_BANDES}% + 1px)`,
                  backgroundImage: `url(${logoHolenaHd})`,
                  backgroundSize: `100% ${NB_BANDES * 100}%`,
                  backgroundPosition: `0 ${(i * 100) / (NB_BANDES - 1)}%`,
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>
          );
        })}

        {/* éclat lumineux quand le logo est complet */}
        <img
          src={logoHolenaHd}
          alt="HOLENA"
          className="absolute inset-0 w-full h-full logo-eclat"
          style={{ animationDelay: `${FIN_BANDES}ms` }}
        />
      </div>

      <button
        className="absolute bottom-5 right-5 md:bottom-[35px] md:right-[35px] font-manrope text-white/50 text-[12px] leading-[15.6px] tracking-wide hover:text-white transition-colors"
        onClick={() => {
          onSortie();
          onFin();
        }}
      >
        PASSER L'INTRO
      </button>
    </div>
  );
}
