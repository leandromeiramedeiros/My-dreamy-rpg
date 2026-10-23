#!/usr/bin/env node
'use strict';
// tools/export/tiles.js -- world tiles for Godot (handoff/art/tiles/<zone>/), rasterised by tools/export/ground.js (the
// tileable port of js/maps.js's ground grammar). Driven by handoff/data/zones.json (written with the defaults below when
// missing; edit names / file names / terrain lists there and rerun). Per zone:
//   terrain_<id>.png + .json   ISOMETRIC 32 x 16 cells (the engine's 2:1 diamond; Godot tile_shape ISOMETRIC, tile_size 32x16,
//                              layout DIAMOND_DOWN: map +x = screen down-right, +y = down-left). A transition terrain = the
//                              blob-47 grid (12 x 4: 47 cells + 1 spare) of that terrain over the zone's base (grass), then row 4
//                              = 4 plain fills; the base = 4 plain fills only. Water: 4 animation frames, frame k's grid at
//                              column offset 12 k (Godot animation_separation (11, 0)).
//   cliff_<zone>.png + .json   32 x 36 cells: a column h = 1..3 levels (6 px each) for a grass and a stone top, x 16
//                              combos of (front faces SW / SE visible, back rims NW / NE); then foot shadow overlays (AO from the
//                              NE / NW / N-corner neighbour, wedge shadow dh 0..3). The z = 0 footprint diamond sits at rows 20..35.
//   coast.png + .json          the island skirt under a front (SW / SE) edge, 3 lengths x 4 variants, and the dark back rim
//   water.png + .json          the plain water tile, 4 frames
// Usage: node tools/export/tiles.js [zone..] [--out dir]  (default every zone of zones.json; out = handoff/art/tiles)
const fs = require('fs'), path = require('path');
const E = require('./engine.js')(), makeGround = require('./ground.js'), { Img } = require('./png8.js');
const ROOT = path.join(__dirname, '..', '..');
const ZONES_FILE = path.join(ROOT, 'handoff', 'data', 'zones.json');
const DEFAULT_TERRAINS = [
  { id: 'grass', ch: 'g', base: true }, { id: 'flower_meadow', ch: 'f' }, { id: 'dark_moss', ch: 'd' }, { id: 'path', ch: 'p' },
  { id: 'stone_stairs', ch: 's' }, { id: 'flagstones', ch: 'x' }, { id: 'water', ch: 'w', frames: 4, ms: 220 },
  { id: 'bridge', ch: 'b', plain: true }, { id: 'rune_floor', ch: 'r', plain: true },
];
const DEFAULT_ZONES = [
  { id: 'vale', theme: 'vale', name: 'Whispering Vale' },
  { id: 'pinewood', theme: 'forest', name: 'Misty Pinewood' },
  { id: 'ruins', theme: 'ruins', name: 'Gloomspire Ruins' },
];
function zoneRecord(z) {
  return Object.assign({ id: z.id, theme: z.theme, name: z.name, light_side: E.THEMES[z.theme].moon.x < 240 ? 'left' : 'right', palette: `palettes/${z.id}.gpl`, tiles: `tiles/${z.id}/`, decals: `props/decals_${z.id}.png`,
    terrains: DEFAULT_TERRAINS.map(t => Object.assign({ file: `terrain_${t.id}.png` }, t)),
    cliff: `cliff_${z.id}.png`, coast: 'coast.png', water: 'water.png' }, z);
}
function loadZones() {
  if (fs.existsSync(ZONES_FILE)) return JSON.parse(fs.readFileSync(ZONES_FILE, 'utf8')).zones;
  const zones = DEFAULT_ZONES.map(zoneRecord);
  fs.mkdirSync(path.dirname(ZONES_FILE), { recursive: true });
  fs.writeFileSync(ZONES_FILE, JSON.stringify({ about: 'One record per exported zone theme (tools/export/tiles.js reads it; edit names, file names and terrain lists, then rerun node tools/export/all.js). theme = the engine theme in js/maps.js THEMES; ch = the engine tile character.', zones }, null, 1) + '\n');
  return zones;
}

