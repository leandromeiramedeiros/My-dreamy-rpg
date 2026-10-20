'use strict';
// ---------------------------------------------------------------------------
// Boot, main loop, input and map transitions.
// ---------------------------------------------------------------------------
const DISP = document.getElementById('game');
const dctx = DISP.getContext('2d');
// HUD at min(devicePixelRatio, 2) (§16.6.6): the backing store is DW*k x DH*k and every draw keeps using the
// 960x540 coordinate space through one transform; the scene stays 480x270 and is scaled up into it.
let HUD_K = 1;
function fit() {
  const s = Math.min(window.innerWidth / DW, window.innerHeight / DH);
  DISP.style.width = Math.floor(DW * s) + 'px';
  DISP.style.height = Math.floor(DH * s) + 'px';
  const k = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
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
  const m = getMap(id), p = G.player;
  G.map = m; prepTheme(m);
  for (const pt of m.portals) pt.open = (G.world.maps[id].portals.find(q => q.x === pt.x && q.y === pt.y) || pt).open !== false;
  G.enemies = []; G.projs = []; G.effects = []; G.zones = []; G.parts = []; G.texts = []; G.delays = []; G.amb = []; G.drops = [];
  G.boss = null; G.tablet = null;
  if (typeof resetCorpses === 'function') resetCorpses();   // R1 corpse records (pooled) and the hitlag clock
  if (typeof hitlagReset === 'function') hitlagReset();
  p.x = at ? at.x : m.start.x; p.y = at ? at.y : m.start.y; p.z = tileH(m, p.x, p.y); p.dash = null;
  syncChests(m);
  G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
  if (!(typeof onceSeen === 'function' && onceSeen('zone:' + id))) G.banner = { s: m.name, sub: m.sub, t: 3.2, max: 3.2 };   // once per save: a respawn never replays it
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
  for (const e of G.effects) { e.t += dt; if (e.t >= e.life) { e.done = true; if (e.onDone) e.onDone(e); } }
  G.effects = G.effects.filter(e => !e.done);
  updateParts(rdt, m);   // pooled, hard cap PART.cap (game.js)
  for (const t of G.texts) t.t += rdt;
  G.texts = G.texts.filter(t => t.t < (t.life || 0.9));
  G.shakeA = Math.max(0, G.shakeA - rdt * 30);
  updateCamera(rdt);
}
function updateCamera(dt) {
  const p = G.player;
  let tx = isoX(p.x, p.y), ty = isoY(p.x, p.y, p.z) - 12;
  if (G.state === 'title') { tx += Math.sin(G.t * 0.25) * 40 + 40; ty += -10 + Math.cos(G.t * 0.2) * 12; }
  const k = 1 - Math.exp(-dt * 6);
  G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k;
}

function render() {
  drawScene();
  dctx.imageSmoothingEnabled = false;
  dctx.drawImage(SCN.c, 0, 0, DW, DH);
  UI.begin();
  drawHUD(dctx);   // draws its own toasts and focus ring per screen
  if (typeof AUDIO !== 'undefined') AUDIO.drawCaptions(dctx);   // sound captions (setting), bottom-left
  G.ui.wheel = 0;
  if (G.fade > 0) {
    const g = dctx.createRadialGradient(DW / 2, DH / 2, 0, DW / 2, DH / 2, DW * 0.7);
    g.addColorStop(0, `rgba(255,240,255,${G.fade})`); g.addColorStop(1, `rgba(199,168,255,${G.fade})`);
    dctx.fillStyle = g; dctx.fillRect(0, 0, DW, DH);
  }
}

// Fixed-step update at 1/60 s with an accumulator (§16.6.3): deterministic reactions, hitstop and scripted
// tests; render once per display frame. Slow-mo and hitstop scale/zero the game step, never its size.
// Hitstop is counted in unscaled steps BEFORE slow-mo (game.js hitlagStep, DESIGN §27): a 15-step boss-death freeze is
// 0.25 s of real time even inside the boss slow-mo (it used to stretch to ~0.7 s).
const STEP = 1 / 60;
let last = performance.now(), acc = 0, running = true, frameEma = 16.7;
function loop(now) {
  if (!running) return;
  const fdt = Math.min(0.25, (now - last) / 1000); last = now;
  frameEma += (fdt * 1000 - frameEma) * 0.05;
  // particle budget follows the measured frame time: shed motes first when a device struggles
  PART.budget = clamp(PART.budget + (frameEma > 20 ? -0.02 : frameEma < 17.5 ? 0.01 : 0), 0.35, 1);
  acc += fdt;
  const frameT0 = performance.now();
  let n = 0;
  while (acc >= STEP && n < 5) {
    let rdt = STEP;
    const frozen = hitlagStep();
    if (G.slowmo > 0) { G.slowmo -= rdt; rdt *= 0.35; }
    update(frozen ? 0 : rdt, rdt);
    acc -= STEP; n++;
  }
  if (n === 5) acc = 0;   // spiral-of-death guard after a long stall
  render();
  if (PRELOAD) preloadStep(clamp(PRELOAD_FRAME - (performance.now() - frameT0), 2, PRELOAD_MS));   // a portal fade's map load (see transition)
  else if (G.state === 'dead') prebuildRespawn(clamp(PRELOAD_FRAME - (performance.now() - frameT0), 2, PRELOAD_MS));
  if (typeof AUDIO !== 'undefined') AUDIO.frame(fdt);   // music director: song / stems / intensity / ducking (notes are timed by its 25 ms audio-clock tick)
  requestAnimationFrame(loop);
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
  await loadSprites();
  buildArt(); initPost();
  G.world = loadWorld();
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
