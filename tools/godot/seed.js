#!/usr/bin/env node
'use strict';
// tools/godot/seed.js -- the one-time data seed of the Godot project (M10 wave 1).
//   node tools/godot/seed.js [--ref=<js-final checkout>] [--no-godot] [--force]
// 1. Loads the JS reference tables (js/data.js, items.js, itemdata.js, enemydata.js, parts.js, bosses.js, status.js,
//    sfxdata.js and what they need) in a Node vm (tools/godot/jsctx.js) and writes godot/data/seed/*.json, one file per
//    table, already in the Godot field names. Numbers come over as data. Behaviour that lives in JS functions (a skill's
//    `cast`, an effect's `do`, enemy parts, boss moves, elite mods) goes into each row's `todo` text for wave 2.
// 2. Runs Godot headless: --import, then the seed importer (godot/addons/seed_import) which writes res://data/**/*.tres.
//    Existing .tres files are kept (the client may have edited them) unless --force.
// The handoff art must be in godot/art first (node tools/godot/art.js), so enemies and gear find their sheets.
// Client ruling 2026-10-23: the hero is Karea (was Aerin) in every display string; the code id stays `player`.
const fs = require('fs'), path = require('path');
const { load } = require('./jsctx');
const { runGodot } = require('./godot');

const GODOT_DIR = path.resolve(__dirname, '../../godot');
const OUT = path.join(GODOT_DIR, 'data', 'seed');
const ART = path.join(GODOT_DIR, 'art');
const { ev, ROOT } = load();
const G = n => ev(n);
let renamed = 0;

// ---------------------------------------------------------------- helpers
const deg = r => +(r * 180 / Math.PI).toFixed(2);
const num = v => (typeof v === 'number' && isFinite(v) ? v : undefined);
const clean = o => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };
const fnSrc = f => String(f).replace(/\r/g, '');
// a plain-data copy: functions become a list of "key: source" lines (returned in `fns`)
function plain(o, fns = [], pfx = '') {
  if (typeof o === 'function') { fns.push(pfx + ': ' + fnSrc(o)); return undefined; }
  if (Array.isArray(o)) return o.map((v, i) => plain(v, fns, pfx + '[' + i + ']'));
  if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) { if (k.startsWith('__')) continue; const v = plain(o[k], fns, pfx ? pfx + '.' + k : k); if (v !== undefined) r[k] = v; } return r; }
  return o;
}
// display strings: Aerin -> Karea (client ruling 2026-10-23)
function karea(o) {
  if (typeof o === 'string') { const s = o.replace(/\bAerin\b/g, () => { renamed++; return 'Karea'; }); return s; }
  if (Array.isArray(o)) return o.map(karea);
  if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = karea(o[k]); return o; }
  return o;
}
function write(name, rows) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ about: 'Seed from the JS reference (tools/godot/seed.js). One-time: edit the .tres in res://data/, not this file.', rows: karea(rows) }, null, 1) + '\n');
  return rows.length;
}
const artHas = rel => fs.existsSync(path.join(ART, rel)) || fs.existsSync(path.join(ROOT, 'handoff', 'art', rel)) || fs.existsSync(path.resolve(__dirname, '../../handoff/art', rel));

// ---- a sandbox that evaluates JS argument lists / object literals from cast sources: unknown names become NaN-ish
// proxies, so `{ x: p.x, dmg: 74, col: '#ff9a4a' }` yields { dmg: 74, col: '#ff9a4a' } after numbers are filtered
const ghost = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => NaN : k === Symbol.unscopables ? undefined : ghost), apply: () => ghost, construct: () => ghost });
const scope = new Proxy({}, { has: () => true, get: (t, k) => (k === Symbol.unscopables ? undefined : k in Math && k !== 'random' ? Math[k] : k === 'Math' ? Math : k === 'undefined' ? undefined : k === 'true' ? true : k === 'false' ? false : k === 'null' ? null : k === 'Infinity' ? Infinity : ghost) });
function evalLit(src) {
  try { return new Function('S', 'with (S) { return (' + src + '); }')(scope); } catch (e) { return undefined; }
}
const dataOf = v => {   // keep plain numbers, strings, booleans and nested objects of those
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (v && typeof v === 'object' && v !== ghost && !Array.isArray(v)) { const r = {}; for (const k in v) { const d = dataOf(v[k]); if (d !== undefined) r[k] = d; } return r; }
  if (Array.isArray(v)) return v.map(dataOf);
  return undefined;
};
// find every call `name(` in src: [{ name, at, args (source text), end }]
function calls(src, names) {
  const out = [];
  const re = new RegExp('\\b(' + names.join('|') + ')\\s*\\(', 'g');
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, d = 1, q = null;
    for (; i < src.length && d > 0; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') q = c; else if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') d--;
    }
    out.push({ name: m[1], at: m.index, args: src.slice(m.index + m[0].length, i - 1), end: i });
  }
  return out;
}
const HIT_KEYS = { knock: 'knockback', stun: 'stun', stagger: 'stagger' };
function hitOpts(block, o) {
  o = dataOf(o) || {};
  for (const k of Object.keys(o)) {
    if (HIT_KEYS[k] && typeof o[k] === 'number') block[HIT_KEYS[k]] = o[k];
    else if (k !== 'x' && k !== 'y' && k !== 'z' && k !== 'ang') (block.hit_params || (block.hit_params = {}))[k] = o[k];
  }
  return block;
}

