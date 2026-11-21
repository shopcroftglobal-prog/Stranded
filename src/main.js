import * as THREE from 'three';
import * as rigsMod from './rigs.js';
import { createRace } from './race.js';
import { createFriends, PHRASES } from './friends.js';
import { makeRover, makePilot, animate, SUITS } from './characters.js';
const LOOKS = { suit: { sand: 0, sea: 100, sun: 100, berry: 250, frost: 250 }, rover: { sun: 0, sea: 150, berry: 150 } };
import { createPets, caughtPets, PET_GIFTS } from './pets.js';
import { createHooks } from './hooks.js';
import { createQuests, dailyQuests, questText, questCoins, BADGES } from './quests.js';
import { HOME_R, LEVELS, COSY_LIST, comfort, levelOf, atHome, giftReady, claimGift, updateGardens, growTime } from './home.js';
import { World, CS, H, meshChunk, meshVolume } from './world.js';
import { hash3 } from './noise.js';
import { FAMILY_ITEMS, BUILD_COST, BUILD_RECIPES, recipeFor } from './blocks.js';
import { COLOUR, FAMILIES } from './colours.js';
import { PLANS, planBlocks } from './plans.js';
import { B, BLOCKS, ITEMS, RECIPES, FORGE_RECIPES, PARTS, TOOL_SPEED, nameGround } from './blocks.js';
import { buildAtlas, buildCracks, blockIcon, itemIcon, flatIcon } from './textures.js';
import { Player, EYE, PW, PH, physicsFor } from './player.js';
import { buildSky, Cloud, Bits } from './effects.js';
import { PLANETS, planetById, gravityWords, tempWords, starWords, distanceWords, jumpWords } from './planets.js';
import { worldParams } from './looks.js';
import { createWater } from './water.js';
import { createSunset, createAurora, createWeather, createPrints, createDaySky, createFarHills, createDustDevils, createClouds, createPlumes } from './fx2.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { shipBlocks, SMOKE_POINTS, DEBRIS, SHIP_BASE } from './ship.js';
import { initAudio, sfx, setVolume, setMusic, setMood, startMusic, restartMusic } from './audio.js';
import { createAdventure, MAX_HP, MAX_AIR, LAST_WAVE, STAGES, stageOf, DRAGONS, FINDS, RARE_OF } from './adventure.js';
import { profile, loadProfile, saveProfile, note, wavesOn, WORLD_ORDER } from './profile.js';
import { STARS, starOf, fuelFor, canFly, UPGRADES, ENGINE_NAMES, TANK_SIZE, ENGINE_NEED } from './starmap.js';
import { ENEMIES, BIG } from './enemies.js';
import { placeRig, removeRig, rigAt, accrue, accrueAll, markSeen, rigSlots, rigCount, rigList, FREE_RIGS, RIG_SLOT_COINS, RIG_MINUTES, RIG_CAP, RIG_TREASURE, FIRST_LUCKY, nextFindIn, adsLeft, adBoost, boostLeft, AD_HOURS } from './rigs.js';
loadProfile();

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const LAST_KEY = 'stranded-last-world';
// Mars keeps its step 1 save
const saveKey = (id) => (id === 'mars' ? 'stranded-on-mars-v1' : `stranded-${id}-v1`);
let look = null;      // worldParams() of the world you are on
let SAVE_KEY = saveKey('mars');
// Phones and tablets: touch controls and lighter settings
const TOUCH = params.has('touch') || (!params.has('desktop') && !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
const LIGHT = TOUCH || params.has('light');
// player settings, kept in this browser
const SETTINGS_KEY = 'stranded-settings-v1';
const settings = Object.assign({ sound: 0.35, music: 0.5, quality: LIGHT ? 'low' : 'normal', mouse: 1 }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } })());
const QUALITY = { low: { r: 3, px: 1 }, normal: { r: LIGHT ? 4 : 6, px: LIGHT ? 1.5 : 2 }, high: { r: LIGHT ? 6 : 8, px: 2 } };
let RENDER_R = Math.max(2, Math.min(10, +params.get('r') || QUALITY[settings.quality].r));
if (TOUCH) document.body.classList.add('touch');
const SHIP_CENTER = new THREE.Vector3(0.5, SHIP_BASE + 2, 0.5);

// ---------------- renderer and scene ----------------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[settings.quality].px));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = !LIGHT;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
// glow: bright things (crystals, lamps, the sun, lava) softly shine. Off on the Fast setting.
function setupGlow() {
  if (composer) return;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020106);
scene.fog = new THREE.Fog(0x4a2216, RENDER_R * CS * 0.35, RENDER_R * CS - 4);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 2000);
const fitCamera = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.fov = camera.aspect < 1 ? 88 : 72; camera.updateProjectionMatrix(); };
fitCamera();
scene.add(camera);

const hemi = new THREE.HemisphereLight(0x8a6a8a, 0x3a1a10, 0.9);
const amb = new THREE.AmbientLight(0xc08870, 0.45);
scene.add(hemi, amb);
const SUN_DIR = new THREE.Vector3(25, 30, 35).normalize();
const sun = new THREE.DirectionalLight(0xffe2c4, 2.6);
sun.castShadow = !LIGHT;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 200 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const lamp = new THREE.SpotLight(0xffe6c8, 0, 28, 0.8, 0.55, 1.0);
lamp.position.set(0, -0.2, 0.1);
camera.add(lamp); camera.add(lamp.target); lamp.target.position.set(0, -0.3, -5);
let sky = null, water = null, fogBase = 0;
let composer = null, bloom = null;
water = createWater(scene);
const lavaSea = createWater(scene, { lava: true });
const sunset = createSunset(scene), aurora = createAurora(scene), weather = createWeather(scene), prints = createPrints(scene);
const daySky = createDaySky(scene), farHills = createFarHills(scene), devils = createDustDevils(scene), clouds = createClouds(scene), plumes = createPlumes(scene);
let weatherT = 30, weatherOn = false;

const atlas = buildAtlas();
const mat = new THREE.MeshLambertMaterial({ map: atlas.map, emissiveMap: atlas.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.9, vertexColors: true, alphaTest: 0.5 });
const cracks = buildCracks();
const crackMat = new THREE.MeshBasicMaterial({ map: cracks[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const crackBox = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), crackMat);
crackBox.visible = false; scene.add(crackBox);
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)), new THREE.LineBasicMaterial({ color: 0x120604, transparent: true, opacity: 0.7 }));
outline.visible = false; scene.add(outline);

const smoke = new Cloud(scene, 240, { color: 0x5a4a44, size: 1.6, opacity: 0.55 });
const flames = new Cloud(scene, 400, { color: 0xffa040, size: 1.5, additive: true, opacity: 0.9 });
const bits = new Bits(scene);

// ---------------- game state ----------------
const freshState = () => ({
  inv: {}, order: [], hotbar: Array(9).fill(null), sel: 0,
  fixed: { patch: false, engine: false, fueltank: false, computer: false, launch: false },
  won: false, stats: { mined: 0, placed: 0, time: 0 },
  hp: MAX_HP, air: MAX_AIR, boxes: {}, home: null, lost: null,
});
let state = freshState();
let team = null;   // { code, world } when playing a world together
let inCamp = false, friends = null, quests = null, pets = null, hooks = null;
let world, player;
let playing = false, paused = false;
let shipMesh = null, launchT = -1;

function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function writeSave() {
  saveProfile();
  if (!world || launchT >= 0) return;
  const data = {
    v: 1, state: { ...state, fixed: { ...state.fixed, launch: false } },
    pos: player.pos, yaw: player.yaw, pitch: player.pitch, edits: world.serializeEdits(),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* private mode: no saving */ }
}

// Repaint blocks, sky and light for a world
function applyLook(id) {
  look = worldParams(id);
  SAVE_KEY = saveKey(id);
  try { localStorage.setItem(LAST_KEY, id); } catch (e) { }
  const k = look.sky;
  buildAtlas(look.pal);
  nameGround(look.planet.surface);
  for (const key in iconCache) delete iconCache[key];
  for (const key in tileColors) delete tileColors[key];
  if (sky) { scene.remove(sky); sky.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
  sky = buildSky(scene, k, SUN_DIR, look.planet);
  if (adv) adv.reset();
  scene.fog.color.set(k.fog); fogBase = k.fog;
  scene.background.set(k.top);
  if (lavaSea) lavaSea.setLevel(look.terrain.lava ? look.terrain.sea + 0.75 : null);
  if (prints) prints.clear();
  if (plumes) plumes.reset();
  if (water) water.setLevel(look.terrain.liquid && !look.terrain.lava ? look.terrain.sea + 0.9 : null, look.planet.id === 'lhs1140b' ? 0x2f6688 : 0x23889a);
  sun.color.set(k.sun); sun.intensity = k.sunI;
  hemi.color.set(k.hemi[0]); hemi.groundColor.set(k.hemi[1]); hemi.intensity = k.hemi[2];
  amb.color.set(k.amb[0]); amb.intensity = k.amb[1];
  renderer.toneMappingExposure = k.exposure;
  bits.gravity = physicsFor(look.gravity).gravity * 0.9;
  const name = look.planet.name;
  document.title = `Stranded on ${name}`;
  $('worldName').textContent = name;
  $('worldTemp').textContent = `${look.planet.real.tempC} °C`;
  $('winTitle').textContent = `You made it off ${name}!`;
}

function setupWorld(save, arriving = false) {
  if (world) for (const c of world.chunks.values()) if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); }
  world = new World(look, inCamp ? 777 : undefined);
  if (inCamp || team) { const set0 = world.set.bind(world); world.set = (x, y, z, id, rec = true) => { set0(x, y, z, id, rec); if (rec && friends) friends.blockChanged(x, y, z, id); }; }
  state = save ? Object.assign(freshState(), save.state) : freshState();
  homeLv = 0; homeT = 0;
  if (inCamp && !save) { state.fixed = { patch: true, engine: true, fueltank: true, computer: true, launch: false }; state.won = true; state.arrived = true; campKit(); }
  if (profile.testAll && !state.won && !inCamp) { state.fixed = { patch: true, engine: true, fueltank: true, computer: true, launch: false }; state.won = true; state.arrived = true; }
  if (arriving && !save) { state.fixed = { patch: true, engine: true, fueltank: true, computer: true, launch: false }; state.won = true; state.arrived = true; }
  profile.visited[look.planet.id] = true; saveProfile();
  const struct = shipBlocks(state.fixed);
  if (!state.arrived) for (const [x, z] of DEBRIS) struct.set(`${x},${world.column(x, z).h + 1},${z}`, B.METAL);
  for (const [k, id] of struct) world.structure.set(k, id);
  if (save && save.edits) world.loadEdits(save.edits);
  player = new Player(world);
  player.phys = physicsFor(look.gravity);
  if (save && save.pos) { Object.assign(player.pos, save.pos); player.yaw = save.yaw; player.pitch = save.pitch; }
  else {
    const sx = -8, sz = 10;
    player.pos = { x: sx + 0.5, y: world.surfaceY(sx, sz) + 1, z: sz + 0.5 };
    player.yaw = Math.atan2(-(SHIP_CENTER.x - player.pos.x), -(SHIP_CENTER.z - player.pos.z));
    player.pitch = -0.06;
  }
  if (shipMesh) { scene.remove(shipMesh); shipMesh = null; }
  launchT = -1;
  renderHotbar(); renderGoal();
}

// ---------------- pebbles: small loose stones lying on open ground (just for looks)
const pebbleGeo = new THREE.IcosahedronGeometry(0.5, 0);
const pebbleMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const PEBBLE_ON = new Set([B.REDDIRT, B.DUST, B.DARKSAND, B.TANROCK, B.PALECLAY, B.BLACKROCK, B.SAND, B.TRACKS, B.FROST, B.ICE, B.SALT, B.STONE]);
const PEBBLE_COLS = { mars: [0x5a4640, 0x7a6e68, 0x3a3236, 0x8a5a40, 0x9a8a80], moon: [0x8a8884, 0x5e5c5a, 0xb0aca4], europa: [0x8e7a6a, 0xb8b0a8, 0x6a5a50], proxima: [0x3a2a2a, 0x5a4440, 0x7a6a60], trappist1e: [0x5a5c56, 0x7a7c74, 0x8f9089], lhs1140b: [0x6a727c, 0x8d9298, 0xa8adb3] };
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(), _pc = new THREE.Color();
function makePebbles(c) {
  const cols = PEBBLE_COLS[look.planet.id] || PEBBLE_COLS.mars, spots = [];
  for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
    const x = c.cx * CS + lx, z = c.cz * CS + lz;
    const r = hash3(x, 3, z, 201); if (r < 0.9) continue;
    if (Math.hypot(x, z) < 9) continue;
    let y = H - 1; while (y > 0 && !BLOCKS[c.data[lx + lz * CS + y * CS * CS]].solid) y--;
    const id = c.data[lx + lz * CS + y * CS * CS];
    if (!PEBBLE_ON.has(id) || (y + 1 < H && c.data[lx + lz * CS + (y + 1) * CS * CS] !== B.AIR)) continue;
    const n = 1 + Math.floor(hash3(x, 4, z, 202) * 3);
    for (let k = 0; k < n; k++) spots.push([lx + 0.15 + hash3(x, k, z, 203) * 0.7, y + 1, lz + 0.15 + hash3(x, k, z, 204) * 0.7, hash3(x, k, z, 205), hash3(x, k, z, 206)]);
  }
  if (!spots.length) return null;
  const m = new THREE.InstancedMesh(pebbleGeo, pebbleMat, spots.length);
  spots.forEach(([px, py, pz, a, b], i) => {
    const sz = 0.12 + a * 0.26;
    _pe.set(a * 3, b * 6, a * b * 2); _pq.setFromEuler(_pe);
    _pm.compose(_pv.set(px, py + sz * 0.25, pz), _pq, _ps.set(sz * (1 + b * 0.5), sz * 0.6, sz));
    m.setMatrixAt(i, _pm); m.setColorAt(i, _pc.set(cols[Math.floor(b * cols.length) % cols.length]));
  });
  m.castShadow = false; m.receiveShadow = true;
  return m;
}

// ---------------- chunks ----------------
function updateChunks(budgetMs) {
  const t0 = performance.now();
  const pcx = Math.floor(player.pos.x / CS), pcz = Math.floor(player.pos.z / CS);
  const todo = [];
  for (let dx = -RENDER_R; dx <= RENDER_R; dx++) for (let dz = -RENDER_R; dz <= RENDER_R; dz++) {
    const d = dx * dx + dz * dz;
    if (d > RENDER_R * RENDER_R + 1) continue;
    const cx = pcx + dx, cz = pcz + dz;
    const c = world.hasChunk(cx, cz) ? world.chunk(cx, cz) : null;
    if (!c || c.dirty || !c.mesh) todo.push([d, cx, cz]);
  }
  todo.sort((a, b) => a[0] - b[0]);
  let done = 0;
  for (const [, cx, cz] of todo) {
    if (done > 0 && performance.now() - t0 > budgetMs) break;
    const c = world.chunk(cx, cz);
    const geo = meshChunk(world, c);
    if (c.mesh) { c.mesh.geometry.dispose(); c.mesh.geometry = geo; }
    else {
      c.mesh = new THREE.Mesh(geo, mat);
      c.mesh.position.set(cx * CS, 0, cz * CS);
      c.mesh.castShadow = c.mesh.receiveShadow = true;
      scene.add(c.mesh);
    }
    if (c.pebbles) { c.mesh.remove(c.pebbles); c.pebbles.dispose(); c.pebbles = null; }
    if (!race.active && (c.pebbles = makePebbles(c))) c.mesh.add(c.pebbles);
    c.dirty = false; done++;
  }
  // drop far chunks
  for (const [k, c] of world.chunks) {
    const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
    if (c.mesh && d > RENDER_R + 2) { scene.remove(c.mesh); c.mesh.geometry.dispose(); if (c.pebbles) { c.pebbles.dispose(); c.pebbles = null; } c.mesh = null; c.dirty = true; }
    if (d > RENDER_R + 5) world.chunks.delete(k);
  }
  return todo.length - done;
}

// ---------------- inventory ----------------
const iconCache = {};
function icon(item) {
  if (!iconCache[item]) {
    const it = ITEMS[item];
    const bt = it.block && BLOCKS[it.block].tiles;
    iconCache[item] = !it.block ? itemIcon(item) : BLOCKS[it.block].see ? flatIcon(typeof bt === 'string' ? bt : bt.side) : blockIcon(bt);
  }
  return iconCache[item];
}
const has = (item) => state.inv[item] || 0;
function toolTier() { let t = 0; for (const k in state.inv) if (ITEMS[k].tool) t = Math.max(t, ITEMS[k].tier); return t; }
function toolName() { const t = toolTier(); return t === 0 ? 'Bare hands' : Object.values(ITEMS).find(i => i.tool && i.tier === t).name; }

let lastToast = null;
function toast(text, item) {
  const now = performance.now();
  if (item && lastToast && lastToast.item === item && now - lastToast.t < 2000 && lastToast.el.isConnected) {
    lastToast.n += 1; lastToast.t = now;
    lastToast.el.textContent = `+${lastToast.n} ${ITEMS[item].name}`;
    lastToast.el.style.animation = 'none'; void lastToast.el.offsetWidth; lastToast.el.style.animation = '';
    return;
  }
  const box = $('toasts');
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 2600);
  lastToast = item ? { item, el, n: 1, t: now } : null;
}

function give(item, n = 1, quiet = false) {
  state.inv[item] = has(item) + n;
  if (!state.order.includes(item)) state.order.push(item);
  if (ITEMS[item].block && !state.hotbar.includes(item)) {
    const i = state.hotbar.indexOf(null);
    if (i >= 0) state.hotbar[i] = item;
  }
  if (!quiet) toast(`+${n} ${ITEMS[item].name}`, n === 1 ? item : null);
  renderHotbar();
}
function take(item, n = 1) {
  state.inv[item] = has(item) - n;
  if (state.inv[item] <= 0) {
    delete state.inv[item];
    const i = state.hotbar.indexOf(item); if (i >= 0) state.hotbar[i] = null;
  }
  renderHotbar();
}

function renderHotbar() {
  const hb = $('hotbar');
  hb.innerHTML = '';
  state.hotbar.forEach((item, i) => {
    const s = document.createElement('div');
    s.className = 'slot' + (i === state.sel ? ' sel' : '');
    s.innerHTML = `<span class="k">${i + 1}</span>` + (item ? `<img src="${icon(item)}" alt="${ITEMS[item].name}"><span class="n">${has(item)}</span>` : '');
    s.onclick = () => { state.sel = i; renderHotbar(); };
    hb.appendChild(s);
  });
  const it = state.hotbar[state.sel];
  $('tool').textContent = `${toolName()}${it ? '  ·  placing ' + ITEMS[it].name : ''}`;
}

