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
  shrine: { label: 'Shrine', img: () => [ART.shrine], r: 0.35, shadow: 7 },
  brazier: { label: 'Brazier', img: () => [ART.brazier], r: 0.3, shadow: 5, brazier: true, light: { r: 80, col: '#b36bff', a: 1, h: 12 } },
  house: { label: 'Cottage (2x2)', img: () => [ART.house.c], house: true },
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
  m.portals = (d.portals || []).map(p => Object.assign({}, p, { z: tileH(m, p.x, p.y) }));
  placeObjects(m, d);
  finalizeMap(m);
  return m;
}
// Props + portals from the data record (the editor re-runs this alone when only objects change).
function placeObjects(m, d) {
  m.objects = []; m.colliders = []; m.chimneys = [];
  seedRng(m.id.length * 131 + d.W * 7 + d.H);
  for (const o of d.objects || []) {
    const def = OBJ_TYPES[o.t]; if (!def) continue;
    if (def.house) {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (typeAt(m, o.x + dx, o.y + dy)) m.block[o.y + dy][o.x + dx] = true;
      const H = ART.house, z = tileH(m, o.x, o.y);
      if (!m.block[o.y]) continue;
      const house = addProp(m, H.c, o.x + 1, o.y + 1, { ax: H.ox, ay: H.oy + 16, z, src: o });
      house.lights = H.lights.map(L => ({ sx: isoX(o.x + L.x, o.y + L.y), sy: isoY(o.x + L.x, o.y + L.y, L.z + z), r: L.r, col: L.col, a: L.a }));
      m.chimneys.push({ x: o.x + H.chimney.x, y: o.y + H.chimney.y, z: H.chimney.z + z });
      continue;
    }
    const imgs = def.img(), img = imgs[(o.v || 0) % imgs.length];
    addProp(m, img, o.x, o.y, { r: def.r || 0, shadow: def.shadow || 0, flip: !!o.f, grass: !!def.grass, sway: rand(0, 6.28), brazier: !!def.brazier, light: def.light ? Object.assign({}, def.light) : undefined, src: o });
  }
  for (const p of m.portals) m.objects.push({ kind: 'portal', x: p.x, y: p.y, z: p.z, key: p.x + p.y + p.z * 0.35, portal: p });
}
