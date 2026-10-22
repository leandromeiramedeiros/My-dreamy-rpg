'use strict';
// ---------------------------------------------------------------------------------------------------------------------------
// STATUS: the runtime status layers (docs/design/lighting-status-fx.md "Layers" + "Per-status visuals"; terms: docs/GLOSSARY.md
// section 3). Render-side only: it reads what an entity carries and draws it, it never changes a rule. Three surfaces:
//   bodies  STATUS.body(ctx, e, img, sx, sy, sw, sh, dx, dy, dw, dh, head, chest, lights) right after the renderer drew e's
//           sprite (render.js drawPlayer / drawEnemy / drawEnemyArt): the status tint + cached overlay (char, ice, vine,
//           rent, wet) masked to the drawn frame, the element's ELFX motif emitter pinned to the `chest` / `head` sockets
//           (scene px; forge sockets for the hero, the body's height for the rest), an icon row (8x8 glyphs, stack digits,
//           at most 3 + "+N", laid out above the HP bar by drawIcons(ctx) after the grade, rows never overlap) and ONE
//           merged status light per body (alpha <= 0.35, L.stat: render.js lightPool holds 15 % of its cap for them, bloom 0.4).
//           STATUS.pose(e) -> { x, y } the draw offset of a pose (Buffeted 1 px shove, Lifted hop x1.5).
//   tiles   STATUS.drawTiles(ctx, lights) in the decal pass: burning grass (char + embers + a flicker light), frozen
//           ground (frost decal + a glint on every 4th tile, one glint light per 4 tiles), wet ground (dark film + a bright
//           rim). STATUS.setTile(x, y, kind, dur) / ring(cx, cy, r, kind, dur) / clearTiles() feed it.
//   HUD     STATUS.drawHud(ctx, p, touch) from hud.js drawPlayHud (2x grid): the hero's element statuses as icons with a
//           timer sweep beside the status row, the UIP motif pool (ELFX.makePool) over them, a portrait rim pulse in the
//           status colour, and an element dot on a skill slot whose element would react with the target's status.
// Where statuses come from (STATUS.of(e)): the generic map e.status = { <id>: { t | until, max, stacks, el } } (t: seconds
// left, ticked by its owner; until: a G.t deadline) which the elements lane fills, plus today's live fields: burnT ->
// Burning, frozen + stunT -> Frozen, slowT -> Chilled, the hero's dreadT -> Dread and a long rootT -> Rooted.
// STATUS.apply(e, id, dur, stacks, el) / clear(e, id): every status lands here (game.js applyStatus); the field-backed ones write
// their live field, the rest e.status with an `until` (see apply below).
// Caps per quality tier (render.js QUALITY.tier) high / phone / low: emitting bodies 12 / 6 / 3, emitting tiles 4 / 2 / 0,
// UIP slots 48 / 24 / 12. Over the cap a body keeps its tint and glyph, without particles or light.
// Perf: body() adds its time to PERF.ph['sub.status'], the HUD to 'sub.statusHud' (render.js ?perf); the tile pass is its own phase.
// ---------------------------------------------------------------------------------------------------------------------------
const STATUS = (function () {
  // ---- the per-status table (STATUS_FX[id]) --------------------------------------------------------------------------------
  //   el      the ELFX row (ramp, motif, motion model)      tier  1 | 2 (a tier-2 status wins the tint over tier 1)
  //   tint    tint key colour, ta its alpha                  ov    overlay sheet (char | ice | vine | rent | wet), oa alpha
  //   rate    motif particles a second (0: none)             sock  'chest' | 'head' (the emitter's socket)
  //   light   { r, a <= 0.35, col, fx: flicker | strobe | cool } or null      pose  'still' | 'shove' | 'hop' | null
  const FX = {
    burning:    { el: 'fire', tier: 1, tint: '#ff7a2a', ta: 0.22, ov: 'char', oa: 0.3, rate: 5, sock: 'chest', light: { r: 24, a: 0.3, col: '#ff8a3a', fx: 'flicker' } },
    ablaze:     { el: 'fire', tier: 2, tint: '#ff5a1e', ta: 0.36, ov: 'char', oa: 0.55, rate: 9, sock: 'chest', light: { r: 28, a: 0.35, col: '#ff6a28', fx: 'flicker' } },
    chilled:    { el: 'frost', tier: 1, tint: '#9fe8ff', ta: 0.26, ov: null, oa: 0, rate: 1.5, sock: 'head', light: null },
    frozen:     { el: 'frost', tier: 2, tint: '#bff4ff', ta: 0.45, ov: 'ice', oa: 0.75, rate: 1, sock: 'head', light: { r: 16, a: 0.2, col: '#9fe8ff', fx: 'cool' }, pose: 'still' },
    numb:       { el: 'frost', tier: 2, tint: '#bff4ff', ta: 0.3, ov: 'ice', oa: 0.45, rate: 1, sock: 'head', light: { r: 16, a: 0.2, col: '#9fe8ff', fx: 'cool' } },
    jolted:     { el: 'lightning', tier: 1, tint: '#fff07a', ta: 0.16, ov: null, oa: 0, rate: 4, sock: 'chest', light: null },
    shocked:    { el: 'lightning', tier: 2, tint: '#ffe630', ta: 0.32, ov: null, oa: 0, rate: 10, sock: 'chest', light: { r: 16, a: 0.35, col: '#ffe630', fx: 'strobe' }, strobe: true },
    poisoned:   { el: 'nature', tier: 1, tint: '#8fe07a', ta: 0.24, ov: null, oa: 0, rate: 1.5, sock: 'head', light: null },
    rooted:     { el: 'nature', tier: 2, tint: '#3f8b63', ta: 0.18, ov: 'vine', oa: 0.85, rate: 1, sock: 'chest', light: null, pose: 'still' },
    marked:     { el: 'arcane', tier: 1, tint: '#d6b0ff', ta: 0.14, ov: null, oa: 0, rate: 1.5, sock: 'chest', light: null },
    unravelled: { el: 'arcane', tier: 2, tint: '#9a44ff', ta: 0.3, ov: null, oa: 0, rate: 3, sock: 'chest', light: { r: 16, a: 0.25, col: '#b07cff', fx: 'cool' } },
    smitten:    { el: 'holy', tier: 1, tint: '#fff2c4', ta: 0.22, ov: null, oa: 0, rate: 1, sock: 'head', light: { r: 20, a: 0.2, col: '#fff2c4', fx: 'cool' } },
    dazzled:    { el: 'holy', tier: 2, tint: '#ffffff', ta: 0.32, ov: null, oa: 0, rate: 2, sock: 'head', light: { r: 20, a: 0.25, col: '#fff2c4', fx: 'flicker' } },
    buffeted:   { el: 'wind', tier: 1, tint: '#c8f0e8', ta: 0.14, ov: null, oa: 0, rate: 2, sock: 'chest', light: null, pose: 'shove' },
    lifted:     { el: 'wind', tier: 2, tint: '#7fc8c0', ta: 0.2, ov: null, oa: 0, rate: 0, sock: 'chest', light: null, pose: 'hop', curls: 3 },
    pierced:    { el: 'pierce', tier: 1, tint: '#e7eeff', ta: 0.12, ov: null, oa: 0, rate: 1, sock: 'chest', light: null },
    pinned:     { el: 'pierce', tier: 2, tint: '#aab4cc', ta: 0.24, ov: null, oa: 0, rate: 1, sock: 'chest', light: null, pose: 'still' },
    rent:       { el: 'slash', tier: 2, tint: '#ff4a5a', ta: 0.16, ov: 'rent', oa: 0.85, rate: 0, sock: 'chest', light: null },
    dread:      { el: 'gloom', tier: 1, tint: '#5f4690', ta: 0.24, ov: null, oa: 0, rate: 1.5, sock: 'head', light: null },
    gloomed:    { el: 'gloom', tier: 2, tint: '#2a1c38', ta: 0.38, ov: null, oa: 0, rate: 2.5, sock: 'chest', light: null },
    wet:        { el: 'water', tier: 1, tint: '#3a7ad8', ta: 0.2, ov: 'wet', oa: 0.7, rate: 4, sock: 'head', light: null },
    drift:      { el: 'wind', tier: 1, tint: '#c8f0e8', ta: 0, ov: null, oa: 0, rate: 0, sock: 'chest', light: null, ring: true },   // Drift: the carried element's motif ring (entry.el)
  };
  { let n = 0; for (const id in FX) { FX[id].id = id; FX[id].n = n++; } }   // n: the status index (status.js tint keys)
  // element -> the statuses it reacts with (glossary section 3: Conduct, Detonate, Drift, Flash-freeze, Overload, Purify, Quench,
  // Shatter, Thaw, Wildfire): the HUD's element dot on a skill slot
  const REACT = {
    lightning: ['chilled', 'wet'], frost: ['wet', 'burning', 'ablaze'], arcane: ['shocked'], holy: ['burning', 'ablaze', 'poisoned'],
    fire: ['poisoned', 'frozen'], slash: ['frozen'], pierce: ['frozen'], wind: ['burning', 'chilled', 'jolted', 'poisoned', 'marked', 'smitten', 'pierced', 'dread'],
  };
  const CAP = { high: { bodies: 12, tiles: 4, uip: 48, rate: 1, glow: true }, phone: { bodies: 6, tiles: 2, uip: 24, rate: 0.45, glow: false }, low: { bodies: 3, tiles: 0, uip: 12, rate: 0.3, glow: false } };
  const cap = () => CAP[(typeof QUALITY !== 'undefined' && QUALITY.tier) || 'high'] || CAP.high;
  const particlesOn = () => { try { return !(typeof SETTINGS !== 'undefined' && SETTINGS.particles === 'off'); } catch (e) { return true; } };
  const reduced = () => { try { return typeof SETTINGS !== 'undefined' && SETTINGS.particles === 'reduced'; } catch (e) { return false; } };
  const W = { bodies: 0, tiles: 0, parts: 0, hud: 0, tfMade: 0, tfDeferred: 0 };   // this frame's counters (begin() resets them)
  const TOT = { made: 0, deferred: 0 };   // cumulative since load: stats() tintMadeTotal / tintDeferredTotal (tools/perf.js: the per-frame rate over its sample)

  // ---- reading statuses: of(e) -> a reused array of { id, t, max, stacks, el, fx, legacy } ---------------------------------
  const POOL = [], LIST = [];
  function push(id, t, max, stacks, el, legacy) {
    const f = FX[id]; if (!f || !(t > 0)) return;
    for (let i = 0; i < LIST.length; i++) if (LIST[i].id === id) return;   // the generic map wins over a derived duplicate
    const o = POOL[LIST.length] || (POOL[LIST.length] = {});
    o.id = id; o.t = t; o.max = max > 0 ? max : t; o.stacks = stacks | 0; o.el = el || f.el; o.fx = f; o.legacy = !!legacy;
    LIST.push(o);
  }
  // a field-backed status (of below): its max from e._stm (M) when that is still >= the field, else max(t, d); stacks / el from M
  const mxOf = (M, id, t, d) => (M && M[id] && M[id].max >= t ? M[id].max : Math.max(t, d));
  function pushField(M, id, t, d) { const m = M && M[id]; push(id, t, mxOf(M, id, t, d), m ? m.stacks : 0, m ? m.el : null, true); }
  function of(e) {
    LIST.length = 0; if (!e) return LIST;
    const S = e.status, now = (typeof G !== 'undefined' && G.t) || 0;
    if (S) for (const id in S) { const s = S[id]; if (!s) continue; const t = s.until != null ? s.until - now : s.t; push(id, t, s.max, s.stacks, s.el, false); }
    const M = e._stm;
    if (e.burnT > 0) pushField(M, 'burning', e.burnT, 2);
    if (e.frozen && e.stunT > 0) pushField(M, 'frozen', e.stunT, 1);
    else if (e.slowT > 0) pushField(M, 'chilled', e.slowT, 2);
    if (e.dreadT > 0) push('dread', e.dreadT, mxOf(M, 'dread', e.dreadT, 2), 0, null, true);
    if (e.rootT > 0.3 && ((e.stMax && e.stMax.rootT > 0.3) || (M && M.rooted))) push('rooted', e.rootT, mxOf(M, 'rooted', e.rootT, (e.stMax && e.stMax.rootT) || 0), 0, null, true);
    return LIST;
  }
  // apply(e, id, dur, stacks, el): THE way a status lands (game.js applyStatus routes every source here). A status the game
  // already runs on a live field writes that field (set to dur: the caller keeps its own max / overwrite rule) so the rules,
  // the cleanse and the save see no change, and keeps { max, stacks, el } in e._stm for the timer sweep; of() reads the field
  // back, so the two never drift. Field-backed: Burning burnT and Frozen stunT + frozen (enemies), Chilled slowT (every body),
  // Dread dreadT and Rooted rootT (the hero); a body without that rule keeps it in e.status. Anything else goes to the generic map e.status with an `until`.
  const hero = e => typeof G !== 'undefined' && e === G.player;
  const LEGACY = {   // the live field a status runs on, per body (null: no such rule on that body -> e.status)
    burning: e => (hero(e) ? null : 'burnT'), frozen: e => (hero(e) ? null : 'stunT'), chilled: e => 'slowT',
    dread: e => (hero(e) ? 'dreadT' : null), rooted: e => (hero(e) ? 'rootT' : null),
  };
  function apply(e, id, dur, stacks, el) {
    if (!e || !FX[id]) return false;
    const f = LEGACY[id] && LEGACY[id](e);
    if (f) {
      e[f] = dur; if (id === 'frozen') e.frozen = 1;
      const M = e._stm || (e._stm = {}); M[id] = { max: dur, stacks: stacks || 0, el: el || null };
      return true;
    }
    (e.status || (e.status = {}))[id] = { until: G.t + dur, max: dur, stacks: stacks || 0, el: el || null }; return true;
  }
  function clear(e, id) {
    if (!e) return;
    const f = id && LEGACY[id] && LEGACY[id](e);
    if (f) { e[f] = 0; if (id === 'frozen') e.frozen = 0; if (e._stm) delete e._stm[id]; return; }
    if (!e.status) return; if (id) delete e.status[id]; else e.status = null;
  }
  // the strongest status of a body: tier 2 first, then the order of LIST
  function primary(L) { let b = null; for (let i = 0; i < L.length; i++) { const s = L[i]; if (s.fx.ta <= 0 && !s.fx.ov) continue; if (!b || s.fx.tier > b.fx.tier) b = s; } return b; }
  function pose(e) {
    const P = pose.o || (pose.o = { x: 0, y: 0 }); P.x = 0; P.y = 0;
    const S = e && e.status; if (!S) return P;
    const t = G.t;
    if (S.buffeted && (S.buffeted.until == null || S.buffeted.until > t)) P.x = (Math.floor(t * 12) & 1) ? 1 : 0;
    if (S.lifted && (S.lifted.until == null || S.lifted.until > t)) P.y = -Math.round(Math.abs(Math.sin(t * 5)) * 6 * 1.5);
    return P;
  }

  // ---- overlay sheets: small grey patterns tinted once, laid over the frame with source-atop ---------------------------------
  const OV = {};
  function ovPattern(kind, ctx) {
    if (OV[kind]) return OV[kind];
    const S = 16, c = makeCanvas(S, S), x = c.x, px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    if (kind === 'char') {   // charred flecks + ember pixels
      for (let i = 0; i < 26; i++) { const X = (i * 7 + (i * i) % 5) % S, Y = (i * 11 + 3) % S; px(X, Y, '#1a0c08'); if (i % 4 === 0) px((X + 1) % S, Y, '#ff9a3a'); }
    } else if (kind === 'ice') {   // facets: diagonal light lines + a white glint
      for (let k = 0; k < S; k++) { px(k, (k + 4) % S, '#e8fbff'); px(k, (S - k + 9) % S, '#9fe8ff'); }
      px(3, 3, '#ffffff'); px(11, 10, '#ffffff'); px(4, 3, '#ffffff'); px(3, 4, '#ffffff');
    } else if (kind === 'vine') {   // a vine wrapping upward: dark stem, leaf pixels
      for (let y = 0; y < S; y++) { const X = (Math.round(4 * Math.sin(y * 0.8)) + 8 + S) % S; px(X, y, '#1f4e4c'); if (y % 4 === 0) { px((X + 1) % S, y, '#94cf7f'); px((X + 2) % S, y, '#3f8b63'); } }
    } else if (kind === 'rent') {   // two slash scars
      for (let k = 0; k < 9; k++) { px(3 + k, 12 - k, '#ff3a4a'); px(4 + k, 12 - k, '#ffd0d0'); px(1 + k, 14 - k, '#a01828'); }
    } else if (kind === 'wet') {   // highlight streaks
      for (let y = 0; y < S; y += 4) { px((y * 3) % S, y, '#e8fbff'); px((y * 3 + 1) % S, y, '#9fd0ff'); px((y * 5 + 8) % S, y + 2, '#bfe0ff'); }
    }
    return (OV[kind] = ctx.createPattern(c.c, 'repeat'));
  }

  // ---- 8x8 glyphs (the element motif in its ramp on a dark chip), cached per status ----------------------------------------
  const GLYPH = {}, DIGIT = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
  function glyph(id) {
    if (GLYPH[id]) return GLYPH[id];
    const f = FX[id], row = typeof ELFX !== 'undefined' && ELFX.rows[f.el], c = makeCanvas(8, 8), x = c.x;
    x.globalAlpha = 0.75; x.fillStyle = '#0c0714'; x.fillRect(1, 0, 6, 8); x.fillRect(0, 1, 8, 6); x.globalAlpha = 1;   // a soft dark chip
    if (f.tier === 2) { x.fillStyle = f.tint; x.fillRect(1, 0, 6, 1); x.fillRect(1, 7, 6, 1); }   // tier 2: a coloured top / bottom bar
    if (row) {
      const m = row.motif, fr = m.frames[0], ox = Math.floor((8 - m.w) / 2), oy = Math.floor((8 - m.h) / 2), L = { d: 0, 2: 1, 1: 2, 3: 3 };
      for (let y = 0; y < m.h && y < 8; y++) for (let X = 0; X < m.w && X < 8; X++) { const ch = fr[y][X]; if (ch === '.') continue; x.fillStyle = row.ramp[L[ch]]; x.fillRect(ox + X, oy + y, 1, 1); }
    } else { x.fillStyle = '#bfe0ff'; x.fillRect(3, 2, 2, 4); x.fillRect(2, 4, 4, 2); }   // wet: a drop
    return (GLYPH[id] = c.c);
  }
  const STRIPS = new Map();
  function strip(L, n, more) {   // a body's icon row: n glyphs 9 px apart, stack digits, a "+N" chip for the rest; cached (cap 64)
    let key = ''; for (let i = 0; i < n; i++) key += L[i].id + (L[i].stacks > 1 ? Math.min(9, L[i].stacks) : '') + ',';
    if (more) key += '+' + more;
    let c = STRIPS.get(key); if (c) return c;
    if (STRIPS.size >= 64) STRIPS.delete(STRIPS.keys().next().value);
    c = makeCanvas((n + (more ? 1 : 0)) * 9 + 2, 12);
    for (let i = 0; i < n; i++) { c.x.drawImage(glyph(L[i].id), i * 9, 0); if (L[i].stacks > 1) digit(c.x, L[i].stacks, i * 9 + 6, 4); }
    if (more) {   // "+N": a dark chip, a 3x3 plus and the count
      const x = n * 9; c.x.globalAlpha = 0.75; c.x.fillStyle = '#0c0714'; c.x.fillRect(x, 0, 9, 8); c.x.globalAlpha = 1; c.x.fillStyle = '#ffffff';
      c.x.fillRect(x + 1, 3, 3, 1); c.x.fillRect(x + 2, 2, 1, 3); digit(c.x, Math.min(9, more), x + 5, 1);
    }
    STRIPS.set(key, c.c); return c.c;
  }
  // ---- the icon rows: queued by body(), laid out once a frame by drawIcons(ctx) (render.js, after the grade, unlit) -------------
  // A row sits centred above the body's HP bar (hud.js drawNameplates: bar top = feet - hgt x ZS - 7; an elite's name above it),
  // the hero's over the head. At most ICON_MAX icons, tier 2 first, the rest as "+N". Rows never overlap: by body priority (boss,
  // the hero, elite, then the nearest the hero) a row takes its spot or moves up one or two rows; with no room it is hidden.
  const ICON_MAX = 3, ICONS = [], ICON_POOL = [], SEL = [], PLACED = [], PL_POOL = [];
  const bySt = (a, b) => b.fx.tier - a.fx.tier || b.stacks - a.stacks;
  function queueIcons(e, L, hd) {
    SEL.length = 0; for (let i = 0; i < L.length; i++) SEL.push(L[i]); SEL.sort(bySt);
    const n = Math.min(SEL.length, ICON_MAX), p = G.player, me = hero(e);
    const K = e._sic || (e._sic = { ids: [], st: [], len: -1, c: null });   // the body's last strip: rebuilt only when its icons change
    let same = K.len === SEL.length; for (let i = 0; same && i < n; i++) same = K.ids[i] === SEL[i].id && K.st[i] === Math.min(9, SEL[i].stacks);
    if (!same) { K.len = SEL.length; for (let i = 0; i < n; i++) { K.ids[i] = SEL[i].id; K.st[i] = Math.min(9, SEL[i].stacks); } K.c = strip(SEL, n, SEL.length - n); }
    const c = K.c;
    const elite = !me && !e.boss && typeof enemyClassOf === 'function' && enemyClassOf(e) === 'elite';
    let ax = hd[0], ay = hd[1] - 13;
    if (!me && e.hgt) { ax = isoX(e.x, e.y) - camX + RW / 2; ay = isoY(e.x, e.y, e.z || 0) - camY + RH / 2 - e.hgt * ZS - (e.type === 'wisp' ? 14 : 0) - 7 - 12 - (elite ? 9 : 0); }
    const o = ICON_POOL[ICONS.length] || (ICON_POOL[ICONS.length] = {});
    o.c = c; o.x = Math.round(ax - c.width / 2 + 1); o.y = Math.round(ay); o.w = c.width - 2; o.h = 11;   // 8 px glyphs + a stack digit hanging 3 px
    o.pri = (e.boss ? 4000 : 0) + (me ? 3000 : 0) + (elite ? 2000 : 0) - (p ? Math.hypot(e.x - p.x, e.y - p.y) : 0);
    ICONS.push(o);
  }
  function drawIcons(ctx) {
    if (!ICONS.length) return;
    const t0 = PERF && PERF.on ? performance.now() : 0;
    ICONS.sort((a, b) => b.pri - a.pri); PLACED.length = 0; W.iconsHidden = 0; W.iconsMoved = 0;
    for (const o of ICONS) {
      let y = null;
      for (let k = 0; k < 3 && y == null; k++) {
        const yy = o.y - k * 12; let hit = false;
        for (let j = 0; j < PLACED.length && !hit; j++) { const q = PLACED[j]; hit = o.x < q.x + q.w + 1 && q.x < o.x + o.w + 1 && yy < q.y + q.h && q.y < yy + o.h; }
        if (!hit) { y = yy; if (k) W.iconsMoved++; }
      }
      if (y == null) { W.iconsHidden++; continue; }
      const r = PL_POOL[PLACED.length] || (PL_POOL[PLACED.length] = {}); r.x = o.x; r.y = y; r.w = o.w; r.h = o.h; PLACED.push(r); ctx.drawImage(o.c, o.x, y);
    }
    W.icons = PLACED.length; ICONS.length = 0;
    if (PERF && PERF.on) PERF.ph['sub.status'] = (PERF.ph['sub.status'] || 0) + performance.now() - t0;
  }
  function digit(ctx, n, x, y) {
    const d = DIGIT[Math.min(9, n | 0)]; ctx.fillStyle = '#0c0714'; ctx.fillRect(x - 1, y - 1, 5, 7); ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 15; i++) if (d[i] === '1') ctx.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1);
  }

  // ---- motif emitters: stateless ELFX particles, born every 1 / rate s, pinned to a socket (positions relative to it) --------
  const DROP = { el: 'water' };
  function emitter(ctx, e, s, ax, ay, w, t) {
    const f = s.fx; if (!(f.rate > 0)) return 0;
    const el = s.id === 'drift' ? s.el : f.el;
    if (el === 'water') {   // Wet droplets: 1 px drops falling 6 px from the head, 4 a second
      let n = 0; const k1 = Math.floor(t * f.rate);
      for (let k = k1 - 3; k <= k1; k++) { const u = t * f.rate - k; if (u < 0 || u >= 1) continue; const h = ELFX.hash(0.31, k); ctx.fillStyle = h < 0.5 ? '#9fd0ff' : '#e8fbff'; ctx.fillRect(Math.round(ax + (h - 0.5) * w * 0.7), Math.round(ay + 2 + u * 8), 1, u < 0.8 ? 2 : 1); n++; }
      return n;
    }
    const R = typeof ELFX !== 'undefined' && ELFX.rows[el]; if (!R) return 0;
    const rate = f.rate * ((W.cap ? W.red : reduced()) ? 0.5 : 1) * (W.cap || cap()).rate, life = R.life[1], kMin = Math.ceil((t - life) * rate), kMax = Math.floor(t * rate);
    const C = e._stp || (e._stp = {}), ring = C[s.id] || (C[s.id] = { k: new Array(12).fill(-1e9), p: new Array(12) }), seed = ((e.uid || 0) * 0.137 + f.tier * 0.011 + 0.5) % 1;
    let n = 0;
    for (let k = Math.max(kMin, kMax - 11); k <= kMax; k++) {
      const j = ((k % 12) + 12) % 12;
      if (ring.k[j] !== k) {
        const h = ELFX.hash(seed, k), jx = (h - 0.5) * w * 0.6, jy = (ELFX.hash(seed, k + 99) - 0.5) * 4;
        ring.p[j] = ELFX.spawn(el, jx, jy, R.model === 'fall' ? 8 : 0, k / rate, k, { seed, ox: 0, oy: 0 }); ring.k[j] = k;
      }
      n += ELFX.draw(ctx, ring.p[j], t, 1, ax, ay);
    }
    return n;
  }

  // ---- bodies --------------------------------------------------------------------------------------------------------------
  // the tinted frame: the source rect with the status's tile laid over it source-atop (tint key at ta, overlay at oa), binary
  // alpha kept, blitted at the pulse alpha. Cached per (source canvas, rect, status) in atlas pages: 256 px canvases filled
  // shelf by shelf, the oldest page cleared for reuse when the tier's page count (TF_PX) is reached; a rect over 256 px (a
  // boss frame) gets its own canvas (BIG, first in first out). Callers pass the frame's opaque box, not the whole cell
  // (render.js forgeEnemyBoxes: a forge cell is 20-32 % body), so an entry costs a quarter of a cell.
  // The working set is every (frame, direction, status) the status bodies visit: 6 forge bodies in a fight (22 frames x 8
  // directions each) visit ~350 keys in their first 20 s and ~450 in a minute, out of ~1000; measured, no key is made twice
  // and the sources (render.js cells) are stable: the cache warms over the fight, every make a first visit, not churn.
  // A make costs a drawImage + a fill into the open page (no new canvas: a canvas + its 2d context was the expensive part of
  // a make, ~0.15 ms at CPU x4); at most TF_MAKE[tier] a frame, a body over budget shows its last tinted frame of that status.
  // Measured alternatives (6 forge bodies, CPU x4, status ms): one small canvas per entry 0.40 vs pages 0.36 (sub.status);
  // one slot per body re-tinted in place on every anim frame change 0.82 vs 0.67 (the re-raster lands in the blit); earlier
  // lanes: a tinted copy of the whole sheet per (sheet, status) blits 3x slower and costs 5 MB each; one scratch canvas shared
  // by every body re-uploads it per body (+310 us unthrottled). 256 px pages are big enough to be GPU canvases (Chrome
  // accelerates from 128 x 129), so a make draws on the GPU rather than re-uploading the page.
  const PG = 256, PAGES = [], BIG = new Map(), TF_PX = { high: 4e6, phone: 2e6, low: 5e5 }, TF_MAKE = { high: 2, phone: 2, low: 1 }, SRC = new WeakMap(), TILE_PAT = {};
  let PG_I = -1, TF_N = 0;   // the open page, the live entries
  const PAT_M = typeof DOMMatrix !== 'undefined' ? new DOMMatrix() : null;
  function tileFill(f, x, ox, oy) {   // the status's tile: a solid tint (no overlay), or tint + overlay as a 16 px pattern anchored at (ox, oy)
    if (!f.ov) { x.globalAlpha = f.ta; return f.tint; }
    if (!TILE_PAT[f.id]) {
      const c = makeCanvas(16, 16), y = c.x;
      if (f.ta > 0) { y.globalAlpha = f.ta; y.fillStyle = f.tint; y.fillRect(0, 0, 16, 16); }
      y.globalAlpha = f.oa; y.fillStyle = ovPattern(f.ov, y); y.fillRect(0, 0, 16, 16);
      TILE_PAT[f.id] = y.createPattern(c.c, 'repeat');
    }
    const P = TILE_PAT[f.id];
    if (PAT_M && P.setTransform) { PAT_M.e = ox; PAT_M.f = oy; P.setTransform(PAT_M); }
    return P;
  }
  function slot(w, h, tier) {   // -> the page with room for a w x h entry at (P.ex, P.ey); a full atlas clears its oldest page
    let P = PAGES[PG_I];
    if (P && P.cx + w > PG) { P.sy += P.sh + 1; P.cx = 0; P.sh = 0; }
    if (!P || P.sy + h > PG) {
      const max = Math.max(2, Math.floor((TF_PX[tier] || TF_PX.high) / (PG * PG)));
      PG_I = PAGES.length < max ? PAGES.length : (PG_I + 1) % max; P = PAGES[PG_I];
      if (!P) { const C = makeCanvas(PG, PG); P = PAGES[PG_I] = { c: C.c, x: C.x, ents: [] }; }
      else {   // reuse the oldest page: its entries leave the cache
        for (const E of P.ents) { E.dead = true; if (E.M.get(E.k) === E) E.M.delete(E.k); }
        TF_N -= P.ents.length; P.ents.length = 0; P.x.globalCompositeOperation = 'source-over'; P.x.globalAlpha = 1; P.x.clearRect(0, 0, PG, PG);
      }
      P.cx = 0; P.sy = 0; P.sh = 0;
    }
    P.ex = P.cx; P.ey = P.sy; P.cx += w + 1; if (h > P.sh) P.sh = h;
    return P;
  }
  // -> the tinted entry { c, x, y, w, h } (its canvas and corner), or null when this frame's budget of new ones is spent
  function tinted(img, sx, sy, sw, sh, f) {
    let M = SRC.get(img); if (!M) SRC.set(img, M = new Map());
    const k = sx < 8192 && sy < 8192 && sw < 512 && sh < 512 ? (((sx * 8192 + sy) * 512 + sw) * 512 + sh) * 32 + f.n : sx + '|' + sy + '|' + sw + '|' + sh + '|' + f.id;   // < 2^49
    let E = M.get(k);
    if (E) return E;
    const tier = (typeof QUALITY !== 'undefined' && QUALITY.tier) || 'high';
    if (W.tfMade >= (TF_MAKE[tier] || 1)) { W.tfDeferred++; TOT.deferred++; return null; }
    let x, X = 0, Y = 0;
    if (sw > PG || sh > PG) {
      const T = makeCanvas(sw, sh); x = T.x; E = { c: T.c, x: 0, y: 0, w: sw, h: sh, M, k };
      if (BIG.size >= 16) { const E0 = BIG.keys().next().value; BIG.delete(E0); E0.dead = true; if (E0.M.get(E0.k) === E0) E0.M.delete(E0.k); TF_N--; }
      BIG.set(E, 1);
    } else {
      const P = slot(sw, sh, tier); x = P.x; X = P.ex; Y = P.ey; E = { c: P.c, x: X, y: Y, w: sw, h: sh, M, k }; P.ents.push(E);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    }
    x.drawImage(img, sx, sy, sw, sh, X, Y, sw, sh); x.globalCompositeOperation = 'source-atop'; x.fillStyle = tileFill(f, x, X - sx, Y - sy); x.fillRect(X, Y, sw, sh);   // the overlay anchored at the source's origin: steady across frames
    M.set(k, E); TF_N++; W.tfMade++; TOT.made++;
    return E;
  }
  function begin() { W.cap = cap(); W.pOn = particlesOn(); W.red = reduced(); W.bodies = 0;   // the tier caps and particle settings, read once a frame
    W.tiles = 0; W.parts = 0; W.icons = 0; W.tfMade = 0; W.tfDeferred = 0; ICONS.length = 0; PLACED.length = 0; }
  // head / chest: [x, y] scene px or null (then taken from the drawn box: head at the top + 3, chest at 60 % of the height)
  const HD = [0, 0], CH = [0, 0];
  function body(ctx, e, img, sx, sy, sw, sh, dx, dy, dw, dh, head, chest, lights) {
    if (!e) return;
    const L = of(e); if (!L.length) return;
    if (PERF && PERF.flush) ctx.getImageData(0, 0, 1, 1);   // ?perf=flush: the ops queued before this body are not its cost
    const t0 = PERF && PERF.on ? performance.now() : 0, t = G.t, sa = ctx.globalAlpha;
    const hd = head || (HD[0] = dx + dw / 2, HD[1] = dy + Math.min(6, dh * 0.2), HD), ch = chest || (CH[0] = dx + dw / 2, CH[1] = dy + dh * 0.55, CH);
    // tint + overlay, masked to the drawn frame
    const P = primary(L);
    if (img && P && dw > 0 && dh > 0 && sw > 0 && sh > 0) {
      const f = P.fx, pulse = f.strobe ? ((Math.floor(t * 15) & 1) ? 1 : 0.35) : 0.8 + 0.2 * Math.sin(t * 6);
      let T = tinted(img, sx, sy, sw, sh, f);
      if (T) { e._stT = T; e._stTid = f.id; } else if (e._stTid === f.id && e._stT && !e._stT.dead && e._stT.w === sw && e._stT.h === sh) T = e._stT;   // over budget: the last one
      if (T) { ctx.globalAlpha = sa * pulse; ctx.drawImage(T.c, T.x, T.y, sw, sh, dx, dy, dw, dh); ctx.globalAlpha = sa; }   // over the drawn frame: same mask
    }
    // emitters (capped per tier), the motif ring of Drift, Lifted's curls
    const C = W.cap || cap(), emit = W.bodies < C.bodies && (W.cap ? W.pOn : particlesOn());
    if (emit) {
      W.bodies++;
      for (let i = 0; i < L.length; i++) {
        const s = L[i], a = s.fx.sock === 'head' ? hd : ch;
        W.parts += emitter(ctx, e, s, a[0], a[1], Math.max(8, dw * 0.6), t);
        if (s.fx.ring || s.fx.curls) {   // a ring of motif glints (Drift: the carried element) / Lifted's 3 curls
          const R = ELFX.rows[s.fx.ring ? s.el : 'wind'], sh2 = R && ELFX.sheet(R.id), n = s.fx.curls || 6;
          if (sh2) for (let k = 0; k < n; k++) { const ang = t * 2.4 + k * Math.PI * 2 / n; ctx.drawImage(sh2.c, (k % sh2.n) * sh2.w, 0, sh2.w, sh2.h, Math.round(ch[0] + Math.cos(ang) * 10 - sh2.w / 2), Math.round(ch[1] + 6 + Math.sin(ang) * 4 - sh2.h / 2), sh2.w, sh2.h); }
        }
      }
      // one merged status light: the strongest status light of the body (alpha <= 0.35)
      let bl = null; for (let i = 0; i < L.length; i++) { const q = L[i].fx.light; if (q && (!bl || q.a > bl.a)) bl = q; }
      if (bl && lights) {
        const a = bl.fx === 'strobe' ? ((Math.floor(t * 15) & 1) ? bl.a : bl.a * 0.3) : bl.fx === 'flicker' ? bl.a * (0.8 + 0.2 * Math.sin(t * 23 + (e.uid || 1))) : bl.a;
        lights.push({ sx: ch[0] + camX - RW / 2, sy: ch[1] + camY - RH / 2, r: bl.r, col: bl.col, a: Math.min(0.35, a), stat: 1, bloom: 0.4, own: e });
      }
    }
    // the icon row (8x8 glyphs, at most ICON_MAX, then +N), queued: drawIcons lays every body's row out above its HP bar
    ctx.globalAlpha = sa;
    queueIcons(e, L, hd);
    if (PERF && PERF.flush) ctx.getImageData(0, 0, 1, 1);   // ?perf=flush: this body's own raster counts here
    if (PERF && PERF.on) PERF.ph['sub.status'] = (PERF.ph['sub.status'] || 0) + performance.now() - t0;
  }

  // ---- world tiles ---------------------------------------------------------------------------------------------------------
  const TILES = new Map(), DECAL = {};
  const tkey = (x, y) => x + ',' + y;
  function setTile(x, y, kind, dur) { x = Math.floor(x); y = Math.floor(y); VER++; if (LAYER.map !== G.map) { TILES.clear(); LAYER.map = G.map; } if (!kind) { TILES.delete(tkey(x, y)); return; } const h = ELFX.hash(0.77, x * 73856093 ^ y * 19349663); TILES.set(tkey(x, y), { x, y, kind, until: G.t + (dur || 1e9), born: G.t, h, uid: 1 + Math.floor(h * 997) }); }
  function ring(cx, cy, r, kind, dur) { let n = 0; for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d >= r - 0.75 && d <= r + 0.75) { setTile(x, y, kind, dur); n++; } } return n; }
  function clearTiles() { TILES.clear(); VER++; }
  function decal(kind) {   // a 32 x 17 iso diamond per kind (hashed noise, binary alpha steps: pixel-art, no smooth ramps)
    if (DECAL[kind]) return DECAL[kind];
    const c = makeCanvas(32, 17), x = c.x, img = x.createImageData(32, 17), d = img.data;
    const set = (X, Y, rgb, a) => { const i = (Y * 32 + X) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a; };
    const C = { burning: [[22, 10, 8], [70, 26, 12], [255, 150, 60], [255, 220, 120]], frozen: [[120, 200, 240], [190, 236, 255], [255, 255, 255]], wet: [[16, 34, 80], [50, 96, 190], [210, 235, 255]] }[kind];
    const nz = (X, Y) => ELFX.hash(0.42, X * 131 + Y * 977), blob = (X, Y) => (nz(X >> 1, Y >> 1) + nz(X >> 2, Y >> 2) + nz(X, Y) * 0.5) / 2.5;
    for (let Y = 0; Y < 17; Y++) for (let X = 0; X < 32; X++) {
      const u = Math.abs(X + 0.5 - 16) / 16 + Math.abs(Y + 0.5 - 8.5) / 8.5; if (u > 1) continue;
      const b = blob(X, Y), n = nz(X, Y), edge = u > 0.8;
      if (kind === 'burning') {   // scorched patches (ragged towards the edge), embers in the char
        if (b < 0.25 + u * 0.4) continue;
        if (n > 0.93) set(X, Y, C[n > 0.975 ? 3 : 2], 255); else set(X, Y, b > 0.62 ? C[0] : C[1], 205);
      } else if (kind === 'frozen') {   // frost film, crystal lines, a bright rim
        if (edge) { if (n > 0.35) set(X, Y, C[2], 190); continue; }
        if ((X + 2 * Y) % 9 === 0 || (X - 2 * Y + 40) % 13 === 0) set(X, Y, C[2], 200); else set(X, Y, b > 0.5 ? C[0] : C[1], 105);
      } else {   // wet: a dark film, the bright rim on the upper edges
        if (edge && Y < 9) set(X, Y, C[2], 170); else if (!edge && b > 0.3) set(X, Y, b > 0.6 ? C[0] : C[1], 90);
      }
    }
    x.putImageData(img, 0, 0);
    return (DECAL[kind] = c.c);
  }
  // the decals of every live tile are baked into one cached layer (world-screen space, rebuilt when the tile set changes), so a
  // frame costs one blit + one additive flicker blit of the burning tiles, whatever the tile count. While a tile fades in or
  // out the tiles draw one by one instead.
  const LAYER = { ver: -1, c: null, glow: null, x0: 0, y0: 0, ok: false }, SPAN = { ver: -1, u: 0, b: 0 }; let VER = 0;   // SPAN: the tiles' first end / last birth
  function buildLayer(m) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const T of TILES.values()) { const z = typeof tileH === 'function' ? tileH(m, T.x + 0.5, T.y + 0.5) : 0; T.sx = isoX(T.x, T.y) - 16; T.sy = isoY(T.x, T.y, z); x0 = Math.min(x0, T.sx); y0 = Math.min(y0, T.sy); x1 = Math.max(x1, T.sx + 32); y1 = Math.max(y1, T.sy + 17); }
    LAYER.ver = VER; LAYER.ok = TILES.size > 0 && x1 - x0 <= 1024 && y1 - y0 <= 1024; if (!LAYER.ok) return;
    const w = x1 - x0, h = y1 - y0, L = makeCanvas(w, h), Gl = makeCanvas(w, h); let glow = false;
    for (const T of TILES.values()) { L.x.drawImage(decal(T.kind), T.sx - x0, T.sy - y0); if (T.kind === 'burning') { Gl.x.drawImage(decal('burning'), T.sx - x0, T.sy - y0); glow = true; } }
    LAYER.c = L.c; LAYER.glow = glow ? Gl.c : null; LAYER.x0 = x0; LAYER.y0 = y0;
    LAYER.burn = [...TILES.values()].filter(T => T.kind === 'burning'); LAYER.glint = [...TILES.values()].filter(T => T.kind === 'frozen' && T.h < 0.25);   // the tiles that emit / glint
    LAYER.nk = null;
  }
  function drawTiles(ctx, lights) {
    if (!TILES.size) return;
    const m = G.map, t = G.t, C = cap(), p = G.player, ox = RW / 2 - camX, oy = RH / 2 - camY, emitOn = particlesOn();
    if (LAYER.map !== m) { if (LAYER.map) { TILES.clear(); VER++; } LAYER.map = m; if (!TILES.size) return; }   // a map change clears the ground
    const near = drawTiles.near || (drawTiles.near = []); near.length = 0;
    let glints = 0, fMin = 1, fMax = 0;
    if (SPAN.ver !== VER) { SPAN.ver = VER; SPAN.u = Infinity; SPAN.b = -Infinity; for (const T of TILES.values()) { if (T.until < SPAN.u) SPAN.u = T.until; if (T.born > SPAN.b) SPAN.b = T.born; } }
    if (t < SPAN.u - 0.5 && t > SPAN.b + 0.6) fMax = 1;   // settled: none expires or fades this frame (every fade below is 1), skip the scan
    else for (const [k, T] of TILES) {
      if (T.until < t) { TILES.delete(k); VER++; continue; }
      const fd = clamp(Math.min((T.until - t) * 2, (t - T.born) * 1.33 + 0.25), 0, 1); if (fd < fMin) fMin = fd; if (fd > fMax) fMax = fd;
    }
    if (!TILES.size) return;
    const uni = fMax - fMin < 0.05;   // one fade for all (a ring cast at once, or settled): the cached layer at that alpha
    if (uni && LAYER.ver !== VER) buildLayer(m);   // never rebuilt while tiles fade in one by one (a spreading fire)
    const layered = uni && LAYER.ok && LAYER.ver === VER;
    if (layered) {
      const sa = ctx.globalAlpha; ctx.globalAlpha = sa * fMax;
      ctx.drawImage(LAYER.c, Math.round(LAYER.x0 + ox), Math.round(LAYER.y0 + oy)); ctx.globalAlpha = sa;
      if (LAYER.glow && C.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fMax * (0.28 + 0.12 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23)); ctx.drawImage(LAYER.glow, Math.round(LAYER.x0 + ox), Math.round(LAYER.y0 + oy)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    }
    for (const T of (layered ? LAYER.glint : TILES.values())) {   // layered: only the tiles that glint (the burning ones below)
      const z = layered ? 0 : (typeof tileH === 'function' ? tileH(m, T.x + 0.5, T.y + 0.5) : 0), vx = (layered ? T.sx + 16 : isoX(T.x, T.y)) + ox, vy = (layered ? T.sy : isoY(T.x, T.y, z)) + oy;
      if (vx < -20 || vx > RW + 20 || vy < -20 || vy > RH + 20) continue;
      if (!layered) {
        const fade = clamp(Math.min((T.until - t) * 2, (t - T.born) * 1.33 + 0.25), 0, 1);
        ctx.globalAlpha = fade; ctx.drawImage(decal(T.kind), Math.round(vx - 16), Math.round(vy));
        if (T.kind === 'burning') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * (0.25 + 0.2 * Math.sin(t * 9 + T.h * 20)); ctx.drawImage(decal('burning'), Math.round(vx - 16), Math.round(vy)); ctx.globalCompositeOperation = 'source-over'; }
        ctx.globalAlpha = 1;
      }
      if (T.kind === 'burning') { near.push(T); T._vx = vx; T._vy = vy + 8; T._d = p ? Math.abs(T.x + 0.5 - p.x) + Math.abs(T.y + 0.5 - p.y) : 0; }
      else if (T.kind === 'frozen' && T.h < 0.25) {   // a glint on about one tile in 4, one glint light per 4 tiles
        const on = Math.sin(t * 3 + T.h * 40) > 0.6;
        if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(vx - 1), Math.round(vy + 6), 3, 1); ctx.fillRect(Math.round(vx), Math.round(vy + 5), 1, 3); }
        if (on && lights && C.tiles > 0 && glints++ < Math.max(1, C.tiles)) lights.push({ sx: vx - ox, sy: vy + 7 - oy, r: 12, col: '#bff4ff', a: 0.2, stat: 1, bloom: 0.4 });
      }
    }
    if (layered && C.tiles && LAYER.burn.length) {   // the burning tiles by distance to the hero's tile, sorted once per (tile set, hero tile)
      const nk = VER * 1e6 + (p ? Math.floor(p.x) * 1000 + Math.floor(p.y) : 0);
      if (LAYER.nk !== nk) { LAYER.nk = nk; const hx = p ? Math.floor(p.x) + 0.5 : 0, hy = p ? Math.floor(p.y) + 0.5 : 0; for (const T of LAYER.burn) T._d = Math.abs(T.x + 0.5 - hx) + Math.abs(T.y + 0.5 - hy); LAYER.burn.sort((a, b) => a._d - b._d); }
      for (const T of LAYER.burn) {
        const vx = T.sx + 16 + ox, vy = T.sy + oy; if (vx < -20 || vx > RW + 20 || vy < -20 || vy > RH + 20) continue;
        T._vx = vx; T._vy = vy + 8; near.push(T); if (near.length >= C.tiles) break;
      }
    }
    if (!near.length || !C.tiles) return;
    const n = Math.min(near.length, C.tiles);
    if (!layered) for (let i = 0; i < n; i++) { let b = i; for (let j = i + 1; j < near.length; j++) if (near[j]._d < near[b]._d) b = j; if (b !== i) { const q = near[i]; near[i] = near[b]; near[b] = q; } }   // the n nearest (n <= 4)
    for (let i = 0; i < n; i++) {
      const T = near[i];
      if (emitOn) W.parts += emitter(ctx, T, TILE_S, T._vx, T._vy, 22, t);
      if (lights) lights.push({ sx: T._vx - ox, sy: T._vy - 4 - oy, r: 24, col: '#ff8a3a', a: 0.3 * (0.8 + 0.2 * Math.sin(t * 21 + T.h * 9)), stat: 1, bloom: 0.4 });
      W.tiles++;
    }
  }
  const TILE_S = { id: 'tile', fx: Object.assign({}, FX.burning, { rate: 3 }), el: 'fire' };   // a grass fire emits a little less than a body

  // ---- HUD (2x grid) -------------------------------------------------------------------------------------------------------
  let UIP = null, UIPcap = 0;
  const lastEmit = {};
  function target(p) {   // the enemy the element dot reads: nearest the aim point within 3 tiles, else nearest the hero within 6
    let best = null, bd = 9;
    for (const e of G.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - G.mouse.wx, e.y - G.mouse.wy); if (d < bd) { bd = d; best = e; } }
    if (best) return best; bd = 36;
    for (const e of G.enemies) { if (e.dead) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  }
  const DOTS = { t: -1, list: [] };
  function drawHud(ctx, p, touch) {
    if (!p) return;
    const t0 = PERF && PERF.on ? performance.now() : 0, t = G.t, C = cap();
    if (!UIP || UIPcap !== C.uip) { UIP = ELFX.makePool(C.uip); UIPcap = C.uip; }
    const L = of(p), skip = L.length && typeof heroStatuses === 'function' ? heroStatuses(p).length : 0;   // the status row's width, only with icons to place
    const x0 = touch ? DW - 24 : 100, y0 = touch ? 148 : 428;
    let k = 0, pulseCol = null;
    for (let i = 0; i < L.length; i++) {
      const s = L[i]; if (s.legacy && (s.id === 'chilled' || s.id === 'rooted')) continue;   // the status row already shows Slowed / Rooted
      const x = touch ? x0 - (skip + k + 1) * 24 + 4 : x0 + (skip + k) * 24, y = y0, row = ELFX.rows[s.fx.el], col = row ? row.hudCol : '#9fd0ff';
      ctx.fillStyle = '#0c0714'; ctx.fillRect(x, y, 20, 20); ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, 18, 18); ctx.fillStyle = '#1a1028'; ctx.fillRect(x + 2, y + 2, 16, 16);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(glyph(s.id), x + 2, y + 2, 16, 16);
      const frac = clamp(1 - s.t / s.max, 0, 1);   // the timer: a dark sweep growing as the status runs out
      if (frac > 0) { ctx.globalAlpha = 0.55; ctx.fillStyle = '#05030c'; ctx.fillRect(x + 2, y + 2, 16, Math.round(16 * frac)); ctx.globalAlpha = 1; }
      if (s.t < 10 && typeof UI !== 'undefined' && UI.text) UI.text(ctx, s.t >= 1 ? Math.ceil(s.t) + '' : s.t.toFixed(1), x + 10, y + 21, 'small', '#ffffff', 'center');
      if (s.stacks > 1) digit(ctx, s.stacks, x + 14, y + 3);
      const key = s.id + i; if (!lastEmit[key] || t - lastEmit[key] > 0.45 || t < lastEmit[key]) { lastEmit[key] = t; if (row && particlesOn()) UIP.emit(row.id, x + 10, y + 8, reduced() ? 1 : 2, t); }
      if (!pulseCol) pulseCol = col;
      k++;
    }
    W.hud = k; if (k) UIP.draw(ctx, t, 2);
    if (pulseCol && !touch) {   // the portrait rim pulse in the first status's colour (portrait block: 16, 452, 72 x 72)
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 6); ctx.fillStyle = pulseCol;
      ctx.fillRect(16, 452, 72, 2); ctx.fillRect(16, 522, 72, 2); ctx.fillRect(16, 452, 2, 72); ctx.fillRect(86, 452, 2, 72); ctx.globalAlpha = 1;
    }
    // the element dot: a skill slot whose element would react with the target's status
    if (!touch && typeof SLOT_GROUPS !== 'undefined' && typeof skillSlotState === 'function') {
      if (t - DOTS.t > 0.1 || t < DOTS.t) {   // the slot scan runs 10 times a second, the dots draw every frame
        DOTS.t = t; DOTS.list.length = 0;
        const e = target(p), TL = e ? of(e) : null;
        if (TL && TL.length) {
          const ids = TL.map(s => s.id);
          for (const grp of SLOT_GROUPS) grp.slots.forEach((slot, i) => {
            const st = skillSlotState(p, slot), el = st && st.element; if (!el || !REACT[el] || !REACT[el].some(id => ids.includes(id))) return;
            const row = ELFX.rows[el]; DOTS.list.push(grp.x + i * SLOT_PITCH, row ? row.hudCol : '#ffffff');
          });
        }
      }
      const D = DOTS.list, blink = Math.sin(t * 8) > 0;
      for (let j = 0; j < D.length; j += 2) {
        const x = D[j];
        ctx.fillStyle = '#0c0714'; ctx.fillRect(x + SLOT - 12, SLOT_Y + 2, 10, 10); ctx.fillStyle = D[j + 1]; ctx.fillRect(x + SLOT - 10, SLOT_Y + 4, 6, 6);
        if (blink) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + SLOT - 10, SLOT_Y + 4, 2, 2); }
      }
    }
    if (PERF && PERF.on) PERF.ph['sub.statusHud'] = (PERF.ph['sub.statusHud'] || 0) + performance.now() - t0;
  }

  function stats() { return { bodies: W.bodies, tiles: TILES.size, emittingTiles: W.tiles, parts: W.parts, hudIcons: W.hud, icons: W.icons || 0, iconsMoved: W.iconsMoved || 0, iconsHidden: W.iconsHidden || 0, iconRects: PLACED.map(r => [r.x, r.y, r.w, r.h]), dots: DOTS.list.length / 2, tintCache: TF_N, tintPages: PAGES.length, tintMade: W.tfMade, tintDeferred: W.tfDeferred, tintMadeTotal: TOT.made, tintDeferredTotal: TOT.deferred }; }
  return { FX, REACT, CAP, of, apply, clear, pose, body, begin, drawIcons, setTile, ring, clearTiles, drawTiles, drawHud, stats, glyph, tiles: TILES };
})();
if (typeof window !== 'undefined') window.STATUS = STATUS;
