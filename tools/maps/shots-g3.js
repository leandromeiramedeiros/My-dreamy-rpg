#!/usr/bin/env node
'use strict';
// tools/maps/shots-g3.js -- §29 G3 (tall set pieces, vantage points, occlusion) screenshots -> tools/shots/world-art/g3-pieces/
//   <map>_piece_*      each set piece from the south (the scene frame, 2x) + a half-scale establishing frame (the desktop pull-back
//                      snapshot, screens.js vantageSnapshot) of the same spot
//   <map>_vantage_N    the vantage reveal sequence (the full display: scene + HUD + the cinematic), desktop; vale also on the phone tier
//   <map>_silhouette   the hero behind a tall column: the cutaway window + the silhouette
//   <map>_drop_N       the drop-down ledge, frame by frame
// Usage: node tools/maps/shots-g3.js            (the 6 fixed before / after shots are tools/maps/art-audit.js g3-before | g3-after)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(__dirname, '..', 'shots', 'world-art', 'g3-pieces');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const wait = ms => new Promise(r => setTimeout(r, ms));
// per map: the pieces (hero spot, camera hold point x / y / z), the vantage, the silhouette spot, the drop (ledge spot + keys)
const PLAN = {
  vale: {
    pieces: [['cairn_south', [47.4, 26.2], [48.6, 19.6, 8]], ['cairn_terrace', [57.6, 24.6], [52.4, 17.4, 7]], ['crown_summit', [47, 18.2], null]],
    vantage: { at: [47, 18.2], a: { id: 'crown', r: 40, title: 'The Stone\'s Crown', sub: 'Three rifts, two islets, and the cloud sea' } },
    silhouette: [47.2, 14.6], drop: { at: [49.6, 20.4], keys: ['a', 's'] },
  },
  pinewood: {
    pieces: [['hawk_south', [69.4, 46.8], [69.6, 38.4, 9]], ['hawk_road', [80.4, 41.6], [71.6, 37.8, 9]], ['hawk_summit', [68.2, 35.2], null]],
    vantage: { at: [68.3, 34.6], a: { id: 'hawks_rest', r: 34, title: 'Hawk\'s Rest', sub: 'The Clearing road, and something big asleep at its end' } },
    silhouette: [68.6, 32.4], drop: { at: [75, 38.2], keys: ['d', 's'] },
  },
};
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port, br = await chromium.launch();
  let bad = 0;
  const open = async (mapId, q = '') => {
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${base}/index.html?map=${mapId}${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await wait(500);
    page.errs = errs; return page;
  };
  const place = (page, at, hold) => page.evaluate(([x, y, h]) => {
    const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; p.invulnT = 9999; p.fall = null; p.climb = null;
    G.enemies.length = 0; G.banner = null; G.msg = null; G.state = 'play'; G.vantage = null; G.noCamBias = true;
    G.camHold = h ? { x: isoX(h[0], h[1]), y: isoY(h[0], h[1], h[2]) } : null;
    G.cam.x = h ? G.camHold.x : isoX(x, y); G.cam.y = h ? G.camHold.y : isoY(x, y, p.z) - 12;
    if (G.ui) { G.ui.open = false; G.ui.pause = false; }
  }, [at[0], at[1], hold]);
  const settle = async page => { for (let k = 0; k < 80; k++) { await wait(100); if (await page.evaluate(() => GROUND_STATS.visMissing === 0 && CHUNK.jobs.size === 0)) break; } await wait(400); await page.evaluate(() => { G.amb = []; if (G.parts) G.parts.length = 0; }); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };
  const scene = async (page, file, wide) => {
    const b64 = await page.evaluate(wide => {
      const k = makeCanvas(960, 540); k.x.imageSmoothingEnabled = false;
      if (wide) {   // the half-scale establishing frame: build the chunks of a 2x view first, then the pull-back snapshot
        const m = G.map, cg = chunkGrid(m), g = m.gp;
        for (let i = 0; i < cg.nx * cg.ny; i++) { if (cg.empty[i]) continue; const sx = (i % cg.nx) * cg.S + g.minSX + cg.S / 2, sy = ((i / cg.nx) | 0) * cg.S + cg.S / 2; if (Math.abs(sx - camX) < 720 && Math.abs(sy - camY) < 460) buildChunkStep(m, i, Infinity); }
        for (const c of m.columns) if (!c.img && c.chunk != null && chunkResident(m, c.chunk)) c.img = rasterColumn(m, c.i, c.j).img;
        k.x.drawImage(vantageSnapshot(m), 0, 0, 960, 540);
      } else k.x.drawImage(SCN.c, 0, 0, 960, 540);
      return k.c.toDataURL('image/png').split(',')[1];
    }, !!wide);
    fs.writeFileSync(path.join(OUT, file + '.png'), Buffer.from(b64, 'base64'));
  };
  for (const [mapId, P] of Object.entries(PLAN)) {
    const page = await open(mapId);
    for (const [name, at, hold] of P.pieces) {
      await place(page, at, hold); await settle(page);
      await scene(page, `${mapId}_piece_${name}`);
      if (hold) await scene(page, `${mapId}_piece_${name}_wide`, true);
    }
    // the hero behind a tall column: the cutaway + silhouette
    await place(page, P.silhouette, null); await settle(page);
    const occ = await page.evaluate(() => OCC.n);
    await scene(page, `${mapId}_silhouette`);
    console.log(`${mapId} silhouette: ${occ} occluding column(s)`); if (!occ) bad++;
    // the vantage reveal, desktop: the full display (scene + HUD + cinematic)
    await place(page, P.vantage.at, null); await settle(page);
    await page.evaluate(() => { G.noCamBias = false; G.camHold = null; });
    await page.evaluate(a => startVantage(a), P.vantage.a);
    const t0 = Date.now();
    for (const [k, ms] of [[1, 350], [2, 950], [3, 1500], [4, 2200], [5, 3000]]) { await wait(Math.max(0, ms - (Date.now() - t0))); await page.screenshot({ path: path.join(OUT, `${mapId}_vantage_${k}.png`) }); }
    await page.waitForFunction(() => !G.vantage, null, { timeout: 8000 }).catch(() => { console.log(mapId + ': the vantage did not end'); bad++; });
    // the drop-down ledge: walk off the lip, frames while falling
    await place(page, P.drop.at, null); await settle(page);
    await page.evaluate(() => { G.noCamBias = false; });
    for (const k of P.drop.keys) await page.keyboard.down(k);
    const fr = [];
    for (let n = 1; n <= 5; n++) { await wait(n === 1 ? 120 : 110); fr.push(await page.evaluate(() => ({ z: +G.player.z.toFixed(2), fall: !!G.player.fall }))); await scene(page, `${mapId}_drop_${n}`); }
    for (const k of P.drop.keys) await page.keyboard.up(k);
    console.log(`${mapId} drop frames: ${JSON.stringify(fr)}`);
    if (page.errs.length) { console.log(`ERROR ${mapId}: ${page.errs.slice(0, 3).join(' | ')}`); bad++; }
    await page.close();
  }
  // the phone tier: the reveal is the 1/4-res preview blit only (no bigger scene render)
  {
    const page = await open('vale', '&phone=1'), P = PLAN.vale;
    await place(page, P.vantage.at, null); await settle(page);
    await page.evaluate(() => { G.noCamBias = false; });
    await page.evaluate(a => startVantage(a), P.vantage.a); await wait(1700);
    await page.screenshot({ path: path.join(OUT, 'vale_vantage_phone.png') });
    const snap = await page.evaluate(() => !!(G.vantage && G.vantage.snap));
    console.log('phone vantage: half-scale snapshot built = ' + snap + ' (must be false)'); if (snap) bad++;
    if (page.errs.length) { console.log('ERROR phone: ' + page.errs.slice(0, 3).join(' | ')); bad++; }
    await page.close();
  }
  await br.close(); srv.close();
  console.log('wrote ' + path.relative(process.cwd(), OUT));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
