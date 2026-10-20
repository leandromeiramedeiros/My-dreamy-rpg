'use strict';
// ---------------------------------------------------------------------------
// input.js — the action layer (docs/CONTROLS.md). The game reads ACTIONS, never keys.
// Keyboard + mouse, the Gamepad API and touch (touch.js) all write into one table that is snapshotted once per
// fixed update step by IN.update(dt). Loaded after hud.js, before touch.js / main.js; main.js calls IN.init(canvas).
//
// API
//   IN.update(dt)               poll pads, resolve this step's action states (main.js, once per update step)
//   IN.pressed(a) / IN.held(a) / IN.released(a)   per-step edges. Menu directions auto-repeat while held
//                               (pressed pulses after 0.35 s, then every 0.11 s).
//   IN.value(a)                 analog 0..1 (pad triggers), 1/0 for digital sources
//   IN.move                     { x, y, mag }  screen-space move vector (x right, y down), |v| <= 1
//   IN.aim                      { x, y, mag, mode: 'cursor'|'stick'|'auto' }  stick = right stick (sticky 0.4 s),
//                               cursor = mouse, auto = pad/touch without stick input (game.js auto-targets)
//   IN.device                   'kbm' | 'pad' | 'touch' — last device that produced input. IN.padStyle 'xbox'|'ps'.
//   IN.glyph(action, device?)   prompt text for the action on that device ('' on touch): 'SPACE', 'LMB', 'A', '✕'…
//   IN.glyphInfo(action, dev?)  { text, device, style, src, sprite } — sprite = UI_ART sprite name when one exists
//                               (xboxA, psCross, …) so the HUD can draw the real button art; else draw text in a keycap.
//   IN.assist()                 true when aim assist applies (stick / touch, never mouse)
//   Bindings (stored in the save as `bindings`, defaults per device):
//     IN.getBindings() -> { kbm:{action:[codes]}, pad:{action:[srcs]} }   IN.setBindings(b) (validated)
//     IN.bindingsFor(action, device) -> [codes]     IN.resetBindings(device?)
//     IN.rebind(device, action, code, { slot:0, swap:true }) -> { ok, conflict, swapped }
//         a conflict = another action in the same context (play / menu; 'global' actions clash with both) bound to
//         that code. swap:false reports the conflict without applying; swap:true gives the other action our old code.
//     IN.capture(device, cb) -> the next key / mouse / pad button goes to cb(code) instead of the game; IN.cancelCapture()
//     kbm codes are KeyboardEvent.code ('KeyQ', 'Space', 'ShiftLeft') plus 'Mouse0'/'Mouse1'/'Mouse2'.
//     pad sources are standard-mapping button indices (0 = A/✕ … 15 = d-pad right) or 'LS-up'/'LS-down'/'LS-left'/'LS-right'.
//   Touch feed (touch.js): IN.touchHold(action, on), IN.touchTap(action), IN.touchMove(vec|null), IN.setDevice('touch')
//   IN.consume(code)            ignore a held key/button until released (a click the UI already used)
//   IN.rumble(ms, strength)     navigator.vibrate on touch, the pad's vibrationActuator on pad (after a user gesture)
//   IN.ACTIONS                  the action list.  IN.LABEL[action] = display name for the rebinding screen.
//   Hold-to-aim (docs/HUD.md "Touch v2", desktop + pad), setting SETTINGS.groundIndicators:
//     IN.aimMode() -> 'off' | 'hold' | 'always'   ('off' on touch: touch.js owns aiming there)
//       auto   = (default) per device: keyboard + mouse 'off', pad 'hold'
//       off    = skills cast on press (M2a behaviour), no indicator (kbm: a faint range ring while hovering a skill slot)
//       hold   = skills cast on RELEASE; holding a skill key / button 0.15 s shows its ground indicator (a pad shows it at
//                once while the right stick is deflected)
//       always = skills cast on release; the indicator shows from the first frame of the hold
//     IN.aimHold -> { action, slot, t, show } | null  the skill being held (render.js draws its indicator when show)
//     IN.aimCasts -> [actions] released this step (game.js casts them); a press + release inside one step casts at once;
//       pressing another skill key fires the held one first; a swallowed hold (screen opened) is dropped, no cast.
//     IN.clearAimHold()  drop the hold (menus, death, map fades)
// ---------------------------------------------------------------------------
const IN = (() => {
  const ACTIONS = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'attack', 'skillQ', 'skillE', 'skillR', 'skillF', 'skillC', 'dodge',
    's1', 's2', 's3', 'potion', 'interact', 'inventory', 'character', 'quests', 'bestiary', 'map', 'pause', 'help', 'mute',
    'menuUp', 'menuDown', 'menuLeft', 'menuRight', 'accept', 'back', 'menuAlt', 'menuInfo', 'tabPrev', 'tabNext'];
  const LABEL = { moveUp: 'Move up', moveDown: 'Move down', moveLeft: 'Move left', moveRight: 'Move right', attack: 'Attack',
    skillQ: 'Weapon skill Q', skillE: 'Weapon skill E', skillR: 'Ultimate', skillF: 'Chest skill', skillC: 'Helmet skill', dodge: 'Dodge',
    s1: 'Character skill 1', s2: 'Character skill 2', s3: 'Character skill 3', potion: 'Potion', interact: 'Interact',
    inventory: 'Inventory', character: 'Character', quests: 'Quests', bestiary: 'Bestiary', map: 'Map', pause: 'Pause', help: 'Help', mute: 'Sound on/off',
    menuUp: 'Menu up', menuDown: 'Menu down', menuLeft: 'Menu left', menuRight: 'Menu right', accept: 'Confirm', back: 'Back',
    menuAlt: 'Secondary (salvage)', menuInfo: 'Compare', tabPrev: 'Previous tab', tabNext: 'Next tab' };
  const MENU = new Set(['menuUp', 'menuDown', 'menuLeft', 'menuRight', 'accept', 'back', 'menuAlt', 'menuInfo', 'tabPrev', 'tabNext']);
  const GLOBAL = new Set(['inventory', 'character', 'quests', 'bestiary', 'map', 'pause', 'help', 'mute']);
  const REPEAT = new Set(['menuUp', 'menuDown', 'menuLeft', 'menuRight']);
  const ctxOf = a => GLOBAL.has(a) ? 'global' : MENU.has(a) ? 'menu' : 'play';

  const DEFAULTS = {
    kbm: {
      moveUp: ['KeyW', 'ArrowUp'], moveDown: ['KeyS', 'ArrowDown'], moveLeft: ['KeyA', 'ArrowLeft'], moveRight: ['KeyD', 'ArrowRight'],
      attack: ['Mouse0'], skillQ: ['KeyQ'], skillE: ['KeyE'], skillR: ['KeyR'], skillF: ['KeyF'], skillC: ['KeyC'],
      dodge: ['ShiftLeft', 'ShiftRight', 'Mouse2'], s1: ['Digit1'], s2: ['Digit2'], s3: ['Digit3'], potion: ['Digit4'],
      interact: ['Space'], inventory: ['Tab', 'KeyI'], character: ['KeyK'], quests: ['KeyJ'], bestiary: ['KeyB'], map: ['KeyM'], pause: ['Escape'],
      help: ['KeyH'], mute: ['KeyN'],
      menuUp: ['ArrowUp', 'KeyW'], menuDown: ['ArrowDown', 'KeyS'], menuLeft: ['ArrowLeft', 'KeyA'], menuRight: ['ArrowRight', 'KeyD'],
      accept: ['Enter', 'Space'], back: ['Escape', 'Backspace'], menuAlt: ['KeyX'], menuInfo: ['KeyC'], tabPrev: ['KeyQ'], tabNext: ['KeyE'],
    },
    pad: {
      moveUp: [], moveDown: [], moveLeft: [], moveRight: [],   // the left stick (not rebindable)
      attack: [7], dodge: [6], skillQ: [5], skillE: [4], skillF: [2], skillC: [3], skillR: [11], interact: [0], potion: [1],
      s1: [14], s2: [12], s3: [15], map: [13], pause: [9], inventory: [8], character: [], quests: [], bestiary: [], help: [], mute: [],
      menuUp: [12, 'LS-up'], menuDown: [13, 'LS-down'], menuLeft: [14, 'LS-left'], menuRight: [15, 'LS-right'],
      accept: [0], back: [1], menuAlt: [2], menuInfo: [3], tabPrev: [4], tabNext: [5],
    },
  };
  const copy = b => JSON.parse(JSON.stringify(b));
  let B = copy(DEFAULTS);

  // ---- raw device state --------------------------------------------------------------------------------
  const keys = new Set(), downEdge = new Set(), upEdge = new Set(), ignored = new Set(), padIgnored = new Set();
  const touchHeld = new Set(), touchTaps = new Set();
  let touchVec = null;
  const pad = { btn: [], prev: [], val: [], axes: [0, 0, 0, 0], connected: false, id: '' };
  const st = {};
  for (const a of ACTIONS) st[a] = { held: false, pressed: false, released: false, value: 0, holdT: 0, rep: 0 };
  let capture = null, canvas = null, lastStickT = -9, clock = 0;
  const aim = { x: 1, y: 0, mag: 0, mode: 'cursor' }, move = { x: 0, y: 0, mag: 0 };
  const api = { device: 'kbm', padStyle: 'xbox', aim, move, ACTIONS, LABEL, DEFAULTS };

  const setDevice = d => { if (api.device !== d) { api.device = d; if (typeof G !== 'undefined') G.touch = d === 'touch'; } };

  // ---- keyboard / mouse --------------------------------------------------------------------------------------
  const PREVENT = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace']);
  function codeDown(code) {
    if (capture && capture.device === 'kbm') { const cb = capture.cb; capture = null; cb(code); ignored.add(code); return; }
    if (!keys.has(code)) downEdge.add(code);
    keys.add(code); setDevice('kbm');
  }
  function codeUp(code) { if (keys.has(code)) upEdge.add(code); keys.delete(code); ignored.delete(code); }
  function onKeyDown(ev) {
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (PREVENT.has(ev.code)) ev.preventDefault();
    if (ev.repeat) return;
    codeDown(ev.code || ev.key);
  }
  function onKeyUp(ev) { codeUp(ev.code || ev.key); }
  function mousePos(ev) {
    if (!canvas || typeof G === 'undefined') return;
    const r = canvas.getBoundingClientRect();
    G.mouse.dx = (ev.clientX - r.left) / r.width * DW;
    G.mouse.dy = (ev.clientY - r.top) / r.height * DH;
    G.mouse.x = G.mouse.dx / 2; G.mouse.y = G.mouse.dy / 2;
  }
  function onMouseMove(ev) {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    mousePos(ev);
    if (Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0) > 2 || api.device === 'pad') { setDevice('kbm'); if (typeof UI !== 'undefined') UI.focus.nav = false; }
  }
  function onMouseDown(ev) { mousePos(ev); codeDown('Mouse' + ev.button); }
  function onMouseUp(ev) { codeUp('Mouse' + ev.button); }
  function clearAll() { for (const k of keys) upEdge.add(k); keys.clear(); ignored.clear(); touchHeld.clear(); touchVec = null; }

  function init(cv) {
    canvas = cv;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAll);
    cv.addEventListener('mousemove', onMouseMove);
    cv.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('gamepadconnected', ev => { api.padStyle = styleOf(ev.gamepad && ev.gamepad.id); });
  }

  // ---- gamepad ---------------------------------------------------------------------------------------------
  // Sony pads report 'DualSense…' / 'Wireless Controller (… Vendor: 054c …)'; Xbox pads also say 'Wireless Controller'
  const styleOf = id => /xbox|045e/i.test(id || '') ? 'xbox' : /054c|playstation|dualshock|dualsense|wireless controller/i.test(id || '') ? 'ps' : 'xbox';
  // radial deadzone, rescaled so the edge of the deadzone = 0 and full tilt = 1
  function radial(x, y, dz) {
    const m = Math.hypot(x, y); if (m <= dz) return [0, 0, 0];
    const k = Math.min(1, (m - dz) / (1 - dz)); return [x / m * k, y / m * k, k];
  }
  const deadzone = which => typeof moveDeadzone === 'function' ? (which === 'move' ? moveDeadzone() : aimDeadzone()) : (which === 'move' ? 0.22 : 0.28);
  function pollPad() {
    let gp = null;
    try { const list = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of list || []) if (g && g.connected !== false && g.buttons && g.buttons.length) { gp = g; break; } } catch (e) { gp = null; }
    pad.prev = pad.btn; pad.btn = [];
    pad.connected = !!gp;
    if (!gp) { pad.axes = [0, 0, 0, 0]; return; }
    if (gp.id !== pad.id) { pad.id = gp.id; api.padStyle = styleOf(gp.id); }
    let any = false;
    gp.buttons.forEach((b, i) => {
      const v = typeof b === 'number' ? b : (b.value || 0), on = typeof b === 'number' ? b > 0.5 : (b.pressed || v > 0.5);
      pad.btn[i] = on; pad.val[i] = on ? Math.max(v, 1e-3) : v;
      if (on && !pad.prev[i]) any = true;
      if (!on) padIgnored.delete(i);
    });
    const ax = gp.axes || [];
    pad.axes = [ax[0] || 0, ax[1] || 0, ax[2] || 0, ax[3] || 0];
    const l = radial(pad.axes[0], pad.axes[1], deadzone('move')), r = radial(pad.axes[2], pad.axes[3], deadzone('aim'));
    if (capture && capture.device === 'pad') { const i = pad.btn.findIndex((on, k) => on && !pad.prev[k]); if (i >= 0) { const cb = capture.cb; capture = null; cb(i); return; } }
    if (any || l[2] > 0.25 || r[2] > 0.25) setDevice('pad');
  }
  function padSrc(src) {
    if (typeof src === 'number' && padIgnored.has(src)) return { on: false, edge: false, v: 0 };
    if (typeof src === 'number') return { on: !!pad.btn[src], edge: !!pad.btn[src] && !pad.prev[src], v: pad.val[src] || 0 };
    const [x, y] = [pad.axes[0], pad.axes[1]];
    const v = src === 'LS-up' ? -y : src === 'LS-down' ? y : src === 'LS-left' ? -x : src === 'LS-right' ? x : 0;
    return { on: v > 0.55, edge: false, v: Math.max(0, v) };
  }

  // ---- per-step resolution -----------------------------------------------------------------------------------
  // ---- hold-to-aim ----
  const AIM_SKILL = { skillQ: 'q', skillE: 'e', skillR: 'r', skillF: 'f', skillC: 'c', s1: '1', s2: '2', s3: '3' };
  let aimHold = null; const aimCasts = [];
  // 'auto' (the default) = per device: keyboard + mouse cast on press ('off': the cursor already aims, release adds
  // latency), pad 'hold'. An explicit off / hold / always from the settings screen overrides on every device.
  let aimMigrated = false;
  function aimMode() {
    if (api.device === 'touch' || (typeof G !== 'undefined' && G.touch)) return 'off';
    if (!aimMigrated && typeof SETTINGS !== 'undefined') {   // one-time: saves from before 'auto' stored the old default 'hold'
      aimMigrated = true;
      try { if (!localStorage.getItem('dreamy.gi.v2')) { localStorage.setItem('dreamy.gi.v2', '1'); if (SETTINGS.groundIndicators === 'hold' && typeof setSetting === 'function') setSetting('groundIndicators', 'auto'); } } catch (e) { /* ignore */ }
    }
    const m = typeof SETTINGS !== 'undefined' ? SETTINGS.groundIndicators : 'auto';
    if (m === 'off' || m === 'always' || m === 'hold') return m;
    return api.device === 'pad' ? 'hold' : 'off';
  }
  function updateAimHold(dt) {
    aimCasts.length = 0;
    const mode = aimMode();
    if (mode === 'off') { aimHold = null; return; }
    if (aimHold && !st[aimHold.action].held) { if (st[aimHold.action].released) aimCasts.push(aimHold.action); aimHold = null; }
    for (const a in AIM_SKILL) {
      const s = st[a]; if (!s.pressed) continue;
      if (!s.held) { aimCasts.push(a); continue; }                      // pressed and released inside one step
      if (aimHold && aimHold.action === a) continue;
      if (aimHold) aimCasts.push(aimHold.action);                        // a second skill key fires the held one
      aimHold = { action: a, slot: AIM_SKILL[a], t: 0, show: false };
    }
    if (aimHold) { aimHold.t += dt; aimHold.show = mode === 'always' || aimHold.t >= 0.15 || (api.device === 'pad' && aim.mag > 0); }
  }
  function update(dt) {
    clock += dt;
    pollPad();
    const usingPad = pad.connected;
    for (const a of ACTIONS) {
      const s = st[a], wasHeld = s.held;
      let held = false, edge = false, value = 0;
      for (const c of B.kbm[a] || []) { if (keys.has(c) && !ignored.has(c)) { held = true; value = 1; } if (downEdge.has(c) && !ignored.has(c)) edge = true; }
      if (usingPad) for (const c of B.pad[a] || []) { const r = padSrc(c); if (r.on) held = true; if (r.edge) edge = true; value = Math.max(value, r.v); }
      if (touchHeld.has(a)) { held = true; value = 1; }
      if (touchTaps.has(a)) edge = true;
      s.pressed = edge || (held && !wasHeld);
      s.released = (!held && wasHeld) || (edge && !held);
      s.held = held; s.value = held ? Math.max(value, 1e-3) : value;
      if (REPEAT.has(a)) {
        if (held) { s.holdT += dt; if (s.holdT > 0.35) { s.rep -= dt; if (s.rep <= 0) { s.rep = 0.11; s.pressed = true; } } } else { s.holdT = 0; s.rep = 0; }
      }
    }
    downEdge.clear(); upEdge.clear(); touchTaps.clear();
    updateAimHold(dt);
    // move: pad stick > touch stick > keys
    let mx = 0, my = 0, mm = 0;
    const l = usingPad ? radial(pad.axes[0], pad.axes[1], deadzone('move')) : [0, 0, 0];
    if (l[2] > 0) { mx = l[0]; my = l[1]; mm = l[2]; }
    else if (touchVec) { mx = touchVec.x; my = touchVec.y; mm = Math.min(1, Math.hypot(mx, my) * 1.25); }
    else {
      mx = (st.moveRight.held ? 1 : 0) - (st.moveLeft.held ? 1 : 0); my = (st.moveDown.held ? 1 : 0) - (st.moveUp.held ? 1 : 0);
      mm = mx || my ? 1 : 0;
    }
    move.x = mx; move.y = my; move.mag = mm;
    // aim: right stick (sticky 0.4 s) > mouse cursor (kbm) > auto
    const r = usingPad ? radial(pad.axes[2], pad.axes[3], deadzone('aim')) : [0, 0, 0];
    if (r[2] > 0) { aim.x = r[0] / r[2]; aim.y = r[1] / r[2]; aim.mag = r[2]; aim.mode = 'stick'; lastStickT = clock; }
    else if (api.device === 'pad' && clock - lastStickT < 0.4) aim.mode = 'stick';
    else { aim.mode = api.device === 'kbm' ? 'cursor' : 'auto'; aim.mag = 0; }
    if (typeof G !== 'undefined' && G.mouse) G.mouse.down = st.attack.held;
  }

  // ---- queries -------------------------------------------------------------------------------------------------
  Object.assign(api, {
    init, update, setDevice,
    pressed: a => !!(st[a] && st[a].pressed), held: a => !!(st[a] && st[a].held), released: a => !!(st[a] && st[a].released),
    aimMode, aimCasts, clearAimHold() { aimHold = null; },
    value: a => (st[a] ? st[a].value : 0),
    assist: () => api.device === 'touch' || (api.device === 'pad' && aim.mode !== 'cursor'),
    consume(code) { ignored.add(code); downEdge.delete(code); },
    // swallow(): this step's presses are used up (a screen opened / closed); everything held stays ignored until
    // released, so B closing the bag doesn't also drink a potion and A on "close" doesn't also Interact
    swallow() {
      for (const a of ACTIONS) { st[a].pressed = false; st[a].released = false; st[a].held = false; }
      for (const k of keys) ignored.add(k);
      pad.btn.forEach((on, i) => { if (on) padIgnored.add(i); });
      touchHeld.clear(); touchTaps.clear(); downEdge.clear();
    },
    touchHold(a, on) { if (on) touchHeld.add(a); else touchHeld.delete(a); },
    touchTap(a) { touchTaps.add(a); },
    touchMove(v) { touchVec = v; },
    pad,
  });

  // ---- glyphs -----------------------------------------------------------------------------------------------
  const KEYNAME = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL', ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT',
    Tab: 'TAB', Escape: 'ESC', Enter: 'ENTER', Backspace: 'BKSP', ArrowUp: '▲', ArrowDown: '▼', ArrowLeft: '◄', ArrowRight: '►',
    Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', CapsLock: 'CAPS', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  const keyName = c => KEYNAME[c] || (/^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^Numpad\d$/.test(c) ? 'NUM' + c.slice(6) : /^F\d+$/.test(c) ? c : String(c).toUpperCase());
  const PAD_TEXT = {
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'LS', 'RS', 'D▲', 'D▼', 'D◄', 'D►', 'HOME'],
    ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPTIONS', 'L3', 'R3', 'D▲', 'D▼', 'D◄', 'D►', 'PS'],
  };
  const PAD_SPRITE = {
    xbox: ['xboxA', 'xboxB', 'xboxX', 'xboxY', 'xboxLB', 'xboxRB', 'xboxLT', 'xboxRT'],
    ps: ['psCross', 'psCircle', 'psSquare', 'psTriangle', 'psL1', 'psR1', 'psL2', 'psR2'],
  };
  const PSEUDO = { move: { kbm: 'WASD', pad: 'LS', sprite: 'padStick' }, aim: { kbm: 'MOUSE', pad: 'RS', sprite: 'padStick' } };
  function glyphInfo(a, device = api.device) {
    const style = api.padStyle;
    if (device === 'touch') return { text: '', device, style, src: null, sprite: a === 'interact' || a === 'accept' ? 'touchTap' : null };
    if (PSEUDO[a]) return { text: PSEUDO[a][device === 'pad' ? 'pad' : 'kbm'], device, style, src: null, sprite: device === 'pad' ? PSEUDO[a].sprite : null };
    const list = (B[device === 'pad' ? 'pad' : 'kbm'][a] || []);
    const src = list.find(c => typeof c === 'number') ?? list[0];
    if (src == null) return { text: '', device, style, src: null, sprite: null };
    if (device === 'pad') {
      if (typeof src !== 'number') return { text: 'LS', device, style, src, sprite: 'padStick' };
      return { text: PAD_TEXT[style][src] || 'B' + src, device, style, src, sprite: PAD_SPRITE[style][src] || null };
    }
    return { text: keyName(src), device: 'kbm', style, src, sprite: null };
  }
  api.glyphInfo = glyphInfo;
  api.glyph = (a, device) => glyphInfo(a, device).text;
  api.keyName = keyName;

  // ---- bindings ---------------------------------------------------------------------------------------------
  api.getBindings = () => copy(B);
  api.bindingsFor = (a, device = 'kbm') => (B[device] && B[device][a] || []).slice();
  api.setBindings = b => {
    B = copy(DEFAULTS);
    if (!b || typeof b !== 'object') return false;
    for (const dev of ['kbm', 'pad']) {
      const src = b[dev]; if (!src || typeof src !== 'object') continue;
      for (const a of ACTIONS) {
        const v = src[a]; if (!Array.isArray(v)) continue;
        const ok = v.filter(c => dev === 'kbm' ? typeof c === 'string' && c.length < 32 : (Number.isInteger(c) && c >= 0 && c < 32) || /^LS-(up|down|left|right)$/.test(c));
        B[dev][a] = ok.slice(0, 4);
      }
    }
    return true;
  };
  api.resetBindings = device => { if (device) B[device] = copy(DEFAULTS[device]); else B = copy(DEFAULTS); };
  api.rebind = (device, a, code, o = {}) => {
    if (!B[device] || !ACTIONS.includes(a)) return { ok: false, conflict: null, swapped: false };
    const slot = o.slot || 0, swap = o.swap !== false, cx = ctxOf(a);
    const clash = ACTIONS.find(b => b !== a && (B[device][b] || []).includes(code) && (cx === 'global' || ctxOf(b) === 'global' || ctxOf(b) === cx));
    if (clash && !swap) return { ok: false, conflict: clash, swapped: false };
    const list = B[device][a] = (B[device][a] || []).slice(), old = list[slot];
    if (clash) { const other = B[device][clash] = B[device][clash].slice(), i = other.indexOf(code); if (old != null && !other.includes(old)) other[i] = old; else other.splice(i, 1); }
    const dup = list.indexOf(code); if (dup >= 0 && dup !== slot) list.splice(dup, 1);
    list[Math.min(slot, list.length)] = code;
    return { ok: true, conflict: clash || null, swapped: !!clash };
  };
  api.capture = (device, cb) => { capture = { device, cb }; };
  api.cancelCapture = () => { capture = null; };
  api.capturing = () => !!capture;

  // ---- rumble -------------------------------------------------------------------------------------------------
  api.rumble = (ms = 10, strength = 0.5) => {
    if (typeof SETTINGS !== 'undefined' && SETTINGS.vibration === false) return;
    try {
      if (api.device === 'touch' && navigator.vibrate) navigator.vibrate(ms);
      else if (api.device === 'pad') {
        const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(g => g && g.vibrationActuator);
        if (gp) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength });
      }
    } catch (e) { /* unsupported */ }
  };
  Object.defineProperty(api, 'aimHold', { get: () => aimHold, enumerable: true });   // live (Object.assign would copy a snapshot)
  return api;
})();
