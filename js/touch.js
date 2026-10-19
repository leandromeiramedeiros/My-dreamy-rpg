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
const TOUCH = { ptrs: {}, lastDir: [1, 0], pendingAim: null, lastAtkT: -9 };
const TC = { cx: DW - 92, cy: DH - 92 };
const leftHanded = () => typeof SETTINGS !== 'undefined' && SETTINGS.leftHanded;

function touchButtons() {
  const L = leftHanded(), cx = L ? 92 : TC.cx, cy = TC.cy, m = L ? -1 : 1;   // left-handed: mirrored cluster
  const B = [{ slot: 'atk', x: cx, y: cy, r: 42 }];
  ['q', 'e', 'r'].forEach((s, i) => { const a = (190 + i * 35) * Math.PI / 180; B.push({ slot: s, x: cx + Math.cos(a) * 100 * m, y: cy + Math.sin(a) * 100, r: 27 }); });
  ['f', 'c', 'shift', '1', '2', '3'].forEach((s, i) => { const a = (180 + i * 19) * Math.PI / 180; B.push({ slot: s, x: cx + Math.cos(a) * 168 * m, y: cy + Math.sin(a) * 168, r: 24 }); });
  const near = typeof G !== 'undefined' && G.prompt;
  if (near) B.push({ slot: 'interact', x: cx + 46 * m, y: cy - 96, r: 22 });
  B.push({ slot: 'pot', x: cx + 46 * m, y: cy - 96 - (near ? 52 : 0), r: 22 });   // health potion
  return B;
}
const TOUCH_MENU = [
  { id: 'gear', label: 'GEAR', x: DW - 246, y: 12, w: 64, h: 32 },
  { id: 'help', label: 'HELP', x: DW - 246, y: 50, w: 64, h: 32 },
  { id: 'full', label: 'FULL', x: DW - 246, y: 88, w: 64, h: 32 },
];
const minimapPos = () => G.touch ? [DW - 150, 10] : [DW - 150, DH - 150];

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
  // a mouse moving again switches the HUD back to desktop layout: input.js (IN.device -> 'kbm')
}

function onTouchDown(ev) {
  if (ev.pointerType !== 'touch' && ev.pointerType !== 'pen') return;
  ev.preventDefault();               // also suppresses the emulated mouse events
  IN.setDevice('touch'); G.touch = true; initAudio();
  try { DISP.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  const [x, y] = toDisplay(ev);
  G.mouse.dx = x; G.mouse.dy = y;
  if (G.state === 'title') { tryFullscreen(); titleClick(x, y); return; }
  if (G.state === 'dead') { if (G.deadT > 1) respawn(); return; }
  if (G.ui.help) { G.ui.help = false; return; }
  if (G.ui.open) { uiClick(x, y); return; }
  for (const m of TOUCH_MENU) if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) {
    if (m.id === 'gear') { if (G.state === 'play') IN.touchTap('inventory'); }
    else if (m.id === 'help') G.ui.help = true;
    else tryFullscreen();
    return;
  }
  for (const b of touchButtons()) {
    if (Math.hypot(x - b.x, y - b.y) < b.r + 8) {
      TOUCH.ptrs[ev.pointerId] = { kind: 'btn', b, sx: x, sy: y, x, y };
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
function onTouchMove(ev) {
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
  const t = TOUCH.ptrs[ev.pointerId]; if (!t) return;
  delete TOUCH.ptrs[ev.pointerId];
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
  // joystick
  for (const t of Object.values(TOUCH.ptrs)) if (t.kind === 'stick') {
    ctx.fillStyle = 'rgba(18,10,36,0.35)'; ctx.strokeStyle = 'rgba(199,168,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(t.sx, t.sy, 56, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const l = Math.hypot(t.x - t.sx, t.y - t.sy), k = l > 56 ? 56 / l : 1;
    ctx.fillStyle = 'rgba(255,214,236,0.75)';
    ctx.beginPath(); ctx.arc(t.sx + (t.x - t.sx) * k, t.sy + (t.y - t.sy) * k, 24, 0, Math.PI * 2); ctx.fill();
  }
  // aim preview while holding a skill
  const a = activeAimPtr();
  if (a && G.state === 'play') {
    const sk = SKILLS[slotSkill(p, a.b.slot)];
    const [px, py] = worldToView(p.x, p.y, p.z + 1);
    ctx.strokeStyle = rgba(sk ? sk.color : '#ffffff', 0.85); ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(px * 2, py * 2); ctx.lineTo(G.mouse.x * 2, G.mouse.y * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(G.mouse.x * 2, G.mouse.y * 2, 22, 11, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // buttons
  for (const b of touchButtons()) {
    const held = Object.values(TOUCH.ptrs).some(t => t.kind === 'btn' && t.b.slot === b.slot);
    if (b.slot === 'pot') {
      ctx.fillStyle = 'rgba(18,10,36,0.6)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      drawIcon(ctx, miscIcon('potion'), b.x - 14, b.y - 14, 28);
      if (!p.potions) { ctx.fillStyle = 'rgba(10,4,20,0.6)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#ff8aa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      T(ctx, String(p.potions), b.x + b.r - 6, b.y + b.r - 10, 8, '#ffffff');
      continue;
    }
    if (b.slot === 'interact') {
      ctx.fillStyle = 'rgba(18,10,36,0.7)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = HC.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      T(ctx, G.prompt ? G.prompt.text.split(' ')[0].toUpperCase() : 'USE', b.x, b.y - 4, 8, HC.gold, 'center');
      continue;
    }
    const id = b.slot === 'atk' ? null : slotSkill(p, b.slot), sk = id ? SKILLS[id] : null;
    ctx.fillStyle = held ? 'rgba(255,214,236,0.35)' : 'rgba(18,10,36,0.6)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    const s = Math.round(b.r * 1.15);
    if (b.slot === 'atk') drawIcon(ctx, itemIcon(p.equip.weapon), b.x - 24, b.y - 24, 48);
    else if (sk) drawIcon(ctx, skillIcon(id), b.x - s / 2, b.y - s / 2, s);
    if (sk) {
      const cd = p.cds[id] || 0;
      if (cd > 0) {
        ctx.fillStyle = 'rgba(10,4,20,0.7)'; ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cd / (p.cdm[id] || sk.cd)); ctx.closePath(); ctx.fill();
        T(ctx, cd >= 1 ? Math.ceil(cd) + '' : cd.toFixed(1), b.x, b.y - 4, 8, '#ffffff', 'center');
      } else if ((sk.mp || 0) > p.mp || (sk.st || 0) > p.st) { ctx.fillStyle = 'rgba(40,60,160,0.55)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.strokeStyle = b.slot === 'r' ? HC.gold : (b.slot === 'f' || b.slot === 'c' || b.slot === 'shift') ? '#8fb0ff' : (/\d/.test(b.slot) ? '#ffb0e0' : HC.line);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    if (b.slot !== 'atk') T(ctx, SLOT_LABEL[b.slot], b.x - b.r + 2, b.y - b.r - 2, 8, '#ffffff');
  }
  for (const m of TOUCH_MENU) { panel(ctx, m.x, m.y, m.w, m.h); T(ctx, m.label, m.x + m.w / 2, m.y + 12, 8, HC.text, 'center'); }
}
