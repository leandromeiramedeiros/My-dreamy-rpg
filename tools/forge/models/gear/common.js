'use strict';
// GEAR COMMON — shared helpers and palettes for the M4a gear lines (sword, buckler, staff, grimoire, warden) on the ref rig.
// Rarity is NOT baked here (runtime FORGE_FX draws glow, rim, lights). Emissive mats are named emit* / hue* / gem* and
// sockets are named so the runtime can attach to them: tip / weaponTip (blade, staff head), gem, offhandTip, grimoire.
// Every ramp is a literal array of 4 tones (+ a glint) with strictly rising CIE L*, so tools/palette-lint.js can read it.
const { SCALE } = require('../ref.js');
const sc = v => Array.isArray(v) ? v.map(x => x * SCALE) : v * SCALE;
// authoring is in reference px (the rig is the reference x SCALE); geo() scales a prim / socket
const geo = p => { const o = Object.assign({}, p); for (const k of ['c', 'r', 'a', 'b', 'h', 'at']) if (o[k]) o[k] = sc(o[k]);
  for (const k of ['ra', 'rb', 'round']) if (o[k] != null) o[k] = sc(o[k]);
  if (o.clip) o.clip = (Array.isArray(o.clip[0]) ? o.clip : [o.clip]).map(c => [c[0], c[1], c[2], c[3] * SCALE]); return o; };
const SIDES = [['R', -1], ['L', 1]], both = f => SIDES.flatMap(([s, k]) => f(s, k));
const metal = ramp => ({ ramp, spec: 0.965 });
const gemOf = ramp => ({ ramp, lift: 1, spec: 0.9 });
const flat = (c, i = 2) => ({ ramp: [c, c, c, c], flat: i });          // emissive: one tone, never shaded or cleaned up
// ---- palettes ([shadow, low, mid, high, glint]) -----------------------------------------------------------------------
const PAL = {
  rust: ['#3a2a26', '#5e4a40', '#8a7262', '#b09a88'],
  iron: ['#25252f', '#44444f', '#676774', '#9494a2', '#c8c8d4'],
  steel: ['#1c2140', '#384270', '#626ea0', '#a6b0d4', '#f4f8ff'],
  polish: ['#1e2440', '#3a4672', '#6878ae', '#b0bfe8', '#ffffff'],
  silver: ['#2a2842', '#535478', '#8b8fb8', '#cfd4ec', '#ffffff'],
  pearl: ['#3a3458', '#6e6a96', '#b4b4d8', '#ecebfa', '#ffffff'],
  gold: ['#5a3608', '#9a6414', '#d8a030', '#f6d870', '#fffbe0'],
  bronze: ['#3c2010', '#6e3c1c', '#a8683a', '#d89a60'],
  leather: ['#3a2216', '#5e3a24', '#85573a', '#b07e56'],
  wood: ['#3a2414', '#5e3c22', '#8a5c34', '#b88654'],
  darkwood: ['#2c1e16', '#443020', '#634a34', '#86684a'],
  mail: ['#1c1f30', '#33384f', '#4e5572', '#737b9c'],
  cloth: ['#141f4e', '#22367a', '#3656b0', '#7896e8'],
  cloak: ['#10305a', '#1c4c8a', '#2e74c8', '#78b4f0'],
  tabard: ['#4a0e1e', '#7e1a30', '#b8324a', '#e86a80'],
  plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'],
  parch: ['#6a5a3a', '#a08c5a', '#d8c890', '#f4ecc4'],
  void: ['#241c44', '#382e6a', '#52489c', '#8478d4'],
  sapphire: ['#0c2470', '#1e4ccc', '#4a8cff', '#b8dcff', '#ffffff'],
  ruby: ['#4a0614', '#9a1428', '#e0384c', '#ff98a8', '#ffffff'],
  emerald: ['#06361e', '#12703c', '#2ec070', '#a0f0c0', '#ffffff'],
  amethyst: ['#2c1058', '#5a28a8', '#9060e8', '#d4b8ff', '#ffffff'],
};
const EMIT = { sun: '#fff0b0', dawn: '#ffe8a0', aurora: '#9af5d8', violet: '#c8a8ff', ice: '#bff4ff', ember: '#ffb060' };
const LEATHER_K = { ramp: ['#4a2c1a', '#7a4a2c', '#a8703e', '#d09a5e'], keep: true };      // 1 px straps that survive cleanup
// ---- pieces -----------------------------------------------------------------------------------------------------------
const piece = (family, slot, t, L, extra) => Object.assign({ id: `${family}.t${t}`, family, tier: t, slot, hides: [],
  layers: [Object.assign({ id: `${family}.t${t}` }, L, { prims: (L.prims || []).map(geo), sprites: (L.sprites || []).map(sp => Object.assign({}, sp, { at: sp.at && sc(sp.at) })) })] }, extra || {});
