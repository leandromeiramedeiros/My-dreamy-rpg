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

function enterMap(id) {
  const m = G.maps[id], p = G.player;
  G.map = m; prepTheme(m);
  G.enemies = []; G.projs = []; G.effects = []; G.zones = []; G.parts = []; G.texts = []; G.delays = []; G.amb = [];
  G.boss = null; G.arena = null;
  p.x = m.start.x; p.y = m.start.y; p.z = tileH(m, p.x, p.y); p.dash = null;
  G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
  G.banner = { s: m.name, sub: m.sub, t: 3.2, max: 3.2 };
  if (id === 'ruins') { m.portalOpen = false; startArena(); }
  else { spawnEnemy('dummy', 6.3, 19.6, 0); spawnEnemy('dummy', 7.2, 20.6, 0); }
}
function transition(to) {
  if (G.fadeDir) return;
  G.fadeDir = 1; G.fadeTo = to; sfx('portal');
}
function respawn() {
  const p = G.player;
  p.dead = false; p.buffs = {}; p.cds = {}; recalcStats(p, true);
  G.state = 'play';
  enterMap(G.map.id);
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
    updateEnemies(dt); updateProjs(dt); updateZones(dt);
    if (m.id === 'ruins') updateArena(dt);
    for (const d of G.delays.slice()) { d.t -= dt; if (d.t <= 0) { d.done = true; d.fn(); } }
    G.delays = G.delays.filter(d => !d.done);
    if (G.state === 'play') {
      if (m.id === 'vale' && dist(p.x, p.y, m.portal.x, m.portal.y) < 0.85 && p.z > 3.5) transition('ruins');
      if (m.id === 'ruins' && m.portalOpen && dist(p.x, p.y, m.portal.x, m.portal.y) < 0.85) transition('vale');
    }
    if (G.state === 'dead') G.deadT += rdt;
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
  if (G.parts.length > 1600) G.parts.splice(0, G.parts.length - 1600);
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
  if (G.state === 'title') { if (k === 'enter' || k === ' ') startGame(); return; }
  if (ev.repeat && k !== 'w' && k !== 'a' && k !== 's' && k !== 'd') return;
  G.keys[k] = true;
  if (k === 'tab' || k === 'i') { G.ui.open = !G.ui.open; G.ui.help = false; return; }
  if (k === 'escape') { G.ui.open = false; G.ui.help = false; return; }
  if (k === 'h') { G.ui.help = !G.ui.help; G.ui.open = false; return; }
  if (k === 'm') { G.muted = !G.muted; say(G.muted ? 'Sound off' : 'Sound on'); return; }
  if (G.ui.open || G.state !== 'play' || G.fadeDir) return;
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
  if (G.state === 'title') { startGame(); return; }
  if (G.state === 'dead') { if (G.deadT > 1) respawn(); return; }
  if (G.ui.help) { G.ui.help = false; return; }
  if (G.ui.open) {
    for (const b of G.ui.btns) if (G.mouse.dx >= b.x && G.mouse.dx < b.x + b.w && G.mouse.dy >= b.y && G.mouse.dy < b.y + b.h) { b.fn(); return; }
    return;
  }
  if (ev.button === 0) { G.mouse.down = true; basicAttack(G.player); }
});
window.addEventListener('mouseup', () => { G.mouse.down = false; });
DISP.addEventListener('contextmenu', ev => ev.preventDefault());
function startGame() { G.state = 'play'; initAudio(); G.banner = { s: G.map.name, sub: G.map.sub, t: 3.2, max: 3.2 }; }

// ===== boot ==============================================================================
async function boot() {
  await loadPxlArt();
  buildArt(); initPost();
  G.maps.vale = buildVale();
  G.maps.ruins = buildRuins();
  G.player = makePlayer();
  // dev / showcase params: ?scene=play|arena|boss|loadout  &weapon=starfall|moonbow
  const w = PARAMS.get('weapon');
  if (w && ITEMS.weapon.some(i => i.id === w)) G.player.gear.weapon = w;
  const scene = PARAMS.get('scene');
  enterMap(scene === 'arena' || scene === 'boss' ? 'ruins' : 'vale');
  if (scene) G.state = 'play';
  if (scene === 'boss') { G.arena.phase = 'bossIntro'; G.arena.t = 0.1; G.arena.wave = WAVES.length - 1; }
  if (scene === 'loadout') G.ui.open = true;
  if (scene === 'portal') { G.player.x = 20.5; G.player.y = 3.6; G.player.z = 4; }
  document.getElementById('loading').style.display = 'none';
  window.__ready = true;
  requestAnimationFrame(loop);
}
const startBoot = () => setTimeout(boot, 30);
if (document.fonts && document.fonts.load) document.fonts.load('16px "Press Start 2P"').then(startBoot, startBoot); else startBoot();
