// The unfriendly creatures that come in waves. Our own designs, built from boxes
// painted pixel by pixel like everything else (1 pixel = 1/16 of a block).
import * as THREE from 'three';
import { hashf as hash } from './noise.js';

const PX = 1 / 16;
const pick = (arr, a) => arr[Math.floor(a * arr.length) % arr.length];
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
const FACES = ['right', 'left', 'top', 'bottom', 'front', 'back'];
const size = (f, w, h, d) => (f === 'right' || f === 'left' ? [d, h] : f === 'top' || f === 'bottom' ? [w, d] : [w, h]);
const cache = new Map();
function tex(w, h, fn, k) {
  if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = document.createElement('canvas'); g.width = w; g.height = h;
  const cx = c.getContext('2d'), gx = g.getContext('2d'); gx.fillStyle = '#000'; gx.fillRect(0, 0, w, h);
  let glow = false;
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    let v = fn(i, j, w, h);
    if (Array.isArray(v)) { gx.fillStyle = v[1]; gx.fillRect(i, j, 1, 1); glow = true; v = v[0]; }
    cx.fillStyle = v; cx.fillRect(i, j, 1, 1);
  }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const out = { map: mk(c), glow: glow ? mk(g) : null };
  cache.set(k, out); return out;
}
function box(w, h, d, paint, k) {
  const mats = FACES.map((f) => {
    const [fw, fh] = size(f, w, h, d);
    const t = tex(fw, fh, (i, j) => paint(f, i, j, fw, fh), k + f + w + h + d);
    const m = new THREE.MeshLambertMaterial({ map: t.map });
    if (t.glow) { m.emissiveMap = t.glow; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 1.2; }
    return m;
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mats);
  mesh.castShadow = true;
  return mesh;
}
function at(parent, mesh, x, y, z) { const g = new THREE.Group(); g.position.set(x * PX, y * PX, z * PX); g.add(mesh); parent.add(g); return g; }

// colours for each world
const SKIN = {
  mars: { a: '#8a3a22', b: '#b9532c', eye: '#ffd060' },
  moon: { a: '#5a5a62', b: '#8a8a92', eye: '#60e0ff' },
  europa: { a: '#3a6a86', b: '#6aa0c0', eye: '#ff70b0' },
  proxima: { a: '#4a1418', b: '#7a2a2a', eye: '#ffb040' },
  trappist1e: { a: '#1e4a4a', b: '#3a7a6a', eye: '#ffe060' },
  lhs1140b: { a: '#5a5a5e', b: '#8a8680', eye: '#ff6a3a' },
};
const skinOf = (w) => SKIN[w] || SKIN.mars;

function biter(w) {
  const S = skinOf(w), T = [S.a, S.b, shade(S.b, 0.9), shade(S.a, 1.15)];
  const root = new THREE.Group(), rig = {};
  const body = new THREE.Group(); root.add(body); rig.body = body;
  at(body, box(12, 8, 13, (f, i, j, fw, fh) => {
    if (f === 'front') {
      if (j > 4 && j < 7) return (i % 2 === 0 && i > 0 && i < 11) ? '#f4eee0' : '#1a0806';   // teeth
      if (j === 2 && (i === 3 || i === 8)) return [S.eye, S.eye];
      if (j === 2 && (i === 2 || i === 9)) return '#1a0806';
    }
    if (f === 'top' && (i + j) % 5 === 0) return shade(S.a, 0.7);
    return pick(T, hash(i, j, 61));
  }, 'biter' + w), 0, 6, 0);
  rig.legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(3, 4, 3, (f, i, j) => (j > 2 ? '#1a0806' : pick(T, hash(i, j, 62))), 'bl' + w);
    const g = at(body, leg, sx * 4.5, 2, sz * 4); leg.position.y = -1 * PX; g.userData.p = sx * sz; rig.legs.push(g);
  }
  root.userData = { rig, kind: 'biter', height: 10 * PX, radius: 0.45 };
  return root;
}

function roller(w) {
  const S = skinOf(w);
  const root = new THREE.Group(), rig = {};
  const ball = new THREE.Group(); ball.position.y = 7 * PX; root.add(ball); rig.ball = ball;
  const rock = box(14, 14, 14, (f, i, j) => {
    if ((i === j || i + j === 13) && hash(i, j, 63) > 0.3) return [S.eye, shade(S.eye, 0.7)];
    if (i === 0 || j === 0 || i === 13 || j === 13) return shade(S.a, 0.8);
    return pick([S.a, shade(S.a, 1.2), shade(S.b, 0.8), '#6a645e'], hash(Math.floor(i / 2), Math.floor(j / 2), 64));
  }, 'roller' + w);
  ball.add(rock);
  root.userData = { rig, kind: 'roller', height: 14 * PX, radius: 0.5 };
  return root;
}

