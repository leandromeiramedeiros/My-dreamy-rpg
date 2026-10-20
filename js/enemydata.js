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
    res: { slash: 0, pierce: 0, fire: 0, frost: 0, nature: 0, lightning: 0, arcane: 0, holy: -0.5 },
    tags: ['flying', 'swarm'],
    parts: ['orbit', 'shoot', 'swarm'],
    params: { orbit: { r: 2.6 }, shoot: { range: 4.5, wind: 0.6, cd: 2.8, speed: 4.5, r: 0.25, col: '#e8d0ff' }, swarm: { n: 4, spread: 1.6, source: 'moth_nest' } },
    xp: 0.08, loot: 'common_vale'
  },

  // ---- Pinewood (L3-10, mid L6.5) -----------------------------------------------------------
  gloomslime: {
    name: 'Gloom Slime', sprite: 'slime', look: 'slime', hp: 520, speed: 2.2, dmg: 32, el: 'gloom', dmgType: 'gloom', stagger: 2,
    res: { slash: -0.5, pierce: 0.25 },
    tags: ['amorphous'],
    parts: ['chase', 'brute', 'split'],
    params: { chase: { hop: 1.8 }, brute: { shape: 'circle', r: 1.15, range: 1.0, wind: 0.55, cd: 1.1, rec: 0.4, splat: true, stopK: 0.8 }, split: { n: 2, type: 'gloomslime_small' } },
    xp: 0.12, loot: 'common_pinewood'
  },
  // Child spawned by Gloom Slime split: ~1 s to kill, no XP of its own.
  gloomslime_small: {
    name: 'Gloom Slime (small)', sprite: 'slime', look: 'slime', scale: 0.7, r: 0.28, hgt: 1.3, hp: 115, speed: 2.6, dmg: 20, el: 'gloom', dmgType: 'gloom', stagger: 1,
    res: { slash: -0.5, pierce: 0.25 },
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
    name: 'Bramble Shaman', sprite: 'shaman', look: 'ogre', scale: 0.8, hp: 400, speed: 1.8, dmg: 24, el: 'nature', dmgType: 'nature', stagger: 1,
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
  },

  // ---- §26.2 elite pockets (Pinewood, near the bosses). Always spawned as ELITES (spawn card elite: '<mod>' -> x ELITE_HP hp,
  // x ELITE_DMG dmg, one elite mod; js/parts.js makeElite), so hp here is the pre-elite base like the ogre's: elite-spawn TTK
  // ~12 s at Pinewood L7 (tools/balsim.js ELITE SPAWN TTK). cls 'elite' = level +2: inside a pocket that is the boss's level + 2 (the map's levelAreas, items.js enemyLevel). xp is pre-multiplied x ELITE_XP (an elite-class row does not get that multiplier).
  // Gnarlroot Brute: the Mossjaw pockets by the Root Hollow door. A slow root-troll with a wide slam: teaches spacing.
  gnarlbrute: {
    name: 'Gnarlroot Brute', cls: 'elite', art: 'mountaintroll', look: 'troll', scale: 0.95, hp: 520, speed: 1.6, dmg: 70, el: 'nature', dmgType: 'slash', stagger: 3,
    res: { slash: 0.25, fire: -0.5 },
    tags: ['brute'],
    parts: ['chase', 'brute'],
    params: { brute: { shape: 'circle', r: 2.2, range: 1.8, wind: 0.85, open: 1.1, cd: 2.0 } },
    xp: 0.72, loot: 'common_pinewood'
  },
  // Thornsow Matriarch: the Bramblehorn pockets by the Clearing. A big thornback that burrows and spurs the pack around her
  // (aura-buffer): kill her first or fight a faster pack.
  thornsow: {
    name: 'Thornsow Matriarch', cls: 'elite', art: 'thornbackboar', look: 'hound', scale: 1.55, hp: 430, speed: 2.4, dmg: 60, el: 'nature', dmgType: 'pierce', stagger: 3,
    res: { slash: 0.25, nature: 0.5, fire: -0.5 },
    tags: ['beast', 'armoured'],
    parts: ['burrow', 'brute', 'aura-buffer'],
    params: { burrow: { vanish: 1.4, erupt: { shape: 'circle', r: 2.2 }, staggerOnSurface: true }, brute: { shape: 'cone', r: 2.0, range: 1.7, wind: 0.7 }, 'aura-buffer': { r: 3.5, dmg: 1.2, speed: 1.1 } },
    xp: 0.6, loot: 'common_pinewood'
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
  // §26.1 multi-bar phases: one HP bar per phase (bars: true), the hit that empties a bar is clamped at its end and a
  // `transition` s invulnerable beat plays the next phase's onEnter telegraph. Each new bar turns three knobs: one new move,
  // one existing move's CUNNING form (forms: feint / then = delayed second hit / lead = aim at the predicted position),
  // more aggression (windMul 1.0 -> 0.85 -> 0.7, cdMul = shorter gaps). Fairness floors: js/bosses.js bossFairness.
  mossjaw: {
    name: 'Mossjaw', sprite: 'mossjaw', kind: 'mini', level: 5, zone: 'rootHollow',
    type: 'beast', el: 'nature', hp: 10000, lengthSec: [60, 90], staggerMax: 4,   // 8560 -> 6000 (QA M1) -> 8250 (M3 step 2) -> 10000 (§26.2 after the howl was tamed: reference 60-90 s holds; -1 tier 3-4/6 at the L8 arrival)
    res: { nature: 0.5, fire: -0.5 },        // weak fire, resists nature (STORY.md)
    bars: true, transition: 1.5,             // 2 bars (mini-boss)
    moveDefs: {
      lunge:   { type: 'line', len: 6, wind: 0.75, open: 1.2, stagger: 1 },   // wind 0.6 -> 0.75 (QA M1: a 0.3 s reaction + 1.1-tile sidestep must fit); bar 2: 0.64
      rootSpit:{ type: 'rain', count: 3, r: 1.2, at: 'player', wind: 0.9, open: 1.0 },   // wind 0.8 -> 0.9: walk-out of a 1.2 circle on the hero in bar 2 (0.77 s)
      burrow:  { type: 'vanish', dur: 1.5, then: { type: 'circle', r: 1.6, at: 'self' }, wind: 1.15, open: 1.2 },  // r 2 / wind 0.8 -> 1.6 / 1.0 -> 1.15 (§26.2: 0.98 s in bar 2, a 2-tile walk-out after a 0.3 s reaction): it surfaces under the hero
      howl:    { type: 'summon', kind: 'shadehound', n: 2, wind: 0.8, open: 1.0 }  // bar-2 move (director ruling): teaches target priority; 0.68 s cue in bar 2 (ring + warn_summon)
    },
    phases: [
      // bar 1: the hound learns you
      { hpBelow: 1.0, moves: { lunge: 3, rootSpit: 2, burrow: 3 }, cdMul: 0.75, onEnter: [] },
      // bar 2: new move howl (2 shadehounds, at most 2 alive, 12 s rest; BOSS_FILL: hounds -20 % HP / -30 % bite, they flee when Mossjaw dies);
      // cunning: the lunge FEINTS (0.4 s fake crouch, then the real 0.64 s lunge, re-aimed); windMul 0.85, gaps x0.4, speed x1.2
      { hpBelow: 0.5, moves: { lunge: 3, rootSpit: 2, burrow: 3, howl: 8 }, windMul: 0.85, cdMul: 0.4, speedMul: 1.2,
        forms: { lunge: { feint: 0.4 } },
        onEnter: [{ type: 'roar', banner: 'Mossjaw rears up', dur: 1.2 }] }
    ],
    xp: 0.5, loot: 'mossjaw_skill_rune_guaranteed'
  },
  bramblehorn: {
    name: 'Old Bramblehorn', sprite: 'bramblehorn', kind: 'guardian', level: 8, zone: 'pinewood',
    type: 'beast', el: 'nature', hp: 22000, lengthSec: [150, 240], staggerMax: 5,   // 21470 -> 17200 (QA B2) -> 23100 (M3 step 2: v2 gear; every family 150-240 s on reference gear, balsim) -> 22000 (§26.2: 3 bars + cunning forms carry the difficulty; reference 150-240 s holds)
    res: { nature: 0.5, fire: -0.5 },        // STORY.md gives no weak/resist for Bramblehorn; assumed to match the beast-nature type
    bars: true, transition: 1.5,             // 3 bars (guardian)
    moveDefs: {
      stomp:     { type: 'circle', r: 3, at: 'self', wind: 0.9, open: 1.5, stagger: 1 },   // BOSS_FILL scale 'none': 0.9 s wind + 1.5 s open in every bar (walk-out from melee range)
      rootGrab:  { type: 'line', len: 7, root: 1.5, wind: 0.85, open: 1.2 },     // the mechanic: dodge i-frames or Root-Crown; wind 0.8 -> 0.85: bar 3 0.6 s (walk-out), lead-aimed
      trunkSwipe:{ type: 'cone', arc: 90, r: 3, wind: 0.95, open: 1.2 },        // arc 100 -> 90, wind 0.7 -> 0.95: bar 3 0.67 s still walks out from melee range (1.34 tiles)
      backhand:  { type: 'cone', arc: 90, r: 3.2, wind: 0.95, open: 1.2 },      // the trunk swipe's delayed second hit (bar 2+), re-aimed at the hero
      trample:   { type: 'charge', len: 7, w: 1.0, wind: 1.1, speed: 14, open: 1.3, range: 'far' },   // bar-3 move: punishes standing off; 0.77 s at x0.7 (walk-out 1.7 tiles)
      rootWall:  { type: 'arenaShrink', pattern: 'roots_inward' },
      saplings:  { type: 'summon', kind: 'sapling', n: 2, wind: 1.0, open: 1.5 }   // n 3 -> 2 (§26.2 tuning: bars 2-3 carry the pressure)
    },
    phases: [
      // bar 1: the old troll's three verbs (base gaps +0.8 s in BOSS_FILL: a calm teaching bar)
      { hpBelow: 1.0, moves: { stomp: 2, rootGrab: 2, trunkSwipe: 2 }, onEnter: [] },
      // bar 2: new move saplings (turrets; the root wall closes the ring); cunning: trunkSwipe -> a short 0.35 s beat, then the
      // BACKHAND (delayed second hit, re-aimed, 0.81 s wind); windMul 0.85, gaps x0.8; bars 38 / 37 / 25 % of the HP
      { hpBelow: 0.62, moves: { stomp: 1.5, rootGrab: 2, trunkSwipe: 2, rootWall: 1, saplings: 1 }, windMul: 0.85, cdMul: 0.8,
        forms: { trunkSwipe: { open: 0.35, then: 'backhand' } },
        onEnter: [{ type: 'arenaShrink', pattern: 'roots_inward', k: 0.75, rMin: 5.5 }, { type: 'roar', banner: 'The roots wake', dur: 1.2 }] },   // ring >= 5.5 tiles: room to walk out of a 3-tile stomp, and the card's saplings (<= 5.4 from the centre) stay inside
      // bar 3: new move trample (charge); cunning: rootGrab LEAD-AIMS 0.45 s ahead of a moving hero (+ bar 2's backhand); windMul 0.7, gaps x0.65
      { hpBelow: 0.25, moves: { stomp: 1, rootGrab: 2, trunkSwipe: 2, rootWall: 1, saplings: 1, trample: 2 }, windMul: 0.7, cdMul: 0.65, speedMul: 1.2,
        forms: { rootGrab: { lead: 0.45 } },
        onEnter: [{ type: 'roar', banner: 'Old Bramblehorn splinters into a fury', dur: 1.0 }] }
    ],
    xp: 1, loot: 'root_crown'
  }
};
