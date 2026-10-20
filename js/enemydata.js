// Enemy, boss and encounter data (DESIGN §21, STORY.md "Bosses").
// Plain data. Loaded as a classic script; everything is a global `var`.
//
// HP values are first drafts; tools/balsim.js owns final tuning.
// M2b engine pass (Opus): numbers normalised to the engine units in js/parts.js (speed tiles/s, dmg = L1 raw hit,
// xp = fraction of the enemy level's XP bar); hp tuned by tools/balsim.js against the new enemyHpMul curve; parts
// lists made runnable (every row has one movement and an attack; 'hop' is chase's hop param). The original Haiku
// draft values are in git history.
//
// Conventions
// * res: positive = resists (takes less), negative = weak (takes more), 1 = immune. Same sign as data.js.
// * hp is the L1 BASE. The engine scales it by level with enemyHpMul(L) = 0.6 * 1.1^(L-1) (js/items.js),
//   so the value at level L is hp * enemyHpMul(L). Never pre-scale hp to a zone level.
//   Common enemies: hp is set by tools/balsim.js so the band-mid TTK of the three weapon families' reference
//   rotations lands on the §20.3 target (re-run it after changing any hp).
// * Healer: heals 25 % of the target's max HP, 4 s telegraph (§21.2 says <= 30 %; the spec here says 25 %).
// * Movement parts (one per enemy): chase, hop, kite, charge, burrow, sleep, stationary, orbit.
//   A pack never holds two enemies with the same movement part (§21.4), except in Pinewood, which is exempt
//   (director ruling: Pinewood is the first zone, so repeated compositions are fine there).
//   Gloom Slime's `hop` is kept from the spec example and is not a listed movement part; its movement is `chase`.
// * xp: a swarm is one enemy for XP (the whole Dream Moth swarm gives one entry's xp). Split children give 0.

var ENEMY_DATA = {

  // ---- Vale (L1-3, mid L2) ----------------------------------------------------------------
  // hp is the WHOLE swarm (4 moths share it); XP once for the swarm
  dreammoth: {
    name: 'Dream Moth', sprite: 'moth', look: 'wisp', hp: 450, speed: 3.0, dmg: 20, el: 'arcane', dmgType: 'arcane', stagger: 1,
    res: { slash: 0, pierce: 0, fire: 0, frost: 0, nature: 0, lightning: 0, arcane: 0.25, holy: -0.5 },
    tags: ['flying', 'swarm'],
    parts: ['orbit', 'shoot', 'swarm'],
    params: { orbit: { r: 2.6 }, shoot: { range: 4.5, wind: 0.6, cd: 2.8, speed: 4.5, r: 0.25, col: '#e8d0ff' }, swarm: { n: 4, spread: 1.6, source: 'moth_nest' } },
    xp: 0.08, loot: 'common_vale'
  },

  // ---- Pinewood (L3-10, mid L6.5) -----------------------------------------------------------
  gloomslime: {
    name: 'Gloom Slime', sprite: 'slime', look: 'slime', hp: 355, speed: 2.2, dmg: 32, el: 'gloom', dmgType: 'gloom', stagger: 2,
    res: { slash: -0.5, pierce: 0.5 },
    tags: ['amorphous'],
    parts: ['chase', 'brute', 'split'],
    params: { chase: { hop: 1.8 }, brute: { shape: 'circle', r: 1.15, range: 1.0, wind: 0.55, cd: 1.1, rec: 0.4, splat: true, stopK: 0.8 }, split: { n: 2, type: 'gloomslime_small' } },
    xp: 0.12, loot: 'common_pinewood'
  },
  // Child spawned by Gloom Slime split: ~1 s to kill, no XP of its own.
  gloomslime_small: {
    name: 'Gloom Slime (small)', sprite: 'slime', look: 'slime', scale: 0.7, r: 0.28, hgt: 1.3, hp: 100, speed: 2.6, dmg: 20, el: 'gloom', dmgType: 'gloom', stagger: 1,
    res: { slash: -0.5, pierce: 0.5 },
    tags: ['amorphous', 'child'],
    parts: ['chase', 'brute'],
    params: { chase: { hop: 1.8 }, brute: { shape: 'circle', r: 0.9, range: 0.8, wind: 0.55, cd: 1.2, rec: 0.4, splat: true, stopK: 0.8 } },
    xp: 0, loot: null
  },
  shadehound: {
    name: 'Shade Hound', sprite: 'hound', look: 'hound', hp: 320, speed: 3.4, dmg: 48, el: 'gloom', dmgType: 'slash', stagger: 1,
    res: { arcane: 0.5, holy: -0.5 },
    tags: ['beast'],
    parts: ['charge'],
    params: { charge: { range: 4.5, len: 6, wind: 0.6, speed: 12, dur: 0.5, cd: 1.8 } },
    xp: 0.12, loot: 'common_pinewood'
  },
  brambleshaman: {
    name: 'Bramble Shaman', sprite: 'shaman', look: 'ogre', scale: 0.8, hp: 380, speed: 1.8, dmg: 24, el: 'nature', dmgType: 'nature', stagger: 1,
    res: { nature: 0.5, fire: -0.5 },
    tags: ['caster', 'support'],
    parts: ['kite', 'zone-caster', 'healer'],
    params: {
      healer: { heal: 0.25, telegraph: 4, targets: 'most_damaged_ally' },
      'zone-caster': { kind: 'poison', n: 2, r: 1.2, life: 6 }
    },
    xp: 0.18, loot: 'common_pinewood'
  },
  // ogre: director ruling (M2b) — chase + brute, as in M2a (the built-in row's parts win); js/world.js `enemies.ogre`
  // overrides these numbers in game.
  ogre: {
    name: 'Ogre', sprite: 'ogre', hp: 515, speed: 1.8, dmg: 64, el: 'none', dmgType: 'slash', stagger: 3,
    res: { slash: 0.5, pierce: 0, fire: 0, holy: -0.5 },
    tags: ['brute'],
    parts: ['chase', 'brute'],
    params: { brute: { wind: 0.7, open: 1.0, shape: 'cone', arc: 90, r: 2.5 } },
    xp: 0.2, loot: 'common_pinewood'
  },
  thornbackboar: {
    name: 'Thornback Boar', sprite: 'boar', look: 'hound', scale: 1.25, hp: 375, speed: 2.6, dmg: 56, el: 'nature', dmgType: 'pierce', stagger: 3,
    res: { slash: 0.5, pierce: 0, nature: 0.5, fire: -0.5 },
    tags: ['beast', 'armoured'],
    parts: ['burrow', 'brute'],
    params: { burrow: { vanish: 1.5, erupt: { shape: 'circle', r: 2 }, staggerOnSurface: true }, brute: { shape: 'cone', r: 1.8, range: 1.6 } },
    xp: 0.14, loot: 'common_pinewood'
  },
  // Sleeper: appears in Root Hollow only (§21.1, §21.4: sleepers appear once per map, after a shrine).
  mountaintroll: {
    name: 'Mountain Troll', sprite: 'troll', hp: 375, speed: 1.4, dmg: 88, el: 'none', dmgType: 'slash', stagger: 4,
    res: { slash: 0.5, pierce: 0.5, frost: -0.5 },
    tags: ['brute', 'sleeper'],
    parts: ['sleep', 'brute'],
    params: { sleep: { wakeRadius: 3, wakeOn: 'proximity' }, brute: { wind: 0.9, open: 1.2, shape: 'circle', r: 2.5, range: 2 } },
    xp: 0.24, loot: 'common_pinewood'
  }
};

