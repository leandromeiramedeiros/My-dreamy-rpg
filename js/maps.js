'use strict';
// ---------------------------------------------------------------------------
// Map building: tile grids, per-pixel ground rasterisation, cliff columns,
// floating-island underside, props, colliders and static lights.
// M2b map engine: barrier objects { t: 'gate' | 'keydoor' | 'hidden', id, ang (the PASSAGE direction; the wall lies
// across it), len, key? } become a row of collider props tagged with the id; openGate(id) clears them (persisted in
// G.prog.gates['map:id']). lever { id, gate? } is an Interact prop (pulls open its gate: `gate`, else the gate whose
// id shares its suffix: lever_r2 -> gate_r2); levers also flip when a trigger opens their gate. keydoor opens on
// Interact while the hero holds its key (hasKey, from a loot card's item: 'key_*'). fishspot { pool } is a visible
// stub with an Interact prompt (fishing lands later). Object x / y may be fractional for every kind (house cells floor).
// ---------------------------------------------------------------------------
const THEMES = {
  vale: {
    seed: 11,
    sky: ['#141238', '#221d55', '#3a2e7a', '#5d3f98', '#8a52aa', '#b968b0', '#e08ab4', '#f6b2b0', '#ffd6b8'],
    mtnFar: ['#8e7fc8', '#5a4c94', '#e7a9c0'], mtnNear: ['#6a5aa8', '#3c2f70', '#c98ab8'], snow: '#cdbbe8',
    cloud: ramp(['#6c5aa0', '#9c86c8', '#d6b2d8', '#fbd9e4', '#ffffff']),
    grass: ramp(['#1d4a4e', '#26634f', '#2f7a57', '#43955e', '#66b067', '#97cf7c', '#cfeaa0']),
    path: ramp(['#6a6290', '#8f86b0', '#ada4cc', '#cbc4e4', '#e6e0f4']), gap: hexToRgb('#4a4268'),
    stone: ramp(['#3a3358', '#5a5280', '#7a72a2', '#9a92c0', '#bdb6dc']),
    water: ramp(['#1a2f6a', '#20438a', '#2a5aa8', '#3a7cc4', '#5aa8dc', '#9adff0', '#e8fbff']),
    wood: ramp(['#3e2834', '#5e3d40', '#80594f', '#a87a5c', '#c99a70']),
    earth: ramp(['#2a1d3a', '#3d2a4a', '#563a58', '#70506a', '#8c6a7c']),
    under: ramp(['#1e1932', '#2b2446', '#3b3160', '#4c4078', '#5e5290']),
    haze: hexToRgb('#c6a8de'), root: hexToRgb('#3d5a4a'),
    ambient: '#cbbfec', fog: '#f6ecff', fog2: '#ffd6ec', underDepth: 150, bloom: 0.55,
    moon: { x: 470, y: 64, r: 26, col: '#fff3e6', glow: '#ffc9e6' },
  },
  ruins: {
    seed: 23,
    sky: ['#07040e', '#120822', '#1f0c33', '#361043', '#55164c', '#7a1f4f', '#a3334d', '#c9564a', '#e07a52'],
    mtnFar: ['#3a2050', '#1d0f30', '#6a2450'], mtnNear: ['#22122f', '#0c0716', '#41143a'], snow: null,
    cloud: ramp(['#1a0f2a', '#2e1a44', '#4a2a5e', '#6e3a70', '#a05a80']),
    grass: ramp(['#0f1f26', '#16302f', '#1f423a', '#2d5647', '#3e6d55', '#5a8a68', '#86b08a']),
    path: ramp(['#2a2442', '#3a3358', '#4d4570', '#635a8a', '#7e75a6']), gap: hexToRgb('#120e1e'),
    stone: ramp(['#1d1830', '#2a2442', '#3a3358', '#4d4570', '#635a8a', '#7e75a6']),
    water: ramp(['#120a2a', '#1c1040', '#2a1a5a', '#3c2878', '#5a3f9a', '#8f6fd0', '#d8c4ff']),
    wood: ramp(['#21152c', '#3a2447', '#55355e', '#6e4a74', '#8a6290']),
    earth: ramp(['#160f22', '#21172f', '#2e2140', '#3e2d54', '#503c68']),
    under: ramp(['#0e0a18', '#181128', '#231a3a', '#30244c', '#3f3060']),
    haze: hexToRgb('#4a2a58'), root: hexToRgb('#2a1f3a'),
    ambient: '#8a76b4', fog: '#9a6ac0', fog2: '#ff6a9a', underDepth: 130, bloom: 0.65,
    moon: { x: 140, y: 58, r: 30, col: '#ffb08a', glow: '#ff4a6a' },
  },
  forest: {
    seed: 37,
    sky: ['#b9bccb', '#cfcacb', '#e2c4b0', '#efab7e', '#f39056', '#ee7a3e', '#dc6432', '#c4502e', '#a8462e'],
    mtnFar: ['#6e7f9c', '#465676', '#c9b2b0'], mtnNear: ['#2c3c52', '#18222f', '#7f8ea8'], snow: null, pines: true,
    cloud: ramp(['#7d88a0', '#a4afc2', '#c6cedb', '#e2e7ef', '#f8faff']),
    grass: ramp(['#1b2716', '#28391c', '#3a5022', '#516a2a', '#6c8834', '#8fa846', '#b6c868']),
    path: ramp(['#2e1c14', '#45291c', '#5c3a26', '#764c30', '#90623e']), gap: hexToRgb('#24160f'), dirtPath: true,
    stone: ramp(['#363a46', '#4e5462', '#6a7282', '#88909f', '#aab2c0']),
    water: ramp(['#14283e', '#1c3a56', '#28506e', '#386a86', '#5a90a6', '#94c4cc', '#e2f4f2']),
    wood: ramp(['#2a1a12', '#432a1c', '#5e3c28', '#7a5034', '#946642']),
    earth: ramp(['#22160f', '#342216', '#4a301e', '#624028', '#7a5232']),
    under: ramp(['#1a1e2a', '#262c3e', '#323a52', '#404a66', '#4e5a7a']),
    haze: hexToRgb('#a6b2c8'), root: hexToRgb('#34421f'),
    ambient: '#d6c6c0', fog: '#e8eef8', fog2: '#ffd8b8', underDepth: 140, bloom: 0.6,
    moon: { x: 360, y: 168, r: 30, col: '#ffe8bc', glow: '#ff9850', sun: true },
    rays: { dir: 1, alpha: 0.075 },
  },
};

