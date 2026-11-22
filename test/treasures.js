// Treasures and skins: find by digging, box, sparkle; set reward suit; Looks and Treasures pages.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&god');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('stranded-settings-v1', JSON.stringify({ quality: 'normal', sound: 0, music: 0 })); }); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.profile.guide = 9; g.closePanels(); g.start(); g.state.won = true; g.state.storm = { on: false, t: 999 }; g.state.clock = 250; });
  // a sparkle shows up; walk onto it
  await page.evaluate(() => { const S = __game.sparkle; S.wait = 0; });
  await page.waitForTimeout(1500);
  const sp = await page.evaluate(() => { const S = __game.sparkle; return S.on ? [S.g.position.x, S.g.position.z] : null; });
  console.log('sparkle', sp);
  await page.evaluate(([x, z]) => { const p = __game.player; p.pos.x = x - 4; p.pos.z = z - 4; p.pos.y = __game.world.surfaceY(Math.floor(x - 4), Math.floor(z - 4)) + 1.2; p.yaw = Math.atan2(-4, -4); p.pitch = -0.15; }, sp);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/skins/sparkle.png' });
  await page.evaluate(([x, z]) => { const p = __game.player; p.pos.x = x; p.pos.z = z; }, sp);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/skins/found.png' });
  console.log('banner', await page.evaluate(() => [document.getElementById('banner').className, document.getElementById('banner').innerText.slice(0, 120), getComputedStyle(document.getElementById('banner')).opacity]));
  // box treasure, then fill the rest of Mars to win the set suit
  await page.evaluate(() => { __game.treasures.box(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const T = __game.treasures; for (let i = 0; i < 400 && T.count('mars') < 6; i++) { for (const b of [5, 1, 125, 126]) T.dug(b); } });
  console.log('mars count', await page.evaluate(() => [__game.treasures.count('mars'), __game.profile.owned && __game.profile.owned.suit_redplanet]));
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'shots/skins/suit_won.png' });
  // Treasures page
  await page.evaluate(() => { __game.profile.visited.moon = true; __game.profile.treasures.n_rock = 1; __game.openPanel('bookPanel'); document.querySelector('#bookTabs button[data-w=_treasures]').click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/skins/treasures_page.png' });
  // Looks page
  await page.evaluate(() => { __game.give('gem', 6, true); document.querySelector('#bookTabs button[data-w=_looks]').click(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/skins/looks_page.png', fullPage: false });
  await page.evaluate(() => { document.getElementById('bookList').scrollTop = 600; });
  await page.screenshot({ path: 'shots/skins/looks_page2.png' });
  // wear the reward suit and look at the pilot
  await page.evaluate(() => { const rows = [...document.querySelectorAll('#bookList .quest')]; const r = rows.find(x => x.textContent.includes('Red planet')); r.querySelector('button').click(); __game.closePanels(); });
  await page.evaluate(() => { const p = __game.player; p.yaw = 2.4; p.pitch = -0.1; if (!__game.behind) __game.toggleView(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/skins/wearing.png' });
  console.log('suit', await page.evaluate(() => __game.profile.suit));
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
