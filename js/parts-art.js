'use strict';
// ---------------------------------------------------------------------------
// PARTS_ART - the parts kit (DESIGN 23.6 / 24): a weapon or armour LOOK is data, not drawing code.
//
//   look = TEMPLATE (one silhouette per variant / suit, ASCII) + TIER TABLE (5 rows: a palette + a few part swaps)
//
// An artist adds a variant by writing ONE template and ONE tier table; stamps (guards, pommels, pauldrons...) are shared in LIB.
// Pure data + grid maths: no canvas, no DOM. hero.js paints the compiled cells (HERO, via a painter), icons.js reads the same cells,
// tools/hero-preview.html shows every set. Needs nothing else (a fake `document` is not even required to compile in node).
//
// ===== data format ======================================================================================================
// SET = {                                   KITS.weapon.sword, KITS.chest.warden, KITS.head.knighthelm, KITS.boots.stalkershoes, DEMO.weapon.rapier
//   tpl: {                                  the silhouette
//     aim: 'up' | 'right'                   weapons: which sprite direction is "forward" (staff/sword point up, a bow's belly faces right)
//     slots: { 1: 'guard', 2: 'pommel' }    digit markers in the ASCII -> stamp slot names
//     legend: { k: ['g','l'] }              extra cell chars -> [material, forced tone]; see CELLS below
//     layers: [ LAYER, ... ]                painted in order
//   },
//   pal:   { b: '#c4d4e8', t: 'gold', ... } material letter -> colour (hex | 'gold'|'white' shared ramp | [h,m,l,d] hexes)
//   parts: { guard: { cup: STAMP } }        optional set-local stamps (the shared ones live in LIB)
//   tiers: [ TIER x5 ]                      T1..T5 = BASES tier index 0..4
// }
// LAYER = { id, view:'both'|'front'|'back', at:[x,y], rows:[...] | shapes:{ base:{rows, grow:[start,len]}, ... },
//           attach:'none'|'bob'|'arm'|'leg'   which animation offset moves it (hero.js frame params: bob, lay/ray, la/ra)
//           mirror:'half'|'pair'|null          'half': rows describe the left half, mirrored about x=11.5 (forced tones swap h/l);
//                                              'pair': two copies (left / right arm or leg), each moved by its own limb offset
//           sway:y0 }                           cells at y>=y0 shift by the frame's skirt sway
// TIER  = { pal:{...}, shape:'broad', grow:n, parts:{ guard:'cross', pommel:'orb' }, light:'#8ad8ff' }
//           pal   overrides SET.pal for this tier;   shape   picks LAYER.shapes[shape];   grow  repeats LAYER.shapes[..].grow block n extra times
//           parts slot -> stamp name (omitted slot = nothing);   light = a glow colour (T4+ weapons: hero.js adds a light)
// STAMP = { at:[ax,ay], rows:[...] }        painted so that cell (ax,ay) lands on the slot's digit marker; '.' leaves the cell alone, '!' erases
//
// CELLS (one char each):  .  empty     1-9  slot marker (a stamp goes here)     @  hand grip anchor (a 'g' cell)
//   a-z  material, auto-shaded: top / left edge -> highlight, bottom / right edge -> shadow, inside -> mid (edges are between materials)
//   A-Z  the same material forced to its highlight tone      * % $  socket 1/2/3 (the gem lands on this cell + the one to its right;
//   the cell paints like its right neighbour)               !  (stamps only) erase          legend chars: see tpl.legend
// ---------------------------------------------------------------------------
const PARTS_ART = (function () {
  // ---- colour ----------------------------------------------------------------------------------------------------------
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const dk = (c, f) => toHex(rgb(c).map(v => v * f));
  const lt = (c, t) => toHex(rgb(c).map(v => v + (255 - v) * t));
  const RP = c => ({ h: lt(c, 0.4), m: c, l: dk(c, 0.7), d: dk(c, 0.45) });          // highlight / mid / low / deep
  const NAMED = { gold: RP('#e8b830'), white: RP('#e8eef8'), steel: RP('#98a6bd'), fur: { h: '#f4f0e6', m: '#e4e0d4', l: '#bdb8a8', d: '#8a8678' }, ink: RP('#1a1020') };
  const ramp = v => (typeof v === 'string' ? (v[0] === '#' ? RP(v) : NAMED[v]) : { h: v[0], m: v[1], l: v[2], d: v[3] });

  // ---- the shared stamp library (slot -> name -> stamp), filled below ---------------------------------------------------
  const LIB = {};
  const KITS = { weapon: {}, chest: {}, head: {}, boots: {} };
  const DEMO = { weapon: {} };                          // planned variants shown in tools/hero-preview.html only: never reachable in game

  const key = (x, y) => (y + 200) * 1000 + (x + 200);
  // forced tones. Upper-case of a material letter = its highlight (h). The other forced tones (m = mid, l = low, d = deep) are these
  // legend letters: the letter -> [material, tone]. A set / stamp `legend` may add or override chars.
  //   b: B h  Y m  Z l  X d      e: E h  O m  L l      t: T h  M m  Q l  D d      g: G h  J m  K l
  //   w: W h  H m  I l  P d      a: A h  U m  V l      s: S h  R m               f: F h  C m  x l      n: N h
  const LEGEND = { Y: ['b', 'm'], Z: ['b', 'l'], X: ['b', 'd'], O: ['e', 'm'], L: ['e', 'l'], M: ['t', 'm'], Q: ['t', 'l'], D: ['t', 'd'], J: ['g', 'm'], K: ['g', 'l'],
    H: ['w', 'm'], I: ['w', 'l'], P: ['w', 'd'], U: ['a', 'm'], V: ['a', 'l'], R: ['s', 'm'], C: ['f', 'm'], x: ['f', 'l'] };
  const parseCell = (c, legend) => {
    const L = legend[c]; if (L) return typeof L === 'string' ? { m: L, f: null } : { m: L[0], f: L[1] };
    if (c >= 'a' && c <= 'z') return { m: c, f: null };
    if (c >= 'A' && c <= 'Z') return { m: c.toLowerCase(), f: 'h' };
    return null;
  };
  const FLIP = { h: 'l', l: 'h' };
  const nb = (r, x) => (r[x + 1] && r[x + 1] !== '.' && r[x + 1] !== ' ' ? r[x + 1] : (r[x - 1] && r[x - 1] !== '.' ? r[x - 1] : 'b'));   // a socket cell paints like a neighbour

  // one LAYER of one tier -> sparse grid { Map key -> {x,y,m,f} }, markers, sockets, grip
  function layerGrid(set, layer, tier) {
    const tpl = set.tpl, legend = Object.assign({ '@': 'g' }, LEGEND, tpl.legend);
    const shape = layer.shapes ? (layer.shapes[tier.shape] || layer.shapes.base) : layer;
    let rows = shape.rows.slice();
    if (shape.grow && tier.grow) {                       // repeat the grow block (cycled) n extra times right after it
      const [s, len] = shape.grow, blk = rows.slice(s, s + len), add = [];
      for (let i = 0; i < tier.grow; i++) add.push(blk[i % len]);
      rows.splice(s + len, 0, ...add);
    }
    const G = new Map(), marks = [], socks = [], out = { G, socks, grip: null };
    const put = (x, y, c, lg) => { const p = parseCell(c, lg); if (p) G.set(key(x, y), { x, y, m: p.m, f: p.f }); return p; };
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) {
        const c = r[x], X = layer.at[0] + x, Y = layer.at[1] + y;
        if (c === '.' || c === ' ') continue;
        if (c >= '1' && c <= '9') { marks.push({ slot: tpl.slots[c], x: X, y: Y }); continue; }
        if (c === '*' || c === '%' || c === '$') { socks.push({ p: '*%$'.indexOf(c), x: X, y: Y }); put(X, Y, nb(r, x), legend); continue; }
        if (c === '@') out.grip = [X, Y];
        put(X, Y, c, legend);
      }
    });
    for (const m of marks) {
      const name = (tier.parts && tier.parts[m.slot]) || 'default';
      const st = (set.parts && set.parts[m.slot] && set.parts[m.slot][name]) || (LIB[m.slot] && LIB[m.slot][name]);
      if (!st) { if (name !== 'default' && typeof console !== 'undefined') console.warn('PARTS_ART: no stamp', m.slot, name); continue; }
      const lg = Object.assign({}, legend, st.legend);
      st.rows.forEach((r, sy) => {
        for (let sx = 0; sx < r.length; sx++) {
          const c = r[sx], X = m.x - st.at[0] + sx, Y = m.y - st.at[1] + sy;
          if (c === '.' || c === ' ') continue;
          if (c === '!') { G.delete(key(X, Y)); continue; }
          if (c === '*' || c === '%' || c === '$') { socks.push({ p: '*%$'.indexOf(c), x: X, y: Y }); put(X, Y, nb(r, sx), lg); continue; }
          put(X, Y, c, lg);
        }
      });
    }
    return out;
  }
  const axisOf = layer => (layer.axis != null ? layer.axis : 23);
  function mirrorGrid(G, axis) {
    const M = new Map();
    for (const c of G.values()) { const x = axis - c.x; M.set(key(x, c.y), { x, y: c.y, m: c.m, f: c.f ? (FLIP[c.f] || c.f) : null }); }
    return M;
  }
  function shade(G, pal) {                               // -> [[x, y, '#hex'], ...] row-major
    const out = [], cells = Array.from(G.values()).sort((a, b) => a.y - b.y || a.x - b.x);
    for (const c of cells) {
      const same = (dx, dy) => { const n = G.get(key(c.x + dx, c.y + dy)); return n && n.m === c.m; };
      const t = c.f || (!same(0, -1) || !same(-1, 0) ? 'h' : !same(0, 1) || !same(1, 0) ? 'l' : 'm');
      const R = pal[c.m]; if (!R) { out.push([c.x, c.y, '#ff00ff']); continue; }
      out.push([c.x, c.y, R[t]]);
    }
    return out;
  }
  const palOf = (set, tier) => {
    const P = {}, src = Object.assign({}, set.pal, tier.pal);
    for (const k in src) P[k] = ramp(src[k]);
    return P;
  };

  // compile one set at one tier -> { layers:[{id, view, attach, pair, sway, cells, cellsR}], sockets:[[x,y]], grip, tip, light, aim }
  const memo = {};
  function compile(kind, family, ti, demo, growCap) {
    const mk = kind + ':' + family + ':' + ti + (demo ? ':d' : '') + (growCap != null ? ':g' + growCap : ''); if (memo[mk]) return memo[mk];
    const set = (demo ? DEMO : KITS)[kind] && (demo ? DEMO : KITS)[kind][family]; if (!set) return null;
    let tier = set.tiers[Math.max(0, Math.min(set.tiers.length - 1, ti | 0))];
    if (growCap != null && (tier.grow | 0) > growCap) tier = Object.assign({}, tier, { grow: growCap });     // icons: a shorter blade
    const pal = palOf(set, tier);
    const res = { kind, family, tier: ti, layers: [], sockets: [], grip: null, tip: null, light: tier.light || null, aim: set.tpl.aim || 'up' };
    const socks = [];
    for (const layer of set.tpl.layers) {
      const g = layerGrid(set, layer, tier); let G = g.G;
      if (layer.mirror === 'half') {
        const ax = axisOf(layer), M = mirrorGrid(G, ax); for (const [k, v] of M) if (!G.has(k)) G.set(k, v);
        for (const q of g.socks.slice()) if (q.x <= ax / 2 - 1.5) g.socks.push({ p: q.p + 0.5, x: ax - q.x - 1, y: q.y });   // off-centre sockets get a mirrored twin (the gem is 2 wide)
      }
      const L = { id: layer.id, view: layer.view || 'both', attach: layer.attach || 'none', pair: layer.mirror === 'pair', sway: layer.sway != null ? layer.sway : null };
      L.cells = shade(G, pal);
      if (L.pair) L.cellsR = shade(mirrorGrid(G, axisOf(layer)), pal);
      res.layers.push(L);
      for (const s of g.socks) socks.push(s);
      if (g.grip) res.grip = g.grip;
    }
    res.sockets = socks.sort((a, b) => a.p - b.p || a.y - b.y || a.x - b.x).map(s => [s.x, s.y]);
    let top = 1e9, tx = [];
    for (const L of res.layers) for (const c of L.cells) { if (c[1] < top) { top = c[1]; tx = []; } if (c[1] === top) tx.push(c[0]); }
    if (tx.length) res.tip = [(Math.min(...tx) + Math.max(...tx)) / 2, top];
    return (memo[mk] = res);
  }
  // a weapon is one 'none' layer: normalise it to a canvas (pad px of margin for hero.js' outline): { w, h, cells, grip, tip, sockets, aim, light }
  function weapon(family, ti, demo, pad, growCap) {
    pad = pad == null ? 2 : pad;
    const c = compile('weapon', family, ti, demo, growCap); if (!c) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const L of c.layers) for (const q of L.cells) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const ox = pad - x0, oy = pad - y0, cells = [];
    for (const L of c.layers) for (const q of L.cells) cells.push([q[0] + ox, q[1] + oy, q[2]]);
    return { w: x1 - x0 + 1 + pad * 2, h: y1 - y0 + 1 + pad * 2, cells, grip: c.grip ? [c.grip[0] + ox, c.grip[1] + oy] : [Math.round((x0 + x1) / 2) + ox, y1 + oy],
      tip: c.tip ? [c.tip[0] + ox, c.tip[1] + oy] : [0, 0], sockets: c.sockets.map(s => [s[0] + ox, s[1] + oy]), aim: c.aim, light: c.light };
  }
  // armour layers for one view, ready for a painter: [{ attach, pair, sway, cells, cellsR }] + gem anchors
  function armour(kind, family, ti, view) {
    const c = compile(kind, family, ti, false); if (!c) return null;
    return { layers: c.layers.filter(L => L.view === 'both' || L.view === view), sockets: view === 'front' ? c.sockets : [] };
  }
  const tierCount = (kind, family, demo) => { const s = (demo ? DEMO : KITS)[kind][family]; return s ? s.tiers.length : 0; };

  return { LIB, KITS, DEMO, RP, NAMED, ramp, compile, weapon, armour, tierCount, dk, lt, toHex,
    families: kind => Object.keys(KITS[kind]), demoFamilies: kind => Object.keys(DEMO[kind] || {}) };
})();

