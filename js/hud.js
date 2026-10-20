'use strict';
// ---------------------------------------------------------------------------
// hud.js — the PLAY HUD, "Dream Glass" (docs/HUD.md). Layout only: every primitive (bitmap font, 9-slice frames,
// bars, sweeps, toasts, tooltips, hit regions, focus) comes from ui.js. The Tab screens, title, death and the
// pause / settings screen live in menus.js; the touch layout in touch.js.
//
// Everything is on the 2x grid (even coordinates). Static pieces (slot frames, portrait frame, minimap base + fog)
// are cached in offscreen canvases; only the dynamic parts are drawn per frame.
//
// Entry: drawHUD(ctx) (main.js render, after the scene is blitted). Scene overlays (damage numbers, nameplates,
// loot names) draw first and stay visible behind the dimmed Tab screens; the play HUD is hidden while a screen is open.
// ---------------------------------------------------------------------------
const HUD = { cache: {}, gray: new WeakMap(), uid: 0, trk: { key: '', t0: 0 }, ready: {}, lvl: { n: 0, t: -9 }, bossPhase: false, bossShakeT: -9,
  breakT: -9, fogTile: '' };
const UC = UI.C;
const SLOT_GROUPS = [{ x: 350, slots: ['lmb', 'q', 'e', 'r'] }, { x: 552, slots: ['f', 'c', 'shift'] }, { x: 706, slots: ['1', '2', '3'] }];
const SLOT_PITCH = 48, SLOT_Y = 484, SLOT = 44, POTION_X = 858;
const SLOT_LABEL = { lmb: 'LMB', q: 'Q', e: 'E', r: 'R', f: 'F', c: 'C', shift: 'SHF', 1: '1', 2: '2', 3: '3', pot: '4' };
const EL_ICON_COL = { slash: 'physical', pierce: 'physical' };
const uiReady = () => !!(typeof UI_ART !== 'undefined' && UI.image(UI_ART.src));
const elColor = el => UI.el(EL_ICON_COL[el] || el);
const easeOut = k => 1 - (1 - k) * (1 - k);
const pctText = v => Math.round((v || 0) * 100) + '%';

// ---- offscreen cache -------------------------------------------------------------------------------------------
function hudCached(key, w, h, draw) {
  if (!uiReady()) return null;   // atlas still decoding: callers fall back to a direct draw
  let c = HUD.cache[key];
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; draw(x); HUD.cache[key] = c; }
  return c;
}
// a frame drawn through the cache (static kinds only: not 'rarity', which colour-cycles for mythic)
function hudFrame(ctx, x, y, w, h, kind, o) {
  const k = `f|${kind}|${w}x${h}|${(o && (o.el || o.col || o.tint)) || ''}`;
  const c = hudCached(k, w, h, cx => UI.frame(cx, 0, 0, w, h, kind, o));
  if (c) ctx.drawImage(c, x, y); else UI.frame(ctx, x, y, w, h, kind, o);
}
// slot = backdrop (cached) + icon + tinted rim (cached). The 16 px game icons draw at 2x (32) inside the 36 px interior.
function hudSlot(ctx, x, y, s, rimCol, icon, o = {}) {
  hudFrame(ctx, x, y, s, s, 'slot');
  if (icon) hudIcon(ctx, icon, x + (s - 32) / 2, y + (s - 32) / 2 + (o.dy || 0), o);
  hudFrame(ctx, x, y, s, s, 'slotRim', { tint: rimCol });
}
function grayOf(img) {
  let g = HUD.gray.get(img);
  if (!g) {
    g = document.createElement('canvas'); g.width = img.width; g.height = img.height; const x = g.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, g.width, g.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const v = (a[i] * 0.3 + a[i + 1] * 0.55 + a[i + 2] * 0.15) * 0.8; a[i] = a[i + 1] = a[i + 2] = v; }
    x.putImageData(d, 0, 0); HUD.gray.set(img, g);
  }
  return g;
}
function hudIcon(ctx, img, x, y, o = {}) {
  const s = (o.size || 32);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(o.gray ? grayOf(img) : img, UI.snap(x), UI.snap(y), s, s);
}
const statIcon = id => { try { return BUFFS[id] ? buffIcon(id) : null; } catch (e) { return null; } };

// ---- small shared widgets (also used by menus.js / touch.js) ----------------------------------------------------------
// element chip: 20 px slot, element-coloured pip inside; state tints the rim (weak = yellow, resist = grey)
function elChip(ctx, x, y, el, state, s = 20) {
  const rim = state === 'weak' ? UC.weak : state === 'resist' ? UC.resist : UC.line;
  hudFrame(ctx, x, y, s, s, 'slot'); hudFrame(ctx, x, y, s, s, 'slotRim', { tint: rim });
  if (el) UI.sprite(ctx, 'bullet', x + (s - 14) / 2, y + (s - 14) / 2, { scale: 2, tint: elColor(el) });
  else UI.text(ctx, '?', x + s / 2, y + (s - 14) / 2 + 2, 'small', UC.dim, 'center');
}
// prompt glyph: real pad art when the glyph sheet has it, else a keycap with the key name; returns drawn width
function hudGlyph(ctx, action, x, y, o = {}) {
  const gi = IN.glyphInfo(action, o.device);
  if (!gi.text && !gi.sprite) return 0;
  if (gi.sprite && UI_ART.sprites[gi.sprite]) { const r = UI.sprite(ctx, gi.sprite, x, y, { scale: 2 }); return r.w; }
  const w = Math.max(24, UI.measure(gi.text, 'small') + 14);
  UI.frame(ctx, x, y, w, 24, 'keycap');
  UI.text(ctx, gi.text, x + w / 2, y + 4, 'small', UC.text, 'center', { shadow: false });
  return w;
}
const hudGlyphW = action => { const gi = IN.glyphInfo(action); return gi.sprite && UI_ART.sprites[gi.sprite] ? UI_ART.sprites[gi.sprite].w * 2 : gi.text ? Math.max(24, UI.measure(gi.text, 'small') + 14) : 0; };

