'use strict';
// Pure-Node PNG previews of generated maps (no deps).  Usage: node tools/maps/preview.js [ids...]
// Writes tools/shots/maps/<id>.png (top-down grid view) and <id>_iso.png (45deg "screen" view like the game).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// 3x5 font
const FONT = {};
'A:.#.|#.#|###|#.#|#.#;B:##.|#.#|##.|#.#|##.;C:.##|#..|#..|#..|.##;D:##.|#.#|#.#|#.#|##.;E:###|#..|##.|#..|###;F:###|#..|##.|#..|#..;G:.##|#..|#.#|#.#|.##;H:#.#|#.#|###|#.#|#.#;I:###|.#.|.#.|.#.|###;J:..#|..#|..#|#.#|.#.;K:#.#|#.#|##.|#.#|#.#;L:#..|#..|#..|#..|###;M:#.#|###|###|#.#|#.#;N:##.|#.#|#.#|#.#|#.#;O:.#.|#.#|#.#|#.#|.#.;P:##.|#.#|##.|#..|#..;Q:.#.|#.#|#.#|##.|.##;R:##.|#.#|##.|#.#|#.#;S:.##|#..|.#.|..#|##.;T:###|.#.|.#.|.#.|.#.;U:#.#|#.#|#.#|#.#|###;V:#.#|#.#|#.#|#.#|.#.;W:#.#|#.#|###|###|#.#;X:#.#|#.#|.#.|#.#|#.#;Y:#.#|#.#|.#.|.#.|.#.;Z:###|..#|.#.|#..|###;0:###|#.#|#.#|#.#|###;1:.#.|##.|.#.|.#.|###;2:##.|..#|.#.|#..|###;3:##.|..#|.#.|..#|##.;4:#.#|#.#|###|..#|..#;5:###|#..|##.|..#|##.;6:.##|#..|###|#.#|###;7:###|..#|.#.|.#.|.#.;8:###|#.#|###|#.#|###;9:###|#.#|###|..#|##.;-:...|...|###|...|...;_:...|...|...|...|###;.:...|...|...|...|.#.;::...|.#.|...|.#.|...;/:..#|..#|.#.|#..|#..;(:.#.|#..|#..|#..|.#.;):.#.|..#|..#|..#|.#.;+:...|.#.|###|.#.|...;=:...|###|...|###|...;x:...|#.#|.#.|#.#|...; :...|...|...|...|...'.split(';').forEach(s => { FONT[s[0]] = s.slice(2).split('|'); });

class Img {
  constructor(w, h, bg) { this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 3); for (let i = 0; i < w * h; i++) { this.d[i * 3] = bg[0]; this.d[i * 3 + 1] = bg[1]; this.d[i * 3 + 2] = bg[2]; } }
  px(x, y, c, a = 1) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 3; for (let k = 0; k < 3; k++) this.d[i + k] = a >= 1 ? c[k] : this.d[i + k] * (1 - a) + c[k] * a; }
  rect(x, y, w, h, c, a) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a); }
  disc(cx, cy, r, c, a) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 0.5) this.px(cx + i, cy + j, c, a); }
  ring(cx, cy, r, c) { const n = Math.max(24, r * 6); for (let k = 0; k < n; k++) this.px(cx + Math.cos(k / n * 6.283) * r, cy + Math.sin(k / n * 6.283) * r, c); }
  text(s, x, y, c, sc = 2, shadow = true) {
    s = String(s).toUpperCase();
    for (const pass of shadow ? [1, 0] : [0]) {
      let cx = x;
      for (const ch of s) { const g = FONT[ch] || FONT[' ']; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '#') this.rect(cx + i * sc + pass, y + j * sc + pass, sc, sc, pass ? [0, 0, 0] : c); cx += 4 * sc; }
    }
  }
}