// ---------------- goals ----------------
// Same tips, in words that fit a touch screen
function says(t) {
  if (!TOUCH) return t;
  return t.replace(/Press E and make/g, 'Open your Bag and make').replace(/\(E\)/g, '(Bag)')
    .replace(/Walk to the ship and press F/g, 'Walk to the ship and tap Ship').replace(/press F and take off/g, 'tap Ship and take off')
    .replace(/Hold left click to dig by hand/g, 'Hold Dig to dig by hand').replace(/Press F to open the ship/g, 'Tap Ship to open it')
    .replace(/Press E to open your bag/g, 'Tap Bag (top right)').replace(/Open your bag \(E\)/g, 'Tap Bag (top right)')
    .replace(/hold left click on it/g, 'hold Dig').replace(/and press F to fit it/g, 'and tap Ship to fit it').replace(/press F and take off/g, 'tap Ship and take off')
    .replace(/right click or F/g, 'tap Ship').replace(/\(1 to 9\)/g, '(tap a slot at the bottom)').replace(/Walk up to the ship first/g, 'Walk up to the ship first');
}
function nextTip() {
  const f = state.fixed, t = toolTier();
  if (state.won) {
    const n = wavesOn(look.planet.id) + 1, w = adv.wave;
    if (w) return `Clear the wave! ${adv.enemies.filter(e => e.wave).length + w.todo.length} creatures left. Hold left click to hit.`;
    if (state.lost) return 'Your lost bag is marked on the screen. Walk over it to get your things back.';
    if (n > LAST_WAVE) return `You beat every wave here. Fly to a new world from the ship's star map.`;
    if (!profile.gear.weapon) return has('forge') ? 'Place your Forge, then right click it and make a Rock club.' : 'Make a Forge in your bag (E), place it, then use it to make a Rock club.';
    const c = adv.canStart(n);
    if (!c.ok) return `Wave ${n} needs the ${Object.values(ITEMS).find(i => i.weapon === c.need).name}. Make it at your Forge.`;
    return `Start wave ${n} at the Wave beacon next to the ship. Fly to other worlds from the ship's star map.`;
  }
  return says(stepNow().text);
}
// ---- the next step before the ship is fixed: one clear thing to do, and where it is
const RAW = { rock: B.ROCK, stone: B.STONE, iron: B.IRON, ice: B.ICE, crystal: B.CRYSTAL };
const RAW_WORDS = {
  rock: 'grey Rock blocks lying on the ground',
  stone: 'Dark stone (just under the ground, use your pickaxe)',
  iron: 'Iron: dark stone with silver specks, a few blocks down',
  ice: 'Ice: pale blue blocks',
  crystal: 'Purple crystal: it glows, deep down or in craters',
};
// what raw blocks are still missing to make an item (Metal sheets come from Iron)
function missingFor(need) {
  const out = {};
  let sheetsShort = Math.max(0, (need.sheet || 0) - has('sheet'));
  for (const [k, n] of Object.entries(need)) {
    if (k === 'sheet') continue;
    const short = n - has(k); if (short > 0) out[k] = short;
  }
  if (sheetsShort > 0) { const ironShort = sheetsShort - has('iron'); if (ironShort > 0) out.iron = ironShort; }
  return out;
}
function stepNow() {
  const f = state.fixed, t = toolTier();
  const make = (name) => ({ text: `Open your bag (E) and press Make next to ${name}.`, bag: true });
  const dig = (k, n, why) => ({ text: `Dig ${n} more ${RAW_WORDS[k]}. ${why} Follow the arrow at the top.`, block: RAW[k], label: ITEMS[k].name });
  if (t < 1) return has('rock') >= 4 ? make('Rock pickaxe') : { ...dig('rock', 4 - has('rock'), 'You need 4 to make a pickaxe.'), text: `Dig 4 grey Rock blocks lying around (${has('rock')} of 4). Walk up to one and hold left click on it. Follow the arrow at the top.` };
  const ready = PARTS.find(p => !f[p.id] && has(p.id) > 0);
  if (ready) return { text: `Your ${ready.name} is made! Walk to the ship (follow the arrow) and press F to fit it.`, ship: true };
  if (PARTS.every(p => f[p.id])) return { text: 'Everything is fixed! Walk to the ship, press F and take off.', ship: true };
  const jobs = myJobs();
  const part = jobs.find(p => !f[p.id]) || PARTS.find(p => !f[p.id]);
  const r = RECIPES.find(x => x.out === part.id);
  const miss = missingFor(r.need);
  // crystal needs the Iron drill first
  if (miss.crystal || (r.need.crystal && t < 2)) {
    if (t < 2) {
      const dm = missingFor(RECIPES.find(x => x.out === 'drill').need);
      const k = Object.keys(dm)[0];
      if (k) return dig(k, dm[k], `It is for an Iron drill, which digs Purple crystal.`);
      if (has('sheet') < 2) return make('Metal sheet');
      return make('Iron drill');
    }
  }
  const k = ['rock', 'stone', 'iron', 'ice', 'crystal'].find(x => miss[x]);
  if (k) return dig(k, miss[k], `It is for the ${part.name} (part ${PARTS.indexOf(part) + 1} of 4).`);
  if ((r.need.sheet || 0) > has('sheet')) return make('Metal sheet');
  return make(part.name);
}
// find the nearest block of a kind around you (checked once a second)
let wayT = 0, wayTarget = null, wayFor = null;
function findNear(id) {
  const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
  let best = null, bd = 1e9;
  for (let r = 0; r <= 28 && !best; r += 4) {
    for (let x = px - r - 4; x <= px + r + 4; x++) for (let z = pz - r - 4; z <= pz + r + 4; z++) {
      if (Math.max(Math.abs(x - px), Math.abs(z - pz)) < r - 0) continue;
      for (let y = Math.max(1, py - 22); y <= py + 8; y++) {
        if (world.get(x, y, z) !== id) continue;
        const open = world.get(x, y + 1, z) === B.AIR;
        if (id === B.ROCK && !open) continue;                       // loose rocks: the ones you can see
        const d = Math.hypot(x - px, z - pz) + Math.abs(y - py) * 1.5 + (open ? 0 : 5);
        if (d < bd) { bd = d; best = { x: x + 0.5, y, z: z + 0.5 }; }
      }
    }
  }
  return best;
}
const wayMark = (() => {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 14, 0.18), new THREE.MeshBasicMaterial({ color: 0xffe070, transparent: true, opacity: 0.35, depthWrite: false }));
  beam.position.y = 7.5; g.add(beam);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#ffd040'; x.strokeStyle = '#1a0905'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(12, 14); x.lineTo(52, 14); x.lineTo(32, 52); x.closePath(); x.stroke(); x.fill();
  const arrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  arrow.scale.set(1.1, 1.1, 1); g.add(arrow); g.userData.arrow = arrow;
  g.visible = false; scene.add(g); return g;
})();
function updateWay(dt) {
  const box = $('compass');
  if (!playing || state.won || inCamp) { wayMark.visible = false; return false; }
  const st = stepNow();
  wayT -= dt;
  const key = st.block || (st.ship ? 'ship' : 'bag');
  if (wayT <= 0 || key !== wayFor || (st.block && wayTarget && world.get(Math.floor(wayTarget.x), wayTarget.y, Math.floor(wayTarget.z)) !== st.block)) {
    wayT = 1; wayFor = key;
    wayTarget = st.block ? findNear(st.block) : st.ship ? { x: SHIP_CENTER.x, y: SHIP_BASE, z: SHIP_CENTER.z } : null;
  }
  $('hint').classList.toggle('big', !!st.bag);
  if (st.bag) { if (!panelOpen()) $('hint').textContent = says('Press E to open your bag'); }
  if (!wayTarget) { wayMark.visible = false; box.classList.add('hide'); return true; }
  const d = new THREE.Vector3(wayTarget.x - player.pos.x, 0, wayTarget.z - player.pos.z);
  const dist = d.length();
  box.classList.remove('hide');
  box.querySelector('span').textContent = st.ship ? 'Ship' : st.label;
  let rel = Math.atan2(-d.x, -d.z) - player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  box.querySelector('.arrow').style.transform = `rotate(${-rel}rad)`;
  const dy = wayTarget.y - Math.floor(player.pos.y);
  $('shipDist').textContent = `${Math.round(dist)} m${dy < -1 ? `, ${-dy} down` : dy > 2 ? `, ${dy} up` : ''}`;
  wayMark.visible = !st.ship && dist > 1.2;
  wayMark.userData.arrow.visible = dist > 3;
  wayMark.position.set(wayTarget.x, wayTarget.y + 1, wayTarget.z);
  wayMark.userData.arrow.position.y = 0.9 + Math.abs(Math.sin(clock.elapsedTime * 3)) * 0.5;
  return true;
}
function renderGoal() {
  if (inCamp) {
    const n = friends ? friends.others.size : 0;
    $('goal').innerHTML = `<h3>Friends' camp</h3><ul><li>${n ? `${n} friend${n > 1 ? 's' : ''} here with you` : 'Nobody else here right now'}</li><li>Build together: everything is shared</li></ul><div class="tip">${says('T to say something. Look at a friend and right click to give a gift. K to build.')}</div>`;
    return;
  }
  const f = state.fixed;
  const items = PARTS.map(p => {
    const ok = f[p.id];
    const made = !ok && has(p.id) > 0;
    return `<li class="${ok ? 'done' : ''}">${ok ? '✔' : made ? '◆' : '○'} ${p.name}${made ? ' (ready to fit)' : ''}</li>`;
  }).join('');
  if (state.won) {
    const id = look.planet.id, done = wavesOn(id), st = stageOf(Math.min(LAST_WAVE, done + 1));
    $('goal').innerHTML = `<h3>${look.planet.name}: wave ${done} of ${LAST_WAVE}</h3><ul><li>Stage: ${st.name} (waves ${st.from} to ${st.to})</li><li>Weapon: ${adv.weapon().name}</li></ul><div class="tip">${says(nextTip())}</div>`;
    return;
  }
  $('goal').innerHTML = `<h3>Fix your ship${team ? ` · team ${team.code}` : ''}</h3><ul>${items}</ul>${team ? `<div class="tip">Team of ${teamSize()}. Your jobs: <b>${myJobs().map(p => p.name).join(', ')}</b></div>` : ''}<div class="tip next"><b>Next:</b> ${says(nextTip())}</div>`;
}

// ---------------- bag and crafting ----------------
function canMake(r) { return Object.entries(r.need).every(([k, n]) => has(k) >= n); }
function make(r) {
  if (!canMake(r)) { sfx.deny(); return; }
  G.track('make');
  for (const [k, n] of Object.entries(r.need)) take(k, n);
  if (r.out === 'scanner') profile.scanner = Math.max(1, profile.scanner);
  else if (r.out === 'rover') { profile.rover = true; saveProfile(); document.body.classList.add('hasrover'); }
  else give(r.out, r.n, true);
  toast(`Made ${r.n > 1 ? r.n + ' × ' : ''}${ITEMS[r.out].name}${r.out === 'scanner' ? says('. Press Q to scan.') : r.out === 'rover' ? says('. Press V to drive it.') : ''}`);
  sfx.craft(); renderBag(); renderGoal(); writeSave();
}
function renderBag() {
  const wp = profile.gear.weapon ? ITEMS[profile.gear.weapon].name : 'none yet';
  const sh = profile.gear.shield ? ITEMS[profile.gear.shield].name : 'none';
  $('bagTool').textContent = `Tool: ${toolName()} · Weapon: ${wp} · Shield or armour: ${sh} · Coins: ${profile.coins}`;
  const inv = $('inv');
  const owned = state.order.filter(k => has(k) > 0);
  inv.innerHTML = owned.length ? '' : '<p class="sub">Empty. Dig something!</p>';
  for (const k of owned) {
    const s = document.createElement('div'); s.className = 'slot'; s.title = ITEMS[k].name;
    s.innerHTML = `<img src="${icon(k)}" alt=""><span class="n">${has(k)}</span>`;
    inv.appendChild(s);
  }
  const list = $('recipes'); list.innerHTML = '';
  if (state.won) {
    const bb = document.createElement('button'); bb.className = 'buildbtn'; bb.textContent = 'Build: colourful blocks, castles and houses (K)';
    bb.onclick = () => { closePanels(); openPanel('buildPanel'); }; list.appendChild(bb);
    list.appendChild(renderRigSlots());
  }
  for (const r of RECIPES) {
    if (ITEMS[r.out].tool && toolTier() >= ITEMS[r.out].tier) continue;      // already have it
    if (ITEMS[r.out].part && (state.fixed[r.out] || has(r.out))) continue;    // done
    if (r.after === 'won' && !state.won) continue;
    if (r.out === 'scanner' && profile.scanner) continue;
    if (r.out === 'rover' && profile.rover) continue;
    if (!state.won && ['forge', 'box', 'bed', 'airmaker'].includes(r.out) && !canMake(r)) continue;
    const row = document.createElement('div');
    row.className = 'recipe' + (ITEMS[r.out].part ? ' part' : '');
    const needs = Object.entries(r.need).map(([k, n]) => `<span class="${has(k) >= n ? 'have' : 'miss'}">${ITEMS[k].name} ${Math.min(has(k), n)}/${n}</span>`).join(' · ');
    row.innerHTML = `<img src="${icon(r.out)}" alt=""><div><div class="nm">${ITEMS[r.out].name}${r.n > 1 ? ' × ' + r.n : ''}</div><div class="needs">${needs}</div><div class="note">${r.note}</div></div>`;
    const b = document.createElement('button'); b.textContent = 'Make'; b.disabled = !canMake(r);
    b.onclick = () => make(r);
    row.appendChild(b); list.appendChild(row);
  }
}

// ---------------- ship ----------------
function nearShip() { return camera.position.distanceTo(SHIP_CENTER) < 9; }
function renderShip() {
  const box = $('parts'); box.innerHTML = '';
  for (const p of PARTS) {
    const ok = state.fixed[p.id];
    const el = document.createElement('div'); el.className = 'shippart' + (ok ? ' fixed' : '');
    el.innerHTML = `<img src="${icon(p.id)}" alt=""><div><div>${p.name}</div><div class="st">${ok ? 'Fixed' : has(p.id) ? 'Ready to fit' : p.hint}</div></div>`;
    if (!ok) {
      const b = document.createElement('button'); b.textContent = has(p.id) ? 'Fit it' : 'Not made yet'; b.disabled = !has(p.id);
      b.onclick = () => install(p.id);
      el.children[1].appendChild(b);
    }
    box.appendChild(el);
  }
  const allFixed = PARTS.every(p => state.fixed[p.id]);
  $('launchBtn').classList.toggle('hide', !allFixed);
  $('launchBtn').textContent = state.won ? 'Open the star map' : 'Take off';
  $('shipSub').textContent = state.won ? 'Your ship is ready to fly. Pick a world on the star map.' : 'Make each part in your bag (E), then fit it here.';
}
function install(id) {
  if (!has(id)) return;
  take(id, 1);
  state.fixed[id] = true;
  world.setStructure(shipBlocks(state.fixed));
  sfx.install();
  toast(`${ITEMS[id].name} fitted!`);
  if (team) friends.setInfo('ship', { [id]: true });
  renderShip(); renderGoal(); writeSave();
}

function launch() {
  closePanels(false);
  state.fixed.launch = true;
  const blocks = shipBlocks(state.fixed);
  for (const [k, id] of blocks) if (id === B.BEACON) blocks.delete(k);
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const k of blocks.keys()) { const v = k.split(',').map(Number); for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], v[a]); mx[a] = Math.max(mx[a], v[a]); } }
  const get = (x, y, z) => blocks.get(`${x + mn[0]},${y + mn[1]},${z + mn[2]}`) || 0;
  const geo = meshVolume(get, mx[0] - mn[0] + 1, mx[1] - mn[1] + 1, mx[2] - mn[2] + 1, false);
  shipMesh = new THREE.Mesh(geo, mat);
  shipMesh.position.set(mn[0], mn[1], mn[2]);
  shipMesh.castShadow = true;
  shipMesh.userData.base = mn[1];
  scene.add(shipMesh);
  const gone = new Map(); for (const k of blocks.keys()) gone.set(k, B.AIR);
  world.setStructure(gone);
  launchT = 0;
  sfx.launch();
  if (document.pointerLockElement) document.exitPointerLock();
}
function landAgain() {
  $('win').classList.add('hide');
  launchT = -1; travelTo = null;
  if (shipMesh) { scene.remove(shipMesh); shipMesh.geometry.dispose(); shipMesh = null; }
  state.fixed.launch = false;
  world.setStructure(shipBlocks(state.fixed));
  renderGoal(); writeSave();
  resume();
}

// ---------------- the adventure: waves, finds, trader, star map ----------------
const nightCover = new THREE.Mesh(new THREE.SphereGeometry(850, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false }));
nightCover.renderOrder = -9; scene.add(nightCover);
let shakeAmt = 0;
const G = {
  THREE, scene, camera, sfx, Cloud, bits, flames, smoke, sun, hemi, amb, nightCover,
  get world() { return world; }, get player() { return player; }, get state() { return state; }, get look() { return look; }, get sky() { return sky; },
  shipCenter: SHIP_CENTER, give, take, has, toast: (t) => toast(says(t)), renderHotbar, writeSave,
  nearShip: () => nearShip(), covered: () => covered(), active: () => playing && !panelOpen() && launchT < 0,
  openPanel: (id) => openPanel(id), closePanels: () => closePanels(), shake: (a) => { shakeAmt = Math.max(shakeAmt, a); },
  swingArm: () => { swingT = 0.3; },
  godMode: params.has('god'), easy: params.has('easy'),
  banner, showFall, waveReward,
  calm: () => profile.free || inCamp,
  track: (ev, n) => { if (quests) quests.track(ev, n); if (hooks) hooks.addXP(ev, n); },
  home: () => ({ at: !!state.flag && atHome(state, player.pos), lv: homeLv, flag: state.flag, inside: (x, z) => !!state.flag && Math.abs(x - state.flag.x - 0.5) <= HOME_R + 0.5 && Math.abs(z - state.flag.z - 0.5) <= HOME_R + 0.5 }),
};
let homeLv = 0;
let swingT = 0;
const adv = createAdventure(G);

function banner(title, sub) {
  const b = $('banner');
  b.innerHTML = `<div class="bt">${title}</div><div class="bs">${sub || ''}</div>`;
  b.classList.remove('hide'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.add('hide'), 3600);
}
function showFall(msg, lost) {
  $('fallMsg').textContent = msg;
  $('fallSub').textContent = lost ? 'Your bag is where you fell. Go back and walk over it to get your things.' : 'You woke up safe.';
  openPanel('fallPanel');
}
function waveReward(r) {
  const top = r.n === LAST_WAVE ? `${DRAGONS[r.world].name} beaten!` : `Wave ${r.n} cleared!`;
  $('rewTitle').textContent = top;
  const left = LAST_WAVE - wavesOn(r.world);
  $('rewBody').innerHTML = `<p class="big">+${r.coins} coins</p><p>${r.got ? 'Chest: ' + r.got : ''}</p>${r.lines.map(l => `<p class="good">${l}</p>`).join('')}
    <p class="sub">${look.planet.name}: wave ${wavesOn(r.world)} of ${LAST_WAVE}${left > 0 ? ` · ${left} to go` : ' · every wave cleared!'}</p>`;
  $('rewNext').classList.toggle('hide', wavesOn(r.world) >= LAST_WAVE || !adv.canStart(wavesOn(r.world) + 1).ok);
  openPanel('rewardPanel');
}
$('rewNext').onclick = () => adv.startWave();
$('rewClose').onclick = () => closePanels();
$('fallOk').onclick = () => closePanels();

