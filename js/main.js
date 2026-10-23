'use strict';
// ---------------------------------------------------------------------------
// Boot, main loop, input and map transitions.
// ---------------------------------------------------------------------------
const DISP = document.getElementById('game');
const dctx = DISP.getContext('2d');
// HUD at min(devicePixelRatio, 2) (§16.6.6): the backing store is DW*k x DH*k and every draw keeps using the
// 960x540 coordinate space through one transform; the scene stays 480x270 and is scaled up into it.
// Phones (maps.js PHONE) start at k = 0.5 x DPR (>= 1; §26.4 step 3, capped DPR) and the governor below moves it: the browser
// upscales the store with smoothing off (index.html image-rendering), and the per-frame scene blit + HUD fill fewer pixels.
let HUD_K = 1;
const HUD_K_MAX = 2;
// ===== resolution governor (phones; Lumina ResolutionGovernor rules, docs/CREDITS.md; docs/design/pillars-and-rules.md step 3) ====================
// The phone backing store runs at a DPR rung (GOV.rungs: 0.5 .. 1.0 of the device ratio, 0.125 steps; k = rung x DPR, whole
// eighths, 1..2). Timing source: the CPU frame time of loop() (update + render; no GPU timer in Canvas 2D), averaged per 0.5 s
// sample; decisions on the median of the last 5 samples (one slow burst is no trend). Down one rung after 4 slow medians
// (> GOV.slow ms), up after 20 fast ones (< GOV.fast ms), never twice within 3 s (cooldown, then fresh samples). Below the
// lowest rung the next step down is the 'low' quality tier (render.js QUALITY), and the first step up leaves it. It replaces the
// old EMA tier switch, which flapped. Desktop never runs it; ?quality=... pins the tier and turns it off.
const GOV = { on: PHONE && !QUALITY.pinned, rungs: [0.5, 0.625, 0.75, 0.875, 1], ri: 0, slow: 14, fast: 9, acc: 0, n: 0, timer: 0, cooldown: 2, samples: [], sorted: [], nSlow: 0, nFast: 0, med: 0 };
function governorStep(work, dt) {
  const G2 = GOV; if (!G2.on) return;
  G2.acc += work; G2.n++; G2.cooldown -= dt; G2.timer += dt;
  if (G2.timer < 0.5) return;
  const ms = G2.acc / Math.max(1, G2.n); G2.acc = 0; G2.n = 0; G2.timer = 0;
  const S = G2.samples; S.push(ms); if (S.length > 5) S.shift();
  if (S.length < 3) return;
  const so = G2.sorted; so.length = 0; for (const v of S) so.push(v); so.sort((a, b) => a - b);
  G2.med = so[so.length >> 1];
  G2.nSlow = G2.med > G2.slow ? G2.nSlow + 1 : 0; G2.nFast = G2.med < G2.fast ? G2.nFast + 1 : 0;
  if (G2.cooldown > 0) return;
  if (G2.nSlow >= 4) {
    if (G2.ri > 0) { G2.ri--; fit(); } else if (QUALITY.tier !== 'low') setQuality('low'); else return;
    governorSettle();
  } else if (G2.nFast >= 20) {
    if (QUALITY.tier === 'low') setQuality('phone'); else if (G2.ri < G2.rungs.length - 1) { G2.ri++; fit(); } else return;
    governorSettle();
  }
}
function governorSettle() { GOV.cooldown = 3; GOV.nSlow = GOV.nFast = 0; GOV.samples.length = 0; }
function fit() {
  const s = Math.min(window.innerWidth / DW, window.innerHeight / DH);
  DISP.style.width = Math.floor(DW * s) + 'px';
  DISP.style.height = Math.floor(DH * s) + 'px';
  const dpr = window.devicePixelRatio || 1;
  const k = PHONE ? clamp(Math.round(dpr * GOV.rungs[GOV.ri] * 8) / 8, 1, HUD_K_MAX) : Math.min(HUD_K_MAX, Math.max(1, dpr));
  if (k !== HUD_K || DISP.width !== DW * k) { HUD_K = k; DISP.width = DW * k; DISP.height = DH * k; }
  dctx.setTransform(HUD_K, 0, 0, HUD_K, 0, 0); dctx.imageSmoothingEnabled = false;
  // R3 #2: a touch device held upright gets the "rotate to play" card (screens.js drawRotateCard) instead of a 40 % letterbox
  G.portrait = !!(TOUCH_CAPABLE && window.innerHeight > window.innerWidth && !(window.matchMedia && matchMedia('(hover: hover)').matches && !matchMedia('(pointer: coarse)').matches));
}
window.addEventListener('resize', fit); fit();
IN.init(DISP);
initTouch();

const PARAMS = new URLSearchParams(location.search);

