#!/usr/bin/env node
'use strict';
// Balance sheets (docs/design/balance.md). Loads the real game data into a vm context, writes five CSVs into
// tools/balance/out/ (gitignored) and prints a summary of the §20.7 thresholds this data can check.
//   node tools/balance/sheets.js
//
// ASSUMPTIONS
// Load order: index.html order (util, data, items, world, game). js/itemdata.js is not in index.html but
//   holds AFFIX_V2, IMPLICITS and BOONS, so it is loaded after items.js.
// Units: 1 pp = +1 % DPS or eHP (§20.4). Pricing used by item_pp.csv and the reference gear:
//   power/critDmg/haste/fire..holyDmg/cdr/skillDmg/def/resAll: value x 100.  res*: value x 100.
//   crit: value x 0.8 x 100 (base crit damage 0.8).  hp (flat): 100 x value / base HP at that level.
//   Anything else (regen, mp, speed, stagger, pierce, triggers...) is unpriced and left blank.
// Reference gear (per level L, ilvl = L): the reference weapon is Dawnblade (basic 44, rate 0.42),
//   weapon tier from TIER_REQ/TIER_DMG. Three armour pieces. Affix tier T1 below ilvl 14, T2 below 28, T3 above.
//   Offense: power + implicit 5 + gems (2 x Ruby, grade 1/2/3 at L <10 / <24 / else) + Epic rarity step 15
//   (from L 20). Crit and critDmg from the affix tier. Base crit 0.08 (G.tune.player), base critDmg 0.8.
//   Defence (per armour piece): def affix + implicit 5 + Epic step 15; plus flat hp from the hp affix.
//   DPS = hit x (1 + crit x critMult) / basic.rate, hit = weapon dmg x tune.damage x (1 + 0.03 (L-1)) x (1 + offPP/100).
//   eHP = (base HP + flat hp) x (1 + defPP/100). No haste, no reactions, no uptime.
// Reference hero DPS / eHP for TTK: the §20.3 table, linearly interpolated per level. Level 3 belongs to Pinewood.
// Enemy level: common types at the band midpoint; the guardian at the band top (as enemyLevel() does).
// Enemy HP/dmg: ENEMY x enemyHpMul / enemyDmgMul from items.js. Guardian length = HP / (ref DPS x 0.6).
// XP per kill: killXp() from items.js. Above band top + 3 the design rule (§20.3, 10 %) replaces the code's gap factor.
// XP path: six §20.3 bands, each given an equal share of the path (2 h = 20 min per band, 5 h = 50 min).
//   120 kills per hour (2 per minute), averaged over slime/wisp/hound.
//   Boss at each band end: the Vale and Pinewood mini-bosses give 0.5 level, the guardians and Morrow give 1 level
//   (§20.3). Only The Gloam Warden (Ruins) exists in data. The other boss names are placeholders.
// Dust: 50 drops per zone, 80 % salvaged, drop rarity from RARITY_W.normal weighted by (1 + 0.04 L)^i, ilvl = band
//   midpoint, salvageValue() from items.js. Boss, chest and elite drops are excluded. §20.6 sinks total 700 (their
//   unit costs are not in code). Only three maps exist in WORLD_DATA; the sheets use the six §20.3 bands as zones.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');   // generated CSVs (gitignored); the folder is created below
fs.mkdirSync(OUT, { recursive: true });
const LOAD = ['js/util.js', 'js/data.js', 'js/items.js', 'js/itemdata.js', 'js/world.js', 'js/enemydata.js', 'js/parts.js', 'js/bosses.js', 'js/game.js'];   // M2b: ENEMY lives in parts.js

// ---------- load the game into a vm context with browser stubs ----------
function makeContext() {
  const noop = () => {};
  const el = () => ({ style: {}, getContext: () => null, addEventListener: noop, appendChild: noop, setAttribute: noop,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false } });
  const ctx = {
    console, Math, Date, JSON,
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: el,
      addEventListener: noop, body: el(), documentElement: el() },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop, clear: noop },
    Image: function () { this.addEventListener = noop; },
    addEventListener: noop, requestAnimationFrame: noop, setTimeout: noop, setInterval: noop,
    navigator: {}, performance: { now: () => 0 },
  };
  ctx.window = ctx;
  return vm.createContext(ctx);
}

