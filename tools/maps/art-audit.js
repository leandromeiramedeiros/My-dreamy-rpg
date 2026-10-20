#!/usr/bin/env node
'use strict';
// tools/maps/art-audit.js -- the DESIGN §29.4 acceptance numbers for the world-art pass, on 6 FIXED camera shots per map.
// For each shot it renders the real game (headless Chromium), reads the 480x270 scene canvas (SCN: the world frame, no HUD) and computes
//   specks    isolated pixels whose luminance differs by > 60 from ALL 4 neighbours (per 480x270 frame; target < 50)
//   clusters  luminance clusters (value bands): peaks of the smoothed 32-bin luma histogram holding >= 1 % of the frame per bin,
//             split by a valley >= 15 % below the smaller peak (target >= 5); plus the 5/50/95 % luma percentiles
//   flatBackEdge  "top surface touching the sky without thickness": frame columns where the island's back (north / west) edge meets the
//             sky on a tile with no wall facing the camera within 4 tiles in front of it (no raised rim, no drop); also how many of those
//             edge columns show a lit lip. Target 0.
// and writes  tools/shots/world-art/<tag>/<map>_<n>_<name>.png        (the frame, 2x nearest)
//             tools/shots/world-art/<tag>/<map>_<n>_<name>_sil.png    (the 120x68 silhouette downscale, 4x nearest, luma posterised to 5)
//             tools/shots/world-art/<tag>/audit.json                  (every number + the chunk raster cost)
// Chunk raster cost: every non-empty chunk of the map's OUTER sections is rebuilt synchronously (buildChunkStep(.., Infinity), columns
// included), timed per chunk: worst + mean, desktop (512 px) and phone (?phone=1, 256 px) pages.
// Usage: node tools/maps/art-audit.js <tag=before|after|...> [maps=pinewood,vale] [--no-chunks] [--sea]
//   --sea  hooks drawCloudSea (maps.js) into the frame exactly where the render.js sky-block line goes, to preview it before it lands
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const TAG = pos[0] || 'after', MAPS = (pos[1] || 'pinewood,vale').split(','), CHUNKS = !flags.includes('--no-chunks');
const SEA_HOOK = flags.includes('--sea');   // simulate the render.js sky-block line: drawCloudSea() right before the old 'cloud sea far below' clouds
const OUT = path.join(__dirname, '..', 'shots', 'world-art', TAG);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
fs.mkdirSync(OUT, { recursive: true });
// the 6 fixed shots per map (tile coordinates; the camera centres on the hero standing there). Pinewood = its outer forest section.
const SHOTS = {
  pinewood: [
    ['start_sw_coast', 7.5, 104.8],      // the arrival meadow on the south-west coast
    ['west_coast', 12, 42],              // the long west coast at level 4
    ['r2_terraces', 26, 58],             // the r2 wall: cliffs between levels
    ['ford_creek', 55, 73.7],            // creek, ford, level 2 / 4 steps
    ['north_coast', 47, 34],             // the north coast of the forest band
    ['east_plateau', 96, 58],            // levels 0 / 4 / 6 by the east coast
  ],
  vale: [
    ['arrival', 28.8, 57.2],
    ['elder_stone', 39, 47.5],
    ['rift_terrace', 54, 26.6],          // the raised terrace: cliffs
    ['nw_coast', 8, 20],                 // the north-west coast
    ['north_coast', 25, 16],
    ['moon_pond', 66, 68],
  ],
};
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- in-page metrics (run inside page.evaluate) ----
function pageMetrics() {
  const W = SCN.c.width, H = SCN.c.height, d = SCN.x.getImageData(0, 0, W, H).data, Y = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) Y[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  let specks = 0; const at = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, v = Y[i];
    if (Math.abs(v - Y[i - 1]) > 60 && Math.abs(v - Y[i + 1]) > 60 && Math.abs(v - Y[i - W]) > 60 && Math.abs(v - Y[i + W]) > 60) { specks++; if (at.length < 400) at.push([x, y]); }
  }
  // luminance clusters (value bands): peaks of the 32-bin luma histogram (8 levels a bin, smoothed 1-2-1) holding >= 1 % of the frame
  // in their bin, merged with the previous peak unless the valley between them dips >= 15 % below the smaller of the two
  const hist = new Float64Array(32); for (let i = 0; i < W * H; i++) hist[Math.min(31, Y[i] >> 3)]++;
  const sm = new Float64Array(32);
  for (let b = 0; b < 32; b++) sm[b] = (hist[Math.max(0, b - 1)] + 2 * hist[b] + hist[Math.min(31, b + 1)]) / 4;
  const minMass = W * H * 0.01, peaks = [];
  for (let b = 0; b < 32; b++) if (sm[b] >= minMass && (b === 0 || sm[b] >= sm[b - 1]) && (b === 31 || sm[b] > sm[b + 1])) peaks.push(b);
  const merged = [];
  for (const p of peaks) {
    if (!merged.length) { merged.push(p); continue; }
    const q = merged[merged.length - 1]; let valley = Infinity; for (let b = q; b <= p; b++) valley = Math.min(valley, sm[b]);
    if (valley > 0.85 * Math.min(sm[p], sm[q])) { if (sm[p] > sm[q]) merged[merged.length - 1] = p; } else merged.push(p);
  }
  // value spread: luma of the 5th / 50th / 95th percentile
  const sorted = Float32Array.from(Y).sort(), pct = k => Math.round(sorted[Math.floor(k * (sorted.length - 1))]);
  // silhouette 120x68 (box filter), luma
  const SW = 120, SH = 68, sil = [];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const x0 = Math.floor(x * W / SW), x1 = Math.floor((x + 1) * W / SW), y0 = Math.floor(y * H / SH), y1 = Math.max(y0 + 1, Math.floor((y + 1) * H / SH));
    let s = 0, n = 0; for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += Y[yy * W + xx]; n++; }
    sil.push(Math.round(s / n));
  }
  // sky-touching top surfaces: per frame column, the topmost tile top edge in view (geometry: min over land tiles of the diamond's upper
  // boundary). Where sky shows above it, that column is an island BACK edge. It has thickness when the tile is a raised rim (its own S/E
  // faces show: h >= 2 + the lower of its S / E neighbours, or one of them is void); `lipped` = the frame shows a lit lip there
  // (rows 0-1 brighter than row 2 by > 6 luma).
  const m = G.map; let skyTop = 0, edgeCols = 0, lipped = 0;
  const [tx0, ty0, tx1, ty1] = viewTiles().map(Math.floor), best = new Float64Array(W).fill(1e9), own = new Int32Array(W).fill(-1);
  for (let j = Math.max(0, ty0); j <= Math.min(m.H - 1, ty1); j++) for (let i = Math.max(0, tx0); i <= Math.min(m.W - 1, tx1); i++) {
    if (!m.type[j][i]) continue;
    const cx = isoX(i, j) - camX + RW / 2, cy = isoY(i, j, m.h[j][i]) - camY + RH / 2;
    for (let x = Math.max(0, Math.ceil(cx - 16)); x <= Math.min(W - 1, Math.floor(cx + 16)); x++) { const y = cy + Math.abs(x + 0.5 - cx) / 2; if (y < best[x]) { best[x] = y; own[x] = j * m.W + i; } }
  }
  for (let x = 0; x < W; x++) {
    if (own[x] < 0) continue;
    const y = Math.round(best[x]); if (y < 3 || y >= H - 4) continue;
    edgeCols++;
    const i = own[x] % m.W, j = (own[x] / m.W) | 0, h = m.h[j][i];
    // a raised rim: within 4 tiles in front (+x / +y) the ground drops by >= 2 levels (or to void), i.e. a wall faces the camera
    let rim = false;
    for (let b = 0; b <= 4 && !rim; b++) for (let a = 0; a <= 4 && !rim; a++) { if (!a && !b) continue; const x2 = i + a, y2 = j + b; rim = x2 >= m.W || y2 >= m.H || !m.type[y2][x2] || m.h[y2][x2] <= h - 2; }
    const a = Y[y * W + x], b1 = Y[(y + 1) * W + x], c = Y[(y + 2) * W + x];
    if (Math.max(a, b1) > c + 6) lipped++;
    if (!rim) skyTop++;
  }
  return { specks, speckAt: at, clusters: merged.length, clusterPeaks: merged.map(b => b * 8), luma: [pct(0.05), pct(0.5), pct(0.95)], sil, skyTop, edgeCols, lipped };
}
function pageChunkCost() {
  const m = G.map, cg = chunkGrid(m), out = [];
  const outerIdx = new Set();
  for (const s of m.sections) if (s.kind === 'outer') {
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.secAt[j * m.W + i] === s.i && m.type[j][i]) outerIdx.add(chunkAt(m, isoX(i + 0.5, j + 0.5), isoY(i + 0.5, j + 0.5, m.h[j][i])));
  }
  for (let pass = 0; pass < 2; pass++) for (const idx of outerIdx) {   // pass 0 = JIT warm-up, pass 1 is timed
    if (cg.empty[idx]) continue;
    const key = chunkKey(m, idx), ch = CHUNK.cache.get(key);
    if (ch) { CHUNK.cache.delete(key); ch.c.width = 0; }
    CHUNK.jobs.delete(key);
    for (const k of cg.cols[idx]) k.img = null;
    const t0 = performance.now(); buildChunkStep(m, idx, Infinity); if (pass) out.push(performance.now() - t0);
  }
  out.sort((a, b) => a - b);
  return { chunks: out.length, size: CHUNK.size, worst: +out[out.length - 1].toFixed(1), p90: +out[Math.floor(out.length * 0.9)].toFixed(1), mean: +(out.reduce((a, b) => a + b, 0) / out.length).toFixed(1) };
}
async function savePng(page, file, kind, sil) {
  const b64 = await page.evaluate(([kind, sil]) => {
    let c;
    if (kind === 'frame') { const k = makeCanvas(SCN.c.width * 2, SCN.c.height * 2); k.x.imageSmoothingEnabled = false; k.x.drawImage(SCN.c, 0, 0, k.c.width, k.c.height); c = k.c; }
    else {
      const s = makeCanvas(120, 68), img = s.x.createImageData(120, 68);
      for (let i = 0; i < sil.length; i++) { const v = Math.round(sil[i] / 255 * 4) * 63.75; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
      s.x.putImageData(img, 0, 0);
      const k = makeCanvas(480, 272); k.x.imageSmoothingEnabled = false; k.x.drawImage(s.c, 0, 0, 480, 272); c = k.c;
    }
    return c.toDataURL('image/png').split(',')[1];
  }, [kind, sil]);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const report = { tag: TAG, date: new Date().toISOString(), maps: {} };
  let bad = 0;
  for (const mapId of MAPS) {
    const R = report.maps[mapId] = { shots: [] };
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${base}/index.html?map=${mapId}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await wait(500);
    if (SEA_HOOK) await page.evaluate(() => {   // the first bg.sea.forEach of a frame is render.js's "cloud sea far below" block
      const bg = G.map.theme._bg, arr = bg.sea.slice(); let last = -1;
      arr.forEach = function (fn, self) { if (last !== CHUNK.frame) { last = CHUNK.frame; drawCloudSea(sctx, G.map, camX, camY, G.t); } return Array.prototype.forEach.call(this, fn, self); };
      bg.sea = arr;
    });
    let n = 0;
    for (const [name, x, y] of SHOTS[mapId]) {
      n++;
      await page.evaluate(([x, y]) => {
        const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; p.invulnT = 9999;
        G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; G.enemies.length = 0; G.banner = null; G.msg = null; G.state = 'play';
        if (G.ui) { G.ui.open = false; G.ui.pause = false; }
      }, [x, y]);
      // settle: every visible chunk resident, then clear the random ambient life (fireflies / motes / particles) so frames compare
      for (let k = 0; k < 80; k++) { await wait(100); if (await page.evaluate(() => GROUND_STATS.visMissing === 0 && CHUNK.jobs.size === 0)) break; }
      await wait(400);
      await page.evaluate(() => { G.amb = []; if (G.parts) G.parts.length = 0; G.shakeA = 0; });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const met = await page.evaluate(pageMetrics);
      const file = `${mapId}_${n}_${name}`;
      await savePng(page, path.join(OUT, file + '.png'), 'frame');
      await savePng(page, path.join(OUT, file + '_sil.png'), 'sil', met.sil);
      delete met.sil; if (!flags.includes('--speck-xy')) delete met.speckAt;
      R.shots.push(Object.assign({ name, x, y, file: file + '.png' }, met));
      console.log(`${mapId.padEnd(9)} ${String(n)} ${name.padEnd(16)} specks ${String(met.specks).padStart(5)}  clusters ${met.clusters}  flatBackEdge ${met.skyTop}/${met.edgeCols} lipped ${met.lipped}  luma5/50/95 ${met.luma.join('/')}`);
    }
    R.specksMax = Math.max(...R.shots.map(s => s.specks)); R.specksMean = Math.round(R.shots.reduce((a, s) => a + s.specks, 0) / R.shots.length);
    R.clustersMin = Math.min(...R.shots.map(s => s.clusters));
    if (CHUNKS) {
      R.chunkDesktop = await page.evaluate(pageChunkCost);
      console.log(`${mapId} chunk raster desktop: ${JSON.stringify(R.chunkDesktop)}`);
    }
    if (errs.length) { console.log(`ERROR ${mapId}: ${errs.slice(0, 3).join(' | ')}`); bad++; }
    await page.close();
    if (CHUNKS) {
      const ph = await br.newPage({ viewport: { width: 640, height: 360 } });
      await ph.goto(`${base}/index.html?map=${mapId}&phone=1`, { waitUntil: 'load' });
      await ph.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
      R.chunkPhone = await ph.evaluate(pageChunkCost);
      console.log(`${mapId} chunk raster phone: ${JSON.stringify(R.chunkPhone)}`);
      await ph.close();
    }
  }
  await br.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(report, null, 1));
  console.log('\nmap       specks max/mean  clusters min  chunk ms desktop worst/mean  phone worst/mean');
  for (const [id, R] of Object.entries(report.maps)) console.log(`${id.padEnd(9)} ${String(R.specksMax).padStart(6)}/${String(R.specksMean).padEnd(6)}   ${String(R.clustersMin).padStart(6)}        ${R.chunkDesktop ? R.chunkDesktop.worst + '/' + R.chunkDesktop.mean : '-'}               ${R.chunkPhone ? R.chunkPhone.worst + '/' + R.chunkPhone.mean : '-'}`);
  console.log('wrote ' + path.relative(process.cwd(), OUT));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
