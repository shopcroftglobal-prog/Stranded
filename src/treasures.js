// Treasures: things to collect on every world, each based on something real.
// Find them by digging, in old supply boxes, or as a sparkle lying on the ground.
// Finish a world's set to win a new suit.
import { B } from './blocks.js';

// where: 'dig' (with the blocks that can hide it), 'box' (old supply boxes), 'ground' (a sparkle on the ground)
// shape + colours draw its little picture
export const TREASURES = {
  mars: { suit: 'redplanet', list: [
    { id: 'm_iron', name: 'Space iron rock', where: 'dig', blocks: [B.IRON, B.STONE], shape: 'rock', c: ['#8a8f96', '#5a5f66', '#c8ccd2'], fact: 'A real one: Curiosity found iron rocks on Mars that fell from space.' },
    { id: 'm_berries', name: 'Blueberry pebbles', where: 'dig', blocks: [B.REDDIRT, B.DUST, B.DARKSAND, B.TRACKS], shape: 'pebbles', c: ['#5a6a8a', '#3a4660', '#8aa0c8'], fact: 'Opportunity found tiny round grey pebbles everywhere. Scientists called them blueberries.' },
    { id: 'm_wheel', name: 'Old rover wheel', where: 'box', shape: 'wheel', c: ['#b8bcc2', '#5a5e66', '#e0e4ea'], fact: 'Rover wheels get dented and torn by sharp Mars rocks.' },
    { id: 'm_yellow', name: 'Yellow crystal', where: 'dig', blocks: [B.YELLOWSTONE, B.PALECLAY, B.TANROCK], shape: 'gem', c: ['#f5d838', '#c09a10', '#fff6a0'], fact: 'In 2024 Curiosity drove over a rock and cracked it open. Inside were bright yellow crystals.' },
    { id: 'm_patch', name: 'Mission patch', where: 'ground', shape: 'patch', c: ['#c4562a', '#2a3a5a', '#f0c24a'], fact: 'Every space mission has its own sewn badge.' },
    { id: 'm_frost', name: 'Frost flower', where: 'dig', blocks: [B.FROST, B.ICE], shape: 'flake', c: ['#ffffff', '#b8d4f0', '#e8f4ff'], fact: 'On cold Mars mornings, thin frost covers the ground and melts away by noon.' },
  ] },
  moon: { suit: 'moondust', list: [
    { id: 'n_bead', name: 'Orange glass bead', where: 'dig', blocks: [B.GLASS, B.DUST], shape: 'bead', c: ['#e88a2a', '#a85a10', '#ffd08a'], fact: 'Apollo 17 astronauts found orange soil made of tiny glass beads from old volcanoes.' },
    { id: 'n_rock', name: 'Moon rock', where: 'ground', shape: 'rock', c: ['#a8a49c', '#6e6c68', '#d0ccc4'], fact: 'Astronauts brought 382 kg of Moon rocks back to Earth.' },
    { id: 'n_flag', name: 'Old flag', where: 'box', shape: 'flag', c: ['#e8e4dc', '#3a3f46', '#c43a3a'], fact: 'The flags left on the Moon have been bleached white by the Sun.' },
    { id: 'n_foot', name: 'Footprint cast', where: 'ground', shape: 'foot', c: ['#8e8c88', '#5a5854', '#b0aeaa'], fact: 'With no wind or rain, footprints on the Moon can last millions of years.' },
    { id: 'n_hammer', name: 'Feather and hammer', where: 'box', shape: 'hammer', c: ['#8a6a4a', '#5a5e66', '#f0f0f0'], fact: 'On the Moon an astronaut dropped a hammer and a feather. With no air, they landed at the same time.' },
    { id: 'n_crystal', name: 'Crater crystal', where: 'dig', blocks: [B.CRYSTAL, B.ROCK], shape: 'gem', c: ['#b05cff', '#7a3cc8', '#f0d0ff'], fact: 'When space rocks hit hard, the heat can melt rock into glass and crystal.' },
  ] },
  europa: { suit: 'icecrystal', list: [
    { id: 'e_salt', name: 'Salt crystal', where: 'dig', blocks: [B.SALT], shape: 'gem', c: ['#c27e58', '#8e4a2a', '#f0c8a8'], fact: 'The brown lines on Europa may be sea salt from the ocean under the ice.' },
    { id: 'e_bubble', name: 'Frozen bubble', where: 'dig', blocks: [B.ICE, B.REDDIRT], shape: 'bead', c: ['#bfe3f5', '#7ab0d0', '#ffffff'], fact: 'Europa\'s ice shell is thought to be 15 to 25 km thick.' },
    { id: 'e_flake', name: 'Plume snowflake', where: 'ground', shape: 'flake', c: ['#e8f4ff', '#9ac0e0', '#ffffff'], fact: 'Hubble may have seen water shooting out of Europa into space.' },
    { id: 'e_antenna', name: 'Old probe antenna', where: 'box', shape: 'antenna', c: ['#d8d4cc', '#8a8f96', '#f0c24a'], fact: 'The Galileo probe flew past Europa 11 times.' },
    { id: 'e_chip', name: 'Brown ice chip', where: 'dig', blocks: [B.DUST, B.STONE], shape: 'rock', c: ['#9a6a4a', '#6a4430', '#c89a78'], fact: 'Europa is a little smaller than our Moon.' },
    { id: 'e_pebble', name: 'Deep sea pebble', where: 'ground', shape: 'pebbles', c: ['#3a5a7a', '#24384c', '#6a9ac0'], fact: 'Under the ice, Europa may have twice as much water as all of Earth\'s seas.' },
  ] },
  proxima: { suit: 'redsun', list: [
    { id: 'p_flare', name: 'Flare glass', where: 'ground', shape: 'gem', c: ['#ff7a3a', '#c03a10', '#ffd0a0'], fact: 'Proxima Centauri throws out huge flares, much stronger than our Sun\'s.' },
    { id: 'p_stone', name: 'Red sun stone', where: 'dig', blocks: [B.ROCK, B.REDDIRT], shape: 'rock', c: ['#8a4a40', '#5a2a24', '#c07a6a'], fact: 'Proxima b is the closest planet to us outside the Solar System.' },
    { id: 'p_pearl', name: 'Lava pearl', where: 'dig', blocks: [B.BLACKROCK, B.STONE], shape: 'bead', c: ['#2a2428', '#141014', '#ff6a2a'], fact: 'Lava that cools very fast can form round glassy drops.' },
    { id: 'p_sail', name: 'Old light sail', where: 'box', shape: 'sail', c: ['#e8e8f0', '#8a8f96', '#ffd060'], fact: 'Scientists dream of tiny ships pushed by light that could reach Proxima in 20 years.' },
    { id: 'p_ash', name: 'Ash crystal', where: 'dig', blocks: [B.CRYSTAL, B.DUST], shape: 'gem', c: ['#6a5a6a', '#3a2e3a', '#b0a0b0'], fact: 'Volcano ash is made of tiny bits of rock and glass.' },
    { id: 'p_coin', name: 'Twin star coin', where: 'ground', shape: 'coin', c: ['#f2c94a', '#c09020', '#fff4b0'], fact: 'From Proxima b you could see two bright stars: Alpha Centauri A and B.' },
  ] },
  trappist1e: { suit: 'deepsea', list: [
    { id: 't_glass', name: 'Sea glass', where: 'ground', shape: 'bead', c: ['#4ad2a2', '#2a8a6a', '#b0ffe0'], fact: 'TRAPPIST-1e might have oceans of water.' },
    { id: 't_pebble', name: 'Beach pebble', where: 'dig', blocks: [B.SAND, B.REDDIRT], shape: 'pebbles', c: ['#9a8a70', '#6a5a44', '#c8b898'], fact: 'Its star is tiny and cool, so the planet sits very close to it.' },
    { id: 't_tide', name: 'Tide stone', where: 'dig', blocks: [B.ROCK, B.STONE], shape: 'rock', c: ['#5a6a6a', '#3a4444', '#8a9a9a'], fact: 'A year on TRAPPIST-1e lasts just 6 Earth days.' },
    { id: 't_buoy', name: 'Old buoy', where: 'box', shape: 'buoy', c: ['#e8603a', '#f0f0f0', '#3a3f46'], fact: 'Seven Earth-sized planets circle the star TRAPPIST-1.' },
    { id: 't_charm', name: 'Seven stars charm', where: 'ground', shape: 'coin', c: ['#c8d8f0', '#6a7a9a', '#ffffff'], fact: 'From one TRAPPIST planet, the others look bigger than our Moon in the sky.' },
    { id: 't_floe', name: 'Ice floe chip', where: 'dig', blocks: [B.ICE], shape: 'flake', c: ['#d8f0fb', '#8cc0e0', '#ffffff'], fact: 'The side away from the star may be frozen all the time.' },
  ] },
  lhs1140b: { suit: 'snow', list: [
    { id: 'l_glacier', name: 'Glacier crystal', where: 'dig', blocks: [B.ICE, B.FROST], shape: 'gem', c: ['#a0d0ec', '#5a90b8', '#e8f8ff'], fact: 'LHS 1140 b may be a snowball world, or have one warm ocean under a ring of ice.' },
    { id: 'l_heavy', name: 'Heavy stone', where: 'dig', blocks: [B.STONE, B.ROCK], shape: 'rock', c: ['#5a626c', '#353c44', '#8a929c'], fact: 'It is a super-Earth: bigger and heavier than our planet.' },
    { id: 'l_feather', name: 'Frost feather', where: 'ground', shape: 'flake', c: ['#ffffff', '#c3ced6', '#eef3f6'], fact: 'It is about 49 light years from us.' },
    { id: 'l_sled', name: 'Old sled', where: 'box', shape: 'sled', c: ['#c43a3a', '#8a6a4a', '#d8d4cc'], fact: 'Its star is a small red dwarf, quiet and old.' },
    { id: 'l_blue', name: 'Blue ice gem', where: 'dig', blocks: [B.CRYSTAL, B.ICE], shape: 'bead', c: ['#3a8ad8', '#1a5aa0', '#a0d8ff'], fact: 'Old, squeezed glacier ice turns deep blue.' },
    { id: 'l_sunset', name: 'Sunset stone', where: 'ground', shape: 'coin', c: ['#e2ae92', '#a86a50', '#fff0e0'], fact: 'Its sky might glow peach and pink from its red sun.' },
  ] },
};
export const TREASURE_BY_ID = {};
for (const w in TREASURES) for (const t of TREASURES[w].list) TREASURE_BY_ID[t.id] = { ...t, world: w };
export const ALL_COUNT = Object.keys(TREASURE_BY_ID).length;

