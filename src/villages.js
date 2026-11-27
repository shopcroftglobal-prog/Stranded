// Villages (Version 30): small settlements of people who came before you. Every world has one
// about 90 blocks from the ship, and more further out. Each has four houses round a well, a little
// farm, and five villagers you can trade with: a Farmer, a Cook, a Smith, a Potion maker and a Miner.
import * as THREE from 'three';
import { B, BLOCKS, ITEMS, FAMILY_ITEMS, CROP_IDS } from './blocks.js';
import { hash3 } from './noise.js';
import { makePilot, animate } from './characters.js';

const CELL = 200, R = 15;
const NAMES = ['New Hope', 'Dusty Hollow', 'Crater Rest', 'Last Stop', 'Far Field', 'Red Gate', 'Quiet Well', 'Long Walk'];
const PEOPLE = ['Amir', 'Lena', 'Tomas', 'Priya', 'Sam', 'Noor', 'Ben', 'Mei', 'Omar', 'Rosa', 'Kofi', 'Ines', 'Yuki', 'Dev', 'Hana', 'Leo'];
const SUITS4 = ['sea', 'sun', 'berry', 'frost', 'lime', 'sand'];
export const JOBS = {
  farmer: { name: 'Farmer', says: 'Fresh from the field!', trades: [
    { give: { coins: 6 }, get: { beanseed: 3 } }, { give: { coins: 8 }, get: { lettuceseed: 2 } }, { give: { coins: 6 }, get: { potato: 3 } },
    { give: { potato: 6 }, get: { coins: 10 } }, { give: { beans: 6 }, get: { coins: 8 } }, { give: { lettuce: 4 }, get: { coins: 10 } }] },
  cook: { name: 'Cook', says: 'Hungry? Sit down, eat something.', trades: [
    { give: { coins: 10 }, get: { bakedpotato: 2 } }, { give: { coins: 15 }, get: { stew: 1 } }, { give: { coins: 30 }, get: { pie: 1 } },
    { give: { rawfish: 3 }, get: { coins: 9 } }, { give: { rawfish: 2, potato: 1 }, get: { cookedfish: 2 } }] },
  smith: { name: 'Smith', says: 'I can make anything out of metal.', trades: [
    { give: { iron: 4 }, get: { sheet: 3 } }, { give: { coins: 30 }, get: { rod: 1 } }, { give: { coins: 60 }, get: { cart: 1 } },
    { give: { coins: 15 }, get: { track: 8 } }, { give: { coins: 50 }, get: { boat: 1 } }, { give: { gold: 2 }, get: { coins: 45 } }] },
  potions: { name: 'Potion maker', says: 'A little bottle can do a lot.', trades: [
    { give: { coins: 8 }, get: { bottle: 3 } }, { give: { coins: 25 }, get: { p_heal: 1 } }, { give: { coins: 30 }, get: { p_speed: 1 } },
    { give: { coins: 30 }, get: { p_jump: 1 } }, { give: { coins: 40 }, get: { p_air: 1 } }, { give: { fruit: 3 }, get: { p_heal: 1 } }] },
  miner: { name: 'Miner', says: 'Deep rock, good rock.', trades: [
    { give: { coins: 18 }, get: { crystal: 2 } }, { give: { coins: 28 }, get: { gold: 1 } }, { give: { coins: 70 }, get: { gem: 1 } },
    { give: { iron: 6 }, get: { coins: 8 } }, { give: { rock: 16 }, get: { coins: 5 } }, { give: { stone: 12 }, get: { coins: 6 } }] },
};
const HOUSE_JOB = ['farmer', 'cook', 'smith', 'potions'];
const JOB_BLOCK = { farmer: B.BOX, cook: B.STOVE, smith: B.FORGE, potions: B.BREW };

