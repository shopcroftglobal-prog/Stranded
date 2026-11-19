// Our own blocky characters. Every model is built from boxes, and every box face
// is painted pixel by pixel in code (1 pixel = 1/16 of a block, the same as the blocks),
// from our own palettes. Not used by the game yet: see characters-preview/.
import * as THREE from 'three';
import { hashf as hash } from './noise.js';

const PX = 1 / 16;
const pick = (arr, a) => arr[Math.floor(a * arr.length) % arr.length];
const shade = (hex, f) => {
  const c = new THREE.Color(hex); c.multiplyScalar(f);
  return '#' + c.getHexString();
};
// a small palette made from one colour: light, base, dark variations
const tones = (hex) => [shade(hex, 1.06), hex, shade(hex, 0.94), shade(hex, 0.9)];

// Face order matches THREE.BoxGeometry: right, left, top, bottom, front, back.
const FACES = ['right', 'left', 'top', 'bottom', 'front', 'back'];
function faceSize(face, w, h, d) {
  if (face === 'right' || face === 'left') return [d, h];
  if (face === 'top' || face === 'bottom') return [w, d];
  return [w, h];
}

const texCache = new Map();
function paintFace(w, h, fn, key) {
  if (key && texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = document.createElement('canvas'); g.width = w; g.height = h;
  const cx = c.getContext('2d'), gx = g.getContext('2d');
  gx.fillStyle = '#000'; gx.fillRect(0, 0, w, h);
  let glow = false;
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    let col = fn(i, j, w, h);
    if (Array.isArray(col)) { gx.fillStyle = col[1]; gx.fillRect(i, j, 1, 1); glow = true; col = col[0]; }
    cx.fillStyle = col; cx.fillRect(i, j, 1, 1);
  }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; return t; };
  const out = { map: mk(c), glow: glow ? mk(g) : null };
  if (key) texCache.set(key, out);
  return out;
}