function spitter(w) {
  const S = skinOf(w), ice = ['#bfe3f5', '#a0d0ec', '#d8f0fb'];
  const root = new THREE.Group(), rig = {};
  const body = new THREE.Group(); root.add(body); rig.body = body;
  at(body, box(8, 16, 8, (f, i, j) => {
    if (f === 'front' && j === 3 && (i === 2 || i === 5)) return [S.eye, S.eye];
    if (j % 4 === 0) return shade(S.b, 0.8);
    return pick([S.b, shade(S.b, 1.1), S.a], hash(i, j, 65));
  }, 'spit' + w), 0, 12, 0);
  const mouth = box(4, 4, 5, (f, i, j) => (f === 'front' && i > 0 && i < 3 && j > 0 && j < 3 ? '#0a1420' : pick(ice, hash(i, j, 66))), 'mouth');
  at(body, mouth, 0, 15, 5.5); rig.mouth = mouth;
  rig.legs = [];
  for (const sx of [-1, 1]) { const l = box(3, 5, 3, (f, i, j) => pick([S.a, '#1a0806'], hash(i, j, 67)), 'sl' + w); const g = at(body, l, sx * 2.5, 2.5, 0); g.userData.p = sx; rig.legs.push(g); }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) at(body, box(2, 3, 2, (f, i, j) => [ice[k % 3], '#60c0f0'], 'spike'), sx * 4.5, 10 + k * 3, -1);
  root.userData = { rig, kind: 'spitter', height: 20 * PX, radius: 0.4 };
  return root;
}

function bat(w) {
  const S = skinOf(w);
  const root = new THREE.Group(), rig = {};
  const body = new THREE.Group(); body.position.y = 0.4; root.add(body); rig.body = body;
  at(body, box(6, 6, 7, (f, i, j) => {
    if (f === 'front' && j === 2 && (i === 1 || i === 4)) return [S.eye, S.eye];
    return pick(['#1a1420', '#241a2a', shade(S.a, 0.5)], hash(i, j, 68));
  }, 'bat' + w), 0, 0, 0);
  at(body, box(2, 3, 1, () => '#120c16', 'ear'), -2, 4, 1); at(body, box(2, 3, 1, () => '#120c16', 'ear'), 2, 4, 1);
  rig.wings = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 3 * PX, 0, 0); body.add(g);
    const wing = box(12, 1, 8, (f, i, j, fw) => { const ii = s > 0 ? i : fw - 1 - i; return ii % 4 === 0 ? '#120c16' : [shade(S.a, 0.7), shade(S.eye, 0.15)]; }, 'wing' + w + s);
    wing.position.set(s * 6 * PX, 0, 0); g.add(wing); g.userData.s = s; rig.wings.push(g);
  }
  root.userData = { rig, kind: 'bat', height: 8 * PX, radius: 0.45, flies: true };
  return root;
}

export const ENEMIES = {
  biter: { name: 'Dust biter', make: biter, hp: 6, hit: 2, speed: 3.2, from: 1 },
  roller: { name: 'Rock roller', make: roller, hp: 12, hit: 3, speed: 2.4, from: 4 },
  spitter: { name: 'Ice spitter', make: spitter, hp: 8, hit: 2, speed: 1.8, from: 8, shoots: true },
  bat: { name: 'Shadow bat', make: bat, hp: 5, hit: 1, speed: 4.2, from: 12 },
};
// mini bosses at waves 10, 20, 30 and 40
export const BIG = { 10: 'biter', 20: 'roller', 30: 'spitter', 40: 'bat' };

export function makeEnemy(type, world, big = false) {
  const m = ENEMIES[type].make(world);
  if (big) { m.scale.setScalar(2.4); m.userData.radius *= 2.4; m.userData.height *= 2.4; }
  return m;
}

export function animateEnemy(m, t, moving) {
  const { rig, kind } = m.userData;
  if (kind === 'biter') {
    rig.legs.forEach((g) => { g.rotation.x = Math.sin(t * 14) * 0.6 * g.userData.p * moving; });
    rig.body.position.y = Math.abs(Math.sin(t * 14)) * 0.03 * moving;
  } else if (kind === 'roller') {
    rig.ball.rotation.x += moving * 0.12;
  } else if (kind === 'spitter') {
    rig.legs.forEach((g) => { g.rotation.x = Math.sin(t * 8) * 0.5 * g.userData.p * moving; });
    rig.body.rotation.z = Math.sin(t * 3) * 0.05;
  } else if (kind === 'bat') {
    rig.wings.forEach((g) => { g.rotation.z = g.userData.s * Math.sin(t * 16) * 0.7; });
    rig.body.position.y = 0.4 + Math.sin(t * 4) * 0.1;
  }
}
