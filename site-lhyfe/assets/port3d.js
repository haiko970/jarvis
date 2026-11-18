/* ============================================================
   Lhyfe — suite de l'histoire en 3D (Three.js r160)
   Le camion de la vidéo continue sa route jusqu'au port.
   Un chariot porte-conteneurs prend le conteneur et le pose
   sur un navire. Le navire traverse un parc éolien en mer,
   puis accoste au port de destination.
   Tout est piloté par le défilement (window.__story.p3, de 0 à 1).
   ============================================================ */
(function () {
  'use strict';
  const S = window.__story;
  if (!S) return;
  /* Si la 3D (WebGL) n'est pas disponible, on joue la même scène en images pré-calculées */
  function fallback(err) {
    if (err) console.warn('3D indisponible, passage en images :', err);
    const host = document.getElementById('stage3d');
    host.innerHTML = '';
    const steps = [...document.querySelectorAll('.step')], bars = [...document.querySelectorAll('#progress b')];
    const endcard = document.getElementById('endcard');
    const N = 160, set = S.phone ? 'm' : 'd', imgs = [];
    const img = new Image(); img.alt = '';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block';
    host.appendChild(img);
    for (let i = 0; i < N; i++) { const im = new Image(); im.src = 'assets/frames/' + set + String(i).padStart(3, '0') + '.jpg'; imgs.push(im); }
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    let pS = 0, last = -1;
    (function loop() {
      const p = S.p3 || 0; pS += (p - pS) * .2; if (Math.abs(p - pS) < 1e-4) pS = p;
      const i = Math.round(pS * (N - 1));
      if (i !== last && imgs[i].complete && imgs[i].naturalWidth) { img.src = imgs[i].src; last = i; }
      for (const s of steps) s.classList.toggle('on', pS >= +s.dataset.a && pS < +s.dataset.b);
      bars.forEach((b, k) => { const a = +steps[k].dataset.a, e = +steps[k].dataset.b; b.style.transform = 'scaleX(' + clamp((pS - a) / (e - a)).toFixed(3) + ')'; });
      endcard.classList.toggle('on', pS >= .93);
      requestAnimationFrame(loop);
    })();
    imgs[0].onload = () => { window.__port3dReady = true; };
    if (imgs[0].complete) window.__port3dReady = true;
  }
  window.__port3dFallback = fallback;
  if (!window.THREE || /[?&]images\b/.test(location.search)) { fallback(!window.THREE ? 'Three.js absent' : 'mode images demandé'); return; }
  try { run3d(); } catch (e) { fallback(e); }

  function run3d() {
  const T = window.THREE;

  const root = document.documentElement;
  const host = document.getElementById('stage3d');
  const steps = [...document.querySelectorAll('.step')];
  const bars = [...document.querySelectorAll('#progress b')];
  const endcard = document.getElementById('endcard');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => sm((p - a) / (b - a));
  const lin = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const v3 = (x, y, z) => new T.Vector3(x, y, z);
  const UP = v3(0, 1, 0);

  /* ---------------- Rendu ---------------- */
  { const t = document.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw new Error('WebGL indisponible'); }
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color('#ffffff');
  const fog = new T.Fog('#ffffff', 5000, 6000);
  scene.fog = fog;
  const camera = new T.PerspectiveCamera(30, 1, 0.5, 4000);

  /* Studio blanc pour les reflets (peinture, vitres, chromes) */
  (function studio() {
    const env = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(40, 20, 40), new T.MeshBasicMaterial({ color: '#7d8087', side: T.BackSide }));
    room.position.y = 8; env.add(room);
    const panel = (w, h, x, y, z, k, rx = 0, ry = 0) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k), side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    };
    panel(30, 30, 0, 17.9, 0, 3.2, Math.PI / 2);          // grand plafond lumineux
    panel(14, 6, -19.9, 9, 0, 6, 0, Math.PI / 2);          // boîte à lumière gauche
    panel(14, 6, 19.9, 9, 4, 4, 0, -Math.PI / 2);          // boîte à lumière droite
    panel(30, 8, 0, 8, -19.9, 2.2);                        // fond
    panel(40, 1.2, 0, 4, 19.9, 8, 0, Math.PI);             // bande de reflet nette
    const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshBasicMaterial({ color: '#202124' }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.9; env.add(floor);
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
  })();

  scene.add(new T.HemisphereLight('#ffffff', '#3a3b3f', 0.35));
  const sun = new T.DirectionalLight('#ffffff', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /* ---------------- Matériaux ---------------- */
  const std = o => new T.MeshStandardMaterial(o);
  const phy = o => new T.MeshPhysicalMaterial(o);
  const M = {
    ground: new T.MeshBasicMaterial({ color: '#111111', toneMapped: false }),
    groundLine: new T.MeshBasicMaterial({ color: '#e9e9e9', toneMapped: false }),
    concrete: std({ color: '#2a2b2e', roughness: .95 }),
    paintBlack: phy({ color: '#0c0d0f', metalness: .45, roughness: .3, clearcoat: 1, clearcoatRoughness: .06 }),
    plastic: std({ color: '#17181a', roughness: .72 }),
    rubber: std({ color: '#0b0b0c', roughness: .9 }),
    tread: std({ color: '#141415', roughness: 1 }),
    chrome: std({ color: '#ffffff', metalness: 1, roughness: .1 }),
    alu: std({ color: '#d4d7dc', metalness: 1, roughness: .28 }),
    aluMatte: std({ color: '#b9bcc2', metalness: .9, roughness: .5 }),
    steel: std({ color: '#3b3e43', metalness: .7, roughness: .5 }),
    steelLight: std({ color: '#8e939b', metalness: .6, roughness: .45 }),
    glass: phy({ color: '#0a0d11', metalness: 0, roughness: .03, clearcoat: 1, envMapIntensity: 1.8 }),
    glassClear: phy({ color: '#9fb1c2', metalness: 0, roughness: .05, transparent: true, opacity: .32, envMapIntensity: 1.6, depthWrite: false }),
    lamp: phy({ color: '#f4f7fb', roughness: .04, metalness: .3, clearcoat: 1, emissive: '#ffffff', emissiveIntensity: .2 }),
    amber: std({ color: '#ffae1a', roughness: .3, emissive: '#ff8a00', emissiveIntensity: .35 }),
    red: std({ color: '#d42a20', roughness: .3, emissive: '#a5150c', emissiveIntensity: .35 }),
    teal: phy({ color: '#16a8a0', metalness: .15, roughness: .36, clearcoat: .7, clearcoatRoughness: .15 }),
    tealDark: std({ color: '#0f6f6a', metalness: .2, roughness: .5 }),
    boom: phy({ color: '#26282c', metalness: .35, roughness: .42, clearcoat: .4 }),
    yellow: std({ color: '#f5b400', roughness: .45, metalness: .1 }),
    white: std({ color: '#f3f4f6', roughness: .45 }),
    whitePaint: phy({ color: '#f2f3f5', roughness: .35, clearcoat: .5 }),
    grey: std({ color: '#9aa0a8', roughness: .6 }),
    seat: std({ color: '#232427', roughness: .9 }),
    orange: std({ color: '#ff6a1a', roughness: .5 }),
    silver: std({ color: '#b6bac1', metalness: .55, roughness: .4 }),
    silverDark: std({ color: '#8f949c', metalness: .55, roughness: .45 })
  };
  M.lamp.side = T.DoubleSide; M.glass.side = T.DoubleSide;

  /* ---------------- Outils de modélisation ---------------- */
  function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  const BX = (w, h, d) => new T.BoxGeometry(w, h, d);
  const CY = (r, h, s = 24, r2) => new T.CylinderGeometry(r, r2 === undefined ? r : r2, h, s);
  // cylindre couché le long de x ou de z
  const cylX = (r, len, s = 24) => { const g = CY(r, len, s); g.rotateZ(Math.PI / 2); return g; };
  const cylZ = (r, len, s = 24) => { const g = CY(r, len, s); g.rotateX(Math.PI / 2); return g; };
  // boîte aux arêtes arrondies
  function RB(w, h, d, b = 0.05) {
    b = Math.max(0.001, Math.min(b, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
    const iw = w - 2 * b, ih = h - 2 * b, s = new T.Shape();
    s.moveTo(-iw / 2, -ih / 2); s.lineTo(iw / 2, -ih / 2); s.lineTo(iw / 2, ih / 2); s.lineTo(-iw / 2, ih / 2); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -(d - 2 * b) / 2);
    return g;
  }
  // profil (x, y) extrudé sur une largeur z centrée
  function profileGeo(pts, width, bevel = 0.05) {
    const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: width - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 8 });
    g.translate(0, 0, -(width - 2 * bevel) / 2);
    return g;
  }
  // tube orienté entre deux points
  function strut(parent, a, b, r, mat, s = 10) {
    const d = b.clone().sub(a), len = d.length();
    const m = add(parent, CY(r, 1, s), mat);
    m.scale.y = len; m.position.copy(a).addScaledVector(d, .5);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  }
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (srgb) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function decal(parent, w, h, tex, x, y, z, ry = 0) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), std({ map: tex, transparent: true, roughness: .55, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  }

  /* Fusion des pièces fixes : même détail, beaucoup moins d'appels de dessin */
  function bake(group, keep = []) {
    group.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(group.matrixWorld).invert();
    const skip = new Set();
    keep.forEach(k => k && k.traverse(o => skip.add(o)));
    const buckets = new Map(), dead = [];
    group.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || skip.has(o) || Array.isArray(o.material) || o === group) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const key = o.material.uuid + (g.attributes.color ? 'c' : '');
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, list: [], shadow: o.castShadow });
      buckets.get(key).list.push(g); dead.push(o);
    });
    dead.forEach(o => o.parent.remove(o));
    for (const { mat, list, shadow } of buckets.values()) {
      const names = ['position', 'normal', 'uv'].concat(list.every(g => g.attributes.color) ? ['color'] : []);
      const out = new T.BufferGeometry();
      for (const n of names) {
        const size = list[0].attributes[n].itemSize, total = list.reduce((a, g) => a + g.attributes[n].count, 0);
        const arr = new Float32Array(total * size); let off = 0;
        for (const g of list) { arr.set(g.attributes[n].array, off); off += g.attributes[n].array.length; }
        out.setAttribute(n, new T.BufferAttribute(arr, size));
      }
      out.computeBoundingSphere();
      const m = new T.Mesh(out, mat); m.castShadow = shadow; m.receiveShadow = true; group.add(m);
    }
    return group;
  }

  /* ---------------- Roue de poids lourd ---------------- */
  // axe de rotation = z local du groupe renvoyé ; face extérieure côté +z
  function wheel(r = .535, w = .32, rimCol = M.alu, opts = {}) {
    const g = new T.Group(), inner = new T.Group(); inner.rotation.x = Math.PI / 2; g.add(inner);
    const ri = r * .6, sh = Math.min(.07, w * .25), pts = [];
    pts.push(new T.Vector2(ri, -w / 2 + .01));
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push(new T.Vector2(r - sh + Math.cos(a) * sh, -w / 2 + sh + Math.sin(a) * sh)); }
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new T.Vector2(r - sh + Math.cos(a) * sh, w / 2 - sh + Math.sin(a) * sh)); }
    pts.push(new T.Vector2(ri, w / 2 - .01));
    const tyre = add(inner, new T.LatheGeometry(pts, 56), M.rubber);
    // sculptures de la bande de roulement
    const nT = 46, tg = BX(.05, w * .8, .045);
    const im = new T.InstancedMesh(tg, M.tread, nT), m4 = new T.Matrix4(), q = new T.Quaternion(), sc = v3(1, 1, 1);
    for (let i = 0; i < nT; i++) {
      const a = i / nT * Math.PI * 2;
      q.setFromAxisAngle(UP, -a);
      m4.compose(v3(Math.cos(a) * (r - .006), 0, Math.sin(a) * (r - .006)), q, sc); im.setMatrixAt(i, m4);
    }
    im.castShadow = true; inner.add(im);
    // jante (face visible côté +y du lathe = +z du groupe)
    const rp = [[.001, w / 2 - .02], [ri * .32, w / 2 - .02], [ri * .38, w / 2 - .06], [ri * .8, w / 2 - .09], [ri * .97, w / 2 - .03], [ri * 1.02, w / 2 - .01], [ri * 1.02, -w / 2 + .02], [ri * .9, -w / 2 + .02]];
    add(inner, new T.LatheGeometry(rp.map(p => new T.Vector2(p[0], p[1])), 48), rimCol);
    // moyeu, écrous
    add(inner, CY(ri * .3, .06, 24), M.steelLight, 0, w / 2 - .01, 0);
    add(inner, CY(ri * .16, .14, 20, ri * .1), M.chrome, 0, w / 2 + .03, 0);
    const nut = CY(.022, .05, 6);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(inner, nut, M.chrome, Math.cos(a) * ri * .45, w / 2 - .005, Math.sin(a) * ri * .45); }
    // trous d'aération de la jante
    const hole = CY(.04, .02, 14);
    for (let i = 0; i < 10; i++) { const a = (i + .5) / 10 * Math.PI * 2; add(inner, hole, M.steel, Math.cos(a) * ri * .68, w / 2 - .075, Math.sin(a) * ri * .68); }
    if (opts.dual) { const g2 = add(inner, new T.LatheGeometry(pts, 48), M.rubber, 0, -w - .03, 0); }
    return bake(g);
  }

  /* ---------------- Conteneur 40 pieds détaillé ---------------- */
  const CL = 12.19, CW = 2.44, CH = 2.59;
  function corrugatedPanel(len, h, mat, pitch = .278, depth = .036) {
    const s = new T.Shape(), n = Math.round(len / pitch), p = len / n;
    s.moveTo(-len / 2, 0);
    for (let i = 0; i < n; i++) {
      const x0 = -len / 2 + i * p;
      s.lineTo(x0 + p * .14, 0); s.lineTo(x0 + p * .36, -depth); s.lineTo(x0 + p * .64, -depth); s.lineTo(x0 + p * .86, 0);
    }
    s.lineTo(len / 2, 0); s.lineTo(len / 2, .012); s.lineTo(-len / 2, .012); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);      // extrusion -> hauteur (y), relief -> +z
    g.translate(0, -h / 2, 0);
    return new T.Mesh(g, mat);
  }
  const plateTex = (lines, bg = '#ffffff', fg = '#111', w = 512, h = 128) => canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    lines.forEach((L, i) => { g.fillStyle = L.c || fg; g.font = L.f; g.textBaseline = 'top'; g.fillText(L.t, L.x || 0, L.y); });
  });
  function hazardDiamond() {
    return canvasTex(256, 256, (g) => {
      g.translate(128, 128); g.rotate(Math.PI / 4);
      g.fillStyle = '#fff'; g.fillRect(-88, -88, 176, 176);
      g.fillStyle = '#d6261d'; g.fillRect(-82, -82, 164, 164);
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(-74, -74, 148, 148);
      g.rotate(-Math.PI / 4);
      g.fillStyle = '#fff'; g.beginPath();
      g.moveTo(0, -60); g.bezierCurveTo(30, -30, 28, -6, 18, 6); g.bezierCurveTo(26, -4, 20, -22, 14, -26);
      g.bezierCurveTo(14, 0, -6, 6, -10, -12); g.bezierCurveTo(-28, 0, -26, 18, -16, 26); g.lineTo(16, 26); g.bezierCurveTo(30, 10, 10, -30, 0, -60); g.fill();
      g.font = '700 46px Archivo, sans-serif'; g.textAlign = 'center'; g.fillText('2', 0, 82);
    });
  }
  function buildContainer(color = '#b8bcc3', label = 'LHYU 210584 1') {
    const g = new T.Group();
    const wall = std({ color, metalness: .55, roughness: .42 });
    const frame = std({ color: new T.Color(color).multiplyScalar(.82), metalness: .55, roughness: .45 });
    const cast = std({ color: new T.Color(color).multiplyScalar(.7), metalness: .5, roughness: .6 });
    const wh = CH - .32;
    // parois latérales ondulées
    const s1 = corrugatedPanel(CL - .34, wh, wall); s1.position.set(0, CH / 2 + .02, CW / 2 - .012); g.add(s1);
    const s2 = corrugatedPanel(CL - .34, wh, wall); s2.rotation.y = Math.PI; s2.position.set(0, CH / 2 + .02, -CW / 2 + .012); g.add(s2);
    // face avant ondulée
    const f = corrugatedPanel(CW - .3, wh, wall, .32, .045); f.rotation.y = Math.PI / 2; f.position.set(CL / 2 - .012, CH / 2 + .02, 0); g.add(f);
    // toit légèrement embouti
    add(g, BX(CL - .2, .04, CW - .14), wall, 0, CH - .07, 0);
    for (let x = -CL / 2 + .5; x < CL / 2 - .3; x += .56) add(g, BX(.2, .02, CW - .3), frame, x, CH - .045, 0);
    // cadre : montants d'angle, longerons hauts et bas
    for (const x of [-CL / 2 + .08, CL / 2 - .08]) for (const z of [-CW / 2 + .08, CW / 2 - .08]) add(g, BX(.16, CH - .24, .16), frame, x, CH / 2, z);
    for (const z of [-CW / 2 + .05, CW / 2 - .05]) {
      add(g, BX(CL - .3, .12, .1), frame, 0, CH - .1, z);
      add(g, BX(CL - .3, .17, .12), frame, 0, .13, z);
    }
    for (const x of [-CL / 2 + .06, CL / 2 - .06]) { add(g, BX(.12, .17, CW - .3), frame, x, .13, 0); add(g, BX(.12, .12, CW - .3), frame, x, CH - .1, 0); }
    // pièces de coin (avec leurs trous ovales)
    const holeM = std({ color: '#111', roughness: .9 });
    for (const x of [-CL / 2 + .089, CL / 2 - .089]) for (const z of [-CW / 2 + .081, CW / 2 - .081]) for (const y of [.059, CH - .059]) {
      add(g, BX(.178, .118, .162), cast, x, y, z);
      add(g, BX(.1, .05, .01), holeM, x, y, z + Math.sign(z) * .082);
      add(g, BX(.01, .05, .07), holeM, x + Math.sign(x) * .09, y, z);
    }
    // traverses du plancher visibles par le dessous
    for (let x = -CL / 2 + .4; x < CL / 2 - .2; x += .6) add(g, BX(.08, .12, CW - .2), M.steel, x, .1, 0);
    // portes (arrière, -x)
    const dx = -CL / 2 + .01;
    for (const side of [-1, 1]) {
      const door = new T.Group(); door.position.set(dx, CH / 2, side * (CW / 4 - .02)); g.add(door);
      add(door, BX(.03, wh + .05, CW / 2 - .1), wall, 0, 0, 0);
      for (let k = -1; k <= 1; k++) add(door, BX(.05, wh - .2, .16), frame, -.025, 0, k * .32);
      // barres de verrouillage, poignées, gâches
      for (const bz of [-.33, .33]) {
        const bzz = bz * (side > 0 ? 1 : 1);
        add(door, CY(.022, wh + .1, 10), M.steelLight, -.07, 0, bzz);
        add(door, BX(.05, .07, .07), M.steelLight, -.07, wh / 2 - .02, bzz);
        add(door, BX(.05, .07, .07), M.steelLight, -.07, -wh / 2 + .02, bzz);
        const h = add(door, BX(.03, .04, .34), M.steelLight, -.1, -.05, bzz + .14); h.rotation.x = .25;
        add(door, BX(.04, .1, .08), M.steelLight, -.08, -.05, bzz + .3);
      }
      // charnières
      for (const hy of [-wh / 2 + .2, -wh / 6, wh / 6, wh / 2 - .2]) add(door, BX(.06, .1, .08), frame, -.02, hy, side * (CW / 4 - .06));
    }
    // marquages : code du propriétaire, plaque de sécurité, losange de danger et code ONU
    const codeTex = plateTex([{ t: label, f: '600 54px Archivo, sans-serif', y: 6, c: '#1b1d22' }, { t: '45G1   MAX GROSS 30 480 KG', f: '400 24px "JetBrains Mono", monospace', y: 74, c: '#2b2e34' }], null, '#111', 720, 110);
    decal(g, 2.6, .4, codeTex, CL / 2 - 2.0, CH - .45, CW / 2 + .03);
    decal(g, 2.6, .4, codeTex, -CL / 2 + 2.0, CH - .45, -CW / 2 - .03, Math.PI);
    const dia = hazardDiamond();
    decal(g, .42, .42, dia, -CL / 2 + 1.0, 1.25, CW / 2 + .03);
    const un = canvasTex(256, 160, (g2) => {
      g2.fillStyle = '#ff7a00'; g2.fillRect(0, 0, 256, 160); g2.strokeStyle = '#111'; g2.lineWidth = 10; g2.strokeRect(5, 5, 246, 150);
      g2.fillStyle = '#111'; g2.fillRect(5, 78, 246, 6); g2.font = '700 58px Archivo, sans-serif'; g2.textAlign = 'center';
      g2.fillText('23', 128, 64); g2.fillText('1049', 128, 140);
    });
    decal(g, .4, .25, un, -CL / 2 + 1.0, .82, CW / 2 + .03);
    const big = plateTex([{ t: 'H₂  HYDROGÈNE VERT', f: '600 64px Archivo, sans-serif', y: 20, c: '#1b2a55' }], null, '#111', 900, 110);
    decal(g, 4.6, .56, big, 1.6, 1.25, CW / 2 + .03);
    const csc = canvasTex(128, 96, (g2) => { g2.fillStyle = '#d9dbe0'; g2.fillRect(0, 0, 128, 96); g2.fillStyle = '#555'; for (let i = 0; i < 6; i++) g2.fillRect(10, 12 + i * 13, 108 - (i % 2) * 30, 5); });
    decal(g, .25, .18, csc, -CL / 2 - .05, 1.5, -.55, -Math.PI / 2);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return bake(g);
  }

  /* Texture de relief ondulé pour les conteneurs simplifiés (empilés) */
  const corrNormal = canvasTex(256, 8, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const ph = (x % 16) / 16; let nx = 0;
      if (ph < .14) nx = 0; else if (ph < .36) nx = .7; else if (ph < .64) nx = 0; else if (ph < .86) nx = -.7;
      for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; img.data[i] = 128 + nx * 120; img.data[i + 1] = 128; img.data[i + 2] = 255; img.data[i + 3] = 255; }
    }
    g.putImageData(img, 0, 0);
  }, false);
  corrNormal.wrapS = T.RepeatWrapping; corrNormal.repeat.set(2.7, 1);
  const crowdGeo = BX(CL, CH, CW);
  const crowdMat = std({ color: '#ffffff', roughness: .5, metalness: .35, normalMap: corrNormal, normalScale: new T.Vector2(.9, .9) });
  const PALETTE = ['#d9dde3', '#b8bec7', '#1c2d5a', '#eceef1', '#16a8a0', '#8a929e', '#2f63ff', '#5b6470', '#c7ccd3', '#24324f'];
  function crowd(slots, parent) {
    const im = new T.InstancedMesh(crowdGeo, crowdMat, slots.length);
    const m4 = new T.Matrix4(), col = new T.Color(), q = new T.Quaternion();
    slots.forEach((s, i) => { q.setFromAxisAngle(UP, s[4] || 0); m4.compose(v3(s[0], s[1], s[2]), q, v3(1, 1, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(PALETTE[s[3] % PALETTE.length])); });
    im.castShadow = im.receiveShadow = true; parent.add(im);
    // coins sombres pour lire les conteneurs un à un
    const cg = BX(.2, .14, .18), cm = new T.InstancedMesh(cg, M.steel, slots.length * 8);
    let k = 0;
    slots.forEach(s => { for (const dx of [-CL / 2 + .1, CL / 2 - .1]) for (const dz of [-CW / 2 + .09, CW / 2 - .09]) for (const dy of [-CH / 2 + .07, CH / 2 - .07]) {
      q.setFromAxisAngle(UP, s[4] || 0); const off = v3(dx, dy, dz).applyQuaternion(q);
      m4.compose(v3(s[0], s[1], s[2]).add(off), q, v3(1, 1, 1)); cm.setMatrixAt(k++, m4); } });
    parent.add(cm);
    return im;
  }
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------------- Tracteur + remorque porte-conteneur ---------------- */
  const Y_DECK = 1.38;                 // dessus de la remorque
  const C_ON_TRUCK = Y_DECK + CH / 2;   // centre du conteneur posé
  const RIG_REAR = -7.3, RIG_FRONT = 10.25;
  function buildTruck() {
    const g = new T.Group(), wheels = [];
    /* --- tracteur --- */
    for (const z of [-.43, .43]) add(g, BX(6.4, .3, .09), M.steel, 7.0, .92, z);           // longerons
    add(g, BX(1.35, .12, 1.9), M.steel, 5.5, 1.16, 0);                                       // sellette
    add(g, CY(.55, .06, 28), M.steelLight, 5.5, 1.24, 0);
    // cabine (profil arrondi)
    const cab = new T.Group(); cab.position.set(8.95, 0, 0); g.add(cab);
    const prof = [[-1.2, 1.22], [1.1, 1.22], [1.15, 2.28], [1.1, 2.45], [.9, 3.45], [.82, 3.62], [.66, 3.7], [-1.2, 3.7]];
    add(cab, profileGeo(prof, 2.44, .08), M.paintBlack);
    // déflecteur de toit
    add(cab, profileGeo([[-1.15, 3.66], [.5, 3.66], [-.2, 4.32], [-1.15, 4.36]], 2.3, .07), M.paintBlack);
    add(cab, profileGeo([[-1.22, 1.8], [-1.0, 1.8], [-1.0, 4.36], [-1.22, 4.3]], 2.46, .02), M.plastic);   // carénages latéraux arrière
    // pare-brise
    const ws = add(cab, new T.PlaneGeometry(2.24, 1.02), M.glass, 1.095, 2.96, 0);
    ws.rotation.order = 'ZYX'; ws.rotation.set(0, Math.PI / 2, Math.atan(.2));
    add(cab, RB(.55, .09, 2.34, .03), M.paintBlack, .95, 3.62, 0, 0, 0, -.18);              // pare-soleil
    // vitres latérales + montants
    for (const sz of [1, -1]) {
      const z = sz * (1.22 + .004);
      const wsh = new T.Shape(); wsh.moveTo(1.02, 2.52); wsh.lineTo(.86, 3.38); wsh.lineTo(-.22, 3.38); wsh.lineTo(-.22, 2.62); wsh.lineTo(.2, 2.52); wsh.closePath();
      const sw = add(cab, new T.ShapeGeometry(wsh), M.glass, 0, 0, z); if (sz < 0) sw.rotation.y = Math.PI, sw.position.x = 0, sw.scale.x = -1;
      // jointures de porte, poignée, rétroviseurs, marchepieds
      add(cab, BX(.02, 2.0, .01), M.plastic, -.3, 2.35, z + sz * .004);
      add(cab, BX(1.33, .02, .01), M.plastic, .38, 1.36, z + sz * .004);
      add(cab, RB(.22, .05, .04, .015), M.alu, -.05, 2.35, z + sz * .02);
      add(cab, RB(.06, .9, .05, .02), M.alu, -.42, 2.5, z + sz * .03);
      strut(cab, v3(.98, 3.2, sz * 1.15), v3(1.22, 3.18, sz * 1.5), .025, M.plastic);
      strut(cab, v3(1.0, 2.55, sz * 1.15), v3(1.22, 2.62, sz * 1.5), .022, M.plastic);
      add(cab, RB(.14, .62, .22, .04), M.paintBlack, 1.24, 2.95, sz * 1.5);
      add(cab, RB(.03, .5, .16, .01), M.glass, 1.17, 2.95, sz * 1.5);
      add(cab, RB(.14, .26, .2, .04), M.paintBlack, 1.24, 2.4, sz * 1.5);
      for (const [sy, sx] of [[.98, .2], [.62, .2]]) { add(cab, RB(.7, .05, .26, .015), M.aluMatte, sx, sy, sz * 1.08); }
      add(cab, BX(.75, .75, .02), M.plastic, .2, .82, sz * 1.21);
      // garde-boue avant
      const mg = new T.Mesh(new T.CylinderGeometry(.63, .63, .42, 32, 1, true, Math.PI / 2, Math.PI), M.plastic); mg.material = M.plastic;
      mg.geometry.rotateX(Math.PI / 2); mg.position.set(0, .58, sz * 1.02); mg.castShadow = true; cab.add(mg);
      M.plastic.side = T.DoubleSide;
    }
    // calandre, phares, pare-chocs
    add(cab, RB(.08, .95, 1.7, .03), M.plastic, 1.16, 1.86, 0);
    for (let i = 0; i < 6; i++) add(cab, RB(.04, .05, 1.6, .015), i % 2 ? M.chrome : M.steel, 1.2, 1.5 + i * .14, 0);
    for (const sz of [1, -1]) {
      add(cab, RB(.1, .28, .55, .05), M.plastic, 1.14, 1.62, sz * .93);
      add(cab, RB(.04, .2, .48, .04), M.lamp, 1.19, 1.62, sz * .93);
      add(cab, RB(.03, .05, .3, .02), M.amber, 1.2, 1.79, sz * .93);
      add(cab, CY(.06, .04, 18), M.lamp, 1.29, 1.18, sz * .95, 0, 0, Math.PI / 2);
    }
    add(cab, RB(.36, .46, 2.48, .06), M.plastic, 1.12, 1.24, 0);
    add(cab, RB(.3, .12, 2.3, .04), M.steel, 1.12, .98, 0);
    // réservoir, batterie, réservoirs d'air
    const tank = add(g, cylX(.34, 1.45, 32), M.alu, 7.2, .88, 1.0);
    for (const tx of [6.75, 7.65]) add(g, cylX(.355, .05, 32), M.plastic, tx, .88, 1.0);
    add(g, RB(1.0, .55, .55, .04), M.plastic, 7.2, .9, -.95);
    add(g, cylX(.13, .9, 16), M.steelLight, 6.3, .58, .62);
    // garde-boue arrière, bavettes
    for (const sz of [1, -1]) { add(g, RB(1.25, .05, .62, .02), M.plastic, 5.4, 1.17, sz * .95); add(g, BX(.02, .5, .55), M.rubber, 4.75, .65, sz * .95); }
    // échappement vertical discret
    add(g, CY(.08, 1.2, 16), M.chrome, 7.78, 3.5, -1.0);
    /* --- remorque squelette --- */
    for (const z of [-.5, .5]) { add(g, BX(12.6, .44, .1), M.steel, -1.05, 1.0, z); add(g, BX(12.6, .04, .22), M.steel, -1.05, 1.22, z); add(g, BX(12.6, .04, .22), M.steel, -1.05, .78, z); }
    add(g, BX(2.4, .24, 1.2), M.steel, 4.4, 1.15, 0);                                     // col de cygne
    for (const x of [5.05, -7.15, -1.05 - 2.95, -1.05 + 2.95]) {
      add(g, BX(.26, .22, CW), M.steel, x, Y_DECK - .11, 0);                                // traverses porteuses
      for (const z of [-CW / 2 + .1, CW / 2 - .1]) { add(g, BX(.2, .06, .18), M.steelLight, x, Y_DECK - .01, z); add(g, CY(.04, .1, 8, .06), M.yellow, x, Y_DECK + .03, z); }
    }
    for (let x = -6.6; x < 4.8; x += 1.3) add(g, BX(.08, .14, 1.0), M.steel, x, 1.05, 0);
    for (const z of [-1.16, 1.16]) add(g, BX(12.3, .14, .1), M.steel, -1.05, 1.24, z);
    // béquilles
    for (const z of [-.6, .6]) {
      add(g, BX(.14, .7, .14), M.steel, 3.25, .82, z); add(g, BX(.1, .5, .1), M.steelLight, 3.25, .35, z);
      add(g, BX(.32, .04, .26), M.steel, 3.25, .1, z);
      strut(g, v3(3.25, .6, z), v3(2.5, 1.0, z * .7), .03, M.steel);
    }
    add(g, cylZ(.03, 1.3, 8), M.steel, 3.25, .9, 0);
    add(g, RB(.2, .16, .1, .02), M.steel, 3.25, .9, .72);
    // protections latérales en aluminium (comme dans la vidéo)
    for (const sz of [1, -1]) {
      for (const y of [.5, .74]) add(g, RB(5.6, .1, .05, .02), M.alu, -.05, y, sz * 1.24);
      for (const x of [-2.7, -.05, 2.6]) add(g, BX(.06, .44, .14), M.steel, x, .7, sz * 1.18);
    }
    // essieux, suspensions
    for (const x of [-3.4, -4.71, -6.02]) {
      add(g, cylZ(.07, 2.0, 12), M.steel, x, .53, 0);
      for (const z of [-.5, .5]) { add(g, BX(.12, .4, .1), M.steel, x + .3, .75, z); add(g, BX(.9, .08, .1), M.steel, x, .66, z); add(g, CY(.13, .22, 14), M.rubber, x - .35, .82, z); }
    }
    // pare-chocs arrière, feux, bavettes
    add(g, BX(.12, .12, 2.38), M.steel, RIG_REAR + .05, .62, 0);
    const stripe = canvasTex(256, 32, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#e8e8e8' : '#d42a20'; c.fillRect(i * 16, 0, 16, 32); } });
    decal(g, 2.3, .1, stripe, RIG_REAR - .015, .62, 0, -Math.PI / 2);
    for (const sz of [1, -1]) {
      add(g, RB(.06, .14, .42, .03), M.red, RIG_REAR - .01, .9, sz * .95);
      add(g, RB(.06, .08, .14, .02), M.amber, RIG_REAR - .01, .9, sz * .62);
      add(g, BX(.02, .48, .5), M.rubber, -6.75, .55, sz * 1.0);
      add(g, BX(.08, .05, .4), M.amber, 2.0, 1.12, sz * 1.22);
    }
    /* --- roues --- */
    const put = (x, z, r, w, dual) => {
      const wg = wheel(r, w, M.alu, { dual }); wg.position.set(x, r, z);
      if (z < 0) wg.rotation.y = Math.PI;
      g.add(wg); wheels.push(wg);
    };
    for (const sz of [1, -1]) { put(9.02, sz * 1.03, .535, .32); put(5.4, sz * 1.07, .535, .3, true); for (const x of [-3.4, -4.71, -6.02]) put(x, sz * 1.0, .53, .38); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData.wheels = wheels;
    return bake(g, wheels);
  }

  /* ---------------- Chariot porte-conteneurs (reach stacker) ---------------- */
  const PIVOT = v3(-3.3, 3.55, 0);
  const HEAD = 1.05;                    // distance bout de flèche -> palonnier
  function stripes(w, h, n = 10) {
    return canvasTex(w, h, (g) => {
      g.fillStyle = '#f5b400'; g.fillRect(0, 0, w, h); g.fillStyle = '#121212';
      const step = w / n;
      for (let i = -2; i < n + 2; i++) { g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step + step / 2, 0); g.lineTo(i * step + step / 2 - h, h); g.lineTo(i * step - h, h); g.fill(); }
    });
  }
  function buildStacker() {
    const g = new T.Group();
    // châssis, essieu avant, contrepoids
    add(g, RB(6.9, .95, 1.7, .08), M.teal, -.7, 1.3, 0);
    add(g, RB(1.7, 1.05, 3.1, .1), M.teal, 2.05, 1.38, 0);
    add(g, RB(1.75, 2.0, 3.0, .18), M.teal, -4.45, 1.85, 0);
    for (let i = 0; i < 5; i++) add(g, BX(.02, .12, 2.4), M.tealDark, -5.33, 1.2 + i * .28, 0);
    add(g, RB(.06, .2, .5, .02), M.red, -5.34, 2.55, .95); add(g, RB(.06, .2, .5, .02), M.red, -5.34, 2.55, -.95);
    add(g, RB(.06, .14, .3, .02), M.amber, -5.34, 2.25, 1.2); add(g, RB(.06, .14, .3, .02), M.amber, -5.34, 2.25, -1.2);
    // capot moteur avec ouïes
    add(g, RB(2.7, 1.1, 2.1, .14), M.teal, -2.55, 2.2, 0);
    for (let i = 0; i < 7; i++) add(g, BX(.12, .03, .9), M.tealDark, -3.3 + i * .22, 2.76, -.5);
    add(g, CY(.09, .9, 14), M.steel, -2.0, 3.1, -.75);
    // garde-boue avant
    for (const sz of [1, -1]) {
      const fg = new T.Mesh(new T.CylinderGeometry(1.08, 1.08, 1.3, 36, 1, true, Math.PI / 2, Math.PI), M.teal);
      fg.geometry.rotateX(Math.PI / 2); fg.position.set(2.05, .96, sz * 1.38); fg.castShadow = true; g.add(fg);
      add(g, BX(.5, .04, 1.3), M.tealDark, 2.05, 2.06, sz * 1.38);
      add(g, RB(.5, .3, .25, .05), M.lamp, 2.95, 1.75, sz * 1.25);
    }
    M.teal.side = T.DoubleSide;
    // cabine vitrée, décalée sur le côté
    const cab = new T.Group(); cab.position.set(-.35, 1.82, 1.2); g.add(cab);
    add(cab, RB(1.9, .12, 1.4, .05), M.teal, 0, 2.3, 0);
    add(cab, RB(1.8, .3, 1.3, .04), M.teal, 0, .08, 0);
    for (const px of [-.88, .88]) for (const pz of [-.63, .63]) add(cab, BX(.07, 2.2, .07), M.boom, px, 1.2, pz);
    add(cab, BX(.04, 2.0, 1.2), M.glassClear, .9, 1.22, 0);
    add(cab, BX(.04, 2.0, 1.2), M.glassClear, -.9, 1.22, 0);
    add(cab, BX(1.7, 2.0, .04), M.glassClear, 0, 1.22, .65);
    add(cab, BX(1.7, 2.0, .04), M.glassClear, 0, 1.22, -.65);
    add(cab, RB(.6, .55, .55, .08), M.seat, -.25, .55, 0);
    add(cab, RB(.15, .75, .55, .06), M.seat, -.55, 1.0, 0);
    add(cab, CY(.2, .04, 20), M.plastic, .4, 1.05, 0, 0, 0, .9);
    add(cab, BX(.4, .45, .9), M.plastic, .6, .5, 0);
    add(cab, RB(.3, .1, .3, .04), M.amber, -.2, 2.42, -.3);
    for (const [sy, sx] of [[-.35, .3], [-.85, .3]]) add(cab, RB(.5, .04, .3, .01), M.aluMatte, sx, sy, .6);
    // roues : jumelées à l'avant, simples à l'arrière
    const wheels = [];
    for (const sz of [1, -1]) {
      for (const off of [1.1, 1.72]) { const w = wheel(.92, .58, M.steelLight); w.position.set(2.05, .92, sz * off); if (sz < 0) w.rotation.y = Math.PI; g.add(w); wheels.push(w); }
      const wr = wheel(.78, .52, M.steelLight); wr.position.set(-3.45, .78, sz * 1.18); if (sz < 0) wr.rotation.y = Math.PI; g.add(wr); wheels.push(wr);
    }
    // flèche télescopique
    const boom = new T.Group(); boom.position.copy(PIVOT); g.add(boom);
    add(boom, BX(.9, .62, .9), M.boom, 0, 0, 0);
    const outer = add(boom, RB(9.4, 1.0, .82, .06), M.boom, 4.7, 0, 0);
    for (let x = .8; x < 9; x += 1.6) add(boom, BX(.05, .9, .86), M.steel, x, 0, 0);
    add(boom, RB(1.2, .3, .3, .05), M.amber, 8.6, .55, 0);
    const innerB = add(boom, RB(7.6, .82, .64, .05), M.boom, 0, -.02, 0);
    const tip = new T.Group(); boom.add(tip);
    add(tip, RB(.9, .9, .8, .08), M.boom, 0, 0, 0);
    add(tip, cylZ(.18, .95, 20), M.steel, 0, 0, 0);
    // vérins de levage (2) : corps + tige chromée
    const cyls = [];
    for (const z of [-.52, .52]) {
      const body = add(g, CY(.17, 1, 20), M.boom); const rod = add(g, CY(.09, 1, 16), M.chrome);
      const ring = add(g, CY(.2, .2, 20), M.steel);
      cyls.push({ body, rod, ring, base: v3(.9, 1.85, z), z });
    }
    // palonnier (spreader) : axe long sur x local
    const sp = new T.Group(); g.add(sp);
    const rot = new T.Group(); sp.add(rot);
    add(rot, RB(1.6, .5, 1.3, .06), M.boom, 0, .55, 0);
    add(rot, cylX(.25, 1.4, 20), M.steel, 0, .92, 0);
    add(rot, RB(.3, .18, .3, .04), M.amber, .55, .88, .4);
    const beamTex = stripes(512, 40, 14);
    const endTex = stripes(256, 64, 6);
    add(sp, RB(5.2, .42, .62, .04), M.boom, 0, .1, 0);
    const tele = add(sp, BX(CL - .4, .3, .42), M.boom, 0, .1, 0);
    for (const sx of [-1, 1]) {
      const e = new T.Group(); e.position.set(sx * (CL / 2 - .12), 0, 0); sp.add(e);
      add(e, BX(.4, .46, CW), new T.MeshStandardMaterial({ map: endTex, roughness: .5 }), 0, 0, 0);
      for (const z of [-CW / 2 + .09, CW / 2 - .09]) { add(e, BX(.26, .2, .26), M.boom, 0, -.27, z); add(e, CY(.04, .12, 8), M.steelLight, 0, -.42, z); }
      for (const z of [-1, 1]) { const fl = add(e, BX(.08, .6, .34), M.yellow, sx * .18, -.45, z * (CW / 2 + .02)); fl.rotation.x = z * .15; }
      add(e, RB(.2, .14, .2, .03), M.amber, 0, .3, 0);
    }
    const sideTex = new T.MeshStandardMaterial({ map: beamTex, roughness: .5 });
    add(sp, BX(5.0, .2, .02), sideTex, 0, .12, .33); add(sp, BX(5.0, .2, .02), sideTex, 0, .12, -.33);
    for (const z of [-.25, .25]) add(sp, cylX(.035, 4.6, 8), M.rubber, 0, .4, z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    Object.assign(g.userData, { boom, outer, innerB, tip, sp, cyls, wheels });
    bake(g, [boom, sp, ...wheels, ...cyls.flatMap(c => [c.body, c.rod, c.ring])]);
    bake(boom, [innerB, tip]); bake(tip); bake(sp);
    return g;
  }
  /* Positionne la flèche pour que le palonnier soit en (rx, ys) dans le repère du chariot */
  function poseStacker(st, rx, ys) {
    const u = st.userData;
    const tipL = v3(rx, ys + HEAD, 0), d = tipL.clone().sub(PIVOT), L = d.length(), a = Math.atan2(d.y, d.x);
    u.boom.rotation.z = a;
    u.innerB.position.x = L - 3.7; u.tip.position.x = L; u.tip.rotation.z = -a;
    u.sp.position.set(rx, ys, 0); u.sp.rotation.y = Math.PI / 2;
    // vérins : du châssis jusqu'à 5,2 m le long de la flèche
    const att = v3(Math.cos(a) * 5.2, Math.sin(a) * 5.2, 0).add(PIVOT).add(v3(0, -.5, 0));
    for (const c of u.cyls) {
      const A = c.base.clone(), Bp = att.clone(); Bp.z = c.z;
      const dir = Bp.clone().sub(A), len = dir.length(); dir.normalize();
      const q = new T.Quaternion().setFromUnitVectors(UP, dir);
      const bl = 2.6;
      c.body.scale.y = bl; c.body.position.copy(A).addScaledVector(dir, bl / 2); c.body.quaternion.copy(q);
      c.ring.position.copy(A).addScaledVector(dir, bl); c.ring.quaternion.copy(q);
      const rl = Math.max(.1, len - bl + .2); c.rod.scale.y = rl; c.rod.position.copy(A).addScaledVector(dir, bl - .2 + rl / 2); c.rod.quaternion.copy(q);
    }
  }

  /* ---------------- Porte-conteneurs ---------------- */
  const SHIP_L = 94, SHIP_B = 16, DECK_Y = 2.0, KEEL_Y = -5.2, HATCH_Y = 2.38;
  function hullGeometry() {
    const NX = 90, NT = 14, pos = [], col = [], idx = [], ring = 2 * NT + 1;
    const cRed = new T.Color('#9a2c24'), cBlack = new T.Color('#141518'), cNavy = new T.Color('#1b2440'), cWhite = new T.Color('#e9ebef');
    for (let i = 0; i <= NX; i++) {
      const xn = -1 + 2 * i / NX, x = xn * SHIP_L / 2;
      let fx = 1;
      if (xn > .38) { const t = (xn - .38) / .62; fx = Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.2))); }
      if (xn < -.72) { const t = (-.72 - xn) / .28; fx = 1 - .22 * t * t; }
      const vee = xn > .38 ? 1 + 4 * (xn - .38) / .62 : (xn < -.78 ? 1 + 2 * (-.78 - xn) / .22 : 1);
      const sheer = xn > .55 ? 1.7 * Math.pow((xn - .55) / .45, 2) : (xn < -.85 ? .5 * Math.pow((-.85 - xn) / .15, 2) : 0);
      let keel = KEEL_Y;
      if (xn > .82) keel = KEEL_Y + 4.5 * Math.pow((xn - .82) / .18, 1.6);
      if (xn < -.86) keel = KEEL_Y + 3.6 * Math.pow((-.86 - xn) / .14, 1.4);
      const top = DECK_Y + .9 + sheer;
      for (let j = 0; j < ring; j++) {
        const s = (j - NT) / NT, t = Math.abs(s);                   // 0 = quille, 1 = pont
        const y = lerp(keel, top, t);
        const g = 1 - Math.pow(1 - t, 6 / vee);
        const flare = xn > .5 ? 1 + .12 * t * (xn - .5) / .5 : 1;
        const z = Math.sign(s) * SHIP_B / 2 * Math.max(fx, .0) * g * flare;
        pos.push(x, y, z);
        const c = y < -1.1 ? cRed : (y < -.45 ? cBlack : (y > top - .35 ? cWhite : cNavy));
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < ring - 1; j++) {
      const a = i * ring + j, b = a + ring;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function deckOutline() {
    const s = new T.Shape(), pts = [];
    for (let i = 0; i <= 60; i++) {
      const xn = -1 + 2 * i / 60; let fx = 1;
      if (xn > .38) { const t = (xn - .38) / .62; fx = Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.2))); }
      if (xn < -.72) { const t = (-.72 - xn) / .28; fx = 1 - .22 * t * t; }
      pts.push([xn * SHIP_L / 2, SHIP_B / 2 * fx * .985]);
    }
    s.moveTo(pts[0][0], -pts[0][1]);
    pts.forEach(p => s.lineTo(p[0], -p[1])); for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], pts[i][1]);
    const g = new T.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g;
  }
  const BAYS = [-26.4, -13.6, -.8, 12, 24.8], ROWS = [-6.1, -3.66, -1.22, 1.22, 3.66, 6.1];
  const SLOT_L = v3(BAYS[1], HATCH_Y + CH / 2, ROWS[5]);          // place du conteneur héros
  function buildShip(name, heroFree) {
    const g = new T.Group();
    const hull = add(g, hullGeometry(), std({ vertexColors: true, roughness: .5, metalness: .25, side: T.DoubleSide }));
    add(g, deckOutline(), std({ color: '#7d8590', roughness: .8 }), 0, DECK_Y, 0);
    // panneaux de cale et ponts de saisissage
    for (const bx of BAYS) {
      add(g, RB(12.4, .36, 15, .04), M.grey, bx, DECK_Y + .19, 0);
      for (const sx of [-6.3, 6.3]) {
        add(g, BX(.2, 2.8, 14.6), M.steelLight, bx + sx, DECK_Y + 1.4, 0);
        for (const z of [-7, 0, 7]) add(g, BX(.25, 2.8, .2), M.steel, bx + sx, DECK_Y + 1.4, z);
        add(g, BX(.9, .08, 14.6), M.steelLight, bx + sx, DECK_Y + 2.8, 0);
      }
    }
    // gaillard d'avant : treuils, mât, ancres
    add(g, RB(4, .5, 9, .1), M.grey, 39, DECK_Y + 1.1, 0);
    for (const z of [-2.5, 2.5]) { add(g, cylX(.45, 1.2, 20), M.steel, 39, DECK_Y + 1.7, z); add(g, cylZ(.25, .9, 16), M.white, 37.5, DECK_Y + 1.6, z); }
    add(g, CY(.18, 7, 12), M.whitePaint, 42, DECK_Y + 4.5, 0);
    add(g, BX(.2, .2, 3), M.whitePaint, 42, DECK_Y + 7, 0);
    for (const z of [-1, 1]) add(g, BX(.9, 1.2, .25), M.steel, 44.6, DECK_Y - 1.2, z * 5.1, 0, z * .55, 0);
    // château arrière
    const sx = -40.5;
    const lv = [[10, 15.4, 2.8], [9, 14.6, 2.8], [8.4, 14, 2.8], [8, 13, 2.8]];
    let y = DECK_Y;
    const winTex = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#f2f3f5'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1f26'; for (let i = 0; i < 16; i++) c.fillRect(8 + i * 32, 20, 20, 26); });
    winTex.wrapS = T.RepeatWrapping;
    const winMat = std({ map: winTex, roughness: .4 });
    for (const [lx, lz, lh] of lv) {
      const m = add(g, BX(lx, lh, lz), [M.whitePaint, M.whitePaint, M.whitePaint, M.whitePaint, winMat, winMat], sx, y + lh / 2, 0);
      add(g, BX(lx + .2, .12, lz + .2), M.white, sx, y + lh, 0);
      y += lh;
    }
    // passerelle : vitres inclinées + ailerons
    add(g, BX(7.8, 2.4, 13), M.whitePaint, sx, y + 1.2, 0);
    const bw = add(g, BX(.1, 1.3, 13.2), M.glass, sx + 3.95, y + 1.4, 0, 0, 0, -.18);
    add(g, BX(3.0, .2, SHIP_B + 1.6), M.whitePaint, sx + 2.2, y + .3, 0);
    for (const z of [-1, 1]) add(g, BX(2.6, 1.1, .1), M.whitePaint, sx + 2.2, y + .85, z * (SHIP_B / 2 + .75));
    add(g, BX(8.2, .25, 13.6), M.white, sx, y + 2.5, 0);
    // mât radar + radar tournant
    add(g, BX(.4, 4.5, .4), M.whitePaint, sx - 1, y + 4.8, 0);
    add(g, BX(.3, .3, 5), M.whitePaint, sx - 1, y + 6, 0);
    const radar = add(g, BX(.25, .2, 3.6), M.white, sx - 1, y + 7.3, 0);
    // cheminée avec bande bleue
    const fun = add(g, RB(4.4, 6.5, 4, .4), M.whitePaint, sx - 3.6, y + 2.8, 0);
    add(g, RB(4.5, .9, 4.1, .4), std({ color: '#2f63ff', roughness: .4 }), sx - 3.6, y + 4.6, 0);
    add(g, RB(4.5, .6, 4.1, .4), M.plastic, sx - 3.6, y + 6.0, 0);
    // canot de sauvetage
    const lb = add(g, RB(6, 1.8, 2.2, .7), M.orange, sx - 6.4, DECK_Y + 6.5, 0, 0, 0, -.5);
    add(g, BX(.3, 3, 3), M.steelLight, sx - 7.5, DECK_Y + 5.5, 0);
    // garde-corps sur le pont principal
    const railPts = [];
    for (let x = -44; x <= 36; x += 1.6) for (const z of [-SHIP_B / 2 + .2, SHIP_B / 2 - .2]) railPts.push([x, z]);
    const post = new T.InstancedMesh(CY(.03, 1.1, 6), M.whitePaint, railPts.length), m4 = new T.Matrix4();
    railPts.forEach((p, i) => { m4.makeTranslation(p[0], DECK_Y + 1.45, p[1]); post.setMatrixAt(i, m4); }); g.add(post);
    for (const z of [-SHIP_B / 2 + .2, SHIP_B / 2 - .2]) { add(g, cylX(.04, 80, 6), M.whitePaint, -4, DECK_Y + 2.0, z); add(g, cylX(.03, 80, 6), M.whitePaint, -4, DECK_Y + 1.5, z); }
    // nom du navire sur l'étrave et le tableau arrière
    const nameTex = plateTex([{ t: name, f: '600 96px Archivo, sans-serif', y: 10, c: '#ffffff' }], null, '#fff', 700, 120);
    decal(g, 7, 1.2, nameTex, 36, DECK_Y + .3, SHIP_B / 2 * .72 + .05, -.18);
    decal(g, 7, 1.2, nameTex, 36, DECK_Y + .3, -SHIP_B / 2 * .72 - .05, Math.PI + .18);
    // marques de tirant d'eau
    const draft = plateTex([{ t: '10M', f: '600 60px Archivo', y: 0, c: '#fff' }, { t: ' 8M', f: '600 60px Archivo', y: 70, c: '#fff' }], null, '#fff', 160, 140);
    decal(g, .8, .7, draft, 42, -.2, SHIP_B / 2 * .5 + .2, -.4);
    // conteneurs à bord
    const slots = [];
    BAYS.forEach((bx, bi) => ROWS.forEach((rz, ri) => {
      const isHero = bi === 1 && ri === 5;
      const n = isHero ? (heroFree ? 0 : 1) : (bi === 1 && ri === 4 ? 2 : 1 + Math.floor(rnd() * 2.4));
      for (let t = 0; t < n; t++) slots.push([bx, HATCH_Y + CH / 2 + t * CH, rz, Math.floor(rnd() * 10)]);
    }));
    crowd(slots, g);
    // sillage
    const wakeTex = canvasTex(512, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,.95)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h * .36); c.lineTo(w, h * .64); c.lineTo(0, h); c.fill();
    });
    const wakeM = new T.MeshBasicMaterial({ map: wakeTex, transparent: true, opacity: 0, depthWrite: false });
    const wake = new T.Mesh(new T.PlaneGeometry(170, 44), wakeM); wake.rotation.x = -Math.PI / 2; wake.position.set(-SHIP_L / 2 - 84, -1.32, 0); g.add(wake);
    const bowM = new T.MeshBasicMaterial({ map: wakeTex, transparent: true, opacity: 0, depthWrite: false });
    for (const z of [-1, 1]) { const bwv = new T.Mesh(new T.PlaneGeometry(26, 8), bowM); bwv.rotation.set(-Math.PI / 2, 0, Math.PI - z * .25); bwv.position.set(36, -1.3, z * 7.5); g.add(bwv); }
    g.traverse(o => { if (o.isMesh && o !== wake) { o.castShadow = true; o.receiveShadow = true; } });
    Object.assign(g.userData, { wakeM, bowM, radar });
    return bake(g, [radar]);
  }

  /* ---------------- Portique de quai ---------------- */
  function buildCrane() {
    const g = new T.Group(), LEG = 36, BY = 38.5;
    for (const x of [-9, 9]) for (const z of [11, -6.5]) {
      add(g, RB(1.5, LEG, 1.5, .1), M.teal, x, LEG / 2 + 1.6, z);
      add(g, RB(3.4, 1.6, 2.0, .1), M.tealDark, x, .9, z);
      for (const wx of [-1.1, 0, 1.1]) add(g, cylZ(.35, .6, 16), M.steel, x + wx, .35, z + 1.05);
    }
    for (const x of [-9, 9]) { add(g, RB(1.7, 1.7, 19.4, .1), M.teal, x, 13, 2.25); strut(g, v3(x, 14, 10.5), v3(x, 34, -6), .35, M.teal); }
    for (const z of [11, -6.5]) add(g, RB(19.6, 2.2, 2, .1), M.teal, 0, LEG + 1.6, z);
    for (const x of [-3.4, 3.4]) {
      add(g, RB(1.4, 2.4, 82, .08), M.teal, x, BY, -14);
      for (let z = -54; z < 26; z += 4) strut(g, v3(x, BY - 1.1, z), v3(x, BY + 1.1, z + 4), .1, M.tealDark, 6);
    }
    for (let z = -54; z <= 26; z += 5) add(g, BX(8.2, .4, .4), M.teal, 0, BY - 1.3, z);
    // haubans + chevalet
    for (const x of [-3.4, 3.4]) {
      add(g, RB(1.1, 16, 1.1, .08), M.teal, x, BY + 8, 4);
      strut(g, v3(x, BY + 15.5, 4), v3(x, BY + 1, -50), .22, M.teal);
      strut(g, v3(x, BY + 15.5, 4), v3(x, BY + 1, -24), .2, M.teal);
      strut(g, v3(x, BY + 15.5, 4), v3(x, BY + 1, 24), .22, M.teal);
    }
    // salle des machines avec fenêtres
    const mh = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#eef0f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#26313b'; for (let i = 0; i < 7; i++) c.fillRect(10 + i * 35, 22, 22, 18); });
    add(g, RB(9.4, 5, 10, .2), [M.whitePaint, M.whitePaint, M.whitePaint, M.whitePaint, std({ map: mh }), std({ map: mh })], 0, BY + 3.8, 16);
    // escaliers le long d'une jambe
    for (let i = 0; i < 16; i++) add(g, BX(1.2, .08, .5), M.steelLight, 10.3, 2 + i * 2.2, 11 + ((i % 2) ? .4 : -.4));
    // chariot, cabine, palonnier
    const trolley = new T.Group(); g.add(trolley);
    add(trolley, RB(8.4, 2, 4.4, .1), M.whitePaint, 0, BY - 2.2, 0);
    add(trolley, RB(2.4, 2, 2.4, .2), M.whitePaint, 2.4, BY - 4.4, 1.3);
    add(trolley, BX(2.3, .9, .05), M.glass, 2.4, BY - 4.3, 2.52);
    const sp = new T.Group(); g.add(sp);
    add(sp, BX(CL - .4, .42, .5), M.boom, 0, 0, 0);
    const endTex = stripes(256, 64, 6);
    for (const sx of [-1, 1]) add(sp, BX(.4, .48, CW), new T.MeshStandardMaterial({ map: endTex }), sx * (CL / 2 - .12), 0, 0);
    add(sp, RB(2.6, .7, 1.8, .1), M.yellow, 0, .5, 0);
    const cables = [];
    for (const [cx, cz] of [[-1.1, .6], [1.1, .6], [-1.1, -.6], [1.1, -.6]]) { const c = add(g, CY(.04, 1, 6), M.rubber); c.userData = { cx, cz }; cables.push(c); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    Object.assign(g.userData, { trolley, sp, cables, BY });
    bake(g, [trolley, sp, ...cables]); bake(trolley); bake(sp);
    return g;
  }
  function poseCrane(c, z, y) {
    const u = c.userData; u.trolley.position.z = z; u.sp.position.set(0, y, z);
    for (const k of u.cables) { const top = u.BY - 3.2, bot = y + .3, len = top - bot; k.scale.y = Math.max(.01, len); k.position.set(k.userData.cx, bot + len / 2, z + k.userData.cz); }
  }

  /* ---------------- Éoliennes ---------------- */
  const rotors = [];
  const bladeGeo = (() => {
    const s = new T.Shape();
    s.moveTo(-.55, 0); s.bezierCurveTo(-1.6, 4, -1.4, 9, -.5, 27); s.lineTo(-.1, 28); s.bezierCurveTo(.3, 18, .7, 6, .55, 0); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: .22, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3, curveSegments: 14 });
    g.translate(0, 1.2, -.11); return g;
  })();
  function turbine(parent, x, z, s = 1, base = 0, yaw = .5) {
    const g = new T.Group();
    add(g, CY(1.05, 66, 28, 1.9), M.whitePaint, 0, 33, 0);
    if (base < 0) { add(g, CY(3.2, 6, 28), M.yellow, 0, 1.2, 0); add(g, CY(4.2, .4, 28), M.steelLight, 0, 4.4, 0); }
    const nac = new T.Group(); nac.position.y = 66.5; g.add(nac);
    add(nac, RB(3.4, 3.6, 10, .9), M.whitePaint, 0, 0, -1.6);
    const rot = new T.Group(); rot.position.set(0, 0, 3.8); nac.add(rot);
    add(rot, new T.SphereGeometry(1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.whitePaint, 0, 0, .3, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) { const b = add(rot, bladeGeo, M.whitePaint); b.rotation.z = i * Math.PI * 2 / 3; }
    rot.rotation.z = rnd() * 6; rotors.push(rot);
    bake(g, [rot]); bake(rot);
    g.scale.setScalar(s); g.position.set(x, base, z); g.rotation.y = yaw; parent.add(g);
    return g;
  }

  /* ======================= LE MONDE ======================= */
  // mer
  const waveN = canvasTex(256, 256, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = Math.sin(x / w * Math.PI * 8 + Math.sin(y / h * Math.PI * 4) * 1.3) * .35 + Math.sin((x + y) / w * Math.PI * 14) * .15;
      const ny = Math.cos(y / h * Math.PI * 6 + Math.sin(x / w * Math.PI * 2) * 1.6) * .35;
      const i = (y * w + x) * 4; img.data[i] = 128 + nx * 110; img.data[i + 1] = 128 + ny * 110; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, false);
  waveN.wrapS = waveN.wrapT = T.RepeatWrapping; waveN.repeat.set(90, 90);
  const sea = new T.Mesh(new T.PlaneGeometry(6000, 6000), std({ color: '#aebdd3', roughness: .38, metalness: 0, envMapIntensity: .55, normalMap: waveN, normalScale: new T.Vector2(.12, .12) }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(700, -1.4, 0); sea.receiveShadow = true; scene.add(sea);

  // terre d'origine (route + parc éolien) et quai de départ, au noir de la bande de la vidéo
  const GROUND_TOP = 0;
  const land = (x0, x1, z0, z1) => { const m = new T.Mesh(BX(x1 - x0, 3, z1 - z0), M.ground); m.position.set((x0 + x1) / 2, GROUND_TOP - 1.5, (z0 + z1) / 2); scene.add(m); return m; };
  land(-2400, -40, -2500, 500);
  const QUAY_Z = -26;
  land(-40, 430, QUAY_Z, 500);
  // bord de quai en béton, défenses, bollards
  add(scene, BX(470, 1.6, .6), M.concrete, 195, -.8, QUAY_Z + .3);
  for (let x = -30; x < 420; x += 9) { add(scene, cylZ(.45, .6, 16), M.rubber, x, -.9, QUAY_Z - .2); }
  for (let x = -26; x < 420; x += 16) { add(scene, CY(.28, .6, 14), M.steel, x, .3, QUAY_Z + 1.2); add(scene, CY(.38, .1, 14), M.steel, x, .65, QUAY_Z + 1.2); }
  // marquages au sol (absents au début pour garder la bande noire pure)
  for (let x = -170; x < 430; x += 9) add(scene, BX(4.5, .02, .2), M.groundLine, x, .01, 7.4);
  add(scene, BX(600, .02, .14), M.groundLine, 130, .01, -3.3);
  add(scene, BX(470, .02, .14), M.groundLine, 195, .01, QUAY_Z + 2.6);
  for (let x = -20; x < 60; x += 12.8) add(scene, BX(.15, .02, 3), M.groundLine, x, .01, QUAY_Z + 5.5);

  // parc éolien et site de production le long de la route
  [[-150, -70], [-112, -120], [-80, -62], [-44, -150], [-168, -160], [-200, -95]].forEach(([x, z]) => turbine(scene, x, z, 1, 0, .4));
  const plant = new T.Group(); plant.position.set(-112, 0, -26); scene.add(plant);
  add(plant, RB(22, 7, 11, .2), M.whitePaint, 0, 3.5, 0);
  add(plant, RB(22.2, .4, 11.2, .1), M.steelLight, 0, 7.1, 0);
  const plantTex = plateTex([{ t: 'SITE DE PRODUCTION · ÉLECTROLYSE', f: '600 44px Archivo', y: 10, c: '#1b2a55' }], null, '#111', 900, 70);
  decal(plant, 14, 1.1, plantTex, -1, 5.6, 5.52);
  for (let i = 0; i < 5; i++) { add(plant, cylX(1.05, 9, 24), M.whitePaint, 0, 1.3 + (i % 2) * 2.2, -9 - Math.floor(i / 2) * 2.4); }
  for (let i = 0; i < 3; i++) { const b = buildContainer('#eceef1', 'LHYU 30' + i + '118 6'); b.position.set(16 + i * 0, 0, -3 + i * 3.2); b.rotation.y = Math.PI / 2; plant.add(b); }
  add(plant, cylX(.25, 30, 12), M.steelLight, 0, 6, -6.5);
  for (let x = -12; x <= 12; x += 6) add(plant, BX(.2, 6, .2), M.steel, x, 3, -6.5);

  // conteneurs en attente sur le quai de départ
  const yard = [];
  for (let bx = 0; bx < 4; bx++) for (let row = 0; row < 5; row++) { const n = 1 + Math.floor(rnd() * 4); for (let t = 0; t < n; t++) yard.push([40 + bx * 13.2, CH / 2 + t * CH, 16 + row * 2.6, Math.floor(rnd() * 10)]); }
  crowd(yard, scene);
  // deux portiques en décor au terminal de départ
  for (const cx of [80, 140]) { const c = buildCrane(); c.position.set(cx, 0, QUAY_Z + 7.6); poseCrane(c, 4, 22); scene.add(c); }

  // acteurs principaux
  const truck = buildTruck(); scene.add(truck);
  const hero = buildContainer('#b8bcc3'); scene.add(hero);
  const stacker = buildStacker(); scene.add(stacker);
  const ship = buildShip('ALIZÉ', true); scene.add(ship);
  const SHIP0 = v3(0 - SLOT_L.x, 0, QUAY_Z - 2.6 - SHIP_B / 2);  // créneau du héros au droit de x = 0
  ship.position.copy(SHIP0);
  const SLOT_W = SLOT_L.clone().add(SHIP0);

  // au large : parc éolien en mer + plateforme flottante de production d'hydrogène
  const OFF = v3(640, 0, -330);
  for (let i = 0; i < 14; i++) {
    const r = Math.floor(i / 5), c = i % 5;
    turbine(scene, OFF.x - 200 + c * 120 + (r % 2) * 60, OFF.z - 40 - r * 130, 1.1, -1.4, .2);
  }
  const plat = new T.Group(); plat.position.set(OFF.x - 60, -1.4, OFF.z + 20); scene.add(plat);
  (function platform() {
    add(plat, RB(30, 4.5, 30, .4), M.yellow, 0, 0, 0);
    add(plat, RB(30.4, .5, 30.4, .1), M.steelLight, 0, 2.4, 0);
    for (let i = 0; i < 2; i++) { const b = buildContainer('#f1f2f4', 'LHYU 77' + i + '402 9'); b.position.set(-4, 2.65, -6 + i * 4); plat.add(b); }
    for (let i = 0; i < 4; i++) add(plat, cylX(1.0, 9, 24), M.whitePaint, 6, 3.8, -9 + i * 2.4);
    add(plat, RB(6, 4, 5, .2), M.whitePaint, 8, 4.7, 9);
    add(plat, BX(.4, 14, .4), M.whitePaint, -12, 9.5, 12);
    add(plat, RB(.8, .8, .8, .2), M.amber, -12, 16.8, 12);
    strut(plat, v3(10, 2.6, -12), v3(4, 14, -12), .3, M.yellow);
    const post = new T.InstancedMesh(CY(.04, 1.2, 6), M.whitePaint, 120), m4 = new T.Matrix4(); let k = 0;
    for (let i = 0; i < 30; i++) for (const [a, b] of [[-14.6 + i, -14.6], [-14.6 + i, 14.6], [-14.6, -14.6 + i], [14.6, -14.6 + i]]) { m4.makeTranslation(a, 3.25, b); post.setMatrixAt(k++, m4); }
    plat.add(post);
    for (const [a, b, w, d] of [[0, -14.6, 29.4, .06], [0, 14.6, 29.4, .06], [-14.6, 0, .06, 29.4], [14.6, 0, .06, 29.4]]) add(plat, BX(w, .06, d), M.whitePaint, a, 3.85, b);
    const sign = plateTex([{ t: 'H₂ · PRODUCTION EN MER', f: '600 48px Archivo', y: 8, c: '#111' }], null, '#111', 700, 70);
    decal(plat, 10, 1, sign, 0, .6, 15.25);
    // câble vers l'éolienne la plus proche
    add(plat, cylX(.25, 60, 8), M.rubber, -44, -1.2, -20);
  })();

  // port de destination
  const DEST_Q = -92 + SHIP_B / 2 + 2.6;   // bord du quai d'arrivée
  land(1150, 1700, DEST_Q, 400);
  add(scene, BX(550, 1.6, .6), M.concrete, 1425, -.8, DEST_Q + .3);
  for (let x = 1160; x < 1690; x += 9) add(scene, cylZ(.45, .6, 16), M.rubber, x, -.9, DEST_Q - .2);
  for (let x = 1160; x < 1690; x += 16) add(scene, CY(.28, .6, 14), M.steel, x, .3, DEST_Q + 1.2);
  for (let x = 1160; x < 1690; x += 9) add(scene, BX(4.5, .02, .2), M.groundLine, x, .01, DEST_Q + 20);
  const destCrane = buildCrane(); scene.add(destCrane);
  const SHIP_END = v3(1380, 0, -92);
  const DEST_SLOT = SLOT_L.clone().add(SHIP_END);
  destCrane.position.set(DEST_SLOT.x, 0, DEST_Q + 7.6);
  const destSlotZ = DEST_SLOT.z - destCrane.position.z;
  const truck2 = buildTruck(); truck2.position.set(DEST_SLOT.x + 1, 0, DEST_Q + 7.6 + 2); scene.add(truck2);
  // usine cliente : réservoirs, bâtiments, rack de tuyaux, station hydrogène
  const site = new T.Group(); site.position.set(1460, 0, DEST_Q + 40); scene.add(site);
  add(site, RB(46, 12, 22, .3), M.whitePaint, 0, 6, 0);
  add(site, RB(46.4, .6, 22.4, .1), M.steelLight, 0, 12.2, 0);
  const siteTex = plateTex([{ t: 'USINE · HYDROGÈNE VERT LIVRÉ', f: '600 52px Archivo', y: 10, c: '#1b2a55' }], null, '#111', 900, 80);
  decal(site, 20, 1.8, siteTex, -6, 9, 11.05);
  for (let i = 0; i < 4; i++) { add(site, new T.SphereGeometry(5, 32, 20), M.whitePaint, -40 + i * 12, 6.5, -6); add(site, CY(.4, 5, 10), M.steelLight, -40 + i * 12, 2, -6); }
  for (let i = 0; i < 3; i++) add(site, CY(1.2, 26, 20), M.whitePaint, 28 + i * 4, 13, -4);
  add(site, RB(1.6, 1.2, 1.6, .2), std({ color: '#2f63ff' }), 32, 26, -4);
  add(site, cylX(.4, 80, 12), M.steelLight, -10, 4, 14); add(site, cylX(.3, 80, 12), M.steelLight, -10, 4.8, 14);
  for (let x = -48; x <= 28; x += 8) add(site, BX(.3, 5, .3), M.steel, x, 2.5, 14);
  const destYard = [];
  for (let bx = 0; bx < 3; bx++) for (let row = 0; row < 4; row++) { const n = 1 + Math.floor(rnd() * 3); for (let t = 0; t < n; t++) destYard.push([1250 + bx * 13.2, CH / 2 + t * CH, DEST_Q + 28 + row * 2.6, Math.floor(rnd() * 10)]); }
  crowd(destYard, scene);
  [[1260, -260], [1380, -320], [1500, -270], [1620, -330]].forEach(([x, z]) => turbine(scene, x, z, 1.1, -1.4, .2));

  bake(plant); bake(plat); bake(site);
  (function bakeScene() {
    const g = new T.Group(); scene.add(g);
    [...scene.children].forEach(o => { if (o.isMesh && !o.isInstancedMesh && o !== sea && !Array.isArray(o.material)) { scene.remove(o); g.add(o); } });
    bake(g);
  })();

  /* ---------------- Route du navire ---------------- */
  const route = new T.CatmullRomCurve3([
    SHIP0.clone(), v3(40, 0, -54), v3(130, 0, -120), v3(320, 0, -200), v3(540, 0, -240), v3(780, 0, -236),
    v3(1000, 0, -180), v3(1160, 0, -118), v3(1290, 0, -94), SHIP_END.clone()
  ], false, 'centripetal');
  const routeLen = route.getLength();

  /* ---------------- Chronologie (p de 0 à 1) ---------------- */
  const TRUCK_START = -230, TRUCK_STOP = 1;
  const ST = { x: 0, zFar: -19, zGrab: 2 - 12.2, zBack: -16, rx: 12.2 };
  const SPREAD_ON_TRUCK = C_ON_TRUCK + CH / 2 + .25;
  const SPREAD_ON_SHIP = SLOT_W.y + CH / 2 + .25;
  const CARRY = 11.2;

  function truckX(p) {
    const a = lin(p, .03, .2);
    const e = a < .5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;    // démarre doucement, freine en arrivant
    const leave = Math.pow(lin(p, .5, .62), 2);
    return lerp(TRUCK_START, TRUCK_STOP, e) + leave * 330;
  }
  function stackerPose(p) {
    // position (x,z), cap (yaw), portée rx, hauteur du palonnier ys
    let x = ST.x, z = ST.zFar, yaw = -Math.PI / 2, rx = 9.5, ys = 7.5;
    z = lerp(z, ST.zGrab, seg(p, .235, .29)); rx = lerp(rx, ST.rx, seg(p, .235, .29));
    ys = lerp(ys, SPREAD_ON_TRUCK, seg(p, .29, .315));
    ys = lerp(ys, CARRY, seg(p, .325, .355));
    z = lerp(z, ST.zBack, seg(p, .355, .38));
    const turn = seg(p, .38, .43);
    yaw = lerp(-Math.PI / 2, Math.PI / 2, turn);
    x = lerp(x, 0, turn) + Math.sin(turn * Math.PI) * 4;
    const zQuay = SLOT_W.z + ST.rx;
    z = lerp(z, zQuay, seg(p, .43, .465));
    ys = lerp(ys, SPREAD_ON_SHIP, seg(p, .47, .5));
    ys = lerp(ys, 7.5, seg(p, .505, .53));
    z = lerp(z, -10, seg(p, .53, .57)); rx = lerp(rx, 9.5, seg(p, .53, .57));
    return { x, z, yaw, rx, ys };
  }
  function shipPose(p, time) {
    const u = seg(p, .565, .915);
    const pos = route.getPointAt(u);
    const tan = route.getTangentAt(Math.min(.999, Math.max(.001, u)));
    let yaw = Math.atan2(-tan.z, tan.x);
    yaw *= sm(u / .05) * (u > .96 ? 1 - sm((u - .96) / .04) : 1);
    const speed = 6 * u * (1 - u);
    return { pos, yaw, u, speed, bob: Math.sin(time * .0008) * .12 };
  }

  /* ---------------- Caméras ---------------- */
  // Plan d'ouverture calé au pixel près sur la dernière image de la vidéo
  function matchedCam(tx) {
    const c = S.clip, vw = S.vw, vh = S.vh;
    const rigLen = RIG_FRONT - RIG_REAR, pxm = (.5 * c.w) / rigLen;
    const D = 280, tanH = (vh / 2) / (D * pxm);
    const camX = tx + (RIG_REAR + RIG_FRONT) / 2 - (c.left + .41 * c.w - vw / 2) / pxm;
    const contactY = c.top + .448 * c.h;
    return { pos: v3(camX, .1, 2 + D), tgt: v3(camX, .1, 2), fovTan: tanH, offY: contactY - vh / 2, K: tanH * D };
  }
  const tmpA = v3(0, 0, 0), tmpB = v3(0, 0, 0);
  function cameraAt(p, tx, sp, time) {
    const k = S.phone ? 1.7 : 1;
    const m = matchedCam(tx);
    // 1) travelling compensé : le camion garde sa taille pendant que la perspective s'ouvre
    const dz = seg(p, .035, .16);
    const dist = Math.exp(lerp(Math.log(280), Math.log(38 * k), dz));
    const ang = lerp(0, -.62, dz);
    const height = lerp(.1, 9 + 3 * k, dz);
    const cx = m.pos.x + Math.sin(ang) * dist * 0 + lerp(0, 0, dz);
    let pos = v3(tx + 1.5 + Math.sin(ang) * dist + (m.pos.x - tx - 1.5) * (1 - dz), height, 2 + Math.cos(ang) * dist);
    let tgt = v3(lerp(m.tgt.x, tx + 4, dz), lerp(.1, 3.2, dz), lerp(2, 0, dz));
    let fovTan = m.K / dist;
    if (dz >= 1) fovTan = m.K / (38 * k);
    let offY = m.offY * (1 - dz);
    // 2) vue d'ensemble du terminal
    const wide = { pos: v3(-20 * k, 11 + 4 * k, 30 * k), tgt: v3(1, 3.2, -6) };
    const load = { pos: v3(-30 * k, 15 + 6 * k, 30 * k), tgt: v3(0, 5, -19) };
    const mixTo = (P, t) => { pos.lerp(P.pos, t); tgt.lerp(P.tgt, t); };
    mixTo(wide, seg(p, .19, .26));
    mixTo(load, seg(p, .36, .47));
    // 3) le navire part : caméra qui l'accompagne
    const shipOff = v3(-62 * k, 22 + 8 * k, 74 * k).applyAxisAngle(UP, sp.yaw * .8);
    const chase = { pos: sp.pos.clone().add(shipOff), tgt: sp.pos.clone().add(v3(8, 5, -4)) };
    mixTo(chase, seg(p, .55, .64));
    // 4) en mer, vue plus large au passage du parc éolien
    const sea2 = { pos: sp.pos.clone().add(v3(-80 * k, 30 + 8 * k, 70 * k)), tgt: sp.pos.clone().add(v3(30, 12, -40)) };
    mixTo(sea2, seg(p, .67, .74) * (1 - seg(p, .8, .86)));
    // 5) arrivée et plan final
    const arrive = { pos: v3(SHIP_END.x + 75 * k, 22 + 6 * k, SHIP_END.z - 85 * k), tgt: v3(SHIP_END.x - 5, 8, SHIP_END.z + 14) };
    mixTo(arrive, seg(p, .82, .9));
    const fin = { pos: v3(SHIP_END.x + 20 * k, 48 + 20 * k, SHIP_END.z - 175 * k), tgt: v3(SHIP_END.x + (S.phone ? 0 : 38), S.phone ? 14 : 8, SHIP_END.z + 25) };
    mixTo(fin, seg(p, .92, 1));
    return { pos, tgt, fovTan, offY };
  }

  /* ---------------- Mise en place selon la progression ---------------- */
  function place(p, time) {
    // camion
    const tx = truckX(p);
    truck.position.set(tx, 0, 2);
    for (const w of truck.userData.wheels) w.rotation.z = (w.rotation.y ? 1 : -1) * tx / .535;

    // chariot
    const sp = stackerPose(p);
    stacker.position.set(sp.x, 0, sp.z); stacker.rotation.y = sp.yaw;
    poseStacker(stacker, sp.rx, sp.ys);
    const roll = sp.z * 1.2 + sp.yaw * 3;
    for (const w of stacker.userData.wheels) w.rotation.z = (w.rotation.y ? 1 : -1) * roll;

    // navire
    const sh = shipPose(p, time);
    ship.position.copy(sh.pos); ship.position.y = sh.bob; ship.rotation.y = sh.yaw;
    ship.rotation.z = Math.sin(time * .0006) * .006; ship.rotation.x = Math.sin(time * .0005) * .004;
    ship.userData.wakeM.opacity = clamp(sh.speed * .9) * .8; ship.userData.bowM.opacity = clamp(sh.speed * .9) * .7;
    ship.userData.radar.rotation.y = time * .0012;

    // conteneur héros : remorque -> palonnier -> navire
    if (p < .316) { hero.position.set(tx - 1, Y_DECK, 2); hero.rotation.set(0, 0, 0); }
    else if (p < .5) {
      const w = stacker.userData.sp.getWorldPosition(tmpA);
      hero.position.set(w.x, w.y - .25 - CH, w.z); hero.rotation.set(0, sp.yaw + Math.PI / 2, 0);
    } else {
      ship.updateMatrixWorld();
      const s = SLOT_L.clone(); s.y -= CH / 2; hero.position.copy(s.applyMatrix4(ship.matrixWorld));
      hero.quaternion.copy(ship.quaternion); hero.rotateY(0);
    }
    // portique d'arrivée : il descend vers le conteneur à l'accostage
    const dc = seg(p, .9, .97);
    poseCrane(destCrane, lerp(2, destSlotZ, seg(p, .86, .9)), lerp(24, SLOT_L.y + CH / 2 + .3 + 2.0, dc));

    // plateforme qui tangue
    plat.rotation.z = Math.sin(time * .0011) * .015; plat.position.y = -1.4 + Math.sin(time * .0013) * .2;

    // caméra
    const c = cameraAt(p, tx, sh, time);
    camera.position.copy(c.pos); camera.lookAt(c.tgt);
    camera.fov = 2 * Math.atan(c.fovTan) * 180 / Math.PI;
    if (Math.abs(c.offY) > .5) camera.setViewOffset(S.vw, S.vh, 0, -c.offY, S.vw, S.vh); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    // brume : nulle au début (bande noire nette), puis douce
    const fz = seg(p, .06, .2);
    fog.near = lerp(5000, 260, fz); fog.far = lerp(6000, 1100, fz);
    sun.position.copy(c.tgt).add(v3(60, 110, 70)); sun.target.position.copy(c.tgt);
    const sh2 = lerp(45, 90, seg(p, .55, .7));
    Object.assign(sun.shadow.camera, { left: -sh2, right: sh2, top: sh2, bottom: -sh2 }); sun.shadow.camera.updateProjectionMatrix();

    // textes
    for (const s of steps) s.classList.toggle('on', p >= +s.dataset.a && p < +s.dataset.b);
    bars.forEach((b, i) => { const a = +steps[i].dataset.a, e = +steps[i].dataset.b; b.style.transform = 'scaleX(' + lin(p, a, e).toFixed(3) + ')'; });
    endcard.classList.toggle('on', p >= .93);
  }

  /* ---------------- Taille et boucle ---------------- */
  function size() {
    renderer.setSize(S.vw || innerWidth, S.vh || innerHeight, false);
    camera.aspect = (S.vw || innerWidth) / (S.vh || innerHeight);
    camera.updateProjectionMatrix();
  }
  addEventListener('lhyfe:layout', size); size();

  let pS = 0, warm = 0;
  window.__port3dSet = v => { pS = v; };            // pour les captures
  let dead = false;
  function loop(time) {
    if (dead) return;
    try { frame3d(time); } catch (e) { dead = true; fallback(e); return; }
    requestAnimationFrame(loop);
  }
  function frame3d(time) {
    const y = scrollY, start = (S.A + S.B - .6) * S.vh;
    const p = S.p3 || 0;
    if (y > start || warm < 3) {
      pS += (p - pS) * .16; if (Math.abs(p - pS) < 1e-5) pS = p;
      if (window.__port3dFreeze !== undefined) pS = window.__port3dFreeze;
      for (const r of rotors) r.rotation.z -= .01;
      place(pS, time);
      renderer.render(scene, camera);
      warm++;
    }
  }
  renderer.domElement.addEventListener('webglcontextlost', () => { dead = true; fallback('contexte WebGL perdu'); });
  window.__port3dReady = true;
  requestAnimationFrame(loop);
  }
})();