function getMap(id) {
  if (!G.maps[id]) G.maps[id] = buildMapFromData(id, G.world.maps[id]);
  return G.maps[id];
}
// `at` = { x, y } to arrive somewhere other than the map start (a checkpoint)
function enterMap(id, at) {
  if (G.player && typeof hushEnd === 'function') hushEnd(G.player, 'map');   // a map change ends Hush
  G.timeScale = 1;
  const m = getMap(id), p = G.player;
  G.map = m; prepTheme(m);
  for (const pt of m.portals) pt.open = (G.world.maps[id].portals.find(q => q.x === pt.x && q.y === pt.y) || pt).open !== false;
  G.enemies = []; G.projs = []; G.effects = []; G.zones = []; G.parts = []; G.texts = []; G.delays = []; G.amb = []; G.drops = [];
  G.boss = null; G.tablet = null;
  if (typeof resetCorpses === 'function') resetCorpses();   // R1 corpse records (pooled) and the hitlag clock
  if (typeof hitlagReset === 'function') hitlagReset();
  p.x = at ? at.x : m.start.x; p.y = at ? at.y : m.start.y; p.z = tileH(m, p.x, p.y); p.dash = null; p.climb = null; p.fall = null; G.vantage = null; G.camBias = null;
  syncChests(m);
  G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
  if (!(typeof onceSeen === 'function' && onceSeen('zone:' + id))) G.banner = { s: m.name, sub: m.sub, t: 3.2, max: 3.2 };   // once per save: a respawn never replays it
  if (typeof forgeEnemyPrewarm === 'function') forgeEnemyPrewarm(id);   // M4a: boot / respawn / editor entries (the rift starts it in transition)
  startTriggers();
  spawnCritters(m);
  if (G.state === 'play') saveGame();   // autosave on zone entry
}
// ===== map preload (perf, QA: a 950 ms frame on the rift into Pinewood) ==========================================
// transition() starts it; loop() gives it what is left of a PRELOAD_FRAME ms frame after update + render (at most
// PRELOAD_MS) during the fade-in. The work is a time-sliced generator: the map record (buildMapStages, groundPrep a row
// at a time), the theme backdrop (normally prebuilt at boot), the low-res ground preview, the spatial / collider /
// trigger grids, the minimap, then the chunk under the arrival camera. The fade holds at its peak until it is done
// (at most PRELOAD_HOLD s), so enterMap finds everything cached. Anything not preloaded still builds synchronously in
// enterMap (boot, the editor, tests).
let PRELOAD = null;
const PRELOAD_MS = 16, PRELOAD_FRAME = 34, PRELOAD_HOLD = 2;
function startPreload(id, at) { PRELOAD = G.world.maps[id] ? { id, at, gen: null, left: () => 0 } : null; }
function* preloadGen(P) {
  if (!G.maps[P.id]) { const g = buildMapStages(P.id, G.world.maps[P.id]); let r; while (!(r = g.next()).done) yield; G.maps[P.id] = r.value; }
  const m = G.maps[P.id];
  while (!prepThemeStep(m)) yield;
  yield* groundPreviewGen(m); yield;   // the stand-in drawn for chunks still building
  gridOf(m); yield; colliderGrid(m); triggerBuckets(m); yield;
  if (typeof miniBuild === 'function' && !m.mini) { miniBuild(m); yield; }
  const x = P.at ? P.at.x : m.start.x, y = P.at ? P.at.y : m.start.y, idx = chunkAt(m, isoX(x, y), isoY(x, y, tileH(m, x, y)) - 12);
  if (!chunkGrid(m).empty[idx]) while (!buildChunkStep(m, idx, Math.max(1, P.left()))) yield;   // the other visible chunks stream in behind the fade-out
}
function preloadStep(budget = PRELOAD_MS) {
  const P = PRELOAD; if (!P) return true;
  const t0 = performance.now(); P.left = () => budget - (performance.now() - t0);
  P.gen = P.gen || preloadGen(P);
  while (P.left() > 0) if (P.gen.next().done) { PRELOAD = null; return true; }
  return false;
}
// the death screen's spare frame time rasters the chunk the respawn camera lands on (no sync build after respawn)
function prebuildRespawn(ms) {
  const cp = G.checkpoint, m = cp && G.maps[cp.map] ? G.maps[cp.map] : G.map; if (!m || !m.cg) return;
  const x = cp && G.maps[cp.map] ? cp.x : m.start.x, y = cp && G.maps[cp.map] ? cp.y : m.start.y, idx = chunkAt(m, isoX(x, y), isoY(x, y, tileH(m, x, y)) - 12);
  if (!m.cg.empty[idx] && !chunkResident(m, idx)) buildChunkStep(m, idx, ms);
}
function transition(to, at) {
  if (G.fadeDir) return;
  G.fadeDir = 1; G.fadeTo = to; G.fadeAt = at || null; sfx('portal');
  startPreload(to, at); G.fadeHold = 0; G.preloadLog = null;
  if (typeof forgeEnemyPrewarm === 'function') forgeEnemyPrewarm(to);   // M4a: the zone's forge enemy sheets build behind the fade (render.js)
  if (typeof AUDIO !== 'undefined') AUDIO.onTransition(to);   // the zone song fades over 1 bar during the rift fade
}
// death: lose 10% of this level's bar (never a level), wake at the last checkpoint (or this map's start) with
// full HP and potions; settled triggers survive, so only the encounter you died in resets
const deathXpLoss = p => Math.min(Math.floor(p.xp), Math.round(xpToNext(p.level) * 0.1));
function respawn() {
  const p = G.player;
  p.xp -= deathXpLoss(p);
  p.dead = false; p.buffs = {}; p.cds = {}; p.cast = null; p.ult = 0; recalcStats(p, true); p.potions = p.maxPotions || MAX_POTIONS;
  G.state = 'play';
  const cp = G.checkpoint && G.world.maps[G.checkpoint.map] ? G.checkpoint : null;
  enterMap(cp ? cp.map : G.map.id, cp);
  if (PARAMS.get('scene') === 'boss') skipToBoss();
}

