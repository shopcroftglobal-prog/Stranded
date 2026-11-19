// Things that bring players back: pilot level with rewards on every level, a lucky wheel
// (one free spin a day, more from levelling up), a free chest every 4 hours, and lucky digs.
import { profile, saveProfile } from './profile.js';

// how much each thing you do moves your level bar
export const XP = {
  mine: 1, place: 1, build: 2, make: 4, eat: 2, scan: 2, sell: 1, drive: 1, camp: 5,
  find: 12, imp: 10, gift: 6, rig: 20, treasure: 25, wave: 30, castle: 40, legend: 80, fixed: 150, dragon: 400,
};
export const need = (lv) => 40 + lv * 25;
export const CHEST_EVERY = 4 * 3600 * 1000;

// what each new level gives (shown on the rewards road)
export function levelGift(lv) {
  const g = { coins: 20 + lv * 10, spins: 1, items: {} };
  if (lv % 3 === 0) g.items.fuelcell = 2;
  if (lv % 5 === 0) g.items.gem = 1;
  if (lv % 10 === 0) { g.coins += 500; g.items.gem = 3; g.big = true; }
  return g;
}

export const WHEEL = [
  { t: '50', sub: 'coins', coins: 50, w: 22, c: '#c9662d' },
  { t: '2', sub: 'Fuel cells', items: { fuelcell: 2 }, w: 14, c: '#3f7f8a' },
  { t: '100', sub: 'coins', coins: 100, w: 18, c: '#d99a2b' },
  { t: 'Chest', sub: 'big', chest: 2, w: 10, c: '#7a4a9c' },
  { t: '250', sub: 'coins', coins: 250, w: 12, c: '#b8452e' },
  { t: 'Gem', sub: '', items: { gem: 1 }, w: 9, c: '#2f8f5b' },
  { t: '500', sub: 'coins', coins: 500, w: 6, c: '#c7334f' },
  { t: '1000', sub: 'JACKPOT', coins: 1000, w: 3, c: '#e8c547' },
];

const today = () => new Date().toDateString();

