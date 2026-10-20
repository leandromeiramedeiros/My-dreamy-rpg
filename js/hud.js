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
// element -> rim colour, cached (UI.el asks ICONS each call; ~20 calls a frame from the skill bar). Cached only once ICONS is
// loaded, so an early fallback colour is never pinned.
const EL_COLOR_CACHE = new Map();
const elColor = el => { let c = EL_COLOR_CACHE.get(el); if (c === undefined) { c = UI.el(EL_ICON_COL[el] || el); if (typeof ICONS !== 'undefined') EL_COLOR_CACHE.set(el, c); } return c; };
const easeOut = k => 1 - (1 - k) * (1 - k);
// the ultimate's charge as a fraction of what R needs now (some amulets / boons let R fire below 100): ultNeed(p), game.js
const ultFrac = p => { const n = typeof ultNeed === 'function' ? ultNeed(p) : 100; return n <= 0 ? 1 : clamp((p.ult || 0) / n, 0, 1); };
const potionMax = p => p.maxPotions || MAX_POTIONS;
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
  let s = (o.size || 32);
  if (!o.size && img.width === 24) { s = 24; x += 4; y += 4; }   // icons.js art is 24 px: draw it 1:1, centred in the 32 px box (no uneven 1.5x)
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
    else if (kind === 'big') size = 'body';
    else {   // normal / resist: the size follows hit power r = dmg / bar max (DESIGN §27): < 5 % small, < 20 % body, else heading
      const r = t.r || 0, tier = r >= 0.2 ? 2 : r >= 0.05 ? 1 : 0;
      const lv = Math.min(dsz === 'S' ? 1 : 2, Math.max(dsz === 'L' ? 1 : 0, tier));
      size = lv === 2 ? 'heading' : lv === 1 ? 'body' : 'small';
      if (kind === 'resist') { col = UC.resist; a *= 0.6; }
    }
    const pop = t.t < 0.034 ? -4 : 0;   // 2-frame pop
    const x = vx * 2 + (t.vx || 0) * t.t * 40, y = vy * 2 - rise + pop;
    UI.text(ctx, t.s, x, y, size, col, 'center', { alpha: clamp(a, 0, 1) });
  }
}
// rarity-coloured names over ground loot. De-overlapped: labels are placed best rarity first (then nearest to the hero),
// each pushed up a line until it clears the ones already placed; at most DROP_LABELS show near the hero, and Common
// labels fade 2 s after the drop. Hold Alt (or press L3 on a pad) to show every label.
const DROP_LABELS = 6;
const dropAll = { alt: false };
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', e => { if (e.code === 'AltLeft' || e.code === 'AltRight') { dropAll.alt = true; e.preventDefault(); } });
  window.addEventListener('keyup', e => { if (e.code === 'AltLeft' || e.code === 'AltRight') dropAll.alt = false; });
  window.addEventListener('blur', () => { dropAll.alt = false; });
}
function dropShowAll() {
  if (dropAll.alt) return true;
  try { const gp = navigator.getGamepads && navigator.getGamepads(); for (const g of gp || []) if (g && g.buttons[10] && g.buttons[10].pressed) return true; } catch (e) { /* no pad */ }
  return false;
}
function drawDropNames(ctx) {
  const p = G.player; if (!G.drops || !p) return;
  const all = dropShowAll(), cand = [];
  for (const d of G.drops) {
    if (d.t < 0.5) continue;
    const i = RARITY[d.rar].i, dd = dist(p.x, p.y, d.x, d.y), range = all ? 12 : i >= 2 ? 9 : 5;
    if (dd > range) continue;
    let fade = 1;
    if (!all && i === 0 && dd > 1.6) fade = clamp(2.5 - d.t, 0, 1);   // Common: gone 2.5 s after the drop (fully fading from 1.5 s)
    if (fade <= 0) continue;
    cand.push({ d, i, dd, range, fade });
  }
  const groups = new Map();   // duplicates merge into one label: "Knight Helm ×2" (anchored on the nearest copy)
  for (const c of cand.sort((a, b) => a.dd - b.dd)) { const gk = (c.d.it ? itemName(c.d.it) : c.d.name) + '|' + c.d.rar, g = groups.get(gk); if (g) g.n++; else { c.n = 1; groups.set(gk, c); } }
  cand.length = 0; for (const g of groups.values()) cand.push(g);
  cand.sort((a, b) => b.i - a.i || a.dd - b.dd);
  const lh = UI.lineH('small') + 6, placed = []; HUD.dropLabels = placed;
  let shown = 0;
  for (const c of cand) {
    if (!all && shown >= DROP_LABELS) break;
    const d = c.d, [vx, vy] = worldToView(d.x, d.y, d.z), h = DROP_FX[c.i].h * Math.min(1, (d.t - 0.3) * 2.5);
    const nm = d.it ? itemName(d.it) : d.name;   // the generated v2 name, always in rarity colour
    const label = c.n > 1 ? `${nm} ×${c.n}` : nm, w = UI.measure(label, 'small') + 8, x = vx * 2;
    let y = (vy - Math.max(10, h) - 5) * 2;
    for (let guard = 0; guard < 24; guard++) {
      const hit = placed.find(r => Math.abs(r.x - x) < (r.w + w) / 2 + 4 && Math.abs(r.y - y) < lh);
      if (!hit) break;
      y = hit.y - lh;   // stack upward
    }
    placed.push({ x, y, w, name: label, rar: d.rar }); shown++;
    const al = clamp(Math.min((d.t - 0.5) * 3, c.range - c.dd) * c.fade, 0, 1);
    ctx.save(); ctx.globalAlpha = 0.75 * al; ctx.fillStyle = '#15102a'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 2), w, lh - 2); ctx.restore();
    UI.text(ctx, label, x, y, 'small', rarityCol(d.rar), 'center', { alpha: al });
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
  if (ra < 1.2) {   // level-up (R3 #8): a gold ring on the XP bar that opens outward over 1.2 s, plus a gold wipe along the bar
    const k = ra / 1.2, g = 2 * Math.round(easeOut(k) * 4), x0 = 96 - g, y0 = 508 - g, w = 244 + g * 2, h = 12 + g * 2;
    ctx.globalAlpha = 1 - k; ctx.fillStyle = UC.gold;
    ctx.fillRect(x0, y0, w, 2); ctx.fillRect(x0, y0 + h - 2, w, 2); ctx.fillRect(x0, y0, 2, h); ctx.fillRect(x0 + w - 2, y0, 2, h);
    ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(100, 512, Math.round(236 * Math.min(1, k * 2.5)), 4); ctx.globalAlpha = 1;
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
  if (st.slot === 'lmb') return uiItemIcon(p.equip.weapon);
  if (st.slot === 'pot') return miscIcon('potion');
  return st.id ? skillIcon(st.id) : null;
}
// ===== §28 the HUD fades in one piece per noun (game.js hudNoun / hudShown) ======================================================
// hudFaded(ctx, a, fn): fn draws at full alpha (a >= 1), not at all (a <= 0: no hit regions either), or, during its 0.6 s fade-in,
// into an offscreen copy blitted at alpha a (the HUD helpers set globalAlpha absolutely, so a plain multiply would not hold).
let HUD_FADE_C = null;
function hudFaded(ctx, a, fn) {
  if (a >= 1) return fn(ctx);
  if (!(a > 0)) return undefined;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!HUD_FADE_C || HUD_FADE_C.width !== W || HUD_FADE_C.height !== H) { HUD_FADE_C = document.createElement('canvas'); HUD_FADE_C.width = W; HUD_FADE_C.height = H; }
  const o = HUD_FADE_C.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H);
  o.setTransform(ctx.getTransform()); o.imageSmoothingEnabled = false;
  const r = fn(o);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; ctx.drawImage(HUD_FADE_C, 0, 0); ctx.restore();
  return r;
}
const hudPieceOf = slot => (slot === '1' || slot === '2' || slot === '3' || slot === 1 || slot === 2 || slot === 3 ? 'skills' : String(slot));
const hudA = piece => (typeof hudShown === 'function' ? hudShown(piece) : 1);
// a chip's alpha: its piece's fade; in a bare opening a chip whose slot grants nothing (no weapon, no helm...) stays hidden
function chipAlpha(p, slot) {
  const a = hudA(hudPieceOf(slot));
  if (a > 0 && slot !== 'lmb' && slot !== 'pot' && typeof openingActive === 'function' && openingActive() && !slotSkill(p, slot)) return 0;
  return a;
}
function drawSkillBar(ctx, p, inert) {
  let hover = null;
  const flashTag = [];
  for (const grp of SLOT_GROUPS) grp.slots.forEach((slot, i) => {
    const x = grp.x + i * SLOT_PITCH;
    if (hudFaded(ctx, chipAlpha(p, slot), c => drawSkillSlot(c, p, slot, x, SLOT_Y))) hover = { slot, x };
  });
  if (hudFaded(ctx, chipAlpha(p, 'pot'), c => {
    const h = drawSkillSlot(c, p, 'pot', POTION_X, SLOT_Y);
    for (let k = 0; k < potionMax(p); k++) UI.sprite(c, k < p.potions ? 'pipFull' : 'pipEmpty', POTION_X + 5 + k * 12, 530, { scale: 2 });   // potion charge pips
    return h;
  })) hover = { slot: 'pot', x: POTION_X };
  HUD.hoverSlot = hover && !inert && IN.device === 'kbm' ? hover.slot : null;   // render.js: faint range ring
  if (hover && !inert && (IN.device === 'kbm')) skillTooltip(ctx, p, hover);
}
function drawSkillSlot(ctx, p, slot, x, y) {
  const st = skillSlotState(p, slot), icon = slotIcon(p, st), ult = slot === 'r', pot = slot === 'pot';
  const ready = pot ? (st.cd <= 0 && st.potions > 0) : st.ready !== false && !st.cdFrac;
  // ready flash: cooldown just ended -> 120 ms white rim + a 2 px icon pop
  const prev = HUD.ready[slot]; if (prev && prev.cd && !(st.cd > 0)) prev.t = G.t; HUD.ready[slot] = Object.assign(prev || {}, { cd: st.cd > 0 || (ult && ultFrac(p) < 1) });
  const flashK = prev && prev.t != null ? 1 - (G.t - prev.t) / 0.12 : 0;
  const rim = !icon ? UC.bevel : ult ? UC.gold : pot ? UC.hp : slot === 'lmb' ? UC.line : elColor(st.element);
  const empty = !icon;
  const dy = flashK > 0 ? -2 : 0;
  hudSlot(ctx, x, y, SLOT, empty ? UC.bevel : rim, icon, { gray: !!st.mpShort || !!st.stShort || (pot && !st.potions), dy });
  const ix = x + 6, iy = y + 6;
  if (!empty) {
    if (ult && ultFrac(p) < 1) { UI.sweep(ctx, x + 4, y + 4, 36, 36, 1 - ultFrac(p), { label: Math.floor(ultFrac(p) * 100) + '', col: UC.edge }); }
    else if (st.cdFrac > 0) UI.sweep(ctx, x + 4, y + 4, 36, 36, st.cdFrac, { label: st.cd >= 1 ? Math.ceil(st.cd) + '' : st.cd.toFixed(1) });
    else if (pot && st.cd > 0) UI.sweep(ctx, x + 4, y + 4, 36, 36, st.cd, {});
    if (ult && ultFrac(p) >= 1) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(G.t * 8); ctx.fillStyle = UC.gold; ctx.fillRect(x + 4, y + 4, 36, 36); ctx.globalAlpha = 1; hudFrame(ctx, x, y, SLOT, SLOT, 'slotRim', { tint: UC.gold, alpha: 1 }); }
    if (st.unavailable) { ctx.fillStyle = UC.edge; ctx.globalAlpha = 0.5; ctx.fillRect(x + 4, y + 4, 36, 36); ctx.globalAlpha = 1; }
    if (st.flash > 0) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = Math.min(0.6, st.flash * 2); ctx.fillRect(x + 4, y + 4, 36, 36); ctx.globalAlpha = 1; }
  }
  if (flashK > 0) {   // skill ready (R3 #8): a 120 ms white rim + a soft white fill + a 2 px halo, so it reads at a glance
    ctx.globalAlpha = flashK * 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y + 4, 36, 36);
    ctx.globalAlpha = flashK; hudFrame(ctx, x, y, SLOT, SLOT, 'slotRim', { tint: '#ffffff' }); UI.frame(ctx, x - 4, y - 4, SLOT + 8, SLOT + 8, 'focus', { tint: '#ffffff' }); ctx.globalAlpha = 1;
  }
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
  if (h.slot === 'pot') c = { title: 'Health Potion', titleCol: UC.hpHi, lines: [`Heal 40% of max HP. ${p.potions}/${potionMax(p)} charges, refilled at checkpoints.`] };
  else if (h.slot === 'lmb') { const w = weaponOf(p); c = { title: w.basic.name, lines: [p.equip.weapon ? `Basic attack of the ${w.name}. Builds MP on hit.` : 'Bare hands: a weak shove. Find a weapon.'] }; }
  else if (!st.id) return;
  else {
    const s = SKILLS[st.id];
    c = { title: s.name, titleCol: h.slot === 'r' ? UC.gold : UC.text, lines: [{ s: `${s.element}   ${s.mp ? s.mp + ' MP   ' : ''}${s.st ? s.st + ' ST   ' : ''}CD ${s.cd}s   Rank ${st.rank}`, col: UC.dim }, '', s.desc] };
  }
  UI.tooltip(ctx, Math.min(h.x, DW - 296), 300, c, { w: 288 });
}

