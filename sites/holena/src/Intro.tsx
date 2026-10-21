import { useEffect, useRef } from 'react';
import logoHolenaHd from './assets/logo-holena-hd.png';

// ---------------------------------------------------------------
// Intro : des fils fins qui ondulent (comme deux brins d'une corde)
// arrivent de tous les bords, puis s'enroulent pour devenir
// les cercles du logo HOLENA. Ensuite le logo apparaît.
// ---------------------------------------------------------------

// Taille de l'image du logo (en pixels) et position de ses cercles
const LOGO_L = 1040;
const CENTRE_X = 641.5;
const CENTRE_Y = 543;
// Les anneaux du logo : rayon, nombre de paires de fils, épaisseur du trait
const ANNEAUX: { r: number; paires: number; trait: number; cx?: number; cy?: number }[] = [
  { r: 76, paires: 3, trait: 1.4 },
  { r: 162.5, paires: 4, trait: 1.4 },
  { r: 209.5, paires: 4, trait: 1.4 },
  { r: 259, paires: 5, trait: 1.4 },
  // le grand arc fin n'a pas tout à fait le même centre que les autres cercles
  { r: 546.3, paires: 6, trait: 1.2, cx: 520.9, cy: 550.3 },
];

// Moments clés (en millisecondes)
const ARRIVEE = 1800; // durée du trajet d'un fil jusqu'à son cercle
const ENROULEMENT = 1200; // durée pour s'enrouler autour du cercle
const DERNIER_DEPART = 1100; // le dernier fil part à ce moment-là
const LOGO_VISIBLE = 300 + DERNIER_DEPART + ARRIVEE + ENROULEMENT - 200;
const DEBUT_SORTIE = LOGO_VISIBLE + 1300; // le logo s'efface et le site commence

type Paire = { anneau: number; angle: number; arc: number; depart: number; decalage: number };

// On prépare toutes les paires de fils (toujours les mêmes, pas d'aléatoire)
const PAIRES: Paire[] = [];
ANNEAUX.forEach((a, ia) => {
  const pas = (Math.PI * 2) / a.paires;
  for (let j = 0; j < a.paires; j++) {
    const n = PAIRES.length;
    PAIRES.push({
      anneau: ia,
      angle: j * pas + ia * 0.9, // direction d'où arrive le fil (tout autour de l'écran)
      arc: pas * 1.08, // la part du cercle qu'il recouvre (un peu plus, pour bien fermer)
      depart: 300 + ((n * 7) % 22) * (DERNIER_DEPART / 21),
      decalage: n * 1.7,
    });
  }
});

const lisse = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const freine = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

type Props = {
  onSortie: () => void; // le logo commence à s'effacer : on lance le site
  onFin: () => void; // l'intro est terminée : on la retire
};

export default function Intro({ onSortie, onFin }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = toile.current!;
    const ctx = canvas.getContext('2d')!;
    let image = 0;
    const debut = performance.now();

    const dessiner = (maintenant: number) => {
      const t = maintenant - debut;
      const dpr = window.devicePixelRatio || 1;
      const L = window.innerWidth;
      const H = window.innerHeight;
      if (canvas.width !== Math.round(L * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(L * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, L, H);

      // Les fils s'effacent quand le logo apparaît
      const fondu = 1 - lisse((t - LOGO_VISIBLE) / 700);
      if (fondu <= 0) return; // fini : on arrête de dessiner

      // Où se trouvent les cercles du logo à l'écran
      const r = boite.current!.getBoundingClientRect();
      const echelle = r.width / LOGO_L;
      const loin = Math.hypot(L, H) * 0.75; // assez loin pour partir hors de l'écran

      const phase = t * 0.0032; // le mouvement de torsion, comme dans la vidéo
      const longueur = loin * 0.9; // longueur d'un fil
      const onde = 380; // longueur d'une ondulation
      const ampl = 34; // largeur de l'ondulation

      for (const p of PAIRES) {
        const a = ANNEAUX[p.anneau];
        const rayon = a.r * echelle;
        const tp = t - p.depart;
        if (tp <= 0) continue;
        const avance = freine(tp / ARRIVEE); // 0 → 1 : la tête du fil arrive sur son cercle
        const m = lisse((tp - ARRIVEE * 0.82) / ENROULEMENT); // 0 → 1 : le fil s'enroule
        const tete = loin + (rayon - loin) * avance;

        ctx.lineWidth = a.trait;
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * fondu})`;

        // Deux brins par paire : ils se croisent en ondulant
        for (let b = 0; b < 2; b++) {
          ctx.beginPath();
          const N = 90;
          for (let i = 0; i <= N; i++) {
            const u = i / N; // 0 = tête du fil, 1 = queue
            const s = u * longueur;
            // trajet en ligne droite vers le centre...
            const distDroit = tete + s;
            // ...ou enroulé sur le cercle
            const angleCercle = p.angle + (u - 0.5) * p.arc;
            const dist = distDroit + (rayon - distDroit) * m;
            const ang = p.angle + (angleCercle - p.angle) * m;
            // l'ondulation diminue en s'enroulant, et près de la tête
            const env = (1 - m) * lisse(u / 0.12);
            const decal = b === 0 ? 0 : Math.PI * 0.85;
            const amp = (b === 0 ? 1 : 0.8) * ampl * env;
            const ecart = amp * Math.sin((s / onde) * Math.PI * 2 + phase + p.decalage + decal);
            const angFinal = ang + ecart / Math.max(dist, 1);
            const x = r.left + (a.cx ?? CENTRE_X) * echelle + Math.cos(angFinal) * dist;
            const y = r.top + (a.cy ?? CENTRE_Y) * echelle + Math.sin(angFinal) * dist;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      image = requestAnimationFrame(dessiner);
    };

    image = requestAnimationFrame(dessiner);
    return () => cancelAnimationFrame(image);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black intro-sortie"
      style={{ animationDelay: `${DEBUT_SORTIE}ms` }}
      onAnimationStart={(e) => e.animationName === 'introSortie' && onSortie()}
      onAnimationEnd={(e) => e.animationName === 'introSortie' && onFin()}
    >
      <canvas ref={toile} className="absolute inset-0 w-full h-full" />

      <div
        ref={boite}
        className="relative w-[min(70vw,60vh,460px)] aspect-[1040/1102] logo-sortie"
        style={{ animationDelay: `${DEBUT_SORTIE}ms` }}
      >
        {/* le logo apparaît avec un éclat quand les fils ont formé les cercles */}
        <img
          src={logoHolenaHd}
          alt="HOLENA"
          className="absolute inset-0 w-full h-full logo-eclat"
          style={{ animationDelay: `${LOGO_VISIBLE}ms` }}
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
