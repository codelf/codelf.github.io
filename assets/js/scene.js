/* ═══════════════════════════════════════════════════════════
   Nicolas Delffon · le plan-relief
   Un seul objet traverse la page : un relief simulé.
     relevé brut (nuage de points) → carte (relief + courbes de niveau)
     → chantiers (balises) → boucle d'agents (tracé) → carte remise (vue en plan)
   Deux encres : un sol et une marque. Leurs couleurs viennent du CSS (site.css),
   pour que la page et le relief ne puissent pas diverger.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from '../vendor/three.module.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (v) => v * v * (3 - 2 * v);
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (s, a, b) => smooth(clamp01((s - a) / (b - a)));

/* Les cinq encres du relief, lues dans les variables CSS de la page (triplets « r v b »). */
const INKS = { sol: [242, 245, 243], profond: [203, 216, 208], trait: [11, 61, 49], lumiere: [255, 255, 255], marque: [217, 38, 114] };
function readInks() {
  const cs = getComputedStyle(document.documentElement), out = {};
  for (const name in INKS) {
    const v = cs.getPropertyValue(`--${name}-rgb`).trim().split(/[\s,]+/).map(Number);
    out[name] = v.length === 3 && v.every((n) => n >= 0 && n <= 255) ? v : INKS[name];
  }
  return out;
}

/* ─────────────── le terrain : un massif entouré d'eau ─────────────── */

const W = 44, D = 34, NX = 264, NZ = 204;
const X0 = -W / 2, Z0 = -D / 2, DX = W / NX, DZ = D / NZ;

/* (cx, cz, amplitude, sx, sz, rotation). Les cinq premiers portent un nom sur la carte. */
const HILLS = [
  [-6.5, -1.5, 3.9, 3.5, 2.7, 0.5],    // Demandes
  [2.4, -4.8, 3.0, 3.2, 2.4, -0.4],    // Finances
  [8.8, 1.6, 3.4, 2.9, 3.2, 0.2],      // Terrain
  [-0.4, 5.3, 2.5, 3.8, 2.2, 0.1],     // Projets
  [-11.8, 5.0, 2.1, 2.4, 2.4, 0.0],    // Documents
  [4.9, 6.6, 1.4, 2.2, 1.6, 0.6],
  [-3.2, -7.0, 1.6, 2.6, 1.7, -0.2],
  [12.6, -4.4, 1.6, 2.2, 2.6, 0.4],
  [-13.4, -3.0, 1.3, 2.0, 2.4, 0.3],
  [5.8, -0.9, 1.0, 1.8, 1.4, 0.9],
  /* cuvettes : elles deviennent des lacs */
  [-2.6, 1.3, -3.6, 2.1, 1.05, 0.5],
  [4.3, 2.7, -2.6, 0.95, 0.8, -0.2],
  [-9.5, 1.9, -2.4, 0.8, 1.25, 0.35],
];
const NAMED = [0, 2, 1, 3, 4];          // ordre des étiquettes : Demandes, Terrain, Finances, Projets, Documents
const SITE_HILLS = [0, 2, 1];           // chantiers 1, 2, 3

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFbm(seed) {
  const rnd = mulberry32(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) val[i] = rnd() * 2 - 1;
  const at = (ix, iy) => val[perm[(perm[ix & 255] + iy) & 255]];
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y, oct) => {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += amp * n2(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  };
}

