'use strict';
// ---------------------------------------------------------------------------
// Scene rendering + post-processing: fake lights (lightmap multiply + additive
// halos), bloom (emitter-only: lights, glints, moon, VFX cores at 1/4 & 1/8 res), drifting fog & mist (a clear zone round the hero),
// god rays, vignette.
// Big maps (docs/design/world-maps.md): drawScene reads the ground from the chunk cache (maps.js CHUNK; drawGround + groundTick
// here schedule the builds: the chunk under the camera synchronously, visible-missing chunks next with a large
// budget, then a prefetch ring on idle frames), and queries the spatial grid for objects, columns, water glints and
// static lights inside the view instead of walking whole-map lists. Lights: at most LIGHT_MAX visible (the hero's
// own light always kept). Sections: the lightmap ambient follows sectionAt(hero) (ambient / dark, lerped ~0.4 s);
// dark sections give the hero a lantern and thin the fog.
// ---------------------------------------------------------------------------
const SCN = makeCanvas(RW, RH), sctx = SCN.x;
// ===== §26.4 perf instrumentation ==========================================================================================
// ?perf=1: the on-screen readout (main.js drawPerfOverlay: fps, avg / p95 frame, work ms, draw calls, particles, the phase split).
// perfMark(name) closes the phase that ended at this point of the frame (main.js perfBegin opens the frame). Off = one boolean
// test per mark, nothing else installed. ?perf=flush also reads one scene pixel after each phase so the deferred raster work
// lands in the phase that queued it (a profiling mode: the readback itself slows the frame).
const PERF = (() => {
  let q = null; try { q = new URLSearchParams(location.search).get('perf'); } catch (e) { /* no location */ }
  return { on: !!q && q !== '0', flush: q === 'flush', t: 0, ph: {}, draws: 0, d0: 0, dph: {} };
})();
function perfMark(name, cx) {
  if (!PERF.on) return;
  if (PERF.flush) (cx || sctx).getImageData(0, 0, 1, 1);
  const t = performance.now(); PERF.ph[name] = (PERF.ph[name] || 0) + t - PERF.t; PERF.t = t;
  PERF.dph[name] = (PERF.dph[name] || 0) + PERF.draws - PERF.d0; PERF.d0 = PERF.draws;   // draw calls per phase
}
const LM = makeCanvas(RW / 2, RH / 2);
const B1 = makeCanvas(RW / 4, RH / 4), BT = makeCanvas(RW / 4, RH / 4), B2 = makeCanvas(RW / 8, RH / 8), BC = makeCanvas(RW / 4, RH / 4);
let VIGNETTE = null, GRADE = {};
const silCache = new WeakMap();
const silOf = (img, col) => { let m = silCache.get(img); if (!m) silCache.set(img, m = {}); return m[col] || (m[col] = silhouette(img, col)); };

let camX = 0, camY = 0;
const worldToView = (x, y, z = 0) => [isoX(x, y) - camX + RW / 2, isoY(x, y, z) - camY + RH / 2];
const sToView = (sx, sy) => [sx - camX + RW / 2, sy - camY + RH / 2];

// the backdrop of a theme, one part per prepThemeStep call (each <= ~40 ms; every builder seeds its own noise, so
// the result is the same whether it is built in one go at boot or over the frames of a portal fade, main.js preloadStep)
const THEME_PARTS = {
  sky: th => buildSky(th),
  far: (th, jag) => buildMountains(th, th.seed, th.mtnFar[0], th.mtnFar[1], th.mtnFar[2], 110, jag),
  near: (th, jag) => buildMountains(th, th.seed + 5, th.mtnNear[0], th.mtnNear[1], th.mtnNear[2], 70, jag),
  clouds: th => [0, 1, 2, 3].map(i => buildCloud(th.seed * 10 + i, 90 + i * 14, 40 + (i % 2) * 10, th.cloud)),
  sea: th => [0, 1, 2].map(i => buildCloud(th.seed * 20 + i, 150, 46, th.cloud)),
  fog: th => buildFog(th.seed, th.fog),
  fog2: th => buildFog(th.seed + 7, th.fog2),
  islets: th => [0, 1, 2].map(i => buildIslet(th, th.seed * 30 + i, 30 + i * 8)),
};
function prepThemeStep(m) {
  const th = m.theme;
  if (th._bg) return true;
  const jag = m.themeId === 'ruins' ? true : th.pines ? 'pines' : false, bg = th._bgPart || (th._bgPart = {});
  const k = Object.keys(THEME_PARTS).find(k => !(k in bg));
  if (k) { bg[k] = THEME_PARTS[k](th, jag); return false; }
  th._bg = bg; delete th._bgPart; return true;
}
function prepTheme(m) { while (!prepThemeStep(m)); }
function buildIslet(th, seed, w) {
  seedRng(seed);
  const h = Math.round(w * 1.2), pb = new PixBuf(w, h);
  const top = Math.round(w * 0.22);
  for (let x = 0; x < w; x++) {
    const t = Math.abs(x - w / 2) / (w / 2);
    const depth = (1 - Math.pow(t, 0.7)) * (h - top) * (0.6 + vnoise(x * 0.3, 0, seed) * 0.5);
    const cap = Math.round(top - Math.sqrt(Math.max(0, 1 - t * t)) * 3);
    for (let y = cap; y < top + depth; y++) {
      const c = y < top ? th.grass[3 - (y < cap + 1 ? 0 : 1)] : mixRgb(rampDither(th.under, 0.6 - (y - top) / depth * 0.4 - (x - w / 2) / w * 0.4, x, y), th.haze, 0.45);
      pb.set(x, y, c);
    }
  }
  for (let k = 0; k < 3; k++) { const tx = Math.round(w * 0.25 + k * w * 0.22); for (let y = 0; y < 6; y++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) < 3 - y / 3) pb.set(tx + dx, top - 2 - y, th.grass[2 + (dx < 0 ? 1 : 0)]); }
  return pb.toCanvas();
}

function initPost() {
  const v = makeCanvas(RW, RH);
  const g = v.x.createRadialGradient(RW / 2, RH / 2, RH * 0.35, RW / 2, RH / 2, RH * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,4,24,0.55)');
  v.x.fillStyle = g; v.x.fillRect(0, 0, RW, RH);
  VIGNETTE = v.c;
  for (const [k, top, bot] of [['vale', '#ff9ad0', '#6a8cff'], ['ruins', '#ff3a6a', '#3a1a8a'], ['forest', '#ff9a58', '#4a6ab0']]) {
    const c = makeCanvas(RW, RH), gg = c.x.createLinearGradient(0, 0, 0, RH);
    gg.addColorStop(0, top); gg.addColorStop(1, bot);
    c.x.fillStyle = gg; c.x.fillRect(0, 0, RW, RH); GRADE[k] = c.c;
  }
  if (!ART.dummy) ART.dummy = asciiSprite([
    '...KKKK...', '..KYYYYK..', '..KYkYkK..', '..KYYYYK..', '...KKKK...', 'KKKKWKKKKK', 'KYYYWYYYYK', 'KKKKWKKKKK', '...KWK....', '..KYYYK...', '..KYkYK...', '..KYYYK...', '..KYkYK...', '...KWK....', '...KWK....', '...KWK....', '..KKKKK...',
  ], { K: '#3a2418', Y: '#e8c06a', k: '#b08a3a', W: '#7a5236' });
}

// ===== ambient life (fireflies, petals, embers, mist) =======================
function updateAmbient(dt) {
  const m = G.map, p = G.player;
  G.amb = G.amb || [];
  const want = m.themeId === 'vale' ? 34 : 40;
  while (G.amb.length < want) {
    const a = Math.random() * 6.28, r = frand(1, 9);
    if (m.themeId === 'forest') G.amb.push({ k: 'mote', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: frand(0.3, 4), ph: frand(0, 6.28), life: frand(5, 10), t: 0 });
    else if (m.themeId === 'vale') G.amb.push({ k: 'fly', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: frand(0.5, 3), ph: frand(0, 6.28), life: frand(6, 12), t: 0 });
    else G.amb.push({ k: 'ember', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: frand(0, 1), ph: frand(0, 6.28), life: frand(3, 7), t: 0 });
  }
  for (const f of G.amb) {
    f.t += dt;
    if (f.k === 'fly') { f.x += Math.cos(f.ph + G.t * 0.7) * dt * 0.4; f.y += Math.sin(f.ph * 1.3 + G.t * 0.5) * dt * 0.4; f.z += Math.sin(f.ph + G.t * 1.7) * dt * 0.3; }
    else if (f.k === 'mote') { f.z += Math.sin(f.ph + G.t * 0.6) * dt * 0.15; f.x += dt * 0.12; f.y += Math.cos(f.ph + G.t * 0.4) * dt * 0.1; }
    else { f.z += dt * 0.9; f.x += Math.sin(f.ph + G.t) * dt * 0.3; }
    if (f.t > f.life || dist(f.x, f.y, p.x, p.y) > 12) f.dead = true;
  }
  G.amb = G.amb.filter(f => !f.dead);
  // petals from blossom trees
  if (m.themeId === 'vale' && Math.random() < dt * 6) {
    const blossoms = m.objects.filter(o => o.img && ART.trees.blossom.includes(o.img));
    if (blossoms.length) { const b = pick2(blossoms); addPart({ x: b.x + frand(-0.6, 0.6), y: b.y + frand(-0.6, 0.6), z: 5 + frand(0, 2), vx: frand(0.2, 0.6), vy: frand(-0.1, 0.3), vz: -0.5, life: 5, t: 0, col: pick2(['#ffd0e6', '#ffffff', '#f6a6c8']), grav: 0.05, size: 1, glow: false, petal: true }); }
  }
  // waterfall mist
  for (const f of m.falls) {
    if (Math.random() < dt * (f.edge ? 0 : 14)) addPart({ x: f.wx + frand(-0.5, 0.5), y: f.wy + frand(0, 0.6), z: 0.2, vx: frand(-0.3, 0.3), vy: frand(0, 0.6), vz: frand(0.5, 1.6), life: frand(0.8, 1.6), t: 0, col: '#e8fbff', grav: 0.2, size: 2, glow: false, mist: true });
  }
  for (const ch of m.chimneys || []) if (Math.random() < dt * 4) addPart({ x: ch.x, y: ch.y, z: ch.z, vx: 0.15, vy: -0.1, vz: 0.6, life: 3, t: 0, col: '#e6dcf0', grav: -0.05, size: 2, glow: false, mist: true });
}

