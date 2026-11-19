const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&world=proxima&all';
  await page.goto(url);
  await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { const g = __game; g.landOn('proxima', true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); });
  // place 3 rigs: third should be refused
  const r = await page.evaluate(() => {
    const g = __game, out = [];
    g.give('rig', 3, true);
    for (let k = 0; k < 3; k++) {
      const x = 14 + k * 3, z = 6, y = g.world.surfaceY(x, z);
      g.player.pos.x = x + 0.5; g.player.pos.z = z + 2.5; g.player.pos.y = y + 1; g.player.yaw = 0; g.player.pitch = -0.9;
      g.camera.position.set(g.player.pos.x, g.player.pos.y + 1.62, g.player.pos.z); g.camera.rotation.set(-0.9, 0, 0, 'YXZ'); g.camera.updateMatrixWorld();
      const d = new g.THREE.Vector3(); g.camera.getWorldDirection(d);
      const h = g.world.raycast(g.camera.position, d, 5.5);
      g.state.hotbar[0] = 'rig'; g.state.sel = 0;
      // fake the hit
      window.__hit = h;
      out.push(h ? [h.x, h.y, h.z] : null);
    }
    return out;
  });
  console.log('HITS', JSON.stringify(r));
  // use the real place path through the frame: aim and call useAction
  for (let k = 0; k < 3; k++) {
    await page.evaluate((k) => { const g = __game; const x = 14 + k * 3, z = 6, y = g.world.surfaceY(x, z); g.player.pos.x = x + 0.5; g.player.pos.z = z + 2.3; g.player.pos.y = y + 1; g.player.yaw = 0; g.player.pitch = -0.75; g.state.sel = g.state.hotbar.indexOf('rig'); }, k);
    await page.waitForTimeout(500);
    await page.evaluate(() => __game.useAction());
  }
  console.log('RIGS', await page.evaluate(() => JSON.stringify(__game.profile.rigs)));
  // pretend 2 hours passed
  await page.evaluate(() => { for (const r of Object.values(__game.profile.rigs)) r.t -= 2 * 3600 * 1000; });
  await page.evaluate(() => { const g = __game; const k = Object.keys(g.profile.rigs)[0].split('|')[1].split(',').map(Number); g.player.yaw = 0; });
  // reload: welcome back
  await page.reload(); await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/rig_title.png' });
  await page.evaluate(() => document.getElementById('playBtn').click());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/rig_welcome.png' });
  await page.evaluate(() => { const g = __game; const k = Object.keys(g.profile.rigs)[0].split('|')[1].split(',').map(Number); g.closePanels(); });
  console.log('STORE', await page.evaluate(() => JSON.stringify(Object.values(__game.profile.rigs).map(r => r.store))));
  // open rig panel directly
  await page.evaluate(() => { const g = __game; const [x, y, z] = Object.keys(g.profile.rigs)[0].split('|')[1].split(',').map(Number); g.player.pos.x = x + 0.5; g.player.pos.z = z + 2.3; g.player.pos.y = y + 1; g.player.yaw = 0; g.player.pitch = -0.6; });
  await page.waitForTimeout(600);
  await page.evaluate(() => __game.useAction());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/rig_panel.png' });
  await page.evaluate(() => { __game.closePanels(); __game.openPanel('bag'); });
  await page.screenshot({ path: 'shots/rig_bag.png' });
  console.log('ERR', errs.join('\n') || 'none');
  await browser.close();
})();
