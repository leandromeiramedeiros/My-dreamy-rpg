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
  //   w: W h  H m  I l  P d      a: A h  U m  V l      s: S h  R m               f: F h        n: N h
  const LEGEND = { Y: ['b', 'm'], Z: ['b', 'l'], X: ['b', 'd'], O: ['e', 'm'], L: ['e', 'l'], M: ['t', 'm'], Q: ['t', 'l'], D: ['t', 'd'], J: ['g', 'm'], K: ['g', 'l'],
    H: ['w', 'm'], I: ['w', 'l'], P: ['w', 'd'], U: ['a', 'm'], V: ['a', 'l'], R: ['s', 'm'] };
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
  function compile(kind, family, ti, demo) {
    const mk = kind + ':' + family + ':' + ti + (demo ? ':d' : ''); if (memo[mk]) return memo[mk];
    const set = (demo ? DEMO : KITS)[kind] && (demo ? DEMO : KITS)[kind][family]; if (!set) return null;
    const tier = set.tiers[Math.max(0, Math.min(set.tiers.length - 1, ti | 0))], pal = palOf(set, tier);
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
  function weapon(family, ti, demo, pad) {
    pad = pad == null ? 2 : pad;
    const c = compile('weapon', family, ti, demo); if (!c) return null;
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
