// All block art is drawn here, pixel by pixel, from our own palette.
import * as THREE from 'three';
import { hashf as hash } from './noise.js';
import { COLOURS, COLOUR, FAMILIES, shade } from './colours.js';

const MARS_PAL = {
  redTop: ['#c4562a', '#b84d25', '#d0663a', '#a94422', '#d9764a'],
  redSide: ['#9e3f20', '#8f381c', '#ab4a28', '#7e3218'],
  dust: ['#8a3a1e', '#7a331b', '#954426', '#6e2d18'],
  stone: ['#4a3632', '#3e2d2a', '#56403a', '#33262a'],
  rock: ['#958a84', '#877b75', '#a39892', '#7a6e68'],
  oreBase: ['#3d2d33', '#352730', '#45343a'],
  crystal: ['#b05cff', '#d39bff', '#8a3cf0', '#f0d0ff'],
  iron: ['#d9d6cf', '#aeb3b8', '#8b939b', '#e3a26a'],
  ice: ['#bfe3f5', '#a0d0ec', '#d8f0fb', '#8cc0e0'],
  deep: ['#1d1416', '#241a1b', '#181012'],
  metal: ['#9a9ea3', '#8d9196', '#a7abb0'],
  ship: ['#d8d4cc', '#cfcac1', '#e0ddd6'],
  dark: ['#2c2f36', '#33373f', '#262930'],
  dustLine: '#62291a', stoneFleck: '#6a5048', rockEdge: '#5e524d', deepVein: '#4a1612',
};
let PAL = { ...MARS_PAL };
const pick = (arr, a) => arr[Math.floor(a * arr.length) % arr.length];
const crystalAt = (i, j) => {
  const cx = [4, 11, 7, 12, 3], cy = [4, 6, 11, 12, 10];
  for (let k = 0; k < 5; k++) {
    const dx = Math.abs(i - cx[k]), dy = Math.abs(j - cy[k]);
    if (dx + dy <= 1 + (k % 2)) return dx + dy === 0 ? 3 : (dx === 0 ? 1 : 0);
  }
  return -1;
};

