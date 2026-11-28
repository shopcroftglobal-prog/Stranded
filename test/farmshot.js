// Screenshots of a farm in daylight, seen over the pilot's shoulder.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const phone = process.argv.includes('phone');
  const page = await browser.newPage(phone ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + (phone ? '?touch&shot&world=mars' : '?desktop&shot&world=mars'));
  await page.waitForTimeout(800); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.setMode('normal'); g.landOn('mars', true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); g.state.clock = 0.25 * 14 * 60; g.state.locker = true; });
  const f = await page.evaluate(() => {
    const g = __game, w = g.world, B = g.B;
    const x0 = -14, z0 = 16, y = w.surfaceY(x0, z0);
    for (let x = -3; x < 11; x++) for (let z = -3; z < 9; z++) { for (let h = 1; h < 10; h++) w.set(x0 + x, y + h, z0 + z, B.AIR); for (let h = -3; h <= 0; h++) w.set(x0 + x, y + h, z0 + z, h === 0 ? B.REDDIRT : B.DUST); }
    const kinds = ['potato', 'bean', 'lettuce'];
    for (let x = 0; x < 8; x++) for (let z = 0; z < 5; z++) {
      if (z === 2) { w.set(x0 + x, y, z0 + z, B.ICE); continue; }
      w.set(x0 + x, y, z0 + z, B.SOIL);
      const k = kinds[Math.floor(x / 3) % 3], st = x === 7 ? 0 : (x === 6 ? 1 : 2);
      g.farm && (g.state.crops[`${x0 + x},${y + 1},${z0 + z}`] = { k, t: Date.now() - (st === 2 ? 600e3 : st === 1 ? 150e3 : 1e3), w: true });
      w.set(x0 + x, y + 1, z0 + z, { potato: 132, bean: 135, lettuce: 138 }[k] + st);
    }
    w.set(x0 + 9, y + 1, z0 + 1, B.STOVE); w.set(x0 + 9, y + 1, z0 + 3, 26);
    for (const k of ['bakedpotato', 'stew', 'salad', 'beans', 'potato', 'lettuce']) g.give(k, 3, true);
    g.state.hotbar = ['stew', 'bakedpotato', 'salad', 'potato', 'beans', 'lettuce', 'soil', 'stove', null]; g.state.sel = 0; g.give('soil', 6, true); g.give('stove', 1, true);
    g.state.food = 14;
    return { x0, z0, y };
  });
  await page.evaluate((f) => { const g = __game; g.player.pos.x = f.x0 + 4; g.player.pos.z = f.z0 - 4.5; g.player.pos.y = f.y + 1; g.player.yaw = Math.PI - 0.15; g.player.pitch = -0.5; }, f);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.resolve(__dirname, 'shots', (phone ? 'phone_' : '') + 'farm_day.png') });
  await page.evaluate((f) => { const g = __game; g.player.pos.x = f.x0 - 2.5; g.player.pos.z = f.z0 + 2.5; g.player.pos.y = f.y + 1; g.player.yaw = -Math.PI / 2 - 0.1; g.player.pitch = -0.42; }, f);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.resolve(__dirname, 'shots', (phone ? 'phone_' : '') + 'farm_side.png') });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
