'use strict';
// ---------------------------------------------------------------------------
// tools/maps/gen.js  --  reusable map-generation library for My Dreamy RPG.
//
// Produces records in the exact WORLD_DATA map format used by js/world.js:
//   { name, sub, theme, W, H, tiles[], heights[], start{x,y}, portals[], objects[],
//     objective, sigil?, triggers[] }
//
// Pipeline (see MapGen#build):
//   1. features  : rooms (discs/blobs) + winding paths (Catmull-Rom through waypoints) + lobes
//   2. coast     : distance field from the features, thresholded with fBm -> irregular island
//   3. terraces  : level of nearest feature (+noise) quantised to `step`  -> cliffs are walls
//   4. profiles  : each path gets a Lipschitz-smoothed height profile -> ramps / stairs where it
//                  crosses levels; rooms are flat plateaus
//   5. water     : rivers (monotone descending, bridged where paths cross), bridges to islets
//   6. props     : scatter with density masks (edge / cluster / path clearance / fight rooms)
//   7. validate  : flood-fill reachability honouring the engine rules (dh<=1.05, colliders)
//
// Engine facts this relies on (js/maps.js, js/game.js):
//   * walkable <=> tile exists, is not 'w' / 'c', and |h - fromH| <= 1.05  => stairs are cosmetic, a 1-step
//     ramp is walkable, a >=2 step is a cliff wall.
//   * props with r>0 are colliders; unknown object kinds are silently dropped by the engine.
// ---------------------------------------------------------------------------

// ------------------------------- rng / noise -------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const f = mulberry32(seed >>> 0);
  const r = {
    f,
    range: (a = 0, b = 1) => a + (b - a) * f(),
    int: (a, b) => Math.floor(a + (b - a + 1) * f()),
    pick: arr => arr[Math.floor(f() * arr.length)],
    chance: p => f() < p,
    sign: () => (f() < 0.5 ? -1 : 1),
    weighted(items, key = 'w') {
      let tot = 0; for (const it of items) tot += it[key];
      let x = f() * tot;
      for (const it of items) { x -= it[key]; if (x <= 0) return it; }
      return items[items.length - 1];
    },
  };
  return r;
}
function ihash(x, y, s) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 982451653;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function makeNoise(seed) {
  const sm = t => t * t * (3 - 2 * t);
  const v = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const a = ihash(xi, yi, seed), b = ihash(xi + 1, yi, seed), c = ihash(xi, yi + 1, seed), d = ihash(xi + 1, yi + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm = (x, y, oct = 4) => {
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < oct; i++) { s += a * v(x + i * 17.3, y - i * 9.1); n += a; x *= 2.03; y *= 2.03; a *= 0.5; }
    return s / n;
  };
  return { v, fbm };
}

// ------------------------------- small helpers -----------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const grid = (W, H, v) => Array.from({ length: H }, () => Array(W).fill(v));
const r2 = v => Math.round(v * 100) / 100;

class Heap {   // binary min-heap on [key, payload]
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, v) {
    const a = this.a; a.push([k, v]); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}
// multi-source Dijkstra over an 8-connected grid. srcs: [{i,j,d0,lvl}] ; cost(i,j) -> multiplier
function distField(W, H, srcs, cost) {
  const D = new Float32Array(W * H).fill(1e9), L = new Int16Array(W * H), S = new Int32Array(W * H).fill(-1);
  const hp = new Heap();
  for (const s of srcs) { const k = s.j * W + s.i; if (s.d0 < D[k]) { D[k] = s.d0; L[k] = s.lvl || 0; S[k] = s.id == null ? -1 : s.id; hp.push(s.d0, k); } }
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  while (hp.size) {
    const [d, k] = hp.pop(); if (d > D[k]) continue;
    const i = k % W, j = (k / W) | 0;
    for (const [dx, dy, w] of NB) {
      const ni = i + dx, nj = j + dy; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni, nd = d + w * (cost ? cost(ni, nj) : 1);
      if (nd < D[nk]) { D[nk] = nd; L[nk] = L[k]; S[nk] = S[k]; hp.push(nd, nk); }
    }
  }
  return { D, L, S };
}

// Catmull-Rom through points, sampled every `step` tiles. Returns [{x,y,seg}] (seg = index of the starting control point).
function catmull(pts, step) {
  const out = [];
  const P = i => pts[clamp(i, 0, pts.length - 1)];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y), n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), seg: i });
    }
  }
  const l = pts[pts.length - 1]; out.push({ x: l.x, y: l.y, seg: pts.length - 1 });
  return out;
}

// ------------------------------ prop catalogue -----------------------------
// collider radius r and default spacing sp (min centre distance to other props, averaged between the two)
const PROP = {
  tree_round: { r: 0.32, sp: 1.6 }, tree_poplar: { r: 0.32, sp: 1.3 }, tree_blossom: { r: 0.32, sp: 1.8 }, tree_teal: { r: 0.32, sp: 1.5 },
  tree_oak: { r: 0.34, sp: 1.8 }, tree_birch: { r: 0.26, sp: 1.0 },   // §29 G2 forest broadleaves (js/maps.js OBJ_TYPES)
  tree_dead: { r: 0.3, sp: 1.4 }, bush: { r: 0.2, sp: 0.8 }, rock: { r: 0.28, sp: 0.9 }, rock_dark: { r: 0.28, sp: 0.9 },
  grass: { r: 0, sp: 0.45 }, mushroom: { r: 0, sp: 0.5 }, lantern: { r: 0.12, sp: 2 }, lantern_blue: { r: 0.12, sp: 2 },
  crystal: { r: 0.25, sp: 1 }, crystal_violet: { r: 0.25, sp: 1 }, sign: { r: 0.15, sp: 1 }, shrine: { r: 0.35, sp: 2 }, brazier: { r: 0.3, sp: 2 },
  house: { r: 0, sp: 3 }, pine_giant: { r: 0.45, sp: 2.8 }, pine: { r: 0.32, sp: 1.5 }, pine_young: { r: 0.22, sp: 0.9 },
  mushroom_red: { r: 0, sp: 0.5 }, moss: { r: 0, sp: 1.0 }, log: { r: 0.45, sp: 1.5 }, stump: { r: 0.3, sp: 0.9 }, sunbeam: { r: 0, sp: 3 },
  fox: { r: 0, sp: 3 }, rabbit: { r: 0, sp: 2 },
  fishspot: { r: 0, sp: 3 }, gate: { r: 0, sp: 1.5 }, hidden: { r: 0, sp: 1.5 }, keydoor: { r: 0, sp: 1.5 }, lever: { r: 0, sp: 1 },
  warpdoor: { r: 0, sp: 2 },
};
// Object kinds the game does not know yet are written with a stand-in 't' and the intended kind in 'role'
// (the engine drops unknown 't', so stand-ins keep the map playable).  Only used with --compat; the default (kinds 'future') writes the
// real names and maps the few the engine still lacks through ENGINE_KIND below.
const STAND_IN = {
  chest: { t: 'crystal', tier: 'wood' }, chest_silver: { t: 'crystal', tier: 'silver' }, chest_gold: { t: 'crystal_violet', tier: 'gold' },
  tablet: { t: 'sign' }, rune_cache: { t: 'crystal_violet' }, gem_cache: { t: 'crystal_violet' }, elder_stone: { t: 'crystal_violet' },
  lever: { t: 'sign' }, tower: { t: 'pine_giant' },
  // interactive blockers: omitted in compat mode (the passage is simply open) -- engine must support them in future mode
  gate: { omit: true }, hidden: { omit: true }, keydoor: { omit: true }, fishspot: { omit: true },
};
// --kinds=future (the default now that the engine has them): names the engine has no object type for are written as the
// closest real kind, with the planned name kept in `role`.  chest_* become real chests (tier -> rarity floor).
const ENGINE_KIND = {
  chest_silver: { t: 'chest', tier: 'silver' }, chest_gold: { t: 'chest', tier: 'gold' },
  gem_cache: { t: 'crystal_violet' }, rune_cache: { t: 'crystal_violet' },
  elder_stone: { t: 'tablet', title: 'Elder Stone' }, tower: { t: 'pine_giant' },
};
const COMPAT_ENEMY = { shaman: 'ogre', mossjaw: 'troll', bramblehorn: 'troll' };

