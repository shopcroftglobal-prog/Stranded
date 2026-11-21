// Chunked voxel world: terrain generation, storage, edits, meshing, ray picking.
import * as THREE from 'three';
import { makeNoise, hash3 } from './noise.js';
import { B, BLOCKS } from './blocks.js';
import { tileUV } from './textures.js';

export const CS = 16;          // chunk size (x, z)
export const H = 64;           // world height
export const SPAWN_H = 30;
const WRECK_CELL = 52;     // one buried wreck in about half of these squares     // flat ground height around the crash site
const key = (cx, cz) => cx + ',' + cz;
const idx = (x, y, z) => x + z * CS + y * CS * CS;
const smooth = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };

// params come from looks.js worldParams(): terrain shape and ores for one world
export class World {
  constructor(params, seed = 20261114) {
    this.p = params;
    this.T = params.terrain;
    this.O = params.ores;
    this.seed = seed;
    this.noise = makeNoise(seed);
    this.chunks = new Map();
    this.edits = new Map();      // chunkKey -> Map(localIndex -> id)
    this.structure = new Map();  // "x,y,z" -> id (the crashed ship)
    this.craterCache = new Map();
  }

  // ---------- terrain ----------
  crater(cx, cz) {
    const k = key(cx, cz);
    let c = this.craterCache.get(k);
    if (c !== undefined) return c;
    const T = this.T, cell = T.cell;
    c = null;
    if (cx === 0 && cz === 0) c = { x: 32, z: -8, r: 11, crystal: true };   // a crater you can see from the ship
    else if (hash3(cx, 0, cz, 1) > 1 - T.craterChance) {
      c = {
        x: cx * cell + 10 + hash3(cx, 1, cz, 2) * (cell - 20),
        z: cz * cell + 10 + hash3(cx, 2, cz, 3) * (cell - 20),
        r: T.craterMin + hash3(cx, 3, cz, 4) * T.craterVar,
        crystal: hash3(cx, 4, cz, 5) > 1 - T.crystalCrater,
      };
    }
    this.craterCache.set(k, c);
    return c;
  }

  wreck(gx, gz) {
    const k = 'w' + key(gx, gz);
    let w = this.craterCache.get(k);
    if (w !== undefined) return w;
    w = null;
    if (hash3(gx, 5, gz, 30) > 0.45) {
      const x = gx * WRECK_CELL + 8 + Math.floor(hash3(gx, 6, gz, 33) * (WRECK_CELL - 16));
      const z = gz * WRECK_CELL + 8 + Math.floor(hash3(gx, 7, gz, 34) * (WRECK_CELL - 16));
      if (Math.hypot(x, z) > 28) {
        const top = this.column(x, z).h;
        w = { x, z, y: Math.max(5, top - 9 - Math.floor(hash3(gx, 8, gz, 35) * 6)), two: hash3(gx, 9, gz, 36) > 0.7 };
      }
    }
    this.craterCache.set(k, w);
    return w;
  }

  column(x, z) {
    const n = this.noise, T = this.T;
    let h = 31 + n.fbm2(x * T.freq, z * T.freq, 4) * T.amp;
    const rg = 1 - Math.abs(n.n2(x * 0.025 + 100, z * 0.025 - 50));
    h += rg * rg * rg * T.ridge * smooth(-0.1, 0.4, n.n2(x * 0.006 - 30, z * 0.006 + 80));
    let floor = 0, crystal = false, rim = 0;
    const gx = Math.floor(x / T.cell), gz = Math.floor(z / T.cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const c = this.crater(gx + a, gz + b);
      if (!c) continue;
      const d = Math.hypot(x - c.x, z - c.z);
      if (d > c.r * 1.5) continue;
      if (d < c.r) h -= (1 - (d / c.r) ** 2) * c.r * T.craterDepth;
      const t = (d - c.r) / (0.45 * c.r);
      if (Math.abs(t) < 1) { h += c.r * 0.22 * (1 - t * t); rim = Math.max(rim, 1 - Math.abs(t)); }
      if (d < c.r * 0.7) floor = Math.max(floor, 1 - d / (c.r * 0.7));
      if (c.crystal && d < c.r * 0.38) crystal = true;
    }
    // long brown cracks across the ice (Europa)
    let crack = 0;
    if (T.cracks) {
      const a = Math.abs(n.n2(x * 0.012 + 300, z * 0.012 - 120)), b = Math.abs(n.n2(x * 0.02 - 77, z * 0.02 + 210));
      crack = Math.max(smooth(0.04, 0.0, a), smooth(0.03, 0.0, b) * 0.85);
      // a double ridge with a groove in the middle
      h += crack > 0.15 && crack < 0.75 ? 1 : 0;
    }
    const d0 = Math.hypot(x, z);
    const mars = T.mars ? this.marsShape(x, z, h, d0) : null;
    if (mars) h = mars.h;
    const flat = smooth(17, 10, d0);
    h = h * (1 - flat) + SPAWN_H * flat;
    if (d0 < 15) crack = 0;
    return { h: Math.max(4, Math.min(H - 6, Math.floor(h))), floor, crystal, d0, rim, crack, mars };
  }

