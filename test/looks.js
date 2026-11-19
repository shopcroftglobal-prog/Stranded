const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.profile.guide = 9; g.profile.coins = 500; g.player.yaw = Math.PI * 0.75; g.player.pitch = -0.2; g.profile.book.mars = { hopper: true }; g.pets.choose('hopper'); });
  await page.keyboard.press('KeyY'); await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/behind.png' });
  // buy and wear the Berry suit
  await page.evaluate(() => __game.openPanel('bookPanel'));
  await page.evaluate(() => document.querySelector('#bookTabs button[data-w=_looks]').click()); await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/looks.png' });
  await page.evaluate(() => { const rows = [...document.querySelectorAll('#bookList .quest')]; const r = rows.find(x => x.textContent.includes('Berry suit')); r.querySelector('button').click(); });
  console.log('SUIT', await page.evaluate(() => [__game.profile.suit, __game.profile.coins]));
  await page.evaluate(() => { __game.closePanels(); const g = __game; g.state.won = true; g.profile.rover = true; });
  await page.keyboard.press('KeyV'); await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW'); await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/behind_rover.png' });
  console.log('BEHIND', await page.evaluate(() => __game.behind));
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
