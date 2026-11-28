// Signs (Version 31): place a Sign, write a few words on it, and they float above it for anyone near.
// Text lives in state.signs { "x,y,z": "text" } and is cleaned of rude words and links.
import * as THREE from 'three';
import { B } from './blocks.js';
import { cleanText } from './chatfilter.js';

export const SIGN_MAX = 40;
const SHOW_R = 36;

export function createSigns(G) {
  const S = () => G.state;
  const all = () => S().signs || (S().signs = {});
  const live = new Map();          // key -> { sp, text }
  let t = 0, editing = null;
  function label(text) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = "28px 'Pixelify Sans', monospace";
    x.font = font;
    const w = Math.min(560, Math.ceil(x.measureText(text).width) + 28);
    c.width = w; c.height = 46;
    x.font = font;
    x.fillStyle = 'rgba(28,20,16,0.86)'; x.fillRect(0, 0, w, 46);
    x.strokeStyle = '#e8dcc0'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, 43);
    x.fillStyle = '#fff4dc'; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillText(text, w / 2, 24, w - 20);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
    sp.scale.set(w / 46 * 0.42, 0.42, 1);
    sp.renderOrder = 5;
    return sp;
  }
  function drop(k) { const e = live.get(k); if (!e) return; G.scene.remove(e.sp); e.sp.material.map.dispose(); e.sp.material.dispose(); live.delete(k); }
  function update(dt) {
    t -= dt; if (t > 0) return; t = 0.5;
    const me = G.player.pos, A = all();
    for (const k of [...live.keys()]) if (!(k in A)) drop(k);
    for (const k in A) {
      const [x, y, z] = k.split(',').map(Number);
      if (G.world.get(x, y, z) !== B.SIGN) { if (G.world.hasChunk(Math.floor(x / 16), Math.floor(z / 16))) { delete A[k]; drop(k); } continue; }
      const near = Math.hypot(x + 0.5 - me.x, z + 0.5 - me.z) < SHOW_R;
      const e = live.get(k);
      if (!near || !A[k]) { if (e) drop(k); continue; }
      if (e && e.text === A[k]) continue;
      if (e) drop(k);
      const sp = label(A[k]); sp.position.set(x + 0.5, y + 1.45, z + 0.5); G.scene.add(sp);
      live.set(k, { sp, text: A[k] });
    }
  }
  // the panel: write on a sign
  function open(x, y, z) {
    editing = `${x},${y},${z}`;
    const inp = document.getElementById('signText');
    inp.value = all()[editing] || '';
    G.openPanel('signPanel');
    setTimeout(() => { try { inp.focus(); } catch (e) { } }, 50);
  }
  function save() {
    if (!editing) return;
    const raw = document.getElementById('signText').value;
    const text = cleanText(raw, SIGN_MAX).text;
    all()[editing] = text;
    editing = null; t = 0;
    G.writeSave(); G.closePanels();
    if (text) G.toast('Sign written.');
  }
  function removed(x, y, z) { const k = `${x},${y},${z}`; delete all()[k]; drop(k); }
  function clear() { for (const k of [...live.keys()]) drop(k); }
  return { update, open, save, removed, clear, get live() { return live; } };
}