function grid(W, H, v) { return Array.from({ length: H }, () => Array(W).fill(v)); }
function newMap(W, H, theme) {
  return { W, H, theme, type: grid(W, H, null), h: grid(W, H, 0), block: grid(W, H, false), objects: [], columns: [], lights: [], falls: [], colliders: [] };
}
const typeAt = (m, x, y) => (x < 0 || y < 0 || x >= m.W || y >= m.H) ? null : m.type[y][x];
const isGrassy = t => t === 'g' || t === 'f' || t === 'p' || t === 'd';

// ---- tile surface colour (world-continuous so tiles blend organically) ------
function surfaceColor(m, t, wx, wy, px, py) {
  const th = m.theme;
  if (isGrassy(t)) {
    const wx2 = wx + (vnoise(wx * 2.3, wy * 2.3, 5) - 0.5) * 0.75, wy2 = wy + (vnoise(wx * 2.3 + 9, wy * 2.3, 6) - 0.5) * 0.75;
    const t2 = typeAt(m, Math.floor(wx2), Math.floor(wy2));
    if (isGrassy(t2)) t = t2;
  }
  if (t === 'g' || t === 'f' || t === 'd') {
    const n = fbm(wx * 0.7, wy * 0.7, 3, 1), lp = fbm(wx * 0.14, wy * 0.14, 2, 2);
    let v = 0.42 + (n - 0.5) * 0.55 + (lp - 0.5) * 0.7 + (hash2(px, py >> 1, 3) - 0.5) * 0.14;
    if (t === 'd') v -= 0.15;
    // wet bank
    for (const [dx, dy] of [[0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) if (typeAt(m, Math.floor(wx + dx), Math.floor(wy + dy)) === 'w') { v -= 0.28; break; }
    const hsh = hash2(px, py, 7), dens = t === 'f' ? 0.035 : 0.006;
    if (hsh < dens) {
      const k = Math.floor(hash2(px, py, 8) * 4);
      return hexToRgb(['#f6a6c8', '#fff1f7', '#ffe08a', '#9fd8ff'][k]);
    }
    return rampDither(th.grass, v, px, py);
  }
  if (t === 'p' && th.dirtPath) {   // packed forest dirt with pebbles and fallen needles
    let v = 0.42 + (fbm(wx * 1.3, wy * 1.3, 3, 61) - 0.5) * 0.5 + (hash2(px, py, 62) - 0.5) * 0.12;
    const hs = hash2(px, py, 63);
    if (hs < 0.012) return th.stone[3];
    if (hs < 0.03) return th.grass[2];
    return rampDither(th.path, v, px, py);
  }
  if (t === 'p') {
    const s = 3.2, X = wx * s, Y = wy * s, gx = Math.floor(X), gy = Math.floor(Y);
    let f1 = 9, f2 = 9, fx = 0, fy = 0, cid = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = gx + dx + hash2(gx + dx, gy + dy, 11), cy = gy + dy + hash2(gx + dx, gy + dy, 12);
      const d = Math.hypot(X - cx, Y - cy);
      if (d < f1) { f2 = f1; f1 = d; fx = X - cx; fy = Y - cy; cid = hash2(gx + dx, gy + dy, 13); } else if (d < f2) f2 = d;
    }
    if (f2 - f1 < 0.13) return fbm(wx * 3, wy * 3, 1, 14) > 0.6 ? th.grass[2] : th.gap;
    const v = 0.35 + cid * 0.35 + (fx * 0.6 + fy * 0.7) * -0.55 + (hash2(px, py, 15) - 0.5) * 0.1;
    return rampDither(th.path, v, px, py);
  }
  if (t === 'w') {
    let depth = 0;
    for (const r of [0.3, 0.6]) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (typeAt(m, Math.floor(wx + dx), Math.floor(wy + dy)) === 'w' || typeAt(m, Math.floor(wx + dx), Math.floor(wy + dy)) === 'b') depth++;
    let v = 0.78 - depth * 0.07 + (fbm(wx * 1.2, wy * 3, 2, 21) - 0.5) * 0.3;
    if (depth < 5 && hash2(px, py, 22) < 0.25) v += 0.25;
    if (fbm(wx * 2, wy * 6, 2, 23) > 0.7) v += 0.3;
    return rampDither(th.water, v, px, py);
  }
  if (t === 'b') {
    const fr = (wy % 1 + 1) % 1, pl = wx * 5;
    if (fr < 0.1 || fr > 0.9) return th.wood[0];
    if ((pl % 1) < 0.14) return th.wood[1];
    return rampDither(th.wood, 0.5 + hash2(Math.floor(pl), 0, 24) * 0.35 + (fr - 0.5) * -0.3, px, py);
  }
  if (t === 's') {
    const v = 0.55 + (fbm(wx * 3, wy * 3, 2, 25) - 0.5) * 0.4 - ((wy % 1) < 0.08 ? 0.3 : 0);
    return rampDither(th.stone, v, px, py);
  }
  if (t === 'x' || t === 'r') {
    const row = Math.floor(wy * 2), X = wx * 2 + (row % 2) * 0.5;
    const gx = Math.floor(X), fx = X - gx, fy = wy * 2 - row;
    if (fx < 0.06 || fy < 0.08) return th.gap;
    let v = 0.25 + hash2(gx, row, 26) * 0.35 + (0.5 - fy) * 0.25 + (fbm(wx * 4, wy * 4, 2, 27) - 0.5) * 0.3;
    if (Math.abs(fbm(wx * 1.5, wy * 1.5, 3, 28) - 0.5) < 0.012) return th.gap; // cracks
    if (t === 'r') {
      v -= 0.1;
      const d = Math.hypot(wx - m.cx, wy - m.cy), a = Math.atan2(wy - m.cy, wx - m.cx);
      for (const R of [1.2, 2.1, 2.8]) if (Math.abs(d - R) < 0.07) return hexToRgb('#b68cff');
      if (d > 1.2 && d < 2.1 && Math.abs(Math.sin(a * 4)) < 0.05) return hexToRgb('#9b6ee8');
    }
    if (fbm(wx * 0.35, wy * 0.35, 2, 29) > 0.6 && hash2(px, py, 30) < 0.6) return rampDither(th.grass, v + 0.15, px, py);
    return rampDither(th.stone, v, px, py);
  }
  return [255, 0, 255];
}

// ---- ground + slab + underside ------------------------------------------------
function rasterGround(m) {
  const th = m.theme, minSX = -m.H * 16, W = (m.W + m.H) * 16, GB = (m.W + m.H) * 8;
  const SLAB = 12, H = GB + SLAB + th.underDepth + 60;
  const pb = new PixBuf(W, H);
  m.gox = minSX; m.goy = 0;
  for (let py = 0; py < GB; py++) for (let px = 0; px < W; px++) {
    const [wx, wy] = toWorld(px + minSX + 0.5, py + 0.5);
    const tx = Math.floor(wx), ty = Math.floor(wy), t = typeAt(m, tx, ty);
    if (!t) continue;
    let c = surfaceColor(m, t, wx, wy, px, py);
    if (t === 'w') c = mulRgb(c, 0.92);
    pb.set(px, py, c);
  }
  // front edge per column
  const edge = new Int32Array(W).fill(-1);
  for (let px = 0; px < W; px++) for (let py = GB - 1; py >= 0; py--) if (pb.a(px, py)) { edge[px] = py; break; }
  let firstPx = W, lastPx = 0;
  for (let px = 0; px < W; px++) if (edge[px] >= 0) { firstPx = Math.min(firstPx, px); lastPx = Math.max(lastPx, px); }
  const cx = (firstPx + lastPx) / 2, hw = (lastPx - firstPx) / 2;
  m.crystalSpots = [];
  for (let px = 0; px < W; px++) {
    const e = edge[px]; if (e < 0) continue;
    const slope = (edge[Math.min(W - 1, px + 2)] - edge[Math.max(0, px - 2)]);
    const lit = slope >= 0 ? 1 : 0.68;
    const [wx, wy] = toWorld(px + minSX + 0.5, e - 0.5);
    const edgeT = typeAt(m, Math.floor(wx), Math.floor(wy));
    for (let d = 1; d <= SLAB; d++) {
      let c;
      if (edgeT === 'w') c = rampDither(th.water, 0.55 - d / SLAB * 0.2, px, e + d);
      else if (d < 3 && isGrassy(edgeT)) c = th.grass[d === 1 ? 3 : 1];
      else {
        let v = (0.75 - d / SLAB * 0.35 + (vnoise(px * 0.2, d * 0.6, 40) - 0.5) * 0.3) * lit;
        if ((d + Math.floor(vnoise(px * 0.08, 0, 41) * 3)) % 5 === 0) v -= 0.15;
        c = rampDither(edgeT === 'x' || edgeT === 'r' || edgeT === 's' ? th.stone : th.earth, v, px, e + d);
      }
      pb.set(px, e + d, c);
    }
    // underside
    const s = Math.pow(Math.max(0, 1 - Math.abs(px - cx) / hw), 0.55);
    const k = Math.floor(px / 7), hk = hash2(k, 0, 78);
    const spike = hk > 0.55 ? (hk - 0.55) * 2.2 * 46 * Math.max(0, 1 - Math.abs((px % 7) - 3) / 3.6) : 0;
    const L = Math.max(2, th.underDepth * s * (0.62 + 0.55 * fbm(px * 0.025, 0, 3, 77)) + spike * s);
    for (let d = 0; d < L; d++) {
      const y = e + SLAB + 1 + d, t = d / L;
      let v = (0.72 - t * 0.55) * lit + (fbm(px * 0.12, y * 0.035, 3, 79) - 0.5) * 0.4 + (vnoise(px * 0.6, 0, 80) - 0.5) * 0.2;
      let c = rampDither(th.under, v, px, y);
      c = mixRgb(c, th.haze, clamp(t * t * 0.75, 0, 0.75));
      pb.set(px, y, c);
    }
    if (hash2(px, 0, 81) > 0.955 && edgeT !== 'w') {
      const len = 8 + hash2(px, 1, 82) * 26;
      for (let d = 0; d < len; d++) pb.set(px + Math.round(Math.sin(d * 0.3 + px) * 0.7), e + SLAB + d, mixRgb(th.root, th.haze, d / len * 0.5));
    }
    if (hash2(px, 2, 83) > 0.985 && L > 30) m.crystalSpots.push({ px, py: e + SLAB + L * (0.25 + hash2(px, 3, 84) * 0.35) });
  }
  const can = pb.toCanvas();
  const cx2 = can.getContext('2d');
  for (const s of m.crystalSpots) {
    const img = m.themeId === 'ruins' ? ART.crystalViolet : ART.crystal;
    cx2.save(); cx2.translate(s.px, s.py); cx2.scale(1, -1); cx2.drawImage(img, -8, -22); cx2.restore();
    m.lights.push({ sx: s.px + minSX, sy: s.py + 8, r: 46, col: m.themeId === 'ruins' ? '#b36bff' : '#7fd2ff', a: 0.75 });
  }
  m.ground = can;
}

// ---- elevated tiles become depth-sorted columns ----------------------------
function rasterColumn(m, i, j) {
  const th = m.theme, h = m.h[j][i], t = m.type[j][i], hz = h * ZS;
  const W = 32, H = 16 + hz + 1;
  const pb = new PixBuf(W, H);
  const ox = isoX(i, j) - 16, oy = isoY(i, j, h);
  const pillar = t === 'pillar';
  const faceRamp = (t === 's' || pillar) ? th.stone : th.earth;
  const topT = pillar ? 'x' : t;
  for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
    const [wx, wy] = toWorld(ox + cx + 0.5, oy + cy + 0.5 + hz);
    if (wx >= i && wx < i + 1 && wy >= j && wy < j + 1 && cy < 17) {
      let c = surfaceColor(m, topT, wx, wy, ox + cx, oy + cy);
      if (pillar) c = rampDither(th.stone, 0.75 + (hash2(cx, cy, 9) - 0.5) * 0.2, cx, cy);
      pb.set(cx, cy, c); continue;
    }
    let top, lit, u;
    if (cx < 16) { top = 8 + (cx + 0.5) * 0.5; lit = 1; u = cx / 16; } else { top = 16 - (cx - 15.5) * 0.5; lit = 0.66; u = (cx - 16) / 16; }
    const d = cy - top;
    if (d < 0 || d >= hz) continue;
    let c;
    if (t === 'w' && cx < 16) c = rampDither(th.water, 0.5, cx, cy);
    else if (d < 2 && isGrassy(t)) c = th.grass[d < 1 ? 4 : 2];
    else if (pillar) {
      let v = (0.62 - d / hz * 0.3 + ((cx % 5) === 0 ? -0.22 : 0) + (vnoise(cx * 0.4, (oy + cy) * 0.3, 44) - 0.5) * 0.25) * lit;
      if (d < 3) v += 0.15;
      c = rampDither(th.stone, v, cx, cy);
    } else {
      let v = (0.7 - d / Math.max(hz, 12) * 0.35 + (vnoise((i + u) * 8, d * 0.35, 42) - 0.5) * 0.4) * lit;
      if ((d + Math.floor(vnoise((i + u) * 3, j, 43) * 4)) % 6 === 0) v -= 0.18;
      c = rampDither(faceRamp, v, cx, cy);
      // hanging vines on lit faces
      if (isGrassy(t) && cx < 16 && hash2(i * 32 + cx, j, 45) > 0.86 && d < 4 + hash2(i * 32 + cx, j, 46) * hz * 0.8) c = th.grass[2 + (Math.floor(d) % 2)];
    }
    pb.set(cx, cy, c);
  }
  return { kind: 'column', img: pb.toCanvas(), sx: ox, sy: oy, key: i + j + 1, x: i + 0.5, y: j + 0.5 };
}