// box(w, h, d, paint, opts): paint(face, i, j, fw, fh) -> colour | [colour, glow]
function box(w, h, d, paint, opts = {}) {
  const geo = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
  const mats = FACES.map((face) => {
    const [fw, fh] = faceSize(face, w, h, d);
    const t = paintFace(fw, fh, (i, j) => paint(face, i, j, fw, fh));
    const m = new THREE.MeshLambertMaterial({ map: t.map, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
    if (t.glow) { m.emissiveMap = t.glow; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = opts.glow ?? 1.2; }
    return m;
  });
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
// put a mesh in a pivot group. (px,py,pz) = pivot in pixels; (ox,oy,oz) = mesh offset from pivot
function part(parent, mesh, px, py, pz, ox = 0, oy = 0, oz = 0) {
  const g = new THREE.Group(); g.position.set(px * PX, py * PX, pz * PX);
  mesh.position.set(ox * PX, oy * PX, oz * PX); g.add(mesh); parent.add(g); return g;
}
const flat = (pal, seed, scale = 1) => (face, i, j) => pick(pal, hash(Math.floor(i / scale) + seed, Math.floor(j / scale), seed + FACES.indexOf(face) * 7));

// ---------------------------------------------------------------- the Pilot (you)
export const SUITS = {
  sand: { name: 'Sand', suit: '#e4dac8', trim: '#c4562a', dark: '#5a4a44', glass: '#1c2a3a' },
  sea:  { name: 'Sea',  suit: '#4e9690', trim: '#f0c24a', dark: '#2a3a40', glass: '#16202c' },
  sun:  { name: 'Sun',  suit: '#e8b23c', trim: '#3a3f4a', dark: '#4a3a2a', glass: '#1a1f2e' },
  berry: { name: 'Berry', suit: '#8a3a6e', trim: '#6fd6b0', dark: '#2e1a2a', glass: '#141a24' },
  frost: { name: 'Frost', suit: '#d6e4ee', trim: '#e8607e', dark: '#3a4656', glass: '#18243a' },
};
export function makePilot(suitId = 'sand') {
  const S = SUITS[suitId] || SUITS.sand;
  const suit = tones(S.suit), trim = tones(S.trim), dark = tones(S.dark);
  const root = new THREE.Group(); const rig = {};
  const cloth = (seed) => (face, i, j) => pick(suit, hash(i, j, seed));

  // legs 5x8x5, boots are the bottom 3 rows, a knee pad on the front
  for (const s of [-1, 1]) {
    const leg = box(5, 8, 5, (face, i, j) => {
      if (face === 'bottom') return dark[2];
      if (j >= 5) return j === 5 ? trim[2] : pick(dark, hash(i, j, 30));
      if (face === 'front' && j >= 1 && j <= 2 && i >= 1 && i <= 3) return trim[1];
      return pick(suit, hash(i, j, 31 + s));
    });
    rig[s < 0 ? 'legL' : 'legR'] = part(root, leg, s * 3, 8, 0, 0, -4, 0);
  }
  // body 12x10x7: belt, chest panel with lights, a stripe across
  const body = box(12, 10, 7, (face, i, j, fw) => {
    if (j >= 8) return j === 8 ? dark[0] : pick(dark, hash(i, j, 40));
    if (face === 'front') {
      if (j === 8 - 1 && (i === 5 || i === 6)) return trim[0];               // belt buckle
      if (i >= 4 && i <= 7 && j >= 2 && j <= 5) {                           // chest panel
        if (i === 4 || i === 7 || j === 2 || j === 5) return dark[1];
        if (j === 3 && i === 5) return ['#7dff9a', '#40ff70'];
        if (j === 3 && i === 6) return ['#ffb04a', '#ff8a20'];
        return '#22262c';
      }
    }
    if (j === 1 && face !== 'top') return trim[1];
    return pick(suit, hash(i, j, 41));
  });
  part(root, body, 0, 13, 0);
  // backpack 10x9x4 with two air tank stripes and a vent
  const pack = box(10, 9, 4, (face, i, j) => {
    if (face === 'back') {
      if ((i === 2 || i === 7) && j >= 1 && j <= 7) return trim[hash(i, j, 50) > 0.5 ? 0 : 1];
      if (i >= 3 && i <= 6 && j >= 5 && j <= 7) return (j % 2 === 0) ? '#2a2e34' : dark[0];
    }
    return pick(['#8f949a', '#858a90', '#9a9fa5', '#7a7f85'], hash(i, j, 51));
  });
  part(root, pack, 0, 13.5, -5.5);
  // arms 4x10x4, gloves are the bottom 3 rows
  for (const s of [-1, 1]) {
    const arm = box(4, 10, 4, (face, i, j) => {
      if (j >= 7 || face === 'bottom') return pick(trim, hash(i, j, 60));
      if (j === 6) return dark[0];
      if (j === 0 && face === 'top') return suit[0];
      return pick(suit, hash(i, j, 61 + s));
    });
    rig[s < 0 ? 'armL' : 'armR'] = part(root, arm, s * 8, 17.5, 0, 0, -4.5, 0);
  }
  // helmet 12x11x11 with a wide visor and two soft eye lights behind the glass
  const head = new THREE.Group(); head.position.set(0, 18 * PX, 0); root.add(head); rig.head = head;
  const helmet = box(12, 11, 11, (face, i, j, fw, fh) => {
    const shell = pick(suit, hash(i, j, 70));
    if (face === 'front') {
      if (i >= 2 && i <= 9 && j >= 3 && j <= 8) {
        if (j === 3 || i === 2 || i === 9) return shade(S.glass, 1.3);
        if ((i === 4 || i === 7) && (j === 5 || j === 6)) return ['#f6fbff', '#cfe8ff'];
        if (i + j === 9 || i + j === 10) return shade(S.glass, 2.1);      // a glint across the glass
        return S.glass;
      }
      if (j === 10) return dark[1];
      if (j === 1 && i >= 3 && i <= 8) return trim[1];
      return shell;
    }
    if (face === 'right' || face === 'left') {
      const dx = Math.abs(i - 5.5), dy = Math.abs(j - 5.5);
      if (dx < 2 && dy < 2) return trim[dx < 1 && dy < 1 ? 0 : 1];       // ear disc
      if (j === 10) return dark[1];
      return shell;
    }
    if (face === 'top' && j >= 1 && j <= 8 && (i === 5 || i === 6)) return trim[1]; // ridge
    return shell;
  });
  part(head, helmet, 0, 5.5, 0);
  const ant = box(1, 4, 1, (face, i, j) => (j === 0 ? ['#ff6a3a', '#ff4a1a'] : '#3a3f46'));
  part(head, ant, 4, 11, -2, 0, 2, 0);
  rig.antTip = ant;
  root.userData = { rig, kind: 'pilot', height: 33 * PX };
  return root;
}

// ---------------------------------------------------------------- colour options for everyone
// Each character has a few colour mixes. The first one is the original.
const L = (hex, f = 1.35) => shade(hex, f);   // a lighter glow version of a colour
export const COLOURS = {
  pilot: SUITS,
  buddy: {
    silver: { name: 'Silver', metal: '#c9ccd0', trim: '#e86a2a', eyes: '#7dffb0', screen: '#1a2a26', parts: '#6a7078' },
    copper: { name: 'Copper', metal: '#c08050', trim: '#2e6a6a', eyes: '#7de8ff', screen: '#14222a', parts: '#5a4636' },
    mint:   { name: 'Mint',   metal: '#8fd6b8', trim: '#8a3a7a', eyes: '#ff9ad0', screen: '#2a1a26', parts: '#4e6a62' },
    coal:   { name: 'Coal',   metal: '#4a4e56', trim: '#f0c24a', eyes: '#ffc060', screen: '#141414', parts: '#2e3036' },
  },
  hopper: {
    rust:  { name: 'Rust',  fur: '#b9532c', belly: '#e2b18a', mark: '#8a3418', ear: '#f0b090', feet: '#4a1a10' },
    moss:  { name: 'Moss',  fur: '#5e8a3a', belly: '#dfe8a8', mark: '#3a5a20', ear: '#f4d080', feet: '#2a3a14' },
    plum:  { name: 'Plum',  fur: '#7a3a7a', belly: '#f0c0d8', mark: '#4e2050', ear: '#ffa0c8', feet: '#2e1430' },
    snow:  { name: 'Snow',  fur: '#e4e8ee', belly: '#a8c4e0', mark: '#7a90b0', ear: '#ffb0a0', feet: '#4a5466' },
    gold:  { name: 'Gold',  fur: '#d89a2a', belly: '#f6e4b0', mark: '#2e2a26', ear: '#3a3430', feet: '#3a2a14' },
  },
  crab: {
    rock:  { name: 'Rock',  shell: '#958a84', under: '#5a4a46', crystal: '#b05cff', claw: '#b07a4a' },
    sand:  { name: 'Sand',  shell: '#c8a878', under: '#6a5440', crystal: '#40d8c8', claw: '#e0703a' },
    coal:  { name: 'Coal',  shell: '#3e3a40', under: '#2a2628', crystal: '#ff8a30', claw: '#c4c0b8' },
    frost: { name: 'Frost', shell: '#a8c8dc', under: '#4a5e70', crystal: '#ff70b0', claw: '#e8eef4' },
  },
  jelly: {
    ice:   { name: 'Ice',   bell: '#9fe0f2', core: '#fff4b0', tip: '#ffe890', eyes: '#163044' },
    pink:  { name: 'Pink',  bell: '#f4a8d4', core: '#b0fff0', tip: '#90ffe0', eyes: '#4a1a3a' },
    lime:  { name: 'Lime',  bell: '#bef07a', core: '#e0b0ff', tip: '#d8a0ff', eyes: '#24401a' },
    amber: { name: 'Amber', bell: '#ffc070', core: '#ff7050', tip: '#ff9060', eyes: '#4a2410' },
  },
  trader: {
    dusk:  { name: 'Dusk',  skin: '#8f86c8', cloth: '#d08a4a', band: '#2e6a6a', light: '#f0e0b0', crate: '#9a7448' },
    mint:  { name: 'Mint',  skin: '#7ac8a8', cloth: '#7a3a6a', band: '#f0c24a', light: '#f8e8d0', crate: '#6a7078' },
    sky:   { name: 'Sky',   skin: '#6a90d0', cloth: '#c0443a', band: '#f0e0b0', light: '#2e2a3a', crate: '#8e6a40' },
    coral: { name: 'Coral', skin: '#e08a7a', cloth: '#2e3a6a', band: '#f0c24a', light: '#e8eef4', crate: '#5a4636' },
  },
};
const pickLook = (id, look) => COLOURS[id][look] || Object.values(COLOURS[id])[0];

// ---------------------------------------------------------------- Hopper (Mars critter)
export function makeHopper(look) {
  const C = pickLook('hopper', look);
  const root = new THREE.Group(); const rig = {};
  const fur = tones(C.fur), belly = tones(C.belly);
  const body = new THREE.Group(); root.add(body); rig.body = body;
  const trunk = box(10, 8, 11, (face, i, j, fw, fh) => {
    if (face === 'bottom') return pick(belly, hash(i, j, 80));
    if (face === 'front') {
      // one big eye
      if (i >= 3 && i <= 6 && j >= 1 && j <= 4) {
        if ((i === 4 || i === 5) && (j === 2 || j === 3)) return (i === 4 && j === 2) ? '#ffffff' : '#1a1418';
        return '#f4efe6';
      }
      if (j === 6 && (i === 4 || i === 5)) return shade(C.feet, 1.2);   // little mouth
      if (j >= 5) return pick(belly, hash(i, j, 81));
    }
    if ((face === 'right' || face === 'left') && j >= 6) return pick(belly, hash(i, j, 82));
    if (face === 'top' && j >= 3 && j <= 8 && (i === 4 || i === 5) && j % 2) return C.mark; // back stripes
    if ((face === 'right' || face === 'left') && j === 2 && i % 3 === 1) return C.mark;     // side spots
    return pick(fur, hash(i, j, 83));
  });
  part(body, trunk, 0, 7, 0);
  for (const s of [-1, 1]) {
    const ear = box(2, 5, 1, (face, i, j) => (j < 2 ? C.ear : pick(fur, hash(i, j, 84))));
    const e = part(body, ear, s * 3, 11, -2, 0, 2.5, 0); e.rotation.x = -0.5; e.rotation.z = -s * 0.25;
    rig[s < 0 ? 'earL' : 'earR'] = e;
    const back = box(3, 5, 6, (face, i, j) => (j === 4 ? C.feet : pick(fur, hash(i, j, 85 + s))));
    rig[s < 0 ? 'backL' : 'backR'] = part(root, back, s * 5.5, 5, -2.5, 0, -2.5, 0);
    const front = box(2, 3, 2, (face, i, j) => (j === 2 ? C.feet : pick(belly, hash(i, j, 87))));
    rig[s < 0 ? 'frontL' : 'frontR'] = part(root, front, s * 3, 3, 4, 0, -1.5, 0);
  }
  const tail = box(2, 2, 3, (face, i, j) => pick(belly, hash(i, j, 88)));
  part(body, tail, 0, 8, -6.5);
  root.userData = { rig, kind: 'hopper', height: 12 * PX };
  return root;
}

// ---------------------------------------------------------------- Rock crab (lives in craters, crystals grow on its back)
export function makeRockCrab(look) {
  const C = pickLook('crab', look);
  const root = new THREE.Group(); const rig = {};
  const rock = tones(C.shell), under = tones(C.under);
  const body = new THREE.Group(); root.add(body); rig.body = body;
  const shell = box(14, 5, 12, (face, i, j, fw, fh) => {
    if (face === 'bottom') return pick(under, hash(i, j, 90));
    if (face !== 'top' && j === fh - 1) return shade(C.shell, 0.62);
    if (face === 'top' && (i === 0 || j === 0 || i === fw - 1 || j === fh - 1)) return shade(C.shell, 0.74);
    if (face === 'top' && hash(i, j, 91) > 0.9) return shade(C.shell, 1.2);  // light speckles
    if (face === 'front' && j === 3 && i >= 4 && i <= 9) return shade(C.under, 0.6); // mouth line
    return pick(rock, hash(Math.floor(i / 2), Math.floor(j / 2), 92));
  });
  part(body, shell, 0, 5.5, 0);
  const crystalP = [C.crystal, L(C.crystal, 1.3), shade(C.crystal, 0.8)];
  [[-3, 4, -1, 2, 5], [2, 3, 2, 2, 4], [4, 2, -3, 1, 3]].forEach(([x, h, z, w, s], k) => {
    const c = box(w, h, w, (face, i, j) => (j === 0 ? [L(C.crystal, 1.6), '#ffffff'] : [pick(crystalP, hash(i, j, 93 + k)), C.crystal]), { glow: 0.9 });
    const g = part(body, c, x, 8, z, 0, h / 2, 0); g.rotation.z = (k - 1) * 0.25; g.rotation.x = (k % 2 ? 0.2 : -0.15);
  });
  rig.legs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const leg = box(5, 2, 2, (face, i, j) => (i === (s > 0 ? 4 : 0) ? shade(C.under, 0.6) : pick(under, hash(i, j, 95 + k))));
    const g = part(root, leg, s * 7, 4, -3 + k * 3, s * 2.5, 0, 0); g.rotation.z = -s * 0.5;
    g.userData.side = s; g.userData.k = k; rig.legs.push(g);
  }
  const clawP = tones(C.claw);
  for (const s of [-1, 1]) {
    const claw = box(4, 3, 4, (face, i, j) => (face === 'front' && j === 1 ? '#2a201e' : (j === 0 ? L(C.claw, 1.15) : pick(clawP, hash(i, j, 97)))));
    rig[s < 0 ? 'clawL' : 'clawR'] = part(body, claw, s * 5, 5, 7.5);
    const stalk = box(1, 3, 1, () => C.under);
    part(body, stalk, s * 2, 8, 5, 0, 1.5, 0);
    const eye = box(2, 2, 2, (face, i, j) => (face === 'front' ? (i === 0 && j === 0 ? '#ffffff' : '#141014') : '#e8e0d0'));
    part(body, eye, s * 2, 11, 5, 0, 1, 0);
  }
  root.userData = { rig, kind: 'crab', height: 13 * PX };
  return root;
}

// ---------------------------------------------------------------- Glow jelly (floats over ice on Europa)
export function makeGlowJelly(look) {
  const C = pickLook('jelly', look);
  const root = new THREE.Group(); const rig = {};
  const float = new THREE.Group(); root.add(float); rig.body = float;
  const ice = tones(C.bell);
  const rim = L(C.bell, 1.25);
  const bell = box(12, 9, 12, (face, i, j, fw, fh) => {
    if (face === 'front' && j === 4 && (i === 3 || i === 8)) return C.eyes;
    if (face === 'front' && j === 6 && i >= 5 && i <= 6) return C.eyes;
    if (face !== 'top' && face !== 'bottom' && j === fh - 1) return [rim, C.bell];
    if (face === 'top' && ((i + j) % 5 === 0)) return [rim, shade(C.bell, 0.8)];
    return pick(ice, hash(i, j, 100));
  }, { opacity: 0.82, glow: 0.6 });
  part(float, bell, 0, 18.5, 0);
  const core = box(6, 4, 6, () => [C.core, shade(C.core, 0.9)], { glow: 1.3 });
  part(float, core, 0, 18, 0);
  rig.strands = [];
  [[-4, -4], [4, -4], [-4, 4], [4, 4], [0, 0]].forEach(([x, z], k) => {
    const strand = new THREE.Group(); strand.position.set(x * PX, 14 * PX, z * PX); float.add(strand);
    let parent = strand;
    const n = k === 4 ? 5 : 4;
    for (let s = 0; s < n; s++) {
      const b = box(2, 2, 2, () => (s === n - 1 ? [C.tip, shade(C.tip, 0.85)] : pick(ice, hash(s, k, 101))), { opacity: 0.85 });
      parent = part(parent, b, 0, s === 0 ? -1 : -2.2, 0);
    }
    rig.strands.push(strand);
  });
  root.userData = { rig, kind: 'jelly', height: 23 * PX };
  return root;
}

// ---------------------------------------------------------------- Trader (a local who swaps goods)
export function makeTrader(look) {
  const C = pickLook('trader', look);
  const root = new THREE.Group(); const rig = {};
  const skin = tones(C.skin), cloth = tones(C.cloth), band = [C.band, shade(C.band, 0.9)];
  const boots = '#3a2a24';
  for (const s of [-1, 1]) {
    const leg = box(3, 11, 3, (face, i, j) => (j >= 9 ? boots : pick(skin, hash(i, j, 110))));
    rig[s < 0 ? 'legL' : 'legR'] = part(root, leg, s * 2.5, 11, 0, 0, -5.5, 0);
  }
  const body = box(9, 10, 6, (face, i, j) => pick(cloth, hash(i, j, 111)));
  part(root, body, 0, 16, 0);
  // a striped poncho over the shoulders
  const poncho = box(13, 8, 8, (face, i, j, fw, fh) => {
    if (j === fh - 1) return (i % 2 ? C.light : band[0]);                         // fringe
    if (j === 2 || j === 5) return pick(band, hash(i, j, 112));
    if ((j === 3 || j === 4) && i % 4 === 1) return C.light;                       // little diamonds
    if (face === 'top' && i >= 5 && i <= 7 && j >= 2 && j <= 5) return boots;
    return pick(cloth, hash(i, j, 113));
  });
  part(root, poncho, 0, 19.5, 0);
  for (const s of [-1, 1]) {
    const arm = box(2, 11, 2, (face, i, j) => (j < 4 ? pick(cloth, hash(i, j, 114)) : pick(skin, hash(i, j, 115))));
    rig[s < 0 ? 'armL' : 'armR'] = part(root, arm, s * 6, 22, 0, 0, -5.5, 0);
  }
  const neck = box(3, 4, 3, (face, i, j) => pick(skin, hash(i, j, 116)));
  part(root, neck, 0, 25, 0);
  const head = new THREE.Group(); head.position.set(0, 27 * PX, 0); root.add(head); rig.head = head;
  const skull = box(10, 7, 9, (face, i, j, fw, fh) => {
    if (face === 'front') {
      if ((i === 2 || i === 3 || i === 6 || i === 7) && j >= 2 && j <= 4) {
        if ((i === 3 || i === 6) && j === 3) return '#141018';
        if ((i === 2 || i === 7) && j === 2) return '#ffffff';
        return '#f6e9c8';
      }
      if (j === 0 && i >= 4 && i <= 5) return ['#ffd060', '#ffb020'];          // glowing forehead dot
      if (j === 6 && i >= 3 && i <= 6) return shade(C.skin, 0.62);
    }
    return pick(skin, hash(i, j, 117));
  });
  part(head, skull, 0, 3.5, 0);
  for (const s of [-1, 1]) {
    const fin = box(1, 5, 4, (face, i, j) => (j === 0 ? L(C.skin, 1.3) : pick([shade(C.skin, 0.78), shade(C.skin, 0.84)], hash(i, j, 118))));
    const f = part(head, fin, s * 5.5, 4, -1); f.rotation.z = -s * 0.3;
  }
  // a crate on the back with a little lamp
  const crateP = tones(C.crate);
  const crate = box(8, 10, 5, (face, i, j, fw, fh) => {
    if (i === 0 || j === 0 || i === fw - 1 || j === fh - 1) return shade(C.crate, 0.62);
    if (face !== 'top' && (i === j || i === fw - 1 - j)) return shade(C.crate, 0.74);
    return pick(crateP, hash(i, j, 119));
  });
  part(root, crate, 0, 19, -6.5);
  const lamp = box(2, 2, 2, () => ['#ffe0a0', '#ffc050'], { glow: 1.4 });
  part(root, lamp, 3, 25, -6.5);
  root.userData = { rig, kind: 'trader', height: 34 * PX };
  return root;
}

// ---------------------------------------------------------------- Buddy (your little helper robot)
export function makeBuddy(look) {
  const C = pickLook('buddy', look);
  const root = new THREE.Group(); const rig = {};
  const float = new THREE.Group(); root.add(float); rig.body = float;
  const metal = tones(C.metal), eye = [C.eyes, C.eyes];
  const shell = box(8, 7, 8, (face, i, j, fw, fh) => {
    if (face === 'front' && i >= 1 && i <= 6 && j >= 1 && j <= 4) {
      if (j === 1 && (i === 2 || i === 5)) return eye;
      if (j === 2 && (i === 1 || i === 3 || i === 4 || i === 6)) return eye;
      return C.screen;
    }
    if (j === fh - 1 && face !== 'top') return C.trim;
    return pick(metal, hash(i, j, 120));
  });
  part(float, shell, 0, 17.5, 0);
  const mast = box(1, 2, 1, () => C.parts); part(float, mast, 0, 22, 0);
  const rotor = new THREE.Group(); rotor.position.set(0, 23.5 * PX, 0); float.add(rotor); rig.rotor = rotor;
  rotor.add(box(12, 1, 2, (face, i) => (i < 2 || i > 9 ? C.trim : C.parts)));
  for (const s of [-1, 1]) {
    const jet = box(2, 2, 2, (face) => (face === 'bottom' ? ['#ffb060', '#ff8020'] : C.parts));
    part(float, jet, s * 3, 13, 0);
  }
  root.userData = { rig, kind: 'buddy', height: 24 * PX };
  return root;
}

// Ready-made mixes for the line-up: one colour for each character that look good together.
export const MIXES = {
  first:  { name: 'Original', pick: { pilot: 'sand', buddy: 'silver', hopper: 'rust', crab: 'rock', jelly: 'ice', trader: 'dusk' } },
  bright: { name: 'Bright',   pick: { pilot: 'sun', buddy: 'mint', hopper: 'plum', crab: 'sand', jelly: 'lime', trader: 'sky' } },
  cool:   { name: 'Cool',     pick: { pilot: 'frost', buddy: 'coal', hopper: 'snow', crab: 'frost', jelly: 'pink', trader: 'mint' } },
  warm:   { name: 'Warm',     pick: { pilot: 'berry', buddy: 'copper', hopper: 'gold', crab: 'coal', jelly: 'amber', trader: 'coral' } },
};

// ================================================================ rewarding finds (harmless, they give you things)
Object.assign(COLOURS, {
  snail: {
    purple: { name: 'Purple', gem: '#b05cff', body: '#c8b8a0' },
    green:  { name: 'Green',  gem: '#3ee08a', body: '#a8b4a0' },
    gold:   { name: 'Gold',   gem: '#ffc23a', body: '#d8c4a4' },
    blue:   { name: 'Blue',   gem: '#4aaeff', body: '#b8c2d0' },
  },
  beetle: {
    gold:  { name: 'Gold',      shell: '#e8b030', body: '#3a2a14' },
    rose:  { name: 'Rose gold', shell: '#e89a80', body: '#3a2026' },
    silver:{ name: 'Silver',    shell: '#c8d0d8', body: '#2a2e36' },
    jade:  { name: 'Jade',      shell: '#3eb07e', body: '#14281e' },
  },
  moth: {
    moon:  { name: 'Moon',  wing: '#e8e4d0', spot: '#60e0ff', body: '#9a9488' },
    ember: { name: 'Ember', wing: '#e0703a', spot: '#ffe060', body: '#6a3020' },
    night: { name: 'Night', wing: '#3e3e70', spot: '#ff80c8', body: '#24243e' },
    leaf:  { name: 'Leaf',  wing: '#8ac060', spot: '#ffffff', body: '#4a6a30' },
  },
  mole: {
    cocoa: { name: 'Cocoa', fur: '#6a4a3a', hat: '#f0c24a' },
    ash:   { name: 'Ash',   fur: '#7a7a82', hat: '#e0703a' },
    sand:  { name: 'Sand',  fur: '#c8a070', hat: '#4e9690' },
    rust:  { name: 'Rust',  fur: '#a8502a', hat: '#d6e4ee' },
  },
  dragon: {
    mars:       { name: 'Dust dragon', world: 'Mars', body: '#8a3a22', crack: '#ff9a50', belly: '#d8a070', horn: '#e8d0b0', wing: '#c06a40', horns: 'ears', wings: 'wide', cracks: 0.5, stripes: true, note: 'Mars. Hides in red dust storms. Huge wide wings and big ears to hear you coming.' },
    moon:       { name: 'Crater dragon', world: 'The Moon', body: '#6a6a70', crack: '#f0f0ff', belly: '#a8a6a0', horn: '#d8d6d0', eye: '#60e0ff', legH: 28, legW: 12, wings: 'small', cracks: 0, pits: true, back: 'plates', note: 'The Moon. Long strong legs for giant low-gravity jumps. Its skin is covered in little craters.' },
    europa:     { name: 'Ice dragon', world: 'Europa', body: '#4a7a96', crack: '#70f0ff', belly: '#d8eef6', horn: '#c8f8ff', horns: 'ice', wings: 'wide', cracks: 0.8, note: 'Europa. Breaks up through the ice. Glowing crystal horns and spikes.' },
    proxima:    { name: 'Red sun dragon', world: 'Proxima b', body: '#3a1418', crack: '#ff4a2a', belly: '#7a3030', horn: '#ffb080', horns: 'crest', wings: 'wide', cracks: 1.3, note: 'Proxima b. Glows brighter when the red star flares, with a crest like sun rays.' },
    trappist1e: { name: 'Sea dragon', world: 'TRAPPIST-1e', body: '#1e4a4a', crack: '#40e0b0', belly: '#a0c8b0', horn: '#d0e8d8', wings: 'fins', back: 'fin', tail: 'long', neck: 26, neckTilt: 0.35, cracks: 0.4, stripes: true, note: 'TRAPPIST-1e. Rises out of the frozen sea. Fins instead of wings and a long swimming tail.' },
    lhs1140b:   { name: 'Stone dragon', world: 'LHS 1140 b', body: '#5a5a5e', crack: '#ffd060', belly: '#9a968e', horn: '#e8e2d4', horns: 'big', wings: 'none', legW: 13, bodyW: 34, neck: 12, neckTilt: 0.3, tail: 'club', back: 'plates', cracks: 0.25, note: 'LHS 1140 b. Gravity is so strong it cannot fly. Slow and very heavy, with a club tail.' },
  },

});
Object.assign(MIXES.first.pick, { snail: 'purple', beetle: 'gold', moth: 'moon', mole: 'cocoa', dragon: 'mars' });
Object.assign(MIXES.bright.pick, { snail: 'green', beetle: 'jade', moth: 'leaf', mole: 'sand', dragon: 'proxima' });
Object.assign(MIXES.cool.pick, { snail: 'blue', beetle: 'silver', moth: 'night', mole: 'ash', dragon: 'europa' });
Object.assign(MIXES.warm.pick, { snail: 'gold', beetle: 'rose', moth: 'ember', mole: 'rust', dragon: 'moon' });

// ---------------------------------------------------------------- Gem snail (its shell is a gem; leaves crystal bits behind)
export function makeGemSnail(look) {
  const C = pickLook('snail', look);
  const root = new THREE.Group(); const rig = {};
  const body = new THREE.Group(); root.add(body); rig.body = body;
  const skin = tones(C.body);
  const foot = box(5, 3, 13, (face, i, j) => (face === 'bottom' ? shade(C.body, 0.8) : pick(skin, hash(i, j, 130))));
  part(body, foot, 0, 1.5, 0);
  const head = box(5, 5, 3, (face, i, j) => {
    if (face === 'front' && j === 3 && i >= 1 && i <= 3) return shade(C.body, 0.55); // smile
    return pick(skin, hash(i, j, 131));
  });
  part(body, head, 0, 4.5, 5.5);
  for (const s of [-1, 1]) {
    const stalk = box(1, 4, 1, () => shade(C.body, 0.9));
    const g = part(body, stalk, s * 1.5, 7, 6, 0, 2, 0); g.rotation.z = -s * 0.25;
    const eye = box(2, 2, 2, (face, i, j) => (face === 'front' && i === 0 && j === 0 ? '#ffffff' : '#141014'));
    part(g, eye, 0, 4.5, 0);
    rig[s < 0 ? 'eyeL' : 'eyeR'] = g;
  }
  // the gem shell: cut faces with light edges, glowing a little
  const gp = [C.gem, L(C.gem, 1.25), shade(C.gem, 0.8)];
  const shell = box(9, 9, 9, (face, i, j, fw, fh) => {
    const d = Math.min(i, j, fw - 1 - i, fh - 1 - j);
    if (d === 0) return [L(C.gem, 1.5), C.gem];
    if (i === j || i === fw - 1 - j) return [L(C.gem, 1.7), L(C.gem, 1.2)];
    return [pick(gp, (d + (i > j ? 1 : 0)) / 3), shade(C.gem, 0.5)];
  }, { glow: 0.7 });
  const sg = part(body, shell, 0, 7.5, -1.5); sg.rotation.y = Math.PI / 4; rig.shell = sg;
  root.userData = { rig, kind: 'snail', height: 13 * PX };
  return root;
}

// ---------------------------------------------------------------- Gold beetle (runs off when it sees you; catch it for gold)
export function makeGoldBeetle(look) {
  const C = pickLook('beetle', look);
  const root = new THREE.Group(); const rig = {};
  const body = new THREE.Group(); root.add(body); rig.body = body;
  const metal = [C.shell, L(C.shell, 1.2), shade(C.shell, 0.85), L(C.shell, 1.45)];
  const under = box(8, 3, 10, (face, i, j) => pick(tones(C.body), hash(i, j, 140)));
  part(body, under, 0, 3, 0);
  for (const s of [-1, 1]) {
    const wing = box(4, 3, 10, (face, i, j, fw, fh) => {
      if (face === 'top' && (i + j) % 7 === 0) return '#ffffff';                     // shine
      if (face === 'top' && i === (s < 0 ? 3 : 0)) return shade(C.shell, 0.6);        // centre line
      return pick(metal, hash(i, Math.floor(j / 2), 141));
    });
    rig[s < 0 ? 'wingL' : 'wingR'] = part(body, wing, s * 2, 6, -4.5, 0, 0, 4.5);
  }
  const head = box(6, 4, 3, (face, i, j) => {
    if (face === 'front' && j === 1 && (i === 1 || i === 4)) return '#ffffff';
    return pick(tones(C.body), hash(i, j, 142));
  });
  part(body, head, 0, 4, 6.5);
  for (const s of [-1, 1]) {
    const ant = box(1, 5, 1, (face, i, j) => (j === 0 ? C.shell : C.body));
    const a = part(body, ant, s * 2, 6, 7.5, 0, 2.5, 0); a.rotation.x = 0.6; a.rotation.z = -s * 0.4;
  }
  rig.legs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const leg = box(4, 1, 1, () => shade(C.body, 0.8));
    const g = part(root, leg, s * 4, 2.5, -3 + k * 3, s * 2, 0, 0); g.rotation.z = -s * 0.6;
    g.userData.side = s; g.userData.k = k; rig.legs.push(g);
  }
  root.userData = { rig, kind: 'beetle', height: 10 * PX };
  return root;
}

// ---------------------------------------------------------------- Lucky moth (comes out at night; follow it to a treasure box)
export function makeLuckyMoth(look) {
  const C = pickLook('moth', look);
  const root = new THREE.Group(); const rig = {};
  const float = new THREE.Group(); root.add(float); rig.body = float;
  const fuzz = tones(C.body);
  const body = box(3, 3, 8, (face, i, j) => pick(fuzz, hash(i, j, 150)));
  part(float, body, 0, 16, 0);
  const head = box(3, 3, 2, (face, i, j) => (face === 'front' && j === 1 && (i === 0 || i === 2) ? ['#1a1418', '#000000'] : pick(fuzz, hash(i, j, 151))));
  part(float, head, 0, 16.5, 5);
  for (const s of [-1, 1]) {
    const ant = box(1, 1, 4, () => C.wing);
    const a = part(float, ant, s * 1, 18, 6, 0, 0, 2); a.rotation.x = -0.6; a.rotation.y = s * 0.4;
  }
  const wp = tones(C.wing);
  const paint = (big) => (face, i, j, fw, fh) => {
    const cx = big ? fw * 0.55 : fw * 0.5, cy = fh * 0.5, dx = Math.abs(i + 0.5 - cx), dy = Math.abs(j + 0.5 - cy);
    if (dx + dy < (big ? 1.6 : 1.1)) return [L(C.spot, 1.2), C.spot];             // glowing eye spot
    if (dx + dy < (big ? 2.8 : 2.2)) return shade(C.wing, 0.55);
    if (i === 0 || j === 0 || i === fw - 1 || j === fh - 1) return shade(C.wing, 0.7);
    return pick(wp, hash(i, j, 152));
  };
  rig.wings = [];
  for (const s of [-1, 1]) {
    const up = box(10, 1, 7, paint(true), { glow: 1 });
    const g1 = part(float, up, s * 1.5, 17, 1.5, s * 5, 0, 0); g1.userData.side = s; rig.wings.push(g1);
    const lo = box(7, 1, 5, paint(false), { glow: 1 });
    const g2 = part(float, lo, s * 1.5, 16.8, -3, s * 3.5, 0, 0); g2.userData.side = s; g2.userData.lag = 0.3; rig.wings.push(g2);
  }
  root.userData = { rig, kind: 'moth', height: 20 * PX };
  return root;
}

// ---------------------------------------------------------------- Digger mole (pops out of the ground; where it digs, there is ore)
export function makeDiggerMole(look) {
  const C = pickLook('mole', look);
  const root = new THREE.Group(); const rig = {};
  const body = new THREE.Group(); root.add(body); rig.body = body;
  const fur = tones(C.fur), pink = '#f0a8a0';
  const trunk = box(10, 8, 10, (face, i, j) => {
    if (face === 'front' && j === 3 && (i === 3 || i === 6)) return '#141014';     // tiny eyes
    if (face === 'front' && j >= 5 && i >= 2 && i <= 7) return L(C.fur, 1.35);     // light chin
    return pick(fur, hash(i, j, 160));
  });
  part(body, trunk, 0, 5, 0);
  const snout = box(4, 3, 3, (face, i, j) => (face === 'front' && j === 1 && i >= 1 && i <= 2 ? '#a04050' : pink));
  part(body, snout, 0, 4.5, 6.5);
  // a little miner's hat with a lamp
  const hat = box(8, 3, 8, (face, i, j, fw, fh) => (j === fh - 1 && face !== 'top' ? shade(C.hat, 0.7) : pick(tones(C.hat), hash(i, j, 161))));
  part(body, hat, 0, 10.5, -0.5);
  const lamp = box(3, 3, 1, () => ['#fff4c0', '#ffe080'], { glow: 1.5 });
  part(body, lamp, 0, 10.5, 4); rig.lamp = lamp;
  for (const s of [-1, 1]) {
    const paw = box(4, 2, 5, (face, i, j) => (face === 'front' ? (i % 2 ? '#e0d8c8' : pink) : pink));
    rig[s < 0 ? 'pawL' : 'pawR'] = part(body, paw, s * 5.5, 3, 4, s * 1, 0, 1);
  }
  root.userData = { rig, kind: 'mole', height: 12 * PX };
  return root;
}

// ---------------------------------------------------------------- three more finds: Dust puff, Ice fish, Sky ray
Object.assign(COLOURS, {
  puff: {
    rust:  { name: 'Rust',  fluff: '#d8805a', eyes: '#2a1410' },
    cream: { name: 'Cream', fluff: '#f0e4d0', eyes: '#3a2a20' },
    lilac: { name: 'Lilac', fluff: '#c8a8e8', eyes: '#2a1a3a' },
    mint:  { name: 'Mint',  fluff: '#a8e8c8', eyes: '#14302a' },
  },
  fish: {
    blue:   { name: 'Blue',          body: '#4a90c8', fin: '#9ad8ff', belly: '#d8eef8' },
    silver: { name: 'Silver',        body: '#a8b4c0', fin: '#e0f0ff', belly: '#f0f4f8' },
    golden: { name: 'Golden (rare)', body: '#e8b030', fin: '#fff0a0', belly: '#fff4d0' },
    coral:  { name: 'Coral',         body: '#e8706a', fin: '#ffd0b0', belly: '#fff0e8' },
  },
  ray: {
    dusk:  { name: 'Dusk',  top: '#3a3a6e', under: '#c8c0e0', spot: '#80e0ff' },
    sand:  { name: 'Sand',  top: '#a87a50', under: '#f0e0c8', spot: '#ffe070' },
    sea:   { name: 'Sea',   top: '#2a6a6a', under: '#d0f0e8', spot: '#a0ffd0' },
    rose:  { name: 'Rose',  top: '#8a3a5a', under: '#f8d0e0', spot: '#ffb0f0' },
  },
});
Object.assign(MIXES.first.pick, { puff: 'rust', fish: 'blue', ray: 'dusk' });
Object.assign(MIXES.bright.pick, { puff: 'mint', fish: 'golden', ray: 'sand' });
Object.assign(MIXES.cool.pick, { puff: 'lilac', fish: 'silver', ray: 'sea' });
Object.assign(MIXES.warm.pick, { puff: 'cream', fish: 'coral', ray: 'rose' });

export function makeDustPuff(look) {
  const C = pickLook('puff', look);
  const root = new THREE.Group(); const rig = {};
  const float = new THREE.Group(); root.add(float); rig.body = float;
  const fl = tones(C.fluff);
  const core = box(8, 8, 8, (face, i, j) => {
    if (face === 'front' && j === 3 && (i === 2 || i === 5)) return C.eyes;
    if (face === 'front' && j === 5 && (i === 3 || i === 4)) return shade(C.fluff, 0.7);
    if (face === 'front' && j === 4 && (i === 1 || i === 6)) return '#f0a0a0';         // pink cheeks
    return pick(fl, hash(i, j, 190));
  });
  part(float, core, 0, 7, 0);
  // fluffy outer layer, see-through and dotty
  const fluff = box(11, 11, 11, (face, i, j) => (hash(i, j, 191) > 0.5 ? L(C.fluff, 1.15) : shade(C.fluff, 0.9)), { opacity: 0.45 });
  part(float, fluff, 0, 7, 0); rig.fluff = fluff;
  root.userData = { rig, kind: 'puff', height: 13 * PX };
  return root;
}

export function makeIceFish(look) {
  const C = pickLook('fish', look);
  const root = new THREE.Group(); const rig = {};
  const swim = new THREE.Group(); root.add(swim); rig.body = swim;
  const sc = tones(C.body);
  const body = box(4, 7, 11, (face, i, j, fw, fh) => {
    if ((face === 'right' || face === 'left') && j === 2 && ((face === 'right' ? fw - 1 - i : i) === 2)) return '#141014';  // eye
    if ((face === 'right' || face === 'left') && ((face === 'right' ? fw - 1 - i : i) === 2) && j === 1) return '#ffffff';
    if (j >= 5) return pick(tones(C.belly), hash(i, j, 200));
    if ((i + j) % 4 === 0) return L(C.body, 1.25);                                  // scales
    return pick(sc, hash(i, j, 201));
  }, C.name.startsWith('Golden') ? { glow: 0.4 } : {});
  part(swim, body, 0, 8, 0);
  const finP = (face, i, j) => [L(C.fin, 1.05), shade(C.fin, 0.3)];
  const tail = part(swim, box(1, 8, 5, finP, { opacity: 0.85 }), 0, 8, -5.5, 0, 0, -2.5); rig.tail = tail;
  part(swim, box(1, 3, 6, finP, { opacity: 0.85 }), 0, 12, -1);
  for (const s of [-1, 1]) {
    const f = part(swim, box(3, 1, 3, finP, { opacity: 0.85 }), s * 2, 7, 1, s * 1.5, 0, 0); rig[s < 0 ? 'finL' : 'finR'] = f;
  }
  root.userData = { rig, kind: 'fish', height: 13 * PX };
  return root;
}

export function makeSkyRay(look) {
  const C = pickLook('ray', look);
  const root = new THREE.Group(); const rig = {};
  const fly = new THREE.Group(); root.add(fly); rig.body = fly;
  fly.rotation.x = 0.3;
  const top = tones(C.top);
  const paint = (face, i, j, fw, fh) => {
    if (face === 'bottom') return C.under;
    if (face === 'top' && hash(Math.floor(i / 2), Math.floor(j / 2), 210) > 0.85) return [C.spot, C.spot];
    return pick(top, hash(i, j, 211));
  };
  const body = box(10, 3, 14, (face, i, j, fw, fh) => {
    if (face === 'front' && j === 1 && (i === 2 || i === 7)) return '#ffffff';
    return paint(face, i, j, fw, fh);
  }, { glow: 1 });
  part(fly, body, 0, 26, 0);
  rig.wings = [];
  for (const s of [-1, 1]) {
    const w = part(fly, box(12, 1, 11, paint, { glow: 1 }), s * 5, 26, 0, s * 6, 0, 0); w.userData.side = s; rig.wings.push(w);
    const tip = part(w, box(6, 1, 6, paint, { glow: 1 }), s * 12, 0, -1, s * 3, 0, 0); tip.userData.side = s; w.userData.tip = tip;
  }
  for (const s of [-1, 1]) part(fly, box(2, 2, 3, () => C.top), s * 3, 26, 8);   // little horns at the front
  const tail = new THREE.Group(); tail.position.set(0, 26 * PX, -7 * PX); fly.add(tail);
  let parent = tail;
  for (let k = 0; k < 4; k++) parent = part(parent, box(1, 1, 4, () => (k === 3 ? [C.spot, C.spot] : C.top), { glow: 1 }), 0, 0, k === 0 ? 0 : -4, 0, 0, -2);
  rig.tail = tail;
  root.userData = { rig, kind: 'ray', height: 28 * PX };
  return root;
}

// ---------------------------------------------------------------- two more finds: Crater bunny, Lost robot
Object.assign(COLOURS, {
  bunny: {
    grey:  { name: 'Grey',  fur: '#a8a6a2', spot: '#6e6c68', tuft: '#c8f0ff' },
    cream: { name: 'Cream', fur: '#ece0c8', spot: '#b8a888', tuft: '#ffe890' },
    dusk:  { name: 'Dusk',  fur: '#6a6488', spot: '#46405e', tuft: '#ffb0f0' },
    pearl: { name: 'Pearl', fur: '#e8ecf2', spot: '#b0bccc', tuft: '#a0ffd0' },
  },
  robot: {
    rusty: { name: 'Rusty', metal: '#9a6a48', rust: '#6a3a22', screen: '#7dffb0', patch: '#c8ccd0' },
    blue:  { name: 'Blue',  metal: '#5a7ab0', rust: '#8a5a3a', screen: '#ffd060', patch: '#e0703a' },
    green: { name: 'Green', metal: '#6a9a6a', rust: '#7a5a30', screen: '#80e0ff', patch: '#e8e0c8' },
    white: { name: 'White', metal: '#d8d8d4', rust: '#9a7a5a', screen: '#ff8aa0', patch: '#4e9690' },
  },
});
Object.assign(MIXES.first.pick, { bunny: 'grey', robot: 'rusty' });
Object.assign(MIXES.bright.pick, { bunny: 'cream', robot: 'blue' });
Object.assign(MIXES.cool.pick, { bunny: 'pearl', robot: 'white' });
Object.assign(MIXES.warm.pick, { bunny: 'dusk', robot: 'green' });

// Crater bunny: lives in Moon craters, huge springy feet for low gravity. Its den holds moon rocks.
export function makeCraterBunny(look) {
  const C = pickLook('bunny', look);
  const root = new THREE.Group(); const rig = {};
  const body = new THREE.Group(); root.add(body); rig.body = body;
  const fur = tones(C.fur);
  const furP = (seed) => (face, i, j) => (hash(Math.floor(i / 2), Math.floor(j / 2), seed + 1) > 0.88 ? C.spot : pick(fur, hash(i, j, seed)));
  part(body, box(7, 6, 9, furP(220)), 0, 5, -1);
  const head = new THREE.Group(); head.position.set(0, 7 * PX, 4 * PX); body.add(head); rig.head = head;
  part(head, box(6, 6, 5, (face, i, j) => {
    if (face === 'front') {
      if (j === 2 && (i === 1 || i === 4)) return '#141014';
      if (j === 1 && (i === 1 || i === 4)) return '#ffffff';
      if (j === 4 && (i === 2 || i === 3)) return '#f0a0a8';                    // nose
      if (j === 3 && (i === 0 || i === 5)) return '#f0c0c0';                    // cheeks
    }
    return furP(221)(face, i, j);
  }), 0, 2, 1.5);
  for (const s of [-1, 1]) {
    const ear = part(head, box(2, 9, 1, (face, i, j) => (face === 'front' && i === 0 && j > 1 && j < 8 ? '#f0c0c0' : pick(fur, hash(i, j, 222)))), s * 1.5, 5, 0, 0, 4.5, 0);
    ear.rotation.z = -s * 0.2; ear.rotation.x = -0.2; rig[s < 0 ? 'earL' : 'earR'] = ear;
    rig[s < 0 ? 'footL' : 'footR'] = part(root, box(3, 2, 8, (face, i, j) => (face === 'bottom' ? C.spot : pick(fur, hash(i, j, 223)))), s * 3, 2, -1, 0, -1, 1);
    part(body, box(2, 3, 2, (face, i, j) => pick(fur, hash(i, j, 224))), s * 2, 2.5, 3);
  }
  const tail = part(body, box(3, 3, 3, () => [L(C.tuft, 1.1), C.tuft], { glow: 0.9 }), 0, 6, -6); rig.tail = tail;
  root.userData = { rig, kind: 'bunny', height: 18 * PX };
  return root;
}

// Lost robot: an old worn-out robot that wandered off a crashed ship. Fix it with a metal sheet and it gives you old parts.
export function makeLostRobot(look) {
  const C = pickLook('robot', look);
  const root = new THREE.Group(); const rig = {};
  const metal = tones(C.metal);
  const worn = (seed) => (face, i, j, fw, fh) => {
    if (hash(Math.floor(i / 2), Math.floor(j / 2), seed + 1) > 0.84) return pick([C.rust, shade(C.rust, 1.2)], hash(i, j, seed + 2));   // rust patches
    if (i === 0 || i === fw - 1) return shade(C.metal, 0.75);
    return pick(metal, hash(i, j, seed));
  };
  for (const s of [-1, 1]) {
    rig[s < 0 ? 'legL' : 'legR'] = part(root, box(4, 7, 5, (face, i, j, fw, fh) => (j >= fh - 2 ? '#2e3036' : worn(230)(face, i, j, fw, fh))), s * 3, 7, 0, 0, -3.5, 0);
  }
  const body = box(10, 9, 7, (face, i, j, fw, fh) => {
    if (face === 'front') {
      if (i >= 6 && i <= 8 && j >= 1 && j <= 3) return C.patch;                          // a bolted-on patch
      if (j === 6 && i >= 2 && i <= 4) return (i + j) % 2 ? '#2e3036' : '#5a5e66';        // vent
      if (j === 2 && i === 2) return ['#ff6a3a', '#ff4a1a'];                              // a blinking light
    }
    return worn(231)(face, i, j, fw, fh);
  });
  part(root, body, 0, 11.5, 0);
  const head = new THREE.Group(); head.position.set(0, 16 * PX, 0); root.add(head); rig.head = head;
  part(head, box(8, 6, 7, (face, i, j, fw, fh) => {
    if (face === 'front' && i >= 1 && i <= 6 && j >= 1 && j <= 4) {
      // a small question mark on a cracked screen
      const q = [[3, 1], [4, 1], [5, 2], [4, 3], [4, 4]];
      if (q.some(([x, y]) => x === i + 1 - 1 && y === j)) return [C.screen, C.screen];
      if (i + j === 7 && i > 2) return '#5a5e66';                                         // the crack
      return '#141a1c';
    }
    return worn(232)(face, i, j, fw, fh);
  }, { glow: 1.1 }), 0, 3, 0);
  const ant = part(head, box(1, 4, 1, (face, i, j) => (j === 0 ? [C.screen, C.screen] : '#5a5e66'), { glow: 1 }), 2, 6, 0, 0, 2, 0);
  ant.rotation.z = -0.6;                                                                    // bent antenna
  for (const s of [-1, 1]) {
    const arm = box(3, 8, 3, (face, i, j, fw, fh) => (j >= fh - 2 ? (s < 0 ? '#2e3036' : C.patch) : worn(233)(face, i, j, fw, fh)));
    rig[s < 0 ? 'armL' : 'armR'] = part(root, arm, s * 6.5, 15, 0, 0, -4, 0);
  }
  root.userData = { rig, kind: 'robot', height: 23 * PX };
  return root;
}

// ================================================================ the bosses: one dragon for each world, waiting at wave 50
// Each world's dragon has its own colours AND its own shape (wings, horns, legs, neck, tail).
export function makeDragon(look) {
  const C = pickLook('dragon', look);
  const root = new THREE.Group(); const rig = {};
  const scale = tones(C.body), belly = tones(C.belly);
  const glow = [C.crack, shade(C.crack, 0.9)];
  const crackAmt = C.cracks ?? 1;
  const hide = (seed, bellySide) => (face, i, j, fw, fh) => {
    if (bellySide && (face === 'bottom' || (face !== 'top' && j >= fh - 3 && face !== 'back'))) {
      return j % 3 === 0 ? shade(C.belly, 0.8) : pick(belly, hash(i, j, seed + 1));
    }
    if (C.pits && hash(Math.floor(i / 3), Math.floor(j / 3), seed + 9) > 0.86 && (i % 3 + j % 3) < 3) return shade(C.body, 0.62); // crater pits
    const ci = i + Math.floor(hash(Math.floor(j / 5), 0, seed) * 4), cj = j + Math.floor(hash(Math.floor(i / 6), 1, seed) * 3);
    if (crackAmt > 0 && ((ci % 9 === 0 && hash(i, Math.floor(j / 3), seed + 2) > 1 - 0.65 * crackAmt) || (cj % 8 === 0 && hash(Math.floor(i / 3), j, seed + 3) > 1 - 0.55 * crackAmt))) return glow;
    if (C.stripes && j % 6 === 0) return shade(C.body, 0.75);
    if ((i % 4 === 0) !== (j % 4 === 0) && hash(i, j, seed + 4) > 0.7) return shade(C.body, 0.7);
    return pick(scale, hash(Math.floor(i / 2), Math.floor(j / 2), seed + 5));
  };
  const L_H = C.legH || 20, L_W = C.legW || 10;
  const lift = L_H - 20;                                   // longer legs lift the whole body
  const body = new THREE.Group(); body.position.y = lift * PX; root.add(body); rig.body = body;
  const TW = C.bodyW || 30;
  part(body, box(TW, 22, 40, hide(170, true), { glow: 1.1 }), 0, 30, 0);
  // along the back: crystal spikes, round plates, or a fin
  const back = C.back || 'spikes';
  [[-14, 6], [-6, 8], [2, 9], [10, 7], [17, 5]].forEach(([z, h], k) => {
    let sp;
    if (back === 'plates') sp = box(2, h + 2, 6, (face, i, j) => (j === 0 ? L(C.horn, 1.1) : pick(tones(C.horn), hash(i, j, 171 + k))));
    else if (back === 'fin') sp = box(2, h, 9, (face, i, j) => [pick([C.crack, shade(C.crack, 0.8)], hash(i, j, 171 + k)), shade(C.crack, 0.5)], { opacity: 0.85, glow: 0.6 });
    else sp = box(4, h, 4, (face, i, j) => (j === 0 ? [L(C.crack, 1.4), '#ffffff'] : [pick([C.crack, shade(C.crack, 0.8)], hash(i, j, 171 + k)), C.crack]), { glow: 0.8 });
    const g = part(body, sp, 0, 41, z, 0, h / 2, 0); g.rotation.x = back === 'spikes' ? -0.25 : 0;
  });
  rig.legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(L_W, L_H, L_W, (face, i, j, fw, fh) => {
      if (j >= fh - 3) return face === 'front' && i % 3 === 1 ? C.horn : shade(C.body, 0.6);
      return hide(172, false)(face, i, j, fw, fh);
    }, { glow: 1.1 });
    const g = part(root, leg, sx * (TW / 2 - 2), 22 + lift, sz * 12, 0, -L_H / 2 - lift / 2 + lift / 2, 0);
    g.children[0].position.y = -(L_H / 2) * PX; g.position.y = L_H * PX;
    g.userData.phase = (sx * sz > 0) ? 0 : Math.PI; rig.legs.push(g);
  }
  // neck and head
  const NL = C.neck || 18;
  const neck = new THREE.Group(); neck.position.set(0, 36 * PX, 18 * PX); neck.rotation.x = -(C.neckTilt ?? 0.6); body.add(neck); rig.neck = neck;
  rig.neckTilt = C.neckTilt ?? 0.6;
  part(neck, box(14, 14, NL, hide(173, true), { glow: 1.1 }), 0, 2, NL / 2);
  const head = new THREE.Group(); head.position.set(0, 4 * PX, NL * PX); neck.add(head); rig.head = head;
  head.rotation.x = C.neckTilt ?? 0.6;
  const skull = box(20, 14, 22, (face, i, j, fw, fh) => {
    if ((face === 'right' || face === 'left') && j >= 3 && j <= 5) {
      const front = face === 'right' ? fw - 1 - i : i;
      if (front >= 3 && front <= 6) return j === 4 && (front === 4 || front === 5) ? ['#ffffff', '#ffffff'] : [L(C.eye || C.crack, 1.2), C.eye || C.crack];
      if (front >= 2 && front <= 7) return shade(C.body, 0.5);
    }
    if (face === 'front') {
      if (j >= 6 && j <= 7 && (i === 5 || i === 6 || i === 13 || i === 14)) return glow;
      if (j >= fh - 2 && i % 3 === 1) return C.horn;
    }
    return hide(174, false)(face, i, j, fw, fh);
  }, { glow: 1.2 });
  part(head, skull, 0, 3, 11);
  const jaw = box(18, 5, 20, (face, i, j) => {
    if (face === 'top') return [shade(C.crack, 0.7), shade(C.crack, 0.6)];
    if (face === 'front' && j === 0 && i % 3 === 1) return C.horn;
    return pick(belly, hash(i, j, 175));
  }, { glow: 1.2 });
  rig.jaw = part(head, jaw, 0, -4, 2, 0, -2.5, 10);
  const horns = C.horns || 'back';
  const hornP = (glowy) => (face, i, j) => (glowy ? [j < 3 ? L(C.horn, 1.3) : pick(tones(C.horn), hash(i, j, 176)), shade(C.horn, 0.7)] : (j < 3 ? L(C.horn, 1.15) : pick(tones(C.horn), hash(i, j, 176))));
  for (const s of [-1, 1]) {
    if (horns === 'big') {           // heavy curled horns
      const h1 = part(head, box(6, 10, 6, hornP(false)), s * 8, 9, 4, 0, 5, 0); h1.rotation.z = -s * 0.9; h1.rotation.x = -0.3;
      const h2 = part(h1, box(4, 9, 4, hornP(false)), 0, 9, 0, 0, 4.5, 0); h2.rotation.x = -1.1;
    } else if (horns === 'ice') {     // tall glowing crystal horns
      const h = part(head, box(4, 18, 4, hornP(true), { glow: 0.9 }), s * 6, 9, 3, 0, 9, 0); h.rotation.x = -0.6; h.rotation.z = -s * 0.2;
      const h2 = part(head, box(3, 10, 3, hornP(true), { glow: 0.9 }), s * 9, 7, 6, 0, 5, 0); h2.rotation.x = -0.5; h2.rotation.z = -s * 0.7;
    } else if (horns === 'ears') {    // wide flat ears, good for hearing in a dust storm
      const e = part(head, box(2, 12, 8, (face, i, j) => (j < 2 ? L(C.horn, 1.1) : pick(tones(C.body), hash(i, j, 178)))), s * 10, 8, 3, 0, 6, 0);
      e.rotation.z = -s * 1.0; e.rotation.x = -0.3;
    } else {
      const g = part(head, box(4, 14, 4, hornP(false)), s * 7, 9, 2, 0, 7, 0); g.rotation.x = -1.0; g.rotation.z = -s * 0.35;
      const g2 = part(head, box(3, 7, 3, () => C.horn), s * 10, 4, 4, 0, 3.5, 0); g2.rotation.x = -1.2; g2.rotation.z = -s * 0.9;
    }
  }
  if (horns === 'crest' || C.crest) {  // a fan of glowing plates, like the star flaring
    [-6, -2, 2, 6].forEach((x, k) => {
      const c = part(head, box(3, 10 + (k % 3 === 0 ? 0 : 4), 2, (face, i, j) => [j < 3 ? '#ffffff' : L(C.crack, 1.2), C.crack], { glow: 1 }), x, 9, 0, 0, 5, 0);
      c.rotation.x = -0.9; c.rotation.z = x * -0.06;
    });
  }
  // tail
  const segs = C.tail === 'long'
    ? [[16, 14, 14], [13, 11, 14], [10, 9, 14], [8, 7, 14], [6, 5, 12], [5, 4, 10]]
    : C.tail === 'club' ? [[16, 14, 14], [12, 10, 12], [9, 8, 10]] : [[16, 14, 14], [12, 10, 14], [8, 7, 14], [6, 5, 12]];
  let parent = new THREE.Group(); parent.position.set(0, 32 * PX, -20 * PX); body.add(parent); rig.tail = parent;
  segs.forEach(([w, h, d], k) => {
    const g = part(parent, box(w, h, d, hide(177 + k, true), { glow: 1.1 }), 0, 0, k === 0 ? 0 : -(segs[k - 1][2] - 1), 0, 0, -d / 2);
    g.rotation.x = k === 0 ? 0.25 : 0.1;
    parent = g;
  });
  const last = segs[segs.length - 1][2];
  if (C.tail === 'club') {
    part(parent, box(14, 10, 12, (face, i, j) => (i % 4 === 0 && j % 3 === 0 ? C.horn : pick(tones(C.horn), hash(i, j, 179)))), 0, 0, -last, 0, 0, -6);
  } else if (C.tail === 'long') {
    const f = part(parent, box(2, 12, 12, (face, i, j) => [pick([C.crack, shade(C.crack, 0.8)], hash(i, j, 179)), shade(C.crack, 0.5)], { opacity: 0.85, glow: 0.6 }), 0, 0, -last, 0, 0, -5);
  } else {
    const tg = part(parent, box(6, 6, 6, () => [L(C.crack, 1.3), C.crack], { glow: 1.2 }), 0, 0, -last, 0, 0, -3); tg.rotation.z = Math.PI / 4;
  }
  // wings
  rig.wings = [];
  const wings = C.wings || 'wide';
  const wingSpan = wings === 'wide' ? 40 : wings === 'small' ? 22 : 18;
  if (wings !== 'none') for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * (TW / 2 - 1) * PX, (wings === 'fins' ? 34 : 40) * PX, 8 * PX); body.add(w);
    if (wings === 'fins') {                       // swimming fins, see-through
      const fin = box(wingSpan, 1, 16, (face, i, j, fw, fh) => {
        const ii = s > 0 ? i : fw - 1 - i;
        if (ii % 5 === 0) return shade(C.crack, 0.7);
        if (j > fh - 2 - Math.floor(ii / 3)) return shade(C.body, 0.6);
        return [shade(C.crack, 0.9 + 0.1 * hash(i, j, 182)), shade(C.crack, 0.5)];
      }, { opacity: 0.8, glow: 0.6 });
      fin.position.set(s * wingSpan / 2 * PX, 0, -6 * PX); w.add(fin);
    } else {
      const arm = box(wingSpan, 4, 4, (face, i, j) => (i % 8 === 0 ? C.horn : pick(scale, hash(i, j, 180))));
      arm.position.set(s * wingSpan / 2 * PX, 0, 0); w.add(arm);
      const depth = wings === 'wide' ? 28 : 16;
      const skin = box(wingSpan, 1, depth, (face, i, j, fw, fh) => {
        const ii = s > 0 ? i : fw - 1 - i;
        if (ii % 8 === 0) return C.horn;
        if (j > fh - 3 - Math.floor((ii % 8) / 2)) return shade(C.body, 0.55);
        return [shade(C.wing || C.belly, 0.85 + 0.1 * hash(i, j, 181)), shade(C.crack, 0.2)];
      }, { glow: 0.6 });
      skin.position.set(s * wingSpan / 2 * PX, -1 * PX, -depth / 2 * PX); w.add(skin);
    }
    w.rotation.z = s * 0.35; w.userData.side = s; w.userData.fins = wings === 'fins'; rig.wings.push(w);
  }
  root.userData = { rig, kind: 'dragon', height: (74 + lift) * PX };
  return root;
}

