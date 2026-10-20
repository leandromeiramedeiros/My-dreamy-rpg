'use strict';
// ---------------------------------------------------------------------------
// tools/maps/zone.js -- the `zone` stamp (DESIGN 25.2): ONE big map made of sections that share a grid.
//   zone(spec) composes an outer section (forest), an underground dungeon (hollow), an optional vault (warrens) and an inline arena
//   (clearing) with the same room / path / trigger grammar as the outer / dungeon / boss stamps, plus:
//     * sections    -> map.sections [{ id, name, kind, x, y, w, h, ambient?, dark? }] (the engine's lightmap + darkness + full-map insets)
//                      and a per-section tile patch, coast pad, terrain amplitude and prop palette (scatter is clipped to the section)
//     * void gutters-> 3-tile bands between sections ('v' cliff / 'k' darkness tiles once the engine has them, else plain void)
//     * warp doors  -> `warpdoor` objects (keyed, same-map 0.4 s fade). Until the engine has them the SAME doors are emitted as
//                      same-map portals with `arrive` and the keyed ones as a keydoor barrier in front (gen.js T.warpMode)
//     * density     -> waysides (a point of interest every <= 13.5 tiles of walking) and landmarks (<= ~30) are filled in along the
//                      main paths; gen.pois / gen.timing feed the build.js audit (POI gaps, fight gaps, minutes per section)
//   Ids are namespaced by section: forest rooms / triggers keep their plain names (r1, r2, r3, elite, ...), the hollow uses h_*,
//   the warrens w_*, the arena boss / victory. Barrier ids: wall_crack, bridge_gate, door_key, door_cache, wall_env, arena_gate,
//   hollow_exit_gate, gate_h_r2, gate_h_short, wall_h_crack. Every lever names its gate explicitly (maps.js suffix matching is not used).
// ---------------------------------------------------------------------------
const { waveActions, nearRoomEdge, registerPortals, placePortals } = require('./stamps.js');

const lvlAt = (tbl, x) => { if (tbl == null) return 2; if (!Array.isArray(tbl)) return tbl; let v = tbl[0][1]; for (let i = 0; i < tbl.length; i++) { if (x >= tbl[i][0]) v = tbl[i][1]; } return v; };
function zone(S) {
  S = Object.assign({ w: { main: 2.4, branch: 1.8 }, every: 6.5, text: {}, say: {}, density: 1.1, startOff: [-0.5, 0.8], pad: 3.4, amp: 1.7 }, S);
  registerPortals(S);
  return {
    id: S.id, replaces: S.replaces, patch: S.patch,
    opts: { W: S.W, H: S.H, name: S.name, sub: S.sub, theme: S.theme || 'forest', objective: S.objective, seed: S.seed, pad: S.pad, amp: S.amp, level: S.level },
    layout(g, T) {
      g.zoneSpec = S; g.secObj = {};
      for (const sc of S.sections) g.secObj[sc.id] = g.section(sc.id, { name: sc.name, kind: sc.kind, bounds: sc.bounds, dark: sc.dark, ambient: sc.ambient, patch: sc.patch, pad: sc.pad, amp: sc.amp });
      for (const v of S.gutters || []) g.voidRect(...v);
      for (const [k, d] of Object.entries(S.rooms)) g.room(k, Object.assign({ kind: 'clearing', clear: true, label: k.toUpperCase() }, d));
      for (const f of S.flats || []) g.room('flat_' + f.x + '_' + f.y, Object.assign({ kind: 'flat' }, f));
      for (const [k, p] of Object.entries(S.paths)) g.path(k, Object.assign({ kind: 'branch', w: S.w.branch, meander: 1.6, every: 6 }, p, k === 'main' || k === 'h_main' || k === 'w_main' ? { kind: p.kind || 'main', w: p.w || S.w.main } : {}));
      for (const [k, r] of Object.entries(S.rivers || {})) {
        g.river(k, r);
        if (r.banks) for (let i = 1; i < r.pts.length; i++) {   // a valley of land along the creek (so the water reads as one long stream)
          const a = r.pts[i - 1], b = r.pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (r.banks * 1.1)));
          for (let m = 0; m <= n; m++) { const t = m / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; if (!g.inVoid(x, y)) g.lobe(x, y, r.banks, lvlAt(r.bankLvl, x)); }
        }
      }
      for (const [k, r] of Object.entries(S.ponds || {})) g.pond(k, r);
      for (const b of S.bridges || []) g.bridge(b);
    },
    populate(g, T) { populate(S, g, T); },
  };
}

