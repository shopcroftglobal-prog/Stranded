// Real worlds. The numbers come from NASA's planetary fact sheets (Mars, Moon, Europa)
// and the NASA Exoplanet Archive (Proxima b, TRAPPIST-1e, LHS 1140 b).
// Everything is bundled here so the game works offline.
//
// `real` is the measured data. `look` is how we draw it. For planets around other stars
// nobody has seen the ground, so their colours are our best guess from the data
// (how cold it is, how much it weighs, what colour its star is).

export const PLANETS = [
  {
    id: 'mars', name: 'Mars', blurb: 'The red planet. Dusty, cold, with ice hiding in its craters.',
    real: {
      gravity: 0.38, radius: 0.53, density: 3.93, tempC: -65, air: 'thin',
      star: { name: 'the Sun', teff: 5772, radius: 1.0 }, orbitAU: 1.52,
      from: 'earth-neighbour', distanceText: 'Our neighbour: light takes 3 to 22 minutes to get there',
      yearText: 'A year lasts 687 days. A day lasts 24 hours and 37 minutes.',
    },
    surface: { top: 'Red dirt', under: 'Dust' },
    sky: 'Two small lumpy moons: Phobos and Deimos.',
    rare: [{ ore: 'crystal', why: 'Purple crystal, deep down and in some craters.' }],
  },
  {
    id: 'moon', name: 'The Moon', blurb: 'Our own Moon. Grey, airless, covered in craters. Earth hangs in the sky.',
    real: {
      gravity: 0.165, radius: 0.27, density: 3.34, tempC: -20, air: 'none',
      tempText: 'From -173 °C at night to 127 °C in the day',
      star: { name: 'the Sun', teff: 5772, radius: 1.0 }, orbitAU: 1.0,
      distanceText: 'Right next to Earth: 384,000 km, about 1.3 light seconds',
      yearText: 'A day lasts about a month: 29 and a half Earth days.',
    },
    surface: { top: 'Grey dust', under: 'Moon dust' },
    sky: 'Earth, blue and white, hangs in the black sky.',
    rare: [
      { ore: 'glass', why: 'Orange glass: tiny glass beads from old volcanoes, found by astronauts in 1972. Look near crater rims.' },
      { ore: 'crystal', why: 'Purple crystal is rare here.' },
    ],
  },
  {
    id: 'europa', name: 'Europa', blurb: 'A moon of Jupiter. A shell of ice over a hidden ocean, cut by brown cracks.',
    real: {
      gravity: 0.134, radius: 0.25, density: 3.01, tempC: -160, air: 'none',
      star: { name: 'the Sun', teff: 5772, radius: 1.0 }, orbitAU: 5.2,
      distanceText: 'Next to Jupiter: light takes about 40 minutes to get there',
      yearText: 'Goes round Jupiter every 3 and a half days.',
      hostPlanet: { radiusKm: 69911, distanceKm: 671000 },
    },
    surface: { top: 'Frost', under: 'Snow' },
    sky: 'Jupiter fills a big part of the sky. The Sun is a small bright dot.',
    rare: [
      { ore: 'salt', why: 'Salt: the brown streaks along the cracks. Salt from the ocean below.' },
      { ore: 'crystal', why: 'Purple crystal, under the ice.' },
    ],
  },
  {
    id: 'proxima', name: 'Proxima b', blurb: 'The closest planet to us outside our Solar System. Its red sun never moves in the sky.',
    real: {
      gravity: 1.0, gravityGuess: true, mass: 1.07, radius: 1.03, radiusGuess: true, density: 5.5, tempC: -39, air: 'thin',
      star: { name: 'Proxima Centauri', teff: 3042, radius: 0.154 }, orbitAU: 0.0485,
      lightYears: 4.24, yearDays: 11.2,
      yearText: 'A year lasts 11 days. One side always faces its star.',
    },
    surface: { top: 'Brown dirt', under: 'Dust' },
    sky: 'Two bright stars: Alpha Centauri A and B, the Sun\'s close neighbours.',
    rare: [
      { ore: 'gold', why: 'Gold, deep down. Heavy rocky worlds like this one hold heavy metals.' },
      { ore: 'crystal', why: 'Purple crystal.' },
    ],
  },
  {
    id: 'trappist1e', name: 'TRAPPIST-1e', blurb: 'One of seven planets round a tiny red star. Frozen seas and dark sand.',
    real: {
      gravity: 0.82, mass: 0.69, radius: 0.92, density: 4.9, tempC: -23, air: 'thick', water: true,
      star: { name: 'TRAPPIST-1', teff: 2566, radius: 0.119 }, orbitAU: 0.0293,
      lightYears: 40.7, yearDays: 6.1,
      yearText: 'A year lasts 6 days. Its neighbour planets look as big as our Moon.',
      neighbours: [
        { name: 'TRAPPIST-1f', radius: 1.045, closestAU: 0.0092 },
        { name: 'TRAPPIST-1d', radius: 0.788, closestAU: 0.0070 },
        { name: 'TRAPPIST-1g', radius: 1.129, closestAU: 0.0175 },
      ],
    },
    surface: { top: 'Dark sand', under: 'Sand' },
    sky: 'A big dim red sun, and neighbour planets as big as our Moon.',
    rare: [{ ore: 'crystal', why: 'Purple crystal, under the frozen seas.' }],
  },
  {
    id: 'lhs1140b', name: 'LHS 1140 b', blurb: 'A big, heavy snowball world. Flat, white and hard to jump on.',
    real: {
      gravity: 1.87, mass: 5.6, radius: 1.73, density: 5.9, tempC: -47, air: 'thick', water: true,
      star: { name: 'LHS 1140', teff: 3096, radius: 0.216 }, orbitAU: 0.0946,
      lightYears: 48.8, yearDays: 24.7,
      yearText: 'A year lasts 25 days. Five and a half times heavier than Earth.',
    },
    surface: { top: 'Snow', under: 'Packed snow' },
    sky: 'A hazy peach sky and a large red-orange sun.',
    rare: [
      { ore: 'gold', why: 'Gold. Denser than Earth, so heavy metals are common deep down.' },
      { ore: 'crystal', why: 'Purple crystal.' },
    ],
  },
];