export const CHARACTERS = [
  { id: 'pilot', name: 'You, the pilot', make: makePilot, note: 'Chunky suit, big helmet with a wide visor, air tanks on the back. ' },
  { id: 'buddy', name: 'Buddy', make: makeBuddy, note: 'Your little helper robot. Floats next to you and lights up near ore.' },
  { id: 'hopper', name: 'Hopper', make: makeHopper, note: 'A shy one-eyed critter that hops around the red dirt. Harmless.' },
  { id: 'crab', name: 'Rock crab', make: makeRockCrab, note: 'Hides in craters. Crystal grows on its back. Pinches if you dig too close.' },
  { id: 'jelly', name: 'Glow jelly', make: makeGlowJelly, note: 'Drifts over the ice on cold worlds. Its glow lights up dark caves.' },
  { id: 'trader', name: 'Trader', make: makeTrader, note: 'A tall traveller with a crate on their back. Swaps goods for what you dig up.' },
  { id: 'snail', group: 'finds', name: 'Salt snail', make: makeGemSnail, note: 'Slow and shy. Its shell is a shiny crystal. Pet it and it drops crystal bits.' },
  { id: 'beetle', group: 'finds', name: 'Shiny beetle', make: makeGoldBeetle, note: 'Runs away when it sees you. Catch it and it leaves a gold nugget.' },
  { id: 'moth', group: 'finds', name: 'Star moth', make: makeLuckyMoth, note: 'Only comes out at night. Follow it and it leads you to a treasure box.' },
  { id: 'mole', group: 'finds', name: 'Gold mole', make: makeDiggerMole, note: 'Pops out of the ground. Wherever it digs, there is ore right below.' },
  { id: 'puff', group: 'finds', name: 'Dust puff', make: makeDustPuff, note: 'A soft ball of fluff that rolls on the wind. Catch one and it shakes out a handful of iron dust.' },
  { id: 'fish', group: 'finds', name: 'Ice fish', make: makeIceFish, note: 'Swims under the ice. Most give food. The rare golden one gives a big reward.' },
  { id: 'ray', group: 'finds', name: 'Sky ray', make: makeSkyRay, note: 'Glides high above. Where its shadow stops, a treasure box is buried.' },
  { id: 'bunny', group: 'finds', name: 'Crater bunny', make: makeCraterBunny, note: 'Hops between craters on big springy feet. Follow it home and its den has moon rocks.' },
  { id: 'robot', group: 'finds', name: 'Lost robot', make: makeLostRobot, note: 'An old robot that wandered off a crashed ship. Fix it with a metal sheet and it gives you old parts.' },
  { id: 'dragon', group: 'boss', name: 'Dragons', make: makeDragon, note: 'One different dragon on every world, waiting at wave 50. You need strong forged weapons to beat it.' },
];
CHARACTERS.forEach((c) => { c.group = c.group || 'crew'; });
export const GROUPS = {
  crew: { name: 'Your crew and locals' },
  finds: { name: 'Rewarding finds' },
  boss: { name: 'The dragons at wave 50 (one per world)' },
};

