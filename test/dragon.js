const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const W = process.argv[2] || 'mars';
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + `?desktop&shot&all&world=${W}`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); });
  await page.evaluate((W) => { const g = __game; g.landOn(W, true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); }, W);
  await page.evaluate(() => __game.pending());
  await page.evaluate(() => { const g = __game; g.profile.waves[g.look.planet.id] = 49; g.profile.owned.blade = true; g.profile.gear.weapon = 'blade'; g.profile.coins = 0; g.adv.startWave(); });
  const log = [];
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(1000);
    log.push(await page.evaluate(() => JSON.stringify({ e: __game.adv.enemies.map(e => [e.name, Math.round(e.hp), e.pos.toArray().map(Math.round), e.hidden > 0]), w: __game.adv.wave && __game.adv.wave.n, coins: __game.profile.coins, hp: Math.round(__game.state.hp), me: [__game.player.pos.x, __game.player.pos.y, __game.player.pos.z].map(Math.round) })));
    if (i === 6) {
      await page.evaluate(() => { const g = __game; const d = g.adv.enemies[0]; if (d) { g.player.yaw = Math.atan2(-(d.pos.x - g.player.pos.x), -(d.pos.z - g.player.pos.z)); g.player.pitch = 0.1; } });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `shots/dragon_${W}.png` });
    }
  }
  console.log(log.join('\n'));
  console.log('ERR', errs.join('\n') || 'none');
  await browser.close();
})();
