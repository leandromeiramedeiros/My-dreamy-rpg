'use strict';
// ---------------------------------------------------------------------------
// Touch controls (docs/design/hud-ui.md "Touch v2"):
//  * left side: a floating joystick wherever the thumb lands;
//  * right side: a circular wheel around the attack button (hold = the hand action, M1; its rim = the ultimate charge): inner arc
//    Q E + the offhand action (M2, the second button), or the pockets Z X C via the page toggle; outer arc R F Dodge and the two
//    ultimates (gold charge rings, one shared charge); Interact when a prompt is near. Tap a skill = quick-cast at the auto-target; drag past 12 px = aimed cast
//    (ease-out distance -> range, clamped), release over the button or on the X = cancel. TOUCH_AIM carries the live aim.
// Touch feeds the same ACTIONS as keyboard and pad (input.js): IN.touchMove / touchHold('attack') / touchTap(skill).
// The touch aim drives the virtual cursor (G.mouse) that game.js resolveAim() hands to the cast. Drawing lives in hud.js.
// ---------------------------------------------------------------------------
const TOUCH_CAPABLE = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const TOUCH = { ptrs: {}, lastDir: [1, 0], pendingAim: null, lastAtkT: -9, menu: null, page: 0, pageAt: -9, chargeFull: false };
// Ground-indicator contract (render.js reads this by name): non-null only while a skill is being drag-aimed.
// { skill:id, slot, aim:SKILLS[id].aim, from:{x,y} hero, to:{x,y} clamped world target, clamped:bool, cancel:bool }
let TOUCH_AIM = null;
const touchNow = () => performance.now() / 1000;
const leftHanded = () => typeof SETTINGS !== 'undefined' && SETTINGS.leftHanded;

