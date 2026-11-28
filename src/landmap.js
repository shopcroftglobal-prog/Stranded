// Land map (Version 31): a map of the ground you have explored on this world, seen from above.
// M (or the Map button) opens it. Shows you, the ship, your home and bed, villages you found and your signs.
// Explored ground is saved next to the world's save, so the map grows as you travel.
import { B, BLOCKS } from './blocks.js';
import { buildAtlas } from './textures.js';
import { villagesNear } from './villages.js';

const CS = 16, H = 64, MAX_CHUNKS = 1500;
const idx = (x, y, z) => x + z * CS + y * CS * CS;
const ZOOMS = [1, 2, 4];          // map pixels per block (on a 256 px map)

export function createLandMap(G) {
  let seen = new Map();            // "cx,cz" -> Uint8Array(512): top block id, then height
  let worldRef = null, keyRef = null, scanT = 0, nearT = 0, saveT = 0, dirty = false, zoom = 1;
  let colours = null, colourWorld = null;
  const storeKey = () => G.saveKey() + '-map';
  function reset() {
    seen = new Map(); dirty = false;
    try {
      const raw = localStorage.getItem(storeKey());
      if (raw) {
        const o = JSON.parse(raw);
        for (const k in o) { const s = atob(o[k]), a = new Uint8Array(512); for (let i = 0; i < 512 && i < s.length; i++) a[i] = s.charCodeAt(i); seen.set(k, a); }
      }
    } catch (e) { }
  }
  function save() {
    if (!dirty) return; dirty = false;
    const o = {};
    for (const [k, a] of seen) { let s = ''; for (let i = 0; i < 512; i++) s += String.fromCharCode(a[i]); o[k] = btoa(s); }
    try { localStorage.setItem(storeKey(), JSON.stringify(o)); } catch (e) { }
  }
  function forget() { seen = new Map(); try { localStorage.removeItem(storeKey()); } catch (e) { } }
  function record(c) {
    const a = new Uint8Array(512), d = c.data;
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      let y = H - 1;
      while (y > 0 && (!d[idx(x, y, z)] || !BLOCKS[d[idx(x, y, z)]] || !BLOCKS[d[idx(x, y, z)]].solid && !BLOCKS[d[idx(x, y, z)]].cross && !BLOCKS[d[idx(x, y, z)]].low)) y--;
      a[x + z * CS] = d[idx(x, y, z)]; a[256 + x + z * CS] = y;
    }
    seen.set(c.cx + ',' + c.cz, a); dirty = true;
  }
  function update(dt) {
    const w = G.world;
    if (!w) return;
    if (w !== worldRef || G.saveKey() !== keyRef) { if (worldRef) save(); worldRef = w; keyRef = G.saveKey(); reset(); }
    scanT -= dt; saveT -= dt;
    if (scanT <= 0) {
      // a few chunks at a time, so the game never stutters
      scanT = 0.25; nearT -= 0.25;
      const me = G.player.pos, pcx = Math.floor(me.x / CS), pcz = Math.floor(me.z / CS);
      let budget = 3;
      for (const c of w.chunks.values()) {
        if (!budget) break;
        if (!c.data || seen.has(c.cx + ',' + c.cz)) continue;
        record(c); budget--;
      }
      // the ground right around you again now and then (you may have built or dug there)
      if (nearT <= 0) {
        nearT = 3;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const c = w.chunks.get((pcx + a) + ',' + (pcz + b)); if (c && c.data) record(c); }
      }
      if (seen.size > MAX_CHUNKS) {
        const far = [...seen.keys()].map(k => { const [x, z] = k.split(',').map(Number); return [k, Math.hypot(x - pcx, z - pcz)]; }).sort((a, b) => b[1] - a[1]);
        for (let i = 0; i < seen.size - MAX_CHUNKS; i++) seen.delete(far[i][0]);
      }
    }
    if (saveT <= 0) { saveT = 20; save(); }
  }
  // the average colour of each block's top picture, for this world's palette
  function blockColours() {
    const wid = G.look.planet.id;
    if (colours && colourWorld === wid) return colours;
    const at = buildAtlas(), out = [];
    for (const b of BLOCKS) {
      if (!b) { out.push(null); continue; }
      const t = typeof b.tiles === 'string' ? b.tiles : b.tiles && (b.tiles.top || b.tiles.side);
      const cv = t && at.tileCanvases[t];
      if (!cv) { out.push([120, 110, 100]); continue; }
      const px = cv.getContext('2d').getImageData(0, 0, 16, 16).data;
      let r = 0, g = 0, bb = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0) { r += px[i]; g += px[i + 1]; bb += px[i + 2]; n++; }
      out.push(n ? [r / n, g / n, bb / n] : [120, 110, 100]);
    }
    colours = out; colourWorld = wid; return out;
  }
  function render(cv) {
    const ctx = cv.getContext('2d'), N = 256;
    cv.width = N; cv.height = N;
    const img = ctx.createImageData(N, N), D = img.data;
    const me = G.player.pos, per = ZOOMS[zoom], half = N / 2 / per;
    const x0 = me.x - half, z0 = me.z - half;
    const col = blockColours(), wl = G.waterLevel();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = Math.floor(x0 + i / per), wz = Math.floor(z0 + j / per);
      const cx = Math.floor(wx / CS), cz = Math.floor(wz / CS), a = seen.get(cx + ',' + cz);
      const o = (i + j * N) * 4;
      if (!a) { const q = ((i >> 3) + (j >> 3)) & 1 ? 30 : 26; D[o] = q; D[o + 1] = q - 4; D[o + 2] = q - 6; D[o + 3] = 255; continue; }
      const lx = wx - cx * CS, lz = wz - cz * CS, id = a[lx + lz * CS], h = a[256 + lx + lz * CS];
      let c = col[id] || [120, 110, 100];
      // light from the north-west: slopes facing it are brighter
      const hn = lz > 0 ? a[256 + lx + (lz - 1) * CS] : h, hw = lx > 0 ? a[256 + lx - 1 + lz * CS] : h;
      let k = 1 + (h - hn) * 0.08 + (h - hw) * 0.05 + (h - 30) * 0.006;
      k = Math.max(0.55, Math.min(1.4, k));
      let r = c[0] * k, g = c[1] * k, b = c[2] * k;
      if (wl != null && h < wl - 0.5) { const dpt = Math.min(1, (wl - h) / 6); r = r * (0.35 - dpt * 0.2) + 40; g = g * (0.35 - dpt * 0.2) + 110; b = b * (0.35 - dpt * 0.2) + 170; }
      D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const P = (x, z) => [(x - x0) * per, (z - z0) * per];
    const dot = (x, z, fill, r, label) => {
      let [px, py] = P(x, z); const off = px < 4 || py < 4 || px > N - 4 || py > N - 4;
      px = Math.max(5, Math.min(N - 5, px)); py = Math.max(5, Math.min(N - 5, py));
      ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(px, py, r + 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      if (label && !off) { ctx.font = "10px 'Pixelify Sans', monospace"; ctx.fillStyle = '#fff4dc'; ctx.strokeStyle = '#1c1410'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText(label, px, py - r - 4); ctx.fillText(label, px, py - r - 4); }
    };
    const S = G.state;
    // signs, villages, bed, home, ship
    for (const k in (S.signs || {})) { const [x, , z] = k.split(',').map(Number); dot(x + 0.5, z + 0.5, '#e8dcc0', 2); }
    const found = S.villages || {};
    for (const v of villagesNear(G.world, me.x, me.z)) if (found[v.x + ',' + v.z]) dot(v.x, v.z, '#ffc04a', 4, v.name);
    for (const k in found) { const [x, z] = k.split(',').map(Number); if (Math.abs(x - me.x) > 300 || Math.abs(z - me.z) > 300) dot(x, z, '#ffc04a', 4); }
    if (S.home) dot(S.home.x + 0.5, S.home.z + 0.5, '#7ad8ff', 3, 'Bed');
    if (S.flag) dot(S.flag.x + 0.5, S.flag.z + 0.5, '#8aff7a', 4, S.flag.name || 'Home');
    dot(G.shipCenter.x, G.shipCenter.z, '#ff7a4a', 5, 'Ship');
    // you: an arrow pointing the way you face
    const [mx, my] = P(me.x, me.z), yaw = G.player.yaw;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(-yaw);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1c1410'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }
  function zoomBy(d) { zoom = Math.max(0, Math.min(ZOOMS.length - 1, zoom + d)); }
  return { update, render, zoomBy, save, forget, get zoom() { return ZOOMS[zoom]; }, get explored() { return seen.size; }, record };
}
