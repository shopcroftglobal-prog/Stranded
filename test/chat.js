// Text and voice chat between two pages, with a stand-in room (BroadcastChannel) and a fake microphone.
// node test/chat.js   (writes screenshots to test/shots/chat_*.png)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// reuse the room + db stand-ins from the friends test
const src = fs.readFileSync(__dirname + '/friends.js', 'utf8').split('(async () => {')[0];
const mod = { exports: {} };
new Function('require', 'module', '__dirname', src + '\nmodule.exports = MOCK;')(require, mod, __dirname);
const ROOM = mod.exports;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 }, permissions: ['microphone'] });
  await ctx.addInitScript(ROOM);
  // a stand-in for the user capability (an id per page)
  await ctx.addInitScript(`(() => { const u0 = window.claude.use, id = 'u' + Math.random().toString(36).slice(2, 8);
    window.claude = { use: async (n) => n === 'user' ? { id: async () => id, profiles: async () => ({}) } : u0(n) }; })();`);
  const errs = [];
  const url = 'file://' + path.resolve(__dirname, '../dist/play.html') + '?desktop&shot';
  const a = await ctx.newPage(); a.on('pageerror', e => errs.push('A ' + e.message));
  await a.goto(url); await a.waitForTimeout(800);
  await a.evaluate(() => localStorage.clear()); await a.reload(); await a.waitForTimeout(800);
  const b = await ctx.newPage(); b.on('pageerror', e => errs.push('B ' + e.message));
  await b.goto(url); await b.waitForTimeout(1500);
  await a.evaluate(() => document.getElementById('campBtn').click());
  await b.evaluate(() => document.getElementById('campBtn').click());
  await a.waitForTimeout(1500);
  await b.evaluate(() => { const g = __game; g.player.pos.x = -8.5; g.player.pos.z = 6.5; g.player.pos.y = g.world.surfaceY(-9, 6) + 1; });
  await a.evaluate(() => { const g = __game; g.player.pos.x = -8.5; g.player.pos.z = 10.5; g.player.pos.y = g.world.surfaceY(-9, 10) + 1; g.player.yaw = 0; g.player.pitch = -0.05; });
  const hist = (p) => p.evaluate(() => __game.chat.debug.hist);
  const check = (name, ok, extra = '') => console.log((ok ? 'PASS ' : 'FAIL ') + name, extra);

  // 1. typing: T opens the box, Enter sends
  await a.bringToFront();
  await a.keyboard.press('KeyT'); await a.waitForTimeout(500);
  await a.keyboard.type('Hello from A, come see my tower');
  await a.keyboard.press('Enter'); await a.waitForTimeout(600);
  check('B gets A\'s message', (await hist(b)).some(l => l.includes('Hello from A')), JSON.stringify([await hist(b), await hist(a), await a.evaluate(() => [document.activeElement.id, document.getElementById('chatIn').value, __game.chat.isOpen(), __game.playing])]));
  await a.screenshot({ path: 'shots/chat_panel.png' });
  await a.keyboard.press('Escape');
  // 2. filter on send and on receive
  await a.evaluate(() => __game.chat.send('you are a sh1t pilot, call 0300 1234567'));
  await a.waitForTimeout(1100);
  const h2 = await hist(b);
  check('rude words + numbers hidden', h2.some(l => l.includes('**** pilot') && l.includes('***')) && !h2.some(l => l.includes('sh1t') || l.includes('1234567')), JSON.stringify(h2.slice(-1)));
  await b.evaluate(() => { const r = __game.friends.room; r.emit('chat', { id: 'raw1', t: 'FUUUCK you www.bad.com', w: 'camp' }); });
  await a.waitForTimeout(500);
  check('filter on receive too', (await hist(a)).some(l => l.includes('****** you ***')), JSON.stringify((await hist(a)).slice(-1)));
  // 3. spam guard
  const r3 = await a.evaluate(() => [1, 2, 3].map(i => __game.chat.send('spam ' + i)));
  check('sending too fast is slowed', r3[0] === true && r3[1] === false, JSON.stringify(r3));
  await b.waitForTimeout(1200);
  await b.screenshot({ path: 'shots/chat_feed.png' });
  // 4. players list: block A from B
  await b.bringToFront();
  await b.evaluate(() => { __game.chat.open(false); document.querySelector('#chatTabs [data-ct=people]').click(); });
  await b.waitForTimeout(400);
  await b.screenshot({ path: 'shots/chat_players.png' });
  await b.evaluate(() => document.querySelector('#ct_people [data-a=block]').click());
  await b.waitForTimeout(300);
  await a.evaluate(() => __game.chat.send('can you still see me?'));
  await b.waitForTimeout(600);
  check('blocked player is hidden', !(await hist(b)).some(l => l.includes('still see me')) && (await b.evaluate(() => __game.friends.others.size)) === 0, JSON.stringify(await b.evaluate(() => __game.chat.debug.blocked)));
  await b.evaluate(() => document.querySelector('#ct_people [data-a=block]').click());
  await b.waitForTimeout(800);
  // 5. report
  await b.evaluate(() => document.querySelector('#ct_people [data-a=report]').click());
  await b.waitForTimeout(300);
  await b.screenshot({ path: 'shots/chat_report.png' });
  await b.evaluate(() => document.querySelector('#ct_people [data-a=why]').click());
  await b.waitForTimeout(500);
  const rep = await b.evaluate(() => Object.entries(JSON.parse(localStorage.getItem('mockdb') || '{}')).filter(([k]) => k.startsWith('reports/')).flatMap(([, v]) => Object.values(v)));
  check('report saved', rep.length === 1 && rep[0].why === 'Rude words' && rep[0].said.length > 0, JSON.stringify(rep));
  check('reported player muted', (await b.evaluate(() => __game.chat.debug.muted)).length === 1);
  await b.evaluate(() => { const k = __game.chat.debug.muted[0]; document.querySelector('#ct_people [data-a=mute]').click(); });
  await b.evaluate(() => __game.closePanels());
  // 6. voice: both turn it on, A holds Z
  await a.bringToFront(); await a.evaluate(() => __game.chat.voiceOn());
  await b.bringToFront(); await b.evaluate(() => __game.chat.voiceOn());
  let conn = [];
  for (let i = 0; i < 20; i++) { await sleep(500); conn = await b.evaluate(() => __game.chat.debug.conn); if (conn[0] === 'connected') break; }
  check('voice connects', conn[0] === 'connected', JSON.stringify(conn) + ' mic ' + JSON.stringify(await a.evaluate(() => [__game.chat.debug.mic, __game.chat.debug.micErr])));
  await b.waitForTimeout(800);
  const quiet = await b.evaluate(() => __game.chat.debug.talking);
  await a.bringToFront();
  await a.keyboard.down('KeyZ');
  let loud = [];
  for (let i = 0; i < 12; i++) { await a.waitForTimeout(300); loud = await b.evaluate(() => __game.chat.debug.talking); if (loud[0]) break; }
  await a.screenshot({ path: 'shots/chat_voice_talking.png' });
  await b.screenshot({ path: 'shots/chat_voice_hearing.png' });
  await a.keyboard.up('KeyZ');
  let after = [];
  for (let i = 0; i < 12; i++) { await a.waitForTimeout(300); after = await b.evaluate(() => __game.chat.debug.talking); if (!after[0]) break; }
  check('push to talk: silent, then heard, then silent', quiet[0] === false && loud[0] === true && after[0] === false, JSON.stringify([quiet, loud, after]));
  // nearby: walk B far away, A's voice fades out
  await b.evaluate(() => { const g = __game; g.player.pos.x = 60; g.player.pos.z = 60; });
  await a.keyboard.down('KeyZ'); await b.waitForTimeout(1500);
  check('far away = can\'t hear', (await b.evaluate(() => __game.chat.debug.talking))[0] === false);
  await a.keyboard.up('KeyZ');
  await b.evaluate(() => { __game.chat.open(false); document.querySelector('#chatTabs [data-ct=voice]').click(); });
  await b.waitForTimeout(300);
  await b.screenshot({ path: 'shots/chat_voice_tab.png' });
  await a.evaluate(() => __game.chat.voiceOff());
  await b.waitForTimeout(800);
  check('voice off hangs up', (await b.evaluate(() => __game.chat.debug.peers)).length === 0);
  console.log('ERR', errs.join('\n') || 'none'); await browser.close();
})();
