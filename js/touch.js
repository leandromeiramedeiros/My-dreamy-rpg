'use strict';
// ---------------------------------------------------------------------------
// Touch controls, mobile-ARPG style:
//  * left side: a floating joystick wherever the thumb lands;
//  * right side: a big attack button (hold) ringed by the skill buttons.
//    Tap a skill to auto-target the nearest enemy, or drag from it to aim and release to cast.
// Touch feeds the same ACTIONS as keyboard and pad (input.js): IN.touchMove / touchHold('attack') / touchTap(skill).
// The touch aim drives the virtual cursor (G.mouse) that game.js resolveAim() hands to the cast.
// Double-tap attack = dodge toward the movement direction; a context Interact button takes the potion's place
// (the potion moves up a row) while a chest / shrine / tablet is in reach.
// ---------------------------------------------------------------------------
const TOUCH_CAPABLE = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const TOUCH = { ptrs: {}, lastDir: [1, 0], pendingAim: null, lastAtkT: -9, menu: null };
const leftHanded = () => typeof SETTINGS !== 'undefined' && SETTINGS.leftHanded;

// ---- layout (docs/HUD.md "Touch"): safe area 24 px on every edge (plus the device's env(safe-area-inset-*)) ------------
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
// right cluster: attack 88 at (848,428); potion 48 at (848,352); skills as 48 px squares in two arcs around the attack
// centre: [Q E R] at radius 112, [F C SHF 1 2 3] at radius 176. Left-handed play mirrors everything across the screen.
function touchButtons() {
  const L = leftHanded(), sf = TSAFE(), cx0 = Math.min(848, DW - sf.r - 44), cy = Math.min(428, DH - sf.b - 44);
  const mx = x => L ? DW - x : x, cx = cx0, deg = Math.PI / 180;
  const B = [{ slot: 'atk', x: mx(cx), y: cy, s: 88, r: 44 }];
  const arc = (ids, r, a0, step) => ids.forEach((id, i) => { const a = (a0 + i * step) * deg; B.push({ slot: id, x: mx(UI.snap(cx + Math.cos(a) * r)), y: UI.snap(cy + Math.sin(a) * r), s: 48, r: 24 }); });
  arc(['q', 'e', 'r'], 112, 175, 30);
  arc(['f', 'c', 'shift', '1', '2', '3'], 176, 172, 18);
  const near = typeof G !== 'undefined' && G.prompt;
  if (near) B.push({ slot: 'interact', x: mx(cx), y: cy - 76, s: 48, r: 24 });
  B.push({ slot: 'pot', x: mx(cx), y: cy - 76 - (near ? 56 : 0), s: 48, r: 24 });   // health potion
  return B;
}
// three 40x40 icon buttons under the tracker: bag, help, fullscreen
function touchMenu() {
  const sf = TSAFE();
  return ['gear', 'help', 'full'].map((id, i) => ({ id, x: sf.l + i * 44, y: Math.max(112, sf.t + 88), w: 40, h: 40 }));
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
  for (const m of touchMenu()) if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) {
    if (m.id === 'gear') { if (G.state === 'play') IN.touchTap('inventory'); }
    else if (m.id === 'help') G.ui.help = true;
    else tryFullscreen();
    return;
  }
  for (const b of touchButtons()) {
    if (Math.max(Math.abs(x - b.x), Math.abs(y - b.y)) < b.s / 2 + 8) {
      TOUCH.ptrs[ev.pointerId] = { kind: 'btn', b, sx: x, sy: y, x, y };
      if (b.slot !== 'atk' && b.slot !== 'pot' && b.slot !== 'interact') {   // long-press the skill bar to open the bag
        const t = TOUCH.ptrs[ev.pointerId];
        t.timer = setTimeout(() => { if (TOUCH.ptrs[ev.pointerId] === t && !dragging(t)) { t.long = true; IN.touchTap('inventory'); } }, 520);
      }
      if (b.slot === 'atk') {
        IN.touchHold('attack', true);
        // double-tap attack = dodge toward the movement direction
        if (G.t - TOUCH.lastAtkT < 0.3 && (typeof SETTINGS === 'undefined' || SETTINGS.doubleTapDodge)) {
          const p = G.player, mv = IN.move, w = mv.mag > 0 ? viewDirToWorld(mv.x, mv.y) : [Math.cos(p.aim), Math.sin(p.aim)];
          TOUCH.pendingAim = { wx: p.x + w[0] * 3, wy: p.y + w[1] * 3 }; IN.touchTap('dodge'); TOUCH.lastAtkT = -9;
        } else TOUCH.lastAtkT = G.t;
      }
      if (b.slot === 'pot') { delete TOUCH.ptrs[ev.pointerId]; IN.touchTap('potion'); }
      if (b.slot === 'interact') { delete TOUCH.ptrs[ev.pointerId]; IN.touchTap('interact'); }
      return;
    }
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
  }
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
  delete TOUCH.ptrs[ev.pointerId];
  if (t.timer) clearTimeout(t.timer);
  if (t.long) return;
  if (t.kind === 'stick') { IN.touchMove(null); return; }
  if (t.b.slot === 'atk') { IN.touchHold('attack', Object.values(TOUCH.ptrs).some(p => p.kind === 'btn' && p.b.slot === 'atk')); return; }
  if (G.state !== 'play' || G.fadeDir) return;
  const p = G.player;
  touchAim(p, t);               // resolve the final aim for this cast; resolveAim() uses it on the next step
  TOUCH.pendingAim = { wx: G.mouse.wx, wy: G.mouse.wy };
  IN.touchTap(SLOT_ACTION[t.b.slot]);
}
const dragging = t => t && t.kind === 'btn' && Math.hypot(t.x - t.sx, t.y - t.sy) > 16;
function activeAimPtr() { return Object.values(TOUCH.ptrs).find(t => t.kind === 'btn' && t.b.slot !== 'atk' && t.b.slot !== 'pot' && t.b.slot !== 'interact'); }

