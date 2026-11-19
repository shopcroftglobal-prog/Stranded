const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/friends.js', 'utf8').match(/const MOCK = fs[\s\S]*?\n\(async/)[0];
eval(MOCK.replace(/\n\(async$/, '').replace('const MOCK', 'global.M'));
const M2 = global.M.replace("dbc.onmessage = tell;", "dbc.onmessage = (e) => { if (e.data && typeof e.data === 'object') save(e.data); tell(); };").replace(/dbc\.postMessage\(1\)/g, "dbc.postMessage(load())").replace("id: k.split('/')[1]", "id: k.slice(c.length + 1)").replace("subs.forEach(f => f(d))", "subs.forEach(f => { try { f(d); } catch (e) { console.log('SUBERR ' + e.message + ' ' + e.stack); } })").replace("k.startsWith(c + '/')", "k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/')");
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.addInitScript(M2);
  const errs = [];
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot';
  const pages = [];
  for (let i = 0; i < (process.env.N ? +process.env.N : 4); i++) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(i + ' ' + e.message)); p.on('console', m => { if (m.text().startsWith('SUBERR')) errs.push(i + ' ' + m.text().slice(0, 400)); }); await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(700); if (i === 0) { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(700); } pages.push(p); }
  const [a, b, c, d] = pages;
  await a.evaluate(() => document.getElementById('teamBtn').click());
  await a.waitForTimeout(300); await a.screenshot({ path: 'shots/team_panel.png' });
  await a.evaluate(() => document.getElementById('teamNew').click());
  await a.waitForFunction(() => __game.team && __game.team.ready, null, { timeout: 20000 });
  const code = await a.evaluate(() => __game.team.code);
  console.log('CODE', code);
  // B picks a different world but joins: should be moved to A's world
  await b.evaluate(() => { document.querySelectorAll('[data-planet]').length; });
  await b.evaluate((c) => __game.enterTeamMode(c, 'proxima'), code);
  await b.waitForFunction(() => __game.team && __game.team.ready, null, { timeout: 20000 });
  await b.waitForTimeout(1500);
  console.log('B world', await b.evaluate(() => __game.team && __game.team.world + ' ' + __game.look.planet.id));
  await c.evaluate((c) => __game.enterTeamMode(c, 'mars'), code);
  await c.waitForFunction(() => __game.team && __game.team.ready, null, { timeout: 20000 });
  await a.waitForTimeout(1500);
  for (const [n, p] of [['A', a], ['B', b], ['C', c]]) console.log(n, 'jobs', await p.evaluate(() => __game.myJobs().map(x => x.name).join(', ')), '| team', await p.evaluate(() => __game.friends.team().length));
  if (d) {
  // D is the 4th: team full
  await d.evaluate((c) => __game.enterTeamMode(c, 'mars'), code);
  await d.waitForTimeout(2500);
  console.log('D team', await d.evaluate(() => JSON.stringify(__game.team)), await d.evaluate(() => document.getElementById('toast') && document.getElementById('toast').innerText));
  }
  // A fits a part: B and C see it fixed
  await b.evaluate(() => { window.__infoN = 0; const bc = new BroadcastChannel('db'); bc.onmessage = () => window.__infoN++; });
  const part = await a.evaluate(() => { const g = __game; const id = g.myJobs()[0].id; g.state.inv[id] = 1; return id; });
  await a.evaluate((id) => __game.install ? __game.install(id) : null, part);
  await a.waitForTimeout(300);
  console.log('DB', await a.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockdb')||'{}')).join(' ') + ' canBuild=' + __game.friends.canBuild));
  console.log('A fixed', await a.evaluate(() => JSON.stringify(__game.state.fixed)));
  await b.waitForTimeout(1500);
  console.log('B sees DB', await b.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockdb')||'{}')).join(' ')), await b.evaluate(() => JSON.stringify(__game.team)));
  console.log('B manual', await b.evaluate(async (code) => { const db = await window.claude.use('db'); return await new Promise(r => db.collection('team/' + code + '/info').onSnapshot(s => r(JSON.stringify(s.docChanges().map(c => [c.doc.id, c.doc.data()]))))); }, await a.evaluate(() => __game.team ? __game.team.code : '')));
  console.log('B dbg', await b.evaluate(() => JSON.stringify(__game.friends.debug)), 'C dbg', await c.evaluate(() => JSON.stringify(__game.friends.debug)));
  await b.evaluate(async (code) => { const db = await window.claude.use('db'); await db.collection('team/' + code + '/info').doc('ship').update({ computer: true }); }, await a.evaluate(() => __game.team.code)); await b.waitForTimeout(300);
  console.log('B self', await b.evaluate(() => JSON.stringify(__game.state.fixed)));
  console.log('B bc msgs', await b.evaluate(() => window.__infoN));
  console.log('B fixed', await b.evaluate(() => JSON.stringify(__game.state.fixed)));
  // shared block
  const blk = await a.evaluate(() => { const g = __game; const x = 4, z = 4, y = g.world.surfaceY(x, z) + 1; g.world.set(x, y, z, 29); return [x, y, z]; });
  await c.waitForTimeout(1500);
  console.log('DB2', await c.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockdb')||'{}')).join(' ')), await a.evaluate((p) => __game.world.get(...p), blk), JSON.stringify(blk));
  console.log('BLOCK on C', await c.evaluate((p) => __game.world.get(...p), blk));
  await a.screenshot({ path: 'shots/team_play.png' });
  await a.evaluate(() => __game.leaveTeamMode());
  console.log('A left', await a.evaluate(() => __game.team + ' ' + __game.look.planet.id));
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
