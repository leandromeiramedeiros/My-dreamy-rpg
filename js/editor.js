'use strict';
// ---------------------------------------------------------------------------
// Dreamy Editor — edits the WORLD_DATA in js/world.js:
//   MAP    paint tiles, sculpt heights, place props, start point and portals, new maps
//   LOGIC  WHEN … THEN … trigger cards per map (waves, messages, portals, boss…)
//   TUNING player / enemy / skill numbers
// Drafts autosave in this browser; Play-test opens the game on the draft; Publish
// commits js/world.js to GitHub (Pages then redeploys the live game).
// It reuses the game's own art + map builder, so what you see is what you play.
// ---------------------------------------------------------------------------
const $ = s => document.querySelector(s);
const CV = $('#cv'), cx = CV.getContext('2d');
const DRAFT_KEY = 'dreamy.world.draft', GH_KEY = 'dreamy.github';
const TILE_COLORS = { g: '#4a9a63', f: '#7cc47a', p: '#cbc4e4', w: '#4a8fd0', b: '#a87a5c', s: '#9a92c0', x: '#4d4570', r: '#7a5ab0', d: '#2d5647', c: '#8a80b0', '.': '#0a0614' };
const ENEMY_CHOICES = ['slime', 'wisp', 'hound', 'dummy'];
const SOUNDS = ['portal', 'roar', 'boom', 'heal', 'arcane', 'shield', 'zap', 'veil'];
const MAX_H = 12;
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6];
const BASE_ENEMY = JSON.parse(JSON.stringify(ENEMY));
const BASE_SKILL = Object.fromEntries(Object.entries(SKILLS).map(([k, s]) => [k, { cd: s.cd, mp: s.mp || 0, st: s.st || 0 }]));
const BASE_PLAYER = Object.assign({}, G.tune.player);

const ED = {
  world: null, mapId: null, m: null, tab: 'map', tool: 'select', tile: 'g', hmode: 'raise', hlevel: 4, brush: 1,
  objType: 'tree_round', objV: -1, sel: null, zoom: 2, panX: 0, panY: 0, undo: [], redo: [], cur: '',
  grid: false, hover: null, pick: null, drag: null, stroke: null, pan: null, space: false,
};
const D = () => ED.world.maps[ED.mapId];

// ===== tiny DOM helper ========================================================
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.innerHTML = msg; t.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, ms);
}

// ===== tile helpers ==========================================================
const tileCh = (d, x, y) => (d.tiles[y] || '')[x] || '.';
const tileHt = (d, x, y) => parseInt((d.heights[y] || '')[x] || '0', 36) || 0;
function setCh(arr, x, y, ch) { const r = arr[y]; arr[y] = r.slice(0, x) + ch + r.slice(x + 1); }
function setTile(d, x, y, ch) {
  if (x < 0 || y < 0 || x >= d.W || y >= d.H) return;
  setCh(d.tiles, x, y, ch);
  if (ch === '.') setCh(d.heights, x, y, '0');
  if (ch === 'c' && tileHt(d, x, y) < 2) setCh(d.heights, x, y, '6');
}
function setHeight(d, x, y, v) {
  if (x < 0 || y < 0 || x >= d.W || y >= d.H || tileCh(d, x, y) === '.') return;
  setCh(d.heights, x, y, clamp(v, 0, MAX_H).toString(36));
}

// ===== history + draft ======================================================
function commit(full) {
  ED.undo.push(ED.cur); if (ED.undo.length > 100) ED.undo.shift();
  ED.redo = []; ED.cur = JSON.stringify(ED.world);
  saveDraft();
  if (full !== undefined) rebuild(full);
}
function undo() {
  if (!ED.undo.length) return;
  ED.redo.push(ED.cur); ED.cur = ED.undo.pop(); ED.world = JSON.parse(ED.cur);
  if (!ED.world.maps[ED.mapId]) ED.mapId = ED.world.start;
  ED.sel = null; saveDraft(); refreshAll(true);
}
function redo() {
  if (!ED.redo.length) return;
  ED.undo.push(ED.cur); ED.cur = ED.redo.pop(); ED.world = JSON.parse(ED.cur);
  ED.sel = null; saveDraft(); refreshAll(true);
}
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, ED.cur); $('#stSave').innerHTML = '<span class="warn">●</span> Draft saved in this browser — not published yet'; }
  catch (e) { $('#stSave').textContent = 'Could not save draft: ' + e.message; }
}
const worldSource = w => "'use strict';\n// The game world: maps, triggers (logic) and tuning. Edit it visually with editor.html,\n// which can publish straight back to this file on GitHub.\nconst WORLD_DATA = " + JSON.stringify(w, null, 1) + ';\n';

// ===== runtime map (for drawing) ==========================================
function rebuild(full) {
  const d = D();
  for (const id in ED.world.maps) THEME_OF[id] = ED.world.maps[id].theme;
  if (full || !ED.m || ED.m.id !== ED.mapId) {
    ED.m = buildMapFromData(ED.mapId, d);
  } else {
    ED.m.start = { x: d.start.x, y: d.start.y };
    ED.m.portals = (d.portals || []).map(p => Object.assign({}, p, { z: tileH(ED.m, p.x, p.y) }));
    placeObjects(ED.m, d);
  }
  ED.stroke = null;
  draw();
}
function refreshAll(full) { fillMapSelect(); rebuild(full); renderPanel(); }

// ===== camera ===============================================================
function fitView() {
  const d = D(), cw = CV.width, ch = CV.height;
  const ww = (d.W + d.H) * 16 + 40, wh = (d.W + d.H) * 8 + 140;
  const z = Math.min(cw / ww, ch / wh);
  ED.zoom = ZOOMS.reduce((a, b) => (b <= z ? b : a), ZOOMS[0]);
  ED.panX = cw / 2 - ED.zoom * (d.W - d.H) * 8;
  ED.panY = ch / 2 - ED.zoom * ((d.W + d.H) * 4 + 30);
}
const toWS = (mx, my) => [(mx - ED.panX) / ED.zoom, (my - ED.panY) / ED.zoom];
function pickTile(mx, my) {
  const d = D(), [sx, sy] = toWS(mx, my);
  let best = null;
  for (let hh = 0; hh <= MAX_H; hh++) {
    const [wx, wy] = toWorld(sx, sy + hh * ZS), tx = Math.floor(wx), ty = Math.floor(wy);
    if (tx < 0 || ty < 0 || tx >= d.W || ty >= d.H || tileHt(d, tx, ty) !== hh) continue;
    if (!best || tx + ty > best.x + best.y) best = { x: tx, y: ty, wx, wy, h: hh };
  }
  return best;
}
function pickObject(mx, my) {
  const [sx, sy] = toWS(mx, my), m = ED.m;
  const d = D();
  if (Math.hypot(sx - isoX(d.start.x, d.start.y), sy - (isoY(d.start.x, d.start.y, tileH(m, d.start.x, d.start.y)) - 10)) < 9) return { kind: 'start' };
  const objs = m.objects.slice().sort((a, b) => b.key - a.key);
  for (const o of objs) {
    const ox = isoX(o.x, o.y), oy = isoY(o.x, o.y, o.z);
    if (o.kind === 'portal') { if (Math.hypot(sx - ox, (sy - (oy - 22)) * 0.7) < 16) return { kind: 'portal', index: d.portals.findIndex(p => p.x === o.portal.x && p.y === o.portal.y) }; continue; }
    if (sx >= ox - o.ax && sx < ox - o.ax + o.img.width && sy >= oy - o.ay && sy < oy - o.ay + o.img.height) return { kind: 'obj', index: d.objects.indexOf(o.src) };
  }
  return null;
}