function finalizeMap(m) {
  rasterGround(m);
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (!m.type[j][i]) continue;
    if (m.h[j][i] > 0) m.columns.push(rasterColumn(m, i, j));
    if (m.type[j][i] === 'w' || m.type[j][i] === 'pillar') m.block[j][i] = true;
  }
  // waterfalls: water tiles whose +y neighbour is lower (or void)
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (m.type[j][i] !== 'w') continue;
    const nT = typeAt(m, i, j + 1), h = m.h[j][i];
    if (!nT) m.falls.push({ x0: isoX(i, j + 1), y0: isoY(i, j + 1, 0) + 12, len: m.theme.underDepth + 80, edge: true, key: -1 });
    else if (m.h[j + 1][i] < h) m.falls.push({ x0: isoX(i, j + 1), y0: isoY(i, j + 1, h), len: (h - m.h[j + 1][i]) * ZS, edge: false, key: i + j + 1.05, wx: i + 0.5, wy: j + 1.1 });
  }
  for (const o of m.objects) {
    if (o.lights) for (const L of o.lights) m.lights.push(L);
  }
}

function tileH(m, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!typeAt(m, tx, ty)) return 0;
  return m.h[ty][tx];
}
function walkable(m, x, y, fromH) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!typeAt(m, tx, ty) || m.block[ty][tx]) return false;
  return Math.abs(m.h[ty][tx] - fromH) <= 1.05;
}

