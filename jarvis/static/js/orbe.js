// Jarvis : la boule en maillage 3D, le bras filamenteux et les modules (la Terre, la météo…).
// Ce fichier est chargé après le script principal de la page, dont il réutilise les fonctions.
"use strict";

// ---------- Bruit de Perlin 3D : il donne aux mouvements leur côté « vivant » ----------
const PERM = (() => {
  const p = [...Array(256).keys()];
  let seed = 7;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from([...p, ...p]);
})();
function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const u = fade(x), v = fade(y), w = fade(z);
  const grad = (h, x, y, z) => {
    h &= 15;
    const a = h < 8 ? x : y, b = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -a : a) + ((h & 2) ? -b : b);
  };
  const lerp = (t, a, b) => a + t * (b - a);
  const A = PERM[X] + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z, B = PERM[X + 1] + Y, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;
  return lerp(w,
    lerp(v, lerp(u, grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z)), lerp(u, grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z))),
    lerp(v, lerp(u, grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1))));
}

// ---------- La boule : un maillage qui se plie comme un tissu de lumière ----------
const MESH = { nu: 56, nv: 30 };
const meshDirs = [];
for (let j = 0; j <= MESH.nv; j++) {
  const v = 0.04 + (j / MESH.nv) * (Math.PI - 0.08);
  for (let i = 0; i < MESH.nu; i++) {
    const u = (i / MESH.nu) * Math.PI * 2;
    meshDirs.push([Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)]);
  }
}
const meshPts = new Float32Array(meshDirs.length * 3);
Object.assign(orb, { rotY: 0, rotX: 0, tt: 0 });

function mixColor(a, b, k) { return a.map((x, i) => Math.round(x + (b[i] - x) * k)); }