// ===== drawing ==================================================================
function diamond(x, y, z) {
  cx.beginPath();
  cx.moveTo(isoX(x, y), isoY(x, y, z)); cx.lineTo(isoX(x + 1, y), isoY(x + 1, y, z));
  cx.lineTo(isoX(x + 1, y + 1), isoY(x + 1, y + 1, z)); cx.lineTo(isoX(x, y + 1), isoY(x, y + 1, z)); cx.closePath();
}
function ring(x, y, z, r) {
  cx.beginPath();
  for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2, X = isoX(x + Math.cos(a) * r, y + Math.sin(a) * r), Y = isoY(x + Math.cos(a) * r, y + Math.sin(a) * r, z); i ? cx.lineTo(X, Y) : cx.moveTo(X, Y); }
}
let drawQueued = false;
function draw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(() => { drawQueued = false; drawNow(); }); } }
function drawNow() {
  const m = ED.m, d = D(); if (!m) return;
  const th = THEMES[d.theme] || THEMES.vale;
  cx.setTransform(1, 0, 0, 1, 0, 0);
  const g = cx.createLinearGradient(0, 0, 0, CV.height);
  th.sky.forEach((c, i) => g.addColorStop(i / (th.sky.length - 1), c));
  cx.fillStyle = g; cx.fillRect(0, 0, CV.width, CV.height);
  cx.setTransform(ED.zoom, 0, 0, ED.zoom, ED.panX, ED.panY);
  cx.imageSmoothingEnabled = false;
  cx.drawImage(m.ground, m.gox, m.goy);
  const labels = [];
  const items = m.columns.concat(m.objects).sort((a, b) => a.key - b.key);
  for (const it of items) {
    if (it.kind === 'column') { cx.drawImage(it.img, it.sx, it.sy); continue; }
    const X = isoX(it.x, it.y), Y = isoY(it.x, it.y, it.z);
    if (it.kind === 'portal') {
      const P = it.portal;
      cx.strokeStyle = P.open ? '#c79bff' : '#6a5a8a'; cx.lineWidth = 2 / ED.zoom * 1.5;
      cx.beginPath(); cx.ellipse(X, Y - 22, 9, 15, 0, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = P.open ? 'rgba(199,155,255,0.35)' : 'rgba(80,60,110,0.3)'; cx.fill();
      labels.push([X, Y - 42, '→ ' + ((ED.world.maps[P.to] || {}).name || P.to + ' (missing!)') + (P.open ? '' : ' (closed)'), ED.world.maps[P.to] ? '#e2c8ff' : '#ff6b8a']);
      continue;
    }
    if (it.flip) { cx.save(); cx.translate(X, 0); cx.scale(-1, 1); cx.drawImage(it.img, -it.ax, Y - it.ay); cx.restore(); }
    else cx.drawImage(it.img, X - it.ax, Y - it.ay);
  }
  // pending stroke preview (before the ground is re-rasterised)
  if (ED.stroke) for (const k of ED.stroke.touched) {
    const [x, y] = k.split(',').map(Number), ch = tileCh(d, x, y);
    diamond(x, y, tileHt(d, x, y)); cx.fillStyle = ch === '.' ? 'rgba(10,6,20,0.85)' : rgba(TILE_COLORS[ch] || '#ff00ff', 0.85); cx.fill();
  }
  const lw = 1 / ED.zoom;
  if (ED.grid) {
    cx.strokeStyle = 'rgba(255,255,255,0.18)'; cx.lineWidth = lw;
    for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) if (tileCh(d, x, y) !== '.') { diamond(x, y, tileHt(d, x, y)); cx.stroke(); }
  }
  // logic overlays: areas, spawn points
  for (const tr of d.triggers || []) {
    const w = tr.when || {};
    if (w.type === 'enter_area' && w.x !== '' && w.x != null) {
      cx.strokeStyle = '#8fb0ff'; cx.lineWidth = 2 * lw; cx.setLineDash([4 * lw, 3 * lw]); ring(+w.x, +w.y, tileH(m, +w.x, +w.y), +w.r || 1); cx.stroke(); cx.setLineDash([]);
      labels.push([isoX(+w.x, +w.y), isoY(+w.x, +w.y, tileH(m, +w.x, +w.y)) + 4, '⚑ ' + (tr.name || tr.id), '#cfe0ff']);
    }
    for (const a of tr.actions || []) if ((a.type === 'spawn' || a.type === 'spawn_boss') && a.x !== '' && a.x != null) {
      cx.strokeStyle = a.type === 'spawn_boss' ? '#ff7ae0' : '#ff8aa8'; cx.lineWidth = 2 * lw; ring(+a.x, +a.y, tileH(m, +a.x, +a.y), +a.radius || 0.4); cx.stroke();
      labels.push([isoX(+a.x, +a.y), isoY(+a.x, +a.y, tileH(m, +a.x, +a.y)) + 4, (a.type === 'spawn_boss' ? 'boss' : (a.enemy || 'slime') + ' ×' + (a.count || 1)), '#ffb0c0']);
    }
  }
  // start point
  const sx = isoX(d.start.x, d.start.y), sy = isoY(d.start.x, d.start.y, tileH(m, d.start.x, d.start.y));
  cx.fillStyle = '#ffd35a'; cx.fillRect(sx - 0.5, sy - 16, 1.5, 16);
  cx.beginPath(); cx.moveTo(sx + 1, sy - 16); cx.lineTo(sx + 9, sy - 13); cx.lineTo(sx + 1, sy - 10); cx.fill();
  labels.push([sx, sy + 4, 'START', '#ffd35a']);
  // selection
  if (ED.sel) {
    cx.strokeStyle = '#ffd35a'; cx.lineWidth = 2 * lw;
    if (ED.sel.kind === 'obj') { const o = m.objects.find(o => o.src === d.objects[ED.sel.index]); if (o) cx.strokeRect(isoX(o.x, o.y) - o.ax - 1, isoY(o.x, o.y, o.z) - o.ay - 1, o.img.width + 2, o.img.height + 2); }
    if (ED.sel.kind === 'portal') { const p = d.portals[ED.sel.index]; if (p) { const z = tileH(m, p.x, p.y); cx.strokeRect(isoX(p.x, p.y) - 13, isoY(p.x, p.y, z) - 41, 26, 40); } }
  }
  // hover + brush footprint
  const hv = ED.hover;
  if (hv && !ED.pan) {
    const paint = ED.tool === 'tile' || ED.tool === 'height', b = paint ? ED.brush : 1, o = Math.floor((b - 1) / 2);
    cx.strokeStyle = ED.pick ? '#8fb0ff' : '#ffffff'; cx.lineWidth = 1.5 * lw;
    for (let y = hv.y - o; y < hv.y - o + b; y++) for (let x = hv.x - o; x < hv.x - o + b; x++) if (x >= 0 && y >= 0 && x < d.W && y < d.H) { diamond(x, y, tileHt(d, x, y)); cx.stroke(); }
  }
  // labels in screen space
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.font = '600 11px Nunito, sans-serif'; cx.textAlign = 'center';
  for (const [x, y, s, c] of labels) {
    const X = x * ED.zoom + ED.panX, Y = y * ED.zoom + ED.panY;
    cx.fillStyle = 'rgba(10,6,20,0.75)'; const w = cx.measureText(s).width + 8; cx.fillRect(X - w / 2, Y - 9, w, 15);
    cx.fillStyle = c; cx.fillText(s, X, Y + 2);
  }
}