const COL = {
  '.': [18, 16, 30], g: [74, 120, 58], f: [112, 150, 78], d: [40, 72, 52], p: [170, 130, 84], s: [190, 190, 200], w: [48, 104, 176],
  b: [140, 96, 52], x: [128, 130, 146], r: [150, 100, 220], c: [60, 56, 76],
};
const OBJC = {
  pine_giant: [10, 50, 30], pine: [20, 80, 44], pine_young: [60, 120, 70], tree_round: [20, 90, 40], tree_poplar: [30, 100, 50], tree_teal: [20, 110, 100], tree_blossom: [220, 130, 170], tree_dead: [90, 70, 60],
  rock: [150, 150, 160], rock_dark: [90, 90, 110], log: [110, 70, 40], stump: [130, 90, 50], bush: [50, 130, 60],
  mushroom_red: [230, 60, 60], mushroom: [80, 200, 255], moss: [90, 150, 70], lantern: [255, 200, 90], lantern_blue: [120, 220, 255],
  crystal: [120, 220, 255], crystal_violet: [200, 120, 255], sign: [255, 255, 255], shrine: [60, 255, 240], brazier: [255, 120, 60], sunbeam: [255, 240, 150],
  fox: [255, 140, 20], rabbit: [255, 220, 200], house: [200, 80, 80], grass: null,
};

function shade(c, h) { const k = 0.78 + h * 0.065; return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)]; }

function tileColor(m, x, y) {
  const t = m.tiles[y][x]; if (t === '.') return COL['.'];
  const h = parseInt(m.heights[y][x], 36) || 0;
  let c = shade(COL[t] || [255, 0, 255], h);
  // cliff edge: darken where a neighbour (+x or +y; front faces in-game) is >=2 lower
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const nx = x + dx, ny = y + dy; if (nx >= m.W || ny >= m.H) continue;
    if (m.tiles[ny][nx] !== '.' && h - (parseInt(m.heights[ny][nx], 36) || 0) >= 2) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
  }
  return c;
}

