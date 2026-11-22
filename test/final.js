// Final mission: forge antimatter parts, fit the Galaxy drive, fly to Andromeda, see the three new worlds.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&god');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('stranded-settings-v1', JSON.stringify({ quality: 'normal', sound: 0, music: 0 })); }); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.profile.guide = 9; g.closePanels(); g.start(); g.state.won = true; g.state.storm = { on: false, t: 999 }; g.state.clock = 250; });
  await page.evaluate(() => { const g = __game; for (const [k, n] of Object.entries({ iron: 12, yellowstone: 3, glass: 6, sand: 8, salt: 6, ice: 12 })) g.give(k, n, true); });
  // book page
  await page.evaluate(() => { __game.openPanel('bookPanel'); document.querySelector('#bookTabs button[data-w=_final]').click(); });
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/final/book_start.png' });
  // forge first parts
  await page.evaluate(() => __game.openPanel('forgePanel')); await page.waitForTimeout(300);
  await page.evaluate(() => { for (const nm of ['Magnet ring', 'Focus lens', 'Cold core']) { const r = [...document.querySelectorAll('#forgeList .recipe')].find(x => x.querySelector('.nm').textContent.startsWith(nm)); r.querySelector('button').click(); } });
  await page.evaluate(() => { const l = document.getElementById('forgeList'); const h = l.querySelector('.fhead'); h.scrollIntoView(); });
  await page.waitForTimeout(300); await page.screenshot({ path: 'shots/final/forge.png' });
  // the rest
  await page.evaluate(() => { const g = __game; for (const [k, n] of Object.entries({ blackrock: 16, gold: 8, crystal: 12, gem: 4, scale: 3, magnet: 1, lens: 1, coldcore: 1, salt: 0 })) if (n) g.give(k, n, true); g.renderForge(); });
  const clickAll = async (names) => page.evaluate((names) => { for (const nm of names) { const r = [...document.querySelectorAll('#forgeList .recipe')].find(x => x.querySelector('.nm').textContent.startsWith(nm)); r.querySelector('button').click(); } }, names);
  await clickAll(['Heat shield', 'Heat shield', 'Power crystal', 'Power crystal', 'Antimatter trap', 'Antimatter trap', 'Antimatter cell', 'Antimatter cell']);
  console.log('inv', await page.evaluate(() => ({ am: __game.state.inv.antimatter, trap: __game.state.inv.trap, steps: __game.finalSteps().map(s => s.k + ':' + s.done).join(' ') })));
  await page.waitForTimeout(500); await page.screenshot({ path: 'shots/final/antimatter_made.png' });
  // star map, fit the drive
  await page.evaluate(() => { const g = __game; g.give('sheet', 10, true); g.give('fuelcell', 12, true); g.profile.ship.engine = 3; g.profile.ship.tank = 2; document.getElementById('mapBtn').click(); });
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/final/map_before.png' });
  await page.evaluate(() => { const r = [...document.querySelectorAll('#mapUp .recipe')].find(x => x.textContent.includes('Galaxy drive')); console.log('drive row', !!r); r && r.querySelector('button').click(); });
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/final/map_after.png' });
  console.log('engine', await page.evaluate(() => __game.profile.ship.engine));
  for (const w of ['glass', 'tide', 'ring']) {
    await page.evaluate((w) => { __game.closePanels(); __game.give('fuelcell', 8, true); __game.travel(w); }, w);
    await page.waitForTimeout(9000);
    await page.evaluate(() => { const g = __game; g.closePanels(); g.start(); g.state.clock = 250; g.state.storm = { on: false, t: 999 }; g.pending(); });
    await page.waitForTimeout(3000);
    await page.evaluate(() => { const p = __game.player; p.yaw = 0.6; p.pitch = 0.08; });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/final/world_${w}.png` });
    console.log(w, await page.evaluate(() => [__game.look.planet.id, document.getElementById('banner').innerText.slice(0, 90), __game.profile.galaxyDone ? 'done' : '']));
    await page.evaluate(() => { const p = __game.player; p.yaw = 3.4; p.pitch = 0.3; });
    await page.waitForTimeout(1500); await page.screenshot({ path: `shots/final/world_${w}_sky.png` });
  }
  await page.evaluate(() => { __game.openPanel('bookPanel'); document.querySelector('#bookTabs button[data-w=_final]').click(); });
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/final/book_done.png' });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
