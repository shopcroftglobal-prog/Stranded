// Food, farming and cooking (Version 28).
// You get hungry over time. Plant seeds on Farm soil, pick what grows, cook it on a Camp stove and eat it.
// Crops keep growing while you are away, like garden beds.
import { B, BLOCKS, ITEMS, CROPS, CROP_IDS, COOK_RECIPES } from './blocks.js';

export const MAX_FOOD = 20;
export const GROW_MS = 4 * 60000;            // seed to ripe, in real time
const WATER = new Set([B.ICE, B.FROST]);

export function createFarm(G) {
  const S = () => G.state;
  const crops = () => S().crops || (S().crops = {});
  const k3 = (x, y, z) => `${x},${y},${z}`;

  // ice or frost within 2 blocks of the soil = watered, grows twice as fast
  function watered(x, y, z) {
    const w = G.world;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = -1; dy <= 0; dy++)
      if (WATER.has(w.get(x + dx, y + dy, z + dz))) return true;
    return G.look.terrain.liquid && !G.look.terrain.lava && y - 1 <= G.look.terrain.sea + 1;
  }
  const growMs = (c) => GROW_MS / (c.w ? 2 : 1) / (G.homeLv() >= 2 ? 1.5 : 1);
  const stageOf = (c, now = Date.now()) => Math.min(2, Math.floor((now - c.t) / growMs(c) * 2));

  function plant(kind, x, y, z) {
    // x,y,z = the cell above the soil
    crops()[k3(x, y, z)] = { k: kind, t: Date.now(), w: watered(x, y - 1, z) };
    G.world.set(x, y, z, CROP_IDS[kind][0]);
    return crops()[k3(x, y, z)];
  }

  // Use a seed (or potato) on the top of Farm soil. Returns true if planted.
  function tryPlant(item, hit) {
    const kind = ITEMS[item].seed;
    if (!kind || !hit || hit.id !== B.SOIL || hit.ny !== 1) return false;
    const y = hit.y + 1;
    if (G.world.get(hit.x, y, hit.z) !== B.AIR) return false;
    G.take(item, 1);
    const c = plant(kind, hit.x, y, hit.z);
    G.sfx.place(); G.track('plant');
    const mins = Math.round(growMs(c) / 60000);
    G.toast(`Planted. ${CROPS[kind].name.replace(' plant', '')} will be ready in about ${mins} minute${mins > 1 ? 's' : ''}${c.w ? ' (watered by the ice close by, so twice as fast)' : '. Put ice close by to make it grow twice as fast'}.`);
    if (G.note(`crop_${kind}`)) setTimeout(() => G.toast(CROPS[kind].fact), 2600);
    return true;
  }

  // What you get for picking a crop. Ripe: food and seeds. Not ripe: the seed back.
  function pickCrop(x, y, z, id, replant) {
    const cr = BLOCKS[id].crop; if (!cr) return false;
    const C = CROPS[cr.kind];
    delete crops()[k3(x, y, z)];
    if (cr.stage < 2) {
      G.world.set(x, y, z, B.AIR);
      G.give(C.seed, 1, true);
      G.toast(`Not ripe yet. You got the ${ITEMS[C.seed].name.toLowerCase()} back.`);
      return true;
    }
    const n = C.n[0] + Math.floor(Math.random() * (C.n[1] - C.n[0] + 1));
    G.give(C.crop, n, true);
    let seeds = C.seed === C.crop ? 0 : 1 + (Math.random() < 0.5 ? 1 : 0);
    if (seeds) G.give(C.seed, seeds, true);
    G.sfx.catch(); G.track('harvest');
    let msg = `+${n} ${ITEMS[C.crop].name}${seeds ? `, +${seeds} ${ITEMS[C.seed].name}` : ''}`;
    if (replant) {
      // using a ripe crop picks it and plants it again, if you have a seed
      if (G.has(C.seed) > 0) { G.take(C.seed, 1); plant(cr.kind, x, y, z); msg += '. Planted again.'; }
      else G.world.set(x, y, z, B.AIR);
    } else G.world.set(x, y, z, B.AIR);
    G.toast(msg);
    G.note(C.crop);
    return true;
  }

  function useCrop(hit) {
    const cr = BLOCKS[hit.id].crop; if (!cr) return false;
    if (cr.stage === 2) return pickCrop(hit.x, hit.y, hit.z, hit.id, true);
    const c = crops()[k3(hit.x, hit.y, hit.z)];
    if (!c) { crops()[k3(hit.x, hit.y, hit.z)] = { k: cr.kind, t: Date.now(), w: watered(hit.x, hit.y - 1, hit.z) }; return true; }
    const left = Math.max(0, Math.ceil((c.t + growMs(c) - Date.now()) / 1000));
    G.toast(`${CROPS[cr.kind].name} is growing${c.w ? ' (watered)' : ''}. Ripe in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}.`);
    return true;
  }

  // Digging soil out from under a plant takes the plant too.
  function soilGone(x, y, z) {
    const id = G.world.get(x, y + 1, z);
    if (BLOCKS[id] && BLOCKS[id].crop) pickCrop(x, y + 1, z, id, false);
  }

  // Grow crops. Only touches chunks that are loaded.
  let t = 0;
  function update(dt) {
    t -= dt; if (t > 0) return; t = 1.5;
    const w = G.world, all = crops(), now = Date.now();
    for (const key in all) {
      const c = all[key];
      const [x, y, z] = key.split(',').map(Number);
      if (!w.hasChunk(Math.floor(x / 16), Math.floor(z / 16))) continue;
      const id = w.get(x, y, z), cr = BLOCKS[id] && BLOCKS[id].crop;
      if (!cr || cr.kind !== c.k) { delete all[key]; continue; }         // dug up or built over
      const st = stageOf(c, now);
      if (st !== cr.stage) w.set(x, y, z, CROP_IDS[c.k][st]);
    }
  }

  // ---- eating
  function eat(item) {
    const it = ITEMS[item], s = S();
    if (!it.food) return false;
    if (s.food >= MAX_FOOD && s.hp >= G.maxHp()) { G.toast('You are full.'); return true; }
    G.take(item, 1);
    s.food = Math.min(MAX_FOOD, (s.food ?? MAX_FOOD) + it.food);
    if (it.heal) G.heal(it.heal);
    if (it.air) s.air = Math.min(100, s.air + it.air);
    G.sfx.catch(); G.track('eat');
    const extra = [it.heal ? 'health' : '', it.air ? 'air' : ''].filter(Boolean);
    G.toast(`You ate ${/^[aeiou]/i.test(it.name) ? 'an' : 'a'} ${it.name}. Food${extra.length ? ', ' + extra.join(' and ') : ''} up.`);
    if (G.note(item)) { }
    return true;
  }

  // The first time you get hungry, the ship's food locker helps you out.
  function hungerTips() {
    const s = S();
    if (G.calm() || s.food == null) return;
    if (!s.locker && s.food < 13) {
      s.locker = true;
      G.give('potato', 4, true); G.give('beanseed', 2, true);
      G.banner('You are getting hungry', 'You found 4 potatoes and some bean seeds in the ship\'s food locker. Eat one now (hold it and Use), or plant them on Farm soil (make it in your bag).');
    }
  }

  // ---- the Camp stove
  function renderStove(el) {
    el.innerHTML = '';
    for (const r of COOK_RECIPES) {
      const ok = Object.entries(r.need).every(([k, n]) => G.has(k) >= n);
      const row = document.createElement('div'); row.className = 'recipe';
      const needs = Object.entries(r.need).map(([k, n]) => `<span class="${G.has(k) >= n ? 'have' : 'miss'}">${ITEMS[k].name} ${Math.min(G.has(k), n)}/${n}</span>`).join(' · ');
      const it = ITEMS[r.out];
      row.innerHTML = `<img src="${G.icon(r.out)}" alt=""><div><div class="nm">${it.name}</div><div class="needs">${needs}</div><div class="note">${r.note} Food +${it.food}${it.heal ? `, health +${it.heal}` : ''}${it.air ? `, air +${it.air}` : ''}.</div></div>`;
      const b = document.createElement('button'); b.textContent = 'Cook'; b.disabled = !ok;
      b.onclick = () => {
        if (!Object.entries(r.need).every(([k, n]) => G.has(k) >= n)) return;
        for (const [k, n] of Object.entries(r.need)) G.take(k, n);
        G.give(r.out, r.n, true); G.sfx.craft(); G.track('cook');
        G.toast(`Cooked ${ITEMS[r.out].name}!`); if (G.note(r.out)) { }
        renderStove(el); G.writeSave();
      };
      row.appendChild(b); el.appendChild(row);
    }
  }

  return { tryPlant, pickCrop, useCrop, soilGone, update, eat, hungerTips, renderStove, watered };
}
