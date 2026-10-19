'use strict';
// ---------------------------------------------------------------------------
// Scene rendering + post-processing: fake lights (lightmap multiply + additive
// halos), bloom (cubed bright-pass at 1/4 & 1/8 res), drifting fog & mist,
// god rays, vignette.
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
    if (blossoms.length) { const b = pick2(blossoms); G.parts.push({ x: b.x + frand(-0.6, 0.6), y: b.y + frand(-0.6, 0.6), z: 5 + frand(0, 2), vx: frand(0.2, 0.6), vy: frand(-0.1, 0.3), vz: -0.5, life: 5, t: 0, col: pick2(['#ffd0e6', '#ffffff', '#f6a6c8']), grav: 0.05, size: 1, glow: false, petal: true }); }
  }
  // waterfall mist
  for (const f of m.falls) {
    if (Math.random() < dt * (f.edge ? 0 : 14)) G.parts.push({ x: f.wx + frand(-0.5, 0.5), y: f.wy + frand(0, 0.6), z: 0.2, vx: frand(-0.3, 0.3), vy: frand(0, 0.6), vz: frand(0.5, 1.6), life: frand(0.8, 1.6), t: 0, col: '#e8fbff', grav: 0.2, size: 2, glow: false, mist: true });
  }
  for (const ch of m.chimneys || []) if (Math.random() < dt * 4) G.parts.push({ x: ch.x, y: ch.y, z: ch.z, vx: 0.15, vy: -0.1, vz: 0.6, life: 3, t: 0, col: '#e6dcf0', grav: -0.05, size: 2, glow: false, mist: true });
}

