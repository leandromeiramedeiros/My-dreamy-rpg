'use strict';
// ---------------------------------------------------------------------------
// tools/maps/stamps.js -- the three reusable map stamps from DESIGN 11.7
//   outer(spec)    coast + 3 encounter rooms + elite (key) + side branches + 3 secrets + shrine + portals
//   dungeon(spec)  cave/crypt palette, 2 rooms + mini-boss arena, key door, lever gate + lever shortcut, midpoint shrine, 1 secret
//   boss(spec)     compact walled arena + fence of standing stones, chest ledge
// A stamp turns a declarative spec (explicit room coordinates + path waypoints) into a recipe {id, opts, layout, populate}.
// Triggers, markers, secrets and portals are generated from the grammar; geometry stays hand-tuned in the spec.
// New objects (written in --kinds=future, omitted or stood-in in compat): chest*, tablet, lever, gate, keydoor, hidden (fake wall).
// ---------------------------------------------------------------------------
const ANCHORS = {};   // 'mapId.portalKey' -> { portal:{x,y}, landing:{x,y} }   (static, computed from specs so maps can reference each other)

function landing(room, dx, dy) {
  const px = room.x + dx, py = room.y + dy; let vx = room.x - px, vy = room.y - py; const l = Math.hypot(vx, vy);
  if (l < 0.5) { vx = 1; vy = 1; } const L = Math.hypot(vx, vy);
  return { portal: { x: px, y: py }, landing: { x: px + vx / L * 2, y: py + vy / L * 2 } };
}
function registerPortals(S) { for (const [k, p] of Object.entries(S.portals || {})) ANCHORS[S.id + '.' + k] = landing(S.rooms[p.room], p.dx || 0, p.dy || 0); }
function placePortals(g, S) {
  for (const [k, p] of Object.entries(S.portals || {})) {
    const a = ANCHORS[S.id + '.' + k];
    const o = { open: p.open !== false, marker: !!p.marker };
    if (p.arrive) { const t = ANCHORS[p.arrive]; if (!t) throw new Error(`portal ${S.id}.${k}: unknown arrive anchor ${p.arrive}`); o.arrive = { x: Math.round(t.landing.x * 100) / 100, y: Math.round(t.landing.y * 100) / 100 }; }
    const pr = g.portal(a.portal.x, a.portal.y, p.to, o); pr.key = k;
    g.portalIdx = g.portalIdx || {}; g.portalIdx[k] = g.portals.length - 1;
  }
}
const stand = (g, T, id, rm, off) => ({ x: rm.x + (off ? off[0] : 0), y: rm.y + (off ? off[1] : 0) });

// spawn a list of waves around a room; waves = [[ [enemy,count,opts?], ... ], ...]; returns action list
function waveActions(T, rm, waves, gap, banner) {
  const acts = []; if (banner) acts.push(T.banner(banner[0], banner[1], banner[2]));
  waves.forEach((w, wi) => {
    if (wi > 0) acts.push(T.wait(gap || 9));
    w.forEach(([e, n, opts], k) => {
      const a = (wi * 2.1 + k * 2.4) + 0.7, rr = rm.r * 0.42;
      acts.push(T.spawn(e, n, rm.x + Math.cos(a) * rr, rm.y + Math.sin(a) * rr, 2, opts));
    });
  });
  return acts;
}
// point on a path a given distance outside a room's edge (dir +1 = leaving the room, -1 = arriving at it)
function nearRoomEdge(g, pathName, roomId, dir, gap) {
  const p = g.pathBy[pathName], c = p.ctrl.find(q => q.room && q.room.id === roomId), rm = g.roomBy[roomId];
  const target = c.s + dir * (rm.r + gap); let bi = 0, bd = 1e9;
  p.samples.forEach((sm, i) => { const d = Math.abs(sm.s - target); if (d < bd) { bd = d; bi = i; } });
  const t = bi / (p.samples.length - 1);
  return Object.assign(g.pathPoint(pathName, t), { ang: g.pathAngle(pathName, t) });
}

