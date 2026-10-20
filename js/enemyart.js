'use strict';
// ---------------------------------------------------------------------------
// ENEMY_ART — procedural pixel-art enemy sprites (Canvas 2D, no image files). One global: ENEMY_ART.
// Needs only util.js (makeCanvas, hexToRgb). Not wired into index.html yet; nothing else reads it.
// All sprites face RIGHT (use flipH() from util.js for left). Built lazily, cached per (key, anim, frame).
//
//   ENEMY_ART.get(key, anim, frame [, opts]) -> HTMLCanvasElement   (shared cache: never draw onto it)
//       key   : 'dreammoth' | 'brambleshaman' | 'thornbackboar' | 'mountaintroll' | 'mossjaw' | 'bramblehorn'
//       anim  : any name in ENEMY_ART.info[key].anims (unknown names fall back to 'idle'); frame wraps with modulo.
//       opts  : { tint:'#rrggbb', amount:0..1 }  ELITE TINT HOOK: colour-washes the sprite, alpha preserved
//               (amount default 0.35). Tinted copies are cached too.
//   ENEMY_ART.aura(key, anim, frame, color [, radius=2]) -> canvas   ELITE AURA HOOK: a glow ring (silhouette
//       dilated by `radius` px, fading outward) the size of the sprite plus `radius` px padding on every side.
//       Draw it BEHIND the sprite at (x - ax - radius, y - ay - radius), optionally with a pulsing globalAlpha.
//   ENEMY_ART.info[key] -> { w, h, ax, ay, scale, anims:{name:frameCount}, label }
//       (ax, ay) = ground-contact point (feet centre) inside the frame: blit at (x - ax, y - ay).
//       scale = approximate size vs the 24x34 hero (1 = hero sized, 2 = mini-boss, 3 = guardian).
//   ENEMY_ART.keys -> array of keys.   ENEMY_ART.HERO_W / HERO_H = 24 / 34 (reference size).
//
// Anims (frames): every key has idle 2, walk 4, attack 2, hit 1, death 3, plus:
//   brambleshaman: heal 2 (heal-channel: arms up, staff planted, green rings + rising crosses, glowing antlers)
//   thornbackboar: burrow 2 (sinking, dirt) and erupt 2 (cracking mound, airborne burst)
//   mountaintroll: sleep 2 (curled slumped pose, breathing, drifting z's)
//   bramblehorn  : stomp 2 (telegraph: raised foot + red ground marks; slam: shockwave)
//                  grab 2 (root-grab telegraph: sprouting roots; full root cage)
// Palettes follow the game's ramps (PAL_LEAF / PAL_BARK / PAL_DEAD hexes from art.js, hero stone P/O tones) and
// a shared near-black outline, so silhouettes read on both dark caves and bright grass.
// ---------------------------------------------------------------------------
const ENEMY_ART = (function () {
  const HERO_W = 24, HERO_H = 34;
  const OUT = '#0c0714';

  // ---- palettes: [shadow, base, light, highlight] -----------------------------------------------------------
  const RP = a => a.map(hexToRgb);
  const dk = (R, f) => R.map(c => c.map(v => v * f));
  const P = {
    leaf: RP(['#1f4e4c', '#3f8b63', '#94cf7f', '#d2f0a6']),
    leafDk: RP(['#16353b', '#1f4e4c', '#2b6b5a', '#62aa6c']),
    bark: RP(['#24162a', '#5e3d40', '#80594f', '#a9806a']),
    dirt: RP(['#24162a', '#3e2834', '#5e3d40', '#80594f']),
    robe: RP(['#24172e', '#56396a', '#7b5a96', '#a98ac4']),
    bone: RP(['#6b5a6e', '#c9b9c4', '#efe3e6', '#ffffff']),
    wood: RP(['#5e3d40', '#a98a78', '#d9c3a8', '#f3e6d0']),
    moth: RP(['#6f5fc0', '#b8a8ff', '#e6dcff', '#ffffff']),
    mothBody: RP(['#8a7a9a', '#d8ccd8', '#f4eaf0', '#ffffff']),
    boar: RP(['#2a1b2e', '#4a3040', '#6e4a52', '#946a64']),
    stone: RP(['#241c34', '#4a4466', '#6d6a92', '#9a96b8']),
    fur: RP(['#1c262c', '#38484a', '#587062', '#869a80']),
    glowLeaf: RP(['#3f8b63', '#94cf7f', '#d2f0a6', '#ffffff']),
    dark: RP(['#06030b', '#0c0714', '#1a1226', '#24172e']),
  };
  const C = { amber: '#ffd870', red: '#e0475e', hot: '#ff5a3c', pink: '#ff7ae0', mint: '#d2f0a6', white: '#ffffff' };

  const hn = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const tone = (R, v) => v > 0.82 ? R[3] : v > 0.5 ? R[2] : v > -0.3 ? R[1] : R[0];

  // ---- pixel buffer with a scaled, shaded primitive set --------------------------------------------------
  class Buf {
    constructor(w, h, s, ox, oy) {
      Object.assign(this, { w, h, s, ox, oy, clipY: 1e9, fl: 0, al: 1 });
      this.d = new Uint8ClampedArray(w * h * 4);
    }
    put(x, y, c, a) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h || y >= this.clipY) return;
      a = (a == null ? 1 : a) * this.al;
      if (a <= 0) return;
      let r = c[0], g = c[1], b = c[2];
      if (this.fl) { r += (255 - r) * this.fl; g += (255 - g) * this.fl; b += (255 - b) * this.fl; }
      const d = this.d, i = (y * this.w + x) * 4, da = d[i + 3] / 255;
      const oa = a + da * (1 - a);
      d[i] = (r * a + d[i] * da * (1 - a)) / oa;
      d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
      d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
      d[i + 3] = oa * 255;
    }
    X(x) { return this.ox + x * this.s; }
    Y(y) { return this.oy + y * this.s; }
    alphaAt(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
    // shaded ellipse; R=ramp, rot=radians, flat=ramp index for unshaded fill
    ell(cx, cy, rx, ry, R, rot = 0, flat = null) {
      const s = this.s, X = this.X(cx), Y = this.Y(cy), e = Math.max(rx, ry) * s + 1;
      const co = Math.cos(rot), si = Math.sin(rot), M = Math.max(rx, ry);
      for (let y = Math.floor(Y - e); y <= Math.ceil(Y + e); y++) for (let x = Math.floor(X - e); x <= Math.ceil(X + e); x++) {
        const dx = (x + 0.5 - X) / s, dy = (y + 0.5 - Y) / s;
        const ux = dx * co + dy * si, uy = -dx * si + dy * co;
        if ((ux / rx) ** 2 + (uy / ry) ** 2 > 1) continue;
        this.put(x, y, flat != null ? R[flat] : tone(R, -(0.55 * dx + 0.75 * dy) / M));
      }
    }
    // tapered capsule (limbs, antlers, roots)
    cap(x1, y1, x2, y2, r1, r2, R, flat = null) {
      const s = this.s, ax = this.X(x1), ay = this.Y(y1), bx = this.X(x2), by = this.Y(y2);
      const m = Math.max(r1, r2) * s + 1.5, vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
      for (let y = Math.floor(Math.min(ay, by) - m); y <= Math.ceil(Math.max(ay, by) + m); y++)
        for (let x = Math.floor(Math.min(ax, bx) - m); x <= Math.ceil(Math.max(ax, bx) + m); x++) {
          const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2));
          const qx = ax + vx * t, qy = ay + vy * t, r = Math.max(lerp(r1, r2, t) * s, 0.62);
          const dx = px - qx, dy = py - qy;
          if (dx * dx + dy * dy > r * r) continue;
          this.put(x, y, flat != null ? R[flat] : tone(R, -(0.55 * dx + 0.75 * dy) / r));
        }
    }
    // flat polygon with lit top/left and shaded bottom/right edges
    poly(pts, R, flat = null) {
      const q = pts.map(p => [this.X(p[0]), this.Y(p[1])]);
      const x0 = Math.floor(Math.min(...q.map(p => p[0]))) - 1, x1 = Math.ceil(Math.max(...q.map(p => p[0]))) + 1;
      const y0 = Math.floor(Math.min(...q.map(p => p[1]))) - 1, y1 = Math.ceil(Math.max(...q.map(p => p[1]))) + 1;
      const w = x1 - x0 + 1, h = y1 - y0 + 1, m = new Uint8Array(w * h);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        let ins = false;
        const px = x + 0.5, py = y + 0.5;
        for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
          if ((q[i][1] > py) !== (q[j][1] > py) && px < (q[j][0] - q[i][0]) * (py - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) ins = !ins;
        }
        if (ins) m[(y - y0) * w + (x - x0)] = 1;
      }
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y * w + x];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!m[y * w + x]) continue;
        const c = flat != null ? R[flat] : (!at(x, y - 1) || !at(x - 1, y)) ? R[2] : (!at(x, y + 1) || !at(x + 1, y)) ? R[0] : R[1];
        this.put(x0 + x, y0 + y, c);
      }
    }
    rect(x, y, w, h, c, a) {
      const xa = Math.round(this.X(x)), ya = Math.round(this.Y(y));
      const xb = Math.max(xa + 1, Math.round(this.X(x + w))), yb = Math.max(ya + 1, Math.round(this.Y(y + h)));
      for (let j = ya; j < yb; j++) for (let i = xa; i < xb; i++) this.put(i, j, typeof c === 'string' ? hexToRgb(c) : c, a);
    }
    raw(x, y, c, a) { this.put(Math.floor(this.X(x)), Math.floor(this.Y(y)), typeof c === 'string' ? hexToRgb(c) : c, a); }
    line(x1, y1, x2, y2, c, a) {
      const ax = this.X(x1), ay = this.Y(y1), bx = this.X(x2), by = this.Y(y2), n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1;
      for (let i = 0; i <= n; i++) this.put(Math.floor(lerp(ax, bx, i / n)), Math.floor(lerp(ay, by, i / n)), typeof c === 'string' ? hexToRgb(c) : c, a);
    }
    // dotted ellipse ring (heal / telegraph)
    ring(cx, cy, rx, ry, c, a, dots = 28, off = 0) {
      for (let i = 0; i < dots; i++) {
        const t = (i + off) / dots * Math.PI * 2;
        this.raw(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, c, a);
      }
    }
    // paint only over already-opaque pixels (moss, scars, highlights)
    patch(cx, cy, rx, ry, R, seed = 0) {
      const s = this.s, X = this.X(cx), Y = this.Y(cy), e = Math.max(rx, ry) * s + 2;
      for (let y = Math.floor(Y - e); y <= Math.ceil(Y + e); y++) for (let x = Math.floor(X - e); x <= Math.ceil(X + e); x++) {
        if (this.alphaAt(x, y) < 200) continue;
        const dx = (x + 0.5 - X) / s / rx, dy = (y + 0.5 - Y) / s / ry, n = hn(x + seed, y - seed);
        if (dx * dx + dy * dy > 0.55 + n * 0.55) continue;
        this.put(x, y, R[n > 0.82 ? 2 : n < 0.22 ? 0 : 1]);
      }
    }
    // light rim on top-facing edges (keeps dark sprites readable on dark floors)
    rim(col, th = 200) {
      const c = hexToRgb(col), src = this.d.slice(), w = this.w;
      for (let y = 1; y < this.h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] >= th && src[i - w * 4 + 3] < 60) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; }
      }
    }
    outline(col = OUT, a = 1) {
      const c = hexToRgb(col), src = this.d.slice(), w = this.w, h = this.h;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > 40) continue;
        let n = 0;
        if (x > 0 && src[i - 1] > 110) n = Math.max(n, src[i - 1]);
        if (x < w - 1 && src[i + 7] > 110) n = Math.max(n, src[i + 7]);
        if (y > 0 && src[i - w * 4 + 3] > 110) n = Math.max(n, src[i - w * 4 + 3]);
        if (y < h - 1 && src[i + w * 4 + 3] > 110) n = Math.max(n, src[i + w * 4 + 3]);
        if (n) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a * 255 * (n / 255); }
      }
    }
    canvas() {
      const { c, x } = makeCanvas(this.w, this.h);
      x.putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
      return c;
    }
  }

  // ---- shared particles ------------------------------------------------------------------------------------
  function chunks(b, list, R) {  // [x,y,size] dirt / debris specks in unit coords
    for (const [x, y, z] of list) b.rect(x, y, z, z, R[hn(x, y) > 0.5 ? 2 : 1]);
  }
  function crossPlus(b, x, y, c, a) { b.raw(x, y, c, a); b.raw(x - 1, y, c, a); b.raw(x + 1, y, c, a); b.raw(x, y - 1, c, a); b.raw(x, y + 1, c, a); }
  function zed(b, x, y, c) { b.raw(x, y, c); b.raw(x + 1, y, c); b.raw(x + 2, y, c); b.raw(x + 1, y + 1, c); b.raw(x, y + 2, c); b.raw(x + 1, y + 2, c); b.raw(x + 2, y + 2, c); }

  // =========================================================================================================
  // DREAM MOTH — tiny (16px wingspan), translucent, side-on, flapping
  // =========================================================================================================
  function drawMoth(b, anim, f) {
    // front-ish view: two translucent wing pairs spread from a small furry body; k = wing spread (1 open, .35 folded)
    let k = [1, 0.55][f % 2], dx = 0, dy = [0, -1][f % 2], rot = 0, fade = 1, fl = 0, motes = 0;
    if (anim === 'walk') { k = [1, 0.7, 0.4, 0.7][f]; dy = [0, -1, 0, -1][f]; dx = [0, 1, 0, -1][f] * 0.5; }
    else if (anim === 'attack') { if (f === 0) { k = 1; dx = -1; dy = -3; rot = -0.2; } else { k = 0.4; dx = 2; dy = 2; rot = 0.5; motes = 1; } }
    else if (anim === 'hit') { k = 0.3; dx = -2; dy = 1; fl = 0.4; rot = -0.4; }
    else if (anim === 'death') { k = [0.45, 0.25, 0.15][f]; dx = [-2, -2, -1][f]; dy = [1, 4, 6][f]; rot = [-0.4, -1.0, -1.45][f]; fade = [1, 0.75, 0.5][f]; fl = [0.4, 0, 0][f]; motes = f + 1; }
    b.fl = fl;
    const cx = 10 + dx, cy = 9 + dy, cs = Math.cos(rot), sn = Math.sin(rot);
    const T = (x, y) => [cx + x * cs - y * sn, cy + x * sn + y * cs];
    const lobe = (sx, x, y, rx, ry, a, R, al) => {
      const q = T(sx * x * k, y); b.al = al * fade;
      b.ell(q[0], q[1], rx * (0.45 + 0.55 * k), ry, R, sx * (0.5 + (1 - k) * 0.3) * a + rot);
    };
    for (const sx of [-1, 1]) {
      const far = sx < 0, R = far ? dk(P.moth, 0.8) : P.moth;
      lobe(sx, 5.6, -2.6, 5.4, 3.8, 1, R, 0.55);
      lobe(sx, 3.8, 2.4, 3.6, 2.6, -1, R, 0.5);
      b.al = 0.9 * fade; const e = T(sx * 6.2 * k, -3); b.raw(e[0], e[1], C.pink); b.raw(e[0] + sx * -1, e[1] + 1, C.white, 0.8);
      const v = T(sx * 8 * k, -4.5); const o = T(sx * 1, -1); b.line(o[0], o[1], v[0], v[1], P.moth[3], 0.6 * fade);
    }
    b.al = fade;
    let q = T(0, 1.6); b.ell(q[0], q[1], 1.5, 3, P.mothBody, rot);
    q = T(0, -1.2); b.ell(q[0], q[1], 2, 2, P.mothBody, rot);
    q = T(0, -3.6); b.ell(q[0], q[1], 1.6, 1.5, P.mothBody, rot);
    for (const sx of [-1, 1]) { const e = T(sx * 0.9, -3.9); b.raw(e[0], e[1], anim === 'death' ? OUT : C.pink); const t0 = T(sx * 1, -4.8), t1 = T(sx * 3.4, -8.4); b.line(t0[0], t0[1], t1[0], t1[1], P.moth[2]); b.raw(t1[0], t1[1], C.white); }
    for (let i = 0; i < motes * 3; i++) b.raw(cx - 4 + hn(i, f + 7) * 8, cy + 3 + hn(f + 3, i) * (anim === 'death' ? 6 : 3), i % 2 ? C.pink : C.white, 0.75 * fade);
    b.al = 1; b.fl = 0;
  }

  // =========================================================================================================
  // BRAMBLE SHAMAN — hooded antlered caster, thorn staff; 'heal' = channel pose
  // =========================================================================================================
  function drawShaman(b, anim, f) {
    const dir = anim === 'idle' || anim === 'walk' || anim === 'heal';
    let dy = 0, dx = 0, sh = 0, fl = 0, hem = 0, lean = 0, glow = 0;
    let A = [9, -1], B = [9, -37], hand = [8, -16], hand2 = null, orb = 2, bolt = false, dead = 0, crosses = 0, ringR = 0;
    if (anim === 'idle') { dy = [0, -0.8][f]; glow = f; }
    else if (anim === 'walk') { dy = [0, -1, 0, -1][f]; hem = [-1.2, 0, 1.2, 0][f]; A = [9 + hem * 0.4, -1]; B = [9 + hem * 0.4, -37]; }
    else if (anim === 'attack') {
      if (f === 0) { dx = -2; A = [8, -9]; B = [-4, -41]; hand = [4, -24]; lean = -1; }
      else { dx = 3; A = [-1, -21]; B = [19, -27]; hand = [8, -23.5]; orb = 2.4; bolt = true; lean = 1; }
    } else if (anim === 'hit') { dx = -2; fl = 0.4; A = [8, -1]; B = [5, -36]; hand = [6, -17]; lean = -2; }
    else if (anim === 'heal') {
      A = [11, -1]; B = [11, -38]; hand = [10.5, -22]; hand2 = [-7, -33]; orb = 3.2; glow = 1; dy = [0, -0.7][f]; crosses = 1; ringR = f;
    } else if (anim === 'death') {
      dead = f + 1;
      if (f === 0) { dx = -3; fl = 0.4; A = [7, -1]; B = [3, -36]; hand = [6, -16]; lean = -2; }
      if (f === 1) { dx = -2; sh = 9; A = [6, -1]; B = [22, -12]; hand = [9, -12]; lean = 1; }
    }
    b.fl = fl;
    const sy = sh;                                   // shoulder drop when kneeling
    if (dead === 3) {                                // collapsed robe heap, antlers and staff on the ground
      b.cap(1, -2.5, 20, -3.5, 0.9, 0.9, P.bark);
      b.ell(20, -4, 2, 2, P.glowLeaf, 0, 0);
      b.poly([[-12, -1], [-8, -9], [1, -12], [9, -6], [13, -1]], P.robe);
      b.cap(-6, -8, 8, -6, 1, 1, P.robe, 0);
      b.ell(0, -8.5, 8, 3.5, P.leafDk);
      b.ell(9.5, -6, 4.2, 3.8, P.robe);
      b.ell(11, -5.5, 2.4, 2.4, P.dark, 0, 1);
      b.raw(10.5, -6, OUT); b.raw(12, -6, OUT); b.raw(11, -5, OUT);
      b.cap(8, -9, 5, -15, 0.8, 0.5, P.bone); b.cap(7, -12, 3, -13, 0.6, 0.4, P.bone);
      b.cap(12, -9, 15, -15, 0.8, 0.5, P.bone); b.cap(14, -12, 17.5, -13.5, 0.6, 0.4, P.bone);
      for (const [x, y] of [[-4, -13], [3, -14], [-9, -6], [16, -3]]) b.rect(x, y, 1.5, 1.5, P.leaf[hn(x, y) > 0.5 ? 1 : 2]);
      b.outline(); return;
    }
    const x0 = dx + (lean < 0 ? -1 : 0);
    // staff (behind body when raised back, in front otherwise)
    const staff = () => {
      b.cap(A[0] + dx, A[1], B[0] + dx, B[1], 0.9, 0.7, P.bark);
      const tx = B[0] + dx, ty = B[1];
      for (const [px, py, qx, qy] of [[-1, 1, -3.4, -0.8], [1, 1, 3.4, -0.8], [0, -1, 0.4, -3.6]]) b.cap(tx + px, ty + py, tx + qx, ty + qy - 0.6, 0.7, 0.3, P.leafDk);
      b.ell(tx, ty - 0.4, orb, orb, glow || anim === 'attack' ? P.glowLeaf : P.leaf);
      b.raw(tx - 0.6, ty - 1.2, C.white);
    };
    staff();
    // robe (A-line), hem sways when walking
    const top = -24 + sy + dy;
    b.poly([[-4 + x0, top], [5 + x0, top], [10 + hem + dx, -1], [-10 + hem * 0.5 + dx, -1]], P.robe);
    b.poly([[-2 + x0, top + 1], [4 + x0, top + 1], [7 + dx, -1], [-6 + dx, -1]], P.robe, 1);
    for (const [fx, fy] of [[-1, 6], [2, 5], [-4, 4]]) b.line(fx + dx, top + fy, fx + dx * 0.5 + (fx < 0 ? -2 : 1), -2, P.robe[0]);
    b.ell(dx + 0.5, top + 1.2, 6.2, 2.4, P.leaf);                         // leaf mantle
    b.patch(dx + 4, top + 1.5, 3, 1.4, P.leafDk, 3);
    b.cap(-6 + dx, top + 10, 6.5 + dx, top + 10, 0.9, 0.9, P.leafDk);     // vine belt
    b.raw(2 + dx, top + 10, C.mint);
    if (anim === 'walk') { b.ell(-4 + dx + (f % 2 ? 1.5 : 0), -0.8, 2, 1, P.dark, 0, 2); b.ell(4 + dx - (f % 2 ? 1.5 : 0), -0.8, 2, 1, P.dark, 0, 2); }
    // arm(s)
    const sx = 4 + dx, sY = top + 2;
    b.cap(sx, sY, hand[0] + dx, hand[1], 1.7, 1.4, P.robe);
    b.ell(hand[0] + dx, hand[1], 1.5, 1.4, P.bone, 0, 1);
    if (hand2) {
      b.cap(-3 + dx, sY, hand2[0] + dx, hand2[1], 1.7, 1.4, P.robe);
      b.ell(hand2[0] + dx, hand2[1], 1.6, 1.5, P.bone, 0, 1);
      b.ell(hand2[0] + dx, hand2[1] - 3, 1.8, 1.8, P.glowLeaf, 0, 1);
    }
    // head: hood + dark face + eyes
    const hy = top - 5 + (dead === 2 ? 1 : 0) + (lean < 0 ? 0.5 : 0), hx = 1 + x0 + (lean > 0 ? 1.2 : 0);
    b.ell(hx, hy, 5.4, 5.6, P.robe);
    b.ell(hx + 1.6, hy + 0.4, 3.3, 3.6, P.dark, 0, 1);
    const eyeC = anim === 'heal' ? C.white : C.mint, eyeA = dead ? OUT : eyeC;
    if (anim === 'hit' || dead) { b.raw(hx + 1.5, hy, OUT); b.raw(hx + 3.5, hy, OUT); b.raw(hx + 2.5, hy + 1.6, '#4a3a5a'); }
    else { b.raw(hx + 1.5, hy - 0.2, eyeA); b.raw(hx + 3.5, hy - 0.2, eyeA); }
    // antlers: bone, two tines each; glow green while channeling
    const AR = anim === 'heal' ? P.glowLeaf : P.bone, aw = lean > 0 ? 1 : 0;
    const L = [[hx - 1.5, hy - 4.5], [hx - 5, hy - 10], [hx - 6, hy - 15 - aw]];
    b.cap(L[0][0], L[0][1], L[1][0], L[1][1], 1, 0.8, AR); b.cap(L[1][0], L[1][1], L[2][0], L[2][1], 0.8, 0.45, AR);
    b.cap(L[1][0], L[1][1], L[1][0] - 4, L[1][1] - 1.5, 0.7, 0.35, AR); b.cap(L[0][0] - 1, L[0][1] - 2, L[0][0] - 5, L[0][1] - 3.5, 0.6, 0.35, AR);
    const Rr = [[hx + 3, hy - 4.5], [hx + 6.5, hy - 10], [hx + 7, hy - 15 - aw]];
    b.cap(Rr[0][0], Rr[0][1], Rr[1][0], Rr[1][1], 1, 0.8, AR); b.cap(Rr[1][0], Rr[1][1], Rr[2][0], Rr[2][1], 0.8, 0.45, AR);
    b.cap(Rr[1][0], Rr[1][1], Rr[1][0] + 3.6, Rr[1][1] - 1.5, 0.7, 0.35, AR); b.cap(Rr[0][0] + 1, Rr[0][1] - 2, Rr[0][0] + 4.5, Rr[0][1] - 3.5, 0.6, 0.35, AR);
    if (bolt) {                                        // thorn bolt leaving the staff
      const tx = B[0] + dx + 1, ty = B[1];
      b.poly([[tx, ty - 2], [tx + 6, ty], [tx, ty + 2]], P.glowLeaf, 1);
      b.poly([[tx + 1, ty - 1], [tx + 4.5, ty], [tx + 1, ty + 1]], P.glowLeaf, 3);
      b.raw(tx + 7, ty - 3, C.mint); b.raw(tx + 8, ty + 3, C.mint);
    }
    if (crosses) {                                     // heal channel: rings on the ground + rising crosses
      const k = f ? 1 : 0;
      b.ring(1 + dx, -1, 9 + k * 3.5, 2.6 + k, C.mint, 0.95, 26, k * 0.5);
      b.ring(1 + dx, -1, 5 + k * 2, 1.5 + k * 0.6, C.white, 0.7, 14, k * 0.5);
      crossPlus(b, -9 + dx, -18 - k * 5, C.mint); crossPlus(b, 13 + dx, -26 + k * 4, C.white); crossPlus(b, 3 + dx, -43 - k * 2, C.mint, 0.85);
      for (const [x, y] of [[-5, -8], [8, -6], [-11, -24], [15, -14]]) b.raw(x + dx, y - k * 4, C.mint, 0.9);
    }
    b.fl = 0; b.outline();
  }

  // =========================================================================================================
  // QUADRUPED RIG — shared by Thornback Boar (1x) and Mossjaw (about 2x)
  // =========================================================================================================
  const BOAR = {
    name: 'boar', R: P.boar, hip: -8, sh: 7, cy: -11, rx: 11, ry: 7, leg: 7, headX: 15, headY: -11, hr: 5.2, neck: 4,
    eye: C.red, ox: 15, oy: 26,
  };
  const WOLF = {
    name: 'wolf', R: P.fur, hip: -9.5, sh: 8.5, cy: -15, rx: 13, ry: 5.8, leg: 10.5, headX: 17, headY: -18, hr: 4.3, neck: 3.4,
    eye: C.amber, ox: 31, oy: 27,
  };

  function quadPose(K, anim, f) {
    const wolf = K.name === 'wolf', sw = wolf ? 4.6 : 3.6, lift = wolf ? 2.6 : 2;
    const o = { dx: 0, dy: 0, lean: 0, hx: 0, hy: 0, jaw: 0.1, tail: 0, fl: 0, lie: 0, dead: 0, sink: 0, mound: 0, air: 0, sw: [0, 0, 0, 0], lf: [0, 0, 0, 0], stride: 0 };
    const gait = (ph, amp, l) => { o.sw = [Math.sin(ph + Math.PI) * amp, Math.sin(ph) * amp, Math.sin(ph) * amp, Math.sin(ph + Math.PI) * amp]; o.lf = [Math.max(0, -Math.cos(ph + Math.PI)) * l, Math.max(0, -Math.cos(ph)) * l, Math.max(0, -Math.cos(ph)) * l, Math.max(0, -Math.cos(ph + Math.PI)) * l]; };
    if (anim === 'idle') { o.dy = [0, wolf ? -0.7 : -0.5][f]; o.hy = [0, 0.5][f]; o.tail = [0, 1.5][f]; o.jaw = [0.1, wolf ? 0.25 : 0.1][f]; }
    else if (anim === 'walk') { const ph = f * Math.PI / 2; gait(ph, sw, lift); o.dy = [0, -0.8, 0, -0.8][f]; o.hy = [0, 0.6, 0, 0.6][f]; o.tail = [0, 1, 0, -1][f]; }
    else if (anim === 'attack') {
      if (wolf) {
        if (f === 0) { o.dx = -3; o.dy = 2.4; o.lean = -0.1; o.hx = -3; o.hy = -1; o.jaw = 0.95; o.sw = [-2, -2, -1, -1]; o.tail = 3; }
        else { o.dx = 6; o.dy = -2; o.lean = 0.2; o.hx = 3.5; o.hy = 1.5; o.jaw = 0.45; o.sw = [-5, -3, 5, 6]; o.lf = [2, 0, 0, 1]; o.tail = -3; }
      } else {
        if (f === 0) { o.dx = -3; o.dy = 1.2; o.lean = 0.1; o.hx = -1; o.hy = 3.2; o.jaw = 0.3; o.sw = [-1, -1, -2, -2]; o.tail = 2; }
        else { o.dx = 6; o.dy = -1; o.lean = -0.16; o.hx = 3; o.hy = -3.2; o.jaw = 0.7; o.sw = [-5, -4, 4, 5]; o.lf = [2, 1, 1, 2]; o.tail = -3; }
      }
    } else if (anim === 'hit') { o.dx = -2.5; o.dy = -0.5; o.lean = -0.1; o.hx = -1; o.hy = -2; o.jaw = 0.55; o.fl = 0.4; o.tail = 3; o.sw = [-1, -1, 2, 2]; }
    else if (anim === 'death') {
      if (f === 0) { o.dx = -3; o.dy = -1; o.lean = -0.2; o.hy = -3; o.jaw = 0.8; o.fl = 0.4; o.sw = [-2, -2, 2.5, 2.5]; o.lf = [0, 1, 2, 0]; }
      else if (f === 1) { o.dx = -2; o.dy = K.leg * 0.42; o.lean = -0.04; o.hy = 2; o.jaw = 0.6; o.dead = 1; o.sw = [-4, -3, 4, 5]; }
      else { o.lie = 1; o.dead = 1; o.jaw = 0.5; }
    } else if (anim === 'burrow') {   // boar: dig in
      if (f === 0) { o.dy = 5.5; o.lean = 0.2; o.hy = 3; o.hx = 1; o.jaw = 0.2; o.sw = [-2, -1, 2, 2]; o.mound = 1; }
      else { o.dy = 14; o.lean = 0.1; o.hy = 3; o.mound = 2; }
      o.sink = 1;
    } else if (anim === 'erupt') {    // boar: burst out
      if (f === 0) { o.dy = 10; o.lean = -0.35; o.hy = -2; o.hx = 2; o.jaw = 0.5; o.mound = 3; o.sink = 1; }
      else { o.dy = -7; o.dx = 2; o.lean = -0.3; o.hy = -3; o.jaw = 0.8; o.air = 1; o.sw = [-4, -3, 5, 5]; o.lf = [3, 2, 4, 4]; o.mound = 4; }
    }
    return o;
  }

  function drawQuad(b, K, anim, f) {
    const P_ = quadPose(K, anim, f), wolf = K.name === 'wolf', R = K.R, S = b.s;
    const cy = P_.lie ? -5.6 : K.cy;
    b.fl = P_.fl;
    if (P_.sink) b.clipY = b.oy;
    if (P_.mound === 4 || P_.mound === 3) { b.ell(K.hip + 6, -0.5, 10, 2.8, P.dirt, 0, 0); }   // hole in the ground
    const T = (x, y) => {
      const px = x - K.hip, py = y - cy, c = Math.cos(P_.lean), s = Math.sin(P_.lean);
      return [K.hip + px * c - py * s + P_.dx, cy + px * s + py * c + P_.dy];
    };
    const farR = dk(R, 0.72);
    // legs: 0 far hind, 1 near hind, 2 far front, 3 near front
    const jx = [K.hip + 1, K.hip - 1.5, K.sh - 1.5, K.sh + 1.5];
    const drawLeg = i => {
      const near = i === 1 || i === 3, front = i >= 2, LR = near ? R : farR;
      let J = T(jx[i], cy + K.ry * 0.45), F;
      if (P_.lie) F = [J[0] + (front ? 6 : 5) + (i % 2) * 2, J[1] + 0.8 + (near ? 1 : -0.5)];
      else {
        const gy = P_.air ? -1 - P_.lf[i] : -P_.lf[i];
        F = [jx[i] + P_.dx + P_.sw[i] * (P_.sink ? 1 : 1), (P_.sink ? P_.dy * 0.4 : 0) + gy];
        if (P_.dead) F[1] = -0.5 + (i % 2) * 0.4;
      }
      const knee = [lerp(J[0], F[0], 0.5) + (front ? -1.2 : 1.6), lerp(J[1], F[1], 0.5)];
      b.cap(J[0], J[1], knee[0], knee[1], wolf ? 2.6 : 2.4, wolf ? 1.9 : 1.8, LR);
      b.cap(knee[0], knee[1], F[0], F[1] - 0.5, wolf ? 1.9 : 1.8, wolf ? 1.2 : 1.3, LR);
      b.ell(F[0] + 1, F[1] - 0.5, wolf ? 2.4 : 2.2, 1.2, near ? dk(R, 0.8) : dk(R, 0.6), 0, 1);
      if (near) { b.raw(F[0] + 2, F[1] - 1.2, P.bone[1]); }
    };
    drawLeg(0); drawLeg(2);
    // tail
    const tp = T(-K.rx + 1, cy - 1);
    if (wolf) {
      b.cap(tp[0], tp[1], tp[0] - 5, tp[1] + 2 + P_.tail * 0.4, 2.2, 1.8, R);
      b.cap(tp[0] - 5, tp[1] + 2 + P_.tail * 0.4, tp[0] - 11, tp[1] + 5 + P_.tail, 1.9, 0.7, R);
      b.patch(tp[0] - 6, tp[1] + 3 + P_.tail * 0.5, 4, 2, P.leaf, 4);
    } else {
      b.cap(tp[0], tp[1], tp[0] - 3, tp[1] + 2 + P_.tail * 0.3, 1.4, 1, R);
      b.ell(tp[0] - 4.2, tp[1] + 1.2 + P_.tail * 0.3, 1.2, 1.2, P.leafDk);
    }
    // body
    const bc = T(0, cy);
    if (wolf) {
      b.ell(bc[0] - 1, bc[1] + 0.4, K.rx, K.ry, R, P_.lean);
      const hip = T(-6, cy + 0.5); b.ell(hip[0], hip[1], 5.6, 5.8, R, 0);        // haunch
      const sho = T(7, cy - 0.5); b.ell(sho[0], sho[1], 5.6, 5.4, R, 0);          // chest
      const bel = T(-0.5, cy + K.ry * 0.85); b.ell(bel[0], bel[1], 8, 1.8, dk(R, 0.8), P_.lean, 0);
    } else {
      b.ell(bc[0], bc[1], K.rx, K.ry, R, P_.lean);
      const sho = T(6, cy - 0.5); b.ell(sho[0], sho[1], 6.4, K.ry + 0.4, R, 0);   // heavy shoulders
      const bel = T(-0.5, cy + K.ry * 0.82); b.ell(bel[0], bel[1], 8, 2, dk(R, 0.8), P_.lean, 0);
    }
    // back details
    if (wolf) {
      const m1 = T(-3, cy - 4.4), m2 = T(5, cy - 4);
      b.patch(m1[0], m1[1], 9, 3.4, P.leaf, 1); b.patch(m2[0], m2[1], 5, 3, P.leafDk, 5);
      for (const [x, h] of [[-8, 3], [-4.5, 4], [-1, 3.2], [2.5, 4.2], [6, 3.4]]) {   // mossy fur tufts on the spine
        const p = T(x, cy - K.ry * 0.9 + 0.8); b.poly([[p[0] - 1.6, p[1]], [p[0] + 0.2, p[1] - h], [p[0] + 1.6, p[1]]], x % 2 ? P.leaf : P.leafDk);
      }
    } else {
      for (let i = 0; i < 6; i++) {                                                  // bramble thorns along the spine
        const x = -9.5 + i * 3.6, yb = cy - K.ry * Math.sqrt(Math.max(0, 1 - (x / K.rx) ** 2)) + 1.4, p = T(x, yb), h = 4.6 + (i % 2) * 1.8;
        b.poly([[p[0] - 1.9, p[1] + 0.4], [p[0] - 0.4 + Math.sin(P_.lean) * -2, p[1] - h], [p[0] + 1.9, p[1] + 0.4]], P.leafDk);
        b.raw(p[0] - 0.4, p[1] - h + 1.2, P.leaf[2]);
      }
      const pa = T(-4, cy - 2); b.patch(pa[0], pa[1], 4, 3, P.dirt, 2);
    }
    drawLeg(1); drawLeg(3);
    // neck + head
    const H0 = T(K.headX, K.headY), H = [H0[0] + P_.hx, H0[1] + P_.hy], N = T(K.sh - 1, cy - 1.2);
    if (P_.lie) { H[0] = K.headX + 3; H[1] = -3.4; }
    b.cap(N[0], N[1], H[0] - 1, H[1] + 0.6, K.neck + 1.2, K.neck, R);
    const jo = P_.jaw;
    if (wolf) {
      const hx = H[0], hy = H[1];
      b.cap(hx + 1, hy + 2.6, hx + 9, hy + 3 + jo * 6, 1.5, 1.0, dk(R, 0.78), 1);       // lower jaw
      b.ell(hx + 5.6, hy + 2.6 + jo * 2.4, 3.6, 0.7 + jo * 2.6, P.dark, 0, 1);            // mouth
      for (const x of [3, 5, 7, 9]) { b.raw(hx + x, hy + 3 + jo * (x - 2) * 0.8 - 1, P.bone[2]); b.raw(hx + x + 0.4, hy + 2 + jo * 0.6, P.bone[2]); }
      b.ell(hx, hy, K.hr, K.hr - 0.6, R);                                                  // skull
      b.cap(hx + 1.5, hy + 0.2, hx + 9.5, hy + 1.6, 2.7, 1.8, R);                           // snout
      b.rect(hx + 9.2, hy + 0.4, 1.4, 1.4, '#0c0714');                                       // nose
      b.poly([[hx - 2.5, hy - 3], [hx - 3, hy - 8.5], [hx + 1, hy - 3.4]], dk(R, 0.9));      // ears
      b.poly([[hx - 1.6, hy - 3.2], [hx - 2, hy - 7], [hx + 0.3, hy - 3.6]], P.bark, 1);
      b.patch(hx - 1, hy - 3, 3.2, 2.2, P.leaf, 9);                                          // moss cap
      b.poly([[hx - 4, hy + 1], [hx - 7, hy + 5], [hx - 3, hy + 4.5]], P.leafDk);           // mossy mane / beard
      b.poly([[hx - 1, hy + 3.4], [hx - 2.4, hy + 7.5], [hx + 1, hy + 4.4]], P.leaf);
      const ec = P_.dead ? OUT : P_.fl ? C.white : K.eye;
      if (P_.dead) { b.raw(hx + 1.5, hy - 1.4, OUT); b.raw(hx + 2.5, hy - 0.4, OUT); b.raw(hx + 2.5, hy - 1.4, OUT); b.raw(hx + 1.5, hy - 0.4, OUT); }
      else { b.rect(hx + 1.4, hy - 1.5, 1.8, 1.4, ec); if (!P_.fl) b.rect(hx + 1.4, hy - 2, 2.2, 0.6, '#3b2a2a'); }
    } else {
      const hx = H[0], hy = H[1];
      b.ell(hx + 5.4, hy + 3.2 + jo * 2.2, 3.2, 1.7, dk(R, 0.8), 0.15);                      // lower jaw
      b.ell(hx, hy, K.hr + 0.4, K.hr, R);                                                    // head
      b.ell(hx + 5.4, hy + 1.3, 3.4, 2.8, R);                                                // snout
      b.ell(hx + 7.6, hy + 1.2, 1.6, 1.8, P.boar[3], 0, 1);                                  // snout disc
      b.raw(hx + 8, hy + 0.8, OUT); b.raw(hx + 8, hy + 2.2, OUT);
      b.poly([[hx - 2.6, hy - 3.6], [hx - 4.5, hy - 8], [hx + 0.2, hy - 4.6]], P.boar);       // ear
      b.patch(hx - 2, hy - 3.2, 3, 2, P.leafDk, 6);
      b.poly([[hx + 3.6, hy + 3.4], [hx + 9, hy + 2.6], [hx + 10.8, hy - 2.6], [hx + 7.6, hy + 0.6], [hx + 4, hy + 2]], P.bone);      // tusk
      b.poly([[hx - 0.4, hy + 3.4], [hx + 2, hy + 2.8], [hx + 1.6, hy - 0.6]], P.bone);       // back tusk
      if (P_.dead) { b.raw(hx + 1.6, hy - 1.2, OUT); b.raw(hx + 2.6, hy - 0.2, OUT); b.raw(hx + 2.6, hy - 1.2, OUT); b.raw(hx + 1.6, hy - 0.2, OUT); }
      else { b.rect(hx + 1.6, hy - 1.4, 1.8, 1.6, P_.fl ? C.white : K.eye); b.rect(hx + 0.6, hy - 2.6, 3, 0.8, P.boar[0]); }
    }
    b.fl = 0;
    // burrow / erupt dirt, drawn unclipped
    b.clipY = 1e9;
    const gy = 0, hx = H[0];
    const dirtBlob = (cx, w, h) => { b.ell(cx, gy - h * 0.2, w, h, P.dirt); b.patch(cx, gy - h * 0.5, w * 0.6, h * 0.6, P.bark, 3); };
    if (P_.mound === 1) { dirtBlob(K.hip - 1, 4, 3); dirtBlob(hx + 4, 5, 3.4); chunks(b, [[-12, -6, 1.4], [hx + 10, -5, 1.4], [hx + 12, -9, 1.2], [-5, -9, 1]], P.dirt); }
    if (P_.mound === 2) { dirtBlob(2, 13, 4.6); b.cap(-3, -3, 6, -3, 1, 1, P.dirt, 0); chunks(b, [[-12, -6, 1.6], [14, -7, 1.6], [3, -10, 1.2], [9, -12, 1.2], [-8, -11, 1.2], [18, -4, 1.4]], P.dirt); }
    if (P_.mound === 3) { dirtBlob(-3, 5, 3); dirtBlob(hx + 7, 6, 4.4); chunks(b, [[hx + 3, -10, 1.6], [hx + 12, -12, 1.6], [hx + 9, -16, 1.2], [-2, -9, 1.4], [hx + 15, -7, 1.2], [4, -14, 1]], P.dirt);
      b.line(hx + 1, -1, hx + 5, -4, P.dirt[0]); b.line(hx + 9, -1, hx + 7, -4, P.dirt[0]); }
    if (P_.mound === 4) { dirtBlob(-9, 4.6, 2.6); dirtBlob(hx + 10, 5.4, 3); chunks(b, [[-12, -12, 1.8], [-3, -17, 1.4], [hx + 6, -20, 1.6], [hx + 14, -14, 1.6], [hx + 10, -23, 1.2], [20, -9, 1.4], [-9, -21, 1.2], [4, -23, 1]], P.dirt); }
    b.outline();
  }

  // =========================================================================================================
  // MOUNTAIN TROLL — hunched stone brute with a club; 'sleep' = curled slumber
  // =========================================================================================================
  function drawTroll(b, anim, f) {
    const R = P.stone;
    let dy = 0, dx = 0, lean = 0, fl = 0, ph = null, hxo = 0, hyo = 0;
    let hand = [14, -13], club = [26, -24], dead = 0, eyes = 1, slam = 0;
    if (anim === 'sleep') return drawTrollSleep(b, f);
    if (anim === 'idle') { dy = [0, -0.8][f]; hand = [14, -13 + (f ? 0.6 : 0)]; club = [27, -24 - f]; }
    else if (anim === 'walk') { ph = f * Math.PI / 2; dy = [0, -1.2, 0, -1.2][f]; hand = [13 + Math.sin(ph + Math.PI) * 3, -13]; club = [26 + Math.sin(ph + Math.PI) * 3, -24]; }
    else if (anim === 'attack') {
      if (f === 0) { lean = -0.14; dx = -2; hand = [5, -37]; club = [-4, -53]; hyo = 1; }
      else { lean = 0.2; dx = 4; dy = 1; hand = [20, -12]; club = [28, 0]; hyo = 2; slam = 1; }
    } else if (anim === 'hit') { lean = -0.14; dx = -2.5; fl = 0.4; eyes = 0; hand = [11, -15]; club = [15, -35]; hyo = -1; }
    else if (anim === 'death') {
      dead = f + 1;
      if (f === 0) { lean = -0.25; dx = -3; fl = 0.4; eyes = 0; hand = [8, -22]; club = [4, -40]; }
      if (f === 1) { dy = 9; lean = -0.12; dx = -2; eyes = 0; hand = [14, -6]; club = [30, -4]; }
    }
    b.fl = fl;
    if (dead === 3) {                                  // toppled: face-down boulder with club beside it
      b.cap(16, -3, 34, -2.5, 2.2, 2.6, P.bark, 1);
      b.ell(33, -4, 3, 4, P.bark);
      b.ell(-6, -3.5, 3.2, 2, R, 0); b.ell(-9, -4.5, 2.4, 2, R, 0);
      b.ell(2, -7, 15, 6.5, R, -0.04);
      b.patch(0, -11, 9, 3, P.leaf, 7);
      for (let i = 0; i < 5; i++) { const x = -8 + i * 4.5; b.poly([[x - 2, -11 + (i % 2)], [x, -16 + (i % 2) * 1.5], [x + 2, -11 + (i % 2)]], dk(R, 1.1)); }
      b.ell(16, -5, 5.2, 4.6, R); b.ell(19.5, -3.5, 2.2, 1.6, dk(R, 0.8));
      b.poly([[18, -3], [21, -6.5], [20.5, -2]], P.bone);
      b.raw(16, -6, OUT); b.raw(17, -5, OUT); b.raw(17, -6, OUT); b.raw(16, -5, OUT);
      b.cap(8, -7, 17, -2, 2.4, 2, R); b.ell(18, -2, 2.4, 1.6, R);
      b.rim('#b9b6dc'); b.outline(); return;
    }
    const T = (x, y) => { const c = Math.cos(lean), s = Math.sin(lean), py = y + 18; return [x * c - py * s + dx, py * c + x * s - 18 + dy]; };
    const legsY = dead === 2 ? 0 : 0;
    // far arm + legs
    const swing = ph == null ? 0 : Math.sin(ph) * 4;
    const kneel = dead === 2;
    const leg = (hx, foot, R2) => {
      const hip = T(hx, -17), F = [foot, 0], K2 = [lerp(hip[0], foot, 0.5) + (kneel ? 5 : 1.5), lerp(hip[1], 0, 0.5)];
      if (kneel) { b.cap(hip[0], hip[1], K2[0], -3, 4.2, 3.4, R2); b.cap(K2[0], -3, foot - 5, -2, 3.2, 3, R2); b.ell(foot - 6, -1.5, 3.5, 1.6, dk(R2, 0.8), 0, 1); return; }
      b.cap(hip[0], hip[1], K2[0], K2[1], 4.6, 3.8, R2); b.cap(K2[0], K2[1], F[0], -1.5, 3.6, 3.2, R2);
      b.ell(F[0] + 1.5, -1.2, 4, 1.8, dk(R2, 0.8), 0, 1);
    };
    const fa = T(8, -28);
    b.cap(fa[0] - 1, fa[1], 10 + dx + (ph == null ? 0 : -swing * 0.6), -14 + (dead ? 6 : 0), 3.4, 3, dk(R, 0.7));
    leg(-4 + (ph == null ? 0 : -swing), -5 + (ph == null ? 0 : -swing * 1.1), dk(R, 0.72));
    // club behind body when lifted back
    const gripH = [hand[0] + dx, hand[1] + dy * 0.5];
    const clubDraw = () => {
      const g = gripH, e = [club[0] + dx, club[1] + dy * 0.5];
      b.cap(g[0], g[1], e[0], e[1], 1.8, 3.1, P.bark);
      b.ell(e[0], e[1], 4, 4.6, P.bark);
      for (const [px, py] of [[-2, -2], [2, -1], [0, 2], [-1, 3]]) b.raw(e[0] + px, e[1] + py, P.bone[1]);   // bone spikes
      b.raw(e[0] + 3, e[1] - 4, P.bone[2]); b.raw(e[0] - 3, e[1] - 3, P.bone[2]);
    };
    // torso
    const tc = T(1, -27);
    b.ell(tc[0], tc[1], 12, 10.5, R, lean * 0.6);
    const belly = T(5, -22); b.ell(belly[0], belly[1], 7, 7, dk(R, 1.12), 0);
    const hump = T(-6, -33); b.ell(hump[0], hump[1], 7.5, 6.5, R, 0);
    for (let i = 0; i < 4; i++) { const p = T(-9 + i * 3.6, -38 + Math.abs(i - 1.5) * 1.6); b.poly([[p[0] - 2.2, p[1] + 2], [p[0] - 0.4, p[1] - 4.6 + (i % 2)], [p[0] + 2.2, p[1] + 2]], R); }
    b.patch(hump[0] - 1, hump[1] - 2, 5, 2.4, P.leaf, 5);
    b.patch(tc[0] + 6, tc[1] - 7, 4, 2.4, P.leaf, 2); b.patch(tc[0] - 4, tc[1] + 5, 4, 2.4, P.leafDk, 8);
    b.cap(T(-3, -17)[0], T(-3, -17)[1], T(7, -17)[0], T(7, -17)[1], 1.8, 1.8, P.bark);   // rope belt
    leg(6, 8 + (ph == null ? 0 : swing), R);
    clubDraw();
    // head: pushes forward from the shoulders, lighter stone, two bright eyes, low tusks
    const hd = T(16 + hxo, -33 + hyo), HR = P.stone.map((c, i) => i < 3 ? c.map(v => Math.min(255, v * 1.18 + 8)) : c);
    b.cap(T(7, -31)[0], T(7, -31)[1], hd[0] - 2, hd[1] + 1, 5.6, 5, R);                                  // thick neck
    b.ell(hd[0], hd[1], 6.4, 5.6, HR);
    b.ell(hd[0] + 1.2, hd[1] + 3.8 + (anim === 'attack' && f === 1 ? 1.4 : 0), 4.4, 2.2, dk(HR, 0.8));   // under-bite jaw
    b.poly([[hd[0] + 0.6, hd[1] + 4.6], [hd[0] + 1.4, hd[1] + 0.4], [hd[0] + 2.8, hd[1] + 4.6]], P.bone);   // lower tusks
    b.poly([[hd[0] + 4.4, hd[1] + 4.6], [hd[0] + 5.4, hd[1] + 0.8], [hd[0] + 6.6, hd[1] + 4.2]], P.bone);
    b.rect(hd[0] - 1, hd[1] - 3.4, 8, 1.2, P.stone[0]);                                                      // brow ridge
    if (eyes && !dead) { b.rect(hd[0] + 1.2, hd[1] - 1.8, 2, 1.8, C.amber); b.rect(hd[0] + 4.4, hd[1] - 1.8, 2, 1.8, C.amber); b.raw(hd[0] + 1.4, hd[1] - 1.8, C.white); b.raw(hd[0] + 4.6, hd[1] - 1.8, C.white); }
    else { for (const x of [1.6, 4.8]) { b.raw(hd[0] + x, hd[1] - 1.4, OUT); b.raw(hd[0] + x + 1, hd[1] - 0.4, OUT); b.raw(hd[0] + x + 1, hd[1] - 1.4, OUT); b.raw(hd[0] + x, hd[1] - 0.4, OUT); } }
    b.ell(hd[0] - 4, hd[1] - 0.4, 1.6, 2.2, dk(HR, 0.8)); // ear
    // near arm + hand + club
    const na = T(9, -29);
    b.cap(na[0], na[1], gripH[0], gripH[1], 4.2, 3.6, R);
    b.ell(gripH[0], gripH[1], 3.6, 3.4, dk(R, 0.92));
    if (anim === 'attack' && f === 0) b.ell(gripH[0], gripH[1], 3.6, 3.4, dk(R, 0.92));
    if (slam) { chunks(b, [[28, -5, 1.4], [33, -8, 1.2], [36, -3, 1.4], [24, -9, 1]], P.dirt); b.line(30, 0, 38, -1, P.dirt[0]); }
    b.fl = 0; b.rim('#b9b6dc'); b.outline();
  }

  function drawTrollSleep(b, f) {
    const R = P.stone, br = f ? -0.7 : 0;
    b.cap(14, -3, 33, -2.5, 2, 2.4, P.bark, 1); b.ell(33, -4, 2.6, 3.4, P.bark);                      // club on the floor
    b.ell(-3, -13 + br * 0.5, 15, 11.5 + br, R, 0);                                                     // boulder-like back
    b.patch(-4, -21, 10, 4, P.leaf, 3); b.patch(3, -18, 5, 3, P.leafDk, 8);
    for (let i = 0; i < 4; i++) { const x = -10 + i * 4.4; b.poly([[x - 2, -21 + br], [x + 0.2, -27 + br - (i % 2)], [x + 2.2, -21 + br]], R); }
    b.ell(6, -3.2, 9, 3, dk(R, 0.78), 0);                                                              // tucked legs
    b.ell(14, -3.5, 4.6, 2.8, dk(R, 0.7), 0, 1);                                                       // feet
    b.ell(9, -14 + br * 0.4, 6, 7, dk(R, 1.08), 0);                                                    // belly / knees
    b.cap(-1, -17, 15, -10, 3.8, 3.2, R); b.ell(15.5, -10, 3.4, 3.2, dk(R, 0.92));                      // folded arms
    b.ell(11, -17 + br * 0.4, 5.2, 4.8, R);                                                             // head resting on chest
    b.ell(12.5, -14.5 + br * 0.4, 3.6, 2, dk(R, 0.85));
    b.poly([[13, -14.5 + br * 0.4], [13.6, -17.8 + br * 0.4], [14.6, -14.5 + br * 0.4]], P.bone);
    b.rect(10, -18.2 + br * 0.4, 5.2, 0.9, R[0]);
    b.line(11.5, -16.4 + br * 0.4, 13.5, -16.4 + br * 0.4, OUT); b.line(14, -16.4 + br * 0.4, 15.4, -16.4 + br * 0.4, OUT);   // shut eyes
    zed(b, 17, -26 - f * 2, P.bone[2]);
    if (f) zed(b, 21, -34, P.bone[1]); else b.raw(20, -31, P.bone[1]);
    b.rim('#b9b6dc'); b.outline();
  }

  // =========================================================================================================
  // OLD BRAMBLEHORN — the guardian: huge antlered tree-beast, ~3x hero
  // =========================================================================================================
  function drawBramble(b, anim, f) {
    const R = P.bark;
    let dy = 0, dx = 0, lean = 0, fl = 0, eye = C.amber, dead = 0, ph = null;
    // arm targets: near (right) & far (left): [elbow,fist]
    let nA = [[14, -17], [13, -7]], fA = [[-13, -17], [-11, -7]];
    let footN = [7, 0], footF = [-7, 0], kneeN = null, tele = 0, stomp = 0, grab = 0, closed = 0;
    if (anim === 'idle') { dy = [0, -0.5][f]; nA[1] = [13, -7 + f * 0.8]; fA[1] = [-11, -7 - f * 0.6]; }
    else if (anim === 'walk') {
      ph = f * Math.PI / 2; const s = Math.sin(ph);
      dy = [0, -1, 0, -1][f]; footN = [7 + s * 5, -Math.max(0, -Math.cos(ph)) * 3]; footF = [-7 - s * 5, -Math.max(0, Math.cos(ph)) * 3];
      nA = [[14 - s * 2, -17], [13 - s * 5, -7]]; fA = [[-13 + s * 2, -17], [-11 + s * 5, -7]];
    } else if (anim === 'attack') {
      if (f === 0) { lean = -0.1; dx = -2; nA = [[16, -37], [10, -50]]; fA = [[-14, -22], [-15, -12]]; }
      else { lean = 0.14; dx = 3; dy = 1.5; nA = [[20, -22], [27, -3]]; fA = [[-13, -18], [-9, -8]]; stomp = 0; grab = 0; }
    } else if (anim === 'stomp') {
      if (f === 0) { lean = -0.12; dx = -2; footN = [11, -12]; kneeN = [14, -17]; nA = [[24, -35], [27, -47]]; fA = [[-22, -35], [-24, -47]]; eye = C.hot; tele = 1; dy = -1; }
      else { lean = 0.06; dx = 1; dy = 2.5; footN = [14, 0]; kneeN = [17, -8]; nA = [[22, -22], [27, -14]]; fA = [[-20, -22], [-22, -14]]; eye = C.hot; stomp = 1; }
    } else if (anim === 'grab') {
      lean = 0.1; dx = 2; dy = 1.5; eye = C.hot; nA = [[18, -17], [26, -1.5]]; fA = [[10, -15], [21, -1.5]]; grab = f + 1;
    } else if (anim === 'hit') { lean = -0.1; dx = -2.5; fl = 0.4; closed = 1; nA = [[12, -19], [9, -10]]; fA = [[-14, -19], [-14, -11]]; }
    else if (anim === 'death') {
      dead = f + 1; closed = 1;
      if (f === 0) { lean = -0.2; dx = -3; fl = 0.4; nA = [[16, -29], [19, -37]]; fA = [[-16, -29], [-19, -36]]; }
      if (f === 1) { dy = 9; lean = -0.08; dx = -2; nA = [[14, -10], [17, -2.5]]; fA = [[-13, -10], [-15, -2.5]]; }
    }
    b.fl = fl;
    // ground marks (telegraphs / impacts) go first
    if (tele) { b.ring(21, -0.5, 11, 3, C.hot, 0.9, 24, 0); b.ring(21, -0.5, 7, 1.8, C.amber, 0.8, 14, 0.5); for (const x of [14, 21, 28]) crossPlus(b, x, -1, C.hot, 0.9); }
    if (stomp) {
      for (const [x0, x1, y1] of [[16, 26, -2], [17, 31, -5], [14, 23, 0.5]]) b.line(x0, 0, x1, y1, OUT);
      b.ell(24, -1, 11, 2.2, P.dirt, 0, 1); b.ring(24, -1.5, 12, 4, P.bark[3], 0.9, 30, 0.2);
      chunks(b, [[24, -7, 1.6], [30, -9, 1.4], [34, -4, 1.4], [28, -13, 1.2], [20, -10, 1.2], [35, -8, 1]], P.dirt);
    }
    if (dead === 3) {                                                  // stump with fallen crown and leaf drift
      for (const [x0, x1, y1] of [[-6, -17, -1], [-3, -19, -4], [6, 18, -1], [7, 16, -5], [0, 4, 3]]) b.cap(x0, -3, x1, y1, 3, 1.2, R);
      b.ell(0, -7, 12, 7.5, R); b.ell(1, -13.5, 9.5, 3, dk(R, 1.05), 0, 2); b.ell(1, -13.5, 7, 2, P.wood, 0, 2);
      for (let i = -3; i <= 3; i++) b.line(i * 3 + 1, -6, i * 3 + (i < 0 ? -1 : 1), -1, R[0]);
      b.ring(1, -13.5, 3.2, 1, R[1], 1, 8); b.ring(1, -13.5, 5.5, 1.5, R[1], 1, 12);
      b.patch(-3, -8, 8, 4, P.leaf, 4); b.patch(6, -6, 4, 3, P.leafDk, 1);
      for (const [x, y, s] of [[-8, -10, 1], [10, -9, -1]]) b.cap(x, y, x + s * 3, y - 4, 1.8, 1, R);
      // the antler crown lies beside the stump
      const lie = (x, y, a, l, r, d) => { const tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l; b.cap(x, y, tx, ty, r, r * 0.6, P.wood); if (d > 0) { const mx = lerp(x, tx, 0.55), my = lerp(y, ty, 0.55); lie(mx, my, a - 0.6, l * 0.55, r * 0.7, d - 1); lie(tx, ty, a + 0.4, l * 0.5, r * 0.6, d - 1); } };
      lie(14, -2.5, -0.15, 22, 1.7, 2); lie(15, -1.4, -0.5, 14, 1.4, 1);
      b.ell(14, -2.5, 4, 3.2, R); b.ell(15, -2.8, 2.2, 2, P.dark, 0, 1);
      for (const [x, y] of [[-14, -4], [4, -16], [-9, -14], [22, -9], [-2, -22], [26, -3]]) { b.rect(x, y, 1.6, 1, P.leaf[hn(x, y) > 0.5 ? 1 : 2]); }
      b.outline(); return;
    }
    const T = (x, y) => { const c = Math.cos(lean), s = Math.sin(lean), py = y + 12; return [x * c - py * s + dx, py * c + x * s - 12 + dy]; };
    const kneel = dead === 2;
    // far leg, far arm
    const leg = (hipx, foot, knee, RR) => {
      const hip = T(hipx, -13);
      if (kneel) { b.cap(hip[0], hip[1], hipx + 8, -4, 5.4, 4.2, RR); b.cap(hipx + 8, -4, hipx - 6, -2, 4.2, 3.6, RR); return; }
      const k = knee || [lerp(hip[0], foot[0], 0.5) + 1.5, lerp(hip[1], foot[1], 0.5)];
      b.cap(hip[0], hip[1], k[0], k[1], 5.6, 4.6, RR); b.cap(k[0], k[1], foot[0], foot[1] - 1, 4.6, 3.8, RR);
      for (const o of [-4, -1.5, 1.2, 3.6]) b.cap(foot[0] + o * 0.4, foot[1] - 2, foot[0] + o * 1.6 + 1, foot[1] + 0.2, 1.7, 0.8, RR);    // root toes
    };
    const arm = (sx, sy, elbow, fist, RR, near) => {
      const s = T(sx, sy), e = [elbow[0] + dx, elbow[1] + dy * 0.6], fi = [fist[0] + dx, fist[1] + dy * 0.4];
      b.cap(s[0], s[1], e[0], e[1], 4.6, 3.8, RR); b.cap(e[0], e[1], fi[0], fi[1], 3.8, 3.2, RR);
      b.ell(fi[0], fi[1], 3.9, 3.5, RR);
      for (const o of [-2.6, 0, 2.6]) b.cap(fi[0] + o * 0.6, fi[1] + 1, fi[0] + o * 1.1, fi[1] + 5, 1.3, 0.6, RR);   // root fingers
      if (near) b.patch(e[0], e[1] - 1, 4, 2.5, P.leaf, 2);
    };
    arm(-9, -29, fA[0], fA[1], dk(R, 0.7), false);
    leg(-5.5, footF, null, dk(R, 0.72));
    // torso trunk
    const tc = T(0, -23);
    b.ell(tc[0], tc[1], 11.5, 11.5, R, lean * 0.5);
    const lowB = T(0, -17); b.ell(lowB[0], lowB[1], 10, 8, R);
    const pec = T(5, -26); b.ell(pec[0], pec[1], 6.5, 7, dk(R, 1.1), 0);
    for (let i = -4; i <= 4; i++) { const p = T(i * 2.4, -31), q = T(i * 2.1 + (i < 0 ? -0.5 : 0.5), -12 - Math.abs(i)); b.line(p[0], p[1] + Math.abs(i) * 0.6, q[0], q[1], R[0]); }
    const kn = T(-5, -22); b.ell(kn[0], kn[1], 2.2, 3, P.dark, 0, 1); b.ell(kn[0] + 0.5, kn[1], 1, 1.7, R[0], 0, 0);    // knothole
    b.patch(tc[0] - 3, tc[1] - 9, 10, 4, P.leaf, 11); b.patch(tc[0] + 6, tc[1] - 4, 5, 4, P.leafDk, 12); b.patch(tc[0] - 4, tc[1] + 8, 6, 3, P.leaf, 13);
    for (const [x, y] of [[-8, -15], [8, -13], [-1, -9]]) { const p = T(x, y); b.poly([[p[0] - 1.4, p[1]], [p[0], p[1] + 4], [p[0] + 1.4, p[1]]], P.leafDk); }   // hanging moss
    leg(5.5, footN, kneeN, R);
    // head + crown
    const hd = T(3, -34 + (dead === 2 ? 7 : 0));
    // antlers first (behind head)
    const br = (x, y, a, l, r, d) => {
      const tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l;
      b.cap(x, y, tx, ty, r, r * 0.62, P.wood);
      if (d > 0) { const mx = lerp(x, tx, 0.5), my = lerp(y, ty, 0.5); br(mx, my, a - 0.62, l * 0.62, r * 0.72, d - 1); br(tx, ty, a + 0.4, l * 0.66, r * 0.7, d - 1); }
    };
    const up = -Math.PI / 2, ds = dead === 2 ? 0.5 : 0, sway = anim === 'attack' && f === 1 ? 0.12 : 0;
    br(hd[0] - 3, hd[1] - 4, up - 0.72 + ds + sway, 11, 2, 2); br(hd[0] + 1, hd[1] - 5, up - 0.18 + ds + sway, 10, 1.8, 2);
    br(hd[0] + 4, hd[1] - 4, up + 0.5 - ds * 0.5 + sway, 11, 2, 2); br(hd[0] - 1, hd[1] - 5, up - 0.45 + ds + sway, 7.5, 1.5, 1);
    b.ell(hd[0], hd[1], 7, 6.2, R);
    b.ell(hd[0] + 0.2, hd[1] - 4, 6, 2, dk(R, 1.1), 0);
    b.poly([[hd[0] - 6, hd[1] - 1], [hd[0] - 9.5, hd[1] - 4.5], [hd[0] - 5, hd[1] - 4]], R);        // bark ears
    b.ell(hd[0] + 2.2, hd[1] + 0.4, 4.2, 4, P.dark, 0, 1);                                        // hollow face
    b.patch(hd[0] - 3, hd[1] - 4, 5, 2, P.leaf, 6);
    if (closed || dead) { b.rect(hd[0] + 0.4, hd[1] - 0.6, 2, 0.8, eye === C.amber ? '#6b5a6e' : OUT, 1); b.rect(hd[0] + 3.4, hd[1] - 0.6, 2, 0.8, '#6b5a6e'); }
    else { b.rect(hd[0] + 0.4, hd[1] - 1.4, 2, 1.5, eye); b.rect(hd[0] + 3.4, hd[1] - 1.4, 2, 1.5, eye); b.raw(hd[0] + 0.4, hd[1] - 1.4, C.white); b.raw(hd[0] + 3.4, hd[1] - 1.4, C.white); }
    for (const x of [0.2, 2.6, 5]) b.poly([[hd[0] + x - 0.9, hd[1] + 2.6], [hd[0] + x, hd[1] + 5.4 + (grab || stomp ? 1.5 : 0)], [hd[0] + x + 0.9, hd[1] + 2.6]], P.wood);        // root fangs
    b.poly([[hd[0] - 3, hd[1] + 4.5], [hd[0] - 2, hd[1] + 10], [hd[0] + 1, hd[1] + 6], [hd[0] + 3, hd[1] + 9], [hd[0] + 4, hd[1] + 5]], P.leaf);                               // moss beard
    arm(9, -29, nA[0], nA[1], R, true);
    // root-grab: roots erupting from the ground in front of the guardian
    if (grab) {
      const sprout = (x, hgt, lean2, r, RR) => {
        const m1 = [x + lean2 * 0.3, -hgt * 0.5], m2 = [x + lean2, -hgt];
        b.cap(x, 0.6, m1[0], m1[1], r, r * 0.85, RR); b.cap(m1[0], m1[1], m2[0], m2[1], r * 0.85, r * 0.35, RR);
        b.poly([[m2[0] - 0.6, m2[1] + 1], [m2[0] + lean2 * 0.25, m2[1] - 2.8], [m2[0] + 0.7, m2[1] + 1]], P.wood);
      };
      b.ell(28, -0.5, 11, 2.4, P.dirt, 0, 0);
      if (grab === 1) { for (const [x, h, l] of [[24, 4, -2], [28, 6.5, 1], [32, 4.5, 2]]) sprout(x, h, l, 1.5, R); b.ring(28, -0.5, 9, 2.4, C.hot, 0.95, 22, 0); chunks(b, [[24, -5, 1.2], [34, -7, 1.2], [38, -3, 1]], P.dirt); }
      else {
        for (const [x, h, l, r] of [[22, 13, 5, 2.2], [26, 17, 4, 2.4], [30, 18, -2, 2.4], [34, 14, -6, 2.2], [36, 8, -4, 1.8]]) sprout(x, h, l, r, R);
        chunks(b, [[21, -6, 1.6], [28, -4, 1.4], [33, -5, 1.6], [37, -3, 1.4], [25, -12, 1.2], [35, -13, 1.2]], P.dirt);
      }
    }
    if (anim === 'attack' && f === 1) { chunks(b, [[28, -5, 1.6], [34, -8, 1.4], [37, -3, 1.4], [24, -9, 1.2]], P.dirt); b.line(31, 0, 40, -1, OUT); }
    b.fl = 0; b.outline();
  }

  // ---- registry ---------------------------------------------------------------------------------------------
  const BASE = { idle: 2, walk: 4, attack: 2, hit: 1, death: 3 };
  const DEF = {
    dreammoth: { label: 'Dream Moth', w: 20, h: 18, ax: 9, ay: 14, scale: 0.45, anims: { ...BASE }, make: (b, a, f) => drawMoth(b, a, f), s: 1, ox: 0, oy: 0, outA: 0.8 },
    brambleshaman: { label: 'Bramble Shaman', w: 48, h: 52, ax: 15, ay: 48, scale: 1.1, anims: { ...BASE, heal: 2 }, make: (b, a, f) => drawShaman(b, a, f), s: 1, ox: 15, oy: 48 },
    thornbackboar: { label: 'Thornback Boar', w: 52, h: 38, ax: 15, ay: 33, scale: 1, anims: { ...BASE, burrow: 2, erupt: 2 }, make: (b, a, f) => drawQuad(b, BOAR, a, f), s: 1, ox: 15, oy: 33 },
    mountaintroll: { label: 'Mountain Troll', w: 60, h: 64, ax: 19, ay: 60, scale: 1.4, anims: { ...BASE, sleep: 2 }, make: (b, a, f) => drawTroll(b, a, f), s: 1, ox: 19, oy: 60 },
    mossjaw: { label: 'Mossjaw (mini-boss)', w: 124, h: 70, ax: 50, ay: 64, scale: 2, anims: { ...BASE }, make: (b, a, f) => drawQuad(b, WOLF, a, f), s: 2, ox: 50, oy: 64 },
    bramblehorn: { label: 'Old Bramblehorn (guardian)', w: 140, h: 134, ax: 58, ay: 128, scale: 3, anims: { ...BASE, stomp: 2, grab: 2 }, make: (b, a, f) => drawBramble(b, a, f), s: 2.2, ox: 58, oy: 128 },
  };
  // WOLF mossjaw ground sits at y=oy in screen px; BOAR units already use ground y=0 -> pivot handled by oy.

  const cache = new Map();
  function build(key, anim, frame) {
    const d = DEF[key];
    if (!d) throw new Error('ENEMY_ART: unknown sprite key ' + key);
    if (!d.anims[anim]) anim = 'idle';
    const n = d.anims[anim], f = ((frame | 0) % n + n) % n, id = key + '|' + anim + '|' + f;
    let c = cache.get(id);
    if (!c) {
      const b = new Buf(d.w, d.h, d.s, d.ox, d.oy);
      d.make(b, anim, f);
      c = b.canvas();
      cache.set(id, c);
    }
    return c;
  }
  const tints = new WeakMap();
  function get(key, anim, frame, opts) {
    const base = build(key, anim, frame);
    if (!opts || !opts.tint) return base;
    const amount = opts.amount == null ? 0.35 : opts.amount, id = opts.tint + '|' + amount;
    let m = tints.get(base);
    if (!m) tints.set(base, m = {});
    if (!m[id]) {
      const t = makeCanvas(base.width, base.height);
      t.x.drawImage(base, 0, 0);
      t.x.globalCompositeOperation = 'source-atop';
      t.x.globalAlpha = amount; t.x.fillStyle = opts.tint; t.x.fillRect(0, 0, base.width, base.height);
      m[id] = t.c;
    }
    return m[id];
  }
  function aura(key, anim, frame, color, radius = 2) {
    const base = build(key, anim, frame), id = 'A' + color + '|' + radius + '|' + key + '|' + anim + '|' + (frame | 0);
    let c = cache.get(id);
    if (!c) {
      const m = makeCanvas(base.width + radius * 2, base.height + radius * 2), sil = silhouette(base, color);
      for (let r = radius; r >= 1; r--) {
        m.x.globalAlpha = 0.75 * (1 - (r - 1) / radius) * 0.9;
        for (let a = 0; a < 16; a++) m.x.drawImage(sil, Math.round(radius + Math.cos(a / 16 * Math.PI * 2) * r), Math.round(radius + Math.sin(a / 16 * Math.PI * 2) * r));
      }
      c = m.c; cache.set(id, c);
    }
    return c;
  }

  const info = {};
  for (const k in DEF) { const d = DEF[k]; info[k] = { label: d.label, w: d.w, h: d.h, ax: d.ax, ay: d.ay, scale: d.scale, anims: { ...d.anims } }; }
  return { get, aura, info, keys: Object.keys(DEF), HERO_W, HERO_H };
})();