// ---- layout (docs/design/hud-ui.md "Touch"): safe area 24 px on every edge (plus the device's env(safe-area-inset-*)) ------------
// G.safe = { l, r, t, b } in display px, read once from a CSS probe and again on resize.
function readSafeArea() {
  let ins = { l: 0, r: 0, t: 0, b: 0 };
  try {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(d); const cs = getComputedStyle(d), k = DW / (parseFloat(DISP.style.width) || DW);
    ins = { t: (parseFloat(cs.paddingTop) || 0) * k, r: (parseFloat(cs.paddingRight) || 0) * k, b: (parseFloat(cs.paddingBottom) || 0) * k, l: (parseFloat(cs.paddingLeft) || 0) * k };
    d.remove();
  } catch (e) { /* no env() support */ }
  G.safe = ins;
}
const TSAFE = () => { const s = G.safe || { l: 0, r: 0, t: 0, b: 0 }; return { l: 24 + UI.snap(s.l), r: 24 + UI.snap(s.r), t: 24 + UI.snap(s.t), b: 24 + UI.snap(s.b) }; };
// ---- circular wheel (docs/design/hud-ui.md "Touch v2") ------------------------------------------------------------------------
// C = attack centre (860,436). Angles are measured clockwise from +x in screen space (so 270 deg = straight up; the spec's
// "y up" wording cannot be literal: 235 deg would land at y 538). x = Cx + r cos a, y = Cy + r sin a; left-handed play
// mirrors x about 480. Inner arc r124 O60: Q 200, E 235, M2 270 (page 2: the pockets Z X C at the same spots). Outer arc r196
// O52: R 182, F 202, Dodge 222, Shift+Q 242, Shift+E 262; page toggle O40 at 160 deg. Interact O56 at 150 deg (prompt only).
const TDEG = Math.PI / 180;
const TOUCH_SKILL_SLOTS = ['q', 'qu', 'rmb', 'e', 'eu', 'r', 'f', 'v'];   // the aimable buttons (pockets are taps)
const TOUCH_INNER = { q: 200, e: 235, rmb: 270, z: 200, x: 235, c: 270 };
const TOUCH_PAGES = [['q', 'e', 'rmb'], ['z', 'x', 'c']];
const TOUCH_POCKET = { z: 1, x: 1, c: 1 };
// every touch target is at least 44 CSS px (docs/design/controls.md): the design-px diameter grows when the canvas is scaled down
// (a phone at 844x390 draws at 0.72, so 44 CSS px = 61 design px); at 960x540 and up nothing changes beyond the 44 floor
const touchScale = () => (parseFloat(DISP.style.width) || DW) / DW;
const touchMinD = () => Math.ceil(44 / touchScale());
const touchSize = d => Math.max(d, touchMinD());
const touchOrigin = () => { const sf = TSAFE(); return { x: Math.min(860, DW - sf.r - 52), y: Math.min(436, DH - sf.b - 80) }; };
// tablets >= 1024 px can put the pockets on a third arc instead of the page toggle
const touchShowAll9 = () => typeof SETTINGS !== 'undefined' && !!SETTINGS.showAll9 && (window.innerWidth >= 1024 || !!TOUCH.forceAll9);
function touchPolar(slot, r, deg, d, extra) {
  const o = touchOrigin(), mx = x => leftHanded() ? DW - x : x, a = deg * TDEG;
  d = touchSize(d);
  return Object.assign({ slot, x: mx(UI.snap(o.x + Math.cos(a) * r)), y: UI.snap(o.y + Math.sin(a) * r), s: d, r: d / 2 }, extra);
}
// an inner-arc skill button, optionally rotated off its home angle (page-swap animation)
const touchInner = (slot, off = 0) => touchPolar(slot, 124, TOUCH_INNER[slot] + off, 60);
function touchButtons() {
  const o = touchOrigin(), L = leftHanded(), all9 = touchShowAll9();
  const B = [{ slot: 'atk', x: L ? DW - o.x : o.x, y: o.y, s: 96, r: 48 }];
  for (const id of all9 ? TOUCH_PAGES[0] : TOUCH_PAGES[TOUCH.page]) B.push(touchInner(id));
  B.push(touchPolar('r', 196, 182, 52), touchPolar('f', 196, 202, 52), touchPolar('v', 196, 222, 52), touchPolar('qu', 196, 242, 52), touchPolar('eu', 196, 262, 52));
  if (all9) TOUCH_PAGES[1].forEach((id, i) => B.push(touchPolar(id, 260, 185 + i * 20, 52)));
  else B.push(touchPolar('toggle', 196, 160, 40));
  if (G.prompt && G.state === 'play') B.push(touchPolar('interact', 124, 150, 56));
  return B;
}
function touchHit(x, y) {
  let best = null, bd = 1e9;
  for (const b of touchButtons()) { const d = Math.hypot(x - b.x, y - b.y); if (d < b.r + 6 && d / b.r < bd) { bd = d / b.r; best = b; } }
  return best;
}
// four 40x40 icon buttons under the tracker: bag, map, help, fullscreen (controls.md: on touch the full map opens from the button
// under the tracker, never from the minimap, so a stray tap in the top-right corner cannot open it; hud-ui.md "Full map on touch")
function touchMenu() {
  const sf = TSAFE();
  const d = touchSize(40);
  return ['gear', 'map', 'help', 'full'].map((id, i) => ({ id, x: sf.l + i * (d + 4), y: Math.max(112, sf.t + 88), w: d, h: d }));
}

function toDisplay(ev) {
  const r = DISP.getBoundingClientRect();
  return [(ev.clientX - r.left) / r.width * DW, (ev.clientY - r.top) / r.height * DH];
}
function tryFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!document.fullscreenElement && req) {
    try {
      const pr = req.call(el);
      if (pr && pr.then) pr.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}), () => {});
    } catch (e) { /* not allowed here */ }
  }
}

function initTouch() {
  DISP.addEventListener('pointerdown', onTouchDown, { passive: false });
  DISP.addEventListener('pointermove', onTouchMove, { passive: false });
  DISP.addEventListener('pointerup', onTouchUp);
  DISP.addEventListener('pointercancel', onTouchUp);
  readSafeArea(); window.addEventListener('resize', readSafeArea);
  // a mouse moving again switches the HUD back to desktop layout: input.js (IN.device -> 'kbm')
}