// ---------------------------------------------------------------- skills -> SkillData + action blocks
const SKILLS = G('SKILLS'), PAGES = G('PAGES');
function blocksFromCast(row, aim) {
  const src = row.cast ? fnSrc(row.cast) : '';
  const blocks = [], notes = [];
  if (!src) return { blocks, notes };
  const delays = calls(src, ['delay']).map(c => ({ at: c.at, end: c.end, t: num((evalLit('[' + c.args + ']') || [])[0]) }));
  const loops = [];
  const lre = /for\s*\(\s*(?:let|const)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\d+)|for\s*\(\s*const\s+\w+\s+of\s+\[([^\]]*)\]\)/g; let lm;
  while ((lm = lre.exec(src))) { const n = lm[1] ? +lm[1] : lm[2].split(',').length; const vals = lm[2] ? lm[2].split(',').map(Number) : null; loops.push({ at: lm.index, n, vals }); }
  const atTarget = a => /^\s*(tx|x)\b/.test(a);
  for (const c of calls(src, ['hitCone', 'hitLine', 'hitArea', 'spawnProj', 'zone', 'dashPlayer'])) {
    const args = evalLit('[' + c.args + ']') || [];
    const d = delays.find(x => x.at < c.at && x.end >= c.end);
    const lp = loops.filter(x => x.at < c.at).pop();
    let b = null;
    if (c.name === 'hitCone') b = hitOpts({ type: 'cone', arc: num(args[3]) != null ? deg(args[3]) : undefined, reach: num(args[4]), damage: num(args[5]) }, args[6]);
    else if (c.name === 'hitLine') b = hitOpts({ type: 'cone', reach: num(args[3]), width: num(args[4]), damage: num(args[5]) }, args[6]);
    else if (c.name === 'hitArea') b = hitOpts({ type: 'zone', at: atTarget(c.args) ? 'target' : 'self', cast_range: aim.range || undefined, radius: num(args[2]), damage: num(args[3]), life: 0 }, args[4]);
    else if (c.name === 'spawnProj') {
      const o = dataOf(args[0]) || {};
      b = { type: 'projectile', speed: o.speed, radius: o.r, life: o.life, damage: o.dmg, pierce: o.pierce, homing: o.homing, color: o.col };
      if (o.ret != null) { b.returns = true; b.return_after = o.ret; }
      if (o.explode) { b.explode_radius = o.explode.r; b.explode_damage = o.explode.dmg; }
      const rest = Object.assign({}, o); for (const k of ['speed', 'r', 'life', 'dmg', 'pierce', 'homing', 'col', 'ret', 'explode', 'kind']) delete rest[k];
      hitOpts(b, rest);
      if (lp && src.slice(lp.at, c.at).indexOf('}') < 0) { b.count = lp.n; if (lp.vals && lp.vals.length > 1) b.spread = deg(Math.max(...lp.vals) - Math.min(...lp.vals)); }
    } else if (c.name === 'zone') {
      const o = dataOf(args[0]) || {};
      b = { type: 'zone', at: /\bx:\s*tx/.test(c.args) ? 'target' : 'self', cast_range: aim.range || undefined, radius: o.r, life: o.life, tick: o.tick, damage: o.dmg, pull: o.pull, follow: o.follow, color: o.col };
      const rest = Object.assign({}, o); for (const k of ['r', 'life', 'tick', 'dmg', 'pull', 'follow', 'col', 'x', 'y']) delete rest[k];
      hitOpts(b, rest);
    } else if (c.name === 'dashPlayer') {
      const o = dataOf(args[5]) || {};
      b = { type: 'dash', distance: num(args[3]), duration: num(args[4]), iframes: o.invuln ? num(args[4]) : 0 };
      if (o.hit) { b.hit_radius = o.hit.r; b.damage = o.hit.dmg; b.knockback = o.hit.knock; }
      if (o.roll) b.roll = true;
      if (o.carry) b.carry = true;
    }
    if (!b) continue;
    if (d && d.t != null) b.delay = d.t;
    if (lp && b.type !== 'projectile' && src.slice(lp.at, c.at).indexOf('}') < 0) notes.push(`a ${b.type} block repeats ${lp.n}x in JS (loop)`);
    blocks.push(clean(b));
    if (blocks.length >= 4) break;
  }
  return { blocks, notes };
}
function blocksFromTemplate(k, o) {
  const b = [];
  o = dataOf(o) || {};
  if (k === 'dash') {
    const d = { type: 'dash', direction: o.dir || 'aim', distance: o.dist, duration: o.dur || 0.25, iframes: o.iframes || 0.25, blink: !!o.blink, roll: !!o.roll, carry: !!o.carry };
    if (o.hit) { d.hit_radius = o.hit.r; d.damage = o.hit.dmg; d.knockback = o.hit.knock; }
    b.push(d);
    if (o.land) b.push(hitOpts({ type: 'zone', at: 'self', radius: o.land.r, damage: o.land.dmg, life: 0, delay: o.dur || 0.25 }, o.land.hit));
  } else if (k === 'nova') {
    b.push(hitOpts({ type: 'zone', at: o.at === 'target' ? 'target' : 'self', cast_range: o.range || 6, radius: o.r, damage: o.dmg, life: 0, delay: o.delay || 0, color: o.col }, o.hit));
    if (o.zone) b.push({ type: 'zone', at: o.at === 'target' ? 'target' : 'self', cast_range: o.range || 6, radius: o.zone.r || o.r, damage: o.zone.dmg, life: o.zone.life, tick: o.zone.tick, delay: o.delay || 0, color: o.col });
  } else if (k === 'zone') {
    const z = o.z || {};
    b.push({ type: 'zone', at: o.at === 'target' ? 'target' : 'self', cast_range: o.range || 6, radius: z.r, damage: z.dmg, life: z.life, tick: z.tick, pull: z.pull, follow: !!o.follow, color: o.col });
  } else if (k === 'arrow') {
    const p = { type: 'projectile', speed: o.speed || 16, radius: o.r || 0.3, life: o.life || 0.75, damage: o.dmg, pierce: o.pierce || 0 };
    const rest = Object.assign({}, o); for (const kk of ['speed', 'r', 'life', 'dmg', 'pierce']) delete rest[kk];
    b.push(hitOpts(p, rest));
  }
  return b.map(clean);
}
const KIND_OF_SLOT = {};   // filled from the item lines: skill id -> kind
function skillRow(id, s) {
  const fns = [];
  const data = plain(s, fns);
  const aim = s.aim || {};
  let blocks = [], notes = [];
  if (s.__ct) { blocks = blocksFromTemplate(s.__ct, s.__o); notes.push('template CT.' + s.__ct + ' ' + JSON.stringify(plain(s.__o))); if (!blocks.length) notes.push('no starter block covers CT.' + s.__ct + ' (buff / guard): wave 2'); }
  else { const r = blocksFromCast(s, aim); blocks = r.blocks; notes = r.notes; }
  const pg = PAGES[id];
  const row = {
    id, display_name: s.name || id, description: s.desc || '', element: s.element || 'inherit', kind: KIND_OF_SLOT[id] || (pg ? 'page' : 'spell'),
    cooldown: s.cd != null ? s.cd : 0, mp_cost: s.mp || 0, stamina_cost: s.st || 0, tags: s.tags || [],
    decks: pg ? [].concat(pg.deck) : [], block_mode: 'sequence', blocks,
    aim_shape: aim.shape || 'self', aim_range: aim.range || 0, aim_radius: aim.r || 0, aim_arc: aim.arc ? deg(aim.arc) : 0, aim_width: aim.w || 0,
    stagger: s.stagger || 0, hit_weight: s.weight || 1, color: s.color,
    todo: ['Blocks seeded best-effort from the JS cast; check them against the JS (golden vectors) in wave 2.'].concat(notes, fns.length ? ['JS:'].concat(fns) : []).join('\n'),
  };
  const extra = Object.assign({}, data); for (const k of ['name', 'desc', 'element', 'cd', 'mp', 'st', 'tags', 'aim', 'stagger', 'weight', 'color', 'icon']) delete extra[k];
  if (Object.keys(extra).length) row.todo += '\nJS fields: ' + JSON.stringify(extra);
  return clean(row);
}