export const planetById = (id) => PLANETS.find(p => p.id === id) || PLANETS[0];

// ---------- plain words for real numbers ----------
export function gravityWords(g, guess) {
  let s;
  if (g >= 0.9 && g <= 1.12) s = 'about the same as Earth';
  else if (g > 1.12) s = g < 1.35 ? 'a bit more than Earth' : g < 1.7 ? 'about one and a half times Earth' : g < 2.1 ? 'almost twice Earth' : `about ${Math.round(g)} times Earth`;
  else if (g >= 0.78) s = 'a bit less than Earth';
  else {
    const F = [[1 / 8, 'an eighth'], [1 / 7, 'a seventh'], [1 / 6, 'a sixth'], [1 / 5, 'a fifth'], [1 / 4, 'a quarter'], [1 / 3, 'a third'], [1 / 2, 'half'], [2 / 3, 'two thirds']];
    let best = F[0];
    for (const f of F) if (Math.abs(Math.log(f[0] / g)) < Math.abs(Math.log(best[0] / g))) best = f;
    s = `about ${best[1]} of Earth`;
  }
  s = s[0].toUpperCase() + s.slice(1);
  return guess ? s + ' (best guess)' : s;
}

export function jumpWords(g) {
  if (g < 0.2) return 'You can jump really high.';
  if (g < 0.5) return 'You can jump higher than at home.';
  if (g < 1.2) return 'Jumping feels like home.';
  return 'You feel heavy. Jumps are short.';
}

export function tempWords(p) {
  const r = p.real;
  if (r.tempText) return r.tempText;
  const t = r.tempC;
  const c = t < -90 ? 'colder than anywhere on Earth' : t < -55 ? 'like the coldest Antarctic winter' : t < -35 ? 'like winter in Antarctica' : 'like a bitter winter night';
  return `About ${t} °C: ${c}`;
}

export function starWords(p) {
  const s = p.real.star;
  if (s.name === 'the Sun') return p.real.orbitAU > 2 ? 'Our Sun, but small and far away' : 'Our Sun';
  const smaller = Math.round(1 / s.radius);
  return `${s.name}, a small red star ${smaller} times smaller than our Sun`;
}

export function distanceWords(p) {
  const r = p.real;
  if (r.distanceText) return r.distanceText;
  return `${r.lightYears} light years from Earth`;
}

// how big the star looks in the sky, in degrees (real geometry)
export function starSizeDeg(p) {
  const rAU = p.real.star.radius * 0.00465047;
  return 2 * Math.atan(rAU / p.real.orbitAU) * 180 / Math.PI;
}

// star colour from its temperature (simple black-body fit), as [r,g,b] 0..1
export function starColor(teff) {
  const t = teff / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  return [c(r), c(g), c(b)];
}