// ============================================================================= outer
function outer(S) {
  S = Object.assign({ w: { main: 2.4, branch: 1.8 }, density: 1.2, startOff: [-0.5, 0.8], text: {}, every: 6.5 }, S);
  registerPortals(S);
  return {
    id: S.id, patch: S.patch,
    opts: Object.assign({ W: 56, H: 56, name: S.name, sub: S.sub, theme: S.theme || 'forest', objective: S.objective, seed: S.seed, pad: S.pad || 3.4, amp: S.amp != null ? S.amp : 1.7 }, S.opts),
    layout(g, T) {
      for (const [k, d] of Object.entries(S.rooms)) g.room(k, Object.assign({ kind: 'clearing', clear: true, label: k.toUpperCase() }, d));
      for (const f of S.flats || []) g.room('flat_' + f.x, Object.assign({ kind: 'flat' }, f));
      g.path('main', { kind: 'main', w: S.w.main, meander: S.meander || 4.6, every: S.every, pts: S.main });
      for (const [k, b] of Object.entries(S.branches || {})) g.path(k, Object.assign({ kind: 'branch', w: S.w.branch, meander: 1.6, every: 6 }, b));
      for (const [k, r] of Object.entries(S.rivers || {})) g.river(k, r);
      for (const b of S.bridges || []) g.bridge(b);
    },
    populate(g, T) {
      const R = g.roomBy, E = S.enemies, X = S.text, F = T.mode === 'future';
      const st = R.start;
      g.setStart(st.x + S.startOff[0], st.y + S.startOff[1]);
      placePortals(g, S);
      // -- checkpoint, signs, tablet, lanterns
      const shr = { x: st.x + 1.8, y: st.y - 1.2 };
      g.marker('shrine', shr.x, shr.y, { label: 'checkpoint' });
      g.marker('lantern', st.x + 0.2, st.y - 2.6);
      for (const sg of S.signs || []) { const rm = R[sg.room]; g.marker('sign', rm.x + sg.dx, rm.y + sg.dy, { label: 'sign', text: sg.text }); }
      if (R.tablet) {
        g.marker('tablet', R.tablet.x, R.tablet.y - 0.8, { label: 'lore', text: X.tablet });
        g.marker('chest', R.tablet.x + 1.3, R.tablet.y + 0.6, { label: 'tablet-chest', tier: 'wood' });
      }
      if (R.elite) g.marker('chest_silver', R.elite.x, R.elite.y - 0.4, { label: 'elite-chest' });
      for (const k of ['r1', 'r2', 'r3']) g.ring(k, 'lantern', 3 + (k === 'r2' ? 1 : 0), 0.92);
      g.ring('r2', 'rock_dark', 8, 1.0, { vn: 1 }); g.ring('r1', 'stump', 5, 0.9); g.ring('r1', 'log', 3, 0.78, { rot: 0.4 });
      for (const [dx, dy] of [[-2, -2], [2.2, -1.4], [0.3, 2.4]]) g.addObj('pine_giant', S.landmark[0] + dx, S.landmark[1] + dy, { v: 1, force: true, sp: 2.5 });   // visible-from-afar landmark
      g.scatter(S.palette(S.density));
      for (const [x, y] of S.foxes || []) { const q = g.nearWalkable(x, y, 2); g.addObj('fox', q.x, q.y); }
      for (const [x, y] of S.rabbits || []) { const q = g.nearWalkable(x, y, 2); g.addObj('rabbit', q.x, q.y); }
      for (const k of ['r1', 'start']) g.addObj('sunbeam', R[k].x + 2.2, R[k].y + 1.4, { force: true });

      // -- secrets (11.3): signposted / environmental / logic
      const sec = S.secrets || {}, tr = g.triggers;
      const secretTriggers = [];
      if (sec.crack) {     // signposted: cracked wall + lantern + Pip hum -> touch opens -> gem
        const pp = g.pathPoint('crack', sec.crack.t || 0.55), ang = g.pathAngle('crack', sec.crack.t || 0.55), id = 'wall_crack';
        g.addObj('hidden', pp.x, pp.y, { id, ang: Math.round(ang * 100) / 100, len: 2.4, force: true, sp: 0.1 });
        const lp = g.nearWalkable(pp.x - Math.cos(ang) * 2.2 + Math.sin(ang) * 1.6, pp.y - Math.sin(ang) * 2.2 - Math.cos(ang) * 1.6, 0.8);
        g.marker('lantern', lp.x, lp.y, { label: 'crack-lantern', pointsAt: id });
        g.marker('gem_cache', R.crack.x, R.crack.y, { label: 'secret gem cache' });
        secretTriggers.push(T.enter('crack_hum', 'The wall hums', pp.x - Math.cos(ang) * 2, pp.y - Math.sin(ang) * 2, 3.2, [T.dialogue('Pip', ['The wall hums, Aerin. Something is hidden behind it.'])]));
        secretTriggers.push(T.enter('crack_open', 'Cracked wall gives way', pp.x - Math.cos(ang) * 0.6, pp.y - Math.sin(ang) * 0.6, 1.5, [T.openGate(id), T.shake(3), T.sound('portal')], ['crack_hum']));
        secretTriggers.push(T.enter('crack_loot', 'Hidden gem cache', R.crack.x, R.crack.y, 2, [T.message('A hidden gem cache!'), T.loot('uncommon', 1, R.crack.x, R.crack.y, { gem: true })]));
      }
      if (sec.env) {       // environmental: path visible on the minimap only -> Socket Rune
        g.marker('rune_cache', R.env.x, R.env.y, { label: 'secret socket rune' });
        secretTriggers.push(T.enter('env_loot', 'Hidden socket rune', R.env.x, R.env.y, 2, [T.message('A Socket Rune glints in the moss.'), T.loot('rare', 1, R.env.x, R.env.y, { item: 'socket_rune' })]));
      }
      if (sec.logic) {     // logic: lever lowers the bridge seen earlier -> gold chest with guaranteed Rare+
        const b = g.bridges[0], isl = R[sec.logic.islet], lv = R[sec.logic.leverRoom];
        const e0 = b.axis === 'x' ? [[b.x + 0.4, b.y + b.w / 2], [b.x + b.len - 0.4, b.y + b.w / 2]] : [[b.x + b.w / 2, b.y + 0.4], [b.x + b.w / 2, b.y + b.len - 0.4]];
        e0.sort((p, q) => Math.hypot(q[0] - isl.x, q[1] - isl.y) - Math.hypot(p[0] - isl.x, p[1] - isl.y));
        const ge = e0[0];   // far end from the islet = the approach side
        g.addObj('gate', ge[0], ge[1], { id: 'bridge_gate', ang: b.axis === 'x' ? 0 : 1.57, len: b.w, force: true, sp: 0.1 });
        g.marker('lever', lv.x + 0.6, lv.y + 1.2, { label: 'bridge-lever', id: 'lever_bridge' });
        g.marker('chest_gold', isl.x, isl.y, { label: 'secret-gold-chest' });
        secretTriggers.push(T.enter('bridge_pip', 'The raised bridge', ge[0], ge[1], 3.2, [T.dialogue('Pip', ['The bridge is raised. There must be a lever somewhere.'])]));
        secretTriggers.push(T.enter('bridge_lever', 'Pull the lever', lv.x + 0.6, lv.y + 1.2, 1.6, [T.message('A lever clunks. Far away, a bridge lowers.'), T.openGate('bridge_gate'), T.sound('portal')]));
        secretTriggers.push(T.enter('bridge_loot', 'Gold chest on the islet', isl.x, isl.y, 2.2, [T.message('A gold chest!'), T.loot('rare', 1, isl.x, isl.y, { chest: 'gold' })]));
      }

      // -- triggers: encounter grammar (11.2)
      const e = (name) => name, rooms = ['r1', 'r2', 'r3'];
      tr.push(T.mapEnter('intro', 'Pip speaks', [T.dialogue('Pip', X.intro)]));
      tr.push(T.enter('shrine', 'Rift shrine', shr.x, shr.y, 2.2, [T.checkpoint('Checkpoint: ' + (X.startName || 'Glade')), T.heal(100)]));
      if (R.tablet) tr.push(T.enter('tablet', 'Lore tablet', R.tablet.x, R.tablet.y, 2.2, [T.message('Tablet: ' + X.tablet)]));
      let prev = null;
      rooms.forEach((k, i) => {
        const rm = R[k], cfg = E[k];
        tr.push(T.enter(k, cfg.name, rm.x, rm.y, rm.r - 1.5, waveActions(T, rm, cfg.waves, cfg.gap, cfg.banner), prev ? [prev] : undefined));
        const doneActs = [T.message(cfg.clear.text), T.heal(cfg.clear.heal || 25), T.loot(cfg.clear.rarity || 'uncommon', 1, rm.x, rm.y), T.objective(cfg.clear.objective)];
        if (k === 'r3') doneActs.unshift(T.banner('The rift opens', X.riftSub || ''), T.openPortal(g.portalIdx.down), T.sound('portal'));
        tr.push(T.allDead(k + '_done', cfg.name + ' cleared', [k], doneActs));
        prev = k + '_done';
      });
      if (R.elite) {
        const el = R.elite;
        tr.push(T.enter('elite', 'Elite guarding the key', el.x, el.y, el.r + 0.2, [T.banner(E.elite.title, E.elite.sub, true), T.spawn(E.elite.enemy, 1, el.x - 1, el.y, 1.2, { elite: true })], ['r1_done']));
        tr.push(T.allDead('elite_done', 'Elite defeated', ['elite'], [T.message(X.eliteDone), T.loot('rare', 1, el.x, el.y, { item: S.key }), T.dialogue('Pip', [X.keyLine])]));
      }
      for (const t of secretTriggers) tr.push(t);
    },
  };
}