const ctx = makeContext();
for (const f of LOAD) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error(`failed to load ${f}: ${e.message}`); process.exit(1); }
}
const ev = expr => vm.runInContext(expr, ctx);
const D = {
  ENEMY: ev('ENEMY'), AFFIX: ev('AFFIX_V2'), IMPLICITS: ev('IMPLICITS'), BOONS: ev('BOONS'), RARITY: ev('RARITY'),
  RARITY_W: ev('RARITY_W'), TIER_DMG: ev('TIER_DMG'), TIER_REQ: ev('TIER_REQ'), ITEMS: ev('ITEMS'), GEMS: ev('GEMS'),
  WORLD: ev('WORLD_DATA'), MAX_LEVEL: ev('MAX_LEVEL'), G: ev('G'),
};
const xpToNext = ev('xpToNext'), killXp = ev('killXp'), salvageValue = ev('salvageValue');
const enemyHpMul = ev('enemyHpMul'), enemyDmgMul = ev('enemyDmgMul'), enemyClass = ev('enemyClass');
const tune = D.G.tune.player;
const WEAPON = D.ITEMS.weapon[0];   // Dawnblade: the reference weapon
const IMPL = 5;                      // §20.4 implicit budget
const EPIC_STEP = 15;                // §20.4 rarity step
const MAX_LEVEL = D.MAX_LEVEL;

// ---------- §20.3 tables (the targets) ----------
const BANDS = [
  { name: 'Vale', lo: 1, hi: 3, guardian: false, mini: true },
  { name: 'Pinewood', lo: 3, hi: 10, guardian: false, mini: true },
  { name: 'Ruins', lo: 10, hi: 17, guardian: true },
  { name: 'Grotto', lo: 17, hi: 24, guardian: true },
  { name: 'Caldera', lo: 24, hi: 31, guardian: true },
  { name: 'Spire', lo: 31, hi: 38, guardian: true },
];
const DPS_TABLE = [[1, 3, 60, 60], [3, 10, 110, 220], [10, 17, 220, 420], [17, 24, 420, 700], [24, 31, 700, 1100], [31, 38, 1100, 1600]];
const EHP_TABLE = [[1, 3, 900, 900], [3, 10, 1100, 1900], [10, 17, 1900, 3000], [17, 24, 3000, 4400], [24, 31, 4400, 6200], [31, 38, 6200, 8500]];
const UPTIME_GUARDIAN = 0.6;
const DROPS_PER_ZONE = 50, SALVAGE_RATE = 0.8;
const DUST_SINKS_MAIN = 700;          // §20.6 planned spend
const DUST_INCOME_TARGET = [900, 1200];
const KILLS_PER_MIN = 2;
const MOBS = ['slime', 'wisp', 'hound'];

// ---------- helpers ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
function interp(table, L) {
  let row = table[0];
  for (const r of table) if (L >= r[0]) row = r;
  const [lo, hi, a, b] = row;
  return a + (b - a) * clamp((L - lo) / (hi - lo), 0, 1);
}
const refHp = L => tune.hp * (1 + 0.04 * (L - 1));
const affTier = L => (L < 14 ? 0 : L < 28 ? 1 : 2);
const AFF_ILVL = [7, 20, 35];                       // representative ilvl of each tier
const AFF_BUDGET = [4, 8, 13];                      // §20.4 affix pp
const tierAt = L => { let t = 0; D.TIER_REQ.forEach((r, i) => { if (L >= r) t = i; }); return t; };
const affixMid = (slot, stat, t) => { const row = (D.AFFIX[slot][stat] || [])[t]; return row ? (row.r[0] + row.r[1]) / 2 : 0; };

const PCT_PP = new Set(['power', 'critDmg', 'haste', 'skillDmg', 'cdr', 'dmg', 'fireDmg', 'frostDmg', 'natureDmg',
  'lightningDmg', 'arcaneDmg', 'holyDmg', 'slashDmg', 'pierceDmg', 'shatterDmg', 'def', 'resAll']);
function ppOf(stat, v, L) {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  if (stat === 'crit') return v * 0.8 * 100;
  if (stat === 'hp') return 100 * v / refHp(L);
  if (PCT_PP.has(stat) || stat.startsWith('res')) return v * 100;
  return null;
}
// Sum pp over an effect object; returns { pp (null if nothing priced), skipped: [keys] }.
function priceEffects(obj, L) {
  let pp = 0, any = false; const skipped = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const p = ppOf(k, v, L);
    if (p === null) skipped.push(k); else { pp += p; any = true; }
  }
  return { pp: any ? pp : null, skipped };
}