// ===== tools ========================================================================
const TOOLS = [
  ['select', 'Select / move', 'V'], ['tile', 'Paint tiles', 'B'], ['height', 'Height', 'H'],
  ['object', 'Place prop', 'O'], ['erase', 'Erase prop', 'E'], ['start', 'Start point', 'S'], ['portal', 'Portal', 'P'],
];
const TOOL_HINT = {
  select: 'Click a prop, portal or the START flag to select it; drag to move. Delete removes.',
  tile: 'Click/drag to paint. Pillars become tall columns; Void removes ground.',
  height: 'Click/drag to sculpt. Height steps of 1 are walkable (stairs); bigger jumps are cliffs.',
  object: 'Click to place the chosen prop. The cottage snaps to a 2×2 footprint.',
  erase: 'Click a prop or portal to remove it.',
  start: 'Click where the hero appears when entering this map.',
  portal: 'Click to place a rift. Select it to choose where it leads.',
};
function setTool(t) { ED.tool = t; ED.pick = null; renderPanel(); draw(); $('#stTool').innerHTML = '<b>' + TOOLS.find(x => x[0] === t)[1] + '</b>'; $('#stHint').textContent = TOOL_HINT[t]; }

function applyBrush(tile) {
  const d = D(), b = ED.brush, o = Math.floor((b - 1) / 2), S = ED.stroke;
  for (let y = tile.y - o; y < tile.y - o + b; y++) for (let x = tile.x - o; x < tile.x - o + b; x++) {
    if (x < 0 || y < 0 || x >= d.W || y >= d.H) continue;
    const k = x + ',' + y;
    if (ED.tool === 'tile') { setTile(d, x, y, ED.tile); S.touched.add(k); }
    else if (!S.touched.has(k)) {
      const cur = tileHt(d, x, y);
      setHeight(d, x, y, ED.hmode === 'raise' ? cur + 1 : ED.hmode === 'lower' ? cur - 1 : ED.hlevel);
      S.touched.add(k);
    }
  }
  draw();
}

function onDown(ev) {
  CV.setPointerCapture(ev.pointerId);
  const mx = ev.offsetX, my = ev.offsetY;
  if (ev.button === 1 || ev.button === 2 || ED.space) { ED.pan = { mx, my, px: ED.panX, py: ED.panY }; return; }
  if (ev.button !== 0) return;
  const d = D(), t = pickTile(mx, my);
  if (ED.pick) {
    if (t) { const fn = ED.pick; ED.pick = null; fn(Math.round(t.wx * 10) / 10, Math.round(t.wy * 10) / 10); commit(false); renderPanel(); }
    return;
  }
  switch (ED.tool) {
    case 'select': {
      const hit = pickObject(mx, my);
      ED.sel = hit && hit.kind !== 'start' ? hit : null;
      if (hit) ED.drag = { hit, moved: false };
      renderPanel(); draw(); break;
    }
    case 'tile': case 'height':
      if (t) { ED.stroke = { touched: new Set() }; applyBrush(t); }
      break;
    case 'object': {
      if (!t) break;
      const def = OBJ_TYPES[ED.objType], n = def.img().length;
      const o = { t: ED.objType };
      if (def.house) { o.x = Math.round(t.wx - 1); o.y = Math.round(t.wy - 1); if (o.x < 0 || o.y < 0 || o.x > d.W - 2 || o.y > d.H - 2) break; }
      else { o.x = Math.round(t.wx * 20) / 20; o.y = Math.round(t.wy * 20) / 20; const v = ED.objV < 0 ? Math.floor(Math.random() * n) : ED.objV; if (v) o.v = v; if (ED.objV < 0 && Math.random() < 0.5 && !def.grass) o.f = 1; }
      d.objects.push(o); ED.sel = { kind: 'obj', index: d.objects.length - 1 };
      commit(def.house ? true : false); renderPanel(); break;
    }
    case 'erase': {
      const hit = pickObject(mx, my);
      if (hit && hit.kind === 'obj') { d.objects.splice(hit.index, 1); ED.sel = null; commit(false); }
      else if (hit && hit.kind === 'portal') { d.portals.splice(hit.index, 1); ED.sel = null; commit(false); }
      renderPanel(); break;
    }
    case 'start':
      if (t) { d.start = { x: Math.round(t.wx * 10) / 10, y: Math.round(t.wy * 10) / 10 }; commit(false); }
      break;
    case 'portal': {
      if (!t) break;
      const other = Object.keys(ED.world.maps).find(k => k !== ED.mapId) || ED.mapId;
      d.portals.push({ x: Math.round(t.wx * 10) / 10, y: Math.round(t.wy * 10) / 10, to: other, open: true, marker: false });
      ED.sel = { kind: 'portal', index: d.portals.length - 1 }; ED.tool = 'select';
      commit(false); renderPanel(); toast('Portal placed — choose its destination in the panel.'); break;
    }
  }
}
function onMove(ev) {
  const mx = ev.offsetX, my = ev.offsetY;
  if (ED.pan) { ED.panX = ED.pan.px + mx - ED.pan.mx; ED.panY = ED.pan.py + my - ED.pan.my; draw(); return; }
  const t = pickTile(mx, my);
  ED.hover = t;
  $('#stTile').innerHTML = t ? `tile <b>${t.x}, ${t.y}</b> · ${TILE_TYPES[tileCh(D(), t.x, t.y)]} · height <b>${t.h}</b> · point ${t.wx.toFixed(1)}, ${t.wy.toFixed(1)}` : '—';
  if (ED.stroke && (ev.buttons & 1) && t) applyBrush(t);
  if (ED.drag && (ev.buttons & 1)) {
    const d = D(), hit = ED.drag.hit;
    const z = hit.kind === 'obj' ? tileH(ED.m, d.objects[hit.index].x, d.objects[hit.index].y) : 0;
    const [sx, sy] = toWS(mx, my), [wx, wy] = toWorld(sx, sy + z * ZS);
    const target = t ? [t.wx, t.wy] : [wx, wy];
    const snap = ev.shiftKey ? 2 : 20;
    if (hit.kind === 'obj') {
      const o = d.objects[hit.index];
      if (OBJ_TYPES[o.t].house) { o.x = clamp(Math.round(target[0] - 1), 0, d.W - 2); o.y = clamp(Math.round(target[1] - 1), 0, d.H - 2); }
      else { o.x = Math.round(target[0] * snap) / snap; o.y = Math.round(target[1] * snap) / snap; }
    } else if (hit.kind === 'portal') { const p = d.portals[hit.index]; p.x = Math.round(target[0] * 10) / 10; p.y = Math.round(target[1] * 10) / 10; }
    else if (hit.kind === 'start') d.start = { x: Math.round(target[0] * 10) / 10, y: Math.round(target[1] * 10) / 10 };
    ED.drag.moved = true;
    rebuild(false);
    return;
  }
  draw();
}
function onUp() {
  if (ED.pan) { ED.pan = null; return; }
  if (ED.stroke) { ED.stroke = null; commit(true); }
  if (ED.drag) { const moved = ED.drag.moved, house = ED.drag.hit.kind === 'obj' && OBJ_TYPES[D().objects[ED.drag.hit.index].t].house; ED.drag = null; if (moved) { commit(house ? true : undefined); renderPanel(); } }
}
function onWheel(ev) {
  ev.preventDefault();
  const i = ZOOMS.indexOf(ED.zoom), ni = clamp(i + (ev.deltaY < 0 ? 1 : -1), 0, ZOOMS.length - 1);
  if (ni === i) return;
  const nz = ZOOMS[ni], [sx, sy] = toWS(ev.offsetX, ev.offsetY);
  ED.zoom = nz; ED.panX = ev.offsetX - sx * nz; ED.panY = ev.offsetY - sy * nz;
  draw();
}

// ===== side panel ===================================================================
function renderPanel() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ED.tab));
  const P = $('#panel'); P.innerHTML = '';
  if (ED.tab === 'map') renderMapPanel(P);
  else if (ED.tab === 'logic') renderLogicPanel(P);
  else renderTunePanel(P);
}

function thumb(img, w = 40, hgt = 44) {
  const c = document.createElement('canvas'), s = Math.max(1, Math.floor(Math.min(w / img.width, hgt / img.height)));
  c.width = img.width * s; c.height = img.height * s;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height);
  c.style.maxWidth = w + 'px';
  return c;
}
function numIn(val, onchange, attrs = {}) {
  return h('input', Object.assign({ type: 'number', step: 'any', value: val == null ? '' : val, onchange: e => onchange(e.target.value === '' ? '' : +e.target.value) }, attrs));
}

