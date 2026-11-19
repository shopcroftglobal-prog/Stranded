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