// each fn(i, j) -> colour string, or [colour, glowColour]
const TILES = {
  redTop: (i, j) => pick(PAL.redTop, hash(i, j, 1)),
  redSide: (i, j) => (j < 4 + Math.floor(hash(i, 0, 2) * 3) ? pick(PAL.redTop, hash(i, j, 4)) : pick(PAL.redSide, hash(i, j, 5))),
  dust: (i, j) => ((j % 5 === 0 && hash(i, j, 9) > 0.4) ? PAL.dustLine : pick(PAL.dust, hash(i, j, 6))),
  stone: (i, j) => (hash(i, j, 7) > 0.93 ? PAL.stoneFleck : pick(PAL.stone, hash(Math.floor(i / 2), Math.floor(j / 2), 8))),
  rock: (i, j) => {
    const e = i === 0 || j === 0 || i === 15 || j === 15;
    return e ? PAL.rockEdge : pick(PAL.rock, hash(Math.floor(i / 3), Math.floor(j / 3), 10));
  },
  crystal: (i, j) => {
    const c = crystalAt(i, j);
    return c >= 0 ? [PAL.crystal[c], c === 3 ? '#ffffff' : '#a050ff'] : pick(PAL.oreBase, hash(i, j, 11));
  },
  iron: (i, j) => {
    // silver flecks in clumps of 2-3 pixels on dark stone
    const cl = [[3, 3], [10, 2], [6, 8], [12, 10], [2, 12], [9, 13]];
    for (const [cx, cy] of cl) {
      const dx = i - cx, dy = j - cy;
      if ((dx === 0 || dx === 1) && (dy === 0 || dy === 1) && !(dx === 1 && dy === 1 && hash(cx, cy, 3) > 0.5))
        return dx === 0 && dy === 0 ? PAL.iron[0] : (hash(i, j, 12) > 0.75 ? PAL.iron[3] : pick(PAL.iron.slice(1, 3), hash(i, j, 13)));
    }
    return pick(PAL.stone, hash(Math.floor(i / 2), Math.floor(j / 2), 14));
  },
  ice: (i, j) => {
    const crack = (i === j + 3 && i > 4 && i < 12) || (i + j === 19 && j < 9) || (j === 11 && i > 1 && i < 6);
    if (crack) return '#8fb6cc';
    return (hash(i, j, 15) > 0.9 ? '#ffffff' : pick(PAL.ice, hash(Math.floor(i / 2), Math.floor(j / 3), 16)));
  },
  deep: (i, j) => {
    const v = (Math.abs(Math.sin(i * 0.9 + j * 0.4) * 3 + j * 0.5 - 8) < 0.7);
    return v ? PAL.deepVein : pick(PAL.deep, hash(i, j, 17));
  },
  gold: (i, j) => {
    // fat yellow nuggets in dark stone
    const cl = [[4, 3, 2], [11, 5, 1], [6, 10, 2], [12, 12, 1], [2, 13, 1]];
    for (const [cx, cy, r] of cl) {
      const d = Math.abs(i - cx) + Math.abs(j - cy);
      if (d <= r) return d === 0 ? ['#fff4b0', '#806010'] : (i < cx || j < cy) ? '#f2c94a' : '#c09020';
    }
    return pick(PAL.stone, hash(Math.floor(i / 2), Math.floor(j / 2), 30));
  },
  glass: (i, j) => {
    // orange glass beads in grey dust
    const b = hash(Math.floor(i / 2), Math.floor(j / 2), 31);
    if (b > 0.55) return (i + j) % 2 === 0 && b > 0.8 ? ['#ffd08a', '#5a2a00'] : (b > 0.7 ? '#e88a2a' : '#c06a1a');
    return pick(PAL.dust, hash(i, j, 32));
  },
  salt: (i, j) => {
    // red-brown salty ice with darker streaks
    const st = Math.abs(((i * 0.7 + j * 1.3) % 6) - 3) < 0.7;
    if (st) return hash(i, j, 33) > 0.5 ? '#7a3a22' : '#8e4a2a';
    return pick(['#b6704a', '#a8643f', '#c27e58', '#9c5a38', '#d09070'], hash(Math.floor(i / 2), j, 34));
  },
  metal: (i, j) => {
    if (i === 0 || j === 0) return '#b9bdc2';
    if (i === 15 || j === 15) return '#5f6368';
    if ((i === 2 || i === 13) && (j === 2 || j === 13)) return '#6a6e73';
    if (j === 8) return '#7d8186';
    return pick(PAL.metal, hash(i, Math.floor(j / 4), 18));
  },
  lamp: (i, j) => {
    const e = i === 0 || j === 0 || i === 15 || j === 15 || i === 1 || j === 1 || i === 14 || j === 14;
    if (e) return (i + j) % 3 === 0 ? '#3a2d2a' : '#5e4b46';
    const d = Math.max(Math.abs(i - 7.5), Math.abs(j - 7.5));
    const c = d < 2 ? '#fff0ff' : d < 4 ? '#e2b4ff' : d < 5.5 ? '#b05cff' : '#7a3cc8';
    return [c, d < 4 ? '#ffffff' : '#c080ff'];
  },
  brick: (i, j) => {
    const row = Math.floor(j / 4), off = row % 2 ? 4 : 0;
    if (j % 4 === 3 || (i + off) % 8 === 7) return '#2a1f1e';
    return pick(PAL.stone, hash(Math.floor((i + off) / 8), row, 19) * 0.7 + hash(i, j, 20) * 0.3);
  },
  ship: (i, j) => {
    if (j === 9 || j === 10) return j === 9 ? '#e08a2c' : '#c4701f';        // orange stripe
    if (i === 0 || j === 0) return '#ece9e2';
    if (i === 15 || j === 15) return '#9c978e';
    if ((i === 3 || i === 12) && (j === 3)) return '#8a857c';
    return pick(PAL.ship, hash(i, j, 21));
  },
  shipDark: (i, j) => {
    if (i === 0 || j === 0) return '#454a54';
    if (i === 15 || j === 15) return '#1a1c21';
    if (j === 7 && i > 2 && i < 13) return '#1f2228';
    return pick(PAL.dark, hash(i, j, 22));
  },
  glassOff: (i, j) => {
    if (i === 0 || j === 0 || i === 15 || j === 15) return '#454a54';
    if (i - j > 4 && i - j < 7) return '#3c4f5c';
    return pick(['#16222b', '#1a2731', '#132029'], hash(i, j, 23));
  },
  glassOn: (i, j) => {
    if (i === 0 || j === 0 || i === 15 || j === 15) return '#454a54';
    if (i - j > 4 && i - j < 7) return ['#c8fbff', '#c8fbff'];
    const c = pick(['#3fc6d8', '#35b4c6', '#4ad2e2'], hash(i, j, 23));
    return [c, '#2a9fb0'];
  },
  broken: (i, j) => {
    // scorched hull with a jagged hole and glowing wires
    const hole = Math.abs(i - 8) + Math.abs(j - 7) * 0.8 + hash(i, j, 24) * 3 < 7;
    if (hole) {
      if ((i === 6 && j > 4 && j < 11) || (j === 9 && i > 7 && i < 12)) return ['#ff9a3a', '#ff7a1a'];
      if (hash(i, j, 25) > 0.92) return ['#ffd27a', '#ffb040'];
      return pick(['#0e0b0b', '#16110f', '#1c1513'], hash(i, j, 26));
    }
    return pick(['#4a4440', '#3a3431', '#5a5450', '#2c2724', '#6a645e'], hash(i, j, 27));
  },
  engine: (i, j) => {
    const d = Math.hypot(i - 7.5, j - 7.5);
    if (d > 7.2) return '#2c2f36';
    if (d > 6) return '#5c6068';
    if (d > 4.8) return '#3a3e45';
    return pick(['#0b0b0d', '#141416', '#1c1a1a'], hash(i, j, 28));
  },
  engineOn: (i, j) => {
    const d = Math.hypot(i - 7.5, j - 7.5);
    if (d > 7.2) return '#2c2f36';
    if (d > 6) return '#5c6068';
    if (d > 4.8) return ['#ff7a2a', '#ff5a10'];
    return d < 2.5 ? ['#fff4d0', '#fff4d0'] : ['#ffb84a', '#ffa030'];
  },
  tank: (i, j) => {
    if (i === 0 || j === 0 || i === 15 || j === 15) return '#2c2f36';
    if (j > 3 && j < 12 && (i === 3 || i === 12)) return '#9aa0a8';
    if (j > 4 && j < 11 && i > 4 && i < 11) return j > 7 ? ['#6aff9a', '#30d060'] : '#1a3a26';
    return pick(['#7d838c', '#737980', '#868c94'], hash(i, j, 29));
  },
  // ---- things you use ----
  beacon: (i, j) => {
    if (i === 0 || i === 15) return '#1a1c21';
    if (j < 2 || j > 13) return '#454a54';
    if (i > 5 && i < 10 && j > 3 && j < 12) return j % 2 ? ['#ff6a3a', '#ff4a10'] : ['#ffb070', '#ff8a30'];
    return pick(PAL.dark, hash(i, j, 40));
  },
  beaconTop: (i, j) => {
    const d = Math.hypot(i - 7.5, j - 7.5);
    if (d < 2.5) return ['#fff0c0', '#ffffff'];
    if (d < 4.5) return ['#ff7a3a', '#ff5a10'];
    if (d < 5.5) return '#1a1c21';
    return pick(PAL.dark, hash(i, j, 41));
  },
  forge: (i, j) => {
    if (j < 2) return '#5e524d';
    if (j > 7 && j < 13 && i > 3 && i < 12) return j > 10 ? ['#ffb040', '#ff8a10'] : ['#ff6a2a', '#e04a10'];
    if ((j + (Math.floor(i / 4) % 2) * 2) % 4 === 3) return '#2a1f1e';
    return pick(PAL.stone, hash(Math.floor(i / 4), Math.floor(j / 4), 42));
  },
  forgeTop: (i, j) => {
    if (i < 2 || j < 2 || i > 13 || j > 13) return '#5e524d';
    if (i > 4 && i < 11 && j > 4 && j < 11) return '#9a9ea3';
    return pick(['#3a3e45', '#2c2f36'], hash(i, j, 43));
  },
  box: (i, j) => {
    if (i === 0 || i === 15 || j === 0 || j === 15) return '#3a3e45';
    if (j === 7 || j === 8) return i > 5 && i < 10 ? '#f0c24a' : '#5c6068';
    return pick(['#7d838c', '#737980', '#868c94'], hash(Math.floor(i / 3), j, 44));
  },
  boxTop: (i, j) => {
    if (i === 0 || i === 15 || j === 0 || j === 15) return '#3a3e45';
    return (i + j) % 5 === 0 ? '#5c6068' : pick(['#7d838c', '#868c94'], hash(i, j, 45));
  },
  bed: (i, j) => {
    if (j > 11) return pick(PAL.dark, hash(i, j, 46));
    if (j > 7) return pick(['#4e9690', '#468a84', '#56a29c'], hash(i, j, 47));
    if (i < 5) return '#e8e2d4';
    return pick(['#4e9690', '#468a84'], hash(i, j, 48));
  },
  bedTop: (i, j) => {
    if (i < 5) return j > 1 && j < 14 ? '#f4eee0' : '#d8d0c0';
    return (j === 0 || j === 15) ? '#2e6a6a' : pick(['#4e9690', '#468a84', '#56a29c'], hash(i, j, 49));
  },
  air: (i, j) => {
    if (i === 0 || i === 15 || j === 0 || j === 15) return '#454a54';
    const d = Math.hypot(i - 7.5, j - 7.5);
    if (d < 5 && (Math.floor(Math.atan2(j - 7.5, i - 7.5) * 2) % 2 === 0)) return d < 1.5 ? '#2c2f36' : '#aeb3b8';
    if (d < 5.6) return ['#7de8ff', '#40c0e0'];
    return pick(['#d8d4cc', '#cfcac1'], hash(i, j, 50));
  },
  airTop: (i, j) => {
    if (i === 0 || i === 15 || j === 0 || j === 15) return '#454a54';
    return (i % 3 === 1 && j % 3 === 1) ? '#1a1c21' : pick(['#d8d4cc', '#cfcac1'], hash(i, j, 51));
  },
  supply: (i, j) => {
    if (i < 2 || i > 13 || j < 2 || j > 13) return pick(['#5a4a3a', '#4a3c30'], hash(i, j, 52));
    if (i - j === 0 || i + j === 15) return '#3a2e24';
    if (j === 7 || j === 8) return ['#e8b030', '#c08010'];
    return pick(['#8a6a4a', '#7a5c40', '#94744e'], hash(i, Math.floor(j / 3), 53));
  },
  castle: (i, j) => {
    const row = Math.floor(j / 5), off = row % 2 ? 4 : 0;
    if (j % 5 === 4 || (i + off) % 8 === 7) return '#3a3432';
    return pick(['#a8a29a', '#9a948c', '#b4aea6', '#8e8880'], hash(Math.floor((i + off) / 8), row, 60) * 0.6 + hash(i, j, 61) * 0.4);
  },
  goldblock: (i, j) => {
    if (i === 0 || j === 0) return '#fff0a0';
    if (i === 15 || j === 15) return '#a07010';
    return pick(['#f0c24a', '#e8b030', '#f6d060'], hash(i, j, 62));
  },
  spikes: (i, j) => (j < 6 ? (i % 4 === 1 || i % 4 === 2 ? (j < 2 && i % 4 === 1 ? '#e8eef4' : '#aeb3b8') : '#2c2f36') : pick(PAL.dark, hash(i, j, 63))),
  spikesTop: (i, j) => {
    const a = i % 4, b = j % 4;
    if (a === 1 && b === 1) return '#ffffff';
    if ((a === 1 || a === 2) && (b === 1 || b === 2)) return '#aeb3b8';
    return '#2c2f36';
  },
  rig: (i, j) => {
    if (i === 0 || i === 15) return '#1a1c21';
    if (j < 3) return '#f0c24a';
    if (i > 5 && i < 10 && j > 4) return j % 3 === 0 ? '#5c6068' : ['#d9d6cf', '#5a5a5a'];
    if (j % 4 === 0) return '#2c2f36';
    return pick(['#e08a2c', '#c4701f', '#d07a26'], hash(i, j, 64));
  },
  rigTop: (i, j) => {
    const d = Math.hypot(i - 7.5, j - 7.5);
    if (d < 2) return ['#6aff9a', '#30d060'];
    if (d < 5) return (Math.floor(Math.atan2(j - 7.5, i - 7.5) * 3) % 2 === 0) ? '#aeb3b8' : '#5c6068';
    return (i + j) % 4 === 0 ? '#2c2f36' : '#e08a2c';
  },
  // ---- home
  flag: (i, j) => {
    if (i === 2 || i === 3) return j === 0 ? '#ffd060' : (i === 2 ? '#aeb3b8' : '#7d8186');
    if (j >= 1 && j <= 8 && i >= 4 && i <= 14 - Math.floor(Math.abs(j - 4.5) / 2)) {
      if (Math.abs(i - 9) + Math.abs(j - 4.5) < 2.2) return ['#fff4d0', '#ffd060'];
      return (j + Math.floor(i / 3)) % 5 === 0 ? '#c04020' : '#e0602c';
    }
    if (j === 15 && i < 7) return '#3a3e45';
    return null;
  },
  flagTop: (i, j) => ((i === 2 || i === 3) && (j === 7 || j === 8) ? '#ffd060' : null),
  door: (i, j) => {
    if (i === 0 || i === 15 || j === 0) return '#3a3e45';
    if (i === 1 || i === 14) return '#5c6068';
    const d = Math.hypot(i - 7.5, j - 5);
    if (d < 2.6) return d < 1.2 ? ['#d8f4ff', '#80c0ff'] : '#7ab8d8';
    if (d < 3.3) return '#3a3e45';
    if (i === 11 && (j === 9 || j === 10)) return '#f0c24a';
    if (j === 13) return '#5c6068';
    return pick(['#8d6a4e', '#82614a', '#977456'], hash(i, Math.floor(j / 4), 71));
  },
  doorOpen: (i, j) => (i === 0 || i === 15 || j === 0 ? '#3a3e45' : i === 1 || i === 14 ? '#5c6068' : null),
  doorOpenTop: (i, j) => (i < 2 || i > 13 || j < 2 || j > 13 ? '#5c6068' : null),
  window: (i, j) => {
    if (i < 2 || j < 2 || i > 13 || j > 13) return (i + j) % 7 === 0 ? '#2c2f36' : '#5c6068';
    if (i === 7 || i === 8 || j === 7 || j === 8) return '#7d8186';
    if ((i + j === 8 || i + j === 9) && i > 2 && i < 7) return '#ffffff';
    if ((i + j === 22) && i > 9) return '#e8fbff';
    return null;
  },
  skywall: (i, j) => (j > 13 ? '#3a5a78' : pick(['#7ab8e0', '#72b0d8', '#82c0e8'], hash(Math.floor(i / 2), Math.floor(j / 2), 72))),
  leafwall: (i, j) => (j > 13 ? '#2e5a34' : pick(['#6aa86a', '#62a062', '#72b072'], hash(Math.floor(i / 2), Math.floor(j / 2), 73))),
  sunwall: (i, j) => (j > 13 ? '#8a6a20' : pick(['#f0cc5a', '#e8c452', '#f8d462'], hash(Math.floor(i / 2), Math.floor(j / 2), 74))),
  berrywall: (i, j) => (j > 13 ? '#6a1e2a' : pick(['#c04a5a', '#b84252', '#c85262'], hash(Math.floor(i / 2), Math.floor(j / 2), 75))),
  garden: (i, j) => {
    if (j < 3) return pick(['#3a2418', '#2e1c12', '#46301e'], hash(i, j, 76));
    if (j === 3 || j === 15) return '#3a3e45';
    return pick(['#7d838c', '#737980', '#868c94'], hash(Math.floor(i / 4), j, 77));
  },
  gardenTop: (i, j) => {
    if (i === 0 || j === 0 || i === 15 || j === 15) return '#5c6068';
    const sp = [[4, 4], [11, 5], [7, 10], [3, 12], [12, 12]];
    for (const [a, b] of sp) if ((i === a && (j === b || j === b - 1)) || (i === a + 1 && j === b - 1)) return '#6ad06a';
    return pick(['#3a2418', '#2e1c12', '#46301e'], hash(i, j, 78));
  },
  gardenRipe: (i, j) => {
    if (i === 0 || j === 0 || i === 15 || j === 15) return '#5c6068';
    const fr = [[4, 4], [11, 5], [7, 10], [3, 12], [12, 12]];
    for (const [a, b] of fr) { const d = Math.hypot(i - a, j - b); if (d < 1.3) return ['#ff7ac0', '#ff4aa0']; }
    return pick(['#4aa04a', '#3e943e', '#58b058', '#2e7a34'], hash(i, j, 79));
  },
  gardenRipeSide: (i, j) => {
    if (j < 3) return (i % 5 === 2 && j === 1) ? ['#ff7ac0', '#ff4aa0'] : pick(['#4aa04a', '#3e943e', '#58b058'], hash(i, j, 80));
    if (j === 3 || j === 15) return '#3a3e45';
    return pick(['#7d838c', '#737980', '#868c94'], hash(Math.floor(i / 4), j, 77));
  },
  trophy: (i, j) => {
    if (j > 11) return j === 12 ? '#ffd060' : pick(['#5c4a3a', '#4e3e30'], hash(i, j, 81));
    // a dragon head, side on
    const head = (i >= 3 && i <= 11 && j >= 4 && j <= 10) || (i >= 10 && i <= 13 && j >= 6 && j <= 9);
    const horn = (i === 4 && j >= 1 && j <= 3) || (i === 5 && j === 2) || (i === 7 && j >= 2 && j <= 3);
    if (i === 8 && j === 6) return ['#fff4a0', '#ffd060'];
    if (head) return j === 10 || i === 13 ? '#2a6a50' : pick(['#3a9a70', '#348a64'], hash(i, j, 82));
    if (horn) return '#e8e2d4';
    return pick(['#2c2a30', '#34323a'], hash(i, j, 83));
  },
  trophyTop: (i, j) => (i === 0 || j === 0 || i === 15 || j === 15 ? '#ffd060' : pick(['#5c4a3a', '#4e3e30'], hash(i, j, 84))),
  supplyTop: (i, j) => {
    if (i < 2 || i > 13 || j < 2 || j > 13) return '#4a3c30';
    return j % 4 === 0 ? '#5a4a3a' : pick(['#8a6a4a', '#7a5c40'], hash(i, j, 54));
  },
};