window.orbFrame = function orbFrame() {
  const cv = $("orbCanvas"), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.round(cv.clientWidth * dpr);
  if (!size) return;
  if (cv.width !== size) cv.width = cv.height = size;
  const g = cv.getContext("2d"), W = size, R = W * 0.29, cx = W / 2, cy = W / 2;
  const mode = arm.active ? "bras" : orbMode();

  // Le niveau d'agitation suit ce que fait Jarvis
  let target = { repos: 0.06, ecoute: 0.24, reflechit: 0.18, parle: 0.32, bras: 0.5 }[mode];
  if (mode === "parle") {
    const audio = orbAudioLevel();
    target = audio != null ? 0.14 + audio * 0.9 : 0.24 + orb.pulse * 0.45 + 0.05 * Math.sin(orb.t * 9);
  }
  orb.level += (target - orb.level) * 0.1;
  orb.pulse *= 0.9;
  orb.t += 0.016;
  const lvl = orb.level;
  orb.tt += 0.0035 + lvl * 0.012 + (mode === "reflechit" ? 0.01 : 0);
  orb.rotY += 0.0025 + lvl * 0.006;
  orb.rotX = 0.35 * Math.sin(orb.t * 0.17);

  // Couleur : blanc lumineux, teinté par le thème (2ᵉ couleur quand il écoute)
  const tint = mode === "ecoute" ? orb.colors.ok : orb.colors.c;
  const line = mixColor([255, 255, 255], tint, mode === "ecoute" ? 0.55 : 0.32).join(",");

  // Déformation : un bruit « replié sur lui-même » pour faire des plis comme sur un tissu
  const tt = orb.tt, amp = 0.62 + lvl * 0.55, cyR = Math.cos(orb.rotY), syR = Math.sin(orb.rotY);
  const cxR = Math.cos(orb.rotX), sxR = Math.sin(orb.rotX), F = W * 1.4;
  for (let k = 0; k < meshDirs.length; k++) {
    const [dx, dy, dz] = meshDirs[k];
    // Un « courant d'air » lisse déplace chaque point : le maillage se replie en grands draps
    const f = 1.05;
    const vx = noise3(dx * f + tt, dy * f + 11.3, dz * f - tt * 0.4);
    const vy = noise3(dx * f - 7.1, dy * f + tt * 0.8, dz * f + 3.9);
    const vz = noise3(dx * f + 2.6, dy * f - 5.4, dz * f + tt * 0.6);
    let n = noise3(dx * 1.6 + vx, dy * 1.6 + vy + tt * 0.3, dz * 1.6 + vz);
    if (lvl > 0.2) n += noise3(dx * 3.5 + tt * 3, dy * 3.5, dz * 3.5) * (lvl - 0.2) * 0.6;  // il parle : ça frémit
    const r = R * (0.66 + 0.2 * n), d = R * (1.05 * amp);
    // Une légère torsion autour de l'axe vertical, pour les plis en spirale
    const tw = vy * 1.9 + n * 0.5, ct = Math.cos(tw), st = Math.sin(tw);
    const bx = dx * r + vx * d, bz = dz * r + vz * d;
    let x = bx * ct - bz * st, y = dy * r * 0.92 + vy * d, z = bx * st + bz * ct;
    // Rotation de l'ensemble, puis perspective
    let x2 = x * cyR - z * syR, z2 = x * syR + z * cyR;
    const y2 = y * cxR - z2 * sxR; z2 = y * sxR + z2 * cxR;
    const s = F / (F + z2);
    meshPts[k * 3] = cx + x2 * s; meshPts[k * 3 + 1] = cy + y2 * s; meshPts[k * 3 + 2] = z2;
  }

  g.clearRect(0, 0, W, W);
  // Halo
  const halo = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * (1.75 + lvl * 0.6));
  halo.addColorStop(0, `rgba(${line},${0.10 + lvl * 0.14})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo; g.fillRect(0, 0, W, W);

  // Les fils du maillage, rangés par profondeur : devant = plus lumineux
  const BUCKETS = 6, paths = Array.from({ length: BUCKETS }, () => new Path2D());
  const zr = R * 1.4;
  const seg = (a, b) => {
    const z = (meshPts[a * 3 + 2] + meshPts[b * 3 + 2]) / 2;
    const bucket = Math.max(0, Math.min(BUCKETS - 1, Math.floor(((zr - z) / (2 * zr)) * BUCKETS)));
    const p = paths[bucket];
    p.moveTo(meshPts[a * 3], meshPts[a * 3 + 1]); p.lineTo(meshPts[b * 3], meshPts[b * 3 + 1]);
  };
  const nu = MESH.nu;
  for (let j = 0; j <= MESH.nv; j++) {
    for (let i = 0; i < nu; i++) {
      const k = j * nu + i;
      seg(k, j * nu + ((i + 1) % nu));
      if (j < MESH.nv) seg(k, k + nu);
    }
  }
  g.globalCompositeOperation = "lighter";
  g.lineWidth = 0.75 * dpr;
  for (let b = 0; b < BUCKETS; b++) {
    g.strokeStyle = `rgba(${line},${(0.04 + (b / (BUCKETS - 1)) * 0.26) * (0.85 + lvl * 0.5)})`;
    g.stroke(paths[b]);
  }
  // Lueur douce par-dessus (la même image, floutée)
  g.globalAlpha = 0.55; g.filter = `blur(${Math.round(7 * dpr)}px)`;
  g.drawImage(cv, 0, 0);
  g.filter = "none"; g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};

// ---------- Le bras filamenteux (dessiné par-dessus tout l'écran) ----------
const fx = $("fxCanvas");
const arm = { active: false, from: null, tip: null, grip: 0, alpha: 0, t: 0 };

function fxResize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
  fx.style.width = innerWidth + "px"; fx.style.height = innerHeight + "px";
}
addEventListener("resize", fxResize); fxResize();

function orbScreen() {
  const r = $("orbCanvas").getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.27 };
}
function drawArm() {
  const g = fx.getContext("2d"), dpr = fx.width / innerWidth;
  g.clearRect(0, 0, fx.width, fx.height);
  if (!arm.active) return;
  requestAnimationFrame(drawArm);  // on continue tant que le bras est sorti
  if (!arm.tip) return;
  arm.t += 0.016;
  const o = orbScreen();
  const from = { x: o.x, y: o.y };
  const tip = arm.tip;
  const dx = tip.x - from.x, dy = tip.y - from.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;  // direction perpendiculaire
  const start = { x: from.x + (dx / len) * o.r * 0.7, y: from.y + (dy / len) * o.r * 0.7 };
  const line = mixColor([255, 255, 255], orb.colors.c, 0.32).join(",");
  const STRANDS = 9, STEPS = 46;
  const pts = [];
  for (let k = 0; k < STRANDS; k++) {
    const row = [];
    const lane = (k - (STRANDS - 1) / 2) / ((STRANDS - 1) / 2);  // de -1 à 1
    for (let s = 0; s <= STEPS; s++) {
      const u = s / STEPS;
      const bx = start.x + (tip.x - start.x) * u, by = start.y + (tip.y - start.y) * u;
      // Les fils s'écartent au milieu, se resserrent à la main, et ondulent
      const spread = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (18 + len * 0.05) * (1 - arm.grip * 0.5);
      const wave = noise3(u * 2.6 - arm.t * 1.6, k * 0.37, arm.t * 0.5) * (20 + len * 0.06) * Math.sin(Math.PI * u);
      const off = lane * spread + wave;
      row.push([(bx + nx * off) * dpr, (by + ny * off) * dpr]);
    }
    pts.push(row);
  }
  g.globalCompositeOperation = "lighter";
  g.lineWidth = 0.8 * dpr;
  // Les fils
  for (let k = 0; k < STRANDS; k++) {
    g.strokeStyle = `rgba(${line},${0.32 * arm.alpha})`;
    g.beginPath();
    pts[k].forEach(([x, y], s) => (s ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  // Des liens entre les fils, comme le maillage de la boule
  g.strokeStyle = `rgba(${line},${0.13 * arm.alpha})`;
  g.beginPath();
  for (let k = 0; k < STRANDS - 1; k++) {
    for (let s = 1; s < STEPS; s += 2) {
      g.moveTo(...pts[k][s]); g.lineTo(...pts[k + 1][s + 1]);
    }
  }
  g.stroke();
  // La « main » : quelques doigts recourbés au bout
  g.strokeStyle = `rgba(${line},${0.5 * arm.alpha})`;
  g.lineWidth = 1.1 * dpr;
  for (let f = 0; f < 6; f++) {
    const a = Math.atan2(dy, dx) + (f - 2.5) * (0.42 - arm.grip * 0.22);
    const curl = (0.9 + arm.grip * 0.9) * (f < 3 ? 1 : -1);
    const L = (26 - arm.grip * 8) * dpr;
    const x0 = tip.x * dpr, y0 = tip.y * dpr;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L,
      x0 + Math.cos(a + curl) * L * 0.9, y0 + Math.sin(a + curl) * L * 0.9);
    g.stroke();
  }
  // Une lueur à la main
  const glow = g.createRadialGradient(tip.x * dpr, tip.y * dpr, 0, tip.x * dpr, tip.y * dpr, 34 * dpr);
  glow.addColorStop(0, `rgba(${line},${0.35 * arm.alpha})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow; g.fillRect((tip.x - 40) * dpr, (tip.y - 40) * dpr, 80 * dpr, 80 * dpr);
  g.globalCompositeOperation = "source-over";
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function animate(ms, step) {
  return new Promise((done) => {
    const t0 = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      step(ease(k), k);
      k < 1 ? requestAnimationFrame(frame) : done();
    };
    requestAnimationFrame(frame);
  });
}
function lerpPt(a, b, k) { return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
function armStart() {
  if (!arm.active) { arm.active = true; arm.alpha = 0; requestAnimationFrame(drawArm); }
}
function armStop() { arm.active = false; arm.tip = null; }

// ---------- Les modules ----------
// Chaque module arrive d'un côté de l'écran (angle en degrés : 0 = droite, -90 = haut)
const MODULES = {
  terre: { titre: "Terre", angle: -38, build: buildEarth },
  meteo: { titre: "Météo", angle: 200, panel: () => $("wxPanel") },
  marees: { titre: "Marées", angle: 160, panel: () => $("tidePanel") },
  journee: { titre: "Aujourd'hui", angle: -150, panel: () => $("dayBody").closest("section") },
  ciel: { titre: "Ciel", angle: -70, panel: () => $("skyCard") },
  foot: { titre: "Foot", angle: 20, panel: () => $("footCard") },
  vacances: { titre: "Vacances d'été", angle: -10, panel: () => $("vacBody").closest("section") },
  jeux: { titre: "Temps de jeu", angle: 30, panel: () => $("playBody").closest("section") },
  taches: { titre: "Tâches et mails", angle: -20, panel: () => $("taskBody").closest("section") },
  presence: { titre: "Présence", angle: 150, panel: () => $("ruviewBody").closest("section") },
  discussion: { titre: "Discussion", angle: 95, panel: () => $("chat").closest("section"), large: true },
};
const mod = { name: null, busy: false, edge: null, cleanup: null };

function edgePoint(angle) {
  const o = orbScreen(), a = (angle * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a), m = 70;
  const tx = dx > 0 ? (innerWidth - m - o.x) / dx : dx < 0 ? (m - o.x) / dx : Infinity;
  const ty = dy > 0 ? (innerHeight - m - o.y) / dy : dy < 0 ? (m - o.y) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: o.x + dx * t, y: o.y + dy * t };
}
function placeWin(p, scale, opacity) {
  const w = $("modWin");
  w.style.transform = `translate(${p.x - innerWidth / 2}px, ${p.y - innerHeight / 2}px) translate(-50%, -50%) scale(${scale})`;
  w.style.opacity = opacity;
}