function renderMapPanel(P) {
  const d = D();
  P.append(h('h3', null, 'TOOLS'),
    h('div', { class: 'tools' }, TOOLS.map(([id, label, key]) => h('button', { class: ED.tool === id ? 'on' : '', title: `${label} (${key})`, onclick: () => setTool(id) }, label))),
    h('div', { class: 'hint' }, TOOL_HINT[ED.tool]));
  if (ED.tool === 'tile' || ED.tool === 'height') {
    P.append(h('div', { class: 'row' }, h('label', null, 'Brush'), [1, 2, 3, 5].map(b => h('button', { class: 'mini ' + (ED.brush === b ? 'on' : ''), onclick: () => { ED.brush = b; renderPanel(); } }, b + '×' + b))));
  }
  if (ED.tool === 'tile') {
    P.append(h('h3', null, 'TILE'), h('div', { class: 'swatches' }, Object.entries(TILE_TYPES).map(([k, label]) =>
      h('button', { class: 'sw ' + (ED.tile === k ? 'on' : ''), onclick: () => { ED.tile = k; renderPanel(); } }, h('i', { style: 'background:' + TILE_COLORS[k] }), label))));
  }
  if (ED.tool === 'height') {
    P.append(h('h3', null, 'HEIGHT'), h('div', { class: 'row' },
      ['raise', 'lower', 'set'].map(m => h('button', { class: ED.hmode === m ? 'on' : '', onclick: () => { ED.hmode = m; renderPanel(); } }, m === 'set' ? 'Set to' : m[0].toUpperCase() + m.slice(1))),
      numIn(ED.hlevel, v => { ED.hlevel = clamp(+v || 0, 0, MAX_H); }, { min: 0, max: MAX_H, step: 1 })));
  }
  if (ED.tool === 'object') {
    const def = OBJ_TYPES[ED.objType], n = def.img().length;
    P.append(h('h3', null, 'PROP'), h('div', { class: 'objs' }, Object.entries(OBJ_TYPES).map(([k, def]) =>
      h('button', { class: 'obj ' + (ED.objType === k ? 'on' : ''), title: def.label, onclick: () => { ED.objType = k; ED.objV = -1; renderPanel(); } }, thumb(def.img()[0]), def.label.split(' ')[0]))),
    n > 1 ? h('div', { class: 'row' }, h('label', null, 'Variant'), h('button', { class: 'mini ' + (ED.objV < 0 ? 'on' : ''), onclick: () => { ED.objV = -1; renderPanel(); } }, 'Random'),
      def.img().map((im, i) => h('button', { class: 'mini ' + (ED.objV === i ? 'on' : ''), onclick: () => { ED.objV = i; renderPanel(); } }, String(i + 1)))) : null);
  }
  // selection
  const sel = ED.sel;
  if (sel && sel.kind === 'obj' && d.objects[sel.index]) {
    const o = d.objects[sel.index], def = OBJ_TYPES[o.t], n = def.img().length;
    P.append(h('h3', null, 'SELECTED PROP'),
      h('div', { class: 'row' }, thumb(def.img()[(o.v || 0) % n], 48, 48), h('b', null, def.label)),
      h('div', { class: 'row' }, h('label', null, 'Position'), numIn(o.x, v => { o.x = def.house ? Math.round(+v) : +v; commit(def.house); }), numIn(o.y, v => { o.y = def.house ? Math.round(+v) : +v; commit(def.house); })),
      n > 1 ? h('div', { class: 'row' }, h('label', null, 'Variant'), Array.from({ length: n }, (_, i) => h('button', { class: 'mini ' + ((o.v || 0) === i ? 'on' : ''), onclick: () => { if (i) o.v = i; else delete o.v; commit(false); renderPanel(); } }, String(i + 1)))) : null,
      def.house ? null : h('div', { class: 'row' }, h('label', null, 'Mirror'), h('input', { type: 'checkbox', checked: !!o.f, onchange: e => { if (e.target.checked) o.f = 1; else delete o.f; commit(false); } })),
      h('div', { class: 'row' }, h('button', { class: 'danger', onclick: () => { d.objects.splice(sel.index, 1); ED.sel = null; commit(def.house); renderPanel(); } }, 'Delete prop')));
  }
  if (sel && sel.kind === 'portal' && d.portals[sel.index]) {
    const p = d.portals[sel.index];
    P.append(h('h3', null, 'SELECTED PORTAL'),
      h('div', { class: 'row' }, h('label', null, 'Leads to'), h('select', { onchange: e => { p.to = e.target.value; commit(false); } }, Object.keys(ED.world.maps).map(k => h('option', { value: k, selected: k === p.to }, ED.world.maps[k].name + (k === ED.mapId ? ' (this map)' : ''))))),
      h('div', { class: 'row' }, h('label', null, 'Open'), h('input', { type: 'checkbox', checked: p.open !== false, onchange: e => { p.open = e.target.checked; commit(false); } }), h('span', { class: 'hint' }, 'closed portals can be opened by a trigger')),
      h('div', { class: 'row' }, h('label', null, 'Quest "!"'), h('input', { type: 'checkbox', checked: !!p.marker, onchange: e => { p.marker = e.target.checked; commit(false); } }), h('span', { class: 'hint' }, 'shows ! on the minimap')),
      h('div', { class: 'row' }, h('label', null, 'Position'), numIn(p.x, v => { p.x = +v; commit(false); }), numIn(p.y, v => { p.y = +v; commit(false); })),
      h('div', { class: 'row' }, h('span', { class: 'hint' }, `Index #${sel.index} (used by Open/Close portal actions).`)),
      h('button', { class: 'danger', onclick: () => { d.portals.splice(sel.index, 1); ED.sel = null; commit(false); renderPanel(); } }, 'Delete portal'));
  }
  P.append(h('h3', null, 'THIS MAP'),
    h('div', { class: 'hint' }, `${d.name} — ${d.W}×${d.H} tiles, ${d.objects.length} props, ${d.portals.length} portals, ${(d.triggers || []).length} triggers. Theme: ${d.theme}.`),
    h('div', { class: 'hint' }, 'Pan: right-drag or Space+drag · Zoom: mouse wheel · Undo: Ctrl+Z'));
}