// ===== frame ======================================================================
// ===== ground chunks: draw what is resident, queue the rest ==================================================
const GROUND_STATS = { visMissing: 0, syncBuilds: 0, lastTickMs: 0 };
function drawGround(ctx, m) {
  const cg = chunkGrid(m), g = m.gp, S = cg.S, vx0 = camX - RW / 2 - g.minSX, vy0 = camY - RH / 2, missing = [];
  const ci0 = clamp(Math.floor(vx0 / S), 0, cg.nx - 1), ci1 = clamp(Math.floor((vx0 + RW - 1) / S), 0, cg.nx - 1);
  const cj0 = clamp(Math.floor(vy0 / S), 0, cg.ny - 1), cj1 = clamp(Math.floor((vy0 + RH - 1) / S), 0, cg.ny - 1);
  for (let cj = cj0; cj <= cj1; cj++) for (let ci = ci0; ci <= ci1; ci++) {
    const idx = cj * cg.nx + ci; if (cg.empty[idx]) continue;
    const ch = chunkResident(m, idx), dx = Math.round(ci * S + g.minSX - camX + RW / 2), dy = Math.round(cj * S - camY + RH / 2);
    if (ch) { ch.last = ch.seen = CHUNK.frame; ctx.drawImage(ch.c, dx, dy); continue; }
    missing.push(idx);
    const pv = groundPreview(m), Q = S / 4;
    ctx.drawImage(pv, ci * Q, cj * Q, Q, Q, dx, dy, S, S);
  }
  GROUND_STATS.visMissing = missing.length;
  return missing;
}
// scheduling: groundTick(m, false) before drawGround (the camera chunk synchronously, visible-missing chunks with a large
// budget so they show this frame); groundTick(m, true) at the end of drawScene = the idle prefetch, which only spends
// what is left of a ~14 ms scene (at most IDLE_MS) on the ring of chunks around the view.
const IDLE_MS = PHONE ? 1.5 : 2.5, IDLE_END = PHONE ? 9.5 : 10.5, CAM_CHUNK_MS = PHONE ? 12 : 16;
const preloadOwns = job => { try { return !!(PRELOAD && job.m.id === PRELOAD.id); } catch (e) { return false; } };   // main.js PRELOAD
function groundTick(m, idle, sceneMs = 0) {
  const cg = chunkGrid(m), g = m.gp, S = cg.S, t0 = performance.now();
  if (CHUNK.cache.size > CHUNK.max) chunkEvict(m);   // the cap holds between builds too (it was lowered, or builds now land over several frames)
  const c0 = chunkAt(m, camX, camY);   // the chunk under the camera: always built now (start, respawn, warp arrival)
  // perf (QA: 290-450 ms frames on a warp / section arrival): never Infinity; CAM_CHUNK_MS a frame, the low-res
  // groundPreview fills in for the few frames it takes (under the warp / respawn fade on most arrivals)
  if (!idle && !cg.empty[c0] && !chunkResident(m, c0)) { buildChunkStep(m, c0, CAM_CHUNK_MS); GROUND_STATS.syncBuilds++; }
  const vx0 = camX - RW / 2 - g.minSX, vy0 = camY - RH / 2, want = [];
  const pre = S * 0.6, ci0 = Math.floor((vx0 - pre) / S), ci1 = Math.floor((vx0 + RW + pre) / S), cj0 = Math.floor((vy0 - pre) / S), cj1 = Math.floor((vy0 + RH + pre) / S);
  let vis = 0, visTotal = 0, ringRes = 0;
  for (let cj = Math.max(0, cj0); cj <= Math.min(cg.ny - 1, cj1); cj++) for (let ci = Math.max(0, ci0); ci <= Math.min(cg.nx - 1, ci1); ci++) {
    const idx = cj * cg.nx + ci; if (cg.empty[idx]) continue;
    const x0 = ci * S, y0 = cj * S, visible = x0 < vx0 + RW && x0 + S > vx0 && y0 < vy0 + RH && y0 + S > vy0;
    if (visible) visTotal++;
    if (chunkResident(m, idx)) { if (!visible) ringRes++; continue; }   // only drawGround (truly visible) bumps LRU
    const d = Math.hypot(x0 + S / 2 - (vx0 + RW / 2), y0 + S / 2 - (vy0 + RH / 2));
    if (visible) vis++;
    want.push({ idx, visible, pri: (visible ? 0 : 1e6) + d });
  }
  // prefetch never builds past the resident cap (so the ring cannot thrash the LRU)
  let allowPre = Math.max(0, CHUNK.max - 1 - visTotal - ringRes);
  let ema = 16.7; try { ema = frameEma; } catch (e) { /* main.js not loaded (editor) */ }
  if (!idle && !vis) { GROUND_STATS.lastTickMs = performance.now() - t0; return; }
  // idle = the frame rate is holding AND this frame has slack: the work since the frame began (main.js `last`, the rAF
  // timestamp: update steps + this scene) leaves room before ~12.5 ms (the HUD and the blit still follow)
  let spent = sceneMs; try { spent = Math.max(sceneMs, performance.now() - last); } catch (e) { /* no main loop */ }
  // phone: 3 ms a frame for visible-missing chunks (a 256 px chunk lands over ~10 frames behind the low-res preview) - the build
  // bursts were most of the phone p95 (§26.4 tail)
  // idle: the prefetch must END by IDLE_END ms into the frame - the HUD, the scene blit and the canvas commit (~4 ms headless)
  // still follow. It used to run up to 12.5 + 2.5 ms whenever the frame EMA was under 17.2 ms, so once a frame got cheaper the
  // prefetch ate the slack and pushed frames back over vsync (the frame average settled at ~17.2 ms whatever the scene cost).
  const budget = !idle ? (G.fade > 0.3 ? 14 : PHONE ? 3 : 8) : ema > 17 ? 0 : clamp(IDLE_END - spent, 0, IDLE_MS);
  want.sort((a, b) => a.pri - b.pri);
  const keep = new Set(want.map(w => chunkKey(m, w.idx)));
  for (const [k, job] of CHUNK.jobs) if (!keep.has(k) && !preloadOwns(job) && (job.m !== m || CHUNK.frame - (job.touch || 0) > 60)) dropChunkJob(k, job);   // stale partial builds (a portal preload's own job stays)
  for (const w of want) {
    if (!idle && !w.visible) break;
    if (!w.visible && allowPre-- <= 0) break;
    const left = budget - (performance.now() - t0); if (left <= 0) break;
    if (!buildChunkStep(m, w.idx, left)) break;
  }
  GROUND_STATS.lastTickMs = (idle ? GROUND_STATS.lastTickMs : 0) + performance.now() - t0;
}
// the tile-space box that can hold anything visible (tall sprites and columns rise above their base: pad below)
// §29 G3 pads (world-art minutes §3.3 fix 4): mTop 40 -> 160, mBot 190 -> 240, for 28-level columns and the props on them
function viewTiles(mx = 80, mTop = 160, mBot = 240) {
  const xs = [], ys = [];
  for (const [sx, sy] of [[camX - RW / 2 - mx, camY - RH / 2 - mTop], [camX + RW / 2 + mx, camY - RH / 2 - mTop], [camX - RW / 2 - mx, camY + RH / 2 + mBot], [camX + RW / 2 + mx, camY + RH / 2 + mBot]]) { const [wx, wy] = toWorld(sx, sy); xs.push(wx); ys.push(wy); }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// section ambient (darkness module): the lightmap fill lerps toward the hero's section look
function sectionLook(m, p, th) {
  const sec = (typeof sectionAt === 'function' && sectionAt(m, p.x, p.y)) || {}, dark = sec.dark || 0;
  const target = hexToRgb(sec.ambient || th.ambient), want = dark ? mixRgb(target, [5, 3, 12], dark) : target;
  const L = m._look || (m._look = { c: want.slice(), dark, t: G.t });
  const k = 1 - Math.exp(-Math.max(0, G.t - L.t) / 0.13); L.t = G.t;
  for (let i = 0; i < 3; i++) L.c[i] += (want[i] - L.c[i]) * k;
  L.dark += (dark - L.dark) * k;
  L.css = `rgb(${L.c[0] | 0},${L.c[1] | 0},${L.c[2] | 0})`; L.sec = sec;
  return L;
}

function drawScene() {
  const m = G.map, th = m.theme, bg = th._bg, ctx = sctx, p = G.player;
  const shx = (Math.random() - 0.5) * G.shakeA * 2, shy = (Math.random() - 0.5) * G.shakeA * 2;
  camX = Math.round(G.cam.x + shx); camY = Math.round(G.cam.y + shy);
  const lights = [];
  CHUNK.frame++;
  const sceneT0 = performance.now();
  perfMark('other');
  groundTick(m, false);
  perfMark('chunks');
  const look = sectionLook(m, p, th);
  const [vtx0, vty0, vtx1, vty1] = viewTiles();
  const viewObjs = gridQuery(m, 'objs', vtx0, vty0, vtx1, vty1);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;

  // ---- sky & distant world ----
  const groundBot = (m.W + m.H) * 8 + 12;
  const pxs = clamp(-80 - camX * 0.02, -160, 0), pys = clamp(-50 - camY * 0.02, -90, 0);
  ctx.drawImage(bg.sky.c, Math.round(pxs), Math.round(pys));
  if (!th.moon.sun) drawStars(ctx, bg.sky.stars, pxs, pys);
  perfMark('sky.base');
  const mo = th.moon, mx = mo.x + pxs * 0.5, my = mo.y + pys * 0.5;
  BLOOM_MOONAT = BLOOM_MOONAT || [0, 0, null]; BLOOM_MOONAT[0] = mx; BLOOM_MOONAT[1] = my; BLOOM_MOONAT[2] = mo;   // the bloom's moon emitter
  ctx.drawImage(moonGlow(mo), Math.round(mx - mo.r * 4), Math.round(my - mo.r * 4));
  if (mo.sun) { ctx.fillStyle = mo.col; ctx.beginPath(); ctx.arc(Math.round(mx), Math.round(my), mo.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(Math.round(mx), Math.round(my), mo.r * 0.7, 0, Math.PI * 2); ctx.fill(); }
  else drawMoon(ctx, mx, my, mo.r, mo.col);
  if (m.themeId === 'vale') drawMoon(ctx, mx - 70, my + 22, 7, '#d6e6ff');
  perfMark('sky.moon');
  const farY = RH * 0.5 - 120 - camY * 0.04, nearY = RH * 0.55 - 100 - camY * 0.08;
  ctx.drawImage(bg.far, Math.round(-200 - camX * 0.05), Math.round(farY));
  // distant floating islets
  bg.islets.forEach((im, i) => {
    const x = ((i * 190 + 60 - camX * 0.1 + G.t * (2 + i)) % 700) - 100, y = 70 + i * 26 + Math.sin(G.t * 0.4 + i) * 3 - camY * 0.06;
    ctx.globalAlpha = 0.75; ctx.drawImage(im, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
  });
  ctx.drawImage(bg.near, Math.round(-240 - camX * 0.1), Math.round(nearY));
  bg.clouds.forEach((c, i) => {
    const x = ((i * 170 - camX * 0.15 + G.t * (4 + i * 1.5)) % 760) - 140, y = 40 + i * 30 - camY * 0.1;
    ctx.globalAlpha = 0.85; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
  });
  perfMark('sky.mtn');
  // god rays: dawn shafts from the low sun, slanting down to the right through the mist (+ the Vale's pink moon shafts)
  if (QUALITY.cfg.rays && (th.rays || m.themeId === 'vale')) drawRays(ctx, m, th, mx, my);
  perfMark('sky');
  // cloud sea far below
  if (typeof drawCloudSea === 'function') drawCloudSea(ctx, m, camX, camY, G.t);   // §29: 2-layer cloud sea + island shadow (maps.js, cached)
  bg.sea.forEach((c, i) => {
    for (let r = 0; r < 2; r++) {
      const x = ((i * 230 + r * 330 - camX * 0.6 + G.t * 6) % 900) - 220, y = groundBot + th.underDepth * 0.55 + i * 18 + r * 30 - camY * 0.85 + RH / 2;
      ctx.globalAlpha = 0.6; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
    }
  });

  perfMark('sea');
  // ---- island ----
  drawGround(ctx, m);
  perfMark('ground');
  for (const f of m.falls) if (f.edge) drawFall(ctx, f, true);
  perfMark('falls');
  drawWater(ctx, m, vtx0, vty0, vtx1, vty1);
  if (m.hasRunes) drawSigil(ctx, m, lights);

  // clouds drifting in front of the underside
  bg.sea.forEach((c, i) => {
    const x = ((i * 260 + 100 - camX + G.t * 9) % 1000) - 260, y = groundBot + th.underDepth * 0.82 + i * 10 - camY + RH / 2;
    ctx.globalAlpha = 0.85; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
  });

  perfMark('ground');
  // ---- ground decals: shadows, telegraphs, zones ----
  ctx.fillStyle = 'rgba(20,8,40,0.32)';
  const shadow = (x, y, z, r) => { const [vx, vy] = worldToView(x, y, z); ctx.beginPath(); ctx.ellipse(Math.round(vx), Math.round(vy), r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); };
  drawPropShadows(ctx, m);   // the props' static shadows, pre-rendered in 256 px tiles (was one ellipse fill per prop per frame)
  if (!p.dead) drawHeroShadow(ctx, p);   // light-aware (M4a): away from the strongest light, + the skewed silhouette on 'high'
  const inViewE = e => { const vx = isoX(e.x, e.y) - camX + RW / 2, vy = isoY(e.x, e.y, e.z || 0) - camY + RH / 2; return vx > -90 && vx < RW + 90 && vy > -40 && vy < RH + 150; };
  const viewEnemies = G.enemies.filter(inViewE);
  { const t0 = PERF.on ? performance.now() : 0;
    for (const e of viewEnemies) { const [vx, vy] = worldToView(e.x, e.y, 0); lightShadow(ctx, vx, vy, e.boss ? 18 : (e.type === 'wisp' ? 4 : 7), e, null); }
    if (PERF.on) PERF.ph['sub.shadow'] = (PERF.ph['sub.shadow'] || 0) + performance.now() - t0; }
  for (const c of G.corpses) if (c.mode === 'fling' && c.t < c.life) shadow(c.x, c.y, c.gz, 5);   // the fling arc reads off its shadow
  for (const z of G.zones) if (inViewE(z) || z.r > 4) drawZone(ctx, z);
  for (const e of G.effects) if (e.type === 'tele' || e.type === 'marker' || e.type === 'line' || e.type === 'summon') drawDecal(ctx, e);
  const aimNow = currentAim();   // the player's ground indicator (kind:'aim'), under the sprites
  if (aimNow) drawAimIndicator(aimNow.aim, aimNow.from, aimNow.to, aimNow);
  for (const e of G.effects) if (e.type === 'aimflash') drawAimIndicator(e.aim, e.from, e.to, { col: e.col, flash: true });

  perfMark('decals');
  // ---- world status tiles (status.js: burning grass, ice, wet ground) ----
  if (typeof STATUS !== 'undefined') { STATUS.begin(); STATUS.drawTiles(ctx, lights); }
  perfMark('status.tiles');
  // ---- depth-sorted world ----
  const list = [];
  const inView = (sx, sy, w = 80) => { const vx = sx - camX + RW / 2, vy = sy - camY + RH / 2; return vx > -w && vx < RW + w && vy > -w * 1.5 && vy < RH + w * 1.5; };
  for (const c of gridQuery(m, 'cols', vtx0, vty0, vtx1, vty1)) if (!c.gone && inView(c.sx + 16, c.sy + 20)) {
    if (!c.img) { if (c.chunk == null || !chunkResident(m, c.chunk)) continue; c.img = rasterColumn(m, c.i, c.j).img; }
    list.push(c);
  }
  const heroKey = depthKey(m, p.x, p.y, p.z) + 0.01;   // §29 G3: never over a taller wall in front of the hero (maps.js depthKey)
  TREE_FRAME.t = WIND.now(); TREE_FRAME.live = WIND.active(); TREE_FRAME.n = 0; TREE_FRAME.hero = p.dead ? null : worldToView(p.x, p.y, p.z); TREE_FRAME.hkey = heroKey;
  for (const o of viewObjs) if (inView(isoX(o.x, o.y), isoY(o.x, o.y, o.z))) { list.push(o); if (o.tree && o.img.swayF && !o.gone && treeTick(o)) list.push(o._cv || (o._cv = { kind: 'canopy', o, key: o.key + 0.5 })); }
  for (const f of m.falls) if (!f.edge && inView(f.x0 + 8, f.y0 + f.len / 2, 40 + f.len)) list.push({ kind: 'fall', f, key: f.key });
  if (!p.dead || G.state === 'dead') list.push({ kind: 'player', key: heroKey });
  for (const e of viewEnemies) list.push({ kind: 'enemy', e, key: depthKey(m, e.x, e.y, e.z || 0) + 0.01 });
  for (const pr of G.projs) if (inView(isoX(pr.x, pr.y), isoY(pr.x, pr.y, pr.z || 0), 40)) list.push({ kind: 'proj', pr, key: pr.x + pr.y + 0.3 });
  for (const d of G.drops) if (inView(isoX(d.x, d.y), isoY(d.x, d.y, d.z))) list.push({ kind: 'drop', d, key: d.x + d.y + d.z * 0.35 + 0.02 });
  for (const c of G.critters || []) if (inViewE(c)) list.push({ kind: 'critter', c, key: c.x + c.y + c.z * 0.35 });
  for (const e of G.effects) if (e.type === 'ghost') list.push({ kind: 'ghost', e, key: e.x + e.y });
  if (G.echo && G.echo.alive && G.echo.alpha > 0.01) { const g = G.echo.g; list.push({ kind: 'echo', key: g.x + g.y + g.z * 0.35 + 0.008 }); }   // §30 spirit clone
  for (const c of G.corpses) if (inView(isoX(c.x, c.y), isoY(c.x, c.y, c.gz))) { c.key = c.x + c.y + 0.005; list.push(c); }
  if (p.buffs.orbit) for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * Math.PI * 2 / 3; list.push({ kind: 'orb', x: p.x + Math.cos(a) * 1.4, y: p.y + Math.sin(a) * 1.4, z: p.z + 1.2, key: p.x + Math.cos(a) * 1.4 + p.y + Math.sin(a) * 1.4 + p.z * 0.35 }); }
  list.sort((a, b) => a.key - b.key);
  rimBegin();
  const occluded = !p.dead && heroOccluders(m, p, list, heroKey);   // §29 G3 cutaway marks + the silhouette below
  for (const it of list) drawItem(ctx, it, lights);
  if (occluded) drawHeroGhost(ctx, p);
  if (aimNow) drawAimReticleTop(aimNow);   // the reticle again on top at 35 % so it reads over a boss

  perfMark('entities');
  // ---- top effects + particles ----
  ctx.globalCompositeOperation = 'lighter';
  { const n0 = lights.length;
    for (const e of G.effects) if (e.type !== 'tele' && e.type !== 'marker' && e.type !== 'line' && e.type !== 'ghost' && e.type !== 'summon' && e.type !== 'aimflash') drawEffect(ctx, e, lights);
    bloomTag(lights, n0, 1); }   // spells bloom at 1.0
  ctx.globalCompositeOperation = 'source-over';
  drawParticles(ctx, lights);

  perfMark('fx');
  // ---- fog & mist ----
  const forest = m.themeId === 'forest', fk = 1 - look.dark * 0.7;
  const FL = FOG_LAYERS; FL.length = 0;
  FL.push([bg.fog, 256, 0.5, 7, 2.5, (forest ? 0.24 : m.themeId === 'vale' ? 0.15 : 0.18) * fk]);
  if (!COARSE_POINTER) {   // §16.6.6: one fog layer on touch devices
    FL.push([bg.fog2, 384, 0.8, -4, 1.2, (forest ? 0.09 : m.themeId === 'vale' ? 0.07 : 0.1) * fk]);
    if (forest) FL.push([bg.fog, 512, 1.1, 3, 0.6, 0.14 * fk]);   // heavy low mist banks
  }
  if (QUALITY.cfg.fogHole && !p.dead) drawFogClear(ctx, FL, worldToView(p.x, p.y, p.z));
  else for (const L of FL) drawFog(ctx, L[0], L[1], L[2], L[3], L[4], L[5]);

  perfMark('fog');
  // ---- lighting ----
  const nStatic = lights.length;
  lightsIn(m, camX - RW / 2, camY - RH / 2, camX + RW / 2, camY + RH / 2, lights);
  for (let i = nStatic; i < lights.length; i++) { const L = lights[i]; L.__st = 1; if (L.bloom == null) L.bloom = 1; }   // map lights: stable objects (the light pool keys them); lanterns / torches bloom
  for (const o of viewObjs) if (o.brazier) { lights.push({ sx: isoX(o.x, o.y), sy: isoY(o.x, o.y, o.z) - 14, r: 70 + Math.sin(G.t * 13 + o.x) * 6, col: '#c77bff', a: 0.9, bloom: 1 }); }
  // the hero's light (a lantern in dark sections) is always kept by the light budget; it blooms only as a lantern (dark sections)
  const heroL = p.dead ? null : { sx: isoX(p.x, p.y), sy: isoY(p.x, p.y, p.z) - 10, r: 54 + 46 * look.dark, col: '#ffe6d0', a: 0.28 + 0.55 * look.dark, keep: true, own: p, bloom: look.dark };
  if (heroL) lights.push(heroL);
  const pl = typeof pipLight === 'function' && pipLight(); if (pl) { pl.bloom = 0; lights.push(pl); }   // §28 Pip's floating amber light (game.js)
  applyLighting(ctx, lights, th, look.css);

  perfMark('lights');
  // ---- bloom + grade ----
  applyBloom(ctx, th.bloom * (typeof flashCap === 'function' ? flashCap() : 1));
  perfMark('bloom');
  if (QUALITY.cfg.grade) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22; ctx.drawImage(GRADE[m.themeId], 0, 0); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  perfMark('grade.soft');
  if (p.buffs.dreamveil) { ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,140,220,0.25)'; ctx.fillRect(0, 0, RW, RH); ctx.globalCompositeOperation = 'source-over'; }
  ctx.drawImage(VIGNETTE, 0, 0);
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(255,40,90,${p.hurtT * 0.6})`; ctx.fillRect(0, 0, RW, RH); }
  perfMark('grade');
  groundTick(m, true, performance.now() - sceneT0);   // idle prefetch with what is left of the frame
  perfMark('chunks');
}

// perf: the ray shafts were 5-7 gradient polygons a frame (~0.5 ms in the software rasteriser). They are summed into one layer
// ('lighter' is additive, so the layer adds the same light) and the layer is re-rastered only when the moon moves a whole pixel
// or every 0.1 s (a shaft's alpha drifts < 0.002 in that time); each frame blits the layer's box once.
const RAYS = { L: makeCanvas(RW, RH), key: '', box: null };
function drawRays(ctx, m, th, mx, my) {
  const key = m.themeId + '|' + Math.round(mx) + '|' + Math.round(my) + '|' + Math.floor(G.t * 10);
  if (key !== RAYS.key) {
    RAYS.key = key; const x = RAYS.L.x; x.clearRect(0, 0, RW, RH);
    if (th.rays) {
      x.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) {
        const a = th.rays.alpha * (0.6 + 0.4 * Math.sin(G.t * 0.35 + k * 1.3)), x0 = mx - 90 + k * 28, w0 = 6 + (k % 3) * 5;
        const g = x.createLinearGradient(x0, my, x0 + 220, RH);
        g.addColorStop(0, `rgba(255,214,160,${a})`); g.addColorStop(1, 'rgba(255,214,160,0)');
        x.fillStyle = g; x.beginPath(); x.moveTo(x0, my); x.lineTo(x0 + w0, my); x.lineTo(x0 + 260 + w0 * 4, RH + 40); x.lineTo(x0 + 190, RH + 40); x.closePath(); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
    }
    if (m.themeId === 'vale') {
      x.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const a = 0.035 + 0.025 * Math.sin(G.t * 0.5 + k * 1.7), x0 = mx - 30 + k * 18;
        const g = x.createLinearGradient(x0, my, x0 - 160, RH);
        g.addColorStop(0, `rgba(255,220,240,${a})`); g.addColorStop(1, 'rgba(255,220,240,0)');
        x.fillStyle = g; x.beginPath(); x.moveTo(x0, my); x.lineTo(x0 + 10 + k * 3, my); x.lineTo(x0 - 140 + k * 10, RH); x.lineTo(x0 - 200 + k * 6, RH); x.closePath(); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
    }
    // the box the shafts can cover (forest: right of the sun, Vale: left), clipped to the view
    const bx0 = th.rays ? mx - 90 : mx - 230, bx1 = th.rays ? mx + 410 : mx + 70, x0 = clamp(Math.floor(m.themeId === 'vale' ? Math.min(bx0, mx - 230) : bx0), 0, RW), x1 = clamp(Math.ceil(m.themeId === 'vale' ? Math.max(bx1, mx + 70) : bx1), 0, RW), y0 = clamp(Math.floor(my), 0, RH);
    RAYS.box = x1 > x0 && y0 < RH ? [x0, y0, x1 - x0, RH - y0] : null;
  }
  if (!RAYS.box) return;
  const [bx, by, bw, bh] = RAYS.box;
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(RAYS.L.c, bx, by, bw, bh, bx, by, bw, bh); ctx.globalCompositeOperation = 'source-over';
}

// ===== trees v2: canopy over the hero, travelling-gust sway (docs/design/world-maps.md G2; world-art minutes §2.1 / §2.2) ==================
// A tree (o.tree, img = art.js canopyTree / pineTree2 composite) is ONE drawImage of its composite (img.swayF[frame]) unless its
// canopy is split off: then drawItem draws img.trunk at the tree's key and a { kind: 'canopy' } list entry at key + 0.5 draws
// img.canopyF[frame] at alpha o._fade, OVER the hero. The canopy is split while the hero's rect meets the canopy box and the hero
// sorts before key + 0.5 (it fades 1 -> 0.35 over 0.2 s), and while it fades back. Sway: 1 tree in 4 (hashed), only in the near
// band around the hero (<= TREE_SWAY_MAX a frame); its frame (-1 / 0 / +1 px on the top 60 %) comes from a gust that travels
// across the map plus a two-frequency sway (Lumina src/engine/world/props/Wind.js; docs/CREDITS.md), retuned to tiles.
const TREE_FRAME = { n: 0, hero: null, hkey: 0, t: 0, live: false }, TREE_SWAY_MAX = 60, TREE_FADE = 0.35, TREE_FADE_S = 0.2;
const GUST = { dx: 0.94, dy: 0.34, k: 0.25 };   // the far band's closed-form gust (js/wind.js has the field the near band samples): direction in tiles; k: phase per tile (~25 tiles apart, ~1.7 tiles/s)
function gustFrame(o, t) {
  const ph = (o.sway || 0) + o.x * 0.23 + o.y * 0.17;
  const gust = 0.55 + 0.45 * Math.sin(t * 0.43 - (o.x * GUST.dx + o.y * GUST.dy) * GUST.k);
  const sw = Math.sin(t * 1.21 + ph) * 0.62 + Math.sin(t * 2.37 + ph * 1.73) * 0.38;
  const d = sw * (0.35 + 0.65 * gust) + (gust - 0.55) * 0.9;
  return d > 0.62 ? 1 : d < -0.62 ? -1 : 0;
}
// per visible tree, once a frame (drawScene list build): sets o._fr (sway frame), o._fade, o._split; true = push the canopy entry
function treeTick(o) {
  const img = o.img, F = TREE_FRAME, h = F.hero, [vx, vy] = worldToView(o.x, o.y, o.z), t = G.t;
  let fr = 0;
  if (o._sw === undefined) o._sw = hash2(Math.floor(o.x * 7), Math.floor(o.y * 7), 77) < 0.25;
  // wind: the near band (<= TREE_SWAY_MAX) samples the field (5 frames -2..+2; while an emitter is live every tree answers), the far band keeps the closed form
  if (h && (o._sw || F.live) && Math.abs(vx - h[0]) < 190 && Math.abs(vy - h[1]) < 130 && F.n < TREE_SWAY_MAX) { F.n++; fr = WIND.frame(o.x, o.y, o.sway || 0, F.t); }
  else if (o._sw) fr = gustFrame(o, F.t);
  const flip = o.flip !== !!o.pulled; o._fr = flip ? -fr : fr;
  let cover = false;
  if (h && F.hkey < o.key + 0.5) {
    const b = img.cbox, X = Math.round(vx - o.ax), Y = Math.round(vy - o.ay);
    const x0 = flip ? X + img.width - b[2] : X + b[0], x1 = flip ? X + img.width - b[0] : X + b[2];
    cover = h[0] + 7 > x0 && h[0] - 7 < x1 && h[1] > Y + b[1] && h[1] - 32 < Y + b[3];
  }
  const want = cover ? TREE_FADE : 1, dt = o._ft == null ? 1 : t - o._ft;
  o._ft = t;
  if (o._fade == null || dt > 0.5 || dt < 0) o._fade = want;
  else { const k = (1 - TREE_FADE) / TREE_FADE_S * dt; o._fade = o._fade < want ? Math.min(want, o._fade + k) : Math.max(want, o._fade - k); }
  return (o._split = o._fade < 0.999);
}
// wind props (js/wind.js prop(): one field sample per 3-tile cell a frame): grass 1 (2 frames + a 1 px lean when strong), bush 2 (the
// 3 sway frames by wind sign), lantern 3 (its head, the top 6 rows, swings 1 px). Sets WP_DX / WP_HEAD for drawItem; returns the frame image.
let WP_DX = 0, WP_HEAD = 0;
function windProp(it, img) {
  WP_DX = 0; WP_HEAD = 0;
  const wk = it._wk !== undefined ? it._wk : (it._wk = it.grass ? 1 : img.swayF ? 2 : img === ART.lantern || img === ART.lanternBlue ? 3 : 0);
  if (!wk) return img;
  const f = WIND.prop(wk, it.x, it.y, it.sway || 0, TREE_FRAME.t);   // screen sign: + leans right
  if (wk === 1) { WP_DX = f === 2 ? 1 : f === -2 ? -1 : 0; return ART.grass[f >= 0 ? 1 : 0]; }
  if (wk === 2) return img.swayF[(f > 0 ? 1 : f < 0 ? -1 : 0) * (it.flip !== !!it.pulled ? -1 : 1) + 1];   // a mirrored sheet leans the other way in its own pixels
  WP_DX = f > 0 ? 1 : f < 0 ? -1 : 0; WP_HEAD = 6; return img;
}
// directional tree shadows (desktop): the tree's silhouette squashed to 0.4 in y, laid toward the viewer and skewed -30 deg
// (down-left, the side the baked SW cliff wedges fall to), alpha 0.32; cached per sheet and baked into the static shadow tiles
// below (0 live draws a frame). Phones keep the ellipse.
const TREE_SHADOW = new Map(), TS_K = Math.tan(Math.PI / 6), TS_SY = 0.4;
function treeShadowOf(img, ax, ay, flip) {
  const key = flip ? 'f' : 'n'; let m = TREE_SHADOW.get(img); if (!m) TREE_SHADOW.set(img, m = {});
  if (m[key]) return m[key];
  const src = silhouette(flip ? flipH(img) : img, '#140828'), W = img.width, H = img.height, a = flip ? W - ax : ax;
  const OX = Math.ceil(a + TS_K * TS_SY * ay) + 1, OY = 1, { c, x } = makeCanvas(W + TS_K * TS_SY * H + 3, TS_SY * H + 3);
  x.imageSmoothingEnabled = false;
  x.setTransform(1, 0, TS_K * TS_SY, -TS_SY, OX - a - TS_K * TS_SY * ay, OY + TS_SY * ay);
  x.drawImage(src, 0, 0); x.setTransform(1, 0, 0, 1, 0, 0);
  crisp(c, 60);
  return (m[key] = { c, ox: OX, oy: OY });
}
// ===== static prop shadows, pre-rendered (§26.4 step 5) =================================================================
// Every prop with a `shadow` radius used to cost one ellipse fill a frame (~150 in the Vale view, ~6 us each in the software
// rasteriser). They never move, so they are rastered once into 256 px world-screen tiles (the same ellipse at the same whole-pixel
// centre, the same colour: source-over of one colour composes the same in one layer as one by one) and each visible tile is
// one blit. A tile rebuilds when one of its props turns `gone` (an opened gate); LRU-capped at SHADOW_MAX tiles.
const SHADOW_T = 256, SHADOW_MAX = 24, SHADOW_COL = 'rgba(20,8,40,0.32)';
function shadowTiles(m) {
  let S = m._shadowT;
  if (S && S.ref === m.objects && S.len === m.objects.length) return S;
  const tiles = new Map();
  for (const o of m.objects) if (o.shadow) {
    const sx = Math.round(isoX(o.x, o.y)), sy = Math.round(isoY(o.x, o.y, o.z)), ts = o.tree && !PHONE ? treeShadowOf(o.img, o.ax, o.ay, o.flip) : null;
    const x0 = ts ? sx - ts.ox : sx - o.shadow - 1, x1 = ts ? x0 + ts.c.width : sx + o.shadow + 1, y0 = ts ? sy - ts.oy : sy - o.shadow * 0.45 - 1, y1 = ts ? y0 + ts.c.height : sy + o.shadow * 0.45 + 1;
    for (let ty = Math.floor(y0 / SHADOW_T); ty <= Math.floor(y1 / SHADOW_T); ty++) for (let tx = Math.floor(x0 / SHADOW_T); tx <= Math.floor(x1 / SHADOW_T); tx++) {
      const k = tx + ',' + ty; let L = tiles.get(k); if (!L) tiles.set(k, L = { tx, ty, list: [] }); L.list.push({ o, sx, sy, ts });
    }
  }
  return (m._shadowT = { ref: m.objects, len: m.objects.length, tiles, cache: new Map(), frame: 0 });
}
function drawPropShadows(ctx, m) {
  const S = shadowTiles(m), x0 = camX - RW / 2, y0 = camY - RH / 2; S.frame++;
  for (let ty = Math.floor(y0 / SHADOW_T); ty <= Math.floor((y0 + RH - 1) / SHADOW_T); ty++) for (let tx = Math.floor(x0 / SHADOW_T); tx <= Math.floor((x0 + RW - 1) / SHADOW_T); tx++) {
    const k = tx + ',' + ty, L = S.tiles.get(k); if (!L) continue;
    let gone = 0; for (const e of L.list) if (e.o.gone) gone++;
    let c = S.cache.get(k);
    if (!c || c.gone !== gone) {
      if (!c) {
        if (S.cache.size >= SHADOW_MAX) { let old = null; for (const [kk, v] of S.cache) if (!old || v.last < old[1].last) old = [kk, v]; S.cache.delete(old[0]); c = old[1]; c.x.clearRect(0, 0, SHADOW_T, SHADOW_T); }
        else c = makeCanvas(SHADOW_T, SHADOW_T);
        S.cache.set(k, c);
      } else c.x.clearRect(0, 0, SHADOW_T, SHADOW_T);
      c.gone = gone; c.x.fillStyle = SHADOW_COL;
      for (const e of L.list) if (!e.o.gone) {
        if (e.ts) { c.x.globalAlpha = 0.32; c.x.drawImage(e.ts.c, e.sx - e.ts.ox - tx * SHADOW_T, e.sy - e.ts.oy - ty * SHADOW_T); c.x.globalAlpha = 1; continue; }
        c.x.beginPath(); c.x.ellipse(e.sx - tx * SHADOW_T, e.sy - ty * SHADOW_T, e.o.shadow, e.o.shadow * 0.45, 0, 0, Math.PI * 2); c.x.fill();
      }
    }
    c.last = S.frame;
    ctx.drawImage(c.c, tx * SHADOW_T - x0, ty * SHADOW_T - y0);
  }
}

// perf: the moon disc was ~(2r+1)^2 fillRects + value-noise calls EVERY frame (~10 % of a play frame headless); it is
// now rastered once per (radius, colour) into a canvas and blitted (same pixels: x, y snap to whole pixels as before)
const MOON_CACHE = new Map();
// 140 twinkling stars were ~160 fillRects a frame, each with a new rgba() string. Now the twinkle alpha snaps to STAR_LV levels
// (1/32 steps on a 1 px dot) and each level is one path of rects + one fill, from a fixed string table: <= 2 x STAR_LV fills.
const STAR_LV = 32, STAR_FILL = [0, 1].map(k => Array.from({ length: STAR_LV + 1 }, (_, i) => k ? `rgba(255,230,250,${(i / STAR_LV) * 0.45})` : `rgba(255,248,255,${(i / STAR_LV) * 0.9})`));
let STAR_LVL = null;
function drawStars(ctx, stars, pxs, pys) {
  const n = stars.length; if (!STAR_LVL || STAR_LVL.length < n) STAR_LVL = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const s = stars[i]; STAR_LVL[i] = Math.round((0.35 + 0.65 * Math.max(0, Math.sin(G.t * s.s * 2 + s.p))) * STAR_LV); }
  for (let lv = 0; lv <= STAR_LV; lv++) {
    let any = false, big = false;
    for (let i = 0; i < n; i++) if (STAR_LVL[i] === lv) { if (!any) { ctx.beginPath(); any = true; } const s = stars[i]; ctx.rect(Math.round(s.x + pxs), Math.round(s.y + pys), 1, 1); if (s.big) big = true; }
    if (!any) continue;
    ctx.fillStyle = STAR_FILL[0][lv]; ctx.fill();
    // a big star's cross: the arms in two fills (they overlap on the centre pixel, which the old two fillRects blended twice)
    if (big) for (let arm = 0; arm < 2; arm++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) if (STAR_LVL[i] === lv && stars[i].big) { const s = stars[i], x = Math.round(s.x + pxs), y = Math.round(s.y + pys); if (arm) ctx.rect(x, y - 1, 1, 3); else ctx.rect(x - 1, y, 3, 1); }
      ctx.fillStyle = STAR_FILL[1][lv]; ctx.fill();
    }
  }
}
// the moon / sun halo: a radial gradient rastered once per theme moon (it was a new gradient + an 8r x 8r gradient fill each frame)
function moonGlow(mo) {
  const k = 'glow|' + mo.r + '|' + mo.glow;
  let c = MOON_CACHE.get(k);
  if (!c) {
    const S = Math.ceil(mo.r * 8), v = makeCanvas(S, S), g = v.x.createRadialGradient(mo.r * 4, mo.r * 4, mo.r * 0.6, mo.r * 4, mo.r * 4, mo.r * 3.2);
    g.addColorStop(0, rgba(mo.glow, 0.45)); g.addColorStop(1, rgba(mo.glow, 0));
    v.x.fillStyle = g; v.x.fillRect(0, 0, S, S); MOON_CACHE.set(k, c = v.c);
  }
  return c;
}
function drawMoon(ctx, x, y, r, col) {
  const R = Math.round(r), k = R + '|' + col;
  let mc = MOON_CACHE.get(k);
  if (!mc) {
    const c = hexToRgb(col), cv = makeCanvas(2 * R + 1, 2 * R + 1);
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
      const d = (xx * xx + yy * yy) / (r * r);
      if (d > 1) continue;
      const n = vnoise((xx + 50) * 0.18, (yy + 50) * 0.18, 99);
      const sh = 1 - Math.max(0, (xx + yy) / (r * 2.4)) * 0.35 - (n > 0.62 ? 0.12 : 0);
      cv.x.fillStyle = `rgb(${c[0] * sh | 0},${c[1] * sh | 0},${c[2] * sh | 0})`;
      cv.x.fillRect(xx + R, yy + R, 1, 1);
    }
    MOON_CACHE.set(k, mc = cv.c);
  }
  ctx.drawImage(mc, Math.round(x) - R, Math.round(y) - R);
}

// perf (§26.4 step 5): a fall was 16 x len/2 fillRects a frame, each with a new rgba() string (an edge fall: ~1600). The flow
// pattern repeats every 16 px of travel (90 px/s), so each fall is rastered once per whole-pixel flow phase (FALL_PH frames,
// the same colours, alphas and the same whole-pixel rows as the old per-rect loop, with the slant baked in) and blitted. An edge
// fall's sway (a per-row offset that drifts with G.t) is applied by blitting its frame in 2-row slices (the old rects were 2 rows
// tall every 2 rows), each shifted by the sway of its row: ~len/2 blits instead of ~8 x len rects (<= 1 px from the old sway). Caches: per fall, at most FALL_MAX falls (oldest dropped).
const FALL_PH = 16, FALL_BAND = 2, FALL_MAX = 48, FALL_CACHE = new Map();
function fallFrame(f, edge, ph) {
  let C = FALL_CACHE.get(f);
  if (!C) {
    if (FALL_CACHE.size >= FALL_MAX) FALL_CACHE.delete(FALL_CACHE.keys().next().value);
    FALL_CACHE.set(f, C = { frames: [], h: Math.ceil(f.len) + 10 });
  }
  let c = C.frames[ph];
  if (!c) {
    const W = G.map.theme.water, v = makeCanvas(16, C.h), fy = f.y0 - Math.floor(f.y0);   // the rows keep f.y0's fraction
    for (let px = 0; px < 16; px++) {
      const seed = hash2(px, f.x0, 5), oy = Math.round(fy + px * 0.5);
      for (let y = 0; y < f.len; y += 2) {
        const k = y / f.len, flow = (y - ph + seed * 60) % 16;
        const col = W[clamp(Math.floor(4 + (flow < 0 ? flow + 16 : flow) / 16 * 2 + (px % 3 === 0 ? 1 : 0)), 0, W.length - 1)];
        v.x.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${edge ? (1 - k) * 0.9 : 0.95})`;
        v.x.fillRect(px, oy + y, 1, 2);
      }
    }
    c = C.frames[ph] = v.c;
  }
  return c;
}
function drawFall(ctx, f, edge) {
  const [vx, vy] = sToView(f.x0, f.y0);
  if (vx > RW + 2 || vx + 16 < -2) return;
  const ph = ((Math.floor(G.t * 90) % FALL_PH) + FALL_PH) % FALL_PH, img = fallFrame(f, edge, ph), x = Math.round(vx), y0 = Math.floor(vy);
  if (!edge) { if (y0 + img.height >= 0 && y0 < RH) ctx.drawImage(img, x, y0); }
  else {
    // each slice is stretched (nearest) to reach the next slice's top, so a sway step never opens a 1 px gap across the fall
    const swayAt = r => { const ym = Math.min(f.len, r); return Math.round(Math.sin(ym * 0.05 + G.t) * (ym / f.len) * 3); };
    let dy = y0 + swayAt(0);
    for (let r = 0; r < f.len + 8; r += FALL_BAND) {
      const ny = y0 + r + FALL_BAND + swayAt(r + FALL_BAND), h = ny - dy;
      if (h > 0 && dy + h > 0 && dy < RH) ctx.drawImage(img, 0, r, 16, FALL_BAND, x, dy, 16, h);
      dy = Math.max(dy, ny);
    }
  }
  if (!edge) { // foam at base
    const [bx, by] = sToView(f.x0 + 8, f.y0 + 4 + f.len);
    for (let k = 0; k < 10; k++) { ctx.fillStyle = 'rgba(240,252,255,0.8)'; ctx.fillRect(Math.round(bx - 9 + k * 2 + Math.sin(G.t * 9 + k) * 1.5), Math.round(by - 1 + Math.sin(G.t * 7 + k * 2)), 2, 1); }
  }
}