// ===== update =========================================================================
function update(dt, rdt) {
  G.t += rdt;
  if (G.state === 'play') G.stats.playtime += rdt;
  IN.update(rdt);
  handleInput();
  const p = G.player, m = G.map;
  if (G.banner) G.banner.t -= rdt;
  if (G.msg) G.msg.t -= rdt;
  if (G.lastCast) G.lastCast.t -= rdt;
  if (G.ui.open || G.ui.help || G.ui.pause || G.ui.map) { updateCamera(rdt); return; }   // G.ui.map: full-map screen (screens.js)

  if (G.fadeDir) {
    G.fade += rdt * 1.6 * G.fadeDir;
    if (G.fade >= 1 && G.fadeTo && PRELOAD && PRELOAD.id === G.fadeTo && (G.fadeHold = (G.fadeHold || 0) + rdt) < PRELOAD_HOLD) G.fade = 1;   // hold the veil while the preload finishes
    else if (G.fade >= 1 && G.fadeTo) { G.preloadLog = { done: !PRELOAD, hold: +(G.fadeHold || 0).toFixed(2) }; PRELOAD = null; enterMap(G.fadeTo, G.fadeAt); G.fadeTo = null; G.fadeAt = null; G.fadeDir = -1; G.fade = 1; }
    if (G.fade <= 0 && G.fadeDir < 0) { G.fade = 0; G.fadeDir = 0; }
  }
  if (G.state === 'play' || G.state === 'dead') {
    if (G.fadeDir <= 0) updatePlayer(p, dt);
    updateEnemies(dt); updateProjs(dt); updateZones(dt); updateCritters(dt);
    updateTriggers(dt);
    for (const d of G.delays.slice()) { d.t -= dt; if (d.t <= 0) { d.done = true; withCast(d.c || null, d.fn); } }
    G.delays = G.delays.filter(d => !d.done);
    if (G.state === 'play') {
      for (const pt of m.portals) if (pt.open && G.world.maps[pt.to] && dist(p.x, p.y, pt.x, pt.y) < 0.85 && Math.abs(p.z - pt.z) < 0.6) transition(pt.to, pt.arrive);
    }
    updateLoot(dt);
    if (G.state === 'dead') { G.deadT += rdt; if (G.deadT > 4.5) respawn(); }
  }
  updateAmbient(rdt);
  const wdt = dt * (typeof worldScale === 'function' ? worldScale(null) : 1);   // world time (Hush): effects and particles
  for (const e of G.effects) { e.t += wdt; if (e.t >= e.life) { e.done = true; if (e.onDone) e.onDone(e); } }
  G.effects = G.effects.filter(e => !e.done);
  updateParts(rdt * (typeof worldScale === 'function' ? worldScale(null) : 1), m);   // pooled, hard cap PART.cap (game.js)
  for (const t of G.texts) t.t += rdt;
  G.texts = G.texts.filter(t => t.t < (t.life || 0.9));
  G.shakeA = Math.max(0, G.shakeA - rdt * 30);
  updateCamera(rdt);
}
// §29 G3 camera height bias (world-art minutes §3.3 fix 3): on a summit the camera leads down-slope (up to 36 px toward the lowest
// ground within 6 tiles in the facing direction) so you see the view, not your own mountain; at a wall's foot it leads up by half the
// wall's height (max 24 px) so the wall does not fill the frame. The bias eases on its own (~0.6 s), then the usual lerp follows.
function cameraBias(p, dt) {
  const m = G.map, B = G.camBias || (G.camBias = { x: 0, y: 0 });
  if (G.noCamBias) { B.x = B.y = 0; return B; }   // fixed-camera tools (tools/maps/art-audit.js)
  let bx = 0, by = 0;
  if (m && G.state === 'play' && !p.dead) {
    const a = p.moving && IN && IN.move && IN.move.mag ? Math.atan2(IN.move.y - IN.move.x, IN.move.x + IN.move.y) : p.aim || 0;   // facing, in world axes
    const fx = Math.cos(a), fy = Math.sin(a), z = p.climb || p.fall ? tileH(m, p.x, p.y) : p.z;
    let lo = z, hi = z;
    for (let d = 1; d <= 6; d++) { const x = p.x + fx * d, y = p.y + fy * d; if (!typeAt(m, Math.floor(x), Math.floor(y))) continue; const h = tileH(m, x, y); if (h < lo) lo = h; if (d <= 3 && h > hi) hi = h; }
    const down = z - lo >= 4 ? Math.min(36, (z - lo) * 2) : 0, up = hi - z >= 4 ? Math.min(24, (hi - z) * ZS * 0.5) : 0;   // only real summits / walls (4+ levels)
    if (down > 0) { const sx = (fx - fy) * 16, sy = (fx + fy) * 8, l = Math.hypot(sx, sy) || 1; bx = sx / l * down; by = sy / l * down; }
    if (up > 0) by -= up;
  }
  if (G.vantage && G.vantage.lead) { bx += G.vantage.lead[0]; by += G.vantage.lead[1]; }   // the reveal's 40 px ease down-slope (screens.js)
  const k = 1 - Math.exp(-dt * 1.8); B.x += (bx - B.x) * k; B.y += (by - B.y) * k;
  return B;
}
function updateCamera(dt) {
  const p = G.player;
  let tx = isoX(p.x, p.y), ty = isoY(p.x, p.y, p.z) - 12;
  if (G.state === 'title') { tx += Math.sin(G.t * 0.25) * 40 + 40; ty += -10 + Math.cos(G.t * 0.2) * 12; }
  else { const B = cameraBias(p, dt); tx += B.x; ty += B.y; }
  if (G.camHold) { tx = G.camHold.x; ty = G.camHold.y; }   // tools (shots): hold the camera on a world-screen point
  const k = 1 - Math.exp(-dt * 6);
  G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k;
}