  // Real Mars landscapes, each one based on a real place:
  //  - a giant shield volcano with a crater on top and a cliff round its foot (Olympus Mons)
  //  - a long deep canyon with striped walls (Valles Marineris)
  //  - stepped, striped hills of tan, cream and purple rock (Mount Sharp in Gale crater)
  //  - fields of dark grey sand dunes (the Bagnold dunes)
  //  - white frost on the cold high ground
  marsShape(x, z, h, d0) {
    const n = this.noise;
    const far = smooth(40, 80, d0);          // keep the ground round the ship as it was
    let volc = 0, caldera = false, layer = 0, dune = 0, canyon = 0;
    // volcanoes: one big one you can walk to from the ship, more far away
    for (const v of this.volcanoes(x, z)) {
      const d = Math.hypot(x - v.x, z - v.z) * (1 + 0.08 * n.n2(x * 0.03, z * 0.03));
      if (d > v.r) continue;
      const t = d / v.r;
      let rise = v.hgt * Math.pow(1 - t, 1.25) + (t < 0.9 ? 4 * smooth(0.9, 0.84, t) : 0);
      if (t < 0.16) { rise = v.hgt * Math.pow(1 - 0.16, 1.25) + 4 - 7 * smooth(0.16, 0.12, t); caldera = true; }
      const k = smooth(1, 0.9, t);
      if (rise * k > volc) volc = rise * k;
    }
    if (volc > 0) h = Math.max(h, 30 + volc);
    // the canyon: a long winding crack, flat floor, steep walls
    if (!volc) {
      const c = Math.abs(n.n2(x * 0.0032 + 11.3, z * 0.0032 - 7.7) + 0.05 * n.n2(x * 0.03, z * 0.03));
      canyon = smooth(0.2, 0.1, c) * smooth(60, 110, d0);
      if (canyon > 0) h = h - canyon * Math.max(0, h - 9);
      if (c < 0.26 && d0 > 60) layer = 1;
    }
    // layered hills: stepped like stairs
    let m = n.n2(x * 0.0045 + 40.5, z * 0.0045 - 90.2);
    const hill = Math.hypot(x + 70, z - 58); m = Math.max(m, 0.55 * smooth(46, 20, hill));   // one close to the ship
    const mk = smooth(0.18, 0.4, m) * far * (1 - canyon) * (volc ? 0 : 1);
    if (mk > 0) {
      const raw = mk * (10 + 16 * smooth(0.3, 0.7, m + 0.12 * n.n2(x * 0.02, z * 0.02)));
      const step = Math.floor(raw / 3) * 3 + smooth(0.75, 1, (raw / 3) % 1) * 3;
      h += step; layer = Math.max(layer, smooth(0, 0.3, mk));
    }
    // dark dune fields on low flat ground
    let dn = n.n2(x * 0.006 - 200.1, z * 0.006 + 130.4);
    const field = Math.hypot(x - 52, z - 62); dn = Math.max(dn, 0.5 * smooth(40, 18, field));
    dune = smooth(0.26, 0.4, dn) * smooth(14, 22, d0) * (1 - mk) * (volc ? 0 : 1) * (1 - canyon);
    if (dune > 0) { const r = 1 - Math.abs(n.n2(x * 0.06 + 3.1, z * 0.022 - 1.7)); h += dune * r * r * r * 5; }
    return { h, volc, caldera, layer, dune, canyon };
  }

