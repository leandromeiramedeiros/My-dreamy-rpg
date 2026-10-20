'use strict';
// ---------------------------------------------------------------------------------------------------------------------------
// ELFX: the element particle registry, the grey-level sheet bakers, the shared tint cache, the closed-form motion models
// and the §31 pixel-FX atlas (DESIGN §31 / §32 / §33.6; build spec docs/meetings/2026-10-20-element-vfx.md Part A).
// Classic script, loaded right after util.js. Uses only util.js globals (makeCanvas, bayer, hexToRgb, clamp) and touches
// nothing at load: no canvas is created until ELFX.bake() (or the first sheet() / fxSheet() call) runs. Defines `ELFX`.
//
// Lifts (docs/CREDITS.md): the grey-level frame painting with binary alpha, framePen, stamp, packFrames and the slash arc
// painter are re-written from Lumina src/engine/pixel/FxSprites.js; the closed-form drift / emit / fall motion (emit's
// exponential drag E = (1 - e^-ka) / k, "life ends at spawn height") from src/engine/fx/Particles.js; the EFFECTS row
// shape (frame, mode, lift, duration, scale, back) from src/game/combat/CombatFx.js. The 4x4 Bayer table is util.js BAYER.
//
// ---- the registry row (A5.1, A9) -----------------------------------------------------------------------------------------
//   ramp    [dark, mid, light, core]   the 4 grey levels of every sheet are tinted with these (0.35 / 0.65 / 0.9 / 1.0)
//   textCol item / stat text colour    vivid  the saturated body tint (Echo, status tints)    hudCol  frames, rims, chips
//   icon    the ICONS element key (slash / pierce share 'physical')
//   motif   { w, h, frames:[rows...] }  pixel grids: '.' empty, 'd' dark, '2' mid, '1' light, '3' core (A2 legend)
//   model   rise | fall | jitter | orbit | dash | burst (MODELS below)       frame  life | fps | strobe | glint
//   vz, wobble, sway, k, r  model parameters in tiles (1 tile = 16 px) and tiles / s;  flicker  10 Hz dither toggle (fire)
//   life    [min, max] s     idle { rate /s, alive }     burst { n, spd tiles/s }     light { r px, a } | null (a <= 0.35)
//   mirror  true: the sheet also holds the frames mirrored (dash / burst rows pick them by the sign of vx)
//   bi      true: a burst sends every other particle the opposite way (slash's two crossing streak fans)
//
// ---- derivation map: the five colour tables become reads of this registry (P0; the swap itself is P2+, not done here) -----
//   items.js   EL_COL[el]            = ELFX.rows[el].textCol            (every key today: exact)
//   render.js  ECHO_ELCOL[el]        = ELFX.rows[el].vivid              (exact; A5.1 said ramp[1], which would move 4 of 6)
//   icons.js   EC[icon]              = ELFX.rows[el].hudCol, key = row.icon (slash / pierce -> 'physical' = slash.hudCol)
//   hero.js    ELC (= EC copy)       = the same as EC
//   menus.js   STAT_COL[el + 'Dmg']  = ELFX.rows[el].textCol            (fire, frost, nature, lightning, arcane, holy: exact)
//              statCol('res' + El)   already falls back to EL_COL, so it follows textCol for free
//   hud.js     EL_ICON_COL           = { el: row.icon } for rows whose icon differs from the id (slash, pierce)
//   Intended changes at swap time (the only non-exact cells, allow-listed in tools/fx-board.js --check):
//     EC.holy / ELC.holy  #ffd75a gold -> #fff2c4 pale white-gold (D1-B, elements minutes §4.4: gold only as the glint core)
//   New keys the swap adds (no current value): wind everywhere; shatter in EL_COL; gloom in EC; EC.wind / ELC.wind.
//   Not in the tables today: shatter has no EC / ECHO / STAT colour, gloom no DMG_ELS entry, wind no DMG_ELS / RES_ELS entry
//   (the elements lane adds wind to both).  ELFX.derived() returns all of these tables; the check diffs them against the code.
// ---------------------------------------------------------------------------------------------------------------------------
const ELFX = (function () {
  const TILE = 16;                                           // px per tile (A8: 1 unit = 16 px)
  const GREY = [89, 166, 230, 255];                          // dark / mid / light / core grey levels (0.35 / 0.65 / 0.9 / 1.0)
  const LV = { d: 1, 2: 2, 1: 3, 3: 4 };                     // motif char -> level + 1 (0 = empty)
  const DISSOLVE = 4;                                        // Bayer dissolve variants per sheet (rows 1..4 under the solid row)

  // ---- the registry: 9 hero elements + shatter (reaction type) + gloom (enemy) --------------------------------------------
  const rows = {
    slash: {
      ramp: ['#8a94b0', '#c8d0e8', '#e7eeff', '#ffffff'], textCol: '#ffffff', vivid: '#c8d0e8', hudCol: '#aab4cc', icon: 'physical',
      motif: { w: 5, h: 3, frames: [
        ['.....', '.d21.', '.....'],
        ['....3', '.d21.', 'd....'],
        ['.....', '..d2.', '.....']] },
      model: 'dash', frame: 'life', k: 9, vz: 0.15, life: [0.18, 0.28], mirror: true, bi: true,
      idle: { rate: 0, alive: 0 }, burst: { n: 8, spd: 9 }, light: null },
    pierce: {
      ramp: ['#6a7490', '#aab4cc', '#e7eeff', '#ffffff'], textCol: '#e7eeff', vivid: '#aab4cc', hudCol: '#aab4cc', icon: 'physical',
      motif: { w: 5, h: 1, frames: [['d2221'], ['.d221']] },
      model: 'dash', frame: 'life', k: 6, vz: 0, life: [0.2, 0.3], mirror: true,
      idle: { rate: 8, alive: 3 }, burst: { n: 4, spd: 8 }, light: null },
    fire: {
      ramp: ['#ff4a3a', '#ff8a4a', '#ffd27a', '#fff0c0'], textCol: '#ff9a4a', vivid: '#ff5a1e', hudCol: '#ff8a3a', icon: 'fire',
      motif: { w: 3, h: 3, frames: [
        ['.2.', '212', '.2.'],
        ['...', '.12', '.2.'],
        ['...', '.3.', '...']] },
      model: 'rise', frame: 'life', vz: 1.0, vzVar: 0.4, wobble: 0.15, flicker: true, life: [0.5, 0.9],
      idle: { rate: 3, alive: 3 }, burst: { n: 12, spd: 2 }, light: { r: 24, a: 0.3 } },
    frost: {
      ramp: ['#2aa8ff', '#5fd4ff', '#9fe8ff', '#e8fbff'], textCol: '#9fe8ff', vivid: '#2aa8ff', hudCol: '#5fd4ff', icon: 'frost',
      motif: { w: 5, h: 5, frames: [
        ['..1..', '..1..', '11311', '..1..', '..1..'],
        ['1...1', '.1.1.', '..3..', '.1.1.', '1...1']] },
      model: 'fall', frame: 'fps', fps: 4, vz: 0.6, vzVar: 0.2, sway: 0.25, life: [0.9, 1.6],
      idle: { rate: 2, alive: 2 }, burst: { n: 9, spd: 1.5 }, light: { r: 16, a: 0.2 } },
    lightning: {
      ramp: ['#c8a000', '#ffe630', '#fff07a', '#ffffff'], textCol: '#fff07a', vivid: '#ffe630', hudCol: '#ffe14a', icon: 'lightning',
      motif: { w: 3, h: 3, frames: [
        ['31.', '.2.', '.12'],
        ['.13', '.2.', '21.']] },
      model: 'jitter', frame: 'strobe', life: [0.12, 0.25],
      idle: { rate: 12, alive: 3 }, burst: { n: 7, spd: 0 }, light: { r: 16, a: 0.35 } },
    nature: {
      ramp: ['#1f4e4c', '#3f8b63', '#94cf7f', '#d2f0a6'], textCol: '#8fe0a0', vivid: '#28d860', hudCol: '#5fd65f', icon: 'nature',
      motif: { w: 3, h: 3, frames: [
        ['.11', '121', 'd2.'],
        ['11.', '121', '.2d']] },
      model: 'fall', frame: 'fps', fps: 3, vz: 0.35, vzVar: 0.1, sway: 0.5, settle: 0.3, life: [1.2, 2.0],
      idle: { rate: 1.5, alive: 2 }, burst: { n: 8, spd: 1.2 }, light: null },
    arcane: {
      ramp: ['#5a2aa0', '#9a44ff', '#d6b0ff', '#ffffff'], textCol: '#d6b0ff', vivid: '#9a44ff', hudCol: '#b07cff', icon: 'arcane',
      motif: { w: 1, h: 4, frames: [['3', '1', '2', '2'], ['.', '1', '2', 'd']] },
      rune: { w: 3, h: 3, frames: [['111', '.2.', '.2.'], ['.2.', '212', '.2.']] },
      model: 'orbit', frame: 'life', r: 0.45, rVar: 0.15, vz: 0.5, life: [0.8, 1.4],
      idle: { rate: 2, alive: 2 }, burst: { n: 9, spd: 0 }, light: { r: 16, a: 0.25 } },
    holy: {
      // D1-B: the body is pale white-gold (light step); gold (mid) is only the glint's centre pixel
      ramp: ['#c08a30', '#ffd75a', '#fff2c4', '#ffffff'], textCol: '#fff2b0', vivid: '#fff2c4', hudCol: '#fff2c4', icon: 'holy',
      motif: { w: 3, h: 3, frames: [                      // A2 "a 5 px cross": centre + 4 arms, so it never reads as frost's 9 px cross
        ['...', '.1.', '...'],
        ['.1.', '121', '.1.']] },
      model: 'rise', frame: 'glint', vz: 0.3, vzVar: 0.05, wobble: 0, flicker: false, life: [1.2, 2.0],
      idle: { rate: 1, alive: 2 }, burst: { n: 7, spd: 2 }, light: { r: 16, a: 0.2 } },
    wind: {
      // A9 worked row; the curl grid is redrawn so it reads as a hook, not as slash's diagonal streak
      ramp: ['#4a7a80', '#7fc8c0', '#c8f0e8', '#ffffff'], textCol: '#c8f0e8', vivid: '#7fc8c0', hudCol: '#8fe0d0', icon: 'wind',
      motif: { w: 5, h: 4, frames: [
        ['.111.', '1...1', '..d.1', '...1.'],
        ['.....', '2111.', '....1', '..11.']] },
      model: 'dash', frame: 'fps', fps: 6, k: 1.6, vz: 0.1, wobble: 0.15, life: [0.5, 0.8], mirror: true,
      idle: { rate: 2, alive: 2 }, burst: { n: 8, spd: 3.5 }, light: null },
    shatter: {
      ramp: ['#1a3a5a', '#5fd4ff', '#bfe8ff', '#ffffff'], textCol: '#bfe8ff', vivid: '#5fd4ff', hudCol: '#5fd4ff', icon: 'frost',
      motif: { w: 3, h: 3, frames: [['11d', '12d', 'dd.'], ['...', '1d.', '...']] },
      model: 'burst', frame: 'life', vz: 3.2, g: 12, life: [0.45, 0.7], mirror: false,
      idle: { rate: 0, alive: 0 }, burst: { n: 18, spd: 4.5 }, light: null },
    gloom: {
      ramp: ['#2a1c38', '#5f4690', '#ff7ae0', '#ffd0ff'], textCol: '#c070ff', vivid: '#c070ff', hudCol: '#c070ff', icon: 'gloom',
      motif: { w: 2, h: 2, frames: [['2d', 'dd'], ['2d', 'd1']] },
      model: 'rise', frame: 'life', vz: 0.25, vzVar: 0.05, wobble: 0.1, flicker: false, life: [1.0, 1.6],
      idle: { rate: 1.5, alive: 2 }, burst: { n: 6, spd: 0.8 }, light: null },
  };
  for (const id in rows) rows[id].id = id;
  const HERO_ELS = ['slash', 'pierce', 'fire', 'frost', 'lightning', 'nature', 'arcane', 'holy', 'wind'];
  const ORDER = HERO_ELS.concat(['shatter', 'gloom']);

  // ---- tiny deterministic hash (seed, k) -> [0, 1) ------------------------------------------------------------------------
  const hash = (s, k) => { let h = Math.imul((s * 4294967296) | 0, 0x27d4eb2d) ^ Math.imul(k | 0, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

  // ---- closed-form motion models (A3; Lumina Particles.js drift / emit / fall). pos(p, t) depends only on (p, t) ----------
  // A particle: { el, x0, y0, z0, vx, vy, vz, born, life, s (seed 0..1), ox, oy, r (orbit) }; px, px / s, z = px above ground.
  const KICK = 4;   // burst kick drag (1/s): rise / fall bursts are thrown out radially, E = (1 - e^-ka) / k, then the model runs
  const kick = a => (1 - Math.exp(-KICK * a)) / KICK;
  const MODELS = {
    rise(p, a, R, o) { const S = p.s * 6.2832, E = kick(a); o.x = p.x0 + p.vx * E + (R.wobble || 0) * TILE * (Math.sin(2.3 * a + S) + 0.5 * Math.sin(5.1 * a + 1.7 * S)); o.y = p.y0 + p.vy * E; o.z = p.z0 + p.vz * a; },
    fall(p, a, R, o) {   // life ends at the ground (the petal rule); x is held from the landing on
      const land = p.vz > 0 ? p.z0 / p.vz : 1e9, al = Math.min(a, land), S = p.s * 6.2832, E = kick(al);
      o.x = p.x0 + p.vx * E + (R.sway || 0) * TILE * Math.sin(2.1 * al + S); o.y = p.y0 + p.vy * E; o.z = Math.max(0, p.z0 - p.vz * a);
    },
    jitter(p, a, R, o) { const k = Math.floor(a * 30); o.x = p.x0 + (Math.floor(hash(p.s, k) * 3) - 1); o.y = p.y0 + (Math.floor(hash(p.s, k + 977) * 3) - 1); o.z = p.z0; },   // no travel: bursts are placed, not thrown
    orbit(p, a, R, o) { const ang = p.s * 6.2832 + 1.8 * a; o.x = p.ox + p.r * Math.cos(ang); o.y = p.oy + p.r * 0.5 * Math.sin(ang); o.z = p.z0 + p.vz * a; },
    dash(p, a, R, o) {   // Lumina emit: p = p0 + v0 * E(a), E = (1 - e^-ka) / k; no gravity
      const k = R.k || 6, E = (1 - Math.exp(-k * a)) / k;
      o.x = p.x0 + p.vx * E; o.y = p.y0 + p.vy * E;
      o.z = p.z0 + p.vz * a + (R.wobble ? R.wobble * TILE * Math.sin(9 * a + p.s * 6.2832) * Math.min(1, a * 4) : 0);
    },
    burst(p, a, R, o) {  // ballistic with one ground bounce (0.3), closed form; the §27 hit bursts keep game.js burst()
      const g = (R.g || 9) * TILE, t1 = 2 * p.vz / g;
      let z, h;
      if (a < t1) { z = p.vz * a - 0.5 * g * a * a; h = a; } else { const b = a - t1, v2 = p.vz * 0.3; z = Math.max(0, v2 * b - 0.5 * g * b * b); h = t1 + b * 0.4; }
      o.x = p.x0 + p.vx * h; o.y = p.y0 + p.vy * h; o.z = p.z0 + z;
    },
  };
  // pos(p, t, out) -> out { vis, x, y (ground point), z (lift px), sx, sy (draw centre = x, y - z), f (sheet column), d (dissolve row) }
  function pos(p, t, o) {
    o = o || {};
    const a = t - p.born;
    if (!(a >= 0 && a < p.life)) { o.vis = false; return o; }
    const R = rows[p.el], m = R.motif, n = m.frames.length, u = a / p.life;
    MODELS[R.model](p, a, R, o);
    let f;
    if (R.frame === 'fps') f = Math.floor(a * R.fps + p.s * n) % n;
    else if (R.frame === 'strobe') f = Math.floor(a * 30) & 1;
    else if (R.frame === 'glint') { const g = 0.3 + 0.4 * hash(p.s, 31); f = Math.abs(u - g) < 0.07 ? 1 : 0; }
    else f = Math.min(n - 1, Math.floor(u * n));
    if (R.mirror && p.vx < 0) f += n;
    let d = u > 0.75 ? Math.min(DISSOLVE, 1 + Math.floor((u - 0.75) * 4 * DISSOLVE)) : 0;   // the dithered fade (high tier)
    if (R.flicker && Math.sin(63 * a + p.s * 6.2832) <= -0.2) d = Math.max(d, 2);           // fire flicker = the 50 % dither row
    o.f = f; o.d = d; o.vis = true; o.sx = o.x; o.sy = o.y - o.z;
    return o;
  }

  // spawn(el, x, y, z, t, k, opts) -> a particle. k = an integer spawn index; everything else is hashed from (opts.seed, k), so
  // a stateless emitter (born = k / rate) is a pure function of t.  opts: { seed, dir (rad), spread, spd, burst:true, ox, oy }
  function spawn(el, x, y, z, t, k, opts) {
    const R = rows[el], O = opts || {}, s = hash(O.seed || 0.123, k), s2 = hash(s, 7), s3 = hash(s, 13);
    const p = { el, x0: x, y0: y, z0: z || 0, vx: 0, vy: 0, vz: 0, born: t, life: R.life[0] + (R.life[1] - R.life[0]) * s2, s, ox: x, oy: y, r: 0 };
    const spd = (O.spd != null ? O.spd : R.burst.spd) * TILE * (0.6 + 0.4 * s3);
    if (R.model === 'rise' || R.model === 'fall') {
      p.vz = ((R.vz || 0) + (R.vzVar || 0) * (s3 * 2 - 1)) * TILE;
      if (O.burst) { const ang = s * 6.2832, v = spd * 1.6 * (0.4 + 0.6 * hash(s, 3)); p.vx = Math.cos(ang) * v; p.vy = Math.sin(ang) * v * 0.5; p.z0 += 3 * hash(s, 17); }
    } else if (R.model === 'orbit') {
      p.r = O.r != null ? O.r * (0.8 + 0.4 * s3) : ((R.r || 0.45) + (R.rVar || 0) * (s3 * 2 - 1)) * TILE; p.vz = (R.vz || 0) * TILE; p.ox = O.ox != null ? O.ox : x; p.oy = O.oy != null ? O.oy : y;
    } else if (R.model === 'dash' || R.model === 'burst') {
      const ang = (O.dir != null ? O.dir : 0) + (O.spread != null ? O.spread : Math.PI) * (s * 2 - 1) + (R.bi && (k & 1) ? Math.PI : 0);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd * 0.5; p.vz = (R.vz || 0) * TILE * (R.model === 'burst' ? 0.6 + 0.4 * s2 : 1);
      if (O.burst && R.model === 'dash') p.z0 += (s2 - 0.5) * 14;   // a dash fan starts as a short vertical line, not a point
    } else if (R.model === 'jitter' && O.burst) {
      const ang = s * 6.2832, rr = (2 + 6 * s3); p.x0 += Math.cos(ang) * rr; p.y0 += Math.sin(ang) * rr * 0.5; p.z0 += 4 * s2;
    }
    return p;
  }

  // ---- grey-level sheets (Lumina FxSprites: grey levels, binary alpha, framePen / stamp / packFrames) ---------------------
  // A grey sheet: { id, w, h, n, cols, rows, buf:Uint8Array (level + 1 per px), masks:[4 canvases] }.  Layout: column = frame
  // (then the mirrored frames), row 0 = solid, rows 1..4 = Bayer dissolve variants (pixel kept where bayer(x, y) >= k / 5).
  const greys = {};
  function framePen(buf, BW, x0, y0, w, h) {
    const set = (x, y, l) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; buf[(y0 + y) * BW + x0 + x] = l; };
    const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : buf[(y0 + y) * BW + x0 + x]);
    const max = (x, y, l) => { x = Math.round(x); y = Math.round(y); if (get(x, y) < l) set(x, y, l); };
    return { set, get, max, w, h };
  }
  const stamp = (pen, gridRows, ox, oy) => gridRows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const l = LV[row[x]]; if (l) pen.set((ox || 0) + x, (oy || 0) + y, l); } });
  function makeGrey(id, w, h, n, paint, mirror) {
    const cols = n * (mirror ? 2 : 1), BW = cols * w, BH = (DISSOLVE + 1) * h, buf = new Uint8Array(BW * BH);
    for (let i = 0; i < n; i++) paint(framePen(buf, BW, i * w, 0, w, h), i);
    if (mirror) for (let i = 0; i < n; i++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf[y * BW + (n + i) * w + (w - 1 - x)] = buf[y * BW + i * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < BW; x++) {
      const l = buf[y * BW + x]; if (!l) continue;
      const b = bayer(x % w, y);
      for (let k = 1; k <= DISSOLVE; k++) { if (b < k / (DISSOLVE + 1)) break; buf[(k * h + y) * BW + x] = l; }
    }
    return (greys[id] = { id, w, h, n, cols, rows: DISSOLVE + 1, BW, BH, buf, masks: null, grey: null });
  }
  function masksOf(g) {   // the 4 binary-alpha white level masks, stacked as 4 bands of one canvas (one putImageData)
    if (g.masks) return g.masks;
    const m = makeCanvas(g.BW, g.BH * 4), im = m.x.createImageData(g.BW, g.BH * 4), d = im.data, n = g.buf.length;
    for (let i = 0; i < n; i++) { const l = g.buf[i]; if (l) { const j = ((l - 1) * n + i) * 4; d[j] = d[j + 1] = d[j + 2] = d[j + 3] = 255; } }
    m.x.putImageData(im, 0, 0);
    return (g.masks = m.c);
  }
  function greyCanvas(g) {   // the grey-level sheet itself (board / freeze tool)
    if (g.grey) return g.grey;
    const m = makeCanvas(g.BW, g.BH), im = m.x.createImageData(g.BW, g.BH), d = im.data;
    for (let i = 0; i < g.buf.length; i++) { const l = g.buf[i]; if (l) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = GREY[l - 1]; d[i * 4 + 3] = 255; } }
    m.x.putImageData(im, 0, 0);
    return (g.grey = m.c);
  }

  // ---- the shared tint cache (A5.2, §31): keyed (grey sheet, ramp, scale), shared by the particle sheets and the atlas -------
  // Two backends paint the same pixels (the board asserts parity sheet by sheet):
  //   'lut'      (default) each level byte of the grey buffer -> its ramp RGB, one putImageData per sheet. Used at bake: on
  //              the headless desktop it bakes in ~2/3 of the source-in time (tools/shots/m3-fxboard/metrics.json).
  //   'sourceIn' the 4 binary level masks side by side in a scratch canvas, each band source-in filled with its ramp step
  //              (clipped: source-in clears whatever lies outside the filled shape), composited into the sheet. This is
  //              the path for grey canvases that arrive as images (the PNG freeze), and ?tint=sourcein forces it.
  // 2x (HUD) is one nearest-neighbour blit of the 1x tint.
  const tints = new Map();
  let scratch = null, TINT_MODE = (typeof location !== 'undefined' && /tint=sourcein/i.test(location.search)) ? 'sourceIn' : 'lut';
  function tintLevels(g, ramp, mode) {
    const out = makeCanvas(g.BW, g.BH);
    if (mode === 'lut') {
      const im = out.x.createImageData(g.BW, g.BH), d = im.data, rgb = ramp.map(hexToRgb), b = g.buf;
      for (let i = 0; i < b.length; i++) { const l = b[i]; if (l) { const c = rgb[l - 1], j = i * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; } }
      out.x.putImageData(im, 0, 0);
      return out.c;
    }
    const M = masksOf(g), SW = g.BW * 4;
    if (!scratch || scratch.c.width < SW || scratch.c.height < g.BH) scratch = makeCanvas(Math.max(SW, scratch ? scratch.c.width : 0), Math.max(g.BH, scratch ? scratch.c.height : 0));
    const sx = scratch.x;
    sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, SW, g.BH);
    for (let l = 0; l < 4; l++) sx.drawImage(M, 0, l * g.BH, g.BW, g.BH, l * g.BW, 0, g.BW, g.BH);
    sx.globalCompositeOperation = 'source-in';
    for (let l = 0; l < 4; l++) { sx.save(); sx.beginPath(); sx.rect(l * g.BW, 0, g.BW, g.BH); sx.clip(); sx.fillStyle = ramp[l]; sx.fillRect(l * g.BW, 0, g.BW, g.BH); sx.restore(); }
    sx.globalCompositeOperation = 'source-over';
    for (let l = 0; l < 4; l++) out.x.drawImage(scratch.c, l * g.BW, 0, g.BW, g.BH, 0, 0, g.BW, g.BH);
    return out.c;
  }
  function tint(g, ramp, scale) {
    scale = scale || 1;
    const key = g.id + '|' + ramp.join('') + '|' + scale;
    let c = tints.get(key);
    if (c) return c;
    let cv;
    if (scale !== 1) { const o = makeCanvas(g.BW * scale, g.BH * scale); o.x.drawImage(tint(g, ramp, 1).c, 0, 0, g.BW, g.BH, 0, 0, g.BW * scale, g.BH * scale); cv = o.c; }
    else cv = tintLevels(g, ramp, TINT_MODE);
    c = { c: cv, w: g.w * scale, h: g.h * scale, n: g.n, cols: g.cols, scale, key };
    tints.set(key, c);
    return c;
  }
  function elGrey(id) {
    const key = id, g = greys[key];
    if (g) return g;
    const [el, sub] = id.split('.'), R = rows[el], m = sub ? R[sub] : R.motif;
    return makeGrey(key, m.w, m.h, m.frames.length, (pen, i) => stamp(pen, m.frames[i]), !sub && R.mirror);
  }
  // sheet(el, scale) -> { c, w, h, n, cols }: the tinted particle sheet at 1x (world) or 2x (HUD). 'arcane.rune' for the runes.
  const fast = {};   // id -> [ , 1x, 2x ] direct references (no key building on the per-particle path)
  const sheet = (id, scale) => { scale = scale || 1; const f = fast[id] || (fast[id] = []); return f[scale] || (f[scale] = tint(elGrey(id), rows[id.split('.')[0]].ramp, scale)); };

  // draw(ctx, p, t, scale, ox, oy): ONE drawImage per particle (no fillStyle, no composite, no alpha change). Returns 1 / 0.
  const _o = {};
  function draw(ctx, p, t, scale, ox, oy) {
    const o = pos(p, t, _o);
    if (!o.vis) return 0;
    const S = sheet(p.el, scale), sc = scale || 1;
    ctx.drawImage(S.c, o.f * S.w, o.d * S.h, S.w, S.h, Math.round((ox || 0) + o.sx * sc - S.w / 2), Math.round((oy || 0) + o.sy * sc - S.h / 2), S.w, S.h);
    return 1;
  }

  // ---- the §31 pixel-FX atlas: 3 prototype effects, painted in grey levels, tinted from the same ramps ---------------------
  const D = 1, M = 2, L = 3, W = 4;   // dark / mid / light / core levels for the painters
  // crescent arc (Lumina FxSprites `arc`): the band between two ellipses, revealed between a0..a1, the leading edge brightest
  function arc(pen, { cx, cy, rx, ry, thick, a0, a1 }) {
    const rin = 1 - thick;
    for (let y = 0; y < pen.h; y++) for (let x = 0; x < pen.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (cy - (y + 0.5)) / ry, r2 = dx * dx + dy * dy;
      if (r2 > 1 || r2 < rin * rin || dy < -0.05) continue;   // outside the band at its widest: skip the trig
      const r = Math.sqrt(r2), a = Math.atan2(dy, dx);
      if (a < a0 || a > a1) continue;
      const u = (a - a0) / Math.max(1e-6, a1 - a0), toLead = u, t = thick * (0.35 + 0.65 * (1 - toLead));
      if (r > 1 || r < 1 - t) continue;
      const edge = r > 1 - t * 0.35;
      // R5 / Lumina COMBAT-15: only the leading tip is core; the rest of the edge is the light step
      pen.set(x, y, edge ? (toLead < 0.06 ? W : L) : toLead < 0.5 ? M : D);
    }
  }
  let _polar = null;   // the fire burst's per-pixel polar table (shared by its 5 frames)
  function polar32() {
    if (_polar) return _polar;
    const r = new Float32Array(1024), a = new Float32Array(1024), s13 = new Float32Array(1024);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const dx = x - 15.5, dy = y - 15.5, j = y * 32 + x; r[j] = Math.sqrt(dx * dx + dy * dy); a[j] = Math.atan2(dy, dx); s13[j] = 0.12 * Math.sin(a[j] * 13 + 2.1); }
    return (_polar = { r, a, s13 });
  }
  const PAINT = {
    slashArc(pen, i) {   // sweep right -> left over 4 frames (Lumina's slash frame parameters)
      const P = [{ a0: 0.15, a1: 1.2, thick: 0.28 }, { a0: 0.1, a1: 2.2, thick: 0.34 }, { a0: 0.35, a1: 3.0, thick: 0.3 }, { a0: 1.7, a1: 3.05, thick: 0.18 }][i];
      arc(pen, Object.assign({ cx: 24, cy: 22.5, rx: 22.5, ry: 21 }, P));
      if (i === 3) for (let x = 3; x < 20; x += 3) pen.set(x, 20 - (x % 2), D);
    },
    fireBurst(pen, i) {  // 32 x 32: a white-hot pop, a tongued fireball, a broken ring, then embers flung out
      const c = 15.5, R0 = [3.2, 7, 10, 12, 13.5][i], P = polar32();
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const j = y * 32 + x, r = P.r[j], dy = y + 0.5 - c - 0.5;
        if (r > R0 * 1.35) continue;                           // beyond the tongues' reach
        const tongue = 1 + 0.22 * Math.sin(P.a[j] * 7 + i * 1.3) + P.s13[j];
        const edge = R0 * tongue - (dy < 0 ? 0 : dy * 0.12);
        if (r > edge) continue;
        if (i <= 1) { pen.set(x, y, r < (i ? 1.5 : 1.2) ? W : r < edge * 0.5 ? L : r < edge - 1.2 ? M : D); continue; }
        const hole = edge * (i === 2 ? 0.55 : 0.78);          // the burst hollows out from the centre
        if (r < hole) continue;
        if (i >= 3 && ((x * 7 + y * 3 + i) % 5 < 2)) continue; // it breaks up
        pen.set(x, y, i === 2 ? (r > edge - 1.5 ? M : L) : i === 3 ? (r > edge - 1.5 ? D : M) : D);
      }
      if (i >= 2) for (let k = 0; k < 8; k++) {             // embers (3 x 3 diamonds) flung out along fixed angles
        const a = k * 0.785 + 0.35, rr = [0, 0, 11, 13.5, 15][i], ex = c + Math.cos(a) * rr, ey = c + Math.sin(a) * rr - (i - 2) * 1.5;
        const v = i === 4 ? M : L; pen.max(ex, ey, v); if (i < 4) { pen.max(ex - 1, ey, M); pen.max(ex + 1, ey, M); pen.max(ex, ey - 1, M); pen.max(ex, ey + 1, M); }
      }
    },
    frostHit(pen, i) {   // 24 x 24: a 4-point star, then 6 crystal spikes, a hex ring of shards, shards falling apart
      const c = 11.5;
      if (i === 0) for (let k = -5; k <= 5; k++) { const v = Math.abs(k) < 2 ? W : Math.abs(k) < 4 ? L : M; pen.set(c + k, c, v); pen.set(c, c + k, v); }
      if (i === 1 || i === 2) {
        const len = i === 1 ? 8 : 10;
        for (let s = 0; s < 6; s++) {
          const a = s * Math.PI / 3 + Math.PI / 6;
          for (let k = (i === 2 ? 4 : 0); k <= len; k += 0.5) {
            const px = c + Math.cos(a) * k, py = c + Math.sin(a) * k * 0.85, v = k < 2 ? W : k > len - 1.5 ? M : L;
            pen.max(px, py, v);
            if (k > len * 0.55 && k < len - 1) { pen.max(px + Math.cos(a + 1.57), py + Math.sin(a + 1.57), D); pen.max(px - Math.cos(a + 1.57), py - Math.sin(a + 1.57), D); }
          }
        }
        if (i === 1) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) pen.max(c + x, c + y, Math.abs(x) + Math.abs(y) < 2 ? W : L);
      }
      if (i === 3) for (let s = 0; s < 6; s++) {             // shards: 2 x 2 chips with a dark edge, dropped below their spike
        const a = s * Math.PI / 3 + Math.PI / 6, px = c + Math.cos(a) * 9, py = c + Math.sin(a) * 7.6 + 3;
        pen.set(px, py, L); pen.set(px + 1, py, M); pen.set(px, py + 1, M); pen.set(px + 1, py + 1, D);
      }
    },
  };
  // name -> { w, h, n, fps }  (Lumina FX_FRAMES shape)
  const FX_FRAMES = { slashArc: { w: 48, h: 24, n: 4, fps: 30 }, fireBurst: { w: 32, h: 32, n: 5, fps: 20 }, frostHit: { w: 24, h: 24, n: 4, fps: 24 } };
  // the data-driven effect table (Lumina CombatFx EFFECTS row shape). el = the ramp it is tinted with (any row may override
  // it at play time: a fire slash is slashArc tinted with the fire ramp). parts = the element burst that rides with it.
  const EFFECTS = {
    slash: { frame: 'slashArc', el: 'slash', mode: 'flat', lift: 8, loops: 1, scale: 1, back: 0, fadeLast: 1, parts: { el: 'slash', n: 6 } },
    fireBurst: { frame: 'fireBurst', el: 'fire', mode: 'billboard', lift: 10, loops: 1, scale: 1, back: 0, fadeLast: 2, parts: { el: 'fire', n: 12 } },
    frostHit: { frame: 'frostHit', el: 'frost', mode: 'billboard', lift: 10, loops: 1, scale: 1, back: 0, fadeLast: 1, parts: { el: 'frost', n: 6 } },
  };
  // packFrames (Lumina): shelf-pack the atlas frames, tallest first, into one 128-wide grey atlas (layout report only; each
  // effect is its own grey sheet so its dissolve rows sit under its frames)
  function packFrames(width) {
    const names = Object.keys(FX_FRAMES).sort((a, b) => (FX_FRAMES[b].h - FX_FRAMES[a].h) || (a < b ? -1 : 1)), out = {};
    let x = 0, y = 0, shelf = 0;
    for (const nm of names) { const { w, h, n } = FX_FRAMES[nm]; out[nm] = []; for (let i = 0; i < n; i++) { if (x + w + 2 > width) { x = 0; y += shelf; shelf = 0; } out[nm].push({ x: x + 1, y: y + 1 }); x += w + 2; shelf = Math.max(shelf, h + 2); } }
    return { frames: out, h: y + shelf };
  }
  const fxGrey = name => greys['fx.' + name] || makeGrey('fx.' + name, FX_FRAMES[name].w, FX_FRAMES[name].h, FX_FRAMES[name].n, PAINT[name], false);
  // fxSheet(effect, el?) -> the tinted atlas sheet for an EFFECTS row (el overrides the row's ramp)
  const fxSheet = (fx, el, scale) => tint(fxGrey(EFFECTS[fx].frame), rows[el || EFFECTS[fx].el].ramp, scale || 1);
  // fxDraw(ctx, fx, age, x, y, el?, ox, oy): one drawImage; the last `fadeLast` frames take the dissolve rows. Returns 0 when over.
  function fxDraw(ctx, fx, age, x, y, el, scale) {
    const E = EFFECTS[fx], F = FX_FRAMES[E.frame], S = fxSheet(fx, el, scale), sc = scale || 1;
    const fl = age * F.fps, fi = Math.floor(fl);
    if (age < 0 || fi >= F.n * (E.loops || 1)) return 0;
    const f = fi % F.n, last = F.n - (E.fadeLast || 0), d = f >= last ? Math.min(DISSOLVE, 1 + Math.floor(((f - last) + (fl - fi)) / (E.fadeLast || 1) * DISSOLVE)) : 0;
    ctx.drawImage(S.c, f * S.w, d * S.h, S.w, S.h, Math.round(x - S.w / 2), Math.round(y - E.lift * sc - S.h / 2), S.w, S.h);
    return 1;
  }
  const fxDuration = fx => FX_FRAMES[EFFECTS[fx].frame].n * (EFFECTS[fx].loops || 1) / FX_FRAMES[EFFECTS[fx].frame].fps;

  // ---- bake: every grey sheet and the default tints (1x world, 2x HUD) up front; idempotent ---------------------------------
  let baked = null;
  function bake() {
    if (baked) return baked;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), t0 = now(), ids = ORDER.concat(['arcane.rune']);
    for (const id of ids) elGrey(id);
    for (const fx in EFFECTS) fxGrey(EFFECTS[fx].frame);
    let sw = 1, sh = 1; for (const id in greys) { sw = Math.max(sw, greys[id].BW * 4); sh = Math.max(sh, greys[id].BH); }
    if (TINT_MODE === 'sourceIn') scratch = makeCanvas(sw, sh);   // one scratch canvas for every tint (no re-allocation mid-bake)
    const t1 = now();
    for (const id of ids) sheet(id, 1);
    const t2 = now();
    for (const id of ids) sheet(id, 2);
    const t3 = now(), t4 = t3;
    for (const fx in EFFECTS) fxSheet(fx);
    const t5 = now();
    baked = { ms: t5 - t0, paintMs: t1 - t0, tint1Ms: t2 - t1, tint2Ms: t3 - t2, atlasTintMs: t5 - t4 };   // paintMs includes the atlas painters
    return baked;
  }
  // stats -> the tint cache contents (sheets, px, raw RGBA bytes)
  function stats() { let px = 0; const list = []; tints.forEach(s => { px += s.c.width * s.c.height; list.push(s); }); return { sheets: list.length, px, rawBytes: px * 4, list }; }

  // ---- a screen-space pool for HUD / menus (A5.4 UIP; prototype: the board uses it, hud.js / menus.js wire it in P4 / P5) --
  // Float32Array ring, 12 floats a slot: x0 y0 z0 vx vy vz born life s r elIndex used. emit(el, x, y, n, t) takes HUD px (the
  // 2x grid) and stores scene px; draw() blits the 2x sheets, so one particle pixel = one scene pixel = a 2x2 HUD block.
  function makePool(slots) {
    const F = 12, a = new Float32Array(slots * F), p = { el: '', x0: 0, y0: 0, z0: 0, vx: 0, vy: 0, vz: 0, born: 0, life: 0, s: 0, ox: 0, oy: 0, r: 0 };
    let head = 0, live = 0;
    return {
      slots,
      clear() { a.fill(0); head = 0; },
      emit(el, x, y, n, t, opts) {
        for (let i = 0; i < n; i++) {
          const q = spawn(el, x / 2, y / 2, 0, t, (opts && opts.k0 || 0) + i, Object.assign({ burst: true }, opts)), o = head * F;
          a[o] = q.x0; a[o + 1] = q.y0; a[o + 2] = q.z0; a[o + 3] = q.vx; a[o + 4] = q.vy; a[o + 5] = q.vz; a[o + 6] = q.born; a[o + 7] = q.life;
          a[o + 8] = q.s; a[o + 9] = q.r; a[o + 10] = ORDER.indexOf(el); a[o + 11] = 1; head = (head + 1) % slots;
        }
      },
      draw(ctx, t, scale) {
        let n = 0;
        for (let i = 0; i < slots; i++) {
          const o = i * F; if (!a[o + 11]) continue;
          if (t - a[o + 6] >= a[o + 7]) { a[o + 11] = 0; continue; }
          p.el = ORDER[a[o + 10]]; p.x0 = p.ox = a[o]; p.y0 = p.oy = a[o + 1]; p.z0 = a[o + 2]; p.vx = a[o + 3]; p.vy = a[o + 4]; p.vz = a[o + 5];
          p.born = a[o + 6]; p.life = a[o + 7]; p.s = a[o + 8]; p.r = a[o + 9];
          n += draw(ctx, p, t, scale || 2);
        }
        return (live = n);
      },
      get live() { return live; },
    };
  }

  // ---- derived tables (the P0 derivation map, executable) ------------------------------------------------------------------
  function derived() {
    const EL_COL = {}, ECHO = {}, EC = {}, STAT = {}, ICON = {};
    for (const el of ORDER) {
      const R = rows[el];
      EL_COL[el] = R.textCol;
      if (el !== 'shatter' && el !== 'gloom' && el !== 'slash' && el !== 'pierce') { ECHO[el] = R.vivid; STAT[el + 'Dmg'] = R.textCol; }
      if (!(R.icon in EC) || R.icon === el) EC[R.icon] = R.hudCol;
      if (R.icon !== el) ICON[el] = R.icon;
    }
    return { EL_COL, ECHO_ELCOL: ECHO, EC, ELC: EC, STAT_COL: STAT, EL_ICON_COL: ICON };
  }

  // 1x luminance helper (WCAG relative luminance, linear) for the "core is the only step above 0.9" rule
  const lum = hex => { const c = hexToRgb(hex).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

  return {
    TILE, GREY, DISSOLVE, rows, HERO_ELS, ORDER, MODELS, FX_FRAMES, EFFECTS,
    hash, pos, spawn, draw, sheet, tint, tintLevels, bake,
    get tintMode() { return TINT_MODE; }, stats, makePool, derived, lum, packFrames,
    fxSheet, fxDraw, fxDuration, greyOf: id => greyCanvas(id.indexOf('fx.') === 0 ? fxGrey(id.slice(3)) : elGrey(id)),
    greySheet: id => (id.indexOf('fx.') === 0 ? fxGrey(id.slice(3)) : elGrey(id)),
    get baked() { return baked; },
  };
})();
