'use strict';
// TIERS: strips + checks for the gear lines of a forge rig (default chibi: models/chibi.js + models/chibi-gear.js).
//   node tools/forge/tiers.js [line..] [--model chibi] [--check] [--anim idle --frame 0] [--zoom 4]
//     -> out/tiers-<line>.png   6 tiers (T1..T5, MYTH) x 8 directions, 4x, one frame (default idle 0), the piece on the bare base
//     -> out/loadout-mix.png    6 mixed loadouts x 8 directions (written when every line is drawn)
//   --check, per piece (each piece alone on the bare base):
//     size     the largest shipped split sheet (<piece>.core / <piece>.atk.<class>, as build.js bakes them; the unsplit sheet is shown as 'whole')
//              <= 64 KB for head, chest and boots, <= 36 KB for the cape (back), <= 30 KB for every other piece
//              (the bare body, 129 KB, is chibi.js: reported, not gated here)
//     det      two bakes give the same sha256
//     compose  the runtime FORGE.compose of the decoded bank == FORGE.render, byte for byte, every sheet frame
//     lone     0 lone pixels on every sheet frame (no 4-neighbour of the same colour; the outline is a 1 px line, so an
//              outline pixel counts only with no outline pixel among its 8 neighbours); a fine material's pixels (forge.js
//              mats fine: 1 px feather tips) are intended detail and skipped
//     tones    <= 5 per material (4-step ramp + glint);  colours: <= 24 added over the bare base
//     bright   <= 15 % of the piece's own opaque pixels (its baked layers, every frame) above CIE L* 85: FAIL on T1..T3, warning on
//              T4, T5 and Mythic
//     shade    >= SHADE_MIN of the piece's shaded pixels sit on a ramp's two darkest tones (a piece keeps a dark shadow side)
//     step     T2..T6: the piece differs from the tier below in >= STEP_MIN pixels with every material painted one grey (geometry, not hue)
//     glow     Mythic: at most 4 flat (emissive) pixels per frame; no lone pixel, no rainbow (one flat hue per line)
//   and the palette-lint rules over every gear ramp (tools/palette-lint.js reads the same files).
// A line = a piece family of models/<rig>-gear.js; its tiers are <family>.t1 .. .t5 and the Mythic <family>.t6.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FORGE = require('./forge.js');
const { png, pngSmall, unpng } = require('./png.js');

