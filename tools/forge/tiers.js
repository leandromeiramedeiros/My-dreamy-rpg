'use strict';
// TIERS: strips + checks for the M4a gear lines in tools/forge/models/gear/*.js (ref rig).
//   node tools/forge/tiers.js [line..] [--check] [--anim idle --frame 0]
//     -> out/tiers-<line>.png   6 tiers (T1..T5, Mythic) x 8 directions, 4x, one frame (default idle 0), on the bare base
//     -> out/loadout-mix.png    6 mixed loadouts x 8 directions on the bare base (written when every line is built)
//   --check: per piece baked size (<= 30 KB; chest armour <= 64 KB, the ref armour itself is 51), tones per material (<= 5), colours per piece (<= 24), lone pixels added over the
//   bare base on every sheet frame, determinism (two bakes, same sha256) and runtime compose == offline render, byte for byte.
// A line file exports { line, pieces: { id: piece }, tiers: [[ids of tier 1], ... x6] }. Warden = chest + head + boots per tier.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FORGE = require('./forge.js');
const { png, unpng } = require('./png.js');
const model = require('./models/ref.js');

const OUT = path.join(__dirname, 'out'), LINES = ['sword', 'buckler', 'staff', 'grimoire', 'warden'];
const args = process.argv.slice(2), flag = n => args.includes('--' + n), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const want = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--') && ['anim', 'frame', 'zoom', 'out', 'crop'].includes(args[i - 1].slice(2))));
const lines = want.length ? want : LINES, ANIM = opt('anim', 'idle'), FRAME = +opt('frame', 0);
const CROP = opt('crop', '0,0,48,48').split(',').map(Number), [FW, FH] = [CROP[2] - CROP[0], CROP[3] - CROP[1]], FRM = model.frame, ZOOM = +opt('zoom', 4), DIRS = model.dirs.map(d => d[0]);
fs.mkdirSync(OUT, { recursive: true });

const gear = {};
for (const l of LINES) { const f = path.join(__dirname, 'models', 'gear', l + '.js'); if (fs.existsSync(f)) gear[l] = require(f); }
const allPieces = Object.assign({}, ...Object.values(gear).map(g => g.pieces));
const P = ids => ids.map(id => { if (!allPieces[id]) throw new Error('no piece ' + id); return allPieces[id]; });

// ---- tiny pixel font + image helpers (same glyphs as board.js)
const GLYPH = { A: '25755', B: '65656', C: '74447', D: '65556', E: '74747', F: '74744', G: '74557', H: '55755', I: '72227', K: '55655', L: '44447',
  M: '57755', N: '65555', O: '75557', P: '75744', R: '75765', S: '74717', T: '72222', U: '55557', W: '55775', X: '55255', Y: '55222', '0': '75557',
  '1': '26222', '2': '71747', '3': '71717', '4': '55711', '5': '74717', '6': '74757', '7': '71111', '8': '75757', '9': '75717', '.': '00002', ':': '02020', '-': '00700', '+': '02720', ' ': '00000' };
function setPx(img, W, x, y, c) { const i = (y * W + x) * 4; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = 255; }
function fill(img, W, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(img, W, x, y, c); }
function text(img, W, x0, y0, s, c, k = 2) {
  for (const ch of s.toUpperCase()) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let r = 0; r < 5; r++) { const bits = parseInt(g[r], 16); for (let col = 0; col < 3; col++) if (bits & (4 >> col)) fill(img, W, x0 + col * k, y0 + r * k, k, k, c); }
    x0 += 4 * k;
  }
}
function blitZ(img, W, x0, y0, fr, z, bg) {                        // frame over an opaque background at zoom z
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = ((y + CROP[1]) * FRM[0] + x + CROP[0]) * 4, a = fr[i + 3] / 255; if (!a) continue;
    const c = [0, 1, 2].map(k => fr[i + k] * a + bg[k] * (1 - a));
    fill(img, W, x0 + x * z, y0 + y * z, z, z, c);
  }
}
const BG = [0x3b, 0x5f, 0x44], PANEL = [0x2a, 0x45, 0x22], INK = [0xe5, 0xe0, 0xac], TIERL = ['T1', 'T2', 'T3', 'T4', 'T5', 'M'];
function strip(rows, file, labels) {                                // rows: [[ids...] x 6], one row per tier, 8 dirs per row
  const LW = 40, GAP = 2, cw = FW * ZOOM, W = LW + 8 * (cw + GAP), H = 16 + rows.length * (FH * ZOOM + GAP), img = new Uint8ClampedArray(W * H * 4);
  fill(img, W, 0, 0, W, H, PANEL);
  DIRS.forEach((d, c) => text(img, W, LW + c * (cw + GAP) + 4, 4, d, INK));
  rows.forEach((ids, r) => {
    const y0 = 16 + r * (FH * ZOOM + GAP); text(img, W, 4, y0 + 4, labels[r], INK);
    DIRS.forEach((d, c) => {
      const x0 = LW + c * (cw + GAP); fill(img, W, x0, y0, cw, FH * ZOOM, BG);
      blitZ(img, W, x0, y0, FORGE.render(model, { dir: d, anim: ANIM, frame: FRAME, pieces: P(ids) }).rgba, ZOOM, BG);
    });
  });
  fs.writeFileSync(file, png(W, H, img)); return file;
}

