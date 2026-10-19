'use strict';
// ---------------------------------------------------------------------------
// HUD (drawn at 960x540 over the upscaled scene) — layout follows the sketch:
// name plate + gear/buff icons, portrait with HP/MP/stamina bars bottom-left,
// diamond compass minimap bottom-right with the "!" toward the NE rift.
// Also: skill bar, loadout screen, banners, boss bar, damage numbers.
// ---------------------------------------------------------------------------
const FONT = '"Press Start 2P", "Courier New", monospace';
const HC = { line: '#c7a8ff', dark: '#5d4a8a', bg: 'rgba(18,10,36,0.82)', gold: '#ffd35a', text: '#f4ecff', dim: '#a99cc8' };

function T(ctx, s, x, y, size = 8, col = HC.text, align = 'left', sh = true) {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (sh) { ctx.fillStyle = 'rgba(10,4,20,0.9)'; ctx.fillText(s, x + Math.max(1, size / 8), y + Math.max(1, size / 8)); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(ctx, s, x, y, w, size = 8, col = HC.text, lh = 14) {
  ctx.font = `${size}px ${FONT}`;
  const words = s.split(' '); let line = '';
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (ctx.measureText(t).width > w && line) { T(ctx, line, x, y, size, col); y += lh; line = wd; } else line = t;
  }
  if (line) T(ctx, line, x, y, size, col);
  return y + lh;
}
function panel(ctx, x, y, w, h, hi = false) {
  ctx.fillStyle = HC.bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hi ? HC.gold : HC.dark; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
  ctx.fillStyle = hi ? '#fff2b0' : HC.line; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + 2, 1, h - 4);
  ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.fillRect(x + w - 1, y - 1, 2, 2); ctx.fillRect(x - 1, y + h - 1, 2, 2); ctx.fillRect(x + w - 1, y + h - 1, 2, 2);
}
function bar(ctx, x, y, w, h, frac, c1, c2, label) {
  ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#2a1f45'; ctx.fillRect(x, y, w, h);
  const fw = Math.round(w * clamp(frac, 0, 1));
  ctx.fillStyle = c1; ctx.fillRect(x, y, fw, h);
  ctx.fillStyle = c2; ctx.fillRect(x, y, fw, Math.ceil(h * 0.35));
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, fw, 2);
  for (let k = 1; k < 10; k++) { ctx.fillStyle = 'rgba(10,4,20,0.35)'; ctx.fillRect(x + Math.round(w * k / 10), y + h - 4, 2, 4); }
  if (label) T(ctx, label, x + w / 2, y + Math.round(h / 2 - 4), 8, '#ffffff', 'center');
}

function btn(ctx, x, y, w, h, fn, hover) {
  G.ui.btns.push({ x, y, w, h, fn, hover });
  return G.mouse.dx >= x && G.mouse.dx < x + w && G.mouse.dy >= y && G.mouse.dy < y + h;
}

// ===== minimap ======================================================================
function buildMinimap(m) {
  const S = 120, { c, x } = makeCanvas(S + 4, S + 4);
  const s = 60 / Math.max(m.W, m.H);
  const cx = S / 2 + 2, cy = 2;
  const col = (i, j) => {
    const t = m.type[j][i]; if (!t) return null;
    if (m.block[j][i] && t !== 'w' && t !== 'pillar') return '#b98a6a';
    return { g: '#4a9a63', f: '#6db56a', p: '#cbc4e4', w: '#4a8fd0', b: '#a87a5c', s: '#9a92c0', x: '#4d4570', r: '#7a5ab0', d: '#2d5647', pillar: '#8a80b0' }[t] || '#888';
  };
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
    let cc = col(i, j); if (!cc) continue;
    if (m.h[j][i] >= 4 && m.type[j][i] !== 'pillar') cc = shadeHex(cc, 1.25);
    x.fillStyle = cc;
    x.beginPath(); x.moveTo(cx + (i - j) * s, cy + (i + j) * s); x.lineTo(cx + (i + 1 - j) * s, cy + (i + 1 + j) * s); x.lineTo(cx + (i - j) * s, cy + (i + j + 2) * s); x.lineTo(cx + (i - j - 1) * s, cy + (i + j + 1) * s); x.closePath(); x.fill();
  }
  for (const o of m.objects) if (o.r >= 0.3 && o.shadow >= 7) { x.fillStyle = '#1f4e4c'; x.fillRect(cx + (o.x - o.y) * s - 1, cy + (o.x + o.y) * s - 1, 2, 2); }
  m.mini = { c, s, cx, cy };
}
function shadeHex(h, f) { const c = hexToRgb(h); return `rgb(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0})`; }

