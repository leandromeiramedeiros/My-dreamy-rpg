'use strict';
// GRIMOIRE LINE — grimoire.t1 .. grimoire.t5 + grimoire.t6 (Mythic): a worn companion book that floats beside the off-hand side
// (the rig has no bone for it, so it rides the hips bone: +x side, chest height, slightly behind the arm). It bobs 1 px on idle (and
// every other frame on the walk) and opens on cast (closed, half, open, open). Volumes give the slab and its depth, the cover /
// spread / back are pixel parts drawn per facing (authored by hand, 5 views; no healing). Tiers:
//   T1 Primer: brown leather, clasp   T2 Dreambook: blue cloth, gold star   T3 Sun Codex: red + gold, a sun disc
//   T4 Aurora Grimoire: violet, aurora runes + emerald clasp   T5 Book Eternal: a book of light (flat emissive trim and runes)
//   T6 Mythic: The Names on the Pillars = T5 + three hue-cycling runes floating above the cover.
// Sockets: grimoire (the slab centre), gem (clasp), runes (T6, above the cover).
const C = require('./common.js');
const { PAL, EMIT, metal, gemOf, flat, piece, sockets, lintGrid } = C;

const BX = 8, BY = 2.6, BZ = -0.6;                                        // book centre on the hips bone, ref px
const bob = (a, f) => a === 'idle' ? [0, 0, 1, 1, 1, 0][f % 6] : a === 'walk' ? f & 1 : 0;
const state = (a, f) => a === 'cast' ? [0, 1, 2, 2][f & 3] : 0;           // 0 closed, 1 half open, 2 open
const BOBPX = 1 / C.SCALE;                                                // 1 screen px in ref px
// ---- grids (drawn by hand, S as the book faces the camera with its spine to the body; back views mirror) ----------------------
const sel = (rows, idx) => rows.map(r => idx.map(i => r[i]).join(''));
const mid = {                                                              // the three emblem rows per tier (rows 2-4 of the cover)
  1: ['kCCCCc', 'kCCEEc', 'kCCEEc'], 2: ['kCEECc', 'kCEECc', 'kCCCCc'], 3: ['kCEECc', 'kEEEEc', 'kCEECc'],
  4: ['kCaaCc', 'kCCCCc', 'kCRRCc'], 5: ['kCaaCc', 'kEEEEc', 'kCaaCc'], 6: ['kCaaCc', 'kEEEEc', 'kCaaCc'],
};
const closedS = t => ['GGGGGG', 'kCCCCc', ...mid[t], 'kCCCCc', 'GGGGGG'];
const closedSE = t => sel(closedS(t), [0, 2, 3, 5]);
const halfS = ['GGGGGGGG', 'kCCCPPPc', 'kCEEPaac', 'kCEEPPPc', 'kCEEPaac', 'kCCCPPPc', 'GGGGGGGG'];
const halfSE = ['GGGGG', 'kCCPc', 'kEEPc', 'kEEPc', 'kEEPc', 'kCCPc', 'GGGGG'];
const openS = ['GGGGGGGGGGGG', 'cPPPPkkPPPPc', 'cPaaPkkPaaPc', 'cPPPPkkPPPPc', 'cPaaPkkPaaPc', 'cPPPPkkPPPPc', 'GGGGGGGGGGGG'];
const openSE = ['GGGGGGGGGG', 'cPPPkkPPPc', 'cPaakkaaPc', 'cPPPkkPPPc', 'cPaakkaaPc', 'cPPPkkPPPc', 'GGGGGGGGGG'];
const edgeE = ['GG', 'Pp', 'Pp', 'Pp', 'Pp', 'Pp', 'GG'], edgeW = ['GG', 'kc', 'kc', 'kc', 'kc', 'kc', 'GG'];
const backN = ['GGGGGG', 'cCCCCk', 'cCCCCk', 'kkkkkk', 'cCCCCk', 'cCCCCk', 'GGGGGG'], backNE = sel(backN, [0, 2, 3, 5]);
const grid = (rows, at) => ({ at: at || [rows[0].length >> 1, rows.length >> 1], rows });
const dirsFor = (name, S, SE, E, W, B, BE) => lintGrid(name, {
  S: grid(S), SE: grid(SE), SW: grid(SE), E: grid(E), W: grid(W), NE: grid(BE), N: grid(B), NW: grid(BE) });