function onTouchDown(ev) {
  if (ev.pointerType !== 'touch' && ev.pointerType !== 'pen') return;
  ev.preventDefault();               // also suppresses the emulated mouse events
  IN.setDevice('touch'); G.touch = true; initAudio();
  try { DISP.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  const [x, y] = toDisplay(ev);
  G.mouse.dx = x; G.mouse.dy = y;
  if (G.state === 'title') { tryFullscreen(); if (G.ui.settings) menuPress(ev, x, y); else titleClick(x, y); return; }
  if (G.state === 'dead') { uiClick(x, y); return; }
  if (G.ui.help) { if (!uiClick(x, y)) G.ui.help = false; return; }
  if (G.ui.open || G.ui.pause) { menuPress(ev, x, y); return; }
  // full map open: a tap on one of its controls (the close button, a shrine row) acts; a tap anywhere else closes it (like help)
  if (G.ui.map) { if (!uiClick(x, y) && typeof closeFullMap === 'function') closeFullMap(); return; }
  for (const m of touchMenu()) if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) {
    if (m.id === 'gear') { if (G.state === 'play') IN.touchTap('inventory'); }
    else if (m.id === 'map') { if (typeof openFullMap === 'function') openFullMap(); }
    else if (m.id === 'help') G.ui.help = true;
    else tryFullscreen();
    return;
  }
  const b = touchHit(x, y);
  if (b) {
    if (b.slot === 'toggle') { TOUCH.page ^= 1; TOUCH.pageAt = touchNow(); return; }
    if (TOUCH_POCKET[b.slot]) { if (G.state === 'play') { touchAim(G.player, true); TOUCH.pendingAim = { wx: G.mouse.wx, wy: G.mouse.wy }; IN.touchTap(SLOT_ACTION[b.slot]); touchHaptic(15); } return; }
    if (b.slot === 'interact') { IN.touchTap('interact'); return; }
    const t = TOUCH.ptrs[ev.pointerId] = { kind: 'btn', b, sx: x, sy: y, x, y, aiming: false };
    if (b.slot !== 'atk' && b.slot !== 'v') {   // long-press a skill button to open the bag
      t.timer = setTimeout(() => { if (TOUCH.ptrs[ev.pointerId] === t && !t.aiming) { t.long = true; IN.touchTap('inventory'); } }, 520);
    }
    if (b.slot === 'atk') {
      IN.touchHold('attack', true);
      // double-tap attack = dodge toward the movement direction
      if (G.t - TOUCH.lastAtkT < 0.3 && (typeof SETTINGS === 'undefined' || SETTINGS.doubleTapDodge)) {
        touchDodge(); TOUCH.lastAtkT = -9;
      } else TOUCH.lastAtkT = G.t;
    }
    return;
  }
  if (leftHanded() ? x > DW * 0.4 : x < DW * 0.6) TOUCH.ptrs[ev.pointerId] = { kind: 'stick', sx: x, sy: y, x, y };
}
// menus: a tap fires on release (hit regions), a long-press fires the secondary action (salvage), a drag scrolls lists
function menuPress(ev, x, y) {
  const m = TOUCH.menu = { id: ev.pointerId, x, y, lx: x, ly: y, moved: false, done: false };
  m.timer = setTimeout(() => { if (TOUCH.menu === m && !m.moved) { m.done = true; UI.click(m.x, m.y, true); } }, 450);
}
function onTouchMove(ev) {
  const m = TOUCH.menu;
  if (m && m.id === ev.pointerId) {
    ev.preventDefault(); const [x, y] = toDisplay(ev); G.mouse.dx = x; G.mouse.dy = y;
    if (Math.hypot(x - m.x, y - m.y) > 12) m.moved = true;
    if (m.moved) { G.ui.wheel = (G.ui.wheel || 0) - (y - m.ly); }
    m.lx = x; m.ly = y; return;
  }
  const t = TOUCH.ptrs[ev.pointerId]; if (!t) return;
  ev.preventDefault();
  [t.x, t.y] = toDisplay(ev);
  if (t.kind === 'stick') {
    let vx = (t.x - t.sx) / 56, vy = (t.y - t.sy) / 56;
    const l = Math.hypot(vx, vy);
    if (l > 1) { // the base follows the thumb so you never run out of stick
      t.sx += (t.x - t.sx) * (1 - 1 / l); t.sy += (t.y - t.sy) * (1 - 1 / l); vx /= l; vy /= l;
    }
    IN.touchMove(l < 0.15 ? null : { x: vx, y: vy });
  } else if (t.kind === 'btn') updateTouchAim();
}
function onTouchUp(ev) {
  const m = TOUCH.menu;
  if (m && m.id === ev.pointerId) {
    clearTimeout(m.timer); TOUCH.menu = null;
    const [x, y] = toDisplay(ev); G.mouse.dx = x; G.mouse.dy = y;
    if (!m.moved && !m.done) UI.click(x, y, false);
    return;
  }
  const t = TOUCH.ptrs[ev.pointerId]; if (!t) return;
  if (ev.type !== 'pointercancel' && ev.clientX !== undefined) [t.x, t.y] = toDisplay(ev);
  if (t.kind === 'btn' && t.aiming) updateTouchAim();   // final position decides clamp / cancel
  const ta = t.aiming ? TOUCH_AIM : null;
  delete TOUCH.ptrs[ev.pointerId];
  if (t.timer) clearTimeout(t.timer);
  if (t.kind === 'btn' && t.aiming) updateTouchAim();   // clears TOUCH_AIM when this was the aiming pointer
  if (t.long) return;
  if (t.kind === 'stick') { IN.touchMove(null); return; }
  if (t.b.slot === 'atk') { IN.touchHold('attack', Object.values(TOUCH.ptrs).some(p => p.kind === 'btn' && p.b.slot === 'atk')); return; }
  if (G.state !== 'play' || G.fadeDir) return;
  if (ev.type === 'pointercancel' || (ta && ta.cancel)) { if (ta) touchHaptic(25); return; }   // a cancelled cast costs nothing
  if (ta) { TOUCH.pendingAim = { wx: ta.to.x, wy: ta.to.y }; touchHaptic(t.b.slot === 'v' ? 40 : 15); }   // aimed cast: where the indicator was
  else if (t.b.slot === 'v') { touchDodge(); return; }
  else {
    touchAim(G.player, t);      // tap = quick-cast: auto-target (CONTROLS chain, assist cone) or the movement direction
    TOUCH.pendingAim = { wx: G.mouse.wx, wy: G.mouse.wy }; touchHaptic(15);
  }
  IN.touchTap(SLOT_ACTION[t.b.slot]);
}
// dodge toward the movement direction (button tap or double-tap attack)
function touchDodge() {
  const p = G.player, mv = IN.move, w = mv.mag > 0 ? viewDirToWorld(mv.x, mv.y) : [Math.cos(p.aim), Math.sin(p.aim)];
  TOUCH.pendingAim = { wx: p.x + w[0] * 3, wy: p.y + w[1] * 3 }; IN.touchTap('dodge'); touchHaptic(40);
}
// haptics ride IN.rumble: navigator.vibrate, guarded, behind SETTINGS.vibration
function touchHaptic(ms) { try { if (typeof IN !== 'undefined') IN.rumble(ms); } catch (e) { /* no vibration */ } }

