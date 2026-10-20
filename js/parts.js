'use strict';
// ---------------------------------------------------------------------------
// parts.js — enemies are DATA (DESIGN §21.2): behaviour parts, the enemy table ENEMY and ELITE_MODS (§21.3).
// Loaded after world.js / enemydata.js and BEFORE bosses.js, maps.js and game.js (index.html + editor.html). Load time is
// pure data; every function here runs only at play time and may call game.js (moveEntity, hurtPlayer, tele, fx,
// spawnProj, spawnEnemy ...).
//
// ===== ROW SCHEMA (what js/enemydata.js writes as ENEMY_DATA = { id: row }) =====================================
//   { name, sprite, hp, speed, dmg, el, dmgType, stagger, res, tags, parts: [...], params: { part: {...} },
//     // optional:
//     r (body radius, tiles, default 0.42), hgt (nameplate height, tiles, default 3), blood (hit colour),
//     cls: 'normal' | 'elite' (default: normal; elite also when hp >= 1000 like before),
//     xp (kill XP as a FRACTION of the enemy level's XP bar, default min(1.2, hp / 1300)),
//     look (an ENEMY id whose art is borrowed until `sprite` exists), scale (art scale), ai (legacy, see below) }
//   UNITS  hp = L1 base (the engine multiplies by enemyHpMul(level), items.js) · speed = tiles/s (hero 3.7)
//          dmg = L1 raw hit (x enemyDmgMul(level)) · times in s · distances / radii in tiles · angles: arc in
//          DEGREES when > 6.3, else radians · res tiers: -0.5 weak, 0.5 resist, 1 immune (same as data.js)
//   el      = what the enemy IS (theming, holy x1.5 on 'gloom' via tags) · dmgType = what its attacks deal
//   stagger = poise: skill stagger points that interrupt a wind-up (0 = never interrupted)
//   tags    = archetype words (amorphous, beast, gloom, ethereal, flying, swarm ...)
//   parts   = one movement + 1-2 attacks + 0-1 support + any death/group parts, from PARTS below
//   params  = per part overrides of the PARTS[id].def numbers, e.g. { brute: { shape: 'circle', r: 2.4, wind: 1 } }
// PRECEDENCE  built-in rows (BUILTIN_ROWS) < ENEMY_DATA (js/enemydata.js, if loaded) < world.enemies (editor, js/world.js).
//   Ids keep their legacy names (slime, wisp, hound, ogre, troll) because world.js / dialogue.js / the map generator
//   spawn them. ENEMY_ALIASES maps generator / STORY names onto ENEMY_DATA ids (shaman -> brambleshaman ...).
//   A row given with only the legacy `ai` (hopper | shooter | charger | brute, the editor's Behaviour menu) gets its
//   parts derived from ai at spawn (partsFromAi), so editor-made enemies keep working.
//
// ===== PARTS (params and defaults) =============================================================================
// movement (one):
//   chase      { hop: 0 (x sin hop pulse, slime 1.8), stopK: 0.8 (stop at attack range x stopK) }
//   kite       { near: 3.6, far: 6, strafe: 0.6 }                     keeps its distance, strafes in the band
//   orbit      { r: 2.4, dir: ±1, k: 1.2 }                            circles the hero
//   charge     { range: 3.2, len: range + 0.4, w: 0.5, wind: 0.48, cd: 1.6, speed: 12, dur: 0.3, rec: 0.5 }
//              chases, telegraphs a line, then lunges (hits once) — it is also its attack
//   burrow     { range: 7, vanish: 1.5, wind: 0.6, cd: 4.5, rec: 1, erupt: { r: 2 }, staggerOnSurface: false }
//              digs in (untargetable), travels under the hero, telegraphs a circle, erupts
//   teleport   { range: 7, cd: 4, wind: 0.6, near: 2.5, far: 5 }      fades out and reappears around the hero
//   stationary {}                                                     never moves (turrets, totems)
//   sleep      { wakeRadius: 3, wakeOn: 'proximity' | 'hit', then: 'chase' }   dormant until woken, then `then` moves it
//   mimic      { wakeRadius: 1.6, then: 'chase' }                     looks like a chest until the hero is close
// attack (1-2): every attack has { range, wind, cd, rec } (rec = the open window after it)
//   brute      { shape: 'cone' | 'circle', r: 1.8, arc: 1.9, wind: 0.6, cd: 1.5, range: 1.5, strike: 0.15, rec: 0.6,
//                stopK: 0.65, splat: false (slime-style hop splat instead of a smash) }
//   shoot      { range: 6, wind: 0.6, cd: 2.1, speed: 5.5, r: 0.35, life: 2.5, n: 1, spread: 0.25, rec: 0.3 }
//   sniper     { range: 9, wind: 1.1, cd: 3.4, speed: 15, w: 0.25, rec: 0.6 }   locked thin line, then a fast bolt
//   bomber     { range: 6, wind: 0.9, cd: 2.8, r: 1.3, rec: 0.5 }      lobs onto the hero's spot (circle telegraph)
//   zone-caster{ kind: 'poison' | 'slow' | 'fire' | 'void', n: 2, r: 1.2, life: 6, tick: 0.5, dmgK: 0.25, range: 7,
//                wind: 0.8, cd: 6, rec: 0.6 }                         hostile ground zones near the hero
// support (0-1):
//   healer     { heal: 0.25 (capped 0.3 of the target's max HP), telegraph: 4, cd: 8, range: 7 }  4 s visible link
//   aura-buffer{ r: 3, dmg: 1.25, speed: 1.15 }                      allies inside deal more / move faster
//   summon     { kind: 'slime', n: 2, max: 4, cd: 9, wind: 0.9, range: 9 }
//   shield-front { arc: 120 (deg), mul: 0.2 }                         hits from the front deal 20 %
// death and group:
//   split      { n: 2, type: <row id> }                               children on death (give no XP: their row xp 0)
//   zone-on-death { kind: 'poison', r: 1.6, life: 4, tick: 0.5, dmgK: 0.3, delay: 0.6 }
//   swarm      { n: 4, spread: 0.9 }  one spawn = n members sharing hp / n each; XP, loot and kill count once
//
// ===== ELITE_MODS (§21.3) ======================================================================================
// spawn action { elite: true | '<mod id>' | ['a','b'] } -> e.elite, x ELITE_HP hp, x ELITE_DMG dmg, mods below.
//   shielded (periodic shield with HP to break) · storm (Shock aura arcs when adjacent) · burning (fire trail) ·
//   frozen (rare: chill aura slows) · gloomed (Dread aura: hero deals less) · twin (a linked copy at 50 % HP; XP
//   once) · vampiric (heals on hit) · summoner (periodic swarm). ELITE_MODS[id] = { name, col, rare?, spawn, tick,
//   onHit, onHurt }.
//
// ===== SPRITE CONTRACT (Sonnet) ================================================================================
// row.sprite names ART.custom[sprite] (world.sprites pixel rows, or a global ENEMY_SPRITES = { id: { w, h, pal, rows }
// } loaded before main.js). Optional 12-frame sets: ENEMY_SPRITES[id].frames = { idle: [rows, rows], move: [x4],
// wind: [x2], attack: [x2], hurt: [x1], die: [x1] } (each entry a rows[] array sharing w / h / pal); render.js picks
// by state. Until a sprite exists the row's `look` (another enemy id) is drawn, tinted by its blood colour.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------- built-in rows (ported 1:1 from M2a game.js)
const BUILTIN_ROWS = {
  slime: { name: 'Gloom slime', ai: 'hopper', hp: 450, r: 0.38, speed: 2.0, dmg: 32, hgt: 1.8, blood: '#8b7cf6', xp: 0.13,
    el: 'gloom', dmgType: 'gloom', stagger: 0, res: { pierce: 0.5, slash: -0.5 }, tags: ['amorphous', 'gloom'],
    parts: ['chase', 'brute'], params: { chase: { hop: 1.8 }, brute: { shape: 'circle', r: 1.15, range: 1.0, wind: 0.55, cd: 1.1, rec: 0.4, splat: true, stopK: 0.8 } } },
  wisp: { name: 'Wisp', ai: 'shooter', hp: 235, r: 0.32, speed: 1.9, dmg: 34, hgt: 3.2, blood: '#9ef0ff', xp: 0.092,
    el: 'arcane', dmgType: 'arcane', stagger: 0, res: { slash: 0.5, pierce: 0.5, holy: -0.5, lightning: -0.5 }, tags: ['ethereal', 'flying'],
    parts: ['kite', 'shoot'], params: { shoot: { range: 6, wind: 0.6, cd: 2.1 } } },
  hound: { name: 'Shade hound', ai: 'charger', hp: 570, r: 0.42, speed: 3.2, dmg: 46, hgt: 2.0, blood: '#ff6b9a', xp: 0.185,
    el: 'gloom', dmgType: 'slash', stagger: 0, res: { fire: -0.5 }, tags: ['beast', 'gloom'],
    parts: ['charge'], params: { charge: { range: 3.2, wind: 0.48, cd: 1.6 } } },
  ogre: { name: 'Ogre', ai: 'brute', sprite: 'ogre', hp: 515, r: 0.5, speed: 2, dmg: 42, hgt: 3, blood: '#c8a060', xp: 0.32,
    el: 'nature', dmgType: 'slash', stagger: 0, res: { fire: -0.5 }, tags: ['beast'],
    parts: ['chase', 'brute'], params: { brute: { shape: 'cone', r: 1.9, range: 1.6, wind: 0.6, cd: 1.7 } } },
  troll: { name: 'Mountain troll', ai: 'brute', sprite: 'troll', hp: 1245, r: 0.75, speed: 1.3, dmg: 95, hgt: 4, blood: '#9ab06a', xp: 1.15,
    el: 'nature', dmgType: 'slash', stagger: 0, res: { fire: -0.5, pierce: 0.5 }, tags: ['beast'],
    parts: ['chase', 'brute'], params: { brute: { shape: 'circle', r: 2.4, range: 2, wind: 1, cd: 2.4 } } },
  // Bramblehorn's phase-2 add (STORY.md): a rooted thorn turret; Wildfire is the counter
  sapling: { name: 'Sapling', look: 'ogre', scale: 0.55, hp: 225, r: 0.3, speed: 0, dmg: 22, hgt: 1.6, blood: '#7ac060', xp: 0.03,
    el: 'nature', dmgType: 'pierce', stagger: 1, res: { fire: -0.5, nature: 0.5 }, tags: ['plant', 'child'],
    parts: ['stationary', 'shoot'], params: { shoot: { range: 7, wind: 0.8, cd: 2.6, speed: 6, col: '#a6f08a' } } },
  dummy: { name: 'Training dummy', ai: 'dummy', hp: 9999, r: 0.35, speed: 0, dmg: 0, hgt: 3, blood: '#e7c9a0', parts: [] },
};
// generator / STORY names -> ENEMY_DATA ids (only applied when the alias target exists and the name itself does not)
const ENEMY_ALIASES = { shaman: 'brambleshaman', boar: 'thornbackboar', moth: 'dreammoth', mothswarm: 'dreammoth' };
const enemyId = t => (ENEMY[t] ? t : ENEMY_ALIASES[t] && ENEMY[ENEMY_ALIASES[t]] ? ENEMY_ALIASES[t] : t);

