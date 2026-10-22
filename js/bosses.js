'use strict';
// ---------------------------------------------------------------------------
// bosses.js — the BOSS_MOVES library (STORY.md "BOSS_MOVES library") and the boss table BOSSES. Bosses are DATA:
// a boss is a move dictionary + phases; this file runs them. Loaded after parts.js (it adds each boss to ENEMY) and
// before game.js; everything below runs at play time only.
//
// ===== BOSS SCHEMA (BOSS_DATA in js/enemydata.js, or BUILTIN_BOSSES below) ===================================
//   { name, sprite, look?, scale?, kind: 'mini' | 'guardian' | 'final', level (fixed boss level), el, hp (L1 base),
//     res, tags, speed (tiles/s, default 1.6), keep (stops chasing inside this distance, default 2.2), r, hgt,
//     staggerMax (in HEAVY HITS: the bar fills at staggerMax x STAGGER_HIT points; the Warden's 4.8 = the old 12),
//     breakOpen (s stunned when the stagger bar breaks, default 1.5; the Warden keeps 0 = M2a behaviour),
//     nearR (distance for range:'near' moves, default 3.6), xp (levels on kill: guardian 1, mini 0.5), unique?,
//     moveDefs: { name: { type, ...params } },
//     phases: [{ hpBelow (fraction 0..1, or percent > 1), moves: { name: weight }, onEnter: [move or {type:...}],
//                windMul, speedMul, cdMul (phase tempo; the Warden's phase 2 = 0.8 / 1.35 / 0.75),
//                forms: { moveName: { ...overrides } } (the phase's CUNNING forms, see below; cumulative: a later phase keeps
//                the earlier phases' forms unless it sets a name to null) }],
//     bars: true (§26.1 multi-bar phases: one HP bar per phase; any count, 2 mini / 3 guardian / 4 act boss / 5 Morrow;
//            a phase's hpBelow is the TOP of its bar as a fraction of the total, default (n - i) / n),
//     transition (s between bars, invulnerable, the next phase's onEnter telegraph plays; 1.2-1.8, default 1.5) }
// ===== MULTI-BAR PHASES (§26.1) =============================================================================
//   e.maxHp is the total over all bars and e.hp the total left (hud.js / triggers read those). Each bar is its own pool:
//   bossClampDmg (game.js damageEnemy hook) clamps a hit at the end of the bar, so one burst never skips a phase; the hit
//   that empties a bar starts the transition (bossBarBreak). Writing e.hp directly (tests, debug) jumps phases without one.
//   bossBars(e) -> { n, i (0-based bar), frac (of bar i left), max (bar i's pool in HP: §27 hitlag r = dmg / max), transition (s left,
//   0 = none), tmax (the transition's full length) }; a boss without bars: n 1
// ===== CUNNING FORMS (phases[].forms; checked by bossFairness) ===============================================
//   feint: s   a fake wind-up: the telegraph shows, is cut at s seconds, the boss re-aims and the real wind-up starts
//   then: name a delayed second hit: the move's own (short) open, then the named follow-up with its own wind-up
//   lead: s    aim at the hero's predicted position s seconds ahead (tracked velocity), capped at FAIR_LEAD
//   phases[].frenzy: { after (s in the phase), cdMul, speedMul, text }: a soft DPS check; gaps only, wind-ups never change
// ===== MOVE PARAMS (common) ==================================================================================
//   wind (telegraph s) · open (s after the hit before the boss acts again) · dmg (raw, x the boss's level multiplier)
//   OR hit: 'big' | 'chip' (35-45 % / 8-12 % of the reference hero's eHP at the boss level, REF_EHP; dmgPct overrides)
//   el · stagger · col · cd (pause after the move, default 0.8) · range: 'near' | 'far' | 'any'
//   scale: 'all' (wind + open x phase windMul, default) | 'wind' | 'none' · warnSfx (default WARN_SFX[type])
//   legacy: true = ported timing kept on purpose (fairness check reports it as explained, not red)
// ===== MOVES ================================================================================================
//   cone { arc (deg if > 6.3), r }                 circle { r, at: 'self' | 'player', hitstop }
//   line { len, w, root (s), dash (lunge along it) }   charge { len, w, speed, dur, hitOnce }
//   volley { n, rings, delay, gap, rot, spiral, speed, life, dur }   rain { count, r, spread [min,max], at: 'player' }
//   ring { r0, r1, speed, w }                      beam { len, w, rotate (deg/s), dur, tick }
//   pull { r, force, dur, then }                   summon { kind, n, pattern: 'ring' | 'random', max }
//   zone { kind: lava | void | slow | poison, n, r, life, pattern: 'player' | 'ring' | 'random' }
//   arenaShrink { pattern, k (final radius fraction, 0.65), r0, dur, dmg }   blink { to: 'behind' | 'random' }
//   vanish { dur, then: move name or inline move }  roar { text | banner, dur, adds: [[type, angle, radius]] }
//   sequence { list: [names], gaps: s }            random { weights: { name: w } }
// ===== FAIRNESS (STORY.md, §26.1) ==========================================================================
//   every wind-up >= 0.55 s in every phase (§26.1: a 0.3 s reaction + a sidestep); every big hit leaves >= 1.2 s open
//   (the last link of a 'then' chain); a feint's fake wind-up >= 0.3 s and shorter than the real one; lead <= 0.6 s;
//   bar transitions 1.2-1.8 s with an onEnter telegraph. bossFairness(id) lists violations (balsim prints them).
// ===== HOOKS ================================================================================================
//   warnSfx: each move start calls sfx(M.warnSfx) (game.js sfx ignores names it cannot play; js/sfxdata.js WARN_SFX
//   maps type -> recipe when loaded) and records G.lastWarn = { boss, move, type, sfx, t } (tests, captions).
// ---------------------------------------------------------------------------
const STAGGER_HIT = 2.5;                 // one heavy hit's stagger points (skills give 2-3)
const FAIR_WIND = 0.55, FAIR_OPEN = 1.2, ROAR_WIND = 0.8;   // a roar's default wind-up (warn sfx + ring tele); 0.6 -> 0.55 (§26.1)
const FAIR_REACT = 0.3, FAIR_HERO_SPEED = 3.7, FAIR_HERO_R = 0.4, FAIR_MELEE_D = 1.9;   // walk-out rule: reaction, base hero speed (G.tune), hero radius, melee standoff
const FAIR_FEINT = 0.3, FAIR_LEAD = 0.6, BAR_TRANS = 1.5, BAR_TRANS_RANGE = [1.2, 1.8];   // §26.1 cunning forms + bar transitions
// reference hero eHP by level (§20.3 table; balsim measures the real hero against it)
const REF_EHP_TABLE = [[1, 3, 900, 900], [3, 10, 1100, 1900], [10, 17, 1900, 3000], [17, 24, 3000, 4400], [24, 31, 4400, 6200], [31, 38, 6200, 8500]];
function REF_EHP(L) {
  let row = REF_EHP_TABLE[0]; for (const r of REF_EHP_TABLE) if (L >= r[0]) row = r;
  return row[2] + (row[3] - row[2]) * clamp((L - row[0]) / (row[1] - row[0]), 0, 1);
}
const HIT_FRAC = { big: 0.45, chip: 0.1 };   // of REF_EHP; the real reference hero takes ~36 % / 8 % of its HP (balsim).
// Slash hits read lower (chest families carry slash resist), so slash big hits set dmgPct ~0.6-0.72 (balsim checks 35-45 %).

