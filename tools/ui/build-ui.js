'use strict';
// Builds js/font.js (FONT_ART + UI_ART) from tools/ui/font-src.js and the procedural pixel art below.
//   node tools/ui/build-ui.js
// No dependencies: includes a tiny PNG encoder (zlib).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const SRC = require('./font-src.js');

// ------------------------------------------------------------------ PNG
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(img) {
  const { w, h, d } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(d.buffer, d.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const dataURI = (img) => 'data:image/png;base64,' + png(img).toString('base64');

// ------------------------------------------------------------------ image helpers
class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
  set(x, y, c) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3]; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0]; const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.get(x, y); if (c[3]) this.set(ox + x, oy + y, c); } }
  // composite src over this (alpha-aware)
  over(src, ox, oy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const s = src.get(x, y); if (!s[3]) continue; const d = this.get(ox + x, oy + y); const sa = s[3] / 255, da = d[3] / 255, oa = sa + da * (1 - sa);
      this.set(ox + x, oy + y, [0, 1, 2].map((k) => Math.round((s[k] * sa + d[k] * da * (1 - sa)) / oa)).concat([Math.round(oa * 255)]));
    }
  }
}
const hex = (s, a = 255) => { s = s.replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), a]; };
// paint a string grid using a palette map ('.' = transparent)
function grid(rows, pal, img, ox = 0, oy = 0) {
  if (!img) img = new Img(rows[0].length, rows.length);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch === '.' || ch === ' ') continue; if (!pal[ch]) throw new Error('no palette for ' + ch); img.set(ox + x, oy + y, pal[ch]); } });
  return img;
}
const P = {
  bg: '#15102a', line: '#8f7bd6', bright: '#c8b6ff', bevel: '#4a3d7a', edge: '#0b0716', text: '#f3ecff', dim: '#9f93c4',
  gold: '#ffd35a', hp: '#e8476c', hpHi: '#ff8fa8', mp: '#4f7df0', mpHi: '#9ab8ff', st: '#e3a93a', stHi: '#ffe08a', xp: '#b48aff', danger: '#ff3d6e',
};