// legacy ai -> parts (rows written before the part runtime, and the editor's Behaviour menu)
function partsFromAi(d) {
  const num = (v, x) => (v != null && v !== '' && isFinite(+v) ? +v : x);
  const atk = { range: num(d.range, 1.5), wind: num(d.wind, 0.6), cd: num(d.cd, 1.5) };
  switch (d.ai) {
    case 'hopper': return { parts: ['chase', 'brute'], params: { chase: { hop: 1.8 }, brute: Object.assign(atk, { shape: 'circle', r: num(d.aoe, 1.15), rec: 0.4, splat: true, stopK: 0.8 }) } };
    case 'shooter': return { parts: ['kite', 'shoot'], params: { shoot: atk } };
    case 'charger': return { parts: ['charge'], params: { charge: atk } };
    case 'dummy': case 'boss': return { parts: [], params: {} };
    default: return { parts: ['chase', 'brute'], params: { brute: Object.assign(atk, { shape: d.shape === 'circle' ? 'circle' : 'cone', r: num(d.aoe, d.shape === 'circle' ? 2 : 1.8) }) } };
  }
}
// a compiled ENEMY def keeps the legacy fields (editor, hud, menus, items read them) next to the row fields
function compileRow(id, row, base) {
  const d = Object.assign({}, base || {}, row);
  if (row.params && base && base.params) { d.params = {}; for (const k of new Set([...Object.keys(base.params), ...Object.keys(row.params)])) d.params[k] = Object.assign({}, base.params[k], row.params[k]); }
  d.dmgType = d.dmgType || d.element || 'slash'; d.element = d.dmgType;
  if (d.el === 'none') d.el = null;
  d.res = Object.assign({}, d.res || {}); for (const k in d.res) { d.res[k] = +d.res[k] || 0; if (!d.res[k]) delete d.res[k]; }
  d.tags = (d.tags || []).slice(); if (d.el === 'gloom' && !d.tags.includes('gloom')) d.tags.push('gloom');
  for (const f of ['hp', 'r', 'speed', 'dmg', 'stagger', 'hgt']) if (d[f] != null) d[f] = +d[f];
  d.r = d.r || 0.42; d.hgt = d.hgt || 3; d.blood = d.blood || '#c7a8ff';
  if (!d.ai) d.ai = aiOfParts(d.parts || []);
  // legacy mirrors of the first attack (editor Enemies tab, tuning, sheets.js)
  const a = d.parts && d.params ? (d.params.brute || d.params.shoot || d.params.charge || {}) : {};
  if (d.range == null && a.range != null) d.range = a.range;
  if (d.wind == null && a.wind != null) d.wind = a.wind;
  if (d.cd == null && a.cd != null) d.cd = a.cd;
  if (d.aoe == null && a.r != null && d.params.brute) d.aoe = a.r;
  if (d.shape == null && d.params && d.params.brute) d.shape = d.params.brute.shape;
  return d;
}
const aiOfParts = parts => parts.includes('charge') ? 'charger' : parts.includes('kite') && parts.includes('shoot') ? 'shooter' : parts.includes('brute') ? 'brute' : parts.length ? 'parts' : 'dummy';

