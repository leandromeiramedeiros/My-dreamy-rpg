'use strict';
// pinewood -- Act I outer map (56x56), built with the `outer` stamp.
// HOOK: the trees are running -- a fox-and-rabbit trail leads up the road, ogres and thornback boars debut, a creek fishing spot
//       is introduced. The troll is NOT here (it sleeps in Root Hollow, DESIGN 21.5). Level band [3,10].
// PACING (walk 3.7 t/s, ~195 tiles main path = ~55 s of walking; fights make it ~6 min):
//   0:00 banner + Pip, fox trail starts at once        0:25 creek: fishing stub + Pip      0:50 tablet detour (30 s round trip)
//   1:10 r1 ogre pack (first brute telegraph)          2:30 elite ogre nook -> root key    3:40 ford ambush: boars (pierce is wrong)
//   4:30 checkpoint 2 on the road                      5:00 r2 boar+shaman, ogre pack      7:00 r3 ogre grove -> rift down opens
//   Secrets: wall_crack (lantern tell, Pip hum), bridge lever -> gold chest islet, plus a lantern-lit silver-chest detour.
const { outer } = require('../stamps.js');
const forestRules = require('./_forest.js');
const D = require('../gamedata.js');

module.exports = outer({
  id: 'pinewood', name: 'Misty Pinewood', sub: 'The trees are leaning away from something', theme: 'forest', seed: 4107, pad: 3.4, amp: 1.7,
  objective: 'Follow the animals north along the dirt road.', palette: forestRules, density: 1.1, key: 'key_roothollow', level: [3, 10], quest: 'shard_root',
  say: { banner: 'pinewood_banner', trail: 'pinewood_fox', tablet: 'pinewood_tablet' },
  trail: [0.07, 0.17, 0.29, 0.43, 0.58, 0.74, 0.9],
  shrine2: { x: 34, y: 23.6 },
  ambush: [{ id: 'ford', name: 'Thornbacks at the ford', x: 49.5, y: 31, r: 4.2, pack: 'pw_boar_pierce', requires: ['r1_done'], banner: ['Thornback Boars', 'Arrows glance off their bristles (resist pierce)'], clear: { text: 'The ford is quiet again.', heal: 20 } }],
  rooms: {
    start: { kind: 'clearing', x: 7, y: 48, r: 4, lvl: 0 },
    r1: { kind: 'clearing', x: 38, y: 40, r: 6.5, lvl: 2 },
    r2: { kind: 'plaza', x: 20, y: 13, r: 6.5, lvl: 4, shape: 'square' },
    r3: { kind: 'chamber', x: 46, y: 9, r: 6, lvl: 4, walled: true },
    tablet: { kind: 'nook', x: 22, y: 51, r: 2.8, lvl: 0 },
    elite: { kind: 'nook', x: 52, y: 47, r: 3.2, lvl: 2 },
    crack: { kind: 'nook', x: 20, y: 40, r: 2.4, lvl: 0 },
    env: { kind: 'nook', x: 52.5, y: 22.5, r: 3.4, lvl: 4 },
    islet: { kind: 'islet', x: 5, y: 4.5, r: 2.6, lvl: 4, isolated: true },
  },
  flats: [{ x: 23, y: 27, r: 4.5, lvl: 2 }, { x: 49.5, y: 31, r: 4, lvl: 2 }],
  main: ['start', [7, 38], [13, 31], [23, 27, 2, 4.5], [31, 33], 'r1', [49.5, 31, 2, 4], [44, 21, 4], [34, 23], [27, 19], 'r2', [26, 5], [32, 10], [37, 4], [38, 14], 'r3'],
  branches: {
    tablet: { from: { room: 'r1' }, pts: [[30, 47, 0], 'tablet'] },
    elite: { from: { room: 'r1' }, pts: [[47, 45, 2], 'elite'] },
    shortcut: { kind: 'loop', w: 1.8, meander: 2.5, from: { room: 'r2' }, pts: [[10, 18, 2], [4, 28, 2], [4, 38, 0], [7, 43, 0]] },
    crack: { from: { near: [14, 33] }, pts: [[17, 37, 0], 'crack'] },                                    // signposted secret (cracked wall)
    env: { kind: 'secret', type: 'd', w: 1.6, meander: 1.2, every: 6, from: { near: [47, 26] }, pts: [[50.5, 24, 3], 'env'] },    // environmental secret
    bridgeApproach: { from: { near: [14, 9] }, w: 1.8, type: 'd', pts: [[12.6, 5.2, 4]] },                // logic secret: approach to the raised bridge
  },
  ponds: { hidden: { x: 52.2, y: 21.6, r: 1.9, lvl: 4 } },
  fishspots: [[30, 28.6], [42, 29.6]],
  rivers: { creek: { w: 2.6, pts: [[0, 21], [12, 25], [23, 27], [36, 30], [49.5, 31], [55, 33]] } },
  bridges: [{ x: 7, y: 4, axis: 'x', len: 5, w: 2, lvl: 4 }],
  secrets: { crack: { t: 0.62 }, env: { pond: true, chestDx: 1.4, chestDy: 1.8 }, logic: { islet: 'islet', leverRoom: 'tablet' } },
  landmark: [30, 41],
  portals: {
    home: { room: 'start', dx: -3, dy: 2.6, to: 'vale', arrive: 'vale.pine' },
    down: { room: 'r3', dx: 1.5, dy: -0.5, to: 'roothollow', open: false, marker: true },
  },
  startOff: [-0.5, 0.8],
  signs: [{ room: 'start', dx: 3.2, dy: -3.4, text: 'North: Troll Hollow. Mind the creek.' }, { room: 'r1', dx: -4.5, dy: -5.5, text: 'Danger: ogres in the clearing' }],
  text: {
    startName: 'Glade of Arrival', intro: ['The animals are running.', 'Something big has woken in the wood.'],
    tablet: D.DIALOGUE.pinewood_tablet.lines.join(' '), shrine2Name: 'The road to the plaza',
    eliteDone: 'The ogre drops a gnarled root key.', keyLine: 'That key smells of roots and earth. It opens the Root Hollow.', riftSub: 'The Root Hollow lies below',
  },
  enemies: {
    // packs are ENCOUNTERS ids (js/enemydata.js); wave 2 follows `gap` s after wave 1
    r1: { name: 'Ogres in the clearing', banner: ['Ogre!', 'A brute guards the sunlit clearing'], gap: 9, waves: [[{ pack: 'pw_ogre_run' }]],
      clear: { text: 'Heavy footsteps echo to the north...', objective: 'Follow the road north to the stone plaza' } },                      // room 1: no support yet
    r2: { name: 'The Stone Plaza', banner: ['The Stone Plaza', 'Kill the shaman first: it keeps the boar standing'], gap: 12, waves: [[{ pack: 'pw_boar_shaman' }], [{ pack: 'pw_ogre_slimes' }]],
      clear: { text: 'The way to the grove is clear.', heal: 30, objective: 'Enter the Warden\'s Grove (north-east)' } },                            // support first target; wave 2 = slash is the wrong weapon
    r3: { name: 'The Warden\'s Grove', banner: ['The Warden\'s Grove', 'A shaman chants in the dark', true], gap: 12, waves: [[{ pack: 'pw_ogre_grove', press: 2 }], [{ pack: 'pw_boar_last' }]],
      clear: { text: 'The shaman falls silent.', heal: 40, rarity: 'rare', objective: 'Take the rift down into the Root Hollow (key from the elite ogre)' } },
    elite: { title: 'Gnarlroot Ogre', sub: 'Guardian of the Root Hollow key', enemy: 'ogre' },
  },
});
