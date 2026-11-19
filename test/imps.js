const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { __game.unlockAll(); __game.closePanels(); });
  // wait for a camp to appear
  for (let i = 0; i < 20; i++) { const ok = await page.evaluate(() => { __game.adv.campSoon(); return __game.adv.camps.length > 0; }); if (ok) break; await page.waitForTimeout(1500); }
  const c = await page.evaluate(() => { const c = __game.adv.camps[0]; return { x: c.x, y: c.y, z: c.z, n: c.left }; });
  console.log('CAMP', JSON.stringify(c));
  // stand 14 blocks away, look at it
  await page.evaluate((c) => { const g = __game, p = g.player.pos; const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz); p.x = c.x - dx / d * 12; p.z = c.z - dz / d * 12; p.y = g.world.surfaceY(Math.floor(p.x), Math.floor(p.z)) + 1.1; g.player.yaw = Math.atan2(dx, dz) + Math.PI; g.player.pitch = -0.15; }, c);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/imps_camp.png' });
  console.log('AGGRO before', await page.evaluate(() => __game.adv.enemies.filter(e => e.aggro).length));
  await page.evaluate((c) => { const g = __game, p = g.player.pos; p.x = c.x + 5; p.z = c.z; p.y = g.world.surfaceY(Math.floor(p.x), Math.floor(p.z)) + 1.1; }, c);
  await page.waitForTimeout(2500);
  console.log('AGGRO near', await page.evaluate(() => __game.adv.enemies.filter(e => e.aggro).length));
  await page.screenshot({ path: 'shots/imps_attack.png' });
  const coins0 = await page.evaluate(() => __game.profile.coins);
  // kill them all
  for (let k = 0; k < 40; k++) { const left = await page.evaluate(() => { const g = __game; const e = g.adv.enemies.find(e => e.camp); if (!e) return 0; g.player.yaw = Math.atan2(-(e.pos.x - g.player.pos.x), -(e.pos.z - g.player.pos.z)); g.adv.attack({ ent: e, kind: 'enemy' }); return g.adv.enemies.filter(e => e.camp).length; }); if (!left) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(500);
  console.log('COINS', coins0, '->', await page.evaluate(() => __game.profile.coins), 'camps', await page.evaluate(() => __game.adv.camps.length));
  await page.screenshot({ path: 'shots/imps_cleared.png' });
  await page.evaluate(() => { __game.openPanel('bookPanel'); document.querySelector('#bookTabs button[data-w=_shop]').click(); }); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/shop.png' });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
