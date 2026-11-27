// Blocks, items and recipes. Names are plain words on purpose.
import { COLOURS, COLOUR, FAMILIES } from './colours.js';
export const B = {
  AIR: 0, REDDIRT: 1, DUST: 2, STONE: 3, ROCK: 4, IRON: 5, ICE: 6, CRYSTAL: 7, DEEP: 8,
  METAL: 9, LAMP: 10, BRICK: 11,
  SHIP: 12, SHIPDARK: 13, GLASS_OFF: 14, GLASS_ON: 15, BROKEN: 16, ENGINE: 17, ENGINE_ON: 18, TANK: 19,
  GOLD: 20, GLASS: 21, SALT: 22,
  BEACON: 23, FORGE: 24, BOX: 25, BED: 26, AIRMAKER: 27, SUPPLY: 28,
  CASTLE: 29, GOLDBLOCK: 30, SPIKES: 31, RIG: 32,
  FLAG: 33, DOOR: 34, DOOR_OPEN: 35, WINDOW: 36, SKYWALL: 37, LEAFWALL: 38, SUNWALL: 39, BERRYWALL: 40,
  GARDEN: 41, GARDEN_RIPE: 42, TROPHY: 43,
};

// time = seconds to break by hand; tier = tool needed (0 hand, 1 pickaxe, 2 drill)
export const BLOCKS = [];
const def = (id, o) => (BLOCKS[id] = { id, solid: true, breakable: true, tier: 0, time: 1, ...o });
def(B.AIR, { name: 'Air', solid: false, breakable: false });
def(B.REDDIRT, { name: 'Red dirt', item: 'reddirt', tiles: { top: 'redTop', side: 'redSide', bottom: 'dust' }, time: 0.45 });
def(B.DUST, { name: 'Dust', item: 'dust', tiles: 'dust', time: 0.55 });
def(B.STONE, { name: 'Dark stone', item: 'stone', tiles: 'stone', time: 2.2, tier: 1 });
def(B.ROCK, { name: 'Rock', item: 'rock', tiles: 'rock', time: 2.4 });
def(B.IRON, { name: 'Iron', item: 'iron', tiles: 'iron', time: 2.6, tier: 1 });
def(B.ICE, { name: 'Ice', item: 'ice', tiles: 'ice', time: 1.0 });
def(B.CRYSTAL, { name: 'Purple crystal', item: 'crystal', tiles: 'crystal', time: 3.2, tier: 2 });
def(B.DEEP, { name: 'Deep rock', tiles: 'deep', breakable: false });
def(B.METAL, { name: 'Metal block', item: 'metal', tiles: 'metal', time: 1.4 });
def(B.LAMP, { name: 'Crystal lamp', item: 'lamp', tiles: 'lamp', time: 0.6 });
def(B.BRICK, { name: 'Stone brick', item: 'brick', tiles: 'brick', time: 1.6 });
def(B.SHIP, { name: 'Ship', tiles: 'ship', breakable: false, ship: true });
def(B.SHIPDARK, { name: 'Ship', tiles: 'shipDark', breakable: false, ship: true });
def(B.GLASS_OFF, { name: 'Ship window', tiles: 'glassOff', breakable: false, ship: true });
def(B.GLASS_ON, { name: 'Ship window', tiles: 'glassOn', breakable: false, ship: true });
def(B.BROKEN, { name: 'Broken ship', tiles: 'broken', breakable: false, ship: true });
def(B.ENGINE, { name: 'Ship engine', tiles: { top: 'shipDark', side: 'shipDark', bottom: 'shipDark', east: 'engine' }, breakable: false, ship: true });
def(B.ENGINE_ON, { name: 'Ship engine', tiles: { top: 'shipDark', side: 'shipDark', bottom: 'shipDark', east: 'engineOn' }, breakable: false, ship: true });
def(B.TANK, { name: 'Fuel tank', tiles: 'tank', breakable: false, ship: true });
def(B.GOLD, { name: 'Gold', item: 'gold', tiles: 'gold', time: 3.0, tier: 2 });
def(B.GLASS, { name: 'Orange glass', item: 'glass', tiles: 'glass', time: 0.8 });
def(B.SALT, { name: 'Salt', item: 'salt', tiles: 'salt', time: 0.9 });
// things you use: right click (or Place on a phone)
def(B.BEACON, { name: 'Wave beacon', tiles: { top: 'beaconTop', side: 'beacon', bottom: 'shipDark' }, breakable: false, use: 'beacon' });
def(B.FORGE, { name: 'Forge', item: 'forge', tiles: { top: 'forgeTop', side: 'forge', bottom: 'shipDark' }, time: 1.2, use: 'forge' });
def(B.BOX, { name: 'Storage box', item: 'box', tiles: { top: 'boxTop', side: 'box', bottom: 'boxTop' }, time: 0.8, use: 'box' });
def(B.BED, { name: 'Bed', item: 'bed', tiles: { top: 'bedTop', side: 'bed', bottom: 'shipDark' }, time: 0.6, use: 'bed' });
def(B.AIRMAKER, { name: 'Air maker', item: 'airmaker', tiles: { top: 'airTop', side: 'air', bottom: 'shipDark' }, time: 1.0, use: 'airmaker' });
def(B.CASTLE, { name: 'Castle brick', item: 'castle', tiles: 'castle', time: 2.0 });
def(B.GOLDBLOCK, { name: 'Gold block', item: 'goldblock', tiles: 'goldblock', time: 1.5 });
def(B.SPIKES, { name: 'Spike trap', item: 'spikes', tiles: { top: 'spikesTop', side: 'spikes', bottom: 'shipDark' }, time: 0.8 });
def(B.RIG, { name: 'Mining rig', item: 'rig', tiles: { top: 'rigTop', side: 'rig', bottom: 'shipDark' }, time: 1.0, use: 'rig' });
// making a home. `see` = you can see through parts of it. `draw` = not solid, but still drawn and can be used.
def(B.FLAG, { name: 'Home flag', item: 'flag', tiles: { top: 'flagTop', side: 'flag', bottom: 'flagTop' }, time: 0.8, use: 'home', see: true });
def(B.DOOR, { name: 'Door', item: 'door', tiles: { top: 'metal', side: 'door', bottom: 'metal' }, time: 0.8, use: 'door' });
def(B.DOOR_OPEN, { name: 'Door (open)', item: 'door', tiles: { top: 'doorOpenTop', side: 'doorOpen', bottom: 'doorOpenTop' }, time: 0.8, use: 'door', solid: false, draw: true, see: true });
def(B.WINDOW, { name: 'Window', item: 'window', tiles: 'window', time: 0.5, see: true });
def(B.SKYWALL, { name: 'Sky blue wall', item: 'skywall', tiles: 'skywall', time: 1.2 });
def(B.LEAFWALL, { name: 'Leaf green wall', item: 'leafwall', tiles: 'leafwall', time: 1.2 });
def(B.SUNWALL, { name: 'Sun yellow wall', item: 'sunwall', tiles: 'sunwall', time: 1.2 });
def(B.BERRYWALL, { name: 'Berry red wall', item: 'berrywall', tiles: 'berrywall', time: 1.2 });
def(B.GARDEN, { name: 'Garden bed', item: 'garden', tiles: { top: 'gardenTop', side: 'garden', bottom: 'shipDark' }, time: 0.8, use: 'garden' });
def(B.GARDEN_RIPE, { name: 'Garden bed (ripe)', item: 'garden', tiles: { top: 'gardenRipe', side: 'gardenRipeSide', bottom: 'shipDark' }, time: 0.8, use: 'garden' });
def(B.TROPHY, { name: 'Dragon trophy', item: 'trophy', tiles: { top: 'trophyTop', side: 'trophy', bottom: 'shipDark' }, time: 1.0 });
def(B.SUPPLY, { name: 'Old supply box', tiles: { top: 'supplyTop', side: 'supply', bottom: 'supplyTop' }, time: 1.2, loot: true });

