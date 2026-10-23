#!/usr/bin/env node
'use strict';
// tools/balsim.js — the balance sim (docs/design/balance.md). Runs the REAL game code headless (js/*.js in index.html order, in a
// vm context, seeded Math.random): recalcStats, useSkill / basicAttack, damageEnemy, the part runtime and BOSS_MOVES.
//   node tools/balsim.js [--seed=N] [--trials=N] [--quiet] [--json]   (tuning: --miss=N --under-trials=N --only=under,reference --boss=id --patch=file.js)
// Prints the tables and exits 1 on any red flag (§20.7 "CI red flags"). Explained exceptions are printed, never fail.
//
// MODEL
//   Hero: three weapon families with their own armour sets; reference gear per band (Uncommon in the Vale, Rare to the
//   Ruins, Epic after; tier = highest TIER_REQ <= level; affixes at 80 % of their roll; 2 diamonds of the band grade).
//   Random build = the same rarity with makeItem's random rolls and random gems (mean of 24). Optimal = every affix an
//   offence stat at its best roll + matching damage gems.
//   Rotation (§20.7): basic x3 -> skill (Q / E alternating, R whenever charged) -> dodge, against a target that stands
//   still (its AI frozen); after a dodge the hero is put back in reach. Hitstop runs like main.js (it costs time).
//   TTK = seconds to kill one reference enemy at its band's mid level (mean of --trials). Swarms count to the last
//   member. Elite TTK: rows of class elite and elite spawns (x ELITE_HP).
//   Boss length = boss HP / (rotation DPS against that boss x uptime), uptime 0.7 mini-boss / 0.6 guardian (§20.3).
//   Survival: three reference commons with live AI on a hero who only stands (Normal, NG+ x1.6).
//   Dust / potions: rollLoot over a main path (40 kills, 3 chests, 2 elites, 7 trigger loot cards per band, the 3 Act I bosses), 80 % of
//   items salvaged; the mean of 40 paths. XP path: six §20.3 bands of equal time, 2 kills/min of the band's reference commons at the hero's
//   level (clamped to the band), killXp() incl. the band ceiling, each band's boss (mini 0.5 / guardian 1 level).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SEED = +arg('seed', 7), TRIALS = +arg('trials', 5), QUIET = process.argv.includes('--quiet'), JSON_OUT = process.argv.includes('--json');

// ---------------------------------------------------------------- load the game
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(SEED);
// rows added after the M4a baseline (the M4b Ruins bestiary) run on a side stream, so the main stream (and every later
// seeded section, e.g. the live boss fights) draws exactly what it drew before they existed
const sideRng = mulberry32(SEED ^ 0x5bd1e995), SIDE_ROWS = new Set(['gravechanter', 'pillarmimic', 'shadelingswarm', 'voidarcher', 'oathless', 'gloamwarden']);
const SMath = Object.create(Math); SMath.random = rng;
const noop = () => {};
const ctx = {
  console: { log: noop, warn: noop, error: (...a) => console.error(...a) }, Math: SMath, Date, JSON, URLSearchParams,
  location: { search: '?balsim=1' }, localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: { getElementById: () => null, createElement: () => ({ getContext: () => null, style: {} }), addEventListener: noop },
  addEventListener: noop, requestAnimationFrame: noop, setTimeout: noop, navigator: {}, performance: { now: () => 0 },
};
ctx.window = ctx;
vm.createContext(ctx);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script\s+src="js\/([a-z0-9_-]+)\.js"/g)].map(m => m[1]);
const LOAD = order.slice(0, order.indexOf('game') + 1).filter(f => !['sprites', 'art', 'enemyart'].includes(f));
if (!LOAD.includes('itemdata')) LOAD.splice(LOAD.indexOf('items') + 1, 0, 'itemdata');   // CAPS (items v2 data)
for (const f of LOAD) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: 'js/' + f + '.js' });
const ev = s => vm.runInContext(s, ctx);
ev(`buildPlayerSprites = () => { const f = [0, 0, 0, 0]; return { front: f, frontF: f, back: f, backF: f }; }; var worldToView = () => [0, 0]; var IN = { aim: { mode: 'auto' }, move: { x: 0, y: 0, mag: 0 }, assist: () => false, glyph: () => '', pressed: () => false, held: () => false };
  var __NG = 1;`);
const G = ev('G');
ev('var ART = { custom: {}, customF: {}, boss: {} }; applyTuning(WORLD_DATA.tuning); applyWorldEnemies(WORLD_DATA.enemies);');   // as main.js boot does (world.js rows win)

// ---------------------------------------------------------------- the world the sim runs in
ev(`function simMap(lo, hi) {
  const W = 48, m = { id: 'sim', W, H: W, type: [], h: [], block: [], colliders: [], objects: [], portals: [], triggers: [], cx: W / 2, cy: W / 2, falls: [], lights: [] };
  for (let y = 0; y < W; y++) { m.type.push(Array(W).fill('g')); m.h.push(Array(W).fill(0)); m.block.push(Array(W).fill(false)); }
  G.world = { maps: { sim: { level: [lo, hi] } }, start: 'sim' }; G.map = m; G.state = 'play';
  G.enemies = []; G.projs = []; G.effects = []; G.zones = []; G.parts = []; G.texts = []; G.delays = []; G.drops = []; G.boss = null; G.shrink = null; G.trig = null; G.arena = null;
  G.prog = { chests: {}, firsts: {}, trig: {}, quests: {}, gates: {}, secrets: {} };
  return m;
}
function simStep(rdt) {
  let dt = rdt;
  if (typeof hitlagStep === 'function' ? hitlagStep() : G.hitstopT > 0 && (G.hitstopT -= rdt, true)) dt = 0;   // the game's fixed-step hitlag (game.js)
  G.t += rdt;
  updatePlayer(G.player, dt); updateEnemies(dt); updateProjs(dt); updateZones(dt);
  for (const d of G.delays.slice()) { d.t -= dt; if (d.t <= 0) { d.done = true; withCast(d.c || null, d.fn); } }
  G.delays = G.delays.filter(d => !d.done);
  for (const e of G.effects) { e.t += dt; if (e.t >= e.life) { e.done = true; if (e.onDone) e.onDone(e); } }
  G.effects = G.effects.filter(e => !e.done); G.texts.length = 0; G.parts.length = 0; G.drops.length = 0;
}`);

