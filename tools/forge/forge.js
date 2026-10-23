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
// equals the offline render pixel for pixel. The game runs B from js/forge-rt.js: build.js copies the <rt> blocks below
// into it (tools/forge-rt-check.js checks they match and that the browser's frames equal render()).
//
//   FORGE.render(model, { dir, anim, frame, pieces })  -> { w, h, rgba, sockets, anim }
//   FORGE.sheet(model, { pieces, anims })              -> one loadout, rows = dirs, cols = every frame of every anim
//     render / sheet opt-in { normals: true }          -> also .nrm: an RGBA normal sheet on the same grid (tools/export/art.js
//                                                         _n.png; screen x right / y up / z out; off = the same bytes as before)
//   FORGE.bake(model, { piece? | group?, anims? })     -> { w, h, rgba (encoded G-buffer sheet), meta, empty } for a piece or a
//                                                         base group ('body', 'hair'; every base layer when neither), for
//                                                         the given anims only (default: all)
//   FORGE.bankSplit(model)                             -> [[suffix, anims]]: how a unit is banked (core, atk.<class> ...)
//   FORGE.compose(bank, { dir, anim, frame, pieces })  -> RGBA of one frame from baked sheets (the game's runtime path)
//   FORGE.rt.{ prepare, composeInto, socketsAt, layoutOf, animOf, rim }  the runtime's per-loadout composer (forge-rt.js)
//   FORGE.sockets(model, { dir, anim, frame, pieces })  -> the frame's sockets only (no raster)
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
//   ownOutline: { <slot>: true }           default per slot (weapon, offhand, head, chest, boots, back ...): that gear draws its
//                                          own outline over other units (see the piece's ownOutline); none = depth jumps only
//   pixel: { normalSteps }                 opt-in hand-pixel pass: posterised normals, spur removal, clusters >= 2 px
//   sheetAnims: ['idle', 'walk', ...]      the columns of a loadout sheet (default: every anim)
//   bankSheets: { die: ['death'] }      bake: more sheets carved out of core (see bankSplit)
//   flatDepth: true                        bake only (a one-layer rig with no pieces: the enemies): each part bakes one depth,
//                                          a pixel keeps its own only where that would flip a seam test (see flatDq). Stage B
//                                          reads depth only to stack layers (one layer: nothing to stack) and in the seam test
//                                          between two parts, so compose() still equals render(); depth was most of the bytes
//   springs: [ SPRING ]                    deterministic secondary motion (cape, hair locks), see chainDirs
//   layers: [ LAYER ]                      the bare body; a v1 model (mats / prims / stamps at the top level) = one layer
// }
// LAYER = { id, tag?, group?, bias?, mats, prims, stamps }
//   PIECE.ownOutline: true | false         this piece's edge over ANOTHER unit (the body, another piece) gets the outline
//                                          colour, whatever the depth jump (a held shield, a blade across the torso); the
//                                          line goes on the far pixel, like the outer outline; unset = the rig's slot default
//   tag: what equipment can hide (a helm hides 'hair');  group: parts of one group never get a dark line between them;
//   bias: px towards the camera when stacking (cloth over a body that pokes through it by less than that)
//   mats: { name: '#hex' | [hex...] | { ramp, flat, lift, tones, spec } }   ramp: '#hex' (auto) or [shadow, low, mid, high, (spec)];
//         flat: one tone, unshaded, never cleaned up;  lift: lowest lit tone (faces never sink to shadow);  tones: own thresholds;
//         spec: n.H above this takes the ramp's last colour (a small glint on metal and gems);
//         fine: fine detail (1 px feather tips, straps, filigree): shaded as usual, but model.pixel's extra cleanup skips it:
//               no spur, lone-material or cluster pass, orphan tones by the default rule (seams, outline as usual); the
//               lint skips its pixels (board.js, tiers.js: render().fine / sheet().fine). keep: the same flag, older name
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
// PIECE = { id, slot, family?, tier?, class?, hides:[tags], layers:[LAYER], pose?(anim, f), tiers?:[ { mat: ramp } ], sockets?, smear? }
//   smear: '#hex' a weapon with a 'tip' socket draws the anim's smear frames in this flat colour (hand -> tip path)
//   family + tier: one baked piece per shape tier (knighthelm.t3); tiers: palette-only variants of one baked piece
//   pose: partial poses for bones ONLY this piece uses (a weapon's hold); class: 'sword' | 'staff' | 'bow' ...
// Pose: rot = Euler [rx, ry, rz] relative to the parent. aim / point = a direction in model space (before the facing yaw):
//   aim lays the bone's +y along it (weapons), point lays its -y along it (limbs); roll hints where +z goes.
//   off moves the joint, scl squashes / stretches the bone's own volumes and scales its children's offsets.
// SPRING = { bones: [b0, b1, ...], segs: [px, ...], rest: [x, y, z], space: 'model' | 'parent', k, damp, bend, gain: [x, y, z],
//            counter?: { anims, bone, at, gain }, max: { side, back, fwd }, scl?, warm? }
//   a chain of bones (b0 a child of some rig bone, each next one a child of the one before at [0, -seg, 0]) hung from
//   b0's joint; each bone's -y runs down its segment. The chain is simulated in model space (yaw 0), so it is the same
//   in every direction and depends on (anim, frame) only: see chainDirs. Segment lengths never change.
// ---------------------------------------------------------------------------
const FORGE = (function () {
  // <rt>
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
  // </rt>

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
    for (const pr of layer.prims || []) addHex(pr.mat);
    if (names.length > 128) throw new Error(`layer ${layer.id}: ${names.length} materials (128 at most)`);
    const index = {}; names.forEach((n, i) => { index[n] = i; });
    return (layer._mt = { names, list, index });
  }
  function partList(layer) {                                    // part names in prim order (stable: the baked index)
    if (layer._pl) return layer._pl;
    const names = [], index = {};
    for (const pr of layer.prims || []) { const n = pr.part || pr.bone; if (index[n] == null) { index[n] = names.length; names.push(n); } }
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
    for (const L of layersOf(model)) if (!hidden.has(L.tag)) out.push({ layer: L, group: L.group || 'body', over: null, unit: 0, own: false });
    ps.forEach((p, k) => {
      const over = p.tier != null && p.piece.tiers ? p.piece.tiers[p.tier] : p.pal || null, own = ownOf(model.ownOutline, p.piece.ownOutline, p.piece.slot);
      for (const L of p.piece.layers) out.push({ layer: L, group: L.group || p.piece.id, over, unit: k + 1, own });
    });
    return out;
  }
  function animName(model, anim, pieces) {                      // 'attack' -> 'attack:<weapon class>' when the model has it
    const wp = pieceList(pieces).find(p => p.piece.class);
    const v = anim + ':' + (wp ? wp.piece.class : 'none');
    return model.anims[v] ? v : model.anims[anim] ? anim : 'idle';
  }

  // ---- rig ------------------------------------------------------------------------------------------------------
  // bare: the anim's own pose only, no spring chains (what the chain simulation itself is driven by)
  function pose(model, yaw, anim, frame, extra, bare) {
    const P = Object.assign({}, (model.anims[anim] || model.anims.idle).pose(frame) || {});
    for (const fn of extra || []) { const q = fn(anim, frame) || {}; for (const k in q) P[k] = Object.assign({}, P[k] || {}, q[k]); }
    const C = !bare && model.springs ? chainDirs(model, anim, frame) : null;
    const Y = ry(yaw), W = {};
    model.bones.forEach((b, i) => {
      const p = P[b.name] || {}, c = C && C[b.name], at = add(b.at, p.off || [0, 0, 0]), s = (c && c.scl) || p.scl || [1, 1, 1], par = i ? W[b.parent] : null;
      let R;
      if (c) {                                                  // a spring bone: its -y laid along the simulated direction as
        const l = mtv(par.R, mv(Y, c.d));                        // a turn about the parent's x, then z (no roll: a flat sheet
        R = mm(par.R, mm(rx(Math.atan2(-l[2], -l[1])), rz(Math.asin(clamp(l[0], -1, 1)))));   // never flips over)
      } else R = (p.aim || p.point) ? mm(Y, mm(look(p.aim || mul(p.point, -1), p.roll), rot(p.rot))) : mm(par ? par.R : Y, rot(p.rot));
      const t = par ? add(par.t, mv(par.R, [at[0] * par.s[0], at[1] * par.s[1], at[2] * par.s[2]])) : mv(Y, at);
      W[b.name] = { R, t, s };
    });
    return W;
  }
  const worldPoint = (W, bone, at) => { const B = W[bone]; return add(B.t, mv(B.R, [at[0] * B.s[0], at[1] * B.s[1], at[2] * B.s[2]])); };

  // ---- spring chains: deterministic secondary motion (a cape, hair locks) ---------------------------------------
  // Per spring and anim, a chain of points (the joints) hangs from the first bone's joint and is integrated in model space
  // (yaw 0, so all 8 directions share it) in 5 ms steps: each point is pulled towards its rest place (the segment before
  // it continued, blended with `rest` by `bend`) with stiffness k, its velocity damped by `damp`, then put back at its
  // segment's fixed length (follow the leader: the chain never stretches) inside the angle limits `max` (side, back,
  // fwd: radians off rest). It is driven by the anim's own pose: the joint's path x `gain` per model axis (the chest's
  // twist and bob swing the cape), plus in `counter.anims` a rig point's path x counter.gain (the sword arm: the cape
  // swings against the blade). Between two frames the drive moves linearly over the first one's ms. A looping anim
  // (model.loops, default idle and walk) runs `warm` whole loops first; any other anim holds its frame 0 that long, then
  // plays. The segment directions at each frame's start are the result: a pure function of (anim, frame), memoised.
  // rest: model space ('model': a cape hangs by gravity) or the parent bone's space at that frame ('parent': hair).
// k, damp and gain can be given per anim: { walk: .., other: .. }; counter.until: the counter point holds after that frame
// (the recover frames do not throw the cape again, so it settles).
  const STEP = 5;
  const angOf = d => [Math.asin(clamp(d[0], -1, 1)), Math.atan2(-d[2], -d[1])];          // [side (+x), pitch (+ = back, -z)]
  const dirOf = (sd, pt) => [Math.sin(sd), -Math.cos(sd) * Math.cos(pt), -Math.cos(sd) * Math.sin(pt)];
  function chainDirs(model, anim, frame) {
    const out = {};
    for (const sp of model.springs) {
      const memo = sp._memo || (sp._memo = {}), dirs = memo[anim] || (memo[anim] = simulate(model, sp, anim));
      const fr = dirs[clamp(frame, 0, dirs.length - 1)]; sp.bones.forEach((b, k) => { out[b] = { d: fr[k], scl: sp.scl || null }; });
    }
    return out;
  }
  function simulate(model, sp, anim) {
    const A = model.anims[anim] || model.anims.idle, n = A.frames, ms = A.ms || new Array(n).fill(100), base = anim.split(':')[0];
    const loop = (model.loops || ['idle', 'walk']).includes(base), b0 = model.bones.find(b => b.name === sp.bones[0]), m = sp.segs.length;
    const per = v => v == null || typeof v === 'number' || Array.isArray(v) ? v : v[base] != null ? v[base] : v.other;
    const g = per(sp.gain) || [1, 1, 1], ct = sp.counter && sp.counter.anims.includes(base) ? sp.counter : null, keys = [];
    for (let f = 0; f < n; f++) {
      const W = pose(model, 0, anim, f, null, true), a = worldPoint(W, b0.parent, b0.at);
      let drive = [a[0] * g[0], a[1] * g[1], a[2] * g[2]];
      if (ct) drive = add(drive, mul(worldPoint(f > (ct.until != null ? ct.until : n) ? pose(model, 0, anim, ct.until, null, true) : W, ct.bone, ct.at), ct.gain));
      keys.push({ drive, rest: norm(sp.space === 'parent' ? mv(W[b0.parent].R, sp.rest) : sp.rest) });
    }
    const lerp = (p, q, t) => add(mul(p, 1 - t), mul(q, t));
    const at = (f, t) => {                                       // drive and rest t of the way through frame f
      const k0 = keys[f], k1 = loop ? keys[(f + 1) % n] : keys[Math.min(f + 1, n - 1)];
      return { drive: lerp(k0.drive, k1.drive, t), rest: norm(lerp(k0.rest, k1.rest, t)) };
    };
    const mx = sp.max || {}, side = mx.side != null ? mx.side : 0.5, back = mx.back != null ? mx.back : 0.5, fwd = mx.fwd != null ? mx.fwd : 0.5;
    const K = per(sp.k), D = per(sp.damp), bend = sp.bend || 0, dt = STEP / 1000;
    let x = null, px = null;
    const step = (drive, rest) => {
      if (!x) { x = [drive]; for (let k = 0; k < m; k++) x.push(add(x[k], mul(rest, sp.segs[k]))); px = x.map(v => v.slice()); }
      x[0] = drive; px[0] = drive;
      const r0 = angOf(rest);
      for (let k = 1; k <= m; k++) {
        const prev = k > 1 ? norm(sub(x[k - 1], x[k - 2])) : rest, want = norm(add(mul(rest, 1 - bend), mul(prev, bend)));
        const tgt = add(x[k - 1], mul(want, sp.segs[k - 1])), v = mul(sub(x[k], px[k]), Math.max(0, 1 - D * dt));
        px[k] = x[k]; x[k] = add(add(x[k], v), mul(sub(tgt, x[k]), K * dt * dt));
        const a = angOf(norm(sub(x[k], x[k - 1])));             // the segment's angles, kept inside the limits around rest
        x[k] = add(x[k - 1], mul(dirOf(clamp(a[0], r0[0] - side, r0[0] + side), clamp(a[1], r0[1] - fwd, r0[1] + back)), sp.segs[k - 1]));
      }
    };
    const run = (f, hold) => { const S = Math.max(1, Math.round(ms[f] / STEP)); for (let i = 0; i < S; i++) { const q = hold ? keys[f] : at(f, i / S); step(q.drive, q.rest); } };
    const warm = sp.warm || 4, res = [];
    if (loop) { for (let w = 0; w < warm; w++) for (let f = 0; f < n; f++) run(f); }
    else { const S = Math.round(warm * ms.reduce((p, q) => p + q, 0) / ms[0]); for (let w = 0; w < S; w++) run(0, true); }
    for (let f = 0; f < n; f++) { res.push(sp.segs.map((_, k) => norm(sub(x[k + 1], x[k])))); run(f); }
    return res;
  }

  // ---- stage A: rasterise one layer -----------------------------------------------------------------------------
  const SS = 3, FAR = 200;                                     // 3x3 rays per pixel; depth: QS steps per px around the root
  function camera(model) {
    const e = (model.cam && model.cam.elev != null ? model.cam.elev : 25) * Math.PI / 180;
    return { w: model.frame[0], h: model.frame[1], ox: model.origin[0], oy: model.origin[1],
      D: [0, -Math.sin(e), -Math.cos(e)], RT: [1, 0, 0], UP: [0, Math.cos(e), -Math.sin(e)],
      L: norm(model.light || [-0.55, 0.65, 0.52]), T: model.tones || [0.78, 0.3, -0.25], cover: model.coverage || 4,
      nsteps: (model.pixel && model.pixel.normalSteps) || 0 };
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
  function raster(layer, W, cam, anim, frame, rootT) {
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
      G.flat[i] = M.flat != null ? 1 : 0; G.keep[i] = M.fine || M.keep ? 1 : 0;
      let tn = 0; for (let k = 0; k < TT.length; k++) if (s > TT[k]) { tn = TT.length - k; break; }
      G.tone[i] = M.flat != null ? M.flat : M.spec != null && dot(nn, H) > M.spec ? M.ramp.length - 1 : Math.max(M.lift || 0, tn);
      if (cam.normals) {                                         // opt-in (render opt.normals, the export's _n sheets): the smooth
        const n0 = norm(pick.nn);                                // normal before posterising, in screen space (x right, y up, z out)
        if (!G.nrm) G.nrm = new Float32Array(N * 3);
        G.nrm[i * 3] = dot(n0, RT); G.nrm[i * 3 + 1] = dot(n0, UP); G.nrm[i * 3 + 2] = -dot(n0, D);
      }
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
    for (let i = 0; i < N; i++) if (G.cov[i]) G.dq[i] = clamp(128 + Math.round((rootT - dep[i] + bias) * QS), 1, 255);
    return G;
  }

  // <rt> (this block and the other <rt> blocks are copied into js/forge-rt.js by build.js: the game runs this same code)
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
  // </rt>

  // ---- render one frame of a loadout ----------------------------------------------------------------------------
  const yawOf = (model, dir) => ((model.dirs.find(d => d[0] === dir) || [0, 0])[1]) * Math.PI / 180;
  function frameSockets(model, W, cam, extra, only) {           // only: just these names
    const proj = P => [cam.ox + dot(P, cam.RT), cam.oy - dot(P, cam.UP), dot(P, cam.D)];
    const rootT = proj(W[model.bones[0].name].t)[2], out = {}, all = Object.assign({}, model.sockets || {}, extra || {});
    for (const k in all) {
      const s = all[k]; if (!W[s.bone] || (only && !only.includes(k))) continue;
      const [x, y, t] = proj(worldPoint(W, s.bone, s.at));
      out[k] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: Math.round((t - rootT) * 10) / 10, front: t < rootT };
    }
    return out;
  }
  function render(model, opt) {
    const cam = camera(model), stack = assemble(model, opt.pieces), ps = pieceList(opt.pieces);
    if (opt.normals) cam.normals = true;                         // opt-in: also return nrm (see the end of render)
    const anim = animName(model, opt.anim || 'idle', opt.pieces), f = opt.frame || 0;
    const yaw0 = opt.yaw != null ? opt.yaw * Math.PI / 180 : yawOf(model, opt.dir), extra = ps.filter(p => p.piece.pose).map(p => p.piece.pose);
    const W = pose(model, yaw0, anim, f, extra);
    const rootT = dot(W[model.bones[0].name].t, cam.D) + FAR, key = interner();
    const list = stack.map(a => ({ g: raster(a.layer, W, cam, anim, f, rootT), pal: palOf(a.layer, a.over), keys: partList(a.layer).names.map(n => key(a.group + ':' + n)) }));
    const extraS = Object.assign({}, ...ps.map(p => p.piece.sockets || {})), sockets = frameSockets(model, W, cam, extraS);
    const ro = withOwn(resolveOpts(model), stack), A = model.anims[anim], wp = ps.find(p => p.piece.smear);
    if (A.smear && A.smear[f] && wp && f > 0) {
      const yaw = opt.yaw != null ? opt.yaw * Math.PI / 180 : yawOf(model, opt.dir);
      const W0 = pose(model, yaw, anim, f - 1, ps.filter(p => p.piece.pose).map(p => p.piece.pose));
      ro.smears = smearsOf(A.smear, f, frameSockets(model, W0, cam, extraS), sockets, wp.piece.smear);
    }
    const rgba = resolve(list, cam.w, cam.h, ro), N = cam.w * cam.h, fine = new Uint8Array(N);
    for (let i = 0; i < N; i++) fine[i] = RS.M[i] >= 0 && RS.KP[i] ? 1 : 0;     // drawn by a fine material (the lint skips it)
    const out = { w: cam.w, h: cam.h, rgba, fine, sockets, anim };
    if (opt.normals) out.nrm = normalMap(list, rgba, N);
    return out;
  }
  // opt-in normal map of a resolved frame (RGBA8, x right / y up / z out mapped to 0..255, alpha = the colour's alpha): the
  // winning layer's smooth normal per pixel; outline and seam pixels with no winner get a flat (0, 0, 1)
  function normalMap(list, rgba, N) {
    const out = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      if (!rgba[i * 4 + 3]) continue;
      const m = RS.M[i], g = m >= 0 ? list[m >> 8].g : null, n = g && g.nrm && g.cov[i] ? [g.nrm[i * 3], g.nrm[i * 3 + 1], g.nrm[i * 3 + 2]] : [0, 0, 1];
      out[i * 4] = Math.round((n[0] * 0.5 + 0.5) * 255); out[i * 4 + 1] = Math.round((n[1] * 0.5 + 0.5) * 255); out[i * 4 + 2] = Math.round((n[2] * 0.5 + 0.5) * 255); out[i * 4 + 3] = rgba[i * 4 + 3];
    }
    return out;
  }

  // ---- sockets only (no raster): the rig's and the pieces' sockets of one frame, for measuring (board.js cape lengths)
  function sockets(model, opt) {
    const ps = pieceList(opt.pieces), anim = animName(model, opt.anim || 'idle', opt.pieces), f = opt.frame || 0;
    const W = pose(model, opt.yaw != null ? opt.yaw * Math.PI / 180 : yawOf(model, opt.dir), anim, f, ps.filter(p => p.piece.pose).map(p => p.piece.pose));
    return frameSockets(model, W, camera(model), Object.assign({}, ...ps.map(p => p.piece.sockets || {})));
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
    const SW = w * layout.length, SH = h * dirs.length, rgba = new Uint8ClampedArray(SW * SH * 4), fine = new Uint8Array(SW * SH), sockets = {};
    const nrm = opt.normals ? new Uint8ClampedArray(SW * SH * 4) : null;   // opt-in: the normal sheet, same grid
    dirs.forEach(([dn], r) => {
      sockets[dn] = {};
      layout.forEach(([a, f], c) => {
        const fr = render(model, nrm ? { dir: dn, anim: a, frame: f, pieces: opt.pieces, normals: true } : { dir: dn, anim: a, frame: f, pieces: opt.pieces });
        for (let y = 0; y < h; y++) { rgba.set(fr.rgba.subarray(y * w * 4, (y + 1) * w * 4), ((r * h + y) * SW + c * w) * 4); fine.set(fr.fine.subarray(y * w, (y + 1) * w), (r * h + y) * SW + c * w); }
        if (nrm) for (let y = 0; y < h; y++) nrm.set(fr.nrm.subarray(y * w * 4, (y + 1) * w * 4), ((r * h + y) * SW + c * w) * 4);
        (sockets[dn][a] = sockets[dn][a] || [])[f] = fr.sockets;
      });
    });
    const out = { w: SW, h: SH, rgba, fine, cols: layout.length, rows: dirs.length, layout, frame: [w, h], sockets };
    if (nrm) out.nrm = nrm;
    return out;
  }

  // ---- bake: the G-buffer sheet of one UNIT (a base group of the rig: 'body', 'hair'; or a piece) ---------------
  // A unit can be split over several sheets by anim (opt.anims; every anim by default): build.js banks <unit>.core (every
  // anim but the attacks) + <unit>.atk.<class> (one weapon class's attack), so the game decodes only what it draws.
  // Cells = layer x dir x every frame of the sheet's anims (another weapon class's attack stays empty for a weapon), each
  // cropped to its covered pixels, identical crops stored once, shelf-packed into an atlas PACK px wide (tallest first).
  // meta.cells[(layer * dirs + dir) * cols + col] = [x, y, w, h, frameX, frameY] in the atlas, or 0 when empty; cols / col
  // = the sheet's own layout (bakeLayout filtered to meta.anims). meta.sockets[dir][anim][frame]: the rig's sockets on the
  // 'body' unit, a piece's own sockets on the piece (+ the rig's when it draws smears), none on other base units.
  // RGBA: R = keep << 7 | material, G = flat << 7 | part << 3 | tone, B = depth (1/6 px steps, 128 = the root), A = coverage
  function bakeLayout(model, anims) {
    const out = [];
    for (const a in model.anims) if (!anims || anims.includes(a)) for (let f = 0; f < model.anims[a].frames; f++) out.push([a, f]);
    return out;
  }
  function baseUnits(model) {                                   // runs of consecutive base layers of one group (layer order kept)
    const out = [];
    for (const L of layersOf(model)) {
      const g = L.group || 'body', last = out[out.length - 1];
      if (last && last.id === g) last.layers.push(L);
      else { if (out.some(u => u.id === g)) throw new Error(`model: base group ${g} is not one run of layers`); out.push({ id: g, layers: [L] }); }
    }
    return out;
  }
  function bake(model, opt = {}) {
    const cam = camera(model), piece = opt.piece || null, [w, h] = model.frame, layout = bakeLayout(model, opt.anims), dirs = model.dirs;
    const unit = piece ? null : opt.group ? baseUnits(model).find(u => u.id === opt.group) : null;
    if (opt.group && !unit) throw new Error(`model: no base group ${opt.group}`);
    const layers = piece ? piece.layers : unit ? unit.layers : layersOf(model), flat = !!model.flatDepth, jq = resolveOpts(model).jumpQ;
    if (flat && (piece || layersOf(model).length > 1)) throw new Error('model: flatDepth needs a one-layer rig and no pieces');
    const SW = w * layout.length, SH = h * dirs.length * layers.length, rgba = new Uint8ClampedArray(SW * SH * 4);
    const skip = a => piece && piece.class && a.includes(':') && a.split(':')[1] !== piece.class;
    // sockets: the rig's on the body (or an unsplit bake), a piece's own (+ the rig's for a smear), none on hair & co
    const sk = piece ? (piece.smear ? null : Object.keys(piece.sockets || {})) : unit && unit.id !== 'body' ? [] : null;
    const sockets = sk && !sk.length ? null : {};
    dirs.forEach(([dn], r) => {
      if (sockets) sockets[dn] = {};
      layout.forEach(([a, f], c) => {
        if (skip(a)) return;
        const extra = piece && piece.pose ? [piece.pose] : [], W = pose(model, yawOf(model, dn), a, f, extra);
        const rootT = dot(W[model.bones[0].name].t, cam.D) + FAR;
        if (sockets) (sockets[dn][a] = sockets[dn][a] || [])[f] = frameSockets(model, W, cam, piece ? piece.sockets : null, sk);
        layers.forEach((L, li) => {
          const G = raster(L, W, cam, a, f, rootT), y0 = (li * dirs.length + r) * h;   // the full grid first, packed below
          const DQ = flat ? flatDq(G, w, h, jq) : G.dq;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x; if (!G.cov[i]) continue;
            const o = ((y0 + y) * SW + c * w + x) * 4;
            rgba[o] = (G.keep[i] << 7) | G.mat[i]; rgba[o + 1] = (G.flat[i] << 7) | (G.part[i] << 3) | G.tone[i]; rgba[o + 2] = DQ[i]; rgba[o + 3] = 255;
          }
        });
      });
    });
    const id = piece ? piece.id : unit ? unit.id : 'body';
    const meta = {
      id, slot: piece ? piece.slot : 'body', family: (piece && piece.family) || null, tier: (piece && piece.tier) || null,
      class: (piece && piece.class) || null, hides: (piece && piece.hides) || [], anims: opt.anims || null,
      layers: layers.map(L => ({ id: L.id, tag: L.tag || null, group: L.group || (piece ? piece.id : 'body'), mats: matTable(L).names, ramps: matTable(L).list.map(m => m.ramp), parts: partList(L).names })),
      tiers: (piece && piece.tiers) || null, smear: (piece && piece.smear) || null, sockets,
    };
    if (sockets) meta.sockets = packSockets(sockets);
    if (piece && piece.ownOutline != null) meta.own = !!piece.ownOutline;
    const P = pack(rgba, SW, w, h, layout.length, dirs.length * layers.length); meta.cells = P.cells;
    return { w: P.w, h: P.h, rgba: P.rgba, meta, empty: !P.cells.some(c => c) };
  }
  // flatDepth: the seam test (each 4-neighbour pair of two parts: is one deeper than the other by more than jumpQ?) is all
  // stage B reads of a one-layer frame's depth, so each part bakes ONE depth (the median of its border pixels) and only the
  // pixels of a pair that this would flip keep their own (grown until no pair flips): the channel becomes a part map
  function flatDq(G, w, h, jq) {
    const N = w * h, pairs = [], pd = [], own = new Uint8Array(N), out = new Uint8Array(N), by = {};
    for (let i = 0; i < N; i++) if (G.cov[i]) {
      const x = i % w;
      for (const j of [x + 1 < w ? i + 1 : -1, i + w < N ? i + w : -1]) if (j >= 0 && G.cov[j] && G.part[j] !== G.part[i]) {
        pairs.push(i, j); (by[G.part[i]] = by[G.part[i]] || []).push(G.dq[i]); (by[G.part[j]] = by[G.part[j]] || []).push(G.dq[j]);
      }
    }
    for (const p in by) { const v = by[p].sort((a, b) => a - b); pd[p] = v[v.length >> 1]; }
    const val = i => own[i] ? G.dq[i] : pd[G.part[i]] != null ? pd[G.part[i]] : 128;
    for (let changed = true; changed;) {
      changed = false;
      for (let k = 0; k < pairs.length; k += 2) {
        const i = pairs[k], j = pairs[k + 1], a = G.dq[i], b = G.dq[j], A = val(i), B = val(j);
        if ((b > a + jq) !== (B > A + jq) || (a > b + jq) !== (A > B + jq)) { if (!own[i] || !own[j]) changed = true; own[i] = own[j] = 1; }
      }
    }
    for (let i = 0; i < N; i++) if (G.cov[i]) out[i] = val(i);
    return out;
  }
  // sockets in a bank: { names, v: { dir: { anim: [x * 10, y * 10, d * 10, front 0 | 1] per name per frame, flat } } }
  function packSockets(S) {
    const names = []; for (const d in S) for (const a in S[d]) for (const fr of S[d][a]) for (const k in fr || {}) if (!names.includes(k)) names.push(k);
    const v = {};
    for (const d in S) { v[d] = {}; for (const a in S[d]) v[d][a] = [].concat(...S[d][a].map(fr => [].concat(...names.map(k => fr && fr[k] ? [Math.round(fr[k].x * 10), Math.round(fr[k].y * 10), Math.round(fr[k].d * 10), fr[k].front ? 1 : 0] : [0, 0, 0, 0])))); }
    return { names, v };
  }
  // how build.js splits a unit: [suffix, anims] per sheet: 'core' = every anim but the attacks, 'atk.<class>' = one attack
  // model.bankSheets: { <suffix>: [anims] } carves more sheets out of core (a big enemy's 'die': death + hit, so no sheet
  // passes the 64 KB cap); none = the classic split
  function bankSplit(model) {
    const all = Object.keys(model.anims), atk = all.filter(a => a.split(':')[0] === 'attack'), more = model.bankSheets || {};
    const carved = new Set([].concat(...Object.values(more)));
    return [['core', all.filter(a => !atk.includes(a) && !carved.has(a))], ...Object.keys(more).map(k => [k, more[k].filter(a => all.includes(a) && !atk.includes(a))]),
      ...atk.map(a => ['atk.' + (a.split(':')[1] || 'any'), [a]])];
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
  const bankInfo = model => ({ frame: model.frame, origin: model.origin, dirs: model.dirs.map(d => d[0]), layout: bakeLayout(model), anims: Object.keys(model.anims),
    sheetAnims: model.sheetAnims || Object.keys(model.anims), base: baseUnits(model).map(u => u.id),
    outline: model.outline || null, innerLine: model.innerLine != null ? model.innerLine : 2.5, innerColor: model.innerColor || null, pixel: model.pixel || null,
    smear: Object.fromEntries(Object.keys(model.anims).filter(a => model.anims[a].smear).map(a => [a, model.anims[a].smear])),
    ...(model.ownOutline ? { ownOutline: model.ownOutline } : {}) });

  // <rt>
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
  // </rt>
  const hidden_ = (o, k, v) => Object.defineProperty(o, k, { value: v, configurable: true, writable: true, enumerable: false });
  function compose(bank, sel) {                                 // one frame, fresh RGBA (tools; the game uses forge-rt.js)
    const n = Object.keys(bank.sheets).length, k = JSON.stringify(sel.pieces || []);
    if (!bank._prep || bank._prepN !== n) { hidden_(bank, '_prep', new Map()); hidden_(bank, '_prepN', n); }
    let P = bank._prep.get(k); if (!P) bank._prep.set(k, P = prepare(bank, sel.pieces));
    const [w, h] = bank.model.frame, rgba = new Uint8ClampedArray(w * h * 4);
    const anim = composeInto(P, sel.dir, sel.anim || 'idle', sel.frame || 0, rgba, w, 0, 0);
    return { w, h, rgba, anim };
  }

  return { render, raw, sheet, bake, bankInfo, bankSplit, compose, sockets, ramp, hexRgb, rgbHex,
    rt: { prepare, composeInto, socketsAt, layoutOf, animOf, rim: () => rimOf(RS) } };
})();
if (typeof module !== 'undefined') module.exports = FORGE;