// Items. `block` = can be placed. `tier` = tool strength it gives.
export const ITEMS = {
  reddirt: { name: 'Red dirt', block: B.REDDIRT },
  dust: { name: 'Dust', block: B.DUST },
  stone: { name: 'Dark stone', block: B.STONE },
  rock: { name: 'Rock', block: B.ROCK },
  iron: { name: 'Iron', block: B.IRON },
  ice: { name: 'Ice', block: B.ICE },
  crystal: { name: 'Purple crystal', block: B.CRYSTAL },
  metal: { name: 'Metal block', block: B.METAL },
  lamp: { name: 'Crystal lamp', block: B.LAMP },
  brick: { name: 'Stone brick', block: B.BRICK },
  gold: { name: 'Gold', block: B.GOLD, rare: true },
  glass: { name: 'Orange glass', block: B.GLASS, rare: true },
  salt: { name: 'Salt', block: B.SALT, rare: true },
  sheet: { name: 'Metal sheet' },
  pickaxe: { name: 'Rock pickaxe', tier: 1, tool: true },
  drill: { name: 'Iron drill', tier: 2, tool: true },
  fastdrill: { name: 'Crystal drill', tier: 3, tool: true },
  patch: { name: 'Hull patch', part: true },
  engine: { name: 'Engine', part: true },
  fueltank: { name: 'Fuel tank', part: true },
  computer: { name: 'Ship computer', part: true },
  forge: { name: 'Forge', block: B.FORGE },
  box: { name: 'Storage box', block: B.BOX },
  bed: { name: 'Bed', block: B.BED },
  airmaker: { name: 'Air maker', block: B.AIRMAKER },
  fuelcell: { name: 'Fuel cell' },
  castle: { name: 'Castle brick', block: B.CASTLE },
  goldblock: { name: 'Gold block', block: B.GOLDBLOCK },
  spikes: { name: 'Spike trap', block: B.SPIKES },
  rig: { name: 'Mining rig', block: B.RIG },
  flag: { name: 'Home flag', block: B.FLAG },
  door: { name: 'Door', block: B.DOOR },
  window: { name: 'Window', block: B.WINDOW },
  skywall: { name: 'Sky blue wall', block: B.SKYWALL },
  leafwall: { name: 'Leaf green wall', block: B.LEAFWALL },
  sunwall: { name: 'Sun yellow wall', block: B.SUNWALL },
  berrywall: { name: 'Berry red wall', block: B.BERRYWALL },
  garden: { name: 'Garden bed', block: B.GARDEN },
  trophy: { name: 'Dragon trophy', block: B.TROPHY },
  fruit: { name: 'Moss fruit', food: 6 },
  gem: { name: 'Gem', rare: true },
  scale: { name: 'Dragon scale', rare: true },
  scanner: { name: 'Scanner' },
  rover: { name: 'Rover' },
  // weapons and shields: `weapon` = level, `dmg` = hit strength, `guard` = share of each hit it blocks
  club: { name: 'Rock club', weapon: 1, dmg: 2 },
  sword: { name: 'Iron sword', weapon: 2, dmg: 4 },
  csword: { name: 'Crystal sword', weapon: 3, dmg: 7 },
  spear: { name: 'Gold spear', weapon: 4, dmg: 11, reach: 4.6 },
  blade: { name: 'Star blade', weapon: 5, dmg: 18 },
  ishield: { name: 'Iron shield', shield: 2, guard: 0.25 },
  cshield: { name: 'Crystal shield', shield: 3, guard: 0.4 },
  gshield: { name: 'Gold shield', shield: 4, guard: 0.5 },
  sshield: { name: 'Star shield', shield: 5, guard: 0.6 },
  // only mining rigs dig these up
  shard: { name: 'Star shard', rare: true, tier: 'super' },
  pearl: { name: 'Moon pearl', rare: true, tier: 'super' },
  ember: { name: 'Ember stone', rare: true, tier: 'super' },
  sunheart: { name: 'Sun heart', rare: true, tier: 'legend' },
  shadow: { name: 'Shadow gem', rare: true, tier: 'legend' },
  // unique gear made from them
  embersword: { name: 'Ember sword', weapon: 6, dmg: 26, unique: true },
  moonhammer: { name: 'Moon hammer', weapon: 6, dmg: 30, area: 3, unique: true },
  sunblade: { name: 'Sun blade', weapon: 7, dmg: 45, area: 4, unique: true },
  stararmor: { name: 'Star armour', shield: 6, guard: 0.7, unique: true },
  shadowarmor: { name: 'Shadow armour', shield: 7, guard: 0.8, lifesteal: 0.6, unique: true },
};

