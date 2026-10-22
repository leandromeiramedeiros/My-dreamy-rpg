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
  shakeA: 0, hitstopT: 0, hitstopF: 0, hitstopSpent: 0, corpses: [], state: 'title', cam: { x: 0, y: 0 },
  mouse: { x: RW / 2, y: RH / 2, dx: DW / 2, dy: DH / 2, wx: 0, wy: 0, down: false },
  keys: {}, ui: { open: false, help: false }, banner: null, msg: null, kills: {}, pendingSpawns: 0, objective: '',
  arena: null, fade: 0, fadeDir: 0, fadeTo: null, boss: null, muted: false, drops: [],
  prog: { chests: {}, firsts: {}, trig: {} }, checkpoint: null,
  seen: {},   // bestiary hooks: seen[type] = { kills, res: { el: tier } } — set on first sight, saved
  prompt: null,   // nearest interactable { kind: chest|shrine|tablet, obj, text } (items.js updateLoot); Interact acts on it
  stats: { playtime: 0, deaths: 0 },
  saveSlot: typeof LAST_SLOT !== 'undefined' ? LAST_SLOT : 1,   // 1..SAVE_SLOTS (items.js)

};

// ===== audio ===================================================================
// js/audio.js is the engine (buses, voice pool, music director, captions). These two wrappers keep every call site.
//   initAudio()          create / resume the AudioContext from a user gesture (also automatic on the first gesture)
//   sfx(id, pos?, opts?) play an SFX_RECIPES id; pos = { x, y } world tiles for pan + distance (optional);
//                        opts = { pitch: cents, gain, at } (audio.js AUDIO.sfx)
function initAudio() { if (typeof AUDIO !== 'undefined') AUDIO.unlock(); }
function sfx(k, pos, opts) { if (typeof AUDIO !== 'undefined') AUDIO.sfx(k, pos, opts); }

// ===== generic helpers ==========================================================
// CAST = the skill being resolved ({ skill, el }); delays/projectiles/zones/dashes capture it so gem
// amplification and skill damage still apply when the hit lands later. Basic attacks run with CAST = null.
let CAST = null;
function withCast(c, fn) { const o = CAST; CAST = c; try { fn(); } finally { CAST = o; } }
const delay = (t, fn) => G.delays.push({ t, fn, c: CAST });
const shake = a => { if (CAST && CAST.src === 'echo') return; G.shakeA = Math.max(G.shakeA, a * (typeof shakeMul === 'function' ? shakeMul() : 1)); };
// ===== hit feel: power-scaled hitlag (docs/design/combat-feel.md, meeting 2026-10-20 R2) ===================================
// Two tiers, both counted in fixed STEPs (1/60 s), never seconds, so slow-mo cannot stretch them:
//  * target-only freeze e.hitFreeze (damageEnemy, every non-DoT hit): the struck enemy skips AI / move / knockback and
//    shows its hit frame; costs no input latency.
//  * global freeze G.hitstopF (hero + world, dt = 0) through hitstop(): crit 3, kill 3, r >= 0.25 4, r >= 0.5 or the
//    ultimate's first hit 6, boss BREAK 8 (boss death 15 = 0.25 s). Math.max, never additive. Budget: at most
//    HITLAG.budget steps granted per rolling HITLAG.win steps (12 per 0.5 s), tracked in a fixed ring; a request over
//    budget returns -1 and the caller folds it into the target-only freeze.
//  Setting 'hitstop' off | light | full: off = no global freeze and Ft = 2; light = global capped at 3.
// main.js loop() calls hitlagStep() once per step, BEFORE slow-mo scaling. G.hitstopT mirrors G.hitstopF in seconds for
// loops that predate the step counter (tools/balsim.js simStep decrements hitstopT by its step); the budget ring
// advances once per updateEnemies() call (= once per fixed step in every loop).
const HITLAG = { budget: 12, win: 30, light: 3, ring: new Uint8Array(30), i: 0 };
const hitlagMode = () => typeof hitstopMode === 'function' ? hitstopMode() : 'full';
// n = steps (integer >= 1), or seconds when < 1 (legacy callers: bosses.js move.hitstop 0.06 / 0.08 -> 4 / 5 steps).
// force: ignore the budget (boss death). Returns the steps now frozen, 0 when the setting is Off, -1 when over budget.
function hitstop(n, force) {
  let f = n < 1 ? Math.round(n * 60) : Math.round(n);
  const mode = hitlagMode();
  if (!(f > 0) || mode === 'off') return 0;
  if (mode === 'light') f = Math.min(f, HITLAG.light);
  const cur = Math.min(G.hitstopF, Math.ceil(G.hitstopT * 60 - 1e-6));   // steps still frozen (either clock)
  const add = f - cur;   // only the extension costs budget (Math.max semantics)
  if (add <= 0) return f;
  if (!force && G.hitstopSpent + add > HITLAG.budget) return -1;
  G.hitstopF = f; G.hitstopT = f / 60; G.hitstopSpent += add; HITLAG.ring[HITLAG.i] = Math.min(255, HITLAG.ring[HITLAG.i] + add);
  return f;
}
// one fixed step of the global freeze (unscaled); true = this step is frozen (dt = 0)
function hitlagStep() {
  if (G.hitstopF > 0) { G.hitstopF--; G.hitstopT = G.hitstopF / 60; return true; }
  if (G.hitstopT > 1e-6) { G.hitstopT = Math.max(0, G.hitstopT - 1 / 60); return true; }   // a seconds freeze set directly (tools/shots-m3-art.js poses)
  return false;
}
// one fixed step of the rolling budget window (updateEnemies)
function hitlagBudgetTick() { const H = HITLAG; H.i = (H.i + 1) % H.win; G.hitstopSpent = Math.max(0, G.hitstopSpent - H.ring[H.i]); H.ring[H.i] = 0; }
function hitlagReset() { G.hitstopF = 0; G.hitstopT = 0; G.hitstopSpent = 0; HITLAG.ring.fill(0); }
// AoE / multi-hit casts (hitCone / hitArea / hitLine) collect their targets here so the global freeze, the shake and the
// hit-particle cap apply ONCE per cast from the largest r (never per target, never summed)
let HITAGG = null;
const aggBegin = () => { const prev = HITAGG; HITAGG = { fg: 0, r: 0, n: 0, parts: 0, hit: [], prev }; return HITAGG; };
function aggEnd(A) {
  HITAGG = A.prev;
  if (!A.hit.length) return;
  if (A.fg > 0 && hitstop(A.fg) < 0) for (const e of A.hit) e.hitFreeze = Math.max(e.hitFreeze || 0, A.fg);   // over budget: target-only
  shake(Math.min(6, 1.5 + 4 * A.r));
}
const fx = o => { o.t = 0; G.effects.push(o); return o; };
const zone = o => { o.t = 0; o.tickT = 0; o.cast = CAST; G.zones.push(o); return o; };
// ===== particles: pooled, hard cap PART.cap (docs/design/pillars-and-rules.md) ===========================================
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
// within 80 ms merge into one number (docs/design/hud-ui.md)
function dmgText(x, y, z, s, col, big, o) {
  if (typeof damageNumbersOn === 'function' && !damageNumbersOn()) return;
  if (o && o.e) {
    const prev = o.e.lastDmgText;
    if (prev && G.texts.includes(prev) && prev.t < 0.08 && prev.kind !== 'weak' === (o.kind !== 'weak')) {
      prev.sum += o.v; if (o.r > (prev.r || 0)) prev.r = o.r; prev.s = String(Math.round(prev.sum)) + (prev.kind === 'crit' || o.kind === 'crit' ? '!' : '');
      if (o.kind === 'crit') { prev.kind = 'crit'; prev.col = col; }
      prev.t = Math.min(prev.t, 0.03); return;
    }
  }
  const t = text(x, y, z, s, col, big);
  if (o) { t.kind = o.kind; t.sum = o.v || 0; t.r = o.r || 0; if (o.e) o.e.lastDmgText = t; }
}

