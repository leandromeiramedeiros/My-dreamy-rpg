'use strict';
// ---------------------------------------------------------------------------
// menus.js — the Tab screens (INVENTORY / CHARACTER / BESTIARY / QUESTS), docs/design/hud-ui.md "Screens".
// DRAWING + hit/focus registration only. The actions they call live in items.js (clickBag / clickItem / clickSocket,
// equipItem, salvageItem, combineGems, sortBag, socketPage); selection state lives in G.ui
// (open, tab, sel, gem, salvage, note, skSel, pageSel, scr). Every control registers with UI.focus under a stable id
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
// the pointer's resting position must not steal the default focus (the title opened with focus on SLOT 2 because
// the idle cursor sits at the screen centre): hover only moves focus once the mouse has actually moved this session
const MN_MOUSE = { x: null, y: null, moved: false, t: -1 };
function mnMouseMoved() {
  if (MN_MOUSE.t !== G.t && G.mouse) {
    MN_MOUSE.t = G.t;
    if (MN_MOUSE.x === null) { MN_MOUSE.x = G.mouse.dx; MN_MOUSE.y = G.mouse.dy; }
    else if (G.mouse.dx !== MN_MOUSE.x || G.mouse.dy !== MN_MOUSE.y) { MN_MOUSE.moved = true; MN_MOUSE.x = G.mouse.dx; MN_MOUSE.y = G.mouse.dy; }
  }
  return MN_MOUSE.moved;
}
function mnRegion(x, y, w, h, id, fn, o = {}) {
  UI.hit(x, y, w, h, fn, { alt: o.alt, id });
  UI.focus.register({ x, y, w, h }, id, { fn, alt: o.alt, def: o.def });
  const hover = UI.mouseIn(x, y, w, h), focus = UI.focus.is(id) && UI.focus.showing(), moved = mnMouseMoved();
  if (hover && !UI.focus.nav && moved) UI.focus.set(id);
  return { hover, focus, on: hover || focus };
}
// R3 #4: zone id -> display name, built from world / zone data (never from items.js): a built map's own name, else the zone's entry
// banner in the dialogue table ("spire_banner" = Sleepless Spire; zones not built yet still have one), else a capitalised id
function zoneName(id) {
  if (!id) return '';
  const m = G.world && G.world.maps && G.world.maps[id];
  if (m && m.name) return m.name;
  const b = typeof DIALOGUE !== 'undefined' && DIALOGUE[id + '_banner'];
  if (b && b.banner) return b.banner;
  return String(id).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}
// "-0%" / "+0%" never print: a percent that rounds to zero is just "0%"
const cleanZero = t => String(t).replace(/^[+-]0(?:\.0+)?%/, '0%');
const signedPct = (v, flip) => { const r = Math.round((flip ? -v : v) * 100); return r === 0 ? '0%' : (r > 0 ? '+' : '-') + Math.abs(r) + '%'; };
// phone landscape = a touch device on a small screen; only there do the inventory stat labels abbreviate (R3 #6)
const phoneUI = () => (IN.device === 'touch' || !!G.touch) && Math.min(window.innerWidth, window.innerHeight) < 600;
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
// Paper doll (docs/design/items.md / docs/design/hud-ui.md): 9 slots, 48 px, relative to the panel (20,20). Loadout v3: HAND (weapon) and
// OFFHAND side by side under the rings, then head / chest, then boots / belt; the amulet stays on top.
const EQ_ORIGIN = [PX, PY];
// R3 #6: amulet / rings keep their docs/design/items.md spots; the weapon / head and chest / boots rows close up to a 8 px gap and the belt
// sits right under the hero (it was at y 300, a 36 px hole below the boots)
const EQ_REL = { amulet: [100, 64], ring1: [24, 88], ring2: [176, 88], weapon: [24, 144], offhand: [176, 144], head: [24, 200], chest: [176, 200], boots: [24, 256], belt: [176, 256] };
const EQ_POS = {}; for (const k in EQ_REL) EQ_POS[k] = [EQ_ORIGIN[0] + EQ_REL[k][0], EQ_ORIGIN[1] + EQ_REL[k][1]];
const EQ_LABEL = { weapon: 'Hand', offhand: 'Offhand', head: 'Helm', chest: 'Chest', boots: 'Boots', ring1: 'Ring', ring2: 'Ring', amulet: 'Amulet', belt: 'Belt' };
const EQ_DOLL = [144, 158];   // doll sprite: centre x, top y
const RING_KEYS = ['ring1', 'ring2'];
// R3 #6: full words by default; `short` (phone landscape only) abbreviates. The order pairs long labels with short ones so both
// columns fit in the 220 px column: left column = Atk MP CritDmg SkillDmg Potions Speed, right column = HP Def Crit Haste CDR Regen.
function statRows(p, short) {
  const S = short ? { 'Crit dmg': 'CDmg', 'Skill dmg': 'SkDmg', Potions: 'Pots', Speed: 'Spd', Regen: 'Rgn' } : {};
  const sp = Math.round((p.speed / 3.7 - 1) * 100);
  return [['Atk', Math.round(weaponOf(p).basic.dmg * p.power)], ['HP', p.maxHp], ['MP', p.maxMp], ['Def', pctText(p.def)],
    ['Crit dmg', signedPct(p.critDmg)], ['Crit', pctText(p.crit)], ['Skill dmg', signedPct(p.skillDmg)], ['Haste', signedPct(p.haste)],
    ['Potions', `${p.potions}/${p.maxPotions || MAX_POTIONS}`], ['CDR', signedPct(p.cdr, true)], ['Speed', signedPct(sp / 100)], ['Regen', `${+p.regen.toFixed(1)}/s`]].map(([k, v]) => [S[k] || k, v]);
}
// colW = one number (equal columns) or [left, right] widths (the inventory's 216 px column needs a wide left column)
function drawStats(ctx, p, x, y, colW, rowH, short) {
  const cw = Array.isArray(colW) ? colW : [colW, colW];
  statRows(p, short).forEach(([k, v], i) => {
    const c = i % 2, sx = x + (c ? cw[0] : 0), sy = y + Math.floor(i / 2) * rowH;
    UI.text(ctx, k, sx, sy, 'small', UC.dim); UI.text(ctx, String(v), sx + cw[c] - (Array.isArray(colW) ? (c ? 0 : 8) : 12), sy, 'small', UC.text, 'right');
  });
}
function drawResistRow(ctx, p, x, y, cell) {
  STAT_ELS.forEach((el, i) => {
    const cx = x + (i % 4) * cell, cy = y + Math.floor(i / 4) * 28, v = Math.round((p.res[el] || 0) * 100);
    elChip(ctx, cx, cy, el, v > 0 ? null : v < 0 ? 'weak' : null);
    UI.text(ctx, (v > 0 ? '+' : '') + v, cx + 24, cy + 3, 'small', v > 0 ? UC.text : v < 0 ? UC.danger : UC.dim);
  });
}
// one equipment / bag slot. With icons.js the 24 px art (frame + gem dots baked in) draws at 2x and ICONS.frame adds the animated glow;
// without it the legacy 16 px icon + hand-drawn socket dots.
function drawItemSlot(ctx, x, y, s, it, o = {}) {
  if (it && uiArt()) {
    const ic = uiItemIcon(it); ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, x, y, s, s);
    if (ICONS.frame) ICONS.frame(ctx, x, y, s, it.rarity, G.t);
  } else if (it) {
    UI.frame(ctx, x, y, s, s, 'rarity', { rarity: it.rarity }); ctx.drawImage(itemIcon(it), x + (s - 32) / 2, y + (s - 32) / 2, 32, 32);
    it.sockets.forEach((g, k) => { ctx.fillStyle = UC.edge; ctx.fillRect(x + 6 + k * 10, y + s - 12, 8, 8); ctx.fillStyle = g ? gemParse(g).def.col : '#3a3058'; ctx.fillRect(x + 8 + k * 10, y + s - 10, 4, 4); });
  } else {
    hudFrame(ctx, x, y, s, s, 'slot');
    if (o.label) UI.text(ctx, o.label, x + s / 2, y + (s - 14) / 2 + 2, 'small', UC.bevel, 'center', { shadow: false });
  }
  if (o.sel) UI.frame(ctx, x - 4, y - 4, s + 8, s + 8, 'focus', { tint: o.salvage ? UC.danger : UC.gold });
}
function drawDoll(ctx, p, cx, y) {
  const spr = p.spr.front[0], sc = 3, w = spr.width * sc, h = spr.height * sc;
  ctx.fillStyle = UC.edge; ctx.globalAlpha = 0.45; ctx.fillRect(cx - 24, y + h - 4, 48, 6); ctx.fillRect(cx - 18, y + h + 2, 36, 4); ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, UI.snap(cx - w / 2), UI.snap(y), w, h);
  const worn = EQUIP_SLOTS.map(s => p.equip[s]).filter(Boolean).sort((a, b) => RARITY[b.rarity].i - RARITY[a.rarity].i);
  if (worn.length && RARITY[worn[0].rarity].i >= 3) {   // epic+ gear: sparkles orbit the hero
    const rc = worn[0];
    for (let i = 0; i < 4; i++) { const a = G.t * 1.4 + i * 1.6, sx = cx + Math.cos(a) * 40, sy = y + h / 2 + Math.sin(a * 1.3) * 44; ctx.fillStyle = rarityCol(rc.rarity); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.t * 5 + i); ctx.fillRect(UI.snap(sx), UI.snap(sy), 4, 4); }
    ctx.globalAlpha = 1;
  }
}
function whatOf(p, id) {
  if (!id) return null;
  if (id.startsWith('bag:')) { const e = p.bag[+id.slice(4)]; return e ? (e.gem ? { gemIdx: +id.slice(4) } : { it: e, bi: +id.slice(4) }) : null; }
  if (id.startsWith('eq:')) { const it = p.equip[id.slice(3)]; return it ? { it, eq: true, key: id.slice(3) } : null; }
  return null;
}

