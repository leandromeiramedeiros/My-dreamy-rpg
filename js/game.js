'use strict';
// ---------------------------------------------------------------------------
// Game state, player, combat helpers, the enemy runtime shell, triggers, audio.
// Enemies are data: the table ENEMY, behaviour parts and elite mods live in js/parts.js, bosses and BOSS_MOVES in
// js/bosses.js (both load before this file). This file owns spawnEnemy / damageEnemy / killEnemy / updateEnemies and
// the trigger actions (header of the triggers section lists them).
// ---------------------------------------------------------------------------
const G = {
  t: 0, map: null, maps: {}, player: null,
  enemies: [], projs: [], effects: [], zones: [], parts: [], texts: [], delays: [],
  shakeA: 0, hitstopT: 0, state: 'title', cam: { x: 0, y: 0 },
  mouse: { x: RW / 2, y: RH / 2, dx: DW / 2, dy: DH / 2, wx: 0, wy: 0, down: false },
  keys: {}, ui: { open: false, help: false }, banner: null, msg: null, kills: {}, pendingSpawns: 0, objective: '',
  arena: null, fade: 0, fadeDir: 0, fadeTo: null, boss: null, muted: false, drops: [],
  prog: { chests: {}, firsts: {}, trig: {} }, checkpoint: null,
  seen: {},   // bestiary hooks: seen[type] = { kills, res: { el: tier } } — set on first sight, saved
  prompt: null,   // nearest interactable { kind: chest|shrine|tablet, obj, text } (items.js updateLoot); Interact acts on it
  stats: { playtime: 0, deaths: 0 },
  saveSlot: typeof LAST_SLOT !== 'undefined' ? LAST_SLOT : 1,   // 1..SAVE_SLOTS (items.js)

};

// ===== audio (tiny synth) ======================================================
let AC = null;
function initAudio() { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
function tone(f0, f1, dur, type = 'sine', vol = 0.08, noise = false, at = 0) {
  if (!AC || G.muted) return;
  vol *= typeof sfxVol === 'function' ? sfxVol() : 1; if (vol <= 0) return;
  const t = AC.currentTime + at, g = AC.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let src;
  if (noise) {
    const b = AC.createBuffer(1, Math.floor(AC.sampleRate * dur), AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src = AC.createBufferSource(); src.buffer = b;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    src.connect(f); f.connect(g);
  } else {
    src = AC.createOscillator(); src.type = type; src.frequency.setValueAtTime(f0, t); src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    src.connect(g);
  }
  g.connect(AC.destination); src.start(t); src.stop(t + dur);
}
function sfx(k) {
  switch (k) {
    case 'swing': tone(1800, 500, 0.12, 0, 0.05, true); break;
    case 'slash': tone(2400, 400, 0.18, 0, 0.07, true); break;
    case 'heavy': tone(900, 80, 0.3, 0, 0.12, true); tone(140, 50, 0.3, 'square', 0.05); break;
    case 'dash': tone(600, 2400, 0.18, 0, 0.06, true); break;
    case 'boom': tone(300, 40, 0.6, 0, 0.18, true); tone(90, 30, 0.5, 'sine', 0.15); break;
    case 'fire': tone(500, 1500, 0.25, 0, 0.07, true); break;
    case 'frost': tone(2600, 1800, 0.25, 'triangle', 0.04); break;
    case 'arcane': tone(500, 1100, 0.25, 'triangle', 0.05); tone(750, 1650, 0.25, 'sine', 0.03); break;
    case 'bow': tone(300, 900, 0.1, 'triangle', 0.05); break;
    case 'zap': tone(3000, 300, 0.25, 'sawtooth', 0.03); break;
    case 'heal': tone(520, 1040, 0.4, 'sine', 0.05); tone(780, 1560, 0.4, 'sine', 0.03); break;
    case 'hit': tone(220, 90, 0.08, 'square', 0.04); break;
    case 'hurt': tone(160, 60, 0.2, 'sawtooth', 0.07); break;
    case 'shout': tone(180, 90, 0.4, 'sawtooth', 0.06); break;
    case 'shield': tone(400, 600, 0.3, 'triangle', 0.06); break;
    case 'blink': tone(2000, 400, 0.15, 'sine', 0.05); break;
    case 'trap': tone(800, 200, 0.1, 'square', 0.04); break;
    case 'beam': tone(200, 1200, 0.5, 'sawtooth', 0.04); break;
    case 'veil': tone(300, 150, 0.8, 'sine', 0.07); tone(450, 225, 0.8, 'sine', 0.04); break;
    case 'wave': tone(400, 1600, 0.3, 'triangle', 0.05); break;
    case 'portal': tone(200, 800, 1.2, 'sine', 0.08); tone(300, 1200, 1.2, 'triangle', 0.04); break;
    case 'die': tone(400, 60, 0.4, 0, 0.08, true); break;
    case 'roar': tone(120, 40, 1.0, 'sawtooth', 0.1); tone(400, 80, 1.0, 0, 0.08, true); break;
    case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.32, 'triangle', 0.06, false, i * 0.09)); tone(1568, 2093, 0.6, 'sine', 0.03, false, 0.36); break;
    case 'pickup': tone(880, 1320, 0.09, 'sine', 0.04); break;
    case 'loot': tone(660, 1320, 0.25, 'triangle', 0.05); tone(990, 1980, 0.3, 'sine', 0.03, false, 0.06); break;
    case 'chest': tone(180, 420, 0.22, 'square', 0.04); tone(2000, 600, 0.2, 0, 0.04, true); break;
    default: if (/^drop\d$/.test(k)) {   // drop chime: one more, higher note per rarity step
      const n = +k[4];
      for (let i = 0; i < n; i++) tone(660 * Math.pow(1.26, i), 660 * Math.pow(1.26, i) * 1.01, 0.22 + n * 0.04, 'triangle', 0.035 + n * 0.006, false, i * 0.07);
      if (n >= 3) tone(2640, 3520, 0.5, 'sine', 0.02, false, n * 0.07);
    }
  }
}

// ===== generic helpers ==========================================================
// CAST = the skill being resolved ({ skill, el }); delays/projectiles/zones/dashes capture it so gem
// amplification and skill damage still apply when the hit lands later. Basic attacks run with CAST = null.
let CAST = null;
function withCast(c, fn) { const o = CAST; CAST = c; try { fn(); } finally { CAST = o; } }
const delay = (t, fn) => G.delays.push({ t, fn, c: CAST });
const shake = a => { G.shakeA = Math.max(G.shakeA, a * (typeof shakeMul === 'function' ? shakeMul() : 1)); };
const hitstop = t => { if (typeof hitstopOn !== 'function' || hitstopOn()) G.hitstopT = Math.max(G.hitstopT, t); };
const fx = o => { o.t = 0; G.effects.push(o); return o; };
const zone = o => { o.t = 0; o.tickT = 0; o.cast = CAST; G.zones.push(o); return o; };
// ===== particles: pooled, hard cap PART.cap (DESIGN §0 / §16.6.5) ===========================================
// Combat bursts go through burst(); ambient motes (petals, mist, sparkles…) through addPart(o) and are the first
// to go: they are skipped by budget and when the pool is full, while a full pool evicts ambient motes for combat.
// PART.budget (0.35..1) scales with measured frame time (main.js), so a struggling device sheds particles first.
const PART = { cap: 600, budget: 1, pool: [], amb: 0 };
function addPart(o, amb = true) {
  const L = G.parts;
  if (amb) { if (L.length >= PART.cap * 0.75 || Math.random() > PART.budget) return null; }
  else if (L.length >= PART.cap) {   // evict the oldest ambient mote, else drop this one
    const i = L.findIndex(q => q.amb); if (i < 0) return null;
    PART.pool.push(L[i]); L[i] = L[L.length - 1]; L.pop();
  }
  const q = PART.pool.pop() || {};
  q.petal = q.mist = false;
  Object.assign(q, o); q.amb = amb; q.t = q.t || 0;
  L.push(q); return q;
}
// in-place update + compaction (no per-frame array garbage); dead particles return to the pool
function updateParts(rdt, m) {
  const L = G.parts; let j = 0;
  for (let i = 0; i < L.length; i++) {
    const q = L[i];
    q.t += rdt; q.x += q.vx * rdt; q.y += q.vy * rdt; q.vz -= q.grav * rdt; q.z += q.vz * rdt;
    if (q.z < 0 && !q.petal) { q.z = 0; q.vz *= -0.3; q.vx *= 0.6; q.vy *= 0.6; }
    if (q.petal) { q.x += Math.sin(G.t * 2 + q.y) * rdt * 0.3; if (q.z < tileH(m, q.x, q.y)) { q.vz = 0; q.vx = 0; q.vy = 0; } }
    if (q.t < q.life) L[j++] = q; else if (PART.pool.length < 800) PART.pool.push(q);
  }
  L.length = Math.min(j, PART.cap);
}
const BURST_O = {};
function burst(x, y, z, n, cols, spd = 3, o = BURST_O) {
  n = Math.ceil(n * PART.budget);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * spd;
    const q = addPart({ x, y, z: z + Math.random() * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 2 + Math.random() * 4, life: 0.4 + Math.random() * 0.6, t: 0, col: pick2(cols), grav: 9, size: Math.random() < 0.3 ? 2 : 1, glow: true }, false);
    if (!q) break;
    if (o !== BURST_O) Object.assign(q, o);
  }
}
const pick2 = arr => arr[(Math.random() * arr.length) | 0];
function text(x, y, z, s, col, big = false, life = 0.9) { const t = { x, y, z, s, col, big, t: 0, life, vx: frand(-0.6, 0.6) }; G.texts.push(t); return t; }
// damage numbers respect the settings toggle (reveals like WEAK: FIRE always show)
// o = { e: enemy, kind: 'crit'|'weak'|'resist'|'normal', v: raw damage }: the HUD styles by kind; hits on the same enemy
// within 80 ms merge into one number (HUD.md)
function dmgText(x, y, z, s, col, big, o) {
  if (typeof damageNumbersOn === 'function' && !damageNumbersOn()) return;
  if (o && o.e) {
    const prev = o.e.lastDmgText;
    if (prev && G.texts.includes(prev) && prev.t < 0.08 && prev.kind !== 'weak' === (o.kind !== 'weak')) {
      prev.sum += o.v; prev.s = String(Math.round(prev.sum)) + (prev.kind === 'crit' || o.kind === 'crit' ? '!' : '');
      if (o.kind === 'crit') { prev.kind = 'crit'; prev.col = col; }
      prev.t = Math.min(prev.t, 0.03); return;
    }
  }
  const t = text(x, y, z, s, col, big);
  if (o) { t.kind = o.kind; t.sum = o.v || 0; if (o.e) o.e.lastDmgText = t; }
}

