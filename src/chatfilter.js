// Keeps chat friendly: hides rude words, links, emails and phone numbers.
// Runs on what you send AND on what you receive (someone could send without the game).

// Word roots that are hidden wherever they appear inside a word (after undoing tricks like f*ck, sh1t, fuuuck).
const ROOTS = [
  'fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'nigg', 'niga', 'fagot', 'fagg', 'whore', 'slut', 'pussy',
  'bastard', 'wank', 'twat', 'porn', 'nazi', 'retard', 'motherf', 'penis', 'vagina',
  // common rude words in Urdu / Hindi written in English letters
  'chutiy', 'chootiy', 'madarc', 'maderc', 'bhenc', 'behenc', 'bhanc', 'gandu', 'bhosd', 'randi', 'haramz', 'lund', 'lauda', 'loda',
  'kamina', 'kutiya', 'bsdk',
];
// Short words hidden only when they are the whole word (so "class", "grass", "assist" stay fine).
const WHOLE = new Set(['ass', 'arse', 'asshole', 'dumbass', 'jackass', 'fag', 'fags', 'hoe', 'hoes', 'kys', 'stfu', 'wtf', 'mc', 'bc', 'mf',
  'gand', 'gaand', 'harami', 'kutta', 'kuttay', 'suar', 'ullu', 'sex', 'sexy', 'rape', 'raped', 'rapist', 'dick', 'dicks', 'cock', 'cocks', 'boob', 'boobs', 'tit', 'tits', 'nude', 'nudes', 'damn', 'crap', 'piss', 'kill yourself']);

const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g', '+': 't', '(': 'c', '*': '', '.': '', '-': '', '_': '' };
function squash(w) {
  let s = '';
  for (const ch of w.toLowerCase()) s += ch in LEET ? LEET[ch] : ch;
  s = s.replace(/[^a-z]/g, '');
  return s.replace(/(.)\1+/g, '$1');                     // fuuuck -> fuck, shiiit -> shit
}
const ROOT_SQ = ROOTS.map(squash);
const WHOLE_SQ = new Set([...WHOLE].map(squash));

function rude(word) {
  const s = squash(word);
  if (!s) return false;
  if (WHOLE_SQ.has(s)) return true;
  return ROOT_SQ.some(r => s.includes(r));
}

const stars = (w) => '*'.repeat(Math.max(3, Math.min(8, w.length)));

// Returns { text, changed, hidden: 'words' | 'links' | null }
export function cleanText(input, max = 120) {
  let t = String(input == null ? '' : input);
  // no invisible or control characters, no line breaks, no huge messages
  t = t.replace(/[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  let hidden = null;
  // links, emails, phone numbers and social handles: hidden to keep everyone safe
  const before = t;
  t = t.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '***')
    .replace(/\b\S+@\S+\.\S+/g, '***')
    .replace(/\b[a-z0-9-]+\.(?:com|net|org|io|gg|me|ly|xyz|pk|in|co|tv|app|link|info|ru|uk)\b\S*/gi, '***')
    .replace(/(?:\+?\d[\s().-]*){9,}/g, (m) => '***' + (/\s$/.test(m) ? ' ' : ''))
    .replace(/(?:^|\s)@[a-z0-9_.]{3,}/gi, ' ***');
  if (t !== before) hidden = 'links';
  // words, including spaced out ones like "f u c k"
  const joined = t.replace(/\b(?:[a-z0-9@$!*]\s){2,}[a-z0-9@$!*]\b/gi, (m) => (rude(m.replace(/\s/g, '')) ? stars(m.replace(/\s/g, '')) : m));
  if (joined !== t) { t = joined; hidden = hidden || 'words'; }
  const words = t.replace(/[^\s]+/g, (w) => {
    const core = w.replace(/^[^a-z0-9@$!]+|[^a-z0-9@$!*]+$/gi, '');
    if (core && rude(core)) { hidden = hidden || 'words'; return w.replace(core, stars(core)); }
    return w;
  });
  t = words;
  // two-word phrases
  if (/\bkill\s+(?:your\s*self|urself|yourself)\b/i.test(t)) { t = t.replace(/\bkill\s+(?:your\s*self|urself|yourself)\b/gi, '***'); hidden = hidden || 'words'; }
  return { text: t.trim(), changed: hidden !== null, hidden };
}

// A name shown above a pilot or in chat: short, clean, no links.
export function cleanName(n) {
  const c = cleanText(n, 24).text;
  return c && !/^\*+$/.test(c) ? c : 'A friend';
}
