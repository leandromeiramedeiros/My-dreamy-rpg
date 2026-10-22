'use strict';
// CHIBI PALETTE — shared by models/chibi-gear.js (the knight kit) and the line files (chibi-buckler / -staff / -grimoire):
// ramps, tiny helpers, and the Mythic emissive hues. Metals carry a 5th glint colour (spec). Every ramp keeps CIE L* strictly
// rising and its darkest tone >= 8 L* above the outline #0c0714 (tools/forge/tiers.js palette lint).
const SIDES = [['R', -1], ['L', 1]];
const both = f => SIDES.flatMap(([s, k]) => f(s, k));
const TIERS = [1, 2, 3, 4, 5, 6];                                // T1..T5 + Mythic (.t6)

const metal = ramp => ({ ramp, spec: 0.965 });
const METAL = [
  ['#25252f', '#44444f', '#676774', '#9494a2', '#c8c8d4'],    // T1 iron
  ['#1c2140', '#384270', '#626ea0', '#a6b0d4', '#f4f8ff'],    // T2 steel
  ['#1e2440', '#3a4672', '#6878ae', '#b0bfe8', '#ffffff'],    // T3 polished steel
  ['#2a2842', '#535478', '#8b8fb8', '#cfd4ec', '#ffffff'],    // T4 silver
  ['#3a3458', '#6e6a96', '#b4b4d8', '#ecebfa', '#ffffff'],    // T5 pearl
  ['#221e38', '#34305a', '#52508a', '#8480b8', '#e4e0ff'],    // T6 Mythic: night-forged steel, richer and darker than the pearl
];
const GOLD = metal(['#5a3608', '#9a6414', '#d8a030', '#f0c858', '#fff4c0']);
const MAIL = ['#1c1f30', '#33384f', '#4e5572', '#737b9c'];
const LEATHER = ['#3a2216', '#5e3a24', '#85573a', '#b07e56'];
const STRAP = { ramp: ['#4a2c1a', '#7a4a2c', '#a8703e', '#d09a5e'], flat: 2 };   // tan leather in one tone: a clean 2 px stroke
const WOOD = ['#3a2414', '#5e3c22', '#8a5c34', '#b88654'];
const QUILT = ['#4e3a2c', '#7a5e44', '#a8885e', '#d4b88a'], STITCH = ['#3a2a20', '#4e3b2c', '#5e4936', '#70583f'];
const CLOTH = [['#3a2418', '#5e3c26', '#85583a', '#b08058'], ['#141f4e', '#22367a', '#3656b0', '#7896e8'],
  ['#4a0e1e', '#7e1a30', '#b8324a', '#e86a80'], ['#10305a', '#1c4c8a', '#2e74c8', '#78b4f0'], ['#161e58', '#1c2a78', '#2e46b8', '#6a8af0'],
  ['#14224c', '#1e3a80', '#2c58b0', '#5a9ae8']];                 // T6: deep frost blue (Shardheart)
const FEATHER = metal(['#4a4a6e', '#7480b0', '#a4b0dc', '#c4cdee', '#ffffff']), FUR = ['#7a7a98', '#a8a8c4', '#d0d0e4', '#eeeef8'];
const SAPPHIRE = { ramp: ['#0c2470', '#1e4ccc', '#4a8cff', '#b8dcff', '#ffffff'], lift: 1, spec: 0.9 };
const RUBY = { ramp: ['#4a0614', '#9a1428', '#e0384c', '#ff98a8', '#ffffff'], lift: 1, spec: 0.9 };
const CORE = { ramp: ['#bff4ff', '#bff4ff', '#bff4ff', '#bff4ff'], flat: 2 };           // radiant glow (cyan-white)
const VISOR = { ramp: ['#bff4ff', '#bff4ff', '#bff4ff', '#bff4ff'], flat: 2 };          // glowing eye slit
const RUST = ['#3a2a26', '#5e4a40', '#8a7262', '#b09a88'];
const CROSS = [[0, 0, '#e8b830'], [-1, 0, '#e8b830'], [1, 0, '#e8b830'], [0, -1, '#fff0a0'], [0, 1, '#c08a20'], [0, 2, '#c08a20']];
const SUN = [[0, 0, '#fff4c0'], [-1, 0, '#e8b830'], [1, 0, '#e8b830'], [0, -1, '#e8b830'], [0, 1, '#e8b830'], [-2, 0, '#c08a20'], [2, 0, '#c08a20'], [0, -2, '#c08a20'], [0, 2, '#c08a20']];