function render() {
  drawScene();
  dctx.imageSmoothingEnabled = false;
  dctx.drawImage(SCN.c, 0, 0, DW, DH);
  perfMark('blit', dctx);
  UI.begin();
  drawHUD(dctx);   // draws its own toasts and focus ring per screen
  if (G.vantage && typeof drawVantage === 'function') drawVantage(dctx);   // §29 G3 the vantage reveal cinematic, over the HUD (screens.js)
  if (typeof AUDIO !== 'undefined') AUDIO.drawCaptions(dctx);   // sound captions (setting), bottom-left
  perfMark('hud', dctx);
  G.ui.wheel = 0;
  if (G.fade > 0) {
    const g = dctx.createRadialGradient(DW / 2, DH / 2, 0, DW / 2, DH / 2, DW * 0.7);
    g.addColorStop(0, `rgba(255,240,255,${G.fade})`); g.addColorStop(1, `rgba(199,168,255,${G.fade})`);
    dctx.fillStyle = g; dctx.fillRect(0, 0, DW, DH);
  }
  if (PERF.on) drawPerfOverlay(dctx);
}

// Fixed-step update at 1/60 s with an accumulator (§16.6.3): deterministic reactions, hitstop and scripted
// tests; render once per display frame. Slow-mo and hitstop scale/zero the game step, never its size.
// Hitstop is counted in unscaled steps BEFORE slow-mo (game.js hitlagStep, docs/design/combat-feel.md): a 15-step boss-death freeze is
// 0.25 s of real time even inside the boss slow-mo (it used to stretch to ~0.7 s).
const STEP = 1 / 60;
let last = performance.now(), acc = 0, running = true, frameEma = 16.7;
// one fixed game step (hitstop + slow-mo applied); the rAF loop and ?turbo's __advance both run exactly this
function simStep() {
  let rdt = STEP;
  const frozen = hitlagStep();
  if (G.slowmo > 0) { G.slowmo -= rdt; rdt *= 0.35; }
  update(frozen ? 0 : rdt, rdt);
}
// ?turbo (tools/qa lockstep fast-forward): the rAF loop stops advancing the sim and drawing. A tool calls __advance(n) = n fixed
// steps run synchronously with no render (the map-load / respawn prebuild work a frame would do runs after each step), and
// __render() before a screenshot. Input handlers, update order and the fixed dt are unchanged. tools/perf.js never sets it.
const TURBO = PARAMS.has('turbo');
if (TURBO) {
  // determinism (run-big --seed seeds Math.random): work whose amount depends on wall-clock budgets or on how often a tool draws
  // (map preload, respawn chunk prebuild, render, audio) runs on a side random stream, so the sim's stream and step count are
  // the same on every run; the map preload finishes within the step it starts (its time budget would vary the fade length)
  let sideA = 0x9e3779b9;
  const sideRand = () => { sideA = (sideA + 0x6D2B79F5) | 0; let t = Math.imul(sideA ^ (sideA >>> 15), 1 | sideA); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const side = fn => { const mr = Math.random; Math.random = sideRand; try { return fn(); } finally { Math.random = mr; } };
  // audio draws its pitch / noise-offset randomness only when a voice is free by the AudioContext's (wall) clock: side stream too
  if (typeof AUDIO !== 'undefined') for (const k of Object.keys(AUDIO)) if (typeof AUDIO[k] === 'function') { const f = AUDIO[k]; AUDIO[k] = function () { return side(() => f.apply(this, arguments)); }; }
  window.__advance = n => {
    n = Math.max(0, n | 0);
    for (let i = 0; i < n; i++) {
      simStep();
      camX = Math.round(G.cam.x); camY = Math.round(G.cam.y);   // the view camera drawScene() sets (no shake): worldToView() in update / tools stays live
      if (PRELOAD) side(() => preloadStep(Infinity));
      else if (G.state === 'dead') side(() => prebuildRespawn(PRELOAD_MS));
    }
    if (n && typeof AUDIO !== 'undefined') AUDIO.frame(Math.min(0.25, n * STEP));
    if (n && uiSig() !== drawnSig) render();   // a screen opened / closed: one draw so the UI hit regions (mouse clicks) match it
    return n;
  };
  // a few draws so the chunks in view finish rastering (each draw builds the visible-missing ones on a budget)
  window.__render = (k = 4) => { for (let i = 0; i < k; i++) { last = performance.now(); render(); } return true; };
  const uiSig = () => [G.state, G.ui.open, G.ui.help, G.ui.pause, G.ui.map, G.ui.settings, !!G.tablet].join();
  let drawnSig = '';
  const render0 = render; render = function () { drawnSig = uiSig(); return side(render0); };
}
// ?god: the hero takes no damage (tools/qa blocker hunts only, never acceptance)
if (PARAMS.has('god')) { const hurt = hurtPlayer; window.hurtPlayer = function () { return false; }; window.__godHurt = hurt; }
function loop(now) {
  if (!running) return;
  if (TURBO) { last = now; requestAnimationFrame(loop); return; }
  if (PERF.on) perfBegin(now - last);
  const fdt = Math.min(0.25, (now - last) / 1000); last = now;
  frameEma += (fdt * 1000 - frameEma) * 0.05;
  // particle budget follows the measured frame time: shed motes first when a device struggles
  PART.budget = clamp(PART.budget + (frameEma > 20 ? -0.02 : frameEma < 17.5 ? 0.01 : 0), 0.35, 1);
  acc += fdt;
  const frameT0 = performance.now();
  let n = 0;
  while (acc >= STEP && n < 5) {
    simStep();
    acc -= STEP; n++;
  }
  if (n === 5) acc = 0;   // spiral-of-death guard after a long stall
  perfMark('update');
  render();
  if (PRELOAD) preloadStep(clamp(PRELOAD_FRAME - (performance.now() - frameT0), 2, PRELOAD_MS));   // a portal fade's map load (see transition)
  else if (G.state === 'dead') prebuildRespawn(clamp(PRELOAD_FRAME - (performance.now() - frameT0), 2, PRELOAD_MS));
  if (typeof AUDIO !== 'undefined') AUDIO.frame(fdt);   // music director: song / stems / intensity / ducking (notes are timed by its 25 ms audio-clock tick)
  const workMs = performance.now() - frameT0;
  governorStep(workMs, fdt);   // phone: DPR rung / quality tier from the CPU frame time (GOV below)
  if (PERF.on) perfEnd(workMs, n);
  requestAnimationFrame(loop);
}

// ===== ?perf=1: the on-screen frame readout (docs/design/pillars-and-rules.md step 1: measure on the real device) =============================
// Top-centre box, refreshed 4x a second from a 240-frame ring (~4 s): fps, frame avg / p95 (the rAF delta), work avg / p95 (CPU inside
// loop(): update + render + preload), draw calls (2D context calls this frame, counted by wrappers installed only when ?perf
// is set), particles (pooled + ambient), and the per-phase split (render.js perfMark). Off: `PERF.on` is false, nothing is
// wrapped, the loop pays two boolean tests. window.__perf() returns the same numbers for tools.
const PERF_N = 240, PERF_RING = { f: new Float32Array(PERF_N), w: new Float32Array(PERF_N), i: 0, n: 0, ph: {}, phN: 0, tot: {}, totN: 0, slow: {}, slowN: 0, steps: 0, dtot: {}, txt: null, at: 0 };
function perfBegin(dms) {
  const R = PERF_RING; R.f[R.i] = dms; PERF.t = performance.now(); PERF.draws = 0; PERF.d0 = 0;
  for (const k in PERF.ph) PERF.ph[k] = 0;
  for (const k in PERF.dph) PERF.dph[k] = 0;
}
function perfEnd(work, steps) {
  const R = PERF_RING; R.w[R.i] = work; R.i = (R.i + 1) % PERF_N; R.n = Math.min(PERF_N, R.n + 1);
  for (const k in PERF.ph) { R.ph[k] = (R.ph[k] || 0) + PERF.ph[k]; R.tot[k] = (R.tot[k] || 0) + PERF.ph[k]; }
  R.phN++; R.totN++; R.steps = (R.steps || 0) + steps;
  for (const k in PERF.dph) R.dtot[k] = (R.dtot[k] || 0) + PERF.dph[k];
  if (work > 18) { R.slowN = (R.slowN || 0) + 1; for (const k in PERF.ph) R.slow[k] = (R.slow[k] || 0) + PERF.ph[k]; }   // what the slow frames are made of
  R.draws = PERF.draws;
}
// perfStats(true): the phase split averaged since the last perfStats(true, true) reset (tools/perf.js), not the overlay's 250 ms window
function perfStats(total, reset) {
  const R = PERF_RING, n = R.n; if (!n) return null;
  if (reset) { R.tot = {}; R.totN = 0; R.slow = {}; R.slowN = 0; R.steps = 0; R.dtot = {}; return null; }
  const q = a => { const s = Array.from(a.subarray(0, n)).sort((x, y) => x - y); return { avg: s.reduce((x, y) => x + y, 0) / n, p95: s[Math.min(n - 1, Math.floor(n * 0.95))] }; };
  const f = q(R.f), w = q(R.w), ph = {};
  const src = total ? R.tot : R.ph, sn = total ? R.totN : R.phN;
  for (const k in src) ph[k] = +(src[k] / Math.max(1, sn)).toFixed(2);
  const out = { fps: 1000 / f.avg, frame: f, work: w, draws: R.draws, parts: G.parts.length + (G.amb ? G.amb.length : 0), ph, tier: QUALITY.tier, rung: GOV.on ? GOV.rungs[GOV.ri] : null, govMed: GOV.on ? +GOV.med.toFixed(1) : null };
  if (total) {   // tools: update steps per frame, and the phase split of the frames whose work went over 18 ms
    out.steps = +(R.steps / Math.max(1, R.totN)).toFixed(2); out.slowFrames = R.slowN || 0; out.slow = {};
    for (const k in R.slow) out.slow[k] = +(R.slow[k] / Math.max(1, R.slowN)).toFixed(2);
    out.drawsBy = {}; for (const k in R.dtot) if (R.dtot[k]) out.drawsBy[k] = Math.round(R.dtot[k] / Math.max(1, R.totN));
  }
  return out;
}
window.__perf = perfStats;
function drawPerfOverlay(ctx) {
  const R = PERF_RING, t = performance.now();
  if (!R.txt || t - R.at > 250) {
    const s = perfStats(); R.at = t;
    if (s) {
      const ph = Object.entries(s.ph).filter(([, v]) => v >= 0.05).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v.toFixed(1));
      R.txt = [`${s.fps.toFixed(0)} fps  frame ${s.frame.avg.toFixed(1)} / p95 ${s.frame.p95.toFixed(1)} ms`, `work ${s.work.avg.toFixed(1)} / p95 ${s.work.p95.toFixed(1)} ms  q:${s.tier}${s.rung ? ' dpr x' + s.rung + ' k' + HUD_K : ''}`,
        `draws ${s.draws}  parts ${s.parts}`].concat(ph.reduce((rows, x, i) => { if (i % 4 === 0) rows.push(x); else rows[rows.length - 1] += '  ' + x; return rows; }, []));
      for (const k in R.ph) R.ph[k] = 0; R.phN = 0;
    }
  }
  if (!R.txt) return;
  ctx.save(); ctx.setTransform(HUD_K, 0, 0, HUD_K, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.font = '11px monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const X = 320, W = 320;   // top centre: clear of the zone name / tracker (left) and the minimap (right)
  ctx.fillStyle = 'rgba(5,3,12,0.72)'; ctx.fillRect(X, 4, W, 6 + R.txt.length * 13);
  ctx.fillStyle = '#c8ffd8'; R.txt.forEach((l, i) => ctx.fillText(l, X + 5, 8 + i * 13));
  ctx.restore();
}
if (PERF.on) {   // count 2D draw calls (only with ?perf: the wrappers cost a little)
  const P = CanvasRenderingContext2D.prototype;
  for (const k of ['drawImage', 'fillRect', 'fill', 'stroke', 'strokeRect', 'fillText', 'strokeText', 'putImageData', 'clearRect']) {
    const f = P[k]; P[k] = function () { PERF.draws++; return f.apply(this, arguments); };
  }
}
// pause the loop while the tab is hidden; resume without a time jump
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { running = false; if (G.ui && !G.ui.open && G.state === 'play') saveGame(); }
  else if (!running && window.__ready) { running = true; last = performance.now(); acc = 0; requestAnimationFrame(loop); }
});