const ENEMY = {};
(function buildEnemyTable() {
  for (const k in BUILTIN_ROWS) ENEMY[k] = compileRow(k, BUILTIN_ROWS[k]);
  const data = typeof ENEMY_DATA !== 'undefined' && ENEMY_DATA ? ENEMY_DATA : {};
  for (const k in data) {
    // the five ported ids keep the engine's parts (feel acceptance); ENEMY_DATA may still retune their numbers
    const row = Object.assign({}, data[k]);
    if (BUILTIN_ROWS[k] && BUILTIN_ROWS[k].parts && BUILTIN_ROWS[k].parts.length) { row.parts = BUILTIN_ROWS[k].parts; row.params = BUILTIN_ROWS[k].params; }
    ENEMY[k] = compileRow(k, row, BUILTIN_ROWS[k]);
  }
  // the Gloam Warden (bosses.js owns its moves); kept as ENEMY.boss for the HUD, bestiary and spawn_boss
  ENEMY.boss = { name: 'The Gloam Warden', ai: 'boss', boss: 'boss', hp: 27660, r: 0.95, speed: 1.6, dmg: 0, range: 0, wind: 0, cd: 0, hgt: 9, blood: '#c78bff',
    element: 'gloom', dmgType: 'gloom', el: 'gloom', res: { arcane: 0.5, gloom: 0.5, holy: -0.5 }, tags: ['gloom', 'ethereal'], parts: [] };
})();
// parts + params of a def (explicit parts, else derived from the legacy ai)
function defParts(d) {
  if (d.parts && (d.parts.length || d.ai === 'dummy' || d.ai === 'boss')) return { parts: d.parts, params: d.params || {} };
  return partsFromAi(d);
}

// ---------------------------------------------------------------- helpers
let PART_SRC = null;   // the enemy whose telegraph is being created (tele() tags it so a stagger can clear it)
const degArc = a => (a > 6.3 ? a * Math.PI / 180 : a);
const PART_ATK_PRIO = ['charge', 'burrow', 'teleport', 'healer', 'summon', 'zone-caster', 'sniper', 'bomber', 'brute', 'shoot'];
function partParam(def, id, over) {
  const P = PARTS[id]; if (!P) return null;
  const o = Object.assign({}, P.def, over || {});
  if (o.arc != null) o.arc = degArc(+o.arc);
  if (id === 'charge' && (over || {}).len == null) o.len = o.range + 0.4;
  if (id === 'healer') o.heal = Math.min(0.3, +o.heal || 0.25);
  if (o.telegraph != null && id === 'healer') o.wind = +o.telegraph;
  if (o.open != null && o.rec == null) o.rec = +o.open;
  if (over && over.open != null) o.rec = +over.open;
  if (id === 'burrow' && over && over.erupt && over.erupt.r) o.r = +over.erupt.r;
  if (id === 'burrow' && over && over.vanish != null) o.dur = +over.vanish;
  return o;
}
// e.pp[id] = params, e.acts = action part ids in priority order, e.move = movement part, e.reach = stop distance
function initParts(e, d) {
  const { parts, params } = defParts(d);
  e.parts = parts.filter(id => PARTS[id]); e.pp = {}; e.pcd = {};
  for (const id of e.parts) e.pp[id] = partParam(d, id, params[id]);
  e.move = e.parts.find(id => PARTS[id].cat === 'move') || (e.parts.length ? 'chase' : null);
  if (e.move && !e.pp[e.move]) e.pp[e.move] = partParam(d, e.move, params[e.move]);
  e.acts = PART_ATK_PRIO.filter(id => e.pp[id] && PARTS[id].fire);
  for (const id of e.acts) e.pcd[id] = rand(0.5, 1.5);
  let reach = 0;
  for (const id of e.acts) { const P = e.pp[id]; if (id === 'brute' || id === 'charge') reach = Math.max(reach, P.range * (P.stopK != null ? P.stopK : id === 'brute' ? 0.65 : 0.8)); }
  e.reach = reach;
  e.dmgK = 1; e.spdK = 1;
  for (const id of e.parts) if (PARTS[id].spawn) PARTS[id].spawn(e, e.pp[id]);
}
// an enemy's outgoing damage multiplier: elite x ELITE_DMG, an aura-buffer ally nearby
const enemyDmgK = e => (e.dmgK || 1) * (e.auraT > 0 ? e.auraDmg || 1 : 1);
// one enemy strike on the hero: elite hooks (vampiric), returns whether it landed
function enemyHit(e, dmg, el) {
  const ok = hurtPlayer(dmg * enemyDmgK(e), e.x, e.y, el || e.el);
  if (ok) for (const m of e.mods || []) if (ELITE_MODS[m] && ELITE_MODS[m].onHit) ELITE_MODS[m].onHit(e, dmg);
  return ok;
}
// hostile ground zone (hurts the hero; game.js updateZones runs it)
function hostileZone(o) {
  const z = zone(Object.assign({ hostile: true, tick: 0.5, life: 4, r: 1.2, dmg: 10, col: '#9ae06a' }, o));
  z.cast = null; return z;
}
const ZONE_KIND = { poison: { col: '#9ae06a', el: 'nature' }, slow: { col: '#9fe8ff', el: 'frost', slow: true }, fire: { col: '#ff9a4a', el: 'fire' },
  lava: { col: '#ff6a2a', el: 'fire' }, void: { col: '#c070ff', el: 'gloom' }, shock: { col: '#fff07a', el: 'lightning' } };