  volcanoes(x, z) {
    const out = [{ x: 105, z: -85, r: 82, hgt: 24 }];
    const C = 420, gx = Math.floor(x / C), gz = Math.floor(z / C);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const cx = gx + a, cz = gz + b;
      if ((cx === 0 && cz === 0) || hash3(cx, 40, cz, 41) < 0.45) continue;
      out.push({ x: cx * C + 100 + hash3(cx, 42, cz, 43) * (C - 200), z: cz * C + 100 + hash3(cx, 44, cz, 45) * (C - 200), r: 60 + hash3(cx, 46, cz, 47) * 40, hgt: 18 + hash3(cx, 48, cz, 49) * 8 });
    }
    return out;
  }

  generate(cx, cz) {
    const data = new Uint8Array(CS * CS * H);
    const n = this.noise, T = this.T, O = this.O;
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const x = cx * CS + lx, z = cz * CS + lz;
      const col = this.column(x, z);
      const top = col.h;
      const dustDepth = 2 + Math.floor(hash3(x, 7, z, 6) * 2);
      for (let y = 0; y <= top; y++) {
        let id;
        const depth = top - y;
        if (y === 0 || (y === 1 && hash3(x, y, z, 8) > 0.4) || (y === 2 && hash3(x, y, z, 9) > 0.85)) { data[idx(lx, y, lz)] = B.DEEP; continue; }
        const M = col.mars;
        if (M && M.volc > 2 && depth > 0) id = depth <= 1 && hash3(x, y, z, 50) > 0.6 ? B.DUST : (n.n3(x * 0.1, y * 0.1, z * 0.1) > 0.45 ? B.STONE : B.BLACKROCK);
        else if (M && M.volc > 2) { const pn = n.n2(x * 0.07 + 900, z * 0.07); id = top >= 50 && pn > -0.15 ? B.FROST : pn > 0.1 + M.volc * 0.02 ? B.REDDIRT : B.BLACKROCK; }
        else if (M && M.dune > 0.25 && depth <= 2 + M.dune * 2) id = B.DARKSAND;
        else if (M && M.layer > 0.3 && (depth > 0 || hash3(x, y, z, 52) > 0.45) && y > 8 && depth <= 16) {
          const s = Math.floor((y + 1.5 * n.n2(x * 0.02, z * 0.02)) / 2);
          id = [B.TANROCK, B.PALECLAY, B.TANROCK, B.PURPLEROCK, B.DUST, B.PALECLAY, B.REDDIRT][((s % 7) + 7) % 7];
          if (id === B.PALECLAY && depth <= 1 && hash3(x, y, z, 53) > 0.985) id = B.YELLOWSTONE;
        }
        else if (depth === 0) id = M && top >= 48 ? B.FROST : B.REDDIRT;
        else if (depth <= dustDepth) id = B.DUST;
        else if (T.iceShell && depth <= dustDepth + T.iceShell && n.n3(x * 0.1, y * 0.1, z * 0.1) < 0.55) id = B.ICE;
        else {
          id = B.STONE;
          if (n.n3(x * 0.08, y * 0.08, z * 0.08) > 0.5) id = B.ROCK;
          if (y < top - 3 && n.n3(x * 0.14 + 40, y * 0.14, z * 0.14) > O.iron) id = B.IRON;
          if (y > top - 12 && n.n3(x * 0.1 - 70, y * 0.14, z * 0.1) > O.ice) id = B.ICE;
          if (y < 17 && n.n3(x * 0.16 + 90, y * 0.16, z * 0.16) > O.crystal && hash3(x, y, z, 10) > 0.25) id = B.CRYSTAL;
          if (y < 14 && n.n3(x * 0.2 - 150, y * 0.2, z * 0.2 + 60) > O.gold && hash3(x, y, z, 16) > 0.3) id = B.GOLD;
        }
        if (col.floor > 0 && depth <= 3 && hash3(x, y, z, 11) < (0.25 + col.floor * 0.7) * T.floorIce) id = B.ICE;
        if (col.crystal && depth <= 1 && hash3(x, y, z, 12) > 0.45) id = B.CRYSTAL;
        if (O.glass && col.rim > 0.35 && depth <= 1 && n.n2(x * 0.15 + 500, z * 0.15) > 0.25) id = B.GLASS;
        if (O.salt && col.crack > 0.15 && depth <= 2 && hash3(x, y, z, 17) < 0.9) id = B.SALT;
        if (depth === 0 && id === B.REDDIRT && col.d0 > 9 && hash3(x, y, z, 13) > 0.94) id = B.ROCK;
        if (col.mars && depth === 0 && id === B.REDDIRT && col.rim > 0.4 && n.n2(x * 0.12 + 700, z * 0.12) > 0.35) id = B.GREENSTONE;
        // tunnels
        if (y > 3 && y < top - 4 && col.d0 > 20) {
          const a = n.n3(x * 0.045, y * 0.07, z * 0.045), b = n.n3(x * 0.045 + 200, y * 0.07, z * 0.045);
          if (a * a + b * b < 0.011) id = B.AIR;
        }
        data[idx(lx, y, lz)] = id;
      }
      // frozen seas fill the low ground
      let surf = top;
      if (T.sea && top < T.sea && col.d0 > 12) {
        if (T.liquid) {
          // a real sea: open water, with floating ice here and there
          const floe = n.n3(x * 0.08, 7.3, z * 0.08);
          if (!T.lava && (floe > 0.42 || (T.snowCaps && floe > 0.3))) { data[idx(lx, T.sea, lz)] = B.ICE; surf = T.sea; }
        } else {
          for (let y = top + 1; y <= T.sea; y++) data[idx(lx, y, lz)] = B.ICE;
          if (T.snowCaps && hash3(x, 3, z, 18) > 0.3) data[idx(lx, T.sea, lz)] = B.REDDIRT;
          surf = T.sea;
        }
      }
      // loose rocks lying on the ground (more of them near the ship, so the start is quick)
      const near = col.d0 > 13 && col.d0 < 40;
      const rockT = 1 - (1 - (near ? 0.975 : 0.988)) * T.rocks;
      if (col.floor === 0 && surf === top && col.d0 > 13 && hash3(x, 0, z, 14) > rockT && top + 1 < H) {
        data[idx(lx, top + 1, lz)] = B.ROCK;
        if (hash3(x, 1, z, 15) > 0.6 && top + 2 < H) data[idx(lx, top + 2, lz)] = B.ROCK;
      }
    }
    // old wrecks buried deep, with a supply box inside
    for (let gx = Math.floor((cx * CS - 6) / WRECK_CELL); gx <= Math.floor((cx * CS + CS + 6) / WRECK_CELL); gx++)
      for (let gz = Math.floor((cz * CS - 6) / WRECK_CELL); gz <= Math.floor((cz * CS + CS + 6) / WRECK_CELL); gz++) {
        const w = this.wreck(gx, gz); if (!w) continue;
        for (let dx = -3; dx <= 3; dx++) for (let dy = -1; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          const x = w.x + dx, y = w.y + dy, z = w.z + dz;
          if (Math.floor(x / CS) !== cx || Math.floor(z / CS) !== cz || y < 1) continue;
          const shell = Math.abs(dx) === 3 || dy === -1 || dy === 2 || Math.abs(dz) === 2;
          const torn = hash3(x, y, z, 31) > 0.78;
          let id = shell ? (torn ? B.AIR : (hash3(x, y, z, 32) > 0.5 ? B.METAL : B.SHIPDARK)) : B.AIR;
          if (dx === 0 && dy === 0 && dz === 0) id = B.SUPPLY;
          if (w.two && dx === -2 && dy === 0 && dz === 1) id = B.SUPPLY;
          data[idx(x - cx * CS, y, z - cz * CS)] = id;
        }
      }
    // the ship
    for (const [k, id] of this.structure) {
      const [x, y, z] = k.split(',').map(Number);
      if (Math.floor(x / CS) === cx && Math.floor(z / CS) === cz) data[idx(x - cx * CS, y, z - cz * CS)] = id;
    }
    // player edits
    const ed = this.edits.get(key(cx, cz));
    if (ed) for (const [i, id] of ed) data[i] = id;
    return data;
  }

  chunk(cx, cz) {
    const k = key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) { c = { cx, cz, data: this.generate(cx, cz), mesh: null, dirty: true }; this.chunks.set(k, c); }
    return c;
  }
  hasChunk(cx, cz) { return this.chunks.has(key(cx, cz)); }

  get(x, y, z) {
    if (y < 0) return B.DEEP;
    if (y >= H) return B.AIR;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    return this.chunk(cx, cz).data[idx(x - cx * CS, y, z - cz * CS)];
  }
  solid(x, y, z) { return BLOCKS[this.get(x, y, z)].solid; }

  set(x, y, z, id, record = true) {
    if (y < 0 || y >= H) return;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const c = this.chunk(cx, cz);
    const lx = x - cx * CS, lz = z - cz * CS, i = idx(lx, y, lz);
    c.data[i] = id; c.dirty = true;
    if (record) {
      const k = key(cx, cz);
      if (!this.edits.has(k)) this.edits.set(k, new Map());
      this.edits.get(k).set(i, id);
    }
    // neighbours share faces (and AO) at the border
    const mark = (ax, az) => { const n = this.chunks.get(key(ax, az)); if (n) n.dirty = true; };
    if (lx <= 1) mark(cx - 1, cz); if (lx >= CS - 2) mark(cx + 1, cz);
    if (lz <= 1) mark(cx, cz - 1); if (lz >= CS - 2) mark(cx, cz + 1);
    if (lx <= 1 && lz <= 1) mark(cx - 1, cz - 1); if (lx >= CS - 2 && lz >= CS - 2) mark(cx + 1, cz + 1);
    if (lx <= 1 && lz >= CS - 2) mark(cx - 1, cz + 1); if (lx >= CS - 2 && lz <= 1) mark(cx + 1, cz - 1);
  }

  setStructure(map) {
    for (const [k, id] of map) {
      this.structure.set(k, id);
      const [x, y, z] = k.split(',').map(Number);
      if (this.hasChunk(Math.floor(x / CS), Math.floor(z / CS))) this.set(x, y, z, id, false);
    }
  }

  surfaceY(x, z) { for (let y = H - 1; y >= 0; y--) if (this.solid(x, y, z)) return y; return 0; }

  // ---------- picking (voxel DDA) ----------
  raycast(o, d, maxDist) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tx = sx > 0 ? (x + 1 - o.x) * tdx : (o.x - x) * tdx;
    let ty = sy > 0 ? (y + 1 - o.y) * tdy : (o.y - y) * tdy;
    let tz = sz > 0 ? (z + 1 - o.z) * tdz : (o.z - z) * tdz;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxDist) {
      const id = this.get(x, y, z);
      if (BLOCKS[id].solid || BLOCKS[id].draw) return { x, y, z, nx, ny, nz, id, t };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }

  // ---------- save ----------
  serializeEdits() {
    const out = {};
    for (const [k, m] of this.edits) out[k] = Array.from(m.entries()).flat();
    return out;
  }
  loadEdits(obj) {
    this.edits.clear();
    for (const k in obj) {
      const arr = obj[k], m = new Map();
      for (let i = 0; i < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
      this.edits.set(k, m);
    }
  }
}