// ---- little pixel pictures (16x16, drawn at 3x)
const SHAPES = {
  rock: (i, j) => { const d = Math.hypot((i - 7.5) / 6.5, (j - 8.5) / 5.5) + ((i * 7 + j * 3) % 5) * 0.02; return d < 1 ? (d > 0.82 ? 1 : (i < 7 && j < 8 ? 2 : 0)) : -1; },
  pebbles: (i, j) => { for (const [x, y, r] of [[4, 6, 3], [11, 5, 2.4], [7, 11, 3.2], [12, 11, 2]]) { const d = Math.hypot(i - x, j - y); if (d < r) return d > r - 0.9 ? 1 : (i < x && j < y ? 2 : 0); } return -1; },
  gem: (i, j) => { const a = Math.abs(i - 7.5), top = j >= 3 && j <= 6 && a <= 2 + (j - 3), bot = j > 6 && j <= 13 && a <= 6 - (j - 7) * 0.85; return top || bot ? (a < 1 && j < 9 ? 2 : (i < 7 ? 0 : 1)) : -1; },
  wheel: (i, j) => { const d = Math.hypot(i - 7.5, j - 7.5); if (d > 7) return -1; if (d > 5.5) return (Math.round(Math.atan2(j - 7.5, i - 7.5) * 4) % 2 ? 1 : 0); if (d < 1.6) return 2; return (Math.abs(i - 7.5) < 0.8 || Math.abs(j - 7.5) < 0.8) ? 0 : -1; },
  patch: (i, j) => { const d = Math.hypot(i - 7.5, j - 7.5); if (d > 7) return -1; if (d > 6) return 2; if (j > 9 - Math.abs(i - 7.5) * 0.4) return 0; return (i - 6) ** 2 + (j - 5) ** 2 < 4 ? 2 : 1; },
  flake: (i, j) => { const x = i - 7.5, y = j - 7.5; const on = Math.abs(x) < 0.8 || Math.abs(y) < 0.8 || Math.abs(x - y) < 0.9 || Math.abs(x + y) < 0.9; return on && Math.hypot(x, y) < 7 ? (Math.hypot(x, y) < 2 ? 2 : 0) : -1; },
  bead: (i, j) => { const d = Math.hypot(i - 7.5, j - 8); if (d > 6) return -1; if ((i - 5.5) ** 2 + (j - 5.5) ** 2 < 2.5) return 2; return d > 5 ? 1 : 0; },
  flag: (i, j) => (i === 3 && j >= 1 ? 1 : i > 3 && i < 14 && j >= 2 && j <= 8 ? (j % 3 === 2 ? 2 : 0) : -1),
  foot: (i, j) => { if (Math.hypot((i - 7.5) / 3.5, (j - 9) / 5.5) < 1) return (j % 2 ? 0 : 1); for (const [x, y] of [[5, 2], [7, 1.5], [9, 2], [10.5, 3]]) if (Math.hypot(i - x, j - y) < 1.2) return 0; return -1; },
  hammer: (i, j) => (j >= 2 && j <= 5 && i >= 3 && i <= 12 ? 1 : i >= 7 && i <= 8 && j > 5 && j < 15 ? 0 : (i - j > 8 && i - j < 11 && j < 6 ? 2 : -1)),
  antenna: (i, j) => { const d = Math.hypot(i - 7.5, j - 5); if (d < 5.5 && j < 6) return d > 4.5 ? 1 : 0; if (i >= 7 && i <= 8 && j >= 6 && j <= 14) return 1; return j === 14 && i > 3 && i < 12 ? 2 : -1; },
  sail: (i, j) => (i - 1 > j * 0.3 && i < 14 && j > 1 && j < 14 && i - 1 < j + 4 ? ((i + j) % 4 === 0 ? 2 : 0) : (i === 1 && j > 0 ? 1 : -1)),
  coin: (i, j) => { const d = Math.hypot(i - 7.5, j - 7.5); if (d > 6.5) return -1; if (d > 5.3) return 1; const x = i - 7.5, y = j - 7.5; return Math.abs(x) + Math.abs(y) < 3 ? 2 : 0; },
  buoy: (i, j) => { const d = Math.hypot((i - 7.5) / 5, (j - 9) / 5); if (d < 1) return Math.floor(j / 3) % 2 ? 1 : 0; return i >= 7 && i <= 8 && j >= 1 && j < 5 ? 2 : -1; },
  sled: (i, j) => (j >= 6 && j <= 9 && i >= 2 && i <= 13 ? 0 : j === 12 && i >= 1 && i <= 14 ? 1 : (j === 10 || j === 11) && (i === 4 || i === 11) ? 1 : i === 14 && j > 8 && j < 12 ? 1 : -1),
};
const iconCache = {};
export function treasureIcon(id, owned = true) {
  const k = id + (owned ? '' : '_x');
  if (iconCache[k]) return iconCache[k];
  const t = TREASURE_BY_ID[id], c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d'), f = SHAPES[t.shape] || SHAPES.rock;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
    const v = f(i, j); if (v < 0) continue;
    g.fillStyle = owned ? t.c[v] : ['#2a2224', '#1e181a', '#3a3034'][v];
    g.fillRect(i * 3, j * 3, 3, 3);
  }
  return (iconCache[k] = c.toDataURL());
}

