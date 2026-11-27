// L'œil de Jarvis : avions, bateaux, satellites, séismes et caméras publiques, en direct sur la Terre.
// Toutes les données sont réelles ; Jarvis (jarvis/oeil.py) va les chercher auprès des services publics.

const OEIL_CALQUES = {
  avions: { nom: "✈️ Avions", couleur: [255, 206, 84], defaut: true },
  militaires: { nom: "🎖️ Militaires", couleur: [255, 100, 86], defaut: false },
  bateaux: { nom: "🚢 Bateaux", couleur: [80, 232, 200], defaut: true },
  satellites: { nom: "🛰️ Satellites", couleur: [190, 150, 255], defaut: true },
  seismes: { nom: "🌋 Séismes", couleur: [255, 120, 60], defaut: true },
  cameras: { nom: "📷 Caméras", couleur: [140, 200, 255], defaut: true },
};
const OEIL_SATS = { principaux: "principaux", starlink: "Starlink", gps: "GPS / Galileo", meteo: "météo", tous: "tous (~12 000)" };
const OEIL_RAD = Math.PI / 180;

function oeilMemoire(cle, valeur) {  // petits réglages gardés dans le navigateur (calques cochés…)
  try {
    if (valeur === undefined) return JSON.parse(localStorage.getItem("oeil_" + cle));
    localStorage.setItem("oeil_" + cle, JSON.stringify(valeur));
  } catch (e) { return null; }
}

// Position actuelle d'un objet qui avance tout droit (cap en degrés, vitesse en km/h) depuis dt secondes
function oeilAvance(lat, lon, cap, kmh, dt) {
  if (!kmh || cap == null || dt <= 0) return [lon, lat];
  const d = Math.min(kmh * dt / 3600, 400) / 6371;  // distance en radians, limitée (données trop vieilles)
  const p1 = lat * OEIL_RAD, l1 = lon * OEIL_RAD, c = cap * OEIL_RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(c));
  const l2 = l1 + Math.atan2(Math.sin(c) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [((l2 / OEIL_RAD + 540) % 360) - 180, p2 / OEIL_RAD];
}