// ---- loadout mix: 6 mixed loadouts, 8 dirs, on the bare base
const MIX = [
  ['A  T1 SWORD T3 BUCKLER T5 WARDEN', ['sword.t1', 'buckler.t3', 'warden.t5', 'knighthelm.t5', 'knightgreaves.t5']],
  ['B  T2 STAFF T1 GRIMOIRE T2 WARDEN', ['staff.t2', 'grimoire.t1', 'warden.t2', 'knighthelm.t2', 'knightgreaves.t2']],
  ['C  T3 SWORD T2 BUCKLER T3 WARDEN T2 GRIM', ['sword.t3', 'buckler.t2', 'grimoire.t2', 'warden.t3', 'knighthelm.t3', 'knightgreaves.t3']],
  ['D  T4 STAFF T4 GRIMOIRE T4 WARDEN', ['staff.t4', 'grimoire.t4', 'warden.t4', 'knighthelm.t4', 'knightgreaves.t4']],
  ['E  T5 SWORD T5 BUCKLER T1 WARDEN', ['sword.t5', 'buckler.t5', 'warden.t1', 'knighthelm.t1', 'knightgreaves.t1']],
  ['F  MYTHIC ALL', ['sword.t6', 'buckler.t6', 'grimoire.t6', 'warden.t6', 'knighthelm.t6', 'knightgreaves.t6']],
];
function mix() {
  if (LINES.some(l => !gear[l])) { console.log('loadout-mix: skipped (not every line exists yet)'); return; }
  const LW = 40, GAP = 2, cw = FW * ZOOM, W = LW + 8 * (cw + GAP), H = 16 + MIX.length * (FH * ZOOM + GAP + 12), img = new Uint8ClampedArray(W * H * 4);
  fill(img, W, 0, 0, W, H, PANEL);
  DIRS.forEach((d, c) => text(img, W, LW + c * (cw + GAP) + 4, 4, d, INK));
  MIX.forEach(([label, ids], r) => {
    const y0 = 16 + r * (FH * ZOOM + GAP + 12); text(img, W, 4, y0 + 2, label, INK, 1);
    DIRS.forEach((d, c) => {
      const x0 = LW + c * (cw + GAP), y1 = y0 + 12; fill(img, W, x0, y1, cw, FH * ZOOM, BG);
      blitZ(img, W, x0, y1, FORGE.render(model, { dir: d, anim: ANIM, frame: FRAME, pieces: P(ids) }).rgba, ZOOM, BG);
    });
  });
  const f = path.join(OUT, 'loadout-mix.png'); fs.writeFileSync(f, png(W, H, img)); console.log('wrote ' + f);
}