// =====================================================================================================================
// STAMP LIBRARY - shared parts. Slot -> name -> { at:[ax,ay], rows }. A slot with no stamp for a tier is left empty.
// =====================================================================================================================
(function () {
  const { LIB } = PARTS_ART;
  const S = (slot, name, at, rows, legend) => { (LIB[slot] || (LIB[slot] = {}))[name] = { at, rows, legend }; };

  // ---- sword guards (marker = the guard's top row, on the left centre column x=7; widths are even: the sword is 2 px wide) ----
  S('guard', 'bar6', [2, 0], ['tt*ttt', 'tttttt']);
  S('guard', 'bar8', [3, 0], ['ttt*tttt', 'tttttttt']);
  S('guard', 'gold10', [4, 1], ['T........T', 'tttt*ttttt', 'tttttttttt']);                                   // + horns
  S('guard', 'gold12', [5, 2], ['M..........M', 'M..........M', 'ttttt*tttttt', 'tttttttttttt', '.QQ......QQ.']);   // + tall horns, drooping tips
  S('guard', 'wing14', [7, 3], ['T..............T', 'TM............MT', 'TM............MT', '.tttttt*ttttttt.', '.tttttttttttttt.',
    '.MQRR......RRQM.', '...RR......RR...', '....S......S....']);                                                     // winged, pearl drops
  // ---- sword / generic pommels (marker = pommel top row, left centre column) ----
  S('pommel', 'knob', [0, 0], ['$t', 'tt']);
  S('pommel', 'gold2', [1, 0], ['t$tt', 'tttt']);
  S('pommel', 'gold3', [1, 0], ['t$tt', 'tttt', 'tttt']);
  // ---- grip bands, 2 px wide ----
  S('band', 'gold', [0, 0], ['MM']);
  // ---- blade etch: a sun emblem on a 4-wide blade ----
  S('etch', 'sun', [0, 0], ['.aa.', 'aSSa', '.aa.']);

  // ---- staff: head ornaments (marker = shaft top, left centre column), orbs (marker = orb centre), foot caps, pits, glints ----
  S('head', 'prongs1', [2, 4], ['W....W', 'W....W', 'W....W', 'W....W', '.W..W.']);
  S('head', 'prongs2', [3, 5], ['W......W', 'W......W', 'W......W', 'W......W', 'FW....WF', '.FW..WF.']);
  S('head', 'prongs3', [3, 6], ['.T....T.', 'T......T', 'T......T', 'T......T', 'T......T', '.T....T.', '..T..T..']);
  S('head', 'crescent', [4, 10], ['..MTTTTM..', '.MT....TM.', 'MT......TM', 'T........T', 'T........T', 'T........T', 'T........T']);
  S('head', 'rings', [7, 14], ['.......TM.......', '.......ST.......', '................', '......MMMM......', '....MT....TM....', '...MT......TM...', '.T.T........T.T.',
    '..M..........M..', '..M..........M..', 'M.M..........M.M', '.MM..........MM.', '...MM......MM...']);
  S('orb', 'orb1', [1, 1], ['.aa.', 'a*aa', '.aa.']);
  S('orb', 'orb2', [1, 2], ['.aa.', 'aaaa', 'a*aa', 'aaaa', '.aa.']);
  S('orb', 'orb3', [2, 3], ['..aa..', '.Saaa.', 'aaaaaa', 'aa*aaa', '.aaaa.', '..aa..']);
  S('orb', 'orb4', [5, 6], ['A...........', '............', '...........A', '....aaaa....', '...aaaaaa...', '...aaaaaa...', '...aa*aaa...', '...aaaaaa...', '....aaaa....', '.S..........']);
  S('orb', 'orb5', [5, 6], ['A...........', '............', '....aaaa...A', '...Saaaaa...', '..aaaaaaaa..', '..aaaaaaaa..', '..aaa*aaaa..', '..aaaaaaaa..', '...aaaaaa...', '.S..aaaa....']);
  S('foot', 'cap', [0, 0], ['MM', 'MM']);
  S('foot', 'cap2', [0, 0], ['MM', 'MM', 'QQ']);
  S('wear', 'pit', [0, 0], ['P']);
  S('glint', 'dot', [0, 0], ['U']);

  // ---- bow: grip ornament (marker = the belly centre, 2 px right of the grip) ----
  S('orn', 'pearls', [0, 4], ['.R.', 'S..', '.R.', '...', 'MMT', '...', '.R.', 'S..', '.R.']);
})();

