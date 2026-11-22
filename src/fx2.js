// Extra looks: sunset glow, aurora lights, rain/snow/dust, footprints.
import * as THREE from 'three';

// ---- a warm glow around the horizon when the sun is low (sunrise and sunset)
export function createSunset(scene) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uK: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uSun; uniform float uK; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        float band = exp(-max(h + 0.02, 0.0) * 7.0) * step(-0.25, h);
        vec2 a = normalize(vDir.xz + 1e-4), b = normalize(uSun.xz + 1e-4);
        float toward = pow(max(dot(a, b), 0.0), 3.0);
        vec3 col = mix(vec3(0.95, 0.35, 0.45), vec3(1.0, 0.55, 0.18), toward);
        float k = uK * band * (0.35 + 0.9 * toward);
        gl_FragColor = vec4(col * k, 1.0);
      }`,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(850, 48, 24), mat);
  m.renderOrder = -4; m.frustumCulled = false; scene.add(m);
  return {
    update(camPos, sunDir, on) {
      m.position.copy(camPos);
      const y = sunDir.y;
      const k = on ? Math.max(0, 1 - Math.abs(y - 0.04) / 0.26) : 0;
      mat.uniforms.uK.value = k * 0.85; mat.uniforms.uSun.value.copy(sunDir);
      m.visible = k > 0.01;
      return k;
    },
  };
}

// ---- aurora: soft green and purple curtains moving across the sky
export function createAurora(scene) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vUv; uniform float uT; void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.x * 9.0 + uT * 0.4) * 25.0 + sin(uv.x * 23.0 - uT * 0.7) * 8.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
    fragmentShader: `uniform float uT; uniform float uK; varying vec2 vUv;
      void main(){
        float rays = 0.55 + 0.45 * sin(vUv.x * 160.0 + sin(vUv.x * 13.0 + uT * 0.8) * 4.0 + uT * 0.6);
        float fadeUp = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.12, vUv.y);
        float ends = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        vec3 col = mix(vec3(0.15, 1.0, 0.55), vec3(0.65, 0.3, 1.0), vUv.y * 1.2);
        gl_FragColor = vec4(col * rays * fadeUp * ends * uK, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(900, 160, 120, 1), mat);
    c.position.set(-80 + i * 140, 260 + i * 25, -380 - i * 60); c.rotation.y = (i - 1) * 0.35; c.rotation.x = -0.25;
    g.add(c);
  }
  g.renderOrder = -3; g.visible = false; scene.add(g);
  let t = 0;
  return {
    update(dt, camPos, k) {
      t += dt; mat.uniforms.uT.value = t; mat.uniforms.uK.value = k;
      g.visible = k > 0.02; g.position.set(camPos.x, 0, camPos.z);
    },
  };
}