// ===== scene overlays: damage numbers, loot names, enemy nameplates ====================================================
function drawDamageNumbers(ctx) {
  const dsz = typeof SETTINGS !== 'undefined' ? SETTINGS.damageNumberSize : 'M';
  for (const t of G.texts) {
    const [vx, vy] = worldToView(t.x, t.y, t.z);
    const life = t.life || 0.9, k = t.t / life;
    const rise = 20 * easeOut(Math.min(1, t.t / 0.7));
    const kind = t.kind || (t.big ? 'big' : 'normal');
    let size = 'small', col = t.col, a = 1 - Math.max(0, k - 0.6) / 0.4;
    if (kind === 'crit') { size = dsz === 'S' ? 'body' : 'heading'; col = UC.gold; }
    else if (kind === 'weak') { size = dsz === 'S' ? 'body' : 'heading'; col = UC.weak; }
    else if (kind === 'resist') { col = UC.resist; a *= 0.6; }
    else if (kind === 'big') size = 'body';
    else if (dsz === 'L') size = 'body';
    const pop = t.t < 0.034 ? -4 : 0;   // 2-frame pop
    const x = vx * 2 + (t.vx || 0) * t.t * 40, y = vy * 2 - rise + pop;
    UI.text(ctx, t.s, x, y, size, col, 'center', { alpha: clamp(a, 0, 1) });
  }
}
// rarity-coloured names over ground loot
function drawDropNames(ctx) {
  const p = G.player; if (!G.drops || !p) return;
  for (const d of G.drops) {
    if (d.t < 0.5) continue;
    const i = RARITY[d.rar].i, dd = dist(p.x, p.y, d.x, d.y), range = i >= 2 ? 9 : 5;
    if (dd > range) continue;
    const [vx, vy] = worldToView(d.x, d.y, d.z), h = DROP_FX[i].h * Math.min(1, (d.t - 0.3) * 2.5);
    UI.text(ctx, d.name, vx * 2, (vy - Math.max(10, h) - 5) * 2, 'small', rarityCol(d.rar), 'center', { alpha: clamp(Math.min((d.t - 0.5) * 3, range - dd), 0, 1) });
  }
}
// nameplates on the 480 grid: a 20x3 scene-pixel bar (40x6 here) 2 scene px above the sprite
function drawNameplates(ctx) {
  for (const e of G.enemies) {
    if (e.dead || e.dummy || e.boss || e.spawnT > 0) continue;
    const elite = enemyClassOf(e) === 'elite';
    if (e.hp >= e.maxHp && !elite) { if (e.uid) UI.barReset('np' + e.uid); continue; }
    if (!e.uid) e.uid = ++HUD.uid;
    const [vx, vy] = worldToView(e.x, e.y, e.z);
    const x = UI.snap(vx * 2), top = UI.snap((vy - e.hgt * ZS - (e.type === 'wisp' ? 14 : 0)) * 2) - 4;
    const by = top - 10;
    if (by < 4 || x < -40 || x > DW + 40) continue;
    UI.bar(ctx, x - 20, by, 40, 6, e.hp / e.maxHp, { id: 'np' + e.uid, col: UC.hp, hi: UC.hpHi });
    if (elite) UI.text(ctx, (ENEMY[e.type] && ENEMY[e.type].name) || e.type, x, by - 18, 'small', UC.text, 'center');
    const seen = G.seen[e.type] && G.seen[e.type].res;
    if (seen) {   // discovered weaknesses right of the bar, resists left (16 px chips)
      let wx = x + 26, rx = x - 42;
      for (const el in seen) {
        if (seen[el] < 0) { elChip(ctx, wx, by - 6, el, 'weak', 16); wx += 18; } else { elChip(ctx, rx, by - 6, el, 'resist', 16); rx -= 18; }
      }
    }
    let sx = x - 20;
    const st = [];
    if (e.burnT > 0) st.push('#ff9a4a'); if (e.slowT > 0) st.push('#9fe8ff'); if (e.stunT > 0) st.push('#ffe36a');
    for (const c of st) { ctx.fillStyle = UC.edge; ctx.fillRect(sx, by + 10, 16, 16); ctx.fillStyle = c; ctx.fillRect(sx + 2, by + 12, 12, 12); sx += 18; }
  }
}