// ------------------------------------------------------------------ masks / frames
function maskRect(w, h, rt, rb) {
  const m = new Uint8Array(w * h).fill(1);
  const cut = (cx, cy, dx, dy, r) => { for (let j = 0; j < r; j++) for (let i = 0; i < r - j; i++) m[(cy + dy * j) * w + (cx + dx * i)] = 0; };
  if (rt) { cut(0, 0, 1, 1, rt); cut(w - 1, 0, -1, 1, rt); }
  if (rb) { cut(0, h - 1, 1, -1, rb); cut(w - 1, h - 1, -1, -1, rb); }
  return m;
}
function erode(m, w, h, o = {}) {
  const out = new Uint8Array(w * h);
  const at = (x, y) => { if (y >= h && o.openBottom) return 1; if (x < 0 || y < 0 || x >= w || y >= h) return 0; return m[y * w + x]; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    let ok = at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1);
    if (ok && o.eight) ok = at(x - 1, y - 1) && at(x + 1, y - 1) && at(x - 1, y + 1) && at(x + 1, y + 1);
    out[y * w + x] = ok ? 1 : 0;
  }
  return out;
}
// layered pixel frame. o: {rt, rb, layers:[hex...] (outside->in), fill, fillA, sheen, shade, openBottom, eight}
function frame(w, h, o) {
  const img = new Img(w, h);
  let cur = maskRect(w, h, o.rt || 0, o.rb === undefined ? (o.openBottom ? 0 : o.rt || 0) : o.rb);
  for (const c of o.layers) { const er = erode(cur, w, h, o); for (let i = 0; i < w * h; i++) if (cur[i] && !er[i]) img.set(i % w, (i / w) | 0, hex(c)); cur = er; }
  const fillMask = cur;
  if (o.fill) for (let i = 0; i < w * h; i++) if (fillMask[i]) img.set(i % w, (i / w) | 0, hex(o.fill, o.fillA === undefined ? 255 : o.fillA));
  if (o.sheen || o.shade) {
    const isF = (x, y) => y >= 0 && y < h && x >= 0 && x < w && fillMask[y * w + x];
    const top1 = [], top2 = [], bot = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!isF(x, y)) continue;
      if (!isF(x, y - 1)) top1.push([x, y]); else if (!isF(x, y - 2)) top2.push([x, y]);
      if (!isF(x, y + 1) && !o.openBottom) bot.push([x, y]);
    }
    if (o.sheen) { top1.forEach(([x, y]) => img.set(x, y, hex(o.sheen[0], o.fillA))); top2.forEach(([x, y]) => img.set(x, y, hex(o.sheen[1], o.fillA))); }
    if (o.shade) bot.forEach(([x, y]) => img.set(x, y, hex(o.shade, o.fillA)));
  }
  return img;
}
const CRESCENT = ['.####.', '###...', '##....', '##....', '#.....', '.#....'];
function ornament(img, color, hi, edge) {
  const w = img.w, h = img.h;
  const c = hex(color), hc = hex(hi), ec = hex(edge);
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const px = (x, y) => [fx ? w - 1 - x : x, fy ? h - 1 - y : y];
    const on = (x, y) => y >= 1 && y < 7 && x >= 1 && x < 7 && CRESCENT[y - 1][x - 1] === '#';
    // dark outline only where the frame has no solid pixel (so the frame lines flow into the horns)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if (on(x, y) || x > 6 || y > 6) continue; let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) near = true;
      const [qx, qy] = px(x, y); if (near && img.get(qx, qy)[3] < 255) img.set(qx, qy, ec);
    }
    for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) if (on(x, y)) { const [qx, qy] = px(x, y); img.set(qx, qy, (x === 2 && y === 2) || (x === 1 && y === 3) || (x === 3 && y === 1) ? hc : c); }
  }
}
const diamond = (n, cutMax, o) => { // octagonal / diamond mask sprite
  const img = new Img(n, n); const c = (n - 1) / 2; const m = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = Math.abs(x - c), dy = Math.abs(y - c); if (dx + dy <= o.r && Math.max(dx, dy) <= cutMax) m[y * n + x] = 1; }
  return { m, n, img };
};
function paintLayers(m, n, img, layers, eight) {
  let cur = m;
  for (const c of layers) { const er = erode(cur, n, n, { eight }); for (let i = 0; i < n * n; i++) if (cur[i] && !er[i]) img.set(i % n, (i / n) | 0, hex(c)); cur = er; }
  return cur;
}

// ------------------------------------------------------------------ tiny 3x5 label font (pad button faces)
const MINI = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  L: ['#..', '#..', '#..', '#..', '###'], R: ['##.', '#.#', '##.', '#.#', '#.#'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
};
function miniText(img, s, cx, y, color) {
  const wtot = s.length * 4 - 1; let x = Math.round(cx - wtot / 2);
  for (const ch of s) { MINI[ch].forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '#') img.set(x + i, y + j, hex(color)); }); x += 4; }
}

// ------------------------------------------------------------------ FONT
function buildFont(def) {
  const glyphs = {}; const cells = {};
  const mk = (ch, y0, rows) => {
    const w = rows[0].length; rows.forEach((r) => { if (r.length !== w) throw new Error(def.name + ' glyph ' + ch + ' ragged row ' + r); });
    if (y0 + rows.length > def.h) throw new Error(def.name + ' glyph ' + ch + ' exceeds cell height');
    const g = []; for (let y = 0; y < def.h; y++) g.push(Array(w).fill(0));
    rows.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] === '#') g[y0 + j][i] = 1; });
    return g;
  };
  for (const [ch, v] of Object.entries(def.glyphs)) cells[ch] = mk(ch, v[0], v.slice(1));
  for (const [ch, [b, acc]] of Object.entries(SRC.composed)) {
    const g = cells[b].map((r) => r.slice()); const w = g[0].length;
    if (acc === 'cedilla') { const [cy, ...rows] = def.cedilla; rows.forEach((r, j) => { for (let i = 0; i < r.length && i < w; i++) if (r[i] === '#') g[cy + j][i] = 1; }); }
    else if (b === 'i') { g[0].fill(0); g[1].fill(0); const a = def.iAccent[acc]; a.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] === '#') g[j][i] = 1; }); }
    else { const a = def.accents[acc]; a.forEach((r, j) => { if (r.length !== w) throw new Error('accent width ' + ch); for (let i = 0; i < w; i++) if (r[i] === '#') g[j][i] = 1; }); }
    cells[ch] = g;
  }
  // shelf pack
  const sheetW = 160; let x = 0, y = 0;
  const placed = []; const SH = def.h + 1;
  for (const ch of Object.keys(cells)) { const w = cells[ch][0].length; if (x + w > sheetW) { x = 0; y += SH; } placed.push([ch, x, y, w]); x += w + 1; }
  const img = new Img(sheetW, y + def.h);
  for (const [ch, px, py, w] of placed) {
    cells[ch].forEach((r, j) => r.forEach((v, i) => { if (v) img.set(px + i, py + j, [255, 255, 255, 255]); }));
    glyphs[ch] = { x: px, y: py, w, adv: w + 1 };
  }
  glyphs[' '] = { x: 0, y: 0, w: 0, adv: def.spaceAdv };
  return { h: def.h, lineH: def.lineH, base: def.base, capH: def.base - (def.h === 7 ? 0 : 0), spaceAdv: def.spaceAdv, glyphs, src: dataURI(img), _img: img, _cells: cells };
}