// ---------- hero_curve ----------
function refGear(L) {
  const t = affTier(L), epic = L >= 20 ? EPIC_STEP : 0;
  const g = L < 10 ? 1 : L < 24 ? 2 : 3;
  const power = affixMid('prefix', 'power', t) * 100;
  const crit = affixMid('prefix', 'crit', t);
  const critDmg = affixMid('prefix', 'critDmg', t);
  const gemPP = 2 * D.GEMS.ruby.wpn(g).power * 100;
  const offPct = power + IMPL + epic + gemPP;           // DPS pp, crit terms handled below
  const critC = tune.crit + crit, critM = 0.8 + critDmg;
  const weaponDmg = WEAPON.basic.dmg * D.TIER_DMG[tierAt(L)];
  const baseHit = weaponDmg * tune.damage * (1 + 0.03 * (L - 1));
  const hit = baseHit * (1 + offPct / 100);
  const dps = hit * (1 + critC * critM) / WEAPON.basic.rate;
  const flatHp = 3 * affixMid('suffix', 'hp', t);
  const defPct = 3 * (affixMid('suffix', 'def', t) * 100 + IMPL + epic);
  const maxHp = refHp(L) + flatHp;
  const ehp = maxHp * (1 + defPct / 100);
  const ppOff = offPct + crit * 0.8 * 100 + critDmg * 100;
  return { baseHp: refHp(L), baseDmg: baseHit, ppOff, ppDef: defPct, ppTotal: ppOff + defPct, dps, ehp };
}
function heroRows() {
  const rows = [];
  for (let L = 1; L <= MAX_LEVEL; L++) {
    const r = refGear(L);
    const tDps = interp(DPS_TABLE, L), tEhp = interp(EHP_TABLE, L);
    rows.push([L, round(r.baseHp), round(r.baseDmg, 1), xpToNext(L), round(r.ppOff, 1), round(r.ppDef, 1), round(r.ppTotal, 1),
      round(r.dps), round(r.ehp), round(tDps), round(tEhp), round(r.dps / tDps, 2)]);
  }
  return rows;
}

// ---------- item_pp ----------
function itemRows() {
  const rows = [];
  for (const slot of ['prefix', 'suffix']) {
    for (const [stat, tiers] of Object.entries(D.AFFIX[slot])) {
      tiers.forEach((tr, t) => {
        const mid = (tr.r[0] + tr.r[1]) / 2;
        const pp = ppOf(stat, mid, AFF_ILVL[t]);
        rows.push(['affix', `${slot}.${stat}`, `T${t + 1}`, `${tr.r[0]}-${tr.r[1]}`, pp === null ? '' : round(pp, 1), AFF_BUDGET[t],
          pp === null ? `unpriced stat ${stat}` : `mid ${round(mid, 4)} at ilvl ${AFF_ILVL[t]}`]);
      });
    }
  }
  for (const g of [1, 2, 3]) {
    for (const type of Object.keys(D.GEMS)) {
      const d = D.GEMS[type];
      const wpn = priceEffects(d.wpn(g), 20), arm = priceEffects(d.arm(g), 20);
      const pp = Math.max(wpn.pp ?? -Infinity, arm.pp ?? -Infinity);
      const budget = { 1: 4, 2: 8, 3: 14 }[g];
      rows.push(['gem', `${type}_${g}`, ['Chipped', 'Clear', 'Radiant'][g - 1],
        `wpn=${JSON.stringify(d.wpn(g))} arm=${JSON.stringify(d.arm(g))}`, Number.isFinite(pp) ? round(pp, 1) : '', budget,
        `max of weapon/armour side at L20; skipped: ${[...new Set([...wpn.skipped, ...arm.skipped])].join(',') || 'none'}`]);
    }
  }
  for (const [key, im] of Object.entries(D.IMPLICITS)) {
    const p = ppOf(im.stat, im.v, 20);
    rows.push(['implicit', key, '', `${im.stat}=${im.v}`, p === null ? '' : round(p, 1), IMPL,
      p === null ? `unpriced stat ${im.stat}` : 'flat hp at L20']);
  }
  for (const [slot, list] of Object.entries(D.BOONS)) {
    for (const b of list) {
      for (const tier of ['minor', 'major']) {
        const pr = priceEffects(b[tier], 20);
        rows.push(['boon', `${slot}:${b.id}`, tier, JSON.stringify(b[tier]), pr.pp === null ? '' : round(pr.pp, 1), '',
          pr.skipped.length ? `unpriced: ${pr.skipped.join(',')}` : '']);
      }
    }
  }
  return rows;
}

