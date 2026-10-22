'use strict';
// WARDEN LINE — the knight set on the ref rig: chest `warden.tN`, head `knighthelm.tN`, boots `knightgreaves.tN`, six tiers.
//   T1 Iron Mail (plain iron, leather belt) / Iron Cap / Iron Boots
//   T2 Knight Plate (steel, brow band, cheek plates) / Knight Helm / Knight Greaves
//   T3 Sunforged Plate (gold trim, chest gem, red plume) / Sunguard Helm / Sunforged Greaves
//   T4 Aurora Plate (polished, emissive aurora trim, winged shoulders) / Aurora Visor (fins) / Aurora Greaves (ankle wings)
//   T5 Aegis of Dawn (made of light: flat emissive mats) / Crown of Dawn / Dawn Greaves
//   T6 Mythic Shardheart Plate (T5 + hue-cycling crystal shards) / Shardheart crown / Shardheart greaves
// Rarity is not baked: emissive mats are named emit* / hue*, sockets mark the gem / crest / ankle points for the runtime.
// Hybrid: the volumes (chest, pauldrons, arms, shins, feet) give the silhouette and the depth; the plate faces, the shoulder
// domes and the whole helm are pixel parts per facing (the chest drawings are the ref's PLATE recoloured, so they follow it).
// Helm: the head sprite's anchor and bias, the face stays visible through the helm's open cells (`hides:['hair']`).
const C = require('./common.js');
const { PAL, EMIT, SCALE, metal, gemOf, flat, piece, sockets, DIRN, lintGrid } = C;
const PARTS = require('../ref-parts.js');
const sc = C.sc;

const FRONT = ['S', 'SE', 'SW'];
const FLAT = [flat('#d49ac0', 2), flat('#f2c28e', 2), flat('#ffe8ae', 2), flat('#ffffff', 2)];   // dawn light, rose shadow to white, dark to bright
const HUE = { A: '#ff7a9a', B: '#7ad0ff', C: '#a8ff9a' };

// ---- palettes per tier ---------------------------------------------------------------------------------------------
const PLATE_RAMP = [PAL.iron, PAL.steel, PAL.steel, PAL.polish, null, null];
function tierMats(t) {
  const m = {};
  if (t <= 4) { m.plate = metal(PLATE_RAMP[t - 1]); m.plate.lift = 1; }
  else FLAT.forEach((f, i) => { m['light' + i] = f; });
  m.plate = m.plate || FLAT[1];
  m.strap = { ramp: t === 1 ? PAL.leather : PAL.cloth };
  m.trim = t === 3 ? metal(PAL.gold) : t === 4 ? flat(EMIT.aurora, 2) : t >= 5 ? flat(EMIT.dawn, 2) : metal(PAL.iron);
  m.gold = metal(PAL.gold);
  m.gem = gemOf(t === 3 ? PAL.sapphire : PAL.ruby);
  m.sleeve = { ramp: t === 1 ? PAL.leather : PAL.cloth };
  m.plume = { ramp: PAL.plume };
  if (t === 6) { m.hueA = flat(HUE.A, 2); m.hueB = flat(HUE.B, 2); m.hueC = flat(HUE.C, 2); }
  return m;
}
// sprite key per tier: char -> [mat, tone]; d a A L = plate shadow / low / mid / high, N = belt / collar, G = gold trim, X = gem
function plateKey(t) {
  const k = t >= 5 ? { d: ['light0', 0], a: ['light1', 0], A: ['light2', 0], L: ['light3', 0] } : { d: ['plate', 0], a: ['plate', 1], A: ['plate', 2], L: ['plate', 3] };
  k.N = t === 1 ? ['strap', 1] : t === 2 ? ['strap', 0] : t === 3 ? ['gold', 1] : ['trim', 0];
  k.G = t === 3 ? ['gold', 2] : ['trim', 0];
  k.X = ['gem', 3]; k.H = ['hueA', 0]; k.h = ['hueB', 0]; k.j = ['hueC', 0];
  return k;
}