const BUILTIN_BOSSES = {
  // the M2a fight, ported move for move and timing for timing (acceptance test). M2b balsim retimed its DAMAGE onto the
  // reference eHP (big telegraphed hits 35-45 % of the hero's HP; it was ~7 %). Phase 3 (pillars, spiral) is M4.
  boss: { name: 'The Gloam Warden', kind: 'guardian', level: 17, hp: 25970, speed: 1.6, keep: 2.2, staggerMax: 4.8, breakOpen: 0, xp: 1, bob: true, nearR: 3.6,
    moveDefs: {
      cleave: { type: 'cone', arc: 2.0, r: 3.6, wind: 0.85, open: 0.55, hit: 'big', dmgPct: 0.72, el: 'slash', cd: 0.9, range: 'near', legacy: true },
      slam: { type: 'circle', at: 'self', r: 3.4, wind: 1.1, open: 0.6, hit: 'big', dmgPct: 0.56, el: 'gloom', cd: 0.8, range: 'near', hitstop: 0.08, legacy: true },
      volley: { type: 'volley', n: 16, rings: 3, delay: 0.35, gap: 0.45, rot: 0.2, speed: 4.6, life: 3.2, hit: 'chip', dmgPct: 0.04, el: 'arcane', dur: 1.8, scale: 'none', cd: 1.0, legacy: true },
      charge: { type: 'charge', len: 8, w: 1.1, wind: 0.75, speed: 15, dur: 0.5, open: 0.6, hit: 'big', dmgPct: 0.72, el: 'slash', scale: 'wind', cd: 0.8, range: 'far', legacy: true },
      voidrain: { type: 'rain', count: 6, r: 1.3, spread: [1, 4], wind: 1.0, dur: 1.5, hit: 'chip', el: 'gloom', scale: 'none', cd: 0.6 },
    },
    phases: [
      { hpBelow: 1, moves: { cleave: 2, slam: 1, volley: 1, charge: 2 } },
      { hpBelow: 0.5, moves: { cleave: 2, slam: 1, volley: 1, charge: 2, voidrain: 2 }, windMul: 0.8, speedMul: 1.35, cdMul: 0.75,
        onEnter: [{ type: 'roar', text: 'The Warden calls upon the nightmare!', dur: 1.6, cd: 0.5, ring: 6, adds: [['slime', 0.4, 3.5], ['wisp', 1.97, 3.5], ['slime', 3.54, 3.5], ['wisp', 5.11, 3.5]] }] },
    ] },
};
// engine-side defaults for the BOSS_DATA rows (numbers BOSS_DATA leaves out: damage, look, timings)
const BOSS_FILL = {
  mossjaw: { look: 'hound', scale: 1.9, r: 0.8, hgt: 3.6, speed: 2.2, keep: 1.6, blood: '#7ac060', breakOpen: 1.5, tags: ['beast'], unique: null, rune: true,
    moves: { lunge: { hit: 'big', dmgPct: 0.6, el: 'slash', w: 0.7, dash: true, cd: 0.6, scale: 'wind' },   // QA M1 0.6 -> 0.4; §26.2 back to 0.6 (~39 %, in the §20.3 band; the 45 % cap holds) once the howl pile was tamed rootSpit: { hit: 'chip', el: 'nature', spread: [0.8, 2.6], cd: 0.6 },
      burrow: { hit: 'big', el: 'nature', cd: 0.6, scale: 'wind' },
      howl: { cd: 0.8, max: 2, rest: 12, addHp: 0.8, addDmg: 0.7, why: 'QA run-big M3: 12/12 deaths to a 3-hound pile -> 2 alive max, 12 s rest, hounds -20 % HP / -30 % bite, flee on the boss death' } } },
  bramblehorn: { look: 'troll', scale: 1.35, r: 1.0, hgt: 5.2, speed: 1.5, keep: 2.4, blood: '#9ab06a', breakOpen: 2, tags: ['beast'], unique: 'rootcrown',
    moves: { stomp: { hit: 'big', el: 'nature', hitstop: 0.06, cd: 1.5, scale: 'none', why: 'self-centred r3: 0.9 s in every bar (x0.7 = 0.63 s leaves 1.2 tiles of walk after a 0.3 s reaction; it needs 1.5 from melee range)' }, rootGrab: { hit: 'chip', el: 'nature', w: 0.6, cd: 1.5 }, trunkSwipe: { hit: 'chip', dmgPct: 0.14, el: 'slash', cd: 1.4 },
      backhand: { hit: 'chip', dmgPct: 0.14, el: 'slash', cd: 1.4 }, trample: { hit: 'big', el: 'nature', cd: 1.5, scale: 'wind' },   // §26.2: base gaps +0.8 s (bar 1 calm, cdMul 0.8 / 0.65 tighten bars 2-3)
      rootWall: { k: 0.75, rMin: 5.5, dur: 2, wind: 0.8, open: 1.2, cd: 0.6 }, saplings: { kind: 'sapling', max: 3, cd: 0.8 } } },
};
const BOSSES = {};
(function buildBosses() {
  for (const k in BUILTIN_BOSSES) BOSSES[k] = BUILTIN_BOSSES[k];
  const data = typeof BOSS_DATA !== 'undefined' && BOSS_DATA ? BOSS_DATA : {};
  for (const k in data) {
    const src = data[k], fill = BOSS_FILL[k] || {}, b = Object.assign({}, fill, src);
    b.moveDefs = {};
    for (const n in src.moveDefs || {}) b.moveDefs[n] = Object.assign({}, (fill.moves || {})[n], src.moveDefs[n]);
    b.tags = Array.from(new Set([...(fill.tags || []), ...(src.tags || []), src.type].filter(Boolean)));
    BOSSES[k] = b;
  }
  for (const k in BOSSES) {
    const b = BOSSES[k];
    const n = (b.phases || []).length;
    let forms = {};
    b.phases = (b.phases || [{ hpBelow: 1, moves: Object.fromEntries(Object.keys(b.moveDefs).map(n => [n, 1])) }])
      .map((ph, i) => {
        const hb = ph.hpBelow == null ? (n - i) / n : ph.hpBelow > 1 ? ph.hpBelow / 100 : ph.hpBelow;
        forms = Object.assign({}, forms, ph.forms || {}); for (const f in forms) if (!forms[f]) delete forms[f];   // cumulative; null drops one
        return Object.assign({}, ph, { hpBelow: i === 0 && b.bars ? 1 : hb, forms });
      });
    if (k === 'boss') { Object.assign(ENEMY.boss, { hp: b.hp, boss: k, level: b.level, kind: b.kind }); continue; }
    ENEMY[k] = { name: b.name, ai: 'boss', boss: k, sprite: b.sprite, look: b.look, scale: b.scale, hp: b.hp, r: b.r || 0.9, speed: b.speed || 1.6, dmg: 0, range: 0, wind: 0, cd: 0,
      hgt: b.hgt || 5, blood: b.blood || '#c7a8ff', element: b.el || 'slash', dmgType: b.el || 'slash', el: b.el, res: Object.assign({}, b.res || {}), tags: b.tags || [], parts: [],
      level: b.level, kind: b.kind, xp: b.xp };
  }
})();
const summonAlive = b => G.enemies.filter(o => o.summoner === b && !o.dead).length;
const bossDefOf = e => BOSSES[(ENEMY[e.type] || {}).boss || e.type];

