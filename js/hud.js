'use strict';
// ---------------------------------------------------------------------------
// HUD (drawn at 960x540 over the upscaled scene) — layout follows the sketch:
// name plate + gear/buff icons, portrait with HP/MP/stamina bars bottom-left,
// diamond compass minimap bottom-right with the "!" toward the NE rift.
// Also: skill bar, loadout screen, banners, boss bar, damage numbers.
// ---------------------------------------------------------------------------
const FONT = '"Press Start 2P", "Courier New", monospace';
const UI = { line: '#c7a8ff', dark: '#5d4a8a', bg: 'rgba(18,10,36,0.82)', gold: '#ffd35a', text: '#f4ecff', dim: '#a99cc8' };

function T(ctx, s, x, y, size = 8, col = UI.text, align = 'left', sh = true) {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (sh) { ctx.fillStyle = 'rgba(10,4,20,0.9)'; ctx.fillText(s, x + Math.max(1, size / 8), y + Math.max(1, size / 8)); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(ctx, s, x, y, w, size = 8, col = UI.text, lh = 14) {
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
  ctx.fillStyle = UI.bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hi ? UI.gold : UI.dark; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
  ctx.fillStyle = hi ? '#fff2b0' : UI.line; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + 2, 1, h - 4);
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
function iconAt(ctx, glyph, color, x, y, s = 32) { ctx.imageSmoothingEnabled = false; ctx.drawImage(icon(glyph, color), x, y, s, s); }

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
  ctx.strokeStyle = UI.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(CX, CY - R - 6); ctx.lineTo(CX + R + 6, CY); ctx.lineTo(CX, CY + R + 6); ctx.lineTo(CX - R - 6, CY); ctx.closePath(); ctx.stroke();
  const mp = (x, y) => [CX - 62 + m.mini.cx + (x - y) * m.mini.s, CY - 62 + m.mini.cy + (x + y) * m.mini.s];
  for (const e of G.enemies) { if (e.dummy) continue; const [ex, ey] = mp(e.x, e.y); ctx.fillStyle = e.boss ? '#ff3a7a' : '#ff8aa8'; const s = e.boss ? 6 : 3; ctx.fillRect(Math.round(ex - s / 2), Math.round(ey - s / 2), s, s); }
  if (m.portal && (m.id === 'vale' || m.portalOpen)) {
    const [qx, qy] = mp(m.portal.x, m.portal.y);
    if (Math.sin(G.t * 6) > -0.3) { T(ctx, '!', Math.round(qx), Math.round(qy) - 10, 16, UI.gold, 'center'); }
  }
  const [px, py] = mp(p.x, p.y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
  ctx.fillStyle = '#ff5a9a'; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
  T(ctx, 'N', CX, CY - R - 22, 8, UI.gold, 'center');
  T(ctx, 'S', CX, CY + R + 12, 8, UI.text, 'center');
  T(ctx, 'E', CX + R + 16, CY - 4, 8, UI.text, 'center');
  T(ctx, 'W', CX - R - 16, CY - 4, 8, UI.text, 'center');
}

// ===== main HUD =====================================================================
function drawHUD(ctx) {
  const p = G.player, m = G.map;
  G.ui.btns = [];
  ctx.imageSmoothingEnabled = false;
  // floating damage numbers
  for (const t of G.texts) {
    const [vx, vy] = worldToView(t.x, t.y, t.z);
    const k = t.t / 0.9, x = (vx + t.vx * t.t * 20) * 2, y = (vy - t.t * 26) * 2;
    ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
    T(ctx, t.s, x, y, t.big ? 16 : 8, t.col, 'center');
    ctx.globalAlpha = 1;
  }
  if (G.state === 'title') { drawTitle(ctx); return; }

  // ---- top-left: area + objective ----
  panel(ctx, 16, 14, 300, 54);
  T(ctx, m.name, 28, 24, 8, UI.gold);
  T(ctx, objective(), 28, 42, 8, UI.text);

  // ---- name plate + gear/buff icons (sketch: bar above portrait, icons to its right) ----
  const BY = DH - 148;
  panel(ctx, 16, BY, 214, 26);
  T(ctx, `${p.name}`, 28, BY + 9, 8, '#ffffff');
  T(ctx, `Lv ${p.level} Dreamwalker`, 222, BY + 9, 8, UI.dim, 'right');
  let ix = 240;
  for (const slot of ['weapon', 'chest', 'head', 'boots']) { const it = item(slot, p.gear[slot]); iconAt(ctx, it.icon, it.color, ix, BY - 3, 28); ix += 32; }
  ix += 6;
  for (const id in p.buffs) {
    const b = BUFFS[id]; if (!b) continue;
    iconAt(ctx, b.icon, b.color, ix, BY - 3, 28);
    const f = p.buffs[id].t / p.buffs[id].max;
    ctx.fillStyle = '#0a0614'; ctx.fillRect(ix, BY + 27, 28, 3); ctx.fillStyle = b.color; ctx.fillRect(ix, BY + 27, Math.round(28 * f), 3);
    ix += 32;
  }

  // ---- portrait ----
  const PY = DH - 112;
  panel(ctx, 16, PY, 96, 96);
  const g = ctx.createLinearGradient(0, PY, 0, PY + 96); g.addColorStop(0, m.id === 'vale' ? '#f6b2b0' : '#7a1f4f'); g.addColorStop(1, m.id === 'vale' ? '#5d3f98' : '#1f0c33');
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
    T(ctx, 'THE GLOAM WARDEN', DW / 2, y - 16, 8, '#ffb0e0', 'center');
    bar(ctx, x, y, w, 16, b.hp / b.maxHp, '#b0306e', '#ff7ae0', b.phase2 ? 'ENRAGED' : '');
  }
  if (G.arena && G.arena.phase === 'wave') { if (G.touch) T(ctx, `Enemies left: ${G.enemies.length}`, 28, 78, 8, '#ffb0e0'); else T(ctx, `Enemies left: ${G.enemies.length}`, DW - 20, 22, 8, '#ffb0e0', 'right'); }

  // ---- banner / messages ----
  if (G.banner && G.banner.t > 0) {
    const a = Math.min(1, G.banner.t, (G.banner.max || 3) - G.banner.t + 1);
    ctx.globalAlpha = clamp(a, 0, 1);
    T(ctx, G.banner.s, DW / 2, 150, G.banner.boss ? 24 : 24, G.banner.boss ? '#ff7ae0' : UI.gold, 'center');
    if (G.banner.sub) T(ctx, G.banner.sub, DW / 2, 186, 8, UI.text, 'center');
    ctx.globalAlpha = 1;
  }
  if (G.msg && G.msg.t > 0) { ctx.globalAlpha = Math.min(1, G.msg.t * 2); T(ctx, G.msg.s, DW / 2, DH - 170, 8, '#ffe6f0', 'center'); ctx.globalAlpha = 1; }
  if (m.id === 'vale' && dist(p.x, p.y, m.portal.x, m.portal.y) < 3.2 && G.state === 'play') T(ctx, 'A rift hums with nightmare... step in to cross over', DW / 2, DH - 190, 8, '#e2c8ff', 'center');

  if (G.touch) { if (G.state === 'play' && !G.ui.open) drawTouchControls(ctx); }
  else T(ctx, 'TAB loadout   H help   M sound', DW - 20, 80, 8, 'rgba(244,236,255,0.6)', 'right', false);
  if (G.ui.help) drawHelp(ctx);
  if (G.ui.open) drawLoadout(ctx);
  if (G.state === 'dead') {
    ctx.fillStyle = `rgba(20,6,30,${Math.min(0.7, G.deadT * 0.5)})`; ctx.fillRect(0, 0, DW, DH);
    if (G.deadT > 1) { T(ctx, 'You drift out of the dream...', DW / 2, 220, 16, '#ffb0e0', 'center'); T(ctx, (G.touch ? 'Tap' : 'Click') + ' to dream again', DW / 2, 260, 8, UI.text, 'center'); }
  }
}

function objective() {
  const m = G.map, A = G.arena;
  if (m.id === 'vale') return 'Explore. A rift hums to the NE.';
  if (!A) return '';
  if (A.phase === 'intro') return 'Brace yourself...';
  if (A.phase === 'wave' || A.phase === 'break') return `Survive the waves (${A.wave + 1}/${WAVES.length})`;
  if (A.phase === 'bossIntro' || A.phase === 'boss') return 'Defeat the Gloam Warden';
  return 'Return through the rift (W)';
}

const SLOT_LABEL = { lmb: 'LMB', q: 'Q', e: 'E', r: 'R', f: 'F', c: 'C', shift: 'SHF', 1: '1', 2: '2', 3: '3' };
function drawSkillBar(ctx) {
  const p = G.player, w = item('weapon', p.gear.weapon);
  const slots = ['lmb', 'q', 'e', 'r', '|', 'f', 'c', 'shift', '|', '1', '2', '3'];
  let x = 374; const y = DH - 60;
  panel(ctx, x - 8, y - 8, 410, 56);
  let hoverSkill = null;
  for (const s of slots) {
    if (s === '|') { x += 10; continue; }
    const id = s === 'lmb' ? null : slotSkill(p, s);
    const sk = id ? SKILLS[id] : null;
    ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 1, y - 1, 38, 38);
    if (s === 'lmb') iconAt(ctx, w.icon, w.color, x + 2, y + 2);
    else if (sk) iconAt(ctx, sk.icon, sk.color, x + 2, y + 2);
    if (sk) {
      const cd = p.cds[id] || 0;
      if (cd > 0) { const f = cd / sk.cd; ctx.fillStyle = 'rgba(10,4,20,0.72)'; ctx.fillRect(x + 2, y + 2, 32, Math.round(32 * f)); T(ctx, cd >= 1 ? Math.ceil(cd) + '' : cd.toFixed(1), x + 18, y + 14, 8, '#ffffff', 'center'); }
      else if ((sk.mp || 0) > p.mp || (sk.st || 0) > p.st) { ctx.fillStyle = 'rgba(40,60,160,0.55)'; ctx.fillRect(x + 2, y + 2, 32, 32); }
    }
    if (G.lastCast && G.lastCast.slot === s && G.lastCast.t > 0) { ctx.fillStyle = `rgba(255,255,255,${G.lastCast.t * 2})`; ctx.fillRect(x + 2, y + 2, 32, 32); }
    const isUlt = s === 'r';
    ctx.strokeStyle = isUlt ? UI.gold : (s === 'f' || s === 'c' || s === 'shift' ? '#8fb0ff' : (/\d/.test(s) ? '#ffb0e0' : UI.line));
    ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 38, 38);
    T(ctx, SLOT_LABEL[s], x, y - 2, 8, '#ffffff');
    if (G.mouse.dx >= x && G.mouse.dx < x + 36 && G.mouse.dy >= y && G.mouse.dy < y + 36) hoverSkill = sk ? sk : { name: w.basic.name, desc: `Basic attack of the ${w.name}.`, cd: w.basic.rate };
    x += 38;
  }
  if (hoverSkill && !G.ui.open) {
    const tx = 374, ty = DH - 152;
    panel(ctx, tx, ty, 300, 82);
    T(ctx, hoverSkill.name, tx + 10, ty + 10, 8, UI.gold);
    const costs = [hoverSkill.mp ? `${hoverSkill.mp} MP` : '', hoverSkill.st ? `${hoverSkill.st} ST` : '', `CD ${hoverSkill.cd}s`].filter(Boolean).join('  ');
    T(ctx, costs, tx + 290, ty + 10, 8, UI.dim, 'right');
    wrap(ctx, hoverSkill.desc, tx + 10, ty + 28, 280, 8, UI.text, 14);
  }
}

