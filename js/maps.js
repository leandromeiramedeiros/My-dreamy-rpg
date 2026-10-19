'use strict';
// ---------------------------------------------------------------------------
// Map building: tile grids, per-pixel ground rasterisation, cliff columns,
// floating-island underside, props, colliders and static lights.
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
    const img = m.id === 'ruins' ? ART.crystalViolet : ART.crystal;
    cx2.save(); cx2.translate(s.px, s.py); cx2.scale(1, -1); cx2.drawImage(img, -8, -22); cx2.restore();
    m.lights.push({ sx: s.px + minSX, sy: s.py + 8, r: 46, col: m.id === 'ruins' ? '#b36bff' : '#7fd2ff', a: 0.75 });
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
// MAP 1 — The Whispering Vale (exploration, no enemies)
// =========================================================================
function buildVale() {
  const m = newMap(24, 24, THEMES.vale);
  m.id = 'vale'; m.name = 'Whispering Vale'; m.sub = 'A dream drifting above the clouds';
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    m.type[y][x] = fbm(x * 0.25, y * 0.25, 2, 3) > 0.6 || (x >= 20 && y >= 11) ? 'f' : 'g';
  }
  // eastern plateau
  for (let y = 0; y <= 8; y++) for (let x = 16; x < 24; x++) m.h[y][x] = 4;
  m.h[8][16] = 0; m.h[0][16] = 0; m.h[8][23] = 0;
  for (const y of [3, 4]) { m.h[y][15] = 3; m.h[y][14] = 2; m.h[y][13] = 1; m.type[y][15] = m.type[y][14] = m.type[y][13] = 's'; }
  // spring and stream on the plateau
  for (const [x, y] of [[19, 5], [20, 5], [19, 6], [20, 6], [19, 7], [19, 8]]) m.type[y][x] = 'w';
  // river below
  const river = [];
  for (let y = 9; y <= 10; y++) for (const x of [18, 19, 20]) river.push([x, y]);
  for (let y = 11; y <= 14; y++) for (const x of [18, 19]) river.push([x, y]);
  for (let y = 15; y <= 19; y++) for (const x of [17, 18]) river.push([x, y]);
  for (let y = 20; y <= 23; y++) for (const x of [16, 17]) river.push([x, y]);
  for (const [x, y] of river) m.type[y][x] = 'w';
  m.type[13][18] = m.type[13][19] = 'b';
  // paths
  const main = [[2.5, 19.5], [5, 17.5], [7.5, 14.5], [9.5, 11.5], [11, 8.5], [11.6, 5.5], [12.6, 4]];
  const branch = [[7.5, 14.5], [11, 13.6], [17, 13.5], [21, 13.5], [21.6, 16.8]];
  const door = [[6.6, 5], [8.5, 5.6], [11.3, 6.6]];
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (!isGrassy(m.type[y][x]) || m.h[y][x] !== 0) continue;
    const d = Math.min(polyDist(x + 0.5, y + 0.5, main), polyDist(x + 0.5, y + 0.5, branch), polyDist(x + 0.5, y + 0.5, door));
    if (d < 0.85) m.type[y][x] = 'p';
  }
  // house (2x2 footprint, N corner at 4,4)
  for (const [x, y] of [[4, 4], [5, 4], [4, 5], [5, 5]]) m.block[y][x] = true;
  const H = ART.house;
  const house = addProp(m, H.c, 5, 5, { ax: H.ox, ay: H.oy + 16, shadow: 0 });
  house.lights = H.lights.map(L => ({ sx: isoX(4 + L.x, 4 + L.y), sy: isoY(4 + L.x, 4 + L.y, L.z), r: L.r, col: L.col, a: L.a }));
  house.key = 10;
  m.chimney = { x: 4 + H.chimney.x, y: 4 + H.chimney.y, z: H.chimney.z };

  m.start = { x: 3.2, y: 19.2 };
  m.portal = { x: 21.5, y: 2.5, z: 4 };
  m.shrine = { x: 21.6, y: 19.6 };

  seedRng(777);
  const isPathish = (x, y) => { const t = typeAt(m, x, y); return t === 'p' || t === 'b' || t === 's' || t === 'w'; };
  const nearPath = (x, y, r) => {
    for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
      if (isPathish(tx, ty) && Math.hypot(tx + 0.5 - x, ty + 0.5 - y) < r + 0.5) return true;
    }
    return false;
  };
  const free = (x, y, r = 0.9) => {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!isGrassy(typeAt(m, tx, ty)) || m.block[ty][tx] || typeAt(m, tx, ty) === 'p') return false;
    if (nearPath(x, y, r)) return false;
    if (dist(x, y, 5, 5) < 2.3 || dist(x, y, m.start.x, m.start.y) < 1.6) return false;
    if (dist(x, y, m.portal.x, m.portal.y) < 2.9 || dist(x, y, 16.5, 3.8) < 1.6 || dist(x, y, m.shrine.x, m.shrine.y) < 1.6) return false;
    // keep tree trunks off the edge of the plateau cliff
    const h = m.h[ty][tx];
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const nt = typeAt(m, tx + dx, ty + dy); if (h > 0 && nt && m.h[ty + dy][tx + dx] < h && (x - tx > 0.6 || y - ty > 0.6)) return false; }
    for (const o of m.colliders) if (dist(o.x, o.y, x, y) < 0.8) return false;
    return true;
  };
  const tree = (x, y, kind) => {
    const img = pick(ART.trees[kind]);
    addProp(m, img, x, y, { r: 0.32, shadow: kind === 'poplar' ? 7 : 11, sway: rand(0, 6.28), flip: rand() < 0.5 });
  };
  // forest along the north-west and north-east rims
  for (let y = 0; y < 24; y++) for (const x of [0, 1]) {
    const px = x + 0.5 + rand(-0.2, 0.2), py = y + 0.5 + rand(-0.2, 0.2);
    if (free(px, py, 0.6)) tree(px, py, x === 0 ? pick(['poplar', 'poplar', 'teal']) : pick(['round', 'teal', 'poplar']));
  }
  for (let x = 2; x < 16; x++) for (const y of [0, 1]) {
    const px = x + 0.5 + rand(-0.2, 0.2), py = y + 0.5 + rand(-0.2, 0.2);
    if (rand() < 0.85 && free(px, py, 0.6)) tree(px, py, y === 0 ? pick(['poplar', 'teal']) : pick(['round', 'teal', 'poplar']));
  }
  for (const [x, y] of [[3, 7.3], [7.6, 3.2], [2.6, 3.1], [9.2, 2.6]]) if (free(x, y, 0.5)) tree(x, y, 'blossom');
  // plateau grove
  for (let y = 0; y <= 8; y++) for (let x = 16; x < 24; x++) {
    if (m.h[y][x] !== 4 || (x < 22 && y > 1) || rand() > 0.6) continue;
    const px = x + 0.5 + rand(-0.15, 0.15), py = y + 0.5 + rand(-0.15, 0.15);
    if (free(px, py, 0.5)) tree(px, py, pick(['poplar', 'teal', 'round']));
  }
  // meadow scatter
  for (let i = 0; i < 260; i++) {
    const x = rand(2, 23.5), y = rand(2, 23.5);
    const east = x > 20 && y > 10;
    if (rand() < (east ? 0.18 : 0.1) && free(x, y, 1.1)) tree(x, y, pick(['round', 'round', 'teal', 'blossom']));
  }
  for (let i = 0; i < 26; i++) { const x = rand(1, 23), y = rand(1, 23); if (free(x, y, 0.6)) addProp(m, pick(ART.bush), x, y, { r: 0.2, shadow: 6 }); }
  for (let i = 0; i < 14; i++) { const x = rand(1, 23), y = rand(1, 23); if (free(x, y, 0.5)) addProp(m, pick(ART.rock), x, y, { r: 0.28, shadow: 6 }); }
  for (let i = 0; i < 90; i++) { const x = rand(0.3, 23.7), y = rand(0.3, 23.7); const t = typeAt(m, Math.floor(x), Math.floor(y)); if ((t === 'g' || t === 'f') && !m.block[Math.floor(y)][Math.floor(x)]) addProp(m, ART.grass[0], x, y, { grass: true, sway: rand(0, 6.28) }); }
  // glowing mushrooms in the forest shade
  for (let i = 0; i < 16; i++) {
    const x = rand(0.4, 2.6), y = rand(2, 23); const xx = i % 2 ? x : y, yy = i % 2 ? y : x;
    const t = typeAt(m, Math.floor(xx), Math.floor(yy));
    if (isGrassy(t) && !m.block[Math.floor(yy)][Math.floor(xx)]) addProp(m, ART.mushroom, xx, yy, { light: { r: 22, col: '#6fd6ff', a: 0.8, h: 3 } });
  }
  // lanterns lining the road
  const lanternAlong = (pts, every, side) => {
    let acc = every * 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay);
      for (; acc < L; acc += every) {
        const t = acc / L, x = ax + (bx - ax) * t + (-(by - ay) / L) * side, y = ay + (by - ay) * t + ((bx - ax) / L) * side;
        const tx = Math.floor(x), ty = Math.floor(y);
        if (isGrassy(typeAt(m, tx, ty)) && !m.block[ty][tx]) addProp(m, ART.lantern, x, y, { r: 0.12, shadow: 3, light: { r: 60, col: '#ffbe73', a: 0.95, h: 14 } });
      }
      acc -= L;
    }
  };
  lanternAlong(main, 3.4, 1.0);
  lanternAlong(branch, 4.2, -1.0);
  addProp(m, ART.lantern, 17.2, 12.6, { r: 0.12, light: { r: 56, col: '#ffbe73', a: 0.9, h: 14 } });
  addProp(m, ART.lantern, 20.8, 14.4, { r: 0.12, light: { r: 56, col: '#ffbe73', a: 0.9, h: 14 } });
  addProp(m, ART.sign, 4.3, 18.4, { r: 0.15, shadow: 4 });
  // shrine + crystals
  addProp(m, ART.shrine, m.shrine.x, m.shrine.y, { r: 0.35, shadow: 7 });
  addProp(m, ART.crystal, m.shrine.x + 0.7, m.shrine.y - 0.4, { r: 0.25, light: { r: 70, col: '#7fd2ff', a: 0.9, h: 10 } });
  addProp(m, ART.crystal, 21.4, 6.8, { r: 0.25, light: { r: 60, col: '#7fd2ff', a: 0.85, h: 10 } });
  addProp(m, ART.crystal, 18.2, 6.3, { r: 0.25, light: { r: 50, col: '#a6e8ff', a: 0.7, h: 10 } });
  m.objects.push({ kind: 'portal', x: m.portal.x, y: m.portal.y, z: 4, key: m.portal.x + m.portal.y + 4 * 0.35 });
  finalizeMap(m);
  m.lights.push({ sx: isoX(19.5, 9.5), sy: isoY(19.5, 9.5), r: 70, col: '#9adff0', a: 0.55 });
  return m;
}

