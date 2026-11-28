// Bundles the game into one self-contained HTML file: dist/play.html
import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/index.html', 'utf8').replace("</body>", () => `<script>\n${js}\n</script>\n</body>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/play.html', html);
console.log('dist/play.html', (html.length / 1024).toFixed(0) + ' KB');
// Artifact version: the host adds its own document skeleton
const art = html.replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/?head>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '').replace(/<\/html>\s*/i, '');
fs.writeFileSync('dist/stranded.html', art);
console.log('dist/stranded.html', (art.length / 1024).toFixed(0) + ' KB');
// Public test build: no unlock button, chat off, anonymous counts to GoatCounter (code from GC, default stranded-game)
const gc = (process.env.GC || 'stranded-game').replace(/[^a-z0-9-]/gi, '');
const test = html.replace('<head>', () => `<head>\n<script>window.STRANDED_TEST = { gc: '${gc}' };</script>`).replace(/<title>[^<]*<\/title>/i, '<title>Stranded (early test)</title>');
fs.writeFileSync('dist/test.html', test);
console.log('dist/test.html', gc);