function creerOeil(st, root) {
  const on = Object.assign(Object.fromEntries(Object.entries(OEIL_CALQUES).map(([k, v]) => [k, v.defaut])), oeilMemoire("calques") || {});
  const live = { avions: null, militaires: null, bateaux: null, satellites: null, seismes: null, cameras: null };
  const quand = {}, enCours = {}, erreurs = {};
  let groupe = oeilMemoire("groupe") || "principaux";
  let sel = null, suivre = false, alive = true, camTimer = null;

  // ---------- Le panneau des calques ----------
  root.insertAdjacentHTML("beforeend", `
    <div class="oeil-calques" id="oeilCalques">
      ${Object.entries(OEIL_CALQUES).map(([k, v]) => `<button type="button" data-calque="${k}" class="${on[k] ? "on" : ""}"
        style="--cc:${v.couleur.join(",")}">${v.nom} <b id="oeilN_${k}"></b></button>`).join("")}
      <select id="oeilGroupe" title="Quels satellites ?">${Object.entries(OEIL_SATS).map(([k, v]) =>
        `<option value="${k}" ${k === groupe ? "selected" : ""}>Satellites : ${v}</option>`).join("")}</select>
      <div class="oeil-etat" id="oeilEtat">Connexion aux données en direct…</div>
    </div>
    <div class="oeil-fiche" id="oeilFiche" hidden></div>`);
  root.querySelector("#oeilCalques").onclick = (e) => {
    const b = e.target.closest("[data-calque]");
    if (!b) return;
    const k = b.dataset.calque;
    on[k] = !on[k]; b.classList.toggle("on", on[k]);
    oeilMemoire("calques", on);
    if (on[k]) quand[k] = 0;  // on recharge tout de suite
    if (sel && sel.kind === k && !on[k]) fermerFiche();
  };
  root.querySelector("#oeilGroupe").onchange = (e) => {
    groupe = e.target.value; oeilMemoire("groupe", groupe);
    live.satellites = null; quand.satellites = 0;
    if (!on.satellites) root.querySelector('[data-calque="satellites"]').click();
  };

  // ---------- Aller chercher les données ----------
  const centre = () => [-st.rot[1], ((-st.rot[0] + 540) % 360) - 180];  // [lat, lon] de ce qu'on regarde
  const charger = async (k, url, chaque) => {
    if (!on[k] || enCours[k] || Date.now() - (quand[k] || 0) < chaque) return;
    enCours[k] = true; quand[k] = Date.now();
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok || d.erreur) throw new Error(d.erreur || r.status);
      d.recu = Date.now();
      live[k] = d; delete erreurs[k];
    } catch (e) { erreurs[k] = String(e.message || e); }
    enCours[k] = false;
  };
  let dernierCentre = null, dernierLarge = null;
  const tick = () => {
    if (!alive) return;
    const [lat, lon] = centre();
    // On a bougé la Terre : on redemande les avions et les bateaux de la nouvelle zone
    if (dernierCentre && (Math.abs(lat - dernierCentre[0]) > 2 || Math.abs(((lon - dernierCentre[1] + 540) % 360) - 180) > 3)) {
      quand.avions = 0; quand.bateaux = 0;
      if (live.cameras?.windy) quand.cameras = 0;
    }
    dernierCentre = [lat, lon];
    const pos = `lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;
    const large = st.scale / st.base < 4;  // vue de loin : 7 zones d'avions au lieu d'une
    if (large !== dernierLarge) { dernierLarge = large; quand.avions = 0; }
    charger("avions", `/api/oeil/avions?${pos}${large ? "&large=1" : ""}`, large ? 15000 : 10000);
    charger("militaires", "/api/oeil/militaires", 20000);
    charger("bateaux", `/api/oeil/bateaux?${pos}`, 15000);
    charger("satellites", `/api/oeil/satellites?groupe=${groupe}`, 20000);
    charger("seismes", "/api/oeil/seismes", 60000);
    charger("cameras", `/api/oeil/cameras?${pos}`, live.cameras ? 600000 : 0);
    etat();
  };
  const timer = setInterval(tick, 1500);

  const etat = () => {
    for (const k of Object.keys(OEIL_CALQUES)) {
      const n = $("oeilN_" + k);
      if (!n) continue;
      const liste = liveListe(k);
      n.textContent = on[k] ? (erreurs[k] && !liste.length ? "⚠" : liste.length ? liste.length.toLocaleString("fr-FR") : "…") : "";
      n.title = erreurs[k] || "";
    }
    const bits = [];
    const a = live.avions;
    if (on.avions && a) bits.push(`Avions : ${(a.zones || [1]).length > 1 ? "~3 000 km" : `${a.rayon_km * 2} km`} autour du centre de la vue`);
    if (on.bateaux && live.bateaux) bits.push(`Bateaux : ${live.bateaux.sources.join(" + ") || "aucune source"}`
      + (live.bateaux.sources.includes("AISstream") ? "" : " (Baltique ; ajoute une clé AISstream pour le monde entier)"));
    if (on.cameras && live.cameras && !live.cameras.windy) bits.push("Caméras : Londres + Finlande (ajoute une clé Windy pour le monde entier)");
    const err = Object.entries(erreurs).filter(([k]) => on[k]).map(([k, e]) => `${OEIL_CALQUES[k].nom} : ${e}`);
    $("oeilEtat").innerHTML = ["🔴 EN DIRECT", ...bits].map(esc).join("<br>") + (err.length ? "<br>⚠ " + err.map(esc).join("<br>⚠ ") : "");
  };

  const liveListe = (k) => {
    const d = live[k];
    if (!d) return [];
    return d.avions || d.bateaux || d.satellites || d.seismes || d.cameras || [];
  };

  // ---------- Où est chaque objet en ce moment ----------
  // Renvoie [lon, lat] (les avions et bateaux avancent entre deux mises à jour)
  const ou = (k, o, now) => {
    if (k === "avions" || k === "militaires") {
      const dt = (now - live[k].recu) / 1000 + (o.age || 0);
      return o.sol ? [o.lon, o.lat] : oeilAvance(o.lat, o.lon, o.cap, o.vitesse, dt);
    }
    if (k === "bateaux") {
      const dt = (now - live[k].recu) / 1000 + Math.max(0, live[k].heure - (o.heure || live[k].heure));
      return o.vitesse > 0.5 ? oeilAvance(o.lat, o.lon, o.cap, o.vitesse, Math.min(dt, 600)) : [o.lon, o.lat];
    }
    if (k === "satellites") {
      const f = (Date.now() / 1000 - live.satellites.t0) / 60;  // entre la position actuelle et celle dans 1 min
      let dl = o[5] - o[2]; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
      return [((o[2] + dl * f + 540) % 360) - 180, o[1] + (o[4] - o[1]) * f];
    }
    return [o.lon, o.lat];
  };

  // ---------- Dessin ----------
  const draw = (g, proj, dpr, now) => {
    const c0 = centre(), s0 = Math.sin(c0[0] * OEIL_RAD), k0 = Math.cos(c0[0] * OEIL_RAD);
    const visible = (lon, lat) => {
      const p = lat * OEIL_RAD;
      return s0 * Math.sin(p) + k0 * Math.cos(p) * Math.cos((lon - c0[1]) * OEIL_RAD) > 0.02;
    };
    const zoom = st.scale / st.base, wall = Date.now();
    const labels = zoom > 4;
    g.font = `${10 * dpr}px ${getComputedStyle(document.body).fontFamily}`;

    // La zone où les avions sont demandés
    const za = live.avions;
    if (on.avions && za) {
      g.beginPath();
      const chemin = d3.geoPath(proj, g);
      for (const z of za.zones || [za.centre]) chemin(d3.geoCircle().center([z[1], z[0]]).radius(za.rayon_km / 111.2)());
      g.setLineDash([3 * dpr, 6 * dpr]); g.strokeStyle = "rgba(255,206,84,0.25)"; g.lineWidth = 1 * dpr; g.stroke(); g.setLineDash([]);
    }
    // Séismes : un cercle par séisme, plus gros s'il est fort, qui pulse s'il date de moins d'une heure
    if (on.seismes && live.seismes) {
      for (const s of live.seismes.seismes) {
        if (!visible(s.lon, s.lat)) continue;
        const [x, y] = proj([s.lon, s.lat]);
        const r = Math.max(2, Math.pow(Math.max(s.mag, 0.5), 1.5) * 1.3) * dpr * Math.min(2, Math.sqrt(zoom));
        const age = (wall / 1000 - s.heure) / 3600;
        const a = Math.max(0.25, 1 - age / 24);
        g.fillStyle = `rgba(255,${s.mag >= 5 ? 70 : 140},60,${0.35 * a})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.strokeStyle = `rgba(255,140,60,${0.9 * a})`; g.lineWidth = 1 * dpr; g.stroke();
        if (age < 1) {
          const p = (now / 1400) % 1;
          g.strokeStyle = `rgba(255,120,60,${1 - p})`; g.beginPath(); g.arc(x, y, r + p * 22 * dpr, 0, 7); g.stroke();
        }
        if (labels && s.mag >= 2.5) { g.fillStyle = "rgba(255,170,120,0.95)"; g.fillText(`M${s.mag}`, x + r + 3 * dpr, y + 3 * dpr); }
      }
    }
    // Satellites : de petits points qui filent (leur point au sol)
    if (on.satellites && live.satellites) {
      const list = live.satellites.satellites, petits = list.length > 1500;
      g.fillStyle = "rgba(190,150,255,0.85)";
      for (const o of list) {
        const [lon, lat] = ou("satellites", o, now);
        if (!visible(lon, lat)) continue;
        const [x, y] = proj([lon, lat]);
        const station = /ISS|TIANGONG|CSS/.test(o[0]);
        const r = (station ? 3 : petits ? 0.9 : 1.6) * dpr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
        if (station || (labels && !petits)) g.fillText(o[0], x + 5 * dpr, y - 4 * dpr);
      }
    }
    // Caméras : petits carrés bleus
    if (on.cameras && live.cameras) {
      g.strokeStyle = "rgba(140,200,255,0.9)"; g.lineWidth = 1 * dpr;
      const r = (zoom > 6 ? 3 : 1.6) * dpr;
      for (const o of live.cameras.cameras) {
        if (!visible(o.lon, o.lat)) continue;
        const [x, y] = proj([o.lon, o.lat]);
        g.strokeRect(x - r, y - r, r * 2, r * 2);
      }
    }
    // Bateaux (losanges) puis avions (flèches orientées dans leur direction)
    const fleche = (x, y, ang, taille, couleur) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = couleur; g.beginPath();
      g.moveTo(0, -taille); g.lineTo(taille * 0.65, taille * 0.8); g.lineTo(0, taille * 0.35); g.lineTo(-taille * 0.65, taille * 0.8);
      g.closePath(); g.fill(); g.restore();
    };
    const angleEcran = (lon, lat, cap, x, y) => {  // la direction du cap, vue sur l'écran
      const [lo2, la2] = oeilAvance(lat, lon, cap, 3600, 30);
      const [x2, y2] = proj([lo2, la2]);
      return Math.atan2(x2 - x, -(y2 - y));
    };
    for (const k of ["bateaux", "militaires", "avions"]) {
      if (!on[k] || !live[k]) continue;
      const list = liveListe(k), coul = OEIL_CALQUES[k].couleur.join(",");
      const taille = (k === "bateaux" ? 3 : 4.5) * dpr * Math.min(1.8, Math.max(0.8, Math.sqrt(zoom) / 1.5));
      const vus = [];
      for (const o of list) {
        const [lon, lat] = ou(k, o, now);
        if (!visible(lon, lat)) continue;
        const [x, y] = proj([lon, lat]);
        if (x < -20 || y < -20 || x > g.canvas.width + 20 || y > g.canvas.height + 20) continue;
        vus.push([o, lon, lat, x, y]);
      }
      const noms = zoom > 2.5 && vus.length <= 70;  // les noms seulement quand il y a de la place
      for (const [o, lon, lat, x, y] of vus) {
        const bouge = k === "bateaux" ? o.vitesse > 0.5 : !o.sol;
        if (bouge && o.cap != null) fleche(x, y, angleEcran(lon, lat, o.cap, x, y), taille, `rgba(${coul},${o.urgence ? 1 : 0.92})`);
        else { g.fillStyle = `rgba(${coul},0.55)`; g.fillRect(x - taille / 3, y - taille / 3, taille / 1.5, taille / 1.5); }
        if (o.urgence) { g.strokeStyle = "rgba(255,60,60,0.9)"; g.beginPath(); g.arc(x, y, taille * 2.2, 0, 7); g.stroke(); }
        if (noms && (o.vol || (k === "bateaux" && o.nom))) {
          g.fillStyle = `rgba(${coul},0.85)`; g.fillText(o.vol || o.nom, x + taille + 3 * dpr, y + 3 * dpr);
        }
      }
    }
    // L'objet choisi : un viseur, et la fiche mise à jour
    if (sel) {
      const o = trouver(sel);
      if (o) {
        const [lon, lat] = ou(sel.kind, o, now);
        if (suivre) {
          let dl = ((-lon - st.rot[0] + 540) % 360) - 180;
          st.rot[0] += dl * 0.08; st.rot[1] += (-lat - st.rot[1]) * 0.08;
        }
        if (visible(lon, lat)) {
          const [x, y] = proj([lon, lat]);
          const r = (12 + 2 * Math.sin(now / 250)) * dpr;
          g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 1.3 * dpr;
          g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
            g.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5); g.stroke();
          }
        }
        if (now - (sel.maj || 0) > 1000) { sel.maj = now; fiche(o, false); }
      }
    }
  };

  // ---------- Cliquer sur un objet ----------
  const idDe = (k, o) => (k === "satellites" ? o[6] : o.id);
  const trouver = (s) => liveListe(s.kind).find((o) => idDe(s.kind, o) === s.id);
  const pick = (proj, x, y, dpr) => {
    const now = performance.now(), c0 = centre();
    let best = null, bestD = 14 * dpr;
    for (const k of ["cameras", "seismes", "satellites", "bateaux", "militaires", "avions"]) {
      if (!on[k] || !live[k]) continue;
      for (const o of liveListe(k)) {
        const [lon, lat] = ou(k, o, now);
        if (d3.geoDistance([lon, lat], [c0[1], c0[0]]) > Math.PI / 2) continue;
        const [px, py] = proj([lon, lat]);
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) { bestD = d; best = { kind: k, id: idDe(k, o), o }; }
      }
    }
    if (!best) return false;
    sel = { kind: best.kind, id: best.id }; suivre = false;
    fiche(best.o, true);
    return true;
  };

  const ligne = (k, v) => (v || v === 0 ? `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>` : "");
  const heureDe = (t) => new Date(t * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const fiche = (o, neuve) => {
    const el = $("oeilFiche");
    if (!el) return;
    const k = sel.kind;
    let titre = "", corps = "", lien = "";
    if (k === "avions" || k === "militaires") {
      titre = `${k === "militaires" ? "🎖️" : "✈️"} ${o.vol || o.immat || o.id}`;
      corps = ligne("Modèle", o.modele) + ligne("Immatriculation", o.immat) + ligne("Altitude", o.sol ? "au sol" : `${o.alt.toLocaleString("fr-FR")} m`)
        + ligne("Vitesse", `${o.vitesse} km/h`) + ligne("Cap", o.cap != null ? `${Math.round(o.cap)}°` : "") + (o.urgence ? ligne("⚠", "Code d'urgence !") : "");
      lien = `https://globe.adsb.lol/?icao=${encodeURIComponent(o.id)}`;
    } else if (k === "bateaux") {
      titre = `🚢 ${o.nom || "Navire " + o.id}`;
      corps = ligne("Vitesse", `${o.vitesse} km/h`) + ligne("Destination", o.destination) + ligne("Cap", o.cap != null ? `${Math.round(o.cap)}°` : "")
        + ligne("Identifiant (MMSI)", o.id);
      lien = `https://www.marinetraffic.com/fr/ais/details/ships/mmsi:${encodeURIComponent(o.id)}`;
    } else if (k === "satellites") {
      titre = `🛰️ ${o[0]}`;
      const [lon, lat] = ou(k, o, performance.now());
      corps = ligne("Altitude", `${o[3].toLocaleString("fr-FR")} km`) + ligne("Au-dessus de", `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? "E" : "O"}`)
        + ligne("Numéro NORAD", o[6]);
      lien = `https://www.n2yo.com/satellite/?s=${o[6]}`;
    } else if (k === "seismes") {
      titre = `🌋 Magnitude ${o.mag}`;
      corps = ligne("Lieu", o.lieu) + ligne("Heure", heureDe(o.heure)) + ligne("Profondeur", `${o.profondeur} km`) + (o.tsunami ? ligne("⚠", "Alerte tsunami") : "");
      lien = o.lien;
    } else if (k === "cameras") {
      if (!neuve) return;  // l'image se rafraîchit toute seule
      titre = `📷 ${o.nom}`;
      const vues = o.vues || [o.image];
      corps = o.lecteur ? `<iframe class="oeil-cam" src="${esc(o.lecteur)}" allowfullscreen></iframe>`
        : `<img class="oeil-cam" id="oeilCam" src="${esc(o.image)}" alt="Image de la caméra">`;
      corps += `<div class="oeil-cam-info"><span>${esc(o.source)}</span><span id="oeilCamAge">en direct · mise à jour toutes les 30 s</span></div>`;
      if (o.video) corps += `<button type="button" class="oeil-btn" id="oeilVideo">▶ Voir la dernière vidéo</button>`;
      if (vues.length > 1) corps += `<div class="oeil-vues">${vues.map((v, i) => `<button type="button" data-vue="${esc(v)}">Vue ${i + 1}</button>`).join("")}</div>`;
      lien = o.lecteur || o.image;
    }
    const bouton = k === "cameras" || k === "seismes" ? "" : `<button type="button" class="oeil-btn" id="oeilSuivre">${suivre ? "⏸ Ne plus suivre" : "🎯 Suivre"}</button>`;
    const html = `<button type="button" class="oeil-x" id="oeilFermer" title="Fermer">✕</button><h4>${esc(titre)}</h4>${corps}
      <div class="oeil-actions">${bouton}${lien ? `<a class="oeil-btn" href="${esc(lien)}" target="_blank" rel="noopener">En savoir plus ↗</a>` : ""}</div>`;
    if (!neuve && el.dataset.html === html) return;
    el.dataset.html = html; el.innerHTML = html; el.hidden = false;
    $("oeilFermer").onclick = fermerFiche;
    if ($("oeilSuivre")) $("oeilSuivre").onclick = () => { suivre = !suivre; st.spin = false; st.follow = false; fiche(o, false); };
    if (k === "cameras" && neuve) {
      clearInterval(camTimer);
      let src = o.image;
      camTimer = setInterval(() => { const img = $("oeilCam"); if (img) img.src = src + (src.includes("?") ? "&" : "?") + "t=" + Date.now(); }, 30000);
      el.querySelectorAll("[data-vue]").forEach((b) => (b.onclick = () => { src = b.dataset.vue; $("oeilCam").src = src; }));
      if ($("oeilVideo")) $("oeilVideo").onclick = (e) => {
        clearInterval(camTimer);
        $("oeilCam").outerHTML = `<video class="oeil-cam" src="${esc(o.video)}" autoplay loop muted playsinline controls></video>`;
        e.target.remove();
      };
      if ($("oeilCam")) $("oeilCam").onerror = () => { $("oeilCamAge").textContent = "image indisponible pour le moment"; };
    }
  };
  const fermerFiche = () => {
    sel = null; suivre = false; clearInterval(camTimer);
    const el = $("oeilFiche"); if (el) { el.hidden = true; el.innerHTML = ""; el.dataset.html = ""; }
  };

  tick();  // premier chargement tout de suite
  return {
    draw, pick,
    occupe: () => suivre,  // on suit un objet : la Terre ne tourne pas toute seule
    stop: () => { alive = false; clearInterval(timer); clearInterval(camTimer); },
  };
}