// ---- rain, snow and blowing dust around you
function dotTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  if (kind === 'rain') { const gr = x.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(200,225,255,0)'); gr.addColorStop(1, 'rgba(200,225,255,0.9)'); x.fillStyle = gr; x.fillRect(15, 0, 2, 32); }
  else { const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); }
  return new THREE.CanvasTexture(c);
}
export function createWeather(scene) {
  const N = 1800, B = 22, H = 18;
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() * 2 - 1) * B; pos[i * 3 + 1] = Math.random() * H; pos[i * 3 + 2] = (Math.random() * 2 - 1) * B; seed[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = { rain: dotTex('rain'), snow: dotTex('snow'), dust: dotTex('snow') };
  const mat = new THREE.PointsMaterial({ size: 0.22, map: tex.snow, transparent: true, depthWrite: false, opacity: 0.9, color: 0xffffff });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
  let kind = null, amt = 0, t = 0;
  const KIND = {
    rain: { v: [0.5, -16, 0.3], size: 0.5, color: 0xbfd8ff, op: 0.7 },
    snow: { v: [0.6, -1.4, 0.3], size: 0.2, color: 0xffffff, op: 0.95, wob: 0.8 },
    dust: { v: [9, -0.6, 3], size: 0.28, color: 0xc0805a, op: 0.75, wob: 1.2 },
  };
  return {
    get kind() { return amt > 0.05 ? kind : null; },
    set(k, strength) { if (k !== kind) { kind = k; if (k) { const K = KIND[k]; mat.map = tex[k]; mat.size = K.size; mat.color.setHex(K.color); mat.needsUpdate = true; } } amt += ((k ? strength : 0) - amt) * 0.02; },
    update(dt, camPos, ground) {
      t += dt;
      pts.visible = !!kind && amt > 0.03;
      if (!pts.visible) return;
      const K = KIND[kind]; mat.opacity = K.op * Math.min(1, amt);
      const show = Math.floor(N * Math.min(1, amt)); geo.setDrawRange(0, show);
      for (let i = 0; i < show; i++) {
        let x = pos[i * 3] + K.v[0] * dt + (K.wob ? Math.sin(t * 1.3 + seed[i] * 20) * K.wob * dt : 0);
        let y = pos[i * 3 + 1] + K.v[1] * dt * (0.8 + seed[i] * 0.4);
        let z = pos[i * 3 + 2] + K.v[2] * dt;
        if (y < -2 || (ground && ground(camPos.x + x, camPos.z + z) > camPos.y - 8 + y)) { y = H - 2 + Math.random() * 2; x = (Math.random() * 2 - 1) * B; z = (Math.random() * 2 - 1) * B; }
        if (x > B) x -= 2 * B; if (x < -B) x += 2 * B; if (z > B) z -= 2 * B; if (z < -B) z += 2 * B;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
      pts.position.set(camPos.x, camPos.y - 8, camPos.z);
    },
  };
}

// ---- footprints in soft ground; they fade after a while
export function createPrints(scene) {
  const N = 70, list = [];
  const c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.beginPath(); x.ellipse(8, 15, 5, 8, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(8, 4, 4, 3.5, 0, 0, Math.PI * 2); x.fill();
  const tex = new THREE.CanvasTexture(c);
  const geo = new THREE.PlaneGeometry(0.22, 0.32); geo.rotateX(-Math.PI / 2);
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.visible = false; scene.add(m); list.push({ m, life: 0 });
  }
  let k = 0, side = 1;
  return {
    step(x, y, z, yaw) {
      const p = list[k = (k + 1) % N]; side = -side;
      const sx = Math.cos(yaw) * 0.14 * side, sz = -Math.sin(yaw) * 0.14 * side;
      p.m.position.set(x + sx, y + 0.012, z + sz); p.m.rotation.y = yaw; p.life = 25; p.m.visible = true;
    },
    clear() { for (const p of list) { p.life = 0; p.m.visible = false; } },
    update(dt) { for (const p of list) if (p.life > 0) { p.life -= dt; p.m.material.opacity = Math.min(0.6, p.life / 8); if (p.life <= 0) p.m.visible = false; } },
  };
}

// ---- Mars by day: a butterscotch sky, pale near the ground, with a cold blue glow round the sun.
// (Real: fine red dust makes the day sky tan, and at sunset the sky round the sun turns blue.)
export function createDaySky(scene) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 0 }, uLow: { value: 0 }, uTop: { value: new THREE.Color(0x9c6b4c) }, uHz: { value: new THREE.Color(0xd9ac82) }, uHalo: { value: new THREE.Color(0x9fc2f0) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uSun, uTop, uHz, uHalo; uniform float uDay, uLow; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHz, uTop, pow(h, 0.55));
        float s = max(dot(normalize(vDir), normalize(uSun)), 0.0);
        float halo = pow(s, 10.0) * 0.55 + pow(s, 90.0) * 0.7;
        col = mix(col, uHalo, clamp(halo * (0.35 + uLow), 0.0, 0.9));
        float a = max(uDay, clamp(halo * uLow * 1.6, 0.0, 0.85));
        gl_FragColor = vec4(col, a);
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(840, 48, 24), mat);
  m.renderOrder = -8; m.frustumCulled = false; m.visible = false; scene.add(m);
  return {
    mat,
    update(camPos, sunDir, day, on) {
      m.visible = on;
      if (!on) return;
      m.position.copy(camPos);
      mat.uniforms.uSun.value.copy(sunDir);
      mat.uniforms.uDay.value = Math.pow(day, 1.4) * 0.97;
      mat.uniforms.uLow.value = Math.max(0, 1 - Math.abs(sunDir.y - 0.03) / 0.25);
    },
  };
}

