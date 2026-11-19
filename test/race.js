const { chromium } = require('playwright');
const path = require('path');
// a stand-in for the claude.ai room, shared between pages in one browser with BroadcastChannel
const MOCK = `(() => {
  const me = 'p' + Math.random().toString(36).slice(2, 8);
  const rooms = {};
  function mk(name) {
    const bc = new BroadcastChannel('room-' + name);
    const peers = new Map(); let mine = {}; const subs = {}, psubs = [];
    const snap = () => [...peers.values()].map(p => ({ ...p, isMe: p.peer === me, sameTab: p.peer === me, kind: 'viewer', by: null, guest: false }));
    const fire = () => psubs.forEach(f => f({ peers: snap(), joined: [], left: [], updated: [] }));
    peers.set(me, { peer: me, presence: {} });
    bc.onmessage = (e) => { const d = e.data;
      if (d.type === 'p') { peers.set(d.peer, { peer: d.peer, presence: d.presence }); fire(); }
      if (d.type === 'hello') bc.postMessage({ type: 'p', peer: me, presence: mine });
      if (d.type === 'e') (subs[d.topic] || []).forEach(f => f({ topic: d.topic, data: d.data, peer: d.peer, isMe: false, sameTab: false, kind: 'viewer', by: null, guest: false })); };
    bc.postMessage({ type: 'hello' });
    return { name, emit: async (topic, data) => { bc.postMessage({ type: 'e', topic, data, peer: me }); (subs[topic] || []).forEach(f => f({ topic, data, peer: me, isMe: true, sameTab: true, kind: 'viewer' })); },
      on: (t, f) => { (subs[t] = subs[t] || []).push(f); return () => {}; },
      presence: async (patch) => { mine = { ...mine, ...patch }; for (const k in mine) if (mine[k] === null) delete mine[k]; peers.set(me, { peer: me, presence: mine }); bc.postMessage({ type: 'p', peer: me, presence: mine }); fire(); },
      peers: snap, onPeers: (f) => { psubs.push(f); setTimeout(fire, 0); return () => {}; }, connected: () => true, onConnection: () => () => {}, leave: async () => {} };
  }
  const room = Object.assign(mk('lobby'), { join: async (n) => rooms[n] || (rooms[n] = mk(n)) });
  window.claude = { use: async (n) => n === 'room' ? room : null };
})();`;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.addInitScript(MOCK);
  const errs = [];
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot';
  const a = await ctx.newPage(); a.on('pageerror', e => errs.push('A ' + e.message));
  await a.goto(url); await a.waitForTimeout(1000);
  await a.evaluate(() => document.getElementById('raceBtn').click());
  await a.waitForTimeout(800);
  await a.screenshot({ path: 'shots/race_menu.png' });
  // solo race
  await a.evaluate(() => document.getElementById('rBots').click());
  await a.waitForTimeout(500);
  await a.screenshot({ path: 'shots/race_grid.png' });
  await a.waitForFunction(() => __game.race.state === 'race', null, { timeout: 60000 });
  await a.keyboard.down('KeyW');
  await a.evaluate(() => { setInterval(() => { const r = __game.race, me = r.me, T = r.T; if (!me) return; const p = T.P[(me.idx + 12) % T.P.length]; let w = Math.atan2(p.x - me.x, p.z - me.z) - me.h; w = Math.atan2(Math.sin(w), Math.cos(w)); const ev = (c, d) => window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: c })); ev('KeyA', w > 0.08); ev('KeyD', w < -0.08); }, 50); });
  await a.waitForTimeout(6000);
  await a.screenshot({ path: 'shots/race_road.png' });
  console.log('SOLO', await a.evaluate(() => JSON.stringify(__game.race.karts.map(k => [k.name, k.idx, k.lap, Math.round(k.v), k.power]))));
  await a.evaluate(() => { const r = __game.race; r.me.power = 'shot'; r.usePower(); });
  await a.waitForTimeout(300);
  await a.screenshot({ path: 'shots/race_drive.png' });
  // jump to the last stretch of the last lap
  await a.evaluate(() => { const r = __game.race, me = r.me, T = r.T; me.lap = 2; me.half = true; const k = T.P.length - 30; me.idx = k; me.x = T.P[k].x; me.z = T.P[k].z; me.h = Math.atan2(T.tan[k].x, T.tan[k].z); });
  await a.waitForFunction(() => __game.race.state === 'end', null, { timeout: 90000 });
  await a.keyboard.up('KeyW');
  await a.waitForTimeout(300);
  await a.screenshot({ path: 'shots/race_end.png' });
  console.log('END', await a.evaluate(() => document.getElementById('rEndTitle').textContent + ' | ' + document.getElementById('rEndCoins').textContent));
  // online: two pages
  await a.evaluate(() => document.getElementById('rAgain').click());
  await a.waitForTimeout(500);
  const b = await ctx.newPage(); b.on('pageerror', e => errs.push('B ' + e.message));
  await b.goto(url); await b.waitForTimeout(1000);
  await b.evaluate(() => document.getElementById('raceBtn').click()); await b.waitForTimeout(300);
  await a.evaluate(() => document.getElementById('rOnline').click());
  await b.evaluate(() => document.getElementById('rOnline').click());
  await a.waitForTimeout(800);
  await a.evaluate(() => document.getElementById('rReady').click());
  await b.evaluate(() => document.getElementById('rReady').click());
  await a.waitForTimeout(800);
  await a.screenshot({ path: 'shots/race_lobby.png' });
  console.log('LOBBY', await a.evaluate(() => document.getElementById('rLobbyMsg').textContent));
  await a.evaluate(() => document.getElementById('rStart').click());
  await a.waitForTimeout(1500);
  console.log('ONLINE', await b.evaluate(() => JSON.stringify(__game.race.karts.map(k => [k.name, k.me, k.remote, k.bot]))));
  await a.waitForFunction(() => __game.race.state === 'race', null, { timeout: 60000 });
  await b.waitForFunction(() => __game.race.state === 'race', null, { timeout: 60000 });
  await a.keyboard.down('KeyW'); await b.bringToFront(); await b.keyboard.down('KeyW');
  await a.waitForTimeout(6000);
  console.log('SYNC A', await a.evaluate(() => JSON.stringify(__game.race.karts.map(k => [k.name, Math.round(k.x), Math.round(k.z)]))));
  console.log('SYNC B', await b.evaluate(() => JSON.stringify(__game.race.karts.map(k => [k.name, Math.round(k.x), Math.round(k.z)]))));
  await b.screenshot({ path: 'shots/race_online.png' });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
