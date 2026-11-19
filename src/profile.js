// Your progress across all worlds: coins, worlds you can fly to, waves cleared,
// ship upgrades, weapons you carry, and the Collection book. Saved in the browser.
const KEY = 'stranded-profile-v1';

export const WORLD_ORDER = ['mars', 'moon', 'europa', 'proxima', 'trappist1e', 'lhs1140b'];
// How hard each world's waves are (creatures have more health and hit harder)
export const WORLD_POWER = { mars: 1, moon: 1.35, europa: 1.7, proxima: 2.2, trappist1e: 2.7, lhs1140b: 3.2 };

const fresh = () => ({
  v: 1, coins: 0,
  visited: {},            // worlds you have been on
  waves: {},              // world -> waves cleared (0..50)
  ship: { tank: 1, engine: 1 },
  gear: { weapon: null, shield: null },   // best weapon and shield you carry (item ids)
  owned: {},              // weapons and shields you own
  book: {},               // world -> { thing: true }
  scanner: 0,             // 0 = none, 1 = made, 2 = upgraded
  buddy: false,
  wish: false,            // Star moth: double rewards on the next wave
  rigs: {},               // mining rigs on every world
  rigSlots: 0,            // rig slots bought on top of the free ones
  free: false,            // free roam: no air loss, no night creatures, you can fly
});

export let profile = fresh();

export function loadProfile() {
  try {
    const s = localStorage.getItem(KEY);
    profile = s ? Object.assign(fresh(), JSON.parse(s)) : fresh();
  } catch (e) { profile = fresh(); }
  profile.ship = Object.assign({ tank: 1, engine: 1 }, profile.ship);
  profile.gear = Object.assign({ weapon: null, shield: null }, profile.gear);
  return profile;
}
export function saveProfile() {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) { }
}
export function resetProfile() { profile = fresh(); saveProfile(); return profile; }

// Remember something in the Collection book. Returns true the first time.
export function note(world, thing) {
  const b = profile.book[world] || (profile.book[world] = {});
  if (b[thing]) return false;
  b[thing] = true; saveProfile();
  return true;
}
export const wavesOn = (world) => profile.waves[world] || 0;
