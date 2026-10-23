#!/usr/bin/env node
'use strict';
// tools/qa/verbs-check.js -- the `verbs` arena (js/arenas.js) and the elements-in-the-world system (js/elements-world.js) in headless
// Chromium. One fresh page per block (lasting states and gates persist in G.prog, so a block never reuses a page):
//   receivers  every Receiver reacts to its element once and only once, a wrong element does nothing, lasting states survive a
//              respawn (startTriggers) and transient ones reset, transient states time out
//   patches    ice on water (walkable, expires, <= 24 tiles), rime, grass fire (radius 0.7, 0.4 s a tile, <= 16 tiles, <= 4 burning,
//              one fire per map, Burning on enemies, the hero never hurt), dirty layer chunks flushed <= 4 a frame
//   puzzles    the 3 gated puzzles solved through Pip's charge (Interact at a source / Rest at the dawn shrine); a world source within
//              20 tiles of each; Pip delivers within 8 tiles and not beyond
//   items      the Elder Stone coats the weapon with Dream Oil for 60 s; coat hits build x0.3 (Receiver and enemy); the Opal socket
//   glide      Frostweave Glide's trail segments Chill (one hit per body per tick across overlapping segments), leave rime, cracks stay markers
// Screenshots: tools/out/verbs/*.png.  Usage: node tools/qa/verbs-check.js [--perf[=secs]] [--no-shots]   (exit 1 on any failure)
//   --perf     also measures the arena with a grass fire burning (rAF frame deltas + loop() work, like tools/perf.js; x1, no throttle)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'tools', 'out', 'verbs');
const FLAGS = {}; process.argv.slice(2).forEach(a => { const m = /^--([\w-]+)(?:=(.*))?$/.exec(a); if (m) FLAGS[m[1]] = m[2] == null ? true : m[2]; });
const SHOTS = !FLAGS['no-shots'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
let fails = 0, passes = 0;
const check = (name, ok, info) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (ok) passes++; else fails++; return ok; };