// ---------------------------------------------------------------- builds
// FAMILY_TIERS keys (v4: weapon variant / chest suit / helm + boots piece family)
const FAMS = { sword: ['sword', 'knighthelm', 'warden', 'knightgreaves'], staff: ['staff', 'arcanecowl', 'dreamweave', 'clothsandals'], bow: ['bow', 'wardenhood', 'stalker', 'stalkershoes'] };
const SLOTS = ['weapon', 'head', 'chest', 'boots'];
const BANDS = [
  { name: 'Vale', lo: 1, hi: 3, ttk: [2, 2], refs: ['dreammoth', 'slime'] },
  { name: 'Pinewood', lo: 3, hi: 10, ttk: [2.5, 3.5], elite: 12, refs: ['gloomslime', 'shadehound', 'brambleshaman', 'ogre', 'thornbackboar', 'mountaintroll'], elites: ['troll'] },
  // Ruins: the M2a trio + the M4b commons (gloomknight is left out: its front shield blocks a rotation that stands still in
  // front of a frozen target; tools/ruins-bestiary-check.js measures it live, flanking)
  { name: 'Ruins', lo: 10, hi: 17, ttk: [3, 4], elite: 14, refs: ['slime', 'wisp', 'hound', 'gravechanter', 'pillarmimic', 'shadelingswarm', 'voidarcher'] },
  { name: 'Grotto', lo: 17, hi: 24, ttk: [3, 4], refs: [] }, { name: 'Caldera', lo: 24, hi: 31, ttk: [3.5, 4.5], refs: [] }, { name: 'Spire', lo: 31, hi: 38, ttk: [4, 5], refs: [] },
];
const DPS_TABLE = [[1, 3, 60, 60], [3, 10, 110, 220], [10, 17, 220, 420], [17, 24, 420, 700], [24, 31, 700, 1100], [31, 38, 1100, 1600]];
const interp = (T, L) => { let r = T[0]; for (const x of T) if (L >= x[0]) r = x; return r[2] + (r[3] - r[2]) * Math.min(1, Math.max(0, (L - r[0]) / (r[1] - r[0]))); };
const bandOf = L => BANDS.find(b => L >= b.lo && L < b.hi) || BANDS[BANDS.length - 1];
const rarityAt = L => (L < 3 ? 'uncommon' : L < 17 ? 'rare' : 'epic');
const gemGrade = L => (L < 10 ? 1 : L < 24 ? 2 : 3);
// v2 reference gear (§19.1, §20.3): makeItem v2 items (implicits apply), affixes at the tier the ilvl allows, at the MIDDLE of the
// tier's range (the typical roll; optimal = the top of the range AND every item tempered once, its first affix +1 tier, §19.2),
// prefixes / suffixes per the §19.1 counts. Trinkets by the §20.3 milestones ("2 trinkets by Act II and 4 by Act IV"): the
// Origin starter ring from L1 (every build, 'under' too), a second ring from Act II (L10), the amulet from Act III (L17), the
// belt from Act IV (L24); Rare until L17, then the band's rarity; trinket tier = highest TRINKET_REQ <= L. Ring boon = the one
// a player keeps for the family (sword holy, staff fire, bow pierce), amulet +ultimate damage, belt kill-heal. 'notrk' =
// reference without trinkets beyond the starter ring (trinket power share). 'random' rolls every affix, boon and gem.
ev(`const SIM_RING_BOON = { sword: 'holyPower', staff: 'fireBurn', bow: 'projPierce' };
function simTrinkets(p, L, rarity, kind, fam) {
  if (kind === 'under' || kind === 'notrk') return;
  const rnd = kind === 'random', q = kind === 'optimal' ? 1 : 0.5;
  const tierBase = slot => { const list = Object.values(trinketBases()).filter(t => t.slot === slot && !t.unique && !t.origin).sort((a, c) => a.tier - c.tier); let k = 0; list.forEach((t, i) => { if (t.reqLvl <= L) k = i; }); return list[k].id; };
  const rr = L < 17 ? 'rare' : rarity;
  const mk = (slot, rar, affixes, boon) => rnd ? makeItem(tierBase(slot), rar, L) : makeItem(tierBase(slot), rar, L, { affixes, boon, q, sockets: 0 });
  if (L >= 10) p.equip.ring2 = mk('ring', rr, (kind === 'optimal' ? ['power', 'critDmg', 'crit'] : ['power', 'crit', 'critDmg']).slice(0, RARITY[rr].affixes), SIM_RING_BOON[fam]);
  if (L >= 17) p.equip.amulet = mk('amulet', rr, ['power', 'hp'], 'ultDmg');
  if (L >= 24) p.equip.belt = mk('belt', rr, ['hp', 'def'].slice(0, RARITY[rr].affixes), 'killHeal');
}
function simGear(fams, L, rarity, kind) {
  const p = makePlayer(); p.level = L; let tier = 0; for (let t = 0; t < 5; t++) if (TIER_REQ[t] <= L) tier = t; if (tier === 4) tier = 3;
  // 'under' (QA M1 / B2; §26.2 "-1 gear tier"): one tier below the band, Uncommon weapon + chest, Common head + boots, no gems,
  // starter ring only. Below L8 the band is tier 0 already, so there it is a rarity / gem drop (the tier clamps at 0).
  const UNDER = { weapon: 'uncommon', head: 'common', chest: 'uncommon', boots: 'common' };
  const under = kind === 'under';
  if (under) tier = Math.max(0, tier - 1);
  const q = kind === 'optimal' ? 1 : 0.5;
  // [P ids, S ids] per slot; the item's §19.1 counts take from the front (Epic: weapon 2P+1S, armour 1P+2S; optimal always 2P+1S)
  const REF = { weapon: [['power', 'crit', 'critDmg'], ['hp', 'def']], armour: [['crit', 'power'], ['hp', 'def']] };
  // optimal: +power first everywhere (one additive damage sum: the best single line at every tier), then the crit pair / skill damage / haste
  const OPT = { weapon: ['power', 'critDmg', 'crit'], head: ['power', 'crit', 'critDmg'], chest: ['power', 'skillDmg', 'crit'], boots: ['power', 'haste', 'crit'] };
  const g = L < 10 ? 1 : L < 24 ? 2 : 3, fam = fams[0];
  ['weapon', 'head', 'chest', 'boots'].forEach((slot, i) => {
    const base = FAMILY_TIERS[fams[i]][tier].split(':')[0], rar = kind === 'under' ? UNDER[slot] : rarity;
    const socks = under ? 0 : slot === 'weapon' || slot === 'chest' ? 1 : 0;
    let [np, ns] = AFFIX_COUNT[rar];
    if (rar === 'uncommon' && slot !== 'weapon') { np = 0; ns = 1; }
    if (rar === 'epic' && slot !== 'weapon' && kind !== 'optimal') { np = 1; ns = 2; }
    const ids = kind === 'optimal' ? OPT[slot].slice(0, np).concat(['hp', 'def'].slice(0, ns)) : (([P, S]) => P.slice(0, np).concat(S.slice(0, ns)))(REF[slot === 'weapon' ? 'weapon' : 'armour']);
    const it = kind === 'random' ? makeItem(base, rar, L, { sockets: socks }) : makeItem(base, rar, L, { sockets: socks, affixes: ids, q });
    // reference gems are diamonds (element-neutral: a ruby would amplify only fire skills and skew weapon parity)
    if (it.sockets.length && !under) it.sockets[0] = kind === 'random' ? pick2(GEM_TYPES) + '_' + g : kind === 'optimal' ? (slot === 'weapon' ? 'ruby_' + g : 'amethyst_' + g) : 'diamond_' + g;
    // optimal uses the Elder Stone (§19.2): temper the first affix once, imbue one socket (where the rarity allows), matching gems
    if (kind === 'optimal') { p.dust = 1e6; if (it.affixes.length) temperItem(it, it.affixes[0].id, p); imbueItem(it, p); it.sockets = it.sockets.map(() => (slot === 'weapon' ? 'ruby_' : 'amethyst_') + g); }
    p.equip[slot] = it;
  });
  // the OFFHAND (Loadout v3): each family's natural pair (Sword + Buckler, Staff + Grimoire, Bow + Quiver) at the band tier,
  // secondary lines only (hp / def). SIM_OFF overrides it per run: a line id, or null for an empty offhand.
  const off = typeof SIM_OFF !== 'undefined' ? SIM_OFF : ({ sword: 'buckler', staff: 'grimoire', bow: 'quiver' })[fam];
  if (off) {
    const rar = under ? 'common' : rarity, ns = Math.max(1, AFFIX_COUNT[rar][1]);
    const base = FAMILY_TIERS[off][tier].split(':')[0];
    // a companion holds a fixed reference deck: makeItem's random pre-socketed page would make runs differ
    const deck = BASES[base].deck, own = deck ? Object.keys(PAGES).filter(id => PAGES[id].deck === deck).sort((x, y) => (y === 'barrage') - (x === 'barrage')) : null;
    // the reference deck: the companion's OWN entries up to its capacity, Arcane Barrage first (the pre-v3 Staff E, so the Vale TTK
    // reads like before), then data order (Frost Shard, Gravity Well... / Piercing Shot, Snare). The shared re-homed ultimates
    // (Dawnwave, Moonbeam) stay out: socketed, they lift a companion ~30 % (a watch item).
    const pages = deck ? own.slice(0, PAGE_CAP[tier]) : undefined;
    const it = kind === 'random' ? makeItem(base, rar, L, { sockets: 0, pages }) : makeItem(base, rar, L, { sockets: 0, affixes: ['hp', 'def'].slice(0, ns), q, pages });
    if (!offhandFits(it, p.equip.weapon)) p.equip.offhand = it;   // offhandFits = '' when it fits
  }
  p.equip.ring1 = originRing(p.equip.weapon.base);   // the Origin ring (first Vale chest, ~2:00): every build, 'under' too
  const wc = p.equip.weapon && lineOf(p.equip.weapon) && lineOf(p.equip.weapon).class;   // M4b lines: the ring boon by class
  simTrinkets(p, L, rarity, kind, fam === 'staff' || wc === 'foci' ? 'staff' : fam === 'bow' || wc === 'shots' ? 'bow' : 'sword');
  recalcStats(p, true); return p;
}`);
ev(`function simHero(fams, L, rarity, kind) { const p = simGear(fams, L, rarity, kind); G.player = p; p.x = 24; p.y = 24; p.z = 0; p.invulnT = 0; return p; }`);

// ---------------------------------------------------------------- rotation vs a frozen target
ev(`function simRotation(target, maxT, standoff) {
  const p = G.player, seq = G.__ultAlt ? ['o', 'b', 'b', 'b', 's', 'd'] : ['b', 'b', 'b', 's', 'd']; let i = 0, t = 0, alt = 0, ultAt = [], dash = false;
  const place = (t = target) => { if (t.dead) return; const a = Math.atan2(p.y - t.y, p.x - t.x) || 0; p.x = t.x + Math.cos(a) * standoff; p.y = t.y + Math.sin(a) * standoff; };
  place();
  const alive = () => (target.swarm ? G.enemies.some(e => e.swarm === target.swarm && !e.dead) : !target.dead);
  while (alive() && t < maxT) {
    for (const e of G.enemies) { e.stunT = 9; if (e.state !== 'chase') e.state = 'chase'; }
    if (!p.dash && dash) { dash = false; place(target.dead && target.swarm ? G.enemies.find(e => e.swarm === target.swarm && !e.dead) || target : target); }
    if (!p.dash && !castActive(p) && p.atkT <= 0 && p.castT <= 0) {
      const tg = target.dead && target.swarm ? G.enemies.find(e => e.swarm === target.swarm && !e.dead) || target : target;
      if (dist(p.x, p.y, tg.x, tg.y) > standoff + 0.3) place(tg);   // walks back into reach (knockback pushes targets away)
      p.aim = Math.atan2(tg.y - p.y, tg.x - p.x); G.mouse.wx = tg.x; G.mouse.wy = tg.y;   // a player aims at the target
      const a = seq[i];
      if (a === 'o') { useSkill(p, 'rmb'); i++; }   // Loadout v3 loop: the M2 off-action opens each chain (Turn / Nock advance the deck, Step marks)
      else if (a === 'b') { basicAttack(p); i++; }
      else if (a === 's') { if (p.ult >= 100 && (G.__ultAlt ? (ultAt.length % 2 ? ['eu', 'qu'] : ['qu', 'eu']) : ['qu']).some(u => useSkill(p, u))) ultAt.push(t); else { const s = alt++ % 2 ? 'e' : 'q'; if (!useSkill(p, s)) useSkill(p, s === 'q' ? 'e' : 'q'); } i++; }
      else { if (useSkill(p, 'v')) dash = true; i = 0; }
    }
    p.hp = p.maxHp; simStep(1 / 60); t += 1 / 60;
    if (p.ult >= 100 && G.__ultFirst == null) G.__ultFirst = t;
  }
  return { t, ultAt };
}`);
const standoffOf = fam => (fam === 'sword' || fam === 'daggers' ? 1.1 : 3.5);

function ttk(type, L, fam, kind = 'reference', o = {}) {
  const out = [];
  for (let k = 0; k < TRIALS; k++) {
    ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi})`);
    ev(`simHero(${JSON.stringify(FAMS[fam])}, ${L}, '${o.rarity || rarityAt(L)}', '${kind}')`);
    const e = ev(`(() => { const e = spawnEnemy('${type}', 27, 24, 0, ${o.elite ? `{ elite: '${o.mod || 'storm'}' }` : '{}'}); e.stunT = 9; return e; })()`);
    ctx.__t = e;
    const r = ev(`simRotation(__t, ${o.maxT || 400}, ${standoffOf(fam)})`);
    out.push(r.t);
  }
  return out.reduce((a, b) => a + b, 0) / out.length;
}
// rotation DPS against a long-lived target of a given type (res applied), and the ultimate interval
function dpsVs(type, L, fam, kind, rarity, T = 60) {
  ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi})`);
  ev(`simHero(${JSON.stringify(FAMS[fam])}, ${L}, '${rarity || rarityAt(L)}', '${kind}')`);
  ctx.__t = ev(`(() => { const e = spawnEnemy('${type}', 27, 24, 0); e.hp = e.maxHp = 1e9; e.stunT = 9; G.__ultFirst = null; return e; })()`);
  const r = ev(`simRotation(__t, ${T}, ${standoffOf(fam)})`);
  const dealt = 1e9 - ctx.__t.hp, ultIv = r.ultAt.length > 1 ? (r.ultAt[r.ultAt.length - 1] - r.ultAt[0]) / (r.ultAt.length - 1) : (ev('G.__ultFirst') || 999);
  return { dps: dealt / T, ult: ultIv };
}
function survival(types, L, ng) {
  const r = [];
  for (let k = 0; k < TRIALS; k++) {
    ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference'); __NG = ${ng};`);
    const t = ev(`(() => { const p = G.player; const ts = ${JSON.stringify(types)}; ts.forEach((ty, i) => { const a = i / ts.length * 6.28; const e = spawnEnemy(ty, p.x + Math.cos(a) * 1.2, p.y + Math.sin(a) * 1.2, 0); e.dm *= __NG; });
      let t = 0; while (!p.dead && t < 60) { p.x = 24; p.y = 24; simStep(1 / 60); t += 1 / 60; } return t; })()`);
    r.push(t);
  }
  ev(`__NG = 1;`);
  return r.reduce((a, b) => a + b, 0) / r.length;
}

