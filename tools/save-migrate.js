#!/usr/bin/env node
'use strict';
// tools/save-migrate.js -- the save v3 -> v4 ship gate (DESIGN §16.5, §19.7, §23.6, §24).
// The fixtures in tools/fixtures/ are GENUINE v3 saves written by the v3 build (commit 3fcaee0, before the v4 refactor):
//   save-v3-vale-early.json   New Dream from the title, a few steps in the Vale, saveGame() (L1, starter kit)
//   save-v3-vale-chest.json   the same, plus the Vale starter chest opened and worn (Hunter's Bow + ruby, Bow E rune alternate)
//   save-v3-act1-late.json    the end of tools/act1-route.js (all Act I quests/triggers/fog/bosses), the loot of the route
//                             rolled by the v3 rollers and the best of it equipped and socketed, alternates + ranks (L10)
// and expect-v3-<name>.json is what the v3 build computed after continueGame() on that save (PROBE below, verbatim).
// For each fixture: write it to all 3 slots, then per slot: migrate on load, equipment intact under the v4 ids, the v2 item
// fields present, stats as v4 computes them (below), quests / world / bestiary / progress preserved, every slotted skill casts, then
// save -> migrate is a no-op -> applySave -> save is identical; finally reload the page and check every slot again.
// Plus makeTestItem() shapes (incl. trinkets) survive a save round trip. Screenshots: tools/shots/save-migrate/.
// STATS (M3 step 2, deliberate): implicits now apply in statsOf and CAPS clamp in recalcStats, so v3-equal stats are no longer
// expected. Instead: (1) each migrated item's statsOf = its v3 stats + its base's implicit (within 1 %); (2) the loaded hero's
// stats = a FRESH v4 recalcStats of a new hero wearing the same items (exact); (3) with the implicits stripped, that fresh v4
// recalc is still within 1 % of the v3 hero (the migration itself changed nothing else).
// NOTE: the M3 compat mirrors are gone (step 2); PROBE reads id / req / affix.id and reports them under the v3 names
// (uid, reqLvl, stat=) so the expect files compare unchanged.
// Usage: node tools/save-migrate.js     (exit 1 on any failed check or page error; tools/smoke.js runs it)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), FIX = path.join(__dirname, 'fixtures'), SHOTS = path.join(__dirname, 'shots', 'save-migrate');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
let fails = 0;
const check = (name, ok, info) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && info !== undefined ? '  ' + JSON.stringify(info).slice(0, 600) : ''}`); if (!ok) fails++; };

// the v3 probe (the one that wrote expect-v3-*.json, mapped to the v2 names: uid <- id, reqLvl <- req, affix.stat <- affix.id)
const PROBE = () => {
  const p = G.player, r = {};
  for (const k of ['level', 'xp', 'maxHp', 'maxMp', 'maxSt', 'power', 'dmgBase', 'wdmg', 'bonus', 'def', 'crit', 'critDmg', 'haste', 'cdr', 'skillDmg', 'regen', 'mpRegen', 'speed', 'dust', 'potions']) r[k] = p[k];
  r.res = Object.assign({}, p.res); r.amp = Object.assign({}, p.amp);
  r.gear = Object.assign({}, p.gear);
  r.slots = {}; for (const s of ['q', 'e', 'r', 'f', 'c', 'shift', '1', '2', '3']) r.slots[s] = slotSkill(p, s);
  r.equip = {}; for (const s of SLOTS) { const it = p.equip[s]; r.equip[s] = it ? { uid: it.id, base: it.base, rarity: it.rarity, ilvl: it.ilvl, reqLvl: it.req, affixes: it.affixes.map(a => a.id + '=' + a.v), sockets: it.sockets.slice(), unique: it.unique || null, stats: statsOf(it) } : null; }
  r.bag = p.bag.map(e => e ? (e.gem ? 'gem:' + e.gem + 'x' + e.n : 'item:' + e.id + ':' + e.base) : null);
  r.wsk = JSON.parse(JSON.stringify(p.wsk)); r.csk = p.csk.slice(); r.runes = (p.runes || []).slice();
  r.ranks = JSON.parse(JSON.stringify(p.ranks)); r.mods = JSON.parse(JSON.stringify(p.mods));
  r.map = G.map.id; r.checkpoint = G.checkpoint;
  r.prog = { quests: G.prog.quests, chests: Object.keys(G.prog.chests).length, firsts: Object.keys(G.prog.firsts), trig: G.prog.trig, secrets: G.prog.secrets, gates: G.prog.gates, sections: G.prog.sections, shrines: G.prog.shrines, once: G.prog.once, obj: G.prog.obj, fogMaps: Object.keys(G.prog.fog || {}) };
  r.seen = Object.keys(G.seen).length; r.stats = G.stats;
  return JSON.parse(JSON.stringify(r));
};
const RENAME = { dawnblade: 'sword', starfall: 'staff', moonbow: 'bow', knightplate: 'warden', dreamrobe: 'dreamweave', stalkerjacket: 'stalker' };
const ren = id => RENAME[id] || id;
const near = (a, b) => Math.abs(a - b) <= 0.01 * Math.max(Math.abs(a), Math.abs(b), 1e-6);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// v3 expectation -> what v4 must show (ids renamed, affixes P-first is an order change only: compared as sorted lists)
function compare(exp, got) {
  const bad = [];
  let maxDev = 0;
  const num = (k, a, b) => { if (typeof a !== 'number') { if (!same(a, b)) bad.push(k); return; } const d = Math.abs(a - b) / Math.max(Math.abs(a), 1e-9); if (a !== 0) maxDev = Math.max(maxDev, d); if (!near(a, b)) bad.push(`${k}: ${a} -> ${b}`); };
  // progress numbers are v3-equal; the hero's derived stats must equal a fresh v4 computation (got.fresh, exact)
  for (const k of ['level', 'xp', 'maxSt', 'dust', 'potions']) num(k, exp[k], got[k]);
  for (const k of ['maxHp', 'maxMp', 'power', 'dmgBase', 'wdmg', 'bonus', 'def', 'crit', 'critDmg', 'haste', 'cdr', 'skillDmg', 'regen', 'mpRegen', 'speed']) if (got[k] !== got.fresh[k]) bad.push(`fresh ${k}: ${got.fresh[k]} != loaded ${got[k]}`);
  for (const k in got.fresh.res) if (got.res[k] !== got.fresh.res[k]) bad.push(`fresh res.${k}`);
  for (const k in exp.amp) num('amp.' + k, exp.amp[k], got.amp[k]);
  for (const k in exp.res) num('stripped res.' + k, exp.res[k], got.stripped.res[k]);
  // the v3 hero vs a fresh v4 recalc with the implicits stripped (got.stripped): the migration changed nothing else
  for (const k of ['maxHp', 'maxMp', 'power', 'dmgBase', 'wdmg', 'bonus', 'def', 'crit', 'critDmg', 'haste', 'cdr', 'skillDmg', 'regen', 'mpRegen', 'speed']) num('stripped ' + k, exp[k], got.stripped[k]);
  const stats = { maxDev, bad };
  const gearExp = {}; for (const s in exp.gear) gearExp[s] = ren(exp.gear[s]);
  const eq = {};
  for (const s in exp.equip) {
    const a = exp.equip[s], b = got.equip[s];
    if (!a || !b) { eq[s] = same(a, b); continue; }
    let ok = a.uid === b.uid && a.base === b.base && a.rarity === b.rarity && a.ilvl === b.ilvl && a.reqLvl === b.reqLvl && same(a.sockets, b.sockets) && a.unique === b.unique && same(a.affixes.slice().sort(), b.affixes.slice().sort());
    // v4 statsOf = the v3 stats + the base's implicit (IMPLICITS, passed in by the page as got.implicits)
    const want = Object.assign({}, a.stats), im = got.implicits[a.base];
    if (im) want[im.stat] = (want[im.stat] || 0) + im.v;
    for (const k in want) if (!near(want[k], b.stats[k])) ok = false;
    if (Object.keys(want).sort().join() !== Object.keys(b.stats).sort().join()) ok = false;
    eq[s] = ok;
  }
  const wskExp = {}; for (const f in exp.wsk) wskExp[ren(f)] = exp.wsk[f];
  return {
    stats, gear: same(gearExp, got.gear), equip: eq, slots: same(exp.slots, got.slots), wsk: same(wskExp, got.wsk), wskKeys: Object.keys(got.wsk).join(),
    bag: same(exp.bag, got.bag), skills: same([exp.csk, exp.runes, exp.ranks, exp.mods], [got.csk, got.runes, got.ranks, got.mods]),
    world: same([exp.map, exp.checkpoint], [got.map, got.checkpoint]), prog: same(exp.prog, got.prog), seen: exp.seen === got.seen, playtime: got.stats.playtime >= exp.stats.playtime && got.stats.deaths === exp.stats.deaths,
  };
}
// the v2 item checks (every equipped + bag item); runs in the page
const V2_CHECK = () => {
  const p = G.player, out = [], KEYS = 'id,base,variant,class,suit,slot,tier,rarity,ilvl,req,implicit,affixes,sockets,boon,rule,unique,hist,tempered,name';
  const items = EQUIP_SLOTS.map(s => p.equip[s]).filter(Boolean).concat(p.bag.filter(e => e && !e.gem));
  for (const it of items) {
    const b = BASES[it.base], why = [];
    if (Object.keys(it).join() !== KEYS) why.push('keys ' + Object.keys(it).join());
    if (!/^i_\d+$/.test(it.id)) why.push('id');
    if (!b || it.variant !== b.variant || it.class !== b.class || it.slot !== b.slot || it.tier !== b.tier) why.push('base fields');
    if (!FAMILY_TIERS[it.variant] || !ITEMS[it.slot].some(f => f.id === it.variant)) why.push('variant ' + it.variant);
    if (!it.implicit || it.implicit.id !== IMPLICITS[it.base].stat || it.implicit.v !== IMPLICITS[it.base].v) why.push('implicit');
    if (it.affixes.some(a => a.tier !== affixTier(it.ilvl) || !['P', 'S'].includes(a.kind) || a.kind !== affixKind(a.id) || typeof a.v !== 'number' || Object.keys(a).join() !== 'id,tier,v,kind')) why.push('affixes');
    if (it.affixes.some((a, i) => i && a.kind === 'P' && it.affixes[i - 1].kind === 'S')) why.push('P before S');
    if (it.boon !== null || it.tempered !== null || !it.hist || it.hist.kills < 0 || !('found' in it.hist) || !it.name || !('prefix' in it.name)) why.push('boon/tempered/hist/name');
    if ((it.unique || null) !== (it.rule || null)) why.push('rule');
    if (why.length) out.push(it.base + ': ' + why.join('; '));
  }
  return { n: items.length, bad: out, trinkets: TRINKET_SLOTS.map(s => p.equip[s]), tiers: [...new Set(items.flatMap(it => it.affixes.map(a => it.ilvl + ':T' + a.tier)))].join(' ') };
};
// cast every slotted skill (and both options of each weapon slot) at a dummy; the engine must accept each cast
const CASTS = async () => {
  const p = G.player, res = {}, w = ms => new Promise(r => setTimeout(r, ms));
  const prep = () => { G.enemies.length = 0; spawnEnemy('dummy', p.x + 1.5, p.y, 0); p.cds = {}; p.mp = p.maxMp; p.st = p.maxSt; p.ult = 100; p.dash = null; p.cast = null; p.atkT = 0; p.rootT = 0; p.invulnT = 99; p.hp = p.maxHp; p.aim = 0; };
  const v = item('weapon', p.gear.weapon), keep = Object.assign({}, p.wsk[v.id]);
  for (const k of ['q', 'e', 'r']) for (const id of v[k]) { p.wsk[v.id][k] = id; prep(); res[k + ':' + id] = useSkill(p, k) === true; await w(700); }
  Object.assign(p.wsk[v.id], keep);
  for (const k of ['f', 'c', 'shift', '1', '2', '3']) { const id = slotSkill(p, k); if (!id) continue; prep(); res[k + ':' + id] = useSkill(p, k) === true; await w(700); }
  prep(); p.atkT = 0; basicAttack(p); res['lmb:' + v.id] = p.atkT > 0;
  await w(1500); G.enemies.length = 0; p.invulnT = 0;
  return res;
};
// save -> read back -> migrate (no-op on v4) -> applySave onto a fresh hero -> save: identical (t stripped); one evaluate, no frame between
const ROUND = () => {
  const strip = d => { const o = JSON.parse(JSON.stringify(d)); delete o.t; return o; };
  const ok = saveGame(), raw = localStorage.getItem(saveKey()), disk = JSON.parse(raw);
  const a = JSON.stringify(strip(saveData())), m = migrate(JSON.parse(raw));
  const noop = JSON.stringify(strip(m)) === JSON.stringify(strip(disk));
  const q = makePlayer(); G.player = q; applySave(q, m);
  const b = JSON.stringify(strip(saveData()));
  let at = -1; if (a !== b) for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { at = i; break; }
  G.state = 'title';   // this slot's session ends here: no later autosave (e.g. on page unload) may overwrite the file we compare
  return { ok, version: disk.version, noop, same: a === b, diff: at < 0 ? '' : a.slice(Math.max(0, at - 80), at + 80) + ' || ' + b.slice(Math.max(0, at - 80), at + 80), json: b,
    oldIds: /"(dawnblade|starfall|moonbow|knightplate|dreamrobe|stalkerjacket)":/.test(raw), uidField: /"uid":"i_/.test(raw), reqLvl: raw.includes('"reqLvl"'), stat: raw.includes('"stat":') };
};

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const fixtures = fs.readdirSync(FIX).filter(f => /^save-v3-.*\.json$/.test(f)).sort();
  check(`fixtures: at least two genuine v3 saves (${fixtures.join(', ')})`, fixtures.length >= 2);
  for (const f of fixtures) {
    const name = f.replace(/^save-v3-|\.json$/g, ''), raw = fs.readFileSync(path.join(FIX, f), 'utf8'), exp = JSON.parse(fs.readFileSync(path.join(FIX, `expect-v3-${name}.json`), 'utf8'));
    check(`${name}: fixture is a v3 save`, JSON.parse(raw).version === 3);
    const ctx = await br.newContext({ viewport: { width: 960, height: 540 } }), page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.addInitScript(raw => {
      if (sessionStorage.getItem('__seeded')) return;
      localStorage.clear(); for (const k of ['dreamy.save.v1', 'dreamy.save.v1.s2', 'dreamy.save.v1.s3']) localStorage.setItem(k, raw);
      localStorage.setItem('dreamy.slot', '1'); sessionStorage.setItem('__seeded', '1');
    }, JSON.stringify(JSON.parse(raw)));
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const slots = await ev(() => saveSlots());
    check(`${name}: the title lists the save in all 3 slots`, slots.length === 3 && slots.every((s, i) => s && s.slot === i + 1 && s.level === JSON.parse(raw).player.level), slots);
    const saved = {};
    for (const n of [1, 2, 3]) {
      const tag = `${name} slot ${n}`;
      const mig = await ev(n => { const s = selectSlot(n); return s && { v: s.version, eq: Object.keys(s.player.equip).join(), trk: ['ring1', 'ring2', 'amulet', 'belt'].map(k => s.player.equip[k]), wsk: Object.keys(s.skills.wsk || {}).join() }; }, n);
      check(`${tag}: migrates to v4 (equip gains ring1 ring2 amulet belt, empty; wsk keyed by variant)`, mig && mig.v === 4 && mig.eq === 'weapon,head,chest,boots,ring1,ring2,amulet,belt' && mig.trk.every(x => x === null) && mig.wsk.split(',').every(k => ['sword', 'staff', 'bow'].includes(k)), mig);
      const got = await ev(src => { continueGame(G.save); const r = (new Function('return (' + src + ')()'))();
        // a fresh v4 hero wearing the same items, and the same with every implicit stripped (copies; the live hero is untouched)
        const p = G.player, KS = ['maxHp', 'maxMp', 'power', 'dmgBase', 'wdmg', 'bonus', 'def', 'crit', 'critDmg', 'haste', 'cdr', 'skillDmg', 'regen', 'mpRegen', 'speed'];
        const calc = strip => { const q = makePlayer(); q.level = p.level; for (const k of EQUIP_SLOTS) { const it = p.equip[k]; q.equip[k] = it ? (strip ? Object.assign(JSON.parse(JSON.stringify(it)), { implicit: null }) : it) : null; } G.player = q; recalcStats(q, true); G.player = p;
          const o = {}; for (const k of KS) o[k] = q[k]; o.res = Object.assign({}, q.res); return o; };
        r.fresh = calc(false); r.stripped = calc(true);
        r.implicits = {}; for (const s of SLOTS) { const it = p.equip[s]; if (it && IMPLICITS[it.base]) r.implicits[it.base] = IMPLICITS[it.base]; }
        return r; }, PROBE.toString());
      const c = compare(exp, got);
      check(`${tag}: equipment intact under the v4 ids (gear ${Object.values(got.gear).join('/')})`, c.gear && Object.values(c.equip).every(Boolean) && c.bag, { gear: got.gear, equip: c.equip, bag: c.bag });
      check(`${tag}: stats = a fresh v4 recalc (implicits on, CAPS); items = v3 + implicit; implicits stripped = v3 within 1 % (max ${(c.stats.maxDev * 100).toFixed(4)} %)`, c.stats.bad.length === 0, c.stats.bad);
      check(`${tag}: skills (slots, wsk ${c.wskKeys}, csk, runes, ranks, mods) preserved`, c.slots && c.wsk && c.skills, { slots: got.slots, wsk: got.wsk });
      check(`${tag}: quests, world and progress preserved (map ${got.map}, ${Object.keys(got.prog.quests || {}).length} quests, ${got.prog.chests} chests, ${got.seen} bestiary)`, c.world && c.prog && c.seen && c.playtime, { world: c.world, prog: c.prog, seen: c.seen, playtime: c.playtime });
      const v2 = await ev(V2_CHECK);
      check(`${tag}: every item has the v2 fields (${v2.n} items; affix tiers ${v2.tiers || 'none'})`, v2.bad.length === 0 && v2.trinkets.every(x => x === null), v2.bad);
      if (n === 1) { await wait(1200); await page.screenshot({ path: path.join(SHOTS, `${name}-v4.png`) }); }
      const casts = await ev(CASTS);
      check(`${tag}: every slotted skill + both weapon options cast (${Object.keys(casts).join(' ')})`, Object.values(casts).every(Boolean) && errs.length === 0, { casts, errs: errs.slice(0, 3) });
      const rt = await ev(ROUND);
      check(`${tag}: save -> migrate (no-op) -> load -> save is identical; no pre-v4 ids or fields on disk`, rt.ok && rt.version === 4 && rt.noop && rt.same && !rt.oldIds && !rt.uidField && !rt.reqLvl && !rt.stat, Object.assign({}, rt, { json: undefined }));
      saved[n] = rt.json;
    }
    // reload: the title reads the three v4 saves, each loads back to exactly what was saved
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    for (const n of [1, 2, 3]) {
      const back = await ev(n => { selectSlot(n); continueGame(G.save); const o = JSON.parse(JSON.stringify(saveData())); delete o.t; return JSON.stringify(o); }, n);
      let at = -1; if (back !== saved[n]) for (let i = 0; i < back.length; i++) if (back[i] !== saved[n][i]) { at = i; break; }
      check(`${name} slot ${n}: after a page reload the save loads back identical`, back === saved[n], at < 0 ? undefined : { at, back: back.slice(Math.max(0, at - 100), at + 60), saved: saved[n].slice(Math.max(0, at - 100), at + 60) });
    }
    check(`${name}: no page errors`, errs.length === 0, errs.slice(0, 5));
    await ctx.close();
  }
  // makeTestItem: every slot kind builds a valid v2 item that survives a save round trip (equipped trinkets included)
  {
    const ctx = await br.newContext({ viewport: { width: 960, height: 540 } }), page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const t = await page.evaluate(() => {
      const KEYS = 'id,base,variant,class,suit,slot,tier,rarity,ilvl,req,implicit,affixes,sockets,boon,rule,unique,hist,tempered,name';
      const specs = [{}, { slot: 'head', variant: 'arcanecowl', tier: 3, rarity: 'epic' }, { slot: 'chest', variant: 'warden', tier: 2, rarity: 'epic', sockets: ['ruby_2', null], tempered: true },
        { slot: 'boots', variant: 'stalkershoes', rarity: 'uncommon' }, { slot: 'weapon', variant: 'dawnblade', tier: 4, rarity: 'legendary', ilvl: 34 }, { unique: 'rootcrown' }, { unique: 'morrowbane' },
        { slot: 'ring', rarity: 'rare', boon: 'fireBurn' }, { slot: 'amulet', rarity: 'epic', tier: 1 }, { slot: 'belt', rarity: 'uncommon' }, { unique: 'pipslantern' }, { base: 'origin_knight', rarity: 'uncommon' }];
      const bad = [], made = specs.map(o => { try { return makeTestItem(o); } catch (e) { bad.push(JSON.stringify(o) + ': ' + e.message); return null; } }).filter(Boolean);
      for (const it of made) {
        const j = JSON.parse(JSON.stringify(it)), why = [];
        if (Object.keys(j).join() !== KEYS) why.push('keys');
        if (!validItem(it)) why.push('validItem');
        if ('reqLvl' in it || 'uid' in it || (it.affixes[0] && 'stat' in it.affixes[0])) why.push('legacy mirrors present');
        if (it.affixes.some(a => !['P', 'S'].includes(a.kind) || a.tier < 1 || a.tier > 3)) why.push('affixes');
        if (it.slot === 'ring' && (it.sockets.length || it.affixes.some(a => a.kind !== 'P'))) why.push('ring rules');
        if (it.slot === 'belt' && it.affixes.some(a => a.kind !== 'S')) why.push('belt rules');
        if (TRINKET_KINDS.includes(it.slot) !== (it.class === 'trinket')) why.push('class');
        if (!itemName(it)) why.push('name');
        if (why.length) bad.push(it.base + ': ' + why.join(','));
      }
      const p = G.player, ring = made.find(i => i.slot === 'ring'), amu = made.find(i => i.slot === 'amulet' && !i.unique), belt = made.find(i => i.slot === 'belt');
      p.level = 40; const r1 = equipItem(p, ring), r2 = equipItem(p, makeTestItem({ slot: 'ring' })), r3 = equipItem(p, amu), r4 = equipItem(p, belt);
      const before = p.equip.ring1 && p.equip.ring2 && p.equip.amulet && p.equip.belt;
      const s = migrate(JSON.parse(JSON.stringify(saveData()))), q = makePlayer(); applySave(q, s);
      const kept = ['ring1', 'ring2', 'amulet', 'belt'].map(k => q.equip[k] && q.equip[k].id === p.equip[k].id).every(Boolean);
      // a NEW hero starts with no ring; the first Vale chest (starterLoot) holds the Origin ring (§17.1, §19.4, director ruling);
      // worn, its boon is live and it survives the save round trip
      const np = makePlayer(), bare = np.equip.ring1 === null, sr = starterLoot(np).map(d => d.it).find(it => it && it.slot === 'ring'); G.player = np; equipItem(np, sr); const s2 = migrate(JSON.parse(JSON.stringify(saveData()))), q2 = makePlayer(); applySave(q2, s2); G.player = p;
      const starter = { bare, base: sr && sr.base, boon: sr && sr.boon && sr.boon.id, live: !!(np.boons && np.boons.originKnight), kept: !!(q2.equip.ring1 && q2.equip.ring1.base === 'origin_knight' && q2.boons.originKnight), flavor: !!itemFlavor(sr) };
      return { n: made.length, bad, equip: [r1, r2, r3, r4].join('|'), before: !!before, kept, names: made.map(itemName), starter };
    });
    check(`makeTestItem: ${t.n} v2 items (gear, uniques, ring / amulet / belt) are valid, no legacy mirrors (${t.names.slice(0, 4).join(' · ')} ...)`, t.n === 12 && t.bad.length === 0, t.bad);
    check('makeTestItem: trinkets equip into ring1 / ring2 / amulet / belt and survive a save round trip', t.equip === '|||' && t.before && t.kept, t);
    check(`new game: no ring at start; the first chest's Origin ring (${t.starter.base}, boon ${t.starter.boon}) equips, is live, flavoured and survives a save round trip`, t.starter.bare && t.starter.base === 'origin_knight' && t.starter.boon === 'originKnight' && t.starter.live && t.starter.kept && t.starter.flavor, t.starter);
    check('makeTestItem: no page errors', errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} save-migrate check(s) failed` : '\nAll save-migrate checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
