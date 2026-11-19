const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => { const g = __game; g.landOn('proxima', true); const h = []; for (let x = -120; x < 120; x += 3) for (let z = -120; z < 120; z += 3) h.push(g.world.column(x, z).h); h.sort((a, b) => a - b); return [0.05, 0.1, 0.15, 0.25, 0.5, 0.9].map(q => h[Math.floor(q * h.length)]).join(' '); }));
  await b.close(); })();
