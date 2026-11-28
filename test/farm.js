// Version 28: food, farming, cooking, Creative mode, Hardcore and difficulty.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const phone = process.argv.includes('phone');
  const page = await browser.newPage(phone ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' ' + extra : ''));
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + (phone ? '?touch&shot&eyes&world=mars' : '?desktop&shot&eyes&world=mars');
  await page.goto(url); await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForTimeout(800);
  const shot = (n) => page.screenshot({ path: path.resolve(__dirname, 'shots', (phone ? 'phone_' : '') + n + '.png') });

  // ---- title screen: way to play
  await shot('title_modes');
  ok('mode row', await page.evaluate(() => document.querySelectorAll('#modeRow button').length === 3));

  // ---- Survival: food runs down, food locker, farm, stove
  await page.evaluate(() => { const g = __game; g.setMode('normal'); g.landOn('mars', true); g.start(); g.state.won = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); });
  const f0 = await page.evaluate(() => __game.state.food);
  await page.evaluate(() => { for (let i = 0; i < 200; i++) __game.adv.update(0.05); });
  const f1 = await page.evaluate(() => __game.state.food);
  ok('food drains', f1 < f0, `${f0} -> ${f1.toFixed(3)}`);
  await page.evaluate(() => { __game.state.food = 12; }); await page.waitForTimeout(400);
  ok('food locker', await page.evaluate(() => __game.state.inv.potato === 4 && __game.state.inv.beanseed === 2 && __game.state.locker));
  // eat a raw potato
  await page.evaluate(() => { const g = __game; g.state.sel = g.state.hotbar.indexOf('potato'); g.player.pitch = 1.2; });
  await page.waitForTimeout(200);
  await page.evaluate(() => __game.useAction());
  ok('eat potato', await page.evaluate(() => Math.abs(__game.state.food - 15) < 0.1 && __game.state.inv.potato === 3), await page.evaluate(() => __game.state.food));
  // make soil and a stove
  await page.evaluate(() => { const g = __game; for (const [k, n] of Object.entries({ dust: 12, ice: 6, rock: 10, sheet: 2, lettuceseed: 3 })) g.give(k, n, true); g.make('soil'); g.make('stove'); });
  ok('made soil and stove', await page.evaluate(() => __game.state.inv.soil === 4 && __game.state.inv.stove === 1));
  // build a little farm on flat ground: 3 soil in a row, ice next to them
  const farm = await page.evaluate(() => {
    const g = __game, w = g.world, B = g.B;
    const x0 = 14, z0 = 22, y = w.surfaceY(x0, z0);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { for (let h = 1; h < 4; h++) w.set(x0 + k, y + h, z0 + j, B.AIR); w.set(x0 + k, y, z0 + j, j === 1 && k === 3 ? B.ICE : B.SOIL); }
    w.set(x0 + 4, y + 1, z0, B.STOVE);
    return { x0, z0, y };
  });
  // plant by aiming at the soil and pressing Use
  const plantAt = async (x, item) => {
    await page.evaluate(([x, f, item]) => { const g = __game; g.player.fly = true; g.player.pos.x = x + 0.5; g.player.pos.z = f.z0 - 1.5; g.player.pos.y = f.y + 2.2; g.player.yaw = Math.PI; g.player.pitch = -1.0; g.player.vel.y = 0;
      g.state.hotbar[8] = item; g.state.sel = 8; g.renderHotbar && 0; }, [x, farm, item]);
    await page.waitForTimeout(250);
    const h = await page.evaluate(() => { const h = __game.hit(); return h && [h.x, h.y, h.z, h.id, h.ny]; });
    await page.evaluate(() => __game.useAction());
    return h;
  };
  console.log('AIM', JSON.stringify(await plantAt(farm.x0, 'potato')));
  await plantAt(farm.x0 + 1, 'beanseed');
  await plantAt(farm.x0 + 2, 'lettuceseed');
  const crops = await page.evaluate(() => JSON.stringify(__game.state.crops));
  ok('planted 3 crops', Object.keys(JSON.parse(crops)).length === 3, crops);
  await page.evaluate(() => { const g = __game; g.player.pos.x = 15.5; g.player.pos.z = 19; g.player.pos.y += 1.5; g.player.pitch = -0.55; });
  await page.waitForTimeout(1600); await shot('farm_sprouts');
  // grow half way, then ripe
  await page.evaluate(() => { for (const k in __game.state.crops) __game.state.crops[k].t -= 130e3; });
  await page.waitForTimeout(1800); await shot('farm_growing');
  await page.evaluate(() => { for (const k in __game.state.crops) __game.state.crops[k].t -= 400e3; });
  await page.waitForFunction((f) => [0, 1, 2].map(k => __game.world.get(f.x0 + k, f.y + 1, f.z0)).join() === '134,137,140', farm, { timeout: 15000 }).catch(() => {});
  const ids = await page.evaluate((f) => [0, 1, 2].map(k => __game.world.get(f.x0 + k, f.y + 1, f.z0)), farm);
  ok('crops ripe', ids.join() === '134,137,140', ids.join());
  await page.evaluate(() => { const g = __game; g.player.pos.x = 19.5; g.player.pos.z = 18.5; g.player.pos.y = g.world.surfaceY(19, 18) + 2.5; g.player.yaw = Math.PI * 0.8; g.player.pitch = -0.45; });
  await page.waitForTimeout(1800); await shot('farm_ripe');
  // pick by Use (replants) and by digging
  await page.evaluate(([x, f]) => { const g = __game; g.player.pos.x = x + 0.5; g.player.pos.z = f.z0 - 1.5; g.player.pos.y = f.y + 2.2; g.player.yaw = Math.PI; g.player.pitch = -0.75; g.state.hotbar[8] = null; }, [farm.x0, farm]);
  await page.waitForTimeout(250);
  console.log('AIM2', await page.evaluate(() => { const h = __game.hit(); return h && h.id; }));
  await page.evaluate(() => __game.useAction());
  const afterPick = await page.evaluate(() => ({ potato: __game.state.inv.potato, crops: Object.keys(__game.state.crops).length }));
  ok('pick potato (replanted)', afterPick.potato >= 4 && afterPick.crops === 3, JSON.stringify(afterPick));
  await page.evaluate((f) => { const g = __game; g.farm.pickCrop(f.x0 + 1, f.y + 1, f.z0, 137, false); g.farm.pickCrop(f.x0 + 2, f.y + 1, f.z0, 140, false); g.give('beans', 6, true); g.give('lettuce', 4, true); g.give('rawfish', 1, true); g.give('fruit', 2, true); }, farm);
  ok('picked beans and lettuce', await page.evaluate(() => __game.state.inv.beans >= 9 && __game.state.inv.lettuce >= 5));
  // cook at the stove
  await page.evaluate(() => { __game.openPanel('stovePanel'); }); await page.waitForTimeout(300);
  await shot('stove');
  await page.evaluate(() => { const b = [...document.querySelectorAll('#stoveList button')]; b.forEach(x => !x.disabled && x.click()); });
  const cooked = await page.evaluate(() => ['bakedpotato', 'cookedfish', 'stew', 'salad', 'pie'].map(k => __game.state.inv[k] || 0));
  ok('cooked all five', cooked.every(n => n >= 1), cooked.join());
  await page.evaluate(() => { const g = __game; g.closePanels(); g.state.food = 3; g.state.hp = 8; g.state.sel = 0; g.state.hotbar[0] = 'pie'; g.player.pitch = 1.3; });
  await page.waitForTimeout(200); await page.evaluate(() => __game.useAction());
  ok('eat pie', await page.evaluate(() => Math.abs(__game.state.food - 17) < 0.1 && __game.state.hp >= 16), await page.evaluate(() => JSON.stringify([__game.state.food, __game.state.hp])));
  // starving: hunger stops at 1 health on Normal
  await page.evaluate(() => { const g = __game; g.state.food = 0; g.state.hp = 3; for (let i = 0; i < 400; i++) g.adv.update(0.05); });
  ok('normal: hunger stops at 1', await page.evaluate(() => __game.state.hp === 1), await page.evaluate(() => __game.state.hp));
  await page.evaluate(() => { __game.state.food = 18; __game.state.hp = 20; });
  await page.evaluate(() => __game.closePanels()); await page.waitForTimeout(300);
  await shot('hud_food');

  // ---- difficulty
  await page.evaluate(() => { __game.openPanel('setPanel'); document.querySelector('#setBody button[data-d=easy]').click(); });
  await page.waitForTimeout(200); await shot('settings_difficulty');
  const dEasy = await page.evaluate(() => { const g = __game; g.state.hp = 20; g.adv.hurt(4, 'creature'); return g.state.hp; });
  await page.evaluate(() => document.querySelector('#setBody button[data-d=hard]').click());
  const dHard = await page.evaluate(() => { const g = __game; g.state.hp = 20; g.adv.hurt(4, 'creature'); return g.state.hp; });
  ok('easy hits softer than hard', dEasy > dHard, `${dEasy} vs ${dHard}`);
  await page.evaluate(() => document.querySelector('#setBody button[data-d=normal]').click());
  await page.evaluate(() => __game.closePanels());

  // ---- Creative mode: separate save, every block, instant digging, nothing used up
  await page.evaluate(() => { const g = __game; g.closePanels(); g.openPanel('title'); g.setMode('creative'); });
  await page.waitForTimeout(200); await shot('title_creative');
  await page.evaluate(() => { const g = __game; g.realStart(); });
  await page.waitForTimeout(1500);
  const cr = await page.evaluate(() => ({ won: __game.state.won, food: __game.state.food, rock: __game.state.inv.rock, crops: Object.keys(__game.state.crops || {}).length }));
  ok('creative: own world', cr.won && cr.rock === 999 && cr.crops === 0, JSON.stringify(cr));
  await page.evaluate(() => { const g = __game; g.closePanels(); g.openPanel('bag'); });
  await page.waitForTimeout(300); await shot('creative_bag');
  const nBlocks = await page.evaluate(() => document.querySelectorAll('#recipes .slot').length);
  ok('creative: every block', nBlocks > 60, nBlocks);
  await page.evaluate(() => document.querySelectorAll('#recipes .slot')[20].click());
  await page.evaluate(() => { const g = __game; g.closePanels(); g.player.fly = true; g.player.pos.x = 6.5; g.player.pos.z = 30.5; g.player.pos.y = g.world.surfaceY(6, 30) + 3; g.player.yaw = 0; g.player.pitch = -0.9; });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => { const g = __game, it = g.state.hotbar[g.state.sel]; return [it, g.state.inv[it]]; });
  await page.evaluate(() => { for (let i = 0; i < 5; i++) __game.useAction(); });
  const after = await page.evaluate(() => { const g = __game, it = g.state.hotbar[g.state.sel]; return g.state.inv[it]; });
  ok('creative: placing uses nothing', before[1] === 999 && after === 999, before.join());
  const h0 = await page.evaluate(() => { const g = __game; const h = g.hit(); g.mouse.left = true; return h && [h.x, h.y, h.z]; });
  await page.waitForTimeout(800);
  const dug = await page.evaluate((h) => { const g = __game; g.mouse.left = false; return [g.world.get(h[0], h[1], h[2]), JSON.stringify(g.dig), g.hit() && g.hit().id]; }, h0);
  console.log('DIG', JSON.stringify(h0), JSON.stringify(dug));
  ok('creative: instant dig', dug[0] === 0, dug[0]);
  ok('creative: food stays full', await page.evaluate(() => { const g = __game; for (let i = 0; i < 200; i++) g.adv.update(0.05); return g.state.food === 20; }));
  ok('creative: no hurt', await page.evaluate(() => { const g = __game; g.adv.hurt(10, 'creature'); return g.state.hp === 20; }));
  // build something to look at
  await page.evaluate(() => { const g = __game, w = g.world, B = g.B; const x0 = 4, z0 = 26, y = w.surfaceY(x0, z0);
    for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) for (let h = 1; h <= 5; h++) { const edge = x === 0 || z === 0 || x === 6 || z === 6; if (edge && h < 5) w.set(x0 + x, y + h, z0 + z, (h === 2 && (x === 3 || z === 3)) ? 56 : 11); if (h === 5) w.set(x0 + x, y + h, z0 + z, 62); }
    g.player.pos.x = 0.5; g.player.pos.z = 20.5; g.player.pos.y = y + 6; g.player.yaw = Math.PI * 0.82; g.player.pitch = -0.35; });
  await page.waitForTimeout(1800); await shot('creative_build');
  // back to Survival: the survival world is untouched
  await page.evaluate(() => { const g = __game; g.closePanels(); g.openPanel('title'); g.setMode('normal'); g.realStart(); });
  await page.waitForTimeout(800);
  const sv = await page.evaluate(() => [Object.keys(__game.state.crops || {}).length, __game.state.inv.rock, __game.mode, __game.state.won]);
  ok('survival save kept', sv[0] === 1 && sv[1] !== 999, JSON.stringify(sv));

  // ---- Hardcore: one life
  await page.evaluate(() => { const g = __game; g.closePanels(); g.openPanel('title'); g.setMode('hc'); g.realStart(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const g = __game; g.closePanels(); g.profile.waves['mars_hc'] = 3; g.give('rock', 5, true); g.writeSave && 0; });
  await page.waitForTimeout(300); await shot('hardcore_hud');
  await page.evaluate(() => { const g = __game; g.state.hp = 1; g.adv.hurt(50, 'creature'); });
  await page.waitForTimeout(400); await shot('hardcore_over');
  ok('hardcore: game over', await page.evaluate(() => __game.gameIsOver && !document.getElementById('fallPanel').classList.contains('hide') && !__game.profile.waves.mars_hc && !localStorage.getItem('stranded-mars-hc-v1')));
  await page.evaluate(() => document.getElementById('fallOk').click()); await page.waitForTimeout(300);
  ok('hardcore: fresh world, normal kept', await page.evaluate(() => !document.getElementById('title').classList.contains('hide') && !__game.state.inv.rock && !!localStorage.getItem('stranded-on-mars-v1')));

  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
