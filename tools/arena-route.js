#!/usr/bin/env node
'use strict';
// tools/arena-route.js -- walks every mockup arena (js/arenas.js, docs: Godot pivot "arenas only") in headless Chromium, one FRESH page per arena
// (barrier state persists to G.prog.gates, so a page is never reused). For each arena it enters via ?map=<id>, fires every trigger the way a player
// does (teleport onto the enter_area, pull the lever, use the keydoor with the key), clears each pack, kills each boss, and asserts that the page
// throws no errors. Bosses also assert bossFairness(id) is empty (legacy-flagged rows are listed, not failed).
//   pack-*   : lever opens gate_a; 3 packs behind gates (gate_b / gate_c open on clear); the elite pack drops the key; keydoor opens only with the key; chests, shrine
//   elite    : per pocket the gate closes on entry, the elite carries the pocket's modifier, the gate re-opens on its death
//   boss-*   : intro timer spawns the boss (G.boss), fairness is clean, it dies, the `dead` trigger heals + loots   (incl. stub arenas for every other boss)
//   dummies  : racks swap the weapon line, plates swap the tier, 9 immortal dummies
//   touch    : chests, tablet, shrine, lever -> gate, warp door, Pip's dialogue, dummies
//   stress   : 24 awake bodies, 40+ light props, statuses land on bodies
// Screenshots: tools/shots/arenas/<id>.png.   Usage: node tools/arena-route.js [id ...]     (exit 1 on any failed check or page error)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), SHOTS = path.join(__dirname, 'shots', 'arenas');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
let fails = 0; const table = [];
const check = (name, ok, info) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (!ok) fails++; return ok; };

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  // the id list comes from the game itself (ARENAS + one stub per boss without an arena)
  const idPage = await br.newPage(); await idPage.goto(`${base}/index.html?map=dummies`, { waitUntil: 'load' });
  await idPage.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  let ids = await idPage.evaluate(() => arenaIds()); await idPage.close();
  const only = process.argv.slice(2).filter(a => !a.startsWith('-')); if (only.length) ids = ids.filter(i => only.includes(i));

  for (const id of ids) {
    const t0 = Date.now(), f0 = fails;
    console.log(`\n== ${id}`);
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`${base}/index.html?map=${id}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await wait(400);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const wf = async (fn, arg, ms = 10000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };
    const shot = async name => { await wait(450); await page.screenshot({ path: path.join(SHOTS, `${name || id}.png`) }); };
    // ---- instrumentation (same shape as act1-route): action log, hero helpers
    await ev(() => {
      window.__log = { actions: [], talks: [] };
      const ra = runAction; window.runAction = a => { window.__log.actions.push(a); return ra(a); };
      const tk = talk; window.talk = a => { window.__log.talks.push(a.id || (a.lines || [])[0] || ''); return tk(a); };
      window.__hero = () => { const p = G.player; p.invulnT = 9999; p.hp = p.maxHp; };
      window.__tp = (x, y) => { const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; window.__hero(); };
      window.__killAll = () => { let n = 0; for (const e of G.enemies.slice()) if (!e.dummy && !e.dead) { killEnemy(e); n++; } return n; };
      window.__live = () => G.enemies.filter(e => !e.dummy && !e.dead);
      window.__hero();
    });
    const rec = await ev(() => ({ id: G.map.id, state: G.state, tr: G.map.triggers.map(t => t.id), rec: G.world.maps[G.map.id], z: tileH(G.map, G.player.x, G.player.y), loadout: G.world.maps[G.map.id].loadout || null }));
    check(`${id}: loads as the current map, playing, start tile has a height`, rec.id === id && rec.state === 'play' && Number.isFinite(rec.z), { state: rec.state, z: rec.z });
    check(`${id}: record is within 32x32`, rec.rec.W <= 32 && rec.rec.H <= 32, [rec.rec.W, rec.rec.H]);
    const kit = await ev(() => { const p = G.player, e = p.equip; return { w: e.weapon && e.weapon.base, fam: e.weapon && familyOf(e.weapon.base), lvl: p.level }; });
    check(`${id}: reference loadout applied (weapon line ${rec.loadout && rec.loadout.weapon})`, !!kit.w && kit.fam === rec.loadout.weapon, kit);

    const tpTrig = tid => ev(tid => { const t = G.map.triggers.find(q => q.id === tid); if (!t || t.when.type !== 'enter_area') return false; window.__tp(t.when.x, t.when.y); return true; }, tid);
    const fired = tid => ev(tid => !!G.trig.fired[tid], tid);
    const fireAt = async tid => { if (!await tpTrig(tid)) return false; return wf(tid => !!G.trig.fired[tid], tid, 8000); };
    const live = () => ev(() => window.__live().map(e => ({ t: e.type, elite: !!e.elite, mods: e.mods || [], boss: !!e.boss })));
    // kill what spawned; fast-forward the spawn delays; waits for `doneId` (an all_enemies_dead card) when given
    const fight = async (doneId, rounds = 6) => {
      const seen = [];
      for (let i = 0; i < rounds; i++) {
        await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); });
        await wait(450);
        (await live()).forEach(e => seen.push(e));
        await ev(() => window.__killAll()); await wait(250);
        if (doneId ? await fired(doneId) : !(await live()).length) break;
      }
      return seen;
    };
    const gate = gid => ev(gid => { const o = G.map.objects.find(q => q.barrier && q.gid === gid); return o ? !!o.gone || gateOpen(G.map, gid) : gateOpen(G.map, gid); }, gid);
    const obj = (pred, fn) => ev(([pred, fn]) => { const o = G.map.objects.find(new Function('o', 'return ' + pred)); if (!o) return null; return new Function('o', fn)(o); }, [pred, fn]);
    const useObj = (pred) => obj(pred, 'window.__tp(o.x, o.y + 0.9); o.use.fn(o); return { text: o.use.text ? o.use.text(o) : "", pulled: !!o.pulled };');
    const openChests = async () => ev(() => { const r = []; for (const o of G.map.objects.filter(q => q.chest)) { window.__tp(o.x, o.y + 0.9); openChest(o); r.push({ label: o.src.label, opened: !!o.opened }); } return r; });
    const spawnTotal = tid => ev(tid => G.map.triggers.find(t => t.id === tid).actions.filter(a => a.type === 'spawn').reduce((s, a) => s + (a.count || 1), 0), tid);

    if (/^pack-/.test(id)) {
      const zone = id.slice(5);
      check(`${id}: all four barriers start shut (gate_a, gate_b, gate_c, door_key)`, !(await gate('gate_a')) && !(await gate('gate_b')) && !(await gate('gate_c')) && !(await gate('door_key')));
      const lv = await useObj("o.lever && o.src.id === 'lever_a'");
      check(`${id}: the lever opens gate_a`, !!lv && lv.pulled && await gate('gate_a'), lv);
      for (const [n, go, clear, opens] of [[1, 'p1_go', 'p1_clear', 'gate_b'], [2, 'p2_go', 'p2_clear', 'gate_c'], [3, 'p3_go', 'p3_clear', null]]) {
        const want = await spawnTotal(go);
        const okGo = await fireAt(go);
        await wait(300); await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); }); await wait(500);
        const now = await live();
        check(`${id}: pack ${n} wakes (${want} bodies${n === 3 ? ', one elite' : ''})`, okGo && now.length >= want && (n !== 3 || now.some(e => e.elite)), { fired: okGo, live: now.length, types: [...new Set(now.map(e => e.t))], elite: now.filter(e => e.elite).map(e => e.mods.join('+')) });
        if (n === 3) {
          const dr0 = await useObj("o.barrier === 'keydoor' && o.use");
          check(`${id}: the keydoor stays shut without the key`, !(await gate('door_key')), dr0);
          await shot(id);
        }
        await fight(clear);
        check(`${id}: pack ${n} cleared -> ${clear} fires${opens ? ', ' + opens + ' opens' : ', the key drops'}`, await fired(clear) && (!opens || await gate(opens)));
      }
      check(`${id}: the elite's key is in the pocket (key_pack_${zone})`, await ev(k => hasKey(k), 'key_pack_' + zone));
      const dr = await useObj("o.barrier === 'keydoor' && o.use");
      check(`${id}: the keydoor opens with the key`, await gate('door_key'), dr);
      check(`${id}: chamber trigger fires behind the door`, await fireAt('done'));
      const ch = await openChests();
      check(`${id}: both chests open`, ch.length === 2 && ch.every(c => c.opened), ch);
      const sh = await obj('o.shrineId', 'window.__tp(o.x, o.y + 0.9); return !!o.shrineId;');
      check(`${id}: the checkpoint shrine stands`, sh === true);
    } else if (id === 'elite') {
      const pockets = await ev(() => G.map.triggers.filter(t => /^go_p/.test(t.id)).map(t => ({ id: t.id, n: t.id.slice(3), mod: (t.actions.find(a => a.type === 'spawn') || {}).elite, enemy: (t.actions.find(a => a.type === 'spawn') || {}).enemy })));
      check('elite: 8 pockets, each with its own modifier', pockets.length === 8 && new Set(pockets.map(p => JSON.stringify(p.mod))).size === 8, pockets.map(p => p.mod));
      for (const p of pockets) {
        const g = 'gate_' + p.n, open0 = await gate(g);
        const okGo = await fireAt(p.id); await wait(300); await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); }); await wait(500);
        const now = await live(), el = now.find(e => e.elite);
        const wantMod = [].concat(p.mod);
        check(`elite: pocket ${p.n} (${wantMod.join('+')} ${p.enemy}): gate closes, one elite with the mod wakes`, open0 && okGo && !(await gate(g)) && !!el && wantMod.every(m => el.mods.includes(m)), { openAtStart: open0, closedNow: !(await gate(g)), elite: el });
        if (p.n === '0') await shot(id);
        await fight('done_' + p.n);
        check(`elite: pocket ${p.n} cleared -> done_${p.n} fires, gate re-opens`, await fired('done_' + p.n) && await gate(g));
      }
    } else if (/^boss-/.test(id)) {
      const bid = id.slice(5);
      const sp = await ev(() => G.map.triggers.find(t => t.id === 'intro').actions.find(a => a.type === 'spawn').enemy);
      check(`${id}: intro trigger spawns ${bid}`, sp === bid, sp);
      const okIntro = await wf(() => !!G.trig.fired.intro, null, 9000);
      await wait(1800);
      const b = await ev(() => ({ boss: G.boss && G.boss.type, dead: G.boss && G.boss.dead, hp: G.boss && G.boss.maxHp, moves: G.boss && G.boss.def && G.boss.def.moves ? Object.keys(G.boss.def.moves).length : null }));
      check(`${id}: the intro fires and G.boss is ${bid}`, okIntro && b.boss === bid && !b.dead, b);
      const fair = await ev(bid => bossFairness(bid), bid), hard = fair.filter(v => !v.legacy), leg = fair.filter(v => v.legacy);
      check(`${id}: bossFairness(${bid}) is empty${leg.length ? ' (' + leg.length + ' legacy-flagged row(s) ignored)' : ''}`, hard.length === 0, hard.slice(0, 6));
      await shot(id);
      await ev(() => { const b = G.boss; if (b && !b.dead) { b.hp = 1; killEnemy(b); } });
      await fight('dead', 4);
      check(`${id}: the boss dies and the \`dead\` trigger fires (heal + loot)`, await fired('dead') && await ev(() => !!G.boss && G.boss.dead), await ev(() => window.__log.actions.filter(a => a.type === 'loot' || a.type === 'heal').map(a => a.type)));
    } else if (id === 'dummies') {
      const dm = await ev(() => G.enemies.filter(e => e.dummy).length);
      check('dummies: 9 dummies, immortal', dm === 9 && await ev(() => G.enemies.filter(e => e.dummy).every(e => e.def.ai === 'dummy')), dm);
      const fams = {};
      for (const w of ['sword', 'staff', 'bow', 'daggers']) {
        await fireAt('rack_' + w); await wait(300);
        fams[w] = await ev(() => { const e = G.player.equip; return { fam: familyOf(e.weapon.base), base: e.weapon.base, head: e.head && e.head.base }; });
      }
      check('dummies: each rack kits its weapon line', ['sword', 'staff', 'bow', 'daggers'].every(w => fams[w].fam === w), fams);
      const tiers = [];
      for (let i = 1; i <= 5; i++) {
        await fireAt('tier_' + i); await wait(300);
        tiers.push(await ev(() => ({ req: G.player.equip.weapon.req, lvl: G.player.level })));
      }
      check('dummies: tier plates raise the weapon requirement T1 < T2 < ... < T5', tiers.every((t, i) => i === 0 || t.req > tiers[i - 1].req), tiers);
      const ch = await openChests(); check('dummies: the chest opens', ch.length >= 1 && ch.every(c => c.opened), ch);
      await ev(() => window.__tp(12, 8)); await shot(id);
    } else if (id === 'touch') {
      check('touch: Pip speaks on the approach', await fireAt('talk') && await wf(() => window.__log.talks.length > 0, null, 5000), await ev(() => window.__log.talks));
      const ch = await openChests(); check('touch: both chests open', ch.length === 2 && ch.every(c => c.opened), ch);
      const tb = await obj('o.tablet', 'return { text: !!(o.src && o.src.text) };'); check('touch: the tablet stands with its text', !!tb && tb.text, tb);
      const sh = await obj('o.shrineId', 'window.__tp(o.x, o.y + 0.9); return !!o.shrineId;'); check('touch: the checkpoint shrine stands', sh === true);
      const g0 = await gate('gate_touch'); const lv = await useObj("o.lever && o.src.id === 'lever_touch'");
      check('touch: lever opens its gate', !g0 && !!lv && lv.pulled && await gate('gate_touch'), lv);
      const wp = await ev(() => { const o = G.map.objects.find(q => q.warpdoor); if (!o) return null; window.__tp(o.x, o.y + 0.9); o.use.fn(o); return !!G.warp; });
      await wf(() => !G.warp, null, 5000); await wait(400);
      const at = await ev(() => ({ x: G.player.x, y: G.player.y }));
      check('touch: the warp door carries the hero to (20.5, 5.8)', wp === true && Math.hypot(at.x - 20.5, at.y - 5.8) < 1.6, at);
      await shot(id);
    } else if (id === 'stress') {
      await wait(3500); await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); }); await wait(1500);
      const s = await ev(() => ({ awake: G.enemies.filter(e => !e.dummy && !e.dead && !e.asleep).length, all: G.enemies.filter(e => !e.dead).length, lights: G.map.objects.filter(o => o.src && /lantern|crystal|brazier|mushroom/.test(o.src.t)).length, statused: G.enemies.filter(e => !e.dead && e.status && Object.keys(e.status).length).length }));
      check('stress: 24 awake bodies', s.awake >= 24, s);
      check('stress: 40+ light props', s.lights >= 40, s.lights);
      check('stress: status effects land on bodies', s.statused >= 1, s.statused);
      await shot(id);
    } else {
      check(`${id}: no custom walk for this arena`, false);
    }
    // every trigger card ran, except repeatable ones that only fire on demand
    const unfired = await ev(() => G.map.triggers.filter(t => !G.trig.fired[t.id] && !(t.once === false) && !/^done_p|^dead$/.test(t.id)).map(t => t.id));
    if (unfired.length) { for (const tid of unfired) await fireAt(tid); await wait(300); }
    const left = await ev(() => G.map.triggers.filter(t => !G.trig.fired[t.id] && t.once !== false).map(t => t.id));
    check(`${id}: every trigger card fired at least once`, left.length === 0, left);
    check(`${id}: no page errors`, errs.length === 0, errs.slice(0, 3));
    if (!fs.existsSync(path.join(SHOTS, id + '.png'))) await shot(id);
    table.push({ id, size: `${rec.rec.W}x${rec.rec.H}`, level: kit.lvl, result: fails === f0 ? 'PASS' : 'FAIL', s: ((Date.now() - t0) / 1000).toFixed(1) });
    await page.close();
  }
  await br.close(); srv.close();
  console.log('\narena        size   lvl  result  time');
  for (const r of table) console.log(`${r.id.padEnd(16)}${r.size.padEnd(7)}${String(r.level).padEnd(5)}${r.result.padEnd(8)}${r.s}s`);
  console.log(`\n${fails ? fails + ' CHECK(S) FAILED' : 'all arena checks passed'}  (shots: ${path.relative(ROOT, SHOTS)}/<id>.png)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