// ---- chest sprites: the ref's PLATE drawings, with a gem on the front views from T3 ------------------------------------
function plateDirs(t) {
  const out = {};
  for (const d of DIRN) {
    const g = PARTS.PLATE[d], rows = g.rows.map(r => r.split(''));
    if (t >= 3 && FRONT.includes(d)) {
      const r3 = g.rows[3], first = r3.indexOf('A'), last = r3.lastIndexOf('A'), c = Math.floor((first + last) / 2);
      const ch = t === 6 ? 'H' : 'X';
      rows[3][c] = ch; rows[3][c + 1] = ch; rows[4][c] = ch; rows[4][c + 1] = ch;
    }
    out[d] = { at: g.at, rows: rows.map(r => r.join('')) };
  }
  return lintGrid(`warden.t${t}.plate`, out);
}
// shoulder domes: one drawing for every facing, grown per tier (T4 winged spike, T5 light, T6 crystal tips)
const DOMES = {
  1: { at: [2, 1], rows: ['.LLA.', 'LLAAa', 'aaAaa'] },
  2: { at: [3, 1], rows: ['.LLAA.', 'LLAAAa', 'aaAAaa'] },
  3: { at: [3, 2], rows: ['.GGGG.', 'LLLAAa', 'LLAAaa', 'aaAAaa'] },
  4: { at: [3, 2], rows: ['..LL..', '.LLAA.', 'LLAAaa', '.GGGG.'] },
  5: { at: [3, 2], rows: ['..LL..', '.LLAA.', 'LLAAaa', '.GGGG.'] },
  6: { at: [3, 2], rows: ['..HH..', '.HHAA.', 'LLAAaa', '.GGGG.'] },
};
const domeDirs = t => lintGrid(`warden.t${t}.dome`, Object.fromEntries(DIRN.map(d => [d, DOMES[t]])));

// ---- chest -------------------------------------------------------------------------------------------------------------
const TX = [3.9, 4.3, 4.4, 4.5, 4.6, 4.6], TY = [3.2, 3.3, 3.3, 3.4, 3.4, 3.4], TZ = [3.5, 3.8, 3.9, 4.0, 4.0, 4.0];
const PR = [1.7, 1.9, 2.05, 2.2, 2.3, 2.3];
function chest(t) {
  const i = t - 1, mats = tierMats(t), P = [], S = [];
  P.push({ bone: 'chest', mat: 'plate', part: 'torso', shape: 'ell', c: [0, 2.4, 0.2], r: [TX[i], TY[i], TZ[i]] });
  P.push({ bone: 'spine', mat: 'strap', part: 'torso', shape: 'box', c: [0, 0.9, 0], h: [3.4, 0.75, 2.4], round: 0.5 });
  for (const [sd, k] of [['R', -1], ['L', 1]]) {
    P.push({ bone: 'upper' + sd, mat: 'plate', part: 'pauldron' + sd, shape: 'ell', c: [0.3 * k, -0.2, 0], r: [PR[i], PR[i] + 0.1, PR[i] + 0.2] });
    P.push({ bone: 'upper' + sd, mat: 'sleeve', part: 'arm' + sd, shape: 'cap', a: [0, -0.5, 0], b: [0, -3.1, 0], ra: 1.25, rb: 1.2 });
    P.push({ bone: 'fore' + sd, mat: 'plate', part: 'arm' + sd, shape: 'cap', a: [0, 0, 0], b: [0, -2.0, 0], ra: 1.25 + 0.05 * (t > 1), rb: 1.15 });
    P.push({ bone: 'shin' + sd, mat: 'strap', part: 'knee' + sd, shape: 'cap', a: [0, -0.3, 0], b: [0.3 * k, -1.4, 0], ra: 1.4, rb: 1.35 });
    S.push({ bone: 'upper' + sd, at: [0.3 * k, -0.2, 2.4], part: 'pauldron' + sd, key: plateKey(t), dirs: domeDirs(t) });
  }
  S.unshift({ bone: 'chest', at: [0, 2.4, 4.2], part: 'torso', key: plateKey(t), dirs: plateDirs(t) });
  return piece('warden', 'chest', t, { bias: 0.7, mats, prims: P, sprites: S }, {
    sockets: sockets({ gem: { bone: 'chest', at: [0, 2.4, 4.6] }, pauldronL: { bone: 'upperL', at: [0.3, 0.6, 2.4] }, pauldronR: { bone: 'upperR', at: [-0.3, 0.6, 2.4] } }),
  });
}

