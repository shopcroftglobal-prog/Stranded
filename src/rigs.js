// Mining rigs: place one on the ground and it slowly digs up what is under it,
// even while you are away. Rigs live in your profile, so they keep working on every world.
import { B } from './blocks.js';
import { profile, saveProfile } from './profile.js';

export const FREE_RIGS = 2;          // the first two rigs are free
export const RIG_SLOT_COINS = 250;   // each rig after that needs a new slot
export const RIG_MINUTES = 3;        // one find every 3 minutes
export const RIG_CAP = 200;          // a rig stops when it holds this many things

const ORE_ITEM = { [B.IRON]: 'iron', [B.CRYSTAL]: 'crystal', [B.GOLD]: 'gold', [B.SALT]: 'salt', [B.GLASS]: 'glass', [B.ICE]: 'ice' };
const WEIGHT = { iron: 6, ice: 4, crystal: 2, salt: 3, glass: 3, gold: 1.5, rock: 5 };

export const rigSlots = () => FREE_RIGS + (profile.rigSlots || 0) + (profile.homeSlot ? 1 : 0);
export const rigList = () => Object.entries(profile.rigs || {});
export const rigCount = () => rigList().length;

// look at the ground under the rig and remember what it can dig
export function placeRig(world, worldId, x, y, z) {
  const found = {};
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let yy = y - 1; yy > Math.max(0, y - 24); yy--) {
    const it = ORE_ITEM[world.get(x + dx, yy, z + dz)];
    if (it) found[it] = (found[it] || 0) + 1;
  }
  const ores = { rock: 1 };
  for (const k in found) ores[k] = Math.min(4, 1 + Math.floor(found[k] / 4));
  profile.rigs = profile.rigs || {};
  profile.rigs[`${worldId}|${x},${y},${z}`] = { t: Date.now(), store: {}, ores };
  saveProfile();
  return ores;
}
export function removeRig(worldId, x, y, z) {
  const k = `${worldId}|${x},${y},${z}`, r = profile.rigs && profile.rigs[k];
  if (!r) return {};
  accrue(r); delete profile.rigs[k]; saveProfile();
  return r.store;
}
export const rigAt = (worldId, x, y, z) => profile.rigs && profile.rigs[`${worldId}|${x},${y},${z}`];

// small seeded random so the same time always gives the same finds
function rand(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// Treasures only rigs dig up. You will never find these by mining, in wave chests or at the Trader.
export const RIG_TREASURE = [
  ['shard', 0.02], ['pearl', 0.015], ['ember', 0.015],   // super rare
  ['sunheart', 0.004], ['shadow', 0.004],                 // legendary
];
export const FIRST_LUCKY = 10;       // each new rig's first 10 finds are 5x as lucky
export const AD_CUT = 0.8;           // watching an ad cuts the wait by 80%...
export const AD_HOURS = 1;           // ...for one hour
export const ADS_PER_DAY = 3;

// add what a rig dug since it was last checked. Returns what was added.
export function accrue(r, now = Date.now()) {
  const base = RIG_MINUTES * 60000, fast = base * (1 - AD_CUT);
  const got = {};
  let held = Object.values(r.store).reduce((a, b) => a + b, 0);
  const pool = Object.entries(r.ores).map(([k, lv]) => [k, WEIGHT[k] * lv]);
  const sum = pool.reduce((a, p) => a + p[1], 0);
  let changed = false;
  while (held < RIG_CAP) {
    const step = r.t < (r.boostUntil || 0) ? fast : base;
    if (r.t + step > now) break;
    r.t += step; changed = true;
    const R = rand(r.t ^ 0x5bd1e995);
    let pick = null;
    // the very first find from your very first rig is always a Star shard
    if (!profile.firstShard) { pick = 'shard'; profile.firstShard = true; }
    const luck = (r.count || 0) < FIRST_LUCKY ? 5 : 1;
    if (!pick) { let x = R(); for (const [k, c] of RIG_TREASURE) { x -= c * luck; if (x < 0) { pick = k; break; } } }
    if (!pick && R() < 0.03) pick = 'gem';
    if (!pick) { let x = R() * sum; pick = pool[0][0]; for (const [k, w] of pool) { x -= w; if (x <= 0) { pick = k; break; } } }
    r.count = (r.count || 0) + 1;
    r.store[pick] = (r.store[pick] || 0) + 1; got[pick] = (got[pick] || 0) + 1; held++;
  }
  // a full rig waits; it starts again from now once you empty it
  if (held >= RIG_CAP) r.t = Math.max(r.t, now);
  if (changed) saveProfile();
  return got;
}
// time until the next find, in ms
export function nextFindIn(r, now = Date.now()) {
  const base = RIG_MINUTES * 60000, step = r.t < (r.boostUntil || 0) ? base * (1 - AD_CUT) : base;
  return Math.max(0, r.t + step - now);
}
// watching an ad: all rigs dig 5x as fast for an hour
export function adsLeft() {
  const day = new Date().toDateString(), a = profile.ads || {};
  return a.day === day ? Math.max(0, ADS_PER_DAY - a.n) : ADS_PER_DAY;
}
export function adBoost(now = Date.now()) {
  if (adsLeft() <= 0) return false;
  for (const [, r] of rigList()) { accrue(r, now); r.boostUntil = Math.max(now, r.boostUntil || 0) + AD_HOURS * 3600000; }
  const day = new Date().toDateString(), a = profile.ads || {};
  profile.ads = { day, n: (a.day === day ? a.n : 0) + 1 };
  saveProfile();
  return true;
}
export const boostLeft = (now = Date.now()) => Math.max(0, ...rigList().map(([, r]) => (r.boostUntil || 0) - now));
export function rigTotals() {
  const t = {};
  for (const [, r] of rigList()) for (const k in r.store) t[k] = (t[k] || 0) + r.store[k];
  return t;
}
// all rigs on all worlds: bring them up to now. Returns what is new since you last looked.
export function accrueAll() {
  for (const [, r] of rigList()) accrue(r);
  const now = rigTotals(), seen = profile.rigSeen || {}, got = {};
  for (const k in now) if (now[k] > (seen[k] || 0)) got[k] = now[k] - (seen[k] || 0);
  profile.rigSeen = now;
  saveProfile();
  return got;
}
export function markSeen() { profile.rigSeen = rigTotals(); saveProfile(); }
