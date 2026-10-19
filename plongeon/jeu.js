/* Falaise – jeu de plongeon (cliff diving et dødsing) en 3D.
   Tout est dessiné par le code : relief, eau, ciel et plongeur. Aucune image à télécharger. */
(function () {
  "use strict";

  // ---------------------------------------------------------------
  // Réglages généraux
  // ---------------------------------------------------------------
  const GRAVITE = 9.81;
  const SOLEIL = new THREE.Vector3(0.75, 0.32, 0.28).normalize();
  const HORIZON = new THREE.Color().setRGB(0.55, 0.66, 0.78);
  // Les trois plongeoirs : hauteur (m) et position le long de la côte
  const SPOTS = { 10: { z: -45 }, 20: { z: 0 }, 27: { z: 45 } };
  const BONUS_HAUTEUR = { 10: 1.0, 20: 1.3, 27: 1.6 };
  // Zone où l'on calcule la profondeur de l'eau (eau turquoise et écume au bord)
  const ZONE_FOND = { x0: -40, x1: 60, z0: -180, z1: 180 };

  // ---------------------------------------------------------------
  // Bruit (pour dessiner un relief naturel)
  // ---------------------------------------------------------------
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function bruit(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  function fbm(x, y, octaves) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (octaves || 5); i++) { s += amp * bruit(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return s;
  }
  const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const melange = (a, b, t) => a + (b - a) * t;

  // ---------------------------------------------------------------
  // Le relief : une côte en falaise (x < 0), la mer, et des montagnes au loin (x > 380)
  // ---------------------------------------------------------------
  function masqueSpot(z) {
    let m = 0;
    for (const h in SPOTS) m = Math.max(m, Math.exp(-Math.pow((z - SPOTS[h].z) / 9, 2)));
    return m;
  }
  function hauteurFalaise(z) {
    // Hauteur du bord de la falaise, qui passe exactement par les plongeoirs
    const pts = [[-1600, 40], [-220, 15], [-45, 9.6], [0, 19.6], [45, 26.6], [220, 34], [1600, 60]];
    let e = pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (z >= pts[i][0] && z <= pts[i + 1][0]) {
        e = melange(pts[i][1], pts[i + 1][1], lisse(0, 1, (z - pts[i][0]) / (pts[i + 1][0] - pts[i][0])));
      }
    }
    if (z > pts[pts.length - 1][0]) e = pts[pts.length - 1][1];
    return melange(e + 3 * fbm(z * 0.03, 7.1, 3), e, masqueSpot(z));
  }
  function bordFalaise(z) {
    return melange(-0.6 + 6 * fbm(z * 0.018, 3.3, 4), -0.6, masqueSpot(z));
  }
  function hauteurSol(x, z) {
    const bord = bordFalaise(z);
    const haut = hauteurFalaise(z);
    const d = bord - x; // distance vers l'intérieur des terres
    const collines = 22 * fbm(x * 0.008, z * 0.008, 5) + 10;
    const terre = haut + Math.max(0, d) * 0.12 * (0.6 + 0.4 * fbm(x * 0.02, z * 0.02, 3)) +
      collines * lisse(6, 90, d) + 0.4 * fbm(x * 0.3, z * 0.3, 2) * lisse(2, 8, d);
    // La paroi : chute presque verticale avec des aspérités
    const t = lisse(bord, bord + 3.2 + 2 * Math.abs(bruit(z * 0.2, 1.7)), x);
    const fond = -9 - 0.05 * Math.max(0, x - bord);
    let h = melange(terre, fond, t);
    h += t * (1 - t) * 6 * fbm(z * 0.25, h * 0.25 + 4, 3);
    // Montagnes de l'autre côté du fjord
    const m = lisse(330, 520, x);
    if (m > 0) h = melange(h, 140 * (fbm(x * 0.004, z * 0.004, 6) + 0.6) + 40 * m, m);
    return h;
  }

  // Carte de profondeur de l'eau (0 = rivage, 1 = 12 m ou plus)
  function carteFond() {
    const L = 200, H = 720;
    const data = new Uint8Array(L * H * 4);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < L; i++) {
        const x = ZONE_FOND.x0 + (i + 0.5) / L * (ZONE_FOND.x1 - ZONE_FOND.x0);
        const z = ZONE_FOND.z0 + (j + 0.5) / H * (ZONE_FOND.z1 - ZONE_FOND.z0);
        const prof = Math.min(12, Math.max(0, -hauteurSol(x, z)));
        const k = (j * L + i) * 4;
        data[k] = Math.round(prof / 12 * 255); data[k + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, L, H, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  // Détails de la roche et de l'herbe, calculés dans le shader (bosses, fissures, lichen)
  function ajouterDetails(materiau, force) {
    materiau.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vMondeD; varying vec3 vNormD;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMondeD = (modelMatrix * vec4(transformed, 1.0)).xyz;\n" +
          "#ifdef USE_INSTANCING\nvMondeD = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#endif\n" +
          "vNormD = normalize(mat3(modelMatrix) * objectNormal);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vMondeD; varying vec3 vNormD;
          float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float b3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
                       mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
          float f3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * b3(p); p = p * 2.07 + 3.1; a *= 0.5; } return s; }
          float gDetail; float gRoche;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          {
            float pente = 1.0 - clamp(vNormD.y, 0.0, 1.0);
            gRoche = smoothstep(0.25, 0.5, pente + (f3(vMondeD * 0.35) - 0.5) * 0.35);
            float grain = f3(vMondeD * 2.2);
            float gros = f3(vMondeD * 0.45);
            // Fissures et strates dans la roche
            float strates = abs(sin(vMondeD.y * 2.3 + gros * 5.0));
            float fissure = smoothstep(0.035, 0.0, abs(f3(vMondeD * vec3(1.3, 0.12, 1.3)) - 0.5)) * gRoche * smoothstep(0.45, 0.6, b3(vMondeD * 0.3));
            float lichen = smoothstep(0.62, 0.72, f3(vMondeD * 0.9 + 7.0)) * gRoche * (1.0 - fissure);
            vec3 c = diffuseColor.rgb;
            c *= mix(0.92 + 0.25 * grain, (0.7 + 0.45 * grain) * (0.85 + 0.2 * strates), gRoche);
            c = mix(c, c * 0.35, fissure);
            c = mix(c, vec3(0.32, 0.33, 0.18), lichen * 0.6);
            // Herbe : touffes plus claires et plus sombres
            float touffes = f3(vMondeD * vec3(3.0, 0.5, 3.0));
            c = mix(c, c * (0.75 + 0.55 * touffes) + vec3(0.02, 0.025, 0.0) * gros, (1.0 - gRoche) * step(0.5, vMondeD.y));
            diffuseColor.rgb = c;
            gDetail = mix(grain * 0.4 + touffes * 0.15, grain * 0.7 + strates * 0.3 - fissure * 0.9, gRoche);
          }`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          {
            // Petit relief (bump) à partir du détail, pour que la lumière accroche la roche
            vec3 posV = -vViewPosition;
            vec3 dx = dFdx(posV), dy = dFdy(posV);
            vec2 dH = vec2(dFdx(gDetail), dFdy(gDetail)) * ${force.toFixed(2)};
            vec3 r1 = cross(dy, normal), r2 = cross(normal, dx);
            float det = dot(dx, r1) * faceDirection;
            vec3 grad = sign(det) * (dH.x * r1 + dH.y * r2);
            normal = normalize(abs(det) * normal - grad);
          }`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, 0.75, gRoche * (1.0 - gDetail));");
    };
    return materiau;
  }

  // ---------------------------------------------------------------
  // Mise en place de la scène 3D
  // ---------------------------------------------------------------
  const rendu = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  rendu.setSize(window.innerWidth, window.innerHeight);
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 0.95;
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.prepend(rendu.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HORIZON, 250, 2600);
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 6000);

  // Lumières
  const ciel = new THREE.HemisphereLight(0xbfd9ff, 0x4a5a3a, 0.9);
  scene.add(ciel);
  const soleil = new THREE.DirectionalLight(0xfff0d8, 3.0);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  soleil.shadow.camera.left = -40; soleil.shadow.camera.right = 40;
  soleil.shadow.camera.top = 40; soleil.shadow.camera.bottom = -40;
  soleil.shadow.camera.near = 1; soleil.shadow.camera.far = 300;
  soleil.shadow.bias = -0.0004;
  soleil.shadow.normalBias = 0.05;
  scene.add(soleil, soleil.target);

  // Couleur du ciel (partagée par le ciel et les reflets de l'eau)
  const GLSL_CIEL = `
    uniform vec3 uSoleil;
    uniform float uTemps;
    float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float bruit2(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash2(i), hash2(i+vec2(1,0)), u.x), mix(hash2(i+vec2(0,1)), hash2(i+vec2(1,1)), u.x), u.y);
    }
    float nuages(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*bruit2(p); p*=2.1; a*=0.5; } return s; }
    vec3 couleurCiel(vec3 d){
      float h = max(d.y, 0.0);
      vec3 zenith = vec3(0.10, 0.27, 0.62);
      vec3 horizon = vec3(0.55, 0.66, 0.78);
      vec3 c = mix(horizon, zenith, pow(h, 0.5));
      float s = max(dot(d, uSoleil), 0.0);
      c += vec3(1.0, 0.75, 0.45) * pow(s, 6.0) * 0.45;
      c += vec3(1.0, 0.92, 0.8) * pow(s, 1200.0) * 40.0;
      if (d.y > 0.0) {
        vec2 p = d.xz / (d.y + 0.08) * 1.4 + vec2(uTemps * 0.004, 0.0);
        float n = smoothstep(0.52, 0.85, nuages(p));
        vec3 cn = mix(vec3(0.95, 0.93, 0.9), vec3(1.0, 0.85, 0.65), pow(s, 4.0));
        c = mix(c, cn, n * 0.85 * smoothstep(0.0, 0.12, d.y));
      } else {
        c = mix(horizon, horizon * 0.75, min(-d.y * 4.0, 1.0));
      }
      return c;
    }`;

  const uniformesCommuns = { uSoleil: { value: SOLEIL }, uTemps: { value: 0 } };

  const matCiel = new THREE.ShaderMaterial({
    uniforms: uniformesCommuns,
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position);
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: GLSL_CIEL + `varying vec3 vDir; void main(){ gl_FragColor = vec4(couleurCiel(normalize(vDir)), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const domeCiel = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), matCiel);
  domeCiel.frustumCulled = false;
  scene.add(domeCiel);

  // L'eau : vagues calculées dans le shader, reflet du ciel et scintillement du soleil
  const matEau = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSoleil: { value: SOLEIL }, uTemps: { value: 0 },
      uRond: { value: new THREE.Vector4(0, 0, -100, 0) }, // x, z, âge, force des ronds dans l'eau
      uFond: { value: null }, // profondeur de l'eau près de la côte
      uZoneFond: { value: new THREE.Vector4(ZONE_FOND.x0, ZONE_FOND.z0, ZONE_FOND.x1 - ZONE_FOND.x0, ZONE_FOND.z1 - ZONE_FOND.z0) },
    }]),
    fog: true,
    vertexShader: `
      varying vec3 vMonde;
      #include <fog_pars_vertex>
      void main(){
        vec4 m = modelMatrix * vec4(position, 1.0);
        vMonde = m.xyz;
        vec4 mvPosition = viewMatrix * m;
        gl_Position = projectionMatrix * mvPosition;
        vFogDepth = -mvPosition.z;
      }`,
    fragmentShader: GLSL_CIEL + `
      varying vec3 vMonde;
      uniform vec4 uRond;
      uniform sampler2D uFond;
      uniform vec4 uZoneFond;
      #include <fog_pars_fragment>
      // Pente d'une vague ; les vagues plus petites qu'un pixel sont effacées (pas de scintillement)
      vec2 vague(vec2 p, vec2 dir, float freq, float amp, float vit, float pixel){
        float ph = dot(p, dir) * freq + uTemps * vit;
        float visible = 1.0 - smoothstep(0.15, 0.6, pixel * freq);
        return dir * cos(ph) * freq * amp * visible;
      }
      void main(){
        vec2 p = vMonde.xz;
        float pixel = length(fwidth(p));
        vec2 g = vec2(0.0);
        g += vague(p, normalize(vec2(1.0, 0.3)), 0.21, 0.30, 1.1, pixel);
        g += vague(p, normalize(vec2(0.7, -0.7)), 0.37, 0.14, 1.6, pixel);
        g += vague(p, normalize(vec2(-0.2, 1.0)), 0.61, 0.07, 2.1, pixel);
        g += vague(p, normalize(vec2(0.9, 0.5)), 1.13, 0.035, 2.9, pixel);
        g += vague(p, normalize(vec2(-0.6, -0.8)), 1.9, 0.02, 3.7, pixel);
        g += vague(p, normalize(vec2(0.3, -1.0)), 3.3, 0.010, 5.1, pixel);
        vec2 bruitPente = vec2(bruit2(p * 1.7 + uTemps * 0.6), bruit2(p * 1.7 - uTemps * 0.5 + 9.0)) - 0.5;
        g += bruitPente * 0.12 * (1.0 - smoothstep(0.1, 0.5, pixel * 1.7));
        // Ronds dans l'eau après le plongeon
        vec2 dr = p - uRond.xy; float r = length(dr);
        float onde = sin(r * 6.0 - uRond.z * 9.0) * exp(-abs(r - uRond.z * 1.6) * 1.5) * exp(-uRond.z * 0.6) * uRond.w;
        if (r > 0.01) g += dr / r * onde * 0.6;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cameraPosition - vMonde);
        vec3 rf = reflect(-v, n); rf.y = abs(rf.y);
        float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);

        // Profondeur : turquoise près des rochers, bleu nuit au large
        vec2 uvFond = (p - uZoneFond.xy) / uZoneFond.zw;
        float profondeur = 40.0;
        if (uvFond.x > 0.0 && uvFond.x < 1.0 && uvFond.y > 0.0 && uvFond.y < 1.0)
          profondeur = texture2D(uFond, uvFond).r * 12.0;
        float clair = exp(-profondeur * 0.28);
        vec3 profond = vec3(0.004, 0.035, 0.05);
        vec3 lagon = vec3(0.05, 0.30, 0.28);
        vec3 eauColor = mix(profond, lagon, clair);
        // Lumière qui traverse le haut des vagues (couleur émeraude)
        float transl = pow(max(dot(v, -uSoleil + n * 0.6), 0.0), 3.0) * 0.12;
        vec3 diffus = vec3(0.02, 0.17, 0.15) * (0.35 + 0.65 * max(dot(n, uSoleil), 0.0) + transl * 4.0);
        vec3 c = mix(eauColor + diffus * 0.5, couleurCiel(rf), fresnel);
        c += vec3(1.0, 0.9, 0.75) * pow(max(dot(rf, uSoleil), 0.0), 900.0) * 30.0;

        // Écume au pied des falaises
        float bordure = smoothstep(1.4, 0.0, profondeur) * (0.55 + 0.45 * sin(uTemps * 1.3 + profondeur * 3.0 + p.y * 0.4));
        bordure *= smoothstep(0.35, 0.75, bruit2(p * 2.5 + vec2(uTemps * 0.3, 0.0)) + bruit2(p * 7.0) * 0.4);
        c = mix(c, vec3(0.85, 0.9, 0.92), clamp(bordure, 0.0, 0.85));

        // Écume du plongeon
        float ecume = smoothstep(1.2 + uRond.z * 0.8, 0.0, r) * exp(-uRond.z * 0.45) * uRond.w;
        ecume *= 0.6 + 0.4 * bruit2(p * 6.0 + uTemps);
        c = mix(c, vec3(0.92, 0.96, 1.0), clamp(ecume, 0.0, 0.9));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  matEau.uniforms.uFond.value = carteFond();
  const eau = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), matEau);
  eau.rotation.x = -Math.PI / 2;
  scene.add(eau);

  // Relief : un maillage précis près des plongeoirs, un maillage grossier pour le lointain
  function creerRelief(x0, x1, z0, z1, pas, exclure) {
    const nx = Math.round((x1 - x0) / pas), nz = Math.round((z1 - z0) / pas);
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = hauteurSol(x, z);
      if (exclure && x > exclure.x0 + pas && x < exclure.x1 - pas && z > exclure.z0 + pas && z < exclure.z1 - pas) h = -40;
      pos.setY(i, h);
    }
    geo.computeVertexNormals();
    // Couleurs : roche sur les pentes, herbe sur le plat, sable mouillé près de l'eau
    const nor = geo.attributes.normal;
    const cols = new Float32Array(pos.count * 3);
    const roche1 = new THREE.Color(0.20, 0.20, 0.20), roche2 = new THREE.Color(0.38, 0.36, 0.33);
    const herbe1 = new THREE.Color(0.16, 0.24, 0.08), herbe2 = new THREE.Color(0.30, 0.34, 0.12);
    const neige = new THREE.Color(0.85, 0.88, 0.92), humide = new THREE.Color(0.10, 0.10, 0.09);
    const c = new THREE.Color(), r = new THREE.Color(), hb = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const pente = 1 - nor.getY(i);
      const n = 0.5 + 0.5 * fbm(x * 0.15, z * 0.15 + y * 0.1, 3);
      r.copy(roche1).lerp(roche2, n);
      // Strates horizontales dans la roche
      r.multiplyScalar(0.85 + 0.25 * Math.sin(y * 1.7 + fbm(x * 0.05, z * 0.05, 2) * 4));
      hb.copy(herbe1).lerp(herbe2, 0.5 + 0.5 * fbm(x * 0.05, z * 0.05, 3));
      c.copy(hb).lerp(r, lisse(0.22, 0.45, pente + 0.1 * bruit(x * 0.3, z * 0.3)));
      if (y > 150) c.lerp(neige, lisse(150, 200, y + 30 * fbm(x * 0.01, z * 0.01, 3)) * (1 - lisse(0.5, 0.8, pente)));
      if (y < 1.2) c.lerp(humide, lisse(1.2, -0.5, y));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const mesh = new THREE.Mesh(geo, materiauRelief);
    mesh.receiveShadow = true;
    return mesh;
  }
  const materiauRelief = ajouterDetails(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), 0.05);
  const zoneProche = { x0: -200, x1: 40, z0: -180, z1: 180 };
  const reliefProche = creerRelief(zoneProche.x0, zoneProche.x1, zoneProche.z0, zoneProche.z1, 0.75);
  reliefProche.castShadow = true;
  scene.add(reliefProche);
  scene.add(creerRelief(-1800, 1800, -1800, 1800, 12, zoneProche));

  // Sapins
  (function sapins() {
    const cone = new THREE.ConeGeometry(1, 1, 7);
    cone.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1d3320, roughness: 0.9 });
    const nb = 1400;
    const arbres = new THREE.InstancedMesh(cone, mat, nb);
    arbres.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0;
    for (let essai = 0; essai < 20000 && n < nb; essai++) {
      const x = -190 + hash(essai, 1) * 185, z = -175 + hash(essai, 2) * 350;
      if (x > bordFalaise(z) - 7) continue;
      const y = hauteurSol(x, z);
      const pente = Math.abs(hauteurSol(x + 1, z) - y) + Math.abs(hauteurSol(x, z + 1) - y);
      if (pente > 0.7 || fbm(x * 0.02, z * 0.02, 3) < -0.1) continue;
      const taille = 5 + hash(essai, 3) * 9;
      p.set(x, y - 0.3, z);
      s.set(taille * 0.28, taille, taille * 0.28);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(essai, 4) * 6.28);
      arbres.setMatrixAt(n++, m.compose(p, q, s));
    }
    arbres.count = n;
    scene.add(arbres);
  })();

  // Rochers éboulés au pied des falaises
  (function rochers() {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + 0.35 * bruit(x * 2.1 + 3, y * 2.3 + z * 1.7);
      pos.setXYZ(i, x * k, y * k * 0.7, z * k);
    }
    geo.computeVertexNormals();
    const mat = ajouterDetails(new THREE.MeshStandardMaterial({ color: 0x3e3c3a, roughness: 0.9 }), 0.06);
    const nb = 260;
    const blocs = new THREE.InstancedMesh(geo, mat, nb);
    blocs.castShadow = blocs.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0;
    for (let essai = 0; essai < 4000 && n < nb; essai++) {
      const z = -170 + hash(essai, 11) * 340;
      if (masqueSpot(z) > 0.05) continue; // garder l'eau dégagée sous les plongeoirs
      const x = bordFalaise(z) + 2 + hash(essai, 12) * 9;
      const y = hauteurSol(x, z);
      if (y > 1 || y < -4) continue;
      const t = 0.5 + Math.pow(hash(essai, 13), 2) * 2.5;
      p.set(x, y + t * 0.2, z);
      s.set(t * (0.8 + hash(essai, 14) * 0.6), t, t * (0.8 + hash(essai, 15) * 0.6));
      q.setFromEuler(new THREE.Euler(hash(essai, 16) * 0.6, hash(essai, 17) * 6.3, hash(essai, 18) * 0.6));
      blocs.setMatrixAt(n++, m.compose(p, q, s));
    }
    blocs.count = n;
    scene.add(blocs);
  })();

  // Plongeoirs : une avancée de roche au bord de la falaise
  const matRoche = ajouterDetails(new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.95 }), 0.06);
  for (const h in SPOTS) {
    const geo = new THREE.BoxGeometry(5.2, 2.4, 4.4, 8, 3, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > 1.1) continue; // le dessus reste plat pour marcher
      pos.setXYZ(i, x + 0.25 * bruit(y * 3 + z, x * 2), y + 0.2 * bruit(x * 3, z * 3), z + 0.25 * bruit(x * 2 + 5, y * 3));
    }
    geo.computeVertexNormals();
    const bloc = new THREE.Mesh(geo, matRoche);
    bloc.position.set(-1.8, Number(h) - 1.2, SPOTS[h].z);
    bloc.castShadow = bloc.receiveShadow = true;
    scene.add(bloc);
  }

  // ---------------------------------------------------------------
  // Le plongeur : un petit bonhomme articulé
  // ---------------------------------------------------------------
  const matPeau = new THREE.MeshStandardMaterial({ color: 0xd9a27e, roughness: 0.6 });
  const matMaillot = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 });
  const matCheveux = new THREE.MeshStandardMaterial({ color: 0x2a1b12, roughness: 0.8 });
  function membre(rayon, longueur, mat) {
    const g = new THREE.CapsuleGeometry(rayon, longueur, 4, 10);
    g.translate(0, -longueur / 2 - rayon * 0.4, 0);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    return m;
  }
  const corps = new THREE.Group();
  const art = {};
  (function construire() {
    const bassin = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 4, 10), matMaillot);
    bassin.rotation.z = Math.PI / 2; bassin.castShadow = true;
    corps.add(bassin);
    art.dos = new THREE.Group(); corps.add(art.dos);
    const torse = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 12), matPeau);
    torse.position.y = 0.3; torse.scale.set(1.05, 1, 0.75); torse.castShadow = true;
    art.dos.add(torse);
    art.cou = new THREE.Group(); art.cou.position.y = 0.6; art.dos.add(art.cou);
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), matPeau);
    tete.position.y = 0.15; tete.castShadow = true; art.cou.add(tete);
    const cheveux = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), matCheveux);
    cheveux.position.set(0, 0.16, -0.01); art.cou.add(cheveux);
    for (const cote of [1, -1]) {
      const epaule = new THREE.Group(); epaule.position.set(0.24 * cote, 0.5, 0); art.dos.add(epaule);
      epaule.add(membre(0.052, 0.22, matPeau));
      const coude = new THREE.Group(); coude.position.y = -0.3; epaule.add(coude);
      coude.add(membre(0.045, 0.22, matPeau));
      const hanche = new THREE.Group(); hanche.position.set(0.1 * cote, -0.04, 0); corps.add(hanche);
      const cuisse = membre(0.08, 0.3, matPeau); hanche.add(cuisse);
      const genou = new THREE.Group(); genou.position.y = -0.45; hanche.add(genou);
      genou.add(membre(0.06, 0.32, matPeau));
      const pied = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.22), matPeau);
      pied.position.set(0, -0.47, 0.06); pied.castShadow = true; genou.add(pied);
      art[cote > 0 ? "epauleG" : "epauleD"] = epaule;
      art[cote > 0 ? "coudeG" : "coudeD"] = coude;
      art[cote > 0 ? "hancheG" : "hancheD"] = hanche;
      art[cote > 0 ? "genouG" : "genouD"] = genou;
    }
  })();
  scene.add(corps);

  // Positions du corps (angles en radians)
  const POSES = {
    debout:  { bras: 0.05, ecart: 0.12, coude: -0.1, cuisse: 0, jambes: 0.04, genou: 0, dos: 0, cou: 0 },
    elan:    { bras: 0.7, ecart: 0.15, coude: -0.3, cuisse: -0.7, jambes: 0.06, genou: 1.1, dos: 0.4, cou: -0.2 },
    tendu:   { bras: -3.05, ecart: 0.12, coude: 0, cuisse: 0, jambes: 0.02, genou: 0, dos: 0, cou: 0 },
    pieds:   { bras: 0.02, ecart: 0.05, coude: 0, cuisse: 0, jambes: 0.02, genou: 0, dos: 0, cou: 0 },
    groupe:  { bras: -0.9, ecart: 0.25, coude: -1.5, cuisse: -2.3, jambes: 0.12, genou: 2.4, dos: 0.5, cou: 0.35 },
    carpe:   { bras: -1.35, ecart: 0.1, coude: 0, cuisse: -2.4, jambes: 0.03, genou: 0, dos: 0.5, cou: 0.25 },
    etoile:  { bras: -0.35, ecart: 1.45, coude: -0.25, cuisse: 0.15, jambes: 0.35, genou: 0.25, dos: -0.25, cou: -0.45 },
    replie:  { bras: -1.3, ecart: 0.25, coude: -0.9, cuisse: -2.5, jambes: 0.1, genou: 0.4, dos: 0.6, cou: 0.45 },
  };
  const poseActuelle = Object.assign({}, POSES.debout);
  function appliquerPose(cible, dt) {
    const k = 1 - Math.exp(-dt * 14);
    for (const cle in cible) poseActuelle[cle] += (cible[cle] - poseActuelle[cle]) * k;
    const p = poseActuelle;
    art.dos.rotation.x = p.dos; art.cou.rotation.x = p.cou;
    art.epauleG.rotation.set(p.bras, 0, p.ecart); art.epauleD.rotation.set(p.bras, 0, -p.ecart);
    art.coudeG.rotation.x = p.coude; art.coudeD.rotation.x = p.coude;
    art.hancheG.rotation.set(p.cuisse, 0, p.jambes); art.hancheD.rotation.set(p.cuisse, 0, -p.jambes);
    art.genouG.rotation.x = p.genou; art.genouD.rotation.x = p.genou;
  }

  // ---------------------------------------------------------------
  // Gerbe d'eau
  // ---------------------------------------------------------------
  const NB_GOUTTES = 900;
  const goutteGeo = new THREE.BufferGeometry();
  const gouttePos = new Float32Array(NB_GOUTTES * 3).fill(-500);
  const goutteVit = new Float32Array(NB_GOUTTES * 3);
  goutteGeo.setAttribute("position", new THREE.BufferAttribute(gouttePos, 3));
  const texGoutte = (function () {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(240,248,255,0.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const gouttes = new THREE.Points(goutteGeo, new THREE.PointsMaterial({
    size: 0.22, map: texGoutte, transparent: true, depthWrite: false, color: 0xeef6ff,
  }));
  gouttes.frustumCulled = false;
  scene.add(gouttes);
  let rond = { x: 0, z: 0, age: -100, force: 0 };

  function eclabousser(x, z, force, vitesse) {
    let n = Math.floor(NB_GOUTTES * Math.min(1, 0.15 + force));
    for (let i = 0; i < NB_GOUTTES; i++) {
      if (i >= n) { gouttePos[i * 3 + 1] = -500; continue; }
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (0.3 + force * 0.8);
      const colonne = Math.random() < 0.5; // gerbe verticale ou couronne
      const montee = vitesse * (colonne ? 0.35 + Math.random() * 0.35 : 0.12 + Math.random() * 0.2) * (0.4 + force);
      const ecart = colonne ? 0.6 + Math.random() : 2 + Math.random() * 4 * (0.3 + force);
      gouttePos[i * 3] = x + Math.cos(a) * r; gouttePos[i * 3 + 1] = 0.05; gouttePos[i * 3 + 2] = z + Math.sin(a) * r;
      goutteVit[i * 3] = Math.cos(a) * ecart; goutteVit[i * 3 + 1] = montee; goutteVit[i * 3 + 2] = Math.sin(a) * ecart;
    }
    goutteGeo.attributes.position.needsUpdate = true;
    rond = { x: x, z: z, age: 0, force: 0.4 + force };
    son.plouf(force);
  }
  function majGouttes(dt) {
    for (let i = 0; i < NB_GOUTTES; i++) {
      const j = i * 3;
      if (gouttePos[j + 1] < -1) continue;
      goutteVit[j + 1] -= GRAVITE * dt;
      goutteVit[j] *= 1 - dt * 0.6; goutteVit[j + 2] *= 1 - dt * 0.6;
      gouttePos[j] += goutteVit[j] * dt; gouttePos[j + 1] += goutteVit[j + 1] * dt; gouttePos[j + 2] += goutteVit[j + 2] * dt;
      if (gouttePos[j + 1] < 0 && goutteVit[j + 1] < 0) gouttePos[j + 1] = -500;
    }
    goutteGeo.attributes.position.needsUpdate = true;
    rond.age += dt;
    matEau.uniforms.uRond.value.set(rond.x, rond.z, rond.age, rond.age < 12 ? rond.force : 0);
  }

  // ---------------------------------------------------------------
  // Sons (fabriqués par le navigateur, sans fichier audio)
  // ---------------------------------------------------------------
  const son = (function () {
    let ctx = null, ventGain = null, ventFiltre = null;
    function bruitBlanc(duree) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * duree, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }
    return {
      demarrer() {
        if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          const src = ctx.createBufferSource(); src.buffer = bruitBlanc(2); src.loop = true;
          ventFiltre = ctx.createBiquadFilter(); ventFiltre.type = "bandpass"; ventFiltre.frequency.value = 500; ventFiltre.Q.value = 0.7;
          ventGain = ctx.createGain(); ventGain.gain.value = 0;
          src.connect(ventFiltre).connect(ventGain).connect(ctx.destination); src.start();
        } catch (e) { ctx = null; }
      },
      vent(vitesse) {
        if (!ctx) return;
        ventGain.gain.setTargetAtTime(Math.min(0.35, vitesse * vitesse * 0.0009), ctx.currentTime, 0.1);
        ventFiltre.frequency.setTargetAtTime(300 + vitesse * 40, ctx.currentTime, 0.1);
      },
      plouf(force) {
        if (!ctx) return;
        const src = ctx.createBufferSource(); src.buffer = bruitBlanc(1.5);
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600 + force * 2500;
        const g = ctx.createGain(); const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4 + force * 0.6, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5 + force);
        src.connect(f).connect(g).connect(ctx.destination); src.start(); src.stop(t + 1.6);
      },
    };
  })();

  // ---------------------------------------------------------------
  // Clavier
  // ---------------------------------------------------------------
  const touches = {};
  const TOUCHES_JEU = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  window.addEventListener("keydown", (e) => {
    if (TOUCHES_JEU.includes(e.code)) e.preventDefault();
    son.demarrer();
    if (!touches[e.code]) appui(e.code);
    touches[e.code] = true;
  });
  window.addEventListener("keyup", (e) => { touches[e.code] = false; });
  window.addEventListener("blur", () => { for (const k in touches) touches[k] = false; });
  const touche = (...codes) => codes.some((c) => touches[c]);

  // ---------------------------------------------------------------
  // Interface
  // ---------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const choix = { mode: "cliff", hauteur: 10 };
  function brancherChoix(idListe, cle, conv) {
    $(idListe).querySelectorAll(".carte").forEach((carte) => {
      carte.addEventListener("click", () => {
        $(idListe).querySelectorAll(".carte").forEach((c) => c.classList.remove("actif"));
        carte.classList.add("actif");
        choix[cle] = conv(carte.dataset[cle]);
      });
    });
  }
  brancherChoix("choixMode", "mode", String);
  brancherChoix("choixHauteur", "hauteur", Number);
  $("jouer").addEventListener("click", () => { son.demarrer(); commencer(); });
  $("rejouer").addEventListener("click", () => { son.demarrer(); commencer(); });
  $("retourMenu").addEventListener("click", () => allerMenu());

  function afficher(id, oui) { $(id).classList.toggle("cache", !oui); }
  let minuteurMessage = null;
  function message(texte, couleur, duree) {
    const m = $("message");
    m.textContent = texte; m.style.color = couleur || "#fff"; m.style.opacity = 1;
    clearTimeout(minuteurMessage);
    minuteurMessage = setTimeout(() => { m.style.opacity = 0; }, duree || 1200);
  }
  function lireRecords() {
    try { return JSON.parse(localStorage.getItem("plongeon_records") || "{}"); } catch (e) { return {}; }
  }
  function ecrireRecord(cle, valeur) {
    try { const r = lireRecords(); r[cle] = valeur; localStorage.setItem("plongeon_records", JSON.stringify(r)); } catch (e) { /* rien */ }
  }

  // ---------------------------------------------------------------
  // Déroulement d'un saut
  // ---------------------------------------------------------------
  const AXE_X = new THREE.Vector3(1, 0, 0), AXE_Y = new THREE.Vector3(0, 1, 0), AXE_Z = new THREE.Vector3(0, 0, 1);
  const etat = {
    phase: "menu", // menu, plongeoir, elan, air, eau, resultat
    t: 0, pos: new THREE.Vector3(), vit: new THREE.Vector3(), rot: new THREE.Quaternion(),
    vSalto: 0, vVrille: 0, totalSalto: 0, totalVrille: 0, pose: "debout",
    hauteurRepli: null, ecartCumul: 0, ecartTemps: 0, perturbSalto: 0, perturbVrille: 0,
    ralenti: 1, camera: 0, resultat: null, entree: null,
  };
  const ROT_DEPART = new THREE.Quaternion().setFromAxisAngle(AXE_Y, Math.PI / 2); // regarde vers la mer (+x)

  function placerSurPlongeoir() {
    const s = SPOTS[choix.hauteur];
    etat.phase = "plongeoir"; etat.t = 0;
    etat.pos.set(-3.0, choix.hauteur + 0.97, s.z);
    etat.vit.set(0, 0, 0);
    etat.rot.copy(ROT_DEPART);
    etat.vSalto = etat.vVrille = etat.totalSalto = etat.totalVrille = 0;
    etat.hauteurRepli = null; etat.ecartCumul = 0; etat.ecartTemps = 0;
    etat.perturbSalto = etat.perturbVrille = 0;
    etat.pose = "debout"; etat.ralenti = 1; etat.resultat = null; etat.entree = null;
    Object.assign(poseActuelle, POSES.debout);
    corps.visible = true;
    // Caméra posée tout de suite au bon endroit
    camera.position.set(etat.pos.x - 4.5, etat.pos.y + 1.6, etat.pos.z + 6.5);
    cibleCam.set(etat.pos.x + 9, etat.pos.y - 6, etat.pos.z - 1);
  }

  function commencer() {
    afficher("menu", false); afficher("resultat", false); afficher("hud", true); afficher("aide", true);
    placerSurPlongeoir();
    majAide();
  }
  function allerMenu() {
    etat.phase = "menu";
    afficher("resultat", false); afficher("hud", false); afficher("aide", false); afficher("jauge", false); afficher("menu", true);
    placerSurPlongeoir(); etat.phase = "menu";
  }

  function majAide() {
    const a = $("aide");
    if (etat.phase === "plongeoir") {
      a.innerHTML = "<kbd>Espace</kbd> prendre son élan et sauter · <kbd>Échap</kbd> menu";
    } else if (choix.mode === "cliff") {
      a.innerHTML = "<kbd>↑</kbd><kbd>↓</kbd> saltos · <kbd>←</kbd><kbd>→</kbd> vrilles · <kbd>Espace</kbd> groupé · " +
        "<kbd>Maj</kbd> carpé · entre dans l'eau <b>bien droit</b> · <kbd>C</kbd> caméra";
    } else {
      a.innerHTML = "<kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> reste bien à plat · " +
        "<kbd>Espace</kbd> se replier <b>au dernier moment</b> · <kbd>C</kbd> caméra";
    }
  }

  function appui(code) {
    if (code === "Enter" && (etat.phase === "menu" || etat.phase === "resultat")) { commencer(); return; }
    if (code === "Escape" && etat.phase !== "menu") { allerMenu(); return; }
    if (code === "KeyR" && etat.phase !== "menu") { commencer(); return; }
    if (code === "KeyC") { etat.camera = (etat.camera + 1) % 3; message(["Caméra de côté", "Caméra de dos", "Caméra au bord de l'eau"][etat.camera], "#fff", 900); }
    if (code === "Space" && etat.phase === "plongeoir") { etat.phase = "elan"; etat.t = 0; majAide(); }
    if (code === "Space" && etat.phase === "air" && choix.mode === "dods" && etat.hauteurRepli === null) {
      etat.hauteurRepli = Math.max(0, etat.pos.y);
      etat.pose = "replie";
    }
  }

  // Vecteurs du corps dans le monde : tête (haut) et ventre (devant)
  const vTete = new THREE.Vector3(), vVentre = new THREE.Vector3(), vCote = new THREE.Vector3();
  function axesCorps() {
    vTete.copy(AXE_Y).applyQuaternion(etat.rot);
    vVentre.copy(AXE_Z).applyQuaternion(etat.rot);
    vCote.copy(AXE_X).applyQuaternion(etat.rot);
  }
  const qTmp = new THREE.Quaternion();
  function tourner(axe, angle) { etat.rot.multiply(qTmp.setFromAxisAngle(axe, angle)); }
  const approche = (v, cible, vitesse, dt) => v + (cible - v) * (1 - Math.exp(-vitesse * dt));

  function majSaut(dt) {
    etat.t += dt;
    if (etat.phase === "plongeoir") {
      etat.pose = "debout";
      return;
    }
    if (etat.phase === "elan") {
      // Course jusqu'au bord, puis impulsion
      etat.pose = etat.t < 0.55 ? "debout" : "elan";
      const vitesseCourse = choix.mode === "dods" ? 5 : 4;
      if (etat.pos.x < 0.55) {
        etat.pos.x += vitesseCourse * dt;
        etat.pos.y = choix.hauteur + 0.97 + Math.abs(Math.sin(etat.t * 11)) * 0.06 - (etat.pose === "elan" ? 0.25 : 0);
      } else {
        etat.phase = "air"; etat.t = 0;
        etat.vit.set(choix.mode === "dods" ? 3.8 : 2.6, 4.2, 0);
        etat.pose = choix.mode === "dods" ? "etoile" : "tendu";
        majAide();
      }
      return;
    }
    if (etat.phase === "air") majVol(dt);
  }

  function majVol(dt) {
    axesCorps();
    // Physique : gravité et un peu de frottement de l'air
    etat.vit.y -= GRAVITE * dt;
    etat.vit.multiplyScalar(1 - 0.012 * dt * etat.vit.length() * 0.1);
    etat.pos.addScaledVector(etat.vit, dt);

    if (choix.mode === "cliff") {
      const groupe = touche("Space"), carpe = touche("ShiftLeft", "ShiftRight");
      const enSalto = touche("ArrowUp", "KeyW") ? 1 : touche("ArrowDown", "KeyS") ? -1 : 0;
      const enVrille = touche("ArrowRight", "KeyD") ? 1 : touche("ArrowLeft", "KeyA") ? -1 : 0;
      const maxSalto = groupe ? 10 : carpe ? 7 : 4;
      etat.vSalto = approche(etat.vSalto, enSalto * maxSalto, enSalto ? 3 : 2.2, dt);
      etat.vVrille = approche(etat.vVrille, enVrille * (groupe || carpe ? 3 : 9), enVrille ? 4 : 3, dt);
      // Pose : groupé / carpé, sinon bras au-dessus de la tête si on part tête en bas
      etat.pose = groupe ? "groupe" : carpe ? "carpe" : vTete.y < 0.2 ? "tendu" : "pieds";
    } else {
      // Dødsing : le corps se met à plat, le vent le déséquilibre, le joueur corrige
      if (etat.hauteurRepli === null) {
        const erreurSalto = Math.asin(THREE.MathUtils.clamp(vTete.y, -1, 1)); // > 0 si la tête est trop haute
        const erreurVrille = Math.asin(THREE.MathUtils.clamp(vCote.y, -1, 1));
        const auto = etat.t < 0.8 ? 4 : 0.6; // au début, on se met à plat tout seul
        const force = 1.2 + Math.abs(etat.vit.y) * 0.12;
        etat.perturbSalto += ((Math.random() - 0.5) * 30 * force - etat.perturbSalto * 2) * dt;
        etat.perturbVrille += ((Math.random() - 0.5) * 30 * force - etat.perturbVrille * 2) * dt;
        const enSalto = touche("ArrowUp", "KeyW") ? 1 : touche("ArrowDown", "KeyS") ? -1 : 0;
        const enVrille = touche("ArrowRight", "KeyD") ? 1 : touche("ArrowLeft", "KeyA") ? -1 : 0;
        etat.vSalto += (erreurSalto * auto * 3 - etat.vSalto * 2.2 + etat.perturbSalto * (etat.t < 0.8 ? 0 : 1) + enSalto * 5) * dt;
        etat.vVrille += (-erreurVrille * auto * 3 - etat.vVrille * 2.2 + etat.perturbVrille * (etat.t < 0.8 ? 0 : 1) + enVrille * 5) * dt;
        if (etat.t > 0.8) {
          const ecart = Math.acos(THREE.MathUtils.clamp(-vVentre.y, -1, 1)) * 180 / Math.PI;
          etat.ecartCumul += ecart * dt; etat.ecartTemps += dt;
        }
        etat.pose = "etoile";
      } else {
        // Replié : on bascule pour rentrer les fesses et les pieds en premier
        etat.vSalto = approche(etat.vSalto, 7, 6, dt);
        etat.vVrille = approche(etat.vVrille, 0, 6, dt);
        etat.pose = "replie";
      }
    }
    tourner(AXE_X, etat.vSalto * dt);
    tourner(AXE_Y, etat.vVrille * dt);
    etat.rot.normalize();
    etat.totalSalto += etat.vSalto * dt;
    etat.totalVrille += etat.vVrille * dt;

    // Ralenti près de l'eau pour le dødsing
    const cibleRalenti = choix.mode === "dods" && etat.hauteurRepli === null && etat.pos.y < 7 && etat.t > 0.5 ? 0.3 : 1;
    etat.ralenti = approche(etat.ralenti, cibleRalenti, 8, dt / Math.max(etat.ralenti, 0.1));

    // Contact avec la falaise
    if (etat.pos.y < hauteurSol(etat.pos.x, etat.pos.z) + 0.4 && etat.pos.y > 0.5) {
      etat.vit.x = Math.abs(etat.vit.x) + 1;
      message("Aïe, la falaise !", "#ff8a7a");
    }
    if (etat.pos.y <= 0.35) entrerDansLEau();
  }

  // ---------------------------------------------------------------
  // Les points
  // ---------------------------------------------------------------
  function arrondiDemi(v) { return Math.round(v * 2) / 2; }
  function notesJuges(base) {
    return [0, 1, 2].map(() => THREE.MathUtils.clamp(arrondiDemi(base + (Math.random() - 0.5) * 1.2), 0, 10));
  }

  function entrerDansLEau() {
    axesCorps();
    const vitesse = etat.vit.length();
    const bonus = BONUS_HAUTEUR[choix.hauteur];
    let res;
    if (choix.mode === "cliff") {
      const angle = Math.acos(Math.min(1, Math.abs(vTete.y))) * 180 / Math.PI; // 0 = bien droit
      const teteAvant = vTete.y < 0;
      const groupe = etat.pose === "groupe", carpe = etat.pose === "carpe";
      let note = 10 - angle / 4.5 - (groupe ? 3.5 : 0) - (carpe ? 2 : 0) - Math.min(Math.abs(etat.vSalto), 8) * 0.35 - Math.min(Math.abs(etat.vVrille), 8) * 0.15;
      const plat = angle > 55;
      note = THREE.MathUtils.clamp(note, 0.5, 10);
      if (plat) note = Math.min(note, 1.5);
      const demiSaltos = Math.round(Math.abs(etat.totalSalto) / Math.PI);
      const demiVrilles = Math.round(Math.abs(etat.totalVrille) / Math.PI);
      const difficulte = 1 + demiSaltos * 0.3 + demiVrilles * 0.25;
      const juges = notesJuges(note);
      const total = Math.round((juges[0] + juges[1] + juges[2]) * difficulte * bonus * 10);
      const titre = plat ? "Plat !" : note >= 9 ? "Entrée parfaite !" : note >= 7 ? "Très belle entrée" : note >= 5 ? "Pas mal !" : "Gros splash…";
      res = {
        titre: titre, total: total,
        sous: plat ? "Tu es arrivé à plat sur l'eau : ça fait mal !" : (teteAvant ? "Entrée tête la première" : "Entrée les pieds en premier") + ` · ${Math.round(vitesse * 3.6)} km/h`,
        detail: [
          ["Saltos", (demiSaltos / 2).toString().replace(".", ",")],
          ["Vrilles", (demiVrilles / 2).toString().replace(".", ",")],
          ["Angle à l'entrée", `${Math.round(angle)}°`],
          ["Difficulté", `× ${difficulte.toFixed(2).replace(".", ",")}`],
          ["Hauteur", `${choix.hauteur} m (× ${bonus.toString().replace(".", ",")})`],
          ["Juges", juges.map((j) => j.toString().replace(".", ",")).join(" · ")],
        ],
      };
      // Belle entrée = petite gerbe ; plat = énorme gerbe
      eclabousser(etat.pos.x, etat.pos.z, plat ? 1 : 0.1 + (1 - note / 10) * 0.8, vitesse);
    } else {
      const h = etat.hauteurRepli;
      let timing, titre, sous;
      if (h === null) { timing = 0; titre = "Plat !"; sous = "Tu as oublié de te replier… ça claque !"; }
      else if (h < 0.35) { timing = 2; titre = "Trop tard !"; sous = `Replié à ${h.toFixed(1).replace(".", ",")} m de l'eau : le ventre a tout pris.`; }
      else {
        timing = 10 * Math.exp(-Math.pow((h - 1.2) / 1.6, 2));
        if (h > 5) timing = Math.min(timing, 2.5);
        titre = timing >= 9 ? "Dødsing parfait !" : timing >= 7 ? "Très beau dødsing" : timing >= 4 ? "Un peu tôt…" : "Beaucoup trop tôt";
        sous = `Replié à ${h.toFixed(1).replace(".", ",")} m de l'eau`;
      }
      const ecartMoyen = etat.ecartTemps > 0 ? etat.ecartCumul / etat.ecartTemps : 30;
      const style = THREE.MathUtils.clamp(10 - ecartMoyen / 3.5, 0, 10);
      const total = Math.round((timing * 0.6 + style * 0.4) * 10 * bonus * 3);
      res = {
        titre: titre, total: total, sous: sous + ` · ${Math.round(vitesse * 3.6)} km/h`,
        detail: [
          ["Moment du repli", `${timing.toFixed(1).replace(".", ",")} / 10`],
          ["Position à plat", `${style.toFixed(1).replace(".", ",")} / 10`],
          ["Écart moyen", `${Math.round(ecartMoyen)}°`],
          ["Hauteur", `${choix.hauteur} m (× ${bonus.toString().replace(".", ",")})`],
        ],
      };
      eclabousser(etat.pos.x, etat.pos.z, h === null || h < 0.35 ? 1 : 0.55 + timing * 0.04, vitesse);
    }
    etat.resultat = res;
    etat.entree = etat.pos.clone();
    etat.phase = "eau"; etat.t = 0; etat.ralenti = 1;
    afficher("jauge", false);
    message(res.titre, res.titre.indexOf("Plat") === 0 || res.titre.indexOf("Trop") === 0 ? "#ff8a7a" : "#ffd27a", 1500);
  }

  function majEau(dt) {
    etat.t += dt;
    // Le plongeur remonte à la surface
    if (etat.t < 1.1) { corps.visible = false; return; }
    corps.visible = true;
    etat.rot.setFromAxisAngle(AXE_Y, -Math.PI / 2);
    etat.pose = "debout";
    etat.pos.set(etat.entree.x, -0.72 + Math.sin(etat.t * 2.2) * 0.05 + Math.max(0, 1.6 - etat.t) * -0.8, etat.entree.z);
    if (etat.t > 2.0 && etat.phase === "eau") montrerResultat();
  }

  function montrerResultat() {
    etat.phase = "resultat";
    const r = etat.resultat;
    $("resTitre").textContent = r.titre;
    $("resTotal").textContent = r.total + " pts";
    $("resSous").textContent = r.sous;
    $("resDetail").innerHTML = r.detail.map((d) => `<li><span>${d[0]}</span><b>${d[1]}</b></li>`).join("");
    const cle = `${choix.mode}_${choix.hauteur}`;
    const ancien = lireRecords()[cle] || 0;
    if (r.total > ancien) { ecrireRecord(cle, r.total); $("resRecord").textContent = ancien ? `Nouveau record ! (ancien : ${ancien} pts)` : "Premier record !"; }
    else $("resRecord").textContent = `Record : ${ancien} pts`;
    afficher("resultat", true); afficher("aide", false);
  }

  // ---------------------------------------------------------------
  // Caméra
  // ---------------------------------------------------------------
  const cibleCam = new THREE.Vector3();
  const posCamVoulue = new THREE.Vector3(), regardVoulu = new THREE.Vector3();
  let tempsMenu = 0;
  function majCamera(dt) {
    const p = etat.pos;
    if (etat.phase === "menu") {
      // Survol lent du fjord
      tempsMenu += dt;
      const a = tempsMenu * 0.05;
      posCamVoulue.set(60 + Math.cos(a) * 40, 22 + Math.sin(a * 0.7) * 6, Math.sin(a) * 70);
      regardVoulu.set(-10, 12, Math.sin(a) * 30);
    } else if (etat.phase === "plongeoir" || etat.phase === "elan") {
      posCamVoulue.set(p.x - 4.5, p.y + 1.6, p.z + 6.5);
      regardVoulu.set(p.x + 9, p.y - 6, p.z - 1);
    } else if (etat.phase === "air") {
      if (etat.camera === 0) {
        posCamVoulue.set(p.x - 1, Math.max(p.y + 1.2, 1.2), p.z + 9);
        regardVoulu.copy(p);
      } else if (etat.camera === 1) {
        posCamVoulue.set(p.x - 5, p.y + 3.5, p.z + 1.5);
        regardVoulu.set(p.x + 2, p.y - 3, p.z);
      } else {
        posCamVoulue.set(12, 1.5, SPOTS[choix.hauteur].z + 10);
        regardVoulu.copy(p);
      }
    } else {
      const e = etat.entree || p;
      posCamVoulue.set(e.x - 6, 3.5, e.z + 10);
      regardVoulu.set(e.x, 0.8, e.z);
    }
    const k = 1 - Math.exp(-dt * (etat.phase === "air" && etat.camera === 2 ? 20 : 5));
    camera.position.lerp(posCamVoulue, k);
    cibleCam.lerp(regardVoulu, k);
    if (camera.position.y < 0.6) camera.position.y = 0.6;
    camera.lookAt(cibleCam);
  }

  // ---------------------------------------------------------------
  // Affichage des infos
  // ---------------------------------------------------------------
  function majHud() {
    if (etat.phase === "menu" || etat.phase === "resultat") return;
    $("hudTitre").textContent = (choix.mode === "cliff" ? "Cliff diving" : "Dødsing") + ` · ${choix.hauteur} m`;
    const vitesse = Math.round(etat.vit.length() * 3.6);
    const record = lireRecords()[`${choix.mode}_${choix.hauteur}`];
    $("hudL1").innerHTML = `Altitude <b>${Math.max(0, etat.pos.y - 0.97 * (etat.phase !== "air")).toFixed(1).replace(".", ",")} m</b> · Vitesse <b>${vitesse} km/h</b>`;
    if (choix.mode === "cliff") {
      const s = Math.round(Math.abs(etat.totalSalto) / Math.PI) / 2, v = Math.round(Math.abs(etat.totalVrille) / Math.PI) / 2;
      $("hudL2").innerHTML = `Saltos <b>${String(s).replace(".", ",")}</b> · Vrilles <b>${String(v).replace(".", ",")}</b>`;
    } else {
      $("hudL2").innerHTML = etat.hauteurRepli === null ? "Reste à plat… et attends le dernier moment" : `Replié à <b>${etat.hauteurRepli.toFixed(1).replace(".", ",")} m</b>`;
    }
    $("hudL3").innerHTML = record ? `Record <b>${record} pts</b>` : "";
    // Jauge d'altitude pour le dødsing (de 0 à 8 m)
    const jauge = choix.mode === "dods" && etat.phase === "air" && etat.pos.y < 8.5;
    afficher("jauge", jauge);
    if (jauge) {
      const H = 260, echelle = (y) => H - Math.min(1, y / 8) * H;
      const z = $("jauge").querySelector(".zone");
      z.style.top = echelle(2.2) + "px"; z.style.height = echelle(0.5) - echelle(2.2) + "px";
      $("jauge").querySelector(".curseur").style.top = echelle(Math.max(0, etat.pos.y)) - 2 + "px";
    }
  }

  // ---------------------------------------------------------------
  // Rendu cinéma : halo lumineux (bloom), flou de vitesse, vignette
  // ---------------------------------------------------------------
  const post = (function () {
    const opts = { type: THREE.HalfFloatType };
    const scene3D = new THREE.WebGLRenderTarget(1, 1, Object.assign({ samples: 4 }, opts));
    const halo = [new THREE.WebGLRenderTarget(1, 1, opts), new THREE.WebGLRenderTarget(1, 1, opts)];
    const camPost = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const ecran = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const scenePost = new THREE.Scene();
    scenePost.add(ecran);
    const vs = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    const matSeuil = new THREE.ShaderMaterial({
      uniforms: { tImage: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: vs, toneMapped: false,
      fragmentShader: `uniform sampler2D tImage; uniform vec2 uTexel; varying vec2 vUv;
        void main(){
          vec3 c = vec3(0.0);
          for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(tImage, vUv + vec2(i, j) * uTexel).rgb;
          c /= 9.0;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor = vec4(c * smoothstep(0.9, 2.5, l), 1.0);
        }`,
    });
    const matFlou = new THREE.ShaderMaterial({
      uniforms: { tImage: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: vs, toneMapped: false,
      fragmentShader: `uniform sampler2D tImage; uniform vec2 uDir; varying vec2 vUv;
        void main(){
          float w[5]; w[0] = 0.227; w[1] = 0.195; w[2] = 0.122; w[3] = 0.054; w[4] = 0.016;
          vec3 c = texture2D(tImage, vUv).rgb * w[0];
          for (int i = 1; i < 5; i++) {
            c += texture2D(tImage, vUv + uDir * float(i)).rgb * w[i];
            c += texture2D(tImage, vUv - uDir * float(i)).rgb * w[i];
          }
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const matFinal = new THREE.ShaderMaterial({
      uniforms: { tImage: { value: null }, tHalo: { value: null }, uVitesse: { value: 0 }, uTemps: { value: 0 } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tImage; uniform sampler2D tHalo; uniform float uVitesse; uniform float uTemps; varying vec2 vUv;
        void main(){
          vec2 versCentre = vUv - 0.5;
          vec3 c = vec3(0.0);
          // Flou de vitesse : on mélange quelques images décalées vers le centre
          float flou = uVitesse * 0.06 * smoothstep(0.1, 0.6, length(versCentre));
          for (int i = 0; i < 8; i++) c += texture2D(tImage, vUv - versCentre * flou * float(i) / 8.0).rgb;
          c /= 8.0;
          c += texture2D(tHalo, vUv).rgb * 0.55;
          // Vignette (bords un peu plus sombres)
          c *= 1.0 - dot(versCentre, versCentre) * 0.75;
          // Léger grain de pellicule
          float grain = fract(sin(dot(vUv * 1000.0 + uTemps, vec2(12.9898, 78.233))) * 43758.5453);
          c *= 0.985 + grain * 0.03;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    function passe(mat, cible) { ecran.material = mat; rendu.setRenderTarget(cible); rendu.render(scenePost, camPost); }
    return {
      taille(l, h) {
        const r = rendu.getPixelRatio();
        scene3D.setSize(Math.floor(l * r), Math.floor(h * r));
        halo[0].setSize(Math.max(1, Math.floor(l / 4)), Math.max(1, Math.floor(h / 4)));
        halo[1].setSize(Math.max(1, Math.floor(l / 4)), Math.max(1, Math.floor(h / 4)));
      },
      dessiner(vitesse, temps) {
        rendu.setRenderTarget(scene3D);
        rendu.render(scene, camera);
        const l = halo[0].width, h = halo[0].height;
        matSeuil.uniforms.tImage.value = scene3D.texture;
        matSeuil.uniforms.uTexel.value.set(1.5 / scene3D.width, 1.5 / scene3D.height);
        passe(matSeuil, halo[0]);
        for (const rayon of [1, 2.5]) {
          matFlou.uniforms.tImage.value = halo[0].texture; matFlou.uniforms.uDir.value.set(rayon / l, 0); passe(matFlou, halo[1]);
          matFlou.uniforms.tImage.value = halo[1].texture; matFlou.uniforms.uDir.value.set(0, rayon / h); passe(matFlou, halo[0]);
        }
        matFinal.uniforms.tImage.value = scene3D.texture;
        matFinal.uniforms.tHalo.value = halo[0].texture;
        matFinal.uniforms.uVitesse.value = vitesse;
        matFinal.uniforms.uTemps.value = temps % 100;
        passe(matFinal, null);
      },
    };
  })();
  post.taille(window.innerWidth, window.innerHeight);

  // ---------------------------------------------------------------
  // Boucle principale
  // ---------------------------------------------------------------
  let avant = performance.now();
  function boucle(maintenant) {
    let dtReel = Math.min(0.05, (maintenant - avant) / 1000);
    avant = maintenant;
    const dt = dtReel * etat.ralenti;
    uniformesCommuns.uTemps.value += dtReel;
    matEau.uniforms.uTemps.value = uniformesCommuns.uTemps.value;

    // Plusieurs petits pas de physique pour rester précis près de l'eau
    if (etat.phase === "air") {
      const n = 4;
      for (let i = 0; i < n && etat.phase === "air"; i++) majSaut(dt / n);
    } else if (etat.phase === "eau" || etat.phase === "resultat") {
      majEau(dtReel);
    } else {
      majSaut(dt);
    }
    appliquerPose(POSES[etat.pose], dtReel);
    corps.position.copy(etat.pos);
    corps.quaternion.copy(etat.rot);
    majGouttes(dtReel);
    son.vent(etat.phase === "air" ? etat.vit.length() : 0);

    // L'ombre suit le plongeur
    const centre = etat.phase === "menu" ? new THREE.Vector3(0, 15, 0) : etat.pos;
    soleil.target.position.copy(centre);
    soleil.position.copy(centre).addScaledVector(SOLEIL, 120);

    majCamera(dtReel);
    domeCiel.position.copy(camera.position);
    majHud();
    const flou = etat.phase === "air" ? THREE.MathUtils.clamp((etat.vit.length() - 8) / 22, 0, 1) : 0;
    post.dessiner(flou, uniformesCommuns.uTemps.value);
    requestAnimationFrame(boucle);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rendu.setSize(window.innerWidth, window.innerHeight);
    post.taille(window.innerWidth, window.innerHeight);
  });

  // Pour les tests automatiques
  window.plongeon = { etat: etat, choix: choix, commencer: commencer, appui: appui, touches: touches };

  placerSurPlongeoir();
  etat.phase = "menu";
  requestAnimationFrame(boucle);
})();
