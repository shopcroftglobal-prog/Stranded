// Version 29: wiring, mine carts, fishing and boats.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const phone = process.argv.includes('phone');
  const page = await browser.newPage(phone ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? ' ' + extra : ''));
  const shot = (n) => page.screenshot({ path: path.resolve(__dirname, 'shots', (phone ? 'phone_' : '') + n + '.png') });
  await page.goto('file://' + path.resolve(__dirname, '../dist/play.html') + (phone ? '?touch&shot&eyes&all' : '?desktop&shot&eyes&all'));
  await page.waitForTimeout(800); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  const land = (id) => page.evaluate((id) => { const g = __game; g.setMode('normal'); g.landOn(id, true); g.start(); g.state.won = true; g.state.arrived = true; for (const p of ['patch', 'engine', 'fueltank', 'computer']) g.state.fixed[p] = true; g.closePanels(); g.pending(); g.state.locker = true;
    for (const [k, n] of Object.entries({ sheet: 30, iron: 10, crystal: 20, rock: 20, gold: 4, metal: 8 })) g.give(k, n, true); }, id);
  await land('mars');

  // ---- make everything in the bag
  const made = await page.evaluate(() => { const g = __game; for (const k of ['wire', 'wire', 'switch', 'plate', 'wlamp', 'blinker', 'track', 'track', 'fasttrack', 'cart', 'rod', 'boat']) g.make(k); return ['wire', 'switch', 'plate', 'wlamp', 'blinker', 'track', 'fasttrack', 'cart', 'rod', 'boat'].map(k => k + ':' + (g.state.inv[k] || 0)).join(' '); });
  ok('made all', !made.includes(':0'), made);

  // ---- wiring: flat test pad
  const P = await page.evaluate(() => {
    const g = __game, w = g.world, B = g.B, x0 = 30, z0 = 30, y = w.surfaceY(x0, z0);
    for (let x = -2; x < 22; x++) for (let z = -6; z < 10; z++) { for (let h = 1; h < 8; h++) w.set(x0 + x, y + h, z0 + z, 0); w.set(x0 + x, y, z0 + z, B.BRICK); }
    return { x0, z0, y };
  });
  const put = (x, z, id, dy = 1) => page.evaluate(([x, z, id, dy, P]) => { const g = __game; g.world.set(P.x0 + x, P.y + dy, P.z0 + z, id); g.mach.placed(P.x0 + x, P.y + dy, P.z0 + z, id); }, [x, z, id, dy, P]);
  const get = (x, z, dy = 1) => page.evaluate(([x, z, dy, P]) => __game.world.get(P.x0 + x, P.y + dy, P.z0 + z), [x, z, dy, P]);
  const B = await page.evaluate(() => __game.B);
  // switch -> 5 wires -> door (2 high: bottom cell)
  await put(0, 0, B.SWITCH);
  for (let k = 1; k <= 5; k++) await put(k, 0, B.WIRE);
  await put(6, 0, B.DOOR);
  // step plate -> wire -> lamp
  await put(0, 3, B.PLATE); await put(1, 3, B.WIRE); await put(2, 3, B.WIRE); await put(3, 3, B.WLAMP);
  // blinker -> lamp
  await put(0, 6, B.BLINKER); await put(1, 6, B.WLAMP);
  await page.evaluate(() => __game.mach.solve());
  ok('door shut before', await get(6, 0) === B.DOOR);
  await page.evaluate((P) => { const g = __game; g.mach.toggleSwitch({ x: P.x0, y: P.y + 1, z: P.z0, id: g.B.SWITCH }); }, P);
  await page.waitForTimeout(300);
  ok('switch opens door', await get(6, 0) === B.DOOR_OPEN && await get(3, 0) === B.WIRE_ON, `${await get(6, 0)} ${await get(3, 0)}`);
  // walk onto the plate
  await page.evaluate((P) => { const g = __game; g.player.pos.x = P.x0 + 0.5; g.player.pos.z = P.z0 + 3.5; g.player.pos.y = P.y + 1; }, P);
  await page.waitForTimeout(600);
  ok('step plate lights lamp', await get(3, 3) === B.WLAMP_ON && await get(0, 3) === B.PLATE_ON, `${await get(3, 3)}`);
  const blinks = new Set(await page.evaluate((P) => { const out = []; for (let i = 0; i < 12; i++) { __game.mach.update(0.3); out.push(__game.world.get(P.x0 + 1, P.y + 1, P.z0 + 6)); } return out; }, P));
  ok('blinker flashes lamp', blinks.has(B.WLAMP_ON) && blinks.has(B.WLAMP), [...blinks].join());
  await page.evaluate((P) => { const g = __game; g.player.pos.x = P.x0 + 4.5; g.player.pos.z = P.z0 - 4.5; g.player.pos.y = P.y + 4; g.player.fly = true; g.player.yaw = Math.PI + 0.35; g.player.pitch = -0.55; g.state.clock = 0.62 * 14 * 60; }, P);
  await page.waitForTimeout(1500); await shot('wiring');
  await page.evaluate((P) => { const g = __game; g.mach.toggleSwitch({ x: P.x0, y: P.y + 1, z: P.z0, id: g.B.SWITCH_ON }); }, P);
  await page.waitForTimeout(300);
  ok('switch off closes door', await get(6, 0) === B.DOOR && await get(3, 0) === B.WIRE, `${await get(6, 0)}`);

  // ---- mine cart: track east 8, a step up, turn north 5 (with fast track), down a step
  const track = [];
  for (let x = 2; x <= 9; x++) track.push([x, -4, 1]);
  await page.evaluate(([P]) => { const g = __game; g.world.set(P.x0 + 10, P.y + 1, P.z0 - 4, g.B.BRICK); }, [P]);
  track.push([10, -4, 2]);
  for (let z = -3; z <= 2; z++) track.push([10, z, 2]);
  await page.evaluate(([P]) => { const g = __game; for (let z = -3; z <= 2; z++) g.world.set(P.x0 + 10, P.y + 1, P.z0 + z, g.B.BRICK); }, [P]);
  for (const [x, z, dy] of track) await put(x, z, (x === 5 || x === 6) ? B.FAST_X : (x === 10 && z > -4 ? B.TRACK : B.TRACK_X), dy);
  await page.evaluate((P) => { const g = __game; g.player.fly = false; g.player.pos.x = P.x0 + 2.5; g.player.pos.z = P.z0 - 4.5; g.player.pos.y = P.y + 1; g.player.yaw = -Math.PI / 2; g.state.hotbar[8] = 'cart'; g.state.sel = 8; }, P);
  await page.evaluate((P) => __game.mach.startCart({ x: P.x0 + 2, y: P.y + 1, z: P.z0 - 4, id: 152 }), P);
  ok('riding cart', await page.evaluate(() => __game.mach.riding() === 'cart' && !__game.state.inv.cart));
  await page.evaluate(() => { const g = __game; g.keys.add('KeyW'); if (g.TOUCH) { g.tch.move = 99; g.tch.jx = 0; g.tch.jy = -1; } });
  await page.waitForTimeout(900);
  await page.evaluate(() => { __game.player.pitch = -0.2; });
  await shot('cart_ride');
  await page.waitForFunction(() => __game.mach.rideInfo.from && __game.mach.rideInfo.speed === 0 && __game.mach.rideInfo.t === 0 && __game.mach.rideInfo.from[2] > 0, null, { timeout: 40000 }).catch(() => {});
  const end = await page.evaluate((P) => { const r = __game.mach.rideInfo; return [r.from[0] - P.x0, r.from[1] - P.y, r.from[2] - P.z0]; }, P);
  ok('cart reached the end (up the step, round the corner)', end.join() === '10,2,2', end.join());
  await page.evaluate(() => { const g = __game; g.keys.delete('KeyW'); g.tch.move = null; g.tch.jy = 0; });
  await page.evaluate(() => __game.useAction());
  ok('got off cart', await page.evaluate(() => !__game.mach.riding() && __game.state.inv.cart === 1));
  await page.evaluate((P) => { const g = __game; g.player.pos.x = P.x0 + 13.5; g.player.pos.z = P.z0 - 8.5; g.player.pos.y = P.y + 5; g.player.fly = true; g.player.yaw = Math.PI * 0.78; g.player.pitch = -0.5; }, P);
  await page.waitForTimeout(1200); await shot('tracks');

  // ---- fishing on Mars: no fish
  await page.evaluate(() => { const g = __game; g.player.fly = false; g.state.hotbar[7] = 'rod'; g.state.sel = 7; g.useAction(); });
  ok('no fish on mars', await page.evaluate(() => !__game.mach.fishing));

  // ---- TRAPPIST-1e: fish in the sea, then sail a boat
  await land('trappist1e');
  const sea = await page.evaluate(() => { const g = __game, lv = g.water.level; if (lv == null) return null;
    for (let r = 4; r < 200; r += 2) for (let a = 0; a < 16; a++) { const x = Math.round(Math.cos(a / 16 * 6.283) * r), z = Math.round(Math.sin(a / 16 * 6.283) * r);
      let wet = true; for (let dx = -3; dx <= 3 && wet; dx++) for (let dz = -3; dz <= 3; dz++) if (g.world.surfaceY(x + dx, z + dz) >= Math.floor(lv + 0.3)) { wet = false; break; }
      if (wet) return { x, z, lv }; } return null; });
  ok('found open sea', !!sea, JSON.stringify(sea));
  if (sea) {
    await page.evaluate(([s]) => { const g = __game; g.player.fly = true; g.player.pos.x = s.x + 0.5; g.player.pos.z = s.z + 4.5; g.player.pos.y = s.lv + 1.5; g.player.yaw = 0; g.player.pitch = -0.5; g.state.inv.rod = 1; g.state.hotbar[7] = 'rod'; g.state.sel = 7; }, [sea]);
    await page.waitForTimeout(400);
    await page.evaluate(() => __game.useAction());
    ok('cast into sea', await page.evaluate(() => !!__game.mach.fishing));
    await page.evaluate(() => { __game.mach.fishing.wait = 0.1; });
    await page.waitForFunction(() => __game.mach.fishing && __game.mach.fishing.bite > 0, null, { timeout: 5000 }).catch(() => {});
    await shot('fishing_bite');
    const before = await page.evaluate(() => JSON.stringify(__game.state.inv) + __game.profile.coins);
    await page.evaluate(() => __game.useAction());
    const after = await page.evaluate(() => JSON.stringify(__game.state.inv) + __game.profile.coins);
    ok('caught something', before !== after && await page.evaluate(() => !__game.mach.fishing));
    // boat
    await page.evaluate(() => { const g = __game; g.state.inv.boat = 1; g.state.hotbar[6] = 'boat'; g.state.sel = 6; });
    await page.waitForTimeout(200);
    await page.evaluate(() => __game.useAction());
    ok('in the boat', await page.evaluate(() => __game.mach.riding() === 'boat'));
    const b0 = await page.evaluate(() => ({ ...__game.player.pos }));
    await page.evaluate(() => { const g = __game; g.player.fly = false; g.keys.add('KeyW'); if (g.TOUCH) { g.tch.move = 99; g.tch.jx = 0; g.tch.jy = -1; } });
    await page.waitForFunction((b0) => Math.hypot(__game.player.pos.x - b0.x, __game.player.pos.z - b0.z) > 2.5, b0, { timeout: 20000 }).catch(() => {});
    const b1 = await page.evaluate(() => ({ ...__game.player.pos }));
    await page.evaluate(() => { const g = __game; g.keys.delete('KeyW'); g.tch.move = null; g.tch.jy = 0; g.player.pitch = -0.15; });
    ok('boat sails', Math.hypot(b1.x - b0.x, b1.z - b0.z) > 2 && Math.abs(b1.y - (sea.lv - 0.25)) < 0.2, JSON.stringify([b0, b1]));
    await page.waitForTimeout(400);
    await page.evaluate(() => { const g = __game; g.toggleView && g.toggleView(); });
    await page.waitForTimeout(1200); await shot('boat');
    await page.evaluate(() => { const g = __game; g.toggleView && g.toggleView(); });
    await page.evaluate(() => { __game.keys.add('Space'); __game.tch.jump = true; }); await page.waitForTimeout(400); await page.evaluate(() => { __game.keys.delete('Space'); __game.tch.jump = false; });
    ok('off the boat', await page.evaluate(() => !__game.mach.riding() && __game.state.inv.boat === 1));
  }

  // ---- Europa: fish through the ice
  await land('europa');
  const ice = await page.evaluate(() => { const g = __game; for (let r = 3; r < 60; r++) for (let a = 0; a < 24; a++) { const x = Math.round(Math.cos(a / 24 * 6.283) * r) - 8, z = Math.round(Math.sin(a / 24 * 6.283) * r) + 10, y = g.world.surfaceY(x, z); if (g.world.get(x, y, z) === g.B.ICE) return { x, y, z }; } return null; });
  ok('found ice', !!ice, JSON.stringify(ice));
  if (ice) {
    await page.evaluate(([c]) => { const g = __game; g.player.pos.x = c.x + 2.5; g.player.pos.z = c.z + 0.5; g.player.pos.y = c.y + 3; g.state.inv.rod = 1; g.state.hotbar[7] = 'rod'; g.state.sel = 7; g.mach.useRod({ x: c.x + 0.5, y: c.y + 3, z: c.z + 0.5 }, { x: 0, y: -1, z: 0 }, { x: c.x, y: c.y, z: c.z, ny: 1, id: g.B.ICE, t: 2 }); }, [ice]);
    ok('ice fishing', await page.evaluate(() => !!(__game.mach.fishing && __game.mach.fishing.ice)));
  }
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
