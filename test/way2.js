const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(2500);
  console.log(await page.evaluate(() => { const g = __game; const m = g.scene.children.find(c => c.userData && c.userData.arrow); const x = Math.floor(m.position.x), y = m.position.y - 1, z = Math.floor(m.position.z); const w = g.world; return JSON.stringify({ p: g.player.pos, t: [x, y, z], id: w.get(x, y, z), above: w.get(x, y + 1, z), below: w.get(x, y - 1, z) }); }));
  await browser.close();
})();
