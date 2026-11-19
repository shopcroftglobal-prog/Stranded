// Tiny synthesized sound effects (no sound files needed).
let ctx = null, master = null;
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}
let sfxVol = 0.35, musicVol = 0.5, musicGain = null, musicTimer = null, mood = 'calm';
export function setVolume(v) { sfxVol = v; if (master) master.gain.value = v; }
// ---- music: soft, slow chords made on the fly. Each world has its own scale.
const SCALES = {
  calm: [0, 2, 4, 7, 9], ice: [0, 2, 3, 7, 10], warm: [0, 4, 5, 7, 11], dark: [0, 3, 5, 7, 10], race: [0, 2, 4, 5, 7, 9, 11],
};
export function setMusic(v) { musicVol = v; if (musicGain) musicGain.gain.value = v * 0.18; }
export function setMood(m) { mood = SCALES[m] ? m : 'calm'; }
export function startMusic() {
  if (!ctx || musicTimer) return;
  musicGain = ctx.createGain(); musicGain.gain.value = musicVol * 0.18; musicGain.connect(ctx.destination);
  let step = 0, root = 0;
  const pad = (freq, t, dur, gain, type = 'triangle') => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + 0.05);
  };
  const play = () => {
    if (!musicVol) return;
    const sc = SCALES[mood], t = ctx.currentTime + 0.05, fast = mood === 'race';
    const base = fast ? 196 : 130.8;   // G3 when racing, C3 otherwise
    const note = (i) => base * Math.pow(2, (sc[((i % sc.length) + sc.length) % sc.length] + 12 * Math.floor(i / sc.length)) / 12);
    if (step % 4 === 0) root = [0, 3, 4, 2][(step / 4) % 4];
    const len = fast ? 1.6 : 4.2;
    if (step % 2 === 0) { pad(note(root), t, len * 2, 0.5, 'sine'); pad(note(root + 2), t, len * 2, 0.32); pad(note(root + 4), t, len * 2, 0.26); }
    // a few gentle bell notes on top
    for (let k = 0; k < (fast ? 4 : 2); k++) if (Math.random() < 0.7) pad(note(root + 5 + Math.floor(Math.random() * 5)) * 2, t + k * len / (fast ? 4 : 2), len * 0.8, 0.12, 'sine');
    step++;
  };
  play();
  musicTimer = setInterval(() => play(), mood === 'race' ? 1600 : 4200);
}
export function restartMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; if (musicGain) musicGain.disconnect(); musicGain = null; } startMusic(); }

function noise(dur, freq, q, gain, type = 'bandpass') {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
function tone(freq, dur, gain, type = 'square', when = 0, slide = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  hit: (hard) => noise(0.07, hard ? 1400 : 700, 1.2, 0.5),
  break: (hard) => { noise(0.18, hard ? 900 : 420, 0.8, 0.9); tone(hard ? 160 : 110, 0.12, 0.12, 'triangle', 0, 0.5); },
  place: () => { noise(0.08, 300, 1, 0.8, 'lowpass'); tone(90, 0.08, 0.2, 'sine'); },
  pickup: () => { tone(660, 0.06, 0.08, 'square'); tone(990, 0.08, 0.06, 'square', 0.05); },
  craft: () => { tone(523, 0.1, 0.09, 'square'); tone(659, 0.1, 0.09, 'square', 0.08); tone(784, 0.16, 0.09, 'square', 0.16); },
  install: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.25, 0.08, 'triangle', i * 0.09)); noise(0.3, 2000, 0.5, 0.2); },
  deny: () => { tone(160, 0.12, 0.12, 'square'); tone(120, 0.16, 0.12, 'square', 0.1); },
  step: () => noise(0.05, 500, 1.5, 0.12),
  jump: () => noise(0.06, 350, 1, 0.2),
  launch: () => { if (!ctx) return; noise(4, 120, 0.5, 2.2, 'lowpass'); tone(55, 4, 0.25, 'sawtooth', 0, 3); },
  swing: () => noise(0.09, 1800, 0.6, 0.35, 'highpass'),
  thud: () => { noise(0.1, 260, 1, 0.9); tone(130, 0.1, 0.12, 'square', 0, 0.6); },
  pop: () => { tone(300, 0.1, 0.12, 'square', 0, 0.4); noise(0.2, 600, 0.6, 0.6); },
  hurt: () => { tone(220, 0.18, 0.14, 'sawtooth', 0, 0.5); noise(0.12, 400, 1, 0.6); },
  coin: () => { tone(988, 0.08, 0.07, 'square'); tone(1319, 0.14, 0.07, 'square', 0.07); },
  catch: () => { [659, 880, 1175].forEach((f, i) => tone(f, 0.16, 0.08, 'triangle', i * 0.07)); },
  wave: () => { [196, 196, 262].forEach((f, i) => tone(f, 0.35, 0.12, 'sawtooth', i * 0.3)); },
  cleared: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 0.09, 'square', i * 0.1)); },
  roar: () => { if (!ctx) return; noise(1.6, 180, 0.4, 1.8, 'lowpass'); tone(70, 1.5, 0.25, 'sawtooth', 0, 0.5); },
  shoot: () => { noise(0.15, 2400, 1, 0.3); tone(700, 0.12, 0.05, 'sine', 0, 0.4); },
  boom: () => { noise(0.6, 150, 0.5, 1.6, 'lowpass'); },
  scan: () => { tone(440, 0.6, 0.06, 'sine', 0, 3); tone(880, 0.5, 0.04, 'sine', 0.1, 2); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, 0.09, 'triangle', i * 0.14)); },
};