function populate(S, g, T) {
  const R = g.roomBy, E = S.enemies, X = S.text, SAY = S.say, tr = g.triggers;
  const lootOf = k => (S.chestLoot && S.chestLoot[k]) ? { loot: S.chestLoot[k] } : {};   // DESIGN 19.4: a chest marker's `loot` guarantees one trinket of that slot (passes through gen -> world.js)
  const snap = (x, y, r = 1.6) => g.nearWalkable(x, y, r);
  const r2 = v => Math.round(v * 100) / 100;
  const doorMode = T.warpMode === 'door';
  // a marker snapped to walkable ground, registered as a point of interest
  const put = (kind, x, y, o = {}, rad = 1.4, poi = true) => { const q = snap(x, y, rad); g.marker(kind, q.x, q.y, o); if (poi) g.poi(kind, q.x, q.y); return q; };
  const repeat = t => { t.once = false; return t; };   // shrines re-arm each approach (the checkpoint follows the hero across sections)

  g.setStart(R.start.x + S.startOff[0], R.start.y + S.startOff[1]);
  placePortals(g, S);

  // ============================================================== FOREST: shrines, landmark, props, trail
  const st = R.start;
  g.marker('lantern', st.x + 0.2, st.y - 2.6); g.poi('start', st.x, st.y);
  for (const sg of S.signs || []) { const rm = R[sg.room]; g.marker('sign', rm.x + sg.dx, rm.y + sg.dy, { label: 'sign', text: sg.text }); g.poi('sign', rm.x + sg.dx, rm.y + sg.dy); }
  const shr = {};
  for (const [k, sh] of Object.entries(S.shrines)) {
    const rm = R[sh.room]; shr[k] = { x: rm.x, y: rm.y };
    g.marker('shrine', rm.x, rm.y, { id: k, name: sh.name, label: 'checkpoint', warp: true }); g.poi('shrine', rm.x, rm.y);
    g.anchor(k + '_land', rm.x + 1.7, rm.y + 0.9);
  }
  // hollow midpoint: a plain checkpoint (the sleeper rule needs a shrine touched on the map); only the forest ones are warp shrines
  const hs = R.h_shrine; g.marker('shrine', hs.x, hs.y, { id: 'hollow_shrine', name: 'Root Hollow midpoint', label: 'midpoint checkpoint', warp: false }); g.poi('shrine', hs.x, hs.y);
  const tb = R.tablet;
  put('tablet', tb.x, tb.y - 0.8, { label: 'lore', title: 'Warden stone', text: X.tablet }, 1, true);
  g.marker('chest', tb.x + 1.3, tb.y + 0.6, { label: 'tablet-chest', tier: 'wood' });
  g.marker('chest_silver', R.elite.x, R.elite.y - 0.4, { label: 'elite-chest' }); g.poi('chest', R.elite.x, R.elite.y);
  for (const k of ['r1', 'r2', 'r3']) { g.ring(k, 'lantern', 3 + (k === 'r2' ? 1 : 0), 0.92); g.poi('room', R[k].x, R[k].y); }
  g.ring('r2', 'rock_dark', 8, 1.0, { vn: 1 }); g.ring('r1', 'stump', 5, 0.9); g.ring('r1', 'log', 3, 0.78, { rot: 0.4 });
  for (const k of ['r1', 'start']) g.addObj('sunbeam', R[k].x + 2.2, R[k].y + 1.4, { force: true });
  g.landmark(S.landmark[0], S.landmark[1]);   // the named landmark; fillLandmarks adds the rest of the ~30-tile rhythm below
  // fleeing-animal trail along the road
  const trail = [];
  (S.trail || []).forEach((t, i) => {
    const pp = g.pathPoint('main', t), ang = g.pathAngle('main', t), side = i % 2 ? 1 : -1;
    const f = snap(pp.x + Math.sin(ang) * side * 2.0, pp.y - Math.cos(ang) * side * 2.0); g.addObj('fox', f.x, f.y);
    for (const k of [0, 1]) { const q = snap(pp.x - Math.sin(ang) * side * (1.6 + k) + Math.cos(ang) * (1.2 - 2.4 * k), pp.y + Math.cos(ang) * side * (1.6 + k) + Math.sin(ang) * (1.2 - 2.4 * k)); g.addObj('rabbit', q.x, q.y); }
    trail.push(f); g.poi('trail', f.x, f.y);
  });
  for (const [x, y] of S.foxes || []) { const q = snap(x, y, 2); g.addObj('fox', q.x, q.y); }
  for (const [x, y] of S.rabbits || []) { const q = snap(x, y, 2); g.addObj('rabbit', q.x, q.y); }

  // fishing: the creek spots (+ the animal trail above is the debut), and the hidden pond of the env secret below
  const fishAt = [];
  (S.fish || []).forEach((f, i) => { const q = g.waterEdge(f[0], f[1], 8); g.marker('fishspot', q.x, q.y, { pool: S.id + (i ? '_b' : '_a') }); g.poi('fish', q.x, q.y); fishAt.push(q); });

  // ============================================================== FOREST: fights (r1 -> ford -> r2 -> r3, elite)
  tr.push(T.mapEnter('banner', 'Zone banner', [T.say(SAY.banner)]));
  tr.push(T.enter('intro', 'Pip at the glade', st.x, st.y, 6, [T.dialogue('Pip', X.intro)]));
  if (trail.length) tr.push(T.enter('trail', 'Fleeing animals', trail[0].x, trail[0].y, 4.5, [T.say(SAY.trail), T.objective(S.objective)]));
  if (fishAt.length) tr.push(T.enter('fish_intro', 'Fishing spot', fishAt[0].x, fishAt[0].y, 3.4, [T.banner('Fishing', 'Stand at the water and Interact'), T.dialogue('Pip', ['Ripples, Aerin. Fish are still here.', 'Fishing wakes in a later dream.'])]));
  tr.push(T.enter('tablet', 'Lore tablet', tb.x, tb.y, 2.2, [T.say(SAY.tablet)]));
  const shrineTrig = (k, ids) => tr.push(repeat(T.enter(k, S.shrines[k].name, shr[k].x, shr[k].y, 2.2, [T.checkpoint('Checkpoint: ' + S.shrines[k].name), T.heal(100)])));
  shrineTrig('shrine1');
  let prev = null;
  const fight = (k, cfg, requires) => {
    const rm = R[k];
    tr.push(T.enter(k, cfg.name, rm.x, rm.y, rm.r - 1.5, waveActions(T, g, rm, cfg.waves, cfg.gap, cfg.banner), requires || (prev ? [prev] : undefined)));
    const d = [T.message(cfg.clear.text), T.heal(cfg.clear.heal || 25), T.loot(cfg.clear.rarity || 'uncommon', 1, rm.x, rm.y)]; if (cfg.clear.objective) d.push(T.objective(cfg.clear.objective));
    tr.push(T.allDead(k + '_done', cfg.name + ' cleared', [k], d));
    prev = k + '_done';
  };
  fight('r1', E.r1);
  // wayside ambush(es): the ford (boars resist pierce), placed on the main path by arclength fraction
  for (const a of S.ambush || []) {
    const pp = a.at ? g.pathPoint(a.at.path || 'main', a.at.frac) : { x: a.x, y: a.y }, c = snap(pp.x, pp.y);
    g.poi('ambush', c.x, c.y);
    tr.push(T.enter(a.id, a.name, c.x, c.y, a.r || 4, [T.banner(a.banner[0], a.banner[1]), T.pack(a.pack, c.x, c.y, { snap, press: a.press, ang: a.ang })], a.requires || [prev]));
    tr.push(T.allDead(a.id + '_done', a.name + ' cleared', [a.id], [T.message(a.clear.text), T.heal(a.clear.heal || 20), T.loot(a.clear.rarity || 'uncommon', 1, c.x, c.y)]));
    prev = a.id + '_done'; S._ambushAt = S._ambushAt || {}; S._ambushAt[a.id] = c;
  }
  shrineTrig('shrine2');
  fight('r2', E.r2);
  fight('r3', E.r3);
  // the elite guards the Hollow key
  const el = R.elite;
  tr.push(T.enter('elite', 'Elite guarding the key', el.x, el.y, el.r + 0.2, [T.banner(E.elite.title, E.elite.sub, true), T.spawn(E.elite.enemy, 1, el.x - 1, el.y, 1.2, { elite: 'shielded' })], ['r1_done']));
  tr.push(T.allDead('elite_done', 'Elite defeated', ['elite'], [T.message(X.eliteDone), T.loot('rare', 1, el.x, el.y, Object.assign({ item: S.key }, E.elite.lootSlot ? { slot: E.elite.lootSlot } : {})), T.dialogue('Pip', [X.keyLine]), T.step(S.quest, 1), T.objective(X.keyObjective)]));

  // ============================================================== FOREST: elite pockets (DESIGN 26.2, the gear loop)
  // S.pockets: [{ id, room, boss, name, sub?, elite, mod, mobs: [[enemy, n], ...] }]. Each pocket is an off-path clearing near its boss:
  //   <id>       enter_area, once: false + a cooldown longer than any visit: it fires once per map entry (G.trig resets on entry and on
  //              respawn) and never settles, so the pocket RESPAWNS on map re-entry. 1 elite (spawn elite: mod) + 3-5 commons.
  //   <id>_done  all_enemies_dead on that card's spawns, once: true -> settles, so only the FIRST clear pays the guarantee: one Rare+ at
  //              item level >= (boss level - 2) in slot 'upgrade' (items.js lootAction: the hero's weakest worn gear slot no earlier pocket
  //              filled, in the family worn there). Later clears drop only the elite's own rollLoot('elite') (normal elite rates).
  const BOSS_LVL = id => { const b = (require('./gamedata.js').BOSS_DATA || {})[id]; if (!b || !b.level) throw new Error('pocket boss without a level: ' + id); return b.level; };
  for (const pk of S.pockets || []) {
    const rm = R[pk.room], floor = BOSS_LVL(pk.boss) - 2, n = pk.mobs.reduce((a, m) => a + m[1], 0);
    if (n < 3 || n > 5) throw new Error(`pocket ${pk.id}: ${n} commons (DESIGN 26.2: 3-5)`);
    g.ring(pk.room, 'lantern', 3, 0.92, { rot: 0.4 }); g.poi('pocket', rm.x, rm.y);
    const spawns = [T.banner(pk.name, pk.sub || 'Elite pocket'), T.spawn(pk.elite, 1, rm.x, rm.y - 0.5, 0.5, { elite: pk.mod })];
    let k = 0; for (const [en, c] of pk.mobs) for (let i = 0; i < c; i++, k++) { const a = 0.5 + k * 2 * Math.PI / n, q = snap(rm.x + Math.cos(a) * 2.1, rm.y + Math.sin(a) * 2.1, 1); spawns.push(T.spawn(en, 1, q.x, q.y, 0.5)); }
    tr.push(Object.assign(T.enter(pk.id, pk.name, rm.x, rm.y, rm.r + 0.4, spawns), { once: false, cooldown: 100000 }));
    tr.push(T.allDead(pk.id + '_done', pk.name + ': first clear', [pk.id], [T.message(pk.done || 'The pocket is quiet. Something good was guarded here.'), T.loot('rare', 1, rm.x, rm.y, { slot: 'upgrade', ilvl: floor })]));
  }

  // ============================================================== FOREST: secrets (crack, bridge lever, env pond, cross-section cache)
  const secretTriggers = [];
  {   // 1. the cracked wall (signposted: lantern tell + Pip hum) -> gem cache
    const pp = g.pathPoint('crack', 0.6), ang = g.pathAngle('crack', 0.6), id = 'wall_crack';
    g.addObj('hidden', pp.x, pp.y, { id, ang: r2(ang), len: 2.4, force: true, sp: 0.1 });
    const lp = g.nearWalkable(pp.x - Math.cos(ang) * 2.2 + Math.sin(ang) * 1.6, pp.y - Math.sin(ang) * 2.2 - Math.cos(ang) * 1.6, 0.8);
    g.marker('lantern', lp.x, lp.y, { label: 'crack-lantern', pointsAt: id }); g.poi('secret', lp.x, lp.y);
    g.marker('gem_cache', R.crack.x, R.crack.y, { label: 'secret gem cache' });
    secretTriggers.push(T.enter('crack_hum', 'The wall hums', pp.x - Math.cos(ang) * 2, pp.y - Math.sin(ang) * 2, 3.2, [T.dialogue('Pip', ['The wall hums, Aerin. Something is hidden behind it.'])]));
    secretTriggers.push(T.enter('crack_open', 'Cracked wall gives way', pp.x - Math.cos(ang) * 0.6, pp.y - Math.sin(ang) * 0.6, 1.5, [T.openGate(id), T.shake(3), T.sound('portal')], ['crack_hum']));
    secretTriggers.push(T.enter('crack_loot', 'Hidden gem cache', R.crack.x, R.crack.y, 2, [T.message('A hidden gem cache!'), T.loot('uncommon', 1, R.crack.x, R.crack.y, { gem: true })]));
  }
  {   // 3. logic secret: a lever lowers the raised bridge -> the islet: a tablet and a Skill Rune
    const b = g.bridges[0], isl = R.islet, lv = R.lever;
    const e0 = b.axis === 'x' ? [[b.x + 0.4, b.y + b.w / 2], [b.x + b.len - 0.4, b.y + b.w / 2]] : [[b.x + b.w / 2, b.y + 0.4], [b.x + b.w / 2, b.y + b.len - 0.4]];
    e0.sort((p, q) => Math.hypot(q[0] - isl.x, q[1] - isl.y) - Math.hypot(p[0] - isl.x, p[1] - isl.y));
    const ge = e0[0];
    g.addObj('gate', ge[0], ge[1], { id: 'bridge_gate', ang: b.axis === 'x' ? 0 : 1.57, len: b.w, force: true, sp: 0.1 });
    g.marker('lever', lv.x + 0.6, lv.y + 1.2, { label: 'bridge-lever', id: 'lever_bridge', gate: 'bridge_gate' }); g.poi('secret', lv.x, lv.y);
    g.marker('chest_gold', isl.x + 0.9, isl.y + 0.6, { label: 'secret-gold-chest' });
    g.marker('tablet', isl.x - 0.9, isl.y - 0.5, { label: 'lore', title: 'Islet stone', text: X.isletTablet });
    secretTriggers.push(T.enter('bridge_pip', 'The raised bridge', ge[0], ge[1], 3.2, [T.dialogue('Pip', ['The bridge is raised. There must be a lever somewhere.'])]));
    secretTriggers.push(T.enter('islet_loot', 'Skill Rune on the islet', isl.x, isl.y, 2.2, [T.message('A Skill Rune rests on the islet stone.'), T.loot('rare', 1, isl.x, isl.y, { item: 'skill_rune' })]));
  }
  {   // 2. environmental secret: a dark-moss trail to a lantern-lit pond; the pond's reflection shows a door -> the Fox Warrens
    const ev = R.env, al = R.alcove;
    g.marker('chest_silver', ev.x - 0.6, ev.y + 1.8, { label: 'detour-chest' });
    const fp = g.waterEdge(ev.x + 1, ev.y + 1, 4); g.marker('fishspot', fp.x, fp.y, { pool: S.id + '_hidden', hidden: true }); g.poi('fish', fp.x, fp.y);
    const lp = snap(ev.x - 1.6, ev.y + 1.4); g.marker('lantern_blue', lp.x, lp.y, { label: 'detour-lantern' }); g.poi('secret', ev.x, ev.y);
    const wp = nearRoomEdge(g, 'env_alcove', 'alcove', -1, 1.0);
    g.addObj('hidden', wp.x, wp.y, { id: 'wall_env', ang: r2(wp.ang), len: S.w.branch, force: true, sp: 0.1 });
    secretTriggers.push(T.enter('env_hint', 'A light off the road', ev.x, ev.y, 4.2, [T.dialogue('Pip', ['A light off the road, Aerin. Worth the detour.'])]));
    secretTriggers.push(T.enter('env_open', 'The pond shows a door', fp.x, fp.y, 2.4, [T.dialogue('Pip', ['The reflection has a door in it. Look behind you.']), T.openGate('wall_env'), T.shake(3), T.sound('portal')], ['env_hint']));
    // the Warrens door pair
    const land = snap(al.x - 2.2, al.y + 0.4, 1);
    g.warp('warrens_door', { x: al.x, y: al.y, to: { x: R.w_door.x + 1.4, y: R.w_door.y - 0.4 }, label: 'Fox Warrens', marker: true });
    g.warp('warrens_exit', { x: R.w_door.x - 2.0, y: R.w_door.y + 1.2, to: { x: land.x, y: land.y }, label: 'Back to the pond', marker: true });
    g.anchor('warrens_in', R.w_door.x + 1.4, R.w_door.y - 0.4); g.anchor('pond_out', land.x, land.y);
    g.poi('door', al.x, al.y);
  }
  {   // 5. cross-section secret, forest end: a root-sealed cache west of the plaza (its key falls from the Hollow ceiling)
    const ca = R.cache, kd = nearRoomEdge(g, 'cache', 'cache', -1, 1.0);
    g.addObj('keydoor', kd.x, kd.y, { id: 'door_cache', key: 'key_rootcache', ang: r2(kd.ang), len: S.w.branch, force: true, sp: 0.1 });
    g.marker('chest_gold', ca.x, ca.y, { label: 'cache-chest' }); g.poi('secret', ca.x, ca.y);
    secretTriggers.push(T.enter('cache_hint', 'A root-sealed cache', kd.x, kd.y, 3, [T.message('Sealed by a knot of roots. It needs a key.')]));
    secretTriggers.push(T.enter('cache_loot', 'The cache opens', ca.x, ca.y, 2.2, [T.message('The roots let go. A cache of the Wardens!'), T.loot('rare', 1, ca.x, ca.y, { gem: true })], ['cache_hint']));
  }
  for (const t of secretTriggers) tr.push(t);

  // ============================================================== HOLLOW (underground section)
  const hst = R.h_start, h1 = R.h_r1, h2 = R.h_r2, den = R.h_den, hc = R.h_crack, hl = R.h_lever, sa = R.h_stair, hd = R.hdoor;
  {   // keyed door into the Hollow
    const kd = nearRoomEdge(g, 'hdoor', 'hdoor', -1, 1.0);
    if (!doorMode) g.addObj('keydoor', kd.x, kd.y, { id: 'door_key', key: S.key, ang: r2(kd.ang), len: S.w.branch, force: true, sp: 0.1 });
    g.warp('hollow_door', { x: hd.x, y: hd.y - 0.2, to: { x: hst.x + 1.4, y: hst.y - 0.3 }, key: S.key, label: 'Root Hollow', marker: true, boss: E.den.doorBoss });
    g.anchor('hollow_in', hst.x + 1.4, hst.y - 0.3); g.poi('door', hd.x, hd.y);
    if (S.doorShrine) {   // DESIGN 26.2 cheap retries: a warp shrine at the boss door, beside the Mossjaw pockets
      const q = snap(hd.x + S.doorShrine.dx, hd.y + S.doorShrine.dy, 1.2);
      g.marker('shrine', q.x, q.y, { id: 'door_shrine', name: S.doorShrine.name, label: 'checkpoint', warp: true }); g.poi('shrine', q.x, q.y); g.anchor('door_shrine_land', q.x + 1.2, q.y + 0.6);
      tr.push(repeat(T.enter('door_shrine', S.doorShrine.name, q.x, q.y, 2.2, [T.checkpoint('Checkpoint: ' + S.doorShrine.name), T.heal(100)])));
    }
    tr.push(T.enter('hdoor_hint', 'The root door', kd.x, kd.y, 3.2, [T.message(X.locked)]));
  }
  {   // the root-stair out: sealed until Mossjaw falls; lands beside shrine 3. Door mode: a warpdoor with open:false that a trigger openGate opens;
      // portal mode: a barrier gate in front of the same-map portal
    const land = snap(shr.shrine3.x + 1.7, shr.shrine3.y + 0.9, 1);
    if (!doorMode) { const gp = nearRoomEdge(g, 'h_stairp', 'h_stair', -1, 1.0); g.addObj('gate', gp.x, gp.y, { id: 'hollow_exit_gate', ang: r2(gp.ang), len: S.w.branch, force: true, sp: 0.1 }); }
    g.warp('hollow_exit', { x: sa.x, y: sa.y, to: { x: land.x, y: land.y }, label: 'Root-stair up to the shrine', marker: true, open: !doorMode });
    g.anchor('hollow_out', land.x, land.y); g.poi('door', sa.x, sa.y);
  }
  // gates / levers inside
  const gp = nearRoomEdge(g, 'h_main', 'h_den', -1, 1.2);
  g.addObj('gate', gp.x, gp.y, { id: 'gate_h_r2', ang: r2(gp.ang), len: S.w.main, force: true, sp: 0.1 });
  const sp = g.pathPoint('h_short', 0.9), spA = g.pathAngle('h_short', 0.9);
  g.addObj('gate', sp.x, sp.y, { id: 'gate_h_short', ang: r2(spA), len: S.w.branch, force: true, sp: 0.1 });
  g.marker('lever', hl.x, hl.y, { label: 'gate-lever', id: 'lever_h_r2', gate: 'gate_h_r2' }); g.poi('lever', hl.x, hl.y);
  g.marker('lever', den.x + den.r * 0.5, den.y + den.r * 0.5, { label: 'shortcut-lever', id: 'lever_h_short', gate: 'gate_h_short' });
  g.marker('chest_gold', den.x, den.y - 1, { label: 'mini-boss-chest', guaranteed: 'epic' });
  g.marker('rune_cache', hc.x, hc.y, { label: 'secret socket rune' }); g.poi('secret', hc.x, hc.y);
  const wp = g.pathPoint('h_crack', 0.6), wa = g.pathAngle('h_crack', 0.6);
  g.addObj('hidden', wp.x, wp.y, { id: 'wall_h_crack', ang: r2(wa), len: 2.2, force: true, sp: 0.1 });
  const hlp = g.nearWalkable(wp.x - Math.cos(wa) * 2.2 + Math.sin(wa) * 1.5, wp.y - Math.sin(wa) * 2.2 - Math.cos(wa) * 1.5, 0.8);
  g.marker('lantern', hlp.x, hlp.y, { label: 'crack-lantern', pointsAt: 'wall_h_crack' });
  g.marker('tablet', h1.x + 1.5, h1.y - h1.r * 0.7, { label: 'lore', title: 'Warden stone', text: X.hollowTablet }); g.poi('tablet', h1.x, h1.y);
  for (const k of ['h_r1', 'h_r2', 'h_den']) { g.ring(k, 'crystal', k === 'h_den' ? 4 : 3, 0.95); g.poi('room', R[k].x, R[k].y); }
  g.poi('start', hst.x, hst.y);
  tr.push(T.enter('h_intro', 'Pip in the dark', hst.x, hst.y, 5, [T.say(SAY.hollow), T.step(S.quest, 2), T.objective(X.hollowObjective)]));
  tr.push(repeat(T.enter('h_shrine', 'Midpoint shrine', hs.x, hs.y, 2.2, [T.checkpoint('Checkpoint: ' + X.hollowShrineName), T.heal(100)])));
  if (S.denShrine) {   // DESIGN 26.2: a warp shrine just outside Mossjaw's gate. Dying in the den respawns here (~6 tiles from the fight), and any
    // forest shrine (door_shrine by the pockets) warps here. Found only past the keyed door and the gallery, so it opens no sequence break:
    // the root-stair out stays sealed until Mossjaw falls, and warping out to a forest shrine only skips a walk.
    const hp = g.pathBy.h_main, want = den.r + S.denShrine.back;
    let best = null; for (const sm of hp.samples) { if (sm.x > den.x) continue; const d = Math.abs(Math.hypot(sm.x - den.x, sm.y - den.y) - want); if (!best || d < best.d) best = { d, x: sm.x, y: sm.y }; }
    const q = snap(best.x, best.y - 1.3, 1.2);
    g.marker('shrine', q.x, q.y, { id: 'den_shrine', name: S.denShrine.name, label: 'checkpoint', warp: true }); g.poi('shrine', q.x, q.y);
    tr.push(repeat(T.enter('den_shrine', S.denShrine.name, q.x, q.y, 2.2, [T.checkpoint('Checkpoint: ' + S.denShrine.name), T.heal(100)])));
  }
  fightIn(T, g, tr, 'h_r1', E.h_r1, null);
  tr.push(T.enter('h_r2', E.h_r2.name, h2.x, h2.y, h2.r - 1.5, waveActions(T, g, h2, E.h_r2.waves, E.h_r2.gap, E.h_r2.banner), ['h_r1_done', 'h_shrine']));
  tr.push(T.allDead('h_r2_done', 'Gallery cleared', ['h_r2'], [T.message(E.h_r2.clear), T.heal(25), T.loot('uncommon', 1, h2.x, h2.y), T.objective('Pull the lever to raise the gate')]));
  // cross-section secret, Hollow end: the ceiling above the second chamber drops the cache key
  tr.push(T.enter('h_ceiling', 'The ceiling gives way', h2.x - 1, h2.y - h2.r * 0.55, 2.4, [T.shake(4), T.sound('boom'), T.message('The ceiling cracks. Something falls: a root key.'), T.dialogue('Pip', ['That is the plaza above us. A key for a cache up there?']), T.loot('uncommon', 1, h2.x, h2.y, { item: 'key_rootcache' })], ['h_r2_done']));
  g.marker('crystal_violet', h2.x - 1, h2.y - h2.r * 0.55 - 0.6, { label: 'ceiling-tell' }); g.poi('secret', h2.x, h2.y);
  tr.push(T.enter('h_gate_hint', 'The rooted gate', gp.x, gp.y, 3, [T.dialogue('Pip', ['The gate is knotted shut. Find a lever.'])], ['h_r2_done']));
  tr.push(T.enter('h_boss', E.den.name, den.x, den.y, den.r - 1.5, [
    T.banner(E.den.title, E.den.sub, true), T.objective('Defeat ' + E.den.title), T.shake(5), T.wait(1.2),
    T.spawn(E.den.enemy, 1, den.x, den.y - 1.5, 0.5, { elite: true }), T.wait(15), T.spawn(E.den.add, 2, den.x - 2, den.y + 2.5, 2), T.wait(15), T.spawn(E.den.add, 2, den.x + 2, den.y + 2.5, 2),
  ], ['h_r2_done']));
  tr.push(T.allDead('h_boss_done', E.den.title + ' falls', ['h_boss'], [
    { type: 'clear_enemies' }, T.banner('Mossjaw falls', 'The root-stair loosens'), T.dialogue(E.den.title, [X.bossLast]), T.heal(100),
    T.loot('epic', 1, den.x, den.y - 1, { sockets: 2, chest: 'gold' }), T.openGate('gate_h_short'), T.openGate(doorMode ? 'hollow_exit' : 'hollow_exit_gate'), T.openGate('arena_gate'), T.step(S.quest, 3), T.objective(X.stairObjective), T.sound('portal'),
  ]));
  tr.push(T.enter('h_crack_hum', 'The wall hums', wp.x - Math.cos(wa) * 2, wp.y - Math.sin(wa) * 2, 3.2, [T.dialogue('Pip', ['The wall hums, Aerin. Something is hidden behind it.'])]));
  tr.push(T.enter('h_crack_open', 'Cracked wall gives way', wp.x - Math.cos(wa) * 0.6, wp.y - Math.sin(wa) * 0.6, 1.5, [T.openGate('wall_h_crack'), T.shake(3), T.sound('portal')], ['h_crack_hum']));
  tr.push(T.enter('h_crack_loot', 'Hidden Socket Rune', hc.x, hc.y, 2, [T.message('A Socket Rune!'), T.loot('rare', 1, hc.x, hc.y, { item: 'socket_rune' })]));

  // ============================================================== WARRENS (vault: a noise puzzle, 3 sleepers)
  {
    const wd = R.w_door, wh = R.w_hall, wv = R.w_vault, W = E.warrens;
    g.marker('chest_gold', wv.x, wv.y - 0.5, Object.assign({ label: 'warrens-chest', guaranteed: 'epic' }, lootOf('vault'))); g.poi('chest', wv.x, wv.y);
    for (const k of ['w_hall', 'w_vault']) { g.ring(k, 'crystal', 4, 0.9); g.poi('room', R[k].x, R[k].y); }
    g.poi('start', wd.x, wd.y);
    tr.push(T.enter('w_enter', 'Fox Warrens', wd.x, wd.y, 4, [T.banner(W.title, W.sub), T.dialogue('Pip', W.pip), T.objective(W.objective)]));
    tr.push(T.enter('w_hall', 'Sleepers in the hall', wh.x, wh.y, wh.r - 1.2, [
      ...W.hall.map(([dx, dy]) => { const c = snap(wh.x + dx, wh.y + dy, 0.9); return T.spawn(W.enemy, 1, c.x, c.y, 0.3, { instant: true }); }),
    ], ['w_enter']));
    tr.push(T.enter('w_vault', 'The sleeper at the vault', wv.x, wv.y, wv.r - 1.2, W.vault.map(([dx, dy]) => { const c = snap(wv.x + dx, wv.y + dy, 0.9); return T.spawn(W.enemy, 1, c.x, c.y, 0.3, { instant: true }); }), ['w_enter']));
    tr.push(T.allDead('w_done', 'Warrens quiet', ['w_hall', 'w_vault'], [T.message(W.done), T.heal(30), T.loot('rare', 1, wv.x, wv.y, { item: 'socket_rune' })]));
  }

  // ============================================================== CLEARING (inline arena, closed by arena_gate)
  {
    const A = R.arena, s3 = shr.shrine3;
    const ag = nearRoomEdge(g, 'main', 'arena', -1, 1.4);
    g.addObj('gate', ag.x, ag.y, { id: 'arena_gate', ang: r2(ag.ang), len: S.w.main, force: true, sp: 0.1 }); g.poi('gate', ag.x, ag.y);
    g.ring('arena', 'brazier', 4, 0.62, { rot: 0.8 });
    g.marker('chest_gold', A.x + A.r * 0.55, A.y - A.r * 0.55, Object.assign({ label: 'boss-chest' }, lootOf('boss')));
    shrineTrig('shrine3');
    tr.push(T.enter('arena_hint', 'The rooted arena gate', ag.x, ag.y, 3.4, [T.message(X.arenaSealed)], ['shrine3']));
    const B = E.boss;
    tr.push(T.enter('boss', B.title, A.x, A.y, A.r - 2, [
      ...T.arena('bramble_arena', 'arena_gate', A.x, A.y, A.r),
      T.banner(B.title, B.sub, true), T.say(SAY.bossIntro), T.objective('Defeat ' + B.title), T.shake(6), T.wait(2.5),
      T.spawn(B.enemy, 1, A.x, A.y - 1.5, 0.5, { elite: true }),
      T.wait(14), T.banner('The saplings wake!', 'Roots push up through the clearing'), T.spawn('sapling', 3, A.x - 2, A.y + 3, 2), T.wait(14), T.spawn('sapling', 3, A.x + 2, A.y + 3, 2),
    ], ['h_boss_done', 'shrine3']));
    tr.push(T.allDead('victory', B.title + ' falls', ['boss'], [
      { type: 'clear_enemies' }, T.banner('Victory', B.victory), T.say(SAY.bossDeath), T.heal(100), T.openGate('arena_gate'),
      T.quest(S.quest, 'The Pinewood Shard', 'The Shard of Root is relit.', true), T.loot('rare', 1, A.x, A.y, { item: 'key_dream' }), T.message(X.dreamKey),
      T.openPortalId('next'), T.openPortalId('home_arena'), T.objective(X.after), T.sound('portal'),
    ]));
  }

  // ============================================================== scatter (per section) + density fill
  for (const sc of S.sections) {
    if (!sc.rules) continue;
    const obj = g.secObj[sc.id], rules = sc.rules(sc.scale || 1).map(r => Object.assign({}, r, { bounds: sc.bounds, p: c => (g.secAt(c.x, c.y) === obj ? r.p(c) : 0) }));
    g.scatter(rules);
  }
  let wk = g.fillWaysides('main', { kinds: null, max: 13.5, set: 'forest' });
  g.fillLandmarks('main', { every: 30, set: 'forest' });
  g.fillWaysides('h_main', { max: 13.5, set: 'cave' });
  g.fillLandmarks('h_main', { every: 30, set: 'cave', off: 4 });
  g.fillWaysides('w_main', { max: 13.5, set: 'cave' });
  g.fillLandmarks('w_main', { every: 30, set: 'cave', off: 4 });
  void wk;

  // ============================================================== timing (the required route): feeds build.js
  g.timing = buildTiming(S.route, g, S.capMinutes || 24, S._ambushAt || {});
}