// ---- Wave beacon
function weaponName(lvl) { return Object.values(ITEMS).find(i => i.weapon === lvl)?.name; }
function renderBeacon() {
  const id = look.planet.id, done = wavesOn(id), n = Math.min(LAST_WAVE, done + 1);
  const st = stageOf(n), c = adv.canStart(n);
  $('beaconTitle').textContent = `${look.planet.name}: wave ${done} of ${LAST_WAVE}`;
  const stages = STAGES.map((s, k) => {
    const cleared = done >= s.to, now = !cleared && n >= s.from;
    return `<div class="stage ${cleared ? 'done' : now ? 'now' : ''}"><b>${k + 1}. ${s.name}</b><span>Waves ${s.from} to ${s.to} · needs a level ${k + 1} weapon (${weaponName(k + 1)})</span><span class="rw">${cleared ? '✔ ' : 'Reward: '}${s.reward}</span></div>`;
  }).join('');
  const bar = `<div class="wbar"><i style="width:${done / LAST_WAVE * 100}%"></i></div>`;
  let next;
  if (done >= LAST_WAVE) next = `<p class="good">You cleared all ${LAST_WAVE} waves and beat the ${DRAGONS[id].name}. You can fight it again for another Dragon scale.</p><button id="waveGo">Fight the ${DRAGONS[id].name} again</button>`;
  else if (adv.wave) next = `<p>A wave is on right now!</p>`;
  else if (!c.ok) next = `<p class="warn">Wave ${n} needs a level ${c.need} weapon: the ${weaponName(c.need)}. Make one at a Forge (place a Forge block, then use it).</p>`;
  else next = `<p>Next: <b>${n === LAST_WAVE ? `the ${DRAGONS[id].name}` : `wave ${n}`}</b>${BIG[n] ? ` · a big ${ENEMIES[BIG[n]].name.toLowerCase()} is coming` : ''}${profile.wish ? ' · Star moth wish: double rewards!' : ''}</p><button id="waveGo">${n === LAST_WAVE ? 'Call the dragon' : `Start wave ${n}`}</button>`;
  $('beaconBody').innerHTML = bar + next + `<p class="sub">Weapon: ${adv.weapon().name} · Shield or armour: ${profile.gear.shield ? ITEMS[profile.gear.shield].name : 'none'} · Health ${Math.ceil(state.hp)}/${MAX_HP}</p><div class="stages">${stages}</div>`;
  const go = $('waveGo'); if (go) go.onclick = () => adv.startWave(done >= LAST_WAVE);
}

// ---- Forge
function renderForge() {
  const list = $('forgeList'); list.innerHTML = '';
  for (const r of FORGE_RECIPES) {
    const it = ITEMS[r.out], owned = profile.owned[r.out];
    const row = document.createElement('div'); row.className = 'recipe' + (r.legend ? ' legend' : '');
    const needs = Object.entries(r.need).map(([k, n]) => `<span class="${has(k) >= n ? 'have' : 'miss'}">${ITEMS[k].name} ${Math.min(has(k), n)}/${n}</span>`).join(' · ');
    row.innerHTML = `<img src="${icon(r.out)}" alt=""><div><div class="nm">${it.name}${it.dmg ? ` <small>hits ${it.dmg}</small>` : ''}</div><div class="needs">${needs}</div><div class="note">${r.note}</div></div>`;
    const b = document.createElement('button');
    b.textContent = owned ? 'Owned' : 'Make'; b.disabled = owned || !canMake(r);
    b.onclick = () => {
      if (!canMake(r)) return;
      for (const [k, n] of Object.entries(r.need)) take(k, n);
      profile.owned[r.out] = true;
      if (r.legend && /^Legendary/.test(r.note)) G.track('legend');
      const slot = it.weapon ? 'weapon' : 'shield', lvl = it.weapon || it.shield;
      const cur = profile.gear[slot];
      if (!cur || (ITEMS[cur].weapon || ITEMS[cur].shield) < lvl) profile.gear[slot] = r.out;
      saveProfile(); sfx.craft(); toast(`Made a ${it.name}!`); renderForge(); writeSave();
    };
    row.appendChild(b); list.appendChild(row);
  }
}

// ---- Storage box
let openBox = null;
function renderBox() {
  const key = openBox, box = state.boxes[key] || (state.boxes[key] = {});
  const grid = (el, src, onclick) => {
    el.innerHTML = '';
    const ks = Object.keys(src).filter(k => src[k] > 0);
    if (!ks.length) el.innerHTML = '<p class="sub">Empty</p>';
    for (const k of ks) {
      const s2 = document.createElement('div'); s2.className = 'slot'; s2.title = ITEMS[k].name; s2.style.cursor = 'pointer';
      s2.innerHTML = `<img src="${icon(k)}" alt=""><span class="n">${src[k]}</span>`;
      s2.onclick = () => onclick(k); el.appendChild(s2);
    }
  };
  const bag = {}; for (const k of state.order) if (has(k) && !ITEMS[k].tool) bag[k] = has(k);
  grid($('boxBag'), bag, (k) => { const n = has(k); take(k, n); box[k] = (box[k] || 0) + n; sfx.place(); renderBox(); writeSave(); });
  grid($('boxIn'), box, (k) => { const n = box[k]; delete box[k]; give(k, n, true); sfx.pickup(); renderBox(); writeSave(); });
}

// ---- Trader
const SELL = { gold: 12, salt: 8, glass: 10, gem: 30, crystal: 4, iron: 1, ice: 1 };
const HOME = { salt: 'europa', glass: 'moon', gold: 'proxima' };
const BUY = [['fuelcell', 1, 25], ['gold', 1, 30], ['gem', 1, 70], ['iron', 4, 15], ['crystal', 2, 20], ['ice', 6, 10]];
const sellPrice = (k) => Math.max(1, Math.round(SELL[k] * (HOME[k] ? (HOME[k] === look.planet.id ? 0.7 : 1.4) : 1) * (homeLv >= 3 ? 1.2 : 1)));
function renderShop() {
  $('shopCoins').textContent = `You have ${profile.coins} coins.`;
  const sell = $('shopSell'); sell.innerHTML = '';
  for (const k of Object.keys(SELL)) {
    if (!has(k)) continue;
    const row = document.createElement('div'); row.className = 'recipe';
    row.innerHTML = `<img src="${icon(k)}" alt=""><div><div class="nm">${ITEMS[k].name} × ${has(k)}</div><div class="needs">${sellPrice(k)} coins each${HOME[k] ? (HOME[k] === look.planet.id ? ' (common here)' : ' (rare here: good price)') : ''}</div></div>`;
    const bw = document.createElement('div'); bw.className = 'btns2';
    const b = document.createElement('button'); b.textContent = 'Sell 1';
    b.onclick = () => { G.track('sell'); take(k, 1); profile.coins += sellPrice(k); sfx.coin(); saveProfile(); renderShop(); };
    bw.appendChild(b);
    if (has(k) > 1) { const b2 = document.createElement('button'); b2.textContent = 'Sell all'; b2.onclick = () => { const n = has(k); G.track('sell', n); take(k, n); profile.coins += sellPrice(k) * n; sfx.coin(); saveProfile(); renderShop(); }; bw.appendChild(b2); }
    row.appendChild(bw);
    sell.appendChild(row);
  }
  if (!sell.children.length) sell.innerHTML = '<p class="sub">Nothing to sell. The Trader wants Gold, Salt, Orange glass, Gems and Purple crystal.</p>';
  const buy = $('shopBuy'); buy.innerHTML = '';
  for (const [k, n, price] of BUY) {
    const row = document.createElement('div'); row.className = 'recipe';
    row.innerHTML = `<img src="${icon(k)}" alt=""><div><div class="nm">${ITEMS[k].name}${n > 1 ? ' × ' + n : ''}</div><div class="needs">${price} coins</div></div>`;
    const b = document.createElement('button'); b.textContent = 'Buy'; b.disabled = profile.coins < price;
    b.onclick = () => { if (profile.coins < price) return; profile.coins -= price; give(k, n, true); sfx.coin(); saveProfile(); renderShop(); writeSave(); };
    row.appendChild(b); buy.appendChild(row);
  }
}

// ---- Star map
let mapFromWin = false;
function renderMap() {
  const here = look.planet.id;
  const cv = $('mapCanvas'), x = cv.getContext('2d');
  const Wd = cv.width = 360, Ht = cv.height = 360, cx = Wd / 2, cy = Ht / 2;
  x.fillStyle = '#05030a'; x.fillRect(0, 0, Wd, Ht);
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + ((i * 37) % 10) / 20})`; x.fillRect((i * 97) % Wd, (i * 61 + i * i) % Ht, 1, 1); }
  x.strokeStyle = 'rgba(255,215,176,0.15)';
  for (const ly of [5, 50]) { const r = 30 + Math.log10(1 + ly) * 70; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); x.fillStyle = 'rgba(255,215,176,0.35)'; x.font = '10px monospace'; x.fillText(`${ly} light years`, cx + 4, cy - r - 3); }
  x.font = '12px monospace';
  for (const [k, st] of Object.entries(STARS)) {
    const a = st.ra / 24 * Math.PI * 2 - Math.PI / 2, r = st.ly ? 30 + Math.log10(1 + st.ly) * 70 : 0;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    const hereStar = st.worlds.includes(here);
    x.fillStyle = k === 'sun' ? '#ffe08a' : '#ff8a5a';
    x.beginPath(); x.arc(px, py, k === 'sun' ? 6 : 4, 0, Math.PI * 2); x.fill();
    if (hereStar) { x.strokeStyle = '#7be39a'; x.beginPath(); x.arc(px, py, 10, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = '#ffd7b0'; x.fillText(st.name, px + 9, py + 4);
  }
  const list = $('mapList'); list.innerHTML = '';
  for (const id of WORLD_ORDER) {
    const p = planetById(id), c = canFly(here, id, has);
    const st = STARS[starOf(id)];
    const row = document.createElement('div'); row.className = 'recipe' + (id === here ? ' part' : '');
    const dist = st.ly ? `${st.ly} light years away, at ${st.name}` : 'In our Solar System';
    row.innerHTML = `<div class="dot" style="background:#${worldParams(id).sky.sun.toString(16).padStart(6, '0')}"></div><div><div class="nm">${p.name}${profile.visited[id] ? ' <small class="good">visited</small>' : ''}</div><div class="needs">${dist} · waves ${wavesOn(id)}/${LAST_WAVE}</div><div class="note">${id === here ? 'You are here.' : c.ok ? 'Costs ' + c.why : c.why}</div></div>`;
    const b = document.createElement('button'); b.textContent = id === here ? (mapFromWin ? 'Land here' : 'Here') : 'Fly';
    b.disabled = id === here ? !mapFromWin : !c.ok;
    b.onclick = () => { if (id === here) { landAgain(); return; } flyTo(id); };
    row.appendChild(b); list.appendChild(row);
  }
  $('mapShip').textContent = `${ENGINE_NAMES[profile.ship.engine]} · fuel tank holds ${TANK_SIZE[profile.ship.tank]} · you have ${has('fuelcell')} fuel cell${has('fuelcell') === 1 ? '' : 's'} (make them in your bag: 4 ice + 1 purple crystal)`;
  const up = $('mapUp'); up.innerHTML = '';
  for (const u of UPGRADES) {
    if (profile.ship[u.id] >= u.level) continue;
    if (profile.ship[u.id] < u.level - 1) continue;
    const row = document.createElement('div'); row.className = 'recipe';
    const needs = Object.entries(u.need).map(([k, n]) => `<span class="${has(k) >= n ? 'have' : 'miss'}">${ITEMS[k].name} ${Math.min(has(k), n)}/${n}</span>`).join(' · ');
    row.innerHTML = `<img src="${icon(u.id === 'tank' ? 'fueltank' : 'engine')}" alt=""><div><div class="nm">${u.name}</div><div class="needs">${needs}</div><div class="note">${u.note}</div></div>`;
    const b = document.createElement('button'); b.textContent = 'Fit it'; b.disabled = !canMake(u);
    b.onclick = () => { if (!canMake(u)) return; for (const [k, n] of Object.entries(u.need)) take(k, n); profile.ship[u.id] = u.level; saveProfile(); sfx.install(); toast(`${u.name} fitted!`); renderMap(); writeSave(); };
    row.appendChild(b); up.appendChild(row);
  }
  if (!up.children.length) up.innerHTML = '<p class="sub">Your ship has every upgrade.</p>';
}
let travelTo = null;
function flyTo(dest) {
  const f = fuelFor(look.planet.id, dest);
  take('fuelcell', f);
  if (launchT < 0 && !shipMesh) { travelTo = dest; launch(); }
  else travel(dest);
}
function travel(dest) {
  const carry = { inv: state.inv, order: state.order, hotbar: state.hotbar, sel: state.sel };
  state.inv = {}; state.order = []; state.hotbar = Array(9).fill(null);
  if (shipMesh) { scene.remove(shipMesh); shipMesh.geometry.dispose(); shipMesh = null; }
  state.fixed.launch = false; launchT = -1; travelTo = null;
  world.setStructure(shipBlocks(state.fixed));
  writeSave();
  const p = planetById(dest), st = STARS[starOf(dest)];
  $('travelText').innerHTML = `Flying to <b>${p.name}</b><br><span class="sub">${st.ly ? st.ly + ' light years' : 'across the Solar System'}</span>`;
  openPanel('travel');
  setTimeout(() => {
    applyLook(dest);
    const save = loadSave();
    setupWorld(save, !save);
    for (const k of carry.order) if (carry.inv[k]) { state.inv[k] = (state.inv[k] || 0) + carry.inv[k]; if (!state.order.includes(k)) state.order.push(k); }
    carry.hotbar.forEach((k, i) => { if (k && !state.hotbar.includes(k)) { const j = state.hotbar[i] ? state.hotbar.indexOf(null) : i; if (j >= 0) state.hotbar[j] = k; } });
    Object.assign(player.pos, { x: -6.5, y: world.surfaceY(-7, 6) + 1, z: 6.5 });
    player.yaw = Math.atan2(-(SHIP_CENTER.x - player.pos.x), -(SHIP_CENTER.z - player.pos.z)); player.pitch = -0.1;
    renderHotbar(); renderGoal(); writeSave();
    updateChunks(200);
    closePanels();
    banner(`Welcome to ${p.name}`, p.blurb); playMusic(p.id);
    sfx.install();
  }, 2200);
}
$('mapClose').onclick = () => { if (mapFromWin) { landAgain(); } else closePanels(); };


// ---- Mining rigs
let openRig = null;
function renderRig() {
  const [x, y, z] = openRig, r = rigAt(look.planet.id, x, y, z);
  if (!r) { $('rigBody').innerHTML = '<p class="sub">This rig is not set up. Pick it up and place it again.</p>'; return; }
  accrue(r); saveProfile();
  const held = Object.values(r.store).reduce((a, b) => a + b, 0);
  const next = Math.ceil(nextFindIn(r) / 1000), boost = boostLeft();
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const items = Object.entries(r.store).filter(([, n]) => n > 0);
  const lucky = Math.max(0, FIRST_LUCKY - (r.count || 0));
  const slot = (k, n, extra = '') => `<div class="slot ${ITEMS[k].tier || ''} ${extra}" title="${ITEMS[k].name}"><img src="${icon(k)}" alt="">${n != null ? `<span class="n">${n}</span>` : ''}</div>`;
  $('rigBody').innerHTML = `<p>Digs: ${Object.keys(r.ores).map(k => ITEMS[k].name).join(', ')}, and now and then a Gem.</p>
    <div class="treasure"><b>Rig treasures</b> <span class="sub">Only rigs find these. Not by mining, not in chests, not at the Trader.</span>
      <div class="inv">${RIG_TREASURE.map(([k]) => `<div class="tcell">${slot(k, null, profile.book.rigs && profile.book.rigs[k] ? '' : 'unseen')}<small>${profile.book.rigs && profile.book.rigs[k] ? ITEMS[k].name : '?'}<br><i>${ITEMS[k].tier === 'legend' ? 'Legendary' : 'Super rare'}</i></small></div>`).join('')}</div>
      ${lucky ? `<p class="lucky">New rig luck: the next ${lucky} finds are 5 times as likely to be treasure!</p>` : ''}</div>
    <p class="sub">One find every ${boost ? `<b class="boost">${Math.round(RIG_MINUTES * 60 * 0.2)} seconds</b> (boosted by an ad)` : `${RIG_MINUTES} minutes`}, even when you are away. Holds up to ${RIG_CAP}. ${held >= RIG_CAP ? '<span class="warn">Full! Empty it to keep digging.</span>' : `Next find in ${mmss(next)}.`}</p>
    <div class="inv">${items.length ? items.map(([k, n]) => slot(k, n)).join('') : '<p class="sub" style="grid-column:1/-1">Nothing yet.</p>'}</div>`;
  $('rigTake').disabled = !items.length;
  $('rigTake').onclick = () => {
    const tre = items.filter(([k]) => ITEMS[k].tier);
    G.track('rig'); if (tre.some(([k]) => ITEMS[k].tier === 'legend')) G.track('treasure');
    for (const [k, n] of items) give(k, n, true);
    for (const [k] of tre) note('rigs', k);
    r.store = {}; markSeen(); sfx.pickup();
    if (tre.length) { sfx.cleared(); banner('Rig treasure!', tre.map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', ') + '. Take them to the Forge.'); }
    else toast('You emptied the rig.');
    renderRig(); writeSave();
  };
  const ad = $('rigAd'), left = adsLeft();
  ad.disabled = !left;
  ad.innerHTML = boost ? `Boost on for ${mmss(Math.ceil(boost / 1000))}. Watch another ad to add ${AD_HOURS} hour (${left} left today)` : `Watch an ad: 80% less waiting for ${AD_HOURS} hour (${left} left today)`;
  ad.onclick = () => showAd();
}
// Stand-in ad: a short countdown. When the game is hosted this calls a real ad network.
let adTimer = null;
function showAd() {
  if (!adsLeft()) return;
  const el = $('adPanel'); el.classList.remove('hide');
  let n = params.has('fastad') ? 1 : 15;
  const tick = () => {
    $('adCount').textContent = n;
    if (n-- <= 0) {
      clearInterval(adTimer); el.classList.add('hide');
      if (adBoost()) { sfx.coin(); banner('Rigs boosted!', `All your rigs dig 5 times as fast for the next ${AD_HOURS} hour.`); }
      renderRig();
    }
  };
  clearInterval(adTimer); tick(); adTimer = setInterval(tick, 1000);
}
$('adSkip').onclick = () => { clearInterval(adTimer); $('adPanel').classList.add('hide'); };
function rigSummary(got) { return Object.entries(got).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', '); }
function renderRigSlots() {
  const used = rigCount(), slots = rigSlots();
  const el = document.createElement('div'); el.className = 'recipe part';
  el.innerHTML = `<img src="${icon('rig')}" alt=""><div><div class="nm">Mining rigs: ${used} of ${slots} slots used</div><div class="note">The first ${FREE_RIGS} are free. Each extra slot costs ${RIG_SLOT_COINS} coins. You have ${profile.coins}.</div></div>`;
  const b = document.createElement('button'); b.textContent = `Unlock a slot`; b.disabled = profile.coins < RIG_SLOT_COINS;
  b.onclick = () => { if (profile.coins < RIG_SLOT_COINS) return; profile.coins -= RIG_SLOT_COINS; profile.rigSlots = (profile.rigSlots || 0) + 1; saveProfile(); sfx.coin(); toast('New rig slot unlocked!'); renderBag(); };
  el.appendChild(b);
  return el;
}
setInterval(() => { if (playing) { accrueAll(); } }, 30000);

// ---- Build panel: colourful blocks and whole-building plans
let buildTab = 'blocks', buildPick = {}, planPick = {}, lastBuild = null;
function recipeRow(r, label) {
  const row = document.createElement('div'); row.className = 'recipe';
  const needs = Object.entries(r.need).map(([k, n]) => `<span class="${has(k) >= n ? 'have' : 'miss'}">${ITEMS[k].name} ${Math.min(has(k), n)}/${n}</span>`).join(' · ');
  row.innerHTML = `<img src="${icon(r.out)}" alt=""><div><div class="nm">${label || ITEMS[r.out].name} × ${r.n}</div><div class="needs">${needs}</div><div class="note">${r.note}${has(r.out) ? ` You have ${has(r.out)}.` : ''}</div></div>`;
  const b = document.createElement('button'); b.textContent = 'Make'; b.disabled = !canMake(r);
  b.onclick = () => { make(r); renderBuild(); };
  row.appendChild(b);
  return row;
}
function chips(colours, cur, onpick) {
  const d = document.createElement('div'); d.className = 'chips';
  for (const c of colours) {
    const b = document.createElement('button'); b.className = 'chip' + (c === cur ? ' on' : ''); b.title = COLOUR[c].name;
    b.style.background = COLOUR[c].hex; b.onclick = () => onpick(c); d.appendChild(b);
  }
  return d;
}
// where a plan goes: in front of you, facing the way you look
function planCells(plan, colour) {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const f = Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
  const r = [-f[1], f[0]];
  const px = Math.floor(player.pos.x), pz = Math.floor(player.pos.z);
  const sx = px + f[0] * 3, sz = pz + f[1] * 3;
  const gy = world.surfaceY(sx, sz) + 1;
  const half = Math.floor(plan.w / 2);
  return planBlocks(plan, colour).map(([x, y, z, it]) => [sx + r[0] * (x - half) + f[0] * z, gy + y, sz + r[1] * (x - half) + f[1] * z, it]);
}
function planNeed(cells) {
  const need = {};
  for (const [x, y, z, it] of cells) if (y < H && world.get(x, y, z) === B.AIR) need[it] = (need[it] || 0) + 1;
  return need;
}
// make whatever blocks are missing from what you carry, if you can. Returns the crafts or null.
function planCrafts(need) {
  const inv = { ...state.inv }, crafts = [];
  const want = (it, n, depth) => {
    const short = n - (inv[it] || 0);
    if (short <= 0) { inv[it] -= n; return true; }
    const r = depth < 3 && recipeFor(it);
    if (!r) return false;
    const times = Math.ceil(short / r.n);
    for (const [k, m] of Object.entries(r.need)) if (!want(k, m * times, depth + 1)) return false;
    inv[it] = (inv[it] || 0) + times * r.n - n;
    crafts.push([r, times]);
    return true;
  };
  for (const [it, n] of Object.entries(need)) if (!want(it, n, 0)) return null;
  return crafts;
}
function buildPlan(plan, colour, craft) {
  const cells = planCells(plan, colour), need = planNeed(cells);
  if (craft) {
    const crafts = planCrafts(need);
    if (!crafts) { sfx.deny(); toast('Not enough to make the missing blocks.'); return; }
    for (const [r, times] of crafts) for (let i = 0; i < times; i++) { for (const [k, n] of Object.entries(r.need)) take(k, n); give(r.out, r.n, true); }
  }
  if (!Object.entries(need).every(([k, n]) => has(k) >= n)) { sfx.deny(); toast('You do not have all the blocks yet.'); return; }
  const placed = [];
  const p = player.pos, baseY = Math.min(...cells.map(c => c[1]));
  for (const [x, y, z, it] of cells) {
    if (y >= H || world.get(x, y, z) !== B.AIR) continue;
    if (x + 1 > p.x - PW && x < p.x + PW && y + 1 > p.y && y < p.y + PH && z + 1 > p.z - PW && z < p.z + PW) continue;
    world.set(x, y, z, ITEMS[it].block); take(it, 1); placed.push([x, y, z, it]);
    // a free rock base where the ground dips
    if (y === baseY) for (let yy = y - 1; yy > y - 5 && world.get(x, yy, z) === B.AIR; yy--) world.set(x, yy, z, B.ROCK);
  }
  lastBuild = { world: look.planet.id, placed };
  G.track('build'); if (plan.id === 'tower') G.track('castle');
  note(look.planet.id, 'plan-' + plan.id);
  sfx.install(); writeSave(); renderHotbar();
  closePanels();
  banner(`${plan.name} built!`, `${placed.length} blocks placed. Open Build again to undo it.`);
}
function undoBuild() {
  if (!lastBuild || lastBuild.world !== look.planet.id) return;
  let n = 0;
  for (const [x, y, z, it] of lastBuild.placed) if (world.get(x, y, z) === ITEMS[it].block || (it === 'door' && world.get(x, y, z) === B.DOOR_OPEN) || (it === 'gate' && world.get(x, y, z) === B.GATE_OPEN)) { world.set(x, y, z, B.AIR); give(it, 1, true); n++; }
  lastBuild = null; sfx.pickup(); writeSave(); toast(`Took back ${n} blocks.`); renderBuild();
}
function renderBuild() {
  $('buildTabs').innerHTML = [['blocks', 'Colourful blocks'], ['castle', 'Castle and house blocks'], ['plans', 'Build plans']].map(([k, n]) => `<button class="${k === buildTab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('');
  $('buildTabs').querySelectorAll('button').forEach(b => b.onclick = () => { buildTab = b.dataset.t; renderBuild(); });
  const list = $('buildList'); list.innerHTML = '';
  if (buildTab === 'blocks') {
    for (const f of FAMILIES) {
      const items = FAMILY_ITEMS[f.id], c = buildPick[f.id] || items[0][0], it = items.find(([k]) => k === c)[1];
      const box = document.createElement('div'); box.className = 'family';
      box.appendChild(chips(items.map(([k]) => k), c, (k) => { buildPick[f.id] = k; renderBuild(); }));
      box.appendChild(recipeRow({ out: it, ...BUILD_COST[f.id] }));
      list.appendChild(box);
    }
  } else if (buildTab === 'castle') {
    for (const r of BUILD_RECIPES) list.appendChild(recipeRow(r));
  } else {
    if (lastBuild && lastBuild.world === look.planet.id) {
      const u = document.createElement('button'); u.className = 'undo'; u.textContent = `Undo the last build (get ${lastBuild.placed.length} blocks back)`; u.onclick = undoBuild; list.appendChild(u);
    }
    for (const plan of PLANS) {
      const c = planPick[plan.id] || plan.colours[0];
      const cells = planCells(plan, c), need = planNeed(cells);
      const ok = Object.entries(need).every(([k, n]) => has(k) >= n), canCraft = !ok && !!planCrafts(need);
      const box = document.createElement('div'); box.className = 'plan';
      box.innerHTML = `<div class="nm">${plan.name}</div><div class="note">${plan.note} Pick the colour of the ${plan.picks}:</div>`;
      box.appendChild(chips(plan.colours, c, (k) => { planPick[plan.id] = k; renderBuild(); }));
      const nd = document.createElement('div'); nd.className = 'needs';
      nd.innerHTML = Object.entries(need).map(([k, n]) => `<span class="${has(k) >= n ? 'have' : 'miss'}">${ITEMS[k].name} ${Math.min(has(k), n)}/${n}</span>`).join(' · ');
      box.appendChild(nd);
      const btns = document.createElement('div'); btns.className = 'rigbtns';
      const b1 = document.createElement('button'); b1.textContent = 'Build it in front of me'; b1.disabled = !ok; b1.onclick = () => buildPlan(plan, c, false);
      const b2 = document.createElement('button'); b2.textContent = 'Make the missing blocks and build'; b2.disabled = !canCraft; b2.onclick = () => buildPlan(plan, c, true);
      btns.append(b1, b2); box.appendChild(btns);
      list.appendChild(box);
    }
  }
}