function mountModule(name) {
  const m = MODULES[name], body = $("modBody");
  $("modTitle").textContent = m.titre;
  body.innerHTML = "";
  if (m.build) { mod.cleanup = m.build(body); return; }
  // Un panneau du tableau de bord, emprunté le temps de l'afficher en grand
  const panel = m.panel();
  if (!panel) { body.innerHTML = '<p class="empty">Rien à afficher.</p>'; mod.cleanup = null; return; }
  const home = document.createComment("place du panneau");
  const saved = panel.getAttribute("style") || "";
  const w = panel.offsetWidth || 320, h = panel.offsetHeight || 0;
  panel.parentNode.insertBefore(home, panel);
  panel.style.width = w + "px";
  if (panel.classList.contains("grow")) panel.style.height = Math.max(h, 360) + "px";
  const holder = document.createElement("div");
  holder.className = "mod-panel";
  holder.appendChild(panel);
  body.appendChild(holder);
  if (m.large) {
    panel.style.width = "100%"; panel.style.height = "100%";
    holder.style.cssText = "width: 100%; height: 100%";
    mod.cleanup = () => { home.parentNode.insertBefore(panel, home); home.remove(); panel.setAttribute("style", saved); };
    requestAnimationFrame(scrollDown);
    return;
  }
  const fit = () => {
    const zoom = Math.min((body.clientWidth - 30) / w, (body.clientHeight - 20) / (panel.offsetHeight || 300), 2.4);
    holder.style.zoom = Math.max(1, zoom).toFixed(2);
  };
  fit(); requestAnimationFrame(fit);
  mod.cleanup = () => {
    home.parentNode.insertBefore(panel, home); home.remove();
    panel.setAttribute("style", saved);
  };
}

async function openModule(name, options = {}) {
  if (!MODULES[name] || mod.busy) return;
  if (mod.name === name) { options.cible && earth.focus?.(options.cible); return; }
  if (mod.name) await closeModule();
  mod.busy = true;
  const o = orbScreen(), center = { x: o.x, y: o.y };
  const edge = edgePoint(MODULES[name].angle);
  mod.edge = edge;
  // 1. Le bras sort de la boule et va jusqu'au bord de l'écran
  armStart();
  arm.grip = 0;
  await animate(650, (k) => { arm.tip = lerpPt(center, edge, k); arm.alpha = Math.min(1, k * 2); });
  // 2. Il attrape le module…
  mountModule(name);
  mod.name = name;
  const win = $("modWin");
  win.hidden = false;
  placeWin(edge, 0.12, 0);
  await animate(260, (k) => { arm.grip = k; placeWin(edge, 0.12 + k * 0.06, k); });
  // 3. … le ramène au milieu de l'écran
  const mid = { x: innerWidth / 2, y: innerHeight / 2 };
  await animate(720, (k) => { arm.tip = lerpPt(edge, mid, k); placeWin(arm.tip, 0.18 + k * 0.42, 1); });
  // 4. Le module s'ouvre en grand, la boule se pousse sur le côté et le bras rentre
  document.body.classList.add("module-open");
  await animate(560, (k) => {
    placeWin(mid, 0.6 + k * 0.4, 1);
    arm.grip = 1 - k;
    arm.tip = lerpPt(mid, orbScreen(), k);
    arm.alpha = 1 - k;
  });
  armStop();
  placeWin(mid, 1, 1);
  mod.busy = false;
  if (name === "terre" && options.cible) earth.focus?.(options.cible);
}

