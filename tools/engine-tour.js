#!/usr/bin/env node
'use strict';
// Engine tour (DESIGN §25.2, engine lane; tools/maps/engine-check.js is the level designer's world-map section check):
// loads the game in headless Chromium and TOURS a map: load time, the start chunk, then every
// section of the map with the HUD minimap and again with the full-map screen open, plus a run across the map (chunk
// streaming), on desktop settings and on phone settings (?phone=1: 256 px chunks, 12 resident, 16 awake, one fog layer).
// Per stop it waits until no visible chunk is missing (reports that settle time), then samples frames:
//   work = CPU ms per displayed frame (update steps + render, wrapped), the number §25.2 budgets (p95 <= 20 ms);
//   raf  = the rAF interval (headless is vsync-locked, so it only shows stalls).
// Memory: JS heap (performance.memory) + the bytes of resident ground chunks, column canvases, previews and minimaps.
//
// Usage: node tools/engine-tour.js [--maps=synth112,pinewood] [--phone-only|--desktop-only] [--throttle=4] [--shots]
//   synth112 = a synthetic 112x112 zone generated HERE (synthMap: 4 sections, 3-tile void gutters, ~60 % elevated tiles,
//   ~1300 objects incl. ~150 lights, shrines, warp doors, an arena, 9 packs); it is injected into G.world at run time and
//   never written to js/world.js. Other ids are js/world.js maps. --throttle=N adds CPU throttling to the phone pass.
// Exit 1 on page errors or when any work p95 > 20 ms (desktop and unthrottled phone passes).
// module.exports.synthMap is reused by tools/play.js.
const http = require('http'), fs = require('fs'), path = require('path');