// ============================================================================= dungeon
function dungeon(S) {
  S = Object.assign({ w: { main: 2.4, branch: 1.8 }, density: 1.1, text: {}, every: 6 }, S);
  registerPortals(S);
  return {
    id: S.id, patch: S.patch,
    opts: Object.assign({ W: 32, H: 32, name: S.name, sub: S.sub, theme: S.theme || 'forest', objective: S.objective, seed: S.seed, pad: S.pad || 3, amp: S.amp != null ? S.amp : 1.8 }, S.opts),
    layout(g, T) {
      for (const [k, d] of Object.entries(S.rooms)) g.room(k, Object.assign({ kind: 'chamber', clear: true, label: k.toUpperCase() }, d));
      for (const f of S.flats || []) g.room('flat_' + f.x, Object.assign({ kind: 'flat' }, f));
      g.path('main', { kind: 'main', w: S.w.main, meander: S.meander || 3, every: S.every, type: S.pathType || 'p', pts: S.main });
      for (const [k, b] of Object.entries(S.branches || {})) g.path(k, Object.assign({ kind: 'branch', w: S.w.branch, meander: 1.4, every: 5, type: S.pathType || 'p' }, b));
    },
    populate(g, T) {
      const R = g.roomBy, X = S.text, E = S.enemies, tr = g.triggers, A = R.arena;
      g.setStart(R.start.x + (S.startOff ? S.startOff[0] : 0.8), R.start.y + (S.startOff ? S.startOff[1] : -0.8));
      placePortals(g, S);
      // gates / door: positions come from the paths so they always sit in a corridor
      const door = nearRoomEdge(g, 'main', 'start', 1, 1.0), doorAng = door.ang;
      g.addObj('keydoor', door.x, door.y, { id: 'door_key', key: S.key, ang: Math.round(doorAng * 100) / 100, len: S.w.main, force: true, sp: 0.1 });
      const gp = nearRoomEdge(g, 'main', 'arena', -1, 1.2), gAng = gp.ang;
      g.addObj('gate', gp.x, gp.y, { id: 'gate_r2', ang: Math.round(gAng * 100) / 100, len: S.w.main, force: true, sp: 0.1 });
      const sp = g.pathPoint('shortcut', 0.92), spA = g.pathAngle('shortcut', 0.92);
      g.addObj('gate', sp.x, sp.y, { id: 'gate_short', ang: Math.round(spA * 100) / 100, len: S.w.branch, force: true, sp: 0.1 });
      // interactables
      const shr = { x: R.shrine.x, y: R.shrine.y };
      g.marker('shrine', shr.x, shr.y, { label: 'midpoint checkpoint' });
      g.marker('lever', R.lever.x, R.lever.y, { label: 'gate-lever', id: 'lever_r2' });
      g.marker('lever', A.x + A.r * 0.55, A.y + A.r * 0.55, { label: 'shortcut-lever', id: 'lever_short' });
      g.marker('chest_gold', A.x, A.y - 1, { label: 'mini-boss-chest', guaranteed: 'epic' });
      g.marker('rune_cache', R.crack.x, R.crack.y, { label: 'secret socket rune' });
      const wp = g.pathPoint('crack', 0.6), wa = g.pathAngle('crack', 0.6);
      g.addObj('hidden', wp.x, wp.y, { id: 'wall_crack', ang: Math.round(wa * 100) / 100, len: 2.2, force: true, sp: 0.1 });
      const lp = g.nearWalkable(wp.x - Math.cos(wa) * 2.2 + Math.sin(wa) * 1.5, wp.y - Math.sin(wa) * 2.2 - Math.cos(wa) * 1.5, 0.8);
      g.marker('lantern', lp.x, lp.y, { label: 'crack-lantern', pointsAt: 'wall_crack' });
      g.marker('tablet', R.r1.x + 1.5, R.r1.y - R.r1.r * 0.7, { label: 'lore', text: X.tablet });
      for (const k of ['r1', 'r2', 'arena']) g.ring(k, 'crystal', k === 'arena' ? 4 : 3, 0.95);
      g.scatter(S.palette(S.density));
      // triggers
      tr.push(T.mapEnter('intro', 'Pip in the dark', [T.dialogue('Pip', X.intro)]));
      tr.push(T.enter('door_locked', 'Locked root door', door.x, door.y, 2.4, [T.message(X.locked)]));
      tr.push(T.enter('shrine', 'Midpoint shrine', shr.x, shr.y, 2.2, [T.checkpoint('Checkpoint: ' + X.shrineName), T.heal(100)]));
      const r1 = R.r1, r2 = R.r2;
      tr.push(T.enter('r1', E.r1.name, r1.x, r1.y, r1.r - 1.5, waveActions(T, r1, E.r1.waves, E.r1.gap, E.r1.banner)));
      tr.push(T.allDead('r1_done', 'First cavern cleared', ['r1'], [T.message(E.r1.clear), T.heal(25), T.loot('uncommon', 1, r1.x, r1.y), T.objective('Rest at the shrine, then press on')]));
      tr.push(T.enter('r2', E.r2.name, r2.x, r2.y, r2.r - 1.5, waveActions(T, r2, E.r2.waves, E.r2.gap, E.r2.banner), ['r1_done']));
      tr.push(T.allDead('r2_done', 'Gallery cleared', ['r2'], [T.message(E.r2.clear), T.heal(25), T.loot('uncommon', 1, r2.x, r2.y), T.objective('Find the lever that raises the gate')]));
      tr.push(T.enter('lever_r2', 'Pull the gate lever', R.lever.x, R.lever.y, 1.6, [T.message('The lever grinds. A gate rumbles open.'), T.openGate('gate_r2'), T.sound('portal'), T.objective('Descend to the Thornmother\'s den')], ['r2_done']));
      tr.push(T.enter('boss', E.arena.name, A.x, A.y, A.r - 1.5, [
        T.banner(E.arena.title, E.arena.sub, true), T.objective('Defeat ' + E.arena.title), T.shake(5), T.wait(1.2),
        T.spawn(E.arena.enemy, 1, A.x, A.y - 1.5, 0.5, { elite: true }), T.wait(15), T.spawn(E.arena.add, 2, A.x - 2, A.y + 2.5, 2), T.wait(15), T.spawn(E.arena.add, 2, A.x + 2, A.y + 2.5, 2),
      ], ['lever_r2']));
      tr.push(T.allDead('boss_done', E.arena.title + ' falls', ['boss'], [
        { type: 'clear_enemies' }, T.banner('The Thornmother falls', 'A way out opens'), T.dialogue(E.arena.title, [X.bossLast]), T.heal(100),
        T.loot('epic', 1, A.x, A.y - 1, { sockets: 2, chest: 'gold' }), T.openGate('gate_short'), T.openPortal(g.portalIdx.exit), T.objective('Take the rift down to Old Bramblehorn'), T.sound('portal'),
      ]));
      tr.push(T.enter('short_lever', 'Shortcut lever', A.x + A.r * 0.55, A.y + A.r * 0.55, 1.6, [T.message('A second lever: the shortcut to the shrine is open.'), T.openGate('gate_short')], ['boss_done']));
      tr.push(T.enter('crack_hum', 'The wall hums', wp.x - Math.cos(wa) * 2, wp.y - Math.sin(wa) * 2, 3.2, [T.dialogue('Pip', ['The wall hums, Aerin. Something is hidden behind it.'])]));
      tr.push(T.enter('crack_open', 'Cracked wall gives way', wp.x - Math.cos(wa) * 0.6, wp.y - Math.sin(wa) * 0.6, 1.5, [T.openGate('wall_crack'), T.shake(3), T.sound('portal')], ['crack_hum']));
      tr.push(T.enter('crack_loot', 'Hidden Socket Rune', R.crack.x, R.crack.y, 2, [T.message('A Socket Rune!'), T.loot('rare', 1, R.crack.x, R.crack.y, { item: 'socket_rune' })]));
    },
  };
}

