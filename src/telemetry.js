// Anonymous play-test counts for the public test build only (GoatCounter).
// Sends only short event names like "progress/ship-fixed". No names, no emails, no ids, no cookies.
const CFG = (typeof window !== 'undefined' && window.STRANDED_TEST) || null;
export const TEST_BUILD = !!CFG;
const KEY = 'stranded-tm-v1';
let mem = {};
try { mem = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } };
export function send(path, title) {
  if (!CFG || !CFG.gc) return;
  const q = new URLSearchParams({ p: '/' + path, t: (title || path).slice(0, 300), e: 'true', rnd: Math.random().toString(36).slice(2) });
  try { const img = new Image(); img.referrerPolicy = 'no-referrer'; img.src = `https://${CFG.gc}.goatcounter.com/count?${q}`; } catch (e) { }
}
// send something only the first time it ever happens on this device
export function once(path, title) { if (!CFG) return; mem.done = mem.done || {}; if (mem.done[path]) return; mem.done[path] = 1; save(); send(path, title); }
// on each visit: new or returning, and which day since the first visit
export function visit(version) {
  if (!CFG) return;
  const day = Math.floor(Date.now() / 86400000);
  if (!mem.first) { mem.first = day; save(); send('visit/new', 'New player'); }
  const d = day - mem.first;
  if (mem.lastDay !== day) {
    mem.lastDay = day; mem.days = (mem.days || 0) + 1; save();
    if (d > 0) send(`return/day-${d > 30 ? '30plus' : d}`, `Came back on day ${d}`);
    send(`visit/days-played-${Math.min(mem.days, 10)}`, `Played on ${mem.days} different days`);
  }
  send('visit/open', `Opened the game (${version})`);
}
// minutes of real play in this visit: 5, 15, 30, 60
let mins = 0, acc = 0;
export function tick(dt, playing) {
  if (!CFG || !playing || document.hidden) return;
  acc += dt; if (acc < 60) return; acc -= 60; mins++;
  if ([5, 15, 30, 60, 120].includes(mins)) send(`time/session-${mins}min`, `Played ${mins} minutes in one visit`);
}
export function playMinutes() { return mins; }
