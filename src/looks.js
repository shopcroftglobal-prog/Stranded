// How each world is drawn and shaped. Real numbers live in planets.js;
// worldParams() turns them into terrain, ore and light settings.
import { planetById, starColor, starSizeDeg } from './planets.js';

// Block colours per world (our own palettes). Keys match textures.js.
const PALS = {
  mars: {},   // the original Mars palette in textures.js
  moon: {
    redTop: ['#9a9894', '#8e8c88', '#a6a4a0', '#84827e', '#b0aeaa'],
    redSide: ['#7c7a76', '#72706c', '#86847f', '#68665f'],
    dust: ['#6e6c68', '#64625e', '#787672', '#5a5854'], dustLine: '#4e4c48',
    stone: ['#3b3a3e', '#333236', '#45444a', '#2c2b30'], stoneFleck: '#5c5b63',
    rock: ['#c2beb6', '#b3afa7', '#cfcbc3', '#a5a199'], rockEdge: '#85817a',
    oreBase: ['#302f34', '#2a292e', '#38373c'],
    deep: ['#121214', '#18181b', '#0e0e10'], deepVein: '#2a2a36',
  },
  europa: {
    redTop: ['#ece7dd', '#e0dacd', '#f4f0e8', '#d6cfc1', '#faf8f2'],
    redSide: ['#d2c9b8', '#c6bdab', '#ddd5c6', '#bbb19e'],
    dust: ['#c9d3da', '#bcc7cf', '#d5dee4', '#b0bcc6'], dustLine: '#a3b0bb',
    stone: ['#4a4f58', '#40454e', '#555a63', '#383c45'], stoneFleck: '#6d7480',
    rock: ['#9a9590', '#8c8782', '#a8a39e', '#7e7974'], rockEdge: '#615d59',
    oreBase: ['#3b3f48', '#353941', '#434751'],
    deep: ['#10141c', '#151a23', '#0c1018'], deepVein: '#1e3a4a',
  },
  proxima: {
    redTop: ['#6a4442', '#5e3c3b', '#77504c', '#523534', '#83594f'],
    redSide: ['#4e3332', '#452d2d', '#583a38', '#3c2727'],
    dust: ['#3f2a2b', '#372526', '#473030', '#2f2021'], dustLine: '#2a1b1c',
    stone: ['#2e2628', '#272022', '#363032', '#211b1d'], stoneFleck: '#4a3e40',
    rock: ['#958a80', '#877c72', '#a2978d', '#7a6f65'], rockEdge: '#5a5048',
    oreBase: ['#2e2427', '#282023', '#36292d'],
    deep: ['#120c0d', '#181112', '#0e0909'], deepVein: '#3a1a10',
  },
  trappist1e: {
    redTop: ['#4f5148', '#474940', '#595b51', '#3f4139', '#64665b'],
    redSide: ['#3e403a', '#373933', '#464841', '#30322d'],
    dust: ['#6e6a5c', '#646052', '#787466', '#5a5649'], dustLine: '#4c493e',
    stone: ['#2f3236', '#292c30', '#373a3f', '#23262a'], stoneFleck: '#50555c',
    rock: ['#8f9089', '#82837c', '#9c9d96', '#75766f'], rockEdge: '#56574f',
    oreBase: ['#2a2d31', '#25282c', '#313438'],
    deep: ['#0e1012', '#131517', '#0a0c0e'], deepVein: '#1a2a2a',
  },
  lhs1140b: {
    redTop: ['#eef3f6', '#e2e9ee', '#f7fafc', '#d8e1e8', '#ffffff'],
    redSide: ['#c3ced6', '#b6c2cb', '#ced8df', '#a9b6c0'],
    dust: ['#aab8c4', '#9eadb9', '#b6c3ce', '#92a1ae'], dustLine: '#8796a3',
    stone: ['#495059', '#40474f', '#535a63', '#383e46'], stoneFleck: '#6a727c',
    rock: ['#9ba0a6', '#8d9298', '#a8adb3', '#80858b'], rockEdge: '#61666c',
    oreBase: ['#3d434b', '#373d44', '#454b53'],
    deep: ['#0f1216', '#14181d', '#0b0e12'], deepVein: '#22303e',
  },
};