export const RECIPES = [
  { out: 'pickaxe', n: 1, need: { rock: 4 }, note: 'Lets you dig dark stone and iron.' },
  { out: 'sheet', n: 1, need: { iron: 1 }, note: 'Flattened iron. Used in most things.' },
  { out: 'drill', n: 1, need: { sheet: 2, rock: 3 }, note: 'Lets you dig purple crystal.' },
  { out: 'fastdrill', n: 1, need: { crystal: 2, sheet: 2 }, note: 'Digs everything much faster.' },
  { out: 'patch', n: 1, need: { sheet: 3 }, note: 'Ship part: covers the hole in the side.' },
  { out: 'engine', n: 1, need: { sheet: 2, stone: 6 }, note: 'Ship part: replaces the burnt engine.' },
  { out: 'fueltank', n: 1, need: { ice: 6, crystal: 1 }, note: 'Ship part: melted ice makes fuel.' },
  { out: 'computer', n: 1, need: { crystal: 3, sheet: 1 }, note: 'Ship part: finds the way home.' },
  { out: 'metal', n: 4, need: { sheet: 1 }, note: 'Building block.' },
  { out: 'brick', n: 4, need: { stone: 4 }, note: 'Building block.' },
  { out: 'lamp', n: 2, need: { crystal: 1, rock: 1 }, note: 'A glowing block.' },
  { out: 'fuelcell', n: 1, need: { ice: 4, crystal: 1 }, note: 'Fuel for flying to other worlds.', after: 'won' },
  { out: 'rover', n: 1, need: { sheet: 4, iron: 3, fuelcell: 1 }, after: 'won', note: 'A little six-wheeled buggy. Press V (or Drive) to hop in and out. It climbs one block at a time.', once: true },
  { out: 'scanner', n: 1, need: { sheet: 2, crystal: 1 }, note: 'Press Q (or Scan) to see ore through rock for a moment.', once: true },
  { out: 'forge', n: 1, need: { rock: 6, sheet: 2 }, note: 'Place it, then use it to make weapons and shields.' },
  { out: 'box', n: 1, need: { metal: 2 }, note: 'Keeps things safe in your base.' },
  { out: 'bed', n: 1, need: { metal: 2, dust: 3 }, note: 'Sleep through the night. You come back here if you fall.' },
  { out: 'spikes', n: 2, need: { sheet: 1, rock: 2 }, note: 'Trap: hurts creatures that step on it. Safe for you.' },
  { out: 'rig', n: 1, need: { sheet: 4, crystal: 2 }, note: 'Place it on the ground. It digs up what is under it, even when you are away.' },
  { out: 'airmaker', n: 1, need: { sheet: 2, ice: 2, crystal: 1 }, note: 'Fills your air when you stand near it.' },
  // making a home
  { out: 'flag', n: 1, need: { sheet: 2, crystal: 1 }, note: 'Place it to make this place your home. Use it to name your home and see how cosy it is.', after: 'won' },
  { out: 'garden', n: 1, need: { dust: 4, ice: 2 }, note: 'Grows Moss fruit, even while you are away. Eat it to heal.', after: 'won' },
];

