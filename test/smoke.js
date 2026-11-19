const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot';
  await page.goto(url);
  await page.waitForTimeout(1500);
  const out = path.resolve(__dirname, 'shots'); require('fs').mkdirSync(out, { recursive: true });
  await page.screenshot({ path: out + '/0_title.png' });
  await page.evaluate(() => { __game.start(); });
  await page.evaluate(() => __game.pending());
  await page.waitForTimeout(1500);
  // fix the ship and take off
  await page.evaluate(() => { const g = __game; for (const p of ['patch', 'engine', 'fueltank', 'computer']) { g.give(p, 1, true); g.install(p); } g.launch(); });
  await page.waitForFunction(() => !document.getElementById('win').classList.contains('hide'), null, { timeout: 120000 });
  await page.screenshot({ path: out + '/1_win.png' });
  await page.evaluate(() => { __game.give('fuelcell', 3, true); document.getElementById('mapBtn').click(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/2_map.png' });
  await page.evaluate(() => { document.getElementById('stayBtn') ; __game.landAgain(); __game.closePanels(); });
  await page.waitForTimeout(500);
  // waves
  const r = await page.evaluate(() => {
    const g = __game; g.profile.owned.club = true; g.profile.gear.weapon = 'club';
    g.openPanel('beaconPanel'); return document.getElementById('beaconBody').innerText.slice(0, 200);
  });
  console.log('BEACON:', r);
  await page.screenshot({ path: out + '/3_beacon.png' });
  await page.evaluate(() => { document.getElementById('waveGo').click(); });
  await page.waitForFunction(() => __game.adv.enemies.length >= 3, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const g = __game; const d = g.adv.enemies[0]; if (d) { g.player.yaw = Math.atan2(-(d.pos.x - g.player.pos.x), -(d.pos.z - g.player.pos.z)); g.player.pitch = -0.1; } });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/4_wave.png' });
  const info = await page.evaluate(() => ({ n: __game.adv.enemies.length, wave: __game.adv.wave && __game.adv.wave.n, hp: __game.state.hp }));
  console.log('WAVE', JSON.stringify(info));
  // kill all
  for (let k = 0; k < 10; k++) {
    await page.evaluate(() => { for (const e of [...__game.adv.enemies]) { e.hp = 0.1; __game.adv.attack({ ent: e, t: 0 }); } });
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/5_reward.png' });
  console.log('AFTER', await page.evaluate(() => JSON.stringify({ waves: __game.profile.waves, coins: __game.profile.coins, panel: [...document.querySelectorAll('.overlay:not(.hide)')].map(e => e.id) })));
  // dragon
  await page.evaluate(() => { const g = __game; g.closePanels(); g.profile.waves.mars = 49; g.profile.owned.blade = true; g.profile.gear.weapon = 'blade'; g.adv.startWave(); });
  await page.waitForFunction(() => __game.adv.enemies.length >= 1, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { const g = __game; const d = g.adv.enemies[0]; if (d) { g.player.yaw = Math.atan2(-(d.pos.x - g.player.pos.x), -(d.pos.z - g.player.pos.z)); g.player.pitch = 0.15; } });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/6_dragon.png' });
  console.log('DRAGON', await page.evaluate(() => JSON.stringify(__game.adv.enemies.map(e => [e.name, Math.round(e.hp), e.pos.toArray().map(Math.round)]))));
  // travel to the moon
  await page.evaluate(() => { const g = __game; for (const e of [...g.adv.enemies]) { e.hp = 0.1; g.adv.attack({ ent: e, t: 0 }); } });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = __game; g.closePanels(); g.give('fuelcell', 2, true); g.flyTo('moon'); });
  await page.waitForFunction(() => __game.look.planet.id === 'moon' && document.getElementById('travel').classList.contains('hide'), null, { timeout: 120000 });
  await page.evaluate(() => __game.pending());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out + '/7_moon.png' });
  console.log('MOON', await page.evaluate(() => JSON.stringify({ world: __game.look.planet.id, inv: __game.state.inv, won: __game.state.won })));
  // book and scanner
  await page.evaluate(() => { const g = __game; g.profile.scanner = 1; g.adv.scan(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/8_scan.png' });
  await page.evaluate(() => __game.openPanel('bookPanel'));
  await page.screenshot({ path: out + '/9_book.png' });
  console.log('ERRORS', errs.length ? errs.join('\n') : 'none');
  await browser.close();
})();
