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
// PHONE = pointer: coarse, or ?phone=1 / ?phone=0 to force (the engine tour's phone pass: tools/engine-tour.js).
// SPATIAL GRID (8x8-tile buckets): gridQuery(m, 'objs' | 'cols' | 'water', x0, y0, x1, y1, out) · nearColliders(m, x, y,
// r, out) · lightsIn(m, sx0, sy0, sx1, sy1, out) (screen-space 256 px cells). Rebuilt lazily when the arrays change.
// ---------------------------------------------------------------------------
const PHONE = (() => {
  try { const q = new URLSearchParams(location.search).get('phone'); if (q != null) return q !== '0'; } catch (e) { /* no location */ }
  return !!(typeof window !== 'undefined' && window.matchMedia && matchMedia('(pointer: coarse)').matches);
})();
// thrash = a chunk rebuilt within 120 frames of its eviction (the LRU fighting the prefetch ring); should stay 0
const CHUNK = { size: PHONE ? 256 : 512, max: PHONE ? 12 : 24, cache: new Map(), jobs: new Map(), frame: 0, built: 0, evicted: 0, thrash: 0, gone: new Map() };
const GRID_B = 8;
const THEMES = {
  vale: {
    seed: 11,
    sky: ['#141238', '#221d55', '#3a2e7a', '#5d3f98', '#8a52aa', '#b968b0', '#e08ab4', '#f6b2b0', '#ffd6b8'],
    mtnFar: ['#8e7fc8', '#5a4c94', '#e7a9c0'], mtnNear: ['#6a5aa8', '#3c2f70', '#c98ab8'], snow: '#cdbbe8',
    cloud: ramp(['#6c5aa0', '#9c86c8', '#d6b2d8', '#fbd9e4', '#ffffff']),
    grass: ramp(['#22284a', '#1f4a52', '#2c6b58', '#47925e', '#74b86a', '#a6d47e', '#e0eaa4']),   // §29 palette pass: hue-shifted (shadows to violet, lights to warm)
    path: ramp(['#6a6290', '#8f86b0', '#ada4cc', '#cbc4e4', '#e6e0f4']), gap: hexToRgb('#4a4268'),
    stone: ramp(['#211f2d', '#3a3556', '#54477e', '#6f59a5', '#a77cb9', '#cba1c7', '#ddc5d1']),
    water: ramp(['#1a2f6a', '#20438a', '#2a5aa8', '#3a7cc4', '#5aa8dc', '#9adff0', '#e8fbff']),
    wood: ramp(['#3e2834', '#5e3d40', '#80594f', '#a87a5c', '#c99a70']),
    earth: ramp(['#1a1924', '#332942', '#543760', '#7e447e', '#995285', '#ab6886', '#b7858e']),
    under: ramp(['#13131b', '#201d30', '#2e2544', '#3d2d58', '#54376a', '#6e417a', '#884e88']),
    flowers: ['#f6a6c8', '#fff1f7', '#ffe08a', '#9fd8ff'],
    haze: hexToRgb('#c6a8de'), root: hexToRgb('#3d5a4a'),
    ambient: '#cbbfec', fog: '#f6ecff', fog2: '#ffd6ec', underDepth: 150, bloom: 0.55,
    moon: { x: 470, y: 64, r: 26, col: '#fff3e6', glow: '#ffc9e6' },
  },
  ruins: {
    seed: 23,
    sky: ['#07040e', '#120822', '#1f0c33', '#361043', '#55164c', '#7a1f4f', '#a3334d', '#c9564a', '#e07a52'],
    mtnFar: ['#3a2050', '#1d0f30', '#6a2450'], mtnNear: ['#22122f', '#0c0716', '#41143a'], snow: null,
    cloud: ramp(['#1a0f2a', '#2e1a44', '#4a2a5e', '#6e3a70', '#a05a80']),
    grass: ramp(['#0e0e15', '#1b242f', '#264448', '#2f6050', '#3b7752', '#488c4f', '#639e57']),
    path: ramp(['#2a2442', '#3a3358', '#4d4570', '#635a8a', '#7e75a6']), gap: hexToRgb('#120e1e'),
    stone: ramp(['#15131b', '#292438', '#3a3254', '#4b3f70', '#6c4e8a', '#915ea2', '#ad7aad']),
    water: ramp(['#120a2a', '#1c1040', '#2a1a5a', '#3c2878', '#5a3f9a', '#8f6fd0', '#d8c4ff']),
    wood: ramp(['#21152c', '#3a2447', '#55355e', '#6e4a74', '#8a6290']),
    earth: ramp(['#0e0d12', '#1c1624', '#2c1f36', '#3f2647', '#582f58', '#66395b', '#73445c']),
    under: ramp(['#0c0a0f', '#16121e', '#20192e', '#2b1f3c', '#39264a', '#482e57', '#573861']),
    flowers: ['#b68cff', '#ff7aa6', '#e8d8ff'],
    haze: hexToRgb('#4a2a58'), root: hexToRgb('#2a1f3a'),
    ambient: '#8a76b4', fog: '#9a6ac0', fog2: '#ff6a9a', underDepth: 130, bloom: 0.65,
    moon: { x: 140, y: 58, r: 30, col: '#ffb08a', glow: '#ff4a6a' },
  },
  forest: {
    seed: 37,
    sky: ['#b9bccb', '#cfcacb', '#e2c4b0', '#efab7e', '#f39056', '#ee7a3e', '#dc6432', '#c4502e', '#a8462e'],
    mtnFar: ['#6e7f9c', '#465676', '#c9b2b0'], mtnNear: ['#2c3c52', '#18222f', '#7f8ea8'], snow: null, pines: true,
    cloud: ramp(['#7d88a0', '#a4afc2', '#c6cedb', '#e2e7ef', '#f8faff']),
    grass: ramp(['#141c22', '#1d3330', '#2a4a2c', '#43632e', '#668236', '#93a24a', '#c8b86c']),
    path: ramp(['#2e1c14', '#45291c', '#5c3a26', '#764c30', '#90623e']), gap: hexToRgb('#24160f'), dirtPath: true,
    stone: ramp(['#1b1e28', '#2c3442', '#414c5c', '#5a6574', '#7a8088', '#9d9a95', '#c4b9a6']),
    water: ramp(['#14283e', '#1c3a56', '#28506e', '#386a86', '#5a90a6', '#94c4cc', '#e2f4f2']),
    wood: ramp(['#2a1a12', '#432a1c', '#5e3c28', '#7a5034', '#946642']),
    earth: ramp(['#111019', '#311d33', '#4d2736', '#674331', '#7f583c', '#946e49', '#a78658']),
    under: ramp(['#13151b', '#1f222e', '#282e41', '#313c54', '#3b4c65', '#475d75', '#536f83']),
    flowers: ['#e8b04a', '#f2e2bc', '#d0704a'],
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

// ---- tile surface grammar (DESIGN §29 group 1) ----------------------------------------------------------------------
// No per-pixel hash: a pixel's colour comes from (a) two low-frequency noise fields, cached per map at 4 samples a tile and read
// bilinearly (nField / nAt), (b) the tile's hashed micro-variant 0..3 (a brightness offset + 2-3 decorative pixels), (c) the 47-blob
// transition from the 8-neighbour mask: a lower-priority neighbour laps over this tile as a scalloped 3-5 px tongue with a 1 px dark
// line (priority water > path > stone > moss > meadow > grass; a bright wet line on water), (d) the edge grammar: a 2 px lit lip where
// the top meets a lower height or void, ambient occlusion within 4 px of a higher neighbour's wall foot, a baked wedge shadow to the SW
// of every column (0.6 x dh x ZS px at 25 %), and (e) height fog (5 % toward th.haze per level below the map's dominant level m.hFog,
// at most 20 %).
// Ramps are quantised by rampQ: ordered 2x2 dither only between adjacent steps and only inside steps 2..5, hard steps elsewhere.
const BAYER2 = [0.125, 0.625, 0.875, 0.375];
function rampQ(r, v, x, y) {
  const n = r.length - 1, f = (v < 0 ? 0 : v > 0.9999 ? 0.9999 : v) * n, i = f | 0, fr = f - i;
  if (i < 1 || i > 3) return r[fr > 0.5 ? Math.min(i + 1, n) : i];
  return r[(fr - 0.5) * 2.5 + 0.5 > BAYER2[((y & 1) << 1) | (x & 1)] ? i + 1 : i];   // a narrow dither band at the step
}
const rampH = (r, v) => r[clamp(Math.round(v * (r.length - 1)), 0, r.length - 1)];   // hard step (lips, lines)
// cached noise fields: F.fn(wx, wy) sampled lazily on a 0.25-tile lattice, bilinear in between
function nField(m, id, fn) {
  const c = m._nf || (m._nf = {}); if (c[id]) return c[id];
  const w = m.W * 4 + 2, h = m.H * 4 + 2;
  return (c[id] = { w, h, d: new Float32Array(w * h).fill(NaN), fn });
}
function nAt(F, wx, wy) {
  const X = wx * 4, Y = wy * 4; let xi = Math.floor(X), yi = Math.floor(Y);
  const fx = X - xi, fy = Y - yi;
  if (xi < 0) xi = 0; else if (xi > F.w - 2) xi = F.w - 2;
  if (yi < 0) yi = 0; else if (yi > F.h - 2) yi = F.h - 2;
  const d = F.d, i = yi * F.w + xi, j = i + F.w;
  let a = d[i], b = d[i + 1], c = d[j], e = d[j + 1];
  if (a !== a) a = d[i] = F.fn(xi / 4, yi / 4);
  if (b !== b) b = d[i + 1] = F.fn((xi + 1) / 4, yi / 4);
  if (c !== c) c = d[j] = F.fn(xi / 4, (yi + 1) / 4);
  if (e !== e) e = d[j + 1] = F.fn((xi + 1) / 4, (yi + 1) / 4);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
}
const NF_GRASS = (x, y) => 0.42 + (fbm(x * 0.7, y * 0.7, 3, 1) - 0.5) * 0.3 + (fbm(x * 0.14, y * 0.14, 2, 2) - 0.5) * 0.7;
const NF_MED = (x, y) => fbm(x * 1.3, y * 1.3, 3, 61) - 0.5;
const NF_CRACK = (x, y) => fbm(x * 1.5, y * 1.5, 3, 28);
const NF_MOSS = (x, y) => fbm(x * 0.35, y * 0.35, 2, 29);
const hAt = (m, x, y) => (x < 0 || y < 0 || x >= m.W || y >= m.H || !m.type[y][x]) ? -99 : m.h[y][x];
const TPRI = { w: 6, p: 5, s: 4, x: 4, d: 3, f: 2, g: 1 };
const N8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
// per-tile decoration (the variant's 2-3 decorative pixels), memoised for the tile the raster is walking
const DECO = { k: -1, n: 0, x: [0, 0, 0], y: [0, 0, 0], c: [0, 0, 0] };
function tileDeco(m, tx, ty) {
  const k = ty * m.W + tx; if (DECO.k === k && DECO.m === m) return DECO;
  DECO.k = k; DECO.m = m; const vr = (hash2(tx, ty, 91) * 4) | 0; DECO.vr = vr; DECO.n = 2 + (vr >> 1);
  // decorations stay in the diamond's interior, where no transition tongue reaches (a half-covered flower would be a speck)
  for (let q = 0; q < 3; q++) { DECO.x[q] = Math.floor((hash2(tx, ty, 100 + q) - 0.5) * 9); DECO.y[q] = 6 + Math.floor(hash2(tx, ty, 110 + q) * 4); DECO.c[q] = hash2(tx, ty, 120 + q); }
  return DECO;
}
// base colour of ground type `t` at (wx, wy); rx / ry = the pixel's offset from its tile's top vertex (decoration lookups)
function groundBase(m, t, wx, wy, px, py, dc, rx, ry, line, lipped) {
  const th = m.theme;
  if (t === 'g' || t === 'f' || t === 'd') {
    let v = nAt(nField(m, 'gr', NF_GRASS), wx, wy);
    if (t === 'd') v -= 0.15; else if (t === 'f') v += 0.03;
    if (lipped) return rampH(th.grass, v + 0.22);
    if (line) v -= 0.17;
    for (let q = 0; q < dc.n; q++) if (rx === dc.x[q] || (t === 'f' && rx === dc.x[q] + 1)) {
      const dy = ry - dc.y[q];
      if (t === 'f' && dy === 0) return hexToRgb(th.flowers[(dc.c[q] * th.flowers.length) | 0]);   // a 2 px flower over a dark stem
      if (dy === 0 && rx === dc.x[q]) return rampH(th.grass, v + 0.2);                              // a grass blade: lit tip ...
      if (dy === 1 && rx === dc.x[q]) return rampH(th.grass, v - 0.12);                             // ... over its shadow
    }
    return rampQ(th.grass, v, px, py);
  }
  if (t === 'p' && th.dirtPath) {   // packed forest dirt; pebbles and needles are the tile's decorative pixels
    let v = 0.42 + nAt(nField(m, 'md', NF_MED), wx, wy) * 0.5 - (line ? 0.17 : 0) + (lipped ? 0.22 : 0);
    for (let q = 0; q < dc.n; q++) if (ry === dc.y[q] && (rx === dc.x[q] || rx === dc.x[q] + 1)) return dc.c[q] < 0.5 ? rampH(th.stone, 0.62 + (rx - dc.x[q]) * 0.12) : rampH(th.grass, 0.4);
    return lipped ? rampH(th.path, v) : rampQ(th.path, v, px, py);
  }
  if (t === 'p') {   // cobbles (Voronoi), no per-pixel jitter; grass in some gaps; evaluated per 2 px pair (no broken 1 px joints)
    const dS = 0.5 - (px & 1), s = 3.2, X = (wx + dS / 32) * s, Y = (wy - dS / 32) * s, gx = Math.floor(X), gy = Math.floor(Y);
    let f1 = 9, f2 = 9, fx = 0, fy = 0, cid = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const hx = hash2(gx + dx, gy + dy, 11), cx = gx + dx + hx, cy = gy + dy + hash2(gx + dx, gy + dy, 12);
      const d = (X - cx) * (X - cx) + (Y - cy) * (Y - cy);
      if (d < f1) { f2 = f1; f1 = d; fx = X - cx; fy = Y - cy; cid = hx; } else if (d < f2) f2 = d;
    }
    if (Math.sqrt(f2) - Math.sqrt(f1) < 0.13) return hash2(Math.floor(X * 0.5), Math.floor(Y * 0.5), 14) > 0.6 ? th.grass[2] : th.gap;
    const v = 0.35 + cid * 0.35 + (fx * 0.6 + fy * 0.7) * -0.55 - (line ? 0.17 : 0) + (lipped ? 0.2 : 0);
    return rampQ(th.path, v, px, py);
  }
  if (t === 'w') {
    let depth = 0;
    for (const r of [0.3, 0.6]) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const u = typeAt(m, Math.floor(wx + dx), Math.floor(wy + dy)); if (u === 'w' || u === 'b') depth++; }
    let v = 0.74 - depth * 0.07 + (fbm(wx * 1.2, wy * 3, 2, 21) - 0.5) * 0.3;
    if (fbm(wx * 2, wy * 6, 2, 23) > 0.7) v += 0.25;
    if (line) return rampH(th.water, 0.86);   // the wet edge under a bank
    return mulRgb(rampQ(th.water, v, px, py), 0.92);
  }
  if (t === 'b') {
    const fr = (wy % 1 + 1) % 1, pl = wx * 5;
    if (fr < 0.1 || fr > 0.9) return th.wood[0];
    if ((pl % 1) < 0.14) return th.wood[1];
    return rampQ(th.wood, 0.5 + hash2(Math.floor(pl), 0, 24) * 0.35 + (fr - 0.5) * -0.3, px, py);
  }
  if (t === 's') {
    const v = 0.55 + nAt(nField(m, 'md', NF_MED), wx, wy) * 0.4 - ((wy % 1) < 0.08 ? 0.3 : 0) - (line ? 0.17 : 0) + (lipped ? 0.2 : 0);
    return rampQ(th.stone, v, px, py);
  }
  if (t === 'x' || t === 'r') {   // joints and cracks evaluated per 2 px pair
    const dS = 0.5 - (px & 1), qx = wx + dS / 32, qy = wy - dS / 32;
    const row = Math.floor(qy * 2), X = qx * 2 + (row % 2) * 0.5;
    const gx = Math.floor(X), fx = X - gx, fy = qy * 2 - row;
    if (fx < 0.06 || fy < 0.09) return th.gap;
    let v = 0.3 + hash2(gx, row, 26) * 0.3 + (0.5 - fy) * 0.25 + nAt(nField(m, 'md', NF_MED), wx, wy) * 0.4 - (line ? 0.17 : 0) + (lipped ? 0.2 : 0);
    if (Math.abs(nAt(nField(m, 'ck', NF_CRACK), qx, qy) - 0.5) < 0.016) return th.gap;   // cracks
    if (t === 'r') {
      v -= 0.1;
      const d = Math.hypot(wx - m.cx, wy - m.cy), a = Math.atan2(wy - m.cy, wx - m.cx);
      for (const R of [1.2, 2.1, 2.8]) if (Math.abs(d - R) < 0.07) return hexToRgb('#b68cff');
      if (d > 1.2 && d < 2.1 && Math.abs(Math.sin(a * 4)) < 0.05) return hexToRgb('#9b6ee8');
    }
    if (nAt(nField(m, 'ms', NF_MOSS), wx, wy) > 0.6) return rampQ(th.grass, v + 0.1, px, py);   // moss patches, solid (no per-pixel hash)
    return rampQ(th.stone, v, px, py);
  }
  return [255, 0, 255];
}
// per-tile flags, cached per map (computed on first use): bits 0-7 = neighbour k (N8 order) is a lower-priority type on the same
// level (a tongue source); bit 8 = some neighbour is lower / void (lip); bit 9 = an AO or wedge-shadow caster (N / W / NW higher, or
// a column N within 2 tiles). Interior pixels of plain tiles then skip every neighbour lookup.
function tileFlags(m, t, h, tx, ty) {
  const F = m._tf || (m._tf = new Int16Array(m.W * m.H).fill(-1)), k0 = ty * m.W + tx;
  if (F[k0] >= 0) return F[k0];
  let f = 0;
  const pr = TPRI[t] || 0;
  for (let k = 0; k < 8; k++) {
    const nx = tx + N8[k][0], ny = ty + N8[k][1], u = typeAt(m, nx, ny), hn = hAt(m, nx, ny);
    if (hn < h) f |= 256;
    if (pr > 1 && u && TPRI[u] && TPRI[u] < pr && Math.abs(hn - h) <= 1) f |= 1 << k;
  }
  if (hAt(m, tx, ty - 1) > h || hAt(m, tx - 1, ty) > h || hAt(m, tx - 1, ty - 1) > h || hAt(m, tx, ty - 2) > h) f |= 512;
  return (F[k0] = f);
}
// the colour of a TOP-surface pixel of tile type t at height h (the flat raster, and column tops). (wx, wy) = its world point,
// (px, py) = raster / sprite pixel (dither phase), (SX, SY) = its point on the tile's own height plane in world-screen space
// projected to z = 0 (toWorld(SX, SY) = (wx, wy)); the lip test looks 1-2 px up / down that plane.
function topColor(m, t, h, wx, wy, px, py, SX, SY) {
  const th = m.theme, tx = Math.floor(wx), ty = Math.floor(wy), fx = wx - tx, fy = wy - ty;
  let tt = t, line = 0;
  const tf = tileFlags(m, t, h, tx, ty);
  // (c) 47-blob transition: the nearest lower-priority same-level neighbour (edge or corner) whose scalloped tongue reaches here.
  // Decided at the centre of the pixel's horizontal PAIR (screen x & ~1): iso edges run 2:1, so tongues and their lines come out in
  // 2 px runs and never leave an isolated pixel.
  const pr = TPRI[t] || 0;
  if ((tf & 255) && (fx < 0.4 || fx > 0.6 || fy < 0.4 || fy > 0.6)) {
    const [qx, qy] = toWorld(SX - (px & 1) + 0.5, SY), fx = qx - tx, fy = qy - ty, wx = qx, wy = qy;
    let best = 9, bu = null;
    for (let k = 0; k < 8; k++) {
      if (!(tf & (1 << k))) continue;
      const dx = N8[k][0], dy = N8[k][1], nx = tx + dx, ny = ty + dy, u = m.type[ny][nx];
      let d, s, key;
      if (dy === 0) { d = dx < 0 ? fx : 1 - fx; s = wy; key = tx + (dx > 0 ? 1 : 0); }
      else if (dx === 0) { d = dy < 0 ? fy : 1 - fy; s = wx; key = 977 + ty + (dy > 0 ? 1 : 0); }
      else { const ax = dx < 0 ? fx : 1 - fx, ay = dy < 0 ? fy : 1 - fy; if (ax > 0.45 || ay > 0.45) continue; d = Math.sqrt(ax * ax + ay * ay); s = wx + wy; key = 1999 + nx * 7 + ny; }
      if (d > 0.45) continue;
      const S = s * 2.5, L = Math.floor(S), f = S - L, bump = 1 - (2 * f - 1) * (2 * f - 1);
      const tongue = 0.08 + (0.12 + 0.1 * hash2(L, key, 94)) * Math.sqrt(bump);   // 3-5 px scallops, 2.5 per tile edge
      if (d - tongue < best) { best = d - tongue; bu = u; }
    }
    if (bu) { if (best < 0) tt = bu; else if (best < 0.075) line = 1; }
  }
  // (d) lip: a lower / void tile within 2 px straight above or below on this plane
  let lip = 0;
  if ((tf & 256) && t !== 'w' && (fx < 0.13 || fy < 0.13 || fx > 0.87 || fy > 0.87)) {
    for (const dir of [1, -1]) for (let k = 1; k <= 2; k++) {
      const [nx, ny] = toWorld(SX, SY + dir * k), ix = Math.floor(nx), iy = Math.floor(ny);
      if (ix === tx && iy === ty) continue;
      if (hAt(m, ix, iy) < h) lip = 1;
      break;
    }
  }
  const rx = Math.floor((fx - fy) * 16), ry = Math.floor((fx + fy) * 8);
  let c = groundBase(m, tt, wx, wy, px, py, tileDeco(m, tx, ty), rx, ry, line, lip);
  // AO at a higher neighbour's wall foot (N / W / NW, within 4 px) and the SW wedge shadow of a column N of this tile
  let mul = 1;
  if ((tf & 512) && (fx < 0.3 || fy < 0.3)) {
    let d = 9;
    if (hAt(m, tx, ty - 1) > h) d = fy;
    if (hAt(m, tx - 1, ty) > h && fx < d) d = fx;
    if (d > 0.28 && hAt(m, tx - 1, ty - 1) > h) d = Math.min(d, Math.sqrt(fx * fx + fy * fy));
    if (d < 0.28) mul = 0.8 + 0.2 * d / 0.28;
  }
  if (tf & 512) for (let k = 1; k <= 2; k++) { const hc = hAt(m, tx, ty - k); if (hc > h) { if (fy + k - 1 < 0.2 * (hc - h) * (0.4 + 0.6 * fx)) mul *= 0.75; break; } }
  if (mul < 1) c = mulRgb(c, mul);
  // (e) height fog
  const fog = Math.min(0.2, 0.05 * (m.hFog - h));
  return fog > 0 ? mixRgb(c, th.haze, fog) : c;
}
// kept for callers outside the raster (editor swatches): a top pixel of type t on the flat plane
function surfaceColor(m, t, wx, wy, px, py) { if (m.hFog == null) groundPrep(m); return topColor(m, t, 0, wx, wy, px, py, isoX(wx, wy), isoY(wx, wy)); }