const zoneOf = (kind, o) => Object.assign({ kind: 'h_' + kind, col: (ZONE_KIND[kind] || ZONE_KIND.poison).col, el: (ZONE_KIND[kind] || ZONE_KIND.poison).el, slow: !!(ZONE_KIND[kind] || {}).slow }, o);
function partsNear(e, r) { return G.enemies.filter(o => o !== e && !o.dead && !o.dummy && o.spawnT <= 0 && dist(o.x, o.y, e.x, e.y) < r); }
function walkTo(e, x, y) { const m = G.map; return walkable(m, x, y, tileH(m, e.x, e.y)) || walkable(m, x, y, tileH(m, x, y)); }

// ---------------------------------------------------------------- PARTS
// cat: move | attack | support | death. Hooks (all optional):
//   spawn(e, P) · tick(e, P, c, dt) (every frame, before the state machine) · move(e, P, c) -> { x, y, k, stop }
//   ready(e, P, c) -> bool · begin(e, P, c) -> wind seconds (telegraph here) · fire(e, P, c) -> [state, seconds] | null
//   act(e, P, c, dt) (while that state runs) · death(e, P) · hurt(e, P, dmg, o) -> damage multiplier
// c = { p, d (distance to hero), ang, hidden, dt }
const PARTS = {
  // ---- movement
  chase: { cat: 'move', def: { hop: 0, stopK: 0.8 },
    move(e, P, c) { const k = P.hop ? Math.max(0, Math.sin(e.anim * 6)) * P.hop : 1; return { x: Math.cos(c.ang), y: Math.sin(c.ang), k, stop: c.d < e.reach }; } },
  kite: { cat: 'move', def: { near: 3.6, far: 6, strafe: 0.6 },
    move(e, P, c) {
      if (c.d < P.near) return { x: -Math.cos(c.ang), y: -Math.sin(c.ang), k: 1 };
      if (c.d > P.far) return { x: Math.cos(c.ang), y: Math.sin(c.ang), k: 1 };
      return { x: Math.cos(c.ang + Math.PI / 2) * P.strafe, y: Math.sin(c.ang + Math.PI / 2) * P.strafe, k: 1 };
    } },
  orbit: { cat: 'move', def: { r: 2.4, dir: 0, k: 1.2 },
    spawn(e, P) { if (!P.dir) P.dir = Math.random() < 0.5 ? -1 : 1; e.orbA = Math.random() * 6.28; },
    move(e, P, c) {
      const rad = (c.d - P.r) * P.k, ta = c.ang + Math.PI / 2 * P.dir;
      return { x: Math.cos(c.ang) * rad + Math.cos(ta), y: Math.sin(c.ang) * rad + Math.sin(ta), k: 1 };
    } },
  charge: { cat: 'move', def: { range: 3.2, len: 3.6, w: 0.5, wind: 0.48, cd: 1.6, speed: 12, dur: 0.3, rec: 0.5 },
    move(e, P, c) { return { x: Math.cos(c.ang), y: Math.sin(c.ang), k: 1, stop: c.d < e.reach }; },
    ready: (e, P, c) => c.d < P.range,
    begin(e, P, c) { e.aimA = c.ang; tele({ kind: 'line', x: e.x, y: e.y, ang: c.ang, len: P.len, w: P.w, life: P.wind, col: '#ff5aa0' }); return P.wind; },
    fire(e, P) { e.hitP = false; return ['lunge', P.dur]; },
    act(e, P, c, dt) {
      moveEntity(e, Math.cos(e.aimA) * P.speed * dt, Math.sin(e.aimA) * P.speed * dt, tileH(G.map, e.x, e.y));
      if (!e.hitP && dist(e.x, e.y, c.p.x, c.p.y) < e.r + c.p.r + 0.3) { e.hitP = true; enemyHit(e, e.def.dmg * e.dm, e.el); }
    } },
  burrow: { cat: 'move', def: { range: 7, dur: 1.5, wind: 0.6, cd: 4.5, rec: 1, r: 2, staggerOnSurface: false },
    move(e, P, c) { return { x: Math.cos(c.ang), y: Math.sin(c.ang), k: 1, stop: c.d < e.reach }; },
    ready: (e, P, c) => c.d < P.range,
    begin(e, P) { e.under = true; burst(e.x, e.y, 0.2, 14, ['#6a5a3a', '#a08860'], 3, { glow: false }); sfx('heavy'); return P.dur; },
    act() {},
    fire(e, P, c) {
      // surface under the hero: the circle telegraph is the dodge window, then the eruption
      const tx = c.p.x + frand(-0.4, 0.4), ty = c.p.y + frand(-0.4, 0.4);
      if (walkTo(e, tx, ty)) { e.x = tx; e.y = ty; }
      tele({ kind: 'circle', x: e.x, y: e.y, r: P.r, life: P.wind, col: '#ff5a3a' });
      e.eruptT = P.wind; return ['erupt', P.wind];
    } },
  teleport: { cat: 'move', def: { range: 8, cd: 4, wind: 0.6, near: 2.5, far: 5, rec: 0.4 },
    move(e, P, c) { return c.d > P.far ? { x: Math.cos(c.ang), y: Math.sin(c.ang), k: 0.6 } : { x: 0, y: 0, k: 0 }; },
    ready: (e, P, c) => c.d < P.range,
    begin(e, P) { fx({ type: 'ring', x: e.x, y: e.y, r: 0.9, col: '#c7a8ff', life: P.wind }); e.fadeT = P.wind; return P.wind; },
    fire(e, P, c) {
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * 6.28, r = rand(P.near, P.far), x = c.p.x + Math.cos(a) * r, y = c.p.y + Math.sin(a) * r;
        if (walkable(G.map, x, y, tileH(G.map, x, y))) { burst(e.x, e.y, 1, 10, ['#c7a8ff', '#ffffff'], 2); e.x = x; e.y = y; burst(x, y, 1, 10, ['#c7a8ff', '#ffffff'], 2); sfx('blink'); break; }
      }
      e.fadeT = 0; return null;
    } },
  stationary: { cat: 'move', def: {}, move: () => ({ x: 0, y: 0, k: 0, stop: true }) },
  sleep: { cat: 'move', def: { wakeRadius: 3, wakeOn: 'proximity', then: 'chase' },
    spawn(e) { e.asleep = true; },
    tick(e, P, c) { if (e.asleep && (P.wakeOn !== 'hit' && c.d < P.wakeRadius || e.hp < e.maxHp)) partsWake(e, P); },
    move(e, P, c) { return e.asleep ? null : PARTS[P.then].move(e, e.pp[P.then] || PARTS[P.then].def, c); },
    hurt(e, P) { if (e.asleep) partsWake(e, P); return 1; } },
  mimic: { cat: 'move', def: { wakeRadius: 1.6, then: 'chase' },
    spawn(e) { e.asleep = true; e.mimic = true; },
    tick(e, P, c) { if (e.asleep && (c.d < P.wakeRadius || e.hp < e.maxHp)) { partsWake(e, P); e.mimic = false; shake(4); sfx('roar'); text(e.x, e.y, e.z + e.hgt + 0.6, 'MIMIC!', '#ff7a5a', true); } },
    move(e, P, c) { return e.asleep ? null : PARTS[P.then].move(e, e.pp[P.then] || PARTS[P.then].def, c); },
    hurt(e, P) { if (e.asleep) { partsWake(e, P); e.mimic = false; } return 1; } },

  // ---- attacks
  brute: { cat: 'attack', def: { shape: 'cone', r: 1.8, arc: 1.9, wind: 0.6, cd: 1.5, range: 1.5, strike: 0.15, rec: 0.6, stopK: 0.65, splat: false },
    ready: (e, P, c) => c.d < P.range,
    begin(e, P, c) {
      e.aimA = c.ang;
      if (P.splat) { tele({ kind: 'circle', x: e.x, y: e.y, r: P.r, life: P.wind, col: '#ff5aa0' }); return P.wind; }
      e.hit = P.shape === 'circle' ? { kind: 'circle', x: e.x, y: e.y, r: P.r } : { kind: 'cone', x: e.x, y: e.y, ang: c.ang, arc: P.arc, r: P.r };
      tele(Object.assign({ life: P.wind, col: '#ff5a3a' }, e.hit));
      return P.wind;
    },
    fire(e, P) {
      if (P.splat) {
        if (playerIn({ kind: 'circle', x: e.x, y: e.y, r: P.r })) enemyHit(e, e.def.dmg * e.dm, e.el);
        e.squash = 0.3; burst(e.x, e.y, 0.2, 8, [e.blood, '#e2dbff'], 2); return null;
      }
      const H = e.hit;
      if (H && playerIn(H)) enemyHit(e, e.def.dmg * e.dm, e.el);
      if (H && H.kind === 'circle') { fx({ type: 'ring', x: e.x, y: e.y, r: H.r, col: '#ffb070', life: 0.45 }); burst(e.x, e.y, 0.2, 30, ['#8a6a4a', '#c8b090', '#5a4a3a'], 5, { glow: false }); }
      else if (H) fx({ type: 'slash', x: e.x, y: e.y, z: 0.6, ang: H.ang, arc: H.arc, r: H.r, col: '#ffcf9a', life: 0.25, w: 6 });
      shake(P.r > 2 ? 9 : 4); sfx('heavy');
      return ['strike', P.strike];
    } },
  shoot: { cat: 'attack', def: { range: 6, wind: 0.6, cd: 2.1, speed: 5.5, r: 0.35, life: 2.5, n: 1, spread: 0.25, rec: 0.3, col: '#9ef0ff' },
    ready: (e, P, c) => c.d < P.range,
    begin: (e, P) => P.wind,
    fire(e, P, c) {
      const a0 = Math.atan2(c.p.y - e.y, c.p.x - e.x);
      for (let k = 0; k < P.n; k++) spawnProj({ x: e.x, y: e.y, z: 2.2, ang: a0 + (k - (P.n - 1) / 2) * P.spread, speed: P.speed, r: P.r, dmg: e.def.dmg * e.dm * enemyDmgK(e), el: e.el, life: P.life, kind: 'orb', col: P.col, friendly: false, src: e });
      sfx('arcane'); return null;
    } },
  sniper: { cat: 'attack', def: { range: 9, wind: 1.1, cd: 3.4, speed: 15, w: 0.25, rec: 0.6 },
    ready: (e, P, c) => c.d < P.range && c.d > 2,
    begin(e, P, c) { e.aimA = c.ang; tele({ kind: 'line', x: e.x, y: e.y, ang: c.ang, len: P.range + 1, w: P.w, life: P.wind, col: '#ff3a5a' }); sfx('beam'); return P.wind; },
    fire(e, P) { spawnProj({ x: e.x, y: e.y, z: 1.8, ang: e.aimA, speed: P.speed, r: 0.3, dmg: e.def.dmg * e.dm * enemyDmgK(e), el: e.el, life: (P.range + 1) / P.speed, kind: 'orb', col: '#ff8aa0', friendly: false, src: e }); sfx('bow'); return null; } },
  bomber: { cat: 'attack', def: { range: 6, wind: 0.9, cd: 2.8, r: 1.3, rec: 0.5 },
    ready: (e, P, c) => c.d < P.range,
    begin(e, P, c) {
      const x = c.p.x, y = c.p.y;
      tele({ kind: 'circle', x, y, r: P.r, life: P.wind, col: '#ff7a3a', onDone: o => {
        if (e.dead) return;
        if (playerIn({ kind: 'circle', x: o.x, y: o.y, r: P.r })) enemyHit(e, e.def.dmg * e.dm, e.el);
        fx({ type: 'ring', x: o.x, y: o.y, r: P.r, col: '#ffb070', life: 0.35 }); burst(o.x, o.y, 0.2, 14, ['#ff9a4a', '#ffd27a'], 3); sfx('boom'); shake(3);
      } });
      return P.wind;
    },
    fire: () => null },
  'zone-caster': { cat: 'attack', def: { kind: 'poison', n: 2, r: 1.2, life: 6, tick: 0.5, dmgK: 0.25, range: 7, wind: 0.8, cd: 6, rec: 0.6 },
    ready: (e, P, c) => c.d < P.range,
    begin(e, P, c) {
      e.zPts = [];
      for (let k = 0; k < P.n; k++) { const a = Math.random() * 6.28, r = k ? rand(0.8, 2) : 0; e.zPts.push([c.p.x + Math.cos(a) * r, c.p.y + Math.sin(a) * r]); }
      for (const [x, y] of e.zPts) tele({ kind: 'circle', x, y, r: P.r, life: P.wind, col: (ZONE_KIND[P.kind] || ZONE_KIND.poison).col });
      return P.wind;
    },
    fire(e, P) { for (const [x, y] of e.zPts || []) hostileZone(zoneOf(P.kind, { x, y, r: P.r, life: P.life, tick: P.tick, dmg: e.def.dmg * e.dm * P.dmgK, src: e })); sfx('veil'); return null; } },

  // ---- support
  healer: { cat: 'support', def: { heal: 0.25, telegraph: 4, wind: 4, cd: 8, range: 7, rec: 0.5 },
    ready(e, P) { return !!healTarget(e, P); },
    begin(e, P) {
      const t = healTarget(e, P); e.healT = t;
      tele({ kind: 'circle', x: t.x, y: t.y, r: t.r + 0.4, life: P.wind, col: '#8fffa8' });
      fx({ type: 'line', x: e.x, y: e.y, ang: Math.atan2(t.y - e.y, t.x - e.x), len: dist(e.x, e.y, t.x, t.y), col: '#8fffa8', life: P.wind });
      return P.wind;
    },
    fire(e, P) {
      const t = e.healT; e.healT = null;
      if (t && !t.dead && dist(e.x, e.y, t.x, t.y) < P.range + 2) { const n = t.maxHp * P.heal; t.hp = Math.min(t.maxHp, t.hp + n); text(t.x, t.y, t.z + t.hgt, '+' + Math.round(n), '#8fffa8'); burst(t.x, t.y, t.z + 1, 14, ['#8fffa8', '#ffffff'], 2); sfx('heal'); }
      return null;
    } },
  'aura-buffer': { cat: 'support', def: { r: 3, dmg: 1.25, speed: 1.15 },
    tick(e, P) { for (const o of partsNear(e, P.r)) { o.auraT = 0.25; o.auraDmg = P.dmg; o.auraSpd = P.speed; } } },
  summon: { cat: 'support', def: { kind: 'slime', n: 2, max: 4, cd: 9, wind: 0.9, range: 9, rec: 0.5 },
    ready(e, P, c) { return c.d < P.range && G.enemies.filter(o => o.summoner === e && !o.dead).length < P.max; },
    begin(e, P) { fx({ type: 'ring', x: e.x, y: e.y, r: 1.4, col: '#b36bff', life: P.wind }); return P.wind; },
    fire(e, P) { for (let k = 0; k < P.n; k++) { const a = k / P.n * 6.28 + Math.random(), s = spawnAt(P.kind, e.x + Math.cos(a) * 1.4, e.y + Math.sin(a) * 1.4, 0.4); if (s) s.summoner = e; } return null; } },
  'shield-front': { cat: 'support', def: { arc: 120, mul: 0.2 },
    hurt(e, P, dmg, o) {
      const sx = o.fx != null ? o.fx : G.player.x, sy = o.fy != null ? o.fy : G.player.y, front = e.aimA != null ? e.aimA : Math.atan2(G.player.y - e.y, G.player.x - e.x);
      if (Math.abs(angDiff(front, Math.atan2(sy - e.y, sx - e.x))) < P.arc / 2) { if (!o.dot) { e.blockT = 0.2; text(e.x, e.y, e.z + e.hgt + 0.3, 'BLOCK', '#cfd6ea'); } return P.mul; }
      return 1;
    } },

  // ---- death and group
  split: { cat: 'death', def: { n: 2, type: 'slime' },
    death(e, P) { for (let k = 0; k < P.n; k++) { const a = k / P.n * 6.28 + Math.random(); const s = spawnEnemy(enemyId(P.type), e.x + Math.cos(a) * 0.5, e.y + Math.sin(a) * 0.5, 0.2); if (s) { s.kx = Math.cos(a) * 3; s.ky = Math.sin(a) * 3; s.noXp = true; } } } },
  'zone-on-death': { cat: 'death', def: { kind: 'poison', r: 1.6, life: 4, tick: 0.5, dmgK: 0.3, delay: 0.6 },
    death(e, P) {
      const x = e.x, y = e.y, dmg = e.def.dmg * e.dm * P.dmgK, col = (ZONE_KIND[P.kind] || ZONE_KIND.poison).col;
      tele({ kind: 'circle', x, y, r: P.r, life: P.delay, col, onDone: () => hostileZone(zoneOf(P.kind, { x, y, r: P.r, life: P.life, tick: P.tick, dmg })) });
    } },
  swarm: { cat: 'death', def: { n: 4, spread: 0.9 },
    spawn(e, P) {
      if (e.swarm) return;   // members do not re-swarm
      const grp = { alive: P.n, n: P.n }; e.swarm = grp;
      e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp / P.n));
      for (let k = 1; k < P.n; k++) {
        const a = k / P.n * 6.28, m = spawnEnemyRaw(e.type, e.x + Math.cos(a) * P.spread, e.y + Math.sin(a) * P.spread, e.spawnT);
        m.swarm = grp; m.hp = m.maxHp = e.maxHp; initParts(m, e.def);
      }
    } },
};
function partsWake(e, P) { e.asleep = false; e.wakeT = 0.6; e.move = P.then || 'chase'; if (!e.pp[e.move]) e.pp[e.move] = partParam(e.def, e.move, {}); text(e.x, e.y, e.z + e.hgt + 0.4, '!', '#ffd35a', true); }
function healTarget(e, P) {
  let best = null, bf = 0.85;
  for (const o of partsNear(e, P.range)) { const f = o.hp / o.maxHp; if (f < bf && !o.boss) { bf = f; best = o; } }
  return best;
}