const args = process.argv.slice(2), flag = n => args.includes('--' + n), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const VAL = ['anim', 'frame', 'zoom', 'out', 'model'];
const want = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--') && VAL.includes(args[i - 1].slice(2))));
const RIG = opt('model', 'chibi'), model = require(`./models/${RIG}.js`), gear = require(`./models/${RIG}-gear.js`);
const OUT = path.join(__dirname, 'out'), TIERS = [1, 2, 3, 4, 5, 6], TIERL = TIERS.map(t => t === 6 ? 'MYTH' : 'T' + t);
const LINES = [...new Set(Object.values(gear.pieces).filter(p => p.family && p.tier).map(p => p.family))];
const lines = want.length ? want : LINES, ANIM = opt('anim', 'idle'), FRAME = +opt('frame', 0);
const [FW, FH] = model.frame, ZOOM = +opt('zoom', 4), DIRS = model.dirs.map(d => d[0]);
const CAP = { head: 64, chest: 64, boots: 64, back: 36 }, capOf = p => CAP[p.slot] || 30, GLOW_MAX = 4, SHADE_MIN = 0.12, STEP_MIN = 18;
fs.mkdirSync(OUT, { recursive: true });
const idsOf = l => TIERS.map(t => `${l}.t${t}`).filter(id => gear.pieces[id]);
const P = ids => ids.map(id => { if (!gear.pieces[id]) throw new Error('no piece ' + id); return gear.pieces[id]; });

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
function blitZ(img, W, x0, y0, fr, z) { for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const i = (y * FW + x) * 4; if (fr[i + 3]) fill(img, W, x0 + x * z, y0 + y * z, z, z, [fr[i], fr[i + 1], fr[i + 2]]); } }
const BG = [0x3b, 0x5f, 0x44], PANEL = [0x2a, 0x45, 0x22], INK = [0xe5, 0xe0, 0xac];
function strip(rows, file, labels, small) {                        // rows: [[ids...]], one row each, 8 dirs per row
  const LW = small ? 8 : 40, TH = small ? 12 : 0, GAP = 2, cw = FW * ZOOM, W = LW + 8 * (cw + GAP), H = 16 + rows.length * (FH * ZOOM + GAP + TH), img = new Uint8ClampedArray(W * H * 4);
  fill(img, W, 0, 0, W, H, PANEL);
  DIRS.forEach((d, c) => text(img, W, LW + c * (cw + GAP) + 4, 4, d, INK));
  rows.forEach((ids, r) => {
    const y0 = 16 + r * (FH * ZOOM + GAP + TH); text(img, W, 4, y0 + (small ? 2 : 4), labels[r], INK, small ? 1 : 2);
    DIRS.forEach((d, c) => {
      const x0 = LW + c * (cw + GAP); fill(img, W, x0, y0 + TH, cw, FH * ZOOM, BG);
      blitZ(img, W, x0, y0 + TH, FORGE.render(model, { dir: d, anim: ANIM, frame: FRAME, pieces: P(ids) }).rgba, ZOOM);
    });
  });
  fs.writeFileSync(file, png(W, H, img)); return file;
}
// six mixed loadouts (head, chest, boots, back, weapon, offhand), tiers shuffled across the slots; includes Sword + Buckler,
// Staff + Grimoire, a Mythic knight (Shardheart set + Morrowbane + the Mythic Heater) and a Mythic caster
const MIX = [
  ['knighthelm.t3', 'warden.t3', 'knightgreaves.t3', 'cape.t3', 'sword.t3', 'buckler.t2'],
  ['knighthelm.t5', 'warden.t4', 'knightgreaves.t5', 'cape.t4', 'sword.t5', 'shield.t4'],
  ['knighthelm.t2', 'warden.t1', 'knightgreaves.t2', 'cape.t2', 'staff.t4', 'grimoire.t4'],
  ['knighthelm.t6', 'warden.t6', 'knightgreaves.t6', 'cape.t6', 'sword.t6', 'shield.t6'],
  ['knighthelm.t4', 'warden.t2', 'knightgreaves.t3', 'cape.t5', 'sword.t2', 'grimoire.t3'],
  ['knighthelm.t3', 'warden.t5', 'knightgreaves.t1', 'cape.t1', 'staff.t6', 'grimoire.t6'],
];
function mix() {
  const rows = MIX.map(r => r.filter(id => gear.pieces[id]));
  if (rows.some((r, i) => r.length !== MIX[i].length)) { console.log('loadout-mix: skipped (a line is missing)'); return; }
  const f = strip(rows, path.join(OUT, 'loadout-mix.png'), rows.map(r => r.map(id => id.replace('knighthelm', 'helm').replace('knightgreaves', 'boots')).join(' ')), true); console.log('wrote ' + f);
}