// ------------------------------- trigger cards -----------------------------
// Builders producing exactly the card format used in js/world.js
const T = {
  banner: (title, sub, boss) => Object.assign({ type: 'banner', title, sub: sub || '' }, boss ? { boss: true } : {}),
  // x, y: where Pip points (§28; game.js pipPoint), emitted only when given
  objective: (text, x, y) => Object.assign({ type: 'objective', text }, x != null ? { x: r2(x), y: r2(y) } : {}),
  noun: noun => ({ type: 'noun', noun }),   // §28 a HUD piece fades in (game.js hudNoun)
  gear: (item, x, y, extra) => Object.assign({ type: 'gear', item, x: r2(x), y: r2(y) }, extra || {}),   // §28 a first-kit piece lying in the world (items.js gearAction)
  message: text => ({ type: 'message', text }),
  heal: pct => ({ type: 'heal', pct }),
  wait: seconds => ({ type: 'wait', seconds }),
  sound: name => ({ type: 'sound', name }),
  shake: power => ({ type: 'shake', power }),
  openPortal: index => ({ type: 'open_portal', index }),
  openPortalId: id => ({ type: 'open_portal', id }),   // by portal id (stable when portals are added/removed per warp mode)
  // M2c: warp within the same map (0.4 s fade, no load, no lost trigger state). `to` = { x, y } or an anchor id. The pre-warp engine ignores it.
  warp: to => ({ type: 'warp', to }),
  // inline arena (DESIGN 25.1): starts the fight, closes `gate` for it. Pre-engine: nothing (the spawn cards alone run the fight)
  arena(id, gate, x, y, r) { return T.arenaMode === 'arena' ? [{ type: 'arena', id, gate, x: r2(x), y: r2(y), r }] : []; },
  spawn(enemy, count, x, y, radius, extra) {
    enemy = T.enemy(enemy);
    const e = Object.assign({}, extra || {}); if (e.elite && T.mode !== 'future') delete e.elite;   // planned flag: spawn elite:true
    return Object.assign({ type: 'spawn', enemy, count, x: r2(x), y: r2(y) }, radius != null ? { radius } : {}, e);
  },
  enter: (id, name, x, y, r, actions, requires) => Object.assign({ id, name, when: { type: 'enter_area', x: r2(x), y: r2(y), r } }, requires && requires.length ? { requires } : {}, { actions: actions.flat(9) }),
  mapEnter: (id, name, actions) => ({ id, name, when: { type: 'map_enter' }, actions: actions.flat(9) }),
  allDead: (id, name, requires, actions) => ({ id, name, when: { type: 'all_enemies_dead' }, requires, actions: actions.flat(9) }),
  // DIALOGUE-table line by id (js/dialogue.js; build fails on an unknown id).  Banner entries show the zone banner.
  say(id) { if (!GAME.DIALOGUE[id]) throw new Error('unknown DIALOGUE id ' + id); return { type: 'dialogue', id }; },
  // quest step (explicit index so a re-run never advances twice); done:true completes it
  step(id, step) { return { type: 'quest', id, step }; },
  done(id) { return { type: 'quest', id, done: true }; },
  // an ENCOUNTERS pack (js/enemydata.js).  packMode 'spawnPack' -> one { type:'spawnPack', id, at } card; 'spawn' -> the
  // same pack expanded into per-enemy spawn cards (anchor centre, pressure around, support behind), each tagged pack: id.
  packMode: 'spawn',
  // 'door': the engine runs warpdoor objects (js/maps.js); 'portal': same-map portal + the barrier placed in front of it (build.js --warp=)
  warpMode: 'portal',
  gutterTiles: false,   // tiles 'v' / 'k' for the void gutters (engine isGutter); else plain '.'
  arenaMode: 'plain',   // 'arena': the engine's arena / closeGate actions + open gates; 'plain': spawn cards only (build.js --arena=)
  pack(id, x, y, o = {}) {
    const pk = GAME.packs[id]; if (!pk) throw new Error('unknown pack ' + id);
    if (T.packMode === 'spawnPack') return Object.assign({ type: 'spawnPack', id, at: { x: r2(x), y: r2(y) } });   // the engine action has no press doubling; press only applies to the spawn fallback
    const snap = o.snap || ((px, py) => ({ x: px, y: py })), R = pk.roles, press = o.press || 1, out = [], a0 = o.ang != null ? o.ang : 0.6;
    const put = (e, n, r, a, rad) => { const q = snap(x + Math.cos(a) * r, y + Math.sin(a) * r); out.push(Object.assign(T.spawn(e, n, q.x, q.y, rad, o.elite && e === R.anchor ? { elite: true } : {}), { pack: id })); };
    put(R.anchor, 1, 0, a0, 0.6);
    (R.pressure || []).forEach((e, i) => put(e, press, 2.1, a0 + 2.1 + i * 2.3, 1.2));
    (R.support || []).forEach((e, i) => put(e, 1, 3.4, a0 + Math.PI + i * 0.9, 0.8));
    (R.ranged || []).forEach((e, i) => put(e, 1, 3.8, a0 + Math.PI * 1.3 + i, 0.8));
    return out;
  },
  // --- planned engine actions (mode 'future'); 'compat' falls back to existing actions ---
  mode: 'future',      // 'compat' (--compat) falls back to message cards / stand-ins for engines without these actions
  checkpoint(label) { return this.mode === 'future' ? { type: 'checkpoint', text: label || 'Checkpoint' } : { type: 'message', text: label || 'Rift shrine attuned.' }; },
  loot(rarity, count, x, y, extra) { return this.mode === 'future' ? Object.assign({ type: 'loot', rarity: rarity || 'uncommon', count: count || 1 }, x != null ? { x: r2(x), y: r2(y) } : {}, extra || {}) : { type: 'message', text: 'Treasure gleams nearby...' }; },
  quest(id, title, text, done) { return this.mode === 'future' ? Object.assign({ type: 'quest', id, title, text }, done ? { done: true } : {}) : { type: 'message', text: (title ? title + ': ' : '') + text }; },
  enemy(name) { return this.mode === 'future' ? name : (COMPAT_ENEMY[name] || name); },
  dialogue(speaker, lines) { return this.mode === 'future' ? { type: 'dialogue', speaker, lines } : { type: 'message', text: speaker + ': ' + lines.join(' ') }; },
  openGate(id) { return this.mode === 'future' ? { type: 'openGate', id } : { type: 'sound', name: 'portal' }; },
  timer: (id, name, seconds, after, actions, requires) => Object.assign({ id, name, when: { type: 'timer', seconds, after } }, requires ? { requires } : {}, { actions }),
};

const GAME = require('./gamedata.js');

// ===================================== MapGen ====================================
class MapGen {
  constructor(o) {
    this.id = o.id; this.name = o.name || o.id; this.sub = o.sub || ''; this.theme = o.theme || 'forest';
    this.W = o.W; this.H = o.H; this.seed = o.seed || 1;
    this.step = o.step || 2;            // height spacing between terraces (>=2 so a terrace edge is a cliff)
    this.pad = o.pad || 8;              // typical land margin around features
    this.slope = o.slope || 0.6;        // max profile slope along a path (height units per tile)
    this.objective = o.objective || '';
    this.amp = o.amp != null ? o.amp : 1.6;   // terrace noise amplitude away from paths
    this.kinds = o.kinds || 'future'; this.level = o.level || null;
    this.rng = makeRng(this.seed);
    this.n1 = makeNoise(this.seed * 31 + 7); this.n2 = makeNoise(this.seed * 17 + 3); this.n3 = makeNoise(this.seed * 13 + 11);
    this.ponds = []; this.rooms = []; this.roomBy = {}; this.paths = []; this.pathBy = {}; this.rivers = []; this.bridges = []; this.lobes = [];
    this.objs = []; this.portals = []; this.triggers = []; this.markers = []; this.notes = [];
    this.sections = []; this.voids = []; this.warps = []; this.anchors = {}; this.pois = []; this.dead = [];
    this.startPos = null; this.sigil = null;
    this.type = grid(this.W, this.H, '.'); this.h = grid(this.W, this.H, 0);
    this.land = grid(this.W, this.H, false); this.zone = grid(this.W, this.H, 0);   // zone: ZONE bits below
    this.occ = grid(this.W, this.H, null);
    this.built = false;
  }

  // ---------------------------- declarations ----------------------------------
  // kind: clearing | plaza | chamber | arena | nook | islet | flat | hub
  room(id, o) {
    const r = Object.assign({ id, kind: 'clearing', r: 5, lvl: 0, clear: false, walled: false, isolated: false, label: id, shape: 'blob', enemies: false }, o);
    if (r.kind === 'plaza' || r.kind === 'arena') r.shape = r.shape === 'blob' ? 'round' : r.shape;
    r.ph = (r.side ? this.sideRng() : this.rng).range(0, 100);   // side: an add-on room (its own RNG stream: the rest of the map rolls as before)
    this.rooms.push(r); this.roomBy[id] = r; return r;
  }
  // pond: open water disc (fishing). Makes its own land + flat terrace so banks are walkable.
  pond(id, o) {
    const p = Object.assign({ id, r: 4, lvl: 0 }, o); this.ponds.push(p);
    this.lobe(p.x, p.y, p.r + 2.6, p.lvl); this.room('flat_pond_' + id, { kind: 'flat', x: p.x, y: p.y, r: p.r + 1.6, lvl: p.lvl });
    return p;
  }
  lobe(x, y, r, lvl) { this.lobes.push({ x, y, r, lvl: lvl || 0 }); }
  // pts: 'roomId' | [x,y,lvl?] | {x,y,lvl,hold}. For branches: from:{path,at:0..1,dx,dy} and pts continue from there.
  path(name, o) {
    const p = Object.assign({ name, w: 3, meander: 2.2, every: 9, kind: 'main', type: 'p', stairs: true, step: 0.5 }, o);
    this.paths.push(p); this.pathBy[name] = p; return p;
  }
  river(name, o) { const rv = Object.assign({ name, w: 2.6, meander: 2, every: 8 }, o); this.rivers.push(rv); return rv; }
  // --- M2c sections (DESIGN 25): one grid, several regions. bounds = [x0, y0, x1, y1]; later sections win where bounds overlap.
  //     o: { name, kind: 'outer'|'underground'|'vault'|'arena'|'islet'|'pond', ambient, palette, patch: {f, d}, pad, amp, gutter }
  section(id, o) { const sc = Object.assign({ id, name: id, kind: 'outer', gutter: false }, o); this.sections.push(sc); return sc; }
  secAt(x, y) { let r = null; for (const sc of this.sections) { const b = sc.bounds; if (b && x >= b[0] && x < b[2] && y >= b[1] && y < b[3]) r = sc; } return r; }
  // void gutter: land inside the rect is removed after the coast pass (3 tiles wide between zone sections)
  // ch = the gutter tile char the engine draws ('v' cliff chasm, 'k' darkness) once it supports them (T.gutterTiles), else plain '.'
  voidRect(x0, y0, x1, y1, ch = 'v') { this.voids.push([x0, y0, x1, y1, ch]); }
  inVoid(x, y) { for (const v of this.voids) if (x >= v[0] && x < v[2] && y >= v[1] && y < v[3]) return true; return false; }
  voidChar(x, y) { for (const v of this.voids) if (x >= v[0] && x < v[2] && y >= v[1] && y < v[3]) return v[4] || 'v'; return null; }
  // warp door: a keyed door in one section that lands the hero (same map, 0.4 s fade) at `to`. Emitted as a `warpdoor` object once the
  // engine has them (T.warpMode 'door'), else as a same-map portal (+ the barrier the caller placed in front of it).
  warp(id, o) { const w = Object.assign({ id, open: true, marker: true }, o); this.warps.push(w); return w; }
  anchor(id, x, y) { this.anchors[id] = { id, x: r2(x), y: r2(y) }; return this.anchors[id]; }
  // point of interest (density audit): kind, position, whether it counts for the main-path spacing
  poi(kind, x, y, o = {}) { this.pois.push(Object.assign({ kind, x, y }, o)); }
  bridge(o) { this.bridges.push(Object.assign({ axis: 'x', len: 4, w: 2 }, o)); }

  // ------------------------------- build ---------------------------------------
  build() {
    if (this.built) return this; this.built = true;
    this._pathsPass();
    this._corridors();
    this._coast();
    this._levels();
    this._tiles();
    this._rivers();
    this._ponds();
    this._bridges();
    this._relax();
    this._stairs();
    this._finalizeFields();
    return this;
  }