// ===== portrait block ========================================================================================================
function drawPortrait(ctx, p) {
  const X = 16, Y = 452, low = p.hp / p.maxHp < 0.25 && p.hp > 0;
  const pulse = low ? 0.5 + 0.5 * Math.sin(G.t * Math.PI * 4) : 0;
  hudFrame(ctx, X, Y, 72, 72, 'primary');
  ctx.save(); ctx.beginPath(); ctx.rect(X + 6, Y + 6, 60, 60); ctx.clip();
  const g = ctx.createLinearGradient(0, Y, 0, Y + 72), pg = { vale: ['#f6b2b0', '#5d3f98'], ruins: ['#7a1f4f', '#1f0c33'], forest: ['#f39056', '#2c3c52'] }[G.map.themeId] || ['#f6b2b0', '#5d3f98'];
  g.addColorStop(0, pg[0]); g.addColorStop(1, pg[1]); ctx.fillStyle = g; ctx.fillRect(X + 6, Y + 6, 60, 60);
  const sp = p.spr, ox = sp.ox || 0, cowl = p.gear.head === 'arcanecowl';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sp.portrait, ox, ox, 16, 16, X + 4, Y + (cowl ? 8 : 4), 64, 64);
  if (low) { const v = ctx.createRadialGradient(X + 36, Y + 36, 14, X + 36, Y + 36, 44); v.addColorStop(0, 'rgba(255,61,110,0)'); v.addColorStop(1, `rgba(255,61,110,${0.35 + pulse * 0.25})`); ctx.fillStyle = v; ctx.fillRect(X + 6, Y + 6, 60, 60); }
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(255,40,90,${p.hurtT})`; ctx.fillRect(X + 6, Y + 6, 60, 60); }
  ctx.restore();
  if (low) UI.frame(ctx, X, Y, 72, 72, 'danger', { alpha: 0.4 + pulse * 0.6 });
  // level badge diamond 24x24
  UI.sprite(ctx, 'levelBadge', 72, 500, { scale: 2 });
  UI.text(ctx, p.level, 84, 506, 'small', UC.gold, 'center', { shadow: false });
  // bars
  if (HUD.lvl.n && p.level > HUD.lvl.n) HUD.lvl.t = G.t;
  HUD.lvl.n = p.level;
  UI.bar(ctx, 100, 456, 236, 18, p.hp / p.maxHp, { id: 'hud-hp', col: UC.hp, hi: UC.hpHi, label: `${Math.ceil(p.hp)}/${p.maxHp}`, labelSize: 'small' });
  UI.bar(ctx, 100, 480, 236, 12, p.mp / p.maxMp, { id: 'hud-mp', col: UC.mp, hi: UC.mpHi });
  UI.bar(ctx, 100, 498, 236, 8, p.st / p.maxSt, { id: 'hud-st', col: UC.st, hi: UC.stHi });
  const xf = p.level >= MAX_LEVEL ? 1 : p.xp / xpToNext(p.level);
  UI.bar(ctx, 100, 512, 236, 4, xf, { id: 'hud-xp', col: UC.xp, hi: UC.xp, ghost: false });
  const ra = G.t - HUD.lvl.t;
  if (ra < 1.2) {   // level-up: gold ring on the bar
    ctx.globalAlpha = 1 - ra / 1.2; ctx.fillStyle = UC.gold;
    ctx.fillRect(96, 508, 244, 2); ctx.fillRect(96, 518, 244, 2); ctx.fillRect(96, 508, 2, 12); ctx.fillRect(338, 508, 2, 12); ctx.globalAlpha = 1;
  }
  if (UI.mouseIn(100, 478, 236, 32)) {   // MP / ST numbers on hover
    UI.text(ctx, `MP ${Math.floor(p.mp)}/${p.maxMp}   ST ${Math.floor(p.st)}/${p.maxSt}`, 100, 434, 'small', UC.text);
  }
}

// ===== status row (debuffs first) ===============================================================================================
function drawStatusRow(ctx, p, x0, y0, rightAlign) {
  const list = heroStatuses(p).sort((a, b) => (a.kind === 'debuff' ? 0 : 1) - (b.kind === 'debuff' ? 0 : 1));
  list.forEach((s, i) => {
    const x = rightAlign ? x0 - (i + 1) * 24 + 4 : x0 + i * 24, y = y0, deb = s.kind === 'debuff';
    hudFrame(ctx, x, y, 20, 20, 'slot');
    const img = statIcon(s.id) || (s.id === 'potion' ? miscIcon('potion') : null);
    if (img) ctx.drawImage(img, x + 2, y + 2, 16, 16);
    else UI.text(ctx, s.id === 'rooted' ? 'R' : 'S', x + 10, y + 3, 'small', UC.danger, 'center', { shadow: false });
    UI.sweep(ctx, x + 2, y + 2, 16, 16, 1 - clamp(s.frac, 0, 1), { alpha: 0.55 });
    hudFrame(ctx, x, y, 20, 20, 'slotRim', { tint: deb ? UC.danger : s.color || UC.line });
    if (s.stacks > 1) UI.text(ctx, s.stacks, x + 18, y + 10, 'small', UC.text, 'right');
  });
}

// ===== skill bar ==================================================================================================================
function slotIcon(p, st) {
  if (st.slot === 'lmb') return itemIcon(p.equip.weapon);
  if (st.slot === 'pot') return miscIcon('potion');
  return st.id ? skillIcon(st.id) : null;
}
function drawSkillBar(ctx, p, inert) {
  let hover = null;
  const flashTag = [];
  for (const grp of SLOT_GROUPS) grp.slots.forEach((slot, i) => {
    const x = grp.x + i * SLOT_PITCH;
    if (drawSkillSlot(ctx, p, slot, x, SLOT_Y)) hover = { slot, x };
  });
  if (drawSkillSlot(ctx, p, 'pot', POTION_X, SLOT_Y)) hover = { slot: 'pot', x: POTION_X };
  // potion charge pips
  for (let k = 0; k < MAX_POTIONS; k++) UI.sprite(ctx, k < p.potions ? 'pipFull' : 'pipEmpty', POTION_X + 5 + k * 12, 530, { scale: 2 });
  if (hover && !inert && (IN.device === 'kbm')) skillTooltip(ctx, p, hover);
}
function drawSkillSlot(ctx, p, slot, x, y) {
  const st = skillSlotState(p, slot), icon = slotIcon(p, st), ult = slot === 'r', pot = slot === 'pot';
  const ready = pot ? (st.cd <= 0 && st.potions > 0) : st.ready !== false && !st.cdFrac;
  // ready flash: cooldown just ended -> 120 ms white rim + a 2 px icon pop
  const prev = HUD.ready[slot]; if (prev && prev.cd && !(st.cd > 0)) prev.t = G.t; HUD.ready[slot] = Object.assign(prev || {}, { cd: st.cd > 0 || (ult && st.charge < 1) });
  const flashK = prev && prev.t != null ? 1 - (G.t - prev.t) / 0.12 : 0;
  const rim = !icon ? UC.bevel : ult ? UC.gold : pot ? UC.hp : slot === 'lmb' ? UC.line : elColor(st.element);
  const empty = !icon;
  const dy = flashK > 0 ? -2 : 0;
  hudSlot(ctx, x, y, SLOT, empty ? UC.bevel : rim, icon, { gray: !!st.mpShort || !!st.stShort || (pot && !st.potions), dy });
  const ix = x + 6, iy = y + 6;
  if (!empty) {
    if (ult && st.charge < 1) { UI.sweep(ctx, x + 4, y + 4, 36, 36, 1 - st.charge, { label: Math.floor(st.charge * 100) + '', col: UC.edge }); }
    else if (st.cdFrac > 0) UI.sweep(ctx, x + 4, y + 4, 36, 36, st.cdFrac, { label: st.cd >= 1 ? Math.ceil(st.cd) + '' : st.cd.toFixed(1) });
    else if (pot && st.cd > 0) UI.sweep(ctx, x + 4, y + 4, 36, 36, st.cd, {});
    if (ult && st.ready && st.charge >= 1) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(G.t * 8); ctx.fillStyle = UC.gold; ctx.fillRect(x + 4, y + 4, 36, 36); ctx.globalAlpha = 1; hudFrame(ctx, x, y, SLOT, SLOT, 'slotRim', { tint: UC.gold, alpha: 1 }); }
    if (st.unavailable) { ctx.fillStyle = UC.edge; ctx.globalAlpha = 0.5; ctx.fillRect(x + 4, y + 4, 36, 36); ctx.globalAlpha = 1; }
    if (st.flash > 0) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = Math.min(0.6, st.flash * 2); ctx.fillRect(x + 4, y + 4, 36, 36); ctx.globalAlpha = 1; }
  }
  if (flashK > 0) { ctx.globalAlpha = flashK; hudFrame(ctx, x, y, SLOT, SLOT, 'slotRim', { tint: '#ffffff' }); ctx.globalAlpha = 1; }
  if (pot) UI.text(ctx, st.potions, x + 40, y + 28, 'small', UC.text, 'right');
  // key tag sits above the slot's top-left corner, outside the icon art
  const label = st.glyph || SLOT_LABEL[slot];
  if (label) {
    const tw = Math.max(24, UI.measure(label, 'small') + 12);
    hudFrame(ctx, x, y - 16, tw, 20, st.mpShort ? 'keyTagMp' : 'keyTag');
    UI.text(ctx, label, x + tw / 2, y - 14, 'small', st.mpShort ? UC.mpHi : UC.text, 'center', { shadow: false });
  }
  return !G.ui.open && !G.ui.pause && UI.mouseIn(x, y, SLOT, SLOT);
}
function skillTooltip(ctx, p, h) {
  const st = skillSlotState(p, h.slot); let c;
  if (h.slot === 'pot') c = { title: 'Health Potion', titleCol: UC.hpHi, lines: [`Heal 40% of max HP. ${p.potions}/${MAX_POTIONS} charges, refilled at checkpoints.`] };
  else if (h.slot === 'lmb') { const w = item('weapon', p.gear.weapon); c = { title: w.basic.name, lines: [`Basic attack of the ${w.name}. Builds MP on hit.`] }; }
  else if (!st.id) return;
  else {
    const s = SKILLS[st.id];
    c = { title: s.name, titleCol: h.slot === 'r' ? UC.gold : UC.text, lines: [{ s: `${s.element}   ${s.mp ? s.mp + ' MP   ' : ''}${s.st ? s.st + ' ST   ' : ''}CD ${s.cd}s   Rank ${st.rank}`, col: UC.dim }, '', s.desc] };
  }
  UI.tooltip(ctx, Math.min(h.x, DW - 296), 300, c, { w: 288 });
}

// ===== minimap: rounded diamond, fog of war, hero arrow, enemies as 4 px dots =========================================================
function miniBuild(m) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 56; c.getContext('2d').imageSmoothingEnabled = false; return c; };
  const base = mk(), x = base.getContext('2d'), s = 46 / (m.W + m.H), ox = 28 - (m.W - m.H) / 2 * s, oy = 5;
  const rw = Math.max(2, Math.ceil(2 * s)), rh = Math.max(1, Math.ceil(s));
  const col = (i, j) => {
    const t = m.type[j][i]; if (!t) return null;
    if (m.block[j][i] && t !== 'w' && t !== 'pillar') return '#b98a6a';
    return { g: '#4a9a63', f: '#6db56a', p: '#cbc4e4', w: '#4a8fd0', b: '#a87a5c', s: '#9a92c0', x: '#4d4570', r: '#7a5ab0', d: '#2d5647', pillar: '#8a80b0' }[t] || '#888';
  };
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    let c = col(i, j); if (!c) continue;
    if (m.h[j][i] >= 4 && m.type[j][i] !== 'pillar') c = mixHex(c, '#ffffff', 0.2);
    x.fillStyle = c; x.fillRect(Math.round(ox + (i - j) * s) - (rw >> 1), Math.round(oy + (i + j) * s), rw, rh);
  }
  m.mini = { base, s, ox, oy, rw, rh, rev: mk(), tmp: mk(), shown: mk(), vis: new Uint8Array(m.W * m.H), dirty: true };
}
function miniReveal(m, p) {
  const mi = m.mini, tx = Math.floor(p.x), ty = Math.floor(p.y), key = tx + ',' + ty + m.id;
  if (key === HUD.fogTile) return; HUD.fogTile = key;
  const rx = mi.rev.getContext('2d'); rx.fillStyle = '#fff';
  const R = 9;
  for (let j = Math.max(0, ty - R); j <= Math.min(m.H - 1, ty + R); j++) for (let i = Math.max(0, tx - R); i <= Math.min(m.W - 1, tx + R); i++) {
    if (Math.hypot(i - p.x, j - p.y) > R || mi.vis[j * m.W + i]) continue;
    mi.vis[j * m.W + i] = 1; mi.dirty = true;
    rx.fillRect(Math.round(mi.ox + (i - j) * mi.s) - (mi.rw >> 1) - 1, Math.round(mi.oy + (i + j) * mi.s) - 1, mi.rw + 2, mi.rh + 2);
  }
}
function miniCompose(m) {
  const mi = m.mini, t = mi.tmp.getContext('2d'), s = mi.shown.getContext('2d');
  t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, 56, 56); t.drawImage(mi.base, 0, 0);
  t.globalCompositeOperation = 'destination-in'; t.drawImage(mi.rev, 0, 0);
  s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, 56, 56);
  s.globalAlpha = 0.18; s.drawImage(mi.base, 0, 0); s.globalAlpha = 1; s.drawImage(mi.tmp, 0, 0);
  s.globalCompositeOperation = 'destination-in'; UI.sprite(s, 'minimapMask', 0, 0, { scale: 1 });
  s.globalCompositeOperation = 'source-over'; mi.dirty = false;
}
function drawMinimap(ctx, p, X, Y) {
  const m = G.map; if (!uiReady()) return;
  if (!m.mini) miniBuild(m);
  const mi = m.mini; miniReveal(m, p); if (mi.dirty) miniCompose(m);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mi.shown, X, Y, 112, 112);
  UI.sprite(ctx, 'minimap', X, Y, { scale: 2 });
  const mp = (x, y) => [X + (mi.ox + (x - y) * mi.s) * 2, Y + (mi.oy + (x + y) * mi.s) * 2];
  const inside = (px, py) => Math.abs(px - (X + 56)) + Math.abs(py - (Y + 56)) < 46;
  for (const e of G.enemies) {
    if (e.dummy || e.dead) continue;
    const [ex, ey] = mp(e.x, e.y), d = e.boss ? 6 : 4; if (!inside(ex, ey)) continue;
    ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(ex) - d / 2 - 2, UI.snap(ey) - d / 2 - 2, d + 4, d + 4);
    ctx.fillStyle = e.boss ? UC.danger : UC.hpHi; ctx.fillRect(UI.snap(ex) - d / 2, UI.snap(ey) - d / 2, d, d);
  }
  for (const pt of m.portals) if (pt.open) {   // objective = a pulsing diamond
    const [qx, qy] = mp(pt.x, pt.y); if (!inside(qx, qy)) continue;
    if (pt.marker) UI.sprite(ctx, 'bullet', qx - 7, qy - 7, { scale: 2, tint: UC.gold, alpha: 0.5 + 0.5 * Math.sin(G.t * 6) });
    else { ctx.fillStyle = '#9ef0ff'; ctx.fillRect(UI.snap(qx) - 2, UI.snap(qy) - 2, 4, 4); }
  }
  const [px, py] = mp(p.x, p.y), cx = UI.snap(px), cy = UI.snap(py);
  const ax = Math.cos(p.aim) - Math.sin(p.aim), ay = Math.cos(p.aim) + Math.sin(p.aim), al = Math.hypot(ax, ay) || 1;
  ctx.fillStyle = UC.edge; ctx.fillRect(cx - 4, cy - 4, 8, 8);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
  ctx.fillRect(UI.snap(cx + ax / al * 6) - 1, UI.snap(cy + ay / al * 6) - 1, 2, 2);   // arrow nose
  ctx.fillStyle = UC.gold; ctx.fillRect(X + 54, Y - 2, 4, 4);   // single "N" tick
  UI.text(ctx, 'N', X + 56, Y + 4, 'small', UC.gold, 'center');
}

// ===== tracker (no panel) =========================================================================================================
function questLines() {
  const q = (G.prog && G.prog.quests) || {}, out = [];
  if (typeof QUESTS === 'undefined') return out;
  for (const d of QUESTS) { const st = q[d.id]; if (st && !(st === 'done' || st.done) && (d.zone === G.map.id || st.active)) out.push(d.title); }
  return out.slice(0, 2);
}
function drawTracker(ctx, x, y) {
  const m = G.map, obj = G.objective || '', ql = questLines(), key = m.id + '|' + obj + '|' + ql.join();
  if (HUD.trk.key !== key) { HUD.trk.key = key; HUD.trk.t0 = G.t; }
  const age = G.t - HUD.trk.t0, a = age < 6 ? 1 : Math.max(0.45, 1 - (age - 6) * 2);
  ctx.globalAlpha = a;
  UI.text(ctx, m.name, x, y, 'body', UC.gold);
  let yy = y + 24;
  if (obj) { UI.text(ctx, '◆', x, yy, 'body', UC.gold); UI.text(ctx, obj, x + 20, yy, 'body', UC.text); yy += 24; }
  const wave = G.pendingSpawns > 0 || (G.arena && G.enemies.some(e => !e.dummy));
  if (wave) { const n = G.enemies.filter(e => !e.dummy && !e.dead).length; UI.text(ctx, `Foes left ${n}`, x + 20, yy, 'small', UC.hpHi); yy += 18; }
  for (const t of ql) { UI.text(ctx, t, x + 20, yy, 'small', UC.dim); yy += 18; }
  ctx.globalAlpha = 1;
  return yy;
}

// ===== boss bar ===========================================================================================================================
function drawBossBar(ctx) {
  const b = G.boss; if (!b || b.dead || b.spawnT > 0.8) return;
  if (b.phase2 && !HUD.bossPhase) HUD.bossShakeT = G.t;
  HUD.bossPhase = !!b.phase2;
  const sh = G.t - HUD.bossShakeT < 0.4 ? (Math.floor(G.t * 40) % 2 ? 2 : -2) : 0;
  const x = 240 + sh, y = 34;
  const pips = '◆' + (b.phase2 ? '◆' : '◇');
  UI.text(ctx, ENEMY.boss.name.toUpperCase() + '  ' + pips, 480 + sh, 8, 'body', UC.gold, 'center');
  UI.bar(ctx, x, y, 480, 14, b.hp / b.maxHp, { id: 'boss-hp', col: UC.danger, hi: UC.hpHi });
  const cap = STAGGER_CAP, f = clamp((b.stagger || 0) / cap, 0, 1), broke = G.t - (b.breakT || -9) < 0.8;
  const sc = broke ? '#ffffff' : mixHex('#ffffff', '#ff8a2a', f);
  UI.bar(ctx, x, 50, 480, 4, broke ? 1 : f, { id: 'boss-stg', col: sc, hi: sc, ghost: false, wipe: false });
  if (broke && Math.floor(G.t * 10) % 2) UI.text(ctx, 'BREAK', 480 + sh, 56, 'small', '#ff8a2a', 'center');
  let wx = x, rx = x + 480 - 20;
  for (const el of Object.keys(b.res)) {
    if (b.res[el] < 0) { elChip(ctx, wx, 62, el, 'weak'); wx += 24; }
    else if (b.res[el] > 0) { elChip(ctx, rx, 62, el, 'resist'); rx -= 24; }
  }
}

// ===== banners, say line, interact prompt, lore tablet =====================================================================================
function drawBanner(ctx, p) {
  const bn = G.banner; if (!bn || bn.t <= 0) return;
  const max = bn.max || 3, a = clamp(Math.min(bn.t * 3, (max - bn.t) * 3 + 0.0, 1), 0, 1);
  if (bn.lvl) {   // level-up: the heading rises over the hero
    const [vx, vy] = worldToView(p.x, p.y, p.z + 4), k = (max - bn.t) / max;
    UI.text(ctx, bn.s, vx * 2, vy * 2 - 20 - easeOut(Math.min(1, k * 1.5)) * 48, 'heading', UC.gold, 'center', { alpha: clamp(Math.min(1, bn.t * 2), 0, 1) });
    if (bn.sub) UI.text(ctx, bn.sub, vx * 2, vy * 2 + 16 - easeOut(Math.min(1, k * 1.5)) * 48 - 20, 'small', UC.text, 'center', { alpha: clamp(Math.min(1, bn.t * 2), 0, 1) });
    return;
  }
  ctx.globalAlpha = a;   // zone / boss entry: a 960x64 letterbox strip at y=112
  ctx.fillStyle = UC.edge; ctx.globalAlpha = a * 0.78; ctx.fillRect(0, 112, DW, 64); ctx.globalAlpha = a;
  ctx.fillStyle = bn.boss ? UC.danger : UC.line; ctx.fillRect(0, 112, DW, 2); ctx.fillRect(0, 174, DW, 2);
  UI.text(ctx, bn.s, 480, 118, 'heading', bn.boss ? UC.danger : UC.gold, 'center');
  if (bn.sub) UI.text(ctx, bn.sub, 480, 152, 'body', UC.text, 'center');
  ctx.globalAlpha = 1;
}
function drawSay(ctx) {
  if (G.msg && G.msg.t > 0) UI.text(ctx, G.msg.s, 480, 404, 'body', UC.text, 'center', { alpha: Math.min(1, G.msg.t * 2) });
}
function drawInteractPrompt(ctx) {
  const ip = interactPrompt(); if (!ip || G.touch) return;
  const gw = hudGlyphW('interact'), tw = UI.measure(ip.text, 'body'), w = gw + 8 + tw, x = 480 - w / 2;
  hudGlyph(ctx, 'interact', x, 432);
  UI.text(ctx, ip.text, x + gw + 8, 434, 'body', UC.gold);
}
function drawTablet(ctx) {
  if (!(G.tablet && G.tablet.src && G.state === 'play' && !G.ui.open)) return;
  UI.frame(ctx, 120, 372, 720, 112, 'primary');
  UI.text(ctx, G.tablet.src.title || 'Lore tablet', 144, 388, 'body', UC.gold);
  UI.wrap(ctx, G.tablet.src.text || '...the words have worn away.', 144, 416, 672, 'body', UC.text);
}

// ===== help overlay ("?" button / H / pad menu) ==========================================================================================
function drawHelp(ctx) {
  ctx.fillStyle = UC.edge; ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
  const x = 200, y = 80, w = 560, h = 380;
  UI.frame(ctx, x, y, w, h, 'primary');
  UI.text(ctx, 'HOW TO PLAY', 480, y + 18, 'heading', UC.gold, 'center');
  const rows = G.touch ? [
    ['Left thumb', 'Joystick: move'], ['Big button (hold)', 'Weapon basic attack'], ['Tap a skill', 'Cast at the nearest enemy'], ['Drag a skill', 'Aim, release to cast'],
    ['Hold a skill', 'Open the bag'], ['Potion', 'Drink a potion (40% HP)'], ['Bag / ? / full', 'Top-left buttons'],
  ] : [
    ['move', 'Move'], ['aim', 'Aim'], ['attack', 'Attack (builds MP)'], ['skillQ', 'Weapon skills Q E R (R = ultimate)'], ['skillF', 'Chest skill (C = helmet)'],
    ['dodge', 'Dodge (boots skill)'], ['s1', 'Character skills 1 2 3'], ['potion', 'Potion'], ['interact', 'Interact / talk'], ['inventory', 'Bag, character, bestiary, quests'], ['pause', 'Pause and settings'],
  ];
  let yy = y + 66;
  for (const [k, v] of rows) {
    if (G.touch) UI.text(ctx, k, x + 32, yy + 2, 'body', UC.stHi); else { const gw = hudGlyph(ctx, k, x + 32, yy - 2); if (!gw) UI.text(ctx, IN.glyph(k), x + 32, yy + 2, 'body', UC.stHi); }
    UI.text(ctx, v, x + 200, yy + 2, 'body', UC.text); yy += 28;
  }
  UI.text(ctx, 'You are what you wear: gear decides Q E R F C SHIFT.', 480, y + h - 84, 'small', UC.dim, 'center');
  UI.button(ctx, 480 - 170, y + h - 52, 160, 36, 'SETTINGS', { id: 'btn:help-settings', size: 'small', fn: () => { G.ui.help = false; G.ui.pause = true; } });
  UI.button(ctx, 480 + 10, y + h - 52, 160, 36, 'CLOSE', { id: 'btn:help-close', size: 'small', def: true, fn: () => { G.ui.help = false; } });
  UI.focus.draw(ctx);
}

// ===== the HUD ====================================================================================================================================
function hudHelpButton(ctx, x, y, inert) {
  const hov = !inert && UI.mouseIn(x, y, 24, 24);
  UI.sprite(ctx, hov ? 'helpHover' : 'help', x, y, { scale: 2 });
  if (!inert) UI.hit(x, y, 24, 24, () => { G.ui.help = true; }, { id: 'hud-help' });
}
function drawPlayHud(ctx, p, inert) {
  const touch = G.touch;
  const mirror = touch && leftHanded();   // the thumb cluster sits bottom-left, so the portrait + bars move to the other corner
  if (mirror) { ctx.save(); ctx.translate(DW - 24 - 340, 0); }
  drawPortrait(ctx, p);
  if (mirror) ctx.restore();
  drawStatusRow(ctx, p, touch ? DW - 24 : 100, touch ? 148 : 428, touch);
  if (!touch) drawSkillBar(ctx, p, inert);
  drawMinimap(ctx, p, touch ? DW - 24 - 112 : 832, touch ? 24 : 16);
  drawTracker(ctx, touch ? 24 : 16, touch ? 24 : 16);
  drawBossBar(ctx);
  drawTablet(ctx);
  drawSay(ctx);
  drawInteractPrompt(ctx);
  const near = G.map.portals.find(pt => pt.open && dist(p.x, p.y, pt.x, pt.y) < 3.2);
  if (near && G.state === 'play') { const [a, b] = zoneLevel(near.to); UI.text(ctx, `Rift to ${(G.world.maps[near.to] || {}).name || near.to} (Lv ${a}-${b}): step in`, 480, 372, 'small', UC.dim, 'center'); }
  if (!touch) hudHelpButton(ctx, 928, 480, inert);
  UI.drawToasts(ctx);
  drawBanner(ctx, p);
}
function drawHUD(ctx) {
  ctx.imageSmoothingEnabled = false;
  G.ui.btns = [];   // legacy list read by main.js uiClick; hit regions live in UI now
  if (G.state === 'title') { drawTitle(ctx); return; }
  const p = G.player, u = G.ui;
  drawDamageNumbers(ctx); drawDropNames(ctx); drawNameplates(ctx);
  if (u.open) {   // Tab screens: scene dimmed to 35 %, play HUD hidden
    ctx.fillStyle = '#05030c'; ctx.globalAlpha = 0.65; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
    drawTabScreen(ctx);
    return;
  }
  const modal = u.help || u.pause || G.state === 'dead';
  if (TOUCH_AIM) updateTouchAim();   // drops a stale drag when a menu opens or the hero dies
  drawPlayHud(ctx, p, modal);
  if (G.touch && G.state === 'play' && !modal) drawTouchControls(ctx);
  if (u.pause) drawPause(ctx);
  if (u.help) drawHelp(ctx);
  if (G.state === 'dead') drawDeath(ctx);
}


// ===== touch v2: circular wheel (docs/HUD.md "Touch v2"; layout + input in touch.js) ===========================================
// ring arcs: UI.ring(ctx,x,y,r,frac,col[,w]) in ui.js
const TB = { flash: {}, wasCd: {} };
// one round button: 2 px dark outline + 2 px rim in `col` + #15102a at 80 %, icon, cooldown wipe, seconds
function touchBtn(ctx, x, y, r, col, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  if (o.lift) { ctx.fillStyle = '#05030c'; ctx.globalAlpha *= 0.4; ctx.beginPath(); ctx.arc(x, y + 2, r, 0, 7); ctx.fill(); ctx.globalAlpha /= 0.4; y -= o.lift; }
  ctx.fillStyle = '#15102a'; ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.arc(x, y, r - 2, 0, 7); ctx.fill(); ctx.globalAlpha /= 0.8;
  ctx.lineWidth = 2; ctx.strokeStyle = '#0b0716'; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, 7); ctx.stroke();
  if (o.icon) hudIcon(ctx, o.icon, x - 16, y - 16, { gray: o.gray, size: o.iconSize || 32 });
  if (o.cdFrac > 0) {   // clockwise radial wipe at 70 % dark
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 4, 0, 7); ctx.clip();
    ctx.fillStyle = '#0b0716'; ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, r, -Math.PI / 2 + (1 - o.cdFrac) * Math.PI * 2, Math.PI * 1.5); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  if (o.held) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.2; ctx.beginPath(); ctx.arc(x, y, r - 4, 0, 7); ctx.fill(); ctx.globalAlpha /= 0.2; }
  ctx.lineWidth = 2; ctx.strokeStyle = o.lift || o.held ? mixHex(col, '#ffffff', 0.55) : col; ctx.beginPath(); ctx.arc(x, y, r - 3, 0, 7); ctx.stroke();
  if (o.flash > 0) { ctx.globalAlpha *= o.flash; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, 7); ctx.stroke(); }
  ctx.restore();
  if (o.label) UI.text(ctx, o.label, x, y - 7, 'small', UC.text, 'center');
}
// a skill slot button; returns nothing. `b` from touchButtons()/touchInner(), `a` = alpha for the page swap
function touchSkillBtn(ctx, p, b, held, aiming, a = 1) {
  const st = skillSlotState(p, b.slot), ult = b.slot === 'r', now = touchNow();
  const cd = st.id ? (ult ? 0 : st.cd) : 0;
  if (TB.wasCd[b.slot] > 0 && cd === 0 && st.id) TB.flash[b.slot] = now;
  TB.wasCd[b.slot] = cd;
  const fl = Math.max(0, 1 - (now - (TB.flash[b.slot] || -9)) / 0.25);
  const short = !!(st.mpShort || st.stShort), rim = !st.id ? UC.bevel : short ? UC.mp : ult ? UC.gold : elColor(st.element);
  let icon = st.id ? skillIcon(st.id) : (b.slot === 'shift' ? miscIcon('dust') : null);
  const lock = st.unavailable ? 0.5 : 1;
  touchBtn(ctx, b.x, b.y, b.r, rim, { icon, gray: short, cdFrac: ult ? (st.charge < 1 ? 1 - st.charge : 0) : st.cdFrac, held, lift: aiming ? 4 : 0, flash: fl, alpha: a * lock });
  if (st.id && a > 0.5) {
    const y = b.y - (aiming ? 4 : 0);
    if (ult && st.charge < 1) UI.text(ctx, Math.floor(st.charge * 100) + '', b.x, y - 7, 'small', UC.text, 'center');
    else if (cd > 0) UI.text(ctx, cd >= 1 ? Math.ceil(cd) + '' : cd.toFixed(1), b.x, y - 7, 'small', UC.text, 'center');
  }
}
function drawTouchToggle(ctx, p, b, u) {
  const hidden = TOUCH.page ? TOUCH_PAGES[0] : TOUCH_PAGES[1];
  const ready = hidden.some(sl => { const st = skillSlotState(p, sl); return st.id && st.ready && !st.mpShort && !st.stShort && !st.unavailable; });
  touchBtn(ctx, b.x, b.y, b.r, UC.line, {});
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((TOUCH.page + u - 1) * Math.PI);   // "◐" turns half a turn per swap
  ctx.fillStyle = UC.bright; ctx.beginPath(); ctx.arc(0, 0, b.r - 8, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  ctx.strokeStyle = UC.bright; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, b.r - 8, 0, 7); ctx.stroke(); ctx.restore();
  if (ready) {   // a skill on the other page is ready
    const k = 4 + Math.sin(touchNow() * 8) * 0.8, dx = b.x + b.r * 0.72, dy = b.y - b.r * 0.72;
    ctx.fillStyle = '#0b0716'; ctx.beginPath(); ctx.arc(dx, dy, k + 2, 0, 7); ctx.fill();
    ctx.fillStyle = UC.gold; ctx.beginPath(); ctx.arc(dx, dy, k, 0, 7); ctx.fill();
  }
}
function drawTouchControls(ctx) {
  const p = G.player, now = touchNow();
  updateTouchAim();
  // floating joystick: frames on the 2x grid, no thin lines
  for (const t of Object.values(TOUCH.ptrs)) if (t.kind === 'stick') {
    UI.frame(ctx, UI.snap(t.sx) - 56, UI.snap(t.sy) - 56, 112, 112, 'plain', { alpha: 0.4 });
    const l = Math.hypot(t.x - t.sx, t.y - t.sy), k = l > 56 ? 56 / l : 1;
    UI.frame(ctx, UI.snap(t.sx + (t.x - t.sx) * k) - 24, UI.snap(t.sy + (t.y - t.sy) * k) - 24, 48, 48, 'slot', { alpha: 0.85 });
  }
  drawTouchAimTemp(ctx, p);
  const heldSlots = new Set(), aimSlot = TOUCH_AIM && TOUCH_AIM.slot;
  for (const t of Object.values(TOUCH.ptrs)) if (t.kind === 'btn') heldSlots.add(t.b.slot);
  const u = clamp((now - TOUCH.pageAt) / 0.12, 0, 1), anim = u < 1 && !touchShowAll9();
  let toggle = null;
  for (const b of touchButtons()) {
    const held = heldSlots.has(b.slot), aiming = aimSlot === b.slot;
    if (b.slot === 'toggle') { toggle = b; continue; }
    if (b.slot === 'pot') {
      const st = skillSlotState(p, 'pot'), n = p.potions || 0;
      touchBtn(ctx, b.x, b.y, b.r, UC.hp, { icon: miscIcon('potion'), gray: !n, cdFrac: st.cd > 0 ? st.cd / 1 : 0, held });
      for (let i = 0; i < MAX_POTIONS; i++) {   // one pip per potion on the rim
        const a = (270 + (i - (MAX_POTIONS - 1) / 2) * 24) * TDEG, px = b.x + Math.cos(a) * (b.r - 3), py = b.y + Math.sin(a) * (b.r - 3);
        ctx.fillStyle = '#0b0716'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
        ctx.fillStyle = i < n ? UC.hpHi : UC.bevel; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 7); ctx.fill();
      }
      continue;
    }
    if (b.slot === 'interact') { touchBtn(ctx, b.x, b.y, b.r, UC.gold, { held, label: G.prompt ? G.prompt.text.split(' ')[0].toUpperCase() : 'USE' }); continue; }
    if (b.slot === 'atk') {
      touchBtn(ctx, b.x, b.y, b.r, UC.line, { held, icon: itemIcon(p.equip.weapon), iconSize: 48 });
      const ch = ultCharge(p);
      UI.ring(ctx, b.x, b.y, b.r - 2, 1, UC.edge, 3);   // the rim doubles as the ultimate charge ring
      UI.ring(ctx, b.x, b.y, b.r - 2, ch, UC.gold, 3);
      if (ch >= 1) { ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now * 8); UI.ring(ctx, b.x, b.y, b.r + 1, 1, UC.gold, 3); ctx.restore(); }
      continue;
    }
    if (anim && TOUCH_INNER[b.slot] != null) continue;   // drawn rotating below
    touchSkillBtn(ctx, p, b, held, aiming);
  }
  if (anim) {   // 120 ms swap: the old page swings out one way, the new one in from the other
    const ease = easeOut(u), dir = leftHanded() ? -1 : 1;
    TOUCH_PAGES[TOUCH.page ^ 1].forEach(id => { const b = touchInner(id, dir * ease * 35); touchSkillBtn(ctx, p, b, false, false, 1 - ease); });
    TOUCH_PAGES[TOUCH.page].forEach(id => { const b = touchInner(id, -dir * (1 - ease) * 35); touchSkillBtn(ctx, p, b, heldSlots.has(id), aimSlot === id, ease); });
  }
  if (toggle) drawTouchToggle(ctx, p, toggle, u);
  // two-hander charge ring inside the rim of the held skill button: white -> gold over 1 s (hook: p.holdCharge)
  const cf = touchChargeFrac(p), hb = activeAimPtr();
  if (cf > 0 && hb) UI.ring(ctx, hb.b.x, hb.b.y - (TOUCH_AIM ? 4 : 0), hb.b.r - 7, cf, mixHex('#ffffff', UC.gold, cf), 3);
  drawTouchCancel(ctx);
  // bag / help / fullscreen
  for (const m of touchMenu()) {
    UI.frame(ctx, m.x, m.y, 40, 40, 'plain');
    if (m.id === 'gear') ctx.drawImage(miscIcon('chest'), m.x + 4, m.y + 4, 32, 32);
    else if (m.id === 'help') UI.sprite(ctx, 'help', m.x + 8, m.y + 8, { scale: 2 });
    else { ctx.fillStyle = UC.text; for (const [cx, cy, dx, dy] of [[10, 10, 1, 1], [30, 10, -1, 1], [10, 30, 1, -1], [30, 30, -1, -1]]) { ctx.fillRect(m.x + cx - (dx < 0 ? 6 : 0), m.y + cy - (dy < 0 ? 2 : 0), 6, 2); ctx.fillRect(m.x + cx - (dx < 0 ? 2 : 0), m.y + cy - (dy < 0 ? 6 : 0), 2, 6); } }
  }
}
// the Ø64 cancel zone at (480,500): fades in after a 40 px drag, lights up under the finger
function drawTouchCancel(ctx) {
  const a = TOUCH_AIM; if (!a) return;
  const k = clamp((a.d - 40) / 24, 0, 1); if (k <= 0) return;
  const on = a.cancel, x = 480, y = 500;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = on ? '#6a1c34' : '#15102a'; ctx.globalAlpha = k * 0.85; ctx.beginPath(); ctx.arc(x, y, 32, 0, 7); ctx.fill(); ctx.globalAlpha = k;
  ctx.strokeStyle = on ? UC.hpHi : UC.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 31, 0, 7); ctx.stroke();
  ctx.strokeStyle = on ? '#ffffff' : UC.text; ctx.lineWidth = 4; ctx.lineCap = 'square'; ctx.beginPath();
  ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 10, y + 10); ctx.moveTo(x + 10, y - 10); ctx.lineTo(x - 10, y + 10); ctx.stroke();
  ctx.restore();
}
// TEMPORARY ground indicator in HUD space until render.js gets drawAimIndicator(aim, from, to): a dashed range circle around
// the hero (an iso ellipse) and a target dot. Skipped as soon as the real one exists.
function drawTouchAimTemp(ctx, p) {
  const a = TOUCH_AIM;
  if (!a || typeof drawAimIndicator !== 'undefined' || (typeof SETTINGS !== 'undefined' && SETTINGS.groundIndicators === 'off')) return;
  const sk = SKILLS[a.skill], col = (sk && sk.color) || '#ffffff', range = a.aim.range || 6, wv = (x, y) => { const v = worldToView(x, y, p.z); return [v[0] * 2, v[1] * 2]; };
  const poly = (cx, cy, R, n = 40) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, v = wv(cx + Math.cos(t) * R, cy + Math.sin(t) * R); i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]); } };
  ctx.save(); ctx.globalAlpha = a.cancel ? 0.3 : 1; ctx.lineWidth = 2;
  if (a.aim.shape !== 'self') {
    ctx.strokeStyle = col; ctx.globalAlpha *= 0.55; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -Math.floor(touchNow() * 10) * 2; poly(a.from.x, a.from.y, range); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha /= 0.55;
    const f = wv(a.from.x, a.from.y), t = wv(a.to.x, a.to.y);
    ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); ctx.globalAlpha /= 0.5;
    if (a.aim.shape === 'circle' && a.aim.r) { ctx.strokeStyle = col; poly(a.to.x, a.to.y, a.aim.r, 24); ctx.stroke(); }
    ctx.fillStyle = a.clamped ? '#ffffff' : col; ctx.strokeStyle = '#0b0716';
    ctx.beginPath(); ctx.arc(t[0], t[1], 6, 0, 7); ctx.fill(); ctx.stroke();
  } else { ctx.strokeStyle = col; const f = wv(a.from.x, a.from.y); poly(a.from.x, a.from.y, a.aim.r || 2); ctx.stroke(); }
  ctx.restore();
}