function tier(t) {
  const hi = t >= 5;
  const COVER = [{ ramp: PAL.leather }, { ramp: PAL.cloth }, { ramp: PAL.tabard }, { ramp: PAL.void }, metal(PAL.pearl), metal(PAL.pearl)][t - 1];
  const TRIM = t === 1 ? { ramp: PAL.darkwood } : t === 4 ? metal(PAL.silver) : hi ? flat(EMIT.sun, 2) : metal(PAL.gold);
  const mats = { cover: COVER, trim: TRIM, page: { ramp: PAL.parch }, ink: { ramp: PAL.leather }, clasp: metal(PAL.gold), gold: metal(PAL.gold), emit: flat(EMIT.sun, 2),
    emitA: flat(EMIT.aurora, 2), emerald: gemOf(PAL.emerald), hueA: flat('#ff8a5a', 2), hueB: flat('#8ad0ff', 2), hueC: flat('#b8ff8a', 2) };
  const glyph = t >= 4 ? ['emitA', 0] : ['ink', 1];
  const emblem = t === 2 ? ['gold', 3] : t === 3 ? ['emit', 0] : t === 1 ? ['clasp', 2] : ['emit', 0];
  const KEY = { C: ['cover', 2], c: ['cover', 1], k: ['cover', 0], G: ['trim', t === 1 ? 2 : hi ? 0 : 3], g: ['trim', 1], E: emblem, R: ['emerald', 3], P: ['page', 3], p: ['page', 1], a: glyph };
  const P = [], SP = [];
  for (const b of [0, 1]) for (const s of [0, 1, 2]) {
    const when = (a, f) => bob(a, f) === b && state(a, f) === s, y = BY + b * BOBPX * 1;      // the book rises by one screen px on its bob frames
    const hw = [2.4, 3.0, 4.6][s];
    P.push({ bone: 'hips', mat: 'cover', part: 'book', shape: 'box', c: [BX, y, BZ], h: [hw, 3.0, 0.65], round: 0.25, when });
    if (s > 0) P.push({ bone: 'hips', mat: 'page', part: 'book', shape: 'box', c: [BX, y, BZ + 0.5], h: [hw - 0.4, 2.6, 0.2], round: 0.1, when });
    const front = s === 0 ? [closedS(t), closedSE(t), edgeE, edgeW] : s === 1 ? [halfS, halfSE, edgeE, edgeW] : [openS, openSE, edgeE, edgeW];
    const back = s === 2 ? ['GGGGGGGGGGGG', 'cCCCCCCCCCCk', 'cCCCCCCCCCCk', 'kkkkkkkkkkkk', 'cCCCCCCCCCCk', 'cCCCCCCCCCCk', 'GGGGGGGGGGGG'] : backN;
    const backE = s === 2 ? sel(back, [0, 1, 2, 3, 5, 6, 8, 9, 10, 11]) : backNE;
    SP.push({ bone: 'hips', at: [BX, y, BZ + 0.75], part: 'book', bias: 0.6, when, key: KEY, dirs: dirsFor(`grimoire.t${t}.${b}${s}`, front[0], front[1], front[2], front[3], back, backE) });
  }
  if (t === 6) for (const b of [0, 1]) {                                   // three hue runes hover above the cover
    const when = (a, f) => bob(a, f) === b, y = BY + 5.0 + b * BOBPX, R = ['aa..bb', 'aa..bb', '..cc..', '..cc..'], Rs = ['aabb', 'aabb', '.cc.', '.cc.'], Re = ['ab', 'ab', 'cc', 'cc'];
    SP.push({ bone: 'hips', at: [BX, y, BZ + 0.2], part: 'runes', bias: 0.4, when, key: { a: ['hueA', 0], b: ['hueB', 0], c: ['hueC', 0] },
      dirs: lintGrid('grimoire.t6.runes', { S: grid(R), SE: grid(Rs), SW: grid(Rs), E: grid(Re), W: grid(Re), NE: grid(Rs), N: grid(R), NW: grid(Rs) }) });
  }
  return piece('grimoire', 'offhand', t, { mats, prims: P, sprites: SP }, {
    sockets: sockets({ grimoire: { bone: 'hips', at: [BX, BY, BZ] }, gem: { bone: 'hips', at: [BX + 1.6, BY - 0.8, BZ + 0.8] }, runes: { bone: 'hips', at: [BX, BY + 5.0, BZ] } }),
  });
}
const pieces = {}; for (let t = 1; t <= 6; t++) pieces[`grimoire.t${t}`] = tier(t);
module.exports = { line: 'grimoire', pieces, tiers: [1, 2, 3, 4, 5, 6].map(t => [`grimoire.t${t}`]), bob, state };