// ---------- enemy_curve ----------
const killFactorK = t => clamp((D.ENEMY[t].hp || 100) / 1300, 0.06, 1.2);
function enemyRows(flags) {
  const rows = [];
  for (const band of BANDS) {
    const mid = Math.round((band.lo + band.hi) / 2);
    for (const type of Object.keys(D.ENEMY)) {
      if (type === 'dummy') continue;
      const d = D.ENEMY[type], cls = enemyClass(type), isBoss = cls === 'boss';
      const L = isBoss ? band.hi : mid;
      const hp = Math.round(d.hp * enemyHpMul(L)), dmg = Math.round((d.dmg || 0) * enemyDmgMul(L));
      const dps = interp(DPS_TABLE, L);
      const ttk = hp / dps;
      const bossLen = isBoss ? hp / (dps * UPTIME_GUARDIAN) : null;
      D.G.player = { level: L };
      const xp = killXp({ type, lvl: L });
      rows.push([band.name, `${band.lo}-${band.hi}`, L, type, cls, hp, dmg, round(dps), round(ttk, 2),
        bossLen === null ? '' : round(bossLen, 1), xp, isBoss && band.guardian ? 'guardian' : (isBoss ? 'boss type, no guardian here' : '')]);
      if (!isBoss && (ttk < 1.5 || ttk > 7)) flags.push(`common TTK ${round(ttk, 2)} s outside 1.5-7: ${type} at ${band.name} (L${L})`);
      if (isBoss && band.guardian && (bossLen < 100 || bossLen > 300))
        flags.push(`guardian length ${round(bossLen, 1)} s outside 100-300: ${type} at ${band.name} (L${L})`);
    }
  }
  return rows;
}

// ---------- xp_path ----------
const BOSSES = [
  { band: 0, name: 'Vale mini-boss (placeholder)', kind: 'mini' },
  { band: 1, name: 'Pinewood mini-boss (placeholder)', kind: 'mini' },
  { band: 2, name: 'The Gloam Warden (Ruins, in data)', kind: 'guardian' },
  { band: 3, name: 'Grotto guardian (placeholder)', kind: 'guardian' },
  { band: 4, name: 'Caldera guardian (placeholder)', kind: 'guardian' },
  { band: 5, name: 'Morrow (placeholder, Spire end)', kind: 'final' },
];
// one kill's XP at the current player level, with the §20.3 ceiling on top of the code's gap factor
function killXpAt(level, band) {
  D.G.player = { level };
  const out = [];
  for (const type of MOBS) {
    const lvl = clamp(level, band.lo, band.hi);
    const base = killXp({ type, lvl });
    const ceiling = level >= band.hi + 3;
    out.push(ceiling ? Math.max(1, Math.round(xpToNext(level) * killFactorK(type) * 0.1)) : base);
  }
  return out.reduce((a, b) => a + b, 0) / out.length;
}
function simulatePath(hours) {
  const minsPerBand = hours * 60 / BANDS.length;
  let level = 1, xp = 0, minute = 0;
  const bossRecs = [];
  const levelUp = () => { while (level < MAX_LEVEL && xp >= xpToNext(level)) { xp -= xpToNext(level); level++; } };
  BANDS.forEach((band, b) => {
    for (let m = 0; m < minsPerBand; m++) {
      for (let k = 0; k < KILLS_PER_MIN; k++) xp += killXpAt(level, band);
      levelUp();
      minute++;
    }
    const boss = BOSSES[b];
    const before = level;
    xp += xpToNext(level) * (boss.kind === 'mini' ? 0.5 : 1);
    levelUp();
    bossRecs.push({ ...boss, minute: Math.round(minute), before, after: level });
  });
  return bossRecs;
}
function xpRows(flags) {
  const rows = [];
  let cum = 0;
  const p2 = simulatePath(2), p5 = simulatePath(5);
  for (let L = 1; L <= MAX_LEVEL; L++) {
    rows.push(['level', L, L < MAX_LEVEL ? xpToNext(L) : '', round(cum), '', '', '', '', '', '', '']);
    if (L < MAX_LEVEL) cum += xpToNext(L);
  }
  BOSSES.forEach((boss, i) => {
    const a = p2[i], c = p5[i];
    rows.push(['boss', '', '', '', boss.name, boss.kind, BANDS[boss.band].name, a.minute, a.before, c.minute, c.before]);
    const morrow = boss.kind === 'final';
    if (morrow) {
      for (const [label, r] of [['2h', a], ['5h', c]]) {
        if (r.before < 34 || r.before > 40) flags.push(`hero level at Morrow ${r.before} on the ${label} path, outside 34-40`);
      }
    }
  });
  return { rows, p2, p5 };
}