function addProp(m, img, x, y, o = {}) {
  const z = o.z != null ? o.z : tileH(m, x, y);
  const obj = Object.assign({ kind: 'sprite', img, x, y, z, ax: img.width / 2, ay: img.height - 1, r: 0, key: x + y + z * 0.35, shadow: 0 }, o);
  obj.z = z; obj.key = x + y + z * 0.35 + (o.keyBias || 0);
  if (o.light) obj.lights = [Object.assign({ sx: isoX(x, y), sy: isoY(x, y, z) - (o.light.h || 0) }, o.light)];
  m.objects.push(obj);
  if (obj.r > 0) m.colliders.push(obj);
  return obj;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function polyDist(px, py, pts) { let d = 99; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, ...pts[i], ...pts[i + 1])); return d; }

// =========================================================================
// Maps are DATA (js/world.js, edited with editor.html). OBJ_TYPES says how each
// placeable thing looks and behaves; buildMapFromData turns a map record into
// the runtime structure (tiles, rasterised ground, columns, props, lights).
// =========================================================================
const OBJ_TYPES = {
  tree_round: { label: 'Round tree', img: () => ART.trees.round, r: 0.32, shadow: 11 },
  tree_poplar: { label: 'Poplar', img: () => ART.trees.poplar, r: 0.32, shadow: 7 },
  tree_blossom: { label: 'Blossom tree', img: () => ART.trees.blossom, r: 0.32, shadow: 11 },
  tree_teal: { label: 'Teal tree', img: () => ART.trees.teal, r: 0.32, shadow: 11 },
  tree_dead: { label: 'Dead tree', img: () => ART.trees.dead, r: 0.3, shadow: 8 },
  bush: { label: 'Bush', img: () => ART.bush, r: 0.2, shadow: 6 },
  rock: { label: 'Rock', img: () => ART.rock, r: 0.28, shadow: 6 },
  rock_dark: { label: 'Dark rock', img: () => ART.rockDark, r: 0.28, shadow: 6 },
  grass: { label: 'Tall grass', img: () => ART.grass, grass: true },
  mushroom: { label: 'Glow mushroom', img: () => [ART.mushroom], light: { r: 22, col: '#6fd6ff', a: 0.8, h: 3 } },
  lantern: { label: 'Lantern', img: () => [ART.lantern], r: 0.12, shadow: 3, light: { r: 60, col: '#ffbe73', a: 0.95, h: 14 } },
  lantern_blue: { label: 'Blue lantern', img: () => [ART.lanternBlue], r: 0.12, light: { r: 50, col: '#8ff0ff', a: 0.8, h: 14 } },
  crystal: { label: 'Crystal', img: () => [ART.crystal], r: 0.25, light: { r: 60, col: '#7fd2ff', a: 0.85, h: 10 } },
  crystal_violet: { label: 'Violet crystal', img: () => [ART.crystalViolet], r: 0.25, light: { r: 50, col: '#b36bff', a: 0.8, h: 10 } },
  sign: { label: 'Sign', img: () => [ART.sign], r: 0.15, shadow: 4 },
  shrine: { label: 'Checkpoint shrine', img: () => [ART.shrine], r: 0.35, shadow: 7, checkpoint: true, light: { r: 56, col: '#9ef0ff', a: 0.85, h: 16 } },
  chest: { label: 'Treasure chest (tier: wood/silver/gold)', img: () => [ART.chest], r: 0.3, shadow: 6, chest: true },
  tablet: { label: 'Lore tablet (text)', img: () => [ART.tablet], r: 0.2, shadow: 5, tablet: true, light: { r: 26, col: '#b8e0ff', a: 0.6, h: 8 } },
  brazier: { label: 'Brazier', img: () => [ART.brazier], r: 0.3, shadow: 5, brazier: true, light: { r: 80, col: '#b36bff', a: 1, h: 12 } },
  house: { label: 'Cottage (2x2)', img: () => [ART.house.c], house: true },
  pine_giant: { label: 'Giant pine', img: () => ART.pines.giant, r: 0.45, shadow: 16 },
  pine: { label: 'Pine', img: () => ART.pines.tall, r: 0.32, shadow: 10 },
  pine_young: { label: 'Young pine', img: () => ART.pines.young, r: 0.22, shadow: 6 },
  mushroom_red: { label: 'Toadstool', img: () => [ART.mushroomRed] },
  moss: { label: 'Moss mound', img: () => ART.moss, shadow: 7 },
  log: { label: 'Fallen log', img: () => [ART.log], r: 0.45, shadow: 9 },
  stump: { label: 'Stump', img: () => [ART.stump], r: 0.3, shadow: 6 },
  sunbeam: { label: 'Sunbeam', img: () => [ART.sunIcon], beam: true, light: { r: 96, col: '#ffdca0', a: 0.85, h: 2 } },
  gate: { label: 'Gate (id, ang, len): openGate opens it', barrier: 'gate' },
  keydoor: { label: 'Key door (id, key, ang, len)', barrier: 'keydoor' },
  hidden: { label: 'Hidden wall (id, ang, len): openGate reveals', barrier: 'hidden' },
  lever: { label: 'Lever (id, gate?)', img: () => [ART.sign], r: 0.15, shadow: 4, lever: true, light: { r: 24, col: '#ffd35a', a: 0.6, h: 8 } },
  fishspot: { label: 'Fishing spot (pool) - stub', img: () => [ART.sunIcon], fish: true },
  fox: { label: 'Fox (animal)', img: () => [ART.custom.fox || ART.sunIcon], critter: 'fox' },
  rabbit: { label: 'Rabbit (animal)', img: () => [ART.custom.rabbit || ART.sunIcon], critter: 'rabbit' },
};
// tile characters used in world data
const TILE_TYPES = {
  g: 'Grass', f: 'Flower meadow', p: 'Cobble path', w: 'Water', b: 'Bridge', s: 'Stone stairs',
  x: 'Flagstones', r: 'Rune floor', d: 'Dark moss', c: 'Pillar', '.': 'Void (no ground)',
};
const THEME_OF = {};   // map id -> theme id (for portal colours)