// =====================================================================================================================
// LIVE WEAPONS: sword / staff / bow x 5 tiers (grey -> ornate -> sun-etched -> glowing -> light, DESIGN 23.3)
// =====================================================================================================================
(function () {
  const { KITS } = PARTS_ART;
  const rep = (n, s) => Array(n).fill(s);
  const BLANK = '................';

  // ---- SWORD: a blade (shape = rusty | slim | broad | glint | light; `grow` lengthens it), a grip, and 4 slots: guard, band, pommel, etch.
  // Rows: 0 = tip; 1.. = the grow block; 11,12 = guard; 13-18 = grip; 19.. = pommel. The blade is 2 px wide (cols 7,8) or 4 (cols 6-9).
  const GRIP = ['.......KK.......', '.......JJ.......', '.......KK.......', '.......J@.......', '.......KK.......', '.......JJ.......'];
  const SLOTS = rep(11, BLANK).concat(['.......1........', BLANK, '.......2........', BLANK, BLANK, BLANK, BLANK, '.......2........', '.......3........']);
  SLOTS[8] = '......4.........';
  KITS.weapon.sword = {
    tpl: { aim: 'up', slots: { 1: 'guard', 2: 'band', 3: 'pommel', 4: 'etch' }, layers: [
      { id: 'blade', at: [0, 0], shapes: {
        rusty: { rows: ['.......bb.......', '.......bb.......', '.......bU.......', '.......bb.......', '.......X........', '.......%b.......', '.......Ub.......', '.......bb.......', '.......bU.......', '.......bb.......', '.......bb.......', BLANK, BLANK].concat(GRIP) },
        slim: { grow: [1, 1], rows: ['.......bb.......', '.......Ob.......', '.......Ob.......', '.......Ob.......', '.......Ob.......', '.......%b.......'].concat(rep(5, '.......Ob.......'), [BLANK, BLANK], GRIP) },
        broad: { grow: [1, 1], rows: ['.......bb.......', '......bbZb......', '......bbZb......', '......bbZb......', '......bbZb......', '......b%Zb......'].concat(rep(5, '......bbZb......'), [BLANK, BLANK], GRIP) },
        glint: { grow: [1, 3], rows: ['.......bb.......', '......UbZU......', '......bbZb......', '......bbZb......', '......bbZb......', '......b%Zb......'].concat(rep(5, '......bbZb......'), [BLANK, BLANK], GRIP) },
        light: { grow: [1, 4], rows: ['.......bb.......', '......bMZT......', '......bbZT......', '......bbZT......', '......bbZT......', '......b%ZT......'].concat(rep(5, '......bbZT......'), [BLANK, BLANK], GRIP) },
      } },
      { id: 'slots', at: [0, 0], grow: [1, 1], rows: SLOTS },
    ] },
    pal: { b: '#c4d4e8', e: '#8c98ae', t: 'gold', g: '#5a3a24', a: '#ffb830', s: '#ffffff', d: '#1a1020' },
    tiers: [
      { shape: 'rusty', grow: 0, pal: { b: '#a0907e', t: '#6a5a4a', a: '#a05a38' }, parts: { guard: 'bar6', pommel: 'knob' } },
      { shape: 'slim', grow: 3, pal: { b: '#aeb8c8', e: '#8c98ae', t: '#8a94a8' }, parts: { guard: 'bar8', band: 'gold', pommel: 'knob' } },
      { shape: 'broad', grow: 6, pal: { b: '#c4d4e8', a: '#ffb830' }, parts: { guard: 'gold10', band: 'gold', pommel: 'gold2', etch: 'sun' } },
      { shape: 'glint', grow: 8, pal: { b: '#d8ecff', a: '#8ad8ff', g: '#3a2848' }, parts: { guard: 'gold12', band: 'gold', pommel: 'gold3' }, light: '#8ad8ff' },
      { shape: 'light', grow: 10, pal: { b: '#fff0c0', g: '#3a2848' }, parts: { guard: 'wing14', band: 'gold', pommel: 'gold3' }, light: '#fff0c0' },
    ],
  };

  // ---- STAFF: a shaft + 6 slots: head (prongs / crescent / rings), orb (size + colour), band, foot, wear, glint. Orb colour = pal.a.
  const SH = rep(14, BLANK).concat(rep(23, '.......ww.......'));
  SH[24] = '.......%w.......'; SH[26] = '.......w@.......'; SH[31] = '.......$w.......';
  const SS = rep(38, BLANK); const setc = (x, y, c) => { SS[y] = SS[y].slice(0, x) + c + SS[y].slice(x + 1); };
  setc(7, 9, '2'); setc(7, 14, '1'); setc(7, 22, '3'); setc(8, 22, '5'); setc(7, 26, '6'); setc(7, 29, '5'); setc(7, 30, '3'); setc(8, 33, '6'); setc(7, 35, '4');
  KITS.weapon.staff = {
    tpl: { aim: 'up', slots: { 1: 'head', 2: 'orb', 3: 'band', 4: 'foot', 5: 'wear', 6: 'glint' }, legend: { '@': 'w' }, layers: [
      { id: 'shaft', at: [0, 0], rows: SH }, { id: 'slots', at: [0, 0], rows: SS } ] },
    pal: { w: '#7a5a3a', a: '#6a8ac0', t: 'gold', f: '#58c060', s: '#ffffff', d: '#1a1020' },
    tiers: [
      { pal: { w: '#7a5a3a', a: '#6a8ac0' }, parts: { head: 'prongs1', orb: 'orb1', wear: 'pit' } },
      { pal: { w: '#6a4a30', a: '#58b0e8' }, parts: { head: 'prongs2', orb: 'orb2' } },
      { pal: { w: '#5e4028', a: '#9070f0' }, parts: { head: 'prongs3', orb: 'orb3', band: 'gold', foot: 'cap' } },
      { pal: { w: '#e8e0c0', a: '#d070ff' }, parts: { head: 'crescent', orb: 'orb4', band: 'gold', foot: 'cap2', glint: 'dot' }, light: '#d070ff' },
      { pal: { w: '#f4ecd0', a: '#ff9ae8' }, parts: { head: 'rings', orb: 'orb5', band: 'gold', foot: 'cap2', glint: 'dot' }, light: '#ff9ae8' },
    ],
  };

  // ---- BOW: the limbs + string are the silhouette (shape = plain | curl | glow | gold); slots: band (grip), dot, orn. aim 'right': the belly faces forward.
  KITS.weapon.bow = {
    tpl: { aim: 'right', slots: { 1: 'band', 2: 'dot', 3: 'orn' }, layers: [
      { id: 'limbs', at: [0, 0], shapes: {
        plain: { rows: [
          '.....www.....',
          '.....nwww....',
          '.....n.ww....',
          '.....n.www...',
          '.....n..www..',
          '.....n...ww..',
          '.....n...%w..',
          '.....n...www.',
          '.....n....ww.',
          '.....n....www',
          '.....n.....ww',
          '.....n.....KK',
          '.....n.....JJ',
          '.....n.....*K',
          '.....n.....J@',
          '.....n.....KK',
          '.....n.....JJ',
          '.....n.....KK',
          '.....n....www',
          '.....n....ww.',
          '.....n...www.',
          '.....n...ww..',
          '.....n...$w..',
          '.....n..www..',
          '.....n.www...',
          '.....n.ww....',
          '.....nwww....',
          '.....nww.....',
          '.....ww......'] },
        curl: { rows: [
          '........tt...',
          '........nt...',
          '.......tnt...',
          '.......wnw...',
          '........nww..',
          '........nww..',
          '........n%w..',
          '........nwww.',
          '........n.ww.',
          '........n.www',
          '........n..ww',
          '........n..KK',
          '........n..JJ',
          '........n..*K',
          '........n..J@',
          '........n..KK',
          '........n..JJ',
          '........n..KK',
          '........n.www',
          '........n.ww.',
          '........nwww.',
          '........nww..',
          '........n$w..',
          '........nww..',
          '.......wnw...',
          '.......wnw...',
          '........nt...',
          '........nt...',
          '........tt...'] },
        glow: { rows: [
          '........tt...',
          '........nt...',
          '.......tnt...',
          '.......wnw...',
          '........nww..',
          '........nww..',
          '........n%w..',
          '........nwww.',
          '........n.ww.',
          '........n.www',
          '........n..ww',
          '........n..KK',
          '........n..JJ',
          '........n..*K',
          '........n..J@',
          '........n..KK',
          '........n..JJ',
          '........n..KK',
          '........n.www',
          '........n.ww.',
          '........nwww.',
          '........nUw..',
          '........n$w..',
          '........nww..',
          '.......wnw...',
          '.......wnw...',
          '........nt...',
          '........nt...',
          '........tt...'] },
        gold: { rows: [
          '........tt...',
          '........nt...',
          '.......tnt...',
          '.......wnw...',
          '........nww..',
          '........nww..',
          '........n%w..',
          '........nwww.',
          '........n.ww.',
          '........n.www',
          '........n..Mw',
          '........n..KK',
          '........n..JJ',
          '........n..*K',
          '........n..J@',
          '........n..KK',
          '........n..JJ',
          '........n..KK',
          '........n.wMw',
          '........n.ww.',
          '........nwww.',
          '........nww..',
          '........n$w..',
          '........nww..',
          '.......wnw...',
          '.......wnw...',
          '........nt...',
          '........nt...',
          '........tt...'] },
      } },
      { id: 'slots', at: [0, 0], rows: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...........1....',
        '.............2..',
        '................',
        '.............3..',
        '................',
        '.............2..',
        '...........1....',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'] },
    ] },
    pal: { w: '#8a6038', n: '#d8d0c0', g: '#5a3a24', t: 'gold', a: '#9affb0', s: '#ffffff', d: '#1a1020' },
    tiers: [
      { shape: 'plain', pal: { w: '#8a6038', n: '#d8d0c0' }, parts: {} },
      { shape: 'plain', pal: { w: '#6e4a2c', n: '#e8e0d0' }, parts: {} },
      { shape: 'curl', pal: { w: '#5a6a34', n: '#f0e8d0' }, parts: { band: 'gold' } },
      { shape: 'glow', pal: { w: '#3c7a4c', n: '#a0ffb0', a: '#9affb0' }, parts: { band: 'gold', dot: 'dot' }, light: '#9affb0' },
      { shape: 'gold', pal: { w: '#f0e0a0', n: '#ffffff' }, parts: { band: 'gold', dot: 'dot', orn: 'pearls' }, light: '#fff0c0' },
    ],
  };
})();

// =====================================================================================================================
// LIVE CHEST SUITS: warden / dreamweave / stalker x 5 tiers. Layers (see the format at the top): half-mirrored torsos, a left/right
// arm pair (attach 'arm'), a swaying skirt (dreamweave), plain overlays for the off-centre bits. Marker slots -> stamps.
// =====================================================================================================================
(function () {
  const { KITS, dk } = PARTS_ART;
  const rep = (n, s) => Array(n).fill(s);
  const STEEL = ['#7d8494', '#98a6bd', '#b4c4dc', '#c9d6ec', '#dfe8f8'];

  // ---- WARDEN (heavy): breastplate b, fauld / pauldrons e (same steel, a separate material so the edges read), gold t, tabard c.
  // slots: 1 pauld (marker x7,y14) | 2 tab (x10,y24) | 3 trim (x8,y26) | 4 bracer (arm x6,y18) | 5 glove (arm x6,y23)
  KITS.chest.warden = {
    cape: '#b02a42',
    tpl: { slots: { 1: 'pauld', 2: 'tab', 3: 'trim', 4: 'bracer', 5: 'glove' }, layers: [
      { id: 'torso', view: 'front', attach: 'bob', mirror: 'half', at: [3, 9], rows: rep(5, '.........').concat(['....1....', '.....bZZZ', '.....bbbB', '.....bbb*', '.....bbZB', '.....bbbB', '.....bbbB', '.....eeee', '.....LLLL', '.....eeee', '.......2.', '.........', '.....3...']) },
      { id: 'torso', view: 'back', attach: 'bob', mirror: 'half', at: [3, 14], rows: ['....1....', '.....bbbb'].concat(rep(6, '.....bbbB'), ['.....bbbb']) },
      { id: 'arm', attach: 'arm', mirror: 'pair', at: [6, 18], rows: ['4', '.', '.', '.', '.', '5'] },
    ] },
    pal: { b: STEEL[0], e: STEEL[0], t: 'gold', c: '#b02a42', s: '#ffffff' },
    parts: {
      pauld: {
        p1: { at: [2, 0], rows: ['eee', '%ee'] },
        p2: { at: [2, 0], rows: ['eee', '%ee', 'LLL'] },
        p3: { at: [3, 0], rows: ['eeee', 'e%ee', 'tttt'] },
        p4: { at: [3, 2], rows: ['E...', 'eeee', 'eMee', 'e%ee', 'tttt', '.LLL'] },
        p5: { at: [4, 5], rows: ['T....', '.M...', '.MT..', 'E....', 'eeeee', 'eMeee', 'ee%ee', 'ttttt', '.LLLL'] },
      },
      tab: { tab: { at: [0, 1], rows: ['cc', 'cc', 'cc'] } },
      trim: {
        trim1: { at: [0, 11], rows: ['..MM', '....', '....', '....', '....', 'MMMM', '...M', '...M'] },
        trim2: { at: [0, 11], rows: ['Q.MM', 'Q...', 'Q...', 'QTT.', 'Q...', 'MMMM', '...M', '...M'] },
        trim3: { at: [0, 11], rows: ['Q.MM', 'Q.T.', 'Q...', 'QTT.', 'Q...', 'MMMM', '...M', '...M', '.MMM', '...M', '...T'] },
      },
      bracer: { vam: { at: [0, 0], rows: ['ee', 'ee', 'ee', 'ee'] }, vamg: { at: [0, 0], rows: ['tt', 'ee', 'ee', 'ee'] } },
      glove: { gaunt: { at: [0, 0], rows: ['ee', 'ee'] } },
    },
    tiers: [
      { pal: { b: STEEL[0], e: STEEL[0] }, parts: { pauld: 'p1' } },
      { pal: { b: STEEL[1], e: STEEL[1] }, parts: { pauld: 'p2', tab: 'tab', bracer: 'vam' } },
      { pal: { b: STEEL[2], e: STEEL[2] }, parts: { pauld: 'p3', tab: 'tab', trim: 'trim1', bracer: 'vamg', glove: 'gaunt' } },
      { pal: { b: STEEL[3], e: STEEL[3] }, parts: { pauld: 'p4', tab: 'tab', trim: 'trim2', bracer: 'vamg', glove: 'gaunt' } },
      { pal: { b: STEEL[4], e: STEEL[4] }, parts: { pauld: 'p5', tab: 'tab', trim: 'trim3', bracer: 'vamg', glove: 'gaunt' } },
    ],
  };

  // ---- DREAMWEAVE (caster): robe b, sash + cuffs a, neck k / r, mantle m, gold t. slots: 1 strip-less... see the stamps
  // 2 mantle (x7,y13) | 3 strip (x8,y23) | 4 collar (x9,y23) | 5 cuffTop (arm) | 6 cuff (arm) | 7 dust | 8 hem (skirt, x3,y29)
  const ROBE = ['#8a86b8', '#7664c4', '#5c46b8', '#46369c', '#30287c'], SASH = ['#a88a5a', '#d05078', '#d8a838', '#e8c850', '#ffe27a'];
  KITS.chest.dreamweave = {
    cape: '#5648c0',
    tpl: { slots: { 2: 'mantle', 3: 'strip', 4: 'collar', 5: 'cuffTop', 6: 'cuff', 7: 'dust', 8: 'hem' }, layers: [
      { id: 'skirt', attach: 'none', mirror: 'half', sway: 27, at: [3, 23], rows: ['.....bbbb', '....bbbbZ', '....bbbbZ', '...bbbbb$', '...bbbbbZ', '...bbbbbZ', '8........'] },
      { id: 'robe', view: 'front', attach: 'bob', mirror: 'half', at: [3, 13], rows: ['....2....', '.........', '.....bBkk', '.....bb*r', '.....bbbb', '.....bbbb', '.....bb%b', '.....aaaA', '.....aaaA', '.....bbbb', '.....34..'] },
      { id: 'robe', view: 'back', attach: 'bob', mirror: 'half', at: [3, 13], rows: ['....2....', '.........', '.....bBbb', '.....bbbb', '.....bbbb', '.....bbbb', '.....bbbb', '.....aaaa', '.....aaaa', '.....bbbb', '.....34..'] },
      { id: 'tail', view: 'front', attach: 'bob', at: [13, 22], rows: ['aa', 'aa', 'aa', 'aa', 'aa', 'A.'] },
      { id: 'tail', view: 'back', attach: 'bob', at: [10, 22], rows: ['aa', 'aa', 'aa', 'aa', 'aa'] },
      { id: 'sleeve', attach: 'arm', mirror: 'pair', at: [5, 18], rows: ['5..', 'bbb', 'bbb', 'bbb', 'bbb', '6..'] },
      { id: 'dust', attach: 'none', at: [9, 26], rows: ['7'] },
    ] },
    pal: { b: ROBE[0], a: SASH[0], m: '#6a5ad0', k: '#ecb890', r: '#c88a68', t: 'gold', s: '#ffffff' },
    parts: {
      mantle: { mantle: { at: [2, -1], rows: ['.mmmmm', 'mmmmm.', 'MMMm..'] } },
      strip: { strip: { at: [0, 7], rows: ['B', 'B', 'B', 'B'] } },
      collar: { collar: { at: [1, 8], rows: ['MMMM'] }, collar2: { at: [1, 8], rows: ['MMMT'] } },
      cuffTop: { gold: { at: [0, -1], rows: ['MMM'] } },
      cuff: { low: { at: [0, 1], rows: ['ZZZ'] }, sash: { at: [0, 1], rows: ['UUU'] } },
      hem: { hem: { at: [0, 1], rows: ['...MMMMMM'] } },
      dust: { dust1: { at: [1, 2], rows: ['M......', '......T', '.T.....'] }, dust2: { at: [1, 2], rows: ['M.T.....', '......T.', '.T..S...', '.......T'] } },
    },
    tiers: [0, 1, 2, 3, 4].map(t => ({
      pal: { b: ROBE[t], a: SASH[t], m: t === 3 ? '#6a5ad0' : '#4a3cb0' },
      parts: [{ cuff: 'low' }, { strip: 'strip', cuff: 'sash' }, { strip: 'strip', collar: 'collar', cuffTop: 'gold', cuff: 'sash', hem: 'hem' },
        { strip: 'strip', collar: 'collar', cuffTop: 'gold', cuff: 'sash', hem: 'hem', mantle: 'mantle', dust: 'dust1' },
        { strip: 'strip', collar: 'collar2', cuffTop: 'gold', cuff: 'sash', hem: 'hem', mantle: 'mantle', dust: 'dust2' }][t],
    })),
  };

  // ---- STALKER (medium): coat b / e, strap + belt r, undershirt v, sleeves o, fur f, brass n, gold t (steel before T3).
  // slots: 1 pad (x7,y14) | 2 fur (arm x6,y23) | 3 wrap (arm x6,y18) | 5 buckle (x11,y21)
  const LEATHER = ['#8c6a44', '#76593a', '#5e6b3c', '#3f5a3a', '#2c3430'];
  KITS.chest.stalker = {
    cape: '#4a7a3c',
    tpl: { slots: { 1: 'pad', 2: 'fur', 3: 'wrap', 5: 'buckle' }, layers: [
      { id: 'coat', view: 'front', attach: 'bob', mirror: 'half', at: [3, 13], rows: ['.........', '....1BZZZ', '.....bZZZ', '.....b%bv', '.....bbbv', '.....bb*v', '.....bbbv', '.....bbbv', '.....rrr5', '.....eeee', '.....ZZZX'] },
      { id: 'coat', view: 'back', attach: 'bob', mirror: 'half', at: [3, 13], rows: ['.........', '....1ZZZ.', '.....ZZZb', '.....bbbZ', '.....bbbZ', '.....bbbZ', '.....bbbZ', '.....bbbZ', '.....rrrr', '.....eeee', '.....ZZZX'] },
      { id: 'strap', view: 'front', attach: 'bob', at: [9, 16], rows: ['r.....', 'rr....', '.rr...', '..rrNr', '...rrr', '....rr'] },
      { id: 'strap', view: 'back', attach: 'bob', at: [9, 16], rows: ['.....r', '....rr', '...rr.', '..rr..', '.rr...', 'rr....'] },
      { id: 'sleeve', attach: 'arm', mirror: 'pair', at: [6, 18], rows: ['3.', '..', '..', '..', '..', '2.'] },
    ] },
    pal: { b: LEATHER[0], e: LEATHER[0], r: '#3a2818', v: '#58689a', o: dk(LEATHER[0], 0.7), n: '#b8a070', f: 'fur', t: '#b0b0b8', j: '#e86a4a' },
    parts: {
      pad: {
        s1: { at: [2, -1], rows: ['eNe', 'eee'] },
        s2: { at: [2, 0], rows: ['Mee', 'eNe', 'LLL'] },
        s3: { at: [2, 1], rows: ['ffffff', 'Meeffff', 'eNe.f', 'LLL'] },
        s4: { at: [3, 4], rows: ['.N......', 'j.......', '.j......', '.ffffff.', '.Meeffff', '.eNe.f..', '.LLL....', '.....M..', '........', '.....M..'] },
      },
      buckle: { default: { at: [0, 0], rows: ['M'] } },
      wrap: { wrap: { at: [0, -1], rows: ['No', 'oo', 'oo'] } },
      fur: { fur: { at: [0, 1], rows: ['ff'] } },
    },
    tiers: [0, 1, 2, 3, 4].map(t => ({
      pal: { b: LEATHER[t], e: LEATHER[t], o: dk(LEATHER[t], 0.7), t: t >= 2 ? 'gold' : '#b0b0b8' },
      parts: [{ pad: 's1' }, { pad: 's1', wrap: 'wrap' }, { pad: 's2', wrap: 'wrap' }, { pad: 's3', wrap: 'wrap', fur: 'fur' }, { pad: 's4', wrap: 'wrap', fur: 'fur' }][t],
    })),
  };
})();

// =====================================================================================================================
// LIVE HEADS: knighthelm / arcanecowl / wardenhood x 5 tiers.   LIVE BOOTS: knightgreaves / clothsandals / stalkershoes x 5 tiers.
// (stamp(mx, my, cells) builds a stamp from scattered [x, y, char] cells, markers at mx,my: handy for confetti like flowers and sparkles)
// =====================================================================================================================
(function () {
  const { KITS } = PARTS_ART;
  const rep = (n, s) => Array(n).fill(s);
  const stamp = (mx, my, cells) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const c of cells) { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]); }
    const g = Array.from({ length: y1 - y0 + 1 }, () => Array(x1 - x0 + 1).fill('.'));
    for (const c of cells) g[c[1] - y0][c[0] - x0] = c[2];
    return { at: [mx - x0, my - y0], rows: g.map(r => r.join('')) };
  };
  const STEEL = ['#7d8494', '#98a6bd', '#b4c4dc', '#c9d6ec', '#dfe8f8'];

  // ---- KNIGHTHELM: dome b, visor slit d + eyes a, plume p. slots: 1 crest (x11,y3) | 2 wings (x3,y16) | 3 gild (front, x3,y16) | 4 gildB (back)
  KITS.head.knighthelm = {
    tpl: { slots: { 1: 'crest', 2: 'wings', 3: 'gild', 4: 'gildB' }, layers: [
      { id: 'wings', attach: 'bob', mirror: 'half', at: [3, 16], rows: ['2'] },
      { id: 'helm', view: 'front', attach: 'bob', mirror: 'half', at: [3, 3], rows: ['......bbB', '.....bbbB', '....bbbb*', '....b%bbB', '....bZZZB', '....bdUAd', '....bZZZB', '....bbbbB', '....bbXXB', '.....bXbb', '.....ZZZZ', '......bbb', '.........', '3........'] },
      { id: 'helm', view: 'back', attach: 'bob', mirror: 'half', at: [3, 3], rows: ['......bbB', '.....bbbB', '....bbbbB', '....bbbbB', '....bbbbB', '....ZZZZZ', '....bbbbB', '....bbbbB', '....bbbbB', '.....bbbB', '.....bbbb', '......bbb', '.........', '4........'] },
      { id: 'crest', attach: 'bob', at: [11, 3], rows: ['1'] },
    ] },
    pal: { b: STEEL[0], t: 'gold', s: 'white', p: '#c8283c', d: '#0c0a16', a: '#9ae8ff' },
    parts: {
      crest: {
        c0: { at: [0, 1], rows: ['bb'] }, c1: { at: [0, 2], rows: ['pp', 'pp'] },
        c2: { at: [1, 3], rows: ['.ppp.', 'ppppp', 'ppp.p', 'ppp..'] },
        c3: { at: [2, 3], rows: ['.ppppp...', 'ppppppp..', 'ppppp..p.', '.ppp...p.', '.ppp....p'] },
        c4: { at: [6, 3], rows: ['....pppppp....', '...pppppppp...', '...pppppppp...', '.p..pppppp.p..', 'p....pppp...p.', 'p....ppp....p.'] },
      },
      wings: { wings: { at: [0, 11], rows: ['.RR.', 'T.SS', 'T.MM', '.RR.'] } },
      gild: {
        g1: { at: [0, 9], rows: ['.....MMMM', '.........', '.....QQQQ'] },
        g2: { at: [0, 13], rows: ['........T', '........T', '........T', '........T', '.....MMMT', '.........', '.....QQQQ'] },
        g3: { at: [0, 13], rows: ['........T', '........T', '.....MMMT', '........T', '.....MMMT', '.........', '.....QQQM', '........M', '........M', '.....M..M'] },
      },
      gildB: { gb: { at: [0, 7], rows: ['....MMMMM'] } },
    },
    tiers: [0, 1, 2, 3, 4].map(t => ({
      pal: { b: STEEL[t], p: ['#c8283c', '#c8283c', '#d02e48', '#e03050', '#f03a58'][t] },
      parts: { crest: 'c' + t, gild: [null, null, 'g1', 'g2', 'g3'][t], gildB: t >= 2 ? 'gb' : null, wings: t >= 4 ? 'wings' : null },
    })),
  };

  // ---- ARCANECOWL: a drooping hood tip b, gold star emblem, band. slots: 1 star (x12,y5) | 2 band (x3,y16) | 3 trim (x3,y16) | 4 jewel (x16,y2)
  const CW = ['#4a5aa8', '#4a46b8', '#5a3ec0', '#6a2ec8', '#3a1e98'];
  KITS.head.arcanecowl = {
    tpl: { slots: { 1: 'star', 2: 'band', 3: 'trim', 4: 'jewel' }, layers: [
      { id: 'cowl', attach: 'bob', at: [5, 0], rows: ['..........bbb..', '.........bbb...', '......B.bbbb...', '.....B.bbbb....', '......bbbbb....', '.....bbbbbb....', '....%b*b$bb....', '...bbbbbbbbb...', '..bbbbbbbbbb...', '..bbbbbbbbbb...', '..bbbbbbbbbb...'] },
      { id: 'face', view: 'front', attach: 'bob', mirror: 'half', at: [3, 8], rows: ['......XXX', '.....ZZZZ', '.....Z...', '....bZ...', '....bZ...', '....bZ...', '....bbbb.', '.....bbbb', '.........', '3........'] },
      { id: 'face', view: 'back', attach: 'bob', at: [7, 3], rows: ['....Z.....', '....Z.....', '....ZX....', '....ZX....', '....ZX....', '....ZX....', '....ZX....', '....ZX....', 'bbbbZXbbbb', 'bbbbZXbbbb', '.bbbZbbbb.', '.bbbbbbbb.'] },
      { id: 'band', attach: 'bob', mirror: 'half', at: [3, 16], rows: ['2'] },
      { id: 'emblem', view: 'front', attach: 'bob', at: [12, 5], rows: ['1'] },
      { id: 'crown', attach: 'bob', at: [16, 2], rows: ['4'] },
    ] },
    pal: { b: CW[0], t: 'gold', s: 'white', a: '#ff9ae8' },
    parts: {
      star: {
        star0: { at: [0, 0], rows: ['T'] }, star1: { at: [1, 1], rows: ['.M.', 'MTM', '.M.'] },
        star3: { at: [4, 2], rows: ['.M....M.', '..S.M...', '...MSM..', '....M...', '........', '......S.', 'T.......'] },
        star4: { at: [4, 2], rows: ['.M....S.', '..STMT..', '...MUM..', '...TMT..', '........', '......S.', 'T.......', '........', '........', '........', 'T......T'] },
      },
      band: { low: { at: [0, 9], rows: ['....ZZZZZ'] }, gold: { at: [0, 9], rows: ['....MMMMM'] } },
      trim: { gold: { at: [0, 8], rows: ['......QQQ', '....M....', '....M....', '....M....', '....M....', '....M....'] } },
      jewel: { gem: { at: [-2, 2], rows: ['TS', 'M.'] } },
    },
    tiers: [0, 1, 2, 3, 4].map(t => ({
      pal: { b: CW[t] },
      parts: { star: ['star0', 'star1', 'star1', 'star3', 'star4'][t], band: t >= 2 ? 'gold' : 'low', trim: t >= 2 ? 'gold' : null, jewel: t >= 4 ? 'gem' : null },
    })),
  };

  // ---- WARDENHOOD: a leafy hood b, leaves f, flowers j k, antlers w. slots: 1 decor (x3,y15) | 2 face (front, x3,y16)
  const HD = ['#5a7a3e', '#4a8a40', '#3a9a50', '#2f8a64', '#237a6c'], LF = ['#78a840', '#68c048', '#58d060', '#60e088', '#ffd860'];
  const leaf = (x, y) => [[x, y, 'C'], [x + 1, y, 'F'], [x, y + 1, 'x'], [x + 1, y + 1, 'C']];
  const D0 = leaf(10, 1).concat([[11, 3, 'B']]), D1 = D0.concat(leaf(5, 5), leaf(6, 10)), D2 = D1.concat([[8, 3, 'j'], [9, 14, 'k']]);
  const D3 = D2.concat([[7, 1, 'w'], [7, 2, 'w'], [6, 0, 'w'], [5, 0, 'F'], [8, 0, 'C']]);
  const D4 = D3.concat([[8, 3, 'M'], [9, 3, 'M'], [10, 3, 'M'], [11, 3, 'M'], [4, 1, 'T'], [3, 3, 'M'], [3, 4, 'M'], [11, 0, 'S']]);
  KITS.head.wardenhood = {
    tpl: { slots: { 1: 'decor', 2: 'face' }, layers: [
      { id: 'hood', view: 'front', attach: 'bob', mirror: 'half', at: [3, 3], rows: ['......bbb', '.....bbbb', '....bbbbb', '....b%bb*', '....bbXXX', '....bbZZZ', '....bb...', '....bb...', '....bb...', '....bb...', '.....bb..', '......bb.', '1........', '2........'] },
      { id: 'hood', view: 'back', attach: 'bob', mirror: 'half', at: [3, 3], rows: ['......bbb', '.....bbbZ', '....bbbbZ', '....bbbbZ', '....bbbbZ', '....bbbbZ', '....bbbbZ', '....bbbbZ', '....bbbbZ', '.....bbbZ', '.....bbbb', '.........', '1........'] },
    ] },
    pal: { b: HD[0], f: LF[0], w: '#7a5a38', j: '#f06a8a', k: '#f0d860', t: 'gold', s: 'white' },
    parts: {
      decor: { d0: stamp(3, 15, D0), d1: stamp(3, 15, D1), d2: stamp(3, 15, D2), d3: stamp(3, 15, D3), d4: stamp(3, 15, D4) },
      face: { band: stamp(3, 16, [[9, 8, 'C'], [10, 8, 'C'], [11, 8, 'C'], [8, 9, 'F']]) },
    },
    tiers: [0, 1, 2, 3, 4].map(t => ({ pal: { b: HD[t], f: LF[t] }, parts: { decor: 'd' + t, face: t >= 2 ? 'band' : null } })),
  };

  // ---- BOOTS: a left / right leg pair (attach 'leg'); the shape is the silhouette per tier, plus a wing stamp (knightgreaves T5).
  // sockets: one on the left boot (the '*' at the ankle).
  const E9 = '.........';
  KITS.boots.knightgreaves = {
    tpl: { slots: { 1: 'wing' }, layers: [
      { id: 'wing', attach: 'leg', mirror: 'pair', at: [3, 25], rows: ['1'] },
      { id: 'boot', attach: 'leg', mirror: 'pair', at: [3, 23], shapes: {
        low: { rows: rep(5, E9).concat(['......*ZZ', '.....bbbb', '....Zbbbb']) },
        mid: { rows: rep(4, E9).concat(['......bbb', '......*ZZ', '.....bbbb', '....Zbbbb']) },
        cuff2: { rows: [E9, E9, '.....eeee', '.....eeee', '.....MMMM', '......*ZZ', '....Ybbbb', '....Mbbbb'] },
        cuff3: { rows: [E9, '...Meeeee', '...Teeeee', '....MMMMM', '......bbb', '......*ZZ', '....MMMMM', '....Tbbbb'] },
        cuff4: { rows: ['.....M...', '...MeeTTT', '...Teeeee', '....MMMMM', '......bbb', '......*ZZ', '....MMMMM', '....Tbbbb'] },
      } },
    ] },
    pal: { b: STEEL[0], e: STEEL[0], t: 'gold', s: 'white' },
    parts: { wing: { wing: { at: [0, 0], rows: ['..SSS', '.RRRR', 'SSSSS', '.MMMM', '..TT.'] } } },
    tiers: [0, 1, 2, 3, 4].map(t => ({ shape: ['low', 'mid', 'cuff2', 'cuff3', 'cuff4'][t], pal: { b: STEEL[t], e: STEEL[t] }, parts: { wing: t >= 4 ? 'wing' : null } })),
  };
  const CL = ['#b8a078', '#c8a868', '#5a84c0', '#7a5cc8', '#e8e0f8'], TIE = ['#8a7050', '#a07848', '#d8c070', '#e8b830', '#ffe27a'];
  KITS.boots.clothsandals = {
    tpl: { layers: [
      { id: 'boot', attach: 'leg', mirror: 'pair', at: [2, 23], shapes: {
        s0: { rows: rep(5, '..........').concat(['.......*bZ', '......tttt', '......DDDD']) },
        s1: { rows: rep(4, '..........').concat(['.......MMM', '.......*bZ', '......tttt', '......DDDD']) },
        s2: { rows: rep(3, '..........').concat(['.......MMM', '.....MMbbZ', '....MQ.*UU', '......tttt', '......DDDD']) },
        s3: { rows: ['..........', '..........', '...BBB.MMM', '..YYYY.bbZ', '.BBBBMMZbb', '..ZZMQ.*UU', '......tttt', '......DDDD'] },
        s4: { rows: ['..........', '..........', '...BBB.UUU', 'AAYYYY.bbZ', '.BBBBMMZbb', '.UUZMQ.*UU', '......tttt', '......DDDD'] },
      } },
    ] },
    pal: { b: CL[0], t: TIE[0], a: 'gold' },
    tiers: [0, 1, 2, 3, 4].map(t => ({ shape: 's' + t, pal: { b: CL[t], t: TIE[t] }, parts: {} })),
  };
  const LT = ['#8a6840', '#745638', '#5e5a34', '#3e5a3a', '#2c3430'];
  KITS.boots.stalkershoes = {
    tpl: { layers: [
      { id: 'boot', attach: 'leg', mirror: 'pair', at: [3, 23], shapes: {
        s0: { rows: rep(5, E9).concat(['......*bb', '.....bbbb', '.....XXXX']) },
        s1: { rows: rep(4, E9).concat(['......nbn', '......*nb', '.....btbb', '.....XXXX']) },
        s2: { rows: [E9, E9, '.....eeUe', '.....LLLL', '......nbn', '......*nb', '.....Utbb', '.....XXXX'] },
        s3: { rows: ['.....C.x.', '....FFFFF', '...ffffff', '....xLLLL', '......nbn', '......*nb', '.....Utbb', '.....XXXX'] },
        s4: { rows: ['.....C.x.', '....FFFFF', '...ffffff', '..A.xLLLL', '...U..nbn', '...V..*nb', '....UUtbU', '...AUXXXX'] },
      } },
    ] },
    pal: { b: LT[0], e: LT[0], n: '#d8c8a0', t: '#b0b0b8', a: 'gold', f: 'fur' },
    tiers: [0, 1, 2, 3, 4].map(t => ({ shape: 's' + t, pal: { b: LT[t], e: LT[t] }, parts: {} })),
  };
})();

