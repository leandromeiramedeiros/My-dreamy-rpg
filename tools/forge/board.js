'use strict';
// BOARD: the approval board for a forge rig and its gear tiers (default: chibi, the hero rig).
//   node tools/forge/board.js [model]
//     -> out/board-<model>.png  (2x) per loadout (the bare base, then T1 squire .. T5 radiant): 8 direction rows x
//                                idle f0-5 | walk f0-5 | attack f0-5
//     -> out/cape-hair.png      (4x) the knight (T3) with its cape, then the bare base with that cape and sword (hair
//                                shown): walk | attack | idle f0-5 x 8 directions, a window from above the head down past
//                                the cape's hem (cape and hair-lock secondary motion)
//   node tools/forge/board.js enemies
//     -> out/board-enemies.png (2x) the forge enemies (build.js ENEMY_RIGS), one block each: 8 direction rows x idle f0-5 |
//                                walk f0-5 | attack f0-5; every sheet anim (hit, death, sleep ...) is checked too
// Every frame is stacked by the RUNTIME path (FORGE.compose over a freshly baked bank, PNG round trip included) and checked
// byte-equal to the offline FORGE.render. Prints: the cape length per frame and direction for every cape tier (the hem's
// distance from the collar along the cape, on screen, in px, from the rig sockets: the cape's segments never stretch, so
// only foreshortening of its swing and billow moves it), the hem's travel, the lone pixels of every frame, and sha256s.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FORGE = require('./forge.js');
const { png, pngSmall, unpng } = require('./png.js');

const name = process.argv[2] || 'chibi', ENEMIES = name === 'enemies';
const model = require(`./models/${ENEMIES ? 'ogre' : name}.js`), gear = ENEMIES ? { loadouts: {}, pieces: {} } : require(`./models/${name}-gear.js`);
const OUT = path.join(__dirname, 'out');
const LOADOUTS = ['bare', 'squire', 'footman', 'knight', 'paladin', 'radiant'].filter(l => gear.loadouts[l]);
const LABEL = { bare: 'bare base', squire: 'T1 squire', footman: 'T2 footman', knight: 'T3 knight', paladin: 'T4 paladin', radiant: 'T5 radiant' };
const ANIMS = ['idle', 'walk', 'attack'], DIRS = model.dirs.map(d => d[0]), [FW, FH] = model.frame;
const BG = [0x4b, 0x7c, 0x3f], INK = [0xe5, 0xe0, 0xac], DIM = [0x2a, 0x45, 0x22];

// ---- the runtime bank: the rig's base units + every piece used, split and decoded exactly as build.js banks them -------
const t0 = process.hrtime.bigint(), bank = { model: FORGE.bankInfo(model), sheets: {} };
const used = [...new Set(LOADOUTS.flatMap(l => gear.loadouts[l]))];
for (const u of ENEMIES ? [] : [...bank.model.base.map(id => ({ id, opt: { group: id } })), ...used.map(id => ({ id, opt: { piece: gear.pieces[id] } }))]) {
  for (const [suf, anims] of FORGE.bankSplit(model)) {
    const b = FORGE.bake(model, Object.assign({ anims }, u.opt)); if (b.empty) continue;
    const back = unpng(pngSmall(b.w, b.h, b.rgba));
    bank.sheets[`${u.id}.${suf}`] = { w: back.w, rgba: back.rgba, meta: b.meta };
  }
}
let composed = 0, equal = 0, lonePx = 0;
function stacked(dir, anim, frame, ids) {                         // runtime compose, checked against the offline render
  const out = FORGE.compose(bank, { dir, anim, frame, pieces: ids }).rgba;
  const R = FORGE.render(model, { dir, anim, frame, pieces: ids.map(id => gear.pieces[id]) }), ref = R.rgba;
  composed++; if (Buffer.compare(Buffer.from(out.buffer, out.byteOffset, out.length), Buffer.from(ref.buffer, ref.byteOffset, ref.length)) === 0) equal++;
  lonePx += lone(out, FW, FH, R.fine);
  return out;
}
// lone pixels: an opaque pixel with no 4-neighbour of its colour; the outline (a 1 px line that steps diagonally) counts as
// lone only with no outline pixel among its 8 neighbours (a dark dot); a fine material's pixel (fine[i]: 1 px feather tips) is
// intended detail and skipped
const OUTK = model.outline ? parseInt(model.outline.slice(1), 16) : -1;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
function lone(rgba, w, h, fine, outk = OUTK) {
  let n = 0; const k = i => (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!rgba[i + 3] || (fine && fine[y * w + x])) continue;
    let same = false;
    for (const [dx, dy] of k(i) === outk ? N8 : N4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = (yy * w + xx) * 4; if (rgba[j + 3] && k(j) === k(i)) { same = true; break; } }
    if (!same) n++;
  }
  return n;
}

