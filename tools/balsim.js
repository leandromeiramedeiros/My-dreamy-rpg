#!/usr/bin/env node
'use strict';
// tools/balsim.js — the balance sim (DESIGN §20.7). Runs the REAL game code headless (js/*.js in index.html order, in a
// vm context, seeded Math.random): recalcStats, useSkill / basicAttack, damageEnemy, the part runtime and BOSS_MOVES.
//   node tools/balsim.js [--seed=N] [--trials=N] [--quiet] [--json]
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
//   Survival: three reference commons with live AI on a hero who only stands (Story x0.6, Normal, NG+ x1.6).
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
const order = [...html.matchAll(/<script\s+src="js\/([a-z0-9_]+)\.js"/g)].map(m => m[1]);
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
  G.enemies = []; G.projs = []; G.effects = []; G.zones = []; G.parts = []; G.texts = []; G.delays = []; G.drops = []; G.boss = null; G.shrink = null; G.trig = null;
  G.prog = { chests: {}, firsts: {}, trig: {}, quests: {}, gates: {}, secrets: {} };
  return m;
}
function simStep(rdt) {
  let dt = rdt;
  if (G.hitstopT > 0) { G.hitstopT -= rdt; dt = 0; }
  G.t += rdt;
  updatePlayer(G.player, dt); updateEnemies(dt); updateProjs(dt); updateZones(dt);
  for (const d of G.delays.slice()) { d.t -= dt; if (d.t <= 0) { d.done = true; withCast(d.c || null, d.fn); } }
  G.delays = G.delays.filter(d => !d.done);
  for (const e of G.effects) { e.t += dt; if (e.t >= e.life) { e.done = true; if (e.onDone) e.onDone(e); } }
  G.effects = G.effects.filter(e => !e.done); G.texts.length = 0; G.parts.length = 0; G.drops.length = 0;
}`);

// ---------------------------------------------------------------- builds
const FAMS = { sword: ['dawnblade', 'knighthelm', 'knightplate', 'knightgreaves'], staff: ['starfall', 'arcanecowl', 'dreamrobe', 'clothsandals'], bow: ['moonbow', 'wardenhood', 'stalkerjacket', 'stalkershoes'] };
const SLOTS = ['weapon', 'head', 'chest', 'boots'];
const BANDS = [
  { name: 'Vale', lo: 1, hi: 3, ttk: [2, 2], refs: ['dreammoth', 'slime'] },
  { name: 'Pinewood', lo: 3, hi: 10, ttk: [2.5, 3.5], elite: 12, refs: ['gloomslime', 'shadehound', 'brambleshaman', 'ogre', 'thornbackboar', 'mountaintroll'], elites: ['troll'] },
  { name: 'Ruins', lo: 10, hi: 17, ttk: [3, 4], elite: 14, refs: ['slime', 'wisp', 'hound'] },
  { name: 'Grotto', lo: 17, hi: 24, ttk: [3, 4], refs: [] }, { name: 'Caldera', lo: 24, hi: 31, ttk: [3.5, 4.5], refs: [] }, { name: 'Spire', lo: 31, hi: 38, ttk: [4, 5], refs: [] },
];
const DPS_TABLE = [[1, 3, 60, 60], [3, 10, 110, 220], [10, 17, 220, 420], [17, 24, 420, 700], [24, 31, 700, 1100], [31, 38, 1100, 1600]];
const interp = (T, L) => { let r = T[0]; for (const x of T) if (L >= x[0]) r = x; return r[2] + (r[3] - r[2]) * Math.min(1, Math.max(0, (L - r[0]) / (r[1] - r[0]))); };
const bandOf = L => BANDS.find(b => L >= b.lo && L < b.hi) || BANDS[BANDS.length - 1];
const rarityAt = L => (L < 3 ? 'uncommon' : L < 17 ? 'rare' : 'epic');
const gemGrade = L => (L < 10 ? 1 : L < 24 ? 2 : 3);
ev(`function simAffix(stat, ilvl, rarity, q) {
  if (AFFIX[stat] === 'res') return 0.15;
  const [a, pl] = AFFIX[stat], R = RARITY[rarity];
  let v = (a + pl * ilvl) * q * (1 + 0.08 * R.i);
  return PCT_STATS[stat] ? Math.round(v * 1000) / 1000 : (v < 10 ? Math.round(v * 10) / 10 : Math.round(v));
}
function simGear(fams, L, rarity, kind) {
  const p = makePlayer(); p.level = L; let tier = 0; for (let t = 0; t < 5; t++) if (TIER_REQ[t] <= L) tier = t; if (tier === 4) tier = 3;
  const OFF = ['power', 'crit', 'critDmg', 'haste', 'skillDmg'], REF = { weapon: ['power', 'crit', 'critDmg'], armour: ['hp', 'def', 'crit'] };
  const g = L < 10 ? 1 : L < 24 ? 2 : 3;
  ['weapon', 'head', 'chest', 'boots'].forEach((slot, i) => {
    const base = FAMILY_TIERS[fams[i]][tier].split(':')[0];
    const it = makeItem(base, rarity, L, { sockets: slot === 'weapon' || slot === 'chest' ? 1 : 0 });
    if (kind === 'reference') it.affixes = (slot === 'weapon' ? REF.weapon : REF.armour).slice(0, RARITY[rarity].affixes).map(stat => ({ stat, v: simAffix(stat, L, rarity, 0.8) }));
    if (kind === 'optimal') it.affixes = (slot === 'weapon' ? ['power', 'critDmg', 'crit'] : slot === 'head' ? ['crit', 'critDmg', 'power'] : slot === 'chest' ? ['power', 'skillDmg', 'crit'] : ['haste', 'power', 'crit']).slice(0, RARITY[rarity].affixes).map(stat => ({ stat, v: simAffix(stat, L, rarity, 1) }));
    // reference gems are diamonds (element-neutral: a ruby would amplify only fire skills and skew weapon parity)
    if (it.sockets.length) it.sockets[0] = kind === 'random' ? pick2(GEM_TYPES) + '_' + g : kind === 'optimal' ? (slot === 'weapon' ? 'ruby_' + g : 'amethyst_' + g) : 'diamond_' + g;
    p.equip[slot] = it;
  });
  recalcStats(p, true); return p;
}`);
ev(`function simHero(fams, L, rarity, kind) { const p = simGear(fams, L, rarity, kind); G.player = p; p.x = 24; p.y = 24; p.z = 0; p.invulnT = 0; return p; }`);

// ---------------------------------------------------------------- rotation vs a frozen target
ev(`function simRotation(target, maxT, standoff) {
  const p = G.player, seq = ['b', 'b', 'b', 's', 'd']; let i = 0, t = 0, alt = 0, ultAt = [], dash = false;
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
      if (a === 'b') { basicAttack(p); i++; }
      else if (a === 's') { if (p.ult >= 100 && useSkill(p, 'r')) ultAt.push(t); else { const s = alt++ % 2 ? 'e' : 'q'; if (!useSkill(p, s)) useSkill(p, s === 'q' ? 'e' : 'q'); } i++; }
      else { if (useSkill(p, 'shift')) dash = true; i = 0; }
    }
    p.hp = p.maxHp; simStep(1 / 60); t += 1 / 60;
    if (p.ult >= 100 && G.__ultFirst == null) G.__ultFirst = t;
  }
  return { t, ultAt };
}`);
const standoffOf = fam => (fam === 'sword' ? 1.1 : 3.5);

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
function survival(types, L, ng, story) {
  const r = [];
  for (let k = 0; k < TRIALS; k++) {
    ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference'); setSetting('difficulty', '${story ? 'story' : 'normal'}'); __NG = ${ng};`);
    const t = ev(`(() => { const p = G.player; const ts = ${JSON.stringify(types)}; ts.forEach((ty, i) => { const a = i / ts.length * 6.28; const e = spawnEnemy(ty, p.x + Math.cos(a) * 1.2, p.y + Math.sin(a) * 1.2, 0); e.dm *= __NG; });
      let t = 0; while (!p.dead && t < 60) { p.x = 24; p.y = 24; simStep(1 / 60); t += 1 / 60; } return t; })()`);
    r.push(t);
  }
  ev(`setSetting('difficulty', 'normal'); __NG = 1;`);
  return r.reduce((a, b) => a + b, 0) / r.length;
}