function render(id, m, meta, outDir) {
  const T = Math.max(10, Math.round(640 / Math.max(m.W, m.H))), W = m.W * T, H = m.H * T, top = 26;
  const im = new Img(W + 150, H + top, [10, 9, 18]);
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) im.rect(x * T, top + y * T, T, T, tileColor(m, x, y));
  // cliff lines (stronger) between tiles with |dh|>=2
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    if (m.tiles[y][x] === '.') continue; const h = parseInt(m.heights[y][x], 36) || 0;
    if (x + 1 < m.W && m.tiles[y][x + 1] !== '.' && Math.abs(h - (parseInt(m.heights[y][x + 1], 36) || 0)) >= 2) im.rect((x + 1) * T - 1, top + y * T, 2, T, [0, 0, 0]);
    if (y + 1 < m.H && m.tiles[y + 1][x] !== '.' && Math.abs(h - (parseInt(m.heights[y + 1][x], 36) || 0)) >= 2) im.rect(x * T, top + (y + 1) * T - 1, T, 2, [0, 0, 0]);
  }
  for (const o of m.objects) {
    const c = OBJC[o.t]; const role = o.role || (o.marker && o.t);
    if (role && ['chest', 'chest_silver', 'chest_gold', 'rune_cache', 'gem_cache'].includes(role)) { im.rect(Math.round(o.x * T) - 3, top + Math.round(o.y * T) - 3, 7, 7, [255, 200, 0]); im.rect(Math.round(o.x * T) - 2, top + Math.round(o.y * T) - 2, 5, 5, [120, 70, 0]); continue; }
    if (role === 'tablet') { im.rect(Math.round(o.x * T) - 2, top + Math.round(o.y * T) - 3, 5, 7, [255, 255, 255]); continue; }
    if (!c) continue;
    const rr = o.t === 'pine_giant' ? 3 : o.t === 'pine' || o.t.startsWith('tree') ? 2 : 1;
    im.disc(Math.round(o.x * T), top + Math.round(o.y * T), rr, c, o.t === 'sunbeam' ? 0.5 : 0.9);
  }
  for (const tr of m.triggers) if (tr.when.type === 'enter_area') { im.ring(Math.round(tr.when.x * T), top + Math.round(tr.when.y * T), Math.round(tr.when.r * T), [255, 70, 70]); }
  for (const tr of m.triggers) for (const a of tr.actions) if (a.type === 'spawn' && a.x != null) im.disc(Math.round(a.x * T), top + Math.round(a.y * T), 2, a.enemy === 'troll' ? [255, 0, 0] : [255, 120, 0]);
  for (const p of m.portals) { im.ring(Math.round(p.x * T), top + Math.round(p.y * T), 7, [255, 60, 255]); im.ring(Math.round(p.x * T), top + Math.round(p.y * T), 5, [255, 60, 255]); im.text(p.to, Math.round(p.x * T) + 9, top + Math.round(p.y * T) - 3, [255, 150, 255], 1); }
  im.disc(Math.round(m.start.x * T), top + Math.round(m.start.y * T), 4, [255, 255, 0]); im.text('START', Math.round(m.start.x * T) + 6, top + Math.round(m.start.y * T) - 3, [255, 255, 0], 1);
  // path centerlines
  if (meta && meta.paths) for (const p of meta.paths) { const col = p.kind === 'main' ? [255, 255, 255] : p.kind === 'secret' ? [255, 0, 200] : [120, 255, 255]; p.pts.forEach((q, i) => { if (i % 3 === 0) im.px(q[0] * T, top + q[1] * T, col); }); }
  if (meta && meta.rooms) for (const r of meta.rooms) { im.ring(Math.round(r.x * T), top + Math.round(r.y * T), Math.round(r.r * T), [255, 255, 255]); im.text(r.label, Math.round(r.x * T) - r.label.length * 2, top + Math.round(r.y * T) - 3, [255, 255, 255], 1); }
  // header + legend
  im.rect(0, 0, im.w, top, [30, 28, 50]);
  im.text(`${id}  ${m.W}X${m.H}  OBJ ${m.objects.length}  TRG ${m.triggers.length}`, 6, 6, [255, 230, 160], 2);
  let ly = top + 6; const lx = W + 8;
  for (const [k, n] of [['g', 'GRASS'], ['f', 'MEADOW'], ['d', 'MOSS'], ['p', 'PATH'], ['s', 'STAIRS'], ['x', 'FLAG'], ['r', 'RUNE'], ['w', 'WATER'], ['b', 'BRIDGE'], ['c', 'PILLAR']]) { im.rect(lx, ly, 10, 10, COL[k]); im.text(n, lx + 14, ly + 1, [220, 220, 230], 1); ly += 14; }
  ly += 4; im.text('HEIGHT SHADE', lx, ly, [200, 200, 220], 1); ly += 10;
  for (let h = 0; h <= 6; h++) { im.rect(lx + h * 18, ly, 16, 8, shade(COL.g, h)); im.text(String(h), lx + h * 18 + 6, ly + 10, [220, 220, 220], 1, false); }
  ly += 26;
  for (const [c, n] of [[[255, 200, 0], 'CHEST/CACHE'], [[255, 255, 255], 'TABLET'], [[60, 255, 240], 'SHRINE'], [[255, 60, 255], 'PORTAL'], [[255, 70, 70], 'TRIGGER AREA'], [[255, 0, 0], 'TROLL SPAWN'], [[255, 120, 0], 'OTHER SPAWN'], [[255, 0, 200], 'SECRET PATH']]) { im.rect(lx, ly, 10, 10, c); im.text(n, lx + 14, ly + 1, [220, 220, 230], 1); ly += 14; }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, id + '.png'), png(im.w, im.h, im.d));

  // ---- iso view: inverse-project each screen pixel to the topmost tile (honours heights) ----
  const Z = 6, S = 2;
  const sw = (m.W + m.H) * 16, sh = (m.W + m.H) * 8 + 48 * 2;
  const iso = new Img(sw, sh + 60, [10, 9, 18]);
  const oy = 12 * Z + 20, ox = m.H * 16;
  // painter: draw tiles back to front (small x+y first)
  const diamond = (cx, cy, c) => { for (let dy = -8; dy < 8; dy++) { const half = Math.round((8 - Math.abs(dy + 0.5)) * 2); for (let dx = -half; dx < half; dx++) iso.px(cx + dx, cy + dy, c); } };
  const order = []; for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) order.push([x, y]);
  order.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  const sx = (x, y) => ox + (x - y) * 16, sy = (x, y, h) => oy + (x + y) * 8 - h * Z;
  for (const [x, y] of order) {
    const t = m.tiles[y][x]; if (t === '.') continue; const h = parseInt(m.heights[y][x], 36) || 0, c = COL[t] || [255, 0, 255];
    const cx = sx(x, y), cy = sy(x, y, h) + 8;
    if (h > 0) { // side faces
      for (let k = 0; k < h * Z; k++) { diamond(cx, cy + k + 1, shade(COL.d, 0)); }
      for (let k = 0; k < h * Z; k++) for (let dx = -16; dx < 0; dx++) iso.px(cx + dx, cy + 4 + Math.round(-dx / 2) + k, [Math.max(0, c[0] * 0.45), c[1] * 0.4, c[2] * 0.4]);
      for (let k = 0; k < h * Z; k++) for (let dx = 0; dx < 16; dx++) iso.px(cx + dx, cy + 4 + Math.round(dx / 2) + k, [c[0] * 0.3, c[1] * 0.3, c[2] * 0.35]);
    }
    diamond(cx, cy, shade(c, h));
  }
  for (const o of m.objects) {
    const col = OBJC[o.t]; const role = o.role;
    const z = (() => { const tx = Math.floor(o.x), ty = Math.floor(o.y); return m.tiles[ty] && m.tiles[ty][tx] !== '.' ? parseInt(m.heights[ty][tx], 36) || 0 : 0; })();
    const X = Math.round(sx(o.x, o.y)), Y = Math.round(sy(o.x, o.y, z)) + 8;
    if (role && /chest|cache/.test(role)) { iso.rect(X - 3, Y - 6, 7, 6, [255, 200, 0]); continue; }
    if (role === 'tablet') { iso.rect(X - 2, Y - 8, 5, 8, [255, 255, 255]); continue; }
    if (!col) continue;
    const ht = { pine_giant: 40, pine: 22, pine_young: 10, tree_round: 16, tree_poplar: 18, tree_teal: 16, tree_blossom: 16, tree_dead: 14 }[o.t] || 4;
    const wd = o.t === 'pine_giant' ? 5 : ht > 8 ? 3 : 2;
    for (let k = 0; k < ht; k++) { const w = Math.max(1, Math.round(wd * (1 - k / ht * (o.t.startsWith('pine') ? 0.9 : 0.4)))); iso.rect(X - w, Y - k, w * 2 + 1, 1, shade(col, k / 8 - 1)); }
  }
  iso.rect(0, 0, iso.w, 18, [30, 28, 50]); iso.text(id + ' ISO VIEW (AS IN GAME)', 6, 4, [255, 230, 160], 2);
  fs.writeFileSync(path.join(outDir, id + '_iso.png'), png(iso.w, iso.h, iso.d));
}

module.exports = { render };

if (require.main === module) {
  const { loadAll } = require('./build.js');
  const outDir = path.join(__dirname, '..', 'shots', 'maps');
  const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const res = loadAll(ids);
  for (const r of res) { render(r.id, r.map, r.meta, outDir); console.log('wrote', path.join(outDir, r.id + '.png')); }
}