// ------------------------------------------------------------------ UI ART
const sprites = {}; // name -> {img, slice?, pad?}
const add = (name, img, extra) => { sprites[name] = Object.assign({ img }, extra || {}); };

function frameKind(name, w, h, slice, o, orn) {
  const img = frame(w, h, o); if (orn) ornament(img, orn[0], orn[1], P.edge);
  add(name, img, { slice, pad: o.pad });
}
const glass = { fill: P.bg, fillA: 224, sheen: ['#2a2152', '#1e1740'], shade: '#0e0920' };
frameKind('primary', 16, 16, [7, 7, 7, 7], Object.assign({ rt: 2, layers: [P.edge, P.line, P.bevel], pad: 6 }, glass), [P.bright, '#f3ecff']);
frameKind('plain', 12, 12, [5, 5, 5, 5], Object.assign({ rt: 2, layers: [P.edge, P.line, P.bevel], pad: 4 }, glass));
frameKind('gold', 16, 16, [7, 7, 7, 7], { rt: 2, layers: [P.edge, P.gold, '#9a6a1e'], fill: '#1a1226', fillA: 228, sheen: ['#3a2a3c', '#271c33'], shade: '#0e0920', pad: 6 }, [P.gold, '#fff3c0']);
frameKind('danger', 16, 16, [7, 7, 7, 7], { rt: 2, layers: [P.edge, P.danger, '#8a2244'], fill: '#2a0f22', fillA: 228, sheen: ['#4a1a36', '#35132b'], shade: '#150812', pad: 6 }, [P.hpHi, '#fff0f4']);
frameKind('tabActive', 12, 12, [5, 5, 5, 3], { rt: 2, openBottom: true, layers: [P.edge, P.bright, P.line], fill: '#2b2058', fillA: 240, sheen: ['#43377f', '#35296b'], pad: 3 });
frameKind('tabInactive', 12, 12, [5, 5, 5, 3], { rt: 2, openBottom: true, layers: [P.edge, P.bevel, '#2a2150'], fill: '#100b22', fillA: 214, pad: 3 });
frameKind('slot', 12, 12, [4, 4, 4, 4], { rt: 1, layers: [P.edge, P.bevel], fill: '#0b0716', fillA: 236, sheen: ['#04020b', '#07040f'], shade: '#241b4a', pad: 2 });
{ // slotRim: outer ring solid, second ring 45 % so tinted rim has a soft inner glow
  const img = frame(12, 12, { rt: 1, layers: ['#ffffff', '#ffffff'] });
  const inner = erode(erode(maskRect(12, 12, 1, 1), 12, 12), 12, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (!inner[y * 12 + x] && img.get(x, y)[3] && erode(maskRect(12, 12, 1, 1), 12, 12)[y * 12 + x]) img.set(x, y, [255, 255, 255, 110]);
  add('slotRim', img, { slice: [4, 4, 4, 4], pad: 2 });
}
frameKind('keyTag', 8, 8, [3, 3, 3, 3], { rt: 1, layers: [P.edge, P.bevel], fill: '#0b0716', fillA: 235, pad: 2 });
frameKind('keyTagMp', 8, 8, [3, 3, 3, 3], { rt: 1, layers: [P.edge, P.mp], fill: '#0b0716', fillA: 235, pad: 2 });
frameKind('sliderTrack', 8, 5, [2, 2, 2, 2], { rt: 1, layers: [P.edge, P.bevel], fill: '#0b0716', fillA: 255 });
frameKind('sliderFill', 6, 3, [2, 1, 2, 1], { rt: 0, layers: [], fill: P.line });
{ const s = sprites.sliderFill.img; for (let x = 0; x < 6; x++) { s.set(x, 0, hex(P.bright)); s.set(x, 2, hex('#6a58b0')); } }
frameKind('scrollTrack', 5, 12, [2, 2, 2, 2], { rt: 1, layers: [P.edge], fill: '#0b0716', fillA: 235 });
frameKind('scrollThumb', 5, 12, [2, 2, 2, 2], { rt: 1, layers: [P.edge, P.line], fill: P.bevel, sheen: ['#6a58b0', '#5a4a9a'] });

// keycap (bottom lip)
{
  const w = 9, h = 10, img = new Img(w, h);
  const m = maskRect(w, h, 1, 1);
  const e1 = erode(m, w, h);
  for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; if (!m[i]) continue; if (!e1[i]) img.set(x, y, hex(P.edge)); else img.set(x, y, y >= h - 3 ? hex('#4a3d7a') : hex('#3a2c78')); }
  for (let x = 1; x < w - 1; x++) { img.set(x, 1, hex(P.line)); }
  for (let y = 1; y < h - 3; y++) { img.set(1, y, hex(P.line)); img.set(w - 2, y, hex(P.line)); }
  for (let x = 1; x < w - 1; x++) img.set(x, h - 3, hex(P.line));
  for (let x = 2; x < w - 2; x++) img.set(x, 2, hex('#4d3f94'));
  add('keycap', img, { slice: [3, 3, 3, 4], pad: 3 });
}