async function closeModule() {
  if (!mod.name || mod.busy) return;
  mod.busy = true;
  const mid = { x: innerWidth / 2, y: innerHeight / 2 };
  armStart();
  arm.grip = 0;
  const o = orbScreen();
  // Le bras vient reprendre le module…
  await animate(480, (k) => { arm.tip = lerpPt(o, mid, k); arm.alpha = k; placeWin(mid, 1 - k * 0.4, 1); });
  arm.grip = 1;
  // … le remporte vers son bord…
  const edge = mod.edge || edgePoint(MODULES[mod.name].angle);
  document.body.classList.remove("module-open");
  await animate(620, (k) => { arm.tip = lerpPt(mid, edge, k); placeWin(arm.tip, 0.6 - k * 0.48, 1 - k); });
  $("modWin").hidden = true;
  if (mod.cleanup) mod.cleanup();
  mod.cleanup = null; mod.name = null;
  $("modBody").innerHTML = "";
  // … et rentre dans la boule
  await animate(480, (k) => { arm.grip = 1 - k; arm.tip = lerpPt(edge, orbScreen(), k); arm.alpha = 1 - k; });
  armStop();
  mod.busy = false;
}
window.openModule = openModule;
window.closeModule = closeModule;
$("modClose").onclick = () => closeModule();
addEventListener("resize", () => { if (mod.name && !mod.busy) placeWin({ x: innerWidth / 2, y: innerHeight / 2 }, 1, 1); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && mod.name && !$("panel").classList.contains("open")) closeModule(); });