// ---------------------------------------------------------------- items
const WEAPONS = G('WEAPONS'), ARMOUR = G('ARMOUR'), OFFHANDS = G('OFFHANDS'), FAMILY_TIERS = G('FAMILY_TIERS'), TIER_REQ = G('TIER_REQ'), TIER_DMG = G('TIER_DMG'), TIER_PCT = G('TIER_PCT');
const CLASS_OFF = G('CLASS_OFF'), POCKETS = G('POCKETS');
// the basic attack per swing template, transcribed from game.js basicSwing (JS radians -> degrees); every hit of the combo is a block
const SWING = {
  blade3: [{ type: 'cone', arc: 1.8, reach: 1.5, k: 0.15, dir: 1 }, { type: 'cone', arc: 1.8, reach: 1.5, k: 0.15, dir: -1 }, { type: 'cone', arc: 2.2, reach: 1.75, mul: 1.6, k: 0.5, dir: 1 }],
  thrust3: [{ type: 'line', reach: 2.1, w: 0.42, k: 0.1 }, { type: 'line', reach: 2.1, w: 0.42, k: 0.1 }, { type: 'line', reach: 2.4, w: 0.6, mul: 1.6, k: 0.35 }],
  great2: [{ type: 'cone', arc: 2.0, reach: 1.9, k: 0.3, dir: 1 }, { type: 'cone', arc: 2.6, reach: 2.1, mul: 1.4, k: 0.6, dir: -1, heavy: true }],
  reach2: [{ type: 'line', reach: 2.7, w: 0.5, k: 0.25 }, { type: 'cone', arc: 2.4, reach: 2.6, mul: 1.4, k: 0.5, dir: -1 }],
  shadow4: [{ type: 'cone', arc: 1.3, reach: 1.3, k: 0.08, dir: 1 }, { type: 'cone', arc: 1.3, reach: 1.3, k: 0.08, dir: -1 }, { type: 'cone', arc: 1.3, reach: 1.3, k: 0.08, dir: 1 }, { type: 'cone', arc: 1.8, reach: 1.5, mul: 1.5, k: 0.3, dir: -1 }],
  magic: [{ type: 'proj', speed: 10, r: 0.3, life: 0.9, h: 1.6 }],
  shot: [{ type: 'proj', speed: 16, r: 0.25, life: 0.65, h: 1.5 }],
  quarrel: [{ type: 'proj', speed: 20, r: 0.28, life: 0.6, pierce: 1, h: 1.5 }],
  disc: [{ type: 'proj', speed: 12, r: 0.35, life: 0.85, pierce: 99, ret: 0.4, h: 1.4 }],
};
const POSE = { sword: 'sword', staff: 'staff', bow: 'bow', daggers: 'sword', chakram: 'none' };
// held look (Weapons Out, client ruling 2026-10-23): how the held sprite moves per swing template, and how it is carried
const SWING_STYLE = { blade3: 'swing', great2: 'swing', shadow4: 'swing', thrust3: 'thrust', reach2: 'thrust', magic: 'cast', shot: 'aim', quarrel: 'aim', disc: 'aim' };
const CARRY = { axe: 'shoulder', hammer: 'shoulder', bow: 'aim', crossbow: 'aim', chakram: 'float', orb: 'float' };
function actionSkill(v, cls) {
  const sw = v.sw || cls.swing;
  const steps = SWING[sw] || SWING.shot;
  const blocks = steps.map(st => clean(st.type === 'proj'
    ? { type: 'projectile', speed: st.speed, radius: st.r, life: st.life, pierce: st.pierce || 0, returns: st.ret != null ? true : undefined, return_after: st.ret, height: st.h, damage: v.basic.dmg, stagger: v.basic.stagger || 0, anim: 'attack', proc: 1 }
    : { type: 'cone', arc: st.type === 'line' ? undefined : deg(st.arc), reach: st.reach, width: st.type === 'line' ? st.w : undefined, damage: +(v.basic.dmg * (st.mul || 1)).toFixed(2), knockback: st.k, stagger: v.basic.stagger || 0, swing_dir: st.dir || 1, hit_weight: st.heavy ? 1.5 : 1, anim: 'attack' }));
  return {
    id: v.id + '_action', display_name: v.basic.name, description: (cls.rhythm || '') + (cls.passive ? '. ' + cls.passive : ''), element: v.element, kind: 'action',
    cooldown: v.basic.rate, tags: ['melee'].filter(() => steps[0].type !== 'proj').concat(steps[0].type === 'proj' ? ['ranged', 'projectile'] : []),
    block_mode: steps.length > 1 ? 'combo' : 'sequence', combo_reset: 1.0, blocks, color: v.color,
    aim_shape: steps[0].type === 'proj' ? 'proj' : 'cone', aim_range: steps[0].reach || +(steps[0].speed * steps[0].life).toFixed(2),
    todo: `Basic attack: swing template "${sw}" from game.js basicSwing (one block per combo hit). Hold-M1 "${v.hold || cls.hold || 'none'}" (game.js holdAttack) is wave 2.`,
  };
}
function tiersOf(famId, slot, mult, lineName) {
  return (FAMILY_TIERS[famId] || []).map((s, t) => {
    const [bid, nm] = s.includes(':') ? s.split(':') : [s, null];
    const sheet = artHas(`gear/${famId}.t${t + 1}.json`) ? `res://art/gear/${famId}.t${t + 1}.json` : '';
    return clean({ base_id: bid, display_name: nm || lineName || famId, required_level: TIER_REQ[t], multiplier: mult[t], sheet });
  });
}
const items = [], skills = [], extraSkills = {};
const needSkill = (id, why) => { if (id && !SKILLS[id] && !extraSkills[id]) extraSkills[id] = why; };
for (const cls in WEAPONS) for (const id in WEAPONS[cls].variants) {
  const v = WEAPONS[cls].variants[id], C = WEAPONS[cls];
  skills.push(actionSkill(v, C));
  KIND_OF_SLOT[v.spell] = 'spell'; KIND_OF_SLOT[v.ult] = 'ultimate';
  needSkill(v.spell, 'spell of ' + id); needSkill(v.ult, 'ultimate of ' + id);
  const flags = {}; for (const k of ['riposte', 'frenzy', 'markAll', 'clip', 'reload', 'drain', 'sw', 'kind', 'legacy', 'art']) if (v[k] != null) flags[k] = v[k];
  flags.off_action = CLASS_OFF[cls] || '';
  items.push(clean({ id, display_name: v.label, description: v.desc, kind: 'weapon', slot: 'hand', item_class: cls, hands: v.hands, element: v.element, tiers: tiersOf(id, 'weapon', TIER_DMG, v.name),
    action: id + '_action', spell: v.spell, ultimate: v.ult, mp_on_hit: C.mpOnHit, hold: v.hold || C.hold || '', stats: { dmg: v.basic.dmg }, flags, color: v.color,
    attack_pose: POSE[v.kind] || 'none', swing_style: SWING_STYLE[v.sw || C.swing] || 'swing', carry_pose: CARRY[id] || 'upright', todo: `Line name (T2 base): ${v.name}. Class passive: ${C.passive}. Off-action in OFFHAND: ${CLASS_OFF[cls] || 'none'}.` }));
}
for (const cls in OFFHANDS) for (const id in OFFHANDS[cls].variants) {
  const v = OFFHANDS[cls].variants[id];
  KIND_OF_SLOT[v.action] = 'action'; KIND_OF_SLOT[v.spell] = 'spell'; KIND_OF_SLOT[v.ult] = 'ultimate';
  for (const k of ['action', 'spell', 'ult']) needSkill(v[k], k + ' of ' + id);
  items.push(clean({ id, display_name: v.label, description: v.desc, kind: v.role === 'companion' ? 'companion' : 'shield', slot: 'offhand', item_class: cls, hands: v.hands, element: v.element,
    tiers: tiersOf(id, 'offhand', TIER_PCT, v.name), action: v.action, spell: v.spell, ultimate: v.ult, deck: v.deck || '', stats: v.stats || {}, color: v.color, attack_pose: 'none', swing_style: v.role === 'companion' ? 'none' : 'thrust', carry_pose: v.role === 'companion' ? 'float' : 'braced',
    todo: `Line name (T2 base): ${v.name}.` }));
}
for (const cls in ARMOUR) for (const suit in ARMOUR[cls].suits) {
  const S = ARMOUR[cls].suits[suit];
  for (const slot of ['head', 'chest', 'boots']) {
    const pc = S.pieces[slot]; if (!pc) continue;
    KIND_OF_SLOT[pc.skill] = 'active'; needSkill(pc.skill, 'active of ' + pc.id);
    items.push(clean({ id: pc.id, display_name: pc.name, description: pc.desc, kind: 'armour', slot, item_class: cls, suit, hands: 0, element: S.element,
      tiers: tiersOf(pc.id, slot, TIER_PCT, pc.name), active: pc.skill, stats: pc.stats || {}, resists: pc.res || {}, color: pc.color, attack_pose: 'none',
      passives: slot === 'chest' ? [] : [], todo: `Suit ${S.name} (${ARMOUR[cls].name}: ${ARMOUR[cls].profile}; 3-piece rule: ${ARMOUR[cls].rule}).` }));
  }
}
// trinkets (rings, amulets, belts), origin rings, trinket and world uniques: the boon is an Effect
const effects = [];
const BOONS = G('BOONS'), boonRow = {};
for (const slot in BOONS) for (const b of BOONS[slot]) boonRow[b.id] = b;
for (const t of G('TRINKET_BASES')) items.push(clean({ id: t.id, display_name: t.name, kind: 'trinket', slot: t.slot, hands: 0, element: 'none', stats: t.implicit ? { [t.implicit.stat]: t.implicit.v } : {},
  tiers: [{ base_id: t.id, display_name: t.name, required_level: t.reqLvl || 1, multiplier: 1 }], description: t.implicit ? t.implicit.text : '', attack_pose: 'none', todo: 'Boon rolled at drop (BOONS ' + t.slot + ').' }));
