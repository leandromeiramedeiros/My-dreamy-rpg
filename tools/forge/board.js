'use strict';
// BOARD: the M4a approval board. For each of the 8 directions x (idle, walk, attack) the REFERENCE frame (SlyNyrd, from
// tools/forge/ref/crops, made by ref-extract.py, scaled x model.SCALE) next to the FORGE frame: the casual base
// (models/ref.js) with the 'hero' loadout's pieces (models/ref-gear.js) stacked by the RUNTIME path (FORGE.compose over a
// freshly baked bank, PNG round trip included; each frame is also checked byte-equal to FORGE.render), same pose index,
// same 48x48 frame, feet on the same pixel. Below that, the bare base alone (idle, walk) in 8 directions.
//   node tools/forge/board.js [model] [loadout]   -> out/board-<model>.png (2x) + out/board-<model>.gif (animated, 2x)
// Prints per direction x anim: silhouette IoU, exact-colour match on the overlap, the forge frame's lone pixels next to
// the reference's, and the sha256 of both files. A direction without a reference frame gets a "NO REF" cell.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FORGE = require('./forge.js');
const { png, unpng, gif } = require('./png.js');

const name = process.argv[2] || 'ref', lo = process.argv[3] || 'hero';
const model = require(`./models/${name}.js`), gear = require(`./models/${name}-gear.js`);
const pieces = gear.loadouts[lo].map(id => gear.pieces[id]);
// the runtime bank: bare body + every piece of the loadout, baked and decoded exactly as build.js does
const bank = { model: FORGE.bankInfo(model), sheets: {} };
for (const id of ['body', ...gear.loadouts[lo]]) {
  const b = FORGE.bake(model, id === 'body' ? {} : { piece: gear.pieces[id] }), back = unpng(png(b.w, b.h, b.rgba));
  bank.sheets[id] = { w: back.w, rgba: back.rgba, meta: b.meta };
}
let composed = 0, equal = 0;
function stacked(dir, anim, frame, ids) {                         // runtime compose, checked against the offline render
  const out = FORGE.compose(bank, { dir, anim, frame, pieces: ids }).rgba;
  const ref = FORGE.render(model, { dir, anim, frame, pieces: ids.map(id => gear.pieces[id]) }).rgba;
  composed++; if (Buffer.compare(Buffer.from(out.buffer, out.byteOffset, out.length), Buffer.from(ref.buffer, ref.byteOffset, ref.length)) === 0) equal++;
  return out;
}
const REF = path.join(__dirname, 'ref', 'crops'), OUT = path.join(__dirname, 'out');
const ANIMS = ['idle', 'walk', 'attack'], DIRS = model.dirs.map(d => d[0]), [FW, FH] = model.frame;
const BG = [0x4b, 0x7c, 0x3f], INK = [0xe5, 0xe0, 0xac], DIM = [0x2a, 0x45, 0x22], PANEL = [0x3f, 0x6a, 0x35];

// ---- reference crops ------------------------------------------------------------------------------------------------
const seq = fs.existsSync(path.join(REF, 'seq.json')) ? JSON.parse(fs.readFileSync(path.join(REF, 'seq.json'), 'utf8')) : null;
const atlas = {};
function refFrame(anim, dir, f, any) {                            // gear pose f (first-seen order = playback order), or null
  if (!seq || !seq.anims[anim] || !seq.anims[anim][dir]) return null;      // (any: an index past the 6 gear poses, e.g. 6-11 = bare)
  const e = seq.anims[anim][dir]; if (f >= (any ? e.poses : Math.min(6, e.poses))) return null;
  const buf = atlas[anim] || (atlas[anim] = fs.readFileSync(path.join(REF, anim + '.rgba'))), n = FW * FH * 4;
  return scaleRef(new Uint8ClampedArray(buf.subarray((e.first + f) * n, (e.first + f + 1) * n)));
}
// the reference is drawn at 27 px; the rig is that x model.SCALE (32 px, client ruling), so the reference frame is scaled
// by the same factor, nearest neighbour, about the feet anchor (origin column, bottom edge of the origin row)
const S = model.SCALE || 1;
function scaleRef(src) {
  if (S === 1) return src; const o = new Uint8ClampedArray(src.length), [ox, oy] = model.origin;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const sx = Math.floor(ox + (x + 0.5 - ox) / S), sy = Math.floor(oy + 1 + (y + 0.5 - oy - 1) / S);
    if (sx < 0 || sy < 0 || sx >= FW || sy >= FH) continue; o.set(src.subarray((sy * FW + sx) * 4, (sy * FW + sx) * 4 + 4), (y * FW + x) * 4);
  }
  return o;
}
const msOf = anim => { const real = anim === 'attack' ? 'attack:' + (pieces.find(p => p.class) || { class: 'none' }).class : anim; return (model.anims[real] || model.anims[anim]).ms; };

