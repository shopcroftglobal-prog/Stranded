# Stranded

A browser block game: you crash on Mars, fix your ship, and fly between real stars and planets. Mine, build homes and castles, fight 50 waves and a dragon on every world, collect friendly finds and pets, race Star Karts and drive a Rover.

**Play:** https://shopcroftglobal-prog.github.io/stranded/

## Build
```
npm install
node build.mjs      # writes dist/play.html (one self-contained file)
cp dist/play.html docs/index.html   # the GitHub Pages copy
```
Made with Three.js. All art, textures, characters and music are made in code; no outside assets.

Tests are Playwright scripts in `test/` (run with `node test/smoke.js` after building).
