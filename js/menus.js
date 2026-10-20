'use strict';
// ---------------------------------------------------------------------------
// menus.js — the Tab screens (INVENTORY / CHARACTER / BESTIARY / QUESTS), docs/HUD.md "Screens".
// DRAWING + hit/focus registration only. The actions they call live in items.js (clickBag / clickItem / clickSocket,
// equipItem, salvageItem, combineGems, sortBag) and game.js (chooseSkillMod); selection state lives in G.ui
// (open, tab, sel, gem, salvage, note, skSel, scr). Every control registers with UI.focus under a stable id
// ('tab:inv', 'bag:3', 'eq:weapon', 'sock:1', 'btn:sort', ...), so mouse, touch and gamepad all work.
// Loaded after hud.js (uses HUD helpers hudFrame / elChip / hudGlyph) and before screens.js.
// ---------------------------------------------------------------------------
const TAB_DEFS = [
  { id: 'inv', label: 'INVENTORY', act: 'inventory' }, { id: 'skills', label: 'CHARACTER', act: 'character' },
  { id: 'bestiary', label: 'BESTIARY', act: 'bestiary' }, { id: 'quests', label: 'QUESTS', act: 'quests' },
];
const TAB_IDS = TAB_DEFS.map(t => t.id);
const PX = 20, PY = 20, PW = 920, PH = 500;           // the panel
const COL1 = 28, COL2 = 252, COL3 = 596;               // column left edges (220 | 340 | 336)
const STAT_ELS = RES_ELS;

// ---- shared helpers -------------------------------------------------------------------------------------------------
// hit region + focus target + hover in one call; returns { hover, focus, on }
function mnRegion(x, y, w, h, id, fn, o = {}) {
  UI.hit(x, y, w, h, fn, { alt: o.alt, id });
  UI.focus.register({ x, y, w, h }, id, { fn, alt: o.alt, def: o.def });
  const hover = UI.mouseIn(x, y, w, h), focus = UI.focus.is(id) && UI.focus.showing();
  if (hover && !UI.focus.nav) UI.focus.set(id);
  return { hover, focus, on: hover || focus };
}
function fitText(s, w, size = 'small') {
  s = String(s); if (UI.measure(s, size) <= w) return s;
  while (s.length > 1 && UI.measure(s + '…', size) > w) s = s.slice(0, -1);
  return s + '…';
}
function mnDivider(ctx, x, y, w, h) { ctx.fillStyle = UC.bevel; ctx.fillRect(x, y, w, h); }
function mnHead(ctx, s, x, y, col = UC.dim) { UI.text(ctx, s, x, y, 'small', col); }
// scrolling: offset per list key in G.ui.scr; wheel over the list rect scrolls; focus keeps its row visible
function mnScroll(key, x, y, w, h, total) {
  const u = G.ui; u.scr = u.scr || {};
  let s = u.scr[key] || 0;
  if (u.wheel && UI.mouseIn(x, y, w, h)) { s += clamp(u.wheel, -48, 48); u.wheel = 0; }
  u.scr[key] = clamp(s, 0, Math.max(0, total - h)); return u.scr[key];
}
function mnReveal(key, h, y0, rowY, rowH) {   // keep a focused row inside the viewport
  const u = G.ui, s = u.scr[key] || 0;
  if (rowY < y0 + s) u.scr[key] = Math.max(0, rowY - y0); else if (rowY + rowH > y0 + s + h) u.scr[key] = rowY + rowH - y0 - h;
}
function mnScrollbar(ctx, x, y, h, total, off) {
  if (total <= h) return;
  UI.frame(ctx, x, y, 10, h, 'scrollTrack');
  const th = Math.max(24, Math.round(h * h / total)), ty = y + Math.round((h - th) * off / (total - h));
  UI.frame(ctx, x, UI.snap(ty), 10, UI.snap(th), 'scrollThumb');
}
function setTab(id) { const u = G.ui; if (u.tab !== id) { u.tab = id; u.gem = null; u.salvage = false; u.sel = null; sfx('pickup'); } }
function cycleTab(d) { setTab(TAB_IDS[(TAB_IDS.indexOf(G.ui.tab || 'inv') + d + TAB_IDS.length) % TAB_IDS.length]); }

// ---- the frame: panel, tabs, dust, close ---------------------------------------------------------------------------------
function drawTabScreen(ctx) {
  const u = G.ui, p = G.player;
  if (!HUD.tabWas) { HUD.tabWas = true; HUD.tabT = G.t; }
  const k = clamp((G.t - HUD.tabT) / 0.1, 0, 1);
  ctx.save();
  if (k < 1) { const sc = 0.96 + 0.04 * k; ctx.translate(480, 270); ctx.scale(sc, sc); ctx.translate(-480, -270); }
  hudFrame(ctx, PX, PY, PW, PH, 'primary');
  const tab = u.tab || 'inv';
  let tx = PX + 16;
  for (const t of TAB_DEFS) {
    const on = tab === t.id, w = UI.measure(t.label, 'body') + 24 + (on ? 0 : 0), h = on ? 40 : 36, y = PY + (on ? 8 : 12);
    const r = mnRegion(tx, y, w, h, 'tab:' + t.id, () => setTab(t.id));
    UI.frame(ctx, tx, y, w, h, on ? 'tabActive' : 'tabInactive');
    UI.text(ctx, t.label, tx + w / 2, y + (h - 18) / 2 + 2, 'body', on || r.on ? UC.gold : UC.dim, 'center');
    tx += w + 6;
  }
  const dust = `${p.dust} Dust`;
  UI.sprite(ctx, 'bullet', PX + PW - 120 - UI.measure(dust, 'body') - 22, PY + 20, { scale: 2, tint: UC.bright });
  UI.text(ctx, dust, PX + PW - 120, PY + 16, 'body', UC.bright, 'right');
  const cx = PX + PW - 56;
  const cr = mnRegion(cx, PY + 12, 36, 36, 'close', () => closeInv());
  UI.sprite(ctx, cr.on ? 'closeXHover' : 'closeX', cx + 6, PY + 18, { scale: 2 });
  UI.text(ctx, IN.device === 'touch' ? '' : IN.glyph('back'), cx - 6, PY + 20, 'small', UC.dim, 'right');
  mnDivider(ctx, PX + 12, PY + 52, PW - 24, 2);
  // columns
  mnDivider(ctx, COL2 - 4, PY + 58, 2, PH - 74); mnDivider(ctx, COL3 - 4, PY + 58, 2, PH - 74);
  if (tab === 'inv') drawInventoryTab(ctx, p);
  else if (tab === 'skills') drawCharacterTab(ctx, p);
  else if (tab === 'bestiary') drawBestiaryTab(ctx, p);
  else drawQuestsTab(ctx, p);
  ctx.restore();
  UI.focus.draw(ctx);
}