for (const o of G('ORIGIN_RINGS')) items.push(clean({ id: o.id, display_name: o.name, kind: 'trinket', slot: o.slot, hands: 0, element: 'none', description: o.boon.text, passives: [o.boon.id], attack_pose: 'none',
  tiers: [{ base_id: o.id, display_name: o.name, required_level: 1, multiplier: 1 }], todo: 'Origin ring (' + o.origin + ').' }));
for (const u of G('TRINKET_UNIQUES').concat(G('WORLD_UNIQUES'))) items.push(clean({ id: u.id, display_name: u.name, kind: 'trinket', slot: u.slot, hands: 0, element: 'none', description: u.text || '',
  stats: u.implicit ? { [u.implicit.stat]: u.implicit.v } : {}, flags: u.rule ? { rule: u.rule } : {}, attack_pose: 'none',
  tiers: [{ base_id: u.id, display_name: u.name, required_level: 16, multiplier: 1 }], todo: 'Unique rule (JS `rule`): ' + JSON.stringify(u.rule || {}) + '. Wave 2: an Effect.' }));
for (const id in POCKETS) { const p = POCKETS[id]; items.push(clean({ id, display_name: p.name, description: p.desc, kind: 'consumable', slot: 'pocket', hands: 0, element: 'none', color: p.color, attack_pose: 'none', flags: p.max ? { max: p.max } : {}, todo: 'Pocket consumable; its use is game.js usePocket (wave 2: a SkillData).' })); }
const UNIQUES = G('UNIQUES'), BASES = G('BASES');
for (const id in UNIQUES) {
  const U = UNIQUES[id], b = BASES[U.base] || {};
  const line = items.find(i => i.id === b.family) || {};
  items.push(clean({ id: 'unique_' + id, display_name: U.name, description: U.desc, kind: line.kind || 'weapon', slot: line.slot || 'hand', item_class: line.item_class, hands: line.hands, element: line.element || 'none',
    tiers: (line.tiers || []).filter(t => t.base_id === U.base), action: line.action, spell: line.spell, ultimate: line.ultimate, active: line.active, attack_pose: line.attack_pose || 'none',
    flags: plain({ base: U.base, boss: U.boss, mythic: !!U.mythic, anyWeapon: !!U.anyWeapon, late: U.late }), passives: G('EFFECT_BY_ID')['unique:' + id] ? ['unique_' + id] : [],
    todo: 'Named legendary: a rule hook on its base line (JS hasUnique/hasRule checks). Wave 2: the rule as an Effect.' }));
}

