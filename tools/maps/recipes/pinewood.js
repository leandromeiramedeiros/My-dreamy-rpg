'use strict';
// pinewood -- Misty Pinewood, Act I zone map (112x112), built with the `zone` stamp (DESIGN 25.3, docs/PRODUCTION.md "Pinewood 112x112 zone recipe").
// ONE map that replaces the old pinewood (56x56), roothollow (32x32) and pinewood_boss (24x24) maps. Four sections on one grid:
//   forest   [0,20 .. 112,112]  outer      the road, creek, 3 shrines, 2 shortcut loops, the landmark rhythm, the elite, the tablet, 2 fishing spots, the animal trail
//   hollow   [0,0  .. 56,20]    under      Root Hollow: cave palette, dark 0.45. Keyed warp door at (44,36); the root-stair up to shrine 3 leaves it. Mossjaw
//   warrens  [60,0 .. 112,20]   vault      Fox Warrens: a noise vault, 3 sleepers, a gold chest with a Socket Rune. Behind the env pond secret
//   clearing [88,20 .. 112,44]  arena      Bramblehorn's inline arena (100,31) r8.5, 4 pillars, closed by arena_gate. Inline: reached on foot, no gutter
// Void gutters (3 tiles): y 18.5..21.5 across the map (cave darkness above, cliff below) and x 56..60 between hollow and warrens.
// HOOK: the trees are running; ogres and thornback boars debut, a creek and two fishing spots, then the key, the door, the Hollow, the king.
// BEATS (quest shard_root): Vale rift (0) -> elite drops the Hollow key (1) -> Hollow entry (2) -> Mossjaw (3) -> Bramblehorn (done) -> the rift home.
// Secrets (5): forest crack -> gem; env pond -> the Warrens door; lever bridge -> islet tablet + Skill Rune; Hollow crack -> Socket Rune;
//   cross-section: the Hollow ceiling drops key_rootcache -> the root-sealed cache by the plaza.
const { zone } = require('../zone.js');
const forestRules = require('./_forest.js');
const caveRules = require('./_cave.js');

