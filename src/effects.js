// Sky, moons, smoke, flames and flying bits of broken blocks.
import * as THREE from 'three';

let seed = 1337;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const FOG = 0x4a2216;

// sky: from looks.js (top, horizon colours, star brightness, sun colour and size, bodies)
// sunDir: direction to the sun. Returns a group that follows the camera.
export function buildSky(scene, sky, sunDir, planet) {
  seed = 1337;
  const g = new THREE.Group();
  const R = 700;
  const at = (dir, dist = R) => dir.clone().normalize().multiplyScalar(dist);
  const deg = (d) => 2 * R * Math.tan((d * Math.PI / 180) / 2);
  // stars
  if (sky.stars > 0) {
    const geo = new THREE.BufferGeometry(), pos = [], col = [];
    for (let i = 0; i < 3500; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 600, s = Math.sqrt(1 - u * u);
      pos.push(r * s * Math.cos(th), Math.abs(r * u) * 0.95 + 15, r * s * Math.sin(th));
      const b = 0.45 + rnd() * 0.5, t = rnd();
      col.push(b * (t > 0.8 ? 0.8 : 1), b * 0.95, b * (t < 0.2 ? 0.8 : 1));
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: sky.stars < 1, opacity: sky.stars })));
  }
  // dome: horizon glow fading up to the top colour
  {
    const geo = new THREE.SphereGeometry(900, 48, 32), p = geo.attributes.position, cols = [];
    const hz = new THREE.Color(sky.horizon), top = new THREE.Color(sky.top), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 900, h = Math.min(Math.max(y * 4.5, 0), 1);
      c.copy(hz).lerp(top, Math.pow(h, 0.5)); if (y < 0) c.copy(hz);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, transparent: sky.stars < 1, opacity: 1 }));
    m.renderOrder = -10; g.add(m);
    if (sky.stars < 1) { m.material.transparent = false; m.renderOrder = -11; }
  }
  // the sun: real size in the sky (times 3 so you can see it), real colour
  {
    const sc = new THREE.Color(sky.sun);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunDot(), color: sc.clone().lerp(new THREE.Color(0xffffff), 0.25), fog: false, depthWrite: false, transparent: true }));
    const size = deg(sky.sunDeg * 3);
    core.scale.set(size * 1.25, size * 1.25, 1); core.position.copy(at(sunDir)); core.renderOrder = -5;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: sc, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    glow.scale.set(size * 6 + 40, size * 6 + 40, 1); glow.position.copy(at(sunDir, R + 1)); glow.renderOrder = -6;
    g.add(glow, core);
  }
  const ball = (r, map, color = 0xffffff, glow = 0) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshLambertMaterial({ map, color, fog: false, emissive: color, emissiveMap: glow ? map : null, emissiveIntensity: glow }));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const b of sky.bodies) {
    if (b === 'marsMoons') {
      const moon = new THREE.Mesh(lumpy(30), new THREE.MeshLambertMaterial({ map: moonTex(), fog: false }));
      moon.position.set(300, 190, -260); moon.scale.set(1.3, 1, 1.1); moon.rotation.set(0.4, 0.8, 0.2);
      const moon2 = new THREE.Mesh(lumpy(6), new THREE.MeshLambertMaterial({ color: 0xb5a597, fog: false }));
      moon2.position.set(-330, 210, -330);
      g.add(moon, moon2);
    }
    if (b === 'earth') {
      // Earth from the Moon is 1.9 degrees wide; drawn 3 times bigger like the sun
      const e = ball(deg(1.9 * 3) / 2, earthTex());
      e.position.copy(at(V(-0.55, 0.42, -0.72))); e.rotation.set(0.3, 2.2, 0.4); g.add(e);
    }
    if (b === 'jupiter') {
      // real size from Europa: about 12 degrees wide. Drawn 2 times bigger.
      const h = planet.real.hostPlanet, d = 2 * Math.atan(h.radiusKm / h.distanceKm) * 180 / Math.PI;
      const j = ball(deg(d * 2) / 2, jupiterTex());
      j.position.copy(at(V(-0.62, 0.36, -0.7))); j.rotation.set(0.05, 0.4, 0.12); g.add(j);
      const io = ball(deg(0.5 * 3) / 2, null, 0xe8d06a);
      io.position.copy(at(V(0.5, 0.55, -0.66))); g.add(io);
    }
    if (b === 'alphaCen') {
      // Alpha Centauri A and B: the brightest stars in Proxima b's sky
      for (const [dx, col, s] of [[0, 0xfff1d8, 26], [0.012, 0xffc98a, 18]]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunDot(), color: col, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
        sp.scale.set(s, s, 1); sp.position.copy(at(V(-0.6 + dx, 0.5, -0.62))); g.add(sp);
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: col, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
        gl.scale.set(s * 4, s * 4, 1); gl.position.copy(sp.position); g.add(gl);
      }
    }
    if (b === 'neighbours') {
      // the other TRAPPIST-1 planets at their closest, real sizes times 6
      // placed beside the sun so they show as half-lit discs
      const spin = (a, up) => { const d = sunDir.clone(); d.y = 0; d.normalize().applyAxisAngle(V(0, 1, 0), a); d.y = up; return d; };
      const dirs = [spin(0.55, 0.62), spin(-0.5, 0.4), spin(0.9, 0.3)];
      const tints = [0xd8c0a8, 0xc8b098, 0xb8c4cc];
      planet.real.neighbours.forEach((nb, k) => {
        const d = 2 * Math.atan(nb.radius * 6371 / (nb.closestAU * 1.496e8)) * 180 / Math.PI;
        const m = ball(deg(d * 6) / 2, moonTex(), tints[k], 0.45);
        m.position.copy(at(dirs[k])); g.add(m);
      });
    }
  }
  scene.add(g);
  return g;
}