// ----- logic ---------------------------------------------------------------------
const WHEN = {
  map_enter: { label: 'When the map starts', f: [] },
  timer: { label: 'After N seconds', f: [['seconds', 'num', 'seconds'], ['after', 'after', 'counting from']] },
  enter_area: { label: 'When the player walks into an area', f: [['x', 'num', 'x'], ['y', 'num', 'y'], ['r', 'num', 'radius'], ['pick', 'pick']] },
  all_enemies_dead: { label: 'When no enemies are left', f: [] },
  enemy_killed: { label: 'When enough enemies are defeated', f: [['enemy', 'enemyAny', 'type'], ['count', 'num', 'count']] },
  boss_hp_below: { label: 'When boss HP drops below %', f: [['pct', 'num', '%']] },
  player_hp_below: { label: 'When player HP drops below %', f: [['pct', 'num', '%']] },
};
const ACTIONS = {
  spawn: { label: 'Spawn enemies', f: [['enemy', 'enemy'], ['count', 'num', '×'], ['x', 'num', 'x'], ['y', 'num', 'y'], ['radius', 'num', 'spread'], ['instant', 'bool', 'instant'], ['pick', 'pick']] },
  spawn_boss: { label: 'Spawn the boss', f: [['x', 'num', 'x'], ['y', 'num', 'y'], ['pick', 'pick']] },
  banner: { label: 'Show big banner', f: [['title', 'text', 'title'], ['sub', 'text', 'subtitle'], ['boss', 'bool', 'boss style']] },
  message: { label: 'Show message', f: [['text', 'text', 'text']] },
  objective: { label: 'Set objective', f: [['text', 'text', 'text']] },
  heal: { label: 'Heal player', f: [['pct', 'num', '% of max HP']] },
  open_portal: { label: 'Open portal', f: [['index', 'portal']] },
  close_portal: { label: 'Close portal', f: [['index', 'portal']] },
  clear_enemies: { label: 'Defeat all enemies', f: [] },
  shake: { label: 'Shake the screen', f: [['power', 'num', 'power']] },
  sound: { label: 'Play sound', f: [['name', 'sound']] },
  teleport: { label: 'Send player to map', f: [['map', 'map']] },
  wait: { label: 'Wait before the next action', f: [['seconds', 'num', 'seconds']] },
};
function uid(d, base) { let i = 1, id = base; while ((d.triggers || []).some(t => t.id === id)) id = base + (++i); return id; }
function fieldEl(obj, key, kind, label, d, tr) {
  const set = v => { if (v === '' || v == null) delete obj[key]; else obj[key] = v; commit(false); };
  const wrap = el => h('label', { title: label || key }, (label || key) + ' ', el);
  switch (kind) {
    case 'num': return wrap(numIn(obj[key], set));
    case 'text': return wrap(h('input', { class: 'wide', type: 'text', value: obj[key] || '', onchange: e => set(e.target.value) }));
    case 'bool': return wrap(h('input', { type: 'checkbox', checked: !!obj[key], onchange: e => set(e.target.checked || '') }));
    case 'enemy': return h('select', { onchange: e => set(e.target.value) }, ENEMY_CHOICES.map(k => h('option', { value: k, selected: (obj[key] || 'slime') === k }, k)));
    case 'enemyAny': return h('select', { onchange: e => set(e.target.value === 'any' ? '' : e.target.value) }, ['any', ...ENEMY_CHOICES, 'boss'].map(k => h('option', { value: k, selected: (obj[key] || 'any') === k }, k)));
    case 'sound': return h('select', { onchange: e => set(e.target.value) }, SOUNDS.map(k => h('option', { value: k, selected: (obj[key] || 'portal') === k }, k)));
    case 'map': return h('select', { onchange: e => set(e.target.value) }, Object.keys(ED.world.maps).map(k => h('option', { value: k, selected: obj[key] === k }, ED.world.maps[k].name)));
    case 'portal': return h('select', { onchange: e => set(+e.target.value) }, h('option', { value: -1, selected: obj[key] == null || +obj[key] === -1 }, 'all portals'),
      d.portals.map((p, i) => h('option', { value: i, selected: +obj[key] === i }, `#${i} → ${(ED.world.maps[p.to] || {}).name || p.to}`)));
    case 'after': return wrap(h('select', { onchange: e => set(e.target.value) }, h('option', { value: 'map', selected: !obj.after || obj.after === 'map' }, 'map start'),
      (d.triggers || []).filter(t => t !== tr).map(t => h('option', { value: t.id, selected: obj.after === t.id }, '“' + (t.name || t.id) + '” fires'))));
    case 'pick': return h('button', { class: 'mini', title: 'Click a spot on the map', onclick: () => { ED.pick = (x, y) => { obj.x = x; obj.y = y; if (obj === tr.when && !obj.r) obj.r = 1.5; }; toast('Click a spot on the map…'); draw(); } }, '⌖ pick on map');
  }
}
function summary(tr, d) {
  const w = tr.when || { type: 'map_enter' };
  let s = (WHEN[w.type] || {}).label || w.type;
  if (w.type === 'timer') s = `${w.seconds || 0}s after ${!w.after || w.after === 'map' ? 'the map starts' : '“' + ((d.triggers.find(t => t.id === w.after) || {}).name || w.after) + '”'}`;
  if ((tr.requires || []).length) s += ', once ' + tr.requires.map(id => '“' + ((d.triggers.find(t => t.id === id) || {}).name || id) + '”').join(' & ') + ' happened';
  const acts = (tr.actions || []).map(a => a.type === 'spawn' ? `spawn ${a.count || 1} ${a.enemy || 'slime'}` : a.type === 'banner' ? `banner “${a.title || ''}”` : (ACTIONS[a.type] || {}).label || a.type);
  return s + ' → ' + (acts.join(', ') || 'nothing yet');
}
function triggerCard(tr, i, d) {
  const list = d.triggers;
  const w = tr.when = tr.when || { type: 'map_enter' };
  const mv = dir => { const j = i + dir; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; commit(false); renderPanel(); };
  const card = h('div', { class: 'card' + (tr.disabled ? ' off' : '') },
    h('div', { class: 'head' },
      h('input', { class: 'name', type: 'text', value: tr.name || '', placeholder: tr.id, onchange: e => { tr.name = e.target.value; commit(false); renderPanel(); } }),
      h('button', { class: 'mini', title: 'Move up', onclick: () => mv(-1) }, '↑'), h('button', { class: 'mini', title: 'Move down', onclick: () => mv(1) }, '↓'),
      h('button', { class: 'mini danger', title: 'Delete trigger', onclick: () => { if (!confirm(`Delete trigger “${tr.name || tr.id}”?`)) return; list.splice(i, 1); for (const t of list) { t.requires = (t.requires || []).filter(r => r !== tr.id); if (t.when && t.when.after === tr.id) t.when.after = 'map'; } commit(false); renderPanel(); } }, '✕')),
    h('div', { class: 'sum' }, summary(tr, d)),
    h('div', { class: 'row' }, h('span', { class: 'tag when' }, 'WHEN'),
      h('select', { onchange: e => { tr.when = { type: e.target.value }; commit(false); renderPanel(); } }, Object.entries(WHEN).map(([k, v]) => h('option', { value: k, selected: w.type === k }, v.label)))),
    h('div', { class: 'row' }, WHEN[w.type] ? WHEN[w.type].f.map(([k, kind, label]) => fieldEl(w, k, kind, label, d, tr)) : null),
    h('div', { class: 'row' }, h('span', { class: 'tag req' }, 'ONLY AFTER'),
      h('div', { class: 'chips' }, list.filter(t => t !== tr).map(t => {
        const on = (tr.requires || []).includes(t.id);
        return h('button', { class: 'chip ' + (on ? 'on' : ''), onclick: () => { tr.requires = on ? tr.requires.filter(r => r !== t.id) : (tr.requires || []).concat(t.id); if (!tr.requires.length) delete tr.requires; commit(false); renderPanel(); } }, t.name || t.id);
      }), list.length < 2 ? h('span', { class: 'hint' }, 'add more triggers to chain them') : null)),
    h('div', { class: 'row' }, h('span', { class: 'tag then' }, 'THEN')),
    (tr.actions = tr.actions || []).map((a, k) => h('div', { class: 'act' },
      h('select', { onchange: e => { tr.actions[k] = { type: e.target.value }; commit(false); renderPanel(); } }, Object.entries(ACTIONS).map(([key, v]) => h('option', { value: key, selected: a.type === key }, v.label))),
      (ACTIONS[a.type] || { f: [] }).f.map(([key, kind, label]) => fieldEl(a, key, kind, label, d, tr)),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'mini', onclick: () => { if (k > 0) { [tr.actions[k - 1], tr.actions[k]] = [tr.actions[k], tr.actions[k - 1]]; commit(false); renderPanel(); } } }, '↑'),
      h('button', { class: 'mini danger', onclick: () => { tr.actions.splice(k, 1); commit(false); renderPanel(); } }, '✕'))),
    h('div', { class: 'row' },
      h('button', { class: 'mini', onclick: () => { tr.actions.push({ type: 'message', text: '' }); commit(false); renderPanel(); } }, '+ action'),
      h('span', { style: 'flex:1' }),
      h('label', null, h('input', { type: 'checkbox', checked: tr.once === false, onchange: e => { if (e.target.checked) tr.once = false; else delete tr.once; commit(false); } }), ' repeat'),
      h('label', null, h('input', { type: 'checkbox', checked: !!tr.disabled, onchange: e => { if (e.target.checked) tr.disabled = true; else delete tr.disabled; commit(false); renderPanel(); } }), ' disabled')));
  return card;
}
const TEMPLATES = {
  'Wave': d => ({ id: uid(d, 'wave'), name: 'New wave', when: { type: 'timer', seconds: 2, after: 'map' }, actions: [{ type: 'banner', title: 'Here they come!', sub: '' }, { type: 'spawn', enemy: 'slime', count: 5 }] }),
  'Wave cleared': d => ({ id: uid(d, 'cleared'), name: 'Wave cleared', when: { type: 'all_enemies_dead' }, requires: d.triggers.length ? [d.triggers[d.triggers.length - 1].id] : undefined, actions: [{ type: 'banner', title: 'Cleared!', sub: '' }, { type: 'heal', pct: 25 }] }),
  'Area message': d => ({ id: uid(d, 'area'), name: 'Area message', when: { type: 'enter_area', x: d.start.x, y: d.start.y, r: 1.5 }, actions: [{ type: 'message', text: 'Something stirs nearby…' }] }),
  'Unlock portal': d => ({ id: uid(d, 'unlock'), name: 'Unlock portal', when: { type: 'all_enemies_dead' }, requires: d.triggers.length ? [d.triggers[d.triggers.length - 1].id] : undefined, actions: [{ type: 'open_portal', index: -1 }, { type: 'message', text: 'A rift opens!' }] }),
  'Empty': d => ({ id: uid(d, 'trigger'), name: 'New trigger', when: { type: 'map_enter' }, actions: [] }),
};
function renderLogicPanel(P) {
  const d = D(); d.triggers = d.triggers || [];
  P.append(h('h3', null, 'LOGIC — ' + d.name.toUpperCase()),
    h('div', { class: 'hint' }, 'Triggers run top to bottom. Each fires once (unless “repeat”) when its WHEN is true and every “ONLY AFTER” trigger has already fired. “Wait” actions delay the actions below them.'),
    h('div', { class: 'row' }, h('label', null, 'Objective'), h('input', { type: 'text', class: 'wide', style: 'flex:1', value: d.objective || '', placeholder: 'shown top-left when the map starts', onchange: e => { d.objective = e.target.value; commit(false); } })),
    h('div', { class: 'row' }, h('b', null, 'Add:'), Object.keys(TEMPLATES).map(k => h('button', { class: 'mini', onclick: () => { const t = TEMPLATES[k](d); if (!t.requires) delete t.requires; d.triggers.push(t); commit(false); renderPanel(); $('#panel').scrollTop = 1e6; } }, '+ ' + k))));
  d.triggers.forEach((tr, i) => P.append(triggerCard(tr, i, d)));
  if (!d.triggers.length) P.append(h('div', { class: 'hint' }, 'No triggers yet — this map is peaceful. Add a Wave to make it a battle.'));
}