// water glints: ~100 in a lake view, each was a new rgba() string + its own fillRect. The glint alpha now snaps to GLINT_LV levels
// (a 3 x 1 px sparkle, 0.025 alpha steps) and each level is one path of rects + one fill: no per-frame strings, ~20 fills.
const GLINT_LV = 32, GLINT_FILL = Array.from({ length: GLINT_LV + 1 }, (_, i) => `rgba(230,250,255,${(i / GLINT_LV) * 0.8})`);
const GLINT_BUF = { q: [], lv: new Uint8Array(256), xy: new Int16Array(512) };
function drawWater(ctx, m, x0, y0, x1, y1) {
  const B = GLINT_BUF; B.q.length = 0;
  const q = gridQuery(m, 'water', x0, y0, x1, y1, B.q), n = q.length;
  if (B.lv.length < n) { B.lv = new Uint8Array(n * 2); B.xy = new Int16Array(n * 4); }
  for (let i = 0; i < n; i++) {
    const s = q[i], fy = (s.b + G.t * 0.35) % 1, [vx, vy] = worldToView(s.i + s.a, s.j + fy, 0);
    if (vx < -4 || vx > RW + 4 || vy < -4 || vy > RH + 4) { B.lv[i] = 0; continue; }
    B.lv[i] = Math.round(Math.sin(fy * Math.PI) * GLINT_LV); B.xy[i * 2] = Math.round(vx); B.xy[i * 2 + 1] = Math.round(vy);
  }
  for (let lv = 1; lv <= GLINT_LV; lv++) {
    let any = false;
    for (let i = 0; i < n; i++) if (B.lv[i] === lv) { if (!any) { ctx.beginPath(); any = true; } ctx.rect(B.xy[i * 2], B.xy[i * 2 + 1], 3, 1); }
    if (any) { ctx.fillStyle = GLINT_FILL[lv]; ctx.fill(); }
  }
}

function drawSigil(ctx, m, lights) {
  const [vx, vy] = worldToView(m.cx, m.cy, 0);
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.35 + 0.25 * Math.sin(G.t * 2) + (G.boss && !G.boss.dead ? 0.3 : 0);
  ctx.strokeStyle = `rgba(182,140,255,${pulse})`; ctx.lineWidth = 1;
  for (const R of [1.2, 2.1, 2.8]) { ctx.beginPath(); ctx.ellipse(vx, vy, R * 22.6, R * 11.3, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (let k = 0; k < 6; k++) {
    const a = G.t * 0.3 + k * Math.PI / 3, [ax, ay] = worldToView(m.cx + Math.cos(a) * 2.45, m.cy + Math.sin(a) * 2.45, 0);
    ctx.fillStyle = `rgba(220,190,255,${pulse + 0.3})`; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
  }
  ctx.globalCompositeOperation = 'source-over';
  lights.push({ sx: isoX(m.cx, m.cy), sy: isoY(m.cx, m.cy), r: 90, col: '#9b6ee8', a: pulse, bloom: 1 });
}

function projRing(ctx, x, y, z, r, a0 = 0, a1 = Math.PI * 2, steps = 40) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * i / steps, [vx, vy] = worldToView(x + Math.cos(a) * r, y + Math.sin(a) * r, z);
    i ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
  }
}

function drawZone(ctx, z) {
  const k = z.t / z.life, fade = Math.min(1, (z.life - z.t) * 3);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(z.col, 0.7 * fade); ctx.lineWidth = 1;
  projRing(ctx, z.x, z.y, 0, z.r); ctx.stroke();
  ctx.fillStyle = rgba(z.col, 0.12 * fade); projRing(ctx, z.x, z.y, 0, z.r); ctx.fill();
  if (z.kind === 'well') for (let s = 0; s < 3; s++) { ctx.strokeStyle = rgba(z.col, 0.5 * fade); projRing(ctx, z.x, z.y, 0, z.r * (1 - ((G.t * 0.8 + s / 3) % 1)), G.t * 3 + s, G.t * 3 + s + 3.5, 20); ctx.stroke(); }
  if (z.kind === 'trap') { const [vx, vy] = worldToView(z.x, z.y, 0); ctx.fillStyle = rgba('#d6ffd8', 0.8); for (let i = -2; i <= 2; i++) ctx.fillRect(Math.round(vx + i * 3), Math.round(vy - 2 - (i % 2 ? 1 : 0)), 1, 3); }
  ctx.globalCompositeOperation = 'source-over';
}

