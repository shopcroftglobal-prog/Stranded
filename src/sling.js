// Slingshot (Version 31): hold it and Use to shoot a bit of Rock at monsters from far away.
// Each shot uses 1 Rock from your bag (free in Creative). Shots fall a little, stop at blocks.
import * as THREE from 'three';

const SPEED = 32, FALL = 6, LIFE = 2.2, WAIT = 0.45;

export function createSling(G, adv) {
  const shots = [];
  const geo = new THREE.IcosahedronGeometry(0.11, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0x8a8e96 });
  let wait = 0;
  function damage() {
    const w = adv.weapon();
    return Math.max(2, (w.dmg || 1) * 0.6) * (G.fxOn('strong') ? 1.5 : 1);
  }
  function shoot(o, dir) {
    if (wait > 0) return false;
    if (!G.creative() && G.has('rock') <= 0) { G.toast('The Slingshot needs Rock to shoot. Dig some rock.'); return false; }
    G.take('rock', 1);
    wait = WAIT;
    const m = new THREE.Mesh(geo, mat);
    const p = o.clone().addScaledVector(dir, 0.6);
    m.position.copy(p); G.scene.add(m);
    shots.push({ m, p, v: dir.clone().multiplyScalar(SPEED).add(new THREE.Vector3(0, 0.6, 0)), life: LIFE });
    G.sfx.swing(); G.swingArm();
    return true;
  }
  function stop(s, k) { G.scene.remove(s.m); shots.splice(k, 1); }
  function update(dt) {
    if (wait > 0) wait -= dt;
    for (let k = shots.length - 1; k >= 0; k--) {
      const s = shots[k];
      s.life -= dt;
      if (s.life <= 0) { stop(s, k); continue; }
      s.v.y -= FALL * dt;
      // move in small steps so fast shots don't pass through things
      const steps = Math.ceil(s.v.length() * dt / 0.3);
      let done = false;
      for (let n = 0; n < steps && !done; n++) {
        s.p.addScaledVector(s.v, dt / steps);
        for (const e of adv.enemies) {
          if (e.hidden) continue;
          const r = Math.max(0.6, (e.m.userData.radius || 0.5) + 0.3), h = e.m.userData.height || 1.5;
          const dx = s.p.x - e.pos.x, dz = s.p.z - e.pos.z, dy = s.p.y - (e.pos.y + h * 0.5);
          if (dx * dx + dz * dz < r * r && Math.abs(dy) < h * 0.5 + 0.3) {
            adv.strike(e, damage(), s.p.clone().addScaledVector(s.v, -0.05));
            G.track('sling'); done = true; break;
          }
        }
        if (!done && G.world.solid(Math.floor(s.p.x), Math.floor(s.p.y), Math.floor(s.p.z))) {
          G.bits.burst(Math.floor(s.p.x), Math.floor(s.p.y), Math.floor(s.p.z), [new THREE.Color(0x8a8e96), new THREE.Color(0x5a5e66)]);
          done = true;
        }
      }
      if (done) { stop(s, k); continue; }
      s.m.position.copy(s.p);
    }
  }
  function clear() { for (const s of shots) G.scene.remove(s.m); shots.length = 0; }
  return { shoot, update, clear, get shots() { return shots; } };
}
