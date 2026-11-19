// Playing with friends.
// - Friends' camp: one shared world. Every block anyone places or digs there is saved for
//   everyone (db capability) and shows up live.
// - In the camp you see the other pilots walking around, with their names (room capability).
// - Quick chat phrases, and gifts: hand things to a friend standing next to you.
// - The title screen shows who is online and where.
// Everything here is optional: with no room or db (opened outside claude.ai), the camp
// still works as a world of your own.
import * as THREE from 'three';
import { makePilot, animate } from './characters.js';
import { CS } from './world.js';

export const PHRASES = ['Hello!', 'Come here!', 'Look at this!', 'Nice build!', 'Thank you!', 'Follow me!', "Let's race!", 'Bye!'];
const SUITS = ['sand', 'sea', 'sun', 'berry', 'frost'];

export function createFriends(ctx) {
  let room = null, user = null, db = null, tried = false;
  let campRoom = null, campOn = false;
  const others = new Map();          // peer -> { m, tag, bubble, pos, ... }
  const names = {};
  const rndSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const mySuitNow = () => (ctx.suit && ctx.suit()) || rndSuit;
  let say = null, sayT = 0, lastSend = 0;
  const chatLog = [];

  async function caps() {
    if (tried) return;
    tried = true;
    const use = async (n) => { try { return window.claude ? await window.claude.use(n) : null; } catch (e) { return null; } };
    [room, user, db] = await Promise.all([use('room'), use('user'), use('db')]);
    if (room) { room.onPeers(() => ctx.onLobby && ctx.onLobby()); where(ctx.whereNow()); room.on('gift', onGift); }
  }
  caps();

  async function nameOf(p) {
    if (p.isMe) return 'You';
    const id = p.by;
    if (id && user) {
      if (!names[id]) { try { const ps = await user.profiles([id]); names[id] = (ps[id] && ps[id].name) || 'A friend'; } catch (e) { names[id] = 'A friend'; } }
      return names[id];
    }
    return 'A friend';
  }

  // ---- lobby: who is online and where
  function where(w) { if (room) room.presence({ w, s: mySuitNow() }).catch(() => {}); }
  function online() {
    if (!room) return [];
    return room.peers().filter(p => p.kind === 'viewer' && !p.sameTab);
  }
  async function lobbyList() {
    const out = [];
    for (const p of online()) out.push({ name: await nameOf(p), w: String(p.presence.w || 'title'), me: p.isMe });
    return out;
  }

  // ---- the shared camp world
  let CHUNKS = 'camp', cfg = { room: 'friends-camp', where: 'camp' };
  let unsubInfo = null;
  const known = new Set();           // chunk docs that exist
  const pending = new Map();         // chunk doc id -> { field: blockId }
  let flushing = false, unsubDb = null, applying = false;
  const docId = (x, z) => `c_${Math.floor(x / CS)}_${Math.floor(z / CS)}`.replace(/-/g, 'm');
  const field = (x, y, z) => `b${x}_${y}_${z}`.replace(/-/g, 'm');
  const parse = (f) => f.slice(1).replace(/m/g, '-').split('_').map(Number);

  // opts: { room, coll, where, info, onInfo, max } — the Friends' camp by default, or a team world
  async function enterCamp(opts = {}) {
    await caps();
    cfg = { room: opts.room || 'friends-camp', where: opts.where || 'camp', info: opts.info || null, onInfo: opts.onInfo || null, max: opts.max || 0 };
    CHUNKS = opts.coll || 'camp';
    campOn = true;
    if (db && cfg.info && !unsubInfo) {
      unsubInfo = db.collection(cfg.info).onSnapshot((snap) => { for (const ch of snap.docChanges()) if (ch.type !== 'removed' && cfg.onInfo) cfg.onInfo(ch.doc.id, ch.doc.data() || {}); }, () => { unsubInfo = null; });
    }
    // live blocks
    if (db && !unsubDb) {
      unsubDb = db.collection(CHUNKS).limit(1000).onSnapshot((snap) => {
        const w = ctx.world();
        applying = true;
        for (const ch of snap.docChanges()) {
          if (ch.type === 'removed') continue;
          known.add(ch.doc.id);
          const d = ch.doc.data() || {};
          for (const f in d) {
            if (f[0] !== 'b') continue;
            const [x, y, z] = parse(f), id = +d[f];
            if (Number.isFinite(x) && w.get(x, y, z) !== id) w.set(x, y, z, id);
          }
        }
        applying = false;
      }, () => { unsubDb = null; });
    }
    // live pilots
    if (room && !campRoom) {
      try {
        campRoom = await room.join(cfg.room);
        campRoom.onPeers(() => { syncOthers(); ctx.onTeam && ctx.onTeam(); });
        if (cfg.max) await new Promise(r => setTimeout(r, 900));
        if (cfg.max && team().length > cfg.max) { campRoom.leave().catch(() => {}); campRoom = null; return 'full'; }
      } catch (e) { campRoom = null; }
    }
    where(cfg.where);
    return 'ok';
  }
  // write a small shared note for the team (for example, which ship parts are fitted)
  async function setInfo(id, data) {
    if (!db || !cfg.info) return;
    try { const ref = db.collection(cfg.info).doc(id); const s = await ref.get(); if (s.exists) await ref.update(data); else await ref.set(data); } catch (e) { }
  }
  // everyone in the team, in the same order on every screen (so jobs can be split fairly)
  function team() {
    if (!campRoom) return [{ me: true, peer: 'me' }];
    const ps = campRoom.peers().filter(p => p.kind === 'viewer' && !(p.sameTab && !p.isMe));
    const seen = new Set(), out = [];
    for (const p of ps) { const key = p.by || p.peer; if (seen.has(key)) continue; seen.add(key); out.push({ me: !!p.isMe, peer: p.peer, by: p.by }); }
    out.sort((a, b) => String(a.by || a.peer).localeCompare(String(b.by || b.peer)));
    return out;
  }
  function leaveCamp() {
    campOn = false;
    if (unsubDb) { unsubDb(); unsubDb = null; }
    if (unsubInfo) { unsubInfo(); unsubInfo = null; }
    known.clear();
    if (campRoom) { campRoom.leave().catch(() => {}); campRoom = null; }
    for (const [, o] of others) ctx.scene.remove(o.m);
    others.clear();
  }
  // called after any block change I make in the camp
  function blockChanged(x, y, z, id) {
    if (!campOn || applying || !db) return;
    const d = docId(x, z);
    if (!pending.has(d)) pending.set(d, {});
    pending.get(d)[field(x, y, z)] = id;
    flush();
  }
  async function flush() {
    if (flushing) return;
    flushing = true;
    await new Promise(r => setTimeout(r, 250));    // gather a burst into one write
    while (pending.size) {
      const [d, data] = pending.entries().next().value;
      pending.delete(d);
      try {
        const ref = db.collection(CHUNKS).doc(d);
        if (known.has(d)) await ref.update(data);
        else { const s = await ref.get(); if (s.exists) await ref.update(data); else await ref.set(data); known.add(d); }
      } catch (e) {
        if (e && e.code === 'quota_exceeded') ctx.toast('The Friends\' camp is full. Some building was not saved for others.');
        else if (e && (e.code === 'permission_denied' || e.code === 'not_granted')) { ctx.toast('You can look around the camp, but only people the game is shared with to edit can build here.'); pending.clear(); }
      }
    }
    flushing = false;
  }

  // ---- other pilots
  function tagSprite(text, col = '#ffd060') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d');
    x.font = 'bold 26px sans-serif'; const w = Math.min(250, x.measureText(text).width + 20);
    x.fillStyle = 'rgba(26,9,5,0.75)'; x.fillRect((256 - w) / 2, 6, w, 36);
    x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 25);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(2.4, 0.45, 1); return s;
  }
  async function syncOthers() {
    if (!campRoom) return;
    const ps = campRoom.peers().filter(p => p.kind === 'viewer' && !p.sameTab);
    const seen = new Set();
    for (const p of ps) {
      const pr = p.presence || {};
      if (!Array.isArray(pr.p)) continue;
      seen.add(p.peer);
      let o = others.get(p.peer);
      if (!o) {
        const m = makePilot(SUITS.includes(pr.s) ? pr.s : 'sand');
        const tag = tagSprite('…'); tag.position.y = 2.35; m.add(tag);
        ctx.scene.add(m);
        o = { m, tag, peer: p.peer, by: p.by, pos: new THREE.Vector3(), target: new THREE.Vector3(), yaw: 0, moving: 0, sayT: 0, bubble: null };
        o.pos.set(+pr.p[0] || 0, +pr.p[1] || 0, +pr.p[2] || 0);
        others.set(p.peer, o);
        nameOf(p).then(n => { o.name = n; o.m.remove(o.tag); o.tag = tagSprite(n); o.tag.position.y = 2.35; o.m.add(o.tag); });
      }
      o.target.set(+pr.p[0] || 0, +pr.p[1] || 0, +pr.p[2] || 0); o.yaw = +pr.p[3] || 0; o.moving = pr.mv ? 1 : 0;
      if (pr.say && pr.sayT && pr.sayT !== o.sayT && Date.now() - pr.sayT < 8000) {
        o.sayT = pr.sayT;
        const text = String(pr.say).slice(0, 40);
        if (o.bubble) o.m.remove(o.bubble);
        o.bubble = tagSprite(text, '#ffffff'); o.bubble.position.y = 2.95; o.bubble.userData.t = 5; o.m.add(o.bubble);
        chatLog.push(`${o.name || 'A friend'}: ${text}`); if (chatLog.length > 5) chatLog.shift();
        ctx.onChat && ctx.onChat(chatLog);
      }
    }
    for (const [peer, o] of others) if (!seen.has(peer)) { ctx.scene.remove(o.m); others.delete(peer); }
  }
  function update(dt, t) {
    if (!campOn) return;
    const pl = ctx.player();
    if (campRoom && t - lastSend > 0.1) {
      lastSend = t;
      const moving = Math.hypot(pl.vel ? pl.vel.x : 0, pl.vel ? pl.vel.z : 0) > 0.5;
      const pr = { p: [Math.round(pl.pos.x * 10) / 10, Math.round(pl.pos.y * 10) / 10, Math.round(pl.pos.z * 10) / 10, Math.round(pl.yaw * 100) / 100], s: mySuitNow(), mv: moving ? 1 : 0 };
      if (say) { pr.say = say; pr.sayT = sayT; }
      campRoom.presence(pr).catch(() => {});
    }
    for (const [, o] of others) {
      o.pos.lerp(o.target, Math.min(1, dt * 8));
      o.m.position.copy(o.pos); o.m.rotation.y = o.yaw + Math.PI;
      animate(o.m, t, o.moving);
      if (o.bubble) { o.bubble.userData.t -= dt; if (o.bubble.userData.t <= 0) { o.m.remove(o.bubble); o.bubble = null; } }
    }
  }
  function chat(text) {
    say = text; sayT = Date.now();
    chatLog.push(`You: ${text}`); if (chatLog.length > 5) chatLog.shift();
    ctx.onChat && ctx.onChat(chatLog);
    if (campRoom) campRoom.presence({ say, sayT }).catch(() => {});
  }
  // the friend you are looking at, if any
  const ray = new THREE.Raycaster();
  function friendAt(origin, dir, max = 4) {
    let best = null;
    for (const [, o] of others) {
      const c = o.pos.clone().add(new THREE.Vector3(0, 0.9, 0));
      const to = c.clone().sub(origin), t = to.dot(dir);
      if (t < 0 || t > max) continue;
      const d = to.sub(dir.clone().multiplyScalar(t)).length();
      if (d < 0.7 && (!best || t < best.t)) best = { o, t };
    }
    return best;
  }
  // ---- gifts
  function sendGift(o, item, n) {
    if (!room) return false;
    room.emit('gift', { to: o.peer, item, n }).catch(() => {});
    return true;
  }
  async function onGift(m) {
    const d = m.data || {};
    const mine = room.peers().find(p => p.sameTab);
    if (!mine || d.to !== mine.peer || m.sameTab) return;
    const n = Math.max(1, Math.min(999, Math.floor(+d.n || 0)));
    if (!ctx.itemOk(d.item)) return;
    const from = room.peers().find(p => p.peer === m.peer);
    ctx.gotGift(String(d.item), n, from ? await nameOf(from) : 'A friend');
  }

  return {
    enterCamp, leaveCamp, blockChanged, update, chat, friendAt, sendGift, lobbyList, where, setInfo, team, nameOf,
    get debug() { return { info: !!unsubInfo, chunks: !!unsubDb, cfg: { ...cfg, onInfo: !!cfg.onInfo }, CHUNKS, db: !!db, campOn }; },
    get on() { return campOn; }, get others() { return others; }, get connected() { return !!room; }, get canBuild() { return !!db; },
    chatLog,
  };
}
