const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/race.js', 'utf8').match(/const MOCK = `([\s\S]*?)`;/)[1]
  .replace("window.claude = { use: async (n) => n === 'room' ? room : null };", `
  // db stand-in: docs in localStorage, changes told to other pages with BroadcastChannel
  const dbc = new BroadcastChannel('db');
  const load = () => JSON.parse(localStorage.getItem('mockdb') || '{}');
  const save = (d) => localStorage.setItem('mockdb', JSON.stringify(d));
  const subs = [];
  const tell = () => { const d = load(); subs.forEach(f => f(d)); };
  dbc.onmessage = tell;
  const coll = (c) => ({
    limit: () => coll(c),
    doc: (id) => ({ id, get: async () => { const d = load()[c + '/' + id]; return { exists: !!d, data: () => d }; },
      set: async (v) => { const d = load(); d[c + '/' + id] = v; save(d); dbc.postMessage(1); tell(); },
      update: async (v) => { const d = load(); d[c + '/' + id] = { ...(d[c + '/' + id] || {}), ...v }; save(d); dbc.postMessage(1); tell(); } }),
    onSnapshot: (f) => { const fire = (d) => { const docs = Object.entries(d).filter(([k]) => k.startsWith(c + '/')).map(([k, v]) => ({ id: k.split('/')[1], data: () => v })); f({ docChanges: () => docs.map(doc => ({ type: 'modified', doc })) }); }; subs.push(fire); setTimeout(() => fire(load()), 50); return () => {}; },
  });
  const db = { collection: coll };
  window.claude = { use: async (n) => n === 'room' ? room : n === 'db' ? db : null };`);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.addInitScript(MOCK);
  const errs = [];
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot';
  const a = await ctx.newPage(); a.on('pageerror', e => errs.push('A ' + e.message));
  await a.goto(url); await a.waitForTimeout(800);
  await a.evaluate(() => localStorage.clear()); await a.reload(); await a.waitForTimeout(800);
  const b = await ctx.newPage(); b.on('pageerror', e => errs.push('B ' + e.message));
  await b.goto(url); await b.waitForTimeout(1500);
  await a.screenshot({ path: 'shots/friends_title.png' });
  console.log('TITLE', await a.evaluate(() => document.getElementById('friendsBox').innerText));
  await a.evaluate(() => document.getElementById('campBtn').click());
  await b.evaluate(() => document.getElementById('campBtn').click());
  await a.waitForTimeout(1500);
  // put B in front of A
  await b.evaluate(() => { const g = __game; g.player.pos.x = -8.5; g.player.pos.z = 6.5; g.player.pos.y = g.world.surfaceY(-9, 6) + 1; });
  await a.evaluate(() => { const g = __game; g.player.pos.x = -8.5; g.player.pos.z = 10.5; g.player.pos.y = g.world.surfaceY(-9, 10) + 1; g.player.yaw = 0; g.player.pitch = -0.05; });
  await a.waitForTimeout(1500);
  console.log('OTHERS A', await a.evaluate(() => JSON.stringify([...__game.friends.others.values()].map(o => [o.name, Math.round(o.pos.x), Math.round(o.pos.z)]))));
  // A places a block; B should see it
  const blk = await a.evaluate(() => { const g = __game; const x = -12, z = 12, y = g.world.surfaceY(x, z) + 1; g.world.set(x, y, z, 29); return [x, y, z]; });
  await b.waitForTimeout(1500);
  console.log('BLOCK on B', await b.evaluate((p) => __game.world.get(...p), blk));
  // chat and gift
  await b.evaluate(() => __game.friends.chat('Hello!'));
  await a.waitForTimeout(800);
  await a.screenshot({ path: 'shots/friends_camp.png' });
  const before = await b.evaluate(() => __game.state.inv.crystal || 0);
  await a.evaluate(() => { const g = __game; const o = [...g.friends.others.values()][0]; g.friends.sendGift(o, 'crystal', 5); });
  await b.waitForTimeout(800);
  console.log('GIFT', before, '->', await b.evaluate(() => __game.state.inv.crystal || 0));
  // a build plan in the camp shows up for B
  const n0 = await b.evaluate(() => { let n = 0; for (const [, m] of __game.world.edits) n += m.size; return n; });
  console.log('EDITS on B before', n0);
  // leave camp back to the title
  await a.evaluate(() => { __game.leaveCampMode(); });
  console.log('LEFT', await a.evaluate(() => __game.inCamp + ' ' + __game.look.planet.id));
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