// ---- a 3x5 pixel font + image helpers -------------------------------------------------------------------------------
const GLYPH = { A: '25755', B: '65656', C: '74447', D: '65556', E: '74747', F: '74744', G: '74557', H: '55755', I: '72227', K: '55655', L: '44447',
  M: '57755', N: '65555', O: '75557', P: '75744', R: '75765', S: '74717', T: '72222', U: '55557', W: '55775', X: '55255', Y: '55222', '0': '75557',
  '1': '26222', '2': '71747', '3': '71717', '4': '55711', '5': '74717', '6': '74757', '7': '71111', '8': '75757', '9': '75717', '%': '41241', '.': '00002',
  ':': '02020', '-': '00700', '/': '11244', '|': '22222', '(': '24442', ')': '42224', ' ': '00000' };
function set(img, W, x, y, c) { const i = (y * W + x) * 4; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = 255; }
function fill(img, W, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(img, W, x, y, c); }
function text(img, W, x0, y0, s, c) {
  for (const ch of s.toUpperCase()) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let r = 0; r < 5; r++) { const bits = parseInt(g[r], 16); for (let col = 0; col < 3; col++) if (bits & (4 >> col)) set(img, W, x0 + col, y0 + r, c); }
    x0 += 4;
  }
}
function blit(img, W, x0, y0, fr, sx = 0, sy = 0, w = FW, h = FH) {   // a window of a frame (frame coords sx, sy) at x0, y0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = sx + x, fy = sy + y; if (fx < 0 || fy < 0 || fx >= FW || fy >= FH) continue;
    const i = (fy * FW + fx) * 4; if (fr[i + 3]) set(img, W, x0 + x, y0 + y, [fr[i], fr[i + 1], fr[i + 2]]);
  }
}
const upN = (img, W, H, n) => { const o = new Uint8ClampedArray(W * H * n * n * 4); for (let y = 0; y < n * H; y++) for (let x = 0; x < n * W; x++) { const s = (((y / n) | 0) * W + ((x / n) | 0)) * 4, t = (y * n * W + x) * 4; o[t] = img[s]; o[t + 1] = img[s + 1]; o[t + 2] = img[s + 2]; o[t + 3] = 255; } return o; };
const realOf = (anim, ids) => { const wp = ids.map(id => gear.pieces[id]).find(p => p.class), v = anim === 'attack' ? 'attack:' + (wp ? wp.class : 'none') : anim; return model.anims[v] || model.anims[anim]; };
const msOf = (anim, ids) => realOf(anim, ids).ms || [];

if (ENEMIES) return enemiesBoard();