// ---- building blocks
Object.assign(TILES, {
  none: () => null,
  castleTop: (i, j) => {
    if (j < 6 && (i % 8 >= 4)) return null;                 // the gaps on top
    const row = Math.floor(j / 5), off = row % 2 ? 4 : 0;
    if (j % 5 === 4 || (i + off) % 8 === 7 || (j < 6 && (i % 8 === 0 || i % 8 === 3)) || j === 0) return '#3a3432';
    return pick(['#a8a29a', '#9a948c', '#b4aea6', '#8e8880'], hash(Math.floor((i + off) / 8), row, 60) * 0.6 + hash(i, j, 61) * 0.4);
  },
  pillar: (i, j) => {
    if (j < 2 || j > 13) return j === 1 || j === 14 ? '#ffd060' : '#e8e2d4';
    if (i < 2 || i > 13) return '#c8c2b4';
    return i % 3 === 0 ? '#d4cec0' : pick(['#f4f0e8', '#ece6dc'], hash(i, j, 90));
  },
  pillarTop: (i, j) => (i === 0 || j === 0 || i === 15 || j === 15 ? '#ffd060' : pick(['#f4f0e8', '#ece6dc'], hash(i, j, 91))),
  rail: (i, j) => (j < 2 ? '#aeb3b8' : j === 2 ? '#5c6068' : (i % 5 === 1 || i % 5 === 2) && j < 15 ? (i % 5 === 1 ? '#aeb3b8' : '#7d8186') : j === 15 ? '#5c6068' : null),
  railTop: (i, j) => (i < 2 || i > 13 || j < 2 || j > 13 ? '#aeb3b8' : null),
  gate: (i, j) => {
    if (j < 2) return '#3a3e45';
    if (i % 4 === 1 || i % 4 === 2) return i % 4 === 1 ? '#5c6068' : '#3a3e45';
    if (j % 5 === 3) return '#5c6068';
    if (j === 15 && i % 4 === 0) return '#aeb3b8';
    return null;
  },
  gateOpen: (i, j) => (j < 3 ? (j === 2 && i % 4 === 1 ? '#aeb3b8' : '#3a3e45') : i === 0 || i === 15 ? '#5c6068' : null),
  floorCheck: (i, j) => ((Math.floor(i / 4) + Math.floor(j / 4)) % 2 ? pick(['#26262e', '#2e2e36'], hash(i, j, 92)) : pick(['#eeeef4', '#e2e2ea'], hash(i, j, 93))),
  floorSky: (i, j) => {
    if (i % 8 === 0 || j % 8 === 0) return '#c8d8e8';
    const a = Math.abs((i % 8) - 4) + Math.abs((j % 8) - 4);
    return a < 2 ? '#2a6ab0' : a < 3 ? '#ffffff' : pick(['#4a90d8', '#4488d0'], hash(i, j, 94));
  },
});
// ---- real Mars ground: dark sand dunes, layered hills, volcano rock, frost, rare colours
const band = (j, seed) => Math.floor((j + Math.floor(hash(0, Math.floor(j / 3), seed) * 2)) / 3);
Object.assign(TILES, {
  // dark grey-blue sand, like the dark dunes in Gale crater, with wind ripples
  darkSand: (i, j) => ((j + Math.floor(i / 5)) % 5 === 0 && hash(i, j, 120) > 0.25 ? '#7d7a88' : pick(['#5b5865', '#504e5a', '#66636f', '#56535f', '#6e6b78'], hash(i, j, 121))),
  darkSandSide: (i, j) => (j < 3 ? pick(['#5b5865', '#504e5a'], hash(i, j, 122)) : pick(['#47454f', '#403e48', '#4d4b56'], hash(i, j, 123))),
  // tan rock in thin layers, with white veins (the light layered rock of Mount Sharp)
  tanRock: (i, j) => {
    if (hash(i, j, 119) > 0.965) return '#f4ecdc';
    const b = band(j, 124);
    return pick([['#c99a62', '#bf8f58', '#d1a26a'], ['#b8864e', '#ad7c46', '#c08e56'], ['#d8ad74', '#cfa36a', '#e0b67e'], ['#a97a48', '#9f7040', '#b28250']][b % 4], hash(Math.floor(i / 2), j, 125));
  },
  // pale cream clay
  paleClay: (i, j) => {
    const h = hash(i, j, 126);
    if (h > 0.95) return '#b89a72';
    if (h < 0.03) return '#fffaf0';
    return pick(['#e3cda4', '#d8be92', '#ecd9b4', '#cdb184', '#f0e2c4'], hash(Math.floor(i / 3), Math.floor(j / 2), 128) * 0.6 + hash(i, j, 127) * 0.4);
  },
  // muted purple rock with little grey round pebbles
  purpleRock: (i, j) => {
    const pb = [[3, 4], [10, 2], [7, 9], [13, 12], [2, 13]];
    for (const [cx, cy] of pb) { const d = Math.abs(i - cx) + Math.abs(j - cy); if (d === 0) return '#8d8d96'; if (d === 1) return '#5c5c66'; }
    return pick(['#7c5a70', '#6e4e63', '#88667c', '#614458', '#946f86'], hash(Math.floor(i / 2), band(j, 129), 130) * 0.7 + hash(i, j, 131) * 0.3);
  },
  // black volcano rock full of tiny holes, dusted red here and there
  blackRock: (i, j) => {
    const h = hash(i, j, 132);
    if (h > 0.9) return '#141217';
    if (hash(Math.floor(i / 4), Math.floor(j / 4), 133) > 0.8 && h > 0.4) return pick(['#6e3a26', '#7c4430'], h);
    return pick(['#2e2b31', '#37333a', '#28252b', '#403b42'], hash(Math.floor(i / 2), Math.floor(j / 2), 134));
  },
  // white frost (frozen air and water) on high, cold ground
  frost: (i, j) => (hash(i, j, 135) > 0.94 ? ['#ffffff', '#3a3a44'] : pick(['#f1edf0', '#e4e0e8', '#f8f6f8', '#dad5e0', '#ece4e4'], hash(Math.floor(i / 2), Math.floor(j / 2), 136))),
  frostSide: (i, j) => (j < 3 + Math.floor(hash(i, 0, 137) * 2) ? pick(['#f1edf0', '#e4e0e8'], hash(i, j, 138)) : j % 6 === 5 ? '#8a6a60' : pick(['#d6ccd0', '#cbc0c6', '#ddd4d8'], hash(i, j, 139))),
  // bright yellow crystals in pale rock (real: Curiosity cracked open a yellow rock)
  yellowStone: (i, j) => {
    const cl = [[4, 4, 2], [11, 3, 1], [8, 10, 2], [2, 12, 1], [13, 12, 1]];
    for (const [cx, cy, r] of cl) { const d = Math.abs(i - cx) + Math.abs(j - cy); if (d <= r) return d === 0 ? ['#fff6a0', '#6a5a00'] : (i <= cx ? '#f5d838' : '#d8b41e'); }
    return pick(['#e3cda4', '#d8be92', '#ecd9b4'], hash(i, j, 140));
  },
  // old rover tracks pressed into red dirt: two rows of tread marks with little holes
  tracks: (i, j) => {
    const inTread = (i >= 2 && i <= 6) || (i >= 9 && i <= 13);
    if (inTread && j % 4 < 2) return (j % 8 < 2 && (i === 4 || i === 11)) ? PAL.redTop[0] : pick(['#7e3218', '#8f381c'], hash(i, j, 143));
    if (inTread) return pick(['#a94422', '#9e3f20'], hash(i, j, 144));
    return pick(PAL.redTop, hash(i, j, 145));
  },
  // sand on a sea shore
  sand: (i, j) => (hash(i, j, 146) > 0.93 ? '#8a7a5a' : pick(['#cdb27a', '#c4a870', '#d6bc86', '#bba068', '#dcc48e'], hash(i, j, 147))),
  // olive green rock (real: green crystals in Jezero crater)
  greenStone: (i, j) => (hash(i, j, 141) > 0.9 ? '#2c3018' : pick(['#6f7a3e', '#5f6a34', '#7f8a4a', '#55602e', '#8a9454'], hash(Math.floor(i / 2), Math.floor(j / 2), 142))),
});
// colourful blocks glow a little so they stay bright under any sky
const glow = (fn) => (i, j) => { const v = fn(i, j); return v == null || Array.isArray(v) ? v : [v, shade(v, -0.72)]; };
for (const [c, , hex] of COLOURS) {
  const L = shade(hex, 0.3), D = shade(hex, -0.25), DD = shade(hex, -0.5);
  TILES['wall_' + c] = (i, j) => (j > 13 ? DD : pick([hex, shade(hex, 0.06), shade(hex, -0.06)], hash(Math.floor(i / 2), Math.floor(j / 2), 95)));
  TILES['bricks_' + c] = (i, j) => {
    const row = Math.floor(j / 4), off = row % 2 ? 4 : 0;
    if (j % 4 === 3 || (i + off) % 8 === 7) return '#e8e0d4';
    if (j % 4 === 0 && (i + off) % 8 < 6) return L;
    return pick([hex, D, hex], hash(Math.floor((i + off) / 8), row, 96) * 0.5 + hash(i, j, 97) * 0.5);
  };
  TILES['roof_' + c] = (i, j) => {
    const row = Math.floor(j / 4), off = row % 2 ? 2 : 0, u = (i + off) % 4, v = j % 4;
    if (v === 3 || (v === 2 && (u === 0 || u === 3))) return DD;
    if (v === 0 && u > 0 && u < 3) return L;
    return pick([hex, D], hash(Math.floor((i + off) / 4), row, 98));
  };
  TILES['glass_' + c] = (i, j) => {
    if (i < 1 || j < 1 || i > 14 || j > 14) return '#3a3e45';
    if ((i + j) % 6 === 0 || (i - j + 16) % 6 === 0) return D;
    if ((i + j) % 6 === 1 && hash(i, j, 99) > 0.4) return L;
    return null;
  };
  TILES['lamp_' + c] = (i, j) => {
    const e = i < 2 || j < 2 || i > 13 || j > 13;
    if (e) return (i + j) % 3 === 0 ? '#3a2d2a' : '#5e4b46';
    const d = Math.max(Math.abs(i - 7.5), Math.abs(j - 7.5));
    const col = d < 2 ? '#ffffff' : d < 4 ? L : d < 5.5 ? hex : D;
    return [col, d < 4 ? '#ffffff' : hex];
  };
  TILES['banner_' + c] = (i, j) => {
    if (j === 0) return '#aeb3b8';
    if (i < 3 || i > 12) return null;
    if (j > 12 && Math.abs(i - 7.5) < (j - 12) * 1.5) return null;   // the notch at the bottom
    if (i === 3 || i === 12) return D;
    const d = Math.abs(i - 7.5) + Math.abs(j - 6.5);
    if (d < 2.5) return c === 'sun' ? '#ffffff' : '#ffd060';            // a star in the middle
    if (j === 2 || j === 11) return '#ffd060';
    return pick([hex, shade(hex, 0.08)], hash(i, j, 100));
  };
  for (const f of ['wall_', 'bricks_', 'roof_', 'glass_', 'banner_']) TILES[f + c] = glow(TILES[f + c]);
}

