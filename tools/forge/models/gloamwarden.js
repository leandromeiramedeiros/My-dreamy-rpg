'use strict';
// THE GLOAM WARDEN (`gloamwarden`; the boss row is ENEMY.boss: cleave, slam, volley, charge, voidrain, the phase-2 roar) — a
// forge boss on the humanoid bone names (models/ekit.js, models/gloomknight.js kit bones) built x1.8: a tall hooded warden
// that floats (no legs: a long ragged robe ending a hand over the ground), a faceless void under the hood with two pink eyes,
// two pale horns through the hood, a violet-trimmed mantle, a long glaive in the right hand and a pink lantern on a chain in
// the left. About 62 px tall (hero ~31). Frame 108 x 112, origin (54, 94). Every pixel from volumes (eyes: surface stamps; the
// chain: a 1 px line). Units are pixels (x1.8 at build), y up, it faces +z; its RIGHT side is -x.
// Two rigs (two bank files under the 160 KB cap): `gloamwarden` (idle 4, walk 4 = it glides, hit, death 3 = the robe
// collapses, roar 1 = arms and lantern flung wide) and `gloamwarden_moves` (attack 6 = the cleave: wind f0-1, swing f2-3,
// open f4-5; slam 2 = the glaive raised in both hands, then driven down; volley 2 = the lantern raised high, then thrust out;
// charge 1 = leaning in, the glaive levelled). render.js maps the boss move state. Sockets: head, chest, handR, tip, lantern.
const K = require('./ekit.js');
const { merge, arms } = K;
const G = require('./gloomknight.js').kit;
const SIDES = [['R', -1], ['L', 1]];
const SC = 1.8;

