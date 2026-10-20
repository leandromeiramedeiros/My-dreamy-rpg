'use strict';
// ---------------------------------------------------------------------------
// audio.js — the WebAudio engine (docs/AUDIO.md "Engine", "Mixing rules", "Accessibility", "Risks").
// Classic script, no modules, works from file://. Plays the DATA in js/music.js (MUSIC_PATCHES, MUSIC, MUSIC_UTIL) and
// js/sfxdata.js (SFX_RECIPES, WARN_SFX, SFX_CAPTIONS); it never rewrites them. Loads after music.js / sfxdata.js and
// before game.js. Everything browser-touching is guarded, so the vm in tools/validate-ids.js loads it cleanly.
//
// API (global AUDIO)
//   AUDIO.unlock()               create / resume the AudioContext. Call from a user gesture (game.js initAudio() does).
//                                Also installed automatically: every pointerdown / keydown / touchend / mousedown calls it
//                                until the context is 'running'. Before that the game runs silently (captions still work).
//   AUDIO.state()                'none' (no context yet) | 'suspended' | 'running' | 'closed' | 'interrupted'
//   AUDIO.sfx(id, pos?, opts?)   play an SFX_RECIPES id. pos = { x, y } world tiles (an entity works) -> pan + distance
//                                attenuation from its screen position; omitted -> PART_SRC (the acting enemy) or, for warn_*
//                                cues, the boss; else centred. opts = { gain, at (s from now) }. Returns true if voiced.
//                                game.js sfx(id) is a thin wrapper. Unknown ids are ignored (drop6.. fold to drop5).
//   AUDIO.frame(dt)              once per display frame (main.js loop): the director. Reads G and decides the wanted
//                                song, stems, intensity, ducking and telegraph fallbacks; the 25 ms tick applies them on
//                                beat / bar boundaries. Cheap (see AUDIO.stats).
//   AUDIO.onTransition(mapId)    the rift fade started (main.js transition): fade the current song over 1 bar now; the
//                                next zone song starts on its bar 1 at the next bar line.
//   AUDIO.onBossKilled(e)        victory stinger; the boss song fades and the map's calm song returns after the stinger.
//   AUDIO.stinger(name)          'levelup' | 'legendary' | 'discovery' | 'phase' | 'victory' — 1-2 bar phrase on the UI
//                                bus, on the next beat of the current song, transposed to its key.
//   AUDIO.music(id|null)         force a song (null = back to the director). AUDIO.current() -> the zone song id playing.
//   AUDIO.setLayer(name, 0..1, fadeBars=1)   ramp a layer of the current song, starting on the next bar line.
//   AUDIO.duck(reason, on)       manual duck: 'dialogue' -9 dB, 'fishing' -12 dB, 'death' -20 dB (the director sets
//                                these from G.talk / G.fishing / G.state === 'dead' too). 100 ms down, 600 ms up.
//   AUDIO.applySettings()        re-read SETTINGS (runs on onSettingsChange). Bus mapping: master (SETTINGS.master, def 1),
//                                music, sfx, ui (SETTINGS.ui, def = sfx), ambient (SETTINGS.ambient, def = sfx); mute =
//                                SETTINGS.muted || G.muted, applied to the master bus only (scheduling never stops, so
//                                unmuting never desyncs). SETTINGS.mono / SETTINGS.reduceBass when those keys exist.
//   AUDIO.setMono(bool) / AUDIO.setReduceBass(bool)   direct overrides (sticky until the setting changes).
//   AUDIO.caption(text) / AUDIO.drawCaptions(ctx)      sound captions (SETTINGS.captions): bottom-left of the 960x540 HUD,
//                                sized by the text-size setting. sfx() pushes SFX_CAPTIONS[id] automatically.
//   AUDIO.stats                  { tickMs, tickMax, frameMs, ticks, notes, musicVoices, sfxVoices, timbres } — tickMs /
//                                frameMs are EMAs of the 25 ms scheduler tick and the per-frame director, in ms.
//   AUDIO.cfg                    { tickMs:25, lookahead:0.12 | 0.2 coarse, musicVoices:24 | 12, sfxVoices:16, perId:3, ... }
//   Offline (same synth, same tick code, tools/audio-check.js):
//   AUDIO.timbres(sampleRate?) -> Promise   the four boot-rendered hard timbres (wood, bell, choir, cymbal + swell).
//   AUDIO.renderSfx(id, { sampleRate }) -> Promise<AudioBuffer>
//   AUDIO.renderMusic(id, { sampleRate, phase, intensity, bars, key, events:[{ t, fn(engine) }] }) -> Promise<AudioBuffer>
//   AUDIO.bufferStats(buf, from?, to?) -> { rms, peak, rmsDb, peakDb, bad, seconds }
//   AUDIO.Engine(ctx, opts)      the engine class itself (one per BaseAudioContext).
//
// GRAPH   voices -> layer gains -> track gains -> [zone tracks: duck] -> music bus --+
//         sfx voices -> panner -> sfx | ui | ambient bus --------------------------+-> master -> low shelf (reduce bass)
//         delay (dotted eighth, feedback) + convolver reverb returns -> music bus --+   -> compressor (-12 dB, 3:1)
//                                                                                        -> mono fold -> destination
// VOICES  music: a pool of pre-created voice stages (envelope GainNode + filter + 3 send gains); oscillators are created
//         per note because WebAudio sources are one-shot. Oldest voice is stolen. sfx: 16 pooled output stages
//         (gain + StereoPanner), at most 3 per id, oldest lowest-priority voice stolen, the same id at most 6x/s (warn_*
//         cues exempt), +-vary pitch (none on UI), hit / dmg_* rotate 3 variants, nothing but music longer than 1.5 s.
// TIMBRES wood-block, glass bell, choir "ah" and cymbal (+ reversed swell) are rendered once at boot through an
//         OfflineAudioContext (FM / additive / filtered noise) and played by the woodblock / bossWood / glassPing /
//         choir / cymbal patches with their own ADSR, filter and sends; oscillators stand in until the render resolves.
// ---------------------------------------------------------------------------
const AUDIO = (() => {
  const W = typeof window !== 'undefined' ? window : null;
  const ACtor = W && (W.AudioContext || W.webkitAudioContext) || null;
  const OACtor = W && (W.OfflineAudioContext || W.webkitOfflineAudioContext) || null;
  let COARSE = false;
  try { COARSE = !!(W && typeof W.matchMedia === 'function' && W.matchMedia('(pointer: coarse)').matches); } catch (e) { COARSE = false; }
  const CFG = {
    tickMs: 25, lookahead: COARSE ? 0.2 : 0.12, musicVoices: COARSE ? 12 : 24, sfxVoices: 16, perId: 3, perSec: 6,
    impulse: COARSE ? 1.5 : 2.6, convolvers: COARSE ? 1 : 2, extraLayer: !COARSE, maxSfx: 1.5, coarse: COARSE,
  };
  const OSC = { sine: 'sine', triangle: 'triangle', square: 'square', saw: 'sawtooth', sawtooth: 'sawtooth' };
  const MUSIC_GAIN = 0.7;                       // music bus at the default slider (preview MASTER_GAIN)
  const DUCK = { dialogue: -9, fishing: -12, death: -20 };
  const STINGERS = { levelup: 'st_levelup', legendary: 'st_legendary', discovery: 'st_discovery', phase: 'st_phase', victory: 'victory' };
  // map -> song (Act I). Title = the lullaby once, then the title loop. Unmapped maps fall back by theme.
  const MAP_MUSIC = { vale: 'vale', pinewood: 'pinewood', roothollow: 'roothollow', pinewood_boss: 'boss_bramblehorn' };
  const THEME_MUSIC = { vale: 'vale', forest: 'pinewood' };
  const BOSS_MUSIC = { bramblehorn: 'boss_bramblehorn' };   // any other boss fight in Act I borrows boss_bramblehorn
  // reverb colour per song: [seconds, brightness]
  const VERB = { bright: [2.6, 0.65], forest: [2.2, 0.55], cave: [3.0, 0.4], hall: [2.4, 0.5] };
  const SONG_VERB = { roothollow: 'cave', boss_bramblehorn: 'hall', pinewood: 'forest', fishing: 'forest' };
  const TIMBRE_OF = { woodblock: 'wood', bossWood: 'wood', glassPing: 'bell', choir: 'choir', cymbal: 'cymbal' };

  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  function seeded(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  const HAS = { MUSIC: false, SFX: false };
  function refreshHas() {
    HAS.MUSIC = typeof MUSIC !== 'undefined' && typeof MUSIC_UTIL !== 'undefined' && typeof MUSIC_PATCHES !== 'undefined';
    HAS.SFX = typeof SFX_RECIPES !== 'undefined';
  }
  refreshHas();
  const gG = () => (typeof G !== 'undefined' ? G : null);
  const S = () => (typeof SETTINGS !== 'undefined' ? SETTINGS : {});

  // ------------------------------------------------------------------ old-WebKit shims (per context)
  function shim(ctx) {
    if (!ctx.createGain && ctx.createGainNode) ctx.createGain = ctx.createGainNode;
    if (!ctx.createDelay && ctx.createDelayNode) ctx.createDelay = ctx.createDelayNode;
    try {
      const AP = W && W.AudioParam && W.AudioParam.prototype;
      if (AP && !AP.setTargetAtTime && AP.setTargetValueAtTime) AP.setTargetAtTime = AP.setTargetValueAtTime;
    } catch (e) { /* ignore */ }
    return ctx;
  }
  function startSrc(s, t, off) { if (s.start) { if (off !== undefined) s.start(t, off); else s.start(t); } else if (s.noteOn) s.noteOn(t); }
  function stopSrc(s, t) { try { if (s.stop) s.stop(t); else if (s.noteOff) s.noteOff(t); } catch (e) { /* already stopped */ } }

  // ------------------------------------------------------------------ generated buffers
  const IMPULSES = {};
  function makeImpulse(ctx, seconds, bright) {
    const key = ctx.sampleRate + ':' + seconds + ':' + bright;
    if (IMPULSES[key]) return IMPULSES[key];
    const sr = ctx.sampleRate, n = Math.floor(sr * seconds), buf = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const rnd = seeded(1234 + ch * 77), d = buf.getChannelData(ch), pre = Math.floor(sr * 0.015); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, env = Math.pow(1 - t, 2.6), c = bright - 0.5 * t;   // darkens as it decays
        lp += ((rnd() * 2 - 1) - lp) * Math.max(0.05, c);
        d[i] = i < pre ? 0 : lp * env;
      }
    }
    return (IMPULSES[key] = buf);
  }
  function makeNoise(ctx) {
    const n = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), rnd = seeded(99);
    for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
    return buf;
  }

  // ------------------------------------------------------------------ boot-time hard timbres (OfflineAudioContext)
  // Each entry: { buf, base (Hz the buffer sounds at), loop }. Shared by every context (AudioBuffers are context-free).
  const TIMBRES = {};
  let timbrePromise = null;
  function offline(ch, len, sr) {
    try { return new OACtor(ch, len, sr); } catch (e) { return null; }
  }
  function renderCtx(ctx) {
    return new Promise((res, rej) => {
      ctx.oncomplete = (e) => res(e.renderedBuffer);
      const p = ctx.startRendering();
      if (p && p.then) p.then(res, rej);
    });
  }
  function normalize(buf, peakTo, rmsTo) {
    let peak = 0, sum = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n));
    const k = rmsTo ? rmsTo / Math.max(rms, 1e-9) : peakTo / Math.max(peak, 1e-9);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }
  function renderWood(sr) {          // FM knock + band-passed noise click, 880 Hz
    const ctx = shim(offline(1, Math.floor(sr * 0.25), sr)); if (!ctx) return null;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), env = ctx.createGain();
    car.type = 'sine'; car.frequency.value = 880; mod.frequency.value = 880 * 2.3;
    mg.gain.setValueAtTime(900, 0); mg.gain.exponentialRampToValueAtTime(10, 0.05);
    mod.connect(mg); mg.connect(car.frequency); car.connect(env);
    env.gain.setValueAtTime(0, 0); env.gain.linearRampToValueAtTime(1, 0.001); env.gain.exponentialRampToValueAtTime(0.0005, 0.2);
    const nz = ctx.createBufferSource(); nz.buffer = makeNoise(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.6, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.015);
    nz.connect(bp); bp.connect(ng); ng.connect(ctx.destination); env.connect(ctx.destination);
    car.start(0); mod.start(0); nz.start(0); car.stop(0.25); mod.stop(0.25); nz.stop(0.25);
    return renderCtx(ctx).then(b => ({ buf: normalize(b, 0.9), base: 880, loop: false }));
  }
  function renderBell(sr) {          // glass bell: inharmonic FM partials, long decay, 880 Hz
    const ctx = shim(offline(1, Math.floor(sr * 2.2), sr)); if (!ctx) return null;
    const out = ctx.createGain(); out.connect(ctx.destination);
    [[1, 1, 1.9], [2.76, 0.45, 1.1], [5.4, 0.22, 0.6], [8.93, 0.1, 0.35]].forEach(([r, a, dec]) => {
      const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), env = ctx.createGain();
      car.frequency.value = 880 * r; mod.frequency.value = 880 * r * 1.414;
      mg.gain.setValueAtTime(880 * r * 0.6, 0); mg.gain.exponentialRampToValueAtTime(1, 0.4);
      mod.connect(mg); mg.connect(car.frequency); car.connect(env); env.connect(out);
      env.gain.setValueAtTime(0, 0); env.gain.linearRampToValueAtTime(a, 0.001); env.gain.setTargetAtTime(0, 0.001, dec / 4);
      car.start(0); mod.start(0); car.stop(2.2); mod.stop(2.2);
    });
    return renderCtx(ctx).then(b => ({ buf: normalize(b, 0.9), base: 880, loop: false }));
  }
  function renderChoir(sr) {         // choir "ah": formant-weighted additive harmonics, 3 voices at integer Hz -> seamless 1 s loop
    const ctx = shim(offline(2, sr, sr)); if (!ctx || !ctx.createPeriodicWave) return null;
    const N = 40, re = new Float32Array(N + 1), im = new Float32Array(N + 1), F = [[700, 130, 1], [1220, 150, 0.5], [2600, 250, 0.25]];
    for (let k = 1; k <= N; k++) {
      const f = 220 * k; let a = 0;
      for (const [fc, bw, g] of F) a += g / (1 + Math.pow((f - fc) / bw, 2));
      im[k] = (a + 0.02) / Math.sqrt(k);
    }
    const wave = ctx.createPeriodicWave(re, im), merge = ctx.createChannelMerger ? ctx.createChannelMerger(2) : null;
    [[219, 0], [220, 1], [221, 0], [222, 1]].forEach(([f, ch]) => {
      const o = ctx.createOscillator(); o.setPeriodicWave(wave); o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.5; o.connect(g);
      if (merge) g.connect(merge, 0, ch); else g.connect(ctx.destination);
      o.start(0); o.stop(1);
    });
    if (merge) merge.connect(ctx.destination);
    return renderCtx(ctx).then(b => ({ buf: normalize(b, 0, 0.35), base: 220, loop: true }));
  }
  function renderCymbal(sr) {        // 808-style: six inharmonic squares + noise, high-passed; also the reversed swell
    const len = 1.6, ctx = shim(offline(1, Math.floor(sr * len), sr)); if (!ctx) return null;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; hp.Q.value = 0.7;
    const env = ctx.createGain(); env.gain.setValueAtTime(0, 0); env.gain.linearRampToValueAtTime(1, 0.003); env.gain.setTargetAtTime(0, 0.003, 0.35);
    hp.connect(env); env.connect(ctx.destination);
    [205.3, 304.4, 369.6, 522.7, 540, 800].forEach(f => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * 1.6; const g = ctx.createGain(); g.gain.value = 0.15; o.connect(g); g.connect(hp); o.start(0); o.stop(len); });
    const nz = ctx.createBufferSource(); nz.buffer = makeNoise(ctx); const ng = ctx.createGain(); ng.gain.value = 0.5; nz.connect(ng); ng.connect(hp); nz.start(0); nz.stop(len);
    return renderCtx(ctx).then(b => {
      normalize(b, 0.9);
      const r = ctx.createBuffer(1, b.length, b.sampleRate);
      const s = b.getChannelData(0), d = r.getChannelData(0); for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
      TIMBRES.swell = { buf: r, base: 1, loop: false };
      return { buf: b, base: 1, loop: false };
    }).catch(() => null);
  }
  function timbres(sampleRate) {
    if (timbrePromise) return timbrePromise;
    if (!OACtor) return (timbrePromise = Promise.resolve(TIMBRES));
    const sr = sampleRate || 44100, jobs = { wood: renderWood, bell: renderBell, choir: renderChoir, cymbal: renderCymbal };
    timbrePromise = Promise.all(Object.keys(jobs).map(k => {
      let p = null; try { p = jobs[k](sr); } catch (e) { p = null; }
      return Promise.resolve(p).then(v => { if (v) TIMBRES[k] = v; }, () => { /* keep the oscillator fallback */ });
    })).then(() => TIMBRES);
    return timbrePromise;
  }

  // ------------------------------------------------------------------ song plan (preview port)
  const PLANS = {};
  function planOf(id) {
    if (PLANS[id]) return PLANS[id];
    const song = MUSIC[id], n = MUSIC_UTIL.stepsPerBar(song.meter), plan = { n, total: song.bars * n, beat: song.meter === '6/8' ? 6 : 4, layers: {} };
    for (const name in song.layers) {
      const L = song.layers[name], parsed = MUSIC_UTIL.parseLayer(L, song.meter, name === 'perc'), at = new Map();
      for (const e of parsed.events) { if (!at.has(e.step)) at.set(e.step, []); at.get(e.step).push(e); }
      plan.layers[name] = { L, loop: parsed.steps, at };
    }
    return (PLANS[id] = plan);
  }
  function stemLevels(song, phase) {
    const out = {}, active = song.stems ? new Set([].concat(...[...song.phases[Math.max(0, Math.min(song.phases.length - 1, phase))]].map(k => song.stems[k] || []))) : null;
    for (const name in song.layers) out[name] = active && !active.has(name) ? 0 : (song.mix && song.mix[name] !== undefined ? song.mix[name] : 1);
    return out;
  }
  function intensityLevels(song, state) {
    const I = song.intensity, base = stemLevels(song, 0);
    if (!I) return base;
    const calm = Object.assign({}, base, I.calm || {}), combat = Object.assign({}, calm, I.combat || {});
    if (state === 'calm' || !I.combat) return calm;
    const out = Object.assign({}, calm);
    out.perc = combat.perc; out.lead = combat.lead;
    if (state === 'big') out.extra = combat.extra !== undefined ? combat.extra : 1;
    for (const k in combat) if (k !== 'extra' && out[k] === undefined) out[k] = combat[k];
    return out;
  }

  // ==================================================================== Engine
  function Engine(ctx, opts) {
    opts = opts || {};
    const E = this; shim(ctx);
    E.ctx = ctx; E.offline = !!opts.offline; E.cfg = Object.assign({}, CFG, opts.cfg || {});
    E.stats = { tickMs: 0, tickMax: 0, frameMs: 0, ticks: 0, notes: 0, sfx: 0, musicVoices: 0, sfxVoices: 0, timbres: 0 };
    E.noise = makeNoise(ctx);
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    E.gain = gain;
    // master chain
    E.master = gain(1);
    E.shelf = ctx.createBiquadFilter(); E.shelf.type = 'lowshelf'; E.shelf.frequency.value = 160; E.shelf.gain.value = 0;
    E.comp = ctx.createDynamicsCompressor();
    E.comp.threshold.value = -12; E.comp.ratio.value = 3; E.comp.knee.value = 6; E.comp.attack.value = 0.01; E.comp.release.value = 0.25;
    E.out = gain(1);   // mono fold point
    E.master.connect(E.shelf); E.shelf.connect(E.comp); E.comp.connect(E.out); E.out.connect(ctx.destination);
    E.bus = { music: gain(MUSIC_GAIN), sfx: gain(1), ui: gain(1), ambient: gain(1) };
    for (const k in E.bus) E.bus[k].connect(E.master);
    // music fx: delay + reverb slots (one convolver per zone colour, 2 on desktop / 1 on phones)
    E.delay = ctx.createDelay(2); E.delay.delayTime.value = 0.375;
    const fb = gain(0.38), dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    E.delay.connect(dlp); dlp.connect(fb); fb.connect(E.delay);
    E.delayRet = gain(0.8); dlp.connect(E.delayRet); E.delayRet.connect(E.bus.music);
    E.verbs = [];
    for (let i = 0; i < E.cfg.convolvers; i++) {
      const c = ctx.createConvolver(), r = gain(0.9); c.connect(r); r.connect(E.bus.music); E.verbs.push({ c, colour: null });
    }
    E.delayRet.connect(E.verbs[0].c);   // echoes get a little room too
    E.verbSlot = 0; E.setVerb('bright', 0);
    // zone duck (dry, delay send and one per reverb slot): zone tracks pass through it, overlays bypass it
    E.duckN = { dry: gain(1), del: gain(1), rev: E.verbs.map(() => gain(1)) };
    E.duckN.dry.connect(E.bus.music); E.duckN.del.connect(E.delay); E.duckN.rev.forEach((g, i) => g.connect(E.verbs[i].c));
    E.duckDb = 0; E.ducks = {};
    // voices
    E.mv = []; for (let i = 0; i < E.cfg.musicVoices; i++) E.mv.push(E.makeMusicVoice());
    E.sv = []; for (let i = 0; i < E.cfg.sfxVoices; i++) E.sv.push(E.makeSfxVoice());
    E.tracks = []; E.zone = null;
    E.sfxTimes = {}; E.variant = {};
    E.mono = false; E.bass = false;
  }
  const EP = Engine.prototype;
  EP.setVerb = function (colour, slot) {
    const v = this.verbs[slot]; if (!v || v.colour === colour) return;
    const [sec, bright] = VERB[colour] || VERB.bright;
    v.c.buffer = makeImpulse(this.ctx, Math.min(sec, this.cfg.impulse), bright); v.colour = colour;
  };
  // ---------------------------------------------------------------- music voices
  EP.makeMusicVoice = function () {
    const c = this.ctx, v = { env: c.createGain(), flt: c.createBiquadFilter(), dry: c.createGain(), del: c.createGain(), rev: c.createGain(), dest: null, end: 0, srcs: [] };
    v.env.gain.value = 0; v.env.connect(v.flt); v.flt.connect(v.dry); v.flt.connect(v.del); v.flt.connect(v.rev);
    return v;
  };
  EP.allocMusic = function (t) {
    const cur = this.ctx.currentTime; let best = null;
    for (const v of this.mv) { if (v.end <= cur) return { v, steal: false }; if (!best || v.end < best.end) best = v; }
    return { v: best, steal: true };
  };
  EP.connectVoice = function (v, L) {
    if (v.dest === L) return;
    try { v.dry.disconnect(); v.del.disconnect(); v.rev.disconnect(); } catch (e) { /* not connected */ }
    v.dry.connect(L.dry); v.del.connect(L.del); v.rev.connect(L.rev); v.dest = L;
  };
  // one note. patch = MUSIC_PATCHES entry, midi pitch, t start, dur gate seconds, vel 0..1, L = layer node set
  EP.playNote = function (L, patchId, midi, t, dur, vel) {
    const ctx = this.ctx, patch = MUSIC_PATCHES[patchId]; if (!patch) return;
    const [a, d, s, r] = patch.adsr, freq = MUSIC_UTIL.midiToFreq(midi), perc = patch.freq !== undefined;
    const tim = TIMBRES[TIMBRE_OF[patchId]] || null, unison = tim ? Math.min(2, patch.unison || 1) : (patch.unison || 1);
    if (perc) dur = Math.max(dur, a + d);
    const { v, steal } = this.allocMusic(t);
    if (steal) {   // fast fade of the oldest voice, the new note lands 12 ms later
      v.env.gain.cancelScheduledValues(t); v.env.gain.setTargetAtTime(0, t, 0.003);
      for (const sN of v.srcs) stopSrc(sN, t + 0.012);
      t += 0.012;
    }
    v.srcs = [];
    this.connectVoice(v, L);
    const tr = t + Math.max(dur, 0.01), tc = Math.max(d, 0.005) / 3, peak = (patch.gain || 0.2) * vel / Math.sqrt(unison);
    const g = v.env.gain; g.cancelScheduledValues(t); g.setValueAtTime(0, t);
    let vr;
    if (dur <= a) { vr = peak * (dur / a); g.linearRampToValueAtTime(vr, tr); }
    else { g.linearRampToValueAtTime(peak, t + a); g.setTargetAtTime(peak * s, t + a, tc); vr = peak * (s + (1 - s) * Math.exp(-(dur - a) / tc)); }
    g.setValueAtTime(vr, tr); g.setTargetAtTime(0, tr, Math.max(r, 0.01) / 4);
    const stopAt = tr + Math.max(r, 0.02) * 1.8 + 0.05;
    v.end = stopAt;
    const f = patch.filter, flt = v.flt;
    flt.type = f.type; flt.Q.setValueAtTime(f.q || 0.5, t);
    const base = f.freq * (f.track ? Math.pow(freq / 261.63, f.track) : 1), top = Math.min(base + (f.env || 0), ctx.sampleRate * 0.45);
    flt.frequency.cancelScheduledValues(t); flt.frequency.setValueAtTime(top, t);
    if (f.env) flt.frequency.setTargetAtTime(base, t, (a + d) / 3 + 0.01);
    v.dry.gain.setValueAtTime(1, t);
    v.del.gain.setValueAtTime(patch.send && patch.send.delay || 0, t);
    v.rev.gain.setValueAtTime(patch.send && patch.send.reverb || 0, t);
    for (let i = 0; i < unison; i++) {
      const st = t + i * 0.003; let src;
      const det = unison > 1 ? (patch.detune || 0) * (i / (unison - 1) * 2 - 1) : 0;
      if (tim) {
        src = ctx.createBufferSource(); src.buffer = tim.buf; src.loop = tim.loop;
        const hz = perc ? (patchId === 'cymbal' ? 1 : patch.freq) : freq;
        src.playbackRate.setValueAtTime(tim.base === 1 ? 1 : hz / tim.base, st);
        if (src.detune) src.detune.value = det;
        if (patch.vibrato && src.detune) this.vibrato(src.detune, patch.vibrato, st, stopAt);
        startSrc(src, st, tim.loop ? (i * 0.37) % 1 : 0);
      } else if (patch.osc === 'noise') {
        src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
        startSrc(src, st, (Math.abs(Math.sin(t * 12.9898 + i)) * 1.5) % 1.5);
      } else {
        src = ctx.createOscillator(); src.type = OSC[patch.osc] || 'sine';
        if (perc) { src.frequency.setValueAtTime(patch.freq, st); src.frequency.exponentialRampToValueAtTime(Math.max(patch.sweep || patch.freq, 1), st + a + d + 0.001); }
        else src.frequency.value = freq;
        src.detune.value = det;
        if (patch.vibrato) this.vibrato(src.detune, patch.vibrato, st, stopAt);
        startSrc(src, st);
      }
      src.connect(v.env); stopSrc(src, stopAt); v.srcs.push(src);
    }
    this.stats.notes++;
  };
  EP.vibrato = function (param, vib, st, stopAt) {
    const c = this.ctx, lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = vib.rate; lg.gain.setValueAtTime(0, st); lg.gain.linearRampToValueAtTime(vib.depth, st + (vib.delay || 0) + 0.3);
    lfo.connect(lg); lg.connect(param); startSrc(lfo, st); stopSrc(lfo, stopAt);
  };
  // ---------------------------------------------------------------- tracks (one playing song / stinger)
  // opts: { dest:'zone'|'music'|'ui', at, phase, intensity, levels, key (shift semitones), as, chain, loop, fadeIn }
  EP.startTrack = function (id, opts) {
    opts = opts || {};
    const ctx = this.ctx, song = MUSIC[id]; if (!song) return null;
    const plan = planOf(id), stepDur = MUSIC_UTIL.stepSeconds(song), at = Math.max(opts.at !== undefined ? opts.at : ctx.currentTime + 0.05, ctx.currentTime);
    const T = { id, as: opts.as || id, song, plan, stepDur, barDur: stepDur * plan.n, beatDur: stepDur * plan.beat, t0: at, step: 0, nextTime: at,
      keyShift: opts.key || 0, loop: opts.loop !== undefined ? opts.loop : song.loop !== false, chain: opts.chain || null, dest: opts.dest || 'zone',
      layers: {}, done: false, removeAt: Infinity, maxSteps: opts.bars ? opts.bars * plan.n : Infinity };
    const slot = this.verbSlot;
    T.out = { dry: this.gain(0), del: this.gain(0), rev: this.gain(0) };
    if (T.dest === 'zone') { T.out.dry.connect(this.duckN.dry); T.out.del.connect(this.duckN.del); T.out.rev.connect(this.duckN.rev[slot]); }
    else { const b = this.bus[T.dest] || this.bus.music; T.out.dry.connect(b); T.out.del.connect(this.delay); T.out.rev.connect(this.verbs[slot].c); }
    const fadeIn = opts.fadeIn || 0;
    for (const k of ['dry', 'del', 'rev']) { const p = T.out[k].gain; p.setValueAtTime(0, at); if (fadeIn) p.linearRampToValueAtTime(1, at + fadeIn); else p.setValueAtTime(1, at); }
    T.fade = { v0: fadeIn ? 0 : 1, v1: 1, t0: at, t1: at + fadeIn };
    const lv = opts.levels || (song.stems ? stemLevels(song, opts.phase || 0) : intensityLevels(song, opts.intensity || 'calm'));
    for (const name in song.layers) {
      const L = { dry: this.gain(0), del: this.gain(0), rev: this.gain(0), ramp: null };
      L.dry.connect(T.out.dry); L.del.connect(T.out.del); L.rev.connect(T.out.rev);
      let v = lv[name] !== undefined ? lv[name] : 1; if (name === 'extra' && !this.cfg.extraLayer) v = 0;
      for (const k of ['dry', 'del', 'rev']) L[k].gain.value = v;
      L.ramp = { v0: v, v1: v, t0: 0, t1: 0 };
      T.layers[name] = L;
    }
    this.tracks.push(T);
    if (T.dest === 'zone') {
      this.zone = T; this.zoneId = T.as;
      const step = MUSIC_UTIL.stepSeconds(song);
      this.delay.delayTime.setTargetAtTime(Math.min(1.9, step * 3), at, 0.05);
    }
    return T;
  };
  const valAt = (R, t) => (t <= R.t0 ? R.v0 : t >= R.t1 ? R.v1 : R.v0 + (R.v1 - R.v0) * (t - R.t0) / (R.t1 - R.t0));
  function rampNodes(nodes, R, to, t0, t1) {
    const v0 = valAt(R, t0);
    for (const n of nodes) { const p = n.gain; p.cancelScheduledValues(t0); p.setValueAtTime(v0, t0); p.linearRampToValueAtTime(to, Math.max(t1, t0 + 0.005)); }
    R.v0 = v0; R.v1 = to; R.t0 = t0; R.t1 = Math.max(t1, t0 + 0.005);
  }
  EP.nextBar = function (T, minAhead) {
    const t = this.ctx.currentTime + (minAhead !== undefined ? minAhead : 0.03);
    return T.t0 + Math.max(0, Math.ceil((t - T.t0) / T.barDur - 1e-6)) * T.barDur;
  };
  EP.nextBeat = function (T, minAhead) {
    const t = this.ctx.currentTime + (minAhead !== undefined ? minAhead : 0.03);
    return T.t0 + Math.max(0, Math.ceil((t - T.t0) / T.beatDur - 1e-6)) * T.beatDur;
  };
  // ramp a layer to `level` over fadeBars, starting on the next bar line
  EP.setLayer = function (T, name, level, fadeBars) {
    T = T || this.zone; if (!T || !T.layers[name]) return;
    if (name === 'extra' && !this.cfg.extraLayer) level = 0;
    const L = T.layers[name], tb = this.nextBar(T), fb = fadeBars === undefined ? 1 : fadeBars;
    if (L.ramp.v1 === level && L.ramp.t1 >= 0) return;
    rampNodes([L.dry, L.del, L.rev], L.ramp, level, tb, tb + fb * T.barDur);
  };
  EP.setLevels = function (T, lv, fadeBars) { for (const n in lv) this.setLayer(T, n, lv[n], fadeBars); };
  EP.fadeTrack = function (T, to, t0, t1) {
    rampNodes([T.out.dry, T.out.del, T.out.rev], T.fade, to, t0, t1);
    if (to === 0) T.removeAt = Math.min(T.removeAt, t1 + 0.05);
  };
  EP.stopTrack = function (T, t0, t1) {
    this.fadeTrack(T, 0, t0, t1);
    T.stopSched = t1;   // nothing new is scheduled past the fade
    if (this.zone === T) { this.zone = null; }
  };
  EP.dropTrack = function (T) {
    for (const k of ['dry', 'del', 'rev']) try { T.out[k].disconnect(); } catch (e) { /* ignore */ }
    for (const n in T.layers) for (const k of ['dry', 'del', 'rev']) try { T.layers[n][k].disconnect(); } catch (e) { /* ignore */ }
    for (const v of this.mv) if (v.dest && T.layers && Object.values(T.layers).includes(v.dest)) v.dest = null;
  };
  EP.scheduleStep = function (T, step, t) {
    const plan = T.plan, s = step % plan.total, sd = T.stepDur;
    for (const name in plan.layers) {
      if (name === 'extra' && !this.cfg.extraLayer) continue;   // phones drop the extra layer outright
      const P = plan.layers[name], evs = P.at.get(s % P.loop); if (!evs) continue;
      const shift = (P.L.transpose || 0) + T.keyShift, L = T.layers[name];
      for (const e of evs) {
        if (name === 'perc') {
          const pid = e.patch === 'x' ? P.L.patch : (P.L.alt || P.L.patch);
          this.playNote(L, pid, e.notes.length ? e.notes[0] + shift : 60, t, sd, e.vel);
        } else for (const m of e.notes) this.playNote(L, P.L.patch, m + shift, t, e.dur * sd - 0.01, e.vel);
      }
    }
  };
  // the 25 ms tick: schedule every step inside the lookahead window on AC.currentTime
  EP.tick = function (lookahead) {
    const t0 = now(), ctx = this.ctx, cur = ctx.currentTime, horizon = cur + (lookahead || this.cfg.lookahead);
    for (let i = 0; i < this.tracks.length; i++) {
      const T = this.tracks[i];
      if (!T.done) {
        // came back from a stall (throttled timer): skip the steps that are already late instead of bunching them
        if (T.nextTime < cur - 0.1) { const k = Math.ceil((cur - T.t0) / T.stepDur); if (k > T.step) { T.step = T.loop ? k : Math.min(k, T.plan.total); T.nextTime = T.t0 + T.step * T.stepDur; } }
        while (T.nextTime < horizon) {
          if (T.stopSched !== undefined && T.nextTime >= T.stopSched) { T.done = true; break; }
          if (T.step >= T.maxSteps) { T.done = true; T.removeAt = Math.min(T.removeAt, T.nextTime + 4); break; }
          if (!T.loop && T.step >= T.plan.total) {
            T.done = true; T.removeAt = Math.min(T.removeAt, T.nextTime + 4.5);
            if (T.chain) { const nt = this.startTrack(T.chain, { at: T.nextTime, dest: T.dest, as: T.as, key: T.keyShift }); if (nt && this.zone === T) this.zone = nt; }
            if (this.zone === T) this.zone = null;
            break;
          }
          this.scheduleStep(T, T.step, T.nextTime);
          T.step++; T.nextTime = T.t0 + T.step * T.stepDur;
        }
      }
      if (cur > T.removeAt) { this.dropTrack(T); this.tracks.splice(i, 1); i--; }
    }
    const ms = now() - t0, st = this.stats;
    st.ticks++; st.tickMs += (ms - st.tickMs) * 0.05; if (ms > st.tickMax) st.tickMax = ms;
    let mvN = 0; for (const v of this.mv) if (v.end > cur) mvN++;
    let svN = 0; for (const v of this.sv) if (v.end > cur) svN++;
    st.musicVoices = mvN; st.sfxVoices = svN; st.timbres = Object.keys(TIMBRES).length;
  };
  // ---------------------------------------------------------------- ducking (zone tracks only)
  EP.setDuck = function (reason, on) {
    if (on) this.ducks[reason] = true; else delete this.ducks[reason];
    let db = 0; for (const k in this.ducks) db = Math.min(db, DUCK[k] !== undefined ? DUCK[k] : -9);
    if (db === this.duckDb) return;
    const down = db < this.duckDb, t = this.ctx.currentTime, g = Math.pow(10, db / 20);
    for (const n of [this.duckN.dry, this.duckN.del, ...this.duckN.rev]) { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(g, t, down ? 0.1 / 3 : 0.6 / 3); }
    this.duckDb = db;
  };
  // ---------------------------------------------------------------- sfx
  EP.makeSfxVoice = function () {
    const c = this.ctx, v = { out: c.createGain(), pan: c.createStereoPanner ? c.createStereoPanner() : null, bus: null, end: 0, start: 0, prio: 0, id: null, srcs: [] };
    if (v.pan) v.out.connect(v.pan);
    return v;
  };
  EP.routeSfx = function (v, busName) {
    if (v.bus === busName) return;
    const tail = v.pan || v.out; try { tail.disconnect(); } catch (e) { /* ignore */ }
    tail.connect(this.bus[busName] || this.bus.sfx); v.bus = busName;
  };
  EP.allocSfx = function (id, prio, t) {
    const cur = this.ctx.currentTime, mine = this.sv.filter(v => v.end > cur && v.id === id);
    if (mine.length >= this.cfg.perId) return mine.reduce((a, b) => (a.start <= b.start ? a : b));
    let free = null, victim = null;
    for (const v of this.sv) {
      if (v.end <= cur) { free = v; break; }
      if (v.prio <= prio && (!victim || v.prio < victim.prio || (v.prio === victim.prio && v.start < victim.start))) victim = v;
    }
    return free || victim;
  };
  // pos: { pan, gain }. Returns true when voiced.
  EP.playSfx = function (id, o) {
    const R = SFX_RECIPES[id]; if (!R) return false;
    o = o || {};
    const ctx = this.ctx, cur = ctx.currentTime, t = cur + 0.005 + (o.at || 0), warn = /^warn_/.test(id);
    // the same id at most 6x per second (telegraph cues are never dropped)
    const times = this.sfxTimes[id] || (this.sfxTimes[id] = []);
    while (times.length && times[0] < cur - 1) times.shift();
    if (!warn && times.length >= this.cfg.perSec) return false;
    const prio = R.prio || 0, v = this.allocSfx(id, prio, t); if (!v) return false;
    times.push(cur);
    if (v.end > cur) {   // steal: quick fade, stop its sources
      v.out.gain.cancelScheduledValues(cur); v.out.gain.setTargetAtTime(0, cur, 0.004);
      for (const s of v.srcs) stopSrc(s, t + 0.015);
    }
    const ts = v.end > cur ? t + 0.016 : t;
    v.srcs = []; v.id = id; v.prio = prio; v.start = cur;
    this.routeSfx(v, R.bus || 'sfx');
    v.out.gain.cancelScheduledValues(ts); v.out.gain.setValueAtTime((o.gain !== undefined ? o.gain : 1), ts);
    if (v.pan) { v.pan.pan.cancelScheduledValues(ts); v.pan.pan.setValueAtTime(Math.max(-1, Math.min(1, o.pan || 0)), ts); }
    // pitch: +-vary random (none on UI), hit / damage sounds rotate 3 variants
    let rate = 1, fk = 1;
    if (R.vary && R.bus !== 'ui') rate *= 1 + (Math.random() * 2 - 1) * R.vary;
    if (/^(hit|dmg_)/.test(id)) { const k = this.variant[id] = ((this.variant[id] || 0) + 1) % 3; rate *= [1, 1.045, 0.955][k]; fk = [1, 1.15, 0.87][k]; }
    let end = ts;
    for (const Ly of R.layers) {
      const st = ts + Math.min(Ly.delay || 0, this.cfg.maxSfx - 0.05), dur = Math.max(0.002, Math.min(Ly.dur, this.cfg.maxSfx - (st - ts)));
      const env = ctx.createGain(), peak = Ly.gain || 0.05, f0 = Ly.f0 * rate, f1 = Math.max(20, (Ly.f1 || Ly.f0) * rate);
      env.gain.setValueAtTime(0, st); env.gain.linearRampToValueAtTime(peak, st + Math.min(0.002, dur * 0.5));
      env.gain.exponentialRampToValueAtTime(0.0001, st + dur); env.gain.setValueAtTime(0, st + dur + 0.001);
      let src, head;
      if (Ly.osc === 'noise') {
        src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
        const fl = ctx.createBiquadFilter(), F = Ly.filter || {};
        fl.type = F.type || 'bandpass'; fl.Q.value = F.q || 1;
        fl.frequency.setValueAtTime(Math.max(40, f0 * fk), st); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1 * fk), st + dur);
        src.connect(fl); head = fl;
        startSrc(src, st, Math.random() * 1.5);
      } else {
        src = ctx.createOscillator(); src.type = OSC[Ly.osc] || 'sine';
        src.frequency.setValueAtTime(Math.max(20, f0), st); if (f1 !== f0) src.frequency.exponentialRampToValueAtTime(f1, st + dur);
        head = src;
        if (Ly.filter) { const fl = ctx.createBiquadFilter(); fl.type = Ly.filter.type; fl.frequency.value = Ly.filter.freq * fk; fl.Q.value = Ly.filter.q || 0.7; src.connect(fl); head = fl; }
        startSrc(src, st);
      }
      head.connect(env); env.connect(v.out);
      stopSrc(src, st + dur + 0.02); v.srcs.push(src);
      end = Math.max(end, st + dur + 0.03);
    }
    v.end = end; this.stats.sfx++;
    return true;
  };
  // ---------------------------------------------------------------- settings
  EP.mix = function (m) {
    const t = this.ctx.currentTime, set = (p, v) => { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, 0.03); };
    set(this.master.gain, m.muted ? 0 : m.master);
    set(this.bus.music.gain, MUSIC_GAIN * m.music / 0.75);
    set(this.bus.sfx.gain, m.sfx / 0.75); set(this.bus.ui.gain, m.ui / 0.75); set(this.bus.ambient.gain, m.ambient / 0.75);
    if (m.mono !== this.mono) { this.mono = m.mono; try { this.out.channelCount = m.mono ? 1 : 2; this.out.channelCountMode = m.mono ? 'explicit' : 'max'; this.out.channelInterpretation = 'speakers'; } catch (e) { /* old engines */ } }
    if (m.reduceBass !== this.bass) { this.bass = m.reduceBass; set(this.shelf.gain, m.reduceBass ? -12 : 0); }
  };

  // ==================================================================== the live singleton + director
  let AC = null, E = null, timer = null;
  const D = {                       // director state (works before any context exists)
    want: null, forced: null, phase: 0, intensity: 'calm', lastWarn: null, warnHandled: null, bossPhase: -1, bossId: null,
    victoryUntil: 0, bossDown: null, transitionTo: null, mapId: null, wasTitle: false, overlay: null, overlayId: null,
    over: {}, muteOverride: { mono: null, bass: null }, aggroT: 0, scanT: 0, fishing: false,
  };
  const captions = [];
  function mixFromSettings() {
    const s = S(), g = gG(), num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    const sfx = num(s.sfx, 0.75);
    return {
      master: num(s.master, 1), music: num(s.music, 0.75), sfx, ui: num(s.ui, sfx), ambient: num(s.ambient, sfx),
      muted: !!(s.muted || (g && g.muted)),
      mono: D.muteOverride.mono !== null ? D.muteOverride.mono : !!s.mono,
      reduceBass: D.muteOverride.bass !== null ? D.muteOverride.bass : !!s.reduceBass,
    };
  }
  let lastMixKey = '';
  function applySettings() {
    if (!E) return;
    const m = mixFromSettings(), k = JSON.stringify(m);
    if (k === lastMixKey) return; lastMixKey = k; E.mix(m);
  }
  function startTimer() {
    if (timer || typeof setInterval !== 'function') return;
    timer = setInterval(() => { if (!E || !AC || AC.state !== 'running') return; try { reconcile(); E.tick(); } catch (e) { if (typeof console !== 'undefined') console.warn('audio tick', e); } }, CFG.tickMs);
  }
  function unlock() {
    if (!ACtor) return false;
    try {
      if (!AC) {
        try { AC = new ACtor({ latencyHint: 'interactive' }); } catch (e) { AC = new ACtor(); }
        refreshHas();
        E = new Engine(AC, {}); lastMixKey = ''; applySettings(); startTimer();
        timbres(AC.sampleRate);
      }
      if (AC.state !== 'running' && AC.resume && !(typeof document !== 'undefined' && document.hidden === true)) { const p = AC.resume(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { AC = null; E = null; return false; }
    if (AC.state === 'running') removeGestures();
    D.scanT = 0; const g = gG(); if (g) D.want = desiredSong(g);   // a title click may already have started play
    return true;
  }
  const GESTURES = ['pointerdown', 'keydown', 'touchend', 'mousedown'];
  let gestureOn = false;
  const onGesture = () => { unlock(); };
  function addGestures() { if (gestureOn || !W || typeof W.addEventListener !== 'function') return; gestureOn = true; for (const ev of GESTURES) W.addEventListener(ev, onGesture, true); }
  function removeGestures() { if (!gestureOn || !W) return; gestureOn = false; for (const ev of GESTURES) W.removeEventListener(ev, onGesture, true); }
  addGestures();
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (!AC) return;
      try {
        if (document.hidden === true) { if (AC.state === 'running' && AC.suspend) AC.suspend(); }
        else if (AC.state !== 'running' && AC.resume) { const p = AC.resume(); if (p && p.then) p.then(() => { if (AC.state !== 'running') addGestures(); }, () => addGestures()); }
      } catch (e) { /* ignore */ }
    });
  }
  if (typeof onSettingsChange === 'function') onSettingsChange(() => applySettings());
  // boot-time render of the hard timbres (no gesture needed for an OfflineAudioContext)
  if (OACtor && typeof setTimeout === 'function') setTimeout(() => { try { timbres(44100); } catch (e) { /* oscillators stand in */ } }, 0);

  // --- decide what should be playing (pure reads of G)
  function bossAlive(g) { return g && g.boss && !g.boss.dead && g.boss.hp > 0 ? g.boss : null; }
  function desiredSong(g) {
    if (D.forced) return D.forced;
    if (!g) return null;
    if (g.state === 'title') return 'title';
    if (D.victoryUntil && (E ? E.ctx.currentTime : 0) < D.victoryUntil) return null;
    const b = bossAlive(g);
    if (b) return BOSS_MUSIC[b.type] || 'boss_bramblehorn';
    const id = D.transitionTo || (g.map && g.map.id);
    if (id === D.bossDown && MAP_MUSIC[id] && /^boss_/.test(MAP_MUSIC[id])) return 'pinewood';   // the court after the fight
    if (MAP_MUSIC[id]) return MAP_MUSIC[id];
    const th = g.world && g.world.maps && g.world.maps[id] && g.world.maps[id].theme;
    return THEME_MUSIC[th] || null;
  }
  function stemIndex(g) {
    const b = bossAlive(g); if (!b) return 0;
    const ph = b.bk ? b.bk.phase : (b.phaseN || 0), aggro = ph > 0 || b.hp < b.maxHp || b.state !== 'chase' || dist2(b, g.player) < 144;
    let idx = aggro ? 1 : 0;
    if (ph >= 1) idx = 2;
    if (ph >= 2 || b.hp / b.maxHp < 0.2) idx = 3;   // stem D: phase 3 / enrage
    return idx;
  }
  const dist2 = (a, b) => (a && b ? (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) : 1e9);
  function combatState(g) {
    if (!g || g.state !== 'play' || !g.enemies) return 'calm';
    let n = 0, elite = false;
    for (const e of g.enemies) {
      if (e.dead || e.asleep || e.dummy || e.critter) continue;
      if (dist2(e, g.player) < 100) { n++; if (e.elite || (e.mods && e.mods.length)) elite = true; }
    }
    return n === 0 ? 'calm' : (n > 3 || elite) ? 'big' : 'combat';
  }
  // apply the director's wishes to the engine (runs in the tick; cheap when nothing changed)
  function reconcile() {
    if (!E || !HAS.MUSIC) return;
    const ctx = E.ctx, cur = ctx.currentTime, want = D.want, Z = E.zone;
    if ((Z ? Z.as : null) !== want) {
      if (!want) { if (Z) E.stopTrack(Z, cur, cur + Z.barDur); }
      else if (MUSIC[want]) {
        const boss = /^boss_/.test(want);
        if (!Z) {
          if (want === 'title' && !D.wasTitle && MUSIC.lullaby) { D.wasTitle = true; E.startTrack('lullaby', { as: 'title', chain: 'title', loop: false, at: cur + 0.05 }); }
          else E.startTrack(want, { at: cur + 0.05, phase: D.phase, intensity: D.intensity, fadeIn: 0.4 });
        } else if (boss) {   // hard cut on the beat + phase stinger
          const tb = E.nextBeat(Z, 0.04);
          E.stopTrack(Z, tb, tb + 0.03);
          E.setVerb(SONG_VERB[want] || 'bright', E.verbSlot = (E.verbSlot + 1) % E.verbs.length);
          E.startTrack(want, { at: tb, phase: D.phase });
          if (bossAlive(gG())) playStinger('phase', tb);   // arriving in the court before the boss: just the cut
        } else {             // fade over 1 bar; the new song starts on its bar 1 at the next bar line
          const tb = E.nextBar(Z, 0.05);
          E.stopTrack(Z, cur, Math.max(tb, cur + Z.barDur * 0.5));
          E.setVerb(SONG_VERB[want] || 'bright', E.verbSlot = (E.verbSlot + 1) % E.verbs.length);
          E.startTrack(want, { at: tb, phase: D.phase, intensity: D.intensity, fadeIn: 0.25 });
        }
        D.applied = { phase: D.phase, intensity: D.intensity };
      }
      return;
    }
    if (!Z) return;
    const A = D.applied || (D.applied = {});
    if (Z.song.stems && A.phase !== D.phase) {
      const up = D.phase > (A.phase || 0); A.phase = D.phase;
      E.setLevels(Z, stemLevels(Z.song, D.phase), 1);
      if (up && D.phase >= 2) playStinger('phase', E.nextBeat(Z));
    }
    if (!Z.song.stems && Z.song.intensity && A.intensity !== D.intensity) {
      const fb = D.intensity === 'calm' ? 2 : 1; A.intensity = D.intensity;
      E.setLevels(Z, intensityLevels(Z.song, D.intensity), fb);
    }
  }
  function playStinger(name, at) {
    if (!E || !HAS.MUSIC) return;
    const id = STINGERS[name] || name, song = MUSIC[id]; if (!song) return;
    const Z = E.zone, key = Z ? MUSIC_UTIL.keyOffset(song.key, Z.song.key) : 0;
    const t = at !== undefined ? at : Z ? E.nextBeat(Z) : E.ctx.currentTime + 0.03;
    E.startTrack(id, { dest: 'ui', at: t, key, loop: false });
  }
  function frame(dt) {
    const t0 = now(), g = gG();
    if (g) {
      // telegraphs: never silent. bosses.js records G.lastWarn and calls sfx(warn); a move with no cue gets a fallback.
      if (g.lastWarn && g.lastWarn !== D.lastWarn) {
        D.lastWarn = g.lastWarn;
        if (D.warnHandled !== g.lastWarn) {
          const fb = (typeof WARN_SFX !== 'undefined' && (WARN_SFX[g.lastWarn.type] || WARN_SFX.unblockable)) || 'warn_unblockable';
          sfx(fb, bossAlive(g) || null);
          D.warnHandled = g.lastWarn;
        }
      }
      D.scanT -= dt;
      if (D.scanT <= 0) {   // 4x per second is plenty for music decisions
        D.scanT = 0.25;
        const mapId = g.map && g.map.id;
        if (mapId !== D.mapId) { D.mapId = mapId; D.transitionTo = null; if (D.bossDown && D.bossDown !== mapId) D.bossDown = null; }
        D.want = desiredSong(g);
        D.phase = stemIndex(g);
        const cs = combatState(g);
        if (cs !== 'calm') { D.aggroT = 0; D.intensity = cs; }
        else if (D.intensity !== 'calm') { D.aggroT += 0.25; if (D.aggroT >= 1) D.intensity = 'calm'; }   // brief gap before the 2-bar decay
        if (E) {
          E.setDuck('dialogue', !!(g.talk && g.talk.length));
          E.setDuck('death', g.state === 'dead');
          E.setDuck('fishing', !!g.fishing);
          overlays(g);
          applySettings();
        }
      }
    }
    if (AC && AC.state !== 'running' && !gestureOn && !(typeof document !== 'undefined' && document.hidden === true)) addGestures();   // iOS 'interrupted'
    const st = E ? E.stats : null;
    if (st) { const ms = now() - t0; st.frameMs += (ms - st.frameMs) * 0.05; }
    for (let i = captions.length - 1; i >= 0; i--) { captions[i].t -= dt; if (captions[i].t <= 0) captions.splice(i, 1); }
  }
  // death and fishing music play over the ducked zone song on the music bus
  function overlays(g) {
    const want = g.state === 'dead' ? 'death' : g.fishing ? 'fishing' : null;
    if (want === D.overlayId) return;
    const cur = E.ctx.currentTime;
    // the death motif (one voice, loop:false) rings out with its reverb tail under the returning zone song
    if (D.overlay && E.tracks.includes(D.overlay) && D.overlayId !== 'death') E.stopTrack(D.overlay, cur, cur + 1.2);
    D.overlay = null; D.overlayId = want;
    if (want && MUSIC[want]) D.overlay = E.startTrack(want, { dest: 'music', at: cur + 0.08, loop: want !== 'death' });
    if (D.overlay && E.zone === D.overlay) E.zone = null;
  }
  // spatial: pan = (screenX / 480 - 0.5) * 0.8, attenuation = (1 - clamp(dist / 14))^2, off-screen -12 dB
  function spatial(pos, warn) {
    const g = gG(); if (!pos || !g || !g.cam || typeof isoX !== 'function') return { pan: 0, gain: 1 };
    const sx = isoX(pos.x, pos.y) - g.cam.x + 240, sy = isoY(pos.x, pos.y, pos.z || 0) - g.cam.y + 135;
    const p = g.player, d = p ? Math.sqrt(dist2(pos, p)) : 0;
    let gain = Math.pow(1 - clamp01(d / 14), 2);
    const off = sx < 0 || sx > 480 || sy < 0 || sy > 270;
    if (off) gain *= 0.25;
    if (warn) gain = Math.max(gain, 0.6);   // telegraph cues are never silent
    return { pan: Math.max(-0.8, Math.min(0.8, (sx / 480 - 0.5) * 0.8)), gain };
  }
  function caption(text) {
    if (!text || !S().captions) return;
    const c = captions.find(q => q.s === text);
    if (c) { c.t = 2.5; c.n++; return; }
    captions.push({ s: text, t: 2.5, n: 1 }); if (captions.length > 4) captions.shift();
  }
  function sfx(id, pos, opts) {
    if (!HAS.SFX) refreshHas();
    if (!HAS.SFX || !id) return false;
    let rid = id;
    if (/^drop\d+$/.test(id) && !SFX_RECIPES[id]) rid = 'drop5';
    if (!SFX_RECIPES[rid]) return false;
    const g = gG(), warn = /^warn_/.test(rid);
    if (warn && g && g.lastWarn && g.lastWarn.sfx === id) D.warnHandled = g.lastWarn;
    // no position given: telegraphs sit on the boss, enemy actions on the acting enemy (PART_SRC); the hero's own
    // feedback (hurt, death) stays centred at full level even when an enemy part caused it
    const own = rid === 'hurt' || (rid === 'die' && g && g.player && g.player.dead);
    if (!pos && !own) pos = warn ? bossAlive(g) : (typeof PART_SRC !== 'undefined' && PART_SRC !== (g && g.player) && PART_SRC) || null;
    if (typeof SFX_CAPTIONS !== 'undefined') caption(SFX_CAPTIONS[rid]);
    // musical extras: level-up / legendary / mythic / discovery stingers
    if (rid === 'levelup') playStinger('levelup');
    else if (rid === 'drop4') { sfx('legendary_choir'); playStinger('legendary'); }
    else if (rid === 'drop5') { sfx('mythic_swell'); playStinger('legendary'); }
    else if (rid === 'codex') playStinger('discovery');
    if (!E || !AC || AC.state !== 'running') return false;   // silent until unlocked (no pile-up on resume)
    const sp = spatial(pos, warn), o = Object.assign({ pan: sp.pan, gain: sp.gain }, opts || {});
    if (opts && opts.gain !== undefined) o.gain = sp.gain * opts.gain;
    if (rid === 'drop5' && !(opts && opts.at)) o.at = 0.6;   // the reverse swell comes before the chime
    if (o.gain <= 0.0005) return false;
    return E.playSfx(rid, o);
  }
  function drawCaptions(ctx) {
    if (!captions.length || !S().captions || typeof UI === 'undefined' || !UI.text) return;
    const px = typeof textPx === 'function' ? textPx() : 18, size = px <= 14 ? 'small' : 'body', lh = px <= 14 ? 18 : px >= 22 ? 26 : 22;
    let y = 400 - (captions.length - 1) * lh;   // stacked upward, clear of the portrait / HP block
    for (const c of captions) {
      const s = c.s + (c.n > 1 ? ' x' + c.n : ''), a = Math.min(1, c.t * 2), w = (UI.measure ? UI.measure(s, size) : s.length * 8) + 16;
      ctx.globalAlpha = 0.55 * a; ctx.fillStyle = '#0a0614'; ctx.fillRect(16, y - 4, w, lh); ctx.globalAlpha = 1;
      UI.text(ctx, s, 24, y, size, '#f4ecff', 'left', { alpha: a });
      y += lh;
    }
  }

  // ==================================================================== offline rendering (tests, tools)
  function bufferStats(buf, from, to) {
    let sum = 0, peak = 0, peakIn = 0, n = 0, bad = 0; const sr = buf.sampleRate, a = Math.floor((from || 0) * sr), b = Math.min(buf.length, Math.floor((to || buf.duration) * sr));
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < buf.length; i++) { const v = d[i]; if (!isFinite(v)) { bad++; continue; } const x = Math.abs(v); if (x > peak) peak = x; if (i >= a && i < b) { sum += v * v; n++; if (x > peakIn) peakIn = x; } }
    }
    const rms = Math.sqrt(sum / Math.max(n, 1));
    return { rms, peak, peakIn, rmsDb: 20 * Math.log10(rms || 1e-9), peakDb: 20 * Math.log10(peak || 1e-9), bad, seconds: buf.duration };
  }
  // drive an offline engine with the LIVE tick: suspend every `step` s, run tick + any scripted events, resume
  function drive(ctx, Eo, seconds, events, step) {
    step = step || 0.1;
    const evs = (events || []).slice().sort((a, b) => a.t - b.t);
    const at = (t) => ctx.suspend(t).then(() => {
      while (evs.length && evs[0].t <= t + 1e-9) { const e = evs.shift(); try { e.fn(Eo); } catch (err) { if (typeof console !== 'undefined') console.error(err); } }
      Eo.tick(step * 1.6);
      ctx.resume();
    });
    const q = 128 / ctx.sampleRate;   // suspend times are quantised to render quanta
    while (evs.length && evs[0].t <= 0) evs.shift().fn(Eo);
    Eo.tick(step * 1.6);
    for (let t = step; t < seconds - 4 * q; t += step) at(Math.round(t / q) * q).catch(() => { /* past the end */ });
    return renderCtx(ctx);
  }
  async function renderMusic(id, o) {
    o = o || {}; refreshHas();
    await timbres(o.sampleRate);
    const song = MUSIC[id], sr = o.sampleRate || 32000, plan = planOf(id), stepDur = MUSIC_UTIL.stepSeconds(song);
    const bars = Math.min(o.bars || song.bars, song.bars * 4), body = bars * plan.n * stepDur, tail = o.tail === undefined ? 3 : o.tail, lead = 0.05;
    const len = (o.seconds || lead + body + tail);
    const ctx = new OACtor(2, Math.ceil(len * sr), sr), Eo = new Engine(ctx, { offline: true, cfg: o.cfg });
    Eo.mix({ master: 1, music: 0.75, sfx: 0.75, ui: 0.75, ambient: 0.75, muted: false, mono: !!o.mono, reduceBass: !!o.reduceBass });
    if (SONG_VERB[id]) Eo.setVerb(SONG_VERB[id], 0);
    const key = o.key ? MUSIC_UTIL.keyOffset(song.key, o.key) : 0;
    const kind = song.kind, dest = o.dest || (kind === 'stinger' ? 'ui' : 'zone');
    const events = [{ t: 0, fn: (en) => { en.startTrack(id, { at: lead, phase: o.phase || 0, intensity: o.intensity || 'calm', key, dest, bars: o.bars || undefined, loop: o.bars ? true : undefined }); } }].concat(o.events || []);
    const buf = await drive(ctx, Eo, len, events);
    buf.bodySeconds = lead + body; buf.engineStats = Object.assign({}, Eo.stats);
    return buf;
  }
  async function renderSfx(id, o) {
    o = o || {}; refreshHas();
    const sr = o.sampleRate || 32000, R = SFX_RECIPES[id];
    const dur = R ? Math.min(CFG.maxSfx, Math.max(...R.layers.map(l => (l.delay || 0) + l.dur))) : 0.1;
    const ctx = new OACtor(2, Math.ceil((dur + 0.3) * sr), sr), Eo = new Engine(ctx, { offline: true });
    Eo.mix({ master: 1, music: 0.75, sfx: 0.75, ui: 0.75, ambient: 0.75, muted: false, mono: false, reduceBass: false });
    Eo.playSfx(id, { pan: o.pan || 0, gain: 1 });
    const buf = await renderCtx(ctx);
    buf.bodySeconds = dur + 0.01;
    return buf;
  }

  // ==================================================================== public
  return {
    cfg: CFG, Engine, MAP_MUSIC, STINGERS,
    get stats() { return E ? E.stats : { tickMs: 0, tickMax: 0, frameMs: 0, ticks: 0, notes: 0, sfx: 0, musicVoices: 0, sfxVoices: 0, timbres: Object.keys(TIMBRES).length }; },
    get engine() { return E; },
    get ctx() { return AC; },
    unlock, sfx, frame, caption, drawCaptions, applySettings, timbres, renderMusic, renderSfx, bufferStats,
    state: () => (AC ? AC.state : 'none'),
    current: () => (E && E.zone ? E.zone.as : null),
    wanted: () => D.want,
    director: () => ({ want: D.want, phase: D.phase, intensity: D.intensity, ducks: E ? Object.keys(E.ducks) : [], duckDb: E ? E.duckDb : 0, overlay: D.overlayId, zone: E && E.zone ? E.zone.id : null }),
    onTransition(to) { D.transitionTo = to || null; const g = gG(); if (g) D.want = desiredSong(g); },
    onBossKilled(e) {
      const g = gG(); D.bossDown = g && g.map ? g.map.id : null;
      if (E) { D.victoryUntil = E.ctx.currentTime + 3.6; playStinger('victory'); if (E.zone) { const c = E.ctx.currentTime; E.stopTrack(E.zone, c, c + 1.2); } }
      caption((typeof SFX_CAPTIONS !== 'undefined' && SFX_CAPTIONS.victory) || '[victory]');
      if (g) D.want = null;
    },
    stinger: (name) => playStinger(name),
    music(id) { D.forced = id || null; const g = gG(); D.want = desiredSong(g) || D.forced; },
    setLayer(name, level, fadeBars) { if (E && E.zone) E.setLayer(E.zone, name, level, fadeBars); },
    duck(reason, on) { if (E) E.setDuck(reason, on); },
    setMono(on) { D.muteOverride.mono = !!on; lastMixKey = ''; applySettings(); },
    setReduceBass(on) { D.muteOverride.bass = !!on; lastMixKey = ''; applySettings(); },
    captions: () => captions.map(c => c.s),
  };
})();