// ===== ground aim indicators (docs/design/hud-ui.md "Touch v2" > Aiming) ==============================================
// Anti-confusion rule: the PLAYER's indicators (AIM_STYLE) are thin, dashed, low-alpha and cool-toned and never animate
// their fill (only the range dashes move, 1 px / 100 ms); ENEMY telegraphs (TELE_STYLE) are thick, solid, hot and
// high-alpha with a filling countdown. If an enemy telegraph covers the reticle, the player's fill drops to 10 %.
// drawAimIndicator(aim, from, to, o) draws one indicator in scene space: aim = SKILLS[id].aim { shape, range, r, arc,
// len, w }, from = the hero, to = the (clamped) world target, o = { col, clamped, cancel, flash }. Sources (currentAim):
// touch.js TOUCH_AIM while a skill is drag-aimed, else input.js IN.aimHold (desktop / pad hold-to-aim). Caches: the
// dashed range ellipse per (range, colour, dash phase) and the reticle per (r, colour); cone / line / projectile
// shapes are 4-20 point paths drawn directly (cheaper than sprites at this size).
const AIM_STYLE = { range: 0.85, dash: [4, 3], fill: 0.25, fillCovered: 0.1, edge: 0.8, lw: 1, cool: '#9fe8ff', coolMix: 0.35, disc: 0.22, top: 0.35, chevron: 12 };
const TELE_STYLE = { fill: 0.2, edge: 0.95, lw: 2, count: 0.34 };
const AIMV = { lastShown: -9, cache: new Map() };
const isoAxes = R => [16 * Math.SQRT2 * R, 8 * Math.SQRT2 * R];   // a world circle of radius R on screen
function aimCol(c) { return mixHex(c || '#ffffff', AIM_STYLE.cool, AIM_STYLE.coolMix); }
function aimRangeSprite(R, col, phase) {
  const key = 'r|' + R + '|' + col + '|' + phase; let c = AIMV.cache.get(key);
  if (!c) {
    const [ax, ay] = isoAxes(R), m = makeCanvas(Math.ceil(ax * 2) + 6, Math.ceil(ay * 2) + 6), x = m.x, cx = m.c.width / 2, cy = m.c.height / 2;
    x.strokeStyle = rgba(col, 0.38); x.lineWidth = 3; x.beginPath(); x.ellipse(cx, cy, ax, ay, 0, 0, Math.PI * 2); x.stroke();   // soft glow
    x.setLineDash(AIM_STYLE.dash); x.lineDashOffset = -phase; x.lineWidth = 1;
    x.strokeStyle = 'rgba(11,7,22,0.55)'; x.beginPath(); x.ellipse(cx, cy + 1, ax, ay, 0, 0, Math.PI * 2); x.stroke();   // 1 px dark under-stroke: reads on bright grass
    x.strokeStyle = rgba(col, 1); x.beginPath(); x.ellipse(cx, cy, ax, ay, 0, 0, Math.PI * 2); x.stroke();
    c = m.c; AIMV.cache.set(key, c);
    if (AIMV.cache.size > 80) AIMV.cache.delete(AIMV.cache.keys().next().value);
  }
  return c;
}
function aimReticleSprite(r, col, clamped) {
  const key = 't|' + r + '|' + col + '|' + (clamped ? 1 : 0); let c = AIMV.cache.get(key);
  if (!c) {
    const [ax, ay] = isoAxes(r), m = makeCanvas(Math.ceil(ax * 2) + 8, Math.ceil(ay * 2) + 8), x = m.x, cx = m.c.width / 2, cy = m.c.height / 2;
    x.fillStyle = rgba(col, AIM_STYLE.disc); x.beginPath(); x.ellipse(cx, cy, ax, ay, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(11,7,22,0.5)'; x.lineWidth = 1; x.beginPath(); x.ellipse(cx, cy + 1, ax, ay, 0, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = rgba(col, AIM_STYLE.edge); x.beginPath(); x.ellipse(cx, cy, ax, ay, 0, 0, Math.PI * 2); x.stroke();
    x.fillStyle = rgba(col, 0.9); for (const [dx, dy] of [[ax, 0], [-ax, 0], [0, ay], [0, -ay]]) x.fillRect(Math.round(cx + dx * 0.82 - 1), Math.round(cy + dy * 0.82), 3, 1);   // 4 ticks
    x.fillStyle = clamped ? '#ffffff' : rgba(col, 1); x.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2);
    c = m.c; AIMV.cache.set(key, c);
  }
  return c;
}
// the live indicator: touch drag first, else the desktop / pad hold (input.js), honouring the groundIndicators setting
function currentAim() {
  const p = G.player; if (!p || p.dead || G.state !== 'play' || G.ui.open) return null;
  if (typeof TOUCH_AIM !== 'undefined' && TOUCH_AIM) {
    if (typeof SETTINGS !== 'undefined' && SETTINGS.groundIndicators === 'off' && !G.touch) return null;
    const s = SKILLS[TOUCH_AIM.skill];
    return Object.assign({}, TOUCH_AIM, { from: { x: p.x, y: p.y }, col: s && s.color });
  }
  const H = typeof IN !== 'undefined' && IN.aimHold;
  if ((!H || !H.show) && typeof HUD !== 'undefined' && HUD.hoverSlot && HUD.hoverSlot !== 'pot' && HUD.hoverSlot !== 'lmb') {   // kbm: hovering a skill slot
    const id = slotSkill(p, HUD.hoverSlot), s = id && SKILLS[id], aim = s && (typeof skillAimOf === 'function' ? skillAimOf(id, HUD.hoverSlot) : s.aim);
    if (aim && aim.shape !== 'self') { const R = aim.range || aim.len || 6, spr = aimRangeSprite(R, aimCol(s.color), 0), [hx, hy] = worldToView(p.x, p.y, p.z); sctx.globalAlpha = 0.3; sctx.drawImage(spr, Math.round(hx - spr.width / 2), Math.round(hy - spr.height / 2)); sctx.globalAlpha = 1; }
    return null;
  }
  if (!H || !H.show) return null;
  const id = slotSkill(p, H.slot), s = id && SKILLS[id]; if (!s) return null;
  const aim = typeof skillAimOf === 'function' ? skillAimOf(id, H.slot) : s.aim; if (!aim) return null;
  const R = aim.range || aim.len || 6, dx = G.mouse.wx - p.x, dy = G.mouse.wy - p.y, d = Math.hypot(dx, dy) || 1, k = aim.shape === 'circle' ? Math.min(d, R) : R;
  return { skill: id, slot: H.slot, aim, from: { x: p.x, y: p.y }, to: { x: p.x + dx / d * k, y: p.y + dy / d * k }, clamped: aim.shape === 'circle' && d > R, col: s.color };
}
// is a world point inside a live enemy telegraph? (the reticle's fill then drops to 10 %)
function teleCovers(x, y) {
  for (const f of G.effects) {
    if (f.type !== 'tele') continue;
    if (f.kind === 'circle' && dist(x, y, f.x, f.y) < f.r) return true;
    if (f.kind === 'cone' && dist(x, y, f.x, f.y) < f.r && Math.abs(angDiff(f.ang, Math.atan2(y - f.y, x - f.x))) < f.arc / 2) return true;
    if (f.kind === 'line' && segDist(x, y, f.x, f.y, f.x + Math.cos(f.ang) * f.len, f.y + Math.sin(f.ang) * f.len) < f.w) return true;
  }
  return false;
}
function drawAimIndicator(aim, from, to, o = {}) {
  const ctx = sctx, A = AIM_STYLE, p = G.player, z = p ? p.z : 0, col = aimCol(o.col), sh = aim.shape;
  const ang = Math.atan2(to.y - from.y, to.x - from.x) || (p ? p.aim : 0), R = aim.range || aim.len || 6;
  const wv = (x, y) => worldToView(x, y, z);
  const covered = teleCovers(sh === 'circle' ? to.x : from.x + Math.cos(ang) * R * 0.6, sh === 'circle' ? to.y : from.y + Math.sin(ang) * R * 0.6);
  const fillA = (covered ? A.fillCovered : A.fill) * (o.cancel ? 0.4 : 1), edgeA = A.edge * (o.cancel ? 0.4 : 1);
  if (!o.flash) AIMV.lastShown = G.t;
  ctx.save(); if (o.flash) ctx.globalAlpha = 0.9;
  // range circle (iso ellipse, dashed, centred on the HERO): not for self skills or a quick-cast flash
  if (sh !== 'self' && !o.flash) {
    const phase = Math.floor(performance.now() / 100) % 7, spr = aimRangeSprite(R, col, phase), [hx, hy] = wv(from.x, from.y);
    ctx.globalAlpha = A.range * (o.cancel ? 0.4 : 1); ctx.drawImage(spr, Math.round(hx - spr.width / 2), Math.round(hy - spr.height / 2)); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = rgba(col, fillA); ctx.strokeStyle = rgba(col, edgeA); ctx.lineWidth = A.lw;
  const poly = pts => { ctx.beginPath(); pts.forEach((q, i) => { const [x, y] = wv(q[0], q[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); };
  const c = Math.cos(ang), sn = Math.sin(ang);
  if (sh === 'cone') {
    const arc = aim.arc || 1.6, pts = [[from.x, from.y]];
    for (let i = 0; i <= 16; i++) { const a = ang - arc / 2 + arc * i / 16; pts.push([from.x + Math.cos(a) * R, from.y + Math.sin(a) * R]); }
    poly(pts);
  } else if (sh === 'line' || sh === 'dash') {
    const w = (aim.w || 0.8) / 2, L = aim.len || R, hl = Math.min(0.8, L * 0.2), nx = -sn * w, ny = c * w;
    poly([[from.x + nx, from.y + ny], [from.x + nx + c * (L - hl), from.y + ny + sn * (L - hl)], [from.x + c * L, from.y + sn * L], [from.x - nx + c * (L - hl), from.y - ny + sn * (L - hl)], [from.x - nx, from.y - ny]]);
    if (sh === 'dash' && p && p.spr && !o.flash) { const spr = currentPlayerSprite(p), [gx, gy] = wv(from.x + c * L, from.y + sn * L); ctx.globalAlpha = 0.35; ctx.drawImage(silOf(spr, col), Math.round(gx - spr.width / 2), Math.round(gy - spr.height + 1)); ctx.globalAlpha = 1; }
  } else if (sh === 'proj') {
    const w = (aim.w || 0.4) / 2, nx = -sn * w, ny = c * w, [ax, ay] = wv(from.x, from.y), [bx, by] = wv(from.x + c * R, from.y + sn * R);
    ctx.beginPath(); for (const k of [-1, 1]) { const [x0, y0] = wv(from.x + nx * k, from.y + ny * k), [x1, y1] = wv(from.x + nx * k + c * R, from.y + ny * k + sn * R); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } ctx.stroke();
    const L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L;
    ctx.beginPath(); for (let t = A.chevron; t < L; t += A.chevron) { const x = ax + ux * t, y = ay + uy * t; ctx.moveTo(x - ux * 3 - uy * 3, y - uy * 3 + ux * 3); ctx.lineTo(x, y); ctx.lineTo(x - ux * 3 + uy * 3, y - uy * 3 - ux * 3); } ctx.stroke();
  } else if (sh === 'circle') {
    const spr = aimReticleSprite(aim.r || 2, col, o.clamped), [tx, ty] = wv(to.x, to.y);
    ctx.globalAlpha *= covered ? 0.45 : 1; ctx.drawImage(spr, Math.round(tx - spr.width / 2), Math.round(ty - spr.height / 2)); ctx.globalAlpha = o.flash ? 0.9 : 1;
    if (!o.flash) { const [hx, hy] = wv(from.x, from.y); ctx.strokeStyle = rgba(col, 0.35); ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
  } else if (sh === 'self') {
    const r = (aim.r || 1.2) * (1 + 0.04 * Math.sin(G.t * 4));   // a breathing ring
    projRing(ctx, from.x, from.y, z, r); ctx.stroke();
  }
  ctx.restore();
}
function drawAimReticleTop(a) {
  if (!a || a.aim.shape !== 'circle') return;
  const spr = aimReticleSprite(a.aim.r || 2, aimCol(a.col), a.clamped), [tx, ty] = worldToView(a.to.x, a.to.y, G.player.z);
  sctx.globalAlpha = AIM_STYLE.top * (a.cancel ? 0.4 : 1); sctx.drawImage(spr, Math.round(tx - spr.width / 2), Math.round(ty - spr.height / 2)); sctx.globalAlpha = 1;
}
// 1-frame quick-cast flash (game.js useSkill): the skill's shape at its target, no range circle
function aimFlash(id, slot) {
  const p = G.player, s = SKILLS[id]; if (!s || !p) return;
  const aim = typeof skillAimOf === 'function' ? skillAimOf(id, slot) : s.aim; if (!aim || aim.shape === 'self') return;
  if (G.t - AIMV.lastShown < 0.1) return;   // an aimed cast already showed its indicator
  const R = aim.range || aim.len || 6, dx = G.mouse.wx - p.x, dy = G.mouse.wy - p.y, d = Math.hypot(dx, dy) || 1, k = aim.shape === 'circle' ? Math.min(d, R) : R;
  fx({ type: 'aimflash', aim, from: { x: p.x, y: p.y }, to: { x: p.x + dx / d * k, y: p.y + dy / d * k }, col: s.color, life: 1 / 30 });
}

function drawDecal(ctx, e) {
  const k = clamp(e.t / e.life, 0, 1);
  if (e.type === 'tele') {
    const T = TELE_STYLE;
    ctx.fillStyle = rgba(e.col, T.fill); ctx.strokeStyle = rgba(e.col, T.edge); ctx.lineWidth = T.lw;
    const shape = (s) => {
      if (e.kind === 'circle') projRing(ctx, e.x, e.y, 0, e.r * s);
      else if (e.kind === 'cone') { ctx.beginPath(); const [cx, cy] = worldToView(e.x, e.y, 0); ctx.moveTo(cx, cy); const n = 20; for (let i = 0; i <= n; i++) { const a = e.ang - e.arc / 2 + e.arc * i / n, [vx, vy] = worldToView(e.x + Math.cos(a) * e.r * s, e.y + Math.sin(a) * e.r * s, 0); ctx.lineTo(vx, vy); } ctx.closePath(); }
      else if (e.kind === 'line') {
        const c = Math.cos(e.ang), sn = Math.sin(e.ang), nx = -sn * e.w, ny = c * e.w, L = e.len * s;
        const pts = [[e.x + nx, e.y + ny], [e.x + nx + c * L, e.y + ny + sn * L], [e.x - nx + c * L, e.y - ny + sn * L], [e.x - nx, e.y - ny]].map(([x, y]) => worldToView(x, y, 0));
        ctx.beginPath(); pts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath();
      }
    };
    shape(1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(e.col, T.count); shape(k); ctx.fill();   // the filling countdown
  } else if (e.type === 'marker') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(e.col, 0.8); ctx.fillStyle = rgba(e.col, 0.1 + k * 0.15); ctx.lineWidth = 1;
    projRing(ctx, e.x, e.y, 0, e.r); ctx.fill(); ctx.stroke();
    projRing(ctx, e.x, e.y, 0, e.r * (1 - k)); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else if (e.type === 'line') {
    ctx.strokeStyle = rgba(e.col, 0.6);
    const [ax, ay] = worldToView(e.x, e.y, 0), [bx, by] = worldToView(e.x + Math.cos(e.ang) * e.len, e.y + Math.sin(e.ang) * e.len, 0);
    ctx.lineWidth = 1 + k * 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  } else if (e.type === 'summon') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(e.col, 0.9 * (1 - k * 0.5)); ctx.lineWidth = 1;
    projRing(ctx, e.x, e.y, 0, e.r * (0.4 + k * 0.6)); ctx.stroke();
    projRing(ctx, e.x, e.y, 0, e.r * (1 - k) * 0.8, G.t * 4, G.t * 4 + 4); ctx.stroke();
    if (Math.random() < 0.5) addPart({ x: e.x + frand(-e.r, e.r) * 0.6, y: e.y + frand(-e.r, e.r) * 0.6, z: 0, vx: 0, vy: 0, vz: frand(2, 4), life: 0.5, t: 0, col: e.col, grav: 0, size: 1, glow: true });
    ctx.globalCompositeOperation = 'source-over';
  }
}

// the bloom whitelist (docs/design/lighting-status-fx.md "Bloom"): only lights with a `bloom` weight feed the glow buffer. Spells,
// projectiles, lanterns / torches / braziers / sigils / portals 1.0, the hero's gear (weapon flash, staff tip, rarity light) and
// loot beams 0.6, statuses and buff auras 0.4. Untagged lights (the hero's ambient lamp, fireflies, Pip, the Echo, enemy eyes
// and glows) light the scene but never bloom. bloomTag(lights, n0, w) tags the lights pushed since n0 that have no weight yet.
function bloomTag(lights, n0, w) { for (let i = n0; i < lights.length; i++) if (lights[i].bloom == null) lights[i].bloom = w; }
const ITEM_BLOOM = { proj: 1, orb: 1, portal: 1, drop: 0.6 };
function drawItem(ctx, it, lights) {
  const b = ITEM_BLOOM[it.kind];
  if (b) { const n0 = lights.length; drawItemK(ctx, it, lights); bloomTag(lights, n0, b); return; }
  drawItemK(ctx, it, lights);
}
function drawItemK(ctx, it, lights) {
  const p = G.player;
  if (it.kind === 'echo') { drawEcho(ctx, G.echo, lights); return; }
  if (it.kind === 'column') { if (it._cut === CHUNK.frame) drawCutaway(ctx, it); else ctx.drawImage(it.img, Math.round(it.sx - camX + RW / 2), Math.round(it.sy - camY + RH / 2)); return; }
  if (it.kind === 'sprite') {
    if (it.gone) return;   // an opened gate / keydoor / hidden wall (maps.js openGate)
    const [vx, vy] = worldToView(it.x, it.y, it.z);
    if (it.fish) { drawFishSpot(ctx, it, vx, vy, lights); return; }
    let img = it.img; WP_DX = 0; WP_HEAD = 0;
    if (!it.tree) img = windProp(it, img);   // grass / bush / lantern: wind frames + draw offsets (WP_DX / WP_HEAD)
    else if (it.tree && img.swayF) img = it._split ? img.trunk : img.swayW[(it._fr | 0) + 2] || treeFrame(img, it._fr | 0, 1);   // §29 G2: trunk only while the canopy is split off
    if (it.beam) { drawSunbeam(ctx, vx, vy, it); return; }
    // mirrored: the cached flipped canvas at the mirrored spot (the same pixels as the old save / scale(-1, 1) / restore, ~3x cheaper a call)
    if (it.flip !== !!it.pulled) ctx.drawImage(flipOf(img), Math.round(vx) + Math.round(it.ax) - img.width + (WP_HEAD ? 0 : WP_DX), Math.round(vy - it.ay));
    else if (WP_HEAD && WP_DX) { const px = Math.round(vx - it.ax), py = Math.round(vy - it.ay); ctx.drawImage(img, 0, 0, img.width, WP_HEAD, px + WP_DX, py, img.width, WP_HEAD); ctx.drawImage(img, 0, WP_HEAD, img.width, img.height - WP_HEAD, px, py + WP_HEAD, img.width, img.height - WP_HEAD); }   // a lantern's head swings, its post stays
    else ctx.drawImage(img, Math.round(vx - it.ax) + WP_DX, Math.round(vy - it.ay));
    if (it.brazier) drawFlame(ctx, vx, vy - 9, '#c77bff', '#ffd6ff');
    if (it.checkpoint && G.checkpoint && G.checkpoint.map === G.map.id && dist(G.checkpoint.x, G.checkpoint.y, it.x, it.y) < 2.5) {
      glowDot(ctx, vx, vy - 22 + Math.sin(G.t * 3) * 1.5, '#9ef0ff', '#ffffff', 2);
      if (Math.random() < 0.15) addPart({ x: it.x + frand(-0.3, 0.3), y: it.y + frand(-0.3, 0.3), z: it.z + 1, vx: 0, vy: 0, vz: 1.2, life: 1, t: 0, col: '#9ef0ff', grav: 0, size: 1, glow: true });
    }
    return;
  }
  if (it.kind === 'canopy') {   // §29 G2: the canopy over the hero (key = trunk + 0.5), at its fade alpha
    const o = it.o, img = o.img.canopyW[(o._fr | 0) + 2] || treeFrame(o.img, o._fr | 0, 0), [vx, vy] = worldToView(o.x, o.y, o.z);
    ctx.globalAlpha = o._fade;
    if (o.flip !== !!o.pulled) ctx.drawImage(flipOf(img), Math.round(vx) + Math.round(o.ax) - img.width, Math.round(vy - o.ay));
    else ctx.drawImage(img, Math.round(vx - o.ax), Math.round(vy - o.ay));
    ctx.globalAlpha = 1; return;
  }
  if (it.kind === 'portal') { drawPortal(ctx, it, lights); return; }
  if (it.kind === 'fall') { drawFall(ctx, it.f, false); return; }
  if (it.kind === 'player') { drawPlayer(ctx, p, lights); return; }
  if (it.kind === 'enemy') { drawEnemy(ctx, it.e, lights); return; }
  if (it.kind === 'critter') { drawCritter(ctx, it.c); return; }
  if (it.kind === 'proj') { drawProj(ctx, it.pr, lights); return; }
  if (it.kind === 'drop') { drawDrop(ctx, it.d, lights); return; }
  if (it.kind === 'orb') {
    const [vx, vy] = worldToView(it.x, it.y, it.z);
    glowDot(ctx, vx, vy, '#e2c8ff', '#ffffff', 2);
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 26, col: '#c79bff', a: 0.8 });
    return;
  }
  if (it.kind === 'corpse') { drawCorpse(ctx, it); return; }
  if (it.kind === 'ghost') {
    const e = it.e, k = e.t / e.life, [vx, vy] = worldToView(e.x, e.y, e.z);
    ctx.globalAlpha = (1 - k) * 0.55; ctx.globalCompositeOperation = 'lighter';
    if (e.sq) {   // a swarm member's squash-pop (game.js spawnCorpse): flattens and widens as it fades
      const sc = e.sc || 1, w = Math.round(e.spr.width * sc * (1 + 0.5 * k)), h = Math.max(1, Math.round(e.spr.height * sc * (1 - 0.6 * k)));
      ctx.globalAlpha = (1 - k) * 0.8; ctx.drawImage(silOf(e.spr, e.col || '#ffffff'), Math.round(vx - w / 2), Math.round(vy - h + 1), w, h);
    } else if (heroGhostFrame(e)) {   // M4a: a hero dodge ghost is the forge frame of that moment, cool-toned (no white-out at the hero)
      const D = e._f; ctx.globalAlpha = (1 - k) * 0.45; ctx.drawImage(silOf(D.img, e.col || '#8ec4ff'), D.sx, D.sy, D.w, D.h, Math.round(vx) - D.ax, Math.round(vy) - D.ay, D.w, D.h);
    } else ctx.drawImage(silOf(e.spr, e.col || '#ffffff'), Math.round(vx - e.spr.width / 2), Math.round(vy - e.spr.height + 1));
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// a ghost made from the old hero sprite (game.js currentPlayerSprite) takes the forge frame drawn when it first shows
function heroGhostFrame(e) {
  if (e._f !== undefined) return e._f;
  const p = G.player, S = p && p.spr, D = p && p._drawn;
  const mine = !!(S && D && D.img && D.ax != null && ['front', 'back', 'frontF', 'backF'].some(k => S[k] && S[k].includes(e.spr)));
  return (e._f = mine ? { img: D.img, sx: D.sx, sy: D.sy, w: D.w, h: D.h, ax: D.ax, ay: D.ay } : null);
}

// ===== corpses (docs/design/combat-feel.md, R1; records: game.js spawnCorpse / updateCorpses) =====================================
// corpseLook(e) -> { img, sc, art, hover } once at the kill: ENEMY_ART enemies play their 3 death frames (art = key);
// legacy / custom sprites keep their hit frame, drawn as a blood-coloured silhouette (sc = their legacy scale).
const CORPSE_PROBE = { face: 1, flash: 1, hitFreeze: 0, state: 'chase', anim: 0, asleep: false };
function corpseLook(e) {
  const def = ENEMY[e.type] || {}, fly = (def.tags || e.tags || []).includes('flying');
  const key = enemyArtKey(e);
  if (key) return { img: ENEMY_ART.get(key, 'hit', 0), sc: 1, art: key, hover: fly ? 8 / ZS : 0 };   // img: the swarm squash-pop ghost
  const look = enemyLook(def, e.type), sc = (def.scale || 1) * LEGACY_ENEMY_K;
  let img = null, hover = 0;
  if (look.img) { img = enemyFrame(look, CORPSE_PROBE); if (def.ai === 'shooter' || fly) hover = 10 / ZS; }
  else if (look.kind === 'slime') img = ART.slime.n;
  else if (look.kind === 'hound') img = ART.hound.n[0];
  else if (look.kind === 'boss') img = ART.boss.n;
  else if (look.kind === 'wisp') hover = 14 / ZS;   // a glow dot, no sprite: its motes are the body
  return { img, sc, art: null, hover };
}
function drawCorpse(ctx, c) {
  const end = c.t >= c.life, k = end ? Math.min(1, (c.t - c.life) / c.fade) : 0;
  const sqk = c.sqT > 0 ? c.sq : 0, sx = 1 + sqk, sy = 1 - sqk * 4 / 3;   // squash 0.3 -> w x1.3, h x0.6
  const [vx, vy] = worldToView(c.x, c.y, c.gz + c.z);
  if (c.art) {
    const info = ENEMY_ART.info[c.art], fr = c.mode === 'boss' ? 0 : Math.min(2, Math.floor(3 * c.t / c.life));
    let img = ENEMY_ART.get(c.art, 'death', fr); if (c.face < 0) img = flipOf(img);
    const ax = c.face < 0 ? img.width - info.ax : info.ax, w = Math.round(img.width * sx), h = Math.round(img.height * sy);
    ctx.globalAlpha = (c.mode === 'boss' && !end ? 1 : 0.7) * (1 - k);
    ctx.drawImage(img, Math.round(vx - ax * sx), Math.round(vy - info.ay * sy), w, h);
  } else if (c.img) {
    let img = c.img; if (c.face < 0) img = flipOf(img);
    const w = Math.round(img.width * c.sc * sx), h = Math.round(img.height * c.sc * sy);
    ctx.globalAlpha = 0.6 * (1 - k);
    ctx.drawImage(silOf(img, c.e.blood || '#c7a8ff'), Math.round(vx - w / 2), Math.round(vy - h + 1), w, h);
  }
  ctx.globalAlpha = 1;
}

// loot on the ground: a light beam whose height, width, alpha and light grow with rarity; the item hops out and bounces
const DROP_FX = [{ h: 12, w: 1, a: 0.28, L: 0 }, { h: 20, w: 1, a: 0.42, L: 18 }, { h: 34, w: 2, a: 0.55, L: 30 }, { h: 52, w: 2, a: 0.7, L: 44 }, { h: 74, w: 3, a: 0.85, L: 60 }, { h: 96, w: 3, a: 1, L: 76 }];
function drawDrop(ctx, d, lights) {
  const R = RARITY[d.rar], F = DROP_FX[R.i], col = rarityCol(d.rar), k = Math.min(1, d.t / 0.45);
  const x = lerp(d.sx, d.x, k), y = lerp(d.sy, d.y, k);
  // arc out, then two small bounces
  const hop = d.t < 0.45 ? Math.sin(k * Math.PI) * 1.6 : d.t < 0.7 ? Math.sin((d.t - 0.45) / 0.25 * Math.PI) * 0.35 : d.t < 0.85 ? Math.sin((d.t - 0.7) / 0.15 * Math.PI) * 0.1 : 0;
  const [vx, vy] = worldToView(x, y, d.z + hop), [gx, gy] = worldToView(x, y, d.z);
  const grow = Math.min(1, Math.max(0, d.t - 0.3) * 2.5), pulse = 0.8 + 0.2 * Math.sin(G.t * 4 + d.x);
  ctx.globalCompositeOperation = 'lighter';
  if (grow > 0) {
    const h = F.h * grow, g = ctx.createLinearGradient(0, gy - h, 0, gy);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.6, rgba(col, F.a * 0.45 * pulse)); g.addColorStop(1, rgba(col, F.a * pulse));
    ctx.fillStyle = g; ctx.fillRect(Math.round(gx - F.w), Math.round(gy - h), F.w * 2 + 1, Math.round(h));
    ctx.fillStyle = rgba(col, F.a * 0.35 * pulse); ctx.beginPath(); ctx.ellipse(Math.round(gx), Math.round(gy), 4 + R.i, 2 + R.i * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const c = d.kind === 'item' ? '#ffffff' : d.kind === 'gem' ? gemParse(d.gem).def.col : '#ff6a8a';
  ctx.fillStyle = '#1a1326'; ctx.fillRect(Math.round(vx) - 2, Math.round(vy) - 4, 5, 5);
  ctx.fillStyle = d.kind === 'item' ? col : c; ctx.fillRect(Math.round(vx) - 1, Math.round(vy) - 3, 3, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(vx) - 1, Math.round(vy) - 3, 1, 1);
  if (F.L) lights.push({ sx: isoX(x, y), sy: isoY(x, y, d.z) - 6, r: F.L * (0.8 + 0.2 * pulse), col, a: 0.5 + R.i * 0.08 });
  if (R.i >= 2 && grow >= 1 && Math.random() < 0.04 * R.i) addPart({ x: x + frand(-0.15, 0.15), y: y + frand(-0.15, 0.15), z: d.z + frand(0.2, F.h / ZS), vx: 0, vy: 0, vz: 0.8, life: 0.8, t: 0, col, grav: 0, size: 1, glow: true });
}
function drawSunbeam(ctx, vx, vy, it) {
  // a soft shaft of dawn light falling onto this spot
  const a = 0.09 + 0.03 * Math.sin(G.t * 0.7 + it.x);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(vx - 90, vy - 220, vx, vy);
  g.addColorStop(0, 'rgba(255,220,170,0)'); g.addColorStop(0.7, `rgba(255,220,170,${a})`); g.addColorStop(1, `rgba(255,236,190,${a * 1.6})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(vx - 110, vy - 240); ctx.lineTo(vx - 80, vy - 240); ctx.lineTo(vx + 14, vy + 4); ctx.lineTo(vx - 18, vy + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,226,170,${a * 0.9})`; ctx.beginPath(); ctx.ellipse(vx, vy, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if (Math.random() < 0.08) addPart({ x: it.x + frand(-0.5, 0.5), y: it.y + frand(-0.5, 0.5), z: frand(0.5, 3), vx: 0.1, vy: 0, vz: 0.1, life: 2, t: 0, col: '#ffe6b0', grav: 0, size: 1, glow: true });
}
function drawCritter(ctx, c) {
  const img = c.face < 0 ? ART.customF[c.type] : ART.custom[c.type];
  if (!img) return;
  const [vx, vy] = worldToView(c.x, c.y, c.z);
  ctx.fillStyle = 'rgba(20,8,40,0.28)'; ctx.beginPath(); ctx.ellipse(Math.round(vx), Math.round(vy), img.width * 0.35, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const lift = c.hop > 0 ? Math.round(Math.sin(c.hop * Math.PI) * (c.type === 'rabbit' ? 5 : 2)) : 0;
  const ear = c.state === 'idle' && Math.sin(G.t * 3 + c.seed) > 0.95 ? 1 : 0;   // a little twitch
  ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height + 1 - lift - ear));
}
function glowDot(ctx, vx, vy, col, core, r) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(col, 0.45); ctx.fillRect(Math.round(vx - r - 1), Math.round(vy - r), r * 2 + 3, r * 2 + 1); ctx.fillRect(Math.round(vx - r), Math.round(vy - r - 1), r * 2 + 1, r * 2 + 3);
  ctx.fillStyle = core; ctx.fillRect(Math.round(vx - r + 1), Math.round(vy - r + 1), r * 2 - 1, r * 2 - 1);
  ctx.globalCompositeOperation = 'source-over';
}
function drawFlame(ctx, vx, vy, col, core) {
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const t = (G.t * 2.5 + k / 6) % 1, x = vx + Math.sin(G.t * 9 + k * 2) * (1 - t) * 2, y = vy - t * 10;
    ctx.fillStyle = rgba(t < 0.4 ? core : col, 1 - t); const s = Math.max(1, Math.round(3 * (1 - t)));
    ctx.fillRect(Math.round(x - s / 2), Math.round(y), s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawPortal(ctx, o, lights) {
  const m = G.map;
  const P = o.portal, back = (THEME_OF[P.to] || 'vale') === 'vale';
  const active = P.open;
  const [vx, vy] = worldToView(o.x, o.y, o.z), cy = vy - 22;
  const col = back ? '#9ef0ff' : '#c79bff';
  ctx.globalCompositeOperation = 'lighter';
  if (active) {
    for (let k = 0; k < 7; k++) {
      const r = 15 - k * 2 + Math.sin(G.t * 3 + k) * 0.8, a = 0.18 + k * 0.08;
      ctx.strokeStyle = rgba(k % 2 ? col : '#ffd6ff', a); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(vx, cy, r * 0.62, r, 0, G.t * (k % 2 ? 2 : -2), G.t * (k % 2 ? 2 : -2) + 5); ctx.stroke();
    }
    ctx.fillStyle = rgba(col, 0.35); ctx.beginPath(); ctx.ellipse(vx, cy, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(Math.round(vx) - 1, Math.round(cy) - 4, 2, 8);
    if (Math.random() < 0.4) addPart({ x: o.x + frand(-0.4, 0.4), y: o.y + frand(-0.4, 0.4), z: o.z + frand(1, 5), vx: 0, vy: 0, vz: 0.6, life: 1, t: 0, col: pick2([col, '#ffd6ff', '#ffffff']), grav: 0, size: 1, glow: true });
    lights.push({ sx: isoX(o.x, o.y), sy: isoY(o.x, o.y, o.z) - 22, r: 110 + Math.sin(G.t * 3) * 8, col, a: 1 });
  }
  ctx.globalCompositeOperation = 'source-over';
  // orbiting rune stones
  for (let k = 0; k < 8; k++) {
    const a = G.t * 0.6 + k * Math.PI / 4, sx = Math.cos(a) * 15, sy = Math.sin(a) * 22 * 0.95;
    const back = Math.sin(a) < 0;
    const x = Math.round(vx + sx * 0.75), y = Math.round(cy + sy + Math.sin(G.t * 2 + k) * 1);
    ctx.fillStyle = back ? '#3a3358' : '#7a72a2'; ctx.fillRect(x - 2, y - 2, 4, 5);
    ctx.fillStyle = '#1a1326'; ctx.fillRect(x - 2, y + 3, 4, 1);
    if (active) { ctx.fillStyle = rgba(col, 0.9); ctx.fillRect(x - 1, y, 2, 1); }
  }
  // quest marker "!"
  if (active && P.marker) {
    const by = Math.round(cy - 38 + Math.sin(G.t * 3) * 2), bx = Math.round(vx);
    ctx.fillStyle = '#1a1326'; ctx.fillRect(bx - 2, by - 1, 5, 10); ctx.fillRect(bx - 2, by + 10, 5, 4);
    ctx.fillStyle = '#ffd35a'; ctx.fillRect(bx - 1, by, 3, 8); ctx.fillRect(bx - 1, by + 11, 3, 2);
    lights.push({ sx: isoX(o.x, o.y), sy: isoY(o.x, o.y, o.z) - 60, r: 30, col: '#ffd35a', a: 0.8 });
  }
}

// ===== the hero (M3): the layered paper-doll from js/hero.js, drawn from cached canvases only ================================
// p.spr.hero = HERO.build(look): 7 frames per view (0-1 idle, 2-5 walk, 6 attack), the held weapon canvas (grip anchored on the hand)
// and per-frame rim layers. art.js buildPlayerSprites rebuilds it when heroSig(p.equip) changes (an equip, a tier, a gem, tempering).
// Per frame this is: 1 drawImage for the body, 1 rotated drawImage for the weapon, <= 3 rim blits (one per glowing rarity) -
// no pixel work. Facing: art is drawn facing right; face < 0 mirrors the whole transform and the aim angle (pi - a).
const WEAPON_POSE = { sword: 'swing', staff: 'cast', bow: 'aim' };   // how each weapon kind is held (default: swing)
// ===== §30 Echo: the spirit clone (game.js G.echo) ===========================================================================
// The hero's cached layered frame + held weapon (p.spr.hero, the heroSig cache) baked ONCE per (source canvas, colour) into a
// padded tint (WeakMap, dropped with the sprite set when heroSig changes): a saturated element-colour body that keeps the
// shading, inside a 1 px bright rim. Per frame: a cached foot glow, 2 afterimage copies on the spirit's recent positions, the
// body at ~0.55 alpha + a light additive pass, the weapon; a materialise shimmer (width grows, a light column) on spawn and a
// rising dissolve (narrowing, motes) on fade. Cached blits only; colours are a hue-offset element set + the mythic cycle.
const ECHO_TINT = new WeakMap(), ECHO_STEPS = 6, ECHO_CYCLE = ['#ff5ac8', '#a060ff', '#40e8ff'], ECHO_PAL = {}, ECHO_GLOW = {};
const ECHO_ELCOL = { fire: '#ff5a1e', frost: '#2aa8ff', nature: '#28d860', lightning: '#ffe630', arcane: '#9a44ff', holy: '#fff2c4' };   // holy is pale white-gold so it never reads as lightning yellow
function echoPalette(el) {
  return ECHO_PAL[el] || (ECHO_PAL[el] = Array.from({ length: ECHO_STEPS }, (_, s) => {
    const a = ECHO_CYCLE[Math.floor(s / 2) % 3], b = ECHO_CYCLE[(Math.floor(s / 2) + 1) % 3];
    return mixHex(ECHO_ELCOL[el] || ECHO_ELCOL.arcane, mixHex(a, b, (s % 2) * 0.5), 0.08);   // a faint mythic shimmer; the element colour dominates
  }));
}
function echoTint(img, col) {   // (w + 2) x (h + 2): the rim, then the tinted body at (1, 1)
  let m = ECHO_TINT.get(img); if (!m) ECHO_TINT.set(img, m = {});
  let c = m[col];
  if (!c) {
    const W = img.width + 2, Hh = img.height + 2, t = makeCanvas(W, Hh), b = makeCanvas(W, Hh);
    for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) t.x.drawImage(img, ox, oy);
    t.x.globalCompositeOperation = 'source-in'; t.x.fillStyle = mixHex(col, '#ffffff', 0.65); t.x.fillRect(0, 0, W, Hh);
    b.x.drawImage(img, 1, 1); b.x.globalCompositeOperation = 'source-atop'; b.x.globalAlpha = 0.82; b.x.fillStyle = col; b.x.fillRect(0, 0, W, Hh);
    t.x.globalCompositeOperation = 'source-over'; t.x.drawImage(b.c, 0, 0);
    c = m[col] = t.c;
  }
  return c;
}
function echoGlow(col) {
  let c = ECHO_GLOW[col];
  if (!c) {
    const t = makeCanvas(36, 14), gr = t.x.createRadialGradient(18, 7, 0, 18, 7, 18);
    gr.addColorStop(0, rgba(col, 0.9)); gr.addColorStop(0.5, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
    t.x.setTransform(1, 0, 0, 14 / 36, 0, 7 - 7 * 14 / 36); t.x.fillStyle = gr; t.x.fillRect(0, 0, 36, 36);
    c = ECHO_GLOW[col] = t.c;
  }
  return c;
}
function drawEcho(ctx, E, lights) {
  const p = G.player, g = E.g; if (!p.spr || !p.spr.hero) return;
  const H = p.spr.hero, t = G.t, flip = g.face < 0, view = g.back ? 'back' : 'front', [vx, vy] = worldToView(g.x, g.y, g.z);
  const w = item('weapon', p.gear.weapon), pose = WEAPON_POSE[w.kind] || 'swing';
  const atk = !!(g.swing || g.castT > 0 || g.spin > 0);
  const fi = atk ? HERO.ATTACK : g.dashing ? 2 + (Math.floor(t * 18) & 3) : g.moving ? 2 + (Math.floor(g.walkT * 8) & 3) : (Math.sin(t * 2.5 + 1) > 0.3 ? 1 : 0);
  const col = echoPalette(E.el)[Math.floor(t * 4) % ECHO_STEPS], frame = H[view][fi], hand = H.hand[view][fi];
  const body = echoTint(frame, col), wpn = H.weapon ? echoTint(H.weapon, col) : null;
  const spawn = clamp(E.age / 0.3, 0, 1), fade = clamp((E.idleT - (ECHO.idle - ECHO.fadeOut)) / ECHO.fadeOut, 0, 1);   // 0..1 materialise / dissolve
  const sa = ctx.globalAlpha, so = ctx.globalCompositeOperation, bob = 2 * Math.sin(t * 3);
  // the afterimage trail: the spirit's last 8 drawn positions (world), copies at 3 and 6 frames back
  const T = E.trail || (E.trail = { b: new Float32Array(24), i: 0, n: 0 });
  T.b[T.i * 3] = g.x; T.b[T.i * 3 + 1] = g.y; T.b[T.i * 3 + 2] = g.z; T.i = (T.i + 1) & 7; T.n = Math.min(8, T.n + 1);
  const blit = (img, x, y, a, wk, rise) => {   // the body canvas centred on feet x,y (view px), width scaled by wk, raised by rise
    const bw = Math.max(1, Math.round(img.width * wk)), bx = Math.round(x - bw / 2), by = Math.round(y - img.height + 2 - rise);
    ctx.globalAlpha = a;
    if (flip) { ctx.save(); ctx.translate(bx + bw, by); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, bw, img.height); ctx.restore(); } else ctx.drawImage(img, bx, by, bw, img.height);
  };
  const A = E.alpha;
  // foot glow (additive, cached)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * A; const gl = echoGlow(col); ctx.drawImage(gl, Math.round(vx - 18), Math.round(vy - 7));
  // trail copies (source-over, decreasing alpha) where the spirit has moved
  ctx.globalCompositeOperation = 'source-over';
  for (const [back, a] of [[6, 0.16], [3, 0.3]]) {
    if (T.n <= back) continue;
    const j = ((T.i - 1 - back) & 7) * 3, [tx, ty] = worldToView(T.b[j], T.b[j + 1], T.b[j + 2]);
    if (Math.abs(tx - vx) + Math.abs(ty - vy) > 1.5) blit(body, tx, ty - bob, a * A, 1, 0);
  }
  // the body: translucent saturated pass + a light additive pass; materialise = width grows, dissolve = rises and narrows
  const wk = (0.25 + 0.75 * spawn) * (1 - 0.6 * fade), rise = fade * 7 + bob;
  blit(body, vx, vy, 0.55 * A, wk, rise);
  ctx.globalCompositeOperation = 'lighter'; blit(body, vx, vy, 0.22 * A, wk, rise);
  // the weapon (same tint), only once whole
  if (wpn && spawn >= 1 && fade < 0.5) {
    let ang = pose === 'swing' ? (g.face > 0 ? -1.15 : -Math.PI + 1.15) : pose === 'cast' ? (g.castT > 0 ? g.aim : (g.face > 0 ? -1.35 : -Math.PI + 1.35)) : (g.castT > 0 ? g.aim : (g.face > 0 ? 0.5 : Math.PI - 0.5));
    if (pose === 'swing' && g.swing) { const k = 1 - Math.pow(1 - g.swing.t / g.swing.dur, 2); ang = g.aim + g.swing.dir * (-g.swing.arc / 2 + g.swing.arc * k); }
    if (g.spin > 0) ang = t * 40;
    const la = flip ? Math.PI - ang : ang, dx = Math.round(vx - H.w / 2), dy = Math.round(vy - H.h + 1 - rise);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6 * A;
    ctx.save(); ctx.translate(flip ? dx + H.w : dx, dy); if (flip) ctx.scale(-1, 1);
    ctx.translate(hand.x, hand.y); ctx.rotate(la + (H.weaponAim === 'right' ? 0 : Math.PI / 2)); ctx.drawImage(wpn, -H.weaponGrip.x - 1, -H.weaponGrip.y - 1);
    ctx.restore();
  }
  // materialise shimmer: a light column that thins out; dissolve / spawn motes through the budgeted particle pool
  if (spawn < 1) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - spawn) * 0.8; ctx.fillStyle = mixHex(col, '#ffffff', 0.6);
    const cw = Math.max(1, Math.round(6 * (1 - spawn))); ctx.fillRect(Math.round(vx - cw / 2), Math.round(vy - H.h - 4), cw, H.h + 4);
  }
  if ((spawn < 1 || fade > 0) && E.moteT !== t) { E.moteT = t; if (Math.random() < 0.5) addPart({ x: g.x + frand(-0.3, 0.3), y: g.y + frand(-0.3, 0.3), z: g.z + frand(0.3, 2.6), vx: 0, vy: 0, vz: frand(0.6, 1.6), life: frand(0.4, 0.8), t: 0, col, grav: 0, size: 1, glow: true }); }
  ctx.globalAlpha = sa; ctx.globalCompositeOperation = so;
  lights.push({ sx: vx + camX - RW / 2, sy: vy - 14 + camY - RH / 2, r: 24, col, a: 0.3 * A });
}
// ===== §29 G3 occlusion (world-art minutes §3.3 fixes 1 + 2) ===================================================================
// heroOccluders: the columns sorted AFTER the hero whose top rises more than a level above his feet and whose image overlaps his
// sprite rect (at most 24 a frame) are marked it._cut; drawItem draws them as a cutaway (desktop: a dithered window around the hero,
// a 2x2 checker cut out with destination-out on a scratch canvas; phones: plain alpha 0.45). After the sorted draw the hero is
// drawn again as a silhouette ('#9ef0ff' at alpha 0.4 + a 1 px darker inner silhouette), so he always reads behind a tall wall.
const OCC = { n: 0, hx: 0, hy: 0, scratch: null, hole: null, max: 24 };
function heroOccluders(m, p, list, hkey) {
  const [vx, vy] = worldToView(p.x, p.y, p.z), H = p.spr && p.spr.hero, hw = H ? H.w / 2 - 2 : 8, hh = H ? H.h - 4 : 30;
  OCC.n = 0; OCC.hx = vx; OCC.hy = vy - hh / 2;
  const x0 = vx - hw, x1 = vx + hw, y0 = vy - hh, y1 = vy;
  for (const it of list) {
    if (it.kind !== 'column' || it.key <= hkey || !it.img) continue;
    const cx = it.sx - camX + RW / 2, cy = it.sy - camY + RH / 2;
    if (cx > x1 || cx + 32 < x0 || cy > y1 - 4 || cy + it.img.height < y0) continue;
    const h = m.h[Math.floor(it.y)][Math.floor(it.x)]; if (h < p.z + 3) continue;   // a wall of 3+ levels (18 px) hides half the hero
    it._cut = CHUNK.frame; if (++OCC.n >= OCC.max) break;
  }
  return OCC.n > 0;
}
function drawCutaway(ctx, it) {
  const dx = Math.round(it.sx - camX + RW / 2), dy = Math.round(it.sy - camY + RH / 2);
  if (PHONE) { ctx.globalAlpha = 0.45; ctx.drawImage(it.img, dx, dy); ctx.globalAlpha = 1; return; }
  if (!OCC.scratch) {
    OCC.scratch = makeCanvas(64, 200);
    const R = 22, hole = makeCanvas(R * 2, R * 3);   // a dithered ellipse: 2x2 checker inside, solid-free outside
    for (let y = 0; y < R * 3; y++) for (let x = 0; x < R * 2; x++) { const u = (x + 0.5 - R) / R, v = (y + 0.5 - R * 1.5) / (R * 1.5), d = u * u + v * v; if (d < 1 && (((x >> 0) + (y >> 0)) & 1) === 0) { hole.x.fillStyle = '#000'; hole.x.fillRect(x, y, 1, 1); } else if (d < 0.35) { hole.x.fillStyle = '#000'; hole.x.fillRect(x, y, 1, 1); } }
    OCC.hole = hole.c;
  }
  const S = OCC.scratch, w = it.img.width, h = Math.min(200, it.img.height);
  S.x.globalCompositeOperation = 'source-over'; S.x.clearRect(0, 0, 64, 200); S.x.drawImage(it.img, 0, 0);
  S.x.globalCompositeOperation = 'destination-out'; S.x.drawImage(OCC.hole, Math.round(OCC.hx - dx - OCC.hole.width / 2), Math.round(OCC.hy - dy - OCC.hole.height / 2));
  S.x.globalCompositeOperation = 'source-over';
  ctx.drawImage(S.c, 0, 0, w, h, dx, dy, w, h);
}
function drawHeroGhost(ctx, p) {
  const D = p._drawn; if (!D || !(D.frame || D.img)) return;
  if (D.img) {   // the forge hero: a sub-rect of the loadout sheet (its silhouettes are cached per sheet canvas)
    const lite = silOf(D.img, '#9ef0ff'), dark = silOf(D.img, '#1d4a66'), b = (im, x, y) => ctx.drawImage(im, D.sx, D.sy, D.w, D.h, x, y, D.w, D.h);
    ctx.globalAlpha = 0.4; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) b(lite, D.dx + ox, D.dy + oy);
    ctx.globalAlpha = 0.35; b(dark, D.dx, D.dy); ctx.globalAlpha = 0.25; b(lite, D.dx, D.dy); ctx.globalAlpha = 1;
    return;
  }
  const img = D.flip ? flipOf(D.frame) : D.frame, lite = silOf(img, '#9ef0ff'), dark = silOf(img, '#1d4a66');
  ctx.globalAlpha = 0.4;
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(lite, D.dx + ox, D.dy + oy);
  ctx.globalAlpha = 0.35; ctx.drawImage(dark, D.dx, D.dy);
  ctx.globalAlpha = 0.25; ctx.drawImage(lite, D.dx, D.dy);
  ctx.globalAlpha = 1;
}
// ===== M4a forge hero (docs/design/visual-bible.md "Forge pipeline"; js/forge-rt.js) ============================================
// The hero is the forge `chibi`: a bare base in casual clothes with the equipped gear layered at runtime. forgeLoadout maps the
// equipped items to forge piece ids (<item variant>.t<tier + 1>, Mythic = .t6); a missing tier falls back to the nearest lower
// tier of its line, a line without forge art (bow, daggers, cowls, robes...) to nothing (the bare base shows), logged once.
// drawPlayer draws one sub-rect of the ready loadout sheet (FORGE.sheet, composed over 3 frames, cached); while a new loadout
// composes the last ready sheet stays on screen, and before any is ready (boot) the old layered hero draws. ?oldhero keeps the
// old path for one milestone. Facing: the 8 true directions of the aim, in screen space. Anims: idle, walk, attack (the HAND
// weapon class picks the atk sheet inside forge-rt), cast, dash, hit; death = the hit frame tipped over (no death anim in the
// rig); anything else idles. The hitbox stays data (p.r); hitlag freezes G.t and with it the frame index.
const OLD_HERO = (() => { try { return new URLSearchParams(location.search).has('oldhero'); } catch (e) { return false; } })();
const FH = { rig: 'chibi', sig: null, lo: null, last: null, warned: new Set(), castPrev: 0, castMax: 0.25, castAtk: false, cur: null, curT: -1, cache: new Map() };
const FH_SLOTS = ['chest', 'boots', 'head', 'offhand', 'weapon'];   // forge depth resolve decides the layering; this is only the tie order
// the forge dir of each screen octant (from +x, clockwise, y down); forge dirs are screen dirs (its 'E' frames carry handR in
// front of the body: facing screen-right)
const DIR8 = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
function forgeWarn(msg) { if (FH.warned.has(msg)) return; FH.warned.add(msg); try { console.warn('forge hero: ' + msg); } catch (e) { /* no console */ } }
function forgeLoadout(equip) {
  const B = typeof FORGE_BANK !== 'undefined' && FORGE_BANK[FH.rig]; if (!B) return null;   // the rig bank is not in yet
  const lines = B.lines || {}, out = [];
  for (const slot of FH_SLOTS) {
    const v = equip && equip[slot]; if (!v) continue;
    let fam, tier;
    if (typeof v === 'string') { fam = v; tier = 1; }
    else {
      const b = typeof baseOf === 'function' ? baseOf(v.base) : null;
      if (!b) { forgeWarn(`no item base ${v.base} (${slot}); drawn bare`); continue; }
      fam = b.variant || b.family; tier = v.rarity === 'mythic' ? 6 : (b.tier | 0) + 1;
    }
    let id = fam + '.t' + tier;
    if (!lines[id]) { let t = Math.min(tier, 6); while (t > 1 && !lines[fam + '.t' + t]) t--; if (lines[fam + '.t' + t]) { forgeWarn(`${id} has no forge art yet; ${fam}.t${t} drawn`); id = fam + '.t' + t; } }
    if (!lines[id]) { forgeWarn(`no forge art for ${fam} (${slot}); the base piece shows`); continue; }
    out.push(id);
  }
  return out;
}
// the ready sheet entry to draw ({ e, lo }), or null (no forge runtime, or nothing composed yet: the caller draws the old hero)
function forgeHero(p) {
  if (typeof FORGE === 'undefined') return null;
  try {
    const sig = heroSig(p.equip);
    if (sig !== FH.sig || !FH.lo) {
      const lo = forgeLoadout(p.equip);
      if (!lo) { const e0 = FORGE.sheet(FH.rig, []); if (e0.state === 'ready' && !FH.last) FH.last = { e: e0, lo: [] }; return FH.last; }   // loads the rig
      FH.sig = sig; FH.lo = lo;
    }
    const e = FORGE.sheet(FH.rig, FH.lo);
    if (e.state === 'ready') { if (!FH.last || FH.last.e !== e) FH.last = { e, lo: FH.lo }; }
    else if (e.state === 'error') { forgeWarn(`loadout ${FH.lo.join(',')} failed (${e.error && e.error.message}); bare base`); FH.lo = []; }
  } catch (err) { forgeWarn(err.message); FH.lo = []; }
  return FH.last;
}
function heroDir(p) {   // the aim in screen space (iso), quantised to 8
  const a = p.aim || 0, c = Math.cos(a), s = Math.sin(a);
  return DIR8[((Math.round(Math.atan2((c + s) * 8, (c - s) * 16) / (Math.PI / 4)) % 8) + 8) % 8];
}
// [anim, frame] of this draw (computed once per frame: the shadow pass and drawPlayer share it)
function heroAnim(p, e) {
  if (FH.curT === G.t && FH.cur) return FH.cur;
  const t = G.t, N = a => (e && e.n && e.n[a]) || 1, fi = (a, k) => Math.min(N(a) - 1, Math.max(0, Math.floor(k * N(a))));
  if (p.castT > FH.castPrev + 1e-4) { FH.castMax = p.castT; FH.castAtk = !(G.lastCast && G.lastCast.t > 0.15 && G.lastCast.slot !== 'lmb'); }   // a new cast: a skill (cast) or the staff's hand attack
  FH.castPrev = Math.max(0, p.castT || 0);
  let r;
  if (p.dead) r = ['hit', 0];
  else if (p.dash) r = ['dash', Math.floor(t * 14) % N('dash')];
  else if (p.spin > 0) r = ['attack', Math.floor(t * 24) % N('attack')];
  else if (p.swing) r = ['attack', fi('attack', p.swing.t / p.swing.dur)];
  else if (p.castT > 0) { const a = FH.castAtk ? 'attack' : 'cast'; r = [a, fi(a, 1 - p.castT / Math.max(0.01, FH.castMax))]; }
  else if (p.hurtT > 0.12) r = ['hit', 0];
  else if (p.moving) r = ['walk', Math.floor((p.walkT || 0) * 10) % N('walk')];
  else r = ['idle', Math.floor(t * 5) % N('idle')];
  if (e && e.at && e.at[r[0]] == null) r = ['idle', Math.floor(t * 5) % N('idle')];
  FH.cur = r; FH.curT = G.t;
  return r;
}
// ===== light-aware rims and shadows (docs/design/lighting-status-fx.md "Layers") ==============================================
// Both draw before applyLighting ranks this frame's lights, so they read LAST frame's drawn set (LIGHT_VIS, one frame of lag,
// invisible at 60 fps), placed with this frame's camera from each light's world-screen spot. A body's own lights (L.own) are
// skipped. Without a local light the sun / moon key light (from the upper right, the side the tree and cliff shadows assume)
// wins. domLight(vx, vy, self) -> DOM { dx, dy (unit vector body -> light, screen), k 0..1, col, oct (0 E, 1 NE, 2 N ... the
// FORGE.rim face convention) }.
const DOM = { dx: 0, dy: 0, k: 0, col: '#ffffff', oct: 1, local: false };
function domLight(vx, vy, self) {
  let best = 0, bl = null, bx = 0, by = 0;
  for (let i = 0; i < LIGHT_VIS.length; i++) {
    const v = LIGHT_VIS[i], L = v[2]; if (self && L.own === self) continue;
    const dx = L.sx - camX + RW / 2 - vx, dy = L.sy - camY + RH / 2 - vy, d = Math.hypot(dx, dy);
    if (d >= L.r * 0.5 || d < 4) continue;
    const k = clamp(L.a, 0, 1) * (v[3] || 1) * (1 - d / (L.r * 0.5));
    if (k > best) { best = k; bl = L; bx = dx / d; by = dy / d; }
  }
  const mo = G.map && G.map.theme && G.map.theme.moon, sunK = mo && mo.sun ? 0.35 : 0.22;
  if (best > sunK) { DOM.dx = bx; DOM.dy = by; DOM.k = clamp(best, 0, 1); DOM.col = bl.col; DOM.local = true; }
  else { DOM.dx = 0.94; DOM.dy = -0.34; DOM.k = sunK; DOM.col = mo && mo.sun ? '#ffe6c0' : '#c8d8ff'; DOM.local = false; }
  DOM.oct = ((Math.round(Math.atan2(-DOM.dy, DOM.dx) / (Math.PI / 4)) % 8) + 8) % 8;
  return DOM;
}
// the ground shadow: an ellipse pushed away from the dominant light (at most 6 px) and stretched along it; on 'high' the hero (and
// art bosses) also cast a skewed, squashed silhouette of the drawn frame away from the light.
const SHADOW_DOM = { dx: 0, dy: 0, k: 0 };
function lightShadow(ctx, vx, vy, r, self, sil) {
  const L = domLight(vx, vy - 10, self), off = Math.min(6, 2 + 6 * L.k), ax = -L.dx, ay = -L.dy;
  SHADOW_DOM.dx = ax; SHADOW_DOM.dy = ay; SHADOW_DOM.k = L.k;
  const cx = Math.round(vx + ax * off * 0.8), cy = Math.round(vy + ay * off * 0.5);
  ctx.beginPath(); ctx.ellipse(cx, cy, r * (1 + 0.35 * L.k), r * 0.45, Math.atan2(ay * 0.5, ax) * 0.5, 0, Math.PI * 2); ctx.fill();
  if (sil && QUALITY.tier === 'high') {   // skewed silhouette: frame px (u, v above the feet) -> feet + v * len * (away vector), squashed
    const len = 0.35 + 0.35 * L.k, c = -ax * len, d = clamp(-ay * len * 0.5, -0.45, 0.45), dd = Math.abs(d) < 0.12 ? (d < 0 ? -0.12 : 0.12) : d;
    ctx.save(); ctx.globalAlpha = 0.22 + 0.18 * L.k;
    ctx.setTransform(1, 0, c, dd, Math.round(vx), Math.round(vy));
    ctx.drawImage(sil.img, sil.sx, sil.sy, sil.w, sil.h, -sil.ax, -sil.ay, sil.w, sil.h);
    ctx.restore();
  }
}
// rim light: the 1-bit outer edge of the drawn frame lit on the side facing the dominant light (light vector quantised to 8),
// tinted with the light's colour, added on top. Forge frames use FORGE.rim (mask + outward-normal octant per pixel); other
// sprites get the same mask from their alpha once (rimOfImg, cached per canvas). One white rim sprite is cached per (frame, octant)
// and tinted through a scratch canvas: 3 small blits a rimmed body.
const RIM = { scratch: null, n: 0, max: 0, ms: 0, sprites: new Map(), imgs: new WeakMap() };
const RIM_CAP = { high: 12, phone: 4, low: 0 };   // rimmed bodies a frame (phone: the hero, bosses and elites only)
function rimSprite(r, oct) {   // r = { w, h, mask, face }: a white canvas, full alpha on the facing octant, half on its neighbours
  const c = makeCanvas(r.w, r.h), id = c.x.createImageData(r.w, r.h), d = id.data;
  for (let i = 0; i < r.mask.length; i++) {
    if (!r.mask[i] || r.face[i] > 7) continue;
    const df = Math.abs(r.face[i] - oct), q = Math.min(df, 8 - df), a = q === 0 ? 255 : q === 1 ? 150 : 0;
    if (a) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = a; }
  }
  c.x.putImageData(id, 0, 0);
  return c.c;
}
function rimOfImg(img) {   // the FORGE.rim shape for any sprite canvas: edge = drawn px with an empty 8-neighbour
  let r = RIM.imgs.get(img); if (r) return r;
  const w = img.width, h = img.height, src = makeCanvas(w, h); src.x.drawImage(img, 0, 0);
  const a = src.x.getImageData(0, 0, w, h).data, mask = new Uint8Array(w * h), face = new Uint8Array(w * h).fill(8);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue;
    let nx = 0, ny = 0, edge = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !on(x + dx, y + dy)) { edge = true; nx += dx; ny += dy; }
    if (!edge) continue;
    const i = y * w + x; mask[i] = 1; if (nx || ny) face[i] = ((Math.round(Math.atan2(-ny, nx) / (Math.PI / 4)) % 8) + 8) % 8;
  }
  r = { w, h, mask, face, spr: [] }; RIM.imgs.set(img, r);
  return r;
}
function rimBegin() { RIM.n = 0; RIM.max = RIM_CAP[QUALITY.tier] != null ? RIM_CAP[QUALITY.tier] : 4; RIM.ms = 0; }
// draw a rim: spr = white rim canvas (frame-sized), at scene (x, y), tinted with the DOM light. scale = the body's draw scale
function rimDraw(ctx, spr, x, y, L, w, h) {
  const S = RIM.scratch || (RIM.scratch = makeCanvas(96, 128)), sw = spr.width, sh = spr.height;
  if (sw > S.c.width || sh > S.c.height) return;
  const x2 = S.x; x2.globalCompositeOperation = 'source-over'; x2.globalAlpha = 1; x2.clearRect(0, 0, sw, sh); x2.drawImage(spr, 0, 0);
  x2.globalCompositeOperation = 'source-in'; x2.fillStyle = mixHex(L.col, '#ffffff', 0.35); x2.fillRect(0, 0, sw, sh); x2.globalCompositeOperation = 'source-over';
  const so = ctx.globalCompositeOperation, sa = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sa * clamp(0.25 + L.k * 0.9, 0, 0.85);
  ctx.drawImage(S.c, 0, 0, sw, sh, x, y, w || sw, h || sh);
  ctx.globalCompositeOperation = so; ctx.globalAlpha = sa;
}
// rim a generic sprite canvas drawn at (x, y) (w, h = its drawn size when scaled); a body counts against the tier cap
function rimBody(ctx, img, x, y, vx, vy, self, w, h, must) {
  if (!img || RIM.n >= RIM.max || (!must && QUALITY.tier !== 'high')) return;
  const t0 = PERF.on ? performance.now() : 0;
  RIM.n++;
  const L = domLight(vx, vy, self), r = rimOfImg(img), spr = r.spr[L.oct] || (r.spr[L.oct] = rimSprite(r, L.oct));
  rimDraw(ctx, spr, x, y, L, w, h);
  if (PERF.on) { const d = performance.now() - t0; PERF.ph['sub.rim'] = (PERF.ph['sub.rim'] || 0) + d; }
}
function forgeRimSprite(H, anim, dir, f, oct) {
  const k = H.e.key + '|' + anim + '|' + dir + '|' + f + '|' + oct, S = RIM.sprites;
  let c = S.get(k); if (c) return c;
  const r = FORGE.rim(FH.rig, H.lo, anim, dir, f); if (!r) return null;
  c = rimSprite(r, oct);
  if (S.size >= 320) S.delete(S.keys().next().value);   // LRU-ish: the oldest entry goes
  S.set(k, c);
  return c;
}
// the forge hero's frame rect this draw: { img, sx, sy, w, h, ax, ay, anim, f, dir }
function heroFrame(p, H) {
  const e = H.e, [anim, f] = heroAnim(p, e), dir = heroDir(p), c = e.at[anim] != null ? anim : 'idle', ff = f % (e.n[c] || 1);
  const F = FH.frame || (FH.frame = {});
  F.img = e.canvas; F.sx = (e.at[c] + ff) * e.w; F.sy = (e.dirIdx[dir] || 0) * e.h; F.w = e.w; F.h = e.h; F.ax = e.ax; F.ay = e.ay; F.anim = c; F.f = ff; F.dir = dir;
  return F;
}
// the hero's ground shadow (decal pass): light-aware, with the forge frame as the desktop silhouette
function drawHeroShadow(ctx, p) {
  const [vx, vy] = worldToView(p.x, p.y, tileH(G.map, p.x, p.y)), H = !OLD_HERO && forgeHero(p);
  let sil = null;
  if (H && QUALITY.tier === 'high') { const F = heroFrame(p, H); sil = { img: silOf(F.img, '#140828'), sx: F.sx, sy: F.sy, w: F.w, h: F.h, ax: F.ax, ay: F.ay }; }
  const t0 = PERF.on ? performance.now() : 0;
  lightShadow(ctx, vx, vy, 6, p, sil);
  if (PERF.on) PERF.ph['sub.shadow'] = (PERF.ph['sub.shadow'] || 0) + performance.now() - t0;
}
function drawPlayer(ctx, p, lights) {
  if (!p.spr || !p.spr.hero || p.spr.sig !== heroSig(p.equip)) p.spr = buildPlayerSprites(p.equip);   // portrait, Echo, occluder box
  const H = !OLD_HERO && forgeHero(p);
  if (!H) { drawPlayerOld(ctx, p, lights); return; }
  const [vx, vy] = worldToView(p.x, p.y, p.z), F = heroFrame(p, H), t = G.t;
  const dx = Math.round(vx) - F.ax, dy = Math.round(vy) - F.ay;
  if (p.dead) {
    ctx.globalAlpha = Math.max(0, 1 - G.deadT);
    ctx.save(); ctx.translate(Math.round(vx), Math.round(vy)); ctx.rotate(Math.PI / 2 * Math.min(1, G.deadT * 2)); ctx.drawImage(F.img, F.sx, F.sy, F.w, F.h, -F.ax, -F.ay, F.w, F.h); ctx.restore(); ctx.globalAlpha = 1; return;
  }
  const veil = p.buffs.veil ? 0.4 : 1;
  ctx.globalAlpha = veil;
  if (p.spr.top && HERO.rarityFx[p.spr.top].aura) HERO.drawAura(ctx, dx + 12, dy + 17, 26, 34, p.spr.top, t);   // the chibi's body box
  ctx.drawImage(F.img, F.sx, F.sy, F.w, F.h, dx, dy, F.w, F.h);
  p._drawn = { img: F.img, sx: F.sx, sy: F.sy, w: F.w, h: F.h, dx, dy, ax: F.ax, ay: F.ay };   // §29 G3 the silhouette redraws this frame; dodge ghosts copy it
  // rim light (the hero always counts, phone included; off on 'low')
  if (RIM.max > 0) {
    const t0 = PERF.on ? performance.now() : 0; RIM.n++;
    const L = domLight(vx, vy - 14, p), spr = forgeRimSprite(H, F.anim, F.dir, F.f, L.oct);
    if (spr) rimDraw(ctx, spr, dx, dy, L);
    if (PERF.on) PERF.ph['sub.rim'] = (PERF.ph['sub.rim'] || 0) + performance.now() - t0;
  }
  if (p.hurtT > 0 && Math.floor(p.hurtT * 30) % 2) ctx.drawImage(silOf(F.img, '#ffffff'), F.sx, F.sy, F.w, F.h, dx, dy, F.w, F.h);
  ctx.globalAlpha = 1;
  // status layers (status.js): tint + overlay, socket emitters, glyphs, the merged status light
  const S = FORGE.sockets(FH.rig, H.lo, F.anim, F.dir, F.f) || {};
  if (typeof STATUS !== 'undefined') STATUS.body(ctx, p, F.img, F.sx, F.sy, F.w, F.h, dx, dy, F.w, F.h, S.head ? [dx + S.head.x, dy + S.head.y] : [vx, vy - 26], S.chest ? [dx + S.chest.x, dy + S.chest.y] : [vx, vy - 12], lights);
  // lights: the weapon (swing flash, staff tip) and the best piece's rarity light, from the frame's sockets (gear: bloom 0.6)
  const w = item('weapon', p.gear.weapon), pose = WEAPON_POSE[w.kind] || 'swing', W = (x, y) => [x + camX - RW / 2, y + camY - RH / 2];
  const hand = S.handR ? [dx + S.handR.x, dy + S.handR.y] : [vx, vy - 12], tip = S.tip ? [dx + S.tip.x, dy + S.tip.y] : hand;
  if (pose === 'swing' && (p.swing || p.spin > 0)) { const [sx, sy] = W(tip[0], tip[1]); lights.push({ sx, sy, r: 30, col: '#ffe9a0', a: 0.6, own: p, bloom: 0.6 }); }
  else if (pose === 'cast') { const [sx, sy] = W(tip[0], tip[1]); lights.push({ sx, sy, r: 34 + (p.castT > 0 ? 20 : 0), col: (p.spr.hero && p.spr.hero.weaponLight) || '#7fe6ff', a: 0.85, own: p, bloom: 0.6 }); }
  else if (p.spr.hero && p.spr.hero.weaponLight) { const [sx, sy] = W((hand[0] + tip[0]) / 2, (hand[1] + tip[1]) / 2); lights.push({ sx, sy, r: 18, col: p.spr.hero.weaponLight, a: 0.55, own: p, bloom: 0.6 }); }
  drawPlayerFx(ctx, p, vx, vy, lights);
}
// the buff / rarity extras both hero paths share (lights, the bulwark ring, motes)
function drawPlayerFx(ctx, p, vx, vy, lights) {
  const t = G.t;
  if (p.spr.top) {
    const fx = HERO.rarityFx[p.spr.top];
    if (fx.light >= 40) lights.push({ sx: vx + camX - RW / 2, sy: vy - 16 + camY - RH / 2, r: fx.light * 0.6, col: HERO.rarityColor(p.spr.top, t), a: 0.45, own: p, bloom: 0.6 });
    if (fx.rate && (p.spr.fxT || 0) !== t) {                                       // ember / mote / star particles through the game's own budgeted system
      const dt = Math.min(0.05, t - (p.spr.fxT || t)); p.spr.fxT = t; p.spr.fxAcc = (p.spr.fxAcc || 0) + fx.rate * dt * 0.5;
      while (p.spr.fxAcc >= 1) {
        p.spr.fxAcc -= 1; const up = fx.kind === 'ember' || fx.kind === 'star', col = fx.kind === 'ember' ? pick2(['#ffd070', '#ffa020', '#ff6a18']) : HERO.rarityColor(p.spr.top, frand(0, 9));
        addPart({ x: p.x + frand(-0.35, 0.35), y: p.y + frand(-0.35, 0.35), z: p.z + frand(0.4, 4.6), vx: 0, vy: 0, vz: up ? frand(0.8, 2.2) : fx.kind === 'mote' ? -frand(0.2, 0.8) : 0, life: frand(0.6, 1.2), t: 0, col, grav: 0, size: 1, glow: true });
      }
    }
  }
  if (p.buffs.bulwark) {
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(190,215,255,${0.5 + Math.sin(G.t * 10) * 0.2})`;
    ctx.beginPath(); ctx.ellipse(vx, vy - 16, 15, 19, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    lights.push({ sx: isoX(p.x, p.y), sy: isoY(p.x, p.y, p.z) - 16, r: 40, col: '#bfd6ff', a: 0.6, own: p, bloom: 0.4 });
  }
  if (p.buffs.bless || p.buffs.surge) {
    if (Math.random() < 0.5) addPart({ x: p.x + frand(-0.3, 0.3), y: p.y + frand(-0.3, 0.3), z: p.z, vx: 0, vy: 0, vz: frand(2, 3), life: 0.6, t: 0, col: p.buffs.bless ? '#ffe9a0' : '#c7a8ff', grav: 0, size: 1, glow: true });
  }
  if (p.buffs.mend && Math.random() < 0.3) addPart({ x: p.x + frand(-0.3, 0.3), y: p.y + frand(-0.3, 0.3), z: p.z + 1, vx: 0, vy: 0, vz: 1.5, life: 0.7, t: 0, col: '#8fffa8', grav: 0, size: 1, glow: true });
}
// ?oldhero (and boot, before the first forge sheet is ready): the M3 layered hero (hero.js)
function drawPlayerOld(ctx, p, lights) {
  const [vx, vy] = worldToView(p.x, p.y, p.z);
  if (!p.spr || !p.spr.hero || p.spr.sig !== heroSig(p.equip)) p.spr = buildPlayerSprites(p.equip);
  if (p.dead) {
    ctx.globalAlpha = Math.max(0, 1 - G.deadT); const spr = p.spr.front[0];
    ctx.save(); ctx.translate(Math.round(vx), Math.round(vy)); ctx.rotate(Math.PI / 2 * Math.min(1, G.deadT * 2)); ctx.drawImage(spr, -spr.width / 2, 1 - spr.height); ctx.restore(); ctx.globalAlpha = 1; return;
  }
  const H = p.spr.hero, t = G.t, flip = p.face < 0, view = p.back ? 'back' : 'front';
  if (!H._warm) HERO.warmStep(H);                                                   // build the cached rim layers a few frames at a time
  const w = item('weapon', p.gear.weapon), pose = WEAPON_POSE[w.kind] || 'swing';
  const atk = !!(p.swing || p.castT > 0 || p.spin > 0 || (G.mouse.down && pose === 'aim'));
  const fi = atk ? HERO.ATTACK : p.dash ? 2 + (Math.floor(t * 18) & 3) : p.moving ? 2 + (Math.floor(p.walkT * 8) & 3) : (Math.sin(t * 2.5) > 0.3 ? 1 : 0);
  const dx = Math.round(vx - H.w / 2), dy = Math.round(vy - H.h + 1);
  const hand = H.hand[view][fi];
  const hx = flip ? dx + H.w - hand.x : dx + hand.x, hy = dy + hand.y;           // hand in scene px (the mirrored hand when flipped)
  const sa = Math.atan2(G.mouse.y - hy, G.mouse.x - hx);                           // world aim angle (0 = right)
  let ang;                                                                         // world angle the weapon points along
  if (pose === 'swing') {
    ang = p.face > 0 ? -1.15 : -Math.PI + 1.15;
    if (p.swing) { const k = 1 - Math.pow(1 - p.swing.t / p.swing.dur, 2); ang = sa + p.swing.dir * (-p.swing.arc / 2 + p.swing.arc * k); }
    if (p.spin > 0) ang = t * 40;
  } else if (pose === 'cast') ang = p.castT > 0 ? sa : (p.face > 0 ? -1.35 : -Math.PI + 1.35);
  else ang = (p.castT > 0 || G.mouse.down) ? sa : (p.face > 0 ? 0.5 : Math.PI - 0.5);
  const la = flip ? Math.PI - ang : ang;                                           // the same angle in the mirrored (right-facing) frame
  if (p.buffs.veil) ctx.globalAlpha = 0.4;
  if (p.spr.top && HERO.rarityFx[p.spr.top].aura) HERO.drawAura(ctx, dx, dy, H.w, H.h, p.spr.top, t);
  ctx.save(); ctx.translate(flip ? dx + H.w : dx, dy); if (flip) ctx.scale(-1, 1);
  const wspr = H.weapon;
  const drawW = () => {
    if (!wspr) return;
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(la + (H.weaponAim === 'right' ? 0 : Math.PI / 2));
    ctx.drawImage(wspr, -H.weaponGrip.x, -H.weaponGrip.y);
    if (pose === 'aim' && p.castT > 0 && H.weaponAim === 'right') ctx.drawImage(ART.weapons.arrow, -1, -1);   // the nocked arrow while drawing
    const wr = HERO.weaponRimOf(H); if (wr) HERO.drawRim(ctx, wr, -H.weaponGrip.x, -H.weaponGrip.y, t);
    ctx.restore();
  };
  if (p.back) drawW();
  const frame = H[view][fi];
  ctx.drawImage(frame, 0, 0);
  p._drawn = { frame, dx, dy, flip };   // §29 G3 the silhouette redraws this frame
  const rims = HERO.rimsOf(H, view, fi); for (let i = 0; i < rims.length; i++) HERO.drawRim(ctx, rims[i], 0, 0, t);
  if (p.hurtT > 0 && Math.floor(p.hurtT * 30) % 2) ctx.drawImage(silOf(frame, '#ffffff'), 0, 0);
  if (!p.back) drawW();
  ctx.restore();
  ctx.globalAlpha = 1;
  // lights: the weapon (swing flash, staff tip, a steady glow for T4+ weapons) and the best piece's rarity light
  const wlen = H.weapon ? H.weaponGrip.y - H.weaponTip.y : 0, tipx = hx + Math.cos(ang) * wlen, tipy = hy + Math.sin(ang) * wlen;
  if (pose === 'swing' && (p.swing || p.spin > 0)) lights.push({ sx: hx + Math.cos(ang) * 10 + camX - RW / 2, sy: hy + Math.sin(ang) * 10 + camY - RH / 2, r: 30, col: '#ffe9a0', a: 0.6, own: p, bloom: 0.6 });
  else if (pose === 'cast') lights.push({ sx: tipx + camX - RW / 2, sy: tipy + camY - RH / 2, r: 34 + (p.castT > 0 ? 20 : 0), col: H.weaponLight || '#7fe6ff', a: 0.85, own: p, bloom: 0.6 });
  else if (H.weaponLight) lights.push({ sx: (hx + tipx) / 2 + camX - RW / 2, sy: (hy + tipy) / 2 + camY - RH / 2, r: 18, col: H.weaponLight, a: 0.55, own: p, bloom: 0.6 });
  drawPlayerFx(ctx, p, vx, vy, lights);
}

const LEGACY_ENEMY_K = 1.5;
// the hit frame shows while the hit flash runs or the target-only hitlag holds the enemy (game.js hitlag, R2)
const hitF = e => e.flash > 0 || e.hitFreeze > 0;
function drawEnemy(ctx, e, lights) {
  const [vx, vy0] = worldToView(e.x, e.y, e.z + (e.hopZ || 0));   // + the tumble hop: a draw offset only (R1)
  let vy = vy0;
  const spawnA = e.spawnT > 0 ? 1 - e.spawnT / (e.boss ? 1.6 : 0.9) : 1;
  if (spawnA <= 0.05) return;
  const artKey = enemyArtKey(e);
  if (artKey) { drawEnemyArt(ctx, e, artKey, vx, vy, spawnA, lights); return; }
  if (e.under) { drawBurrowed(ctx, e, vx, vy); return; }
  if (e.mimic) { const ci = ART.chest; ctx.drawImage(hitF(e) ? silOf(ci, '#ffffff') : ci, Math.round(vx - ci.width / 2), Math.round(vy - ci.height + 1)); return; }
  ctx.globalAlpha = spawnA * (e.fadeT > 0 ? 0.35 : 1);
  if (e.elite) drawEliteAura(ctx, e);
  let img, white, dr = null;   // dr = where a custom sprite was drawn (the frozen tint reuses it)
  const def = ENEMY[e.type] || {}, look = enemyLook(def, e.type), cs = look.img, lk = look.kind;
  // M3: the old sprites (slime, hound, ogre, dummy, the Warden...) were drawn against a 16x24 hero; the hero is 24x34 now, so they
  // are drawn LEGACY_ENEMY_K times bigger (visual only: e.r / hgt, i.e. every hitbox, are untouched). ENEMY_ART sprites are already hero-sized.
  const sc = (def.scale || 1) * LEGACY_ENEMY_K, scaled = sc !== 1 && !cs;
  if (scaled) { ctx.save(); ctx.translate(Math.round(vx), Math.round(vy)); ctx.scale(sc, sc); ctx.translate(-Math.round(vx), -Math.round(vy)); }
  if (cs) {
    // pixel-editor sprite (sprites face right) with behaviour-driven motion
    const base = enemyFrame(look, e);
    let ox = 0, oy = 0, sq = 0;
    if (def.ai === 'hopper' || (e.pp && e.pp.chase && e.pp.chase.hop)) { const hop = e.state === 'chase' ? Math.max(0, Math.sin(e.anim * 6)) : 0; sq = (e.squash > 0 ? e.squash : 0) + (e.state === 'wind' ? 0.15 : 0) - hop * 0.12; oy = -hop * 5; }
    else if (def.ai === 'shooter' || (def.tags || []).includes('flying')) oy = -(10 + Math.sin(e.anim * 3) * 3);
    else if (e.state === 'chase') oy = -(Math.floor(e.anim * 6) % 2);
    else if (e.state === 'wind') { ox = -e.face * 1; oy = -1; }
    else if (e.state === 'strike' || e.state === 'lunge') ox = e.face * 2;
    img = base;
    const w = Math.round(base.width * (1 + sq) * sc), hh = Math.round(base.height * (1 - sq) * sc);
    const dx = Math.round(vx - w / 2 + ox), dy = Math.round(vy - hh + 1 + oy);
    dr = [dx, dy, w, hh];
    ctx.drawImage(hitF(e) ? silOf(base, '#ffffff') : base, dx, dy, w, hh);
    if (look.tint) { ctx.globalAlpha = spawnA * 0.3; ctx.drawImage(silOf(base, look.tint), dx, dy, w, hh); ctx.globalAlpha = spawnA; }
    if (e.state === 'wind' && (def.ai === 'brute' || e.boss)) { ctx.globalAlpha = spawnA * (0.25 + 0.25 * Math.sin(e.anim * 30)); ctx.drawImage(silOf(base, '#ff5040'), dx, dy, w, hh); ctx.globalAlpha = spawnA; }
    vy += oy;
  } else if (lk === 'slime') {
    const moving = e.state === 'chase', hop = moving ? Math.max(0, Math.sin(e.anim * 6)) : 0;
    const wind = e.state === 'wind' ? Math.sin(e.anim * 40) * 0.08 + 0.15 : 0;
    const sq = (e.squash > 0 ? e.squash : 0) + wind - hop * 0.12;
    img = hitF(e) ? ART.slime.w : ART.slime.n;
    dr = [Math.round(vx - img.width * (1 + sq) / 2), Math.round(vy - img.height * (1 - sq) - hop * 5), Math.round(img.width * (1 + sq)), Math.round(img.height * (1 - sq))];
    ctx.drawImage(img, dr[0], dr[1], dr[2], dr[3]);
  } else if (lk === 'hound') {
    const f = Math.floor(e.anim * (e.state === 'lunge' ? 16 : 8)) % 2;
    img = hitF(e) ? (e.face < 0 ? ART.hound.wf : ART.hound.w) : (e.face < 0 ? ART.hound.f[f] : ART.hound.n[f]);
    ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height));
    lights.push({ sx: vx + camX - RW / 2 + e.face * 5, sy: vy + camY - RH / 2 - 8, r: 14, col: '#ff6b9a', a: 0.7, own: e });
  } else if (lk === 'wisp') {
    vy -= 14 + Math.sin(e.anim * 3) * 3;
    const charge = e.state === 'wind' ? 1 + Math.sin(e.anim * 30) * 0.3 : 0;
    for (let k = 0; k < 4; k++) { ctx.fillStyle = rgba('#7fd6ff', 0.5 - k * 0.1); ctx.fillRect(Math.round(vx - 1 + Math.sin(e.anim * 5 + k) * 1.5), Math.round(vy + 3 + k * 2), 2, 2); }
    glowDot(ctx, vx, vy, hitF(e) ? '#ffffff' : '#7fd6ff', '#f0feff', 2 + Math.round(charge));
    ctx.fillStyle = '#1a1326'; ctx.fillRect(Math.round(vx - 2), Math.round(vy - 1), 1, 2); ctx.fillRect(Math.round(vx + 1), Math.round(vy - 1), 1, 2);
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 36 + charge * 20, col: '#7fd6ff', a: 0.9, own: e });
  } else if (lk === 'boss') {
    const B = ART.boss;
    img = hitF(e) ? (e.face < 0 ? B.wf : B.w) : (e.face < 0 ? B.f : B.n);
    ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height + 2));
    const glow = e.state !== 'chase' ? 1 : 0.6;
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2 - 40, r: 60, col: '#ff7ae0', a: glow, own: e });
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2 - 26, r: 40, col: '#c78bff', a: 0.8, own: e });
    if (Math.random() < 0.5) addPart({ x: e.x + frand(-0.7, 0.7), y: e.y + frand(-0.7, 0.7), z: 0.3, vx: 0, vy: 0, vz: frand(0.5, 1.5), life: 1, t: 0, col: pick2(['#2a1c38', '#5f4690', '#ff7ae0']), grav: 0, size: 2, glow: false });
  } else if (lk === 'dummy') {
    img = ART.dummy;
    const wob = hitF(e) ? Math.round(Math.sin(G.t * 60) * 1) : 0;
    ctx.drawImage(hitF(e) ? silOf(img, '#ffffff') : img, Math.round(vx - img.width / 2 + wob), Math.round(vy - img.height + 1));
  }
  // M4a: rim light + status layers (status.js: the frozen tint moved there, with the other statuses)
  if (img) {
    const r = dr || [Math.round(vx - img.width / 2), Math.round(vy - img.height), img.width, img.height];
    rimBody(ctx, img, r[0], r[1], vx, vy - 10, e, r[2], r[3], e.boss || e.elite);
    if (typeof STATUS !== 'undefined') { ctx.globalAlpha = spawnA; STATUS.body(ctx, e, img, 0, 0, img.width, img.height, r[0], r[1], r[2], r[3], null, null, lights); }
  } else if (typeof STATUS !== 'undefined') STATUS.body(ctx, e, null, 0, 0, 0, 0, Math.round(vx - 8), Math.round(vy - 16), 16, 16, null, null, lights);
  if (scaled) ctx.restore();
  if (e.asleep && Math.random() < 0.03) text(e.x, e.y, e.z + e.hgt + 0.3, 'z', '#c8c0e0', false, 1.2);
  if (e.eShield > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#cfe6ff', 0.4 + 0.4 * e.eShield / e.eShieldMax); projRing(ctx, e.x, e.y, 0.2, e.r + 0.45); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
  if (e.stunT > 0 && !e.frozen) for (let k = 0; k < 3; k++) { const a = G.t * 6 + k * 2.1; ctx.fillStyle = '#ffe36a'; ctx.fillRect(Math.round(vx + Math.cos(a) * 6), Math.round(vy - e.hgt * ZS - 4 + Math.sin(a) * 2), 1, 1); }
  // nameplates (bar, icons, statuses) are drawn by hud.js drawNameplates on the 2x grid
}

// ===== ENEMY_ART (js/enemyart.js, procedural 12+ frame sets): the primary enemy sprite source =====================
// key = row.art || the enemy id when ENEMY_ART.info has it. Anim from the part / boss state: hit (flash) · sleep ·
// heal (healer wind-up) · burrow (first 0.35 s of a burrow, then the dirt mound) · erupt · stomp / grab (boss
// telegraph frame 0, hit frame 1) · attack (wind 0, action 1) · walk (moving) · idle. Elites: tint + aura hooks.
const ART_FLIP = new WeakMap();
const flipOf = c => { let f = ART_FLIP.get(c); if (!f) ART_FLIP.set(c, f = flipH(c)); return f; };
function enemyArtKey(e) {
  if (typeof ENEMY_ART === 'undefined') return null;
  const def = ENEMY[e.type] || {}, k = def.art || e.type;
  return ENEMY_ART.info[k] ? k : null;
}
function enemyArtAnim(e, key) {
  const A = ENEMY_ART.info[key].anims, f8 = Math.floor(e.anim * 8), f4 = Math.floor(e.anim * 4), f3 = Math.floor(e.anim * 3);
  if (hitF(e) && A.hit) return ['hit', 0];
  if (e.asleep) return [A.sleep ? 'sleep' : 'idle', Math.floor(e.anim * 1.5)];
  const mv = e.boss && e.bk && e.bk.mv;
  if (mv) {
    const step = mv.step > 0 || mv.t > mv.wind ? 1 : 0;
    if (mv.M.name === 'stomp' && A.stomp) return ['stomp', step];
    if ((mv.M.name === 'rootGrab' || mv.M.root) && A.grab) return ['grab', step];
    return ['attack', step];
  }
  if (e.state === 'wind') {
    if (e.act === 'healer' && A.heal) return ['heal', f4];
    if (e.act === 'burrow' && A.burrow) return ['burrow', Math.floor(((e.windMax || 0) - e.st) / 0.18)];
    return ['attack', 0];
  }
  if (e.state === 'erupt' && A.erupt) return ['erupt', e.st > 0.3 ? 0 : 1];
  if (e.state !== 'chase' && e.state !== 'rec') return ['attack', 1];
  const moving = e.lmx != null && Math.hypot(e.x - e.lmx, e.y - e.lmy) > 0.002;
  return moving ? ['walk', f8] : ['idle', f3];
}
function drawEnemyArt(ctx, e, key, vx, vy, spawnA, lights) {
  const info = ENEMY_ART.info[key];
  if (!e.artHgt) { e.artHgt = true; e.hgt = Math.max(e.hgt || 0, info.ay / ZS * 0.95); }
  const [anim, frame] = enemyArtAnim(e, key);
  e.lmx = e.x; e.lmy = e.y;
  if (e.under && e.state !== 'erupt' && !(e.state === 'wind' && e.act === 'burrow' && (e.windMax || 0) - e.st < 0.36)) { drawBurrowed(ctx, e, vx, vy); return; }
  const fly = (ENEMY[e.type].tags || []).includes('flying'), oy = fly ? -(8 + Math.sin(e.anim * 3) * 3) : 0;
  const mods = e.elite && e.mods || [], ecol = mods[0] && ELITE_MODS[mods[0]] ? ELITE_MODS[mods[0]].col : '#ffd35a';
  let img = ENEMY_ART.get(key, anim, frame, e.elite ? { tint: ecol, amount: 0.3 } : null);
  if (e.face < 0) img = flipOf(img);
  const ax = e.face < 0 ? img.width - info.ax : info.ax, x = Math.round(vx - ax), y = Math.round(vy + oy - info.ay);
  ctx.globalAlpha = spawnA * (e.fadeT > 0 ? 0.35 : 1);
  if (e.elite) {
    const R = 2; let au = ENEMY_ART.aura(key, anim, frame, ecol, R); if (e.face < 0) au = flipOf(au);
    ctx.globalAlpha = spawnA * (0.55 + 0.3 * Math.sin(G.t * 4)); ctx.drawImage(au, x - R, y - R); ctx.globalAlpha = spawnA;
    drawEliteAura(ctx, e);
  }
  ctx.drawImage(hitF(e) ? silOf(img, '#ffffff') : img, x, y);
  if (e.state === 'wind' && !e.boss && e.act === 'brute') { ctx.globalAlpha = spawnA * (0.2 + 0.2 * Math.sin(e.anim * 30)); ctx.drawImage(silOf(img, '#ff5040'), x, y); }
  ctx.globalAlpha = spawnA * (e.fadeT > 0 ? 0.35 : 1);
  rimBody(ctx, img, x, y, vx, vy - 10, e, 0, 0, e.boss || e.elite);   // M4a rim light (phone: bosses and elites only)
  if (typeof STATUS !== 'undefined') STATUS.body(ctx, e, img, 0, 0, img.width, img.height, x, y, img.width, img.height, null, null, lights);   // the frozen tint lives here now
  ctx.globalAlpha = 1;
  if (e.eShield > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#cfe6ff', 0.4 + 0.4 * e.eShield / e.eShieldMax); projRing(ctx, e.x, e.y, 0.2, e.r + 0.45); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  if (e.stunT > 0 && !e.frozen) for (let k = 0; k < 3; k++) { const a = G.t * 6 + k * 2.1; ctx.fillStyle = '#ffe36a'; ctx.fillRect(Math.round(vx + Math.cos(a) * 6), Math.round(y - 4 + Math.sin(a) * 2), 1, 1); }
}

// what an enemy looks like: its own sprite (ART.custom or a 12-frame ENEMY_SPRITES set), else the row's `look`
// (another enemy's art, tinted by this row's blood colour), else its legacy built-in drawing by type
const LOOK_CACHE = {};
function enemyLook(def, type) {
  const key = type + '|' + def.sprite + '|' + def.look, hit = LOOK_CACHE[key];
  if (hit && (hit.img || !def.sprite || !ART.custom[def.sprite])) return hit;
  let out = { kind: null, img: null, tint: null, id: def.sprite };
  const ES = typeof ENEMY_SPRITES !== 'undefined' ? ENEMY_SPRITES : null;
  if (def.sprite && ES && ES[def.sprite] && !ART.custom[def.sprite]) {
    try { const S = ES[def.sprite]; ART.custom[def.sprite] = spriteFromData(S.rows ? S : Object.assign({ rows: (S.frames.idle || S.frames.move)[0] }, S)); ART.customF[def.sprite] = flipH(ART.custom[def.sprite]); } catch (err) { /* broken sprite: fall back */ }
  }
  if (def.sprite && ART.custom[def.sprite]) out.img = ART.custom[def.sprite];
  else if (def.look && ENEMY[def.look]) {
    const L = ENEMY[def.look];
    if (L.sprite && ART.custom[L.sprite]) { out.img = ART.custom[L.sprite]; out.id = L.sprite; } else out.kind = def.look;
    out.tint = def.blood || null;
  } else out.kind = null;
  if (!out.img && !out.kind) {
    out.kind = ['slime', 'hound', 'wisp', 'boss', 'dummy'].includes(type) ? type : def.ai === 'boss' ? 'boss' : def.ai === 'dummy' ? 'dummy' : null;
    if (!out.kind) { const og = ART.custom.ogre; if (og) { out.img = og; out.id = 'ogre'; out.tint = def.blood || '#c7a8ff'; } else out.kind = 'slime'; }   // no art yet
  }
  return (LOOK_CACHE[key] = out);
}
// 12-frame sets (ENEMY_SPRITES[id].frames: idle 2, move 4, wind 2, attack 2, hurt 1, die 1), built once per id
const FRAME_CACHE = {};
function enemyFrame(look, e) {
  const ES = typeof ENEMY_SPRITES !== 'undefined' ? ENEMY_SPRITES : null, S = ES && ES[look.id];
  if (S && S.frames) {
    let F = FRAME_CACHE[look.id];
    if (!F) { F = FRAME_CACHE[look.id] = {}; for (const k in S.frames) F[k] = S.frames[k].map(rows => { const c = spriteFromData({ w: S.w, h: S.h, pal: S.pal, rows }); return { n: c, f: flipH(c) }; }); }
    const st = hitF(e) && F.hurt ? 'hurt' : e.state === 'wind' && F.wind ? 'wind' : e.state !== 'chase' && e.state !== 'rec' && F.attack ? 'attack' : e.state === 'chase' && !e.asleep && F.move ? 'move' : 'idle';
    const L = F[st] || F.idle || F.move, fr = L[Math.floor(e.anim * (st === 'move' ? 8 : 4)) % L.length];
    return e.face < 0 ? fr.f : fr.n;
  }
  return e.face < 0 ? ART.customF[look.id] : look.img;
}
function drawBurrowed(ctx, e, vx, vy) {
  ctx.fillStyle = rgba('#3a2c20', 0.85); ctx.beginPath(); ctx.ellipse(Math.round(vx), Math.round(vy), 6 + Math.sin(G.t * 12) * 1, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (Math.random() < 0.4) addPart({ x: e.x + frand(-0.3, 0.3), y: e.y + frand(-0.3, 0.3), z: 0.1, vx: frand(-0.5, 0.5), vy: frand(-0.5, 0.5), vz: frand(1, 2), life: 0.4, t: 0, col: pick2(['#6a5a3a', '#a08860']), grav: 6, size: 1, glow: false });
}
function drawEliteAura(ctx, e) {
  const mods = e.mods || [], col = (mods[0] && ELITE_MODS[mods[0]] && ELITE_MODS[mods[0]].col) || '#ffd35a';
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(col, 0.55 + 0.25 * Math.sin(G.t * 4)); ctx.lineWidth = 1;
  projRing(ctx, e.x, e.y, 0.05, e.r + 0.35); ctx.stroke();
  if (mods.includes('storm') || mods.includes('gloomed') || mods.includes('frozen')) { ctx.strokeStyle = rgba(col, 0.2); projRing(ctx, e.x, e.y, 0.05, mods.includes('gloomed') ? 3 : mods.includes('frozen') ? 2.4 : 1.8); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  if (Math.random() < 0.2) addPart({ x: e.x + frand(-0.4, 0.4), y: e.y + frand(-0.4, 0.4), z: e.z + frand(0.5, e.hgt), vx: 0, vy: 0, vz: 1, life: 0.6, t: 0, col, grav: 0, size: 1, glow: true });
}
// fishing spot stub: rings on the water and a glint
function drawFishSpot(ctx, it, vx, vy, lights) {
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 2; k++) { const f = (G.t * 0.6 + k * 0.5 + it.x) % 1; ctx.strokeStyle = rgba('#bff4ff', 0.5 * (1 - f)); ctx.lineWidth = 1; projRing(ctx, it.x, it.y, it.z, 0.2 + f * 0.6); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  if (Math.sin(G.t * 2 + it.y) > 0.9) glowDot(ctx, vx + 2, vy - 1, '#bff4ff', '#ffffff', 1);
  lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 16, col: '#9fe8ff', a: 0.4 });
}

function drawProj(ctx, pr, lights) {
  const [vx, vy] = worldToView(pr.x, pr.y, pr.z);
  const sa = Math.atan2(8 * (pr.vx + pr.vy), 16 * (pr.vx - pr.vy));
  const L = (r, a) => lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r, col: pr.col, a });
  if (pr.kind === 'arrow') {
    ctx.save(); ctx.translate(Math.round(vx), Math.round(vy)); ctx.rotate(sa); ctx.drawImage(ART.weapons.arrow, -8, -1); if (pr.big) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.fillRect(-14, -1, 14, 3); } ctx.restore();
    L(pr.big ? 40 : 16, 0.5);
  } else if (pr.kind === 'wave') {
    ctx.globalCompositeOperation = 'lighter';
    const ang = Math.atan2(pr.vy, pr.vx);
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(pr.col, 0.9 - k * 0.25); ctx.lineWidth = 3 - k; projRing(ctx, pr.x - Math.cos(ang) * k * 0.25, pr.y - Math.sin(ang) * k * 0.25, pr.z * 0.5, 1.1, ang - 1.1, ang + 1.1, 16); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    L(70, 0.9);
  } else {
    const core = pr.kind === 'fire' ? '#fff0c0' : '#ffffff', r = pr.kind === 'orb' ? 2 : (pr.kind === 'fire' ? 2 : 1);
    glowDot(ctx, vx, vy, pr.col, core, r);
    if (Math.random() < 0.7) addPart({ x: pr.x, y: pr.y, z: pr.z, vx: 0, vy: 0, vz: 0.2, life: 0.25, t: 0, col: pr.col, grav: 0, size: 1, glow: true });
    L(pr.kind === 'fire' ? 50 : 34, 0.9);
  }
}

function drawEffect(ctx, e, lights) {
  const k = clamp(e.t / e.life, 0, 1);
  if (e.type === 'slash') {
    const n = 18, a0 = e.ang - e.arc / 2, a1 = e.ang + e.arc / 2;
    const sweep = Math.min(1, k * 3);
    for (let layer = 0; layer < 2; layer++) {
      ctx.strokeStyle = rgba(layer ? '#ffffff' : e.col, (1 - k) * (layer ? 0.9 : 0.75));
      ctx.lineWidth = Math.max(1, (layer ? e.w * 0.35 : e.w) * (1 - k));
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const t = i / n; if (t > sweep) break;
        const aa = e.dir < 0 ? a1 - (a1 - a0) * t : a0 + (a1 - a0) * t;
        const rr = e.r * (0.85 + 0.15 * Math.sin(t * Math.PI));
        const [vx, vy] = worldToView(e.x + Math.cos(aa) * rr, e.y + Math.sin(aa) * rr, e.z + 1.2);
        i ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
      }
      ctx.stroke();
    }
    lights.push({ sx: isoX(e.x + Math.cos(e.ang) * e.r * 0.7, e.y + Math.sin(e.ang) * e.r * 0.7), sy: isoY(e.x + Math.cos(e.ang) * e.r * 0.7, e.y + Math.sin(e.ang) * e.r * 0.7, e.z + 1), r: 50 * e.r, col: e.col, a: 0.8 * (1 - k) });
  } else if (e.type === 'ring') {
    ctx.strokeStyle = rgba(e.col, 1 - k); ctx.lineWidth = 2;
    projRing(ctx, e.x, e.y, 0.1, e.r * (0.25 + 0.75 * Math.sqrt(k))); ctx.stroke();
    lights.push({ sx: isoX(e.x, e.y), sy: isoY(e.x, e.y), r: e.r * 30, col: e.col, a: 0.8 * (1 - k) });
  } else if (e.type === 'pillar') {
    const [vx, vy] = worldToView(e.x, e.y, 0), wdt = Math.max(2, e.r * 16 * (1 - k * 0.8));
    const g = ctx.createLinearGradient(vx - wdt, 0, vx + wdt, 0);
    g.addColorStop(0, rgba(e.col, 0)); g.addColorStop(0.5, rgba(e.col, 1 - k)); g.addColorStop(1, rgba(e.col, 0));
    ctx.fillStyle = g; ctx.fillRect(vx - wdt, 0, wdt * 2, vy);
    ctx.fillStyle = rgba('#ffffff', (1 - k) * 0.9); ctx.fillRect(Math.round(vx - wdt * 0.15), 0, Math.max(1, Math.round(wdt * 0.3)), vy);
    ctx.fillStyle = rgba(e.col, 0.25 * (1 - k)); projRing(ctx, e.x, e.y, 0, e.r); ctx.fill();
    lights.push({ sx: isoX(e.x, e.y), sy: isoY(e.x, e.y) - 20, r: e.r * 40, col: e.col, a: 0.6 * (1 - k) });
  } else if (e.type === 'meteor') {
    const [vx, vy] = worldToView(e.x, e.y, 0);
    const kk = k * k, sx = vx + (1 - kk) * 120, sy = vy - (1 - kk) * 260;
    const r = e.small ? 2 : 5;
    for (let i = 1; i < 8; i++) { ctx.fillStyle = rgba(e.col, 0.5 - i * 0.06); const s = Math.max(1, r - i * 0.5); ctx.fillRect(Math.round(sx + i * 5 - s / 2), Math.round(sy - i * 11 - s / 2), Math.ceil(s), Math.ceil(s)); }
    glowDot(ctx, sx, sy, e.col, '#ffffff', r);
    ctx.globalCompositeOperation = 'lighter';
    lights.push({ sx: sx + camX - RW / 2, sy: sy + camY - RH / 2, r: e.small ? 30 : 80, col: e.col, a: 0.9 });
  } else if (e.type === 'beam') {
    const [ax, ay] = worldToView(e.x, e.y, e.z), [bx, by] = worldToView(e.x + Math.cos(e.ang) * e.len, e.y + Math.sin(e.ang) * e.len, e.z);
    for (const [wd, a] of [[9, 0.35], [5, 0.6], [2, 1]]) { ctx.strokeStyle = rgba(a === 1 ? '#ffffff' : e.col, a * (1 - k)); ctx.lineWidth = wd * (1 - k * 0.6); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
    for (let i = 0; i <= 5; i++) { const t = i / 5; lights.push({ sx: isoX(e.x + Math.cos(e.ang) * e.len * t, e.y + Math.sin(e.ang) * e.len * t), sy: isoY(e.x + Math.cos(e.ang) * e.len * t, e.y + Math.sin(e.ang) * e.len * t, e.z), r: 50, col: e.col, a: 0.7 * (1 - k) }); }
  } else if (e.type === 'lightning') {
    for (const [wd, col] of [[3, e.col], [1, '#ffffff']]) {
      ctx.strokeStyle = rgba(col, 1 - k); ctx.lineWidth = wd; ctx.beginPath();
      e.pts.forEach((pt, i) => {
        const [vx, vy] = worldToView(pt[0], pt[1], pt[2]);
        if (!i) { ctx.moveTo(vx, vy); return; }
        const [px, py] = worldToView(...e.pts[i - 1]);
        for (let s = 1; s <= 4; s++) { const t = s / 4; ctx.lineTo(lerp(px, vx, t) + (s < 4 ? frand(-4, 4) : 0), lerp(py, vy, t) + (s < 4 ? frand(-4, 4) : 0)); }
      });
      ctx.stroke();
    }
    for (const pt of e.pts) lights.push({ sx: isoX(pt[0], pt[1]), sy: isoY(pt[0], pt[1], pt[2]), r: 40, col: e.col, a: 1 - k });
  } else if (e.type === 'arrowfall') {
    const [vx, vy] = worldToView(e.x, e.y, 0);
    ctx.fillStyle = rgba('#e7eeff', 1 - k); ctx.fillRect(Math.round(vx), Math.round(vy - 30 * (1 - k) - 6), 1, 6);
  }
}

// rgbaQ(hex, a): rgba() with the alpha snapped to 1/255 (the canvas keeps 8-bit colour), from a per-colour table built on first
// use: the particle passes draw ~150 rects a frame and each used to build a fresh rgba() string (§26.4: no per-frame allocations)
const RGBA_Q = new Map();
function rgbaQ(hex, a) {
  let t = RGBA_Q.get(hex);
  if (!t) { if (RGBA_Q.size > 256) RGBA_Q.clear(); const c = hexToRgb(hex); t = new Array(256); for (let i = 0; i < 256; i++) t[i] = `rgba(${c[0]},${c[1]},${c[2]},${i / 255})`; RGBA_Q.set(hex, t); }
  return t[a <= 0 ? 0 : a >= 1 ? 255 : Math.round(a * 255)];
}
function drawParticles(ctx, lights) {
  const ox = RW / 2 - camX, oy = RH / 2 - camY;   // worldToView without the per-particle array
  for (const f of (G.amb || [])) {
    const vx = isoX(f.x, f.y) + ox, vy = isoY(f.x, f.y, f.z) + oy;
    if (vx < -10 || vx > RW + 10 || vy < -10 || vy > RH + 10) continue;
    const fade = Math.min(1, f.t, f.life - f.t), x = Math.round(vx), y = Math.round(vy);
    ctx.globalCompositeOperation = 'lighter';
    if (f.k === 'fly') {
      const a = (0.5 + 0.5 * Math.sin(G.t * 3 + f.ph)) * fade;
      ctx.fillStyle = rgbaQ('#dcffa0', a); ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = rgbaQ('#c8ff8c', a * 0.35); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      if (a > 0.5) lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 14, col: '#d8ff9a', a: a * 0.6 });
    } else if (f.k === 'mote') {
      ctx.fillStyle = rgbaQ('#ffe2b4', fade * (0.35 + 0.3 * Math.sin(G.t * 2 + f.ph))); ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.fillStyle = rgbaQ('#ff78aa', fade * 0.8); ctx.fillRect(x, y, 1, 1);
    }
  }
  let op = null;
  for (const q of G.parts) {
    const vx = isoX(q.x, q.y) + ox, vy = isoY(q.x, q.y, q.z) + oy;
    const a = 1 - q.t / q.life, o = q.glow ? 'lighter' : 'source-over';
    if (o !== op) { ctx.globalCompositeOperation = op = o; }
    ctx.fillStyle = rgbaQ(q.col, q.mist ? a * 0.35 : a);
    const s = q.mist ? Math.round(q.size + q.t * 3) : q.size;
    ctx.fillRect(Math.round(vx - s / 2), Math.round(vy - s / 2), s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// perf (§26.4 step 5): each fog layer used to upscale the 128 px texture with smoothing on every tile, every frame (a smoothed
// scale is ~5x a 1:1 blit in the software rasteriser). The texture is now scaled once per (texture, size) with the same
// smoothing into a cached canvas and blitted 1:1 at the same whole-pixel offsets, starting at the first tile that can show
// (ox, oy are in (-size, 0], so the old extra row / column above and left of them was always fully off screen).
const FOG_SCALED = new WeakMap();
function fogTile(tex, size) {
  let m = FOG_SCALED.get(tex); if (!m) FOG_SCALED.set(tex, m = {});
  let c = m[size];
  if (!c) { const v = makeCanvas(size, size); v.x.imageSmoothingEnabled = true; v.x.drawImage(tex, 0, 0, size, size); c = m[size] = v.c; }
  return c;
}
// ===== fog clear zone around the hero (Lumina item 9, docs/meetings/2026-10-20-lumina.md; see docs/CREDITS.md) ==============
// The fog layers used to lie on the hero as thickly as on the distance (the "washed" play band, §29.1). On the 'high' tier the
// layers go into one cached buffer (FOGB, full res: a half-res buffer would need a smoothed 2x upscale, the costliest blit in
// the software rasteriser - measured), a soft radial hole is cut out of it with destination-out at the hero (FOG_HOLE: 85 %
// clear inside 40 px, back to full haze at 110 px) and the buffer is laid on the scene in one blit. The buffer is rebuilt only
// when a layer's whole-pixel offset, its alpha or the hero's screen spot changes. Phone tiers draw the layers directly (no hole).
const FOG_LAYERS = [], FOGB = makeCanvas(RW, RH), FOG_HOLE = { R: 110, inner: 40, a: 0.85, c: null }, FOGK = { key: '' };
function fogOff(size, par, spx, spy) { return [Math.round(-(((camX * par + G.t * spx) % size) + size) % size), Math.round(-(((camY * par + G.t * spy) % size) + size) % size)]; }
function drawFogClear(ctx, layers, at) {
  const hx = Math.round(at[0]), hy = Math.round(at[1] - 10);
  let key = hx + ',' + hy;
  for (const L of layers) { const [x, y] = fogOff(L[1], L[2], L[3], L[4]); key += '|' + x + ',' + y + ',' + Math.round(L[5] * 1000); }
  if (key !== FOGK.key) {
    FOGK.key = key; const x = FOGB.x;
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, RW, RH);
    for (const L of layers) drawFog(x, L[0], L[1], L[2], L[3], L[4], L[5]);
    if (!FOG_HOLE.c) {
      const H = FOG_HOLE, v = makeCanvas(H.R * 2, H.R * 2), g = v.x.createRadialGradient(H.R, H.R, 0, H.R, H.R, H.R);
      g.addColorStop(0, `rgba(0,0,0,${H.a})`); g.addColorStop(H.inner / H.R, `rgba(0,0,0,${H.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      v.x.fillStyle = g; v.x.fillRect(0, 0, H.R * 2, H.R * 2); H.c = v.c;
    }
    x.globalCompositeOperation = 'destination-out'; x.drawImage(FOG_HOLE.c, hx - FOG_HOLE.R, hy - FOG_HOLE.R); x.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(FOGB.c, 0, 0);
}
function drawFog(ctx, tex, size, par, spx, spy, alpha) {
  const ox = -(((camX * par + G.t * spx) % size) + size) % size, oy = -(((camY * par + G.t * spy) % size) + size) % size;
  const t = fogTile(tex, size), x0 = Math.round(ox), y0 = Math.round(oy);
  ctx.globalAlpha = alpha;
  for (let y = y0; y < RH; y += size) for (let x = x0; x < RW; x += size) ctx.drawImage(t, x, y);
  ctx.globalAlpha = 1;
}

// §16.6.1: one cached 64x64 radial sprite per light colour (alpha 1 -> 0), drawn scaled with globalAlpha = L.a.
// A linear alpha ramp scaled by globalAlpha equals the old per-light rgba(col, a) -> rgba(col, 0) gradient.
const COARSE_POINTER = PHONE || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
// ===== quality tiers (docs/design/pillars-and-rules.md steps 3-4) ==============================================================================
//   high  : desktop, the reference look (every pass below at full quality; the fog clear zone around the hero)
//   phone : PHONE / coarse pointer. Lightmap and bloom upscaled without smoothing (the smoothed full-res upscales are the
//           costliest single blits in a software rasteriser); the bloom glow is smoothed to half res first, so it stays soft
//           (2 x 2 blocks of an already blurred glow), and re-extracted every other frame; no soft-light colour grade; at most
//           24 lights; one fog layer (§16.6.6); particle cap 300 (main.js boot); HUD backing store at 1x (main.js fit).
//   low   : phone + no bloom, no light halos, no god rays, at most 16 lights.
// A phone starts on 'phone'; main.js GOV (the resolution governor) moves it along DPR rungs and, below the lowest rung, to 'low'
// and back. ?quality=high|phone|low pins a tier (no governor): the client's A/B on a real device.
const QUALITY_TIERS = {
  high: { lmSmooth: true, bloom: 'full', grade: true, halos: true, rays: true, lights: 40, fogHole: true },
  phone: { lmSmooth: false, bloom: 'half', grade: false, halos: true, rays: true, lights: 24, fogHole: false },
  low: { lmSmooth: false, bloom: 'off', grade: false, halos: false, rays: false, lights: 16, fogHole: false },
};
const QUALITY = (() => {
  let q = null; try { q = new URLSearchParams(location.search).get('quality'); } catch (e) { /* no location */ }
  const pinned = !!QUALITY_TIERS[q], tier = pinned ? q : COARSE_POINTER ? 'phone' : 'high';
  // ?fog=plain | ?fog=clear: force the fog clear zone off / on for every tier (A/B on a device)
  let f = null; try { f = new URLSearchParams(location.search).get('fog'); } catch (e) { /* no location */ }
  if (f === 'plain' || f === 'clear') for (const k in QUALITY_TIERS) QUALITY_TIERS[k].fogHole = f === 'clear';
  return { tier, pinned, cfg: QUALITY_TIERS[tier] };
})();
function setQuality(tier) { if (!QUALITY_TIERS[tier]) return; QUALITY.tier = tier; QUALITY.cfg = QUALITY_TIERS[tier]; BH.ok = false; FOGK.key = ''; }
const LIGHT_STATS = { inView: 0, drawn: 0, litTiles: 0 };
const LM_TILES = { t: 15, nx: RW / 2 / 15, ny: RH / 2 / 15, mark: new Uint8Array((RW / 2 / 15) * (RH / 2 / 15)) };   // 16 x 9 tiles of 15 lightmap texels
const BH = makeCanvas(RW / 2, RH / 2);   // phone tier: the bloom glow smoothed up to half res, then blitted 2x without smoothing
const LIGHT_SPR = new Map();
function lightSprite(col) {
  let c = LIGHT_SPR.get(col);
  if (!c) {
    const v = makeCanvas(64, 64), g = v.x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(col, 1)); g.addColorStop(1, rgba(col, 0));
    v.x.fillStyle = g; v.x.fillRect(0, 0, 64, 64);
    c = v.c; if (LIGHT_SPR.size > 64) LIGHT_SPR.clear(); LIGHT_SPR.set(col, c);
  }
  return c;
}
// perf: every light used to be a smoothed scale of the 64 px sprite (twice: lightmap + halo); the scaled sprite is now cached per
// (colour, whole-pixel diameter) and blitted 1:1 at a whole-pixel spot (<= 0.5 px from the old sub-pixel placement; a flickering
// light's diameter moves through a dozen sizes). The cache is dropped whole past LIGHT_SIZED_MAX entries.
const LIGHT_SIZED = new Map(), LIGHT_SIZED_MAX = 384;
function lightSized(col, d) {
  const k = col + '|' + d;
  let c = LIGHT_SIZED.get(k);
  if (!c) {
    if (LIGHT_SIZED.size >= LIGHT_SIZED_MAX) LIGHT_SIZED.clear();
    const v = makeCanvas(d, d); v.x.imageSmoothingEnabled = true; v.x.drawImage(lightSprite(col), 0, 0, d, d);
    LIGHT_SIZED.set(k, c = v.c);
  }
  return c;
}
// ===== light cap with hysteresis (Lumina LightPool rules, docs/design/pillars-and-rules.md; see docs/CREDITS.md) ==================================
// The cap used to hard-sort every frame, so at 40 lights a light near the rank boundary popped on and off. Now: a light keeps a
// record across frames (map lights by object; per-frame lights - VFX, fireflies, braziers - by the nearest same-colour light of
// the last frame within 10 px), the lit set is re-ranked every LP_RERANK s with LP_HYST off the cost of lights already lit,
// and a light that gains or loses its slot fades over LP_FADE s instead of popping. Cost (lower = better) is in tile units:
// distance from the view centre (22 px a unit) minus 3 x log2(1 + strength / 40); the hero's light (keep) always wins.
// Under the cap a new light shows at once; in a capped view it starts dark, an immediate re-rank decides, and it fades into a
// freed slot. Under the cap every record simply fades to full.
const LP_RERANK = 0.2, LP_FADE = 0.35, LP_HYST = 2, LPOOL = { recs: new WeakMap(), prev: [], cur: [], t: 0, timer: 0 };
let LIGHT_VIS = [];
const lightCost = (vx, vy, L, lit) => L.keep ? -1e9 : Math.hypot(vx - RW / 2, vy - RH / 2) / 22 - 3 * Math.log2(1 + clamp(L.a, 0, 1) * L.r / 40) - (lit ? LP_HYST : 0) + (L.stat ? 40 : 0);   // status lights (L.stat) lose slots first
function lightPool(vis, cap) {
  const P = LPOOL, now = G.t, dt = clamp(now - P.t, 0, 0.1), capped = vis.length > cap; P.t = now;
  const cur = P.cur; cur.length = 0; let fresh = false;
  for (const v of vis) {
    const L = v[2]; let r = P.recs.get(L);
    if (r && now - r.seen > 0.5) r = null;   // a map light back in view after a while starts over
    if (!r && !L.__st) {   // a per-frame light: the nearest same-colour record of the last frame
      let best = null, bd = 100;
      for (const q of P.prev) if (!q.claimed && !q.st && q.col === L.col) { const d = (q.vx - v[0]) ** 2 + (q.vy - v[1]) ** 2; if (d < bd) { bd = d; best = q; } }
      r = best;
    }
    if (!r) { r = { st: !!L.__st, col: L.col, lit: true, w: capped ? 0 : 1 }; if (capped) fresh = true; }
    if (L.__st) P.recs.set(L, r);
    r.claimed = true; r.seen = now; r.vx = v[0]; r.vy = v[1]; r.v = v; cur.push(r);
  }
  P.timer -= dt;
  if (P.timer <= 0 || fresh) {
    P.timer = LP_RERANK;
    if (capped) { cur.sort((a, b) => lightCost(a.vx, a.vy, a.v[2], a.lit) - lightCost(b.vx, b.vy, b.v[2], b.lit)); cur.forEach((r, i) => { r.lit = i < cap; }); }
    else for (const r of cur) r.lit = true;
  }
  // slots: at most `cap` lights draw. Lights losing their slot fade out first; a light given a slot fades in once one is free
  // (a re-rank hands it the slot, the fade-out of the old owner frees it), so the count never passes the cap.
  const out = []; let used = 0;
  for (const r of cur) {
    r.claimed = false;
    if (r.v[2].keep) { r.w = 1; continue; }
    if (!r.lit) r.w = clamp(r.w - dt / LP_FADE, 0, 1);
    if (r.lit && r.w > 0) r.w = clamp(r.w + dt / LP_FADE, 0, 1);
  }
  for (const r of cur) if (r.v[2].keep || r.w > 0) used++;
  for (const r of cur) if (r.lit && r.w === 0 && !r.v[2].keep && used < cap) { r.w = Math.min(1, dt / LP_FADE) || 0.05; used++; }
  for (const r of cur) if (r.w > 0) { r.v[3] = r.w; out.push(r.v); }
  P.cur = P.prev; P.prev = cur;
  return out;
}
// M4a white-out fix: the additive halos stacked with the bloom wherever lights crowd (the hero's lamp, Pip, a buff aura and a
// checkpoint crystal at the hero: 8-15 % of the 64 px window near-white). Halos now take the bloom weight too (emitters at their
// weight, at least HALO_DIM; untagged lights HALO_DIM), so at most the emitters' halo + bloom stack (two additive passes).
const HALO_DIM = 0.3, HALO_EM = 0.5, OWN_TOP = new Map();
function applyLighting(ctx, lights, th, ambient) {
  const x = LM.x, fc = typeof flashCap === 'function' ? flashCap() : 1;
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = ambient || th.ambient; x.fillRect(0, 0, RW / 2, RH / 2);
  x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true;
  let vis = [];
  for (const L of lights) {
    const vx = L.sx - camX + RW / 2, vy = L.sy - camY + RH / 2;
    if (vx < -L.r || vx > RW + L.r || vy < -L.r || vy > RH + L.r) continue;
    vis.push([vx, vy, L]);
  }
  LIGHT_STATS.inView = vis.length;
  vis = lightPool(vis, QUALITY.cfg.lights);   // the cap, with hysteresis + crossfades: each entry gains its weight w (0..1]
  LIGHT_STATS.drawn = vis.length; LIGHT_VIS = vis;
  // lights from one body merge (lighting doc): of the lights one body owns (L.own: its lamp, weapon, rarity, aura, status
  // lights) only the strongest keeps its halo and its bloom; the rest still light the lightmap
  const top = OWN_TOP; top.clear();
  for (const v of vis) { const L = v[2]; if (!L.own) continue; const q = top.get(L.own), k = L.a * L.r * (L.bloom > 0 ? 2 : 1); if (!q || k > q.k) top.set(L.own, { L, k }); }
  for (const v of vis) { const L = v[2]; L._sub = !!(L.own && top.get(L.own).L !== L); }
  const mark = LM_TILES.mark; mark.fill(0);
  for (const [vx, vy, L, w] of vis) {
    const d = Math.max(1, Math.round(L.r)), a = clamp(L.a, 0, 1) * w, lx = Math.round(vx / 2 - d / 2), ly = Math.round(vy / 2 - d / 2);
    if (a <= 0) continue;
    x.globalAlpha = a; x.drawImage(lightSized(L.col, d), lx, ly);
    // the lightmap tiles this light touches (+1 texel: the smoothed upscale reads one texel past the sprite)
    const T = LM_TILES.t, i0 = clamp(Math.floor((lx - 1) / T), 0, LM_TILES.nx - 1), i1 = clamp(Math.floor((lx + d + 1) / T), 0, LM_TILES.nx - 1);
    const j0 = clamp(Math.floor((ly - 1) / T), 0, LM_TILES.ny - 1), j1 = clamp(Math.floor((ly + d + 1) / T), 0, LM_TILES.ny - 1);
    if (lx + d + 1 < 0 || ly + d + 1 < 0 || lx - 1 >= RW / 2 || ly - 1 >= RH / 2) continue;
    const cx = lx + d / 2, cy = ly + d / 2, rr = (d / 2 + 1.5) * (d / 2 + 1.5);   // the sprite is a disc: mark only tiles it reaches
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const qx = clamp(cx, i * T, i * T + T), qy = clamp(cy, j * T, j * T + T);
      if ((qx - cx) * (qx - cx) + (qy - cy) * (qy - cy) <= rr) mark[j * LM_TILES.nx + i] = 1;
    }
  }
  x.globalAlpha = 1;
  perfMark('lights.lm');
  // multiply the scene by the lightmap. Tiles no light reaches hold exactly the ambient colour, so they are multiplied by one
  // solid fill; the lit tiles get the upscaled lightmap through a rect clip (the same draw, the same pixels, only where lit):
  // the smoothed full-res upscale was the costliest blit of the frame and most of the view is usually plain ambient.
  ctx.globalCompositeOperation = 'multiply';
  const T2 = LM_TILES.t * 2;
  let lit = 0, dark = 0;
  ctx.beginPath();
  for (let j = 0; j < LM_TILES.ny; j++) for (let i = 0; i < LM_TILES.nx; i++) if (!mark[j * LM_TILES.nx + i]) {
    let k = i; while (k + 1 < LM_TILES.nx && !mark[j * LM_TILES.nx + k + 1]) k++;
    ctx.rect(i * T2, j * T2, (k - i + 1) * T2, T2); dark++; i = k;
  } else lit++;
  if (dark) { ctx.fillStyle = ambient || th.ambient; ctx.fill(); }
  if (lit) {
    ctx.save(); ctx.beginPath();
    for (let j = 0; j < LM_TILES.ny; j++) for (let i = 0; i < LM_TILES.nx; i++) if (mark[j * LM_TILES.nx + i]) {
      let k = i; while (k + 1 < LM_TILES.nx && mark[j * LM_TILES.nx + k + 1]) k++;
      ctx.rect(i * T2, j * T2, (k - i + 1) * T2, T2); i = k;
    }
    ctx.clip(); ctx.imageSmoothingEnabled = QUALITY.cfg.lmSmooth;
    ctx.drawImage(LM.c, 0, 0, RW, RH);
    ctx.restore(); ctx.globalCompositeOperation = 'multiply';
  }
  LIGHT_STATS.litTiles = lit;
  perfMark('lights.mul');
  // additive halos — the "fake light" glow
  ctx.globalCompositeOperation = 'lighter';
  if (QUALITY.cfg.halos) for (const [vx, vy, L, w] of vis) {
    if (L._sub && !BLOOM_ALL) continue;   // merged into its body's strongest light
    const d = Math.max(1, Math.round(L.r * 1.1));
    const hw = BLOOM_ALL ? 1 : L.bloom > 0 ? HALO_EM : HALO_DIM;   // the halo follows the bloom whitelist: emitters HALO_EM (their bloom is the second pass), the rest HALO_DIM
    ctx.globalAlpha = clamp(L.a * 0.32 * fc * w * hw, 0, 1); ctx.drawImage(lightSized(L.col, d), Math.round(vx - d / 2), Math.round(vy - d / 2));
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
}

// ===== emitter-only bloom (docs/design/pillars-and-rules.md step 4; Lumina item 5, docs/meetings/2026-10-20-lumina.md; see docs/CREDITS.md) =========
// The bloom used to bright-pass the whole scene (v^4 of a 1/4-res copy), so a white slash, a hit flash or the Echo's bright body
// whited out the very target the fight is about. Now only EMITTERS go into the 1/4-res glow buffer (EM = BT): the drawn lights
// (cores 0.15 x their radius, weighted by the light pool: braziers / flames, projectiles and spells push lights too), the moon /
// sun halo, the water glints, and the VFX cores (the additive effects redrawn at 1/4 scale into VB - drawEffect only draws and
// pushes lights, no particles or randomness - then laid in at BLOOM_VFX alpha: VFX sit AT the threshold, not over it). The 1/8 mip gets a warm tint, the two are summed at 1/4 (BC) and added to the scene once, as before. No scene
// read-back, no bright-pass chain.
const BLOOM_LOW = 0.8, BLOOM_LIGHT = 0.55, BLOOM_CORE = 0.22, BLOOM_VFX = 0.45, BLOOM_MOON = 0.45, BLOOM_WARM = 'rgba(255,176,96,0.35)';
const VB = makeCanvas(RW / 4, RH / 4), BLOOM_SINK = [];   // VB: the VFX pass at 1/4; BLOOM_SINK swallows the lights it pushes
let BLOOM_MOONAT = null;   // [x, y, moon] of this frame's moon (drawScene), null when no sky was drawn
// ?bloom=all: every drawn light blooms at its full weight (the pre-M4a look, for A/B and the before / after shot)
const BLOOM_ALL = (() => { try { return new URLSearchParams(location.search).get('bloom') === 'all'; } catch (e) { return false; } })();
// tools (play.js, perf.js): near-white scene pixels (every channel >= 235) as a share of the whole scene, of the 64 px window
// around the hero and the worst such window around an enemy in view (docs/design/lighting-status-fx.md: at most 3 %)
function whiteOut() {
  const d = sctx.getImageData(0, 0, RW, RH).data;
  const win = (x0, y0, w, h) => {
    x0 = clamp(Math.round(x0), 0, RW); y0 = clamp(Math.round(y0), 0, RH); const x1 = clamp(x0 + w, 0, RW), y1 = clamp(y0 + h, 0, RH);
    let n = 0, t = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * RW + x) * 4; t++; if (d[i] >= 235 && d[i + 1] >= 235 && d[i + 2] >= 235) n++; }
    return t ? +(100 * n / t).toFixed(2) : 0;
  };
  const p = G.player, [hx, hy] = worldToView(p.x, p.y, p.z), out = { scene: win(0, 0, RW, RH), hero: win(hx - 32, hy - 46, 64, 64), enemy: 0 };
  for (const e of G.enemies) { if (e.dead) continue; const [vx, vy] = worldToView(e.x, e.y, e.z || 0); if (vx < 0 || vy < 0 || vx > RW || vy > RH) continue; out.enemy = Math.max(out.enemy, win(vx - 32, vy - 44, 64, 64)); }
  return out;
}
if (typeof window !== 'undefined') window.whiteOut = whiteOut;
function moonGlowQ(mo) {   // the moon halo at 1/4 scale, cached with the full one
  const k = 'glowq|' + mo.r + '|' + mo.glow; let c = MOON_CACHE.get(k);
  if (!c) { const g = moonGlow(mo), d = Math.max(1, Math.round(g.width / 4)), v = makeCanvas(d, d); v.x.imageSmoothingEnabled = true; v.x.drawImage(g, 0, 0, d, d); MOON_CACHE.set(k, c = v.c); }
  return c;
}
function bloomEmitters() {
  const w = RW / 4, h = RH / 4, x = BT.x;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true;
  if (BLOOM_MOONAT && BLOOM_MOONAT[2]) { const [mx, my, mo] = BLOOM_MOONAT, g = moonGlowQ(mo); x.globalAlpha = BLOOM_MOON; x.drawImage(g, Math.round(mx / 4 - g.width / 2), Math.round(my / 4 - g.height / 2)); }
  for (const [vx, vy, L, wt] of LIGHT_VIS) {
    const bw = BLOOM_ALL ? 1 : L._sub ? 0 : L.bloom || 0; if (bw <= 0) continue;   // the whitelist: untagged lights never bloom; one per body
    const d = Math.max(1, Math.round(L.r * BLOOM_CORE)); x.globalAlpha = clamp(L.a * BLOOM_LIGHT * wt * bw, 0, 1);
    x.drawImage(lightSized(L.col, d), Math.round(vx / 4 - d / 2), Math.round(vy / 4 - d / 2));
  }
  // water glints (this frame's, from drawWater's buffers): one quarter-res dot each
  const B = GLINT_BUF, n = B.q.length; let gl = false;
  for (let i = 0; i < n; i++) if (B.lv[i] > GLINT_LV / 2) { if (!gl) { x.beginPath(); gl = true; } x.rect(B.xy[i * 2] >> 2, B.xy[i * 2 + 1] >> 2, 1, 1); }   // the bright half: one path
  if (gl) { x.globalAlpha = 0.35; x.fillStyle = '#e6faff'; x.fill(); }
  // VFX cores: the additive effects, redrawn at 1/4 into VB, laid in at the threshold
  const v = VB.x; v.setTransform(1, 0, 0, 1, 0, 0); v.globalAlpha = 1; v.globalCompositeOperation = 'source-over'; v.clearRect(0, 0, w, h);
  let any = false;
  v.setTransform(0.25, 0, 0, 0.25, 0, 0); v.imageSmoothingEnabled = true; BLOOM_SINK.length = 0;
  for (const e of G.effects) if (e.type !== 'tele' && e.type !== 'marker' && e.type !== 'line' && e.type !== 'ghost' && e.type !== 'summon' && e.type !== 'aimflash') { v.globalCompositeOperation = 'lighter'; drawEffect(v, e, BLOOM_SINK); any = true; }
  v.setTransform(1, 0, 0, 1, 0, 0); v.globalAlpha = 1; v.globalCompositeOperation = 'source-over'; BLOOM_SINK.length = 0;
  if (any) { x.globalAlpha = BLOOM_VFX; x.drawImage(VB.c, 0, 0); }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
}
function applyBloom(ctx, strength) {
  const mode = QUALITY.cfg.bloom; if (mode === 'off' || strength <= 0) return;
  // phone ('half'): the glow is rebuilt every other frame (BH holds the last one; §26.4 frame-skip)
  if (mode === 'half' && (CHUNK.frame & 1) && BH.ok) { bloomBlit(ctx, BH.c, strength, false); return; }
  const w = RW / 4, h = RH / 4;
  bloomEmitters();
  B2.x.imageSmoothingEnabled = true; B2.x.globalCompositeOperation = 'source-over'; B2.x.clearRect(0, 0, RW / 8, RH / 8); B2.x.drawImage(BT.c, 0, 0, RW / 8, RH / 8);
  B2.x.globalCompositeOperation = 'source-atop'; B2.x.fillStyle = BLOOM_WARM; B2.x.fillRect(0, 0, RW / 8, RH / 8); B2.x.globalCompositeOperation = 'source-over';   // the warm low mip
  // the two glow layers are summed at 1/4 res (BC) so the full-res additive pass runs once (0.4 x EM + 0.6 x the 1/8 mip)
  BC.x.imageSmoothingEnabled = true; BC.x.globalCompositeOperation = 'source-over'; BC.x.clearRect(0, 0, w, h);
  BC.x.globalAlpha = 0.4; BC.x.drawImage(BT.c, 0, 0);
  BC.x.globalCompositeOperation = 'lighter'; BC.x.globalAlpha = BLOOM_LOW; BC.x.drawImage(B2.c, 0, 0, w, h);
  BC.x.globalAlpha = 1; BC.x.globalCompositeOperation = 'source-over';
  let src = BC.c;
  if (mode === 'half') { BH.x.imageSmoothingEnabled = true; BH.x.clearRect(0, 0, RW / 2, RH / 2); BH.x.drawImage(BC.c, 0, 0, RW / 2, RH / 2); src = BH.c; BH.ok = true; }
  bloomBlit(ctx, src, strength, mode === 'full');
}
function bloomBlit(ctx, src, strength, smooth) {
  ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = smooth;
  ctx.globalAlpha = strength; ctx.drawImage(src, 0, 0, RW, RH);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
}
