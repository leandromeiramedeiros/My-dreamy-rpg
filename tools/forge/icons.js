'use strict';
// ICONS: the 24x24 inventory icons of the weapon / shield / companion lines, drawn by the forge from the same models as the hero's gear
// (no hand-drawn pixels). Each piece is rendered ALONE (the body layers removed) at a fixed 3/4 view, idle frame 0; the weapon / offhand /
// spine bones are scaled so the piece fills a 22 px box (a wand and a halberd both fill the slot), then cropped and centred in 24x24.
//   node tools/forge/icons.js            -> rewrites the block between "FORGE-ICONS:BEGIN" and "FORGE-ICONS:END" in js/icons.js
//                                           and writes out/icons-board.png (every line x tier, 4x) to look at
//   node tools/forge/icons.js --dry      board only, js/icons.js untouched
// Data format (js/icons.js FORGE_ICONS): 'piece id': 'RRGGBB' x n palette + '|' + run-length rows of 576 cells, row-major:
//   a palette letter (A..Z, a..z = colour 0..51) or '.' (clear), then the run length when it is > 1.
const fs = require('fs');
const path = require('path');
const FORGE = require('./forge.js');
const { png } = require('./png.js');
const model = require('./models/chibi.js'), gear = require('./models/chibi-gear.js');

const LINES = ['sword', 'rapier', 'mace', 'axe', 'hammer', 'halberd', 'bow', 'crossbow', 'chakram', 'staff', 'wand', 'orb', 'daggers', 'claws', 'fans',
  'buckler', 'heater', 'tower', 'grimoire', 'quiver', 'warhorn'];
const VIEW = Object.assign({ quiver: 'NE', crossbow: 'SE', claws: 'SE', fans: 'SE', daggers: 'SE', warhorn: 'SE' }, JSON.parse(process.env.ICON_VIEW || '{}')), DEFAULT_VIEW = process.env.ICON_DEFAULT || 'S', N = 24, FIT = 22, TILT = 40 * Math.PI / 180;
const NOTILT = ['grimoire', 'quiver', 'warhorn', 'buckler', 'heater', 'tower'];
const SCALED = ['weapon', 'offhand', 'spine'];
const iconModel = Object.assign({}, model, { layers: [], frame: [160, 160], origin: [80, 112] });