// ===== player ==================================================================
function makePlayer() {
  const p = {
    x: 0, y: 0, z: 0, r: 0.28, aim: 0, face: 1, back: false, walkT: 0, moving: false,
    gear: { weapon: 'sword', offhand: 'buckler', head: 'knighthelm', chest: 'warden', boots: 'knightgreaves' },   // variant / family ids (data.js), derived from p.equip
    equip: {}, bag: [], dust: 0, potions: 3, xp: 0, cdm: {},
    pockets: POCKET_DEFAULT.slice(), pocketN: {}, pages: {},   // Z / X / C consumables, the Pages store (items.js)
    deck: 0,         // the companion's active entry index (not saved)
    cds: {}, buffs: {}, atkT: 0, combo: 0, swing: null, dash: null, invulnT: 0, hurtT: 0, rootT: 0, slowT: 0, castT: 0, spin: 0,
    name: 'Aerin', level: 1, dead: false,
    ult: 0,          // ultimate charge 0..100 (§15.3), shared by both ultimates, not saved
    ranks: {},       // skill id -> { hits } (casts that hit; rank = 1 + hits / RANK_HITS, max 5), saved
    holdT: 0, holdCharge: 0,   // hold-M1 (Staff Channel, Bow Focus): seconds held / 0..1 for the touch charge ring
    cast: null,      // the skill cast in progress { c, id, slot, age, dur, mp } (dodge-cancel window)
    dodgeBuf: 0, autoAtk: false, stMax: {},
  };
  starterKit(p);
  recalcStats(p, true);
  return p;
}
// The stats seam (§3 balance rule): every gear/affix/implicit/gem/boon bonus is summed per stat, then applied once.
// Base damage = tuning x level x (equipped weapon damage / its family's reference damage), so the basic
// attack AND every skill scale with the weapon; p.bonus is the single additive damage % sum.
// p.sum = the full summed gear bag (every stat key, incl. ones with no system yet: statusChance, poise, reflect, fishLuck...),
// read by the engine hooks below (element damage %, pierce, charge rate, MP on hit, kill heal...). CAPS (itemdata.js, §19.6)
// is applied here and only here: cdr 40 %, crit 60 %, haste 50 %, gear power 150 %, reaction bonus 50 % (incl. resonance),
// Mark cap 5, potions 5; trinket resists max +10 % per line and +15 % resAll across the trinkets; hero res [-0.5, +0.6].
const CAPS_DEFAULT = { cdr: 0.4, crit: 0.6, haste: 0.5, gearPower: 1.5, reactionBonus: 0.5, markCap: 5, potions: 5, trinketResLine: 0.1, trinketResAll: 0.15, heroResMin: -0.5, heroResMax: 0.6 };
const capsT = () => (typeof CAPS !== 'undefined' ? CAPS : CAPS_DEFAULT);
const MARK_BASE = 3;   // the Mark cap before gear (Marks themselves land with the Shadows class, M4)
// ring element (§19.4 resonance): its boon's element, else the element of its implicit / first element-damage affix
const RING_EL = { fireBurn: 'fire', frostPower: 'frost', naturePower: 'nature', lightningPower: 'lightning', arcanePower: 'arcane', holyPower: 'holy', conductJump: 'lightning', shatterRadius: 'frost' };
function ringElement(it) {
  if (!it) return null;
  if (it.boon && RING_EL[it.boon.id]) return RING_EL[it.boon.id];
  const k = [it.implicit && it.implicit.id].concat(it.affixes.map(a => a.id)).find(id => id && /^(fire|frost|nature|lightning|arcane|holy)Dmg$/.test(id));
  return k ? k.slice(0, -3) : null;
}
// equipped boons by id (§19.6: ids never stack; two of one id count once, the major grade wins)
function equippedBoons(p) {
  const out = {};
  for (const k of TRINKET_SLOTS) {
    const it = p.equip[k], b = it && it.boon, row = b && boonRow(b.id); if (!row) continue;
    const prev = out[b.id]; if (prev && !(prev.grade === 'minor' && b.grade !== 'minor')) continue;
    out[b.id] = { id: b.id, grade: b.grade, slot: k, vals: row[b.grade === 'minor' ? 'minor' : 'major'] || row.major || {} };
  }
  return out;
}
function recalcStats(p, full) {
  const C = capsT();
  const s = { hp: 0, mp: 0, def: 0, power: 0, crit: 0, haste: 0, regen: 0, mpRegen: 0, speed: 0, critDmg: 0, cdr: 0, skillDmg: 0, dmg: 0, resAll: 0 };
  let trkAll = 0;
  // §28 null gear slots: an empty slot's p.gear entry is that slot's DEFAULT family id (render.js / menus read item(slot, p.gear[slot])
  // for a pose or a name), never the last item worn; everything that acts (skills, damage, the paper doll) reads p.equip
  for (const slot of SLOTS) p.gear[slot] = p.equip[slot] ? familyOf(p.equip[slot].base) : ITEMS[slot][0].id;
  p.gear.offhand = p.equip.offhand ? familyOf(p.equip.offhand.base) : null;
  // a Grip (loadout.md): matched by the two items' variant tags
  const tags = [p.equip.weapon, p.equip.offhand].filter(Boolean).map(it => familyOf(it.base));
  p.grip = (GRIPS.find(g => g.tags.every(t => tags.includes(t)) && tags.length === 2) || {}).id || null;
  for (const slot of EQUIP_SLOTS) {
    const it = p.equip[slot]; if (!it) continue;
    const st = statsOf(it), trk = isTrinket(it);
    for (const k in st) {
      let v = st[k];
      if (k === 'dmg' && slot === 'offhand') continue;   // a 1H weapon in OFFHAND lends its affixes and gems, never its base damage
      if (trk && k === 'resAll') { v = Math.min(v, Math.max(0, C.trinketResAll - trkAll)); trkAll += v; }   // +15 % across all trinkets
      else if (trk && /^res[A-Z]/.test(k)) v = Math.min(v, C.trinketResLine);                             // +10 % per trinket line
      s[k] = (s[k] || 0) + v;
    }
  }
  // boons (§19.4): passive boon numbers join the same sum through their EFFECTS row's `stats` map; triggers run via emitEffects
  p.boons = equippedBoons(p);
  for (const id in p.boons) { const row = EFFECT_BY_ID[id]; if (row && row.stats) for (const k in row.stats) if (typeof p.boons[id].vals[k] === 'number') s[row.stats[k]] = (s[row.stats[k]] || 0) + p.boons[id].vals[k]; }
  // belt gem wrap (gemWrap boon): the best gem below Radiant in chest (minor) or chest / boots (major) counts +1 grade, one socket only
  p.wrap = null;
  if (p.boons.gemWrap) {
    let best = null;
    for (const slot of p.boons.gemWrap.vals.gemWrapSlots || ['chest']) { const it = p.equip[slot]; if (!it) continue; it.sockets.forEach((g, si) => { const q = g && gemParse(g); if (q && q.grade < GEM_MAX && (!best || q.grade > best.grade)) best = { slot, si, gem: g, type: q.type, grade: q.grade }; }); }
    if (best) {
      p.wrap = best;
      const a = gemStats(best.gem, best.slot), b = gemStats(best.type + '_' + (best.grade + 1), best.slot);
      for (const k in b) s[k] = (s[k] || 0) + b[k] - (a[k] || 0);
    }
  }
  p.sum = s;
  p.res = {}; for (const el of RES_ELS.concat('holy')) p.res[el] = clamp((s[resKey(el)] || 0) + s.resAll, C.heroResMin, C.heroResMax);   // §5b: additive, clamped
  p.amp = gemAmp(p);
  // ring resonance (§19.4): two rings of one element -> that element's reaction +25 % (x2 with the Kindred Band), inside the 50 %
  // reaction-bonus cap. Reactions arrive in M4: p.reactBonus is read there; p.resonance drives the aura colour (art lane).
  const e1 = ringElement(p.equip.ring1), e2 = ringElement(p.equip.ring2);
  p.resonance = e1 && e1 === e2 ? { el: e1, bonus: Math.min(C.reactionBonus, 0.25 * (hasRule(p, 'kindredband') ? 2 : 1)) } : null;
  p.reactBonus = {}; if (p.resonance) p.reactBonus[p.resonance.el] = p.resonance.bonus;
  p.huntBonus = {};   // bestiary hunt milestones (+5% vs a type, additive into the damage sum) — filled by M-later
  const hpR = full || !p.maxHp ? 1 : p.hp / p.maxHp, mpR = full || !p.maxMp ? 1 : p.mp / p.maxMp;
  const B = G.tune.player, L = p.level - 1, w = item('weapon', p.gear.weapon);
  p.maxHp = Math.round(B.hp * (1 + 0.04 * L) + s.hp); p.maxMp = Math.round(B.mp + s.mp); p.maxSt = B.stamina;
  // bare hands (§28): the shove's 1 damage, never the default sword's 50
  const armed = !!p.equip.weapon;
  p.wdmg = armed ? s.dmg || w.basic.dmg : UNARMED.basic.dmg; p.dmgBase = B.damage * (1 + 0.03 * L) * (armed ? p.wdmg / w.basic.dmg : 1); p.bonus = Math.min(C.gearPower, s.power);
  p.power = p.dmgBase * (1 + p.bonus);
  p.def = s.def / (1 + s.def);   // additive armour sum -> one diminishing transform (0.2 -> 17%, 0.7 -> 41%, 1.5 -> 60%)
  p.crit = Math.min(C.crit, B.crit + s.crit); p.critDmg = 0.8 + s.critDmg; p.haste = Math.min(C.haste, s.haste);
  p.cdr = Math.min(C.cdr, s.cdr); p.skillDmg = s.skillDmg; p.regen = B.regen + s.regen; p.mpRegen = B.mpRegen + s.mpRegen; p.speed = B.speed + s.speed;
  p.markCap = Math.min(C.markCap, MARK_BASE + (s.markCap || 0));
  p.maxPotions = Math.min(C.potions, MAX_POTIONS + (s.potionCharge || 0));
  if (p.potions > p.maxPotions) p.potions = p.maxPotions;
  p.hp = p.maxHp * hpR; p.mp = p.maxMp * mpR; if (full) p.st = p.maxSt;
  const key = SLOTS.map(k => p.gear[k]).join();
  if (key !== p.sprKey) { p.sprKey = key; p.spr = buildPlayerSprites(p.equip); }
}
// ===== EFFECTS (§18.1 / §19.6): the smallest hook that becomes the M4 combo bus ==========================================
// One row per trinket boon (src 'trinket', every BOONS + origin id) and per trigger affix (src 'affix': onDodge / onKill):
//   { id, src, when: 'passive'|'hit'|'kill'|'dodge'|'ultimate'|'potion'|null, stats?: { boonKey: p.sum key }, do?(ctx, vals, p), icd, name, hint, dataOnly? }
// `stats` rows fold into recalcStats' sum; event rows run from emitEffects(when, ctx) at the existing single call sites
// (hit = damageEnemy, kill = killEnemy, dodge / ultimate = useSkill, potion = drinkPotion). ICD default 0.5 s, chain depth 2
// (an effect-triggered hit cannot trigger further effects). A `dataOnly` row names a boon whose system is not built yet (M4+).
// No row names a skill.
const EFFECT_ICD = 0.5;
const EFFECT_IMPL = {
  // ring
  fireBurn: { when: 'hit', stats: { fireDmg: 'fireDmg' }, do(c, v) { if (c.el === 'fire' && Math.random() < (v.burnChance || 0)) { const e = c.e; applyStatus(e, 'burning', Math.max(e.burnT || 0, 2), 'fire'); e.burnTick = e.burnTick || 0.5; e.burnCast = c.cast; } } },
  frostPower: { when: 'hit', stats: { frostDmg: 'frostDmg' }, do(c, v) { if (c.el === 'frost' && Math.random() < (v.freezeChance || 0)) { const e = c.e; applyStatus(e, 'frozen', Math.max(e.stunT, e.boss ? 0.25 : 1), 'frost'); } } },
  naturePower: { when: 'passive', stats: { natureDmg: 'natureDmg' }, partial: 'poisonChance (no hero poison yet)' },
  lightningPower: { when: 'passive', stats: { lightningDmg: 'lightningDmg' }, partial: 'shockDur (no Shock status yet)' },
  arcanePower: { when: 'passive', stats: { arcaneDmg: 'arcaneDmg' }, partial: 'markDur (no Marks yet)' },
  holyPower: { when: 'passive', stats: { holyDmg: 'holyDmg', stagger: 'holyStagger' } },
  projPierce: { when: 'passive', stats: { pierce: 'pierce' } },
  markCap: { when: 'passive', stats: { markCap: 'markCap' }, partial: 'capped (Mark cap 5); Marks land in M4' },
  // amulet
  rFrostTag: { when: 'passive', stats: { rDmg: 'ultDmg' }, partial: 'the frost tag (tags land in M4)' },
  rCost: { when: 'passive', stats: { rCost: 'rCost' } },
  rFirstFree: { when: 'passive', stats: { rFirstCost: 'rFirstCost' }, flag: 'rFirstFree' },
  ultDmg: { when: 'passive', stats: { ultDmg: 'ultDmg' } },
  ultRadius: { when: 'passive', stats: { ultRadius: 'ultRadius' } },
  skillDmgFull: { when: 'passive', stats: { skillDmg: 'skillDmgFull' } },
  chargeOnDodge: { when: 'dodge', do(c, v, p) { p.ult = Math.min(100, p.ult + (v.chargeOnDodge || 0)); } },
  chargeOnKill: { when: 'kill', icd: 0, do(c, v, p) { p.ult = Math.min(100, p.ult + (v.chargeOnKill || 0)); } },
  mpOnR: { when: 'ultimate', do(c, v, p) { p.mp = Math.min(p.maxMp, p.mp + (v.mpOnR || 0)); } },
  critAfterR: { when: 'ultimate', do(c, v, p) { p.critR = { v: v.crit || 0, until: G.t + 6 }; } },
  // belt
  potionCleanse: { when: 'potion', icd: 0, do(c, v, p) { let n = v.potionCleanse || 1; for (const k of ['rootT', 'slowT', 'dreadT']) if (n > 0 && p[k] > 0) { p[k] = 0; n--; } } },
  killHeal: { when: 'passive', stats: { killHeal: 'killHeal' } },
  salvageDust: { when: 'passive', stats: { salvageDust: 'salvageDust' } },
  gemWrap: { when: 'passive' },   // recalcStats: p.wrap
  potionCap: { when: 'passive', stats: { potionCharge: 'potionCharge' } },
  dustOnKill: { when: 'kill', icd: 0, do(c, v, p) { if (enemyClassOf(c.e) !== 'normal') p.dust += v.dustOnElite || 0; } },
  flaskRegen: { when: 'potion', icd: 0, do(c, v, p) { for (let k = 1; k <= 4; k++) delay(k, () => { if (!p.dead) healPlayer(p, p.maxHp * (v.potionRegen || 0)); }); } },
  potionMp: { when: 'potion', icd: 0, do(c, v, p) { p.mp = Math.min(p.maxMp, p.mp + p.maxMp * (v.potionMp || 0)); } },
  dodgeIframe: { when: 'dodge', icd: 0, do(c, v, p) { const x = v.dodgeIframeDur || 0; if (p.dash && p.dash.opt.invuln) p.invulnT = Math.max(p.invulnT, p.dash.t + x); else if (p.invulnT > 0) p.invulnT += x; } },
  // origin rings (§17.1: the Origin passive is the starter ring's boon)
  originKnight: { when: 'passive', stats: { def: 'def' } },
  originMystic: { when: 'passive', stats: { mpOnHit: 'mpOnHit' } },
  originRanger: { when: 'passive', stats: { critDmg: 'critDmg' } },
  originWarrior: { when: 'passive', stats: { stagger: 'weaponStagger' } },
};
// trigger affixes (§19.1 suffixes, Epic+): onDodge heals v of max HP, onKill restores v of max MP
const AFFIX_EFFECTS = [
  { id: 'onDodge', src: 'affix', when: 'dodge', do(c, v, p) { healPlayer(p, p.maxHp * v); } },
  { id: 'onKill', src: 'affix', when: 'kill', do(c, v, p) { p.mp = Math.min(p.maxMp, p.mp + p.maxMp * v); } },
];
// unique rules on the bus (src 'unique', live while hasRule(p, id)): §30 Echo records every hand action / Q cast (when 'cast',
// emitted by useSkill and basicAttack; ctx = { p, c, slot, id, a, tx, ty }). Its replays never emit 'cast' (no echo of an echo).
const UNIQUE_EFFECTS = [
  { id: 'echo', src: 'unique', when: 'cast', icd: 0, name: 'Echo', hint: 'A spirit repeats your attacks', do(c, v, p) { echoRecord(p, c); } },
];
const EFFECTS = [], EFFECT_BY_ID = {}, EFFECTS_WHEN = {};
(function buildEffects() {
  const rows = [];
  if (typeof BOONS !== 'undefined') for (const slot in BOONS) for (const b of BOONS[slot]) rows.push(b);
  if (typeof ORIGIN_RINGS !== 'undefined') for (const o of ORIGIN_RINGS) rows.push(o.boon);
  for (const b of rows) {
    const impl = EFFECT_IMPL[b.id];
    const row = Object.assign({ id: b.id, src: 'trinket', when: null, icd: EFFECT_ICD, name: b.name, hint: b.text, tags: b.tags || [] }, impl || { dataOnly: true });
    EFFECTS.push(row); EFFECT_BY_ID[b.id] = row;
  }
  for (const r of AFFIX_EFFECTS) { const row = Object.assign({ icd: EFFECT_ICD, name: r.id, hint: '' }, r); EFFECTS.push(row); EFFECT_BY_ID['affix:' + r.id] = row; }
  for (const r of UNIQUE_EFFECTS) { EFFECTS.push(r); EFFECT_BY_ID['unique:' + r.id] = r; }
  for (const r of EFFECTS) if (r.do && r.when) (EFFECTS_WHEN[r.when] || (EFFECTS_WHEN[r.when] = [])).push(r);
})();
const boonLive = id => !!(EFFECT_BY_ID[id] && !EFFECT_BY_ID[id].dataOnly);
let FX_DEPTH = 0;
function emitEffects(when, ctx) {
  const p = G.player, list = EFFECTS_WHEN[when]; if (!p || !list || FX_DEPTH >= 2 || p.dead) return;
  const icd = p.fxIcd || (p.fxIcd = {});
  FX_DEPTH++;
  try {
    for (const r of list) {
      const vals = r.src === 'trinket' ? p.boons && p.boons[r.id] && p.boons[r.id].vals : r.src === 'unique' ? hasRule(p, r.id) || null : p.sum && p.sum[r.id];
      if (!vals) continue;
      if (r.icd && (icd[r.id] || -1e9) > G.t) continue;
      r.do(ctx, vals, p);
      if (r.icd) icd[r.id] = G.t + r.icd;
    }
  } finally { FX_DEPTH--; }
}
// ultimate cost (rCost boon: 80 or 90 charge instead of 100) and the first-R-in-a-fight discount (rFirstFree: free / half)
const ultCost = p => (p.sum && p.sum.rCost ? Math.min(100, p.sum.rCost) : 100);
function ultNeed(p, id) {
  let c = ultCost(p); if (id === 'chapter' && p.grip === 'grip_archmage') c = Math.min(c, 80);   // Archmage grip
  return p.boons && p.boons.rFirstFree && p.freeR ? (p.boons.rFirstFree.vals.rFirstFree ? 0 : c * (p.sum.rFirstCost || 1)) : c;
}
// a fight starts after FIGHT_GAP s with no damage dealt or taken (arms rFirstFree)
const FIGHT_GAP = 8;
function combatPing(p) { if (!p) return; if (G.t - (p.combatT != null ? p.combatT : -1e9) > FIGHT_GAP) p.freeR = true; p.combatT = G.t; }
// Loadout v3 slots (docs/design/loadout.md): lmb q qu = the HAND item (M1 action, Q spell, Shift+Q ultimate); rmb e eu = the
// OFFHAND item (M2 off-action, E spell, Shift+E ultimate); r f v = head, chest, boots (V = the dodge); z x c = pockets.
const SLOT_KEYS = ['q', 'qu', 'rmb', 'e', 'eu', 'r', 'f', 'v'];
const POCKET_KEYS = ['z', 'x', 'c'];
const isUlt = slot => slot === 'qu' || slot === 'eu';
const WEAPON_SLOTS = ['q', 'qu', 'e', 'eu'];   // item-line spells and ultimates (the Warrior ring's weapon stagger)
// the active deck entries of the worn companion (socketed pages / arrows, in order)
const deckEntries = p => { const it = p.equip.offhand; return it && isCompanion(it) && Array.isArray(it.pages) ? it.pages.filter(Boolean) : []; };
function deckClamp(p) { const n = deckEntries(p).length; p.deck = n ? ((p.deck | 0) % n + n) % n : 0; }
const deckActive = p => { const L = deckEntries(p); return L.length ? L[clamp(p.deck | 0, 0, L.length - 1)] : null; };
// the M2 off-action: the OFFHAND line's own action, or the class off-action of a 1H weapon worn there; with an empty OFFHAND a 1H
// HAND item lends its class off-action (x1.0); a two-hander alone has none (its hold-M1 is the action)
function offAction(p) {
  const off = p.equip.offhand, hand = p.equip.weapon;
  if (off) { const l = lineOf(off); return l ? (l.slot === 'weapon' ? CLASS_OFF[l.class] || null : l.action) : null; }
  if (hand && handsOf(hand) === 1) return CLASS_OFF[lineOf(hand).class] || null;
  return null;
}
// an empty slot grants nothing (§28 bare start): no HAND item -> no Q / Shift+Q, no OFFHAND item -> no E / Shift+E, no chest / helm ->
// no F / R; bare feet keep a short Roll on V (UNARMED.roll) so the dodge verb exists before the first boots (4:50)
function slotSkill(p, slot) {
  const hand = p.equip.weapon, off = p.equip.offhand;
  if (slot === 'q') return hand ? (hand.rule === 'stillhour' ? 'hush' : lineOf(hand).spell) : null;
  if (slot === 'qu') return hand ? lineOf(hand).ult : null;
  if (slot === 'rmb') return offAction(p);
  if (slot === 'e' || slot === 'eu') {
    if (!off) return null;
    const l = lineOf(off); if (!l) return null;
    if (slot === 'eu') return l.role === 'companion' && !deckEntries(p).length ? null : l.ult;
    if (l.slot === 'weapon' && off.rule === 'stillhour') return 'hush';
    return l.role === 'companion' ? deckActive(p) : l.spell;
  }
  if (slot === 'f') return p.equip.chest ? item('chest', p.gear.chest).skill : null;
  if (slot === 'r') return p.equip.head ? item('head', p.gear.head).skill : null;
  if (slot === 'v') return p.equip.boots ? item('boots', p.gear.boots).skill : UNARMED.roll;
  return null;
}
// the bare-handed hero (§28): LMB is a shove (1 damage, a little knockback, no skills), SHIFT a barefoot roll
const UNARMED = { name: 'Bare hands', kind: 'unarmed', element: 'slash', basic: { name: 'Shove', dmg: 1, rate: 0.5 }, roll: 'roll' };
const weaponOf = p => (p.equip.weapon ? item('weapon', p.gear.weapon) : UNARMED);
// the OFFHAND item's tier index (Buckler reflects projectiles from T3 = index 2)
const offTier = p => (p.equip.offhand ? p.equip.offhand.tier | 0 : -1);
// ===== skill casting: ultimate charge, dodge-cancel, ranks and modifiers (docs/design/loadout.md) ===================
const SLOT_ACTION = { lmb: 'attack', q: 'skillQ', qu: 'ultQ', rmb: 'offhand', e: 'skillE', eu: 'ultE', r: 'skillR', f: 'skillF', v: 'dodge', z: 's1', x: 's2', c: 's3' };
const CANCEL_AFTER = 0.1;            // dodge cancels a cast only after its first 0.1 s (buffered until then)
const RANK_HITS = 25, RANK_MAX = 5, RANK_BONUS = 0.06;
// Every cast — skills AND basic attacks — carries ONE mutable ctx, created in useSkill / basicAttack and threaded
// (via CAST -> delays, projectiles, zones, dashes) into every hit it produces: damageEnemy reads cast.ctx.
//   ctx = { dmg, r, stun, slow, burn, cd, mp, dur (multipliers), extraProj, count, stagger, element, rank, onHit:[] }
// onHit[] = fn(enemy, dmg, opts) called per hit (the M4 EFFECTS layer hooks here). Single call sites for M4's bus:
// cast = useSkill / basicAttack, dodge = useSkill(slot 'v'), hit = damageEnemy, kill = killEnemy.
// (Loadout v3 removed the modifier slots: a skill's numbers change only with mastery ranks, tier and rarity.)
// applyStatus(e, id, dur, el): every status source lands through STATUS.apply (status.js: it writes the live field the rules
// run on - burnT, stunT + frozen, slowT, dreadT, rootT - and keeps the status's max / element for the status layers). The
// caller keeps its own max / overwrite rule (dur is the field's new value). Without status.js (node tools) the field alone.
function applyStatus(e, id, dur, el) {
  if (typeof STATUS !== 'undefined') return STATUS.apply(e, id, dur, 0, el);
  const f = { burning: 'burnT', frozen: 'stunT', chilled: 'slowT', dread: 'dreadT', rooted: 'rootT' }[id];
  if (f) { e[f] = dur; if (id === 'frozen') e.frozen = 1; }
  return !!f;
}
const newCtx = (element, stagger = 0, rank = 1) => ({ dmg: 1, r: 1, stun: 1, slow: 1, burn: 1, cd: 1, mp: 1, dur: 1, extraProj: 0, count: 1, stagger, element, rank, onHit: [] });
const skillRank = (p, id) => Math.min(RANK_MAX, 1 + Math.floor(((p.ranks[id] && p.ranks[id].hits) || 0) / RANK_HITS));
const skillRankBonus = (p, id) => RANK_BONUS * (skillRank(p, id) - 1);
function skillRankProgress(p, id) {
  const hits = (p.ranks[id] && p.ranks[id].hits) || 0, rank = skillRank(p, id);
  return { rank, hits, max: rank >= RANK_MAX, into: rank >= RANK_MAX ? RANK_HITS : hits - (rank - 1) * RANK_HITS, need: RANK_HITS, frac: rank >= RANK_MAX ? 1 : (hits - (rank - 1) * RANK_HITS) / RANK_HITS, bonus: skillRankBonus(p, id) };
}
// numbers-only cast context: the rank bonus lives in damageEnemy's additive sum
const skillCtx = (p, id, s) => newCtx(s.element, s.stagger || 0, skillRank(p, id));
const castR = () => (CAST && CAST.ctx ? CAST.ctx.r : 1);
function addSkillHit(p, id) {
  const r = p.ranks[id] || (p.ranks[id] = { hits: 0 }), before = skillRank(p, id);
  if (before >= RANK_MAX) return;
  r.hits++;
  const after = skillRank(p, id);
  if (after > before) {
    const sk = SKILLS[id], msg = `${sk.name} — Rank ${after}`;
    say(msg); sfx('levelup');
    if (typeof UI !== 'undefined') UI.toast({ text: msg, icon: typeof skillIcon === 'function' ? skillIcon(id) : null, col: '#ffd35a' });
  }
}
// ultimate charge: fed by the pre-multiplier damage of every hit (level-independent), reactions x2 (M4)
// §20.5: a single hit adds at most 5 % charge, a reaction hit at most 10 %
// chargeSpeed (amulet implicits, affixes) joins the diamond bonus as one additive charge-rate sum
const ultGain = (p, base, reaction) => Math.min(reaction ? 10 : 5, base * G.tune.player.ultRate * (reaction ? 2 : 1) * (1 + ultChargeBonus(p) + ((p.sum && p.sum.chargeSpeed) || 0)));
// §20.5 MP builder: per weapon family, basic attacks only, ONCE per swing (not per target), hard cap 40 MP/s from
// hits over a rolling 1 s window. Values ~ swing time so every family builds ~15-23 MP/s on basics
// (sword 8 / 0.42 s, staff 9 / 0.48 s, bow 7 / 0.36 s, daggers 6 / 0.28 s, two-hander 14 / 0.62 s).
const MP_ON_HIT = { sword: 8, staff: 9, bow: 7, daggers: 6, dagger: 6, twohander: 14 };   // the hand action builds MP (loadout.md)
const MP_HIT_CAP = 40;
function basicMpGain(p, c) {
  if (p.hush) return;   // Hush: no MP from hits
  if (c && c.basic) { if (c.mpDone) return; c.mpDone = true; }
  const w = weaponOf(p), g0 = MP_ON_HIT[w && w.kind] != null ? MP_ON_HIT[w.kind] : G.tune.player.mpOnHit;
  const gain = Math.round(g0 * (1 + ((p.sum && p.sum.mpOnHit) || 0)));   // +x % MP on hit (Linen Robe implicit, Mystic origin ring)
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
  const s = SKILLS[id], ult = isUlt(slot), dodge = slot === 'v', off = slot === 'rmb', deck = slot === 'e' && isCompanion(p.equip.offhand);
  if (id === 'hush' && p.hush) { hushEnd(p, 'toggle'); return true; }   // Hush is a toggle: the second press ends it
  const ck = s.cdKey || id;   // a shared cooldown key (every parry source shares the 1 s parry ICD)
  if ((p.cds[ck] || 0) > 0 || p.rootT > 0) return false;
  if (deck && (p.cds.__page || 0) > 0) return false;   // pages / arrows share one 1.0 s casting rhythm
  if ((s.st || 0) > p.st) { say('Not enough stamina'); return false; }
  if (dodge && castActive(p)) {
    if (p.cast.age < CANCEL_AFTER) { p.dodgeBuf = CANCEL_AFTER - p.cast.age + 0.02; return false; }   // buffered
    cancelCast(p);
  }
  if (p.dash) return false;
  const need = ult ? ultNeed(p, id) : 0;   // 100, or the amulet's rCost / first-ultimate-of-a-fight discount, the Archmage Chapter 80
  if (ult && p.ult < need) { if (!G.ultWarnT || G.t > G.ultWarnT) { say('Ultimate is still charging'); G.ultWarnT = G.t + 1.2; } return false; }
  const ctx = skillCtx(p, id, s), mp = off ? 0 : Math.round((s.mp || 0) * ctx.mp);   // an off-action costs stamina, never MP
  if (ult && p.sum && p.sum.ultRadius) ctx.r *= 1 + p.sum.ultRadius * 0.4;   // amulet ultRadius: +1 tile on a ~2.5-tile ultimate
  if (mp > p.mp) { say('Not enough mana'); return false; }
  p.mp -= mp; p.st -= s.st || 0;
  // ultimates use the charge bar instead of a cooldown (a short lockout stops double-casts)
  if (ult) { p.ult = Math.max(0, p.ult - need); if (p.freeR && p.boons && p.boons.rFirstFree) p.freeR = false; p.cds[ck] = p.cdm[ck] = 0.5; }
  else p.cds[ck] = p.cdm[ck] = s.cd * ctx.cd * (off ? 1 : 1 - Math.min(capsT().cdr, p.cdr));
  if (deck) p.cds.__page = p.cdm.__page = PAGE_LOCK;
  if (p.swing && p.atkT > 0) p.swing = null;   // attacks cancel into skills
  if (id === 'sunslash' && p.vanguardT > G.t) { ctx.dmg *= 1.4; p.vanguardT = 0; }   // Vanguard grip: a parry primed Sunslash
  if (deck && p.grip === 'grip_archmage') ctx.dmg *= ARCHMAGE_PAGE;   // Archmage grip: pages hit harder
  // off-actions never feed the charge; the Bow + Quiver grip: a loosed arrow is a focused shot (always crits)
  const c = { skill: id, el: ctx.element, slot, ctx, hit: false, noCharge: off, deck, crit: deck && p.grip === 'grip_bow_quiver' };
  const n0 = G.delays.length, a0 = p.aim, tx0 = G.mouse.wx, ty0 = G.mouse.wy, x0 = p.x, y0 = p.y;
  withCast(c, () => s.cast(p, a0, tx0, ty0));
  emitEffects('cast', { p, c, slot, id, a: a0, tx: tx0, ty: ty0, x: x0, y: y0 });   // §30: the cast hook (Echo records lmb / q only)
  if (id === 'orbit') p.orbitCast = c;
  if (dodge) emitEffects('dodge', { p, c }); else if (ult) emitEffects('ultimate', { p, c });
  let dur = Math.max(0, p.castT, p.swing ? p.swing.dur - p.swing.t : 0);
  for (let i = n0; i < G.delays.length; i++) if (G.delays[i].c === c) dur = Math.max(dur, G.delays[i].t);
  if (p.dash && p.dash.cast === c) dur = Math.max(dur, p.dash.t);
  p.cast = dodge || off ? null : { c, id, slot, age: 0, dur: Math.min(1.5, dur), mp };
  G.lastCast = { slot, t: 0.25 };
  if (slot === 'q') hudNoun('skill');   // §28: the first Q brings the offhand chips in
  if (!dodge && typeof aimFlash === 'function' && (G.touch || (IN.aimMode && IN.aimMode() !== 'off'))) aimFlash(id, slot);   // quick-cast: 1-frame flash of the shape at the target
  return true;
}
function say(s) { G.msg = { s, t: 1.6 }; }
// ===== off-actions and shields (docs/design/loadout.md slot matrix, "Shields") ======================================================
// Parry: a window (Blades 0.25 s, +0.1 s with a Blades OFFHAND item = the class off-passive; Buckler Parry+ 0.35 s). A hit inside it
// is negated and the nearest enemy to the hit's source is riposted (stagger 3, stun). One ICD for every parry source (1 s: the
// shared `parry` cooldown key). A Buckler parry from T3 reflects projectiles. Aegis: every hit is parried for 3 s and each parry
// restores 10 % HP. The Vanguard grip: a parry primes Sunslash (+40 %).
const PARRY = { blades: 0.25, buckler: 0.35, bladesOff: 0.1, riposte: 70, stagger: 3, stun: 0.6, aegisHeal: 0.1 };
function startParry(p, win, o = {}) {
  const off = p.equip.offhand, bl = off && lineOf(off) && lineOf(off).class === 'blades' ? PARRY.bladesOff : 0;
  p.parry = { until: G.t + win + bl, reflect: !!o.reflect, t0: G.t };
  swingWeapon(p, 0.14, 1.2, 1); fx({ type: 'ring', x: p.x, y: p.y, r: 0.9, col: '#fff2b0', life: 0.18 }); sfx('shield');
}
const parrying = p => !!(p.buffs.aegis || (p.parry && p.parry.until > G.t));
function parried(p, sx, sy) {
  G.lastParry = { t: G.t, n: (G.lastParry ? G.lastParry.n : 0) + 1 };
  if (p.parry) p.parry.until = 0;
  if (p.buffs.aegis) healPlayer(p, p.maxHp * PARRY.aegisHeal);
  if (p.grip === 'grip_vanguard') p.vanguardT = G.t + 4;
  p.invulnT = Math.max(p.invulnT, 0.2);
  const e = nearestEnemy(sx != null ? sx : p.x, sy != null ? sy : p.y, 3, null);
  const c = { skill: null, el: 'slash', slot: 'rmb', ctx: newCtx('slash', PARRY.stagger), noCharge: true, riposte: true };
  if (e) withCast(c, () => damageEnemy(e, PARRY.riposte, { stagger: PARRY.stagger, stun: PARRY.stun, knock: 0.6, cast: c }));
  fx({ type: 'ring', x: p.x, y: p.y, r: 1.3, col: '#ffffff', life: 0.25 }); burst(p.x, p.y, p.z + 1.2, 12, ['#ffffff', '#fff2b0'], 3); sfx('heavy'); shake(3);
}
function tryParry(p, sx, sy) { if (!parrying(p)) return false; parried(p, sx, sy); return true; }
// an enemy projectile touching the hero during a reflecting parry flies back (reflected damage <= 40 % of power, loadout.md caps)
function parryReflect(p, q) {
  if (!parrying(p)) return false;
  const refl = p.buffs.aegis || (p.parry && p.parry.reflect);
  parried(p, q.x, q.y);
  if (!refl) { q.dead = true; return true; }
  q.friendly = true; q.reflected = true; q.vx = -q.vx; q.vy = -q.vy; q.t = 0; q.life = 1.2; q.hit = new Set(); q.pierce = 0;
  q.dmg = Math.min(q.dmg, p.power * 0.4 / Math.max(0.01, p.dmgBase)); q.cast = { skill: null, el: q.el || 'slash', slot: 'rmb', ctx: newCtx(q.el || 'slash'), noCharge: true, reflected: true };
  return true;
}
// ===== companions = decks (Grimoire pages, Quiver arrows) ===================================================================
function deckNext(p) { const n = deckEntries(p).length; if (n) p.deck = ((p.deck | 0) + 1) % n; }
// the ultimate: every entry over 1.5 s (Chapter / Quiver Storm), free of MP, at the cast's aim
const ARCHMAGE_PAGE = 1.2;   // the Archmage grip (Staff + Grimoire): a page (E, or read by Chapter) deals +20%
function deckAll(p, a, tx, ty) {
  const L = deckEntries(p), c = CAST; if (!L.length) return;
  L.forEach((id, i) => delay(i * 1.5 / L.length, () => { const s = SKILLS[id]; if (!s || p.dead) return; const cc = Object.assign({}, c, { skill: id, el: s.element, ctx: newCtx(s.element, s.stagger || 0) }); if (p.grip === 'grip_archmage') cc.ctx.dmg *= ARCHMAGE_PAGE; withCast(cc, () => s.cast(p, p.aim, G.mouse.wx, G.mouse.wy)); }));
  fx({ type: 'ring', x: p.x, y: p.y, r: 1.4, col: SKILLS[c && c.skill] ? SKILLS[c.skill].color : '#c79bff', life: 0.4 }); sfx('arcane');
}
// ===== Hush (The Stopped Hour, rule `stillhour`; docs/design/combat-feel.md) ======================================================
// A toggle: 30 MP to start (the skill's mp), then 60 MP per REAL second. Ends on a second press, 0 MP, hero death, boss-death
// slow-mo or a map change; then a 3 s cooldown. While on: no MP from hits, ultimate charge x0.5, MP regen stops, hero damage x0.6,
// G.timeScale eases to 0.25 over 0.15 s. Never saved (p.hush is runtime only).
const HUSH = { scale: 0.25, drain: 60, cd: 3, dmg: 0.6, charge: 0.5, ease: 0.15 };
function hushStart(p) { p.hush = { t0: G.t }; G.hushLog = { start: G.t, mp: p.mp }; sfx('veil'); fx({ type: 'ring', x: p.x, y: p.y, r: 3, col: '#bcd0ff', life: 0.5 }); }
function hushEnd(p, why) {
  if (!p || !p.hush) return;
  p.hush = null; p.cds.hush = p.cdm.hush = HUSH.cd;
  if (why === 'death' || why === 'map') G.timeScale = 1;   // no ease across a death or a map change
  G.hushLog = Object.assign(G.hushLog || {}, { end: G.t, why });
  sfx('blink');
}
function updateHush(p, dt) {
  if (p.hush) { p.mp -= HUSH.drain * dt; if (p.mp <= 0) { p.mp = 0; hushEnd(p, 'mp'); } }
  if (G.timeScale == null) G.timeScale = 1;
  const goal = p.hush ? HUSH.scale : 1, k = (1 - HUSH.scale) / HUSH.ease * dt;
  G.timeScale = G.timeScale < goal ? Math.min(goal, G.timeScale + k) : Math.max(goal, G.timeScale - k);
}
// temporary buffs stay multiplicative but cap at 1.6x (bless x surge x focus was 2.37x)
const buffMul = p => Math.min(1.6, (p.buffs.bless ? 1.4 : 1) * (p.buffs.surge ? 1.3 : 1) * (p.buffs.focus ? 1.3 : 1));
function addBuff(p, id, t) { p.buffs[id] = { t, max: t }; }
function healPlayer(p, n) { p.hp = Math.min(p.maxHp, p.hp + n); text(p.x, p.y, p.z + 3, '+' + Math.round(n), '#8fffa8'); }
function swingWeapon(p, dur, arc, dir) { p.swing = { t: 0, dur, arc, dir: dir || (Math.random() < 0.5 ? 1 : -1) }; }
function castAnim(p, t = 0.25) { p.castT = t; }