function drawHelp(ctx) {
  const x = 230, y = 90, w = 500, h = 300;
  panel(ctx, x, y, w, h, true);
  T(ctx, 'HOW TO PLAY', x + w / 2, y + 16, 16, UI.gold, 'center');
  const lines = G.touch ? [
    ['Left thumb', 'Joystick: move'], ['Big button (hold)', 'Weapon basic attack'], ['Tap a skill', 'Cast at nearest enemy'],
    ['Drag from a skill', 'Aim, release to cast'], ['Q  E  R', 'Weapon skills (R = ultimate)'], ['F  C  SHF', 'Chest / helmet / boots skills'],
    ['1  2  3', 'Character skills (your choice)'], ['GEAR', 'Loadout: swap gear & skills'], ['FULL', 'Fullscreen'], ['Tap', 'Close this help'],
  ] : [
    ['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click (hold)', 'Weapon basic attack'],
    ['Q  E  R', 'Weapon skills (R = ultimate)'], ['F', 'Chest armour skill'], ['C', 'Helmet skill'], ['Shift / Space', 'Boots skill'],
    ['1  2  3', 'Character skills (your choice)'], ['TAB / I', 'Loadout: swap gear & skills'], ['M', 'Toggle sound'],
  ];
  lines.forEach(([k, v], i) => { T(ctx, k, x + 30, y + 52 + i * 20, 8, '#ffe08a'); T(ctx, v, x + 230, y + 52 + i * 20, 8, UI.text); });
  T(ctx, 'Like Albion: you are what you wear. Gear decides', x + 30, y + 262, 8, UI.dim);
  T(ctx, 'Q E R F C SHIFT. Character skills are your pick.', x + 30, y + 278, 8, UI.dim);
}