// ----- tuning ---------------------------------------------------------------------
function tuneVal(path, base) {
  let o = ED.world.tuning || {};
  for (const k of path) { o = o && o[k]; }
  return o == null ? base : o;
}
function setTune(path, v, base) {
  ED.world.tuning = ED.world.tuning || {};
  let o = ED.world.tuning;
  for (const k of path.slice(0, -1)) o = o[k] = o[k] || {};
  if (v === '' || +v === base) delete o[path[path.length - 1]]; else o[path[path.length - 1]] = +v;
  commit(false);
}
function renderTunePanel(P) {
  P.append(h('h3', null, 'PLAYER'), h('table', null,
    Object.entries({ hp: 'Base HP', mp: 'Base mana', stamina: 'Stamina', speed: 'Move speed', regen: 'HP regen /s', mpRegen: 'Mana regen /s', crit: 'Crit chance (0-1)', damage: 'Damage multiplier' }).map(([k, label]) =>
      h('tr', null, h('td', null, label), h('td', null, numIn(tuneVal(['player', k], BASE_PLAYER[k]), v => setTune(['player', k], v, BASE_PLAYER[k])))))));
  P.append(h('h3', null, 'ENEMIES'), h('table', null,
    h('tr', null, h('th', null, ''), ['HP', 'speed', 'damage', 'range', 'cooldown'].map(s => h('th', null, s))),
    ['slime', 'wisp', 'hound', 'boss'].map(k => h('tr', null, h('td', null, k),
      ['hp', 'speed', 'dmg', 'range', 'cd'].map(f => h('td', null, (k === 'boss' && f !== 'hp' && f !== 'speed') ? '—' : numIn(tuneVal(['enemies', k, f], BASE_ENEMY[k][f]), v => setTune(['enemies', k, f], v, BASE_ENEMY[k][f]))))))));
  const groups = [];
  for (const w of ITEMS.weapon) groups.push([w.name, [...w.q, ...w.e, ...w.r]]);
  groups.push(['Armour', ITEMS.chest.concat(ITEMS.head, ITEMS.boots).map(i => i.skill)]);
  groups.push(['Character', CHAR_SKILLS]);
  P.append(h('h3', null, 'SKILLS'), h('div', { class: 'hint' }, 'Cooldown (s), mana and stamina costs.'));
  for (const [g, ids] of groups) P.append(h('table', null, h('tr', null, h('th', null, g), h('th', null, 'CD'), h('th', null, 'MP'), h('th', null, 'ST')),
    ids.map(id => h('tr', null, h('td', null, SKILLS[id].name), ['cd', 'mp', 'st'].map(f => h('td', null, numIn(tuneVal(['skills', id, f], BASE_SKILL[id][f]), v => setTune(['skills', id, f], v, BASE_SKILL[id][f]))))))));
  P.append(h('div', { class: 'row' }, h('button', { class: 'danger', onclick: () => { if (confirm('Reset all tuning to the defaults?')) { ED.world.tuning = {}; commit(false); renderPanel(); } } }, 'Reset tuning')));
}

// ===== dialogs ======================================================================
function dialog(title, body, buttons) {
  const dl = $('#dlg'); dl.innerHTML = '';
  dl.append(h('h2', null, title), ...body, h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:14px' }, buttons));
  dl.showModal();
  return dl;
}
const closeDlg = () => $('#dlg').close();
const slug = s => (s || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'map';

function newMapDialog() {
  const f = { name: 'New Isle', theme: 'vale', W: 18, H: 18, shape: 'round', fill: 'g' };
  const inp = (k, attrs) => h('input', Object.assign({ value: f[k], onchange: e => { f[k] = attrs.type === 'number' ? +e.target.value : e.target.value; } }, attrs));
  dialog('NEW MAP', [
    h('div', { class: 'row' }, h('label', null, 'Name'), inp('name', { type: 'text' })),
    h('div', { class: 'row' }, h('label', null, 'Theme'), h('select', { onchange: e => { f.theme = e.target.value; } }, h('option', { value: 'vale' }, 'Dreamy vale (day, lanterns, fireflies)'), h('option', { value: 'ruins' }, 'Nightmare ruins (blood moon, embers)'))),
    h('div', { class: 'row' }, h('label', null, 'Size'), inp('W', { type: 'number', min: 8, max: 40 }), '×', inp('H', { type: 'number', min: 8, max: 40 })),
    h('div', { class: 'row' }, h('label', null, 'Island shape'), h('select', { onchange: e => { f.shape = e.target.value; } }, h('option', { value: 'round' }, 'Round'), h('option', { value: 'square' }, 'Square'))),
    h('div', { class: 'row' }, h('label', null, 'Ground'), h('select', { onchange: e => { f.fill = e.target.value; } }, Object.entries(TILE_TYPES).filter(([k]) => 'gfxd'.includes(k)).map(([k, v]) => h('option', { value: k }, v)))),
  ], [h('button', { onclick: closeDlg }, 'Cancel'), h('button', { class: 'primary', onclick: () => {
    const W = clamp(f.W | 0, 8, 40), H = clamp(f.H | 0, 8, 40);
    let id = slug(f.name); while (ED.world.maps[id]) id += '_2';
    const tiles = [], heights = [];
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) { const inside = f.shape === 'square' || Math.hypot((x + 0.5 - W / 2) / (W / 2), (y + 0.5 - H / 2) / (H / 2)) < 0.97; r += inside ? f.fill : '.'; }
      tiles.push(r); heights.push('0'.repeat(W));
    }
    ED.world.maps[id] = { name: f.name, sub: '', theme: f.theme, W, H, tiles, heights, start: { x: W / 2, y: H / 2 + 2 }, portals: [], objects: [], objective: '', triggers: [] };
    ED.mapId = id; ED.sel = null; closeDlg(); commit(); refreshAll(true); fitView(); draw();
    toast('New map created. Tip: place a Portal on another map that leads here.');
  } }, 'Create')]);
}

