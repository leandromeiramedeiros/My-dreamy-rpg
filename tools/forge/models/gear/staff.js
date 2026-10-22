'use strict';
// STAFF LINE — staff.t1 .. staff.t5 + staff.t6 (Mythic) for the ref rig, 2H, class 'staff', carried upright on the weapon bone
// (every non-attack anim; the attack:staff aims come from the anim). The shaft is a volume; the head is a pixel part per facing
// (front() makes the 8 grids from one drawing), because a crescent / ring / star has to read crisp from every side.
//   T1 Willow Wand: forked willow with two buds   T2 Starfall: gold crescent cradling a star   T3 Comet Rod: ember orb + tail
//   T4 Nebula Sceptre: silver ring round a violet gem, two stars   T5 Night Eternal: crescent + stars made of light
//   T6 Mythic: T5 + an ember crown of hue-cycling flames.  Sockets: tip / weaponTip (above the head), gem (head centre).
const C = require('./common.js');
const { PAL, EMIT, metal, gemOf, flat, piece, sockets, notAttack, front, lintGrid } = C;

const AIM = a => a === 'cast' ? [0.05, 1, 0.3] : a === 'hit' ? [-0.3, 0.9, -0.3] : a === 'dash' ? [-0.2, 0.3, -0.95] : [0.04, 1, 0.12];
const TOP = 8.4;                                        // shaft top, ref px above the grip
// head drawings, 10 wide, stem at columns 4-5 along the bottom rows. letters are keyed per tier below
const HEAD = {
  1: ['gG......Gg', 'gg......gg', '.wW....Ww.', '..wW..Ww..', '...wWWw...', '....wW....', '....wW....'],
  2: ['....SS....', '....SS....', 'gG..SS..Gg', 'gG..SS..Gg', 'gGg....gGg', '.gGGggGGg.', '..ggGGgg..', '....dD....', '....dD....'],
  3: ['......tt..', '.....tTt..', '..ooOOT...', '.ooOOOOo..', '.oOOOOOo..', '.oOOOOoo..', '..ooooo...', '...gGG....', '....dD....'],
  4: ['.SS....SS.', '.SS....SS.', '..rRRRRr..', '.rRMMMMRr.', '.RMMNNMMR.', '.RMMNNMMR.', '.rRMMMMRr.', '..rRRRRr..', '....dD....'],
  5: ['.SS....SS.', '.SS.LL.SS.', '..LLLLLL..', '.LLL..LLL.', '.LL....LL.', '.LLL..LLL.', '..LLLLLL..', '....LL....', '....LL....'],
  6: ['a.b.cc.b.a', 'aabbccbbaa', '..LLLLLL..', '.LLL..LLL.', '.LL.GG.LL.', '.LL.GG.LL.', '.LLL..LLL.', '..LLLLLL..', '....LL....'],
};
function tier(t) {
  const hi = t >= 5;
  const SHAFT = hi ? flat(EMIT.dawn, 2) : t === 4 ? { ramp: PAL.darkwood } : { ramp: PAL.wood };
  const mats = { shaft: SHAFT, gold: metal(PAL.gold), silver: metal(PAL.silver), leaf: gemOf(PAL.emerald), orb: gemOf(PAL.ruby), gem: gemOf(PAL.amethyst), star: flat(EMIT.dawn, 2), starV: flat(EMIT.violet, 2),
    emit: flat(EMIT.sun, 2), emitA: flat(EMIT.aurora, 2), ember: flat(EMIT.ember, 2), wood: { ramp: PAL.wood }, hueA: flat('#ff8a5a', 2), hueB: flat('#ffd05a', 2), hueC: flat('#ff5a8a', 2) };
  const P = [
    { bone: 'weapon', mat: 'shaft', part: 'staff', shape: 'cap', a: [0, -5.0, 0], b: [0, TOP, 0], ra: 0.8, rb: 0.8 },
    { bone: 'weapon', mat: t === 1 ? 'wood' : hi ? 'emit' : 'gold', part: 'staff', shape: 'ell', c: [0, -5.2, 0], r: [0.95, 0.7, 0.95] },
  ];
  if (t >= 2 && t <= 4) P.push({ bone: 'weapon', mat: 'gold', part: 'staff', shape: 'ell', c: [0, TOP - 0.6, 0], r: [1.05, 0.45, 1.05] });       // collar
  if (t >= 3 && t <= 4) P.push({ bone: 'weapon', mat: 'gold', part: 'staff', shape: 'ell', c: [0, 3.0, 0], r: [1.0, 0.4, 1.0] });            // grip ring
  if (t === 6) P.push({ bone: 'weapon', mat: 'hueA', part: 'spine', shape: 'line', a: [0, 0, 0.5], b: [0, TOP - 1, 0.5], tone: 0, conn4: true });
  // head key per tier
  const K = {
    1: { g: ['leaf', 2], G: ['leaf', 3], w: ['wood', 1], W: ['wood', 2] },
    2: { S: ['star', 0], g: ['gold', 2], G: ['gold', 3], d: ['gold', 1], D: ['gold', 2] },
    3: { t: ['ember', 0], T: ['emit', 0], o: ['orb', 1], O: ['orb', 2], g: ['gold', 2], G: ['gold', 3], d: ['gold', 1], D: ['gold', 2] },
    4: { S: ['starV', 0], r: ['silver', 1], R: ['silver', 3], M: ['gem', 2], N: ['gem', 3], d: ['gold', 1], D: ['gold', 2] },
    5: { S: ['emitA', 0], L: ['emit', 0] },
    6: { S: ['emitA', 0], L: ['emit', 0], G: ['ember', 0], a: ['hueA', 0], b: ['hueB', 0], c: ['hueC', 0] },
  }[t];
  const rows = HEAD[t], W = rows[0].length, at = [W >> 1, rows.length - 2];
  const sprites = [{ bone: 'weapon', at: [0, TOP - 0.5, 0], part: 'head', bias: 0.9, key: K, dirs: lintGrid(`staff.t${t}.head`, front(rows, { at, minW: 2 })) }];
  return piece('staff', 'weapon', t, { mats, prims: P, sprites }, {
    class: 'staff',
    sockets: sockets({ tip: { bone: 'weapon', at: [0, TOP + 4, 0] }, weaponTip: { bone: 'weapon', at: [0, TOP + 4, 0] }, gem: { bone: 'weapon', at: [0, TOP + 1.6, 0.6] } }),
    pose: notAttack(a => ({ weapon: { aim: AIM(a) } })),
  });
}
const pieces = {}; for (let t = 1; t <= 6; t++) pieces[`staff.t${t}`] = tier(t);
module.exports = { line: 'staff', pieces, tiers: [1, 2, 3, 4, 5, 6].map(t => [`staff.t${t}`]), AIM };