// ---------------------------------------------------------------- the synthetic zone (pure data, deterministic)
function synthMap(W = 112, H = 112, seed = 7) {
  const hash = (x, y, s) => { let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 982451653 + seed * 2654435761; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fb = (x, y, s) => (vn(x, y, s) * 0.6 + vn(x * 2, y * 2, s + 1) * 0.3 + vn(x * 4, y * 4, s + 2) * 0.1);
  // sections (outer south, underground NW, vault NE, arena E) with 3-tile gutters between them
  const sections = [
    { id: 'outer', name: 'Synthetic Wood', kind: 'outer', x: 0, y: 44, w: 112, h: 68 },
    { id: 'under', name: 'Synthetic Hollow', kind: 'under', x: 0, y: 0, w: 54, h: 41, ambient: '#5a6a92', dark: 0.6 },
    { id: 'vault', name: 'Synthetic Vault', kind: 'vault', x: 57, y: 0, w: 55, h: 19, ambient: '#6a5a82', dark: 0.4 },
    { id: 'arena', name: 'Synthetic Arena', kind: 'arena', x: 57, y: 22, w: 55, h: 19 },
  ];
  const gutter = (x, y) => (y >= 41 && y < 44) ? 'v' : (x >= 54 && x < 57 && y < 41) ? 'k' : (x >= 57 && y >= 19 && y < 22) ? 'v' : null;
  const tiles = [], heights = [];
  for (let y = 0; y < H; y++) {
    let tr = '', hr = '';
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y), g = gutter(x, y);
      const coast = edge < 1 + fb(x * 0.2, y * 0.2, 3) * 3;
      if (g || coast) { tr += g || '.'; hr += '0'; continue; }
      const under = y < 41 && x < 54, creek = Math.abs(y - 78 - Math.sin(x * 0.12) * 6) < 1.4 && y >= 44;
      const n = fb(x * 0.09, y * 0.09, 5), road = Math.abs(x - 56 - Math.sin(y * 0.08) * 10) < 1.3 && y > 44;
      let t = creek ? 'w' : road ? 'p' : under ? (n > 0.55 ? 'x' : 'd') : n > 0.62 ? 'f' : n < 0.33 ? 'd' : 'g';
      if (x > 60 && y < 41 && y >= 22 && (x - 84) ** 2 + (y - 31) ** 2 < 49) t = 'x';   // arena floor
      if (t === 'x' && x > 60 && y >= 22 && y < 41 && ((x - 84) ** 2 + (y - 31) ** 2 < 26 && (x - 84) ** 2 + (y - 31) ** 2 > 20) && hash(x, y, 9) < 0.3) t = 'c';   // pillars
      if (creek && Math.abs(x - 56) < 2) t = 'b';
      let h = creek || road || t === 'b' ? 0 : n > 0.47 ? 4 : n > 0.4 ? 2 : 0;   // ~60 % of the land is raised (pinewood: 61 %)
      if (t === 'c') h = 3;
      if (x > 60 && y >= 22 && y < 41 && (x - 84) ** 2 + (y - 31) ** 2 < 49 && t !== 'c') h = 0;
      tr += t; hr += h.toString(36);
    }
    tiles.push(tr); heights.push(hr);
  }
  const at = (x, y) => tiles[Math.floor(y)] && tiles[Math.floor(y)][Math.floor(x)];
  const free = (x, y) => { const t = at(x, y); return t && !'.vkwc'.includes(t); };
  const objects = [];
  const KINDS = ['pine', 'pine', 'pine_young', 'pine_giant', 'rock', 'rock_dark', 'grass', 'grass', 'moss', 'mushroom_red', 'stump', 'tree_dead', 'bush', 'mushroom', 'log'];
  let k = 0;
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    if (!free(x, y) || hash(x, y, 11) > 0.115) continue;
    const t = at(x, y) === 'p' || at(x, y) === 'b' ? null : KINDS[(hash(x, y, 12) * KINDS.length) | 0];
    if (!t) continue;
    objects.push({ t, x: x + 0.5, y: y + 0.5, v: (k++) % 3 });
  }
  for (let i = 0; i < 70; i++) { const x = 3 + hash(i, 1, 21) * (W - 6), y = 3 + hash(i, 2, 21) * (H - 6); if (free(x, y)) objects.push({ t: i % 3 ? 'lantern' : 'crystal', x, y }); }
  // shrines: 3 outer + 1 under; anchors; warp doors (outer <-> under keyed, outer -> vault sealed), arena gate
  const sp = (x, y) => { for (let r = 0; r < 6; r += 0.5) for (let a = 0; a < 6.28; a += 0.5) { const qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; if (free(qx, qy) && free(qx + 1, qy) && free(qx, qy + 1)) return [Math.floor(qx) + 0.5, Math.floor(qy) + 0.5]; } return [x, y]; };
  const P = {}; for (const [id, x, y] of [['s1', 14, 100], ['s2', 56, 70], ['s3', 96, 56], ['su', 26, 20], ['door_under', 30, 50], ['door_up', 20, 12], ['door_vault', 96, 48], ['door_back', 80, 9], ['gate', 70, 31], ['start', 10, 104], ['arena', 84, 31]]) P[id] = sp(x, y);
  objects.push({ t: 'shrine', id: 'synth_s1', name: 'South road', x: P.s1[0], y: P.s1[1] }, { t: 'shrine', id: 'synth_s2', name: 'Creek ford', x: P.s2[0], y: P.s2[1] },
    { t: 'shrine', id: 'synth_s3', name: 'East gate', x: P.s3[0], y: P.s3[1] }, { t: 'shrine', id: 'synth_su', name: 'Hollow midpoint', x: P.su[0], y: P.su[1] });
  objects.push({ t: 'warpdoor', id: 'door_under', x: P.door_under[0], y: P.door_under[1], to: 'door_up', key: 'key_synth', label: 'Descend' },
    { t: 'warpdoor', id: 'door_up', x: P.door_up[0], y: P.door_up[1], to: 'door_under', label: 'Climb out' },
    { t: 'warpdoor', id: 'door_vault', x: P.door_vault[0], y: P.door_vault[1], to: 'door_back', open: false, label: 'Enter the vault' },
    { t: 'warpdoor', id: 'door_back', x: P.door_back[0], y: P.door_back[1], to: { x: P.door_vault[0], y: P.door_vault[1] + 1.2 }, label: 'Back' },
    { t: 'gate', id: 'arena_gate', x: P.gate[0], y: P.gate[1], ang: 0, len: 2.4, open: true });
  const packs = [[30, 96], [60, 92], [90, 100], [24, 64], [80, 70], [104, 60], [16, 28], [40, 12], [92, 10]];
  const triggers = [{ id: 'banner', when: { type: 'map_enter' }, actions: [{ type: 'objective', text: 'Tour the synthetic zone' }] }];
  packs.forEach(([x, y], i) => { const [px, py] = sp(x, y); triggers.push({ id: 'pack' + i, when: { type: 'enter_area', x: px, y: py, r: 7 }, actions: [{ type: 'spawn', enemy: ['slime', 'hound', 'wisp'][i % 3], count: 4, x: px, y: py, radius: 2 }] }, { id: 'pack' + i + '_done', when: { type: 'all_enemies_dead' }, requires: ['pack' + i], actions: [{ type: 'loot', rarity: 'uncommon', count: 1, x: px, y: py }] }); });
  triggers.push({ id: 'arena_in', when: { type: 'enter_area', x: P.arena[0], y: P.arena[1], r: 4 }, actions: [{ type: 'arena', id: 'synth_arena', gate: 'arena_gate', x: P.arena[0], y: P.arena[1], r: 7 }, { type: 'spawn', enemy: 'hound', count: 3, x: P.arena[0], y: P.arena[1], radius: 2 }] },
    { id: 'arena_won', when: { type: 'all_enemies_dead' }, requires: ['arena_in'], actions: [{ type: 'openGate', id: 'arena_gate' }] });
  for (let i = 0; i < 20; i++) triggers.push({ id: 'note' + i, when: { type: 'enter_area', x: 5 + hash(i, 3, 31) * 100, y: 50 + hash(i, 4, 31) * 55, r: 3 }, actions: [{ type: 'message', text: 'A synthetic note ' + i }] });
  return { name: 'Synthetic Zone', sub: 'engine check', theme: 'forest', W, H, tiles, heights, start: { x: P.start[0], y: P.start[1] }, portals: [], objects,
    objective: 'Tour the synthetic zone', level: [3, 8], sections, anchors: [{ id: 'arena_mid', x: P.arena[0], y: P.arena[1] }, { id: 'vault_mid', x: 84, y: 9 }], triggers };
}
module.exports = { synthMap };
if (require.main !== module) return;