// ===== §30 Echo: the spirit clone (unique rule 'echo', a weapon legendary) ===================================================
// An after-image, not a pet: every hand action / Q spell cast is recorded ({ skill, slot, aim, target offset, ctx }) by the 'cast' bus
// row and replayed ECHO.delay s later through the SAME cast function, from where the hero stood ECHO.frames fixed steps ago
// (a Float32Array ring, written only on steps that advance time), under a cast with src 'echo' (damageEnemy's guard).
// The caster handed to the cast function is G.echo.g = Object.create(hero): reads fall through to the hero's stats, every
// write (swing, castT, combo, dash, buffs, mp) lands on the spirit, so a replayed dash or blink never moves the hero.
// Never an ultimate, a page or the offhand (the cast row only takes lmb / q). No MP, cooldown or charge cost, never targeted, no summon counters.
// State lives on G.echo (never saved); it resets when the hero, the map or the rule changes.
const ECHO = { k: 0.3, floor: 0.3, a0: 0.2, full: 0.4, delay: 0.4, queue: 4, idle: 2, frames: 24, fadeIn: 0.12, fadeOut: 0.5, els: ['fire', 'frost', 'nature', 'lightning', 'arcane', 'holy'] };
const ECHO_RS = 6;   // ring stride: x, y, z, face, flags (1 back, 2 moving, 4 dashing), walkT
function echoState(p) {
  let E = G.echo;
  if (!E || E.p !== p || E.map !== G.map) {
    const g = Object.create(p);
    Object.assign(g, { echo: true, swing: null, castT: 0, spin: 0, atkT: 0, combo: 0, dash: null, buffs: {}, cds: {}, invulnT: 0, slowT: 0, rootT: 0, hurtT: 0, moving: false, back: false, face: p.face, walkT: 0, mp: p.mp, st: p.st });
    E = G.echo = { p, map: G.map, ring: new Float32Array(ECHO.frames * ECHO_RS), i: 0, n: 0, q: [], g, alive: false, age: 0, idleT: 0, alpha: 0, el: 'arcane', count: 0, log: [] };
  }
  return E;
}
// the echo's damage type (§30 "retyped to magic"): argmax of the element % bonuses (gear %Dmg + gem amplification), arcane by default
function echoElement(p) {
  let best = 'arcane', bv = 1e-9;
  for (const el of ECHO.els) { const v = echoAmpOf(p, el); if (v > bv) { bv = v; best = el; } }
  return best;
}
// focus scaling (the §30 balsim gate; see ECHO): the echo runs at `floor` strength until the hero's top element bonus A
// passes a0, and at full strength from `full` up (linear between). Final damage x k alone cannot separate a focused build
// (+25-30 %) from an unfocused one (<= +15 %): both land at ~ k x the non-R share of the rotation.
const echoAmpOf = (p, el) => ((p.sum && p.sum[el + 'Dmg']) || 0) + elementAmp(p, el);
const echoFocus = (p, el) => ECHO.floor + (1 - ECHO.floor) * clamp((echoAmpOf(p, el) - ECHO.a0) / (ECHO.full - ECHO.a0), 0, 1);
function echoRecord(p, cx) {
  const slot = cx.slot; if ((slot !== 'lmb' && slot !== 'q') || cx.id === 'hush') return;   // the hand action and the Q spell only (never ultimates, pages, offhand)
  if (!cx.c || cx.c.src === 'echo') return;
  const E = echoState(p), ctx = cx.c.ctx || null;
  E.q.push({ t: ECHO.delay, fresh: true, id: cx.id, slot, basic: slot === 'lmb', a: cx.a, dx: (cx.tx != null ? cx.tx : cx.x) - cx.x, dy: (cx.ty != null ? cx.ty : cx.y) - cx.y, combo: cx.combo || 0, ctx });
  if (E.q.length > ECHO.queue) E.q.shift();   // at most 4 queued; the oldest is dropped
}
function echoReplay(p, E, r) {
  const g = E.g, el = E.el = echoElement(p);
  const ctx = Object.assign(newCtx(el), r.basic || !r.ctx ? null : r.ctx, { onHit: [], element: el, src: 'echo' });
  ctx.dmg = (r.ctx && isFinite(r.ctx.dmg) ? r.ctx.dmg : 1) * ECHO.k * (E.focus = echoFocus(p, el));
  const c = { skill: r.basic ? null : r.id, basic: r.basic, el, slot: r.slot, ctx, hit: true, src: 'echo', mpDone: true, caster: g };
  g.aim = r.a; g.face = Math.cos(r.a) - Math.sin(r.a) >= 0 ? 1 : -1; g.swing = null; g.castT = 0; g.atkT = 0; g.dash = null; g.combo = r.combo;
  const tx = g.x + r.dx, ty = g.y + r.dy;
  try { withCast(c, () => { if (r.basic) basicSwing(g, weaponOf(p)); else if (SKILLS[r.id]) SKILLS[r.id].cast(g, r.a, tx, ty); }); }
  catch (err) { console.warn('echo replay', r.id, err); }
  if (!E.alive) { E.alive = true; E.age = 0; }
  E.idleT = 0; E.count++; E.log.push(r.basic ? 'lmb' : r.id); if (E.log.length > 12) E.log.shift();
}
function updateEcho(p, dt) {
  if (!hasRule(p, 'echo') || p.dead) { if (G.echo) G.echo = null; return; }
  const E = echoState(p), R = ECHO_RS, F = ECHO.frames, ring = E.ring, g = E.g;
  // read the oldest entry (where the hero stood F time-advancing steps ago) BEFORE this step overwrites it
  if (E.n) { const k = (E.n < F ? 0 : E.i) * R; g.x = ring[k]; g.y = ring[k + 1]; g.z = ring[k + 2]; g.face = ring[k + 3] || 1; g.back = !!(ring[k + 4] & 1); g.moving = !!(ring[k + 4] & 2); g.dashing = !!(ring[k + 4] & 4); g.walkT = ring[k + 5]; }
  else { g.x = p.x; g.y = p.y; g.z = p.z; g.face = p.face; }
  if (dt > 0) {   // one ring entry per time-advancing fixed step (a hitlag freeze does not shorten the 0.4 s lag)
    const j = E.i * R; ring[j] = p.x; ring[j + 1] = p.y; ring[j + 2] = p.z; ring[j + 3] = p.face; ring[j + 4] = (p.back ? 1 : 0) | (p.moving ? 2 : 0) | (p.dash ? 4 : 0); ring[j + 5] = p.walkT || 0;
    E.i = (E.i + 1) % F; if (E.n < F) E.n++;
  }
  // the spirit's own cast timers (a replayed swing / cast pose / spin)
  if (g.swing) { g.swing.t += dt; if (g.swing.t > g.swing.dur) g.swing = null; }
  g.castT -= dt; g.spin -= dt; g.atkT -= dt;
  for (const b in g.buffs) { g.buffs[b].t -= dt; if (g.buffs[b].t <= 0) delete g.buffs[b]; }
  if (g.dash) {   // a replayed dash rides the recorded path (the ring) and keeps its hit test and onEnd
    const d = g.dash; d.t -= dt;
    if (d.opt.hit) for (const e of G.enemies) {
      if (e.dead || d.hit.has(e) || e.spawnT > 0) continue;
      if (dist(g.x, g.y, e.x, e.y) < d.opt.hit.r + e.r) { d.hit.add(e); damageEnemy(e, d.opt.hit.dmg, { knock: d.opt.hit.knock, cast: d.cast }); }
    }
    if (d.t <= 0) { g.dash = null; if (d.opt.onEnd) withCast(d.cast, d.opt.onEnd); }
  }
  for (const r of E.q) if (r.fresh) r.fresh = false; else r.t -= dt;   // a cast recorded this step starts counting next step
  while (E.q.length && E.q[0].t <= 1e-9) echoReplay(p, E, E.q.shift());
  if (E.alive) {
    E.age += dt; if (!E.q.length && !g.dash) E.idleT += dt;   // idle = time since the last replay
    if (E.idleT >= ECHO.idle) { E.alive = false; E.alpha = 0; }
    else E.alpha = Math.min(1, E.age / ECHO.fadeIn) * Math.min(1, (ECHO.idle - E.idleT) / ECHO.fadeOut);
  }
}