// ---------------------------------------------------------------- ELITE_MODS (§21.3)
const ELITE_HP = 3.2, ELITE_DMG = 1.25;
const ELITE_MODS = {
  shielded: { name: 'Shielded', col: '#cfe6ff',
    spawn(e) { e.eShieldT = 2; },
    tick(e, dt) {
      if (e.eShield > 0) return;
      e.eShieldT -= dt;
      if (e.eShieldT <= 0) { e.eShield = e.eShieldMax = e.maxHp * 0.15; fx({ type: 'ring', x: e.x, y: e.y, r: e.r + 0.6, col: '#cfe6ff', life: 0.4 }); sfx('shield'); }
    },
    onHurt(e, dmg) {
      if (!(e.eShield > 0)) return dmg;
      const take = Math.min(e.eShield, dmg); e.eShield -= take;
      if (e.eShield <= 0) { e.eShieldT = 6; e.stunT = Math.max(e.stunT, 0.8); text(e.x, e.y, e.z + e.hgt + 0.5, 'SHIELD BROKEN', '#cfe6ff', true); burst(e.x, e.y, e.z + 1, 20, ['#cfe6ff', '#ffffff'], 3); }
      return dmg - take;
    } },
  storm: { name: 'Storm', col: '#fff07a',
    tick(e, dt) {
      e.eArcT = (e.eArcT || 1.2) - dt; const p = G.player;
      if (e.eArcT <= 0 && dist(e.x, e.y, p.x, p.y) < 1.8 + e.r) { e.eArcT = 1.2; fx({ type: 'lightning', pts: [[e.x, e.y, e.z + 1.5], [p.x, p.y, p.z + 1]], life: 0.2, col: '#fff07a' }); enemyHit(e, e.def.dmg * e.dm * 0.35, 'lightning'); sfx('zap'); }
      else if (e.eArcT <= 0) e.eArcT = 0.3;
    } },
  burning: { name: 'Burning', col: '#ff9a4a',
    tick(e, dt) {
      e.eTrailT = (e.eTrailT || 0) - dt;
      const moved = dist(e.x, e.y, e.lx == null ? e.x : e.lx, e.ly == null ? e.y : e.ly) > 0.6;
      if (e.eTrailT <= 0 && moved) { e.eTrailT = 0.45; e.lx = e.x; e.ly = e.y; hostileZone(zoneOf('fire', { x: e.x, y: e.y, r: 0.7, life: 2.5, tick: 0.5, dmg: e.def.dmg * e.dm * 0.15 })); }
    } },
  frozen: { name: 'Frozen', col: '#9fe8ff', rare: true,
    tick(e) { const p = G.player; if (dist(e.x, e.y, p.x, p.y) < 2.4) p.slowT = Math.max(p.slowT, 0.2); },
    onHit() { G.player.slowT = Math.max(G.player.slowT, 1.2); } },
  gloomed: { name: 'Gloomed', col: '#c070ff',
    tick(e) { const p = G.player; if (dist(e.x, e.y, p.x, p.y) < 3) p.dreadT = 0.2; } },
  twin: { name: 'Twin', col: '#ffb0e0',
    spawn(e) {
      if (e.twinOf) return;
      e.hp = e.maxHp = Math.round(e.maxHp * 0.5);
      const t = spawnEnemyRaw(e.type, e.x + 1, e.y + 0.5, e.spawnT); initParts(t, e.def);
      t.elite = true; t.mods = e.mods.slice(); t.twinOf = e; t.hp = t.maxHp = e.maxHp; t.dm = e.dm; t.dmgK = e.dmgK;
      e.swarm = t.swarm = { alive: 2, n: 2 };   // linked: XP and loot once, when both are down
    } },
  vampiric: { name: 'Vampiric', col: '#ff4a6a',
    onHit(e, dmg) { const n = Math.max(dmg * 0.5, e.maxHp * 0.03); e.hp = Math.min(e.maxHp, e.hp + n); text(e.x, e.y, e.z + e.hgt, '+' + Math.round(n), '#ff4a6a'); } },
  summoner: { name: 'Summoner', col: '#b36bff',
    tick(e, dt) {
      e.eSumT = (e.eSumT == null ? 4 : e.eSumT) - dt;
      if (e.eSumT > 0) return; e.eSumT = 8;
      if (G.enemies.filter(o => o.summoner === e && !o.dead).length >= 4) return;
      const kind = ENEMY.dreammoth ? 'dreammoth' : 'slime';
      fx({ type: 'ring', x: e.x, y: e.y, r: 1.4, col: '#b36bff', life: 0.5 });
      const s = spawnAt(kind, e.x + 1, e.y, 0.6); if (s) { s.summoner = e; s.noXp = true; }
    } },
};
const ELITE_IDS = Object.keys(ELITE_MODS);
function rollEliteMod() { const pool = ELITE_IDS.filter(k => !ELITE_MODS[k].rare || Math.random() < 0.25); return pick2(pool); }
function makeElite(e, spec) {
  const mods = Array.isArray(spec) ? spec.filter(k => ELITE_MODS[k]) : ELITE_MODS[spec] ? [spec] : [rollEliteMod()];
  e.elite = true; e.mods = mods;
  e.hp = e.maxHp = Math.round(e.maxHp * ELITE_HP); e.dmgK = (e.dmgK || 1) * ELITE_DMG;
  for (const m of mods) if (ELITE_MODS[m].spawn) ELITE_MODS[m].spawn(e);
  return e;
}

