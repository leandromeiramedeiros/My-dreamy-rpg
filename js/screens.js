'use strict';
// ---------------------------------------------------------------------------
// screens.js — title, death and pause / settings (docs/HUD.md "Screens"). Drawing + focus registration only:
//   title:  a row of 3 save slots (focus ids 'title:slot1..3'; selectSlot in items.js), then CONTINUE / NEW DREAM /
//           SETTINGS for the chosen slot with a diamond cursor (focus ids 'title:continue|new|settings')
//   death:  one button "Wake at shrine" (focus id 'btn:wake')
//   pause:  G.ui.pause (Esc / pad Start). From the title the same panel opens as G.ui.settings (Back instead of
//           Resume / Return to hub). The rows are GENERATED from SETTINGS_SCHEMA (sliders, toggles, choices) and
//           call setSetting(). 17 rows do not fit the 400x300 panel, so the list scrolls (wheel, drag-free: pad d-pad
//           moves the focused row into view).
// Loaded after menus.js (uses mnRegion / mnScroll / mnReveal / mnScrollbar / hudFrame).
// ---------------------------------------------------------------------------
const SET_GROUPS = [['audio', 'AUDIO'], ['game', 'GAME'], ['display', 'DISPLAY'], ['controls', 'CONTROLS']];
const settingDef = key => SETTINGS_SCHEMA.find(d => d.key === key);
function settingSteps(d) { return Math.round((d.max - d.min) / d.step); }
// dir = -1 / +1 (pad, arrows, ◄ ►); toggles flip; choices cycle; sliders move one step
function adjustSetting(d, dir) {
  const v = SETTINGS[d.key];
  if (d.type === 'toggle') setSetting(d.key, !v);
  else if (d.type === 'choice') { const i = d.options.findIndex(o => o.v === v); setSetting(d.key, d.options[(i + dir + d.options.length) % d.options.length].v); }
  else setSetting(d.key, clamp(v + dir * d.step, d.min, d.max));
  if (d.key === 'muted') G.muted = !!SETTINGS.muted;
  sfx('pickup');
}
function setSliderFromMouse(d, tx, tw) {
  const k = clamp((G.mouse.dx - tx) / tw, 0, 1);
  setSetting(d.key, d.min + Math.round(k * settingSteps(d)) * d.step);
}
// the focused settings row responds to left / right (main.js calls this instead of focus.move on those rows)
function settingsNavSideways(dir) {
  const c = UI.focus.current(); if (!c || !c.id.startsWith('set:')) return false;
  const d = settingDef(c.id.slice(4)); if (!d) return false;
  adjustSetting(d, dir); return true;
}

