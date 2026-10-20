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
//
// ===== BIG MAPS (DESIGN §25): the contract the generator / level designer emits =================================
// A zone is ONE map record split into SECTIONS that share the grid, separated by 3-tile VOID GUTTERS.
//   tiles   'v' = gutter drawn as a CLIFF (a chasm under the land lip), 'k' = gutter drawn as DARKNESS (underground).
//           Both are impassable and count as void for walking, edges, waterfalls and projectiles; only the
//           raster and the minimap draw them. '.' stays plain void (sky).
//   sections: [{ id, name, kind: 'outer' | 'under' | 'vault' | 'arena', x, y, w, h  (or rects: [[x, y, w, h], ...]),
//               ambient?: '#hex' (lightmap fill, replaces theme.ambient), dark?: 0..1 (darkness module: the ambient is
//               mixed toward black by `dark`, the hero carries a lantern; place lantern / crystal / mushroom objects
//               for light), under?: true (kind 'under' implies it: darkened on the full map until discovered) }]
//           Later rects win. Tiles in no rect belong to the implicit section { id: 'main' }. sectionAt(m, x, y).
//   anchors: [{ id, x, y }]  named arrival points. Any object with an `id` (warpdoor, shrine, lever ...) is also an
//           anchor. Resolution order: warpdoor ids -> anchors -> shrine ids -> other object ids.
//   objects { t: 'warpdoor', id, x, y, to: { x, y } | '<anchorId>', key?: 'key_*', label?, open?: false }  Interact = a
//           0.4 s fade warp inside the same map (no load, trigger state kept). Keyed doors stay locked until the hero
//           holds the key (loot card item: 'key_*'); open: false = sealed until a trigger openGate { id: <door id> }.
//           Either unlock persists in G.prog.gates['map:id'].
//           { t: 'shrine', id?, name?, warp?: false, x, y }  id defaults to 'shrine_<x>_<y>'; warp: false = a plain
//           checkpoint, never a warp end; kind 'underground' is accepted for 'under'. Discovered within 3 tiles;
//           shrine-to-shrine warp from the full-map screen (M / D-pad down) while standing at a discovered shrine,
//           only while no enemy is awake (game.js shrineWarp).
//           { t: 'gate', id, open: true, ... }  an ARENA gate that starts open; the trigger action closeGate shuts it
//           for the fight (never persisted), so a respawn reopens it; openGate (fight won) opens it for good.
//   triggers  actions { type: 'warp', to: { x, y } | '<anchorId>' } · { type: 'closeGate', id } ·
//           { type: 'arena', id, gate?, x, y, r }  starts an inline arena fight (closes `gate`, tags spawns, snapshots
//           pillar tiles inside r). Dying resets it: gate reopens, adds go, pillars return (game.js triggers header).
// Runtime (game, not editor): the ground is a CHUNKED raster (CHUNK below): 512 px chunks (256 on phones), at most 24
// resident (12 on phones) across all maps, LRU-evicted; built in row bands from render.js groundTick() by priority
// (visible-missing first, nearest the camera). Only the chunk under the camera is built synchronously (behind the
// fade / loading screen); a 1/4-res preview covers chunks still in the queue. Columns (elevated tiles) are rastered
// with their chunk and freed with it. m.ground exists only in the editor (EDITOR_MODE: one full raster).
// PHONE = pointer: coarse, or ?phone=1 / ?phone=0 to force (engine-check's phone pass).
// SPATIAL GRID (8x8-tile buckets): gridQuery(m, 'objs' | 'cols' | 'water', x0, y0, x1, y1, out) · nearColliders(m, x, y,
// r, out) · lightsIn(m, sx0, sy0, sx1, sy1, out) (screen-space 256 px cells). Rebuilt lazily when the arrays change.
// ---------------------------------------------------------------------------
const PHONE = (() => {
  try { const q = new URLSearchParams(location.search).get('phone'); if (q != null) return q !== '0'; } catch (e) { /* no location */ }
  return !!(typeof window !== 'undefined' && window.matchMedia && matchMedia('(pointer: coarse)').matches);
})();
const CHUNK = { size: PHONE ? 256 : 512, max: PHONE ? 12 : 24, cache: new Map(), jobs: new Map(), frame: 0, built: 0, evicted: 0 };
const GRID_B = 8;
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
// groundPrep(m): per raster column, from tile geometry (no pixels): the first / last surface row (top / edge), the
// underside length, root strands and crystal spots. Every pixel is then a pure function of (px, py), so any rect of
// the raster (a chunk band, or the whole thing for the editor) renders identically: rasterRect().
const SLAB = 12;
function groundPrep(m) {
  if (m.gp) return m.gp;
  const th = m.theme, minSX = -m.H * 16, W = (m.W + m.H) * 16, GB = (m.W + m.H) * 8;
  const H = GB + SLAB + th.underDepth + 60;
  const top = new Int32Array(W).fill(-1), edge = new Int32Array(W).fill(-1);
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (!m.type[j][i]) continue;
    const cx = (i - j) * 16 - minSX, a = Math.max(0, cx - 17), b = Math.min(W - 1, cx + 17);
    for (let px = a; px <= b; px++) {
      const k = (px + minSX + 0.5) / 16, lo = Math.max(2 * i - k, 2 * j + k), hi = Math.min(2 * i + 2 - k, 2 * j + 2 + k);
      if (lo >= hi) continue;
      const y0 = Math.ceil(8 * lo - 0.5), y1 = Math.ceil(8 * hi - 0.5) - 1;
      if (y1 < y0) continue;
      if (top[px] < 0 || y0 < top[px]) top[px] = y0;
      if (y1 > edge[px]) edge[px] = y1;
    }
  }
  let firstPx = W, lastPx = 0;
  for (let px = 0; px < W; px++) if (edge[px] >= 0) { firstPx = Math.min(firstPx, px); lastPx = Math.max(lastPx, px); }
  const cx = (firstPx + lastPx) / 2, hw = Math.max(1, (lastPx - firstPx) / 2);
  const len = new Float32Array(W), bot = new Int32Array(W).fill(-1), root = new Float32Array(W);
  m.crystalSpots = [];
  for (let px = 0; px < W; px++) {
    const e = edge[px]; if (e < 0) continue;
    const s = Math.pow(Math.max(0, 1 - Math.abs(px - cx) / hw), 0.55);
    const k = Math.floor(px / 7), hk = hash2(k, 0, 78);
    const spike = hk > 0.55 ? (hk - 0.55) * 2.2 * 46 * Math.max(0, 1 - Math.abs((px % 7) - 3) / 3.6) : 0;
    const L = Math.max(2, th.underDepth * s * (0.62 + 0.55 * fbm(px * 0.025, 0, 3, 77)) + spike * s);
    len[px] = L;
    const [wx, wy] = toWorld(px + minSX + 0.5, e - 0.5), edgeT = typeAt(m, Math.floor(wx), Math.floor(wy));
    if (hash2(px, 0, 81) > 0.955 && edgeT !== 'w') root[px] = 8 + hash2(px, 1, 82) * 26;
    bot[px] = Math.ceil(e + SLAB + 1 + Math.max(L, root[px]));
    if (hash2(px, 2, 83) > 0.985 && L > 30) m.crystalSpots.push({ px, py: e + SLAB + L * (0.25 + hash2(px, 3, 84) * 0.35) });
  }
  for (const s of m.crystalSpots) m.lights.push({ sx: s.px + minSX, sy: s.py + 8, r: 46, col: m.themeId === 'ruins' ? '#b36bff' : '#7fd2ff', a: 0.75 });
  m.gox = minSX; m.goy = 0;
  return (m.gp = { W, H, GB, minSX, top, edge, len, bot, root });
}
const isGutter = (m, x, y) => !!(m.gutter && x >= 0 && y >= 0 && x < m.W && y < m.H && m.gutter[y * m.W + x]);
// a gutter pixel: 'v' = a chasm whose north lip shows a cliff face, 'k' = darkness
function gutterColor(m, wx, wy, px, py) {
  const th = m.theme, g = m.gutter[Math.floor(wy) * m.W + Math.floor(wx)];
  if (g === 1) for (let d = 0.2; d <= 1.6; d += 0.2) {
    const t = typeAt(m, Math.floor(wx - d), Math.floor(wy - d));
    if (t) { const v = 0.62 - d * 0.36 + (vnoise(px * 0.3, py * 0.15, 47) - 0.5) * 0.3; return mulRgb(rampDither(t === 'x' || t === 'r' || t === 's' ? th.stone : th.earth, v, px, py), Math.max(0.25, 1 - d * 0.45)); }
  }
  return mulRgb(th.under[0], 0.35 + hash2(px, py, 48) * 0.08);
}
// render raster rect [x0, x0 + w) x [y0, y0 + h) into `out`, an ImageData whose pixel (0, 0) is raster (ox, oy)
function rasterRect(m, out, ox, oy, x0, y0, w, h) {
  const th = m.theme, G0 = groundPrep(m), { W, GB, minSX, top, edge, len, root } = G0, d = out.data, ow = out.width, oh = out.height;
  const put = (px, py, c) => {
    const x = px - ox, y = py - oy; if (x < 0 || y < 0 || x >= ow || y >= oh) return;
    const i = (y * ow + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  };
  const xa = Math.max(0, x0), xb = Math.min(W, x0 + w), y1 = y0 + h;
  for (let py = y0; py < Math.min(y1, GB); py++) for (let px = xa; px < xb; px++) {
    if (top[px] < 0 || py < top[px] || py > edge[px]) continue;
    const [wx, wy] = toWorld(px + minSX + 0.5, py + 0.5);
    const tx = Math.floor(wx), ty = Math.floor(wy), t = typeAt(m, tx, ty);
    if (!t) { if (isGutter(m, tx, ty)) put(px, py, gutterColor(m, wx, wy, px, py)); continue; }
    let c = surfaceColor(m, t, wx, wy, px, py);
    if (t === 'w') c = mulRgb(c, 0.92);
    put(px, py, c);
  }
  // front edge per column: slab, underside, root strands (roots spill one column either side)
  for (let px = Math.max(0, xa - 1); px < Math.min(W, xb + 1); px++) {
    const e = edge[px]; if (e < 0 || e + 1 >= y1 || G0.bot[px] < y0) continue;
    const slope = (edge[Math.min(W - 1, px + 2)] - edge[Math.max(0, px - 2)]);
    const lit = slope >= 0 ? 1 : 0.68;
    const [wx, wy] = toWorld(px + minSX + 0.5, e - 0.5);
    const edgeT = typeAt(m, Math.floor(wx), Math.floor(wy)), inX = px >= xa && px < xb;
    if (inX) {
      for (let dd = 1; dd <= SLAB; dd++) {
        const y = e + dd; if (y < y0 || y >= y1) continue;
        let c;
        if (edgeT === 'w') c = rampDither(th.water, 0.55 - dd / SLAB * 0.2, px, y);
        else if (dd < 3 && isGrassy(edgeT)) c = th.grass[dd === 1 ? 3 : 1];
        else {
          let v = (0.75 - dd / SLAB * 0.35 + (vnoise(px * 0.2, dd * 0.6, 40) - 0.5) * 0.3) * lit;
          if ((dd + Math.floor(vnoise(px * 0.08, 0, 41) * 3)) % 5 === 0) v -= 0.15;
          c = rampDither(edgeT === 'x' || edgeT === 'r' || edgeT === 's' ? th.stone : th.earth, v, px, y);
        }
        put(px, y, c);
      }
      const L = len[px], ua = Math.max(0, y0 - (e + SLAB + 1)), ub = Math.min(L, y1 - (e + SLAB + 1));
      for (let dd = ua; dd < ub; dd++) {
        const y = e + SLAB + 1 + dd, t = dd / L;
        let v = (0.72 - t * 0.55) * lit + (fbm(px * 0.12, y * 0.035, 3, 79) - 0.5) * 0.4 + (vnoise(px * 0.6, 0, 80) - 0.5) * 0.2;
        let c = rampDither(th.under, v, px, y);
        c = mixRgb(c, th.haze, clamp(t * t * 0.75, 0, 0.75));
        put(px, y, c);
      }
    }
    const rl = root[px];
    for (let dd = 0; dd < rl; dd++) { const y = e + SLAB + dd; if (y >= y0 && y < y1) put(px + Math.round(Math.sin(dd * 0.3 + px) * 0.7), y, mixRgb(th.root, th.haze, dd / rl * 0.5)); }
  }
}
function drawCrystals(m, ctx, x0, y0, w, h) {
  const img = m.themeId === 'ruins' ? ART.crystalViolet : ART.crystal;
  for (const s of m.crystalSpots) {
    if (s.px + 12 < x0 || s.px - 12 > x0 + w || s.py + 26 < y0 || s.py - 4 > y0 + h) continue;
    ctx.save(); ctx.translate(s.px - x0, s.py - y0); ctx.scale(1, -1); ctx.drawImage(img, -8, -22); ctx.restore();
  }
}
// the editor's (and tests') full raster: m.ground at (m.gox, m.goy)
function rasterGround(m) {
  const g = groundPrep(m), img = new ImageData(g.W, g.H);
  rasterRect(m, img, 0, 0, 0, 0, g.W, g.H);
  const { c, x } = makeCanvas(g.W, g.H); x.putImageData(img, 0, 0);
  drawCrystals(m, x, 0, 0, g.W, g.H);
  m.ground = c;
}

// ===== chunk cache (game) =====================================================================================
// chunk index = cj * nx + ci over the raster; CHUNK.cache: key 'map|idx' -> { m, idx, c, last }; LRU by `last`
// (the CHUNK.frame it was last drawn). CHUNK.jobs: partial builds { m, idx, img, row, cols } advanced in row bands.
function chunkGrid(m) {
  if (m.cg) return m.cg;
  const g = groundPrep(m), S = CHUNK.size, nx = Math.ceil(g.W / S), ny = Math.ceil(g.H / S);
  const empty = new Uint8Array(nx * ny), cols = Array.from({ length: nx * ny }, () => []);
  for (let cj = 0; cj < ny; cj++) for (let ci = 0; ci < nx; ci++) {
    let any = false; const x0 = ci * S, y0 = cj * S;
    for (let px = Math.max(0, x0 - 1); px < Math.min(g.W, x0 + S + 1) && !any; px++) if (g.top[px] >= 0 && g.top[px] < y0 + S && g.bot[px] >= y0) any = true;
    empty[cj * nx + ci] = any ? 0 : 1;
  }
  for (const c of m.columns) {
    const ci = clamp(Math.floor((c.sx + 16 - g.minSX) / S), 0, nx - 1), cj = clamp(Math.floor((c.sy + 8) / S), 0, ny - 1);
    c.chunk = cj * nx + ci; cols[c.chunk].push(c); empty[c.chunk] = 0;
  }
  return (m.cg = { S, nx, ny, empty, cols });
}
const chunkKey = (m, idx) => m.id + '|' + idx;
const chunkResident = (m, idx) => CHUNK.cache.get(chunkKey(m, idx));
// advance one chunk build by up to `ms` (Infinity = finish now); returns true once the chunk is resident
function buildChunkStep(m, idx, ms) {
  const key = chunkKey(m, idx); if (CHUNK.cache.has(key)) return true;
  const cg = chunkGrid(m), S = cg.S, ci = idx % cg.nx, cj = (idx / cg.nx) | 0, t0 = performance.now();
  let job = CHUNK.jobs.get(key);
  if (!job) { job = { m, idx, img: new ImageData(S, S), row: 0, col: 0 }; CHUNK.jobs.set(key, job); }
  job.touch = CHUNK.frame;
  const BAND = PHONE ? 16 : 8;
  while (job.row < S) {
    rasterRect(m, job.img, ci * S, cj * S, ci * S, cj * S + job.row, S, Math.min(BAND, S - job.row));
    job.row += BAND;
    if (performance.now() - t0 > ms) return false;
  }
  if (!job.c) {
    const { c, x } = makeCanvas(S, S); x.putImageData(job.img, 0, 0); drawCrystals(m, x, ci * S, cj * S, S, S);
    job.c = c; job.img = null;
  }
  const cols = cg.cols[idx];
  while (job.col < cols.length) { const k = cols[job.col++]; if (!k.img) k.img = rasterColumn(m, k.i, k.j).img; if (performance.now() - t0 > ms) return false; }
  CHUNK.jobs.delete(key);
  CHUNK.cache.set(key, { m, idx, c: job.c, last: CHUNK.frame }); CHUNK.built++;
  chunkEvict(m);
  return true;
}
// LRU across every map; chunks of the current map drawn this frame are never evicted
function chunkEvict(cur) {
  while (CHUNK.cache.size > CHUNK.max) {
    let worst = null;
    for (const [k, ch] of CHUNK.cache) {
      if (ch.m === cur && ch.last >= CHUNK.frame - 1) continue;   // drawn this frame or the last one: visible
      if (!worst || (ch.m !== cur) > (worst.m !== cur) || ((ch.m !== cur) === (worst.m !== cur) && ch.last < worst.last)) worst = Object.assign({ k }, ch);
    }
    if (!worst) break;
    const ch = CHUNK.cache.get(worst.k); CHUNK.cache.delete(worst.k); CHUNK.evicted++;
    ch.c.width = 0;
    for (const k of chunkGrid(ch.m).cols[ch.idx]) k.img = null;   // the chunk's columns go with it
  }
}
// cheap 1/4-res stand-in drawn under chunks that are still in the queue (flat tile colours, slab, underside)
function groundPreview(m) {
  if (m.preview) return m.preview;
  const g = groundPrep(m), th = m.theme, Q = 4, w = Math.ceil(g.W / Q), h = Math.ceil(g.H / Q), img = new ImageData(w, h), d = img.data;
  const pal = { g: th.grass[3], f: th.grass[4], d: th.grass[1], p: th.path[2], w: th.water[3], b: th.wood[2], s: th.stone[2], x: th.stone[2], r: th.stone[1], pillar: th.stone[3] };
  for (let qy = 0; qy < h; qy++) for (let qx = 0; qx < w; qx++) {
    const px = qx * Q + 2, py = qy * Q + 2; if (px >= g.W) continue;
    const e = g.edge[px]; if (e < 0 || py < g.top[px]) continue;
    let c = null;
    if (py <= e) { const [wx, wy] = toWorld(px + g.minSX + 0.5, py + 0.5), tx = Math.floor(wx), ty = Math.floor(wy), t = typeAt(m, tx, ty); c = t ? pal[t] || th.grass[3] : isGutter(m, tx, ty) ? mulRgb(th.under[0], 0.4) : null; }
    else if (py <= e + SLAB) c = th.earth[2];
    else if (py <= e + SLAB + g.len[px]) c = mixRgb(th.under[2], th.haze, clamp((py - e - SLAB) / g.len[px], 0, 0.75));
    if (!c) continue;
    const i = (qy * w + qx) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  const { c, x } = makeCanvas(w, h); x.putImageData(img, 0, 0);
  return (m.preview = c);
}
// chunk index under a world-screen point (sx, sy)
function chunkAt(m, sx, sy) { const cg = chunkGrid(m), g = m.gp; return clamp(Math.floor((sx - g.minSX) / cg.S), 0, cg.nx - 1) + clamp(Math.floor(sy / cg.S), 0, cg.ny - 1) * cg.nx; }
function ensureChunkAt(m, x, y) { const idx = chunkAt(m, isoX(x, y), isoY(x, y, tileH(m, x, y))); if (!chunkGrid(m).empty[idx]) buildChunkStep(m, idx, Infinity); return idx; }

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
  const eager = typeof window !== 'undefined' && window.EDITOR_MODE;
  groundPrep(m);
  if (eager) rasterGround(m);
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (!m.type[j][i]) continue;
    // game: the column image is rastered with its ground chunk (chunkGrid / buildChunkStep) and freed with it
    if (m.h[j][i] > 0) m.columns.push(eager ? rasterColumn(m, i, j) : lazyColumn(m, i, j));
    if (m.type[j][i] === 'w' || m.type[j][i] === 'pillar') m.block[j][i] = true;
  }
  // waterfalls: water tiles whose +y neighbour is lower (or void; a gutter swallows the water instead)
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (m.type[j][i] !== 'w') continue;
    const nT = typeAt(m, i, j + 1), h = m.h[j][i];
    if (!nT) { if (!isGutter(m, i, j + 1)) m.falls.push({ x0: isoX(i, j + 1), y0: isoY(i, j + 1, 0) + 12, len: m.theme.underDepth + 80, edge: true, key: -1 }); }
    else if (m.h[j + 1][i] < h) m.falls.push({ x0: isoX(i, j + 1), y0: isoY(i, j + 1, h), len: (h - m.h[j + 1][i]) * ZS, edge: false, key: i + j + 1.05, wx: i + 0.5, wy: j + 1.1 });
  }
  for (const o of m.objects) {
    if (o.lights) for (const L of o.lights) m.lights.push(L);
  }
  if (!eager) chunkGrid(m);
}
function lazyColumn(m, i, j) {
  const h = m.h[j][i];
  return { kind: 'column', img: null, sx: isoX(i, j) - 16, sy: isoY(i, j, h), key: i + j + 1, x: i + 0.5, y: j + 0.5, i, j };
}