function buildTerrain() {
  const fbm = makeFbm(20261118);
  const hRaw = (x, z) => {
    let hs = 0;
    for (let k = 0; k < HILLS.length; k++) {
      const q = HILLS[k], c = Math.cos(q[5]), s = Math.sin(q[5]);
      const dx = x - q[0], dz = z - q[1];
      const u = (c * dx + s * dz) / q[3], v = (-s * dx + c * dz) / q[4];
      hs += q[2] * Math.exp(-0.5 * (u * u + v * v));
    }
    const broad = fbm(x * 0.2 + 3.1, z * 0.2 - 1.7, 4);
    const fine = fbm(x * 0.66 - 5.2, z * 0.66 + 8.4, 3);
    const r = Math.hypot(x / 17.4, z / 12.8) + fbm(x * 0.13 + 11.3, z * 0.13 - 4.9, 3) * 0.2;
    const e = 1 - smooth(clamp01((r - 0.68) / 0.32));
    const body = hs + broad * 0.85 + fine * 0.24 * (0.35 + Math.min(1, Math.max(0, hs) / 2.2));
    return body * e - 0.55 - (1 - e) * 1.0;
  };

  const nxp = NX + 1, nzp = NZ + 1, n = nxp * nzp;
  const H = new Float32Array(n);
  for (let j = 0; j < nzp; j++) for (let i = 0; i < nxp; i++) H[j * nxp + i] = hRaw(X0 + i * DX, Z0 + j * DZ);

  /* hauteur brute (négative sous l'eau), interpolée sur la grille */
  const sampleH = (x, z) => {
    let fx = (x - X0) / DX, fz = (z - Z0) / DZ;
    if (fx < 0) fx = 0; else if (fx > NX - 0.001) fx = NX - 0.001;
    if (fz < 0) fz = 0; else if (fz > NZ - 0.001) fz = NZ - 0.001;
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, o = j * nxp + i;
    const a = H[o], b = H[o + 1], c = H[o + nxp], d = H[o + nxp + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const sampleY = (x, z) => Math.max(0, sampleH(x, z));
  const Y = (i, j) => Math.max(0, H[j * nxp + i]);

  /* éclairage cuit : la lumière vient de l'ouest-nord-ouest, comme sur une carte ombrée */
  const L = new THREE.Vector3(-0.70, 0.60, -0.38).normalize();
  const lh = Math.hypot(L.x, L.z), lx = L.x / lh, lz = L.z / lh, tanEl = L.y / lh;

  const pos = new Float32Array(n * 3), aH = new Float32Array(n), aShade = new Float32Array(n);
  for (let j = 0; j < nzp; j++) {
    for (let i = 0; i < nxp; i++) {
      const o = j * nxp + i, x = X0 + i * DX, z = Z0 + j * DZ, y = Y(i, j);
      pos[o * 3] = x; pos[o * 3 + 1] = H[o]; pos[o * 3 + 2] = z; aH[o] = H[o];
      if (H[o] < -0.4) { aShade[o] = 0.6; continue; }
      const i0 = i > 0 ? i - 1 : i, i1 = i < NX ? i + 1 : i, j0 = j > 0 ? j - 1 : j, j1 = j < NZ ? j + 1 : j;
      let nx = -(Y(i1, j) - Y(i0, j)) / ((i1 - i0) * DX), nz = -(Y(i, j1) - Y(i, j0)) / ((j1 - j0) * DZ), ny = 1;
      const inv = 1 / Math.hypot(nx, ny, nz); nx *= inv; ny *= inv; nz *= inv;
      const ndl = nx * L.x + ny * L.y + nz * L.z;
      /* ombre portée : on marche vers la lumière */
      let sh = 1;
      for (let k = 1; k <= 30; k++) {
        const t = k * 0.3, diff = y + 0.05 + t * tanEl - sampleY(x + lx * t, z + lz * t);
        const s = 0.55 + (2.2 * diff) / t; if (s < sh) sh = s;
      }
      /* occlusion : les creux sont plus sombres */
      let m = 0;
      for (let a = 0; a < 8; a++) {
        const ca = Math.cos(a * 0.7854), sa = Math.sin(a * 0.7854);
        m += sampleY(x + ca * 0.7, z + sa * 0.7) + sampleY(x + ca * 1.7, z + sa * 1.7);
      }
      const ao = 1 - clamp(m / 16 - y, 0, 1.1) * 0.5;
      aShade[o] = clamp01(ndl * 1.2 + 0.02) * (0.55 + 0.45 * clamp01(sh)) * ao;
    }
  }

  const tmpS = new Float32Array(n);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < nzp; j++) for (let i = 0; i < nxp; i++) {
      let s = 0, c = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii > NX || jj > NZ) continue;
        s += aShade[jj * nxp + ii]; c++;
      }
      tmpS[j * nxp + i] = s / c;
    }
    aShade.set(tmpS);
  }

  const idx = new Uint32Array(NX * NZ * 6);
  let q = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = j * nxp + i, b = a + 1, c = a + nxp, d = c + 1;
    idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aH', new THREE.BufferAttribute(aH, 1));
  geo.setAttribute('aShade', new THREE.BufferAttribute(aShade, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();

  /* sommet réel le plus proche d'une colline (les voisines et le bruit le déplacent) */
  const summit = (k) => {
    let x = HILLS[k][0], z = HILLS[k][1], best = sampleH(x, z);
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let a = 0; a < 8; a++) {
        const xx = x + Math.cos(a * 0.7854) * 0.12, zz = z + Math.sin(a * 0.7854) * 0.12, h = sampleH(xx, zz);
        if (h > best) { best = h; x = xx; z = zz; moved = true; }
      }
      if (!moved) break;
    }
    return new THREE.Vector3(x, best, z);
  };

  const sampleShade = (x, z) => {
    let fx = (x - X0) / DX, fz = (z - Z0) / DZ;
    if (fx < 0) fx = 0; else if (fx > NX - 0.001) fx = NX - 0.001;
    if (fz < 0) fz = 0; else if (fz > NZ - 0.001) fz = NZ - 0.001;
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, o = j * nxp + i;
    const a = aShade[o], b = aShade[o + 1], c = aShade[o + nxp], d = aShade[o + nxp + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  return { geo, sampleH, sampleY, sampleShade, summit };
}

/* ─────────────── matériaux ─────────────── */

const MASK_GLSL = /* glsl */`
  uniform vec2 uLens; uniform float uLensR;
  uniform vec2 uWaveC; uniform float uWaveR;
  uniform float uAll;
`;

const terrainVert = /* glsl */`
  attribute float aH; attribute float aShade;
  uniform float uWater;
  varying float vH; varying float vShade; varying vec3 vW; varying float vDepth;
  void main() {
    /* deux passes sur la même grille : la terre à sa hauteur, l'eau aplatie au niveau zéro.
       Chacune s'arrête à la ligne de rivage, calculée au pixel : la rive est nette. */
    vec3 p = vec3(position.x, mix(position.y, 0.0, uWater), position.z);
    vH = aH; vShade = aShade; vW = p;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const terrainFrag = /* glsl */`
  precision highp float;
  ${MASK_GLSL}
  uniform vec3 uSol, uProfond, uTrait, uLumiere, uMarque;
  uniform float uFocus; uniform vec3 uSites[3];
  uniform float uFogA, uFogB, uWater, uLineGain, uFade;
  varying float vH; varying float vShade; varying vec3 vW; varying float vDepth;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    /* les dérivées se calculent avant tout branchement */
    float fwH = max(fwidth(vH), 1e-5);
    vec2 dS0 = vW.xz - uSites[0].xy, dS1 = vW.xz - uSites[1].xy, dS2 = vW.xz - uSites[2].xy;
    float d0 = length(dS0), d1 = length(dS1), d2 = length(dS2);
    float fw0 = max(fwidth(d0), 1e-5), fw1 = max(fwidth(d1), 1e-5), fw2 = max(fwidth(d2), 1e-5);

    /* frontière du relevé : loupe du pointeur, ou onde qui gagne tout le massif */
    float n = vnoise(vW.xz * 1.3) + 0.5 * vnoise(vW.xz * 3.1);
    float eL = uLensR - (distance(vW.xz, uLens) + (n - 0.75) * 0.14);
    float eW = uWaveR - (distance(vW.xz, uWaveC) + (n - 0.75) * 0.9);
    float e = mix(max(eL, eW), 10.0, uAll);
    if (e < 0.0) discard;
    if (uWater > 0.5 ? vH >= 0.0 : vH < 0.0) discard;

    vec3 col;
    float shore = 1.0 - smoothstep(0.7, 1.8, abs(vH) / fwH);
    if (vH < 0.0) {
      /* l'eau : aplat, liseré de rive et lignes de rivage qui s'estompent */
      float f = -vH;
      col = mix(uProfond, uSol, smoothstep(0.2, 1.0, f));
      float w = (1.0 - smoothstep(0.5, 1.5, abs(f - 0.09) / fwH)) * 0.5
              + (1.0 - smoothstep(0.5, 1.5, abs(f - 0.21) / fwH)) * 0.3
              + (1.0 - smoothstep(0.5, 1.5, abs(f - 0.36) / fwH)) * 0.16;
      col = mix(col, uTrait, w * (1.0 - smoothstep(0.25, 0.8, fwH * 4.0)));
    } else {
      /* la terre : la couleur du sol, éclaircie sur les versants au soleil, assombrie à l'ombre,
         puis les courbes de niveau tirées au trait */
      float s = vShade;
      vec3 lo = mix(uSol, uProfond, 0.9), hi = mix(uSol, uLumiere, 0.36);
      col = s < 0.74 ? mix(lo, uSol, smoothstep(0.08, 0.74, s)) : mix(uSol, hi, smoothstep(0.74, 1.0, s));
      col = mix(col, hi, smoothstep(1.6, 4.2, vH) * 0.3);
      float iv = 0.22, f = vH / iv, fw = fwH / iv;
      float line = 1.0 - smoothstep(0.35, 1.25, abs(fract(f - 0.5) - 0.5) / fw);
      float major = 1.0 - smoothstep(0.9, 1.9, abs(fract(f / 5.0 - 0.5) - 0.5) * 5.0 / fw);
      float a = max(min(1.0, line * 0.4 * uLineGain), major * 0.95) * (1.0 - smoothstep(0.3, 0.75, fw));
      col = mix(col, uTrait, a);
    }
    col = mix(col, uTrait, shore * 0.95);

    /* les chantiers retenus : le reste du territoire s'efface, un périmètre les cerne */
    float near = max(max(1.0 - smoothstep(uSites[0].z * 0.6, uSites[0].z, d0),
                         1.0 - smoothstep(uSites[1].z * 0.6, uSites[1].z, d1)),
                         1.0 - smoothstep(uSites[2].z * 0.6, uSites[2].z, d2));
    col = mix(col, mix(col, uSol, uFade), uFocus * (1.0 - near));
    col = mix(col, uLumiere, 0.1 * uFocus * near * step(0.0, vH));
    float r0 = (1.0 - smoothstep(0.6, 1.7, abs(d0 - uSites[0].z) / fw0)) * step(0.42, fract(atan(dS0.y, dS0.x) * 3.5014));
    float r1 = (1.0 - smoothstep(0.6, 1.7, abs(d1 - uSites[1].z) / fw1)) * step(0.42, fract(atan(dS1.y, dS1.x) * 3.5014));
    float r2 = (1.0 - smoothstep(0.6, 1.7, abs(d2 - uSites[2].z) / fw2)) * step(0.42, fract(atan(dS2.y, dS2.x) * 3.5014));
    col = mix(col, uMarque, max(max(r0, r1), r2) * uFocus);

    /* liseré, de la couleur des balises, au front du relevé */
    col = mix(col, uMarque, 1.0 - smoothstep(0.045, 0.11, e));

    /* le lointain et les bords se fondent dans le sol */
    col = mix(col, uSol, smoothstep(uFogA, uFogB, vDepth) * 0.94);
    col = mix(col, uSol, smoothstep(0.84, 1.0, length(vW.xz / vec2(21.4, 16.4))));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const pointsVert = /* glsl */`
  ${MASK_GLSL}
  attribute vec4 aSeed; attribute float aLight;
  uniform float uTime, uIntro, uSize, uPersp, uFogA, uFogB, uMaxPx;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float mL = 1.0 - smoothstep(uLensR - 1.3, uLensR + 0.15, distance(p.xz, uLens));
    float mW = 1.0 - smoothstep(uWaveR - 1.6, uWaveR + 0.2, distance(p.xz, uWaveC));
    float m = max(max(mL, mW), uAll);

    /* le relevé brut : une couche floue qui flotte au-dessus du sol */
    vec3 raw = p + vec3((aSeed.x - 0.5) * 0.3,
                        aSeed.y * aSeed.y * aSeed.y * 0.62 + sin(uTime * 0.7 + aSeed.z * 6.2832) * 0.035,
                        (aSeed.w - 0.5) * 0.3);
    /* ouverture : le balayage progresse d'ouest en est, les points tombent en place */
    float sweep = (p.x + 19.0) / 38.0;
    float vis = smoothstep(sweep - 0.1, sweep + 0.02, uIntro * 1.14);
    raw.y += (1.0 - vis) * (1.2 + aSeed.z * 1.6);
    p = mix(raw, p, m);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = clamp(uSize * (0.6 + aSeed.x * 0.8) * uPersp / depth, 1.0, uMaxPx);
    /* l'intensité suit la lumière du relief : les versants éclairés ressortent, les autres s'effacent */
    /* pointillé : c'est la densité des points qui porte la lumière. Les courbes de niveau s'y devinent déjà,
       en creux ; le bas des versants s'éclaircit ; un rideau de balayage traverse le massif. */
    float lit = mix(0.06, 0.8, smoothstep(0.06, 0.66, aLight));
    float band = abs(fract(position.y / 0.44 - 0.5) - 0.5) * 2.0;
    lit *= mix(0.3, 1.0, smoothstep(0.1, 0.34, band)) * mix(0.3, 1.0, smoothstep(0.0, 0.7, position.y));
    float scan = 1.0 - smoothstep(0.0, 0.42, abs(p.x - mix(-24.0, 24.0, fract(uTime * 0.075))));
    lit = max(lit, scan * 0.85) * (1.0 - smoothstep(uFogA, uFogB, depth) * 0.85);
    gl_PointSize *= 1.0 + scan * 0.5;
    vAlpha = (1.0 - m) * vis * step(aSeed.w, lit);
  }
`;

const pointsFrag = /* glsl */`
  precision highp float;
  uniform vec3 uTrait;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.32, 0.5, d)) * vAlpha;
    gl_FragColor = vec4(uTrait, a);
  }
`;

const routeVert = /* glsl */`
  attribute float aU;
  varying float vU;
  void main() { vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const routeFrag = /* glsl */`
  precision highp float;
  uniform vec3 uMarque; uniform float uDraw, uAlpha;
  varying float vU;
  void main() {
    if (vU > uDraw || uAlpha < 0.01) discard;
    gl_FragColor = vec4(uMarque, uAlpha);
  }
`;

/* ─────────────── caméra : cible, distance, azimut, angle depuis la verticale ─────────────── */

const KEYS = [
  { s: 0.00, T: [0.4, 1.4, -0.6], d: 21.5, th: -0.14, ph: 1.420, off: [0.05, -0.20] },   // ouverture : le massif à l'horizon
  { s: 1.00, T: [-4.4, 1.3, -0.8], d: 15.0, th: -0.50, ph: 1.250, off: [0.19, 0.03] },   // Comprendre : au ras du relevé
  { s: 1.80, T: [0.2, 0.9, 0.4], d: 25.0, th: -0.34, ph: 1.170, off: [0.20, 0.04] },     // … la carte entière apparaît
  { s: 2.50, T: [1.6, 0.6, -1.6], d: 28.0, th: 0.50, ph: 1.000, off: [0.165, 0.04] },    // Choisir : trois chantiers
  { s: 3.45, T: [2.2, 0.9, -1.6], d: 25.0, th: 0.62, ph: 1.100, off: [0.155, 0.03] },    // Construire : la boucle
  { s: 4.10, T: [0.8, 0.5, -0.9], d: 26.0, th: 0.36, ph: 0.600, off: [0.15, 0.02] },     // on s'élève
  { s: 4.72, T: [0.0, 0.0, 0.0], d: 36.0, th: 0.00, ph: 0.045, off: [0.13, 0.00] },      // Transmettre : la carte, vue en plan
  { s: 5.00, T: [0.0, 0.0, 0.0], d: 37.0, th: 0.00, ph: 0.045, off: [0.13, 0.00] },
];
const CONTACT = { T: [-5.6, 2.6, -1.9], d: 12.5, th: -1.02, ph: 1.30, off: [0.20, 0.03] };

function evalKeys(s, out) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  if (s <= a.s) b = a;
  else if (s >= b.s) a = b;
  else for (let i = 0; i < KEYS.length - 1; i++) if (s >= KEYS[i].s && s <= KEYS[i + 1].s) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const t = a === b ? 0 : smooth((s - a.s) / (b.s - a.s));
  out.tx = lerp(a.T[0], b.T[0], t); out.ty = lerp(a.T[1], b.T[1], t); out.tz = lerp(a.T[2], b.T[2], t);
  out.d = lerp(a.d, b.d, t); out.th = lerp(a.th, b.th, t); out.ph = lerp(a.ph, b.ph, t);
  out.ox = lerp(a.off[0], b.off[0], t); out.oy = lerp(a.off[1], b.off[1], t);
  return out;
}

/* ce que chaque moment du récit montre */
function storyParams(s, o) {
  o.wave = ramp(s, 1.08, 1.8);
  o.topo = ramp(s, 1.5, 1.74) * (1 - ramp(s, 2.02, 2.18)) + ramp(s, 4.5, 4.72);
  o.flag0 = ramp(s, 2.1, 2.3); o.flag1 = ramp(s, 2.2, 2.4); o.flag2 = ramp(s, 2.3, 2.5);
  o.focus = ramp(s, 2.12, 2.52) * (1 - ramp(s, 3.96, 4.4));
  o.tags = ramp(s, 2.34, 2.52) * (1 - ramp(s, 3.0, 3.14));
  o.route = ramp(s, 3.04, 3.4);
  o.agents = ramp(s, 3.24, 3.4) * (1 - ramp(s, 4.02, 4.2));
  o.human = ramp(s, 3.34, 3.5) * (1 - ramp(s, 4.02, 4.2));
  return o;
}

/* ═══════════════════════ la scène ═══════════════════════ */

export function createScene(canvas, { labels = [], coarse = false } = {}) {
  THREE.ColorManagement.enabled = false;                 // on travaille directement en sRGB : les encres sont celles du CSS
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  /* les encres : des objets Color partagés par tous les matériaux, remis à jour d'un coup si la palette change */
  const tones = { sol: new THREE.Color(), profond: new THREE.Color(), trait: new THREE.Color(), lumiere: new THREE.Color(), marque: new THREE.Color() };
  const tinted = [], lineGain = { value: 1 }, fade = { value: 0.82 };
  function applyInks() {
    const k = readInks();
    for (const name in tones) tones[name].setRGB(k[name][0] / 255, k[name][1] / 255, k[name][2] / 255);
    renderer.setClearColor(tones.sol, 1);
    /* sur un sol clair, les courbes fines (tracées à l'encre) ont besoin de plus de poids */
    const light = 0.2126 * tones.sol.r + 0.7152 * tones.sol.g + 0.0722 * tones.sol.b > 0.45;
    lineGain.value = light ? 1.7 : 1;
    fade.value = light ? 0.7 : 0.82;                      // à quel point le territoire s'efface autour des chantiers retenus
    tinted.forEach(([mat, name]) => mat.color.copy(tones[name]));
  }
  const ink = (name, opts) => {
    const mat = new THREE.MeshBasicMaterial({ color: tones[name], transparent: true, ...opts });
    tinted.push([mat, name]);
    return mat;
  };
  applyInks();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 220);

  const terrain = buildTerrain();
  const sites = SITE_HILLS.map((k) => terrain.summit(k));
  const named = NAMED.map((k) => terrain.summit(k));

  const shared = {
    uLens: { value: new THREE.Vector2(-30, -30) }, uLensR: { value: 0 },
    uWaveC: { value: new THREE.Vector2(sites[0].x, sites[0].z) }, uWaveR: { value: 0 },
    uAll: { value: 0 }, uFogA: { value: 30 }, uFogB: { value: 80 }, uTime: { value: 0 }, uLineGain: lineGain, uFade: fade,
    uSol: { value: tones.sol }, uProfond: { value: tones.profond }, uTrait: { value: tones.trait },
    uLumiere: { value: tones.lumiere }, uMarque: { value: tones.marque },
  };

  /* relief */
  const landUniforms = { ...shared, uFocus: { value: 0 }, uSites: { value: sites.map((p) => new THREE.Vector3(p.x, p.z, 2.5)) } };
  const terrainMat = new THREE.ShaderMaterial({ vertexShader: terrainVert, fragmentShader: terrainFrag, uniforms: { ...landUniforms, uWater: { value: 0 } } });
  const waterMat = new THREE.ShaderMaterial({ vertexShader: terrainVert, fragmentShader: terrainFrag, uniforms: { ...landUniforms, uWater: { value: 1 } } });
  for (const mat of [terrainMat, waterMat]) {
    const mesh = new THREE.Mesh(terrain.geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  /* relevé : nuage de points */
  const COUNT = coarse ? 56000 : 118000;
  const rnd = mulberry32(7741);
  const pPos = new Float32Array(COUNT * 3), pSeed = new Float32Array(COUNT * 4), pLight = new Float32Array(COUNT);
  for (let i = 0, guard = 0; i < COUNT && guard < COUNT * 40; guard++) {
    const x = (rnd() * 2 - 1) * 19.5, z = (rnd() * 2 - 1) * 15;
    const h = terrain.sampleH(x, z);
    if (h < -0.03 && rnd() > 0.05) continue;       // peu de retours sur l'eau
    if (h < -0.35) continue;
    pPos[i * 3] = x; pPos[i * 3 + 1] = Math.max(0, h) + 0.012; pPos[i * 3 + 2] = z;
    pSeed[i * 4] = rnd(); pSeed[i * 4 + 1] = rnd(); pSeed[i * 4 + 2] = rnd(); pSeed[i * 4 + 3] = rnd();
    pLight[i] = h < 0 ? 0.3 : terrain.sampleShade(x, z);
    i++;
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pointsGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 4));
  pointsGeo.setAttribute('aLight', new THREE.BufferAttribute(pLight, 1));
  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: pointsVert, fragmentShader: pointsFrag, transparent: true, depthWrite: false,
    uniforms: { ...shared, uIntro: { value: 0 }, uSize: { value: 0.058 }, uPersp: { value: 1000 }, uMaxPx: { value: 9 } },
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  points.frustumCulled = false;
  scene.add(points);

  /* balises des chantiers */
  const flags = sites.map((p) => {
    const g = new THREE.Group();
    const poleMat = ink('trait');
    const flagMat = ink('marque', { side: THREE.DoubleSide });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.6, 8), poleMat);
    pole.position.y = 0.8;
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1.6, 0, 0.86, 1.36, 0, 0, 1.12, 0]), 3));
    const pennant = new THREE.Mesh(tri, flagMat);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 56).rotateX(-Math.PI / 2), flagMat);
    ring.position.y = 0.07;
    g.add(pole, pennant, ring);
    g.position.copy(p);
    g.userData = { base: p.y, mats: [poleMat, flagMat] };
    g.visible = false;
    scene.add(g);
    return g;
  });

  /* le tracé qui relie les chantiers, et que parcourent les agents */
  const A = sites[0], B = sites[1], C = sites[2];
  const way = [
    [A.x, A.z], [(A.x + C.x) / 2 - 0.3, (A.z + C.z) / 2 - 1.5], [C.x, C.z],
    [(C.x + B.x) / 2 + 0.9, (C.z + B.z) / 2 - 0.9], [B.x, B.z],
    [B.x - 3.0, B.z + 2.9], [0.6, 4.5], [-4.7, 3.5], [-6.3, 0.9],
  ];
  const curve = new THREE.CatmullRomCurve3(way.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.5);
  const SEG = 520, HALF = 0.075;
  const rPos = new Float32Array((SEG + 1) * 2 * 3), rU = new Float32Array((SEG + 1) * 2), rIdx = new Uint16Array(SEG * 6);
  const spaced = curve.getSpacedPoints(SEG);
  const lift = (x, z) => terrain.sampleY(x, z) + 0.075;
  for (let i = 0; i <= SEG; i++) {
    const p = spaced[i], pa = spaced[(i + SEG - 1) % SEG], pb = spaced[(i + 1) % SEG];
    let tx = pb.x - pa.x, tz = pb.z - pa.z; const inv = 1 / Math.hypot(tx, tz); tx *= inv; tz *= inv;
    const lxp = p.x - tz * HALF, lzp = p.z + tx * HALF, rxp = p.x + tz * HALF, rzp = p.z - tx * HALF;
    rPos.set([lxp, lift(lxp, lzp), lzp, rxp, lift(rxp, rzp), rzp], i * 6);
    rU[i * 2] = rU[i * 2 + 1] = i / SEG;
    p.y = lift(p.x, p.z);
    if (i < SEG) { const o = i * 2; rIdx.set([o, o + 1, o + 2, o + 1, o + 3, o + 2], i * 6); }
  }
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  routeGeo.setAttribute('aU', new THREE.BufferAttribute(rU, 1));
  routeGeo.setIndex(new THREE.BufferAttribute(rIdx, 1));
  const routeMat = new THREE.ShaderMaterial({
    vertexShader: routeVert, fragmentShader: routeFrag, side: THREE.DoubleSide, transparent: true,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    uniforms: { uMarque: shared.uMarque, uDraw: { value: 0 }, uAlpha: { value: 1 } },
  });
  const route = new THREE.Mesh(routeGeo, routeMat);
  route.frustumCulled = false;
  scene.add(route);
  const onRoute = (u, out) => {
    const f = (((u % 1) + 1) % 1) * SEG, i = f | 0, t = f - i, a = spaced[i], b = spaced[(i + 1) % (SEG + 1)] || spaced[0];
    return out.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
  };

  /* les agents : trois repères qui parcourent la boucle ; au centre, une personne */
  const agentMat = ink('trait');
  const haloMat = ink('marque', { side: THREE.DoubleSide });
  const agents = [0, 1, 2].map(() => {
    const g = new THREE.Group();
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.335, 40), haloMat);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), agentMat), halo);
    g.userData.halo = halo; g.visible = false;
    scene.add(g);
    return g;
  });
  const hub = new THREE.Vector3((A.x + B.x + C.x) / 3 + 0.3, 0, (A.z + B.z + C.z) / 3 + 0.5);
  hub.y = terrain.sampleY(hub.x, hub.z);
  const humanMat = ink('trait');
  const human = new THREE.Group();
  const hPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 8), humanMat); hPole.position.y = 0.625;
  const hHead = new THREE.Mesh(new THREE.CircleGeometry(0.24, 36), humanMat);
  const humanDotMat = ink('marque');
  const hDot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), humanDotMat); hDot.position.z = 0.004;
  const hHeadGroup = new THREE.Group(); hHeadGroup.add(hHead, hDot); hHeadGroup.position.y = 1.4;
  human.add(hPole, hHeadGroup); human.position.copy(hub); human.visible = false;
  scene.add(human);
  const spokeGeo = new THREE.BufferGeometry();
  spokeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
  const spokeMat = new THREE.LineBasicMaterial({ color: tones.trait, transparent: true, opacity: 0 });
  tinted.push([spokeMat, 'trait']);
  const spokes = new THREE.LineSegments(spokeGeo, spokeMat);
  spokes.frustumCulled = false; spokes.visible = false;
  scene.add(spokes);

  /* ─────────────── état ─────────────── */

  const st = {
    story: 0, mode: 'story', contact: 0, intro: 0, all: 0,
    running: false, paused: false, time: 0, last: 0,
    w: 1, h: 1, aspect: 1, portrait: false,
    px: 0, py: 0, sx: 0, sy: 0,                              // pointeur (−1..1) et sa version amortie
    lensOn: 0, lensAuto: true, lensTx: 0, lensTz: 0, lensR: 0, lensHas: false,
    cam: { tx: 0, ty: 0, tz: 0, d: 20, th: 0, ph: 1, ox: 0, oy: 0 }, camInit: false,
    quality: 1, slow: 0, frames: 0,
    stacked: false, clearX: 0.43, clearR: 0.9, clearY: 0.5,  // zone libre pour les étiquettes (voir setClear)
  };
  const tmp = { tx: 0, ty: 0, tz: 0, d: 0, th: 0, ph: 0, ox: 0, oy: 0 };
  const P = {};
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const agentPos = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const humanTop = new THREE.Vector3();

  const labelNodes = Array.from(labels).map((el) => {
    const [kind, i] = (el.dataset.anchor || '').split(':');
    return { el, kind, i: +i || 0, o: -1 };
  });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    st.w = w; st.h = h; st.aspect = w / h; st.portrait = st.aspect < 0.9;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2) * st.quality;
    renderer.setPixelRatio(Math.max(0.75, dpr));
    renderer.setSize(w, h, false);
    camera.aspect = st.aspect;
    pointsMat.uniforms.uPersp.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    pointsMat.uniforms.uMaxPx.value = 3.6 * renderer.getPixelRatio();
    camera.updateProjectionMatrix();
    if (!st.running) renderOnce();
  }

  /* où le pointeur touche-t-il le relief ? */
  function pick(nx, ny) {
    ndc.set(nx, ny);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > -0.02) return false;
    let t0 = Math.max(0, (o.y - 5) / -d.y), t1 = o.y / -d.y, hit = t1;
    const N = 48;
    for (let k = 0; k <= N; k++) {
      const t = t0 + ((t1 - t0) * k) / N;
      if (o.y + d.y * t - terrain.sampleY(o.x + d.x * t, o.z + d.z * t) <= 0) {
        let a = t - (t1 - t0) / N, b = t;
        for (let it = 0; it < 6; it++) { const m = (a + b) / 2; if (o.y + d.y * m - terrain.sampleY(o.x + d.x * m, o.z + d.z * m) <= 0) b = m; else a = m; }
        hit = b; break;
      }
    }
    st.lensTx = o.x + d.x * hit; st.lensTz = o.z + d.z * hit;
    return true;
  }

  function setPointer(nx, ny, inside) {
    st.px = nx; st.py = ny;
    if (inside && !coarse) { st.lensAuto = false; st.pointerNdc = [nx, -ny]; st.lensOn = 1; }
    else if (!inside) { st.lensAuto = true; }
  }

  function update(dt) {
    const t = st.time;
    const k = 1 - Math.exp(-dt * 5.5), kSlow = 1 - Math.exp(-dt * 2.6);
    st.sx += (st.px - st.sx) * kSlow; st.sy += (st.py - st.sy) * kSlow;

    /* récit → paramètres */
    const contact = st.mode === 'contact';
    storyParams(st.story, P);
    if (contact) { P.wave = 1; P.topo = 0; P.flag0 = P.flag1 = P.flag2 = 1; P.focus = 0; P.tags = 0; P.route = 1; P.agents = 0; P.human = 0; }

    /* caméra */
    if (contact) {
      const c = CONTACT;
      tmp.tx = c.T[0]; tmp.ty = c.T[1]; tmp.tz = c.T[2]; tmp.d = c.d - st.contact * 1.6;
      tmp.th = c.th + st.contact * 0.3 + Math.sin(t * 0.07) * 0.05; tmp.ph = c.ph; tmp.ox = c.off[0]; tmp.oy = c.off[1];
    } else evalKeys(st.story, tmp);
    /* les cadrages sont réglés pour un écran très large (1,9) : ailleurs, la caméra recule pour garder la même largeur de relief */
    let fit = clamp(1.9 / st.aspect, 1, 2.25);
    if (st.portrait) {
      const flat = contact ? 0 : ramp(st.story, 4.1, 4.72);
      /* en portrait, la caméra tourne : les trois chantiers tiennent dans la largeur, puis la carte se lit dans sa longueur */
      tmp.th += lerp(ramp(st.story, 1.85, 2.45) * 1.15, Math.PI * 0.5, flat);
      tmp.ox = contact ? 0.06 : 0; tmp.oy = contact ? -0.2 : lerp(lerp(-0.1, 0.22, ramp(st.story, 0.55, 1.0)), 0.17, flat);
      fit = lerp(fit, fit * 0.8, 1 - flat) * (contact ? 0.62 : 1);
    }
    tmp.d *= fit;
    const cam = st.cam;
    if (!st.camInit) { Object.assign(cam, tmp); st.camInit = true; }
    else for (const key in tmp) cam[key] += (tmp[key] - cam[key]) * k;
    const th = cam.th - st.sx * 0.075, ph = clamp(cam.ph + st.sy * 0.035 * Math.min(1, cam.ph * 3), 0.03, 1.5);
    camera.position.set(cam.tx + cam.d * Math.sin(ph) * Math.sin(th), cam.ty + cam.d * Math.cos(ph), cam.tz + cam.d * Math.sin(ph) * Math.cos(th));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    camera.setViewOffset(st.w, st.h, -cam.ox * st.w, -cam.oy * st.h, st.w, st.h);
    camera.updateMatrixWorld();

    /* brume de distance, réglée sur la caméra */
    shared.uFogA.value = cam.d * 0.95; shared.uFogB.value = cam.d * 2.5 + 14;

    /* loupe : elle suit le pointeur ; sans pointeur, elle se promène sur le massif */
    if (st.lensPin) { /* position fixée par pinLens */ }
    else if (st.lensAuto || coarse) {
      st.lensTx = 1.0 + Math.cos(t * 0.17 + 2.6) * 7.6; st.lensTz = -1.3 + Math.sin(t * 0.29 + 1.2) * 2.6; st.lensOn = 1;
    } else if (st.pointerNdc) { if (!pick(st.pointerNdc[0], st.pointerNdc[1])) st.lensOn = 0; }
    const lens = shared.uLens.value;
    if (!st.lensHas) { lens.set(st.lensTx, st.lensTz); st.lensHas = true; }
    lens.x += (st.lensTx - lens.x) * (st.lensAuto ? kSlow : k); lens.y += (st.lensTz - lens.y) * (st.lensAuto ? kSlow : k);
    const lensGoal = st.intro > 0.92 ? st.lensOn * (st.lensPin ? st.lensPin : st.lensAuto || coarse ? 3.5 : 4.1) : 0;
    st.lensR += (lensGoal - st.lensR) * kSlow;
    shared.uLensR.value = st.lensR;

    shared.uWaveR.value = P.wave * 36;
    shared.uAll.value = Math.max(st.all, P.wave > 0.999 ? 1 : 0);
    shared.uTime.value = t;
    pointsMat.uniforms.uIntro.value = st.intro;
    points.visible = shared.uAll.value < 1;
    terrainMat.uniforms.uFocus.value = P.focus;

    /* balises : elles descendent se planter */
    const fl = [P.flag0, P.flag1, P.flag2];
    for (let i = 0; i < 3; i++) {
      const g = flags[i], e = fl[i];
      g.visible = e > 0.001;
      if (!g.visible) continue;
      const out = 1 - Math.pow(1 - e, 3);
      g.position.y = g.userData.base + (1 - out) * 2.4;
      g.userData.mats[0].opacity = g.userData.mats[1].opacity = Math.min(1, e * 2.2);
    }

    /* tracé, agents, personne */
    routeMat.uniforms.uDraw.value = P.route;
    route.visible = P.route > 0.001;
    const av = P.agents > 0.001;
    agentMat.opacity = haloMat.opacity = P.agents;
    for (let i = 0; i < 3; i++) {
      const g = agents[i]; g.visible = av;
      onRoute(t * 0.034 + i / 3, agentPos[i]); agentPos[i].y += 0.2;
      if (!av) continue;
      g.position.copy(agentPos[i]);
      g.userData.halo.quaternion.copy(camera.quaternion);
    }
    human.visible = P.human > 0.001; spokes.visible = human.visible && av;
    humanMat.opacity = humanDotMat.opacity = P.human; spokeMat.opacity = P.human * 0.5;
    humanTop.set(hub.x, hub.y + 1.4, hub.z);
    if (human.visible) {
      hHeadGroup.quaternion.copy(camera.quaternion);
      const sp = spokeGeo.attributes.position.array;
      for (let i = 0; i < 3; i++) { sp.set([humanTop.x, humanTop.y, humanTop.z, agentPos[i].x, agentPos[i].y, agentPos[i].z], i * 6); }
      spokeGeo.attributes.position.needsUpdate = true;
    }

    /* étiquettes HTML accrochées au relief */
    for (let i = 0; i < labelNodes.length; i++) {
      const L = labelNodes[i];
      let o = 0;
      if (L.kind === 'hill') { o = P.topo; v3.copy(named[L.i]); v3.y += 0.5; }
      else if (L.kind === 'site') { o = P.tags * fl[L.i]; v3.copy(sites[L.i]); v3.y += 1.95; }
      else if (L.kind === 'agent') { o = P.agents; v3.copy(agentPos[L.i]); v3.y += 0.42; }
      else if (L.kind === 'human') { o = P.human; v3.copy(humanTop); v3.y += 0.42; }
      if (o > 0.01) {
        v3b.copy(v3).project(camera);
        const sx = v3b.x * 0.5 + 0.5, sy = -v3b.y * 0.5 + 0.5;
        if (v3b.z > 1 || v3b.z < -1) o = 0;
        else {
          /* une étiquette s'efface avant de toucher le texte du chapitre, le repère d'étapes ou le bord de l'écran */
          o *= st.stacked
            ? ramp(sy, st.clearY - 0.015, st.clearY + 0.02) * (1 - ramp(sy, 0.86, 0.9)) * ramp(sx, 0.1, 0.17) * (1 - ramp(sx, 0.83, 0.9))
            : ramp(sx, st.clearX - 0.02, st.clearX + 0.02) * (1 - ramp(sx, st.clearR - 0.02, st.clearR + 0.02));
          L.el.style.transform = `translate3d(${(sx * st.w).toFixed(1)}px,${(sy * st.h).toFixed(1)}px,0) translate(-50%,-100%)`;
        }
      }
      o = o < 0.01 ? 0 : Math.round(o * 100) / 100;
      if (o !== L.o) { L.el.style.opacity = o; L.o = o; }
    }
  }

  /* position à l'écran d'un chantier, en % : sert au volet qui s'ouvre depuis la balise */
  function siteScreen(i) {
    v3b.copy(sites[i]).project(camera);
    return [(v3b.x * 0.5 + 0.5) * 100, (-v3b.y * 0.5 + 0.5) * 100];
  }

  function renderOnce() { update(0.016); update(0.016); renderer.render(scene, camera); }

  let raf = 0;
  function frame(now) {
    if (!st.running) return;
    raf = requestAnimationFrame(frame);
    let dt = st.last ? (now - st.last) / 1000 : 0.016;
    st.last = now;
    /* si l'appareil peine, on allège une fois : moins de pixels, moins de points */
    if (st.frames < 90) {
      st.frames++; if (dt > 0.03) st.slow++;
      if (st.frames === 90 && st.slow > 40 && st.quality === 1) { st.quality = 0.66; pointsGeo.setDrawRange(0, Math.floor(COUNT * 0.55)); resize(); }
    }
    if (dt > 0.1) dt = 0.1;
    if (!st.paused) st.time += dt;
    update(dt);
    renderer.render(scene, camera);
  }

  const api = {
    setStory(s) { st.story = s; if (!st.running) renderOnce(); },
    setMode(m, c = 0) { if (st.mode !== m) { st.mode = m; st.camInit = false; } st.contact = c; if (!st.running) renderOnce(); },
    setIntro(v) { st.intro = v; },
    setAll(v) { st.all = v; },
    setInks() { applyInks(); if (!st.running) renderOnce(); },
    setPointer,
    /* zone libre pour les étiquettes, en fractions de l'écran : à droite de x, à gauche de r, sous y (portrait) */
    setClear({ stacked, x, r, y }) { st.stacked = stacked; st.clearX = x; st.clearR = r; st.clearY = y; },
    setPaused(p) { st.paused = !!p; },
    setRunning(r) {
      if (r === st.running) return;
      st.running = r;
      if (r) { st.last = 0; raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    },
    snap() { st.camInit = false; },
    pinLens(x, z, r = 4.1) { st.lensPin = r; st.lensTx = x; st.lensTz = z; st.lensOn = 1; st.lensR = r; shared.uLens.value.set(x, z); st.lensHas = true; },
    resize, renderOnce, siteScreen,
    get state() { return st; },
    debug: { KEYS, CONTACT, camera, shared, pointsMat, terrainMat, sites, named, terrain },
    dispose() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
  resize();
  return api;
}
