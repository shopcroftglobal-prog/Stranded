// Taming and breeding (Version 30).
// Hold a friendly find's favourite food and Use it on the find: it is tamed and goes to live at your home
// (your Home flag, else your bed, else the ship). Feed two tamed ones of the same kind and a baby comes.
// Grown-ups bring you a little present now and then while you are home.
import * as THREE from 'three';
import { ITEMS } from './blocks.js';
import { FINDS } from './adventure.js';
import { PET_GIFTS } from './pets.js';
import { animate } from './characters.js';

export const FAVOURITE = {
  hopper: 'lettuce', crab: 'beans', jelly: 'rawfish', snail: 'lettuce', mole: 'potato', puff: 'beans',
  fish: 'beans', moth: 'fruit', beetle: 'fruit', bunny: 'lettuce', robot: 'sheet', ray: 'rawfish',
};
const MAX = 12, GROW = 300, LOVE = 30;

export function createHerd(G) {
  const S = () => G.state;
  const list = () => S().herd || (S().herd = []);       // [{ kind, baby: secondsLeft, love: secondsLeft, gift: seconds }]
  const live = new Map();                                // herd entry -> { m, pos, to, wait, yaw }
  let t = 0;
  function homeSpot() {
    const s = S();
    if (s.flag) return { x: s.flag.x + 0.5, y: s.flag.y, z: s.flag.z + 0.5 };
    if (s.home) return { x: s.home.x + 0.5, y: s.home.y, z: s.home.z + 0.5 };
    return { x: -6, y: G.world.surfaceY(-6, 6) + 1, z: 6 };
  }
  // Use with food on a wild find. Returns true if it was tamed.
  function tame(fd, item) {
    const fav = FAVOURITE[fd.kind];
    if (item !== fav) return false;
    if (list().length >= MAX) { G.toast(`Your home is full: ${MAX} tamed friends is the most.`); return true; }
    G.take(item, 1);
    list().push({ kind: fd.kind, baby: 0, love: 0, gift: 0 });
    G.sfx.catch(); G.track('tame'); G.note('tamed_' + fd.kind);
    G.toast(`You tamed a ${FINDS[fd.kind].name}! It went to live at your home. Feed two of them ${ITEMS[fav].name.toLowerCase()} for a baby.`);
    return true;
  }
  function groundAt(x, z, y0) {
    const w = G.world;
    for (let y = Math.floor(y0) + 3; y > y0 - 6; y--) if (w.solid(Math.floor(x), y - 1, Math.floor(z)) && !w.solid(Math.floor(x), y, Math.floor(z))) return y;
    return null;
  }
  function update(dt) {
    t += dt;
    const me = G.player.pos, h = homeSpot();
    const near = Math.hypot(me.x - h.x, me.z - h.z) < 60;
    const L = list();
    // grow up, fall out of love, bring presents
    for (const a of L) {
      if (a.baby > 0) a.baby = Math.max(0, a.baby - dt);
      if (a.love > 0) a.love = Math.max(0, a.love - dt);
      if (near && !a.baby) {
        a.gift += dt;
        const g = PET_GIFTS[a.kind];
        if (g && a.gift >= g.every * 2) {
          a.gift = 0;
          if (g.item) G.give(g.item, g.n, true); if (g.coins) G.addCoins(g.coins); if (g.air) S().air = 100;
          G.toast(`Your tamed ${FINDS[a.kind].name} ${g.text}!`);
        }
      }
    }
    // show them near home
    for (const [a, e] of live) if (!L.includes(a) || !near) { G.scene.remove(e.m); live.delete(a); }
    if (!near) return;
    for (const a of L) {
      let e = live.get(a);
      if (!e) {
        const m = FINDS[a.kind].make(G.look.planet.id, false); G.scene.add(m);
        const ang = Math.random() * 6.28, r = 2 + Math.random() * 4;
        const x = h.x + Math.cos(ang) * r, z = h.z + Math.sin(ang) * r;
        e = { m, pos: new THREE.Vector3(x, groundAt(x, z, h.y + 1) ?? h.y + 1, z), to: null, wait: Math.random() * 3, yaw: 0, float: FINDS[a.kind].fly ? 2 : FINDS[a.kind].float || 0 };
        live.set(a, e);
      }
      if (!e.to) {
        e.wait -= dt;
        if (e.wait <= 0) { const ang = Math.random() * 6.28, r = 1 + Math.random() * 6; e.to = new THREE.Vector3(h.x + Math.cos(ang) * r, 0, h.z + Math.sin(ang) * r); }
      } else {
        const dx = e.to.x - e.pos.x, dz = e.to.z - e.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { e.to = null; e.wait = 2 + Math.random() * 6; }
        else {
          const sp = 1.2 * dt, nx = e.pos.x + dx / d * sp, nz = e.pos.z + dz / d * sp, gy = groundAt(nx, nz, e.pos.y);
          if (gy != null && Math.abs(gy - e.pos.y) <= 1.1) { e.pos.set(nx, gy, nz); e.yaw = Math.atan2(dx, dz); } else { e.to = null; e.wait = 1; }
        }
      }
      const sc = a.baby ? 0.5 + 0.5 * (1 - a.baby / GROW) : 1;
      e.m.scale.setScalar(sc);
      e.m.position.set(e.pos.x, e.pos.y + e.float * sc + (a.love ? Math.abs(Math.sin(t * 6)) * 0.15 : 0), e.pos.z);
      e.m.userData.baseY = e.m.position.y;
      e.m.rotation.y = e.yaw;
      animate(e.m, t, e.to ? 1 : 0);
      if (a.love && Math.random() < dt * 4) G.hearts(e.pos.x, e.pos.y + 1 + e.float, e.pos.z);
    }
  }
  function pick(o, d, max) {
    let best = null; const v = new THREE.Vector3();
    for (const [a, e] of live) {
      v.set(e.pos.x - o.x, e.pos.y + 0.4 + e.float - o.y, e.pos.z - o.z);
      const tt = v.dot(d); if (tt < 0 || tt > max) continue;
      const off = Math.sqrt(Math.max(0, v.lengthSq() - tt * tt));
      if (off < 0.6 && (!best || tt < best.t)) best = { t: tt, a };
    }
    return best;
  }
  // Use on a tamed one: feed it its favourite food to fall in love
  function feed(a, item) {
    const fav = FAVOURITE[a.kind], name = FINDS[a.kind].name;
    if (a.baby) { G.toast(`This baby ${name} is still growing. ${Math.ceil(a.baby / 60)} minute${a.baby > 60 ? 's' : ''} to go.`); return; }
    if (item !== fav) { G.toast(`Your ${name} likes ${ITEMS[fav].name.toLowerCase()}. Hold some and Use to feed it.`); return; }
    if (a.love) { G.toast(`This ${name} is already looking for a partner.`); return; }
    G.take(item, 1); a.love = LOVE; G.sfx.pop();
    const mate = list().find(b => b !== a && b.kind === a.kind && b.love && !b.baby);
    if (mate) {
      if (list().length >= MAX) { G.toast(`Your home is full: ${MAX} is the most.`); return; }
      a.love = 0; mate.love = 0;
      list().push({ kind: a.kind, baby: GROW, love: 0, gift: 0 });
      G.sfx.catch(); G.track('breed'); G.note('baby_' + a.kind);
      G.banner(`A baby ${name}!`, 'It will grow up in about 5 minutes, then bring presents like the others.');
    } else G.toast(`Your ${name} is in love! Feed another ${name} within 30 seconds.`);
  }
  function clear() { for (const [, e] of live) G.scene.remove(e.m); live.clear(); }
  return { tame, feed, pick, update, clear, list, FAVOURITE };
}