const sockets = o => { const r = {}; for (const k in o) r[k] = geo(o[k]); return r; };
const notAttack = fn => (a, f) => a.startsWith('attack') ? {} : fn(a, f);
// rotate v by Euler [rx, ry, rz] the way forge turns a prim (Ry * Rx * Rz)
const rotv = (v, [rx, ry, rz]) => { let [x, y, z] = v; [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)]; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)]; return [x, y, z]; };

// ---- sprite grids ------------------------------------------------------------------------------------------------------
// One drawing per facing. front(rows) makes 8 grids from one front-view drawing: S as drawn, the 3/4 views squeezed in
// width, the side views edge-on (a thin sliver of the drawing's centre columns), the back views the same squeeze (flip:
// the back of a plate is its front seen from behind). `at` is the pinned cell (the drawing's centre unless given).
const DIRN = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const cols = (rows, w) => { const W = rows[0].length; return rows.map(r => { let o = ''; for (let i = 0; i < w; i++) o += r[Math.min(W - 1, Math.floor((i + 0.5) * W / w))]; return o; }); };
// squeezing can leave a char with no same-char 4-neighbour; it takes the char of its left (else right, up, down) neighbour
function heal(rows) {
  const R = rows.map(r => r.split(''));
  for (let pass = 0; pass < 3; pass++) for (let y = 0; y < R.length; y++) for (let x = 0; x < R[y].length; x++) {
    const c = R[y][x]; if (c === '.') continue;
    const nb = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => (R[y + dy] || [])[x + dx]);
    if (nb.includes(c)) continue;
    const o = nb.find(n => n && n !== '.'); if (o) R[y][x] = o;
  }
  return R.map(r => r.join(''));
}
function front(rows, o = {}) {
  const W = rows[0].length, H = rows.length, at = o.at || [W >> 1, H >> 1], squeeze = o.squeeze || [1, 0.72, 0.3, 0.72, 1, 0.72, 0.3, 0.72];
  const out = {};
  DIRN.forEach((d, i) => {
    if (o.only && !o.only.includes(d)) return;
    const w = Math.max(o.minW || 1, Math.round(W * squeeze[i]));
    const src = o.back && i >= 3 && i <= 5 ? o.back : rows, rr = cols(src, w);
    out[d] = { at: [Math.min(w - 1, Math.round(at[0] * w / W)), at[1]], rows: heal(rr) };
  });
  return out;
}
// lone characters (no 4-neighbour of the same char) in a grid set: a drawing mistake, caught at load time
function lintGrid(name, dirs) {
  for (const d in dirs) { if (!dirs[d]) continue; const R = dirs[d].rows;
    for (let y = 0; y < R.length; y++) for (let x = 0; x < R[y].length; x++) {
      const c = R[y][x]; if (c === '.') continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R[y + dy] && R[y + dy][x + dx] === c)) throw new Error(`${name} ${d} (${x},${y}) lone '${c}'`);
    } }
  return dirs;
}
module.exports = { SCALE, sc, geo, SIDES, both, metal, gemOf, flat, PAL, EMIT, LEATHER_K, piece, sockets, notAttack, rotv, DIRN, front, lintGrid, cols, heal };
