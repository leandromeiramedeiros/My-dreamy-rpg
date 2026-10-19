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
  p.x = at ? at.x : m.start.x; p.y = at ? at.y : m.start.y; p.z = tileH(m, p.x, p.y); p.dash = null;
  syncChests(m);
  G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
  G.banner = { s: m.name, sub: m.sub, t: 3.2, max: 3.2 };
  startTriggers();
  spawnCritters(m);
  if (G.state === 'play') saveGame();   // autosave on zone entry
}
function transition(to, at) {
  if (G.fadeDir) return;
  G.fadeDir = 1; G.fadeTo = to; G.fadeAt = at || null; sfx('portal');
}
// death: lose 10% of this level's bar (never a level), wake at the last checkpoint (or this map's start) with
// full HP and potions; settled triggers survive, so only the encounter you died in resets
const deathXpLoss = p => Math.min(Math.floor(p.xp), Math.round(xpToNext(p.level) * 0.1));
function respawn() {
  const p = G.player;
  p.xp -= deathXpLoss(p);
  p.dead = false; p.buffs = {}; p.cds = {}; p.cast = null; p.ult = 0; recalcStats(p, true); p.potions = MAX_POTIONS;
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
  if (G.ui.open || G.ui.help) { updateCamera(rdt); return; }

  if (G.fadeDir) {
    G.fade += rdt * 1.6 * G.fadeDir;
    if (G.fade >= 1 && G.fadeTo) { enterMap(G.fadeTo, G.fadeAt); G.fadeTo = null; G.fadeAt = null; G.fadeDir = -1; G.fade = 1; }
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
  drawHUD(dctx);
  if (G.ui.open || G.state === 'title') UI.focus.draw(dctx);
  UI.drawToasts(dctx);
  if (G.fade > 0) {
    const g = dctx.createRadialGradient(DW / 2, DH / 2, 0, DW / 2, DH / 2, DW * 0.7);
    g.addColorStop(0, `rgba(255,240,255,${G.fade})`); g.addColorStop(1, `rgba(199,168,255,${G.fade})`);
    dctx.fillStyle = g; dctx.fillRect(0, 0, DW, DH);
  }
}

// Fixed-step update at 1/60 s with an accumulator (§16.6.3): deterministic reactions, hitstop and scripted
// tests; render once per display frame. Slow-mo and hitstop scale/zero the game step, never its size.
const STEP = 1 / 60;
let last = performance.now(), acc = 0, running = true, frameEma = 16.7;
function loop(now) {
  if (!running) return;
  const fdt = Math.min(0.25, (now - last) / 1000); last = now;
  frameEma += (fdt * 1000 - frameEma) * 0.05;
  // particle budget follows the measured frame time: shed motes first when a device struggles
  PART.budget = clamp(PART.budget + (frameEma > 20 ? -0.02 : frameEma < 17.5 ? 0.01 : 0), 0.35, 1);
  acc += fdt;
  let n = 0;
  while (acc >= STEP && n < 5) {
    let rdt = STEP;
    if (G.slowmo > 0) { G.slowmo -= rdt; rdt *= 0.35; }
    let dt = rdt;
    if (G.hitstopT > 0) { G.hitstopT -= rdt; dt = 0; }
    update(dt, rdt);
    acc -= STEP; n++;
  }
  if (n === 5) acc = 0;   // spiral-of-death guard after a long stall
  render();
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
const MENU_TABS = ['inv', 'skills'];
function handleInput() {
  if (IN.pressed('mute')) { G.muted = !G.muted; if (typeof setSetting === 'function') setSetting('muted', G.muted); say(G.muted ? 'Sound off' : 'Sound on'); }
  if (IN.capturing()) return;
  const nav = () => { for (const [a, d] of [['menuUp', 'up'], ['menuDown', 'down'], ['menuLeft', 'left'], ['menuRight', 'right']]) if (IN.pressed(a)) UI.focus.move(d); };
  if (G.state === 'title') {
    nav();
    if (IN.pressed('accept') || IN.pressed('interact') || IN.pressed('pause')) { initAudio(); if (UI.focus.showing() && UI.focus.current()) UI.focus.accept(); else titleDefault(); }
    return;
  }
  if (G.state === 'dead') { if ((IN.pressed('accept') || IN.pressed('attack') || IN.pressed('interact')) && G.deadT > 1) respawn(); return; }
  if (G.ui.help) { if (IN.pressed('accept') || IN.pressed('back') || IN.pressed('help') || IN.pressed('pause') || IN.pressed('interact')) G.ui.help = false; return; }
  if (G.ui.open) {
    if (IN.pressed('inventory') || IN.pressed('back') || IN.pressed('pause')) { closeInv(); return; }
    nav();
    if (IN.pressed('accept')) UI.focus.accept();
    if (IN.pressed('menuAlt')) UI.focus.alt();
    const dt = IN.pressed('tabNext') ? 1 : IN.pressed('tabPrev') ? -1 : 0;
    if (dt) { const i = MENU_TABS.indexOf(G.ui.tab || 'inv'); G.ui.tab = MENU_TABS[(i + dt + MENU_TABS.length) % MENU_TABS.length]; G.ui.gem = null; G.ui.salvage = false; }
    return;
  }
  if (G.state !== 'play' || G.fadeDir) return;
  if (IN.pressed('inventory')) { openInv(); IN.consume('Mouse0'); return; }
  if (IN.pressed('help')) { G.ui.help = true; return; }
  if (IN.pressed('pause') && IN.device === 'pad') { G.ui.help = true; return; }   // stand-in until the pause screen
}
DISP.addEventListener('mousedown', ev => {
  initAudio();
  if (G.state === 'title') { titleClick(G.mouse.dx, G.mouse.dy); IN.consume('Mouse' + ev.button); return; }
  if (G.state === 'dead') { if (G.deadT > 1) respawn(); IN.consume('Mouse' + ev.button); return; }
  if (G.ui.help) { G.ui.help = false; IN.consume('Mouse' + ev.button); return; }
  if (G.ui.open) { uiClick(G.mouse.dx, G.mouse.dy, ev.button === 2); IN.consume('Mouse' + ev.button); }
});
DISP.addEventListener('contextmenu', ev => ev.preventDefault());
// ===== title: Continue (when a save exists) / New Game ===================================
function uiClick(x, y, alt) {
  for (const b of G.ui.btns) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) { b.fn(alt); return true; }
  return UI.click(x, y, alt);
}
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
// a click that misses the buttons does the default (Continue, else New Game)
function titleClick(x, y) { initAudio(); if (!uiClick(x, y)) titleDefault(); }
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
  G.player = makePlayer();
  // ?map=<id> (play-test / showcase), ?scene=play|arena|boss|loadout|portal|inventory, &weapon=starfall|moonbow
  // showcase scenes get a mid-level (L14) kit; they never read or write the real save
  const w = PARAMS.get('weapon'), wf = w && ITEMS.weapon.some(i => i.id === w) ? w : null;
  const scene = PARAMS.get('scene');
  if (scene) showcaseKit(G.player, wf || 'dawnblade');
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
