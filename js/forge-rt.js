'use strict';
// FORGE runtime: the hero's paper doll, composed in the game from the forge's baked banks (tools/forge; M4a). The engine
// block below is tools/forge/forge.js's resolve + compose, copied in by `node tools/forge/build.js chibi`, so a frame
// here equals the offline render byte for byte (tools/forge-rt-check.js).
//   rig     'chibi' (the hero rig; default)
//   loadout [pieceId | { id, tier?, pal? }], e.g. ['sword.t1', 'knighthelm.t2']  (piece ids: tools/forge/models/chibi-*.js)
//   anim    a logical anim: idle | walk | attack | cast | dash | hit ('attack' plays the HAND weapon class's attack)
//   dir     'S' | 'SE' | 'E' | 'NE' | 'N' | 'NW' | 'W' | 'SW';  f = frame index;  (ax, ay) = the frame pixel under the feet
// FORGE.ready(rig?, loadout?)               -> Promise: the loadout's banks are loaded and decoded (the rig's body + hair
//                                              .core + .atk.<hand class>, each piece's .core + .atk.<hand class>)
// FORGE.sheet(rig, loadout)                 -> entry { state: 'loading' | 'composing' | 'ready', promise, canvas, ms }: the
//                                              whole loadout sheet (rows = dirs, cols = every frame of every anim), composed
//                                              once per loadout, time-sliced over 3 animation frames, cached (last 6)
// FORGE.frame(rig, loadout, anim, dir, f)   -> { canvas, sx, sy, w, h, ax, ay } from the ready sheet: drawImage(canvas, sx,
//                                              sy, w, h, x - ax, y - ay, w, h); null while it composes (the call starts it)
// FORGE.compose(rig, loadout, anim, dir, f) -> { canvas, w, h, ax, ay } one frame now; null until ready() resolved
// FORGE.doll(rig, loadout, dir)             -> { canvas, layout, at, w, h, ax, ay, ms } one direction, every column (the bag)
// FORGE.sockets(rig, loadout, anim, dir, f) -> { name: { x, y, d, front } } frame px, d = depth vs the root (front = nearer
//                                              the camera): the rig's (handR, handL, head, chest, cast ...) + each piece's own
// FORGE.rim(rig, loadout, anim, dir, f)     -> { w, h, ax, ay, mask, face } the outer edge for rim light: mask[i] = 1 on a
//                                              drawn pixel with the outside (outline or empty) among its 8 neighbours;
//                                              face[i] = the octant of its outward normal (0 E, 1 NE, 2 N, 3 NW, 4 W, 5 SW,
//                                              6 S, 7 SE; 8 none)
// FORGE.rgba(rig, loadout, anim, dir, f)    -> the frame's RGBA (Uint8ClampedArray, w x h; tests)
// Banks: js/forge-bank/<line>.js (FORGE_BANK.<line>), inserted as <script> on first use: <rig>.js (body, hair, which file
// holds each piece), then one file per piece tier (sword.t1.js holds sword.t1; Mythic = t6), so a drop loads only its
// tier. A sheet is decoded on first need.
const FORGE = (function () {
  // <engine> generated: the <rt> blocks of tools/forge/forge.js (build.js copies them; do not edit here)
  // ---- vectors / rotations -------------------------------------------------------------------------------------
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.sqrt(dot(a, a));
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mm = (A, B) => { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; };
  const mv = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
  const mtv = (M, v) => [M[0] * v[0] + M[3] * v[1] + M[6] * v[2], M[1] * v[0] + M[4] * v[1] + M[7] * v[2], M[2] * v[0] + M[5] * v[1] + M[8] * v[2]];
  const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const rot = r => r ? mm(ry(r[1] || 0), mm(rx(r[0] || 0), rz(r[2] || 0))) : ID;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function look(dir, hint) {                                    // rotation whose +y runs along dir, +z towards hint
    const Y = norm(dir);
    let Z0 = hint ? norm(hint) : [0, 0, 1];
    if (Math.abs(dot(Y, Z0)) > 0.97) Z0 = Math.abs(Y[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
    const X = norm(cross(Y, Z0)), Z = cross(X, Y);
    return [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]];
  }

  // ---- colour: hue-shifted ramps -------------------------------------------------------------------------------
  const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  function rgbHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslRgb([h, s, l]) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  const toward = (h, target, deg) => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), deg); };
  // shadows lean cool (towards violet 255deg), highlights lean warm (towards gold 50deg): the classic pixel-art ramp
  function ramp(hex) {
    const [h, s, l] = rgbHsl(hexRgb(hex));
    return [
      rgbHex(hslRgb([toward(h, 255, 22), clamp(s * 1.05, 0, 1), l * 0.52])),
      rgbHex(hslRgb([toward(h, 255, 10), clamp(s * 1.02, 0, 1), l * 0.76])),
      hex,
      rgbHex(hslRgb([toward(h, 50, 12), clamp(s * 0.92, 0, 1), Math.min(l * 1.45, l + (1 - l) * 0.38)])),
    ];
  }
  const toRamp = m => typeof m === 'string' ? ramp(m) : Array.isArray(m) ? m : toRamp(m.ramp);
  // ---- stage B: resolve a stack of G-buffers ---------------------------------------------------------------------
  // The stack is gathered into per-pixel winners (nearest layer wins; a later layer wins a tie), then cleaned up inside
  // the covered bounding box only. All scratch arrays are reused (no allocation per frame: the runtime composes a whole
  // loadout sheet in one go). Every pass keeps the exact semantics of a full-frame pass: a pass that reads what it writes
  // in the same scan collects its changes and applies them after the scan; the in-place passes stay in scan order.
  const QS = 6;                                                 // depth in 1/6 px steps (stage A quantises with it too)
  const RS = { n: 0 };                                          // scratch, grown on demand
  function rsBegin(w, h) {
    const N = w * h;
    if (RS.n < N) {
      RS.n = N; RS.M = new Int32Array(N); RS.K = new Int32Array(N); RS.T = new Uint8Array(N); RS.F = new Uint8Array(N); RS.KP = new Uint8Array(N);
      RS.Z = new Int16Array(N); RS.SEAM = new Uint8Array(N); RS.SM = new Uint8Array(N); RS.OL = new Uint8Array(N); RS.C = new Int32Array(N);
      RS.got = new Uint8Array(N); RS.CH = new Int32Array(N * 4); RS.DY = new Uint8Array(N); RS.WL = new Int32Array(N);
      RS.CL = new Int32Array(N); RS.DLB = new Int32Array(N); RS.OLL = new Int32Array(N); RS.XOF = new Int32Array(N); RS.YOF = new Int32Array(N); RS.OM = new Uint8Array(N); RS.SRC = new Int32Array(N); RS.xw = 0;
    }
    if (RS.xw !== w) { for (let i = 0; i < N; i++) { RS.XOF[i] = i % w; RS.YOF[i] = (i / w) | 0; } RS.xw = w; }   // x, y of every index
    RS.M.fill(-1, 0, N); RS.Z.fill(-1, 0, N); RS.F.fill(0, 0, N); RS.KP.fill(0, 0, N); RS.SEAM.fill(0, 0, N); RS.SM.fill(0, 0, N); RS.OL.fill(0, 0, N);
    RS.w = w; RS.h = h; RS.x0 = w; RS.y0 = h; RS.x1 = -1; RS.y1 = -1; RS.nc = -1;
    return RS;
  }
  const rgbKey = c => (c[0] << 16) | (c[1] << 8) | c[2];
  // the colour key of every (layer, material, tone): PK[(layer * 256 + material) * 8 + tone]
  function palKeys(pals) {
    const PK = new Int32Array(Math.max(1, pals.length) * 2048);
    pals.forEach((pal, l) => pal.forEach((tones, m) => tones.forEach((c, t) => { if (t < 8) PK[(l * 256 + m) * 8 + t] = rgbKey(c); })));
    return PK;
  }
  // list: [{ g, pal: per material 4 rgb, keys: per part an int (same group + part name = same key) }]  (full-frame G-buffers)
  function resolve(list, w, h, opt) {
    const S = rsBegin(w, h), N = w * h, { M, K, T, F, KP, Z } = S;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let l = 0; l < list.length; l++) {
      const g = list[l].g, keys = list[l].keys, base = l * 256;
      for (let i = 0; i < N; i++) {
        if (!g.cov[i] || g.dq[i] < Z[i]) continue;
        M[i] = base + g.mat[i]; K[i] = keys[g.part[i]]; T[i] = g.tone[i]; F[i] = g.flat[i]; KP[i] = g.keep[i]; Z[i] = g.dq[i];
        const x = i % w, y = (i - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    S.x0 = x0; S.y0 = y0; S.x1 = x1; S.y1 = y1;
    resolveCore(S, opt, palKeys(list.map(e => e.pal)));
    const rgba = new Uint8ClampedArray(N * 4);
    resolveOut(S, rgba, w, 0, 0);
    return rgba;
  }
  // a repeated pass revisits only DIRTY pixels: one whose own value or a 4-neighbour's changed since its last visit (its
  // inputs are unchanged otherwise, so it would decide the same: no change). Pass 0 visits (and cleans) the whole box.
  function dirty(DY, i, w, h) {
    const x = i % w; DY[i] = 1;
    if (x + 1 < w) DY[i + 1] = 1; if (x > 0) DY[i - 1] = 1; if (i + w < w * h) DY[i + w] = 1; if (i >= w) DY[i - w] = 1;
  }
  // the most frequent of n values in NB (a tie takes the smaller value): the 'commonest neighbour' of every cleanup pass
  const NB = new Int32Array(4);
  function commonest(n) {
    let bv = 0, bc = 0;
    for (let p = 0; p < n; p++) {
      const v = NB[p]; let c = 0; for (let q = 0; q < n; q++) if (NB[q] === v) c++;
      if (c > bc || (c === bc && v < bv)) { bc = c; bv = v; }
    }
    return bv;
  }
  // every pass works on the covered pixels CL[0 .. nc) in scan order (composeInto lists them as it gathers), not the box
  function resolveCore(S, opt, PK) {
    const { w, M, CL } = S, px = opt.pixel, smear = !!(opt.smears && opt.smears.length);
    S.dl = CL; S.nd = 0; S.no = 0;
    if (S.x1 < 0 && !smear) return;
    let nc = S.nc;
    if (nc < 0) { nc = 0; for (let y = S.y0; y <= S.y1; y++) for (let i = y * w + S.x0, e = y * w + S.x1; i <= e; i++) if (M[i] >= 0) CL[nc++] = i; }
    if (px) nc = passSpurs(S, nc);
    if (opt.jumpQ) passSeams(S, nc, opt.jumpQ, !!opt.innerColor);
    if (opt.own) passOwn(S, nc, opt.own);
    passLone(S, nc, px ? 2 : 3);
    passOrphans(S, nc, px ? 1 : 2, px ? 8 : 2);
    const { C, SEAM, T } = S, seamC = opt.innerColor ? rgbKey(opt.innerColor) : 0, olC = opt.outline ? rgbKey(opt.outline) : 0;
    for (let k = 0; k < nc; k++) { const i = CL[k]; C[i] = SEAM[i] ? (SEAM[i] === 2 ? olC : seamC) : PK[M[i] * 8 + T[i]]; }
    S.dl = CL; S.nd = nc;
    if (smear) passSmears(S, opt.smears);
    if (px) passClusters(S);
    if (opt.outline) passOutline(S, nc, rgbKey(opt.outline));
  }
  // pixel pass 1 (opt-in, model.pixel): 1 px spurs off the silhouette go (a pixel with at most one covered 4-neighbour;
  // flat and fine material pixels stay: KP); returns the new count of covered pixels
  function passSpurs(S, nc) {
    const { w, h, M, F, KP, CH, DY, XOF, CL } = S, N = w * h;
    for (let pass = 0; pass < 2; pass++) {
      let nk = 0;
      for (let k = 0; k < nc; k++) {
        const i = CL[k]; if (pass && !DY[i]) continue; DY[i] = 0;
        if (M[i] < 0 || F[i] || KP[i]) continue;
        const x = XOF[i]; let n = 0;
        if (x + 1 < w && M[i + 1] >= 0) n++; if (x > 0 && M[i - 1] >= 0) n++;
        if (i + w < N && M[i + w] >= 0) n++; if (i >= w && M[i - w] >= 0) n++;
        if (n <= 1) CH[nk++] = i;
      }
      for (let k = 0; k < nk; k++) { M[CH[k]] = -1; dirty(DY, CH[k], w, h); }
    }
    let n = 0; for (let k = 0; k < nc; k++) if (M[CL[k]] >= 0) CL[n++] = CL[k];
    return n;
  }
  // dark line on the far side of a depth jump between two parts (an arm in front of the torso reads as separate);
  // with innerColor it is drawn in that colour (the reference's navy seams), else in the part's own shadow tone
  function passSeams(S, nc, jq, ic) {
    const { w, h, M, K, T, F, Z, SEAM, XOF, CL } = S, N = w * h;
    for (let k = 0; k < nc; k++) {
      const i = CL[k]; if (F[i]) continue;
      const x = XOF[i], kk = K[i], z = Z[i] + jq;
      if ((x + 1 < w && M[i + 1] >= 0 && K[i + 1] !== kk && Z[i + 1] > z) || (x > 0 && M[i - 1] >= 0 && K[i - 1] !== kk && Z[i - 1] > z) ||
        (i + w < N && M[i + w] >= 0 && K[i + w] !== kk && Z[i + w] > z) || (i >= w && M[i - w] >= 0 && K[i - w] !== kk && Z[i - w] > z)) { if (ic) SEAM[i] = 1; else T[i] = 0; }
    }
  }
  // own outline: a covered pixel with a NEARER 4-neighbour of another unit that draws its own outline (OWN[layer] = unit
  // << 1 | own) takes the outline colour (SEAM 2: no tone, out of the orphan and cluster passes), whatever the depth jump.
  // Reads M / Z only and writes SEAM only, so in place
  function passOwn(S, nc, OWN) {
    const { w, h, M, Z, SEAM, XOF, CL } = S, N = w * h;
    for (let k = 0; k < nc; k++) {
      const j = CL[k], u = OWN[M[j] >> 8] >> 1, z = Z[j], x = XOF[j]; let i, o;
      if ((x + 1 < w && (i = j + 1, M[i] >= 0) && ((o = OWN[M[i] >> 8]) & 1) && (o >> 1) !== u && Z[i] > z) ||
        (x > 0 && (i = j - 1, M[i] >= 0) && ((o = OWN[M[i] >> 8]) & 1) && (o >> 1) !== u && Z[i] > z) ||
        (j + w < N && (i = j + w, M[i] >= 0) && ((o = OWN[M[i] >> 8]) & 1) && (o >> 1) !== u && Z[i] > z) ||
        (j >= w && (i = j - w, M[i] >= 0) && ((o = OWN[M[i] >> 8]) & 1) && (o >> 1) !== u && Z[i] > z)) SEAM[j] = 2;
    }
    // a dark dot (a line pixel with no other line or outer-outline pixel among its 8 neighbours: a corner touch) goes back
    // to its own colour; collected, then applied
    const { YOF, CH } = S; let nd = 0;
    for (let k = 0; k < nc; k++) {
      const j = CL[k]; if (SEAM[j] !== 2) continue;
      const x = XOF[j], y = YOF[j];
      if (!(lineAt(S, x + 1, y) || lineAt(S, x - 1, y) || lineAt(S, x, y + 1) || lineAt(S, x, y - 1) || lineAt(S, x + 1, y + 1) || lineAt(S, x - 1, y + 1) ||
        lineAt(S, x + 1, y - 1) || lineAt(S, x - 1, y - 1))) CH[nd++] = j;
    }
    for (let k = 0; k < nd; k++) SEAM[CH[k]] = 0;
  }
  // is (xx, yy) part of a line for passOwn's dot test: an own-outline pixel, or an outer-outline pixel (empty, touched by a
  // covered pixel, and not a pinhole: passOutline fills one with no other empty pixel around it)
  function lineAt(S, xx, yy) {
    const { w, h, M, SEAM } = S;
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false;
    const n = yy * w + xx; if (M[n] >= 0) return SEAM[n] === 2;
    if (!((xx + 1 < w && M[n + 1] >= 0) || (xx > 0 && M[n - 1] >= 0) || (yy + 1 < h && M[n + w] >= 0) || (yy > 0 && M[n - w] >= 0))) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const ex = xx + dx, ey = yy + dy; if ((dx || dy) && ex >= 0 && ey >= 0 && ex < w && ey < h && M[ey * w + ex] < 0) return true;
    }
    return false;
  }
  // lone material pixel (one stray hand / belt pixel): it joins the commonest neighbouring material
  function passLone(S, nc, need) {
    const { w, h, M, K, T, F, KP, CH, XOF, CL } = S, N = w * h;
    let nl = 0;
    for (let k = 0; k < nc; k++) {
      const i = CL[k], m = M[i]; if (F[i] || KP[i]) continue;
      const x = XOF[i];
      // the covered 4-neighbours in the fixed order right, left, down, up
      const j0 = x + 1 < w && M[i + 1] >= 0 ? i + 1 : -1, j1 = x > 0 && M[i - 1] >= 0 ? i - 1 : -1;
      const j2 = i + w < N && M[i + w] >= 0 ? i + w : -1, j3 = i >= w && M[i - w] >= 0 ? i - w : -1;
      let n = 0, same = false;
      if (j0 >= 0) { n++; if (M[j0] === m) same = true; } if (j1 >= 0) { n++; if (M[j1] === m) same = true; }
      if (j2 >= 0) { n++; if (M[j2] === m) same = true; } if (j3 >= 0) { n++; if (M[j3] === m) same = true; }
      if (n < need || same) continue;
      // candidates: the non-flat ones; the first (in order) with the highest count of its material wins
      let best = -1, bc = 0;
      for (let q = 0; q < 4; q++) {
        const j = q === 0 ? j0 : q === 1 ? j1 : q === 2 ? j2 : j3; if (j < 0 || F[j]) continue;
        const mj = M[j]; let c = 0;
        if (j0 >= 0 && !F[j0] && M[j0] === mj) c++; if (j1 >= 0 && !F[j1] && M[j1] === mj) c++;
        if (j2 >= 0 && !F[j2] && M[j2] === mj) c++; if (j3 >= 0 && !F[j3] && M[j3] === mj) c++;
        if (c > bc) { bc = c; best = j; }
      }
      if (best < 0) continue;
      CH[nl * 4] = i; CH[nl * 4 + 1] = M[best]; CH[nl * 4 + 2] = K[best]; CH[nl * 4 + 3] = T[best]; nl++;
    }
    for (let k = 0; k < nl; k++) { const i = CH[k * 4]; M[i] = CH[k * 4 + 1]; K[i] = CH[k * 4 + 2]; T[i] = CH[k * 4 + 3]; }
  }
  // orphan cleanup: a lone tone with no same-tone neighbour inside its material takes the commonest neighbour tone
  // (2 passes; the pixel pass iterates to a fixed point and also takes edge pixels with a single same-material neighbour).
  // A pass reads only the tones before it, so after the first scan only the changed pixels and their neighbours are
  // visited (a work list, deduplicated by DY). Materials, flat and seam flags stay fixed here: OM = 16 (the pixel takes
  // part) | which 4-neighbours count (same material, not flat, not a seam: 1 right, 2 left, 4 down, 8 up). A fine material's
  // pixel always gets the default rule (2 same-material neighbours, the first 2 passes): its 1 px tips keep their tone
  function passOrphans(S, nc, need, passes) {
    const { w, h, M, T, F, KP, SEAM, CH, DY, WL, XOF, CL, OM } = S, N = w * h;
    for (let k = 0; k < nc; k++) {
      const i = CL[k], m = M[i]; if (F[i] || SEAM[i]) { OM[i] = 0; continue; }
      const x = XOF[i]; let b = 16, j;
      j = i + 1; if (x + 1 < w && M[j] === m && !F[j] && !SEAM[j]) b |= 1;
      j = i - 1; if (x > 0 && M[j] === m && !F[j] && !SEAM[j]) b |= 2;
      j = i + w; if (j < N && M[j] === m && !F[j] && !SEAM[j]) b |= 4;
      j = i - w; if (j >= 0 && M[j] === m && !F[j] && !SEAM[j]) b |= 8;
      OM[i] = b;
    }
    let nw = 0;
    for (let pass = 0; pass < passes; pass++) {
      const list = pass ? WL : CL, nl = pass ? nw : nc; let nch = 0;
      for (let k = 0; k < nl; k++) {
        const i = list[k]; DY[i] = 0;
        if (M[i] < 0) continue;
        const b = OM[i]; if (!b) continue;
        const t = T[i]; let n = 0, same = false, v;
        if (b & 1) { v = T[i + 1]; NB[n++] = v; if (v === t) same = true; }
        if (b & 2) { v = T[i - 1]; NB[n++] = v; if (v === t) same = true; }
        if (b & 4) { v = T[i + w]; NB[n++] = v; if (v === t) same = true; }
        if (b & 8) { v = T[i - w]; NB[n++] = v; if (v === t) same = true; }
        if (!same && (KP[i] ? n >= 2 && pass < 2 : n >= need)) { CH[nch * 2] = i; CH[nch * 2 + 1] = commonest(n); nch++; }
      }
      nw = 0;
      for (let k = 0; k < nch; k++) {
        const i = CH[k * 2], x = XOF[i]; T[i] = CH[k * 2 + 1];
        if (!DY[i]) { DY[i] = 1; WL[nw++] = i; }
        if (x + 1 < w && !DY[i + 1]) { DY[i + 1] = 1; WL[nw++] = i + 1; }
        if (x > 0 && !DY[i - 1]) { DY[i - 1] = 1; WL[nw++] = i - 1; }
        if (i + w < N && !DY[i + w]) { DY[i + w] = 1; WL[nw++] = i + w; }
        if (i >= w && !DY[i - w]) { DY[i - w] = 1; WL[nw++] = i - w; }
      }
      if (!nch) break;
    }
    for (let k = 0; k < nw; k++) DY[WL[k]] = 0;
  }
  // weapon smears: flat polygons, no outline; behind the body unless the tip is in front of it (before the cluster pass,
  // so a body pixel the smear cuts off is cleaned up too). The drawn list becomes covered + smear, in scan order
  function passSmears(S, smears) {
    const { w, h, M, F, SM, C, got } = S, N = w * h;
    for (const sm of smears) {
      got.fill(0, 0, N);
      fillPoly(sm.poly, w, h, i => { if ((M[i] < 0 && !SM[i]) || (sm.over && !F[i])) got[i] = 1; });
      // a smear pixel with no smear 4-neighbour (a sliver at the thin end) is dropped, to a fixed point
      for (let changed = 1; changed;) {
        changed = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x; if (!got[i]) continue;
          if (!((x + 1 < w && got[i + 1]) || (x > 0 && got[i - 1]) || (y + 1 < h && got[i + w]) || (y > 0 && got[i - w]))) { got[i] = 0; changed = 1; }
        }
      }
      const k = rgbKey(sm.rgb); for (let i = 0; i < N; i++) if (got[i]) { SM[i] = 1; C[i] = k; }
    }
    const DL = S.DLB; let nd = 0; for (let i = 0; i < N; i++) if (M[i] >= 0 || SM[i]) DL[nd++] = i;
    S.dl = DL; S.nd = nd;
  }
  // pixel pass 2: clusters >= 2 px by final colour (what the eye and the lint see): a pixel with no 4-neighbour of its own
  // colour takes the commonest neighbouring colour; flat pixels too (a blade pixel cut off by the arm, half an eye), fine
  // material pixels never (KP).
  // In place, scan order (a lone pair cannot swap forever); a repeat pass revisits only dirty pixels
  function passClusters(S) {
    const { w, h, M, KP, SM, SEAM, C, DY, XOF } = S, N = w * h, DL = S.dl, nd = S.nd;
    for (let pass = 0; pass < 6; pass++) {
      let changed = 0;
      for (let k = 0; k < nd; k++) {
        const i = DL[k]; if (pass && !DY[i]) continue; DY[i] = 0;
        if (KP[i] || (SEAM[i] === 2 && M[i] >= 0)) continue;     // fine pixels, own-outline lines (a 1 px line, like the outline)
        const x = XOF[i], c = C[i]; let n = 0, same = false, j;
        j = i + 1; if (x + 1 < w && (M[j] >= 0 || SM[j])) { if (C[j] === c) same = true; else NB[n++] = C[j]; }
        j = i - 1; if (!same && x > 0 && (M[j] >= 0 || SM[j])) { if (C[j] === c) same = true; else NB[n++] = C[j]; }
        j = i + w; if (!same && j < N && (M[j] >= 0 || SM[j])) { if (C[j] === c) same = true; else NB[n++] = C[j]; }
        j = i - w; if (!same && j >= 0 && (M[j] >= 0 || SM[j])) { if (C[j] === c) same = true; else NB[n++] = C[j]; }
        if (same || !n) continue;
        C[i] = commonest(n); changed++; dirty(DY, i, w, h);
      }
      if (!changed) break;
    }
  }
  // outline: every empty, non-smear pixel with a covered 4-neighbour. A pinhole (an outline pixel with no other outline
  // pixel around it, e.g. one empty pixel between an arm and the blade) takes its commonest covered neighbour's colour
  // instead of a lone dark dot
  function passOutline(S, nc, c) {
    const { w, h, M, SM, OL, C, XOF, CL, OLL } = S, N = w * h;
    let no = 0;
    for (let k = 0; k < nc; k++) {
      const i = CL[k], x = XOF[i]; let j;
      j = i + 1; if (x + 1 < w && M[j] < 0 && !SM[j] && !OL[j]) { OL[j] = 1; C[j] = c; OLL[no++] = j; }
      j = i - 1; if (x > 0 && M[j] < 0 && !SM[j] && !OL[j]) { OL[j] = 1; C[j] = c; OLL[no++] = j; }
      j = i + w; if (j < N && M[j] < 0 && !SM[j] && !OL[j]) { OL[j] = 1; C[j] = c; OLL[no++] = j; }
      j = i - w; if (j >= 0 && M[j] < 0 && !SM[j] && !OL[j]) { OL[j] = 1; C[j] = c; OLL[no++] = j; }
    }
    for (let k = 0; k < no; k++) {
      const i = OLL[k], x = XOF[i], l = x > 0, r = x + 1 < w, u = i >= w, d = i + w < N;
      if ((l && OL[i - 1]) || (r && OL[i + 1]) || (u && (OL[i - w] || (l && OL[i - w - 1]) || (r && OL[i - w + 1]))) ||
        (d && (OL[i + w] || (l && OL[i + w - 1]) || (r && OL[i + w + 1])))) continue;
      let n = 0;
      if (r && M[i + 1] >= 0) NB[n++] = C[i + 1]; if (l && M[i - 1] >= 0) NB[n++] = C[i - 1];
      if (d && M[i + w] >= 0) NB[n++] = C[i + w]; if (u && M[i - w] >= 0) NB[n++] = C[i - w];
      if (n) C[i] = commonest(n);
    }
    S.no = no;
  }
  // the resolved frame into out (RGBA, row stride sw px) at (ox, oy); out is assumed clear where nothing is drawn
  function resolveOut(S, out, sw, ox, oy) {
    const { C, OLL, XOF, YOF } = S, DL = S.dl, b = oy * sw + ox;
    for (let k = 0; k < S.nd; k++) { const i = DL[k], o = (b + YOF[i] * sw + XOF[i]) * 4, c = C[i]; out[o] = c >> 16; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255; }
    for (let k = 0; k < S.no; k++) { const i = OLL[k], o = (b + YOF[i] * sw + XOF[i]) * 4, c = C[i]; out[o] = c >> 16; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255; }
  }
  // the outer edge of the last resolved frame: a drawn pixel (not outline) with an outline or empty pixel among its 8
  // neighbours; face = the octant its outward normal points to (0 E, 1 NE, 2 N, 3 NW, 4 W, 5 SW, 6 S, 7 SE; 8 = none)
  function rimOf(S) {
    const { w, h, M, SM } = S, mask = new Uint8Array(w * h), face = new Uint8Array(w * h).fill(8);
    const body = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (M[y * w + x] >= 0 || SM[y * w + x] === 1);
    for (let k = 0; k < S.nd; k++) {
      const i = S.dl[k], x = i % w, y = (i - x) / w; let nx = 0, ny = 0, edge = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !body(x + dx, y + dy)) { edge = true; nx += dx; ny += dy; }
      if (!edge) continue;
      mask[i] = 1;
      if (nx || ny) face[i] = ((Math.round(Math.atan2(-ny, nx) / (Math.PI / 4)) % 8) + 8) % 8;
    }
    return { w, h, mask, face };
  }

  function fillPoly(P, w, h, set) {                             // even-odd scanline fill, sampled at pixel centres
    for (let y = 0; y < h; y++) {
      const yc = y + 0.5, xs = [];
      for (let k = 0; k < P.length; k++) {
        const a = P[k], b = P[(k + 1) % P.length];
        if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(w - 1, Math.floor(xs[k + 1] - 0.5)); x++) set(y * w + x);
    }
  }
  // the smear of one frame: a wide crescent drawn in SCREEN space around a pivot socket (the sword shoulder by default).
  // The pivot -> tip vector of frames f-1 and f is slerped in camera space (x, y on screen, d = depth: an orthonormal
  // frame, so its length is the unforeshortened reach); only the swept screen ANGLE is taken from that 3D path (atan2,
  // unwrapped), the radius is the full reach. So the crescent is as wide in S / N, where the swing plane is edge-on to
  // the camera, as in E / W (a hand-drawn smear is drawn in the picture plane). Straight segments every 30 deg keep it
  // angular; the band widens from the trailing end to the leading edge.
  //   table = anims[].smear: { <frame>: width 0..1 of the reach, pivot?: socket, reach?: x radius, lead?: deg, tail?: deg }
  function smearPoly(s0, s1, table, width) {
    const pv = table.pivot || 'handR', P = s => [s.x, s.y, s.d || 0];
    if (!s0[pv] || !s1[pv]) return [];
    const p0 = P(s0[pv]), p1 = P(s1[pv]), v0 = sub(P(s0.tip), p0), v1 = sub(P(s1.tip), p1);
    const r0 = len(v0), r1 = len(v1), n0 = norm(v0), n1 = norm(v1), th = Math.acos(clamp(dot(n0, n1), -1, 1));
    const K = Math.max(4, Math.ceil(th / (Math.PI / 36))), ang = [];
    for (let k = 0; k <= K; k++) {                              // the screen angle along the 3D path, unwrapped
      const f = k / K, d = th > 1e-3 && th < Math.PI - 1e-3 ? add(mul(n0, Math.sin((1 - f) * th)), mul(n1, Math.sin(f * th))) : add(mul(n0, 1 - f), mul(n1, f));
      let a = Math.atan2(d[1], d[0]); if (ang.length) { const q = ang[ang.length - 1]; while (a - q > Math.PI) a -= 2 * Math.PI; while (a - q < -Math.PI) a += 2 * Math.PI; }
      ang.push(a);
    }
    const sg = Math.sign(ang[K] - ang[0]) || 1, tail = (table.tail || 0) * Math.PI / 180 * sg, lead = (table.lead || 0) * Math.PI / 180 * sg;
    const A0 = ang[0] - tail, A1 = ang[K] + lead, span = Math.abs(A1 - A0), n = Math.max(2, Math.ceil(span / (Math.PI / 6)));
    const R = (Math.max(r0, r1) + 0.6) * (table.reach || 1), outer = [], inner = [];
    for (let k = 0; k <= n; k++) {
      const f = k / n, a = A0 + (A1 - A0) * f, c = add(mul(p0, 1 - f), mul(p1, f)), ri = R * (1 - width * (0.3 + 0.7 * f));
      outer.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]); inner.push([c[0] + Math.cos(a) * ri, c[1] + Math.sin(a) * ri]);
    }
    return outer.concat(inner.reverse());
  }
  // smears of one frame from the sockets of frames f-1 and f (the same numbers in render() and compose(), so both match)
  function smearsOf(table, f, prev, cur, hex) {
    if (!table || !table[f] || !prev || !cur || !hex || !prev.tip || !cur.tip) return null;
    return [{ poly: smearPoly(prev, cur, table, table[f]), rgb: hexRgb(hex), over: cur.tip.front }];
  }
  const resolveOpts = m => ({ outline: m.outline ? hexRgb(m.outline) : null, jumpQ: Math.round((m.innerLine != null ? m.innerLine : 2.5) * QS),
    innerColor: m.innerColor ? hexRgb(m.innerColor) : null, pixel: m.pixel || null });
  function interner() { const m = new Map(); return s => { if (!m.has(s)) m.set(s, m.size); return m.get(s); }; }
  // own outline: the piece's flag, else the rig's default for its slot
  const ownOf = (defs, flag, slot) => flag != null ? !!flag : !!(defs && slot && defs[slot]);
  // per stack layer: unit << 1 | own (ro.own; left out when no layer draws its own outline, so that path costs nothing)
  function withOwn(ro, layers) {
    if (!ro.outline || !layers.some(L => L.own)) return ro;
    const own = new Int32Array(layers.length); layers.forEach((L, l) => { own[l] = (L.unit << 1) | (L.own ? 1 : 0); });
    return Object.assign({}, ro, { own });
  }
  // ---- compose: stage B over baked sheets (the game's runtime path; equals render() byte for byte) ---------------
  // bank = { model: bankInfo(model), sheets: { <key>: { w, rgba, meta } } }  (rgba decoded from the PNG; a sheet no frame
  // of a loadout reads may stay undecoded). A unit (meta.id: a base group or a piece id) may span several sheets by anim
  // (meta.anims, null = every anim). A bank without info.base (one 'body' sheet) still works.
  // prepare(bank, pieces) -> P, once per loadout: palettes, part keys, hidden tags, the weapon class; composeInto(P, dir,
  // anim, frame, out, sw, ox, oy) resolves one frame into out (RGBA, row stride sw px) at (ox, oy) and returns the real anim.
  function unitsOf(bank) {
    const U = {};
    for (const k in bank.sheets) { const s = bank.sheets[k], id = s.meta.id; (U[id] || (U[id] = { id, meta: s.meta, sheets: [], by: new Map() })).sheets.push(s); }
    return U;
  }
  function sheetFor(u, a) {                                     // the unit's sheet holding anim a (or null)
    let s = u.by.get(a);
    if (s === undefined) { s = u.sheets.find(q => !q.meta.anims || q.meta.anims.includes(a)) || null; u.by.set(a, s); }
    return s;
  }
  // where a layer's cells of anim a are: { sh, base, n } (cell = (layer * dirs + dir) * n + base + frame), or null
  function cellsOf(info, Lr, a) {
    let e = Lr.by.get(a);
    if (e === undefined) {
      const sh = sheetFor(Lr.u, a); e = null;
      if (sh) {
        let n = 0, base = -1;
        for (const [b] of info.layout) if (!sh.meta.anims || sh.meta.anims.includes(b)) { if (b === a && base < 0) base = n; n++; }
        e = { sh, base, n };
      }
      Lr.by.set(a, e);
    }
    return e;
  }
  const pieceRefs = pieces => (pieces || []).map(p => typeof p === 'string' ? { id: p } : p);
  function prepare(bank, pieces) {
    const info = bank.model, U = unitsOf(bank), ps = pieceRefs(pieces);
    for (const p of ps) if (!U[p.id]) throw new Error(`forge: ${p.id} is not in the bank`);
    const wp = ps.map(p => U[p.id].meta).find(m => m.class), hidden = new Set();
    ps.forEach(p => (U[p.id].meta.hides || []).forEach(t => hidden.add(t)));
    const layers = [], pals = [], keys = [], key = interner(), units = [], own = [];
    const add = (u, over, base) => {
      units.push(u);
      const un = base ? 0 : units.length, ow = !base && ownOf(info.ownOutline, u.meta.own, u.meta.slot);
      u.meta.layers.forEach((L, li) => {
        if (base && hidden.has(L.tag)) return;
        layers.push({ u, li, by: new Map() }); own.push({ unit: un, own: ow }); pals.push(L.mats.map((n, i) => (over && over[n] ? toRamp(over[n]) : L.ramps[i]).map(hexRgb)));
        const kk = new Int32Array(16); L.parts.forEach((n, i) => { kk[i] = key(L.group + ':' + n); }); keys.push(kk);
      });
    };
    for (const id of info.base || ['body']) if (U[id]) add(U[id], null, true);
    for (const p of ps) { const m = U[p.id].meta; add(U[p.id], p.tier != null && m.tiers ? m.tiers[p.tier] : p.pal || null, false); }
    const KK = new Int32Array(Math.max(1, layers.length) * 16); keys.forEach((kk, l) => KK.set(kk, l * 16));
    const sp = ps.find(p => U[p.id].meta.smear);
    return { info, layers, KK, PK: palKeys(pals), cls: wp ? wp.class : 'none', ro: withOwn(resolveOpts(info), own), units, smear: sp ? U[sp.id] : null,
      lpx: new Array(layers.length).fill(null), key: null, L: null, dirIdx: null, n: null };
  }
  function animOf(P, anim) {                                    // 'attack' -> 'attack:<weapon class>' when the rig has it
    const an = P.info.anims, v = anim + ':' + P.cls;
    return an.includes(v) ? v : an.includes(anim) ? anim : 'idle';
  }
  // the loadout sheet's columns: every frame of every logical anim (info.sheetAnims), as render's sheet() lays them out
  function layoutOf(P) {
    const out = [], at = {};
    for (const a of P.info.sheetAnims || P.info.anims) {
      const real = animOf(P, a); at[a] = out.length;
      for (const [b, f] of P.info.layout) if (b === real) out.push([a, f, real]);
    }
    return { layout: out, at };
  }
  function composeInto(P, dir, anim, f, out, sw, ox, oy) {
    const info = P.info, w = info.frame[0], h = info.frame[1], r = info.dirs.indexOf(dir), D = info.dirs.length, a = animOf(P, anim);
    const S = rsBegin(w, h), { M, K, T, F, KP, Z, SRC, CL } = S, KK = P.KK, LPX = P.lpx;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    // the nearest layer per pixel first (M = its index, SRC = where in its sheet), then one decode per covered pixel
    for (let l = 0; l < P.layers.length; l++) {
      const ce = cellsOf(info, P.layers[l], a); if (!ce) continue;
      const sh = ce.sh, q = sh.meta.cells[(P.layers[l].li * D + r) * ce.n + ce.base + f]; if (!q) continue;
      const px = sh.rgba; if (!px) throw new Error(`forge: sheet ${sh.meta.id} (${a}) is not decoded`);
      const sw2 = sh.w, cx = q[4], cy = q[5], cw = q[2], ch = q[3]; LPX[l] = px;
      for (let y = 0; y < ch; y++) {
        let o = ((q[1] + y) * sw2 + q[0]) * 4, i = (cy + y) * w + cx;
        for (let x = 0; x < cw; x++, o += 4, i++) {
          if (!px[o + 3]) continue;
          const dq = px[o + 2]; if (dq < Z[i]) continue;
          Z[i] = dq; M[i] = l; SRC[i] = o;
        }
      }
      if (cx < x0) x0 = cx; if (cy < y0) y0 = cy; if (cx + cw - 1 > x1) x1 = cx + cw - 1; if (cy + ch - 1 > y1) y1 = cy + ch - 1;
    }
    let nc = 0;
    for (let y = y0; y <= y1; y++) for (let i = y * w + x0, e = y * w + x1; i <= e; i++) {
      const l = M[i]; if (l < 0) continue;
      const px = LPX[l], o = SRC[i], R = px[o], G = px[o + 1];
      M[i] = l * 256 + (R & 127); KP[i] = R >> 7; F[i] = G >> 7; K[i] = KK[l * 16 + ((G >> 3) & 15)]; T[i] = G & 7; CL[nc++] = i;
    }
    S.x0 = x0; S.y0 = y0; S.x1 = x1; S.y1 = y1; S.nc = nc;
    let ro = P.ro;
    if (P.smear && info.smear && info.smear[a] && f > 0) {
      const sh = sheetFor(P.smear, a), s0 = sh && sockOf(sh.meta, dir, a, f - 1), s1 = sh && sockOf(sh.meta, dir, a, f);
      if (s0 && s1) ro = Object.assign({}, ro, { smears: smearsOf(info.smear[a], f, s0, s1, P.smear.meta.smear) });
    }
    resolveCore(S, ro, P.PK);
    resolveOut(S, out, sw, ox, oy);
    return a;
  }
  // the sockets of one frame: the rig's (from the body unit) + every piece's own
  function socketsAt(P, dir, anim, f) {
    const a = animOf(P, anim), out = {};
    for (const u of P.units) { const sh = sheetFor(u, a), s = sh && sockOf(sh.meta, dir, a, f); if (s) Object.assign(out, s); }
    return out;
  }
  function sockOf(meta, dir, a, f) {                            // one frame's sockets of a sheet (packed, see packSockets)
    const S = meta.sockets; if (!S) return null;
    if (!S.names) { const q = S[dir] && S[dir][a]; return (q && q[f]) || null; }  // an unpacked bank (objects per frame)
    const q = S.v[dir] && S.v[dir][a], n = S.names.length; if (!q || (f + 1) * n * 4 > q.length) return null;
    const out = {};
    for (let k = 0; k < n; k++) { const o = (f * n + k) * 4; out[S.names[k]] = { x: q[o] / 10, y: q[o + 1] / 10, d: q[o + 2] / 10, front: q[o + 3] === 1 }; }
    return out;
  }
  // </engine>

  const root = typeof window !== 'undefined' ? window : globalThis;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
  const BASE = SRC ? SRC.replace(/[^/]*$/, '') + 'forge-bank/' : 'js/forge-bank/';
  const KEEP = 6;                                               // cached loadout sheets
  const RIGS = {}, LINES = {}, SHEETS = new Map(), PREP = new Map();

  // ---- banks ------------------------------------------------------------------------------------------------------
  function loadLine(line) {
    if (LINES[line]) return LINES[line];
    return (LINES[line] = new Promise((res, rej) => {
      const B = root.FORGE_BANK; if (B && B[line]) { res(B[line]); return; }
      const s = document.createElement('script'); s.src = BASE + line + '.js'; s.async = true;
      s.onload = () => { const b = root.FORGE_BANK && root.FORGE_BANK[line]; if (b) res(b); else rej(new Error('forge: bank ' + line + ' is empty')); };
      s.onerror = () => { delete LINES[line]; rej(new Error('forge: no bank ' + line)); };
      document.head.appendChild(s);
    }));
  }
  function addSheets(R, data) {
    for (const k in data.sheets) if (!R.bank.sheets[k]) { const s = data.sheets[k]; R.bank.sheets[k] = { w: 0, rgba: null, meta: s.meta, png: s.png }; }
  }
  function rigOf(rig) {
    if (RIGS[rig]) return RIGS[rig];
    return (RIGS[rig] = loadLine(rig).then(data => {
      const R = { bank: { model: data.model, sheets: {} }, lines: data.lines || {}, loaded: {} };
      addSheets(R, data); R.loaded[rig] = true; RIGS[rig] = Promise.resolve(R); RIGS[rig].R = R; return R;
    }));
  }
  // PNG (RGBA8, filters 0-4) from base64: inflate with DecompressionStream, else the browser's image decoder (exact here:
  // every bank pixel is opaque or all zero)
  async function decodePng(b64) {
    const bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') return decodeImg(b64);
    const dv = new DataView(buf.buffer), parts = []; let o = 8, w = 0, h = 0, n = 0;
    while (o < buf.length) {
      const len = dv.getUint32(o), type = String.fromCharCode(buf[o + 4], buf[o + 5], buf[o + 6], buf[o + 7]);
      if (type === 'IHDR') { w = dv.getUint32(o + 8); h = dv.getUint32(o + 12); if (buf[o + 16] !== 8 || buf[o + 17] !== 6) throw new Error('forge: PNG not RGBA8'); }
      else if (type === 'IDAT') { parts.push(buf.subarray(o + 8, o + 8 + len)); n += len; }
      o += 12 + len;
    }
    const z = new Uint8Array(n); let p = 0; for (const q of parts) { z.set(q, p); p += q.length; }
    const raw = new Uint8Array(await new Response(new Blob([z]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    const stride = w * 4, out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      const f = raw[y * (stride + 1)], s = y * (stride + 1) + 1, d = y * stride;
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? out[d + i - 4] : 0, b = y ? out[d - stride + i] : 0, c = y && i >= 4 ? out[d - stride + i - 4] : 0;
        let q = 0;
        if (f === 1) q = a; else if (f === 2) q = b; else if (f === 3) q = (a + b) >> 1;
        else if (f === 4) { const e = a + b - c, pa = Math.abs(e - a), pb = Math.abs(e - b), pc = Math.abs(e - c); q = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        out[d + i] = (raw[s + i] + q) & 255;
      }
    }
    return { w, rgba: out };
  }
  function decodeImg(b64) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); res({ w: img.width, rgba: x.getImageData(0, 0, img.width, img.height).data }); };
      img.onerror = () => rej(new Error('forge: bad PNG')); img.src = 'data:image/png;base64,' + b64;
    });
  }
  function decode(s) {
    if (s.rgba) return null;
    return s._p || (s._p = decodePng(s.png).then(d => { s.w = d.w; s.rgba = d.rgba; s.png = null; }));
  }
  const keyOf = (rig, loadout) => rig + '|' + JSON.stringify(loadout || []);
  // load every line the loadout needs, prepare it, decode the sheets its frames read; resolves to the prepared loadout
  async function ready(rig = 'chibi', loadout = []) {
    const key = keyOf(rig, loadout); if (PREP.has(key)) return PREP.get(key);
    const R = await rigOf(rig), ps = pieceRefs(loadout);
    await Promise.all([...new Set(ps.map(p => R.lines[p.id]).filter(l => l && !R.loaded[l]))].map(l => loadLine(l).then(d => { addSheets(R, d); R.loaded[l] = true; })));
    const P = prepare(R.bank, loadout), real = new Set(layoutOf(P).layout.map(e => e[2])), used = new Set(P.layers.map(l => l.u));
    if (P.smear) used.add(P.smear);
    const jobs = [];
    for (const u of used) for (const s of u.sheets) if (!s.meta.anims || s.meta.anims.some(a => real.has(a))) { const j = decode(s); if (j) jobs.push(j); }
    await Promise.all(jobs);
    P.key = key; P.L = layoutOf(P); P.dirIdx = {}; P.info.dirs.forEach((d, r) => { P.dirIdx[d] = r; });
    P.n = {}; for (const [a] of P.L.layout) P.n[a] = (P.n[a] || 0) + 1;
    PREP.set(key, P);
    return P;
  }
  const prepped = (rig, loadout) => PREP.get(keyOf(rig, loadout)) || null;

  // ---- canvases -----------------------------------------------------------------------------------------------------
  function canvasOf(w, h, data) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    return c;
  }
  const tick = fn => (typeof requestAnimationFrame !== 'undefined' && !(typeof document !== 'undefined' && document.hidden) ? requestAnimationFrame(fn) : setTimeout(fn, 0));

  // ---- the loadout sheet: composed once, over 3 animation frames, then cached ----------------------------------------
  function sheet(rig = 'chibi', loadout = []) {
    const key = keyOf(rig, loadout);
    let e = SHEETS.get(key);
    if (e) { if (SHEETS.size > 1) { SHEETS.delete(key); SHEETS.set(key, e); } return e; }
    e = { key, state: 'loading', canvas: null, ms: 0, wall: 0, slices: [], rims: new Map() };
    SHEETS.set(key, e);
    for (const [k, o] of SHEETS) { if (SHEETS.size <= KEEP) break; if (o.state === 'ready') SHEETS.delete(k); }
    e.promise = ready(rig, loadout).then(P => new Promise(res => {
      const info = P.info, w = info.frame[0], h = info.frame[1], L = P.L.layout, cols = L.length, rows = info.dirs.length;
      const SW = w * cols, SH = h * rows, data = new Uint8ClampedArray(SW * SH * 4), jobs = rows * cols, per = Math.ceil(jobs / 3);
      let k = 0; const t0 = now(); e.state = 'composing';
      const step = () => {
        const s = now();
        for (let n = 0; n < per && k < jobs; n++, k++) { const r = (k / cols) | 0, c = k - r * cols; composeInto(P, info.dirs[r], L[c][0], L[c][1], data, SW, c * w, r * h); }
        if (k >= jobs) e.canvas = canvasOf(SW, SH, data);
        const d = now() - s; e.ms += d; e.slices.push(d);
        if (k < jobs) { tick(step); return; }
        Object.assign(e, { state: 'ready', P, w, h, cols, rows, at: P.L.at, n: P.n, dirIdx: P.dirIdx, ax: info.origin[0], ay: info.origin[1], wall: now() - t0 });
        res(e);
      };
      tick(step);
    }));
    e.promise.catch(err => { SHEETS.delete(key); e.state = 'error'; e.error = err; });
    return e;
  }
  function frame(rig, loadout, anim, dir, f) {
    const e = sheet(rig, loadout); if (e.state !== 'ready') return null;
    const c = e.at[anim], r = e.dirIdx[dir]; if (c == null || r == null) return null;
    return { canvas: e.canvas, sx: (c + (f % e.n[anim])) * e.w, sy: r * e.h, w: e.w, h: e.h, ax: e.ax, ay: e.ay };
  }

  // ---- one frame / one direction now --------------------------------------------------------------------------------
  function rgba(rig, loadout, anim, dir, f) {
    const P = prepped(rig, loadout); if (!P) { ready(rig, loadout); return null; }
    const [w, h] = P.info.frame, out = new Uint8ClampedArray(w * h * 4);
    composeInto(P, dir, anim, f || 0, out, w, 0, 0);
    return out;
  }
  function compose(rig, loadout, anim, dir, f) {
    const px = rgba(rig, loadout, anim, dir, f); if (!px) return null;
    const P = prepped(rig, loadout), [w, h] = P.info.frame;
    return { canvas: canvasOf(w, h, px), w, h, ax: P.info.origin[0], ay: P.info.origin[1] };
  }
  let DOLL = null;
  function doll(rig, loadout, dir = 'S') {
    const P = prepped(rig, loadout); if (!P) { ready(rig, loadout); return null; }
    const t0 = now(), [w, h] = P.info.frame, L = P.L.layout, n = w * L.length * h * 4;
    if (!DOLL || DOLL.length !== n) DOLL = new Uint8ClampedArray(n); else DOLL.fill(0);   // reused: putImageData copies it
    const data = DOLL;
    for (let c = 0; c < L.length; c++) composeInto(P, dir, L[c][0], L[c][1], data, w * L.length, c * w, 0);
    const canvas = canvasOf(w * L.length, h, data);
    return { canvas, layout: L, at: P.L.at, w, h, ax: P.info.origin[0], ay: P.info.origin[1], ms: now() - t0 };
  }
  function sockets(rig, loadout, anim, dir, f) {
    const P = prepped(rig, loadout); if (!P) { ready(rig, loadout); return null; }
    return socketsAt(P, dir, anim, f || 0);
  }
  let RIMBUF = null;
  function rim(rig, loadout, anim, dir, f) {
    const P = prepped(rig, loadout); if (!P) { ready(rig, loadout); return null; }
    const e = SHEETS.get(P.key), k = anim + '|' + dir + '|' + (f || 0);
    if (e && e.rims.has(k)) return e.rims.get(k);
    const [w, h] = P.info.frame; if (!RIMBUF || RIMBUF.length < w * h * 4) RIMBUF = new Uint8ClampedArray(w * h * 4);
    composeInto(P, dir, anim, f || 0, RIMBUF, w, 0, 0); RIMBUF.fill(0);
    const r = Object.assign(rimOf(RS), { ax: P.info.origin[0], ay: P.info.origin[1] });
    if (e) e.rims.set(k, r);
    return r;
  }

  return { ready: (rig, loadout) => ready(rig, loadout).then(() => true), sheet, frame, compose, doll, sockets, rim, rgba };
})();
if (typeof module !== 'undefined') module.exports = FORGE;
