// Build plans: a whole castle tower, wall, gate or house in one go.
// Each plan lists blocks as [x, y, z, item]: x = to the right, y = up, z = away from you.
export const PLANS = [
  {
    id: 'tower', name: 'Castle tower', w: 5, note: 'A tall stone tower with a door, coloured windows, a banner and castle tops.',
    colours: ['berry', 'sky', 'leaf', 'sun', 'grape'], picks: 'glass and banner',
    make(c) {
      const out = [];
      for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
        if (x > 0 && x < 4 && z > 0 && z < 4) continue;                      // hollow
        if (z === 0 && x === 2 && y < 2) { if (y === 0) out.push([x, y, z, 'door']); continue; }
        if (y === 3 && (x === 2 || z === 2)) { out.push([x, y, z, `glass_${c}`]); continue; }
        out.push([x, y, z, 'castle']);
      }
      for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) if (x === 0 || x === 4 || z === 0 || z === 4) out.push([x, 6, z, (x + z) % 2 ? 'castle' : 'castletop']);
      out.push([1, 4, -1, `banner_${c}`], [3, 4, -1, `banner_${c}`]);
      out.push([2, 4, 2, `lamp_${c === 'sun' ? 'sun' : 'sun'}`]);
      return out;
    },
  },
  {
    id: 'wall', name: 'Castle wall', w: 7, note: 'A long wall with castle tops and banners.',
    colours: ['berry', 'sky', 'leaf', 'sun', 'grape', 'night'], picks: 'banners',
    make(c) {
      const out = [];
      for (let x = 0; x < 7; x++) {
        for (let y = 0; y < 4; y++) out.push([x, y, 0, 'castle']);
        out.push([x, 4, 0, x % 2 ? 'castle' : 'castletop']);
        if (x % 3 === 0) out.push([x, 2, -1, `banner_${c}`]);
      }
      return out;
    },
  },
  {
    id: 'gate', name: 'Castle gate', w: 7, note: 'A gatehouse with a gate that opens and closes, white pillars and lamps.',
    colours: ['sun', 'sky', 'leaf', 'berry', 'grape'], picks: 'lamps',
    make(c) {
      const out = [];
      for (let x = 0; x < 7; x++) for (let y = 0; y < 5; y++) {
        if (x === 3 && y < 2) { out.push([x, y, 0, 'gate']); continue; }
        if ((x === 2 || x === 4) && y < 4) { out.push([x, y, 0, 'pillar']); continue; }
        if ((x === 1 || x === 5) && y === 3) { out.push([x, y, 0, `lamp_${c}`]); continue; }
        out.push([x, y, 0, 'castle']);
      }
      for (let x = 0; x < 7; x++) out.push([x, 5, 0, x % 2 ? 'castletop' : 'castle']);
      return out;
    },
  },
  {
    id: 'house', name: 'Bright house', w: 5, note: 'A little house with painted walls, a coloured roof, a door, windows and a lamp.',
    colours: ['sky', 'leaf', 'sun', 'berry', 'grape', 'coral', 'snow'], picks: 'walls',
    make(c) {
      const out = [];
      const roof = { sky: 'berry', leaf: 'berry', sun: 'sky', berry: 'night', grape: 'coral', coral: 'sky', snow: 'berry' }[c];
      for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
        if (x > 0 && x < 4 && z > 0 && z < 4) continue;
        if (z === 0 && x === 2 && y < 2) { if (y === 0) out.push([x, y, z, 'door']); continue; }
        if (y === 1 && ((x === 0 || x === 4) && z === 2 || z === 4 && x === 2)) { out.push([x, y, z, 'window']); continue; }
        out.push([x, y, z, `wall_${c}`]);
      }
      for (let x = -1; x <= 5; x++) for (let z = -1; z <= 5; z++) out.push([x, 3, z, `roof_${roof}`]);
      for (let x = 0; x <= 4; x++) for (let z = 0; z <= 4; z++) out.push([x, 4, z, `roof_${roof}`]);
      for (let x = 1; x <= 3; x++) for (let z = 1; z <= 3; z++) out.push([x, 5, z, `roof_${roof}`]);
      out.push([2, 2, 3, 'lamp_sun']);
      return out;
    },
  },
];
// The wall plan's blocks use the old names for the first four painted walls
export const WALL_ALIAS = { wall_sky: 'skywall', wall_leaf: 'leafwall', wall_sun: 'sunwall', wall_berry: 'berrywall' };
export function planBlocks(plan, colour) {
  return plan.make(colour).map(([x, y, z, it]) => [x, y, z, WALL_ALIAS[it] || it]);
}