// ---- far mountains on the horizon: two rows of hills, a wide volcano and flat-topped hills.
// They sit past the edge of the world you can walk on, so the land never looks flat and empty.
export function createFarHills(scene) {
  const g = new THREE.Group();
  const rows = [];
  const make = (R, seed, peak, colMul) => {
    const N = 360, pos = [], idx = [];
    const rnd = (k) => { const v = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
    const prof = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2;
      let h = 10 + 7 * Math.sin(a * 3 + seed) + 5 * Math.sin(a * 7 + seed * 2) + 3 * Math.sin(a * 17 + seed * 5) + rnd(Math.floor(i / 3)) * 2;
      // flat-topped striped hills
      const m = Math.sin(a * 5 + seed * 3);
      if (m > 0.55) h = Math.max(h, 26 + (m > 0.75 ? 10 : 0));
      // a giant gentle volcano
      const dv = Math.abs(((a - peak + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (dv < 0.75) h = Math.max(h, 70 * Math.pow(1 - dv / 0.75, 1.3) - (dv < 0.06 ? 6 : 0));
      prof.push(h * R / 600);
    }
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      pos.push(x, -60, z, x, prof[i], z);
      if (i < N) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, fog: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = -3.5; mesh.frustumCulled = false;
    g.add(mesh); rows.push({ mat, colMul });
  };
  // the volcano stands to the north-east, the same way as the big one near the ship
  const ne = Math.atan2(-85, 105);
  make(640, 1.7, ne + 0.15, 0.93);
  make(560, 4.2, ne + 2.6, 0.8);
  g.visible = false; scene.add(g);
  const c = new THREE.Color(), dark = new THREE.Color(0x3a2418);
  return {
    update(camPos, fogColor, on) {
      g.visible = on; if (!on) return;
      g.position.set(camPos.x, Math.min(camPos.y, 40) - 4, camPos.z);
      for (const r of rows) r.mat.color.copy(c.copy(fogColor).lerp(dark, 1 - r.colMul).multiplyScalar(r.colMul));
    },
  };
}

// ---- dust devils: tall spinning columns of dust that wander across the plains on sunny days
export function createDustDevils(scene) {
  const devils = [];
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv); })();
  for (let k = 0; k < 3; k++) {
    const n = 260, pos = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push([Math.random(), Math.random() * Math.PI * 2, Math.random()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: tex, color: 0xc89a72, size: 2.2, transparent: true, opacity: 0, depthWrite: false });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; scene.add(p);
    devils.push({ p, mat, geo, seeds, n, t: Math.random() * 10, x: 1e9, z: 0, y: 0, vx: 0, vz: 0, life: 0, H: 22 + Math.random() * 14 });
  }
  return {
    update(dt, playerPos, groundY, k) {
      for (const d of devils) {
        d.life -= dt; d.t += dt;
        const far = Math.hypot(d.x - playerPos.x, d.z - playerPos.z);
        if (d.life <= 0 || far > 120) {
          const a = Math.random() * Math.PI * 2, r = 45 + Math.random() * 55;
          d.x = playerPos.x + Math.cos(a) * r; d.z = playerPos.z + Math.sin(a) * r;
          const b = Math.random() * Math.PI * 2; d.vx = Math.cos(b) * 2.5; d.vz = Math.sin(b) * 2.5; d.life = 25 + Math.random() * 30; d.age = 0; d.y = groundY(Math.floor(d.x), Math.floor(d.z)) + 1;
        }
        d.x += d.vx * dt; d.z += d.vz * dt;
        d.y += ((groundY(Math.floor(d.x), Math.floor(d.z)) + 1) - d.y) * Math.min(1, dt * 2);
        d.age = (d.age || 0) + dt; const fade = Math.min(1, d.life / 4, d.age / 4);
        d.mat.opacity = 0.32 * k * fade;
        d.p.visible = k > 0.01;
        if (!d.p.visible) continue;
        const a = d.geo.attributes.position.array;
        for (let i = 0; i < d.n; i++) {
          const [u, ph, w] = d.seeds[i];
          const hgt = ((u + d.t * 0.12) % 1);
          const rad = 0.6 + hgt * hgt * 7 + w;
          const ang = ph + d.t * (4 - hgt * 2.5);
          const sway = Math.sin(d.t * 0.7 + hgt * 3) * hgt * 3;
          a[i * 3] = d.x + Math.cos(ang) * rad + sway; a[i * 3 + 1] = d.y + hgt * d.H; a[i * 3 + 2] = d.z + Math.sin(ang) * rad;
        }
        d.geo.attributes.position.needsUpdate = true;
      }
    },
  };
}