function drawSettingsPanel(ctx, mode) {
  const X = 280, Y = 120, W = 400, H = 300, pause = mode === 'pause';
  UI.frame(ctx, X, Y, W, H, 'primary');
  UI.text(ctx, pause ? 'PAUSED' : 'SETTINGS', X + W / 2, Y + 14, 'body', UC.gold, 'center');
  mnDivider(ctx, X + 12, Y + 42, W - 24, 2);
  const LX = X + 12, LY = Y + 50, LW = W - 40, LH = 178, ROW = 34, HEAD = 24;
  const rows = []; let total = 0;
  for (const [g, name] of SET_GROUPS) { rows.push({ head: name, y: total }); total += HEAD; for (const d of SETTINGS_SCHEMA.filter(q => q.group === g)) { rows.push({ d, y: total }); total += ROW; } }
  const fc = UI.focus.current();
  if (fc && UI.focus.showing() && fc.id.startsWith('set:')) { const r = rows.find(q => q.d && 'set:' + q.d.key === fc.id); if (r) mnReveal('set', LH, LY, r.y, ROW); }
  const off = mnScroll('set', LX, LY, LW + 20, LH, total);
  ctx.save(); ctx.beginPath(); ctx.rect(LX - 4, LY, LW + 8, LH); ctx.clip();
  for (const r of rows) {
    const y = LY + r.y - off;
    if (r.head) { if (y > LY - HEAD && y < LY + LH) UI.text(ctx, r.head, LX + 4, y + 5, 'small', UC.dim); continue; }
    const d = r.d, id = 'set:' + d.key, vis = y >= LY - ROW && y < LY + LH, full = y >= LY && y + ROW <= LY + LH;
    const tx = LX + LW - 148, tw = 120;
    const fn = () => {
      if (d.type === 'slider') setSliderFromMouse(d, tx, tw);
      else if (d.type === 'choice') adjustSetting(d, G.mouse.dx < LX + LW - 74 ? -1 : 1);
      else adjustSetting(d, 1);
    };
    const reg = full ? mnRegion(LX, y, LW, ROW - 2, id, fn, { def: r === rows[1] }) : (UI.focus.register({ x: LX, y, w: LW, h: ROW - 2 }, id, { fn }), { on: false });
    if (!vis) continue;
    if (reg.on) { ctx.fillStyle = UC.bevel; ctx.globalAlpha = 0.55; ctx.fillRect(LX, y, LW, ROW - 2); ctx.globalAlpha = 1; }
    UI.text(ctx, fitText(d.label, 190, 'small'), LX + 8, y + 9, 'small', reg.on ? UC.gold : UC.text);
    const v = SETTINGS[d.key];
    if (d.type === 'toggle') { UI.sprite(ctx, v ? 'checkOn' : 'checkOff', LX + LW - 40, y + 6, { scale: 2 }); UI.text(ctx, v ? 'On' : 'Off', LX + LW - 46, y + 9, 'small', v ? UC.text : UC.dim, 'right'); }
    else if (d.type === 'choice') {
      const o = d.options.find(q => q.v === v) || d.options[0];
      UI.text(ctx, '◄', LX + LW - 144, y + 9, 'small', UC.dim); UI.text(ctx, '►', LX + LW - 8, y + 9, 'small', UC.dim, 'right');
      UI.text(ctx, o.label, LX + LW - 76, y + 9, 'small', UC.gold, 'center');
    } else {
      const n = settingSteps(d), k = clamp((v - d.min) / (d.max - d.min), 0, 1);
      UI.frame(ctx, tx, y + 11, tw, 10, 'sliderTrack');
      if (k > 0) UI.frame(ctx, tx + 2, y + 13, Math.max(4, Math.round((tw - 4) * k)), 6, 'sliderFill');
      if (n <= 10) for (let i = 0; i <= n; i++) UI.sprite(ctx, 'sliderTick', tx + 2 + Math.round((tw - 4) * i / n), y + 22, { scale: 2 });
      UI.sprite(ctx, 'sliderKnob', tx + Math.round((tw - 14) * k), y + 7, { scale: 2 });
    }
  }
  ctx.restore();
  mnScrollbar(ctx, LX + LW + 6, LY, LH, total, off);
  mnDivider(ctx, X + 12, Y + H - 62, W - 24, 2);
  if (pause) {
    UI.button(ctx, X + 16, Y + H - 50, 160, 36, 'RESUME', { id: 'btn:resume', fn: () => { G.ui.pause = false; } });
    UI.button(ctx, X + W - 176, Y + H - 50, 160, 36, 'TO HUB', { id: 'btn:hub', fn: returnToHub });
  } else UI.button(ctx, X + W / 2 - 80, Y + H - 50, 160, 36, 'BACK', { id: 'btn:back', fn: () => { G.ui.settings = false; } });
}
function returnToHub() {
  G.ui.pause = false;
  if (G.map.id === G.world.start) { say('You are already in the hub'); return; }
  transition(G.world.start);
}
function drawPause(ctx) {
  ctx.fillStyle = '#05030c'; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  drawSettingsPanel(ctx, 'pause');
  UI.focus.draw(ctx);
}