function drawLoadout(ctx) {
  const p = G.player;
  const X = 70, Y = 30, W = 820, H = 484;
  ctx.fillStyle = 'rgba(8,4,18,0.55)'; ctx.fillRect(0, 0, DW, DH);
  panel(ctx, X, Y, W, H, true);
  T(ctx, 'LOADOUT', X + W / 2, Y + 14, 16, UI.gold, 'center');
  const xh = btn(ctx, X + W - 46, Y + 10, 34, 34, () => { G.ui.open = false; });
  ctx.fillStyle = xh ? 'rgba(255,211,90,0.3)' : 'rgba(0,0,0,0.35)'; ctx.fillRect(X + W - 46, Y + 10, 34, 34);
  T(ctx, 'X', X + W - 29, Y + 19, 16, UI.gold, 'center');
  T(ctx, 'You are what you wear', X + W / 2, Y + 38, 8, UI.dim, 'center');
  let tip = null;
  // --- equipment ---
  T(ctx, 'EQUIPMENT', X + 24, Y + 64, 8, '#ffe08a');
  const rows = [['weapon', 'Weapon'], ['head', 'Helmet'], ['chest', 'Chest'], ['boots', 'Boots']];
  rows.forEach(([slot, label], r) => {
    const ry = Y + 84 + r * 76;
    T(ctx, label, X + 24, ry, 8, UI.dim);
    ITEMS[slot].forEach((it, i) => {
      const bx = X + 24 + i * 74, by = ry + 14, eq = p.gear[slot] === it.id;
      const hov = btn(ctx, bx, by, 66, 52, () => equip(slot, it.id));
      ctx.fillStyle = eq ? 'rgba(255,211,90,0.18)' : hov ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 66, 52);
      ctx.strokeStyle = eq ? UI.gold : hov ? UI.line : UI.dark; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 66, 52);
      iconAt(ctx, it.icon, it.color, bx + 17, by + 4);
      T(ctx, it.name.split(' ')[0], bx + 33, by + 40, 8, eq ? UI.gold : UI.text, 'center');
      if (hov) tip = { t: it.name, d: `${it.desc} ${slot === 'weapon' ? '' : 'Grants: ' + SKILLS[it.skill].name + ' — ' + SKILLS[it.skill].desc}` };
    });
  });
  // --- weapon skills ---
  const w = item('weapon', p.gear.weapon), SX = X + 280;
  T(ctx, `${w.name.toUpperCase()} SKILLS`, SX, Y + 64, 8, '#ffe08a');
  ['q', 'e', 'r'].forEach((slot, r) => {
    const ry = Y + 84 + r * 76;
    T(ctx, slot.toUpperCase() + (slot === 'r' ? '  (ultimate)' : ''), SX, ry, 8, UI.dim);
    w[slot].forEach((id, i) => {
      const sk = SKILLS[id], bx = SX + i * 130, by = ry + 14, sel = p.wsk[w.id][slot] === id;
      const hov = btn(ctx, bx, by, 122, 52, () => { p.wsk[w.id][slot] = id; });
      ctx.fillStyle = sel ? 'rgba(255,211,90,0.18)' : hov ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 122, 52);
      ctx.strokeStyle = sel ? UI.gold : hov ? UI.line : UI.dark; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 122, 52);
      iconAt(ctx, sk.icon, sk.color, bx + 8, by + 10);
      wrap(ctx, sk.name, bx + 46, by + 12, 72, 8, sel ? UI.gold : UI.text, 14);
      if (hov) tip = { t: sk.name, d: `${sk.desc}  (${sk.mp || 0} MP, ${sk.cd}s)` };
    });
  });
  const ay = Y + 84 + 3 * 76;
  T(ctx, 'FROM ARMOUR', SX, ay, 8, UI.dim);
  [['F', 'chest'], ['C', 'head'], ['SHF', 'boots']].forEach(([k, slot], i) => {
    const sk = SKILLS[item(slot, p.gear[slot]).skill], bx = SX + i * 86, by = ay + 14;
    const hov = btn(ctx, bx, by, 80, 52, () => {});
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 80, 52); ctx.strokeStyle = '#8fb0ff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 80, 52);
    iconAt(ctx, sk.icon, sk.color, bx + 6, by + 10); T(ctx, k, bx + 60, by + 22, 8, '#8fb0ff', 'center');
    if (hov) tip = { t: sk.name, d: sk.desc };
  });
  // --- character skills ---
  const CX = X + 560;
  T(ctx, 'CHARACTER SKILLS', CX, Y + 64, 8, '#ffb0e0');
  T(ctx, 'pick any 3', CX, Y + 80, 8, UI.dim);
  CHAR_SKILLS.forEach((id, i) => {
    const sk = SKILLS[id], bx = CX + (i % 2) * 124, by = Y + 98 + Math.floor(i / 2) * 64, idx = p.csk.indexOf(id);
    const hov = btn(ctx, bx, by, 118, 56, () => toggleCharSkill(id));
    ctx.fillStyle = idx >= 0 ? 'rgba(255,176,224,0.18)' : hov ? 'rgba(199,168,255,0.15)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(bx, by, 118, 56);
    ctx.strokeStyle = idx >= 0 ? '#ffb0e0' : hov ? UI.line : UI.dark; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 118, 56);
    iconAt(ctx, sk.icon, sk.color, bx + 6, by + 12);
    wrap(ctx, sk.name, bx + 44, by + 12, 70, 8, idx >= 0 ? '#ffb0e0' : UI.text, 14);
    if (idx >= 0) T(ctx, `[${idx + 1}]`, bx + 112, by + 40, 8, '#ffffff', 'right');
    if (hov) tip = { t: sk.name, d: `${sk.desc}  (${sk.mp || 0} MP, ${sk.cd}s)` };
  });
  // --- tooltip ---
  const ty = Y + H - 70;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + 20, ty, W - 40, 56);
  if (tip) { T(ctx, tip.t, X + 32, ty + 10, 8, UI.gold); wrap(ctx, tip.d, X + 32, ty + 28, W - 70, 8, UI.text, 14); }
  else T(ctx, G.touch ? 'Tap gear or skills to equip them. X to close.' : 'Hover anything for details. TAB to close.', X + 32, ty + 22, 8, UI.dim);
}
function equip(slot, id) {
  const p = G.player;
  if (p.gear[slot] === id) return;
  p.gear[slot] = id; recalcStats(p, false); sfx('shield');
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
  if (Math.sin(G.t * 3) > -0.4) T(ctx, TOUCH_CAPABLE ? 'TAP TO BEGIN' : 'CLICK TO BEGIN', DW / 2, 330, 16, UI.gold, 'center');
  T(ctx, TOUCH_CAPABLE ? 'left thumb moves · hold the big button to attack · tap or drag skills to cast'
    : 'WASD move · mouse aim · click attack · Q E R F C SHIFT 1 2 3 skills · TAB loadout', DW / 2, DH - 40, 8, UI.text, 'center');
  if (TOUCH_CAPABLE && window.innerHeight > window.innerWidth) T(ctx, 'Turn your device sideways for the best view', DW / 2, 380, 8, '#ffb0e0', 'center');
}