// ---- ring rule (docs/design/items.md) -------------------------------------------------------------------------------------------------
// An empty ring slot always fills first (ring1, then ring2). When BOTH are full, equipping a ring never replaces one silently:
// the bag ring enters "pick" mode (G.ui.ringPick), both ring slots light up, focus lands on the WEAKER ring (lower rarity, then
// lower ilvl; a tie is ring1) and the player confirms a ring slot (click / tap / A) to swap that one out. The compare deltas always
// read against the ring that confirm would replace. A selected bag ring plus a click on any ring slot also equips straight there.
const ringRank = it => it ? RARITY[it.rarity].i * 1000 + it.ilvl : -1;
const weakerRing = p => ringRank(p.equip.ring2) < ringRank(p.equip.ring1) ? 'ring2' : 'ring1';
const ringsFull = p => RING_KEYS.every(k => p.equip[k]);
// the equipped item `it` would replace if equipped now (null when it goes to an empty slot, is equipped, or has no peer)
function replacedBy(p, it, chosen) {
  if (!it || it.gem || isEquipped(p, it)) return null;
  if (it.slot === 'weapon') return p.equip[chosen === 'offhand' ? 'offhand' : 'weapon'] || null;   // a weapon compares against the HAND item
  const ks = equipKeysFor(it.slot);
  if (ks.length === 1) return p.equip[ks[0]] || null;
  if (ks.some(k => !p.equip[k])) return null;
  return p.equip[chosen && ks.includes(chosen) ? chosen : weakerRing(p)];
}
function equipNote(r, okMsg) { if (r) invNote(r); else { sfx('shield'); if (okMsg) invNote(okMsg, UC.mpHi); } return !r; }
function startRingPick(p, it) {
  const u = G.ui; u.ringPick = it; u.ringCand = null; u.sel = it; u.ringPickT = G.t;
  UI.focus.set('eq:' + weakerRing(p), true); sfx('pickup');
}
function cancelRingPick() { const u = G.ui; u.ringPick = null; u.ringCand = null; }
// ring-aware equip for a bag item (bag click, EQUIP button)
function bagEquip(p, e) {
  const u = G.ui;
  if (e.slot === 'ring' && !isEquipped(p, e) && ringsFull(p) && e.req <= p.level) { startRingPick(p, e); return; }
  if (equipNote(equipItem(p, e))) u.sel = e;
}
function bagClickMenu(i, alt) {
  const p = G.player, u = G.ui, e = p.bag[i], was = u.ringPick; cancelRingPick();
  if (e && !e.gem && e.slot === 'ring' && !alt && !u.salvage && u.gem == null && ringsFull(p) && !isEquipped(p, e)) {
    if (was === e) return;                 // a second click on the ring being placed cancels
    if (!secondTap(e)) return;             // touch / pad: the first press only shows the ring
    bagEquip(p, e); return;
  }
  clickBag(i, alt);
}
function clickEquipSlot(key) {
  const p = G.player, u = G.ui, it = p.equip[key], pick = u.ringPick;
  if (pick) {
    if (RING_KEYS.includes(key)) {
      if (G.touch && u.ringCand !== key) { u.ringCand = key; sfx('pickup'); return; }   // touch: tap once to compare, again to confirm
      cancelRingPick(); if (equipNote(equipItem(p, pick, key), `${itemName(pick)} equipped`)) u.sel = pick;
      return;
    }
    cancelRingPick();
  }
  const sel = u.sel;
  if (u.gem == null && sel && sel.sockets && !isEquipped(p, sel) && p.bag.includes(sel) && equipKeysFor(sel.slot).includes(key)) { if (equipNote(equipItem(p, sel, key))) u.sel = sel; return; }
  if (it) clickItem(it); else if (u.gem != null) invNote('Gems go into an item', UC.dim); else u.sel = null;
}