const roll = (v, a) => [v[0] * Math.cos(a) + v[1] * Math.sin(a), -v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];     // turn an aim about the view axis (at yaw 0 the camera looks along -z)
function renderAt(piece, k, dir, tilt) {
  const wrapped = Object.assign({}, piece, { pose: (a, f) => {
    const q = piece.pose ? piece.pose(a, f) || {} : {}, o = Object.assign({}, q);
    if (tilt) { if (q.weapon && q.weapon.aim) o.weapon = Object.assign({}, q.weapon, { aim: roll(q.weapon.aim, tilt) }); if (q.offhand && q.offhand.aim) o.offhand = Object.assign({}, q.offhand, { aim: roll(q.offhand.aim, -tilt) }); }
    for (const b of SCALED) o[b] = Object.assign({}, q[b] || {}, { scl: [k, k, k] });
    return o;
  } });
  const r = FORGE.render(iconModel, { dir, anim: 'idle', frame: 0, pieces: [wrapped] });
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.rgba[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { r, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function iconOf(id) {
  const piece = gear.pieces[id], dir = VIEW[piece.family] || DEFAULT_VIEW;
  let a = renderAt(piece, 1, dir), tilt = 0;
  if (a.h / a.w > 1.8 && !NOTILT.includes(piece.family)) { tilt = TILT; a = renderAt(piece, 1, dir, tilt); }
  let k = Math.max(0.3, Math.min(4.5, FIT / Math.max(a.w, a.h)));
  for (let i = 0; i < 6; i++) { a = renderAt(piece, k, dir, tilt); if (Math.max(a.w, a.h) <= FIT || k <= 0.3) break; k *= FIT / Math.max(a.w, a.h) * 0.97; }
  if (Math.max(a.w, a.h) > N) throw new Error(id + ': icon does not fit (' + a.w + 'x' + a.h + ')');
  const ox = ((N - a.w) >> 1) - a.x0, oy = ((N - a.h) >> 1) - a.y0, cells = new Array(N * N).fill(null);
  for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) {
    const i = (y * a.r.w + x) * 4; if (!a.r.rgba[i + 3]) continue;
    cells[(y + oy) * N + x + ox] = [a.r.rgba[i], a.r.rgba[i + 1], a.r.rgba[i + 2]];
  }
  return { cells, k, w: a.w, h: a.h };
}
const hex = c => c.map(v => v.toString(16).padStart(2, '0')).join('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function encode(cells) {
  const pal = [], idx = new Map();
  for (const c of cells) if (c) { const h = hex(c); if (!idx.has(h)) { idx.set(h, pal.length); pal.push(h); } }
  if (pal.length > LETTERS.length) throw new Error('too many colours: ' + pal.length);
  let s = '', i = 0;
  while (i < cells.length) {
    const key = cells[i] ? LETTERS[idx.get(hex(cells[i]))] : '.'; let j = i + 1;
    while (j < cells.length && (cells[j] ? LETTERS[idx.get(hex(cells[j]))] : '.') === key) j++;
    s += key + (j - i > 1 ? j - i : ''); i = j;
  }
  return pal.join('') + '|' + s;
}

const ids = []; for (const l of LINES) for (let t = 1; t <= 6; t++) { const id = `${l}.t${t}`; if (!gear.pieces[id]) throw new Error('no piece ' + id); ids.push(id); }
const data = {}, imgs = {};
for (const id of ids) { const ic = iconOf(id); data[id] = encode(ic.cells); imgs[id] = ic; }

// board: one row per line, 6 tiers, 4x on a dark panel
const Z = 4, CW = N * Z + 6, W = 6 * CW + 6, H = LINES.length * CW + 6, img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = 0x2a; img[i * 4 + 1] = 0x45; img[i * 4 + 2] = 0x22; img[i * 4 + 3] = 255; }
LINES.forEach((l, r) => { for (let t = 1; t <= 6; t++) {
  const ic = imgs[`${l}.t${t}`], bx = 6 + (t - 1) * CW, by = 6 + r * CW;
  for (let y = 0; y < N * Z; y++) for (let x = 0; x < N * Z; x++) { const c = ic.cells[((y / Z) | 0) * N + ((x / Z) | 0)], o = ((by + y) * W + bx + x) * 4; const bg = (((x / Z) | 0) + ((y / Z) | 0)) & 1 ? 0x30 : 0x34; img[o] = c ? c[0] : bg; img[o + 1] = c ? c[1] : bg + 0x18; img[o + 2] = c ? c[2] : bg - 0x10; }
} });
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'icons-board.png'), png(W, H, img));
const bytes = ids.reduce((n, id) => n + data[id].length, 0);
console.log(`icons: ${ids.length} (${LINES.length} lines x 6) | ${(bytes / 1024).toFixed(1)} KB of data | scales ${Math.min(...ids.map(i => imgs[i].k)).toFixed(2)}..${Math.max(...ids.map(i => imgs[i].k)).toFixed(2)} | out/icons-board.png`);

if (!process.argv.includes('--dry')) {
  const file = path.join(__dirname, '..', '..', 'js', 'icons.js'); let src = fs.readFileSync(file, 'utf8');
  const B = '// FORGE-ICONS:BEGIN', E = '// FORGE-ICONS:END', a = src.indexOf(B), b = src.indexOf(E);
  if (a < 0 || b < 0) throw new Error('js/icons.js has no FORGE-ICONS markers');
  const body = B + ' (generated by tools/forge/icons.js: do not edit)\n  const FORGE_ICONS = {\n' + ids.map(id => `    '${id}': '${data[id]}',`).join('\n') + '\n  };\n  ';
  src = src.slice(0, a) + body + src.slice(b); fs.writeFileSync(file, src);
  console.log('wrote js/icons.js');
}
