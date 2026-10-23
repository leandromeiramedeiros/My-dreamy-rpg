'use strict';
// ===== elements-world.js: elements in the world (docs/design/elements-statuses.md "World verbs", "Wiring") =====================
// Receivers: map objects that react to an element. RX below is the ONE table (plain data, no closures: a human ports it to Godot):
//   RX[type] = { r, start, optIn?, states: { <state>: { el?, to?, life?, back?, solid?, gone?, lasting?, source?, take?, effect?, light? } } }
//     r        collider radius while the state is `solid` (0: never blocks)
//     start    the state a fresh object starts in (a map object may set its own `state`)
//     optIn    only objects that carry an explicit `state` are receivers (brazier, shrine: the decor rows elsewhere stay decor)
//     el       { accept: element | [elements], build, oil }: the hit that moves the state on. build = points needed (a hit adds
//              25 x w; w = 1 for a skill, a basic, a zone tick or Pip, 0.3 for a Dream Oil coat), oil = false refuses coat hits
//     to       the state the accepted element moves it to (once: the state changes, the next hit of that element finds no `el`)
//     life     a transient state's seconds; then it goes `back`. Transient states also reset on respawn / map entry
//     lasting  the state is written to G.prog.state[map][id] and comes back on entry
//     solid    the object blocks movement in this state (a separate collider, so maps.js gates code keeps working)
//     gone     the sprite is hidden (burnt bramble, melted ice wall, broken seal, cleared fog)
//     source   Pip can take a charge of this element here (Interact); take = the state the source goes to after
//     effect   a named world effect run on entering the state (code below): chain, drift, vine, scorch, thaw, shatter, obsidian, gust
//     light    { r, col, a, h, fx? } the state's light (render.js rxLights)
// Hits: hitReceivers(x, y, r, el, w, shape?) from game.js hitArea / hitCone / hitLine, friendly projectiles, chain lightning and
// zone ticks (zones tick through hitArea). Wrong element: nothing. Conditions (game.js triggerCondition):
//   { type: 'object_state', id | ids[], state }   every named object is in that state
//   { type: 'element_hit', id, el? }               an accepted hit of el (any accepted element if omitted) landed on the object
// Tile patches: tilePatch({ kind, tiles: [[x, y], ...], life }) -> tiles set. Kinds: drygrass (fuel, from the map record's
//   `grass: [[x, y, w, h]]`), burning, scorch, ice (water only, walkable while it lasts), rime (Glide's trail film), obsidian,
//   vine (a lasting bridge over water), raft. A patch never re-rasters the ground: it marks its 8 x 8-tile layer chunk dirty
//   (dirtyChunk) and render.js rebuilds at most 4 dirty layer chunks a frame (EW.flush).
// Grass fire: a fire hit within 0.7 of a dry-grass tile lights it; it spreads one tile per 0.4 s, at most 16 tiles a fire, at most
//   4 burning (emitting) at once, one fire per map. Burning tiles give Burning to enemies within 0.7 and fire to receivers; the hero
//   is never hurt by the world (nothing is a trap). Ice: frost on water, 12 s, at most 24 tiles on a map.
// Pip's charge: Interact at a source (lit brazier = fire, rime crystal = frost, storm crystal = lightning; resting at a dawn shrine
//   = holy). Pip carries it (30 s) to the nearest receiver that accepts it within 8 tiles of Pip and delivers one hit (w = 1).
// Dream Oil: EW.coat(p, el) puts a 60 s coat on the weapon (items.js buyOil at the Elder Stone, the arena `oil` action): basic hits
//   also carry the oil element at w 0.3 (receivers, and a 50-point mini ladder on enemies -> that element's tier-1 status).
// Loaded after status.js (index.html). Nothing here runs at load but the OBJ_TYPES registration (no canvas at load: validate-ids).
// ---------------------------------------------------------------------------------------------------------------------------------
const RX = {
  torch: { r: 0, start: 'unlit', states: {
    unlit: { el: { accept: 'fire', build: 25, oil: true }, to: 'lit' },
    lit: { lasting: true, light: { r: 46, col: '#ffb060', a: 0.8, h: 14, fx: 'flicker' } } } },
  brazier: { r: 0.3, start: 'lit', optIn: true, states: {
    unlit: { solid: true, el: { accept: 'fire', build: 25, oil: true }, to: 'lit' },
    lit: { solid: true, lasting: true, source: 'fire', light: { r: 70, col: '#ff9a4a', a: 0.9, h: 12, fx: 'flicker' } } } },
  bramble: { r: 0.45, start: 'thorny', states: {
    thorny: { solid: true, el: { accept: 'fire', build: 25, oil: true }, to: 'burnt' },
    burnt: { gone: true, lasting: true, effect: 'scorch' } } },
  icewall: { r: 0.5, start: 'frozen', states: {
    frozen: { solid: true, el: { accept: 'fire', build: 50, oil: true }, to: 'melted', light: { r: 26, col: '#bff4ff', a: 0.35, h: 10 } },
    melted: { gone: true, lasting: true, effect: 'thaw' } } },
  seed: { r: 0, start: 'seed', states: {
    seed: { el: { accept: 'nature', build: 25, oil: true }, to: 'vine' },
    vine: { lasting: true, effect: 'vine' } } },
  conduit: { r: 0.25, start: 'dead', states: {
    dead: { solid: true, el: { accept: 'lightning', build: 25, oil: true }, to: 'live' },
    live: { solid: true, life: 10, back: 'dead', effect: 'chain', light: { r: 34, col: '#fff07a', a: 0.7, h: 14, fx: 'strobe' } } } },
  fogbank: { r: 0, start: 'dense', states: {
    dense: { el: { accept: 'wind', build: 25, oil: true }, to: 'cleared' },
    cleared: { gone: true, lasting: true, effect: 'disperse' } } },
  windmill: { r: 0.35, start: 'still', states: {
    still: { solid: true, el: { accept: 'wind', build: 25, oil: true }, to: 'spinning' },
    spinning: { solid: true, life: 12, back: 'still', effect: 'gust' } } },
  raft: { r: 0, start: 'moored', states: {
    moored: { el: { accept: 'wind', build: 25, oil: true }, to: 'drifted' },
    drifted: { lasting: true, effect: 'drift' } } },
  glyph: { r: 0, start: 'dim', states: {
    dim: { el: { accept: 'arcane', build: 25, oil: true }, to: 'lit' },
    lit: { lasting: true, light: { r: 30, col: '#b07cff', a: 0.6, h: 2 } } } },
  seal: { r: 0.45, start: 'sealed', states: {
    sealed: { solid: true, el: { accept: 'holy', build: 25, oil: true }, to: 'broken', light: { r: 24, col: '#fff2c4', a: 0.3, h: 12 } },
    broken: { gone: true, lasting: true, effect: 'shatter' } } },
  crystal_wall: { r: 0.5, start: 'solid', states: {
    solid: { solid: true, el: { accept: 'frost', build: 25, oil: true }, to: 'rimed', light: { r: 30, col: '#7fd2ff', a: 0.45, h: 12 } },
    rimed: { solid: true, life: 6, back: 'solid', el: { accept: ['slash', 'pierce', 'shatter'], build: 25, oil: false }, to: 'shattered', light: { r: 30, col: '#bff4ff', a: 0.55, h: 12 } },
    shattered: { gone: true, lasting: true, effect: 'shatter' } } },
  vent: { r: 0.4, start: 'venting', states: {
    venting: { solid: true, el: { accept: 'frost', build: 25, oil: true }, to: 'capped', light: { r: 30, col: '#ff8a4a', a: 0.4, h: 4 } },
    capped: { lasting: true, effect: 'obsidian' } } },
  rime_crystal: { r: 0.3, start: 'charged', states: {
    charged: { solid: true, source: 'frost', take: 'spent', light: { r: 40, col: '#9fe8ff', a: 0.75, h: 10 } },
    spent: { solid: true, life: 20, back: 'charged', el: { accept: 'frost', build: 25, oil: true }, to: 'charged' } } },
  storm_crystal: { r: 0.3, start: 'charged', states: {
    charged: { solid: true, source: 'lightning', take: 'spent', light: { r: 40, col: '#fff07a', a: 0.75, h: 10, fx: 'strobe' } },
    spent: { solid: true, life: 20, back: 'charged', el: { accept: 'lightning', build: 25, oil: true }, to: 'charged' } } },
  shrine: { r: 0, start: 'dawn', optIn: true, states: { dawn: { source: 'holy', rest: true } } },   // the dawn shrine: Pip takes holy on Rest
};
// numbers (docs/design/elements-statuses.md "World verbs")
const EWN = { build: 25, oil: 0.3, decay: 20, decayAfter: 1.5, pipR: 8, pipLife: 30, pipSpeed: 7, chainR: 5.5,
  fireR: 0.7, fireStep: 0.4, fireCap: 16, fireEmit: 4, burnT: 2.4, scorchT: 30, iceLife: 12, iceCap: 24, rimeLife: 2.5, rimeCap: 24, hitPad: 0.45, chunk: 8, flush: 4 };