function settingsDialog() {
  const d = D(), f = { name: d.name, sub: d.sub || '', theme: d.theme, W: d.W, H: d.H };
  const inp = (k, attrs) => h('input', Object.assign({ value: f[k], onchange: e => { f[k] = attrs.type === 'number' ? +e.target.value : e.target.value; } }, attrs));
  dialog('MAP SETTINGS', [
    h('div', { class: 'row' }, h('label', null, 'Name'), inp('name', { type: 'text' })),
    h('div', { class: 'row' }, h('label', null, 'Subtitle'), inp('sub', { type: 'text' })),
    h('div', { class: 'row' }, h('label', null, 'Theme'), h('select', { onchange: e => { f.theme = e.target.value; } }, ['vale', 'ruins'].map(t => h('option', { value: t, selected: t === d.theme }, t === 'vale' ? 'Dreamy vale' : 'Nightmare ruins')))),
    h('div', { class: 'row' }, h('label', null, 'Size'), inp('W', { type: 'number', min: 8, max: 40 }), '×', inp('H', { type: 'number', min: 8, max: 40 }), h('span', { class: 'hint' }, 'grows/crops from the bottom-right edges')),
    h('div', { class: 'row' }, h('label', null, 'Game starts here'), h('input', { type: 'checkbox', checked: ED.world.start === ED.mapId, onchange: e => { if (e.target.checked) ED.world.start = ED.mapId; } })),
    h('div', { class: 'row' }, h('span', { class: 'hint' }, `Map id: ${ED.mapId} (used by portals; can't be changed).`)),
  ], [
    h('button', { class: 'danger', onclick: () => {
      if (Object.keys(ED.world.maps).length < 2) { toast('A world needs at least one map.'); return; }
      if (!confirm(`Delete “${d.name}” for good? Portals leading here will be flagged.`)) return;
      delete ED.world.maps[ED.mapId];
      if (ED.world.start === ED.mapId) ED.world.start = Object.keys(ED.world.maps)[0];
      ED.mapId = ED.world.start; ED.sel = null; closeDlg(); commit(); refreshAll(true); fitView(); draw();
    } }, 'Delete map'),
    h('span', { style: 'flex:1' }),
    h('button', { onclick: closeDlg }, 'Cancel'),
    h('button', { class: 'primary', onclick: () => {
      d.name = f.name; d.sub = f.sub; d.theme = f.theme;
      const W = clamp(f.W | 0, 8, 40), H = clamp(f.H | 0, 8, 40);
      if (W !== d.W || H !== d.H) {
        const fit = (rows, pad) => Array.from({ length: H }, (_, y) => ((rows[y] || '') + pad.repeat(W)).slice(0, W));
        d.tiles = fit(d.tiles, '.'); d.heights = fit(d.heights, '0'); d.W = W; d.H = H;
        d.objects = d.objects.filter(o => o.x < W && o.y < H); d.portals = d.portals.filter(p => p.x < W && p.y < H);
        d.start = { x: Math.min(d.start.x, W - 0.5), y: Math.min(d.start.y, H - 0.5) };
      }
      closeDlg(); commit(); refreshAll(true);
    } }, 'Save')]);
}

function ghSettings() { try { return Object.assign({ owner: 'leandromeiramedeiros', repo: 'My-dreamy-rpg', branch: '', token: '' }, JSON.parse(localStorage.getItem(GH_KEY) || '{}')); } catch (e) { return { owner: 'leandromeiramedeiros', repo: 'My-dreamy-rpg', branch: '', token: '' }; } }
function ghDialog(then) {
  const s = ghSettings();
  const inp = (k, type = 'text', ph = '') => h('input', { type, value: s[k], placeholder: ph, onchange: e => { s[k] = e.target.value.trim(); } });
  dialog('GITHUB SETTINGS', [
    h('div', { class: 'hint' }, 'Publishing commits js/world.js to your repository; GitHub Pages then updates the live game within a minute or two.'),
    h('div', { class: 'row' }, h('label', null, 'Owner'), inp('owner')),
    h('div', { class: 'row' }, h('label', null, 'Repository'), inp('repo')),
    h('div', { class: 'row' }, h('label', null, 'Branch'), inp('branch', 'text', 'blank = the default branch')),
    h('div', { class: 'row' }, h('label', null, 'Token'), inp('token', 'password', 'github_pat_…')),
    h('div', { class: 'hint' }, h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'Create a fine-grained token'),
      ': Repository access → only ', h('b', null, s.repo), ', Permissions → ', h('b', null, 'Contents: Read and write'), '. The token is stored only in this browser (localStorage).'),
  ], [
    h('button', { class: 'danger', onclick: () => { localStorage.removeItem(GH_KEY); closeDlg(); toast('GitHub settings forgotten.'); } }, 'Forget token'),
    h('span', { style: 'flex:1' }),
    h('button', { onclick: closeDlg }, 'Cancel'),
    h('button', { class: 'primary', onclick: () => { localStorage.setItem(GH_KEY, JSON.stringify(s)); closeDlg(); if (then) then(); else toast('Saved.'); } }, then ? 'Save & continue' : 'Save')]);
}

