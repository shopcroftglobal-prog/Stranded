// Star Kart: our own kart racing mode. Three laps, boost pads, power boxes.
// Every racer draws from the same set of powers with the same chances: no racer
// gets better powers for being behind or in front.
// Online: everyone who has the game open can race together (room capability).
import * as THREE from 'three';
import { makePilot } from './characters.js';
import { COLOUR, shade } from './colours.js';
import { hashf as hash } from './noise.js';

export const LAPS = 3;
export const POWERS = {
  rocket: { name: 'Rocket boost', col: '#ff8040', note: 'A big burst of speed.' },
  shot: { name: 'Crystal shot', col: '#9a5ae0', note: 'Fires ahead. Spins out the kart it hits.' },
  bomb: { name: 'Dust bomb', col: '#e04060', note: 'Drops behind you. Spins out whoever drives into it.' },
  shield: { name: 'Bubble shield', col: '#4ab0f0', note: 'Blocks the next hit for 6 seconds.' },
};
const POWER_IDS = Object.keys(POWERS);
const KART_COLS = ['berry', 'sky', 'leaf', 'sun', 'grape', 'coral', 'snow', 'night'];
const SUIT_OF = ['sand', 'sea', 'sun', 'berry', 'frost', 'sand', 'sea', 'sun'];
const BOT_NAMES = ['Zip', 'Pebble', 'Comet', 'Nova', 'Dusty', 'Sprocket', 'Blink'];
export const TRACKS = [
  { id: 'dust', name: 'Red dust loop', seed: 11, ground: ['#c4562a', '#b84d25', '#d0663a'], sky: ['#2a0e10', '#a8462a'], road: '#3a3040', deco: ['coral', 'sun', 'berry'] },
  { id: 'ice', name: 'Ice canyon', seed: 23, ground: ['#bfe3f5', '#a0d0ec', '#d8f0fb'], sky: ['#0a1a34', '#5a9ad0'], road: '#2c3a50', deco: ['sky', 'snow', 'grape'] },
  { id: 'crystal', name: 'Crystal night', seed: 37, ground: ['#3a2a5a', '#2e2050', '#46346a'], sky: ['#06041a', '#3a1a6a'], road: '#241c34', deco: ['grape', 'leaf', 'sky'] },
];
const COINS = [120, 80, 50, 30, 20, 15, 10, 10];
const ROAD_W = 16, N = 720;

function rand(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function pixTex(w, h, fn, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const v = fn(i, j); if (v) { x.fillStyle = v; x.fillRect(i, j, 1, 1); } }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t;
}
const pick = (a, v) => a[Math.floor(v * a.length) % a.length];