function drawInventoryTab(ctx, p) {
  const u = G.ui; let hov = null, ringOn = null, emptyKey = null;
  const gemPick = u.gem != null && p.bag[u.gem] && p.bag[u.gem].gem ? u.gem : null; if (gemPick == null) u.gem = null;
  if (u.ringPick && (!p.bag.includes(u.ringPick) || G.t - (u.ringPickT || 0) > 0.5)) cancelRingPick();   // placed, salvaged, or the screen was closed
  if (u.ringPick) u.ringPickT = G.t;
  const sel = u.sel, pick = u.ringPick;
  // ---- column 1: paper doll + sheet ----
  drawDoll(ctx, p, EQ_DOLL[0], EQ_DOLL[1]);
  for (const key of EQUIP_SLOTS) {
    const [x, y] = EQ_POS[key], it = p.equip[key], isRing = RING_KEYS.includes(key);
    const r = mnRegion(x, y, 48, 48, 'eq:' + key, () => clickEquipSlot(key));
    drawItemSlot(ctx, x, y, 48, it, { sel: sel === it && it && !pick, label: it ? null : EQ_LABEL[key] });
    if (pick && isRing) {   // both ring slots pulse gold; the one confirm would replace is marked
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.t * 6); UI.frame(ctx, x - 4, y - 4, 56, 56, 'focus', { tint: UC.gold }); ctx.globalAlpha = 1;
      if (key === (u.ringCand || (r.on && key) || null)) UI.text(ctx, 'REPLACE', x + 24, y - 20, 'small', UC.gold, 'center');
    } else if (!pick && gemPick == null && sel && sel.sockets && p.bag.includes(sel) && equipKeysFor(sel.slot).includes(key) && !it) UI.text(ctx, 'EQUIP', x + 24, y + 50, 'small', UC.gold, 'center');
    if (r.on) { if (it && !pick) hov = { it, eq: true, key }; else if (!it && !pick) emptyKey = key; if (isRing) ringOn = key; }
  }
  mnDivider(ctx, COL1 + 8, 340, 200, 2);
  UI.text(ctx, `Lv ${p.level}`, COL1 + 8, 348, 'body', UC.gold);
  const need = xpToNext(p.level);
  UI.text(ctx, p.level >= MAX_LEVEL ? 'MAX' : `${Math.floor(p.xp)}/${need} XP`, COL1 + 208, 352, 'small', UC.dim, 'right');
  UI.bar(ctx, COL1 + 12, 372, 192, 8, p.level >= MAX_LEVEL ? 1 : p.xp / need, { id: 'tab-xp', col: UC.xp, hi: UC.xp, ghost: false, wipe: false });
  drawStats(ctx, p, COL1, 392, [130, 86], 18, phoneUI());
  // ---- column 2: bag ----
  const bx = COL2 + 10, by = 108, filled = p.bag.filter(Boolean).length;
  UI.text(ctx, `BAG ${filled}/${BAG_SIZE}`, bx, 80, 'body', UC.stHi);
  UI.button(ctx, COL2 + 232, 72, 84, 30, 'SORT', { id: 'btn:sort', size: 'small', fn: () => { sortBag(p); u.sel = null; u.gem = null; cancelRingPick(); sfx('pickup'); } });
  for (let i = 0; i < BAG_SIZE; i++) {
    const cx = bx + (i % 6) * 54, cy = by + Math.floor(i / 6) * 54, e = p.bag[i];
    const r = mnRegion(cx, cy, 48, 48, 'bag:' + i, alt => bagClickMenu(i, alt === true), { alt: () => bagClickMenu(i, true), def: i === 0 });
    if (!e) { hudFrame(ctx, cx, cy, 48, 48, 'slot'); ctx.fillStyle = UC.edge; ctx.globalAlpha = r.on ? 0.1 : 0.35; ctx.fillRect(cx + 4, cy + 4, 40, 40); ctx.globalAlpha = 1; if (r.on) UI.frame(ctx, cx - 4, cy - 4, 56, 56, 'focus', { tint: UC.dim }); continue; }
    if (e.gem) {
      const g = gemParse(e.gem), on = gemPick === i;
      UI.frame(ctx, cx, cy, 48, 48, 'slot', { col: g.def.col });
      const gi = uiGemIcon(e.gem); ctx.imageSmoothingEnabled = false; if (gi.width === 24) ctx.drawImage(gi, cx, cy, 48, 48); else ctx.drawImage(gi, cx + 8, cy + 8, 32, 32);
      UI.text(ctx, GEM_GRADES[g.grade - 1][0], cx + 6, cy + 4, 'small', UC.text);
      if (e.n > 1) UI.text(ctx, 'x' + e.n, cx + 44, cy + 30, 'small', UC.text, 'right');
      if (on) UI.frame(ctx, cx - 4, cy - 4, 56, 56, 'focus', { tint: g.def.col });
      if (r.on) hov = { gemIdx: i };
    } else {
      drawItemSlot(ctx, cx, cy, 48, e, { sel: sel === e, salvage: u.salvage });
      if (e.req > p.level) UI.text(ctx, 'L' + e.req, cx + 44, cy + 30, 'small', UC.danger, 'right');
      if (r.on) hov = { it: e, bi: i };
    }
  }
  // bag actions
  const ay = by + 5 * 54 + 8, sv = u.salvage;
  UI.button(ctx, bx, ay, 100, 32, sv ? 'SALVAGE ON' : 'SALVAGE', { id: 'btn:salvage', size: 'small', kind: sv ? 'danger' : 'plain', col: sv ? UC.hpHi : null, fn: () => { u.salvage = !u.salvage; u.gem = null; u.confirm = null; cancelRingPick(); } });
  UI.button(ctx, bx + 108, ay, 100, 32, 'COMBINE', { id: 'btn:combine', size: 'small', fn: () => doCombine(p) });
  UI.button(ctx, bx + 216, ay, 100, 32, 'SELL', { id: 'btn:sell', size: 'small', fn: () => doSell(p) });
  const noteOn = u.note && u.note.t > G.t;
  const hint = pick ? (IN.device === 'touch' ? 'Tap a ring to compare, tap it again to replace it.' : `Replace which ring? Choose ring 1 or ring 2 (${IN.glyph('accept')}).`) :
    gemPick != null ? `${gemName(p.bag[gemPick].gem)} picked: choose a socket or an item` : sv ? 'Salvage is on: pick gear to turn it into Dream Dust' :
    IN.device === 'touch' ? 'Tap: details, tap again: equip. Hold: salvage.' : IN.device === 'pad' ? `${IN.glyph('accept')} select / equip   ${IN.glyph('menuAlt')} salvage   ${IN.glyph('tabPrev')}${IN.glyph('tabNext')} tabs` : 'Click: equip   Right-click: salvage   Gems: click a gem, then a socket';
  UI.wrap(ctx, noteOn && !pick ? u.note.s : hint, bx, ay + 44, 320, 'small', pick ? UC.gold : noteOn ? u.note.col : UC.dim);
  // ---- column 3: item / gem ----
  let what = hov;
  if (pick) what = { it: pick, bi: p.bag.indexOf(pick), pick: true };
  else if (!what && UI.focus.showing() && UI.focus.current()) what = whatOf(p, UI.focus.current().id);
  if (!what && sel) what = sel.gem ? { gemIdx: sel.gemIdx } : sel.sockets ? { it: sel, bi: p.bag.indexOf(sel), eq: isEquipped(p, sel) } : null;
  drawItemPanel(ctx, p, COL3 + 4, 76, 324, what, hov, gemPick, pick ? (u.ringCand || ringOn) : null, emptyKey);
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

// ===== TOOLTIP v2 (docs/design/items.md) ================================================================================================
// itemTipRows(p, it, o) builds the tooltip as DATA (<= 12 logical lines, tested headless); drawTipRows() paints it. o: { w, touch,
// cmp (the equipped item to compare against), maxH }. Top to bottom: name (rarity colour) · icon row (family, tier, base stats) ·
// "Lv · ilvl · Rarity" · implicit (dim blue) · affixes P then S with tier pips and green / red deltas · sockets · trinket boon ·
// unique rule (gold) · family line · granted skills · "Synergises with" (only when tag data exists) · flavour · footer.
// Touch (o.touch): affixes collapse to icon + number-and-unit chips (two a row), skills (with names) get their own row, and the family, synergy and
// flavour lines are dropped. Over budget, the lowest-priority rows go first (synergy, flavour, skills, family, footer ...).
const TIP_BLUE = '#8fa8e8', TIP_GREEN = '#6ee36e', TIP_BOON = '#7be0d0', TIP_MAX_LINES = 12;
const SLOT_WORD = { weapon: 'Weapon', offhand: 'Offhand', head: 'Helm', chest: 'Chest', boots: 'Boots', ring: 'Ring', amulet: 'Amulet', belt: 'Belt' };
const CLASS_WORD = { blades: 'Blades', greatarms: 'Great arms', shots: 'Shots', foci: 'Foci', shadows: 'Shadows', heavy: 'Heavy', caster: 'Caster', medium: 'Medium', shadow: 'Shadow', trinket: 'Trinket' };
const SKILL_KEY = { chest: 'F', head: 'R', boots: 'V' };
const AX_NAME = { fireDmg: 'Fire damage', frostDmg: 'Frost damage', natureDmg: 'Nature damage', lightningDmg: 'Lightning damage', arcaneDmg: 'Arcane damage', holyDmg: 'Holy damage',
  statusChance: 'Status chance', markCap: 'Mark cap', chargeSpeed: 'Charge rate', onDodge: 'Heal on dodge', onKill: 'MP on kill', resHoly: 'Holy res' };
const STAT_COL = { dmg: '#ff9a4a', power: '#ff9a4a', skillDmg: '#ffb86a', crit: '#ffd35a', critDmg: '#ffd35a', haste: '#9ef0ff', cdr: '#9ab8ff', hp: '#ff6a8a', mp: '#4f7df0', def: '#b9c2dc',
  regen: '#8fe0a0', mpRegen: '#7aa0ff', speed: '#e7eeff', fireDmg: '#ff9a4a', frostDmg: '#9fe8ff', natureDmg: '#8fe0a0', lightningDmg: '#fff07a', arcaneDmg: '#d6b0ff', holyDmg: '#fff2b0' };