const pxTex = (W, H, draw) => {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  draw(x, W, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; return t;
};
function moonTex() {
  return pxTex(64, 64, (x, S) => {
    x.fillStyle = '#8d8178'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const r = rnd() * S * 0.06 + 2, px = rnd() * S, py = rnd() * S;
      x.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.2})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.arc(px - r * 0.25, py - r * 0.25, r * 0.7, 0, 7); x.fill();
    }
  });
}
function earthTex() {
  return pxTex(64, 32, (x, W, H) => {
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
      const lat = Math.abs(j - H / 2) / (H / 2);
      const land = Math.sin(i * 0.35) * Math.cos(j * 0.5 + i * 0.1) + Math.sin(i * 0.13 + j * 0.3) > 0.7;
      const cloud = Math.sin(i * 0.5 + j * 1.3) * Math.sin(i * 0.21 - j * 0.7) > 0.45;
      x.fillStyle = lat > 0.82 ? '#f4f8fb' : cloud ? '#e8eef2' : land ? (lat < 0.3 ? '#c8a868' : '#4f8a46') : (rnd() > 0.5 ? '#1f5fa8' : '#2468b4');
      x.fillRect(i, j, 1, 1);
    }
  });
}
function jupiterTex() {
  return pxTex(128, 64, (x, W, H) => {
    const bands = ['#e8dcc6', '#c8a27e', '#f0e6d4', '#b88a62', '#ead8bc', '#a8784e', '#f2e8d8', '#c49a72', '#e2d0b4'];
    for (let j = 0; j < H; j++) {
      const b = Math.floor((j + Math.sin(j * 0.7) * 1.2) / (H / bands.length));
      for (let i = 0; i < W; i++) {
        let c = bands[Math.max(0, Math.min(bands.length - 1, b))];
        if (rnd() > 0.985 && i % 3) c = bands[(b + 1) % bands.length];
        x.fillStyle = c; x.fillRect(i, j, 1, 1);
      }
    }
    x.fillStyle = '#b8583a'; x.fillRect(70, 38, 12, 5); x.fillStyle = '#d07a52'; x.fillRect(72, 39, 8, 3);
  });
}
function lumpy(r) {
  const geo = new THREE.SphereGeometry(r, 32, 24), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + 0.12 * Math.sin(v.x * 0.15 / r * 30) * Math.cos(v.y * 0.11 / r * 30) + 0.06 * Math.sin(v.z * 0.3 / r * 30));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}