// ===== INVENTORY ===================================================================================================================
const EQ_POS = { weapon: [40, 92], head: [184, 92], chest: [40, 176], boots: [184, 176] };
const EQ_LABEL = { weapon: 'Weapon', head: 'Helm', chest: 'Chest', boots: 'Boots' };
function statRows(p, short) {
  const S = short ? { 'Crit dmg': 'CDmg', 'Skill dmg': 'SkDmg', Potions: 'Pots', Speed: 'Spd', Regen: 'Rgn' } : {};
  return [['Atk', Math.round(item('weapon', p.gear.weapon).basic.dmg * p.power)], ['HP', p.maxHp], ['MP', p.maxMp], ['Def', pctText(p.def)], ['Crit', pctText(p.crit)], ['Crit dmg', '+' + pctText(p.critDmg)],
    ['Haste', '+' + pctText(p.haste)], ['CDR', '-' + pctText(p.cdr)], ['Skill dmg', '+' + pctText(p.skillDmg)], ['Regen', `${+p.regen.toFixed(1)}/s`], ['Potions', `${p.potions}/${MAX_POTIONS}`], ['Speed', `+${Math.round((p.speed / 3.7 - 1) * 100)}%`]].map(([k, v]) => [S[k] || k, v]);
}
function drawStats(ctx, p, x, y, colW, rowH, short) {
  statRows(p, short).forEach(([k, v], i) => {
    const sx = x + (i % 2) * colW, sy = y + Math.floor(i / 2) * rowH;
    UI.text(ctx, k, sx, sy, 'small', UC.dim); UI.text(ctx, String(v), sx + colW - 12, sy, 'small', UC.text, 'right');
  });
}
function drawResistRow(ctx, p, x, y, cell) {
  STAT_ELS.forEach((el, i) => {
    const cx = x + (i % 4) * cell, cy = y + Math.floor(i / 4) * 28, v = Math.round((p.res[el] || 0) * 100);
    elChip(ctx, cx, cy, el, v > 0 ? null : v < 0 ? 'weak' : null);
    UI.text(ctx, (v > 0 ? '+' : '') + v, cx + 24, cy + 3, 'small', v > 0 ? UC.text : v < 0 ? UC.danger : UC.dim);
  });
}
function drawItemSlot(ctx, x, y, s, it, o = {}) {
  if (it) { UI.frame(ctx, x, y, s, s, 'rarity', { rarity: it.rarity }); ctx.drawImage(itemIcon(it), x + (s - 32) / 2, y + (s - 32) / 2, 32, 32); }
  else hudFrame(ctx, x, y, s, s, 'slot', null);
  if (it) it.sockets.forEach((g, k) => { ctx.fillStyle = UC.edge; ctx.fillRect(x + 6 + k * 10, y + s - 12, 8, 8); ctx.fillStyle = g ? gemParse(g).def.col : '#3a3058'; ctx.fillRect(x + 8 + k * 10, y + s - 10, 4, 4); });
  if (o.sel) UI.frame(ctx, x - 4, y - 4, s + 8, s + 8, 'focus', { tint: o.salvage ? UC.danger : UC.gold });
}
function drawDoll(ctx, p, cx, y) {
  const spr = p.spr.front[0], sc = 3, w = spr.width * sc, h = spr.height * sc;
  ctx.fillStyle = UC.edge; ctx.globalAlpha = 0.45; ctx.fillRect(cx - 24, y + h - 4, 48, 6); ctx.fillRect(cx - 18, y + h + 2, 36, 4); ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, UI.snap(cx - w / 2), UI.snap(y), w, h);
  const best = Math.max(...SLOTS.map(s => (p.equip[s] ? RARITY[p.equip[s].rarity].i : 0)));
  if (best >= 3) {   // legendary-ish gear: sparkles orbit the hero
    const rc = SLOTS.map(s => p.equip[s]).filter(Boolean).sort((a, b) => RARITY[b.rarity].i - RARITY[a.rarity].i)[0];
    for (let i = 0; i < 4; i++) { const a = G.t * 1.4 + i * 1.6, sx = cx + Math.cos(a) * 40, sy = y + h / 2 + Math.sin(a * 1.3) * 44; ctx.fillStyle = rarityCol(rc.rarity); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.t * 5 + i); ctx.fillRect(UI.snap(sx), UI.snap(sy), 4, 4); }
    ctx.globalAlpha = 1;
  }
}
function whatOf(p, id) {
  if (!id) return null;
  if (id.startsWith('bag:')) { const e = p.bag[+id.slice(4)]; return e ? (e.gem ? { gemIdx: +id.slice(4) } : { it: e, bi: +id.slice(4) }) : null; }
  if (id.startsWith('eq:')) { const it = p.equip[id.slice(3)]; return it ? { it, eq: true } : null; }
  return null;
}
function drawInventoryTab(ctx, p) {
  const u = G.ui; let hov = null;
  const gemPick = u.gem != null && p.bag[u.gem] && p.bag[u.gem].gem ? u.gem : null; if (gemPick == null) u.gem = null;
  const sel = u.sel;
  // ---- column 1: paper doll + sheet ----
  for (const slot of SLOTS) {
    const [x, y] = EQ_POS[slot], it = p.equip[slot];
    const r = mnRegion(x, y, 48, 48, 'eq:' + slot, () => clickItem(it));
    drawItemSlot(ctx, x, y, 48, it, { sel: sel === it && it });
    UI.text(ctx, EQ_LABEL[slot], x + 24, y + 50, 'small', UC.dim, 'center');
    if (r.on && it) hov = { it, eq: true };
  }
  drawDoll(ctx, p, 136, 108);
  mnDivider(ctx, COL1 + 8, 244, 200, 2);
  UI.text(ctx, `Lv ${p.level}`, COL1 + 8, 254, 'body', UC.gold);
  const need = xpToNext(p.level);
  UI.text(ctx, p.level >= MAX_LEVEL ? 'MAX' : `${Math.floor(p.xp)}/${need} XP`, COL1 + 208, 258, 'small', UC.dim, 'right');
  UI.bar(ctx, COL1 + 12, 284, 192, 8, p.level >= MAX_LEVEL ? 1 : p.xp / need, { id: 'tab-xp', col: UC.xp, hi: UC.xp, ghost: false, wipe: false });
  drawStats(ctx, p, COL1 + 4, 308, 108, 20, true);
  mnHead(ctx, 'RESIST', COL1 + 8, 428);
  drawResistRow(ctx, p, COL1 + 8, 448, 52);
  // ---- column 2: bag ----
  const bx = COL2 + 10, by = 108, filled = p.bag.filter(Boolean).length;
  UI.text(ctx, `BAG ${filled}/${BAG_SIZE}`, bx, 80, 'body', UC.stHi);
  UI.button(ctx, COL2 + 232, 72, 84, 30, 'SORT', { id: 'btn:sort', size: 'small', fn: () => { sortBag(p); u.sel = null; u.gem = null; sfx('pickup'); } });
  for (let i = 0; i < BAG_SIZE; i++) {
    const cx = bx + (i % 6) * 54, cy = by + Math.floor(i / 6) * 54, e = p.bag[i];
    const r = mnRegion(cx, cy, 48, 48, 'bag:' + i, alt => clickBag(i, alt === true), { alt: () => clickBag(i, true), def: i === 0 });
    if (!e) { hudFrame(ctx, cx, cy, 48, 48, 'slot'); ctx.fillStyle = UC.edge; ctx.globalAlpha = r.on ? 0.1 : 0.35; ctx.fillRect(cx + 4, cy + 4, 40, 40); ctx.globalAlpha = 1; if (r.on) UI.frame(ctx, cx - 4, cy - 4, 56, 56, 'focus', { tint: UC.dim }); continue; }
    if (e.gem) {
      const g = gemParse(e.gem), on = gemPick === i;
      UI.frame(ctx, cx, cy, 48, 48, 'slot', { col: g.def.col });
      ctx.drawImage(gemIcon(g.type, g.grade), cx + 8, cy + 8, 32, 32);
      UI.text(ctx, GEM_GRADES[g.grade - 1][0], cx + 6, cy + 4, 'small', UC.text);
      if (e.n > 1) UI.text(ctx, 'x' + e.n, cx + 44, cy + 30, 'small', UC.text, 'right');
      if (on) UI.frame(ctx, cx - 4, cy - 4, 56, 56, 'focus', { tint: g.def.col });
      if (r.on) hov = { gemIdx: i };
    } else {
      drawItemSlot(ctx, cx, cy, 48, e, { sel: sel === e, salvage: u.salvage });
      if (e.reqLvl > p.level) UI.text(ctx, 'L' + e.reqLvl, cx + 44, cy + 30, 'small', UC.danger, 'right');
      if (r.on) hov = { it: e, bi: i };
    }
  }
  // bag actions
  const ay = by + 5 * 54 + 8, sv = u.salvage;
  UI.button(ctx, bx, ay, 100, 32, sv ? 'SALVAGE ON' : 'SALVAGE', { id: 'btn:salvage', size: 'small', kind: sv ? 'danger' : 'plain', col: sv ? UC.hpHi : null, fn: () => { u.salvage = !u.salvage; u.gem = null; u.confirm = null; } });
  UI.button(ctx, bx + 108, ay, 100, 32, 'COMBINE', { id: 'btn:combine', size: 'small', fn: () => doCombine(p) });
  UI.button(ctx, bx + 216, ay, 100, 32, 'SELL', { id: 'btn:sell', size: 'small', fn: () => doSell(p) });
  const noteOn = u.note && u.note.t > G.t;
  const hint = gemPick != null ? `${gemName(p.bag[gemPick].gem)} picked: choose a socket or an item` : sv ? 'Salvage is on: pick gear to turn it into Dream Dust' :
    IN.device === 'touch' ? 'Tap: details, tap again: equip. Hold: salvage.' : IN.device === 'pad' ? `${IN.glyph('accept')} select / equip   ${IN.glyph('menuAlt')} salvage   ${IN.glyph('tabPrev')}${IN.glyph('tabNext')} tabs` : 'Click: equip   Right-click: salvage   Gems: click a gem, then a socket';
  UI.wrap(ctx, noteOn ? u.note.s : hint, bx, ay + 44, 320, 'small', noteOn ? u.note.col : UC.dim);
  // ---- column 3: item / gem ----
  let what = hov;
  if (!what && UI.focus.showing() && UI.focus.current()) what = whatOf(p, UI.focus.current().id);
  if (!what && sel) what = sel.gem ? { gemIdx: sel.gemIdx } : sel.sockets ? { it: sel, bi: p.bag.indexOf(sel), eq: isEquipped(p, sel) } : null;
  drawItemPanel(ctx, p, COL3 + 4, 76, 324, what, hov, gemPick);
}
function doCombine(p) {
  const u = G.ui; let bi = u.sel && u.sel.gem != null ? u.sel.gemIdx : -1;
  if (bi < 0 || !p.bag[bi] || p.bag[bi].n < 3) bi = p.bag.findIndex(e => e && e.gem && e.n >= 3 && gemParse(e.gem).grade < GEM_MAX);
  if (bi < 0) { invNote('Need 3 matching gems to combine', UC.dim); return; }
  const r = combineGems(p, bi); if (r) invNote(r); else { invNote('Gems combined: one grade up', UC.mpHi); sfx('levelup'); u.gem = null; u.sel = null; }
}
function doSell(p) {
  const u = G.ui, e = u.sel && u.sel.sockets && !isEquipped(p, u.sel) ? u.sel : null, bi = e ? p.bag.indexOf(e) : -1;
  if (bi < 0) { invNote('Select a bag item to sell', UC.dim); return; }
  if (RARITY[e.rarity].i >= 3 && u.confirm !== e) { u.confirm = e; invNote(`Sell ${itemName(e)}? Press again`, UC.gold); return; }
  const r = salvageItem(p, bi); u.confirm = null;
  if (typeof r === 'string') invNote(r); else { invNote(`Sold for ${r} Dream Dust`, UC.bright); sfx('chest'); u.sel = null; }
}
// tooltip / compare column: green / red deltas against the equipped piece
function drawItemPanel(ctx, p, x, y, w, what, hov, gemPick) {
  const u = G.ui;
  if (!what) { UI.wrap(ctx, IN.device === 'touch' ? 'Tap an item or gem to see it here.' : 'Hover or select an item to see it here.', x + 8, y + 8, w - 16, 'small', UC.dim); return; }
  const gemId = what.gemIdx != null ? p.bag[what.gemIdx] && p.bag[what.gemIdx].gem : null;
  if (what.gemIdx != null) {
    if (!gemId) return;
    const g = gemParse(gemId); if (!g) return;
    UI.text(ctx, gemName(gemId), x + 8, y, 'body', g.def.col);
    UI.text(ctx, 'Gem', x + 8, y + 24, 'small', UC.dim);
    let yy = y + 52;
    UI.text(ctx, 'In armour', x + 8, yy, 'small', UC.dim); yy += 18;
    for (const [k, v] of Object.entries(g.def.arm(g.grade))) { UI.text(ctx, fmtStat(k, v), x + 16, yy, 'small', UC.mpHi); yy += 18; }
    yy += 6; UI.text(ctx, 'In weapon', x + 8, yy, 'small', UC.dim); yy += 18;
    for (const [k, v] of Object.entries(g.def.wpn(g.grade))) { UI.text(ctx, fmtStat(k, v), x + 16, yy, 'small', UC.mpHi); yy += 18; }
    yy += 10; UI.text(ctx, `Amplifies: ${g.def.amp}`, x + 8, yy, 'small', UC.gold); yy += 24;
    UI.wrap(ctx, g.type === 'diamond' ? `+${g.grade * 5}% ultimate charge` : g.type === 'topaz' ? `+${g.grade * 5}% lightning dmg, chains +1 per 2 grades` : `+${g.grade * 5}% ${g.def.el} skill damage`, x + 8, yy, w - 16, 'small', UC.text);
    UI.wrap(ctx, 'Pick it, then choose a socket. Three of a kind combine into the next grade.', x + 8, 440, w - 16, 'small', UC.dim);
    return;
  }
  const it = what.it; if (!it || !BASES[it.base]) return;
  const b = BASES[it.base], R = RARITY[it.rarity], eq = p.equip[b.slot], cmp = eq && eq !== it ? statsOf(eq) : null, mine = statsOf(it);
  UI.text(ctx, fitText(itemName(it), w - 16, 'body'), x + 8, y, 'body', rarityCol(it.rarity));
  UI.text(ctx, `${R.name} ${EQ_LABEL[b.slot]}   T${b.tier + 1}   ilvl ${it.ilvl}`, x + 8, y + 24, 'small', UC.dim);
  UI.text(ctx, `Requires Lv ${it.reqLvl}`, x + 8, y + 42, 'small', it.reqLvl > p.level ? UC.danger : UC.dim);
  // sockets: clickable, filled / empty diamonds
  let yy = y + 66;
  it.sockets.forEach((g, k) => {
    const sx = x + 8 + k * 36, r = mnRegion(sx, yy, 32, 32, 'sock:' + k, () => clickSocket(it, k));
    hudFrame(ctx, sx, yy, 32, 32, 'slot');
    if (g) ctx.drawImage(gemIcon(gemParse(g).type, gemParse(g).grade), sx + 8, yy + 8, 16, 16);
    else UI.sprite(ctx, 'bulletHollow', sx + 9, yy + 9, { scale: 2, tint: gemPick != null ? UC.gold : UC.dim });
    if (r.on) UI.frame(ctx, sx - 4, yy - 4, 40, 40, 'focus', { tint: UC.bright });
  });
  yy += it.sockets.length ? 44 : 0;
  const delta = k => cmpDelta(ctx, x + w - 8, yy, k, mine, cmp);
  const base = itemBase(it);
  for (const k of STAT_ORDER) if (base[k]) { UI.text(ctx, fmtStat(k, base[k], k !== 'dmg'), x + 8, yy, 'small', UC.text); delta(k); yy += 18; }
  for (const a of it.affixes) { UI.text(ctx, fmtStat(a.stat, a.v), x + 8, yy, 'small', UC.mpHi); delta(a.stat); yy += 18; }
  it.sockets.forEach(g => { if (g) { const gs = gemStats(g, it.slot); UI.text(ctx, fitText(`${gemName(g)}: ${Object.entries(gs).map(([k, v]) => fmtStat(k, v)).join(', ')}`, w - 16), x + 8, yy, 'small', gemParse(g).def.col); yy += 18; } });
  if (it.unique && UNIQUES[it.unique]) { yy += 4; yy = UI.wrap(ctx, UNIQUES[it.unique].desc, x + 8, yy, w - 16, 'small', UC.gold); }
  // skills with icons
  yy += 6; mnDivider(ctx, x + 8, yy, w - 16, 2); yy += 10;
  const fam = item(b.slot, b.family);
  if (b.slot === 'weapon') for (const k of ['q', 'e', 'r']) { ctx.drawImage(skillIcon(fam[k][0]), x + 8, yy, 32, 32); UI.text(ctx, k.toUpperCase(), x + 46, yy + 2, 'small', UC.dim); UI.text(ctx, fitText(fam[k].map(id => SKILLS[id].name).join(' / '), w - 76), x + 84, yy + 2, 'small', UC.text); yy += 36; }
  else { ctx.drawImage(skillIcon(fam.skill), x + 8, yy, 32, 32); UI.text(ctx, { chest: 'F', head: 'C', boots: 'SHF' }[b.slot], x + 46, yy + 2, 'small', UC.dim); UI.text(ctx, SKILLS[fam.skill].name, x + 84, yy + 2, 'small', UC.text); yy += 36; }
  if (what.eq || eq === it) UI.text(ctx, 'Equipped', x + 8, 432, 'small', UC.gold);
  else if (what.bi != null && what.bi >= 0) {
    UI.text(ctx, cmp ? 'vs equipped:' : 'Nothing equipped here', x + 8, 436, 'small', UC.dim);
    UI.button(ctx, x + 8, 464, 140, 32, 'EQUIP', { id: 'btn:equip', size: 'small', fn: () => { const r = equipItem(p, it); if (r) invNote(r); else { sfx('shield'); u.sel = it; } } });
    UI.button(ctx, x + 156, 464, 140, 32, 'SELL', { id: 'btn:sell2', size: 'small', fn: () => { u.sel = it; doSell(p); } });
  }
}
function cmpDelta(ctx, rx, y, k, mine, cmp) {
  if (!cmp) return;
  const d = (mine[k] || 0) - (cmp[k] || 0); if (Math.abs(d) < 1e-3) return;
  const good = k === 'cdr' ? d > 0 : d > 0;
  UI.text(ctx, `(${fmtStat(k, d, true).split(' ')[0]})`, rx, y, 'small', good ? '#6ee36e' : UC.danger, 'right');
}