// ===== title ==========================================================================================================================
function titleLogo() {
  if (!uiReady() || !UI.image(FONT_ART.body.src)) return null;
  return hudCached('logo', 340, 40, x => { UI.text(x, 'MY DREAMY RPG', 170, 6, 'heading', UC.gold, 'center'); });
}
// R3 #2: "rotate to play". A touch device held upright shows the 960x540 canvas at ~40 % height; until the player turns the phone
// (tryFullscreen locks landscape on the first tap), the whole canvas is this card: title art, a phone turning on its side, one line.
// G.portrait is kept by main.js fit(); hud.js drawHUD calls this instead of the HUD. The type is drawn large because the canvas
// is only ~390 css px wide in portrait.
function drawRotateCard(ctx) {
  const t = G.t || performance.now() / 1000;
  ctx.fillStyle = '#0b0716'; ctx.globalAlpha = 0.9; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  const logo = titleLogo(), bob = Math.round(Math.sin(t * 1.2) * 2) * 2;
  if (logo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(logo, 480 - 255, 26 + bob, 510, 60); } else UI.text(ctx, 'MY DREAMY RPG', 480, 40 + bob, 'heading', UC.gold, 'center');
  // the phone: an upright frame that swings onto its side and back (ease in-out, 2.4 s loop)
  const k = (t % 2.4) / 2.4, e = k < 0.45 ? 0 : k < 0.7 ? easeOut((k - 0.45) / 0.25) : k < 0.92 ? 1 : 1 - (k - 0.92) / 0.08, ang = e * Math.PI / 2;
  ctx.save(); ctx.translate(480, 218); ctx.rotate(-ang);
  ctx.fillStyle = UC.edge; ctx.fillRect(-42, -72, 84, 144);
  ctx.fillStyle = UC.line; ctx.fillRect(-38, -68, 76, 136);
  ctx.fillStyle = UC.bg; ctx.fillRect(-32, -60, 64, 120);
  ctx.fillStyle = UC.gold; ctx.fillRect(-8, -48, 16, 16); ctx.fillStyle = UC.hpHi; ctx.fillRect(-20, -8, 40, 6); ctx.fillStyle = UC.mpHi; ctx.fillRect(-20, 6, 28, 6);
  ctx.fillStyle = UC.line; ctx.fillRect(-10, 64, 20, 4);
  ctx.restore();
  ctx.globalAlpha = 1 - e * 0.6; ctx.fillStyle = UC.gold;   // two chevrons showing the turn direction
  for (const [cx, cy] of [[576, 150], [584, 218], [576, 286]]) { ctx.fillRect(cx, cy, 8, 8); ctx.fillRect(cx - 8, cy + 8, 8, 8); ctx.fillRect(cx, cy + 16, 8, 8); }
  ctx.globalAlpha = 1;
  const big = (s, y, size, col, kk) => { ctx.save(); ctx.translate(480, y); ctx.scale(kk, kk); UI.text(ctx, s, 0, 0, size, col, 'center'); ctx.restore(); };
  big('ROTATE TO PLAY', 366, 'heading', UC.gold, 1.5);
  big('Turn your phone sideways', 434, 'body', UC.text, 1.6);
  big('The game fills the screen in landscape', 480, 'small', UC.dim, 1.6);
}
function drawTitle(ctx) {
  const u = G.ui;
  ctx.fillStyle = '#0b0716'; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  const bob = Math.round(Math.sin(G.t * 1.2) * 2) * 2, logo = titleLogo();
  if (logo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(logo, 480 - 340, 160 - 40 + bob, 680, 80); } else UI.text(ctx, 'MY DREAMY RPG', 480, 140 + bob, 'heading', UC.gold, 'center');
  UI.text(ctx, 'a high-fantasy dream above the clouds', 480, 216, 'small', UC.dim, 'center');
  if (u.help) { drawHelp(ctx); return; }   // the "?" entry (below): the same overlay as in play, no title controls underneath
  const s = G.save && G.save.player ? { level: G.save.player.level, map: G.save.world && G.save.world.map } : null;
  const sure = u.confirmNew > G.t;
  const BOX = 196, RULE = 2;   // one box width for the slots and the three entries; 2 px rules (2x grid)
  // save slots (M2b): pick one, then Continue / New Dream act on it
  if (!u.settings && typeof saveSlots === 'function' && SAVE_ON) {
    if (!u.slotInfo || G.t > u.slotInfoT) { u.slotInfo = saveSlots(); u.slotInfoT = G.t + 1; }
    u.slotInfo.forEach((info, i) => {
      const n = i + 1, w = BOX, x = 480 - (w * 3 + 16) / 2 + i * (w + 8), y = 258, cur = (G.saveSlot || 1) === n;
      const r = mnRegion(x, y, w, 40, 'title:slot' + n, () => { initAudio(); selectSlot(n); u.confirmNew = 0; u.slotInfo = null; });
      ctx.fillStyle = cur ? 'rgba(255,211,90,0.16)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, w, 40);
      ctx.fillStyle = cur ? UC.gold : r.on ? UC.text : UC.bevel; ctx.fillRect(x, y + 40 - RULE, w, RULE);
      UI.text(ctx, `SLOT ${n}`, x + 8, y + 5, 'small', cur ? UC.gold : UC.text);
      UI.text(ctx, info ? fitText(`Lv ${info.level}  ${(G.world.maps[info.map] || {}).name || ''}`, w - 16) : 'empty', x + 8, y + 22, 'small', UC.dim);
    });
  }
  const items = [
    { id: 'continue', label: 'CONTINUE', sub: s ? `Lv ${s.level}  ${(G.world.maps[s.map] || {}).name || ''}` : '', off: !s, fn: () => continueGame(G.save) },
    { id: 'new', label: sure ? 'ERASE SAVE? PRESS AGAIN' : 'NEW DREAM', fn: () => { if (s && !sure) u.confirmNew = G.t + 3; else newGame(); } },
    { id: 'settings', label: 'SETTINGS', fn: () => { u.settings = true; } },
  ];
  if (!u.settings) items.forEach((it, i) => {
    const y = 320 + i * 36, w = BOX, x = 480 - w / 2;
    if (it.off) { UI.text(ctx, it.label, 480, y + 6, 'body', UC.bevel, 'center'); return; }
    const r = mnRegion(x, y, w, 32, 'title:' + it.id, () => { initAudio(); it.fn(); }, { def: s ? it.id === 'continue' : it.id === 'new' });
    const on = r.on || UI.focus.is('title:' + it.id);
    if (on) { ctx.fillStyle = 'rgba(255,211,90,0.12)'; ctx.fillRect(x, y, w, 32); ctx.fillStyle = UC.gold; ctx.fillRect(x, y + 32 - RULE, w, RULE); UI.sprite(ctx, 'bullet', x - 20, y + 9, { scale: 2, tint: UC.gold, alpha: 0.7 + 0.3 * Math.sin(G.t * 6) }); }
    UI.text(ctx, fitText(it.label, w - 8, 'body'), 480, y + 6, 'body', r.on ? UC.gold : UC.text, 'center');
    if (it.sub) UI.text(ctx, it.sub, x + w + 12, y + 9, 'small', UC.dim);
  });
  UI.focus.current();   // validate the default focus so the cursor shows on the first frame
  if (!u.settings) {   // a single "?" entry replaces the controls text wall (as in play): pad / keys reach it by focus
    const hr = mnRegion(928, 480, 24, 24, 'title:help', () => { u.help = true; UI.focus.set('btn:help-close', true); });
    UI.sprite(ctx, hr.on ? 'helpHover' : 'help', 928, 480, { scale: 2 });
  }
  if (u.settings) { ctx.fillStyle = '#05030c'; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1; drawSettingsPanel(ctx, 'title'); }
  UI.focus.draw(ctx);
}

