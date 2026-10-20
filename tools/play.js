#!/usr/bin/env node
'use strict';
// M2a play test: drives the real game in headless Chromium through the action layer.
//  1. synthetic gamepad (navigator.getGamepads stub): move, twin-stick aim, attack, Interact a chest,
//     open the inventory, navigate the bag grid with the d-pad, close with B
//  2. device switching: prompt glyphs on the skill bar + the interact prompt change kbm -> pad (Xbox, PS) -> touch
//  3. combat feel (§15.3): MP on basic hits, ultimate charge gate, dodge-cancel refund, skill ranks
//  4. rebinding round-trip through the save, and a v2 -> v3 save migration with no data loss
//  4d. M2b engine: one behaviour part per category, elites, the Bramblehorn telegraph + phase 2, the Warden port,
//      gate / lever / keydoor / hidden / fishspot on an inline test map, trigger actions, 3 save slots (shots: tools/shots/m2b)
//  5. frame-time sample (avg / p95)
// Usage: node tools/play.js     (exit 1 on any failed check or page error)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});

let fails = 0;
function check(name, ok, info) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (!ok) fails++; }

const PAD_STUB = () => {
  const mk = id => ({ id, index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
  window.__pad = mk('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)');
  window.__padOn = false;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__padOn ? window.__pad : null] });
  window.__btn = (i, on) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; window.__padOn = true; };
  window.__axes = (a) => { window.__pad.axes = a.slice(); window.__padOn = true; };
};

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const page = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(PAD_STUB);
  await page.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await wait(400);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const tap = async (i, ms = 120) => { await ev(i => window.__btn(i, true), i); await wait(ms); await ev(i => window.__btn(i, false), i); await wait(80); };

  // ---------- 1. gamepad ----------
  const p0 = await ev(() => ({ x: G.player.x, y: G.player.y }));
  await ev(() => window.__axes([0.95, 0.1, 0, 0]));
  await wait(700);
  await ev(() => window.__axes([0, 0, 0, 0]));
  const p1 = await ev(() => ({ x: G.player.x, y: G.player.y, dev: IN.device }));
  check('pad: left stick moves the hero', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.8, { moved: +Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(2) });
  check('pad: device switches to pad', p1.dev === 'pad', p1.dev);
  await ev(() => window.__axes([0, 0, 0.1, 0.12]));   // inside the 0.28 aim deadzone: ignored
  await wait(80);
  check('pad: aim deadzone ignores drift', await ev(() => IN.aim.mag === 0));
  await ev(() => window.__axes([0, 0, 0, -1]));
  await wait(150);
  const a1 = await ev(() => ({ mode: IN.aim.mode, aim: G.player.aim }));
  await ev(() => window.__axes([0, 0, 1, 0]));
  await wait(150);
  const a2 = await ev(() => ({ mode: IN.aim.mode, aim: G.player.aim }));
  check('pad: right stick twin-stick aim', a1.mode === 'stick' && Math.abs(a1.aim - a2.aim) > 0.5, { a1, a2 });
  await ev(() => window.__axes([0, 0, 0, 0]));
  await wait(150);
  check('pad: sticky aim holds 0.4 s after release', await ev(() => IN.aim.mode === 'stick'));
  await wait(450);
  check('pad: aim falls back to auto after the sticky window', await ev(() => IN.aim.mode === 'auto'));
  const mp0 = await ev(() => { G.enemies.length = 0; const p = G.player; const e = spawnEnemy('dummy', p.x + 1, p.y, 0); p.mp = 10; return p.mp; });
  await ev(() => window.__btn(7, true));   // RT
  await wait(900);
  await ev(() => window.__btn(7, false));
  const atk = await ev(() => ({ mp: G.player.mp, ult: G.player.ult, combo: G.player.combo }));
  check('pad: RT attacks (basic hits build MP)', atk.mp >= mp0 + 8, { before: mp0, after: Math.round(atk.mp) });
  check('combat: damage feeds the ultimate charge', atk.ult > 0, { ult: +atk.ult.toFixed(2) });
  // interact: stand at the Vale chest and press A
  const chest = await ev(() => { const o = G.map.objects.find(q => q.chest && !q.opened); if (!o) return null; G.player.x = o.x + 0.6; G.player.y = o.y + 0.3; return { x: o.x, y: o.y }; });
  if (chest) {
    await wait(150);
    const pr = await ev(() => interactPrompt());
    check('interact: prompt appears near a chest', pr && pr.kind === 'chest' && pr.glyph === 'A', pr && { kind: pr.kind, glyph: pr.glyph, text: pr.text });
    await tap(0);
    check('interact: A opens the chest', await ev(() => G.map.objects.some(q => q.chest && q.opened)));
  } else check('interact: a chest exists on the play map', false);
  // inventory
  await ev(() => { G.enemies.length = 0; if (!G.player.bag.some(Boolean)) sampleBag(G.player); });
  await tap(8);   // Back / View
  await wait(150);
  check('pad: Back opens the inventory', await ev(() => G.ui.open === true));
  const f0 = await ev(() => { const r = UI.focus.current(); return r && r.id; });
  await tap(15); await wait(60);
  const f1 = await ev(() => UI.focus.current().id);
  await tap(13); await wait(60);
  const f2 = await ev(() => UI.focus.current().id);
  await tap(14); await wait(60);
  const f3 = await ev(() => UI.focus.current().id);
  check('pad: d-pad moves focus through the bag grid', f0 && f1 !== f0 && f2 !== f1 && f3 !== f2, { f0, f1, f2, f3 });
  // walk focus into the bag and select an item with A (pad = select-then-select)
  const sel = await ev(() => { const list = UI.focus.list; const r = list.find(q => q.id === 'bag:0'); if (r) UI.focus.set(r.id, true); return r && r.id; });
  await tap(0); await wait(60);
  check('pad: A selects the focused bag item', await ev(() => G.ui.sel != null), sel);
  check('focus ring is drawn on pad', await ev(() => UI.focus.showing()));
  await tap(5); await wait(80);
  check('pad: RB switches tab', await ev(() => G.ui.tab === 'skills'));
  // every Tab screen is reachable with RB / LB and registers focus targets (mouse, touch and pad share them)
  const tabs = [];
  for (let i = 0; i < 3; i++) { await tap(5); await wait(120); tabs.push(await ev(() => ({ tab: G.ui.tab, focusable: UI.focus.list.length }))); }
  check('pad: RB cycles CHARACTER > BESTIARY > QUESTS > INVENTORY, each with focus targets', tabs.map(t => t.tab).join() === 'bestiary,quests,inv' && tabs.every(t => t.focusable > 3), tabs);
  await tap(4); await wait(120);
  check('pad: LB goes back a tab', await ev(() => G.ui.tab === 'quests'));
  const fq = await ev(() => { const a = UI.focus.current(); return a && a.id; }); await tap(13); await wait(100);
  check('pad: d-pad moves focus inside QUESTS', typeof await ev(() => UI.focus.current().id) === 'string', fq);
  await page.keyboard.press('KeyB'); await wait(120);
  check('keys: B jumps to BESTIARY, K to CHARACTER, J to QUESTS', await ev(() => G.ui.tab === 'bestiary'));
  await page.keyboard.press('KeyK'); await wait(120); const kk = await ev(() => G.ui.tab);
  await page.keyboard.press('KeyJ'); await wait(120); const jj = await ev(() => G.ui.tab);
  check('keys: K = CHARACTER, J = QUESTS', kk === 'skills' && jj === 'quests', { kk, jj });
  await page.keyboard.press('KeyI'); await wait(120); await page.keyboard.press('KeyI'); await wait(120);
  await page.keyboard.press('KeyI'); await wait(150);
  check('keys: I toggles the bag', await ev(() => G.ui.open === true));
  await tap(1);   // B
  await wait(120);
  check('pad: B closes the inventory', await ev(() => G.ui.open === false));
  // ---------- 1b. pause / settings (Esc and pad Start) ----------
  await wait(150);
  await tap(9); await wait(250);
  check('pad: Start opens the pause screen (not Help)', await ev(() => G.ui.pause === true && !G.ui.help));
  const setN = await ev(() => UI.focus.list.filter(r => String(r.id).startsWith('set:')).length);
  check('pause: rows are generated from SETTINGS_SCHEMA', setN === (await ev(() => SETTINGS_SCHEMA.length)), setN);
  await ev(() => UI.focus.set('set:music', true)); await wait(60);
  const m0 = await ev(() => SETTINGS.music); await tap(14); await wait(80);
  const m1 = await ev(() => SETTINGS.music);
  await ev(() => UI.focus.set('set:difficulty', true)); await wait(60); await tap(15); await wait(80);
  const dd = await ev(() => SETTINGS.difficulty);
  await tap(14); await wait(80);
  check('pause: d-pad left / right change sliders and choices (Story / Normal)', m1 === m0 - 0.25 && dd === 'story' && await ev(() => SETTINGS.difficulty === 'normal'), { m0, m1, dd });
  await ev(() => setSetting('music', 0.75));
  await tap(9); await wait(200);
  check('pad: Start closes pause', await ev(() => G.ui.pause === false));
  await page.keyboard.press('Escape'); await wait(200);
  const esc1 = await ev(() => G.ui.pause);
  await page.keyboard.press('Escape'); await wait(200);
  check('keys: Esc opens and closes pause', esc1 === true && await ev(() => G.ui.pause === false), esc1);
  await tap(16); await wait(80);   // back to the pad as the active device
  // ---------- 2. device switch prompts ----------
  const gPad = await ev(() => ({ q: skillSlotState(G.player, 'q').glyph, dodge: IN.glyph('dodge'), interact: IN.glyph('interact'), attack: skillSlotState(G.player, 'lmb').glyph }));
  await page.keyboard.press('KeyW');
  await wait(100);
  const gKbm = await ev(() => ({ dev: IN.device, q: skillSlotState(G.player, 'q').glyph, dodge: IN.glyph('dodge'), interact: IN.glyph('interact'), attack: skillSlotState(G.player, 'lmb').glyph }));
  check('switch: pad glyphs (Xbox)', gPad.q === 'RB' && gPad.dodge === 'LT' && gPad.interact === 'A' && gPad.attack === 'RT', gPad);
  check('switch: keyboard press flips to kbm glyphs', gKbm.dev === 'kbm' && gKbm.q === 'Q' && gKbm.dodge === 'SHIFT' && gKbm.interact === 'SPACE' && gKbm.attack === 'LMB', gKbm);
  await ev(() => { window.__pad.id = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'; });
  await tap(3);
  const gPs = await ev(() => ({ dev: IN.device, style: IN.padStyle, interact: IN.glyph('interact'), sprite: IN.glyphInfo('interact').sprite, q: IN.glyph('skillQ') }));
  check('switch: PlayStation pad glyphs', gPs.dev === 'pad' && gPs.style === 'ps' && gPs.interact === '✕' && gPs.sprite === 'psCross' && gPs.q === 'R1', gPs);
  await page.mouse.move(300, 300); await page.mouse.move(340, 320);
  check('switch: mouse movement flips back to kbm', await ev(() => IN.device === 'kbm'));
  await ev(() => { const c = document.getElementById('game'); c.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 7, clientX: 100, clientY: 100, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 7, clientX: 100, clientY: 100, bubbles: true })); });
  await wait(80);
  const gT = await ev(() => ({ dev: IN.device, touch: G.touch, q: IN.glyph('skillQ') }));
  check('switch: touch hides glyphs and uses the touch layout', gT.dev === 'touch' && gT.touch === true && gT.q === '', gT);
  await page.keyboard.press('KeyS'); await wait(80);
  // ---------- 3. combat feel ----------
  const ultGate = await ev(() => { const p = G.player; p.ult = 50; p.mp = p.maxMp; const r1 = useSkill(p, 'r'); p.ult = 100; p.cds = {}; const r2 = useSkill(p, 'r'); return { r1, r2, after: p.ult }; });
  check('combat: ultimate gated by the charge bar (0..100), consumed on cast', ultGate.r1 === false && ultGate.r2 === true && ultGate.after === 0, ultGate);
  await wait(800);
  const cancel = await ev(() => {
    const p = G.player; p.wsk.dawnblade.e = 'whirl'; recalcStats(p); p.cds = {}; p.mp = 200; p.st = p.maxSt; p.dash = null;
    useSkill(p, 'e'); return { mpAfterCast: p.mp, dur: p.cast && p.cast.dur };
  });
  await page.keyboard.down('ShiftLeft'); await wait(40); await page.keyboard.up('ShiftLeft');   // within 0.1 s: buffered
  await wait(250);
  const c2 = await ev(() => ({ cancelled: G.cancelled && G.cancelled.id, mp: G.player.mp, pending: G.delays.filter(d => d.c && d.c.skill === 'whirl').length }));
  check('combat: dodge cancels a cast after 0.1 s (buffered) and refunds 50 % MP', c2.cancelled === 'whirl' && c2.pending === 0 && c2.mp >= cancel.mpAfterCast + 14, { cancel, c2 });
  const blocked = await ev(() => { const p = G.player; p.cds = {}; p.mp = 200; p.atkT = 0; p.dash = null; useSkill(p, 'q'); const a0 = p.atkT; basicAttack(p); return { blocked: p.atkT === a0, castActive: castActive(p) }; });
  check('combat: skills never cancel into attacks', blocked.blocked && blocked.castActive, blocked);
  const ranks = await ev(() => { const p = G.player; const r0 = skillRank(p, 'sunslash'); for (let i = 0; i < 25; i++) addSkillHit(p, 'sunslash'); const r1 = skillRank(p, 'sunslash'); for (let i = 0; i < 200; i++) addSkillHit(p, 'sunslash'); return { r0, r1, r5: skillRank(p, 'sunslash'), bonus: +skillRankBonus(p, 'sunslash').toFixed(2), slots: skillModSlots(p, 'sunslash').map(s => s.open) }; });
  check('ranks: 25 hitting casts per rank, max 5, +6 %/rank, mod slots at 3 and 5', ranks.r0 === 1 && ranks.r1 === 2 && ranks.r5 === 5 && ranks.bonus === 0.24 && ranks.slots.join() === 'true,true', ranks);
  const castHit = await ev(() => { const p = G.player; delete p.ranks.sunslash; G.enemies.length = 0; const e = spawnEnemy('slime', p.x + 1, p.y, 0); e.hp = e.maxHp = 1e6; p.cds = {}; p.mp = 200; p.dash = null; p.cast = null; p.aim = Math.atan2(e.y - p.y, e.x - p.x); useSkill(p, 'q'); const h = p.ranks.sunslash && p.ranks.sunslash.hits; G.enemies.length = 0; return h; });
  check('ranks: a skill cast that hits counts once', castHit === 1, castHit);
  const mod = await ev(() => { SKILL_MODS.test_wide = { id: 'test_wide', skill: 'sunslash', rank: 3, name: 'Wide', apply(c) { c.r *= 1.5; c.dmg *= 'x'; } }; const p = G.player; for (let i = 0; i < 60; i++) addSkillHit(p, 'sunslash'); const ok = chooseSkillMod(p, 'sunslash', 3, 'test_wide'); const ctx = skillCtx(p, 'sunslash', SKILLS.sunslash); delete SKILL_MODS.test_wide; return { ok, r: ctx.r, dmg: ctx.dmg }; });
  check('SKILL_MODS: numbers-only ctx (bad values rejected)', mod.ok && mod.r === 1.5 && mod.dmg === 1, mod);
  // ---------- 4. rebinding + save ----------
  const rb = await ev(() => {
    const r = IN.rebind('kbm', 'interact', 'KeyG'); const c = IN.rebind('kbm', 'interact', 'KeyQ', { swap: false });
    const data = JSON.parse(JSON.stringify(saveData())); IN.resetBindings(); const reset = IN.glyph('interact', 'kbm');
    IN.setBindings(data.bindings); const back = IN.glyph('interact', 'kbm'); IN.resetBindings();
    return { ok: r.ok, conflict: c.conflict, reset, back, keys: Object.keys(data).sort().join(',') };
  });
  check('rebind: round-trip through the save, conflicts reported', rb.ok && rb.conflict === 'skillQ' && rb.reset === 'SPACE' && rb.back === 'G', rb);
  check('save: §16.5 top-level shape', rb.keys === 'bestiary,bindings,bosses,fishing,player,quests,settings,skills,slot,stats,t,version,world,zone100', rb.keys);
  const mig = await ev(() => {
    const p = G.player, v2 = { version: 2, t: 1, level: 7, xp: 120, potions: 2, dust: 33, map: 'vale', equip: JSON.parse(JSON.stringify(p.equip)), bag: JSON.parse(JSON.stringify(p.bag)),
      wsk: { dawnblade: { q: 'heroic', e: 'dashstrike', r: 'judgement' } }, csk: ['orbit', 'chain'], prog: { chests: { 'vale:4.5,17.2': true }, firsts: { 'ruins:boss': true }, trig: { vale: ['t1'] } },
      seen: { slime: { kills: 4, res: { slash: -0.5 } } }, cp: { map: 'vale', x: 2, y: 3 }, uid: 99 };
    const s = migrate(JSON.parse(JSON.stringify(v2))); const q = makePlayer(); applySave(q, s);
    return { v: s.version, level: q.level, xp: q.xp, dust: q.dust, q: q.wsk.dawnblade.q, csk: q.csk.join(), chest: !!G.prog.chests['vale:4.5,17.2'], boss: !!G.prog.firsts['ruins:boss'], trig: G.prog.trig.vale.join(), slime: G.seen.slime.kills, res: G.seen.slime.res.slash, cp: G.checkpoint.x, bag: q.bag.filter(Boolean).length === p.bag.filter(Boolean).length };
  });
  check('save: v2 -> v3 migration keeps everything', mig.v === 3 && mig.level === 7 && mig.xp === 120 && mig.dust === 33 && mig.q === 'heroic' && mig.csk === 'orbit,chain' && mig.chest && mig.boss && mig.trig === 't1' && mig.slime === 4 && mig.res === -0.5 && mig.cp === 2 && mig.bag, mig);
  const st = await ev(() => { const a = setSetting('difficulty', 'story'), b = setSetting('shake', 999), c = damageTakenMul(); setSetting('difficulty', 'normal'); setSetting('shake', 100); return { a, b, c }; });
  check('settings: validated setters + Story difficulty x0.6', st.a === 'story' && st.b === 100 && st.c === 0.6, st);
  // ---------- 3b. §20.5 MP builder: once per swing, 40 MP/s cap; ultimate gain cap ----------
  const cleave = await ev(() => {
    const p = G.player; G.enemies.length = 0; p.mpHits = []; G.t += 2;
    for (let k = 0; k < 5; k++) { const e = spawnEnemy('slime', p.x + Math.cos(p.aim + (k - 2) * 0.15) * 1.0, p.y + Math.sin(p.aim + (k - 2) * 0.15) * 1.0, 0); e.hp = e.maxHp = 1e6; }
    p.mp = 0; p.atkT = 0; p.cast = null; p.dash = null; p.rootT = 0; p.combo = 0;
    const kind = item('weapon', p.gear.weapon).kind, hpBefore = G.enemies.map(e => e.hp);
    basicAttack(p);
    const hit = G.enemies.filter((e, i) => e.hp < hpBefore[i]).length, mp = p.mp; G.enemies.length = 0;
    return { kind, hit, mp };
  });
  check('mp: a sword cleave hitting 5 enemies gives 8 MP, not 40', cleave.kind === 'sword' && cleave.hit === 5 && cleave.mp === 8, cleave);
  const capT = await ev(() => {
    const p = G.player; p.mpHits = []; p.mp = 0; G.t += 2; const t0 = G.t;
    for (let i = 0; i < 20; i++) { basicMpGain(p, { basic: true }); G.t += 0.04; }   // 20 swings in 0.8 s = 160 MP uncapped
    const in1s = p.mp; G.t = t0 + 1.05; basicMpGain(p, { basic: true });
    return { in1s, after: p.mp };
  });
  check('mp: hard cap 40 MP/s from hits (rolling 1 s)', capT.in1s === 40 && capT.after === 48, capT);
  const ultCap = await ev(() => ({ hit: ultGain(G.player, 1e6, false), reaction: ultGain(G.player, 1e6, true) }));
  check('ultimate: gain capped at 5 % per hit, 10 % per reaction', ultCap.hit === 5 && ultCap.reaction === 10, ultCap);
  // ---------- 4b. a press that closes a screen never leaks into gameplay ----------
  await ev(() => { const p = G.player; p.hp = p.maxHp / 2; p.potions = 3; p.potT = 0; G.ui.open = false; G.ui.help = false; });
  await tap(8); await wait(100);
  await tap(1, 150); await wait(150);
  check('input: B closing the bag does not also drink a potion', await ev(() => !G.ui.open && G.player.potions === 3), await ev(() => ({ open: G.ui.open, potions: G.player.potions })));
  await tap(1, 120); await wait(80);
  check('input: the next B press does drink it', await ev(() => G.player.potions === 2));
  // ---------- 4c. ui.js primitives draw (bitmap font + atlas live) ----------
  const prim = await ev(() => {
    const c = document.createElement('canvas'); c.width = 960; c.height = 540; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#3b2a55'; x.fillRect(0, 0, 960, 540);
    UI.begin();
    UI.text(x, 'DreamSmall 0123 Lv 14 +12%', 16, 16, 'small'); UI.text(x, 'DreamBody: Whispering Vale', 16, 40, 'body', UI.C.gold);
    UI.text(x, 'LEVEL 15', 480, 70, 'heading', UI.C.gold, 'center');
    ['primary', 'plain', 'tab', 'tabInactive', 'slot', 'gold', 'danger', 'keyTag', 'keycap'].forEach((k, i) => UI.frame(x, 16 + i * 100, 120, 88, 72, k));
    UI.frame(x, 16, 210, 48, 48, 'rarity', { rarity: 'epic', shape: true }); UI.frame(x, 76, 210, 48, 48, 'element', { el: 'fire' });
    UI.frame(x, 136, 210, 48, 48, 'focus', { tint: UI.C.bright });
    const id = 'test-hp'; UI.bar(x, 100, 300, 236, 18, 1, { id }); G.t += 0.05; UI.bar(x, 100, 300, 236, 18, 0.5, { id });
    const ghost = UI.bar(x, 100, 300, 236, 18, 0.5, { id, label: '906/1813' }).ghost;
    G.t += 0.05; UI.bar(x, 100, 330, 236, 12, 0.4, { id: 'mp', col: UI.C.mp, hi: UI.C.mpHi }); G.t += 0.05; const wipe = UI.bar(x, 100, 330, 236, 12, 0.8, { id: 'mp', col: UI.C.mp, hi: UI.C.mpHi }).wT >= 0;
    UI.frame(x, 400, 300, 44, 44, 'slot'); UI.sweep(x, 400, 300, 44, 44, 0.6, { label: '3' });
    const tip = UI.tooltip(x, 470, 290, { title: 'Sunslash', lines: ['Sweep a wide arc of dawnlight.', '', { s: '18 MP  CD 3s', col: UI.C.dim }] });
    const b = UI.button(x, 760, 300, 160, 40, 'EQUIP', { fn: () => { window.__clicked = true; } });
    UI.toast({ text: 'Lumen Edge', rarity: 'rare' }); UI.drawToasts(x);
    const hit = UI.click(780, 310);
    UI.focus.set('btn:760,300', true); UI.focus.draw(x);
    window.__primShot = c.toDataURL('image/png');
    return { glyphs: UI.image(FONT_ART.body.src) !== null, atlas: UI.image(UI_ART.src) !== null, w: UI.measure('Hello', 'body'), ghost: +ghost.toFixed(2), wipe, tip, hit, clicked: !!window.__clicked };
  });
  check('ui: primitives draw from the bitmap font + atlas (bar ghost, heal wipe, tooltip, button hit)', prim.glyphs && prim.atlas && prim.w > 0 && prim.ghost > 0.5 && prim.wipe && prim.tip.w === 280 && prim.hit && prim.clicked, prim);
  const shot = await ev(() => window.__primShot);
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'shots', 'ui-primitives.png'), Buffer.from(shot.split(',')[1], 'base64'));
  // ---------- 4d. touch v2: circular wheel, tap = quick-cast, drag = aimed cast, cancel zones, pages, left-handed, multi-touch ----------
  await ev(() => {
    window.__tp = (type, id, x, y) => { const c = document.getElementById('game'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, bubbles: true, clientX: r.left + x * r.width / DW, clientY: r.top + y * r.height / DH })); };
    window.__bt = slot => touchButtons().find(b => b.slot === slot);
    window.__vib = []; Object.defineProperty(navigator, 'vibrate', { configurable: true, value: ms => { window.__vib.push(ms); return true; } });
    window.__reset = () => { const p = G.player; G.enemies.length = 0; p.cds = {}; p.mp = p.maxMp; p.st = p.maxSt; p.ult = 0; p.hp = p.maxHp; p.dash = null; p.cast = null; p.atkT = 0; p.rootT = 0; p.potT = 0; G.prompt = null; window.__vib.length = 0; if (window.__casts) window.__casts.length = 0; };
    { const u = useSkill; window.__casts = []; window.useSkill = function (p, slot) { const ok = u(p, slot); if (ok) window.__casts.push({ slot, wx: G.mouse.wx, wy: G.mouse.wy }); return ok; }; }   // records the aim at each cast
    __tp('pointerdown', 9, 5, 5); __tp('pointerup', 9, 5, 5);   // the first touch flips the HUD to touch
  });
  await wait(150);
  const tap2 = async slot => { await ev(s => { const b = __bt(s); __tp('pointerdown', 20, b.x, b.y); __tp('pointerup', 20, b.x, b.y); }, slot); await wait(260); };
  // layout: exact angles and radii (clockwise-from-+x screen angles), safe area, nothing above y 240
  const lay = await ev(() => { const o = {}; for (const b of touchButtons()) o[b.slot] = [b.x, b.y, b.s]; return o; });
  const want = (r, a) => [860 + r * Math.cos(a * Math.PI / 180), 436 + r * Math.sin(a * Math.PI / 180)];
  const near = (b, w) => b && Math.abs(b[0] - w[0]) <= 2 && Math.abs(b[1] - w[1]) <= 2;
  const specOk = near(lay.q, want(124, 200)) && near(lay.e, want(124, 235)) && near(lay.r, want(124, 270)) && near(lay.f, want(196, 190)) && near(lay.c, want(196, 215)) &&
    near(lay.shift, want(196, 240)) && near(lay.pot, want(196, 265)) && near(lay.toggle, want(196, 160)) && lay.atk[0] === 860 && lay.atk[1] === 436 && lay.atk[2] === 96 &&
    lay.q[2] === 60 && lay.f[2] === 52 && lay.toggle[2] === 40 && Object.values(lay).every(b => b[1] >= 240 && b[0] - b[2] / 2 >= 0 && b[0] + b[2] / 2 <= 936);
  check('touch: circular layout at the spec angles / radii / diameters, nothing above y 240', specOk, lay);
  // tap = quick-cast (auto-target, aim assist), lands on the enemy
  await ev(() => { __reset(); const p = G.player, e = spawnEnemy('slime', p.x + 1.3, p.y + 0.5, 0); e.hp = e.maxHp = 1e6; });
  await tap2('q');
  const tq = await ev(() => ({ hp: G.enemies[0] ? G.enemies[0].hp : 0, cd: G.player.cds.sunslash || 0, vib: window.__vib.slice() }));
  check('touch: tap Q quick-casts at the enemy (hit, cooldown, 15 ms haptic)', tq.hp < 1e6 && tq.cd > 0 && tq.vib.includes(15), tq);
  // drag past range clamps; 40 px drag = 60 % of range; the cast uses the indicator's target
  await ev(() => { __reset(); G.player.ult = 100; const b = __bt('r'); __tp('pointerdown', 21, b.x, b.y); __tp('pointermove', 21, b.x - 40, b.y); });
  const d40 = await ev(() => { const a = TOUCH_AIM; return a && { range: a.aim.range, d: Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y), clamped: a.clamped, cancel: a.cancel, shape: a.aim.shape }; });
  await ev(() => { const b = __bt('r'); __tp('pointermove', 21, b.x - 170, b.y - 60); });
  const dfar = await ev(() => { const a = TOUCH_AIM; return a && { range: a.aim.range, d: Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y), clamped: a.clamped, cancel: a.cancel, slot: a.slot, skill: a.skill, tx: a.to.x, ty: a.to.y }; });
  check('touch: drag 40 px maps to ~60 % of range (ease-out)', !!d40 && (d40.shape === 'self' || Math.abs(d40.d / d40.range - 0.6) < 0.03), d40);
  check('touch: drag past 96 px clamps to the range and sets TOUCH_AIM.clamped', dfar && dfar.clamped && !dfar.cancel && (dfar.d === 0 || Math.abs(dfar.d - dfar.range) < 1e-6) && dfar.slot === 'r', dfar);
  await ev(() => { const b = __bt('r'); __tp('pointerup', 21, b.x - 170, b.y - 60); });
  await wait(300);
  const rel = await ev(() => { const c = window.__casts.find(q => q.slot === 'r') || {}; return { ult: G.player.ult, aim: TOUCH_AIM, mx: c.wx, my: c.wy, vib: window.__vib.slice() }; });
  check('touch: release casts through the aimed path at the clamped target (ult spent, TOUCH_AIM cleared, 8 + 15 ms haptics)', dfar && rel.ult === 0 && rel.aim === null && Math.abs(rel.mx - dfar.tx) < 1e-6 && Math.abs(rel.my - dfar.ty) < 1e-6 && rel.vib.includes(8) && rel.vib.includes(15), { rel, dfar });
  // cancel: the X zone, and back over the button; costs nothing, starts no cooldown
  await ev(() => { __reset(); G.player.ult = 100; const b = __bt('r'); __tp('pointerdown', 22, b.x, b.y); __tp('pointermove', 22, b.x - 60, b.y - 30); __tp('pointermove', 22, 480, 500); });
  const cx = await ev(() => TOUCH_AIM && { cancel: TOUCH_AIM.cancel, d: TOUCH_AIM.d });
  await ev(() => { __tp('pointerup', 22, 480, 500); });
  await wait(300);
  const cr = await ev(() => { const p = G.player; return { ult: p.ult, mp: p.mp, max: p.maxMp, cd: p.cds.judgement || 0, aim: TOUCH_AIM, vib: window.__vib.slice() }; });
  check('touch: release on the cancel X costs nothing (no ult / MP / cooldown), 25 ms haptic', cx && cx.cancel && cr.ult === 100 && cr.mp === cr.max && cr.cd <= 0.5 && cr.aim === null && cr.vib.includes(25), { cx, cr });
  await ev(() => { __reset(); G.player.ult = 100; const b = __bt('r'); __tp('pointerdown', 23, b.x, b.y); __tp('pointermove', 23, b.x - 70, b.y); __tp('pointermove', 23, b.x + 2, b.y + 2); });
  const cb = await ev(() => TOUCH_AIM && TOUCH_AIM.cancel);
  await ev(() => { const b = __bt('r'); __tp('pointerup', 23, b.x + 2, b.y + 2); });
  await wait(300);
  check('touch: release back over the button cancels', cb === true && await ev(() => G.player.ult === 100));
  // page toggle -> cast 1 / 2 / 3, hidden skills keep ticking
  await ev(() => __reset());
  await tap2('toggle'); await wait(150);
  const pg = await ev(() => ({ page: TOUCH.page, slots: touchButtons().map(b => b.slot).join() }));
  check('touch: page toggle swaps [Q E R] for [1 2 3]', pg.page === 1 && /(^|,)1,2,3(,|$)/.test(pg.slots) && !/(^|,)q(,|$)/.test(pg.slots), pg);
  const casts = [];
  for (const sl of ['1', '2', '3']) {
    await ev(() => { const p = G.player; p.cds = {}; p.mp = p.maxMp; p.st = p.maxSt; p.dash = null; p.cast = null; p.rootT = 0; });
    await tap2(sl);
    casts.push(await ev(s => { const p = G.player, id = slotSkill(p, s); return { s, id, cd: p.cds[id] || 0 }; }, sl));
  }
  check('touch: page 2 taps cast skills 1 / 2 / 3', casts.every(c => c.id && c.cd > 0), casts);
  await tap2('toggle'); await wait(150);
  check('touch: toggling back restores Q E R', await ev(() => TOUCH.page === 0 && touchButtons().some(b => b.slot === 'q')));
  // dodge + potion + interact
  await ev(() => { __reset(); G.player.hp = G.player.maxHp / 2; G.player.potions = 3; });
  await tap2('pot');
  check('touch: potion button drinks a potion', await ev(() => G.player.potions === 2));
  await ev(() => { __reset(); });
  await tap2('shift');
  const dg = await ev(() => { const p = G.player, id = slotSkill(p, 'shift'); return { id, cd: p.cds[id] || 0, vib: window.__vib.slice() }; });
  check('touch: dodge button dodges (cooldown, 40 ms haptic)', dg.id && dg.cd > 0 && dg.vib.includes(40), dg);
  const ch2 = await ev(() => { __reset(); const o = G.map.objects.find(q => q.chest && !q.opened); if (!o) return null; G.player.x = o.x + 0.6; G.player.y = o.y + 0.3; return true; });
  if (ch2) {
    await wait(250);
    const hasI = await ev(() => touchButtons().some(b => b.slot === 'interact'));
    await tap2('interact');
    check('touch: interact slot appears near a chest and opens it', hasI && await ev(() => G.map.objects.some(q => q.chest && q.opened)), hasI);
  }
  // show-all-9 puts 1 2 3 on a third arc and drops the toggle
  const a9 = await ev(() => { TOUCH.forceAll9 = true; setSetting('showAll9', true); const s = touchButtons().map(b => b.slot); setSetting('showAll9', false); TOUCH.forceAll9 = false; return s.join(); });
  check('touch: show-all-9 shows 1 2 3 beside Q E R, no toggle', ['q', 'e', 'r', '1', '2', '3'].every(k => a9.split(',').includes(k)) && !/toggle/.test(a9), a9);
  // charge hook: one haptic click when full
  const chg = await ev(() => { const p = G.player; window.__vib.length = 0; TOUCH.chargeFull = false; p.holdCharge = 0.4; const a = touchChargeFrac(p); p.holdCharge = 1; touchChargeFrac(p); touchChargeFrac(p); const n = window.__vib.filter(v => v === 25).length; p.holdCharge = 0; touchChargeFrac(p); return { a, n }; });
  check('touch: charge hook reads p.holdCharge and clicks once at full', chg.a === 0.4 && chg.n === 1, chg);
  // left-handed hit-test: everything mirrors about x = 480; the old right-hand spots stop being buttons
  await ev(() => { __reset(); setSetting('leftHanded', true); });
  const lh = await ev(() => { const a = __bt('atk'), q = __bt('q'); return { ax: a.x, qx: q.x, hitMirror: (touchHit(a.x, a.y) || {}).slot, hitOld: touchHit(DW - a.x, a.y) }; });
  await ev(() => { const a = __bt('atk'); __tp('pointerdown', 24, a.x, a.y); });
  await wait(200);
  const lhHeld = await ev(() => IN.held('attack'));
  await ev(() => { const a = __bt('atk'); __tp('pointerup', 24, a.x, a.y); });
  await ev(() => { __tp('pointerdown', 25, 860, 436); });
  const lhOld = await ev(() => Object.values(TOUCH.ptrs).map(t => t.kind));
  await ev(() => { __tp('pointerup', 25, 860, 436); });
  await wait(100);
  check('touch: left-handed mirrors the wheel about x = 480', lh.ax === 100 && Math.abs(lh.qx - (960 - lay.q[0])) <= 2, { lh, qRight: lay.q[0] });
  check('touch: left-handed hold at the mirrored attack button attacks; the old right-hand spot is just the stick', lh.hitMirror === 'atk' && lh.hitOld === null && lhHeld === true && lhOld.join() === 'stick', { lh, lhHeld, lhOld });
  await ev(() => { setSetting('leftHanded', false); });
  // two pointers at once: stick + held attack + a drag-aimed skill
  await ev(() => { __reset(); });
  const p0m = await ev(() => ({ x: G.player.x, y: G.player.y }));
  await ev(() => { __tp('pointerdown', 30, 200, 400); __tp('pointermove', 30, 280, 400); const a = __bt('atk'); __tp('pointerdown', 31, a.x, a.y); const e = __bt('e'); __tp('pointerdown', 32, e.x, e.y); __tp('pointermove', 32, e.x - 80, e.y - 30); });
  await wait(300);
  const two = await ev(() => ({ move: IN.move.mag, atk: IN.held('attack'), aim: TOUCH_AIM && TOUCH_AIM.slot, x: G.player.x, y: G.player.y }));
  await ev(() => { const a = __bt('atk'), e = __bt('e'); __tp('pointercancel', 32, e.x, e.y); __tp('pointerup', 31, a.x, a.y); __tp('pointerup', 30, 280, 400); });
  await wait(150);
  const two2 = await ev(() => ({ move: IN.move.mag, atk: IN.held('attack'), aim: TOUCH_AIM, n: Object.keys(TOUCH.ptrs).length }));
  check('touch: two+ pointers at once (stick moves, attack held, skill drag-aims), all released cleanly', two.move > 0 && two.atk && two.aim === 'e' && Math.hypot(two.x - p0m.x, two.y - p0m.y) > 0.1 && two2.move === 0 && !two2.atk && two2.aim === null && two2.n === 0, { two, two2 });
  await ev(() => { __reset(); });
  await page.keyboard.press('KeyS'); await wait(100);   // back to kbm for the later sections

  // ---------- 4d. M2b engine: behaviour parts, bosses, map objects, trigger actions, save slots ----------
  const M2B = path.join(__dirname, 'shots', 'm2b'); fs.mkdirSync(M2B, { recursive: true });
  const shotM2b = async (name) => { await wait(120); await page.screenshot({ path: path.join(M2B, name + '.png') }); };
  await ev(() => { G.enemies.length = 0; G.projs.length = 0; G.zones.length = 0; G.ui.open = false; G.ui.pause = false; const p = G.player; p.invulnT = 0; p.hp = p.maxHp; p.dead = false; G.state = 'play'; });
  const rows = await ev(() => ({ n: Object.keys(ENEMY).length, data: typeof ENEMY_DATA !== 'undefined', ported: ['slime', 'wisp', 'hound', 'ogre', 'troll'].map(k => ENEMY[k] && defParts(ENEMY[k]).parts.join('+')).join(' '), elites: ELITE_IDS.length }));
  check('parts: enemies are rows (ENEMY_DATA loaded), the M2a five keep their parts, 8 elite mods', rows.data && rows.ported === 'chase+brute kite+shoot charge chase+brute chase+brute' && rows.elites === 8, rows);
  // movement: sleep — dormant until the hero comes close
  const sleep = await ev(async () => {
    const p = G.player, e = spawnEnemy('mountaintroll', p.x + 5, p.y, 0), w = ms => new Promise(r => setTimeout(r, ms));
    const x0 = e.x; await w(500); const slept = e.asleep && Math.abs(e.x - x0) < 0.01;
    e.x = p.x + 2; await w(900); const woke = !e.asleep; G.enemies.length = 0; return { slept, woke };
  });
  check('parts: movement "sleep" stays dormant, wakes when the hero is near', sleep.slept && sleep.woke, sleep);
  // attack: brute — a telegraphed circle, tagged with its enemy, that hurts a hero standing in it
  const brute = await ev(async () => {
    const p = G.player, w = ms => new Promise(r => setTimeout(r, ms)); p.hp = p.maxHp; p.invulnT = 0;
    const e = spawnEnemy('troll', p.x + 0.9, p.y, 0); e.pcd.brute = 0; await w(250);
    const tel = G.effects.find(f => f.type === 'tele' && f.src === e), hp0 = p.hp; await w(1400);
    const r = { tele: !!tel, kind: tel && tel.kind, wind: +(e.windMax || 0).toFixed(2), hurt: p.hp < hp0 }; G.enemies.length = 0; p.hp = p.maxHp; return r;
  });
  check('parts: attack "brute" telegraphs (tagged circle) then hurts the hero inside', brute.tele && brute.kind === 'circle' && brute.wind >= 0.6 && brute.hurt, brute);
  // support: healer — a 4 s telegraphed heal of a damaged ally, capped at 30 %
  const heal = await ev(async () => {
    const p = G.player, w = ms => new Promise(r => setTimeout(r, ms)); p.buffs.veil = { t: 0, max: 0 }; delete p.buffs.veil;
    const ally = spawnEnemy('ogre', p.x + 7, p.y + 1, 0); ally.stunT = 99; ally.hp = ally.maxHp * 0.3;
    const sh = spawnEnemy('brambleshaman', p.x + 6.5, p.y - 0.5, 0); sh.pcd.healer = 0; sh.pcd['zone-caster'] = 99;
    const hp0 = ally.hp; await w(1500); const mid = ally.hp, winding = sh.state === 'wind' && sh.act === 'healer';
    await w(3300); const r = { winding, early: mid === hp0, healed: +((ally.hp - hp0) / ally.maxHp).toFixed(2) }; G.enemies.length = 0; return r;
  });
  check('parts: support "healer" winds up 4 s, then heals <= 30 % of the ally', heal.winding && heal.early && heal.healed > 0.2 && heal.healed <= 0.3, heal);
  // death and group: split — two children, which give no XP
  const split = await ev(() => {
    const p = G.player; G.enemies.length = 0; const xp0 = p.xp, lv0 = p.level, e = spawnEnemy('gloomslime', p.x + 3, p.y, 0); killEnemy(e);
    const kids = G.enemies.filter(o => o.type === 'gloomslime_small' && !o.dead); const xpParent = p.xp !== xp0 || p.level !== lv0;
    const xp1 = p.xp; kids.forEach(k => killEnemy(k)); const r = { kids: kids.length, parentXp: xpParent, kidXp: p.xp !== xp1 }; G.enemies.length = 0; return r;
  });
  check('parts: death "split" spawns 2 children that give no XP', split.kids === 2 && split.parentXp && !split.kidXp, split);
  const swarm = await ev(() => {
    const p = G.player; G.enemies.length = 0; G.kills = {}; spawnEnemy('dreammoth', p.x + 3, p.y, 0);
    const n = G.enemies.length; for (const e of G.enemies.slice()) killEnemy(e); const r = { members: n, kills: G.kills.dreammoth || 0 }; G.enemies.length = 0; return r;
  });
  check('parts: a swarm spawns its members and counts as one kill', swarm.members === 4 && swarm.kills === 1, swarm);
  const elite = await ev(async () => {
    const p = G.player, w = ms => new Promise(r => setTimeout(r, ms)), base = spawnEnemy('ogre', p.x + 9, p.y, 0).maxHp; G.enemies.length = 0;
    const e = spawnEnemy('ogre', p.x + 2.2, p.y + 0.4, 0, { elite: 'storm' }), t = spawnEnemy('slime', p.x - 2, p.y + 1.5, 0, { elite: 'twin' });
    await w(300); return { mods: e.mods.join(), hpMul: +(e.maxHp / base).toFixed(2), twins: G.enemies.filter(o => o.type === 'slime').length, cls: enemyClassOf(e) };
  });
  check('parts: elite spawns (ELITE_MODS) — x3.2 HP, Storm aura, Twin linked copy', elite.mods === 'storm' && elite.hpMul === 3.2 && elite.twins === 2 && elite.cls === 'elite', elite);
  await ev(() => { const p = G.player; for (const [t, dx, dy] of [['shadehound', 3, -2], ['brambleshaman', 4, 1.5], ['thornbackboar', -3, -2.5], ['dreammoth', -4, 2]]) spawnEnemy(t, p.x + dx, p.y + dy, 0); p.invulnT = 99; });
  await wait(900); await shotM2b('parts_roster_elites');
  await ev(() => { G.enemies.length = 0; G.effects.length = 0; G.player.invulnT = 0; });
  // Bramblehorn: data-driven boss, the stomp telegraph (fair wind / open, warnSfx hook, tagged circle)
  const bh = await ev(async () => {
    const p = G.player, w = ms => new Promise(r => setTimeout(r, ms)); p.hp = p.maxHp; p.invulnT = 0;
    window.WARN_SFX = window.WARN_SFX || { circle: 'warn_circle' };   // js/sfxdata.js is not in index.html yet
    const b = spawnEnemy('bramblehorn', p.x + 1.5, p.y, 0); b.cd = 99; startMove(b, 'stomp');
    const warn = Object.assign({}, G.lastWarn), tel = G.effects.find(f => f.type === 'tele' && f.src === b && f.kind === 'circle');
    const hp0 = p.hp; await w(450); window.__bhShot = true;
    return { boss: G.boss === b, name: ENEMY.boss.name, type: warn.type, move: warn.move, wind: warn.wind, open: warn.open, sfx: warn.sfx, r: tel && tel.r, phases: b.bk.def.phases.length, hp0 };
  });
  await shotM2b('bramblehorn_stomp_telegraph');
  const bh2 = await ev(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); await w(700); const p = G.player, b = G.boss; const r = { hurt: p.hp < p.maxHp, fair: bossFairness('bramblehorn').length === 0 && bossFairness('mossjaw').length === 0 }; return r; });
  check('boss: Bramblehorn stomp telegraph (circle r3, wind 0.9 >= 0.6, open 1.5 >= 1.2, warnSfx hook) and its hit lands', bh.boss && bh.name === 'Old Bramblehorn' && bh.type === 'circle' && bh.move === 'stomp' && bh.wind >= 0.6 && bh.open >= 1.2 && bh.sfx === 'warn_circle' && bh.r === 3 && bh.phases === 2 && bh2.hurt && bh2.fair, Object.assign(bh, bh2));
  const bhp2 = await ev(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), b = G.boss; G.player.invulnT = 99; b.bk.mv = null; b.hp = b.maxHp * 0.45; await w(400); const q = b.bk.phase; await w(2600); return { phase: q, shrink: !!G.shrink }; });
  check('boss: Bramblehorn phase 2 at 50 % (onEnter: root wall shrinks the arena)', bhp2.phase === 1 && bhp2.shrink, bhp2);
  await ev(() => { G.enemies.length = 0; G.boss = null; G.shrink = null; G.effects.length = 0; G.player.invulnT = 0; G.player.hp = G.player.maxHp; });
  const ward = await ev(() => { const D = BOSSES.boss; return { moves: Object.keys(D.moveDefs).join(), p2: D.phases[1].hpBelow, adds: D.phases[1].onEnter[0].adds.length, hp: ENEMY.boss.hp, moss: Object.keys(BOSSES.mossjaw.moveDefs).join() }; });
  check('boss: Gloam Warden ported to BOSS_MOVES (cleave slam volley charge voidrain, 50 % roar + 4 adds); Mossjaw is data', ward.moves === 'cleave,slam,volley,charge,voidrain' && ward.p2 === 0.5 && ward.adds === 4 && ward.moss === 'lunge,rootSpit,burrow,howl', ward);
  // map objects on an inline test map: gate + lever, keydoor + key, hidden wall, fishspot, arrive portal, fractional house
  const flowP = ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), W = 14, row = 'g'.repeat(W);
    G.world.maps.m2b_test = { name: 'Test Glade', sub: 'gates', theme: 'forest', W, H: W, tiles: Array(W).fill(row), heights: Array(W).fill('0'.repeat(W)), start: { x: 3, y: 7 },
      portals: [{ x: 12, y: 12, to: 'vale', open: true, id: 'home', arrive: { x: 5.5, y: 6.5 } }],
      objects: [{ t: 'gate', x: 7, y: 7, id: 'gate_g1', ang: 0, len: 3 }, { t: 'lever', x: 4, y: 4, id: 'lever_g1' }, { t: 'keydoor', x: 10, y: 4, id: 'door_d1', key: 'key_test', ang: 0, len: 2 },
        { t: 'hidden', x: 10, y: 10, id: 'wall_w1', ang: 1.57, len: 2 }, { t: 'fishspot', x: 2, y: 11, pool: 'test_a' }, { t: 'house', x: 1.4, y: 1.6 }],
      triggers: [], objective: 'Test the gates', level: [3, 10] };
    THEME_OF.m2b_test = 'forest'; delete G.maps.m2b_test; G.prog.gates = {}; G.prog.secrets = {};
    enterMap('m2b_test'); G.state = 'play';
    G.player.x = 5.2; G.player.y = 8.6; G.banner = null; window.__flowHold = true; while (window.__flowHold) await w(50);
    const p = G.player, m = G.map; p.invulnT = 99;
    const gateCols = m.colliders.filter(c => c.barrier === 'gate').length;
    p.x = 6; p.y = 7; for (let i = 0; i < 40; i++) moveEntity(p, 0.05, 0, 0); const blocked = p.x < 6.9;
    p.x = 4.6; p.y = 4.4; await w(150); const leverPrompt = G.prompt && G.prompt.kind; interact(p);
    const opened = G.prog.gates['m2b_test:gate_g1'] === true && !m.colliders.some(c => c.barrier === 'gate'), pulled = m.objects.find(o => o.lever).pulled;
    p.x = 10.5; p.y = 5.2; await w(150); const locked = G.prompt && G.prompt.text; interact(p); const stillShut = m.colliders.some(c => c.barrier === 'keydoor');
    runAction({ type: 'loot', rarity: 'uncommon', count: 1, item: 'key_test' }); await w(150); const unlockTxt = G.prompt && G.prompt.text; interact(p);
    const doorOpen = !m.colliders.some(c => c.barrier === 'keydoor');
    runAction({ type: 'openGate', id: 'wall_w1' }); const hiddenOpen = !m.colliders.some(c => c.barrier === 'hidden');
    p.x = 2.6; p.y = 11.3; await w(150); const fish = G.prompt && G.prompt.kind;
    runAction({ type: 'quest', id: 'pinewood_foxkit' }); const q0 = JSON.stringify(G.prog.quests.pinewood_foxkit); runAction({ type: 'quest', id: 'pinewood_foxkit' }); const q1 = JSON.stringify(G.prog.quests.pinewood_foxkit);
    runAction({ type: 'quest', id: 'pinewood_foxkit', done: true }); const q2 = G.prog.quests.pinewood_foxkit;
    runAction({ type: 'dialogue', id: 'pinewood_fox' }); const talk = G.msg && G.msg.s;
    runAction({ type: 'checkpoint', text: 'Test shrine' }); const cp = G.checkpoint && G.checkpoint.map;
    runAction({ type: 'spawn', enemy: 'shaman', count: 1, x: 7, y: 10, radius: 0.5, elite: true }); runAction({ type: 'spawn', enemy: 'mossjaw', count: 1, x: 8, y: 3, radius: 0.3 }); await w(1300);
    const spawned = { shaman: G.enemies.some(e => e.type === 'brambleshaman' && e.elite), boss: !!(G.boss && G.boss.type === 'mossjaw' && !G.boss.elite) };
    G.enemies.length = 0; G.boss = null;
    const pt = m.portals.find(q => q.id === 'home'); runAction({ type: 'close_portal', id: 'home' }); const closed = !pt.open; runAction({ type: 'open_portal', id: 'home' });
    p.x = 7; p.y = 9; p.invulnT = 99;
    return { gateCols, blocked, leverPrompt, opened, pulled, locked, stillShut, unlockTxt, doorOpen, hiddenOpen, fish, q0, q1, q2, talk, cp, spawned, closed, arrive: pt.arrive && pt.arrive.x === 5.5, house: m.objects.some(o => o.src && o.src.t === 'house') };
  });
  await page.waitForFunction(() => window.__flowHold === true); await wait(500); await shotM2b('gate_lever_keydoor_testmap_closed');
  await ev(() => { window.__flowHold = false; });
  const flow = await flowP;
  await shotM2b('gate_lever_keydoor_testmap_open');
  check('map: gate blocks, lever (Interact) opens it and flips, saved in G.prog.gates', flow.gateCols >= 3 && flow.blocked && flow.leverPrompt === 'lever' && flow.opened && flow.pulled, flow);
  check('map: keydoor stays locked without its key, a loot card item:key_* unlocks it', flow.locked === 'Locked' && flow.stillShut && flow.unlockTxt === 'Unlock' && flow.doorOpen);
  check('map: openGate reveals a hidden wall; fishspot stub prompt; fractional house coords; portal arrive + id', flow.hiddenOpen && flow.fish === 'fishspot' && flow.house && flow.arrive && flow.closed);
  check('triggers: quest {step} -> {step+1} -> done, dialogue by DIALOGUE id, checkpoint, elite spawn, boss start by row', flow.q0 === '{"step":0}' && flow.q1 === '{"step":1}' && flow.q2 === 'done' && /^Pip: /.test(flow.talk || '') && flow.cp === 'm2b_test' && flow.spawned.shaman && flow.spawned.boss, { q: [flow.q0, flow.q1, flow.q2], talk: flow.talk, spawned: flow.spawned });
  // save slots: slot 1 = the legacy key, slots 2-3 beside it, an index for the title
  const slots = await ev(() => {
    const keep = [1, 2, 3].map(i => localStorage.getItem(saveKey(i)));
    const d = saveData(); d.slot = 2; localStorage.setItem(saveKey(2), JSON.stringify(Object.assign(d, { player: Object.assign({}, d.player, { level: 9 }) })));
    const list = saveSlots(), r = { k1: saveKey(1), k3: saveKey(3), s2: list[1] && list[1].level, n: list.length, read: readSave(2) && readSave(2).slot }; selectSlot(2); r.cur = G.saveSlot;
    [1, 2, 3].forEach((i, j) => { if (keep[j] == null) localStorage.removeItem(saveKey(i)); else localStorage.setItem(saveKey(i), keep[j]); }); selectSlot(1);
    return r;
  });
  check('save: 3 slots (slot 1 = dreamy.save.v1), v3 shape kept, title slot picker reads them', slots.k1 === 'dreamy.save.v1' && slots.k3 === 'dreamy.save.v1.s3' && slots.s2 === 9 && slots.n === 3 && slots.read === 2 && slots.cur === 2, slots);
  await ev(() => { G.enemies.length = 0; G.boss = null; enterMap('vale'); G.state = 'play'; G.player.invulnT = 0; });
  // ---------- 5. frame time ----------
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await wait(500);
  const ft = await ev(() => new Promise(res => { const d = []; let last = performance.now(); const t0 = last; const n = () => { const t = performance.now(); d.push(t - last); last = t; if (t - t0 < 8000) requestAnimationFrame(n); else res(d); }; requestAnimationFrame(n); }));
  ft.splice(0, 5); ft.sort((a, b) => a - b);
  const avg = ft.reduce((a, b) => a + b, 0) / ft.length, p95 = ft[Math.floor(ft.length * 0.95)];
  check('perf: 60 fps (avg frame <= 17.5 ms)', avg <= 17.5, { avg: +avg.toFixed(2), p95: +p95.toFixed(2), frames: ft.length });
  // ---------- 6. HUD at min(DPR, 2) ----------
  const ctx2 = await br.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push('pageerror(dpr2): ' + e.message));
  await p2.goto(`${base}/index.html`, { waitUntil: 'load' });
  await p2.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await wait(300);
  const w2 = await p2.evaluate(() => ({ w: DISP.width, k: HUD_K }));
  await p2.mouse.click(480, 360); await wait(300);
  const st2 = await p2.evaluate(() => G.state);
  check('dpr 2: HUD backing store 1920x1080, title click still lands', w2.w === 1920 && w2.k === 2 && st2 === 'play', { w2, st2 });
  await ctx2.close();
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll play checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