// Sky and light. sun: null = colour from the star's temperature.
const SKIES = {
  mars: {
    top: 0x020106, horizon: 0x4a2216, fog: 0x4a2216, stars: 1, sun: 0xffe2c4, sunI: 2.6,
    hemi: [0x8a6a8a, 0x3a1a10, 0.9], amb: [0xc08870, 0.45], exposure: 1.05, bodies: ['marsMoons'],
  },
  moon: {
    top: 0x000000, horizon: 0x07070a, fog: 0x07070a, stars: 1, sun: 0xfff6ea, sunI: 3.2,
    hemi: [0x8a8f9a, 0x2a2a2c, 0.55], amb: [0x9aa0b0, 0.3], exposure: 1.0, bodies: ['earth'],
  },
  europa: {
    top: 0x010208, horizon: 0x0b0f1a, fog: 0x0b0f1a, stars: 1, sun: 0xfff6ea, sunI: 2.0,
    hemi: [0xc9a27a, 0x1c2230, 0.75], amb: [0x8a9ab8, 0.35], exposure: 1.1, bodies: ['jupiter', 'io'],
  },
  proxima: {
    top: 0x0c0510, horizon: 0x5e2a30, fog: 0x4e2228, stars: 0.7, sun: null, sunI: 2.6,
    hemi: [0x9a5a6a, 0x2a1214, 0.85], amb: [0xc07a70, 0.45], exposure: 1.1, bodies: ['alphaCen'],
  },
  trappist1e: {
    top: 0x1a0910, horizon: 0x8a4020, fog: 0x6e3420, stars: 0.35, sun: null, sunI: 2.4,
    hemi: [0xb06a4a, 0x2a1a14, 0.95], amb: [0xd08a60, 0.5], exposure: 1.15, bodies: ['neighbours'],
  },
  lhs1140b: {
    top: 0x6a5a7c, horizon: 0xe2ae92, fog: 0xcf9f88, stars: 0, sun: null, sunI: 2.2,
    hemi: [0xf4dccc, 0x7a8a9a, 1.0], amb: [0xf0e2da, 0.6], exposure: 0.95, bodies: [],
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function worldParams(id) {
  const p = planetById(id), r = p.real;
  const g = r.gravity;
  // Mountains are lower on heavy worlds and taller on light ones.
  const lift = clamp(Math.sqrt(0.38 / g), 0.45, 1.6);
  const t = {
    amp: 9 * lift, ridge: 7 * lift, freq: 0.011,
    cell: 56, craterChance: 0.58, craterMin: 6, craterVar: 9, craterDepth: 0.6, crystalCrater: 0.28,
    floorIce: 1, cracks: false, sea: 0, iceShell: 0, rocks: 1, glassRims: false, snowCaps: false,
  };
  if (r.air === 'none') { t.craterChance = 0.85; t.cell = 40; t.craterVar = 12; }   // no air: nothing wears craters away
  if (r.air === 'thick') { t.craterChance = 0.25; t.craterDepth = 0.4; }
  if (id === 'moon') { t.glassRims = true; t.floorIce = 0.6; }
  if (id === 'europa') { t.craterChance = 0.18; t.cracks = true; t.iceShell = 7; t.amp *= 0.35; t.ridge *= 0.4; t.rocks = 0.5; }
  if (id === 'proxima') { t.freq = 0.016; t.amp *= 1.35; t.ridge *= 1.4; t.sea = 28; t.liquid = true; t.lava = true; }
  if (r.water && id === 'trappist1e') { t.sea = 29; t.rocks = 0.6; t.liquid = true; }
  if (id === 'lhs1140b') { t.sea = 29; t.snowCaps = true; t.rocks = 0.6; t.liquid = true; }

  // Ores follow density (iron, gold) and cold (ice). Thresholds: lower = more common.
  const ores = {
    iron: clamp(0.52 + (3.93 - r.density) * 0.045, 0.42, 0.6),
    ice: clamp(0.66 + (r.tempC + 65) * 0.004 - (r.water ? 0.1 : 0), 0.5, 0.82),
    crystal: id === 'moon' ? 0.7 : 0.64,
    gold: p.rare.some(x => x.ore === 'gold') ? clamp(0.8 - (r.density - 5) * 0.08, 0.68, 0.8) : 2,
    salt: p.rare.some(x => x.ore === 'salt'),
    glass: p.rare.some(x => x.ore === 'glass'),
  };

  const sky = { ...SKIES[id] };
  const sc = starColor(r.star.teff);
  if (sky.sun == null) sky.sun = (Math.round(sc[0] * 255) << 16) | (Math.round((0.15 + 0.85 * sc[1]) * 255) << 8) | Math.round((0.2 + 0.8 * sc[2]) * 255);
  sky.starRGB = sc;
  sky.sunDeg = starSizeDeg(p);

  return { planet: p, terrain: t, ores, sky, pal: PALS[id] || {}, gravity: g };
}