// ===== death ==========================================================================================================================
function drawDeath(ctx) {
  const dt = G.deadT;
  ctx.fillStyle = '#0b0716'; ctx.globalAlpha = Math.min(0.7, dt * 0.5); ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  if (dt < 0.8) return;
  const a = clamp((dt - 0.8) * 2, 0, 1), p = G.player, lost = deathXpLoss(p);
  ctx.globalAlpha = a;
  UI.text(ctx, 'You fell…', 480, 200, 'heading', UC.hpHi, 'center');
  UI.text(ctx, lost ? `-${lost} XP` : 'The dream holds you gently.', 480, 252, 'small', UC.xp, 'center');
  if (dt > 1) UI.button(ctx, 400, 300, 160, 40, 'Wake at shrine', { id: 'btn:wake', def: true, size: 'small', fn: () => { if (G.deadT > 1) respawn(); } });
  ctx.globalAlpha = 1;
  UI.focus.draw(ctx);
}

// ===== full-map screen (DESIGN §25.2): M / pad D-pad down (the `map` action), or a tap on the minimap ====================
// G.ui.map = { mode: 'view' | 'shrine', sel } while open; main.js pauses the game step and routes input here (fullMapInput).
// The map is m.mini.base under the explored mask (fog of war: unexplored ground shows as a faint silhouette, UNDERGROUND
// sections stay dark until discovered). The right column lists the sections as insets (name or ??? until discovered).
// Opened while standing at a discovered shrine it is the SHRINE WARP picker: the other discovered shrines of this map are
// listed; Confirm / click warps (game.js shrineWarp: refused while any enemy is awake). Back / M / D-pad down closes.
function openFullMap() {
  if (G.state !== 'play' || G.ui.open || G.ui.pause || G.ui.help || G.warp) return false;
  const here = typeof shrineHere === 'function' ? shrineHere() : null;
  G.ui.map = { mode: here && shrineFound(G.map, here.shrineId) ? 'shrine' : 'view', sel: 0, t0: G.t };
  if ((!G.map.mini || G.map.mini.prog !== G.prog) && typeof miniBuild === 'function') miniBuild(G.map);
  G.map.mini.fullKey = null; sfx('pickup');
  return true;
}
function closeFullMap() { G.ui.map = null; }
function fullMapPick(i) {
  const L = shrineTargets(); if (!L[i]) return false;
  const ok = shrineWarp(L[i].shrineId);
  if (ok) closeFullMap();
  return ok;
}
// main.js handleInput (play state): true = consumed this step
function fullMapInput() {
  const u = G.ui;
  if (!u.map) { if (IN.pressed('map')) return openFullMap(); return false; }
  if (IN.pressed('map') || IN.pressed('back') || IN.pressed('pause')) { closeFullMap(); return true; }
  if (u.map.mode === 'shrine') {
    const n = shrineTargets().length;
    if (n) {
      if (IN.pressed('menuUp') || IN.pressed('menuLeft')) u.map.sel = (u.map.sel + n - 1) % n;
      if (IN.pressed('menuDown') || IN.pressed('menuRight')) u.map.sel = (u.map.sel + 1) % n;
      if (IN.pressed('accept') || IN.pressed('interact')) fullMapPick(u.map.sel);
    }
  }
  return true;
}
// the composite: explored base + faint silhouette, undiscovered underground blacked out (rebuilt when the fog grows)
function fullMapCanvas(m) {
  const mi = m.mini, found = (G.prog.sections && G.prog.sections[m.id]) || [];
  const key = HUD.fogTile + '|' + found.length;
  if (mi.full && mi.fullKey === key) return mi.full;
  const c = mi.full || (mi.full = document.createElement('canvas')); c.width = mi.N; c.height = mi.N;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = mi.N; const t = tmp.getContext('2d');
  t.drawImage(mi.base, 0, 0); t.globalCompositeOperation = 'destination-in'; t.drawImage(mi.rev, 0, 0);
  x.globalAlpha = 0.14; x.drawImage(mi.base, 0, 0); x.globalAlpha = 1; x.drawImage(tmp, 0, 0);
  x.fillStyle = '#05030c';
  for (const sec of m.sections || []) if (sec.under && !found.includes(sec.id))
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.secAt[j * m.W + i] === sec.i) x.fillRect(mi.ox + i - j - 2, mi.oy + i + j - 1, 4, 3);
  mi.fullKey = key;
  return c;
}
// one section row: its inset (the section's rects mapped into mini space, the bounding box of their corners) + name + kind
function sectionInset(ctx, m, sc, CX, y, CW, IH, cur, known, full) {
  const mi = m.mini;
  ctx.fillStyle = cur ? 'rgba(158,240,255,0.14)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(CX, y, CW, IH);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [rx, ry, rw, rh] of sc.rects || [[0, 0, m.W, m.H]]) for (const [cx, cy] of [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]]) { const a = mi.ox + cx - cy, b = mi.oy + cx + cy; x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
  const iw = IH - 8, sk = Math.min(iw / Math.max(1, x1 - x0), iw / Math.max(1, y1 - y0));
  if (known || !sc.under) { ctx.imageSmoothingEnabled = false; ctx.drawImage(full, x0, y0, x1 - x0, y1 - y0, CX + 4, y + 4, (x1 - x0) * sk, (y1 - y0) * sk); }
  else { ctx.fillStyle = '#05030c'; ctx.fillRect(CX + 4, y + 4, iw, iw); }
  UI.text(ctx, known ? fitText(sc.name || sc.id, CW - IH - 12) : '???', CX + IH + 4, y + 8, 'small', known ? UC.text : UC.dim);
  UI.text(ctx, sc.kind || '', CX + IH + 4, y + 26, 'small', UC.dim);
}
function drawFullMap(ctx) {
  const m = G.map, u = G.ui.map, p = G.player; if (!m.mini) return;
  const mi = m.mini, found = (G.prog.sections && G.prog.sections[m.id]) || [];
  ctx.fillStyle = '#05030c'; ctx.globalAlpha = 0.78; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  UI.frame(ctx, 24, 24, 912, 492, 'primary');
  UI.text(ctx, m.name.toUpperCase(), 48, 40, 'body', UC.gold);
  UI.text(ctx, u.mode === 'shrine' ? 'SHRINE WARP' : 'MAP', 912, 40, 'small', UC.dim, 'right');
  // the map, fitted into 600 x 420
  const MW = 600, MH = 420, MX = 44, MY = 76, P = MINI_PAD - 4, inner = mi.N - P * 2, k = Math.min(MW / inner, MH / inner), dw = inner * k;
  const dx = MX + (MW - dw) / 2 - P * k, dy = MY + (MH - dw) / 2 - P * k;   // the pad is cropped: the map diamond fills the box
  ctx.imageSmoothingEnabled = false; ctx.drawImage(fullMapCanvas(m), P, P, inner, inner, Math.round(dx + P * k), Math.round(dy + P * k), Math.round(dw), Math.round(dw));
  const at = (x, y) => [dx + (mi.ox + x - y) * k, dy + (mi.oy + x + y) * k];
  const targets = typeof shrineTargets === 'function' ? shrineTargets(m) : [];
  for (const o of shrinesOf(m)) if (shrineFound(m, o.shrineId)) {
    const [sx, sy] = at(o.x, o.y), sel = u.mode === 'shrine' && targets[u.sel] === o;
    ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(sx) - 5, UI.snap(sy) - 5, 10, 10);
    ctx.fillStyle = sel ? UC.gold : '#9ef0ff'; ctx.fillRect(UI.snap(sx) - 3, UI.snap(sy) - 3, 6, 6);
    if (sel) UI.sprite(ctx, 'bullet', sx - 7, sy - 20, { scale: 2, tint: UC.gold, alpha: 0.6 + 0.4 * Math.sin(G.t * 6) });
  }
  for (const pt of m.portals) if (pt.open && mi.vis[Math.floor(pt.y) * m.W + Math.floor(pt.x)]) { const [qx, qy] = at(pt.x, pt.y); ctx.fillStyle = UC.gold; ctx.fillRect(UI.snap(qx) - 2, UI.snap(qy) - 2, 4, 4); }
  const [hx, hy] = at(p.x, p.y);
  ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(hx) - 5, UI.snap(hy) - 5, 10, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(UI.snap(hx) - 3, UI.snap(hy) - 3, 6, 6);
  // right column: shrine list (picker) or section insets
  const CX = 664, CW = 248;
  if (u.mode === 'shrine') {
    const awake = anyEnemyAwake();
    UI.text(ctx, 'WARP TO', CX, 80, 'small', UC.gold);
    if (!targets.length) UI.text(ctx, 'No other shrine attuned yet.', CX, 104, 'small', UC.dim);
    targets.forEach((o, i) => {
      const y = 100 + i * 34, sel = i === u.sel;
      ctx.fillStyle = sel ? 'rgba(255,211,90,0.16)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(CX, y, CW, 30);
      UI.text(ctx, fitText(o.shrineName || (sectionAt(m, o.x, o.y) || {}).name || 'Shrine', CW - 16), CX + 8, y + 9, 'small', sel ? UC.gold : UC.text);
      UI.hit(CX, y, CW, 30, () => { u.sel = i; fullMapPick(i); }, { id: 'map:shrine' + i });
    });
    if (awake) UI.text(ctx, 'Enemies are awake: warping is blocked.', CX, 100 + Math.max(1, targets.length) * 34 + 8, 'small', UC.hpHi);
  } else {
    UI.text(ctx, 'SECTIONS', CX, 80, 'small', UC.gold);
    const secs = (m.sections || []).filter(sc => sc.id !== 'main' || m.sections.length === 1);
    const cur = sectionAt(m, p.x, p.y), full = fullMapCanvas(m), IH = Math.min(70, Math.floor(400 / Math.max(1, secs.length)) - 6);
    secs.forEach((sc, i) => sectionInset(ctx, m, sc, CX, 98 + i * (IH + 6), CW, IH, sc === cur, found.includes(sc.id), full));
  }
  const hint = IN.device === 'pad' ? `${IN.glyph('back')} close` : 'M / Esc close';
  UI.text(ctx, u.mode === 'shrine' && targets.length ? hint + '   arrows pick   Enter warp' : hint, 480, 496, 'small', UC.dim, 'center');
}