// ---- Home
function homeName() { return (state.flag && state.flag.name) || 'Your home'; }
function checkHome() {
  if (!state.flag) { homeLv = 0; return null; }
  const c = comfort(world, state.flag), lv = levelOf(c.score);
  homeLv = lv;
  const best = state.homeBest || 0;
  if (lv > best) {
    state.homeBest = lv;
    const L = LEVELS[lv];
    profile.coins += L.coins;
    if (lv >= 4 && !profile.homeSlot) profile.homeSlot = true;
    note(look.planet.id, 'home' + lv);
    saveProfile(); writeSave(); sfx.cleared();
    banner(`${homeName()} is now a ${L.name}!`, `+${L.coins} coins. ${L.perk}`);
  }
  return c;
}
function renderHome() {
  const c = checkHome() || { score: 0, rows: [] }, lv = homeLv, L = LEVELS[lv], N = LEVELS[lv + 1];
  $('homeName').value = state.flag ? state.flag.name || '' : '';
  $('homeName').onchange = $('homeName').oninput = () => { if (state.flag) { state.flag.name = $('homeName').value.slice(0, 24); writeSave(); } };
  const pct = N ? Math.min(100, (c.score - L.at) / (N.at - L.at) * 100) : 100;
  $('homeLevel').innerHTML = `<div class="hl"><b>${L.name}</b> · cosy points ${c.score}${N ? ` · ${N.at - c.score} more for ${N.name}` : ' · top level!'}</div><div class="bar homebar"><i style="width:${pct}%"></i></div>`;
  $('homePerks').innerHTML = LEVELS.map((P, i) => `<div class="perk ${i <= lv ? 'on' : ''}"><b>${P.name}</b> <small>${P.at} points</small><span>${P.perk}</span></div>`).join('');
  $('homeCosy').innerHTML = c.rows.map(r => `<div class="cosy ${r.pts ? 'got' : ''}"><span>${r.name}</span><span>${r.pts}/${r.max}</span></div>`).join('');
  const ready = giftReady(), g = profile.gift;
  const gb = $('homeGift');
  gb.disabled = !ready;
  gb.textContent = ready ? `Open today's gift${g && g.streak ? ` (day ${g.streak + 1} in a row?)` : ''}` : `Gift opened today. Come back tomorrow${g ? ` (${g.streak} day${g.streak > 1 ? 's' : ''} in a row)` : ''}`;
  gb.onclick = () => {
    if (!giftReady()) return;
    const r = claimGift(lv);
    for (const [k, n] of Object.entries(r.items)) give(k, n, true);
    sfx.cleared(); writeSave();
    banner(`Daily gift: day ${r.streak} in a row!`, `+${r.coins} coins, ${Object.entries(r.items).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', ')}`);
    renderHome();
  };
}
let homeT = 0;
function updateHome(dt) {
  homeT -= dt;
  if (homeT > 0) return;
  homeT = 3;
  if (updateGardens(world, state, homeLv)) {}
  if (state.flag) checkHome();
  quests.check(state);
}

// ---- Collection book
let bookWorld = null;
function renderBook() {
  const ids = WORLD_ORDER.filter(id => profile.visited[id]);
  if (!bookWorld || (!ids.includes(bookWorld) && bookWorld[0] !== '_')) bookWorld = '_quests';
  const dq = dailyQuests(), ready = dq.quests.filter(q => q.have >= q.need && !q.claimed).length;
  $('bookTabs').innerHTML = [['_quests', `Daily quests${ready ? ` (${ready}!)` : ''}`], ['_badges', 'Badges'], ['_shop', 'Shop'], ['_pets', 'Pets'], ['_looks', 'Looks'], ...ids.map(id => [id, planetById(id).name])]
    .map(([id, n]) => `<button class="${id === bookWorld ? 'on' : ''}" data-w="${id}">${n}</button>`).join('');
  $('bookTabs').querySelectorAll('button').forEach(b => b.onclick = () => { bookWorld = b.dataset.w; renderBook(); });
  if (bookWorld === '_quests') {
    $('bookSum').textContent = `Three new quests every day. Finish all three for a bonus: 100 coins, a Gem and a Fuel cell. You have ${profile.coins} coins.`;
    $('bookList').innerHTML = '';
    dq.quests.forEach((q, i) => {
      const row = document.createElement('div'); row.className = 'quest' + (q.claimed ? ' done' : '');
      row.innerHTML = `<div>${questText(q)} <small class="sub">${questCoins(q)} coins</small></div><div class="qbar"><i style="width:${q.have / q.need * 100}%"></i></div>`;
      const btn = document.createElement('button'); btn.textContent = q.claimed ? 'Done' : q.have >= q.need ? 'Claim' : `${q.have}/${q.need}`;
      btn.disabled = q.claimed || q.have < q.need; btn.onclick = () => { quests.claim(i); renderBook(); };
      row.appendChild(btn); $('bookList').appendChild(row);
    });
    return;
  }
  if (bookWorld === '_shop') {
    profile.ups = profile.ups || {};
    $('bookSum').textContent = `Spend your coins on upgrades. Win waves, clear imp camps and finish daily quests for more. You have ${profile.coins} coins.`;
    $('bookList').innerHTML = '';
    const lvl = (k) => profile.ups[k] || 0;
    const wLvl = profile.gear.weapon ? ITEMS[profile.gear.weapon].weapon : 0;
    const nextW = [['club', 40], ['sword', 150], ['csword', 450], ['spear', 1000], ['blade', 2200]].find(([k]) => ITEMS[k].weapon > wLvl);
    const rows = [];
    if (nextW) rows.push({ name: ITEMS[nextW[0]].name, note: `Weapon level ${ITEMS[nextW[0]].weapon}: hits for ${ITEMS[nextW[0]].dmg}. Opens waves up to ${ITEMS[nextW[0]].weapon * 10}.`, cost: nextW[1], buy: () => { profile.gear.weapon = nextW[0]; } });
    const step = (k, name, note, costs, max) => { const l = lvl(k); rows.push({ name: `${name} ${l < max ? l + 1 : l}/${max}`, note, cost: l < max ? costs[l] : null, buy: () => { profile.ups[k] = l + 1; } }); };
    step('dmg', 'Sharper weapon', '+12% damage with any weapon, each level.', [120, 300, 650, 1300, 2600], 5);
    step('armor', 'Tougher suit', 'Take 8% less damage, each level.', [120, 300, 650, 1300, 2600], 5);
    step('dig', 'Faster digging', 'Dig 20% faster, each level.', [100, 260, 600], 3);
    const sh = profile.ship;
    if (sh.tank < 2) rows.push({ name: 'Bigger fuel tank (ship)', note: 'Holds 6 fuel cells. Needed for the far stars.', cost: 700, buy: () => { sh.tank = 2; } });
    if (sh.engine < 2) rows.push({ name: 'Strong engine (ship)', note: 'Reach Proxima b. (Or make it with a Dragon scale.)', cost: 1500, buy: () => { sh.engine = 2; } });
    else if (sh.engine < 3) rows.push({ name: 'Star engine (ship)', note: 'Reach TRAPPIST-1e and LHS 1140 b.', cost: 3500, buy: () => { sh.engine = 3; } });
    rows.push({ name: '3 Fuel cells', note: 'Fuel for flying between worlds.', cost: 90, buy: () => { give('fuelcell', 3, true); } });
    rows.push({ name: 'Gem', note: 'Rare and shiny. The Trader pays well, and some upgrades need it.', cost: 150, buy: () => { give('gem', 1, true); } });
    for (const r of rows) {
      const row = document.createElement('div'); row.className = 'quest' + (r.cost == null ? ' done' : '');
      row.innerHTML = `<div>${r.name} <small class="sub">${r.note}</small></div><div><small class="sub">${r.cost == null ? 'Maxed' : r.cost + ' coins'}</small></div>`;
      const btn = document.createElement('button'); btn.textContent = r.cost == null ? 'Done' : 'Buy';
      btn.disabled = r.cost == null || profile.coins < r.cost;
      btn.onclick = () => { if (profile.coins < r.cost) return; profile.coins -= r.cost; r.buy(); saveProfile(); writeSave(); sfx.coin(); toast(`Bought: ${r.name.replace(/ \d+\/\d+$/, '')}!`); renderStatus(); renderGoal(); renderBook(); };
      row.appendChild(btn); $('bookList').appendChild(row);
    }
    return;
  }
  if (bookWorld === '_looks') {
    profile.owned = profile.owned || {};
    $('bookSum').textContent = `Pick how you look. Others see your suit in the Friends' camp. Press Y to switch between seeing your pilot and looking through your eyes. You have ${profile.coins} coins.`;
    $('bookList').innerHTML = '';
    const rows = [
      ...Object.entries(LOOKS.suit).map(([k, c]) => ['suit', k, `${SUITS[k].name} suit`, c]),
      ...(profile.rover ? Object.entries(LOOKS.rover).map(([k, c]) => ['rover', k, `${{ sun: 'Sun', sea: 'Sea', berry: 'Berry' }[k]} Rover`, c]) : []),
    ];
    for (const [kind, k, name, cost] of rows) {
      const key = kind + '_' + k, own = cost === 0 || profile.owned[key];
      const on = kind === 'suit' ? (profile.suit || 'sand') === k : (profile.roverLook || 'sun') === k;
      const row = document.createElement('div'); row.className = 'quest' + (on ? ' done' : '');
      row.innerHTML = `<div>${name} <small class="sub">${on ? 'Wearing it' : own ? 'Yours' : cost + ' coins'}</small></div><div><i class="swatch" style="background:${kind === 'suit' ? SUITS[k].suit : { sun: '#e8b23c', sea: '#4e9690', berry: '#8a3a6e' }[k]}"></i></div>`;
      const btn = document.createElement('button');
      btn.textContent = on ? 'On' : own ? 'Use' : 'Buy';
      btn.disabled = on || (!own && profile.coins < cost);
      btn.onclick = () => {
        if (!own) { profile.coins -= cost; profile.owned[key] = 1; sfx.coin(); renderStatus(); }
        if (kind === 'suit') profile.suit = k; else profile.roverLook = k;
        saveProfile(); toast(`${name} on!`); renderBook();
      };
      row.appendChild(btn); $('bookList').appendChild(row);
    }
    return;
  }
  if (bookWorld === '_pets') {
    const have = caughtPets();
    $('bookSum').textContent = have.length ? `Catch a friendly find once and it can come with you as a pet. It follows you and brings a present every few minutes.${profile.pet ? ` Next present in about ${pets.nextIn()} min.` : ''}`
      : 'Catch a friendly find (walk into one) and it can come with you as a pet. Pets follow you and bring presents.';
    $('bookList').innerHTML = '';
    for (const k of Object.keys(FINDS)) {
      const got = have.includes(k), g = PET_GIFTS[k], on = profile.pet === k;
      const row = document.createElement('div'); row.className = 'quest' + (on ? ' done' : '');
      row.innerHTML = `<div>${got ? FINDS[k].name : '???'} <small class="sub">${got ? `${g.text} every ${Math.round(g.every / 60)} min` : 'Not caught yet'}</small></div><div></div>`;
      const btn = document.createElement('button'); btn.textContent = on ? 'Send home' : 'Take along'; btn.disabled = !got;
      btn.onclick = () => { pets.choose(on ? null : k); if (!on) { toast(`Your ${FINDS[k].name} is coming with you!`); quests.badge('pet'); } renderBook(); };
      row.appendChild(btn); $('bookList').appendChild(row);
    }
    return;
  }
  if (bookWorld === '_badges') {
    const got = BADGES.filter(x => profile.badges && profile.badges[x.id]).length;
    $('bookSum').textContent = `${got} of ${BADGES.length} badges. Each one gives 50 coins.`;
    $('bookList').innerHTML = BADGES.map(x => { const on = profile.badges && profile.badges[x.id]; return `<div class="badge ${on ? 'got' : ''}"><i>${on ? '★' : '?'}</i><div><b>${x.name}</b><br><small class="sub">${x.note}</small></div></div>`; }).join('');
    return;
  }
  const w = bookWorld, b = profile.book[w] || {};
  const rows = [];
  const rare = ['crystal', ...RARE_OF[w]];
  for (const k of rare) rows.push([k, ITEMS[k].name, 'Rare find']);
  for (const [k, f] of Object.entries(FINDS)) if (f.worlds === 'all' || f.worlds.includes(w)) rows.push([k, f.name, 'Friendly find']);
  if (FINDS.fish.worlds.includes(w)) rows.push(['goldfish', 'Golden ice fish', 'Very rare find']);
  rows.push(['wreck', 'Buried wreck', 'Old supply box']);
  rows.push(['trader', 'Trader', 'Visitor']);
  rows.push(['trap', 'Spike trap', 'A creature stepped on your trap']);
  for (const k of Object.keys(ENEMIES)) rows.push([k, ENEMIES[k].name, ENEMIES[k].camp ? 'Villain camp' : 'Wave creature']);
  for (const n of Object.keys(BIG)) rows.push(['big-' + BIG[n], 'Big ' + ENEMIES[BIG[n]].name.toLowerCase(), `Mini boss, wave ${n}`]);
  rows.push(['dragon', DRAGONS[w].name, 'Dragon, wave 50']);
  const rb = profile.book.rigs || {};
  for (const [k] of RIG_TREASURE) rows.push([k, ITEMS[k].name, ITEMS[k].tier === 'legend' ? 'Legendary rig treasure' : 'Super rare rig treasure', rb[k]]);
  for (const r of rows) if (r.length === 3) r.push(b[r[0]]);
  const got = rows.filter(r => r[3]).length;
  $('bookSum').textContent = `${planetById(w).name}: ${got} of ${rows.length} found · waves ${wavesOn(w)}/${LAST_WAVE} · ${profile.coins} coins`;
  $('bookList').innerHTML = rows.map(([k, name, kind, on]) => `<div class="entry ${on ? 'got' : ''}"><b>${on ? name : '?'}</b><span>${kind}</span></div>`).join('');
}