// ---------- meshing ----------
const FACES = [
  { dir: [-1, 0, 0], key: 'west', corners: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], key: 'east', corners: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], key: 'bottom', corners: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], key: 'top', corners: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], key: 'north', corners: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], key: 'south', corners: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] },
];
const AO = [0.52, 0.7, 0.86, 1];

const uvCache = new Map();
function faceUV(id, fkey) {
  const ck = id * 8 + FACES.findIndex(f => f.key === fkey);
  let r = uvCache.get(ck);
  if (r) return r;
  const t = BLOCKS[id].tiles;
  let name;
  if (typeof t === 'string') name = t;
  else name = t[fkey] || (fkey === 'top' ? t.top : fkey === 'bottom' ? t.bottom : t.side);
  r = tileUV(name); uvCache.set(ck, r); return r;
}

// Builds geometry for a box of cells. get(x,y,z) gives ids, with a 1-cell border.
// sx/sy/sz = size, sky = true to darken cells under cover.
export function meshVolume(get, sx, sy, sz, sky) {
  const PX = sx + 2, PY = sy + 2, PZ = sz + 2;
  const P = new Uint8Array(PX * PY * PZ);
  const pi = (x, y, z) => (x + 1) + (z + 1) * PX + (y + 1) * PX * PZ;
  for (let y = -1; y <= sy; y++) for (let z = -1; z <= sz; z++) for (let x = -1; x <= sx; x++) P[pi(x, y, z)] = get(x, y, z);
  const solidT = BLOCKS.map(b => (b && (b.solid || b.draw) ? 1 : 0));
  // opaque = hides what is behind it (windows, flags and open doors do not)
  const opaqueT = BLOCKS.map(b => (b && b.solid && !b.see ? 1 : 0));
  const S = (x, y, z) => opaqueT[P[pi(x, y, z)]];
  // column tops for sky light
  const top = new Int16Array(PX * PZ).fill(-1);
  if (sky) for (let z = -1; z <= sz; z++) for (let x = -1; x <= sx; x++) {
    for (let y = sy; y >= -1; y--) if (S(x, y, z)) { top[(x + 1) + (z + 1) * PX] = y; break; }
  }
  const open = (x, y, z) => (S(x, y, z) ? -1 : (!sky || y > top[(x + 1) + (z + 1) * PX]) ? 1 : 0);

  const pos = [], nor = [], uv = [], col = [], ind = [];
  for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const id = P[pi(x, y, z)];
    if (!solidT[id]) continue;
    for (const f of FACES) {
      const [dx, dy, dz] = f.dir;
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (S(nx, ny, nz) || (BLOCKS[id].see && P[pi(nx, ny, nz)] === id)) continue;
      const [u0, v0, u1, v1] = faceUV(id, f.key);
      const base = pos.length / 3;
      const ao = [0, 0, 0, 0];
      // the two axes along the face
      const ax = dx !== 0 ? [1, 2] : dy !== 0 ? [0, 2] : [0, 1];
      f.corners.forEach((c, k) => {
        pos.push(x + c[0], y + c[1], z + c[2]);
        nor.push(dx, dy, dz);
        uv.push(c[3] ? u1 : u0, c[4] ? v1 : v0);
        const o1 = [0, 0, 0], o2 = [0, 0, 0];
        o1[ax[0]] = c[ax[0]] * 2 - 1; o2[ax[1]] = c[ax[1]] * 2 - 1;
        const s1 = S(nx + o1[0], ny + o1[1], nz + o1[2]);
        const s2 = S(nx + o2[0], ny + o2[1], nz + o2[2]);
        const cc = S(nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]);
        const a = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
        ao[k] = a;
        let light = 1;
        if (sky) {
          let lit = 0, cnt = 0;
          const cells = [[nx, ny, nz], [nx + o1[0], ny + o1[1], nz + o1[2]], [nx + o2[0], ny + o2[1], nz + o2[2]], [nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]]];
          for (const [qx, qy, qz] of cells) { const o = open(qx, qy, qz); if (o >= 0) { cnt++; lit += o; } }
          light = 0.42 + 0.58 * (cnt ? lit / cnt : 0);
        }
        const v = AO[a] * light;
        col.push(v, v, v);
      });
      if (ao[0] + ao[3] > ao[1] + ao[2]) ind.push(base, base + 1, base + 3, base, base + 3, base + 2);
      else ind.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  g.computeBoundingSphere();
  return g;
}

export function meshChunk(world, c) {
  const ox = c.cx * CS, oz = c.cz * CS;
  return meshVolume((x, y, z) => world.get(ox + x, y, oz + z), CS, H, CS, true);
}