const PATCH_KINDS = ['', 'drygrass', 'burning', 'scorch', 'ice', 'rime', 'obsidian', 'vine', 'raft'];
const PK = {}; PATCH_KINDS.forEach((k, i) => { if (k) PK[k] = i; });
const PATCH_WALK = { ice: 1, vine: 1, raft: 1 };   // patches that make water walkable
// object art types registered into maps.js OBJ_TYPES (img: render.js verbArt, a cached canvas per type and state)
const RX_OBJ = { torch: 0, bramble: 0, icewall: 0, seed: 0, conduit: 0, fogbank: 0, windmill: 0, raft: 0, glyph: 0, seal: 0, crystal_wall: 0, vent: 0, rime_crystal: 0, storm_crystal: 0, elderstone: 0 };
if (typeof OBJ_TYPES !== 'undefined') for (const t in RX_OBJ) if (!OBJ_TYPES[t]) {
  OBJ_TYPES[t] = { label: t === 'elderstone' ? 'Elder Stone (oils: [el], price)' : 'Receiver: ' + t + ' (id, state?)', img: () => [typeof verbArt === 'function' ? verbArt(t, t === 'elderstone' ? 'idle' : RX[t].start) : ART.sunIcon], r: 0, shadow: t === 'fogbank' ? 0 : 5 };
}