// ---- checks
const key = (a, i) => (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
const OUTK = model.outline ? parseInt(model.outline.slice(1), 16) : -1;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
function lone(sh) {
  let n = 0;
  for (let y = 0; y < sh.h; y++) for (let x = 0; x < sh.w; x++) {
    const i = (y * sh.w + x) * 4; if (sh.rgba[i + 3] < 255 || (sh.fine && sh.fine[y * sh.w + x])) continue;   // fine materials: intended 1 px detail
    const k = key(sh.rgba, i), fx = x % FW, fy = y % FH; let same = false;
    for (const [dx, dy] of k === OUTK ? N8 : N4) {
      const xx = fx + dx, yy = fy + dy; if (xx < 0 || yy < 0 || xx >= FW || yy >= FH) continue;   // never across two frames
      const j = ((y + dy) * sh.w + x + dx) * 4; if (sh.rgba[j + 3] === 255 && key(sh.rgba, j) === k) { same = true; break; }
    }
    if (!same) { n++; if (process.env.LONEDBG) console.error('lone row', Math.floor(y / FH), 'col', Math.floor(x / FW), 'px', fx, fy, k.toString(16)); }
  }
  return n;
}
const colourSet = sh => { const s = new Set(); for (let i = 0; i < sh.rgba.length; i += 4) if (sh.rgba[i + 3] === 255) s.add(key(sh.rgba, i)); return s; };
const rampOf = m => typeof m === 'string' ? FORGE.ramp(m) : Array.isArray(m) ? m : typeof m.ramp === 'string' ? FORGE.ramp(m.ramp) : m.ramp;
function matTones(piece) {                                           // most distinct ramp entries of any material
  let worst = 0, name = '';
  for (const L of piece.layers) for (const k in L.mats || {}) {
    const m = L.mats[k], r = rampOf(m), n = new Set(typeof m.flat === 'number' ? [r[m.flat]] : r).size; if (n > worst) { worst = n; name = k; }
  }
  return [worst, name];
}
const lstar = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
function bright(b) {                                                 // {hi: share of a baked piece's own pixels above L* 85, dark: share of its shaded ones on a ramp's 2 darkest tones}
  let n = 0, hi = 0, ns = 0, dk = 0;
  b.meta.layers.forEach(L => { L._L = L.ramps.map(r => r.map(lstar)); });
  // cells index the atlas; identical crops are stored once, so walk the cells (every frame counts) not the atlas
  const cols = FORGE.bankInfo(model).layout.length;
  b.meta.cells.forEach((q, ci) => {
    if (!q) return; const L = b.meta.layers[Math.floor(ci / (DIRS.length * cols))];
    for (let y = 0; y < q[3]; y++) for (let x = 0; x < q[2]; x++) {
      const o = ((q[1] + y) * b.w + q[0] + x) * 4; if (!b.rgba[o + 3]) continue;
      const m = b.rgba[o] & 127, t = b.rgba[o + 1] & 7, Ls = L._L[m]; n++; if (Ls[Math.min(t, Ls.length - 1)] > 85) hi++;
      if (!(b.rgba[o + 1] >> 7)) { ns++; if (t <= 1) dk++; }
    }
  });
  return { hi: n ? hi / n : 0, dark: ns ? dk / ns : 1 };
}
const GREY = ['#26222e', '#5a5666', '#8c8898', '#c4c0cc'], greyPal = piece => { const o = {}; for (const L of piece.layers) for (const k in L.mats || {}) o[k] = GREY; return o; };
const greyCache = {};
function greyFrames(id) {                                            // the piece alone, every material one grey: 8 dirs, idle 0
  if (greyCache[id]) return greyCache[id]; const piece = gear.pieces[id];
  return (greyCache[id] = model.dirs.map(([dn]) => FORGE.render(model, { dir: dn, anim: 'idle', frame: 0, pieces: [{ piece, pal: greyPal(piece) }] }).rgba));
}
function stepDiff(id) {                                              // pixels that differ from the tier below, summed over 8 dirs
  const m = /^(.+)\.t(\d)$/.exec(id), t = +m[2], lo = `${m[1]}.t${t - 1}`; if (t < 2 || !gear.pieces[lo]) return -1;
  const A = greyFrames(id), B = greyFrames(lo); let n = 0;
  A.forEach((a, d) => { for (let i = 0; i < a.length; i += 4) if (a[i] !== B[d][i] || a[i + 1] !== B[d][i + 1] || a[i + 2] !== B[d][i + 2] || a[i + 3] !== B[d][i + 3]) n++; });
  return n;
}
// Mythic glow: every flat (emissive) material's colour, counted per frame on the sheet; <= GLOW_MAX px per frame
// glow = a bright flat (emissive) colour; the dark helm slot is not glow
function glowMax(piece, sh) {
  const cols = new Set(); for (const L of piece.layers) for (const k in L.mats || {}) { const m = L.mats[k]; if (m && typeof m.flat === 'number') { const r = rampOf(m)[m.flat]; if (lstar(r) >= 50) cols.add(parseInt(r.slice(1), 16)); } }
  if (!cols.size) return 0; let worst = 0; const [fw, fh] = sh.frame, nc = sh.w / fw, nr = sh.h / fh;
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) { let n = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = ((r * fh + y) * sh.w + c * fw + x) * 4; if (sh.rgba[i + 3] === 255 && cols.has(key(sh.rgba, i))) n++; }
    if (n > worst) worst = n; }
  return worst;
}
let baseSheet = null, baseBake = null;
// shipped size: the largest of the piece's split sheets (<piece>.core, <piece>.atk.<class>), as build.js bakes them
let splitCache = null;
function splitKb(piece) { splitCache = splitCache || FORGE.bankSplit(model); let w = 0, nm = '';
  for (const [suf, anims] of splitCache) { const b = FORGE.bake(model, { anims, piece }); if (b.empty) continue; const k = pngSmall(b.w, b.h, b.rgba).length / 1024; if (k > w) { w = k; nm = suf; } }
  return [w, nm]; }
