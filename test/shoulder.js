// Over-the-shoulder camera: screenshots and a short clip of the pilot digging.
// Run: node test/shoulder.js   -> test/shots/shoulder_*.png and film/shoulder.mp4
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { execSync } = require('child_process');
const SH = path.resolve(__dirname, 'shots'), FR = path.resolve(__dirname, '../film/shoulder');
fs.mkdirSync(SH, { recursive: true }); fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
const CLIP = !process.argv.includes('--noclip');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&film&god';
  await page.goto(url); await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('playBtn').click()); await page.waitForTimeout(600);
  const step = (n, draw = true) => page.evaluate(([n, draw]) => { for (let i = 0; i < n; i++) __game.frame(1 / 24, !(draw && i === n - 1)); }, [n, draw]);
  await page.evaluate(() => { const g = __game; g.profile.guide = 99; g.give('pickaxe', 1); g.give('drill', 1); g.closePanels && g.closePanels(); });
  await step(150, false);
  // find a spot: face the most open direction and look down at the ground a step ahead
  await page.evaluate(() => { const g = __game; g.player.yaw = 2.3; g.player.pitch = -0.62; document.querySelectorAll('.toast,#guide').forEach(e => e.style.display = 'none'); });
  await step(10);
  let n = 0; const shot = async (name) => { await page.screenshot({ path: path.join(SH, name) }); };
  const film = async (frames, each) => { for (let i = 0; i < frames; i++) { if (each) await page.evaluate(each, i); await step(1); if (CLIP) await page.screenshot({ path: path.join(FR, String(n++).padStart(4, '0') + '.jpg'), quality: 82 }); } };
  console.log('view', await page.evaluate(() => ({ behind: __game.behind, hit: __game.hit() && __game.hit().id })));
  await shot('shoulder_stand.png');
  // dig the ground in front (slow walk around first)
  await film(30, (i) => { __game.player.yaw += 0.006; });
  await page.evaluate(() => { __game.mouse.left = true; });
  let caught = 0;
  for (let k = 0; k < 120; k++) {
    await film(1);
    const ph = await page.evaluate(() => __game.digPh);
    if (!caught && k > 8 && ph > 0.4 && ph < 0.55) { await shot('shoulder_dig_up.png'); caught = 1; }
    if (caught === 1 && ph > 0.9) { await shot('shoulder_dig_hit.png'); caught = 2; }
  }
  await page.evaluate(() => { __game.mouse.left = false; });
  // turn to a hill side and dig into it
  await film(36, (i) => { __game.player.yaw -= 0.03; __game.player.pitch += (-0.25 - __game.player.pitch) * 0.1; });
  await page.evaluate(() => { __game.mouse.left = true; });
  await film(100);
  await shot('shoulder_dig_side.png');
  await page.evaluate(() => { __game.mouse.left = false; __game.keys.add('KeyW'); });
  await film(48, () => { __game.player.yaw += 0.01; });
  await page.evaluate(() => { __game.keys.delete('KeyW'); });
  await shot('shoulder_walk.png');
  // the old view, for comparison
  await page.evaluate(() => __game.toggleView()); await step(4);
  await page.evaluate(() => { document.querySelectorAll('.toast').forEach(e => e.style.display = 'none'); });
  await shot('shoulder_eyes.png');
  console.log('after toggle', await page.evaluate(() => __game.behind));
  await page.evaluate(() => __game.toggleView());
  // phone
  const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  ph.on('pageerror', e => errs.push('PHONE ' + e.message));
  await ph.goto(url.replace('desktop', 'touch')); await ph.waitForTimeout(800);
  await ph.evaluate(() => localStorage.clear()); await ph.reload(); await ph.waitForTimeout(1200);
  await ph.evaluate(() => document.getElementById('playBtn').click()); await ph.waitForTimeout(500);
  await ph.evaluate(() => { const g = __game; g.profile.guide = 99; g.give('pickaxe', 1); for (let i = 0; i < 150; i++) g.frame(1 / 24, true); g.player.yaw = 2.3; g.player.pitch = -0.55; g.mouse.left = true; for (let i = 0; i < 18; i++) g.frame(1 / 24, i < 17); document.querySelectorAll('.toast,#guide').forEach(e => e.style.display = 'none'); });
  await ph.screenshot({ path: path.join(SH, 'shoulder_phone.png') });
  if (CLIP && n) execSync(`ffmpeg -y -loglevel error -framerate 24 -i ${FR}/%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 23 ${path.resolve(__dirname, '../film/shoulder.mp4')}`);
  console.log('frames', n, 'ERR', errs.join('\n') || 'none'); await browser.close();
})();