  roomRad(rm, a) {   // blob radius at angle a
    if (rm.shape === 'round') return rm.r * (1 + 0.04 * Math.sin(a * 3 + rm.ph));
    return rm.r * (1 + 0.22 * (this.n2.v(Math.cos(a) * 1.4 + rm.ph, Math.sin(a) * 1.4 + rm.ph * 0.7) - 0.5) * 2);
  }
  // signed distance-ish: <0 inside room
  roomD(rm, x, y) {
    const dx = x - rm.x, dy = y - rm.y;
    if (rm.shape === 'square') { const q = Math.max(Math.abs(dx), Math.abs(dy)); return q - rm.r * (1 + 0.03 * Math.sin(Math.atan2(dy, dx) * 5 + rm.ph)); }
    return Math.hypot(dx, dy) - this.roomRad(rm, Math.atan2(dy, dx));
  }

  _pathsPass() {
    for (const p of this.paths) {
      const cps = [];
      if (p.from) {
        const par = this.pathBy[p.from.path || 'main']; if (!par || !par.samples) throw new Error(`path ${p.name}: parent ${p.from.path} not built`);
        let idx;
        if (p.from.room || p.from.near) {
          const [nx, ny] = p.from.room ? [this.roomBy[p.from.room].x, this.roomBy[p.from.room].y] : p.from.near;
          idx = 0; let bd = 1e9; par.samples.forEach((q, k) => { const d = Math.hypot(q.x - nx, q.y - ny); if (d < bd) { bd = d; idx = k; } });
        } else idx = clamp(Math.round(p.from.at * (par.samples.length - 1)), 0, par.samples.length - 1);
        const sp = par.samples[idx];
        p.junction = { idx, x: sp.x, y: sp.y };
        cps.push({ x: sp.x + (p.from.dx || 0), y: sp.y + (p.from.dy || 0), lvl: Math.round(par.prof[idx]), hold: 0, orig: true, j: true });
      }
      for (const q of p.pts) {
        let c;
        if (typeof q === 'string') { const rm = this.roomBy[q]; if (!rm) throw new Error(`path ${p.name}: unknown room ${q}`); c = { x: rm.x, y: rm.y, lvl: rm.lvl, hold: rm.kind === 'islet' ? 0 : rm.r * 0.8, orig: true, room: rm }; }
        else if (Array.isArray(q)) c = { x: q[0], y: q[1], lvl: q[2], hold: q[3] || 0, orig: true };
        else c = Object.assign({ hold: 0, orig: true }, q);
        cps.push(c);
      }
      // levels: undefined -> inherit previous; dl relative
      const base = cps[0].lvl != null ? cps[0].lvl : 0;
      let prev = base;
      for (const c of cps) { if (c.dl != null) c.lvl = prev + c.dl; if (c.lvl == null) c.lvl = prev; prev = c.lvl; }
      // meander: insert displaced intermediate points
      const wound = [cps[0]], RG = p.side ? this.sideRng() : this.rng;   // side: an add-on path on its own RNG stream (DESIGN 26.2 pockets)
      let sg = RG.sign();
      for (let i = 1; i < cps.length; i++) {
        const a = cps[i - 1], b = cps[i], len = Math.hypot(b.x - a.x, b.y - a.y), k = Math.floor(len / p.every);
        const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
        for (let m = 1; m <= k; m++) {
          const t = m / (k + 1), off = p.meander * sg * (0.5 + RG.range(0, 0.9)) * Math.sin(Math.PI * t * 0.5 + 0.9) ; sg = -sg;
          wound.push({ x: clamp(lerp(a.x, b.x, t) + nx * off, 3, this.W - 4), y: clamp(lerp(a.y, b.y, t) + ny * off, 3, this.H - 4), orig: false });
        }
        wound.push(b);
      }
      const raw = catmull(wound, p.step);
      p.samples = []; let s = 0;
      for (let i = 0; i < raw.length; i++) {
        if (i) s += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
        p.samples.push({ x: clamp(raw[i].x, 2, this.W - 3), y: clamp(raw[i].y, 2, this.H - 3), s, seg: raw[i].seg });
      }
      // arclength of every original control point
      const origIdx = []; wound.forEach((c, i) => { if (c.orig) origIdx.push(i); });
      p.ctrl = origIdx.map(wi => { const si = p.samples.findIndex(sm => sm.seg === wi); const idx = si < 0 ? p.samples.length - 1 : si; return Object.assign({}, wound[wi], { s: p.samples[idx].s, si: idx }); });
      // target profile: step functions between control levels, with holds around control points
      const n = p.samples.length, tgt = new Array(n), step = this.step;
      const ramp = (a, b) => Math.abs(a - b) / this.slope;
      for (let i = 0; i < n; i++) {
        const sm = p.samples[i]; let k = 0;
        while (k < p.ctrl.length - 2 && sm.s >= p.ctrl[k + 1].s) k++;
        const A = p.ctrl[k], B = p.ctrl[Math.min(k + 1, p.ctrl.length - 1)];
        if (A.lvl === B.lvl) { tgt[i] = A.lvl; continue; }
        const a = A.s + A.hold + ramp(A.lvl, B.lvl) * 0.5, b = B.s - B.hold - ramp(A.lvl, B.lvl) * 0.5;
        const sStar = a < b ? (a + b) / 2 : (A.s + B.s) / 2;
        tgt[i] = sm.s < sStar ? A.lvl : B.lvl;
      }
      // lipschitz both ways, averaged
      const sl = this.slope, f = tgt.slice(), b = tgt.slice();
      for (let i = 1; i < n; i++) { const ds = p.samples[i].s - p.samples[i - 1].s; f[i] = clamp(tgt[i], f[i - 1] - sl * ds, f[i - 1] + sl * ds); }
      for (let i = n - 2; i >= 0; i--) { const ds = p.samples[i + 1].s - p.samples[i].s; b[i] = clamp(tgt[i], b[i + 1] - sl * ds, b[i + 1] + sl * ds); }
      p.tgt = tgt; p.prof = tgt.map((_, i) => (f[i] + b[i]) / 2);
      for (const c of p.ctrl) for (let i = 0; i < n; i++) if (Math.abs(p.samples[i].s - c.s) <= c.hold) p.prof[i] = c.lvl;   // holds are flat
      // half widths (slightly varying)
      p.hw = p.samples.map(sm => p.w / 2 * (0.85 + 0.3 * this.n1.v(sm.s * 0.11, p.name.length * 3.1)));
    }
  }