// =========================================================================
// MAP 2 — Gloomspire Ruins (waves + boss)
// =========================================================================
function buildRuins() {
  const m = newMap(22, 22, THEMES.ruins);
  m.id = 'ruins'; m.name = 'Gloomspire Ruins'; m.sub = 'Where the dream turns to nightmare';
  m.cx = 11; m.cy = 11;
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
    const d = Math.hypot(x + 0.5 - 11, y + 0.5 - 11);
    if (d < 10.4 + (fbm(x * 0.3, y * 0.3, 2, 5) - 0.5) * 1.6) m.type[y][x] = d > 9.2 ? 'd' : (d < 3 ? 'r' : 'x');
  }
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2 + 0.26, px = Math.floor(11 + Math.cos(a) * 8), py = Math.floor(11 + Math.sin(a) * 8);
    if (!m.type[py][px]) continue;
    const front = Math.cos(a) + Math.sin(a) > 0.5;
    m.type[py][px] = 'pillar'; m.h[py][px] = front ? 2 : (k % 3 === 0 ? 4 : 8); m.block[py][px] = true;
  }
  seedRng(991);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, x = 11 + Math.cos(a) * 5.6, y = 11 + Math.sin(a) * 5.6;
    addProp(m, ART.brazier, x, y, { r: 0.3, shadow: 5, brazier: true, light: { r: 80, col: '#b36bff', a: 1, h: 12 } });
  }
  for (let i = 0; i < 70; i++) {
    const x = rand(0, 22), y = rand(0, 22), d = Math.hypot(x - 11, y - 11);
    const t = typeAt(m, Math.floor(x), Math.floor(y));
    if (!t || t === 'pillar' || d < 9) continue;
    if (m.colliders.some(o => dist(o.x, o.y, x, y) < 1)) continue;
    const r = rand();
    if (r < 0.3) addProp(m, pick(ART.trees.dead), x, y, { r: 0.3, shadow: 8, flip: rand() < 0.5 });
    else if (r < 0.55) addProp(m, pick(ART.rockDark), x, y, { r: 0.28, shadow: 6 });
    else if (r < 0.7) addProp(m, ART.crystalViolet, x, y, { r: 0.25, light: { r: 50, col: '#b36bff', a: 0.8, h: 10 } });
  }
  for (const a of [2.6, 4.0, 5.6]) addProp(m, ART.lanternBlue, 11 + Math.cos(a) * 9.4, 11 + Math.sin(a) * 9.4, { r: 0.12, light: { r: 50, col: '#8ff0ff', a: 0.8, h: 14 } });
  m.start = { x: 6.2, y: 16.2 };
  m.portal = { x: 4.6, y: 17.6, z: 0 };
  m.objects.push({ kind: 'portal', x: m.portal.x, y: m.portal.y, z: 0, key: m.portal.x + m.portal.y, back: true });
  finalizeMap(m);
  return m;
}