// ---- blob-47 ------------------------------------------------------------------------------------------------------------
// Directions (engine N8 order; screen names per js/util.js: +x down-right, +y down-left, screen-up = North):
const DIRS = [
  { k: 0, d: [-1, 0], name: 'NW', godot: 'TOP_LEFT_SIDE' }, { k: 1, d: [1, 0], name: 'SE', godot: 'BOTTOM_RIGHT_SIDE' },
  { k: 2, d: [0, -1], name: 'NE', godot: 'TOP_RIGHT_SIDE' }, { k: 3, d: [0, 1], name: 'SW', godot: 'BOTTOM_LEFT_SIDE' },
  { k: 4, d: [-1, -1], name: 'N', godot: 'TOP_CORNER' }, { k: 5, d: [1, -1], name: 'E', godot: 'RIGHT_CORNER' },
  { k: 6, d: [-1, 1], name: 'W', godot: 'LEFT_CORNER' }, { k: 7, d: [1, 1], name: 'S', godot: 'BOTTOM_CORNER' },
];
const CORNER_SIDES = { 4: [0, 2], 5: [1, 2], 6: [0, 3], 7: [1, 3] };
const reduce = bits => bits.map((b, k) => k < 4 ? b : (b && bits[CORNER_SIDES[k][0]] && bits[CORNER_SIDES[k][1]] ? 1 : 0));
const key8 = bits => bits.reduce((a, b, k) => a | (b << k), 0);
// the layout: columns 0-3 = the classic 16 "sides only" tiles (column = connection along map x: none, +x, both, -x; row =
// along map y: +y, both, -y, none; every corner between two connected sides filled), then the 31 tiles with a cut corner in
// columns 4-11 (fewest connected sides first, then by mask), cell (11, 3) spare
function blobLayout() {
  const cells = [], seen = new Set();
  const H = [[0, 0], [0, 1], [1, 1], [1, 0]], V = [[0, 1], [1, 1], [1, 0], [0, 0]];   // [-x, +x] and [-y, +y]
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const b = [H[c][0], H[c][1], V[r][0], V[r][1], 1, 1, 1, 1], bits = reduce(b);
    cells.push({ col: c, row: r, bits }); seen.add(key8(bits));
  }
  const rest = [];
  for (let m = 0; m < 256; m++) { const bits = reduce([0, 1, 2, 3, 4, 5, 6, 7].map(k => (m >> k) & 1)), k = key8(bits); if (seen.has(k)) continue; seen.add(k); rest.push(bits); }
  rest.sort((a, b) => (a.slice(0, 4).reduce((p, q) => p + q) - b.slice(0, 4).reduce((p, q) => p + q)) || key8(a) - key8(b));
  rest.forEach((bits, i) => cells.push({ col: 4 + (i % 8), row: Math.floor(i / 8), bits }));
  if (cells.length !== 47) throw new Error('blob47: ' + cells.length + ' cells');
  return cells;
}
const BLOB = blobLayout();
const cellJson = c => ({ col: c.col, row: c.row, bits: c.bits, mask: key8(c.bits), connect: DIRS.filter(d => c.bits[d.k]).map(d => d.name) });

