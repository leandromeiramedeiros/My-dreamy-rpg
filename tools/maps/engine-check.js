#!/usr/bin/env node
'use strict';
// Loads a game directory (default: repo root) in headless Chromium, enters each map via ?map=<id>, TOURS EVERY SECTION (the engine's section
// centres, DESIGN 25.2), and reports load time, column/object counts, chunked-raster stats, frame times per section and console errors.
// A desktop pass and a phone pass (?phone=1: 256 px chunks, 12 resident, smaller viewport) run for every map; the phone p95 budget is 20 ms.
// Exit code 1 on a page error, a load failure, a section that cannot be reached, or an engine that has no sections for a big map.
// Frame-time budgets are reported (WARN) but never fail the run: headless Chromium rasterises in software, so the numbers are an upper bound.
// Usage: node tools/maps/engine-check.js [gameDir] [shotDir] [id[,id...]]      (default maps: vale,pinewood)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const shots = path.resolve(process.argv[3] || path.join(__dirname, '..', 'shots', 'maps'));
const ids = (process.argv[4] || 'vale,pinewood').split(',');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
let bad = 0;
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  for (const id of ids) for (const phone of [false, true]) {
    const page = await br.newPage({ viewport: phone ? { width: 640, height: 360 } : { width: 960, height: 540 } });
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    const t0 = Date.now();
    await page.goto(`${base}/index.html?map=${id}${phone ? '&phone=1' : ''}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const loadMs = Date.now() - t0;
    const info = await page.evaluate(() => { const m = G.map; return { W: m.W, H: m.H, columns: m.columns.length, objects: m.objects.length, colliders: m.colliders.length, ground: m.ground ? [m.ground.width, m.ground.height] : 'chunked', chunkSize: typeof CHUNK !== 'undefined' ? CHUNK.size : null, chunkMax: typeof CHUNK !== 'undefined' ? CHUNK.max : null, lights: m.lights.length, triggers: m.triggers.length, sections: (m.sections || []).filter(s => s.id !== 'main' || m.sections.length === 1).map(s => ({ id: s.id, kind: s.kind, tiles: s.tiles, cx: +(+s.cx).toFixed(1), cy: +(+s.cy).toFixed(1) })) }; });
    const frames = async label => {
      const f = await page.evaluate(() => new Promise(res => { const d = []; let last = performance.now(); const n = () => { const t = performance.now(); d.push(t - last); last = t; if (d.length < 120) requestAnimationFrame(n); else res(d); }; requestAnimationFrame(n); }));
      f.shift(); f.sort((a, b) => a - b);
      return { label, avg: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), max: +f[f.length - 1].toFixed(1) };
    };
    const out = [await frames('start')];
    if (!phone) await page.screenshot({ path: path.join(shots, `engine_${id}_start.png`) });
    let toured = 0;
    for (const s of info.sections) {
      if (!s.tiles) { console.log(`ERROR ${id}: section ${s.id} has no walkable tiles`); bad++; continue; }
      await page.evaluate(([x, y]) => { G.player.x = x; G.player.y = y; G.player.z = tileH(G.map, x, y); G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, G.player.z) - 12; G.player.invulnT = 99; G.enemies.length = 0; }, [s.cx, s.cy]);
      await page.waitForTimeout(2500);
      const inSec = await page.evaluate(() => (sectionAt(G.map, G.player.x, G.player.y) || {}).id);
      if (inSec !== s.id && !(info.sections.length === 1)) { console.log(`ERROR ${id}: the section centre of ${s.id} lies in ${inSec}`); bad++; }
      out.push(await frames('section ' + s.id)); toured++;
      if (!phone) await page.screenshot({ path: path.join(shots, `engine_${id}_sec_${s.id}.png`) });
    }
    const resident = await page.evaluate(() => (typeof CHUNK !== 'undefined' ? { resident: CHUNK.cache.size, built: CHUNK.built, evicted: CHUNK.evicted } : null));
    const p95 = Math.max(...out.map(o => o.p95));
    const budget = phone ? 20 : 33;
    console.log(JSON.stringify({ id, pass: phone ? 'phone' : 'desktop', loadMs, info: Object.assign({}, info, { sections: info.sections.map(s => s.id).join('/') }), toured, chunks: resident, frames: out, worstP95: p95, errors: errs.slice(0, 5) }));
    if (p95 > budget) console.log(`WARN ${id} ${phone ? 'phone' : 'desktop'}: worst p95 ${p95} ms over the ${budget} ms budget (headless software rendering)`);
    if (errs.length) { console.log(`ERROR ${id}: ${errs.length} page error(s)`); bad += errs.length; }
    if (!info.sections.length && (info.W >= 80)) { console.log(`ERROR ${id}: a big map without sections`); bad++; }
    await page.close();
  }
  await br.close(); srv.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nengine-check: all maps and sections load, no page errors');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
