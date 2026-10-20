'use strict';
// ---------------------------------------------------------------------------
// Scene rendering + post-processing: fake lights (lightmap multiply + additive
// halos), bloom (cubed bright-pass at 1/4 & 1/8 res), drifting fog & mist,
// god rays, vignette.
// Big maps (DESIGN §25.2): drawScene reads the ground from the chunk cache (maps.js CHUNK; drawGround + groundTick
// here schedule the builds: the chunk under the camera synchronously, visible-missing chunks next with a large
// budget, then a prefetch ring on idle frames), and queries the spatial grid for objects, columns, water glints and
// static lights inside the view instead of walking whole-map lists. Lights: at most LIGHT_MAX visible (the hero's
// own light always kept). Sections: the lightmap ambient follows sectionAt(hero) (ambient / dark, lerped ~0.4 s);
// dark sections give the hero a lantern and thin the fog.
// ---------------------------------------------------------------------------
const SCN = makeCanvas(RW, RH), sctx = SCN.x;
const LM = makeCanvas(RW / 2, RH / 2);
const B1 = makeCanvas(RW / 4, RH / 4), BT = makeCanvas(RW / 4, RH / 4), B2 = makeCanvas(RW / 8, RH / 8);
let VIGNETTE = null, GRADE = {};
const silCache = new WeakMap();
const silOf = (img, col) => { let m = silCache.get(img); if (!m) silCache.set(img, m = {}); return m[col] || (m[col] = silhouette(img, col)); };

let camX = 0, camY = 0;
const worldToView = (x, y, z = 0) => [isoX(x, y) - camX + RW / 2, isoY(x, y, z) - camY + RH / 2];
const sToView = (sx, sy) => [sx - camX + RW / 2, sy - camY + RH / 2];