// ---- the enemies board: per enemy a block of 8 direction rows x (idle | walk | attack) x 6 frames, each enemy at its own
// frame size. Bank exactly as build.js banks a gearless rig (base groups x bankSplit, PNG round trip); every frame of every
// sheet anim is composed by the runtime path and checked byte-equal to FORGE.render
function enemiesBoard() {
  const t0 = process.hrtime.bigint(), RIGS = require('./build.js').ENEMY_RIGS, sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
  const blocks = [];
  let composed = 0, equal = 0, lonePx = 0;
  for (const rig of RIGS) {
    const m = require(`./models/${rig}.js`), bk = { model: FORGE.bankInfo(m), sheets: {} }, [w, h] = m.frame;
    for (const id of bk.model.base) for (const [suf, anims] of FORGE.bankSplit(m)) {
      const b = FORGE.bake(m, { anims, group: id }); if (b.empty) continue;
      const back = unpng(pngSmall(b.w, b.h, b.rgba)); bk.sheets[`${id}.${suf}`] = { w: back.w, rgba: back.rgba, meta: b.meta };
    }
    const outk = parseInt(m.outline.slice(1), 16), F = {}, hash = crypto.createHash('sha256');
    let lp = 0, eq = 0, n = 0;
    for (const a of m.sheetAnims) {
      F[a] = {};
      for (const [d] of m.dirs) F[a][d] = Array.from({ length: m.anims[a].frames }, (_, f) => {
        const out = FORGE.compose(bk, { dir: d, anim: a, frame: f, pieces: [] }).rgba, R = FORGE.render(m, { dir: d, anim: a, frame: f, pieces: [] });
        n++; if (Buffer.compare(Buffer.from(out.buffer, out.byteOffset, out.length), Buffer.from(R.rgba.buffer, R.rgba.byteOffset, R.rgba.length)) === 0) eq++;
        lp += lone(out, w, h, R.fine, outk); hash.update(Buffer.from(out.buffer, out.byteOffset, out.length));
        return out;
      });
    }
    composed += n; equal += eq; lonePx += lp;
    blocks.push({ rig, m, w, h, F, n, eq, lp, sha: hash.digest('hex').slice(0, 16) });
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const LW = 16, CG = 2, AG = 8, TH = 9, bh = B => TH + 8 + B.m.dirs.length * (B.h + CG) + 6, aw = B => 6 * (B.w + CG);
  const W = Math.max(...blocks.map(B => LW + ANIMS.length * (aw(B) + AG))), H = 12 + blocks.reduce((s, B) => s + bh(B), 0);
  const img = new Uint8ClampedArray(W * H * 4); fill(img, W, 0, 0, W, H, DIM);
  text(img, W, 2, 3, 'enemies: runtime compose of baked sheets, 1 frame per cell. rows = directions', INK);
  let y0 = 12;
  for (const B of blocks) {
    text(img, W, 2, y0 + 1, `${B.rig}: ${B.w}x${B.h} frames`, INK);
    ANIMS.forEach((a, ai) => {
      const x0 = LW + ai * (aw(B) + AG), A = B.m.anims[a], ms = A.ms || [];
      for (let f = 0; f < A.frames && f < 6; f++) text(img, W, x0 + f * (B.w + CG) + 2, y0 + TH, `${a.slice(0, 3)} ${f} ${ms[f] || ''}`, INK);
      B.m.dirs.forEach(([d], di) => {
        const y = y0 + TH + 8 + di * (B.h + CG);
        if (!ai) text(img, W, 2, y + (B.h >> 1), d, INK);
        for (let f = 0; f < A.frames && f < 6; f++) {
          const x = x0 + f * (B.w + CG), fr = B.F[a][d][f]; fill(img, W, x, y, B.w, B.h, BG);
          for (let yy = 0; yy < B.h; yy++) for (let xx = 0; xx < B.w; xx++) { const i = (yy * B.w + xx) * 4; if (fr[i + 3]) set(img, W, x + xx, y + yy, [fr[i], fr[i + 1], fr[i + 2]]); }
        }
      });
    });
    y0 += bh(B);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const boardPng = png(2 * W, 2 * H, upN(img, W, H, 2));
  fs.writeFileSync(path.join(OUT, 'board-enemies.png'), boardPng);
  console.log(`board: ${blocks.length} enemies, every sheet anim x 8 dirs (bake + compose + render) in ${ms.toFixed(0)} ms`);
  for (const B of blocks) console.log(`${B.rig.padEnd(14)} ${B.w}x${B.h} ${B.m.sheetAnims.join(' ')}: ${B.eq}/${B.n} frames byte-equal to FORGE.render | lone px ${B.lp} | frames sha256 ${B.sha}`);
  console.log(`runtime compose: ${equal}/${composed} frames byte-equal | lone pixels: ${lonePx} | out/board-enemies.png ${2 * W}x${2 * H} sha256 ${sha(boardPng)}`);
  if (equal !== composed || lonePx) process.exitCode = 1;
}

// ---- the board: per loadout a block of 8 direction rows x (idle | walk | attack) x 6 frames ---------------------------
const frames = {};
for (const lo of LOADOUTS) { frames[lo] = {}; for (const a of ANIMS) { frames[lo][a] = {}; for (const d of DIRS) frames[lo][a][d] = [0, 1, 2, 3, 4, 5].map(f => f < realOf(a, gear.loadouts[lo]).frames ? stacked(d, a, f, gear.loadouts[lo]) : null); } }
const renderMs = Number(process.hrtime.bigint() - t0) / 1e6;
const LW = 16, CG = 2, AG = 8, TH = 9, BH = TH + 8 + DIRS.length * (FH + CG) + 6;
const AW = 6 * (FW + CG), W = LW + ANIMS.length * (AW + AG), H = 12 + LOADOUTS.length * BH;
const img = new Uint8ClampedArray(W * H * 4); fill(img, W, 0, 0, W, H, DIM);
text(img, W, 2, 3, `${name}: runtime compose of baked layers, 1 frame per cell. rows = directions`, INK);
LOADOUTS.forEach((lo, li) => {
  const y0 = 12 + li * BH, ids = gear.loadouts[lo];
  text(img, W, 2, y0 + 1, `${LABEL[lo] || lo}: ${ids.length ? ids.join(' ') : 'casual clothes, hair, skin. nothing equippable'}`, INK);
  ANIMS.forEach((a, ai) => {
    const x0 = LW + ai * (AW + AG), ms = msOf(a, ids);
    for (let f = 0; f < realOf(a, ids).frames && f < 6; f++) text(img, W, x0 + f * (FW + CG) + 2, y0 + TH, `${a.slice(0, 3)} ${f} ${ms[f] || ''}`, INK);
    DIRS.forEach((d, di) => {
      const y = y0 + TH + 8 + di * (FH + CG);
      if (!ai) text(img, W, 2, y + 24, d, INK);
      for (let f = 0; f < 6; f++) { const x = x0 + f * (FW + CG), fr = frames[lo][a][d][f]; if (fr) { fill(img, W, x, y, FW, FH, BG); blit(img, W, x, y, fr); } }
    });
  });
});
fs.mkdirSync(OUT, { recursive: true });
const boardPng = png(2 * W, 2 * H, upN(img, W, H, 2));
fs.writeFileSync(path.join(OUT, `board-${name}.png`), boardPng);

// ---- the cape and hair zoom: walk | attack | idle x 6 frames, 8 direction rows, a window around head + cape; first the
// knight (T3) with its cape, then the bare base with the same cape and sword (no helm, so the hair locks show)
const ZLO = gear.loadouts.knight ? 'knight' : LOADOUTS[LOADOUTS.length - 1], ZA = ['walk', 'attack', 'idle'];
const ZHAIR = gear.loadouts[ZLO].filter(id => ['back', 'weapon'].includes(gear.pieces[id].slot));
const ZSETS = [[`${LABEL[ZLO] || ZLO}`, id => frames[ZLO]], [`bare base + ${ZHAIR.join(' + ')} (hair shown)`, null]];
const hairFrames = {}; for (const a of ZA) { hairFrames[a] = {}; for (const d of DIRS) hairFrames[a][d] = [0, 1, 2, 3, 4, 5].map(f => f < realOf(a, ZHAIR).frames ? stacked(d, a, f, ZHAIR) : null); }
ZSETS[1][1] = () => hairFrames;
const s0 = FORGE.sockets(model, { dir: 'S', anim: 'idle', frame: 0 });
const ZW = 34, ZH = 44, zx = Math.round(s0.head.x) - ZW / 2, zy = Math.round(s0.head.y) - 6;   // one fixed window (the body moves in it)
const ZL = 14, ZAW = 6 * (ZW + CG), ZBH = 10 + DIRS.length * (ZH + CG), zW = ZL + ZA.length * (ZAW + AG), zH = ZSETS.length * ZBH;
const zimg = new Uint8ClampedArray(zW * zH * 4); fill(zimg, zW, 0, 0, zW, zH, DIM);
ZSETS.forEach(([label, get], si) => {
  const F = get(), y0 = si * ZBH;
  ZA.forEach((a, ai) => {
    const x0 = ZL + ai * (ZAW + AG); text(zimg, zW, x0, y0 + 2, `${a} f0-5: ${label}`, INK);
    DIRS.forEach((d, di) => {
      const y = y0 + 10 + di * (ZH + CG); if (!ai) text(zimg, zW, 1, y + 18, d, INK);
      for (let f = 0; f < 6; f++) { const x = x0 + f * (ZW + CG), fr = F[a][d][f]; if (fr) { fill(zimg, zW, x, y, ZW, ZH, BG); blit(zimg, zW, x, y, fr, zx, zy, ZW, ZH); } }
    });
  });
});
const zoomPng = png(4 * zW, 4 * zH, upN(zimg, zW, zH, 4));
fs.writeFileSync(path.join(OUT, 'cape-hair.png'), zoomPng);

// ---- cape length per frame and direction, every cape tier ---------------------------------------------------------------
// The hem's distance from the collar measured along the cape on screen: the projected segments (collar -> joints -> hem).
const CHAIN = ((model.springs || []).find(s => s.bones.includes('cape')) || { bones: [] }).bones;
const capes = Object.keys(gear.pieces).filter(id => gear.pieces[id].sockets && gear.pieces[id].sockets.capeHem).sort();
const lenRows = [];
for (const id of capes) {
  const cp = gear.pieces[id], hem = cp.sockets.capeHem, k = CHAIN.indexOf(hem.bone);
  const probe = { id: 'probe', layers: [], sockets: Object.assign({ hem }, ...CHAIN.map((b, i) => ({ ['j' + i]: { bone: b, at: [0, 0, 0] } }))) };
  for (const d of DIRS) {
    const row = { id, d, v: {} };
    for (const a of ANIMS) row.v[a] = [0, 1, 2, 3, 4, 5].map(f => {
      const s = FORGE.sockets(model, { dir: d, anim: a, frame: f, pieces: [cp, probe, gear.pieces[(gear.loadouts.knight || []).find(p => gear.pieces[p].class)]].filter(Boolean) });
      let L = 0; for (let i = 0; i < k; i++) L += Math.hypot(s['j' + (i + 1)].x - s['j' + i].x, s['j' + (i + 1)].y - s['j' + i].y);
      return L + Math.hypot(s.hem.x - s['j' + k].x, s.hem.y - s['j' + k].y);
    });
    lenRows.push(row);
  }
}
// hem travel (screen px, knight cape, S and E): idle breath, walk sway, attack swing
const travel = (d, a) => { const id = capes.find(c => c.endsWith('.t3')) || capes[0], cp = gear.pieces[id];
  const P = [0, 1, 2, 3, 4, 5].map(f => FORGE.sockets(model, { dir: d, anim: a, frame: f, pieces: [cp, ...gear.loadouts[ZLO].map(i => gear.pieces[i]).filter(p => p.class)] }));
  const xs = P.map(s => s.capeHem.x - s.capeTop.x), ys = P.map(s => s.capeHem.y), r = v => Math.max(...v) - Math.min(...v);
  return { rel: xs.map(v => v.toFixed(1)).join(' '), x: r(xs), y: r(ys) }; };

// ---- report -----------------------------------------------------------------------------------------------------------
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
console.log(`board: ${LOADOUTS.length} loadouts x ${ANIMS.length} anims x ${DIRS.length} dirs x 6 frames (bake + compose + render) in ${renderMs.toFixed(0)} ms`);
console.log(`runtime compose: ${equal}/${composed} frames byte-equal to FORGE.render | lone pixels over all ${composed} frames: ${lonePx}`);
console.log('cape length on screen (px), per frame: idle f0-5 | walk f0-5 | attack f0-5, then min-max over all 18 frames');
let worst = 0;
for (const r of lenRows) {
  const all = [...r.v.idle, ...r.v.walk, ...r.v.attack], lo = Math.min(...all), hi = Math.max(...all), f = v => v.map(x => x.toFixed(1).padStart(4)).join(' ');
  worst = Math.max(worst, (hi - lo) / 2);
  console.log(`${r.id.padEnd(7)} ${r.d.padEnd(2)} ${f(r.v.idle)} | ${f(r.v.walk)} | ${f(r.v.attack)} | ${lo.toFixed(1)}-${hi.toFixed(1)} = ${((lo + hi) / 2).toFixed(1)} +-${((hi - lo) / 2).toFixed(2)}`);
}
console.log(`cape length: worst +-${worst.toFixed(2)} px around its mid value (all tiers, directions, frames)`);
for (const d of ['S', 'E']) for (const a of ANIMS) { const t = travel(d, a); console.log(`knight cape hem ${d} ${a.padEnd(6)}: hem x - collar x per frame ${t.rel} | hem travel x ${t.x.toFixed(1)} px, y ${t.y.toFixed(1)} px`); }
console.log(`out/board-${name}.png ${2 * W}x${2 * H} sha256 ${sha(boardPng)} | out/cape-hair.png ${4 * zW}x${4 * zH} sha256 ${sha(zoomPng)}`);
if (equal !== composed) process.exitCode = 1;