// simple life: idle sway, walking, hopping, floating. t = seconds, moving = 0..1
export function animate(model, t, moving = 0) {
  const { rig, kind } = model.userData;
  const sw = Math.sin(t * 8) * 0.7 * moving;
  if (kind === 'pilot' || kind === 'trader') {
    rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
    rig.armL.rotation.x = -sw * 0.8; rig.armR.rotation.x = sw * 0.8;
    rig.armL.rotation.z = -0.05; rig.armR.rotation.z = 0.05;
    rig.head.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - moving);
    rig.head.rotation.x = Math.sin(t * 1.3) * 0.03;
  } else if (kind === 'hopper') {
    const p = (t * 1.6) % 1, air = p < 0.45 ? Math.sin(p / 0.45 * Math.PI) : 0;
    model.position.y = (model.userData.baseY || 0) + air * 0.45;
    rig.backL.rotation.x = rig.backR.rotation.x = air * 0.9;
    rig.frontL.rotation.x = rig.frontR.rotation.x = -air * 0.6;
    rig.body.scale.y = air > 0 ? 1.04 : 0.92 + 0.08 * Math.min(1, (p - 0.45) * 6);
    rig.earL.rotation.x = rig.earR.rotation.x = -0.5 - air * 0.5;
  } else if (kind === 'crab') {
    rig.legs.forEach((g) => { g.rotation.x = Math.sin(t * 10 + g.userData.k * 2 + g.userData.side) * 0.35; });
    rig.clawL.rotation.x = Math.max(0, Math.sin(t * 2.2)) * -0.4;
    rig.clawR.rotation.x = Math.max(0, Math.sin(t * 2.2 + 1.5)) * -0.4;
    rig.body.position.y = Math.abs(Math.sin(t * 10)) * 0.01;
  } else if (kind === 'jelly') {
    rig.body.position.y = Math.sin(t * 1.4) * 0.08;
    rig.body.scale.set(1 + Math.sin(t * 2.8) * 0.04, 1 - Math.sin(t * 2.8) * 0.05, 1 + Math.sin(t * 2.8) * 0.04);
    rig.strands.forEach((s, k) => {
      let g = s, d = 0;
      while (g) { g.rotation.x = Math.sin(t * 2 + k + d) * 0.18; g.rotation.z = Math.cos(t * 1.6 + k * 2 + d) * 0.12; g = g.children.find((c) => c.isGroup); d += 0.6; }
    });
  } else if (kind === 'snail') {
    rig.body.position.z = ((t * 0.15) % 0.4) - 0.2;
    rig.body.scale.z = 1 + Math.sin(t * 3) * 0.04;
    rig.eyeL.rotation.x = Math.sin(t * 1.7) * 0.25; rig.eyeR.rotation.x = Math.sin(t * 1.7 + 1) * 0.25;
    rig.shell.position.y = (7.5 + Math.sin(t * 3) * 0.2) * PX;
  } else if (kind === 'beetle') {
    rig.legs.forEach((g) => { g.rotation.x = Math.sin(t * 16 + g.userData.k * 2 + g.userData.side) * 0.5 * Math.max(0.3, moving); });
    const flick = Math.max(0, Math.sin(t * 1.3)) ** 6;
    rig.wingL.rotation.z = flick * 0.7; rig.wingR.rotation.z = -flick * 0.7;
  } else if (kind === 'moth') {
    rig.body.position.y = Math.sin(t * 1.8) * 0.08;
    rig.body.rotation.y = Math.sin(t * 0.6) * 0.3;
    rig.wings.forEach((g) => { g.rotation.z = g.userData.side * (Math.sin(t * 9 - (g.userData.lag || 0) * 3) * 0.6 + 0.1); });
  } else if (kind === 'mole') {
    const p = (t * 0.5) % 1, up = p < 0.7 ? 1 : Math.cos((p - 0.7) / 0.3 * Math.PI) * 0.5 + 0.5;
    rig.body.position.y = (up - 1) * 0.4;
    rig.pawL.rotation.x = Math.sin(t * 12) * 0.5; rig.pawR.rotation.x = -Math.sin(t * 12) * 0.5;
    rig.body.rotation.y = Math.sin(t * 1.1) * 0.3;
  } else if (kind === 'puff') {
    rig.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.12;
    rig.body.rotation.y = t * 0.6;
    const p = 1 + Math.sin(t * 5) * 0.04; rig.fluff.scale.set(p, p, p);
  } else if (kind === 'fish') {
    rig.body.position.y = Math.sin(t * 1.5) * 0.05;
    rig.tail.rotation.y = Math.sin(t * 8) * 0.5;
    rig.body.rotation.y = Math.sin(t * 8 + 1) * 0.08;
    rig.finL.rotation.z = Math.sin(t * 6) * 0.4; rig.finR.rotation.z = -Math.sin(t * 6) * 0.4;
  } else if (kind === 'ray') {
    rig.body.position.y = Math.sin(t * 1.2) * 0.1;
    rig.wings.forEach((w) => { const a = Math.sin(t * 2.4) * 0.35; w.rotation.z = w.userData.side * a; w.userData.tip.rotation.z = w.userData.side * Math.sin(t * 2.4 - 0.6) * 0.4; });
    let g = rig.tail, d = 0;
    while (g) { g.rotation.y = Math.sin(t * 2 - d) * 0.2; g = g.children.find((c) => c.isGroup); d += 0.6; }
  } else if (kind === 'bunny') {
    const p = (t * 0.9) % 1, air = p < 0.6 ? Math.sin(p / 0.6 * Math.PI) : 0;    // long, floaty Moon hops
    model.position.y = (model.userData.baseY || 0) + air * 0.6;
    rig.footL.rotation.x = rig.footR.rotation.x = air * 0.6;
    rig.earL.rotation.x = rig.earR.rotation.x = -0.2 - air * 0.6;
    rig.head.rotation.y = Math.sin(t * 0.8) * 0.3 * (1 - air);
    rig.tail.rotation.y = t * 2;
  } else if (kind === 'robot') {
    const sw = Math.sin(t * 5) * 0.35 * Math.max(0.25, moving);
    rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
    rig.armL.rotation.x = -sw * 0.6; rig.armR.rotation.x = 0.2 + Math.sin(t * 1.3) * 0.25;  // one arm waves slowly
    rig.head.rotation.z = 0.15 + Math.sin(t * 0.9) * 0.08;                                     // a tired head tilt
    rig.head.rotation.y = Math.sin(t * 0.5) * 0.3;
  } else if (kind === 'dragon') {
    const breath = Math.sin(t * 1.5);
    rig.body.position.y = breath * 0.03;
    rig.legs.forEach((g) => { g.rotation.x = Math.sin(t * 4 + g.userData.phase) * 0.35 * moving; });
    rig.neck.rotation.x = -rig.neckTilt + breath * 0.05;
    rig.head.rotation.y = Math.sin(t * 0.5) * 0.25;
    rig.jaw.rotation.x = Math.max(0, Math.sin(t * 0.8)) ** 3 * 0.45;
    rig.wings.forEach((w) => { w.rotation.z = w.userData.side * (w.userData.fins ? 0.15 + Math.sin(t * 2) * 0.2 : 0.35 + Math.sin(t * 1.2) * 0.35); });
    let g = rig.tail, d = 0;
    while (g) { g.rotation.y = Math.sin(t * 1.2 - d) * 0.12; g = g.children.find((c) => c.isGroup); d += 0.7; }
  } else if (kind === 'buddy') {
    rig.body.position.y = Math.sin(t * 2) * 0.05;
    rig.body.rotation.z = Math.sin(t * 1.3) * 0.06;
    rig.rotor.rotation.y = t * 18;
  }
}