// ===== player ==================================================================
function makePlayer() {
  const p = {
    x: 0, y: 0, z: 0, r: 0.28, aim: 0, face: 1, back: false, walkT: 0, moving: false,
    gear: { weapon: 'dawnblade', head: 'knighthelm', chest: 'knightplate', boots: 'knightgreaves' },   // family ids, derived from p.equip
    equip: {}, bag: [], dust: 0, potions: 3, xp: 0, cdm: {},
    wsk: { dawnblade: { q: 'sunslash', e: 'dashstrike', r: 'judgement' }, starfall: { q: 'firebolt', e: 'barrage', r: 'meteor' }, moonbow: { q: 'multishot', e: 'tumble', r: 'arrowrain' } },
    csk: ['secondwind', 'chain', 'shootingstar'],
    cds: {}, buffs: {}, atkT: 0, combo: 0, swing: null, dash: null, invulnT: 0, hurtT: 0, rootT: 0, slowT: 0, castT: 0, spin: 0,
    name: 'Aerin', level: 1, dead: false,
    ult: 0,          // ultimate charge 0..100 (§15.3), not saved
    ranks: {},       // skill id -> { hits } (casts that hit; rank = 1 + hits / RANK_HITS, max 5), saved
    mods: {},        // skill id -> { 3: modId, 5: modId } chosen SKILL_MODS, saved
    cast: null,      // the skill cast in progress { c, id, slot, age, dur, mp } (dodge-cancel window)
    dodgeBuf: 0, autoAtk: false, stMax: {},
  };
  starterKit(p);
  recalcStats(p, true);
  return p;
}
// The stats seam (§3 balance rule): every gear/affix/gem bonus is summed per stat, then applied once.
// Base damage = tuning x level x (equipped weapon damage / its family's reference damage), so the basic
// attack AND every skill scale with the weapon; p.bonus is the single additive damage % sum.
function recalcStats(p, full) {
  const s = { hp: 0, mp: 0, def: 0, power: 0, crit: 0, haste: 0, regen: 0, mpRegen: 0, speed: 0, critDmg: 0, cdr: 0, skillDmg: 0, dmg: 0, resAll: 0 };
  for (const slot of SLOTS) { const it = p.equip[slot]; if (!it) continue; p.gear[slot] = familyOf(it.base); const st = statsOf(it); for (const k in st) s[k] = (s[k] || 0) + st[k]; }
  p.res = {}; for (const el of RES_ELS) p.res[el] = clamp((s[resKey(el)] || 0) + s.resAll, -0.5, 0.6);   // §5b: additive, clamped
  p.amp = gemAmp(p);
  p.huntBonus = {};   // bestiary hunt milestones (+5% vs a type, additive into the damage sum) — filled by M-later
  const hpR = full || !p.maxHp ? 1 : p.hp / p.maxHp, mpR = full || !p.maxMp ? 1 : p.mp / p.maxMp;
  const B = G.tune.player, L = p.level - 1, w = item('weapon', p.gear.weapon);
  p.maxHp = Math.round(B.hp * (1 + 0.04 * L) + s.hp); p.maxMp = Math.round(B.mp + s.mp); p.maxSt = B.stamina;
  p.wdmg = s.dmg || w.basic.dmg; p.dmgBase = B.damage * (1 + 0.03 * L) * p.wdmg / w.basic.dmg; p.bonus = s.power;
  p.power = p.dmgBase * (1 + p.bonus);
  p.def = s.def / (1 + s.def);   // additive armour sum -> one diminishing transform (0.2 -> 17%, 0.7 -> 41%, 1.5 -> 60%)
  p.crit = Math.min(0.75, B.crit + s.crit); p.critDmg = 0.8 + s.critDmg; p.haste = Math.min(1, s.haste);
  p.cdr = Math.min(0.4, s.cdr); p.skillDmg = s.skillDmg; p.regen = B.regen + s.regen; p.mpRegen = B.mpRegen + s.mpRegen; p.speed = B.speed + s.speed;
  p.hp = p.maxHp * hpR; p.mp = p.maxMp * mpR; if (full) p.st = p.maxSt;
  const key = SLOTS.map(k => p.gear[k]).join();
  if (key !== p.sprKey) { p.sprKey = key; p.spr = buildPlayerSprites(p.equip); }
}
const SLOT_KEYS = ['q', 'e', 'r', 'f', 'c', 'shift', '1', '2', '3'];
function slotSkill(p, slot) {
  if (slot === 'q' || slot === 'e' || slot === 'r') return p.wsk[p.gear.weapon][slot];
  if (slot === 'f') return item('chest', p.gear.chest).skill;
  if (slot === 'c') return item('head', p.gear.head).skill;
  if (slot === 'shift') return item('boots', p.gear.boots).skill;
  return p.csk[+slot - 1] || null;
}
// ===== skill casting: ultimate charge, dodge-cancel, ranks and modifiers (DESIGN §15.2–15.3) ===================
const SLOT_ACTION = { lmb: 'attack', q: 'skillQ', e: 'skillE', r: 'skillR', f: 'skillF', c: 'skillC', shift: 'dodge', 1: 's1', 2: 's2', 3: 's3', pot: 'potion' };
const CANCEL_AFTER = 0.1;            // dodge cancels a cast only after its first 0.1 s (buffered until then)
const RANK_HITS = 25, RANK_MAX = 5, RANK_BONUS = 0.06;
// Every cast — skills AND basic attacks — carries ONE mutable ctx, created in useSkill / basicAttack and threaded
// (via CAST -> delays, projectiles, zones, dashes) into every hit it produces: damageEnemy reads cast.ctx.
//   ctx = { dmg, r, stun, slow, burn, cd, mp, dur (multipliers), extraProj, count, stagger, element, rank, onHit:[] }
// onHit[] = fn(enemy, dmg, opts) called per hit (the M4 EFFECTS layer hooks here). Single call sites for M4's bus:
// cast = useSkill / basicAttack, dodge = useSkill(slot 'shift'), hit = damageEnemy, kill = killEnemy.
// SKILL_MODS: data only. { id: { id, skill, rank: 3|5, name, desc, apply(ctx) } } — apply() may only change the
// numbers on ctx (dmg r stun slow burn cd mp dur extraProj are multipliers / counts, element a damage type).
// Content arrives later (M4); the slots open at ranks 3 and 5.
const SKILL_MODS = {};
const MOD_NUM_KEYS = ['dmg', 'r', 'stun', 'slow', 'burn', 'cd', 'mp', 'dur', 'extraProj', 'count', 'stagger'];
const newCtx = (element, stagger = 0, rank = 1) => ({ dmg: 1, r: 1, stun: 1, slow: 1, burn: 1, cd: 1, mp: 1, dur: 1, extraProj: 0, count: 1, stagger, element, rank, onHit: [] });
const skillRank = (p, id) => Math.min(RANK_MAX, 1 + Math.floor(((p.ranks[id] && p.ranks[id].hits) || 0) / RANK_HITS));
const skillRankBonus = (p, id) => RANK_BONUS * (skillRank(p, id) - 1);
function skillRankProgress(p, id) {
  const hits = (p.ranks[id] && p.ranks[id].hits) || 0, rank = skillRank(p, id);
  return { rank, hits, max: rank >= RANK_MAX, into: rank >= RANK_MAX ? RANK_HITS : hits - (rank - 1) * RANK_HITS, need: RANK_HITS, frac: rank >= RANK_MAX ? 1 : (hits - (rank - 1) * RANK_HITS) / RANK_HITS, bonus: skillRankBonus(p, id) };
}
const skillModOptions = (id, rank) => Object.values(SKILL_MODS).filter(m => m.skill === id && m.rank === rank);
function skillModSlots(p, id) {
  const r = skillRank(p, id);
  return [3, 5].map(rank => ({ rank, open: r >= rank, chosen: (p.mods[id] && p.mods[id][rank]) || null, options: skillModOptions(id, rank) }));
}
function chooseSkillMod(p, id, rank, modId) {
  const m = modId == null ? null : SKILL_MODS[modId];
  if (modId != null && (!m || m.skill !== id || m.rank !== rank || skillRank(p, id) < rank)) return false;
  const o = p.mods[id] || (p.mods[id] = {});
  if (m) o[rank] = modId; else delete o[rank];
  return true;
}
// numbers-only cast context: rank bonus lives in damageEnemy's additive sum; mods multiply these
function skillCtx(p, id, s) {
  const ctx = newCtx(s.element, s.stagger || 0, skillRank(p, id));
  const ch = p.mods[id] || {};
  for (const rank of [3, 5]) {
    const m = SKILL_MODS[ch[rank]]; if (!m || m.skill !== id || ctx.rank < rank || typeof m.apply !== 'function') continue;
    const before = Object.assign({}, ctx);
    try { m.apply(ctx); } catch (e) { Object.assign(ctx, before); }
    for (const k of MOD_NUM_KEYS) if (typeof ctx[k] !== 'number' || !isFinite(ctx[k])) ctx[k] = before[k];
    if (typeof ctx.element !== 'string' || !EL_COL[ctx.element]) ctx.element = before.element;
    ctx.rank = before.rank;
    if (!Array.isArray(ctx.onHit)) ctx.onHit = before.onHit;
  }
  return ctx;
}
const castR = () => (CAST && CAST.ctx ? CAST.ctx.r : 1);
function addSkillHit(p, id) {
  const r = p.ranks[id] || (p.ranks[id] = { hits: 0 }), before = skillRank(p, id);
  if (before >= RANK_MAX) return;
  r.hits++;
  const after = skillRank(p, id);
  if (after > before) {
    const sk = SKILLS[id], msg = `${sk.name} — Rank ${after}${after === 3 || after === 5 ? ', modifier slot open' : ''}`;
    say(msg); sfx('levelup');
    if (typeof UI !== 'undefined') UI.toast({ text: msg, icon: typeof skillIcon === 'function' ? skillIcon(id) : null, col: '#ffd35a' });
  }
}
// ultimate charge: fed by the pre-multiplier damage of every hit (level-independent), reactions x2 (M4)
// §20.5: a single hit adds at most 5 % charge, a reaction hit at most 10 %
const ultGain = (p, base, reaction) => Math.min(reaction ? 10 : 5, base * G.tune.player.ultRate * (reaction ? 2 : 1) * (1 + ultChargeBonus(p)));
// §20.5 MP builder: per weapon family, basic attacks only, ONCE per swing (not per target), hard cap 40 MP/s from
// hits over a rolling 1 s window. Values ~ swing time so every family builds ~15-23 MP/s on basics
// (sword 8 / 0.42 s, staff 9 / 0.48 s, bow 7 / 0.36 s, daggers 6 / 0.28 s, two-hander 14 / 0.62 s).
const MP_ON_HIT = { sword: 8, staff: 9, bow: 7, daggers: 6, dagger: 6, twohander: 14 };
const MP_HIT_CAP = 40;
function basicMpGain(p, c) {
  if (c && c.basic) { if (c.mpDone) return; c.mpDone = true; }
  const w = item('weapon', p.gear.weapon), gain = MP_ON_HIT[w && w.kind] != null ? MP_ON_HIT[w.kind] : G.tune.player.mpOnHit;
  const L = p.mpHits || (p.mpHits = []), t = G.t;
  while (L.length && t - L[0][0] >= 1) L.shift();
  const used = L.reduce((a, q) => a + q[1], 0), add = Math.max(0, Math.min(gain, MP_HIT_CAP - used));
  if (add <= 0) return;
  L.push([t, add]); p.mp = Math.min(p.maxMp, p.mp + add);
}
const castActive = p => !!(p.cast && p.cast.age < p.cast.dur);
// dodge cancels the cast in progress: drops its pending delays and its dash, refunds 50 % of its MP
function cancelCast(p) {
  const c = p.cast; if (!c) return false;
  G.delays = G.delays.filter(d => d.c !== c.c);
  if (p.dash && p.dash.cast === c.c) p.dash = null;
  p.castT = 0; p.swing = null; p.spin = 0;
  p.mp = Math.min(p.maxMp, p.mp + c.mp * 0.5);
  p.cast = null;
  G.cancelled = { id: c.id, t: G.t };
  return true;
}
function useSkill(p, slot) {
  const id = slotSkill(p, slot); if (!id || p.dead) return false;
  const s = SKILLS[id], ult = slot === 'r', dodge = slot === 'shift';
  if ((p.cds[id] || 0) > 0 || p.rootT > 0) return false;
  if ((s.st || 0) > p.st) { say('Not enough stamina'); return false; }
  if (dodge && castActive(p)) {
    if (p.cast.age < CANCEL_AFTER) { p.dodgeBuf = CANCEL_AFTER - p.cast.age + 0.02; return false; }   // buffered
    cancelCast(p);
  }
  if (p.dash) return false;
  if (ult && p.ult < 100) { if (!G.ultWarnT || G.t > G.ultWarnT) { say('Ultimate is still charging'); G.ultWarnT = G.t + 1.2; } return false; }
  const ctx = skillCtx(p, id, s), mp = Math.round((s.mp || 0) * ctx.mp);
  if (mp > p.mp) { say('Not enough mana'); return false; }
  p.mp -= mp; p.st -= s.st || 0;
  // ultimates use the charge bar instead of a cooldown (a short lockout stops double-casts)
  if (ult) { p.ult = 0; p.cds[id] = p.cdm[id] = 0.5; }
  else p.cds[id] = p.cdm[id] = s.cd * ctx.cd * (1 - Math.min(0.4, p.cdr));
  if (p.swing && p.atkT > 0) p.swing = null;   // attacks cancel into skills
  const c = { skill: id, el: ctx.element, slot, ctx, hit: false };
  const n0 = G.delays.length;
  withCast(c, () => s.cast(p, p.aim, G.mouse.wx, G.mouse.wy));
  if (id === 'orbit') p.orbitCast = c;
  let dur = Math.max(0, p.castT, p.swing ? p.swing.dur - p.swing.t : 0);
  for (let i = n0; i < G.delays.length; i++) if (G.delays[i].c === c) dur = Math.max(dur, G.delays[i].t);
  if (p.dash && p.dash.cast === c) dur = Math.max(dur, p.dash.t);
  p.cast = dodge ? null : { c, id, slot, age: 0, dur: Math.min(1.5, dur), mp };
  G.lastCast = { slot, t: 0.25 };
  if (!dodge && typeof aimFlash === 'function') aimFlash(id, slot);   // quick-cast: 1-frame flash of the shape at the target
  return true;
}
function say(s) { G.msg = { s, t: 1.6 }; }
// temporary buffs stay multiplicative but cap at 1.6x (bless x surge x focus was 2.37x)
const buffMul = p => Math.min(1.6, (p.buffs.bless ? 1.4 : 1) * (p.buffs.surge ? 1.3 : 1) * (p.buffs.focus ? 1.3 : 1));
function addBuff(p, id, t) { p.buffs[id] = { t, max: t }; }
function healPlayer(p, n) { p.hp = Math.min(p.maxHp, p.hp + n); text(p.x, p.y, p.z + 3, '+' + Math.round(n), '#8fffa8'); }
function swingWeapon(p, dur, arc, dir) { p.swing = { t: 0, dur, arc, dir: dir || (Math.random() < 0.5 ? 1 : -1) }; }
function castAnim(p, t = 0.25) { p.castT = t; }