function buildMapFromData(id, d) {
  const m = newMap(d.W, d.H, THEMES[d.theme] || THEMES.vale);
  m.id = id; m.themeId = THEMES[d.theme] ? d.theme : 'vale';
  m.name = d.name || id; m.sub = d.sub || ''; m.objective = d.objective || '';
  m.triggers = d.triggers || [];
  for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) {
    const ch = (d.tiles[y] || '')[x] || '.';
    m.type[y][x] = ch === '.' ? null : ch === 'c' ? 'pillar' : ch;
    m.h[y][x] = m.type[y][x] ? (parseInt((d.heights[y] || '')[x] || '0', 36) || 0) : 0;
    if (m.type[y][x] === 'r') m.hasRunes = true;
  }
  m.cx = d.sigil ? d.sigil.x : d.W / 2; m.cy = d.sigil ? d.sigil.y : d.H / 2;
  m.start = { x: d.start.x, y: d.start.y };
  // a portal may name its arrival point: to: { map, x, y } or arrive: { x, y } (else the target map's start)
  m.portals = (d.portals || []).map(p => {
    const q = Object.assign({}, p, { z: tileH(m, p.x, p.y) });
    if (p.to && typeof p.to === 'object') { q.to = p.to.map; if (p.to.x != null) q.arrive = { x: +p.to.x, y: +p.to.y }; }
    return q;
  });
  placeObjects(m, d);
  finalizeMap(m);
  return m;
}
// Props + portals from the data record (the editor re-runs this alone when only objects change).
function placeObjects(m, d) {
  m.objects = []; m.colliders = []; m.chimneys = []; m.critterSpawns = [];
  seedRng(m.id.length * 131 + d.W * 7 + d.H);
  for (const o of d.objects || []) {
    const def = OBJ_TYPES[o.t]; if (!def) continue;
    if (!isFinite(+o.x) || !isFinite(+o.y)) continue;
    if (def.house) {   // a 2x2 cell block: fractional coordinates snap to the cell (generator / editor drift)
      const hx = Math.floor(+o.x), hy = Math.floor(+o.y);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (typeAt(m, hx + dx, hy + dy)) m.block[hy + dy][hx + dx] = true;
      const H = ART.house, z = tileH(m, hx, hy);
      if (!m.block[hy]) continue;
      const house = addProp(m, H.c, hx + 1, hy + 1, { ax: H.ox, ay: H.oy + 16, z, src: o });
      house.lights = H.lights.map(L => ({ sx: isoX(hx + L.x, hy + L.y), sy: isoY(hx + L.x, hy + L.y, L.z + z), r: L.r, col: L.col, a: L.a }));
      m.chimneys.push({ x: hx + H.chimney.x, y: hy + H.chimney.y, z: H.chimney.z + z });
      continue;
    }
    if (def.barrier) { placeBarrier(m, o, def.barrier); continue; }
    if (def.critter) { m.critterSpawns.push({ type: def.critter, x: o.x, y: o.y }); if (!window.EDITOR_MODE) continue; }
    const imgs = def.img(), img = imgs[(o.v || 0) % imgs.length];
    const ob = addProp(m, img, +o.x, +o.y, { r: def.r || 0, shadow: def.shadow || 0, flip: !!o.f, grass: !!def.grass, sway: rand(0, 6.28), brazier: !!def.brazier, beam: !!def.beam && !window.EDITOR_MODE, chest: !!def.chest, checkpoint: !!def.checkpoint, tablet: !!def.tablet, light: def.light ? Object.assign({}, def.light) : undefined, src: o });
    if (def.lever) { ob.lever = true; ob.gid = o.gate || null; ob.use = LEVER_USE; }
    if (def.fish) { ob.fish = true; ob.use = FISH_USE; if (o.hidden) ob.secret = true; }
  }
  for (const p of m.portals) m.objects.push({ kind: 'portal', x: p.x, y: p.y, z: p.z, key: p.x + p.y + p.z * 0.35, portal: p });
}

