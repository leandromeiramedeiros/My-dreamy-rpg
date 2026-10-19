#!/usr/bin/env node
'use strict';
// Loads a game directory (default: repo root) in headless Chromium, enters each map via ?map=<id>, teleports to
// points of interest, and reports load time, column/object counts, ground raster size, frame times and console errors.
// Usage: node tools/maps/engine-check.js <gameDir> <shotDir> id[,id...]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const shots = path.resolve(process.argv[3] || path.join(__dirname, '..', 'shots', 'maps'));
const ids = (process.argv[4] || 'vale,pinewood,pinewood_boss').split(',');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  for (const id of ids) {
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    const t0 = Date.now();
    await page.goto(`${base}/index.html?map=${id}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const loadMs = Date.now() - t0;
    const info = await page.evaluate(() => { const m = G.map; return { W: m.W, H: m.H, columns: m.columns.length, objects: m.objects.length, colliders: m.colliders.length, ground: [m.ground.width, m.ground.height], lights: m.lights.length, falls: m.falls.length, triggers: m.triggers.length }; });
    const frames = async (label) => {
      const f = await page.evaluate(() => new Promise(res => { const d = []; let last = performance.now(); const n = () => { const t = performance.now(); d.push(t - last); last = t; if (d.length < 120) requestAnimationFrame(n); else res(d); }; requestAnimationFrame(n); }));
      f.shift(); f.sort((a, b) => a - b);
      return { label, avg: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), max: +f[f.length - 1].toFixed(1) };
    };
    const out = [await frames('start')];
    await page.screenshot({ path: path.join(shots, `engine_${id}_start.png`) });
    const pois = await page.evaluate(() => { const m = G.map; const v = (m.triggers || []).filter(t => t.when.type === 'enter_area').map(t => [t.id, t.when.x, t.when.y]); return v; });
    let k = 0;
    for (const [tid, x, y] of pois.slice(0, 4)) {
      await page.evaluate(([x, y]) => { G.player.x = x; G.player.y = y; G.player.z = tileH(G.map, x, y); G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, G.player.z) - 12; G.player.invulnT = 99; }, [x, y]);
      await page.waitForTimeout(2500);
      out.push(await frames('at ' + tid));
      await page.screenshot({ path: path.join(shots, `engine_${id}_${++k}_${tid}.png`) });
    }
    console.log(JSON.stringify({ id, loadMs, info, frames: out, errors: errs.slice(0, 5) }));
    await page.close();
  }
  await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