// ===== input: actions (js/input.js) -> game ============================================================
// Menus, title, death and help read actions here, once per step; gameplay actions are read in game.js
// playerActions() after the aim resolves. Mouse clicks on UI keep going through uiClick (hit regions).
const MENU_TABS = TAB_IDS;
// pad / keys inside menus: d-pad moves focus, except on settings rows where left / right change the value
function menuNav() {
  for (const [a, d] of [['menuUp', 'up'], ['menuDown', 'down'], ['menuLeft', 'left'], ['menuRight', 'right']]) if (IN.pressed(a)) {
    if ((d === 'left' || d === 'right') && (G.ui.pause || G.ui.settings) && settingsNavSideways(d === 'left' ? -1 : 1)) continue;
    UI.focus.move(d);
  }
}
function handleInput() {
  if (IN.pressed('mute')) { G.muted = !G.muted; if (typeof setSetting === 'function') setSetting('muted', G.muted); say(G.muted ? 'Sound off' : 'Sound on'); }
  if (IN.capturing()) return;
  // any press that opens / closes a screen is swallowed so it can't also act in gameplay this step
  const used = () => IN.swallow();
  if (G.state === 'title') {
    menuNav();
    if (G.ui.settings) { if (IN.pressed('back') || IN.pressed('pause')) { G.ui.settings = false; used(); return; } }
    if (G.ui.arenas) { if (IN.pressed('back') || IN.pressed('pause')) { G.ui.arenas = false; used(); return; } }   // the title's ARENAS list (arenas.js)
    if (G.ui.help) { if (IN.pressed('back') || IN.pressed('help') || IN.pressed('pause')) { G.ui.help = false; used(); return; } }   // the title's "?" help (R3 #8)
    if (IN.pressed('accept') || IN.pressed('interact') || (IN.pressed('pause') && IN.device === 'pad' && !G.ui.settings)) { initAudio(); if (!UI.focus.accept()) { if (!G.ui.settings) titleDefault(); } used(); }
    return;
  }
  if (G.state === 'dead') {
    menuNav();
    if ((IN.pressed('accept') || IN.pressed('attack') || IN.pressed('interact')) && G.deadT > 1) { respawn(); used(); }
    return;
  }
  if (G.ui.help) {
    menuNav();
    if (IN.pressed('back') || IN.pressed('help') || IN.pressed('pause')) { G.ui.help = false; used(); return; }
    if (IN.pressed('accept') || IN.pressed('interact')) { UI.focus.accept(); used(); }
    return;
  }
  if (G.ui.pause) {
    menuNav();
    if (IN.pressed('back') || IN.pressed('pause')) { G.ui.pause = false; used(); return; }
    if (IN.pressed('accept')) { UI.focus.accept(); used(); }
    return;
  }
  if (G.ui.open) {
    const tabKey = [['inventory', 'inv'], ['character', 'skills'], ['bestiary', 'bestiary'], ['quests', 'quests']].find(([a]) => IN.pressed(a));
    if (tabKey) { if ((G.ui.tab || 'inv') === tabKey[1]) closeInv(); else setTab(tabKey[1]); used(); return; }
    if (IN.pressed('back') || IN.pressed('pause')) { closeInv(); used(); return; }
    menuNav();
    if (IN.pressed('accept')) { UI.focus.accept(); if (!G.ui.open) { used(); return; } }
    if (IN.pressed('menuAlt')) UI.focus.alt();
    const dt = IN.pressed('tabNext') ? 1 : IN.pressed('tabPrev') ? -1 : 0;
    if (dt) cycleTab(dt);
    return;
  }
  if (G.state !== 'play' || G.fadeDir) return;
  if (typeof fullMapInput === 'function' && fullMapInput()) { used(); return; }   // M / D-pad down: full map + shrine warp (screens.js)
  const tabKey = [['inventory', 'inv'], ['character', 'skills'], ['bestiary', 'bestiary'], ['quests', 'quests']].find(([a]) => IN.pressed(a));
  if (tabKey) { openInv(tabKey[1]); used(); return; }
  if (IN.pressed('pause')) { G.ui.pause = true; UI.focus.set(null); used(); return; }   // Esc and pad Start open the pause screen
  if (IN.pressed('help')) { G.ui.help = true; used(); return; }
}
DISP.addEventListener('wheel', ev => { G.ui.wheel = ev.deltaY; ev.preventDefault(); }, { passive: false });
DISP.addEventListener('mousedown', ev => {
  initAudio();
  const hit = () => IN.consume('Mouse' + ev.button);
  if (G.state === 'title') { uiClick(G.mouse.dx, G.mouse.dy, ev.button === 2); hit(); return; }
  if (G.state === 'dead') { uiClick(G.mouse.dx, G.mouse.dy); hit(); return; }
  if (G.ui.help) { if (!uiClick(G.mouse.dx, G.mouse.dy)) G.ui.help = false; hit(); return; }
  if (G.ui.pause || G.ui.open) { uiClick(G.mouse.dx, G.mouse.dy, ev.button === 2); hit(); return; }
  if (ev.button === 0 && !G.touch && UI.click(G.mouse.dx, G.mouse.dy)) hit();   // HUD buttons ("?") never also attack
});
DISP.addEventListener('contextmenu', ev => ev.preventDefault());
// ===== title: Continue (when a save exists) / New Dream / Settings =======================
function uiClick(x, y, alt) { return UI.click(x, y, alt); }
function beginPlay() { G.state = 'play'; initAudio(); G.banner = { s: G.map.name, sub: G.map.sub, t: 3.2, max: 3.2 }; }
function newGame() {
  clearSave(); G.prog = { chests: {}, firsts: {}, trig: {} }; G.seen = {}; G.checkpoint = null; G.stats = { playtime: 0, deaths: 0 };
  G.player = makePlayer(); G.state = 'title'; enterMap(G.world.start); beginPlay();
  G.checkpoint = { map: G.map.id, x: G.map.start.x, y: G.map.start.y };   // wake in the hub until a shrine is touched
}
function continueGame(s) {
  G.player = makePlayer(); applySave(G.player, s);
  const sm = s.world && s.world.map, id = G.world.maps[sm] ? sm : G.world.start, cp = G.checkpoint && G.checkpoint.map === id ? G.checkpoint : null;
  enterMap(id, cp); beginPlay();
}
G.save = SAVE_ON ? readSave() : null;
if (G.save && G.save.bindings) IN.setBindings(G.save.bindings);   // the title screen already uses the player's bindings
if (G.save && G.save.settings) applySettings(G.save.settings);
function titleDefault() { if (G.save) continueGame(G.save); else newGame(); }
function titleClick(x, y) { initAudio(); uiClick(x, y); }
function startGame() { titleDefault(); }