// ---- Encounters (§21.4). Roles: 1 anchor, 2-4 pressure, 0-1 support, 0-1 ranged.
// wrongWeapon = the pack's dominant resist, set on purpose so the zone's usual weapon is wrong for it.
var ENCOUNTERS = {
  pinewood: [
    { id: 'pw_ogre_run',      members: ['ogre', 'gloomslime', 'shadehound'],
      roles: { anchor: 'ogre', pressure: ['gloomslime', 'shadehound'], support: [], ranged: [] }, wrongWeapon: null },
    { id: 'pw_boar_shaman',   members: ['thornbackboar', 'gloomslime', 'shadehound', 'brambleshaman'],
      roles: { anchor: 'thornbackboar', pressure: ['gloomslime', 'shadehound'], support: ['brambleshaman'], ranged: [] }, wrongWeapon: null },
    { id: 'pw_ogre_grove',    members: ['ogre', 'gloomslime', 'shadehound', 'brambleshaman'],
      roles: { anchor: 'ogre', pressure: ['gloomslime', 'shadehound'], support: ['brambleshaman'], ranged: [] }, wrongWeapon: null },
    { id: 'pw_boar_pierce',   members: ['thornbackboar', 'gloomslime', 'shadehound'],
      roles: { anchor: 'thornbackboar', pressure: ['gloomslime', 'shadehound'], support: [], ranged: [] }, wrongWeapon: 'pierce' },
    { id: 'pw_ogre_slimes',   members: ['ogre', 'gloomslime', 'shadehound'],
      roles: { anchor: 'ogre', pressure: ['gloomslime', 'shadehound'], support: [], ranged: [] }, wrongWeapon: 'slash' },
    { id: 'pw_boar_last',     members: ['thornbackboar', 'gloomslime', 'shadehound', 'brambleshaman'],
      roles: { anchor: 'thornbackboar', pressure: ['gloomslime', 'shadehound'], support: ['brambleshaman'], ranged: [] }, wrongWeapon: null }
  ],
  rootHollow: [
    { id: 'rh_ogre_pack',     members: ['ogre', 'gloomslime', 'shadehound'],
      roles: { anchor: 'ogre', pressure: ['gloomslime', 'shadehound'], support: [], ranged: [] }, wrongWeapon: null },
    { id: 'rh_boar_wrong',    members: ['thornbackboar', 'gloomslime', 'shadehound', 'brambleshaman'],
      roles: { anchor: 'thornbackboar', pressure: ['gloomslime', 'shadehound'], support: ['brambleshaman'], ranged: [] }, wrongWeapon: 'slash' },
    // Troll: only here. Requires a shrine to have been touched on this map (sleeper rule, §21.4).
    { id: 'rh_troll_sleeper', members: ['mountaintroll', 'gloomslime', 'shadehound', 'brambleshaman'],
      roles: { anchor: 'mountaintroll', pressure: ['gloomslime', 'shadehound'], support: ['brambleshaman'], ranged: [] },
      wrongWeapon: null, after: 'shrine' }
  ]
};