function basicAttack(p) {
  if (p.atkT > 0 || p.dash || p.dead || p.rootT > 0 || castActive(p)) return;   // skills never cancel into attacks
  const w = item('weapon', p.gear.weapon);
  // basic attacks are casts too (skill: null, basic: true) so their hits carry a ctx; they build MP on hit
  withCast({ skill: null, basic: true, el: w.element || 'slash', slot: 'lmb', ctx: newCtx(w.element || 'slash') }, () => basicSwing(p, w));
}
function basicSwing(p, w) {
  const a = p.aim;
  p.atkT = w.basic.rate / (1 + p.haste);
  if (w.kind === 'sword') {
    p.combo = (p.combo + 1) % 3;
    const big = p.combo === 2;
    swingWeapon(p, 0.17, big ? 2.6 : 1.9, p.combo % 2 ? -1 : 1);
    hitCone(p.x, p.y, a, big ? 2.2 : 1.8, big ? 1.75 : 1.5, w.basic.dmg * (big ? 1.6 : 1), { knock: big ? 0.5 : 0.15 });
    fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: big ? 2.3 : 1.8, r: big ? 1.75 : 1.5, col: big ? '#fff2b0' : '#ffe6a0', life: 0.18, w: big ? 4 : 3, dir: p.combo % 2 ? -1 : 1 });
    sfx('swing');
  } else if (w.kind === 'staff') {
    castAnim(p, 0.18);
    spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a, speed: 10, r: 0.3, dmg: w.basic.dmg, life: 0.9, kind: 'arcane', col: '#9fe8ff' });
    sfx('arcane');
  } else {
    castAnim(p, 0.15);
    spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 16, r: 0.25, dmg: w.basic.dmg, life: 0.65, kind: 'arrow', col: '#e7eeff' });
    sfx('bow');
  }
}