// ---------------------------------------------------------------- run
if (arg('patch', '')) vm.runInContext(fs.readFileSync(arg('patch', ''), 'utf8'), ctx, { filename: 'patch' });   // tuning aid: --patch=file.js edits BOSSES / data in the context before the run
const flags = [], explained = [], notes = [];
const red = (s) => flags.push(s), ok = (s) => notes.push(s);
const r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;
const log = (...a) => { if (!JSON_OUT && !QUIET) console.log(...a); }, say = (...a) => { if (!JSON_OUT) console.log(...a); };   // --quiet: flags only
const ENEMY = ev('ENEMY');

// 1. hero curve (reference DPS vs a neutral dummy-like target: no resistances)
ev(`ENEMY.__neutral = Object.assign({}, ENEMY.slime, { name: 'neutral', res: {}, parts: ['stationary'], params: {}, ai: 'parts', hp: 1 });`);
const heroRows = [];
for (const L of [1, 3, 6, 10, 13, 17, 24, 31, 38]) {
  const row = { L, target: interp(DPS_TABLE, L) };
  for (const fam of ['sword', 'staff', 'bow']) row[fam] = dpsVs('__neutral', L, fam, 'reference').dps;
  const p = ev(`simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference')`);
  row.hp = p.maxHp; row.ehp = p.maxHp / (1 - p.def); heroRows.push(row);
}
log('\nHERO (reference gear, rotation DPS vs a neutral target; eHP = HP / (1 - armour))');
log('  L   sword   staff   bow    §20.3 DPS   ratio   HP     eHP');
const parity = heroRows.map(h => Math.max(h.sword, h.staff, h.bow) / Math.min(h.sword, h.staff, h.bow));
for (const h of heroRows) log(`  ${String(h.L).padEnd(3)} ${String(Math.round(h.sword)).padStart(5)}  ${String(Math.round(h.staff)).padStart(6)}  ${String(Math.round(h.bow)).padStart(5)}  ${String(Math.round(h.target)).padStart(9)}   ${r2((h.sword + h.staff + h.bow) / 3 / h.target).toFixed(2).padStart(5)}  ${String(Math.round(h.hp)).padStart(5)}  ${String(Math.round(h.ehp)).padStart(6)}`);

log(`  weapon parity (max/min family DPS): ${parity.map(r2).join(' ')}   (director target <= 1.3)`);
heroRows.forEach((h, i) => { if (parity[i] > 1.3) notes.push(`weapon parity ${r2(parity[i])} at L${h.L} (target <= 1.3)`); });
// 2. common TTK per band (reference enemies at the band mid level)
log('\nCOMMON TTK (s, mean of ' + TRIALS + '; target per §20.3, red outside 1.5-7)');
log('  band       L    enemy             sword  staff  bow    target');
const ttkRows = [];
for (const b of BANDS) for (const type of b.refs) {
  if (!ENEMY[type]) continue;
  SMath.random = SIDE_ROWS.has(type) ? sideRng : rng;
  const L = Math.round((b.lo + b.hi) / 2), row = { band: b.name, L, type };
  for (const fam of ['sword', 'staff', 'bow']) row[fam] = ttk(type, L, fam);
  ttkRows.push(row);
  const elite = ev(`enemyClass('${type}')`) === 'elite';
  log(`  ${b.name.padEnd(10)} ${String(L).padEnd(4)} ${type.padEnd(17)} ${r1(row.sword).toFixed(1).padStart(5)} ${r1(row.staff).toFixed(1).padStart(6)} ${r1(row.bow).toFixed(1).padStart(5)}    ${elite ? 'elite ' + b.elite : b.ttk.join('-')}`);
  for (const fam of ['sword', 'staff', 'bow']) {
    const v = row[fam];
    if (elite) { if (v < 6 || v > 24) red(`elite TTK ${r1(v)} s (${fam}) for ${type} at ${b.name} L${L}: outside 6-24 (target ${b.elite})`); }
    else if (v < 1.5 || v > 7) red(`common TTK ${r1(v)} s (${fam}) for ${type} at ${b.name} L${L}: outside 1.5-7`);
  }
}
SMath.random = rng;
// elite spawns (makeElite) at Pinewood
log('\nELITE SPAWN TTK (Pinewood L7, x ELITE_HP, target 12 s)');
for (const type of ['ogre', 'gloomslime', 'gnarlbrute', 'thornsow']) {   // gnarlbrute / thornsow: the §26.2 elite-pocket rows (always spawned as elites)
  if (!ENEMY[type]) continue;
  const fams = ['sword', 'staff', 'bow'].map(f => ttk(type, 7, f, 'reference', { elite: true, mod: 'storm' })), v = Math.exp(fams.reduce((a, x) => a + Math.log(x), 0) / 3);
  log(`  ${type.padEnd(12)} ${r1(v)} s (geometric mean; sword / staff / bow ${fams.map(r1).join(' / ')})`);
  if (v < 6 || v > 24) red(`elite spawn TTK ${r1(v)} s (geometric mean of the families) for ${type} at L7: outside 6-24`);
}