// ---------------------------------------------------------------- runtime
// b.bk = { def, phase, mv (running move state), queue (moves to run next, e.g. phase onEnter), last }
function bossInit(b) {
  const D = bossDefOf(b); if (!D) return;
  b.bk = { def: D, phase: 0, mv: null, queue: [], last: null, transT: 0, pv: null, rest: {} };
  b.staggerCap = (D.staggerMax || STAGGER_CAP / STAGGER_HIT) * STAGGER_HIT;
  b.state = 'chase';
}
const phaseOf = b => b.bk.def.phases[b.bk.phase] || {};
// ---- multi-bar phases (§26.1)
const barsOn = D => !!(D && D.bars && D.phases.length > 1);
const barBot = (D, i) => (i + 1 < D.phases.length ? D.phases[i + 1].hpBelow : 0);   // the bar's floor, fraction of the total
function enterPhase(b, i) {
  const K = b.bk, D = K.def;
  K.phase = i; b.phase2 = i >= 1; b.phaseN = i; K.phaseT = 0; K.frenzy = false; b.frenzy = false;
  K.mv = null; K.queue = (D.phases[i].onEnter || []).slice(); b.state = 'chase'; b.under = false; b.fadeT = 0;
  G.effects = G.effects.filter(e => !(e.type === 'tele' && e.src === b));
}
// the deepest phase whose threshold is at or above the current HP (threshold mode, and direct hp writes in bar mode)
function syncPhase(b) {
  const K = b.bk, D = K.def, f = b.hp / b.maxHp, bars = barsOn(D);
  for (let i = D.phases.length - 1; i > K.phase; i--) if (bars ? f <= D.phases[i].hpBelow + 1e-9 : f < D.phases[i].hpBelow) { enterPhase(b, i); return true; }
  return false;
}
// a hit emptied bar i - 1: the transition (invulnerable; the phase's onEnter telegraph plays while it runs)
function bossBarBreak(b, i) {
  const K = b.bk, D = K.def;
  enterPhase(b, i); b.breakStun = 0;
  K.transT = D.transition != null ? D.transition : BAR_TRANS;
  G.lastBar = { boss: b.type, bar: i, n: D.phases.length, t: G.t, dur: K.transT };
  fx({ type: 'ring', x: b.x, y: b.y, r: 2.5, col: '#ffffff', life: 0.5 }); burst(b.x, b.y, b.z + (b.hgt || 3) * 0.6, 30, ['#ffffff', b.blood || '#c7a8ff'], 4);
  shake(8); hitstop(0.08); sfx('heavy');
}
// game.js damageEnemy hook, called with the final hit size: 0 while a transition runs (invulnerable), else the hit
// clamped at the end of the current bar (the last bar's end is 0 = the kill)
function bossClampDmg(b, dmg) {
  const K = b.bk; if (!K) return dmg;
  if (K.transT > 0) { if (!(K.immT > G.t)) { K.immT = G.t + 0.4; text(b.x, b.y, b.z + (b.hgt || 3), 'IMMUNE', '#9a92b0'); } return 0; }
  const D = K.def; if (!barsOn(D)) return dmg;
  syncPhase(b);
  if (K.phase >= D.phases.length - 1) return dmg;
  const floor = barBot(D, K.phase) * b.maxHp;
  if (b.hp - dmg > floor) return dmg;
  const d = Math.max(0, b.hp - floor);
  bossBarBreak(b, K.phase + 1);
  return d;
}
// the segmented boss bar (hud.js, UI lane) and §27 hitlag (r = dmg / max)
function bossBars(e) {
  const K = e && e.bk; if (!K) return null;
  const D = K.def, on = barsOn(D), i = on ? K.phase : 0;
  const top = on ? D.phases[i].hpBelow : 1, bot = on ? barBot(D, i) : 0, max = Math.max(1e-6, (top - bot) * e.maxHp);
  return { n: on ? D.phases.length : 1, i, frac: clamp((e.hp - bot * e.maxHp) / max, 0, 1), max, transition: Math.max(0, K.transT || 0), tmax: D.transition != null ? D.transition : BAR_TRANS };
}
function bossUpdate(b, dt, d, ang, hidden) {
  const K = b.bk; if (!K) return;
  const D = K.def, p = G.player;
  if (D.bob) b.z = 0.6 + Math.sin(G.t * 2) * 0.25; else b.z = lerp(b.z, tileH(G.map, b.x, b.y), Math.min(1, dt * 12));
  // the hero's velocity (smoothed) for lead-aimed moves; teleports and warps are clamped out
  if (dt > 0) {
    const v = K.pv || (K.pv = { x: p.x, y: p.y, vx: 0, vy: 0 }), cap = (p.speed || 4) * 1.2;
    let vx = (p.x - v.x) / dt, vy = (p.y - v.y) / dt; const m = Math.hypot(vx, vy); if (m > cap) { vx = vx / m * cap; vy = vy / m * cap; }
    const k = Math.min(1, dt * 8); v.vx += (vx - v.vx) * k; v.vy += (vy - v.vy) * k; v.x = p.x; v.y = p.y;
  }
  if (K.transT > 0) K.transT -= dt;
  if (b.breakStun > 0) { b.breakStun -= dt; return; }
  syncPhase(b);
  const ph = phaseOf(b);
  // frenzy (a soft DPS check): after ph.frenzy.after s in this phase the gaps shrink (x cdMul) and the boss speeds up; wind-ups never change
  K.phaseT = (K.phaseT || 0) + dt;
  if (ph.frenzy && !K.frenzy && K.phaseT > ph.frenzy.after) { K.frenzy = true; b.frenzy = true; if (ph.frenzy.text) say(ph.frenzy.text); sfx('roar'); shake(6); text(b.x, b.y, b.z + (b.hgt || 3) + 0.5, 'FRENZY', '#ff6a4a', true); G.lastFrenzy = { boss: b.type, phase: K.phase, t: G.t }; }
  if (!K.mv && K.queue.length) { startMove(b, K.queue.shift()); }
  if (K.mv) { stepMove(b, dt); return; }
  if (K.transT > 0) return;   // the transition holds the boss in place once its onEnter has played
  // chase, then pick a weighted move from the phase table
  const spd = (D.speed || 1.6) * (ph.speedMul || 1) * (K.frenzy ? ph.frenzy.speedMul || 1 : 1);
  if (!hidden && d > (D.keep || 2.2)) moveEntity(b, Math.cos(ang) * spd * dt, Math.sin(ang) * spd * dt, tileH(G.map, b.x, b.y));
  if (b.cd <= 0 && !hidden) {
    const near = d < (D.nearR || 3.6), opts = [];
    for (const n in ph.moves || {}) {
      const M = D.moveDefs[n]; if (!M) continue;
      if (M.range === 'near' && !near || M.range === 'far' && near) continue;
      if (M.rest > 0 && (K.rest[n] || -1e9) > G.t) continue;   // a per-move cooldown (howl: 12 s)
      if (M.type === 'summon' && summonAlive(b) >= (M.max || 6)) continue;   // a summon with its cap full does nothing: it is not picked
      opts.push([n, ph.moves[n]]);
    }
    if (!opts.length) return;
    const roll = () => { let r = Math.random() * opts.reduce((a, o) => a + o[1], 0); for (const o of opts) if ((r -= o[1]) < 0) return o[0]; return opts[0][0]; };
    let n = roll(); if (n === K.last) n = roll(); K.last = n;
    startMove(b, n);
  }
}
// a move reference is a moveDefs name or an inline { type, ... }
function resolveMove(b, ref) {
  if (typeof ref === 'string') { const M = b.bk.def.moveDefs[ref]; return M ? Object.assign({ name: ref }, M, (phaseOf(b).forms || {})[ref]) : null; }
  return ref && ref.type ? Object.assign({ name: ref.name || ref.type }, ref) : null;
}
function startMove(b, ref) {
  const M = resolveMove(b, ref); if (!M || !BOSS_MOVES[M.type]) return;
  const ph = phaseOf(b), W = ph.windMul || 1, sc = M.scale || 'all';
  // lead (cunning form): aim at where the hero will be M.lead s from now, at most FAIR_LEAD s of its top speed ahead
  const p = G.player, v = M.lead > 0 && b.bk.pv, lead = v ? Math.min(M.lead, FAIR_LEAD) : 0;
  const tx = p.x + (v ? v.vx * lead : 0), ty = p.y + (v ? v.vy * lead : 0);
  const s = { M, t: 0, step: 0, wind: (M.wind || 0) * (sc === 'none' ? 1 : W), open: (M.open != null ? M.open : 0.6) * (sc === 'all' ? W : 1), aim: Math.atan2(ty - b.y, tx - b.x), tx, ty,
    feint: M.feint > 0 && FEINTABLE.includes(M.type) ? M.feint : 0 };
  if (M.then && M.type !== 'vanish') s.after = M.then;   // a delayed second hit (cunning form) / pull + blink follow-ups
  b.bk.mv = s; b.state = M.name; b.st = 0; b.step = 0;
  if (M.rest > 0) b.bk.rest[M.name] = G.t + M.rest;
  const warn = M.warnSfx || (typeof WARN_SFX !== 'undefined' && WARN_SFX[M.type]) || null;
  G.lastWarn = { boss: b.type, move: M.name, type: M.type, sfx: warn, wind: s.wind, open: s.open, t: G.t, feint: s.feint || 0, lead, then: M.then || null };
  if (warn) sfx(warn);
  PART_SRC = b; BOSS_MOVES[M.type].start(b, M, s); PART_SRC = null;
}
const FEINTABLE = ['cone', 'line', 'circle', 'charge', 'rain', 'ring', 'beam'];
function stepMove(b, dt) {
  const s = b.bk.mv; s.t += dt; b.st = s.t;
  if (s.feint) {   // the fake wind-up: its telegraph is cut short, then the real one starts, re-aimed
    if (s.t < s.feint) return;
    G.effects = G.effects.filter(e => !(e.type === 'tele' && e.src === b));
    b.bk.mv = null; startMove(b, Object.assign({}, s.M, { feint: 0 })); G.lastWarn.afterFeint = true; return;
  }
  PART_SRC = b; const done = BOSS_MOVES[s.M.type].update(b, s.M, s, dt); PART_SRC = null;
  if (done) endMove(b);
}
function endMove(b) {
  const s = b.bk.mv; b.bk.mv = null; b.state = 'chase';
  const M = s.M, ph = phaseOf(b);
  if (s.after) { startMove(b, s.after); return; }
  b.cd = (M.cd != null ? M.cd : 0.8) * rand(0.8, 1.3) * (ph.cdMul || 1) * (b.bk.frenzy ? ph.frenzy.cdMul || 1 : 1);
}
// stagger break (game.js damageEnemy): the open window
function bossBreak(b) {
  if (b.bk && b.bk.transT > 0) return;   // no stagger break during a bar transition
  const D = bossDefOf(b), t = D && D.breakOpen != null ? D.breakOpen : 1.5;
  if (t > 0) { b.breakStun = t; if (b.bk) b.bk.mv = null; b.state = 'chase'; b.under = false; G.effects = G.effects.filter(e => !(e.type === 'tele' && e.src === b)); text(b.x, b.y, b.z + b.hgt, 'BREAK!', '#ff8a2a', true); shake(6); }
}
// damage of a move hit: absolute (x level multiplier) or a fraction of the reference eHP at the boss level
const moveDmg = (b, M) => M.dmg != null ? M.dmg * b.dm : (M.dmgPct || HIT_FRAC[M.hit] || 0.1) * REF_EHP(b.lvl);
const bossHit = (b, M, x, y) => hurtPlayer(moveDmg(b, M), x != null ? x : b.x, y != null ? y : b.y, M.el || b.el, { boss: true });   // o.boss tags the hit (no cap: a boss hit can kill)
const col0 = M => M.col || '#ff3a7a';
const ghostOf = b => (b.type === 'boss' ? (b.face < 0 ? ART.boss.f : ART.boss.n) : null);