// ===== boot ==============================================================================
// The world (maps, triggers, tuning) comes from js/world.js. Play-testing from the editor
// passes ?playtest=1, which loads the editor's unpublished draft from this browser instead.
function loadWorld() {
  if (PARAMS.get('playtest')) {
    try { const d = JSON.parse(localStorage.getItem('dreamy.world.draft')); if (d && d.maps) return d; } catch (e) { /* fall through */ }
  }
  return WORLD_DATA;
}
async function boot() {
  if (PHONE) PART.cap = 300;   // §26.4 step 4: the phone particle cap (game.js pool: 600 on desktop; PART.budget still sheds below it)
  await loadSprites();
  buildArt(); initPost();
  G.world = mergeArenas(loadWorld(), PARAMS.get('map'));   // arenas.js: ?map=<arena id> adds that mockup arena to a copy of the world
  for (const id in G.world.maps) THEME_OF[id] = G.world.maps[id].theme;
  buildCustomSprites(G.world.sprites);
  applyTuning(G.world.tuning);
  applyWorldEnemies(G.world.enemies);
  // perf: every zone's sky / mountain / cloud backdrop is built here, behind the loading screen (~0.1 s a theme),
  // instead of in the frame a portal lands in (prepTheme in enterMap then finds it cached)
  for (const id in G.world.maps) { const t = G.world.maps[id].theme, th = THEMES[t]; if (th && !th._bg) prepTheme({ theme: th, themeId: t }); }
  G.player = makePlayer();
  // ?map=<id> (play-test / showcase), ?scene=play|arena|boss|loadout|portal|inventory, &weapon=staff|bow (pre-v4 ids starfall|moonbow work too)
  // showcase scenes get a mid-level (L14) kit; they never read or write the real save
  const w = PARAMS.get('weapon') && variantId(PARAMS.get('weapon')), wf = w && ITEMS.weapon.some(i => i.id === w) ? w : null;
  const scene = PARAMS.get('scene');
  if (scene) showcaseKit(G.player, wf || 'sword');
  else if (wf) { G.player.equip.weapon = makeItem(FAMILY_TIERS[wf][0].split(':')[0], 'common', 1, { sockets: 0 }); recalcStats(G.player, true); }
  if (scene === 'inventory') sampleBag(G.player);
  { const ar = !scene && G.world.maps[PARAMS.get('map')]; if (ar && ar.loadout) applyArenaKit(G.player, ar.loadout, { weapon: wf, tier: PARAMS.get('tier') }); }   // an arena's reference hero (?weapon= / ?tier= override)
  let start = PARAMS.get('map') || G.world.start;
  if ((scene === 'arena' || scene === 'boss') && G.world.maps.ruins) start = 'ruins';
  if (!G.world.maps[start]) start = Object.keys(G.world.maps)[0];
  enterMap(start);
  if (scene || PARAMS.get('playtest') || PARAMS.get('map')) G.state = 'play';
  if (scene === 'boss') skipToBoss();
  if (scene === 'loadout') openInv('skills');
  if (scene === 'inventory') openInv('inv');
  if (scene === 'portal') { const pt = G.map.portals.find(q => q.marker) || G.map.portals[0]; if (pt) { G.player.x = pt.x - 1; G.player.y = pt.y + 1.1; G.player.z = tileH(G.map, G.player.x, G.player.y); } }
  document.getElementById('loading').style.display = 'none';
  window.__ready = true;
  requestAnimationFrame(loop);
}
// ?scene=boss: mark everything before the boss trigger fired, then run it
function skipToBoss() {
  const tr = G.map.triggers.find(t => (t.actions || []).some(a => a.type === 'spawn_boss')); if (!tr) return;
  G.trig.fired[tr.id] = true; for (const t of G.map.triggers.slice(0, G.map.triggers.indexOf(tr))) G.trig.fired[t.id] = true;
  for (const a of tr.actions) if (a.type !== 'wait') runAction(a);
}
const startBoot = () => setTimeout(boot, 30);
if (document.fonts && document.fonts.load) document.fonts.load('16px "Press Start 2P"').then(startBoot, startBoot); else startBoot();
