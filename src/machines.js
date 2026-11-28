// Wiring, fishing, boats and mine carts (Version 29).
// Wiring: a Switch, Step plate or Blinker sends power along Wire to doors, castle gates and Wire lamps next to it.
// Fishing: cast into the sea, or through ice on icy worlds, wait for the bite, then pull.
// Boats sail on open water; Mine carts ride along Track. Both go back in your bag when you get off.
import * as THREE from 'three';
import { B, BLOCKS, ITEMS } from './blocks.js';

const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const ON = { [B.DOOR]: B.DOOR_OPEN, [B.DOOR_OPEN]: B.DOOR_OPEN, [B.GATE]: B.GATE_OPEN, [B.GATE_OPEN]: B.GATE_OPEN, [B.WLAMP]: B.WLAMP_ON, [B.WLAMP_ON]: B.WLAMP_ON };
const OFF = { [B.DOOR]: B.DOOR, [B.DOOR_OPEN]: B.DOOR, [B.GATE]: B.GATE, [B.GATE_OPEN]: B.GATE, [B.WLAMP]: B.WLAMP, [B.WLAMP_ON]: B.WLAMP };
// worlds with fish: the sea worlds, and icy worlds where you fish through the ice
const FISH_WORLDS = ['europa', 'trappist1e', 'lhs1140b', 'tide', 'glass'];