const BOSS_MOVES = {
  cone: {
    start(b, M, s) { tele({ kind: 'cone', x: b.x, y: b.y, ang: s.aim, arc: degArc(M.arc || 2), r: M.r || 3, life: s.wind, col: col0(M) }); },
    update(b, M, s) {
      if (s.step === 0 && s.t > s.wind) {
        if (playerIn({ kind: 'cone', x: b.x, y: b.y, ang: s.aim, arc: degArc(M.arc || 2), r: M.r || 3 })) bossHit(b, M);
        fx({ type: 'slash', x: b.x, y: b.y, z: 1, ang: s.aim, arc: degArc(M.arc || 2), r: M.r || 3, col: '#ff7ae0', life: 0.3, w: 8 }); shake(6); sfx('heavy'); s.step = 1;
      }
      return s.t > s.wind + s.open;
    } },
  circle: {
    start(b, M, s) { const at = M.at === 'player' ? { x: s.tx, y: s.ty } : b; s.x = at.x; s.y = at.y; tele({ kind: 'circle', x: s.x, y: s.y, r: M.r || 3, life: s.wind, col: col0(M) }); },
    update(b, M, s) {
      if (s.step === 0 && s.t > s.wind) {
        // the hit lands where the telegraph was drawn (s.x, s.y from start), not where knockback has since pushed the
        // boss: an honest telegraph (QA B2: stomps landing beside their circle)
        if (playerIn({ kind: 'circle', x: s.x, y: s.y, r: M.r || 3 })) bossHit(b, M, s.x, s.y);
        fx({ type: 'ring', x: s.x, y: s.y, r: (M.r || 3) + 0.2, col: '#ff7ae0', life: 0.5 }); burst(s.x, s.y, 0.2, 50, [b.blood, '#ff7ae0', '#2a1c38'], 6); shake(12); if (M.hitstop) hitstop(M.hitstop); sfx('boom');
        s.step = 1;
      }
      return s.t > s.wind + s.open;
    } },
  line: {
    start(b, M, s) { tele({ kind: 'line', x: b.x, y: b.y, ang: s.aim, len: M.len || 6, w: M.w || 0.6, life: s.wind, col: col0(M) }); s.x = b.x; s.y = b.y; },
    update(b, M, s, dt) {
      if (s.step === 0 && s.t > s.wind) {
        const H = { kind: 'line', x: s.x, y: s.y, ang: s.aim, len: M.len || 6, w: M.w || 0.6 };
        if (playerIn(H) && bossHit(b, M) && M.root) { G.player.rootT = Math.max(G.player.rootT, M.root); text(G.player.x, G.player.y, G.player.z + 3.4, 'ROOTED', '#9ae06a', true); }
        fx({ type: 'line', x: s.x, y: s.y, ang: s.aim, len: M.len || 6, col: '#ffcf9a', life: 0.3 }); shake(5); sfx(M.root ? 'trap' : 'heavy');
        s.step = M.dash ? 1 : 2; s.dashT = 0;
      }
      if (s.step === 1) {   // lunge along the line (Mossjaw): purely visual travel, the hit already resolved
        s.dashT += dt; const sp = (M.len || 6) / 0.25;
        moveEntity(b, Math.cos(s.aim) * sp * dt, Math.sin(s.aim) * sp * dt, tileH(G.map, b.x, b.y));
        if (s.dashT > 0.25) s.step = 2;
      }
      return s.t > s.wind + s.open;
    } },
  charge: {
    start(b, M, s) { tele({ kind: 'line', x: b.x, y: b.y, ang: s.aim, len: M.len || 8, w: M.w || 1.1, life: s.wind, col: col0(M) }); s.hitP = false; },
    update(b, M, s, dt) {
      const dur = M.dur != null ? M.dur : (M.len || 8) / (M.speed || 15);
      if (s.step === 0 && s.t > s.wind) { s.step = 1; sfx('dash'); }
      if (s.step === 1) {
        moveEntity(b, Math.cos(s.aim) * (M.speed || 15) * dt, Math.sin(s.aim) * (M.speed || 15) * dt, tileH(G.map, b.x, b.y));
        const g = ghostOf(b); if (g && Math.random() < 0.6) fx({ type: 'ghost', x: b.x, y: b.y, z: b.z, life: 0.3, spr: g, col: '#ff5aa0' });
        if (!s.hitP && dist(b.x, b.y, G.player.x, G.player.y) < b.r + G.player.r + 0.3) { s.hitP = M.hitOnce !== false; bossHit(b, M); }
        if (s.t > s.wind + dur) { s.step = 2; shake(5); }
      }
      return s.t > s.wind + dur + s.open;
    } },
  volley: {
    start() {},
    update(b, M, s) {
      const rings = M.rings || 3, delay = M.delay != null ? M.delay : Math.max(FAIR_WIND, s.wind), gap = M.gap || 0.45;
      if (s.step < rings && s.t > delay + s.step * gap) {
        const n = M.n || 16, rot = (M.spiral ? s.step * (M.rot || 0.3) : s.step * (M.rot || 0.2));
        for (let k = 0; k < n; k++) spawnProj({ x: b.x, y: b.y, z: 3, ang: k / n * Math.PI * 2 + rot, speed: M.speed || 4.6, r: 0.35, dmg: moveDmg(b, M), el: M.el || 'arcane', life: M.life || 3.2, kind: 'orb', col: M.col || '#ff7ae0', friendly: false });
        sfx('arcane'); s.step++;
      }
      return s.t > (M.dur || delay + rings * gap + s.open);
    } },
  rain: {
    start(b, M, s) {
      const p = { x: s.tx, y: s.ty }, [lo, hi] = Array.isArray(M.spread) ? M.spread : [1, M.spread || 3];   // the hero (or its lead point)
      for (let k = 0; k < (M.count || 6); k++) {
        const a = Math.random() * 6.28, r = k === 0 ? 0 : lo + Math.random() * (hi - lo), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, R = M.r || 1.3;
        tele({ kind: 'circle', x, y, r: R, life: s.wind || 1, col: col0(M), onDone: o => {
          if (b.dead) return;
          if (playerIn({ kind: 'circle', x: o.x, y: o.y, r: R })) bossHit(b, M, o.x, o.y);
          fx({ type: 'pillar', x: o.x, y: o.y, col: M.col || '#ff5aa0', life: 0.4, r: R }); burst(o.x, o.y, 0, 12, [M.col || '#ff7ae0', '#2a1c38'], 3); shake(3);
        } });
      }
      sfx('veil');
    },
    update: (b, M, s) => s.t > (M.dur || (s.wind || 1) + s.open) },
  ring: {
    start(b, M, s) { s.x = b.x; s.y = b.y; tele({ kind: 'circle', x: b.x, y: b.y, r: M.r1 || 6, life: s.wind, col: col0(M) }); s.hit = false; },
    update(b, M, s) {
      if (s.t <= s.wind) return false;
      const r = (M.r0 || 0.5) + (s.t - s.wind) * (M.speed || 5), w = M.w || 0.5, p = G.player;
      if (Math.random() < 0.5) fx({ type: 'ring', x: s.x, y: s.y, r, col: M.col || '#ff7ae0', life: 0.12 });
      if (!s.hit && Math.abs(dist(p.x, p.y, s.x, s.y) - r) < w + p.r) { s.hit = true; bossHit(b, M); }
      return r > (M.r1 || 6) && s.t > s.wind + ((M.r1 || 6) - (M.r0 || 0.5)) / (M.speed || 5) + s.open;
    } },
  beam: {
    start(b, M, s) { tele({ kind: 'line', x: b.x, y: b.y, ang: s.aim, len: M.len || 7, w: M.w || 0.5, life: s.wind, col: col0(M) }); s.a = s.aim; s.tickT = 0; },
    update(b, M, s, dt) {
      if (s.t <= s.wind) return false;
      const dur = M.dur || 2.5; s.a += (M.rotate || 45) * Math.PI / 180 * dt; s.tickT -= dt;
      fx({ type: 'line', x: b.x, y: b.y, ang: s.a, len: M.len || 7, col: M.col || '#ff7ae0', life: 0.05 });
      if (s.tickT <= 0 && playerIn({ kind: 'line', x: b.x, y: b.y, ang: s.a, len: M.len || 7, w: M.w || 0.5 })) { s.tickT = M.tick || 0.3; bossHit(b, M); }
      if (s.t > s.wind && !s.snd) { s.snd = true; sfx('beam'); }
      return s.t > s.wind + dur + s.open;
    } },
  pull: {
    start(b, M, s) { tele({ kind: 'circle', x: b.x, y: b.y, r: M.r || 5, life: s.wind, col: col0(M) }); if (M.then) s.after = M.then; },
    update(b, M, s, dt) {
      if (s.t <= s.wind) return false;
      const p = G.player, d = dist(p.x, p.y, b.x, b.y);
      if (d < (M.r || 5) && d > 0.5 && !(p.dash && p.dash.opt.invuln)) moveEntity(p, (b.x - p.x) / d * (M.force || 4) * dt, (b.y - p.y) / d * (M.force || 4) * dt, tileH(G.map, p.x, p.y));
      return s.t > s.wind + (M.dur || 1.2);
    } },
  summon: {
    start(b, M, s) { fx({ type: 'ring', x: b.x, y: b.y, r: 2, col: '#b36bff', life: s.wind || 0.6 }); },   // the cue: this ring for the wind-up + warnSfx (WARN_SFX.summon = warn_summon); no damage, so no danger telegraph
    update(b, M, s) {
      if (s.step === 0 && s.t > (s.wind || 0.6)) {
        s.step = 1;
        const alive = summonAlive(b), n = Math.max(0, Math.min(M.n || 2, (M.max || 6) - alive));
        for (let k = 0; k < n; k++) {
          const a = M.pattern === 'random' ? Math.random() * 6.28 : k / n * 6.28 + 0.4; let x = b.x + Math.cos(a) * (M.r || 3), y = b.y + Math.sin(a) * (M.r || 3);
          const A = G.shrink; if (A && A.dmg) { const d = dist(x, y, A.x, A.y), lim = Math.max(1, A.r - 1.2); if (d > lim) { x = A.x + (x - A.x) / d * lim; y = A.y + (y - A.y) / d * lim; } }   // adds land inside the root ring, where the hero can reach them
          const e = spawnAt(enemyId(M.kind || 'slime'), x, y, 0.6);
          if (e) { e.summoner = b; if (M.addHp) e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * M.addHp)); if (M.addDmg) e.dm *= M.addDmg; }   // summoned adds can be lighter than the zone's own (howl hounds)
        }
        sfx('roar');
      }
      return s.t > (s.wind || 0.6) + s.open;
    } },
  zone: {
    start(b, M, s) {
      const p = G.player, n = M.n || 3, pts = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * 6.28 + Math.random() * 0.5;
        if (M.pattern === 'ring') pts.push([b.x + Math.cos(a) * (M.dist || 3), b.y + Math.sin(a) * (M.dist || 3)]);
        else if (M.pattern === 'random') pts.push([G.map.cx + frand(-5, 5), G.map.cy + frand(-5, 5)]);
        else pts.push([p.x + (k ? Math.cos(a) * 1.8 : 0), p.y + (k ? Math.sin(a) * 1.8 : 0)]);
      }
      s.pts = pts; for (const [x, y] of pts) tele({ kind: 'circle', x, y, r: M.r || 1.4, life: s.wind || 0.8, col: (ZONE_KIND[M.kind] || ZONE_KIND.void).col });
    },
    update(b, M, s) {
      if (s.step === 0 && s.t > (s.wind || 0.8)) { s.step = 1; for (const [x, y] of s.pts) hostileZone(zoneOf(M.kind || 'void', { x, y, r: M.r || 1.4, life: M.life || 6, tick: 0.5, dmg: moveDmg(b, M) * 0.5 })); sfx('veil'); }
      return s.t > (s.wind || 0.8) + s.open;
    } },
  arenaShrink: {
    start(b, M, s) {
      // centred on the running inline arena (G.arena, game.js startArena), else the map's sigil. QA B2: Pinewood's sigil is
      // Mossjaw's den, 58 tiles from Bramblehorn's arena, so the ring sat far away and every phase-2 second ticked the hero
      const m = G.map, ar = G.arena && !G.arena.done && G.arena.map === m.id ? G.arena : null;
      const A = G.shrink || (G.shrink = ar ? { x: ar.x, y: ar.y, r: M.r0 || ar.r || 7.5, dmg: 0 } : { x: m.cx, y: m.cy, r: M.r0 || 7.5, dmg: 0 });
      s.r0 = A.r; s.r1 = Math.max(M.rMin || 3.5, A.r * (M.k || 0.65)); A.dmg = moveDmg(b, Object.assign({ hit: 'chip' }, M)) * 0.5; A.el = M.el || b.el; A.pattern = M.pattern || 'roots_inward';
      A.armAt = G.t + (s.wind || 0.8) + (M.dur || 2);   // the new ring only bites once it has finished closing (updateArena)
      tele({ kind: 'circle', x: A.x, y: A.y, r: s.r1, life: s.wind || 0.8, col: '#9ae06a' });
      say(M.text || 'The roots close in!'); shake(5);
    },
    update(b, M, s) {
      const k = clamp((s.t - (s.wind || 0.8)) / (M.dur || 2), 0, 1);
      if (G.shrink) G.shrink.r = lerp(s.r0, s.r1, k);
      return s.t > (s.wind || 0.8) + (M.dur || 2) + s.open;
    } },
  blink: {
    start(b, M, s) { fx({ type: 'ring', x: b.x, y: b.y, r: 1.5, col: '#c7a8ff', life: s.wind || 0.6 }); b.fadeT = s.wind || 0.6; },
    update(b, M, s) {
      if (s.step === 0 && s.t > (s.wind || 0.6)) {
        s.step = 1; const p = G.player, a = M.to === 'random' ? Math.random() * 6.28 : p.aim + Math.PI, x = p.x + Math.cos(a) * 1.8, y = p.y + Math.sin(a) * 1.8;
        if (walkable(G.map, x, y, tileH(G.map, x, y))) { burst(b.x, b.y, 2, 20, ['#c7a8ff', '#ffffff'], 3); b.x = x; b.y = y; burst(x, y, 2, 20, ['#c7a8ff', '#ffffff'], 3); sfx('blink'); }
        b.fadeT = 0; if (M.then) s.after = M.then;
      }
      return s.t > (s.wind || 0.6) + s.open;
    } },
  vanish: {
    start(b, M, s) { b.under = true; burst(b.x, b.y, 0.3, 24, ['#6a5a3a', '#a08860', b.blood], 4, { glow: false }); sfx('heavy'); shake(4); },
    update(b, M, s) {
      if (s.t > (M.dur || 1.5)) {
        const p = G.player, x = p.x + frand(-0.3, 0.3), y = p.y + frand(-0.3, 0.3);
        if (walkable(G.map, x, y, tileH(G.map, x, y))) { b.x = x; b.y = y; }
        b.under = false;
        const then = typeof M.then === 'string' ? M.then : Object.assign({ wind: M.wind || 0.8, open: M.open || 1.2, hit: M.hit, dmg: M.dmg, dmgPct: M.dmgPct, el: M.el, cd: M.cd, legacy: M.legacy }, M.then || { type: 'circle', r: 2 }, { at: 'self' });
        s.after = then; return true;
      }
      return false;
    } },
  // roar: a ROAR_WIND s wind-up (warn cue at start + a circle tele of M.ring) before the shout, its shake and its adds,
  // so nothing that lands around a roar comes unwarned (QA B2: roar had wind 0)
  roar: {
    start(b, M, s) { s.wind = M.wind > 0 ? s.wind : ROAR_WIND; if (G.lastWarn && G.lastWarn.move === M.name) G.lastWarn.wind = s.wind; tele({ kind: 'circle', x: b.x, y: b.y, r: M.ring || 6, life: s.wind, col: M.col || '#ff5aa0' }); },
    update(b, M, s) {
      if (s.step === 0 && s.t > s.wind) {
        s.step = 1;
        const msg = M.text || M.banner; if (msg) say(msg);
        sfx('roar'); shake(10); fx({ type: 'ring', x: b.x, y: b.y, r: M.ring || 6, col: '#ff5aa0', life: 0.8 });
        for (const [type, a, r] of M.adds || []) spawnAt(enemyId(type), b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 1);
      }
      return s.t > s.wind + (M.dur || 1.2);
    } },
  sequence: {
    start(b, M, s) { s.i = 0; s.gapT = 0; },
    update(b, M, s, dt) {
      // runs its list as follow-ups: each queued on the boss after this one ends
      const list = M.list || []; b.bk.queue.unshift(...list); return true;
    } },
  random: {
    start() {},
    update(b, M, s) {
      const w = M.weights || {}, keys = Object.keys(w); let r = Math.random() * keys.reduce((a, k) => a + w[k], 0);
      for (const k of keys) if ((r -= w[k]) < 0) { s.after = k; break; }
      if (!s.after && keys.length) s.after = keys[0];
      return true;
    } },
};
// arena shrink (G.shrink = { x, y, r, dmg, el }; reset on map entry by startTriggers; centred on G.arena when one runs):
// outside the safe circle hurts every 0.5 s
// Warned (QA B2 "no-warn" bucket): no ticks while the ring is still closing (A.armAt), and each time the hero steps
// outside an armed ring a cue (text + sfx) and a SHRINK_GRACE s grace come before the first tick.
const SHRINK_GRACE = 0.6;
function updateArena(dt) {
  const A = G.shrink; if (!A || !A.dmg) return;
  const p = G.player; A.tickT = (A.tickT || 0) - dt;
  const out = dist(p.x, p.y, A.x, A.y) > A.r && !(A.armAt > G.t);
  if (!out) A.outT = null;
  else if (A.outT == null) { A.outT = G.t; A.tickT = Math.max(A.tickT, SHRINK_GRACE); text(p.x, p.y, p.z + 3.4, 'ROOTS! GET INSIDE', '#9ae06a', true); sfx(typeof WARN_SFX !== 'undefined' && WARN_SFX.arenaShrink || 'trap'); G.lastWarn = { boss: G.boss ? G.boss.type : null, move: 'rootRing', type: 'arenaShrink', sfx: null, wind: SHRINK_GRACE, open: 0, t: G.t }; }
  if (A.tickT <= 0) { A.tickT = 0.5; if (out) hurtPlayer(A.dmg, A.x, A.y, A.el || 'nature'); }
  if (Math.random() < dt * 30) { const a = Math.random() * 6.28; addPart({ x: A.x + Math.cos(a) * A.r, y: A.y + Math.sin(a) * A.r, z: 0, vx: 0, vy: 0, vz: 1.5, life: 0.6, t: 0, col: '#9ae06a', grav: 0, size: 1, glow: true }, false); }
}