const statCol = id => STAT_COL[id] || (/^res/.test(id) ? EL_COL[(id.slice(3, 4).toLowerCase() + id.slice(4))] || '#d6c2ff' : '#d6c2ff');
// "+7% Damage", "+40 HP", "+1 Mark cap": fmtStat (items.js) for the M2 stats, a local label table for the v2-only ones
function affixText(id, v, sign = true) { return cleanZero(affixTextRaw(id, v, sign)); }
function affixTextRaw(id, v, sign) {
  if (STAT_NAME[id]) return fmtStat(id, v, sign);
  const sg = sign ? (v >= 0 ? '+' : '-') : '', a = Math.abs(v), nm = AX_NAME[id] || id;
  return id === 'markCap' ? `${sg}${Math.round(a)} ${nm}` : `${sg}${+(a * 100).toFixed(a * 100 < 10 ? 1 : 0)}% ${nm}`;
}
const deltaText = (id, d) => '(' + (affixText(id, d, true).split(' ')[0]) + ')';
// a delta that displays as zero ("+0%", "-0.0") is no delta: nothing is drawn
const deltaShown = (id, d) => Math.abs(d) > 1e-3 && !/^\(?[+-]?0(\.0+)?%?\)?$/.test(affixText(id, d, true).split(' ')[0]);
// short stat words for the touch chips ("+63 HP", "+7% Dmg"): the unit stays on the number, the word is trimmed to fit a chip
const CHIP_WORD = { dmg: 'Dmg', power: 'Dmg', hp: 'HP', mp: 'MP', def: 'Arm', crit: 'Crit', critDmg: 'CDmg', haste: 'Haste', cdr: 'CDR', skillDmg: 'Skill', regen: 'HP/s', mpRegen: 'MP/s', speed: 'Move',
  statusChance: 'Status', markCap: 'Marks', chargeSpeed: 'Charge', onDodge: 'Dodge', onKill: 'Kill MP' };