// ---------- dust_flow ----------
const RARITY_NAMES = Object.entries(D.RARITY).sort((a, b) => a[1].i - b[1].i).map(([k]) => k);
function expectedSalvage(L) {
  const w = D.RARITY_W.normal.map((v, i) => v * Math.pow(1 + L * 0.04, i));
  const tot = w.reduce((a, b) => a + b, 0);
  return w.reduce((s, v, i) => s + (v / tot) * salvageValue({ rarity: RARITY_NAMES[i], ilvl: L }), 0);
}
function dustRows(flags) {
  const rows = [];
  let income = 0;
  for (const band of BANDS) {
    const mid = Math.round((band.lo + band.hi) / 2);
    const exp = expectedSalvage(mid), inc = DROPS_PER_ZONE * SALVAGE_RATE * exp;
    income += inc;
    rows.push(['income', band.name, mid, DROPS_PER_ZONE, SALVAGE_RATE, round(exp, 2), round(inc, 1), '', '']);
  }
  rows.push(['income_total', 'main path (6 bands)', '', '', '', '', round(income, 1), '', '']);
  rows.push(['sink', 'planned spend (6 tempers, 2 imbues, 3 Chipped gems, 2 runes)', '', '', '', '', '', DUST_SINKS_MAIN,
    'unit costs not in code; total from DESIGN §20.6']);
  rows.push(['check', 'sinks vs income', '', '', '', '', round(income, 1), DUST_SINKS_MAIN,
    income < DUST_SINKS_MAIN ? 'SINKS LARGER THAN INCOME' : 'ok']);
  if (income < DUST_SINKS_MAIN) flags.push(`Dust sinks ${DUST_SINKS_MAIN} larger than main-path income ${round(income)}`);
  if (income < DUST_INCOME_TARGET[0] || income > DUST_INCOME_TARGET[1])
    rows.push(['note', 'main-path income vs §20.6 target 900-1200', '', '', '', '', round(income, 1), '', 'outside target band']);
  return rows;
}

// ---------- data consistency checks (not §20.7 rules, but they block the sheets) ----------
function missingEnemies() {
  const seen = new Set();
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.enemy === 'string') seen.add(o.enemy);
    for (const v of Object.values(o)) walk(v);
  };
  walk(D.WORLD);
  return [...seen].filter(t => t !== 'dummy' && !D.ENEMY[t]);
}
function bossXpRatio() {
  D.G.player = { level: 10 };
  return killXp({ type: 'boss', lvl: 10 }) / xpToNext(10);
}
// code's kill XP three levels above an enemy's level, relative to the same kill at gap 0 (§20.3 says 0.10)
function ceilingRatio() {
  D.G.player = { level: 13 };
  const gap3 = killXp({ type: 'slime', lvl: 10 });
  D.G.player = { level: 10 };
  const gap0 = killXp({ type: 'slime', lvl: 10 });
  return gap3 / gap0;
}

// ---------- CSV ----------
const csvCell = v => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function writeCsv(name, header, rows, comment = null) {
  const lines = [];
  if (comment) lines.push(...comment.map(c => `# ${c}`));
  lines.push(header.map(csvCell).join(','));
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  fs.writeFileSync(path.join(OUT, name), lines.join('\n') + '\n');
  return rows.length;
}

