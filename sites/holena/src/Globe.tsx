import { useEffect, useRef, type PointerEvent as EvPointeur } from 'react';
import pointsTerre from './assets/points-terre.json';
import { ESCALES } from './escales';

// ---------------------------------------------------------------
// Le globe : les continents dessinés en points, les trois marais
// salants en sable, et des « ponts » (des arcs) qui partent de
// Guérande vers Maras (Pérou) et Cahuil (Chili).
// On le fait tourner à la souris ou au doigt.
// ---------------------------------------------------------------

const RAD = Math.PI / 180;
const TERRE = pointsTerre as [number, number][];
// Espace laissé autour du grand globe (pour le texte d’aide en dessous)
const MARGE = 56;

type Props = {
  interactif?: boolean; // vrai : on peut le faire tourner et cliquer sur les sites
  selection?: number | null; // le site choisi (0, 1 ou 2)
  onSelect?: (i: number) => void;
  noms?: boolean; // afficher les noms des sites à côté des points
};

// Un point (longitude, latitude) sur une sphère tournée vers (lon0, lat0)
function projeter(lon: number, lat: number, lon0: number, lat0: number, R: number, h = 0) {
  const φ = lat * RAD;
  const dλ = (lon - lon0) * RAD;
  const φ0 = lat0 * RAD;
  const k = R * (1 + h);
  const x = k * Math.cos(φ) * Math.sin(dλ);
  const y = k * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(dλ));
  const z = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(dλ); // > 0 : face visible
  return { x, y, z };
}

// Les points d'un arc entre deux lieux, qui monte un peu au-dessus du globe
function arc(a: [number, number], b: [number, number], n = 60) {
  const vers = ([lon, lat]: [number, number]) => [
    Math.cos(lat * RAD) * Math.cos(lon * RAD),
    Math.cos(lat * RAD) * Math.sin(lon * RAD),
    Math.sin(lat * RAD),
  ];
  const A = vers(a);
  const B = vers(b);
  const ω = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const pts: { lon: number; lat: number; h: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * ω) / Math.sin(ω);
    const s2 = Math.sin(t * ω) / Math.sin(ω);
    const v = [s1 * A[0] + s2 * B[0], s1 * A[1] + s2 * B[1], s1 * A[2] + s2 * B[2]];
    pts.push({ lon: Math.atan2(v[1], v[0]) / RAD, lat: Math.asin(v[2]) / RAD, h: 0.22 * Math.sin(Math.PI * t) * (ω / 1.6) });
  }
  return pts;
}

const PONTS = [arc(ESCALES[0].coord, ESCALES[1].coord), arc(ESCALES[0].coord, ESCALES[2].coord)];

