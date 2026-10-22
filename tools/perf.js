#!/usr/bin/env node
'use strict';
// Frame-time sample (docs/design/pillars-and-rules.md rule: measure p95, not the average).
// Loads ?map=<id> in headless Chromium, walks the hero in a slow square while attacking, and records every
// requestAnimationFrame delta for N seconds. Prints avg / p50 / p95 / p99 / max in ms, plus `work`: the CPU time
// spent inside main.js loop() per frame (update + render), which headless vsync pacing would otherwise hide.
//   node tools/perf.js [gameDir=repo root] [map=pinewood] [seconds=60] [extra query, e.g. phone=1]
// The 5th argument is appended to the page query (phone=1 = the phone caps: PHONE chunk / awake / corpse caps / quality tier).
// With perf=1 (or perf=flush: GPU work forced into the phase that queued it, slower overall) in it, the output also carries
// `phases`: ms per frame by render phase (render.js perfMark / main.js perfBegin), `draws` and `parts`. e.g.
//   node tools/perf.js . pinewood 20 perf=flush        node tools/perf.js . pinewood 30 phone=1&perf=1
// Flags (M4a lighting lane; anywhere on the line, the positional arguments keep their meaning):
//   --cpu=N            CDP CPU throttle (N = 4: the phone proxy of the lighting budgets)
//   --scene=pine-fight the lighting gate scene (docs/design/lighting-status-fx.md "Performance budgets"): 6 status bodies
//                      around the hero (Burning x2 with live burn DoT, Frozen, Shocked, Wet + Poisoned, Smitten), 4 standing
//                      spell lights (fire projectiles that never move or hit), a burning grass ring (STATUS.ring r 3.5)
//   --budget           with ?perf=1: also print `budget` (rim / lights / status / shadows ms per frame vs the phone budgets)
//                      and `whiteOut` (render.js whiteOut() at the end); exit 1 when p95 > 20.0 ms or a budget is over
//   e.g. node tools/perf.js . pinewood 20 "quality=phone&perf=1" --scene=pine-fight --cpu=4 --budget
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const FLAGS = {}; const ARGV = process.argv.filter(a => { const m = /^--([\w-]+)(?:=(.*))?$/.exec(a); if (m) FLAGS[m[1]] = m[2] == null ? true : m[2]; return !m; });
const root = path.resolve(ARGV[2] || path.join(__dirname, '..'));
const map = ARGV[3] || 'pinewood';
const secs = +(ARGV[4] || 60);
const extra = ARGV[5] ? '&' + ARGV[5].replace(/^[?&]/, '') : '';
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
  if (FLAGS.scene === 'pine-fight') await page.evaluate(() => {   // the lighting gate scene (see the header)
    setSetting('groundIndicators', 'off'); G.banner = null; G.msg = null;
    const p = G.player; p.invulnT = 1e9; p.hp = p.maxHp;
    const kinds = [['burning', 1], ['burning', 1], ['frozen'], ['shocked'], ['wet', 'poisoned'], ['smitten']];
    kinds.forEach((ids, i) => {
      const a = i / kinds.length * Math.PI * 2, e = spawnEnemy('slime', p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3, 0);
      e.hp = e.maxHp = 1e9; e.spawnT = 0; e.asleep = false;
      for (const id of ids) if (typeof id === 'string' && window.STATUS) STATUS.apply(e, id, 1e6);
      if (ids[0] === 'burning') { e.burnT = 1e6; e.burnTick = 0.5; }   // a live burn DoT (damage numbers) on two of them
      if (ids[0] === 'frozen') { e.frozen = 1; e.stunT = 1e6; }
    });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; spawnProj({ x: p.x + Math.cos(a) * 2, y: p.y + Math.sin(a) * 2, z: 1.4, ang: 0, speed: 0, r: 0.01, dmg: 0, life: 1e6, kind: 'fire', col: '#ff9a4a', pierce: 1e9 }); }
    if (window.STATUS) STATUS.ring(p.x, p.y, 3.5, 'burning', 1e6);   // guarded: the same scene runs on a pre-M4a build for an A/B
    window.__pf = { bodies: G.enemies.length, projs: G.projs.length, tiles: window.STATUS ? STATUS.tiles.size : 0 };
  });
  if (FLAGS.cpu) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +FLAGS.cpu }); }  // CPU work per frame: time spent inside main.js loop() (update steps + render), independent of vsync pacing
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
  if (FLAGS.scene) { out.scene = FLAGS.scene; out.sceneInfo = await page.evaluate(() => Object.assign({}, window.__pf, { bodiesNow: G.enemies.length, projsNow: G.projs.length, status: typeof STATUS !== 'undefined' ? STATUS.stats() : null })); }
  if (FLAGS.cpu) out.cpu = +FLAGS.cpu;
  let over = [];
  if (FLAGS.budget && pf && pf.ph) {   // phone budgets (ms per frame): rim 0.4, lights 2.5, status 0.5, shadows 0.3
    const ph = pf.ph, g = k => ph[k] || 0;
    out.budget = { rim: +g('sub.rim').toFixed(3), lights: +(g('lights.lm') + g('lights.mul') + g('lights')).toFixed(3), status: +(g('sub.status') + g('sub.statusHud') + g('status.tiles')).toFixed(3), shadows: +g('sub.shadow').toFixed(3) };
    const B = { rim: 0.4, lights: 2.5, status: 0.5, shadows: 0.3 };
    over = Object.keys(B).filter(k => out.budget[k] > B[k]).map(k => `${k} ${out.budget[k]} > ${B[k]}`);
    out.whiteOut = await page.evaluate(() => typeof whiteOut === 'function' ? whiteOut() : null);
    if (out.p95 > 20.0) over.push(`p95 ${out.p95} > 20.0`);
    out.gate = over.length ? 'FAIL: ' + over.join(', ') : 'PASS';
  }
  if (pf && pf.ph && Object.keys(pf.ph).length) { out.phases = pf.ph; out.draws = pf.draws; out.parts = pf.parts; out.tier = pf.tier; out.steps = pf.steps; out.slowFrames = pf.slowFrames; out.slow = pf.slow; out.drawsBy = pf.drawsBy; }   // only with ?perf in the query
  console.log(JSON.stringify(out));
  await br.close(); srv.close();
  if (FLAGS.budget && over.length) process.exit(1);
})();
