const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--run-all-compositor-stages-before-draw'] });
  const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&film&god', { timeout: 90000 });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('stranded-settings-v1', JSON.stringify({ quality: 'low' })); }); await p.reload({ timeout: 90000 });
  await p.evaluate(() => document.getElementById('playBtn').click());
  for (let k = 0; k < 5; k++) { const t = Date.now(); await p.evaluate(() => { for (let i = 0; i < 40; i++) __game.frame(1 / 24, true); }); console.log('warm 40 nodraw ms/frame', (Date.now() - t) / 40); }
  let t = Date.now();
  await p.evaluate(() => { for (let i = 0; i < 20; i++) __game.frame(1 / 24, true); });
  console.log('nodraw', (Date.now() - t) / 20);
  t = Date.now();
  await p.evaluate(() => { for (let i = 0; i < 10; i++) __game.frame(1 / 24); });
  console.log('draw', (Date.now() - t) / 10);
  t = Date.now();
  for (let i = 0; i < 10; i++) { await p.evaluate(() => __game.frame()); await p.screenshot({ path: '/tmp/claude-0/-home-claude/285da15f-9a2e-5a42-a116-4ab5b12b89fd/scratchpad/f.jpg', type: 'jpeg', quality: 80 }); }
  console.log('frame+shot ms', (Date.now() - t) / 10);
  const cdp = await p.context().newCDPSession(p);
  t = Date.now();
  for (let i = 0; i < 10; i++) { await p.evaluate(() => __game.frame()); const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, optimizeForSpeed: true }); }
  console.log('cdp frame+shot ms', (Date.now() - t) / 10);
  await browser.close();
})();