function basicAttack(p) {
  if (p.atkT > 0 || p.dash || p.dead || p.rootT > 0 || castActive(p)) return;   // skills never cancel into attacks
  const w = weaponOf(p);
  // basic attacks are casts too (skill: null, basic: true) so their hits carry a ctx; they build MP on hit
  const c = { skill: null, basic: true, el: w.element || 'slash', slot: 'lmb', ctx: newCtx(w.element || 'slash') }, combo = p.combo, a0 = p.aim;
  if (w.hold === 'focus' && p.focusReady) { c.crit = true; p.focusReady = false; p.holdT = 0; }   // Bow Focus: the shot after 0.6 s still crits
  if (p.nocked > G.t && (w.kind === 'bow' || w.kind === 'staff')) { c.ctx.dmg *= 1.4; c.nock = true; p.nocked = 0; }   // Quiver Nock primes the next shot
  withCast(c, () => basicSwing(p, w));
  emitEffects('cast', { p, c, slot: 'lmb', id: null, a: a0, tx: G.mouse.wx, ty: G.mouse.wy, x: p.x, y: p.y, combo });
}
function basicSwing(p, w) {
  const a = p.aim;
  p.atkT = w.basic.rate / (1 + p.haste);
  if (w.kind === 'unarmed') {   // §28: a short two-handed shove, the empty hands' only verb
    swingWeapon(p, 0.14, 1.2, 1);
    hitCone(p.x, p.y, a, 1.4, 1.1, w.basic.dmg, { knock: 0.35 });
    fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.1, r: 0.9, col: '#f2e6ff', life: 0.14, w: 2, dir: 1 });
    sfx('swing');
  } else if (w.kind === 'daggers') {   // Shadows: a 4-hit combo, the 4th a crossing double cut
    p.combo = (p.combo + 1) % 4;
    const big = p.combo === 3;
    swingWeapon(p, 0.12, big ? 2.0 : 1.4, p.combo % 2 ? -1 : 1);
    hitCone(p.x, p.y, a, big ? 1.8 : 1.3, big ? 1.5 : 1.3, w.basic.dmg * (big ? 1.5 : 1), { knock: big ? 0.3 : 0.08 });
    fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: big ? 2 : 1.4, r: big ? 1.5 : 1.3, col: '#d6c8ff', life: 0.14, w: big ? 3 : 2, dir: p.combo % 2 ? -1 : 1 });
    sfx('swing');
  } else if (w.kind === 'sword') {
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
    spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 16, r: 0.25, dmg: w.basic.dmg, life: 0.65, kind: 'arrow', col: CAST && CAST.crit ? '#fff2b0' : '#e7eeff', pierce: CAST && CAST.nock ? 1 : 0 });
    sfx('bow');
  }
}
// ===== hold-M1 (weapons-and-skills.md class profile): Staff Channel (tap = bolt, held past the swing rate = a beam at bolt DPS
// x 1.15), Bow Focus (standing still 0.6 s: the next shot crits), Greatarms Heavy Strike (no live variant in M4a). p.holdCharge 0..1
// feeds the touch charge ring.
const CHANNEL = { tick: 0.24, mul: 1.15, len: 7.5, w: 0.45 };
function holdAttack(p, dt, held) {
  const w = weaponOf(p);
  if (!held || p.dead || !w.hold) { p.holdT = 0; p.holdCharge = w.hold === 'focus' ? p.holdCharge : 0; if (w.hold === 'focus' && (p.moving || p.dead)) { p.holdCharge = 0; p.focusReady = false; } if (p.channel) p.channel = null; return false; }
  p.holdT += dt;
  if (w.hold === 'focus') {
    p.stillT = p.moving ? 0 : (p.stillT || 0) + dt;
    p.holdCharge = clamp(p.stillT / 0.6, 0, 1); if (p.stillT >= 0.6) p.focusReady = true;
    return false;   // the bow keeps firing; Focus only crits the next shot
  }
  if (w.hold === 'channel') {
    const rate = w.basic.rate / (1 + p.haste);
    p.holdCharge = clamp(p.holdT / rate, 0, 1);
    if (p.holdT < rate) return false;   // a tap is the bolt
    const C = p.channel || (p.channel = { t: 0, n: 0 });
    C.t -= dt; if (C.t > 0 || p.dash || castActive(p) || p.rootT > 0) return true;
    C.t = CHANNEL.tick; C.n++;
    const a = p.aim, c = { skill: null, basic: true, el: w.element, slot: 'lmb', ctx: newCtx(w.element), mpDone: C.n % 2 === 0, channel: true };
    c.ctx.dmg = CHANNEL.mul * CHANNEL.tick / w.basic.rate;   // the beam's DPS = the bolt's x 1.15
    withCast(c, () => { castAnim(p, CHANNEL.tick); hitLine(p.x, p.y, a, CHANNEL.len, CHANNEL.w, w.basic.dmg, { knock: 0.05 }); fx({ type: 'beam', x: p.x, y: p.y, z: p.z + 1.6, ang: a, len: CHANNEL.len, col: '#9fe8ff', life: CHANNEL.tick }); });
    if (C.n % 4 === 1) sfx('arcane');
    return true;
  }
  return false;
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

// movement with tile + collider collision (colliders come from the 8x8-tile buckets, maps.js nearColliders)
const MOVE_NEAR = [];
// Probes: 4 points at 0.8 r (E, W, S, N), tested against h0 = the height of the tile under the centre.
// B1 (QA wedge): h0 changes when the centre crosses a tile edge, so on a stair (0 -> 1 -> 2) an entity can legally stand
// on the 1-high step with a probe over a 2-high bank, step down to 0, and find that probe now "illegal" (|2 - 0| > 1).
// The old rule (every probe must pass at the NEW position) then refused every direction, the dodge included: a wedge.
// Rule now: a move may not make a passing probe fail, and may not push a probe that already fails further into its tile;
// sliding along or backing away from such an edge is allowed, so an entity can always walk out of the overlap.
const probeMask = (m, x, y, r, h0) => (walkable(m, x + r, y, h0) ? 1 : 0) | (walkable(m, x - r, y, h0) ? 2 : 0) | (walkable(m, x, y + r, h0) ? 4 : 0) | (walkable(m, x, y - r, h0) ? 8 : 0);
function moveOk(m, ox, oy, x, y, r, h0) {
  if (!walkable(m, x, y, h0) && walkable(m, ox, oy, h0)) return false;
  const base = probeMask(m, ox, oy, r, h0), k = probeMask(m, x, y, r, h0);
  if ((k & base) !== base) return false;
  if (base === 15) return true;
  const dx = x - ox, dy = y - oy;
  return !((!(base & 1) && dx > 0) || (!(base & 2) && dx < 0) || (!(base & 4) && dy > 0) || (!(base & 8) && dy < 0));
}
function moveEntity(o, dx, dy, h0) {
  const m = G.map, r = o.r * 0.8;
  const ok = (x, y) => moveOk(m, o.x, o.y, x, y, r, h0);
  if (dx && ok(o.x + dx, o.y)) o.x += dx;
  if (dy && ok(o.x, o.y + dy)) o.y += dy;
  MOVE_NEAR.length = 0;
  for (const c of (typeof nearColliders === 'function' ? nearColliders(m, o.x, o.y, o.r + Math.abs(dx) + Math.abs(dy), MOVE_NEAR) : m.colliders)) {   // spatial grid (maps.js)
    if (Math.abs(c.z - (o.z || 0)) > 1.5) continue;
    const d = dist(o.x, o.y, c.x, c.y), min = c.r + o.r;
    if (d < min && d > 0.0001) {
      const nx = c.x + (o.x - c.x) / d * min, ny = c.y + (o.y - c.y) / d * min;
      if (ok(nx, ny)) { o.x = nx; o.y = ny; }
    }
  }
}

// Unstick safety (B1 follow-up): movement input held for UNSTICK_T s with zero displacement AND no direction that would
// move the hero (a probe step in 8 directions; pushing into a plain wall still leaves the other directions open) ->
// nudge to the nearest tile centre where the hero fits (4 probes at that tile's height, no collider).
const UNSTICK_T = 1.5;
function canBudge(o, h0) {
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, q = { x: o.x, y: o.y, z: o.z, r: o.r };
    moveEntity(q, Math.cos(a) * 0.08, Math.sin(a) * 0.08, h0);
    if (Math.abs(q.x - o.x) + Math.abs(q.y - o.y) > 1e-4) return true;
  }
  return false;
}
function nearestFreeTile(m, x, y, r, R = 5) {
  const fits = (cx, cy) => {
    const h = tileH(m, cx, cy);
    if (!walkable(m, cx, cy, h) || probeMask(m, cx, cy, r * 0.8, h) !== 15) return false;
    for (const c of nearColliders(m, cx, cy, r)) if (Math.abs(c.z - h) <= 1.5 && dist(cx, cy, c.x, c.y) < c.r + r) return false;
    return true;
  };
  let best = null, bd = 1e9;
  const i0 = Math.floor(x), j0 = Math.floor(y);
  for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) {
    const cx = i + 0.5, cy = j + 0.5, d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bd && fits(cx, cy)) { bd = d; best = { x: cx, y: cy }; }
  }
  return best;
}
function unstickPlayer(p, moved, dt, h0) {
  if (moved > 1e-4) { p.stuckT = 0; return false; }
  p.stuckT = (p.stuckT || 0) + dt;
  if (p.stuckT < UNSTICK_T) return false;
  p.stuckT = 0;
  if (canBudge(p, h0)) return false;   // just walking into a wall
  const t = nearestFreeTile(G.map, p.x, p.y, p.r); if (!t) return false;
  p.x = t.x; p.y = t.y; p.z = tileH(G.map, t.x, t.y); p.unstuck = (p.unstuck || 0) + 1;
  burst(p.x, p.y, p.z + 0.5, 10, ['#e7e0ff', '#ffffff'], 2);
  return true;
}

function updatePlayer(p, dt) {
  const m = G.map;
  for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
  for (const k in p.buffs) { p.buffs[k].t -= dt; if (p.buffs[k].t <= 0) delete p.buffs[k]; }
  p.atkT -= dt; p.invulnT -= dt; p.hurtT -= dt; p.castT -= dt; p.rootT -= dt; p.slowT -= dt; p.spin -= dt; if (p.dreadT > 0) p.dreadT -= dt;
  if (p.dead) return;
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt + (p.buffs.mend ? p.maxHp * 0.25 / 4 * dt * healMul(p) : 0));
  if (!p.hush) p.mp = Math.min(p.maxMp, p.mp + p.mpRegen * dt);   // Hush stops MP regen
  p.st = Math.min(p.maxSt, p.st + 22 * dt);
  updateHush(p, dt);
  if (p.swing) { p.swing.t += dt; if (p.swing.t > p.swing.dur) p.swing = null; }
  if (p.cast) { p.cast.age += dt; if (p.cast.age >= p.cast.dur) p.cast = null; }
  for (const k of ['slowT', 'rootT']) { if (p[k] > 0) { if (!(p.stMax[k] > 0) || p[k] > p.stMax[k]) p.stMax[k] = p[k]; } else p.stMax[k] = 0; }

  resolveAim(p);
  if (p.climb) { updateClimb(p, dt); return; }   // §29 G3 root ladder: a scripted 0.6 s climb

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
      const bx = p.x, by = p.y;
      moveEntity(p, wx * sp * dt, wy * sp * dt, h0);
      unstickPlayer(p, Math.abs(p.x - bx) + Math.abs(p.y - by), dt, h0);
      p.walkT += dt;
      if (Math.random() < dt * 6) addPart({ x: p.x, y: p.y, z: p.z, vx: frand(-0.3, 0.3), vy: frand(-0.3, 0.3), vz: 0.6, life: 0.4, t: 0, col: '#e8e0f8', grav: 1, size: 1, glow: false });
    } else p.stuckT = 0;
  }
  const th = tileH(m, p.x, p.y);
  updateFall(p, th, dt);   // §29 G3: a drop-down ledge falls with gravity (and lands with dust); small steps keep the old ease
  playerActions(p, dt);
  updateEcho(p, dt);   // §30 spirit clone (no-op without the 'echo' rule)

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

// ===== HUD getters (read-only views the HUD draws from; docs/design/hud-ui.md) =========================================
// ultCharge(p) 0..1 · ultReady(p) · skillSlotState(p, slot) · heroStatuses(p) · interactPrompt() · skillInfo(p, id)
const ultCharge = (p = G.player) => clamp((p.ult || 0) / 100, 0, 1);
const ultReady = (p = G.player) => (p.ult || 0) >= 100;
// slot: 'lmb' q qu rmb e eu r f v (skills) | z x c (pockets)
function skillSlotState(p, slot) {
  const action = SLOT_ACTION[slot], glyph = typeof IN !== 'undefined' ? IN.glyph(action) : '';
  if (POCKET_KEYS.includes(slot)) {
    const id = p.pockets && p.pockets[POCKET_KEYS.indexOf(slot)], P = id && POCKETS[id];
    if (!P) return { slot, action, glyph, id: null, pocket: true };
    return { slot, action, glyph, id: null, pocket: id, name: P.name, color: P.color, icon: P.icon, count: pocketCount(p, id), max: pocketMax(p, id),
      potions: id === 'potion' ? p.potions : undefined, cd: Math.max(0, (p.potT || 0) - G.t), unavailable: p.dead || pocketCount(p, id) <= 0 };
  }
  if (slot === 'lmb') { const w = weaponOf(p); return { slot, action, glyph, id: null, name: w.basic.name, element: w.element, cd: Math.max(0, p.atkT), cdFrac: 0, hold: p.holdCharge || 0, unavailable: !!(p.dash || p.rootT > 0 || castActive(p)) }; }
  const id = slotSkill(p, slot), s = id && SKILLS[id];
  if (!s) return { slot, action, glyph, id: null };
  const ult = isUlt(slot), ck = s.cdKey || id, cd = Math.max(0, p.cds[ck] || 0, slot === 'e' && isCompanion(p.equip.offhand) ? p.cds.__page || 0 : 0), max = p.cdm[ck] || s.cd || 1;
  const rp = skillRankProgress(p, id);
  return {
    slot, action, glyph, id, name: s.name, element: s.element, color: s.color, ult,
    cd: ult ? 0 : cd, cdMax: max, cdFrac: ult ? 0 : (cd > 0 ? cd / max : 0),
    charge: ult ? clamp((p.ult || 0) / (ultNeed(p, id) || 100), 0, 1) : null, ready: ult ? (p.ult || 0) >= ultNeed(p, id) && cd <= 0 : cd <= 0,
    mp: slot === 'rmb' ? 0 : s.mp || 0, st: s.st || 0, mpShort: slot !== 'rmb' && (s.mp || 0) > p.mp, stShort: (s.st || 0) > p.st, active: id === 'hush' && !!p.hush,
    deck: slot === 'e' && isCompanion(p.equip.offhand) ? { i: p.deck | 0, n: deckEntries(p).length } : null,
    unavailable: !!(p.dead || p.rootT > 0 || (p.dash && slot !== 'v')),
    rank: rp.rank, rankFrac: rp.frac, flash: G.lastCast && G.lastCast.slot === slot ? Math.max(0, G.lastCast.t) : 0,
  };
}
function skillInfo(p, id) { return Object.assign({ id, skill: SKILLS[id] }, skillRankProgress(p, id)); }
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