// ===== minimap: rounded diamond, fog of war, hero arrow, enemies as 4 px dots =========================================================
// Big maps (DESIGN §25.2): the HUD shows a LOCAL window of MINI_WIN (24) tiles around the hero. m.mini.base is the whole map at
// 1 px per tile step ((W + H) + 2 * pad square; tile (i, j) at (ox + i - j, oy + i + j), 2x1 px); m.mini.rev the explored mask
// at the same scale; m.mini.vis the explored bitfield (saved: items.js world.fog, seeded here from G.prog.fog). The full-map
// screen (screens.js drawFullMap) reuses base / rev. Gutter tiles draw dark; tapping / clicking the minimap opens the full map.
const MINI_WIN = 24, MINI_PAD = 30, MINI_REVEAL = 9;
const MINI_COL = { g: '#4a9a63', f: '#6db56a', p: '#cbc4e4', w: '#4a8fd0', b: '#a87a5c', s: '#9a92c0', x: '#4d4570', r: '#7a5ab0', d: '#2d5647', pillar: '#8a80b0' };
function miniBuild(m) {
  const s = 46 / (MINI_WIN * 2), N = m.W + m.H + MINI_PAD * 2;
  const mk = (w = 56, h = 56) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').imageSmoothingEnabled = false; return c; };
  const base = mk(N, N), x = base.getContext('2d'), ox = MINI_PAD + m.H, oy = MINI_PAD;
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    const t = m.type[j][i], gt = m.gutter ? m.gutter[j * m.W + i] : 0;
    let c = t ? (m.block[j][i] && t !== 'w' && t !== 'pillar' ? '#b98a6a' : MINI_COL[t] || '#888') : gt ? (gt === 1 ? '#1c142c' : '#0a0612') : null;
    if (!c) continue;
    if (t && m.h[j][i] >= 4 && t !== 'pillar') c = mixHex(c, '#ffffff', 0.2);
    x.fillStyle = c; x.fillRect(ox + i - j - 1, oy + i + j, 2, 1);
  }
  m.mini = { base, s, ox, oy, N, rev: mk(N, N), tmp: mk(), shown: mk(), vis: new Uint8Array(m.W * m.H), dirty: true, win: '', prog: G.prog };   // prog: the run it belongs to
  const saved = typeof fogDecode === 'function' && G.prog && G.prog.fog ? fogDecode(G.prog.fog[m.id], m.W, m.H) : null;
  if (saved) {   // repaint the explored mask from the save
    const rx = m.mini.rev.getContext('2d'); rx.fillStyle = '#fff';
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (saved[j * m.W + i]) { m.mini.vis[j * m.W + i] = 1; rx.fillRect(ox + i - j - 2, oy + i + j - 1, 4, 3); }
  }
  HUD.fogTile = '';
}
// §29 G3 the vantage reveal: explore every tile within R of (x, y) at once (the same rev-canvas stamp as miniReveal); returns how many
// tiles were new. Only land tiles in the hero's section kind family count, so an underground section stays dark from a summit.
function miniRevealArea(m, x, y, R) {
  if (!m.mini || m.mini.prog !== G.prog) miniBuild(m);
  const mi = m.mini, rx = mi.rev.getContext('2d'); rx.fillStyle = '#fff'; let n = 0;
  const under = sec => !!(sec && sec.under);
  for (let j = Math.max(0, Math.floor(y - R)); j <= Math.min(m.H - 1, Math.ceil(y + R)); j++) for (let i = Math.max(0, Math.floor(x - R)); i <= Math.min(m.W - 1, Math.ceil(x + R)); i++) {
    if (Math.hypot(i + 0.5 - x, j + 0.5 - y) > R || mi.vis[j * m.W + i]) continue;
    if (m.sections && under(m.sections[m.secAt[j * m.W + i]])) continue;
    mi.vis[j * m.W + i] = 1; n++;
    rx.fillRect(mi.ox + i - j - 2, mi.oy + i + j - 1, 4, 3);
  }
  if (n) { mi.dirty = true; HUD.fogTile = null; mi.fullKey = null; }
  return n;
}
// mini-map pixel of a world point
const miniAt = (mi, x, y) => [mi.ox + (x - y), mi.oy + (x + y)];
function miniReveal(m, p) {
  const mi = m.mini, tx = Math.floor(p.x), ty = Math.floor(p.y), key = tx + ',' + ty + m.id;
  if (key === HUD.fogTile) return; HUD.fogTile = key;
  const rx = mi.rev.getContext('2d'); rx.fillStyle = '#fff';
  const R = MINI_REVEAL;
  for (let j = Math.max(0, ty - R); j <= Math.min(m.H - 1, ty + R); j++) for (let i = Math.max(0, tx - R); i <= Math.min(m.W - 1, tx + R); i++) {
    if (Math.hypot(i - p.x, j - p.y) > R || mi.vis[j * m.W + i]) continue;
    mi.vis[j * m.W + i] = 1; mi.dirty = true;
    rx.fillRect(mi.ox + i - j - 2, mi.oy + i + j - 1, 4, 3);
  }
}
// the 56x56 local window (2x on screen = 112 px), recomposed when the hero crosses a pixel or the fog grows
function miniCompose(m, wx, wy) {
  const mi = m.mini, t = mi.tmp.getContext('2d'), s = mi.shown.getContext('2d'), sx = wx - 28, sy = wy - 28;
  t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, 56, 56); t.drawImage(mi.base, sx, sy, 56, 56, 0, 0, 56, 56);
  t.globalCompositeOperation = 'destination-in'; t.drawImage(mi.rev, sx, sy, 56, 56, 0, 0, 56, 56);
  s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, 56, 56);
  s.globalAlpha = 0.18; s.drawImage(mi.base, sx, sy, 56, 56, 0, 0, 56, 56); s.globalAlpha = 1; s.drawImage(mi.tmp, 0, 0);
  s.globalCompositeOperation = 'destination-in'; UI.sprite(s, 'minimapMask', 0, 0, { scale: 1 });
  s.globalCompositeOperation = 'source-over'; mi.dirty = false;
}
function drawMinimap(ctx, p, X, Y) {
  const m = G.map; if (!uiReady()) return;
  if (!m.mini || m.mini.prog !== G.prog) miniBuild(m);   // a new game / a loaded save starts its own fog
  const mi = m.mini; miniReveal(m, p);
  const [hx, hy] = miniAt(mi, p.x, p.y), wx = Math.round(hx), wy = Math.round(hy), win = wx + ',' + wy;
  if (mi.dirty || mi.win !== win) { miniCompose(m, wx, wy); mi.win = win; }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mi.shown, X, Y, 112, 112);
  UI.sprite(ctx, 'minimap', X, Y, { scale: 2 });
  if (G.state === 'play' && !G.ui.map && !G.ui.open && !G.ui.pause && typeof openFullMap === 'function') UI.hit(X, Y, 112, 112, () => openFullMap(), { id: 'hud-minimap' });
  const mp = (x, y) => { const [a, b] = miniAt(mi, x, y); return [X + (a - wx + 28) * 2, Y + (b - wy + 28) * 2]; };
  const inside = (px, py) => Math.abs(px - (X + 56)) + Math.abs(py - (Y + 56)) < 46;
  for (const e of G.enemies) {
    if (e.dummy || e.dead) continue;
    const [ex, ey] = mp(e.x, e.y), d = e.boss ? 6 : 4; if (!inside(ex, ey)) continue;
    ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(ex) - d / 2 - 2, UI.snap(ey) - d / 2 - 2, d + 4, d + 4);
    ctx.fillStyle = e.boss ? UC.danger : UC.hpHi; ctx.fillRect(UI.snap(ex) - d / 2, UI.snap(ey) - d / 2, d, d);
  }
  if (typeof shrinesOf === 'function') for (const o of shrinesOf(m)) if (shrineFound(m, o.shrineId)) {   // attuned shrines
    const [qx, qy] = mp(o.x, o.y); if (!inside(qx, qy)) continue;
    ctx.fillStyle = UC.edge; ctx.fillRect(UI.snap(qx) - 3, UI.snap(qy) - 3, 6, 6); ctx.fillStyle = '#9ef0ff'; ctx.fillRect(UI.snap(qx) - 1, UI.snap(qy) - 1, 2, 2);
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
// word-wrap `s` into at most `maxLines` lines of width `w`; the last line is ellipsized when text remains
function hudWrapLines(s, w, size, maxLines) {
  const words = String(s).split(' '), out = []; let line = '', start = 0;
  for (let i = 0; i < words.length; i++) {
    const t = line ? line + ' ' + words[i] : words[i];
    if (UI.measure(t, size) > w && line) {
      if (out.length === maxLines - 1) return out.concat([fitText(words.slice(start).join(' '), w, size)]);
      out.push(line); line = words[i]; start = i;
    } else line = t;
  }
  if (line) out.push(fitText(line, w, size));
  return out;
}
// a boss fight is up: the bar is drawn (bossBarUp), or the boss entry banner / spawn-in is still playing (bossIntro)
const bossBarUp = () => { const b = G.boss; return !!(b && !b.dead && !(b.spawnT > 0.8)); };
const bossIntro = () => { const b = G.boss, bn = G.banner; return !!((bn && bn.boss && bn.t > 0) || (b && !b.dead && b.spawnT > 0)); };
function currentObjectiveText() { return (typeof currentObjective === 'function' ? currentObjective() : G.objective) || ''; }
// R3 #3: the tracker never runs under the minimap (its left edge is x 816 on both layouts), the objective wraps to 2 lines + "...",
// "Foes left" shows only while a wave / arena fight is live, and on touch nothing runs into the three icon buttons under it.
const TRACKER_RIGHT = 816;
const waveLive = () => {
  if (G.pendingSpawns > 0) return true;
  const ar = G.arena;
  return !!(ar && !ar.done && ar.map === G.map.id && G.enemies.some(e => !e.dummy && !e.dead && e.arena === ar.id));
};
function drawTracker(ctx, x, y) {
  const m = G.map, obj = currentObjectiveText(), ql = questLines(), key = m.id + '|' + obj + '|' + ql.join();
  if (HUD.trk.key !== key) { HUD.trk.key = key; HUD.trk.t0 = G.t; }
  const bar = bossBarUp(), touch = G.touch;
  const age = G.t - HUD.trk.t0, a = age < 6 ? 1 : Math.max(0.45, 1 - (age - 6) * 2);
  // boss bar up: desktop moves the tracker below it (bar ends at y 84); touch keeps the corner but shrinks to the column left of the bar
  if (bar && !touch) y = Math.max(y, 96);
  const colW = bar && touch ? 240 - x - 12 : TRACKER_RIGHT - x - 20;
  const floorY = touch ? touchMenu()[0].y + 2 : 1e9;   // touch: the bag / help / fullscreen buttons start here
  ctx.globalAlpha = bar && touch ? Math.min(a, 0.7) : a;
  UI.text(ctx, fitText(m.name, colW + 20, 'body'), x, y, 'body', UC.gold);
  let yy = y + 24;
  if (obj) {
    const L = hudWrapLines(obj, colW, 'body', 2), lh = UI.lineH('body') + 4;
    UI.text(ctx, '◆', x, yy, 'body', UC.gold);
    for (const l of L) { UI.text(ctx, l, x + 20, yy, 'body', UC.text); yy += lh; }
    yy += 24 - lh;
  }
  if (!(bar && touch)) {
    if (waveLive() && !bossIntro() && yy + 14 <= floorY) { const n = G.enemies.filter(e => !e.dummy && !e.dead).length; UI.text(ctx, `Foes left ${n}`, x + 20, yy, 'small', UC.hpHi); yy += 18; }
    for (const t of ql) { if (yy + 14 > floorY) break; UI.text(ctx, fitText(t, colW, 'small'), x + 20, yy, 'small', UC.dim); yy += 18; }
  }
  ctx.globalAlpha = 1;
  return yy;
}

// ===== boss bar ===========================================================================================================================
// Boss bar, phase model (DESIGN §26.1, client): bossBars(e) -> { n, i, frac, transition }. ONE full-width bar shows the current phase's
// HP; under it one yellow diamond per phase still to fight (n - i, the current one included), beaten phases are faded outlines
// (none for n = 1). When the bar empties (ghost-lag drain) the rightmost filled diamond flashes and dims over 0.4 s, then during
// `transition` the bar refills from empty to full with a pulsing "SHIELDED" look: that is the next phase's health bar.
const BOSS_REFILL = 1.2;
function drawBossPhases(ctx, bb, x, y, w, h, sh) {
  const n = bb.n, filled = Math.max(0, n - bb.i);
  if (HUD.phaseI != null && bb.i > HUD.phaseI) { HUD.diaBreak = { k: filled, t: G.t }; HUD.refillT = G.t; }
  HUD.phaseI = bb.i;
  let v = clamp(bb.frac, 0, 1), refill = false;
  if (bb.transition) { if (HUD.refillT == null || G.t - HUD.refillT > 5) HUD.refillT = G.t; v = easeOut(clamp((G.t - HUD.refillT) / (bb.tmax || BOSS_REFILL), 0, 1)); refill = true; }
  UI.bar(ctx, x, y, w, h, v, { id: 'boss-hp', col: UC.danger, hi: UC.hpHi });
  if (refill) {
    ctx.globalAlpha = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(G.t * 10)); ctx.fillStyle = UC.mpHi; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
    UI.text(ctx, 'SHIELDED', 480 + sh, y + 1, 'small', '#ffffff', 'center');
  }
  const dia = [];
  if (n > 1) for (let k = 0; k < n; k++) {
    const dx = 480 + sh + (k - (n - 1) / 2) * 24 - 7, dy = 58, brk = HUD.diaBreak && HUD.diaBreak.k === k ? G.t - HUD.diaBreak.t : 9;
    let state = k < filled ? 'full' : 'faded';
    if (brk < 0.4) {   // the diamond that just went: a white flash, then it dims to an outline
      state = 'fading'; const f = brk / 0.4;
      UI.sprite(ctx, 'bulletHollow', dx, dy, { scale: 2, tint: UC.dim });
      UI.sprite(ctx, 'bullet', dx, dy, { scale: 2, tint: brk < 0.1 ? '#ffffff' : UC.gold, alpha: brk < 0.1 ? 1 : 1 - f });
    } else if (state === 'full') UI.sprite(ctx, 'bullet', dx, dy, { scale: 2, tint: UC.gold });
    else UI.sprite(ctx, 'bulletHollow', dx, dy, { scale: 2, tint: UC.dim, alpha: 0.6 });
    dia.push(state);
  }
  HUD.bossSegs = { n, filled, dia, bar: v, refill, t: G.t };
}
function drawBossBar(ctx) {
  const b = G.boss; if (!b || b.dead || b.spawnT > 0.8) return;
  if (b.phase2 && !HUD.bossPhase) HUD.bossShakeT = G.t;
  HUD.bossPhase = !!b.phase2;
  const sh = G.t - HUD.bossShakeT < 0.4 ? (Math.floor(G.t * 40) % 2 ? 2 : -2) : 0;
  const x = 240 + sh, y = 34;
  UI.text(ctx, ENEMY.boss.name.toUpperCase(), 480 + sh, 8, 'body', UC.gold, 'center');
  const bb = typeof bossBars === 'function' ? bossBars(b) : null;
  if (bb) drawBossPhases(ctx, bb, x, y, 480, 14, sh); else UI.bar(ctx, x, y, 480, 14, b.hp / b.maxHp, { id: 'boss-hp', col: UC.danger, hi: UC.hpHi });
  const cap = STAGGER_CAP, f = clamp((b.stagger || 0) / cap, 0, 1), broke = G.t - (b.breakT || -9) < 0.8;
  const sc = broke ? (typeof flashReduceOn === 'function' && flashReduceOn() ? '#ff8a2a' : '#ffffff') : mixHex('#ffffff', '#ff8a2a', f);   // reduce flashing: no white BREAK frame
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
  const by = G.touch ? touchMenu()[0].y + 40 + 12 : 112;   // touch: below the three top-left buttons (R3 #3), wherever the safe area puts them
  HUD.bannerY = by;
  ctx.fillStyle = UC.edge; ctx.globalAlpha = a * 0.78; ctx.fillRect(0, by, DW, 64); ctx.globalAlpha = a;
  ctx.fillStyle = bn.boss ? UC.danger : UC.line; ctx.fillRect(0, by, DW, 2); ctx.fillRect(0, by + 62, DW, 2);
  UI.text(ctx, bn.s, 480, by + 6, 'heading', bn.boss ? UC.danger : UC.gold, 'center');
  if (bn.sub) UI.text(ctx, bn.sub, 480, by + 40, 'body', UC.text, 'center');
  ctx.globalAlpha = 1;
}
function drawSay(ctx) {
  if (G.tablet && G.tablet.src && G.state === 'play') return;   // an open tablet panel owns that band (the Elder Stone double render, QA kbm-004)
  if (G.msg && G.msg.t > 0) UI.text(ctx, G.msg.s, 480, 404, 'body', UC.text, 'center', { alpha: Math.min(1, G.msg.t * 2) });
}
// ===== Pip (§28): a small warm light parented to the hero (state + drift: game.js updatePip). Drawn here, over the lit scene, as an
// additive halo and a 3 px core; the lightmap entry (game.js pipLight) is the render lane's to add to drawScene's lights.
function drawPip(ctx) {
  const P = G.pip, p = G.player; if (!P || !p || p.dead || !G.map || typeof worldToView !== 'function') return;
  const [vx, vy] = worldToView(P.x, P.y, P.z), x = Math.round(vx * 2), y = Math.round(vy * 2);
  if (x < -60 || x > DW + 60 || y < -60 || y > DH + 60) return;
  const fl = 0.86 + 0.14 * Math.sin(G.t * 7.3) * Math.sin(G.t * 2.9);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 44);   // warm amber, so it never reads as one of the Vale's green fireflies
  g.addColorStop(0, `rgba(255,200,120,${0.8 * fl})`); g.addColorStop(0.3, `rgba(255,160,80,${0.32 * fl})`); g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 44, y - 44, 88, 88);
  ctx.globalAlpha = fl; ctx.fillStyle = '#ffb860'; ctx.fillRect(x - 4, y - 2, 8, 4); ctx.fillRect(x - 2, y - 4, 4, 8);
  ctx.fillStyle = '#fff1d0'; ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.restore();
}
function drawInteractPrompt(ctx) {
  const ip = interactPrompt(); if (!ip || G.touch) return;
  const gw = hudGlyphW('interact'), tw = UI.measure(ip.text, 'body'), w = gw + 8 + tw, tab = !!(G.tablet && G.tablet.src && G.state === 'play');
  const x = tab ? 824 - w : 480 - w / 2, y = tab ? 384 : 432;   // an open tablet panel (372-484): the prompt moves to its top-right corner (QA kbm-004)
  hudGlyph(ctx, 'interact', x, y);
  UI.text(ctx, ip.text, x + gw + 8, y + 2, 'body', UC.gold);
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
  const rows = G.touch ? [
    ['Left thumb', 'Joystick: move'], ['Big button (hold)', 'Weapon basic attack'], ['Tap a skill', 'Cast at the nearest enemy'], ['Drag a skill', 'Aim, release to cast'],
    ['Hold a skill', 'Open the bag'], ['Potion', 'Drink a potion (40% HP)'], ['Bag / ? / full', 'Top-left buttons'],
  ] : [
    ['move', 'Move'], ['aim', 'Aim'], ['attack', 'Attack (builds MP)'], ['skillQ', 'Weapon skills Q E R (R = ultimate)'], ['skillF', 'Chest skill (C = helmet)'],
    ['dodge', 'Dodge (boots skill)'], ['s1', 'Character skills 1 2 3'], ['potion', 'Potion'], ['interact', 'Interact / talk'], ['inventory', 'Bag, character, bestiary, quests'], ['pause', 'Pause and settings'],
  ];
  // the panel grows with the row count (R3 #1): heading, rows, one dim line, then the buttons, all inside the 540 px canvas
  const ROW = 26, top = 62, x = 180, w = 600;
  const footY = top + rows.length * ROW + 8, btnY = footY + 26, h = btnY + 36 + 18, y = Math.max(8, UI.snap((DH - h) / 2));
  UI.frame(ctx, x, y, w, h, 'primary');
  UI.text(ctx, 'HOW TO PLAY', 480, y + 16, 'heading', UC.gold, 'center');
  let yy = y + top;
  for (const [k, v] of rows) {
    if (G.touch) UI.text(ctx, k, x + 32, yy + 2, 'body', UC.stHi); else { const gw = hudGlyph(ctx, k, x + 32, yy - 2); if (!gw) UI.text(ctx, IN.glyph(k), x + 32, yy + 2, 'body', UC.stHi); }
    UI.text(ctx, v, x + 200, yy + 2, 'body', UC.text); yy += ROW;
  }
  UI.text(ctx, 'You are what you wear: gear decides Q E R F C SHIFT.', 480, y + footY, 'small', UC.dim, 'center');
  const title = G.state === 'title';
  UI.button(ctx, 480 - 170, y + btnY, 160, 36, 'SETTINGS', { id: 'btn:help-settings', size: 'small', fn: () => { G.ui.help = false; if (title) G.ui.settings = true; else G.ui.pause = true; } });
  UI.button(ctx, 480 + 10, y + btnY, 160, 36, 'CLOSE', { id: 'btn:help-close', size: 'small', def: true, fn: () => { G.ui.help = false; } });
  HUD.helpRect = { x, y, w, h, btnY: y + btnY, lastRowY: y + top + (rows.length - 1) * ROW };
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
  hudFaded(ctx, hudA('bars'), c => drawPortrait(c, p));
  if (mirror) ctx.restore();
  hudFaded(ctx, hudA('bars'), c => drawStatusRow(c, p, touch ? DW - 24 : 100, touch ? 148 : 428, touch));
  if (!touch) drawSkillBar(ctx, p, inert);
  if (!(hudA('map') > 0)) { const m = G.map; if (!m.mini || m.mini.prog !== G.prog) miniBuild(m); miniReveal(m, p); }   // hidden (§28): the fog still records the walk
  hudFaded(ctx, hudA('map'), c => drawMinimap(c, p, touch ? DW - 24 - 112 : 832, touch ? 24 : 16));
  hudFaded(ctx, hudA('tracker'), c => drawTracker(c, touch ? 24 : 16, touch ? 24 : 16));
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
  if (G.portrait && typeof drawRotateCard === 'function') { drawRotateCard(ctx); return; }   // R3 #2: phone held upright (screens.js)
  if (G.state === 'title') { drawTitle(ctx); return; }
  const p = G.player, u = G.ui;
  drawPip(ctx);
  drawDamageNumbers(ctx); drawDropNames(ctx); drawNameplates(ctx);
  if (u.open) {   // Tab screens: scene dimmed to 35 %, play HUD hidden
    ctx.fillStyle = '#05030c'; ctx.globalAlpha = 0.65; ctx.fillRect(0, 0, DW, DH); ctx.globalAlpha = 1;
    drawTabScreen(ctx);
    return;
  }
  const modal = u.help || u.pause || u.map || G.state === 'dead';
  if (TOUCH_AIM) updateTouchAim();   // drops a stale drag when a menu opens or the hero dies
  drawPlayHud(ctx, p, modal);
  if (G.touch && G.state === 'play' && !modal) drawTouchControls(ctx);
  if (u.map && typeof drawFullMap === 'function') drawFullMap(ctx);   // full-map screen (screens.js)
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
  { const is = o.iconSize || 32; if (o.icon) hudIcon(ctx, o.icon, x - is / 2, y - is / 2, { gray: o.gray, size: is }); }
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
  touchBtn(ctx, b.x, b.y, b.r, rim, { icon, gray: short, cdFrac: ult ? (ultFrac(p) < 1 ? 1 - ultFrac(p) : 0) : st.cdFrac, held, lift: aiming ? 4 : 0, flash: fl, alpha: a * lock });
  if (st.id && a > 0.5) {
    const y = b.y - (aiming ? 4 : 0);
    if (ult && ultFrac(p) < 1) UI.text(ctx, Math.floor(ultFrac(p) * 100) + '', b.x, y - 7, 'small', UC.text, 'center');
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
    if (b.slot !== 'interact' && b.slot !== 'atk' && !(chipAlpha(p, b.slot === 'pot' ? 'pot' : b.slot) > 0)) continue;   // §28: hidden until its noun
    if (b.slot === 'pot') {
      const st = skillSlotState(p, 'pot'), n = p.potions || 0;
      touchBtn(ctx, b.x, b.y, b.r, UC.hp, { icon: miscIcon('potion'), gray: !n, cdFrac: st.cd > 0 ? st.cd / 1 : 0, held });
      for (let i = 0; i < potionMax(p); i++) {   // one pip per potion on the rim
        const a = (270 + (i - (potionMax(p) - 1) / 2) * 24) * TDEG, px = b.x + Math.cos(a) * (b.r - 3), py = b.y + Math.sin(a) * (b.r - 3);
        ctx.fillStyle = '#0b0716'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
        ctx.fillStyle = i < n ? UC.hpHi : UC.bevel; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 7); ctx.fill();
      }
      continue;
    }
    if (b.slot === 'interact') { touchBtn(ctx, b.x, b.y, b.r, UC.gold, { held, label: G.prompt ? G.prompt.text.split(' ')[0].toUpperCase() : 'USE' }); continue; }
    if (b.slot === 'atk') {
      touchBtn(ctx, b.x, b.y, b.r, UC.line, { held, icon: uiItemIcon(p.equip.weapon), iconSize: 48 });
      const ch = ultFrac(p);
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
