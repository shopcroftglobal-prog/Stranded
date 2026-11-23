// Talking to other players.
// - Text chat: type a message (Enter or T), or tap a quick phrase. Everyone online sees it.
//   Rude words, links and phone numbers are hidden (chatfilter.js), on both ends.
// - Players list: mute someone (hide their chat and voice), block them (also hides their
//   pilot, remembered on this device), or report them (saved for the game's owner).
// - Voice: off until you turn it on. Hold Z (or the Talk button) to talk, or leave it always on.
//   Only people in the same place hear you, and in the camp or a team world friends sound
//   louder when they are close. Voice goes straight between players (WebRTC); the room
//   only carries the hand-shake.
// - Where the page may not open the microphone (the claude.ai page), "talk to type" turns
//   what you say into a chat message instead, and you can still hear friends who can talk.
// Everything is optional: with no room (opened outside claude.ai) chat says it needs to be online.
import { cleanText, cleanName } from './chatfilter.js';

const KEY = 'stranded-chat-v1';
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const REASONS = ['Rude words', 'Being mean', 'Asking where I live or for my number', 'Something else'];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createChat(ctx) {
  const $ = (id) => document.getElementById(id);
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const opts = Object.assign({ blocked: {}, mode: 'push', near: true, read: false, vol: {} }, saved);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch (e) { } };
  const muted = new Set();
  let room = null, user = null, db = null, dict = null, tts = null, ready = false, denied = false;
  const hist = [];                    // { id, key, name, text, me, k, w, at }
  const seen = new Set();
  const rate = new Map();             // key -> [times] (spam guard for what we receive)
  const sent = [];                    // my send times
  let lastText = '', lastTextAt = 0;
  let tab = 'chat', reportFor = null;

  // ---------- connect
  (async () => {
    const caps = ctx.friends.caps ? await ctx.friends.caps() : null;
    room = ctx.friends.room; user = ctx.friends.user; db = ctx.friends.db;
    const use = async (n) => { try { return window.claude ? await window.claude.use(n) : null; } catch (e) { return null; } };
    [dict, tts] = await Promise.all([use('dictation'), use('tts')]);
    if (room) {
      room.on('chat', onChat);
      room.on('rtc', onSig);
      room.onPeers(() => { if (tab === 'people') renderPanel(); dropGone(); });
    }
    if (dict) {
      dict.onPartial(({ text }) => { talkPartial = text; renderVoiceBar(); if (micToInput) $('chatIn').value = (micBase + ' ' + text).trim(); });
      dict.onFinal(({ text }) => { talkBuf = (talkBuf + ' ' + text).trim(); talkPartial = ''; if (micToInput) { micBase = (micBase + ' ' + text).trim(); $('chatIn').value = micBase; } });
      dict.onState(({ state }) => { dictOn = state === 'listening'; if (!dictOn) micToInput = false; const b = $('chatMic'); if (b) b.classList.toggle('on', dictOn); renderVoiceBar(); });
    }
    ready = true;
    document.body.classList.toggle('chaton', !!room);
    renderPanel(); renderVoiceBar();
    void caps;
  })();

  const myPeer = () => { const p = room && room.peers().find(q => q.sameTab); return p ? p.peer : null; };
  const keyOf = (m) => m.by || m.peer;
  const isBlocked = (k) => !!opts.blocked[k];
  const hidden = (k) => isBlocked(k) || muted.has(k);
  async function nameOf(m) {
    try { return cleanName(await ctx.friends.nameOf({ by: m.by, isMe: false, peer: m.peer })); } catch (e) { return 'A friend'; }
  }
  function people() {
    if (!room) return [];
    const out = [], have = new Set();
    for (const p of room.peers()) {
      if (p.kind !== 'viewer' || p.sameTab || p.isMe) continue;
      const k = keyOf(p); if (have.has(k)) continue; have.add(k);
      out.push({ key: k, peer: p.peer, by: p.by, w: String((p.presence && p.presence.w) || 'title'), guest: p.guest });
    }
    return out;
  }
  const placeName = (w) => (w === 'camp' ? "Friends' camp" : w === 'title' ? 'title screen' : w === 'race' ? 'racing' : String(w).startsWith('team') ? 'a team world' : (ctx.placeName && ctx.placeName(w)) || 'playing');

  // ---------- text chat
  function addLine(l) {
    hist.push(l); if (hist.length > 60) hist.shift();
    renderFeed(); if (tab === 'chat' && isOpen()) renderHist();
  }
  async function onChat(m) {
    if (m.sameTab || !m.data) return;
    const d = m.data, k = keyOf(m);
    if (hidden(k)) return;
    const id = String(d.id || '').slice(0, 24);
    if (id && seen.has(id)) return; if (id) seen.add(id);
    // spam guard: at most 6 messages in 10 s from one player
    const now = Date.now(), r = (rate.get(k) || []).filter(t => now - t < 10000); r.push(now); rate.set(k, r);
    if (r.length > 6) return;
    const c = cleanText(d.t);
    if (!c.text) return;
    const name = await nameOf(m);
    if (hidden(k)) return;
    addLine({ id, key: k, peer: m.peer, by: m.by, name, text: c.text, me: false, k: d.k === 'v' ? 'v' : 't', w: String(d.w || ''), at: now });
    if (ctx.sfx && ctx.sfx.pickup) ctx.sfx.pickup();
    if (opts.read && tts && d.w === ctx.place()) tts.add([{ text: `${name} says: ${c.text}` }]).catch(() => {});
    ctx.bubble && ctx.bubble(k, m.peer, c.text);
  }
  function send(raw, k = 't') {
    const c = cleanText(raw);
    if (!c.text || /^[*\s?!.]+$/.test(c.text)) { if (c.changed) ctx.toast('That message was hidden. Keep it friendly!'); return false; }
    const now = Date.now();
    while (sent.length && now - sent[0] > 10000) sent.shift();
    if (sent.length >= 5 || (sent.length && now - sent[sent.length - 1] < 1000)) { ctx.toast('Slow down a little, then try again.'); return false; }
    if (c.text === lastText && now - lastTextAt < 15000) { ctx.toast('You just said that.'); return false; }
    sent.push(now); lastText = c.text; lastTextAt = now;
    if (c.hidden === 'links') ctx.toast('Links and numbers are hidden to keep everyone safe.');
    else if (c.hidden === 'words') ctx.toast('Some words were hidden. Keep it friendly!');
    if (ctx.inCamp && ctx.inCamp()) ctx.friends.chat(c.text);   // speech bubble over your pilot
    if (!room) {
      if (!(ctx.inCamp && ctx.inCamp())) ctx.toast('Chat works when the game is opened from its claude.ai link.');
      return true;
    }
    const id = Math.random().toString(36).slice(2, 12);
    seen.add(id);
    room.emit('chat', { id, t: c.text, w: ctx.place(), k }).catch((e) => {
      if (e && e.code === 'not_permitted' && !denied) { denied = true; ctx.toast('To chat, the game owner needs to share it with you so you can play (not only view).'); }
    });
    addLine({ id, key: 'me', name: 'You', text: c.text, me: true, k, w: ctx.place(), at: now });
    return true;
  }

  // ---------- on-screen feed (bottom left), fades after a while
  let feedT = 0;
  function renderFeed() {
    const el = $('chatFeed'); if (!el) return;
    const now = Date.now(), open = isOpen();
    const lines = hist.filter(l => now - l.at < 14000 && (l.me || !hidden(l.key))).slice(-6);
    el.classList.toggle('hide', !lines.length || open);
    el.innerHTML = lines.map(l => line(l)).join('');
  }
  function line(l) {
    const here = !l.w || l.w === ctx.place();
    const where = here || l.me ? '' : ` <i>(${esc(placeName(l.w))})</i>`;
    return `<div class="${l.me ? 'me' : ''}"><b>${esc(l.name)}${where}:</b> ${l.k === 'v' ? '🎤 ' : ''}${esc(l.text)}</div>`;
  }

  // ---------- the panel (T): Chat, Players, Voice
  const isOpen = () => { const p = $('chatPanel'); return p && !p.classList.contains('hide'); };
  function open(focus) {
    if (!isOpen()) ctx.openPanel('chatPanel');
    tab = 'chat'; renderPanel();
    if (focus) { const i = $('chatIn'); if (i) { i.focus(); setTimeout(() => { if (isOpen() && document.activeElement !== i) i.focus(); }, 30); } }
  }
  function renderHist() {
    const h = $('chatHist'); if (!h) return;
    const shown = hist.filter(l => l.me || !hidden(l.key));
    h.innerHTML = shown.length ? shown.map(l => line(l)).join('') : `<div class="sub">${room ? 'No messages yet. Say hello!' : 'Chat works when the game is opened from its claude.ai link.'}</div>`;
    h.scrollTop = h.scrollHeight;
  }
  function renderPanel() {
    const body = $('chatBody'); if (!body || !isOpen()) { renderFeed(); return; }
    document.querySelectorAll('#chatTabs button').forEach(b => b.classList.toggle('on', b.dataset.ct === tab));
    ['chat', 'people', 'voice'].forEach(t => $('ct_' + t).classList.toggle('hide', t !== tab));
    if (tab === 'chat') {
      renderHist();
      $('chatMic').classList.toggle('hide', !dict);
      $('chatNote').textContent = 'Be kind. Rude words, links and phone numbers are hidden. Never share where you live.';
      const list = $('chatList'); list.innerHTML = '';
      for (const p of ctx.phrases) { const b = document.createElement('button'); b.textContent = p; b.onclick = () => { if (send(p)) ctx.closePanels(); }; list.appendChild(b); }
    }
    if (tab === 'people') renderPeople();
    if (tab === 'voice') renderVoice();
    renderFeed();
  }
  async function renderPeople() {
    const el = $('ct_people');
    if (!room) { el.innerHTML = '<p class="sub">Other players show here when the game is opened from its claude.ai link.</p>'; return; }
    const ps = people();
    const rows = [];
    for (const p of ps) {
      const name = await nameOf(p);
      const v = vpeers.get(p.peer), talking = v && v.talking;
      const isM = muted.has(p.key), isB = isBlocked(p.key);
      rows.push(`<div class="prow" data-k="${esc(p.key)}" data-peer="${esc(p.peer)}">
        <div class="pname">${talking ? '🔊 ' : v ? '🎧 ' : ''}${esc(name)}<span>${esc(placeName(p.w))}${p.guest ? ' · guest' : ''}</span></div>
        <div class="pbtns"><button data-a="mute">${isM ? 'Unmute' : 'Mute'}</button><button data-a="block">${isB ? 'Unblock' : 'Block'}</button><button data-a="report">Report</button></div>
        ${v ? `<label class="pvol">Volume <input type="range" min="0" max="150" value="${Math.round((opts.vol[p.key] ?? 1) * 100)}" data-a="vol"></label>` : ''}
        ${reportFor === p.key ? `<div class="preport"><b>Why are you reporting ${esc(name)}?</b>${REASONS.map((r, i) => `<button data-a="why" data-i="${i}">${esc(r)}</button>`).join('')}<button data-a="cancel" class="ghost">Cancel</button></div>` : ''}
      </div>`);
    }
    const blockedOff = Object.entries(opts.blocked).filter(([k]) => !ps.some(p => p.key === k));
    el.innerHTML = (rows.length ? rows.join('') : '<p class="sub">Nobody else is online right now.</p>')
      + (blockedOff.length ? `<h4>Blocked</h4>` + blockedOff.map(([k, n]) => `<div class="prow" data-k="${esc(k)}"><div class="pname">${esc(n || 'A player')}</div><div class="pbtns"><button data-a="block">Unblock</button></div></div>`).join('') : '')
      + '<p class="sub">Mute hides their messages and voice for now. Block also hides their pilot, every time you play. Reports go to the game owner.</p>';
    el.querySelectorAll('.prow').forEach(row => {
      const k = row.dataset.k, peer = row.dataset.peer;
      row.querySelectorAll('button').forEach(b => b.onclick = () => act(b.dataset.a, k, peer, b.dataset.i));
      const r = row.querySelector('input[data-a=vol]'); if (r) r.oninput = () => { opts.vol[k] = +r.value / 100; save(); };
    });
  }
  async function act(a, k, peer, i) {
    const p = people().find(q => q.key === k);
    const name = p ? await nameOf(p) : (opts.blocked[k] || 'A player');
    if (a === 'mute') { if (muted.has(k)) muted.delete(k); else { muted.add(k); ctx.toast(`${name} is muted.`); } }
    if (a === 'block') {
      if (isBlocked(k)) { delete opts.blocked[k]; ctx.toast(`${name} is unblocked.`); }
      else { opts.blocked[k] = name; ctx.toast(`${name} is blocked. You won't see or hear them.`); if (peer) { drop(peer); sig(peer, { t: 'bye' }); } }
      save(); ctx.friends.refresh && ctx.friends.refresh();
    }
    if (a === 'report') reportFor = k;
    if (a === 'cancel') reportFor = null;
    if (a === 'why') { await report(k, p, name, REASONS[+i] || 'Something else'); reportFor = null; }
    for (const [pp, v] of vpeers) if (hidden(v.key)) drop(pp);
    renderPanel();
  }
  async function report(k, p, name, why) {
    const said = hist.filter(l => l.key === k).slice(-8).map(l => l.text);
    const doc = { who: p && p.by ? p.by : null, peer: p ? p.peer : null, why, said, w: p ? p.w : '', at: Date.now() };
    let ok = false;
    if (db) {
      try {
        // one private doc per reporter (reports/<my id>), one field per report; only the owner can read them
        let me = null; try { me = user && user.id ? await user.id() : null; } catch (e) { }
        if (me) {
          const ref = db.collection('reports').doc(String(me)), f = { ['r' + Date.now().toString(36)]: doc };
          const snap = await ref.get().catch(() => null);
          if (snap && snap.exists) await ref.update(f); else await ref.set(f);
          ok = true;
        }
      } catch (e) { ok = false; }
    }
    muted.add(k);
    ctx.toast(ok ? `Thanks. Your report about ${name} was sent, and they are muted for you.` : `Thanks. ${name} is muted for you. (Reports are sent when the game is opened from its claude.ai link.)`);
  }

  // ---------- voice
  let micErr = '';
  let vOn = false, stream = null, ac = null, talking = false, helloT = 0, lastHi = 0;
  let talkBuf = '', talkPartial = '', dictOn = false, micToInput = false, micBase = '';
  const vpeers = new Map();           // peer -> { pc, key, by, el, gain, an, talking, pend: [] }
  const vhere = new Map();            // peer -> { w, mic, at, by }
  const parts = new Map();            // chunked signals
  const canRtc = () => typeof RTCPeerConnection !== 'undefined';
  const nearbyPlace = (w) => w === 'camp' || String(w).startsWith('team');

  async function voiceOn() {
    if (vOn) return;
    if (!room) { ctx.toast('Voice works when the game is opened from its claude.ai link.'); return; }
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume && ac.resume(); } catch (e) { ac = null; }
    stream = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && canRtc()) {
      try {
        ctx.toast('Asking to use your microphone…');
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      } catch (e) { stream = null; micErr = (e && (e.name || e.message)) || 'error'; }
    } else micErr = 'no getUserMedia';
    if (!stream && !dict && !canRtc()) { ctx.toast("Voice can't start on this device."); return; }
    vOn = true;
    setMic();
    hello(); clearInterval(helloT); helloT = setInterval(hello, 5000);
    ctx.toast(stream ? (opts.mode === 'push' ? (ctx.touch ? 'Voice is on. Hold Talk to talk.' : 'Voice is on. Hold Z to talk.') : 'Voice is on. Everyone near you can hear you.')
      : dict ? (ctx.touch ? 'This page cannot use your microphone, so Talk turns your words into chat. You can still hear friends.' : 'This page cannot use your microphone, so Z turns your words into chat. You can still hear friends.')
        : "Your microphone is off for this page. You can still hear friends.");
    document.body.classList.add('voiceon');
    renderPanel(); renderVoiceBar();
  }
  function voiceOff() {
    vOn = false; clearInterval(helloT);
    for (const peer of [...vpeers.keys()]) { sig(peer, { t: 'bye' }); drop(peer); }
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; talking = false;
    if (dictOn && dict) dict.stop().catch(() => {});
    document.body.classList.remove('voiceon');
    renderPanel(); renderVoiceBar();
  }
  function setMic() { if (stream) stream.getAudioTracks().forEach(t => { t.enabled = vOn && (opts.mode === 'open' || talking); }); }

  // hold to talk (Z or the Talk button). Must stay synchronous: dictation starts from the key press itself.
  function talk(down) {
    if (!vOn) return;
    if (down === talking) return;
    talking = down;
    if (stream) setMic();
    else if (dict) {
      if (down) { talkBuf = ''; talkPartial = ''; micToInput = false; dict.start().catch((e) => { if (e && e.code === 'not_granted') ctx.toast('The microphone is off for this page.'); }); }
      else dict.stop().catch(() => {}).then(() => { const t = (talkBuf + ' ' + talkPartial).trim(); talkBuf = ''; talkPartial = ''; if (t) send(t, 'v'); renderVoiceBar(); });
    }
    renderVoiceBar();
  }
  // the 🎤 button in the chat box: speak into the text box
  function micToBox() {
    if (!dict) return;
    if (dictOn) { dict.stop().catch(() => {}); return; }
    micToInput = true; micBase = $('chatIn').value.trim();
    dict.start().catch((e) => { micToInput = false; if (e && e.code === 'not_granted') ctx.toast('The microphone is off for this page.'); });
  }

  function hello() {
    if (!vOn || !room) return;
    lastHi = Date.now();
    room.emit('rtc', { t: 'hi', w: ctx.place(), mic: stream ? 1 : 0 }).catch(() => {});
  }
  function sig(to, obj) {
    if (!room || !to) return;
    const s = JSON.stringify(obj);
    if (s.length < 3000) { room.emit('rtc', { ...obj, to }).catch(() => {}); return; }
    const id = Math.random().toString(36).slice(2, 8), n = Math.ceil(s.length / 2800);
    for (let i = 0; i < n; i++) room.emit('rtc', { t: 'part', to, id, i, n, s: s.slice(i * 2800, (i + 1) * 2800) }).catch(() => {});
  }
  async function onSig(m) {
    if (m.sameTab || !m.data || typeof m.data !== 'object') return;
    let d = m.data;
    const me = myPeer(), k = keyOf(m);
    if (d.t === 'hi') {
      if (!vOn || hidden(k)) return;
      const w = String(d.w || ''), mic = !!d.mic;
      vhere.set(m.peer, { w, mic, at: Date.now(), by: m.by });
      if (w !== ctx.place()) { if (vpeers.has(m.peer)) drop(m.peer); return; }
      if (!vpeers.has(m.peer) && (mic || stream) && me && canRtc()) {
        if (me < m.peer) call(m.peer, m.by);
        else if (Date.now() - lastHi > 1200) hello();      // so they call us now, not in 5 s
      }
      return;
    }
    if (d.to !== me) return;
    if (d.t === 'part') {
      const key = m.peer + d.id, got = parts.get(key) || { n: +d.n || 0, s: [] };
      got.s[+d.i] = String(d.s || ''); parts.set(key, got);
      if (got.s.filter(x => x != null).length < got.n) return;
      parts.delete(key);
      try { d = JSON.parse(got.s.join('')); } catch (e) { return; }
      d.to = me;
    }
    if (hidden(k) || !vOn) { if (d.t === 'offer') sig(m.peer, { t: 'bye' }); return; }
    try {
      if (d.t === 'offer') {
        if (vpeers.has(m.peer)) drop(m.peer);
        const v = pcFor(m.peer, m.by);
        await v.pc.setRemoteDescription({ type: 'offer', sdp: String(d.sdp) });
        const ans = await v.pc.createAnswer(); await v.pc.setLocalDescription(ans);
        sig(m.peer, { t: 'answer', sdp: ans.sdp });
        flushPending(v);
      } else if (d.t === 'answer') {
        const v = vpeers.get(m.peer); if (!v || v.pc.signalingState !== 'have-local-offer') return;
        await v.pc.setRemoteDescription({ type: 'answer', sdp: String(d.sdp) });
        flushPending(v);
      } else if (d.t === 'ice') {
        const v = vpeers.get(m.peer); if (!v || !Array.isArray(d.c)) return;
        for (const c of d.c.slice(0, 20)) { if (v.pc.remoteDescription) v.pc.addIceCandidate(c).catch(() => {}); else v.pend.push(c); }
      } else if (d.t === 'bye') drop(m.peer);
    } catch (e) { drop(m.peer); }
  }
  function flushPending(v) { for (const c of v.pend.splice(0)) v.pc.addIceCandidate(c).catch(() => {}); }
  function pcFor(peer, by) {
    let v = vpeers.get(peer); if (v) return v;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    v = { pc, peer, by, key: by || peer, el: null, gain: null, an: null, talking: false, pend: [], ice: [], iceT: 0, buf: null };
    if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      v.ice.push(e.candidate.toJSON()); clearTimeout(v.iceT);
      v.iceT = setTimeout(() => { const c = v.ice.splice(0); if (c.length) sig(peer, { t: 'ice', c }); }, 150);
    };
    pc.ontrack = (e) => attach(v, (e.streams && e.streams[0]) || new MediaStream([e.track]));
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(peer); if (tab === 'people') renderPanel(); };
    vpeers.set(peer, v);
    return v;
  }
  async function call(peer, by) {
    const v = pcFor(peer, by);
    try { const o = await v.pc.createOffer(); await v.pc.setLocalDescription(o); sig(peer, { t: 'offer', sdp: o.sdp }); } catch (e) { drop(peer); }
  }
  function attach(v, ms) {
    if (v.el) return;
    const el = new Audio(); el.autoplay = true; el.srcObject = ms;
    v.el = el;
    if (ac) {
      el.muted = true;                                   // Chrome only feeds WebAudio when the stream is playing somewhere
      try {
        const src = ac.createMediaStreamSource(ms), g = ac.createGain(), an = ac.createAnalyser();
        an.fftSize = 256; src.connect(an); src.connect(g); g.connect(ac.destination);
        v.gain = g; v.an = an; v.buf = new Uint8Array(an.fftSize);
      } catch (e) { el.muted = false; }
    }
    el.play().catch(() => {});
    if (tab === 'people') renderPanel();
  }
  function drop(peer) {
    const v = vpeers.get(peer); if (!v) return;
    vpeers.delete(peer);
    try { v.pc.close(); } catch (e) { }
    if (v.gain) try { v.gain.disconnect(); } catch (e) { }
    if (v.el) { v.el.srcObject = null; }
  }
  function dropGone() {
    if (!room) return;
    const here = new Set(room.peers().map(p => p.peer));
    for (const peer of [...vpeers.keys()]) if (!here.has(peer)) drop(peer);
  }

  // every frame: volumes by distance, who is talking, the voice bar
  let tick = 0;
  function update(dt) {
    tick += dt;
    if (tick < 0.2) return;
    tick = 0;
    if (hist.length) renderFeed();
    if (!vOn) return;
    const now = Date.now(), place = ctx.place();
    for (const [peer, h] of vhere) if (now - h.at > 16000 || h.w !== place) { vhere.delete(peer); drop(peer); }
    const me = ctx.myPos && ctx.myPos();
    let anyTalk = false;
    for (const [, v] of vpeers) {
      let g = hidden(v.key) ? 0 : (opts.vol[v.key] ?? 1);
      if (opts.near && nearbyPlace(place) && me) {
        const at = ctx.posOf && ctx.posOf(v.key, v.peer);
        if (at) { const d = Math.hypot(at.x - me.x, at.y - me.y, at.z - me.z); g *= d < 8 ? 1 : d > 48 ? 0 : 1 - (d - 8) / 40; }
      }
      if (v.gain && ac) v.gain.gain.setTargetAtTime(g, ac.currentTime, 0.1);
      else if (v.el) { v.el.muted = false; v.el.volume = Math.max(0, Math.min(1, g)); }
      if (v.an) {
        v.an.getByteTimeDomainData(v.buf);
        let s = 0; for (let i = 0; i < v.buf.length; i++) { const x = (v.buf[i] - 128) / 128; s += x * x; }
        const was = v.talking; v.talking = g > 0.05 && Math.sqrt(s / v.buf.length) > 0.005; if (v.talking) anyTalk = true;
        if (was !== v.talking && ctx.talkingMark) ctx.talkingMark(v.key, v.peer, v.talking);
      }
    }
    renderVoiceBar(anyTalk);
  }
  let barHtml = '';
  function renderVoiceBar() {
    const el = $('voiceBar'); if (!el) return;
    let h = '';
    if (vOn) {
      const who = [...vpeers.values()].filter(v => v.talking).map(v => v.name || '');
      const n = vpeers.size;
      const mine = stream ? (opts.mode === 'open' ? '🎙 Mic on' : talking ? '🎙 Talking…' : (ctx.touch ? '🎙 Hold Talk' : '🎙 Hold Z to talk'))
        : dict ? (talking ? `🎤 ${esc(talkPartial || 'Listening…')}` : (ctx.touch ? '🎤 Hold Talk to speak a message' : '🎤 Hold Z to speak a message')) : '🎧 Listening';
      h = `<span class="${talking ? 'live' : ''}">${mine}</span>` + (n ? `<span>🔊 ${n} ${n === 1 ? 'friend' : 'friends'}${who.length ? ' · talking' : ''}</span>` : '');
      // names of whoever is talking
      for (const v of vpeers.values()) if (v.talking && !v.name) nameOf(v).then(nm => { v.name = nm; });
      const names = [...vpeers.values()].filter(v => v.talking && v.name).map(v => esc(v.name));
      if (names.length) h += `<span class="live">${names.join(', ')}</span>`;
    }
    if (h !== barHtml) { barHtml = h; el.innerHTML = h; el.classList.toggle('hide', !h); }
  }
  function renderVoice() {
    const el = $('ct_voice');
    const b = (on, a, label) => `<button class="${on ? 'on' : ''}" data-v="${a}">${label}</button>`;
    const status = !room ? 'Voice works when the game is opened from its claude.ai link.'
      : !vOn ? 'Voice is off. Turn it on to hear friends in the same place as you.'
        : stream ? `Voice is on. ${vpeers.size ? `Connected to ${vpeers.size} ${vpeers.size === 1 ? 'friend' : 'friends'}.` : 'Nobody else here has voice on yet.'}`
          : dict ? `This page cannot use your microphone, so holding ${ctx.touch ? 'Talk' : 'Z'} turns what you say into a chat message. You can still hear friends who can talk.`
            : 'Your microphone is off for this page. You can still hear friends who can talk.';
    el.innerHTML = `<p class="sub">${esc(status)}</p>
      <div class="setrow"><span>Voice chat</span><div>${b(!vOn, 'off', 'Off')}${b(vOn, 'on', 'On')}</div></div>
      <div class="setrow"><span>How to talk</span><div>${b(opts.mode === 'push', 'push', ctx.touch ? 'Hold Talk' : 'Hold Z')}${b(opts.mode === 'open', 'open', 'Always on')}</div></div>
      <div class="setrow"><span>Nearby voice</span><div>${b(opts.near, 'near1', 'On')}${b(!opts.near, 'near0', 'Off')}</div></div>
      ${tts ? `<div class="setrow"><span>Read chat out loud</span><div>${b(!opts.read, 'read0', 'Off')}${b(opts.read, 'read1', 'On')}</div></div>` : ''}
      <p class="sub">Voice is always off when the game starts. Only players in the same place can hear you. With Nearby voice, friends in the Friends' camp and team worlds sound louder when they are close. Mute or block anyone in Players.</p>`;
    el.querySelectorAll('button[data-v]').forEach(x => x.onclick = () => {
      const a = x.dataset.v;
      if (a === 'on') voiceOn(); if (a === 'off') voiceOff();
      if (a === 'push' || a === 'open') { opts.mode = a; setMic(); }
      if (a === 'near1') opts.near = true; if (a === 'near0') opts.near = false;
      if (a === 'read1') opts.read = true; if (a === 'read0') { opts.read = false; if (tts) tts.stop && tts.stop(); }
      save(); renderPanel(); renderVoiceBar();
    });
  }

  // ---------- wire up the panel once
  function wire() {
    document.querySelectorAll('#chatTabs button').forEach(b => b.onclick = () => { tab = b.dataset.ct; reportFor = null; renderPanel(); });
    const inp = $('chatIn');
    const go = () => { const v = inp.value; if (!v.trim()) return; if (send(v)) inp.value = ''; renderHist(); };
    $('chatSend').onclick = go;
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      if (e.key === 'Escape') { inp.blur(); ctx.closePanels(); }
    });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    $('chatMic').onclick = micToBox;
    const t = $('tTalk');
    if (t) {
      t.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); talk(true); t.classList.add('on'); });
      const up = (e) => { e.stopPropagation(); talk(false); t.classList.remove('on'); };
      t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up); t.addEventListener('pointerleave', up);
    }
  }
  wire();

  return {
    send, open, update, talk, voiceOn, voiceOff, renderPanel, isOpen, hidden,
    clean: (t) => cleanText(t).text,
    get typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); },
    get online() { return !!room; }, get ready() { return ready; }, get voice() { return vOn; },
    get debug() { return { vOn, mic: !!stream, micErr, peers: [...vpeers.keys()], here: [...vhere.keys()], hist: hist.map(l => `${l.name}: ${l.text}`), blocked: { ...opts.blocked }, muted: [...muted], me: myPeer(), conn: [...vpeers.values()].map(v => v.pc.connectionState), ac: ac && ac.state, lv: [...vpeers.values()].map(v => { if (!v.an) return -1; v.an.getByteTimeDomainData(v.buf); let q = 0; for (let i = 0; i < v.buf.length; i++) { const x = (v.buf[i] - 128) / 128; q += x * x; } return Math.round(Math.sqrt(q / v.buf.length) * 1000); }), tracks: stream ? stream.getAudioTracks().map(t => t.enabled) : [], talking: [...vpeers.values()].map(v => v.talking) }; },
  };
}
