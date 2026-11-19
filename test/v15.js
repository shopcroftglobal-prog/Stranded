const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&weather'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  // unlock everything via settings button
  await page.evaluate(() => { __game.openPanel('setPanel'); }); await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/v15_settings.png' });
  await page.evaluate(() => document.querySelector('#setBody button[data-t]').click()); await page.waitForTimeout(300);
  console.log('UNLOCK', await page.evaluate(() => JSON.stringify({ v: Object.keys(__game.profile.visited), won: __game.state.won, w: __game.profile.gear.weapon, c: __game.profile.coins })));
  await page.evaluate(() => document.querySelector('#setBody button[data-w="49"]').click()); await page.waitForTimeout(300);
  console.log('WAVES', await page.evaluate(() => JSON.stringify(__game.profile.waves)));
  // digging chips: aim at ground and hold
  await page.evaluate(() => { __game.closePanels(); __game.player.pitch = -1.2; }); await page.waitForTimeout(300);
  await page.mouse.move(640, 380); await page.evaluate(() => { __game.mouse.left = true; }); await page.waitForTimeout(700);
  await page.screenshot({ path: 'shots/v15_chips.png' });
  await page.evaluate(() => { __game.mouse.left = false; });
  for (const w of ['proxima', 'europa', 'trappist1e']) {
    await page.evaluate((w) => { __game.landOn(w, true); __game.start(); __game.player.pitch = -0.15; }, w); await page.waitForTimeout(2500);
    if (w === 'proxima') {
      const spot = await page.evaluate(() => { const g = __game, s = g.look.terrain.sea, p = g.player.pos; for (let r = 4; r < 90; r += 2) for (let a = 0; a < 6.28; a += 0.2) { const x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r); if (g.world.surfaceY(x, z) < s - 1) return { x, z }; } return null; });
      console.log('LAVA SPOT', JSON.stringify(spot));
      if (spot) await page.evaluate((s) => { const g = __game, p = g.player.pos; const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz); p.x += dx / d * Math.max(0, d - 7); p.z += dz / d * Math.max(0, d - 7); p.y = g.world.surfaceY(Math.floor(p.x), Math.floor(p.z)) + 3; g.player.yaw = Math.atan2(-dx, -dz); g.player.pitch = -0.3; }, spot);
      await page.waitForTimeout(2500);
    }
    if (w === 'europa') await page.evaluate(() => { __game.player.pitch = 0.35; });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/v15_${w}.png` });
  }
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