// ===== validation, play-test, export, publish ==========================================
function validate(w) {
  const out = [];
  if (!w.maps[w.start]) out.push(`The starting map “${w.start}” doesn't exist.`);
  for (const [id, d] of Object.entries(w.maps)) {
    const m = buildLite(d);
    const t = m.tile(Math.floor(d.start.x), Math.floor(d.start.y));
    if (t === '.' || t === 'w' || t === 'c') out.push(`${d.name}: the START point isn't on walkable ground.`);
    d.portals.forEach((p, i) => { if (!w.maps[p.to]) out.push(`${d.name}: portal #${i} leads to a map that doesn't exist (“${p.to}”).`); });
    const ids = new Set();
    for (const tr of d.triggers || []) {
      if (ids.has(tr.id)) out.push(`${d.name}: two triggers share the id “${tr.id}”.`); ids.add(tr.id);
      for (const r of tr.requires || []) if (!(d.triggers || []).some(t => t.id === r)) out.push(`${d.name}: “${tr.name || tr.id}” waits for a trigger that was deleted.`);
      if (tr.when && tr.when.type === 'all_enemies_dead' && !(tr.requires || []).length) out.push(`${d.name}: “${tr.name || tr.id}” (no enemies left) has no ONLY AFTER, so it fires as soon as the map starts.`);
    }
  }
  return out;
}
const buildLite = d => ({ tile: (x, y) => tileCh(d, x, y) });
function playtest() {
  saveDraft();
  const probs = validate(ED.world);
  if (probs.length) toast('⚠ ' + probs[0] + (probs.length > 1 ? ` (+${probs.length - 1} more)` : ''), 4000);
  window.open('index.html?playtest=1&map=' + encodeURIComponent(ED.mapId), 'dreamy-playtest');
}
function exportWorld() {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(ED.world, null, 1)], { type: 'application/json' })), download: 'world.json' });
  document.body.append(a); a.click(); a.remove();
}
function importWorld(file) {
  file.text().then(txt => {
    let w;
    try { w = JSON.parse(txt.replace(/^[\s\S]*?WORLD_DATA\s*=\s*/, '').replace(/;\s*$/, '')); } catch (e) { toast('That file is not valid JSON.'); return; }
    if (!w || !w.maps || !Object.keys(w.maps).length) { toast('No maps found in that file.'); return; }
    ED.world = w; ED.mapId = w.maps[w.start] ? w.start : Object.keys(w.maps)[0]; ED.sel = null;
    commit(); refreshAll(true); fitView(); draw(); toast('World imported.');
  });
}
const b64 = s => { const bytes = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
async function publish() {
  const s = ghSettings();
  if (!s.token) { ghDialog(publish); return; }
  const probs = validate(ED.world);
  const msgIn = h('input', { type: 'text', value: 'Update world from Dreamy Editor', style: 'flex:1' });
  dialog('PUBLISH TO GITHUB', [
    h('div', { class: 'hint' }, `Commits js/world.js to ${s.owner}/${s.repo}${s.branch ? ' (' + s.branch + ')' : ''}. The live game updates after GitHub Pages redeploys (about a minute).`),
    probs.length ? h('div', { class: 'warn' }, h('b', null, 'Warnings:'), h('ul', null, probs.map(p => h('li', null, p)))) : h('div', { class: 'ok' }, '✓ No problems found.'),
    h('div', { class: 'row' }, h('label', null, 'Message'), msgIn),
  ], [h('button', { onclick: closeDlg }, 'Cancel'), h('button', { class: 'primary', onclick: async (e) => {
    e.target.disabled = true; e.target.textContent = 'Publishing…';
    try {
      const api = `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}`;
      const hd = { Authorization: 'Bearer ' + s.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      const ok = async r => { if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(`${r.status} ${j.message || r.statusText}`); } return r.json(); };
      const branch = s.branch || (await ok(await fetch(api, { headers: hd }))).default_branch;
      let sha;
      const cur = await fetch(`${api}/contents/js/world.js?ref=${encodeURIComponent(branch)}`, { headers: hd });
      if (cur.ok) sha = (await cur.json()).sha; else if (cur.status !== 404) await ok(cur);
      const res = await ok(await fetch(`${api}/contents/js/world.js`, { method: 'PUT', headers: hd, body: JSON.stringify({ message: msgIn.value || 'Update world', content: b64(worldSource(ED.world)), branch, sha }) }));
      closeDlg();
      localStorage.setItem('dreamy.world.published', ED.cur);
      $('#stSave').innerHTML = '<span class="ok">●</span> Published';
      toast(`✓ Published! <a href="${res.commit.html_url}" target="_blank" rel="noopener">View commit</a> · the live game updates in about a minute.`, 9000);
    } catch (err) {
      e.target.disabled = false; e.target.textContent = 'Publish';
      toast('Publish failed: ' + err.message + (/401|403|404/.test(err.message) ? ' — check the token, repository and its Contents permission.' : ''), 8000);
    }
  } }, 'Publish')]);
}

// ===== wiring ===========================================================================
function fillMapSelect() {
  const sel = $('#mapSel'); sel.innerHTML = '';
  for (const [id, d] of Object.entries(ED.world.maps)) sel.append(h('option', { value: id, selected: id === ED.mapId }, d.name + (ED.world.start === id ? ' ★' : '')));
}
function resize() {
  const r = $('#view').getBoundingClientRect();
  CV.width = Math.max(100, Math.floor(r.width)); CV.height = Math.max(100, Math.floor(r.height));
  draw();
}
function wire() {
  CV.addEventListener('pointerdown', onDown);
  CV.addEventListener('pointermove', onMove);
  CV.addEventListener('pointerup', onUp);
  CV.addEventListener('pointercancel', onUp);
  CV.addEventListener('pointerleave', () => { ED.hover = null; draw(); });
  CV.addEventListener('wheel', onWheel, { passive: false });
  CV.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', resize);
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { ED.tab = b.dataset.tab; ED.pick = null; renderPanel(); draw(); });
  $('#mapSel').onchange = e => { ED.mapId = e.target.value; ED.sel = null; ED.pick = null; rebuild(true); fitView(); draw(); renderPanel(); $('#panel').scrollTop = 0; };
  $('#bNew').onclick = newMapDialog;
  $('#bSettings').onclick = settingsDialog;
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#bGrid').onclick = () => { ED.grid = !ED.grid; $('#bGrid').classList.toggle('on', ED.grid); draw(); };
  $('#bPlay').onclick = playtest;
  $('#bExport').onclick = exportWorld;
  $('#bImport').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = e => { if (e.target.files[0]) importWorld(e.target.files[0]); e.target.value = ''; };
  $('#bRevert').onclick = () => { if (!confirm('Throw away your draft and reload the published world?')) return; localStorage.removeItem(DRAFT_KEY); ED.world = JSON.parse(JSON.stringify(WORLD_DATA)); ED.mapId = ED.world.start; ED.sel = null; ED.cur = JSON.stringify(ED.world); ED.undo = []; ED.redo = []; refreshAll(true); fitView(); draw(); $('#stSave').textContent = 'Showing the published world'; };
  $('#bPublish').onclick = publish;
  $('#bGh').onclick = () => ghDialog();
  window.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || $('#dlg').open) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey) return;
    if (k === ' ') { ED.space = true; e.preventDefault(); return; }
    const t = { v: 'select', b: 'tile', h: 'height', o: 'object', e: 'erase', s: 'start', p: 'portal' }[k];
    if (t) { ED.tab = 'map'; setTool(t); return; }
    if (k === 'g') { $('#bGrid').click(); return; }
    if (k === 'escape') { ED.pick = null; ED.sel = null; renderPanel(); draw(); return; }
    if ((k === 'delete' || k === 'backspace') && ED.sel) {
      const d = D();
      if (ED.sel.kind === 'obj') { const house = OBJ_TYPES[d.objects[ED.sel.index].t].house; d.objects.splice(ED.sel.index, 1); ED.sel = null; commit(house); }
      else if (ED.sel.kind === 'portal') { d.portals.splice(ED.sel.index, 1); ED.sel = null; commit(false); }
      renderPanel();
    }
  });
  window.addEventListener('keyup', e => { if (e.key === ' ') ED.space = false; });
  window.addEventListener('beforeunload', saveDraft);
}

async function bootEditor() {
  await loadSprites();
  buildArt();
  let w = JSON.parse(JSON.stringify(WORLD_DATA)), fromDraft = false;
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && draft !== JSON.stringify(WORLD_DATA)) { const dw = JSON.parse(draft); if (dw && dw.maps) { w = dw; fromDraft = true; } }
  } catch (e) { /* ignore broken draft */ }
  ED.world = w; ED.mapId = w.maps[w.start] ? w.start : Object.keys(w.maps)[0]; ED.cur = JSON.stringify(w);
  wire(); resize(); fillMapSelect(); rebuild(true); fitView(); setTool('select'); renderPanel(); draw();
  $('#stSave').innerHTML = fromDraft ? '<span class="warn">●</span> Loaded your unpublished draft from this browser' : 'Showing the published world';
  $('#loading').style.display = 'none';
  window.__editorReady = true;
}
const startEditor = () => bootEditor().catch(e => { $('#loading').textContent = 'Editor failed to load: ' + e.message; console.error(e); });
if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"').then(startEditor, startEditor); else startEditor();