function chipText(id, v) {
  const t = affixText(id, v, true), sp = t.indexOf(' '), num = sp < 0 ? t : t.slice(0, sp), nm = sp < 0 ? '' : t.slice(sp + 1);
  const w = CHIP_WORD[id] || (/^res/.test(id) ? nm.replace(' res', ' r') : nm);
  return w ? `${num} ${w}` : num;
}
// the compact compare (docs/design/hud-ui.md): up to 3 stat deltas of `it` against the item it would replace, in STAT_ORDER (damage, HP, armour ...).
// Totals are statsOf (base + implicit + affixes + gems), so a socketed gem or a different base counts too.
function compareDeltas(it, cmp) {
  if (!it || !cmp || typeof statsOf !== 'function') return [];
  const a = statsOf(it), b = statsOf(cmp), out = [];
  for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
    const d = (a[k] || 0) - (b[k] || 0); if (!STAT_NAME[k] || !deltaShown(k, d)) continue;
    out.push({ id: k, d, text: cleanZero(fmtStat(k, d, true)).replace(/^(?=\d)/, '+'), rel: Math.abs(d) / Math.max(Math.abs(a[k] || 0), Math.abs(b[k] || 0), 1e-6) });
  }
  const ord = k => { const i = STAT_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  return out.sort((x, y) => ord(x.id) - ord(y.id)).slice(0, 3);
}
function wrapLines(s, size, w, max) {
  const out = []; let line = '';
  for (const wd of String(s).split(' ')) { const t = line ? line + ' ' + wd : wd; if (UI.measure(t, size) > w && line) { out.push(line); line = wd; } else line = t; }
  if (line) out.push(line);
  if (out.length > max) { const rest = out.splice(max - 1).join(' '); out.push(fitText(rest, w, size)); }
  return out;
}
// boon.text is always the MAJOR wording; a minor boon shows its minor numbers (BOONS row: minor / major value tables)
function boonText(it) {
  const b = it.boon; if (!b || b.grade !== 'minor' || typeof BOONS === 'undefined') return b ? b.text : '';
  const row = (BOONS[it.slot] || []).find(r => r.id === b.id); if (!row || !row.major || !row.minor) return b.text;
  let t = b.text;
  for (const k in row.major) {
    const mv = row.major[k], nv = row.minor[k]; if (nv == null) continue;
    for (const [from, to] of [[Math.round(mv * 100), Math.round(nv * 100)], [mv, nv]]) {
      const re = new RegExp('(?<![\\d.])' + String(from).replace('.', '\\.') + '(?![\\d.])'); if (re.test(t)) { t = t.replace(re, String(to)); break; }
    }
  }
  return t;
}
function trinketRow(id) {
  const all = (typeof TRINKET_UNIQUES !== 'undefined' ? TRINKET_UNIQUES : []).concat(typeof WORLD_UNIQUES !== 'undefined' ? WORLD_UNIQUES : []);
  return all.find(u => u.id === id) || null;
}
function tipRuleText(it) {
  const id = it.unique || it.rule; if (!id) return '';
  if (UNIQUES[id]) return UNIQUES[id].desc;
  const t = trinketRow(id); return t ? t.text || '' : '';
}
function tipTags(it) {
  if (it.boon && typeof BOONS !== 'undefined') { const row = (BOONS[it.slot] || []).find(r => r.id === it.boon.id); if (row && row.tags) return row.tags; }
  const t = trinketRow(it.unique || it.rule); return t && t.tags ? t.tags : [];
}
function tipFamily(p, it) {
  const b = baseOf(it.base) || {};
  if (isTrinket(it)) return '';
  if (it.slot === 'weapon') { const f = item('weapon', b.family); return `${f ? f.label || f.name : b.family}  ${CLASS_WORD[it.class] || it.class || ''}`; }
  const suit = it.suit && ARMOUR[it.class] && ARMOUR[it.class].suits[it.suit]; if (!suit) return '';
  const n = ['head', 'chest', 'boots'].filter(s => { const q = s === it.slot ? it : p.equip[s]; return q && q.suit === it.suit; }).length;
  return `${suit.name} ${n}/3 - 3: ${ARMOUR[it.class].rule}`;
}
function itemTipRows(p, it, o = {}) {
  const w = o.w || 308, touch = !!o.touch, cmp = o.cmp || null, b = baseOf(it.base) || {}, R = RARITY[it.rarity], rows = [];
  const LH = UI.lineH('small'), add = (k, pri, h, d) => { rows.push(Object.assign({ k, pri, h }, d)); return rows[rows.length - 1]; };
  const mineB = itemBase(it), cmpB = cmp ? itemBase(cmp) : null, acc = x => { const s = {}; for (const a of x.affixes) s[a.id] = (s[a.id] || 0) + a.v; return s; };
  const mineA = acc(it), cmpA = cmp ? acc(cmp) : null;
  // 1 name
  const nm = wrapLines(itemName(it), 'body', w, 2);
  add('name', 0, nm.length * UI.lineH('body'), { lines: nm, col: rarityCol(it.rarity) });
  // 2 icon row: art, family + tier, up to two base stats with compare deltas
  const stats = STAT_ORDER.filter(k => mineB[k]).slice(0, 2).map(k => ({ id: k, s: fmtStat(k, mineB[k], k !== 'dmg').replace(/^\+/, ''), d: cmpB ? mineB[k] - (cmpB[k] || 0) : 0 }));
  const fam = isTrinket(it) ? SLOT_WORD[it.slot] : (item(it.slot, b.family) || {}).label || (item(it.slot, b.family) || {}).name || SLOT_WORD[it.slot];
  add('head', 0, 30, { icon: uiItemIcon(it), label: `${fam}  T${(it.tier | 0) + 1}`, stats });
  // 3 Lv / ilvl / rarity
  add('lv', 0, LH, { req: it.req, ilvl: it.ilvl, rar: R.name, bad: it.req > p.level });
  // 4 implicit
  if (it.implicit && it.implicit.text) add('implicit', 2, LH, { s: it.implicit.text });
  // 5 affixes
  const temp = it.tempered && it.tempered.affix;
  const aff = it.affixes.map(a => ({ id: a.id, v: a.v, kind: a.kind, tier: a.tier || 1, text: affixText(a.id, a.v), d: cmpA ? a.v - (cmpA[a.id] || 0) : 0, hasCmp: !!cmpA, tempered: temp === a.id }));
  if (touch) { if (aff.length) add('chips', 0, 26 * Math.ceil(aff.length / 2), { aff }); }
  else for (const a of aff) add('aff', 0, LH, a);
  // 6 sockets (+ granted skills on touch)
  const skills = [];
  const fm = !isTrinket(it) ? item(it.slot, b.family) : null;
  if (fm) {   // Loadout v3: a weapon grants its Q spell + Shift+Q ultimate (in OFFHAND: E / Shift+E); an offhand line its M2 / E / Shift+E
    const keys = it.slot === 'offhand' ? [['action', 'M2'], ['spell', 'E'], ['ult', '▲E']] : it.slot === 'weapon' ? [['spell', 'Q'], ['ult', '▲Q']] : [];
    for (const [k, key] of keys) if (fm[k] && SKILLS[fm[k]]) skills.push({ id: fm[k], key });
    if (fm.skill && SKILLS[fm.skill]) skills.push({ id: fm.skill, key: SKILL_KEY[it.slot] });
  }
  const gemText = it.sockets.filter(Boolean).map(g => { const gs = gemStats(g, it.slot); return Object.entries(gs).map(([k, v]) => fmtStat(k, v)).join(' '); }).join(', ');
  if (it.sockets.length) add('sockets', 2, 30, { sockets: it.sockets, text: gemText, skills: [] });
  // 7 trinket boon, unique rule
  if (it.boon && it.boon.text) add('boon', 2, 0, { lines: wrapLines((it.boon.grade === 'minor' ? 'Minor: ' : 'Boon: ') + boonText(it), 'small', w, 2) });
  const rule = tipRuleText(it); if (rule) add('rule', 1, 0, { lines: wrapLines(rule, 'small', w, 2) });
  // 8 family line, 9 granted skills
  if (!touch) {
    const fl = tipFamily(p, it); if (fl) add('family', 5, LH, { s: fl });
  }
  // granted skills with their names (R3 #4): Q E R at phone width too, so this sits outside the desktop-only block
  if (skills.length) add('skills', touch ? 3 : 6, 44, { skills });
  if (!touch) {
    const tags = tipTags(it); if (tags.length) add('syn', 8, 0, { lines: wrapLines('Synergises with: ' + tags.join(', '), 'small', w, 2) });
    const fv = itemFlavor(it); if (fv) add('flavor', 7, 0, { lines: wrapLines(fv, 'small', w, 2) });
  }
  // 12 footer: Found / Kills / Tempered
  const h = it.hist || {}, parts = [];
  if (h.found) parts.push('Found: ' + zoneName(h.found));
  if (it.slot === 'weapon' && (h.kills || 0) > 0) parts.push('Kills ' + h.kills);
  if (it.tempered) parts.push('Tempered');
  if (parts.length) add('footer', 4, LH, { parts, tempered: !!it.tempered });
  for (const r of rows) if (r.lines && !r.h) r.h = r.lines.length * LH;
  // budget: at most 12 logical lines and maxH pixels; lowest priority (highest number) goes first, later rows first on a tie
  const maxH = o.maxH || 350, total = () => rows.reduce((a, r) => a + r.h + 2, 0);
  while (rows.length > TIP_MAX_LINES || total() > maxH) {
    let worst = -1; rows.forEach((r, i) => { if (worst < 0 || r.pri >= rows[worst].pri) worst = i; });
    if (rows[worst].pri === 0) break;
    rows.splice(worst, 1);
  }
  return { rows, count: rows.length, height: total(), rarity: it.rarity };
}
// a row of tier pips: "◆◆◇" (tempered affixes in gold)
const pips = (t, gold) => '◆◆◆'.slice(0, clamp(t, 1, 3)) + '◇◇◇'.slice(0, 3 - clamp(t, 1, 3));
function drawTipRows(ctx, T, x, y, w, o = {}) {
  const LH = UI.lineH('small'); let yy = y;
  for (const r of T.rows) {
    if (r.k === 'name') r.lines.forEach((l, i) => UI.text(ctx, l, x, yy + i * UI.lineH('body'), 'body', r.col));
    else if (r.k === 'head') {
      const ic = r.icon; if (ic) { ctx.imageSmoothingEnabled = false; if (ic.width === 24) ctx.drawImage(ic, x, yy + 3, 24, 24); else ctx.drawImage(ic, x, yy + 1, 28, 28); }
      UI.text(ctx, r.label, x + 32, yy + 8, 'small', UC.text);
      r.stats.forEach((st, i) => {
        const dt = st.d && deltaShown(st.id, st.d) ? deltaText(st.id, st.d) : '', dw = dt ? UI.measure(dt, 'small') + 6 : 0, sy = yy + (r.stats.length > 1 ? i * 14 : 8) - (r.stats.length > 1 ? 1 : 0);
        if (dt) UI.text(ctx, dt, x + w, sy, 'small', st.d > 0 ? TIP_GREEN : UC.danger, 'right');
        UI.text(ctx, st.s, x + w - dw, sy, 'small', UC.text, 'right');
      });
    } else if (r.k === 'lv') {
      let cx = x; const seg = (s, col) => { cx += UI.text(ctx, s, cx, yy, 'small', col) + 4; }, dot = () => { ctx.fillStyle = UC.bevel; ctx.fillRect(cx, yy + 6, 2, 2); cx += 8; };
      seg(`Lv ${r.req}`, r.bad ? UC.danger : UC.text); dot(); seg(`ilvl ${r.ilvl}`, UC.dim); dot(); seg(r.rar, rarityCol(T.rarity));
    } else if (r.k === 'implicit') UI.text(ctx, fitText(r.s, w, 'small'), x, yy, 'small', TIP_BLUE);
    else if (r.k === 'aff') {
      const pc = r.tempered ? UC.gold : r.kind === 'P' ? UC.bright : UC.dim;
      UI.text(ctx, pips(r.tier), x, yy, 'small', pc);
      UI.text(ctx, fitText(r.text, w - 120, 'small'), x + 44, yy, 'small', UC.text);
      if (r.hasCmp && deltaShown(r.id, r.d)) UI.text(ctx, deltaText(r.id, r.d), x + w, yy, 'small', r.d > 0 ? TIP_GREEN : UC.danger, 'right');
    } else if (r.k === 'chips') {
      r.aff.forEach((a, i) => {
        const cx = x + (i % 2) * Math.floor(w / 2), cy = yy + Math.floor(i / 2) * 26;
        UI.sprite(ctx, 'bullet', cx, cy + 4, { scale: 2, tint: a.tempered ? UC.gold : statCol(a.id) });
        const txt = chipText(a.id, a.v);
        const room = Math.floor(w / 2) - 36, tw = UI.text(ctx, fitText(txt, room), cx + 18, cy + 2, 'small', UC.text);   // two chips a row: the unit and a short stat word fit
        if (a.hasCmp && deltaShown(a.id, a.d)) UI.text(ctx, a.d > 0 ? '▲' : '▼', cx + 22 + Math.min(tw, room), cy + 2, 'small', a.d > 0 ? TIP_GREEN : UC.danger);
      });
    } else if (r.k === 'sockets') {
      const p = o.p, it = o.it; let cx = x;
      r.sockets.forEach((g, k) => {
        const reg = o.interactive ? mnRegion(cx, yy, 28, 28, 'sock:' + k, () => clickSocket(it, k)) : { on: false };
        hudFrame(ctx, cx, yy, 28, 28, 'slot');
        if (g) { const gi = uiGemIcon(g); ctx.imageSmoothingEnabled = false; if (gi.width === 24) ctx.drawImage(gi, cx + 2, yy + 2, 24, 24); else ctx.drawImage(gi, cx + 6, yy + 6, 16, 16); }
        else UI.sprite(ctx, 'bulletHollow', cx + 7, yy + 7, { scale: 2, tint: o.gemPick != null ? UC.gold : UC.dim });
        if (reg.on) UI.frame(ctx, cx - 4, yy - 4, 36, 36, 'focus', { tint: UC.bright });
        cx += 32;
      });
      const sk = r.skills || [];
      if (sk.length) {
        let sx = x + w - sk.length * 40;
        for (const s of sk) { ctx.imageSmoothingEnabled = false; ctx.drawImage(uiSkillIcon(s.id), sx, yy + 3, 24, 24); UI.text(ctx, s.key, sx + 26, yy + 8, 'small', UC.dim); sx += 40; }
        if (r.text) UI.text(ctx, fitText(r.text, x + w - sk.length * 40 - cx - 8, 'small'), cx + 4, yy + 8, 'small', UC.dim);
      } else if (r.text) UI.text(ctx, fitText(r.text, w - (cx - x) - 4, 'small'), cx + 4, yy + 8, 'small', UC.dim);
    } else if (r.k === 'boon') r.lines.forEach((l, i) => UI.text(ctx, l, x, yy + i * LH, 'small', TIP_BOON));
    else if (r.k === 'rule') r.lines.forEach((l, i) => UI.text(ctx, l, x, yy + i * LH, 'small', UC.gold));
    else if (r.k === 'family') UI.text(ctx, fitText(r.s, w, 'small'), x, yy, 'small', UC.bright);
    else if (r.k === 'skills') {   // icon + key on one line, the skill's name under it (fits three 100 px columns at phone width)
      const nm = r.skills.map(s => (SKILLS[s.id] || {}).name || s.id), nw = nm.map(n => Math.max(44, UI.measure(n, 'small'))), gap = 4;
      const k = Math.min(1, (w - gap * (nm.length - 1)) / nw.reduce((a, b) => a + b, 0));   // columns sized by name length, shrunk to fit
      let sx = x;
      r.skills.forEach((s, i) => {
        const cw = Math.floor(nw[i] * k); ctx.imageSmoothingEnabled = false; ctx.drawImage(uiSkillIcon(s.id), sx, yy + 1, 24, 24);
        UI.text(ctx, s.key, sx + 28, yy + 6, 'small', UC.dim);
        UI.text(ctx, fitText(nm[i], cw), sx, yy + 28, 'small', UC.text); sx += cw + gap;
      });
    }
    else if (r.k === 'syn') r.lines.forEach((l, i) => UI.text(ctx, l, x, yy + i * LH, 'small', UC.dim));
    else if (r.k === 'flavor') r.lines.forEach((l, i) => UI.text(ctx, l, x, yy + i * LH, 'small', '#7e72a8'));
    else if (r.k === 'footer') { let cx = x; r.parts.forEach((s, i) => { if (i) { ctx.fillStyle = UC.bevel; ctx.fillRect(cx + 2, yy + 6, 2, 2); cx += 10; } cx += UI.text(ctx, s, cx, yy, 'small', s === 'Tempered' ? UC.gold : UC.dim); }); }
    yy += r.h + 2;
  }
  return yy;
}