// 3. bosses: length + fairness + hit size
log('\nBOSSES (length = HP / (rotation DPS vs the boss x uptime) + the bar transitions; red: mini 45-120 s, guardian 100-300 s)');
log('  boss          kind      L   HP       DPS(sword/staff/bow)    length s (sword/staff/bow)   target');
const BOSS_IDS = ['mossjaw', 'bramblehorn', 'boss', 'oathless', 'gloamwarden'];
const bossRows = [];
for (const id of BOSS_IDS) {
  if (!ENEMY[id]) continue;
  SMath.random = SIDE_ROWS.has(id) ? sideRng : rng;
  const B = ev(`BOSSES['${ENEMY[id].boss || id}']`), mini = B.kind === 'mini', L = ENEMY[id].level || 17, up = mini ? 0.7 : 0.6;
  ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); G.player = makePlayer(); G.player.level = ${L};`);
  const hp = ev(`Math.round(ENEMY['${id}'].hp * enemyHpMul(${ev(`enemyLevel('${id}')`)}))`);
  const row = { id, kind: B.kind, L, hp, dps: {}, len: {} };
  // §26.1 bars: each transition between bars is invulnerable time (bosses.js BAR_TRANS), added to the length
  const trans = B.bars ? (B.phases.length - 1) * (B.transition != null ? B.transition : 1.5) : 0; row.bars = B.bars ? B.phases.length : 1;
  for (const fam of ['sword', 'staff', 'bow']) { row.dps[fam] = dpsVs(id, L, fam, 'reference').dps; row.len[fam] = hp / (row.dps[fam] * up) + trans; }
  bossRows.push(row);
  log(`  ${(id + (row.bars > 1 ? ` [${row.bars} bars]` : '')).padEnd(13)} ${B.kind.padEnd(9)} ${String(L).padEnd(3)} ${String(hp).padEnd(8)} ${['sword', 'staff', 'bow'].map(f => Math.round(row.dps[f])).join(' / ').padEnd(23)} ${['sword', 'staff', 'bow'].map(f => Math.round(row.len[f])).join(' / ').padEnd(28)} ${mini ? '60-90' : '150-240'}`);
  for (const fam of ['sword', 'staff', 'bow']) {
    const v = row.len[fam];
    if (mini && (v < 45 || v > 120)) red(`mini-boss ${id} length ${Math.round(v)} s (${fam}) outside 45-120`);
    if (!mini && (v < 100 || v > 300)) red(`guardian ${id} length ${Math.round(v)} s (${fam}) outside 100-300`);
  }
  for (const f of ev(`bossFairness('${ENEMY[id].boss || id}')`)) {
    const s = `${id}.${f.move}: ${f.rule} (got ${f.got}${/walk-out/.test(f.rule) ? ' tiles' : ' s'}${f.phase ? ', bar/phase ' + f.phase : ''})`;
    if (f.legacy) explained.push(s + ' — M2a Warden timing kept on purpose (acceptance: plays like today); retime in the M4 Warden pass');
    else red('fairness ' + s);
  }
  // one big hit vs the reference hero: §20.3 35-45 % of eHP; "three mistakes kill, one never does"
  const big = ev(`(() => { const D = BOSSES['${ENEMY[id].boss || id}']; let best = null; for (const n in D.moveDefs) { const M = D.moveDefs[n]; if (M.hit === 'big' || (M.dmg || 0) >= 100) { simMap(${bandOf(L).lo}, ${bandOf(L).hi}); simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference'); const b = spawnEnemy('${id}', 30, 24, 0); const raw = moveDmg(b, M), p = G.player; const taken = raw * (1 - p.def) * (1 - ((p.res && p.res[M.el || b.el]) || 0)); const f = taken / p.maxHp; (best = best || []).push({ move: n, f }); } } return best; })()`);
  if (big) {
    log(`    telegraphed big hits vs the reference hero: ${big.map(h => `${h.move} ${Math.round(h.f * 100)} %`).join(', ')} (target 35-45 %)`);
    for (const h of big) {
      if (h.f >= 1) red(`${id}.${h.move} one-shots the reference hero (${Math.round(h.f * 100)} % HP)`);
      else if (h.f < 0.35 || h.f > 0.45) { const why = ev(`BOSSES['${ENEMY[id].boss || id}'].moveDefs['${h.move}'].why || ''`); (why ? explained : notes).push(`${id}.${h.move} big hit ${Math.round(h.f * 100)} % of hero HP (target 35-45 %)${why ? ' — ' + why : ''}`); }
    }
  }
}
SMath.random = rng;

// 3b. live boss fights (§26.2 the gear loop: farm until you can beat the boss; QA M1 / B2; §20.3 "three mistakes kill, one never does")
// The boss runs its real AI, BOSS_MOVES, bars and cunning forms (not frozen). The hero, a sword at the lowest level a QA run
// arrived at (LIVE[id].L), in three gear rows: 'under' (-1 gear tier: one tier below the band, Uncommon weapon + chest, Common
// head + boots, no gems) and 'reference' (the band's reference gear).
// It plays MELEE ONLY and NO KITING: it walks back into reach after every step aside, never uses the boots dodge to gain distance (Charge: 4 tiles + i-frames would
// be kiting) EXCEPT as an emergency escape from a telegraph it cannot walk out of in the time left (a burrow surfacing
// under it), basic x3 -> skill (Q / E alternating, R when charged). Telegraph discipline: REACT s after a telegraph
// appears it walks out of it if it stands inside (circle: outward, line: sideways, cone: the shorter way out), except
// for MISTAKES: the 3rd and the 12th telegraph it stands in, then every MISS_EVERY-th (it eats those hits; a busier pattern
// costs more, so the phases' aggression reaches it: feints and lead-aim alone never would, it reads every shape anew). The arena card's own adds (js/world.js: Mossjaw's ogres,
// Bramblehorn's saplings) spawn on the card's schedule, relative to the boss. It stays inside a shrinking
// root ring. Turret shots (saplings) are not dodged; boss and ogre / hound telegraphs are. Potions: 2, drunk below 50 % HP (one heals 40 %). Target priority: an add within 6 tiles (hounds, saplings) first, then the boss.
// RED (§26.2): the -1 tier row outside LIVE_UNDER (3-4) of 6 wins, the reference row under 6 / 6 (no boss hit cap: a
// single boss hit may kill, client ruling). XP is frozen during the fight (a level-up heals fully). A trial is lost when the hero dies or the fight runs past 1.5x the red length.
// Lengths: the reference row's median over the §20.7 red band (mini 120 / guardian 300 s) is red, over the §20.3 target a
// note; the -1 tier median is a note (losses are expected there). The fight lengths themselves are enforced on the frozen table above.
const LIVE = { mossjaw: { L: +arg('moss-L', 8), max: 90, red: 120 }, bramblehorn: { L: 9, max: 240, red: 300 } };   // L: lowest arrival level. Mossjaw 7 -> 8: QA runs reached the den at L8-9 (M3), and at L7 tier 0 is the floor, so '-1 tier' was a rarity drop only
const REACT = 0.3, MISTAKES = [3, 12], MISS_EVERY = +arg('miss', 10), LIVE_POTIONS = 2, LIVE_TRIALS = 6, LIVE_UNDER = [3, 4];
const LIVE_ROWS = [{ k: 'under', label: '-1 tier', n: +arg('under-trials', 96) }, { k: 'reference', label: 'reference', n: +arg('ref-trials', LIVE_TRIALS) }];   // the Story -2 tier row is gone (Story removed)
const ONLY = arg('only', '');
// --qa: also replay the QA bot's arrival hero (tools/qa/gear-mossjaw.json, written by run-big.js at the den) in the Mossjaw fight
const QA_FILE = arg('qa-gear', path.join(ROOT, 'tools/qa/gear-mossjaw.json')), QA_GEAR = process.argv.includes('--qa') && fs.existsSync(QA_FILE) ? JSON.parse(fs.readFileSync(QA_FILE, 'utf8')) : null;
if (QA_GEAR) LIVE_ROWS.push({ k: 'qa', label: 'QA bot', n: +arg('qa-trials', 12), boss: 'mossjaw', L: QA_GEAR.level });
// §26.2 elite pockets: the -1 tier hero (and, with --qa, the QA bot's arrival hero) after 1 / 2 pocket FIRST clears. Each clear is the
// real guarantee path (items.js lootAction: rarity 'rare' floor, ilvl >= boss level - 2, slot 'upgrade' = items.js upgradeSlot (weapon > chest > head > boots, the first the drop beats) not
// yet given, in the worn family, rolled by rollUpgrade with makeItem's random affixes / sockets), equipped at once. A fresh roll per trial.
const POCKET_ROWS = arg('pockets', '1,2').split(',').filter(Boolean).map(Number);
for (const n of POCKET_ROWS) LIVE_ROWS.push({ k: 'pk_under', hero: 'under', label: `-1 +${n}pk`, diff: 'normal', n: +arg('pocket-trials', 24), pockets: n });
if (QA_GEAR) for (const n of POCKET_ROWS) LIVE_ROWS.push({ k: 'pk_qa', hero: 'qa', label: `QA +${n}pk`, diff: 'normal', n: +arg('qa-trials', 12), boss: 'mossjaw', L: QA_GEAR.level, pockets: n });
ev(`function simPockets(n, boss) {
  const p = G.player, floor = (ENEMY[boss].level || 1) - 2, got = [];
  G.prog.secrets = G.prog.secrets || {}; delete G.prog.secrets['pocket:slots'];
  const dl = dropLoot; dropLoot = function (x, y, list) { G.dropsLast = list; };   // capture the card's list (no ground drops in the sim)
  for (let i = 0; i < n; i++) {
    lootAction({ type: 'loot', rarity: 'rare', count: 1, x: p.x, y: p.y, slot: 'upgrade', ilvl: floor });
    const it = (G.dropsLast || []).find(d => d.kind === 'item');
    if (it) { p.equip[it.it.slot] = it.it; got.push(it.it.slot + '/' + it.it.rarity + '/i' + it.it.ilvl); }
  }
  dropLoot = dl; recalcStats(p, true); p.hp = p.maxHp; return got;
}`);

ev(`function simHeroQA(g) { const p = makePlayer(); p.level = g.level; p.equip = JSON.parse(JSON.stringify(g.equip)); if (g.weapon) p.gear.weapon = g.weapon; recalcStats(p, true); G.player = p; p.x = 24; p.y = 24; p.z = 0; p.invulnT = 0; return p; }`);
ev(`const ADD_R = 3;
function simBossFight(id, L, maxT, react, mistakes, potions, card, every) {
  const p = G.player, cx = G.map.cx, cy = G.map.cy; if (card.arena) G.arena = { id: 'sim', map: G.map.id, gates: [], x: cx, y: cy, r: card.arena.r, pillars: [], broken: [], done: false };
  const b = spawnEnemy(id, cx + card.bx, cy + card.by, 0); G.boss = b; p.potions = potions; p.hp = p.maxHp;
  { const a = Math.atan2(cy - b.y, cx - b.x) || 0; p.x = b.x + Math.cos(a) * 3; p.y = b.y + Math.sin(a) * 3; }   // the hero walks in from the arena side
  const adds = card.adds;
  const seq = ['b', 'b', 'b', 's'], seen = new Map(), out = { won: false, t: 0, potions: 0, hits: 0, bossHits: 0, maxHit: 0, maxBossHit: 0, tele: 0, mistakes: 0, taken: 0 };
  let i = 0, alt = 0, t = 0, n = 0;
  const hp0 = hurtPlayer, xp0 = gainXp; gainXp = () => {};   // no XP inside the fight: a level-up (adds' XP, the kill) fully heals and was the largest source of trial-to-trial noise
  hurtPlayer = function (dmg, x, y, el, o) { const before = p.hp, r = hp0.apply(this, arguments); if (r) { const f = (before - p.hp) / p.maxHp; out.hits++; out.taken += before - p.hp; out.maxHit = Math.max(out.maxHit, f); if (o && o.boss) { out.bossHits++; out.maxBossHit = Math.max(out.maxBossHit, f); } const near = G.enemies.filter(q => !q.dead && q !== b).sort((q, r) => dist(p.x, p.y, q.x, q.y) - dist(p.x, p.y, r.x, r.y))[0], ring = G.shrink && x === G.shrink.x && y === G.shrink.y; const k = (o && o.boss ? b.state : ring ? 'rootRing' : near ? near.type : 'other') + (p.rootT > 0 ? '(rooted)' : ''); (out.by || (out.by = {}))[k] = +(((out.by || {})[k] || 0) + f).toFixed(2); } return r; };
  const inShape = (e, m) => {
    if (e.kind === 'circle') return dist(p.x, p.y, e.x, e.y) < e.r + p.r + m;
    if (e.kind === 'cone') { const d = dist(p.x, p.y, e.x, e.y); return d < e.r + p.r + m && Math.abs(angDiff(e.ang, Math.atan2(p.y - e.y, p.x - e.x))) < e.arc / 2 + m / Math.max(1, d); }
    if (e.kind === 'line') return segDist(p.x, p.y, e.x, e.y, e.x + Math.cos(e.ang) * e.len, e.y + Math.sin(e.ang) * e.len) < e.w + p.r + m;
    return false;
  };
  const away = e => {
    if (e.kind === 'circle') { const a = Math.atan2(p.y - e.y, p.x - e.x); return dist(p.x, p.y, e.x, e.y) > 0.05 ? a : Math.atan2(p.y - b.y, p.x - b.x) + Math.PI / 2; }
    const side = (p.x - e.x) * Math.sin(e.ang) - (p.y - e.y) * Math.cos(e.ang) >= 0 ? -1 : 1;
    if (e.kind === 'line') return e.ang + side * Math.PI / 2;
    const d = dist(p.x, p.y, e.x, e.y), da = angDiff(e.ang, Math.atan2(p.y - e.y, p.x - e.x)), radial = e.r + p.r - d, lateral = d * Math.sin(Math.max(0, e.arc / 2 - Math.abs(da)));
    return radial < lateral ? Math.atan2(p.y - e.y, p.x - e.x) : e.ang + side * Math.PI / 2;
  };
  const bx0 = b.x, by0 = b.y, pend = adds.slice();
  // escape heading that also keeps it inside a root ring: straight out of the shape, else the first of +-45 / +-90 degrees
  // that still leaves the shape (tested 2.4 tiles along) and stays inside; none: straight out (a ring tick beats a big hit)
  const ringSafe = (a, e) => { const A = G.shrink; if (!A || !A.dmg) return a;
    const ok = h => { const ox = p.x, oy = p.y; p.x += Math.cos(h) * 2.4; p.y += Math.sin(h) * 2.4; const r = (!e || !inShape(e, 0.1)) && dist(p.x, p.y, A.x, A.y) < A.r - 0.3; p.x = ox; p.y = oy; return r; };
    for (const d of [0, 0.785, -0.785, 1.571, -1.571]) if (ok(a + d)) return a + d;
    return a; };
  const step = (a, dt) => { if (p.rootT > 0) return; const sp = p.speed * dt; moveEntity(p, Math.cos(a) * sp, Math.sin(a) * sp, tileH(G.map, p.x, p.y)); };
  while (!b.dead && !p.dead && t < maxT) {
    const dt = 1 / 60;
    if (p.hp < p.maxHp * 0.5 && p.potions > 0 && !((p.potT || 0) > G.t)) { drinkPotion(p); out.potions++; }
    // telegraph discipline
    let threat = null;
    for (const e of G.effects) {
      if (e.type !== 'tele' || (e.src && e.src.move === 'stationary') || !(e.kind === 'circle' || e.kind === 'line' || e.kind === 'cone')) continue;   // turret chip shots (saplings) are not dodged
      let s = seen.get(e); if (!s) seen.set(e, s = { t, counted: false, miss: false });
      if (t - s.t < react || !inShape(e, 0.35)) continue;
      if (!s.counted) { s.counted = true; out.tele++; s.miss = mistakes.includes(out.tele) || (every > 0 && out.tele > mistakes[mistakes.length - 1] && (out.tele - mistakes[mistakes.length - 1]) % every === 0); if (s.miss) out.mistakes++; }
      const pri = q => (q.src === b ? 0 : 10) + q.life - q.t;   // the boss's own telegraphs first, then the most urgent
      if (!s.miss && (!threat || pri(e) < pri(threat))) threat = e;
    }
    const A = G.shrink, sd = A ? dist(p.x, p.y, A.x, A.y) : 0;
    // target priority (the howl / sapling adds teach it, enemydata.js): the nearest add within ADD_R (a turret: ADD_R + 3), else the boss
    let tg = b.under ? null : b, td = ADD_R;
    for (const e of G.enemies) if (e !== b && !e.dead && !(e.spawnT > 0)) { const d = dist(p.x, p.y, e.x, e.y) - (e.move === 'stationary' ? 3 : 0); if (d < td) { td = d; tg = e; } }   // turrets (saplings) count as 3 tiles nearer: they never come to you
    // a telegraph it cannot walk out of in the time left (burrow surfacing under it): the boots dodge, if ready, out of the shape
    if (threat && !p.dash && p.rootT <= 0) {
      const e = threat, d = dist(p.x, p.y, e.x, e.y), need = 0.1 + (e.kind === 'circle' ? e.r + p.r - d : e.kind === 'line' ? e.w + p.r - segDist(p.x, p.y, e.x, e.y, e.x + Math.cos(e.ang) * e.len, e.y + Math.sin(e.ang) * e.len)
        : Math.min(e.r + p.r - d, d * Math.sin(Math.max(0, e.arc / 2 - Math.abs(angDiff(e.ang, Math.atan2(p.y - e.y, p.x - e.x)))))));
      const sk = slotSkill(p, 'v');
      if (need > (e.life - e.t) * p.speed && sk && !(p.cds[sk] > 0) && p.st >= (SKILLS[sk].st || 0)) { const a0 = p.aim; p.aim = ringSafe(away(e), e); G.mouse.wx = p.x + Math.cos(p.aim) * 3; G.mouse.wy = p.y + Math.sin(p.aim) * 3; if (useSkill(p, 'v')) out.dodges = (out.dodges || 0) + 1; else p.aim = a0; }
    }
    for (let k = pend.length - 1; k >= 0; k--) if (t >= pend[k].t) { const q = pend[k]; pend.splice(k, 1); for (let j = 0; j < q.n; j++) spawnAt(q.enemy, bx0 + q.dx, by0 + q.dy, q.r, false); }
    if (p.dash) {}
    else if (threat) { const sv = seen.get(threat); if (sv.h == null) sv.h = ringSafe(away(threat), threat); const h = sv.h; /* heading chosen once per telegraph: re-aiming every frame orbits a circle */ step(h, dt); }
    else if (A && A.dmg && sd > A.r - 0.6 && !(tg && tg !== b && dist(tg.x, tg.y, A.x, A.y) > A.r - 0.6)) step(Math.atan2(A.y - p.y, A.x - p.x), dt);   // stays in the ring, unless an add to kill stands outside it
    else if (tg && dist(p.x, p.y, tg.x, tg.y) > 1.1 + tg.r * 0.5 + 0.3) {   // back into reach, but never into a live telegraph it has seen
      const a = Math.atan2(tg.y - p.y, tg.x - p.x), ox = p.x, oy = p.y; p.x += Math.cos(a) * 0.4; p.y += Math.sin(a) * 0.4;
      const bad = G.effects.some(e => e.type === 'tele' && seen.has(e) && t - seen.get(e).t >= react && !seen.get(e).miss && inShape(e, 0.35)); p.x = ox; p.y = oy;
      if (!bad) step(a, dt);
    }
    else if (tg && !p.dash && !castActive(p) && p.atkT <= 0 && p.castT <= 0) {
      p.aim = Math.atan2(tg.y - p.y, tg.x - p.x); G.mouse.wx = tg.x; G.mouse.wy = tg.y;
      const teleUp = G.effects.some(e => e.type === 'tele' && e.src === b);   // no dash skill (Dash Strike moves 3.8 tiles) into a live telegraph
      if (seq[i] === 'b' || teleUp) basicAttack(p);
      else if (p.ult >= 100 && useSkill(p, 'qu')) {}
      else { const k = alt++ % 2 ? 'e' : 'q'; if (!useSkill(p, k)) useSkill(p, k === 'q' ? 'e' : 'q'); }
      if (!teleUp || seq[i] === 'b') i = (i + 1) % seq.length;
    }
    { let na = 0; for (const e of G.enemies) if (e !== b && !e.dead && e.move !== 'stationary') na++; out.addT = (out.addT || 0) + na * dt; out.addMax = Math.max(out.addMax || 0, na); }   // add pressure: mobile adds alive (turrets excluded)
    simStep(dt); t += dt;
    if (++n % 600 === 0) for (const [e] of seen) if (!G.effects.includes(e)) seen.delete(e);
  }
  hurtPlayer = hp0; gainXp = xp0;
  out.addsLeft = G.enemies.filter(e => !e.dead && e !== b).length;
  out.bars = b.bk ? b.bk.phase + 1 : 1; out.won = b.dead && !p.dead; out.t = t; out.hpLeft = p.dead ? 0 : p.hp / p.maxHp; out.bossLeft = b.dead ? 0 : b.hp / b.maxHp; out.maxHp = p.maxHp;
  return out;
}`);
log('\nLIVE BOSS FIGHTS (§26.2 gear loop: -1 tier 3-4/6 wins, reference 6/6; sword, melee only, no kiting, boots dodge only as an escape;');
log(`  steps out of telegraphs ${REACT} s after they show; mistakes: it eats telegraphs no. ${MISTAKES.join(' and ')}${MISS_EVERY ? ' then every ' + MISS_EVERY + 'th' : ''}; ${LIVE_POTIONS} potions; the arena card's adds; ${LIVE_TRIALS} seeded trials; no boss hit cap)`);
log('  boss          gear       L   hero HP  won   length s (median / max)   potions   mistakes  max boss hit  hp left   target');
// the arena card that spawns the boss (js/world.js): its later spawns, timed from the boss spawn, placed relative to it
function arenaAdds(id) {
  const maps = ev('WORLD_DATA.maps');
  for (const mid in maps) for (const tr of maps[mid].triggers || []) {
    let t = 0, at = null, arena = null; const out = [];
    for (const a of tr.actions || []) {
      if (a.type === 'arena') arena = { x: +a.x, y: +a.y, r: +a.r || 6 };
      if (a.type === 'wait') { t += +a.seconds || 0; continue; }
      if (a.type !== 'spawn') continue;
      if (a.enemy === id && !at) { at = { t, x: +a.x, y: +a.y }; continue; }
      if (at) out.push({ t: t - at.t, enemy: a.enemy, n: +a.count || 1, dx: +a.x - at.x, dy: +a.y - at.y, r: a.radius !== '' && a.radius != null ? +a.radius : 1.5 });
    }
    // the boss's place relative to the fight's centre (the inline arena, else the map's sigil, where a ring would centre)
    const c = arena || maps[mid].sigil || { x: at ? at.x : 0, y: at ? at.y : 0 };
    if (at) return { adds: out, arena: arena ? { r: arena.r } : null, bx: at.x - c.x, by: at.y - c.y };
  }
  return { adds: [], arena: null, bx: 3, by: 0 };
}
const liveRows = [];
// two passes: every §26.2 table row first, then the pocket rows (so adding pocket rows never shifts the table rows' seeded numbers)
for (const pass of [0, 1]) for (const id in LIVE) {
  if (!ENEMY[id] || (arg('boss', '') && arg('boss', '') !== id)) continue;
  const { max, red: redMax } = LIVE[id], card = JSON.stringify(arenaAdds(id));
  for (const G_ of LIVE_ROWS) {
    if (!!G_.pockets !== !!pass) continue;
    const runs = [];
    if (ONLY && !ONLY.split(',').includes(G_.k) || G_.boss && G_.boss !== id) continue;
    if (G_.pockets) SMath.random = mulberry32(SEED * 977 + G_.pockets * 31 + id.length);   // pocket rows: their own seeded stream, so every other row's numbers stay as before
    const L = G_.L || LIVE[id].L;
    for (let k = 0; k < G_.n; k++) {
      const hk = G_.hero || G_.k;
      ev(`simMap(${bandOf(LIVE[id].L).lo}, ${bandOf(LIVE[id].L).hi})`); if (hk === 'qa') { ctx.__qg = QA_GEAR; ev('simHeroQA(__qg)'); } else ev(`simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', '${hk}')`);
      if (G_.pockets) { const got = ev(`simPockets(${G_.pockets}, '${id}')`); (G_.got || (G_.got = [])).push(got.join(' ')); }
      runs.push(ev(`simBossFight('${id}', ${L}, ${redMax * 1.5}, ${REACT}, ${JSON.stringify(MISTAKES)}, ${LIVE_POTIONS}, ${card}, ${MISS_EVERY})`));
    }
    const won = runs.filter(r => r.won), lens = won.map(r => r.t).sort((a, b) => a - b), med = lens.length ? lens[Math.floor(lens.length / 2)] : Infinity;
    const row = { id, gear: G_.k, L, hp: Math.round(runs[0].maxHp), won: won.length, trials: runs.length, med, maxLen: lens.length ? lens[lens.length - 1] : Infinity, potions: Math.max(...runs.map(r => r.potions)),
      mistakes: Math.max(...runs.map(r => r.mistakes)), tele: Math.round(runs.reduce((a, r) => a + r.tele, 0) / runs.length), maxBossHit: Math.max(...runs.map(r => r.maxBossHit)), hpLeft: won.length ? Math.min(...won.map(r => r.hpLeft)) : 0, bossLeft: Math.max(...runs.map(r => r.bossLeft)),
      bars: Math.max(...runs.map(r => r.bars || 0)), addsMean: runs.reduce((a, r) => a + (r.addT || 0) / Math.max(1, r.t), 0) / runs.length, addsMax: Math.max(...runs.map(r => r.addMax || 0)) };
    liveRows.push(row);
    if (G_.k === 'qa') { const p = ev('G.player'); row.dps = dpsVs('__neutral', L, 'sword', 'reference').dps; ctx.__qg = QA_GEAR; ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); simHeroQA(__qg); ENEMY.__qad = Object.assign({}, ENEMY.__neutral)`);
      const q = ev(`(() => { const e = spawnEnemy('__neutral', 27, 24, 0); e.hp = e.maxHp = 1e9; e.stunT = 9; const r = simRotation(e, 60, 1.1); return (1e9 - e.hp) / 60; })()`);
      row.qaDps = q; log(`    QA bot hero: L${L} HP ${row.hp} (reference at L${L}: ${Math.round(ev(`simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference').maxHp`))}), rotation DPS ${Math.round(q)} vs reference ${Math.round(row.dps)}; items ${QA_GEAR.equip ? Object.values(QA_GEAR.equip).filter(Boolean).map(it => it.base + '/' + it.rarity + '/i' + it.ilvl).join(' ') : '?'}`); }
    const target = G_.k === 'under' ? `${LIVE_UNDER.join('-')}/6 wins` : G_.k === 'reference' ? `6/6 wins, <= ${max} s (red ${redMax})` : G_.k === 'qa' ? 'info (the QA bot\'s arrival gear)' : `§26.2: ~reference after ${G_.pockets} pocket clear(s)`;
    if (G_.pockets) {   // rotation DPS / HP of the pocket hero (a fresh roll) vs the reference and the unaided start, same L, vs a neutral target
      const one = setup => { ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi})`); if (setup === 'qa') { ctx.__qg = QA_GEAR; ev('simHeroQA(__qg)'); } else ev(`simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', '${setup}')`); return ev(`simPockets(${G_.pockets}, '${id}')`); };
      const meas = () => ev(`(() => { const p = G.player; const e = spawnEnemy('__neutral', p.x + 1.1, p.y, 0); e.hp = e.maxHp = 1e9; e.stunT = 99; simRotation(e, 60, 1.1); return { dps: (1e9 - e.hp) / 60, hp: p.maxHp }; })()`);
      let d = 0, h = 0; const K = 8; for (let j = 0; j < K; j++) { one(G_.hero); const m = meas(); d += m.dps / K; h += m.hp / K; }
      const ref = dpsVs('__neutral', L, 'sword', 'reference').dps, refHp = ev(`simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference').maxHp`);
      let base = 0, baseHp = 0; if (G_.hero === 'qa') { ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi})`); ctx.__qg = QA_GEAR; ev('simHeroQA(__qg)'); const m = meas(); base = m.dps; baseHp = m.hp; } else { base = dpsVs('__neutral', L, 'sword', 'under').dps; baseHp = ev(`simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'under').maxHp`); }
      row.pk = { n: G_.pockets, dps: d, hp: h, ref, refHp, base, baseHp, sample: (G_.got || []).slice(0, 3) };
      log(`    ${G_.pockets} pocket Rare(s), e.g. ${(G_.got || []).slice(0, 2).join(' | ')}: rotation DPS ${Math.round(d)} (start ${Math.round(base)}, reference ${Math.round(ref)} = ${Math.round(d / ref * 100)} %), HP ${Math.round(h)} (start ${Math.round(baseHp)}, reference ${Math.round(refHp)})`);
      G_.got = [];
    }
    SMath.random = rng;
    log(`  ${id.padEnd(13)} ${G_.label.padEnd(10)} ${String(L).padEnd(3)} ${String(row.hp).padEnd(8)} ${(row.won + '/' + row.trials + (row.trials !== 6 ? ` (${(row.won * 6 / row.trials).toFixed(1)}/6)` : '')).padEnd(5)} ${((lens.length ? Math.round(med) : '-') + ' / ' + (lens.length ? Math.round(row.maxLen) : '-')).padEnd(25)} ${String(row.potions).padEnd(9)} ${(row.mistakes + ' of ' + row.tele).padEnd(9)} ${(Math.round(row.maxBossHit * 100) + ' %').padEnd(13)} ${(Math.round(row.hpLeft * 100) + ' %').padEnd(9)} ${target}`);
    const by = {}; let rooted = 0; for (const r of runs) for (const k in r.by || {}) { by[k.replace('(rooted)', '')] = (by[k.replace('(rooted)', '')] || 0) + r.by[k] / runs.length; if (/\(rooted\)/.test(k)) rooted += r.by[k] / runs.length; }
    log(`    damage taken per fight, in hero max HP (mean): ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', ')}${rooted > 0.005 ? ` (taken while rooted ${rooted.toFixed(2)})` : ''}; mobile adds alive: mean ${row.addsMean.toFixed(1)}, peak ${row.addsMax}${runs.some(r => !r.won) ? `; lost fights ended at boss ${runs.filter(r => !r.won).map(r => Math.round(r.bossLeft * 100) + ' %').join(', ')}` : ''}`);
    const tag = `live ${id} (${G_.label}, L${L}, melee, ${LIVE_POTIONS} potions)`;
    // the -1 tier row runs more trials (a 3-4 / 6 band on 6 seeded trials flips on any RNG shift): red when its rate, on the /6
    // scale, rounds outside 3-4 (wins x 6 / trials outside [2.5, 4.5))
    const per6 = row.won * 6 / row.trials; row.per6 = per6;
    if (G_.k === 'under' && (per6 < LIVE_UNDER[0] - 0.5 || per6 >= LIVE_UNDER[1] + 0.5)) red(`${tag}: won ${row.won}/${row.trials} (= ${per6.toFixed(1)}/6), §26.2 target ${LIVE_UNDER.join('-')}/6`);
    if (G_.k === 'reference' && row.won < row.trials) red(`${tag}: won ${row.won}/${row.trials}, §26.2 target 6/6 at reference gear (boss left at up to ${Math.round(row.bossLeft * 100)} %)`);
    if (G_.k === 'reference' && lens.length && med > redMax) red(`${tag}: median kill ${Math.round(med)} s over the ${redMax} s red limit (§20.7)`);
    else if (lens.length && med > max) notes.push(`${tag}: median kill ${Math.round(med)} s over the §20.3 ${max} s target`);
  }
}

// 4. builds: optimal / random, reactions, ultimate, caps
log('\nBUILDS (Pinewood L8 and Ruins L14, sword; DPS vs neutral; random = mean of 24 rolls)');
const capsRow = [];
for (const L of [8, 14, 24]) {
  const ref = dpsVs('__neutral', L, 'sword', 'reference', null, 240), opt = dpsVs('__neutral', L, 'sword', 'optimal', null, 240);
  let rs = 0; for (let k = 0; k < 24; k++) rs += dpsVs('__neutral', L, 'sword', 'random').dps; rs /= 24;
  const ratio = opt.dps / rs;
  log(`  L${String(L).padEnd(3)} reference ${Math.round(ref.dps)}  random ${Math.round(rs)}  optimal ${Math.round(opt.dps)}  optimal/random ${r2(ratio)} (CI 1.3-2.2)  ultimate every ${r1(ref.ult)} s (optimal ${r1(opt.ult)} s; §20.5 ~40 s, red < 15 s)`);
  if (ref.ult > 60) notes.push(`ultimate charges every ${r1(ref.ult)} s at L${L} (reference, single target, no reactions); §20.5 baseline ~40 s`);
  if (ratio < 1.3 || ratio > 2.2) red(`optimal/random DPS ${r2(ratio)} at L${L} outside 1.3-2.2`);
  for (const [k, u] of [['reference', ref.ult], ['optimal', opt.ult]]) if (u < 15) red(`ultimate every ${r1(u)} s (${k}, L${L}) faster than 15 s`);
  // stat sums vs caps (the optimal build)
  // the optimal hero's full gear sum (p.sum: every slot incl. trinkets, implicits, boons, after the trinket resist caps) vs CAPS
  const sums = ev(`(() => { const p = simGear(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'optimal'), s = Object.assign({}, p.sum);
    return { crit: (s.crit || 0) + G.tune.player.crit, haste: s.haste || 0, cdr: s.cdr || 0, gearPower: s.power || 0, markCap: MARK_BASE + (s.markCap || 0), potions: MAX_POTIONS + (s.potionCharge || 0),
      reactionBonus: Math.max(0, ...Object.values(p.reactBonus || {})), res: Object.fromEntries(RES_ELS.map(el => [el, (s[resKey(el)] || 0) + (s.resAll || 0)])) }; })()`);
  const caps = ev(`(() => { const C = capsT(); return { crit: C.crit, haste: C.haste, cdr: C.cdr, gearPower: C.gearPower, markCap: C.markCap, potions: C.potions, reactionBonus: C.reactionBonus, resMax: C.heroResMax }; })()`);
  for (const k in caps) if (sums[k] != null && sums[k] > caps[k] + 1e-9) red(`stat sum ${k} = ${r2(sums[k])} over its cap ${caps[k]} (optimal L${L})`);
  for (const el in sums.res) if (sums.res[el] > caps.resMax + 1e-9) red(`stat sum res ${el} = ${r2(sums.res[el])} over the ${caps.resMax} resist cap`);
  capsRow.push({ L, sums });
}
for (const fam of ['staff', 'bow']) { const u = dpsVs('__neutral', 8, fam, 'optimal', null, 240).ult; log(`  ${fam} optimal L8: ultimate every ${r1(u)} s`); if (u < 15) red(`ultimate every ${r1(u)} s (${fam} optimal) faster than 15 s`); }
log('  reactions: 0 % of DPS (no reaction code until M4) — reaction-share flag cannot trip yet');

// 4b. trinket share of gear DPS (§20.4: trinkets <= 25 % of total gear power): 1 - DPS without the milestone trinkets / with them
const trkShare = [];
for (const L of [10, 17, 24, 31]) {
  const full = dpsVs('__neutral', L, 'sword', 'reference', null, 120).dps, bare = dpsVs('__neutral', L, 'sword', 'notrk', null, 120).dps;
  trkShare.push(`L${L} ${Math.round((1 - bare / full) * 100)} %`);
  if (1 - bare / full > 0.25) notes.push(`trinkets are ${Math.round((1 - bare / full) * 100)} % of reference DPS at L${L} (§20.4 <= 25 %)`);
}
log(`  trinket share of reference DPS (sword, milestone trinkets vs starter ring only): ${trkShare.join(' · ')}   (§20.4 <= 25 %)`);

// 5. survival (3 commons): Normal and NG+
log('\nSURVIVAL (stand in 3 reference commons, no dodging; target 10-14 s on Normal)');
const surv = [];
for (const [band, L, types] of [['Pinewood', 7, ['gloomslime', 'shadehound', 'ogre']], ['Ruins', 13, ['slime', 'wisp', 'hound']]]) {
  if (!types.every(t => ENEMY[t])) continue;
  const row = { band, L, normal: survival(types, L, 1), ng: survival(types, L, 1.6) };
  surv.push(row);
  log(`  ${band.padEnd(9)} L${L}  Normal ${r1(row.normal)} s   NG+ ${r1(row.ng)} s   (${types.join(', ')})`);
  if (row.normal < 10 || row.normal > 14) notes.push(`survival in 3 commons at ${band} L${L}: ${r1(row.normal)} s (target 10-14 s, not a CI flag)`);
}

// 6. economy: Dust + potions over a main path
ev(`simMap(1, 40); G.player = makePlayer();`);
const econ = ev(`(() => {
  const BANDS = ${JSON.stringify(BANDS.map(b => [b.lo, b.hi]))}, RUNS = 40; let dust = 0, potions = 0, rooms = 0, items = 0;
  for (let run = 0; run < RUNS; run++) for (const [lo, hi] of BANDS) {
    const L = Math.round((lo + hi) / 2), drops = [];
    for (let k = 0; k < 40; k++) drops.push(...rollLoot('normal', L));
    for (let k = 0; k < 3; k++) drops.push(...rollLoot('chest', L));
    for (let k = 0; k < 2; k++) drops.push(...rollLoot('elite', L));
    // trigger loot cards (room clears, secrets): the generated Act I maps carry ~7 per band, Uncommon floor
    for (let k = 0; k < 7; k++) { let r = rollRarity('elite', L); if (!rarityAtLeast(r, 'uncommon')) r = 'uncommon'; drops.push({ kind: 'item', it: rollItem(L, r) }); }
    for (const d of drops) { if (d.kind === 'item') { items++; if (Math.random() < 0.8) dust += salvageValue(d.it); } if (d.kind === 'potion') potions++; }
    rooms += 8;
  }
  for (let run = 0; run < RUNS; run++) for (const L of [5, 8, 14]) for (const d of rollLoot('boss', L)) { if (d.kind === 'item' && Math.random() < 0.8) dust += salvageValue(d.it); if (d.kind === 'potion') potions++; }
  return { dust: Math.round(dust / RUNS), potions: potions / RUNS, rooms: rooms / RUNS, items: items / RUNS };
})()`);
const SINKS = 700;
log(`\nECONOMY (main path model)  Dust income ${econ.dust} (target 900-1,200; sinks ${SINKS})   potions per room ${r2(econ.potions / econ.rooms)} (Normal target ~1.2 incl. checkpoints; red > 2)`);
if (econ.dust < SINKS) red(`Dust sinks ${SINKS} larger than income ${econ.dust}`);
if (econ.dust < 900 || econ.dust > 1200) notes.push(`Dust income ${econ.dust} outside the 900-1,200 target`);
if (econ.potions / econ.rooms > 2) red(`${r2(econ.potions / econ.rooms)} potions per room (> 2)`);

// 7. XP path: hero level at Morrow on the 2 h and 5 h paths
const xpPath = hours => ev(`(() => {
  const BANDS = ${JSON.stringify(BANDS.map(b => [b.lo, b.hi, b.refs]))}, mins = ${hours} * 60 / BANDS.length, p = G.player = makePlayer(); p.level = 1; p.xp = 0;
  const out = [];
  BANDS.forEach(([lo, hi, refs], bi) => {
    G.world = { maps: { sim: { level: [lo, hi] } } };
    const types = refs.filter(t => ENEMY[t] && enemyClass(t) === 'normal'); if (!types.length) types.push('slime', 'wisp', 'hound');
    for (let m = 0; m < mins * 2; m++) { const t = types[m % types.length], L = Math.min(hi, Math.max(lo, p.level)); const n = killXp({ type: t, lvl: L }); p.xp += n; while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) { p.xp -= xpToNext(p.level); p.level++; } }
    out.push(p.level);
    const boss = bi < 2 ? 'mossjaw' : 'boss'; p.xp += killXp({ type: boss, lvl: hi }); while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) { p.xp -= xpToNext(p.level); p.level++; }
  });
  return out;
})()`);
const p2 = xpPath(2), p5 = xpPath(5);
log(`\nXP PATH  level before each band's boss  2 h: ${p2.join(' ')}   5 h: ${p5.join(' ')}   (Morrow = the Spire value; red outside 34-40)`);
for (const [k, path_] of [['2 h', p2], ['5 h', p5]]) { const L = path_[path_.length - 1]; if (L < 34 || L > 40) red(`hero level at Morrow ${L} on the ${k} path outside 34-40`); }

