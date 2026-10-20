#!/usr/bin/env node
'use strict';
// Frame-time sample (DESIGN §16.6 rule: measure p95, not the average).
// Loads ?map=<id> in headless Chromium, walks the hero in a slow square while attacking, and records every
// requestAnimationFrame delta for N seconds. Prints avg / p50 / p95 / p99 / max in ms, plus `work`: the CPU time
// spent inside main.js loop() per frame (update + render), which headless vsync pacing would otherwise hide.
//   node tools/perf.js [gameDir=repo root] [map=pinewood] [seconds=60] [extra query, e.g. phone=1]
// The 5th argument is appended to the page query (phone=1 = the phone caps: PHONE chunk / awake / corpse caps / quality tier).
// With perf=1 (or perf=flush: GPU work forced into the phase that queued it, slower overall) in it, the output also carries
// `phases`: ms per frame by render phase (render.js perfMark / main.js perfBegin), `draws` and `parts`. e.g.
//   node tools/perf.js . pinewood 20 perf=flush        node tools/perf.js . pinewood 30 phone=1&perf=1
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const map = process.argv[3] || 'pinewood';
const secs = +(process.argv[4] || 60);
const extra = process.argv[5] ? '&' + process.argv[5].replace(/^[?&]/, '') : '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const br = await chromium.launch({ headless: true });
  const page = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?map=${map}${extra}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  // CPU work per frame: time spent inside main.js loop() (update steps + render), independent of vsync pacing
  await page.evaluate(() => { const orig = window.loop; window.__work = []; window.loop = function (now) { const t0 = performance.now(); orig(now); window.__work.push(performance.now() - t0); }; });
  await page.evaluate(() => window.__perf && window.__perf(true, true));   // ?perf=1 / ?perf=flush: the phase split starts here
  await page.mouse.move(600, 260); await page.mouse.down();
  const walk = (async () => { const t0 = Date.now(); const ks = ['d', 's', 'a', 'w']; let i = 0; while (Date.now() - t0 < secs * 1000) { const k = ks[i++ % 4]; await page.keyboard.down(k); await new Promise(r => setTimeout(r, 1500)); await page.keyboard.up(k); } })();
  const d = await page.evaluate(s => new Promise(res => { const d = []; let last = performance.now(); const t0 = last; const n = () => { const t = performance.now(); d.push(t - last); last = t; if (t - t0 < s * 1000) requestAnimationFrame(n); else res(d); }; requestAnimationFrame(n); }), secs);
  await walk; await page.mouse.up();
  d.splice(0, 5); d.sort((a, b) => a - b);
  const w = (await page.evaluate(() => window.__work)).slice(5).sort((a, b) => a - b);
  const wq = k => +w[Math.min(w.length - 1, Math.floor(w.length * k))].toFixed(2);
  const q = k => +d[Math.min(d.length - 1, Math.floor(d.length * k))].toFixed(2);
  const pf = await page.evaluate(() => window.__perf && window.__perf(true));
  const out = { map, query: extra || undefined, seconds: secs, frames: d.length, avg: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +d[d.length - 1].toFixed(2),
    work: { avg: +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(2), p50: wq(0.5), p95: wq(0.95), p99: wq(0.99), max: +w[w.length - 1].toFixed(2) }, errors: errs.length };
  if (pf && pf.ph && Object.keys(pf.ph).length) { out.phases = pf.ph; out.draws = pf.draws; out.parts = pf.parts; out.tier = pf.tier; out.steps = pf.steps; out.slowFrames = pf.slowFrames; out.slow = pf.slow; }   // only with ?perf in the query
  console.log(JSON.stringify(out));
  await br.close(); srv.close();
})();
