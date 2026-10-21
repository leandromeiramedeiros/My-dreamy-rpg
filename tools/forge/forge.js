'use strict';
// ---------------------------------------------------------------------------
// FORGE — a deterministic sprite renderer. A MODEL (3D volumes on a bone rig + materials + poses) becomes
// pixel-art frames for every facing direction and animation frame. Same model + same options -> the same bytes.
// Pure JS (no canvas, no DOM): runs in node (tools/forge/build.js) or in the browser (global FORGE).
//
//   FORGE.render(model, { dir, anim, frame }) -> { w, h, rgba, sockets:{ name:{ x, y, front } } }
//   FORGE.sheet(model)                        -> { w, h, rgba, cols, rows, layout }  every dir x every frame
//   FORGE.ramp('#rrggbb')                     -> [shadow, low, mid, high] hue-shifted 4-tone ramp (hex)
//
// MODEL = {
//   frame: [w, h], origin: [ox, oy]        frame size and the pixel the feet centre lands on
//   cam: { elev: deg }                     orthographic camera pitch (0 = side-on, 90 = top-down)
//   light: [x, y, z]                       towards the light, camera space (fixed: turning the model re-lights it)
//   tones: [t3, t2, t1]                    n.L thresholds for high / mid / low (below t1 = shadow)
//   outline: '#hex', innerLine: px         outer outline colour; depth jump that draws a dark line between parts
//   mats: { name: '#hex' | [4 hex] | { ramp, flat, lift, tones } }   ramp: '#hex' (auto) or [shadow, low, mid, high];
//                                          flat: one tone, unshaded; lift: lowest lit tone (faces never sink to shadow);
//                                          tones: this material's own thresholds (glossy hair = a smaller highlight)
//   bones: [ { name, parent, at:[x,y,z] } ]  rest offsets in the parent's space; the first bone is the root
//   prims: [ { bone, mat, part?, shape:'ell'|'cap'|'box', ... , clip?:[nx,ny,nz,k] } ]
//            ell: c:[x,y,z], r:[rx,ry,rz]     cap: a, b, ra, rb     box: c, h:[hx,hy,hz], round
//            clip keeps the side where dot(p, n) <= k (cuts a flat face, e.g. a boot sole or a hair line); a list = several cuts
//   stamps: [ { bone, at, n, facing, on?, px:[[dx,dy,'#hex'], ...] } ]  screen-space pixels pinned to a surface point
//            (eyes, blush): drawn only when the point faces the camera, is not hidden behind another volume and (on)
//            lands on that material
//   sockets: { name: { bone, at } }        exported per frame (weapon grip, head top, ...)
//   anims: { name: { frames, pose(f) -> { bone: { rot:[rx,ry,rz], off:[x,y,z], scl:[sx,sy,sz] } } } }
//            scl = squash & stretch: scales the bone's own volumes and its children's offsets (not their volumes)
//   dirs: [ [name, yawDeg], ... ]           yaw 0 faces the camera (S), 90 faces screen-right (E)
// }
// Pipeline per frame: pose the rig -> 3x3 rays per pixel against every volume (SDF march) -> majority vote of
// coverage / part / normal -> one light, quantised into the material ramp -> dark line where a part sits in front
// of another -> orphan-pixel cleanup -> stamps -> outline. No randomness anywhere.
// ---------------------------------------------------------------------------
const FORGE = (function () {
  // ---- vectors / rotations -------------------------------------------------------------------------------------
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
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

  // ---- signed distance functions (local space) ------------------------------------------------------------------
  function sdf(pr, p) {
    let d;
    if (pr.shape === 'ell') {
      const q = sub(p, pr.c), r = pr.r;
      const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]), k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2]));
      d = k1 === 0 ? -Math.min(r[0], r[1], r[2]) : k0 * (k0 - 1) / k1;
    } else if (pr.shape === 'cap') {
      const pa = sub(p, pr.a), ba = sub(pr.b, pr.a), t = clamp(dot(pa, ba) / (dot(ba, ba) || 1), 0, 1);
      d = len(sub(pa, mul(ba, t))) - (pr.ra + (pr.rb - pr.ra) * t);
    } else {                                                     // rounded box
      const q = sub(p, pr.c), rr = pr.round || 0;
      const e = [Math.abs(q[0]) - pr.h[0] + rr, Math.abs(q[1]) - pr.h[1] + rr, Math.abs(q[2]) - pr.h[2] + rr];
      d = len([Math.max(e[0], 0), Math.max(e[1], 0), Math.max(e[2], 0)]) + Math.min(Math.max(e[0], e[1], e[2]), 0) - rr;
    }
    if (pr.clip) for (const c of (Array.isArray(pr.clip[0]) ? pr.clip : [pr.clip])) d = Math.max(d, c[0] * p[0] + c[1] * p[1] + c[2] * p[2] - c[3]);
    return d;
  }
  function bound(pr) {                                          // local bounding sphere [centre, radius]
    if (pr.shape === 'ell') return [pr.c, Math.max(...pr.r)];
    if (pr.shape === 'cap') return [mul(add(pr.a, pr.b), 0.5), len(sub(pr.b, pr.a)) / 2 + Math.max(pr.ra, pr.rb)];
    return [pr.c, len(pr.h)];
  }
  function normalAt(pr, p) {
    const e = 0.02;
    return norm([sdf(pr, [p[0] + e, p[1], p[2]]) - sdf(pr, [p[0] - e, p[1], p[2]]),
      sdf(pr, [p[0], p[1] + e, p[2]]) - sdf(pr, [p[0], p[1] - e, p[2]]),
      sdf(pr, [p[0], p[1], p[2] + e]) - sdf(pr, [p[0], p[1], p[2] - e])]);
  }

  // ---- rig ------------------------------------------------------------------------------------------------------
  function pose(model, yaw, anim, frame) {
    const P = (model.anims[anim] || model.anims.idle).pose(frame) || {}, W = {};
    model.bones.forEach((b, i) => {
      const p = P[b.name] || {}, at = add(b.at, p.off || [0, 0, 0]), sc = p.scl || [1, 1, 1];
      let R = rot(p.rot);
      if (i === 0) { R = mm(ry(yaw), R); W[b.name] = { R, t: mv(ry(yaw), at), s: sc }; return; }
      const par = W[b.parent];
      W[b.name] = { R: mm(par.R, R), t: add(par.t, mv(par.R, [at[0] * par.s[0], at[1] * par.s[1], at[2] * par.s[2]])), s: sc };
    });
    return W;
  }
  const worldPoint = (W, bone, at) => { const B = W[bone]; return add(B.t, mv(B.R, [at[0] * B.s[0], at[1] * B.s[1], at[2] * B.s[2]])); };

  // ---- render one frame -----------------------------------------------------------------------------------------
  const SS = 3, FAR = 200;
  function render(model, opt) {
    const [w, h] = model.frame, [ox, oy] = model.origin;
    const yaw = (opt.yaw != null ? opt.yaw : (model.dirs.find(d => d[0] === opt.dir) || [0, 0])[1]) * Math.PI / 180;
    const e = (model.cam && model.cam.elev != null ? model.cam.elev : 25) * Math.PI / 180;
    const D = [0, -Math.sin(e), -Math.cos(e)], RT = [1, 0, 0], UP = [0, Math.cos(e), -Math.sin(e)];
    const L = norm(model.light || [-0.55, 0.65, 0.52]);
    const T = model.tones || [0.78, 0.3, -0.25];
    const mats = matTable(model);
    const W = pose(model, yaw, opt.anim || 'idle', opt.frame || 0);
    const prims = model.prims.map((pr, i) => {
      const B = W[pr.bone], [bc, br] = bound(pr), s = B.s;
      return { pr, i, R: B.R, t: B.t, s, smin: Math.min(s[0], s[1], s[2]), bc: worldPoint(W, pr.bone, bc), br: br * Math.max(s[0], s[1], s[2]), part: pr.part || pr.bone, mat: pr.mat };
    });
    // per pixel: majority of SS x SS rays
    const N = w * h, part = new Int32Array(N).fill(-1), tone = new Int8Array(N), dep = new Float32Array(N).fill(1e9), mat = new Array(N);
    const partIds = {}; let nextPart = 0;
    const pid = name => partIds[name] != null ? partIds[name] : (partIds[name] = nextPart++);
    const hits = [];
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      hits.length = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = px + (sx + 0.5) / SS - ox, v = oy - (py + (sy + 0.5) / SS);
        const o = add(add(mul(RT, u), mul(UP, v)), mul(D, -FAR));
        let best = null;
        for (const q of prims) {
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
        if (best) hits.push(best);
      }
      if (hits.length < (model.coverage || 4)) continue;
      const cnt = {};                                            // majority part; ties go to the nearest
      for (const hh of hits) { const k = hh.q.part; cnt[k] = cnt[k] || { n: 0, t: 1e9, nn: [0, 0, 0], tt: 0, mat: hh.q.mat }; const C = cnt[k]; C.n++; C.tt += hh.t; C.nn = add(C.nn, hh.n); if (hh.t < C.t) { C.t = hh.t; C.mat = hh.q.mat; } }
      let pick = null, pk = null;
      for (const k in cnt) if (!pick || cnt[k].n > pick.n || (cnt[k].n === pick.n && cnt[k].t < pick.t)) { pick = cnt[k]; pk = k; }
      const i = py * w + px, s = dot(norm(pick.nn), L);
      part[i] = pid(pk); dep[i] = pick.tt / pick.n; mat[i] = pick.mat;
      const M = mats[pick.mat];
      const TT = M.tones || T;
      tone[i] = M.flat != null ? M.flat : Math.max(M.lift || 0, s > TT[0] ? 3 : s > TT[1] ? 2 : s > TT[2] ? 1 : 0);
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : y * w + x;
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // dark line on the far side of a depth jump between two parts (an arm in front of the torso reads as separate)
    const jump = model.innerLine != null ? model.innerLine : 2.5;
    if (jump) {
      const t0 = tone.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (part[i] < 0) continue;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && part[j] >= 0 && part[j] !== part[i] && dep[i] > dep[j] + jump && mats[mat[i]].flat == null) { t0[i] = 0; break; } }
      }
      tone.set(t0);
    }
    // lone material pixel (one stray hand / belt pixel): it joins the commonest neighbouring material and part
    {
      const m0 = mat.slice(), p0 = part.slice(), t0 = tone.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (part[i] < 0) continue;
        const nb = []; for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && part[j] >= 0) nb.push(j); }
        if (nb.length < 3 || nb.some(j => mat[j] === mat[i])) continue;
        const c = {}; nb.forEach(j => { c[mat[j]] = (c[mat[j]] || 0) + 1; });
        const best = nb.reduce((a, j) => c[mat[j]] > c[mat[a]] ? j : a, nb[0]);
        m0[i] = mat[best]; p0[i] = part[best]; t0[i] = tone[best];
      }
      for (let i = 0; i < N; i++) { mat[i] = m0[i]; } part.set(p0); tone.set(t0);
    }
    // orphan cleanup: a lone tone with no same-tone neighbour inside its material takes the commonest neighbour tone
    for (let pass = 0; pass < 2; pass++) {
      const t0 = tone.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (part[i] < 0 || mats[mat[i]].flat != null) continue;
        const nb = []; let same = 0;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && part[j] >= 0 && mat[j] === mat[i]) { nb.push(tone[j]); if (tone[j] === tone[i]) same++; } }
        if (nb.length >= 2 && !same) { const c = [0, 0, 0, 0]; nb.forEach(v => c[v]++); t0[i] = c.indexOf(Math.max(...c)); }
      }
      tone.set(t0);
    }
    // colours
    const rgba = new Uint8ClampedArray(N * 4);
    const put = (i, hex) => { const c = hexRgb(hex); rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255; };
    for (let i = 0; i < N; i++) if (part[i] >= 0) put(i, mats[mat[i]].ramp[tone[i]]);
    // stamps: surface-pinned screen pixels, depth-tested so hair or a hand hides an eye
    const proj = P => [ox + dot(P, RT), oy - dot(P, UP), dot(P, D) + FAR];
    for (const st of model.stamps || []) {
      const P = worldPoint(W, st.bone, st.at), n = mv(W[st.bone].R, norm(st.n || [0, 0, 1]));
      if (-dot(n, D) < (st.facing != null ? st.facing : 0.3)) continue;
      const [sx, sy, st0] = proj(P), x0 = Math.floor(sx), y0 = Math.floor(sy), i0 = at(x0, y0);
      if (i0 < 0 || part[i0] < 0 || Math.abs(dep[i0] - st0) > (st.depthTol || 2.5) || (st.on && mat[i0] !== st.on)) continue;
      for (const [dx, dy, col] of st.px) { const j = at(x0 + dx, y0 + dy); if (j >= 0 && part[j] >= 0) put(j, col); }
    }
    // outline: every empty pixel touching the sprite
    if (model.outline) {
      const solid = new Uint8Array(N); for (let i = 0; i < N; i++) solid[i] = part[i] >= 0 ? 1 : 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (solid[i]) continue;
        for (const [dx, dy] of N4) { const j = at(x + dx, y + dy); if (j >= 0 && solid[j]) { put(i, model.outline); break; } }
      }
    }
    // sockets: projected anchor + whether it sits in front of the root
    const sockets = {};
    const rootT = proj(W[model.bones[0].name].t)[2];
    for (const k in model.sockets || {}) {
      const s = model.sockets[k], [x, y, t] = proj(worldPoint(W, s.bone, s.at));
      sockets[k] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, front: t < rootT };
    }
    return { w, h, rgba, sockets };
  }
  function matTable(model) {
    if (model._mats) return model._mats;
    const out = {};
    for (const k in model.mats) {
      const m = model.mats[k], o = typeof m === 'string' ? { ramp: ramp(m) } : Array.isArray(m) ? { ramp: m } : Object.assign({}, m);
      if (typeof o.ramp === 'string') o.ramp = ramp(o.ramp);
      out[k] = o;
    }
    return (model._mats = out);
  }

  // ---- sheet: rows = directions, columns = every frame of every animation (in model.anims order) -------------
  function sheet(model, opt = {}) {
    const [w, h] = model.frame, dirs = model.dirs, layout = [];
    for (const a in model.anims) for (let f = 0; f < model.anims[a].frames; f++) layout.push([a, f]);
    const W = w * layout.length, H = h * dirs.length, rgba = new Uint8ClampedArray(W * H * 4), meta = {};
    dirs.forEach(([dn], r) => {
      meta[dn] = {};
      layout.forEach(([a, f], c) => {
        const fr = render(model, { dir: dn, anim: a, frame: f });
        for (let y = 0; y < h; y++) rgba.set(fr.rgba.subarray(y * w * 4, (y + 1) * w * 4), ((r * h + y) * W + c * w) * 4);
        (meta[dn][a] = meta[dn][a] || [])[f] = fr.sockets;
      });
    });
    return { w: W, h: H, rgba, cols: layout.length, rows: dirs.length, layout, frame: [w, h], sockets: meta };
  }

  return { render, sheet, ramp, hexRgb, rgbHex };
})();
if (typeof module !== 'undefined') module.exports = FORGE;
