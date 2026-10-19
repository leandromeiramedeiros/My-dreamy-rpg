'use strict';
// ---------------------------------------------------------------------------
// screens.js — title, death and pause / settings (docs/HUD.md "Screens"). Drawing + focus registration only:
//   title:  CONTINUE / NEW DREAM / SETTINGS with a diamond cursor (focus ids 'title:continue|new|settings')
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
function titleControlsHint() {
  if (IN.device === 'touch' || TOUCH_CAPABLE && IN.device !== 'kbm' && IN.device !== 'pad') return 'Left thumb moves   hold the big button to attack   tap or drag skills to cast   hold a skill for the bag';
  if (IN.device === 'pad') return `${IN.glyph('skillQ')} ${IN.glyph('skillE')} skills   ${IN.glyph('attack')} attack   ${IN.glyph('dodge')} dodge   ${IN.glyph('interact')} interact   ${IN.glyph('inventory')} bag   ${IN.glyph('pause')} pause`;
  return `WASD move   mouse aim   ${IN.glyph('attack')} attack   Q E R F C ${IN.glyph('dodge')} 1 2 3 skills   ${IN.glyph('potion')} potion   ${IN.glyph('inventory')} bag   ${IN.glyph('pause')} pause`;
}
function drawTitle(ctx) {
  const u = G.ui;
  ctx.fillStyle = '#0b0716'; ctx.globalAlpha = 0.4; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  const bob = Math.round(Math.sin(G.t * 1.2) * 2) * 2, logo = titleLogo();
  if (logo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(logo, 480 - 340, 160 - 40 + bob, 680, 80); } else UI.text(ctx, 'MY DREAMY RPG', 480, 140 + bob, 'heading', UC.gold, 'center');
  UI.text(ctx, 'a high-fantasy dream above the clouds', 480, 216, 'small', UC.dim, 'center');
  const s = G.save && G.save.player ? { level: G.save.player.level, map: G.save.world && G.save.world.map } : null;
  const sure = u.confirmNew > G.t;
  const items = [
    { id: 'continue', label: 'CONTINUE', sub: s ? `Lv ${s.level}  ${(G.world.maps[s.map] || {}).name || ''}` : '', off: !s, fn: () => continueGame(G.save) },
    { id: 'new', label: sure ? 'ERASE SAVE? PRESS AGAIN' : 'NEW DREAM', fn: () => { if (s && !sure) u.confirmNew = G.t + 3; else newGame(); } },
    { id: 'settings', label: 'SETTINGS', fn: () => { u.settings = true; } },
  ];
  if (!u.settings) items.forEach((it, i) => {
    const y = 320 + i * 36, w = Math.max(200, UI.measure(it.label, 'body') + 40), x = 480 - w / 2;
    if (it.off) { UI.text(ctx, it.label, 480, y + 6, 'body', UC.bevel, 'center'); return; }
    const r = mnRegion(x, y, w, 32, 'title:' + it.id, () => { initAudio(); it.fn(); }, { def: s ? it.id === 'continue' : it.id === 'new' });
    if (r.on) { UI.sprite(ctx, 'bullet', x - 8, y + 9, { scale: 2, tint: UC.gold, alpha: 0.7 + 0.3 * Math.sin(G.t * 6) }); }
    UI.text(ctx, it.label, 480, y + 6, 'body', r.on ? UC.gold : UC.text, 'center');
    if (it.sub) UI.text(ctx, it.sub, x + w + 12, y + 9, 'small', UC.dim);
  });
  UI.text(ctx, titleControlsHint(), 480, 500, 'small', UC.dim, 'center');
  if (TOUCH_CAPABLE && window.innerHeight > window.innerWidth) UI.text(ctx, 'Turn your device sideways for the best view', 480, 460, 'small', UC.hpHi, 'center');
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