// ---------- Le module « Terre » : un globe à explorer ----------
const earth = { focus: null };
const PAYS_FR = {
  France: "France", Spain: "Espagne", Portugal: "Portugal", Italy: "Italie", Germany: "Allemagne", Belgium: "Belgique",
  Switzerland: "Suisse", Netherlands: "Pays-Bas", "United Kingdom": "Royaume-Uni", Ireland: "Irlande", Iceland: "Islande",
  Norway: "Norvège", Sweden: "Suède", Finland: "Finlande", Denmark: "Danemark", Poland: "Pologne", Austria: "Autriche",
  Greece: "Grèce", Turkey: "Turquie", Russia: "Russie", Ukraine: "Ukraine", Romania: "Roumanie", Hungary: "Hongrie",
  Croatia: "Croatie", Serbia: "Serbie", Czechia: "Tchéquie", Morocco: "Maroc", Algeria: "Algérie", Tunisia: "Tunisie",
  Egypt: "Égypte", Senegal: "Sénégal", Mali: "Mali", "Côte d'Ivoire": "Côte d'Ivoire", Cameroon: "Cameroun",
  Nigeria: "Nigeria", Kenya: "Kenya", "South Africa": "Afrique du Sud", Madagascar: "Madagascar",
  "Dem. Rep. Congo": "RD Congo", "United States of America": "États-Unis", Canada: "Canada", Mexico: "Mexique",
  Brazil: "Brésil", Argentina: "Argentine", Chile: "Chili", Peru: "Pérou", Colombia: "Colombie", Venezuela: "Venezuela",
  Cuba: "Cuba", Greenland: "Groenland", China: "Chine", Japan: "Japon", "South Korea": "Corée du Sud",
  "North Korea": "Corée du Nord", India: "Inde", Pakistan: "Pakistan", Iran: "Iran", Iraq: "Irak", Israel: "Israël",
  Lebanon: "Liban", "Saudi Arabia": "Arabie saoudite", "United Arab Emirates": "Émirats arabes unis", Qatar: "Qatar",
  Thailand: "Thaïlande", Vietnam: "Vietnam", Indonesia: "Indonésie", Philippines: "Philippines", Malaysia: "Malaisie",
  Mongolia: "Mongolie", Kazakhstan: "Kazakhstan", Afghanistan: "Afghanistan", Australia: "Australie",
  "New Zealand": "Nouvelle-Zélande", "New Caledonia": "Nouvelle-Calédonie", Antarctica: "Antarctique", Taiwan: "Taïwan",
  Syria: "Syrie", Jordan: "Jordanie", Ethiopia: "Éthiopie",
};
function loadScript(src) {
  return new Promise((ok, fail) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
}
let earthLibs = null;
function loadEarthLibs() {
  earthLibs = earthLibs || (async () => {
    await loadScript("/lib/d3-array.min.js");
    await loadScript("/lib/d3-geo.min.js");
    await loadScript("/lib/topojson-client.min.js");
    const [low, high] = await Promise.all(["/lib/countries-110m.json", "/lib/countries-50m.json"].map((u) => fetch(u).then((r) => r.json())));
    return {
      low: topojson.feature(low, low.objects.countries).features,
      high: topojson.feature(high, high.objects.countries).features,
    };
  })();
  return earthLibs;
}

function buildEarth(body) {
  body.innerHTML = `<div class="earth">
    <canvas id="earthCanvas"></canvas>
    <div class="earth-info"><div class="k">Sélection</div><div id="earthPick">Clique sur un pays</div></div>
    <div class="earth-legend" id="earthLegend"></div>
    <div class="earth-tools">
      <button type="button" data-earth="home">📍 Chez moi</button>
      <button type="button" data-earth="iss">🛰️ Suivre l'ISS</button>
      <button type="button" data-earth="spin">↻ Rotation</button>
    </div>
    <div class="earth-load" id="earthLoad">Chargement de la Terre…</div>
  </div>`;
  const cv = $("earthCanvas");
  const st = {
    rot: [2, -30, 0], scale: 0, base: 0, spin: true, follow: false, drag: null, moved: false,
    data: null, pick: null, info: null, lastMove: 0, anim: null, alive: true,
  };
  const setLegend = () => {
    const d = st.info || {};
    const bits = [];
    if (d.ville) bits.push(`<span><i class="dot me"></i>Toi : ${esc(d.ville.nom)}</span>`);
    const iss = issNow();
    if (iss) bits.push(`<span><i class="dot iss"></i>ISS : ${esc(iss.alt)} km d'altitude, ${Math.abs(iss.lat).toFixed(0)}° ${iss.lat >= 0 ? "N" : "S"}</span>`);
    bits.push('<span><i class="dot nuit"></i>Nuit</span>');
    $("earthLegend").innerHTML = bits.join("");
  };
  const issNow = () => {
    const tr = st.info?.iss;
    if (!tr || !tr.length) return null;
    const minutes = (Date.now() - st.infoTime) / 60000;
    const i = Math.min(tr.length - 2, Math.max(0, Math.floor(minutes)));
    const k = Math.min(1, Math.max(0, minutes - i));
    const a = tr[i], b = tr[i + 1];
    let dl = b.lon - a.lon; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
    return { lat: a.lat + (b.lat - a.lat) * k, lon: ((a.lon + dl * k + 540) % 360) - 180, alt: a.alt };
  };
  const loadInfo = async () => {
    try { st.info = await (await fetch("/api/terre")).json(); st.infoTime = Date.now(); } catch (e) {}
    if (st.info?.ville && !st.centered) {
      st.centered = true;
      st.rot = [-st.info.ville.lon, -Math.max(-60, Math.min(60, st.info.ville.lat)) * 0.8, 0];
    }
  };
  const infoTimer = setInterval(loadInfo, 60000);
  loadInfo();

  const flyTo = (lon, lat, zoom) => {
    const from = [...st.rot], fromScale = st.scale;
    let dl = -lon - from[0];
    dl = ((dl + 540) % 360) - 180;
    const to = [from[0] + dl, -lat, 0], toScale = zoom ? st.base * zoom : st.scale;
    st.spin = false; st.follow = false;
    const t0 = performance.now();
    st.anim = (now) => {
      const k = ease(Math.min(1, (now - t0) / 1300));
      st.rot = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, 0];
      st.scale = fromScale + (toScale - fromScale) * k;
      if (k >= 1) st.anim = null;
    };
  };
  const nameOf = (f) => PAYS_FR[f.properties.name] || f.properties.name;
  earth.focus = (target) => {
    if (!st.data) { st.pending = target; return; }
    const f = st.data.low.find((x) => x.properties.name === target);
    if (!f) return;
    st.pick = f;
    $("earthPick").textContent = nameOf(f);
    const [lon, lat] = d3.geoCentroid(f);
    const area = d3.geoArea(f);  // plus le pays est petit, plus on zoome
    flyTo(lon, lat, Math.max(1.1, Math.min(3.2, 0.3 / Math.sqrt(area))));
  };

  const draw = () => {
    if (!st.alive) return;
    requestAnimationFrame(draw);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth * dpr, h = cv.clientHeight * dpr;
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    st.base = Math.min(w, h) * 0.42;
    if (!st.scale) st.scale = st.base;
    if (st.anim) st.anim(performance.now());
    const now = performance.now();
    if (st.follow) {
      const iss = issNow();
      if (iss) {
        let dl = ((-iss.lon - st.rot[0] + 540) % 360) - 180;
        st.rot[0] += dl * 0.05; st.rot[1] += (-iss.lat - st.rot[1]) * 0.05;
      }
    } else if (st.spin && !st.drag && now - st.lastMove > 2500) st.rot[0] += 0.06;
    const g = cv.getContext("2d");
    const proj = d3.geoOrthographic().rotate(st.rot).scale(st.scale).translate([w / 2, h / 2]).clipAngle(90).precision(0.6);
    const path = d3.geoPath(proj, g);
    const c = orb.colors.c.join(","), ok = orb.colors.ok.join(",");
    g.clearRect(0, 0, w, h);
    // Atmosphère
    const atm = g.createRadialGradient(w / 2, h / 2, st.scale * 0.9, w / 2, h / 2, st.scale * 1.18);
    atm.addColorStop(0, `rgba(${c},0.22)`); atm.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = atm; g.fillRect(0, 0, w, h);
    // L'océan
    const sea = g.createRadialGradient(w / 2 - st.scale * 0.3, h / 2 - st.scale * 0.35, st.scale * 0.1, w / 2, h / 2, st.scale);
    sea.addColorStop(0, `rgba(${c},0.16)`); sea.addColorStop(1, "rgba(2,8,14,0.92)");
    g.beginPath(); path({ type: "Sphere" }); g.fillStyle = sea; g.fill();
    // Le quadrillage (méridiens et parallèles), comme un maillage
    g.beginPath(); path(d3.geoGraticule10()); g.strokeStyle = `rgba(${c},0.10)`; g.lineWidth = 0.6 * dpr; g.stroke();
    // Les pays (contours fins quand on bouge, détaillés à l'arrêt)
    const features = st.drag || st.anim || st.follow || (st.spin && now - st.lastMove > 2500) ? st.data.low : st.data.high;
    g.beginPath(); features.forEach((f) => path(f));
    g.fillStyle = `rgba(${c},0.12)`; g.fill();
    g.strokeStyle = `rgba(${c},0.6)`; g.lineWidth = 0.7 * dpr; g.stroke();
    if (st.pick) {
      g.beginPath(); path(st.pick); g.fillStyle = `rgba(${ok},0.28)`; g.fill();
      g.strokeStyle = `rgba(${ok},0.95)`; g.lineWidth = 1.4 * dpr; g.stroke();
    }
    // La nuit : la moitié de la Terre opposée au soleil
    const sun = st.info?.soleil;
    if (sun) {
      const night = d3.geoCircle().center([sun.lon + 180, -sun.lat]).radius(90)();
      g.beginPath(); path(night); g.fillStyle = "rgba(0,0,0,0.42)"; g.fill();
    }
    // Le bord de la Terre
    g.beginPath(); path({ type: "Sphere" }); g.strokeStyle = `rgba(${c},0.75)`; g.lineWidth = 1.2 * dpr; g.stroke();
    // La trajectoire et la position de la Station spatiale
    const tr = st.info?.iss;
    if (tr && tr.length) {
      g.beginPath(); path({ type: "LineString", coordinates: tr.map((p) => [p.lon, p.lat]) });
      g.setLineDash([4 * dpr, 5 * dpr]); g.strokeStyle = `rgba(${ok},0.6)`; g.lineWidth = 1 * dpr; g.stroke(); g.setLineDash([]);
      const iss = issNow();
      if (iss && d3.geoDistance([iss.lon, iss.lat], [-st.rot[0], -st.rot[1]]) < Math.PI / 2) {
        const [x, y] = proj([iss.lon, iss.lat]);
        g.fillStyle = `rgba(${ok},1)`; g.beginPath(); g.arc(x, y, 4 * dpr, 0, 7); g.fill();
        g.strokeStyle = `rgba(${ok},0.5)`; g.beginPath(); g.arc(x, y, (9 + 3 * Math.sin(now / 300)) * dpr, 0, 7); g.stroke();
        g.fillStyle = `rgba(${ok},0.95)`; g.font = `${11 * dpr}px ${getComputedStyle(document.body).fontFamily}`;
        g.fillText("ISS", x + 10 * dpr, y - 8 * dpr);
      }
    }
    // Ta ville
    const me = st.info?.ville;
    if (me && d3.geoDistance([me.lon, me.lat], [-st.rot[0], -st.rot[1]]) < Math.PI / 2) {
      const [x, y] = proj([me.lon, me.lat]);
      const pulse = (now / 1000) % 1.6 / 1.6;
      g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - pulse)})`; g.lineWidth = 1.2 * dpr;
      g.beginPath(); g.arc(x, y, (4 + pulse * 16) * dpr, 0, 7); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 3 * dpr, 0, 7); g.fill();
      g.font = `${12 * dpr}px ${getComputedStyle(document.body).fontFamily}`;
      g.fillText(me.nom, x + 9 * dpr, y + 4 * dpr);
    }
    if (now - (st.legendTime || 0) > 1000) { st.legendTime = now; setLegend(); }
  };

  // Souris : glisser pour tourner, molette pour zoomer, clic pour choisir un pays
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)]; };
  cv.onpointerdown = (e) => { st.drag = { x: e.clientX, y: e.clientY, rot: [...st.rot] }; st.moved = false; st.anim = null; st.follow = false; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => {
    if (!st.drag) return;
    const k = 75 / (st.scale / (window.devicePixelRatio || 1));
    const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) st.moved = true;
    st.rot = [st.drag.rot[0] + dx * k, Math.max(-89, Math.min(89, st.drag.rot[1] - dy * k)), 0];
    st.lastMove = performance.now();
  };
  cv.onpointerup = (e) => {
    const wasDrag = st.moved;
    st.drag = null; st.lastMove = performance.now();
    if (wasDrag || !st.data) return;
    const proj = d3.geoOrthographic().rotate(st.rot).scale(st.scale).translate([cv.width / 2, cv.height / 2]);
    const lonlat = proj.invert(pos(e));
    const f = lonlat && st.data.low.find((x) => d3.geoContains(x, lonlat));
    st.pick = f || null;
    $("earthPick").textContent = f ? nameOf(f) : "Océan";
  };
  cv.onwheel = (e) => {
    e.preventDefault();
    st.scale = Math.max(st.base * 0.7, Math.min(st.base * 9, st.scale * Math.exp(-e.deltaY * 0.0012)));
    st.lastMove = performance.now(); st.anim = null;
  };
  body.querySelector(".earth-tools").onclick = (e) => {
    const b = e.target.closest("[data-earth]");
    if (!b) return;
    if (b.dataset.earth === "home" && st.info?.ville) flyTo(st.info.ville.lon, st.info.ville.lat, 3);
    if (b.dataset.earth === "iss") { st.follow = !st.follow; st.spin = false; }
    if (b.dataset.earth === "spin") { st.spin = !st.spin; st.follow = false; st.lastMove = 0; }
  };

  loadEarthLibs().then((data) => {
    st.data = data;
    $("earthLoad").remove();
    requestAnimationFrame(draw);
    if (st.pending) { earth.focus(st.pending); st.pending = null; }
  }).catch(() => { $("earthLoad").textContent = "Impossible de charger la carte."; });

  return () => { st.alive = false; clearInterval(infoTimer); earth.focus = null; };
}
earth.focus = null;

// ---------- Le module « Carte de connaissances » : une constellation de ce que Jarvis sait de toi ----------
const KG_COLORS = {
  moi: [255, 255, 255], personne: [255, 184, 120], lieu: [120, 200, 255], ecole: [185, 150, 255], club: [120, 255, 170],
  jeu: [255, 120, 205], animal: [255, 222, 120], objet: [205, 205, 215], evenement: [255, 140, 120], date: [150, 232, 232],
  passion: [255, 150, 175], autre: [170, 190, 210],
};
const KG_NAMES = {
  moi: "Toi", personne: "Personnes", lieu: "Lieux", ecole: "École", club: "Clubs", jeu: "Jeux", animal: "Animaux",
  objet: "Objets", evenement: "Événements", date: "Dates", passion: "Passions", autre: "Autres",
};

function buildGraph(body) {
  body.innerHTML = `<div class="kg">
    <canvas id="kgCanvas"></canvas>
    <div class="kg-legend" id="kgLegend"></div>
    <div class="kg-side" id="kgSide"></div>
    <form class="kg-add" id="kgAdd" autocomplete="off" title="Ajouter une info à la main">
      <input name="de" placeholder="Léa"><input name="rel" placeholder="amie de"><input name="vers" placeholder="moi">
      <button type="submit" title="Ajouter">＋</button>
    </form>
    <div class="kg-empty" id="kgEmpty" hidden>Ta carte est presque vide. Parle-moi de toi : tes amis, ta famille,
      tes jeux, ton club… je la remplirai au fil de nos discussions.</div>
  </div>`;
  const cv = $("kgCanvas");
  const st = { nodes: new Map(), links: [], yaw: 0.4, pitch: -0.25, zoom: 1, sel: null, hover: null, drag: null, alive: true, last: 0 };

  const refresh = async () => {
    let data;
    try { data = await (await fetch("/api/connaissances")).json(); } catch (e) { return; }
    apply(data);
  };
  const apply = (data) => {
    const keep = new Map();
    for (const [id, n] of Object.entries(data.noeuds)) {
      const old = st.nodes.get(id);
      // Un nouveau point apparaît près de ses voisins (ou au hasard), puis trouve sa place
      const a = Math.random() * 6.28, b = Math.acos(2 * Math.random() - 1), r = id === "moi" ? 0 : 90;
      keep.set(id, old ? Object.assign(old, n) : { id, ...n, x: r * Math.sin(b) * Math.cos(a), y: r * Math.cos(b), z: r * Math.sin(b) * Math.sin(a), vx: 0, vy: 0, vz: 0, born: performance.now() });
    }
    st.nodes = keep;
    st.links = data.liens.filter((l) => keep.has(l.de) && keep.has(l.vers));
    for (const n of keep.values()) n.deg = 0;
    for (const l of st.links) { keep.get(l.de).deg++; keep.get(l.vers).deg++; }
    $("kgEmpty").hidden = st.links.length > 2;
    const types = [...new Set([...keep.values()].map((n) => n.type))];
    $("kgLegend").innerHTML = types.map((t) => `<span><i style="background: rgb(${(KG_COLORS[t] || KG_COLORS.autre).join(",")})"></i>${KG_NAMES[t] || t}</span>`).join("");
    if (st.sel && !keep.has(st.sel)) st.sel = null;
    showSide();
    for (let i = 0; i < 120; i++) layoutStep(1);
  };
  // Une toile qui s'organise toute seule : les points se repoussent, les liens les rapprochent
  const layoutStep = (k) => {
    const nodes = [...st.nodes.values()];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        const d2 = dx * dx + dy * dy + dz * dz + 0.01, f = (1800 / d2) * k;
        const d = Math.sqrt(d2);
        dx /= d; dy /= d; dz /= d;
        a.vx += dx * f; a.vy += dy * f; a.vz += dz * f; b.vx -= dx * f; b.vy -= dy * f; b.vz -= dz * f;
      }
    }
    for (const l of st.links) {
      const a = st.nodes.get(l.de), b = st.nodes.get(l.vers);
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
      const f = (d - 70) * 0.02 * k;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f; a.vz += (dz / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; b.vz -= (dz / d) * f;
    }
    for (const n of nodes) {
      if (n.id === "moi") { n.x = n.y = n.z = 0; n.vx = n.vy = n.vz = 0; continue; }
      n.vx -= n.x * 0.004; n.vy -= n.y * 0.004; n.vz -= n.z * 0.004;  // tout reste groupé autour de toi
      n.x += (n.vx = n.vx * 0.6); n.y += (n.vy = n.vy * 0.6); n.z += (n.vz = n.vz * 0.6);
    }
  };
  const neighbors = (id) => st.links.filter((l) => l.de === id || l.vers === id);
  const nameOf = (id) => (id === "moi" ? "toi" : st.nodes.get(id)?.nom || id);
  const showSide = () => {
    const side = $("kgSide");
    const n = st.sel && st.nodes.get(st.sel);
    if (!n) {
      side.innerHTML = `<div class="k">Ta carte</div><div class="v">${st.nodes.size} points · ${st.links.length} liens</div>
        <div class="s">Clique sur un point pour voir ce que je sais. Glisse pour tourner, molette pour zoomer.</div>`;
      return;
    }
    const rows = neighbors(n.id).map((l, i) => {
      const txt = l.de === n.id ? `→ ${esc(l.rel)} → <b>${esc(nameOf(l.vers))}</b>` : `<b>${esc(nameOf(l.de))}</b> → ${esc(l.rel)} →`;
      return `<li>${txt}<button type="button" data-kg-del="${i}" title="Oublier ce lien">✕</button></li>`;
    });
    side.innerHTML = `<div class="k">${esc(KG_NAMES[n.type] || n.type)}</div><div class="v">${esc(n.id === "moi" ? n.nom + " (toi)" : n.nom)}</div>
      <ul>${rows.join("") || "<li>Aucun lien.</li>"}</ul>
      ${n.id !== "moi" ? '<button type="button" class="kg-forget" data-kg-forget>🗑 Oublier ce point</button>' : ""}`;
    side.querySelectorAll("[data-kg-del]").forEach((b) => {
      b.onclick = async () => {
        const l = neighbors(n.id)[+b.dataset.kgDel];
        apply(await (await fetch("/api/connaissances", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "oublier_lien", de: l.de, rel: l.rel, vers: l.vers }) })).json());
      };
    });
    const forget = side.querySelector("[data-kg-forget]");
    if (forget) forget.onclick = async () => {
      st.sel = null;
      apply(await (await fetch("/api/connaissances", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "oublier_noeud", id: n.id }) })).json());
    };
  };
  $("kgAdd").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, data = { action: "ajouter", de: f.de.value.trim(), rel: f.rel.value.trim(), vers: f.vers.value.trim() };
    if (!data.de || !data.rel || !data.vers) return;
    apply(await (await fetch("/api/connaissances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })).json());
    f.reset();
  };

  let projected = [];
  const draw = () => {
    if (!st.alive) return;
    requestAnimationFrame(draw);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth * dpr, h = cv.clientHeight * dpr;
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    layoutStep(0.15);
    if (!st.drag) st.yaw += 0.0018;
    const g = cv.getContext("2d"), now = performance.now();
    g.clearRect(0, 0, w, h);
    // La toile remplit la fenêtre (à gauche du panneau d'infos), puis la molette zoome
    let radius = 60;
    for (const n of st.nodes.values()) radius = Math.max(radius, Math.hypot(n.x, n.y, n.z));
    const side = 280 * dpr, cxs = (w - side) / 2, F = 600;
    const fit = Math.min(cxs, h / 2 - 40 * dpr) * 0.8 / radius;
    st.fit = st.fit ? st.fit + (fit - st.fit) * 0.05 : fit;  // en douceur quand la toile grandit
    const scale = st.fit * st.zoom;
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    projected = [];
    for (const n of st.nodes.values()) {
      const x1 = n.x * cy - n.z * sy, z1 = n.x * sy + n.z * cy;
      const y2 = n.y * cp - z1 * sp, z2 = n.y * sp + z1 * cp;
      const s = F / (F + z2);
      projected.push({ n, x: cxs + x1 * s * scale, y: h / 2 - 22 * dpr + y2 * s * scale, z: z2, s });
    }
    const pos = new Map(projected.map((p) => [p.n.id, p]));
    const focus = st.hover || st.sel;
    const near = new Set(focus ? neighbors(focus).flatMap((l) => [l.de, l.vers]) : []);
    // Les liens : des filaments lumineux
    g.globalCompositeOperation = "lighter";
    for (const l of st.links) {
      const a = pos.get(l.de), b = pos.get(l.vers);
      const lit = focus && (l.de === focus || l.vers === focus);
      const depth = Math.max(0.25, Math.min(1, 0.65 - (a.z + b.z) / 600));
      g.strokeStyle = lit ? `rgba(${orb.colors.c.join(",")},0.85)` : `rgba(${orb.colors.c.join(",")},${0.22 * depth})`;
      g.lineWidth = (lit ? 1.6 : 0.8) * dpr;
      // Un filament légèrement courbé, qui ondule
      const mx = (a.x + b.x) / 2 + noise3(a.x * 0.01, b.y * 0.01, now / 2500) * 18 * dpr;
      const my = (a.y + b.y) / 2 + noise3(b.x * 0.01, a.y * 0.01, now / 2500 + 5) * 18 * dpr;
      g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke();
    }
    // Les points, du plus loin au plus proche
    projected.sort((p, q) => q.z - p.z);
    const font = getComputedStyle(document.body).fontFamily;
    for (const p of projected) {
      const n = p.n, col = (KG_COLORS[n.type] || KG_COLORS.autre).join(",");
      const grow = Math.min(1, (now - (n.born || 0)) / 900);  // un nouveau point « éclot »
      const r = (n.id === "moi" ? 9 : 3.2 + Math.sqrt(n.deg) * 1.6) * p.s * dpr * Math.max(0.2, grow);
      const dim = focus && n.id !== focus && !near.has(n.id) ? 0.25 : 1;
      const glow = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      glow.addColorStop(0, `rgba(${col},${0.45 * dim})`); glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow; g.beginPath(); g.arc(p.x, p.y, r * 4, 0, 7); g.fill();
      g.fillStyle = `rgba(${col},${0.95 * dim})`; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill();
      if (n.id === st.sel) { g.strokeStyle = `rgba(${col},0.9)`; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(p.x, p.y, r + 6 * dpr, 0, 7); g.stroke(); }
      const label = st.nodes.size <= 30 || n.deg >= 2 || n.id === focus || near.has(n.id) || n.id === "moi";
      if (label && dim === 1) {
        g.globalCompositeOperation = "source-over";
        g.font = `${(n.id === "moi" ? 13 : 11.5) * dpr}px ${font}`;
        g.fillStyle = `rgba(235,245,255,${0.5 + 0.5 * Math.min(1, p.s)})`;
        g.fillText(n.id === "moi" ? n.nom : n.nom, p.x + r + 5 * dpr, p.y + 4 * dpr);
        g.globalCompositeOperation = "lighter";
      }
    }
    g.globalCompositeOperation = "source-over";
  };
  const pick = (e) => {
    const r = cv.getBoundingClientRect(), dpr = cv.width / r.width;
    const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
    let best = null, bd = 16 * dpr;
    for (const p of projected) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p.n.id; } }
    return best;
  };
  cv.onpointerdown = (e) => { st.drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => {
    if (st.drag) {
      const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) st.drag.moved = true;
      st.yaw = st.drag.yaw + dx * 0.008; st.pitch = Math.max(-1.3, Math.min(1.3, st.drag.pitch + dy * 0.008));
    } else {
      st.hover = pick(e); cv.style.cursor = st.hover ? "pointer" : "grab";
    }
  };
  cv.onpointerup = (e) => {
    const moved = st.drag?.moved;
    st.drag = null;
    if (!moved) { st.sel = pick(e); showSide(); }
  };
  cv.onpointerleave = () => { st.hover = null; };
  cv.onwheel = (e) => { e.preventDefault(); st.zoom = Math.max(0.4, Math.min(4, st.zoom * Math.exp(-e.deltaY * 0.0012))); };

  refresh().then(() => requestAnimationFrame(draw));
  // Pendant que tu parles avec Jarvis, les nouvelles infos apparaissent sur la carte
  const timer = setInterval(refresh, 6000);
  return () => { st.alive = false; clearInterval(timer); };
}
MODULES.connaissances = { titre: "Carte de connaissances", angle: -120, build: buildGraph };