// ---- ground + slab + underside ------------------------------------------------
// groundPrep(m): per raster column, from tile geometry (no pixels): the first / last surface row (top / edge), the
// underside length, root strands and crystal spots. Every pixel is then a pure function of (px, py), so any rect of
// the raster (a chunk band, or the whole thing for the editor) renders identically: rasterRect().
// Island edge v2 (§29): the front skirt is 3 bands: an 18 px slab (overhang lip, dark underline, 2 strata, AO), rock LOBES
// (4-7 rounded masses per 100 px, each lit on its left and shaded on its right, crevices between them) with hanging roots
// (20-40 px, 2-3 forks), and an alpha fade over the last 40 % so the island dissolves into the cloud sea.
const SLAB = 18;
function groundPrep(m) {
  if (m.gp) return m.gp;
  const g = groundPrepGen(m); while (!g.next().done);
  return m.gp;
}
// the same, yielding after every tile row (a portal preload time-slices it, main.js preloadStep)
function* groundPrepGen(m) {
  if (m.gp) return;
  const th = m.theme, minSX = -m.H * 16, W = (m.W + m.H) * 16, GB = (m.W + m.H) * 8;
  const H = GB + SLAB + th.underDepth + 60;
  const top = new Int32Array(W).fill(-1), edge = new Int32Array(W).fill(-1);
  let hMax = 0; const hCount = new Int32Array(40);
  for (let j = 0; j < m.H; j++, yield) for (let i = 0; i < m.W; i++) {
    if (!m.type[j][i]) continue;
    if (m.h[j][i] > hMax) hMax = m.h[j][i];
    hCount[Math.min(39, m.h[j][i])]++;
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
  // height fog reference: the map's dominant (most common) land level, so terraces BELOW the play level recede into haze while the
  // play level itself (and the raised coast rim above it) stays clear
  m.hMax = hMax; m.hFog = hCount.indexOf(Math.max(...hCount));
  let firstPx = W, lastPx = 0;
  for (let px = 0; px < W; px++) if (edge[px] >= 0) { firstPx = Math.min(firstPx, px); lastPx = Math.max(lastPx, px); }
  const cx = (firstPx + lastPx) / 2, hw = Math.max(1, (lastPx - firstPx) / 2);
  const len = new Float32Array(W), bot = new Int32Array(W).fill(-1), root = new Float32Array(W), lobe = new Float32Array(W);
  // lobes: consecutive rounded masses 14-25 px wide, each with its own depth
  for (let x0 = 0, k = 0; x0 < W; k++) {
    const w = 14 + Math.floor(hash2(k, 0, 76) * 12), dk = 0.55 + 0.45 * hash2(k, 1, 76);
    for (let px = x0; px < Math.min(W, x0 + w); px++) { const u = (px + 0.5 - x0) / w * 2 - 1; lobe[px] = u; len[px] = dk; }
    x0 += w;
  }
  m.crystalSpots = [];
  for (let px = 0; px < W; px++) {
    const e = edge[px]; if (e < 0) continue;
    const s = Math.pow(Math.max(0, 1 - Math.abs(px - cx) / hw), 0.55), u = lobe[px], prof = Math.sqrt(Math.max(0, 1 - u * u));
    const L = Math.max(2, th.underDepth * s * (0.7 + 0.4 * fbm(px * 0.012, 0, 3, 77)) * (0.45 + 0.55 * len[px] * prof));
    len[px] = L;
    const [wx, wy] = toWorld(px + minSX + 0.5, e - 0.5), edgeT = typeAt(m, Math.floor(wx), Math.floor(wy));
    if (hash2(px, 0, 81) > 0.955 && edgeT !== 'w' && L > 24) root[px] = 20 + hash2(px, 1, 82) * 20;
    bot[px] = Math.ceil(e + SLAB + 1 + Math.max(L, root[px]));
    if (hash2(px, 2, 83) > 0.985 && L > 30) m.crystalSpots.push({ px, py: e + SLAB + L * (0.25 + hash2(px, 3, 84) * 0.3) });
  }
  for (const s of m.crystalSpots) m.lights.push({ sx: s.px + minSX, sy: s.py + 8, r: 46, col: m.themeId === 'ruins' ? '#b36bff' : '#7fd2ff', a: 0.75 });
  // a mist puff baked at 70 % of every edge waterfall (the same water-over-void rule as finalizeMap's edge falls; the fall stays live)
  const mist = [];
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (m.type[j][i] !== 'w' || typeAt(m, i, j + 1) || isGutter(m, i, j + 1)) continue;
    const mx = isoX(i, j + 1) - minSX + 8, my = Math.round(isoY(i, j + 1, 0) + SLAB + 4 + (th.underDepth + 80) * 0.7);
    mist.push({ px: mx, py: my });
    for (let px = Math.max(0, mx - MIST_RX); px <= Math.min(W - 1, mx + MIST_RX); px++) bot[px] = Math.max(bot[px], my + MIST_RY + 1);
  }
  m.gox = minSX; m.goy = 0;
  m.gp = { W, H, GB, minSX, top, edge, len, bot, root, lobe, mist };
}
const isGutter = (m, x, y) => !!(m.gutter && x >= 0 && y >= 0 && x < m.W && y < m.H && m.gutter[y * m.W + x]);
// a gutter pixel: 'v' = a chasm whose north lip shows a cliff face, 'k' = darkness
function gutterColor(m, wx, wy, px, py) {
  const th = m.theme, g = m.gutter[Math.floor(wy) * m.W + Math.floor(wx)];
  if (g === 1) for (let d = 0.2; d <= 1.6; d += 0.2) {
    const t = typeAt(m, Math.floor(wx - d), Math.floor(wy - d));
    if (t) { const v = 0.62 - d * 0.36 + (vnoise(px * 0.3, py * 0.15, 47) - 0.5) * 0.3; return mulRgb(rampQ(t === 'x' || t === 'r' || t === 's' ? th.stone : th.earth, v, px, py), Math.max(0.25, 1 - d * 0.45)); }
  }
  return mulRgb(th.under[0], 0.35);
}
// hanging root strand from raster column x0 (length rl px from the slab foot): 2 px thick for its first 45 %, 2-3 forks
function rootPixels(x0, rl, cb) {
  const wob = dd => Math.round(Math.sin(dd * 0.22 + x0) * 0.9);
  for (let dd = 0; dd < rl; dd++) { const x = x0 + wob(dd); cb(x, dd, dd / rl, 0); if (dd < rl * 0.45) cb(x + 1, dd, dd / rl, 1); }
  const nf = 2 + (hash2(x0, 5, 85) > 0.5 ? 1 : 0);
  for (let f = 0; f < nf; f++) {
    const at = Math.floor(rl * (0.25 + 0.5 * hash2(x0, 6 + f, 86))), dir = hash2(x0, 9 + f, 87) > 0.5 ? 1 : -1, fl = Math.floor(rl * (0.25 + 0.3 * hash2(x0, 12 + f, 88)));
    for (let k = 1; k <= fl; k++) cb(x0 + wob(at) + dir * Math.round(k * 0.6), at + k, (at + k) / rl, 0);
  }
}
// render raster rect [x0, x0 + w) x [y0, y0 + h) into `out`, an ImageData whose pixel (0, 0) is raster (ox, oy)
const MIST_RX = 20, MIST_RY = 11;
function rasterRect(m, out, ox, oy, x0, y0, w, h) {
  const th = m.theme, G0 = groundPrep(m), { W, GB, minSX, top, edge, len, root, lobe } = G0, d = out.data, ow = out.width, oh = out.height;
  const put = (px, py, c, a = 255) => {
    const x = px - ox, y = py - oy; if (x < 0 || y < 0 || x >= ow || y >= oh) return;
    const i = (y * ow + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a;
  };
  const xa = Math.max(0, x0), xb = Math.min(W, x0 + w), y1 = y0 + h, rimC = mixRgb(th.under[0], th.haze, 0.1);
  const rimTop = px => Math.max(top[px] - 2, Math.min(top[px], px > 0 && top[px - 1] >= 0 ? top[px - 1] : 1e9, px < W - 1 && top[px + 1] >= 0 ? top[px + 1] : 1e9) - 1);
  for (let py = Math.max(0, y0 - 2); py < Math.min(y1, GB); py++) for (let px = xa; px < xb; px++) {
    if (top[px] < 0) continue;
    if (py < top[px] && py >= rimTop(px)) {   // the dark rim above a back (north / west) edge that meets the sky: 1 px, widened to
      if (py < y0) continue;                  // the neighbours' top rows so a diamond's peak pixel is never alone
      const [wx, wy] = toWorld(px + minSX + 0.5, top[px] + 0.5), tx = Math.floor(wx), ty = Math.floor(wy);
      if (typeAt(m, tx, ty) && !m.h[ty][tx]) put(px, py, rimC);
      continue;
    }
    if (py < y0 || py < top[px] || py > edge[px]) continue;
    const SX = px + minSX + 0.5, SY = py + 0.5, [wx, wy] = toWorld(SX, SY);
    const tx = Math.floor(wx), ty = Math.floor(wy), t = typeAt(m, tx, ty);
    if (!t) { if (isGutter(m, tx, ty)) put(px, py, gutterColor(m, wx, wy, px, py)); continue; }
    if (m.h[ty][tx] > 0) { put(px, py, th.earth[1]); continue; }   // under a column sprite (game and editor draw it): never seen
    put(px, py, topColor(m, t === 'pillar' ? 'x' : t, 0, wx, wy, px, py, SX, SY));
  }
  // front edge per column: slab, underside lobes (roots after, so they draw over the skirt)
  for (let px = xa; px < xb; px++) {
    const e = edge[px]; if (e < 0 || e + 1 >= y1 || G0.bot[px] < y0) continue;
    const slope = (edge[Math.min(W - 1, px + 2)] - edge[Math.max(0, px - 2)]);
    const lit = slope >= 0 ? 1 : 0.7;
    const [wx, wy] = toWorld(px + minSX + 0.5, e - 0.5);
    const edgeT = typeAt(m, Math.floor(wx), Math.floor(wy)), rock = edgeT === 'x' || edgeT === 'r' || edgeT === 's' || edgeT === 'pillar' ? th.stone : th.earth;
    const sOff = Math.floor(vnoise(px * 0.08, 0, 41) * 3);
    for (let dd = 1; dd <= SLAB; dd++) {
      const y = e + dd; if (y < y0 || y >= y1) continue;
      let c;
      if (edgeT === 'w') c = rampQ(th.water, 0.55 - dd / SLAB * 0.2, px, y);
      else if (dd === 1) c = isGrassy(edgeT) ? rampH(th.grass, 0.62) : rampH(rock, 0.7);        // overhang lip
      else if (dd === 2) c = rock[0];                                                            // dark underline
      else {
        let v = (0.68 - dd / SLAB * 0.3 + (vnoise(px * 0.2, dd * 0.6, 40) - 0.5) * 0.18) * lit;
        const r = (dd + sOff) % 8;
        if (r === 0) v += 0.12; else if (r === 1) v -= 0.2;                                     // 2 strata courses
        if (dd < 6) v -= (6 - dd) * 0.04;                                                        // AO under the lip
        c = rampQ(rock, v, px, y);
      }
      put(px, y, c);
    }
    const L = len[px], u = lobe[px], prof = Math.sqrt(Math.max(0, 1 - u * u)), base = e + SLAB + 1;
    const ua = Math.max(0, y0 - base), ub = Math.min(L, y1 - base);
    for (let dd = ua; dd < ub; dd++) {
      const y = base + dd, t = dd / L;
      let v = (0.62 - t * 0.42) * lit - u * 0.1 - (1 - prof) * 0.14 + (vnoise(px * 0.15, y * 0.05, 79) - 0.5) * 0.2;
      if (dd < 3) v -= 0.12 * (3 - dd) / 3;
      const c = mixRgb(rampQ(th.under, v, px, y), th.haze, t * 0.35);
      put(px, y, c, t < 0.6 ? 255 : Math.round(255 * (1 - (t - 0.6) / 0.4)));
    }
  }
  for (let px0 = Math.max(0, xa - 14); px0 < Math.min(W, xb + 14); px0++) {
    const rl = root[px0]; if (!rl) continue;
    const base = edge[px0] + SLAB - 1;
    rootPixels(px0, rl, (x, dd, t, side) => {
      const y = base + dd; if (y < y0 || y >= y1 || x < xa || x >= xb) return;
      put(x, y, mixRgb(side ? mulRgb(th.root, 0.7) : th.root, th.haze, t * 0.45), t < 0.7 ? 255 : Math.round(255 * (1 - (t - 0.7) / 0.3)));
    });
  }
  // edge-fall mist: a soft billowy puff composited OVER what is already there (skirt pixels or transparent)
  const fogC = hexToRgb(th.fog);
  for (const ms of G0.mist) {
    if (ms.px + MIST_RX < xa || ms.px - MIST_RX >= xb || ms.py + MIST_RY < y0 || ms.py - MIST_RY >= y1) continue;
    for (let y = Math.max(y0, ms.py - MIST_RY); y < Math.min(y1, ms.py + MIST_RY + 1); y++) for (let x = Math.max(xa, ms.px - MIST_RX); x < Math.min(xb, ms.px + MIST_RX + 1); x++) {
      const dx = (x - ms.px) / MIST_RX, dy = (y - ms.py) / MIST_RY, r = Math.sqrt(dx * dx + dy * dy) * (0.8 + 0.4 * vnoise(x * 0.18, y * 0.25, 89));
      if (r >= 1) continue;
      const am = 0.62 * Math.pow(1 - r * r, 1.5), X = x - ox, Y = y - oy; if (X < 0 || Y < 0 || X >= ow || Y >= oh) continue;
      const i = (Y * ow + X) * 4, ae = d[i + 3] / 255, ao = am + ae * (1 - am);
      for (let k = 0; k < 3; k++) d[i + k] = (fogC[k] * am + d[i + k] * ae * (1 - am)) / ao;
      d[i + 3] = Math.round(ao * 255);
    }
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

// ===== cloud sea + island shadow (§29 island edge v2) ===========================================================
// Cached once per theme (two 256 x 96 sea tiles, art.js buildSeaTile) and once per map (the island's shadow: its raster silhouette
// at 1/4 res, squashed to 0.3 in y). drawCloudSea(ctx, m, camX, camY, t) is the ONE live call (render.js sky block, right before the
// old "cloud sea far below" clouds): far layer (parallax 0.55, alpha 0.75), near layer (0.85, 0.95), then the island shadow on it
// (alpha 0.25). ~8 drawImage / fillRect a frame, nothing per pixel. The horizon sits on the near mountains' base (render.js nearY + 200).
const SEA = { par: [0.55, 0.85], alpha: [0.75, 0.95], drop: [0, 34], speed: [3, 4.5] };
function* prepCloudSeaGen(m) {
  const th = m.theme;
  if (!th._sea) {
    const tiles = [];
    for (let k = 0; k < 2; k++) { tiles.push(buildSeaTile(th, th.seed * 40 + k, k)); yield; }
    // the fill under each tile = its own bottom row's mean colour, so the band continues seamlessly to the screen bottom
    const base = tiles.map(c => { const d = c.getContext('2d').getImageData(0, c.height - 1, c.width, 1).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`; });
    th._sea = { tiles, base };
  }
  if (!m.seaShadow) {
    const g = groundPrep(m), Q = 4, w = Math.ceil(g.W / Q), hh = Math.ceil(g.H * 0.3 / Q) + 2, { c, x } = makeCanvas(w, hh);
    x.fillStyle = '#140a28';
    for (let q = 0; q < w; q++) {
      const px = Math.min(g.W - 1, q * Q + 2); if (g.edge[px] < 0) continue;
      const y0 = g.top[px] * 0.3 / Q, y1 = (g.edge[px] + SLAB + g.len[px] * 0.5) * 0.3 / Q;
      x.fillRect(q, Math.floor(y0), 1, Math.max(1, Math.ceil(y1 - y0)));
    }
    m.seaShadow = c;
  }
}
function prepCloudSea(m) { const g = prepCloudSeaGen(m); while (!g.next().done); }
function drawCloudSea(ctx, m, camX, camY, t) {
  const th = m.theme; if (!th._sea || !m.seaShadow) prepCloudSea(m);
  const S = th._sea, hz = Math.round(RH * 0.55 + 100 - camY * 0.08) - 14;
  if (hz >= RH) return;
  const a0 = ctx.globalAlpha;
  for (let k = 0; k < 2; k++) {
    const y = hz + SEA.drop[k], tile = S.tiles[k], off = ((-camX * SEA.par[k] + t * SEA.speed[k]) % 256 + 256) % 256;
    ctx.globalAlpha = SEA.alpha[k];
    for (let x = off - 256; x < RW; x += 256) ctx.drawImage(tile, Math.round(x), y);
    if (y + 95 < RH) { ctx.fillStyle = S.base[k]; ctx.fillRect(0, y + 95, RW, RH - y - 95); }
  }
  // the island's shadow on the near layer: x at that layer's parallax, raster row y_r at hz + 40 + (y_r - camY) * 0.15 (so the part
  // under the camera lies just below the near horizon), clipped to the sea
  const g = m.gp, sc = m.seaShadow, kx = 4 * SEA.par[1], ky = 0.15 / 0.3 * 4;   // canvas px -> view px
  const sx = (g.minSX - camX) * SEA.par[1] + RW / 2, sy = hz + 40 - camY * 0.15, clipY = hz + SEA.drop[1] + 8;
  const s0 = Math.max(0, (clipY - sy) / ky);
  if (s0 < sc.height && sx < RW && sx + sc.width * kx > 0 && sy + sc.height * ky > 0) {
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.25; ctx.drawImage(sc, 0, s0, sc.width, sc.height - s0, Math.round(sx), Math.round(sy + s0 * ky), Math.round(sc.width * kx), Math.round((sc.height - s0) * ky));
    ctx.imageSmoothingEnabled = sm;
  }
  ctx.globalAlpha = a0;
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
  const BAND = PHONE ? 8 : 4;   // rows per step: ~1 ms, so a frame budget is never overshot by much
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
  if (CHUNK.gone.has(key) && CHUNK.frame - CHUNK.gone.get(key) < 120) CHUNK.thrash++;
  CHUNK.gone.delete(key);
  chunkEvict(m, key);
  return true;
}
// a partial build abandoned (the camera moved on): its ImageData and the column images it already made are freed
function dropChunkJob(key, job) {
  CHUNK.jobs.delete(key);
  const cols = chunkGrid(job.m).cols[job.idx];
  for (let i = 0; i < Math.min(job.col, cols.length); i++) cols[i].img = null;
  if (job.c) job.c.width = 0;
}
// LRU across every map; chunks of the current map drawn this frame are never evicted
// protected: the chunk just built (keep) and chunks DRAWN this frame or the last (ch.seen, render.js drawGround). A
// prefetched / budgeted build is not protected merely for being new, so the cap holds while builds land frame by frame.
function chunkEvict(cur, keep) {
  while (CHUNK.cache.size > CHUNK.max) {
    let worst = null;
    for (const [k, ch] of CHUNK.cache) {
      if (ch.m === cur && (k === keep || ch.seen >= CHUNK.frame - 1)) continue;   // just built, or visible
      if (!worst || (ch.m !== cur) > (worst.m !== cur) || ((ch.m !== cur) === (worst.m !== cur) && ch.last < worst.last)) worst = Object.assign({ k }, ch);
    }
    if (!worst) break;
    const ch = CHUNK.cache.get(worst.k); CHUNK.cache.delete(worst.k); CHUNK.evicted++;
    CHUNK.gone.set(worst.k, CHUNK.frame); if (CHUNK.gone.size > 256) CHUNK.gone.delete(CHUNK.gone.keys().next().value);
    ch.c.width = 0;
    for (const k of chunkGrid(ch.m).cols[ch.idx]) k.img = null;   // the chunk's columns go with it
  }
}
// cheap 1/4-res stand-in drawn under chunks that are still in the queue (flat tile colours, slab, underside)
function groundPreview(m) {
  if (m.preview) return m.preview;
  const g = groundPreviewGen(m); while (!g.next().done);
  return m.preview;
}
function* groundPreviewGen(m) {   // yields every 8 preview rows (main.js preloadStep)
  if (m.preview) return;
  const g = groundPrep(m), th = m.theme, Q = 4, w = Math.ceil(g.W / Q), h = Math.ceil(g.H / Q), img = new ImageData(w, h), d = img.data;
  const pal = { g: rampH(th.grass, 0.5), f: rampH(th.grass, 0.62), d: rampH(th.grass, 0.25), p: rampH(th.path, 0.5), w: th.water[3], b: th.wood[2], s: rampH(th.stone, 0.5), x: rampH(th.stone, 0.5), r: rampH(th.stone, 0.35), pillar: rampH(th.stone, 0.7) };
  for (let qy = 0; qy < h; qy++, qy % 8 || (yield)) for (let qx = 0; qx < w; qx++) {
    const px = qx * Q + 2, py = qy * Q + 2; if (px >= g.W) continue;
    const e = g.edge[px]; if (e < 0 || py < g.top[px]) continue;
    let c = null, a = 255;
    if (py <= e) { const [wx, wy] = toWorld(px + g.minSX + 0.5, py + 0.5), tx = Math.floor(wx), ty = Math.floor(wy), t = typeAt(m, tx, ty); c = t ? pal[t] || th.grass[3] : isGutter(m, tx, ty) ? mulRgb(th.under[0], 0.4) : null; }
    else if (py <= e + SLAB) c = rampH(th.earth, 0.45);
    else if (py <= e + SLAB + g.len[px]) { const t = (py - e - SLAB) / g.len[px]; c = mixRgb(rampH(th.under, 0.45), th.haze, t * 0.35); a = t < 0.6 ? 255 : Math.round(255 * (1 - (t - 0.6) / 0.4)); }
    if (!c) continue;
    const i = (qy * w + qx) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a;
  }
  const { c, x } = makeCanvas(w, h); x.putImageData(img, 0, 0);
  m.preview = c;
}
// chunk index under a world-screen point (sx, sy)
function chunkAt(m, sx, sy) { const cg = chunkGrid(m), g = m.gp; return clamp(Math.floor((sx - g.minSX) / cg.S), 0, cg.nx - 1) + clamp(Math.floor(sy / cg.S), 0, cg.ny - 1) * cg.nx; }
function ensureChunkAt(m, x, y) { const idx = chunkAt(m, isoX(x, y), isoY(x, y, tileH(m, x, y))); if (!chunkGrid(m).empty[idx]) buildChunkStep(m, idx, Infinity); return idx; }

// ---- elevated tiles become depth-sorted columns ----------------------------
// Cliff faces v2 (§29): per 6 px level 3 strata bands (2 px light cap, 3 px mid, 1 px dark ledge), offset per tile column so
// neighbours do not align; every 4th level a 2 px ledge under a 1 px highlight; a 1 px overhang lip (top colour) over a 1 px dark
// underline; ambient occlusion on the bottom 3 px of the VISIBLE face (down to the lower neighbour's top); height fog per pixel
// level. Face pixels hidden behind a neighbour column (below its top) are skipped: on a plateau most faces are never seen.
// The top gets the full tile grammar (topColor), plus a 1 px dark rim above back edges that meet the sky or lower ground.
function rasterColumn(m, i, j) {
  const th = m.theme, h = m.h[j][i], t = m.type[j][i], hz = h * ZS;
  const W = 32, H = 16 + hz + 1;
  const pb = new PixBuf(W, H);
  const ox = isoX(i, j) - 16, oy = isoY(i, j, h);
  const pillar = t === 'pillar';
  const faceRamp = (t === 's' || t === 'x' || t === 'r' || pillar) ? th.stone : th.earth;
  const topT = pillar ? 'x' : t;
  // visible face depth per side: down to the lower neighbour's top when that neighbour is itself a column (drawn after this one)
  const vis = (nx, ny) => { const hn = hAt(m, nx, ny); return hn > 0 && hn < h && m.type[ny][nx] !== 'pillar' ? (h - hn) * ZS : hn >= h && m.type[ny][nx] !== 'pillar' ? 0 : hz; };
  const visL = vis(i, j + 1), visR = vis(i + 1, j);
  const rimC = mixRgb(th.under[0], th.haze, 0.1);
  const backL = hAt(m, i - 1, j) < h, backR = hAt(m, i, j - 1) < h;
  // first face row per pixel column = the row right under the top diamond's last row (no 1 px hole between top and face, and the
  // lip and underline hang off it in every column)
  const face0 = new Int16Array(W);
  for (let cx = 0; cx < W; cx++) {
    let last = -1;
    for (let cy = 0; cy < 17; cy++) { const [wx, wy] = toWorld(ox + cx + 0.5, oy + cy + 0.5 + hz); if (wx >= i && wx < i + 1 && wy >= j && wy < j + 1) last = cy; }
    face0[cx] = last + 1;
  }
  for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
    const SX = ox + cx + 0.5, SY = oy + cy + 0.5 + hz, [wx, wy] = toWorld(SX, SY);
    if (cy < 17 && wx >= i && wx < i + 1 && wy >= j && wy < j + 1) {
      let c = topColor(m, topT, h, wx, wy, ox + cx, oy + cy, SX, SY);
      if (pillar) c = rampQ(th.stone, 0.75 + (hash2(cx, cy, 9) - 0.5) * 0.12, cx, cy);
      pb.set(cx, cy, c); continue;
    }
    if (cy < 9) {   // above the top diamond: the dark rim on a back edge, the row just above it (dilated 1 px sideways: no lone peak)
      let on = false;
      for (let k = -1; k <= 1 && !on; k++) { const [bx, by] = toWorld(SX + k, SY + 1); on = bx >= i && bx < i + 1 && by >= j && by < j + 1; }
      if (on && (cx < 16 ? backL : backR)) pb.set(cx, cy, rimC);
      continue;
    }
    let top, lit, u, vd;
    if (cx < 16) { top = 8 + (cx + 0.5) * 0.5; lit = 1; u = cx / 16; vd = visL; } else { top = 16 - (cx - 15.5) * 0.5; lit = 0.66; u = (cx - 16) / 16; vd = visR; }
    if (cy < face0[cx]) continue;
    const d = Math.max(0, cy - top);
    if (d >= hz || d >= vd + 1) continue;
    const di = cy - face0[cx], lvh = h - d / ZS;   // face row (0 = the lip), and the height level it shows
    let c;
    if (t === 'w' && cx < 16) c = rampQ(th.water, 0.5, cx, cy);
    else if (di === 0) c = isGrassy(t) ? rampH(th.grass, 0.62) : rampH(faceRamp, 0.72);   // 1 px overhang lip
    else if (di === 1) c = faceRamp[0];                                                     // 1 px dark underline
    else if (pillar) {
      let v = (0.62 - d / hz * 0.3 + ((cx % 5) === 0 ? -0.22 : 0) + (vnoise(cx * 0.4, (oy + cy) * 0.3, 44) - 0.5) * 0.2) * lit;
      if (d < 4) v += 0.12;
      c = rampQ(th.stone, v, cx, cy);
    } else {
      const off = Math.floor(vnoise((i + u) * 1.7, j * 0.9, 43) * 2.99), dd = di + off, lv = Math.floor(dd / ZS), r = dd - lv * ZS;
      let v = (0.66 - d / Math.max(hz, 12) * 0.3 + (vnoise((i + u) * 8, d * 0.35, 42) - 0.5) * 0.16) * lit;
      if (lv % 4 === 3) { if (r === 3) v += 0.2; else if (r >= 4) v -= 0.24; }   // ledge every 4th level: highlight over a 2 px ledge
      else if (r < 2) v += 0.1; else if (r === 5) v -= 0.22;                   // 3 bands: light cap, mid, dark ledge
      c = rampQ(faceRamp, v, cx, cy);
      if (isGrassy(t) && cx < 16 && hash2(i * 32 + cx, j, 45) > 0.86 && d < 4 + hash2(i * 32 + cx, j, 46) * hz * 0.8) c = th.grass[2 + (di % 2)];   // hanging vines on lit faces
    }
    const foot = Math.min(vd, hz) - d;   // AO: the bottom 3 px of the visible face
    if (foot < 3 && di > 1) c = mulRgb(c, 0.65 + 0.1 * Math.floor(foot));
    const fog = Math.min(0.2, 0.05 * (m.hFog - lvh));
    if (fog > 0) c = mixRgb(c, th.haze, fog);
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
    if (!nT) { if (!isGutter(m, i, j + 1)) m.falls.push({ x0: isoX(i, j + 1), y0: isoY(i, j + 1, 0) + SLAB, len: m.theme.underDepth + 80, edge: true, key: -1 }); }
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

// buildMapStages: the same build as a generator that yields between its heavy steps (parse + props / finalizeMap's
// ground prep / anchors + section centres, each <= ~30 ms on Pinewood) so main.js preloadStep can spread a map load
// over the portal fade-in frames. buildMapFromData runs it to the end and rasters the start chunk (boot, the editor).
function buildMapFromData(id, d) {
  const g = buildMapStages(id, d); let r; while (!(r = g.next()).done);
  const m = r.value;
  // the start chunk is rastered now (behind the loading screen); a portal load spreads it over the fade (main.js preloadStep)
  // and the low-res stand-in for chunks still streaming is made now too (~40 ms on Pinewood: never in a play frame)
  if (!(typeof window !== 'undefined' && window.EDITOR_MODE)) { ensureChunkAt(m, m.start.x, m.start.y); groundPreview(m); }
  return m;
}
function* buildMapStages(id, d) {
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
  yield 'objects';
  if (!(typeof window !== 'undefined' && window.EDITOR_MODE)) yield* groundPrepGen(m);   // finalizeMap then finds m.gp
  finalizeMap(m);
  yield 'ground';
  yield* prepCloudSeaGen(m);   // the cloud-sea tiles (once per theme) and the island shadow, time-sliced with the rest of the load
  buildAnchors(m, d);
  sectionCentres(m);
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
  for (const sec of m.sections) {   // centre = the mean of its walkable tiles (tools/engine-tour.js and tools/maps/engine-check.js tour these)
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
