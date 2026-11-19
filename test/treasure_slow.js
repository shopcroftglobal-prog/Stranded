const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&world=moon&all';
  await page.goto(url); await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { const g = __game; g.landOn('moon', true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); });
  await page.evaluate((k) => { const g = __game; const x = 14, z = 6, y = g.world.surfaceY(x, z); g.give('rig', 1, true); g.player.pos.x = x + 0.5; g.player.pos.z = z + 2.3; g.player.pos.y = y + 1; g.player.yaw = 0; g.player.pitch = -0.75; g.state.sel = g.state.hotbar.indexOf('rig'); });
  await page.waitForTimeout(500);
  await page.evaluate(() => __game.useAction());
  const key = await page.evaluate(() => Object.keys(__game.profile.rigs)[0]);
  console.log('RIG', key);
  // 1 hour back: 20 finds; first is shard, early luck
  console.log('T', await page.evaluate(() => { const r = Object.values(__game.profile.rigs)[0]; const a = r.t; r.t -= 3600 * 1000; return [a, r.t, Object.values(__game.profile.rigs)[0].t]; }));
  await page.evaluate(() => { const g = __game; const [x, y, z] = Object.keys(g.profile.rigs)[0].split('|')[1].split(',').map(Number); g.player.pos.x = x + 0.5; g.player.pos.z = z + 2.3; g.player.pos.y = y + 1; g.player.yaw = 0; g.player.pitch = -0.6; });
  await page.waitForTimeout(600);
  console.log('HIT', await page.evaluate(() => JSON.stringify(__game.hit())));
  await page.evaluate(() => __game.useAction());
  await page.waitForTimeout(300);
  console.log('STORE', await page.evaluate(() => JSON.stringify([__game.profile.rigs, document.getElementById('rigPanel').className])));
  await page.screenshot({ path: 'shots/treasure_rig.png' });
  // ad boost
  console.log('ADVIS', await page.evaluate(() => { document.getElementById('rigAd').click(); return [document.getElementById('adPanel').className, document.getElementById('rigPanel').className]; }));
  await page.waitForTimeout(100);
  console.log('ADVIS2', await page.evaluate(() => [document.getElementById('adPanel').className, document.getElementById('rigPanel').className]));
  await page.screenshot({ path: 'shots/treasure_ad.png' });
  await page.waitForFunction(() => document.getElementById('adPanel').classList.contains('hide'), null, { timeout: 30000 });
  await page.waitForTimeout(300);
  console.log('BOOST', await page.evaluate(() => { const r = Object.values(__game.profile.rigs)[0]; return JSON.stringify({ until: Math.round((r.boostUntil - Date.now()) / 60000), ads: __game.profile.ads }); }));
  await page.screenshot({ path: 'shots/treasure_boosted.png' });
  // 30 min while boosted -> 50 finds expected
  const n = await page.evaluate(() => { const r = Object.values(__game.profile.rigs)[0]; const before = r.count; const now = Date.now() + 30 * 60000; const R = __game.rigs.accrue(r, now); return r.count - before; });
  console.log('BOOSTED FINDS IN 30 MIN', n);
  // take everything -> banner + book
  await page.evaluate(() => document.getElementById('rigTake').click());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/treasure_take.png' });
  // forge: give enough to make everything
  await page.evaluate(() => { const g = __game; g.closePanels(); for (const [k, n] of Object.entries({ shard: 20, pearl: 10, ember: 6, sunheart: 1, shadow: 1, gold: 4 })) g.give(k, n, true); g.openPanel('forgePanel'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#forgePanel .dialog').scrollTop = 9999);
  await page.screenshot({ path: 'shots/treasure_forge.png' });
  const made = await page.evaluate(() => { const out = []; for (const b of document.querySelectorAll('#forgeList .recipe.legend button')) { if (!b.disabled) { b.click(); } } return JSON.stringify(__game.profile.gear) + ' ' + Object.keys(__game.profile.owned).join(','); });
  console.log('MADE', made);
  // area hit: spawn enemies, hit one
  const hit = await page.evaluate(() => { const g = __game, a = g.adv; g.closePanels(); g.state.hp = 10; const p = g.player.pos; const es = []; for (let i = 0; i < 3; i++) es.push(a.spawnEnemy('biter', { spot: { x: p.x + 2 + i * 0.7, y: p.y, z: p.z } })); return es.length; });
  await page.waitForTimeout(300);
  console.log('HITTEST', hit, await page.evaluate(() => { const g = __game, a = g.adv; const hp0 = g.state.hp; const before = a.enemies.map(e => e.hp); const e = a.enemies[0]; const dx = e.pos.x - g.player.pos.x, dz = e.pos.z - g.player.pos.z; g.player.yaw = Math.atan2(-dx, -dz); g.player.pitch = 0; g.camera.rotation.set(0, g.player.yaw, 0, 'YXZ'); g.camera.position.set(g.player.pos.x, g.player.pos.y + 1.62, g.player.pos.z); g.camera.updateMatrixWorld(); const d = new g.THREE.Vector3(); g.camera.getWorldDirection(d); const r = a.attack({ kind: 'enemy', ent: e, t: 2 }); return JSON.stringify({ r, before, after: a.enemies.map(e => e.hp), hp: [hp0, g.state.hp] }); }));
  await page.evaluate(() => { __game.closePanels(); __game.openPanel('bookPanel'); });
  await page.screenshot({ path: 'shots/treasure_book.png' });
  console.log('ERR', errs.join('\n') || 'none');
  await browser.close();
})();
