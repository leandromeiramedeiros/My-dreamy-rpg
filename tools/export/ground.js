'use strict';
// tools/export/ground.js -- TILEABLE port of the ground grammar of js/maps.js (groundBase / topColor / rasterColumn / the
// island skirt of rasterRect), for the Godot tile export (tools/export/tiles.js). The engine paints per pixel from WORLD
// position; a tile that must sit next to any other tile cannot. What changes (and nothing else):
//   * every noise field is evaluated in TILE-LOCAL coordinates and made periodic with period 1 tile (a bilinear blend of four
//     shifted copies of the engine's own field), so the pixels on a tile edge are the same for every tile of the terrain;
//   * transition tongues: 3 scallops per tile edge (engine 2.5) and a scallop hash keyed by the edge's direction (engine: world
//     position), so two same-terrain tiles agree where they meet;
//   * cobbles 3 cells per tile (engine 3.2), flagstones 2 bricks per tile with the brick hash modulo the period;
//   * the 4 plain variants are the engine's micro-variants (2-3 decorative pixels: blades, flowers, pebbles), interior only;
//   * the slow 7-tile brightness field of the grass (NF_GRASS's second octave) is pinned to its mean: it cannot tile (Godot:
//     a CanvasModulate / shader noise, PORTING.md); rune rings (map centre) are not in the 'r' tile; height fog is off.
// Same ramps (THEMES), same rampQ dither phase (cells start on even pixels), same lip / AO / wedge / strata / skirt rules.
// Coordinates: a 32 x 16 diamond, top vertex at cell pixel (16, 0); (fx, fy) = tile-local map coords in [0, 1).
module.exports = function makeGround(E, themeId) {
  const th = E.THEMES[themeId], { rampQ, rampH, hash2, vnoise, fbm, mixRgb, mulRgb, hexToRgb, toWorld, TPRI, N8, ZS, SLAB } = E;
  const ZSEED = th.seed | 0, X0 = 5 + ZSEED * 0.731, Y0 = 3 + ZSEED * 0.417, SC = 3;
  const frac = v => v - Math.floor(v), mod = (a, n) => ((a % n) + n) % n;
  // periodic (1 tile) version of a world field fn(x, y): blend of the four copies shifted by 0 / -1 tile on each axis
  const per = fn => (x, y) => {
    x = frac(x); y = frac(y);
    return fn(X0 + x, Y0 + y) * (1 - x) * (1 - y) + fn(X0 + x - 1, Y0 + y) * x * (1 - y) + fn(X0 + x, Y0 + y - 1) * (1 - x) * y + fn(X0 + x - 1, Y0 + y - 1) * x * y;
  };
  // truly periodic value noise (util.js fbm's own period argument): lattice 2 per tile, wrapped
  const pf = (x, y, oct, s) => fbm(frac(x) * 2, frac(y) * 2, oct, s + ZSEED * 7, 2);
  // grass: the engine's slow 7-tile patches cannot tile, so the level sits on a solid ramp step (0.5 = step 3, no dither band)
  // with the periodic texture on top, plus a per-variant interior term that is 0 on the tile edges (the 4 fills differ inside)
  const win = (x, y) => Math.sin(Math.PI * frac(x)) * Math.sin(Math.PI * frac(y));
  let VR = 0;
  const GR = (x, y) => 0.46 + (pf(x, y, 3, 1) - 0.5) * 0.24 + (fbm(frac(x) * 3, frac(y) * 3, 2, 300 + VR * 13 + ZSEED) - 0.5) * 0.3 * win(x, y);
  const MD = (x, y) => pf(x, y, 3, 61) - 0.5, CK = (x, y) => pf(x, y, 3, 28), MS = (x, y) => pf(x, y, 2, 29) + 0.04;
  const W1 = (x, y) => fbm(frac(x) * 2, frac(y) * 4, 2, 21 + ZSEED, 2), W2 = (x, y) => fbm(frac(x) * 2, frac(y) * 6, 2, 23 + ZSEED, 2);
  // the variant's decorative pixels (engine tileDeco: 2-3 of them, in the diamond's interior)
  const decoOf = vr => { const D = { vr, n: 2 + (vr >> 1), x: [], y: [], c: [] }; for (let q = 0; q < 3; q++) { D.x[q] = Math.floor((hash2(vr, ZSEED, 100 + q) - 0.5) * 9); D.y[q] = 6 + Math.floor(hash2(vr, ZSEED, 110 + q) * 4); D.c[q] = hash2(vr, ZSEED, 120 + q); } return D; };
  const DECO = [0, 1, 2, 3].map(decoOf);
  const n8Index = (dx, dy) => N8.findIndex(([a, b]) => a === dx && b === dy);
  // C = { t, nb: [8 types, N8 order], lower: [8 bools] (neighbour lower: lip), vr, frame }
  const localType = (C, fx, fy) => { const ix = Math.floor(fx), iy = Math.floor(fy); if (!ix && !iy) return C.t; if (Math.abs(ix) > 1 || Math.abs(iy) > 1) return null; return C.nb[n8Index(ix, iy)]; };
  function base(C, t, wx, wy, px, py, dc, rx, ry, line, lipped) {
    if (t === 'g' || t === 'f' || t === 'd') {
      let v = GR(wx, wy);
      if (t === 'd') v -= 0.15; else if (t === 'f') v += 0.03;
      if (lipped) return rampH(th.grass, v + 0.22);
      if (line) v -= 0.17;
      for (let q = 0; q < dc.n; q++) if (rx === dc.x[q] || (t === 'f' && rx === dc.x[q] + 1)) {
        const dy = ry - dc.y[q];
        if (t === 'f' && dy === 0) return hexToRgb(th.flowers[(dc.c[q] * th.flowers.length) | 0]);
        if (dy === 0 && rx === dc.x[q]) return rampH(th.grass, v + 0.2);
        if (dy === 1 && rx === dc.x[q]) return rampH(th.grass, v - 0.12);
      }
      return rampQ(th.grass, v, px, py);
    }
    if (t === 'p' && th.dirtPath) {
      const v = 0.42 + MD(wx, wy) * 0.5 - (line ? 0.17 : 0) + (lipped ? 0.22 : 0);
      for (let q = 0; q < dc.n; q++) if (ry === dc.y[q] && (rx === dc.x[q] || rx === dc.x[q] + 1)) return dc.c[q] < 0.5 ? rampH(th.stone, 0.62 + (rx - dc.x[q]) * 0.12) : rampH(th.grass, 0.4);
      return lipped ? rampH(th.path, v) : rampQ(th.path, v, px, py);
    }
    if (t === 'p') {   // cobbles: a Voronoi of SC x SC cells per tile, periodic
      const dS = 0.5 - (px & 1), X = frac(wx + dS / 32) * SC, Y = frac(wy - dS / 32) * SC, gx = Math.floor(X), gy = Math.floor(Y);
      let f1 = 9, f2 = 9, fx = 0, fy = 0, cid = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = mod(gx + dx, SC), b = mod(gy + dy, SC), hx = hash2(a, b, 11 + ZSEED * 3), cx = gx + dx + hx, cy = gy + dy + hash2(a, b, 12 + ZSEED * 3);
        const d = (X - cx) * (X - cx) + (Y - cy) * (Y - cy);
        if (d < f1) { f2 = f1; f1 = d; fx = X - cx; fy = Y - cy; cid = hx; } else if (d < f2) f2 = d;
      }
      if (Math.sqrt(f2) - Math.sqrt(f1) < 0.13) return hash2(mod(gx, SC), mod(gy, SC), 14) > 0.6 ? th.grass[2] : th.gap;
      const v = 0.35 + cid * 0.35 + (fx * 0.6 + fy * 0.7) * -0.55 - (line ? 0.17 : 0) + (lipped ? 0.2 : 0);
      return rampQ(th.path, v, px, py);
    }
    if (t === 'w') {
      let depth = 0;
      for (const r of [0.3, 0.6]) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const u = localType(C, wx + dx, wy + dy); if (u === 'w' || u === 'b') depth++; }
      const ph = (C.frame || 0) / 4;   // the 4 water frames: the periodic fields scrolled a quarter tile along map x per frame
      let v = 0.74 - depth * 0.07 + (W1(wx + ph, wy) - 0.5) * 0.3;
      if (W2(wx - ph, wy) * (0.55 + 0.45 * win(wx, wy)) + (hash2(VR, 3, 31) - 0.5) * 0.12 * win(wx, wy) > 0.66) v += 0.25;   // glints: fewer near edges, per variant
      if (line) return rampH(th.water, 0.86);
      return mulRgb(rampQ(th.water, v, px, py), 0.92);
    }
    if (t === 'b') {
      const fr = frac(wy), pl = frac(wx) * 5;
      if (fr < 0.1 || fr > 0.9) return th.wood[0];
      if ((pl % 1) < 0.14) return th.wood[1];
      return rampQ(th.wood, 0.5 + hash2(Math.floor(pl), 0, 24) * 0.35 + (fr - 0.5) * -0.3, px, py);
    }
    if (t === 's') {
      const v = 0.55 + MD(wx, wy) * 0.4 - (frac(wy) < 0.08 ? 0.3 : 0) - (line ? 0.17 : 0) + (lipped ? 0.2 : 0);
      return rampQ(th.stone, v, px, py);
    }
    if (t === 'x' || t === 'r') {
      const dS = 0.5 - (px & 1), qx = wx + dS / 32, qy = wy - dS / 32;
      const row = Math.floor(qy * 2), X = qx * 2 + mod(row, 2) * 0.5;
      const gx = Math.floor(X), fx = X - gx, fy = qy * 2 - row;
      if (fx < 0.06 || fy < 0.09) return th.gap;
      let v = 0.3 + hash2(mod(gx, 2), mod(row, 2), 26 + ZSEED) * 0.3 + (0.5 - fy) * 0.25 + MD(wx, wy) * 0.4 - (line ? 0.17 : 0) + (lipped ? 0.2 : 0);
      if (Math.abs(CK(qx, qy) - 0.5) < 0.016) return th.gap;
      if (t === 'r') v -= 0.1;
      if (MS(wx, wy) > 0.6) return rampQ(th.grass, v + 0.1, px, py);
      return rampQ(th.stone, v, px, py);
    }
    return [255, 0, 255];
  }
  // one top-surface pixel (engine topColor): (fx, fy) tile-local, (px, py) cell pixel (dither phase), (SX, SY) its point on
  // the tile's plane in cell space (top vertex at (0, 0))
  function top(C, fx, fy, px, py, SX, SY) {
    let tt = C.t, line = 0;
    const pr = TPRI[C.t] || 0;
    const src = C.nb.map(u => pr > 1 && u && TPRI[u] && TPRI[u] < pr);   // tongue sources (same level)
    if (src.some(Boolean) && (fx < 0.4 || fx > 0.6 || fy < 0.4 || fy > 0.6)) {
      const [qx, qy] = toWorld(SX - (px & 1) + 0.5, SY), gx = qx, gy = qy;
      let best = 9, bu = null;
      for (let k = 0; k < 8; k++) {
        if (!src[k]) continue;
        const dx = N8[k][0], dy = N8[k][1], u = C.nb[k];
        let d, s;
        if (dy === 0) { d = dx < 0 ? gx : 1 - gx; s = gy; }
        else if (dx === 0) { d = dy < 0 ? gy : 1 - gy; s = gx; }
        else { const ax = dx < 0 ? gx : 1 - gx, ay = dy < 0 ? gy : 1 - gy; if (ax > 0.45 || ay > 0.45) continue; d = Math.sqrt(ax * ax + ay * ay); s = gx + gy; }
        if (d > 0.45) continue;
        const S = s * SC, L = Math.floor(S), f = S - L, bump = 1 - (2 * f - 1) * (2 * f - 1);
        const tongue = 0.08 + (0.12 + 0.1 * hash2(mod(L, SC), k, 94 + ZSEED)) * Math.sqrt(bump);
        if (d - tongue < best) { best = d - tongue; bu = u; }
      }
      if (bu) { if (best < 0) tt = bu; else if (best < 0.075) line = 1; }
    }
    let lip = 0;
    if (C.lower && C.lower.some(Boolean) && C.t !== 'w' && (fx < 0.13 || fy < 0.13 || fx > 0.87 || fy > 0.87)) {
      for (const dir of [1, -1]) for (let k = 1; k <= 2; k++) {
        const [nx, ny] = toWorld(SX, SY + dir * k), ix = Math.floor(nx), iy = Math.floor(ny);
        if (!ix && !iy) continue;
        if (Math.abs(ix) <= 1 && Math.abs(iy) <= 1 && C.lower[n8Index(ix, iy)]) lip = 1;
        break;
      }
    }
    const rx = Math.floor((fx - fy) * 16), ry = Math.floor((fx + fy) * 8);
    VR = C.vr || 0;
    return base(C, tt, fx, fy, px, py, DECO[VR], rx, ry, line, lip);
  }
  // a 32 x 16 diamond cell into img at (ox, oy) (ox even): the tile's top surface
  function topCell(img, ox, oy, C) {
    for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 32; cx++) {
      const SX = cx - 16 + 0.5, SY = cy + 0.5, [fx, fy] = toWorld(SX, SY);
      if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) continue;
      img.set(ox + cx, oy + cy, top(C, fx, fy, cx, cy, SX, SY));
    }
  }
  const inDiamond = (cx, cy) => { const [fx, fy] = toWorld(cx - 16 + 0.5, cy + 0.5); return fx >= 0 && fy >= 0 && fx < 1 && fy < 1; };

  // ---- cliffs: one column of h levels (engine rasterColumn). Cell 32 x CH, footprint (z = 0) diamond top vertex at row FOOT,
  // the column's top vertex at FOOT - 6h. o = { t (top type), h, faceL, faceR (front neighbours lower: face visible down to
  // z = 0), backL, backR (back neighbours lower: the 1 px dark rim + lip), vr }
  const CH = 36, FOOT = 20;
  function columnCell(img, ox, oy, o) {
    const { t, h } = o, hz = h * ZS, stone = t === 's' || t === 'x' || t === 'r', faceRamp = stone ? th.stone : th.earth;
    const lower = [o.backL, o.faceR, o.backR, o.faceL, o.backL && o.backR, o.faceR && o.backR, o.faceL && o.backL, o.faceL && o.faceR];
    const nb = Array(8).fill(t), C = { t, nb, lower, vr: o.vr || 0 }, rimC = mixRgb(th.under[0], th.haze, 0.1);
    const y0 = oy + FOOT - hz, visL = o.faceL ? hz : 0, visR = o.faceR ? hz : 0;
    const face0 = new Int16Array(32);
    for (let cx = 0; cx < 32; cx++) { let last = -1; for (let cy = 0; cy < 17; cy++) if (inDiamond(cx, cy)) last = cy; face0[cx] = last + 1; }
    for (let cy = -2; cy < 17 + hz; cy++) for (let cx = 0; cx < 32; cx++) {
      const SX = cx - 16 + 0.5, SY = cy + 0.5;
      if (cy >= 0 && cy < 16 && inDiamond(cx, cy)) { const [fx, fy] = toWorld(SX, SY); img.set(ox + cx, y0 + cy, top(C, fx, fy, cx, cy, SX, SY)); continue; }
      if (cy < 9) {
        let on = false;
        for (let k = -1; k <= 1 && !on; k++) on = inDiamond(cx + k, cy + 1);
        if (on && !inDiamond(cx, cy) && (cx < 16 ? o.backL : o.backR)) img.set(ox + cx, y0 + cy, rimC);
        continue;
      }
      let tp, lit, u, vd;
      if (cx < 16) { tp = 8 + (cx + 0.5) * 0.5; lit = 1; u = cx / 16; vd = visL; } else { tp = 16 - (cx - 15.5) * 0.5; lit = 0.66; u = (cx - 16) / 16; vd = visR; }
      if (cy < face0[cx]) continue;
      const d = Math.max(0, cy - tp);
      if (d >= hz || d >= vd + 1 || !vd) continue;
      const di = cy - face0[cx];
      let c;
      if (di === 0) c = E.isGrassy(t) ? rampH(th.grass, 0.62) : rampH(faceRamp, 0.72);
      else if (di === 1) c = faceRamp[0];
      else {
        const off = Math.floor(vnoise(u * 2, 1.5, 43 + ZSEED, 2) * 2.99), dd = di + off, lv = Math.floor(dd / ZS), r = dd - lv * ZS;
        let v = (0.66 - d / Math.max(hz, 12) * 0.3 + (vnoise(u * 8, d * 0.35, 42 + ZSEED, 8) - 0.5) * 0.16) * lit;
        if (lv % 4 === 3) { if (r === 3) v += 0.2; else if (r >= 4) v -= 0.24; }
        else if (r < 2) v += 0.1; else if (r === 5) v -= 0.22;
        c = rampQ(faceRamp, v, cx, cy);
        if (E.isGrassy(t) && cx < 16 && hash2(cx, o.vr || 0, 45 + ZSEED) > 0.86 && d < 4 + hash2(cx, o.vr || 0, 46) * hz * 0.8) c = th.grass[2 + (di % 2)];
      }
      const foot = Math.min(vd, hz) - d;
      if (foot < 3 && di > 1) c = mulRgb(c, 0.65 + 0.1 * Math.floor(foot));
      img.set(ox + cx, y0 + cy, c);
    }
  }
  // the ground at a column's foot (engine topColor (d)): AO where the N / W / NW neighbour is higher, the wedge shadow of a
  // column dh levels higher N of this tile; as a black overlay (alpha = 1 - the engine's multiplier), footprint diamond only
  function shadowCell(img, ox, oy, o) {
    for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 32; cx++) {
      if (!inDiamond(cx, cy)) continue;
      const [fx, fy] = toWorld(cx - 16 + 0.5, cy + 0.5);
      let mul = 1;
      if (fx < 0.3 || fy < 0.3) {
        let d = 9;
        if (o.n) d = fy;
        if (o.w && fx < d) d = fx;
        if (d > 0.28 && o.nw) d = Math.min(d, Math.sqrt(fx * fx + fy * fy));
        if (d < 0.28) mul = 0.8 + 0.2 * d / 0.28;
      }
      if (o.dh && fy < 0.2 * o.dh * (0.4 + 0.6 * fx)) mul *= 0.75;
      if (mul < 1) img.set(ox + cx, oy + FOOT + cy, [0, 0, 0], Math.round((1 - mul) * 255));
    }
  }
  // ---- coast: the island's front skirt under a ground tile's SW (left) and / or SE (right) edge (engine rasterRect front
  // edge: 18 px slab = overhang lip, dark underline, strata, AO; then rock lobes fading out, hanging roots), or the 1 px dark
  // rim over a NW / NE back edge that meets the sky. Cell 32 x KH, the ground diamond's top vertex at row 2. The skirt length
  // is island-global in the engine (longest under the island's middle); here it is the row's fraction s of theme.underDepth.
  const KH0 = 2 + 16 + SLAB + Math.ceil(th.underDepth * 0.9) + 2, KH = KH0 + (KH0 & 1);   // even: Godot texture_origin = 2 + 8 - KH / 2 is a whole number
  function coastCell(img, ox, oy, o) {
    const T = oy + 2, rimC = mixRgb(th.under[0], th.haze, 0.1), stone = o.t === 's' || o.t === 'x', rock = stone ? th.stone : th.earth;
    // the lit 2 px lip on the top's front edges (engine (d) lip; grass top)
    const C = { t: o.t || 'g', nb: Array(8).fill(o.t || 'g'), lower: [false, !!o.R, false, !!o.L, false, false, false, !!(o.L || o.R)], vr: 0 };
    if (o.L || o.R) for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 32; cx++) {
      if (!inDiamond(cx, cy)) continue;
      const SX = cx - 16 + 0.5, SY = cy + 0.5, [fx, fy] = toWorld(SX, SY);
      if (!(fx > 0.87 || fy > 0.87)) continue;
      const c = top(C, fx, fy, cx, cy, SX, SY), plain = top(Object.assign({}, C, { lower: Array(8).fill(false) }), fx, fy, cx, cy, SX, SY);
      if (c[0] !== plain[0] || c[1] !== plain[1] || c[2] !== plain[2]) img.set(ox + cx, T + cy, c);
    }
    for (let cx = 0; cx < 32; cx++) {
      let e = -1, t0 = -1; for (let cy = 0; cy < 16; cy++) if (inDiamond(cx, cy)) { e = cy; if (t0 < 0) t0 = cy; }
      // the skirt hangs from the lowest land pixel of each screen column: SW edge = columns 1..16 (left vertex to bottom vertex),
      // SE edge = 16..31 (column 31 = the next tile's last row, 7); columns 0 / 31 hold no pixel of this diamond
      if (!o.rim && cx === 31) e = 7;
      if (e < 0) continue;
      if (o.rim) {   // back edges meeting the sky: 1 px over the top row, widened to the neighbour columns' top rows (engine rimTop)
        if (!((o.NW && cx <= 16) || (o.NE && cx >= 16))) continue;
        const nt = [cx - 1, cx + 1].map(x => { for (let cy = 0; cy < 16; cy++) if (x >= 0 && x < 32 && inDiamond(x, cy)) return cy; return 99; });
        for (let cy = Math.max(t0 - 2, Math.min(t0, ...nt) - 1); cy < t0; cy++) img.set(ox + cx, T + cy, rimC);
        continue;
      }
      if (!((o.L && cx >= 1 && cx <= 16) || (o.R && cx >= 16))) continue;
      const onL = o.L && cx <= 16, lit = onL ? 1 : 0.7, u16 = onL ? (cx - 1) / 16 : (cx - 16) / 16;
      const sOff = Math.floor(vnoise(u16 * 2, 0.5, 41 + ZSEED, 2) * 3);
      for (let dd = 1; dd <= SLAB; dd++) {
        let c;
        if (dd === 1) c = E.isGrassy(o.t || 'g') ? rampH(th.grass, 0.62) : rampH(rock, 0.7);
        else if (dd === 2) c = rock[0];
        else {
          let v = (0.68 - dd / SLAB * 0.3 + (vnoise(u16 * 4, dd * 0.6, 40 + ZSEED, 4) - 0.5) * 0.18) * lit;
          const r = (dd + sOff) % 8;
          if (r === 0) v += 0.12; else if (r === 1) v -= 0.2;
          if (dd < 6) v -= (6 - dd) * 0.04;
          c = rampQ(rock, v, cx, e + dd);
        }
        img.set(ox + cx, T + e + dd, c);
      }
      // one rock lobe per 16 px edge (u -1..1 across it), its depth from the variant
      const uu = u16 * 2 - 1 + 1 / 16, prof = Math.sqrt(Math.max(0, 1 - uu * uu)), dk = 0.55 + 0.45 * hash2(o.vr, onL ? 1 : 2, 76 + ZSEED);
      // every lobe tapers to the same length B at the edge's ends, so any two skirt lengths meet without a step
      const B = 0.135, L = Math.max(2, Math.round(th.underDepth * 0.9 * (B + (o.s * (0.45 + 0.55 * dk * prof) - B) * prof))), b0 = T + e + SLAB + 1;
      for (let dd = 0; dd < L; dd++) {
        const t = dd / L, y = b0 + dd;
        let v = (0.62 - t * 0.42) * lit - uu * 0.1 - (1 - prof) * 0.14 + (vnoise(u16 * 4, y * 0.05, 79 + ZSEED, 4) - 0.5) * 0.2;
        if (dd < 3) v -= 0.12 * (3 - dd) / 3;
        img.set(ox + cx, y, mixRgb(rampQ(th.under, v, cx, y), th.haze, t * 0.35), t < 0.6 ? 255 : Math.round(255 * (1 - (t - 0.6) / 0.4)));
      }
    }
    // a hanging root strand on some variants (engine rootPixels; 20-40 px from the slab foot), clipped to the cell
    if (!o.rim && o.s > 0.3 && hash2(o.vr, 7, 81 + ZSEED) > 0.4) {
      const side = o.L && o.R ? (hash2(o.vr, 8, 82) > 0.5 ? 0 : 1) : o.L ? 0 : 1, x0 = side ? 18 + Math.floor(hash2(o.vr, 9, 83) * 10) : 3 + Math.floor(hash2(o.vr, 9, 83) * 10);
      let e = -1; for (let cy = 0; cy < 16; cy++) if (inDiamond(x0, cy)) e = cy;
      const rl = Math.round((20 + hash2(o.vr, 10, 82) * 20) * Math.min(1, o.s * 1.4)), base0 = T + e + SLAB - 1;
      const wob = dd => Math.round(Math.sin(dd * 0.22 + x0) * 0.9);
      const put = (x, dd, t, sd) => { if (x < 0 || x >= 32) return; img.set(ox + x, base0 + dd, mixRgb(sd ? mulRgb(th.root, 0.7) : th.root, th.haze, t * 0.45), t < 0.7 ? 255 : Math.round(255 * (1 - (t - 0.7) / 0.3))); };
      for (let dd = 0; dd < rl; dd++) { const x = x0 + wob(dd); put(x, dd, dd / rl, 0); if (dd < rl * 0.45) put(x + 1, dd, dd / rl, 1); }
    }
  }
  return { th, topCell, columnCell, shadowCell, coastCell, CH, FOOT, KH, inDiamond };
};