// minimap: rounded diamond ring + filled mask
{
  const n = 56, c = (n - 1) / 2; const m = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = Math.abs(x - c), dy = Math.abs(y - c); if (dx + dy <= 27.5 && Math.max(dx, dy) <= 23.5) m[y * n + x] = 1; }
  const ring = new Img(n, n); const inner = paintLayers(m, n, ring, [P.edge, P.line, P.bevel], true);
  // soft glass fill is the map itself; ring only. tip ornaments
  const mask = new Img(n, n); for (let i = 0; i < n * n; i++) if (inner[i]) mask.set(i % n, (i / n) | 0, [255, 255, 255, 255]);
  const orb = grid(['..E..', '.EBE.', 'EBwBE', '.EBE.', '..E..'], { E: hex(P.edge), B: hex(P.bright), w: hex('#ffffff') });
  const t = 24; // flat tip centre offset
  ring.over(orb, Math.round(c) - 2 + 1, 0); ring.over(orb, Math.round(c) - 2 + 1, n - 5); ring.over(orb, 0, Math.round(c) - 2 + 1); ring.over(orb, n - 5, Math.round(c) - 2 + 1);
  add('minimap', ring, {}); add('minimapMask', mask, {});
}

// small sprites
{
  const o = diamond(12, 5.5, { r: 7 }); const img = o.img; const cur = paintLayers(o.m, 12, img, [P.edge, P.bright, P.line], true);
  for (let i = 0; i < 144; i++) if (cur[i]) { const x = i % 12, y = (i / 12) | 0; img.set(x, y, hex(y < 5 ? '#4a3a96' : '#35286e')); }
  add('levelBadge', img);
}
add('pipFull', grid(['.EEE.', 'EpwPE', 'EPPPE', 'EPPPE', '.EEE.'], { E: hex(P.edge), P: hex(P.hp), p: hex(P.hpHi), w: hex('#ffffff') }));
add('pipEmpty', grid(['.EEE.', 'EDDDE', 'EDddE', 'EDddE', '.EEE.'], { E: hex(P.edge), D: hex('#3a2f5a'), d: hex('#2a2150') }));
{
  const o = diamond(7, 3, { r: 3 }); const img = o.img; const cur = paintLayers(o.m, 7, img, [P.edge], false);
  for (let i = 0; i < 49; i++) if (cur[i]) img.set(i % 7, (i / 7) | 0, hex(((i / 7) | 0) < 3 ? '#fff0b0' : P.gold));
  img.set(3, 1, hex('#ffffff')); add('bullet', img);
  const o2 = diamond(7, 3, { r: 3 }); const i2 = o2.img; const c2 = paintLayers(o2.m, 7, i2, [P.edge], false);
  for (let i = 0; i < 49; i++) if (c2[i]) i2.set(i % 7, (i / 7) | 0, hex(P.edge)); // hollow: re-ring
  const hollow = new Img(7, 7); const mm = o2.m; const er = erode(mm, 7, 7);
  for (let i = 0; i < 49; i++) if (mm[i] && !er[i]) hollow.set(i % 7, (i / 7) | 0, hex(P.gold)); else if (mm[i]) hollow.set(i % 7, (i / 7) | 0, hex(P.edge));
  add('bulletHollow', hollow);
}
{ // focus ring: bracket corners, white (tint it)
  const w = 12, img = new Img(w, w); const W = [255, 255, 255, 255];
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) for (let k = 0; k < 4; k++) { const a = [k, 0], b = [0, k]; for (const [x, y] of [a, b]) img.set(fx ? w - 1 - x : x, fy ? w - 1 - y : y, W); }
  add('focus', img, { slice: [4, 4, 4, 4] });
}
add('arrowUp', grid(['..#..', '.###.', '#####'], { '#': hex(P.text) }));
add('arrowDown', grid(['#####', '.###.', '..#..'], { '#': hex(P.text) }));
{
  const img = frame(7, 9, { rt: 1, layers: [P.edge, P.bright], fill: '#a794ee', sheen: ['#f3ecff', '#d8ccff'], shade: '#8f7bd6' }); add('sliderKnob', img);
  add('sliderTick', grid(['#', '#', '#'], { '#': hex(P.bevel) }));
}
for (const on of [false, true]) {
  const img = frame(9, 9, { rt: 1, layers: [P.edge, on ? P.bright : P.line], fill: on ? '#3a2c78' : '#0b0716' });
  if (on) [[6, 2], [5, 3], [2, 4], [4, 4], [3, 5], [6, 3]].forEach(([x, y]) => img.set(x, y, hex(P.gold)));
  add(on ? 'checkOn' : 'checkOff', img);
}
for (const hov of [false, true]) {
  const img = frame(12, 12, { rt: 1, layers: [P.edge, hov ? P.bright : P.line, hov ? P.line : P.bevel], fill: hov ? '#7a2646' : '#2a1f55', sheen: hov ? ['#9a3a5e', '#8a2e52'] : ['#3a2c78', '#31256a'] });
  grid(['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], { '#': hex(P.text) }, img, 3, 3);
  add(hov ? 'closeXHover' : 'closeX', img);
}
const smallGlyph = (ch) => { const v = SRC.small.glyphs[ch]; return v; };
for (const hov of [false, true]) {
  const img = new Img(12, 12); const { m, img: base } = diamond(12, 5.5, { r: 8.2 });
  const circ = new Uint8Array(144); for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const dx = x - 5.5, dy = y - 5.5; if (dx * dx + dy * dy <= 34.5) circ[y * 12 + x] = 1; }
  const cur = paintLayers(circ, 12, img, [P.edge, hov ? P.bright : P.line], false);
  for (let i = 0; i < 144; i++) if (cur[i]) img.set(i % 12, (i / 12) | 0, hex(hov ? '#4a3a96' : '#2a1f55'));
  const g = smallGlyph('?'); g.slice(1).forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') img.set(4 + i, 3 + g[0] + j, hex(P.text)); });
  add(hov ? 'helpHover' : 'help', img);
}

// ---- controller / key prompt glyphs
function circle(n, layers, fillCol) {
  const img = new Img(n, n), c = (n - 1) / 2, m = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = x - c, dy = y - c; if (dx * dx + dy * dy <= (n / 2) * (n / 2) - 0.6) m[y * n + x] = 1; }
  const cur = paintLayers(m, n, img, layers, false);
  for (let i = 0; i < n * n; i++) if (cur[i]) img.set(i % n, (i / n) | 0, hex(fillCol));
  return img;
}
const XB = { A: ['#6fdc8c', '#b6f5c4'], B: ['#ff5a7a', '#ffb0c0'], X: ['#5b8cff', '#aac4ff'], Y: ['#ffd35a', '#fff0b0'] };
for (const k of 'ABXY') {
  const img = circle(11, [P.edge], XB[k][0]);
  for (let x = 3; x < 6; x++) img.set(x, 1, hex(XB[k][1])); img.set(2, 2, hex(XB[k][1])); img.set(1, 3, hex(XB[k][1]));
  miniText(img, k, 5, 3, '#0b0716'); add('xbox' + k, img);
}
const PS = { cross: ['#7aa7ff', ['#...#', '.#.#.', '..#..', '.#.#.', '#...#']], circle: ['#ff6b8a', ['.###.', '#...#', '#...#', '#...#', '.###.']],
  square: ['#ff9ad5', ['#####', '#...#', '#...#', '#...#', '#####']], triangle: ['#5fe0a0', ['..#..', '.#.#.', '.#.#.', '#...#', '#####']] };
