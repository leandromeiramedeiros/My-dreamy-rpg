'use strict';
// ---------------------------------------------------------------------------
// Boot, main loop, input and map transitions.
// ---------------------------------------------------------------------------
const DISP = document.getElementById('game');
const dctx = DISP.getContext('2d');
DISP.width = DW; DISP.height = DH;

function fit() {
  const s = Math.min(window.innerWidth / DW, window.innerHeight / DH);
  DISP.style.width = Math.floor(DW * s) + 'px';
  DISP.style.height = Math.floor(DH * s) + 'px';
}
window.addEventListener('resize', fit); fit();
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
  G.boss = null;
  p.x = at ? at.x : m.start.x; p.y = at ? at.y : m.start.y; p.z = tileH(m, p.x, p.y); p.dash = null;
  syncChests(m);
  G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
  G.banner = { s: m.name, sub: m.sub, t: 3.2, max: 3.2 };
  startTriggers();
  spawnCritters(m);
  if (G.state === 'play') saveGame();   // autosave on zone entry
}
function transition(to) {
  if (G.fadeDir) return;
  G.fadeDir = 1; G.fadeTo = to; sfx('portal');
}
// death: lose 10% of this level's bar (never a level), wake at the last checkpoint (or this map's start) with
// full HP and potions; settled triggers survive, so only the encounter you died in resets
const deathXpLoss = p => Math.min(Math.floor(p.xp), Math.round(xpToNext(p.level) * 0.1));
function respawn() {
  const p = G.player;
  p.xp -= deathXpLoss(p);
  p.dead = false; p.buffs = {}; p.cds = {}; recalcStats(p, true); p.potions = MAX_POTIONS;
  G.state = 'play';
  const cp = G.checkpoint && G.world.maps[G.checkpoint.map] ? G.checkpoint : null;
  enterMap(cp ? cp.map : G.map.id, cp);
  if (PARAMS.get('scene') === 'boss') skipToBoss();
}

// ===== update =========================================================================
function update(dt, rdt) {
  G.t += rdt;
  const p = G.player, m = G.map;
  if (G.banner) G.banner.t -= rdt;
  if (G.msg) G.msg.t -= rdt;
  if (G.lastCast) G.lastCast.t -= rdt;
  if (G.ui.open || G.ui.help) { updateCamera(rdt); return; }

  if (G.fadeDir) {
    G.fade += rdt * 1.6 * G.fadeDir;
    if (G.fade >= 1 && G.fadeTo) { enterMap(G.fadeTo); G.fadeTo = null; G.fadeDir = -1; G.fade = 1; }
    if (G.fade <= 0 && G.fadeDir < 0) { G.fade = 0; G.fadeDir = 0; }
  }
  if (G.state === 'play' || G.state === 'dead') {
    if (G.fadeDir <= 0) updatePlayer(p, dt);
    updateEnemies(dt); updateProjs(dt); updateZones(dt); updateCritters(dt);
    updateTriggers(dt);
    for (const d of G.delays.slice()) { d.t -= dt; if (d.t <= 0) { d.done = true; withCast(d.c || null, d.fn); } }
    G.delays = G.delays.filter(d => !d.done);
    if (G.state === 'play') {
      for (const pt of m.portals) if (pt.open && G.world.maps[pt.to] && dist(p.x, p.y, pt.x, pt.y) < 0.85 && Math.abs(p.z - pt.z) < 0.6) transition(pt.to);
    }
    updateLoot(dt);
    if (G.state === 'dead') { G.deadT += rdt; if (G.deadT > 4.5) respawn(); }
  }
  updateAmbient(rdt);
  for (const e of G.effects) { e.t += dt; if (e.t >= e.life) { e.done = true; if (e.onDone) e.onDone(e); } }
  G.effects = G.effects.filter(e => !e.done);
  for (const q of G.parts) {
    q.t += rdt; q.x += q.vx * rdt; q.y += q.vy * rdt; q.vz -= q.grav * rdt; q.z += q.vz * rdt;
    if (q.z < 0 && !q.petal) { q.z = 0; q.vz *= -0.3; q.vx *= 0.6; q.vy *= 0.6; }
    if (q.petal) { q.x += Math.sin(G.t * 2 + q.y) * rdt * 0.3; if (q.z < tileH(m, q.x, q.y)) { q.vz = 0; q.vx = 0; q.vy = 0; } }
  }
  G.parts = G.parts.filter(q => q.t < q.life);
  if (G.parts.length > 600) G.parts.splice(0, G.parts.length - 600);   // DESIGN §0 hard cap
  for (const t of G.texts) t.t += rdt;
  G.texts = G.texts.filter(t => t.t < 0.9);
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
  drawHUD(dctx);
  if (G.fade > 0) {
    const g = dctx.createRadialGradient(DW / 2, DH / 2, 0, DW / 2, DH / 2, DW * 0.7);
    g.addColorStop(0, `rgba(255,240,255,${G.fade})`); g.addColorStop(1, `rgba(199,168,255,${G.fade})`);
    dctx.fillStyle = g; dctx.fillRect(0, 0, DW, DH);
  }
}