// ================================================================ the Rover: a small six-wheeled buggy you can drive
// Front is -z (the way you face when yaw = 0).
export function makeRover(look = 'sun') {
  const C = { sun: { body: '#e8b23c', trim: '#c4562a' }, sea: { body: '#4e9690', trim: '#f0c24a' }, berry: { body: '#8a3a6e', trim: '#6fd6b0' } }[look] || { body: '#e8b23c', trim: '#c4562a' };
  const root = new THREE.Group(); const rig = { wheels: [] };
  const paint = tones(C.body);
  const hull = box(20, 5, 28, (face, i, j, fw, fh) => {
    if (face === 'back' && j >= 1 && j <= 2 && (i <= 3 || i >= fw - 4)) return ['#fff4c0', '#fff0a0'];   // headlights
    if (j === 0 && face !== 'top' && face !== 'bottom') return C.trim;                                   // stripe
    if (face === 'top' && (i === 2 || i === fw - 3)) return C.trim;
    return pick(paint, hash(i, j, 301 + FACES.indexOf(face)));
  }, { glow: 1.4 });
  part(root, hull, 0, 9, 0);
  // seat and a roll bar
  part(root, box(10, 4, 6, flat(['#3a2a24', '#2e221e', '#44322a'], 302)), 0, 13, 4);
  for (const s of [-1, 1]) part(root, box(2, 9, 2, flat(['#5a5e66', '#4a4e56'], 303)), s * 8, 15.5, 9);
  part(root, box(18, 2, 2, flat([C.trim, shade(C.trim, 0.9)], 304)), 0, 20, 9);
  // a little dish on the back
  part(root, box(4, 1, 4, flat(['#d8d0c4', '#c8c0b4'], 305)), 5, 17, 11);
  // six wheels
  for (const z of [-10, 0, 10]) for (const s of [-1, 1]) {
    const w = part(root, box(4, 7, 7, (face, i, j, fw, fh) => {
      if (face === 'right' || face === 'left') return (i === 3 && j === 3) ? '#8a8e96' : ((i + j) % 3 === 0 ? '#1a1a1e' : '#2a2a30');
      return (j % 2 ? '#1e1e22' : '#34343a');
    }), s * 11, 4, z);
    rig.wheels.push(w);
  }
  root.userData = { rig, kind: 'rover', height: 22 * PX };
  return root;
}