// ---- Mythic: one emissive hue per line (js/elfx.js vivid of the line's element). A glow is a FLAT material, laid as a 1 px
// run of at most 4 px per frame (tiers.js counts them); the gems around it are ordinary shaded ramps of the same hue.
const GLOW = {
  holy: '#ffdc66',        // sword, heater (holy vivid #fff2c4 is near white: its ramp[1] gold carries the hue)
  slash: '#d8e4ff',       // buckler (slash vivid)
  frost: '#5fd4ff',       // Warden suit: helm, plate, greaves, cape (the Shardheart set)
  fire: '#ff6a2a',        // staff (Emberfall)
  arcane: '#a652ff',      // grimoire (The Names on the Pillars)
};
const flatOf = hex => ({ ramp: [hex, hex, hex, hex], flat: 2 });
const FROSTG = { ramp: ['#0c2a5a', '#1c6ab0', '#3ec0ff', '#a4ecff', '#ffffff'], lift: 1, spec: 0.9 };
const FIREG = { ramp: ['#4a0a08', '#a8240c', '#ff5a1e', '#ffb060', '#fff0c0'], lift: 1, spec: 0.9 };
const ARCG = { ramp: ['#2a0e5a', '#5a2aa0', '#9a44ff', '#d6b0ff', '#ffffff'], lift: 1, spec: 0.9 };
const HOLYG = { ramp: ['#5a3608', '#c88a14', '#ffd75a', '#fff0a8', '#ffffff'], lift: 1, spec: 0.9 };
const SLASHG = { ramp: ['#1a2a4a', '#3a5a8a', '#7aa0d0', '#c8d0e8', '#ffffff'], lift: 1, spec: 0.9 };

// rotate v by Euler [rx, ry, rz] the way forge turns a prim (Ry * Rx * Rz): used to fan feathers out of one root
const rotv = (v, [rx, ry, rz]) => { let [x, y, z] = v; [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)]; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)]; return [x, y, z]; };
const piece = (family, slot, t, layer, extra) => Object.assign({ id: `${family}.t${t}`, family, tier: t, slot, layers: [Object.assign({ id: `${family}.t${t}` }, layer)] }, extra || {});
const notAttack = fn => (a, f) => a.startsWith('attack') ? {} : fn(a, f);
// the shield pose: the face looks out to the left-front, raised square-on to block when hit (shield, buckler)
const SHIELD_POSE = a => ({ offhand: a === 'hit' ? { aim: [0, 1, 0.2], roll: [0.25, 0, 0.97] } : a === 'dash' ? { aim: [0.1, 1, -0.2], roll: [0.9, 0, -0.4] } : { aim: [0.15, 1, 0.1], roll: [0.75, 0, 0.66] } });
const r3 = v => Math.round(v * 1000) / 1000;
// a ring / fan of capsules about a centre in a plane: used for halos, crowns and rays
const ring = (bone, mat, part, c, R, n, ra, rb, opt) => Array.from({ length: n }, (_, i) => {
  const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n, o = opt || {};
  return Object.assign({ bone, mat, part, shape: 'cap', a: [c[0] + R * Math.cos(a0), c[1] + R * Math.sin(a0), c[2]], b: [c[0] + R * Math.cos(a1), c[1] + R * Math.sin(a1), c[2]], ra, rb: rb != null ? rb : ra }, o.extra || {});
});

module.exports = { SIDES, both, TIERS, metal, METAL, GOLD, MAIL, LEATHER, STRAP, WOOD, QUILT, STITCH, CLOTH, FEATHER, FUR, SAPPHIRE, RUBY, CORE, VISOR, RUST, CROSS, SUN,
  GLOW, flatOf, FROSTG, FIREG, ARCG, SLASHG, HOLYG, rotv, piece, notAttack, r3, ring, SHIELD_POSE };