// ===== CHARACTER ===================================================================================================================
function toggleCharSkill(id) {
  const p = G.player, i = p.csk.indexOf(id);
  if (i >= 0) p.csk.splice(i, 1); else if (p.csk.length < 3) p.csk.push(id); else p.csk[2] = id;
}
function skillSlotBox(ctx, id, x, y, id2, fn, o = {}) {   // a 44 px skill slot, focusable; returns the region
  const r = mnRegion(x, y, 44, 44, id2, fn, { def: o.def });
  hudFrame(ctx, x, y, 44, 44, 'slot');
  if (id) ctx.drawImage(skillIcon(id), x + 6, y + 6, 32, 32);
  hudFrame(ctx, x, y, 44, 44, 'slotRim', { tint: o.rim || (id ? elColor(SKILLS[id].element) : UC.bevel) });
  if (o.sel) UI.frame(ctx, x - 4, y - 4, 52, 52, 'focus', { tint: UC.gold });
  else if (r.on) UI.frame(ctx, x - 4, y - 4, 52, 52, 'focus', { tint: UC.dim });
  return r;
}
function drawCharacterTab(ctx, p) {
  const u = G.ui, w = item('weapon', p.gear.weapon); let hoverId = null;
  mnHead(ctx, `${w.name.toUpperCase()}`, COL1 + 8, 76);
  ['q', 'e', 'r'].forEach((slot, i) => {
    const y = 96 + i * 52;
    UI.text(ctx, slot.toUpperCase(), COL1 + 8, y + 14, 'body', slot === 'r' ? UC.gold : UC.stHi);
    w[slot].forEach((id, k) => {
      const cur = p.wsk[w.id][slot] === id;
      const r = skillSlotBox(ctx, id, COL1 + 40 + k * 52, y, `sk:${slot}${k}`, () => { p.wsk[w.id][slot] = id; u.skSel = id; }, { sel: cur, rim: slot === 'r' ? UC.gold : null, def: i === 0 && k === 0 });
      if (r.on) hoverId = id;
    });
    const cur = p.wsk[w.id][slot], rp = skillRankProgress(p, cur);
    UI.text(ctx, `Rk ${rp.rank}`, COL1 + 148, y + 14, 'small', UC.dim);
  });
  mnHead(ctx, 'ARMOUR', COL1 + 8, 258);
  [['F', 'chest'], ['C', 'head'], ['SHF', 'boots']].forEach(([k, slot], i) => {
    const id = item(slot, p.gear[slot]).skill, r = skillSlotBox(ctx, id, COL1 + 8 + i * 52, 278, 'ar:' + slot, () => { u.skSel = id; });
    UI.text(ctx, k, COL1 + 30 + i * 52, 326, 'small', UC.dim, 'center');
    if (r.on) hoverId = id;
  });
  mnHead(ctx, 'SKILLS: PICK 3', COL1 + 8, 344);
  CHAR_SKILLS.forEach((id, i) => {
    const x = COL1 + 8 + (i % 3) * 52, y = 364 + Math.floor(i / 3) * 56, idx = p.csk.indexOf(id);
    const r = skillSlotBox(ctx, id, x, y, 'cs:' + id, () => { toggleCharSkill(id); u.skSel = id; }, { sel: idx >= 0, rim: idx >= 0 ? UC.xp : null });
    if (idx >= 0) UI.text(ctx, String(idx + 1), x + 40, y + 28, 'small', UC.text, 'right');
    if (r.on) hoverId = id;
  });
  // ---- centre: the selected skill + modifier cards ----
  const sid = hoverId || (u.skSel && SKILLS[u.skSel] ? u.skSel : p.wsk[w.id].q), sk = SKILLS[sid], info = skillInfo(p, sid);
  hudFrame(ctx, COL2 + 8, 76, 44, 44, 'slot'); ctx.drawImage(skillIcon(sid), COL2 + 14, 82, 32, 32); hudFrame(ctx, COL2 + 8, 76, 44, 44, 'slotRim', { tint: elColor(sk.element) });
  UI.text(ctx, sk.name, COL2 + 64, 78, 'body', UC.gold);
  UI.text(ctx, `${sk.element}   ${sk.mp ? sk.mp + ' MP   ' : ''}${sk.st ? sk.st + ' ST   ' : ''}CD ${sk.cd}s`, COL2 + 64, 102, 'small', UC.dim);
  UI.wrap(ctx, sk.desc, COL2 + 8, 132, 316, 'small', UC.text);
  UI.text(ctx, `Rank ${info.rank}${info.max ? ' (max)' : ''}`, COL2 + 8, 216, 'small', UC.stHi);
  UI.text(ctx, `+${Math.round(info.bonus * 100)}% damage`, COL2 + 324, 216, 'small', UC.dim, 'right');
  UI.bar(ctx, COL2 + 12, 242, 300, 8, info.frac, { id: 'rank-bar', col: UC.st, hi: UC.stHi, ghost: false, wipe: false });
  UI.text(ctx, info.max ? 'Rank complete' : `${info.into}/${info.need} casts that hit`, COL2 + 8, 258, 'small', UC.dim);
  mnHead(ctx, 'MODIFIERS', COL2 + 8, 292);
  info.slots.forEach((ms, i) => {
    const x = COL2 + 8 + i * 164, y = 314, cw = 156, ch = 150;
    UI.frame(ctx, x, y, cw, ch, ms.open ? 'plain' : 'tabInactive');
    UI.text(ctx, `Rank ${ms.rank}`, x + 12, y + 12, 'small', ms.open ? UC.gold : UC.dim);
    if (!ms.open) { UI.wrap(ctx, `Locked: reach rank ${ms.rank} (${info.rank}/${ms.rank})`, x + 12, y + 40, cw - 24, 'small', UC.dim); return; }
    if (!ms.options.length) { UI.wrap(ctx, 'Slot open. No modifiers found yet.', x + 12, y + 40, cw - 24, 'small', UC.dim); return; }
    ms.options.forEach((m, k) => {
      const oy = y + 36 + k * 34, chosen = ms.chosen === m.id, r = mnRegion(x + 8, oy, cw - 16, 30, `mod:${ms.rank}:${m.id}`, () => chooseSkillMod(p, sid, ms.rank, chosen ? null : m.id));
      UI.frame(ctx, x + 8, oy, cw - 16, 30, chosen ? 'gold' : 'plain');
      UI.text(ctx, fitText(m.name, cw - 36), x + 18, oy + 6, 'small', chosen || r.on ? UC.gold : UC.text);
    });
  });
  // ---- right: stats ----
  UI.text(ctx, `Lv ${p.level}   ${p.name || ''}`, COL3 + 8, 78, 'body', UC.gold);
  const need = xpToNext(p.level);
  UI.text(ctx, p.level >= MAX_LEVEL ? 'MAX' : `${Math.floor(p.xp)}/${need} XP`, COL3 + 328, 104, 'small', UC.dim, 'right');
  UI.bar(ctx, COL3 + 12, 108, 200, 8, p.level >= MAX_LEVEL ? 1 : p.xp / need, { id: 'tab-xp2', col: UC.xp, hi: UC.xp, ghost: false, wipe: false });
  mnHead(ctx, 'STATS', COL3 + 8, 134);
  drawStats(ctx, p, COL3 + 8, 158, 160, 22);
  mnHead(ctx, 'RESIST', COL3 + 8, 308);
  drawResistRow(ctx, p, COL3 + 8, 334, 80);
}

