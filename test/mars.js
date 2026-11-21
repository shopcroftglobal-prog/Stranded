// Screenshots of the new Mars landscapes: volcano, layered hills, dark dunes, canyon, frost, sky.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&god');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('stranded-settings-v1', JSON.stringify({ quality: 'high', sound: 0, music: 0 })); }); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.profile.guide = 9; g.closePanels(); g.start(); document.getElementById('hud').classList.add('hide'); });
  // find a canyon spot near the ship
  const canyon = await page.evaluate(() => { const w = __game.world; let best = null; for (let r = 60; r < 200 && !best; r += 4) for (let a = 0; a < 64; a++) { const x = Math.round(Math.cos(a / 64 * 6.283) * r), z = Math.round(Math.sin(a / 64 * 6.283) * r); const c = w.column(x, z); if (c.mars && c.mars.canyon > 0.95) { best = [x, z]; break; } } return best; });
  console.log('canyon', canyon);
  const shots = [
    ['ship_to_volcano', 2, 12, 105, -85, 0.25],
    ['layered_hill', -30, 30, -70, 58, 0.3],
    ['dunes', 30, 40, 60, 75, 0.3],
    ['plains_wide', -10, -20, -70, 58, 0.35],
    ['hero', 10, 95, -70, 58, 0.36, 'high'],
    ['hero2', 40, 20, 105, -85, 0.3, 'high'],
    ['volcano_top', 105, -60, 105, -85, 0.3],
    ['canyon', canyon[0], canyon[1], canyon[0] + 30, canyon[1] + 5, 0.45],
    ['sunset', 2, 12, 105, -85, 0.2, 'sunset'],
  ];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [name, x, z, lx, lz, tod, special] of shots) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(([x, z, lx, lz, tod, special]) => {
      const g = __game, p = g.player, w = g.world;
      p.pos.x = x + 0.5; p.pos.z = z + 0.5; p.pos.y = w.surfaceY(x, z) + (special === 'top' ? 1 : special === 'high' ? 26 : 6); p.vel.y = 0;
      p.yaw = Math.atan2(-(lx - x), -(lz - z)); p.pitch = special === 'high' ? -0.3 : -0.12;
      g.state.storm = { on: false, t: 999 };
      g.state.clock = 840 * tod;
    }, [x, z, lx, lz, tod, special]);
    if (special === 'sunset') { let best = 0, bd = 9; for (let c = 0; c < 840; c += 15) { await page.evaluate((c) => __game.state.clock = c, c); await page.waitForTimeout(60); const y = await page.evaluate(() => __game.adv.sunDir.y); const dy = Math.abs(y - 0.02); if (dy < bd && y > 0) { bd = dy; best = c; } } await page.evaluate((c) => __game.state.clock = c, best); console.log('sunset clock', best); await page.waitForTimeout(200); await page.evaluate(() => { const d = __game.adv.sunDir, p = __game.player; p.yaw = Math.atan2(-d.x, -d.z); p.pitch = 0.05; }); }
    for (let i = 0; i < 40; i++) { await page.evaluate(() => __game.player.vel.y = 0); await page.waitForTimeout(100); }
    await page.screenshot({ path: `shots/mars/${name}.png` });
  }
  console.log('day', await page.evaluate(() => [__game.adv.daylight, __game.state.clock]));
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