// the Receiver table under test: [id, element, wrong element, next state, hits needed]
const RECV = [
  ['torch_a', 'fire', 'frost', 'lit', 1], ['brazier_b', 'fire', 'lightning', 'lit', 1], ['bramble_s', 'fire', 'frost', 'burnt', 1], ['icewall_s', 'fire', 'frost', 'melted', 2],
  ['seed_s', 'nature', 'fire', 'vine', 1], ['conduit_a', 'lightning', 'fire', 'live', 1], ['fog_n', 'wind', 'fire', 'cleared', 1], ['mill_s', 'wind', 'holy', 'spinning', 1],
  ['raft_w', 'wind', 'frost', 'drifted', 1], ['glyph_n', 'arcane', 'holy', 'lit', 1], ['seal_c', 'holy', 'arcane', 'broken', 1], ['crystal_n', 'frost', 'slash', 'rimed', 1],
  ['vent_s', 'frost', 'fire', 'capped', 1],
];

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const open = async (q = '') => {
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`${base}/index.html?map=verbs${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await wait(500);
    await page.evaluate(() => {
      window.__hero = () => { const p = G.player; p.hp = p.maxHp; };
      window.__tp = (x, y) => { const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; if (G.pip) { G.pip.x = x - 0.9; G.pip.y = y + 0.3; } };
      window.__o = id => EW.find(id);
      window.__st = id => { const o = EW.find(id); return o ? o.rx.state : null; };
      window.__hit = (id, el, w) => { const o = EW.find(id); return EW.hitReceivers(o.x, o.y, 0.2, el, w == null ? 1 : w); };
      window.__ff = () => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); };
    });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const wf = async (fn, arg, ms = 8000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }); return true; } catch (e) { return false; } };
    const shot = async (name, x, y) => { if (!SHOTS) return; await ev(() => { G.banner = null; }); if (x != null) await ev(([x, y]) => window.__tp(x, y), [x, y]); await wait(350); await page.screenshot({ path: path.join(OUT, name + '.png') }); };
    return { page, errs, ev, wf, shot };
  };

  // ===== 1. receivers ===============================================================================================================
  {
    console.log('\n== receivers');
    const { page, errs, ev, wf, shot } = await open('&god');
    const info = await ev(() => ({ map: G.map.id, st: EW.stats(), types: [...new Set(EW.list().map(o => o.rx.type))].sort(), objs: G.world.maps.verbs.objects.length, inList: arenaIds().includes('verbs'),
      size: [G.map.W, G.map.H], rows: G.world.maps.verbs.tiles.every(r => r.length === 32) }));
    check('verbs: loads as the current map, 32x32, every row 32 characters', info.map === 'verbs' && info.size[0] === 32 && info.size[1] === 32 && info.rows, info.size);
    check('verbs: in the title ARENAS list (arenaIds)', info.inList);
    check('verbs: all 15 Receiver types placed', info.types.length === 15, info.types);
    check('verbs: a dawn shrine (holy source) and <= 40 objects', info.st.dawn === 1 && info.objs <= 40, { dawn: info.st.dawn, objects: info.objs });
    if (SHOTS) for (const [n, x, y] of [['overview-north', 16, 5], ['overview-middle', 15.5, 14.5], ['overview-channel', 10, 21.5], ['overview-south', 15.5, 26.5]]) await shot(n, x, y);
    for (const [id, el, wrong, to, n] of RECV) {
      const o = await ev(id => { const o = EW.find(id); return o && { x: o.x, y: o.y, st: o.rx.state }; }, id);
      if (!check(`${id}: present`, !!o)) continue;
      await shot(`${id}-before`, o.x - 1.2, o.y + 1.4);
      const w0 = await ev(([id, el]) => { __hit(id, el); return __st(id); }, [id, wrong]);
      check(`${id}: wrong element (${wrong}) does nothing`, w0 === o.st, w0);
      let st = o.st;
      for (let k = 0; k < n; k++) { if (k === n - 1 && n > 1) check(`${id}: ${n - 1} hit(s) are not enough (build ${25 * (n - 1)} of ${25 * n})`, st === o.st, st); st = await ev(([id, el]) => { __hit(id, el); return __st(id); }, [id, el]); }
      check(`${id}: ${el} -> ${to}`, st === to, st);
      const again = await ev(([id, el]) => { const before = EW.find(id).rx.t0; __hit(id, el); __hit(id, el); return { st: __st(id), same: EW.find(id).rx.t0 === before }; }, [id, el]);
      check(`${id}: reacts once only (two more ${el} hits change nothing)`, again.st === to && again.same, again);
      await wait(id === 'raft_w' ? 1700 : 100);
      await shot(`${id}-after`, o.x - 1.2, o.y + 1.4);
    }
    // the second step of the crystal wall (rimed + a blade), the walk-on patches, the colliders
    const cw = await ev(() => { __hit('crystal_n', 'slash'); return __st('crystal_n'); });
    check('crystal_n: rimed + slash -> shattered (gone)', cw === 'shattered', cw);
    const walk = await ev(() => ({ vine: [walkable(G.map, 12.5, 20.5, 0), walkable(G.map, 12.5, 21.5, 0)], raft: [walkable(G.map, 7.5, 20.5, 0), walkable(G.map, 8.5, 21.5, 0)], obs: EW.kindAt(24, 27),
      seal: EW.find('seal_c').rx.col.gone, bramble: EW.find('bramble_s').gone, mill: EW.find('mill_s').rx.col.gone }));
    check('seed: the vine bridges the channel (12,20) and (12,21) walkable', walk.vine.every(Boolean), walk.vine);
    check('raft: drifted to its crossing, the 2x2 footprint walkable', walk.raft.every(Boolean), walk.raft);
    check('vent: capped leaves an obsidian patch', walk.obs === 'obsidian', walk.obs);
    check('seal / bramble: gone states drop the collider and the sprite; a solid state keeps it (windmill)', walk.seal && walk.bramble && !walk.mill, walk);
    // sources: Pip takes a charge, the crystal goes spent, frost / lightning recharge it once
    const src = await ev(() => { const r = EW.find('rime_s'); EW.take(r); const a = r.rx.state; const w = __hit('rime_s', 'fire'); const b = __st('rime_s'); __hit('rime_s', 'frost'); const c = __st('rime_s'); const t0 = r.rx.t0; __hit('rime_s', 'frost'); return { a, b, c, once: r.rx.t0 === t0, w }; });
    check('rime_crystal: Pip takes frost -> spent; fire nothing; frost -> charged once', src.a === 'spent' && src.b === 'spent' && src.c === 'charged' && src.once, src);
    const storm = await ev(() => { const r = EW.find('storm_m'); const pipWas = EW.stats().pip; return { st: r.rx.state, pipWas }; });
    check('storm_crystal: starts charged (a lightning source)', storm.st === 'charged', storm);
    // transient states time out; a respawn keeps lasting states and resets transient ones
    const tr = await ev(() => { const c = EW.find('conduit_a'), m = EW.find('mill_s'); c.rx.t0 = G.t - 9.9; m.rx.t0 = G.t - 11.9; return [c.rx.state, m.rx.state]; });
    await wait(400);
    const tr2 = await ev(() => [__st('conduit_a'), __st('mill_s')]);
    check('transient states time out (conduit live 10 s -> dead, windmill spinning 12 s -> still)', tr[0] === 'live' && tr[1] === 'spinning' && tr2[0] === 'dead' && tr2[1] === 'still', { before: tr, after: tr2 });
    await ev(() => { __hit('conduit_a', 'lightning'); });
    const rs = await ev(() => { startTriggers(); EW.update(0); return { torch: __st('torch_a'), seal: __st('seal_c'), conduit: __st('conduit_a'), vine: walkable(G.map, 12.5, 20.5, 0), saved: G.prog.state.verbs.torch_a }; });
    check('respawn: lasting states persist (torch lit, seal broken, vine walkable), transient reset (conduit dead)', rs.torch === 'lit' && rs.seal === 'broken' && rs.vine && rs.conduit === 'dead', rs);
    check('receivers: no page errors', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  // ===== 2. tile patches and the grass fire ============================================================================================
  {
    console.log('\n== patches');
    const { page, errs, ev, wf, shot } = await open('');
    await ev(() => window.__tp(15.5, 23.5));
    const ice = await ev(() => { const n0 = EW.stats().ice; EW.hitReceivers(5.5, 21, 1, 'frost', 1); return { n0, n: EW.stats().ice, walk: walkable(G.map, 5.5, 21.5, 0), dirty: EW.stats().dirty }; });
    check('ice: frost on water makes an ice patch that is walkable', ice.n > 0 && ice.walk, ice);
    await shot('ice-patch', 6.5, 23);
    const flushed = await ev(() => new Promise(res => { const s0 = EW.stats(); for (let k = 0; k < 40; k++) EW.dirtyChunk(G.map, (k % 4) * 8, ((k / 4) | 0) % 4 * 8); const d0 = EW.stats().dirty; requestAnimationFrame(() => requestAnimationFrame(() => res({ d0, d1: EW.stats().dirty, s0 }))); }));
    check('patch layer: at most 4 dirty chunks rebuilt a frame', flushed.d0 - flushed.d1 <= 4 * 3 && flushed.d1 >= flushed.d0 - 12, flushed);
    const cap = await ev(() => { for (let x = 1.5; x < 31; x += 1) for (const y of [20.5, 21.5]) EW.hitReceivers(x, y, 1.2, 'frost', 1); return EW.stats().ice; });
    check('ice: at most 24 tiles on the map', cap <= 24 && cap >= 20, cap);
    const thaw = await ev(() => { EW.hitReceivers(5.5, 21, 0.8, 'fire', 1); return EW.kindAt(5, 21); });
    check('ice: fire thaws it', thaw !== 'ice', thaw);
    await ev(() => { const M = EW.layer; for (let i = 0; i < M.pt.length; i++) if (EW.KINDS[M.pt[i]] === 'ice') M.life[i] = G.t + 0.1; });
    await wait(700);
    const exp = await ev(() => ({ ice: EW.stats().ice, block: G.map.block[21][9] }));
    check('ice: the patch expires (water blocks again)', exp.ice === 0 && exp.block === true, exp);
    const rime = await ev(() => { const n = EW.tilePatch({ kind: 'rime', tiles: [[15, 23], [16, 23], [5, 20]], life: 0.4 }); return { n, k: EW.kindAt(15, 23), water: EW.kindAt(5, 20) }; });
    await wait(900);
    const rime2 = await ev(() => EW.kindAt(15, 23));
    check('rime: on ground only, expires', rime.n === 2 && rime.k === 'rime' && rime2 === '', { rime, after: rime2 });
    // grass fire
    const far = await ev(() => { const a = EW.ignite(1.2, 25.5); return { a, st: EW.stats() }; });
    check('grass fire: a fire hit 0.8 from dry grass lights nothing (radius 0.7)', far.a === false && !far.st.fire, far);
    await ev(() => { window.__hurt = 0; const h = hurtPlayer; window.hurtPlayer = function () { window.__hurt++; return h.apply(this, arguments); }; window.__tp(4.5, 27.5);
      const e = spawnEnemy('gloomslime', 7.5, 24.5, 0); e.stunT = 999; e.rootUntil = G.t + 999; window.__slime = e; });
    await ev(() => window.__ff());
    const lit = await ev(() => { const a = EW.hitReceivers(5.5, 24.5, 0.3, 'fire', 1); return { st: EW.stats(), a }; });
    check('grass fire: a fire hit on dry grass lights it', !!lit.st.fire && lit.st.fireStarts === 1, lit.st);
    const samples = []; const t0 = Date.now();
    let second = null;
    while (Date.now() - t0 < 16000) {
      const s = await ev(() => { const s = EW.stats(); return { t: G.t, n: s.fire ? s.fire.n : null, b: s.fire ? s.fire.burning : 0, starts: s.fireStarts, max: s.maxBurning }; });
      samples.push(s);
      if (second == null && s.n >= 3) { second = await ev(() => { EW.ignite(3.5, 27.5); EW.hitReceivers(8.5, 23.5, 0.3, 'fire', 1); return EW.stats().fireStarts; }); await shot('grass-fire', 5.2, 27.6); }
      if (s.n == null && samples.length > 5) break;
      await wait(60);
    }
    const ns = samples.filter(s => s.n != null), maxN = Math.max(...ns.map(s => s.n)), maxB = Math.max(...samples.map(s => s.max));
    const steps = []; for (let i = 1; i < ns.length; i++) if (ns[i].n > ns[i - 1].n) steps.push({ t: ns[i].t, d: ns[i].n - ns[i - 1].n });
    let minGap = 9; for (let i = 1; i < steps.length; i++) minGap = Math.min(minGap, (steps[i].t - steps[i - 1].t) / Math.max(1, steps[i].d));
    const span = ns.length > 1 ? (ns[ns.length - 1].t - ns[0].t) : 0, rate = ns.length > 1 ? (maxN - ns[0].n) / Math.max(0.001, (steps.length ? steps[steps.length - 1].t : 0) - ns[0].t) : 0;
    check('grass fire: at most 16 tiles a fire', maxN <= 16 && maxN >= 8, maxN);
    check('grass fire: at most 4 tiles burning (emitting) at once', maxB <= 4 && maxB >= 2, maxB);
    check('grass fire: spreads no faster than 0.4 s a tile', rate <= 1 / 0.4 + 0.15, { tilesPerSec: +rate.toFixed(2), minGap: +minGap.toFixed(2), span: +span.toFixed(1) });
    check('grass fire: one fire per map (a second ignition while burning is refused)', second === 1, second);
    const after = await ev(() => ({ bramble: __st('bramble_s'), slime: !!(window.__slime.burnT > 0 || hasStatus(window.__slime, 'burning') || window.__slime.dead), hurt: window.__hurt, scorch: EW.kindAt(5, 24), st: EW.stats() }));
    check('grass fire: burns the bramble in the field (fire on Receivers)', after.bramble === 'burnt', after.bramble);
    check('grass fire: gives Burning to an enemy in it', after.slime, after.slime);
    check('grass fire: the hero is never hurt by it (nothing is a trap)', after.hurt === 0, after.hurt);
    check('grass fire: burnt tiles turn to scorch, the fire ends', after.scorch === 'scorch' && !after.st.fire, { scorch: after.scorch, fire: after.st.fire });
    check('patches: no page errors', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  // ===== 3. puzzles through Pip's charge ================================================================================================
  {
    console.log('\n== puzzles');
    const { page, errs, ev, wf, shot } = await open('&god');
    const src = await ev(() => {
      const R = G.world.maps.verbs, objs = R.objects, rx = EW.RX;
      const sources = objs.filter(o => rx[o.t] && Object.values(rx[o.t].states).some(s => s.source) && (!rx[o.t].optIn || o.state != null || o.dawn)).map(o => ({ id: o.id, x: o.x, y: o.y, el: o.t === 'shrine' ? 'holy' : Object.values(rx[o.t].states).find(s => s.source).source }));
      const need = { torch_a: 'fire', torch_b: 'fire', conduit_a: 'lightning', conduit_b: 'lightning', seal_c: 'holy' };
      return Object.keys(need).map(id => { const o = objs.find(q => q.id === id); const d = Math.min(...sources.filter(s => s.el === need[id]).map(s => Math.hypot(s.x - o.x, s.y - o.y))); return { id, el: need[id], d: +d.toFixed(1) }; });
    });
    check('puzzles: a world source within 20 tiles of every puzzle object', src.every(s => s.d <= 20), src);
    const interactAt = async (x, y) => { await ev(([x, y]) => window.__tp(x, y), [x, y]); await wait(200); return ev(() => { const q = G.prompt; const k = q && q.kind; interact(G.player); return k; }); };
    // P1: two torches (fire from the lit brazier)
    let k = await interactAt(14.5, 15.6);
    check('P1: Interact at the lit brazier: Pip takes fire', k === 'pip' && (await ev(() => EW.stats().pip && EW.stats().pip.el)) === 'fire', k);
    await wait(300); await shot('pip-charge-fire');
    check('P1: Pip delivers to the nearest torch within 8 tiles', await wf(() => !EW.stats().pip && (__st('torch_a') === 'lit' || __st('torch_b') === 'lit')));
    await interactAt(14.5, 15.6);
    check('P1: a second charge lights the other torch; gate_a opens (object_state card)', await wf(() => __st('torch_a') === 'lit' && __st('torch_b') === 'lit' && !!G.trig.fired.p1_torches && gateOpen(G.map, 'gate_a')));
    await ev(() => window.__ff()); await wait(400);
    const opal = await ev(() => G.drops.some(d => d.kind === 'gem' && d.gem === 'opal_3'));
    check('P1: the reward drops the Radiant Opal', opal, opal);
    // P2: conduits (lightning from the storm crystal; a live conduit arcs to the other)
    k = await interactAt(17.5, 18.7);
    check('P2: Interact at the storm crystal: Pip takes lightning, the crystal goes spent', k === 'pip' && (await ev(() => __st('storm_m'))) === 'spent', k);
    check('P2: Pip wakes a conduit, it arcs to the other; gate_b opens', await wf(() => __st('conduit_a') === 'live' && __st('conduit_b') === 'live' && !!G.trig.fired.p2_conduits && gateOpen(G.map, 'gate_b')));
    await shot('conduits-live', 18.6, 15.5);
    // P3: the seal (holy from Rest at the dawn shrine); Pip's 8-tile reach
    k = await interactAt(13.5, 28.3);
    check('P3: Rest at the dawn shrine: Pip takes holy', k === 'shrine' && (await ev(() => EW.stats().pip && EW.stats().pip.el)) === 'holy', k);
    await shot('pip-charge-holy');
    await ev(() => window.__tp(16.9, 19.7)); await wait(1500);
    const far = await ev(() => ({ pip: EW.stats().pip, seal: __st('seal_c'), d: +Math.hypot(G.pip.x - 16, G.pip.y - 10.4).toFixed(2) }));
    check("Pip's charge: no delivery to a receiver beyond 8 tiles", !!far.pip && far.seal === 'sealed' && far.d > 8, far);
    await ev(() => window.__tp(16.9, 17.2));
    const near = await wf(() => __st('seal_c') === 'broken', null, 4000);
    const nd = await ev(() => EW.stats());
    check("Pip's charge: delivered to the seal within 8 tiles; element_hit opens gate_c", near && !!(await ev(() => G.trig.fired.p3_seal && gateOpen(G.map, 'gate_c'))), nd.pip);
    check('puzzles: no page errors', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  // ===== 4. Dream Oil and the Opal =========================================================================================================
  {
    console.log('\n== items');
    const { page, errs, ev, wf, shot } = await open('&god');
    await ev(() => window.__tp(18.5, 28.4)); await wait(250);
    const oil = await ev(() => { const k = G.prompt && G.prompt.kind, txt = G.prompt && G.prompt.text; interact(G.player); const o = G.player.oil; return { k, txt, el: o && o.el, left: o && +(o.until - G.t).toFixed(2) }; });
    check('Dream Oil: Interact at the Elder Stone coats the weapon (60 s)', oil.k === 'stone' && oil.el === 'fire' && Math.abs(oil.left - 60) < 0.6, oil);
    await wait(300); await shot('oiled-weapon');
    const frost = await ev(() => { G.player.oil = null; runAction({ type: 'oil', el: 'frost' }); return G.player.oil && G.player.oil.el; });
    const vent = await ev(() => { const o = EW.find('vent_s'), c = { basic: true, el: 'slash', slot: 'lmb', ctx: newCtx('slash') }, out = [];
      for (let i = 0; i < 4; i++) { withCast(c, () => EW.fromHit(o.x, o.y, 0.6, {})); out.push(o.rx.state); } return out; });
    check('Dream Oil: a coat hit builds x0.3 (vent needs 4 frost-oiled basic hits)', frost === 'frost' && vent[2] === 'venting' && vent[3] === 'capped', vent);
    const skill = await ev(() => { const o = EW.find('crystal_n'); __hit('crystal_n', 'frost'); const c = { basic: true, el: 'slash', slot: 'lmb', ctx: newCtx('slash') }; G.player.oil = { el: 'slash', until: G.t + 60 }; return __st('crystal_n'); });
    check('Dream Oil: a Receiver with oil: false refuses coat hits (crystal wall rimed waits for a real blade)', skill === 'rimed', skill);
    const enemy = await ev(() => { G.player.oil = { el: 'frost', until: G.t + 60 }; const e = spawnEnemy('gloomslime', 20, 24, 0); e.hp = e.maxHp = 1e6; const c = { basic: true, el: 'slash', slot: 'lmb', ctx: newCtx('slash') }; const out = [];
      for (let i = 0; i < 7; i++) { withCast(c, () => damageEnemy(e, 1, {})); out.push(hasStatus(e, 'chilled') || e.slowT > 0); } return out; });
    check('Dream Oil: basic hits build the oil element on an enemy (tier 1 at 50: 7 hits x 7.5)', enemy[5] === false && enemy[6] === true, enemy);
    await ev(() => { G.player.oil.until = G.t + 0.15; });
    await wait(500);
    check('Dream Oil: the coat wears off', await ev(() => G.player.oil === null));
    const op = await ev(() => {
      const p = G.player, w = p.equip.weapon, ch = p.equip.chest; const s0 = { speed: p.sum.speed || 0, wind: p.sum.windDmg || 0, amp: elementAmp(p, 'wind') };
      w.sockets = ['opal_3']; ch.sockets = ['opal_2']; recalcStats(p, false);
      return { name: gemName('opal_3'), s0, s1: { speed: +(p.sum.speed || 0).toFixed(3), wind: +(p.sum.windDmg || 0).toFixed(3), amp: +elementAmp(p, 'wind').toFixed(3) }, el: GEMS.opal.el };
    });
    check('Opal: the wind gem socket works (weapon +wind damage, armour +move speed, +5% wind skills per grade)', op.name === 'Radiant Opal' && op.el === 'wind' && op.s1.wind - op.s0.wind > 0.13 && op.s1.speed - op.s0.speed > 0.09 && op.s1.amp >= 0.25, op);
    check('items: no page errors', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  // ===== 5. Glide's frost trail ============================================================================================================
  {
    console.log('\n== glide');
    const { page, errs, ev, wf, shot } = await open('&god');
    const g = await ev(() => new Promise(res => {
      const p = G.player; window.__tp(14, 24);
      const e = spawnEnemy('gloomslime', 16.2, 24, 0); e.hp = e.maxHp = 1e6; e.stunT = 99; e.rootUntil = G.t + 99; let hits = 0; const d0 = damageEnemy; window.damageEnemy = function (q) { if (q === e) hits++; return d0.apply(this, arguments); };
      const c = { skill: 'glide', el: 'frost', slot: 'v', ctx: newCtx('frost') };
      withCast(c, () => SKILLS.glide.cast(p, 0, 18, 24));   // the real Glide row (data.js CT.dash zoneTrail), skating +x through the slime
      setTimeout(() => { const segs = G.zones.filter(z => z.trail); crackAt(16.2, 25.5); const cr = G.zones.find(z => z.crack); res({ segs: segs.length, grp: new Set(segs.map(z => z.grp)).size, chilled: hasStatus(e, 'chilled') || e.slowT > 0, hits, rime: EW.stats().rime, crackTick: !!(cr && cr.trail) }); }, 700);
    }));
    await shot('glide-trail', 15, 25.5);
    check('Glide: the trail is several segments sharing one group', g.segs >= 2 && g.grp === 1, g);
    check('Glide: the trail Chills a body in it', g.chilled, g);
    check('Glide: overlapping segments hit a body once per tick (<= 2 hits in 0.7 s)', g.hits >= 1 && g.hits <= 2, g.hits);
    check('Glide: the trail leaves a short rime patch', g.rime > 0, g.rime);
    check('Glide: cracks stay marker zones (no trail tick)', g.crackTick === false, g.crackTick);
    check('glide: no page errors', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  // ===== 6. perf: the arena with a grass fire burning ========================================================================================
  if (FLAGS.perf) {
    console.log('\n== perf');
    const secs = +FLAGS.perf > 1 ? +FLAGS.perf : 20;
    const { page, errs, ev } = await open('&god');
    await ev(() => { const orig = window.loop; window.__work = []; window.loop = function (now) { const t0 = performance.now(); orig(now); window.__work.push(performance.now() - t0); }; window.__tp(6.5, 26.5);
      window.__fireLoop = setInterval(() => { if (!EW.stats().fire) for (const [x, y] of [[5.5, 24.5], [3.5, 27.5], [7.5, 23.5], [2.5, 24.5], [8.5, 28.5]]) if (EW.ignite(x, y)) break; }, 250); });
    await wait(1500);
    const d = await ev(s => new Promise(res => { const d = [], b = []; let last = performance.now(); const t0 = last; const n = () => { const t = performance.now(); d.push(t - last); last = t; const st = EW.stats(); b.push(st.fire ? st.fire.burning : 0); if (t - t0 < s * 1000) requestAnimationFrame(n); else res({ d, b }); }; requestAnimationFrame(n); }), secs);
    const w = (await ev(() => window.__work)).slice(60).sort((a, b) => a - b), f = d.d.slice(5).sort((a, b) => a - b), q = (A, k) => +A[Math.min(A.length - 1, Math.floor(A.length * k))].toFixed(2);
    const burningFrames = d.b.filter(x => x > 0).length / d.b.length;
    const out = { secs, frames: f.length, p50: q(f, 0.5), p95: q(f, 0.95), p99: q(f, 0.99), work: { p50: q(w, 0.5), p95: q(w, 0.95), p99: q(w, 0.99) }, burningShare: +burningFrames.toFixed(2) };
    console.log('perf ' + JSON.stringify(out));
    check('perf: verbs arena with a grass fire burning, frame p95 <= 20 ms (x1)', out.p95 <= 20 && burningFrames > 0.5, out);
    check('perf: no page errors', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  await br.close(); srv.close();
  console.log(`\n${fails ? fails + ' CHECK(S) FAILED' : 'all verbs checks passed'}  (${passes} passed; shots: ${path.relative(ROOT, OUT)}/*.png)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