// ===== BESTIARY ====================================================================================================================
function bestiaryList() {
  const seenIds = Object.keys(ENEMY).filter(t => t !== 'dummy'), lore = typeof BESTIARY_LORE !== 'undefined' ? BESTIARY_LORE : {};
  const rows = [], add = (head, ids) => { rows.push({ head }); for (const id of ids) rows.push({ id, seen: !!G.seen[id], def: ENEMY[id] }); };
  const cls = id => ENEMY[id] ? enemyClass(id) : 'boss';
  const known = seenIds.slice(), other = Object.keys(lore).filter(k => !ENEMY[k] && k !== 'dummy');
  add('CREATURES', known.filter(id => cls(id) === 'normal'));
  add('GUARDIANS', known.filter(id => cls(id) !== 'normal').concat(other.filter(id => lore[id].lore2)));
  add('OTHER', other.filter(id => !lore[id].lore2));
  return rows.filter((r, i, a) => !r.head || (a[i + 1] && !a[i + 1].head));
}
function enemySprite(type) {
  const def = ENEMY[type] || {};
  try {
    if (def.sprite && ART.custom && ART.custom[def.sprite]) return ART.custom[def.sprite];
    if (type === 'slime') return ART.slime.n;
    if (type === 'hound') return ART.hound.n[Math.floor(G.t * 4) % 2];
    if (type === 'boss') return ART.boss.n;
  } catch (e) { /* no art */ }
  return null;
}
function drawBestiaryTab(ctx, p) {
  const u = G.ui, rows = bestiaryList(), lore = typeof BESTIARY_LORE !== 'undefined' ? BESTIARY_LORE : {};
  const LX = COL1 + 4, LY = 100, LW = 208, LH = 380, ROW = 30, HEAD = 24;
  let total = 0; for (const r of rows) { r.y = total; total += r.head ? HEAD : ROW; }
  const found = rows.filter(r => !r.head && r.seen).length, all = rows.filter(r => !r.head).length;
  UI.text(ctx, `Discovered ${found}/${all}`, LX + 4, 78, 'small', UC.dim);
  const sel0 = rows.find(r => !r.head && r.id === u.beSel) || rows.find(r => !r.head && r.seen) || rows.find(r => !r.head);
  const fc = UI.focus.current(), fid = UI.focus.showing() && fc && fc.id.startsWith('be:') ? fc.id.slice(3) : null;
  if (fid) { const r = rows.find(q => q.id === fid); if (r) mnReveal('be', LH, LY, r.y, ROW); }
  const off = mnScroll('be', LX, LY, LW, LH, total);
  ctx.save(); ctx.beginPath(); ctx.rect(LX - 4, LY, LW + 8, LH); ctx.clip();
  let hoverId = null;
  for (const r of rows) {
    const y = LY + r.y - off;
    if (r.head) { if (y > LY - HEAD && y < LY + LH) UI.text(ctx, r.head, LX + 4, y + 4, 'small', UC.dim); continue; }
    const vis = y >= LY - ROW && y < LY + LH;
    const reg = vis && y >= LY && y + ROW <= LY + LH;
    const reg2 = reg ? mnRegion(LX, y, LW, ROW - 2, 'be:' + r.id, () => { u.beSel = r.id; }, { def: r === sel0 }) : (UI.focus.register({ x: LX, y, w: LW, h: ROW - 2 }, 'be:' + r.id, { fn: () => { u.beSel = r.id; } }), { on: false });
    if (!vis) continue;
    const on = sel0 === r, name = r.seen ? (r.def ? r.def.name : r.id) : '???';
    if (on || reg2.on) { ctx.fillStyle = UC.bevel; ctx.globalAlpha = 0.6; ctx.fillRect(LX, y, LW, ROW - 2); ctx.globalAlpha = 1; }
    UI.sprite(ctx, r.seen ? 'bullet' : 'bulletHollow', LX + 6, y + 8, { scale: 2, tint: r.seen ? (enemyClass(r.id) === 'normal' ? UC.hpHi : UC.gold) : UC.dim });
    UI.text(ctx, fitText(name, LW - 40, 'small'), LX + 28, y + 7, 'small', r.seen ? (on ? UC.gold : UC.text) : UC.dim);
    if (reg2.on) hoverId = r.id;
  }
  ctx.restore();
  mnScrollbar(ctx, LX + LW + 4, LY, LH, total, off);
  const cur = hoverId && false ? hoverId : (sel0 && sel0.id), r = sel0;
  if (!r) return;
  const def = r.def || {}, sn = G.seen[r.id], seen = !!sn, L = lore[r.id] || {};
  // ---- centre: sprite on a vignette ----
  const vx = COL2 + 8, vy = 76, vw = 324, vh = 190;
  const vg = ctx.createRadialGradient(vx + vw / 2, vy + vh / 2, 10, vx + vw / 2, vy + vh / 2, vw / 1.6);
  vg.addColorStop(0, '#2a1f4a'); vg.addColorStop(1, '#0b0716'); ctx.fillStyle = vg; ctx.fillRect(vx, vy, vw, vh);
  UI.frame(ctx, vx - 4, vy - 4, vw + 8, vh + 8, 'plain', { alpha: 0 });
  const spr = seen ? enemySprite(r.id) : enemySprite(r.id);
  const bob = Math.floor(Math.sin(G.t * 2) * 1) * 2;
  if (spr) {
    const sc = Math.max(2, Math.min(4, Math.floor(150 / Math.max(spr.width, spr.height)))), sw = spr.width * sc, sh = spr.height * sc;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(seen ? spr : (typeof silOf === 'function' ? silOf(spr, '#0b0716') : spr), UI.snap(vx + (vw - sw) / 2), UI.snap(vy + vh - sh - 14 + bob), sw, sh);
  } else if (seen) {   // procedural enemies (wisp): a glowing orb
    for (let k = 0; k < 4; k++) { ctx.fillStyle = mixHex('#7fd6ff', '#15102a', k * 0.2); ctx.fillRect(vx + vw / 2 - 20 + k * 4, vy + 100 + k * 6 + bob, 40 - k * 8, 8); }
    ctx.fillStyle = '#f0feff'; ctx.fillRect(vx + vw / 2 - 16, vy + 60 + bob, 32, 32); ctx.fillStyle = '#7fd6ff'; ctx.fillRect(vx + vw / 2 - 8, vy + 68 + bob, 16, 16);
  } else UI.text(ctx, '?', vx + vw / 2, vy + 70, 'heading', UC.dim, 'center');
  UI.text(ctx, seen ? (def.name || r.id) : '???', COL2 + 8, 282, 'body', seen && enemyClass(r.id) !== 'normal' ? UC.gold : UC.text);
  const arche = seen ? [enemyClass(r.id) === 'normal' ? 'Creature' : enemyClass(r.id) === 'boss' ? 'Guardian' : 'Elite'].concat(def.tags || []).join(' / ') : 'Undiscovered';
  UI.text(ctx, fitText(arche, 316), COL2 + 8, 308, 'small', UC.dim);
  const kills = (sn && sn.kills) || 0;
  UI.text(ctx, `Defeated ${kills}`, COL2 + 8, 332, 'small', UC.text);
  [1, 10, 50].forEach((th, i) => { UI.sprite(ctx, kills >= th ? 'pipFull' : 'pipEmpty', COL2 + 120 + i * 60, 336, { scale: 2 }); UI.text(ctx, String(th), COL2 + 134 + i * 60, 332, 'small', UC.dim); });
  // ---- right: lore, weak / resist, drops ----
  mnHead(ctx, 'LORE', COL3 + 8, 78);
  let yy = UI.wrap(ctx, seen ? (L.lore || 'No record yet.') : 'Find one to read about it.', COL3 + 8, 100, 316, 'small', UC.text);
  if (seen && L.lore2) { yy += 4; yy = UI.wrap(ctx, kills > 0 ? L.lore2 : '??? (defeat it to read more)', COL3 + 8, yy, 316, 'small', kills > 0 ? UC.stHi : UC.dim); }
  yy += 10; mnHead(ctx, 'WEAK', COL3 + 8, yy); mnHead(ctx, 'RESIST', COL3 + 168, yy); yy += 22;
  const res = (sn && sn.res) || {}, tot = Object.keys(def.res || {}), weakT = tot.filter(e => def.res[e] < 0).length, resT = tot.length - weakT;
  const known = Object.keys(res), kw = known.filter(e => res[e] < 0), kr = known.filter(e => res[e] >= 0);
  let wx = COL3 + 8, rx = COL3 + 168;
  for (const e of kw) { elChip(ctx, wx, yy, e, 'weak'); wx += 26; }
  for (let i = kw.length; i < weakT; i++) { elChip(ctx, wx, yy, null, 'weak'); wx += 26; }
  for (const e of kr) { elChip(ctx, rx, yy, e, 'resist'); rx += 26; }
  for (let i = kr.length; i < resT; i++) { elChip(ctx, rx, yy, null, 'resist'); rx += 26; }
  if (!tot.length && seen) UI.text(ctx, 'none known', COL3 + 8, yy + 3, 'small', UC.dim);
  yy += 44; mnHead(ctx, 'DROPS', COL3 + 8, yy); yy += 22;
  const uq = UNIQUES && Object.keys(UNIQUES).find(k => /:/.test(UNIQUES[k].boss) && UNIQUES[k].boss.split(':')[1] === r.id);
  UI.wrap(ctx, !seen ? '???' : uq ? `${UNIQUES[uq].name} (first kill), gear, gems, dust` : r.id === 'boss' ? 'Warden\'s Lantern Plate, gear, gems' : 'Gear, gems, potions, dust', COL3 + 8, yy, 316, 'small', UC.text);
}

