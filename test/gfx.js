const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const world = process.argv[2] || 'trappist1e';
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot'); await page.waitForTimeout(800);
  await page.evaluate((w) => { localStorage.clear(); const p = { coins: 0, visited: { mars: true, [w]: true }, waves: {}, book: {}, gear: {}, guide: 9 }; localStorage.setItem('stranded-last-world', w); }, world);
  await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate((w) => { __game.landOn(w, true); __game.start(); }, world); await page.waitForTimeout(1500);
  await page.evaluate(() => { __game.profile.guide = 9; }); 
  const info = await page.evaluate(() => ({ w: __game.look.planet.id, sea: __game.look.terrain.sea, liquid: __game.look.terrain.liquid }));
  console.log('WORLD', JSON.stringify(info));
  // find water nearby and look at it
  const spot = await page.evaluate(() => { const g = __game, s = g.look.terrain.sea; if (!g.look.terrain.liquid) return null; const p = g.player.pos;
    for (let r = 4; r < 90; r += 2) for (let a = 0; a < 6.28; a += 0.2) { const x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r); if (g.world.surfaceY(x, z) < s - 1) return { x, z, r }; } return null; });
  console.log('SPOT', JSON.stringify(spot));
  if (spot) await page.evaluate((s) => { const g = __game, p = g.player.pos; const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz); const sx = p.x + dx / d * Math.max(0, d - 7), sz = p.z + dz / d * Math.max(0, d - 7); p.x = sx; p.z = sz; p.y = g.world.surfaceY(Math.floor(sx), Math.floor(sz)) + 3; g.player.yaw = Math.atan2(-dx, -dz); g.player.pitch = -0.28; }, spot);
  await page.evaluate(() => __game.pending && __game.pending()); await page.waitForTimeout(3500);
  await page.screenshot({ path: `shots/gfx_${world}.png` });
  if (spot) {
    await page.evaluate((s) => { const g = __game; g.player.pos.x = s.x + 0.5; g.player.pos.z = s.z + 0.5; g.player.pos.y = g.look.terrain.sea - 1; g.player.pitch = 0; }, spot);
    await page.waitForTimeout(1500);
    console.log('SWIM', await page.evaluate(() => [__game.player.swimming, __game.player.pos.y.toFixed(2)]));
    await page.screenshot({ path: `shots/gfx_${world}_under.png` });
  }
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
