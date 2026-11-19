const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  // dig a 1x1 shaft 9 deep and drop the player in
  const top = await page.evaluate(() => { const g = __game, x = 20, z = 20, B = g.world; g.profile.guide = 9; const t = B.surfaceY(x, z); for (let y = t; y > t - 9; y--) B.set(x, y, z, 0); g.player.pos.x = x + 0.5; g.player.pos.z = z + 0.5; g.player.pos.y = t - 8; g.player.vel.y = 0; return t; });
  await page.waitForTimeout(1500);
  const y0 = await page.evaluate(() => __game.player.pos.y);
  await page.screenshot({ path: 'shots/climb_bottom.png' });
  console.log('BUTTON', await page.evaluate(() => !document.getElementById('upBtn').classList.contains('hide')));
  await page.keyboard.down('Space'); await page.waitForFunction((t) => __game.player.pos.y > t, top, { timeout: 30000 }).catch(() => {}); await page.keyboard.up('Space');
  console.log('CLIMB from', y0.toFixed(1), 'to', (await page.evaluate(() => __game.player.pos.y)).toFixed(1), 'top', top + 1);
  // button: drop back in and press U
  await page.evaluate((t) => { const g = __game; g.player.pos.y = t - 8; g.player.pos.x = 20.5; g.player.pos.z = 20.5; }, top); await page.waitForTimeout(800);
  await page.keyboard.press('KeyU'); await page.waitForTimeout(300);
  console.log('AFTER U', (await page.evaluate(() => __game.player.pos.y)).toFixed(1));
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
