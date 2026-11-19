// Making a home: a Home flag marks it. The more cosy things you put near the flag,
// the higher your home level, and each level gives you something new.
// Also: gardens that grow while you are away, and a gift for coming back each day.
import { B, COLOURFUL } from './blocks.js';
import { profile, saveProfile } from './profile.js';

export const HOME_R = 12;            // how far your home reaches from the flag
export const GROW_MIN = 6;           // minutes for a garden to grow (half at a Cosy home)

export const LEVELS = [
  { at: 0, name: 'Camp', perk: 'Creatures can not break your walls here, and you come back here if you fall.', coins: 0 },
  { at: 8, name: 'Shelter', perk: 'No night creatures inside your home, and you heal faster here.', coins: 60 },
  { at: 16, name: 'Cosy home', perk: 'Your air never runs out at home, and gardens grow twice as fast.', coins: 120 },
  { at: 26, name: 'Fine home', perk: 'The Trader lands at your home and pays 20% more.', coins: 200 },
  { at: 38, name: 'Star home', perk: 'A free extra mining rig slot, and double daily gifts.', coins: 400 },
];

// what makes a home cosy: [points each, most that count]
const COSY = [
  ['Bed', [B.BED], 4, 1],
  ['Door', [B.DOOR, B.DOOR_OPEN], 2, 2],
  ['Window', [B.WINDOW], 1, 6],
  ['Crystal lamp', [B.LAMP], 1, 6],
  ['Storage box', [B.BOX], 1, 3],
  ['Forge', [B.FORGE], 2, 1],
  ['Air maker', [B.AIRMAKER], 2, 1],
  ['Garden bed', [B.GARDEN, B.GARDEN_RIPE], 2, 4],
  ['Colourful blocks (each kind)', COLOURFUL, 1, 12, 'kinds'],
  ['Castle pieces (each kind)', [B.CASTLE, B.CASTLE_TOP, B.PILLAR, B.GATE, B.RAIL, B.FLOOR_CHECK, B.FLOOR_SKY], 1, 6, 'kinds'],
  ['Gold block', [B.GOLDBLOCK], 1, 3],
  ['Dragon trophy', [B.TROPHY], 4, 6],
  ['Mining rig', [B.RIG], 1, 2],
];
export const COSY_LIST = COSY.map(([name, , pts, max]) => ({ name, pts, max }));

export const flagOf = (state) => state.flag || null;

// count everything near the flag
export function comfort(world, flag) {
  const n = new Map();
  if (!flag) return { score: 0, rows: [] };
  for (let x = -HOME_R; x <= HOME_R; x++) for (let z = -HOME_R; z <= HOME_R; z++) for (let y = -4; y <= 10; y++) {
    const id = world.get(flag.x + x, flag.y + y, flag.z + z);
    if (id) n.set(id, (n.get(id) || 0) + 1);
  }
  let score = 0;
  const rows = COSY.map(([name, ids, pts, max, mode]) => {
    const c = mode === 'kinds' ? ids.filter(id => n.get(id)).length : ids.reduce((a, id) => a + (n.get(id) || 0), 0);
    const got = Math.min(max, c) * pts;
    score += got;
    return { name, count: c, pts: got, max: max * pts };
  });
  return { score, rows };
}
export function levelOf(score) { let lv = 0; LEVELS.forEach((L, i) => { if (score >= L.at) lv = i; }); return lv; }

export function atHome(state, p) {
  const f = state.flag;
  return !!f && Math.abs(p.x - (f.x + 0.5)) <= HOME_R + 0.5 && Math.abs(p.z - (f.z + 0.5)) <= HOME_R + 0.5 && p.y > f.y - 6 && p.y < f.y + 14;
}

// ---- daily gift (one per day for your whole game, from any home flag)
const dayKey = (d = new Date()) => d.toDateString();
export const giftReady = () => !profile.gift || profile.gift.day !== dayKey();
export function claimGift(lv) {
  const today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
  const g = profile.gift || {};
  const streak = g.day === dayKey(y) ? (g.streak || 0) + 1 : 1;
  const x2 = lv >= 4 ? 2 : 1;
  const coins = (20 + 15 * lv + 10 * Math.min(streak - 1, 6)) * x2;
  const items = { fruit: 2 * x2 };
  if (lv >= 1) items.sheet = 2 * x2;
  if (lv >= 2) items.fuelcell = 1 * x2;
  if (lv >= 3 || streak >= 7) items.gem = 1 * x2;
  profile.coins += coins;
  profile.gift = { day: today, streak };
  saveProfile();
  return { coins, items, streak };
}

// ---- gardens: state.gardens[key] = time planted
export function growTime(lv) { return GROW_MIN * 60000 / (lv >= 2 ? 2 : 1); }
export function updateGardens(world, state, lv, now = Date.now()) {
  const g = state.gardens || (state.gardens = {});
  let changed = 0;
  for (const k in g) {
    const [x, y, z] = k.split(',').map(Number);
    const id = world.get(x, y, z);
    if (id !== B.GARDEN && id !== B.GARDEN_RIPE) { delete g[k]; continue; }
    if (id === B.GARDEN && now - g[k] >= growTime(lv)) { world.set(x, y, z, B.GARDEN_RIPE); changed++; }
  }
  return changed;
}