module.exports = zone({
  id: 'pinewood', replaces: ['roothollow', 'pinewood_boss'], name: 'Misty Pinewood', sub: 'The trees are leaning away from something', theme: 'forest', seed: 4107,
  W: 112, H: 112, pad: 3.4, amp: 1.7, level: [3, 10], quest: 'shard_root', key: 'key_roothollow', density: 1.1,
  objective: 'Follow the animals north along the dirt road.',
  say: { banner: 'pinewood_banner', trail: 'pinewood_fox', tablet: 'pinewood_tablet', hollow: 'pinewood_hollow', bossIntro: 'boss_bramblehorn_intro', bossDeath: 'boss_bramblehorn_death' },
  sections: [
    { id: 'forest', name: 'Misty Pinewood', kind: 'outer', bounds: [0, 20, 112, 112], rules: forestRules, scale: 2.7 },
    { id: 'hollow', name: 'Root Hollow', kind: 'under', bounds: [0, 0, 56, 20], dark: 0.45, ambient: '#5a6a92', patch: { f: 2, d: 0.62 }, pad: 2.8, amp: 1.2, rules: caveRules, scale: 1.25 },
    { id: 'warrens', name: 'Fox Warrens', kind: 'vault', bounds: [60, 0, 112, 20], dark: 0.5, ambient: '#6a5a82', patch: { f: 2, d: 0.58 }, pad: 2.6, amp: 1.0, rules: caveRules, scale: 1.0 },
    { id: 'clearing', name: 'Bramblehorn\'s Clearing', kind: 'arena', bounds: [88, 20, 112, 44], rules: forestRules, scale: 0.4 },
  ],
  gutters: [[0, 18.5, 112, 20, 'k'], [0, 20, 112, 21.5, 'v'], [56, 0, 60, 18.5, 'k']],
  rooms: {
    // ---- forest
    start: { kind: 'clearing', x: 8, y: 104, r: 4, lvl: 0 },
    r1: { kind: 'clearing', x: 40, y: 92, r: 6.5, lvl: 2 },
    r2: { kind: 'plaza', x: 26, y: 58, r: 6.5, lvl: 4, shape: 'square' },
    r3: { kind: 'chamber', x: 70, y: 52, r: 6, lvl: 4, walled: true },
    elite: { kind: 'nook', x: 96, y: 84, r: 3.2, lvl: 2 },
    tablet: { kind: 'nook', x: 30, y: 108, r: 2.8, lvl: 0 },
    crack: { kind: 'nook', x: 22, y: 78, r: 2.4, lvl: 0 },
    env: { kind: 'nook', x: 100, y: 46, r: 3.2, lvl: 4 },
    alcove: { kind: 'nook', x: 105.5, y: 48, r: 1.8, lvl: 4 },
    islet: { kind: 'islet', x: 10, y: 29, r: 2.6, lvl: 4, isolated: true },
    lever: { kind: 'nook', x: 19, y: 45, r: 1.9, lvl: 4 },
    cache: { kind: 'nook', x: 12, y: 54, r: 2.2, lvl: 4 },
    hdoor: { kind: 'nook', x: 44, y: 36, r: 2.5, lvl: 4 },
    shr1: { kind: 'nook', x: 44, y: 86, r: 2, lvl: 2 },
    shr2: { kind: 'nook', x: 66, y: 60, r: 2, lvl: 4 },
    shr3: { kind: 'nook', x: 84, y: 36, r: 2, lvl: 4 },
    arena: { kind: 'arena', x: 100, y: 31, r: 8.5, lvl: 4, walled: true, pillars: 4, rune: 3, wall: 2.2 },
    // ---- hollow
    h_start: { kind: 'clearing', x: 5.5, y: 10, r: 3, lvl: 0 },
    h_r1: { kind: 'chamber', x: 15, y: 12, r: 4, lvl: 0, walled: true },
    h_shrine: { kind: 'nook', x: 23.5, y: 6, r: 2, lvl: 2 },
    h_r2: { kind: 'chamber', x: 32.5, y: 11, r: 4.3, lvl: 4, walled: true },
    h_lever: { kind: 'nook', x: 36, y: 16.2, r: 1.7, lvl: 3 },
    h_den: { kind: 'arena', x: 45, y: 10.5, r: 4.8, lvl: 2, walled: true, pillars: 6, rune: 2, wall: 2.2 },
    h_crack: { kind: 'nook', x: 24, y: 15.5, r: 1.8, lvl: 0 },
    h_stair: { kind: 'nook', x: 52.4, y: 10.5, r: 1.6, lvl: 2 },
    // ---- warrens
    w_door: { kind: 'clearing', x: 65.5, y: 9, r: 2.8, lvl: 0 },
    w_hall: { kind: 'chamber', x: 80, y: 10, r: 5.2, lvl: 0, walled: true },
    w_vault: { kind: 'chamber', x: 99, y: 9.5, r: 4.5, lvl: 0, walled: true },
  },
  flats: [{ x: 23, y: 66, r: 3, lvl: 4 }],
  paths: {
    main: { meander: 4.4, every: 7, pts: ['start', [16, 98, 0], [28, 94, 0], 'r1', [52, 84, 2], [60, 72, 2], [48, 64, 4], 'r2', [36, 48, 4], [52, 46, 4], 'r3', [84, 44, 4], 'shr3', 'arena'] },
    tablet: { from: { room: 'r1' }, pts: [[34, 102, 0], 'tablet'] },
    spur_shr1: { from: { near: [45, 88] }, pts: ['shr1'] },
    spur_shr2: { from: { room: 'r3' }, pts: [[68, 57, 4], 'shr2'] },
    loop1: { kind: 'loop', w: 1.8, meander: 2.5, from: { room: 'r2' }, pts: [[14, 66, 4], [10, 84, 2], [17, 97.5, 0]] },
    loop2: { kind: 'loop', w: 1.8, meander: 2.5, from: { room: 'r3' }, pts: [[76, 70, 4], [60, 80, 2], 'shr1'] },
    elite: { from: { path: 'loop2', near: [78, 74] }, pts: [[88, 80, 2], 'elite'] },
    crack: { from: { path: 'loop1', near: [11, 78] }, pts: [[17, 78, 1], 'crack'] },
    env: { kind: 'secret', type: 'd', w: 1.6, meander: 1.2, every: 6, from: { near: [84, 44] }, pts: [[92, 45.5, 4], 'env'] },
    env_alcove: { kind: 'secret', type: 'd', w: 1.6, meander: 0.6, every: 8, from: { room: 'env' }, pts: ['alcove'] },
    bridgeApproach: { from: { room: 'r2' }, w: 1.8, type: 'd', pts: [[17, 47, 4], [11, 41, 4], [10, 37.6, 4]] },
    lever: { from: { room: 'r2' }, w: 1.6, pts: [[21, 52, 4], 'lever'] },
    cache: { from: { room: 'r2' }, w: 1.6, pts: [[17, 56, 4], 'cache'] },
    fish_b: { from: { path: 'loop2', near: [73, 58] }, w: 1.6, pts: [[79, 58.4, 4], [83.2, 59.2, 4]] },
    hdoor: { from: { path: 'main', near: [44, 47] }, pts: [[44, 41, 4], 'hdoor'] },
    // ---- hollow
    h_main: { kind: 'main', meander: 2.2, every: 6, type: 'p', pts: ['h_start', 'h_r1', [20, 10, 1], 'h_shrine', [29, 8, 3], 'h_r2', [39, 11, 3], 'h_den'] },
    h_lever: { from: { path: 'h_main', near: [37, 12] }, type: 'p', pts: [[36, 14.4, 3], 'h_lever'] },
    h_crack: { from: { path: 'h_main', near: [20, 11] }, type: 'p', pts: [[22, 14, 0], 'h_crack'] },
    h_short: { kind: 'loop', w: 1.8, type: 'p', from: { path: 'h_main', room: 'h_den' }, pts: [[43, 4.6, 2], [34, 3.2, 2], [27, 3.6, 2], 'h_shrine'] },
    h_stairp: { from: { path: 'h_main', room: 'h_den' }, type: 'p', pts: ['h_stair'] },
    // ---- warrens
    w_main: { kind: 'main', meander: 1.6, every: 6, type: 'p', pts: ['w_door', [73, 11, 0], 'w_hall', [90, 9.5, 0], 'w_vault'] },
  },
  rivers: { creek: { w: 2.6, banks: 4.2, bankLvl: [[0, 4], [24, 4], [44, 3], [58, 2], [68, 4], [112, 4]], pts: [[0, 61], [14, 67], [32, 69.5], [46, 68], [60, 66.5], [72, 64], [84, 62], [98, 58], [112, 56]] } },
  ponds: { hidden: { x: 97.8, y: 48.4, r: 1.7, lvl: 4 } },
  bridges: [{ x: 9, y: 32, axis: 'y', len: 5, w: 2, lvl: 4 }],
  portals: {
    home: { room: 'start', dx: -3, dy: 2.6, to: 'vale', arrive: 'vale.pine' },
    home_arena: { room: 'arena', dx: 2.5, dy: -4, to: 'vale', open: false, arrive: 'vale.pine' },
    next: { room: 'arena', dx: -2.5, dy: -4, to: 'ruins', open: false, marker: true },
  },
  shrines: { shrine1: { room: 'shr1', name: 'The road to the plaza' }, shrine2: { room: 'shr2', name: 'The creek ford' }, shrine3: { room: 'shr3', name: 'The Clearing gate' } },
  landmark: [65, 69.5],
  fish: [[52, 70], [84, 60.5]],
  trail: [0.05, 0.14, 0.24, 0.35, 0.47, 0.6, 0.74, 0.88],
  ambush: [{ id: 'ford', name: 'Thornbacks at the ford', at: { path: 'main', frac: 0.335 }, r: 4.2, pack: 'pw_boar_pierce', requires: ['r1_done'], banner: ['Thornback Boars', 'Arrows glance off their bristles (resist pierce)'], clear: { text: 'The ford is quiet again.', heal: 20 } }],
  signs: [{ room: 'start', dx: 3.2, dy: -3.4, text: 'North: the Root Hollow. Mind the creek.' }, { room: 'r1', dx: -4.5, dy: -5.5, text: 'Danger: ogres in the clearing' }],
  startOff: [-0.5, 0.8],
  text: {
    intro: ['The animals are running.', 'Something big has woken in the wood.'],
    tablet: 'Bramblehorn kept the roots. He loved the roots too much.',
    isletTablet: 'The Wardens left a rune where the water cannot reach it.',
    hollowTablet: 'The first Warden sealed Mossjaw here to keep the Gloam from the pines.',
    eliteDone: 'The ogre drops a gnarled root key.', keyLine: 'That key smells of roots and earth. It opens the Root Hollow.',
    keyObjective: 'Take the root key to the door north of the road (the Root Hollow)',
    locked: 'A door of knotted roots. It needs the Root Hollow key.',
    hollowObjective: 'Descend through the Root Hollow and defeat Mossjaw',
    hollowShrineName: 'Root Hollow midpoint', bossLast: 'The roots remember the first Warden... he did not wake, and neither shall I.',
    stairObjective: 'Take the root-stair up to the Clearing shrine, then face Bramblehorn',
    arenaSealed: 'The Clearing gate is knotted shut. Something in the Hollow holds it.',
    dreamKey: 'A key of dream-glass: the Dream Arena bridge in the Vale will open.',
    after: 'Take the rift home, or on to the Gloomspire Ruins',
  },
  enemies: {
    r1: { name: 'Ogres in the clearing', banner: ['Ogre!', 'A brute guards the sunlit clearing'], gap: 9, waves: [[{ pack: 'pw_ogre_run' }]], clear: { text: 'Heavy footsteps echo to the north...', objective: 'Follow the road north to the stone plaza' } },
    r2: { name: 'The Stone Plaza', banner: ['The Stone Plaza', 'Kill the shaman first: it keeps the boar standing'], gap: 12, waves: [[{ pack: 'pw_boar_shaman' }], [{ pack: 'pw_ogre_slimes' }]], clear: { text: 'The way to the grove is clear.', heal: 30, objective: 'Enter the Warden\'s Grove (east). The root door waits north of the road' } },
    r3: { name: 'The Warden\'s Grove', banner: ['The Warden\'s Grove', 'A shaman chants in the dark', true], gap: 12, waves: [[{ pack: 'pw_ogre_grove', press: 2 }], [{ pack: 'pw_boar_last' }]], clear: { text: 'The shaman falls silent.', heal: 40, rarity: 'rare', objective: 'Defeat the Gnarlroot Ogre (south-east) for the Hollow key' } },
    elite: { title: 'Gnarlroot Ogre', sub: 'Guardian of the Root Hollow key', enemy: 'ogre' },
    h_r1: { name: 'First cavern', banner: ['Root Cavern', 'Thorn-touched brutes in numbers'], gap: 8, waves: [[{ pack: 'rh_ogre_pack' }]], clear: 'The roots go still.' },
    h_r2: { name: 'Gate gallery', banner: ['The Gallery', 'Something large is sleeping at the far end'], gap: 14, waves: [[{ pack: 'rh_boar_wrong' }], [{ pack: 'rh_troll_sleeper', toward: 'h_den', dist: 0.7 }]], clear: 'Silence. A lever waits nearby.' },
    den: { name: 'Mossjaw\'s den', title: 'Mossjaw', sub: 'Moss-gorged root wolf — mini-boss', enemy: 'mossjaw', add: 'ogre' },
    warrens: {
      title: 'The Fox Warrens', sub: 'Do not wake what sleeps here', enemy: 'mountaintroll', pip: ['Quiet, Aerin. Big things sleep in the tunnels.'], objective: 'Sneak past the sleepers to the vault (or wake them one by one)',
      hall: [[0, -3.5], [0, 3.5]], vault: [[2.6, -2.4]],   // >= 3.4 tiles from the trigger centre: a sleeper's wake radius is 3, so the middle of each room is the quiet way through
       done: 'The tunnels fall silent. The fox-gold is yours.',
    },
    boss: { title: 'Old Bramblehorn', sub: 'The Troll King - Shard of Root', enemy: 'bramblehorn', victory: 'The Shard of Root is relit' },
  },
  // the required route, in order (timed at 3.7 tiles/s; fights and pauses in seconds): build.js prints minutes per section and fight gaps
  route: [
    { sec: 'forest', at: 'start', on: 'main' },
    { sec: 'forest', at: 'r1', on: 'main', fight: 50, pause: 6, label: 'r1 ogre pack' },
    { sec: 'forest', at: 'ford', on: 'main', fight: 40, pause: 4, label: 'ford boars' },
    { sec: 'forest', at: 'r2', on: 'main', fight: 90, pause: 6, label: 'r2 plaza (2 waves)' },
    { sec: 'forest', at: 'r3', on: 'main', fight: 90, pause: 6, label: 'r3 grove (2 waves)' },
    { sec: 'forest', at: 'elite', fight: 55, pause: 7, wind: 1.35, label: 'elite (key)' },
    { sec: 'forest', at: 'hdoor', pause: 4, wind: 1.3, label: 'root door' },
    { sec: 'hollow', at: 'h_start', warp: true, pause: 4 },
    { sec: 'hollow', at: 'h_r1', on: 'h_main', fight: 50, pause: 4, label: 'h_r1 ogre pack' },
    { sec: 'hollow', at: 'h_shrine', on: 'h_main', pause: 7, label: 'midpoint shrine' },
    { sec: 'hollow', at: 'h_r2', on: 'h_main', fight: 90, pause: 8, label: 'h_r2 gallery (boar, sleeper)' },
    { sec: 'hollow', at: 'h_lever', pause: 5, wind: 1.3, label: 'lever' },
    { sec: 'hollow', at: 'h_den', fight: 80, pause: 12, wind: 1.3, label: 'Mossjaw' },
    { sec: 'hollow', at: 'h_stair', pause: 3, wind: 1.2 },
    { sec: 'forest', at: 'shr3', warp: true, pause: 4 },
    { sec: 'clearing', at: 'arena', on: 'main', fight: 175, pause: 14, label: 'Bramblehorn' },
  ],
  optional: [
    { sec: 'warrens', label: 'secrets + Fox Warrens (env pond, 3 sleepers)', walk: 80, fight: 70, pause: 25 },
  ],
});