const EW = (function () {
  const accepts = (a, el) => Array.isArray(a) ? a.indexOf(el) >= 0 : a === el;
  const S = { map: null, trig: null, list: [], dawn: [], hits: {}, cardT: {}, pip: null, fire: null, ice: 0, rime: 0, starts: 0, maxBurn: 0, windT: 0, expT: 0, coatT: 0 };
  let M = null;   // the current map's patch state: { W, H, pt: Uint8Array kind, life: Float32Array expiry, water: Uint8Array, dirty: Set, chunks: Map }

  // ---- map attach / reset ------------------------------------------------------------------------------------------------------
  function rec() { return G.world && G.world.maps && G.map ? G.world.maps[G.map.id] || null : null; }
  function saved(m) { const P = G.prog.state || (G.prog.state = {}); return P[m.id] || (P[m.id] = {}); }
  function attach(m) {
    S.map = m; S.list = []; S.dawn = []; S.hits = {}; S.cardT = {}; S.pip = null; S.fire = null; S.starts = 0; S.maxBurn = 0;
    M = { W: m.W, H: m.H, pt: new Uint8Array(m.W * m.H), life: new Float32Array(m.W * m.H), born: new Float32Array(m.W * m.H), water: new Uint8Array(m.W * m.H), dirty: new Set(), chunks: new Map() };
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.type[j][i] === 'w') M.water[j * m.W + i] = 1;
    m._ew = M;
    for (const o of m.objects) {
      const s = o.src; if (!s || o.barrier) continue;
      if (s.t === 'elderstone') { o.use = STONE_USE; o.oilI = 0; continue; }
      const def = RX[s.t]; if (!def || (def.optIn && s.state == null && !(s.t === 'shrine' && s.dawn))) continue;
      const id = s.id || `${s.t}_${(+s.x).toFixed(1)}_${(+s.y).toFixed(1)}`;
      o.rx = { id, type: s.t, def, state: null, build: 0, buildT: 0, t0: 0, home: { x: o.x, y: o.y } };
      if (s.t === 'brazier') o.brazier = false;   // render.js: a receiver brazier's light comes from its state (rxLights)
      if (def.r > 0) { o.rx.col = { kind: 'rxcol', x: o.x, y: o.y, r: def.r, gone: true, rx: true }; addCollider(m, o.rx.col); }
      if (s.t === 'shrine') S.dawn.push(o); else S.list.push(o);
      if (Object.values(def.states).some(st => st.source)) o.use = o.use || PIP_USE;
    }
    const r = rec();
    for (const [x0, y0, w, h] of (r && r.grass) || []) { const t = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) t.push([x, y]); tilePatch({ kind: 'drygrass', tiles: t, life: Infinity }); }
    reset(m);
  }
  function addCollider(m, c) {
    m.colliders = m.colliders.concat([c]);   // a new array: maps.js colliderGrid rebuilds on the reference change
    if (m._gateCol && m._gateCol.indexOf(c) < 0) m._gateCol.push(c);   // syncGates / closeGate restore from this snapshot
  }
  // respawn / re-entry (a new G.trig): transient states reset, lasting ones come back from the save, transient patches clear
  function reset(m) {
    S.trig = G.trig; S.pip = null; S.fire = null; S.hits = {}; S.cardT = {};
    for (let i = 0; i < M.pt.length; i++) if (M.pt[i] && M.life[i] !== Infinity) clearTile(i % M.W, (i / M.W) | 0);
    const sv = saved(m);
    for (const o of S.list.concat(S.dawn)) {
      const def = o.rx.def, want = (o.src.state != null && def.states[o.src.state] ? o.src.state : def.start), keep = sv[o.rx.id];
      o.rx.state = null; o.rx.build = 0; o.x = o.rx.home.x; o.y = o.rx.home.y;
      apply(o, keep && def.states[keep] && def.states[keep].lasting ? keep : want, true);
    }
  }
  function ensure() {
    const m = G.map; if (!m || !G.prog) return null;
    if (S.map !== m || m._ew !== M) attach(m);
    else if (S.trig !== G.trig) reset(m);
    return m;
  }

  // ---- states ---------------------------------------------------------------------------------------------------------------------
  function find(id) { for (const o of S.list) if (o.rx.id === id) return o; for (const o of S.dawn) if (o.rx.id === id) return o; return null; }
  function setState(o, next, quiet) { if (typeof o === 'string') o = find(o); if (!o || !o.rx || !o.rx.def.states[next] || o.rx.state === next) return false; apply(o, next, quiet); return true; }
  function apply(o, next, quiet) {
    const R = o.rx, st = R.def.states[next], m = G.map; R.state = next; R.t0 = G.t; R.build = 0;
    if (typeof verbArt === 'function' && R.type !== 'shrine') { o.img = verbArt(R.type, next); o.ax = o.img.width / 2; o.ay = o.img.height - 1; }
    o.gone = !!st.gone;
    if (R.col) { const was = R.col.gone; R.col.gone = !st.solid || !!st.gone; if (was !== R.col.gone) m.colliders = m.colliders.slice(); }
    if (st.lasting && m) saved(m)[R.id] = next;
    if (st.effect) effect(o, st.effect, quiet);
    if (!quiet) {
      const col = ELC(R.type === 'shrine' ? 'holy' : (prevEl(o) || 'holy'));
      burst(o.x, o.y, (o.z || 0) + 0.8, 10, [col, '#ffffff'], 2, { glow: true });
      if (typeof sfx === 'function') sfx(st.gone ? 'boom' : 'pickup');
    }
  }
  const prevEl = o => o.rx.lastEl || null;
  // one hit on one receiver; returns true when the element was accepted (it may still need more build)
  function hitOne(o, el, w, oil) {
    const R = o.rx, st = R.def.states[R.state]; if (!st || !st.el || !accepts(st.el.accept, el)) return false;
    if (oil && st.el.oil === false) return false;
    if (G.t - R.buildT > EWN.decayAfter) R.build = Math.max(0, R.build - EWN.decay * (G.t - R.buildT - EWN.decayAfter));
    R.build += EWN.build * w; R.buildT = G.t; R.lastEl = el;
    (S.hits[R.id] || (S.hits[R.id] = {}))[el] = G.t; S.hits[R.id]._any = G.t;
    if (R.build + 1e-6 >= (st.el.build || EWN.build)) setState(o, st.to);
    else burst(o.x, o.y, (o.z || 0) + 0.8, 3, [ELC(el), '#ffffff'], 1.2);
    return true;
  }
  // shape: null = circle; { a, arc } = a cone from (x, y); { a, len } = a line of width r
  function inShape(o, x, y, r, sh) {
    const pad = EWN.hitPad, dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy);
    if (!sh) return d < r + pad;
    if (sh.len != null) return segDist(o.x, o.y, x, y, x + Math.cos(sh.a) * sh.len, y + Math.sin(sh.a) * sh.len) < r + pad;
    if (d > r + pad) return false;
    return d < pad + 0.3 || Math.abs(angDiff(sh.a, Math.atan2(dy, dx))) <= sh.arc / 2 + Math.atan2(pad, d);
  }
  function hitReceivers(x, y, r, el, w, sh, oil) {
    const m = ensure(); if (!m || !el) return 0;
    let n = 0;
    for (const o of S.list) if (o.rx.def.states[o.rx.state].el && inShape(o, x, y, r, sh) && hitOne(o, el, w == null ? 1 : w, oil)) n++;
    if (!oil || w >= 1) worldTiles(x, y, r, el, sh);
    else if (oil) worldTiles(x, y, Math.min(r, 0.8), el, sh);
    return n;
  }
  // the hit from a game.js hit path: resolves the element like damageEnemy, plus the Dream Oil coat on basic hits
  function heroEl(o, c) {
    const p = G.player;
    let wel = 'slash'; try { wel = item('weapon', p.gear.weapon).element || 'slash'; } catch (e) { /* no weapon row */ }
    return (o && o.el) || (o && o.dot ? 'fire' : c ? c.el : wel) || 'slash';
  }
  function fromHit(x, y, r, o, sh) {
    if (!G.map || !G.player) return 0;
    o = o || {}; const c = o.cast !== undefined ? o.cast : (typeof CAST !== 'undefined' ? CAST : null);
    if (o.dot) return 0;
    let n = hitReceivers(x, y, r, heroEl(o, c), 1, sh, false);
    const p = G.player, oil = p.oil && p.oil.until > G.t ? p.oil.el : null;
    if (oil && (!c || c.basic)) n += hitReceivers(x, y, r, oil, EWN.oil, sh, true);
    return n;
  }
  // a friendly projectile this frame: one hit per receiver per shot; a solid receiver stops it (unless it pierces)
  function proj(q) {
    if (!S.list.length || G.map !== S.map) return false;
    for (const o of S.list) {
      const R = o.rx; if (o.gone || dist(q.x, q.y, o.x, o.y) > (q.r || 0.25) + Math.max(0.3, R.def.r)) continue;
      const hs = q._rx || (q._rx = new Set()); if (hs.has(o)) continue; hs.add(o);
      const c = q.cast, el = q.el && q.reflected ? q.el : heroEl({}, c);
      hitOne(o, el, 1, false);
      const p = G.player; if (p.oil && p.oil.until > G.t && (!c || c.basic)) hitOne(o, p.oil.el, EWN.oil, true);
      if (R.col && !R.col.gone && !(q.pierce > 0)) return true;
    }
    return false;
  }

  // ---- effects on entering a state (names in RX) -----------------------------------------------------------------------------------
  function effect(o, kind, quiet) {
    const m = G.map, s = o.src, tx = Math.floor(o.x), ty = Math.floor(o.y);
    if (kind === 'chain') {   // a live conduit arcs to dead conduits within chainR
      if (quiet) return;
      for (const q of S.list) if (q !== o && q.rx.type === 'conduit' && q.rx.state === 'dead' && dist(q.x, q.y, o.x, o.y) <= EWN.chainR) {
        fx({ type: 'lightning', pts: [[o.x, o.y, (o.z || 0) + 1.6], [q.x, q.y, (q.z || 0) + 1.6]], life: 0.3, col: '#fff07a' });
        const qq = q; delay(0.12, () => { if (qq.rx.state === 'dead') hitOne(qq, 'lightning', 1, false); });
      }
    } else if (kind === 'drift') {   // the raft drifts to `to` and its footprint becomes walkable
      const to = s.to || { x: o.x + 3, y: o.y };
      const land = () => { o.x = +to.x; o.y = +to.y; o.z = tileH(m, o.x, o.y); o.key = depthKey(m, o.x, o.y, o.z); const t = []; const fx0 = Math.floor(+to.x - 0.5), fy0 = Math.floor(+to.y - 0.5); for (let y = fy0; y < fy0 + 2; y++) for (let x = fx0; x < fx0 + 2; x++) t.push([x, y]); tilePatch({ kind: 'raft', tiles: t, life: Infinity }); };
      if (quiet) land(); else { o.rx.drift = { x0: o.x, y0: o.y, t0: G.t, dur: 1.5, land }; }
    } else if (kind === 'vine') {   // the vine bridge over the `bridge` rect
      const b = s.bridge || [tx, ty - 2, 1, 2], t = [];
      for (let y = b[1]; y < b[1] + b[3]; y++) for (let x = b[0]; x < b[0] + b[2]; x++) t.push([x, y]);
      tilePatch({ kind: 'vine', tiles: t, life: Infinity });
      if (!quiet) for (const [x, y] of t) burst(x + 0.5, y + 0.5, 0.3, 4, ['#3f8b63', '#94cf7f'], 1.4);
    } else if (kind === 'scorch') {
      tilePatch({ kind: 'scorch', tiles: [[tx, ty]], life: Infinity });
      if (!quiet && typeof STATUS !== 'undefined') STATUS.setTile(tx, ty, 'burning', 1.6);
    } else if (kind === 'thaw') {
      if (!quiet && typeof STATUS !== 'undefined') for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (typeAt(m, x, y)) STATUS.setTile(x, y, 'wet', 4);
      if (!quiet) burst(o.x, o.y, 0.8, 16, ['#bff4ff', '#ffffff', '#5fd4ff'], 2.4);
    } else if (kind === 'shatter') {
      if (!quiet) { burst(o.x, o.y, 1, 22, ['#e8fbff', '#9fe8ff', '#ffffff'], 3.2); if (typeof shake === 'function') shake(3); }
    } else if (kind === 'obsidian') {
      const t = []; for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (typeAt(m, x, y) && (x === tx || y === ty)) t.push([x, y]);
      tilePatch({ kind: 'obsidian', tiles: t, life: Infinity });
    } else if (kind === 'gust') {
      if (!quiet && typeof WIND !== 'undefined') WIND.emit({ kind: 'zone', x: o.x, y: o.y, dir: 0, r: 3, force: 1.6, life: o.rx.def.states.spinning.life, by: 0 });
    } else if (kind === 'disperse') {
      if (!quiet) burst(o.x, o.y, 1.2, 18, ['#e8e0f4', '#c8c0e0'], 2.6);
    }
  }

  // ---- tile patches -------------------------------------------------------------------------------------------------------------------
  const idx = (x, y) => y * M.W + x;
  function dirtyChunk(m, x, y) { const C = EWN.chunk; (m._ew || M).dirty.add(Math.floor(x / C) + ',' + Math.floor(y / C)); }
  function setTile(x, y, kind, life) {
    if (x < 0 || y < 0 || x >= M.W || y >= M.H) return false;
    const i = idx(x, y), m = G.map, was = PATCH_KINDS[M.pt[i]];
    M.pt[i] = PK[kind]; M.life[i] = life === Infinity ? Infinity : G.t + life; M.born[i] = G.t;
    if (kind === 'ice') S.ice++; if (was === 'ice') S.ice--;
    if (kind === 'rime') S.rime++; if (was === 'rime') S.rime--;
    if (M.water[i]) m.block[y][x] = !PATCH_WALK[kind];
    dirtyChunk(m, x, y);
    return true;
  }
  function clearTile(x, y) {
    const i = idx(x, y), m = G.map, was = PATCH_KINDS[M.pt[i]]; if (!was) return;
    if (was === 'ice') S.ice--; if (was === 'rime') S.rime--;
    M.pt[i] = 0; M.life[i] = 0;
    if (M.water[i]) m.block[y][x] = true;
    dirtyChunk(m, x, y);
  }
  // tilePatch{ kind, tiles, life }: the tiles that took it (caps: ice 24, rime 24 on a map; ice only on water, rime only on ground)
  function tilePatch(P) {
    const m = G.map; if (!m || !M) return 0;
    let n = 0;
    for (const [x, y] of P.tiles || []) {
      if (x < 0 || y < 0 || x >= M.W || y >= M.H) continue;
      const i = idx(x, y), cur = PATCH_KINDS[M.pt[i]], wet = M.water[i];
      if (P.kind === 'ice') { if (!wet || (cur && cur !== 'ice')) continue; if (cur !== 'ice' && S.ice >= EWN.iceCap) continue; }
      if (P.kind === 'rime') { if (wet || !m.type[y][x] || m.type[y][x] === 'pillar' || (cur && cur !== 'rime')) continue; if (cur !== 'rime' && S.rime >= EWN.rimeCap) continue; }
      if ((P.kind === 'vine' || P.kind === 'raft') && !wet) continue;
      if (P.kind === 'drygrass' && (!m.type[y][x] || wet)) continue;
      setTile(x, y, P.kind, P.life == null ? 10 : P.life); n++;
    }
    return n;
  }
  const kindAt = (x, y) => (M && x >= 0 && y >= 0 && x < M.W && y < M.H ? PATCH_KINDS[M.pt[idx(x, y)]] : '');
  // element hits on the ground: frost freezes water (ice), fire lights dry grass and thaws ice / rime
  function worldTiles(x, y, r, el, sh) {
    if (el !== 'fire' && el !== 'frost') return;
    const R = Math.min(2.5, Math.max(0.8, r)), cx = sh && sh.len != null ? x + Math.cos(sh.a) * sh.len / 2 : sh ? x + Math.cos(sh.a) * r * 0.5 : x, cy = sh && sh.len != null ? y + Math.sin(sh.a) * sh.len / 2 : sh ? y + Math.sin(sh.a) * r * 0.5 : y;
    const RR = sh && sh.len != null ? Math.max(R, sh.len / 2) : sh ? Math.max(0.8, r * 0.6) : R;
    if (el === 'frost') {
      const t = []; for (let j = Math.floor(cy - RR); j <= Math.floor(cy + RR); j++) for (let i = Math.floor(cx - RR); i <= Math.floor(cx + RR); i++) if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= RR + 0.35) t.push([i, j]);
      tilePatch({ kind: 'ice', tiles: t, life: EWN.iceLife });
      return;
    }
    for (let j = Math.floor(cy - RR); j <= Math.floor(cy + RR); j++) for (let i = Math.floor(cx - RR); i <= Math.floor(cx + RR); i++) {
      const k = kindAt(i, j); if ((k === 'ice' || k === 'rime') && Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= RR + 0.35) clearTile(i, j);
    }
    ignite(x, y);
  }
  // ---- grass fire --------------------------------------------------------------------------------------------------------------------
  function ignite(x, y) {
    if (S.fire || !M) return false;   // one fire per map
    let best = null, bd = EWN.fireR + 1e-6;
    for (let j = Math.floor(y - 1); j <= Math.floor(y + 1); j++) for (let i = Math.floor(x - 1); i <= Math.floor(x + 1); i++) {
      if (kindAt(i, j) !== 'drygrass') continue;
      const d = Math.hypot(clamp(x, i, i + 1) - x, clamp(y, j, j + 1) - y);   // distance to the tile's square
      if (d <= bd) { bd = d; best = [i, j]; }
    }
    if (!best) return false;
    S.fire = { n: 0, burning: [], stepT: 0, tickT: 0 }; S.starts++;
    burnTile(best[0], best[1]);
    if (typeof sfx === 'function') sfx('fire');
    return true;
  }
  function burnTile(x, y) {
    const F = S.fire; setTile(x, y, 'burning', EWN.burnT); F.n++; F.burning.push({ x, y, t0: G.t });
    S.maxBurn = Math.max(S.maxBurn, F.burning.length);
    if (typeof STATUS !== 'undefined') STATUS.setTile(x, y, 'burning', EWN.burnT + 0.3);
  }
  function updateFire(dt) {
    const F = S.fire; if (!F) return;
    for (let k = F.burning.length - 1; k >= 0; k--) { const b = F.burning[k]; if (G.t - b.t0 >= EWN.burnT) { F.burning.splice(k, 1); setTile(b.x, b.y, 'scorch', EWN.scorchT); } }
    F.stepT += dt;
    while (F.stepT >= EWN.fireStep) {
      F.stepT -= EWN.fireStep;
      if (F.n >= EWN.fireCap || F.burning.length >= EWN.fireEmit || !F.burning.length) break;
      const D = [[1, 0], [0, 1], [-1, 0], [0, -1]], s0 = F.n % 4; let lit = false;
      for (let b = F.burning.length - 1; b >= 0 && !lit; b--) for (let d = 0; d < 4 && !lit; d++) { const [dx, dy] = D[(s0 + d) % 4], nx = F.burning[b].x + dx, ny = F.burning[b].y + dy; if (kindAt(nx, ny) === 'drygrass') { burnTile(nx, ny); lit = true; } }
      if (!lit) break;
    }
    F.tickT -= dt;
    if (F.tickT <= 0) {   // burning tiles: Burning on enemies within fireR, fire on receivers beside them (never the hero)
      F.tickT = 0.5;
      for (const b of F.burning) {
        const cx = b.x + 0.5, cy = b.y + 0.5;
        for (const e of G.enemies) if (!e.dead && !e.dummy && e.spawnT <= 0 && dist(e.x, e.y, cx, cy) < EWN.fireR + e.r) { applyStatus(e, 'burning', 3, 'fire'); e.burnTick = e.burnTick || 0.5; }
        for (const o of S.list) if (dist(o.x, o.y, cx, cy) < EWN.fireR + EWN.hitPad) hitOne(o, 'fire', 1, false);
      }
    }
    if (!F.burning.length) S.fire = null;   // burnt out: the map may burn again (one fire at a time)
  }
  function expire() {
    if (!M) return;
    for (let i = 0; i < M.pt.length; i++) if (M.pt[i] && M.life[i] !== Infinity && M.life[i] <= G.t) {
      const k = PATCH_KINDS[M.pt[i]], x = i % M.W, y = (i / M.W) | 0;
      if (k === 'burning') continue;   // the fire owns its tiles (updateFire)
      if (k === 'scorch') { const r = rec(), inGrass = ((r && r.grass) || []).some(([x0, y0, w, h]) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h); if (inGrass) { setTile(x, y, 'drygrass', Infinity); continue; } }   // the grass grows back
      clearTile(x, y);
    }
  }

  // ---- Pip's charge -----------------------------------------------------------------------------------------------------------------
  const ELC = el => (typeof ELFX !== 'undefined' && ELFX.rows && ELFX.rows[el] ? ELFX.rows[el].ramp[2] : '#ffffff');
  const sourceEl = o => { const st = o.rx && o.rx.def.states[o.rx.state]; return st && st.source && !st.rest ? st.source : null; };
  const PIP_USE = { kind: 'pip', reach: 1.6, on: o => !!(sourceEl(o) && G.pip && !S.pip), text: o => 'Pip: carry ' + sourceEl(o), fn: o => take(o) };
  function take(o, el) {
    ensure(); const P = G.pip; el = el || sourceEl(o); if (!P || !el || S.pip) return false;
    S.pip = { el, t0: G.t, src: o, target: null, k: 0, seekT: 0 };
    const st = o.rx.def.states[o.rx.state]; if (st.take) setState(o, st.take);
    burst(P.x, P.y, P.z, 12, [ELC(el), '#ffffff'], 2, { glow: true });
    say('Pip carries ' + el); if (typeof sfx === 'function') sfx('blink');
    return true;
  }
  function onRest(x, y) { if (!ensure()) return; for (const o of S.dawn) if (dist(o.x, o.y, x, y) < 2.5 && !S.pip) { take(o, 'holy'); return; } }
  function pipTarget() {
    const P = G.pip, C = S.pip; let best = null, bd = EWN.pipR + 1e-6;
    for (const o of S.list) { if (o === C.src || o.gone) continue; const st = o.rx.def.states[o.rx.state]; if (!st.el || !accepts(st.el.accept, C.el)) continue; const d = dist(P.x, P.y, o.x, o.y); if (d <= bd) { bd = d; best = o; } }
    return best;
  }
  function updatePipCharge(dt) {
    const C = S.pip, P = G.pip; if (!C || !P) return;
    if (G.t - C.t0 > EWN.pipLife) { S.pip = null; say("Pip's charge fades"); return; }
    if (Math.random() < dt * 14) addPart({ x: P.x + frand(-0.2, 0.2), y: P.y + frand(-0.2, 0.2), z: P.z + frand(-0.2, 0.2), vx: 0, vy: 0, vz: 0.6, life: 0.5, t: 0, col: ELC(C.el), grav: 0, size: 1, glow: true });
    if (!C.target) { C.seekT -= dt; if (C.seekT > 0) return; C.seekT = 0.2; C.target = pipTarget(); if (!C.target) return; C.from = { x: P.x, y: P.y, z: P.z }; C.k = 0; C.dur = Math.max(0.25, dist(P.x, P.y, C.target.x, C.target.y) / EWN.pipSpeed); }
    const o = C.target; C.k = Math.min(1, C.k + dt / C.dur);
    const e = C.k * C.k * (3 - 2 * C.k);
    P.x = lerp(C.from.x, o.x, e); P.y = lerp(C.from.y, o.y, e); P.z = lerp(C.from.z, (o.z || 0) + 1.6, e);
    if (C.k >= 1) {
      S.pip = null; S.lastDelivery = { id: o.rx.id, el: C.el, t: G.t };
      fx({ type: 'ring', x: o.x, y: o.y, r: 0.9, col: ELC(C.el), life: 0.4 });
      hitOne(o, C.el, 1, false);
    }
  }
  const pipCol = () => (S.pip ? ELC(S.pip.el) : null);

  // ---- Dream Oil ------------------------------------------------------------------------------------------------------------------------
  function coat(p, el, dur) {
    if (!p || !el) return false;
    p.oil = { el, until: G.t + (dur || (typeof DREAM_OIL !== 'undefined' ? DREAM_OIL.dur : 60)), t0: G.t };
    burst(p.x, p.y, p.z + 1.2, 14, [ELC(el), '#ffffff'], 2, { glow: true });
    return true;
  }
  const OIL_STATUS = { fire: 'burning', frost: 'chilled', lightning: 'jolted', nature: 'poisoned', arcane: 'marked', holy: 'smitten', wind: 'buffeted' };
  // the coat's build on an enemy (the ladder numbers: 25 x 0.3 a basic hit, tier 1 at 50, decay 20/s after 1.5 s)
  function oilHit(e, el) {
    const B = e.oilB || (e.oilB = { v: 0, t: 0, el });
    if (B.el !== el) { B.el = el; B.v = 0; }
    if (G.t - B.t > EWN.decayAfter) B.v = Math.max(0, B.v - EWN.decay * (G.t - B.t - EWN.decayAfter));
    B.v += EWN.build * EWN.oil; B.t = G.t;
    if (B.v < 50) return false;
    B.v = 0;
    if (el === 'nature') poisonEnemy(e, 1, null);
    else if (el === 'arcane') markEnemy(e, 1);
    else if (el === 'fire') { applyStatus(e, 'burning', 3, 'fire'); e.burnTick = e.burnTick || 0.5; }
    else applyStatus(e, OIL_STATUS[el] || 'chilled', el === 'frost' ? 2 : 2.5, el);
    return true;
  }
  const STONE_USE = { kind: 'stone', reach: 1.7, on: () => true,
    text: o => { const L = stoneOils(o), el = L[(o.oilI || 0) % L.length], pr = stonePrice(o); return `Dream Oil: ${el} (${pr ? pr + ' Dust' : 'free'})`; },
    fn: o => { const L = stoneOils(o), el = L[(o.oilI || 0) % L.length]; if (typeof buyOil === 'function' ? buyOil(G.player, el, stonePrice(o)) === '' : coat(G.player, el)) o.oilI = (o.oilI || 0) + 1; } };
  const stoneOils = o => (o.src.oils && o.src.oils.length ? o.src.oils : typeof DREAM_OIL !== 'undefined' ? Object.keys(DREAM_OIL.rows) : ['fire']);
  const stonePrice = o => (o.src.price != null ? +o.src.price : typeof DREAM_OIL !== 'undefined' ? DREAM_OIL.price : 15);

  // ---- per frame (game.js updateTriggers) ----------------------------------------------------------------------------------------------
  function update(dt) {
    const m = ensure(); if (!m) return;
    for (const o of S.list) {
      const R = o.rx, st = R.def.states[R.state];
      if (st.life && G.t - R.t0 >= st.life) setState(o, st.back, false);
      if (R.drift) { const D = R.drift, k = Math.min(1, (G.t - D.t0) / D.dur), to = o.src.to || { x: D.x0 + 3, y: D.y0 }; o.x = lerp(D.x0, +to.x, k); o.y = lerp(D.y0, +to.y, k); o.key = depthKey(m, o.x, o.y, o.z || 0); if (k >= 1) { R.drift = null; D.land(); } }
      if (R.type === 'windmill' && R.state === 'spinning' && typeof verbArt === 'function') o.img = verbArt('windmill', (Math.floor(G.t * 10) & 1) ? 'spinning' : 'spinning2');
      if (o.gone || Math.random() > dt * 5) continue;   // ambient motes: embers over a flame, steam over a vent, sparks on a live conduit
      const fl = (R.type === 'torch' || R.type === 'brazier') && R.state === 'lit', vent = R.type === 'vent' && R.state === 'venting', live = R.type === 'conduit' && R.state === 'live';
      if (fl || vent || live) addPart({ x: o.x + frand(-0.15, 0.15), y: o.y + frand(-0.15, 0.15), z: (o.z || 0) + (R.type === 'torch' ? 2.4 : vent ? 0.3 : 1.8), vx: frand(-0.2, 0.2), vy: frand(-0.2, 0.2), vz: vent ? 1.6 : 1, life: vent ? 1.1 : 0.6, t: 0, col: vent ? '#d8d0e0' : live ? '#fff07a' : '#ffb04a', grav: 0, size: 1, glow: !vent });
    }
    S.windT -= dt;
    if (S.windT <= 0 && typeof WIND !== 'undefined' && WIND.active && WIND.active()) {   // wind receivers read the field (Gale, gusts)
      S.windT = 0.1;
      for (const o of S.list) { const st = o.rx.def.states[o.rx.state]; if (st.el && accepts(st.el.accept, 'wind') && WIND.sample(o.x, o.y, WIND.now()).s > 0.6) hitOne(o, 'wind', 1, false); }
    }
    updateFire(dt);
    S.expT -= dt; if (S.expT <= 0) { S.expT = 0.25; expire(); }
    updatePipCharge(dt);
    const p = G.player;
    if (p && p.oil) {
      if (p.oil.until <= G.t) { p.oil = null; say('The Dream Oil wears off'); }
      else if ((S.coatT -= dt) <= 0) { S.coatT = 0.09; const a = p.aim || 0; addPart({ x: p.x + Math.cos(a) * 0.45, y: p.y + Math.sin(a) * 0.45, z: p.z + 1.1 + frand(0, 0.5), vx: 0, vy: 0, vz: 0.5, life: 0.45, t: 0, col: ELC(p.oil.el), grav: 0, size: 1, glow: true }); }
    }
  }
  // ---- conditions (game.js triggerCondition) ---------------------------------------------------------------------------------------------
  function condition(tr, w) {
    if (!ensure()) return false;
    if (w.type === 'object_state') { const ids = w.ids || [w.id]; return ids.length > 0 && ids.every(id => { const o = find(id); return o && o.rx.state === w.state; }); }
    if (w.type === 'element_hit') { const h = S.hits[w.id], t = h && (w.el ? h[w.el] : h._any); if (t == null || t <= (S.cardT[tr.id] != null ? S.cardT[tr.id] : -1)) return false; S.cardT[tr.id] = t; return true; }
    return false;
  }
  // ---- render support: the dirty layer chunks, at most EWN.flush rebuilt a frame (render.js drawPatches calls this) ----------------------
  function flush(build) { if (!M || !M.dirty.size) return 0; let n = 0; for (const k of M.dirty) { if (n >= EWN.flush) break; M.dirty.delete(k); build(k); n++; } return n; }
  function stats() {
    return { receivers: S.list.length, dawn: S.dawn.length, fire: S.fire ? { n: S.fire.n, burning: S.fire.burning.length } : null, fireStarts: S.starts, maxBurning: S.maxBurn,
      ice: S.ice, rime: S.rime, pip: S.pip ? { el: S.pip.el, target: S.pip.target && S.pip.target.rx.id } : null, dirty: M ? M.dirty.size : 0, chunks: M ? M.chunks.size : 0 };
  }
  return { RX, N: EWN, KINDS: PATCH_KINDS, update, condition, hitReceivers, fromHit, proj, setState, tilePatch, dirtyChunk, kindAt, ignite, take, onRest, coat, oilHit,
    pipCol, find, flush, stats, ensure, list: () => S.list, dawn: () => S.dawn, get layer() { return M; } };
})();
// the spec names (docs/design/elements-statuses.md "World verbs")
const hitReceivers = (x, y, r, el, w) => EW.hitReceivers(x, y, r, el, w);
const setState = (o, s) => EW.setState(o, s);
const tilePatch = P => EW.tilePatch(P);
const dirtyChunk = (m, x, y) => EW.dirtyChunk(m, x, y);