// ---------------------------------------------------------------- runtime (called by game.js updateEnemies)
// the M2a state machine, generalised: chase (movement part) -> wind (telegraph) -> action state -> rec (open) -> chase
function updatePartsEnemy(e, edt, c) {
  for (const id of e.parts) { const P = PARTS[id]; if (P.tick) P.tick(e, e.pp[id], c, edt); }
  for (const m of e.mods || []) if (ELITE_MODS[m] && ELITE_MODS[m].tick) ELITE_MODS[m].tick(e, edt);
  if (e.auraT > 0) e.auraT -= edt;
  if (e.wakeT > 0) { e.wakeT -= edt; return; }
  if (e.asleep) return;
  for (const id of e.acts) e.pcd[id] -= edt;
  e.st -= edt;
  const def = e.def;
  if (e.state === 'chase') {
    let mx = 0, my = 0, k = 1, stop = false;
    if (c.hidden) { e.wander = (e.wander || Math.random() * 6) + edt * 0.5; mx = Math.cos(e.wander); my = Math.sin(e.wander); }
    else if (e.move) { const mv = PARTS[e.move].move(e, e.pp[e.move], c); if (mv) { mx = mv.x; my = mv.y; k = mv.k; stop = !!mv.stop; } }
    for (const o of G.enemies) {   // separation
      if (o === e || o.dead) continue;
      const dd = dist(e.x, e.y, o.x, o.y);
      if (dd < e.r + o.r + 0.2 && dd > 0.001) { mx += (e.x - o.x) / dd * 1.2; my += (e.y - o.y) / dd * 1.2; }
    }
    const sp = def.speed * k * (e.auraT > 0 ? e.auraSpd : 1), l = Math.hypot(mx, my) || 1;
    if (!(stop && !c.hidden) && sp > 0 && e.move !== 'stationary') moveEntity(e, mx / l * sp * edt, my / l * sp * edt, tileH(G.map, e.x, e.y));
    if (!c.hidden) for (const id of e.acts) {
      if (e.pcd[id] > 0) continue;
      const A = PARTS[id], P = e.pp[id];
      if (!A.ready(e, P, c)) continue;
      PART_SRC = e; e.state = 'wind'; e.act = id; e.st = A.begin(e, P, c); e.windMax = e.st; PART_SRC = null;
      break;
    }
  } else if (e.state === 'wind') {
    if (e.st <= 0) {
      const id = e.act, A = PARTS[id], P = e.pp[id], r = A.fire(e, P, c);
      e.pcd[id] = (P.cd || 1.5) * rand(0.8, 1.3);
      if (r) { e.state = r[0]; e.st = r[1]; } else { e.state = 'rec'; e.st = P.rec != null ? P.rec : 0.4; }
    }
  } else if (e.state === 'rec') { if (e.st <= 0) e.state = 'chase'; }
  else {   // an action state (lunge, strike, erupt, ...)
    const id = e.act, A = PARTS[id], P = e.pp[id];
    if (e.state === 'erupt') { if (e.st <= 0) { partsErupt(e, P); e.state = 'rec'; e.st = P.rec; } return; }
    if (A && A.act) A.act(e, P, c, edt);
    if (e.st <= 0) { e.state = 'rec'; e.st = P && P.rec != null ? P.rec : 0.4; }
  }
}
function partsErupt(e, P) {
  e.under = false;
  if (playerIn({ kind: 'circle', x: e.x, y: e.y, r: P.r })) enemyHit(e, e.def.dmg * e.dm, e.el);
  fx({ type: 'ring', x: e.x, y: e.y, r: P.r, col: '#ffb070', life: 0.45 }); burst(e.x, e.y, 0.2, 30, ['#6a5a3a', '#a08860', '#c8b090'], 5, { glow: false });
  shake(6); sfx('boom');
  if (P.staggerOnSurface) e.stunT = Math.max(e.stunT, 0.6);
}
// damage taken multiplier (shield-front, sleep wake-up) — game.js damageEnemy calls this before resistances
function partsHurt(e, dmg, o) {
  let k = 1;
  for (const id of e.parts || []) { const P = PARTS[id]; if (P.hurt) k *= P.hurt(e, e.pp[id], dmg, o); }
  dmg *= k;
  for (const m of e.mods || []) if (ELITE_MODS[m] && ELITE_MODS[m].onHurt) dmg = ELITE_MODS[m].onHurt(e, dmg);
  return dmg;
}
// poise (row.stagger): enough skill stagger during a wind-up interrupts it
function partsStagger(e, st) {
  const poise = e.def && e.def.stagger;
  if (!poise || e.boss || e.state !== 'wind') return;
  e.poise = (e.poise || 0) + st;
  if (e.poise >= poise) {
    e.poise = 0; e.state = 'rec'; e.st = 0.6; e.stunT = Math.max(e.stunT, 0.5); e.under = false;
    G.effects = G.effects.filter(f => !(f.type === 'tele' && f.src === e));
    text(e.x, e.y, e.z + e.hgt + 0.4, 'STAGGER', '#ff8a2a', true);
  }
}
// death parts; returns false when a swarm / twin group still has members (no XP, loot or kill count yet)
function partsDeath(e) {
  for (const id of e.parts || []) { const P = PARTS[id]; if (P.death) P.death(e, e.pp[id]); }
  if (e.swarm && --e.swarm.alive > 0) return false;
  return true;
}