// ---------- run ----------
const flags = [];
const counts = {};
counts.hero = writeCsv('hero_curve.csv',
  ['level', 'base_hp', 'base_dmg', 'xp_to_next', 'ref_pp_offense', 'ref_pp_defence', 'ref_pp_total', 'approx_dps', 'approx_ehp', 'target_dps_s20_3', 'target_ehp_s20_3', 'dps_vs_target'],
  heroRows());
counts.items = writeCsv('item_pp.csv', ['kind', 'id', 'tier_or_grade', 'value', 'pp_est', 'pp_budget_s20_4', 'note'], itemRows());
counts.enemy = writeCsv('enemy_curve.csv',
  ['band', 'band_levels', 'level', 'type', 'class', 'hp', 'dmg', 'ref_hero_dps_s20_3', 'ttk_s', 'guardian_length_s', 'xp_per_kill', 'note'],
  enemyRows(flags));
const xp = xpRows(flags);
counts.xp = writeCsv('xp_path.csv',
  ['row', 'level', 'xp_to_next', 'cum_xp_to_reach', 'boss', 'boss_kind', 'band', 'minute_2h', 'level_before_boss_2h', 'minute_5h', 'level_before_boss_5h'],
  xp.rows,
  ['xp_path.csv: cumulative XP to reach each level (row=level) and the level before each boss (row=boss).',
    'Model: six §20.3 bands with equal time (2 h = 20 min/band, 5 h = 50 min/band), 2 kills/min (slime, wisp, hound average).',
    'Kill XP from items.js killXp(), with the §20.3 ceiling (10 % at band top + 3) applied on top.',
    'Boss XP per §20.3: mini-boss 0.5 level, guardian and Morrow 1 level (killXp() itself gives bosses 2 levels; see summary).',
    'Boss roster: only The Gloam Warden (Ruins) is in data; the other bosses are placeholders.']);
counts.dust = writeCsv('dust_flow.csv', ['row', 'zone', 'ilvl', 'drops', 'salvage_rate', 'expected_salvage_per_drop', 'dust', 'sink_dust', 'note'], dustRows(flags));

// ---------- summary ----------
const bossXp = bossXpRatio(), ceil = ceilingRatio();
const missing = missingEnemies();
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const itemdataLoaded = indexHtml.includes('itemdata.js');

console.log('Balance sheets written to ' + OUT);
console.log(`  hero_curve.csv ${counts.hero} rows, item_pp.csv ${counts.items}, enemy_curve.csv ${counts.enemy}, xp_path.csv ${counts.xp}, dust_flow.csv ${counts.dust}`);
console.log('\n§20.7 threshold flags:');
if (!flags.length) console.log('  none');
for (const f of flags) console.log('  FLAG ' + f);
console.log('\nNot checkable from these sheets (need the sim or a boss/potion model): mini-boss length (no mini-boss enemy type in data),');
console.log('  optimal/random ratio, reaction share, ultimate cooldown, stat caps (CAPS), potions per room.');
console.log('\nOther findings (data vs DESIGN):');
console.log(`  killXp() gives a boss ${round(bossXp, 2)} x xpToNext(L); §20.3 says 1 level (xp_path uses 1).`);
console.log(`  killXp() at 3 levels over the enemy gives ${round(ceil, 2)} x its base XP; §20.3 says 0.10 (xp_path applies 0.10).`);
console.log(`  WORLD_DATA spawns enemy types missing from ENEMY: ${missing.length ? missing.join(', ') : 'none'}.`);
console.log(`  js/itemdata.js is ${itemdataLoaded ? '' : 'NOT '}referenced in index.html (AFFIX_V2, IMPLICITS and BOONS live there).`);
const d1 = interp(DPS_TABLE, 1);
console.log(`  modelled hero DPS at L1: ${round(refGear(1).dps)} vs §20.3 ${d1} (ratio ${round(refGear(1).dps / d1, 2)}).`);
console.log(`  modelled hero DPS at L40: ${round(refGear(40).dps)} vs §20.3 ${round(interp(DPS_TABLE, 40))} (ratio ${round(refGear(40).dps / interp(DPS_TABLE, 40), 2)}).`);
console.log(`  2 h path, level before each boss: ${xp.p2.map((r, i) => `${BANDS[i].name} ${r.before}`).join(', ')}.`);
console.log(`  5 h path, level before each boss: ${xp.p5.map((r, i) => `${BANDS[i].name} ${r.before}`).join(', ')}.`);
