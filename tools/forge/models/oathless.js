'use strict';
// THE OATHLESS (`oathless`, the Warden Crypt mini-boss: shield-wall, cleave, gloom-bolt volley) — the Gloom Knight's body
// (models/gloomknight.js kit) at x1.5 and bulkier plate: a knight with no face (the helm's front is an empty void with a dim
// violet rim), a greatsword, a tower shield with a broken oath-sigil. About 52 px tall (hero ~31). Frame 92 x 96, origin
// (46, 80). Two rigs (two bank files under the 160 KB cap): `oathless` (idle 4, walk 4, hit, death 3) and `oathless_moves`
// (attack 6 = the cleave: wind f0-1, swing f2-3, open f4-5; wall 1 = the shield raised before it, held; volley 2 = the
// greatsword raised, then thrust: the bolts leave). render.js maps the boss move state. Sockets: head, chest, handR, tip.
const K = require('./ekit.js');
const { merge, arms, legs } = K;
const G = require('./gloomknight.js').kit;

function make(part) {
  const prims = [
    ...G.bodyPrims({ s: 1.15 }).filter(p => !(p.part === 'helm' && p.shape === 'box')),
    // the faceless helm: the face plate is a dark void with a rim
    { bone: 'head', mat: 'void', part: 'void', shape: 'ell', c: [0, 2.6, 2.6], r: [2.4, 2.8, 1.2] },
    { bone: 'head', mat: 'trim', part: 'helm', shape: 'disc', c: [0, 2.6, 2.4], r: [2.9, 0.4, 1.4], rot: [Math.PI / 2, 0, 0] },
    // a ragged half-cape over the left pauldron
    { bone: 'chest', mat: 'cloth', part: 'cape', shape: 'box', c: [2.8, -1.0, -3.4], h: [2.6, 5.4, 0.5], round: 0.4, rot: [0.15, 0, 0.1] },
    ...G.sword(18, 1.0),
    ...G.shield(1.35),
  ];
  const HOLD = [-0.3, -0.3, 0.9];   // the greatsword's point forward and low (pointed down, it sank below the feet)
  const hold = (a, f) => ({ weapon: { aim: a === 'hit' ? [-0.3, 0.6, -0.7] : HOLD } });
  const wall = { frames: 1, ms: [600], pose: () => merge(arms([-0.25, -0.8, 0.5], [-0.2, -0.4, 0.9], [0.25, -0.1, 0.96], [0.05, 0.98, 0.15]),
    legs(0.3, 0.35, -0.35, -0.4, 0.3, 0.1), { hips: { off: [0, -1.4, 0] }, chest: { rot: [0.15, 0.15, 0] }, weapon: { aim: [-0.4, -0.5, 0.76] } }) };
  const volley = { frames: 2, ms: [400, 300], pose: f => [
    merge(arms([-0.4, 0.88, 0.25], [-0.2, 0.95, 0.2], [0.4, -0.5, 0.75], [0.2, -0.1, 0.97]), legs(0.1, 0.15, -0.2, -0.2, 0.15, 0.05), { chest: { rot: [-0.2, -0.1, 0] }, head: { rot: [-0.15, 0, 0] }, weapon: { aim: [0, 1, -0.05] } }),
    merge(arms([-0.25, 0.3, 0.92], [-0.05, 0.3, 0.95], [0.4, -0.6, 0.7], [0.2, -0.2, 0.96]), legs(0.3, 0.25, -0.3, -0.35, 0.2, 0.15), { hips: { off: [0, -1, 0.6] }, chest: { rot: [0.2, 0, 0] }, weapon: { aim: [0, 0.55, 0.84] } }),
  ][f] };
  const PARTS = {
    base: { idle: K.idle4(1.5, hold), walk: K.walk4(1.5, hold), hit: K.hit(1.5, hold), death: K.offs(G.death, 1.5) },
    moves: { wall: K.offs(wall, 1.5), volley: K.offs(volley, 1.5), attack: K.offs(G.attack, 1.5), idle: { frames: 1, ms: [600], pose: () => K.idle4(1.5, hold).pose(0) }, walk: { frames: 1, ms: [600], pose: () => K.idle4(1.5, hold).pose(0) } },   // idle / walk 1 = the rest pose (one deduped cell): the moves rig's probe / fallback frame (forge-rt-check reads sockets on idle S 0)
  };
  return K.scaleModel(Object.assign({
    name: part === 'base' ? 'oathless' : 'oathless_' + part,
    frame: [92, 96], origin: [46, 80],
    bankSheets: part === 'base' ? { mv: ['walk'], die: ['hit', 'death'] } : {},
    bones: G.bones(),
    layers: [{ id: 'body', group: 'body', prims, stamps: [],
      mats: Object.assign({}, G.MATS, { void: { ramp: ['#1e1d21', '#28262e', '#322e3f', '#3e3650'] }, trim: { ramp: ['#2d113d', '#4a1a66', '#7030a0', '#a060d8'], lift: 1 } }) }],
    anims: PARTS[part], sheetAnims: Object.keys(PARTS[part]),
    sockets: { head: { bone: 'head', at: [0, 7.4, 0] }, chest: { bone: 'chest', at: [0, 1.4, 0] }, handR: { bone: 'handR', at: [0, -0.8, 0] }, tip: { bone: 'weapon', at: [0, 19, 0] } },
    dirs: K.DIRS8,
  }, K.BASE), 1.5);
}

module.exports = make('base');
Object.defineProperty(module.exports, 'make', { value: make, enumerable: false });