// ---- metrics ----------------------------------------------------------------------------------------------------------
function lone(rgba, w, h) {                                       // build.js lint: no 4-neighbour of the same colour
  let n = 0; const k = i => (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!rgba[i + 3]) continue;
    let same = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = (yy * w + xx) * 4; if (rgba[j + 3] && k(j) === k(i)) { same = true; break; } }
    if (!same) n++;
  }
  return n;
}
function compare(a, b) {                                          // IoU of the silhouettes, exact colour match on the overlap
  let I = 0, U = 0, same = 0;
  for (let i = 0; i < a.length; i += 4) {
    const A = a[i + 3] > 0, B = b[i + 3] > 0; if (A || B) U++;
    if (A && B) { I++; if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) same++; }
  }
  return { iou: U ? I / U : 0, colour: I ? same / I : 0 };
}

// ---- a 3x5 pixel font for the labels --------------------------------------------------------------------------------
const GLYPH = { A: '25755', B: '65656', C: '74447', D: '65556', E: '74747', F: '74744', G: '74557', H: '55755', I: '72227', K: '55655', L: '44447',
  M: '57755', N: '65555', O: '75557', P: '75744', R: '75765', S: '74717', T: '72222', U: '55557', W: '55775', X: '55255', Y: '55222', '0': '75557',
  '1': '26222', '2': '71747', '3': '71717', '4': '55711', '5': '74717', '6': '74757', '7': '71111', '8': '75757', '9': '75717', '%': '41241', '.': '00002',
  ':': '02020', '-': '00700', '/': '11244', ' ': '00000' };
function text(img, W, x0, y0, s, c) {
  for (const ch of s.toUpperCase()) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let r = 0; r < 5; r++) { const bits = parseInt(g[r], 16); for (let col = 0; col < 3; col++) if (bits & (4 >> col)) set(img, W, x0 + col, y0 + r, c); }
    x0 += 4;
  }
}
function set(img, W, x, y, c) { const i = (y * W + x) * 4; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = 255; }
function fill(img, W, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(img, W, x, y, c); }
function blit(img, W, x0, y0, fr) { for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const i = (y * FW + x) * 4; if (fr[i + 3]) set(img, W, x0 + x, y0 + y, [fr[i], fr[i + 1], fr[i + 2]]); } }
function up2(img, W, H) { const o = new Uint8ClampedArray(W * H * 16); for (let y = 0; y < 2 * H; y++) for (let x = 0; x < 2 * W; x++) { const s = ((y >> 1) * W + (x >> 1)) * 4, d = (y * 2 * W + x) * 4; o[d] = img[s]; o[d + 1] = img[s + 1]; o[d + 2] = img[s + 2]; o[d + 3] = 255; } return o; }
const noRef = () => { const f = new Uint8ClampedArray(FW * FH * 4); return f; };