// Made at a Forge. Each level beats one stage of waves.
export const FORGE_RECIPES = [
  { out: 'club', need: { rock: 3 }, note: 'Level 1. Enough for waves 1 to 10.' },
  { out: 'sword', need: { sheet: 3 }, note: 'Level 2. For waves 11 to 20.' },
  { out: 'ishield', need: { sheet: 4 }, note: 'Blocks a quarter of every hit.' },
  { out: 'csword', need: { sheet: 2, crystal: 3 }, note: 'Level 3. For waves 21 to 30.' },
  { out: 'cshield', need: { sheet: 2, crystal: 4 }, note: 'Blocks 40% of every hit.' },
  { out: 'spear', need: { gold: 3, crystal: 2 }, note: 'Level 4. Reaches further. For waves 31 to 40.' },
  { out: 'gshield', need: { gold: 4, sheet: 2 }, note: 'Blocks half of every hit.' },
  { out: 'blade', need: { gem: 3, gold: 2, crystal: 3 }, note: 'Level 5. The only thing that can beat a dragon.' },
  { out: 'sshield', need: { gem: 2, gold: 3, sheet: 3 }, note: 'Blocks 60% of every hit.' },
  // the final mission: antimatter, made from things found on every world
  { out: 'magnet', need: { iron: 12, yellowstone: 3 }, note: 'Mars. Antimatter must never touch anything, so it is held in the air by strong magnets.', final: true },
  { out: 'lens', need: { glass: 6, sand: 8 }, note: 'The Moon and TRAPPIST-1e. Focuses the light that makes antimatter.', final: true },
  { out: 'coldcore', need: { salt: 6, ice: 12 }, note: 'Europa. Antimatter traps must be kept colder than anything in nature.', final: true },
  { out: 'heatshield', need: { blackrock: 8, gold: 4 }, note: 'Proxima b and LHS 1140 b. Antimatter gives off huge heat when it is used.', final: true },
  { out: 'powercrystal', need: { crystal: 6, gem: 2 }, note: 'Any world. Stores the power to make antimatter.', final: true },
  { out: 'trap', need: { magnet: 1, coldcore: 1, lens: 1, heatshield: 1 }, note: 'A real idea: scientists at CERN keep antimatter in magnet traps like this.', final: true },
  { out: 'antimatter', need: { trap: 1, powercrystal: 1, scale: 1 }, note: 'The strongest fuel there is. The Galaxy drive needs 2.', final: true },
  // unique gear: only from what mining rigs dig up
  { out: 'embersword', need: { ember: 3, shard: 2 }, note: 'Unique. Hits 26. Made only from rig finds.', legend: true },
  { out: 'moonhammer', need: { pearl: 3, shard: 2, gold: 2 }, note: 'Unique. Hits 30 and knocks down every creature near the one you hit.', legend: true },
  { out: 'stararmor', need: { shard: 4, pearl: 2 }, note: 'Unique. Blocks 70% of every hit.', legend: true },
  { out: 'sunblade', need: { sunheart: 1, shard: 3, ember: 2 }, note: 'Legendary. Hits 45 and burns everything around the one you hit.', legend: true },
  { out: 'shadowarmor', need: { shadow: 1, pearl: 3, shard: 2 }, note: 'Legendary. Blocks 80% of every hit, and every hit you land heals you.', legend: true },
];

export const PARTS = [
  { id: 'patch', name: 'Hull patch', hint: 'A hole in the side of the ship.' },
  { id: 'engine', name: 'Engine', hint: 'The engine at the back is burnt out.' },
  { id: 'fueltank', name: 'Fuel tank', hint: 'The fuel tank is cracked and empty.' },
  { id: 'computer', name: 'Ship computer', hint: 'The windows are dark. No power to steer.' },
];

// The ground has a different name on each world ("Red dirt" on Mars, "Snow" elsewhere).
export function nameGround(surface) {
  BLOCKS[B.REDDIRT].name = ITEMS.reddirt.name = surface.top;
  BLOCKS[B.DUST].name = ITEMS.dust.name = surface.under;
}

// tier speed multipliers
export const TOOL_SPEED = [1, 2.2, 3.5, 7];