function prepTheme(m) {
  const th = m.theme;
  if (th._bg) return;
  const jag = m.themeId === 'ruins' ? true : th.pines ? 'pines' : false;
  th._bg = {
    sky: buildSky(th),
    far: buildMountains(th, th.seed, th.mtnFar[0], th.mtnFar[1], th.mtnFar[2], 110, jag),
    near: buildMountains(th, th.seed + 5, th.mtnNear[0], th.mtnNear[1], th.mtnNear[2], 70, jag),
    clouds: [0, 1, 2, 3].map(i => buildCloud(th.seed * 10 + i, 90 + i * 14, 40 + (i % 2) * 10, th.cloud)),
    sea: [0, 1, 2].map(i => buildCloud(th.seed * 20 + i, 150, 46, th.cloud)),
    fog: buildFog(th.seed, th.fog),
    fog2: buildFog(th.seed + 7, th.fog2),
    islets: [0, 1, 2].map(i => buildIslet(th, th.seed * 30 + i, 30 + i * 8)),
  };
}
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
    if (ch) { ch.last = CHUNK.frame; ctx.drawImage(ch.c, dx, dy); continue; }
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
const IDLE_MS = PHONE ? 1.5 : 2.5;
function groundTick(m, idle, sceneMs = 0) {
  const cg = chunkGrid(m), g = m.gp, S = cg.S, t0 = performance.now();
  const c0 = chunkAt(m, camX, camY);   // the chunk under the camera: always built now (start, respawn, warp arrival)
  if (!idle && !cg.empty[c0] && !chunkResident(m, c0)) { buildChunkStep(m, c0, Infinity); GROUND_STATS.syncBuilds++; }
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
  const budget = !idle ? (G.fade > 0.3 ? 14 : PHONE ? 6 : 8) : ema > 17.2 ? 0 : clamp(14 - sceneMs, 0, IDLE_MS);   // idle = the frame rate is holding
  want.sort((a, b) => a.pri - b.pri);
  const keep = new Set(want.map(w => chunkKey(m, w.idx)));
  for (const [k, job] of CHUNK.jobs) if (!keep.has(k) && (job.m !== m || CHUNK.frame - (job.touch || 0) > 60)) dropChunkJob(k, job);   // stale partial builds
  for (const w of want) {
    if (!idle && !w.visible) break;
    if (!w.visible && allowPre-- <= 0) break;
    const left = budget - (performance.now() - t0); if (left <= 0) break;
    if (!buildChunkStep(m, w.idx, left)) break;
  }
  GROUND_STATS.lastTickMs = (idle ? GROUND_STATS.lastTickMs : 0) + performance.now() - t0;
}
// the tile-space box that can hold anything visible (tall sprites and columns rise above their base: pad below)
function viewTiles(mx = 80, mTop = 40, mBot = 190) {
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
  groundTick(m, false);
  const look = sectionLook(m, p, th);
  const [vtx0, vty0, vtx1, vty1] = viewTiles();
  const viewObjs = gridQuery(m, 'objs', vtx0, vty0, vtx1, vty1);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;

  // ---- sky & distant world ----
  const pxs = clamp(-80 - camX * 0.02, -160, 0), pys = clamp(-50 - camY * 0.02, -90, 0);
  ctx.drawImage(bg.sky.c, Math.round(pxs), Math.round(pys));
  if (!th.moon.sun) for (const s of bg.sky.stars) {
    const a = 0.35 + 0.65 * Math.max(0, Math.sin(G.t * s.s * 2 + s.p));
    ctx.fillStyle = `rgba(255,248,255,${a * 0.9})`;
    const x = Math.round(s.x + pxs), y = Math.round(s.y + pys);
    ctx.fillRect(x, y, 1, 1);
    if (s.big) { ctx.fillStyle = `rgba(255,230,250,${a * 0.45})`; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
  }
  const mo = th.moon, mx = mo.x + pxs * 0.5, my = mo.y + pys * 0.5;
  const mg = ctx.createRadialGradient(mx, my, mo.r * 0.6, mx, my, mo.r * 3.2);
  mg.addColorStop(0, rgba(mo.glow, 0.45)); mg.addColorStop(1, rgba(mo.glow, 0));
  ctx.fillStyle = mg; ctx.fillRect(mx - mo.r * 4, my - mo.r * 4, mo.r * 8, mo.r * 8);
  if (mo.sun) { ctx.fillStyle = mo.col; ctx.beginPath(); ctx.arc(Math.round(mx), Math.round(my), mo.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(Math.round(mx), Math.round(my), mo.r * 0.7, 0, Math.PI * 2); ctx.fill(); }
  else drawMoon(ctx, mx, my, mo.r, mo.col);
  if (m.themeId === 'vale') drawMoon(ctx, mx - 70, my + 22, 7, '#d6e6ff');
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
  // god rays: dawn shafts from the low sun, slanting down to the right through the mist
  if (th.rays) {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {
      const a = th.rays.alpha * (0.6 + 0.4 * Math.sin(G.t * 0.35 + k * 1.3)), x0 = mx - 90 + k * 28, w0 = 6 + (k % 3) * 5;
      const g = ctx.createLinearGradient(x0, my, x0 + 220, RH);
      g.addColorStop(0, `rgba(255,214,160,${a})`); g.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, my); ctx.lineTo(x0 + w0, my); ctx.lineTo(x0 + 260 + w0 * 4, RH + 40); ctx.lineTo(x0 + 190, RH + 40); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (m.themeId === 'vale') {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const a = 0.035 + 0.025 * Math.sin(G.t * 0.5 + k * 1.7), x0 = mx - 30 + k * 18;
      const g = ctx.createLinearGradient(x0, my, x0 - 160, RH);
      g.addColorStop(0, `rgba(255,220,240,${a})`); g.addColorStop(1, 'rgba(255,220,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, my); ctx.lineTo(x0 + 10 + k * 3, my); ctx.lineTo(x0 - 140 + k * 10, RH); ctx.lineTo(x0 - 200 + k * 6, RH); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // cloud sea far below
  const groundBot = (m.W + m.H) * 8 + 12;
  bg.sea.forEach((c, i) => {
    for (let r = 0; r < 2; r++) {
      const x = ((i * 230 + r * 330 - camX * 0.6 + G.t * 6) % 900) - 220, y = groundBot + th.underDepth * 0.55 + i * 18 + r * 30 - camY * 0.85 + RH / 2;
      ctx.globalAlpha = 0.6; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
    }
  });

  // ---- island ----
  drawGround(ctx, m);
  for (const f of m.falls) if (f.edge) drawFall(ctx, f, true);
  drawWater(ctx, m, vtx0, vty0, vtx1, vty1);
  if (m.hasRunes) drawSigil(ctx, m, lights);

  // clouds drifting in front of the underside
  bg.sea.forEach((c, i) => {
    const x = ((i * 260 + 100 - camX + G.t * 9) % 1000) - 260, y = groundBot + th.underDepth * 0.82 + i * 10 - camY + RH / 2;
    ctx.globalAlpha = 0.85; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
  });

  // ---- ground decals: shadows, telegraphs, zones ----
  ctx.fillStyle = 'rgba(20,8,40,0.32)';
  const shadow = (x, y, z, r) => { const [vx, vy] = worldToView(x, y, z); ctx.beginPath(); ctx.ellipse(Math.round(vx), Math.round(vy), r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); };
  for (const o of viewObjs) if (o.shadow && !o.gone) shadow(o.x, o.y, o.z, o.shadow);
  if (!p.dead) shadow(p.x, p.y, tileH(m, p.x, p.y), 6);
  const inViewE = e => { const vx = isoX(e.x, e.y) - camX + RW / 2, vy = isoY(e.x, e.y, e.z || 0) - camY + RH / 2; return vx > -90 && vx < RW + 90 && vy > -40 && vy < RH + 150; };
  const viewEnemies = G.enemies.filter(inViewE);
  for (const e of viewEnemies) shadow(e.x, e.y, 0, e.boss ? 18 : (e.type === 'wisp' ? 4 : 7));
  for (const z of G.zones) if (inViewE(z) || z.r > 4) drawZone(ctx, z);
  for (const e of G.effects) if (e.type === 'tele' || e.type === 'marker' || e.type === 'line' || e.type === 'summon') drawDecal(ctx, e);
  const aimNow = currentAim();   // the player's ground indicator (kind:'aim'), under the sprites
  if (aimNow) drawAimIndicator(aimNow.aim, aimNow.from, aimNow.to, aimNow);
  for (const e of G.effects) if (e.type === 'aimflash') drawAimIndicator(e.aim, e.from, e.to, { col: e.col, flash: true });

  // ---- depth-sorted world ----
  const list = [];
  const inView = (sx, sy, w = 80) => { const vx = sx - camX + RW / 2, vy = sy - camY + RH / 2; return vx > -w && vx < RW + w && vy > -w * 1.5 && vy < RH + w * 1.5; };
  for (const c of gridQuery(m, 'cols', vtx0, vty0, vtx1, vty1)) if (!c.gone && inView(c.sx + 16, c.sy + 20)) {
    if (!c.img) { if (c.chunk == null || !chunkResident(m, c.chunk)) continue; c.img = rasterColumn(m, c.i, c.j).img; }
    list.push(c);
  }
  for (const o of viewObjs) if (inView(isoX(o.x, o.y), isoY(o.x, o.y, o.z))) list.push(o);
  for (const f of m.falls) if (!f.edge && inView(f.x0 + 8, f.y0 + f.len / 2, 40 + f.len)) list.push({ kind: 'fall', f, key: f.key });
  if (!p.dead || G.state === 'dead') list.push({ kind: 'player', key: p.x + p.y + p.z * 0.35 + 0.01 });
  for (const e of viewEnemies) list.push({ kind: 'enemy', e, key: e.x + e.y + 0.01 });
  for (const pr of G.projs) if (inView(isoX(pr.x, pr.y), isoY(pr.x, pr.y, pr.z || 0), 40)) list.push({ kind: 'proj', pr, key: pr.x + pr.y + 0.3 });
  for (const d of G.drops) if (inView(isoX(d.x, d.y), isoY(d.x, d.y, d.z))) list.push({ kind: 'drop', d, key: d.x + d.y + d.z * 0.35 + 0.02 });
  for (const c of G.critters || []) if (inViewE(c)) list.push({ kind: 'critter', c, key: c.x + c.y + c.z * 0.35 });
  for (const e of G.effects) if (e.type === 'ghost') list.push({ kind: 'ghost', e, key: e.x + e.y });
  if (p.buffs.orbit) for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * Math.PI * 2 / 3; list.push({ kind: 'orb', x: p.x + Math.cos(a) * 1.4, y: p.y + Math.sin(a) * 1.4, z: p.z + 1.2, key: p.x + Math.cos(a) * 1.4 + p.y + Math.sin(a) * 1.4 + p.z * 0.35 }); }
  list.sort((a, b) => a.key - b.key);
  for (const it of list) drawItem(ctx, it, lights);
  if (aimNow) drawAimReticleTop(aimNow);   // the reticle again on top at 35 % so it reads over a boss

  // ---- top effects + particles ----
  ctx.globalCompositeOperation = 'lighter';
  for (const e of G.effects) if (e.type !== 'tele' && e.type !== 'marker' && e.type !== 'line' && e.type !== 'ghost' && e.type !== 'summon' && e.type !== 'aimflash') drawEffect(ctx, e, lights);
  ctx.globalCompositeOperation = 'source-over';
  drawParticles(ctx, lights);

  // ---- fog & mist ----
  const forest = m.themeId === 'forest', fk = 1 - look.dark * 0.7;
  drawFog(ctx, bg.fog, 256, 0.5, 7, 2.5, (forest ? 0.24 : m.themeId === 'vale' ? 0.15 : 0.18) * fk);
  if (!COARSE_POINTER) {   // §16.6.6: one fog layer on touch devices
    drawFog(ctx, bg.fog2, 384, 0.8, -4, 1.2, (forest ? 0.09 : m.themeId === 'vale' ? 0.07 : 0.1) * fk);
    if (forest) drawFog(ctx, bg.fog, 512, 1.1, 3, 0.6, 0.14 * fk);   // heavy low mist banks
  }

  // ---- lighting ----
  lightsIn(m, camX - RW / 2, camY - RH / 2, camX + RW / 2, camY + RH / 2, lights);
  for (const o of viewObjs) if (o.brazier) { lights.push({ sx: isoX(o.x, o.y), sy: isoY(o.x, o.y, o.z) - 14, r: 70 + Math.sin(G.t * 13 + o.x) * 6, col: '#c77bff', a: 0.9 }); }
  // the hero's light (a lantern in dark sections) is always kept by the light budget
  const heroL = p.dead ? null : { sx: isoX(p.x, p.y), sy: isoY(p.x, p.y, p.z) - 10, r: 54 + 46 * look.dark, col: '#ffe6d0', a: 0.28 + 0.55 * look.dark, keep: true };
  if (heroL) lights.push(heroL);
  applyLighting(ctx, lights, th, look.css);

  // ---- bloom + grade ----
  applyBloom(ctx, th.bloom * (typeof flashCap === 'function' ? flashCap() : 1));
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22; ctx.drawImage(GRADE[m.themeId], 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (p.buffs.dreamveil) { ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,140,220,0.25)'; ctx.fillRect(0, 0, RW, RH); ctx.globalCompositeOperation = 'source-over'; }
  ctx.drawImage(VIGNETTE, 0, 0);
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(255,40,90,${p.hurtT * 0.6})`; ctx.fillRect(0, 0, RW, RH); }
  groundTick(m, true, performance.now() - sceneT0);   // idle prefetch with what is left of the frame
}

function drawMoon(ctx, x, y, r, col) {
  const c = hexToRgb(col);
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    const d = (xx * xx + yy * yy) / (r * r);
    if (d > 1) continue;
    const n = vnoise((xx + 50) * 0.18, (yy + 50) * 0.18, 99);
    const sh = 1 - Math.max(0, (xx + yy) / (r * 2.4)) * 0.35 - (n > 0.62 ? 0.12 : 0);
    ctx.fillStyle = `rgb(${c[0] * sh | 0},${c[1] * sh | 0},${c[2] * sh | 0})`;
    ctx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
  }
}

function drawFall(ctx, f, edge) {
  const th = G.map.theme, W = th.water;
  for (let px = 0; px < 16; px++) {
    const [vx, vy0] = sToView(f.x0 + px, f.y0 + px * 0.5);
    if (vx < -2 || vx > RW + 2) continue;
    const seed = hash2(px, f.x0, 5);
    for (let y = 0; y < f.len; y += 2) {
      const k = y / f.len;
      const flow = (y - G.t * 90 + seed * 60) % 16;
      const c = W[clamp(Math.floor(4 + (flow < 0 ? flow + 16 : flow) / 16 * 2 + (px % 3 === 0 ? 1 : 0)), 0, W.length - 1)];
      const a = edge ? (1 - k) * 0.9 : 0.95;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
      ctx.fillRect(Math.round(vx), Math.round(vy0 + y + (edge ? Math.sin(y * 0.05 + G.t) * k * 3 : 0)), 1, 2);
    }
  }
  if (!edge) { // foam at base
    const [bx, by] = sToView(f.x0 + 8, f.y0 + 4 + f.len);
    for (let k = 0; k < 10; k++) { ctx.fillStyle = 'rgba(240,252,255,0.8)'; ctx.fillRect(Math.round(bx - 9 + k * 2 + Math.sin(G.t * 9 + k) * 1.5), Math.round(by - 1 + Math.sin(G.t * 7 + k * 2)), 2, 1); }
  }
}

function drawWater(ctx, m, x0, y0, x1, y1) {
  for (const s of gridQuery(m, 'water', x0, y0, x1, y1)) {
    const fy = (s.b + G.t * 0.35) % 1, x = s.i + s.a, y = s.j + fy;
    const [vx, vy] = worldToView(x, y, 0);
    if (vx < -4 || vx > RW + 4 || vy < -4 || vy > RH + 4) continue;
    const a = Math.sin(fy * Math.PI) * 0.8;
    ctx.fillStyle = `rgba(230,250,255,${a})`;
    ctx.fillRect(Math.round(vx), Math.round(vy), 3, 1);
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
  lights.push({ sx: isoX(m.cx, m.cy), sy: isoY(m.cx, m.cy), r: 90, col: '#9b6ee8', a: pulse });
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

// ===== ground aim indicators (docs/HUD.md "Touch v2" > Aiming) ==============================================
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

function drawItem(ctx, it, lights) {
  const p = G.player;
  if (it.kind === 'column') { ctx.drawImage(it.img, Math.round(it.sx - camX + RW / 2), Math.round(it.sy - camY + RH / 2)); return; }
  if (it.kind === 'sprite') {
    if (it.gone) return;   // an opened gate / keydoor / hidden wall (maps.js openGate)
    const [vx, vy] = worldToView(it.x, it.y, it.z);
    if (it.fish) { drawFishSpot(ctx, it, vx, vy, lights); return; }
    let img = it.img;
    if (it.grass) img = ART.grass[Math.sin(G.t * 1.8 + it.sway) > 0 ? 1 : 0];
    if (it.beam) { drawSunbeam(ctx, vx, vy, it); return; }
    if (it.flip !== !!it.pulled) { ctx.save(); ctx.translate(Math.round(vx), 0); ctx.scale(-1, 1); ctx.drawImage(img, -Math.round(it.ax), Math.round(vy - it.ay)); ctx.restore(); }
    else ctx.drawImage(img, Math.round(vx - it.ax), Math.round(vy - it.ay));
    if (it.brazier) drawFlame(ctx, vx, vy - 9, '#c77bff', '#ffd6ff');
    if (it.checkpoint && G.checkpoint && G.checkpoint.map === G.map.id && dist(G.checkpoint.x, G.checkpoint.y, it.x, it.y) < 2.5) {
      glowDot(ctx, vx, vy - 22 + Math.sin(G.t * 3) * 1.5, '#9ef0ff', '#ffffff', 2);
      if (Math.random() < 0.15) addPart({ x: it.x + frand(-0.3, 0.3), y: it.y + frand(-0.3, 0.3), z: it.z + 1, vx: 0, vy: 0, vz: 1.2, life: 1, t: 0, col: '#9ef0ff', grav: 0, size: 1, glow: true });
    }
    return;
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
  if (it.kind === 'ghost') {
    const e = it.e, k = e.t / e.life, [vx, vy] = worldToView(e.x, e.y, e.z);
    ctx.globalAlpha = (1 - k) * 0.55; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(silOf(e.spr, e.col || '#ffffff'), Math.round(vx - e.spr.width / 2), Math.round(vy - e.spr.height + 1));
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
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

function drawPlayer(ctx, p, lights) {
  const [vx, vy] = worldToView(p.x, p.y, p.z);
  if (p.dead) {
    ctx.globalAlpha = Math.max(0, 1 - G.deadT); const spr = p.spr.front[0];
    ctx.save(); ctx.translate(Math.round(vx), Math.round(vy)); ctx.rotate(Math.PI / 2 * Math.min(1, G.deadT * 2)); ctx.drawImage(spr, -spr.width / 2, 1 - spr.height); ctx.restore(); ctx.globalAlpha = 1; return;
  }
  const spr = currentPlayerSprite(p);
  const bob = p.moving ? 0 : (Math.sin(G.t * 2.5) > 0.7 ? 1 : 0);
  const dx = Math.round(vx - spr.width / 2), dy = Math.round(vy - spr.height + 1 + bob);
  const w = item('weapon', p.gear.weapon), o = p.spr.ox;
  const hx = dx + (p.face > 0 ? 12.5 + o * 2 : 3.5), hy = dy + 14.5 + o;
  const sa = Math.atan2(G.mouse.y - hy, G.mouse.x - hx);
  if (p.buffs.veil) ctx.globalAlpha = 0.4;
  const drawW = () => drawWeapon(ctx, p, w, hx, hy, sa, lights);
  if (p.back) drawW();
  ctx.drawImage(spr, dx, dy);
  if (p.hurtT > 0 && Math.floor(p.hurtT * 30) % 2) ctx.drawImage(silOf(spr, '#ffffff'), dx, dy);
  if (!p.back) drawW();
  ctx.globalAlpha = 1;
  if (p.buffs.bulwark) {
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(190,215,255,${0.5 + Math.sin(G.t * 10) * 0.2})`;
    ctx.beginPath(); ctx.ellipse(vx, vy - 11, 13, 15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    lights.push({ sx: isoX(p.x, p.y), sy: isoY(p.x, p.y, p.z) - 11, r: 40, col: '#bfd6ff', a: 0.6 });
  }
  if (p.buffs.bless || p.buffs.surge) {
    if (Math.random() < 0.5) addPart({ x: p.x + frand(-0.3, 0.3), y: p.y + frand(-0.3, 0.3), z: p.z, vx: 0, vy: 0, vz: frand(2, 3), life: 0.6, t: 0, col: p.buffs.bless ? '#ffe9a0' : '#c7a8ff', grav: 0, size: 1, glow: true });
  }
  if (p.buffs.mend && Math.random() < 0.3) addPart({ x: p.x + frand(-0.3, 0.3), y: p.y + frand(-0.3, 0.3), z: p.z + 1, vx: 0, vy: 0, vz: 1.5, life: 0.7, t: 0, col: '#8fffa8', grav: 0, size: 1, glow: true });
}

function drawWeapon(ctx, p, w, hx, hy, sa, lights) {
  ctx.save(); ctx.translate(Math.round(hx), Math.round(hy));
  if (w.kind === 'sword') {
    let ang = p.face > 0 ? -1.15 : -Math.PI + 1.15;
    if (p.swing) { const k = 1 - Math.pow(1 - p.swing.t / p.swing.dur, 2); ang = sa + p.swing.dir * (-p.swing.arc / 2 + p.swing.arc * k); }
    if (p.spin > 0) ang = G.t * 40;
    ctx.rotate(ang); ctx.drawImage(ART.weapons.sword, -2, -2);
    if (p.swing || p.spin > 0) lights.push({ sx: hx + Math.cos(ang) * 10 + camX - RW / 2, sy: hy + Math.sin(ang) * 10 + camY - RH / 2, r: 30, col: '#ffe9a0', a: 0.6 });
  } else if (w.kind === 'staff') {
    const ang = p.castT > 0 ? sa : (p.face > 0 ? -1.35 : -Math.PI + 1.35);
    ctx.rotate(ang); ctx.drawImage(ART.weapons.staff, -6, -2);
    const tx = hx + Math.cos(ang) * 12, ty = hy + Math.sin(ang) * 12;
    lights.push({ sx: tx + camX - RW / 2, sy: ty + camY - RH / 2, r: 34 + (p.castT > 0 ? 20 : 0), col: '#7fe6ff', a: 0.85 });
  } else {
    const ang = (p.castT > 0 || G.mouse.down) ? sa : (p.face > 0 ? 0.5 : Math.PI - 0.5);
    ctx.rotate(ang); ctx.drawImage(ART.weapons.bow, -2, -9);
    if (p.castT > 0) { ctx.drawImage(ART.weapons.arrow, -1, -1); }
  }
  ctx.restore();
}

function drawEnemy(ctx, e, lights) {
  const [vx, vy0] = worldToView(e.x, e.y, e.z);
  let vy = vy0;
  const spawnA = e.spawnT > 0 ? 1 - e.spawnT / (e.boss ? 1.6 : 0.9) : 1;
  if (spawnA <= 0.05) return;
  const artKey = enemyArtKey(e);
  if (artKey) { drawEnemyArt(ctx, e, artKey, vx, vy, spawnA); return; }
  if (e.under) { drawBurrowed(ctx, e, vx, vy); return; }
  if (e.mimic) { const ci = ART.chest; ctx.drawImage(e.flash > 0 ? silOf(ci, '#ffffff') : ci, Math.round(vx - ci.width / 2), Math.round(vy - ci.height + 1)); return; }
  ctx.globalAlpha = spawnA * (e.fadeT > 0 ? 0.35 : 1);
  if (e.elite) drawEliteAura(ctx, e);
  let img, white;
  const def = ENEMY[e.type] || {}, look = enemyLook(def, e.type), cs = look.img, lk = look.kind;
  const sc = def.scale || 1, scaled = sc !== 1 && !cs;
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
    ctx.drawImage(e.flash > 0 ? silOf(base, '#ffffff') : base, dx, dy, w, hh);
    if (look.tint) { ctx.globalAlpha = spawnA * 0.3; ctx.drawImage(silOf(base, look.tint), dx, dy, w, hh); ctx.globalAlpha = spawnA; }
    if (e.state === 'wind' && (def.ai === 'brute' || e.boss)) { ctx.globalAlpha = spawnA * (0.25 + 0.25 * Math.sin(e.anim * 30)); ctx.drawImage(silOf(base, '#ff5040'), dx, dy, w, hh); ctx.globalAlpha = spawnA; }
    vy += oy;
  } else if (lk === 'slime') {
    const moving = e.state === 'chase', hop = moving ? Math.max(0, Math.sin(e.anim * 6)) : 0;
    const wind = e.state === 'wind' ? Math.sin(e.anim * 40) * 0.08 + 0.15 : 0;
    const sq = (e.squash > 0 ? e.squash : 0) + wind - hop * 0.12;
    img = e.flash > 0 ? ART.slime.w : ART.slime.n;
    ctx.drawImage(img, Math.round(vx - img.width * (1 + sq) / 2), Math.round(vy - img.height * (1 - sq) - hop * 5), Math.round(img.width * (1 + sq)), Math.round(img.height * (1 - sq)));
  } else if (lk === 'hound') {
    const f = Math.floor(e.anim * (e.state === 'lunge' ? 16 : 8)) % 2;
    img = e.flash > 0 ? (e.face < 0 ? ART.hound.wf : ART.hound.w) : (e.face < 0 ? ART.hound.f[f] : ART.hound.n[f]);
    ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height));
    lights.push({ sx: vx + camX - RW / 2 + e.face * 5, sy: vy + camY - RH / 2 - 8, r: 14, col: '#ff6b9a', a: 0.7 });
  } else if (lk === 'wisp') {
    vy -= 14 + Math.sin(e.anim * 3) * 3;
    const charge = e.state === 'wind' ? 1 + Math.sin(e.anim * 30) * 0.3 : 0;
    for (let k = 0; k < 4; k++) { ctx.fillStyle = rgba('#7fd6ff', 0.5 - k * 0.1); ctx.fillRect(Math.round(vx - 1 + Math.sin(e.anim * 5 + k) * 1.5), Math.round(vy + 3 + k * 2), 2, 2); }
    glowDot(ctx, vx, vy, e.flash > 0 ? '#ffffff' : '#7fd6ff', '#f0feff', 2 + Math.round(charge));
    ctx.fillStyle = '#1a1326'; ctx.fillRect(Math.round(vx - 2), Math.round(vy - 1), 1, 2); ctx.fillRect(Math.round(vx + 1), Math.round(vy - 1), 1, 2);
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 36 + charge * 20, col: '#7fd6ff', a: 0.9 });
  } else if (lk === 'boss') {
    const B = ART.boss;
    img = e.flash > 0 ? (e.face < 0 ? B.wf : B.w) : (e.face < 0 ? B.f : B.n);
    ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height + 2));
    const glow = e.state !== 'chase' ? 1 : 0.6;
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2 - 40, r: 60, col: '#ff7ae0', a: glow });
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2 - 26, r: 40, col: '#c78bff', a: 0.8 });
    if (Math.random() < 0.5) addPart({ x: e.x + frand(-0.7, 0.7), y: e.y + frand(-0.7, 0.7), z: 0.3, vx: 0, vy: 0, vz: frand(0.5, 1.5), life: 1, t: 0, col: pick2(['#2a1c38', '#5f4690', '#ff7ae0']), grav: 0, size: 2, glow: false });
  } else if (lk === 'dummy') {
    img = ART.dummy;
    const wob = e.flash > 0 ? Math.round(Math.sin(G.t * 60) * 1) : 0;
    ctx.drawImage(e.flash > 0 ? silOf(img, '#ffffff') : img, Math.round(vx - img.width / 2 + wob), Math.round(vy - img.height + 1));
  }
  if (scaled) ctx.restore();
  if (e.asleep && Math.random() < 0.03) text(e.x, e.y, e.z + e.hgt + 0.3, 'z', '#c8c0e0', false, 1.2);
  if (e.eShield > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#cfe6ff', 0.4 + 0.4 * e.eShield / e.eShieldMax); projRing(ctx, e.x, e.y, 0.2, e.r + 0.45); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  if (e.frozen) { ctx.globalAlpha = 0.5 * spawnA; if (img) ctx.drawImage(silOf(img, '#bff4ff'), Math.round(vx - img.width / 2), Math.round(vy - img.height)); }
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
  if (e.flash > 0 && A.hit) return ['hit', 0];
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
function drawEnemyArt(ctx, e, key, vx, vy, spawnA) {
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
  ctx.drawImage(e.flash > 0 ? silOf(img, '#ffffff') : img, x, y);
  if (e.state === 'wind' && !e.boss && e.act === 'brute') { ctx.globalAlpha = spawnA * (0.2 + 0.2 * Math.sin(e.anim * 30)); ctx.drawImage(silOf(img, '#ff5040'), x, y); }
  if (e.frozen) { ctx.globalAlpha = 0.5 * spawnA; ctx.drawImage(silOf(img, '#bff4ff'), x, y); }
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
    const st = e.flash > 0 && F.hurt ? 'hurt' : e.state === 'wind' && F.wind ? 'wind' : e.state !== 'chase' && e.state !== 'rec' && F.attack ? 'attack' : e.state === 'chase' && !e.asleep && F.move ? 'move' : 'idle';
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

function drawParticles(ctx, lights) {
  for (const f of (G.amb || [])) {
    const [vx, vy] = worldToView(f.x, f.y, f.z);
    if (vx < -10 || vx > RW + 10 || vy < -10 || vy > RH + 10) continue;
    const fade = Math.min(1, f.t, f.life - f.t);
    if (f.k === 'fly') {
      const a = (0.5 + 0.5 * Math.sin(G.t * 3 + f.ph)) * fade;
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(220,255,160,${a})`; ctx.fillRect(Math.round(vx), Math.round(vy), 1, 1);
      ctx.fillStyle = `rgba(200,255,140,${a * 0.35})`; ctx.fillRect(Math.round(vx) - 1, Math.round(vy), 3, 1); ctx.fillRect(Math.round(vx), Math.round(vy) - 1, 1, 3);
      if (a > 0.5) lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 14, col: '#d8ff9a', a: a * 0.6 });
    } else if (f.k === 'mote') {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,226,180,${fade * (0.35 + 0.3 * Math.sin(G.t * 2 + f.ph))})`; ctx.fillRect(Math.round(vx), Math.round(vy), 1, 1);
    } else {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,120,170,${fade * 0.8})`; ctx.fillRect(Math.round(vx), Math.round(vy), 1, 1);
    }
  }
  for (const q of G.parts) {
    const [vx, vy] = worldToView(q.x, q.y, q.z);
    const a = 1 - q.t / q.life;
    ctx.globalCompositeOperation = q.glow ? 'lighter' : 'source-over';
    ctx.fillStyle = rgba(q.col, q.mist ? a * 0.35 : a);
    const s = q.mist ? Math.round(q.size + q.t * 3) : q.size;
    ctx.fillRect(Math.round(vx - s / 2), Math.round(vy - s / 2), s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawFog(ctx, tex, size, par, spx, spy, alpha) {
  const ox = -(((camX * par + G.t * spx) % size) + size) % size, oy = -(((camY * par + G.t * spy) % size) + size) % size;
  ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true;
  for (let y = oy - size; y < RH; y += size) for (let x = ox - size; x < RW; x += size) ctx.drawImage(tex, Math.round(x), Math.round(y), size, size);
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
}

// §16.6.1: one cached 64x64 radial sprite per light colour (alpha 1 -> 0), drawn scaled with globalAlpha = L.a.
// A linear alpha ramp scaled by globalAlpha equals the old per-light rgba(col, a) -> rgba(col, 0) gradient.
const COARSE_POINTER = PHONE || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const LIGHT_MAX = 40, LIGHT_STATS = { inView: 0, drawn: 0 };
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
  if (vis.length > LIGHT_MAX) {   // budget: keep the hero's light, then the strongest nearest the centre
    const sc = ([vx, vy, L]) => (L.keep ? 1e9 : 0) + L.a * L.r / (1 + Math.hypot(vx - RW / 2, vy - RH / 2) / 120);
    vis = vis.sort((a, b) => sc(b) - sc(a)).slice(0, LIGHT_MAX);
  }
  LIGHT_STATS.drawn = vis.length;
  for (const [vx, vy, L] of vis) { x.globalAlpha = clamp(L.a, 0, 1); x.drawImage(lightSprite(L.col), vx / 2 - L.r / 2, vy / 2 - L.r / 2, L.r, L.r); }
  x.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(LM.c, 0, 0, RW, RH);
  // additive halos — the "fake light" glow
  ctx.globalCompositeOperation = 'lighter';
  for (const [vx, vy, L] of vis) {
    const r = L.r * 0.55;
    ctx.globalAlpha = clamp(L.a * 0.32 * fc, 0, 1); ctx.drawImage(lightSprite(L.col), vx - r, vy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
}

function applyBloom(ctx, strength) {
  const w = RW / 4, h = RH / 4;
  B1.x.imageSmoothingEnabled = true; B1.x.globalCompositeOperation = 'source-over'; B1.x.clearRect(0, 0, w, h); B1.x.drawImage(SCN.c, 0, 0, w, h);
  // bright-pass: v^4 via self-multiplication (no ctx.filter dependency)
  BT.x.globalCompositeOperation = 'source-over'; BT.x.drawImage(B1.c, 0, 0);
  BT.x.globalCompositeOperation = 'multiply'; BT.x.drawImage(B1.c, 0, 0); BT.x.drawImage(B1.c, 0, 0); BT.x.drawImage(B1.c, 0, 0);
  BT.x.globalCompositeOperation = 'source-over';
  B2.x.imageSmoothingEnabled = true; B2.x.clearRect(0, 0, RW / 8, RH / 8); B2.x.drawImage(BT.c, 0, 0, RW / 8, RH / 8);
  ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = strength * 0.4; ctx.drawImage(BT.c, 0, 0, RW, RH);
  ctx.globalAlpha = strength * 0.6; ctx.drawImage(B2.c, 0, 0, RW, RH);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
}