  _corridors() {
    const W = this.W, H = this.H;
    this.cor = grid(W, H, null);   // {p,i,ratio}
    this.pathBucket = grid(W, H, null);
    this.paths.forEach((p, pi) => {
      p.samples.forEach((sm, i) => {
        const hw = p.hw[i], R = Math.ceil(hw + 1);
        const bi = Math.floor(sm.x), bj = Math.floor(sm.y);
        for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
          const x = bi + di, y = bj + dj; if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const d = Math.hypot(x + 0.5 - sm.x, y + 0.5 - sm.y);
          if (d <= hw) {
            const ratio = d / hw, c = this.cor[y][x];
            if (!c || ratio < c.ratio - 1e-6) this.cor[y][x] = { p: pi, i, ratio };
          }
        }
        const cell = this.pathBucket[bj] && (this.pathBucket[bj][bi] = this.pathBucket[bj][bi] || []);
        if (cell) cell.push({ x: sm.x, y: sm.y, hw, p: pi, i });
      });
    });
  }

  // nearest corridor distance minus half width (negative inside), search radius ~ 6
  pathClear(x, y, only) {
    let best = 99; const bi = Math.floor(x), bj = Math.floor(y), R = 5;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const c = this.pathBucket[bj + dj] && this.pathBucket[bj + dj][bi + di]; if (!c) continue;
      for (const s of c) { if (only && !only(this.paths[s.p])) continue; const d = Math.hypot(x - s.x, y - s.y) - s.hw; if (d < best) best = d; }
    }
    return best;
  }

  _coast() {
    const W = this.W, H = this.H, srcs = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.cor[y][x] && this.paths[this.cor[y][x].p].kind !== 'bridge') srcs.push({ i: x, j: y, d0: 0 });
    }
    for (const rm of this.rooms) {
      if (rm.isolated) continue;
      const R = Math.ceil(rm.r * 1.4 + 2);
      for (let y = Math.floor(rm.y - R); y <= rm.y + R; y++) for (let x = Math.floor(rm.x - R); x <= rm.x + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = this.roomD(rm, x + 0.5, y + 0.5); if (d <= 0.2) srcs.push({ i: x, j: y, d0: 0 });
      }
    }
    for (const lb of this.lobes) {
      for (let y = Math.floor(lb.y - lb.r); y <= lb.y + lb.r; y++) for (let x = Math.floor(lb.x - lb.r); x <= lb.x + lb.r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (Math.hypot(x + 0.5 - lb.x, y + 0.5 - lb.y) <= lb.r) srcs.push({ i: x, j: y, d0: 0 });
      }
    }
    const { D } = distField(W, H, srcs);
    this.featD = D;
    let land = grid(W, H, false);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const margin = Math.min(x, y, W - 1 - x, H - 1 - y);
      const n = this.n1.fbm(x * 0.075, y * 0.075, 4), n2 = this.n2.fbm(x * 0.22, y * 0.22, 2);
      const sc = this.sections.length ? this.secAt(x + 0.5, y + 0.5) : null, pad = sc && sc.pad != null ? sc.pad : this.pad;
      const reach = pad * (0.35 + 1.15 * n) + (n2 - 0.5) * 2.2;
      land[y][x] = D[y * W + x] <= Math.max(0, reach) && margin >= 1 && !this.inVoid(x + 0.5, y + 0.5);
      if (D[y * W + x] === 0) land[y][x] = true;
    }
    // cellular smoothing (round off pixel noise, keep the shape lumpy)
    for (let it = 0; it < 2; it++) {
      const nl = grid(W, H, false);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let c = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const yy = y + dj, xx = x + di; if (yy >= 0 && xx >= 0 && yy < H && xx < W && land[yy][xx]) c++; }
        nl[y][x] = land[y][x] ? c >= 3 : c >= 6;
        if (this.voids.length && this.inVoid(x + 0.5, y + 0.5)) nl[y][x] = false;
        if (D[y * W + x] === 0) nl[y][x] = true;
      }
      land = nl;
    }
    // isolated rooms (islets)
    for (const rm of this.rooms) {
      if (!rm.isolated) continue;
      for (let y = Math.floor(rm.y - rm.r - 2); y <= rm.y + rm.r + 2; y++) for (let x = Math.floor(rm.x - rm.r - 2); x <= rm.x + rm.r + 2; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (this.roomD(rm, x + 0.5, y + 0.5) <= 0) land[y][x] = true;
      }
    }
    // drop components that contain no feature (tiny strays)
    const seen = grid(W, H, false);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!land[y][x] || seen[y][x]) continue;
      const comp = [], st = [[x, y]]; seen[y][x] = true; let keep = false;
      while (st.length) {
        const [cx, cy] = st.pop(); comp.push([cx, cy]);
        if (D[cy * W + cx] === 0) keep = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && land[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; st.push([nx, ny]); } }
      }
      if (!keep) for (const [cx, cy] of comp) { if (!this.rooms.some(rm => rm.isolated && this.roomD(rm, cx + 0.5, cy + 0.5) <= 0)) land[cy][cx] = false; }
    }
    this.land = land;
  }

  // §29 island edge v2 -- the raised NORTH / WEST coast band. In this projection a north- or west-facing face projects behind its own
  // top, so those coasts showed no thickness. Land within 2-3 tiles of void lying straight / diagonally to its -x / -y side (the _coast
  // land mask; gutters count as void) is raised by `up` (default this.step; the outermost tile +1 more where n1 is high), so its S/E
  // walls render through rasterColumn as a rim and every island reads as a bowl. Run AFTER populate (generate() below) so the scatter
  // context (cliff / height) and every object stay exactly as they were. Never raised (with a 1-tile clearance): paths, rooms, fights,
  // water, bridges, stairs and non-grass tiles, islets under `minComp` tiles, and the surroundings of the start, anchors, warps,
  // portals, enter_area triggers (r + 0.5) and every non-decor object (1 tile). Raised fragments under 3 tiles are dropped.
  coastBand(o = {}) {
    const W = this.W, H = this.H, band = o.band || 3, up = o.up || this.step, minComp = o.minComp || 150;
    const isLand = (x, y) => x >= 0 && y >= 0 && x < W && y < H && this.type[y][x] !== '.';
    const comp = new Int32Array(W * H).fill(-1), size = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isLand(x, y) || comp[y * W + x] >= 0) continue;
      const id = size.length, st = [[x, y]]; comp[y * W + x] = id; let n = 0;
      while (st.length) { const [cx, cy] = st.pop(); n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (isLand(nx, ny) && comp[ny * W + nx] < 0) { comp[ny * W + nx] = id; st.push([nx, ny]); } } }
      size.push(n);
    }
    const bad = grid(W, H, false), Z = ZONE.path | ZONE.room | ZONE.fight | ZONE.water | ZONE.bridge | ZONE.stairs;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isLand(x, y)) continue;
      if ((this.zone[y][x] & Z) || (this.cor && this.cor[y][x]) || !'gfd'.includes(this.type[y][x])) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (y + dy >= 0 && x + dx >= 0 && y + dy < H && x + dx < W) bad[y + dy][x + dx] = true;
    }
    const keepOut = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r + 0.71) bad[y][x] = true; };
    const DECOR = /^(tree_|pine|bush$|rock|grass$|mushroom|moss$|log$|stump$|sunbeam$)/;
    for (const ob of this.objs) if (!DECOR.test(ob.t)) keepOut(ob.x, ob.y, 1);
    if (this.startPos) keepOut(this.startPos.x, this.startPos.y, 3);
    for (const a of Object.values(this.anchors)) keepOut(a.x, a.y, 1.5);
    for (const w of this.warps) { keepOut(w.x, w.y, 1.5); if (w.to && w.to.x != null) keepOut(w.to.x, w.to.y, 1.5); }
    for (const p of this.portals) keepOut(p.x, p.y, 2);
    for (const t of this.triggers) if (t.when && t.when.type === 'enter_area') keepOut(t.when.x, t.when.y, (t.when.r || 1) + 0.5);
    const add = grid(W, H, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isLand(x, y) || bad[y][x] || size[comp[y * W + x]] < minComp) continue;
      const n = this.n1.fbm(x * 0.21 + 13, y * 0.21 + 7, 2), depth = band - (n < 0.45 ? 1 : 0);
      let k = 0;
      for (let d = 1; d <= depth && !k; d++) if (!isLand(x - d, y) || !isLand(x, y - d) || (d < depth && !isLand(x - d, y - d))) k = d;
      if (k) add[y][x] = up + (k === 1 && n > 0.6 ? 1 : 0);
    }
    // drop raised fragments under 3 tiles
    const seen = grid(W, H, false); let raised = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!add[y][x] || seen[y][x]) continue;
      const cells = [], st = [[x, y]]; seen[y][x] = true;
      while (st.length) { const [cx, cy] = st.pop(); cells.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && add[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; st.push([nx, ny]); } } }
      if (cells.length < 3) continue;
      for (const [cx, cy] of cells) { this.h[cy][cx] = Math.min(35, this.h[cy][cx] + add[cy][cx]); raised++; }
    }
    this.notes.push(`coast band: ${raised} north/west coast tiles raised`);
    return raised;
  }

  // terrace levels for the whole island -> this.Q
  _levels() {
    const W = this.W, H = this.H, step = this.step, srcs = [];
    this.paths.forEach((p, pi) => {
      if (p.kind === 'bridge') return;
      p.samples.forEach((sm, i) => srcs.push({ i: Math.floor(sm.x), j: Math.floor(sm.y), d0: 0, lvl: p.tgt[i] }));
    });
    for (const rm of this.rooms) {
      if (rm.isolated) continue;
      for (let y = Math.floor(rm.y - rm.r - 1); y <= rm.y + rm.r + 1; y++) for (let x = Math.floor(rm.x - rm.r - 1); x <= rm.x + rm.r + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (this.roomD(rm, x + 0.5, y + 0.5) <= 0) srcs.push({ i: x, j: y, d0: -1, lvl: rm.lvl });
      }
    }
    for (const lb of this.lobes) srcs.push({ i: Math.floor(lb.x), j: Math.floor(lb.y), d0: 0, lvl: lb.lvl });
    const warp = (i, j) => 0.75 + 0.9 * this.n3.fbm(i * 0.17, j * 0.17, 2);
    const { D, L } = distField(W, H, srcs.map(s => Object.assign({}, s, { d0: Math.max(0, s.d0) })), warp);
    const Q = grid(W, H, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.land[y][x]) continue;
      const d = D[y * W + x], l = L[y * W + x];
      const sc = this.sections.length ? this.secAt(x + 0.5, y + 0.5) : null, a = (sc && sc.amp != null ? sc.amp : this.amp) * smoothstep(1.5, 7, d), nz = (this.n3.fbm(x * 0.13 + 40, y * 0.13, 3) - 0.5) * 2;
      Q[y][x] = Math.max(0, Math.round((l + nz * a) / step) * step);
    }
    // walled rooms (chambers / arena): ring of higher ground around the floor, giving cliff walls
    for (const rm of this.rooms) {
      if (!rm.walled || rm.isolated) continue;
      const ringIn = 0.6, ringOut = rm.wall || 3.4, up = rm.up || step;
      for (let y = Math.floor(rm.y - rm.r - ringOut - 2); y <= rm.y + rm.r + ringOut + 2; y++) for (let x = Math.floor(rm.x - rm.r - ringOut - 2); x <= rm.x + rm.r + ringOut + 2; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || !this.land[y][x]) continue;
        const d = this.roomD(rm, x + 0.5, y + 0.5);
        if (d > ringIn && d < ringOut) Q[y][x] = Math.max(Q[y][x], rm.lvl + up);
      }
    }
    this.Q = Q;
  }

  _tiles() {
    const W = this.W, H = this.H;
    // base ground + patches (theme decides via hook)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.land[y][x]) continue;
      this.type[y][x] = 'g'; this.h[y][x] = this.Q[y][x];
      const f = this.n2.fbm(x * 0.14 + 11, y * 0.14, 3), dm = this.n1.fbm(x * 0.09 + 70, y * 0.09 + 33, 3);
      const sc = this.sections.length ? this.secAt(x + 0.5, y + 0.5) : null, pt = sc && sc.patch ? sc.patch : null;
      if (f > (pt ? pt.f : this.patchF != null ? this.patchF : 0.64)) this.type[y][x] = 'f';
      else if (dm < (pt ? pt.d : this.patchD != null ? this.patchD : 0.36)) this.type[y][x] = 'd';
    }
    // rooms
    for (const rm of this.rooms) {
      const R = rm.r + 3;
      for (let y = Math.floor(rm.y - R); y <= rm.y + R; y++) for (let x = Math.floor(rm.x - R); x <= rm.x + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = this.roomD(rm, x + 0.5, y + 0.5);
        if (d > 0 || !this.land[y][x]) continue;
        this.h[y][x] = rm.lvl; this.zone[y][x] |= ZONE.room;
        const k = rm.kind;
        const inner = -d;   // depth inside
        if (k === 'plaza') this.type[y][x] = inner > 1.2 ? (this.n2.fbm(x * 0.35, y * 0.35, 2) > 0.34 ? 'x' : (this.n1.v(x * 0.7, y * 0.7) > 0.5 ? 'p' : 'd')) : inner > 0.4 ? 'p' : 'g';
        else if (k === 'arena') this.type[y][x] = inner > 0.8 ? 'x' : 'p';
        else if (k === 'chamber') this.type[y][x] = inner > 1 ? (this.n2.v(x * 0.5, y * 0.5) > 0.7 ? 'x' : 'd') : 'd';
        else if (k === 'clearing' || k === 'hub') { if (this.type[y][x] === 'd') this.type[y][x] = 'g'; }
        else if (k === 'nook') { if (this.type[y][x] === 'd') this.type[y][x] = 'g'; }
        if (rm.floor && inner > (rm.floorIn || 0.8)) this.type[y][x] = rm.floor;
        if (rm.clear) this.zone[y][x] |= ZONE.fight;
      }
      if (rm.kind === 'arena') {
        const rr = rm.rune || rm.r * 0.45;
        for (let y = Math.floor(rm.y - rr - 1); y <= rm.y + rr + 1; y++) for (let x = Math.floor(rm.x - rr - 1); x <= rm.x + rr + 1; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H || !this.land[y][x]) continue;
          if (Math.hypot(x + 0.5 - rm.x, y + 0.5 - rm.y) < rr) this.type[y][x] = 'r';
        }
        this.sigil = { x: rm.x, y: rm.y };
      }
    }
    // corridors (owner path decides height and tile type)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = this.cor[y][x]; if (!c) continue;
      const p = this.paths[c.p];
      if (p.kind === 'bridge') continue;
      this.land[y][x] = true;
      if (!this.type[y][x] || this.type[y][x] === '.') this.type[y][x] = p.type;
      const inRoom = this.zone[y][x] & ZONE.room;
      const rmHere = inRoom ? this.rooms.find(rm => rm.kind !== 'flat' && this.roomD(rm, x + 0.5, y + 0.5) <= 0) : null;
      if (!rmHere) { this.type[y][x] = p.type; this.h[y][x] = Math.round(p.prof[c.i]); this.zone[y][x] |= ZONE.path; if (p.kind !== 'main') this.zone[y][x] |= ZONE.side; if (p.kind === 'secret') this.zone[y][x] |= ZONE.secret; }
      else { this.zone[y][x] |= ZONE.path; if (rmHere.kind === 'plaza' || rmHere.kind === 'arena') { /* keep floor */ } }
    }
    // flats forced
    for (const rm of this.rooms) if (rm.kind === 'flat') {
      for (let y = Math.floor(rm.y - rm.r - 1); y <= rm.y + rm.r + 1; y++) for (let x = Math.floor(rm.x - rm.r - 1); x <= rm.x + rm.r + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || !this.land[y][x]) continue;
        if (this.roomD(rm, x + 0.5, y + 0.5) <= 0 && !this.cor[y][x]) this.h[y][x] = rm.lvl;
      }
    }
  }

  _rivers() {
    const W = this.W, H = this.H;
    this.riverTiles = [];
    for (const rv of this.rivers) {
      const cps = rv.pts.map(q => (Array.isArray(q) ? { x: q[0], y: q[1] } : q));
      const wound = [cps[0]]; let sg = this.rng.sign();
      for (let i = 1; i < cps.length; i++) {
        const a = cps[i - 1], b = cps[i], len = Math.hypot(b.x - a.x, b.y - a.y), k = Math.floor(len / rv.every);
        const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
        for (let m = 1; m <= k; m++) { const t = m / (k + 1), off = rv.meander * sg * (0.4 + this.rng.range(0, 0.9)); sg = -sg; wound.push({ x: lerp(a.x, b.x, t) + nx * off, y: lerp(a.y, b.y, t) + ny * off }); }
        wound.push(b);
      }
      const sam = catmull(wound, 0.5);
      let hcur = 99; const keep = [];
      sam.forEach((sm, i) => {
        const hw = rv.w / 2 * (0.85 + 0.3 * this.n1.v(i * 0.07, 9.7)), ci = Math.floor(sm.x), cj = Math.floor(sm.y);
        let q = this.land[cj] && this.land[cj][ci] ? this.Q[cj][ci] : 0;
        const near = this.cor[cj] && this.cor[cj][ci];
        hcur = Math.min(hcur, q);
        for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
          const x = ci + di, y = cj + dj; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || !this.land[y][x]) continue;
          if (Math.hypot(x + 0.5 - sm.x, y + 0.5 - sm.y) > hw) continue;
          keep.push([x, y, hcur]);
        }
      });
      // rooms keep dry; corridors become bridges
      const done = new Set();
      for (const [x, y, hh] of keep) {
        const k = y * W + x; if (done.has(k)) continue; done.add(k);
        if (this.zone[y][x] & ZONE.room && !rv.throughRooms) continue;
        const c = this.cor[y][x];
        if (c && this.paths[c.p].kind !== 'bridge') { this.type[y][x] = 'b'; this.zone[y][x] |= ZONE.bridge; this.riverTiles.push([x, y]); continue; }
        this.type[y][x] = 'w'; this.h[y][x] = hh; this.zone[y][x] |= ZONE.water; this.riverTiles.push([x, y]);
      }
    }
  }

  _ponds() {
    for (const p of this.ponds) {
      for (let y = Math.floor(p.y - p.r - 2); y <= p.y + p.r + 2; y++) for (let x = Math.floor(p.x - p.r - 2); x <= p.x + p.r + 2; x++) {
        if (x < 1 || y < 1 || x >= this.W - 1 || y >= this.H - 1 || !this.land[y][x]) continue;
        const a = Math.atan2(y + 0.5 - p.y, x + 0.5 - p.x), rr = p.r * (1 + 0.14 * (this.n2.v(Math.cos(a) * 1.6 + p.x, Math.sin(a) * 1.6 + p.y) - 0.5) * 2);
        if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) > rr || (this.zone[y][x] & (ZONE.path | ZONE.bridge)) || (this.cor[y][x])) continue;
        this.type[y][x] = 'w'; this.h[y][x] = p.lvl; this.zone[y][x] |= ZONE.water;
      }
    }
  }
  // walkable bank tile beside water, nearest to (x,y); returns tile-centre position
  waterEdge(x, y, rad = 6) {
    let best = null, bd = 1e9;
    for (let j = Math.floor(y - rad); j <= y + rad; j++) for (let i = Math.floor(x - rad); i <= x + rad; i++) {
      if (i < 1 || j < 1 || i >= this.W - 1 || j >= this.H - 1 || !'gfd'.includes(this.type[j][i])) continue;
      let wet = false; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (this.type[j + dj][i + di] === 'w') wet = true;
      if (!wet) continue;
      const d = Math.hypot(i + 0.5 - x, j + 0.5 - y); if (d < bd) { bd = d; best = { x: i + 0.5, y: j + 0.5 }; }
    }
    return best || { x, y };
  }
  _bridges() {
    for (const b of this.bridges) {
      const tiles = [];
      for (let k = 0; k < b.len; k++) for (let m = 0; m < b.w; m++) tiles.push(b.axis === 'x' ? [b.x + k, b.y + m] : [b.x + m, b.y + k]);
      let lvl = b.lvl;
      if (lvl == null) { const [sx, sy] = b.axis === 'x' ? [b.x - 1, b.y] : [b.x, b.y - 1]; lvl = this.h[sy] && this.h[sy][sx] || 0; }
      for (const [x, y] of tiles) {
        if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
        this.type[y][x] = 'b'; this.h[y][x] = lvl; this.land[y][x] = true; this.zone[y][x] |= ZONE.bridge | ZONE.path;
      }
      b.tiles = tiles; b.lvl = lvl;
    }
  }

  // make every corridor/room/bridge neighbourhood climbable: |dh|<=1 between adjacent walkable corridor tiles
  _relax() {
    const W = this.W, H = this.H;
    const isFix = (x, y) => (this.zone[y][x] & (ZONE.path | ZONE.bridge)) && this.type[y][x] !== 'w';
    const locked = (x, y) => (this.zone[y][x] & ZONE.room && !(this.zone[y][x] & ZONE.path)) || (this.zone[y][x] & ZONE.bridge);
    for (let it = 0; it < 40; it++) {
      let ch = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!this.land[y][x] || !isFix(x, y) || (this.zone[y][x] & ZONE.room && !(this.zone[y][x] & ZONE.path))) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !this.land[ny][nx]) continue;
          if (!isFix(nx, ny) && !(this.zone[ny][nx] & ZONE.room)) continue;
          if (this.type[ny][nx] === 'w') continue;
          const d = this.h[y][x] - this.h[ny][nx];
          if (Math.abs(d) > 1 && !(this.zone[y][x] & ZONE.bridge)) { this.h[y][x] -= Math.sign(d) * (Math.abs(d) - 1); ch++; }
        }
      }
      if (!ch) break;
    }
  }

  _stairs() {
    const W = this.W, H = this.H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = this.cor[y][x]; if (!c || this.type[y][x] !== this.paths[c.p].type) continue;
      const p = this.paths[c.p]; if (!p.stairs || !(this.zone[y][x] & ZONE.path) || (this.zone[y][x] & ZONE.room)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (this.cor[ny][nx] && this.h[ny][nx] !== this.h[y][x] && this.type[ny][nx] !== 'w' && this.type[ny][nx] !== 'b') { this.type[y][x] = 's'; this.zone[y][x] |= ZONE.stairs; break; }
      }
    }
    // arena pillars (standing stones) ringing the arena floor, leaving the entrances open
    for (const rm of this.rooms) {
      if (rm.kind !== 'arena' || !rm.pillars) continue;
      for (let k = 0; k < rm.pillars; k++) {
        const a = (k / rm.pillars) * Math.PI * 2 + rm.ph, rr = rm.r - 1.1;
        const x = Math.floor(rm.x + Math.cos(a) * rr), y = Math.floor(rm.y + Math.sin(a) * rr);
        if (x < 0 || y < 0 || x >= W || y >= H || !this.land[y][x] || this.cor[y][x]) continue;
        if (this.pathClear(x + 0.5, y + 0.5) < 1.2) continue;
        this.type[y][x] = 'c';
      }
    }
  }

  _finalizeFields() {
    const W = this.W, H = this.H;
    // distance from void for "edge" density
    const srcs = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!this.land[y][x]) srcs.push({ i: x, j: y, d0: 0 });
    this.edgeD = distField(W, H, srcs).D;
    // cliff proximity: tiles that sit next to a drop >=2
    this.cliff = grid(W, H, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.land[y][x]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && this.land[ny][nx] && Math.abs(this.h[ny][nx] - this.h[y][x]) >= 2) this.cliff[y][x] = 1; }
      if (!this.land[y][x]) this.h[y][x] = 0;
    }
    // void tiles carry height 0, never negative
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!this.land[y][x]) { this.type[y][x] = '.'; this.h[y][x] = 0; } else this.h[y][x] = Math.max(0, this.h[y][x]); }
  }

  // --------------------------------- queries -----------------------------------
  tileAt(x, y) { const i = Math.floor(x), j = Math.floor(y); return i < 0 || j < 0 || i >= this.W || j >= this.H ? '.' : this.type[j][i]; }
  hAt(x, y) { const i = Math.floor(x), j = Math.floor(y); return i < 0 || j < 0 || i >= this.W || j >= this.H ? 0 : this.h[j][i]; }
  walkTile(x, y) { const t = this.tileAt(x, y); return t !== '.' && t !== 'w' && t !== 'c' && t !== 'v' && t !== 'k'; }
  pathPoint(name, t) { const p = this.pathBy[name], i = clamp(Math.round(t * (p.samples.length - 1)), 0, p.samples.length - 1); return { x: p.samples[i].x, y: p.samples[i].y, h: Math.round(p.prof[i]), i }; }
  pathAngle(name, t) { const p = this.pathBy[name], i = clamp(Math.round(t * (p.samples.length - 1)), 1, p.samples.length - 2), a = p.samples[i - 1], b = p.samples[i + 1]; return Math.atan2(b.y - a.y, b.x - a.x); }
  roomPos(id) { const r = this.roomBy[id]; return { x: r.x, y: r.y }; }
  // find a free walkable spot near (x,y) honouring a minimum path distance etc.
  nearWalkable(x, y, rad = 3) {
    for (let k = 0; k < 200; k++) {
      const a = this.rng.range(0, 6.283), d = k === 0 ? 0 : this.rng.range(0, rad), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (this.walkTile(px, py) && this.tileAt(px, py) !== 'b') return { x: px, y: py };
    }
    return { x, y };
  }

  // ------------------------------- object placement ----------------------------
  free(x, y, sp) {
    const bi = Math.floor(x), bj = Math.floor(y), R = Math.ceil(sp) + 1;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const c = this.occ[bj + dj] && this.occ[bj + dj][bi + di]; if (!c) continue;
      for (const o of c) if (Math.hypot(o.x - x, o.y - y) < (o.sp + sp) / 2) return false;
    }
    return true;
  }
  addObj(t, x, y, o = {}) {
    const def = PROP[t] || { r: 0, sp: 1 };
    const ob = { t, x: r2(x), y: r2(y) };
    if (o.v) ob.v = o.v; if (o.f) ob.f = 1;
    for (const k of Object.keys(o)) if (!['v', 'f', 'sp', 'force'].includes(k)) ob[k] = o[k];
    ob.sp = o.sp != null ? o.sp : def.sp;
    this.objs.push(ob);
    const i = Math.floor(x), j = Math.floor(y);
    if (i >= 0 && j >= 0 && i < this.W && j < this.H) (this.occ[j][i] = this.occ[j][i] || []).push({ x, y, sp: ob.sp, t, v: ob.v || 0 });
    return ob;
  }
  // rich marker (chest, tablet, shrine...). kind may be a future kind; resolved at emit time.
  marker(kind, x, y, o = {}) {
    const ob = this.addObj(kind, x, y, Object.assign({ sp: 1.2 }, o));
    ob.marker = true; this.markers.push(ob); return ob;
  }
  // can a prop with collider radius r stand here without blocking a walkway?
  placeOk(t, x, y, ctx) {
    const tt = this.tileAt(x, y); if (tt === '.') return false;
    const def = PROP[t] || { r: 0 };
    if (tt === 'w' || tt === 'b' || tt === 'c' || tt === 's') return false;
    if (def.r > 0) {
      if (tt === 'p' || tt === 'x' || tt === 'r') return false;
      const pc = ctx ? ctx.dPath : this.pathClear(x, y);
      if (pc < def.r + (def.r <= 0.22 ? 0.15 : 0.55)) return false;   // §29 G2: small props (r <= 0.22) may stand in the corridor verge
      const z = this.zoneAt(x, y);
      if (z & ZONE.fight) return false;
    }
    return true;
  }
  zoneAt(x, y) { const i = Math.floor(x), j = Math.floor(y); return i < 0 || j < 0 || i >= this.W || j >= this.H ? 0 : this.zone[j][i]; }
  ctx(x, y) {
    const i = clamp(Math.floor(x), 0, this.W - 1), j = clamp(Math.floor(y), 0, this.H - 1);
    let dRoom = 99, nearRoom = null;
    for (const rm of this.rooms) { if (rm.kind === 'flat' || rm.isolated) continue; const d = this.roomD(rm, x, y); if (d < dRoom) { dRoom = d; nearRoom = rm; } }
    return {
      x, y, i, j, type: this.type[j][i], h: this.h[j][i], dEdge: this.edgeD[j * this.W + i], dPath: this.pathClear(x, y), dRoom, nearRoom,
      cl: this.n1.fbm(x * 0.12 + 5, y * 0.12 + 5, 3), cl2: this.n2.fbm(x * 0.3 + 31, y * 0.3, 2), cliff: this.cliff[j][i], zone: this.zone[j][i],
      mask: this.n3.fbm(x * 0.05 + 77, y * 0.05 + 12, 2), rnd: this.rng.f(),
    };
  }
  // rules: [{t, n, sp?, p(ctx)->0..1, v:variants, flip:bool, group:[min,max], spread, tries, types:'gfd' allowed tile chars, then(ob, ctx)}]
  scatter(rules) {
    const stats = {};
    for (const rule of rules) {
      const def = PROP[rule.t] || { r: 0, sp: 1 }, sp = rule.sp != null ? rule.sp : def.sp;
      let placed = 0, tries = 0; const maxTries = rule.tries || rule.n * 60;
      while (placed < rule.n && tries++ < maxTries) {
        const bd = rule.bounds || [1, 1, this.W - 1, this.H - 1];
        const x = this.rng.range(Math.max(1, bd[0]), Math.min(this.W - 1, bd[2])), y = this.rng.range(Math.max(1, bd[1]), Math.min(this.H - 1, bd[3]));
        const i = Math.floor(x), j = Math.floor(y); if (!this.land[j][i]) continue;
        if (rule.types && !rule.types.includes(this.type[j][i])) continue;
        const c = this.ctx(x, y);
        if (rule.p && this.rng.f() > rule.p(c, this)) continue;
        const grp = rule.group ? this.rng.int(rule.group[0], rule.group[1]) : 1;
        for (let g = 0; g < grp && placed < rule.n; g++) {
          let gx = x, gy = y;
          if (g) { const a = this.rng.range(0, 6.283), d = this.rng.range(0.35, rule.spread || 1.4); gx += Math.cos(a) * d; gy += Math.sin(a) * d; }
          if (gx < 0.5 || gy < 0.5 || gx >= this.W - 0.5 || gy >= this.H - 0.5 || !this.land[Math.floor(gy)][Math.floor(gx)]) continue;
          if (rule.bounds && (gx < rule.bounds[0] || gx >= rule.bounds[2] || gy < rule.bounds[1] || gy >= rule.bounds[3])) continue;
          const gc = g ? this.ctx(gx, gy) : c;
          if (rule.types && !rule.types.includes(gc.type)) continue;
          if (!this.placeOk(rule.t, gx, gy, gc)) continue;
          if (!rule.force && !this.free(gx, gy, sp)) continue;
          const opts = {}; if (rule.v) opts.v = this.variantFor(rule.t, gx, gy, rule.v); if (rule.flip && this.rng.chance(0.5)) opts.f = 1; if (rule.sp != null) opts.sp = sp;
          const ob = this.addObj(rule.t, gx, gy, opts); if (rule.then) rule.then(ob, gc, this);
          placed++;
        }
      }
      stats[rule.t] = (stats[rule.t] || 0) + placed;
    }
    return stats;
  }
  // §29 G2 variation budget: no identical (type, variant) within 3 tiles. A random variant, then the next free one in order
  // (one rng draw whatever happens, so the stream stays aligned); all taken -> the random one.
  variantFor(t, x, y, n) {
    const v0 = this.rng.int(0, n - 1); if (n < 2) return v0;
    const used = new Set(), bi = Math.floor(x), bj = Math.floor(y);
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
      const c = this.occ[bj + dj] && this.occ[bj + dj][bi + di]; if (!c) continue;
      for (const o of c) if (o.t === t && Math.hypot(o.x - x, o.y - y) < 3) used.add(o.v);
    }
    for (let k = 0; k < n; k++) { const v = (v0 + k) % n; if (!used.has(v)) return v; }
    return v0;
  }
  // ring of props around a room (e.g. standing stones), skipping places that block walkways
  ring(roomId, t, n, frac, o = {}) {
    const rm = this.roomBy[roomId], out = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (o.rot || 0) + this.rng.range(-0.08, 0.08), rr = (rm.r * frac) + this.rng.range(-0.15, 0.15);
      const x = rm.x + Math.cos(a) * rr, y = rm.y + Math.sin(a) * rr;
      if (this.tileAt(x, y) === '.' || this.tileAt(x, y) === 'w') continue;
      if (this.pathClear(x, y) < (PROP[t] ? PROP[t].r : 0) + 0.9) continue;
      if (!o.force && !this.free(x, y, 0.6)) continue;
      const ob = this.addObj(t, x, y, { v: o.v != null ? o.v : this.rng.int(0, o.vn || 0), sp: 0.6, force: true }); out.push(ob);
    }
    return out;
  }

  // ------------------------------ density helpers (DESIGN 25.1) ------------------------
  // nearest sample of a path to (x, y): arclength s, lateral distance d
  pathProject(name, x, y) {
    const p = this.pathBy[name]; let bi = 0, bd = 1e9;
    p.samples.forEach((q, i) => { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; bi = i; } });
    return { s: p.samples[bi].s, d: bd, i: bi };
  }
  pathLength(name) { const p = this.pathBy[name]; return p.samples[p.samples.length - 1].s; }
  // sorted arclengths of the points of interest (kinds filter) within `lat` tiles of a path, always including both ends of the path
  spine(name, kinds, lat = 11) {
    const out = [];
    for (const q of this.pois) { if (kinds && !kinds.includes(q.kind)) continue; if (q.path === name && q.s != null) { out.push(q.s); continue; } const j = this.pathProject(name, q.x, q.y); if (j.d <= lat) out.push(j.s); }
    return out.sort((a, b) => a - b);
  }
  // a small themed set-piece (counts as a point of interest). set: 'forest' | 'cave'
  dress(set, k, x, y, side = 1, poiOpts = {}) {
    const put = (t, dx, dy, o = {}) => { const q = this.nearWalkable(x + dx, y + dy, 0.9); if (!this.free(q.x, q.y, 0.5) && !o.force) return; this.addObj(t, q.x, q.y, Object.assign({ sp: 0.6, force: true }, o)); };
    if (set === 'cave') {
      const kk = ['crystals', 'shrooms', 'rubble'][k % 3];
      if (kk === 'crystals') { put('crystal', 0, 0, { v: 0 }); put('crystal_violet', 0.9 * side, 0.6); put('crystal', -0.7, 0.9); put('lantern_blue', -1.4 * side, -0.4); }
      else if (kk === 'shrooms') { for (let i = 0; i < 5; i++) put('mushroom', Math.cos(i * 1.26) * 1.1, Math.sin(i * 1.26) * 1.1); put('moss', 0, 0); }
      else { put('rock_dark', 0, 0, { v: 0 }); put('rock_dark', 0.8, 0.5, { v: 1 }); put('rock_dark', -0.6, 0.8, { v: 2 }); put('mushroom', 1.6 * side, 0); put('tree_dead', -1.8 * side, -0.6, { v: 1 }); }
    } else {
      const kk = ['camp', 'cairn', 'ring', 'post', 'fallen'][k % 5];
      if (kk === 'camp') { put('brazier', 0, 0); put('log', 1.3, 0.4, { f: 1 }); put('log', -1.2, 0.7); put('stump', 0.2, -1.3); }
      else if (kk === 'cairn') { put('rock', 0, 0, { v: 0 }); put('rock', 0.7, 0.4, { v: 1 }); put('rock', -0.5, 0.7, { v: 2 }); put('lantern_blue', 1.4 * side, -0.5); }
      else if (kk === 'ring') { for (let i = 0; i < 6; i++) put('mushroom_red', Math.cos(i * 1.05) * 1.2, Math.sin(i * 1.05) * 1.2); put('moss', 0, 0); put('lantern', 1.8 * side, 0); }
      else if (kk === 'post') { put('sign', 0, 0, { text: ['Mind the roots.', 'Ogres ahead. Keep to the road.', 'The animals went this way.', 'Do not feed the boars.'][k % 4] }); put('lantern', 1.1 * side, -0.4); put('stump', -1.2, 0.8); }
      else { put('log', 0, 0, { f: 1 }); put('stump', 1.4, -0.5); put('moss', -0.8, 0.9); put('mushroom_red', 0.6, 1.2); put('mushroom_red', 0.9, 1.4); }
    }
    this.poi('wayside', x, y, poiOpts);
  }
  // fill every gap longer than `max` tiles along a path with a set-piece, beside the path (points of interest every 12-15 tiles).
  // Set-pieces never land in a fight room (ZONE.fight: rooms keep their own dressing); the spot slides along the road to the nearest clear one.
  fillWaysides(name, o = {}) {
    const p = this.pathBy[name], max = o.max || 13.5, lat = o.lat || 2.9, L = this.pathLength(name); let k = o.k0 || 0, guard = 0;
    const sampleAt = target => { let bi = 0, bd = 1e9; p.samples.forEach((q, i) => { const d = Math.abs(q.s - target); if (d < bd) { bd = d; bi = i; } }); return bi; };
    for (;;) {
      const sp = [0, ...this.spine(name, o.kinds, o.reach || 9), L];
      let gi = -1, gm = max; for (let i = 1; i < sp.length; i++) if (sp[i] - sp[i - 1] > gm) { gm = sp[i] - sp[i - 1]; gi = i; }
      if (gi < 0 || guard++ > 300) break;
      const target = (sp[gi] + sp[gi - 1]) / 2, pref = k % 2 ? 1 : -1; let placed = false;
      for (const off of [0, 2, -2, 4, -4, 6, -6]) {
        if (placed) break;
        const bi = sampleAt(target + off), a = p.samples[Math.max(0, bi - 1)], b = p.samples[Math.min(p.samples.length - 1, bi + 1)], ang = Math.atan2(b.y - a.y, b.x - a.x), sm = p.samples[bi], hw = p.hw[bi];
        for (const side of [pref, -pref]) {
          const px = sm.x + Math.sin(ang) * side * (hw + lat), py = sm.y - Math.cos(ang) * side * (hw + lat);
          if (!this.walkTile(px, py) || this.inVoid(px, py) || (this.zoneAt(px, py) & ZONE.fight) || this.pathClear(px, py, q => q !== p) < 0.6) continue;
          this.dress(o.set || 'forest', k++, px, py, side, { path: name, s: sm.s }); placed = true; break;
        }
      }
      if (!placed) { const sm = p.samples[sampleAt(target)]; this.poi('wayside', sm.x, sm.y, { path: name, s: target }); }   // inside a room: its own dressing is the point of interest
    }
    return k;
  }
  // a landmark: three giant pines (or a crystal/brazier cairn underground) with a beam of light, visible from the previous one
  landmark(x, y, set = 'forest') {
    if (set === 'cave') { this.addObj('brazier', x, y, { force: true, sp: 2 }); for (const [dx, dy] of [[-1.5, -1], [1.6, -0.8], [0.2, 1.7]]) this.addObj('crystal_violet', x + dx, y + dy, { force: true, sp: 1 }); }
    else {
      for (const [dx, dy] of [[-2, -2], [2.2, -1.4], [0.3, 2.4]]) { const px = x + dx, py = y + dy, tt = this.tileAt(px, py); if ('gfd'.includes(tt) && !(this.zoneAt(px, py) & ZONE.fight) && this.pathClear(px, py) > 1.0) this.addObj('pine_giant', px, py, { v: 1, force: true, sp: 2.5 }); }
      this.addObj('sunbeam', x, y, { force: true, sp: 2 });
    }
    this.poi('landmark', x, y);
  }
  // landmarks along a path every ~`every` tiles (existing ones count), set `off` tiles beside the path
  fillLandmarks(name, o = {}) {
    const p = this.pathBy[name], every = o.every || 30, off = o.off || 5.5, L = this.pathLength(name); let k = 0, guard = 0;
    for (;;) {
      const sp = [0, ...this.spine(name, ['landmark'], o.reach || 18), L];
      let gi = -1, gm = every * 1.08; for (let i = 1; i < sp.length; i++) if (sp[i] - sp[i - 1] > gm) { gm = sp[i] - sp[i - 1]; gi = i; }
      if (gi < 0 || guard++ > 60) break;
      const target = Math.min(sp[gi - 1] + every * 0.95, (sp[gi] + sp[gi - 1]) / 2 + 0.01);
      let bi = 0, bd = 1e9; p.samples.forEach((q, i) => { const d = Math.abs(q.s - target); if (d < bd) { bd = d; bi = i; } });
      const a = p.samples[Math.max(0, bi - 1)], b = p.samples[Math.min(p.samples.length - 1, bi + 1)], ang = Math.atan2(b.y - a.y, b.x - a.x), side = k++ % 2 ? 1 : -1, sm = p.samples[bi];
      let q = null; for (const sd of [side, -side]) for (const oo of [off, off * 0.7, off * 1.3]) { const c = { x: sm.x + Math.sin(ang) * sd * oo, y: sm.y - Math.cos(ang) * sd * oo }; if (this.walkTile(c.x, c.y) && this.pathClear(c.x, c.y) > 2.5 && !this.inVoid(c.x, c.y) && !(this.zoneAt(c.x, c.y) & ZONE.fight)) { q = c; break; } if (q) break; }
      if (!q) q = this.nearWalkable(sm.x + Math.sin(ang) * side * off, sm.y - Math.cos(ang) * side * off, 3);
      this.landmark(q.x, q.y, o.set || 'forest');
    }
  }

  // ---------------------------------- portals/start ----------------------------
  house(x, y) { x = Math.round(x); y = Math.round(y); this.blockers = this.blockers || []; this.blockers.push({ x0: x, y0: y, x1: x + 2, y1: y + 2 }); return this.addObj('house', x, y, { force: true, sp: 3.5 }); }
  // a second seeded stream for add-on content (side: true rooms / paths, zone.js pockets): adding it leaves the main stream untouched
  sideRng() { return this._side || (this._side = makeRng((this.seed * 7919 + 17) | 0)); }
  setStart(x, y) { this.startPos = { x: r2(x), y: r2(y) }; }
  portal(x, y, to, o = {}) { const p = Object.assign({ x: r2(x), y: r2(y), to, open: true, marker: false }, o); this.portals.push(p); return p; }

  // ---------------------------------- output ------------------------------------
  toMap() {
    const portals = this.portals.map(p => Object.assign({}, p)), objects = this.objs.map(o => this._emitObj(o)).filter(Boolean);
    for (const w of this.warps) {
      if (T.warpMode === 'door') objects.push(Object.assign({ t: 'warpdoor', id: w.id, x: r2(w.x), y: r2(w.y), to: { x: r2(w.to.x), y: r2(w.to.y) } }, w.key ? { key: w.key } : {}, w.label ? { label: w.label } : {}, w.open === false ? { open: false } : {}, w.boss ? { boss: w.boss } : {}));   // boss: the door's prompt shows "Recommended ilvl" (items.js); open:false = sealed until a trigger openGate { id }
      else portals.push(Object.assign({ x: r2(w.x), y: r2(w.y), to: this.id, open: w.open !== false, marker: !!w.marker, id: w.id, arrive: { x: r2(w.to.x), y: r2(w.to.y) } }, w.label ? { label: w.label } : {}));
    }
    const m = {
      name: this.name, sub: this.sub, theme: this.theme, W: this.W, H: this.H,
      tiles: this.type.map((r, y) => r.map((c, x) => (c === '.' && T.gutterTiles && this.voids.length ? this.voidChar(x + 0.5, y + 0.5) || '.' : c)).join('')),
      heights: this.h.map((r, y) => r.map((v, x) => (this.land[y][x] ? Math.min(35, v).toString(36) : '0')).join('')),
      start: this.startPos || { x: this.W / 2, y: this.H / 2 },
      portals,
      objects,
      objective: this.objective,
    };
    if (this.sigil) m.sigil = { x: this.sigil.x, y: this.sigil.y };
    if (this.level) m.level = this.level;   // zone level band [lo, hi] (DESIGN 3/11); tools/m1-world.js re-asserts the same table
    // M2c: sections (bounds, kind, ambient light, palette name), void gutters and warp anchors ride along as plain map fields
    if (this.sections.length) m.sections = this.sections.map(sc => { const b = sc.bounds, o = { id: sc.id, name: sc.name, kind: sc.kind, x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] }; for (const k of ['ambient', 'dark']) if (sc[k] != null) o[k] = sc[k]; return o; });
    if (Object.keys(this.anchors).length) m.anchors = Object.values(this.anchors).map(a => Object.assign({}, a));
    if (this.levelAreas && this.levelAreas.length) m.levelAreas = this.levelAreas.map(z => Object.assign({}, z));   // §26.2 pockets: items.js enemyLevel
    m.triggers = this.triggers;
    return m;
  }
  _emitObj(o) {
    if (STAND_IN[o.t] && STAND_IN[o.t].omit && this.kinds !== 'future') return null;
    const out = { t: o.t, x: o.x, y: o.y };
    if (o.v) out.v = o.v; if (o.f) out.f = 1;
    if (o.marker || STAND_IN[o.t]) {
      const si = STAND_IN[o.t];
      if (si && this.kinds !== 'future') { out.t = si.t; out.role = o.t; if (si.tier) out.tier = si.tier; }
      else if (si) { out.role = o.t; }
      if (this.kinds === 'future' && ENGINE_KIND[o.t]) { const ek = ENGINE_KIND[o.t]; out.role = o.t; out.t = ek.t; for (const k of Object.keys(ek)) if (k !== 't' && o[k] == null) out[k] = ek[k]; }
    }
    for (const k of Object.keys(o)) if (!['t', 'x', 'y', 'v', 'f', 'sp', 'marker'].includes(k) && out[k] == null) out[k] = o[k];
    return out;
  }

  // ---------------------------------- validation --------------------------------
  // Flood-fills the walkable space (4 sub-cells per tile) honouring height rule and colliders.
  reach(fromX, fromY, R = 0.22) {
    const S = 4, W = this.W * S, H = this.H * S, blocked = new Uint8Array(W * H), seen = new Uint8Array(W * H);
    const m = this;
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const t = m.type[(cy / S) | 0][(cx / S) | 0]; if (t === '.' || t === 'w' || t === 'c') blocked[cy * W + cx] = 1;
    }
    for (const o of this.objs) {
      const def = PROP[o.t]; if (!def || !def.r) continue;
      if (o.t === 'house') continue;
      const rr = def.r + R, x0 = Math.floor((o.x - rr) * S), x1 = Math.ceil((o.x + rr) * S), y0 = Math.floor((o.y - rr) * S), y1 = Math.ceil((o.y + rr) * S);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
        if (Math.hypot((cx + 0.5) / S - o.x, (cy + 0.5) / S - o.y) < rr) blocked[cy * W + cx] = 1;
      }
    }
    for (const b of this.blockers || []) {   // extra rectangular blockers (house)
      for (let cy = Math.floor(b.y0 * S); cy < Math.ceil(b.y1 * S); cy++) for (let cx = Math.floor(b.x0 * S); cx < Math.ceil(b.x1 * S); cx++) if (cx >= 0 && cy >= 0 && cx < W && cy < H) blocked[cy * W + cx] = 1;
    }
    const seeds = Array.isArray(fromX) ? fromX : [[fromX, fromY]], q = [];   // several roots: the start plus every warp arrival (M2c)
    for (const [fx, fy] of seeds) {
      const k0 = Math.floor(fy * S) * W + Math.floor(fx * S);
      if (blocked[k0]) blocked[k0] = 0;   // nudge a root out of a blocked sub-cell
      if (!seen[k0]) { seen[k0] = 1; q.push(k0); }
    }
    const hOf = k => this.h[((k / W) | 0) / S | 0][((k % W) / S) | 0];
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], cx = k % W, cy = (k / W) | 0, h0 = hOf(k);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = ny * W + nx; if (seen[nk] || blocked[nk]) continue;
        if (Math.abs(hOf(nk) - h0) > 1.05) continue;
        seen[nk] = 1; q.push(nk);
      }
    }
    return { has: (x, y) => { const cx = Math.floor(x * S), cy = Math.floor(y * S); return cx >= 0 && cy >= 0 && cx < W && cy < H && !!seen[cy * W + cx]; }, count: q.length, seen, S, W, H };
  }

  validate() {
    const errs = [], warns = [], info = {};
    const m = this.toMap();
    if (m.tiles.length !== this.H || m.heights.length !== this.H) errs.push('row count mismatch');
    m.tiles.forEach((r, y) => { if (r.length !== this.W) errs.push(`tiles[${y}] length ${r.length}`); if (m.heights[y].length !== this.W) errs.push(`heights[${y}] length`); });
    if (!this.walkTile(m.start.x, m.start.y)) errs.push('start is not on walkable ground');
    // reachability: the start, plus the arrival of every warp whose door is itself reachable (iterated to a fixpoint)
    const seeds = [[m.start.x, m.start.y]], used = new Set(); let R = this.reach(seeds);
    for (let it = 0; it < 8; it++) {
      let grew = false;
      for (const w of this.warps) {
        if (used.has(w.id)) continue;
        const near = (x, y) => { if (R.has(x, y)) return true; for (let a = 0; a < 16; a++) for (const rr of [0.6, 0.9, 1.1]) if (R.has(x + Math.cos(a / 16 * 6.283) * rr, y + Math.sin(a / 16 * 6.283) * rr)) return true; return false; };
        if (near(w.x, w.y)) { used.add(w.id); seeds.push([w.to.x, w.to.y]); grew = true; }
      }
      if (!grew) break;
      R = this.reach(seeds);
    }
    for (const w of this.warps) {
      if (!this.walkTile(w.x, w.y)) errs.push(`warp ${w.id} door (${w.x},${w.y}) not on walkable ground`);
      else if (!used.has(w.id)) errs.push(`warp ${w.id} door (${w.x},${w.y}) unreachable`);
      if (!this.walkTile(w.to.x, w.to.y)) errs.push(`warp ${w.id} arrival (${w.to.x},${w.to.y}) not on walkable ground`);
      for (const q of this.warps) if (q !== w && Math.hypot(q.x - w.to.x, q.y - w.to.y) < 1.4) errs.push(`warp ${w.id} arrives on top of door ${q.id} (instant bounce)`);
    }
    for (const rm of this.rooms) if (rm.kind !== 'flat') { const j = Math.floor(rm.y), i = Math.floor(rm.x); if (this.voids.length && this.inVoid(rm.x, rm.y)) errs.push(`room ${rm.id} sits in a void gutter`); void i; void j; }
    const chk = (what, x, y) => {
      if (!this.walkTile(x, y)) { errs.push(`${what} (${x},${y}) not on walkable ground`); return; }
      let ok = R.has(x, y);   // props with colliders block their own cell: accept any reachable cell within 1.1 tiles
      for (let a = 0; a < 16 && !ok; a++) for (const rr of [0.6, 0.9, 1.1]) if (R.has(x + Math.cos(a / 16 * 6.283) * rr, y + Math.sin(a / 16 * 6.283) * rr)) { ok = true; break; }
      if (!ok) errs.push(`${what} (${x},${y}) unreachable from start`);
    };
    for (const p of this.portals) chk('portal ' + p.to, p.x, p.y);
    for (const mk of this.markers) { if (mk.secretOnly) continue; chk('marker ' + mk.t + (mk.label ? ':' + mk.label : ''), mk.x, mk.y); }
    for (const rm of this.rooms) { if (rm.kind === 'flat') continue; chk('room ' + rm.id, rm.x, rm.y); }
    const ids = new Set();
    for (const tr of this.triggers) {
      if (ids.has(tr.id)) errs.push(`duplicate trigger id ${tr.id}`); ids.add(tr.id);
      for (const q of tr.requires || []) if (!this.triggers.some(t => t.id === q)) errs.push(`trigger ${tr.id} requires missing ${q}`);
      if (tr.when.type === 'all_enemies_dead' && !(tr.requires || []).length) errs.push(`trigger ${tr.id}: all_enemies_dead without requires`);
      if (tr.when.type === 'enter_area') chk('enter_area ' + tr.id, tr.when.x, tr.when.y);
      for (const a of tr.actions) if (a.type === 'spawn' || a.type === 'spawn_boss') { if (a.x != null) chk(`spawn ${tr.id}`, a.x, a.y); } else if (a.type === 'spawnPack') chk(`spawnPack ${tr.id}`, a.at.x, a.at.y);
    }
    for (const p of this.portals) if (Math.hypot(p.x - m.start.x, p.y - m.start.y) < 2) warns.push(`portal ${p.to} within 2 tiles of start (instant bounce risk)`);
    // secrets: reachable but off the main route
    for (const p of this.paths) if (p.kind === 'secret') {
      const end = p.samples[p.samples.length - 1];
      if (!R.has(end.x, end.y)) errs.push(`secret path ${p.name} end unreachable`);
    }
    // holds flat?
    for (const p of this.paths) for (const c of p.ctrl) if (c.hold > 0) {
      const lv = new Set(); p.samples.forEach((sm, i) => { if (Math.abs(sm.s - c.s) <= c.hold * 0.8) lv.add(Math.round(p.prof[i])); });
      if (lv.size > 1) warns.push(`path ${p.name}: hold near s=${c.s.toFixed(0)} is not flat (${[...lv]})`);
    }
    // stats
    let land = 0, levels = new Set(), reachTiles = 0;
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.land[y][x]) { land++; levels.add(this.h[y][x]); if (R.has(x + 0.5, y + 0.5)) reachTiles++; }
    const counts = {}; for (const o of m.objects) counts[o.t] = (counts[o.t] || 0) + 1;
    Object.assign(info, { W: this.W, H: this.H, land, reachableTiles: reachTiles, levels: [...levels].sort((a, b) => a - b), objects: m.objects.length, objectCounts: counts, triggers: this.triggers.length, portals: this.portals.length, rooms: this.rooms.filter(r => r.kind !== 'flat').length });
    this.lastReach = R;
    return { errors: errs, warnings: warns, info, reach: R };
  }
}

const ZONE = { path: 1, room: 2, fight: 4, water: 8, bridge: 16, side: 32, secret: 64, stairs: 128 };

// generate(recipe, opts) -> { gen, map, report }
function generate(recipe, opts = {}) {
  const g = new MapGen(Object.assign({}, recipe.opts, opts, { id: recipe.id }));
  if (recipe.patch) { g.patchF = recipe.patch.f; g.patchD = recipe.patch.d; }
  recipe.layout(g, T);
  g.build();
  recipe.populate(g, T);
  if (recipe.coastBand !== false && !opts.noCoastBand) g.coastBand(recipe.coastBand || {});   // §29: after populate, so objects stay put
  const rep = g.validate();
  return { gen: g, map: g.toMap(), report: rep };
}

module.exports = { ENGINE_KIND, COMPAT_ENEMY, MapGen, generate, T, PROP, STAND_IN, ZONE, makeRng, makeNoise, catmull, distField, clamp, lerp, smoothstep, grid };
