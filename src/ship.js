// The crashed ship: a small lander made of blocks. Its broken parts change as you repair it.
import { B } from './blocks.js';
import { SPAWN_H } from './world.js';

export const SHIP_BASE = SPAWN_H + 1;

// returns Map("x,y,z" -> id) for a given set of installed parts
export function shipBlocks(fixed) {
  const m = new Map();
  const put = (x, y, z, id) => m.set(`${x},${SHIP_BASE + y},${z}`, id);
  // legs
  for (const x of [-3, 3]) for (const z of [-2, 2]) put(x, 0, z, B.SHIPDARK);
  // body
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) for (let y = 1; y <= 2; y++) put(x, y, z, B.SHIP);
  for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) put(x, 3, z, B.SHIP);
  // nose and windows
  for (let z = -1; z <= 1; z++) { put(-4, 1, z, B.SHIPDARK); put(-4, 2, z, fixed.computer ? B.GLASS_ON : B.GLASS_OFF); put(-3, 3, z, fixed.computer ? B.GLASS_ON : B.GLASS_OFF); }
  // engine at the back
  for (const z of [-1, 1]) for (let y = 1; y <= 2; y++) put(4, y, z, fixed.engine ? (fixed.launch ? B.ENGINE_ON : B.ENGINE) : B.BROKEN);
  for (let y = 1; y <= 2; y++) put(4, y, 0, B.SHIPDARK);
  // tail fin and antenna
  put(2, 4, 0, B.SHIPDARK); put(3, 3, 0, B.SHIPDARK); put(3, 4, 0, B.SHIPDARK);
  if (fixed.computer) put(-1, 4, 0, B.SHIPDARK);
  // the Wave beacon stands next to the ship
  put(-7, 0, 3, B.BEACON);
  // hole in the side
  for (let x = -1; x <= 1; x++) for (let y = 1; y <= 2; y++) put(x, y, 2, fixed.patch ? B.SHIP : B.BROKEN);
  // fuel tank on the other side
  for (let x = 0; x <= 1; x++) for (let y = 1; y <= 2; y++) put(x, y, -2, fixed.fueltank ? B.TANK : B.BROKEN);
  return m;
}

// where smoke comes from, for each part that is still broken
export const SMOKE_POINTS = {
  patch: [0.5, SHIP_BASE + 3, 3.2],
  engine: [5.2, SHIP_BASE + 2.5, 0.5],
  fueltank: [1, SHIP_BASE + 3, -2.2],
};

// blocks scattered around the crash: bits of hull you can pick up
export const DEBRIS = [[-8, 6], [7, -7], [11, 3], [-5, -9], [14, -2], [3, 10]];