// ===== spatial grid: 8x8-tile buckets ==========================================================================
// gridOf(m).objs / .cols / .water: arrays of buckets (bx + by * nx) holding refs; rebuilt when m.objects / m.columns
// change identity or length (placeObjects, the editor). Colliders: own grid, rebuilt when m.colliders changes
// (openGate / closeGate / syncGates assign a new array); gone pieces are skipped. Lights: screen-space 256 px cells.
function gridOf(m) {
  const g = m._grid;
  if (g && g.oRef === m.objects && g.oLen === m.objects.length && g.cRef === m.columns && g.cLen === m.columns.length) return g;
  const nx = Math.ceil(m.W / GRID_B) || 1, ny = Math.ceil(m.H / GRID_B) || 1, mk = () => Array.from({ length: nx * ny }, () => []);
  const b = (x, y) => clamp(Math.floor(x / GRID_B), 0, nx - 1) + clamp(Math.floor(y / GRID_B), 0, ny - 1) * nx;
  const G1 = { nx, ny, b, objs: mk(), cols: mk(), water: mk(), oRef: m.objects, oLen: m.objects.length, cRef: m.columns, cLen: m.columns.length };
  for (const o of m.objects) G1.objs[b(o.x, o.y)].push(o);
  for (const c of m.columns) G1.cols[b(c.x, c.y)].push(c);
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.type[j][i] === 'w' && m.h[j][i] === 0) for (let k = 0; k < 3; k++) G1.water[b(i, j)].push({ i, j, a: hash2(i, j, k), b: hash2(j, i, k + 9) });
  return (m._grid = G1);
}
// every ref in buckets overlapping tile rect [x0, x1] x [y0, y1] (appended to out)
function gridQuery(m, kind, x0, y0, x1, y1, out = []) {
  const g = gridOf(m), L = g[kind];
  const bx0 = clamp(Math.floor(x0 / GRID_B), 0, g.nx - 1), bx1 = clamp(Math.floor(x1 / GRID_B), 0, g.nx - 1);
  const by0 = clamp(Math.floor(y0 / GRID_B), 0, g.ny - 1), by1 = clamp(Math.floor(y1 / GRID_B), 0, g.ny - 1);
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) { const q = L[bx + by * g.nx]; for (let i = 0; i < q.length; i++) out.push(q[i]); }
  return out;
}
function colliderGrid(m) {
  const g = m._cgrid;
  if (g && g.ref === m.colliders && g.len === m.colliders.length) return g;
  const nx = Math.ceil(m.W / GRID_B) || 1, ny = Math.ceil(m.H / GRID_B) || 1, cells = Array.from({ length: nx * ny }, () => []);
  let maxR = 0;
  for (const c of m.colliders) { cells[clamp(Math.floor(c.x / GRID_B), 0, nx - 1) + clamp(Math.floor(c.y / GRID_B), 0, ny - 1) * nx].push(c); maxR = Math.max(maxR, c.r || 0); }
  return (m._cgrid = { nx, ny, cells, maxR, ref: m.colliders, len: m.colliders.length });
}
// colliders that may touch a circle (x, y, r): the caller still does the exact test
function nearColliders(m, x, y, r, out = []) {
  const g = colliderGrid(m), R = r + g.maxR + 0.01;
  const bx0 = clamp(Math.floor((x - R) / GRID_B), 0, g.nx - 1), bx1 = clamp(Math.floor((x + R) / GRID_B), 0, g.nx - 1);
  const by0 = clamp(Math.floor((y - R) / GRID_B), 0, g.ny - 1), by1 = clamp(Math.floor((y + R) / GRID_B), 0, g.ny - 1);
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) { const q = g.cells[bx + by * g.nx]; for (let i = 0; i < q.length; i++) if (!q[i].gone) out.push(q[i]); }
  return out;
}
const LCELL = 256;
function lightsIn(m, sx0, sy0, sx1, sy1, out = []) {
  let g = m._lgrid;
  if (!g || g.ref !== m.lights || g.len !== m.lights.length) {
    g = m._lgrid = { cells: new Map(), ref: m.lights, len: m.lights.length, maxR: 0 };
    for (const L of m.lights) { const k = Math.floor(L.sx / LCELL) + ',' + Math.floor(L.sy / LCELL); let q = g.cells.get(k); if (!q) g.cells.set(k, q = []); q.push(L); g.maxR = Math.max(g.maxR, L.r || 0); }
  }
  const R = g.maxR;
  for (let cy = Math.floor((sy0 - R) / LCELL); cy <= Math.floor((sy1 + R) / LCELL); cy++) for (let cx = Math.floor((sx0 - R) / LCELL); cx <= Math.floor((sx1 + R) / LCELL); cx++) { const q = g.cells.get(cx + ',' + cy); if (q) for (const L of q) out.push(L); }
  return out;
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
  gate: { label: 'Gate (id, ang, len): openGate opens it', img: () => [ART.stump], barrier: 'gate' },
  keydoor: { label: 'Key door (id, key, ang, len)', img: () => [ART.crystalViolet], barrier: 'keydoor' },
  hidden: { label: 'Hidden wall (id, ang, len): openGate reveals', img: () => ART.rockDark, barrier: 'hidden' },
  lever: { label: 'Lever (id, gate?)', img: () => [ART.sign], r: 0.15, shadow: 4, lever: true, light: { r: 24, col: '#ffd35a', a: 0.6, h: 8 } },
  fishspot: { label: 'Fishing spot (pool) - stub', img: () => [ART.sunIcon], fish: true },
  warpdoor: { label: 'Warp door (id, to: {x,y} | anchor id, key?)', img: () => [warpdoorArt()], r: 0.3, shadow: 6, warpdoor: true, light: { r: 34, col: '#9ef0ff', a: 0.7, h: 14 } },
  fox: { label: 'Fox (animal)', img: () => [ART.custom.fox || ART.sunIcon], critter: 'fox' },
  rabbit: { label: 'Rabbit (animal)', img: () => [ART.custom.rabbit || ART.sunIcon], critter: 'rabbit' },
};
// tile characters used in world data
const TILE_TYPES = {
  g: 'Grass', f: 'Flower meadow', p: 'Cobble path', w: 'Water', b: 'Bridge', s: 'Stone stairs',
  x: 'Flagstones', r: 'Rune floor', d: 'Dark moss', c: 'Pillar', '.': 'Void (no ground)',
  v: 'Void gutter (cliff)', k: 'Void gutter (darkness)',
};
const THEME_OF = {};   // map id -> theme id (for portal colours)