let last = performance.now();
function loop(now) {
  let rdt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.slowmo > 0) { G.slowmo -= rdt; rdt *= 0.35; }
  let dt = rdt;
  if (G.hitstopT > 0) { G.hitstopT -= rdt; dt = 0; }
  update(dt, rdt);
  render();
  requestAnimationFrame(loop);
}

// ===== input ===========================================================================
const SKILL_KEYS = { q: 'q', e: 'e', r: 'r', f: 'f', c: 'c', '1': '1', '2': '2', '3': '3', shift: 'shift', ' ': 'shift' };
window.addEventListener('keydown', ev => {
  const k = ev.key.toLowerCase();
  if (k === 'tab' || k === ' ' || k.startsWith('arrow')) ev.preventDefault();
  if (G.state === 'title') { if (k === 'enter' || k === ' ') titleDefault(); return; }
  if (ev.repeat && k !== 'w' && k !== 'a' && k !== 's' && k !== 'd') return;
  G.keys[k] = true;
  if (k === 'tab' || k === 'i') { if (G.ui.open) closeInv(); else if (G.state === 'play') openInv(); G.ui.help = false; return; }
  if (k === 'escape') { closeInv(); G.ui.help = false; return; }
  if (k === 'h') { G.ui.help = !G.ui.help; closeInv(); return; }
  if (k === 'm') { G.muted = !G.muted; say(G.muted ? 'Sound off' : 'Sound on'); return; }
  if (G.ui.open || G.state !== 'play' || G.fadeDir) return;
  if (k === '4') { drinkPotion(G.player); return; }
  if (SKILL_KEYS[k]) useSkill(G.player, SKILL_KEYS[k]);
});
window.addEventListener('keyup', ev => { G.keys[ev.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { G.keys = {}; G.mouse.down = false; });
function mousePos(ev) {
  const r = DISP.getBoundingClientRect();
  G.mouse.dx = (ev.clientX - r.left) / r.width * DW;
  G.mouse.dy = (ev.clientY - r.top) / r.height * DH;
  G.mouse.x = G.mouse.dx / 2; G.mouse.y = G.mouse.dy / 2;
}
DISP.addEventListener('mousemove', mousePos);
DISP.addEventListener('mousedown', ev => {
  mousePos(ev); initAudio();
  if (G.state === 'title') { titleClick(G.mouse.dx, G.mouse.dy); return; }
  if (G.state === 'dead') { if (G.deadT > 1) respawn(); return; }
  if (G.ui.help) { G.ui.help = false; return; }
  if (G.ui.open) { uiClick(G.mouse.dx, G.mouse.dy, ev.button === 2); return; }
  if (ev.button === 0) { G.mouse.down = true; basicAttack(G.player); }
});
window.addEventListener('mouseup', () => { G.mouse.down = false; });
DISP.addEventListener('contextmenu', ev => ev.preventDefault());
// ===== title: Continue (when a save exists) / New Game ===================================
function uiClick(x, y, alt) {
  for (const b of G.ui.btns) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) { b.fn(alt); return true; }
  return false;
}
function beginPlay() { G.state = 'play'; initAudio(); G.banner = { s: G.map.name, sub: G.map.sub, t: 3.2, max: 3.2 }; }
function newGame() {
  clearSave(); G.prog = { chests: {}, firsts: {}, trig: {} }; G.checkpoint = null;
  G.player = makePlayer(); G.state = 'title'; enterMap(G.world.start); beginPlay(); saveGame();
}
function continueGame(s) {
  G.player = makePlayer(); applySave(G.player, s);
  const id = G.world.maps[s.map] ? s.map : G.world.start, cp = G.checkpoint && G.checkpoint.map === id ? G.checkpoint : null;
  enterMap(id, cp); beginPlay();
}
G.save = SAVE_ON ? readSave() : null;
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