// ---- Bosses (STORY.md). Move parameters follow BOSS_MOVES (wind, open, dmg, el, stagger, col).
// Mini-bosses: 60-90 s, 3 moves, +1 move at 50 %.
// Guardians: 150-240 s, 2 phases.
//
// HP formula (DESIGN §20.3): hp = lengthSec * refDPS(L) * uptime, then L1 base = that / enemyHpMul(L), with refDPS
//   = tools/balsim.js's measured rotation DPS against the boss (geometric mean of the three weapon families):
//   Mossjaw L5, 72 s, uptime 0.7 -> 8560 · Bramblehorn L8, 170 s, uptime 0.6 -> 21470 (enemyHpMul = 1.09^(L-1)).
var BOSS_DATA = {
  mossjaw: {
    name: 'Mossjaw', sprite: 'mossjaw', kind: 'mini', level: 5, zone: 'rootHollow',
    type: 'beast', el: 'nature', hp: 8560, lengthSec: [60, 90], staggerMax: 4,
    res: { nature: 0.5, fire: -0.5 },        // weak fire, resists nature (STORY.md)
    moveDefs: {
      lunge:   { type: 'line', len: 6, wind: 0.6, open: 1.2, stagger: 1 },
      rootSpit:{ type: 'rain', count: 3, r: 1.2, at: 'player', wind: 0.8, open: 1.0 },
      burrow:  { type: 'vanish', dur: 1.5, then: { type: 'circle', r: 2, at: 'self' }, wind: 0.8, open: 1.2 },
      howl:    { type: 'summon', kind: 'shadehound', n: 2, wind: 0.8, open: 1.0 }  // phase-2 move (director ruling): teaches target priority
    },
    phases: [
      { hpBelow: 1.0, moves: { lunge: 3, rootSpit: 2, burrow: 2 }, onEnter: [] },
      { hpBelow: 0.5, moves: { lunge: 3, rootSpit: 2, burrow: 2, howl: 2 }, onEnter: [{ type: 'roar', banner: 'Mossjaw rears up', dur: 1.2 }] }
    ],
    xp: 0.5, loot: 'mossjaw_skill_rune_guaranteed'
  },
  bramblehorn: {
    name: 'Old Bramblehorn', sprite: 'bramblehorn', kind: 'guardian', level: 8, zone: 'pinewood',
    type: 'beast', el: 'nature', hp: 21470, lengthSec: [150, 240], staggerMax: 5,
    res: { nature: 0.5, fire: -0.5 },        // STORY.md gives no weak/resist for Bramblehorn; assumed to match the beast-nature type
    moveDefs: {
      stomp:     { type: 'circle', r: 3, at: 'self', wind: 0.9, open: 1.5, stagger: 1 },
      rootGrab:  { type: 'line', len: 7, root: 1.5, wind: 0.8, open: 1.2 },      // the mechanic: dodge i-frames or Root-Crown
      trunkSwipe:{ type: 'cone', arc: 100, r: 3, wind: 0.7, open: 1.2 },
      rootWall:  { type: 'arenaShrink', pattern: 'roots_inward' },
      saplings:  { type: 'summon', kind: 'sapling', n: 3, wind: 1.0, open: 1.5 }
    },
    phases: [
      { hpBelow: 1.0, moves: { stomp: 3, rootGrab: 2, trunkSwipe: 2 }, onEnter: [] },
      { hpBelow: 0.5, moves: { stomp: 2, rootGrab: 2, trunkSwipe: 2, rootWall: 1, saplings: 1 },
        onEnter: [{ type: 'arenaShrink', pattern: 'roots_inward' }, { type: 'roar', banner: 'The roots wake', dur: 1.2 }] }
    ],
    xp: 1, loot: 'root_crown'
  }
};
