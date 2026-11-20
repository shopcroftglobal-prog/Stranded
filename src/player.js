// First-person body: walking, jumping and bumping into blocks.
export const PW = 0.3;     // half width
export const PH = 1.8;     // height
export const EYE = 1.62;
const WALK = 4.4, RUN = 6.8;

// Game physics from real surface gravity (in Earths). Mars (0.38) is the step 1 feel:
// pull 13, jump 1.7 blocks. Lighter worlds float, heavy worlds pull you down hard,
// but you can always jump at least one block so nobody gets stuck.
export function physicsFor(g) {
  const gravity = 13 * Math.pow(g / 0.38, 0.7);
  const height = Math.max(1.1, Math.min(3.4, 1.68 * Math.pow(0.38 / g, g < 0.38 ? 0.6 : 0.3)));
  return { gravity, jump: Math.sqrt(2 * gravity * height), height, walk: g > 1.2 ? 0.88 : 1 };
}

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = { x: 0, y: 40, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.stepDist = 0;
    this.fly = false;
    this.phys = physicsFor(0.38);
  }
  collides(px, py, pz) {
    const w = this.world;
    const x0 = Math.floor(px - PW), x1 = Math.floor(px + PW - 1e-6);
    const y0 = Math.floor(py), y1 = Math.floor(py + PH - 1e-6);
    const z0 = Math.floor(pz - PW), z1 = Math.floor(pz + PW - 1e-6);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (w.solid(x, y, z)) return true;
    return false;
  }
  touchingWall() {
    const p = this.pos, d = 0.35;
    return this.collides(p.x + d, p.y + 0.1, p.z) || this.collides(p.x - d, p.y + 0.1, p.z) || this.collides(p.x, p.y + 0.1, p.z + d) || this.collides(p.x, p.y + 0.1, p.z - d);
  }
  // input: {f, r, jump, run} ; returns events {stepped, landed, jumped}
  update(dt, input) {
    const ev = {};
    const p = this.pos, v = this.vel;
    const sp = this.rover ? 15 * this.phys.walk : (input.run ? RUN : WALK) * this.phys.walk;
    if (this.rover) { this.yaw -= input.r * 2.2 * dt; input = { ...input, r: 0, jump: false }; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward is -z when yaw = 0
    let mx = -sin * input.f + cos * input.r, mz = -cos * input.f - sin * input.r;
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const accel = this.rover ? (this.onGround ? 3 : 1) : this.onGround ? 14 : 4;
    v.x += (mx * sp - v.x) * Math.min(1, accel * dt);
    v.z += (mz * sp - v.z) * Math.min(1, accel * dt);
    const swim = this.waterY != null && !this.fly && p.y + 0.8 < this.waterY;
    if (swim) {
      // in water: slow, floaty, Space swims up
      v.x *= 1 - Math.min(1, dt * 3); v.z *= 1 - Math.min(1, dt * 3);
      v.y += (input.jump ? 9 : -2.5) * dt; v.y *= 1 - Math.min(1, dt * 2.5);
      v.y = Math.max(-3, Math.min(4.5, v.y));
      if (input.jump && p.y + 1.6 > this.waterY) v.y = this.phys.jump * 0.85;   // hop out at the edge
      this.swimming = true;
    } else this.swimming = false;
    if (swim) { /* handled above */ } else if (this.fly) {
      v.y = (input.jump ? 8 : 0) - (input.down ? 8 : 0);
    } else {
      if (input.jump && this.onGround) { v.y = this.phys.jump; this.onGround = false; ev.jumped = true; }
      // climbing: hold Jump against a wall to climb up it (so a deep hole is never a trap)
      else if (input.jump && !this.rover && this.touchingWall()) { v.y = Math.max(v.y, 5.5); ev.climbing = true; }
      v.y = Math.max(v.y - this.phys.gravity * dt, -30);
    }
    const wasGround = this.onGround; let climbed = false;
    // move in small steps so fast falls never pass through blocks
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt / 0.3));
    const h = dt / steps;
    this.onGround = false;
    for (let s = 0; s < steps; s++) {
      // x
      let nx = p.x + v.x * h;
      if (this.rover && wasGround && !climbed && this.collides(nx, p.y, p.z) && !this.collides(nx, p.y + 1.01, p.z) && !this.collides(p.x, p.y + 1.01, p.z)) { p.y += 1.01; climbed = true; }
      if (this.collides(nx, p.y, p.z)) {
        nx = v.x > 0 ? Math.floor(nx + PW) - PW - 0.001 : Math.floor(nx - PW) + 1 + PW + 0.001;
        if (this.collides(nx, p.y, p.z)) nx = p.x;
        v.x = 0;
      }
      p.x = nx;
      // z
      let nz = p.z + v.z * h;
      if (this.rover && wasGround && !climbed && this.collides(p.x, p.y, nz) && !this.collides(p.x, p.y + 1.01, nz) && !this.collides(p.x, p.y + 1.01, p.z)) { p.y += 1.01; climbed = true; }
      if (this.collides(p.x, p.y, nz)) {
        nz = v.z > 0 ? Math.floor(nz + PW) - PW - 0.001 : Math.floor(nz - PW) + 1 + PW + 0.001;
        if (this.collides(p.x, p.y, nz)) nz = p.z;
        v.z = 0;
      }
      p.z = nz;
      // y
      let ny = p.y + v.y * h;
      if (this.collides(p.x, ny, p.z)) {
        if (v.y < 0) { ny = Math.floor(ny) + 1; this.onGround = true; if (!wasGround && v.y < -6) ev.landed = true; }
        else ny = Math.floor(ny + PH) - PH - 0.001;
        if (this.collides(p.x, ny, p.z)) ny = p.y;
        v.y = 0;
      }
      p.y = ny;
    }
    if (this.onGround) {
      this.stepDist += Math.hypot(v.x, v.z) * dt;
      if (this.stepDist > 2.1) { this.stepDist = 0; ev.stepped = true; }
    }
    // stuck inside a block (e.g. placed one on yourself) -> pop up
    if (this.collides(p.x, p.y, p.z)) p.y = Math.floor(p.y) + 1;
    return ev;
  }
}