// hard-edged bright disc for suns and bright stars
function sunDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.62, 'rgba(255,255,255,1)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// soft round sprite
function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// A simple particle cloud: smoke, flames
export class Cloud {
  constructor(scene, n, { color, size, additive = false, opacity = 0.6 }) {
    this.n = n;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.col = new Float32Array(n * 3);
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.base = new THREE.Color(color);
    this.mat = new THREE.PointsMaterial({ size, map: softDot(), transparent: true, opacity, depthWrite: false, vertexColors: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(this.geo, this.mat); this.points.frustumCulled = false;
    scene.add(this.points);
    this.k = 0;
    for (let i = 0; i < n; i++) this.p[i * 3 + 1] = -999;
  }
  emit(x, y, z, vx, vy, vz, life) {
    const i = this.k = (this.k + 1) % this.n;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3); this.life[i] = life; this.max[i] = life;
  }
  update(dt, gravity = 0, fade) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.p[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt;
      this.v[i * 3 + 1] -= gravity * dt;
      for (let a = 0; a < 3; a++) this.p[i * 3 + a] += this.v[i * 3 + a] * dt;
      const t = Math.max(0, this.life[i] / this.max[i]);
      const f = fade ? fade(t) : t;
      this.col[i * 3] = this.base.r * f; this.col[i * 3 + 1] = this.base.g * f; this.col[i * 3 + 2] = this.base.b * f;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}

// Little cubes that fly off when a block breaks
export class Bits {
  constructor(scene, material) {
    this.gravity = 12;
    this.n = 260;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshLambertMaterial(), this.n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.p = new Float32Array(this.n * 3); this.v = new Float32Array(this.n * 3); this.life = new Float32Array(this.n);
    this.k = 0; this.m = new THREE.Matrix4(); this.c = new THREE.Color();
    for (let i = 0; i < this.n; i++) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, this.c.set(0xffffff)); }
    scene.add(this.mesh);
  }
  // small chips while you hit a block: they fly out of the face you are digging
  chips(x, y, z, nx, ny, nz, colors, n = 3) {
    for (let j = 0; j < n; j++) {
      const i = this.k = (this.k + 1) % this.n;
      this.p.set([x + 0.5 + nx * 0.55 + (nx ? 0 : (Math.random() - 0.5) * 0.7), y + 0.5 + ny * 0.55 + (ny ? 0 : (Math.random() - 0.5) * 0.7), z + 0.5 + nz * 0.55 + (nz ? 0 : (Math.random() - 0.5) * 0.7)], i * 3);
      this.v.set([nx * 2.5 + (Math.random() - 0.5) * 2, ny * 2.5 + 1 + Math.random() * 1.5, nz * 2.5 + (Math.random() - 0.5) * 2], i * 3);
      this.life[i] = 0.35 + Math.random() * 0.3;
      this.mesh.setColorAt(i, this.c.set(colors[(j + (Math.random() * 4 | 0)) % colors.length]));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  // a little puff of dust at your feet when you land
  puff(x, y, z, colors) {
    for (let j = 0; j < 10; j++) {
      const i = this.k = (this.k + 1) % this.n, a = j / 10 * Math.PI * 2;
      this.p.set([x + Math.cos(a) * 0.25, y + 0.1, z + Math.sin(a) * 0.25], i * 3);
      this.v.set([Math.cos(a) * 2.2, 1.2 + Math.random(), Math.sin(a) * 2.2], i * 3);
      this.life[i] = 0.35 + Math.random() * 0.2;
      this.mesh.setColorAt(i, this.c.set(colors[j % colors.length]));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  burst(x, y, z, colors) {
    for (let j = 0; j < 22; j++) {
      const i = this.k = (this.k + 1) % this.n;
      this.p.set([x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6], i * 3);
      this.v.set([(Math.random() - 0.5) * 4, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 4], i * 3);
      this.life[i] = 0.6 + Math.random() * 0.4;
      this.mesh.setColorAt(i, this.c.set(colors[j % colors.length]));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt, world) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.v[i * 3 + 1] -= this.gravity * dt;
      const nx = this.p[i * 3] + this.v[i * 3] * dt, ny = this.p[i * 3 + 1] + this.v[i * 3 + 1] * dt, nz = this.p[i * 3 + 2] + this.v[i * 3 + 2] * dt;
      if (world.solid(Math.floor(nx), Math.floor(ny - 0.07), Math.floor(nz))) { this.v[i * 3 + 1] = 0; this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6; }
      else this.p[i * 3 + 1] = ny;
      this.p[i * 3] = nx; this.p[i * 3 + 2] = nz;
      const s = this.life[i] > 0 ? Math.min(1, this.life[i] * 3) : 0;
      this.m.makeScale(s, s, s).setPosition(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