function check(id) {
  const base = baseSheet || (baseSheet = FORGE.sheet(model, { pieces: [] })), baseCols = colourSet(base);
  const bk = baseBake || (baseBake = (() => { const b = FORGE.bake(model, {}), buf = png(b.w, b.h, b.rgba), back = unpng(buf); return { kb: buf.length / 1024, sheet: { w: back.w, rgba: back.rgba, meta: b.meta } }; })());
  const piece = gear.pieces[id], b = FORGE.bake(model, { piece }), buf = png(b.w, b.h, b.rgba), b2 = FORGE.bake(model, { piece });
  const sha = crypto.createHash('sha256').update(buf).digest('hex'), sha2 = crypto.createHash('sha256').update(png(b2.w, b2.h, b2.rgba)).digest('hex');
  const back = unpng(buf), bank = { model: FORGE.bankInfo(model), sheets: { body: bk.sheet, [id]: { w: back.w, rgba: back.rgba, meta: b.meta } } };
  const sh = FORGE.sheet(model, { pieces: [piece] }), cols = colourSet(sh); let added = 0; for (const c of cols) if (!baseCols.has(c)) added++;
  let frames = 0, bad = 0; const [fw, fh] = sh.frame;
  model.dirs.forEach(([dn], r) => sh.layout.forEach(([a, f], c) => {
    const out = FORGE.compose(bank, { dir: dn, anim: a, frame: f, pieces: [id] });
    for (let y = 0; y < fh; y++) {
      const off = ((r * fh + y) * sh.w + c * fw) * 4;
      if (Buffer.compare(Buffer.from(out.rgba.buffer, out.rgba.byteOffset + y * fw * 4, fw * 4), Buffer.from(sh.rgba.buffer, off, fw * 4))) { bad++; break; }
    }
    frames++;
  }));
  const br = bright(b), [skb, snm] = splitKb(piece); return { kb: skb, snm, whole: buf.length / 1024, sha: sha.slice(0, 12), det: sha === sha2, lone: lone(sh), added, bad, frames, bright: br.hi, dark: br.dark, step: stepDiff(id), glow: piece.tier === 6 ? glowMax(piece, sh) : 0 };
}
// the palette-lint rules (tools/palette-lint.js): 4 tones + optional glint, CIE L* strictly rising, darkest tone dL >= 8
// from the outline colour #0c0714; flat ramps (one colour) are emissive and skipped
function paletteLint() {
  const seen = new Map(), add = (src, r) => { if (Array.isArray(r) && r.length > 1 && typeof r[0] === 'string') seen.set(r.join(), src); };
  for (const id in gear.pieces) for (const L of gear.pieces[id].layers) for (const k in L.mats || {}) { const m = L.mats[k]; add(`${id}.${k}`, Array.isArray(m) ? m : m.ramp); }
  let n = 0, bad = 0; const dark = lstar('#0c0714');
  for (const [k, src] of seen) {
    const c = k.split(','); if (!c.every(h => /^#[0-9a-f]{6}$/i.test(h)) || c.every(h => h === c[0])) continue; n++;
    const L = c.map(lstar), why = [];
    if (c.length !== 4 && c.length !== 5) why.push(c.length + ' colours');
    for (let i = 1; i < L.length; i++) if (!(L[i] > L[i - 1])) { why.push(`L* not rising at ${i + 1}`); break; }
    if (L[0] - dark < 8) why.push(`darkest dL ${(L[0] - dark).toFixed(1)} < 8`);
    if (why.length) { bad++; console.log(`palette FAIL ${src} [${k}] ${why.join('; ')}`); }
  }
  console.log(`palette-lint rules over ${n} gear ramps: ${bad ? bad + ' FAIL' : 'PASS'}`); if (bad) process.exitCode = 1;
}
if (flag('check')) {
  let fail = 0, warn = 0; paletteLint();
  for (const l of lines) for (const id of idsOf(l)) {
    const piece = gear.pieces[id], r = check(id), [tn, tm] = matTones(piece), cap = capOf(piece);
    if (id === idsOf(l)[0] && l === lines[0]) {
      const bl = lone(baseSheet); if (bl) fail++;
      console.log(`${bl ? 'FAIL' : 'info'} ${'body'.padEnd(16)} ${baseBake.kb.toFixed(1).padStart(5)}/64 KB | lone ${bl} | chibi.js, out of this lane: not gated here`);
    }
    const why = [], wn = [];
    if (r.kb > cap) why.push('size'); if (tn > 5) why.push('tones'); if (r.added > 24) why.push('colours'); if (r.lone) why.push('lone');
    if (r.bad) why.push('compose'); if (!r.det) why.push('det');
    if (r.bright > 0.15) (piece.tier <= 3 ? why : wn).push('bright');
    if (r.dark < SHADE_MIN) why.push('shade');
    if (r.step >= 0 && r.step < STEP_MIN) why.push('step');
    if (piece.tier === 6 && (r.glow > GLOW_MAX || r.glow < 1)) why.push('glow');
    if (why.length) fail++; else if (wn.length) warn++;
    console.log(`${why.length ? 'FAIL' : wn.length ? 'warn' : 'ok  '} ${id.padEnd(16)} ${r.kb.toFixed(1).padStart(5)}/${cap} KB (${r.snm}; whole ${r.whole.toFixed(1)}) | tones<=${tn} (${tm}) | +${r.added} colours | lone ${r.lone} | bright ${(100 * r.bright).toFixed(1)}% | dark ${(100 * r.dark).toFixed(0)}% | step ${r.step} | ${piece.tier === 6 ? 'glow ' + r.glow + ' | ' : ''}det ${r.det} sha ${r.sha} | compose ${r.frames - r.bad}/${r.frames}${why.length ? ' | ' + why.join(', ') : ''}${wn.length ? ' | warn ' + wn.join(', ') : ''}`);
  }
  console.log(fail ? `${fail} FAIL` : 'all checks pass' + (warn ? ` (${warn} brightness warnings on T4+)` : ''));
  if (fail) process.exitCode = 1;
} else {
  for (const l of lines) {
    const ids = idsOf(l); if (!ids.length) { console.log(`${l}: no tiers`); continue; }
    console.log('wrote ' + strip(ids.map(id => [id]), path.join(OUT, opt('out', `tiers-${l}.png`)), TIERL.slice(0, ids.length)));
  }
  if (!want.length) mix();
}
