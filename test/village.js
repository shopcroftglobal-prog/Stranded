// Version 30: villages, trading, potions, taming and breeding.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const phone = process.argv.includes('phone');
  const page = await browser.newPage(phone ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? ' ' + extra : ''));
  const shot = (n) => page.screenshot({ path: path.resolve(__dirname, 'shots', (phone ? 'phone_' : '') + n + '.png') });
  const world = process.argv.find(a => /^[a-z0-9]+$/.test(a) && !['phone'].includes(a) && a !== process.argv[0]) || 'mars';
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + (phone ? '?touch&shot&all&eyes' : '?desktop&shot&all&eyes'));
  await page.waitForTimeout(800); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.setMode('normal'); g.landOn('mars', true); g.start(); g.state.won = true; g.state.arrived = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); g.state.locker = true; g.profile.coins = 300; g.state.clock = 0.3 * 14 * 60; });

  // ---- walk to the first village
  await page.evaluate(() => { const g = __game; g.player.fly = true; g.player.pos.x = 62.5; g.player.pos.z = -40; g.player.pos.y = 60; g.player.yaw = 0; g.player.pitch = -0.5; });
  await page.waitForFunction(() => __game.vill.here && __game.vill.people.length === 5, null, { timeout: 30000 }).catch(() => {});
  const v = await page.evaluate(() => __game.vill.here && { ...__game.vill.here });
  ok('found village', !!v, JSON.stringify(v));
  ok('five villagers', await page.evaluate(() => __game.vill.people.length) === 5);
  await page.evaluate((v) => { const g = __game; g.player.pos.x = v.x + 22; g.player.pos.z = v.z + 22; g.player.pos.y = v.y + 16; g.player.yaw = Math.PI / 4; g.player.pitch = -0.5; }, v);
  await page.evaluate(() => __game.toggleView()); await page.waitForTimeout(3000); await shot('village'); await page.evaluate(() => __game.toggleView());
  ok('houses built', await page.evaluate((v) => { const w = __game.world, B = __game.B; return w.get(v.x - 5, v.y + 1, v.z - 5) === B.BRICK && w.get(v.x, v.y, v.z) === B.ICE; }, v));
  // stand in the square and look at the Farmer
  await page.evaluate((v) => { const g = __game; g.player.fly = false; const p = g.vill.people[0]; p.to = null; p.wait = 99; p.pos.set(v.x + 0.5, v.y + 1, v.z + 4.5); g.player.pos.x = v.x + 0.5; g.player.pos.z = v.z + 7.5; g.player.pos.y = v.y + 1; g.player.yaw = 0; g.player.pitch = -0.08; }, v);
  await page.waitForTimeout(1500); await shot('villager');
  ok('aim at villager', await page.evaluate(() => /Farmer/.test(document.getElementById('target').textContent)), await page.evaluate(() => document.getElementById('target').textContent));
  await page.evaluate(() => __game.useAction()); await page.waitForTimeout(300);
  ok('trade panel', await page.evaluate(() => !document.getElementById('villagePanel').classList.contains('hide')));
  await shot('trade');
  const c0 = await page.evaluate(() => __game.profile.coins);
  await page.evaluate(() => document.querySelector('#villageBody button').click());
  ok('trade works', await page.evaluate((c0) => __game.profile.coins === c0 - 6 && __game.state.inv.beanseed === 3, c0));
  await page.evaluate(() => __game.closePanels());

  // ---- potions
  await page.evaluate(() => { const g = __game; for (const [k, n] of Object.entries({ ice: 10, crystal: 6, sheet: 4, beans: 6, fruit: 4, lettuce: 4 })) g.give(k, n, true); g.make('bottle'); g.make('brew'); });
  ok('made bottles and table', await page.evaluate(() => __game.state.inv.bottle === 3 && __game.state.inv.brew === 1));
  await page.evaluate(() => { __game.openPanel('brewPanel'); }); await page.waitForTimeout(200); await shot('potions');
  await page.evaluate(() => { const b = [...document.querySelectorAll('#brewList button')]; b[1].click(); b[2].click(); });
  ok('brewed', await page.evaluate(() => __game.state.inv.p_speed === 1 && __game.state.inv.p_jump === 1));
  await page.evaluate(() => { const g = __game; g.closePanels(); g.drink('p_speed'); });
  await page.waitForTimeout(300);
  ok('speed potion works', await page.evaluate(() => __game.player.speedMul === 1.5 && __game.state.inv.bottle >= 1), await page.evaluate(() => JSON.stringify(__game.state.fx)));
  await page.evaluate(() => { __game.state.fx.speed = 0.01; }); await page.waitForTimeout(500);
  ok('wears off', await page.evaluate(() => __game.player.speedMul === 1));

  // ---- taming and breeding at home
  await page.evaluate(() => { const g = __game; g.player.pos.x = -6.5; g.player.pos.z = 8.5; g.player.pos.y = g.world.surfaceY(-6, 8) + 1; g.give('lettuce', 6, true);
    g.herd.tame({ kind: 'hopper' }, 'lettuce'); g.herd.tame({ kind: 'hopper' }, 'lettuce'); g.herd.tame({ kind: 'bunny' }, 'lettuce'); });
  ok('tamed 3', await page.evaluate(() => __game.herd.list().length === 3));
  ok('wrong food does not tame', await page.evaluate(() => !__game.herd.tame({ kind: 'mole' }, 'lettuce')));
  await page.evaluate(() => { const g = __game, L = g.herd.list(); g.state.sel = 0; g.state.hotbar[0] = 'lettuce'; g.herd.feed(L[0], 'lettuce'); g.herd.feed(L[1], 'lettuce'); });
  ok('baby born', await page.evaluate(() => { const L = __game.herd.list(); return L.length === 4 && L[3].baby > 0 && L[3].kind === 'hopper'; }));
  await page.evaluate(() => { const g = __game; g.player.pos.x = -6.5; g.player.pos.z = 14.5; g.player.pos.y = g.world.surfaceY(-6, 14) + 2; g.player.yaw = 0; g.player.pitch = -0.3; });
  await page.waitForTimeout(2500); await shot('herd');
  const before = await page.evaluate(() => __game.state.inv.ice || 0);
  await page.evaluate(() => { for (const a of __game.herd.list()) a.gift = 1e4; });
  await page.waitForTimeout(800);
  ok('herd brings presents', await page.evaluate((b) => (__game.state.inv.ice || 0) > b, before));

  // ---- villages on another world too
  await page.evaluate(() => { const g = __game; g.landOn('trappist1e', true); g.start(); g.closePanels(); g.player.fly = true; g.player.pos.x = 62; g.player.pos.z = -40; g.player.pos.y = 60; });
  await page.waitForFunction(() => __game.vill.here && __game.vill.people.length === 5, null, { timeout: 30000 }).catch(() => {});
  const v2 = await page.evaluate(() => __game.vill.here && { ...__game.vill.here });
  ok('village on TRAPPIST-1e', !!v2, JSON.stringify(v2));
  if (v2) { await page.evaluate((v) => { const g = __game; g.player.pos.x = v.x - 20; g.player.pos.z = v.z + 24; g.player.pos.y = v.y + 14; g.player.yaw = -Math.PI * 0.2; g.player.pitch = -0.45; }, v2); await page.waitForTimeout(3000); await shot('village_trappist'); }
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
