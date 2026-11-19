// Real water: one smooth, moving surface (not blocks) laid over the low ground of sea worlds.
// Waves move the surface, ripples catch the sun, and you can see the sea floor through it.
import * as THREE from 'three';

function rippleTexture() {
  // a tiling normal map made from a few sine waves (so it repeats with no seams)
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N);
  const h = (i, j) => {
    const u = i / N * Math.PI * 2, v = j / N * Math.PI * 2;
    return Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin((u + v) * 7) * 0.15 + Math.sin(u * 11 - v * 4) * 0.08;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = h((i + 1) % N, j) - h((i + N - 1) % N, j), dy = h(i, (j + 1) % N) - h(i, (j + N - 1) % N);
    const nx = -dx * 2.2, ny = -dy * 2.2, nz = 1, l = Math.hypot(nx, ny, nz);
    const k = (j * N + i) * 4;
    img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 18);
  return t;
}

export function createWater(scene) {
  const size = 420;
  const geo = new THREE.PlaneGeometry(size, size, 140, 140); geo.rotateX(-Math.PI / 2);
  const normal = rippleTexture();
  const mat = new THREE.MeshPhongMaterial({ color: 0x2a7f96, specular: 0xfff4d0, shininess: 90, transparent: true, opacity: 0.8, normalMap: normal, normalScale: new THREE.Vector2(0.9, 0.9), depthWrite: false, side: THREE.DoubleSide });
  const shader = { uniforms: { uTime: { value: 0 } } };
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = shader.uniforms.uTime;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float w1 = sin(wp.x * 0.35 + uTime * 1.3) * 0.10 + sin(wp.z * 0.27 - uTime * 1.1) * 0.10 + sin((wp.x + wp.z) * 0.6 + uTime * 2.1) * 0.04;
      transformed.y += w1;`);
  };
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2; m.visible = false; m.receiveShadow = true;
  scene.add(m);
  let level = null, t = 0;
  return {
    get level() { return level; },
    setLevel(y, colour) { level = y; m.visible = y != null; if (y != null) { m.position.y = y; if (colour) mat.color.setHex(colour); } },
    update(dt, camPos) {
      if (level == null) return;
      t += dt; shader.uniforms.uTime.value = t;
      // follow the camera in whole steps so the waves do not slide with you
      m.position.x = Math.round(camPos.x / 16) * 16; m.position.z = Math.round(camPos.z / 16) * 16;
      normal.offset.set((t * 0.012) % 1, (t * 0.008) % 1);
    },
    under(p) { return level != null && p.y < level; },
  };
}