// ---- alignment: feet on the same pixel. Per direction, over the 6 bare-body frames of the anchoring anim (idle for idle +
// attack, walk for walk), the reference's base poses and the forge's bare base: lowest row, and the mean x of the leg
// pixels (the bottom 10 rows; hair spikes and shoulder pads would bias a bbox centre). The forge frame is moved onto the
// reference's anchor (whole pixels).
function bboxOf(rgba) { let x0 = FW, y0 = FH, x1 = -1, y1 = -1; for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (rgba[(y * FW + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
function anchorOf(frames) {
  let cx = 0, by = 0;
  for (const fr of frames) { const b = bboxOf(fr); let sx = 0, n = 0; for (let y = b[3] - 9; y <= b[3]; y++) for (let x = 0; x < FW; x++) if (fr[(y * FW + x) * 4 + 3]) { sx += x; n++; } cx += sx / n / frames.length; by = Math.max(by, b[3]); }
  return [cx, by];
}
const shiftOf = {}, SIX = [0, 1, 2, 3, 4, 5];
function shift(a, d) {
  const an = a === 'walk' ? 'walk' : 'idle', k = an + d; if (shiftOf[k]) return shiftOf[k];
  const e = seq && seq.anims[an] && seq.anims[an][d];
  const R = e && e.poses >= 12 ? anchorOf(SIX.map(f => refFrame(an, d, 6 + f, true))) : model.origin;
  const F = anchorOf(SIX.map(f => FORGE.render(model, { dir: d, anim: an, frame: f, pieces: [] }).rgba));
  return (shiftOf[k] = [Math.round(R[0] - F[0]), R[1] - F[1]]);
}
function moved(rgba, [dx, dy]) {
  if (!dx && !dy) return rgba; const o = new Uint8ClampedArray(rgba.length);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const sx = x - dx, sy = y - dy; if (sx < 0 || sy < 0 || sx >= FW || sy >= FH) continue; o.set(rgba.subarray((sy * FW + sx) * 4, (sy * FW + sx) * 4 + 4), (y * FW + x) * 4); }
  return o;
}

// ---- render everything once ------------------------------------------------------------------------------------------
const t0 = process.hrtime.bigint(), frames = {}, stats = {};
for (const a of ANIMS) {
  frames[a] = {}; stats[a] = {};
  for (const d of DIRS) {
    frames[a][d] = []; const st = { iou: 0, colour: 0, minI: 1, minC: 1, cells: [], lone: 0, refLone: 0, n: 0, refs: 0, shift: shift(a, d) };
    for (let f = 0; f < 6; f++) {
      const fr = moved(stacked(d, a, f, gear.loadouts[lo]), st.shift), rf = refFrame(a, d, f);
      frames[a][d].push({ forge: fr, ref: rf });
      st.lone += lone(fr, FW, FH); st.n++;
      st.cells.push(null);
      if (rf) { const c = compare(rf, fr); st.cells[f] = c; st.iou += c.iou; st.colour += c.colour; st.minI = Math.min(st.minI, c.iou); st.minC = Math.min(st.minC, c.colour); st.refLone += lone(rf, FW, FH); st.refs++; }
    }
    stats[a][d] = st;
  }
}
const BASE = ['idle', 'walk'], bare = {};                         // the bare base alone
for (const a of BASE) { bare[a] = {}; for (const d of DIRS) bare[a][d] = [0, 1, 2, 3, 4, 5].map(f => moved(stacked(d, a, f, []), shift(a, d))); }
const renderMs = Number(process.hrtime.bigint() - t0) / 1e6;

// ---- the static board (1x layout, written at 2x) ------------------------------------------------------------------
const CW = FW * 2 + 2, GAP = 4, LW = 22, TH = 9, RH = FH + 8, SECTION = TH + DIRS.length * RH + 4;
const BSECTION = TH + DIRS.length * (FH + 2) + 4, W = LW + 6 * (CW + GAP), H = 12 + ANIMS.length * SECTION + BASE.length * BSECTION;
const img = new Uint8ClampedArray(W * H * 4); fill(img, W, 0, 0, W, H, DIM);
text(img, W, 2, 3, `${name} / ${lo}: reference x${S} left, forge right. under each: IoU / colour %`, INK);
ANIMS.forEach((a, ai) => {
  const y0 = 12 + ai * SECTION, ms = msOf(a);
  text(img, W, 2, y0 + 2, a, INK);
  for (let f = 0; f < 6; f++) text(img, W, LW + f * (CW + GAP) + 2, y0 + 2, `f${f} ${ms ? ms[f] : ''}`, INK);
  DIRS.forEach((d, di) => {
    const y = y0 + TH + di * RH;
    text(img, W, 2, y + 20, d, INK);
    const s = stats[a][d]; if (s.refs) { text(img, W, 2, y + 28, `${Math.round(100 * s.iou / s.refs)}`, INK); text(img, W, 2, y + 34, `${Math.round(100 * s.colour / s.refs)}`, INK); }
    for (let f = 0; f < 6; f++) {
      const x = LW + f * (CW + GAP), fr = frames[a][d][f];
      fill(img, W, x, y, FW, FH, BG); fill(img, W, x + FW + 2, y, FW, FH, BG);
      if (fr.ref) blit(img, W, x, y, fr.ref); else { fill(img, W, x, y, FW, FH, PANEL); text(img, W, x + 10, y + 21, 'NO REF', INK); }
      blit(img, W, x + FW + 2, y, fr.forge);
      const c = s.cells[f]; if (c) text(img, W, x + 30, y + FH + 1, `${Math.round(100 * c.iou)} / ${Math.round(100 * c.colour)}`, INK);
    }
  });
});
BASE.forEach((a, bi) => {
  const y0 = 12 + ANIMS.length * SECTION + bi * BSECTION;
  text(img, W, 2, y0 + 2, `bare base ${a}: casual clothes, no gear`, INK);
  DIRS.forEach((d, di) => {
    const y = y0 + TH + di * (FH + 2); text(img, W, 2, y + 20, d, INK);
    for (let f = 0; f < 6; f++) { const x = LW + f * (CW + GAP) + FW / 2 + 1; fill(img, W, x, y, FW, FH, BG); blit(img, W, x, y, bare[a][d][f]); }
  });
});
fs.mkdirSync(OUT, { recursive: true });
const boardPng = png(2 * W, 2 * H, up2(img, W, H));
fs.writeFileSync(path.join(OUT, `board-${name}.png`), boardPng);

// ---- the animated board: rows = anims, columns = directions, each cell = reference | forge, 50 ms ticks ---------------
const GW = DIRS.length * (CW + GAP) + LW, GH = 10 + ANIMS.length * (FH + 4);
const cycle = ANIMS.map(a => (msOf(a) || [100]).reduce((p, q) => p + q, 0)), gcdf = (p, q) => q ? gcdf(q, p % q) : p;
const total = cycle.reduce((p, q) => p * q / gcdf(p, q)), TICK = 50, gframes = [];
const frameAt = (a, t) => { const ms = msOf(a) || [100, 100, 100, 100, 100, 100]; let tt = t % ms.reduce((p, q) => p + q, 0); for (let f = 0; f < 6; f++) { if (tt < ms[f]) return f; tt -= ms[f]; } return 5; };
for (let t = 0; t < total; t += TICK) {
  const g = new Uint8ClampedArray(GW * GH * 4); fill(g, GW, 0, 0, GW, GH, DIM);
  DIRS.forEach((d, di) => text(g, GW, LW + di * (CW + GAP) + FW - 4, 2, d, INK));
  ANIMS.forEach((a, ai) => {
    const y = 10 + ai * (FH + 4), f = frameAt(a, t); text(g, GW, 2, y + 20, a.slice(0, 4), INK);
    DIRS.forEach((d, di) => {
      const x = LW + di * (CW + GAP), fr = frames[a][d][f];
      fill(g, GW, x, y, FW, FH, BG); fill(g, GW, x + FW + 2, y, FW, FH, BG);
      if (fr.ref) blit(g, GW, x, y, fr.ref); else { fill(g, GW, x, y, FW, FH, PANEL); text(g, GW, x + 10, y + 21, 'NO REF', INK); }
      blit(g, GW, x + FW + 2, y, fr.forge);
    });
  });
  const rgba = up2(g, GW, GH), last = gframes[gframes.length - 1];
  if (last && Buffer.compare(Buffer.from(last.rgba.buffer), Buffer.from(rgba.buffer)) === 0) last.delay += TICK; else gframes.push({ rgba, delay: TICK });
}
const boardGif = gif(2 * GW, 2 * GH, gframes);
fs.writeFileSync(path.join(OUT, `board-${name}.gif`), boardGif);

// ---- report -----------------------------------------------------------------------------------------------------------
const pct = v => (100 * v).toFixed(0).padStart(3) + '%';
console.log(`board: ${ANIMS.length} anims x ${DIRS.length} dirs x 6 frames rendered in ${renderMs.toFixed(0)} ms`);
console.log('anim    dir  IoU (min)  colour (min)  lone forge/ref (sum of 6 frames)');
let sumI = 0, sumC = 0, nn = 0, lf = 0, lr = 0, mI = 1, mC = 1;
for (const a of ANIMS) for (const d of DIRS) {
  const s = stats[a][d]; lf += s.lone; lr += s.refLone;
  if (!s.refs) { console.log(`${a.padEnd(7)} ${d.padEnd(3)}  no ref   lone ${s.lone}`); continue; }
  sumI += s.iou / s.refs; sumC += s.colour / s.refs; nn++; mI = Math.min(mI, s.iou / s.refs); mC = Math.min(mC, s.colour / s.refs);
  console.log(`${a.padEnd(7)} ${d.padEnd(3)} ${pct(s.iou / s.refs)} (${pct(s.minI)})  ${pct(s.colour / s.refs)} (${pct(s.minC)})   ${String(s.lone).padStart(3)}/${s.refLone}   shift ${s.shift}`);
}
console.log(`runtime compose: ${equal}/${composed} frames byte-equal to FORGE.render`);
if (equal !== composed) process.exitCode = 1;
console.log(`mean IoU ${pct(sumI / nn)} (worst cell ${pct(mI)}), colour ${pct(sumC / nn)} (worst ${pct(mC)}); lone pixels forge ${lf} vs reference ${lr} (${ANIMS.length * DIRS.length * 6} frames)`);
console.log(`out/board-${name}.png ${2 * W}x${2 * H} sha256 ${crypto.createHash('sha256').update(boardPng).digest('hex').slice(0, 16)} | out/board-${name}.gif ${gframes.length} frames sha256 ${crypto.createHash('sha256').update(boardGif).digest('hex').slice(0, 16)}`);
