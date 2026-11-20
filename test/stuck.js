const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const errs = [];
  async function run(tag, opts, q) {
    const ctx = await browser.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    await p.goto('file://' + path.resolve(__dirname, '../dist/play.html') + q, { timeout: 90000 });
    await p.evaluate(() => localStorage.clear()); await p.reload({ timeout: 90000 }); await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('playBtn').click()); await p.waitForTimeout(1500);
    await p.evaluate(() => { const g = __game; g.profile.guide = 99; });
    await p.screenshot({ path: `test/shots/mission_${tag}.png` });
    console.log(tag, 'MISSION', await p.evaluate(() => document.getElementById('mission').innerText.replace(/\n/g, ' | ')));
    // dig a 10 deep shaft away from the ship and drop in
    const r = await p.evaluate(() => { const g = __game, w = g.world; const x = Math.floor(g.player.pos.x) + 14, z = Math.floor(g.player.pos.z) + 3; const top = w.surfaceY(x, z); for (let y = top; y > top - 10; y--) w.set(x, y, z, 0); Object.assign(g.player.pos, { x: x + 0.5, y: top - 9, z: z + 0.5 }); Object.assign(g.player.vel, { x: 0, y: 0, z: 0 }); return [x, top, z]; });
    await p.waitForTimeout(1200);
    console.log(tag, 'IN HOLE', await p.evaluate(() => [Math.floor(__game.player.pos.y), !document.getElementById('upBtn').classList.contains('hide')].join(' ')), 'top', r[1]);
    await p.screenshot({ path: `test/shots/stuck_${tag}.png` });
    // climb by holding jump
    if (tag === 'desk') { await p.keyboard.down('Space'); for (let k = 0; k < 8; k++) { await p.waitForTimeout(2500); console.log('  y', await p.evaluate(() => [__game.player.pos.y.toFixed(2), __game.player.vel.y.toFixed(2), __game.player.onGround].join(' '))); } await p.keyboard.up('Space'); console.log(tag, 'CLIMBED to', await p.evaluate(() => Math.floor(__game.player.pos.y))); }
    // back to top button
    await p.evaluate((r) => { Object.assign(__game.player.pos, { x: r[0] + 0.5, y: r[1] - 9, z: r[2] + 0.5 }); }, r); await p.waitForTimeout(500);
    await p.evaluate(() => document.getElementById('upBtn').click()); await p.waitForTimeout(500);
    console.log(tag, 'UP BTN ->', await p.evaluate(() => Math.floor(__game.player.pos.y)));
    // night + far away + find ship
    await p.evaluate(() => { const g = __game; g.player.pos.x += 40; g.player.pos.z += 30; g.player.pos.y = g.world.surfaceY(Math.floor(g.player.pos.x), Math.floor(g.player.pos.z)) + 1; g.state.clock = 7 * 60; });
    await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById(document.body.classList.contains('touch') ? 'tShip' : 'findBtn').click()); await p.waitForTimeout(800);
    await p.evaluate(() => { const g = __game; const r = parseFloat(document.querySelector('#compass .arrow').style.transform.replace('rotate(', '')); g.player.yaw -= r; g.player.pitch = -0.3; }); await p.waitForTimeout(1200);
    await p.screenshot({ path: `test/shots/findship_${tag}.png` });
    console.log(tag, 'FIND', await p.evaluate(() => document.getElementById('compass').innerText.replace(/\n/g, ' ')), await p.evaluate(() => document.getElementById('mission').innerText.replace(/\n/g, ' | ')));
    await ctx.close();
  }
  await run('desk', { viewport: { width: 1280, height: 760 } }, '?desktop&shot');
  if (!process.env.DESK) await run('phone', { ...devices['iPhone 13 landscape'], deviceScaleFactor: 1 }, '?touch&shot');
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