// ===== aim: mouse cursor, twin-stick (sticky) or auto, with aim assist on stick/touch only (docs/design/controls.md) ======
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
const SKILL_ACTIONS = [['skillQ', 'q'], ['ultQ', 'qu'], ['offhand', 'rmb'], ['skillE', 'e'], ['ultE', 'eu'], ['skillR', 'r'], ['skillF', 'f'], ['dodge', 'v']];
const INSTANT_SLOTS = ['v', 'rmb'];   // dodge and the off-action never wait for a hold-to-aim release
// Hold-to-aim (input.js IN.aimMode): 'off' casts on press (M2a); 'hold' / 'always' cast the skill keys on RELEASE so the
// ground indicator can show while held (IN.aimCasts lists this step's releases). Dodge, the off-action and pockets stay instant.
function playerActions(p, dt) {
  if (typeof IN === 'undefined' || G.ui.open || G.state !== 'play' || G.fadeDir > 0) { if (typeof IN !== 'undefined' && IN.clearAimHold) IN.clearAimHold(); holdAttack(p, dt, false); return; }
  if (p.dodgeBuf > 0) { p.dodgeBuf -= dt; if (!castActive(p) || p.cast.age >= CANCEL_AFTER) { p.dodgeBuf = 0; useSkill(p, 'v'); } }
  const hold = IN.aimMode && IN.aimMode() !== 'off';
  for (const [a, slot] of SKILL_ACTIONS) if (IN.pressed(a) && (!hold || INSTANT_SLOTS.includes(slot))) useSkill(p, slot);
  if (hold) for (const a of IN.aimCasts) { const sa = SKILL_ACTIONS.find(q => q[0] === a); if (sa) useSkill(p, sa[1]); }
  if (typeof attackToggle === 'function' && attackToggle()) { if (IN.pressed('attack')) p.autoAtk = !p.autoAtk; } else p.autoAtk = false;
  const atk = IN.held('attack') || p.autoAtk;
  if (!holdAttack(p, dt, atk) && atk) basicAttack(p);
  ['s1', 's2', 's3'].forEach((a, i) => { if (IN.pressed(a)) usePocket(p, i); });
  if (IN.pressed('interact')) interact(p);
}
// el = damage type of the hit (§5b); the hero's resist applies on top of defence (arcane ignores half of it)
// o.boss: a telegraphed boss hit (bosses.js bossHit), a tag only (balsim counts them): no cap, a boss hit can kill (client ruling, M3 hot-fix)
function hurtPlayer(dmg, srcX, srcY, el = 'slash', o) {
  const p = G.player;
  if (p.dead || p.invulnT > 0 || (p.dash && p.dash.opt.invuln) || G.state !== 'play') return false;
  if (tryParry(p, srcX, srcY, o)) return false;   // a parry window (or Aegis) negates the hit
  const r = (p.res && p.res[el]) || 0;
  let d = dmg * (1 - p.def) * (1 - (el === 'arcane' ? r * 0.5 : r)) * (p.buffs.bulwark ? 0.4 : 1) * (p.buffs.ward ? 0.5 : 1) * frand(0.9, 1.1);
  p.hp -= d; p.hurtT = 0.25; p.invulnT = 0.2; combatPing(p);
  text(p.x, p.y, p.z + 3, Math.round(d), '#ff5a7a');
  shake(4); sfx('hurt');
  burst(p.x, p.y, p.z + 1.2, 8, ['#ff5a7a', '#ffffff'], 2);
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true; G.state = 'dead'; G.deadT = 0; sfx('die'); G.stats.deaths++; hushEnd(p, 'death');
    burst(p.x, p.y, p.z + 1, 40, ['#ffb0e0', '#c7a8ff', '#ffffff'], 3);
  }
  return true;
}

// ===== hit tests ===================================================================
function damageEnemy(e, base, o = {}) {
  if (e.dead || e.spawnT > 0 || e.under) return false;
  const p = G.player, c = o.cast !== undefined ? o.cast : CAST;
  // §30 spirit clone replays (cast ctx src 'echo'): retyped (c.el, never an explicit o.el), no MP, half ult charge,
  // no on-hit EFFECTS, no skill ranks, half particles and stagger x k, hitlag target-only <= 2
  const echo = !!(c && (c.src === 'echo' || (c.ctx && c.ctx.src === 'echo')));
  // damage type: explicit > the skill's element > the weapon's (sword slash, staff arcane, bow pierce); burn ticks are fire
  const el = (echo && !o.dot ? c.el : o.el) || (o.dot ? 'fire' : c ? c.el : item('weapon', p.gear.weapon).element) || 'slash';
  const sk = c && c.skill ? c.skill : null;   // a skill cast (basic attacks run with c.basic, burn ticks with o.dot)
  // one additive sum: gear damage % (+ skill damage % and the element's gem amplification for skill hits)
  // skill rank (+6 %/rank above 1) joins the same additive sum; modifier ctx.dmg multiplies (numbers only)
  const cx = c && c.ctx;
  // v2 gear: + the element's damage % (implicits, prefixes, ring boons), the amulet's ultimate damage on R hits and its
  // skill damage while the charge bar is full — all inside the same additive sum
  const S = p.sum || {}, ultHit = !!(c && isUlt(c.slot));
  let dmg = base * p.dmgBase * (1 + p.bonus + (p.huntBonus[e.type] || 0) + (S[el + 'Dmg'] || 0) + (ultHit ? S.ultDmg || 0 : 0)
    + (sk ? p.skillDmg + elementAmp(p, el) + skillRankBonus(p, sk) + (p.ult >= 100 ? S.skillDmgFull || 0 : 0) : 0)) * buffMul(p) * (cx ? cx.dmg : 1) * (p.dreadT > 0 ? 0.85 : 1) * (p.hush ? HUSH.dmg : 1);
  if (!e.dummy) combatPing(p);
  const res = (e.res && e.res[el]) || 0, eff = el === 'arcane' ? res * 0.5 : res;   // arcane ignores half
  dmg *= Math.max(0, 1 - eff) * (el === 'holy' && e.tags && e.tags.includes('gloom') ? 1.5 : 1);
  let st = o.stagger != null ? o.stagger : cx ? cx.stagger || 0 : sk && SKILLS[sk] ? SKILLS[sk].stagger || 0 : 0;
  if (echo) st *= ECHO.k;
  // +stagger from gear: heavy-strike implicits (on hits that already stagger), holy hits (Halo Hoop), weapon skills (Warrior ring)
  if (!o.dot) st += (st > 0 ? S.stagger || 0 : 0) + (el === 'holy' ? S.holyStagger || 0 : 0) + (sk && c.slot && WEAPON_SLOTS.includes(c.slot) ? S.weaponStagger || 0 : 0);
  let broke = false;   // hitlag: a boss BREAK is the 8-step global freeze
  if (st) {   // the boss stagger bar (hud.js): fills with heavy hits, BREAK flash when full, then empties
    // per-boss staggerMax (bosses.js) rescales the points so the bar's 0..STAGGER_CAP fraction stays right
    e.stagger = (e.stagger || 0) + st * (e.staggerCap ? STAGGER_CAP / e.staggerCap : 1);
    if (e.boss && e.stagger >= STAGGER_CAP) { e.stagger = 0; e.breakT = G.t; broke = true; if (typeof bossBreak === 'function') bossBreak(e); }
    else if (!e.boss) partsStagger(e, st);
  }
  if (e.parts && e.parts.length || e.mods) dmg = partsHurt(e, dmg, o);   // shield-front, sleepers waking, elite shields
  const mark = !o.dot && !echo && p.stepMark > G.t ? 0.3 : 0;   // Step: the next hit is a backstab (+30% crit)
  if (mark) p.stepMark = 0;
  let crit = Math.random() < Math.min(capsT().crit, p.crit + mark + (p.critR && p.critR.until > G.t ? p.critR.v : 0));
  if (!o.dot && !echo && ((c && c.crit) || o.crit)) crit = true;   // Bow Focus, Snapshot, the Bow + Quiver grip
  if (p.buffs.veil && !o.dot && !echo) { crit = true; delete p.buffs.veil; }
  if (crit) dmg *= 1 + p.critDmg;
  dmg *= frand(0.9, 1.1);
  if (e.boss && typeof bossClampDmg === 'function') { dmg = bossClampDmg(e, dmg); if (!(dmg > 0)) return false; }   // §26.1 boss bars (bosses.js): clamp at the bar's end, invulnerable between bars
  if (e.dummy) { e.hp = e.maxHp; }
  else e.hp -= dmg;
  // hit power r = this hit's share of the bar it lands on (a boss: the current phase bar, bosses.js bossBars §26.1)
  const hb = e.boss && typeof bossBars === 'function' ? bossBars(e) : null;
  const r = clamp(dmg / ((hb && hb.max > 0 ? hb.max : e.maxHp) || 1), 0, 1);
  e.flash = typeof flashReduceOn === 'function' && flashReduceOn() ? 0.1 : 0.1 + 0.1 * r;   // flash length by r
  if (!o.dot) G.lastHit = e;
  // §15.3 resource rhythm: basic attacks (CAST null) build 8 MP per hit; all damage but the ultimate's own feeds the charge
  if ((!c || c.basic) && !o.dot && !echo) basicMpGain(p, c);
  // the charge: every hit but an ultimate's own and an off-action's (no charge); an echo hit at 50 %, Hush x0.5
  if (eff < 1 && !(c && (isUlt(c.slot) || c.noCharge)) && p.ult < 100) p.ult = Math.min(100, p.ult + ultGain(p, base * (1 - eff) * (echo && cx ? cx.dmg : 1), o.reaction) * (echo ? 0.5 : 1) * (p.hush ? HUSH.charge : 1));
  // skill ranks: a cast counts once, on its first hit on a real enemy (training dummies don't rank skills)
  if (sk && c.slot && !c.hit && !o.dot && !e.dummy && !echo) { c.hit = true; addSkillHit(p, sk); }
  if (cx && cx.onHit.length) for (const fn of cx.onHit) fn(e, dmg, o);
  // numbers coloured by damage type; WEAK big + yellow, RESIST grey, IMMUNE spelled out
  if (eff >= 1) text(e.x, e.y, e.z + e.hgt, 'IMMUNE', '#9a92b0');
  else dmgText(e.x, e.y, e.z + e.hgt, Math.round(dmg) + (crit ? '!' : ''), res < 0 ? '#ffe36a' : res > 0 ? '#a7a3b8' : EL_COL[el] || '#ffffff', crit || res < 0,
    { e, v: dmg, r, kind: res < 0 ? 'weak' : crit ? 'crit' : res > 0 ? 'resist' : 'normal' });
  if (res && !e.dummy) discoverRes(e, el, res);
  const src = echo && c.caster ? c.caster : p, fxx = o.fx != null ? o.fx : src.x, fyy = o.fy != null ? o.fy : src.y;   // knockback away from the spirit on its hits
  // tumble (R1): a big non-lethal hit (r >= 0.3) on a non-boss, non-swarm enemy: knockback x1.5, 0.3 s stun and a hop
  // (e.hopZ: a DRAW offset integrated in updateEnemies; e.z is never written)
  const swarmM = e.swarm && e.knockK != null, tumble = !o.dot && !e.boss && !e.dummy && !swarmM && r >= 0.3 && e.hp > 0;
  if (o.knock && !e.boss && !e.dummy) {
    const d = dist(fxx, fyy, e.x, e.y) || 1;
    const kk = e.knockK != null ? e.knockK : 1;   // swarm members barely budge (parts.js), so a cleave keeps them together
    const kv = o.knock * 9 * kk * (0.7 + 0.6 * r) * (tumble ? 1.5 : 1);   // knockback by r
    e.kx += (e.x - fxx) / d * kv; e.ky += (e.y - fyy) / d * kv;
  }
  if (tumble) { e.stunT = Math.max(e.stunT, 0.3); e.hopV = 2.5; e.hopZ = Math.max(e.hopZ || 0, 0.001); }
  if (o.stun) e.stunT = Math.max(e.stunT, o.stun * (cx ? cx.stun : 1) * (e.boss ? 0.25 : 1));
  if (o.freeze) { if (o.stun && e.stunT > 0) applyStatus(e, 'frozen', e.stunT, 'frost'); else e.frozen = o.stun; }
  if (o.slow) applyStatus(e, 'chilled', Math.max(e.slowT, o.slow * 2 * (cx ? cx.slow : 1)), 'frost');
  if (o.burn && !(echo && e.burnT > 0 && e.burnCast && e.burnCast.src !== 'echo')) { applyStatus(e, 'burning', o.burn * (cx ? cx.burn : 1), 'fire'); e.burnTick = 0.5; e.burnCast = c; }   // an echo Burn never overwrites the hero's own
  const A = HITAGG;
  if (!o.dot) {
    // hit particles 5 + 8r (max 12); inside a cast at most 24 in all, 2 per target beyond the 4th
    let np = Math.min(12, Math.round(5 + 8 * r)); if (echo) np = Math.round(np / 2);
    if (A) { np = Math.max(0, Math.min(A.n < 4 ? np : 2, 24 - A.parts)); A.parts += np; A.n++; }
    if (np) burst(e.x, e.y, e.z + e.hgt * 0.6, np, ['#ffffff', e.blood || '#c7a8ff'], 2.5);
    sfx('hit', null, { pitch: clamp(-100 * r * 6, -600, 0) });   // heavier = lower
  }
  if (!o.dot && eff < 1 && !e.dead && !echo) emitEffects('hit', { e, el, dmg, o, cast: c, crit });
  if (!o.dot && !e.dead) hitlag(e, r, c, crit, broke, o, A, echo);
  if (e.hp <= 0 && !e.dead) killEnemy(e, o.dot ? 0 : dmg, o);
  return true;
}
// the hitlag of one hit (R2): target-only freeze always, a global freeze request by the table (per cast via HITAGG)
function hitlag(e, r, c, crit, broke, o, A, echo) {
  const sk = c && c.skill, ult = !!(c && isUlt(c.slot));
  const w = (sk && SKILLS[sk] && SKILLS[sk].weight) || (ult ? 2 : 1);   // skill weight: basic 1, heavy 1.5, ultimate 2
  const mode = hitlagMode();
  const ft = mode === 'off' || echo ? 2 : clamp(Math.round((2 + 6 * r) * w), 2, 8);
  e.hitFreeze = Math.max(e.hitFreeze || 0, ft);
  if (echo) return;   // a §30 echo hit: target-only, 2 steps, never a global freeze (nor a budget fold-in)
  let fg = 0;   // dummies and a piercing shot's 2nd+ target: target-only
  if (!e.dummy && !o.nofg) {
    if (crit) fg = 3;
    if (e.hp <= 0 && !e.boss) fg = Math.max(fg, 3);
    if (r >= 0.25) fg = Math.max(fg, 4);
    if (r >= 0.5 || (ult && !c.ultFg)) { fg = Math.max(fg, 6); if (ult) c.ultFg = true; }   // the ultimate row: once per cast
    if (broke) fg = 8;
  }
  if (A) { if (A.hit.indexOf(e) < 0) A.hit.push(e); if (fg > A.fg) A.fg = fg; if (r > A.r) A.r = r; return; }
  if (o.nofg) return;
  if (fg > 0 && hitstop(fg) < 0) e.hitFreeze = Math.max(e.hitFreeze, fg);   // over budget: target-only
  shake(Math.min(6, 1.5 + 4 * r));   // one shake per cast, by r
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
  const A = aggBegin();   // one global freeze + shake per cast (aggEnd)
  for (const e of G.enemies.slice()) if (!e.dead && dist(x, y, e.x, e.y) < r + e.r) { if (damageEnemy(e, dmg, Object.assign({ fx: x, fy: y }, o))) n++; }
  aggEnd(A);
  return n;
}
function hitCone(x, y, a, arc, r, dmg, o = {}) {
  let n = 0; r *= castR();
  if (typeof IN !== 'undefined' && IN.assist()) arc *= 1.15;   // melee cones widen 15 % on pad / touch
  const A = aggBegin();
  for (const e of G.enemies.slice()) {
    if (e.dead) continue;
    const d = dist(x, y, e.x, e.y);
    if (d > r + e.r) continue;
    if (d > e.r && Math.abs(angDiff(a, Math.atan2(e.y - y, e.x - x))) > arc / 2 + Math.atan2(e.r, d)) continue;
    if (damageEnemy(e, dmg, o)) n++;
  }
  aggEnd(A);   // the flat 0.035 s melee hitstop is gone: hitlag() scales it by r (R2)
  return n;
}
function hitLine(x, y, a, len, w, dmg, o = {}) {
  w *= castR();
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, A = aggBegin();
  for (const e of G.enemies.slice()) if (!e.dead && segDist(e.x, e.y, x, y, ex, ey) < w + e.r) damageEnemy(e, dmg, o);
  aggEnd(A);
}