function fightIn(T, g, tr, k, cfg, requires) {
  const rm = g.roomBy[k];
  tr.push(T.enter(k, cfg.name, rm.x, rm.y, rm.r - 1.5, waveActions(T, g, rm, cfg.waves, cfg.gap, cfg.banner), requires || undefined));
  tr.push(T.allDead(k + '_done', cfg.name + ' cleared', [k], [T.message(cfg.clear), T.heal(25), T.loot('uncommon', 1, rm.x, rm.y), T.objective('Rest at the shrine, then press on')]));
}

// ---- timing: walk the spec's route (stops with an optional fight / pause / warp) at 3.7 tiles/s -------------------
const SPEED = 3.7;
function buildTiming(route, g, cap, ambushAt) {
  const R = g.roomBy, stops = [], at = st => (typeof st.at === 'string' ? (R[st.at] ? { x: R[st.at].x, y: R[st.at].y } : ambushAt[st.at]) : { x: st.at[0], y: st.at[1] });
  let prev = null;
  for (const st of route) {
    const p = at(st); let walk = 0, how = 'start';
    if (prev) {
      if (st.warp) { walk = 0; how = 'warp'; }
      else if (st.on && prev.st.on === st.on) { walk = Math.abs(g.pathProject(st.on, p.x, p.y).s - g.pathProject(st.on, prev.p.x, prev.p.y).s); how = 'path'; }
      else { walk = Math.hypot(p.x - prev.p.x, p.y - prev.p.y) * (st.wind || 1.3); how = 'estimate'; }
    }
    stops.push({ sec: st.sec, label: st.label || st.at, walk: Math.round(walk), how, fight: st.fight || 0, pause: st.pause || 0, warp: !!st.warp, x: p.x, y: p.y });
    prev = { st, p };
  }
  return { speed: SPEED, stops, cap };
}

module.exports = { zone, buildTiming };