function dashPlayer(p, dx, dy, distance, dur, opt = {}) {
  const l = Math.hypot(dx, dy) || 1;
  p.dash = { vx: dx / l * distance / dur, vy: dy / l * distance / dur, t: dur, opt, hit: new Set(), ghostT: 0, cast: CAST };
}
function blinkPlayer(p, a, d) {
  const ox = p.x, oy = p.y;
  let bx = p.x, by = p.y, h = tileH(G.map, p.x, p.y);
  for (let s = 0.1; s <= d; s += 0.1) {
    const nx = ox + Math.cos(a) * s, ny = oy + Math.sin(a) * s;
    if (!walkable(G.map, nx, ny, h)) break;
    h = tileH(G.map, nx, ny); bx = nx; by = ny;
  }
  fx({ type: 'ghost', x: ox, y: oy, z: p.z, life: 0.35, spr: currentPlayerSprite(p) });
  burst(ox, oy, p.z + 1, 16, ['#ffffff', '#ffe6c0', '#c7a8ff'], 2);
  p.x = bx; p.y = by; p.invulnT = 0.25;
  burst(bx, by, p.z + 1, 16, ['#ffffff', '#ffe6c0', '#c7a8ff'], 2);
}
function chainLightning(p, tx, ty) {
  let cur = nearestEnemy(tx, ty, 3, null) || nearestEnemy(p.x, p.y, 7, null);
  const pts = [[p.x, p.y, p.z + 1.6]], hit = new Set();
  if (!cur) { const [ax, ay] = targetIn(p, tx, ty, 5); pts.push([ax, ay, 0.3]); fx({ type: 'lightning', pts, life: 0.25, col: '#bff0ff' }); return; }
  for (let k = 0; k < 6 + chainBonus(p) && cur; k++) {   // topaz: +1 jump per 2 grades
    hit.add(cur); pts.push([cur.x, cur.y, cur.z + 1]);
    const tgt = cur;
    delay(k * 0.05, () => damageEnemy(tgt, 95, { stun: 0.2 }));
    cur = nearestEnemy(cur.x, cur.y, 3.8, hit);
  }
  fx({ type: 'lightning', pts, life: 0.3, col: '#bff0ff' });
}
function nearestEnemy(x, y, maxd, exclude) {
  let best = null, bd = maxd;
  for (const e of G.enemies) {
    if (e.dead || e.spawnT > 0 || e.under || (exclude && exclude.has(e))) continue;
    const d = dist(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function currentPlayerSprite(p) {
  const f = p.moving ? (Math.floor(p.walkT * 8) % 4) : 0;
  const set = p.back ? (p.face < 0 ? p.spr.backF : p.spr.back) : (p.face < 0 ? p.spr.frontF : p.spr.front);
  return set[f];
}

// movement with tile + collider collision
function moveEntity(o, dx, dy, h0) {
  const m = G.map, r = o.r * 0.8;
  const ok = (x, y) => walkable(m, x + r, y, h0) && walkable(m, x - r, y, h0) && walkable(m, x, y + r, h0) && walkable(m, x, y - r, h0);
  if (ok(o.x + dx, o.y)) o.x += dx;
  if (ok(o.x, o.y + dy)) o.y += dy;
  for (const c of m.colliders) {
    if (Math.abs(c.z - (o.z || 0)) > 1.5) continue;
    const d = dist(o.x, o.y, c.x, c.y), min = c.r + o.r;
    if (d < min && d > 0.0001) {
      const nx = c.x + (o.x - c.x) / d * min, ny = c.y + (o.y - c.y) / d * min;
      if (ok(nx, ny)) { o.x = nx; o.y = ny; }
    }
  }
}

function updatePlayer(p, dt) {
  const m = G.map;
  for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
  for (const k in p.buffs) { p.buffs[k].t -= dt; if (p.buffs[k].t <= 0) delete p.buffs[k]; }
  p.atkT -= dt; p.invulnT -= dt; p.hurtT -= dt; p.castT -= dt; p.rootT -= dt; p.slowT -= dt; p.spin -= dt; if (p.dreadT > 0) p.dreadT -= dt;
  if (p.dead) return;
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt + (p.buffs.mend ? p.maxHp * 0.25 / 4 * dt * healMul(p) : 0));
  p.mp = Math.min(p.maxMp, p.mp + p.mpRegen * dt);
  p.st = Math.min(p.maxSt, p.st + 22 * dt);
  if (p.swing) { p.swing.t += dt; if (p.swing.t > p.swing.dur) p.swing = null; }
  if (p.cast) { p.cast.age += dt; if (p.cast.age >= p.cast.dur) p.cast = null; }
  for (const k of ['slowT', 'rootT']) { if (p[k] > 0) { if (!(p.stMax[k] > 0) || p[k] > p.stMax[k]) p.stMax[k] = p[k]; } else p.stMax[k] = 0; }

  resolveAim(p);

  const h0 = tileH(m, p.x, p.y);
  if (p.dash) {
    const d = p.dash; d.t -= dt; d.ghostT -= dt;
    moveEntity(p, d.vx * dt, d.vy * dt, h0);
    if (d.opt.trail && d.ghostT <= 0) { d.ghostT = 0.03; fx({ type: 'ghost', x: p.x, y: p.y, z: p.z, life: 0.25, spr: currentPlayerSprite(p), col: d.opt.trail }); }
    if (d.opt.roll && d.ghostT <= 0) { d.ghostT = 0.04; burst(p.x, p.y, p.z, 2, ['#e7e0ff'], 1, { glow: false }); }
    if (d.opt.hit) for (const e of G.enemies) {
      if (e.dead || d.hit.has(e) || e.spawnT > 0) continue;
      if (dist(p.x, p.y, e.x, e.y) < d.opt.hit.r + e.r) { d.hit.add(e); damageEnemy(e, d.opt.hit.dmg, { knock: d.opt.hit.knock, cast: d.cast }); }
    }
    if (d.t <= 0) { p.dash = null; if (d.opt.onEnd) withCast(d.cast, d.opt.onEnd); }
  } else {
    const mv = typeof IN !== 'undefined' ? IN.move : { x: 0, y: 0, mag: 0 };
    let sx = mv.x, sy = mv.y;
    const mag = mv.mag;
    p.moving = (sx || sy) && p.rootT <= 0 && !G.ui.open;
    if (p.moving) {
      let wx = sx + sy, wy = sy - sx;
      const l = Math.hypot(wx, wy); wx /= l; wy /= l;
      const sp = mag * p.speed * (p.buffs.sprint ? 1.8 : 1) * (p.buffs.veil ? 1.4 : 1) * (p.slowT > 0 ? 0.6 : 1) * (p.castT > 0 ? 0.75 : 1) * (1 + 0.3 * Math.abs(sy) / Math.hypot(sx, sy));
      moveEntity(p, wx * sp * dt, wy * sp * dt, h0);
      p.walkT += dt;
      if (Math.random() < dt * 6) addPart({ x: p.x, y: p.y, z: p.z, vx: frand(-0.3, 0.3), vy: frand(-0.3, 0.3), vz: 0.6, life: 0.4, t: 0, col: '#e8e0f8', grav: 1, size: 1, glow: false });
    }
  }
  const th = tileH(m, p.x, p.y);
  p.z = lerp(p.z, th, Math.min(1, dt * 14));
  playerActions(p, dt);

  // orbit orbs
  if (p.buffs.orbit) {
    for (let k = 0; k < 3; k++) {
      const a = G.t * 4 + k * Math.PI * 2 / 3, ox = p.x + Math.cos(a) * 1.4, oy = p.y + Math.sin(a) * 1.4;
      for (const e of G.enemies) {
        if (e.dead || e.spawnT > 0) continue;
        e.orbitCd = (e.orbitCd || 0) - dt / 3;
        if (e.orbitCd <= 0 && dist(ox, oy, e.x, e.y) < 0.5 + e.r) { e.orbitCd = 0.4; damageEnemy(e, 30, { knock: 0.1, fx: ox, fy: oy, cast: p.orbitCast || ORBIT_CAST }); }
      }
    }
  }
}

const ORBIT_CAST = { skill: 'orbit', el: 'arcane' };

// ===== HUD getters (read-only views the HUD draws from; docs/HUD.md) =========================================
// ultCharge(p) 0..1 · ultReady(p) · skillSlotState(p, slot) · heroStatuses(p) · interactPrompt() · skillInfo(p, id)
const ultCharge = (p = G.player) => clamp((p.ult || 0) / 100, 0, 1);
const ultReady = (p = G.player) => (p.ult || 0) >= 100;
// slot: 'lmb' q e r f c shift 1 2 3 'pot'
function skillSlotState(p, slot) {
  const action = SLOT_ACTION[slot], glyph = typeof IN !== 'undefined' ? IN.glyph(action) : '';
  if (slot === 'pot') return { slot, action, glyph, potions: p.potions, max: MAX_POTIONS, cd: Math.max(0, (p.potT || 0) - G.t), unavailable: p.dead };
  if (slot === 'lmb') { const w = item('weapon', p.gear.weapon); return { slot, action, glyph, id: null, name: w.basic.name, element: w.element, cd: Math.max(0, p.atkT), cdFrac: 0, unavailable: !!(p.dash || p.rootT > 0 || castActive(p)) }; }
  const id = slotSkill(p, slot), s = id && SKILLS[id];
  if (!s) return { slot, action, glyph, id: null };
  const ult = slot === 'r', cd = Math.max(0, p.cds[id] || 0), max = p.cdm[id] || s.cd;
  const rp = skillRankProgress(p, id);
  return {
    slot, action, glyph, id, name: s.name, element: s.element, color: s.color, ult,
    cd: ult ? 0 : cd, cdMax: max, cdFrac: ult ? 0 : (cd > 0 ? cd / max : 0),
    charge: ult ? ultCharge(p) : null, ready: ult ? ultReady(p) && cd <= 0 : cd <= 0,
    mp: s.mp || 0, st: s.st || 0, mpShort: (s.mp || 0) > p.mp, stShort: (s.st || 0) > p.st,
    unavailable: !!(p.dead || p.rootT > 0 || (p.dash && slot !== 'shift')),
    rank: rp.rank, rankFrac: rp.frac, flash: G.lastCast && G.lastCast.slot === slot ? Math.max(0, G.lastCast.t) : 0,
  };
}
function skillInfo(p, id) { return Object.assign({ id, skill: SKILLS[id], slots: skillModSlots(p, id) }, skillRankProgress(p, id)); }
// hero buff row: debuffs first; frac = remaining time 0..1 (sweep), stacks for digit badges
function heroStatuses(p = G.player) {
  const out = [];
  if (p.slowT > 0) out.push({ id: 'slowed', kind: 'debuff', t: p.slowT, max: p.stMax.slowT || p.slowT, frac: p.slowT / (p.stMax.slowT || p.slowT), stacks: 0 });
  if (p.rootT > 0) out.push({ id: 'rooted', kind: 'debuff', t: p.rootT, max: p.stMax.rootT || p.rootT, frac: p.rootT / (p.stMax.rootT || p.rootT), stacks: 0 });
  for (const id in p.buffs) { const b = p.buffs[id]; out.push({ id, kind: 'buff', t: b.t, max: b.max, frac: b.max ? b.t / b.max : 1, stacks: 0, color: BUFFS[id] && BUFFS[id].color }); }
  if ((p.potT || 0) > G.t) out.push({ id: 'potion', kind: 'cooldown', t: p.potT - G.t, max: 1, frac: (p.potT - G.t) / 1, stacks: 0 });
  return out.slice(0, 10);
}
const interactPrompt = () => G.prompt && G.state === 'play' && !G.ui.open ? Object.assign({ glyph: typeof IN !== 'undefined' ? IN.glyph('interact') : 'SPACE' }, G.prompt) : null;

// ===== aim: mouse cursor, twin-stick (sticky) or auto, with aim assist on stick/touch only (CONTROLS.md) ======
// Writes the canonical aim cursor G.mouse.{wx,wy} (world) + {x,y} (view) that skills, render and HUD read.
function viewDirToWorld(sx, sy) { const [wx, wy] = toWorld(sx, sy), l = Math.hypot(wx, wy) || 1; return [wx / l, wy / l]; }
// auto target: nearest living enemy in range, preferring elites/bosses and the one you hit last
function autoTarget(p, range, dir, cone) {
  let best = null, bs = 1e9;
  for (const e of G.enemies) {
    if (e.dead || e.spawnT > 0 || e.under) continue;
    const d = dist(p.x, p.y, e.x, e.y); if (d > range) continue;
    let s = d / range;
    if (dir) { const da = Math.abs(angDiff(Math.atan2(dir[1], dir[0]), Math.atan2(e.y - p.y, e.x - p.x))); if (da > cone + Math.atan2(e.r, Math.max(d, 0.1))) continue; s += da / Math.max(cone, 0.01); }
    if (e === G.lastHit) s -= 0.35;
    if (e.boss || enemyClassOf(e) === 'elite') s -= 0.2;
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
function resolveAim(p) {
  const A = typeof IN !== 'undefined' ? IN.aim : { mode: 'cursor' };
  G.aimAssisted = false;
  if (G.touch) touchAim(p);
  else if (A.mode === 'cursor') {
    const mwz = toWorld(G.mouse.x - RW / 2 + G.cam.x, G.mouse.y - RH / 2 + G.cam.y + p.z * ZS);
    G.mouse.wx = mwz[0]; G.mouse.wy = mwz[1];
  } else {
    let dir = null, d = 4;
    if (A.mode === 'stick') { dir = viewDirToWorld(A.x, A.y); d = clamp(A.mag * 7, 1.5, 7); }
    const cone = typeof aimAssistCone === 'function' ? aimAssistCone() : 10 * Math.PI / 180;
    const tgt = dir ? (cone > 0 ? autoTarget(p, 9, dir, cone) : null) : autoTarget(p, 8, null, 0);
    if (tgt) { G.mouse.wx = tgt.x; G.mouse.wy = tgt.y; G.aimAssisted = true; }
    else {
      if (!dir && p.moving && IN.move.mag > 0) dir = viewDirToWorld(IN.move.x, IN.move.y);
      if (!dir) dir = [Math.cos(p.aim), Math.sin(p.aim)];
      G.mouse.wx = p.x + dir[0] * d; G.mouse.wy = p.y + dir[1] * d;
    }
    const [vx, vy] = worldToView(G.mouse.wx, G.mouse.wy, p.z);
    G.mouse.x = vx; G.mouse.y = vy;
  }
  const ps = worldToView(p.x, p.y, p.z);
  p.aim = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
  p.face = G.mouse.x >= ps[0] ? 1 : -1;
  p.back = G.mouse.y < ps[1] - 14;
}
// gameplay actions, read once per step after the aim is resolved (keyboard/mouse, pad and touch alike)
const SKILL_ACTIONS = [['skillQ', 'q'], ['skillE', 'e'], ['skillR', 'r'], ['skillF', 'f'], ['skillC', 'c'], ['dodge', 'shift'], ['s1', '1'], ['s2', '2'], ['s3', '3']];
// Hold-to-aim (input.js IN.aimMode): 'off' casts on press (M2a); 'hold' / 'always' cast the skill keys on RELEASE so the
// ground indicator can show while held (IN.aimCasts lists this step's releases). Dodge and potion stay instant.
function playerActions(p, dt) {
  if (typeof IN === 'undefined' || G.ui.open || G.state !== 'play' || G.fadeDir > 0) { if (typeof IN !== 'undefined' && IN.clearAimHold) IN.clearAimHold(); return; }
  if (p.dodgeBuf > 0) { p.dodgeBuf -= dt; if (!castActive(p) || p.cast.age >= CANCEL_AFTER) { p.dodgeBuf = 0; useSkill(p, 'shift'); } }
  const hold = IN.aimMode && IN.aimMode() !== 'off';
  for (const [a, slot] of SKILL_ACTIONS) if (IN.pressed(a) && (!hold || slot === 'shift')) useSkill(p, slot);
  if (hold) for (const a of IN.aimCasts) { const sa = SKILL_ACTIONS.find(q => q[0] === a); if (sa) useSkill(p, sa[1]); }
  if (typeof attackToggle === 'function' && attackToggle()) { if (IN.pressed('attack')) p.autoAtk = !p.autoAtk; } else p.autoAtk = false;
  if (IN.held('attack') || p.autoAtk) basicAttack(p);
  if (IN.pressed('potion')) drinkPotion(p);
  if (IN.pressed('interact')) interact(p);
}
// el = damage type of the hit (§5b); the hero's resist applies on top of defence (arcane ignores half of it)
function hurtPlayer(dmg, srcX, srcY, el = 'slash') {
  const p = G.player;
  if (p.dead || p.invulnT > 0 || (p.dash && p.dash.opt.invuln) || G.state !== 'play') return false;
  const r = (p.res && p.res[el]) || 0;
  let d = dmg * (1 - p.def) * (1 - (el === 'arcane' ? r * 0.5 : r)) * (p.buffs.bulwark ? 0.4 : 1) * frand(0.9, 1.1) * (typeof damageTakenMul === 'function' ? damageTakenMul() : 1);
  p.hp -= d; p.hurtT = 0.25; p.invulnT = 0.2;
  text(p.x, p.y, p.z + 3, Math.round(d), '#ff5a7a');
  shake(4); sfx('hurt');
  burst(p.x, p.y, p.z + 1.2, 8, ['#ff5a7a', '#ffffff'], 2);
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true; G.state = 'dead'; G.deadT = 0; sfx('die'); G.stats.deaths++;
    burst(p.x, p.y, p.z + 1, 40, ['#ffb0e0', '#c7a8ff', '#ffffff'], 3);
  }
  return true;
}

// ===== hit tests ===================================================================
function damageEnemy(e, base, o = {}) {
  if (e.dead || e.spawnT > 0 || e.under) return false;
  const p = G.player, c = o.cast !== undefined ? o.cast : CAST;
  // damage type: explicit > the skill's element > the weapon's (sword slash, staff arcane, bow pierce); burn ticks are fire
  const el = o.el || (o.dot ? 'fire' : c ? c.el : item('weapon', p.gear.weapon).element) || 'slash';
  const sk = c && c.skill ? c.skill : null;   // a skill cast (basic attacks run with c.basic, burn ticks with o.dot)
  // one additive sum: gear damage % (+ skill damage % and the element's gem amplification for skill hits)
  // skill rank (+6 %/rank above 1) joins the same additive sum; modifier ctx.dmg multiplies (numbers only)
  const cx = c && c.ctx;
  let dmg = base * p.dmgBase * (1 + p.bonus + (p.huntBonus[e.type] || 0) + (sk ? p.skillDmg + elementAmp(p, el) + skillRankBonus(p, sk) : 0)) * buffMul(p) * (cx ? cx.dmg : 1) * (p.dreadT > 0 ? 0.85 : 1);
  const res = (e.res && e.res[el]) || 0, eff = el === 'arcane' ? res * 0.5 : res;   // arcane ignores half
  dmg *= Math.max(0, 1 - eff) * (el === 'holy' && e.tags && e.tags.includes('gloom') ? 1.5 : 1);
  const st = o.stagger != null ? o.stagger : cx ? cx.stagger || 0 : sk && SKILLS[sk] ? SKILLS[sk].stagger || 0 : 0;
  if (st) {   // the boss stagger bar (hud.js): fills with heavy hits, BREAK flash when full, then empties
    // per-boss staggerMax (bosses.js) rescales the points so the bar's 0..STAGGER_CAP fraction stays right
    e.stagger = (e.stagger || 0) + st * (e.staggerCap ? STAGGER_CAP / e.staggerCap : 1);
    if (e.boss && e.stagger >= STAGGER_CAP) { e.stagger = 0; e.breakT = G.t; if (typeof bossBreak === 'function') bossBreak(e); }
    else if (!e.boss) partsStagger(e, st);
  }
  if (e.parts && e.parts.length || e.mods) dmg = partsHurt(e, dmg, o);   // shield-front, sleepers waking, elite shields
  let crit = Math.random() < p.crit;
  if (p.buffs.veil && !o.dot) { crit = true; delete p.buffs.veil; }
  if (crit) dmg *= 1 + p.critDmg;
  dmg *= frand(0.9, 1.1);
  if (e.dummy) { e.hp = e.maxHp; }
  else e.hp -= dmg;
  e.flash = 0.1;
  if (!o.dot) G.lastHit = e;
  // §15.3 resource rhythm: basic attacks (CAST null) build 8 MP per hit; all damage but the ultimate's own feeds the charge
  if ((!c || c.basic) && !o.dot) basicMpGain(p, c);
  if (eff < 1 && !(c && c.slot === 'r') && p.ult < 100) p.ult = Math.min(100, p.ult + ultGain(p, base * (1 - eff), o.reaction));
  // skill ranks: a cast counts once, on its first hit on a real enemy (training dummies don't rank skills)
  if (sk && c.slot && !c.hit && !o.dot && !e.dummy) { c.hit = true; addSkillHit(p, sk); }
  if (cx && cx.onHit.length) for (const fn of cx.onHit) fn(e, dmg, o);
  // numbers coloured by damage type; WEAK big + yellow, RESIST grey, IMMUNE spelled out
  if (eff >= 1) text(e.x, e.y, e.z + e.hgt, 'IMMUNE', '#9a92b0');
  else dmgText(e.x, e.y, e.z + e.hgt, Math.round(dmg) + (crit ? '!' : ''), res < 0 ? '#ffe36a' : res > 0 ? '#a7a3b8' : EL_COL[el] || '#ffffff', crit || res < 0,
    { e, v: dmg, kind: res < 0 ? 'weak' : crit ? 'crit' : res > 0 ? 'resist' : 'normal' });
  if (res && !e.dummy) discoverRes(e, el, res);
  const fxx = o.fx != null ? o.fx : p.x, fyy = o.fy != null ? o.fy : p.y;
  if (o.knock && !e.boss && !e.dummy) {
    const d = dist(fxx, fyy, e.x, e.y) || 1;
    const kk = e.knockK != null ? e.knockK : 1;   // swarm members barely budge (parts.js), so a cleave keeps them together
    e.kx += (e.x - fxx) / d * o.knock * 9 * kk; e.ky += (e.y - fyy) / d * o.knock * 9 * kk;
  }
  if (o.stun) e.stunT = Math.max(e.stunT, o.stun * (cx ? cx.stun : 1) * (e.boss ? 0.25 : 1));
  if (o.freeze) e.frozen = o.stun;
  if (o.slow) e.slowT = Math.max(e.slowT, o.slow * 2 * (cx ? cx.slow : 1));
  if (o.burn) { e.burnT = o.burn * (cx ? cx.burn : 1); e.burnTick = 0.5; e.burnCast = c; }
  if (!o.dot) { burst(e.x, e.y, e.z + e.hgt * 0.6, 5, ['#ffffff', e.blood || '#c7a8ff'], 2.5); sfx('hit'); }
  if (e.hp <= 0) killEnemy(e);
  return true;
}
// the first weak/resist hit on an enemy type pops a nameplate; from then on its icons show by its HP bar (saved)
const sighting = type => G.seen[type] || (G.seen[type] = { kills: 0, res: {} });
function discoverRes(e, el, res) {
  const k = sighting(e.type).res;
  if (k[el] != null) return;
  k[el] = res;
  text(e.x, e.y, e.z + e.hgt + 1.2, `${res < 0 ? 'WEAK' : res >= 1 ? 'IMMUNE' : 'RESIST'}: ${el.toUpperCase()}`, res < 0 ? '#ffe36a' : '#c8c0e0', true, 1.5);
}
function hitArea(x, y, r, dmg, o = {}) {
  let n = 0; r *= castR();
  for (const e of G.enemies.slice()) if (!e.dead && dist(x, y, e.x, e.y) < r + e.r) { if (damageEnemy(e, dmg, Object.assign({ fx: x, fy: y }, o))) n++; }
  if (n) shake(1.5);
  return n;
}
function hitCone(x, y, a, arc, r, dmg, o = {}) {
  let n = 0; r *= castR();
  if (typeof IN !== 'undefined' && IN.assist()) arc *= 1.15;   // melee cones widen 15 % on pad / touch
  for (const e of G.enemies.slice()) {
    if (e.dead) continue;
    const d = dist(x, y, e.x, e.y);
    if (d > r + e.r) continue;
    if (d > e.r && Math.abs(angDiff(a, Math.atan2(e.y - y, e.x - x))) > arc / 2 + Math.atan2(e.r, d)) continue;
    if (damageEnemy(e, dmg, o)) n++;
  }
  if (n) { shake(1.5); hitstop(0.035); }
  return n;
}
function hitLine(x, y, a, len, w, dmg, o = {}) {
  w *= castR();
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  for (const e of G.enemies.slice()) if (!e.dead && segDist(e.x, e.y, x, y, ex, ey) < w + e.r) damageEnemy(e, dmg, o);
}

// ===== projectiles ===================================================================
function spawnProj(o) {
  const p = Object.assign({ t: 0, hit: new Set(), pierce: 0, friendly: true, cast: CAST }, o);
  // 6° projectile magnetism on pad / touch (never mouse)
  if (p.friendly && typeof IN !== 'undefined' && IN.assist() && typeof aimAssistCone === 'function' && aimAssistCone() > 0) {
    const tgt = autoTarget(G.player, (o.speed || 10) * (o.life || 1), [Math.cos(o.ang), Math.sin(o.ang)], 6 * Math.PI / 180);
    if (tgt) p.ang = o.ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
  }
  p.vx = Math.cos(o.ang) * o.speed; p.vy = Math.sin(o.ang) * o.speed;
  G.projs.push(p); return p;
}
function updateProjs(dt) {
  const m = G.map;
  for (const p of G.projs) {
    p.t += dt;
    const sdt = p.friendly ? dt : dt * enemyTimeScale();
    if (p.homing) {
      const tgt = nearestEnemy(p.x, p.y, 7, null);
      if (tgt) { const a = Math.atan2(tgt.y - p.y, tgt.x - p.x), cur = Math.atan2(p.vy, p.vx), na = cur + clamp(angDiff(cur, a), -p.homing * dt, p.homing * dt); p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed; }
    }
    p.x += p.vx * sdt; p.y += p.vy * sdt;
    if (p.t > p.life) { p.dead = true; if (p.explode) explodeProj(p); continue; }
    const tx = Math.floor(p.x), ty = Math.floor(p.y), t = typeAt(m, tx, ty);
    if (p.kind !== 'wave' && t && m.type[ty][tx] === 'pillar') { p.dead = true; if (p.explode) explodeProj(p); burst(p.x, p.y, p.z, 6, [p.col], 2); continue; }
    if (p.friendly) {
      for (const e of G.enemies) {
        if (e.dead || e.spawnT > 0 || p.hit.has(e)) continue;
        if (dist(p.x, p.y, e.x, e.y) < p.r + e.r) {
          p.hit.add(e);
          damageEnemy(e, p.dmg, { knock: p.knock || 0.12, slow: p.slow, burn: p.burn, fx: p.x - p.vx, fy: p.y - p.vy, cast: p.cast });
          if (p.pierce-- <= 0) { p.dead = true; if (p.explode) explodeProj(p); break; }
        }
      }
    } else {
      const pl = G.player;
      if (!pl.dead && dist(p.x, p.y, pl.x, pl.y) < p.r + pl.r) {
        // an enemy's own shot (p.src) runs its elite on-hit mods (vampiric, frozen) like a melee hit
        if (hurtPlayer(p.dmg, p.x, p.y, p.el) && p.src && p.src.mods) for (const m of p.src.mods) if (ELITE_MODS[m] && ELITE_MODS[m].onHit) ELITE_MODS[m].onHit(p.src, p.dmg);
        p.dead = true; burst(p.x, p.y, p.z, 8, [p.col, '#ffffff'], 2);
      }
    }
  }
  G.projs = G.projs.filter(p => !p.dead);
}
function explodeProj(p) {
  hitArea(p.x, p.y, p.explode.r, p.explode.dmg, { burn: p.burn, cast: p.cast });
  fx({ type: 'ring', x: p.x, y: p.y, r: p.explode.r + 0.3, col: p.col, life: 0.3 });
  burst(p.x, p.y, p.z, 18, ['#ffd27a', '#ff8a4a', '#ffffff'], 4);
}

// ===== zones ==========================================================================
function updateZones(dt) {
  for (const z of G.zones) {
    z.t += dt; z.tickT -= dt;
    if (z.t > z.life) { z.dead = true; continue; }
    if (z.hostile) {   // enemy ground zones (parts.js hostileZone): hurt / slow the hero on each tick
      if (z.tickT <= 0) { z.tickT = z.tick || 0.5; if (playerIn({ kind: 'circle', x: z.x, y: z.y, r: z.r })) { if (z.slow) G.player.slowT = Math.max(G.player.slowT, 0.8); if (z.dmg) hurtPlayer(z.dmg, z.x, z.y, z.el || 'nature'); } }
      continue;
    }
    if (z.pull) for (const e of G.enemies) {
      if (e.dead || e.boss || e.dummy || e.spawnT > 0) continue;
      const d = dist(z.x, z.y, e.x, e.y);
      if (d < z.r + 0.5 && d > 0.2) { moveEntity(e, (z.x - e.x) / d * z.pull * dt, (z.y - e.y) / d * z.pull * dt, tileH(G.map, e.x, e.y)); }
    }
    if (z.trap) {
      const e = nearestEnemy(z.x, z.y, z.r, null);
      if (e) { hitArea(z.x, z.y, z.r, z.dmg, { stun: z.stun, cast: z.cast }); fx({ type: 'ring', x: z.x, y: z.y, r: z.r, col: z.col, life: 0.3 }); z.dead = true; sfx('trap'); }
      continue;
    }
    if (z.tick && z.tickT <= 0) {
      z.tickT = z.tick;
      hitArea(z.x, z.y, z.r, z.dmg, { slow: z.slow, cast: z.cast });
      if (z.kind === 'rain') for (let k = 0; k < 4; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * z.r; fx({ type: 'arrowfall', x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r, life: 0.18 }); }
    }
  }
  G.zones = G.zones.filter(z => !z.dead);
}

// ===== enemies ========================================================================
// ENEMY (the table), PARTS, ELITE_MODS: js/parts.js · BOSSES, BOSS_MOVES: js/bosses.js
const STAGGER_CAP = 12, STAGGER_DECAY = 1.2;   // boss stagger bar: heavy hits add 2-3, it drains 1.2/s
// the bare instance (no parts): swarm members and twins are made with this, then initParts()
function spawnEnemyRaw(type, x, y, spawnT = 0.9) {
  const d = ENEMY[type], dummy = d.ai === 'dummy', boss = d.ai === 'boss', lvl = dummy ? 1 : enemyLevel(type), hp = dummy ? d.hp : Math.round(d.hp * enemyHpMul(lvl));
  const e = { type, def: d, x, y, z: 0, r: d.r || 0.4, hp, maxHp: hp, lvl, dm: dummy ? 1 : enemyDmgMul(lvl), el: d.element || 'slash', res: d.res || {}, tags: d.tags || [], hgt: d.hgt || 3, blood: d.blood || '#c7a8ff', kx: 0, ky: 0, flash: 0, stunT: 0, slowT: 0, burnT: 0, burnTick: 0, state: 'chase', st: 0, cd: rand(0.5, 1.5), spawnT, face: 1, anim: Math.random() * 6, boss, dummy, parts: [], acts: [], pp: {}, pcd: {} };
  G.enemies.push(e);
  if (!dummy) sighting(type);
  if (spawnT > 0) fx({ type: 'summon', x, y, life: spawnT, col: boss ? '#ff5aa0' : '#b36bff', r: boss ? 2.4 : 0.9 });
  return e;
}
// o = { elite: true | mod id | [ids] } (trigger spawn cards). A boss row starts the boss fight (G.boss).
function spawnEnemy(type, x, y, spawnT = 0.9, o = {}) {
  type = enemyId(type);
  if (!ENEMY[type]) return null;
  const e = spawnEnemyRaw(type, x, y, spawnT);
  if (e.boss) { bossInit(e); if (!G.boss || G.boss.dead) G.boss = e; return e; }
  if (!e.dummy) initParts(e, e.def);
  if (o.elite && !e.dummy) makeElite(e, o.elite === true ? null : o.elite);
  return e;
}
function killEnemy(e) {
  e.dead = true; sfx('die');
  const counts = e.dummy || partsDeath(e);   // split / zone-on-death; a swarm or twin counts once, on its last member
  if (counts && !e.noXp) onEnemyKilled(e);   // XP + loot (items.js)
  if (counts) { G.kills[e.type] = (G.kills[e.type] || 0) + 1; G.kills.any = (G.kills.any || 0) + 1; if (!e.dummy) sighting(e.type).kills++; }
  burst(e.x, e.y, e.z + e.hgt * 0.5, e.boss ? 120 : 24, [e.blood, '#ffffff', '#ffb0e0'], e.boss ? 7 : 3.5);
  fx({ type: 'ring', x: e.x, y: e.y, r: e.boss ? 4 : 1.2, col: e.blood, life: 0.4 });
  // spirit motes drift up toward the player — a little healing
  if (!e.boss) delay(0.2, () => { healPlayer(G.player, 14); G.player.mp = Math.min(G.player.maxMp, G.player.mp + 10); });
  if (e.boss) { shake(14); hitstop(0.25); G.slowmo = 1.4; G.shrink = null; }
}
const enemyTimeScale = () => G.player.buffs.dreamveil ? 0.35 : 1;

// telegraphs are tagged with the enemy that made them (PART_SRC) so a stagger or a phase change can clear them
function tele(o) { o.type = 'tele'; if (!o.src && typeof PART_SRC !== 'undefined' && PART_SRC) o.src = PART_SRC; return fx(o); }
function playerIn(shape) {
  const p = G.player;
  if (shape.kind === 'circle') return dist(p.x, p.y, shape.x, shape.y) < shape.r + p.r;
  if (shape.kind === 'cone') { const d = dist(p.x, p.y, shape.x, shape.y); return d < shape.r + p.r && Math.abs(angDiff(shape.ang, Math.atan2(p.y - shape.y, p.x - shape.x))) < shape.arc / 2; }
  if (shape.kind === 'line') return segDist(p.x, p.y, shape.x, shape.y, shape.x + Math.cos(shape.ang) * shape.len, shape.y + Math.sin(shape.ang) * shape.len) < shape.w + p.r;
  return false;
}

function updateEnemies(dt) {
  const p = G.player;
  const ts = enemyTimeScale();
  if (typeof updateArena === 'function') updateArena(dt);
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.flash -= dt; e.anim += dt;
    if (e.stagger > 0) e.stagger = Math.max(0, e.stagger - dt * STAGGER_DECAY);
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }
    if (e.dummy) continue;
    const edt = dt * ts * (e.slowT > 0 ? 0.55 : 1);
    e.slowT -= dt;
    if (e.burnT > 0) { e.burnT -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = 0.5; damageEnemy(e, 14, { dot: true, cast: e.burnCast || null }); if (Math.random() < 0.5) burst(e.x, e.y, e.z + 1, 2, ['#ff9a4a', '#ffd27a'], 1); } if (e.dead) continue; }
    // knockback
    if (Math.abs(e.kx) + Math.abs(e.ky) > 0.05) { moveEntity(e, e.kx * dt, e.ky * dt, tileH(G.map, e.x, e.y)); e.kx *= Math.pow(0.002, dt); e.ky *= Math.pow(0.002, dt); }
    if (e.stunT > 0) { e.stunT -= dt; if (e.stunT <= 0) e.frozen = 0; continue; }
    e.cd -= edt;
    const d = dist(e.x, e.y, p.x, p.y), ang = Math.atan2(p.y - e.y, p.x - e.x);
    const hidden = !!p.buffs.veil || p.dead || G.state !== 'play';
    e.face = isoX(p.x, p.y) >= isoX(e.x, e.y) ? 1 : -1;
    if (e.boss) { bossUpdate(e, edt, d, ang, hidden); continue; }
    updatePartsEnemy(e, edt, { p, d, ang, hidden, dt: edt });
    if (e.squash > 0) e.squash -= dt;
    if (!e.under) e.z = lerp(e.z, tileH(G.map, e.x, e.y), Math.min(1, dt * 12));
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}

// ===== enemies from world data (editor's Enemies tab) ==============================
// world.enemies[type] = { name, ai: hopper|shooter|charger|brute, hp, speed, dmg, range, cd, wind, r, aoe, shape, sprite }
// or a full part row (js/parts.js header). These override ENEMY_DATA and the built-in rows.
const ENEMY_AI = { hopper: 'Hops in and splats around itself', shooter: 'Keeps its distance and shoots orbs', charger: 'Telegraphs a line, then lunges', brute: 'Winds up a heavy smash (cone or circle)' };
function applyWorldEnemies(list) {
  for (const k in list || {}) {
    const src = list[k], base = ENEMY[k] || { name: k, ai: 'brute', hp: 300, r: 0.45, speed: 2, dmg: 30, range: 1.5, wind: 0.6, cd: 1.5, aoe: 1.8, shape: 'cone', hgt: 3, blood: '#c7a8ff' };
    ENEMY[k] = Object.assign({}, base, src);
    // a legacy row (ai, no parts) re-derives its parts from ai + these numbers at spawn (parts.js partsFromAi)
    if (src.ai && !src.parts) { delete ENEMY[k].parts; delete ENEMY[k].params; }
    if (src.element) ENEMY[k].dmgType = src.element;
    for (const f of ['hp', 'r', 'speed', 'dmg', 'range', 'wind', 'cd', 'aoe']) if (ENEMY[k][f] != null) ENEMY[k][f] = +ENEMY[k][f];
  if (ENEMY[k].res) for (const el in ENEMY[k].res) ENEMY[k].res[el] = +ENEMY[k].res[el] || 0;
    const img = ENEMY[k].sprite && ART.custom[ENEMY[k].sprite];
    if (img) ENEMY[k].hgt = Math.max(1.5, img.height / ZS * 0.9);
  }
}

// ===== animals: wander near home, bolt when the hero comes close ===================
function spawnCritters(m) {
  G.critters = (m.critterSpawns || []).map((c, i) => ({ type: c.type, x: c.x, y: c.y, hx: c.x, hy: c.y, z: tileH(m, c.x, c.y), r: 0.18, state: 'idle', t: rand(0.5, 3), face: rand() < 0.5 ? 1 : -1, hop: 0, seed: i * 1.7, tx: c.x, ty: c.y }));
}
function updateCritters(dt) {
  const m = G.map, p = G.player;
  for (const c of G.critters || []) {
    const rabbit = c.type === 'rabbit', d = dist(c.x, c.y, p.x, p.y);
    c.t -= dt;
    let mvx = 0, mvy = 0, sp = 0;
    if (d < 2.6 && !p.dead) { c.state = 'flee'; c.t = 1.4; }
    if (c.state === 'flee') {
      const a = Math.atan2(c.y - p.y, c.x - p.x) + Math.sin(c.seed + G.t * 2) * 0.4;
      mvx = Math.cos(a); mvy = Math.sin(a); sp = rabbit ? 4.6 : 4;
      if (c.t <= 0) { c.state = 'idle'; c.t = rand(1, 3); c.hx = c.x; c.hy = c.y; }
    } else if (c.state === 'walk') {
      const dd = dist(c.x, c.y, c.tx, c.ty);
      if (dd < 0.15 || c.t <= 0) { c.state = 'idle'; c.t = rand(1.5, 4); }
      else { mvx = (c.tx - c.x) / dd; mvy = (c.ty - c.y) / dd; sp = rabbit ? 1.6 : 1.1; }
    } else if (c.t <= 0) {
      const a = rand(0, 6.28), r = rand(0.6, 2.4);
      c.tx = c.hx + Math.cos(a) * r; c.ty = c.hy + Math.sin(a) * r; c.state = 'walk'; c.t = 4;
    }
    if (sp) {
      // rabbits move in hops; foxes trot
      if (rabbit) { c.hop = (c.hop + dt * (c.state === 'flee' ? 3.2 : 2.2)) % 1; sp *= c.hop < 0.65 ? 1.5 : 0; } else c.hop = (c.hop + dt * 4) % 1;
      const ox = c.x, oy = c.y;
      moveEntity(c, mvx * sp * dt, mvy * sp * dt, tileH(m, c.x, c.y));
      if (c.state === 'walk' && Math.hypot(c.x - ox, c.y - oy) < 1e-4) c.t = 0;
      const sx = isoX(mvx, mvy); if (Math.abs(sx) > 0.05) c.face = sx > 0 ? 1 : -1;
    } else c.hop = 0;
    c.z = lerp(c.z, tileH(m, c.x, c.y), Math.min(1, dt * 12));
  }
}

// ===== tuning (numbers editable in the editor's Tuning tab) ==============================
// mpRegen was 7/s before §15.3 (basic attacks now build mpOnHit per hit); ultRate = charge per point of
// pre-multiplier damage (0.01 -> ~50 s of basic hits on one target, ~30-40 s with skills; reactions x2 in M4)
G.tune = { player: { hp: 650, mp: 260, stamina: 100, speed: 3.7, regen: 2, mpRegen: 2, crit: 0.08, damage: 1, mpOnHit: 8, ultRate: 0.019 } };   // ultRate 0.019 (M2b balsim): one ultimate per ~40 s in the reference rotation (0.01 measured ~77 s)
const TUNE_ENEMY_KEYS = ['hp', 'speed', 'dmg', 'range', 'cd'];
function applyTuning(t) {
  if (!t) return;
  if (t.player) Object.assign(G.tune.player, t.player);
  for (const k in t.enemies || {}) if (ENEMY[k]) for (const f of TUNE_ENEMY_KEYS) if (t.enemies[k][f] != null) ENEMY[k][f] = +t.enemies[k][f];
  for (const k in t.skills || {}) if (SKILLS[k]) for (const f of ['cd', 'mp', 'st']) if (t.skills[k][f] != null) SKILLS[k][f] = +t.skills[k][f];
}

// ===== triggers: WHEN <condition> [requires other triggers] THEN <actions> =============
// Edited in the editor's Logic tab; stored per map in js/world.js.
// Trigger state persists (G.prog.trig[map], saved): whenever the map is calm (no live enemies, nothing pending)
// every fired one-shot trigger is SETTLED. Re-entering or respawning restores settled triggers and replays only their
// lasting effects (portals, objective), so just the encounter you died in resets. map_enter triggers re-run each entry.
// Actions: spawn { enemy, count, x, y, radius, instant, elite } (a boss row starts the boss fight) · spawn_boss (the Warden)
//   banner · message · objective · heal · open_portal / close_portal { index | id } · clear_enemies · shake · sound ·
//   teleport · checkpoint { x, y, text } · loot { rarity, count, x, y, + extras: gem, chest: tier, sockets, item } ·
//   dialogue { id: DIALOGUE key } or { speaker, lines } · openGate { id } (gate / keydoor / hidden wall; levers flip) ·
//   quest { id, step | done, title, text } -> G.prog.quests[id] = { step } | 'done' (the Quests tab reads it)
//   spawnPack { id, at: { x, y } | 'x,y', radius = 1.5, elite } spawns an ENCOUNTERS pack (js/enemydata.js) by id, its
//     members ringed around `at` (default: beside the hero), tagged e.pack = id. A pack's `after` rule is NOT checked
//     here: the trigger's own `requires` gates it.
const LASTING_ACTIONS = { open_portal: 1, close_portal: 1, objective: 1, openGate: 1 };
function startTriggers() {
  const m = G.map, settled = G.prog.trig[m.id] || [];
  G.trig = { fired: {}, at: {}, t: 0, inside: {} }; G.kills = {}; G.pendingSpawns = 0; G.objective = m.objective;
  G.shrink = null; G.talk = [];
  if (typeof syncGates === 'function') syncGates(m);
  for (const tr of m.triggers) if (settled.includes(tr.id)) {
    G.trig.fired[tr.id] = true; G.trig.at[tr.id] = 0;
    for (const a of tr.actions || []) if (LASTING_ACTIONS[a.type]) runAction(a);
  }
}
function settleTriggers() {
  const T = G.trig, m = G.map;
  if (G.pendingSpawns || G.enemies.some(e => !e.dummy)) return;
  const ids = m.triggers.filter(tr => T.fired[tr.id] && tr.once !== false && (tr.when || {}).type !== 'map_enter').map(tr => tr.id);
  if (ids.length !== (G.prog.trig[m.id] || []).length) G.prog.trig[m.id] = ids;
}
function updateTriggers(dt) {
  const m = G.map, T = G.trig; if (!T) return;
  T.t += dt;
  for (const tr of m.triggers) {
    if (tr.disabled) continue;
    const once = tr.once !== false;
    if (once && T.fired[tr.id]) continue;
    if ((tr.requires || []).some(id => !T.fired[id])) continue;
    if (!once && T.at[tr.id] != null && T.t - T.at[tr.id] < (tr.cooldown || 1)) continue;
    if (triggerCondition(tr)) fireTrigger(tr);
  }
  settleTriggers();
}
function triggerCondition(tr) {
  const w = tr.when || { type: 'map_enter' }, T = G.trig, p = G.player;
  switch (w.type) {
    case 'map_enter': return true;
    case 'timer': { const base = w.after && w.after !== 'map' ? T.at[w.after] : 0; return base != null && T.t - base >= (+w.seconds || 0); }
    case 'enter_area': { const inside = dist(p.x, p.y, +w.x, +w.y) < (+w.r || 1); const was = T.inside[tr.id]; T.inside[tr.id] = inside; return inside && !was; }
    case 'all_enemies_dead': return !G.pendingSpawns && !G.enemies.some(e => !e.dummy);
    case 'enemy_killed': return (G.kills[w.enemy || 'any'] || 0) >= (+w.count || 1);
    case 'boss_hp_below': return !!(G.boss && !G.boss.dead && G.boss.hp / G.boss.maxHp * 100 < +w.pct);
    case 'player_hp_below': return p.hp / p.maxHp * 100 < +w.pct;
  }
  return false;
}
function fireTrigger(tr) {
  const T = G.trig; T.fired[tr.id] = true; T.at[tr.id] = T.t;
  let d = 0;
  for (const a of tr.actions || []) {
    if (a.type === 'wait') { d += +a.seconds || 0; continue; }
    if (d > 0) { G.pendingSpawns++; delay(d, () => { G.pendingSpawns--; runAction(a); }); } else runAction(a);
  }
}
function runAction(a) {
  const m = G.map, p = G.player;
  switch (a.type) {
    case 'spawn': {
      const n = Math.max(1, +a.count || 1);
      for (let i = 0; i < n; i++) { G.pendingSpawns++; delay(0.15 * i, () => { G.pendingSpawns--; spawnAt(a.enemy || 'slime', a.x === '' ? null : a.x, a.y === '' ? null : a.y, a.radius, a.instant, a.elite); }); }
      break;
    }
    case 'spawn_boss': G.boss = spawnEnemy('boss', a.x != null && a.x !== '' ? +a.x : m.cx + 1.5, a.y != null && a.y !== '' ? +a.y : m.cy - 1.5, 1.6); break;
    case 'banner': G.banner = { s: a.title || '', sub: a.sub || '', t: a.boss ? 3.4 : 2.6, max: a.boss ? 3.4 : 2.6, boss: !!a.boss }; if (a.boss) { sfx('roar'); shake(6); } break;
    case 'message': say(a.text || ''); break;
    case 'objective': G.objective = a.text || ''; break;
    case 'heal': healPlayer(p, p.maxHp * (+a.pct || 0) / 100); break;
    case 'open_portal': case 'close_portal': {
      const byId = a.id != null && a.id !== '';
      m.portals.forEach((pt, i) => { if (byId ? pt.id === a.id : (a.index == null || a.index === '' || +a.index === -1 || +a.index === i)) pt.open = a.type === 'open_portal'; }); break;
    }
    case 'dialogue': talk(a); break;
    case 'openGate': if (typeof openGate === 'function') openGate(a.id, true); break;
    case 'quest': questAction(a); break;
    case 'spawnPack': spawnPack(a); break;
    case 'clear_enemies': for (const e of G.enemies.slice()) if (!e.dummy && !e.dead) killEnemy(e); break;
    case 'shake': shake(+a.power || 6); break;
    case 'sound': sfx(a.name || 'portal'); break;
    case 'teleport': if (G.world.maps[a.map]) transition(a.map); break;
    case 'checkpoint': { const has = v => v != null && v !== ''; setCheckpoint(has(a.x) ? +a.x : p.x, has(a.y) ? +a.y : p.y, a.text); break; }
    case 'loot': lootAction(a); break;
  }
}
// x/y given: scatter around that point; otherwise somewhere on the island away from the player
function spawnAt(type, x, y, radius, instant, elite) {
  const m = G.map; type = enemyId(type); if (!ENEMY[type]) return;
  const R = Math.max(2, Math.min(m.W, m.H) / 2 - 1.5);
  for (let tries = 0; tries < 40; tries++) {
    let nx, ny;
    if (x != null) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (radius != null && radius !== '' ? +radius : (tries ? 1.5 : 0)); nx = +x + Math.cos(a) * r; ny = +y + Math.sin(a) * r; }
    else { const a = Math.random() * 6.28, r = rand(R * 0.55, R); nx = m.cx + Math.cos(a) * r; ny = m.cy + Math.sin(a) * r; }
    if (walkable(m, nx, ny, tileH(m, nx, ny)) && (x != null || dist(nx, ny, G.player.x, G.player.y) > 3.5)) { const e = spawnEnemy(type, nx, ny, instant ? 0 : ENEMY[type].ai === 'boss' ? 1.6 : 0.9, { elite: ENEMY[type].ai === 'boss' ? null : elite }); e.z = 0; return e; }
  }
}
// dialogue: lines queue on the say line, ~2.4 s each (DIALOGUE ids from js/dialogue.js, or inline speaker + lines)
function talk(a) {
  const D = a.id && typeof DIALOGUE !== 'undefined' ? DIALOGUE[a.id] : null, src = D || a;
  if (src.banner) { G.banner = { s: src.banner, sub: src.sub || '', t: 2.6, max: 2.6 }; return; }
  const lines = (src.lines || (src.text ? [src.text] : [])).map(l => (src.speaker ? src.speaker + ': ' : '') + l);
  G.lastDialogue = { id: a.id || null, speaker: src.speaker || '', lines };
  const q = G.talk || (G.talk = []), wasIdle = !q.length;
  q.push(...lines);
  if (wasIdle) nextTalk();
}
function nextTalk() {
  const q = G.talk; if (!q || !q.length) return;
  const s = q[0]; G.msg = { s, t: 2.4 };
  delay(2.4, () => { if (G.talk && G.talk[0] === s) { G.talk.shift(); nextTalk(); } });
}
// quests: G.prog.quests[id] = { step } while active (0 = the first step) or 'done'; a card without step/done advances it
function questAction(a) {
  if (!a.id) return;
  const Q = G.prog.quests || (G.prog.quests = {}), cur = Q[a.id];
  if (cur === 'done') return;
  const def = typeof QUESTS !== 'undefined' ? QUESTS.find(q => q.id === a.id) : null, title = a.title || (def && def.title) || a.id;
  if (a.done) Q[a.id] = 'done';
  else Q[a.id] = { step: a.step != null && a.step !== '' ? +a.step : cur ? (cur.step || 0) + 1 : 0 };
  const msg = a.done ? `Quest complete: ${title}` : cur ? `Quest updated: ${title}` : `New quest: ${title}`;
  if (typeof UI !== 'undefined' && UI.toast) UI.toast({ text: msg, col: '#ffd35a' }); else say(msg);
  sfx(a.done ? 'levelup' : 'pickup');
}
function encounterPack(id) {
  if (typeof ENCOUNTERS === 'undefined' || !id) return null;
  for (const zone in ENCOUNTERS) { const f = (ENCOUNTERS[zone] || []).find(q => q.id === id); if (f) return f; }
  return null;
}
function spawnPack(a) {
  const pk = encounterPack(a.id); if (!pk) { if (typeof console !== 'undefined') console.warn('spawnPack: no ENCOUNTERS pack ' + a.id); return; }
  let at = a.at; if (typeof at === 'string') { const [x, y] = at.split(',').map(Number); at = { x, y }; }
  const p = G.player, cx = at && isFinite(+at.x) ? +at.x : p.x + 3, cy = at && isFinite(+at.y) ? +at.y : p.y, R = a.radius != null && a.radius !== '' ? +a.radius : 1.5;
  pk.members.forEach((type, i) => {
    const ang = i / pk.members.length * Math.PI * 2 + 0.3;
    G.pendingSpawns++;
    delay(0.15 * i, () => { G.pendingSpawns--; const e = spawnAt(type, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 0.4, a.instant, i === 0 ? a.elite : null); if (e) e.pack = pk.id; });
  });
}