// ---------------------------------------------------------------- run
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
// elite spawns (makeElite) at Pinewood
log('\nELITE SPAWN TTK (Pinewood L7, x ELITE_HP, target 12 s)');
for (const type of ['ogre', 'gloomslime']) {
  if (!ENEMY[type]) continue;
  const fams = ['sword', 'staff', 'bow'].map(f => ttk(type, 7, f, 'reference', { elite: true, mod: 'storm' })), v = Math.exp(fams.reduce((a, x) => a + Math.log(x), 0) / 3);
  log(`  ${type.padEnd(12)} ${r1(v)} s (geometric mean; sword / staff / bow ${fams.map(r1).join(' / ')})`);
  if (v < 6 || v > 24) red(`elite spawn TTK ${r1(v)} s (geometric mean of the families) for ${type} at L7: outside 6-24`);
}

// 3. bosses: length + fairness + hit size
log('\nBOSSES (length = HP / (rotation DPS vs the boss x uptime); red: mini 45-120 s, guardian 100-300 s)');
log('  boss          kind      L   HP       DPS(sword/staff/bow)    length s (sword/staff/bow)   target');
const BOSS_IDS = ['mossjaw', 'bramblehorn', 'boss'];
const bossRows = [];
for (const id of BOSS_IDS) {
  if (!ENEMY[id]) continue;
  const B = ev(`BOSSES['${ENEMY[id].boss || id}']`), mini = B.kind === 'mini', L = ENEMY[id].level || 17, up = mini ? 0.7 : 0.6;
  ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi}); G.player = makePlayer(); G.player.level = ${L};`);
  const hp = ev(`Math.round(ENEMY['${id}'].hp * enemyHpMul(${ev(`enemyLevel('${id}')`)}))`);
  const row = { id, kind: B.kind, L, hp, dps: {}, len: {} };
  for (const fam of ['sword', 'staff', 'bow']) { row.dps[fam] = dpsVs(id, L, fam, 'reference').dps; row.len[fam] = hp / (row.dps[fam] * up); }
  bossRows.push(row);
  log(`  ${id.padEnd(13)} ${B.kind.padEnd(9)} ${String(L).padEnd(3)} ${String(hp).padEnd(8)} ${['sword', 'staff', 'bow'].map(f => Math.round(row.dps[f])).join(' / ').padEnd(23)} ${['sword', 'staff', 'bow'].map(f => Math.round(row.len[f])).join(' / ').padEnd(28)} ${mini ? '60-90' : '150-240'}`);
  for (const fam of ['sword', 'staff', 'bow']) {
    const v = row.len[fam];
    if (mini && (v < 45 || v > 120)) red(`mini-boss ${id} length ${Math.round(v)} s (${fam}) outside 45-120`);
    if (!mini && (v < 100 || v > 300)) red(`guardian ${id} length ${Math.round(v)} s (${fam}) outside 100-300`);
  }
  for (const f of ev(`bossFairness('${ENEMY[id].boss || id}')`)) {
    const s = `${id}.${f.move}: ${f.rule} (got ${f.got} s)`;
    if (f.legacy) explained.push(s + ' — M2a Warden timing kept on purpose (acceptance: plays like today); retime in the M4 Warden pass');
    else red('fairness ' + s);
  }
  // one big hit vs the reference hero: §20.3 35-45 % of eHP; "three mistakes kill, one never does"
  const big = ev(`(() => { const D = BOSSES['${ENEMY[id].boss || id}']; let best = null; for (const n in D.moveDefs) { const M = D.moveDefs[n]; if (M.hit === 'big' || (M.dmg || 0) >= 100) { simMap(${bandOf(L).lo}, ${bandOf(L).hi}); simHero(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'reference'); const b = spawnEnemy('${id}', 30, 24, 0); const raw = moveDmg(b, M), p = G.player; const taken = raw * (1 - p.def) * (1 - ((p.res && p.res[M.el || b.el]) || 0)); const f = taken / p.maxHp; (best = best || []).push({ move: n, f }); } } return best; })()`);
  if (big) {
    log(`    telegraphed big hits vs the reference hero: ${big.map(h => `${h.move} ${Math.round(h.f * 100)} %`).join(', ')} (target 35-45 %)`);
    for (const h of big) {
      if (h.f >= 1) red(`${id}.${h.move} one-shots the reference hero (${Math.round(h.f * 100)} % HP)`);
      else if (h.f < 0.35 || h.f > 0.45) notes.push(`${id}.${h.move} big hit ${Math.round(h.f * 100)} % of hero HP (target 35-45 %)`);
    }
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
  const sums = ev(`(() => { const p = simGear(${JSON.stringify(FAMS.sword)}, ${L}, '${rarityAt(L)}', 'optimal'), s = {}; for (const slot of SLOTS) { const st = statsOf(p.equip[slot]); for (const k in st) s[k] = (s[k] || 0) + st[k]; } s.crit = (s.crit || 0) + G.tune.player.crit; return s; })()`);
  const caps = Object.assign({ crit: 0.75, haste: 1, cdr: 0.4 }, ev(`typeof CAPS !== 'undefined' ? Object.fromEntries(Object.entries(CAPS).filter(([k, v]) => typeof v === 'number')) : {}`));
  for (const k in caps) if (sums[k] != null && sums[k] > caps[k] + 1e-9) red(`stat sum ${k} = ${r2(sums[k])} over its cap ${caps[k]} (optimal L${L})`);
  for (const k in sums) if (/^res/.test(k) && sums[k] + (sums.resAll || 0) > 0.6 + 1e-9 && k !== 'resAll') red(`stat sum ${k} = ${r2(sums[k])} over the 0.6 resist cap`);
  capsRow.push({ L, sums });
}
for (const fam of ['staff', 'bow']) { const u = dpsVs('__neutral', 8, fam, 'optimal', null, 240).ult; log(`  ${fam} optimal L8: ultimate every ${r1(u)} s`); if (u < 15) red(`ultimate every ${r1(u)} s (${fam} optimal) faster than 15 s`); }
log('  reactions: 0 % of DPS (no reaction code until M4) — reaction-share flag cannot trip yet');

// 5. survival (3 commons) per difficulty
log('\nSURVIVAL (stand in 3 reference commons, no dodging; target 10-14 s on Normal)');
const surv = [];
for (const [band, L, types] of [['Pinewood', 7, ['gloomslime', 'shadehound', 'ogre']], ['Ruins', 13, ['slime', 'wisp', 'hound']]]) {
  if (!types.every(t => ENEMY[t])) continue;
  const row = { band, L, story: survival(types, L, 1, true), normal: survival(types, L, 1, false), ng: survival(types, L, 1.6, false) };
  surv.push(row);
  log(`  ${band.padEnd(9)} L${L}  Story ${r1(row.story)} s   Normal ${r1(row.normal)} s   NG+ ${r1(row.ng)} s   (${types.join(', ')})`);
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
log('\nNOT MEASURABLE YET (listed, never red): reaction share (no reactions before M4) · trinket share of gear power (no');
log('  trinkets in index.html yet) · NG+ drop scaling (NG+ is modelled as x1.6 damage taken only) · Grotto/Caldera/Spire');
log('  TTK (no reference enemies for those bands yet) · potions per room on Story · Morrow fight length.');
if (explained.length && !QUIET) { log('\nEXPLAINED (not red):'); for (const s of explained) log('  - ' + s); }
if (notes.length) { log('\nNOTES (targets, not CI flags):'); for (const s of notes) log('  - ' + s); }
say(flags.length ? `\nbalsim RED FLAGS (${flags.length}):` : `\nbalsim: no red flags (${explained.length} explained, ${notes.length} notes).`);
for (const s of flags) say('  ! ' + s);
if (JSON_OUT) console.log(JSON.stringify({ heroRows, ttkRows, bossRows, surv, econ, xp: { p2, p5 }, flags, explained, notes }, null, 1));
process.exit(flags.length ? 1 : 0);