export function createMachines(G) {
  const S = () => G.state;
  const k3 = (x, y, z) => `${x},${y},${z}`;
  const parts = () => S().wires || (S().wires = {});        // every switch, plate, wire and blinker you placed
  const isTrack = (id) => BLOCKS[id] && BLOCKS[id].track;

  // ---------------------------------------------------------------- wiring
  function placed(x, y, z, id) {
    const b = BLOCKS[id];
    if (b && (b.power === 'source' || b.power === 'wire')) { parts()[k3(x, y, z)] = 1; dirty = true; }
    if (b && b.power === 'device') dirty = true;
  }
  function removed(x, y, z) { if (parts()[k3(x, y, z)]) { delete parts()[k3(x, y, z)]; dirty = true; } }
  function toggleSwitch(hit) {
    G.world.set(hit.x, hit.y, hit.z, hit.id === B.SWITCH ? B.SWITCH_ON : B.SWITCH);
    parts()[k3(hit.x, hit.y, hit.z)] = 1;
    G.sfx.pop(); dirty = true; solve();
    G.track('switch');
  }
  let dirty = true, tickT = 0, blinkT = 0;
  function solve() {
    dirty = false;
    const w = G.world, all = parts(), s = S();
    const powered = new Set(), devices = new Set(), seen = new Set();
    const queue = [];
    for (const key in all) {
      const [x, y, z] = key.split(',').map(Number);
      if (!w.hasChunk(Math.floor(x / 16), Math.floor(z / 16))) continue;
      const id = w.get(x, y, z), b = BLOCKS[id];
      if (!b || !b.power || b.power === 'device') { delete all[key]; continue; }
      if (id === B.SWITCH_ON || id === B.PLATE_ON || id === B.BLINKER_ON) { queue.push([x, y, z, 0]); seen.add(key); }
    }
    while (queue.length) {
      const [x, y, z, d] = queue.shift();
      powered.add(k3(x, y, z));
      for (const [dx, dy, dz] of N6) {
        const nx = x + dx, ny = y + dy, nz = z + dz, nk = k3(nx, ny, nz);
        const id = w.get(nx, ny, nz), b = BLOCKS[id];
        if (b && b.power === 'device') devices.add(nk);
        if (b && b.power === 'wire' && !seen.has(nk) && d < 64) { seen.add(nk); queue.push([nx, ny, nz, d + 1]); }
      }
      // wire also runs up and down one step
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [1, -1]) {
        const nx = x + dx, ny = y + dy, nz = z + dz, nk = k3(nx, ny, nz);
        if (!seen.has(nk) && BLOCKS[w.get(nx, ny, nz)].power === 'wire' && d < 64) { seen.add(nk); queue.push([nx, ny, nz, d + 1]); }
      }
    }
    // wires glow when powered
    for (const key in all) {
      const [x, y, z] = key.split(',').map(Number), id = w.get(x, y, z);
      if (id === B.WIRE && powered.has(key)) w.set(x, y, z, B.WIRE_ON);
      else if (id === B.WIRE_ON && !powered.has(key)) w.set(x, y, z, B.WIRE);
    }
    // turn things on, and turn off what we turned on before
    const before = s.powered || [];
    for (const key of devices) { const [x, y, z] = key.split(',').map(Number), id = w.get(x, y, z); if (ON[id] && ON[id] !== id) { w.set(x, y, z, ON[id]); if (id === B.DOOR || id === B.GATE) G.sfx.place(); } }
    for (const key of before) if (!devices.has(key)) { const [x, y, z] = key.split(',').map(Number), id = w.get(x, y, z); if (OFF[id] && OFF[id] !== id) w.set(x, y, z, OFF[id]); }
    s.powered = [...devices];
  }
  function updateWiring(dt) {
    const all = parts();
    let any = false; for (const _ in all) { any = true; break; }
    if (!any && !(S().powered && S().powered.length)) return;
    tickT -= dt; blinkT -= dt;
    if (tickT > 0) return;
    tickT = 0.12;
    const w = G.world;
    // step plates: on while you or a creature stands on them; blinkers flip every second
    const blink = blinkT <= 0; if (blink) blinkT = 1;
    const feet = [G.player.pos, ...G.creatures()];
    for (const key in all) {
      const [x, y, z] = key.split(',').map(Number), id = w.get(x, y, z);
      if (id === B.PLATE || id === B.PLATE_ON) {
        const on = feet.some(p => Math.floor(p.x) === x && Math.floor(p.z) === z && p.y >= y - 0.2 && p.y < y + 1.2);
        if (on !== (id === B.PLATE_ON)) { w.set(x, y, z, on ? B.PLATE_ON : B.PLATE); dirty = true; if (on) G.sfx.pop(); }
      } else if (blink && (id === B.BLINKER || id === B.BLINKER_ON)) { w.set(x, y, z, id === B.BLINKER ? B.BLINKER_ON : B.BLINKER); dirty = true; }
    }
    if (dirty) solve();
  }

  // ---------------------------------------------------------------- fishing
  const bobber = new THREE.Group();
  {
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), new THREE.MeshLambertMaterial({ color: 0xd03a2a, emissive: 0x401008 }));
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.22), new THREE.MeshLambertMaterial({ color: 0xf3f0ea }));
    top.position.y = 0.12; bobber.add(red, top); bobber.visible = false; G.scene.add(bobber);
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8e8f0, transparent: true, opacity: 0.7 }));
  line.visible = false; line.frustumCulled = false; G.scene.add(line);
  let fish = null;   // { x, y, z, wait, bite, ice }
  function waterSpot(o, d) {
    // where the aim line meets the sea, if there is one
    const lv = G.waterLevel();
    if (lv == null || d.y >= -0.02) return null;
    const t = (lv - o.y) / d.y;
    if (t < 0.5 || t > 14) return null;
    const x = o.x + d.x * t, z = o.z + d.z * t;
    if (G.world.solid(Math.floor(x), Math.floor(lv + 0.3), Math.floor(z))) return null;
    return { x, y: lv, z };
  }
  // Use with the rod. Returns true if the rod did something.
  function useRod(o, d, hit) {
    if (fish && fish.bite > 0) return pull();
    if (fish) { G.toast('Wait for a bite...'); return true; }
    const id = G.look.planet.id;
    let spot = waterSpot(o, d);
    if (hit && (!spot || hit.t < Math.hypot(spot.x - o.x, spot.y - o.y, spot.z - o.z)) && (hit.id === B.ICE || hit.id === B.FROST) && hit.ny === 1) spot = { x: hit.x + 0.5, y: hit.y + 1.02, z: hit.z + 0.5, ice: true };
    if (!spot) { G.toast(G.waterLevel() != null ? 'Aim the rod at open water.' : 'Aim at the sea, or at the top of some ice, to fish.'); return true; }
    if (!FISH_WORLDS.includes(id)) { G.toast(`No fish live on ${G.look.planet.name}. Try a world with a sea or thick ice, like Europa.`); return true; }
    fish = { ...spot, wait: 3 + Math.random() * 6, bite: 0, t: 0 };
    bobber.position.set(spot.x, spot.y, spot.z); bobber.visible = true; line.visible = true;
    G.sfx.swing(); G.swingArm();
    G.toast(spot.ice ? 'You made a hole in the ice and dropped your line. Wait for a bite...' : 'Cast! Wait for a bite...');
    return true;
  }
  function pull() {
    const r = Math.random(), id = G.look.planet.id;
    let msg;
    if (r < 0.62) { const n = Math.random() < 0.3 ? 2 : 1; G.give('rawfish', n, true); msg = `You caught ${n === 2 ? '2 fish' : 'a fish'}! +${n} Raw fish.`; }
    else if (r < 0.74) { const c = 10 + Math.floor(Math.random() * 25); G.addCoins(c); msg = `A shiny fish! The Trader would pay for it: +${c} coins.`; }
    else if (r < 0.84) { const k = ['beanseed', 'lettuceseed', 'potato'][Math.floor(Math.random() * 3)]; G.give(k, 2, true); msg = `You pulled up a lost seed bag: +2 ${ITEMS[k].name}.`; }
    else if (r < 0.88) { G.give('gem', 1, true); msg = 'Something glitters on the hook: a Gem!'; }
    else if (r < 0.9) { G.addCoins(100); msg = 'A golden fish! +100 coins.'; G.note('goldfish'); }
    else { G.give('oldcan', 1, true); msg = 'Just an Old can. Someone dropped it here long ago.'; }
    G.sfx.catch(); G.track('fish'); G.note('fishing');
    G.toast(msg);
    stopFishing();
    return true;
  }
  function stopFishing() { fish = null; bobber.visible = false; line.visible = false; }
  function updateFishing(dt) {
    if (!fish) return;
    const p = G.player.pos;
    if (Math.hypot(p.x - fish.x, p.z - fish.z) > 16 || G.held() !== 'rod') { stopFishing(); return; }
    fish.t += dt;
    const pos = line.geometry.attributes.position;
    const hand = G.handPos();
    pos.setXYZ(0, hand.x, hand.y, hand.z); pos.setXYZ(1, bobber.position.x, bobber.position.y + 0.12, bobber.position.z); pos.needsUpdate = true;
    if (fish.bite > 0) {
      fish.bite -= dt;
      bobber.position.y = fish.y - 0.12 + Math.sin(fish.t * 30) * 0.05;
      if (fish.bite <= 0) { G.toast('It got away. Try again!'); stopFishing(); }
      return;
    }
    bobber.position.y = fish.y + Math.sin(fish.t * 2.5) * 0.04;
    fish.wait -= dt;
    if (fish.wait <= 0) { fish.bite = 1.6; G.sfx.pop(); G.toast(G.touch ? 'A bite! Tap Use now!' : 'A bite! Right click now!'); G.splash(fish.x, fish.y, fish.z); }
  }

  // ---------------------------------------------------------------- boats
  const boatM = (() => {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a34 }), dark = new THREE.MeshLambertMaterial({ color: 0x5a3a24 }), trim = new THREE.MeshLambertMaterial({ color: 0xc4562a });
    const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    box(1.3, 0.12, 2.4, dark, 0, 0.05, 0);                       // bottom
    box(0.12, 0.42, 2.4, wood, -0.65, 0.3, 0); box(0.12, 0.42, 2.4, wood, 0.65, 0.3, 0);
    box(1.3, 0.42, 0.12, wood, 0, 0.3, 1.2); box(1.0, 0.42, 0.12, wood, 0, 0.3, -1.25);
    box(0.7, 0.3, 0.3, wood, 0, 0.3, -1.42);                     // the pointed front
    box(1.42, 0.08, 2.5, trim, 0, 0.52, 0).scale.set(1, 1, 1);
    const mast = box(0.08, 2.2, 0.08, dark, 0, 1.3, -0.3);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshLambertMaterial({ color: 0xf3e6dc, side: THREE.DoubleSide }));
    sail.position.set(0, 1.5, 0.22); sail.rotation.y = Math.PI / 2; g.add(sail);
    g.children[5].visible = true; mast.castShadow = true;
    g.visible = false; G.scene.add(g); return g;
  })();
  const ride = { kind: null, speed: 0, cell: null, dir: null, t: 0, from: null, to: null };
  function startBoat(o, d) {
    const spot = waterSpot(o, d);
    if (!spot) { G.toast(G.waterLevel() != null ? 'Aim the boat at open water close by.' : 'There is no open water on this world for a boat.'); return true; }
    G.take('boat', 1);
    Object.assign(ride, { kind: 'boat', speed: 0 });
    const p = G.player.pos; p.x = spot.x; p.z = spot.z; p.y = spot.y - 0.25; G.player.vel.x = G.player.vel.z = G.player.vel.y = 0;
    boatM.visible = true; G.sfx.craft(); G.track('boat'); G.note('boat');
    G.toast(G.touch ? 'Sailing! Push the pad up to go, left and right to turn. Jump to get off.' : 'Sailing! W to go, S to slow down, A and D to turn. Space to get off.');
    return true;
  }
  function updateBoat(dt, input) {
    const p = G.player.pos, lv = G.waterLevel();
    if (lv == null) { getOff(); return; }
    G.player.yaw -= input.r * 1.8 * dt;
    const want = input.f > 0 ? 8 * input.f : input.f < 0 ? -2.5 : 0;
    ride.speed += (want - ride.speed) * Math.min(1, dt * (input.f ? 1.2 : 0.6));
    const sin = Math.sin(G.player.yaw), cos = Math.cos(G.player.yaw);
    const nx = p.x - sin * ride.speed * dt, nz = p.z - cos * ride.speed * dt;
    const blocked = (x, z) => G.world.solid(Math.floor(x), Math.floor(lv + 0.3), Math.floor(z));
    if (!blocked(nx + -sin * 0.9, nz + -cos * 0.9) && !blocked(nx, nz)) { p.x = nx; p.z = nz; }
    else { ride.speed *= -0.2; G.toast(G.touch ? 'Bump! Jump to get off onto land.' : 'Bump! Press Space to get off onto land.'); }
    p.y = lv - 0.25 + Math.sin(performance.now() / 600) * 0.05;
    boatM.position.set(p.x, lv - 0.32, p.z); boatM.rotation.set(Math.sin(performance.now() / 700) * 0.04, G.player.yaw, 0);
    if (input.jump) getOff();
  }

  // ---------------------------------------------------------------- mine carts
  const cartM = (() => {
    const g = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color: 0x5c6068 }), rim = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }), band = new THREE.MeshLambertMaterial({ color: 0xe08a2c }), wheel = new THREE.MeshLambertMaterial({ color: 0x1e1e22 });
    const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    box(0.9, 0.08, 1.1, body, 0, 0.2, 0);
    box(0.08, 0.5, 1.1, body, -0.45, 0.45, 0); box(0.08, 0.5, 1.1, body, 0.45, 0.45, 0);
    box(0.9, 0.5, 0.08, body, 0, 0.45, 0.55); box(0.9, 0.5, 0.08, body, 0, 0.45, -0.55);
    box(1.0, 0.06, 1.2, rim, 0, 0.72, 0); box(0.94, 0.08, 1.14, band, 0, 0.5, 0);
    for (const x of [-0.42, 0.42]) for (const z of [-0.36, 0.36]) box(0.1, 0.22, 0.22, wheel, x, 0.12, z);
    g.visible = false; G.scene.add(g); return g;
  })();
  function trackAt(x, y, z) {
    for (const dy of [0, 1, -1]) if (isTrack(G.world.get(x, y + dy, z))) return y + dy;
    return null;
  }
  function startCart(hit) {
    if (!hit || !isTrack(hit.id)) { G.toast('Aim the Mine cart at a Track.'); return true; }
    G.take('cart', 1);
    const yaw = G.player.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let dir = Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
    Object.assign(ride, { kind: 'cart', speed: 0, cell: [hit.x, hit.y, hit.z], dir, t: 0, from: [hit.x, hit.y, hit.z], to: null });
    ride.to = nextCell(ride.from, dir);
    const p = G.player.pos; p.x = hit.x + 0.5; p.y = hit.y + 0.3; p.z = hit.z + 0.5;
    cartM.visible = true; G.sfx.craft(); G.track('cart'); G.note('cart');
    G.toast(G.touch ? 'All aboard! Push the pad up to go, down to brake. Jump to get off.' : 'All aboard! W to go, S to brake. Space to get off.');
    return true;
  }
  // the next cell along the track: straight on if it can, else turn left or right, else stop
  function nextCell(c, dir) {
    const tries = [dir, [-dir[1], dir[0]], [dir[1], -dir[0]]];
    for (const d of tries) {
      const y = trackAt(c[0] + d[0], c[1], c[2] + d[1]);
      if (y != null) return { cell: [c[0] + d[0], y, c[2] + d[1]], dir: d };
    }
    return null;
  }
  function updateCart(dt, input) {
    const w = G.world, p = G.player.pos;
    const here = w.get(ride.from[0], ride.from[1], ride.from[2]);
    if (!isTrack(here)) { getOff(); return; }
    const fast = BLOCKS[here].track === 2;
    const top = fast ? 16 : 9;
    if (input.f > 0) ride.speed = Math.min(top, ride.speed + dt * 6 * input.f);
    else if (input.f < 0) ride.speed = Math.max(0, ride.speed - dt * 12);
    else ride.speed = Math.max(0, ride.speed - dt * 0.8);
    if (fast) ride.speed = Math.min(16, ride.speed + dt * 14);
    if (ride.to && ride.to.cell[1] > ride.from[1]) ride.speed = Math.max(fast ? 6 : 2, ride.speed - dt * 4);       // uphill
    if (ride.to && ride.to.cell[1] < ride.from[1]) ride.speed = Math.min(top + 3, ride.speed + dt * 6);             // downhill
    if (!ride.to) { ride.speed = 0; ride.to = nextCell(ride.from, ride.dir) || nextCell(ride.from, [-ride.dir[0], -ride.dir[1]]); if (ride.to && input.f <= 0) ride.to = null; }
    if (ride.to) {
      ride.t += ride.speed * dt;
      while (ride.t >= 1 && ride.to) {
        ride.t -= 1;
        ride.from = ride.to.cell; ride.dir = ride.to.dir;
        ride.to = nextCell(ride.from, ride.dir);
        if (!ride.to) { ride.t = 0; if (ride.speed > 3) G.toast('End of the track.'); ride.speed = 0; }
      }
    }
    const a = ride.from, b = ride.to ? ride.to.cell : ride.from, t = ride.to ? ride.t : 0;
    p.x = a[0] + 0.5 + (b[0] - a[0]) * t; p.z = a[2] + 0.5 + (b[2] - a[2]) * t; p.y = a[1] + (b[1] - a[1]) * t + 0.3;
    G.player.vel.x = G.player.vel.y = G.player.vel.z = 0;
    const yaw = Math.atan2(-ride.dir[0], -ride.dir[1]);
    cartM.position.set(p.x, p.y - 0.25, p.z);
    let dy = yaw - cartM.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cartM.rotation.y += dy * Math.min(1, dt * 10);
    cartM.rotation.x = ride.to ? (b[1] - a[1]) * -0.5 : 0;
    if (input.jump) getOff();
  }

  function getOff() {
    if (!ride.kind) return;
    const p = G.player.pos, kind = ride.kind;
    G.give(kind, 1, true);
    if (kind === 'cart') { cartM.visible = false; p.y += 1.0; }
    else {
      boatM.visible = false;
      // step onto the nearest dry land if there is some close by
      for (let r = 1; r <= 3; r++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const x = Math.floor(p.x) + dx * r, z = Math.floor(p.z) + dz * r, y = G.world.surfaceY(x, z);
        if (y >= Math.floor((G.waterLevel() ?? 0) + 0.3)) { p.x = x + 0.5; p.z = z + 0.5; p.y = y + 1.05; r = 9; break; }
      }
    }
    ride.kind = null; ride.speed = 0;
    G.player.vel.y = 3;
    G.toast(kind === 'cart' ? 'You got out of the Mine cart. It is back in your bag.' : 'You left the boat. It is back in your bag.');
  }

  function update(dt) {
    updateWiring(dt);
    updateFishing(dt);
  }
  return {
    placed, removed, toggleSwitch, solve, update, useRod, startBoat, startCart, getOff,
    riding: () => ride.kind, ride: (dt, input) => (ride.kind === 'boat' ? updateBoat(dt, input) : updateCart(dt, input)),
    get fishing() { return fish; }, stopFishing, get rideInfo() { return ride; },
  };
}
