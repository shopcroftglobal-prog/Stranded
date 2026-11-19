// Pets: any friendly find you have caught can come along with you.
// It follows you around and brings you a small present every few minutes.
import * as THREE from 'three';
import { FINDS } from './adventure.js';
import { animate } from './characters.js';
import { profile, saveProfile } from './profile.js';

// what each pet brings, and how often (seconds of play)
export const PET_GIFTS = {
  hopper: { item: 'ice', n: 2, every: 150, text: 'digs up 2 Ice' },
  crab: { item: 'rock', n: 4, every: 120, text: 'brings 4 Rock' },
  jelly: { air: true, every: 120, text: 'fills your air' },
  snail: { item: 'salt', n: 2, every: 150, text: 'leaves 2 Salt' },
  mole: { item: 'gold', n: 1, every: 180, text: 'digs up 1 Gold' },
  puff: { item: 'fuelcell', n: 1, every: 420, text: 'shakes out a Fuel cell' },
  fish: { coins: 20, every: 150, text: 'finds 20 coins' },
  moth: { coins: 35, every: 180, text: 'finds 35 coins' },
  beetle: { item: 'gem', n: 1, every: 480, text: 'finds a Gem' },
  bunny: { item: 'glass', n: 2, every: 150, text: 'digs up 2 Orange glass' },
  robot: { item: 'metal', n: 2, every: 180, text: 'makes 2 Metal' },
  ray: { coins: 50, every: 240, text: 'brings 50 coins' },
};

// kinds you have caught on any world
export function caughtPets() {
  const out = [];
  for (const k of Object.keys(FINDS)) for (const w in profile.book) if (profile.book[w][k]) { out.push(k); break; }
  return out;
}

export function createPets(G) {
  // G: { scene, player(), world(), give(item, n), addCoins(n), fillAir(), toast(t), sfx, hidden() }
  let pet = null;                                  // { kind, m, pos, t }
  let t = 0;
  function groundAt(x, z, fromY) {
    const w = G.world(), xi = Math.floor(x), zi = Math.floor(z);
    for (let y = Math.floor(fromY) + 2; y > fromY - 6; y--) if (w.solid(xi, y - 1, zi)) return y;
    return null;
  }
  function choose(kind) {
    if (pet) { G.scene.remove(pet.m); pet = null; }
    profile.pet = kind || null;
    if (kind && !profile.petT) profile.petT = 0;
    saveProfile();
    show();
  }
  function show() {
    const k = profile.pet;
    if (!k || !FINDS[k] || pet) return;
    const m = FINDS[k].make('mars', false);
    G.scene.add(m);
    const p = G.player().pos;
    pet = { kind: k, m, pos: new THREE.Vector3(p.x + 1.5, p.y, p.z + 1.5), float: FINDS[k].fly ? 2.5 : FINDS[k].float || 0 };
  }
  function update(dt) {
    t += dt;
    if (!profile.pet) return;
    if (!pet) show();
    if (!pet) return;
    const hide = G.hidden();
    pet.m.visible = !hide;
    if (hide) return;
    const me = G.player().pos;
    const dx = me.x - pet.pos.x, dz = me.z - pet.pos.z, d = Math.hypot(dx, dz);
    let mv = 0;
    if (d > 14 || Math.abs(me.y - pet.pos.y) > 6) { pet.pos.set(me.x - 1.5, me.y, me.z - 1.5); }
    else if (d > 2.2) {
      const sp = Math.min(7, 2 + d * 0.9) * dt;
      const nx = pet.pos.x + dx / d * sp, nz = pet.pos.z + dz / d * sp;
      const g = groundAt(nx, nz, pet.pos.y);
      if (g != null && Math.abs(g - pet.pos.y) <= 1.5) pet.pos.y = g;
      else pet.pos.y += (me.y - pet.pos.y) * Math.min(1, dt * 4);
      pet.pos.x = nx; pet.pos.z = nz; mv = 1;
    }
    const yaw = d > 0.3 ? Math.atan2(dx, dz) : pet.m.rotation.y;
    pet.m.rotation.y = yaw;
    pet.m.position.set(pet.pos.x, pet.pos.y + pet.float, pet.pos.z);
    pet.m.userData.baseY = pet.pos.y + pet.float;
    animate(pet.m, t, mv);
    // presents
    const gift = PET_GIFTS[pet.kind];
    profile.petT = (profile.petT || 0) + dt;
    if (gift && profile.petT >= gift.every) {
      profile.petT = 0;
      const name = FINDS[pet.kind].name;
      if (gift.item) G.give(gift.item, gift.n);
      if (gift.coins) G.addCoins(gift.coins);
      if (gift.air) G.fillAir();
      G.sfx.coin();
      G.toast(`Your ${name} ${gift.text}!`);
      saveProfile();
    }
  }
  const nextIn = () => { const g = profile.pet && PET_GIFTS[profile.pet]; return g ? Math.max(0, Math.ceil((g.every - (profile.petT || 0)) / 60)) : 0; };
  return { choose, update, nextIn, get pet() { return pet; } };
}