// Where the village in a big square of the map is, if there is one. Same every time for a world.
export function villageAt(world, gx, gz) {
  const c = world.villageCache || (world.villageCache = new Map());
  const k = gx + ',' + gz;
  if (c.has(k)) return c.get(k);
  let v = null;
  let x, z;
  if (gx === 0 && gz === -1) { x = 62; z = -64; }             // the first one, an easy walk from the ship
  else if (hash3(gx, 11, gz, 41) > 0.45) {
    x = gx * CELL + 30 + Math.floor(hash3(gx, 12, gz, 42) * (CELL - 60));
    z = gz * CELL + 30 + Math.floor(hash3(gx, 13, gz, 43) * (CELL - 60));
    if (Math.hypot(x, z) < 130) x = null;
  }
  if (x != null) {
    let h = 0; for (const [a, b] of [[0, 0], [8, 8], [-8, 8], [8, -8], [-8, -8]]) h += world.column(x + a, z + b).h;
    let y = Math.round(h / 5);
    const T = world.T;
    if (T.liquid) y = Math.max(y, T.sea + 2);
    y = Math.min(y, 44);
    const wid = [...(world.p.planet ? world.p.planet.id : 'x')].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 997;
    const n = Math.floor(hash3(gx + wid, 14, gz, 44) * 1e6);
    v = { x, z, y, name: NAMES[n % NAMES.length], seed: n, gx, gz };
  }
  c.set(k, v);
  return v;
}
export function villagesNear(world, x, z) {
  const out = [], gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = villageAt(world, gx + a, gz + b); if (v) out.push(v); }
  return out;
}
const HOUSES = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
function wallsOf(v, i) {
  const walls = FAMILY_ITEMS.wall, roofs = FAMILY_ITEMS.roof;
  const w = walls[(v.seed + i * 3) % walls.length][1], r = roofs[(v.seed + i) % roofs.length][1];
  return [ITEMS[w].block, ITEMS[r].block];
}
// Lay the village's blocks into one chunk
export function decorate(world, cx, cz, put) {
  const x0 = cx * 16, z0 = cz * 16;
  for (const v of villagesNear(world, x0 + 8, z0 + 8)) {
    if (x0 + 16 < v.x - R - 1 || x0 > v.x + R + 1 || z0 + 16 < v.z - R - 1 || z0 > v.z + R + 1) continue;
    for (let x = Math.max(x0, v.x - R); x < Math.min(x0 + 16, v.x + R + 1); x++) for (let z = Math.max(z0, v.z - R); z < Math.min(z0 + 16, v.z + R + 1); z++) {
      const dx = x - v.x, dz = z - v.z, y = v.y;
      // the flat ground
      for (let h = y + 1; h < y + 16; h++) put(x, h, z, B.AIR);
      for (let h = y - 4; h < y; h++) put(x, h, z, B.DUST);
      const path = Math.abs(dx) <= 1 || Math.abs(dz) <= 1;
      put(x, y, z, path ? B.BRICK : B.REDDIRT);
      // the well in the middle
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) { put(x, y, z, dx === 0 && dz === 0 ? B.ICE : B.BRICK); if (dx || dz) put(x, y + 1, z, B.BRICK); }
      if (dx === 2 && dz === 2) { put(x, y + 1, z, B.PILLAR); put(x, y + 2, z, B.PILLAR); put(x, y + 3, z, B.LAMP); }
      if (dx === -2 && dz === -2) { put(x, y + 1, z, B.PILLAR); put(x, y + 2, z, B.PILLAR); put(x, y + 3, z, B.LAMP); }
      // a little farm on the east side, watered by an ice line
      if (dx >= 12 && dx <= 14 && Math.abs(dz) >= 3 && Math.abs(dz) <= 9) {
        if (dx === 13 && Math.abs(dz) === 6) put(x, y, z, B.ICE);
        else {
          put(x, y, z, B.SOIL);
          const kinds = Object.keys(CROP_IDS), k = kinds[(v.seed + Math.abs(dz) + (dz > 0 ? 1 : 0)) % kinds.length];
          put(x, y + 1, z, CROP_IDS[k][hash3(x, y, z, 45) > 0.25 ? 2 : 1]);
        }
      }
      // the houses
      HOUSES.forEach(([hx, hz], i) => {
        const ax = dx - hx, az = dz - hz;
        if (Math.abs(ax) > 3 || Math.abs(az) > 3) return;
        const [wall, roof] = wallsOf(v, i);
        const edge = Math.abs(ax) === 3 || Math.abs(az) === 3, corner = Math.abs(ax) === 3 && Math.abs(az) === 3;
        put(x, y, z, B.FLOOR_CHECK);
        // the door faces the well
        const doorX = ax === 0 && az === -Math.sign(hz) * 3, doorZ = az === 0 && ax === -Math.sign(hx) * 3;
        for (let h = 1; h <= 4; h++) {
          let id = B.AIR;
          if (edge) id = corner ? B.BRICK : h === 1 ? B.BRICK : wall;
          if (edge && !corner && h === 2 && (Math.abs(ax) === 1 || Math.abs(az) === 1) && !(doorX || doorZ)) id = B.WINDOW;
          if (doorZ && h <= 2) id = B.DOOR; if (doorX && h <= 2) id = B.AIR;
          put(x, y + h, z, id);
        }
        put(x, y + 5, z, roof);
        if (Math.abs(ax) <= 2 && Math.abs(az) <= 2) put(x, y + 6, z, roof);
        if (Math.abs(ax) <= 1 && Math.abs(az) <= 1) put(x, y + 7, z, roof);
        if (ax === 0 && az === 0) put(x, y + 4, z, B.LAMP);
        // inside: a bed and the job's own block
        if (ax === Math.sign(hx) * 2 && az === Math.sign(hz) * 2) put(x, y + 1, z, B.BED);
        if (ax === -Math.sign(hx) * 2 && az === Math.sign(hz) * 2) put(x, y + 1, z, JOB_BLOCK[HOUSE_JOB[i]]);
      });
    }
  }
}

