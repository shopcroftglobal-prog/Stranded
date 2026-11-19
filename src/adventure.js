// Everything that happens after you land: health and air, day and night, storms,
// waves of creatures, dragons, friendly finds, the Trader, the scanner and your lost bag.
import * as THREE from 'three';
import { B, BLOCKS, ITEMS } from './blocks.js';
import { ENEMIES, BIG, makeEnemy, animateEnemy } from './enemies.js';
import {
  makeHopper, makeRockCrab, makeGlowJelly, makeGemSnail, makeGoldBeetle, makeLuckyMoth,
  makeDiggerMole, makeDustPuff, makeIceFish, makeSkyRay, makeCraterBunny, makeLostRobot, makeTrader, makeBuddy, makeDragon, animate, COLOURS,
} from './characters.js';
import { profile, saveProfile, note, wavesOn, WORLD_POWER } from './profile.js';

export const MAX_HP = 20, MAX_AIR = 100, LAST_WAVE = 50;
export const STAGES = [
  { name: 'Landing', from: 1, to: 10, reward: '3 Gold, a Gem and a Bed' },
  { name: 'First night', from: 11, to: 20, reward: '2 Storage boxes, an Air maker, and Buddy joins you' },
  { name: 'Storm', from: 21, to: 30, reward: 'Bigger fuel tank for your ship and 2 Gems' },
  { name: 'Deep dark', from: 31, to: 40, reward: 'Scanner upgrade, 4 Gold and 3 Gems' },
  { name: 'Dragon', from: 41, to: 50, reward: 'A Dragon scale, a big gold prize, and the way to new stars' },
];
export const stageOf = (n) => STAGES[Math.min(4, Math.floor((n - 1) / 10))];
// real day length (scaled down). Worlds that always face their star have no night.
const DAY = { mars: 14 * 60, moon: 30 * 60, europa: 16 * 60 };
export const DRAGONS = {
  mars: { name: 'Dust dragon', hp: 420, speed: 3.0, special: 'gust', says: 'The Dust dragon comes out of the storm!' },
  moon: { name: 'Crater dragon', hp: 460, speed: 2.6, special: 'leap', says: 'The Crater dragon leaps down from the crater rim!' },
  europa: { name: 'Ice dragon', hp: 500, speed: 2.6, special: 'shards', says: 'The ice cracks open. The Ice dragon is here!' },
  proxima: { name: 'Red sun dragon', hp: 540, speed: 2.8, special: 'flare', says: 'The star flares. The Red sun dragon wakes!' },
  trappist1e: { name: 'Sea dragon', hp: 560, speed: 3.2, special: 'dive', says: 'The Sea dragon rises out of the frozen sea!' },
  lhs1140b: { name: 'Stone dragon', hp: 700, speed: 1.7, special: 'pound', says: 'The ground shakes. The Stone dragon is coming!' },
};

// Friendly finds: where they live and what they give
export const FINDS = {
  hopper: { name: 'Hopper', make: () => makeHopper('rust'), worlds: ['mars'], w: 6, speed: 2.2, says: 'Hopper dug up some ice for you!' },
  crab: { name: 'Rock crab', make: (w) => makeRockCrab(w === 'moon' ? 'frost' : w === 'proxima' ? 'sand' : 'rock'), worlds: ['mars', 'moon', 'proxima', 'trappist1e'], w: 3, speed: 1.2 },
  jelly: { name: 'Glow jelly', make: () => makeGlowJelly('ice'), worlds: ['europa', 'lhs1140b'], w: 3, speed: 0.8, float: 1.2, says: 'The Glow jelly filled your air!' },
  snail: { name: 'Salt snail', make: () => makeGemSnail('blue'), worlds: ['europa'], w: 3, speed: 0.3, says: 'The Salt snail left a trail of salt.' },
  mole: { name: 'Gold mole', make: () => makeDiggerMole('cocoa'), worlds: ['proxima', 'lhs1140b'], w: 1.2, speed: 1.4, says: 'The Gold mole dug up gold!' },
  puff: { name: 'Dust puff', make: () => makeDustPuff('rust'), worlds: ['mars'], w: 3, speed: 3.0, storm: true, says: 'You caught a Dust puff. It shook out a fuel cell!' },
  fish: { name: 'Ice fish', make: (w, gold) => makeIceFish(gold ? 'golden' : 'blue'), worlds: ['europa', 'trappist1e', 'lhs1140b'], w: 4, speed: 0.6, ice: true },
  moth: { name: 'Star moth', make: () => makeLuckyMoth('moon'), worlds: 'all', w: 1.2, speed: 1.6, float: 1.6, dark: true, says: 'The Star moth grants a wish: double rewards on your next wave!' },
  beetle: { name: 'Shiny beetle', make: () => makeGoldBeetle('jade'), worlds: 'all', w: 1.5, speed: 3.6, deep: true, flee: true, says: 'You caught a Shiny beetle. It left a Gem!' },
  bunny: { name: 'Crater bunny', make: () => makeCraterBunny('grey'), worlds: ['moon'], w: 4, speed: 2.6, says: 'The Crater bunny dug up 2 Orange glass for you!' },
  robot: { name: 'Lost robot', make: () => makeLostRobot('rusty'), worlds: 'all', w: 0.6, speed: 0.7, says: 'You fixed the Lost robot with a Metal sheet. It gave you a Gem and 60 coins!' },
  ray: { name: 'Sky ray', make: () => makeSkyRay('sea'), worlds: ['trappist1e'], w: 2, speed: 2.5, fly: true, says: 'The Sky ray dropped a treasure box!' },
};
export const RARE_OF = { mars: [], moon: ['glass'], europa: ['salt'], proxima: ['gold'], trappist1e: [], lhs1140b: ['gold'] };