// ============================================================================= boss
function boss(S) {
  S = Object.assign({ w: { main: 2.4, branch: 1.8 }, density: 0.42, text: {} }, S);
  registerPortals(S);
  return {
    id: S.id,
    opts: Object.assign({ W: 24, H: 24, name: S.name, sub: S.sub, theme: S.theme || 'forest', objective: S.objective, seed: S.seed, pad: S.pad || 2.6, amp: 0.8 }, S.opts),
    layout(g, T) {
      for (const [k, d] of Object.entries(S.rooms)) g.room(k, Object.assign({ kind: 'clearing', clear: true, label: k.toUpperCase() }, d));
      g.path('main', { kind: 'main', w: S.w.main, meander: 2.2, every: 6, pts: S.main });
      for (const [k, b] of Object.entries(S.branches || {})) g.path(k, Object.assign({ kind: 'branch', w: S.w.branch, meander: 1.2, every: 5 }, b));
    },
    populate(g, T) {
      const R = g.roomBy, A = R.arena, St = R.start, X = S.text, tr = g.triggers;
      g.setStart(St.x - 0.8, St.y + 0.8);
      placePortals(g, S);
      g.marker('shrine', St.x + 1.8, St.y - 1.3, { label: 'checkpoint' });
      g.marker('chest_gold', R.nookChest.x, R.nookChest.y, { label: 'boss-ledge-chest' });
      g.ring('arena', 'brazier', 4, 0.62, { rot: 0.8 });
      g.scatter(S.palette(S.density));
      for (const [dx, dy] of S.landmarks || []) g.addObj('pine_giant', A.x + dx, A.y + dy, { force: true, v: 1, sp: 2 });
      const B = S.boss;
      tr.push(T.mapEnter('intro', 'Pip warns', [T.dialogue('Pip', X.intro)]));
      tr.push(T.enter('shrine', 'Rift shrine', St.x + 1.8, St.y - 1.3, 2.2, [T.checkpoint('Checkpoint: ' + S.name), T.heal(100)]));
      tr.push(T.enter('boss', B.title, A.x, A.y, 4.8, [
        T.banner(B.title, B.sub, true), T.objective('Defeat ' + B.title), T.shake(6), T.wait(1.5),
        T.spawn(B.enemy, 1, A.x, A.y - 1.5, 0.5, { elite: true }),
        T.wait(14), T.banner('He calls his kin!', 'Ogres storm the court'), T.spawn('ogre', 2, A.x - 2, A.y + 3, 2), T.wait(14), T.spawn('ogre', 2, A.x + 2, A.y + 3, 2),
      ]));
      tr.push(T.allDead('victory', B.title + ' falls', ['boss'], [
        { type: 'clear_enemies' }, T.banner('Victory', B.victory), T.dialogue(B.title, [X.last]), T.heal(100), T.loot('legendary', 1, A.x, A.y),
        T.quest(B.quest, 'The Shard of Root', 'The Shard of Root is relit.', true), T.openPortal(g.portalIdx.next), T.openPortal(g.portalIdx.home), T.objective(X.after), T.sound('portal'),
      ]));
    },
  };
}

module.exports = { outer, dungeon, boss, ANCHORS, landing, registerPortals, placePortals };
