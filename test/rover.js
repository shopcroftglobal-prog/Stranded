const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.profile.guide = 9; g.state.won = true; g.give('sheet', 4); g.give('iron', 3); g.give('fuelcell', 1); g.make('rover'); g.player.yaw = Math.PI * 0.75; g.player.pitch = -0.25; });
  console.log('HAS', await page.evaluate(() => __game.profile.rover));
  await page.keyboard.press('KeyV'); await page.waitForTimeout(300);
  const p0 = await page.evaluate(() => ({ ...__game.player.pos }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/rover_drive.png' });
  await page.keyboard.up('KeyW');
  const p1 = await page.evaluate(() => ({ ...__game.player.pos, rover: __game.player.rover }));
  console.log('MOVED', Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1), 'climbed', (p1.y - p0.y).toFixed(1), 'in', p1.rover);
  // walking comparison
  await page.keyboard.press('KeyV'); await page.waitForTimeout(300);
  const q0 = await page.evaluate(() => ({ ...__game.player.pos }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(4000); await page.keyboard.up('KeyW');
  const q1 = await page.evaluate(() => ({ ...__game.player.pos }));
  console.log('WALKED', Math.hypot(q1.x - q0.x, q1.z - q0.z).toFixed(1));
  // look at the parked... rover is hidden when out; show it from outside: get back in, step camera back via screenshot of model
  await page.keyboard.press('KeyV'); await page.waitForTimeout(300);
  await page.keyboard.press('KeyV'); await page.waitForTimeout(300);
  await page.evaluate(() => { const g = __game; const m = g.makeRover('sun'); g.scene.add(m); const p = g.player.pos; const x = p.x - Math.sin(g.player.yaw) * 4, z = p.z - Math.cos(g.player.yaw) * 4; m.position.set(x, g.world.surfaceY(Math.floor(x), Math.floor(z)) + 1, z); m.rotation.y = g.player.yaw + 2.3; g.player.pitch = -0.3; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/rover.png' });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