const rnd = Math.random;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function createAdventure(G) {
  const { scene, camera, sfx } = G;
  const enemies = [], shots = [], finds = [];
  let wave = null;            // the wave you are fighting
  let visitors = false;       // night visitors (do not count as a wave)
  let attackCD = 0, hurtCD = 0, sinceHurt = 99, flashT = 0;
  let trader = null, buddy = null, lostMesh = null, scanMesh = null, scanT = 0, scanCD = 0;
  let t = 0, spawnT = 3, stormFx = 0, meteorT = 0;
  const sunDir = V(25, 30, 35).normalize();
  const BASE_SUN = sunDir.clone();
  const AXIS = new THREE.Vector3().crossVectors(BASE_SUN, V(0, 1, 0)).normalize();
  const storm = new G.Cloud(scene, 1400, { color: 0xc08a6a, size: 0.9, opacity: 0.8 });
  const lightBuddy = new THREE.PointLight(0x7dffb0, 0, 14, 1.4);
  scene.add(lightBuddy);

  const W = () => G.look.planet.id;
  const S = () => G.state;
  const P = () => G.player.pos;
  const power = () => WORLD_POWER[W()] || 1;
  const fog0 = { near: 0, far: 0 };

  // ---------------------------------------------------------------- helpers
  function groundAt(x, z, fromY) {
    const w = G.world, X = Math.floor(x), Z = Math.floor(z);
    for (let y = Math.floor(fromY) + 1; y > Math.floor(fromY) - 10; y--) {
      if (w.solid(X, y, Z) && !w.solid(X, y + 1, Z) && !w.solid(X, y + 2, Z)) return y + 1;
    }
    return null;
  }
  const surface = (x, z) => G.world.surfaceY(Math.floor(x), Math.floor(z)) + 1;
  function ringSpot(r0, r1) {
    for (let k = 0; k < 12; k++) {
      const a = rnd() * Math.PI * 2, r = r0 + rnd() * (r1 - r0);
      const x = P().x + Math.cos(a) * r, z = P().z + Math.sin(a) * r;
      if (Math.hypot(x - G.shipCenter.x, z - G.shipCenter.z) < 7) continue;
      return { x, z, y: surface(x, z) };
    }
    return { x: P().x + r0, z: P().z, y: surface(P().x + r0, P().z) };
  }
  function burst(x, y, z, col, n = 1) { for (let k = 0; k < n; k++) G.bits.burst(x - 0.5, y - 0.5, z - 0.5, [new THREE.Color(col), new THREE.Color(col).multiplyScalar(0.6)]); }
  const isDark = () => daylight < 0.35 || G.covered();
  const outside = () => !G.covered();

  // ---------------------------------------------------------------- health and air
  function hurt(n, why) {
    if (S().hp <= 0 || G.godMode) return;
    const sh = profile.gear.shield ? ITEMS[profile.gear.shield].guard : 0;
    const tough = 1 - 0.08 * (profile.ups && profile.ups.armor || 0);
    const dmg = Math.max(0.5, n * (1 - sh) * tough);
    S().hp = Math.max(0, S().hp - dmg);
    sinceHurt = 0; flashT = 0.35; sfx.hurt();
    if (S().hp <= 0) fall(why);
  }
  function heal(n) { S().hp = Math.min(MAX_HP, S().hp + n); }
  function nearBlock(id, r) {
    const p = P(), w = G.world;
    for (let x = -r; x <= r; x++) for (let y = -2; y <= 3; y++) for (let z = -r; z <= r; z++)
      if (w.get(Math.floor(p.x) + x, Math.floor(p.y) + y, Math.floor(p.z) + z) === id) return true;
    return false;
  }
  let airSource = false, airCheckT = 0;
  function updateAir(dt) {
    const s = S();
    if (s.air == null) s.air = MAX_AIR;
    if (s.hp == null) s.hp = MAX_HP;
    airCheckT -= dt;
    if (airCheckT <= 0) { airCheckT = 0.5; const h = G.home(); airSource = G.nearShip() || nearBlock(B.AIRMAKER, 5) || (h.at && h.lv >= 2); }
    const temp = G.look.planet.real.tempC;
    const cold = 1 + Math.max(0, -temp - 40) / 100;           // colder worlds use up air faster
    const stormy = s.storm && s.storm.on && outside() ? 2 : 1;
    if (airSource) s.air = Math.min(MAX_AIR, s.air + 30 * dt);
    else if (!G.easy && !G.calm()) s.air = Math.max(0, s.air - (MAX_AIR / 300) * cold * stormy * dt);
    if (s.air <= 0) { hurtCD -= dt; if (hurtCD <= 0) { hurtCD = 1; hurt(1, 'air'); } }
    sinceHurt += dt;
    if (sinceHurt > 6 && s.air > 20 && s.hp < MAX_HP) heal(dt * 0.4 * (G.home().at && G.home().lv >= 1 ? 3 : 1));
  }
  // You fall: your bag stays where you were, and you wake at your bed or the ship.
  function fall(why) {
    const s = S(), p = P();
    const keep = {}, lost = {};
    for (const k in s.inv) (ITEMS[k].tool || ITEMS[k].part || k === 'scanner' ? keep : lost)[k] = s.inv[k];
    if (Object.keys(lost).length) {
      if (s.lost) for (const k in s.lost.inv) lost[k] = (lost[k] || 0) + s.lost.inv[k];
      s.lost = { x: p.x, y: p.y + 0.5, z: p.z, inv: lost };
    }
    s.inv = keep; s.order = s.order.filter(k => keep[k]); s.hotbar = s.hotbar.map(k => (k && keep[k] ? k : null));
    if (wave) failWave();
    clearVisitors();
    s.hp = MAX_HP; s.air = MAX_AIR;
    const home = s.home && G.world.get(s.home.x, s.home.y, s.home.z) === B.BED ? s.home : null;
    const flag = s.flag;
    if (home) Object.assign(p, { x: home.x + 0.5, y: home.y + 1, z: home.z + 0.5 });
    else if (flag) Object.assign(p, { x: flag.x + 1.5, y: surface(flag.x + 1, flag.z) + 0.1, z: flag.z + 0.5 });
    else Object.assign(p, { x: -9.5, y: surface(-10, 7) + 0.1, z: 7.5 });
    G.player.vel.y = 0;
    G.renderHotbar(); G.writeSave();
    G.showFall(why === 'air' ? 'You ran out of air.' : 'You were knocked out.', !!s.lost);
  }
  function updateLost(dt) {
    const s = S();
    if (!s.lost) { if (lostMesh) lostMesh.visible = false; return null; }
    if (!lostMesh) {
      lostMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), new THREE.MeshLambertMaterial({ color: 0xe08a2c, emissive: 0x7a3a10 }));
      const l = new THREE.PointLight(0xffa040, 2, 8); lostMesh.add(l); scene.add(lostMesh);
    }
    lostMesh.visible = true;
    lostMesh.position.set(s.lost.x, s.lost.y + 0.4 + Math.sin(t * 2) * 0.15, s.lost.z);
    lostMesh.rotation.y = t;
    const d = Math.hypot(P().x - s.lost.x, P().y - s.lost.y, P().z - s.lost.z);
    if (d < 2) {
      for (const k in s.lost.inv) G.give(k, s.lost.inv[k], true);
      s.lost = null; sfx.catch(); G.toast('You got your bag back!'); G.writeSave();
      return null;
    }
    return s.lost;
  }

  // ---------------------------------------------------------------- day, night and storms
  let daylight = 1;
  function updateSky(dt) {
    const s = S(), id = W(), k = G.look.sky, len = DAY[id];
    if (len) {
      s.clock = ((s.clock ?? len * 0.02) + dt) % len;
      const ang = (s.clock / len) * Math.PI * 2;
      sunDir.copy(BASE_SUN).applyAxisAngle(AXIS, ang);
      if (G.sky) G.sky.quaternion.setFromAxisAngle(AXIS, ang);
    } else { sunDir.copy(BASE_SUN); if (G.sky) G.sky.quaternion.identity(); }
    const was = daylight;
    daylight = THREE.MathUtils.smoothstep(sunDir.y, -0.12, 0.18);
    // light
    const d = daylight, st = s.storm && s.storm.on ? 1 : 0;
    stormFx += ((st && G.look.planet.real.air !== 'none' ? 1 : 0) - stormFx) * Math.min(1, dt * 1.2);
    G.sun.intensity = k.sunI * (0.05 + 0.95 * d) * (1 - stormFx * 0.5);
    G.hemi.intensity = k.hemi[2] * (0.1 + 0.9 * d);
    G.amb.intensity = k.amb[1] * (0.3 + 0.7 * d);
    const dim = 0.18 + 0.82 * d;
    G.scene.fog.color.set(k.fog).multiplyScalar(dim).lerp(new THREE.Color(0xc08a6a).multiplyScalar(dim), stormFx * 0.6);
    G.scene.background.set(k.top).multiplyScalar(dim);
    if (G.nightCover) G.nightCover.material.opacity = (1 - d) * 0.82;
    if (!fog0.far) { fog0.near = G.scene.fog.near; fog0.far = G.scene.fog.far; }
    G.scene.fog.near = fog0.near * (1 - stormFx * 0.85);
    G.scene.fog.far = fog0.far * (1 - stormFx * 0.7);
    // night begins
    if (was >= 0.35 && daylight < 0.35 && G.active()) {
      G.toast('Night is falling. Stay near your base.');
      if (!wave && !G.calm() && wavesOn(id) >= 10 && rnd() < 0.7 && !(G.home().at && G.home().lv >= 1)) startVisitors();
    }
    if (was < 0.35 && daylight >= 0.35 && G.active()) G.toast('The sun is up.');
    // storms (or meteor showers where there is no air)
    if (!s.storm) s.storm = { on: false, t: 240 + rnd() * 240 };
    if (G.active()) s.storm.t -= dt;
    if (s.storm.t <= 0) {
      s.storm.on = !s.storm.on;
      s.storm.t = s.storm.on ? 45 + rnd() * 20 : 300 + rnd() * 240;
      const airless = G.look.planet.real.air === 'none';
      if (s.storm.on) G.toast(airless ? 'Meteor shower! Get under cover.' : id === 'mars' ? 'A dust storm is coming! Get inside or near the ship.' : 'A snow storm is coming! Get inside or near the ship.');
      else G.toast(airless ? 'The meteor shower is over.' : 'The storm is over.');
    }
    if (s.storm.on) {
      if (G.look.planet.real.air === 'none') meteors(dt);
      else {
        const p = P(), col = id === 'mars' ? 0xc0704a : 0xe8eef4;
        storm.base.set(col);
        for (let i = 0; i < 24; i++) storm.emit(p.x + (rnd() - 0.5) * 30, p.y + rnd() * 10 - 2, p.z + (rnd() - 0.5) * 30, 9 + rnd() * 5, -0.5 - rnd(), 3 + rnd() * 2, 1.4);
      }
    }
    storm.update(dt, 0, (x) => Math.min(1, x * 3));
  }
  const meteorsList = [];
  function meteors(dt) {
    meteorT -= dt;
    if (meteorT <= 0) {
      meteorT = 0.6 + rnd() * 0.8;
      const a = rnd() * Math.PI * 2, r = 6 + rnd() * 26;
      const tx = P().x + Math.cos(a) * r, tz = P().z + Math.sin(a) * r;
      meteorsList.push({ p: V(tx - 30, P().y + 60, tz - 12), v: V(30, -60, 12).normalize().multiplyScalar(40) });
    }
    for (let i = meteorsList.length - 1; i >= 0; i--) {
      const m = meteorsList[i];
      m.p.addScaledVector(m.v, dt);
      G.flames.emit(m.p.x, m.p.y, m.p.z, 0, 0, 0, 0.5);
      const X = Math.floor(m.p.x), Y = Math.floor(m.p.y), Z = Math.floor(m.p.z);
      if (G.world.solid(X, Y, Z) || m.p.y < 1) {
        meteorsList.splice(i, 1);
        sfx.boom();
        for (let k = 0; k < 20; k++) G.flames.emit(m.p.x, m.p.y + 0.5, m.p.z, (rnd() - 0.5) * 6, rnd() * 6, (rnd() - 0.5) * 6, 0.6);
        const natural = [B.REDDIRT, B.DUST, B.STONE, B.ROCK, B.ICE];
        const farShip = Math.hypot(X - G.shipCenter.x, Z - G.shipCenter.z) > 10 && !G.home().inside(X, Z);
        if (farShip) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > 1) continue;
          if (natural.includes(G.world.get(X + dx, Y, Z + dz))) G.world.set(X + dx, Y, Z + dz, B.AIR);
        }
        if (farShip && rnd() < 0.35 && natural.includes(G.world.get(X, Y - 1, Z))) G.world.set(X, Y - 1, Z, B.CRYSTAL);
        if (!G.calm() && m.p.distanceTo(V(P().x, P().y + 1, P().z)) < 3) hurt(3 * power(), 'meteor');
      }
    }
  }

  // ---------------------------------------------------------------- imp camps: small villains out in the wild
  const camps = [];
  let campT = 8;
  function makeCampMark() {
    const g = new THREE.Group();
    const fire = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), new THREE.MeshLambertMaterial({ color: 0x401010, emissive: 0xff5a1a, emissiveIntensity: 1.6 }));
    fire.position.y = 0.18; g.add(fire);
    for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), new THREE.MeshLambertMaterial({ color: 0x3a2418 })); const a2 = k / 4 * Math.PI * 2; st.position.set(Math.cos(a2) * 1.4, 0.6, Math.sin(a2) * 1.4); st.rotation.z = Math.cos(a2) * 0.2; g.add(st); const sk = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshLambertMaterial({ color: 0xe8dcc0 })); sk.position.set(Math.cos(a2) * 1.4, 1.3, Math.sin(a2) * 1.4); g.add(sk); }
    const l = new THREE.PointLight(0xff6a2a, 4, 9, 1.5); l.position.y = 0.8; g.add(l);
    return g;
  }
  function updateCamps(dt) {
    if (G.calm() || wave) return;
    campT -= dt;
    for (const c of [...camps]) if (Math.hypot(c.x - P().x, c.z - P().z) > 90) removeCamp(c, false);
    if (campT > 0) return;
    campT = 25 + rnd() * 20;
    if (camps.length >= 2) return;
    const s = ringSpot(30, 48);
    if (!s || Math.hypot(s.x - G.shipCenter.x, s.z - G.shipCenter.z) < 25) return;
    const c = { x: s.x, y: s.y, z: s.z, left: 0, alerted: false, m: makeCampMark() };
    c.m.position.set(s.x, s.y, s.z); scene.add(c.m);
    const n = 2 + Math.floor(rnd() * 2) + (wavesOn(W()) >= 20 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const a2 = k / n * Math.PI * 2;
      const sp = { x: s.x + Math.cos(a2) * 2.2, z: s.z + Math.sin(a2) * 2.2 }; sp.y = surface(sp.x, sp.z);
      const e = spawnEnemy('imp', { visitor: true, spot: sp, n: wavesOn(W()) });
      e.camp = c; c.left++;
    }
    camps.push(c);
  }
  function campAlert(c) {
    if (c.alerted) return; c.alerted = true;
    sfx.roar();
    if (!profile.impSeen) { profile.impSeen = true; saveProfile(); G.banner('Gloom imps!', 'They guard a camp. Beat them all for a treasure chest.'); }
    else G.toast('Gloom imps are coming at you!');
    for (const e of enemies) if (e.camp === c) e.aggro = true;
  }
  function impDown(e) {
    const c = e.camp, gold = 6 + Math.floor(rnd() * 5) + Math.floor(wavesOn(W()) / 5);
    profile.coins += gold; saveProfile();
    G.toast(`+${gold} coins`); G.track('imp');
    c.left--;
    if (c.left <= 0) {
      const got = chest(Math.max(5, wavesOn(W()) + 1)), bonus = 40 + wavesOn(W()) * 2;
      for (const [k, n] of Object.entries(got)) G.give(k, n, true);
      if (rnd() < 0.25) G.give('gem', 1, true);
      profile.coins += bonus; saveProfile();
      sfx.win(); G.banner('Imp camp cleared!', `Treasure: ${bonus} coins and ${Object.entries(got).map(([k, n]) => n + ' ' + ITEMS[k].name).join(', ')}.`);
      burst(c.x, c.y + 1, c.z, 0xffd060);
      removeCamp(c, false);
    }
  }
  function removeCamp(c, withImps = true) {
    scene.remove(c.m); camps.splice(camps.indexOf(c), 1);
    for (const e of [...enemies]) if (e.camp === c) { if (withImps || !e.aggro) removeEnemy(e); }
  }
  // ---------------------------------------------------------------- waves
  function spawnEnemy(type, opts = {}) {
    const big = !!opts.big, boss = !!opts.boss;
    const spot = opts.spot || ringSpot(16, 24);
    let m, info;
    if (boss) {
      m = makeDragon(W()); m.scale.setScalar(1.6);
      m.userData.radius = 2.4; m.userData.height = m.userData.height * 1.6;
      info = DRAGONS[W()];
    } else { m = makeEnemy(type, W(), big); info = ENEMIES[type]; }
    scene.add(m);
    const mult = power() * (1 + (opts.n || 1) * 0.05);
    const hp = boss ? info.hp * power() : info.hp * mult * (big ? 8 : 1);
    const e = {
      type, m, big, boss, name: boss ? info.name : (big ? 'Big ' + info.name.toLowerCase() : info.name),
      hp, max: hp, hit: (boss ? 5 : info.hit * (big ? 2.5 : 1)) * Math.pow(power(), 0.6),
      speed: (boss ? info.speed : info.speed) * (big ? 0.8 : 1), pos: V(spot.x, spot.y, spot.z), vy: 0,
      cd: 1 + rnd(), shotCD: 2 + rnd() * 2, stuck: 0, far: 0, flies: !!m.userData.flies, kb: V(), wave: !opts.visitor,
      special: 5, hidden: 0, glow: 0,
    };
    if (boss && W() === 'europa') { e.pos.y -= 4; e.rise = 4; }
    enemies.push(e);
    return e;
  }
  function waveList(n) {
    if (n === LAST_WAVE) return [{ boss: true }];
    const list = [];
    if (BIG[n]) { list.push({ type: BIG[n], big: true }); }
    const count = Math.min(16, 3 + Math.floor(n * 0.45)) - (BIG[n] ? 2 : 0);
    const types = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= n);
    for (let i = 0; i < count; i++) list.push({ type: types[Math.floor(rnd() * types.length)] });
    return list;
  }
  function canStart(n) {
    const need = Math.min(5, Math.ceil(n / 10));
    const lvl = profile.gear.weapon ? ITEMS[profile.gear.weapon].weapon : 0;
    return { ok: lvl >= need, need, lvl };
  }
  function startWave(again = false) {
    if (wave) return;
    clearVisitors();
    const n = again ? LAST_WAVE : wavesOn(W()) + 1;
    if (n > LAST_WAVE) return;
    if (!canStart(n).ok) return;
    wave = { n, todo: waveList(n), spawnT: 1.5, again };
    G.closePanels();
    if (n === LAST_WAVE) { sfx.roar(); G.banner(DRAGONS[W()].name, DRAGONS[W()].says); }
    else { sfx.wave(); G.banner(`Wave ${n}`, BIG[n] ? `A big one is coming: ${('Big ' + ENEMIES[BIG[n]].name.toLowerCase())}!` : `${stageOf(n).name} · ${wave.todo.length} creatures`); }
  }
  function failWave() {
    for (const e of enemies.filter(e => e.wave)) removeEnemy(e);
    G.toast(`Wave ${wave.n} failed. Try again at the Wave beacon.`);
    wave = null;
  }
  function startVisitors() {
    visitors = true;
    const n = 2 + Math.floor(wavesOn(W()) / 10);
    for (let i = 0; i < n; i++) spawnEnemy(rnd() < 0.5 ? 'bat' : 'biter', { visitor: true, n: wavesOn(W()) });
    G.toast('Night visitors! Creatures are coming.');
  }
  function clearVisitors() { for (const e of enemies.filter(e => !e.wave && !e.camp)) removeEnemy(e); visitors = false; }
  function removeEnemy(e) { scene.remove(e.m); const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1); }
  function chest(n) {
    const st = Math.ceil(n / 10);
    const pool = ['rock', 'iron', 'ice', 'sheet', 'sheet'];
    if (st >= 2) pool.push('crystal', 'crystal');
    if (st >= 3) pool.push('gold');
    if (st >= 4) pool.push('gem', 'gold');
    const out = {};
    for (let k = 0; k < 2; k++) { const it = pool[Math.floor(rnd() * pool.length)]; out[it] = (out[it] || 0) + 1 + Math.floor(rnd() * 2); }
    if (n % 5 === 0) {
      const rare = ['gold', 'gem', ...RARE_OF[W()]];
      const it = rare[Math.floor(rnd() * rare.length)]; out[it] = (out[it] || 0) + 1;
    }
    return out;
  }
  function waveWon() {
    const n = wave.n, id = W(), again = wave.again;
    wave = null;
    G.track('wave'); if (n === LAST_WAVE) G.track('dragon');
    const x2 = profile.wish ? 2 : 1; profile.wish = false;
    let coins = Math.round((5 + n * 2) * power()) * x2;
    const items = chest(n);
    if (x2 > 1) for (const k in items) items[k] *= 2;
    const lines = [];
    if (!again) profile.waves[id] = Math.max(wavesOn(id), n);
    // first wave won each day pays double; every stage cleared pays a big bonus
    const today = new Date().toDateString();
    if (profile.firstWin !== today) { profile.firstWin = today; coins *= 2; lines.push('First win today: double coins!'); }
    if (n % 5 === 0 && n % 10 !== 0) { items.gem = (items.gem || 0) + 1; lines.push('Lucky wave: a free Gem!'); }
    if (n % 10 === 0 && !again) {
      const bonus = Math.round(150 * (n / 10) * power());
      coins += bonus; lines.push(`Stage bonus: +${bonus} coins. Spend them in the Shop (H).`);
      if (n === 10) { items.gold = (items.gold || 0) + 3; items.gem = (items.gem || 0) + 1; items.bed = 1; }
      if (n === 20) { items.box = 2; items.airmaker = 1; if (!profile.buddy) { profile.buddy = true; lines.push('Buddy the robot joins you!'); } }
      if (n === 30) { items.gem = (items.gem || 0) + 2; if (profile.ship.tank < 2) { profile.ship.tank = 2; lines.push('Your ship gets a bigger fuel tank.'); } }
      if (n === 40) { items.gem = (items.gem || 0) + 3; items.gold = (items.gold || 0) + 4; profile.scanner = Math.max(2, profile.scanner); lines.push('Your scanner now sees much further.'); }
      if (n < 50) lines.unshift(`Stage cleared: ${stageOf(n).name}!`);
    }
    if (n === LAST_WAVE) {
      coins += Math.round(400 * power());
      items.scale = 1;
      if (!again) items.trophy = 1;
      note(id, 'dragon');
      lines.unshift(`You beat the ${DRAGONS[id].name}!`);
      if (!again) lines.push('Use the Dragon scale to make a stronger engine and fly to new stars.');
    }
    profile.coins += coins;
    for (const k in items) G.give(k, items[k], true);
    saveProfile(); G.writeSave();
    sfx.cleared(); setTimeout(() => sfx.coin(), 400);
    const got = Object.entries(items).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ');
    G.waveReward({ n, coins, got, lines, again, world: id });
  }
  // damage to a creature
  function strike(e, dmg, from) {
    e.hp -= dmg;
    const away = e.pos.clone().sub(from); away.y = 0; away.normalize();
    if (!e.boss) e.kb.copy(away).multiplyScalar(e.big ? 2 : 6);
    burst(e.pos.x, e.pos.y + e.m.userData.height * 0.6, e.pos.z, e.boss ? 0xffd060 : 0xff6040);
    e.glow = 0.15;
    sfx.thud();
    if (e.hp <= 0) {
      for (let k = 0; k < (e.boss ? 8 : 2); k++) burst(e.pos.x + (rnd() - 0.5), e.pos.y + e.m.userData.height * rnd(), e.pos.z + (rnd() - 0.5), 0xffffff);
      sfx.pop();
      note(W(), e.boss ? 'dragon' : (e.big ? 'big-' : '') + e.type);
      if (!e.wave && !e.camp) { profile.coins += 2; saveProfile(); }
      if (e.camp) impDown(e);
      removeEnemy(e);
    }
  }
  // what is under the crosshair: a creature, a find, the trader
  function pick(origin, dir, maxD) {
    let best = null;
    const test = (ent, kind, center, r) => {
      const oc = center.clone().sub(origin), tt = oc.dot(dir);
      if (tt < 0 || tt > maxD + r) return;
      const d2 = oc.lengthSq() - tt * tt;
      if (d2 > r * r) return;
      if (!best || tt < best.t) best = { ent, kind, t: tt };
    };
    for (const e of enemies) if (!e.hidden) test(e, 'enemy', e.pos.clone().setY(e.pos.y + e.m.userData.height * 0.5), Math.max(0.6, e.m.userData.radius + 0.25));
    for (const f of finds) test(f, 'find', f.pos.clone().setY(f.pos.y + 0.35 + (f.float || 0)), 0.75);
    if (trader && trader.m.visible) test(trader, 'trader', trader.pos.clone().setY(trader.pos.y + 1.2), 0.9);
    return best;
  }
  function weapon() { const k = profile.gear.weapon; return k ? ITEMS[k] : { name: 'Bare hands', dmg: 1, weapon: 0 }; }
  function attack(target) {
    if (attackCD > 0) return false;
    const w = weapon();
    attackCD = 0.42;
    const pw = 1 + 0.12 * (profile.ups && profile.ups.dmg || 0);
    sfx.swing();
    G.swingArm();
    if (target && target.t <= (w.reach || 3.4) + (target.ent.m.userData.radius || 0)) {
      const e0 = target.ent, at = e0.pos.clone();
      strike(e0, w.dmg * pw, P());
      if (w.area) for (const e of [...enemies]) if (e !== e0 && e.pos.distanceTo(at) < w.area) { strike(e, w.dmg * 0.6 * pw, at); for (let k = 0; k < 6; k++) G.flames.emit(e.pos.x, e.pos.y + 0.6, e.pos.z, (rnd() - 0.5) * 3, rnd() * 3, (rnd() - 0.5) * 3, 0.5); }
      const arm = profile.gear.shield && ITEMS[profile.gear.shield];
      if (arm && arm.lifesteal) heal(arm.lifesteal);
      return true;
    }
    return false;
  }

  function moveWalker(e, dt, goal, keep) {
    const p = e.pos;
    const to = V(goal.x - p.x, 0, goal.z - p.z);
    const dist = to.length();
    let sp = dist > keep ? e.speed : (dist < keep - 2 ? -e.speed * 0.5 : 0);
    if (dist > 0.01) to.divideScalar(dist);
    const nx = p.x + to.x * sp * dt + e.kb.x * dt, nz = p.z + to.z * sp * dt + e.kb.z * dt;
    e.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
    const head = Math.floor(p.y + 0.1);
    const w = G.world;
    const climb = e.boss ? 4 : e.big ? 2 : 1;
    const g2 = groundAt(nx, nz, p.y + climb);
    if (g2 != null && g2 - p.y <= climb + 0.01) {
      p.x = nx; p.z = nz; e.stuck = Math.max(0, e.stuck - dt);
      if (g2 > p.y) p.y = g2;
    } else {
      e.stuck += dt;
      // from stage 3 on, creatures dig through weak walls
      const X = Math.floor(nx), Z = Math.floor(nz);
      if (e.stuck > 1.5 && wave && wave.n > 20 && !e.boss && !G.home().inside(X, Z)) {
        for (const y of [head, head + 1]) { const id = w.get(X, y, Z); const b = BLOCKS[id]; if (b.breakable && b.time < 2.5 && !b.ship) { w.set(X, y, Z, B.AIR); burst(X + 0.5, y + 0.5, Z + 0.5, 0x8a6a5a); } }
        e.stuck = 0;
      } else if (e.stuck > 2.5) { const y = surface(nx, nz); if (y - p.y < 10) { p.x = nx; p.z = nz; p.y = y; } e.stuck = 0; }
    }
    // gravity
    const g = groundAt(p.x, p.z, p.y);
    if (g == null || g < p.y - 0.01) { e.vy -= 20 * dt; p.y += e.vy * dt; if (g != null && p.y < g) { p.y = g; e.vy = 0; } }
    else { p.y = g; e.vy = Math.max(0, e.vy); }
    if (e.vy > 0) { p.y += e.vy * dt; e.vy -= 20 * dt; }
    if (p.y < 1) p.y = surface(p.x, p.z);
    e.m.rotation.y = Math.atan2(goal.x - p.x, goal.z - p.z);
    return Math.abs(sp) > 0 ? 1 : 0;
  }

  function dragonSpecial(e, dt, me) {
    e.special -= dt;
    if (e.special > 0) return;
    e.special = 6 + rnd() * 3;
    const kind = DRAGONS[W()].special;
    const toMe = me.clone().sub(e.pos); toMe.y = 0; const d = toMe.length(); toMe.normalize();
    if (kind === 'gust') {                               // a gust from its wings pushes you back, and the dust rises
      G.player.vel.x += toMe.x * 14; G.player.vel.z += toMe.z * 14; G.player.vel.y += 4;
      S().storm = { on: true, t: 12 }; G.toast('The Dust dragon beats its wings!');
      if (d < 10) hurt(2 * power(), 'dragon');
    } else if (kind === 'leap') {                        // a giant low-gravity jump that lands next to you
      e.vy = 14; e.leapTo = me.clone().addScaledVector(toMe, -3); G.toast('The Crater dragon leaps!');
    } else if (kind === 'shards') {                      // ice falls from the sky
      for (let k = 0; k < 8; k++) shots.push({ p: V(me.x + (rnd() - 0.5) * 8, me.y + 14 + rnd() * 4, me.z + (rnd() - 0.5) * 8), v: V(0, -16, 0), dmg: 2.5 * power(), life: 3, mesh: shotMesh(0x9fe8ff) });
      G.toast('Ice is falling!');
    } else if (kind === 'flare') {                       // glows, then breathes fire twice
      e.glow = 1.2; e.breath = 2; G.toast('The Red sun dragon flares up!');
    } else if (kind === 'dive') {                        // dives under and comes up next to you
      e.hidden = 1.6; e.m.visible = false; e.pos.copy(me).addScaledVector(toMe, -4); e.pos.y = surface(e.pos.x, e.pos.z);
      G.toast('The Sea dragon dives under the ice...');
    } else if (kind === 'pound') {                       // stamps: the ground shakes
      G.shake(0.6); sfx.boom(); G.toast('The Stone dragon stamps the ground!');
      if (d < 9 && G.player.onGround) hurt(3 * power(), 'dragon');
    }
  }
  function shotMesh(col) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: col }));
    scene.add(m); return m;
  }
  function fire(e, from, dmg, col, speed = 13) {
    const me = V(P().x, P().y + 1.1, P().z);
    const v = me.clone().sub(from).normalize().multiplyScalar(speed);
    shots.push({ p: from.clone(), v, dmg, life: 3.5, mesh: shotMesh(col) });
    sfx.shoot();
  }

  function updateEnemies(dt) {
    const me = V(P().x, P().y, P().z);
    const hm = G.home();
    for (const e of [...enemies]) {
      const ud = e.m.userData;
      let moving = 0;
      // a Shelter (home level 2) keeps night creatures out
      if (!e.wave && hm.lv >= 1 && hm.inside(e.pos.x, e.pos.z)) { burst(e.pos.x, e.pos.y + 0.6, e.pos.z, 0xffd060); removeEnemy(e); continue; }
      if (e.hidden > 0) {
        e.hidden -= dt;
        if (e.hidden <= 0) { e.m.visible = true; G.shake(0.4); sfx.roar(); for (let k = 0; k < 10; k++) burst(e.pos.x + (rnd() - 0.5) * 3, e.pos.y + 1, e.pos.z + (rnd() - 0.5) * 3, 0xbfe3f5); }
        continue;
      }
      if (e.rise > 0) { const r = Math.min(e.rise, dt * 2); e.rise -= r; e.pos.y += r; if (rnd() < 0.3) burst(e.pos.x + (rnd() - 0.5) * 3, e.pos.y + 4, e.pos.z, 0xbfe3f5); }
      else if (e.flies) {
        const goal = V(me.x, me.y + 1.4, me.z), to = goal.clone().sub(e.pos), d = to.length();
        to.normalize();
        const step = to.multiplyScalar(e.speed * dt).add(e.kb.clone().multiplyScalar(dt));
        e.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
        const n = e.pos.clone().add(step);
        if (G.world.solid(Math.floor(n.x), Math.floor(n.y), Math.floor(n.z))) n.y += e.speed * dt * 1.5;
        if (d > 1.1) e.pos.copy(n);
        e.m.rotation.y = Math.atan2(goal.x - e.pos.x, goal.z - e.pos.z);
        moving = 1;
      } else if (e.leapTo) {
        const to = e.leapTo.clone().sub(e.pos); to.y = 0;
        e.pos.addScaledVector(to, Math.min(1, dt * 1.2));
        e.pos.y += e.vy * dt; e.vy -= 14 * dt;
        const g = surface(e.pos.x, e.pos.z);
        if (e.pos.y <= g && e.vy < 0) {
          e.pos.y = g; e.leapTo = null; e.vy = 0; G.shake(0.5); sfx.boom();
          if (e.pos.distanceTo(me) < 6) hurt(3 * power(), 'dragon');
        }
      } else {
        const keep = ENEMIES[e.type]?.shoots ? 7 : e.boss ? 3.5 : 0.9 + ud.radius;
        if (e.camp) {
          const dMe = Math.hypot(me.x - e.pos.x, me.z - e.pos.z);
          if (!e.aggro && dMe < 9 && Math.abs(me.y - e.pos.y) < 5) { e.aggro = true; campAlert(e.camp); }
          if (e.aggro && dMe > 28) e.aggro = false;
          if (e.aggro) moving = moveWalker(e, dt, me, keep);
          else { const h = e.camp; const dh = Math.hypot(h.x - e.pos.x, h.z - e.pos.z); moving = dh > 2.5 ? moveWalker(e, dt, V(h.x, h.y, h.z), 1.5) : 0; if (!moving) e.m.rotation.y += dt * 0.3; }
        } else moving = moveWalker(e, dt, me, keep);
      }
      // spike traps hurt creatures that walk on them
      if (!e.flies && !e.boss) {
        e.trapT = (e.trapT || 0) - dt;
        const X = Math.floor(e.pos.x), Y = Math.floor(e.pos.y - 0.5), Z = Math.floor(e.pos.z);
        if (e.trapT <= 0 && (G.world.get(X, Y, Z) === B.SPIKES || G.world.get(X, Y + 1, Z) === B.SPIKES)) { e.trapT = 0.6; strike(e, 3, e.pos.clone().add(V(rnd() - 0.5, 0, rnd() - 0.5))); note(W(), 'trap'); if (e.hp <= 0) continue; }
      } else if (e.boss) {
        e.trapT = (e.trapT || 0) - dt;
        const X = Math.floor(e.pos.x), Y = Math.floor(e.pos.y - 0.5), Z = Math.floor(e.pos.z);
        if (e.trapT <= 0 && G.world.get(X, Y, Z) === B.SPIKES) { e.trapT = 0.6; strike(e, 6, e.pos); if (e.hp <= 0) continue; }
      }
      // attacks
      e.cd -= dt;
      const flat = Math.hypot(me.x - e.pos.x, me.z - e.pos.z), dy = me.y - e.pos.y;
      const reach = ud.radius + (e.boss ? 1.6 : 0.9);
      if ((!e.camp || e.aggro) && flat < reach && dy > -2.5 && dy < (e.boss ? 6 : 2) && e.cd <= 0) { e.cd = e.boss ? 1.6 : 1.1; hurt(e.hit, 'creature'); }
      if (ENEMIES[e.type]?.shoots && !e.boss) {
        e.shotCD -= dt;
        if (e.shotCD <= 0 && flat < 18) { e.shotCD = 2.6; fire(e, e.pos.clone().setY(e.pos.y + ud.height * 0.8), 1.5 * power(), 0x9fe8ff); }
      }
      if (e.boss) {
        dragonSpecial(e, dt, me);
        e.shotCD -= dt;
        if (e.shotCD <= 0 && flat < 26) {
          e.shotCD = e.breath ? 0.35 : 3.2;
          if (e.breath) e.breath--;
          const head = e.pos.clone().add(V(Math.sin(e.m.rotation.y) * 3, ud.height * 0.65, Math.cos(e.m.rotation.y) * 3));
          const col = new THREE.Color(COLOURS.dragon[W()].crack).getHex();
          for (let k = -1; k <= 1; k++) fire(e, head.clone().add(V(k * 0.6, 0, 0)), 2.2 * power(), col, 15);
        }
        e.glow = Math.max(0, e.glow - dt * 0.4);
      }
      if (e.glow > 0) e.glow -= dt;
      // keep them near you
      if (flat > 45 && !e.camp) { e.far += dt; if (e.far > 6) { const s = ringSpot(14, 20); e.pos.set(s.x, s.y, s.z); e.far = 0; } } else e.far = 0;
      e.m.position.copy(e.pos);
      if (e.boss) animate(e.m, t, moving); else animateEnemy(e.m, t, moving);
      const pulse = e.glow > 0 ? 1 + Math.min(1, e.glow) * 0.08 : 1;
      e.m.scale.setScalar((e.boss ? 1.6 : e.big ? 2.4 : 1) * pulse);
    }
    // shots
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt; s.p.addScaledVector(s.v, dt);
      s.mesh.position.copy(s.p); s.mesh.rotation.x += dt * 8; s.mesh.rotation.y += dt * 6;
      const hitMe = s.p.distanceTo(V(me.x, me.y + 1, me.z)) < 0.9;
      if (hitMe) hurt(s.dmg, 'shot');
      if (hitMe || s.life <= 0 || G.world.solid(Math.floor(s.p.x), Math.floor(s.p.y), Math.floor(s.p.z))) {
        scene.remove(s.mesh); s.mesh.geometry.dispose(); shots.splice(i, 1);
      }
    }
    // wave: spawn the next creatures, then check if you won
    if (wave) {
      wave.spawnT -= dt;
      const alive = enemies.filter(e => e.wave).length;
      if (wave.todo.length && wave.spawnT <= 0 && alive < 10) {
        const next = wave.todo.shift();
        spawnEnemy(next.type, { big: next.big, boss: next.boss, n: wave.n });
        wave.spawnT = 0.8 + rnd() * 0.8;
      }
      if (!wave.todo.length && !enemies.some(e => e.wave)) waveWon();
    }
    if (visitors && !enemies.some(e => !e.wave && !e.camp)) { visitors = false; G.toast('The night visitors are gone. +coins'); }
  }

  // ---------------------------------------------------------------- friendly finds
  function eligible() {
    const id = W(), s = S();
    const deep = P().y < surface(P().x, P().z) - 6;
    return Object.entries(FINDS).filter(([k, f]) => {
      if (f.worlds !== 'all' && !f.worlds.includes(id)) return false;
      if (f.storm && !(s.storm && s.storm.on)) return false;
      if (f.dark && !isDark()) return false;
      if (f.deep && !deep) return false;
      if (!f.deep && deep && !f.dark) return false;
      return true;
    });
  }
  function spawnFind() {
    const list = eligible();
    if (!list.length) return;
    let sum = list.reduce((a, [, f]) => a + f.w, 0), r = rnd() * sum, kind = list[0][0];
    for (const [k, f] of list) { r -= f.w; if (r <= 0) { kind = k; break; } }
    const f = FINDS[kind];
    let spot = null;
    if (f.deep) {
      // somewhere in the cave near you
      for (let k = 0; k < 30 && !spot; k++) {
        const x = Math.floor(P().x + (rnd() - 0.5) * 16), z = Math.floor(P().z + (rnd() - 0.5) * 16);
        const g = groundAt(x, z, P().y + 2);
        if (g != null && Math.abs(g - P().y) < 4 && Math.hypot(x - P().x, z - P().z) > 4) spot = { x: x + 0.5, y: g, z: z + 0.5 };
      }
    } else if (f.ice) {
      for (let k = 0; k < 30 && !spot; k++) {
        const s = ringSpot(10, 30);
        if (G.world.get(Math.floor(s.x), s.y - 1, Math.floor(s.z)) === B.ICE) spot = s;
      }
    } else spot = ringSpot(f.dark ? 6 : 12, f.dark ? 14 : 30);
    if (!spot) return;
    const gold = kind === 'fish' && rnd() < 0.1;
    const m = f.make(W(), gold);
    scene.add(m);
    finds.push({ kind, m, pos: V(spot.x, spot.y, spot.z), float: f.float || (f.fly ? 7 : 0), gold, dir: rnd() * 6.28, turn: 0, life: 150 });
  }
  function catchFind(fd) {
    const f = FINDS[fd.kind], id = W();
    const first = note(id, fd.kind);
    let msg = f.says || '';
    switch (fd.kind) {
      case 'hopper': G.give('ice', 3, true); break;
      case 'crab':
        if (!G.has('ice')) { if (!fd.asked) { G.toast('The Rock crab wants some ice.'); fd.asked = 4; } note(id, 'crab'); return false; }
        G.take('ice', 1); G.give('crystal', 2, true); msg = 'You fed the Rock crab some ice. It shook off 2 Purple crystals!'; break;
      case 'jelly': S().air = MAX_AIR; break;
      case 'snail': G.give('salt', 2, true); break;
      case 'mole': G.give('gold', 2, true); break;
      case 'puff': G.give('fuelcell', 1, true); break;
      case 'fish':
        if (fd.gold) { profile.coins += 80; msg = 'A golden Ice fish! The Trader will pay well: +80 coins.'; note(id, 'goldfish'); }
        else { heal(8); msg = 'You caught an Ice fish. A good meal: health up.'; }
        break;
      case 'moth': profile.wish = true; break;
      case 'beetle': G.give('gem', 1, true); break;
      case 'bunny': G.give('glass', 2, true); break;
      case 'robot':
        if (!G.has('sheet')) { if (!fd.asked) { G.toast('The Lost robot is broken. Bring a Metal sheet to fix it.'); fd.asked = 4; } note(id, 'robot'); return false; }
        G.take('sheet', 1); G.give('gem', 1, true); profile.coins += 60; break;
      case 'ray': profile.coins += 40; G.give('gem', 1, true); G.give('sheet', 2, true); msg += ' +40 coins, a Gem and 2 Metal sheets.'; break;
    }
    saveProfile();
    sfx.catch();
    G.toast((first ? 'New in your book! ' : '') + msg);
    burst(fd.pos.x, fd.pos.y + 0.5 + fd.float, fd.pos.z, 0xfff0a0);
    return true;
  }
  function updateFinds(dt) {
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = 6 + rnd() * 6; if (finds.length < 3 && !wave) spawnFind(); }
    const me = P();
    for (const fd of [...finds]) {
      const f = FINDS[fd.kind];
      fd.life -= dt;
      if (fd.asked) fd.asked = Math.max(0, fd.asked - dt);
      const d = Math.hypot(me.x - fd.pos.x, me.z - fd.pos.z);
      let mv = 0;
      fd.turn -= dt; if (fd.turn <= 0) { fd.turn = 2 + rnd() * 3; fd.dir += (rnd() - 0.5) * 2; fd.still = rnd() < 0.3; }
      let dir = fd.dir;
      if (f.flee && d < 7) { dir = Math.atan2(fd.pos.x - me.x, fd.pos.z - me.z); fd.still = false; }
      if (!fd.still && f.speed > 0) {
        const nx = fd.pos.x + Math.sin(dir) * f.speed * dt, nz = fd.pos.z + Math.cos(dir) * f.speed * dt;
        const g = f.fly ? surface(nx, nz) : groundAt(nx, nz, fd.pos.y);
        const okIce = !f.ice || G.world.get(Math.floor(nx), (g || 1) - 1, Math.floor(nz)) === B.ICE;
        if (g != null && Math.abs(g - fd.pos.y) <= 1.01 && okIce || f.fly) { fd.pos.x = nx; fd.pos.z = nz; if (g != null) fd.pos.y = g; mv = 1; }
        else fd.dir += Math.PI * (0.5 + rnd());
      }
      fd.m.position.set(fd.pos.x, fd.pos.y + fd.float, fd.pos.z);
      fd.m.userData.baseY = fd.pos.y + fd.float;
      fd.m.rotation.y = dir;
      animate(fd.m, t + fd.dir, mv);
      // walk into a find to catch it (flying ones: stand under them)
      const dy = Math.abs(me.y - fd.pos.y);
      if (d < (f.fly ? 2.5 : 1.3) && (f.fly || dy < 2.2)) {
        if (catchFind(fd)) { removeFind(fd); continue; }
      }
      if (fd.life <= 0 && d > 20 || d > 70) removeFind(fd);
    }
  }
  function removeFind(fd) { scene.remove(fd.m); finds.splice(finds.indexOf(fd), 1); }

  // ---------------------------------------------------------------- the Trader
  function updateTrader(dt) {
    const s = S();
    if (!s.won) return;
    if (!s.trader) s.trader = { here: false, t: 45 };
    s.trader.t -= dt;
    if (s.trader.t <= 0) {
      s.trader.here = !s.trader.here;
      s.trader.t = s.trader.here ? 240 : 300;
      if (s.trader.here) { G.toast('The Trader has landed by your ship!'); note(W(), 'trader'); }
      else G.toast('The Trader has left. They will be back.');
    }
    if (s.trader.here && !trader) {
      const m = makeTrader('dusk'); scene.add(m);
      const h = G.home(), f = h.lv >= 3 && h.flag;
      const x = f ? f.x + 3.5 : 7.5, z = f ? f.z + 2.5 : -6.5, y = surface(x, z);
      trader = { m, pos: V(x, y, z) };
      m.position.copy(trader.pos);
    }
    if (!s.trader.here && trader) { scene.remove(trader.m); trader = null; }
    if (trader) {
      trader.m.rotation.y = Math.atan2(P().x - trader.pos.x, P().z - trader.pos.z);
      animate(trader.m, t, 0);
    }
  }

  // ---------------------------------------------------------------- Buddy
  function updateBuddy(dt) {
    if (!profile.buddy) { lightBuddy.intensity = 0; return; }
    if (!buddy) { buddy = makeBuddy('silver'); scene.add(buddy); buddy.position.set(P().x, P().y + 2, P().z); }
    const yaw = G.player.yaw;
    const want = V(P().x + Math.cos(yaw) * 1.2 + Math.sin(yaw) * 0.6, P().y + 1.6, P().z - Math.sin(yaw) * 1.2 + Math.cos(yaw) * 0.6);
    buddy.position.lerp(want, Math.min(1, dt * 2.5));
    buddy.rotation.y = yaw;
    animate(buddy, t, 0);
    lightBuddy.position.copy(buddy.position);
    lightBuddy.intensity += ((isDark() ? 6 : 0) - lightBuddy.intensity) * Math.min(1, dt * 3);
  }

  // ---------------------------------------------------------------- scanner
  const SCAN = { [B.IRON]: 0xd9d6cf, [B.CRYSTAL]: 0xc080ff, [B.GOLD]: 0xffc23a, [B.SALT]: 0xe0805a, [B.GLASS]: 0xff9a3a, [B.SUPPLY]: 0x6aff9a };
  function scan() {
    if (!profile.scanner) { G.toast('Make a Scanner in your bag first.'); return; }
    if (scanCD > 0) { G.toast('The scanner is charging.'); return; }
    scanCD = 7; scanT = 5; sfx.scan(); G.track('scan');
    const r = profile.scanner >= 2 ? 16 : 10, p = P(), w = G.world, found = [];
    for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) {
      if (x * x + y * y + z * z > r * r) continue;
      const X = Math.floor(p.x) + x, Y = Math.floor(p.y) + y, Z = Math.floor(p.z) + z;
      if (Y < 0 || Y >= 64) continue;
      const id = w.get(X, Y, Z);
      if (SCAN[id]) found.push([X, Y, Z, id]);
    }
    found.sort((a, b) => (a[3] === B.SUPPLY ? -1 : 0) - (b[3] === B.SUPPLY ? -1 : 0));
    const n = Math.min(400, found.length);
    if (scanMesh) { scene.remove(scanMesh); scanMesh.geometry.dispose(); }
    scanMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthTest: false, depthWrite: false }), n);
    scanMesh.renderOrder = 10;
    const mtx = new THREE.Matrix4(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const [X, Y, Z, id] = found[i]; mtx.makeTranslation(X + 0.5, Y + 0.5, Z + 0.5); scanMesh.setMatrixAt(i, mtx); scanMesh.setColorAt(i, c.set(SCAN[id])); }
    scene.add(scanMesh);
    const boxes = found.filter(f => f[3] === B.SUPPLY).length;
    G.toast(boxes ? `Scanner: ${boxes} old supply box${boxes > 1 ? 'es' : ''} nearby!` : `Scanner: ${found.length} ore blocks nearby.`);
  }
  function updateScan(dt) {
    scanCD = Math.max(0, scanCD - dt);
    if (scanT > 0) { scanT -= dt; if (scanMesh) scanMesh.material.opacity = 0.5 * Math.min(1, scanT); if (scanT <= 0 && scanMesh) { scene.remove(scanMesh); scanMesh.geometry.dispose(); scanMesh = null; } }
  }

  // ---------------------------------------------------------------- per frame
  function update(dt) {
    t += dt;
    attackCD = Math.max(0, attackCD - dt);
    flashT = Math.max(0, flashT - dt);
    updateSky(dt);
    if (!G.active()) return;
    updateAir(dt);
    updateEnemies(dt);
    updateCamps(dt);
    updateFinds(dt);
    updateTrader(dt);
    updateBuddy(dt);
    updateScan(dt);
    updateLost(dt);
  }
  // leaving a world: clear everything that lives in it
  function reset() {
    for (const c of [...camps]) removeCamp(c);
    for (const e of [...enemies]) removeEnemy(e);
    for (const f of [...finds]) removeFind(f);
    for (const s of shots) scene.remove(s.mesh); shots.length = 0;
    if (trader) { scene.remove(trader.m); trader = null; }
    wave = null; visitors = false; fog0.far = 0; meteorsList.length = 0;
  }
  function sleep() {
    const s = S(), len = DAY[W()];
    if (wave || enemies.some(e => !e.camp || e.aggro)) { G.toast('You cannot sleep with creatures nearby.'); return false; }
    if (!len) { G.toast('There is no night here: the star never sets. Your bed is set as home.'); return false; }
    if (daylight > 0.5) { G.toast('You can only sleep at night. Your bed is set as home.'); return false; }
    s.clock = len * 0.02; G.toast('You slept until morning.');
    return true;
  }

  return {
    update, reset, attack, pick, scan, startWave, canStart, sleep, hurt, heal, catchFind,
    sunDir, get daylight() { return daylight; }, isDark, get camps() { return camps; }, campSoon: () => { campT = 0; },
    get wave() { return wave; }, get enemies() { return enemies; }, get finds() { return finds; },
    get flash() { return flashT; }, weapon, spawnEnemy, spawnFind,
    lost: () => S().lost, dayLength: () => DAY[W()] || 0, removeFind,
  };
}