export function createHooks(ctx) {
  // ctx: { give(k, n), toast, banner, sfx, ITEMS, icon(k), burst(), onChange() }
  const H = () => profile.hk || (profile.hk = { xp: 0, lv: 1, spins: 0, spinDay: '', chestAt: 0, lucky: 0, spun: 0 });
  let spinning = false, wheelAngle = 0;

  function pay(coins, items) {
    if (coins) profile.coins += coins;
    for (const k in items || {}) ctx.give(k, items[k]);
  }
  const words = (coins, items) => [coins ? `${coins} coins` : '', ...Object.entries(items || {}).map(([k, n]) => `${n} ${ctx.ITEMS[k].name}`)].filter(Boolean).join(', ');

  function addXP(ev, n = 1) {
    const x = (XP[ev] || 0) * n;
    if (!x) return;
    const h = H();
    h.xp += x;
    let ups = 0;
    while (h.xp >= need(h.lv)) { h.xp -= need(h.lv); h.lv++; ups++; levelUp(h.lv); }
    saveProfile();
    ctx.onChange();
    return ups;
  }
  function levelUp(lv) {
    const h = H(), g = levelGift(lv);
    h.spins += g.spins;
    pay(g.coins, g.items);
    ctx.sfx.win(); ctx.burst();
    ctx.banner(`Level ${lv}!`, `+${words(g.coins, g.items)} and a free spin on the Lucky wheel. Press R to spin.`);
  }

  // ---- the Lucky wheel
  const freeSpin = () => H().spinDay !== today();
  const spinsLeft = () => H().spins + (freeSpin() ? 1 : 0);
  function pick() {
    const tot = WHEEL.reduce((a, s) => a + s.w, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r < 0) return i; }
    return 0;
  }
  function spin(done) {
    if (spinning || spinsLeft() <= 0) return false;
    const h = H();
    if (freeSpin()) h.spinDay = today(); else h.spins--;
    h.spun = (h.spun || 0) + 1;
    saveProfile();
    const i = pick(), seg = 360 / WHEEL.length;
    const target = 360 * 5 + (360 - (i + 0.5) * seg) + (Math.random() - 0.5) * seg * 0.6;
    wheelAngle = wheelAngle - (wheelAngle % 360) + target;
    spinning = true;
    const cv = document.getElementById('wheel');
    if (cv) { cv.style.transition = 'transform 3.6s cubic-bezier(.12,.75,.15,1)'; cv.style.transform = `rotate(${wheelAngle}deg)`; }
    let ticks = 0; const tk = setInterval(() => { if (++ticks > 16) clearInterval(tk); ctx.sfx.pickup && ctx.sfx.pickup(); }, 200);
    setTimeout(() => {
      spinning = false;
      const s = WHEEL[i];
      let got = '';
      if (s.chest) got = openChest(true);
      else { pay(s.coins, s.items); got = words(s.coins, s.items); }
      ctx.sfx.win(); ctx.burst();
      ctx.banner(s.coins >= 1000 ? 'JACKPOT!' : 'You won!', got);
      saveProfile(); ctx.onChange();
      done && done(i, got);
    }, document.getElementById('wheel') ? 3700 : 0);
    return i;
  }
  function drawWheel(cv) {
    const g = cv.getContext('2d'), W = cv.width, R = W / 2, seg = Math.PI * 2 / WHEEL.length;
    g.clearRect(0, 0, W, W);
    WHEEL.forEach((s, i) => {
      // slice i is centred at the top when the wheel is turned by -(i+0.5)*seg
      const a0 = -Math.PI / 2 + i * seg;
      g.beginPath(); g.moveTo(R, R); g.arc(R, R, R - 6, a0, a0 + seg); g.closePath();
      g.fillStyle = s.c; g.fill(); g.lineWidth = 3; g.strokeStyle = '#2a140c'; g.stroke();
      g.save(); g.translate(R, R); g.rotate(a0 + seg / 2 + Math.PI / 2);
      g.fillStyle = '#fff6e8'; g.textAlign = 'center';
      g.font = `bold ${Math.round(W / 13)}px system-ui, sans-serif`; g.fillText(s.t, 0, -R * 0.62);
      g.font = `${Math.round(W / 24)}px system-ui, sans-serif`; g.fillText(s.sub, 0, -R * 0.62 + W / 18);
      g.restore();
    });
    g.beginPath(); g.arc(R, R, R * 0.14, 0, Math.PI * 2); g.fillStyle = '#2a140c'; g.fill();
    g.beginPath(); g.arc(R, R, R * 0.09, 0, Math.PI * 2); g.fillStyle = '#e8c547'; g.fill();
    // little lights around the rim
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; g.beginPath(); g.arc(R + Math.cos(a) * (R - 3), R + Math.sin(a) * (R - 3), 3, 0, Math.PI * 2); g.fillStyle = k % 2 ? '#fff3c4' : '#ffb347'; g.fill(); }
  }

  // ---- the free chest (every 4 hours)
  const chestReady = () => Date.now() >= (H().chestAt || 0);
  function openChest(big = false) {
    if (!big && !chestReady()) return '';
    if (!big) H().chestAt = Date.now() + CHEST_EVERY;
    const pool = ['iron', 'iron', 'crystal', 'crystal', 'sheet', 'sheet', 'fuelcell', 'gold'];
    const items = {};
    const n = big ? 4 : 3;
    for (let k = 0; k < n; k++) { const it = pool[Math.floor(Math.random() * pool.length)]; items[it] = (items[it] || 0) + 1 + Math.floor(Math.random() * (big ? 4 : 3)); }
    if (Math.random() < (big ? 0.6 : 0.25)) items.gem = (items.gem || 0) + 1;
    const coins = (big ? 150 : 40) + Math.floor(Math.random() * (big ? 200 : 90));
    pay(coins, items);
    saveProfile(); ctx.onChange();
    if (!big) { ctx.sfx.win(); ctx.burst(); ctx.banner('Free chest!', `${words(coins, items)}. The next one is ready in 4 hours.`); }
    return words(coins, items);
  }
  function chestWait() {
    const ms = Math.max(0, (H().chestAt || 0) - Date.now());
    const tot = Math.ceil(ms / 60000), h = Math.floor(tot / 60), m = tot % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  }

  // ---- lucky digs: now and then a dug block hides coins (or, very rarely, a Gem)
  function dug() {
    const r = Math.random();
    if (r > 0.04) return null;
    const h = H(); h.lucky = (h.lucky || 0) + 1;
    if (r < 0.004) { ctx.give('gem', 1); saveProfile(); return 'Lucky find: a Gem!'; }
    const c = 5 + Math.floor(Math.random() * 21);
    profile.coins += c; saveProfile(); ctx.onChange();
    return `Lucky find! +${c} coins`;
  }

  // something waiting for you (shown as a dot on the Prizes button)
  const waiting = () => spinsLeft() > 0 || chestReady();

  function render(el) {
    const h = H();
    const road = [];
    for (let lv = h.lv + 1; lv <= h.lv + 8; lv++) {
      const g = levelGift(lv);
      road.push(`<div class="rstep${g.big ? ' big' : ''}"><div class="rlv">Lv ${lv}</div><div>${g.coins} coins</div>${Object.entries(g.items).map(([k, n]) => `<div><img src="${ctx.icon(k)}" alt=""> ${n} ${ctx.ITEMS[k].name}</div>`).join('')}<div class="rspin">+1 spin</div></div>`);
    }
    el.innerHTML = `
      <div class="lvhead"><b>Level ${h.lv}</b><div class="xpbar"><div style="width:${Math.min(100, h.xp / need(h.lv) * 100)}%"></div></div><span>${h.xp} / ${need(h.lv)}</span></div>
      <p class="sub">Everything you do fills your bar: digging, building, making things, beating imps and waves. Every level gives coins and a free spin.</p>
      <div class="prizes">
        <div class="wheelbox"><div class="wpin"></div><canvas id="wheel" width="300" height="300" style="transform:rotate(${wheelAngle}deg)"></canvas>
          <button id="spinBtn" ${spinsLeft() > 0 && !spinning ? '' : 'disabled'}>${spinsLeft() > 0 ? `Spin! (${spinsLeft()} left${freeSpin() ? ', 1 free today' : ''})` : 'No spins left. Level up or come back tomorrow'}</button></div>
        <div class="chestbox"><div class="chesticon${chestReady() ? ' ready' : ''}"></div>
          <button id="chestBtn" ${chestReady() ? '' : 'disabled'}>${chestReady() ? 'Open free chest' : `Next free chest in ${chestWait()}`}</button>
          <p class="sub">A free chest every 4 hours.</p></div>
      </div>
      <h4>Rewards road</h4><div class="road">${road.join('')}</div>`;
    drawWheel(el.querySelector('#wheel'));
    el.querySelector('#spinBtn').onclick = () => { if (spin(() => render(el))) el.querySelector('#spinBtn').disabled = true; };
    el.querySelector('#chestBtn').onclick = () => { openChest(); render(el); };
  }

  return { addXP, spin, openChest, chestReady, spinsLeft, dug, waiting, render, get h() { return H(); }, need };
}