// ---------------------------------------------------------------- building blocks
// Castle pieces, and every colourful block. Made in the Build panel.
B.CASTLE_TOP = 44; B.PILLAR = 45; B.RAIL = 46; B.GATE = 47; B.GATE_OPEN = 48; B.FLOOR_CHECK = 49; B.FLOOR_SKY = 50;
def(B.CASTLE_TOP, { name: 'Castle top', item: 'castletop', tiles: { top: 'castle', side: 'castleTop', bottom: 'castle' }, time: 2.0, see: true });
def(B.PILLAR, { name: 'Pillar', item: 'pillar', tiles: { top: 'pillarTop', side: 'pillar', bottom: 'pillarTop' }, time: 2.0 });
def(B.RAIL, { name: 'Railing', item: 'rail', tiles: { top: 'railTop', side: 'rail', bottom: 'railTop' }, time: 0.6, see: true });
def(B.GATE, { name: 'Castle gate', item: 'gate', tiles: { top: 'metal', side: 'gate', bottom: 'metal' }, time: 1.5, use: 'door', see: true });
def(B.GATE_OPEN, { name: 'Castle gate (open)', item: 'gate', tiles: { top: 'doorOpenTop', side: 'gateOpen', bottom: 'doorOpenTop' }, time: 1.5, use: 'door', solid: false, draw: true, see: true });
def(B.FLOOR_CHECK, { name: 'Checked floor', item: 'floorcheck', tiles: 'floorCheck', time: 1.2 });
def(B.FLOOR_SKY, { name: 'Sky tile floor', item: 'floorsky', tiles: 'floorSky', time: 1.2 });
Object.assign(ITEMS, {
  castletop: { name: 'Castle top', block: B.CASTLE_TOP },
  pillar: { name: 'Pillar', block: B.PILLAR },
  rail: { name: 'Railing', block: B.RAIL },
  gate: { name: 'Castle gate', block: B.GATE },
  floorcheck: { name: 'Checked floor', block: B.FLOOR_CHECK },
  floorsky: { name: 'Sky tile floor', block: B.FLOOR_SKY },
});
// the four painted walls made earlier keep their ids
const OLD_WALLS = { sky: [B.SKYWALL, 'skywall'], leaf: [B.LEAFWALL, 'leafwall'], sun: [B.SUNWALL, 'sunwall'], berry: [B.BERRYWALL, 'berrywall'] };
let nextId = 51;
export const COLOURFUL = [];                 // every colourful block id
export const FAMILY_ITEMS = {};              // family -> [[colour, item]]
for (const f of FAMILIES) {
  FAMILY_ITEMS[f.id] = [];
  for (const c of f.colours) {
    let id, item;
    if (f.id === 'wall' && OLD_WALLS[c]) [id, item] = OLD_WALLS[c];
    else {
      id = nextId++; item = `${f.id}_${c}`;
      const name = `${COLOUR[c].name} ${f.name}`;
      const o = { name, item, tiles: `${f.id}_${c}`, time: 1.2 };
      if (f.id === 'roof') o.tiles = { top: `roof_${c}`, side: `roof_${c}`, bottom: 'stone' };
      if (f.id === 'glass') { o.see = true; o.time = 0.5; }
      if (f.id === 'lamp') o.time = 0.6;
      if (f.id === 'banner') { o.solid = false; o.draw = true; o.see = true; o.time = 0.3; o.tiles = { top: 'none', side: `banner_${c}`, bottom: 'none' }; }
      def(id, o);
      ITEMS[item] = { name, block: id };
    }
    COLOURFUL.push(id); FAMILY_ITEMS[f.id].push([c, item]);
  }
}
// ---------------------------------------------------------------- real Mars ground
// Fixed ids (above the colourful blocks) so saved worlds keep working.
Object.assign(B, { DARKSAND: 120, TANROCK: 121, PALECLAY: 122, PURPLEROCK: 123, BLACKROCK: 124, FROST: 125, YELLOWSTONE: 126, GREENSTONE: 127 });
Object.assign(B, { TRACKS: 128, SAND: 129 });
Object.assign(ITEMS, {
  magnet: { name: 'Magnet ring' }, lens: { name: 'Focus lens' }, coldcore: { name: 'Cold core' }, heatshield: { name: 'Heat shield' },
  powercrystal: { name: 'Power crystal' }, trap: { name: 'Antimatter trap' }, antimatter: { name: 'Antimatter cell', rare: true },
});
def(B.TRACKS, { name: 'Red dirt', item: 'reddirt', tiles: { top: 'tracks', side: 'redSide', bottom: 'dust' }, time: 0.45 });
def(B.SAND, { name: 'Sand', item: 'sand', tiles: 'sand', time: 0.5 });
ITEMS.sand = { name: 'Sand', block: B.SAND };
def(B.DARKSAND, { name: 'Dark sand', item: 'darksand', tiles: { top: 'darkSand', side: 'darkSandSide', bottom: 'darkSandSide' }, time: 0.5 });
def(B.TANROCK, { name: 'Tan rock', item: 'tanrock', tiles: 'tanRock', time: 1.8 });
def(B.PALECLAY, { name: 'Pale clay', item: 'paleclay', tiles: 'paleClay', time: 1.0 });
def(B.PURPLEROCK, { name: 'Purple rock', item: 'purplerock', tiles: 'purpleRock', time: 2.0 });
def(B.BLACKROCK, { name: 'Black rock', item: 'blackrock', tiles: 'blackRock', time: 2.4, tier: 1 });
def(B.FROST, { name: 'Frost', item: 'ice', tiles: { top: 'frost', side: 'frostSide', bottom: 'dust' }, time: 0.4 });
def(B.YELLOWSTONE, { name: 'Yellow stone', item: 'yellowstone', tiles: 'yellowStone', time: 2.0 });
def(B.GREENSTONE, { name: 'Green stone', item: 'greenstone', tiles: 'greenStone', time: 2.0 });
Object.assign(ITEMS, {
  darksand: { name: 'Dark sand', block: B.DARKSAND },
  tanrock: { name: 'Tan rock', block: B.TANROCK },
  paleclay: { name: 'Pale clay', block: B.PALECLAY },
  purplerock: { name: 'Purple rock', block: B.PURPLEROCK },
  blackrock: { name: 'Black rock', block: B.BLACKROCK },
  yellowstone: { name: 'Yellow stone', block: B.YELLOWSTONE, rare: true },
  greenstone: { name: 'Green stone', block: B.GREENSTONE, rare: true },
});
// what each building block costs. `n` = how many you get.
export const BUILD_COST = {
  wall: { need: { rock: 4, crystal: 1 }, n: 8, note: 'Smooth painted wall.' },
  bricks: { need: { brick: 4, crystal: 1 }, n: 8, note: 'Bright bricks for houses and castles.' },
  roof: { need: { stone: 4, crystal: 1 }, n: 8, note: 'Roof tiles.' },
  glass: { need: { ice: 4, crystal: 1 }, n: 8, note: 'Coloured glass. You can see through it.' },
  lamp: { need: { crystal: 2, rock: 1 }, n: 4, note: 'A glowing block in your colour.' },
  banner: { need: { sheet: 1, crystal: 1 }, n: 2, note: 'Hangs on a wall. You can walk through it.' },
};
export const BUILD_RECIPES = [
  { out: 'castle', n: 8, need: { rock: 4, stone: 4 }, note: 'Strong grey castle brick.' },
  { out: 'castletop', n: 4, need: { castle: 4 }, note: 'Goes on top of castle walls.' },
  { out: 'gate', n: 1, need: { sheet: 3, metal: 1 }, note: 'Opens and closes like a door. Creatures can not get through.' },
  { out: 'pillar', n: 4, need: { stone: 4, gold: 1 }, note: 'White pillar with a gold band.' },
  { out: 'rail', n: 4, need: { sheet: 1 }, note: 'Railing for towers and bridges. You can see through it.' },
  { out: 'floorcheck', n: 8, need: { rock: 4, ice: 1 }, note: 'Black and white floor.' },
  { out: 'floorsky', n: 8, need: { rock: 4, ice: 2 }, note: 'Blue and white tile floor.' },
  { out: 'door', n: 1, need: { metal: 2 }, note: 'Opens and closes. Creatures can not open it.' },
  { out: 'window', n: 2, need: { ice: 2, sheet: 1 }, note: 'Clear window.' },
  { out: 'lamp', n: 2, need: { crystal: 1, rock: 1 }, note: 'Purple crystal lamp.' },
  { out: 'goldblock', n: 1, need: { gold: 3 }, note: 'Shiny gold block.' },
  { out: 'metal', n: 4, need: { sheet: 1 }, note: 'Metal block.' },
  { out: 'brick', n: 4, need: { stone: 4 }, note: 'Stone brick.' },
];
export const recipeFor = (item) => {
  const r = RECIPES.find(r => r.out === item) || BUILD_RECIPES.find(r => r.out === item);
  if (r) return r;
  for (const f in FAMILY_ITEMS) if (FAMILY_ITEMS[f].some(([, it]) => it === item)) return { out: item, ...BUILD_COST[f] };
  return null;
};
// ---------------------------------------------------------------- farming and cooking (Version 28)
// Crops grow on Farm soil. Each crop has 3 looks: just planted, growing, ripe.
// `cross` = drawn as two crossing pictures, like a real plant.
Object.assign(B, { SOIL: 130, STOVE: 131 });
def(B.SOIL, { name: 'Farm soil', item: 'soil', tiles: { top: 'soilTop', side: 'soilSide', bottom: 'dust' }, time: 0.5 });
def(B.STOVE, { name: 'Camp stove', item: 'stove', tiles: { top: 'stoveTop', side: 'stove', bottom: 'shipDark' }, time: 1.0, use: 'stove' });
export const CROPS = {
  potato: { name: 'Potato plant', seed: 'potato', crop: 'potato', n: [2, 4], fact: 'Real: scientists grew potatoes in soil like Mars soil in Peru, in a sealed box with Mars-like air.' },
  bean: { name: 'Bean plant', seed: 'beanseed', crop: 'beans', n: [3, 5], fact: 'Real: beans add their own goodness to the soil, so they are a good first crop on a new world.' },
  lettuce: { name: 'Lettuce plant', seed: 'lettuceseed', crop: 'lettuce', n: [1, 2], fact: 'Real: in 2015 astronauts on the space station ate red lettuce they grew there.' },
};
export const CROP_IDS = {};   // kind -> [3 block ids]
{
  let id = 132;
  for (const k in CROPS) {
    CROP_IDS[k] = [];
    for (let s = 0; s < 3; s++) {
      def(id, { name: s === 2 ? `${CROPS[k].name} (ripe)` : CROPS[k].name, tiles: `crop_${k}_${s}`, time: 0.15, solid: false, draw: true, see: true, cross: true, crop: { kind: k, stage: s } });
      CROP_IDS[k].push(id++);
    }
  }
}
// `food` = how much it fills you up, `heal` = health it gives, `seed` = the crop it plants
Object.assign(ITEMS, {
  soil: { name: 'Farm soil', block: B.SOIL },
  stove: { name: 'Camp stove', block: B.STOVE },
  potato: { name: 'Potato', food: 3, seed: 'potato' },
  beanseed: { name: 'Bean seeds', seed: 'bean' },
  beans: { name: 'Beans', food: 2 },
  lettuceseed: { name: 'Lettuce seeds', seed: 'lettuce' },
  lettuce: { name: 'Lettuce', food: 3 },
  rawfish: { name: 'Raw fish', food: 2 },
  bakedpotato: { name: 'Baked potato', food: 7, heal: 2 },
  stew: { name: 'Bean stew', food: 10, heal: 4 },
  salad: { name: 'Salad', food: 8, heal: 3, air: 20 },
  cookedfish: { name: 'Cooked fish', food: 9, heal: 4 },
  pie: { name: 'Moss pie', food: 14, heal: 8 },
});
ITEMS.fruit.food = 5; ITEMS.fruit.heal = 6; ITEMS.fruit.air = 30;
RECIPES.push(
  { out: 'soil', n: 4, need: { dust: 3, ice: 1 }, note: 'Plant seeds or a potato on it. Ice close by makes plants grow twice as fast.' },
  { out: 'stove', n: 1, need: { rock: 6, sheet: 1 }, note: 'Cook food on it. Cooked food fills you up much more.' },
);
// Cooked on the Camp stove
export const COOK_RECIPES = [
  { out: 'bakedpotato', n: 1, need: { potato: 1 }, note: 'Fills you up a lot more than a raw potato.' },
  { out: 'cookedfish', n: 1, need: { rawfish: 1 }, note: 'A good hot meal.' },
  { out: 'stew', n: 1, need: { beans: 3, ice: 1 }, note: 'Warm and filling. Heals you too.' },
  { out: 'salad', n: 1, need: { lettuce: 2, beans: 1 }, note: 'Fresh. Fills you up and gives you a little air.' },
  { out: 'pie', n: 1, need: { fruit: 2, potato: 1 }, note: 'The best meal there is. Fills you right up and heals a lot.' },
];
// ---------------------------------------------------------------- wiring, tracks, fishing, boats (Version 29)
// `low` = a thin block lying on the ground (height in blocks). You can walk over it.
Object.assign(B, { SWITCH: 141, SWITCH_ON: 142, PLATE: 143, PLATE_ON: 144, WIRE: 145, WIRE_ON: 146, WLAMP: 147, WLAMP_ON: 148,
  BLINKER: 149, BLINKER_ON: 150, TRACK: 151, TRACK_X: 152, FAST: 153, FAST_X: 154 });
