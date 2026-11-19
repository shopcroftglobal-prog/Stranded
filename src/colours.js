// Bright colours for building blocks. Plain names on purpose.
export const COLOURS = [
  ['sky', 'Sky blue', '#4ab0f0'],
  ['leaf', 'Leaf green', '#4ac060'],
  ['sun', 'Sun yellow', '#ffd040'],
  ['berry', 'Berry red', '#e04060'],
  ['grape', 'Grape purple', '#9a5ae0'],
  ['coral', 'Coral orange', '#ff8040'],
  ['snow', 'Snow white', '#eeeef4'],
  ['night', 'Night blue', '#34345a'],
];
export const COLOUR = Object.fromEntries(COLOURS.map(([k, name, hex]) => [k, { name, hex }]));
// lighten (+) or darken (-) a colour
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
// which colours each kind of building block comes in
export const FAMILIES = [
  { id: 'wall', name: 'wall', colours: ['sky', 'leaf', 'sun', 'berry', 'grape', 'coral', 'snow', 'night'] },
  { id: 'bricks', name: 'bricks', colours: ['sky', 'leaf', 'sun', 'berry', 'grape', 'coral', 'snow', 'night'] },
  { id: 'roof', name: 'roof', colours: ['berry', 'sky', 'leaf', 'night', 'coral', 'grape'] },
  { id: 'glass', name: 'glass', colours: ['sky', 'berry', 'leaf', 'sun', 'grape'] },
  { id: 'lamp', name: 'lamp', colours: ['sun', 'sky', 'leaf', 'berry', 'grape'] },
  { id: 'banner', name: 'banner', colours: ['berry', 'sky', 'leaf', 'sun', 'grape', 'night'] },
];