// ---------------------------------------------------------------- report
log('\nNOT MEASURABLE YET (listed, never red): reaction share and ring resonance (no reactions before M4) · trinket share in');
log('  eHP (DPS only above) · NG+ drop scaling (NG+ is modelled as x1.6 damage taken only) · Grotto/Caldera/Spire');
log('  TTK (no reference enemies for those bands yet) · Morrow fight length.');
// (runs last: its random rolls never shift the RNG stream of the tables above)
SMath.random = mulberry32(SEED + 101);   // its own seeded stream: the tables above never shift its numbers (and it never shifts theirs)
// 7. LOADOUT v3 (docs/design/balance.md "Loadout loop", weapons-and-skills.md "Parity targets"): every legal HAND x OFFHAND x armour
// suit at T1..T3 (L4 / L12 / L20), reference gear. The rotation adds the M2 off-action at the head of each chain (Turn / Nock advance
// the deck, Step marks) and alternates the two ultimates on the one shared charge. DPS vs the neutral target; eHP = HP / (1 - armour).
// Parity: the four reference kits, each a class pair in its own suit (Sword + Buckler / Warden, Staff + Grimoire / Dreamweave,
// Sword + Daggers / Warden, Bow + Quiver / Stalker), DPS within +-15 % of the four's mean at each tier.
// Pick rate: power = DPS x sqrt(eHP / the tier's mean eHP) (toughness at half weight); per hand and tier the offhand of its best kit,
// per hand + offhand and tier the suit of its best kit; any offhand or suit best in more than 60 % of its cells is red.
const LO_SUITS = { knight: FAMS.sword.slice(1), arcane: FAMS.staff.slice(1), ranger: FAMS.bow.slice(1) };
const LO_HANDS = ['sword', 'daggers', 'staff', 'bow'], LO_OFFS = [null, 'buckler', 'grimoire', 'quiver', 'daggers', 'sword'];
const LO_TIERS = [['T1', 4], ['T2', 12], ['T3', 20]], LO_T = +arg('loadout-t', 60), LO_TRIALS = +arg('loadout-trials', 3), LO_PTRIALS = +arg('parity-trials', 8);
const LO_KITS = [['sword', 'buckler', 'knight'], ['staff', 'grimoire', 'arcane'], ['sword', 'daggers', 'knight'], ['bow', 'quiver', 'ranger']];
function loadoutRun(hand, off, suit, L, trials = LO_TRIALS) {
  ctx.SIM_OFF = off;
  ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); G.__ultAlt = true;`);
  const p = ev(`simHero(${JSON.stringify([hand].concat(LO_SUITS[suit]))}, ${L}, '${rarityAt(L)}', 'reference')`);
  const legal = !off || !!p.equip.offhand;
  let dps = 0;
  if (legal) for (let k = 0; k < trials; k++) {   // the mean of LO_TRIALS runs (crits and procs are rolled)
    if (k) ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); G.__ultAlt = true; simHero(${JSON.stringify([hand].concat(LO_SUITS[suit]))}, ${L}, '${rarityAt(L)}', 'reference')`);
    ctx.__t = ev(`(() => { const e = spawnEnemy('__neutral', 27, 24, 0); e.hp = e.maxHp = 1e9; e.stunT = 9; return e; })()`);
    ev(`simRotation(__t, ${LO_T}, ${standoffOf(hand)})`);
    dps += (1e9 - ctx.__t.hp) / LO_T / trials;
  }
  ev(`G.__ultAlt = false;`); delete ctx.SIM_OFF;
  return legal ? { hand, off: off || '-', suit, L, dps, ehp: p.maxHp / (1 - p.def) } : null;
}
const loRows = [], loParity = [], loPick = { offhand: {}, suit: {} }, loCells = { offhand: 0, suit: 0 };
for (const [tn, L] of LO_TIERS) {
  const rows = [];
  for (const hand of LO_HANDS) for (const off of LO_OFFS) for (const suit of Object.keys(LO_SUITS)) { const r = loadoutRun(hand, off, suit, L); if (r) rows.push(Object.assign(r, { tier: tn })); }
  const meanE = rows.reduce((a, r) => a + r.ehp, 0) / rows.length;
  for (const r of rows) r.power = r.dps * Math.sqrt(r.ehp / meanE);
  loRows.push(...rows);
}
const loBest = L => L.reduce((a, r) => (!a || r.power > a.power ? r : a), null);
log(`\nLOADOUT v3 (hand x offhand x suit, reference gear, ${LO_T} s rotation with M2 + both ultimates, vs a neutral target, mean of ${LO_TRIALS})`);
log('  tier  kit                       DPS    eHP    vs mean');
for (const [tn] of LO_TIERS) {
  const rows = loRows.filter(r => r.tier === tn);
  // the parity kits re-run at LO_PTRIALS (M4b: 3 rolled runs swing a kit +-5 %, enough to flip a +-15 % flag on noise)
  const kits = LO_KITS.map(([h, o, s]) => { const r0 = rows.find(r => r.hand === h && r.off === o && r.suit === s); return r0 && Object.assign({}, r0, { dps: loadoutRun(h, o, s, r0.L, LO_PTRIALS).dps }); });
  if (kits.some(k => !k)) { red(`loadout: a reference kit is not a legal build at ${tn}`); continue; }
  const mean = kits.reduce((a, r) => a + r.dps, 0) / kits.length;
  for (const r of kits) {
    const dev = r.dps / mean - 1, name = `${r.hand} + ${r.off} (${r.suit})`;
    loParity.push({ tier: tn, kit: name, dps: r.dps, ehp: r.ehp, dev });
    log(`  ${tn.padEnd(5)} ${name.padEnd(25)} ${String(Math.round(r.dps)).padStart(5)}  ${String(Math.round(r.ehp)).padStart(6)}   ${(dev >= 0 ? '+' : '') + Math.round(dev * 100)} %`);
    if (Math.abs(dev) <= 0.15) continue;
    // the Staff below L8 sits on the pre-M4a low-level gap (the HERO table's L1-L6 weapon parity note): explained, not red
    if (tn === 'T1' && r.hand === 'staff' && dev > -0.25) explained.push(`loadout parity: ${name} at T1 is ${Math.round(dev * 100)} % off the reference kits' mean DPS (the low-level Staff gap, see the HERO parity note)`);
    else red(`loadout parity: ${name} at ${tn} is ${Math.round(dev * 100)} % off the four reference kits' mean DPS (+-15 %)`);
  }
  for (const hand of LO_HANDS) {
    const hr = rows.filter(r => r.hand === hand); if (!hr.length) continue;
    const b = loBest(hr); loPick.offhand[b.off] = (loPick.offhand[b.off] || 0) + 1; loCells.offhand++;
    for (const off of new Set(hr.map(r => r.off))) { const s = loBest(hr.filter(r => r.off === off)); loPick.suit[s.suit] = (loPick.suit[s.suit] || 0) + 1; loCells.suit++; }
  }
}
const loPct = (n, d) => Math.round(n / d * 100);
log(`  best kit per tier: ${LO_TIERS.map(([tn]) => { const b = loBest(loRows.filter(r => r.tier === tn)); return `${tn} ${b.hand} + ${b.off} (${b.suit})`; }).join(', ')}`);
log(`  offhand pick rate (best offhand per hand per tier, ${loCells.offhand} cells): ${Object.entries(loPick.offhand).map(([k, n]) => `${k} ${loPct(n, loCells.offhand)} %`).join(', ')}`);
log(`  suit pick rate (best suit per hand + offhand per tier, ${loCells.suit} cells): ${Object.entries(loPick.suit).map(([k, n]) => `${k} ${loPct(n, loCells.suit)} %`).join(', ')}`);
for (const [kind, P] of Object.entries(loPick)) for (const [k, n] of Object.entries(P)) {
  if (n / loCells[kind] <= 0.6) continue;
  const s = `loadout pick rate: ${kind} ${k} is the best pick in ${loPct(n, loCells[kind])} % of cells (> 60 %)`;
  // one live chest per armour class and Dreamweave's +25 % power reads for every hand: an armour-lane finding, carried as explained
  if (kind === 'suit' && k === 'arcane') explained.push(s + ' (Dreamweave +25 % power is universal; one live chest per class: armour lane)'); else red(s);
}
// 8. M4b LINES (weapons-and-skills.md "Parity targets"): every live weapon line at T1..T3 in its class's natural kit (offhand LN_OFFC,
// suit LN_SUIT, reference gear, the LOADOUT rotation): DPS within +-15 % of the mean of all lines at that tier (red outside). Then every
// offhand line on its natural hand and every suit on its class's natural hand + offhand: DPS within 0.8..1.2 of the four reference kits'
// mean DPS (the "utility 0.8 to 1.2x" band; red outside; eHP is listed: a tank line pays in DPS what it gains in eHP). The T1 Foci sit on
// the low-level Staff gap (HERO parity note): -25 % there is explained, not red. The rotation taps M1 (no
// Heavy Strike / Orb drain holds) and fights a frozen target, so control (roots, pulls, Taunt, guards) reads only through eHP.
const LN_TRIALS = +arg('line-trials', 5);
const LN_OFFC = { blades: 'buckler', greatarms: 'warhorn', shots: 'quiver', foci: 'grimoire', shadows: 'buckler' };
const LN_SUIT = { blades: 'warden', greatarms: 'juggernaut', shots: 'stalker', foci: 'dreamweave', shadows: 'shade' };
const suitFams = s => ['head', 'chest', 'boots'].map(slot => ev(`ARMOUR_PIECE(${JSON.stringify(s)}, '${slot}')`));
ev(`function ARMOUR_PIECE(s, slot) { for (const c in ARMOUR) if (ARMOUR[c].suits[s]) return ARMOUR[c].suits[s].pieces[slot].id; return null; }`);
const LN_LINES = ev(`(() => { const L = []; for (const c in WEAPONS) for (const id in WEAPONS[c].variants) if (!WEAPONS[c].variants[id].planned) L.push([id, c]); return L; })()`);
const LN_OFF = { buckler: 'sword', heater: 'mace', tower: 'rapier', grimoire: 'staff', quiver: 'bow', warhorn: 'axe' };
const LN_STAND = (hand, cls) => (hand === 'halberd' ? 1.6 : cls === 'shots' || cls === 'foci' ? 3.5 : 1.1);
function lineRun(hand, cls, off, suit, L) {
  ctx.SIM_OFF = off; const fams = JSON.stringify([hand].concat(suitFams(suit)));
  let dps = 0, ehp = 0;
  for (let k = 0; k < LN_TRIALS; k++) {
    ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); G.__ultAlt = true;`);
    const p = ev(`simHero(${fams}, ${L}, '${rarityAt(L)}', 'reference')`); ehp = p.maxHp / (1 - p.def);
    if (off && !p.equip.offhand) { ev(`G.__ultAlt = false;`); delete ctx.SIM_OFF; return null; }
    ctx.__t = ev(`(() => { const e = spawnEnemy('__neutral', 27, 24, 0); e.hp = e.maxHp = 1e9; e.stunT = 9; return e; })()`);
    ev(`simRotation(__t, ${LO_T}, ${LN_STAND(hand, cls)})`);
    dps += (1e9 - ctx.__t.hp) / LO_T / LN_TRIALS;
  }
  ev(`G.__ultAlt = false;`); delete ctx.SIM_OFF;
  return { hand, off: off || '-', suit, L, dps, ehp };
}
const lnRows = [];
log(`\nM4b LINES (reference gear, ${LO_T} s LOADOUT rotation, mean of ${LN_TRIALS}; weapons: the class offhand + suit, vs the mean of all lines)`);
log('  line        class       ' + LO_TIERS.map(([tn]) => `${tn} DPS  vs mean`.padEnd(18)).join(''));
const lnW = {};
for (const [tn, L] of LO_TIERS) for (const [id, cls] of LN_LINES) { const r = lineRun(id, cls, LN_OFFC[cls], LN_SUIT[cls], L); lnW[tn + id] = r; lnRows.push(Object.assign({ tier: tn, kind: 'weapon', cls }, r)); }
const lnMean = {}; for (const [tn] of LO_TIERS) { const R = LN_LINES.map(([id]) => lnW[tn + id]); lnMean[tn] = R.reduce((a, r) => a + r.dps, 0) / R.length; }
for (const [id, cls] of LN_LINES) {
  log(`  ${id.padEnd(11)} ${cls.padEnd(11)} ` + LO_TIERS.map(([tn]) => { const r = lnW[tn + id], dev = r.dps / lnMean[tn] - 1; r.dev = dev;
    if (Math.abs(dev) > 0.15) { const m = `line parity: ${id} at ${tn} is ${Math.round(dev * 100)} % off the mean of all weapon lines (+-15 %)`; if (tn === 'T1' && cls === 'foci' && dev > -0.25) explained.push(m + ' (the low-level Foci gap, see the HERO parity note)'); else red(m); }
    return `${String(Math.round(r.dps)).padStart(6)}  ${((dev >= 0 ? '+' : '') + Math.round(dev * 100) + ' %').padStart(6)}    `; }).join(''));
}
log('  offhand / suit   on hand    ' + LO_TIERS.map(([tn]) => `${tn} DPS   eHP  x mean`.padEnd(25)).join(''));
const lnRef = {}; for (const [tn] of LO_TIERS) { const K = loParity.filter(r => r.tier === tn); const mE = K.reduce((a, r) => a + r.ehp, 0) / K.length; lnRef[tn] = { mE, mD: K.reduce((a, r) => a + r.dps, 0) / K.length }; }
const lnUtil = [];
for (const [off, hand] of Object.entries(LN_OFF)) lnUtil.push({ label: off, hand, off, suit: LN_SUIT[LN_LINES.find(l => l[0] === hand)[1]] });
for (const s of ['crusader', 'juggernaut', 'frostweave', 'stormweave', 'thornwarden', 'duelist', 'shade', 'nightshade', 'mirage']) {
  const cls = Object.entries(LN_SUIT).find(([, v]) => v === s);
  const hand = { crusader: 'mace', juggernaut: 'hammer', frostweave: 'wand', stormweave: 'orb', thornwarden: 'bow', duelist: 'rapier', shade: 'daggers', nightshade: 'claws', mirage: 'fans' }[s];
  lnUtil.push({ label: s, hand, off: LN_OFFC[LN_LINES.find(l => l[0] === hand)[1]], suit: s, cls, isSuit: true });
}
for (const u of lnUtil) {
  const cls = LN_LINES.find(l => l[0] === u.hand)[1];
  log(`  ${u.label.padEnd(16)} ${u.hand.padEnd(10)} ` + LO_TIERS.map(([tn, L]) => {
    const r = lineRun(u.hand, cls, u.off, u.suit, L); if (!r) { red(`line: ${u.label} on ${u.hand} is not a legal build`); return 'illegal'.padEnd(24); }
    const pw = r.dps / lnRef[tn].mD; lnRows.push(Object.assign({ tier: tn, kind: u.isSuit ? 'suit' : 'offhand', label: u.label, power: pw }, r));
    if (pw < 0.8 || pw > 1.2) { const m = `line utility: ${u.label} (on ${u.hand}) at ${tn} deals x${pw.toFixed(2)} of the reference kits' mean DPS (0.8-1.2)`; if (tn === 'T1' && cls === 'foci' && pw >= 0.75) explained.push(m + ' (the low-level Foci gap)'); else red(m); }
    return `${String(Math.round(r.dps)).padStart(6)} ${String(Math.round(r.ehp)).padStart(6)}  x${pw.toFixed(2)}      `; }).join(''));
}
if (explained.length && !QUIET) { log('\nEXPLAINED (not red):'); for (const s of explained) log('  - ' + s); }
if (notes.length) { log('\nNOTES (targets, not CI flags):'); for (const s of notes) log('  - ' + s); }
say(flags.length ? `\nbalsim RED FLAGS (${flags.length}):` : `\nbalsim: no red flags (${explained.length} explained, ${notes.length} notes).`);
for (const s of flags) say('  ! ' + s);
if (JSON_OUT) console.log(JSON.stringify({ heroRows, loRows, loParity, lnRows, loPick, ttkRows, bossRows, liveRows, surv, econ, xp: { p2, p5 }, flags, explained, notes }, null, 1));
process.exit(flags.length ? 3 : 0);   // 3 = balance red flags (report-only in smoke); 1 = a crash
