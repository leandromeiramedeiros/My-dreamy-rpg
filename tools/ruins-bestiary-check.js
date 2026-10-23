#!/usr/bin/env node
'use strict';
// tools/ruins-bestiary-check.js — the Gloomspire Ruins bestiary (M4b wave 1) without the Ruins map: the real game in Chromium
// on the demo `ruins` map (?map=ruins: band L10-17, its story triggers marked fired by bosses.js debugFight), ?turbo lockstep,
// a scripted hero (port of tools/balsim.js simBossFight: steps out of telegraphs 0.3 s after they show, dodges what it cannot
// walk out of, flanks shields, stands in the lantern's light, drinks a potion under 50 % HP).
//   node tools/ruins-bestiary-check.js [--seed=N] [--only=id,id] [--no-shots]
// Asserts
//   * data: 6 commons, every damaging attack winds up >= 0.6 s and draws a telegraph; bosses: bossFairness clean, Oathless
//     2 bars with 3 moves (+1 at 50 %), Gloam Warden 3 bars, both intro / death lines, Warden's Lantern Plate on the kill.
//   * verbs: Gloom Knight front shield (BLOCK) vs its back (x1.3), wisp Dread, Grave Chanter raises bound wisps that unravel,
//     Pillar Mimic sleeps as a pillar, the swarm is one kill, the Oathless shield-wall, the Warden's gloam.
//   * ELITE_MODS: each of the 8 mods on each common spawns, lives 2 s and counts one kill.
//   * fights: each common dies to a T2 Sword + Buckler hero (Rare, L13) within COMMON_MAX s with the hero alive; every
//     wind-up seen live >= 0.6 s with a telegraph; the Oathless lasts 60-90 s and the Gloam Warden 150-240 s against a
//     Sword + Buckler reference loadout at the boss level (--boss-tier); no page errors.
// Screenshots: tools/out/bestiary/<id>-<n>.png (git-ignored).
const fs = require('fs'), path = require('path');
const { launch } = require('./qa/lib');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'tools', 'out', 'bestiary');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SEED = +arg('seed', 11), ONLY = arg('only', ''), SHOTS = !process.argv.includes('--no-shots');
// boss loadout tier: 'ref' = the in-game reference at the boss level (highest TIER_REQ <= L, as tools/balsim.js models it:
// T2 at L12 / L14), or a fixed tier 1-5 (--boss-tier=3 = T3)
const BOSS_TIER = arg('boss-tier', 'ref');
const COMMONS = ['wisp', 'gloomknight', 'gravechanter', 'pillarmimic', 'shadelingswarm', 'voidarcher'];
const BOSSES_ = [{ id: 'oathless', len: [60, 90] }, { id: 'gloamwarden', len: [150, 240] }];
const COMMON_MAX = 20, MIN_WIND = 0.6;
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info).slice(0, +arg("info", 400)) : ''}`); };

// ---------------------------------------------------------------- in-page helpers (installed once)
function helpers() {
  const DMG_TYPES = ['cone', 'circle', 'line', 'charge', 'rain', 'ring', 'beam', 'gloam', 'volley', 'zone'];
  const NODMG_PARTS = ['summon', 'teleport', 'healer'];
  // a hero in a reference kit: FAMILY_TIERS index `tier` (T2 = 1, T3 = 2), affixes at the middle of their roll (balsim simGear)
  window.__rbHero = (tier, L, rarity) => {
    const p = G.player, fams = ['sword', 'knighthelm', 'warden', 'knightgreaves'], slots = ['weapon', 'head', 'chest', 'boots'];
    const REF = { weapon: [['power', 'crit', 'critDmg'], ['hp', 'def']], armour: [['crit', 'power'], ['hp', 'def']] }, g = L < 10 ? 1 : L < 24 ? 2 : 3;
    p.level = L; p.equip = {};
    slots.forEach((slot, i) => {
      const base = FAMILY_TIERS[fams[i]][tier].split(':')[0], [np, ns] = AFFIX_COUNT[rarity], R = REF[slot === 'weapon' ? 'weapon' : 'armour'];
      const socks = slot === 'weapon' || slot === 'chest' ? 1 : 0;
      const it = makeItem(base, rarity, L, { sockets: socks, affixes: R[0].slice(0, np).concat(R[1].slice(0, ns)), q: 0.5 });
      if (it.sockets.length) it.sockets[0] = 'diamond_' + g;
      p.equip[slot] = it;
    });
    const ob = FAMILY_TIERS.buckler[tier].split(':')[0];
    p.equip.offhand = makeItem(ob, rarity, L, { sockets: 0, affixes: ['hp', 'def'].slice(0, Math.max(1, AFFIX_COUNT[rarity][1])), q: 0.5 });
    p.equip.ring1 = originRing(p.equip.weapon.base);
    if (L >= 10) try {
      const list = Object.values(trinketBases()).filter(t => t.slot === 'ring' && !t.unique && !t.origin).sort((a, c) => a.tier - c.tier); let k = 0; list.forEach((t, i) => { if (t.reqLvl <= L) k = i; });
      p.equip.ring2 = makeItem(list[k].id, 'rare', L, { affixes: ['power', 'crit', 'critDmg'].slice(0, RARITY.rare.affixes), boon: 'holyPower', q: 0.5, sockets: 0 });
    } catch (e) { /* no ring tier: starter ring only */ }
    recalcStats(p, true); p.hp = p.maxHp; p.mp = p.maxMp; p.potions = 3; p.ult = 0; p.cds = {}; p.dead = false; p.invulnT = 0; p.dreadT = 0; p.rootT = 0;
    return { L, tier, rarity, hp: Math.round(p.maxHp), weapon: p.equip.weapon.base, offhand: p.equip.offhand.base };
  };
  const inShape = (p, e, m) => {
    if (e.kind === 'circle') return dist(p.x, p.y, e.x, e.y) < e.r + p.r + m;
    if (e.kind === 'cone') { const d = dist(p.x, p.y, e.x, e.y); return d < e.r + p.r + m && Math.abs(angDiff(e.ang, Math.atan2(p.y - e.y, p.x - e.x))) < e.arc / 2 + m / Math.max(1, d); }
    if (e.kind === 'line') return segDist(p.x, p.y, e.x, e.y, e.x + Math.cos(e.ang) * e.len, e.y + Math.sin(e.ang) * e.len) < e.w + p.r + m;
    return false;
  };
  const away = (p, e, b) => {
    if (e.kind === 'circle') return dist(p.x, p.y, e.x, e.y) > 0.05 ? Math.atan2(p.y - e.y, p.x - e.x) : Math.atan2(p.y - b.y, p.x - b.x) + Math.PI / 2;
    const side = (p.x - e.x) * Math.sin(e.ang) - (p.y - e.y) * Math.cos(e.ang) >= 0 ? -1 : 1;
    if (e.kind === 'line') return e.ang + side * Math.PI / 2;
    const d = dist(p.x, p.y, e.x, e.y), da = angDiff(e.ang, Math.atan2(p.y - e.y, p.x - e.x)), radial = e.r + p.r - d, lateral = d * Math.sin(Math.max(0, e.arc / 2 - Math.abs(da)));
    return radial < lateral ? Math.atan2(p.y - e.y, p.x - e.x) : e.ang + side * Math.PI / 2;
  };
  // how far the hero walks to leave a cone along away()'s heading (radial, or square to the cone's axis)
  const coneExit = (p, e) => {
    const d = dist(p.x, p.y, e.x, e.y), da = angDiff(e.ang, Math.atan2(p.y - e.y, p.x - e.x)), R = e.r + p.r, radial = R - d;
    const x = d * Math.cos(da), y = d * Math.abs(Math.sin(da)), side = x <= 0 ? 0 : Math.max(0, Math.min(x * Math.tan(e.arc / 2), Math.sqrt(Math.max(0, R * R - x * x))) - y);
    return radial < d * Math.sin(Math.max(0, e.arc / 2 - Math.abs(da))) ? radial : side;
  };
  // the shield a target holds up now: { a (facing), arc } or null
  const shieldOf = t => {
    if (t.boss) return t.bk && t.bk.shield ? { a: t.bk.shield.a, arc: t.bk.shield.arc } : null;
    const P = t.pp && t.pp['shield-front']; return P && P.turn > 0 && t.faceA != null ? { a: t.faceA, arc: P.arc * Math.PI / 180 } : null;
  };
  window.__rbStart = (id, o = {}) => {
    const e = debugFight(id, { elite: o.elite || null, d: o.d != null ? o.d : 4 });
    G.player.potions = 3;
    window.__rbF = { id, e, t: 0, seen: new Map(), i: 0, alt: 0, winds: [], warns: [], lastW: G.lastWarn, by: {}, barT: {}, tgT: {}, hits: 0, bossHits: 0, maxHit: 0, potions: 0, dodges: 0, blocks: 0, maxBar: 1, gloams: 0, gloamHit: 0 };
    const F = window.__rbF, p = G.player, hp0 = window.hurtPlayer;
    if (!window.__rbHurt) { window.__rbHurt = hp0; window.hurtPlayer = function (dmg, x, y, el, oo) { const before = G.player.hp, r = window.__rbHurt.apply(this, arguments); const R = window.__rbF; if (r && R) { R.hits++; const f = (before - G.player.hp) / G.player.maxHp; R.maxHit = Math.max(R.maxHit, f); if (oo && oo.boss) R.bossHits++;
      const src = G.shrink && x === G.shrink.x && y === G.shrink.y ? 'ring' : oo && oo.boss ? (G.lastWarn && G.lastWarn.move) || 'boss' : (q => q ? 'bolt:' + (q.src ? q.src.type : 'boss volley') : 'other:' + el)(G.projs.find(q => !q.friendly && Math.hypot(q.x - x, q.y - y) < 0.01));
      R.by[src] = +((R.by[src] || 0) + f).toFixed(3);
      } return r; }; }
    return { id: e && e.type, lvl: e && e.lvl, hp: e && Math.round(e.maxHp), boss: !!(e && e.boss), elite: !!(e && e.elite) };
  };
  const groupAlive = F => { const e = F.e; return G.enemies.some(q => !q.dead && (q === e || (e.swarm && q.swarm === e.swarm))); };
  window.__rbRun = (maxT, until) => {
    const F = window.__rbF, p = G.player, dt = 1 / 60, REACT = 0.3, b = F.e.boss ? F.e : null;
    const step = a => { if (p.rootT > 0) return; const sp = p.speed * dt; moveEntity(p, Math.cos(a) * sp, Math.sin(a) * sp, tileH(G.map, p.x, p.y)); };
    const seq = ['b', 'b', 'b', 's'];
    while (F.t < maxT && F.t < until) {
      if (p.dead || G.state === 'dead') break;
      if (!groupAlive(F)) break;
      if (p.hp < p.maxHp * 0.5 && p.potions > 0 && F.potions < 3 && !((p.potT || 0) > G.t)) { if (drinkPotion(p)) F.potions++; }
      let threat = null, safe = null;
      for (const e of G.effects) {
        if (e.type !== 'tele') continue;
        let s = F.seen.get(e); if (!s) F.seen.set(e, s = { t: F.t });
        if (F.t - s.t < REACT) continue;
        if (e.cue) continue;   // a no-damage cue (the Oathless's shield arc)
        if (e.safe) { if (dist(p.x, p.y, e.safe.x, e.safe.y) > e.safe.r - 0.7) safe = e.safe; continue; }
        if (!(e.kind === 'circle' || e.kind === 'line' || e.kind === 'cone') || (e.src && e.src.move === 'stationary') || !inShape(p, e, 0.35)) continue;
        const pri = q => (b && q.src === b ? 0 : 10) + q.life - q.t;
        if (!threat || pri(e) < pri(threat)) threat = e;
      }
      // target: an add within 3 tiles first (boss fights), else the fight's target (a swarm: its nearest member)
      let tg = null, td = 1e9;
      // (kiting adds count as 3 tiles nearer: a shooter that keeps its distance is still the first target)
      // (sticky: an add it went for stays the target until it dies or gets 8 tiles away)
      // (an add outside a closing ring is left alone: the ring bites, the bot stays in)
      const inRing = e => !(G.shrink && G.shrink.dmg) || dist(e.x, e.y, G.shrink.x, G.shrink.y) < G.shrink.r - 0.8;
      if (b && F.add && !F.add.dead && dist(p.x, p.y, F.add.x, F.add.y) < 8 && inRing(F.add)) tg = F.add;
      else if (b) { F.add = null; tg = b.under ? null : b; td = 3; for (const e of G.enemies) if (e !== b && !e.dead && !(e.spawnT > 0) && inRing(e)) { const d = dist(p.x, p.y, e.x, e.y) - (e.move === 'kite' ? 3 : 0); if (d < td) { td = d; tg = e; } } if (tg && tg !== b) F.add = tg; }
      else for (const e of G.enemies) if (!e.dead && !(e.spawnT > 0) && !e.under && (e === F.e || (F.e.swarm && e.swarm === F.e.swarm) || e.summoner === F.e)) { const d = dist(p.x, p.y, e.x, e.y) + (e.summoner === F.e ? 2 : 0); if (d < td) { td = d; tg = e; } }
      if (threat && !p.dash && p.rootT <= 0) {
        const e = threat, d = dist(p.x, p.y, e.x, e.y), need = 0.1 + (e.kind === 'circle' ? e.r + p.r - d : e.kind === 'line' ? e.w + p.r - segDist(p.x, p.y, e.x, e.y, e.x + Math.cos(e.ang) * e.len, e.y + Math.sin(e.ang) * e.len)
          : coneExit(p, e));
        // a boss chip is walked out of or eaten while HP > 50 %: the dodge waits for the big hits (a player saves it the same way)
        const sk = slotSkill(p, 'v'), chip = b && e.src === b && b.bk && b.bk.mv && b.bk.mv.M.hit === 'chip' && p.hp > p.maxHp * 0.5;
        if (!chip && need > (e.life - e.t) * p.speed && sk && !(p.cds[sk] > 0) && p.st >= (SKILLS[sk].st || 0)) { const a0 = p.aim; p.aim = away(p, e, b || F.e); G.mouse.wx = p.x + Math.cos(p.aim) * 3; G.mouse.wy = p.y + Math.sin(p.aim) * 3; if (useSkill(p, 'v')) F.dodges++; else p.aim = a0; }
      }
      const A = G.shrink;
      if (p.dash) {}
      else if (safe) step(Math.atan2(safe.y - p.y, safe.x - p.x));
      else if (threat) { const sv = F.seen.get(threat); if (sv.h == null) sv.h = away(p, threat, b || F.e); step(sv.h); }
      else if (A && A.dmg && dist(p.x, p.y, A.x, A.y) > A.r - 0.6) step(Math.atan2(A.y - p.y, A.x - p.x));
      else if (tg) {
        const reach = 1.1 + tg.r * 0.5 + 0.3, d = dist(p.x, p.y, tg.x, tg.y), sh = shieldOf(tg), aT = Math.atan2(p.y - tg.y, p.x - tg.x);
        const front = sh && Math.abs(angDiff(sh.a, aT)) < sh.arc / 2 + 0.25;
        if (front) {   // flank: orbit toward its back at melee radius
          const sgn = angDiff(sh.a + Math.PI, aT) > 0 ? -1 : 1, a = aT + sgn * 0.9, R = Math.max(reach - 0.2, tg.r + 0.9);
          step(Math.atan2(tg.y + Math.sin(a) * R - p.y, tg.x + Math.cos(a) * R - p.x));
        } else if (tg.boss && d < Math.max(1.2, reach - 0.6)) step(aT);   // inside a boss's body (it charged through): back out to melee range
        else if (d > reach) {
          const a = Math.atan2(tg.y - p.y, tg.x - p.x), ox = p.x, oy = p.y; p.x += Math.cos(a) * 0.4; p.y += Math.sin(a) * 0.4;
          const bad = G.effects.some(e => e.type === 'tele' && !e.safe && F.seen.has(e) && F.t - F.seen.get(e).t >= REACT && (e.kind === 'circle' || e.kind === 'line' || e.kind === 'cone') && inShape(p, e, 0.35)); p.x = ox; p.y = oy;
          if (!bad) step(a);
        } else if (!castActive(p) && p.atkT <= 0 && p.castT <= 0) {
          p.aim = Math.atan2(tg.y - p.y, tg.x - p.x); G.mouse.wx = tg.x; G.mouse.wy = tg.y;
          const teleUp = b && G.effects.some(e => e.type === 'tele' && e.src === b);
          if (seq[F.i] === 'b' || teleUp) basicAttack(p);
          else if (p.ult >= 100 && useSkill(p, 'qu')) {}
          else { const k = F.alt++ % 2 ? 'e' : 'q'; if (!useSkill(p, k)) useSkill(p, k === 'q' ? 'e' : 'q'); }
          if (!teleUp || seq[F.i] === 'b') F.i = (F.i + 1) % seq.length;
        }
      }
      window.__advance(1); F.t += dt;
      // live telegraph log: commons at the moment they enter a wind-up; bosses at each move start (G.lastWarn)
      for (const q of G.enemies) {
        if (q.boss || q.dead) continue;
        if (q.state === 'wind' && q._rbPs !== 'wind') F.winds.push({ type: q.type, act: q.act, wind: +(q.windMax || 0).toFixed(3), tele: G.effects.some(f => f.type === 'tele' && f.src === q), dmg: !NODMG_PARTS.includes(q.act) });
        q._rbPs = q.state;
      }
      if (b && G.lastWarn && G.lastWarn !== F.lastW) {
        const w = F.lastW = G.lastWarn; let wind = w.wind;
        if (w.type === 'volley') { const M = resolveMove(b, w.move); wind = M && M.delay != null ? M.delay * (M.scale === 'none' ? 1 : (phaseOf(b).windMul || 1)) : wind; }
        if (w.type === 'gloam') F.gloams++;
        F.warns.push({ move: w.move, type: w.type, wind: +(wind || 0).toFixed(3), dmg: DMG_TYPES.includes(w.type), bar: b.bk.phase + 1, feint: w.feint || 0 });
      }
      if (b && b.bk) { F.maxBar = Math.max(F.maxBar, b.bk.phase + 1); const k = 'bar' + (b.bk.phase + 1); F.barT[k] = (F.barT[k] || 0) + dt; }
      { const k = tg ? (tg === b ? 'boss' : tg.type) : 'none'; F.tgT[k] = (F.tgT[k] || 0) + dt; }
      if (F.seen.size > 400) for (const [e] of F.seen) if (!G.effects.includes(e)) F.seen.delete(e);
    }
    const alive = groupAlive(F);
    return { t: +F.t.toFixed(1), done: !alive || p.dead || F.t >= maxT, won: !alive && !p.dead, dead: !!p.dead, hpLeft: +(p.hp / p.maxHp).toFixed(2), hits: F.hits, bossHits: F.bossHits, maxHit: +F.maxHit.toFixed(2), potions: F.potions, dodges: F.dodges, bars: F.maxBar, gloams: F.gloams,
      bossLeft: b ? +(Math.max(0, b.hp) / b.maxHp).toFixed(3) : null, taken: F.by, barT: F.barT, tgT: F.tgT };
  };
}

(async () => {
  const { br, page, errors } = await launch({ query: '?map=ruins', turbo: true, seed: SEED });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { for (let i = 0; i < 120 && G.state !== 'play'; i++) window.__advance(10); G.ui.open = false; G.ui.pause = false; G.state = 'play'; });
  await ev(helpers);
  const shot = async name => { if (!SHOTS) return null; await ev(() => window.__render()); const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f }); return path.relative(ROOT, f); };
  const shots = [];
  const want = id => !ONLY || ONLY.split(',').includes(id);

  // ---------- 1. data
  const data = await ev(ids => {
    const out = {};
    for (const id of ids) {
      const e = debugFight(id, {}); if (!e) { out[id] = null; continue; }
      const acts = e.acts.map(a => ({ a, wind: e.pp[a].wind, tele: a !== 'shoot' || !!e.pp[a].tele, dmg: !['summon', 'teleport', 'healer'].includes(a) }));
      out[id] = { name: ENEMY[id].name, parts: e.parts.join('+'), move: e.move, acts, cls: enemyClass(id), lvl: e.lvl, hp: Math.round(e.maxHp), res: ENEMY[id].res, lore: !!(BESTIARY_LORE[id] && BESTIARY_LORE[id].lore) };
    }
    G.enemies.length = 0; return out;
  }, COMMONS);
  for (const id of COMMONS) {
    const d = data[id];
    check(`data: ${id} exists as a normal-class part row with a bestiary entry`, !!d && d.cls === 'normal' && d.lore && !!d.move, d && { parts: d.parts, lvl: d.lvl, hp: d.hp });
    if (d) check(`data: ${id} damaging attacks wind up >= ${MIN_WIND} s with a telegraph`, d.acts.filter(a => a.dmg).length > 0 && d.acts.every(a => !a.dmg || (a.wind >= MIN_WIND - 1e-6 && a.tele)) && d.acts.every(a => a.wind >= 0.55), d.acts);
  }
  const moves = new Set(Object.values(data).filter(Boolean).map(d => d.move));
  check('data: the Ruins commons use >= 4 movement parts', moves.size >= 4, [...moves]);
  const bd = await ev(() => {
    const o = {};
    for (const id of ['oathless', 'gloamwarden']) {
      const D = BOSSES[id]; const ph = D.phases.map(p => Object.keys(p.moves));
      o[id] = { kind: D.kind, level: D.level, bars: D.bars && D.phases.length, ph, fair: bossFairness(id), res: D.res, unique: D.unique, enemy: !!ENEMY[id], lore: !!BESTIARY_LORE[id] };
    }
    o.lines = { intro: DIALOGUE.boss_gloamwarden_intro && DIALOGUE.boss_gloamwarden_intro.lines[0], death: DIALOGUE.boss_gloamwarden_death && DIALOGUE.boss_gloamwarden_death.lines[0], drops: DIALOGUE.boss_gloamwarden_death && DIALOGUE.boss_gloamwarden_death.drops };
    o.plate = UNIQUES.lanternplate && UNIQUES.lanternplate.name;
    return o;
  });
  const O = bd.oathless, W = bd.gloamwarden;
  check('Oathless: mini, 2 bars, 3 moves in bar 1 (+ a 4th at 50 %), resists arcane, weak holy + pierce, fairness clean', O.kind === 'mini' && O.bars === 2 && O.ph[0].length === 3 && O.ph[1].length === 4 && O.res.arcane > 0 && O.res.holy < 0 && O.res.pierce < 0 && O.fair.length === 0, O);
  check('Gloam Warden: guardian, 3 bars (50 % / 20 %), one new move per bar, fairness clean, Lantern Plate', W.kind === 'guardian' && W.bars === 3 && W.ph[1].length > W.ph[0].length && W.ph[2].length > W.ph[1].length && W.fair.length === 0 && W.unique === 'lanternplate' && bd.plate === "Warden's Lantern Plate", W);
  check('Gloam Warden: intro + death lines (story.md), death drops lanternplate', bd.lines.intro === 'I guarded his sleep. I do not guard it well.' && bd.lines.death === 'He dreamed a girl. Did you meet her?' && bd.lines.drops === 'lanternplate', bd.lines);

  // ---------- 2. verbs
  const verbs = await ev(() => {
    const p = G.player, o = {}, adv = n => window.__advance(n);
    p.crit = 0; const crit0 = p.critR; p.critR = null;
    // Gloom Knight: front vs back (same base hit, crit off)
    let k = debugFight('gloomknight', { d: 1.2 }); adv(2); p.invulnT = 99;
    const hit = () => { const h = k.hp; k.hp = k.maxHp; damageEnemy(k, 100, { el: 'holy', cast: null }); const d = k.maxHp - k.hp; k.hp = k.maxHp; return d; };
    k.faceA = Math.atan2(p.y - k.y, p.x - k.x); const front = hit();
    k.faceA = Math.atan2(p.y - k.y, p.x - k.x) + Math.PI; const back = hit();
    o.knight = { front: Math.round(front), back: Math.round(back), ratio: +(front / back).toFixed(3) };
    // wisp Dread: a bolt along its aim line onto a standing hero
    const w = debugFight('wisp', { d: 3 }); p.invulnT = 0; p.dreadT = 0; w.pcd.shoot = 0; w.pcd.teleport = 9; let dread = 0;
    for (let i = 0; i < 240 && !dread; i++) { p.x = w.x - 3; p.y = w.y; p.hp = p.maxHp; adv(1); if (p.dreadT > 0) dread = p.dreadT; }
    o.wisp = { dread: +dread.toFixed(2) };
    // Grave Chanter: raises a bound wisp (no XP), it unravels when the chanter dies
    const c = debugFight('gravechanter', { d: 6 }); p.invulnT = 99; c.pcd.summon = 0; c.pcd.bomber = 9; c.pcd.teleport = 9;
    for (let i = 0; i < 180 && !G.enemies.some(q => q.summoner === c); i++) adv(1);
    const raised = G.enemies.filter(q => q.summoner === c && !q.dead); adv(60);
    o.chanter = { raised: raised.length, bound: raised.every(q => q.bound && q.noXp), kinds: raised.map(q => q.type).join() };
    c.hp = 1; damageEnemy(c, 1e6, { el: 'holy' }); adv(150);
    o.chanter.after = G.enemies.filter(q => raised.includes(q) && !q.dead).length; o.chanter.despawned = raised.every(q => q.despawned || q.dead);
    // Pillar Mimic: asleep as a pillar until the hero is within 1.8 tiles
    const m = debugFight('pillarmimic', { d: 4 }); adv(60);
    o.mimic = { asleep: m.asleep, as: m.mimicAs, x0: m.x };
    p.x = m.x - 1.2; p.y = m.y; adv(5); o.mimic.woke = !m.asleep;
    // swarm: one spawn = 5 bodies, one kill
    const s = debugFight('shadelingswarm', { d: 5 }); p.invulnT = 99; const n = G.enemies.filter(q => q.swarm === s.swarm).length, k0 = (G.kills.shadelingswarm || 0);
    for (const q of G.enemies.slice()) if (q.swarm === s.swarm) damageEnemy(q, 1e6, { el: 'holy' });
    o.swarm = { bodies: n, kills: (G.kills.shadelingswarm || 0) - k0 };
    // Oathless shield-wall: front blocked, back open
    const b = debugFight('oathless', { d: 2 }); p.invulnT = 99; b.cd = 99; b.bk.mv = null; startMove(b, 'shieldWall'); adv(40);
    const bh = () => { const h = b.hp; damageEnemy(b, 100, { el: 'holy' }); const d = h - b.hp; b.hp = h; return d; };
    const sa = b.bk.shield && b.bk.shield.a; p.x = b.x + Math.cos(sa) * 2; p.y = b.y + Math.sin(sa) * 2; const bf = bh();
    p.x = b.x - Math.cos(sa) * 2; p.y = b.y - Math.sin(sa) * 2; const bb = bh();
    o.oath = { shield: !!b.bk.shield, front: Math.round(bf), back: Math.round(bb), ratio: +(bf / bb).toFixed(3) };
    // Gloam Warden gloam: outside the light hurts, inside does not
    const gw = debugFight('gloamwarden', { d: 3 }); gw.cd = 99; p.invulnT = 0; const run = inside => {
      gw.bk.mv = null; G.effects.length = 0; p.hp = p.maxHp; startMove(gw, 'gloam'); const L = G.gloam; let hit = false;
      for (let i = 0; i < 130; i++) { if (inside) { p.x = L.x; p.y = L.y; } else { p.x = L.x + L.r + 2; p.y = L.y; } p.invulnT = 0; const h = p.hp; adv(1); if (p.hp < h) hit = true; }
      return { hit, r: L.r, dLight: +dist(L.x, L.y, gw.x, gw.y).toFixed(1) };
    };
    o.gloam = { inside: run(true), outside: run(false) };
    p.critR = crit0; recalcStats(p, true); G.enemies.length = 0; G.boss = null; G.gloam = null; G.effects.length = 0; p.invulnT = 0; p.hp = p.maxHp; p.dreadT = 0;
    return o;
  });
  check('verb: Gloom Knight blocks from the front (15 %), takes x1.3 from behind', verbs.knight.ratio > 0.08 && verbs.knight.ratio < 0.16, verbs.knight);
  check('verb: wisp bolt lands Dread on the hero', verbs.wisp.dread > 0, verbs.wisp);
  check('verb: Grave Chanter raises bound wisps (no XP) that unravel when it dies', verbs.chanter.raised >= 1 && verbs.chanter.bound && verbs.chanter.after === 0, verbs.chanter);
  check('verb: Pillar Mimic sleeps as a pillar and wakes at 1.8 tiles', verbs.mimic.asleep && verbs.mimic.as === 'pillar' && verbs.mimic.woke, verbs.mimic);
  check('verb: Shadeling Swarm = 5 bodies, one kill', verbs.swarm.bodies === 5 && verbs.swarm.kills === 1, verbs.swarm);
  check('verb: Oathless shield-wall blocks its front (10 %), not its back', verbs.oath.shield && verbs.oath.ratio < 0.15, verbs.oath);
  check('verb: Gloam Warden gloam hurts outside the lantern light, not inside', verbs.gloam.outside.hit && !verbs.gloam.inside.hit, verbs.gloam);

  // ---------- 3. elites: every ELITE_MOD on every new common
  const el = await ev(ids => {
    const p = G.player, out = [];
    for (const id of ids) for (const mod of ELITE_IDS) {
      const e = debugFight(id, { d: 3, elite: mod }); p.invulnT = 999; const base = Math.round(ENEMY[id].hp * enemyHpMul(e.lvl));
      window.__advance(120);
      const k0 = G.kills[id] || 0, grp = G.enemies.filter(q => !q.dead && (q === e || (e.swarm && q.swarm === e.swarm) || q.twinOf === e));
      const tot = grp.reduce((a, q) => a + q.maxHp, 0);
      for (let i = 0; i < 6; i++) for (const q of G.enemies.slice()) if (!q.dead && (grp.includes(q) || q.twinOf === e)) damageEnemy(q, 1e7, { el: 'holy' });
      out.push({ id, mod, elite: e.elite, mods: (e.mods || []).join(), hpMul: +(tot / base).toFixed(2), kills: (G.kills[id] || 0) - k0, left: G.enemies.filter(q => !q.dead && grp.includes(q)).length });
    }
    p.invulnT = 0; G.enemies.length = 0; return out;
  }, COMMONS);
  const elBad = el.filter(r => !r.elite || r.mods !== r.mod || r.kills !== 1 || r.left || Math.abs(r.hpMul - 3.2) > 0.25);
  check(`elites: ${el.length} spawns (${COMMONS.length} commons x ${el.length / COMMONS.length} ELITE_MODS): elite, x3.2 HP, one kill`, elBad.length === 0, elBad.length ? elBad : undefined);

  // ---------- 4. common fights: T2 Sword + Buckler, Rare, L13
  const winds = [];
  for (const id of COMMONS.filter(want)) {
    const hero = await ev(() => window.__rbHero(1, 13, 'rare'));
    const st = await ev(id => window.__rbStart(id, { d: 4 }), id);
    let r, n = 0;
    for (const at of [2.5, COMMON_MAX + 5]) { r = await ev(([T, U]) => window.__rbRun(T, U), [COMMON_MAX + 5, at]); if (!n++) { const s = await shot(`${id}-1`); if (s) shots.push(s); } if (r.done) break; }
    const w = await ev(() => window.__rbF.winds); winds.push(...w);
    check(`fight: ${id} (L${st.lvl}, ${st.hp} HP) dies to a T2 Sword + Buckler hero (L13, ${hero.hp} HP) within ${COMMON_MAX} s, hero alive`, r.won && r.t <= COMMON_MAX, r);
  }
  const wBad = winds.filter(w => w.dmg && (w.wind < MIN_WIND - 1e-6 || !w.tele));
  const byType = {}; for (const w of winds) { const k = w.type + '.' + w.act; byType[k] = Math.min(byType[k] == null ? 9 : byType[k], w.wind); }
  if (COMMONS.some(want)) check(`fights: every live wind-up of the commons (${winds.length} seen) >= ${MIN_WIND} s with a telegraph`, winds.length > 0 && wBad.length === 0, wBad.length ? wBad.slice(0, 6) : byType);

  // ---------- 5. boss fights: Sword + Buckler reference loadout at the boss level (--boss-tier)
  for (const B of BOSSES_.filter(b => want(b.id))) {
    const L = await ev(id => BOSSES[id].level, B.id);
    const tier = BOSS_TIER === 'ref' ? await ev(L => { let t = 0; for (let k = 0; k < 5; k++) if (TIER_REQ[k] <= L) t = k; return t; }, L) : +BOSS_TIER - 1;
    const hero = await ev(([t, L]) => window.__rbHero(t, L, L < 17 ? 'rare' : 'epic'), [tier, L]);
    const st = await ev(id => window.__rbStart(id, { d: 4 }), B.id);
    const maxT = B.len[1] * 1.6; let r, k = 0;
    const marks = [3, 20, 50, 90, 140, 190, 240, 300, 360].filter(t => t < maxT);
    for (const at of marks.concat([maxT])) { r = await ev(([T, U]) => window.__rbRun(T, U), [maxT, at]); k++; const s = await shot(`${B.id}-${k}`); if (s) shots.push(s); if (r.done) break; }
    const warns = await ev(() => window.__rbF.warns);
    const bad = warns.filter(w => w.dmg && w.wind < MIN_WIND - 1e-6);
    const seenMoves = [...new Set(warns.map(w => w.move))];
    check(`boss: ${B.id} (L${L}, ${st.hp} HP) beaten by a T${tier + 1} Sword + Buckler hero (${hero.hp} HP) in ${B.len[0]}-${B.len[1]} s`, r.won && r.t >= B.len[0] && r.t <= B.len[1], r);
    check(`boss: ${B.id} every live wind-up >= ${MIN_WIND} s (${warns.length} moves: ${seenMoves.join(' ')})`, bad.length === 0 && warns.length > 0, bad.length ? bad.slice(0, 6) : undefined);
    if (B.id === 'gloamwarden') check('boss: Gloam Warden reached bar 3 and cast gloam', r.bars === 3 && r.gloams > 0, { bars: r.bars, gloams: r.gloams });
  }

  const errs = errors.filter(e => !/favicon|net::ERR_FILE_NOT_FOUND/.test(e.msg));
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  if (shots.length) console.log('screenshots:\n  ' + shots.join('\n  '));
  console.log(fails ? `ruins-bestiary-check: ${fails} FAIL` : 'ruins-bestiary-check: all PASS');
  await br.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