// ---------------------------------------------------------------- skills (every SKILLS row + the basic actions)
for (const id in SKILLS) skills.push(skillRow(id, SKILLS[id]));
for (const id in extraSkills) skills.push({ id, display_name: id, kind: KIND_OF_SLOT[id] || 'spell', blocks: [], todo: 'No SKILLS row in JS (' + extraSkills[id] + '): built in game.js. Wave 2.' });

// ---------------------------------------------------------------- effects (EFFECTS rows + elite mods)
const EBI = G('EFFECT_BY_ID'), effIds = new Set();
for (const key in EBI) {
  const r = EBI[key], fns = [];
  plain(r, fns);
  let id = r.src === 'trinket' ? r.id : r.src === 'affix' || r.src === 'unique' ? r.src + '_' + r.id : r.id;
  if (effIds.has(id)) id = key.replace(':', '_');
  effIds.add(id);
  const b = boonRow[r.id];
  const notes = [];
  if (r.at) notes.push('Inline engine check at ' + r.at + ' (no bus event).');
  if (r.partial) notes.push('Partial in JS: ' + r.partial);
  if (b) notes.push('Boon numbers: minor ' + JSON.stringify(b.minor || {}) + ', major ' + JSON.stringify(b.major || {}));
  if (r.suit) notes.push('Live while three ' + r.suit + ' pieces are worn.');
  if (r.cls) notes.push('Live while three ' + r.cls + ' pieces are worn.');
  effects.push(clean({ id, display_name: r.name || r.id, hint: r.hint || '', source: r.src, when_event: r.when || 'passive', icd: r.icd != null ? r.icd : 0.5, tags: r.tags || [],
    stats: r.stats || {}, do_params: b ? { minor: b.minor || {}, major: b.major || {} } : {}, do_action: r.do ? id : '', data_only: !!r.dataOnly, if_tags: r.tags && r.src === 'grip' ? [] : [],
    todo: notes.concat(fns.length ? ['JS:'].concat(fns) : []).join('\n') }));
}
const ELITE = G('ELITE_MODS');
for (const id in ELITE) { const fns = []; plain(ELITE[id], fns); effects.push({ id: 'elite_' + id, display_name: ELITE[id].name, hint: 'Elite modifier', source: 'elite', when_event: 'passive', icd: 0, do_action: 'elite_' + id, do_params: { color: ELITE[id].col, rare: !!ELITE[id].rare, hp_mult: G('ELITE_HP'), damage_mult: G('ELITE_DMG') }, todo: ['Elite modifier (parts.js ELITE_MODS); behaviour by the Bestiary lane.', 'JS:'].concat(fns).join('\n') }); }

// ---------------------------------------------------------------- grips, affixes, gems
const grips = G('GRIPS').map(g => ({ id: g.id, display_name: g.name, tags: g.tags, hint: g.hint, effect: g.id }));
const AFFIX_V2 = G('AFFIX_V2'), AFFIX_ILVL = G('AFFIX_TIER_ILVL');
const affixes = [];
for (const kind of ['prefix', 'suffix']) for (const stat in AFFIX_V2[kind]) affixes.push({ id: stat, kind, tiers: AFFIX_V2[kind][stat].map((t, i) => clean({ display_name: t.name, roll: t.r, item_level: AFFIX_ILVL[i] || 1 })),
  min_rarity: stat === 'resAll' ? 'legendary' : (stat === 'onDodge' || stat === 'onKill' ? 'epic' : '') });
