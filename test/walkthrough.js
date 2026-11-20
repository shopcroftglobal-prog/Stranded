// Records a bot playing Mars: fix the ship, then waves of stages 1-3 (with skips), as a captioned video.
// Run: node test/walkthrough.js   -> film/walkthrough.mp4
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const OUT = path.resolve(__dirname, '../film');
const FR = OUT + '/frames';
fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });

const BOT = () => {
  const g = window.__game, P = () => g.player, EYE = 1.62;
  const cap = document.createElement('div');
  cap.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99;background:rgba(10,4,2,.82);color:#fff3d6;border:2px solid #7dff9a;padding:6px 12px;font:15px system-ui,sans-serif;max-width:46vw;border-radius:6px';
  document.body.appendChild(cap);
  const tag = document.createElement('div');
  tag.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99;background:#7dff9a;color:#0b2a14;padding:3px 10px;font:bold 13px system-ui,sans-serif;border-radius:4px';
  document.body.appendChild(tag);
  const sp = document.createElement('div'); sp.style.cssText = 'position:fixed;right:12px;bottom:40px;z-index:99;color:#7dff9a;font:bold 14px system-ui,sans-serif;text-shadow:0 1px 2px #000';
  document.body.appendChild(sp);
  const card = document.createElement('div');
  card.style.cssText = 'position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,3,2,.86);color:#ffe7a8;font:bold 34px system-ui,sans-serif;text-align:center;gap:12px';
  document.body.appendChild(card);
  const B = { t: 0, phase: 'ship', sub: null, stuck: 0, last: null, speed: 1, log: [] };
  const say = (s) => { cap.textContent = s; };
  B.card = (title, sub) => { card.innerHTML = `<div>${title}</div><div style="font-size:18px;font-weight:normal;color:#fff3d6;max-width:70vw">${sub || ''}</div>`; card.style.display = 'flex'; };
  B.uncard = () => { card.style.display = 'none'; };
  const keys = g.keys, mouse = g.mouse;
  const turn = (yaw, pitch, dt) => {
    const p = P(); let d = yaw - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    p.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 5);
    p.pitch += Math.sign(pitch - p.pitch) * Math.min(Math.abs(pitch - p.pitch), dt * 3);
    return Math.abs(d) < 0.15;
  };
  const lookAt = (x, y, z, dt) => {
    const p = P(), dx = x - p.pos.x, dy = y - (p.pos.y + EYE), dz = z - p.pos.z;
    return turn(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)), dt);
  };
  const release = () => { keys.delete('KeyW'); keys.delete('Space'); mouse.left = false; };
  // walk towards x,z; returns true once within r
  const walkTo = (x, z, r, dt) => {
    const p = P(), dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
    if (d < r) { keys.delete('KeyW'); keys.delete('Space'); return true; }
    turn(Math.atan2(-dx, -dz), -0.12, dt);
    keys.add('KeyW');
    const sp = Math.hypot(p.vel.x, p.vel.z);
    B.stuck = sp < 1 ? B.stuck + dt : Math.max(0, B.stuck - dt);
    if (B.stuck > 0.25) keys.add('Space'); else keys.delete('Space');
    if (B.stuck > 2.5 && !document.getElementById('upBtn').classList.contains('hide')) { say('Bot: stuck in a hole, pressing Back to the top'); document.getElementById('upBtn').click(); B.stuck = 0; B.log.push('used Back to the top'); return false; }
    if (B.stuck > 4) { // walked into a pit or a cliff: hop over (shown in the log)
      p.pos.x += dx / d * 2; p.pos.z += dz / d * 2; p.pos.y = g.world.surfaceY(Math.floor(p.pos.x), Math.floor(p.pos.z)) + 1.05; B.stuck = 0; B.log.push('hop ' + Math.round(p.pos.x) + ',' + Math.round(p.pos.z));
    }
    return false;
  };
  const closeAll = () => { document.querySelectorAll('.overlay').forEach(o => { if (!o.classList.contains('hide') && o.id !== 'travel') o.classList.add('hide'); }); };
  const panelUp = () => [...document.querySelectorAll('.overlay')].some(o => !o.classList.contains('hide'));

  // ---------- fixing the ship
  function shipTick(dt) {
    const st = g.stepNow();
    if (B.wait > 0) { B.wait -= dt; return; }
    if (B.after) { const f = B.after; B.after = null; f(); return; }
    if (g.state.won || Object.values(g.PARTS).every(p => g.state.fixed[p.id])) { B.phase = 'launch'; release(); return; }
    if (st.bag) {
      release();
      const name = (st.text.match(/next to (.+?)\./) || [])[1];
      const r = g.RECIPES.find(r => g.ITEMS[r.out].name === name);
      say(`Bot: opening the bag to make the ${name}`);
      g.openPanel('bag'); B.wait = 1.6;
      B.after = () => { if (r) g.make(r.out); B.wait = 1.2; B.after = () => { closeAll(); B.wait = 0.3; }; };
      return;
    }
    if (st.ship) {
      say('Bot: part ready, walking back to the ship to fit it');
      B.speed = 2;
      if (!walkTo(g.SHIP_CENTER.x, g.SHIP_CENTER.z, 3.2, dt) && !g.nearShip()) return;
      release();
      const part = g.PARTS.find(p => !g.state.fixed[p.id] && (g.state.inv[p.id] || 0) > 0);
      g.openPanel('shipPanel'); B.wait = 1.5;
      B.after = () => { if (part) g.install(part.id); B.wait = 1.8; B.after = () => { closeAll(); B.wait = 0.3; }; };
      return;
    }
    if (st.block) {
      if (!B.target || g.world.get(Math.floor(B.target.x), B.target.y, Math.floor(B.target.z)) !== st.block) { B.target = g.findNear(st.block); B.digT = 0; }
      const t = B.target;
      if (!t) { B.log.push('no target ' + st.block); return; }
      const p = P(), hd = Math.hypot(t.x - p.pos.x, t.z - p.pos.z);
      say(`Bot: ${hd > 2.3 ? 'walking to' : 'digging toward'} the ${st.label} (following the top arrow)`);
      if (hd > 2.3 && Math.abs(t.y - p.pos.y) < 6) { B.speed = 2; mouse.left = false; walkTo(t.x, t.z, 2.3, dt); return; }
      B.speed = 1;
      if (t.y < p.pos.y - 2.5) {
        // the block is deep down: stand right over it and dig straight down, like a player would
        say(`Bot: digging straight down to the ${st.label}`);
        if (Math.hypot(t.x - p.pos.x, t.z - p.pos.z) > 0.3) { keys.delete('Space'); const dx = t.x - p.pos.x, dz = t.z - p.pos.z; lookAt(t.x, p.pos.y + 0.6, t.z, dt); keys.add('KeyW'); const sp = Math.hypot(p.vel.x, p.vel.z); B.push = sp < 0.5 ? (B.push || 0) + dt : 0; mouse.left = B.push > 0.4; if (B.push > 6) { p.pos.x = t.x; p.pos.z = t.z; B.push = 0; B.log.push('nudge'); } return; }
        keys.delete('KeyW'); p.vel.x *= 0.5; p.vel.z *= 0.5;
        turn(p.yaw, -1.55, dt); mouse.left = true; B.digT += dt; return;
      }
      keys.delete('KeyW'); keys.delete('Space');
      lookAt(t.x, t.y + 0.5, t.z, dt);
      mouse.left = true; B.digT += dt;
      // something in the way (a block between us and the target) gets dug too, which is what a player would do
      if (B.digT > 25) { B.log.push('skip target'); B.target = null; }
    }
  }
  // ---------- waves
  const plan = [
    { n: 1 }, { n: 2 }, { n: 3 },
    { skip: 9, note: 'Skipping ahead to wave 10, the first mini boss.' }, { n: 10 },
    { give: 'sword', note: 'Stage 2 needs the Iron sword (made at the Forge). Skipping the mining for it.' }, { n: 11 },
    { skip: 19, note: 'Skipping ahead to wave 20, the second mini boss.' }, { n: 20 },
    { give: 'csword', note: 'Stage 3 needs the Crystal sword. Skipping the mining for it.' }, { n: 21 },
    { skip: 29, note: 'Skipping ahead to wave 30, the last wave of stage 3.' }, { n: 30 },
  ];
  B.plan = plan; B.pi = 0;
  function waveTick(dt) {
    if (B.wait > 0) { B.wait -= dt; return; }
    if (B.after) { const f = B.after; B.after = null; f(); return; }
    const reward = !document.getElementById('rewardPanel').classList.contains('hide');
    if (reward) { release(); say('Wave cleared! Coins and a chest.'); B.wait = 2.5; B.after = () => { closeAll(); B.inWave = false; B.pi++; B.wait = 0.5; }; return; }
    if (B.inWave) return fight(dt);
    const step = plan[B.pi];
    if (!step) { B.phase = 'done'; release(); return; }
    if (step.skip != null) { B.card('Time skip', step.note); g.jumpWave(step.skip); B.wait = 2.5; B.after = () => { B.uncard(); B.pi++; }; return; }
    if (step.give) { B.card('Time skip', step.note); g.profile.owned[step.give] = 1; g.profile.gear.weapon = step.give; B.wait = 2.5; B.after = () => { B.uncard(); B.pi++; }; return; }
    // like a player: go back to the Wave beacon by the ship first
    if (!g.nearShip()) { say('Bot: walking back to the Wave beacon by the ship'); B.speed = 2; walkTo(g.SHIP_CENTER.x, g.SHIP_CENTER.z, 3.2, dt); return; }
    release(); closeAll();
    g.state.hp = 20; if (g.state.air != null) g.state.air = 100;
    say(`Starting wave ${step.n} at the Wave beacon`);
    g.adv.startWave(); B.inWave = true; B.waveT = 0;
  }
  function fight(dt) {
    B.waveT += dt;
    if (B.waveT > 40) B.speed = 2;
    const p = P();
    const es = g.adv.enemies.filter(e => e.wave && e.hp > 0);
    const w = g.adv.wave;
    if (!w && !es.length) return;
    say(`Wave ${w ? w.n : ''}: ${es.length + (w ? w.todo.length : 0)} creatures left. Hold left click to hit.`);
    if (!es.length) { release(); return; }
    let e = es.reduce((a, b) => (a.pos.distanceTo(p.pos) < b.pos.distanceTo(p.pos) ? a : b));
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    const h = (e.m.userData.height || 1) * 0.5;
    const rr = Math.abs(e.pos.y - p.pos.y) > 1.2 ? 1.2 : 2.2; if (d > rr + 0.2 + (e.m.userData.radius || 0)) { mouse.left = false; walkTo(e.pos.x, e.pos.z, rr + (e.m.userData.radius || 0), dt); lookAt(e.pos.x, e.pos.y + h, e.pos.z, dt); }
    else { keys.delete('KeyW'); keys.delete('Space'); lookAt(e.pos.x, e.pos.y + h, e.pos.z, dt); mouse.left = true; }
    if (B.waveT > 240) { B.log.push('wave too long'); for (const x of es) x.hp = 0; }
  }
  B.tick = (dt) => {
    B.t += dt;
    for (const id of ['pause', 'fallPanel']) { const el = document.getElementById(id); if (el && !el.classList.contains('hide')) { el.classList.add('hide'); B.log.push('closed ' + id); } }
    if (B.phase === 'ship') { tag.textContent = 'Walkthrough · Mars · Fix the ship'; shipTick(dt); }
    else if (B.phase === 'launch') {
      if (!B.lt) { B.lt = 0.001; say('Ship fixed! Taking off to test it'); g.launch(); }
      B.lt += dt;
      if (g.state.won || B.lt > 12) { if (!g.state.won) { B.log.push('launch did not finish: won=' + g.state.won); g.state.won = true; } if (B.lt > 9 || g.state.won) { g.landAgain(); closeAll(); B.phase = 'gear'; B.wait = 0; B.log.push('landed won=' + g.state.won); } }
    } else if (B.phase === 'gear') {
      B.card('Time skip', 'Made a Forge from the bag, placed it, and made a Rock club. Now the waves begin (stage 1).');
      if (!B.gt) { B.gt = 0.001; g.profile.owned.club = 1; g.profile.gear.weapon = 'club'; }
      B.gt += dt; if (B.gt > 3) { B.uncard(); B.phase = 'waves'; }
    } else if (B.phase === 'waves') { tag.textContent = `Walkthrough · Mars · Stage ${Math.min(3, Math.ceil(((g.profile.waves.mars || 0) + 1) / 10))} waves`; waveTick(dt); }
    if (B.phase !== 'done' && panelUp() && !B.wait && !B.after && B.phase !== 'launch' && !card.style.display.includes('flex')) { /* a panel we did not open (night visitors, toasts) */ }
    return B.phase;
  };
  B.speedTag = sp;
  window.__bot = B;
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot&film&god', { timeout: 90000 });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('stranded-settings-v1', JSON.stringify({ quality: 'low', sound: 0, music: 0 })); }); await p.reload({ timeout: 90000 });
  await p.evaluate(() => document.getElementById('playBtn').click());
  await p.evaluate(() => { const g = __game; g.profile.guide = 99; for (let i = 0; i < 200; i++) g.frame(1 / 24, true); });
  await p.evaluate(BOT);
  const cdp = await p.context().newCDPSession(p);
  let n = 0;
  const shot = async () => { const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 78, optimizeForSpeed: true }); fs.writeFileSync(`${FR}/${String(n++).padStart(6, '0')}.jpg`, Buffer.from(r.data, 'base64')); };
  // title card
  await p.evaluate(() => { __bot.card('Stranded · Mars walkthrough', 'A bot plays: fix the ship, then waves of stages 1 to 3. Played at normal speed; walking parts at 2x. God mode is on so the bot never falls.'); __game.frame(1 / 24); });
  for (let k = 0; k < 48; k++) await shot();
  await p.evaluate(() => __bot.uncard());
  if (process.env.FAST) {
    for (let m = 0; m < 40; m++) {
      const r = await p.evaluate(() => { const B = __bot, g = __game; let ph; for (let i = 0; i < 24 * 30; i++) { ph = B.tick(1 / 24); g.frame(1 / 24, true); if (ph === 'done') break; } const p = g.player.pos; const st = g.stepNow ? g.stepNow() : {}; return [ph, (B.t / 60).toFixed(1) + 'min', 'pos', p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1), 'tgt', JSON.stringify(B.target), 'fixed', Object.keys(g.state.fixed).filter(k => g.state.fixed[k]).join('+'), 'waves', g.profile.waves.mars || 0, (st.text || '').slice(0, 60), 'air', Math.round(g.state.air), 'wave', JSON.stringify(g.adv.wave && { n: g.adv.wave.n, todo: g.adv.wave.todo.length }), 'en', g.adv.enemies.filter(e => e.wave).map(e => e.type + (e.flies ? 'F' : '') + ':' + Math.round(e.hp) + '@' + Math.round(Math.hypot(e.pos.x - g.player.pos.x, e.pos.z - g.player.pos.z)) + '/' + (e.pos.y - g.player.pos.y).toFixed(1)).join(','), 'aim', g.aim && g.aim.kind, 'hit', JSON.stringify(g.hit && g.hit() && [g.hit().id, +g.hit().t.toFixed(1)]), 'pi', B.pi, 'inW', B.inWave, 'open', [...document.querySelectorAll('.overlay')].filter(o => !o.classList.contains('hide')).map(o => o.id).join('/'), 'playing', g.playing, B.log.slice(-2).join('|')].join(' '); });
      console.log(r); if (r.startsWith('done')) break;
    }
    console.log('ERR', errs.join('\n') || 'none'); await browser.close(); return;
  }
  const MAX = +(process.env.MAXF || 9000);
  let phase = 'ship', t0 = Date.now();
  while (phase !== 'done' && n < MAX) {
    phase = await p.evaluate(() => { const B = __bot, steps = B.lastSpeed > 1 ? 4 : 2; let ph; for (let i = 0; i < steps; i++) { ph = B.tick(1 / 24); if (i === steps - 2) B.speedTag.textContent = steps > 2 ? '2x speed' : ''; __game.frame(1 / 24, i < steps - 1); } B.lastSpeed = B.speed; B.speed = 1; return ph; });
    await shot();
    if (n % 120 === 0) console.log('frames', n, phase, 'mars waves', await p.evaluate(() => __game.profile.waves.mars || 0), 'min', ((Date.now() - t0) / 60000).toFixed(1), await p.evaluate(() => __bot.log.slice(-3).join(' | ')));
  }
  await p.evaluate(() => { __bot.card('End of walkthrough', `Ship fixed and waves 1 to 30 shown. Time in game: ${Math.round(__bot.t / 60)} minutes.`); __game.frame(1 / 24); });
  for (let k = 0; k < 60; k++) await shot();
  console.log('DONE frames', n, 'phase', phase, 'log', await p.evaluate(() => __bot.log.join(' | ')));
  console.log('ERR', errs.join('\n') || 'none');
  await browser.close();
  execSync(`ffmpeg -y -loglevel error -framerate 12 -i ${FR}/%06d.jpg -c:v libx264 -pix_fmt yuv420p -crf 26 -preset veryfast ${OUT}/walkthrough.mp4`);
  console.log('VIDEO', fs.statSync(`${OUT}/walkthrough.mp4`).size);
})();