const lisse = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function Globe({ interactif = false, selection = null, onSelect, noms = false }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);
  // Tout ce qui bouge est gardé ici (pas besoin de redessiner React)
  const etat = useRef({
    lon0: 20, // le globe démarre tourné vers l'Atlantique
    lat0: 8,
    vitesse: 0, // élan après un glissé
    vitesseLat: 0,
    glisse: false,
    dernierX: 0,
    dernierY: 0,
    bouge: 0, // distance parcourue pendant le glissé (pour distinguer un clic)
    vol: null as null | { de: [number, number]; vers: [number, number]; debut: number },
    selection: selection as number | null,
    onSelect,
  });
  etat.current.onSelect = onSelect;

  // Quand on choisit un site, le globe tourne doucement vers lui
  useEffect(() => {
    const e = etat.current;
    e.selection = selection;
    if (selection === null || selection === undefined) return;
    const [lon, lat] = ESCALES[selection].coord;
    let cible = lon;
    while (cible - e.lon0 > 180) cible -= 360;
    while (cible - e.lon0 < -180) cible += 360;
    e.vol = { de: [e.lon0, e.lat0], vers: [cible, Math.max(-50, Math.min(50, lat * 0.7))], debut: performance.now() };
    e.vitesse = 0;
    e.vitesseLat = 0;
  }, [selection]);

  useEffect(() => {
    const canvas = toile.current!;
    const ctx = canvas.getContext('2d')!;
    let image = 0;
    const debut = performance.now();

    const dessiner = (maintenant: number) => {
      const e = etat.current;
      const t = Math.max(0, maintenant - debut) / 1000;
      const dpr = window.devicePixelRatio || 1;
      const L = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== Math.round(L * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(L * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, L, H);

      // Rotation : vol vers un site, élan après un glissé, ou rotation lente
      if (e.vol) {
        const p = Math.min(1, (maintenant - e.vol.debut) / 1400);
        const k = lisse(p);
        e.lon0 = e.vol.de[0] + (e.vol.vers[0] - e.vol.de[0]) * k;
        e.lat0 = e.vol.de[1] + (e.vol.vers[1] - e.vol.de[1]) * k;
        if (p >= 1) e.vol = null;
      } else if (!e.glisse) {
        if (Math.abs(e.vitesse) > 0.01 || Math.abs(e.vitesseLat) > 0.01) {
          e.lon0 -= e.vitesse;
          e.lat0 = Math.max(-60, Math.min(60, e.lat0 + e.vitesseLat));
          e.vitesse *= 0.94;
          e.vitesseLat *= 0.94;
        } else if (e.selection === null) {
          e.lon0 -= interactif ? 0.06 : 0.25; // la planète tourne toute seule
        }
      }

      const cx = L / 2;
      const cy = H / 2;
      const R = Math.min(L, H) / 2 - (interactif ? MARGE : 4);
      const petit = R < 90;

      // la sphère
      const fond = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      fond.addColorStop(0, '#1d1b17');
      fond.addColorStop(1, '#0d0c0a');
      ctx.fillStyle = fond;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(243,239,232,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // halo autour
      const halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.18);
      halo.addColorStop(0, 'rgba(205,183,154,0.14)');
      halo.addColorStop(1, 'rgba(205,183,154,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.fill();

      // les continents
      const taille = petit ? 1.1 : Math.max(1.2, R / 190);
      for (const [lon, lat] of TERRE) {
        const p = projeter(lon, lat, e.lon0, e.lat0, R);
        if (p.z <= 0) continue;
        ctx.fillStyle = `rgba(243,239,232,${0.12 + 0.55 * p.z})`;
        ctx.fillRect(cx + p.x - taille / 2, cy - p.y - taille / 2, taille, taille);
      }

      // les ponts entre Guérande et les deux autres salines
      PONTS.forEach((pts, n) => {
        ctx.strokeStyle = 'rgba(205,183,154,0.75)';
        ctx.lineWidth = petit ? 0.8 : 1.2;
        ctx.beginPath();
        let ouvert = false;
        const proj = pts.map((q) => projeter(q.lon, q.lat, e.lon0, e.lat0, R, q.h));
        proj.forEach((p) => {
          const visible = p.z > 0 || Math.hypot(p.x, p.y) > R;
          if (visible) {
            if (!ouvert) ctx.moveTo(cx + p.x, cy - p.y);
            else ctx.lineTo(cx + p.x, cy - p.y);
            ouvert = true;
          } else ouvert = false;
        });
        ctx.stroke();
        // une petite lumière qui voyage sur le pont
        const k = Math.floor((((t * 0.35 + n * 0.5) % 1) * (proj.length - 1)));
        const p = proj[k];
        if (p.z > 0 || Math.hypot(p.x, p.y) > R) {
          ctx.fillStyle = '#f3efe8';
          ctx.beginPath();
          ctx.arc(cx + p.x, cy - p.y, petit ? 1.4 : 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // les trois marais salants
      ESCALES.forEach((s, i) => {
        const p = projeter(s.coord[0], s.coord[1], e.lon0, e.lat0, R);
        if (p.z <= 0.05) return;
        const x = cx + p.x;
        const y = cy - p.y;
        const choisi = e.selection === i;
        const pouls = (t * 0.8 + i * 0.33) % 1;
        ctx.strokeStyle = `rgba(205,183,154,${(1 - pouls) * 0.9})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, (petit ? 3 : 5) + pouls * (petit ? 6 : 14), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = choisi ? '#f3efe8' : '#cdb79a';
        ctx.beginPath();
        ctx.arc(x, y, petit ? 2.2 : choisi ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
        if (noms) {
          ctx.font = `${choisi ? 500 : 400} 12px Manrope, sans-serif`;
          ctx.fillStyle = choisi ? '#f3efe8' : 'rgba(243,239,232,0.75)';
          ctx.textAlign = s.coord[0] > -30 ? 'left' : 'right';
          ctx.fillText(s.court, x + (ctx.textAlign === 'left' ? 12 : -12), y + 4);
        }
      });

      image = requestAnimationFrame(dessiner);
    };
    image = requestAnimationFrame(dessiner);
    return () => cancelAnimationFrame(image);
  }, [interactif]);

  // --- Glisser pour faire tourner, cliquer sur un site pour le choisir ---
  const appuie = (ev: EvPointeur) => {
    if (!interactif) return;
    const e = etat.current;
    e.glisse = true;
    e.vol = null;
    e.bouge = 0;
    e.dernierX = ev.clientX;
    e.dernierY = ev.clientY;
    (ev.target as Element).setPointerCapture(ev.pointerId);
  };
  const deplace = (ev: EvPointeur) => {
    const e = etat.current;
    if (!e.glisse) return;
    const dx = ev.clientX - e.dernierX;
    const dy = ev.clientY - e.dernierY;
    e.dernierX = ev.clientX;
    e.dernierY = ev.clientY;
    e.bouge += Math.abs(dx) + Math.abs(dy);
    const R = Math.min(toile.current!.clientWidth, toile.current!.clientHeight) / 2;
    const deg = 90 / R; // degrés par pixel
    e.lon0 -= dx * deg;
    e.lat0 = Math.max(-60, Math.min(60, e.lat0 + dy * deg));
    e.vitesse = dx * deg;
    e.vitesseLat = dy * deg;
  };
  const relache = (ev: EvPointeur) => {
    const e = etat.current;
    if (!e.glisse) return;
    e.glisse = false;
    if (e.bouge > 6) return; // c'était un glissé, pas un clic
    // clic : est-ce qu'on a touché un site ?
    const c = toile.current!;
    const r = c.getBoundingClientRect();
    const R = Math.min(c.clientWidth, c.clientHeight) / 2 - MARGE;
    let meilleur = -1;
    let dist = 22;
    ESCALES.forEach((s, i) => {
      const p = projeter(s.coord[0], s.coord[1], e.lon0, e.lat0, R);
      if (p.z <= 0.05) return;
      const d = Math.hypot(ev.clientX - r.left - (c.clientWidth / 2 + p.x), ev.clientY - r.top - (c.clientHeight / 2 - p.y));
      if (d < dist) {
        dist = d;
        meilleur = i;
      }
    });
    if (meilleur >= 0) e.onSelect?.(meilleur);
  };

  return (
    <canvas
      ref={toile}
      className={`w-full h-full block ${interactif ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      onPointerDown={appuie}
      onPointerMove={deplace}
      onPointerUp={relache}
      onPointerCancel={() => (etat.current.glisse = false)}
      aria-label="Globe avec les trois marais salants : Guérande, Maras et Cahuil"
      role="img"
    />
  );
}
