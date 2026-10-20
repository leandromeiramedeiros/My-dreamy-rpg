#!/usr/bin/env node
'use strict';
// Audio engine check (js/audio.js). Opens the GAME page (index.html from file://) in headless Chromium WITHOUT the
// autoplay flag and:
//  1. unlock: the engine is silent before any gesture and reaches AudioContext 'running' after a simulated click
//  2. renders every SFX_RECIPES id through an OfflineAudioContext with the engine's own sfx path (fails on NaN,
//     silence = peak <= 1e-3, clipping = peak >= 0.98)
//  3. renders every music state (each MUSIC id; boss songs x stem phases 1-4; songs with `intensity` x each state) with
//     the engine's live 25 ms tick code driving an OfflineAudioContext (fails on NaN, low body RMS, clipping)
//  4. mix checks: dialogue duck depth (rendered A/B), mono fold, reduce bass, mute on the master bus
//  5. live behaviour: map + section -> song wiring (title/vale, pinewood forest/hollow/warrens/clearing + arena, Bramblehorn stems by boss
//     phase, death overlay + duck, victory on boss kill), voice caps, 6x/s limit, spatial attenuation, never-silent
//     telegraphs (G.lastWarn fallback), captions, settings -> buses, scheduler per-frame cost
// Usage: node tools/audio-check.js [sampleRate=32000]       exit 1 on any failure
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const SR = +process.argv[2] || 32000;
const MIN_RMS = { song: 0.015, motif: 0.01, stinger: 0.004 };
const MAX_PEAK = 0.98, MIN_SFX_PEAK = 1e-3;
const OUT = path.join(__dirname, 'shots', 'audio');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function check(name, ok, info) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (!ok) fails++; }
const pad = (s, n) => String(s).padEnd(n);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---------- 1. unlock ----------
  const pre = await ev(() => ({ state: AUDIO.state(), want: AUDIO.wanted(), gstate: G.state }));
  check('unlock: no running context before a gesture (the title runs silently)', pre.state !== 'running', pre);
  const box = await page.locator('canvas').first().boundingBox();
  await page.mouse.click(box.x + 40, box.y + 40);   // a corner of the title: a trusted gesture that hits no button
  let st = null;
  try { await page.waitForFunction(() => AUDIO.state() === 'running', null, { timeout: 5000 }); } catch (e) { /* reported below */ }
  st = await ev(() => ({ state: AUDIO.state(), rate: AUDIO.ctx && AUDIO.ctx.sampleRate, gstate: G.state }));
  check('unlock: AudioContext running after a simulated click', st.state === 'running', st);
  await wait(600);
  const title = await ev(() => ({ want: AUDIO.wanted(), cur: AUDIO.current(), zone: AUDIO.director().zone, notes: AUDIO.stats.notes, timbres: AUDIO.stats.timbres }));
  check('title: the lullaby motif plays first (as the title song), notes are scheduled', title.want === 'title' && title.cur === 'title' && title.zone === 'lullaby' && title.notes > 0, title);
  check('timbres: wood / bell / choir / cymbal (+ swell) rendered at boot via OfflineAudioContext', title.timbres >= 5, title.timbres);

  // ---------- 2. every SFX id offline ----------
  const ids = await ev(() => Object.keys(SFX_RECIPES));
  const sfxRows = await ev(async ([list, sr]) => {
    const out = [];
    for (const id of list) {
      try { const b = await AUDIO.renderSfx(id, { sampleRate: sr }); const s = AUDIO.bufferStats(b); out.push({ id, peak: s.peak, rms: s.rms, bad: s.bad, sec: s.seconds }); }
      catch (e) { out.push({ id, err: String(e && e.message || e) }); }
    }
    return out;
  }, [ids, SR]);
  const badSfx = sfxRows.filter((r) => r.err || r.bad || !(r.peak > MIN_SFX_PEAK) || r.peak >= MAX_PEAK);
  for (const r of badSfx) console.log('   sfx problem', JSON.stringify(r));
  const pk = sfxRows.map((r) => r.peak).filter(isFinite);
  check(`sfx: all ${ids.length} SFX_RECIPES ids render with no NaN, none silent, none clipping`, badSfx.length === 0 && sfxRows.length === ids.length,
    { n: sfxRows.length, minPeak: +Math.min(...pk).toFixed(4), maxPeak: +Math.max(...pk).toFixed(3) });

  // ---------- 3. every music state offline (live tick code) ----------
  const states = await ev(() => {
    const out = [];
    for (const id in MUSIC) {
      const s = MUSIC[id];
      if (s.stems) s.phases.forEach((p, i) => out.push({ id, kind: s.kind, phase: i, label: `${id}_phase${i + 1}(${p})` }));
      else if (s.intensity) for (const k of Object.keys(s.intensity).concat(s.intensity.combat ? ['big'] : [])) out.push({ id, kind: s.kind, intensity: k, label: `${id}_${k}` });
      else out.push({ id, kind: s.kind, label: id });
    }
    return out;
  });
  const t0 = Date.now(), rows = [];
  for (const S of states) {
    const r = await ev(async ([S, sr]) => {
      try {
        const b = await AUDIO.renderMusic(S.id, { sampleRate: sr, phase: S.phase, intensity: S.intensity === 'big' ? 'big' : S.intensity === 'combat' ? 'combat' : 'calm' });
        const s = AUDIO.bufferStats(b, 0.05, b.bodySeconds);
        return { s, notes: b.engineStats.notes };
      } catch (e) { return { err: String(e && e.message || e) }; }
    }, [S, SR]);
    const ok = !r.err && r.s.bad === 0 && r.s.rms > MIN_RMS[S.kind] && r.s.peak < MAX_PEAK && r.notes > 0;
    rows.push(Object.assign({ label: S.label, kind: S.kind, ok }, r.s || {}, { notes: r.notes, err: r.err }));
  }
  console.log(pad('   music state', 36) + pad('kind', 9) + pad('sec', 7) + pad('RMS dB', 9) + pad('peak', 8) + pad('notes', 7) + 'status');
  for (const r of rows) console.log('   ' + pad(r.label, 33) + pad(r.kind, 9) + pad((r.seconds || 0).toFixed(1), 7) + pad((r.rmsDb || 0).toFixed(1), 9) + pad((r.peak || 0).toFixed(3), 8) + pad(r.notes || 0, 7) + (r.ok ? 'ok' : 'FAIL ' + (r.err || '')));
  check(`music: all ${rows.length} music states render (engine tick, offline) with no NaN, none silent, none clipping`, rows.every((r) => r.ok), { states: rows.length, seconds: ((Date.now() - t0) / 1000).toFixed(1) });
  // phone profile: 12 music voices (voice stealing runs constantly), 1 convolver, no extra layer, 200 ms lookahead
  const mob = await ev(async (sr) => {
    const cfg = { musicVoices: 12, convolvers: 1, extraLayer: false, impulse: 1.5, lookahead: 0.2 };
    const b = await AUDIO.renderMusic('boss_bramblehorn', { sampleRate: sr, phase: 3, cfg }), s = AUDIO.bufferStats(b, 0.05, b.bodySeconds);
    const full = await AUDIO.renderMusic('boss_bramblehorn', { sampleRate: sr, phase: 3, cfg: { extraLayer: false } });
    return { rmsDb: +s.rmsDb.toFixed(1), rms: s.rms, peak: +s.peak.toFixed(3), bad: s.bad, notes: b.engineStats.notes, notes24: full.engineStats.notes, steals: b.engineStats.steals, steals24: full.engineStats.steals };
  }, SR);
  check('mobile profile: boss phase 4 on 12 voices (stealing), 1 convolver, no extra: no NaN, not silent, no clipping, no notes dropped',
    mob.bad === 0 && mob.rms > MIN_RMS.song && mob.peak < MAX_PEAK && mob.notes === mob.notes24 && mob.notes > 0 && mob.steals > 0, mob);
  const phaseRms = rows.filter((r) => /^boss_bramblehorn_phase/.test(r.label)).map((r) => +r.rmsDb.toFixed(1));
  check('music: boss stems add up phase by phase (RMS rises A -> AB -> ABC -> ABCD)', phaseRms.length === 4 && phaseRms.every((v, i) => i === 0 || v >= phaseRms[i - 1] - 0.3), phaseRms);
  fs.writeFileSync(path.join(OUT, 'engine-stats.json'), JSON.stringify({ sfx: sfxRows, music: rows }, null, 1));

  // ---------- 4. mix checks (A/B offline renders) ----------
  const mix = await ev(async (sr) => {
    const W = [5, 9], o = { sampleRate: sr, bars: 8 };
    const A = await AUDIO.renderMusic('vale', o);
    const B = await AUDIO.renderMusic('vale', Object.assign({ events: [{ t: 3.5, fn: (en) => en.setDuck('dialogue', true) }] }, o));
    const C = await AUDIO.renderMusic('vale', Object.assign({ events: [{ t: 3.5, fn: (en) => en.setDuck('death', true) }] }, o));
    const M = await AUDIO.renderMusic('vale', Object.assign({ mono: true }, o));
    const Q = await AUDIO.renderMusic('pinewood', Object.assign({ reduceBass: true }, o)), P = await AUDIO.renderMusic('pinewood', o);
    const X = await AUDIO.renderMusic('vale', Object.assign({ events: [{ t: 3.5, fn: (en) => en.mix({ master: 0.75, music: 0.75, sfx: 0.75, ui: 0.75, ambient: 0.75, muted: true }) }] }, o));
    const a = AUDIO.bufferStats(A, ...W), b = AUDIO.bufferStats(B, ...W), c = AUDIO.bufferStats(C, ...W), x = AUDIO.bufferStats(X, ...W);
    let diff = 0; const l = M.getChannelData(0), r = M.getChannelData(1); for (let i = 0; i < l.length; i++) diff = Math.max(diff, Math.abs(l[i] - r[i]));
    // low band energy: one-pole low-pass at ~120 Hz
    const low = (buf) => { const d = buf.getChannelData(0), k = 1 - Math.exp(-2 * Math.PI * 120 / buf.sampleRate); let y = 0, s = 0; for (let i = 0; i < d.length; i++) { y += (d[i] - y) * k; s += y * y; } return Math.sqrt(s / d.length); };
    return { dialogueDb: b.rmsDb - a.rmsDb, deathDb: c.rmsDb - a.rmsDb, monoDiff: diff, bassDb: 20 * Math.log10(low(Q) / low(P)), mutedPeak: x.peakIn };
  }, SR);
  check('duck: dialogue ducks the zone music about -9 dB (rendered A/B)', mix.dialogueDb < -6.5 && mix.dialogueDb > -11.5, +mix.dialogueDb.toFixed(1));
  check('duck: death ducks the zone music about -20 dB', mix.deathDb < -15 && mix.deathDb > -24, +mix.deathDb.toFixed(1));
  check('mono: both channels identical when folded', mix.monoDiff < 1e-4, mix.monoDiff);
  check('reduce bass: the low band drops >= 4 dB', mix.bassDb < -4, +mix.bassDb.toFixed(1));
  check('mute: works on the master bus (scheduling continues, output silent)', mix.mutedPeak < 1e-3, mix.mutedPeak);

  // ---------- 5. live behaviour in the running game ----------
  const nextZone = async (fn, until, ms = 9000) => { await ev(fn); try { await page.waitForFunction(until, null, { timeout: ms }); } catch (e) { /* reported */ } return ev(() => AUDIO.director()); };
  let d = await nextZone(() => { titleDefault(); G.player.invulnT = 999; }, () => AUDIO.current() === 'vale');
  check('wiring: title -> vale (crossfade on the bar line)', d.zone === 'vale', d);
  d = await nextZone(() => { G.player.invulnT = 999; transition('pinewood'); }, () => AUDIO.current() === 'pinewood');
  const fading = await ev(() => AUDIO.engine.tracks.map((t) => t.id));
  check('wiring: pinewood (rift fade starts the 1-bar fade, new song on its bar 1)', d.zone === 'pinewood', { d, tracks: fading });
  const bar1 = await ev(async () => {
    const E = AUDIO.engine, T = E.zone, old = E.tracks.find((t) => t.id === 'vale'), w = (ms) => new Promise((r) => setTimeout(r, ms));
    const r = { t0: +T.t0.toFixed(3), step0: T.step, now: +E.ctx.currentTime.toFixed(3), oldBars: old ? +((T.t0 - old.t0) / old.barDur).toFixed(4) : null };
    await w(Math.max(0, (T.t0 - E.ctx.currentTime) * 1000) + 400); r.stepLater = T.step; r.fromStep0 = T.nextTime - T.t0 === T.step * T.stepDur || Math.abs(T.nextTime - T.t0 - T.step * T.stepDur) < 1e-9;
    return r;
  });
  check('transport: the new zone song starts on its bar 1, on a bar line of the old song', bar1.oldBars !== null && Math.abs(bar1.oldBars - Math.round(bar1.oldBars)) < 1e-3 && bar1.stepLater > 0 && bar1.fromStep0, bar1);
  // sections (js/maps.js sectionAt): music follows the hero's section with hysteresis; warp doors switch at once
  await ev(() => {
    window.__secPt = (id) => {   // a walkable tile whose section is `id`, nearest the section's centre
      const m = G.map, S = m.sections.find((q) => q.id === id), R = S.rects || [[S.x, S.y, S.w, S.h]];
      let best = null;
      for (const [x, y, w, h] of R) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
        const cx = i + 0.5, cy = j + 0.5;
        if (sectionAt(m, cx, cy) !== S || !walkable(m, cx, cy, tileH(m, cx, cy))) continue;
        const d = Math.hypot(cx - (x + w / 2), cy - (y + h / 2)); if (!best || d < best.d) best = { x: cx, y: cy, d };
      }
      return best;
    };
    window.__goSec = (id) => { const q = __secPt(id), p = G.player; p.x = q.x; p.y = q.y; p.z = tileH(G.map, q.x, q.y); G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12; return q; };
  });
  const tbl = await ev(() => AUDIO.SECTION_MUSIC);
  check('sections: table wires pinewood hollow / warrens / clearing (+ vale.moon pond)', tbl.pinewood.hollow.song === 'roothollow' && tbl.pinewood.warrens.mask === 'low' && tbl.pinewood.clearing.arena === 'boss_bramblehorn' && tbl.vale.moon.song === 'fishing');
  d = await nextZone(() => { enterMap('pinewood'); G.state = 'play'; G.player.invulnT = 999; __goSec('forest'); }, () => AUDIO.current() === 'pinewood' && AUDIO.director().section === 'forest');
  check('section: pinewood.forest -> pinewood', d.zone === 'pinewood' && d.section === 'forest', d);
  d = await nextZone(() => { G.enemies.length = 0; __goSec('hollow'); }, () => AUDIO.current() === 'roothollow');
  const hol = await ev(() => { const E = AUDIO.engine, T = E.zone, old = E.tracks.find((t) => t.id === 'pinewood'); return { oldBars: old ? +((T.t0 - old.t0) / old.barDur).toFixed(4) : null, lead: T.layers.lead.ramp.v1 }; });
  check('section: pinewood.hollow -> roothollow (dungeon mask: no lead), on a bar line of the old song', d.zone === 'roothollow' && d.section === 'hollow' && hol.lead === 0 && hol.oldBars !== null && Math.abs(hol.oldBars - Math.round(hol.oldBars)) < 1e-3, Object.assign({}, d, hol));
  const hyst = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), T = AUDIO.engine.zone, out = {};
    __goSec('warrens'); await w(300); __goSec('hollow'); await w(300); __goSec('warrens'); await w(300); __goSec('hollow'); await w(600);
    out.flip = AUDIO.director().section; out.sameTrack = AUDIO.engine.zone === T;
    __goSec('warrens'); await w(1600);
    const Z = AUDIO.engine.zone; out.section = AUDIO.director().section; out.mask = AUDIO.director().mask; out.zone = Z.id; out.sameTrack2 = Z === T; out.perc = Z.layers.perc.ramp.v1;
    return out;
  });
  check('section: border flicker under 0.75 s never flips the music (hysteresis)', hyst.flip === 'hollow' && hyst.sameTrack, hyst);
  check('section: warrens -> roothollow at low intensity (same track, layers ramp down)', hyst.section === 'warrens' && hyst.mask === 'low' && hyst.zone === 'roothollow' && hyst.sameTrack2 && hyst.perc < 0.45, hyst);
  const warp = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), q = __secPt('forest');
    const ok = startWarp({ x: q.x, y: q.y }); await w(350);
    return { ok, section: AUDIO.director().section, want: AUDIO.wanted() };
  });
  check('section: a warp-door fade switches at once (no hysteresis) and counts as a transition', warp.ok && warp.section === 'forest' && warp.want === 'pinewood', warp);
  d = await nextZone(() => { __goSec('clearing'); }, () => AUDIO.director().section === 'clearing' && AUDIO.current() === 'pinewood');
  check('section: the clearing plays pinewood before the arena fight', d.zone === 'pinewood' && d.section === 'clearing', d);
  d = await nextZone(() => { startArena({ id: 'bramble_arena', gate: 'arena_gate', x: 100, y: 31, r: 8.5 }); }, () => AUDIO.current() === 'boss_bramblehorn');
  check('section: the clearing arena action -> boss_bramblehorn (hard cut on the beat), stem A before the boss', d.zone === 'boss_bramblehorn' && d.phase === 0, d);
  // intensity on a calm song: aggro raises percussion
  const inten = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    enterMap('pinewood'); await w(2500);
    const T0 = AUDIO.engine.zone, perc0 = T0 && T0.layers.perc.ramp.v1;
    const p = G.player; for (let i = 0; i < 2; i++) spawnEnemy('slime', p.x + 2 + i, p.y + 1, 0);
    await w(1200);
    const T = AUDIO.engine.zone; const r = { id: T && T.id, perc0, perc1: T && T.layers.perc.ramp.v1, lead1: T && T.layers.lead.ramp.v1, intensity: AUDIO.director().intensity };
    G.enemies.length = 0; await w(2000); r.after = AUDIO.director().intensity; r.perc2 = AUDIO.engine.zone.layers.perc.ramp.v1;
    return r;
  });
  check('intensity: aggro raises percussion (bar-quantised), lead down a notch, all clear decays to calm', inten.id === 'pinewood' && inten.perc1 > inten.perc0 && inten.lead1 < 1 && inten.intensity !== 'calm' && inten.after === 'calm' && inten.perc2 === inten.perc0, inten);
  // boss: stems follow the phase in js/bosses.js, phase stinger, victory on the kill
  const boss = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
    enterMap('pinewood'); G.state = 'play'; __goSec('clearing'); await w(1500);
    startArena({ id: 'bramble_arena', gate: 'arena_gate', x: 100, y: 31, r: 8.5 }); await w(1200);
    const p = G.player; p.invulnT = 999;
    const b = spawnEnemy('bramblehorn', p.x + 3, p.y, 0); b.cd = 99; await w(900);
    out.cut = AUDIO.current(); out.p1 = AUDIO.director().phase;
    b.hp = b.maxHp * 0.95; startMove(b, 'stomp'); await w(700);
    out.p2 = AUDIO.director().phase;
    b.bk.mv = null; b.hp = b.maxHp * 0.45; await w(900);
    out.bkPhase = b.bk.phase; out.p3 = AUDIO.director().phase;
    out.stingerPhase = AUDIO.engine.tracks.some((t) => t.id === 'st_phase');
    const T = AUDIO.engine.zone; out.leadTarget = T && T.layers.lead.ramp.v1;
    b.hp = b.maxHp * 0.15; await w(700); out.p4 = AUDIO.director().phase;
    b.spawnT = 0; b.under = false; damageEnemy(b, 1e7, { el: 'slash' });
    await w(400);
    out.dead = b.dead; out.victory = AUDIO.engine.tracks.some((t) => t.id === 'victory'); out.wantAfterKill = AUDIO.wanted();
    await w(4500); out.after = AUDIO.current();
    G.enemies.length = 0; G.slowmo = 0;
    return out;
  });
  check('boss: Bramblehorn fight -> boss_bramblehorn; stems A / AB on aggro / ABC at bosses.js phase 2 / ABCD on enrage', boss.cut === 'boss_bramblehorn' && boss.p2 === 1 && boss.bkPhase === 1 && boss.p3 === 2 && boss.leadTarget > 0 && boss.p4 === 3, boss);
  check('boss: stinger(phase) on the phase change, victory stinger on the kill, calm song after', boss.stingerPhase && boss.dead && boss.victory && boss.after === 'pinewood', boss);
  // telegraphs: the warnSfx hook is voiced; a move without a cue still gets one (never silent)
  const tele = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), p = G.player;
    setSetting('captions', true);
    const b = spawnEnemy('bramblehorn', p.x + 20, p.y + 20, 0); b.cd = 99; await w(300);
    const s0 = AUDIO.stats.sfx; startMove(b, 'stomp'); const s1 = AUDIO.stats.sfx;
    G.lastWarn = { boss: 'bramblehorn', move: 'x', type: 'novel_shape', sfx: null, t: G.t }; await w(400); const s2 = AUDIO.stats.sfx;
    const caps = AUDIO.captions();
    const far = AUDIO.sfx('hit', { x: p.x + 40, y: p.y + 40 }), farWarn = AUDIO.sfx('warn_line', { x: p.x + 40, y: p.y + 40 });
    G.enemies.length = 0; G.boss = null;
    return { hook: s1 - s0, fallback: s2 - s1, caps, far, farWarn };
  });
  check('telegraph: warnSfx hook voiced even off-screen; a move with no cue gets a fallback (never silent)', tele.hook >= 1 && tele.fallback >= 1 && tele.farWarn === true, tele);
  check('spatial: a hit 56 tiles away is attenuated to nothing', tele.far === false, tele.far);
  check('captions: SFX_CAPTIONS shown when the setting is on', tele.caps.includes('[boss wind-up]'), tele.caps);
  await page.screenshot({ path: path.join(OUT, 'captions.png') });
  // voice pool limits
  const caps = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)); await w(1100);
    const E = AUDIO.engine, cur = () => E.ctx.currentTime;
    let ok = 0; for (let i = 0; i < 10; i++) if (AUDIO.sfx('dmg_fire')) ok++;
    const same = E.sv.filter((v) => v.end > cur() && v.id === 'dmg_fire').length;
    await w(1100);
    const many = ['boom', 'heavy', 'swing', 'slash', 'bow', 'staff', 'zap', 'fire', 'frost', 'arcane', 'dash', 'hurt', 'trap', 'dmg_slash', 'dmg_frost', 'dmg_holy', 'dmg_gloom', 'dmg_nature', 'shout', 'heal'];
    for (const id of many) AUDIO.sfx(id);
    const busy = E.sv.filter((v) => v.end > cur()).length;
    return { ok, same, busy, pool: E.sv.length, musicPool: E.mv.length };
  });
  check('voices: same id at most 6x/s and 3 voices; 16 sfx voices total; 24 music voices', caps.ok === 6 && caps.same <= 3 && caps.busy <= 16 && caps.pool === 16 && caps.musicPool === 24, caps);
  // death: overlay + duck; dialogue duck; settings -> buses
  const misc = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), E = AUDIO.engine, out = {};
    enterMap('vale'); G.state = 'play'; await w(600);
    talk({ speaker: 'Pip', lines: ['Testing the duck.'] }); await w(400); out.dialogue = AUDIO.director().duckDb;
    G.talk.length = 0; await w(400);
    G.state = 'dead'; G.deadT = 0; G.player.dead = true; await w(500); out.death = AUDIO.director(); out.deathTrack = E.tracks.some((t) => t.id === 'death');
    G.state = 'play'; G.player.dead = false; await w(500); out.afterDeath = AUDIO.director().duckDb;
    setSetting('music', 0); await w(300); out.musicBus = E.bus.music.gain.value;
    setSetting('music', 0.75); setSetting('muted', true); await w(300); out.master = E.master.gain.value;
    setSetting('muted', false); await w(300); out.master2 = +E.master.gain.value.toFixed(3);
    AUDIO.setMono(true); out.mono = E.out.channelCount; AUDIO.setMono(false);
    setSetting('captions', false);
    return out;
  });
  check('duck: dialogue -9 dB, death -20 dB + the death motif, released on respawn', misc.dialogue === -9 && misc.death.duckDb === -20 && misc.deathTrack && misc.death.overlay === 'death' && misc.afterDeath === 0, misc);
  check('settings: music slider -> music bus, mute -> master bus, mono fold', misc.musicBus < 0.01 && misc.master < 0.01 && misc.master2 > 0.9 && misc.mono === 1, misc);
  // CPU: run music + a steady sfx stream for 5 s, read the scheduler's own timings
  const cpu = await ev(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), st = AUDIO.stats;
    const t0 = st.ticks; let n = 0; const iv = setInterval(() => { AUDIO.sfx(['swing', 'hit', 'step_grass', 'dmg_slash'][n++ % 4]); }, 120);
    st.tickMax = 0; await w(5000); clearInterval(iv);
    return { ticks: st.ticks - t0, tickMs: +st.tickMs.toFixed(4), tickMax: +st.tickMax.toFixed(3), frameMs: +st.frameMs.toFixed(4), musicVoices: st.musicVoices, notes: st.notes, perFrameMs: +(st.tickMs * (16.67 / 25) + st.frameMs).toFixed(4) };
  });
  check('cpu: scheduler tick + director cost per 16.7 ms frame < 0.5 ms (avg)', cpu.perFrameMs < 0.5 && cpu.ticks > 150, cpu);
  check('no page errors', errors.length === 0, errors.slice(0, 6));
  await browser.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll audio checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
