const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&world=moon&all'); await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { const g = __game; g.landOn('moon', true); g.start(); g.state.won = true; g.closePanels(); g.pending(); });
  const r = await page.evaluate(() => { const g = __game, a = g.adv, out = {}; for (let i = 0; i < 300 && !(out.bunny && out.robot); i++) { a.spawnFind(); const f = a.finds[a.finds.length - 1]; if (f && (f.kind === 'bunny' || f.kind === 'robot') && !out[f.kind]) { out[f.kind] = f; } else if (f) a.removeFind(f); }
    const res = {}; g.give('sheet', 1, true);
    for (const k of ['bunny', 'robot']) if (out[k]) { const f = out[k]; f.pos.set(g.player.pos.x + 1.5, f.pos.y, g.player.pos.z); res[k] = a.catchFind(f); }
    return JSON.stringify({ res, coins: g.profile.coins, inv: g.state.inv }); });
  console.log(r);
  await page.waitForTimeout(500); await page.screenshot({ path: 'shots/finds2.png' });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