// ---------------- panels and pointer lock ----------------
let dragMode = false, lockFails = 0;
const panels = ['prizePanel', 'teamPanel', 'setPanel', 'chatPanel', 'giftPanel', 'buildPanel', 'homePanel', 'adPanel', 'rigPanel', 'bag', 'shipPanel', 'pause', 'win', 'title', 'beaconPanel', 'forgePanel', 'boxPanel', 'shopPanel', 'mapPanel', 'bookPanel', 'fallPanel', 'rewardPanel', 'travel'];
const panelOpen = () => panels.some(id => !$(id).classList.contains('hide'));
function requestLock() {
  if (dragMode) return;
  try {
    const r = canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => onLockError());
  } catch (e) { onLockError(); }
}
function onLockError() {
  lockFails++;
  if (lockFails >= 2 || !('requestPointerLock' in canvas)) {
    dragMode = true;
    toast('Drag the mouse to look around');
  }
  if (!panelOpen()) $('lockmsg').classList.remove('hide');
}
document.addEventListener('pointerlockerror', onLockError);
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) { lockFails = 0; $('lockmsg').classList.add('hide'); }
  else if (playing && !panelOpen() && launchT < 0 && !travelTo) openPanel('pause');
});
function openPanel(id) {
  for (const p of panels) $(p).classList.add('hide');
  $(id).classList.remove('hide');
  $('lockmsg').classList.add('hide');
  if (id === 'bag') renderBag();
  if (id === 'shipPanel') renderShip();
  if (id === 'beaconPanel') renderBeacon();
  if (id === 'forgePanel') renderForge();
  if (id === 'boxPanel') renderBox();
  if (id === 'shopPanel') renderShop();
  if (id === 'mapPanel') renderMap();
  if (id === 'bookPanel') renderBook();
  if (id === 'prizePanel') hooks.render($('prizeBody'));
  if (id === 'rigPanel') renderRig();
  if (id === 'homePanel') renderHome();
  if (id === 'buildPanel') renderBuild();
  if (id === 'giftPanel') renderGift();
  if (id === 'setPanel') renderSettings();
  if (id === 'chatPanel') renderChat();
  mouse.left = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
function closePanels(relock = true) {
  for (const p of panels) $(p).classList.add('hide');
  if (relock) resume();
}
function resume() {
  for (const p of panels) $(p).classList.add('hide');
  if (!dragMode) { requestLock(); if (!document.pointerLockElement) $('lockmsg').classList.remove('hide'); }
}
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closePanels()));
$('launchBtn').onclick = () => { if (state.won) { mapFromWin = false; openPanel('mapPanel'); } else launch(); };
$('mapBtn').onclick = () => { mapFromWin = true; openPanel('mapPanel'); };
$('stayBtn').onclick = landAgain;
$('resumeBtn').onclick = () => resume();
$('restartBtn').onclick = () => {
  if (!confirmRestart()) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
  setupWorld(null); resume();
};
let restartArmed = 0;
function confirmRestart() {
  // two clicks within 3 s, instead of a browser popup
  const now = performance.now();
  if (now - restartArmed < 3000) return true;
  restartArmed = now;
  $('restartBtn').textContent = 'Click again to wipe your world';
  setTimeout(() => { $('restartBtn').textContent = 'Start over'; }, 3000);
  return false;
}

// ---------------- input ----------------
const keys = new Set();
const mouse = { left: false, downAt: null, dragged: false };
const turn = (dx, dy) => {
  player.yaw -= dx * 0.0023 * settings.mouse;
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - dy * 0.0023 * settings.mouse));
};
window.addEventListener('keydown', (e) => {
  if (!playing) return;
  if (e.code === 'Escape') {
    if (dragMode || !document.pointerLockElement) {
      if (panelOpen()) { if (!$('win').classList.contains('hide')) return; closePanels(); } else openPanel('pause');
    }
    return;
  }
  if (e.code === 'KeyE' || e.code === 'Tab') {
    e.preventDefault();
    if (!$('bag').classList.contains('hide')) closePanels(); else if (!panelOpen() && launchT < 0) openPanel('bag');
    return;
  }
  if (e.code === 'KeyF') {
    if (!$('shipPanel').classList.contains('hide')) closePanels();
    else if (!panelOpen() && launchT < 0) { if (nearShip()) openPanel('shipPanel'); else toast('Walk up to the ship first'); }
    return;
  }
  if (e.code === 'KeyK') {
    if (!$('buildPanel').classList.contains('hide')) closePanels(); else if (!panelOpen() && launchT < 0 && state.won) openPanel('buildPanel');
    return;
  }
  if (e.code === 'KeyT' && inCamp) {
    if (!$('chatPanel').classList.contains('hide')) closePanels(); else if (!panelOpen()) openPanel('chatPanel');
    return;
  }
  if (e.code === 'KeyB') {
    if (!$('bookPanel').classList.contains('hide')) closePanels(); else if (!panelOpen() && launchT < 0) openPanel('bookPanel');
    return;
  }
  if (panelOpen()) return;
  if (e.code === 'KeyQ') adv.scan();
  if (e.code === 'KeyV') toggleRover();
  if (e.code === 'KeyY') toggleView();
  if (e.code === 'KeyU') backToTop();
  if (e.code === 'KeyN') findShip();
  if (e.code === 'KeyR') openPrizes();
  if (e.code === 'KeyH' && launchT < 0) { bookWorld = '_shop'; openPanel('bookPanel'); }
  if (/^Digit[1-9]$/.test(e.code)) { state.sel = +e.code[5] - 1; renderHotbar(); }
  if (e.code === 'KeyG' && (params.has('debug') || profile.free)) { player.fly = !player.fly; toast(player.fly ? 'Flying: Space to go up, C to go down. G to stop.' : 'Flying off.'); }
  if (e.code === 'Space') e.preventDefault();
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouse.left = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  initAudio();
  if (!playing || panelOpen()) return;
  if (!dragMode && !document.pointerLockElement) { requestLock(); return; }
  if (dragMode) { mouse.downAt = [e.clientX, e.clientY, e.button, performance.now()]; mouse.dragged = false; }
  if (e.button === 0) mouse.left = true;
  if (e.button === 2 && !dragMode) useAction();
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.left = false;
  if (dragMode && mouse.downAt && e.button === 2 && !mouse.dragged) useAction();
  mouse.downAt = null;
});
window.addEventListener('mousemove', (e) => {
  if (!playing || panelOpen()) return;
  if (document.pointerLockElement === canvas) turn(e.movementX, e.movementY);
  else if (dragMode && mouse.downAt) {
    const [x0, y0] = mouse.downAt;
    if (!mouse.dragged && Math.hypot(e.clientX - x0, e.clientY - y0) > 5) { mouse.dragged = true; mouse.left = false; }
    if (mouse.dragged) turn(e.movementX * 1.4, e.movementY * 1.4);
  }
});
window.addEventListener('wheel', (e) => {
  if (!playing || panelOpen()) return;
  state.sel = (state.sel + (e.deltaY > 0 ? 1 : 8)) % 9; renderHotbar();
}, { passive: true });
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  fitCamera();
});
window.addEventListener('beforeunload', writeSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });

// ---------------- touch controls ----------------
const tch = { move: null, ox: 0, oy: 0, jx: 0, jy: 0, look: new Map(), jump: false };
const STICK_R = 52;
function touchInput() {
  let r = tch.jx, f = -tch.jy;
  const m = Math.hypot(r, f);
  if (m < 0.15) { r = 0; f = 0; }
  return { f, r, jump: tch.jump, run: m > 0.92, down: false };
}
function stickTo(x, y) {
  const st = $('stick');
  if (x === null) { st.style.left = ''; st.style.top = ''; st.classList.remove('on'); }
  else { st.style.left = x + 'px'; st.style.top = y + 'px'; st.classList.add('on'); }
  $('knob').style.transform = '';
}
function setupTouch() {
  const onStart = (e) => {
    if (e.target.closest && e.target.closest('button')) return;   // let buttons get their tap
    e.preventDefault();
    initAudio();
    if (!playing || panelOpen()) return;
    for (const t of e.changedTouches) {
      const inPad = t.clientX < window.innerWidth * 0.45 && t.clientY > window.innerHeight * 0.3;
      if (inPad && tch.move === null) {
        tch.move = t.identifier; tch.ox = t.clientX; tch.oy = t.clientY; tch.jx = tch.jy = 0;
        stickTo(t.clientX, t.clientY);
      } else tch.look.set(t.identifier, [t.clientX, t.clientY]);
    }
  };
  const onMove = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === tch.move) {
        let dx = t.clientX - tch.ox, dy = t.clientY - tch.oy;
        const d = Math.hypot(dx, dy);
        if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
        tch.jx = dx / STICK_R; tch.jy = dy / STICK_R;
        $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (tch.look.has(t.identifier)) {
        const [px, py] = tch.look.get(t.identifier);
        if (playing && !panelOpen()) turn((t.clientX - px) * 1.7, (t.clientY - py) * 1.7);
        tch.look.set(t.identifier, [t.clientX, t.clientY]);
      }
    }
  };
  const onEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === tch.move) { tch.move = null; tch.jx = tch.jy = 0; stickTo(null); }
      tch.look.delete(t.identifier);
    }
  };
  for (const el of [canvas, $('touch')]) {
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd); el.addEventListener('touchcancel', onEnd);
  }
  // buttons: pointer events, so they also work with a mouse when testing
  const hold = (id, down, up) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); initAudio(); el.classList.add('on'); down(); });
    const off = (e) => { if (!el.classList.contains('on')) return; el.classList.remove('on'); up(); };
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
    el.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
  };
  hold('tDig', () => { mouse.left = true; }, () => { mouse.left = false; });
  hold('tJump', () => { tch.jump = true; }, () => { tch.jump = false; });
  hold('tPlace', () => useAction(), () => { });
  const tap = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); initAudio(); fn(); });
  tap('tBag', () => { if (launchT < 0) openPanel('bag'); });
  tap('tShip', () => { if (launchT >= 0) return; if (nearShip()) openPanel('shipPanel'); else findShip(); });
  tap('tPause', () => openPanel('pause'));
  tap('tBook', () => { if (launchT < 0) openPanel('bookPanel'); });
  tap('tChat', () => { if (inCamp) openPanel('chatPanel'); });
  tap('tFly', () => { if (!profile.free) return; player.fly = !player.fly; toast(player.fly ? 'Flying: hold Jump to go up. Tap Fly again to land.' : 'Flying off.'); });
  hold('tScan', () => adv.scan(), () => { });
  tap('tRover', () => toggleRover());
  tap('tView', () => toggleView());
  tap('tPrize', () => openPrizes());
  tap('tShop', () => { if (launchT < 0) { bookWorld = '_shop'; openPanel('bookPanel'); } });
  $('goal').addEventListener('click', () => $('goal').classList.toggle('open'));
  document.querySelectorAll('.close').forEach(b => { b.textContent = 'Close'; });
  const fs = $('fullBtn');
  const root = document.documentElement;
  if (!root.requestFullscreen && !root.webkitRequestFullscreen) fs.remove();
  else fs.onclick = () => {
    try {
      const r = root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen();
      if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => toast('Full screen is not allowed here'));
    } catch (e) { toast('Full screen is not allowed here'); }
  };
  // stop the page from scrolling or zooming under your thumbs
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  dragMode = true;   // no mouse capture on touch screens
}
if (TOUCH) setupTouch();

