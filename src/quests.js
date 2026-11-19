// Daily quests (three small goals a day) and badges for big moments.
// The game calls track('mine'), track('wave') and so on; this file counts them.
import { profile, saveProfile } from './profile.js';

const QUESTS = [
  { id: 'mine', text: (n) => `Dig ${n} blocks`, n: [40, 80, 120], coins: 30 },
  { id: 'place', text: (n) => `Place ${n} blocks`, n: [30, 60], coins: 30 },
  { id: 'make', text: (n) => `Make ${n} things in your bag`, n: [3, 6], coins: 30 },
  { id: 'wave', text: (n) => `Clear ${n} wave${n > 1 ? 's' : ''}`, n: [1, 3], coins: 60 },
  { id: 'find', text: (n) => `Catch ${n} friendly find${n > 1 ? 's' : ''}`, n: [1, 3], coins: 40 },
  { id: 'sell', text: (n) => `Sell ${n} things to the Trader`, n: [5, 10], coins: 40 },
  { id: 'rig', text: () => 'Empty a mining rig', n: [1], coins: 40 },
  { id: 'race', text: (n) => `Finish ${n} Star Kart race${n > 1 ? 's' : ''}`, n: [1, 2], coins: 50 },
  { id: 'eat', text: () => 'Eat a Moss fruit', n: [1], coins: 30 },
  { id: 'build', text: () => 'Build something from a build plan', n: [1], coins: 50 },
  { id: 'scan', text: (n) => `Use your scanner ${n} times`, n: [3], coins: 25 },
  { id: 'camp', text: () => "Visit the Friends' camp", n: [1], coins: 30 },
];
export const ALL_DONE_BONUS = { coins: 100, items: { gem: 1, fuelcell: 1 } };

export const BADGES = [
  { id: 'firstdig', name: 'First dig', note: 'Dig your first block.' },
  { id: 'fixed', name: 'Back in the sky', note: 'Fix your ship and take off.' },
  { id: 'wave10', name: 'Stage one', note: 'Clear wave 10 on any world.' },
  { id: 'wave25', name: 'Halfway there', note: 'Clear wave 25 on any world.' },
  { id: 'dragon', name: 'Dragon beater', note: 'Beat a dragon.' },
  { id: 'dragons6', name: 'Dragon master', note: 'Beat the dragon on all six worlds.' },
  { id: 'worlds', name: 'Star traveller', note: 'Visit all six worlds.' },
  { id: 'legend', name: 'Legend', note: 'Make a legendary weapon or armour.' },
  { id: 'treasure', name: 'Lucky dig', note: 'Get a legendary treasure from a rig.' },
  { id: 'rigs3', name: 'Mining boss', note: 'Have three mining rigs at once.' },
  { id: 'starhome', name: 'Star home', note: 'Raise a home to Star home.' },
  { id: 'castle', name: 'Castle maker', note: 'Build a castle tower.' },
  { id: 'racewin', name: 'Fastest kart', note: 'Win a Star Kart race.' },
  { id: 'friend', name: 'Good friend', note: 'Give a gift to a friend.' },
  { id: 'rich', name: 'Coin pile', note: 'Have 1,000 coins.' },
  { id: 'book30', name: 'Collector', note: 'Fill 30 places in your book.' },
  { id: 'streak7', name: 'Every day', note: 'Open your daily gift 7 days in a row.' },
  { id: 'pet', name: 'Best friend', note: 'Take a pet along with you.' },
  { id: 'quests', name: 'Busy day', note: 'Finish all three daily quests.' },
];
const BADGE_COINS = 50;

const today = () => new Date().toDateString();
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// today's three quests (the same for everyone on the same day)
export function dailyQuests() {
  const d = today();
  if (!profile.daily || profile.daily.day !== d) {
    let h = hashStr(d);
    const pool = [...QUESTS], out = [];
    while (out.length < 3) {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      const q = pool.splice(h % pool.length, 1)[0];
      const n = q.n[(h >>> 8) % q.n.length];
      out.push({ id: q.id, need: n, have: 0, claimed: false });
    }
    profile.daily = { day: d, quests: out, bonus: false };
    saveProfile();
  }
  return profile.daily;
}
export const questText = (q) => QUESTS.find(x => x.id === q.id).text(q.need);
export const questCoins = (q) => QUESTS.find(x => x.id === q.id).coins;

export function createQuests(ui) {
  // ui: { toast, banner, give, sfx }
  function track(ev, n = 1) {
    const dq = dailyQuests();
    for (const q of dq.quests) if (q.id === ev && q.have < q.need) {
      q.have = Math.min(q.need, q.have + n);
      if (q.have >= q.need) { ui.sfx.coin(); ui.toast(`Daily quest done: ${questText(q)}! Claim it in your book (B).`); }
    }
    // badges that come straight from an event
    const map = { mine: 'firstdig', dragon: 'dragon', castle: 'castle', racewin: 'racewin', gift: 'friend', legend: 'legend', treasure: 'treasure', fixed: 'fixed' };
    if (map[ev]) badge(map[ev]);
    saveProfile();
  }
  function claim(i) {
    const q = dailyQuests().quests[i];
    if (!q || q.claimed || q.have < q.need) return false;
    q.claimed = true;
    const c = questCoins(q); profile.coins += c;
    ui.sfx.coin();
    const dq = profile.daily;
    if (dq.quests.every(x => x.claimed) && !dq.bonus) {
      dq.bonus = true; profile.coins += ALL_DONE_BONUS.coins;
      for (const [k, m] of Object.entries(ALL_DONE_BONUS.items)) ui.give(k, m);
      ui.banner('All daily quests done!', `+${c + ALL_DONE_BONUS.coins} coins, a Gem and a Fuel cell. New quests tomorrow.`);
      badge('quests');
    } else ui.toast(`+${c} coins`);
    saveProfile();
    return true;
  }
  function badge(id) {
    profile.badges = profile.badges || {};
    if (profile.badges[id]) return false;
    const b = BADGES.find(x => x.id === id); if (!b) return false;
    profile.badges[id] = Date.now();
    profile.coins += BADGE_COINS;
    saveProfile();
    ui.sfx.win();
    ui.banner(`Badge: ${b.name}!`, `${b.note} +${BADGE_COINS} coins.`);
    return true;
  }
  // badges that come from how far you are: checked every few seconds
  function check(s) {
    const w = Object.values(profile.waves || {});
    if (w.some(n => n >= 10)) badge('wave10');
    if (w.some(n => n >= 25)) badge('wave25');
    if (w.filter(n => n >= 50).length >= 6) badge('dragons6');
    if (Object.keys(profile.visited || {}).length >= 6) badge('worlds');
    if (Object.keys(profile.rigs || {}).length >= 3) badge('rigs3');
    if (profile.homeSlot) badge('starhome');
    if (profile.coins >= 1000) badge('rich');
    if (profile.gift && profile.gift.streak >= 7) badge('streak7');
    let book = 0; for (const w2 in profile.book) book += Object.keys(profile.book[w2]).length;
    if (book >= 30) badge('book30');
    if (s && s.won) badge('fixed');
  }
  return { track, claim, badge, check };
}