// ---------------------------------------------------------------- fairness + length (balsim, tests)
// every damaging move, in every phase it can run in (its weights, onEnter, 'then' follow-ups), with that phase's cunning
// forms and windMul: wind >= FAIR_WIND; a big hit (dmg >= 100 raw or hit 'big') that ends its chain leaves >= FAIR_OPEN;
// feint fake >= FAIR_FEINT and shorter than the real wind-up; lead <= FAIR_LEAD. Moves no phase reaches: at the fastest
// windMul. Bars: each transition 1.2-1.8 s and every later bar opens with an onEnter telegraph. One row per move + rule
// (the worst phase).
// tiles the hero must walk to leave a telegraphed shape: from melee range (FAIR_MELEE_D) for boss-centred shapes, from the
// middle of shapes placed on the hero (rain, circle at:'player', burrow surfacing under it), sideways out of lines / charges
function walkOutNeed(D, M) {
  const R = FAIR_HERO_R, d0 = FAIR_MELEE_D;
  switch (M.type) {
    case 'circle': return M.at === 'player' ? (M.r || 3) + R : Math.max(0, (M.r || 3) + R - d0);
    case 'rain': return (M.r || 1.3) + R;
    case 'vanish': return typeof M.then === 'string' ? 0 : ((M.then && M.then.r) || 2) + R;
    case 'cone': return Math.max(0, Math.min((M.r || 3) + R - d0, d0 * Math.sin(Math.min(Math.PI / 2, degArc(M.arc || 2) / 2))));
    case 'line': return (M.w || 0.6) + R;
    case 'charge': return Math.max(M.w || 1.1, (D.r || 0.9) + 0.3) + R;
    default: return 0;
  }
}
function bossFairness(id) {
  const D = BOSSES[id], rows = new Map(); if (!D) return [];
  const add = (move, rule, got, legacy, phase) => { const k = move + '|' + rule, o = rows.get(k); if (!o || got < o.got) rows.set(k, { move, rule, got: +(+got).toFixed(2), legacy: !!legacy, phase }); };
  const SKIP = ['sequence', 'random', 'blink', 'arenaShrink', 'pull'];
  const check = (n, M, W, phase) => {
    const sc = M.scale || 'all';
    if (M.type === 'roar') { const w = (M.wind > 0 ? M.wind : ROAR_WIND) * (sc === 'none' ? 1 : W); if (w < FAIR_WIND - 1e-6) add(n, 'roar wind >= ' + FAIR_WIND + ' s', w, M.legacy, phase); return; }
    if (SKIP.includes(M.type)) return;
    if (M.type === 'summon') { const w = (M.wind || 0.6) * (sc === 'none' ? 1 : W); if (w < FAIR_WIND - 1e-6) add(n, 'summon wind >= ' + FAIR_WIND + ' s', w, M.legacy, phase); return; }
    let wind = (M.type === 'volley' ? (M.delay != null ? M.delay : M.wind) : M.wind) || 0;
    if (M.type === 'vanish') wind = (M.then && M.then.wind) || M.wind || 0.8;
    wind *= sc === 'none' ? 1 : W;
    const open = (M.open != null ? M.open : 0.6) * (sc === 'all' ? W : 1);
    const big = M.hit === 'big' || (M.dmg || 0) >= 100, chained = M.then && M.type !== 'vanish';
    if (wind < FAIR_WIND - 1e-6) add(n, 'wind >= ' + FAIR_WIND + ' s', wind, M.legacy, phase);
    if (big && !chained && open < FAIR_OPEN - 1e-6) add(n, 'open >= 1.2 s after a big hit', open, M.legacy, phase);
    if (M.feint > 0) {
      if (M.feint < FAIR_FEINT - 1e-6) add(n, 'feint fake wind-up >= ' + FAIR_FEINT + ' s', M.feint, M.legacy, phase);
      if (M.feint > wind - 0.1 + 1e-6) add(n, 'feint cut >= 0.1 s before the real wind-up would end', wind - M.feint, M.legacy, phase);
    }
    // walk-out (§26.1 "a 0.3 s reaction plus a sidestep fits"): after FAIR_REACT the base-speed hero can walk out of the shape
    const need = walkOutNeed(D, M);
    if (need > 0) { const got = (wind - FAIR_REACT) * FAIR_HERO_SPEED;
      if (got < need - 1e-6) add(n, `walk-out: (wind - ${FAIR_REACT} s) x ${FAIR_HERO_SPEED} tiles/s >= ${need.toFixed(2)} tiles`, got, M.legacy, phase); }
    if (M.lead > FAIR_LEAD + 1e-6) add(n, 'lead-aim <= ' + FAIR_LEAD + ' s', FAIR_LEAD - M.lead, M.legacy, phase);
  };
  const seen = new Set();
  const walk = (ref, ph, phase, depth) => {
    const name = typeof ref === 'string' ? ref : ref && (ref.name || ref.type);
    const M = typeof ref === 'string' ? (D.moveDefs[ref] ? Object.assign({}, D.moveDefs[ref], (ph.forms || {})[ref]) : null) : ref; if (!M || depth > 6) return;
    if (typeof ref === 'string') seen.add(ref);
    const label = typeof ref === 'string' ? ref : `phase${phase}.onEnter.${M.type}`;
    check(label, M, ph.windMul || 1, phase);
    if (M.then && typeof M.then === 'string' && M.type !== 'vanish') walk(M.then, ph, phase, depth + 1);
    if (M.type === 'random') for (const k in M.weights || {}) walk(k, ph, phase, depth + 1);
    if (M.type === 'sequence') for (const k of M.list || []) walk(k, ph, phase, depth + 1);
  };
  D.phases.forEach((ph, i) => {
    for (const n in ph.moves || {}) walk(n, ph, i + 1, 0);
    (ph.onEnter || []).forEach(ref => walk(ref, ph, i + 1, 0));
  });
  const Wmin = Math.min(1, ...D.phases.map(ph => ph.windMul || 1));
  for (const n in D.moveDefs) if (!seen.has(n)) check(n, D.moveDefs[n], Wmin, 0);
  if (barsOn(D)) {
    const tr = D.transition != null ? D.transition : BAR_TRANS;
    if (tr < BAR_TRANS_RANGE[0] - 1e-6 || tr > BAR_TRANS_RANGE[1] + 1e-6) add('transition', 'bar transition 1.2-1.8 s', tr, false, 0);
    D.phases.forEach((ph, i) => { if (i > 0 && !(ph.onEnter || []).length) add(`phase${i + 1}.onEnter`, 'a bar transition shows an onEnter telegraph', 0, false, i + 1); });
  }
  return [...rows.values()];
}
// hud.js draws ENEMY.boss.name over the boss bar: until it reads G.boss, name the boss that is actually fighting
Object.defineProperty(ENEMY.boss, 'name', { enumerable: true, configurable: true,
  get() { const b = typeof G !== 'undefined' && G.boss && !G.boss.dead ? G.boss : null; return b && b.type !== 'boss' && ENEMY[b.type] ? ENEMY[b.type].name : 'The Gloam Warden'; },
  set(v) { /* the editor may write it back; the Warden's name is fixed here */ } });