const GEMS = G('GEMS');
const gems = Object.keys(GEMS).map(id => { const g = GEMS[id]; return { id, display_name: g.name, color: g.col, element: g.el || 'none', grade_names: G('GEM_GRADES'), amp: g.amp,
  armour_stats: [1, 2, 3].map(n => g.arm(n)), weapon_stats: [1, 2, 3].map(n => g.wpn(n)) }; });

// ---------------------------------------------------------------- loot tables
const RW = G('RARITY_W');
// rollLoot (items.js) chances per class, transcribed as data
const loot = [
  { id: 'class_normal', rarity_weights: RW.normal, item_chance: 0.24, gem_chance: 0.08, potion_chance: 0.06 },
  { id: 'class_elite', rarity_weights: RW.elite, item_rolls: 1, item_chance: 0.5, gem_chance: 0.4, potion_chance: 0.3 },
  { id: 'class_chest', rarity_weights: RW.chest, item_rolls: 2, gem_chance: 0.7, page_chance: 0.3, potion_chance: 1 },
  { id: 'class_boss', rarity_weights: RW.boss, item_rolls: 2, item_chance: 1, extra_item_weights: RW.elite, gem_rolls: 2, gem_level_bonus: [4, 0], potion_chance: 1 },
].map(l => Object.assign({ level_shift: 0.04 }, l));
const POOLS = G('LOOT_POOLS');
for (const id in POOLS) loot.push({ id, base_table: 'class_normal', rarity_weights: RW.normal, item_chance: 0.24, gem_chance: 0.08, potion_chance: 0.06, level_shift: 0.04, exclude_bases: POOLS[id].exclude || [] });

// ---------------------------------------------------------------- enemies and bosses
const ENEMY = G('ENEMY'), BOSSES = G('BOSSES'), BOSS_FILL = G('BOSS_FILL'), ALIAS = Object.assign({ troll: 'mountaintroll', hound: 'shadehound', shaman: 'brambleshaman', slime: 'gloomslime' }, G('ENEMY_ALIASES'));
const MOVES = ['chase', 'kite', 'orbit', 'charge', 'burrow', 'teleport', 'stationary', 'sleep', 'mimic'];
const ATTACKS = ['brute', 'shoot', 'sniper', 'bomber', 'zone-caster', 'healer', 'summon', 'charge', 'burrow', 'teleport'];
const sidecar = rel => { for (const p of [path.join(ART, rel), path.resolve(__dirname, '../../handoff/art', rel)]) if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); return null; };
function lookOf(id, row) {
  for (const c of [id, row.sprite, row.look, ALIAS[id], ALIAS[row.sprite], ALIAS[row.look]].filter(Boolean)) {
    const j = sidecar(`enemies/${c}.json`);
    if (j) return { frames: `res://art/enemies/${c}.tres`, normal_map: `res://art/enemies/${c}_n.png`, origin: j.origin, art: c };
  }
  return null;
}
// looks with no sheet of their own (seed choice): the training dummy is the hero's body as a straw mannequin
const LOOK_OVERRIDE = { dummy: { frames: 'res://art/hero/body.tres', origin: (sidecar('hero/body.json') || {}).origin || [26, 49], tint: '#e7c9a0' } };
function enemyRow(id, d, extra = {}) {
  const parts = d.parts || [];
  const movement = parts.find(p => MOVES.includes(p)) || (parts.length ? 'chase' : 'none');
  const attacks = parts.filter(p => p !== movement && ATTACKS.includes(p));
  const support = parts.find(p => p !== movement && !attacks.includes(p)) || '';
  const lk = LOOK_OVERRIDE[id] || lookOf(id, d) || null;
  const fill = BOSS_FILL[id] || {};
  const pool = d.loot && POOLS[d.loot] ? d.loot : null;
  return clean(Object.assign({
    id, display_name: d.name || id, hp: d.hp, speed: d.speed, damage: d.dmg, radius: d.r, height: d.hgt, element: d.el || 'none', damage_type: d.dmgType || 'slash', stagger: d.stagger || 0,
    resists: d.res || {}, tags: d.tags || [], xp: d.xp || 0, dummy: d.ai === 'dummy', movement, attacks, support, part_params: plain(d.params || {}),
    loot: pool || (d.ai === 'dummy' ? '' : 'class_normal'), frames: lk ? lk.frames : '', normal_map: lk && lk.normal_map ? lk.normal_map : '', origin: lk ? lk.origin : undefined,
    scale: d.scale || fill.scale || 1, tint: (lk && lk.tint) || undefined, blood: d.blood,
    todo: [`Behaviour: parts ${JSON.stringify(parts)} run by parts.js (part runtime); the Bestiary lane makes them components.`, d.look && !lk ? `Look: JS draws "${d.look}"; no sheet yet.` : '', !lk ? 'No forge sheet in handoff/art/enemies yet.' : ''].filter(Boolean).join('\n'),
  }, extra));
}
const enemies = [], bosses = [];
for (const id in ENEMY) if (!BOSSES[id] && ENEMY[id].ai !== 'boss') enemies.push(enemyRow(id, ENEMY[id]));
const UNIQ_FOR = key => Object.keys(UNIQUES).find(k => UNIQUES[k].boss === key);
for (const id in BOSSES) {
  const b = BOSSES[id], e = ENEMY[id] || {}, fns = [];
  const d = Object.assign({}, e, b, { parts: [] });
  const moves = Object.keys(b.moveDefs || {}).map(mid => {
    const M = plain(b.moveDefs[mid], fns, mid);
    const row = { id: mid, type: M.type, wind: M.wind, open: M.open, cooldown: M.cd, hit: M.hit || (M.type === 'summon' || M.type === 'roar' || M.type === 'arenaShrink' ? 'none' : 'chip'), damage_pct: M.dmgPct, damage: M.dmg, element: M.el || b.el || 'slash', stagger: M.stagger, range_band: M.range || 'any' };
    const params = Object.assign({}, M); for (const k of ['type', 'wind', 'open', 'cd', 'hit', 'dmgPct', 'dmg', 'el', 'stagger', 'range']) delete params[k];
    row.params = params;
    row.todo = 'Move type "' + M.type + '" runs in bosses.js BOSS_MOVES.' + M.type + ' (wave 2: the Bosses lane).';
    return clean(row);
  });
  const phases = (b.phases || []).map(p => clean({ hp_below: p.hpBelow, moves: p.moves, wind_mul: p.windMul || 1, cooldown_mul: p.cdMul || 1, speed_mul: p.speedMul || 1, forms: plain(p.forms || {}), on_enter: plain(p.onEnter || []) }));
  const uniq = UNIQ_FOR((b.zone || '') + ':' + id) || (b.unique && UNIQUES[b.unique] ? b.unique : null);
  loot.push(clean({ id: 'boss_' + id, base_table: 'class_boss', rarity_weights: RW.boss, item_rolls: 2, item_chance: 1, extra_item_weights: RW.elite, gem_rolls: 2, gem_level_bonus: [4, 0], potion_chance: 1, level_shift: 0.04, unique: uniq ? 'unique_' + uniq : '' }));
  const row = enemyRow(id, Object.assign({}, d, { look: b.look || e.look, sprite: b.sprite || e.sprite, res: b.res || e.res, tags: b.tags || e.tags, xp: b.xp, r: b.r || e.r, hgt: b.hgt || e.hgt, blood: b.blood || e.blood, scale: b.scale }), {
    kind: b.kind || 'mini', level: b.level || 1, zone: b.zone || '', length_target: b.lengthSec || [60, 90], stagger_max: b.staggerMax || 4, bars: !!b.bars, transition: b.transition || 1.5,
    moves, phases, loot: 'boss_' + id, movement: 'chase', attacks: [], support: '',
  });
  row.todo = ['Boss AI: bosses.js (move picker, fairness floors, bars); the Bosses lane ports it.', 'JS loot key: ' + (b.loot || '')].join('\n');
  bosses.push(row);
}