function buildMapFromData(id, d) {
  const m = newMap(d.W, d.H, THEMES[d.theme] || THEMES.vale);
  m.id = id; m.themeId = THEMES[d.theme] ? d.theme : 'vale';
  m.name = d.name || id; m.sub = d.sub || ''; m.objective = d.objective || '';
  m.triggers = d.triggers || [];
  m.gutter = new Uint8Array(d.W * d.H);
  for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) {
    const ch = (d.tiles[y] || '')[x] || '.';
    if (ch === 'v' || ch === 'k') m.gutter[y * d.W + x] = ch === 'v' ? 1 : 2;   // void gutters: void to the engine
    m.type[y][x] = ch === '.' || ch === 'v' || ch === 'k' ? null : ch === 'c' ? 'pillar' : ch;
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
  buildSections(m, d);
  placeObjects(m, d);
  finalizeMap(m);
  buildAnchors(m, d);
  sectionCentres(m);
  // the start chunk is rastered now (behind the loading screen / the portal fade); the rest streams in (render.js)
  if (!(typeof window !== 'undefined' && window.EDITOR_MODE)) ensureChunkAt(m, m.start.x, m.start.y);
  return m;
}
// ===== sections, anchors ========================================================================================
function buildSections(m, d) {
  m.secMain = { id: 'main', name: m.name, kind: 'outer', i: 0 };
  m.sections = [m.secMain]; m.secAt = new Uint8Array(m.W * m.H);
  for (const s0 of d.sections || []) {
    if (!s0 || !s0.id) continue;
    const sec = Object.assign({}, s0, { i: m.sections.length });
    sec.kind = sec.kind || 'outer'; sec.under = !!(sec.under || sec.kind === 'under' || sec.kind === 'underground'); sec.dark = clamp(+sec.dark || 0, 0, 1);
    sec.rects = s0.rects || [[+s0.x || 0, +s0.y || 0, +s0.w || 0, +s0.h || 0]];
    if (sec.i > 255) break;
    m.sections.push(sec);
    for (const [x, y, w, h] of sec.rects) for (let j = Math.max(0, y | 0); j < Math.min(m.H, (y | 0) + (h | 0)); j++) for (let i = Math.max(0, x | 0); i < Math.min(m.W, (x | 0) + (w | 0)); i++) m.secAt[j * m.W + i] = sec.i;
  }
}
function sectionCentres(m) {
  for (const sec of m.sections) {   // centre = the mean of its walkable tiles (engine-check tours these)
    let n = 0, sx = 0, sy = 0;
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.secAt[j * m.W + i] === sec.i && m.type[j][i] && !m.block[j][i]) { n++; sx += i + 0.5; sy += j + 0.5; }
    sec.tiles = n; sec.cx = n ? sx / n : m.W / 2; sec.cy = n ? sy / n : m.H / 2;
    let bd = 1e9, bx = sec.cx, by = sec.cy;   // snap to the nearest walkable tile of the section
    for (let j = 0; j < m.H && n; j++) for (let i = 0; i < m.W; i++) if (m.secAt[j * m.W + i] === sec.i && m.type[j][i] && !m.block[j][i]) { const d = (i + 0.5 - sec.cx) ** 2 + (j + 0.5 - sec.cy) ** 2; if (d < bd) { bd = d; bx = i + 0.5; by = j + 0.5; } }
    sec.cx = bx; sec.cy = by;
  }
}
const sectionAt = (m, x, y) => { const i = Math.floor(x), j = Math.floor(y); return (m.sections && i >= 0 && j >= 0 && i < m.W && j < m.H && m.sections[m.secAt[j * m.W + i]]) || m.secMain || null; };
function buildAnchors(m, d) {
  const A = m.anchors = {}, put = (id, x, y, rank) => { if (id && (!A[id] || A[id].rank > rank)) A[id] = { id, x: +x, y: +y, rank }; };
  for (const o of m.objects) if (o.src && o.src.id) put(o.src.id, o.x, o.y, o.warpdoor ? 0 : o.shrineId ? 2 : 3);
  for (const a of d.anchors || []) put(a.id, a.x, a.y, 1);
  for (const o of m.objects) if (o.shrineId) put(o.shrineId, o.x, o.y, 2);
}
// a warp target -> a walkable spot: { x, y } as given, or an anchor id (warp doors / shrines: a free tile beside it)
function resolveWarp(m, to) {
  if (to && typeof to === 'object' && isFinite(+to.x) && isFinite(+to.y)) return { x: +to.x, y: +to.y };
  const a = m.anchors && m.anchors[to]; if (!a) return null;
  const free = (x, y) => walkable(m, x, y, tileH(m, x, y)) && !nearColliders(m, x, y, 0.4).some(c => dist(x, y, c.x, c.y) < c.r + 0.4);
  if (a.rank === 1 && free(a.x, a.y)) return { x: a.x, y: a.y };
  for (const r of [1.1, 1.6, 2.2]) for (let k = 0; k < 8; k++) { const ang = Math.PI / 4 + k * Math.PI / 4, x = a.x + Math.cos(ang) * r, y = a.y + Math.sin(ang) * r; if (free(x, y)) return { x, y }; }
  return { x: a.x, y: a.y };
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
    if (def.warpdoor) { ob.warpdoor = true; ob.gid = o.id || `warpdoor_${(+o.x).toFixed(1)}_${(+o.y).toFixed(1)}`; ob.doorKey = o.key || null; ob.use = WARPDOOR_USE; }
    if (def.checkpoint) { ob.shrineId = o.id || `shrine_${Math.round(+o.x)}_${Math.round(+o.y)}`; ob.shrineName = o.name || null; }
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
    if (o.barrier) o.gone = gateOpen(m, o.gid) || !!(o.src && o.src.open);   // `open: true` = an arena gate, open until closeGate
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
// close a barrier for a fight (trigger closeGate / arena): never persisted, so a respawn (syncGates) reopens it
function closeGate(id) {
  const m = G.map; if (!m || !id) return false;
  const parts = m.objects.filter(o => o.barrier && o.gid === id);
  for (const o of parts) { if (o.gone) burst(o.x, o.y, o.z + 0.4, 5, ['#8a6a4a', '#c8b090'], 2); o.gone = false; }
  m.colliders = (m._gateCol || m.colliders).filter(c => !c.gone);
  if (parts.length) { shake(5); sfx('boom'); }
  return parts.length > 0;
}
// warp doors: Interact = a 0.4 s fade warp (game.js startWarp); a keyed door unlocks once with its key
const doorUnlocked = (m, o) => (!o.doorKey && o.src.open !== false) || gateOpen(m, o.gid);
const WARPDOOR_USE = { kind: 'warpdoor', reach: 1.5, on: () => true,
  text: o => (doorUnlocked(G.map, o) ? (o.src.label || 'Enter') : o.doorKey && hasKey(o.doorKey) ? 'Unlock' : o.doorKey ? 'Locked' : 'Sealed'),
  fn(o) {
    const m = G.map;
    if (!doorUnlocked(m, o)) {
      if (!o.doorKey) { say('Sealed. Something else opens it.'); sfx('hurt'); return; }
      if (!hasKey(o.doorKey)) { say('Locked. It needs a key.'); sfx('hurt'); return; }
      (G.prog.gates || (G.prog.gates = {}))[gateKey(m.id, o.gid)] = true; say('The key turns.'); sfx('portal');
    }
    if (typeof startWarp === 'function') startWarp(o.src.to != null ? o.src.to : o.src.anchor, { door: o });
  } };
let WARPDOOR_IMG = null;
function warpdoorArt() {
  return WARPDOOR_IMG || (WARPDOOR_IMG = asciiSprite([
    '...KKKKKK...', '..KSSSSSSK..', '.KSsBBBBsSK.', '.KSBbbbbBSK.', 'KSsBbccbBsSK', 'KSsBbccbBsSK', 'KSsBbbbbBsSK', 'KSsBbccbBsSK',
    'KSsBbbbbBsSK', 'KSsBbbbbBsSK', 'KSsBbbbbBsSK', 'KSsBbbbbBsSK', 'KSsBbbbbBsSK', 'KSSSSSSSSSSK', 'KKKKKKKKKKKK',
  ], { K: '#1a1428', S: '#6a6290', s: '#8f86b0', B: '#2a5aa8', b: '#163064', c: '#9ef0ff' }));
}
const LEVER_USE = { kind: 'lever', reach: 1.4, on: o => !o.pulled, text: () => 'Pull lever',
  fn(o) { const id = leverGate(G.map, o); o.pulled = true; sfx('trap'); if (id) openGate(id); else say('The lever clicks. Somewhere, something moved.'); } };
const KEYDOOR_USE = { kind: 'keydoor', reach: 1.8, on: o => !o.gone, text: o => (hasKey(o.doorKey) ? 'Unlock' : 'Locked'),
  fn(o) { if (hasKey(o.doorKey)) { openGate(o.gid); say('The key turns. The roots let go.'); } else { say('Locked. It needs a key.'); sfx('hurt'); } } };
const FISH_USE = { kind: 'fishspot', reach: 1.6, on: () => true, text: () => 'Fish (coming soon)',
  fn(o) { say('The water ripples. Fishing arrives in a later dream.'); fx({ type: 'ring', x: o.x, y: o.y, r: 0.8, col: '#9fe8ff', life: 0.6 }); sfx('blink'); } };
