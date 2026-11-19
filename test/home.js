const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&world=mars&all'); await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { const g = __game; g.landOn('mars', true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending();
    for (const [k, n] of Object.entries({ rock: 900, stone: 600, crystal: 120, ice: 120, sheet: 60, gold: 20, dust: 40, metal: 10 })) g.give(k, n, true); });
  // stand on open ground away from ship, face +x
  const go = (x, z, yaw) => page.evaluate(([x, z, yaw]) => { const g = __game; g.player.pos.x = x + 0.5; g.player.pos.z = z + 0.5; g.player.pos.y = g.world.surfaceY(x, z) + 1; g.player.yaw = yaw; g.player.pitch = 0; }, [x, z, yaw]);
  await go(20, 20, Math.PI / 2 * 3); await page.waitForTimeout(600);
  await page.evaluate(() => __game.openPanel('buildPanel')); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/build_blocks.png' });
  // plans tab
  await page.evaluate(() => document.querySelector('#buildTabs button[data-t=plans]').click()); await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/build_plans.png' });
  const plans = ['tower', 'wall', 'gate', 'house'];
  const spots = [[20, 20], [20, 32], [20, 44], [20, 56]];
  for (let i = 0; i < 4; i++) {
    await go(spots[i][0], spots[i][1], Math.PI / 2 * 3); await page.waitForTimeout(400);
    await page.evaluate(() => { __game.closePanels(); __game.openPanel('buildPanel'); document.querySelector('#buildTabs button[data-t=plans]').click(); });
    const r = await page.evaluate((i) => { const box = document.querySelectorAll('#buildList .plan')[i]; const chips = box.querySelectorAll('.chip'); chips[Math.min(i + 1, chips.length - 1)].click(); const box2 = document.querySelectorAll('#buildList .plan')[i]; const b = box2.querySelectorAll('button:not(.chip)'); const s = [b[0].disabled, b[1].disabled]; (b[0].disabled ? b[1] : b[0]).click(); return s; }, i);
    console.log('PLAN', plans[i], JSON.stringify(r));
    await page.waitForTimeout(300);
  }
  // view the buildings from a distance
  await page.evaluate(() => { const g = __game; g.closePanels(); g.player.pos.x = 10; g.player.pos.z = 38; g.player.pos.y = g.world.surfaceY(10, 38) + 12; g.player.fly = true; g.player.yaw = -Math.PI / 2 - 0.25; g.player.pitch = -0.35; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/build_view.png' });
  await page.evaluate(() => { const g = __game; g.player.pos.x = 15; g.player.pos.z = 14; g.player.pos.y = g.world.surfaceY(15, 14) + 4; g.player.yaw = -Math.PI / 2 - 0.9; g.player.pitch = -0.15; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/build_view2.png' });
  // home flag near the house
  const h = await page.evaluate(() => { const g = __game; g.player.fly = false;
    const x = 20, z = 54, y = g.world.surfaceY(x, z); g.give('flag', 1, true); g.give('garden', 2, true); g.give('bed', 1, true);
    const place = (it, x, z) => { const y = g.world.surfaceY(x, z) + 1; g.world.set(x, y, z, g.ITEMS ? 0 : 0); };
    return y; });
  // place flag via useAction
  await page.evaluate(() => { const g = __game; g.player.pos.x = 20.5; g.player.pos.z = 52.5; g.player.pos.y = g.world.surfaceY(20, 52) + 1; g.player.yaw = 0; g.player.pitch = -0.9; g.state.sel = g.state.hotbar.indexOf('flag'); if (g.state.sel < 0) { g.state.hotbar[8] = 'flag'; g.state.sel = 8; } });
  await page.waitForTimeout(500);
  await page.evaluate(() => __game.useAction());
  await page.waitForTimeout(300);
  console.log('FLAG', await page.evaluate(() => JSON.stringify(__game.state.flag)));
  // garden
  await page.evaluate(() => { const g = __game; g.state.hotbar[7] = 'garden'; g.state.sel = 7; g.player.yaw = Math.PI / 2; });
  await page.waitForTimeout(400); await page.evaluate(() => __game.useAction()); await page.waitForTimeout(200);
  const gk = await page.evaluate(() => { const g = __game; for (const k in g.state.gardens) g.state.gardens[k] -= 3600e3; return Object.keys(g.state.gardens); });
  await page.waitForFunction((k) => { const [x, y, z] = k.split(',').map(Number); return __game.world.get(x, y, z) === 42; }, gk[0], { timeout: 40000 }).catch(() => {});
  console.log('GARDEN', JSON.stringify(gk), await page.evaluate((k) => { const [x, y, z] = k.split(',').map(Number); return __game.world.get(x, y, z); }, gk[0]));
  await page.evaluate(() => __game.useAction()); await page.waitForTimeout(200);
  console.log('FRUIT', await page.evaluate(() => __game.state.inv.fruit));
  // eat
  await page.evaluate(() => { const g = __game; g.state.hp = 5; g.state.hotbar[6] = 'fruit'; g.state.sel = 6; g.player.pitch = 0.6; });
  await page.waitForTimeout(300); await page.evaluate(() => __game.useAction());
  console.log('HP', await page.evaluate(() => __game.state.hp));
  // home panel
  await page.evaluate(() => { __game.closePanels(); __game.openPanel('homePanel'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const i = document.getElementById('homeName'); i.value = 'Star Fort'; i.dispatchEvent(new Event('input')); document.getElementById('homeGift').click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/home_panel.png' });
  console.log('HOME', await page.evaluate(() => JSON.stringify({ flag: __game.state.flag, best: __game.state.homeBest, gift: __game.profile.gift, coins: __game.profile.coins })));
  await page.evaluate(() => __game.closePanels()); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/home_hud.png' });
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
