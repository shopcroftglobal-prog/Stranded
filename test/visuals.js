// Screenshots for the visual upgrade: day, sunset, night with lamps and ship lights, valley haze, embers.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&god');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('stranded-settings-v1', JSON.stringify({ quality: 'high', sound: 0, music: 0 })); }); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.profile.guide = 9; g.closePanels(); g.start(); document.getElementById('hud').classList.add('hide'); if (g.behind) g.toggleView(); });
  const shot = async (name, x, z, lx, lz, o = {}) => {
    await page.evaluate(([x, z, lx, lz, o]) => {
      const g = __game, p = g.player, w = g.world;
      p.pos.x = x + 0.5; p.pos.z = z + 0.5; p.pos.y = w.surfaceY(x, z) + (o.up ?? 2); p.vel.y = 0;
      p.yaw = Math.atan2(-(lx - x), -(lz - z)); p.pitch = o.pitch ?? -0.1;
      g.state.storm = { on: false, t: 999 }; g.state.clock = o.clock ?? 252;
    }, [x, z, lx, lz, o]);
    for (let i = 0; i < 40; i++) { await page.evaluate(() => __game.player.vel.y = 0); await page.waitForTimeout(100); }
    await page.screenshot({ path: `shots/vis/${name}.png` });
  };
  // a little base with lamps near the ship
  await page.evaluate(() => { const g = __game, w = g.world, B = { lamp: g.ITEMS.lamp.block };
    const cols = Object.keys(g.ITEMS).filter(k => k.startsWith('lamp_')).slice(0, 4);
    [[-8, 6], [-12, 9], [-6, 12], [-14, 4], [-10, 14]].forEach(([x, z], i) => { const y = w.surfaceY(x, z) + 1; w.set(x, y, z, i === 0 ? B.lamp : g.ITEMS[cols[i % cols.length]].block); });
  });
  await shot('day_ship', -16, 18, 0, 0, { up: 3 });
  await shot('night_base', -18, 20, -4, 4, { up: 3, clock: 560 });
  await shot('canyon_haze', 60, 60, 80, 80, { up: 14, pitch: -0.3 });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