// ---------------------------------------------------------------- statuses and reactions (status.js FX + elements-statuses.md)
const ST = G('STATUS');
const LADDER = {   // docs/design/elements-statuses.md "Status ladders" + "Hero side"
  burning: { duration: 3 }, ablaze: { duration: 4 }, frozen: { duration: 1, boss_duration: 0.25, rule: 'Never twice in 8 s.' }, numb: { duration: 0.5, rule: 'Hero side of Frozen: a 0.5 s root.' },
  shocked: { duration: 2.5 }, poisoned: { duration: 5, max_stacks: 3 }, rooted: { duration: 1.2 }, marked: { max_stacks: 5 }, dazzled: { duration: 1.5 },
  lifted: { duration: 0.8, boss_duration: 0, rule: 'Elite 0.4 s, boss never.' }, gloomed: { rule: '-10% resists.' }, wet: { rule: 'From water; ended by fire or 2 s of wind (Dry).' },
};
const statuses = [];
const reactsWith = sid => Object.keys(ST.REACT).filter(el => ST.REACT[el].includes(sid));
for (const id in ST.FX) {
  const f = ST.FX[id], L = LADDER[id] || {};
  statuses.push(clean({ id, display_name: id[0].toUpperCase() + id.slice(1), element: f.el, tier: f.tier, duration: L.duration || 0, boss_duration: L.boss_duration != null ? L.boss_duration : -1, max_stacks: L.max_stacks || 1,
    hero_variant: id === 'frozen' ? 'numb' : '', reacts_with: reactsWith(id), rule: L.rule || '',
    tint: f.tint, tint_alpha: f.ta, overlay: f.ov || '', overlay_alpha: f.oa || 0, motif_rate: f.rate, socket: f.sock, pose: f.pose || 'none',
    light_color: f.light ? f.light.col : undefined, light_radius: f.light ? f.light.r : 0, light_alpha: f.light ? f.light.a : 0, light_mode: f.light ? f.light.fx : 'none' }));
}
if (!ST.FX.bleeding) statuses.push({ id: 'bleeding', display_name: 'Bleeding', element: 'slash', tier: 1, rule: 'Slash tier 1 (elements-statuses.md); no look in JS yet.', tint: '#ff4a5a', tint_alpha: 0.12 });
const reactions = [   // docs/design/elements-statuses.md "Reactions (eight)"
  { id: 'shatter', display_name: 'Shatter', trigger_elements: ['slash', 'pierce'], on_statuses: ['frozen'], damage_type: 'shatter', effect_text: 'Physical hit on Frozen: an AoE of damage type shatter.' },
  { id: 'wildfire', display_name: 'Wildfire', trigger_elements: ['fire'], on_statuses: ['poisoned'], damage_type: 'fire', effect_text: 'Fire on Poisoned: Burning spreads 2 tiles.', params: { spread: 2 } },
  { id: 'conduct', display_name: 'Conduct', trigger_elements: ['lightning'], on_statuses: ['chilled', 'wet'], damage_type: 'lightning', effect_text: 'Lightning on Chilled or Wet: Shock jumps to nearby Chilled or Wet bodies.' },
  { id: 'overload', display_name: 'Overload', trigger_elements: ['arcane'], on_statuses: ['shocked'], damage_type: 'arcane', effect_text: 'Arcane on Shocked: extra damage and a cooldown cut.' },
  { id: 'purify', display_name: 'Purify', trigger_elements: ['holy'], on_statuses: ['burning', 'ablaze', 'poisoned'], damage_type: 'holy', effect_text: 'Holy on Burning or Poisoned: heals; strong against gloom.' },
  { id: 'rupture', display_name: 'Rupture', trigger_elements: ['pierce'], on_statuses: [], needs_stagger: -1, damage_type: 'pierce', effect_text: 'Pierce on a full stagger bar: a guaranteed crit.' },
  { id: 'detonate', display_name: 'Detonate', trigger_elements: [], on_statuses: ['burning', 'ablaze'], needs_stagger: 3, damage_type: 'fire', effect_text: 'Stagger 3 or more on a Burning body: consumes the Burn for damage.' },
  { id: 'drift', display_name: 'Drift', trigger_elements: ['wind'], on_statuses: ['burning', 'chilled', 'jolted', 'poisoned', 'marked', 'smitten', 'pierced', 'dread'], damage_type: '', effect_text: 'Wind on a body with a tier-1 status: carries the status to bodies in the gust.' },
].map(r => Object.assign({ todo: 'No JS implementation (design only, elements-statuses.md); the Status lane builds it.' }, r));
const status_rules = [{ id: 'status_rules' }];   // the StatusRules defaults are the doc numbers (status_rules.gd)

