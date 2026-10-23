#!/usr/bin/env node
'use strict';
// tools/export/tile-check.js -- reassembly check of the exported world tiles (tools/export/tiles.js).
// Per zone: a 18 x 18 test map (grass with blobs of every transition terrain, a 2-level plateau, the island edge) is drawn
//   (a) by the ENGINE: js/maps.js rasterRect (the ground raster, no decals) + rasterColumn for every raised tile, in depth order
//       (the game's own code, run headless by tools/export/engine.js: same functions the chunk builder calls in the browser);
//   (b) from the EXPORTED PNGs only: the blob-47 cell picked from the 8 neighbours by the sidecar's bit rules, fills by variant,
//       cliff columns + foot shadows, coast skirts + rims, placed on the same iso grid,
// and saved side by side (engine | export | |diff| x4) as tools/out/export/compare-<zone>.png (2x).
// Checks (exit 1 on FAIL):
//   edges   every blob cell's connected side equals the plain fill along that side (2 px band, away from the corners): any
//           two tiles of a terrain then meet without a seam
//   seams   mean colour step across tile boundaries / inside tiles, export vs engine (a seam shows as a higher ratio)
//   cover   every land-surface pixel the engine draws (tops, columns) is drawn by the export (no missing tile / hole); the
//           skirt below the island is left out (its length is island-global in the engine)
// Usage: node tools/export/tile-check.js [zone..] [--tiles dir]   (default dir handoff/art/tiles)
const fs = require('fs'), path = require('path');
const E = require('./engine.js')(), { Img, readPng } = require('./png8.js'), { loadZones, reduce } = require('./tiles.js');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tools', 'out', 'export');
const args = process.argv.slice(2), ti = args.indexOf('--tiles');
const TILES = ti >= 0 ? path.resolve(args[ti + 1]) : path.join(ROOT, 'handoff', 'art', 'tiles');
const want = args.filter((a, i) => !a.startsWith('--') && (ti < 0 || i !== ti + 1));
const { isoX, isoY, toWorld, hash2, TPRI, N8 } = E;
let fail = 0;
const report = (ok, name, msg) => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(6)} ${msg}`); };

function testMap(theme) {
  const W = 18, H = 18, m = E.newMap(W, H, E.THEMES[theme]); m.themeId = theme; m.id = 'tilecheck-' + theme;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) m.type[j][i] = 'g';
  const blob = (ch, cx, cy, r, s) => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const d = Math.hypot(i - cx, (j - cy) * 1.2) + (hash2(i, j, s) - 0.5) * 1.6; if (d < r) m.type[j][i] = ch; } };
  blob('w', 4, 4, 2.6, 1); blob('p', 12, 3.5, 2.2, 2); blob('x', 4, 12, 2.4, 3); blob('f', 9, 9, 2, 4); blob('d', 14, 14, 2.1, 5); blob('s', 13, 9, 1.4, 6);
  for (let j = 0; j < H; j++) m.type[j][8] = j > 1 && j < 6 ? 'p' : m.type[j][8];   // a 1-wide path: thin blob configs
  m.type[7][15] = 'w'; m.type[15][7] = 'p';                                         // single-tile islands
  for (let j = 6; j <= 8; j++) for (let i = 1; i <= 3; i++) { m.type[j][i] = 'g'; m.h[j][i] = j === 7 && i === 2 ? 2 : 1; }   // plateau
  m.h[11][16] = 3; m.type[11][16] = 'x';                                            // a stone pillar of 3 levels
  return m;
}

function engineRender(m) {
  const g = E.groundPrep(m), img = new E.ImageData(g.W, g.H);
  E.rasterRect(m, img, 0, 0, 0, 0, g.W, g.H);
  const out = Img.from({ w: g.W, h: g.H, rgba: img.data }), cols = [];
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.h[j][i] > 0) cols.push(E.rasterColumn(m, i, j));
  cols.sort((a, b) => a.key - b.key);
  for (const c of cols) out.blit({ w: c.img.width, h: c.img.height, rgba: c.img.img.data }, Math.round(c.sx - g.minSX), Math.round(c.sy), true);
  return { out, g };
}

function loadSheet(dir, file) { const j = JSON.parse(fs.readFileSync(path.join(dir, file.replace(/\.png$/, '.json')), 'utf8')); return { j, img: Img.from(readPng(path.join(dir, file))) }; }
function exportRender(m, z, g) {
  const dir = path.join(TILES, z.id), out = new Img(g.W, g.H), byCh = {};
  for (const T of z.terrains) byCh[T.ch] = loadSheet(dir, T.file);
  const cliff = loadSheet(dir, z.cliff), coast = loadSheet(dir, z.coast);
  const [cw, chh] = cliff.j.cell, [kw, kh] = coast.j.cell;
  const typeAt = (i, j) => E.typeAt(m, i, j), hAt = (i, j) => E.hAt(m, i, j);
  const cellAt = (S, c, r, f = 0) => ({ x: (c + f * ((S.j.frames && S.j.frames.column_step) || 0)) * S.j.cell[0], y: r * S.j.cell[1] });
  const put = (S, cell, x, y, w, h) => out.blit(S.img, x, y, true, cell.x, cell.y, w, h);
  const ox = (i, j) => Math.round(isoX(i, j) - g.minSX) - 16, oy = (i, j) => isoY(i, j, 0);
  const shadowCell = o => cliff.j.cells.find(c => c.kind === 'shadow' && c.ao_ne === o.n && c.ao_nw === o.w && c.ao_n === o.nw && c.wedge_dh === o.dh);
  // ground (h = 0): the blob cell, or a fill variant
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    const t = typeAt(i, j), h = hAt(i, j); if (!t || h > 0) continue;
    const S = byCh[t], vr = Math.floor(hash2(i, j, 91) * 4);
    let cell;
    if (S.j.layout === 'blob47') {
      const pr = TPRI[t] || 0, bits = reduce(N8.map(([dx, dy]) => { const u = typeAt(i + dx, j + dy); return pr > 1 && u && TPRI[u] && TPRI[u] < pr && Math.abs(hAt(i + dx, j + dy) - h) <= 1 ? 0 : 1; }));
      const c = bits.every(Boolean) ? S.j.cells.find(c => c.row === 4 && c.variant === vr) : S.j.cells.find(c => c.bits.every((b, k) => b === bits[k]));
      cell = cellAt(S, c.col, c.row);
    } else cell = cellAt(S, vr, 0);
    put(S, cell, ox(i, j), oy(i, j), 32, 16);
    // foot shadows: AO from the NE / NW / N neighbour, the wedge of a column NE of it
    const o = { n: hAt(i, j - 1) > h, w: hAt(i - 1, j) > h, nw: hAt(i - 1, j - 1) > h, dh: Math.max(0, Math.min(3, hAt(i, j - 1) - h)) };
    if (o.n || o.w || o.nw || o.dh) { const c = shadowCell(o); put(cliff, cellAt(cliff, c.col, c.row), ox(i, j), oy(i, j) - cliff.j.footprint_row, cw, chh); }
  }
  // coast: skirts under SW / SE edges over the void, length from the island profile (engine groundPrep), rims on back edges
  const cx = g.W / 2, hw = g.W / 2;
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    if (!typeAt(i, j)) continue;
    const L = !typeAt(i, j + 1), R = !typeAt(i + 1, j), NW = !typeAt(i - 1, j), NE = !typeAt(i, j - 1);
    const px = isoX(i + 0.5, j + 0.5) - g.minSX, s = Math.pow(Math.max(0, 1 - Math.abs(px - cx) / hw), 0.55);
    const len = [0.3, 0.6, 1.0].reduce((p, q) => Math.abs(q - s) < Math.abs(p - s) ? q : p), v = Math.floor(hash2(i, j, 77) * 4);
    if (L || R) { const c = coast.j.cells.find(c => c.kind === 'skirt' && c.edge_sw === L && c.edge_se === R && c.length === len && c.variant === v); put(coast, cellAt(coast, c.col, c.row), ox(i, j), oy(i, j) - coast.j.footprint_row, kw, kh); }
    if ((NW || NE) && !hAt(i, j)) { const c = coast.j.cells.find(c => c.kind === 'rim' && c.edge_nw === NW && c.edge_ne === NE); put(coast, cellAt(coast, c.col, c.row), ox(i, j), oy(i, j) - coast.j.footprint_row, kw, kh); }
  }
  // columns in the engine's depth order (i + j)
  const cols = [];
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (hAt(i, j) > 0) cols.push([i, j]);
  cols.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  for (const [i, j] of cols) {
    const h = hAt(i, j), t = typeAt(i, j), top = t === 'x' || t === 's' || t === 'r' ? 'stone' : 'grass';
    const c = cliff.j.cells.find(c => c.kind === 'column' && c.top === top && c.h === Math.min(3, h) && c.face_sw === hAt(i, j + 1) < h && c.face_se === hAt(i + 1, j) < h && c.rim_nw === hAt(i - 1, j) < h && c.rim_ne === hAt(i, j - 1) < h);
    put(cliff, cellAt(cliff, c.col, c.row), ox(i, j), oy(i, j) - cliff.j.footprint_row, cw, chh);
  }
  return out;
}

// edges: a connected side of a blob cell == the plain fill along it (2 px band, |along| in 0.2..0.8)
function edgeCheck(z) {
  const dir = path.join(TILES, z.id); let cells = 0, bad = 0, px = 0;
  for (const T of z.terrains) {
    const S = loadSheet(dir, T.file); if (S.j.layout !== 'blob47') continue;
    const fill = S.j.cells.find(c => c.row === 4 && c.variant === 0);
    // sides k with both perpendicular sides and both corners on side k connected (otherwise a tongue from the perpendicular side
    // reaches this edge near its ends in this tile AND in the neighbour, as in the engine)
    const PERP = { 0: [2, 3, 4, 6], 1: [2, 3, 5, 7], 2: [0, 1, 4, 5], 3: [0, 1, 6, 7] };
    for (const c of S.j.cells) for (let k = 0; k < 4; k++) {
      if (!c.bits[k] || c.row === 4 || PERP[k].some(q => !c.bits[q])) continue;
      cells++; let diff = 0;
      for (let cy = 0; cy < 16; cy++) for (let cxp = 0; cxp < 32; cxp++) {
        const [fx, fy] = toWorld(cxp - 16 + 0.5, cy + 0.5); if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) continue;
        const [dx, dy] = N8[k], dist = dx ? (dx < 0 ? fx : 1 - fx) : (dy < 0 ? fy : 1 - fy), along = dx ? fy : fx;
        if (dist > 0.09 || along < 0.2 || along > 0.8) continue;
        px++;
        const a = S.img.get(c.col * 32 + cxp, c.row * 16 + cy), b = S.img.get(fill.col * 32 + cxp, fill.row * 16 + cy);
        if (a.some((v, q) => v !== b[q])) diff++;
      }
      if (diff) bad++;
    }
  }
  return { cells, bad, px };
}
// mean RGB step between horizontally adjacent pixels, split by "same tile" / "different tile" (both opaque, both ground at h 0)
function stepStats(img, m, g) {
  let a = 0, an = 0, b = 0, bn = 0;
  const tileOf = (x, y) => { const [wx, wy] = toWorld(x + g.minSX + 0.5, y + 0.5), i = Math.floor(wx), j = Math.floor(wy); return E.typeAt(m, i, j) && !E.hAt(m, i, j) && E.hAt(m, i, j - 1) <= 0 && E.hAt(m, i - 1, j) <= 0 ? j * m.W + i : -1; };
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w - 1; x++) {
    const t0 = tileOf(x, y), t1 = tileOf(x + 1, y); if (t0 < 0 || t1 < 0 || m.type[Math.floor(t0 / m.W)][t0 % m.W] !== m.type[Math.floor(t1 / m.W)][t1 % m.W]) continue;
    const p = img.get(x, y), q = img.get(x + 1, y); if (p[3] < 255 || q[3] < 255) continue;
    const d = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
    if (t0 === t1) { a += d; an++; } else { b += d; bn++; }
  }
  return { inside: a / an, across: b / bn };
}

const zones = loadZones().filter(z => !want.length || want.includes(z.id));
fs.mkdirSync(OUT, { recursive: true });
for (const z of zones) {
  const m = testMap(z.theme), { out: eng, g } = engineRender(m), exp = exportRender(m, z, g);
  // side by side at 2x: engine | export | |diff| x4, on a dark backdrop
  const S = 2, W = g.W, Hh = Math.min(g.H, isoY(m.W, m.H) + 80), pane = new Img((W * 3 + 16) * S, Hh * S);
  let cover = 0, missing = 0, sum = 0, n = 0;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const p = eng.get(x, y), q = exp.get(x, y), bg = [24, 20, 36];
    const mix = c => c[3] ? [0, 1, 2].map(k => (c[k] * c[3] + bg[k] * (255 - c[3])) / 255) : bg;
    const A = mix(p), B = mix(q), D = [0, 1, 2].map(k => Math.min(255, Math.abs(A[k] - B[k]) * 4));
    const [wx, wy] = toWorld(x + g.minSX + 0.5, y + 0.5), land = !!E.typeAt(m, Math.floor(wx), Math.floor(wy));
    if (p[3] === 255 && land) { cover++; if (q[3] < 128) missing++; else { sum += Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]); n++; } }
    for (let s = 0; s < S * S; s++) { const dx = s % S, dy = (s / S) | 0; pane.set(x * S + dx, y * S + dy, A); pane.set((W + 8 + x) * S + dx, y * S + dy, B); pane.set((2 * W + 16 + x) * S + dx, y * S + dy, D); }
  }
  const file = path.join(OUT, `compare-${z.id}.png`); pane.save(file);
  const ec = edgeCheck(z), se = stepStats(eng, m, g), sx = stepStats(exp, m, g);
  console.log(`== ${z.id} (${z.theme}) -> ${path.relative(ROOT, file)}`);
  report(ec.bad === 0, 'edges', `${ec.cells - ec.bad}/${ec.cells} connected sides equal the fill along the edge (${ec.px} px compared)`);
  const rE = se.across / se.inside, rX = sx.across / sx.inside;
  report(rX <= Math.max(1.15, rE * 1.15), 'seams', `step across / inside tiles: export ${sx.across.toFixed(1)} / ${sx.inside.toFixed(1)} = ${rX.toFixed(2)} | engine ${se.across.toFixed(1)} / ${se.inside.toFixed(1)} = ${rE.toFixed(2)}`);
  report(missing / cover < 0.01, 'cover', `${cover - missing}/${cover} engine land pixels drawn by the export (${(100 * missing / cover).toFixed(2)} % missing); mean |RGB diff| ${(sum / n).toFixed(1)} per pixel`);
}
console.log(fail ? `tile-check: ${fail} FAIL` : 'tile-check: all PASS');
process.exitCode = fail ? 1 : 0;
