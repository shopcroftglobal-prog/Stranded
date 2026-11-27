// Version 31: signs, the land map and the slingshot. Add `phone` to test the phone layout.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const phone = process.argv.includes('phone');
  const page = await browser.newPage(phone ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? ' ' + extra : ''));
  const shot = (n) => page.screenshot({ path: path.resolve(__dirname, 'shots', (phone ? 'phone_' : '') + n + '.png') });
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + (phone ? '?touch&shot&all&eyes' : '?desktop&shot&all&eyes'));
  await page.waitForTimeout(800); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  await page.evaluate(() => { const g = __game; g.setMode('normal'); g.landOn('mars', true); g.start(); g.state.won = true; g.state.arrived = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); g.state.locker = true; g.profile.coins = 300; g.state.clock = 0.3 * 14 * 60;
    for (const [k, n] of Object.entries({ sheet: 6, iron: 4, rock: 10 })) g.give(k, n, true); });

  // ---- make them
  await page.evaluate(() => { const g = __game; g.make('sign'); g.make('sling'); });
  ok('made sign and slingshot', await page.evaluate(() => __game.state.inv.sign === 2 && __game.state.inv.sling === 1));

  // ---- a flat pad near the ship, place a sign by aiming at the ground
  const P = await page.evaluate(() => {
    const g = __game, w = g.world, B = g.B, x0 = 20, z0 = 20, y = w.surfaceY(x0, z0);
    for (let x = -4; x < 16; x++) for (let z = -16; z < 6; z++) { for (let h = 1; h < 10; h++) w.set(x0 + x, y + h, z0 + z, 0); w.set(x0 + x, y, z0 + z, B.BRICK); }
    g.player.fly = false; Object.assign(g.player.pos, { x:x0 + 0.5, y: y + 1, z: z0 + 3.5 }); g.player.yaw = 0; g.player.pitch = -0.6;
    const i = g.state.hotbar.indexOf('sign'); g.state.sel = i >= 0 ? i : 0; if (i < 0) g.state.hotbar[0] = 'sign';
    return { x0, z0, y };
  });
  await page.waitForFunction(() => __game.hitNow && __game.hitNow.id === __game.B.BRICK, null, { timeout: 15000 }).catch(() => {});
  const spot = await page.evaluate(() => { const h = __game.hitNow; return h && { x: h.x + h.nx, y: h.y + h.ny, z: h.z + h.nz }; });
  await page.evaluate(() => __game.useAction()); await page.waitForTimeout(300);
  ok('sign placed', await page.evaluate((s) => s && __game.world.get(s.x, s.y, s.z) === __game.B.SIGN, spot), JSON.stringify(spot));
  ok('write panel opens', await page.evaluate(() => !document.getElementById('signPanel').classList.contains('hide')));
  await page.fill('#signText', 'Farm this way');
  if (phone) await page.tap('#signSave'); else await page.press('#signText', 'Enter');
  await page.waitForTimeout(300);
  ok('text saved', await page.evaluate((s) => __game.state.signs[`${s.x},${s.y},${s.z}`] === 'Farm this way', spot), await page.evaluate(() => JSON.stringify(__game.state.signs)));
  ok('panel closed', await page.evaluate(() => document.getElementById('signPanel').classList.contains('hide')));
  await page.waitForFunction(() => __game.signs.live.size === 1, null, { timeout: 10000 }).catch(() => {});
  ok('words float above it', await page.evaluate(() => __game.signs.live.size === 1));
  await page.evaluate((P) => { const g = __game; Object.assign(g.player.pos, { x:P.x0 + 0.5, y: P.y + 1, z: P.z0 + 6.5 }); g.player.pitch = -0.12; }, P);
  await page.waitForTimeout(1500); await shot('sign');
  // links are hidden
  await page.evaluate((s) => { __game.signs.open(s.x, s.y, s.z); document.getElementById('signText').value = 'go to www.badsite.com now'; __game.signs.save(); }, spot);
  ok('links hidden', await page.evaluate((s) => !/badsite/.test(__game.state.signs[`${s.x},${s.y},${s.z}`]), spot), await page.evaluate(() => JSON.stringify(__game.state.signs)));
  // dig it away: the words go too
  await page.evaluate((s) => { __game.world.set(s.x, s.y, s.z, 0); }, spot);
  await page.waitForFunction(() => __game.signs.live.size === 0 && Object.keys(__game.state.signs).length === 0, null, { timeout: 10000 }).catch(() => {});
  ok('removed with the block', await page.evaluate(() => __game.signs.live.size === 0 && Object.keys(__game.state.signs).length === 0));
  // keep one sign for the map
  await page.evaluate((s) => { const g = __game; g.world.set(s.x, s.y, s.z, g.B.SIGN); g.state.signs[`${s.x},${s.y},${s.z}`] = 'Camp'; }, spot);

  // ---- slingshot: a monster 12 blocks away
  await page.evaluate((P) => { const g = __game; Object.assign(g.player.pos, { x:P.x0 + 6.5, y: P.y + 1, z: P.z0 + 3.5 }); g.player.yaw = 0; g.player.pitch = 0;
    const i = g.state.hotbar.indexOf('sling'); g.state.sel = i >= 0 ? i : 1; if (i < 0) g.state.hotbar[1] = 'sling'; }, P);
  const e0 = await page.evaluate((P) => { const g = __game; const e = g.adv.spawnEnemy('roller', { spot: { x: P.x0 + 6.5, y: P.y + 1, z: P.z0 - 9 }, visitor: true }); e.speed = 0; e.cd = 99; window.__e = e; return { hp: e.hp }; }, P);
  const r0 = await page.evaluate(() => __game.state.inv.rock);
  await page.waitForTimeout(500);
  await page.evaluate(() => { const g = __game; const e = window.__e; e.pos.z = g.player.pos.z - 12; e.pos.x = g.player.pos.x; g.player.yaw = 0; const eye = g.player.pos.y + 1.62, mid = e.pos.y + e.m.userData.height * 0.5; g.player.pitch = Math.atan2(mid - eye, 12); });
  await page.waitForTimeout(300);
  await page.evaluate(() => __game.useAction());
  ok('shot flies', await page.evaluate(() => __game.sling.shots.length === 1));
  ok('uses rock', await page.evaluate((r0) => __game.state.inv.rock === r0 - 1, r0));
  await page.waitForTimeout(150); await shot('sling');
  await page.waitForFunction(() => __game.sling.shots.length === 0, null, { timeout: 15000 }).catch(() => {});
  const e1 = await page.evaluate(() => ({ hp: window.__e.hp, alive: __game.adv.enemies.includes(window.__e) }));
  ok('hits the monster', e1.hp < e0.hp || !e1.alive, JSON.stringify([e0, e1]));
  await page.evaluate(() => { const g = __game; g.state.inv.rock = 0; g.sling.update(1); });
  await page.evaluate(() => __game.useAction());
  ok('no rock, no shot', await page.evaluate(() => __game.sling.shots.length === 0 && /needs Rock/.test(document.getElementById('toasts').textContent)));
  await page.evaluate(() => { for (const e of [...__game.adv.enemies]) __game.adv.strike(e, 1e6, e.pos.clone()); });

  // ---- map: travel a bit so there is ground to show
  for (const [x, z] of [[0, 0], [60, -60], [62, -110], [-40, 30]]) {
    await page.evaluate(([x, z]) => { const g = __game; g.player.fly = true; Object.assign(g.player.pos, { x:x + 0.5, y: 58, z: z + 0.5 }); }, [x, z]);
    await page.waitForTimeout(phone ? 3500 : 3000);
  }
  await page.evaluate((P) => { const g = __game; Object.assign(g.player.pos, { x:P.x0 + 0.5, y: P.y + 1, z: P.z0 + 6.5 }); g.player.fly = false; g.player.yaw = 0.6; g.land.update(3); }, P);
  const n = await page.evaluate(() => __game.land.explored);
  ok('explored ground', n > 40, n);
  await page.evaluate(() => __game.closePanels(false));
  if (phone) await page.tap('#tMap'); else await page.keyboard.press('KeyM');
  await page.waitForTimeout(300);
  ok('map opens', await page.evaluate(() => !document.getElementById('landPanel').classList.contains('hide')));
  const px = await page.evaluate(() => { const c = document.getElementById('landCanvas'), d = c.getContext('2d').getImageData(0, 0, 256, 256).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 150) lit++; return lit; });
  ok('map shows ground', px > 8000, px);
  await shot('landmap');
  await page.evaluate(() => document.getElementById('landOut').click());
  ok('zoom out', await page.evaluate(() => __game.land.zoom === 1 && /256 by 256/.test(document.getElementById('landSub').textContent)) || await page.evaluate(() => __game.land.zoom === 1), await page.evaluate(() => document.getElementById('landSub').textContent));
  await page.evaluate(() => { document.getElementById('landIn').click(); document.getElementById('landIn').click(); });
  ok('zoom in', await page.evaluate(() => __game.land.zoom === 4));
  await page.evaluate(() => document.getElementById('landOut').click());
  await shot('landmap_close');
  await page.evaluate(() => __game.land.save());
  ok('map saved', await page.evaluate(() => Object.keys(localStorage).some(k => k.endsWith('-map'))));
  if (!phone) { await page.keyboard.press('KeyM'); await page.waitForTimeout(200); ok('M closes it', await page.evaluate(() => document.getElementById('landPanel').classList.contains('hide'))); }
  console.log('ERR', errs.length ? errs.join('\n') : 'none');
  await browser.close();
})();
