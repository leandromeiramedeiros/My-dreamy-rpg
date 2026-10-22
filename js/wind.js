'use strict';
// js/wind.js -- the wind field (docs/design/wind.md; statuses in docs/design/elements-statuses.md).
//   WIND.sample(x, y, t) -> { vx, vy, s }   ambient (per map / section mood + a travelling gust front + a two-frequency sway,
//                                            closed form) + the live emitters (<= 4 pooled). |W| <= 3 tiles / s; s = |W| / 3.
//                                            The result object is SHARED (zero allocation): read it, never keep it.
//   WIND.emit({ kind, x, y, dir, r, force, life, falloff, arc, by })   kind: vector (cone) | radial | pull | blast | zone.
//                                            force = tiles / s at the centre; life in wind seconds; by: 1 = the hero's own (never
//                                            pushes the hero). The oldest of the 4 slots is dropped when all are live.
//   WIND.cast(name, x, y, dir)               presets for the casts that carry wind: 'gale' | 'tumble' | 'well' | 'blast'.
//   WIND.push(e, sdt)                        the one call line in game.js updateEnemies: enemies take emitters (force x (1 - res.wind)
//                                            x family mass; elites x 0.5; bosses x 0 except a 0.5-tile shove inside `open >= 1 s`
//                                            moves). The hero is pushed from the same call, once a frame, by emitters only, x 0.5,
//                                            never during a dodge. Ambient never moves a body (AMBIENT_PUSH = 0).
//   WIND.canLift(e) / WIND.liftDur(e)        the Lifted rule for the status lane (boss, amorphous and armoured never; elite 0.4 s).
//   WIND.frame(x, y, ph, t) -> -2..+2        a tree's canopy frame (ambient + emitters + blast whip / swing, closed form from the
//                                            blast time); WIND.prop(kind, x, y, ph, t) -> -2..+2 for grass / bush / lantern,
//                                            sampled once per 3-tile cell a frame (chunk-batched).
// Wind time runs on world time: WIND.now() accumulates G.t deltas x worldScale(null) (Hush slows the whole field).
const WIND = (() => {
  const MAXE = 4, CAP = 3, CELL = 3, AMBIENT_PUSH = 0, BLAST_C = 12, SWING_LIFE = 2.2;
  const K_VEC = 0, K_RAD = 1, K_PULL = 2, K_BLAST = 3, K_ZONE = 4;
  const KIND = { vector: K_VEC, radial: K_RAD, pull: K_PULL, blast: K_BLAST, zone: K_ZONE };
  const mk = () => ({ kind: 0, x: 0, y: 0, dx: 1, dy: 0, ca: 0, r: 1, force: 0, life: 0, t0: -1e9, fo: 1, by: 0 });
  const E = [mk(), mk(), mk(), mk()];                                    // pooled emitters
  const SW = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, r: 1, t0: -1e9, f: 1 }));   // blast whip / swing records
  const out = { vx: 0, vy: 0, s: 0 };
  let wt = 0, lastG = -1, lastDt = 0, stamp = 0, liveUntil = -1e9, swUntil = -1e9, curMap = null, heroStamp = -1;
  let mMag = 0.5, mDX = 0.94, mDY = 0.34;
  let ax = 0, ay = 0;                                                    // the emitter field accumulator
  const ws = () => (typeof worldScale === 'function' ? worldScale(null) : 1);
  const gt = () => (typeof G !== 'undefined' && G ? G.t || 0 : 0);

  // ---- mood: per theme, lower in the still sections (under / vault); a section row may carry wind: <0.2..0.8> ----
  const THEME_MOOD = { vale: 0.5, ruins: 0.3, forest: 0.65 };
  function mood(mag, dx, dy) {
    mMag = mag; if (dx !== undefined) { const l = Math.hypot(dx, dy) || 1; mDX = dx / l; mDY = dy / l; }
  }
  function moodFor(m, p) {
    let v = THEME_MOOD[m && m.themeId] || 0.5;
    if (m && p && typeof sectionAt === 'function') {
      const s = sectionAt(m, p.x, p.y);
      if (s) v = s.wind != null ? +s.wind : s.kind === 'under' || s.kind === 'vault' ? 0.2 : v;
    }
    mMag = clamp(v, 0.2, 0.8);
  }
  function reset() { for (const e of E) e.t0 = -1e9; for (const s of SW) s.t0 = -1e9; liveUntil = swUntil = -1e9; }
  // the wind clock: advances once per game frame (the first consumer of a frame ticks it)
  function now() {
    const g = gt();
    if (g !== lastG) {
      let d = g - lastG; if (lastG < 0 || d < 0 || d > 0.25) d = 0;
      lastDt = d * ws(); wt += lastDt; lastG = g; stamp++;
      if (typeof G !== 'undefined' && G) { if (G.map !== curMap) { curMap = G.map; reset(); moodFor(G.map, G.player); } else if ((stamp & 15) === 0) moodFor(G.map, G.player); }
    }
    return wt;
  }

  // ---- emitters ----
  function emit(o, x, y, dir, r, force, life, falloff, by) {
    if (typeof o === 'string') o = { kind: o, x, y, dir, r, force, life, falloff, by };
    const t = now(); let k = 0, best = 1e18;
    for (let i = 0; i < MAXE; i++) { const q = E[i], alive = t < q.t0 + q.life; const key = alive ? q.t0 : -1e18; if (key < best) { best = key; k = i; } }
    const e = E[k], kind = KIND[o.kind] != null ? KIND[o.kind] : K_VEC, d = o.dir || 0;
    e.kind = kind; e.x = o.x; e.y = o.y; e.dx = Math.cos(d); e.dy = Math.sin(d);
    e.r = Math.max(0.1, o.r || 3); e.force = o.force != null ? o.force : 5; e.life = Math.max(0.05, o.life || 0.4); e.fo = o.falloff != null ? o.falloff : 1;
    e.ca = Math.cos(o.arc != null ? Math.min(o.arc, Math.PI) : 0.6); e.by = o.by ? 1 : 0; e.t0 = t;
    if (t + e.life > liveUntil) liveUntil = t + e.life;
    if (kind === K_BLAST) {   // a whip + decaying swing for the trees (closed form from this time)
      let s = SW[0]; for (const q of SW) if (q.t0 < s.t0) s = q;
      s.x = e.x; s.y = e.y; s.r = e.r; s.t0 = t; s.f = clamp(e.force / 12, 0.5, 1.2); swUntil = t + SWING_LIFE + e.r / BLAST_C;
    }
    return e;
  }
  const PRESET = {
    gale: { kind: 'vector', r: 6, arc: 0.45, force: 7, life: 0.7, falloff: 0.6, by: 1 },
    tumble: { kind: 'vector', r: 3.2, arc: 0.5, force: 5, life: 0.35, falloff: 1, by: 1 },
    well: { kind: 'pull', r: 3.6, force: 1.4, life: 2.6, falloff: 1, by: 1 },
    blast: { kind: 'blast', r: 4, force: 14, life: 0.15, falloff: 0.8, by: 1 },
  };
  function cast(name, x, y, dir) {
    const p = PRESET[name]; if (!p) return null;
    return emit({ kind: p.kind, x, y, dir: dir || 0, r: p.r, arc: p.arc, force: p.force, life: p.life, falloff: p.falloff, by: p.by });
  }
  const blast = (x, y, r, force) => emit({ kind: 'blast', x, y, dir: 0, r: r || 4, force: force != null ? force : 14, life: 0.15, falloff: 0.8, by: 0 });

  // the emitter field at (x, y) -> ax, ay (tiles / s). forHero skips the hero's own emitters.
  function field(x, y, t, forHero) {
    ax = 0; ay = 0;
    for (let i = 0; i < MAXE; i++) {
      const e = E[i], a = t - e.t0; if (a < 0 || a > e.life) continue;
      if (forHero && e.by) continue;
      const rx = x - e.x, ry = y - e.y, d2 = rx * rx + ry * ry; if (d2 >= e.r * e.r) continue;
      const d = Math.sqrt(d2), u = 1 - d / e.r;
      let w = e.fo === 1 ? u : e.fo === 2 ? u * u : Math.pow(u, e.fo);
      const k = e.kind;
      if (k === K_VEC) {
        if (d > 0.05 && (rx * e.dx + ry * e.dy) / d < e.ca) continue;
        w *= e.force * (1 - a / e.life); ax += e.dx * w; ay += e.dy * w;
      } else if (d > 0.01) {
        if (k === K_RAD) { w *= e.force * (1 - a / e.life); ax += rx / d * w; ay += ry / d * w; }
        else if (k === K_BLAST) {   // a ring front sweeping out over the 0.15 s
          const ring = e.r * Math.min(1, a / e.life), band = 1 - Math.abs(d - ring) / (e.r * 0.6); if (band <= 0) continue;
          w *= e.force * band * (1 - 0.5 * a / e.life); ax += rx / d * w; ay += ry / d * w;
        } else if (k === K_PULL) { w *= e.force * Math.min(1, d / 0.6) * Math.min(1, a / 0.2, (e.life - a) / 0.2 + 0.0001); ax -= rx / d * w; ay -= ry / d * w; }
        else { w *= e.force * Math.min(1, a / 0.3, (e.life - a) / 0.3 + 0.0001); ax += -ry / d * w; ay += rx / d * w; }   // zone: a slow tangent swirl
      }
    }
  }
  // ---- ambient (closed form) ----
  function ambient(x, y, t) {
    const g = 0.55 + 0.45 * Math.sin(t * 0.43 - (x * mDX + y * mDY) * 0.25), ph = x * 0.23 + y * 0.17;
    const sw = Math.sin(t * 1.21 + ph) * 0.62 + Math.sin(t * 2.37 + ph * 1.73) * 0.38, m = mMag * (0.4 + 1.2 * g);
    ax = mDX * m - mDY * sw * m * 0.3; ay = mDY * m + mDX * sw * m * 0.3;
    return g;
  }
  function sample(x, y, t) {
    ambient(x, y, t); const bx = ax, by = ay;
    if (t < liveUntil) { field(x, y, t, 0); ax += bx; ay += by; } else { ax = bx; ay = by; }
    let m = Math.sqrt(ax * ax + ay * ay);
    if (m > CAP) { ax *= CAP / m; ay *= CAP / m; m = CAP; }
    out.vx = ax; out.vy = ay; out.s = m / CAP;
    return out;
  }

  // ---- receivers: bodies ----
  const hasTag = (e, k) => e.tags && e.tags.indexOf(k) >= 0;
  function mass(e) {
    if (hasTag(e, 'armoured')) return 0.3;
    if (hasTag(e, 'amorphous')) return 0.5;
    if (hasTag(e, 'ethereal') || hasTag(e, 'flying')) return 1.5;
    return 1;
  }
  const canLift = e => !(e.boss || hasTag(e, 'amorphous') || hasTag(e, 'armoured'));
  const liftDur = e => (canLift(e) ? (e.elite ? 0.4 : 0.8) : 0);
  function pushHero(p, dt) {
    if (p.dead || p.dash || dt <= 0) return;
    field(p.x, p.y, wt, 1); if (ax === 0 && ay === 0) return;
    moveEntity(p, ax * 0.5 * dt, ay * 0.5 * dt, tileH(G.map, p.x, p.y));
  }
  function push(e, sdt) {
    const t = now();
    if (heroStamp !== stamp) { heroStamp = stamp; if (t < liveUntil && G.player) pushHero(G.player, lastDt); }
    if (t >= liveUntil || e.dead || !(sdt > 0)) return;
    field(e.x, e.y, t, 0); if (ax === 0 && ay === 0) return;
    let k = mass(e) * (1 - clamp((e.res && e.res.wind) || 0, -1, 1)) * (e.elite ? 0.5 : 1), dx, dy;
    dx = ax * k * sdt; dy = ay * k * sdt;
    if (e.boss) {   // never moved, but a 0.5-tile shove in total inside a move whose open window is >= 1 s
      const mv = e.bk && e.bk.mv;
      if (!mv || !(mv.open >= 1) || !(mv.t > mv.wind)) return;
      if (e._wmv !== mv) { e._wmv = mv; e._wsh = 0; }
      dx = ax * sdt; dy = ay * sdt;
      const len = Math.sqrt(dx * dx + dy * dy), room = 0.5 - e._wsh;
      if (room <= 0 || len < 1e-9) return;
      if (len > room) { dx *= room / len; dy *= room / len; }
      e._wsh += Math.min(len, room);
    }
    moveEntity(e, dx, dy, tileH(G.map, e.x, e.y));
  }

  // ---- receivers: trees (5 canopy frames) ----
  const gustD = (x, y, ph, t) => {
    const g = 0.55 + 0.45 * Math.sin(t * 0.43 - (x * mDX + y * mDY) * 0.25);
    const sw = Math.sin(t * 1.21 + ph) * 0.62 + Math.sin(t * 2.37 + ph * 1.73) * 0.38;
    return (sw * (0.35 + 0.65 * g) + (g - 0.55) * 0.9) * clamp(mMag / 0.5, 0.4, 1.3);
  };
  const quant = d => (d >= 1.5 ? 2 : d >= 0.62 ? 1 : d <= -1.5 ? -2 : d <= -0.62 ? -1 : 0);
  function frame(x, y, ph, t) {
    let d = gustD(x, y, (ph || 0) + x * 0.23 + y * 0.17, t);
    if (t < liveUntil) { field(x, y, t, 0); d += (ax - ay) * 0.6; }   // screen-x of the emitter vector (isoX = (x - y) * 16)
    if (t < swUntil) {
      for (let i = 0; i < 4; i++) {
        const s = SW[i], rx = x - s.x, ry = y - s.y, dist = Math.sqrt(rx * rx + ry * ry); if (dist > s.r * 1.8) continue;
        const a = t - s.t0 - dist / BLAST_C; if (a < 0 || a > SWING_LIFE) continue;
        const kd = (1 - dist / (s.r * 1.8)) * s.f, sg = rx - ry >= 0 ? 1 : -1;
        if (a < 0.12) d += sg * 3.2 * kd + (kd > 0.15 ? sg * 1.6 : 0);                    // the 2-frame whip: the far frame
        else { const b = a - 0.12; d += -sg * 2.8 * kd * Math.exp(-2.4 * b) * Math.cos(9 * b + (ph || 0) * 0.25); }   // the decaying swing
      }
    }
    return quant(d);
  }
  const active = () => wt < liveUntil || wt < swUntil;

  // ---- receivers: props (grass 1, bush 2, lantern 3), one field sample per 3-tile cell a frame ----
  const CN = 512, ckx = new Int32Array(CN).fill(-99999), cky = new Int32Array(CN), cst = new Int32Array(CN).fill(-1), cvx = new Float32Array(CN), cvy = new Float32Array(CN), cs = new Float32Array(CN);
  function prop(kind, x, y, ph, t) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), i = ((cx * 73856093) ^ (cy * 19349663)) & (CN - 1);
    if (ckx[i] !== cx || cky[i] !== cy || cst[i] !== stamp) {
      const o = sample((cx + 0.5) * CELL, (cy + 0.5) * CELL, t); ckx[i] = cx; cky[i] = cy; cst[i] = stamp; cvx[i] = o.vx; cvy[i] = o.vy; cs[i] = o.s;
    }
    const lean = cvx[i] - cvy[i], s = cs[i];
    const d = lean * 1.1 + Math.sin(t * (1.6 + 2.2 * s) + (ph || 0)) * (0.45 + 0.7 * s) * (kind === 3 ? 0.8 : 1);
    return quant(kind === 1 ? d * 1.1 : d);
  }

  return { sample, emit, cast, blast, push, canLift, liftDur, frame, prop, active, now, mood, reset, mass, PRESET, out, MAXE, CAP,
    get time() { return wt; }, set time(v) { wt = v; }, get liveUntil() { return liveUntil; }, get dir() { return [mDX, mDY]; }, get mag() { return mMag; },
    field: (x, y, t, h) => { field(x, y, t, h); return [ax, ay]; }, _E: E, _SW: SW };
})();