export function createRace(env) {
  const { renderer, sfx, profile, saveProfile, touch, onExit } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.4));
  const sunL = new THREE.DirectionalLight(0xffffff, 1.6); sunL.position.set(80, 140, 40); scene.add(sunL);
  let world = null;           // track meshes
  let T = null;               // track data
  const karts = [];           // all karts in the race
  let me = null, state = 'off', clock = 0, countdown = 0, raceT = 0, results = null, active = false;
  const shots = [], bombs = [], boxes = [], pads = [];
  const keys = new Set();
  const tin = { l: 0, r: 0, gas: 0, brake: 0, drift: 0, use: 0 };
  let online = null;          // { room, rid, host, peers }
  let room = null, kartRoom = null, roomTried = false, lastSend = 0;

  // ---------------------------------------------------------------- UI
  const ui = document.createElement('div'); ui.id = 'race'; ui.className = 'hide';
  ui.innerHTML = `
    <div id="rHud">
      <div class="rbox" id="rPos">1st</div>
      <div class="rbox" id="rLap">Lap 1/${LAPS}</div>
      <div class="rbox" id="rTime">0:00.0</div>
      <div class="rbox rpow" id="rPow"><span>Power</span><b id="rPowName">none</b></div>
      <canvas id="rMap" width="150" height="150"></canvas>
      <div id="rBig"></div>
      <div id="rMsg"></div>
      <button id="rQuit" class="rquit">Leave race</button>
    </div>
    <div id="rTouch">
      <div class="rl"><button data-k="l">◀</button><button data-k="r">▶</button></div>
      <div class="rr"><button data-k="use" class="ruse">Power</button><button data-k="drift">Drift</button><button data-k="brake">Brake</button><button data-k="gas" class="rgas">Go</button></div>
    </div>
    <div id="rMenu" class="overlay"><div class="dialog panel" style="width:min(640px,100%)">
      <h2>Star Kart</h2>
      <p class="sub">Race three laps. Drive over glowing pads to boost, and through power boxes to get a power. <b>Everyone gets the same powers with the same chances.</b> Hold Drift while you turn, then let go for a boost.</p>
      <div id="rPowers"></div>
      <h3>Track</h3><div id="rTracks" class="tabs"></div>
      <h3>Your kart</h3><div id="rCols" class="chips"></div>
      <div class="rigbtns"><button id="rBots">Race the computer</button><button id="rOnline">Race online</button></div>
      <div id="rLobby" class="hide"><h3>Online race</h3><p class="sub" id="rLobbyMsg"></p><div id="rPeers"></div>
        <div class="rigbtns"><button id="rReady">I'm ready</button><button id="rStart">Start the race</button></div></div>
      <button id="rBack" class="undo">Back to the game</button>
      <p class="sub rkeys">${touch ? 'Buttons at the bottom of the screen.' : 'Keys: W or Up to go, S or Down to brake, A and D to steer, Shift to drift, Space to use your power.'}</p>
    </div></div>
    <div id="rEnd" class="overlay hide"><div class="dialog panel" style="width:min(520px,100%);text-align:center">
      <h2 id="rEndTitle">Finished!</h2><div id="rEndList"></div><p class="sub" id="rEndCoins"></p>
      <div class="rigbtns"><button id="rAgain">Race again</button><button id="rEndBack">Back to the game</button></div>
    </div></div>`;
  document.body.appendChild(ui);
  const $ = (id) => document.getElementById(id);
  let trackPick = profile.raceTrack || 'dust', colPick = profile.raceCol || 'berry';

  function renderMenu() {
    $('rPowers').innerHTML = POWER_IDS.map(k => `<div class="rpw"><i style="background:${POWERS[k].col}"></i><b>${POWERS[k].name}</b><span>${POWERS[k].note}</span></div>`).join('');
    $('rTracks').innerHTML = TRACKS.map(t => `<button class="${t.id === trackPick ? 'on' : ''}" data-t="${t.id}">${t.name}${profile.raceBest && profile.raceBest[t.id] ? ` · best ${fmt(profile.raceBest[t.id])}` : ''}</button>`).join('');
    $('rTracks').querySelectorAll('button').forEach(b => b.onclick = () => { trackPick = b.dataset.t; profile.raceTrack = trackPick; saveProfile(); renderMenu(); });
    $('rCols').innerHTML = KART_COLS.map(c => `<button class="chip ${c === colPick ? 'on' : ''}" data-c="${c}" title="${COLOUR[c].name}" style="background:${COLOUR[c].hex}"></button>`).join('');
    $('rCols').querySelectorAll('button').forEach(b => b.onclick = () => { colPick = b.dataset.c; profile.raceCol = colPick; saveProfile(); renderMenu(); setPresence(); });
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const ord = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

  // ---------------------------------------------------------------- the track
  function buildTrack(def) {
    if (world) { scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    world = new THREE.Group(); scene.add(world);
    const R = rand(def.seed);
    const pts = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, r = 120 + R() * 70 * (i % 2 ? 1 : 0.6);
      pts.push(new THREE.Vector3(Math.cos(a) * r * 1.3, 2 + Math.sin(i * 1.7 + def.seed) * 3 + 3, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const P = curve.getSpacedPoints(N).slice(0, N);
    const tan = P.map((p, i) => P[(i + 1) % N].clone().sub(P[(i - 1 + N) % N]).setY(0).normalize());
    const side = tan.map(t => new THREE.Vector3(-t.z, 0, t.x));
    let len = 0; for (let i = 0; i < N; i++) len += P[i].distanceTo(P[(i + 1) % N]);
    T = { def, P, tan, side, len, step: len / N };
    // road
    const roadTex = pixTex(16, 16, (i, j) => {
      if (i < 1 || i > 14) return (Math.floor(j / 4) % 2) ? '#eeeef4' : COLOUR[def.deco[0]].hex;
      if ((i === 7 || i === 8) && j < 8) return '#ffd040';
      return pick([def.road, shade(def.road, 0.06), shade(def.road, -0.08)], hash(i, j, 3));
    }, true);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], s = side[k];
      pos.push(p.x - s.x * ROAD_W / 2, p.y, p.z - s.z * ROAD_W / 2, p.x + s.x * ROAD_W / 2, p.y, p.z + s.z * ROAD_W / 2);
      const v = i * T.step / ROAD_W;
      uv.push(0, v, 1, v);
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    world.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: roadTex, side: THREE.DoubleSide })));
    // the sides of the raised road
    const sp = [], si = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], s = side[k];
      for (const sg of [-1, 1]) sp.push(p.x + s.x * sg * ROAD_W / 2, p.y, p.z + s.z * sg * ROAD_W / 2, p.x + s.x * sg * (ROAD_W / 2 + 3), -0.5, p.z + s.z * sg * (ROAD_W / 2 + 3));
      if (i < N) { const a = i * 4; si.push(a, a + 4, a + 1, a + 1, a + 4, a + 5, a + 2, a + 3, a + 6, a + 3, a + 7, a + 6); }
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals();
    world.add(new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: shade(def.ground[0], -0.35), side: THREE.DoubleSide })));
    // ground
    const gt = pixTex(16, 16, (i, j) => pick(def.ground, hash(Math.floor(i / 2), Math.floor(j / 2), 5)), true); gt.repeat.set(160, 160);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ map: gt }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; world.add(ground);
    // sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 16, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(def.sky[0]) }, b: { value: new THREE.Color(def.sky[1]) } },
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; varying float h; void main(){ gl_FragColor = vec4(mix(b, a, clamp(h*1.6,0.0,1.0)),1.0); }',
    }));
    world.add(sky);
    scene.fog = new THREE.Fog(def.sky[1], 220, 650);
    // decorations: tall glowing crystal blocks and block towers along the track
    const boxG = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < N; i += 9) {
      for (const sgn of [-1, 1]) {
        if (R() < 0.45) continue;
        const d = ROAD_W / 2 + 6 + R() * 26, h = 2 + Math.floor(R() * 7), c = COLOUR[def.deco[Math.floor(R() * def.deco.length)]].hex;
        const m = new THREE.Mesh(boxG, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.25 }));
        m.scale.set(2 + R() * 2, h, 2 + R() * 2);
        const p = P[i], s = side[i];
        m.position.set(p.x + s.x * sgn * d, h / 2 - 0.5, p.z + s.z * sgn * d); m.rotation.y = R() * 3;
        world.add(m);
      }
    }
    // barrier blocks along both sides, in two colours
    {
      const bg = new THREE.BoxGeometry(1.2, 1.4, 2.2);
      const cols = [COLOUR[def.deco[0]].hex, '#eeeef4'];
      for (let c = 0; c < 2; c++) {
        const cnt = Math.ceil(N / 8) * 2;
        const im = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ color: cols[c], emissive: cols[c], emissiveIntensity: 0.2 }), cnt);
        const o = new THREE.Object3D(); let n = 0;
        for (let i = c * 4; i < N; i += 8) for (const sgn of [-1, 1]) {
          const p = P[i], s = side[i], d = ROAD_W / 2 + 9.6;
          o.position.set(p.x + s.x * sgn * d, 0.2, p.z + s.z * sgn * d); o.rotation.set(0, Math.atan2(tan[i].x, tan[i].z), 0); o.updateMatrix();
          im.setMatrixAt(n++, o.matrix);
        }
        im.count = n; world.add(im);
      }
    }
    // start arch
    const arch = new THREE.Group();
    const checker = pixTex(16, 4, (i, j) => ((i + j) % 2 ? '#111' : '#fff'));
    const postM = new THREE.MeshLambertMaterial({ color: COLOUR[def.deco[0]].hex, emissive: COLOUR[def.deco[0]].hex, emissiveIntensity: 0.3 });
    for (const sgn of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), postM); post.position.set(sgn * (ROAD_W / 2 + 1), 4.5, 0); arch.add(post); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 3.4, 2, 0.6), new THREE.MeshLambertMaterial({ map: checker })); top.position.y = 9; arch.add(top);
    arch.position.copy(P[0]); arch.lookAt(P[0].clone().add(side[0])); world.add(arch);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 1.5), new THREE.MeshBasicMaterial({ map: pixTex(16, 2, (i, j) => ((i + j) % 2 ? '#111' : '#fff')) }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = -Math.atan2(tan[0].x, tan[0].z) + Math.PI; line.position.copy(P[0]).add(new THREE.Vector3(0, 0.05, 0)); world.add(line);
    // boost pads
    pads.length = 0;
    const padTex = pixTex(8, 8, (i, j) => (Math.abs(i - 3.5) < 4 - Math.abs(j - 3.5) * 0.0 && (j + Math.abs(i - 3.5)) % 4 < 2 ? '#fff4a0' : '#ff8040'));
    for (const at of [0.12, 0.3, 0.47, 0.66, 0.83]) {
      const k = Math.floor(at * N), lane = (R() - 0.5) * ROAD_W * 0.5;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(4, 5), new THREE.MeshBasicMaterial({ map: padTex }));
      pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.atan2(tan[k].x, tan[k].z) + Math.PI;
      pad.position.copy(P[k]).addScaledVector(side[k], lane).add(new THREE.Vector3(0, 0.06, 0));
      world.add(pad); pads.push({ k, lane });
    }
    // power boxes: a row across the track
    boxes.length = 0;
    const boxTex = pixTex(16, 16, (i, j) => {
      if (i < 1 || j < 1 || i > 14 || j > 14) return '#ffffff';
      const d = Math.abs(i - 7.5) + Math.abs(j - 7.5); return d < 3 ? '#ffffff' : d < 5 ? '#ffd040' : null;
    });
    const boxM = new THREE.MeshBasicMaterial({ map: boxTex, transparent: true, opacity: 0.9, color: 0xffffff });
    for (const at of [0.2, 0.42, 0.58, 0.9]) {
      const k = Math.floor(at * N);
      for (const lane of [-5, -1.7, 1.7, 5]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), boxM.clone());
        m.material.color.set(POWERS[POWER_IDS[Math.floor(R() * 4)]].col);
        m.position.copy(P[k]).addScaledVector(side[k], lane).add(new THREE.Vector3(0, 1.3, 0));
        world.add(m); boxes.push({ m, k, lane, gone: 0 });
      }
    }
    drawMapBase();
  }

  // nearest track point near a guess
  function nearest(x, z, guess) {
    let best = guess, bd = 1e9;
    const span = guess == null ? N : 40;
    for (let o = -span; o <= span; o++) {
      const k = guess == null ? o + N : (guess + o + N * 2) % N;
      if (k < 0 || k >= N && guess == null) continue;
      const p = T.P[k % N], d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) { bd = d; best = k % N; }
    }
    return best;
  }

  // ---------------------------------------------------------------- karts
  function makeKart(col, suit) {
    const g = new THREE.Group(), c = COLOUR[col].hex;
    const body = new THREE.MeshLambertMaterial({ color: c }), dark = new THREE.MeshLambertMaterial({ color: 0x22222a }), light = new THREE.MeshLambertMaterial({ color: shade(c, 0.35) });
    const add = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    add(1.8, 0.45, 3.0, 0, 0.55, 0, body);
    add(1.4, 0.3, 0.8, 0, 0.75, -1.4, light);
    add(2.1, 0.25, 0.5, 0, 0.45, -1.65, dark);         // front bumper
    add(2.0, 0.6, 0.3, 0, 1.0, 1.45, body);            // back wing
    add(0.6, 0.4, 0.6, 0, 0.95, 1.0, dark);            // engine
    const glow = add(0.3, 0.3, 0.2, 0, 0.95, 1.35, new THREE.MeshBasicMaterial({ color: 0xff8040 }));
    const wheels = [];
    for (const [x, z] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) wheels.push(add(0.4, 0.7, 0.7, x, 0.35, z, dark));
    const pilot = makePilot(suit); pilot.scale.setScalar(0.55); pilot.position.set(0, 0.55, 0.2); pilot.rotation.y = Math.PI;
    const rig = pilot.userData.rig;
    if (rig) { rig.legL.rotation.x = rig.legR.rotation.x = -1.4; rig.armL.rotation.x = rig.armR.rotation.x = -1.1; }
    g.add(pilot);
    const shieldM = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x4ab0f0, transparent: true, opacity: 0.25, depthWrite: false }));
    shieldM.position.y = 1; shieldM.visible = false; g.add(shieldM);
    const spark = add(0.25, 0.25, 0.25, 0, 0.2, 1.6, new THREE.MeshBasicMaterial({ color: 0x4ab0f0 })); spark.visible = false;
    g.userData = { wheels, glow, shieldM, spark };
    return g;
  }
  function addKart(o) {
    const k = {
      id: o.id, name: o.name, col: o.col, bot: !!o.bot, remote: !!o.remote, me: !!o.me,
      x: 0, z: 0, y: 0, h: 0, v: 0, lap: 0, idx: 0, half: false, done: false, time: 0,
      boost: 0, spin: 0, shield: 0, power: null, drift: 0, charge: 0, hop: 0, lane: o.lane || 0, skill: o.skill || 1, useT: 2 + Math.random() * 3,
      m: makeKart(o.col, o.suit || 'sand'), target: null,
    };
    scene.add(k.m); karts.push(k); return k;
  }
  function placeGrid() {
    karts.forEach((k, i) => {
      const back = 8 + Math.floor(i / 2) * 6, kk = (N - Math.round(back / T.step)) % N, lane = (i % 2 ? 1 : -1) * 3.5;
      const p = T.P[kk], s = T.side[kk];
      k.x = p.x + s.x * lane; k.z = p.z + s.z * lane; k.y = p.y; k.idx = kk; k.lap = 0; k.half = false;
      k.h = Math.atan2(T.tan[kk].x, T.tan[kk].z); k.v = 0; k.done = false; k.time = 0; k.power = null; k.boost = k.spin = k.shield = 0;
    });
  }

  // one step of driving for a kart, from inputs {steer -1..1, gas 0..1, brake, drift}
  function drive(k, inp, dt) {
    if (k.spin > 0) { k.spin -= dt; k.v *= Math.pow(0.2, dt); inp = { steer: 0, gas: 0, brake: 0, drift: 0 }; }
    const ki = nearest(k.x, k.z, k.idx), p = T.P[ki];
    const off = Math.hypot(k.x - p.x, k.z - p.z), onRoad = off < ROAD_W / 2 + 0.6;
    let top = (onRoad ? 34 : 15) * k.skill;
    if (k.boost > 0) { top = 50; k.boost -= dt; k.v = Math.max(k.v, 44); }
    if (inp.gas) k.v += (k.v < top ? 22 : -30) * dt * inp.gas;
    else k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), 8 * dt);
    if (inp.brake) k.v -= (k.v > 0 ? 34 : 10) * dt;
    if (!inp.gas && k.v > top) k.v -= 30 * dt;
    k.v = Math.max(-10, Math.min(k.v, top + 2));
    // drifting: hold drift while turning, let go for a boost
    if (inp.drift && Math.abs(inp.steer) > 0.2 && k.v > 14 && !k.drift) { k.drift = Math.sign(inp.steer); k.charge = 0; k.hop = 0.25; }
    if (k.drift && (!inp.drift || k.v < 10)) {
      if (k.charge > 1.6) { k.boost = Math.max(k.boost, 1.3); if (k.me) sfx.shoot(); }
      else if (k.charge > 0.8) { k.boost = Math.max(k.boost, 0.7); if (k.me) sfx.shoot(); }
      k.drift = 0; k.charge = 0;
    }
    let turn = inp.steer * 2.3 * Math.min(1, Math.abs(k.v) / 12) * (k.v < 0 ? -1 : 1);
    if (k.drift) { turn = (k.drift * 1.5 + inp.steer * 0.9) * 1.25; k.charge += dt * (Math.sign(inp.steer) === k.drift ? 1.4 : 0.8); }
    k.h -= turn * dt;
    const slide = k.drift ? k.drift * 0.35 : 0;
    k.x += Math.sin(k.h + slide) * k.v * dt; k.z += Math.cos(k.h + slide) * k.v * dt;
    // keep inside the barriers
    const ki2 = nearest(k.x, k.z, ki), p2 = T.P[ki2], s2 = T.side[ki2];
    const lat = (k.x - p2.x) * s2.x + (k.z - p2.z) * s2.z, lim = ROAD_W / 2 + 9;
    if (Math.abs(lat) > lim) { const back = Math.abs(lat) - lim; k.x -= s2.x * Math.sign(lat) * back; k.z -= s2.z * Math.sign(lat) * back; k.v *= 0.6; }
    // height: on the road, or down to the ground beside it
    const fall = Math.max(0, Math.min(1, (Math.abs(lat) - ROAD_W / 2) / 3));
    const want = p2.y * (1 - fall) - 0.5 * fall;
    k.hop = Math.max(0, k.hop - dt);
    k.y += (want + (k.hop > 0 ? Math.sin(k.hop / 0.25 * Math.PI) * 0.6 : 0) - k.y) * Math.min(1, dt * 12);
    // laps
    const prev = k.idx; k.idx = ki2;
    if (k.idx > N * 0.45 && k.idx < N * 0.55) k.half = true;
    if (prev > N * 0.9 && k.idx < N * 0.1 && k.half) {
      k.half = false; k.lap++;
      if (k.lap >= LAPS && !k.done) { k.done = true; k.time = raceT; if (k.me) finishMe(); }
      else if (k.me) { msg(k.lap === LAPS - 1 ? 'Last lap!' : `Lap ${k.lap + 1}`); sfx.coin(); }
    }
    if (prev < N * 0.1 && k.idx > N * 0.9 && k.lap > 0 && !k.half) { /* drove backwards over the line */ }
  }
  const progress = (k) => (k.done ? 1e6 - k.time * 100 : k.lap * N + k.idx + (k.half || k.idx < N / 2 ? 0 : -N));

  function bot(k, dt) {
    const look = (k.idx + 14) % N, p = T.P[look], s = T.side[look];
    k.lane += (Math.sin(raceT * 0.3 + k.skill * 9) * 4 - k.lane) * dt * 0.5;
    const tx = p.x + s.x * k.lane, tz = p.z + s.z * k.lane;
    let want = Math.atan2(tx - k.x, tz - k.z) - k.h; want = Math.atan2(Math.sin(want), Math.cos(want));
    drive(k, { steer: Math.max(-1, Math.min(1, -want * 2.5)), gas: 1, brake: 0, drift: 0 }, dt);
    // the same powers as everyone, used with simple rules
    if (k.power) {
      k.useT -= dt;
      if (k.useT <= 0) {
        const ahead = karts.some(o => o !== k && !o.done && progress(o) > progress(k) && progress(o) - progress(k) < 40);
        const behind = karts.some(o => o !== k && progress(k) > progress(o) && progress(k) - progress(o) < 25);
        if (k.power === 'rocket' || k.power === 'shield' || (k.power === 'shot' && ahead) || (k.power === 'bomb' && behind) || k.useT < -6) usePower(k);
        else k.useT = 0.5;
      }
    }
  }

  // ---------------------------------------------------------------- powers
  function usePower(k) {
    const pw = k.power; if (!pw) return;
    k.power = null; k.useT = 2 + Math.random() * 3;
    if (pw === 'rocket') { k.boost = Math.max(k.boost, 1.6); if (k.me) sfx.shoot(); }
    if (pw === 'shield') { k.shield = 6; if (k.me) sfx.scan(); }
    if (pw === 'shot' || pw === 'bomb') {
      const fx = { t: pw, x: k.x + Math.sin(k.h) * (pw === 'shot' ? 3 : -3), z: k.z + Math.cos(k.h) * (pw === 'shot' ? 3 : -3), y: k.y, h: k.h, o: k.id, id: k.id + ':' + Math.floor(Math.random() * 1e9) };
      spawnFx(fx);
      if (online && !k.remote) online.room.emit('fx', { rid: online.rid, ...fx }).catch(() => {});
      if (k.me) sfx.pop();
    }
  }
  const shotG = new THREE.OctahedronGeometry(0.7), bombG = new THREE.DodecahedronGeometry(0.8);
  function spawnFx(fx) {
    if (shots.some(s => s.id === fx.id) || bombs.some(b => b.id === fx.id)) return;
    if (fx.t === 'shot') {
      const m = new THREE.Mesh(shotG, new THREE.MeshBasicMaterial({ color: 0xc890ff })); scene.add(m);
      shots.push({ ...fx, m, life: 3, idx: nearest(fx.x, fx.z, null) });
    } else {
      const m = new THREE.Mesh(bombG, new THREE.MeshLambertMaterial({ color: 0xe04060, emissive: 0x601020 })); scene.add(m);
      bombs.push({ ...fx, m, life: 25 });
    }
  }
  function removeFx(id) {
    for (const L of [shots, bombs]) { const i = L.findIndex(s => s.id === id); if (i >= 0) { scene.remove(L[i].m); L.splice(i, 1); } }
  }
  // only karts this page drives are checked: my kart, and the bots if I run them
  const mine = (k) => k.me || (k.bot && (!online || online.host));
  function hitKart(k, id) {
    removeFx(id);
    if (online) online.room.emit('fx', { rid: online.rid, t: 'pop', id }).catch(() => {});
    if (k.shield > 0) { k.shield = 0; if (k.me) msg('Your shield blocked it!'); return; }
    k.spin = 1.1; k.drift = 0;
    if (k.me) { sfx.hurt(); msg('Spun out!'); }
  }
  function updateFx(dt) {
    for (const s of [...shots]) {
      s.life -= dt;
      // fly along the track, turning a little toward the nearest kart ahead
      s.idx = nearest(s.x, s.z, s.idx);
      const p = T.P[(s.idx + 6) % N];
      let want = Math.atan2(p.x - s.x, p.z - s.z), best = null, bd = 30;
      for (const k of karts) { if (k.id === s.o) continue; const d = Math.hypot(k.x - s.x, k.z - s.z); const a = Math.atan2(k.x - s.x, k.z - s.z) - s.h; if (d < bd && Math.cos(a) > 0.5) { bd = d; best = k; } }
      if (best) want = Math.atan2(best.x - s.x, best.z - s.z);
      let d = want - s.h; d = Math.atan2(Math.sin(d), Math.cos(d)); s.h += d * Math.min(1, dt * 4);
      s.x += Math.sin(s.h) * 62 * dt; s.z += Math.cos(s.h) * 62 * dt; s.y += (T.P[s.idx].y - s.y) * dt * 8;
      s.m.position.set(s.x, s.y + 1, s.z); s.m.rotation.y += dt * 10;
      if (s.life <= 0) { removeFx(s.id); continue; }
      for (const k of karts) if (k.id !== s.o && mine(k) && Math.hypot(k.x - s.x, k.z - s.z) < 2.2) { hitKart(k, s.id); break; }
    }
    for (const b of [...bombs]) {
      b.life -= dt; b.m.position.set(b.x, b.y + 0.7 + Math.sin(raceT * 4) * 0.15, b.z); b.m.rotation.y += dt * 2;
      if (b.life <= 0) { removeFx(b.id); continue; }
      for (const k of karts) if (mine(k) && Math.hypot(k.x - b.x, k.z - b.z) < 2.2 && !(k.id === b.o && b.life > 24)) { hitKart(k, b.id); break; }
    }
    // power boxes and boost pads: each page handles its own karts
    for (const bx of boxes) {
      bx.m.rotation.y += dt * 1.5; bx.m.rotation.x += dt;
      if (bx.gone > 0) { bx.gone -= dt; bx.m.visible = bx.gone <= 0; continue; }
      for (const k of karts) if (mine(k) && !k.power && Math.hypot(k.x - bx.m.position.x, k.z - bx.m.position.z) < 2.2) {
        k.power = POWER_IDS[Math.floor(Math.random() * POWER_IDS.length)];   // same odds for everyone
        bx.gone = 3; bx.m.visible = false;
        if (k.me) { sfx.pickup(); msg(POWERS[k.power].name + '!'); }
        break;
      }
    }
    for (const pd of pads) {
      const p = T.P[pd.k], s = T.side[pd.k], x = p.x + s.x * pd.lane, z = p.z + s.z * pd.lane;
      for (const k of karts) if (mine(k) && Math.hypot(k.x - x, k.z - z) < 2.8 && k.boost < 0.5) { k.boost = 1.2; if (k.me) sfx.shoot(); }
    }
  }

  // ---------------------------------------------------------------- start, finish
  function startRace(opts) {
    for (const k of karts) scene.remove(k.m);
    karts.length = 0; results = null;
    for (const s of [...shots, ...bombs]) scene.remove(s.m); shots.length = bombs.length = 0;
    const def = TRACKS.find(t => t.id === opts.track) || TRACKS[0];
    buildTrack(def);
    const list = opts.list;     // [{id, name, col, suit, bot, me, remote}]
    list.forEach((o, i) => addKart({ ...o, lane: (i % 2 ? 1 : -1) * 3, skill: o.bot ? 0.93 + (hash(i, 3, opts.seed || 1) * 0.06) : 1 }));
    me = karts.find(k => k.me);
    placeGrid();
    countdown = opts.t0 ? Math.max(0.5, (opts.t0 - Date.now()) / 1000) : 3.5; raceT = 0; state = 'count';
    $('rMenu').classList.add('hide'); $('rEnd').classList.add('hide');
    lastBeep = 99;
  }
  function soloRace() {
    online = null;
    const list = [{ id: 'me', name: 'You', col: colPick, suit: 'sand', me: true }];
    const cols = KART_COLS.filter(c => c !== colPick);
    for (let i = 0; i < 5; i++) list.push({ id: 'bot' + i, name: BOT_NAMES[i], col: cols[i], suit: SUIT_OF[i + 1], bot: true });
    startRace({ track: trackPick, list, seed: Date.now() % 1000 });
  }
  function finishMe() {
    const place = karts.filter(k => k.done && k.time < me.time).length + 1;
    msg(`Finished ${ord(place)}!`); sfx.win();
  }
  function endRace() {
    state = 'end';
    // karts still going get a finish time from how far they got
    for (const k of karts) if (!k.done) { const left = (LAPS * N - progress(k)) * T.step; k.time = raceT + Math.max(1, left / 30); k.done = true; k.est = true; }
    const order = [...karts].sort((a, b) => a.time - b.time);
    const place = order.indexOf(me) + 1;
    const coins = (COINS[place - 1] || 10) + (online ? 40 : 0);
    profile.coins += coins;
    profile.raceBest = profile.raceBest || {};
    if (!me.est && (!profile.raceBest[T.def.id] || me.time < profile.raceBest[T.def.id])) profile.raceBest[T.def.id] = me.time;
    profile.raceWins = (profile.raceWins || 0) + (place === 1 ? 1 : 0);
    if (env.track) { env.track('race'); if (place === 1) env.track('racewin'); }
    saveProfile();
    $('rEndTitle').textContent = place === 1 ? 'You won!' : `You came ${ord(place)}`;
    $('rEndList').innerHTML = order.map((k, i) => `<div class="rres ${k.me ? 'me' : ''}"><b>${ord(i + 1)}</b><i style="background:${COLOUR[k.col].hex}"></i><span>${esc(k.name)}${k.bot ? ' (computer)' : ''}</span><span>${k.est ? 'did not finish' : fmt(k.time)}</span></div>`).join('');
    $('rEndCoins').textContent = `+${coins} coins${online ? ' (40 extra for racing online)' : ''}. Races won: ${profile.raceWins}.`;
    $('rEnd').classList.remove('hide');
    setPresence();
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let msgT = 0;
  function msg(t) { $('rMsg').textContent = t; msgT = 2; }

  // ---------------------------------------------------------------- online
  async function getRoom() {
    if (roomTried) return room;
    roomTried = true;
    try { const c = window.claude && await window.claude.use('room'); room = c || null; } catch (e) { room = null; }
    try { env.user = window.claude && await window.claude.use('user'); } catch (e) { }
    return room;
  }
  let ready = false, lobbyOn = false;
  async function openLobby() {
    const r = await getRoom();
    $('rLobby').classList.remove('hide');
    if (!r) { $('rLobbyMsg').textContent = 'Online racing works when the game is opened from its claude.ai link by people it is shared with. You can race the computer here.'; $('rReady').disabled = $('rStart').disabled = true; return; }
    if (!kartRoom) {
      try { kartRoom = await r.join('star-kart'); } catch (e) { $('rLobbyMsg').textContent = 'Could not reach the online race room. Try again in a moment.'; return; }
      kartRoom.onPeers(() => renderLobby());
      kartRoom.on('start', (m) => onStart(m));
      kartRoom.on('fx', (m) => onFx(m));
    }
    lobbyOn = true; setPresence(); renderLobby();
  }
  function setPresence(extra) {
    if (!kartRoom) return;
    kartRoom.presence({ c: colPick, st: state === 'off' || state === 'end' ? (ready ? 'ready' : 'lobby') : 'racing', ...(extra || {}) }).catch(() => {});
  }
  const names = {};
  async function nameOf(p) {
    if (p.isMe) return 'You';
    if (p.by && env.user) { if (!names[p.by]) { try { const ps = await env.user.profiles([p.by]); names[p.by] = (ps[p.by] && ps[p.by].name) || 'Racer'; } catch (e) { names[p.by] = 'Racer'; } } return names[p.by]; }
    return 'Racer';
  }
  async function renderLobby() {
    if (!kartRoom || !lobbyOn) return;
    const ps = kartRoom.peers().filter(p => p.kind === 'viewer');
    const rows = [];
    for (const p of ps) rows.push(`<div class="rres ${p.isMe ? 'me' : ''}"><i style="background:${(COLOUR[p.presence.c] || COLOUR.snow).hex}"></i><span>${esc(await nameOf(p))}</span><span>${p.presence.st === 'ready' ? 'Ready' : p.presence.st === 'racing' ? 'Racing' : 'Waiting'}</span></div>`);
    $('rPeers').innerHTML = rows.join('') || '<p class="sub">Nobody here yet.</p>';
    const readyN = ps.filter(p => p.presence.st === 'ready').length;
    $('rLobbyMsg').textContent = ps.length > 1 ? `${ps.length} people have the race open. ${readyN} ready. Computer racers fill the empty places.` : 'You are the only one here right now. Share the game link and race when someone joins.';
    $('rReady').textContent = ready ? 'Not ready' : "I'm ready";
    $('rStart').disabled = !ready;
  }
  function hostStart() {
    if (!kartRoom || !ready) return;
    const ps = kartRoom.peers().filter(p => p.kind === 'viewer' && (p.presence.st === 'ready'));
    const list = ps.slice(0, 6).map(p => ({ peer: p.peer, col: p.presence.c || 'snow' }));
    const rid = 'r' + Math.floor(Math.random() * 1e9);
    kartRoom.emit('start', { rid, track: trackPick, t0: Date.now() + 4000, list, bots: Math.max(0, 4 - list.length), seed: Math.floor(Math.random() * 1000) }).catch(() => {});
  }
  async function onStart(m) {
    const d = m.data || {};
    if (!d.list || !Array.isArray(d.list) || (state !== 'off' && state !== 'end')) return;
    const mine0 = d.list.find(e => e.peer === kartRoom.peers().find(p => p.sameTab)?.peer);
    if (!mine0) return;
    const host = m.sameTab;
    online = { room: kartRoom, rid: String(d.rid), host, hostPeer: m.peer };
    const list = [];
    const used = new Set();
    for (const e of d.list.slice(0, 6)) {
      const p = kartRoom.peers().find(q => q.peer === e.peer);
      let col = COLOUR[e.col] ? e.col : 'snow'; if (used.has(col)) col = KART_COLS.find(c => !used.has(c)); used.add(col);
      list.push({ id: 'p:' + e.peer, name: p ? await nameOf(p) : 'Racer', col, suit: SUIT_OF[list.length], me: e.peer === mine0.peer, remote: e.peer !== mine0.peer });
    }
    const nb = Math.min(4, Math.max(0, +d.bots || 0));
    for (let i = 0; i < nb; i++) { const col = KART_COLS.find(c => !used.has(c)); used.add(col); list.push({ id: 'bot' + i, name: BOT_NAMES[i], col, suit: SUIT_OF[(i + 3) % 8], bot: true, remote: !host }); }
    ready = false;
    startRace({ track: d.track, list, t0: +d.t0, seed: +d.seed || 1 });
    lobbyOn = false;
  }
  function onFx(m) {
    const d = m.data || {};
    if (!online || d.rid !== online.rid || m.sameTab) return;
    if (d.t === 'pop') { removeFx(String(d.id)); return; }
    if (d.t === 'shot' || d.t === 'bomb') spawnFx({ t: d.t, x: +d.x, z: +d.z, y: +d.y, h: +d.h, o: String(d.o), id: String(d.id) });
  }
  // send my kart (and the bots if I run them) about 15 times a second
  function sendState() {
    if (!online || raceT - lastSend < 0.066) return;
    lastSend = raceT;
    const pack = (k) => [Math.round(k.x * 10) / 10, Math.round(k.z * 10) / 10, Math.round(k.y * 10) / 10, Math.round(k.h * 100) / 100, Math.round(k.v * 10) / 10, k.lap, k.idx, k.done ? Math.round(k.time * 100) / 100 : 0, (k.spin > 0 ? 1 : 0) | (k.shield > 0 ? 2 : 0) | (k.boost > 0 ? 4 : 0)];
    const out = { rid: online.rid, k: pack(me) };
    if (online.host) out.b = karts.filter(k => k.bot).map(pack);
    online.room.presence(out).catch(() => {});
  }
  function readRemote(dt) {
    if (!online) return;
    for (const p of online.room.peers()) {
      if (p.sameTab || p.presence.rid !== online.rid) continue;
      const apply = (k, a) => {
        if (!k || !Array.isArray(a)) return;
        const [x, z, y, h, v, lap, idx, done, fl] = a.map(Number);
        k.tx = x; k.tz = z; k.ty = y; k.th = h; k.v = v; k.lap = lap; k.idx = idx; k.half = idx > N / 2;
        if (done && !k.done) { k.done = true; k.time = done; }
        k.spin = fl & 1 ? 0.2 : 0; k.shield = fl & 2 ? 1 : 0; k.boost = fl & 4 ? 0.2 : 0;
      };
      apply(karts.find(k => k.id === 'p:' + p.peer), p.presence.k);
      if (p.peer === online.hostPeer && Array.isArray(p.presence.b)) karts.filter(k => k.bot).forEach((k, i) => apply(k, p.presence.b[i]));
    }
    for (const k of karts) if (k.remote && k.tx != null) {
      const f = Math.min(1, dt * 10);
      k.tx += Math.sin(k.th) * k.v * dt; k.tz += Math.cos(k.th) * k.v * dt;
      k.x += (k.tx - k.x) * f; k.z += (k.tz - k.z) * f; k.y += (k.ty - k.y) * f;
      let dh = k.th - k.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); k.h += dh * f;
    }
  }

  // ---------------------------------------------------------------- map
  let mapBase = null;
  function drawMapBase() {
    const c = document.createElement('canvas'); c.width = c.height = 150; const x = c.getContext('2d');
    let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    for (const p of T.P) { mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x); mnz = Math.min(mnz, p.z); mxz = Math.max(mxz, p.z); }
    const s = 130 / Math.max(mxx - mnx, mxz - mnz);
    T.map = (px, pz) => [10 + (px - mnx) * s, 10 + (pz - mnz) * s];
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 5; x.beginPath();
    T.P.forEach((p, i) => { const [a, b] = T.map(p.x, p.z); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); x.stroke();
    mapBase = c;
  }
  function drawMap() {
    const c = $('rMap'), x = c.getContext('2d');
    x.clearRect(0, 0, 150, 150); x.drawImage(mapBase, 0, 0);
    for (const k of karts) { const [a, b] = T.map(k.x, k.z); x.fillStyle = COLOUR[k.col].hex; x.strokeStyle = k.me ? '#fff' : '#000'; x.lineWidth = 2; x.beginPath(); x.arc(a, b, k.me ? 5 : 4, 0, 7); x.fill(); x.stroke(); }
  }

  // ---------------------------------------------------------------- frame
  let lastBeep = 99;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function frame(dt) {
    if (state === 'count') {
      countdown -= dt;
      const n = Math.ceil(countdown);
      if (n !== lastBeep && n > 0 && n <= 3) { lastBeep = n; sfx.pickup(); }
      $('rBig').textContent = countdown > 0 ? (n <= 3 ? n : '') : 'GO!';
      if (countdown <= 0) { state = 'race'; sfx.cleared(); setTimeout(() => { if ($('rBig').textContent === 'GO!') $('rBig').textContent = ''; }, 800); }
    }
    if (state === 'race' || state === 'done') {
      raceT += dt;
      const inp = {
        steer: (keys.has('KeyA') || keys.has('ArrowLeft') || tin.l ? -1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') || tin.r ? 1 : 0),
        gas: keys.has('KeyW') || keys.has('ArrowUp') || tin.gas ? 1 : 0,
        brake: keys.has('KeyS') || keys.has('ArrowDown') || tin.brake ? 1 : 0,
        drift: keys.has('ShiftLeft') || keys.has('ShiftRight') || tin.drift ? 1 : 0,
      };
      if (me.done) Object.assign(inp, { gas: 1, steer: 0, drift: 0 });
      if (!me.done) drive(me, inp, dt); else bot(me, dt);
      for (const k of karts) if (k.bot && !k.remote) bot(k, dt);
      for (const k of karts) if (k.shield > 0 && !k.remote) k.shield -= dt;
      readRemote(dt);
      // karts bump each other (each page only moves the karts it drives)
      for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
        const A = karts[i], Bk = karts[j], dx = Bk.x - A.x, dz = Bk.z - A.z, d = Math.hypot(dx, dz);
        if (d > 0.01 && d < 2.6) {
          const push = (2.6 - d) / 2, ux = dx / d, uz = dz / d;
          if (mine(A)) { A.x -= ux * push; A.z -= uz * push; }
          if (mine(Bk)) { Bk.x += ux * push; Bk.z += uz * push; }
        }
      }
      updateFx(dt);
      sendState();
      // the race ends when every person has finished, or 30 seconds after the first one
      const people = karts.filter(k => !k.bot);
      const first = Math.min(...karts.filter(k => k.done).map(k => k.time));
      if (state === 'race' && (people.every(k => k.done) || (isFinite(first) && raceT - first > 30) || raceT > 600)) setTimeout(endRace, 1200), state = 'done';
    }
    // models
    for (const k of karts) {
      k.m.position.set(k.x, k.y, k.z);
      k.m.rotation.y = k.h + Math.PI + (k.spin > 0 ? raceT * 14 : 0) + (k.drift ? -k.drift * 0.35 : 0);
      const u = k.m.userData;
      u.wheels.forEach(w => { w.rotation.x += k.v * dt * 1.4; });
      u.shieldM.visible = k.shield > 0;
      u.glow.material.color.set(k.boost > 0 ? 0xfff4a0 : 0xff8040); u.glow.scale.setScalar(k.boost > 0 ? 2.2 : 1);
      u.spark.visible = !!k.drift && k.charge > 0.8; u.spark.material.color.set(k.charge > 1.6 ? 0xff8040 : 0x4ab0f0);
    }
    // camera behind me
    if (me) {
      const back = new THREE.Vector3(-Math.sin(me.h) * 9, 4.2, -Math.cos(me.h) * 9);
      camPos.lerp(new THREE.Vector3(me.x, me.y, me.z).add(back), Math.min(1, dt * 6));
      if (camPos.lengthSq() < 1 || state === 'count') camPos.set(me.x, me.y, me.z).add(back);
      camera.position.copy(camPos);
      camLook.set(me.x + Math.sin(me.h) * 6, me.y + 1.5, me.z + Math.cos(me.h) * 6);
      camera.lookAt(camLook);
      camera.fov = 70 + (me.boost > 0 ? 10 : 0); camera.updateProjectionMatrix();
      // HUD
      const order = [...karts].sort((a, b) => progress(b) - progress(a));
      $('rPos').textContent = ord(order.indexOf(me) + 1) + ` of ${karts.length}`;
      $('rLap').textContent = `Lap ${Math.min(LAPS, me.lap + 1)}/${LAPS}`;
      $('rTime').textContent = fmt(me.done ? me.time : raceT);
      $('rPowName').textContent = me.power ? POWERS[me.power].name : 'none';
      $('rPow').style.borderColor = me.power ? POWERS[me.power].col : '';
      drawMap();
    }
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) $('rMsg').textContent = ''; }
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- input
  function onKey(e, down) {
    if (!active) return;
    if (down) keys.add(e.code); else keys.delete(e.code);
    if (down && e.code === 'Space' && me && state === 'race' && !me.done) { usePower(me); e.preventDefault(); }
    if (down && e.code === 'Escape') leave();
    e.stopPropagation();
  }
  window.addEventListener('keydown', (e) => onKey(e, true), true);
  window.addEventListener('keyup', (e) => onKey(e, false), true);
  ui.querySelectorAll('#rTouch button').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); tin[k] = 1; if (k === 'use' && me && state === 'race') usePower(me); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { tin[k] = 0; });
  });
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  $('rBots').onclick = soloRace;
  $('rOnline').onclick = openLobby;
  $('rReady').onclick = () => { ready = !ready; setPresence(); renderLobby(); };
  $('rStart').onclick = hostStart;
  $('rBack').onclick = leave; $('rEndBack').onclick = leave; $('rQuit').onclick = leave;
  $('rAgain').onclick = () => { $('rEnd').classList.add('hide'); state = 'off'; $('rMenu').classList.remove('hide'); renderMenu(); if (lobbyOn || online) openLobby(); };

  function open() {
    active = true; state = 'off'; ui.classList.remove('hide'); ui.classList.toggle('touch', !!touch);
    $('rMenu').classList.remove('hide'); $('rEnd').classList.add('hide'); $('rLobby').classList.add('hide');
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    if (!T) buildTrack(TRACKS.find(t => t.id === trackPick) || TRACKS[0]);
    if (!me) { const k = addKart({ id: 'me', name: 'You', col: colPick, me: true }); me = k; placeGrid(); }
    renderMenu();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function leave() {
    active = false; state = 'off'; ui.classList.add('hide'); keys.clear();
    for (const k of Object.keys(tin)) tin[k] = 0;
    if (online) { online = null; }
    ready = false; lobbyOn = false; setPresence({ rid: null, k: null, b: null });
    onExit();
  }
  return {
    open, leave, frame,
    get active() { return active; }, get state() { return state; }, get karts() { return karts; }, get me() { return me; },
    soloRace, usePower: () => me && usePower(me), endRace, get T() { return T; },
  };
}