// column 3: gem details, or the item tooltip v2 plus the equip / sell actions
// R3 #6: the idle right pane. Nothing selected or hovered = the loadout summary: weapon + its Q E R, the armour skills, the armour set
// bonus and the resists. Hovering an EMPTY equipment slot says so on top of it (hovering a filled one shows that item's tooltip).
function setBonusLine(p) {
  let best = null;
  for (const slot of ['chest', 'head', 'boots']) {
    const it = p.equip[slot]; if (!it || !it.suit || !ARMOUR[it.class] || !ARMOUR[it.class].suits[it.suit]) continue;
    const n = ['head', 'chest', 'boots'].filter(sl => p.equip[sl] && p.equip[sl].suit === it.suit && p.equip[sl].class === it.class).length;
    if (!best || n > best.n) best = { n, name: ARMOUR[it.class].suits[it.suit].name, rule: ARMOUR[it.class].rule };
  }
  return best;
}
function drawLoadout(ctx, p, x, y, w, emptyKey) {
  const wp = weaponOf(p), wi = p.equip.weapon, rowH = 28; let yy = y + 2;   // §28: an empty slot shows no skill (slotSkill)
  HUD.loadoutT = G.t;
  UI.text(ctx, 'LOADOUT', x + 8, yy, 'body', UC.gold); yy += 24;
  const hint = emptyKey ? `Empty ${EQ_LABEL[emptyKey].toLowerCase()} slot` : (IN.device === 'touch' ? 'Tap an item to see it here' : 'Hover or select an item for details');
  UI.text(ctx, hint, x + 8, yy, 'small', emptyKey ? UC.text : UC.dim); yy += 24;
  UI.text(ctx, fitText(wi ? itemName(wi) : wp.name, w - 16, 'body'), x + 8, yy, 'body', wi ? rarityCol(wi.rarity) : UC.text); yy += 26;
  const skillRow = (key, id, col) => {
    if (!id || !SKILLS[id]) return;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(uiSkillIcon(id), x + 8, yy, 20, 20);
    UI.text(ctx, key, x + 36, yy + 3, 'small', col || UC.stHi);
    UI.text(ctx, fitText(SKILLS[id].name, w - 110), x + 72, yy + 3, 'small', UC.text);
    UI.text(ctx, SKILLS[id].element, x + w - 8, yy + 3, 'small', UC.dim, 'right');
    yy += 22;
  };
  for (const [k, sl] of [['Q', 'q'], ['▲Q', 'qu']]) skillRow(k, slotSkill(p, sl), sl === 'qu' ? UC.gold : UC.stHi);
  const oi = p.equip.offhand;
  UI.text(ctx, fitText(oi ? itemName(oi) : 'No offhand', w - 16, 'small'), x + 8, yy + 2, 'small', oi ? rarityCol(oi.rarity) : UC.dim); yy += 20;
  for (const [k, sl] of [['M2', 'rmb'], ['E', 'e'], ['▲E', 'eu']]) skillRow(k, slotSkill(p, sl), sl === 'eu' ? UC.gold : UC.stHi);
  yy += 2; mnDivider(ctx, x + 8, yy, w - 16, 2); yy += 8;
  for (const [k, sk] of [['R', 'r'], ['F', 'f'], ['V', 'v']]) skillRow(k, slotSkill(p, sk));
  if (p.grip) { const g = GRIPS.find(q => q.id === p.grip); if (g) { UI.text(ctx, fitText(`Grip: ${g.name}. ${g.hint}`, w - 16, 'small'), x + 8, yy + 2, 'small', UC.gold); yy += 20; } }
  yy += 2; mnDivider(ctx, x + 8, yy, w - 16, 2); yy += 8;
  const sb = setBonusLine(p);
  if (sb) {
    UI.text(ctx, `Set: ${sb.name} ${sb.n}/3`, x + 8, yy, 'small', sb.n >= 3 ? UC.gold : UC.bright); yy += 18;
    for (const l of wrapLines(sb.n >= 3 ? sb.rule : `3 pieces: ${sb.rule}`, 'small', w - 16, 2)) { UI.text(ctx, l, x + 8, yy, 'small', sb.n >= 3 ? UC.text : UC.dim); yy += 16; }
  } else { UI.text(ctx, 'Set bonus: wear 3 matching armour pieces', x + 8, yy, 'small', UC.dim); yy += 18; }
  yy += 8; mnHead(ctx, 'RESIST', x + 8, yy); yy += 20;
  drawResistRow(ctx, p, x + 8, yy, 80);
}
function drawItemPanel(ctx, p, x, y, w, what, hov, gemPick, ringKey, emptyKey) {
  const u = G.ui;
  if (!what) { drawLoadout(ctx, p, x, y, w, emptyKey); return; }
  const gemId = what.gemIdx != null ? p.bag[what.gemIdx] && p.bag[what.gemIdx].gem : null;
  if (what.gemIdx != null) {
    if (!gemId) return;
    const g = gemParse(gemId); if (!g) return;
    const gi = uiGemIcon(gemId); if (gi) { ctx.imageSmoothingEnabled = false; ctx.drawImage(gi, x + 8, y - 2, 24, 24); }
    UI.text(ctx, gemName(gemId), x + 40, y, 'body', g.def.col);
    UI.text(ctx, 'Gem', x + 40, y + 24, 'small', UC.dim);
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
  const it = what.it; if (!it || !baseOf(it.base)) return;
  const cmp = replacedBy(p, it, ringKey), CY = 382;   // the compare block starts here; the tooltip gets the room above it
  const T = itemTipRows(p, it, { w: w - 16, touch: IN.device === 'touch' || !!G.touch, cmp, maxH: cmp ? CY - y - 8 : 350 });
  drawTipRows(ctx, T, x + 8, y, w - 16, { p, it, interactive: true, gemPick });
  // compact stat-delta compare (docs/design/hud-ui.md): a header, then up to 3 green / red deltas versus the item this one would replace
  const drawCompare = head => {
    mnDivider(ctx, x + 8, CY, w - 16, 2);
    UI.text(ctx, head, x + 8, CY + 8, 'small', what.pick ? UC.gold : UC.dim);
    const D = compareDeltas(it, cmp);
    if (!D.length) UI.text(ctx, 'No stat change', x + 8, CY + 28, 'small', UC.dim);
    D.forEach((d, i) => UI.text(ctx, d.text, x + 16, CY + 28 + i * 18, 'small', d.d > 0 ? TIP_GREEN : UC.danger));
  };
  if (what.pick) { if (cmp) drawCompare(`Replaces ${fitText(itemName(cmp), 190)}`); else UI.text(ctx, 'Choose a ring slot', x + 8, 436, 'small', UC.gold); }
  else if (what.eq || isEquipped(p, it)) UI.text(ctx, 'Equipped', x + 8, 432, 'small', UC.gold);
  else if (what.bi != null && what.bi >= 0) {
    if (cmp) drawCompare('vs equipped'); else UI.text(ctx, 'Nothing equipped here', x + 8, 436, 'small', UC.dim);
    UI.button(ctx, x + 8, 464, 140, 32, 'EQUIP', { id: 'btn:equip', size: 'small', fn: () => bagEquip(p, it) });
    // §28 the first chest's lesson (items.js teachEquip): EQUIP holds the focus (accept equips) and pulses gold until the mail is
    // worn or the bag closes; the focus model's own reset (the panel reads focus before the button registers) is undone here
    if (u.teach && u.teach.it === it) {
      if (!u.teach.focused || UI.focus.id === 'bag:' + p.bag.indexOf(it)) { u.teach.focused = true; UI.focus.set('btn:equip'); }
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.t * 6); UI.frame(ctx, x + 4, 460, 148, 40, 'focus', { tint: UC.gold }); ctx.globalAlpha = 1;
    }
    UI.button(ctx, x + 156, 464, 140, 32, 'SELL', { id: 'btn:sell2', size: 'small', fn: () => { u.sel = it; doSell(p); } });
  }
}