function drawMinimap(ctx) {
  const m = G.map, p = G.player;
  if (!m.mini) buildMinimap(m);
  const [X, Y] = minimapPos(), R = 62, CX = X + 64, CY = Y + 64;
  // diamond frame
  ctx.fillStyle = 'rgba(18,10,36,0.85)';
  ctx.beginPath(); ctx.moveTo(CX, CY - R - 6); ctx.lineTo(CX + R + 6, CY); ctx.lineTo(CX, CY + R + 6); ctx.lineTo(CX - R - 6, CY); ctx.closePath(); ctx.fill();
  ctx.drawImage(m.mini.c, CX - 62, CY - 62);
  ctx.strokeStyle = HC.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(CX, CY - R - 6); ctx.lineTo(CX + R + 6, CY); ctx.lineTo(CX, CY + R + 6); ctx.lineTo(CX - R - 6, CY); ctx.closePath(); ctx.stroke();
  const mp = (x, y) => [CX - 62 + m.mini.cx + (x - y) * m.mini.s, CY - 62 + m.mini.cy + (x + y) * m.mini.s];
  for (const e of G.enemies) { if (e.dummy) continue; const [ex, ey] = mp(e.x, e.y); ctx.fillStyle = e.boss ? '#ff3a7a' : '#ff8aa8'; const s = e.boss ? 6 : 3; ctx.fillRect(Math.round(ex - s / 2), Math.round(ey - s / 2), s, s); }
  for (const pt of m.portals) if (pt.open) {
    const [qx, qy] = mp(pt.x, pt.y);
    if (pt.marker) { if (Math.sin(G.t * 6) > -0.3) T(ctx, '!', Math.round(qx), Math.round(qy) - 10, 16, HC.gold, 'center'); }
    else { ctx.fillStyle = '#9ef0ff'; ctx.fillRect(Math.round(qx) - 2, Math.round(qy) - 2, 4, 4); }
  }
  const [px, py] = mp(p.x, p.y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
  ctx.fillStyle = '#ff5a9a'; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
  T(ctx, 'N', CX, CY - R - 22, 8, HC.gold, 'center');
  T(ctx, 'S', CX, CY + R + 12, 8, HC.text, 'center');
  T(ctx, 'E', CX + R + 16, CY - 4, 8, HC.text, 'center');
  T(ctx, 'W', CX - R - 16, CY - 4, 8, HC.text, 'center');
}

// ===== main HUD =====================================================================
function drawHUD(ctx) {
  const p = G.player, m = G.map;
  G.ui.btns = [];
  ctx.imageSmoothingEnabled = false;
  // floating damage numbers
  for (const t of G.texts) {
    const [vx, vy] = worldToView(t.x, t.y, t.z);
    const k = t.t / (t.life || 0.9), x = (vx + t.vx * t.t * 20) * 2, y = (vy - t.t * 26) * 2;
    ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
    T(ctx, t.s, x, y, t.big ? 16 : 8, t.col, 'center');
    ctx.globalAlpha = 1;
  }
  drawDropNames(ctx);
  if (G.state === 'title') { drawTitle(ctx); return; }

  // ---- top-left: area + objective ----
  panel(ctx, 16, 14, 300, 54);
  T(ctx, m.name, 28, 24, 8, HC.gold);
  T(ctx, objective(), 28, 42, 8, HC.text);

  // ---- name plate + gear/buff icons (sketch: bar above portrait, icons to its right) ----
  const BY = DH - 148;
  panel(ctx, 16, BY, 214, 26);
  T(ctx, `${p.name}`, 28, BY + 9, 8, '#ffffff');
  T(ctx, `Lv ${p.level} Dreamwalker`, 222, BY + 7, 8, HC.dim, 'right');
  ctx.fillStyle = '#0a0614'; ctx.fillRect(22, BY + 18, 202, 4);
  ctx.fillStyle = '#b48aff'; ctx.fillRect(22, BY + 18, Math.round(202 * (p.level >= MAX_LEVEL ? 1 : p.xp / xpToNext(p.level))), 4);
  let ix = 240;
  for (const slot of ['weapon', 'chest', 'head', 'boots']) { const it = p.equip[slot]; if (it) { drawIcon(ctx, itemIcon(it), ix, BY - 3, 28); ctx.strokeStyle = rarityCol(it.rarity); ctx.lineWidth = 2; ctx.strokeRect(ix, BY - 3, 28, 28); } ix += 32; }
  ix += 6;
  for (const id in p.buffs) {
    const b = BUFFS[id]; if (!b) continue;
    drawIcon(ctx, buffIcon(id), ix, BY - 3, 28);
    const f = p.buffs[id].t / p.buffs[id].max;
    ctx.fillStyle = '#0a0614'; ctx.fillRect(ix, BY + 27, 28, 3); ctx.fillStyle = b.color; ctx.fillRect(ix, BY + 27, Math.round(28 * f), 3);
    ix += 32;
  }

  // ---- portrait ----
  const PY = DH - 112;
  panel(ctx, 16, PY, 96, 96);
  const g = ctx.createLinearGradient(0, PY, 0, PY + 96); const pg = { vale: ['#f6b2b0', '#5d3f98'], ruins: ['#7a1f4f', '#1f0c33'], forest: ['#f39056', '#2c3c52'] }[m.themeId] || ['#f6b2b0', '#5d3f98']; g.addColorStop(0, pg[0]); g.addColorStop(1, pg[1]);
  ctx.fillStyle = g; ctx.fillRect(19, PY + 3, 90, 90);
  ctx.save(); ctx.beginPath(); ctx.rect(19, PY + 3, 90, 90); ctx.clip();
  ctx.drawImage(p.spr.portrait, p.spr.ox, p.spr.ox, 16, 18, 16, PY + (p.gear.head === 'arcanecowl' ? 4 : -6), 96, 108);
  ctx.restore();
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(255,40,90,${p.hurtT})`; ctx.fillRect(19, PY + 3, 90, 90); }

  // ---- bars ----
  const bx = 124, bw = 196;
  bar(ctx, bx, PY + 4, bw, 22, p.hp / p.maxHp, '#e0476e', '#ff8aa8', `${Math.ceil(p.hp)} / ${p.maxHp}`);
  bar(ctx, bx, PY + 37, bw, 22, p.mp / p.maxMp, '#4a6be0', '#8fb0ff', `${Math.floor(p.mp)} / ${p.maxMp}`);
  bar(ctx, bx, PY + 70, bw, 22, p.st / p.maxSt, '#d9a23a', '#ffe08a', `${Math.floor(p.st)} / ${p.maxSt}`);
  T(ctx, 'HP', bx + bw + 8, PY + 11, 8, '#ff8aa8'); T(ctx, 'MP', bx + bw + 8, PY + 44, 8, '#8fb0ff'); T(ctx, 'ST', bx + bw + 8, PY + 77, 8, '#ffe08a');

  if (!G.touch) drawSkillBar(ctx);
  drawMinimap(ctx);

  // ---- boss bar ----
  const b = G.boss;
  if (b && !b.dead && b.spawnT <= 0.8) {
    const w = 460, x = (DW - w) / 2, y = 26;
    T(ctx, `${(ENEMY.boss.name || 'Boss').toUpperCase()}   Lv ${b.lvl}`, DW / 2, y - 16, 8, '#ffb0e0', 'center');
    bar(ctx, x, y, w, 16, b.hp / b.maxHp, '#b0306e', '#ff7ae0', b.phase2 ? 'ENRAGED' : '');
    // boss bars always show weaknesses / resistances (§5b)
    const wk = Object.keys(b.res).filter(k => b.res[k] < 0), rs = Object.keys(b.res).filter(k => b.res[k] > 0);
    if (wk.length) T(ctx, 'WEAK: ' + wk.join(' ').toUpperCase(), x, y + 22, 8, '#ffe36a');
    if (rs.length) T(ctx, 'RESIST: ' + rs.join(' ').toUpperCase(), x + w, y + 22, 8, '#c8c0e0', 'right');
  }
  if (G.enemies.some(e => !e.dummy)) { const n = G.enemies.filter(e => !e.dummy).length; if (G.touch) T(ctx, `Enemies left: ${n}`, 28, 78, 8, '#ffb0e0'); else T(ctx, `Enemies left: ${n}`, DW - 20, 22, 8, '#ffb0e0', 'right'); }

  // ---- banner / messages ----
  if (G.banner && G.banner.t > 0) {
    const a = Math.min(1, G.banner.t, (G.banner.max || 3) - G.banner.t + 1);
    ctx.globalAlpha = clamp(a, 0, 1);
    T(ctx, G.banner.s, DW / 2, 150, 24, G.banner.boss ? '#ff7ae0' : G.banner.lvl ? '#fff2b0' : HC.gold, 'center');
    if (G.banner.sub) T(ctx, G.banner.sub, DW / 2, 186, 8, HC.text, 'center');
    ctx.globalAlpha = 1;
  }
  if (G.tablet && G.tablet.src && G.state === 'play' && !G.ui.open) {   // lore tablet: read while standing beside it
    const w = 520, x = (DW - w) / 2, y = 212;
    panel(ctx, x, y, w, 70, true); T(ctx, G.tablet.src.title || 'Lore tablet', x + 16, y + 12, 8, HC.gold);
    wrap(ctx, G.tablet.src.text || '...the words have worn away.', x + 16, y + 30, w - 32, 8, HC.text, 14);
  }
  if (G.msg && G.msg.t > 0) { ctx.globalAlpha = Math.min(1, G.msg.t * 2); T(ctx, G.msg.s, DW / 2, DH - 170, 8, '#ffe6f0', 'center'); ctx.globalAlpha = 1; }
  const near = m.portals.find(pt => pt.open && dist(p.x, p.y, pt.x, pt.y) < 3.2);
  if (near && G.state === 'play') { const [a, b] = zoneLevel(near.to); T(ctx, `A rift to ${(G.world.maps[near.to] || {}).name || near.to} (Lv ${a}-${b}) hums... step in to cross over`, DW / 2, DH - 190, 8, '#e2c8ff', 'center'); }

  if (G.touch) { if (G.state === 'play' && !G.ui.open) drawTouchControls(ctx); }
  else T(ctx, 'TAB inventory   4 potion   H help   M sound', DW - 20, 80, 8, 'rgba(244,236,255,0.6)', 'right', false);
  if (G.ui.help) drawHelp(ctx);
  if (G.ui.open) drawInventory(ctx);
  if (G.state === 'dead') {
    ctx.fillStyle = `rgba(20,6,30,${Math.min(0.75, G.deadT * 0.5)})`; ctx.fillRect(0, 0, DW, DH);
    if (G.deadT > 0.8) {
      const lost = deathXpLoss(p), cp = G.checkpoint && G.world.maps[G.checkpoint.map];
      T(ctx, 'You fell...', DW / 2, 200, 24, '#ffb0e0', 'center');
      T(ctx, lost ? `-${lost} XP` : 'The dream holds you gently.', DW / 2, 248, 8, '#c79bff', 'center');
      T(ctx, `${G.touch ? 'Tap' : 'Click'} to wake at ${cp ? 'the last checkpoint' : 'the start of ' + m.name}`, DW / 2, 276, 8, HC.text, 'center');
    }
  }
}
// floating rarity-coloured names over ground loot (crisp HUD text)
function drawDropNames(ctx) {
  const p = G.player; if (!G.drops || !p) return;
  for (const d of G.drops) {
    if (d.t < 0.5) continue;
    const i = RARITY[d.rar].i, dd = dist(p.x, p.y, d.x, d.y);
    if (dd > (i >= 2 ? 9 : 5)) continue;
    const [vx, vy] = worldToView(d.x, d.y, d.z), h = DROP_FX[i].h * Math.min(1, (d.t - 0.3) * 2.5);
    ctx.globalAlpha = clamp(Math.min((d.t - 0.5) * 3, (i >= 2 ? 9 : 5) - dd), 0, 1);
    T(ctx, d.name, Math.round(vx * 2), Math.round((vy - Math.max(10, h) - 5) * 2), 8, rarityCol(d.rar), 'center');
    ctx.globalAlpha = 1;
  }
}

function objective() { return G.objective || ''; }

const SLOT_LABEL = { lmb: 'LMB', q: 'Q', e: 'E', r: 'R', f: 'F', c: 'C', shift: 'SHF', 1: '1', 2: '2', 3: '3' };
function drawSkillBar(ctx) {
  const p = G.player, w = item('weapon', p.gear.weapon);
  const slots = ['lmb', 'q', 'e', 'r', '|', 'f', 'c', 'shift', '|', '1', '2', '3', '|', 'pot'];
  let x = 374; const y = DH - 60;
  panel(ctx, x - 8, y - 8, 458, 56);
  let hoverSkill = null;
  for (const s of slots) {
    if (s === '|') { x += 10; continue; }
    if (s === 'pot') {   // health potion, key 4
      ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 1, y - 1, 38, 38); drawIcon(ctx, miscIcon('potion'), x + 2, y + 2, 32);
      if (!p.potions) { ctx.fillStyle = 'rgba(10,4,20,0.65)'; ctx.fillRect(x + 2, y + 2, 32, 32); }
      ctx.strokeStyle = '#ff8aa8'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 38, 38);
      T(ctx, '4', x, y - 2, 8, '#ffffff'); T(ctx, String(p.potions), x + 34, y + 25, 8, '#ffffff', 'right');
      if (G.mouse.dx >= x && G.mouse.dx < x + 36 && G.mouse.dy >= y && G.mouse.dy < y + 36) hoverSkill = { name: 'Health Potion', desc: `Heal 40% of max HP. ${p.potions}/${MAX_POTIONS} charges, refilled at checkpoints.`, cd: 1 };
      x += 38; continue;
    }
    const id = s === 'lmb' ? null : slotSkill(p, s);
    const sk = id ? SKILLS[id] : null;
    ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 1, y - 1, 38, 38);
    if (s === 'lmb') drawIcon(ctx, itemIcon(p.equip.weapon), x + 2, y + 2, 32);
    else if (sk) drawIcon(ctx, skillIcon(id), x + 2, y + 2, 32);
    if (sk) {
      const cd = p.cds[id] || 0;
      if (cd > 0) { const f = cd / (p.cdm[id] || sk.cd); ctx.fillStyle = 'rgba(10,4,20,0.72)'; ctx.fillRect(x + 2, y + 2, 32, Math.round(32 * f)); T(ctx, cd >= 1 ? Math.ceil(cd) + '' : cd.toFixed(1), x + 18, y + 14, 8, '#ffffff', 'center'); }
      else if ((sk.mp || 0) > p.mp || (sk.st || 0) > p.st) { ctx.fillStyle = 'rgba(40,60,160,0.55)'; ctx.fillRect(x + 2, y + 2, 32, 32); }
    }
    if (G.lastCast && G.lastCast.slot === s && G.lastCast.t > 0) { ctx.fillStyle = `rgba(255,255,255,${G.lastCast.t * 2})`; ctx.fillRect(x + 2, y + 2, 32, 32); }
    const isUlt = s === 'r';
    ctx.strokeStyle = isUlt ? HC.gold : (s === 'f' || s === 'c' || s === 'shift' ? '#8fb0ff' : (/\d/.test(s) ? '#ffb0e0' : HC.line));
    ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 38, 38);
    T(ctx, SLOT_LABEL[s], x, y - 2, 8, '#ffffff');
    if (G.mouse.dx >= x && G.mouse.dx < x + 36 && G.mouse.dy >= y && G.mouse.dy < y + 36) hoverSkill = sk ? sk : { name: w.basic.name, desc: `Basic attack of the ${w.name}.`, cd: w.basic.rate };
    x += 38;
  }
  if (hoverSkill && !G.ui.open) {
    const tx = 374, ty = DH - 152;
    panel(ctx, tx, ty, 300, 82);
    T(ctx, hoverSkill.name, tx + 10, ty + 10, 8, HC.gold);
    const costs = [hoverSkill.mp ? `${hoverSkill.mp} MP` : '', hoverSkill.st ? `${hoverSkill.st} ST` : '', `CD ${hoverSkill.cd}s`].filter(Boolean).join('  ');
    T(ctx, costs, tx + 290, ty + 10, 8, HC.dim, 'right');
    wrap(ctx, hoverSkill.desc, tx + 10, ty + 28, 280, 8, HC.text, 14);
  }
}

function drawHelp(ctx) {
  const x = 230, y = 90, w = 500, h = 300;
  panel(ctx, x, y, w, h, true);
  T(ctx, 'HOW TO PLAY', x + w / 2, y + 16, 16, HC.gold, 'center');
  const lines = G.touch ? [
    ['Left thumb', 'Joystick: move'], ['Big button (hold)', 'Weapon basic attack'], ['Tap a skill', 'Cast at nearest enemy'],
    ['Drag from a skill', 'Aim, release to cast'], ['Q  E  R', 'Weapon skills (R = ultimate)'], ['F  C  SHF', 'Chest / helmet / boots skills'],
    ['1  2  3', 'Character skills (your choice)'], ['POT', 'Drink a potion (40% HP)'], ['GEAR', 'Inventory, gems & skills'], ['Tap', 'Close this help'],
  ] : [
    ['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click (hold)', 'Weapon basic attack'],
    ['Q  E  R', 'Weapon skills (R = ultimate)'], ['F', 'Chest armour skill'], ['C', 'Helmet skill'], ['Shift / Space', 'Boots skill'],
    ['1  2  3', 'Character skills (your choice)'], ['4', 'Drink a potion (40% HP)'], ['TAB / I', 'Inventory, gems & skills'],
  ];
  lines.forEach(([k, v], i) => { T(ctx, k, x + 30, y + 52 + i * 20, 8, '#ffe08a'); T(ctx, v, x + 230, y + 52 + i * 20, 8, HC.text); });
  T(ctx, 'Like Albion: you are what you wear. Gear decides', x + 30, y + 262, 8, HC.dim);
  T(ctx, 'Q E R F C SHIFT. Character skills are your pick.', x + 30, y + 278, 8, HC.dim);
}

// ===== inventory (TAB / I / GEAR): tab 1 = gear, bag, gems; tab 2 = the skill choices ======================
// DRAWING only: each frame registers hit regions (btn -> G.ui.btns) that call the actions in items.js
// (clickBag / clickItem / clickSocket); selection + focus live in G.ui (sel, gem, salvage, tab).
const SLOT_TITLE = { weapon: 'Weapon', head: 'Helmet', chest: 'Chest', boots: 'Boots' };
const IS = 56, IB = 52;   // bag cell pitch / box (48 px icon = 24 px art at 2x)

function drawInventory(ctx) {
  const X = 16, Y = 12, W = 928, H = 516;
  ctx.fillStyle = 'rgba(8,4,18,0.6)'; ctx.fillRect(0, 0, DW, DH);
  ctx.fillStyle = '#120a24'; ctx.fillRect(X, Y, W, H);
  panel(ctx, X, Y, W, H, true);
  const tab = G.ui.tab || 'inv';
  [['inv', 'INVENTORY', 170], ['skills', 'SKILLS', 120]].reduce((tx, [id, label, w]) => {
    const on = tab === id, hov = btn(ctx, tx, Y + 12, w, 30, () => { G.ui.tab = id; G.ui.gem = null; G.ui.salvage = false; });
    ctx.fillStyle = on ? 'rgba(255,211,90,0.22)' : hov ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(tx, Y + 12, w, 30);
    ctx.strokeStyle = on ? HC.gold : HC.dark; ctx.lineWidth = 2; ctx.strokeRect(tx, Y + 12, w, 30);
    T(ctx, label, tx + w / 2, Y + 23, 8, on ? HC.gold : HC.text, 'center');
    return tx + w + 8;
  }, X + 20);
  const xh = btn(ctx, X + W - 46, Y + 10, 34, 34, () => closeInv());
  ctx.fillStyle = xh ? 'rgba(255,211,90,0.3)' : 'rgba(0,0,0,0.35)'; ctx.fillRect(X + W - 46, Y + 10, 34, 34);
  T(ctx, 'X', X + W - 29, Y + 19, 16, HC.gold, 'center');
  const p = G.player;
  drawIcon(ctx, miscIcon('dust'), X + W - 180, Y + 14, 24); T(ctx, `${p.dust} Dust`, X + W - 152, Y + 22, 8, '#d6c2ff');
  if (tab === 'skills') { drawSkillsTab(ctx, X, Y, W, H); return; }

  let hover = null;   // { it } | { gemIdx }
  const sel = G.ui.sel, gemPick = G.ui.gem != null && p.bag[G.ui.gem] && p.bag[G.ui.gem].gem ? G.ui.gem : null;
  if (gemPick == null) G.ui.gem = null;
  // --- equipped column + sockets ---
  SLOTS.forEach((slot, i) => {
    const ex = X + 20, ey = Y + 66 + i * 84, it = p.equip[slot];
    T(ctx, SLOT_TITLE[slot], ex, ey - 12, 8, HC.dim);
    const hov = btn(ctx, ex, ey, IB, IB, () => clickItem(it));
    drawSlot(ctx, ex, ey, it, hov || sel === it);
    if (hov) hover = { it };
    it.sockets.forEach((g, k) => {
      const sx = ex + IB + 6, sy = ey + k * 18, sh = btn(ctx, sx, sy, 16, 16, () => clickSocket(it, k));
      drawSocket(ctx, sx, sy, 16, g, sh || (gemPick != null && !g));
      if (sh) hover = g ? { gem: g, sock: true } : { it };
    });
  });
  // --- hero preview (M3 swaps in the layered paper-doll) ---
  const hx = X + 112, hy = Y + 54;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(hx, hy, 172, 318);
  const spr = p.spr.front[Math.floor(G.t * 2) % 2 ? 0 : 0], sc = 5;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, Math.round(hx + 86 - spr.width * sc / 2), Math.round(hy + 40), spr.width * sc, spr.height * sc);
  T(ctx, p.name, hx + 86, hy + 210, 8, '#ffffff', 'center');
  T(ctx, `Level ${p.level}`, hx + 86, hy + 226, 8, HC.gold, 'center');
  const xf = p.level >= MAX_LEVEL ? 1 : p.xp / xpToNext(p.level);
  ctx.fillStyle = '#0a0614'; ctx.fillRect(hx + 16, hy + 244, 140, 6); ctx.fillStyle = '#b48aff'; ctx.fillRect(hx + 16, hy + 244, Math.round(140 * xf), 6);
  T(ctx, p.level >= MAX_LEVEL ? 'MAX' : `${Math.floor(p.xp)} / ${xpToNext(p.level)} XP`, hx + 86, hy + 256, 8, HC.dim, 'center');
  T(ctx, 'RESIST', hx + 86, hy + 274, 8, HC.dim, 'center');
  RES_ELS.forEach((el, i) => { const v = Math.round((p.res[el] || 0) * 100); T(ctx, `${RES_SHORT[el]}${v > 0 ? '+' : ''}${v}`, hx + 8 + (i % 4) * 42, hy + 288 + Math.floor(i / 4) * 14, 8, v > 0 ? EL_COL[el] : v < 0 ? '#ff7a8a' : HC.dim); });
  // --- stat sheet ---
  const st = [['Attack', Math.round(item('weapon', p.gear.weapon).basic.dmg * p.power)], ['HP', p.maxHp], ['MP', p.maxMp], ['Defence', pct(p.def)],
    ['Crit', pct(p.crit)], ['Crit dmg', '+' + pct(p.critDmg)], ['Atk speed', '+' + pct(p.haste)], ['Cooldowns', '-' + pct(p.cdr)],
    ['Skill dmg', '+' + pct(p.skillDmg)], ['Regen', `${+p.regen.toFixed(1)}/s`], ['Potions', `${p.potions}/${MAX_POTIONS}`], ['Dust', p.dust]];
  st.forEach(([k, v], i) => { const sx = X + 20 + (i % 2) * 138, sy = Y + 400 + Math.floor(i / 2) * 15; T(ctx, k, sx, sy, 8, HC.dim); T(ctx, String(v), sx + 128, sy, 8, HC.text, 'right'); });
  // --- bag 6x5 ---
  const BX = X + 300, BY = Y + 66;
  T(ctx, `BAG  ${p.bag.filter(Boolean).length}/${BAG_SIZE}`, BX, BY - 12, 8, '#ffe08a');
  for (let i = 0; i < BAG_SIZE; i++) {
    const cx = BX + (i % 6) * IS, cy = BY + Math.floor(i / 6) * IS, e = p.bag[i];
    const hov = btn(ctx, cx, cy, IB, IB, alt => clickBag(i, alt));
    if (!e) { ctx.fillStyle = hov ? 'rgba(199,168,255,0.12)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(cx, cy, IB, IB); ctx.strokeStyle = HC.dark; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, IB - 1, IB - 1); continue; }
    if (e.gem) {
      const g = gemParse(e.gem), on = gemPick === i;
      ctx.fillStyle = on ? rgba(g.def.col, 0.35) : 'rgba(0,0,0,0.3)'; ctx.fillRect(cx, cy, IB, IB);
      drawIcon(ctx, gemIcon(g.type, g.grade), cx + 2, cy + 2, 48);
      ctx.strokeStyle = on || hov ? g.def.col : HC.dark; ctx.lineWidth = 2; ctx.strokeRect(cx + 1, cy + 1, IB - 2, IB - 2);
      T(ctx, GEM_GRADES[g.grade - 1][0], cx + 4, cy + 4, 8, '#ffffff');
      if (e.n > 1) T(ctx, 'x' + e.n, cx + IB - 3, cy + IB - 11, 8, '#ffffff', 'right');
      if (hov) hover = { gemIdx: i };
    } else {
      drawSlot(ctx, cx, cy, e, hov || sel === e, G.ui.salvage);
      if (e.reqLvl > p.level) { ctx.fillStyle = 'rgba(255,60,90,0.25)'; ctx.fillRect(cx + 2, cy + IB - 12, IB - 4, 10); T(ctx, 'L' + e.reqLvl, cx + IB - 4, cy + IB - 11, 8, '#ff7a8a', 'right'); }
      if (hov) hover = { it: e };
    }
  }
  // --- bag actions ---
  const ay = BY + 5 * IS + 8, sv = G.ui.salvage;
  const sh = btn(ctx, BX, ay, 150, 28, () => { G.ui.salvage = !G.ui.salvage; G.ui.gem = null; G.ui.confirm = null; });
  ctx.fillStyle = sv ? 'rgba(255,90,120,0.3)' : sh ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(BX, ay, 150, 28);
  ctx.strokeStyle = sv ? '#ff7a8a' : HC.dark; ctx.lineWidth = 2; ctx.strokeRect(BX, ay, 150, 28);
  T(ctx, sv ? 'SALVAGE: ON' : 'SALVAGE', BX + 75, ay + 10, 8, sv ? '#ffb0c8' : HC.text, 'center');
  let hint = gemPick != null ? `${gemName(p.bag[gemPick].gem)} picked: click a socket or an item` : sv ? 'Click gear to turn it into Dream Dust' :
    G.touch ? 'Tap: details   tap again: equip / use' : 'Click: equip   Right-click: salvage   Gems: click, then a socket';
  if (G.ui.note && G.ui.note.t > G.t) hint = G.ui.note.s;
  wrap(ctx, hint, BX, ay + 40, 336, 8, G.ui.note && G.ui.note.t > G.t ? G.ui.note.col : HC.dim, 14);
  // --- details ---
  drawDetails(ctx, X + 652, Y + 54, W - 668, H - 66, hover || (sel && (sel.gem != null ? { gemIdx: sel.gemIdx } : { it: sel })));
}
const pct = v => Math.round((v || 0) * 100) + '%';
function drawSlot(ctx, x, y, it, hi, salvage) {
  if (!it) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y, IB, IB); return; }
  drawRarityFrame(ctx, x, y, IB, it.rarity);
  drawIcon(ctx, itemIcon(it), x + 2, y + 2, 48);
  it.sockets.forEach((g, k) => { ctx.fillStyle = '#0a0614'; ctx.fillRect(x + 4 + k * 7, y + IB - 9, 6, 6); ctx.fillStyle = g ? gemParse(g).def.col : '#3a3058'; ctx.fillRect(x + 5 + k * 7, y + IB - 8, 4, 4); });
  if (hi) { ctx.strokeStyle = salvage ? '#ff7a8a' : '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, IB + 3, IB + 3); }
}
function drawSocket(ctx, x, y, s, g, hi) {
  ctx.fillStyle = '#0a0614'; ctx.fillRect(x, y, s, s);
  if (g) drawIcon(ctx, gemIcon(gemParse(g).type, gemParse(g).grade), x + 1, y + 1, s - 2);
  else { ctx.fillStyle = '#2a1f45'; ctx.fillRect(x + 3, y + 3, s - 6, s - 6); }
  ctx.strokeStyle = hi ? HC.gold : HC.dark; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}
// details panel: rarity name, ilvl/req, base stats, affixes, unique, sockets, skills, compare vs equipped
function drawDetails(ctx, x, y, w, h, what) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y, w, h);
  const p = G.player, L = [];
  const line = (s, col = HC.text, size = 8) => L.push({ s, col, size });
  if (what && what.it === undefined && what.gemIdx == null && !what.gem) what = null;
  if (!what || (what.it === null)) { wrap(ctx, G.touch ? 'Tap an item or gem to see it here.' : 'Hover an item or gem to see it here.', x + 10, y + 12, w - 20, 8, HC.dim, 14); return; }
  const gemId = what.gem || (what.gemIdx != null && p.bag[what.gemIdx] && p.bag[what.gemIdx].gem);
  if (gemId) {
    const g = gemParse(gemId); if (!g) return;
    line(gemName(gemId), g.def.col, 16); line('Gem', HC.dim); line('');
    line('In armour:', HC.dim); for (const [k, v] of Object.entries(g.def.arm(g.grade))) line(fmtStat(k, v), '#9fd0ff');
    line('In weapon:', HC.dim); for (const [k, v] of Object.entries(g.def.wpn(g.grade))) line(fmtStat(k, v), '#9fd0ff');
    line(''); line(`Amplifies: ${g.def.amp}`, HC.gold);
    line(g.type === 'diamond' ? `-${Math.round(g.grade * 5)}% ultimate cooldown` : g.type === 'topaz' ? `+${g.grade * 5}% lightning dmg, chains +1 per 2 grades` : `+${g.grade * 5}% ${g.def.el} skill damage`, HC.text);
    line(''); line(what.sock ? 'Click the socket to remove it' : 'Pick it, then click a socket', HC.dim);
  } else {
    const it = what.it; if (!it || !BASES[it.base]) return;   // stale focus (gem used up, item salvaged)
    const b = BASES[it.base], R = RARITY[it.rarity], fam = item(b.slot, b.family);
    line(itemName(it), rarityCol(it.rarity), it.unique ? 8 : 16);
    line(`${R.name} ${SLOT_TITLE[b.slot]}  T${b.tier + 1}`, HC.dim);
    L.push({ s: `Item Lv ${it.ilvl}   Requires Lv ${it.reqLvl}`, col: it.reqLvl > p.level ? '#ff5a7a' : HC.dim, size: 8 });
    line('');
    const base = itemBase(it); for (const k of STAT_ORDER) if (base[k]) line(fmtStat(k, base[k], k !== 'dmg'), '#ffffff');
    for (const a of it.affixes) line(fmtStat(a.stat, a.v), '#8fb0ff');
    if (it.unique && UNIQUES[it.unique]) { line(''); line(UNIQUES[it.unique].desc, HC.gold); line('(unique rule: not active yet)', HC.dim); }
    it.sockets.forEach(g => { if (!g) { line('o Empty socket', HC.dim); return; } const gs = gemStats(g, it.slot); line(`* ${gemName(g)}: ${Object.entries(gs).map(([k, v]) => fmtStat(k, v)).join(', ')}`, gemParse(g).def.col); });
    line('');
    if (b.slot === 'weapon') { line(`LMB ${fam.basic.name}`, HC.dim); for (const k of ['q', 'e', 'r']) line(`${k.toUpperCase()} ${fam[k].map(id => SKILLS[id].name).join(' / ')}`, HC.dim); }
    else line(`${{ chest: 'F', head: 'C', boots: 'SHF' }[b.slot]} ${SKILLS[fam.skill].name}`, HC.dim);
    const eq = p.equip[b.slot];
    if (eq && eq !== it) {
      line(''); line('vs equipped:', HC.dim);
      const a = statsOf(it), c = statsOf(eq), keys = STAT_ORDER.concat(Object.keys(a), Object.keys(c)).filter((k, i, arr) => arr.indexOf(k) === i);
      let any = false;
      for (const k of keys) { const d = (a[k] || 0) - (c[k] || 0); if (Math.abs(d) < 1e-3) continue; any = true; line(fmtStat(k, d), (k === 'cdr' ? d > 0 : d > 0) ? '#6ee36e' : '#ff5a7a'); }
      if (!any) line('no change', HC.dim);
    } else if (eq === it) { line(''); line('Equipped', HC.gold); }
  }
  let yy = y + 10;
  for (const l of L) { if (!l.s) { yy += 6; continue; } yy = wrap(ctx, l.s, x + 10, yy, w - 20, l.size, l.col, l.size > 8 ? 22 : 13); if (yy > y + h - 12) break; }
}
// the skill-choice screen (was the loadout): weapon skill options, armour skills, free character skills
function drawSkillsTab(ctx, X, Y, W, H) {
  const p = G.player;
  let tip = null;
  const w = item('weapon', p.gear.weapon), SX = X + 40;
  T(ctx, `${w.name.toUpperCase()} SKILLS`, SX, Y + 64, 8, '#ffe08a');
  ['q', 'e', 'r'].forEach((slot, r) => {
    const ry = Y + 84 + r * 80;
    T(ctx, slot.toUpperCase() + (slot === 'r' ? '  (ultimate)' : ''), SX, ry, 8, HC.dim);
    w[slot].forEach((id, i) => {
      const sk = SKILLS[id], bx = SX + i * 150, by = ry + 14, sel = p.wsk[w.id][slot] === id;
      const hov = btn(ctx, bx, by, 142, 56, () => { p.wsk[w.id][slot] = id; });
      ctx.fillStyle = sel ? 'rgba(255,211,90,0.18)' : hov ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 142, 56);
      ctx.strokeStyle = sel ? HC.gold : hov ? HC.line : HC.dark; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 142, 56);
      drawIcon(ctx, skillIcon(id), bx + 8, by + 8, 40);
      wrap(ctx, sk.name, bx + 54, by + 12, 84, 8, sel ? HC.gold : HC.text, 14);
      if (hov) tip = { t: sk.name, d: `${sk.desc}  (${sk.mp || 0} MP, ${sk.cd}s, ${sk.element})` };
    });
  });
  const ay = Y + 84 + 3 * 80;
  T(ctx, 'FROM ARMOUR', SX, ay, 8, HC.dim);
  [['F', 'chest'], ['C', 'head'], ['SHF', 'boots']].forEach(([k, slot], i) => {
    const id = item(slot, p.gear[slot]).skill, sk = SKILLS[id], bx = SX + i * 100, by = ay + 14;
    const hov = btn(ctx, bx, by, 92, 56, () => {});
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 92, 56); ctx.strokeStyle = '#8fb0ff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 92, 56);
    drawIcon(ctx, skillIcon(id), bx + 6, by + 8, 40); T(ctx, k, bx + 70, by + 24, 8, '#8fb0ff', 'center');
    if (hov) tip = { t: sk.name, d: `${sk.desc}  (${sk.element})` };
  });
  const CX = X + 520;
  T(ctx, 'CHARACTER SKILLS', CX, Y + 64, 8, '#ffb0e0');
  T(ctx, 'pick any 3', CX, Y + 80, 8, HC.dim);
  CHAR_SKILLS.forEach((id, i) => {
    const sk = SKILLS[id], bx = CX + (i % 2) * 190, by = Y + 98 + Math.floor(i / 2) * 72, idx = p.csk.indexOf(id);
    const hov = btn(ctx, bx, by, 180, 62, () => toggleCharSkill(id));
    ctx.fillStyle = idx >= 0 ? 'rgba(255,176,224,0.18)' : hov ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 180, 62);
    ctx.strokeStyle = idx >= 0 ? '#ffb0e0' : hov ? HC.line : HC.dark; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 180, 62);
    drawIcon(ctx, skillIcon(id), bx + 8, by + 11, 40);
    wrap(ctx, sk.name, bx + 56, by + 14, 116, 8, idx >= 0 ? '#ffb0e0' : HC.text, 14);
    if (idx >= 0) T(ctx, `[${idx + 1}]`, bx + 172, by + 46, 8, '#ffffff', 'right');
    if (hov) tip = { t: sk.name, d: `${sk.desc}  (${sk.mp || 0} MP, ${sk.cd}s, ${sk.element})` };
  });
  const ty = Y + H - 76;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + 20, ty, W - 40, 60);
  if (tip) { T(ctx, tip.t, X + 32, ty + 10, 8, HC.gold); wrap(ctx, tip.d, X + 32, ty + 28, W - 70, 8, HC.text, 14); }
  else T(ctx, G.touch ? 'Tap skills to choose them. X to close.' : 'Hover anything for details. TAB to close.', X + 32, ty + 24, 8, HC.dim);
}
function toggleCharSkill(id) {
  const p = G.player, i = p.csk.indexOf(id);
  if (i >= 0) p.csk.splice(i, 1);
  else if (p.csk.length < 3) p.csk.push(id);
  else p.csk[2] = id;
}

function drawTitle(ctx) {
  ctx.fillStyle = 'rgba(10,4,24,0.35)'; ctx.fillRect(0, 0, DW, DH);
  const y = 140 + Math.sin(G.t * 1.2) * 4;
  T(ctx, 'MY DREAMY RPG', DW / 2 + 3, y + 3, 32, '#3a1a5a', 'center', false);
  T(ctx, 'MY DREAMY RPG', DW / 2, y, 32, '#ffe6f6', 'center', false);
  T(ctx, 'a high-fantasy dream above the clouds', DW / 2, y + 52, 8, '#ffd6ec', 'center');
  const s = G.save, bw = 300, bx = DW / 2 - bw / 2;
  const button = (by, h, label, sub, fn, gold) => {
    const hov = btn(ctx, bx, by, bw, h, fn);
    panel(ctx, bx, by, bw, h, hov || gold);
    T(ctx, label, DW / 2, by + (sub ? 9 : h / 2 - 4), sub ? 16 : 8, hov || gold ? HC.gold : HC.text, 'center');
    if (sub) T(ctx, sub, DW / 2, by + 32, 8, HC.dim, 'center');
  };
  if (s) {
    button(286, 48, 'CONTINUE', `Lv ${s.level}  ·  ${(G.world.maps[s.map] || {}).name || ''}`, () => continueGame(s), true);
    const sure = G.ui.confirmNew > G.t;
    button(344, 30, sure ? 'CLICK AGAIN TO ERASE SAVE' : 'NEW GAME', '', () => { if (sure) newGame(); else G.ui.confirmNew = G.t + 3; });
  } else {
    if (Math.sin(G.t * 3) > -0.4) T(ctx, TOUCH_CAPABLE ? 'TAP TO BEGIN' : 'CLICK TO BEGIN', DW / 2, 300, 16, HC.gold, 'center');
    button(336, 30, 'NEW GAME', '', () => newGame());
  }
  T(ctx, TOUCH_CAPABLE ? 'left thumb moves · hold the big button to attack · tap or drag skills to cast'
    : 'WASD move · mouse aim · click attack · Q E R F C SHIFT 1 2 3 skills · 4 potion · TAB inventory', DW / 2, DH - 40, 8, HC.text, 'center');
  if (TOUCH_CAPABLE && window.innerHeight > window.innerWidth) T(ctx, 'Turn your device sideways for the best view', DW / 2, 400, 8, '#ffb0e0', 'center');
}