// ===== §29 G3 the vantage reveal (world-art minutes §3.1.6) =======================================================================
// A trigger action { type: 'vantage', id, r, title, sub } (game.js runAction -> startVantage) on a summit:
//   0 - 0.6 s   the camera eases 40 px down-slope (main.js cameraBias reads G.vantage.lead), letterbox bars slide in;
//   0.6 s       the fog of war lifts within r tiles (hud.js miniRevealArea);
//   0.6 - 3.1 s the cinematic: desktop first pulls back (a half-scale snapshot of the real world, drawn ONCE: preview + resident chunks
//               + the columns and props of a 2x view, through drawItem under a 0.5 transform), then both tiers cross to the 1/4-res
//               ground preview (maps.js groundPreview) centred on the hero, the fog edge growing outward, shrine / portal dots, the
//               section insets and the vantage name;
//   3.1 - 3.5 s back to the live scene. Phones never render a bigger scene: the preview blit only. ~1 ms a frame, no new raster.
const VANTAGE_T = { ease: 0.6, film: 2.5, out: 0.4 };
function startVantage(a) {
  const p = G.player, m = G.map; if (!p || !m || G.vantage) return false;
  // down-slope: the direction (of 8) whose ground 4-8 tiles out is lowest
  let best = null;
  for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4, fx = Math.cos(ang), fy = Math.sin(ang); let lo = 0, n = 0; for (let d = 4; d <= 8; d++) { const x = p.x + fx * d, y = p.y + fy * d; if (typeAt(m, Math.floor(x), Math.floor(y))) { lo += tileH(m, x, y); n++; } else { lo -= 2; n++; } } const v = lo / Math.max(1, n); if (!best || v < best.v) best = { v, fx, fy }; }
  const sx = (best.fx - best.fy) * 16, sy = (best.fx + best.fy) * 8, l = Math.hypot(sx, sy) || 1;
  G.vantage = { id: a.id || 'vantage', t0: G.t, r: +a.r || 24, x: p.x, y: p.y, lead: [0, 0], aim: [sx / l * 40, sy / l * 40], title: a.title || (sectionAt(m, p.x, p.y) || {}).name || m.name, sub: a.sub || '', revealed: false, snap: null };
  sfx('shrine');
  return true;
}
function vantageSnapshot(m) {   // desktop pull-back: the world at 0.5x around the camera, drawn once into a scene-sized canvas
  const V = makeCanvas(RW, RH), x = V.x, th = m.theme, bg = th._bg, k = 0.5;
  x.imageSmoothingEnabled = false;
  if (bg && bg.sky) x.drawImage(bg.sky.c, 0, 0, bg.sky.c.width, bg.sky.c.height, 0, 0, RW, RH * 1.4);
  x.setTransform(k, 0, 0, k, RW / 2 * (1 - k), RH / 2 * (1 - k));
  const g = m.gp, pv = groundPreview(m);
  x.drawImage(pv, Math.round(g.minSX - camX + RW / 2), Math.round(-camY + RH / 2), pv.width * 4, pv.height * 4);
  const cg = chunkGrid(m);
  for (const [, ch] of CHUNK.cache) if (ch.m === m) { const ci = ch.idx % cg.nx, cj = (ch.idx / cg.nx) | 0; x.drawImage(ch.c, Math.round(ci * cg.S + g.minSX - camX + RW / 2), Math.round(cj * cg.S - camY + RH / 2)); }
  const pts = [[-RW, -RH - 120], [RW * 2, -RH - 120], [-RW, RH * 2 + 240], [RW * 2, RH * 2 + 240]].map(([vx, vy]) => toWorld(vx - RW / 2 + camX, vy - RH / 2 + camY));
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), items = [];
  for (const c of gridQuery(m, 'cols', Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))) if (!c.gone && c.img) items.push(c);
  for (const o of gridQuery(m, 'objs', Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))) if (o.kind === 'sprite' && !o.gone && o.img && !o.critter) items.push(o);
  items.sort((a, b) => a.key - b.key);
  for (const it of items) { if (it.kind === 'sprite' && it.tree && it._split) continue; drawItem(x, it, []); }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'soft-light'; x.globalAlpha = 0.25; if (GRADE[m.themeId]) x.drawImage(GRADE[m.themeId], 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  return V.c;
}
function drawVantage(ctx) {
  const V = G.vantage, m = G.map, p = G.player; if (!V || !m) return;
  const t = G.t - V.t0, T1 = VANTAGE_T.ease, T2 = T1 + VANTAGE_T.film, T3 = T2 + VANTAGE_T.out;
  if (t >= T3) { G.vantage = null; return; }
  p.rootT = Math.max(p.rootT, 0.1); p.invulnT = Math.max(p.invulnT, 0.2);
  const e = clamp(t / T1, 0, 1); V.lead = [V.aim[0] * e * e * (3 - 2 * e), V.aim[1] * e * e * (3 - 2 * e)];
  if (t >= T1 && !V.revealed) { V.revealed = true; if (typeof miniRevealArea === 'function') V.newTiles = miniRevealArea(m, V.x, V.y, V.r); }
  const bars = Math.round(54 * clamp(Math.min(t / 0.35, (T3 - t) / 0.35), 0, 1));
  if (t >= T1) {
    const u = (t - T1) / VANTAGE_T.film, fade = clamp(Math.min(u / 0.08, (T3 - t) / VANTAGE_T.out), 0, 1);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // the pull-back (desktop): the snapshot zooms from 1:1 with the live frame (display scale 4) to half scale (2)
    const pull = !PHONE ? clamp(u / 0.32, 0, 1) : 1, mapA = clamp((u - (PHONE ? 0 : 0.26)) / 0.14, 0, 1);
    if (!PHONE && mapA < 1) {
      if (!V.snap) V.snap = vantageSnapshot(m);
      const s = 2 * (2 - pull * pull * (3 - 2 * pull)), w = RW * s, h = RH * s;
      ctx.globalAlpha = fade; ctx.drawImage(V.snap, Math.round(DW / 2 - w / 2), Math.round(DH / 2 - h / 2), Math.round(w), Math.round(h));
    }
    if (mapA > 0) {
      ctx.globalAlpha = fade * mapA; ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, DW, DH);
      const g = m.gp, pv = groundPreview(m), ws = 0.5 - 0.16 * clamp(u, 0, 1), ps = 8 * ws;   // world scale 0.5 -> 0.34; a preview px = 4 world px
      const hx = (isoX(V.x, V.y) - g.minSX) / 4, hy = isoY(V.x, V.y, 0) / 4, ox = DW / 2 - hx * ps, oy = DH / 2 + 20 - hy * ps;
      const R = V.r * 16 * 2 * ws * clamp((u - 0.05) / 0.55, 0.08, 1), cx = DW / 2, cy = DH / 2 + 20;   // the fog edge: an iso circle growing out
      ctx.globalAlpha = fade * mapA * 0.22; ctx.drawImage(pv, Math.round(ox), Math.round(oy), Math.round(pv.width * ps), Math.round(pv.height * ps));
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.41, R * 0.71, 0, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = fade * mapA; ctx.drawImage(pv, Math.round(ox), Math.round(oy), Math.round(pv.width * ps), Math.round(pv.height * ps));
      ctx.restore();
      ctx.globalAlpha = fade * mapA * 0.85; ctx.strokeStyle = '#e8dcff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.41, R * 0.71, 0, 0, Math.PI * 2); ctx.stroke();
      const at = (x, y) => [ox + (isoX(x, y) - g.minSX) / 4 * ps, oy + isoY(x, y, 0) / 4 * ps];
      ctx.globalAlpha = fade * mapA;
      for (const o of (typeof shrinesOf === 'function' ? shrinesOf(m) : [])) { const [sx, sy] = at(o.x, o.y); ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(sx) - 5, UI.snap(sy) - 5, 10, 10); ctx.fillStyle = '#9ef0ff'; ctx.fillRect(UI.snap(sx) - 3, UI.snap(sy) - 3, 6, 6); }
      for (const pt of m.portals) { const [qx, qy] = at(pt.x, pt.y); ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(qx) - 4, UI.snap(qy) - 4, 8, 8); ctx.fillStyle = pt.open ? UC.gold : '#8a7aa8'; ctx.fillRect(UI.snap(qx) - 2, UI.snap(qy) - 2, 4, 4); }
      const [hx2, hy2] = at(V.x, V.y); ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(hx2) - 5, UI.snap(hy2) - 5, 10, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(UI.snap(hx2) - 3, UI.snap(hy2) - 3, 6, 6);
      // the section insets (the full map's), right column
      if (m.mini) {
        const secs = (m.sections || []).filter(sc => sc.id !== 'main' || m.sections.length === 1), found = (G.prog.sections && G.prog.sections[m.id]) || [], full = fullMapCanvas(m), cur = sectionAt(m, V.x, V.y);
        const IH = Math.min(52, Math.floor(300 / Math.max(1, secs.length)) - 6), slide = 1 - clamp((u - 0.3) / 0.2, 0, 1);
        secs.forEach((sc, i) => sectionInset(ctx, m, sc, DW - 236 + Math.round(slide * 260), 92 + i * (IH + 6), 212, IH, sc === cur, found.includes(sc.id) || sc === cur, full));
      }
    }
    ctx.restore();
  }
  if (bars > 0) { ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, DW, bars); ctx.fillRect(0, DH - bars, DW, bars); }
  if (t >= T1) {
    const a = clamp(Math.min((t - T1 - 0.35) / 0.4, (T3 - 0.2 - t) / 0.3), 0, 1);
    if (a > 0) { ctx.globalAlpha = a; UI.text(ctx, String(V.title).toUpperCase(), DW / 2, 14, 'body', UC.gold, 'center'); if (V.sub) UI.text(ctx, V.sub, DW / 2, DH - 40, 'small', UC.text, 'center'); ctx.globalAlpha = 1; }
  }
}