// ---------------------------------------------------------------- the tour
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2), flag = n => { const a = args.find(x => x === '--' + n || x.startsWith('--' + n + '=')); return a ? (a.includes('=') ? a.split('=').slice(1).join('=') : true) : null; };
const ids = String(flag('maps') || 'synth112').split(',');
const shots = path.join(__dirname, 'shots', 'maps'); if (flag('shots')) fs.mkdirSync(shots, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const passes = flag('phone-only') ? ['phone'] : flag('desktop-only') ? ['desktop'] : ['desktop', 'phone'];
if (flag('throttle') && !flag('desktop-only')) passes.push('phone-throttled');

// in-page helpers (installed once per page)
const PAGE_KIT = () => {
  const K = window.__ek = { work: [], raf: [], cur: 0, on: false };
  for (const name of ['update', 'render']) {
    const f = window[name];
    window[name] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { K.cur += performance.now() - t; } };
  }
  let last = performance.now();
  const tick = () => { const t = performance.now(); if (K.on) { K.work.push(K.cur); K.raf.push(t - last); } K.cur = 0; last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  K.sample = n => new Promise(res => { K.work = []; K.raf = []; K.on = true; const w = () => { if (K.work.length >= n) { K.on = false; res({ work: K.work.slice(), raf: K.raf.slice() }); } else setTimeout(w, 50); }; w(); });
  K.settle = () => new Promise(res => { const t0 = performance.now(); const w = () => { if (GROUND_STATS.visMissing === 0 && !G.warp && performance.now() - t0 > 120) res(performance.now() - t0); else if (performance.now() - t0 > 15000) res(-1); else requestAnimationFrame(w); }; requestAnimationFrame(w); });
  K.tp = (x, y) => { const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; p.invulnT = 999; };
  K.mem = () => {
    let chunks = 0, cols = 0, colN = 0, prev = 0, mini = 0;
    for (const ch of CHUNK.cache.values()) chunks += ch.c.width * ch.c.height * 4;
    for (const id in G.maps) { const m = G.maps[id]; for (const c of m.columns) if (c.img) { cols += c.img.width * c.img.height * 4; colN++; } if (m.preview) prev += m.preview.width * m.preview.height * 4; if (m.mini) mini += m.mini.N * m.mini.N * 4 * (m.mini.full ? 3 : 2); }
    const heap = performance.memory ? performance.memory.usedJSHeapSize : 0;
    return { heapMB: +(heap / 1048576).toFixed(1), chunksMB: +(chunks / 1048576).toFixed(1), columnsMB: +(cols / 1048576).toFixed(1), columnImgs: colN, previewMB: +(prev / 1048576).toFixed(1), minimapMB: +(mini / 1048576).toFixed(2), resident: CHUNK.cache.size, jobs: CHUNK.jobs.size, built: CHUNK.built, evicted: CHUNK.evicted };
  };
};
const stat = (a) => { const s = a.slice().sort((x, y) => x - y); const q = f => +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(2); return { avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: q(0.95), max: +s[s.length - 1].toFixed(2) }; };

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch({ args: ['--enable-precise-memory-info'] });
  const report = []; let fail = 0;
  for (const pass of passes) for (const id of ids) {
    const phone = pass !== 'desktop';
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    if (pass === 'phone-throttled') { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +flag('throttle') || 4 }); }
    const t0 = Date.now();
    await page.goto(`${base}/index.html?scene=play${phone ? '&phone=1' : ''}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const bootMs = Date.now() - t0;
    await page.evaluate(PAGE_KIT);
    const load = await page.evaluate(([id, rec]) => {
      if (rec) { G.world.maps[id] = rec; THEME_OF[id] = rec.theme; }
      delete G.maps[id];
      const t0 = performance.now(); const m = getMap(id); const build = performance.now() - t0;
      const t1 = performance.now(); enterMap(id); G.state = 'play'; G.banner = null; const enter = performance.now() - t1;
      return { buildMs: +build.toFixed(0), enterMs: +enter.toFixed(0), W: m.W, H: m.H, columns: m.columns.length, objects: m.objects.length, lights: m.lights.length, triggers: m.triggers.length,
        chunkPx: CHUNK.size, chunkCap: CHUNK.max, sleepCap: SLEEP.cap, chunksTotal: chunkGrid(m).nx * chunkGrid(m).ny, chunksNonEmpty: chunkGrid(m).empty.filter(e => !e).length, sections: m.sections.filter(s => s.tiles).map(s => s.id) };
    }, [id, id === 'synth112' ? synthMap() : null]);
    const stops = await page.evaluate(() => G.map.sections.filter(s => s.tiles > 0).map(s => ({ id: s.id, x: s.cx, y: s.cy })));
    const rows = [];
    const measure = async (label, mapOpen) => {
      const settle = await page.evaluate(() => window.__ek.settle());
      if (mapOpen) await page.evaluate(() => openFullMap());
      const s = await page.evaluate(n => window.__ek.sample(n), 150);
      const r = { stop: label, view: mapOpen ? 'fullmap' : 'hud', settleMs: Math.round(settle), work: stat(s.work), raf: stat(s.raf), lights: await page.evaluate(() => LIGHT_STATS.drawn + '/' + LIGHT_STATS.inView), awake: await page.evaluate(() => SLEEP.awake + '/' + G.enemies.length) };
      if (mapOpen) await page.evaluate(() => closeFullMap());
      if (flag('shots')) await page.screenshot({ path: path.join(shots, `ek_${id}_${pass}_${label}_${r.view}.png`) });
      rows.push(r);
    };
    await measure('start', false);
    for (const st of stops) {
      await page.evaluate(([x, y]) => window.__ek.tp(x, y), [st.x, st.y]);
      await measure(st.id, false);
      await measure(st.id, true);
    }
    // a run across the map: the hero moves 6 tiles/s for 4 s (chunks stream in, enemies wake and sleep)
    await page.evaluate(([x, y]) => window.__ek.tp(x, y), [stops[0] ? stops[0].x : 10, stops[0] ? stops[0].y : 10]);
    await page.evaluate(() => window.__ek.settle());
    const run = await page.evaluate(() => new Promise(res => { const p = G.player, K = window.__ek; K.work = []; K.raf = []; K.on = true; let last = performance.now(), dir = 1; const t0 = last;
      const step = () => { const t = performance.now(), dt = (t - last) / 1000; last = t; const nx = p.x + dir * 6 * dt; if (nx < 4 || nx > G.map.W - 4) dir = -dir; p.x = clamp(nx, 4, G.map.W - 4); p.y = clamp(p.y - 3 * dt, 4, G.map.H - 4);
        if (t - t0 < 4000) requestAnimationFrame(step); else { K.on = false; res({ work: K.work.slice(), raf: K.raf.slice(), syncBuilds: GROUND_STATS.syncBuilds }); } }; requestAnimationFrame(step); }));
    rows.push({ stop: 'run', view: 'hud', settleMs: 0, work: stat(run.work), raf: stat(run.raf), syncBuilds: run.syncBuilds });
    const mem = await page.evaluate(() => window.__ek.mem());
    const worst = Math.max(...rows.filter(r => r.stop !== 'run').map(r => r.work.p95));
    const allP95 = stat([].concat(...rows.map(r => [r.work.p95])));
    const out = { map: id, pass, bootMs, load, mem, worstStopP95: worst, rows, errors: errs.slice(0, 5) };
    report.push(out);
    console.log(JSON.stringify(out));
    if (errs.length || (pass !== 'phone-throttled' && worst > 20)) fail++;
    void allP95;
    await page.close();
  }
  // summary table
  console.log('\nmap        pass             build+enter ms  start chunk  stops p95 work (worst)  run p95  resident  heap MB  chunks+cols MB');
  for (const r of report) console.log(`${r.map.padEnd(10)} ${r.pass.padEnd(16)} ${String(r.load.buildMs + r.load.enterMs).padStart(8)}       ${String(r.rows[0].settleMs).padStart(6)}       ${String(r.worstStopP95).padStart(8)}             ${String(r.rows[r.rows.length - 1].work.p95).padStart(6)}   ${String(r.mem.resident + '/' + r.load.chunkCap).padStart(6)}   ${String(r.mem.heapMB).padStart(6)}   ${(r.mem.chunksMB + r.mem.columnsMB).toFixed(1)}`);
  await br.close(); srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