// ===== QUESTS ======================================================================================================================
// a reward / extra is a string id or { kind, id?, n? } (rune, shard, gem, tome, dust, ...): icon + label, never "[object Object]"
const REWARD_ICON = { shard: 'xp', rune: 'rune', socket_rune: 'rune', dust: 'dust', tome: 'chest', chest: 'chest', potion: 'potion', xp: 'xp' };
function rewardChip(r) {
  const kind = typeof r === 'string' ? r : (r && r.kind) || '?', id = r && typeof r === 'object' && r.id ? String(r.id) : '';
  const nice = v => String(v).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  let img;
  if (kind === 'gem') img = gemIcon('ruby');
  else { const g = REWARD_ICON[kind] || (kind.includes('tome') ? 'chest' : 'chest'); try { img = miscIcon(g); } catch (e) { img = miscIcon('chest'); } }
  const n = r && typeof r === 'object' && r.n > 1 ? ` x${r.n}` : '';
  return [img, (id ? `${nice(kind)} of ${id}` : nice(kind)) + n];
}
const qDone = id => { const q = G.prog && G.prog.quests && G.prog.quests[id]; return q === 'done' || !!(q && q.done); };
const qStep = id => { const q = G.prog && G.prog.quests && G.prog.quests[id]; return (q && q.step) || 0; };
function drawQuestsTab(ctx, p) {
  const u = G.ui, Q = typeof QUESTS !== 'undefined' ? QUESTS : [];
  const act = Q.filter(q => !qDone(q.id)), done = Q.filter(q => qDone(q.id));
  const LX = COL1 + 4, LY = 76, LW = 208, ROW = 46, LH = 400;
  const rows = []; rows.push({ head: `ACTIVE ${act.length}` }); act.forEach(q => rows.push({ q })); rows.push({ head: `DONE ${done.length}` }); done.forEach(q => rows.push({ q }));
  let total = 0; for (const r of rows) { r.y = total; total += r.head ? 24 : ROW; }
  const sel = Q.find(q => q.id === u.qSel) || act[0] || done[0];
  const fc = UI.focus.current(); if (fc && UI.focus.showing() && fc.id.startsWith('q:')) { const r = rows.find(z => z.q && 'q:' + z.q.id === fc.id); if (r) mnReveal('q', LH, LY, r.y, ROW); }
  const off = mnScroll('q', LX, LY, LW, LH, total);
  ctx.save(); ctx.beginPath(); ctx.rect(LX - 4, LY, LW + 8, LH); ctx.clip();
  for (const r of rows) {
    const y = LY + r.y - off;
    if (r.head) { if (y > LY - 24 && y < LY + LH) UI.text(ctx, r.head, LX + 4, y + 4, 'small', UC.dim); continue; }
    if (y < LY - ROW || y > LY + LH) { UI.focus.register({ x: LX, y, w: LW, h: ROW - 4 }, 'q:' + r.q.id, { fn: () => { u.qSel = r.q.id; } }); continue; }
    const inView = y >= LY && y + ROW <= LY + LH;
    const reg = inView ? mnRegion(LX, y, LW, ROW - 4, 'q:' + r.q.id, () => { u.qSel = r.q.id; }, { def: r.q === sel }) : (UI.focus.register({ x: LX, y, w: LW, h: ROW - 4 }, 'q:' + r.q.id, { fn: () => { u.qSel = r.q.id; } }), { on: false });
    const on = r.q === sel;
    if (on || reg.on) { ctx.fillStyle = UC.bevel; ctx.globalAlpha = 0.6; ctx.fillRect(LX, y, LW, ROW - 4); ctx.globalAlpha = 1; }
    UI.text(ctx, fitText(r.q.title, LW - 16), LX + 8, y + 5, 'small', on ? UC.gold : r.q.main ? UC.text : UC.text);
    UI.text(ctx, fitText(`${r.q.main ? 'Main' : 'Side'} / ${(G.world.maps[r.q.zone] || {}).name || r.q.zone}`, LW - 16), LX + 8, y + 23, 'small', UC.dim);
  }
  ctx.restore();
  mnScrollbar(ctx, LX + LW + 4, LY, LH, total, off);
  if (!sel) { UI.text(ctx, 'No quests yet.', COL2 + 8, 80, 'small', UC.dim); return; }
  const x = COL2 + 8, w = 660, d = qDone(sel.id), st = qStep(sel.id);
  UI.text(ctx, sel.title, x, 78, 'body', UC.gold);
  UI.text(ctx, `${sel.main ? 'Main quest' : 'Side quest'}   from ${sel.giver}   ${(G.world.maps[sel.zone] || {}).name || sel.zone}   ${d ? 'DONE' : G.prog.quests && G.prog.quests[sel.id] ? 'ACTIVE' : 'not started'}`, x, 104, 'small', UC.dim);
  let yy = UI.wrap(ctx, sel.text, x, 134, 640, 'body', UC.text) + 10;
  mnHead(ctx, 'STEPS', x, yy); yy += 22;
  sel.steps.forEach((s, i) => {
    const ok = d || i < st, cur = !d && i === st && G.prog.quests && G.prog.quests[sel.id];
    UI.text(ctx, ok ? '◆' : '◇', x, yy, 'body', ok ? UC.gold : cur ? UC.text : UC.dim);
    UI.text(ctx, s, x + 24, yy, 'body', ok ? UC.dim : UC.text); yy += 26;
  });
  yy += 14; mnHead(ctx, 'REWARD', x, yy); yy += 22;
  const rw = sel.reward || {}, icons = [];
  if (rw.kind === 'choice') { icons.push([gemIcon('ruby'), 'Gem']); icons.push([miscIcon('dust'), 'Socket rune']); } else icons.push(rewardChip(rw));
  if (sel.extra) icons.push(rewardChip(sel.extra));
  let ix = x;
  icons.forEach(([img, label], i) => {
    hudFrame(ctx, ix, yy, 44, 44, 'slot'); ctx.drawImage(img, ix + 6, yy + 6, 32, 32); hudFrame(ctx, ix, yy, 44, 44, 'slotRim', { tint: UC.line });
    UI.text(ctx, label, ix + 52, yy + 14, 'small', UC.text); ix += 60 + UI.measure(label, 'small') + 16;
  });
  if (rw.kind === 'choice') UI.text(ctx, 'choose one', x, yy + 54, 'small', UC.dim);
}