// ---------------- digging and placing ----------------
const dig = { x: 0, y: 0, z: 0, p: 0, hitT: 0, denied: false, on: false };
let hit = null;
const tileColors = {};
function colorsOf(id) {
  if (tileColors[id]) return tileColors[id];
  const t = BLOCKS[id].tiles, name = typeof t === 'string' ? t : t.side;
  const d = atlas.tileCanvases[name].getContext('2d').getImageData(0, 0, 16, 16).data;
  const out = [];
  for (let k = 0; k < 6; k++) { const i = ((k * 37) % 256) * 4; out.push(new THREE.Color(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`)); }
  return (tileColors[id] = out);
}
function toolForTier(t) { return t === 1 ? 'a Rock pickaxe' : 'an Iron drill'; }
let aim = null;     // creature, find or trader under the crosshair
function updateDig(dt) {
  if (mouse.left && aim && aim.kind === 'enemy' && (!hit || aim.t < hit.t) && !panelOpen() && launchT < 0) {
    adv.attack(aim); dig.on = false; dig.p = 0; crackBox.visible = false; return;
  }
  if (mouse.left && !hit && !panelOpen() && launchT < 0 && adv.enemies.length) adv.attack(null);
  if (!mouse.left || !hit || panelOpen() || launchT >= 0) { dig.on = false; dig.p = 0; crackBox.visible = false; dig.denied = false; return; }
  const b = BLOCKS[hit.id];
  if (!dig.on || dig.x !== hit.x || dig.y !== hit.y || dig.z !== hit.z) Object.assign(dig, { x: hit.x, y: hit.y, z: hit.z, p: 0, hitT: 0, on: true, denied: false });
  if (!b.breakable) { crackBox.visible = false; return; }
  const tier = toolTier();
  if (tier < b.tier) {
    if (!dig.denied) { dig.denied = true; sfx.deny(); toast(`You need ${toolForTier(b.tier)} to dig ${b.name.toLowerCase()}`); }
    return;
  }
  dig.p += dt * TOOL_SPEED[tier] / b.time * (1 + 0.2 * (profile.ups && profile.ups.dig || 0));
  dig.hitT -= dt;
  if (dig.hitT <= 0) { dig.hitT = 0.22; sfx.hit(b.time > 1.5); bits.chips(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, colorsOf(hit.id), 4); }
  crackBox.visible = true; crackBox.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  crackMat.map = cracks[Math.min(5, Math.floor(dig.p * 6))];
  if (dig.p >= 1) {
    world.set(hit.x, hit.y, hit.z, B.AIR);
    bits.burst(hit.x, hit.y, hit.z, colorsOf(hit.id));
    sfx.break(b.time > 1.5);
    if (b.item) give(b.item, 1);
    if (b.loot) openSupply();
    if (hit.id === B.RIG) { const st = removeRig(look.planet.id, hit.x, hit.y, hit.z); for (const it in st) give(it, st[it], true); markSeen(); toast('You picked up the rig and everything it dug.'); }
    if (hit.id === B.FLAG && state.flag && state.flag.x === hit.x && state.flag.y === hit.y && state.flag.z === hit.z) { state.flag = null; homeLv = 0; toast('You took down your Home flag. This is no longer your home.'); }
    if (hit.id === B.BOX) { const k = `${hit.x},${hit.y},${hit.z}`, bx = state.boxes[k]; if (bx) { for (const it in bx) give(it, bx[it], true); delete state.boxes[k]; toast('The box was emptied into your bag.'); } }
    if (b.item && (ITEMS[b.item].rare || b.item === 'crystal') && note(look.planet.id, b.item)) {
      toast(`New in your book: ${ITEMS[b.item].name}!${ITEMS[b.item].rare ? ' The Trader pays well for it.' : ''}`);
    }
    state.stats.mined++; G.track('mine');
    { const lk = hooks.dug(); if (lk) { toast(lk); sfx.coin(); bits.burst(hit.x, hit.y, hit.z, GOLDS); } }
    dig.on = false; dig.p = 0; crackBox.visible = false;
    renderGoal();
  }
}
function openSupply() {
  const first = note(look.planet.id, 'wreck');
  const coins = 15 + Math.floor(Math.random() * 30);
  profile.coins += coins;
  const loot = { sheet: 2 + Math.floor(Math.random() * 3), crystal: 1 + Math.floor(Math.random() * 2) };
  if (Math.random() < 0.5) loot.gem = 1;
  if (Math.random() < 0.4) loot.fuelcell = 1;
  if (Math.random() < 0.3) loot.gold = 2;
  for (const k in loot) give(k, loot[k], true);
  sfx.catch(); setTimeout(() => sfx.coin(), 300);
  banner('Old supply box!', `+${coins} coins, ` + Object.entries(loot).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', ') + (first ? ' · new in your book' : ''));
  saveProfile();
}
function useAction() {
  if (launchT >= 0) return;
  const fr = (inCamp || team) && friends.friendAt(rayO, fwd, rayT0 + 4);
  if (fr && rayT0) fr.t -= rayT0;
  if (fr && (!hit || fr.t < hit.t)) { openGift(fr.o); return; }
  if (aim && (!hit || aim.t < hit.t)) {
    if (aim.kind === 'trader') { openPanel('shopPanel'); return; }
    if (aim.kind === 'enemy') { adv.attack(aim); return; }
    if (aim.kind === 'find' && aim.t < 3.5) { if (adv.catchFind(aim.ent)) { adv.removeFind(aim.ent); G.track('find'); } return; }
  }
  const held0 = state.hotbar[state.sel];
  if (held0 && has(held0) > 0 && ITEMS[held0].food && !(hit && BLOCKS[hit.id].use)) {
    if (state.hp >= MAX_HP && state.air >= MAX_AIR) { toast('You are not hungry.'); return; }
    take(held0, 1); G.track('eat'); adv.heal(ITEMS[held0].food); state.air = Math.min(MAX_AIR, state.air + 30); sfx.catch(); toast(`You ate a ${ITEMS[held0].name}. Health and air up.`); return;
  }
  if (!hit) return;
  if (BLOCKS[hit.id].ship) { if (inCamp) { toast('This ship stays in the Friends\' camp. To go back to your worlds, use Pick another world in the pause menu.'); return; } openPanel('shipPanel'); return; }
  if (inCamp && BLOCKS[hit.id].use === 'beacon') { toast('No waves in the Friends\' camp. It is a safe place to build together.'); return; }
  const use = BLOCKS[hit.id].use;
  if (use === 'beacon') { openPanel('beaconPanel'); return; }
  if (use === 'forge') { openPanel('forgePanel'); return; }
  if (use === 'box') { openBox = `${hit.x},${hit.y},${hit.z}`; openPanel('boxPanel'); return; }
  if (use === 'rig') { openRig = [hit.x, hit.y, hit.z]; openPanel('rigPanel'); return; }
  if (use === 'door') { world.set(hit.x, hit.y, hit.z, hit.id === B.DOOR ? B.DOOR_OPEN : B.DOOR); sfx.place(); return; }
  if (use === 'home') {
    if (!state.flag || state.flag.x !== hit.x || state.flag.y !== hit.y || state.flag.z !== hit.z) { state.flag = { x: hit.x, y: hit.y, z: hit.z, name: (state.flag && state.flag.name) || '' }; toast('This flag is your home now.'); }
    openPanel('homePanel'); return;
  }
  if (use === 'garden') {
    const k = `${hit.x},${hit.y},${hit.z}`, g = state.gardens || (state.gardens = {});
    if (hit.id === B.GARDEN_RIPE) {
      world.set(hit.x, hit.y, hit.z, B.GARDEN); g[k] = Date.now();
      give('fruit', 2, true); sfx.catch(); if (note(look.planet.id, 'fruit')) toast('New in your book: Moss fruit! Hold it and use it to eat.');
      writeSave(); return;
    }
    if (!g[k]) g[k] = Date.now();
    const left = Math.max(0, Math.ceil((g[k] + growTime(homeLv) - Date.now()) / 1000));
    toast(`Moss fruit is growing. Ready in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}.`); return;
  }
  if (use === 'bed') { state.home = { x: hit.x, y: hit.y, z: hit.z }; if (!adv.sleep()) { } writeSave(); return; }
  if (use === 'airmaker' && !state.hotbar[state.sel]) { toast('Air maker: stand near it to fill your air.'); return; }
  const item = state.hotbar[state.sel];
  if (!item || !ITEMS[item].block) { toast(says('Pick a block to place (1 to 9)')); return; }
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (y < 0 || y >= H || world.get(x, y, z) !== B.AIR) return;
  const p = player.pos;
  if (x + 1 > p.x - PW && x < p.x + PW && y + 1 > p.y && y < p.y + PH && z + 1 > p.z - PW && z < p.z + PW) return;
  if (inCamp && item === 'rig') { sfx.deny(); toast('Mining rigs only work on your own worlds.'); return; }
  if (item === 'rig' && rigCount() >= rigSlots()) { sfx.deny(); toast(`All ${rigSlots()} rig slots are in use. Open your bag to unlock another slot.`); return; }
  world.set(x, y, z, ITEMS[item].block);
  take(item, 1);
  if (item === 'flag') {
    const moved = !!state.flag;
    state.flag = { x, y, z, name: (state.flag && state.flag.name) || '' };
    homeLv = levelOf(comfort(world, state.flag).score);
    note(look.planet.id, 'home');
    banner(moved ? 'Your home moved here' : 'Home sweet home!', 'Put cosy things near the flag to make your home better. Use the flag to see how.');
  }
  if (item === 'garden') { (state.gardens || (state.gardens = {}))[`${x},${y},${z}`] = Date.now(); toast(`Garden bed planted. Moss fruit will be ready in ${Math.round(growTime(homeLv) / 60000)} minutes, even if you leave.`); }
  if (item === 'rig') {
    const ores = placeRig(world, look.planet.id, x, y, z);
    toast(`Mining rig set up! It will dig: ${Object.keys(ores).map(k => ITEMS[k].name).join(', ')}.`);
  }
  state.stats.placed++; G.track('place');
  sfx.place();
}

// ---------------- main loop ----------------
const race = createRace({ renderer, sfx, track: (e, n) => G.track(e, n), get profile() { return profile; }, saveProfile, touch: TOUCH,
  onExit: () => { playMusic(inCamp ? 'camp' : look.planet.id); fitCamera(); renderer.setSize(window.innerWidth, window.innerHeight, false); if (!$('title').classList.contains('hide')) return; if (playing) openPanel('pause'); } });
function openRace() { if (friends) friends.where('race'); initAudio(); playMusic('race'); closePanels(false); $('title').classList.add('hide'); race.open(); }
$('raceBtn').onclick = () => { initAudio(); openRace(); };
$('raceBtn2').onclick = () => openRace();
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
let goalTimer = 0, saveTimer = 0, fpsT = 0, fpsN = 0;
const showFps = params.has('fps');

function covered() {
  const x = Math.floor(camera.position.x), z = Math.floor(camera.position.z);
  for (let y = Math.floor(camera.position.y) + 1; y < Math.min(H, camera.position.y + 14); y++) if (world.solid(x, y, z)) return true;
  return false;
}

// ?film: the game only moves when told to (a fixed step per frame), so a bot can record a smooth video
const FILM = params.has('film');
const nextFrame = () => { if (!FILM) requestAnimationFrame(frame); };
function frame(filmDt, noDraw) {
  const dt = FILM ? (filmDt || 1 / 24) : Math.min(0.05, clock.getDelta());
  if (FILM) clock.elapsedTime += dt;
  if (race.active) { race.frame(dt); nextFrame(); return; }
  if (playing && friends) friends.update(dt, clock.elapsedTime);
  if (pets) pets.update(playing && !panelOpen() ? dt : 0);
  updateChunks(playing ? 6 : 14);

  const active = playing && !panelOpen() && launchT < 0;
  const input = active && TOUCH ? touchInput() : active ? {
    f: (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0),
    r: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
    jump: keys.has('Space'), run: keys.has('ShiftLeft') || keys.has('ShiftRight'), down: keys.has('KeyC'),
  } : { f: 0, r: 0, jump: false, run: false };
  if (playing) {
    const ev = player.update(dt, input);
    updateGuide(dt, ev);
    updateRover(dt);
    if (ev.stepped) sfx.step();
    if (ev.jumped) sfx.jump();
    if (ev.landed) { sfx.step(); const gx = Math.floor(player.pos.x), gy = Math.floor(player.pos.y) - 1, gz = Math.floor(player.pos.z), gid = world.get(gx, gy, gz); if (gid) bits.puff(player.pos.x, player.pos.y, player.pos.z, colorsOf(gid)); }
    if (ev.stepped && !player.rover && !player.swimming) { const gid = world.get(Math.floor(player.pos.x), Math.floor(player.pos.y) - 1, Math.floor(player.pos.z)); if (gid === B.REDDIRT || gid === B.DUST) prints.step(player.pos.x, Math.floor(player.pos.y), player.pos.z, player.yaw); }
    if (player.pos.y < -20) { player.pos.y = world.surfaceY(Math.floor(player.pos.x), Math.floor(player.pos.z)) + 2; player.vel.y = 0; }
    state.stats.time += dt;
  }

  // camera
  camera.position.set(player.pos.x, player.pos.y + EYE + (player.rover ? 0.35 : 0), player.pos.z);
  if (launchT >= 0 && shipMesh) {
    // watch the ship go
    const target = shipMesh.position.clone().add(new THREE.Vector3(4.5, 2.5, 2.5));
    const d = target.clone().sub(camera.position);
    const wantYaw = Math.atan2(-d.x, -d.z), wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    let dy = wantYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    player.yaw += dy * Math.min(1, dt * 3); player.pitch += (wantPitch - player.pitch) * Math.min(1, dt * 3);
    const shake = Math.max(0, 1 - Math.abs(launchT - 2) / 3) * 0.08;
    camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake;
  }
  if (shakeAmt > 0) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt; shakeAmt = Math.max(0, shakeAmt - dt * 1.5); }
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  camera.updateMatrixWorld();
  updateHeld(dt);

  // what am I looking at
  camera.getWorldDirection(fwd);
  eyeV.copy(camera.position);
  placeCam(dt, fwd);
  // aim along the middle of the screen; reach is still measured from your eyes
  hit = playing && launchT < 0 ? world.raycast(rayO, fwd, rayT0 + 5.5) : null;
  if (hit && rayT0) { hit.t -= rayT0; if (hit.t < -1.2 || hit.t > 5.5) hit = null; }
  aim = playing && launchT < 0 ? adv.pick(rayO, fwd, rayT0 + 6) : null;
  if (aim && rayT0) { aim.t -= rayT0; if (aim.t < -1 || aim.t > 6) aim = null; }
  let frAim = (inCamp || team) && playing && friends.friendAt(rayO, fwd, rayT0 + 4);
  if (frAim && rayT0) frAim.t -= rayT0;
  updateBody(dt);
  if (frAim && (!hit || frAim.t < hit.t)) {
    outline.visible = false;
    $('target').textContent = `${frAim.o.name || 'A friend'} · right click (or Use) to give a gift`;
  } else if (aim && (!hit || aim.t < hit.t)) {
    outline.visible = false;
    const e = aim.ent;
    if (aim.kind === 'enemy') $('target').innerHTML = `${e.name} <span class="hpbar"><i style="width:${Math.max(0, e.hp / e.max * 100)}%"></i></span>`;
    else if (aim.kind === 'trader') $('target').innerHTML = says('Trader · right click to trade');
    else $('target').innerHTML = `${FINDS[e.kind].name}${e.gold ? ' (golden!)' : ''} · ${FINDS[e.kind].fly ? 'stand under it' : 'walk up to it'}`;
  } else if (hit) {
    outline.visible = true; outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    const b = BLOCKS[hit.id];
    let txt = b.name;
    if (b.ship) txt += ' · right click or F';
    else if (b.use === 'beacon') txt += ' · right click to start a wave';
    else if (b.use && b.use !== 'airmaker') txt += ' · right click to use';
    else if (b.breakable && toolTier() < b.tier) txt += ` · <span class="need">needs ${toolForTier(b.tier).replace(/^an? /, '')}</span>`;
    else if (!b.breakable) txt += ' · too hard to dig';
    $('target').innerHTML = says(txt);
  } else { outline.visible = false; $('target').textContent = ''; }
  updateDig(dt);

  // ship launch
  if (launchT >= 0 && shipMesh) {
    launchT += dt;
    const lift = Math.max(0, launchT - 1.2);
    shipMesh.position.y = shipMesh.userData.base + lift * lift * 2.2 * Math.sqrt(0.38 / look.gravity);
    shipMesh.rotation.z = Math.min(0.25, lift * 0.04);
    const bx = shipMesh.position.x, by = shipMesh.position.y, bz = shipMesh.position.z;
    for (let k = 0; k < 10; k++) {
      flames.emit(bx + 1 + Math.random() * 7, by + 0.6, bz + 0.5 + Math.random() * 4, (Math.random() - 0.5) * 2, -6 - Math.random() * 6, (Math.random() - 0.5) * 2, 0.5 + Math.random() * 0.4);
      if (launchT < 3) smoke.emit(bx + Math.random() * 9, SHIP_BASE + 0.5, bz + Math.random() * 5, (Math.random() - 0.5) * 8, 0.5 + Math.random(), (Math.random() - 0.5) * 8, 2.5);
    }
    if (launchT > 6.5 && travelTo) { travel(travelTo); }
    else if (launchT > 6.5) {
      launchT = -1; state.won = true; sfx.win();
      const m = Math.floor(state.stats.time / 60), s = Math.floor(state.stats.time % 60);
      $('winStats').textContent = `Time: ${m} min ${s} s · Blocks dug: ${state.stats.mined} · Blocks placed: ${state.stats.placed}`;
      openPanel('win'); writeSave();
    }
  } else if (playing) {
    // smoke from the broken bits
    for (const id in SMOKE_POINTS) {
      if (state.fixed[id] || Math.random() > 0.35) continue;
      const [x, y, z] = SMOKE_POINTS[id];
      smoke.emit(x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8, 0.25 + Math.random() * 0.2, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 3 + Math.random());
    }
  }
  smoke.update(dt, -0.1, (t) => Math.min(1, t * 2) * 0.9);
  flames.update(dt, 0, (t) => t);
  bits.update(dt, world);

  // light, sky, day and night, waves, finds
  adv.update(dt);
  if (playing) updateHome(dt);
  sky.position.copy(camera.position);
  lavaSea.update(dt, camera.position);
  updateLooks(dt);
  if (water) {
    water.update(dt, camera.position);
    player.waterY = water.level ?? lavaSea.level;
    const under = water.under(camera.position);
    $('underwater').classList.toggle('on', under && playing);
    if (under) { scene.fog.color.set(0x0e4a5a); scene.fog.near = 1; scene.fog.far = 22; }
    else if (scene.fog.far === 22) { scene.fog.color.set(fogBase); scene.fog.near = RENDER_R * CS * 0.35; scene.fog.far = RENDER_R * CS - 4; }
  }
  nightCover.position.copy(camera.position);
  sun.position.copy(player.pos).addScaledVector(adv.sunDir.y > 0.02 ? adv.sunDir : new THREE.Vector3(adv.sunDir.x, 0.02, adv.sunDir.z), 80);
  sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);
  const want = adv.isDark() ? 30 : 0;
  lamp.intensity += (want - lamp.intensity) * Math.min(1, dt * 4);

  // hud
  if (playing) {
    let guided = updateWay(dt);
    if (updateFinder(dt)) guided = true;
    missionT -= dt; if (missionT <= 0) { missionT = 0.4; renderMission(); }
    const d = SHIP_CENTER.clone().sub(camera.position); d.y = 0;
    const dist = d.length();
    if (!guided) { $('compass').classList.toggle('hide', dist < 7); $('compass').querySelector('span').textContent = 'Ship'; }
    if (!guided && dist >= 7) {
      let rel = Math.atan2(-d.x, -d.z) - player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      $('compass').querySelector('.arrow').style.transform = `rotate(${-rel}rad)`;
      $('shipDist').textContent = `${Math.round(dist)} m`;
    }
    const below = groundAbove();
    $('depth').classList.toggle('hide', below < 2);
    $('depth').textContent = `${below} blocks down`;
    $('upBtn').classList.toggle('hide', below < 3 || panelOpen() || player.fly);
    if (below >= 3 && !upTold) { upTold = true; toast(TOUCH ? 'Deep down! Hold Jump next to a wall to climb, or tap "Back to the top".' : 'Deep down! Hold Space next to a wall to climb, or press U to go back to the top.'); }
    const hint = $('hint');
    if (!hint.classList.contains('big') || panelOpen()) hint.textContent = nearShip() && launchT < 0 && !panelOpen() ? says('Press F to open the ship') : '';
    if (TOUCH) { const nr = nearShip(); $('tShip').classList.toggle('far', !nr && findT <= 0); $('tShip').classList.toggle('finding', findT > 0); $('tShip').textContent = nr ? 'Ship' : 'Find ship'; }
    goalTimer -= dt; if (goalTimer <= 0) { goalTimer = 0.5; renderGoal(); }
    renderStatus();
    saveTimer -= dt; if (saveTimer <= 0) { saveTimer = 10; writeSave(); }
  }
  if (showFps) { fpsT += dt; fpsN++; if (fpsT > 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsT)} fps`; fpsT = 0; fpsN = 0; } }

  if (!noDraw) { if (useGlow()) { setupGlow(); composer.render(); } else renderer.render(scene, camera); }
  nextFrame();
}


// ---------------- status: health, air, coins, wave, lost bag ----------------
let statusT = 0;
function renderStatus() {
  $('hpFill').style.width = `${state.hp / MAX_HP * 100}%`;
  $('airFill').style.width = `${state.air / MAX_AIR * 100}%`;
  $('airFill').classList.toggle('low', state.air < 25);
  $('hpFill').classList.toggle('low', state.hp < 6);
  $('hurt').style.opacity = Math.min(1, adv.flash * 2.5) + (state.air <= 0 ? 0.35 : 0);
  statusT -= 1 / 30;
  const len = adv.dayLength();
  $('daytime').textContent = !len ? 'Always day' : adv.daylight > 0.35 ? 'Day' : 'Night';
  $('coins').textContent = `${profile.coins} coins`;
  const hm = G.home();
  $('homeTag').classList.toggle('hide', !hm.at);
  if (hm.at) $('homeTag').textContent = `${homeName()} · ${LEVELS[homeLv].name}${giftReady() ? ' · gift waiting!' : ''}`;
  const w = adv.wave;
  if (w) {
    const left = adv.enemies.filter(e => e.wave).length + w.todo.length;
    const boss = adv.enemies.find(e => e.boss);
    $('waveBox').classList.remove('hide');
    $('waveBox').innerHTML = boss ? `${boss.name} <span class="hpbar big"><i style="width:${Math.max(0, boss.hp / boss.max * 100)}%"></i></span>` : `Wave ${w.n} · ${left} left`;
  } else $('waveBox').classList.add('hide');
  const lost = state.lost;
  if (lost) {
    const d = new THREE.Vector3(lost.x - camera.position.x, 0, lost.z - camera.position.z);
    let rel = Math.atan2(-d.x, -d.z) - player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    $('lostBox').classList.remove('hide');
    $('lostBox').innerHTML = `Lost bag <span class="arrow" style="display:inline-block;transform:rotate(${-rel}rad)">↑</span> ${Math.round(d.length())} m`;
  } else $('lostBox').classList.add('hide');
}

// the weapon in your hand
const held = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, depthTest: false, fog: false }));
held.renderOrder = 20; held.position.set(0.36, -0.3, -0.62); held.rotation.set(0, -0.35, 0.15); camera.add(held);
const heldTex = {};
let heldId = null;
function updateHeld(dt) {
  const id = profile.gear.weapon;
  held.visible = !!id && playing && launchT < 0;
  if (id && id !== heldId) {
    heldId = id;
    if (!heldTex[id]) { const t = new THREE.TextureLoader().load(icon(id)); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; heldTex[id] = t; }
    held.material.map = heldTex[id]; held.material.needsUpdate = true;
  }
  swingT = Math.max(0, swingT - dt);
  const k = swingT > 0 ? Math.sin((1 - swingT / 0.3) * Math.PI) : 0;
  held.rotation.z = 0.15 + k * 1.1; held.position.x = 0.36 - k * 0.12; held.position.y = -0.3 + k * 0.08;
}