const thin = { solid: false, draw: true, see: true };
def(B.SWITCH, { name: 'Switch', item: 'switch', tiles: { top: 'metal', side: 'switchOff', bottom: 'metal' }, time: 0.5, use: 'switch', power: 'source' });
def(B.SWITCH_ON, { name: 'Switch (on)', item: 'switch', tiles: { top: 'metal', side: 'switchOn', bottom: 'metal' }, time: 0.5, use: 'switch', power: 'source' });
def(B.PLATE, { name: 'Step plate', item: 'plate', tiles: { top: 'plate', side: 'plate', bottom: 'plate' }, time: 0.4, low: 0.09, power: 'source', ...thin });
def(B.PLATE_ON, { name: 'Step plate (on)', item: 'plate', tiles: { top: 'plateOn', side: 'plateOn', bottom: 'plateOn' }, time: 0.4, low: 0.05, power: 'source', ...thin });
def(B.WIRE, { name: 'Wire', item: 'wire', tiles: { top: 'wire', side: 'wire', bottom: 'wire' }, time: 0.2, low: 0.06, power: 'wire', ...thin });
def(B.WIRE_ON, { name: 'Wire (on)', item: 'wire', tiles: { top: 'wireOn', side: 'wireOn', bottom: 'wireOn' }, time: 0.2, low: 0.06, power: 'wire', ...thin });
def(B.WLAMP, { name: 'Wire lamp', item: 'wlamp', tiles: 'wlamp', time: 0.6, power: 'device' });
def(B.WLAMP_ON, { name: 'Wire lamp (on)', item: 'wlamp', tiles: 'wlampOn', time: 0.6, power: 'device' });
def(B.BLINKER, { name: 'Blinker', item: 'blinker', tiles: { top: 'blinker', side: 'blinker', bottom: 'metal' }, time: 0.6, power: 'source' });
def(B.BLINKER_ON, { name: 'Blinker', item: 'blinker', tiles: { top: 'blinkerOn', side: 'blinkerOn', bottom: 'metal' }, time: 0.6, power: 'source' });
def(B.TRACK, { name: 'Track', item: 'track', tiles: { top: 'track', side: 'trackSide', bottom: 'trackSide' }, time: 0.3, low: 0.08, track: 1, ...thin });
def(B.TRACK_X, { name: 'Track', item: 'track', tiles: { top: 'trackX', side: 'trackSide', bottom: 'trackSide' }, time: 0.3, low: 0.08, track: 1, ...thin });
def(B.FAST, { name: 'Fast track', item: 'fasttrack', tiles: { top: 'fast', side: 'trackSide', bottom: 'trackSide' }, time: 0.3, low: 0.08, track: 2, ...thin });
def(B.FAST_X, { name: 'Fast track', item: 'fasttrack', tiles: { top: 'fastX', side: 'trackSide', bottom: 'trackSide' }, time: 0.3, low: 0.08, track: 2, ...thin });
// doors and castle gates open when powered
for (const id of [B.DOOR, B.DOOR_OPEN, B.GATE, B.GATE_OPEN]) BLOCKS[id].power = 'device';
Object.assign(ITEMS, {
  switch: { name: 'Switch', block: B.SWITCH },
  plate: { name: 'Step plate', block: B.PLATE },
  wire: { name: 'Wire', block: B.WIRE },
  wlamp: { name: 'Wire lamp', block: B.WLAMP },
  blinker: { name: 'Blinker', block: B.BLINKER },
  track: { name: 'Track', block: B.TRACK },
  fasttrack: { name: 'Fast track', block: B.FAST },
  rod: { name: 'Fishing rod', hold: true },
  boat: { name: 'Boat', hold: true },
  cart: { name: 'Mine cart', hold: true },
  oldcan: { name: 'Old can' },
});
RECIPES.push(
  { out: 'wire', n: 8, need: { iron: 1, crystal: 1 }, note: 'Lay it on the ground to carry power from a Switch, Step plate or Blinker to doors, gates and Wire lamps.', after: 'won' },
  { out: 'switch', n: 1, need: { sheet: 1, rock: 1 }, note: 'Use it to turn power on and off.', after: 'won' },
  { out: 'plate', n: 2, need: { sheet: 1 }, note: 'Gives power while you (or a creature) stand on it. Good for doors that open by themselves, and traps.', after: 'won' },
  { out: 'wlamp', n: 2, need: { crystal: 1, sheet: 1 }, note: 'A lamp that lights up when it gets power.', after: 'won' },
  { out: 'blinker', n: 1, need: { crystal: 2, sheet: 1 }, note: 'Turns power on and off every second, all by itself.', after: 'won' },
  { out: 'track', n: 8, need: { sheet: 1, rock: 2 }, note: 'Lay a line of track for a Mine cart. It can go up and down one block, and turn corners.', after: 'won' },
  { out: 'fasttrack', n: 4, need: { sheet: 1, gold: 1 }, note: 'Pushes Mine carts along faster.', after: 'won' },
  { out: 'cart', n: 1, need: { sheet: 4, iron: 2 }, note: 'Hold it and Use on a track to ride. Jump to get off.', after: 'won', once: true },
  { out: 'rod', n: 1, need: { sheet: 1, crystal: 1 }, note: 'Fish in the sea, or through the ice on icy worlds. Use, wait for a bite, then Use again.', once: true },
  { out: 'boat', n: 1, need: { metal: 4, sheet: 2 }, note: 'Hold it and Use on open water to sail. Jump to get off.', after: 'won', once: true },
);
// ---------------------------------------------------------------- villages and potions (Version 30)
B.BREW = 155;
def(B.BREW, { name: 'Potion table', item: 'brew', tiles: { top: 'brewTop', side: 'brew', bottom: 'shipDark' }, time: 1.0, use: 'brew' });
// `drink` = what a potion does, `secs` = for how long
Object.assign(ITEMS, {
  brew: { name: 'Potion table', block: B.BREW },
  bottle: { name: 'Bottle' },
  p_heal: { name: 'Healing potion', drink: 'heal', colour: '#ff5a7a' },
  p_speed: { name: 'Speed potion', drink: 'speed', secs: 180, colour: '#7ad8ff' },
  p_jump: { name: 'Jump potion', drink: 'jump', secs: 180, colour: '#8aff7a' },
  p_strong: { name: 'Strength potion', drink: 'strong', secs: 180, colour: '#ff8a3a' },
  p_air: { name: 'Air potion', drink: 'air', secs: 180, colour: '#e8f4ff' },
  p_night: { name: 'Night sight potion', drink: 'night', secs: 240, colour: '#b07aff' },
});
RECIPES.push(
  { out: 'bottle', n: 3, need: { ice: 2, crystal: 1 }, note: 'Empty bottles for potions.' },
  { out: 'brew', n: 1, need: { sheet: 2, crystal: 2, ice: 2 }, note: 'Place it and use it to make potions.', after: 'won' },
);
export const FX_NAMES = { speed: 'Speed', jump: 'Jump', strong: 'Strength', air: 'Air', night: 'Night sight' };
export const BREW_RECIPES = [
  { out: 'p_heal', n: 1, need: { bottle: 1, fruit: 2 }, note: 'Heals you a lot, right away.' },
  { out: 'p_speed', n: 1, need: { bottle: 1, beans: 3, crystal: 1 }, note: 'Walk and run half as fast again, for 3 minutes.' },
  { out: 'p_jump', n: 1, need: { bottle: 1, lettuce: 2, crystal: 1 }, note: 'Jump much higher, for 3 minutes.' },
  { out: 'p_strong', n: 1, need: { bottle: 1, potato: 2, gold: 1 }, note: 'Hit half as hard again, for 3 minutes.' },
  { out: 'p_air', n: 1, need: { bottle: 1, ice: 4, crystal: 1 }, note: 'Your air does not run down, for 3 minutes.' },
  { out: 'p_night', n: 1, need: { bottle: 1, rawfish: 2, crystal: 1 }, note: 'See in the dark, for 4 minutes.' },
];
// ---------------------------------------------------------------- signs and slingshot (Version 31)
B.SIGN = 156;
def(B.SIGN, { name: 'Sign', item: 'sign', tiles: { top: 'signTop', side: 'sign', bottom: 'signTop' }, time: 0.6, use: 'sign' });
Object.assign(ITEMS, {
  sign: { name: 'Sign', block: B.SIGN },
  sling: { name: 'Slingshot', hold: true },
});
RECIPES.push(
  { out: 'sign', n: 2, need: { sheet: 1 }, note: 'Place it, then write a few words on it. Everyone near it can read them.' },
  { out: 'sling', n: 1, need: { sheet: 1, iron: 1 }, note: 'Hold it and Use to shoot Rock at monsters from far away. Each shot uses 1 Rock.', once: true },
);