// ---- aimed casts -----------------------------------------------------------------------------------------------------
// Drag past 12 px = aimed cast. 12..96 px maps onto 0..100 % of the skill's range with an ease-out (40 px = 60 %).
const AIM_DEAD = 12, AIM_FULL = 96, AIM_CANCEL_X = 40, AIM_X = { x: 480, y: 500, r: 32 };
const aimEase = d => 1 - Math.pow(1 - clamp((d - AIM_DEAD) / (AIM_FULL - AIM_DEAD), 0, 1), 2.25);
// SKILLS[id].aim = { shape:'cone'|'circle'|'line'|'proj'|'self'|'dash', range, r, arc, len, w } (data.js). Until a skill has
// one: skills whose cast() takes a target point are circles of range 6, the dodge is a short dash, the rest are projectiles.
function skillAimOf(id, slot) {
  const s = SKILLS[id]; if (!s) return null;
  if (s.aim) return s.aim;
  if (slot === 'v') return { shape: 'dash', range: 4, w: 1 };
  return s.cast && s.cast.length >= 4 ? { shape: 'circle', range: 6, r: 2 } : { shape: 'proj', range: 6, w: 0.6 };
}
const isSkillSlot = slot => TOUCH_SKILL_SLOTS.includes(slot);
function aimingPtr() { return Object.values(TOUCH.ptrs).find(t => t.kind === 'btn' && t.aiming); }
const activeAimPtr = () => Object.values(TOUCH.ptrs).find(t => t.kind === 'btn' && isSkillSlot(t.b.slot));
// Recomputes TOUCH_AIM from the pointers (called on every move, on release and once a frame by the HUD).
function updateTouchAim() {
  const p = G.player;
  for (const t of Object.values(TOUCH.ptrs)) {
    if (t.kind !== 'btn' || t.aiming || !isSkillSlot(t.b.slot) || G.state !== 'play') continue;
    if (Math.hypot(t.x - t.sx, t.y - t.sy) > AIM_DEAD) {
      const id = slotSkill(p, t.b.slot);
      if (id && SKILLS[id]) { t.aiming = true; clearTimeout(t.timer); touchHaptic(8); }
    }
  }
  const t = aimingPtr();
  if (!t || G.state !== 'play' || G.ui.open || G.ui.pause || G.ui.help) { TOUCH_AIM = null; return null; }
  const id = slotSkill(p, t.b.slot), aim = skillAimOf(id, t.b.slot);
  if (!aim) { TOUCH_AIM = null; return null; }
  const dx = t.x - t.sx, dy = t.y - t.sy, d = Math.hypot(dx, dy), range = aim.range || aim.len || 6;
  let dir = viewDirToWorld(dx, dy);
  if (aim.shape === 'proj' || aim.shape === 'line') {   // 10 degree snap onto an enemy near the line; circles and cones never snap
    const e = autoTarget(p, range, dir, 10 * Math.PI / 180);
    if (e) { const l = dist(p.x, p.y, e.x, e.y) || 1; dir = [(e.x - p.x) / l, (e.y - p.y) / l]; }
  }
  const k = aim.shape === 'self' ? 0 : aimEase(d) * range;
  const cancel = Math.hypot(t.x - t.b.x, t.y - t.b.y) < t.b.r || (d > AIM_CANCEL_X && Math.hypot(t.x - AIM_X.x, t.y - AIM_X.y) < AIM_X.r);
  TOUCH_AIM = { skill: id, slot: t.b.slot, aim, from: { x: p.x, y: p.y }, to: { x: p.x + dir[0] * k, y: p.y + dir[1] * k }, clamped: d >= AIM_FULL, cancel, d };
  TOUCH.lastDir = dir;
  return TOUCH_AIM;
}

