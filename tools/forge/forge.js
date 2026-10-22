'use strict';
// ---------------------------------------------------------------------------
// FORGE — a deterministic sprite renderer and paper-doll compositor. A MODEL (3D volumes on a bone rig + materials +
// poses) becomes pixel-art frames for every facing direction and animation frame. Same input -> the same bytes.
// Pure JS (no canvas, no DOM): node (tools/forge/build.js) or the browser (global FORGE).
//
// Two stages, so equipment can be layered in the game:
//   A  raster: one LAYER (body, hair, a helm ...) -> a G-buffer: coverage, material, part, tone (lit + quantised into the
//      material's 4-step ramp), depth (quantised). Baked per piece by bake() as an RGBA sheet.
//   B  resolve: any stack of G-buffers -> RGBA: nearest layer wins per pixel, a dark line where one part sits in front of
//      another, stray-pixel cleanup, palette lookup (a tier or rarity = a palette swap), outline.
// render() = A for every layer of a loadout + B. compose() runs B on baked sheets, so the game's composite of a loadout
// equals the offline render pixel for pixel.
//
//   FORGE.render(model, { dir, anim, frame, pieces })  -> { w, h, rgba, sockets, anim }
//   FORGE.sheet(model, { pieces, anims })              -> one loadout, rows = dirs, cols = every frame of every anim
//   FORGE.bake(model, { piece? })                      -> { w, h, rgba (encoded G-buffer sheet), meta } for the body or a piece
//   FORGE.compose(bank, { dir, anim, frame, pieces })  -> RGBA of one frame from baked sheets (the game's runtime path)
//   FORGE.raw(model, { dir, anim, frame, pieces, scale }) -> the volumes before the pixel pass (smooth light; a modelling aid)
//   FORGE.ramp('#rrggbb')                              -> [shadow, low, mid, high] hue-shifted ramp (hex)
//
// MODEL = {
//   frame: [w, h], origin: [ox, oy]        frame size and the pixel the feet centre lands on
//   cam: { elev: deg }                     orthographic camera pitch (0 = side-on, 90 = top-down)
//   light: [x, y, z]                       towards the light, camera space (fixed: turning the model re-lights it)
//   tones: [t3, t2, t1]                    n.L thresholds for high / mid / low (below t1 = shadow)
//   outline: '#hex', innerLine: px         outer outline colour; depth jump that draws a dark line between parts
//   bones: [ { name, parent, at:[x,y,z] } ]  rest offsets in the parent's space; the first bone is the root
//   dirs: [ [name, yawDeg], ... ]           yaw 0 faces the camera (S), 90 faces screen-right (E)
//   sockets: { name: { bone, at } }        exported per frame (hands, cast point, head top ...)
//   anims: { name: { frames, pose(f) -> { bone: { rot, off, scl, aim, point, roll } } } }
//            'attack:sword' style names: anim 'attack' picks the variant of the equipped weapon's class
//   anims[].ms: [ms per frame] (read by board.js / the game);  anims[].smear: { frame: band width 0..1, pivot?, reach?, lead?, tail? }
//   (weapon smears, see smearPoly)
//   innerColor: '#hex'                     seams (depth-jump lines) in this colour instead of the part's shadow tone
//   pixel: { normalSteps }                 opt-in hand-pixel pass: posterised normals, spur removal, clusters >= 2 px
//   sheetAnims: ['idle', 'walk', ...]      the columns of a loadout sheet (default: every anim)
//   layers: [ LAYER ]                      the bare body; a v1 model (mats / prims / stamps at the top level) = one layer
// }
// LAYER = { id, tag?, group?, bias?, mats, prims, stamps, sprites }
//   tag: what equipment can hide (a helm hides 'hair');  group: parts of one group never get a dark line between them;
//   bias: px towards the camera when stacking (cloth over a body that pokes through it by less than that)
//   mats: { name: '#hex' | [hex...] | { ramp, flat, lift, tones, spec } }   ramp: '#hex' (auto) or [shadow, low, mid, high, (spec)];
//         flat: one tone, unshaded, never cleaned up;  lift: lowest lit tone (faces never sink to shadow);  tones: own thresholds;
//         spec: n.H above this takes the ramp's last colour (a small glint on metal and gems);
//         keep: shaded as usual but never absorbed by the stray-pixel cleanup (1 px straps and filigree survive)
//   prims: { bone, mat, part?, shape:'ell'|'cap'|'box'|'line', ..., clip?, when?(anim, f) }
//         ell: c, r     cap: a, b, ra, rb (a tapered capsule)     box: c, h (half sizes), round
//         disc: c, r  a flat band: an r[0] x r[2] ellipse in local x-z, r[1] thick each way along y (belts, straps, trims)
//         rot: [rx, ry, rz] turns an ell, disc or box about its centre (a tilted feather, a diagonal strap)
//         weight: its rays count this many times in the pixel's vote, so a thin strap or trim wins its pixels over the plate
//         line: a, b (b on bone bB if given), tone: 1 px wide in screen space (strings, arrows), kept by every cleanup;
//               conn4: a 4-connected staircase (a blade: no pixel joined to its run by a corner only)
//         clip: [nx, ny, nz, k] (or a list) keeps the side where dot(p, n) <= k: a flat cut (a sole, a hair line)
//         when: the prim exists only on the frames where it returns true (a drawn bowstring, a nocked arrow)
//   stamps: { bone, at, n, facing, on?, px:[[dx, dy, '#hex' | mat], ...] }  pixels pinned to a surface point (eyes):
//         drawn when the point faces the camera and is not hidden inside the layer; other layers can still cover them
//   sprites: { bone, at?, part?, bias?, when?, flow?, key: { ch: [mat, tone] | '#hex' }, dirs: { S|SE|...|SW: GRID | VARIANTS | null } }
//         GRID = { at:[cx, cy], rows:[..], bias? (this facing's own bias: hair pinned at the chin but seen from behind) }
//         hand-authored pixel parts (a face, hair, a shield face): the grid of the bone's facing (nearest 45 deg) is pinned
//         with cell `at` on the bone point, at that point's depth (minus bias px); '.' (any char not in key) is empty.
//         Authored pixels are flat (no shading, no cleanup) but depth-tested and stacked like any volume, so bake / compose
//         carry them unchanged.
//         VARIANTS = { rest: GRID, trailL?, trailR?, lift? }: secondary motion (hair). With `flow` the frame's variant is picked
//         from the bone's motion over the last two frames (flowOf); without it, rest. flow = { at?, follow, min (px, or
//         per anim { idle, other }), travel?: { anim: [px per frame along the facing] } }
//         spring = { segs, stiff, damp, min, drive?: { anim: { fwd?, side?, up?: [px per frame] } }, counter?: { anims,
//         bone, at, gain } }: cloth (a cape) on a lagged spring chain, variants rest / trailL / trailR / lift / billow (springOf).
//         face: the bone whose facing picks the grid (default the sprite's bone; a cape follows the chest, not its swing)
// PIECE = { id, slot, family?, tier?, class?, hides:[tags], layers:[LAYER], pose?(anim, f), tiers?:[ { mat: ramp } ], sockets?, smear? }
//   smear: '#hex' a weapon with a 'tip' socket draws the anim's smear frames in this flat colour (hand -> tip path)
//   family + tier: one baked piece per shape tier (knighthelm.t3); tiers: palette-only variants of one baked piece
//   pose: partial poses for bones ONLY this piece uses (a weapon's hold); class: 'sword' | 'staff' | 'bow' ...
// Pose: rot = Euler [rx, ry, rz] relative to the parent. aim / point = a direction in model space (before the facing yaw):
//   aim lays the bone's +y along it (weapons), point lays its -y along it (limbs); roll hints where +z goes.
//   off moves the joint, scl squashes / stretches the bone's own volumes and scales its children's offsets.
// ---------------------------------------------------------------------------
const FORGE = (function () {
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

  // ---- signed distance functions (local space) ------------------------------------------------------------------
  function sdf(pr, p) {
    let d;
    const local = c => pr.rot ? mtv(pr._R || (pr._R = rot(pr.rot)), sub(p, c)) : sub(p, c);
    if (pr.shape === 'ell') {
      const q = local(pr.c), r = pr.r;
      const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]), k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2]));
      d = k1 === 0 ? -Math.min(r[0], r[1], r[2]) : k0 * (k0 - 1) / k1;
    } else if (pr.shape === 'disc') {                             // elliptic cylinder: flat sides, so a band stands proud at full width
      const q = local(pr.c), r = pr.r;
      const k0 = Math.hypot(q[0] / r[0], q[2] / r[2]), k1 = Math.hypot(q[0] / (r[0] * r[0]), q[2] / (r[2] * r[2]));
      d = Math.max(k1 === 0 ? -Math.min(r[0], r[2]) : k0 * (k0 - 1) / k1, Math.abs(q[1]) - r[1]);
    } else if (pr.shape === 'cap') {
      const pa = sub(p, pr.a), ba = sub(pr.b, pr.a), t = clamp(dot(pa, ba) / (dot(ba, ba) || 1), 0, 1);
      d = len(sub(pa, mul(ba, t))) - (pr.ra + (pr.rb - pr.ra) * t);
    } else {                                                     // rounded box
      const q = local(pr.c), rr = pr.round || 0;
      const e = [Math.abs(q[0]) - pr.h[0] + rr, Math.abs(q[1]) - pr.h[1] + rr, Math.abs(q[2]) - pr.h[2] + rr];
      d = len([Math.max(e[0], 0), Math.max(e[1], 0), Math.max(e[2], 0)]) + Math.min(Math.max(e[0], e[1], e[2]), 0) - rr;
    }
    if (pr.clip) for (const c of (Array.isArray(pr.clip[0]) ? pr.clip : [pr.clip])) d = Math.max(d, c[0] * p[0] + c[1] * p[1] + c[2] * p[2] - c[3]);
    return d;
  }
  function bound(pr) {                                          // local bounding sphere [centre, radius]
    if (pr.shape === 'ell' || pr.shape === 'disc') return [pr.c, Math.max(...pr.r)];
    if (pr.shape === 'cap') return [mul(add(pr.a, pr.b), 0.5), len(sub(pr.b, pr.a)) / 2 + Math.max(pr.ra, pr.rb)];
    return [pr.c, len(pr.h)];
  }
  function normalAt(pr, p) {
    const e = 0.02;
    return norm([sdf(pr, [p[0] + e, p[1], p[2]]) - sdf(pr, [p[0] - e, p[1], p[2]]),
      sdf(pr, [p[0], p[1] + e, p[2]]) - sdf(pr, [p[0], p[1] - e, p[2]]),
      sdf(pr, [p[0], p[1], p[2] + e]) - sdf(pr, [p[0], p[1], p[2] - e])]);
  }

  // ---- model plumbing -------------------------------------------------------------------------------------------
  const layersOf = model => model.layers || [{ id: 'main', mats: model.mats, prims: model.prims, stamps: model.stamps }];
  const pieceList = pieces => (pieces || []).map(p => p.piece ? p : { piece: p });
  function matTable(layer) {                                    // names, flags and default ramps; stamp / line colours join it
    if (layer._mt) return layer._mt;
    const names = Object.keys(layer.mats || {}), list = names.map(k => {
      const m = layer.mats[k], o = (typeof m === 'string' || Array.isArray(m)) ? {} : Object.assign({}, m);
      o.ramp = toRamp(m); return o;
    });
    const addHex = h => { if (typeof h === 'string' && h[0] === '#' && !names.includes(h)) { names.push(h); list.push({ ramp: [h, h, h, h], flat: 0 }); } };
    for (const st of layer.stamps || []) for (const p of st.px) addHex(p[2]);
    for (const sp of layer.sprites || []) for (const k in sp.key) addHex(sp.key[k]);
    for (const pr of layer.prims || []) addHex(pr.mat);
    if (names.length > 128) throw new Error(`layer ${layer.id}: ${names.length} materials (128 at most)`);
    const index = {}; names.forEach((n, i) => { index[n] = i; });
    return (layer._mt = { names, list, index });
  }
  function partList(layer) {                                    // part names in prim order (stable: the baked index)
    if (layer._pl) return layer._pl;
    const names = [], index = {};
    for (const pr of [...(layer.prims || []), ...(layer.sprites || [])]) { const n = pr.part || pr.bone; if (index[n] == null) { index[n] = names.length; names.push(n); } }
    if (names.length > 16) throw new Error(`layer ${layer.id}: ${names.length} parts (16 at most)`);
    return (layer._pl = { names, index });
  }
  function palOf(layer, over) {                                 // per material: 4 rgb triples (a tier swaps colours only)
    const mt = matTable(layer);
    return mt.names.map((n, i) => (over && over[n] ? toRamp(over[n]) : mt.list[i].ramp).map(hexRgb));
  }
  function assemble(model, pieces) {                            // body layers (minus hidden tags) + every piece's layers
    const ps = pieceList(pieces), hidden = new Set();
    ps.forEach(p => (p.piece.hides || []).forEach(t => hidden.add(t)));
    const out = [];
    for (const L of layersOf(model)) if (!hidden.has(L.tag)) out.push({ layer: L, group: L.group || 'body', over: null });
    for (const p of ps) {
      const over = p.tier != null && p.piece.tiers ? p.piece.tiers[p.tier] : p.pal || null;
      for (const L of p.piece.layers) out.push({ layer: L, group: L.group || p.piece.id, over });
    }
    return out;
  }
  function animName(model, anim, pieces) {                      // 'attack' -> 'attack:<weapon class>' when the model has it
    const wp = pieceList(pieces).find(p => p.piece.class);
    const v = anim + ':' + (wp ? wp.piece.class : 'none');
    return model.anims[v] ? v : model.anims[anim] ? anim : 'idle';
  }

  // ---- rig ------------------------------------------------------------------------------------------------------
  function pose(model, yaw, anim, frame, extra) {
    const P = Object.assign({}, (model.anims[anim] || model.anims.idle).pose(frame) || {});
    for (const fn of extra || []) { const q = fn(anim, frame) || {}; for (const k in q) P[k] = Object.assign({}, P[k] || {}, q[k]); }
    const Y = ry(yaw), W = {};
    model.bones.forEach((b, i) => {
      const p = P[b.name] || {}, at = add(b.at, p.off || [0, 0, 0]), s = p.scl || [1, 1, 1], par = i ? W[b.parent] : null;
      const R = (p.aim || p.point) ? mm(Y, mm(look(p.aim || mul(p.point, -1), p.roll), rot(p.rot))) : mm(par ? par.R : Y, rot(p.rot));
      const t = par ? add(par.t, mv(par.R, [at[0] * par.s[0], at[1] * par.s[1], at[2] * par.s[2]])) : mv(Y, at);
      W[b.name] = { R, t, s };
    });
    return W;
  }
  // the poses of the frames before f (for a sprite's hair flow): past(k) = { W, f } of frame f - k, wrapping in a looping
  // anim (model.loops, default idle and walk), null before frame 0 of any other (an attack starts from rest)
  function history(model, yaw, anim, f, extra) {
    const A = model.anims[anim] || model.anims.idle, loop = (model.loops || ['idle', 'walk']).includes(anim.split(':')[0]), memo = {};
    const at = g => memo[g] || (memo[g] = { W: pose(model, yaw, anim, g, extra), f: g });
    return { f, loop, frames: A.frames, fwd: mv(ry(yaw), [0, 0, 1]), right: mv(ry(yaw), [-1, 0, 0]), at, past: k => {
      let g = f - k; if (g < 0) { if (!loop) return null; g = ((g % A.frames) + A.frames) % A.frames; }
      return at(g); } };
  }
  const worldPoint = (W, bone, at) => { const B = W[bone]; return add(B.t, mv(B.R, [at[0] * B.s[0], at[1] * B.s[1], at[2] * B.s[2]])); };

  // ---- stage A: rasterise one layer -----------------------------------------------------------------------------
  const SS = 3, FAR = 200, QS = 6;                              // 3x3 rays per pixel; depth stored in 1/6 px steps around the root
  function camera(model) {
    const e = (model.cam && model.cam.elev != null ? model.cam.elev : 25) * Math.PI / 180;
    return { w: model.frame[0], h: model.frame[1], ox: model.origin[0], oy: model.origin[1],
      D: [0, -Math.sin(e), -Math.cos(e)], RT: [1, 0, 0], UP: [0, Math.cos(e), -Math.sin(e)],
      L: norm(model.light || [-0.55, 0.65, 0.52]), T: model.tones || [0.78, 0.3, -0.25], cover: model.coverage || 4,
      nsteps: (model.pixel && model.pixel.normalSteps) || 0, dstep: model.depthStep || 1 };
  }
  function volumes(layer, W, anim, frame, mt, pl) {           // a layer's live volumes, posed: bounds in world space
    const vol = [];
    for (const pr of layer.prims || []) {
      if ((pr.when && !pr.when(anim, frame)) || pr.shape === 'line') continue;
      const B = W[pr.bone], [bc, br] = bound(pr), s = B.s;
      vol.push({ pr, R: B.R, t: B.t, s, smin: Math.min(s[0], s[1], s[2]), bc: worldPoint(W, pr.bone, bc), br: br * Math.max(s[0], s[1], s[2]), part: pl.index[pr.part || pr.bone], m: mt.index[pr.mat] });
    }
    return vol;
  }
  function nearest(o, D, vol) {                                 // the first volume a ray meets: { t, q, n } or null (SDF march)
    let best = null;
    for (const q of vol) {
      const oc = sub(o, q.bc), b = dot(oc, D), c = dot(oc, oc) - q.br * q.br, disc = b * b - c;
      if (disc < 0) continue;
      const sq = Math.sqrt(disc); let t = -b - sq; const t1 = -b + sq;
      if (best && t > best.t) continue;
      const s = q.s, l0 = mtv(q.R, sub(o, q.t)), l1 = mtv(q.R, D);
      const lo = [l0[0] / s[0], l0[1] / s[1], l0[2] / s[2]], ld = [l1[0] / s[0], l1[1] / s[1], l1[2] / s[2]];
      t = Math.max(t, 0);
      for (let k = 0; k < 64 && t <= t1; k++) {
        const lp = add(lo, mul(ld, t)), d = sdf(q.pr, lp) * q.smin;
        if (d < 0.01) {
          if (!best || t < best.t) { const g = normalAt(q.pr, lp); best = { t, q, n: norm(mv(q.R, [g[0] / s[0], g[1] / s[1], g[2] / s[2]])) }; }
          break;
        }
        t += Math.max(d * 0.9, 0.01);
      }
    }
    return best;
  }
  // posterised normals: snap a normal to a lattice of `steps` per axis, so a curved mass breaks into a few flat facets
  // (hand-pixelled bands) instead of a smooth gradient that quantises into ragged contours
  const posterise = (n, steps) => steps ? norm(n.map(v => Math.round(v * steps) / steps)) : n;
  // a sprite's grid for the way its bone faces: the bone's +z on the ground plane, snapped to the nearest 45 deg (S = 0,
  // E = 90), so a twisted chest or a turned head picks the turned grid; a missing facing falls back to the nearest one drawn
  const FACINGS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
  function spriteGrid(sp, R) {
    const f = mv(R, [0, 0, 1]), k = ((Math.round(Math.atan2(f[0], f[2]) / (Math.PI / 4)) % 8) + 8) % 8;
    if (sp.dirs[FACINGS[k]] === null) return null;               // null = drawn by nothing for this facing (a shield's back)
    for (const d of [0, 1, -1, 2, -2, 3, -3, 4]) { const g = sp.dirs[FACINGS[(k + d + 8) % 8]]; if (g) return g; }
    return null;
  }
  // hair follow-through: which variant of a sprite's grid (rest / trailL / trailR / lift) this frame shows. A point of the
  // sprite's bone (flow.at, default the sprite's own) is followed over the last two frames (hist.past) plus the anim's travel impulses along the facing (px per
  // frame: a stride's push-off, an attack's lunge the rig does not translate); the hair lags, so its offset is minus that
  // motion (this step + follow x the step before). Under `min` px (a number or per anim): rest; mostly sideways: trail to that side; else hair
  // pushed up (the head dropped): lift; pushed down: rest.
  function flowOf(sp, W, hist, proj, cam, anim) {
    const fl = sp.flow, at = fl.at || sp.at || [0, 0, 0], tr = (fl.travel || {})[anim.split(':')[0]] || [];
    const fx = dot(hist.fwd, cam.RT), fy = -dot(hist.fwd, cam.UP), pt = Wk => proj(worldPoint(Wk, sp.bone, at));
    const step = k => { const A = k ? hist.past(k) : { W, f: hist.f }, B = hist.past(k + 1); if (!A || !B) return [0, 0];
      const a = pt(A.W), b = pt(B.W), t = tr[A.f] || 0; return [a[0] - b[0] + t * fx, a[1] - b[1] + t * fy]; };
    const s0 = step(0), s1 = step(1), ox = -(s0[0] + fl.follow * s1[0]), oy = -(s0[1] + fl.follow * s1[1]);
    const min = typeof fl.min === 'number' ? fl.min : fl.min[anim.split(':')[0]] || fl.min.other;
    if (Math.hypot(ox, oy) < min) return 'rest';
    if (Math.abs(ox) >= min && Math.abs(ox) >= Math.abs(oy)) return ox < 0 ? 'trailL' : 'trailR';
    return oy < 0 ? 'lift' : 'rest';
  }
  // cloth secondary motion (a cape): a chain of `segs` damped springs hung from the sprite's bone point, driven by that
  // point's screen motion plus the anim's drive impulses (px per frame along the hero's fwd / side (his right) / up) and,
  // in the `counter` anims, minus `gain` x the screen motion of a counter point (the sword tip: the cloth swings against
  // the blade). Run from frame 0 over `warm` whole loops (default 1; an anim that does not loop holds its frame 0 instead),
  // then on to this frame: the result depends on (anim, frame) only. The hem's lag (last segment - anchor; screen x, y and
  // depth) picks the variant: under `min` px rest; sideways >= min and >= half the rest: trailL / trailR; else mostly in
  // depth: billow (falls back to lift, then rest, where a facing has none); else hem pushed up: lift; down: rest.
  function springOf(sp, hist, proj, cam, anim) {
    const sg = sp.spring, A = anim.split(':')[0], dr = (sg.drive || {})[A] || {}, at = sp.at || [0, 0, 0];
    const vec = v => [dot(v, cam.RT), -dot(v, cam.UP), dot(v, cam.D)], F = vec(hist.fwd), S = vec(hist.right), U = vec([0, 1, 0]);
    const ct = sg.counter && sg.counter.anims.includes(A) ? sg.counter : null, seq = [];
    for (let i = 0; i < hist.frames * (sg.warm || 1); i++) seq.push(hist.loop ? i % hist.frames : 0);
    for (let i = 0; i <= hist.f; i++) seq.push(i);
    const n = sg.segs || 3, x = [], v = []; let drift = [0, 0, 0], tip0 = null;
    seq.forEach((g, s) => {
      const Wg = hist.at(g).W;
      if (s) for (const [ax, key] of [[F, 'fwd'], [S, 'side'], [U, 'up']]) drift = add(drift, mul(ax, (dr[key] || [])[g] || 0));
      if (ct) { const tp = proj(worldPoint(Wg, ct.bone, ct.at)); if (tip0) drift = sub(drift, mul(sub(tp, tip0), ct.gain)); tip0 = tp; }
      const a = add(proj(worldPoint(Wg, sp.bone, at)), drift);
      if (!x.length) for (let k = 0; k <= n; k++) { x.push(a.slice()); v.push([0, 0, 0]); }
      x[0] = a;
      for (let k = 1; k <= n; k++) { v[k] = add(mul(v[k], sg.damp), mul(sub(x[k - 1], x[k]), sg.stiff)); x[k] = add(x[k], v[k]); }
    });
    const o = sub(x[n], x[0]), min = typeof sg.min === 'number' ? sg.min : sg.min[A] || sg.min.other, [ax, ay, ad] = o.map(Math.abs);
    if (Math.hypot(ax, ay, ad) < min) return 'rest';
    if (ax >= min && ax >= 0.5 * Math.max(ay, ad)) return o[0] < 0 ? 'trailL' : 'trailR';
    if (ad >= ay) return 'billow';
    return o[1] < 0 ? 'lift' : 'rest';
  }
  const FALLBACK = { billow: 'lift', lift: 'rest' };
  function variant(set, name) { while (name && !set[name]) name = FALLBACK[name]; return set[name] || set.rest; }
  function raster(layer, W, cam, anim, frame, rootT, hist) {
    const { w, h, ox, oy, D, RT, UP, L, T } = cam, N = w * h, mt = matTable(layer), pl = partList(layer), H = norm(sub(L, D));
    const G = { cov: new Uint8Array(N), mat: new Uint8Array(N), part: new Uint8Array(N), tone: new Uint8Array(N), flat: new Uint8Array(N), keep: new Uint8Array(N), dq: new Uint8Array(N) };
    const dep = new Float32Array(N).fill(1e9);
    const proj = P => [ox + dot(P, RT), oy - dot(P, UP), dot(P, D) + FAR];
    const vol = volumes(layer, W, anim, frame, mt, pl), lines = (layer.prims || []).filter(pr => pr.shape === 'line' && (!pr.when || pr.when(anim, frame)));
    // only the pixels under some volume's projected bounding circle
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (const q of vol) {
      const [cx, cy] = proj(q.bc);
      x0 = Math.min(x0, Math.floor(cx - q.br)); x1 = Math.max(x1, Math.ceil(cx + q.br));
      y0 = Math.min(y0, Math.floor(cy - q.br)); y1 = Math.max(y1, Math.ceil(cy + q.br));
    }
    x0 = Math.max(x0, 0); y0 = Math.max(y0, 0); x1 = Math.min(x1, w - 1); y1 = Math.min(y1, h - 1);
    const hits = [];
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      hits.length = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = px + (sx + 0.5) / SS - ox, v = oy - (py + (sy + 0.5) / SS);
        const best = nearest(add(add(mul(RT, u), mul(UP, v)), mul(D, -FAR)), D, vol);
        if (best) hits.push(best);
      }
      if (hits.length < cam.cover) continue;
      const cnt = {};                                            // majority part; ties go to the nearest
      for (const hh of hits) {
        const k = hh.q.part; const C = cnt[k] || (cnt[k] = { n: 0, t: 1e9, nn: [0, 0, 0], tt: 0, m: hh.q.m });
        const wt = hh.q.pr.weight || 1; C.n += wt; C.tt += hh.t * wt; C.nn = add(C.nn, mul(hh.n, wt)); C.w = (C.w || 0) + wt; if (hh.t < C.t) { C.t = hh.t; C.m = hh.q.m; }
      }
      let pick = null, pk = 0;
      for (const k in cnt) if (!pick || cnt[k].n > pick.n || (cnt[k].n === pick.n && cnt[k].t < pick.t)) { pick = cnt[k]; pk = +k; }
      const i = py * w + px, nn = posterise(norm(pick.nn), cam.nsteps), s = dot(nn, L), M = mt.list[pick.m], TT = M.tones || T;
      G.cov[i] = 1; G.mat[i] = pick.m; G.part[i] = pk; dep[i] = pick.tt / pick.w;
      G.flat[i] = M.flat != null ? 1 : 0; G.keep[i] = M.keep ? 1 : 0;
      let tn = 0; for (let k = 0; k < TT.length; k++) if (s > TT[k]) { tn = TT.length - k; break; }
      G.tone[i] = M.flat != null ? M.flat : M.spec != null && dot(nn, H) > M.spec ? M.ramp.length - 1 : Math.max(M.lift || 0, tn);
    }
    // lines: 1 px in screen space, depth-tested inside the layer
    for (const pr of lines) {
      const a = proj(worldPoint(W, pr.bone, pr.a)), b = proj(worldPoint(W, pr.bB || pr.bone, pr.b));
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
      const m = mt.index[pr.mat], M = mt.list[m];
      const plot = (x, y, t) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = y * w + x;
        if (G.cov[i] && t >= dep[i]) return;
        G.cov[i] = 1; G.mat[i] = m; G.part[i] = pl.index[pr.part || pr.bone]; G.flat[i] = 1; dep[i] = t;
        G.tone[i] = pr.tone != null ? pr.tone : M.flat != null ? M.flat : 2;
      };
      let px0 = null, py0 = null;
      for (let k = 0; k <= n; k++) {
        const f = k / n, x = Math.floor(a[0] + (b[0] - a[0]) * f), y = Math.floor(a[1] + (b[1] - a[1]) * f), t = a[2] + (b[2] - a[2]) * f;
        // conn4: a diagonal step gets a corner pixel (a hand-drawn staircase, no pixel touching its run only by a corner)
        if (pr.conn4 && px0 != null && x !== px0 && y !== py0) plot(Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) ? px0 : x, Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) ? y : py0, t);
        plot(x, y, t); px0 = x; py0 = y;
      }
    }
    // sprites: hand-authored pixel parts, one grid per facing, pinned to a bone point at that point's depth
    for (const sp of layer.sprites || []) {
      if (sp.when && !sp.when(anim, frame)) continue;
      let g = spriteGrid(sp, W[sp.face || sp.bone].R); if (!g) continue;
      if (!g.rows) g = variant(g, !hist ? 'rest' : sp.flow ? flowOf(sp, W, hist, proj, cam, anim) : sp.spring ? springOf(sp, hist, proj, cam, anim) : 'rest');
      const [sx, sy, t0] = proj(worldPoint(W, sp.bone, sp.at || [0, 0, 0])), t = t0 - (g.bias != null ? g.bias : sp.bias || 0), part = pl.index[sp.part || sp.bone];
      const X = Math.floor(sx) - g.at[0], Y = Math.floor(sy) - g.at[1];
      g.rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) {
        const k = sp.key[row[c]]; if (k == null) continue;
        const x = X + c, y = Y + r; if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = y * w + x; if (G.cov[i] && dep[i] < t && !G.flat[i]) continue;   // a volume of this layer in front (a raised arm)
        const m = typeof k === 'string' ? mt.index[k] : mt.index[k[0]];
        G.cov[i] = 1; G.mat[i] = m; G.part[i] = part; G.flat[i] = 1; G.keep[i] = 0; dep[i] = t;
        G.tone[i] = typeof k === 'string' ? (mt.list[m].flat != null ? mt.list[m].flat : 2) : k[1];
      } });
    }
    // stamps: surface-pinned pixels, hidden when the point faces away or sits behind another volume of this layer
    for (const st of layer.stamps || []) {
      const P = worldPoint(W, st.bone, st.at), nn = mv(W[st.bone].R, norm(st.n || [0, 0, 1]));
      if (-dot(nn, D) < (st.facing != null ? st.facing : 0.3)) continue;
      const [sx, sy, st0] = proj(P), xs = Math.floor(sx), ys = Math.floor(sy);
      if (xs < 0 || ys < 0 || xs >= w || ys >= h) continue;
      const i0 = ys * w + xs;
      if (!G.cov[i0] || Math.abs(dep[i0] - st0) > (st.depthTol || 2.5) || (st.on && G.mat[i0] !== mt.index[st.on])) continue;
      for (const [dx, dy, col] of st.px) {
        const x = xs + dx, y = ys + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const j = y * w + x; if (!G.cov[j]) continue;
        const m = mt.index[col]; G.mat[j] = m; G.flat[j] = 1; G.tone[j] = mt.list[m].flat != null ? mt.list[m].flat : 2; dep[j] -= 0.15;
      }
    }
    const bias = layer.bias || 0;                               // clothing wins over a body part poking through it by < bias px
    const st = cam.dstep;                                       // model.depthStep: depth kept in multiples of st 1/6 px steps
    for (let i = 0; i < N; i++) if (G.cov[i]) G.dq[i] = clamp(128 + Math.round((rootT - dep[i] + bias) * QS / st) * st, 1, 255);
    return G;
  }

  // ---- stage B: resolve a stack of G-buffers ---------------------------------------------------------------------
  // list: [{ g, pal: per material 4 rgb, keys: per part an int (same group + part name = same key) }]
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function resolve(list, w, h, opt) {
    const N = w * h, M = new Int32Array(N).fill(-1), K = new Int32Array(N), T = new Uint8Array(N), F = new Uint8Array(N), KP = new Uint8Array(N), Z = new Int16Array(N);
    for (let i = 0; i < N; i++) {
      let b = -1, bz = -1;
      for (let l = 0; l < list.length; l++) { const g = list[l].g; if (g.cov[i] && g.dq[i] >= bz) { b = l; bz = g.dq[i]; } }
      if (b < 0) continue;
      const g = list[b].g; M[i] = b * 256 + g.mat[i]; K[i] = list[b].keys[g.part[i]]; T[i] = g.tone[i]; F[i] = g.flat[i]; KP[i] = g.keep[i]; Z[i] = bz;
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : y * w + x;
    const px = opt.pixel;
    // pixel pass 1 (opt-in, model.pixel): 1 px spurs off the silhouette go (a pixel with at most one covered 4-neighbour)
    if (px) for (let pass = 0; pass < 2; pass++) {
      const kill = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (M[i] < 0 || F[i] || KP[i]) continue;
        let n = 0; for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && M[j] >= 0) n++; }
        if (n <= 1) kill.push(i);
      }
      for (const i of kill) M[i] = -1;
    }
    // dark line on the far side of a depth jump between two parts (an arm in front of the torso reads as separate);
    // with innerColor it is drawn in that colour (the reference's navy seams), else in the part's own shadow tone
    const SEAM = new Uint8Array(N);
    if (opt.jumpQ) {
      const t0 = T.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (M[i] < 0 || F[i]) continue;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && M[j] >= 0 && K[j] !== K[i] && Z[j] > Z[i] + opt.jumpQ) { if (opt.innerColor) SEAM[i] = 1; else t0[i] = 0; break; } }
      }
      T.set(t0);
    }
    // lone material pixel (one stray hand / belt pixel): it joins the commonest neighbouring material
    {
      const m0 = M.slice(), k0 = K.slice(), t0 = T.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (M[i] < 0 || F[i] || KP[i]) continue;
        const nb = []; for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && M[j] >= 0) nb.push(j); }
        if (nb.length < (px ? 2 : 3) || nb.some(j => M[j] === M[i])) continue;
        const cand = nb.filter(j => !F[j]); if (!cand.length) continue;
        const c = {}; cand.forEach(j => { c[M[j]] = (c[M[j]] || 0) + 1; });
        const best = cand.reduce((a, j) => c[M[j]] > c[M[a]] ? j : a, cand[0]);
        m0[i] = M[best]; k0[i] = K[best]; t0[i] = T[best];
      }
      M.set(m0); K.set(k0); T.set(t0);
    }
    // orphan cleanup: a lone tone with no same-tone neighbour inside its material takes the commonest neighbour tone
    // (2 passes; the pixel pass iterates to a fixed point and also takes edge pixels with a single same-material neighbour)
    for (let pass = 0; pass < (px ? 8 : 2); pass++) {
      const t0 = T.slice(); let changed = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (M[i] < 0 || F[i] || SEAM[i]) continue;
        const nb = []; let same = 0;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && M[j] === M[i] && !F[j] && !SEAM[j]) { nb.push(T[j]); if (T[j] === T[i]) same++; } }
        if (nb.length >= (px ? 1 : 2) && !same) { const c = [0, 0, 0, 0, 0, 0, 0, 0]; nb.forEach(v => c[v]++); t0[i] = c.indexOf(Math.max(...c)); changed++; }
      }
      T.set(t0); if (!changed) break;
    }
    const rgba = new Uint8ClampedArray(N * 4), seamC = opt.innerColor;
    for (let i = 0; i < N; i++) if (M[i] >= 0) { const c = SEAM[i] ? seamC : list[M[i] >> 8].pal[M[i] & 255][T[i]]; rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255; }
    const SM = new Uint8Array(N);
    // weapon smears: flat polygons, no outline; behind the body unless the tip is in front of it (before the cluster pass,
    // so a body pixel the smear cuts off is cleaned up too)
    for (const sm of opt.smears || []) {
      const got = new Uint8Array(N);
      fillPoly(sm.poly, w, h, i => { if (!rgba[i * 4 + 3] || (sm.over && !F[i])) got[i] = 1; });
      // a smear pixel with no smear 4-neighbour (a sliver at the thin end) is dropped, to a fixed point
      for (let changed = 1; changed;) {
        changed = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x; if (!got[i]) continue;
          let n = 0; for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && got[j]) n++; }
          if (!n) { got[i] = 0; changed = 1; }
        }
      }
      for (let i = 0; i < N; i++) if (got[i]) { SM[i] = 1; rgba[i * 4] = sm.rgb[0]; rgba[i * 4 + 1] = sm.rgb[1]; rgba[i * 4 + 2] = sm.rgb[2]; rgba[i * 4 + 3] = 255; }
    }
    // pixel pass 2: clusters >= 2 px by final colour (what the eye and the lint see): a pixel with no 4-neighbour of its own
    // colour takes the commonest neighbouring colour; flat pixels too (a blade pixel cut off by the arm, half an eye)
    if (px) for (let pass = 0; pass < 6; pass++) {             // in place, scan order: a lone pair cannot swap forever
      const out = rgba; let changed = 0;
      const key = i => (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if ((M[i] < 0 && !SM[i]) || KP[i]) continue;
        const k = key(i), cnt = new Map(); let same = false;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j < 0 || (M[j] < 0 && !SM[j])) continue; const kj = key(j); if (kj === k) { same = true; break; } cnt.set(kj, (cnt.get(kj) || 0) + 1); }
        if (same || !cnt.size) continue;
        let bk = -1, bn = 0; for (const [kk, n] of cnt) if (n > bn || (n === bn && kk < bk)) { bk = kk; bn = n; }
        out[i * 4] = bk >> 16; out[i * 4 + 1] = (bk >> 8) & 255; out[i * 4 + 2] = bk & 255; changed++;
      }
      if (!changed) break;
    }
    if (opt.outline) {
      const c = opt.outline;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (M[i] >= 0 || SM[i]) continue;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && M[j] >= 0) { rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255; break; } }
      }
    }
    return rgba;
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

  // ---- render one frame of a loadout ----------------------------------------------------------------------------
  const yawOf = (model, dir) => ((model.dirs.find(d => d[0] === dir) || [0, 0])[1]) * Math.PI / 180;
  function frameSockets(model, W, cam, extra) {
    const proj = P => [cam.ox + dot(P, cam.RT), cam.oy - dot(P, cam.UP), dot(P, cam.D)];
    const rootT = proj(W[model.bones[0].name].t)[2], out = {}, all = Object.assign({}, model.sockets || {}, extra || {});
    for (const k in all) {
      const s = all[k]; if (!W[s.bone]) continue;
      const [x, y, t] = proj(worldPoint(W, s.bone, s.at));
      out[k] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: Math.round((t - rootT) * 10) / 10, front: t < rootT };
    }
    return out;
  }
  function render(model, opt) {
    const cam = camera(model), stack = assemble(model, opt.pieces), ps = pieceList(opt.pieces);
    const anim = animName(model, opt.anim || 'idle', opt.pieces), f = opt.frame || 0;
    const yaw0 = opt.yaw != null ? opt.yaw * Math.PI / 180 : yawOf(model, opt.dir), extra = ps.filter(p => p.piece.pose).map(p => p.piece.pose);
    const W = pose(model, yaw0, anim, f, extra), hist = history(model, yaw0, anim, f, extra);
    const rootT = dot(W[model.bones[0].name].t, cam.D) + FAR, key = interner();
    const list = stack.map(a => ({ g: raster(a.layer, W, cam, anim, f, rootT, hist), pal: palOf(a.layer, a.over), keys: partList(a.layer).names.map(n => key(a.group + ':' + n)) }));
    const extraS = Object.assign({}, ...ps.map(p => p.piece.sockets || {})), sockets = frameSockets(model, W, cam, extraS);
    const ro = resolveOpts(model), A = model.anims[anim], wp = ps.find(p => p.piece.smear);
    if (A.smear && A.smear[f] && wp && f > 0) {
      const yaw = opt.yaw != null ? opt.yaw * Math.PI / 180 : yawOf(model, opt.dir);
      const W0 = pose(model, yaw, anim, f - 1, ps.filter(p => p.piece.pose).map(p => p.piece.pose));
      ro.smears = smearsOf(A.smear, f, frameSockets(model, W0, cam, extraS), sockets, wp.piece.smear);
    }
    return { w: cam.w, h: cam.h, rgba: resolve(list, cam.w, cam.h, ro), sockets, anim };
  }

  // ---- raw: the volumes before the pixel pass (one ray per pixel at `scale`, smooth light, no ramps, outline or cleanup)
  function raw(model, opt) {
    const cam = camera(model), sc = opt.scale || 8, ps = pieceList(opt.pieces), anim = animName(model, opt.anim || 'idle', opt.pieces), f = opt.frame || 0;
    const W = pose(model, yawOf(model, opt.dir), anim, f, ps.filter(p => p.piece.pose).map(p => p.piece.pose));
    const layers = assemble(model, opt.pieces).map(a => { const mt = matTable(a.layer); return { vol: volumes(a.layer, W, anim, f, mt, partList(a.layer)), mt, pal: palOf(a.layer, a.over), bias: a.layer.bias || 0 }; });
    const w = cam.w * sc, h = cam.h * sc, rgba = new Uint8ClampedArray(w * h * 4), H = norm(sub(cam.L, cam.D));
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const o = add(add(mul(cam.RT, (px + 0.5) / sc - cam.ox), mul(cam.UP, cam.oy - (py + 0.5) / sc)), mul(cam.D, -FAR));
      let best = null, bl = null;
      for (const L of layers) { const hh = nearest(o, cam.D, L.vol); if (hh && (!best || hh.t - L.bias < best.t - bl.bias)) { best = hh; bl = L; } }
      if (!best) continue;
      const M = bl.mt.list[best.q.m], base = bl.pal[best.q.m][Math.min(2, bl.pal[best.q.m].length - 1)];
      const lit = M.flat != null ? 1 : 0.28 + 0.72 * Math.max(0, dot(best.n, cam.L)), gl = M.spec != null ? Math.pow(Math.max(0, dot(best.n, H)), 60) * 0.8 : 0;
      const i = (py * w + px) * 4;
      for (let k = 0; k < 3; k++) rgba[i + k] = base[k] * lit + 255 * gl;
      rgba[i + 3] = 255;
    }
    return { w, h, rgba };
  }

  // ---- sheet: one loadout, rows = directions, columns = every frame of every (logical) anim ----------------------
  function sheet(model, opt = {}) {
    const [w, h] = model.frame, dirs = model.dirs, layout = [];
    for (const a of opt.anims || model.sheetAnims || Object.keys(model.anims)) {
      const real = animName(model, a, opt.pieces);
      for (let f = 0; f < model.anims[real].frames; f++) layout.push([a, f]);
    }
    const SW = w * layout.length, SH = h * dirs.length, rgba = new Uint8ClampedArray(SW * SH * 4), sockets = {};
    dirs.forEach(([dn], r) => {
      sockets[dn] = {};
      layout.forEach(([a, f], c) => {
        const fr = render(model, { dir: dn, anim: a, frame: f, pieces: opt.pieces });
        for (let y = 0; y < h; y++) rgba.set(fr.rgba.subarray(y * w * 4, (y + 1) * w * 4), ((r * h + y) * SW + c * w) * 4);
        (sockets[dn][a] = sockets[dn][a] || [])[f] = fr.sockets;
      });
    });
    return { w: SW, h: SH, rgba, cols: layout.length, rows: dirs.length, layout, frame: [w, h], sockets };
  }

  // ---- bake: the G-buffer sheet of the bare body or of one piece -------------------------------------------------
  // Cells = layer x dir x every frame of every real anim (another weapon class's attack stays empty for a weapon), each
  // cropped to its covered pixels, identical crops stored once, shelf-packed into an atlas PACK px wide (tallest first).
  // meta.cells[(layer * dirs + dir) * frames + col] = [x, y, w, h, frameX, frameY] in the atlas, or 0 when empty.
  // RGBA: R = keep << 7 | material, G = flat << 7 | part << 3 | tone, B = depth (1/6 px steps, 128 = the root), A = coverage
  function bakeLayout(model) {
    const out = [];
    for (const a in model.anims) for (let f = 0; f < model.anims[a].frames; f++) out.push([a, f]);
    return out;
  }
  function bake(model, opt = {}) {
    const cam = camera(model), piece = opt.piece || null, [w, h] = model.frame, layout = bakeLayout(model), dirs = model.dirs;
    const layers = piece ? piece.layers : layersOf(model);
    const SW = w * layout.length, SH = h * dirs.length * layers.length, rgba = new Uint8ClampedArray(SW * SH * 4), sockets = {};
    const skip = a => piece && piece.class && a.includes(':') && a.split(':')[1] !== piece.class;
    dirs.forEach(([dn], r) => {
      sockets[dn] = {};
      layout.forEach(([a, f], c) => {
        if (skip(a)) return;
        const extra = piece && piece.pose ? [piece.pose] : [], W = pose(model, yawOf(model, dn), a, f, extra), hist = history(model, yawOf(model, dn), a, f, extra);
        const rootT = dot(W[model.bones[0].name].t, cam.D) + FAR;
        (sockets[dn][a] = sockets[dn][a] || [])[f] = frameSockets(model, W, cam, piece ? piece.sockets : null);
        layers.forEach((L, li) => {
          const G = raster(L, W, cam, a, f, rootT, hist), y0 = (li * dirs.length + r) * h;   // the full grid first, packed below
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x; if (!G.cov[i]) continue;
            const o = ((y0 + y) * SW + c * w + x) * 4;
            rgba[o] = (G.keep[i] << 7) | G.mat[i]; rgba[o + 1] = (G.flat[i] << 7) | (G.part[i] << 3) | G.tone[i]; rgba[o + 2] = G.dq[i]; rgba[o + 3] = 255;
          }
        });
      });
    });
    const meta = {
      id: piece ? piece.id : 'body', slot: piece ? piece.slot : 'body', family: (piece && piece.family) || null, tier: (piece && piece.tier) || null,
      class: (piece && piece.class) || null, hides: (piece && piece.hides) || [],
      layers: layers.map(L => ({ id: L.id, tag: L.tag || null, group: L.group || (piece ? piece.id : 'body'), mats: matTable(L).names, ramps: matTable(L).list.map(m => m.ramp), parts: partList(L).names })),
      tiers: (piece && piece.tiers) || null, smear: (piece && piece.smear) || null, sockets,
    };
    const P = pack(rgba, SW, w, h, layout.length, dirs.length * layers.length); meta.cells = P.cells;
    return { w: P.w, h: P.h, rgba: P.rgba, meta };
  }
  const PACK = 256;
  function pack(rgba, SW, w, h, cols, rows) {
    const crops = [], uniq = new Map(), cells = [];
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[((rr * h + y) * SW + c * w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) { cells.push(0); continue; }
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1, px = new Uint8ClampedArray(cw * ch * 4);
      for (let y = 0; y < ch; y++) px.set(rgba.subarray(((rr * h + y0 + y) * SW + c * w + x0) * 4, ((rr * h + y0 + y) * SW + c * w + x1 + 1) * 4), y * cw * 4);
      let k = cw + 'x' + ch + ':'; for (let i = 0; i < px.length; i++) k += String.fromCharCode(px[i]);
      if (!uniq.has(k)) { uniq.set(k, crops.length); crops.push({ cw, ch, px, at: null }); }
      cells.push([uniq.get(k), x0, y0]);
    }
    const order = crops.map((q, i) => i).sort((a, b) => crops[b].ch - crops[a].ch || crops[b].cw - crops[a].cw || a - b);
    let sx = 0, sy = 0, sh = 0;
    for (const i of order) { const q = crops[i]; if (sx + q.cw > PACK) { sx = 0; sy += sh; sh = 0; } q.at = [sx, sy]; sx += q.cw; sh = Math.max(sh, q.ch); }
    const AH = Math.max(1, sy + sh), out = new Uint8ClampedArray(PACK * AH * 4);
    for (const q of crops) for (let y = 0; y < q.ch; y++) out.set(q.px.subarray(y * q.cw * 4, (y + 1) * q.cw * 4), ((q.at[1] + y) * PACK + q.at[0]) * 4);
    return { w: PACK, h: AH, rgba: out, cells: cells.map(e => e ? [...crops[e[0]].at, crops[e[0]].cw, crops[e[0]].ch, e[1], e[2]] : 0) };
  }
  const bankInfo = model => ({ frame: model.frame, dirs: model.dirs.map(d => d[0]), layout: bakeLayout(model), anims: Object.keys(model.anims),
    outline: model.outline || null, innerLine: model.innerLine != null ? model.innerLine : 2.5, innerColor: model.innerColor || null, pixel: model.pixel || null,
    smear: Object.fromEntries(Object.keys(model.anims).filter(a => model.anims[a].smear).map(a => [a, model.anims[a].smear])) });
  // bank = { model: bankInfo(model), sheets: { body: { w, rgba, meta }, <pieceId>: { w, rgba, meta } } }  (rgba decoded from PNG)
  function compose(bank, sel) {
    const info = bank.model, [w, h] = info.frame, r = info.dirs.indexOf(sel.dir), N = w * h;
    const ps = (sel.pieces || []).map(p => typeof p === 'string' ? { id: p } : p);
    const wp = ps.map(p => bank.sheets[p.id].meta).find(m => m.class);
    const v = (sel.anim || 'idle') + ':' + (wp ? wp.class : 'none');
    const anim = info.anims.includes(v) ? v : info.anims.includes(sel.anim) ? sel.anim : 'idle';
    const c = info.layout.findIndex(l => l[0] === anim && l[1] === (sel.frame || 0));
    const hidden = new Set(); ps.forEach(p => bank.sheets[p.id].meta.hides.forEach(t => hidden.add(t)));
    const key = interner(), list = [];
    const take = (sh, li, L, over) => {
      const g = { cov: new Uint8Array(N), mat: new Uint8Array(N), part: new Uint8Array(N), tone: new Uint8Array(N), flat: new Uint8Array(N), keep: new Uint8Array(N), dq: new Uint8Array(N) };
      const q = sh.meta.cells[(li * info.dirs.length + r) * info.layout.length + c] || [0, 0, 0, 0, 0, 0];
      for (let y = 0; y < q[3]; y++) for (let x = 0; x < q[2]; x++) {
        const o = ((q[1] + y) * sh.w + q[0] + x) * 4; if (!sh.rgba[o + 3]) continue;
        const i = (q[5] + y) * w + q[4] + x, g2 = sh.rgba[o + 1];
        g.cov[i] = 1; g.mat[i] = sh.rgba[o] & 127; g.keep[i] = sh.rgba[o] >> 7; g.flat[i] = g2 >> 7; g.part[i] = (g2 >> 3) & 15; g.tone[i] = g2 & 7; g.dq[i] = sh.rgba[o + 2];
      }
      list.push({ g, pal: L.mats.map((n, i) => (over && over[n] ? toRamp(over[n]) : L.ramps[i]).map(hexRgb)), keys: L.parts.map(n => key(L.group + ':' + n)) });
    };
    const body = bank.sheets.body;
    body.meta.layers.forEach((L, li) => { if (!hidden.has(L.tag)) take(body, li, L, null); });
    for (const p of ps) {
      const sh = bank.sheets[p.id], over = p.tier != null && sh.meta.tiers ? sh.meta.tiers[p.tier] : p.pal || null;
      sh.meta.layers.forEach((L, li) => take(sh, li, L, over));
    }
    const ro = resolveOpts(info), f = sel.frame || 0, sm = ps.map(p => bank.sheets[p.id].meta).find(m => m.smear);
    if (sm && info.smear && info.smear[anim] && f > 0) { const so = sm.sockets[sel.dir][anim]; ro.smears = smearsOf(info.smear[anim], f, so[f - 1], so[f], sm.smear); }
    return { w, h, rgba: resolve(list, w, h, ro), anim };
  }

  return { render, raw, sheet, bake, bankInfo, compose, ramp, hexRgb, rgbHex };
})();
if (typeof module !== 'undefined') module.exports = FORGE;