for (const [k, [col, shape]] of Object.entries(PS)) {
  const img = circle(11, [P.edge, P.bevel], '#1a1430');
  grid(shape, { '#': hex(col) }, img, 3, k === 'triangle' ? 3 : 3); add('ps' + k[0].toUpperCase() + k.slice(1), img);
}
function pill(w, h, rt, rb, label, bump) {
  const img = frame(w, h, { rt, rb, layers: [P.edge, bump ? P.line : P.bright], fill: bump ? '#2d2360' : '#241a4a', sheen: bump ? ['#43377f', '#38296f'] : ['#3a2c78', '#2e2262'] });
  miniText(img, label, (w - 1) / 2, bump ? 2 : 3, P.text); return img;
}
for (const [k, lab] of [['xboxLB', 'LB'], ['xboxRB', 'RB'], ['psL1', 'L1'], ['psR1', 'R1']]) add(k, pill(15, 9, 2, 1, lab, true));
for (const [k, lab] of [['xboxLT', 'LT'], ['xboxRT', 'RT'], ['psL2', 'L2'], ['psR2', 'R2']]) add(k, pill(15, 11, 3, 2, lab, false));
{
  const img = circle(11, [P.edge, P.line], '#2a1f55');
  const cap = circle(7, [P.edge], '#6a58b0'); img.over(cap, 2, 2); [[4, 3], [5, 3], [3, 4]].forEach(([x, y]) => img.set(x, y, hex(P.bright))); add('padStick', img);
}
{
  const img = new Img(11, 11); const ring = (r, col, step) => { for (let a = 0; a < 360; a += step) img.set(Math.round(5 + Math.cos(a * Math.PI / 180) * r), Math.round(5 + Math.sin(a * Math.PI / 180) * r), hex(col)); };
  ring(5, P.line, 12); ring(3.2, P.bright, 12);
  grid(['.#.', '###', '.#.'], { '#': hex(P.text) }, img, 4, 4); img.set(5, 5, hex(P.gold)); add('touchTap', img);
}