export function createTreasures(ctx) {
  // ctx: { profile, save(), world(), onFind(t, count, total, setDone) }
  const have = () => ctx.profile.treasures || (ctx.profile.treasures = {});
  const listOf = (w) => (TREASURES[w] ? TREASURES[w].list : []);
  const missing = (w, where, blockId) => listOf(w).filter(t => !have()[t.id] && t.where === where && (blockId == null || t.blocks.includes(blockId)));
  const count = (w) => listOf(w).filter(t => have()[t.id]).length;
  const total = () => Object.keys(have()).filter(id => TREASURE_BY_ID[id]).length;
  function grant(t) {
    have()[t.id] = Date.now();
    const w = t.world || ctx.world(), setDone = count(w) === listOf(w).length;
    ctx.save();
    ctx.onFind({ ...TREASURE_BY_ID[t.id] }, count(w), listOf(w).length, setDone, total() === ALL_COUNT);
    return t;
  }
  return {
    // digging: a small chance that the block hid a treasure (only ones you do not have yet)
    dug(blockId) {
      const w = ctx.world(), m = missing(w, 'dig', blockId);
      if (!m.length || Math.random() > 0.012) return null;
      return grant({ ...m[Math.floor(Math.random() * m.length)], world: w });
    },
    // old supply boxes always hold one if any are left
    box() {
      const w = ctx.world(), m = missing(w, 'box');
      return m.length ? grant({ ...m[Math.floor(Math.random() * m.length)], world: w }) : null;
    },
    ground() {
      const w = ctx.world(), m = missing(w, 'ground');
      return m.length ? grant({ ...m[Math.floor(Math.random() * m.length)], world: w }) : null;
    },
    groundLeft: () => missing(ctx.world(), 'ground').length,
    count, total, have: (id) => !!have()[id], listOf,
  };
}