function make(part) {
  const bones = [...G.bones(), { name: 'offhand', parent: 'handL', at: [0, -0.6, 0] }];
  const prims = [
    // the hood: a void face, the cowl (open at the front), a tall peak falling back, two pale horns through it
    { bone: 'head', mat: 'void', part: 'face', shape: 'ell', c: [0, 2.8, 1.0], r: [2.9, 3.1, 2.8] },
    { bone: 'head', mat: 'robe', part: 'hood', shape: 'ell', c: [0, 3.4, -0.6], r: [4.2, 4.6, 4.2], clip: [0, 0, 1, 1.9] },
    { bone: 'head', mat: 'robe', part: 'hood', shape: 'cap', a: [0, 6.2, -1.4], b: [0, 9.6, -4.4], ra: 2.2, rb: 0.5 },
    { bone: 'head', mat: 'trim', part: 'hood', shape: 'disc', c: [0, 3.2, 3.0], r: [3.5, 0.45, 1.2], rot: [Math.PI / 2 - 0.15, 0, 0] },
    ...SIDES.flatMap(([, k]) => [
      { bone: 'head', mat: 'horn', part: 'horn', shape: 'cap', a: [2.6 * k, 6.0, 0], b: [4.6 * k, 8.6, -1.4], ra: 0.9, rb: 0.6 },
      { bone: 'head', mat: 'horn', part: 'horn', shape: 'cap', a: [4.6 * k, 8.6, -1.4], b: [5.0 * k, 11.0, -3.4], ra: 0.6, rb: 0.2 },
    ]),
    // the mantle (a wide shoulder cape with a violet edge), the chest, a clasp
    { bone: 'chest', mat: 'robe', part: 'torso', shape: 'ell', c: [0, 1.4, 0], r: [4.2, 5.0, 3.2] },
    { bone: 'chest', mat: 'mantle', part: 'mantle', shape: 'ell', c: [0, 3.6, -0.4], r: [6.4, 2.8, 4.4], clip: [0, -1, 0, 1.2] },
    { bone: 'chest', mat: 'trim', part: 'mantle', shape: 'disc', c: [0, 2.5, -0.4], r: [6.5, 0.5, 4.5] },
    { bone: 'chest', mat: 'mantle', part: 'cape', shape: 'box', c: [0, -3.6, -3.6], h: [4.8, 7.2, 0.6], round: 0.5, rot: [0.1, 0, 0] },
    { bone: 'chest', mat: 'glow', part: 'clasp', shape: 'ell', c: [0, 3.8, 3.4], r: [0.9, 0.9, 0.5] },
    // the robe: a long bell from the hips to a hand over the ground, a ragged hem of strips, a sash
    { bone: 'hips', mat: 'robe', part: 'robe', shape: 'cap', a: [0, 2.0, 0], b: [0, -9.4, -0.4], ra: 3.6, rb: 5.8, clip: [0, -1, 0, 11.0] },
    ...Array.from({ length: 8 }, (_, i) => { const a = 2 * Math.PI * i / 8 + 0.3; return { bone: 'hips', mat: i % 2 ? 'robe' : 'mantle', part: 'robe', shape: 'box', c: [5.4 * Math.sin(a), -10.4 - (i % 3) * 0.5, -0.4 + 5.4 * Math.cos(a)], h: [1.1, 1.3, 0.45], round: 0.3, rot: [0, a, 0] }; }),
    { bone: 'hips', mat: 'trim', part: 'robe', shape: 'disc', c: [0, 0.8, 0], r: [4.0, 0.55, 3.4] },
    { bone: 'hips', mat: 'trim', part: 'robe', shape: 'cap', a: [-1.6, 0.4, 3.2], b: [-2.2, -5.0, 4.4], ra: 0.5, rb: 0.4 },
    // arms: wide robe sleeves, pale bone hands
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'robe', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.4, 0], ra: 1.5, rb: 1.4 },
      { bone: 'fore' + s, mat: 'robe', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.4, 0], ra: 1.5, rb: 2.2 },
      { bone: 'fore' + s, mat: 'trim', part: 'arm' + s, shape: 'disc', c: [0, -3.4, 0], r: [2.2, 0.35, 2.2] },
      { bone: 'hand' + s, mat: 'horn', part: 'arm' + s, shape: 'ell', c: [0, -0.7, 0], r: [1.0, 1.2, 1.0] },
    ]),
    // the glaive (weapon bone, +y up the shaft): a dark shaft, a collar, a long curved blade, a butt spike
    { bone: 'weapon', mat: 'wood', part: 'glaive', shape: 'cap', a: [0, -6.0, 0], b: [0, 16.0, 0], ra: 0.55, rb: 0.55 },
    { bone: 'weapon', mat: 'trim', part: 'glaive', shape: 'cap', a: [0, 15.6, 0], b: [0, 17.0, 0], ra: 0.9, rb: 0.9 },
    { bone: 'weapon', mat: 'blade', part: 'glaive', shape: 'box', c: [0, 19.6, 0.6], h: [0.35, 2.8, 1.3], round: 0.2, rot: [0.25, 0, 0] },
    { bone: 'weapon', mat: 'blade', part: 'glaive', shape: 'cap', a: [0, 22.0, 1.6], b: [0, 24.4, 0.4], ra: 0.9, rb: 0.2 },
    { bone: 'weapon', mat: 'trim', part: 'glaive', shape: 'cap', a: [0, -6.0, 0], b: [0, -7.6, 0], ra: 0.6, rb: 0.2 },
    // the lantern (offhand bone, hanging): a 1 px chain, a bronze cage around a pink flame
    { bone: 'offhand', mat: 'chain', part: 'chain', shape: 'line', a: [0, 0, 0], b: [0, -2.6, 0] },
    { bone: 'offhand', mat: 'bronze', part: 'lantern', shape: 'cap', a: [0, -2.6, 0], b: [0, -3.4, 0], ra: 0.5, rb: 1.3 },
    { bone: 'offhand', mat: 'glow', part: 'lantern', shape: 'ell', c: [0, -5.0, 0], r: [1.5, 1.8, 1.5] },
    ...[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + Math.PI / 4; return { bone: 'offhand', mat: 'bronze', part: 'lantern', shape: 'cap', a: [1.5 * Math.cos(a), -3.4, 1.5 * Math.sin(a)], b: [1.5 * Math.cos(a), -6.6, 1.5 * Math.sin(a)], ra: 0.3, rb: 0.3 }; }),
    { bone: 'offhand', mat: 'bronze', part: 'lantern', shape: 'disc', c: [0, -6.8, 0], r: [1.8, 0.4, 1.8] },
  ];
  const layers = [{
    id: 'body', group: 'body', prims,
    mats: { robe: { ramp: ['#1f1c2b', '#2d2141', '#382954', '#433167'] }, mantle: { ramp: ['#241835', '#2c1848', '#43286a', '#5e3c8c'] },
      void: { ramp: ['#1e1d21', '#27262e', '#302f3d', '#3b374f'] }, trim: { ramp: ['#3a1450', '#62227e', '#9040b4', '#c070e0'], lift: 1 },
      horn: { ramp: ['#7a6e86', '#a89cb4', '#d2c8dc', '#f2ecf8'], lift: 1 }, wood: ['#211c25', '#2e2334', '#3a2c40', '#4c3c54'],
      blade: { ramp: ['#3a2e5a', '#6a5a96', '#a494cc', '#d8ccf4', '#ffffff'], spec: 0.9 }, chain: { ramp: ['#8a7aa0', '#8a7aa0', '#8a7aa0', '#8a7aa0'], flat: 0 },
      bronze: { ramp: ['#3a2414', '#6a4422', '#9a6a34', '#c89a50', '#f6dc98'], spec: 0.9 }, glow: { ramp: ['#d0409a', '#ff6ec4', '#ffaee0', '#fff0fa'], lift: 2 } },
    stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.1 * k, 3.0, 3.7], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'void', px: [[0, 0, '#ff7ae0'], [k < 0 ? -1 : 1, 0, '#ff7ae0'], [0, 1, '#a03a8a']] })),
  }];
  // ---- anims (hero-scale offsets; x SC with the model) ----
  const lantern = (d = [0.08, -1, 0.12]) => ({ offhand: { point: d } });
  const STAFF = [0.12, 0.97, 0.2];   // the glaive held upright at rest, like a staff
  const hold = (a, f) => Object.assign({ weapon: { aim: a === 'hit' ? [-0.2, 0.85, -0.5] : STAFF } }, lantern(a === 'walk' ? [0.1, -1, -0.3] : undefined));
  const idle = K.idle4(1, hold), hit = K.hit(1, hold);
  const walk = { frames: 4, ms: [180, 180, 180, 180], pose: f => { const s = [1, 0, -1, 0][f];
    return merge(arms([-0.15, -1, 0.1 - 0.15 * s], [-0.05, -0.85, 0.35], [0.15, -1, 0.1 + 0.15 * s], [0.05, -0.9, 0.3]),
      { hips: { off: [0, [0, 0.5, 0, 0.5][f], 0], rot: [0.12, 0, 0.04 * s] }, chest: { rot: [0.08, -0.08 * s, 0] } }, hold('walk', f)); } };
  const roar = { frames: 1, ms: [800], pose: () => merge(arms([-0.75, 0.35, 0.3], [-0.5, 0.8, 0.2], [0.75, 0.45, 0.3], [0.5, 0.8, 0.25]),
    { hips: { off: [0, 0.6, -0.4] }, chest: { rot: [-0.3, 0, 0] }, head: { rot: [-0.4, 0, 0] }, weapon: { aim: [-0.3, 0.9, 0.3] } }, lantern([0.2, -1, 0.3])) };
  const death = {
    frames: 3, ms: [200, 220, 500],
    pose: f => [
      merge(arms([-0.5, -0.3, -0.8], [-0.3, -0.1, -0.95]), { hips: { off: [0, -0.4, -0.8], rot: [-0.15, 0, 0] }, chest: { rot: [-0.35, 0.1, 0] }, head: { rot: [-0.35, 0, 0] }, weapon: { aim: [-0.4, 0.8, -0.45] } }, lantern([0.4, -1, -0.4])),
      merge(arms([-0.4, -0.9, 0.2], [-0.2, -0.95, 0.3]), { hips: { off: [0, -3.0, 0], scl: [1.15, 0.6, 1.15] }, chest: { rot: [0.35, 0, 0.12] }, head: { rot: [0.3, 0, 0] }, weapon: { aim: [-0.6, 0.3, 0.75] } }, lantern([0.6, -0.8, 0.4])),
      merge(arms([-0.6, -0.5, 0.6], [-0.4, -0.3, 0.86]), { hips: { off: [0, -6.4, 0.6], scl: [1.35, 0.32, 1.35] }, spine: { rot: [0.7, 0, 0.1] }, chest: { rot: [0.4, 0, 0] }, head: { rot: [0.3, 0, 0] }, weapon: { aim: [-0.95, -0.1, 0.3] } }, lantern([0.8, -0.2, 0.6])),
    ][f],
  };
  // the cleave: the knight's chop, two-handed reach on the glaive; the lantern swings with it
  const attack = { frames: 6, ms: G.attack.ms, pose: f => merge(G.attack.pose(f), lantern([[0.3, -0.9, -0.3], [0.3, -0.9, -0.4], [0.1, -0.9, 0.45], [0, -0.85, 0.5], [0.05, -0.95, 0.3], [0.08, -1, 0.12]][f])) };
  // the slam: the glaive raised high in both hands -> driven into the ground before it
  const slam = { frames: 2, ms: [500, 400], pose: f => [
    merge(arms([-0.4, 0.88, 0.25], [-0.15, 0.95, 0.25], [0.3, 0.85, 0.4], [0.1, 0.95, 0.3]), { hips: { off: [0, 1.0, -0.6] }, chest: { rot: [-0.25, 0, 0] }, head: { rot: [-0.2, 0, 0] }, weapon: { aim: [0, 0.75, -0.66] } }, lantern([0.3, -0.8, -0.5])),
    merge(arms([-0.25, -0.3, 0.92], [-0.05, -0.55, 0.83], [0.25, -0.3, 0.92], [0.05, -0.55, 0.83]), { hips: { off: [0, -1.6, 1.4] }, chest: { rot: [0.45, 0, 0] }, head: { rot: [0.1, 0, 0] }, weapon: { aim: [0, -0.7, 0.71] } }, lantern([0.1, -0.7, 0.7])),
  ][f] };
  // the volley: the lantern raised high overhead -> thrust out before it (the bolts leave)
  const volley = { frames: 2, ms: [400, 300], pose: f => [
    merge(arms([-0.3, -0.9, 0.3], [-0.1, -0.6, 0.8], [0.3, 0.92, 0.2], [0.1, 0.98, 0.1]), { chest: { rot: [-0.2, 0.15, 0] }, head: { rot: [-0.25, 0, 0] }, weapon: { aim: STAFF } }, lantern([0.1, -1, 0.1])),
    merge(arms([-0.3, -0.9, 0.3], [-0.1, -0.6, 0.8], [0.25, 0.25, 0.94], [0.1, 0.3, 0.95]), { hips: { off: [0, -0.4, 0.8] }, chest: { rot: [0.2, -0.1, 0] }, weapon: { aim: STAFF } }, lantern([0.1, -0.6, 0.8])),
  ][f] };
  // the charge: leaning in hard, the glaive levelled before it
  const charge = { frames: 1, ms: [500], pose: () => merge(arms([-0.3, -0.35, 0.89], [-0.1, -0.1, 0.99], [0.35, -0.5, 0.8], [0.15, -0.2, 0.97]),
    { hips: { off: [0, 0.4, 0.6], rot: [0.4, 0, 0] }, chest: { rot: [0.2, 0.1, 0] }, head: { rot: [-0.3, 0, 0] }, weapon: { aim: [0.05, 0.05, 1] } }, lantern([0.1, -0.6, -0.8])) };
  const PARTS = {
    base: { idle, walk, hit, death, roar },
    moves: { attack, slam, volley, charge, idle: { frames: 1, ms: [600], pose: () => idle.pose(0) }, walk: { frames: 1, ms: [600], pose: () => idle.pose(0) } },   // idle / walk 1 = the rest pose (one deduped cell): the moves rig's probe / fallback frame (forge-rt-check reads sockets on idle S 0)
  };
  const anims = {};
  for (const k in PARTS[part]) anims[k] = K.offs(PARTS[part][k], SC);
  return K.scaleModel(Object.assign({
    name: part === 'base' ? 'gloamwarden' : 'gloamwarden_' + part,
    frame: [108, 112], origin: [54, 94],
    bankSheets: part === 'base' ? { mv: ['walk'], die: ['hit', 'death', 'roar'] } : {},
    bones, layers, anims, sheetAnims: Object.keys(PARTS[part]),
    sockets: { head: { bone: 'head', at: [0, 7.4, 0] }, chest: { bone: 'chest', at: [0, 1.4, 0] }, handR: { bone: 'handR', at: [0, -0.8, 0] },
      tip: { bone: 'weapon', at: [0, 22, 0] }, lantern: { bone: 'offhand', at: [0, -5.0, 0] } },
    dirs: K.DIRS8,
  }, K.BASE), SC);
}

module.exports = make('base');
Object.defineProperty(module.exports, 'make', { value: make, enumerable: false });