// Sets the virtual cursor: a release in flight > the live drag target > nearest enemy > movement direction.
function touchAim(p, forced) {
  if (!forced && TOUCH.pendingAim) {   // a released skill / dodge: aim exactly where it was released
    G.mouse.wx = TOUCH.pendingAim.wx; G.mouse.wy = TOUCH.pendingAim.wy; TOUCH.pendingAim = null;
    const [vx, vy] = worldToView(G.mouse.wx, G.mouse.wy, p.z); G.mouse.x = vx; G.mouse.y = vy; return;
  }
  if (!forced && TOUCH_AIM) {          // while dragging, the hero faces the target
    G.mouse.wx = TOUCH_AIM.to.x; G.mouse.wy = TOUCH_AIM.to.y;
    const [vx, vy] = worldToView(G.mouse.wx, G.mouse.wy, p.z); G.mouse.x = vx; G.mouse.y = vy; return;
  }
  let dir = null, d = 3;
  const e = typeof aimAssistCone === 'function' && aimAssistCone() === 0 ? null : autoTarget(p, 9, null, 0);   // prefers elites/bosses + last hit
  if (e) { const l = dist(p.x, p.y, e.x, e.y) || 1; dir = [(e.x - p.x) / l, (e.y - p.y) / l]; d = l; }
  else if (IN.move.mag > 0) { const m = IN.move, wx = m.x + m.y, wy = m.y - m.x, l = Math.hypot(wx, wy) || 1; dir = [wx / l, wy / l]; }
  if (dir) TOUCH.lastDir = dir; else dir = TOUCH.lastDir;
  G.mouse.wx = p.x + dir[0] * d; G.mouse.wy = p.y + dir[1] * d;
  const [vx, vy] = worldToView(G.mouse.wx, G.mouse.wy, p.z);
  G.mouse.x = vx; G.mouse.y = vy;
}

// ---- charge hook ---------------------------------------------------------------------------------------------------------
// p.holdCharge (0..1, game.js holdAttack): the hold-M1 charge (Staff Channel, Bow Focus). The HUD ring (hud.js) shows it on the
// attack button and this fires the haptic click once when it fills.
function touchChargeFrac(p) {
  const f = clamp(+p.holdCharge || 0, 0, 1);
  if (f >= 1 && !TOUCH.chargeFull) { TOUCH.chargeFull = true; touchHaptic(25); } else if (f < 1) TOUCH.chargeFull = false;
  return f;
}