// Sets the virtual cursor: dragged skill > dragged attack > nearest enemy > movement direction.
function touchAim(p, forced) {
  if (!forced && TOUCH.pendingAim) {   // a released skill / double-tap dodge: aim exactly where it was released
    G.mouse.wx = TOUCH.pendingAim.wx; G.mouse.wy = TOUCH.pendingAim.wy; TOUCH.pendingAim = null;
    const [vx, vy] = worldToView(G.mouse.wx, G.mouse.wy, p.z); G.mouse.x = vx; G.mouse.y = vy; return;
  }
  const t = forced || activeAimPtr() || Object.values(TOUCH.ptrs).find(q => q.kind === 'btn');
  let dir = null, d = 3;
  if (dragging(t)) {
    const w = toWorld((t.x - t.sx) / 2, (t.y - t.sy) / 2), l = Math.hypot(w[0], w[1]) || 1;
    dir = [w[0] / l, w[1] / l]; d = clamp(Math.hypot(t.x - t.sx, t.y - t.sy) / 80 * 7, 1.5, 7);
  } else {
    const e = typeof aimAssistCone === 'function' && aimAssistCone() === 0 ? null : autoTarget(p, 9, null, 0);   // prefers elites/bosses + last hit
    if (e) { const l = dist(p.x, p.y, e.x, e.y) || 1; dir = [(e.x - p.x) / l, (e.y - p.y) / l]; d = l; }
    else if (IN.move.mag > 0) { const m = IN.move, wx = m.x + m.y, wy = m.y - m.x, l = Math.hypot(wx, wy) || 1; dir = [wx / l, wy / l]; }
  }
  if (dir) TOUCH.lastDir = dir; else dir = TOUCH.lastDir;
  G.mouse.wx = p.x + dir[0] * d; G.mouse.wy = p.y + dir[1] * d;
  const [vx, vy] = worldToView(G.mouse.wx, G.mouse.wy, p.z);
  G.mouse.x = vx; G.mouse.y = vy;
}

