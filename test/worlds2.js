// Screenshots of the new landscapes on every world.
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
  const find = (pred) => page.evaluate((pred) => { const w = __game.world, f = new Function('c', 'x', 'z', 'return ' + pred); for (let r = 20; r < 260; r += 3) for (let a = 0; a < 96; a++) { const x = Math.round(Math.cos(a / 96 * 6.283) * r), z = Math.round(Math.sin(a / 96 * 6.283) * r); const c = w.column(x, z); if (c.mars && f(c.mars, x, z)) return [x, z]; } return null; }, pred);
  const shot = async (name, x, z, lx, lz, opt = {}) => {
    await page.evaluate(([x, z, lx, lz, o]) => {
      const g = __game, p = g.player, w = g.world;
      p.pos.x = x + 0.5; p.pos.z = z + 0.5; p.pos.y = w.surfaceY(x, z) + (o.up ?? 6); p.vel.y = 0;
      p.yaw = Math.atan2(-(lx - x), -(lz - z)); p.pitch = o.pitch ?? -0.15;
      g.state.storm = { on: false, t: 999 }; g.state.clock = (o.tod ?? 0.3) * (o.len || 840);
    }, [x, z, lx, lz, opt]);
    for (let i = 0; i < 40; i++) { await page.evaluate(() => __game.player.vel.y = 0); await page.waitForTimeout(100); }
    await page.screenshot({ path: `shots/worlds2/${name}.png` });
  };
  const go = async (id) => { await page.evaluate((id) => { __game.closePanels(); __game.travel(id); }, id); await page.waitForTimeout(4500); await page.evaluate(() => { __game.closePanels(); document.getElementById('hud').classList.add('hide'); }); };
  // Mars
  if (process.env.DBG) { await shot('dbg', 40, 14, 120, 24, { up: 3 }); console.log(await page.evaluate(() => [__game.state.clock, __game.adv.daylight, __game.adv.sunDir.y, __game.look && 1])); await browser.close(); return; }
  await shot('mars_tracks', 60, 30, 75, 16, { up: 4, pitch: -0.45 });
  await shot('mars_rover', 180, -1, 188, 4, { up: 3, pitch: -0.25 });
  await shot('mars_pebbles', -12, 12, -20, 22, { up: 2, pitch: -0.5 });
  await shot('mars_clouds', 0, 20, 0, -20, { up: 4, pitch: 0.45 });
  await shot('mars_icecap', 10, -330, 10, -420, { up: 8, pitch: -0.2 });
  if (process.env.MARS) { console.log('ERR', errs.join('\n') || 'none'); await browser.close(); return; }
  // other worlds
  await go('moon');
  await shot('moon', -10, -20, -60, -70, { up: 22, pitch: -0.3, tod: 0.2, len: 1800 });
  await go('europa');
  await shot('europa', 30, -15, 66, -48, { up: 18, pitch: -0.2, tod: 0.25, len: 960 });
  await go('proxima');
  const v = await page.evaluate(() => __game.world.volcanoes(0, 0).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0]);
  await shot('proxima', Math.round(v.x - v.r - 12), Math.round(v.z), Math.round(v.x), Math.round(v.z), { up: 10, pitch: -0.1 });
  await go('trappist1e');
  const b = await find('c.beach');
  await shot('trappist1e', b[0], b[1], b[0] * 1.5, b[1] * 1.5, { up: 6, pitch: -0.15 });
  await go('lhs1140b');
  const cv = await find('c.canyon > 0.9');
  await shot('lhs1140b', cv[0] + 8, cv[1] + 8, cv[0], cv[1], { up: 10, pitch: -0.35 });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