// ---- atlas packing
function packAtlas() {
  const items = Object.entries(sprites).map(([name, s]) => ({ name, s })).sort((a, b) => b.s.img.h - a.s.img.h || a.name.localeCompare(b.name));
  const W = 256; let x = 1, y = 1, rowH = 0;
  for (const it of items) { const { w, h } = it.s.img; if (x + w + 1 > W) { x = 1; y += rowH + 1; rowH = 0; } it.x = x; it.y = y; x += w + 1; rowH = Math.max(rowH, h); }
  const H = y + rowH + 1; const atlas = new Img(W, H);
  for (const it of items) atlas.blit(it.s.img, it.x, it.y);
  const frames = {}, spr = {};
  for (const it of items) {
    const e = { x: it.x, y: it.y, w: it.s.img.w, h: it.s.img.h };
    if (it.s.slice) { e.slice = it.s.slice; if (it.s.pad !== undefined) e.pad = it.s.pad; frames[it.name] = e; } else spr[it.name] = e;
  }
  return { src: dataURI(atlas), w: W, h: H, frames, sprites: spr };
}

// ------------------------------------------------------------------ emit
const fs_ = buildFont(SRC.small), fb_ = buildFont(SRC.body);
const strip = (f) => ({ h: f.h, lineH: f.lineH, base: f.base, spaceAdv: f.spaceAdv, glyphs: f.glyphs, src: f.src });
const atlas = packAtlas();
const sortKeys = (o) => o;
const j = (o) => JSON.stringify(o);
const glyphLines = (f) => '{\n' + Object.keys(f.glyphs).map((k) => '      ' + j(k) + ': ' + j(f.glyphs[k])).join(',\n') + '\n    }';
const fontBlock = (name, f, label) => `FONT_ART.${name} = {\n  name: ${j(label)}, h: ${f.h}, lineH: ${f.lineH}, base: ${f.base}, spaceAdv: ${f.spaceAdv},\n  glyphs: ${glyphLines(f).replace(/\n    /g, '\n  ')},\n  src: ${j(f.src)}\n};\n`;
const out = `// GENERATED by tools/ui/build-ui.js from tools/ui/font-src.js -- do not edit by hand. Re-run: node tools/ui/build-ui.js
// Dream Glass UI art (see docs/HUD.md). Classic script: defines globals FONT_ART and UI_ART. Everything is 1x pixel size; the UI scales x2.
//
// FONT_ART.small / FONT_ART.body  (white glyphs on transparent, tint them at runtime)
//   { name, h, lineH, base, spaceAdv, glyphs:{ ch:{x,y,w,adv} }, src:'data:image/png;base64,...' }
//   * h      = cell height of every glyph in the sheet (glyph rect is always w x h; vertical placement is baked in)
//   * base   = rows above the baseline: capitals occupy rows 0..base-1; small: caps 6 tall, x-height 4, descender row 6;
//              body: caps 7 tall, x-height 5, descenders rows 7-8.   Baseline y of a line = top + base.
//   * lineH  = recommended line pitch (small 9, body 11)
//   * adv    = advance to the next glyph INCLUDING the 1 px letter spacing (adv = w + 1); space has w = 0, adv = spaceAdv.
//   draw glyph:  ctx.drawImage(img, g.x, g.y, g.w, f.h, X, Y, g.w * s, f.h * s); X += g.adv * s   (skip when g.w === 0)
// FONT_ART.fold: unsupported char -> replacement (uppercase accents -> plain capital, typographic quotes/dashes). Unknown chars: use '?'.
// UI_ART: one atlas  { src, w, h, frames:{name:{x,y,w,h,slice:[l,t,r,b],pad}}, sprites:{name:{x,y,w,h}} }
//   frames are 9-slice sources (corners l,t,r,b px are never scaled; edges and centre stretch); pad = suggested content inset (src px).
var FONT_ART = {};
${fontBlock('small', fs_, 'DreamSmall')}${fontBlock('body', fb_, 'DreamBody')}FONT_ART.fold = ${j(SRC.fold)};
FONT_ART.charset = ${j(Object.keys(fs_.glyphs).join(''))};

var UI_ART = {
  palette: ${j(P)},
  src: ${j(atlas.src)},
  w: ${atlas.w}, h: ${atlas.h},
  frames: {
${Object.keys(atlas.frames).map((k) => '    ' + j(k) + ': ' + j(atlas.frames[k])).join(',\n')}
  },
  sprites: {
${Object.keys(atlas.sprites).map((k) => '    ' + j(k) + ': ' + j(atlas.sprites[k])).join(',\n')}
  }
};
`;
fs.writeFileSync(path.join(__dirname, '..', '..', 'js', 'font.js'), out);
console.log('js/font.js', (out.length / 1024).toFixed(1) + ' KB; atlas', atlas.w + 'x' + atlas.h, 'glyphs', Object.keys(fs_.glyphs).length, Object.keys(fb_.glyphs).length);
