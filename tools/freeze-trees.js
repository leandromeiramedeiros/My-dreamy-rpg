#!/usr/bin/env node
'use strict';
// tools/freeze-trees.js -- freeze the §29 G2 tree sheets into js/sprites.js (world-art minutes §2.1 "freeze path").
// Loads the game headless with ?trees=live (art.js builds every species with canopyTree / pineTree2 instead of reading the frozen
// sheets), takes each sheet's two parts and writes them as one 2-frame PNG strip [trunk | canopy] via canvas.toDataURL:
//   tree_<species>_NN   (ART.trees.<species>: round poplar blossom teal oak birch, 12 each = 6 variants x 2 sizes)
//   pine_<kind>_NN      (ART.pines.<kind>: giant 3, tall 6, young 6)
//   bush2_NN            (ART.bushV2 -> ART.bush: 4 cluster bushes, no trunk)
// art.js frozenTrees() rebuilds the composite and the 3 sway frames from the two parts at load. The old one-ellipse lollipop
// sheets (tree_round_0 .. tree_teal_3) are removed; tree_dead_* and every other sprite are kept as they are.
// Usage: node tools/freeze-trees.js [--check]   (--check: report sizes and whether js/sprites.js is up to date, write nothing)
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), FILE = path.join(ROOT, 'js', 'sprites.js'), CHECK = process.argv.includes('--check');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const br = await chromium.launch(), page = await br.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?map=vale&trees=live`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const sheets = await page.evaluate(() => {
    if (!TREES_LIVE) throw new Error('?trees=live not honoured');
    const out = {}, pad = i => String(i).padStart(2, '0');
    const strip = c => { const { c: k, x } = makeCanvas(c.width * 2, c.height); x.drawImage(c.trunk, 0, 0); x.drawImage(c.canopy, c.width, 0); return k.toDataURL('image/png'); };
    for (const s of Object.keys(TREE_SPECIES)) ART.trees[s].forEach((c, i) => { out[`tree_${s}_${pad(i)}`] = { frames: 2, src: strip(c) }; });
    for (const s of Object.keys(PINE_SPECIES)) ART.pines[s].forEach((c, i) => { out[`pine_${s}_${pad(i)}`] = { frames: 2, src: strip(c) }; });
    ART.bushV2.forEach((c, i) => { out[`bush2_${pad(i)}`] = { frames: 2, src: strip(c) }; });
    return out;
  });
  await br.close(); srv.close();
  if (errs.length) { console.error('page errors:', errs.slice(0, 3)); process.exit(1); }
  const src = fs.readFileSync(FILE, 'utf8'), ctx = {};
  vm.runInNewContext(src.replace(/^'use strict';/, '') + '\n;this.SPRITE_ART = SPRITE_ART;', ctx);
  const old = ctx.SPRITE_ART, next = {};
  const dropped = [];
  for (const [k, v] of Object.entries(old)) {
    if (/^tree_(round|poplar|blossom|teal)_\d$/.test(k) || /^(tree|pine)_[a-z]+_\d\d$/.test(k) || /^bush2_\d\d$/.test(k)) { dropped.push(k); continue; }
    next[k] = v;
  }
  Object.assign(next, sheets);
  const body = Object.entries(next).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n');
  const header = src.split('\n').slice(0, 2).join('\n');
  const outSrc = header + '\nconst SPRITE_ART = {' + body + '};\n';
  const bytes = Object.values(sheets).reduce((a, v) => a + v.src.length, 0);
  console.log(`tree sheets: ${Object.keys(sheets).length} (${(bytes / 1024).toFixed(1)} KB of data URIs); dropped ${dropped.length} old entries; sprites.js ${(outSrc.length / 1024).toFixed(1)} KB (was ${(src.length / 1024).toFixed(1)} KB)`);
  if (CHECK) { console.log(outSrc === src ? 'js/sprites.js is up to date' : 'js/sprites.js would change'); process.exit(outSrc === src ? 0 : 1); }
  fs.writeFileSync(FILE, outSrc);
  console.log('wrote js/sprites.js');
})().catch(e => { console.error(e); process.exit(1); });