// ---- helm ---------------------------------------------------------------------------------------------------------------
// Silhouette masks on the head sprite's own grid (ref-parts HEAD): '#' helm (shaded below), 'b' brow band, '.' open (the face
// sprite shows through). Anchors and bias are the head's.
const MASK = {
  S: ['.....####.....', '...########...', '..##########..', '.############.', '.############.', '.############.', '.bbbbbbbbbbbb.', '..##########..', '..##......##..', '..##......##..', '...##....##...'],
  SE: ['......####....', '....########..', '...##########.', '..############', '.#############', '.#############', '.bbbbbbbbbbbbb', '..###########.', '..#####.....##', '..#####.....##', '...####.......'],
  E: ['...#######...', '..#########..', '.###########.', '.###########.', '.###########.', '.bbbbbbbbbbb.', '..#########..', '..#######....', '...#####.....', '....###......'],
  NE: ['.....####.....', '...########...', '..##########..', '.############.', '.#############', '.bbbbbbbbbbbb.', '..##########..', '...#########..', '....#######...'],
  N: ['.....####.....', '...########...', '..##########..', '.############.', '.############.', '.bbbbbbbbbbbb.', '..##########..', '...########...', '....######....'],
};
const mir = rows => rows.map(r => r.split('').reverse().join(''));
MASK.SW = mir(MASK.SE); MASK.W = mir(MASK.E); MASK.NW = mir(MASK.NE);
// head sprite anchors (ref-parts HEAD): the helm is drawn on the same cell as the face it covers
const HEAD_AT = Object.fromEntries(DIRN.map(d => [d, PARTS.HEAD[d].at]));
const BACK = ['NE', 'N', 'NW'];
// light from the screen left, above: L on the left / top edge, d on the right edge and the lower rows
function shade(rows) {
  const H = rows.length, out = rows.map(r => r.split(''));
  rows.forEach((row, y) => {
    for (const m of row.matchAll(/#+/g)) {
      const x0 = m.index, x1 = m.index + m[0].length - 1, w = x1 - x0;
      for (let x = x0; x <= x1; x++) {
        const f = w ? (x - x0) / w : 0.5, v = f * 0.75 + (y / H) * 0.3;
        let c = v < 0.2 ? 'L' : v < 0.5 ? 'A' : v < 0.78 ? 'a' : 'd';
        if (y === 0) c = f < 0.55 ? 'L' : 'A';
        if (x === x1 && w >= 2) c = 'd';
        if (x === x0 && w >= 2 && y < H - 2) c = 'L';
        out[y][x] = c;
      }
    }
  });
  return out.map(r => r.join(''));
}
// pad a grid by (l, t) cells on the left / top and r, b on the right / bottom
const pad = (rows, l, r, t, b) => { const w = rows[0].length + l + r; return [...Array(t).fill('.'.repeat(w)), ...rows.map(x => '.'.repeat(l) + x + '.'.repeat(r)), ...Array(b).fill('.'.repeat(w))]; };
const put = (R, x, y, s) => { for (let i = 0; i < s.length; i++) if (s[i] !== '.' && R[y] && x + i >= 0 && x + i < R[y].length) R[y][x + i] = s[i]; };
function helmDir(t, d) {
  let M = MASK[d]; const back = BACK.includes(d);
  if (t === 1) M = M.map((r, y) => y === 0 || y > 6 ? '.'.repeat(r.length) : r.replace(/^(\.*)[#b]/, '$1.').replace(/[#b](\.*)$/, '.$1'));   // Iron Cap: a narrower dome and brim, the face is open
  let rows = shade(M);
  // the brow band: iron dark / steel dark / gold / aurora / light
  const bch = t <= 2 || t === 4 ? 'a' : 'G';
  rows = C.heal(rows.map((r, y) => M[y].split('').map((c, x) => c === 'b' ? bch : r[x]).join('')));
  const L = 3, T = 6, W = rows[0].length;
  let R = pad(rows, L, L, T, 0).map(r => r.split(''));
  const cx = L + Math.round((M[0].indexOf('#') + M[0].lastIndexOf('#')) / 2);   // dome centre column at the top row
  const top = T;                                                                  // R row of the dome's first row
  const side = d === 'E' || d === 'W';
  const left = M[3].indexOf('#') + L, right = M[3].lastIndexOf('#') + L;
  if (t >= 3 && t !== 5) {                                                      // plume (T3) / crest of fins (T4, T6)
    const c = t === 3 ? 'p' : 'G';
    put(R, cx - 1, top - 3, c + c); put(R, cx - 1, top - 2, c + c); put(R, cx - 1, top - 1, c + c);
    if (t === 3) { put(R, cx - 2, top - 2, 'p'); put(R, cx - 2, top - 1, 'p'); }
  }
  if (t >= 4 && !side) {                                                        // fins: swept-up wings beside the dome
    const yy = top + 2;
    put(R, left - 2, yy - 1, 'GG'); put(R, left - 3, yy - 2, 'GG'); put(R, left - 2, yy, 'GG');
    put(R, right + 1, yy - 1, 'GG'); put(R, right + 2, yy - 2, 'GG'); put(R, right + 1, yy, 'GG');
  }
  if (t >= 5) {                                                                 // crown of light: a tall centre spike, two short ones on the dome's shoulders
    for (const dx of [-3, 3]) { put(R, cx + dx - 1, top - 1, 'HH'); put(R, cx + dx - 1, top, 'HH'); }
    for (let k = 1; k <= 3; k++) put(R, cx - 1, top - k, 'HH');
  }
  if (t === 6) { put(R, cx - 1, top - 5, 'hh'); put(R, cx - 1, top - 4, 'hh'); }
  let g = R.map(r => r.join(''));
  while (g.length && !/[^.]/.test(g[0]) && false) g.shift();
  return { at: [HEAD_AT[d][0] + L, HEAD_AT[d][1] + T], rows: g, bias: back ? 7 : 3 };
}
function helmKey(t) {
  const k = t >= 5 ? { d: ['light0', 0], a: ['light1', 0], A: ['light2', 0], L: ['light3', 0] } : { d: ['plate', 0], a: ['plate', 1], A: ['plate', 2], L: ['plate', 3] };
  k.G = t === 3 ? ['gold', 2] : t === 4 ? ['trim', 0] : ['trim', 0];
  k.p = ['plume', 2]; k.H = t === 6 ? ['hueA', 0] : ['trim', 0]; k.h = ['hueB', 0];
  return k;
}
function helm(t) {
  const mats = tierMats(t), dirs = {};
  for (const d of DIRN) dirs[d] = helmDir(t, d);
  const p = piece('knighthelm', 'head', t, { mats, prims: [], sprites: [{ bone: 'head', at: [0, 1.0, 2.5], part: 'head', key: helmKey(t), dirs: lintGrid(`knighthelm.t${t}`, dirs) }] },
    { hides: ['hair'], sockets: sockets({ crest: { bone: 'head', at: [0, 9.2, 0] }, visor: { bone: 'head', at: [0, 4.2, 3.6] } }) });
  return p;
}

// ---- boots --------------------------------------------------------------------------------------------------------------
function boots(t) {
  const mats = tierMats(t), P = [], i = t - 1;
  mats.plate = t >= 5 ? FLAT[1] : (t === 1 ? metal(PAL.iron) : mats.plate);
  mats.cuff = t >= 5 ? FLAT[2] : t === 3 ? metal(PAL.gold) : metal(PLATE_RAMP[Math.min(i, 3)]);
  for (const [sd, k] of [['R', -1], ['L', 1]]) {
    P.push({ bone: 'shin' + sd, mat: 'plate', part: 'boot' + sd, shape: 'cap', a: [0.3 * k, -1.6, 0], b: [0.6 * k, -4.6, 0], ra: 1.35 + 0.05 * (t > 1), rb: 1.3 });
    P.push({ bone: 'foot' + sd, mat: 'plate', part: 'boot' + sd, shape: 'ell', c: [0, -0.3, 0.4], r: [1.35, 1.35, 1.75], clip: [0, -1, 0, 1.2] });
    if (t >= 2) P.push({ bone: 'shin' + sd, mat: 'cuff', part: 'boot' + sd, shape: 'ell', c: [0.3 * k, -1.7, 0.1], r: [1.65, 0.55, 1.65] });
    if (t >= 3) P.push({ bone: 'foot' + sd, mat: 'cuff', part: 'boot' + sd, shape: 'ell', c: [0, -0.7, 1.9], r: [0.9, 0.8, 0.9], clip: [0, -1, 0, 1.0] });
    if (t >= 4) for (const dy of [0, 0.9]) P.push({ bone: 'shin' + sd, mat: t === 6 ? 'hueA' : 'trim', part: 'wing' + sd, shape: 'line', a: [1.0 * k, -3.6 + dy, -0.8], b: [2.7 * k, -2.5 + dy, -1.0], tone: 0, conn4: true });
  }
  return piece('knightgreaves', 'boots', t, { bias: 0.3, mats, prims: P, sprites: [] },
    { sockets: sockets({ ankleL: { bone: 'shinL', at: [1.0, -3.6, -0.8] }, ankleR: { bone: 'shinR', at: [-1.0, -3.6, -0.8] } }) });
}

const pieces = {};
for (let t = 1; t <= 6; t++) { pieces[`warden.t${t}`] = chest(t); pieces[`knighthelm.t${t}`] = helm(t); pieces[`knightgreaves.t${t}`] = boots(t); }
module.exports = { line: 'warden', pieces, tiers: [1, 2, 3, 4, 5, 6].map(t => [`warden.t${t}`, `knighthelm.t${t}`, `knightgreaves.t${t}`]) };