// ===== barriers: gate / keydoor / hidden wall ===============================================================
const BARRIER_LOOK = {
  gate: { img: () => ART.stump, r: 0.3, step: 0.42, col: null },
  keydoor: { img: () => ART.crystalViolet, r: 0.28, step: 0.5, light: { r: 30, col: '#b36bff', a: 0.7, h: 10 } },
  hidden: { img: () => ART.rockDark, r: 0.3, step: 0.4 },
};
function placeBarrier(m, o, kind) {
  const L = BARRIER_LOOK[kind], len = +o.len || 2, a = (+o.ang || 0) + Math.PI / 2, n = Math.max(2, Math.ceil(len / L.step) + 1);
  const id = o.id || `${kind}_${(+o.x).toFixed(1)}_${(+o.y).toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5, x = +o.x + Math.cos(a) * len * t, y = +o.y + Math.sin(a) * len * t;
    const im = L.img(), img = Array.isArray(im) ? im[i % im.length] : im, ob = addProp(m, img, x, y, { r: L.r, shadow: 5, src: o, light: L.light && i === (n >> 1) ? Object.assign({}, L.light) : undefined });
    ob.barrier = kind; ob.gid = id; ob.doorKey = o.key || null;
    if (kind === 'keydoor' && i === (n >> 1)) ob.use = KEYDOOR_USE;
  }
}
const gateKey = (mapId, id) => `${mapId}:${id}`;
const gateOpen = (m, id) => !!(G.prog && G.prog.gates && G.prog.gates[gateKey(m.id, id)]);
// on map entry: gates opened in an earlier visit stay open, their levers stay pulled
function syncGates(m) {
  if (m._gateCol) m.colliders = m._gateCol.slice();   // restore after an earlier openGate in this session
  for (const o of m.objects) {
    if (o.barrier) o.gone = gateOpen(m, o.gid);
    if (o.lever) o.pulled = gateOpen(m, leverGate(m, o) || '');
  }
  m._gateCol = m._gateCol || m.colliders.slice();
  m.colliders = m.colliders.filter(c => !c.gone);
}
// the gate a lever works: explicit `gate`, else a barrier id sharing the lever id's suffix (lever_r2 -> gate_r2)
function leverGate(m, lv) {
  if (lv.gid) return lv.gid;
  const suf = String(lv.src.id || '').replace(/^lever_?/, '');
  const ids = [...new Set(m.objects.filter(o => o.barrier && o.barrier !== 'keydoor').map(o => o.gid))];
  return ids.find(id => suf && (id.endsWith('_' + suf) || id.startsWith(suf + '_') || id === suf)) || null;
}
// open a barrier (trigger openGate, a lever, a key): its colliders go, the pieces sink in a burst
function openGate(id, fromTrigger) {
  const m = G.map; if (!m || !id) return false;
  const parts = m.objects.filter(o => o.barrier && o.gid === id);
  const was = gateOpen(m, id);
  (G.prog.gates || (G.prog.gates = {}))[gateKey(m.id, id)] = true;
  for (const o of parts) {
    if (!o.gone) burst(o.x, o.y, o.z + 0.6, 6, o.barrier === 'hidden' ? ['#5a4a6a', '#8a7a9a'] : o.barrier === 'keydoor' ? ['#b36bff', '#ffffff'] : ['#8a6a4a', '#c8b090'], 2, { glow: o.barrier === 'keydoor' });
    o.gone = true;
  }
  m.colliders = m.colliders.filter(c => !c.gone);
  for (const o of m.objects) if (o.lever && leverGate(m, o) === id) o.pulled = true;
  if (parts.length && !was) { shake(4); sfx(parts[0].barrier === 'hidden' ? 'boom' : 'portal'); if (parts[0].barrier === 'hidden') say('A hidden passage!'); }
  return parts.length > 0;
}
const LEVER_USE = { kind: 'lever', reach: 1.4, on: o => !o.pulled, text: () => 'Pull lever',
  fn(o) { const id = leverGate(G.map, o); o.pulled = true; sfx('trap'); if (id) openGate(id); else say('The lever clicks. Somewhere, something moved.'); } };
const KEYDOOR_USE = { kind: 'keydoor', reach: 1.8, on: o => !o.gone, text: o => (hasKey(o.doorKey) ? 'Unlock' : 'Locked'),
  fn(o) { if (hasKey(o.doorKey)) { openGate(o.gid); say('The key turns. The roots let go.'); } else { say('Locked. It needs a key.'); sfx('hurt'); } } };
const FISH_USE = { kind: 'fishspot', reach: 1.6, on: () => true, text: () => 'Fish (coming soon)',
  fn(o) { say('The water ripples. Fishing arrives in a later dream.'); fx({ type: 'ring', x: o.x, y: o.y, r: 0.8, col: '#9fe8ff', life: 0.6 }); sfx('blink'); } };