// ---- checks
const key = (a, i) => (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
function lone(sh) {                                                  // opaque pixels with no 4-neighbour of the same colour
  let n = 0;
  for (let y = 0; y < sh.h; y++) for (let x = 0; x < sh.w; x++) {
    const i = (y * sh.w + x) * 4; if (sh.rgba[i + 3] < 255) continue;
    const k = key(sh.rgba, i); let same = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= sh.w || yy >= sh.h) continue;
      const j = (yy * sh.w + xx) * 4; if (sh.rgba[j + 3] === 255 && key(sh.rgba, j) === k) { same = true; break; }
    }
    if (!same) n++;
  }
  return n;
}
const colourSet = sh => { const s = new Set(); for (let i = 0; i < sh.rgba.length; i += 4) if (sh.rgba[i + 3] === 255) s.add(key(sh.rgba, i)); return s; };
function matTones(piece) {                                           // most distinct ramp entries of any material
  let worst = 0, name = '';
  for (const L of piece.layers) for (const k in L.mats || {}) {
    const m = L.mats[k], r = typeof m === 'string' ? FORGE.ramp(m) : Array.isArray(m) ? m : typeof m.ramp === 'string' ? FORGE.ramp(m.ramp) : m.ramp;
    const n = new Set(m.flat != null ? [r[m.flat]] : r).size; if (n > worst) { worst = n; name = k; }
  }
  return [worst, name];
}
let baseSheet = null;
function check(ids) {
  const base = baseSheet || (baseSheet = FORGE.sheet(model, { pieces: [] })), baseLone = lone(base), baseCols = colourSet(base);
  const bank = { model: FORGE.bankInfo(model), sheets: {} };
  for (const id of ['body', ...ids]) {
    const piece = id === 'body' ? null : allPieces[id], b = FORGE.bake(model, piece ? { piece } : {}), buf = png(b.w, b.h, b.rgba);
    if (piece) {
      const sha = crypto.createHash('sha256').update(buf).digest('hex'), b2 = FORGE.bake(model, { piece }), sha2 = crypto.createHash('sha256').update(png(b2.w, b2.h, b2.rgba)).digest('hex');
      piece._kb = buf.length / 1024; piece._sha = sha.slice(0, 12); piece._det = sha === sha2;
    }
    const back = unpng(buf); bank.sheets[id] = { w: back.w, rgba: back.rgba, meta: b.meta };
  }
  const sh = FORGE.sheet(model, { pieces: P(ids) }), cols = colourSet(sh); let added = 0; for (const c of cols) if (!baseCols.has(c)) added++;
  const lo = lone(sh);
  let frames = 0, bad = 0; const [fw, fh] = sh.frame;
  model.dirs.forEach(([dn], r) => sh.layout.forEach(([a, f], c) => {
    const out = FORGE.compose(bank, { dir: dn, anim: a, frame: f, pieces: ids });
    for (let y = 0; y < fh; y++) {
      const off = ((r * fh + y) * sh.w + c * fw) * 4;
      if (Buffer.compare(Buffer.from(out.rgba.buffer, out.rgba.byteOffset + y * fw * 4, fw * 4), Buffer.from(sh.rgba.buffer, off, fw * 4))) { bad++; break; }
    }
    frames++;
  }));
  return { lone: lo, baseLone, added, bad, frames };
}
// the palette-lint rules (tools/palette-lint.js reads only models/*.js, not models/gear/): 4 tones + optional glint, CIE L* strictly
// rising, darkest tone dL >= 8 from the outline colour #0c0714; flat ramps (one colour) are emissive and skipped
const lstar = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
function paletteLint() {
  const seen = new Map(), add = (src, r) => { if (Array.isArray(r) && r.length > 1 && typeof r[0] === 'string') seen.set(r.join(), src); };
  const walk = (src, o) => { if (Array.isArray(o)) { add(src, o); o.forEach(x => walk(src, x)); } else if (o && typeof o === 'object') for (const k in o) walk(src, o[k]); };
  walk('PAL', require('./models/gear/common.js').PAL);
  for (const id in allPieces) for (const L of allPieces[id].layers) for (const k in L.mats || {}) { const m = L.mats[k]; add(`${id}.${k}`, Array.isArray(m) ? m : m.ramp); }
  let n = 0, bad = 0; const dark = lstar('#0c0714');
  for (const [key, src] of seen) {
    const c = key.split(','); if (!c.every(h => /^#[0-9a-f]{6}$/i.test(h)) || c.every(h => h === c[0])) continue; n++;
    const L = c.map(lstar), why = [];
    if (c.length !== 4 && c.length !== 5) why.push(c.length + ' colours');
    for (let i = 1; i < L.length; i++) if (!(L[i] > L[i - 1])) { why.push(`L* not rising at ${i + 1}`); break; }
    if (L[0] - dark < 8) why.push(`darkest dL ${(L[0] - dark).toFixed(1)} < 8`);
    if (why.length) { bad++; console.log(`palette FAIL ${src} [${key}] ${why.join('; ')}`); }
  }
  console.log(`palette-lint rules over ${n} gear ramps: ${bad ? bad + ' FAIL' : 'PASS'}`); if (bad) process.exitCode = 1;
}
if (flag('check')) {
  let fail = 0; paletteLint();
  for (const l of lines) {
    if (!gear[l]) { console.log(`${l}: not built yet`); continue; }
    for (let t = 0; t < 6; t++) for (const id of gear[l].tiers[t]) {
      const piece = allPieces[id], ids = [id], r = check(ids), [tn, tm] = matTones(piece);
      const cap = piece.slot === 'chest' ? 64 : 30, ok = piece._kb <= cap && tn <= 5 && r.added <= 24 && r.lone <= r.baseLone && !r.bad && piece._det;
      if (!ok) fail++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(16)} ${piece._kb.toFixed(1).padStart(5)} KB | tones<=${tn} (${tm}) | +${r.added} colours | lone ${r.lone} (base ${r.baseLone}) | det ${piece._det} sha ${piece._sha} | compose ${r.frames - r.bad}/${r.frames}`);
    }
  }
  if (fail) process.exitCode = 1;
} else {
  for (const l of lines) {
    if (!gear[l]) { console.log(`${l}: not built yet`); continue; }
    const g = gear[l];
    console.log('wrote ' + strip(g.tiers, path.join(OUT, opt('out', `tiers-${l}.png`)), TIERL));
  }
  if (!want.length) mix();
}