// ===== projectiles ===================================================================
function spawnProj(o) {
  const p = Object.assign({ t: 0, hit: new Set(), pierce: 0, friendly: true, cast: CAST }, o);
  const hero = G.player; if (p.friendly && hero && hero.sum && hero.sum.pierce && p.pierce < 99) p.pierce += hero.sum.pierce;   // +N pierce (bow implicits, ring boon)
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
    const sdt = dt * worldScale(p.friendly ? null : p);   // world time: every projectile once it leaves the hand (Hush, Dreamveil)
    p.t += sdt;
    if (p.homing) {
      const tgt = nearestEnemy(p.x, p.y, 7, null);
      if (tgt) { const a = Math.atan2(tgt.y - p.y, tgt.x - p.x), cur = Math.atan2(p.vy, p.vx), na = cur + clamp(angDiff(cur, a), -p.homing * sdt, p.homing * sdt); p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed; }
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
          damageEnemy(e, p.dmg, { knock: p.knock || 0.12, slow: p.slow, burn: p.burn, fx: p.x - p.vx, fy: p.y - p.vy, cast: p.cast, nofg: p.hit.size > 1, crit: p.crit, el: p.el && p.reflected ? p.el : undefined });   // pierce: global freeze on the first target only
          if (p.pierce-- <= 0) { p.dead = true; if (p.explode) explodeProj(p); break; }
        }
      }
    } else {
      const pl = G.player;
      if (!pl.dead && dist(p.x, p.y, pl.x, pl.y) < p.r + pl.r) {
        if (parryReflect(pl, p)) continue;   // a Buckler parry from T3 turns the shot around
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
  dt *= worldScale(null);   // zones run on world time (Hush)
  for (const z of G.zones) {
    z.t += dt; z.tickT -= dt;
    if (z.t > z.life) { z.dead = true; continue; }
    if (z.hostile) {   // enemy ground zones (parts.js hostileZone): hurt / slow the hero on each tick
      if (z.tickT <= 0) { z.tickT = z.tick || 0.5; if (playerIn({ kind: 'circle', x: z.x, y: z.y, r: z.r })) { if (z.slow) applyStatus(G.player, 'chilled', Math.max(G.player.slowT, 0.8)); if (z.dmg) hurtPlayer(z.dmg, z.x, z.y, z.el || 'nature'); } }
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
  const e = { type, def: d, x, y, z: 0, r: d.r || 0.4, hp, maxHp: hp, lvl, dm: dummy ? 1 : enemyDmgMul(lvl), el: d.element || 'slash', res: d.res || {}, tags: d.tags || [], hgt: d.hgt || 3, blood: d.blood || '#c7a8ff', kx: 0, ky: 0, flash: 0, hitFreeze: 0, hopZ: 0, hopV: 0, stunT: 0, slowT: 0, burnT: 0, burnTick: 0, state: 'chase', st: 0, cd: rand(0.5, 1.5), spawnT, face: 1, anim: Math.random() * 6, boss, dummy, parts: [], acts: [], pp: {}, pcd: {} };
  if (SPAWN_TRIG) e.trig = SPAWN_TRIG;
  if (G.arena && !G.arena.done && G.arena.map === (G.map && G.map.id)) e.arena = G.arena.id;
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
// dmg / o = the killing hit (damageEnemy); 0 / {} for a DoT tick or a scripted kill (clear_enemies): the body slumps
function killEnemy(e, dmg = 0, o = {}) {
  e.dead = true; sfx('die');
  if (e.boss && typeof AUDIO !== 'undefined') AUDIO.onBossKilled(e);   // victory stinger, the boss song bows out
  const was = SPAWN_TRIG; SPAWN_TRIG = e.trig || null;
  const counts = e.dummy || partsDeath(e);   // split / zone-on-death; a swarm or twin counts once, on its last member
  SPAWN_TRIG = was;
  if (counts && !e.noXp) onEnemyKilled(e);   // XP + loot (items.js)
  if (counts && !e.dummy) emitEffects('kill', { e });
  if (counts) { G.kills[e.type] = (G.kills[e.type] || 0) + 1; G.kills.any = (G.kills.any || 0) + 1; if (!e.dummy) sighting(e.type).kills++; }
  // R1 death fling: a corpse record carries the body (and 16 of the 24 motes, or a boss's 3 staged bursts of 40);
  // the rest bursts here now. Loot, XP, counters and triggers above stay immediate (e.dead is already true).
  const cp = spawnCorpse(e, dmg, o);
  burst(e.x, e.y, e.z + e.hgt * 0.5, e.boss ? (cp ? 40 : 120) : cp ? 8 : 24, [e.blood, '#ffffff', '#ffb0e0'], e.boss ? 7 : 3.5);
  fx({ type: 'ring', x: e.x, y: e.y, r: e.boss ? 4 : 1.2, col: e.blood, life: 0.4 });
  // spirit motes drift up toward the player — a little healing
  if (!e.boss) delay(0.2, () => { const q = G.player; healPlayer(q, 14 * (1 + ((q.sum && q.sum.killHeal) || 0))); q.mp = Math.min(q.maxMp, q.mp + 10); });   // belt killHeal boon
  if (e.boss) { shake(14); hitstop(15, true); G.slowmo = 1.4; G.shrink = null; hushEnd(G.player, 'bossdeath'); }   // 15 steps = 0.25 s real (main.js counts it before slow-mo)
}

// ===== corpses: the death fling (docs/design/combat-feel.md, meeting R1) ===========================================================
// Not a ragdoll: a pooled record per body (cap 8 phone / 12 desktop; full -> the oldest dissolves now). Never a
// nameplate, light or hit target (it is not in G.enemies). Pixel sprites are never rotated (render.js drawCorpse).
//   fling : arcs away from the hit (speed 2.5 + 5r t/s, vz 3 + 5r, grav 14), bounces once (vz x -0.35, v x 0.5, squash
//           0.3 for 0.12 s), death frames over 0.55 s, then 16 motes and a 0.25 s fade. Flying enemies: vz 1 from their hover.
//   slump : DoT / scripted kills and r < 0.08: in place, squash 0.25, 0.45 s.
//   boss  : no fling: a death pose for 1.2 s with bursts of 40 at 0 / 0.5 / 1.0 s, then a 0.4 s dissolve.
// Swarm members get no record: a squash-pop ghost (a 'ghost' effect with sq) plus today's burst.
// G.corpses holds the live records; c.e keeps the dead enemy object for its look (type, face, blood, elite).
const CORPSE = { cap: (typeof PHONE !== 'undefined' && PHONE) ? 8 : 12, pool: [] };
for (let i = 0; i < CORPSE.cap; i++) CORPSE.pool.push({ kind: 'corpse', key: 0, e: null, img: null, sc: 1, art: null, x: 0, y: 0, z: 0, gz: 0, vx: 0, vy: 0, vz: 0, face: 1, t: 0, life: 0, fade: 0, sq: 0, sqT: 0, bounced: false, mode: '', grav: 14, bursts: 0 });
function corpseBurst(c, n) { const e = c.e; burst(c.x, c.y, c.gz + c.z + e.hgt * 0.3, n, [e.blood, '#ffffff', '#ffb0e0'], c.mode === 'boss' ? 7 : 3); }
function resetCorpses() { for (const c of G.corpses) { c.e = null; c.img = null; CORPSE.pool.push(c); } G.corpses.length = 0; }
function spawnCorpse(e, dmg, o) {
  if (e.dummy || e.under || e.mimic) return null;
  if (e.swarm && e.knockK != null) {   // swarm member: squash-pop, no record
    const L = typeof corpseLook === 'function' ? corpseLook(e) : null;
    if (L && L.img) fx({ type: 'ghost', x: e.x, y: e.y, z: e.z + L.hover, spr: L.img, sc: L.sc, col: e.blood, life: 0.16, sq: true });
    return null;
  }
  let c = CORPSE.pool.pop();
  if (!c) {   // full: the oldest non-boss body dissolves now (its landing motes included)
    let i = 0; while (i < G.corpses.length - 1 && G.corpses[i].mode === 'boss') i++;
    c = G.corpses[i]; G.corpses.splice(i, 1);
    if (!c.bursts) corpseBurst(c, c.mode === 'boss' ? 40 : 16);
  }
  const r = clamp(dmg / (e.maxHp || 1), 0, 1), L = typeof corpseLook === 'function' ? corpseLook(e) : null;
  const fly = e.tags && e.tags.indexOf('flying') >= 0;
  c.e = e; c.img = L ? L.img : null; c.sc = L ? L.sc : 1; c.art = L ? L.art : null; c.fly = L ? L.hover : 0;
  c.x = e.x; c.y = e.y; c.gz = e.z; c.z = 0; c.vx = c.vy = c.vz = 0; c.t = 0; c.sq = 0; c.sqT = 0; c.bounced = false; c.bursts = 0; c.grav = 14;
  c.face = e.face || 1;
  if (e.boss) { c.mode = 'boss'; c.life = 1.2; c.fade = 0.4; c.bursts = 1; }   // burst #1 is killEnemy's own
  else if (o.dot || r < 0.08) { c.mode = 'slump'; c.life = 0.45; c.fade = 0.25; c.sq = 0.25; c.sqT = 0.12; if (fly) { c.z = c.fly; c.vz = 0; c.bounced = false; } }
  else {
    const p = G.player, fx0 = o.fx != null ? o.fx : p.x, fy0 = o.fy != null ? o.fy : p.y, d = dist(fx0, fy0, e.x, e.y) || 1;
    const dx = (e.x - fx0) / d, dy = (e.y - fy0) / d, sp = 2.5 + 5 * r;
    c.mode = 'fling'; c.life = 0.55; c.fade = 0.25;
    c.vx = dx * sp; c.vy = dy * sp; c.vz = fly ? 1 : 3 + 5 * r; if (fly) c.z = c.fly;
    const sx = dx - dy;   // iso screen x of the fling direction: the body faces back toward the hit
    if (Math.abs(sx) > 0.05) c.face = sx > 0 ? -1 : 1;
  }
  G.corpses.push(c);
  return c;
}
// dt = the game step (a global hitlag freeze holds the body too); constant work per record, no allocation
function updateCorpses(dt) {
  const L = G.corpses; let j = 0;
  for (let i = 0; i < L.length; i++) {
    const c = L[i];
    c.t += dt; if (c.sqT > 0) c.sqT -= dt;
    if (c.mode === 'fling' || (c.mode === 'slump' && c.z > 0)) {
      c.x += c.vx * dt; c.y += c.vy * dt; const k = Math.pow(0.002, dt); c.vx *= k; c.vy *= k;
      c.vz -= c.grav * dt; c.z += c.vz * dt;
      if (c.z < 0) {
        c.z = 0;
        if (!c.bounced) { c.bounced = true; c.vz *= -0.35; c.vx *= 0.5; c.vy *= 0.5; c.sq = 0.3; c.sqT = 0.12; }
        else { c.vz = 0; c.vx *= 0.5; c.vy *= 0.5; }
      }
    }
    if (c.mode === 'boss') { if (c.bursts < 3 && c.t >= c.bursts * 0.5) { c.bursts++; corpseBurst(c, 40); } }
    else if (!c.bursts && c.t >= c.life) { c.bursts = 1; corpseBurst(c, 16); }   // the other 16 motes, at the landing point
    if (c.t < c.life + c.fade) L[j++] = c;
    else { c.e = null; c.img = null; CORPSE.pool.push(c); }
  }
  L.length = j;
}
// ===== world time (docs/design/combat-feel.md "Hush"): G.timeScale is 1, or 0.25 while Hush runs (eased over 0.15 s).
// worldScale(e) = the entity's scale: elites x1.5 (0.375), bosses x2 (0.5); a boss in a bar transition (invulnerable) ignores
// Hush. Dreamveil slows enemies and their projectiles to 0.35: with Hush the slower value wins (min, not the product).
// worldScale(null) = the field (wind, particles, ELFX, zones, effects). Real time: the hero, cooldowns, input, HUD, camera,
// hitlag, delays (cast timing), the Hush drain.
function worldScale(e) {
  const T = G.timeScale != null ? G.timeScale : 1;
  let s = T;
  if (e && e.boss) s = e.bk && e.bk.transT > 0 ? 1 : Math.min(1, T * 2);
  else if (e && e.def && T < 1 && enemyClassOf(e) === 'elite') s = Math.min(1, T * 1.5);
  if (e && (e.def || e.friendly === false) && G.player && G.player.buffs && G.player.buffs.dreamveil) s = Math.min(s, 0.35);
  return s;
}
if (typeof window !== 'undefined') window.worldScale = worldScale;   // the Wind lane reads it (js/wind.js)

// telegraphs are tagged with the enemy that made them (PART_SRC) so a stagger or a phase change can clear them
function tele(o) { o.type = 'tele'; if (!o.src && typeof PART_SRC !== 'undefined' && PART_SRC) o.src = PART_SRC; return fx(o); }
function playerIn(shape) {
  const p = G.player;
  if (shape.kind === 'circle') return dist(p.x, p.y, shape.x, shape.y) < shape.r + p.r;
  if (shape.kind === 'cone') { const d = dist(p.x, p.y, shape.x, shape.y); return d < shape.r + p.r && Math.abs(angDiff(shape.ang, Math.atan2(p.y - shape.y, p.x - shape.x))) < shape.arc / 2; }
  if (shape.kind === 'line') return segDist(p.x, p.y, shape.x, shape.y, shape.x + Math.cos(shape.ang) * shape.len, shape.y + Math.sin(shape.ang) * shape.len) < shape.w + p.r;
  return false;
}

// ===== enemy sleep (docs/design/world-maps.md) ======================================================================
// Every non-boss, non-dummy enemy farther than SLEEP.dist tiles from the hero is DORMANT (e.dormant; not parts.js
// `e.asleep`, which is the dormant-until-woken movement part): it runs no parts, moves, attacks or animation, only a
// 1 Hz heartbeat (status timers, spawn-in, burn ticks, cooldowns). The distance ranking itself is O(n) per frame, so
// waking is seamless: an enemy wakes the step the hero comes within range, with its state as it was. At most SLEEP.cap
// are awake (16 on phones): beyond that the farthest sleep. Enemies of the running arena fight never sleep; a hit
// enemy stays awake 3 s wherever it is.
// Off-screen projectiles and zones farther than SLEEP.cull tiles from the hero are dropped.
// enemyAwake(e) is the one "is it awake?" predicate (shrine warp, settling, all_enemies_dead).
const SLEEP = { dist: 18, hyst: 1.5, cap: (typeof PHONE !== 'undefined' && PHONE) ? 16 : 24, hb: 1, cull: 20, awake: 0, dormant: 0 };
const enemyAwake = e => !e.dead && !e.dummy && !e.dormant && !e.asleep;
const anyEnemyAwake = () => G.pendingSpawns > 0 || G.enemies.some(enemyAwake);
let SPAWN_TRIG = null;   // the trigger id an enemy's spawns inherit (summons, splits, boss adds)
function enemySleepPass() {
  const p = G.player, cand = [];
  let dormant = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.boss || e.dummy || (G.arena && !G.arena.done && e.arena === G.arena.id)) { e.dormant = false; continue; }
    e._d = dist(e.x, e.y, p.x, p.y);
    if (e.flash > 0) e.hitWake = G.t + 3;   // a hit (a long shot, a DoT) keeps it awake for 3 s wherever it is
    if (e._d <= SLEEP.dist + (e.dormant ? 0 : SLEEP.hyst) || e.hitWake > G.t) cand.push(e);
    else if (!e.dormant) { e.dormant = true; e.hbT = Math.random() * SLEEP.hb; }
  }
  if (cand.length > SLEEP.cap) {
    cand.sort((a, b) => a._d - b._d);
    for (let i = SLEEP.cap; i < cand.length; i++) if (!cand[i].dormant) { cand[i].dormant = true; cand[i].hbT = Math.random() * SLEEP.hb; }
    cand.length = SLEEP.cap;
  }
  for (const e of cand) if (e.dormant) e.dormant = false;   // wake: state untouched, no spawn fx re-run
  for (const e of G.enemies) if (e.dormant) dormant++;
  SLEEP.dormant = dormant; SLEEP.awake = cand.length;
}
// the sleeper's 1 Hz tick: timers only (accumulated dt is never dumped into an AI step)
function enemyHeartbeat(e, dt) {
  e.hbT = (e.hbT || 0) + dt; if (e.hbT < SLEEP.hb) return;
  const s = e.hbT; e.hbT = 0; e.hbs = (e.hbs || 0) + 1;
  if (e.spawnT > 0) e.spawnT = Math.max(0, e.spawnT - s);
  e.cd = Math.max(0, (e.cd || 0) - s); e.slowT -= s;
  if (e.stunT > 0) { e.stunT -= s; if (e.stunT <= 0) e.frozen = 0; }
  if (e.burnT > 0) { const n = Math.min(Math.ceil(e.burnT / 0.5), Math.round(s / 0.5)); e.burnT -= s; for (let k = 0; k < n && !e.dead; k++) damageEnemy(e, 14, { dot: true, cast: e.burnCast || null }); e.flash = 0; }   // its own DoT does not wake it
}
function cullFar() {
  const p = G.player, R = SLEEP.cull;
  if (G.projs.some(q => Math.abs(q.x - p.x) > R || Math.abs(q.y - p.y) > R)) G.projs = G.projs.filter(q => dist(q.x, q.y, p.x, p.y) <= R);
  if (G.zones.some(z => Math.abs(z.x - p.x) > R + (z.r || 0) || Math.abs(z.y - p.y) > R + (z.r || 0))) G.zones = G.zones.filter(z => dist(z.x, z.y, p.x, p.y) <= R + (z.r || 0));
}
function updateEnemies(dt) {
  const p = G.player;
  if (typeof updateArena === 'function') updateArena(dt);
  enemySleepPass();
  cullFar();
  hitlagBudgetTick(); updateCorpses(dt);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const ts = worldScale(e), sdt = dt * ts;   // this enemy's world time (Hush, Dreamveil)
    if (e.dormant) { enemyHeartbeat(e, sdt); continue; }
    SPAWN_TRIG = e.trig || null;
    e.flash -= dt; e.anim += sdt;
    if (e.stagger > 0) e.stagger = Math.max(0, e.stagger - sdt * STAGGER_DECAY);
    if (e.spawnT > 0) { e.spawnT -= sdt; continue; }
    // target-only hitlag (R2): counted in steps (unscaled), skips AI / move / knockback; render shows the hit frame.
    // A boss only shows it: its AI keeps running (boss crowd control is already quartered, e.g. stun x0.25).
    if (e.hitFreeze > 0) { e.hitFreeze--; if (!e.boss) continue; }
    if (e.dummy) continue;
    if (e.hopZ > 0) {   // tumble hop: a draw offset only (render.js), never e.z
      e.hopV -= 12 * sdt; e.hopZ += e.hopV * sdt;
      if (e.hopZ <= 0) { e.hopZ = 0; e.hopV = 0; e.squash = 0.3; }
    }
    const edt = sdt * (e.slowT > 0 ? 0.55 : 1);
    e.slowT -= sdt;
    if (e.burnT > 0) { e.burnT -= sdt; e.burnTick -= sdt; if (e.burnTick <= 0) { e.burnTick = 0.5; damageEnemy(e, 14, { dot: true, cast: e.burnCast || null }); if (Math.random() < 0.5) burst(e.x, e.y, e.z + 1, 2, ['#ff9a4a', '#ffd27a'], 1); } if (e.dead) continue; }
    // knockback
    if (Math.abs(e.kx) + Math.abs(e.ky) > 0.05) { moveEntity(e, e.kx * sdt, e.ky * sdt, tileH(G.map, e.x, e.y)); e.kx *= Math.pow(0.002, sdt); e.ky *= Math.pow(0.002, sdt); }
    WIND.push(e, sdt);   // js/wind.js: emitters push this body (the hero too, once a frame)
    if (e.stunT > 0) { e.stunT -= sdt; if (e.stunT <= 0) e.frozen = 0; continue; }
    e.cd -= edt;
    const d = dist(e.x, e.y, p.x, p.y), ang = Math.atan2(p.y - e.y, p.x - e.x);
    const hidden = !!p.buffs.veil || p.dead || G.state !== 'play';
    e.face = isoX(p.x, p.y) >= isoX(e.x, e.y) ? 1 : -1;
    if (e.boss) { bossUpdate(e, edt, d, ang, hidden); continue; }
    updatePartsEnemy(e, edt, { p, d, ang, hidden, dt: edt });
    if (e.squash > 0) e.squash -= sdt;
    if (!e.under) e.z = lerp(e.z, tileH(G.map, e.x, e.y), Math.min(1, sdt * 12));
  }
  SPAWN_TRIG = null;
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
G.tune = { player: { hp: 650, mp: 260, stamina: 100, speed: 3.7, regen: 2, mpRegen: 2, crit: 0.08, damage: 1, mpOnHit: 8, ultRate: 0.015 } };   // ultRate (M2b balsim): one ultimate per ~40 s in the reference rotation (0.01 measured ~77 s)
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
// Big maps (docs/design/world-maps.md; contract in the maps.js header):
//   warp { to: { x, y } | '<anchorId>' }  a 0.4 s fade warp inside this map (startWarp): no load, trigger state, enemies
//     and the arena all stay; the hero is rooted for the fade and the camera snaps at its peak.
//   closeGate { id }  shut a barrier (an arena gate placed with open: true) for a fight; never saved.
//   arena { id, gate?, x, y, r }  start an inline arena fight: closes `gate`, G.arena = { id, map, gate, x, y, r,
//     pillars }, every enemy spawned while it runs is tagged e.arena and never sleeps. openGate on its gate (the
//     victory card) ends it. If the hero dies first, the respawn's startTriggers resets it: the gate reopens (it was
//     never saved shut), adds are gone with the map's enemies, pillar tiles broken during the fight return
//     (breakPillar(i, j) is the API a boss move uses), and the arena's enter trigger re-arms (it never settled).
//   Spawned enemies remember their trigger (e.trig; their summons / splits inherit it). all_enemies_dead on a card with
//   `requires` waits only for enemies spawned by those triggers (plus pending spawns); without `requires` it waits for
//   every AWAKE enemy (enemyAwake: a far dormant pack in another section does not block it). Settling needs the awake
//   enemies gone, and settles a fired card only if none of ITS spawns is still alive (a dormant pack you walked away
//   from stays unsettled, so dying respawns it instead of clearing it). Known gap: spawns scheduled through delay()
//   by a part / boss move (not inline in its tick) do not inherit e.trig.
//   enter_area cards live in 8x8-tile buckets (by their circle): each step tests only the cards in the hero's bucket
//   plus any the hero is still inside; other cards are tested every step as before.
//   Each step also records discovery: G.prog.sections[map] (the hero's section) and G.prog.shrines[map] (shrines
//   within SHRINE_SEE tiles or rested at); both are saved (items.js world.sections / world.shrines).
//   shrineWarp(id): from a discovered shrine (within 2.5 tiles) to another discovered shrine of the same map, refused
//   (say + false) while anyEnemyAwake(). The full-map screen (screens.js) calls it.
const LASTING_ACTIONS = { open_portal: 1, close_portal: 1, objective: 1, openGate: 1 };
const WARP_FADE = 0.4, SHRINE_SEE = 3, SHRINE_USE_R = 2.5;
let TRIG_SRC = null;   // the trigger whose actions are running (spawns are tagged with it)
function startTriggers() {
  const m = G.map, settled = G.prog.trig[m.id] || [];
  if (G.arena && !G.arena.done) resetArena(G.arena);
  if (G.warp && !G.fadeDir) G.fade = 0;   // a warp cut short by a map change never leaves its veil up
  G.arena = null; G.warp = null;
  G.trig = { fired: {}, at: {}, t: 0, inside: {}, cp: G.checkpoint, sec: null }; G.kills = {}; G.pendingSpawns = 0; G.objective = m.objective;
  G.shrink = null; G.talk = [];
  triggerBuckets(m);
  if (typeof syncGates === 'function') syncGates(m);
  OBJ_REPLAY = objectiveLog(m.id).length ? 'skip' : 'seed';   // a save from before the log: seed it from the settled cards
  for (const tr of m.triggers) if (settled.includes(tr.id)) {
    G.trig.fired[tr.id] = true; G.trig.at[tr.id] = 0;
    TRIG_SRC = tr.id;
    try { for (const a of tr.actions || []) if (LASTING_ACTIONS[a.type]) runAction(a); } finally { TRIG_SRC = null; }
  }
  OBJ_REPLAY = null;
  setObjective();   // death / re-entry: the tracker comes from the saved objective log, not the cards' array order
  openingOnEnter(m);
}
// ===== §28 the opening: a bare start, the HUD one noun at a time, Pip's light ===================================================
// G.prog.secrets.opening = 'bare' marks a game that STARTED bare (set when a bare level-1 hero first enters the world's start map
// with nothing settled there: New Dream). Saves from before §28 never carry it, so they keep the full HUD and every opening card
// they settled (the opening cards' actions are also guarded by state: a filled slot never gets a pickup). Only that game's HUD
// fades in per noun; the pieces it has shown are saved as G.prog.secrets['hud:<piece>'].
// A bare hero dropped into a LATER map by a dev URL (?map=, ?playtest) gets the four first-kit Commons instead.
function openingOnEnter(m) {
  const p = G.player, S = G.prog.secrets || (G.prog.secrets = {});
  if (!p || !G.world) return;
  if (!S.opening && isBare(p) && p.level === 1 && m.id === G.world.start && !(G.prog.trig[m.id] || []).length) S.opening = 'bare';
  else if (isBare(p) && m.id !== G.world.start && !S.opening) { for (const k of SLOTS) p.equip[k] = firstKitPiece(k); recalcStats(p, true); }
  if (S.opening === 'bare' && m.id !== G.world.start) hudNoun('all');   // leaving the Vale: whatever the opening did not show, shows now
  if (!G.pip || G.pip.map !== m.id) G.pip = { map: m.id, x: p.x + PIP.ox, y: p.y + PIP.oy, z: p.z + PIP.oz, goal: null };
}
// the HUD pieces (hud.js draws each with hudShown(piece) as its alpha): bars (portrait, HP / MP / ST / XP, status row), tracker,
// map (minimap), lmb q qu rmb e eu r f v (skill chips), pockets (z x c). Nouns map to pieces; slot chips also need their skill.
const HUD_PIECES = ['bars', 'tracker', 'map', 'lmb', 'q', 'qu', 'rmb', 'e', 'eu', 'r', 'f', 'v', 'pockets'];
const HUD_NOUNS = { move: ['bars', 'tracker', 'lmb'], vale: ['map'], weapon: ['q'], dodge: ['v'], skill: ['rmb', 'e'], offhand: ['rmb', 'e', 'eu'],
  ultimate: ['qu', 'eu'], chest: ['f'], head: ['r'], boots: ['v'], level: [], potion: ['pockets'], all: HUD_PIECES };
const HUD_FADE = 0.6, HUD_T = {};
function hudNoun(noun) {
  if (!openingActive()) return;
  const S = G.prog.secrets, list = HUD_NOUNS[noun] || [];
  for (const k of list) if (!S['hud:' + k]) { S['hud:' + k] = 1; if (noun !== 'all') HUD_T[k] = G.t; }   // 'all' (leaving the Vale, L3) is instant
}
// 0..1: the piece's fade-in (a piece shown in an earlier session is simply on)
function hudShown(piece) {
  if (!openingActive() || G.state === 'title') return 1;
  if (!G.prog.secrets['hud:' + piece]) return 0;
  const t0 = HUD_T[piece]; return t0 == null ? 1 : clamp((G.t - t0) / HUD_FADE, 0, 1);
}
// nouns read from play state each step (the ones no single call site owns)
function hudWatch(p) {
  if (!openingActive()) return;
  const T = G.trig, S = G.prog.secrets;
  if (p.equip.weapon && !S['hud:q']) hudNoun('weapon');
  if (p.equip.offhand && !S['hud:eu']) hudNoun('offhand');
  if (p.equip.chest && !S['hud:f']) hudNoun('chest');
  if (p.equip.head && !S['hud:r']) hudNoun('head');
  if (p.equip.boots && !S['hud:v']) hudNoun('boots');
  if (p.equip.weapon && (p.ult || 0) >= ultNeed(p) && !S['hud:qu']) hudNoun('ultimate');
  if (p.level >= 3) hudNoun('all');
  if (p.hp < p.maxHp - 0.5 && T && T.fired.garden_ambush && !S['hud:pockets']) hudNoun('potion');
}
// Pip (§28): a small warm light parented to the hero (offset up-left, a slow bob). An objective card with x / y sends it drifting
// up to 2 tiles toward that point for ~1 s, then it returns. No AI, not interactable (the full companion is M7). hud.js draws it;
// pipLight() is the lights-pass record for render.js (render lane).
const PIP = { ox: -0.9, oy: 0.3, oz: 3.4, bob: 0.18, lead: 2, leadT: 1, follow: 5 };   // offset: up-left of the hero, head height
function pipPoint(x, y) { if (G.pip && isFinite(x) && isFinite(y)) G.pip.goal = { x, y, t: G.t }; }
function updatePip(dt) {
  const p = G.player, P = G.pip; if (!p || !P) return;
  let tx = p.x + PIP.ox, ty = p.y + PIP.oy;
  const g = P.goal;
  if (g) {
    const age = G.t - g.t, k = age < PIP.leadT ? Math.sin(Math.min(1, age / PIP.leadT) * Math.PI / 2) : Math.max(0, 1 - (age - PIP.leadT) / 0.6);
    const dx = g.x - p.x, dy = g.y - p.y, l = Math.hypot(dx, dy) || 1, d = Math.min(PIP.lead, l);
    tx += dx / l * d * k; ty += dy / l * d * k;
    if (age > PIP.leadT + 0.6) P.goal = null;
  }
  const f = 1 - Math.exp(-dt * PIP.follow);
  P.x += (tx - P.x) * f; P.y += (ty - P.y) * f;
  P.z += (p.z + PIP.oz + Math.sin(G.t * 2.2) * PIP.bob - P.z) * f;
}
function pipLight() {
  const P = G.pip; if (!P || !G.player || G.player.dead) return null;
  return { sx: isoX(P.x, P.y), sy: isoY(P.x, P.y, P.z), r: 40 + 4 * Math.sin(G.t * 3.1), col: '#ffd9a0', a: 0.75 };
}
// ===== retries: once-per-save presentation, and the objective from progress (QA m1 / m2) =====================
// G.prog.once['zone:<map>' | 'dlg:<id>' | 'dlg:<map>:<card>' | 'banner:<map>:<card>'] = 1: zone banners (main.js
// enterMap), trigger dialogue (boss intros, hints) and boss / map_enter banners play once per save, so a retry after a
// death does not replay them. Saved as world.once.
function onceSeen(key) { const S = G.prog.once || (G.prog.once = {}); if (S[key]) return true; S[key] = 1; return false; }
let TRIG_CARD = null;   // the card whose actions are running (fireTrigger), for the once-per-save keys
// G.prog.obj[map] = [{ id: setter card, text, done }] in fire order (saved as world.obj). An entry is CLOSED when a
// completion card (all_enemies_dead / enemy_killed) that transitively `requires` its setter fires, unless the setter is
// itself a completion card (its line is the "what next" after a fight). currentObjective() = the newest open entry,
// else the active main quest step of this zone, else the map's own line. Recomputed (setObjective) on map entry /
// respawn, on every objective action and whenever a completion card fires (a section cleared).
let OBJ_REPLAY = null;
const COMPLETION_WHEN = { all_enemies_dead: 1, enemy_killed: 1 };
function objectiveLog(mid) { const O = G.prog.obj || (G.prog.obj = {}); return O[mid] || (O[mid] = []); }
function recordObjective(text) {
  if (OBJ_REPLAY === 'skip' || !G.map) return;
  const L = objectiveLog(G.map.id), id = TRIG_SRC || null;
  if (id) { const i = L.findIndex(e => e.id === id); if (i >= 0) L.splice(i, 1); }
  L.push({ id, text: text || '' });
  if (L.length > 48) L.shift();
}
function closeObjectives(tr) {
  const m = G.map, L = objectiveLog(m.id); if (!L.length || !(tr.requires || []).length) return;
  const req = new Set(), stack = (tr.requires || []).slice();
  while (stack.length) { const id = stack.pop(); if (req.has(id)) continue; req.add(id); const t = m.triggers.find(q => q.id === id); if (t) stack.push(...(t.requires || [])); }
  for (const e of L) if (e.id && req.has(e.id)) { const t = m.triggers.find(q => q.id === e.id); if (!t || !COMPLETION_WHEN[(t.when || {}).type]) e.done = true; }
}
function questObjective(mid) {
  if (typeof QUESTS === 'undefined') return '';
  const Q = G.prog.quests || {};
  for (const d of QUESTS) { const st = Q[d.id]; if (d.main && d.zone === mid && st && st !== 'done' && d.steps && d.steps[st.step]) return d.steps[st.step]; }
  return '';
}
function currentObjective() {
  const m = G.map; if (!m || !G.prog) return G.objective || '';
  if (G.objective !== G._objAuto) return G.objective || '';   // written directly (a scene, a test): show that
  return objectiveFromProgress(m);
}
function objectiveFromProgress(m) {
  const L = (G.prog.obj || {})[m.id] || [];
  for (let i = L.length - 1; i >= 0; i--) if (!L[i].done) return L[i].text;
  return L.length ? questObjective(m.id) || m.objective || '' : m.objective || questObjective(m.id) || '';
}
function setObjective() { if (!G.map || !G.prog) return; G.objective = G._objAuto = objectiveFromProgress(G.map); }
function settleTriggers() {
  const T = G.trig, m = G.map;
  if (G.pendingSpawns || G.enemies.some(enemyAwake)) return;
  // per trigger: a card whose spawns are still alive (dormant far away, or part-asleep) is not settled, so dying cannot clear it
  const live = new Set(); for (const e of G.enemies) if (!e.dead && !e.dummy && e.trig) live.add(e.trig);
  const ids = m.triggers.filter(tr => T.fired[tr.id] && tr.once !== false && (tr.when || {}).type !== 'map_enter' && !live.has(tr.id)).map(tr => tr.id);
  if (ids.length !== (G.prog.trig[m.id] || []).length) G.prog.trig[m.id] = ids;
}
// enter_area cards bucketed by their circle (every bucket it overlaps); other cards stay on the per-step list
function triggerBuckets(m) {
  if (m._tb && m._tb.ref === m.triggers && m._tb.len === m.triggers.length) return m._tb;
  const B = typeof GRID_B !== 'undefined' ? GRID_B : 8, cells = new Map(), other = [];
  m.triggers.forEach((tr, i) => {
    const w = tr.when || {};
    if (w.type !== 'enter_area' || !isFinite(+w.x) || !isFinite(+w.y)) { other.push(i); return; }
    const r = +w.r || 1;
    for (let by = Math.floor((+w.y - r) / B); by <= Math.floor((+w.y + r) / B); by++) for (let bx = Math.floor((+w.x - r) / B); bx <= Math.floor((+w.x + r) / B); bx++) {
      const k = bx + ',' + by; let q = cells.get(k); if (!q) cells.set(k, q = []); q.push(i);
    }
  });
  return (m._tb = { B, cells, other, ref: m.triggers, len: m.triggers.length });
}
function triggerCandidates(m, T) {
  const tb = triggerBuckets(m), p = G.player, list = tb.other.slice();
  const here = tb.cells.get(Math.floor(p.x / tb.B) + ',' + Math.floor(p.y / tb.B));
  if (here) for (const i of here) list.push(i);
  for (const id in T.inside) if (T.inside[id]) { const i = m.triggers.findIndex(t => t.id === id); if (i >= 0) list.push(i); }
  list.sort((a, b) => a - b);
  T.checked = list.length;
  return list;
}
function updateTriggers(dt) {
  const m = G.map, T = G.trig; if (!T) return;
  T.t += dt;
  updatePip(dt); if (G.player) hudWatch(G.player);
  updateWarp(dt);
  updateDiscovery(m, T);
  let prev = -1;
  for (const i of triggerCandidates(m, T)) {
    if (i === prev) continue; prev = i;
    const tr = m.triggers[i];
    if (tr.disabled) continue;
    if (tr.opening && !openingActive()) continue;   // §28 `opening: true`: a bare-start beat; never plays for a save from before §28
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
    case 'all_enemies_dead': {
      if (G.pendingSpawns) return false;
      const req = tr.requires || [];
      return req.length ? !G.enemies.some(e => !e.dead && !e.dummy && req.includes(e.trig)) : !G.enemies.some(enemyAwake);
    }
    case 'enemy_killed': return (G.kills[w.enemy || 'any'] || 0) >= (+w.count || 1);
    case 'boss_hp_below': return !!(G.boss && !G.boss.dead && G.boss.hp / G.boss.maxHp * 100 < +w.pct);
    case 'player_hp_below': return p.hp / p.maxHp * 100 < +w.pct;
  }
  return false;
}
function fireTrigger(tr) {
  const T = G.trig; T.fired[tr.id] = true; T.at[tr.id] = T.t;
  let d = 0;
  if (COMPLETION_WHEN[(tr.when || {}).type]) closeObjectives(tr);   // a section / fight cleared: its objective closes
  const run = a => { const was = TRIG_SRC, wc = TRIG_CARD; TRIG_SRC = tr.id; TRIG_CARD = tr; try { runAction(a); } finally { TRIG_SRC = was; TRIG_CARD = wc; } };
  for (const a of tr.actions || []) {
    if (a.type === 'wait') { d += +a.seconds || 0; continue; }
    if (d > 0) { G.pendingSpawns++; delay(d, () => { G.pendingSpawns--; run(a); }); } else run(a);
  }
  setObjective();
}
// once-per-save keys for a card's banner / dialogue (null = always plays: repeating cards, NPC talk outside triggers)
function onceKey(kind, a) {
  const tr = TRIG_CARD; if (!tr || tr.once === false || !G.map) return null;
  if (kind === 'dlg') return a.id ? 'dlg:' + a.id : `dlg:${G.map.id}:${tr.id}`;
  return a.boss || (tr.when || {}).type === 'map_enter' ? `banner:${G.map.id}:${tr.id}:${a.title || ''}` : null;
}
// spawns made by trigger cards carry the card id (e.trig) and the running arena (e.arena)
function tagSpawn(e, src) { if (e && src) e.trig = src; return e; }
function runAction(a) {
  const m = G.map, p = G.player;
  switch (a.type) {
    case 'spawn': {
      const n = Math.max(1, +a.count || 1);
      const src = TRIG_SRC;
      for (let i = 0; i < n; i++) { G.pendingSpawns++; delay(0.15 * i, () => { G.pendingSpawns--; tagSpawn(spawnAt(a.enemy || 'slime', a.x === '' ? null : a.x, a.y === '' ? null : a.y, a.radius, a.instant, a.elite), src); }); }
      break;
    }
    case 'spawn_boss': G.boss = tagSpawn(spawnEnemy('boss', a.x != null && a.x !== '' ? +a.x : m.cx + 1.5, a.y != null && a.y !== '' ? +a.y : m.cy - 1.5, 1.6), TRIG_SRC); break;
    case 'banner': { const k = onceKey('banner', a); if (k && onceSeen(k)) break; }
      G.banner = { s: a.title || '', sub: a.sub || '', t: a.boss ? 3.4 : 2.6, max: a.boss ? 3.4 : 2.6, boss: !!a.boss }; if (a.boss) { sfx('roar'); shake(6); } break;
    case 'message': say(a.text || ''); break;
    case 'objective': recordObjective(a.text); if (!OBJ_REPLAY) { setObjective(); if (a.x != null && a.x !== '') pipPoint(+a.x, +a.y); } break;
    case 'gear': gearAction(a); break;   // §28 a first-kit piece lying in the world (items.js)
    case 'noun': hudNoun(a.noun); break;   // §28 a HUD piece fades in (game.js hudNoun)
    case 'heal': healPlayer(p, p.maxHp * (+a.pct || 0) / 100); break;
    case 'open_portal': case 'close_portal': {
      const byId = a.id != null && a.id !== '';
      m.portals.forEach((pt, i) => { if (byId ? pt.id === a.id : (a.index == null || a.index === '' || +a.index === -1 || +a.index === i)) pt.open = a.type === 'open_portal'; }); break;
    }
    case 'dialogue': { const k = onceKey('dlg', a); if (k && onceSeen(k)) break; talk(a); break; }
    case 'openGate': if (typeof openGate === 'function') openGate(a.id, true); if (G.arena && !G.arena.done && G.arena.gates.includes(a.id)) { G.arena.done = true; G.arena = null; } break;   // won: the fight is over
    case 'closeGate': if (typeof closeGate === 'function') closeGate(a.id); break;
    case 'warp': startWarp(a.to != null ? a.to : { x: a.x, y: a.y }); break;
    case 'arena': startArena(a); break;
    case 'quest': questAction(a); break;
    case 'spawnPack': spawnPack(a); break;
    case 'clear_enemies': for (const e of G.enemies.slice()) if (!e.dummy && !e.dead) killEnemy(e); break;
    case 'shake': shake(+a.power || 6); break;
    case 'sound': sfx(a.name || 'portal'); break;
    case 'teleport': if (G.world.maps[a.map]) transition(a.map); break;
    case 'checkpoint': { const has = v => v != null && v !== ''; setCheckpoint(has(a.x) ? +a.x : p.x, has(a.y) ? +a.y : p.y, a.text); break; }
    case 'loot': lootAction(a); break;
    case 'vantage': if (typeof startVantage === 'function') startVantage(a); break;   // §29 G3 the vantage reveal (screens.js)
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
  const src = TRIG_SRC;
  pk.members.forEach((type, i) => {
    const ang = i / pk.members.length * Math.PI * 2 + 0.3;
    G.pendingSpawns++;
    delay(0.15 * i, () => { G.pendingSpawns--; const e = tagSpawn(spawnAt(type, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 0.4, a.instant, i === 0 ? a.elite : null), src); if (e) e.pack = pk.id; });
  });
}
// ===== §29 G3 root ladders + drop-down ledges ===================================================================================
// startClimb(o): o = a root_ladder object (maps.js). Up: rise along the roots at the foot, then step onto the top; down: step to the
// lip, then sink down the roots. p.climb = { t, dur, a, b, z0, z1, up } (the hero is rooted and untouchable meanwhile).
const CLIMB_T = 0.6, FALL_G = 70;
function startClimb(o) {
  const p = G.player, m = G.map; if (!p || p.dead || p.climb || p.dash || G.warp || !o || !o.src || !o.src.to) return false;
  const to = { x: +o.src.to.x, y: +o.src.to.y }, up = (+o.src.h || 0) > 0;
  p.climb = { t: 0, dur: CLIMB_T, a: { x: o.x, y: o.y }, b: to, z0: tileH(m, o.x, o.y), z1: tileH(m, to.x, to.y), up };
  p.x = o.x; p.y = o.y; p.z = p.climb.z0; p.fall = null;
  sfx('pickup');
  return true;
}
function updateClimb(p, dt) {
  const c = p.climb, foot = c.up ? c.a : c.b;
  c.t += dt; const k = clamp(c.t / c.dur, 0, 1);
  p.rootT = Math.max(p.rootT, 0.05); p.invulnT = Math.max(p.invulnT, 0.1); p.moving = true; p.walkT += dt; p.back = c.up;
  if (c.up) { const kz = clamp(k / 0.8, 0, 1), kx = clamp((k - 0.8) / 0.2, 0, 1); p.z = lerp(c.z0, c.z1, kz * kz * (3 - 2 * kz)); p.x = lerp(foot.x, c.b.x, kx); p.y = lerp(foot.y, c.b.y, kx); }
  else { const kx = clamp(k / 0.2, 0, 1), kz = clamp((k - 0.2) / 0.8, 0, 1); p.x = lerp(c.a.x, foot.x, kx); p.y = lerp(c.a.y, foot.y, kx); p.z = lerp(c.z0, c.z1, kz * kz * (3 - 2 * kz)); }
  if (Math.random() < dt * 10) burst(p.x, p.y, p.z + 0.4, 1, ['#8a7a5a', '#c8b090'], 1);
  if (k >= 1) { p.x = c.b.x; p.y = c.b.y; p.z = tileH(G.map, p.x, p.y); p.climb = null; p.moving = false; }
}
// a drop: once the ground is more than 1.6 levels below the hero, gravity takes over (FALL_G levels / s^2; 9 levels ~ 0.5 s)
function updateFall(p, th, dt) {
  if (!p.fall && p.z - th > 1.6) p.fall = { vz: 0, from: p.z };
  if (!p.fall) { p.z = lerp(p.z, th, Math.min(1, dt * 14)); return; }
  p.fall.vz -= FALL_G * dt; p.z += p.fall.vz * dt; p.invulnT = Math.max(p.invulnT, 0.15);
  if (p.z <= th) {
    const h = p.fall.from - th; p.z = th; p.fall = null; p.landT = 0.18; p.rootT = Math.max(p.rootT, 0.12);
    burst(p.x, p.y, th + 0.1, Math.min(22, 8 + Math.round(h)), ['#c8b090', '#e8dcc0', '#8a7a5a'], 2.4);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addPart({ x: p.x + Math.cos(a) * 0.3, y: p.y + Math.sin(a) * 0.3, z: th + 0.1, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, vz: 0.4, life: 0.5, t: 0, col: '#e8dcc0', grav: 0.6, size: 2, glow: false }); }
    shake(Math.min(5, 1.5 + h * 0.25)); sfx('boom');
  }
}
// ===== warps (same map, 0.4 s fade) ===========================================================================
// startWarp(to, { door }) -> false when the target does not resolve or a warp is already running. G.warp = { t, dur,
// dst, done }; G.fade is written directly (G.fadeDir stays 0, so main.js never reloads the map).
function startWarp(to, o = {}) {
  const m = G.map, p = G.player; if (!m || !p || p.dead || G.warp) return false;
  const dst = typeof resolveWarp === 'function' ? resolveWarp(m, to) : null;
  if (!dst) { if (typeof console !== 'undefined') console.warn('warp: no target ' + JSON.stringify(to)); return false; }
  G.warp = { t: 0, dur: WARP_FADE, dst, done: false, from: { x: p.x, y: p.y }, door: o.door || null };
  p.dash = null;
  if (typeof IN !== 'undefined' && IN.clearAimHold) IN.clearAimHold();
  sfx('portal');
  return true;
}
function updateWarp(dt) {
  const W = G.warp; if (!W) return;
  const p = G.player, m = G.map, half = W.dur / 2;
  W.t += dt; p.rootT = Math.max(p.rootT, 0.05); p.invulnT = Math.max(p.invulnT, 0.2);
  if (!W.done && W.t >= half) {
    W.done = true; p.x = W.dst.x; p.y = W.dst.y; p.z = tileH(m, p.x, p.y);
    G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
    G.projs = G.projs.filter(q => q.friendly);
    if (typeof ensureChunkAt === 'function') ensureChunkAt(m, p.x, p.y);   // the arrival chunk, behind the fade
    if (typeof HUD !== 'undefined') HUD.fogTile = null;
  }
  G.fade = W.t < half ? W.t / half : Math.max(0, 1 - (W.t - half) / half);
  if (W.t >= W.dur) { G.fade = 0; G.warp = null; }
}
// ===== discovery: sections + shrines (saved per map) ============================================================
const progList = (k, id) => { const P = G.prog[k] || (G.prog[k] = {}); return P[id] || (P[id] = []); };
const shrinesOf = m => m._shrines || (m._shrines = m.objects.filter(o => o.shrineId));   // every shrine (discovery, markers)
const warpShrine = o => !(o.src && o.src.warp === false);   // warp: false = a plain checkpoint, never a warp end
const shrineFound = (m, id) => progList('shrines', m.id).includes(id);
function discoverShrine(m, o) {
  const L = progList('shrines', m.id); if (L.includes(o.shrineId)) return false;
  L.push(o.shrineId); return true;
}
function updateDiscovery(m, T) {
  const p = G.player; if (!p || p.dead) return;
  const sec = typeof sectionAt === 'function' ? sectionAt(m, p.x, p.y) : null;
  if (sec && sec !== T.sec) {
    T.sec = sec; const L = progList('sections', m.id);
    if (!L.includes(sec.id)) { L.push(sec.id); if (sec.id !== 'main' && T.t > 0.5 && typeof UI !== 'undefined' && UI.toast) UI.toast({ text: 'Discovered: ' + (sec.name || sec.id), col: '#9ef0ff' }); }
  }
  if (G.checkpoint !== T.cp) {   // rested at a shrine: it is discovered too
    T.cp = G.checkpoint;
    if (G.checkpoint && G.checkpoint.map === m.id) for (const o of shrinesOf(m)) if (dist(o.x, o.y, G.checkpoint.x, G.checkpoint.y) < SHRINE_USE_R) discoverShrine(m, o);
  }
  if ((T.shT = (T.shT || 0) - 1) <= 0) { T.shT = 15; for (const o of shrinesOf(m)) if (dist(o.x, o.y, p.x, p.y) < SHRINE_SEE) discoverShrine(m, o); }
}
const shrineHere = (m = G.map, p = G.player) => shrinesOf(m).find(o => warpShrine(o) && dist(o.x, o.y, p.x, p.y) < SHRINE_USE_R) || null;
// the shrines the full-map screen offers: discovered, same map, not the one you stand at
function shrineTargets(m = G.map) { const here = shrineHere(m); return shrinesOf(m).filter(o => o !== here && warpShrine(o) && shrineFound(m, o.shrineId)); }
function shrineWarp(id) {
  const m = G.map, p = G.player, here = shrineHere(m, p);
  if (!here || !shrineFound(m, here.shrineId)) { say('Stand at a shrine you have found to warp.'); return false; }
  const to = shrinesOf(m).find(o => o.shrineId === id);
  if (!to || to === here || !warpShrine(to) || !shrineFound(m, id)) { say('That shrine is not attuned yet.'); return false; }
  if (anyEnemyAwake()) { say('Enemies are awake nearby: the shrine will not answer.'); sfx('hurt'); return false; }
  return startWarp(id);
}
// ===== inline arena ===========================================================================================
function startArena(a) {
  const m = G.map, id = a.id || 'arena', gates = [].concat(a.gate || a.gates || []);
  if (G.arena && !G.arena.done && G.arena.id === id) return;
  const x = +a.x, y = +a.y, r = +a.r || 6, pillars = [];
  for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(m.H - 1, Math.ceil(y + r)); j++) for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(m.W - 1, Math.ceil(x + r)); i++)
    if (m.type[j][i] === 'pillar' && dist(i + 0.5, j + 0.5, x, y) <= r) pillars.push([i, j]);
  G.arena = { id, map: m.id, gates, x, y, r, pillars, broken: [], done: false };
  for (const g of gates) if (typeof closeGate === 'function') closeGate(g);
}
// a boss move breaks a pillar tile: it becomes floor until the arena resets
function breakPillar(i, j) {
  const m = G.map; if (!m || m.type[j] == null || m.type[j][i] !== 'pillar') return false;
  m.type[j][i] = 'x'; m.block[j][i] = false;
  for (const c of m.columns) if (c.i === i && c.j === j) c.gone = true;
  if (G.arena && !G.arena.done) G.arena.broken.push([i, j]);
  burst(i + 0.5, j + 0.5, 1, 14, ['#8a80b0', '#ffffff'], 3); shake(4);
  return true;
}
function resetArena(A) {
  const m = G.maps[A.map]; if (!m) return;
  for (const [i, j] of A.broken) { m.type[j][i] = 'pillar'; m.block[j][i] = true; for (const c of m.columns) if (c.i === i && c.j === j) c.gone = false; }
  A.broken = [];
}