// ---------------- picking a world ----------------
let picked = 'mars';
try { picked = planetById(localStorage.getItem(LAST_KEY) || 'mars').id; } catch (e) { }
if (PLANETS.some(p => p.id === params.get('world'))) picked = params.get('world');
function hasSave(id) { try { return !!localStorage.getItem(saveKey(id)); } catch (e) { return false; } }
for (const p of PLANETS) if (hasSave(p.id)) profile.visited[p.id] = true;
if (params.has('all')) for (const p of PLANETS) profile.visited[p.id] = true;
const unlocked = (id) => id === 'mars' || !!profile.visited[id];
function renderWorlds() {
  const box = $('worlds'); box.innerHTML = '';
  for (const p of PLANETS) {
    const w = worldParams(p.id);
    const b = document.createElement('button');
    b.className = 'world' + (p.id === picked ? ' on' : '');
    const sw = [w.sky.horizon, w.sky.top].map(c => '#' + c.toString(16).padStart(6, '0'));
    const ground = (w.pal.redTop || ['#c4562a'])[0];
    const lockTxt = unlocked(p.id) ? (hasSave(p.id) ? `<span class="sv">wave ${wavesOn(p.id)}/${LAST_WAVE}</span>` : '') : '<span class="lk">locked</span>';
    b.innerHTML = `<span class="sw" style="background:linear-gradient(${sw[1]},${sw[0]} 62%,${ground} 62%)"><i style="background:#${w.sky.sun.toString(16).padStart(6, '0')}"></i></span><span class="nm">${p.name}</span>${lockTxt}`;
    b.onclick = () => { picked = p.id; renderWorlds(); };
    box.appendChild(b);
  }
  const p = planetById(picked), r = p.real;
  $('facts').innerHTML = `<h3>${p.name}</h3><p class="blurb">${p.blurb}</p><dl>
    <dt>Gravity</dt><dd>${gravityWords(r.gravity, r.gravityGuess)}. ${jumpWords(r.gravity)}</dd>
    <dt>Temperature</dt><dd>${tempWords(p)}</dd>
    <dt>Sun</dt><dd>${starWords(p)}</dd>
    <dt>How far</dt><dd>${distanceWords(p)}</dd>
    <dt>Time</dt><dd>${r.yearText}</dd>
    <dt>In the sky</dt><dd>${p.sky}</dd>
    <dt>Rare finds</dt><dd>${p.rare.map(x => x.why).join(' ')}</dd></dl>`;
  const saved = hasSave(picked);
  $('playBtn').textContent = !unlocked(picked) ? 'Locked: fly here from your ship\'s star map' : saved ? `Keep playing on ${p.name}` : `Land on ${p.name}`;
  $('playBtn').disabled = !unlocked(picked);
  const held = rigList().reduce((a, [, r]) => { accrue(r); return a + Object.values(r.store).reduce((x, y) => x + y, 0); }, 0);
  $('titleCoins').textContent = [profile.coins ? `${profile.coins} coins` : '', rigCount() ? `${rigCount()} mining rig${rigCount() > 1 ? 's' : ''} holding ${held} finds` : ''].filter(Boolean).join(' · ');
  $('newBtn').classList.toggle('hide', !saved);
  $('newBtn').textContent = 'Start over'; delete $('newBtn').dataset.armed;
  if (friends) renderFriendsBox();
}
function landOn(id, fresh) {
  if (fresh) try { localStorage.removeItem(saveKey(id)); } catch (e) { }
  applyLook(id);
  setupWorld(fresh ? null : loadSave());
}
applyLook(picked);
setupWorld(loadSave());
renderWorlds();
$('worldBtn').onclick = () => { writeSave(); if (inCamp) leaveCampMode(); if (team) leaveTeamMode(); playing = false; $('hud').classList.add('hide'); $('touch').classList.remove('on'); renderWorlds(); openPanel('title'); };
function renderFree() {
  const t = `Free roam: ${profile.free ? 'on' : 'off'}`;
  $('freeBtn').textContent = t; $('freeBtn2').textContent = t;
  $('freeBtn').classList.toggle('on', profile.free); $('freeBtn2').classList.toggle('on', profile.free);
  document.body.classList.toggle('free', profile.free);
  if (!profile.free && player) player.fly = false;
}
for (const id of ['freeBtn', 'freeBtn2']) $(id).onclick = () => {
  profile.free = !profile.free; saveProfile(); renderFree();
  toast(profile.free ? 'Free roam on: no air loss, no night creatures, and you can fly (G).' : 'Free roam off.');
};
renderFree();
function start() {
  if (inCamp) leaveCampMode();
  if (team) leaveTeamMode();
  setTimeout(renderLevel, 0);
  if (!look || look.planet.id !== picked || SAVE_KEY !== saveKey(picked)) landOn(picked, false);
  const got = accrueAll();
  if (Object.keys(got).length) setTimeout(() => banner('Welcome back!', `Your mining rigs dug ${rigSummary(got)} while you were away. Empty them to collect.`), 600);
  initAudio(); playMusic(look.planet.id);
  playing = true;
  friends.where(picked);
  $('hud').classList.remove('hide');
  $('touch').classList.add('on');
  renderHotbar(); renderGoal();
  resume();
}
$('playBtn').onclick = start;

// ---- Friends' camp: a world everyone shares
function campKit() {
  const kit = { drill: 1, sheet: 20, rock: 60, brick: 24, castle: 24, crystal: 12, ice: 12, metal: 8, lamp: 6, door: 2, window: 6, flag: 1, garden: 2 };
  for (const [k, n] of Object.entries(kit)) give(k, n, true);
}
// ---- team play: the same world for up to 3 friends, with the ship jobs split between them
function teamSize() { return team ? Math.max(1, Math.min(3, friends.team().length)) : 1; }
function myJobs() {
  if (!team) return PARTS;
  const t = friends.team(), n = Math.max(1, Math.min(3, t.length)), me = Math.max(0, t.findIndex(p => p.me));
  return PARTS.filter((p, i) => i % n === me % n);
}
function applyTeamShip(d) {
  if (!state || !team) return;
  let changed = false;
  for (const p of PARTS) if (d[p.id] && !state.fixed[p.id]) { state.fixed[p.id] = true; changed = true; toast(`Your team fitted the ${p.name}!`); }
  if (changed) { world.setStructure(shipBlocks(state.fixed)); sfx.install(); renderGoal(); writeSave(); }
}
async function enterTeamMode(code, worldId, isNew = false) {
  writeSave();
  code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (code.length < 4) { $('teamNote').textContent = 'A team code has 4 letters.'; return; }
  const me = team = { code, world: worldId };
  applyLook(worldId);
  SAVE_KEY = saveKey(`team-${code}`);
  setupWorld(loadSave());
  closePanels(false);
  const res = await friends.enterCamp({ room: `team-${code}`, coll: `team/${code}/chunks`, info: `team/${code}/info`, onInfo: (id, d) => { if (!team || team !== me) return; if (id === 'ship') applyTeamShip(d); else if (id === 'world' && d.w && d.w !== team.world) { if (team.ready) moveTeam(d.w); else team.moveTo = d.w; } }, max: 3, where: worldId });
  if (team !== me) return;
  me.ready = true;
  if (me.moveTo && res !== 'full') { moveTeam(me.moveTo); return; }
  if (res === 'full') { leaveTeamMode(); toast('That team is full (3 players).'); openPanel('title'); return; }
  if (isNew) friends.setInfo('world', { w: worldId });
  $('worldName').textContent = `${planetById(worldId).name} · team ${code}`;
  document.body.classList.add('teamon');
  initAudio(); playMusic(worldId); playing = true;
  $('hud').classList.remove('hide'); $('touch').classList.add('on');
  renderHotbar(); renderGoal(); resume();
  banner(`Team ${code}`, `Tell your friends the code ${code}. Your jobs: ${myJobs().map(p => p.name).join(', ')}. Everything is shared.`);
  G.track('camp');
}
function moveTeam(w) {
  toast(`This team plays on ${planetById(w).name}. Taking you there.`);
  const c = team.code; leaveTeamMode(); enterTeamMode(c, w);
}
function leaveTeamMode() {
  if (!team) return;
  writeSave(); friends.leaveCamp(); team = null;
  document.body.classList.remove('teamon');
  SAVE_KEY = saveKey(picked); applyLook(picked); setupWorld(loadSave());
  friends.where(picked);
}
$('teamBtn').onclick = () => { $('teamWorld').textContent = planetById(picked).name; $('teamNote').textContent = friends.connected ? '' : 'Team play needs the online version of the game (the Claude link).'; openPanel('teamPanel'); };
$('teamClose').onclick = () => { closePanels(false); openPanel('title'); };
$('teamNew').onclick = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; enterTeamMode(c, picked, true); };
$('teamJoin').onclick = () => enterTeamMode($('teamCode').value, picked);
function enterCampMode() {
  writeSave();
  inCamp = true;
  applyLook('mars');
  SAVE_KEY = saveKey('camp');
  try { localStorage.setItem(LAST_KEY, picked); } catch (e) { }
  setupWorld(loadSave());
  document.title = "Stranded: Friends' camp"; $('worldName').textContent = "Friends' camp";
  document.body.classList.add('camp');
  friends.enterCamp(); G.track('camp');
  initAudio(); playMusic('camp'); playing = true;
  $('hud').classList.remove('hide'); $('touch').classList.add('on');
  renderHotbar(); renderGoal(); resume();
  banner("Friends' camp", friends.canBuild ? 'Everything anyone builds here is saved for everyone. Press T to say hello.' : 'Build together with friends. Press T to say hello.');
}
function leaveCampMode() {
  writeSave();
  friends.leaveCamp(); inCamp = false;
  document.body.classList.remove('camp');
  SAVE_KEY = saveKey(picked); applyLook(picked); setupWorld(loadSave());
  friends.where(picked);
}
let giftTo = null;
function openGift(o) { giftTo = o; openPanel('giftPanel'); }
function renderGift() {
  $('giftTitle').textContent = `Give a gift to ${giftTo ? giftTo.name || 'your friend' : 'your friend'}`;
  const list = $('giftList'); list.innerHTML = '';
  const items = state.order.filter(k => has(k) > 0 && !ITEMS[k].tool);
  if (!items.length) list.innerHTML = '<p class="sub">Your bag is empty.</p>';
  for (const k of items) {
    const row = document.createElement('div'); row.className = 'recipe';
    row.innerHTML = `<img src="${icon(k)}" alt=""><div><div class="nm">${ITEMS[k].name} × ${has(k)}</div></div>`;
    const bs = document.createElement('div'); bs.className = 'rigbtns';
    for (const n of [1, 10]) {
      const b = document.createElement('button'); b.textContent = `Give ${n}`; b.disabled = has(k) < n;
      b.onclick = () => { if (!giftTo || has(k) < n) return; if (friends.sendGift(giftTo, k, n)) { G.track('gift'); take(k, n); sfx.coin(); toast(`You gave ${n} ${ITEMS[k].name} to ${giftTo.name || 'your friend'}.`); writeSave(); renderGift(); } else toast('Gifts need the game opened from its claude.ai link.'); };
      bs.appendChild(b);
    }
    row.appendChild(bs); list.appendChild(row);
  }
}
function renderChat() {
  $('chatList').innerHTML = '';
  for (const p of PHRASES) { const b = document.createElement('button'); b.textContent = p; b.onclick = () => { friends.chat(p); closePanels(); }; $('chatList').appendChild(b); }
}
friends = createFriends({ suit: () => profile.suit || null,
  scene, world: () => world, player: () => player, toast: (t) => toast(t),
  whereNow: () => (inCamp ? 'camp' : playing ? look.planet.id : 'title'),
  itemOk: (k) => !!ITEMS[k] && !ITEMS[k].tool && !ITEMS[k].part && !ITEMS[k].weapon && !ITEMS[k].shield && !ITEMS[k].tier,
  gotGift: (k, n, from) => { if (!inCamp) return; give(k, n, true); sfx.catch(); banner('A gift!', `${from} gave you ${n} ${ITEMS[k].name}.`); writeSave(); },
  onChat: (log) => { $('chatLog').innerHTML = log.map(l => `<div>${l.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</div>`).join(''); $('chatLog').classList.remove('hide'); clearTimeout(renderChat.t); renderChat.t = setTimeout(() => $('chatLog').classList.add('hide'), 9000); },
  onLobby: () => renderFriendsBox(),
  onTeam: () => { if (team && state) renderGoal(); },
});
async function renderFriendsBox() {
  const list = await friends.lobbyList();
  const wn = (w) => (w === 'camp' ? "in the Friends' camp" : w === 'title' ? 'on the title screen' : w === 'race' ? 'racing' : planetById(w) ? `on ${planetById(w).name}` : 'playing');
  $('friendsBox').innerHTML = !friends.connected ? '' : list.length ? `<b>Friends online (${list.length})</b>` + list.map(f => `<div>${f.name.replace(/[&<>]/g, '')} <span>${wn(f.w)}</span></div>`).join('') : '<b>Friends online</b><div><span>Nobody else right now.</span></div>';
}
pets = createPets({ scene, player: () => player, world: () => world, give: (k, n) => give(k, n, true), addCoins: (n) => { profile.coins += n; saveProfile(); renderStatus(); }, fillAir: () => { state.air = MAX_AIR; }, toast: (t) => toast(t), sfx, hidden: () => !playing || race.active });
const GOLDS = [0xffd54a, 0xfff3a0, 0xffb347, 0xffffff].map(c => new THREE.Color(c));
hooks = createHooks({ give: (k, n) => give(k, n, true), toast: (t) => toast(t), banner: (a, b) => banner(a, b), sfx, ITEMS, icon,
  burst: () => { if (!player) return; for (let k = 0; k < 3; k++) bits.burst(player.pos.x - 0.5 + (Math.random() - 0.5) * 2, player.pos.y + 0.8, player.pos.z - 0.5 + (Math.random() - 0.5) * 2, GOLDS); },
  onChange: () => { renderLevel(); } });
let wasWaiting = null;
setInterval(() => { if (!hooks || !playing) return; const w = hooks.waiting(); if (w && wasWaiting === false) toast(hooks.chestReady() ? 'A free chest is ready! Press R (Prizes) to open it.' : 'You have a free spin! Press R (Prizes).'); wasWaiting = w; renderLevel(); }, 20000);
function renderLevel() {
  if (!hooks) return;
  const h = hooks.h;
  $('lvNum').textContent = `Lv ${h.lv}`;
  $('lvFill').style.width = `${Math.min(100, h.xp / hooks.need(h.lv) * 100)}%`;
  const w = hooks.waiting();
  $('prizeBtn').classList.toggle('ready', w); $('tPrize').classList.toggle('ready', w);
}
function openPrizes() { if (launchT < 0 && !race.active) openPanel('prizePanel'); }
$('prizeBtn').onclick = openPrizes;
quests = createQuests({ toast: (t) => toast(t), banner: (a, b) => banner(a, b), give: (k, n) => give(k, n, true), sfx });