// ---------------------------------------------------------------- the villagers
export function createVillages(G) {
  let here = null, people = [], t = 0, checkT = 0;
  const S = () => G.state;
  function spawn(v) {
    for (const p of people) G.scene.remove(p.m);
    people = [];
    const jobs = ['farmer', 'cook', 'smith', 'potions', 'miner'];
    jobs.forEach((job, i) => {
      const m = makePilot(SUITS4[(v.seed + i) % SUITS4.length]);
      m.scale.setScalar(0.95);
      G.scene.add(m);
      const home = i < 4 ? HOUSES[i] : [0, 5];
      const p = { job, name: PEOPLE[(v.seed + i * 5) % PEOPLE.length], m, home, pos: new THREE.Vector3(v.x + home[0] * 0.5 + 0.5, v.y + 1, v.z + home[1] * 0.5 + 0.5), to: null, wait: Math.random() * 3, yaw: 0 };
      people.push(p);
    });
  }
  function update(dt) {
    t += dt; checkT -= dt;
    const me = G.player.pos;
    if (checkT <= 0) {
      checkT = 1;
      const near = villagesNear(G.world, me.x, me.z).find(v => Math.hypot(v.x - me.x, v.z - me.z) < 70) || null;
      if (near !== here) {
        here = near;
        if (here) {
          spawn(here);
          const seen = S().villages || (S().villages = {});
          const key = here.x + ',' + here.z;
          if (!seen[key]) { seen[key] = 1; G.banner(`${here.name}`, 'You found a village! Walk up to the people and Use to trade with them.'); G.note('village'); G.track('village'); }
        } else { for (const p of people) G.scene.remove(p.m); people = []; }
      }
    }
    if (!here) return;
    for (const p of people) {
      // wander about between their house and the well
      if (!p.to) {
        p.wait -= dt;
        if (p.wait <= 0) {
          const near = Math.hypot(me.x - p.pos.x, me.z - p.pos.z) < 4;
          if (near) { p.wait = 1; p.yaw = Math.atan2(me.x - p.pos.x, me.z - p.pos.z); }
          else {
            const a = Math.random() * 6.28, r = 2 + Math.random() * 9;
            p.to = new THREE.Vector3(here.x + 0.5 + Math.cos(a) * r, here.y + 1, here.z + 0.5 + Math.sin(a) * r);
          }
        }
      } else {
        const d = p.to.clone().sub(p.pos); d.y = 0;
        const L = d.length();
        if (L < 0.3) { p.to = null; p.wait = 2 + Math.random() * 5; }
        else {
          const sp = 1.4 * dt, nx = p.pos.x + d.x / L * sp, nz = p.pos.z + d.z / L * sp;
          if (!G.world.solid(Math.floor(nx), Math.floor(p.pos.y), Math.floor(nz)) && !G.world.solid(Math.floor(nx), Math.floor(p.pos.y) + 1, Math.floor(nz))) { p.pos.x = nx; p.pos.z = nz; p.yaw = Math.atan2(d.x, d.z); }
          else { p.to = null; p.wait = 1; }
        }
      }
      p.m.position.copy(p.pos); p.m.rotation.y = p.yaw;
      animate(p.m, t, p.to ? 1 : 0);
    }
  }
  // the villager under the aim line
  function pick(o, d, max) {
    let best = null;
    const v = new THREE.Vector3();
    for (const p of people) {
      v.set(p.pos.x - o.x, p.pos.y + 0.9 - o.y, p.pos.z - o.z);
      const t = v.dot(d); if (t < 0 || t > max) continue;
      const off = Math.sqrt(Math.max(0, v.lengthSq() - t * t));
      if (off < 0.55 && (!best || t < best.t)) best = { t, p };
    }
    return best;
  }
  // ---- trading
  let open = null;
  const afford = (give) => Object.entries(give).every(([k, n]) => (k === 'coins' ? G.coins() : G.has(k)) >= n);
  const words = (o) => Object.entries(o).map(([k, n]) => k === 'coins' ? `${n} coins` : `${n} ${ITEMS[k].name}`).join(' + ');
  function render(el, head) {
    if (!open) return;
    const J = JOBS[open.job];
    const friend = (S().vtrades || 0) >= 10;
    head.textContent = `${open.name} the ${J.name}`;
    el.innerHTML = `<p class="sub">"${J.says}" · You have ${G.coins()} coins.${friend ? ' You are a friend of the village: coin prices are 10% lower.' : ` Trade ${10 - (S().vtrades || 0)} more times to become a friend of the village.`}</p>`;
    const list = document.createElement('div'); list.className = 'recipes';
    for (const tr of J.trades) {
      const give = { ...tr.give }; if (friend && give.coins) give.coins = Math.max(1, Math.round(give.coins * 0.9));
      const out = Object.keys(tr.get)[0];
      const row = document.createElement('div'); row.className = 'recipe';
      row.innerHTML = `<img src="${out === 'coins' ? G.icon('goldblock') : G.icon(out)}" alt=""><div><div class="nm">${words(tr.get)}</div><div class="needs"><span class="${afford(give) ? 'have' : 'miss'}">for ${words(give)}</span></div></div>`;
      const b = document.createElement('button'); b.textContent = 'Trade'; b.disabled = !afford(give);
      b.onclick = () => {
        if (!afford(give)) return;
        for (const [k, n] of Object.entries(give)) k === 'coins' ? G.addCoins(-n) : G.take(k, n);
        for (const [k, n] of Object.entries(tr.get)) k === 'coins' ? G.addCoins(n) : G.give(k, n, true);
        S().vtrades = (S().vtrades || 0) + 1;
        G.sfx.coin(); G.track('trade'); G.toast(`Traded: +${words(tr.get)}`);
        if (S().vtrades === 10) G.banner('Friend of the village', 'Coin prices are 10% lower with every villager now.');
        render(el, head); G.writeSave();
      };
      row.appendChild(b); list.appendChild(row);
    }
    el.appendChild(list);
  }
  function talk(p) { open = p; G.openPanel('villagePanel'); }
  function clear() { for (const p of people) G.scene.remove(p.m); people = []; here = null; }
  return { update, pick, talk, render, clear, get here() { return here; }, get people() { return people; } };
}