// ===== frame ======================================================================
function drawScene() {
  const m = G.map, th = m.theme, bg = th._bg, ctx = sctx, p = G.player;
  const shx = (Math.random() - 0.5) * G.shakeA * 2, shy = (Math.random() - 0.5) * G.shakeA * 2;
  camX = Math.round(G.cam.x + shx); camY = Math.round(G.cam.y + shy);
  const lights = [];
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
  ctx.drawImage(m.ground, Math.round(m.gox - camX + RW / 2), Math.round(m.goy - camY + RH / 2));
  for (const f of m.falls) if (f.edge) drawFall(ctx, f, true);
  drawWater(ctx, m);
  if (m.hasRunes) drawSigil(ctx, m, lights);

  // clouds drifting in front of the underside
  bg.sea.forEach((c, i) => {
    const x = ((i * 260 + 100 - camX + G.t * 9) % 1000) - 260, y = groundBot + th.underDepth * 0.82 + i * 10 - camY + RH / 2;
    ctx.globalAlpha = 0.85; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
  });

  // ---- ground decals: shadows, telegraphs, zones ----
  ctx.fillStyle = 'rgba(20,8,40,0.32)';
  const shadow = (x, y, z, r) => { const [vx, vy] = worldToView(x, y, z); ctx.beginPath(); ctx.ellipse(Math.round(vx), Math.round(vy), r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); };
  for (const o of m.objects) if (o.shadow) shadow(o.x, o.y, o.z, o.shadow);
  if (!p.dead) shadow(p.x, p.y, tileH(m, p.x, p.y), 6);
  for (const e of G.enemies) shadow(e.x, e.y, 0, e.boss ? 18 : (e.type === 'wisp' ? 4 : 7));
  for (const z of G.zones) drawZone(ctx, z);
  for (const e of G.effects) if (e.type === 'tele' || e.type === 'marker' || e.type === 'line' || e.type === 'summon') drawDecal(ctx, e);

  // ---- depth-sorted world ----
  const list = [];
  const inView = (sx, sy, w = 80) => { const vx = sx - camX + RW / 2, vy = sy - camY + RH / 2; return vx > -w && vx < RW + w && vy > -w * 1.5 && vy < RH + w * 1.5; };
  for (const c of m.columns) if (inView(c.sx + 16, c.sy + 20)) list.push(c);
  for (const o of m.objects) if (inView(isoX(o.x, o.y), isoY(o.x, o.y, o.z))) list.push(o);
  for (const f of m.falls) if (!f.edge) list.push({ kind: 'fall', f, key: f.key });
  if (!p.dead || G.state === 'dead') list.push({ kind: 'player', key: p.x + p.y + p.z * 0.35 + 0.01 });
  for (const e of G.enemies) list.push({ kind: 'enemy', e, key: e.x + e.y + 0.01 });
  for (const pr of G.projs) list.push({ kind: 'proj', pr, key: pr.x + pr.y + 0.3 });
  for (const d of G.drops) if (inView(isoX(d.x, d.y), isoY(d.x, d.y, d.z))) list.push({ kind: 'drop', d, key: d.x + d.y + d.z * 0.35 + 0.02 });
  for (const c of G.critters || []) list.push({ kind: 'critter', c, key: c.x + c.y + c.z * 0.35 });
  for (const e of G.effects) if (e.type === 'ghost') list.push({ kind: 'ghost', e, key: e.x + e.y });
  if (p.buffs.orbit) for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * Math.PI * 2 / 3; list.push({ kind: 'orb', x: p.x + Math.cos(a) * 1.4, y: p.y + Math.sin(a) * 1.4, z: p.z + 1.2, key: p.x + Math.cos(a) * 1.4 + p.y + Math.sin(a) * 1.4 + p.z * 0.35 }); }
  list.sort((a, b) => a.key - b.key);
  for (const it of list) drawItem(ctx, it, lights);

  // ---- top effects + particles ----
  ctx.globalCompositeOperation = 'lighter';
  for (const e of G.effects) if (e.type !== 'tele' && e.type !== 'marker' && e.type !== 'line' && e.type !== 'ghost' && e.type !== 'summon') drawEffect(ctx, e, lights);
  ctx.globalCompositeOperation = 'source-over';
  drawParticles(ctx, lights);

  // ---- fog & mist ----
  const forest = m.themeId === 'forest';
  drawFog(ctx, bg.fog, 256, 0.5, 7, 2.5, forest ? 0.24 : m.themeId === 'vale' ? 0.15 : 0.18);
  drawFog(ctx, bg.fog2, 384, 0.8, -4, 1.2, forest ? 0.09 : m.themeId === 'vale' ? 0.07 : 0.1);
  if (forest) drawFog(ctx, bg.fog, 512, 1.1, 3, 0.6, 0.14);   // heavy low mist banks

  // ---- lighting ----
  for (const L of m.lights) lights.push(L);
  for (const o of m.objects) if (o.brazier) { lights.push({ sx: isoX(o.x, o.y), sy: isoY(o.x, o.y, o.z) - 14, r: 70 + Math.sin(G.t * 13 + o.x) * 6, col: '#c77bff', a: 0.9 }); }
  if (!p.dead) lights.push({ sx: isoX(p.x, p.y), sy: isoY(p.x, p.y, p.z) - 10, r: 54, col: '#ffe6d0', a: 0.28 });
  applyLighting(ctx, lights, th);

  // ---- bloom + grade ----
  applyBloom(ctx, th.bloom);
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22; ctx.drawImage(GRADE[m.themeId], 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (p.buffs.dreamveil) { ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,140,220,0.25)'; ctx.fillRect(0, 0, RW, RH); ctx.globalCompositeOperation = 'source-over'; }
  ctx.drawImage(VIGNETTE, 0, 0);
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(255,40,90,${p.hurtT * 0.6})`; ctx.fillRect(0, 0, RW, RH); }
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

function drawWater(ctx, m) {
  if (!m._water) { m._water = []; for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.type[j][i] === 'w' && m.h[j][i] === 0) for (let k = 0; k < 3; k++) m._water.push({ i, j, a: hash2(i, j, k), b: hash2(j, i, k + 9) }); }
  for (const s of m._water) {
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

function drawDecal(ctx, e) {
  const k = clamp(e.t / e.life, 0, 1);
  if (e.type === 'tele') {
    ctx.fillStyle = rgba(e.col, 0.16); ctx.strokeStyle = rgba(e.col, 0.85); ctx.lineWidth = 1;
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
    ctx.fillStyle = rgba(e.col, 0.28); shape(k); ctx.fill();
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
    if (Math.random() < 0.5) G.parts.push({ x: e.x + frand(-e.r, e.r) * 0.6, y: e.y + frand(-e.r, e.r) * 0.6, z: 0, vx: 0, vy: 0, vz: frand(2, 4), life: 0.5, t: 0, col: e.col, grav: 0, size: 1, glow: true });
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawItem(ctx, it, lights) {
  const p = G.player;
  if (it.kind === 'column') { ctx.drawImage(it.img, Math.round(it.sx - camX + RW / 2), Math.round(it.sy - camY + RH / 2)); return; }
  if (it.kind === 'sprite') {
    const [vx, vy] = worldToView(it.x, it.y, it.z);
    let img = it.img;
    if (it.grass) img = ART.grass[Math.sin(G.t * 1.8 + it.sway) > 0 ? 1 : 0];
    if (it.beam) { drawSunbeam(ctx, vx, vy, it); return; }
    if (it.flip) { ctx.save(); ctx.translate(Math.round(vx), 0); ctx.scale(-1, 1); ctx.drawImage(img, -Math.round(it.ax), Math.round(vy - it.ay)); ctx.restore(); }
    else ctx.drawImage(img, Math.round(vx - it.ax), Math.round(vy - it.ay));
    if (it.brazier) drawFlame(ctx, vx, vy - 9, '#c77bff', '#ffd6ff');
    if (it.checkpoint && G.checkpoint && G.checkpoint.map === G.map.id && dist(G.checkpoint.x, G.checkpoint.y, it.x, it.y) < 2.5) {
      glowDot(ctx, vx, vy - 22 + Math.sin(G.t * 3) * 1.5, '#9ef0ff', '#ffffff', 2);
      if (Math.random() < 0.15) G.parts.push({ x: it.x + frand(-0.3, 0.3), y: it.y + frand(-0.3, 0.3), z: it.z + 1, vx: 0, vy: 0, vz: 1.2, life: 1, t: 0, col: '#9ef0ff', grav: 0, size: 1, glow: true });
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
  if (R.i >= 2 && grow >= 1 && Math.random() < 0.04 * R.i) G.parts.push({ x: x + frand(-0.15, 0.15), y: y + frand(-0.15, 0.15), z: d.z + frand(0.2, F.h / ZS), vx: 0, vy: 0, vz: 0.8, life: 0.8, t: 0, col, grav: 0, size: 1, glow: true });
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
  if (Math.random() < 0.08) G.parts.push({ x: it.x + frand(-0.5, 0.5), y: it.y + frand(-0.5, 0.5), z: frand(0.5, 3), vx: 0.1, vy: 0, vz: 0.1, life: 2, t: 0, col: '#ffe6b0', grav: 0, size: 1, glow: true });
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
    if (Math.random() < 0.4) G.parts.push({ x: o.x + frand(-0.4, 0.4), y: o.y + frand(-0.4, 0.4), z: o.z + frand(1, 5), vx: 0, vy: 0, vz: 0.6, life: 1, t: 0, col: pick2([col, '#ffd6ff', '#ffffff']), grav: 0, size: 1, glow: true });
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
    if (Math.random() < 0.5) G.parts.push({ x: p.x + frand(-0.3, 0.3), y: p.y + frand(-0.3, 0.3), z: p.z, vx: 0, vy: 0, vz: frand(2, 3), life: 0.6, t: 0, col: p.buffs.bless ? '#ffe9a0' : '#c7a8ff', grav: 0, size: 1, glow: true });
  }
  if (p.buffs.mend && Math.random() < 0.3) G.parts.push({ x: p.x + frand(-0.3, 0.3), y: p.y + frand(-0.3, 0.3), z: p.z + 1, vx: 0, vy: 0, vz: 1.5, life: 0.7, t: 0, col: '#8fffa8', grav: 0, size: 1, glow: true });
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
  ctx.globalAlpha = spawnA;
  let img, white;
  const def = ENEMY[e.type] || {}, cs = def.sprite && ART.custom[def.sprite];
  if (cs) {
    // pixel-editor sprite (sprites face right) with behaviour-driven motion
    const base = e.face < 0 ? ART.customF[def.sprite] : cs;
    let ox = 0, oy = 0, sq = 0;
    if (def.ai === 'hopper') { const hop = e.state === 'chase' ? Math.max(0, Math.sin(e.anim * 6)) : 0; sq = (e.squash > 0 ? e.squash : 0) + (e.state === 'wind' ? 0.15 : 0) - hop * 0.12; oy = -hop * 5; }
    else if (def.ai === 'shooter') oy = -(10 + Math.sin(e.anim * 3) * 3);
    else if (e.state === 'chase') oy = -(Math.floor(e.anim * 6) % 2);
    else if (e.state === 'wind') { ox = -e.face * 1; oy = -1; }
    else if (e.state === 'strike' || e.state === 'lunge') ox = e.face * 2;
    img = base;
    const w = Math.round(base.width * (1 + sq)), hh = Math.round(base.height * (1 - sq));
    const dx = Math.round(vx - w / 2 + ox), dy = Math.round(vy - hh + 1 + oy);
    ctx.drawImage(e.flash > 0 ? silOf(base, '#ffffff') : base, dx, dy, w, hh);
    if (e.state === 'wind' && def.ai === 'brute') { ctx.globalAlpha = spawnA * (0.25 + 0.25 * Math.sin(e.anim * 30)); ctx.drawImage(silOf(base, '#ff5040'), dx, dy, w, hh); ctx.globalAlpha = spawnA; }
    vy += oy;
  } else if (e.type === 'slime') {
    const moving = e.state === 'chase', hop = moving ? Math.max(0, Math.sin(e.anim * 6)) : 0;
    const wind = e.state === 'wind' ? Math.sin(e.anim * 40) * 0.08 + 0.15 : 0;
    const sq = (e.squash > 0 ? e.squash : 0) + wind - hop * 0.12;
    img = e.flash > 0 ? ART.slime.w : ART.slime.n;
    ctx.drawImage(img, Math.round(vx - img.width * (1 + sq) / 2), Math.round(vy - img.height * (1 - sq) - hop * 5), Math.round(img.width * (1 + sq)), Math.round(img.height * (1 - sq)));
  } else if (e.type === 'hound') {
    const f = Math.floor(e.anim * (e.state === 'lunge' ? 16 : 8)) % 2;
    img = e.flash > 0 ? (e.face < 0 ? ART.hound.wf : ART.hound.w) : (e.face < 0 ? ART.hound.f[f] : ART.hound.n[f]);
    ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height));
    lights.push({ sx: vx + camX - RW / 2 + e.face * 5, sy: vy + camY - RH / 2 - 8, r: 14, col: '#ff6b9a', a: 0.7 });
  } else if (e.type === 'wisp') {
    vy -= 14 + Math.sin(e.anim * 3) * 3;
    const charge = e.state === 'wind' ? 1 + Math.sin(e.anim * 30) * 0.3 : 0;
    for (let k = 0; k < 4; k++) { ctx.fillStyle = rgba('#7fd6ff', 0.5 - k * 0.1); ctx.fillRect(Math.round(vx - 1 + Math.sin(e.anim * 5 + k) * 1.5), Math.round(vy + 3 + k * 2), 2, 2); }
    glowDot(ctx, vx, vy, e.flash > 0 ? '#ffffff' : '#7fd6ff', '#f0feff', 2 + Math.round(charge));
    ctx.fillStyle = '#1a1326'; ctx.fillRect(Math.round(vx - 2), Math.round(vy - 1), 1, 2); ctx.fillRect(Math.round(vx + 1), Math.round(vy - 1), 1, 2);
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2, r: 36 + charge * 20, col: '#7fd6ff', a: 0.9 });
  } else if (e.type === 'boss') {
    const B = ART.boss;
    img = e.flash > 0 ? (e.face < 0 ? B.wf : B.w) : (e.face < 0 ? B.f : B.n);
    ctx.drawImage(img, Math.round(vx - img.width / 2), Math.round(vy - img.height + 2));
    const glow = e.state !== 'chase' ? 1 : 0.6;
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2 - 40, r: 60, col: '#ff7ae0', a: glow });
    lights.push({ sx: vx + camX - RW / 2, sy: vy + camY - RH / 2 - 26, r: 40, col: '#c78bff', a: 0.8 });
    if (Math.random() < 0.5) G.parts.push({ x: e.x + frand(-0.7, 0.7), y: e.y + frand(-0.7, 0.7), z: 0.3, vx: 0, vy: 0, vz: frand(0.5, 1.5), life: 1, t: 0, col: pick2(['#2a1c38', '#5f4690', '#ff7ae0']), grav: 0, size: 2, glow: false });
  } else if (e.type === 'dummy') {
    img = ART.dummy;
    const wob = e.flash > 0 ? Math.round(Math.sin(G.t * 60) * 1) : 0;
    ctx.drawImage(e.flash > 0 ? silOf(img, '#ffffff') : img, Math.round(vx - img.width / 2 + wob), Math.round(vy - img.height + 1));
  }
  if (e.frozen) { ctx.globalAlpha = 0.5 * spawnA; if (img) ctx.drawImage(silOf(img, '#bff4ff'), Math.round(vx - img.width / 2), Math.round(vy - img.height)); }
  ctx.globalAlpha = 1;
  if (e.stunT > 0 && !e.frozen) for (let k = 0; k < 3; k++) { const a = G.t * 6 + k * 2.1; ctx.fillStyle = '#ffe36a'; ctx.fillRect(Math.round(vx + Math.cos(a) * 6), Math.round(vy - e.hgt * ZS - 4 + Math.sin(a) * 2), 1, 1); }
  if (!e.boss && !e.dummy && e.hp < e.maxHp && e.spawnT <= 0) {
    const bx = Math.round(vx - 8), by = Math.round(vy - e.hgt * ZS - (e.type === 'wisp' ? 2 : 4));
    ctx.fillStyle = '#1a1326'; ctx.fillRect(bx - 1, by - 1, 18, 4);
    ctx.fillStyle = '#ff5a7a'; ctx.fillRect(bx, by, Math.round(16 * e.hp / e.maxHp), 2);
    // discovered weaknesses (right, element colour) and resists (left, element colour in a grey frame); M3 swaps in icons
    const seen = G.prog.seen && G.prog.seen[e.type];
    if (seen) { let wx = bx + 18, rx = bx - 4; for (const el in seen) {
      if (seen[el] < 0) { ctx.fillStyle = '#ffe36a'; ctx.fillRect(wx, by - 1, 4, 4); ctx.fillStyle = EL_COL[el]; ctx.fillRect(wx + 1, by, 2, 2); wx += 5; }
      else { ctx.fillStyle = '#5a5470'; ctx.fillRect(rx, by - 1, 4, 4); ctx.fillStyle = EL_COL[el]; ctx.fillRect(rx + 1, by, 2, 2); rx -= 5; } } }
  }
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
    if (Math.random() < 0.7) G.parts.push({ x: pr.x, y: pr.y, z: pr.z, vx: 0, vy: 0, vz: 0.2, life: 0.25, t: 0, col: pr.col, grav: 0, size: 1, glow: true });
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

function applyLighting(ctx, lights, th) {
  const x = LM.x;
  x.globalCompositeOperation = 'source-over'; x.fillStyle = th.ambient; x.fillRect(0, 0, RW / 2, RH / 2);
  x.globalCompositeOperation = 'lighter';
  const vis = [];
  for (const L of lights) {
    const vx = L.sx - camX + RW / 2, vy = L.sy - camY + RH / 2;
    if (vx < -L.r || vx > RW + L.r || vy < -L.r || vy > RH + L.r) continue;
    vis.push([vx, vy, L]);
    const g = x.createRadialGradient(vx / 2, vy / 2, 0, vx / 2, vy / 2, L.r / 2);
    g.addColorStop(0, rgba(L.col, L.a)); g.addColorStop(1, rgba(L.col, 0));
    x.fillStyle = g; x.fillRect(vx / 2 - L.r / 2, vy / 2 - L.r / 2, L.r, L.r);
  }
  ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(LM.c, 0, 0, RW, RH);
  // additive halos — the "fake light" glow
  ctx.globalCompositeOperation = 'lighter';
  for (const [vx, vy, L] of vis) {
    const r = L.r * 0.55, g = ctx.createRadialGradient(vx, vy, 0, vx, vy, r);
    g.addColorStop(0, rgba(L.col, L.a * 0.32)); g.addColorStop(1, rgba(L.col, 0));
    ctx.fillStyle = g; ctx.fillRect(vx - r, vy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
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