// =====================================================================================================================
// DEMO (preview only, NOT reachable in game): one PLANNED variant written the kit way - the RAPIER (DESIGN 23.3: Tin Needle /
// Moonpoint / Silver Estoc / Starpoint / Needle Eternal). This is everything a new variant costs: one template (the rows below),
// one tier table (palette + part names), and the few stamps no other variant already has. Nothing else (no hero.js, no icons.js).
// It lives in PARTS_ART.DEMO, not KITS, so HERO / the game never see it unless a look sets demo:true (tools/hero-preview.html does).
// =====================================================================================================================
(function () {
  const { DEMO } = PARTS_ART;
  const rep = (n, s) => Array(n).fill(s);
  const B = '................';
  const NEEDLE = '.......b........', EDGED = '.......ba.......';       // a 1 px blade; the glowing tiers add an edge column (a)
  const rows = (blade) => [blade[0]].concat(rep(13, blade[1]), [B, B, '.......J........', '.......K........', '.......J........', '.......@........', '.......K........', '.......J........']);
  // slots: 1 guard (marker = the cross-guard row, left of... the blade column x7) | 2 pommel | 3 binding (grip rings)
  DEMO.weapon.rapier = {
    tpl: { aim: 'up', slots: { 1: 'guard', 2: 'pommel', 3: 'band' }, layers: [
      { id: 'blade', at: [0, 0], shapes: {
        needle: { grow: [1, 1], rows: rows(['.......b........', NEEDLE]) },
        edged: { grow: [1, 1], rows: rows(['.......b........', EDGED]) },
      } },
      { id: 'slots', at: [0, 0], grow: [1, 1], rows: rep(14, B).concat(['.......1........', B, '.......3........', B, B, B, B, B, '.......2........']) },
    ] },
    pal: { b: '#9a9ca6', t: '#6a6a74', g: '#4a3a30', a: '#8ad8ff', s: '#ffffff' },
    parts: {
      guard: {
        bar: { at: [3, 0], rows: ['ttttttt', '...tt..'] },                                                                   // a plain cross
        swept: { at: [3, 1], rows: ['T.....T', 'ttttttt', '.t.tt.t', '..tttt.'] },                                          // swept quillons + a small cup
        cup: { at: [3, 1], rows: ['T.....T', 'ttttttt', '.ttttt.', '.tt*tt.', '..ttt..'] },                                // a bell guard (a gem socket in the cup)
        halo: { at: [4, 3], rows: ['S.......S', 'T.......T', 'M.......M', 'ttttttttt', '.ttttttt.', '.ttt*ttt.', '..ttttt..', '...ttt...'] },   // gold wings + pearls
      },
      band: { ring: { at: [0, 0], rows: ['t'] } },
      pommel: { ball: { at: [1, 0], rows: ['.t.', 't$t', '.t.'] } },
    },
    tiers: [
      { shape: 'needle', grow: 0, pal: { b: '#9a9ca6', t: '#6a6a74' }, parts: { guard: 'bar', pommel: 'ball' } },
      { shape: 'needle', grow: 2, pal: { b: '#c8d0e8', t: '#8a94c8', g: '#3a3050' }, parts: { guard: 'swept', band: 'ring', pommel: 'ball' } },
      { shape: 'needle', grow: 4, pal: { b: '#e4ecff', t: '#d8dcf0', a: '#a8c8ff' }, parts: { guard: 'cup', band: 'ring', pommel: 'ball' } },
      { shape: 'edged', grow: 6, pal: { b: '#f0f4ff', t: 'gold', a: '#8ad8ff', g: '#3a2848' }, parts: { guard: 'cup', band: 'ring', pommel: 'ball' }, light: '#8ad8ff' },
      { shape: 'edged', grow: 8, pal: { b: '#fff6d8', t: 'gold', a: '#ffffff', g: '#3a2848' }, parts: { guard: 'halo', band: 'ring', pommel: 'ball' }, light: '#fff0c0' },
    ],
  };
})();