// ---------------------------------------------------------------- sfx
const SFX = G('SFX_RECIPES'), CAP = G('SFX_CAPTIONS');
const sfx = Object.keys(SFX).map(id => clean({ id, priority: SFX[id].prio, bus: SFX[id].bus || 'sfx', pitch_vary: SFX[id].vary || 0, caption: CAP[id] || '', recipe: plain({ layers: SFX[id].layers }) }));

// ---------------------------------------------------------------- FX presets (seed defaults; not data in JS: render.js drew them)
const fx = [
  { id: 'hit_flash', display_name: 'Hit flash', layers: [{ type: 'tint', color: '#ffffff', strength: 0.85, life: 0.09, fade: true }] },
  { id: 'hit_light', display_name: 'Light hit', layers: [{ type: 'tint', color: '#ffffff', strength: 0.85, life: 0.09, fade: true }, { type: 'shake', amplitude: 1, frequency: 30, life: 0.08 }, { type: 'hitstop', life: 0.03 }] },
  { id: 'hit_heavy', display_name: 'Heavy hit', layers: [{ type: 'tint', color: '#fff2b0', strength: 0.9, life: 0.12, fade: true }, { type: 'shake', amplitude: 3, frequency: 28, life: 0.15 }, { type: 'hitstop', life: 0.06 }] },
  { id: 'death_fade', display_name: 'Death fade', layers: [{ type: 'tint', color: '#2a1c38', strength: 0.7, life: 0.4, fade: false }] },
];

// ---------------------------------------------------------------- pairings (docs/design/loadout.md "Pairings"), hero, rules
const MELEE1 = ['sword', 'rapier', 'mace', 'daggers', 'claws', 'fans'];
const pairings = [{ id: 'pairings', rules: [
  { offhand: MELEE1, hand: MELEE1, note: 'Melee 1H: any melee 1H (dual wield)' },
  { offhand: ['wand', 'orb', 'chakram'], hand: ['wand', 'orb', 'chakram'], note: 'Caster 1H and Chakram: Wand, Orb, Chakram' },
  { offhand: ['buckler'], hand: MELEE1.concat('chakram'), note: 'Buckler: any melee 1H, Chakram' },
  { offhand: ['heater'], hand: ['sword', 'mace', 'chakram'], note: 'Heater: Sword, Mace, Chakram' },
  { offhand: ['tower'], hand: ['sword', 'mace'], note: 'Tower: Sword, Mace' },
  { offhand: ['grimoire'], hand: ['staff', 'wand', 'orb', 'sword'], note: 'Grimoire: Staff, Wand, Orb, Sword (Spellblade)' },
  { offhand: ['quiver'], hand: ['bow', 'crossbow'], note: 'Quiver: Bow, Crossbow only' },
  { offhand: ['warhorn'], hand: ['axe', 'hammer', 'halberd', 'sword', 'mace'], note: 'Warhorn: Axe, Hammer, Halberd, Sword, Mace' },
] }];
const T = G('G.tune.player');
const hero = [{ id: 'hero', display_name: 'Karea', hp: T.hp, mp: T.mp, stamina: T.stamina, speed: T.speed, vertical_speed_bonus: 0.3, radius: 0.4, height: 2.0, dodge: 'roll',
  body_sheet: 'res://art/hero/body.json', hair_sheet: 'res://art/hero/hair.json', camera_zoom: 1, camera_smoothing: 8 }];
const game_rules = [{ id: 'game_rules', default_hit_fx: 'hit_light', default_death_fx: 'death_fade' }];

// ---------------------------------------------------------------- write
const counts = {
  items: write('items', items), skills: write('skills', skills), effects: write('effects', effects), grips: write('grips', grips), affixes: write('affixes', affixes), gems: write('gems', gems),
  loot: write('loot', loot), enemies: write('enemies', enemies), bosses: write('bosses', bosses), statuses: write('statuses', statuses), reactions: write('reactions', reactions),
  sfx: write('sfx', sfx), fx: write('fx', fx), pairings: write('pairings', pairings), hero: write('hero', hero), game_rules: write('game_rules', game_rules), status_rules: write('status_rules', status_rules),
};
const blocks = skills.reduce((a, s) => a + (s.blocks || []).length, 0), noBlock = skills.filter(s => !(s.blocks || []).length).length;
console.log('seed JSON -> godot/data/seed/:', Object.entries(counts).map(([k, v]) => k + ' ' + v).join(', '));
console.log(`skills: ${blocks} action blocks; ${noBlock} skills with no starter block (todo); "Aerin" -> "Karea": ${renamed} strings`);
if (!process.argv.includes('--no-godot')) {
  const a = runGodot('import', ['--import']);
  const b = runGodot('seed', ['--script', 'res://addons/seed_import/seed_import_cli.gd'].concat(process.argv.includes('--force') ? ['--', '--force'] : []));
  const m = b.out.match(/seed_import: (.*)/); if (m) console.log('   ' + m[1]);
  const c = runGodot('reimport', ['--import']);
  process.exitCode = a.errs + b.errs + c.errs ? 1 : 0;
}