// ---- writers -------------------------------------------------------------------------------------------------------------
const CW = 32, CHT = 16;
function exportZone(z, outRoot) {
  const G = makeGround(E, z.theme), dir = path.join(outRoot, z.id), files = [];
  const base = z.terrains.find(t => t.base) || z.terrains[0];
  const side = (file, json) => { fs.writeFileSync(path.join(dir, file), JSON.stringify(json, null, 1) + '\n'); files.push(file); };
  fs.mkdirSync(dir, { recursive: true });
  const common = { zone: z.id, theme: z.theme, cell: [CW, CHT], tile_shape: 'isometric', tile_layout: 'diamond_down', texture_origin: [0, 0], directions: DIRS.map(({ k, d, name, godot }) => ({ bit: k, offset: d, name, godot })) };
  for (const T of z.terrains) {
    const frames = T.frames || 1, plain = T.base || T.plain;
    const cols = plain ? 4 : 12, rows = plain ? 1 : 5, img = new Img(cols * CW * frames, rows * CHT);
    for (let f = 0; f < frames; f++) {
      const fx = f * cols * CW;
      if (!plain) for (const c of BLOB) G.topCell(img, fx + c.col * CW, c.row * CHT, { t: T.ch, nb: c.bits.map(b => b ? T.ch : base.ch), vr: 0, frame: f });
      for (let v = 0; v < 4; v++) G.topCell(img, fx + v * CW, (plain ? 0 : 4) * CHT, { t: T.ch, nb: Array(8).fill(T.ch), vr: v, frame: f });
    }
    img.save(path.join(dir, T.file)); files.push(T.file);
    side(T.file.replace(/\.png$/, '.json'), Object.assign({ image: T.file, terrain: T.id, engine_tile: T.ch, over: plain ? null : base.id, layout: plain ? 'fill4' : 'blob47',
      grid: [cols * frames, rows], frames: frames > 1 ? { count: frames, ms: T.ms, column_step: cols, godot_animation_separation: [cols - 1, 0] } : null }, common,
    { about: plain ? 'Plain fills (4 variants, cols 0-3). Godot: one tile each, all peering bits = this terrain, probability 1.' :
      `Blob-47 of ${T.id} over ${base.id}: bits[k] = 1 where neighbour k (directions[k]) is ${T.id} (or anything that does not lap over it), 0 where the base laps over it as a scalloped tongue. Corners only count when both adjacent sides are 1. Row 4 cols 0-3: plain fills (all bits 1).`,
    cells: plain ? [0, 1, 2, 3].map(v => ({ col: v, row: 0, variant: v, bits: [1, 1, 1, 1, 1, 1, 1, 1], mask: 255 })) : [...BLOB.map(cellJson), ...[0, 1, 2, 3].map(v => ({ col: v, row: 4, variant: v, bits: [1, 1, 1, 1, 1, 1, 1, 1], mask: 255 }))] }));
  }
  // cliffs
  const tops = [{ id: 'grass', ch: 'g', face: 'earth' }, { id: 'stone', ch: 'x', face: 'stone' }], cliffCells = [];
  const cimg = new Img(16 * CW, (tops.length * 3 + 2) * G.CH);
  tops.forEach((tp, ti) => { for (let h = 1; h <= 3; h++) for (let m = 0; m < 16; m++) {
    const o = { t: tp.ch, h, faceL: !!(m & 1), faceR: !!(m & 2), backL: !!(m & 4), backR: !!(m & 8), vr: 0 }, row = ti * 3 + h - 1;
    G.columnCell(cimg, m * CW, row * G.CH, o);
    cliffCells.push({ col: m, row, kind: 'column', top: tp.id, face: tp.face, h, face_sw: o.faceL, face_se: o.faceR, rim_nw: o.backL, rim_ne: o.backR });
  } });
  let si = 0;
  for (let dh = 0; dh <= 3; dh++) for (let m = 0; m < 8; m++) {
    const o = { n: !!(m & 1), w: !!(m & 2), nw: !!(m & 4), dh }; if (!m && !dh) continue;
    const col = si % 16, row = tops.length * 3 + Math.floor(si / 16); si++;
    G.shadowCell(cimg, col * CW, row * G.CH, o);
    cliffCells.push({ col, row, kind: 'shadow', ao_ne: o.n, ao_nw: o.w, ao_n: o.nw, wedge_dh: dh });
  }
  cimg.save(path.join(dir, z.cliff)); files.push(z.cliff);
  side(z.cliff.replace(/\.png$/, '.json'), Object.assign({}, common, { image: z.cliff, layout: 'cliff', cell: [CW, G.CH], footprint_row: G.FOOT, level_px: E.ZS, texture_origin: [0, G.FOOT + 8 - G.CH / 2], grid: [16, tops.length * 3 + 2],
    about: 'kind column: a tile raised h levels (6 px each); the z = 0 footprint diamond is rows 20..35 of the cell, the top diamond 6h px higher. face_sw / face_se: the front face shows (that neighbour is lower). rim_nw / rim_ne: that back neighbour is lower (1 px dark rim + lit lip). Put it on a Y-sorted layer at the tile it stands on. kind shadow: a black alpha overlay for the ground tile at a cliff foot (ao_ne / ao_nw / ao_n: that neighbour is higher; wedge_dh: the column NE of it is dh levels higher), drawn over the ground layer.',
    cells: cliffCells }));
  // coast
  const lens = [0.3, 0.6, 1.0], coastCells = [], kimg = new Img(12 * CW, (lens.length + 1) * G.KH);
  lens.forEach((s, r) => { let c = 0; for (const [L, R] of [[1, 0], [0, 1], [1, 1]]) for (let v = 0; v < 4; v++) {
    G.coastCell(kimg, c * CW, r * G.KH, { t: 'g', L, R, s, vr: v }); coastCells.push({ col: c, row: r, kind: 'skirt', edge_sw: !!L, edge_se: !!R, length: s, variant: v }); c++;
  } });
  [[1, 0], [0, 1], [1, 1]].forEach(([NW, NE], c) => { G.coastCell(kimg, c * CW, lens.length * G.KH, { rim: true, NW, NE }); coastCells.push({ col: c, row: lens.length, kind: 'rim', edge_nw: !!NW, edge_ne: !!NE }); });
  kimg.save(path.join(dir, z.coast)); files.push(z.coast);
  side(z.coast.replace(/\.png$/, '.json'), Object.assign({}, common, { image: z.coast, layout: 'coast', cell: [CW, G.KH], footprint_row: 2, texture_origin: [0, 2 + 8 - G.KH / 2], grid: [12, lens.length + 1],
    about: 'The floating island\'s edge, for a ground tile whose SW and / or SE neighbour is void: the 2 px lit lip on the top (grass), the 18 px slab (overhang lip, underline, strata, AO), then rock lobes fading to alpha 0 and some hanging roots. length = fraction of the zone\'s full skirt (the engine makes it longest under the island\'s middle). kind rim: the 1 px dark rim over a NW / NE back edge that meets the sky. The footprint diamond is rows 2..17; draw this layer under the ground layer.',
    cells: coastCells }));
  // water fill frames
  const W = z.terrains.find(t => t.ch === 'w'), wimg = new Img(4 * CW, CHT);
  for (let f = 0; f < 4; f++) G.topCell(wimg, f * CW, 0, { t: 'w', nb: Array(8).fill('w'), vr: 0, frame: f });
  wimg.save(path.join(dir, z.water)); files.push(z.water);
  side(z.water.replace(/\.png$/, '.json'), Object.assign({}, common, { image: z.water, layout: 'frames', grid: [4, 1], frames: { count: 4, ms: (W && W.ms) || 220, loop: true }, about: 'The open-water tile, 4 frames left to right (the same as row 4 col 0 of terrain_water.png per frame).' }));
  return files.map(f => path.join(dir, f));
}

module.exports = { exportZone, loadZones, BLOB, DIRS, reduce, key8 };
if (require.main === module) {
  const args = process.argv.slice(2), oi = args.indexOf('--out');
  const out = oi >= 0 ? path.resolve(args[oi + 1]) : path.join(ROOT, 'handoff', 'art', 'tiles');
  const want = args.filter((a, i) => !a.startsWith('--') && (oi < 0 || i !== oi + 1));
  const zones = loadZones().filter(z => !want.length || want.includes(z.id));
  for (const z of zones) { const t0 = Date.now(), f = exportZone(z, out); console.log(`${z.id}: ${f.length} files in ${Date.now() - t0} ms`); }
}
