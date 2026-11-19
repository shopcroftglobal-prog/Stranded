// The star map: real stars, real distances. Which worlds you can fly to, and what it costs.
import { profile } from './profile.js';

// where each star sits in our sky (right ascension, in hours) and how far it is (light years)
export const STARS = {
  sun: { name: 'The Sun', ra: 0, ly: 0, worlds: ['mars', 'moon', 'europa'] },
  proxima: { name: 'Proxima Centauri', ra: 14.5, ly: 4.24, worlds: ['proxima'] },
  trappist: { name: 'TRAPPIST-1', ra: 23.1, ly: 40.7, worlds: ['trappist1e'] },
  lhs: { name: 'LHS 1140', ra: 0.75, ly: 48.8, worlds: ['lhs1140b'] },
};
export const starOf = (w) => Object.keys(STARS).find(k => STARS[k].worlds.includes(w));

// engine needed: 1 = our Solar System, 2 = the nearest star, 3 = the far stars
export const ENGINE_NEED = { mars: 1, moon: 1, europa: 1, proxima: 2, trappist1e: 3, lhs1140b: 3 };
export const ENGINE_NAMES = ['', 'Repaired engine', 'Strong engine', 'Star engine'];
export const TANK_SIZE = [0, 3, 6];

// fuel cells for a trip
export function fuelFor(from, to) {
  if (from === to) return 0;
  const a = starOf(from), b = starOf(to);
  if (a === b) return (from === 'europa' || to === 'europa') ? 2 : 1;
  if (b === 'proxima' || a === 'proxima' && b === 'sun') return 3;
  return 5;
}

export const UPGRADES = [
  { id: 'tank', level: 2, name: 'Bigger fuel tank', need: { sheet: 6, crystal: 3, gold: 2 }, note: 'Holds 6 fuel cells instead of 3. Needed for the far stars.' },
  { id: 'engine', level: 2, name: 'Strong engine', need: { scale: 1, sheet: 6, crystal: 4 }, note: 'Reaches Proxima Centauri, the nearest star. Needs a Dragon scale.' },
  { id: 'engine', level: 3, name: 'Star engine', need: { scale: 2, gold: 4, gem: 2 }, note: 'Reaches TRAPPIST-1 and LHS 1140, 40 to 50 light years away. Needs 2 Dragon scales.' },
];

// can you fly from `from` to `to` right now? returns { ok, why }
export function canFly(from, to, has) {
  if (from === to) return { ok: false, why: 'You are here.' };
  const eng = profile.ship.engine;
  if (eng < ENGINE_NEED[to]) return { ok: false, why: `Needs the ${ENGINE_NAMES[ENGINE_NEED[to]]}.` };
  const f = fuelFor(from, to);
  if (f > TANK_SIZE[profile.ship.tank]) return { ok: false, why: `Needs ${f} fuel cells, but your tank holds ${TANK_SIZE[profile.ship.tank]}. Get the Bigger fuel tank.` };
  if (has('fuelcell') < f) return { ok: false, why: `Needs ${f} fuel cells. You have ${has('fuelcell')}.` };
  return { ok: true, why: `${f} fuel cell${f > 1 ? 's' : ''}` };
}