export const TILE_NAMES = Object.keys(TILES);
export const ATLAS_COLS = 8;
const ROWS = Math.ceil(TILE_NAMES.length / ATLAS_COLS);
export const ATLAS_ROWS = ROWS;
export const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((n, k) => [n, k]));

let _atlas = null;
// Call with a world palette to repaint all blocks for that world.
export function buildAtlas(pal) {
  if (_atlas && !pal) return _atlas;
  if (pal) PAL = { ...MARS_PAL, ...pal };
  const W = ATLAS_COLS * 16, H = ROWS * 16;
  const c = _atlas ? _atlas.canvas : document.createElement('canvas'); c.width = W; c.height = H;
  const e = _atlas ? _atlas.emissiveCanvas : document.createElement('canvas'); e.width = W; e.height = H;
  const cx = c.getContext('2d'), ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const tileCanvases = _atlas ? _atlas.tileCanvases : {};
  TILE_NAMES.forEach((name, k) => {
    const ox = (k % ATLAS_COLS) * 16, oy = Math.floor(k / ATLAS_COLS) * 16;
    const tc = tileCanvases[name] || document.createElement('canvas'); tc.width = tc.height = 16; const tx = tc.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const v = TILES[name](i, j);
      if (v == null) { cx.clearRect(ox + i, oy + j, 1, 1); tx.clearRect(i, j, 1, 1); continue; }
      const col = Array.isArray(v) ? v[0] : v;
      cx.fillStyle = col; cx.fillRect(ox + i, oy + j, 1, 1);
      tx.fillStyle = col; tx.fillRect(i, j, 1, 1);
      if (Array.isArray(v)) { ex.fillStyle = v[1]; ex.fillRect(ox + i, oy + j, 1, 1); }
    }
    tileCanvases[name] = tc;
  });
  const mk = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  if (_atlas) { _atlas.map.needsUpdate = true; _atlas.emissiveMap.needsUpdate = true; return _atlas; }
  _atlas = { map: mk(c), emissiveMap: mk(e), tileCanvases, canvas: c, emissiveCanvas: e };
  return _atlas;
}