// ===== CHARACTER ===================================================================================================================
// Loadout v3 (docs/design/loadout.md): nothing to pick here, everything comes from items. Left: the HAND, OFFHAND, armour and pocket
// slots the bar shows. Centre: the selected skill (rank) and, with a companion worn, its page / arrow slots and the owned entries
// (G.ui.pageSel = the chosen slot; pick an entry to socket it, pick a filled chosen slot again to take its entry out). Right: stats.
function skillSlotBox(ctx, id, x, y, id2, fn, o = {}) {   // a 44 px skill slot, focusable; returns the region
  const r = mnRegion(x, y, 44, 44, id2, fn, { def: o.def });
  hudFrame(ctx, x, y, 44, 44, 'slot');
  const ic = o.icon || (id && SKILLS[id] ? skillIcon(id) : null);
  if (ic) ctx.drawImage(ic, x + 6, y + 6, 32, 32);
  hudFrame(ctx, x, y, 44, 44, 'slotRim', { tint: o.rim || (id && SKILLS[id] ? elColor(SKILLS[id].element) : UC.bevel) });
  if (o.sel) UI.frame(ctx, x - 4, y - 4, 52, 52, 'focus', { tint: UC.gold });
  else if (r.on) UI.frame(ctx, x - 4, y - 4, 52, 52, 'focus', { tint: UC.dim });
  return r;
}
function clickPageSlot(p, it, si) {
  const u = G.ui;
  if (u.pageSel === si && it.pages[si]) { const r = socketPage(p, it, si, null); if (r) invNote(r); else { sfx('pickup'); deckClamp(p); } return; }
  u.pageSel = si; sfx('pickup');
}
function clickPageEntry(p, it, id) {
  const u = G.ui; fitPages(it);
  let si = u.pageSel != null && u.pageSel < it.pages.length ? u.pageSel : it.pages.indexOf(null);
  if (si < 0) { invNote('Every slot is full: choose a slot to replace', UC.dim); return; }
  const r = socketPage(p, it, si, id); if (r) invNote(r); else { sfx('shield'); deckClamp(p); u.pageSel = null; }
}
function drawCharacterTab(ctx, p) {
  const u = G.ui; let hoverId = null;
  const row = (head, name, nameCol, y0, cells) => {   // a section: heading, item name, then up to three 44 px cells with key tags
    mnHead(ctx, head, COL1 + 8, y0);
    if (name != null) UI.text(ctx, fitText(name, 200, 'small'), COL1 + 8, y0 + 20, 'small', nameCol || UC.text);
    const cy = y0 + (name != null ? 38 : 20);
    cells.forEach((c, i) => {
      const x = COL1 + 8 + i * 60, r = skillSlotBox(ctx, c.id, x, cy, c.key, () => { if (c.id) u.skSel = c.id; }, { icon: c.icon, rim: c.rim, def: c.def });
      UI.text(ctx, c.label, x + 22, cy + 46, 'small', c.rim === UC.gold ? UC.gold : UC.dim, 'center');
      if (c.count != null) UI.text(ctx, c.count, x + 40, cy + 28, 'small', c.count ? UC.text : UC.dim, 'right');
      if (r.on && c.id) hoverId = c.id;
    });
  };
  const wi = p.equip.weapon, oi = p.equip.offhand, w = weaponOf(p);
  row('HAND', wi ? itemName(wi) : 'Bare hands', wi ? rarityCol(wi.rarity) : UC.dim, 76, [
    { key: 'ch:lmb', label: 'M1', icon: uiItemIcon(wi), rim: UC.line, def: true }, { key: 'ch:q', id: slotSkill(p, 'q'), label: 'Q' }, { key: 'ch:qu', id: slotSkill(p, 'qu'), label: '▲Q', rim: UC.gold }]);
  row('OFFHAND', oi ? itemName(oi) : isTwoHanded(wi) ? 'Two-handed: a companion only' : 'Empty', oi ? rarityCol(oi.rarity) : UC.dim, 176, [
    { key: 'ch:rmb', id: slotSkill(p, 'rmb'), label: 'M2' }, { key: 'ch:e', id: slotSkill(p, 'e'), label: 'E' }, { key: 'ch:eu', id: slotSkill(p, 'eu'), label: '▲E', rim: UC.gold }]);
  row('ARMOUR', null, null, 276, [{ key: 'ch:r', id: slotSkill(p, 'r'), label: 'R' }, { key: 'ch:f', id: slotSkill(p, 'f'), label: 'F' }, { key: 'ch:v', id: slotSkill(p, 'v'), label: 'V' }]);
  row('POCKETS', null, null, 358, (p.pockets || []).slice(0, 3).map((id, i) => {
    const P = POCKETS[id]; return { key: 'ch:pk' + i, label: ['Z', 'X', 'C'][i], icon: P ? (id === 'potion' ? miscIcon('potion') : icon(P.icon, P.color)) : null, rim: P ? P.color : UC.bevel, count: P ? pocketCount(p, id) : null };
  }));
  if (p.grip) { const g = GRIPS.find(q => q.id === p.grip); if (g) UI.wrap(ctx, `${g.name}: ${g.hint}`, COL1 + 8, 446, 204, 'small', UC.gold); }
  // ---- centre: the selected skill ----
  const sid = hoverId || (u.skSel && SKILLS[u.skSel] ? u.skSel : slotSkill(p, 'q') || slotSkill(p, 'v') || UNARMED.roll), sk = SKILLS[sid], info = skillInfo(p, sid);
  hudFrame(ctx, COL2 + 8, 76, 44, 44, 'slot'); ctx.drawImage(skillIcon(sid), COL2 + 14, 82, 32, 32); hudFrame(ctx, COL2 + 8, 76, 44, 44, 'slotRim', { tint: elColor(sk.element) });
  UI.text(ctx, sk.name, COL2 + 64, 78, 'body', UC.gold);
  UI.text(ctx, `${sk.element}   ${sk.mp ? sk.mp + ' MP   ' : ''}${sk.st ? sk.st + ' ST   ' : ''}CD ${sk.cd}s`, COL2 + 64, 102, 'small', UC.dim);
  UI.wrap(ctx, sk.desc, COL2 + 8, 132, 316, 'small', UC.text);
  UI.text(ctx, `Rank ${info.rank}${info.max ? ' (max)' : ''}`, COL2 + 8, 216, 'small', UC.stHi);
  UI.text(ctx, `+${Math.round(info.bonus * 100)}% damage`, COL2 + 324, 216, 'small', UC.dim, 'right');
  UI.bar(ctx, COL2 + 12, 242, 300, 8, info.frac, { id: 'rank-bar', col: UC.st, hi: UC.stHi, ghost: false, wipe: false });
  UI.text(ctx, info.max ? 'Rank complete' : `${info.into}/${info.need} casts that hit`, COL2 + 8, 258, 'small', UC.dim);
  // ---- centre: the companion's deck ----
  if (isCompanion(oi)) {
    fitPages(oi);
    const deck = lineOf(oi).deck, word = deck === 'arrow' ? 'ARROWS' : 'PAGES';
    if (u.pageSel != null && u.pageSel >= oi.pages.length) u.pageSel = null;
    mnHead(ctx, `${word} ${oi.pages.filter(Boolean).length}/${oi.pages.length}`, COL2 + 8, 288);
    oi.pages.forEach((id, si) => {
      const x = COL2 + 8 + si * 52, r = skillSlotBox(ctx, id, x, 310, 'pg:' + si, () => clickPageSlot(p, oi, si), { sel: u.pageSel === si, rim: id ? null : UC.bevel });
      if (id && deckActive(p) === id && deckEntries(p).indexOf(id) === (p.deck | 0)) UI.text(ctx, '►', x + 22, 356, 'small', UC.gold, 'center');
      if (r.on && id) hoverId = id;
    });
    const owned = Object.keys(PAGES).filter(id => pageFits(id, deck) && pagesOwned(p, id) > 0);
    UI.text(ctx, owned.length ? `Owned (pick to socket${u.pageSel != null ? ' in slot ' + (u.pageSel + 1) : ''})` : `No spare ${word.toLowerCase()}: bosses, chests and runes drop them`, COL2 + 8, 376, 'small', UC.dim);
    owned.slice(0, 12).forEach((id, k) => {
      const x = COL2 + 8 + (k % 6) * 52, y = 396 + Math.floor(k / 6) * 52, r = skillSlotBox(ctx, id, x, y, 'po:' + id, () => clickPageEntry(p, oi, id));
      UI.text(ctx, 'x' + pagesOwned(p, id), x + 42, y + 30, 'small', UC.text, 'right');
      if (r.on) hoverId = id;
    });
  } else {
    const n = Object.values(p.pages || {}).reduce((a, b) => a + b, 0);
    mnHead(ctx, 'PAGES', COL2 + 8, 288);
    UI.wrap(ctx, `A Grimoire holds pages, a Quiver arrows: wear one in the offhand to use them. Owned: ${n}.`, COL2 + 8, 312, 316, 'small', UC.dim);
  }
  if (u.note && u.note.t > G.t) UI.text(ctx, fitText(u.note.s, 316, 'small'), COL2 + 8, 504, 'small', u.note.col);
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
const qStarted = id => !!(G.prog && G.prog.quests && G.prog.quests[id]);
// R3 #5: ACTIVE lists only quests the player has started (an unstarted one is a spoiler, e.g. the caldera / spire quests at level 1);
// titles take up to 2 lines instead of "The Stone's Lost Lan..."; a row is as tall as its title
function drawQuestsTab(ctx, p) {
  const u = G.ui, Q = typeof QUESTS !== 'undefined' ? QUESTS : [];
  const act = Q.filter(q => qStarted(q.id) && !qDone(q.id)), done = Q.filter(q => qDone(q.id));
  const LX = COL1 + 4, LY = 76, LW = 208, LH = 400, TL = 16;
  const rows = []; rows.push({ head: `ACTIVE ${act.length}` }); act.forEach(q => rows.push({ q })); if (!act.length) rows.push({ note: 'Nothing started yet. Talk to people.' });
  rows.push({ head: `DONE ${done.length}` }); done.forEach(q => rows.push({ q }));
  let total = 0;
  for (const r of rows) { r.y = total; if (r.note) r.h = 44; else if (r.q) { r.tl = wrapLines(r.q.title, 'small', LW - 16, 2); r.h = 12 + r.tl.length * TL + 18; } else r.h = 24; total += r.h; }
  const sel = act.concat(done).find(q => q.id === u.qSel) || act[0] || done[0];
  const fc = UI.focus.current(); if (fc && UI.focus.showing() && fc.id.startsWith('q:')) { const r = rows.find(z => z.q && 'q:' + z.q.id === fc.id); if (r) mnReveal('q', LH, LY, r.y, r.h); }
  const off = mnScroll('q', LX, LY, LW, LH, total);
  ctx.save(); ctx.beginPath(); ctx.rect(LX - 4, LY, LW + 8, LH); ctx.clip();
  for (const r of rows) {
    const y = LY + r.y - off;
    if (r.head) { if (y > LY - 24 && y < LY + LH) UI.text(ctx, r.head, LX + 4, y + 4, 'small', UC.dim); continue; }
    if (r.note) { UI.wrap(ctx, r.note, LX + 8, y + 4, LW - 16, 'small', UC.dim); continue; }
    const fn = () => { u.qSel = r.q.id; };
    if (y < LY - r.h || y > LY + LH) { UI.focus.register({ x: LX, y, w: LW, h: r.h - 4 }, 'q:' + r.q.id, { fn }); continue; }
    const inView = y >= LY && y + r.h <= LY + LH;
    const reg = inView ? mnRegion(LX, y, LW, r.h - 4, 'q:' + r.q.id, fn, { def: r.q === sel }) : (UI.focus.register({ x: LX, y, w: LW, h: r.h - 4 }, 'q:' + r.q.id, { fn }), { on: false });
    const on = r.q === sel;
    if (on || reg.on) { ctx.fillStyle = UC.bevel; ctx.globalAlpha = 0.6; ctx.fillRect(LX, y, LW, r.h - 4); ctx.globalAlpha = 1; }
    r.tl.forEach((l, i) => UI.text(ctx, l, LX + 8, y + 6 + i * TL, 'small', on ? UC.gold : UC.text));
    UI.text(ctx, fitText(`${r.q.main ? 'Main' : 'Side'} / ${zoneName(r.q.zone)}`, LW - 16), LX + 8, y + 8 + r.tl.length * TL, 'small', UC.dim);
  }
  ctx.restore();
  mnScrollbar(ctx, LX + LW + 4, LY, LH, total, off);
  if (!sel) { UI.text(ctx, 'No quests yet.', COL2 + 8, 80, 'small', UC.dim); return; }
  const x = COL2 + 8, w = 660, d = qDone(sel.id), st = qStep(sel.id);
  UI.text(ctx, sel.title, x, 78, 'body', UC.gold);
  UI.text(ctx, `${sel.main ? 'Main quest' : 'Side quest'}   from ${sel.giver}   ${zoneName(sel.zone)}   ${d ? 'DONE' : 'ACTIVE'}`, x, 104, 'small', UC.dim);
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