// ---- getting out of deep holes
let upTold = false;
// how far the ground around you (5 x 5 blocks) is above your feet
function groundAbove() {
  const x0 = Math.floor(player.pos.x), z0 = Math.floor(player.pos.z);
  let top = -1;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) top = Math.max(top, world.surfaceY(x0 + dx, z0 + dz));
  return top + 1 - Math.floor(player.pos.y + 0.01);
}
// ---- Find ship: a tall light over the ship, glowing arrows on the ground, and the top arrow pointing home
let findT = 0, missionT = 0;
const shipBeam = (() => {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.45, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 160, 12, 1, true), mat);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 160, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.14, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  core.position.y = glow.position.y = 80; g.add(core, glow); g.userData.mat = mat;
  g.visible = false; scene.add(g); return g;
})();
const trail = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#7dff9a'; x.strokeStyle = '#0b3a1a'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(32, 6); x.lineTo(56, 40); x.lineTo(42, 40); x.lineTo(42, 58); x.lineTo(22, 58); x.lineTo(22, 40); x.lineTo(8, 40); x.closePath(); x.fill(); x.stroke();
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const out = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mat); m.rotation.order = 'YXZ'; m.visible = false; scene.add(m); out.push(m); }
  return out;
})();
function findShip() {
  if (!playing || inCamp || race.active) return;
  findT = findT > 0 ? 0 : 60;
  if (findT) { sfx.scan(); toast(says('Follow the green arrows and the green light to your ship.') + (TOUCH ? ' Tap Find ship again to stop.' : ' Press N again to stop.')); }
  else toast('Ship finder off.');
}
function updateFinder(dt) {
  if (!playing || inCamp) { shipBeam.visible = false; trail.forEach(t => t.visible = false); return false; }
  findT = Math.max(0, findT - dt);
  const d = new THREE.Vector3(SHIP_CENTER.x - player.pos.x, 0, SHIP_CENTER.z - player.pos.z), dist = d.length();
  if (findT > 0 && dist < 6) { findT = 0; toast('You found your ship!'); sfx.cleared && sfx.cleared(); }
  // the light over the ship is on while finding it, and on its own at night when you are far away
  shipBeam.visible = findT > 0 || (adv.isDark() && dist > 20);
  shipBeam.position.set(SHIP_CENTER.x, SHIP_BASE, SHIP_CENTER.z);
  shipBeam.userData.mat.opacity = (findT > 0 ? 0.55 : 0.3) + Math.sin(clock.elapsedTime * 4) * 0.12;
  $('findBtn').classList.toggle('on', findT > 0);
  if (findT <= 0) { trail.forEach(t => t.visible = false); return false; }
  // glowing arrows on the ground leading home
  d.normalize();
  const yaw = Math.atan2(d.x, d.z), shift = (clock.elapsedTime * 2.5) % 2.5;
  trail.forEach((t, i) => {
    const s = 2 + i * 2.5 + shift;
    if (s > dist - 2) { t.visible = false; return; }
    const x = player.pos.x + d.x * s, z = player.pos.z + d.z * s;
    let y = world.surfaceY(Math.floor(x), Math.floor(z)) + 1.06;
    if (y > player.pos.y + 6 || y < player.pos.y - 8) y = Math.floor(player.pos.y) + 0.06;
    t.position.set(x, y, z); t.rotation.set(-Math.PI / 2, 0, 0); t.rotation.y = yaw + Math.PI; t.rotation.x = -Math.PI / 2;
    t.material.opacity = 1; t.visible = true;
  });
  // the top arrow points to the ship
  const box = $('compass'); box.classList.remove('hide');
  box.querySelector('span').textContent = 'Ship';
  let rel = Math.atan2(-d.x, -d.z) - player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  box.querySelector('.arrow').style.transform = `rotate(${-rel}rad)`;
  $('shipDist').textContent = `${Math.round(dist)} m`;
  return true;
}
// one short line at the top that always says what to do now
function renderMission() {
  const el = $('mission');
  if (!playing || inCamp || race.active || !state) { el.classList.add('hide'); return; }
  let txt, head;
  if (findT > 0) { head = 'Going home'; txt = 'Follow the green arrows to your ship.'; }
  else if (!state.won) {
    const n = PARTS.filter(p => state.fixed[p.id]).length;
    head = `Mission ${Math.min(4, n + 1)} of 4: fix your ship`;
    txt = stepNow().text.split(/(?<=[.!?])\s/)[0];
  } else { head = `Mission: wave ${wavesOn(look.planet.id) + 1} of ${LAST_WAVE}`; txt = nextTip().split(/(?<=[.!?])\s/)[0]; }
  el.classList.remove('hide');
  el.innerHTML = `<b>${head}</b><span>${says(txt)}</span>`;
}
$('findBtn').onclick = () => findShip();
if (TOUCH) $('findBtn').textContent = 'Find ship';
function backToTop() {
  if (!playing || groundAbove() < 2) { toast('You are already at the top.'); return; }
  // stand on the highest ground close by (your own hole is lower, so this lands you beside it)
  const x0 = Math.floor(player.pos.x), z0 = Math.floor(player.pos.z);
  let best = null;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const y = world.surfaceY(x0 + dx, z0 + dz); if (!best || y > best.y || (y === best.y && Math.abs(dx) + Math.abs(dz) < best.d)) best = { x: x0 + dx, z: z0 + dz, y, d: Math.abs(dx) + Math.abs(dz) }; }
  player.pos.x = best.x + 0.5; player.pos.z = best.z + 0.5; player.pos.y = best.y + 1.05; player.vel.y = 0;
  bits.puff(player.pos.x, player.pos.y, player.pos.z, ['#ffffff', '#ffe9a8']);
  sfx.craft(); toast('Back on top!');
}
$('upBtn').onclick = () => backToTop();
if (TOUCH) $('upBtn').textContent = '⬆ Back to the top';
// ---- extra looks: sunsets, auroras, weather, footprints, lava
function updateLooks(dt) {
  const id = look.planet.id;
  const sk = sunset.update(camera.position, adv.sunDir, !inCamp || true);
  if (sk > 0.05) { scene.fog.color.set(fogBase).lerp(new THREE.Color(0xd8704a), sk * 0.35); } 
  // Mars: tan day sky with a blue sun glow, far mountains, dust devils on sunny days
  const marsy = id === 'mars' && !race.active;
  const day = adv.daylight ?? 1, storm = !!(state.storm && state.storm.on);
  daySky.update(camera.position, adv.sunDir, day, marsy);
  farHills.update(camera.position, scene.fog.color, marsy);
  devils.update(dt, player.pos, (x, z) => world.surfaceY(x, z), marsy && !storm && playing ? Math.max(0, day * 1.4 - 0.4) : 0);
  // high clouds where there is air; plumes on Europa
  const air = look.planet.real.air;
  const cloudK = air === 'none' || race.active ? 0 : (id === 'mars' ? 0.3 : 0.5) * (0.2 + 0.8 * day) * (storm ? 0.3 : 1);
  clouds.update(dt, camera.position, cloudK, id === 'mars' ? 0xe4eeff : id === 'proxima' ? 0xffd8cc : 0xffffff);
  plumes.update(dt, (x, z) => world.surfaceY(x, z), id === 'europa' && !race.active);
  const icy = id === 'europa' || id === 'lhs1140b' || id === 'moon';
  aurora.update(dt, camera.position, icy ? (adv.isDark() ? 1 : 0.35) * (id === 'moon' ? 0.6 : 1) : 0);
  // weather comes and goes
  weatherT -= dt;
  if (weatherT <= 0) { weatherOn = !weatherOn; weatherT = weatherOn ? 70 + Math.random() * 60 : 90 + Math.random() * 120; }
  const kind = id === 'mars' ? (state.storm && state.storm.on ? 'dust' : null)
    : id === 'europa' || id === 'lhs1140b' ? 'snow' : id === 'trappist1e' ? 'rain' : id === 'proxima' ? 'dust' : null;
  weather.set(kind, kind === 'dust' && id === 'mars' ? 1 : weatherOn || params.has('weather') ? 1 : 0);
  weather.update(dt, camera.position, null);
  prints.update(dt);
  // lava hurts
  if (look.terrain.lava && playing && player.pos.y + 0.3 < lavaSea.level && !profile.free) { lavaT -= dt; if (lavaT <= 0) { lavaT = 0.6; adv.hurt(2, 'lava'); } }
}
let lavaT = 0;
// ---- seeing yourself: the camera sits just over your right shoulder, so you watch your pilot dig,
// fight and walk. Y (or View on phones) switches to looking through your eyes and back.
const eyeV = new THREE.Vector3();      // where your eyes are
const rayO = new THREE.Vector3();      // where the aim line starts (the camera)
let rayT0 = 0;                         // how far along the aim line your eyes are
let behind = params.has('eyes') ? false : settings.view !== 'eyes';
let body = null, bodySuit = null, camDist = 4.1, digPh = 0, fightT = 0, digPose = 0;
function toggleView() {
  if (!playing || race.active) return;
  behind = !behind; settings.view = behind ? 'behind' : 'eyes'; saveSettings();
  toast(behind ? `Camera over your shoulder. ${TOUCH ? 'Tap View' : 'Press Y'} to look through your eyes.` : `Looking through your eyes. ${TOUCH ? 'Tap View' : 'Press Y'} to see yourself again.`);
}
const camR = new THREE.Vector3(), camWant = new THREE.Vector3(), camTo = new THREE.Vector3();
function showingBody() { return behind && playing && launchT < 0 && !race.active; }
// move the camera back over the shoulder, never through walls
function placeCam(dt, dir) {
  rayO.copy(eyeV); rayT0 = 0;
  if (!showingBody()) return;
  const want = player.rover ? 4.6 : 4.1, side = player.rover ? 0 : 0.95;
  camR.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const head = camWant.copy(eyeV); head.y += 0.18;
  camTo.copy(camR).multiplyScalar(side).addScaledVector(dir, -want); camTo.y += 0.7;
  const len = camTo.length(); camTo.divideScalar(len);
  const wall = world.raycast(head, camTo, len + 0.4);
  const room = wall ? Math.max(0.35, wall.t - 0.3) : len;
  const goal = Math.min(len, room) / len * want;
  camDist = goal < camDist ? goal : camDist + (goal - camDist) * Math.min(1, dt * 4);   // snap in, ease out
  const f = camDist / want;
  camera.position.copy(head).addScaledVector(camTo, len * f);
  camera.updateMatrixWorld();
  rayO.copy(camera.position);
  rayT0 = Math.max(0, camWant.copy(eyeV).sub(rayO).dot(dir));
}
// the tool in your pilot's hand is made from its picture, one little cube per pixel
const handTools = {};
function handTool(id) {
  if (handTools[id] !== undefined) return handTools[id];
  handTools[id] = null;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
    x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data, px = [];
    let gi = 0, gj = 15, gk = -99;
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      if (d[(j * 16 + i) * 4 + 3] < 128) continue;
      px.push([i, j]); if (j - i > gk) { gk = j - i; gi = i; gj = j; }
    }
    const S = 0.85 / 16, mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 1.8, S, S), new THREE.MeshLambertMaterial(), px.length);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    px.forEach(([i, j], n) => {
      const u = i - gi - 1, v = j - gj + 1;
      m.makeTranslation(0, -v * S, u * S); mesh.setMatrixAt(n, m);
      const k = (j * 16 + i) * 4; col.setRGB(d[k] / 255, d[k + 1] / 255, d[k + 2] / 255, THREE.SRGBColorSpace); mesh.setColorAt(n, col);
    });
    mesh.rotation.x = Math.PI * 0.75;   // the handle runs along the arm, the head at the far end
    mesh.castShadow = true;
    const g = new THREE.Group(); g.add(mesh); g.position.set(0, -8.6 / 16, 0.02);
    handTools[id] = g;
  };
  img.src = icon(id);
  return null;
}
let handNow = null;
function bestTool() { let b = null; for (const k in state.inv) if (ITEMS[k].tool && (!b || ITEMS[k].tier > ITEMS[b].tier)) b = k; return b; }
function updateBody(dt) {
  const want = profile.suit || 'sand';
  if (!body || bodySuit !== want) { if (body) scene.remove(body); body = makePilot(want); bodySuit = want; handNow = null; body.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(body); }
  const show = showingBody() && camDist > 0.8;
  body.visible = show;
  held.visible = held.visible && !showingBody();
  if (!show) return;
  const rig = body.userData.rig;
  const sp = Math.hypot(player.vel.x, player.vel.z);
  body.position.set(player.pos.x, player.pos.y + (player.rover ? 0.45 : 0), player.pos.z);
  body.rotation.y = player.yaw + Math.PI;
  animate(body, clock.elapsedTime, player.rover ? 0 : Math.min(1, sp / 4));
  // what is in your hand: your weapon when fighting, your best digging tool the rest of the time
  const fighting = mouse.left && aim && aim.kind === 'enemy' && (!hit || aim.t < hit.t);
  if (fighting) fightT = 1.2; else fightT = Math.max(0, fightT - dt);
  const holdId = fightT > 0 && profile.gear.weapon ? profile.gear.weapon : bestTool() || profile.gear.weapon;
  const tool = holdId ? handTool(holdId) : null;
  if (tool !== handNow) { if (handNow) rig.armL.remove(handNow); if (tool) rig.armL.add(tool); handNow = tool; }
  // digging: wind up, then chop down, landing each time a chip flies off the block
  const digging = dig.on && !dig.denied && hit && BLOCKS[hit.id].breakable;
  const busy = digging || fighting || swingT > 0;
  digPose += ((busy ? 1 : 0) - digPose) * Math.min(1, dt * 12);
  if (busy) digPh = (digPh + dt / 0.34) % 1;
  else digPh = 0;
  const p = digPh, down = p < 0.55 ? 0 : (p - 0.55) / 0.45;     // slow lift, fast chop
  const lift = p < 0.55 ? Math.sin(p / 0.55 * Math.PI / 2) : 1 - down * down;
  const look = THREE.MathUtils.clamp(player.pitch, -1.2, 0.8);
  const armA = -0.9 - lift * 1.7 + look * 0.55;                    // up over the head, then down in front
  const wrist = -1.15 + digPose * (0.35 - lift * 0.5);
  rig.armL.rotation.x = rig.armL.rotation.x * (1 - digPose) + armA * digPose;
  rig.armL.rotation.z = -0.05 - digPose * 0.12;   // armL is the pilot's own right hand
  if (handNow) handNow.rotation.x = wrist;
  if (digPose > 0.01) {
    rig.armR.rotation.x = rig.armR.rotation.x * (1 - digPose) + (-0.7 + look * 0.4 - lift * 0.25) * digPose;   // the other hand helps
    rig.armR.rotation.z = 0.05 + digPose * 0.25;
  }
  // lean into the swing, and look where you aim
  body.rotation.x = 0;
    rig.head.rotation.x = -look * 0.6 + rig.head.rotation.x * 0.3;
  if (!player.onGround && !player.rover && !player.fly) { rig.legL.rotation.x = -0.5; rig.legR.rotation.x = 0.25; }
  if (rig.antTip) rig.antTip.rotation.z = Math.sin(clock.elapsedTime * 6) * 0.15 * (busy ? 1 : 0.3);
}
// ---- the Rover: hop in and drive. It climbs one block at a time and goes about three times walking speed.
let roverM = null, roverLookNow = null;
if (profile.rover) document.body.classList.add('hasrover');
function toggleRover() {
  if (!playing || race.active || panelOpen()) return;
  if (!profile.rover) { toast(state.won ? 'Make a Rover in your bag first (E).' : 'Fix your ship first. Then you can make a Rover.'); return; }
  if (player.fly) return;
  player.rover = !player.rover;
  if (player.rover) {
    if (!roverM) { roverM = makeRover(profile.roverLook || 'sun'); roverLookNow = profile.roverLook || 'sun'; scene.add(roverM); }
    roverM.visible = true; sfx.craft();
    toast(TOUCH ? 'Driving! Push the pad up to go, left and right to turn. Tap Drive to get out.' : 'Driving! W to go, S to back up, A and D to turn. V to get out.');
    G.track('drive');
  } else { if (roverM) roverM.visible = false; toast('You hopped out of the Rover.'); }
}
function updateRover(dt) {
  if (roverM && roverLookNow !== (profile.roverLook || 'sun')) { scene.remove(roverM); roverM = makeRover(profile.roverLook || 'sun'); roverLookNow = profile.roverLook || 'sun'; scene.add(roverM); roverM.visible = false; }
  if (!roverM) return;
  if (!player.rover || !playing || race.active) { roverM.visible = false; if (!playing || race.active) player.rover = false; return; }
  roverM.visible = true;
  roverM.position.set(player.pos.x, player.pos.y, player.pos.z);
  roverM.rotation.y = player.yaw;
  const sp = Math.hypot(player.vel.x, player.vel.z);
  for (const w of roverM.userData.rig.wheels) w.rotation.x -= sp * dt * 2.6;
}
// ---- Guided start: a few short steps for a brand-new player
const GUIDE = [
  { text: () => (TOUCH ? 'Drag on the right side of the screen to look around.' : 'Move the mouse to look around. Click the game first if it does not move.'), done: (g) => g.looked > 1.5 },
  { text: () => (TOUCH ? 'Use the round pad on the left to walk.' : 'Walk with W, A, S and D.'), done: (g) => g.walked > 4 },
  { text: () => (TOUCH ? 'Tap Jump to hop up a block.' : 'Press Space to jump.'), done: (g) => g.jumped },
  { text: () => (TOUCH ? 'Aim at a grey rock block and hold Dig.' : 'Aim at a grey rock block and hold the left mouse button to dig it.'), done: () => state.stats.mined > 0 },
  { text: () => (TOUCH ? 'Tap Bag (top right) to see what you have and what you can make.' : 'Press E to open your bag. It shows what you have and what you can make.'), done: (g) => g.bag },
  { text: () => (TOUCH ? 'Pick a block at the bottom and tap Use to place it.' : 'Pick a block with 1 to 9 and right click to place it.'), done: () => state.stats.placed > 0 },
];
const guide = { looked: 0, walked: 0, jumped: false, bag: false, last: null, yaw: 0 };
function updateGuide(dt, ev) {
  const step = profile.guide || 0;
  const box = $('guide');
  if (step >= GUIDE.length || state.won || inCamp || !playing) { box.classList.add('hide'); return; }
  if (Math.abs(player.yaw - guide.yaw) > 0.01) guide.looked += Math.abs(player.yaw - guide.yaw);
  guide.yaw = player.yaw;
  if (guide.last) guide.walked += Math.hypot(player.pos.x - guide.last.x, player.pos.z - guide.last.z);
  guide.last = { x: player.pos.x, z: player.pos.z };
  if (ev && ev.jumped) guide.jumped = true;
  if (!$('bag').classList.contains('hide')) guide.bag = true;
  box.classList.remove('hide');
  box.innerHTML = `<small>Getting started ${step + 1} of ${GUIDE.length}</small><div>${GUIDE[step].text()}</div>`;
  if (GUIDE[step].done(guide)) {
    profile.guide = step + 1; profile.coins += 10; saveProfile(); sfx.coin();
    if (profile.guide >= GUIDE.length) { profile.coins += 40; saveProfile(); banner('You know the basics!', '+100 coins in all. Now follow the goal on the left to fix your ship.'); }
  }
}
// ---- music: each world has its own feel
const MOODS = { mars: 'warm', moon: 'calm', europa: 'ice', proxima: 'warm', trappist1e: 'calm', lhs1140b: 'dark', camp: 'calm', race: 'race' };
let moodNow = null;
function playMusic(where) { applySettings(); const m = MOODS[where] || 'calm'; if (m === moodNow) { startMusic(); return; } moodNow = m; setMood(m); restartMusic(); }
// ---- settings
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { } }
function useGlow() { return settings.quality !== 'low' && !race.active; }
function applySettings() {
  setVolume(settings.sound); setMusic(settings.music);
  const q = QUALITY[settings.quality];
  if (!params.get('r')) RENDER_R = q.r;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.px)); renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(window.innerWidth, window.innerHeight); }
  scene.fog.near = RENDER_R * CS * 0.35; scene.fog.far = RENDER_R * CS - 4;
}
// ---- for trying the game out: open every world and give the best gear
function unlockAll() {
  profile.testAll = true;
  for (const id of WORLD_ORDER) profile.visited[id] = true;
  profile.ship = { tank: 2, engine: 3 };
  profile.gear.weapon = 'sunblade'; profile.gear.shield = 'shadowarmor';
  profile.rover = true; profile.scanner = Math.max(1, profile.scanner || 0);
  profile.coins += 5000; document.body.classList.add('hasrover');
  saveProfile();
  if (state && !state.won) { state.fixed = { patch: true, engine: true, fueltank: true, computer: true, launch: false }; state.won = true; state.arrived = true; world.setStructure(shipBlocks(state.fixed)); }
  give('fuelcell', 12, true); give('gem', 5, true); give('scale', 3, true);
  renderWorlds(); renderGoal(); renderStatus(); renderHotbar(); writeSave();
  banner('Everything unlocked!', 'All six worlds, the best sword and armour, the Rover, 5,000 coins and 12 fuel cells. Fly anywhere from the ship\'s star map, or pick a world on the title screen.');
}
function jumpWave(n) {
  if (!state.won) unlockAll();
  profile.waves[look.planet.id] = Math.max(0, Math.min(LAST_WAVE - 1, n));
  saveProfile(); renderGoal();
  toast(`Next wave here is ${profile.waves[look.planet.id] + 1}. Start it at the Wave beacon by the ship.`);
}
function renderSettings() {
  const row = (label, html) => `<div class="setrow"><span>${label}</span>${html}</div>`;
  const pct = (k) => `<input type="range" min="0" max="100" value="${Math.round(settings[k] / (k === 'sound' ? 0.7 : 1) * 100)}" data-k="${k}">`;
  $('setBody').innerHTML = row('Sound effects', pct('sound')) + row('Music', pct('music'))
    + row('Picture', '<div>' + ['low', 'normal', 'high'].map(q => `<button class="${settings.quality === q ? 'on' : ''}" data-q="${q}">${{ low: 'Fast', normal: 'Normal', high: 'Far view' }[q]}</button>`).join('') + '</div>')
    + row(TOUCH ? 'Look speed' : 'Mouse speed', `<input type="range" min="30" max="250" value="${Math.round(settings.mouse * 100)}" data-k="mouse">`)
    + `<h3 class="testh">Try everything</h3><p class="sub">For testing: opens all six worlds, fixes your ship and gives the best gear.</p>`
    + row('Unlock', `<div><button data-t="all">${profile.testAll ? 'Unlocked ✔ (give again)' : 'Unlock everything'}</button></div>`)
    + row('Jump to wave', `<div>${[10, 20, 30, 40, 49].map(n => `<button data-w="${n}">${n === 49 ? 'Dragon (50)' : n + 1}</button>`).join('')}</div>`);
  $('setBody').querySelectorAll('input').forEach(i => i.oninput = () => { const k = i.dataset.k, v = +i.value / 100; settings[k] = k === 'sound' ? v * 0.7 : v; applySettings(); saveSettings(); });
  $('setBody').querySelectorAll('button[data-q]').forEach(b => b.onclick = () => { settings.quality = b.dataset.q; applySettings(); saveSettings(); renderSettings(); });
  $('setBody').querySelector('button[data-t]').onclick = () => { unlockAll(); renderSettings(); };
  $('setBody').querySelectorAll('button[data-w]').forEach(b => b.onclick = () => { if (!playing) { toast('Land on a world first, then jump to a wave.'); return; } jumpWave(+b.dataset.w); closePanels(); });
}
$('setBtn').onclick = () => { closePanels(false); openPanel('setPanel'); };
$('setBtn2').onclick = () => openPanel('setPanel');
applySettings();
$('campBtn').onclick = () => { closePanels(false); enterCampMode(); };
$('newBtn').onclick = () => {
  if ($('newBtn').dataset.armed) { landOn(picked, true); start(); return; }
  $('newBtn').dataset.armed = '1'; $('newBtn').textContent = 'Click again to wipe your world';
};
if (FILM) frame(); else requestAnimationFrame(frame);

// hooks for automated testing and screenshots
window.__game = {
  get world() { return world; }, get player() { return player; }, get state() { return state; },
  THREE, scene, camera, renderer, give, make: (out) => make(RECIPES.find(r => r.out === out)), install, launch, landAgain, openPanel, closePanels: () => closePanels(false),
  start: () => { playing = true; $('hud').classList.remove('hide'); $('touch').classList.add('on'); for (const p of panels) $(p).classList.add('hide'); renderHotbar(); renderGoal(); },
  pending: () => updateChunks(50), landOn, get look() { return look; },
  hit: () => hit, mouse, keys, tch, TOUCH, dig, useAction, renderGoal, get launchT() { return launchT; },
  adv, race, friends, enterCampMode, leaveCampMode, get inCamp() { return inCamp; }, rigs: rigsMod, get profile() { return profile; }, travel, flyTo, openSupply, get aim() { return aim; }, renderStatus, get quests() { return quests; }, get pets() { return pets; }, get team() { return team; }, frame, stepNow, findNear, canMake, RECIPES, ITEMS, PARTS, nearShip, SHIP_CENTER, SHIP_BASE, get playing() { return playing; }, get hooks() { return hooks; }, enterTeamMode, leaveTeamMode, myJobs, makeRover, unlockAll, jumpWave, toggleView, get behind() { return behind; }, get digPh() { return digPh; },
};