// UV rect for a tile (v=1 is the top of the canvas)
export function tileUV(name) {
  const k = TILE_INDEX[name];
  const tx = k % ATLAS_COLS, ty = Math.floor(k / ATLAS_COLS);
  const eu = 0.02 / (ATLAS_COLS * 16), ev = 0.02 / (ROWS * 16);
  return [tx / ATLAS_COLS + eu, 1 - (ty + 1) / ROWS + ev, (tx + 1) / ATLAS_COLS - eu, 1 - ty / ROWS - ev];
}

// Crack overlay frames for mining progress
export function buildCracks() {
  const frames = [];
  for (let s = 0; s < 6; s++) {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const walkers = 2 + s * 2;
    for (let w = 0; w < walkers; w++) {
      let px = 8, py = 8;
      const steps = 3 + s * 2;
      const dir = r() * Math.PI * 2;
      for (let k = 0; k < steps; k++) {
        px += Math.round(Math.cos(dir + (r() - 0.5) * 1.6)); py += Math.round(Math.sin(dir + (r() - 0.5) * 1.6));
        if (px < 0 || py < 0 || px > 15 || py > 15) break;
        x.fillStyle = k % 3 === 0 ? 'rgba(10,4,2,0.85)' : 'rgba(20,8,4,0.7)';
        x.fillRect(px, py, 1, 1);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    frames.push(t);
  }
  return frames;
}

// Isometric icon for a block, as a data URL (for the UI)
// a flat picture of one tile (for see-through blocks like windows and flags)
export function flatIcon(tile) {
  const { tileCanvases } = buildAtlas();
  const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.drawImage(tileCanvases[tile], 0, 0, 48, 48);
  return c.toDataURL();
}
export function blockIcon(tiles) {
  const { tileCanvases } = buildAtlas();
  const T = typeof tiles === 'string' ? { top: tiles, side: tiles } : tiles;
  const S = 48, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const top = tileCanvases[T.top], side = tileCanvases[T.side];
  const h = S / 4; // iso: top rhombus
  // top
  x.save(); x.setTransform(1.5, 0.75, -1.5, 0.75, S / 2, 0); x.drawImage(top, 0, 0); x.restore();
  // left
  x.save(); x.setTransform(1.5, 0.75, 0, 1.5, 0, h); x.drawImage(side, 0, 0);
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 0, 16, 16); x.restore();
  // right
  x.save(); x.setTransform(1.5, -0.75, 0, 1.5, S / 2, h * 2); x.drawImage(side, 0, 0);
  x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(0, 0, 16, 16); x.restore();
  return c.toDataURL();
}

// Small hand-drawn icons for tools, sheets and ship parts
export function itemIcon(id) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
  const R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const handle = () => { for (let k = 0; k < 9; k++) R(k % 3 === 0 ? '#5a3a24' : '#7a5234', 4 + k, 11 - k, 2, 2); };
  switch (id) {
    case 'pickaxe':
      handle();
      R('#6b5650', 7, 1, 7, 2); R('#4f3f3b', 5, 2, 3, 2); R('#4f3f3b', 13, 2, 2, 3); R('#7a645d', 8, 1, 4, 1); R('#3f322f', 4, 3, 2, 2); R('#3f322f', 14, 4, 1, 2);
      break;
    case 'drill': case 'fastdrill': {
      const body = id === 'drill' ? ['#8b939b', '#aeb3b8', '#5f6368'] : ['#8a3cf0', '#d39bff', '#5a1aa0'];
      R('#2c2f36', 1, 6, 5, 6); R('#454a54', 1, 6, 5, 1); R('#1a1c21', 2, 12, 3, 3);
      R(body[0], 6, 6, 4, 5); R(body[1], 6, 6, 4, 1); R(body[2], 6, 10, 4, 1);
      R(body[0], 10, 7, 2, 3); R(body[1], 12, 8, 3, 1); R(body[2], 15, 8, 1, 1);
      R('#e08a2c', 2, 8, 3, 1);
      break; }
    case 'sheet':
      R('#5f6368', 2, 4, 13, 9); R('#a7abb0', 1, 3, 13, 9); R('#c9cdd2', 1, 3, 13, 1); R('#7d8186', 1, 7, 13, 1);
      R('#6a6e73', 3, 5, 1, 1); R('#6a6e73', 11, 5, 1, 1); R('#6a6e73', 3, 10, 1, 1); R('#6a6e73', 11, 10, 1, 1);
      break;
    case 'patch':
      R('#9c978e', 2, 2, 12, 12); R('#d8d4cc', 2, 2, 11, 11); R('#e08a2c', 2, 8, 11, 2);
      for (let k = 0; k < 4; k++) { R('#6a645e', 3 + k * 3, 3, 1, 1); R('#6a645e', 3 + k * 3, 11, 1, 1); }
      break;
    case 'engine':
      R('#2c2f36', 3, 1, 10, 4); R('#454a54', 3, 1, 10, 1);
      R('#5c6068', 2, 5, 12, 2); R('#3a3e45', 1, 7, 14, 7); R('#0b0b0d', 3, 8, 10, 5); R('#5c6068', 1, 13, 14, 1);
      R('#ff9a3a', 6, 10, 4, 2);
      break;
    case 'fueltank':
      R('#7d838c', 4, 2, 8, 12); R('#9aa0a8', 4, 2, 8, 1); R('#5c6068', 4, 13, 8, 1); R('#5c6068', 6, 1, 4, 1);
      R('#1a3a26', 6, 5, 4, 6); R('#6aff9a', 6, 8, 4, 3);
      break;
    case 'computer':
      R('#2c2f36', 2, 2, 12, 10); R('#3fc6d8', 3, 3, 10, 7); R('#c8fbff', 4, 4, 3, 1);
      R('#16222b', 5, 6, 1, 1); R('#16222b', 9, 5, 1, 1); R('#16222b', 7, 8, 1, 1); R('#e08a2c', 9, 7, 2, 2);
      R('#454a54', 6, 12, 4, 1); R('#2c2f36', 4, 13, 8, 2);
      break;
    case 'fuelcell':
      R('#454a54', 5, 1, 6, 2); R('#7d838c', 4, 3, 8, 12); R('#9aa0a8', 4, 3, 8, 1);
      R('#1a3a26', 6, 5, 4, 8); R('#6aff9a', 6, 8, 4, 5); R('#c8ffd8', 7, 9, 1, 2);
      break;
    case 'gem':
      R('#2a8a8a', 5, 3, 6, 1); R('#3ee0d0', 4, 4, 8, 3); R('#a8fff4', 5, 4, 2, 2); R('#2ab0b0', 4, 7, 8, 2); R('#1a7070', 6, 9, 4, 2); R('#145a5a', 7, 11, 2, 2);
      break;
    case 'scale':
      R('#5a1a10', 3, 3, 10, 10); R('#c4562a', 4, 3, 8, 8); R('#ff9a50', 5, 4, 3, 3); R('#8a3a22', 4, 11, 8, 2); R('#3a1008', 6, 13, 4, 1);
      break;
    case 'scanner':
      R('#2c2f36', 3, 2, 10, 13); R('#454a54', 3, 2, 10, 1); R('#0d1a14', 4, 3, 8, 7);
      R('#30d060', 7, 5, 2, 2); R('#6aff9a', 5, 4, 1, 1); R('#6aff9a', 10, 8, 1, 1); R('#1f6a3a', 4, 6, 8, 1);
      R('#e08a2c', 5, 11, 2, 2); R('#aeb3b8', 9, 11, 2, 2);
      break;
    case 'rover':
      R('#c4562a', 2, 6, 12, 1); R('#e8b23c', 2, 7, 12, 3); R('#fff0a0', 2, 7, 1, 1); R('#5a5e66', 9, 3, 1, 4); R('#5a5e66', 12, 3, 1, 4); R('#c4562a', 9, 3, 4, 1);
      for (const x of [2, 6, 10]) { R('#1e1e22', x, 10, 3, 3); R('#8a8e96', x + 1, 11, 1, 1); }
      break;
    case 'club':
      handle(); R('#877b75', 9, 1, 6, 6); R('#a39892', 10, 1, 4, 2); R('#5e524d', 9, 6, 6, 1);
      break;
    case 'sword': case 'csword': case 'blade': {
      const c = id === 'sword' ? ['#d9d6cf', '#8b939b'] : id === 'csword' ? ['#e2b4ff', '#8a3cf0'] : ['#fff4b0', '#40d8c8'];
      for (let k = 0; k < 9; k++) { R(c[0], 6 + k, 9 - k, 2, 1); R(c[1], 6 + k, 10 - k, 2, 1); }
      R('#5a3a24', 2, 12, 3, 3); R('#e08a2c', 4, 9, 1, 5); R('#e08a2c', 3, 10, 4, 1); R('#3a2414', 1, 14, 2, 2);
      if (id === 'blade') { R('#ffffff', 13, 1, 1, 1); R('#ffffff', 9, 3, 1, 1); }
      break; }
    case 'spear':
      for (let k = 0; k < 11; k++) R(k % 3 ? '#7a5234' : '#5a3a24', 2 + k, 13 - k, 1, 1);
      R('#f0c24a', 11, 2, 3, 3); R('#ffe890', 13, 1, 2, 1); R('#c08010', 11, 4, 2, 1);
      break;
    case 'ishield': case 'cshield': case 'gshield': case 'sshield': {
      const c = { ishield: ['#aeb3b8', '#6a7078'], cshield: ['#b05cff', '#5a1aa0'], gshield: ['#f0c24a', '#a07010'], sshield: ['#3ee0d0', '#1a7070'] }[id];
      R(c[1], 3, 2, 10, 9); R(c[0], 4, 3, 8, 7); R(c[1], 4, 11, 8, 2); R(c[1], 6, 13, 4, 1); R(c[0], 5, 11, 6, 1);
      R('#ffffff', 7, 5, 2, 3); R('#e08a2c', 7, 4, 2, 1);
      break; }
    case 'shard': case 'pearl': case 'ember': case 'sunheart': case 'shadow': {
      const c = { shard: ['#7de8ff', '#e8fbff', '#2a8aa8'], pearl: ['#e8e2f4', '#ffffff', '#9a90b8'], ember: ['#ff6a2a', '#ffd060', '#8a1a08'], sunheart: ['#ffd23a', '#fff8d0', '#e06a10'], shadow: ['#5a2a8a', '#c890ff', '#1a0a2a'] }[id];
      if (id === 'pearl') { R(c[2], 4, 4, 8, 8); R(c[0], 4, 3, 8, 8); R(c[0], 3, 4, 10, 6); R(c[1], 5, 4, 3, 2); }
      else if (id === 'sunheart') { for (let k = 0; k < 8; k++) { R(c[2], 7, k < 4 ? 0 : 13, 2, 3); R(c[2], k < 4 ? 0 : 13, 7, 3, 2); } R(c[0], 3, 3, 10, 10); R(c[1], 5, 5, 4, 4); R(c[2], 3, 12, 10, 1); }
      else { R(c[2], 7, 1, 2, 2); R(c[0], 5, 3, 6, 3); R(c[0], 3, 6, 10, 3); R(c[0], 5, 9, 6, 3); R(c[2], 7, 12, 2, 3); R(c[1], 6, 4, 2, 3); R(c[2], 9, 7, 3, 2); }
      R('#ffffff', 12, 2, 1, 1); R('#ffffff', 2, 12, 1, 1);
      break; }
    case 'embersword': case 'sunblade': {
      const c = id === 'embersword' ? ['#ffb060', '#e04a10'] : ['#fff4b0', '#ffc23a'];
      for (let k = 0; k < 10; k++) { R(c[0], 5 + k, 10 - k, 2, 1); R(c[1], 5 + k, 11 - k, 2, 1); }
      R('#3a1a10', 1, 13, 3, 3); R(id === 'sunblade' ? '#ffffff' : '#ffd060', 3, 9, 1, 6); R(id === 'sunblade' ? '#ffffff' : '#ffd060', 2, 11, 5, 1);
      R('#ffffff', 14, 0, 1, 1); R('#ffffff', 10, 2, 1, 1);
      break; }
    case 'moonhammer':
      for (let k = 0; k < 9; k++) R(k % 3 ? '#8a90a8' : '#5a6078', 3 + k, 13 - k, 2, 1);
      R('#9a90b8', 8, 1, 7, 6); R('#e8e2f4', 9, 1, 5, 2); R('#5a5070', 8, 6, 7, 1); R('#7de8ff', 11, 3, 1, 1);
      break;
    case 'stararmor': case 'shadowarmor': {
      const c = id === 'stararmor' ? ['#7de8ff', '#2a8aa8', '#e8fbff'] : ['#5a2a8a', '#1a0a2a', '#c890ff'];
      R(c[1], 2, 2, 12, 12); R(c[0], 3, 2, 10, 11); R(c[1], 6, 2, 4, 3); R(c[2], 7, 6, 2, 4); R(c[2], 5, 8, 6, 1); R(c[1], 3, 13, 10, 1);
      break; }
    case 'fruit':
      R('#2e7a34', 7, 1, 2, 3); R('#6ad06a', 9, 1, 3, 2);
      R('#c03a80', 3, 5, 10, 9); R('#ff7ac0', 4, 4, 8, 9); R('#ffb0dc', 5, 5, 3, 2); R('#a02a68', 4, 12, 8, 1);
      break;
    // the antimatter parts
    case 'magnet':
      R('#3a3e45', 2, 3, 12, 10); R('#c43a3a', 2, 3, 5, 10); R('#3a6ad8', 9, 3, 5, 10); R('#0b0b0d', 5, 6, 6, 7); R('#e8e8f0', 2, 3, 12, 1);
      break;
    case 'coldcore':
      R('#5a90b8', 4, 1, 8, 14); R('#bfe3f5', 5, 2, 6, 12); R('#ffffff', 6, 3, 2, 4); R('#c27e58', 5, 10, 6, 3); R('#3a4656', 4, 1, 8, 1); R('#3a4656', 4, 14, 8, 1);
      break;
    case 'lens':
      R('#8a6a3a', 2, 2, 12, 12); R('#ffd08a', 3, 3, 10, 10); R('#fff4d8', 4, 4, 4, 3); R('#e88a2a', 9, 9, 3, 3);
      break;
    case 'heatshield':
      R('#1a1618', 2, 2, 12, 12); R('#2e2b31', 3, 3, 10, 10); R('#f2c94a', 2, 2, 12, 1); R('#f2c94a', 2, 13, 12, 1); R('#ff6a2a', 6, 6, 4, 4);
      break;
    case 'powercrystal':
      R('#7a3cc8', 6, 1, 4, 14); R('#b05cff', 4, 4, 8, 8); R('#f0d0ff', 6, 5, 2, 4); R('#ffffff', 7, 2, 1, 2);
      break;
    case 'trap':
      R('#5c6068', 1, 3, 14, 10); R('#aeb3b8', 1, 3, 14, 1); R('#0b0b0d', 4, 5, 8, 6); R('#3affd0', 6, 7, 4, 2); R('#c43a3a', 1, 6, 2, 4); R('#3a6ad8', 13, 6, 2, 4);
      break;
    case 'antimatter':
      R('#2a2e34', 4, 0, 8, 16); R('#aeb3b8', 4, 0, 8, 2); R('#aeb3b8', 4, 14, 8, 2); R('#ff3aa0', 5, 3, 6, 10); R('#ffd0f0', 7, 5, 2, 6); R('#ffffff', 7, 7, 2, 2);
      break;
    default:
      R('#ff00ff', 0, 0, 16, 16);
  }
  return c.toDataURL();
}