function drawTouchControls(ctx) {
  const p = G.player;
  // floating joystick: frames on the 2x grid, no thin lines
  for (const t of Object.values(TOUCH.ptrs)) if (t.kind === 'stick') {
    UI.frame(ctx, UI.snap(t.sx) - 56, UI.snap(t.sy) - 56, 112, 112, 'plain', { alpha: 0.4 });
    const l = Math.hypot(t.x - t.sx, t.y - t.sy), k = l > 56 ? 56 / l : 1;
    UI.frame(ctx, UI.snap(t.sx + (t.x - t.sx) * k) - 24, UI.snap(t.sy + (t.y - t.sy) * k) - 24, 48, 48, 'slot', { alpha: 0.85 });
  }
  // aim preview while holding a skill: a row of 4 px pips and a pip reticle
  const a = activeAimPtr();
  if (a && G.state === 'play') {
    const sk = SKILLS[slotSkill(p, a.b.slot)], col = sk ? sk.color : '#ffffff';
    const [px, py] = worldToView(p.x, p.y, p.z + 1), x0 = px * 2, y0 = py * 2, x1 = G.mouse.x * 2, y1 = G.mouse.y * 2, n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 16));
    ctx.fillStyle = col; ctx.globalAlpha = 0.85;
    for (let i = 1; i <= n; i++) ctx.fillRect(UI.snap(x0 + (x1 - x0) * i / n) - 2, UI.snap(y0 + (y1 - y0) * i / n) - 2, 4, 4);
    for (const [dx, dy] of [[-16, 0], [16, 0], [0, -8], [0, 8]]) ctx.fillRect(UI.snap(x1 + dx) - 2, UI.snap(y1 + dy) - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
  for (const b of touchButtons()) {
    const held = Object.values(TOUCH.ptrs).some(t => t.kind === 'btn' && t.b.slot === b.slot), x = b.x - b.s / 2, y = b.y - b.s / 2;
    if (b.slot === 'pot') {
      const st = skillSlotState(p, 'pot');
      hudSlot(ctx, x, y, 48, UC.hp, miscIcon('potion'), { gray: !p.potions });
      UI.text(ctx, p.potions, x + 44, y + 30, 'small', UC.text, 'right');
      if (st.cd > 0) UI.sweep(ctx, x + 4, y + 4, 40, 40, st.cd, {});
      continue;
    }
    if (b.slot === 'interact') {
      hudSlot(ctx, x, y, 48, UC.gold, null);
      UI.text(ctx, G.prompt ? G.prompt.text.split(' ')[0].toUpperCase() : 'USE', b.x, b.y - 8, 'small', UC.gold, 'center');
      continue;
    }
    if (b.slot === 'atk') {
      hudSlot(ctx, x, y, 88, UC.line, null);
      ctx.drawImage(itemIcon(p.equip.weapon), x + 20, y + 20, 48, 48);
      if (held) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25; ctx.fillRect(x + 4, y + 4, 80, 80); ctx.globalAlpha = 1; }
      continue;
    }
    const st = skillSlotState(p, b.slot), ult = b.slot === 'r';
    hudSlot(ctx, x, y, 48, !st.id ? UC.bevel : ult ? UC.gold : elColor(st.element), st.id ? skillIcon(st.id) : null, { gray: !!st.mpShort || !!st.stShort });
    if (st.id) {
      if (ult && st.charge < 1) UI.sweep(ctx, x + 4, y + 4, 40, 40, 1 - st.charge, { label: Math.floor(st.charge * 100) + '' });
      else if (st.cdFrac > 0) UI.sweep(ctx, x + 4, y + 4, 40, 40, st.cdFrac, { label: st.cd >= 1 ? Math.ceil(st.cd) + '' : st.cd.toFixed(1) });
      if (st.unavailable) { ctx.fillStyle = UC.edge; ctx.globalAlpha = 0.5; ctx.fillRect(x + 4, y + 4, 40, 40); ctx.globalAlpha = 1; }
      if (held) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25; ctx.fillRect(x + 4, y + 4, 40, 40); ctx.globalAlpha = 1; }
    }
  }
  // bag / help / fullscreen
  for (const m of touchMenu()) {
    UI.frame(ctx, m.x, m.y, 40, 40, 'plain');
    if (m.id === 'gear') ctx.drawImage(miscIcon('chest'), m.x + 4, m.y + 4, 32, 32);
    else if (m.id === 'help') UI.sprite(ctx, 'help', m.x + 8, m.y + 8, { scale: 2 });
    else { ctx.fillStyle = UC.text; for (const [cx, cy, dx, dy] of [[10, 10, 1, 1], [30, 10, -1, 1], [10, 30, 1, -1], [30, 30, -1, -1]]) { ctx.fillRect(m.x + cx - (dx < 0 ? 6 : 0), m.y + cy - (dy < 0 ? 2 : 0), 6, 2); ctx.fillRect(m.x + cx - (dx < 0 ? 2 : 0), m.y + cy - (dy < 0 ? 6 : 0), 2, 6); } }
  }
}