// ---- thin high clouds that drift slowly (Mars has wispy blue-white ice clouds; thicker clouds where the air is thick)
export function createClouds(scene) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d'), img = x.createImageData(256, 256);
  // soft wisps: a few layers of smooth random blobs, stretched along the wind
  const g = [];
  for (let k = 0; k < 5; k++) { const N = 4 << k, arr = []; for (let i = 0; i < N * N; i++) arr.push(Math.random()); g.push({ N, arr }); }
  const smp = (o, u, v) => { const N = o.N, X = u * N, Y = v * N, x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0; const at = (a, b) => o.arr[((b % N + N) % N) * N + ((a % N + N) % N)]; const s = (t) => t * t * (3 - 2 * t); const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * s(fx), b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * s(fx); return a + (b - a) * s(fy); };
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    let v = 0, amp = 0.5;
    for (const o of g) { v += smp(o, i / 256, j / 256) * amp; amp *= 0.55; }
    v = Math.max(0, Math.min(1, (v - 0.52) * 3.2));
    const p = (j * 256 + i) * 4; img.data[p] = img.data[p + 1] = img.data[p + 2] = 255; img.data[p + 3] = v * 255;
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uOff: { value: new THREE.Vector2() }, uCol: { value: new THREE.Color(0xeaf2ff) }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uTex; uniform vec2 uOff; uniform vec3 uCol; uniform float uK; varying vec2 vP;
      void main(){
        vec2 uv = vP / vec2(700.0, 520.0) + uOff;
        float a = texture2D(uTex, uv).a;
        float edge = 1.0 - smoothstep(250.0, 800.0, length(vP));
        gl_FragColor = vec4(uCol, a * edge * uK);
      }`,
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), mat);
  m.rotation.x = -Math.PI / 2; m.renderOrder = -3.8; m.frustumCulled = false; m.visible = false; scene.add(m);
  return {
    update(dt, camPos, k, col) {
      m.visible = k > 0.01; if (!m.visible) return;
      m.position.set(camPos.x, Math.min(camPos.y, 50) + 170, camPos.z);
      mat.uniforms.uOff.value.x += dt * 0.0016; mat.uniforms.uOff.value.y += dt * 0.0004;
      mat.uniforms.uOff.value.x = (mat.uniforms.uOff.value.x + camPos.x / 900 * 0) % 1;
      mat.uniforms.uK.value = k; if (col != null) mat.uniforms.uCol.value.set(col);
    },
  };
}

// ---- Europa: tall plumes of water shooting out of cracks in the ice, then falling back as snow
export function createPlumes(scene) {
  const spots = [[70, -40], [-62, -72], [20, 96], [-110, 30]];
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv); })();
  const list = spots.map(([x, z], k) => {
    const n = 420, pos = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push([Math.random(), Math.random() * Math.PI * 2, Math.random()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: tex, color: 0xe8f4ff, size: 2.6, transparent: true, opacity: 0.5, depthWrite: false });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.visible = false; scene.add(p);
    return { x, z, y: null, p, mat, geo, seeds, n, t: k * 7 };
  });
  return {
    spots,
    update(dt, groundY, on) {
      for (const s of list) {
        s.p.visible = on; if (!on) continue;
        if (s.y == null) s.y = groundY(s.x, s.z) + 1;
        s.t += dt;
        const pulse = 0.55 + 0.45 * Math.sin(s.t * 0.35);
        s.mat.opacity = 0.55 * pulse;
        const a = s.geo.attributes.position.array, H = 70 * pulse;
        for (let i = 0; i < s.n; i++) {
          const [u, ph, w] = s.seeds[i];
          const f = (u + s.t * 0.18) % 1;            // 0 at the crack, 1 at the top
          const r = 0.4 + f * f * 9 * (0.4 + w);
          a[i * 3] = s.x + Math.cos(ph) * r; a[i * 3 + 1] = s.y + Math.sin(f * Math.PI * 0.5) * H; a[i * 3 + 2] = s.z + Math.sin(ph) * r;
        }
        s.geo.attributes.position.needsUpdate = true;
      }
    },
    reset() { for (const s of list) s.y = null; },
  };
}

// ---- tiny bits floating in the air round you: dust on Mars, ice glitter on cold worlds, embers near lava
export function createMotes(scene) {
  const N = 500, pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { seeds.push([Math.random() * 40 - 20, Math.random() * 14 - 3, Math.random() * 40 - 20, Math.random()]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 16; const x = cv.getContext('2d'); const gr = x.createRadialGradient(8, 8, 0, 8, 8, 8); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 16, 16); return new THREE.CanvasTexture(cv); })();
  const mat = new THREE.PointsMaterial({ map: tex, size: 0.16, transparent: true, opacity: 0.5, depthWrite: false, color: 0xe8c8a0 });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.visible = false; scene.add(p);
  let t = 0;
  return {
    update(dt, cam, kind, k) {
      p.visible = !!kind && k > 0.01; if (!p.visible) return;
      t += dt;
      const look = { dust: [0xe8c8a0, 0.16, THREE.NormalBlending, 0.45], ice: [0xeaf6ff, 0.12, THREE.AdditiveBlending, 0.8], ember: [0xff8a3a, 0.14, THREE.AdditiveBlending, 0.9] }[kind];
      mat.color.set(look[0]); mat.size = look[1]; if (mat.blending !== look[2]) { mat.blending = look[2]; mat.needsUpdate = true; } mat.opacity = look[3] * k;
      const a = geo.attributes.position.array, rise = kind === 'ember' ? 0.8 : kind === 'ice' ? -0.25 : 0.05, wind = kind === 'dust' ? 1.6 : 0.5;
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        let x = s[0] + t * wind * (0.6 + s[3]) + Math.sin(t * 0.7 + i) * 0.6, y = s[1] + t * rise * (0.5 + s[3]) + Math.sin(t * 1.3 + i * 2) * 0.3, z = s[2] + Math.cos(t * 0.5 + i) * 0.6;
        x = ((x - cam.x) % 40 + 60) % 40 - 20 + cam.x; y = ((y - cam.y) % 17 + 20.5) % 17 - 3.5 + cam.y; z = ((z - cam.z) % 40 + 60) % 40 - 20 + cam.z;
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// ---- shooting stars on clear nights
export function createShootingStars(scene) {
  const list = [];
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(geo, mat.clone()); l.frustumCulled = false; l.renderOrder = -2; l.visible = false; scene.add(l);
    list.push({ l, t: 0, life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() });
  }
  let wait = 4;
  return {
    update(dt, cam, on) {
      wait -= dt;
      if (on && wait <= 0) {
        wait = 3 + Math.random() * 9;
        const s = list.find(x => x.life <= 0);
        if (s) {
          const a = Math.random() * Math.PI * 2;
          s.p.set(Math.cos(a) * 380, 160 + Math.random() * 140, Math.sin(a) * 380);
          s.v.set(-Math.cos(a) + (Math.random() - 0.5), -0.35 - Math.random() * 0.3, -Math.sin(a) + (Math.random() - 0.5)).normalize().multiplyScalar(260 + Math.random() * 160);
          s.life = s.t = 0.7 + Math.random() * 0.6;
        }
      }
      for (const s of list) {
        if (s.life <= 0) { s.l.visible = false; continue; }
        s.life -= dt; s.p.addScaledVector(s.v, dt);
        const a = s.l.geometry.attributes.position.array, tail = s.p.clone().addScaledVector(s.v, -0.12);
        a[0] = cam.x + s.p.x; a[1] = cam.y + s.p.y; a[2] = cam.z + s.p.z; a[3] = cam.x + tail.x; a[4] = cam.y + tail.y; a[5] = cam.z + tail.z;
        s.l.geometry.attributes.position.needsUpdate = true;
        s.l.material.opacity = Math.sin(Math.PI * Math.max(0, s.life) / s.t) * 0.9; s.l.visible = on;
      }
    },
  };
}
