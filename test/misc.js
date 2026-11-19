const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const phone = process.argv[2] === 'phone';
  const ctx = phone ? await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true }) : await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const W = process.argv[3] || 'mars';
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + `?${phone ? 'touch' : 'desktop'}&shot&all&world=${W}`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); });
  await page.evaluate((W) => { const g = __game; g.landOn(W, true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); }, W);
  await page.evaluate(() => __game.pending());
  const P = phone ? 'phone_' : '';
  // night
  await page.evaluate(() => { const g = __game; const len = g.adv.dayLength(); if (len) g.state.clock = len * 0.62; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/${P}night_${W}.png` });
  console.log('NIGHT', await page.evaluate(() => [__game.adv.daylight, document.getElementById('daytime').textContent]));
  await page.evaluate(() => { const g = __game; g.state.clock = 0; });
  // storm
  await page.evaluate(() => { const g = __game; g.state.storm = { on: false, t: 0.01 }; });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `shots/${P}storm_${W}.png` });
  await page.evaluate(() => { const g = __game; g.state.storm = { on: true, t: 0.01 }; });
  // finds: spawn a few near the player
  await page.evaluate(() => { for (let i = 0; i < 3; i++) __game.adv.spawnFind(); });
  await page.waitForTimeout(1500);
  const fl = await page.evaluate(() => __game.adv.finds.map(f => [f.kind, f.pos.toArray().map(Math.round)]));
  console.log('FINDS', JSON.stringify(fl));
  await page.evaluate(() => { const g = __game; const f = g.adv.finds[0]; if (f) { g.player.pos.x = f.pos.x + 3; g.player.pos.z = f.pos.z + 3; g.player.pos.y = f.pos.y + 0.2; g.player.yaw = Math.atan2(3, 3); g.player.pitch = -0.35; } });
  await page.evaluate(() => __game.pending());
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/${P}find_${W}.png` });
  // trader
  await page.evaluate(() => { const g = __game; g.state.trader = { here: false, t: 0.01 }; g.give('gold', 3, true); g.give('salt', 2, true); g.profile.coins = 50; });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = __game; g.player.pos.x = 7.5; g.player.pos.z = -2.5; g.player.pos.y = g.world.surfaceY(7, -3) + 1; g.player.yaw = 0; g.player.pitch = -0.05; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/${P}trader_${W}.png` });
  console.log('AIM', await page.evaluate(() => __game.aim && __game.aim.kind));
  await page.evaluate(() => __game.openPanel('shopPanel'));
  await page.screenshot({ path: `shots/${P}shop_${W}.png` });
  await page.evaluate(() => __game.openPanel('forgePanel'));
  await page.screenshot({ path: `shots/${P}forge_${W}.png` });
  await page.evaluate(() => { __game.closePanels(); __game.openPanel('beaconPanel'); });
  await page.screenshot({ path: `shots/${P}beacon_${W}.png` });
  // fall: lose air
  await page.evaluate(() => { const g = __game; g.closePanels(); g.player.pos.x = 30; g.player.pos.z = 30; g.player.pos.y = g.world.surfaceY(30, 30) + 1; g.give('iron', 3, true); g.state.hp = 2; g.adv.hurt(5, 'creature'); });
  await page.waitForTimeout(6000); console.log("FALLSTATE", await page.evaluate(() => JSON.stringify({hp: __game.state.hp, air: __game.state.air, open: [...document.querySelectorAll(".overlay:not(.hide)")].map(e => e.id), lost: !!__game.state.lost})));
  await page.screenshot({ path: `shots/${P}fall_${W}.png` });
  await page.evaluate(() => __game.closePanels());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `shots/${P}lost_${W}.png` });
  console.log('LOST', await page.evaluate(() => JSON.stringify(__game.state.lost && Object.keys(__game.state.lost.inv))));
  // supply box
  await page.evaluate(() => __game.openSupply());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${P}supply_${W}.png` });
  console.log('ERR', errs.join('\n') || 'none');
  await browser.close();
})();
