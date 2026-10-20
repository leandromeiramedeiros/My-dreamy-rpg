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
//  4e. big maps (§25) on a synthetic 112x112 zone: chunk LRU, spatial grid, light budget, enemy sleep / wake, the warp action,
//      a keyed + a sealed warpdoor, shrine warp blocked while an enemy is awake, inline arena reset, fog + sections in the save,
//      HUD minimap window + full-map screen; a ?phone=1 page checks the phone caps (256 px chunks, 12 resident, 16 awake)
//  5. frame-time sample (avg / p95)
// Usage: node tools/play.js     (exit 1 on any failed check or page error)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { synthMap } = require('./engine-tour.js');   // the synthetic 112x112 zone (DESIGN §25 checks)
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
  // ---------- 4d'. ground aim indicators (render.js drawAimIndicator, AIM_STYLE / TELE_STYLE) + hold-to-aim ----------
  const M2B_AIM = path.join(__dirname, 'shots', 'm2b'); fs.mkdirSync(M2B_AIM, { recursive: true });
  const aimShot = async name => { await wait(150); await page.screenshot({ path: path.join(M2B_AIM, name + '.png') }); };
  const dragAim = async (slot, dx, dy) => { await ev(([s, dx, dy]) => { const b = __bt(s); __tp('pointerdown', 40, b.x, b.y); __tp('pointermove', 40, b.x + dx * 0.3, b.y + dy * 0.3); __tp('pointermove', 40, b.x + dx, b.y + dy); }, [slot, dx, dy]); await wait(250); };
  const endAim = async () => { await ev(() => { __tp('pointermove', 40, 480, 500); __tp('pointerup', 40, 480, 500); }); await wait(200); };   // released on the X: cancelled
  await ev(() => { __tp('pointerdown', 9, 5, 5); __tp('pointerup', 9, 5, 5); __reset(); G.banner = null; const p = G.player; spawnEnemy('slime', p.x + 2.4, p.y + 1, 0).hp = 1e6; });
  await dragAim('q', -60, -25);
  const cone = await ev(() => { const a = currentAim(); return a && { shape: a.aim.shape, cx: a.from.x === G.player.x && a.from.y === G.player.y, shown: G.t - AIMV.lastShown < 0.2 }; });
  check('aim: touch drag draws the cone indicator, its range ellipse centred on the hero', cone && cone.shape === 'cone' && cone.cx && cone.shown, cone);
  await aimShot('touch-aim-cone'); await endAim();
  await ev(() => { __reset(); G.player.ult = 100; }); await dragAim('r', -170, -90);
  const circ = await ev(() => { const a = currentAim(); return a && { shape: a.aim.shape, clamped: a.clamped, d: +Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y).toFixed(2), range: a.aim.range }; });
  check('aim: circle reticle clamped to the range circle (clamped flag, |to-from| = range)', circ && circ.shape === 'circle' && circ.clamped && Math.abs(circ.d - circ.range) < 1e-6, circ);
  await aimShot('touch-aim-circle-clamped'); await endAim();
  // line: equip the Moonbow ultimate (moonbeam)
  await ev(() => { __reset(); const p = G.player; p.equip.weapon = makeItem('moonbow', 'rare', p.level, { sockets: 0 }); recalcStats(p); p.wsk.moonbow.r = 'moonbeam'; p.ult = 100; });
  await dragAim('r', -120, -40);
  const line = await ev(() => { const a = currentAim(); return a && a.aim.shape; });
  check('aim: line indicator (Moonbeam)', line === 'line', line);
  await aimShot('touch-aim-line'); await endAim();
  // vs a boss telegraph: player indicator stays thin / cool, its fill drops to 10 % under the enemy circle
  await ev(() => { const p = G.player; __reset(); p.equip.weapon = makeItem('rustyblade', 'rare', p.level, { sockets: 0 }); recalcStats(p); p.invulnT = 99; p.ult = 100;
    const b = spawnEnemy('bramblehorn', p.x + 3.2, p.y - 0.6, 0); b.cd = 99; startMove(b, 'stomp'); });
  await dragAim('r', 14, 6);
  const ov = await ev(() => { const a = currentAim(), b = G.boss; return { boss: !!b, tele: G.effects.some(f => f.type === 'tele' && f.src === b), covered: a ? teleCovers(a.to.x, a.to.y) : null, AIM: AIM_STYLE.fillCovered, TELE: TELE_STYLE.lw > AIM_STYLE.lw }; });
  await aimShot('touch-vs-boss-telegraph'); await endAim();
  check('aim: TELE_STYLE thicker than AIM_STYLE; a reticle under an enemy telegraph drops to 10 % fill', ov.boss && ov.tele && ov.TELE && ov.AIM === 0.1 && ov.covered === true, ov);
  await ev(() => { G.enemies.length = 0; G.boss = null; G.effects.length = 0; __reset(); G.player.invulnT = 0; });
  // quick-cast (tap) flashes the shape for one frame
  await ev(() => { const p = G.player; spawnEnemy('slime', p.x + 1.3, p.y + 0.5, 0).hp = 1e6; AIMV.lastShown = -9; window.__flash = 0; window.__af = aimFlash; aimFlash = (id, slot) => { const n = G.effects.length; window.__af(id, slot); if (G.effects.slice(n).some(f => f.type === 'aimflash')) window.__flash++; }; });
  await tap2('q');
  const fl = await ev(() => { aimFlash = window.__af; return window.__flash; });
  check('aim: a tap quick-cast shows a 1-frame flash of the shape at the target', fl >= 1, fl);
  await ev(() => { __reset(); });
  // desktop hold-to-aim: hold Q -> indicator after 0.15 s, cast on release; a quick press casts at once
  await page.keyboard.press('KeyS'); await wait(120);
  const hm = await ev(() => { setSetting('groundIndicators', 'hold'); const p = G.player; p.cds = {}; p.mp = p.maxMp; G.enemies.length = 0; spawnEnemy('slime', p.x + 1.4, p.y + 0.4, 0).hp = 1e6; return { mode: IN.aimMode(), dev: IN.device }; });
  await page.keyboard.down('KeyQ'); await wait(80);
  const early = await ev(() => ({ show: !!(IN.aimHold && IN.aimHold.show), cd: G.player.cds.sunslash || 0 }));
  await wait(320);
  const held = await ev(() => ({ show: !!(IN.aimHold && IN.aimHold.show), cd: G.player.cds.sunslash || 0, drawn: G.t - AIMV.lastShown < 0.3 }));
  await aimShot('aim-on-hold');
  await page.keyboard.up('KeyQ'); await wait(150);
  const after = await ev(() => ({ cd: G.player.cds.sunslash || 0, hold: IN.aimHold }));
  await ev(() => { G.player.cds = {}; }); await page.keyboard.press('KeyQ'); await wait(120);
  const quick = await ev(() => G.player.cds.sunslash || 0);
  await ev(() => setSetting('groundIndicators', 'off')); await ev(() => { G.player.cds = {}; }); await page.keyboard.down('KeyQ'); await wait(60);
  const off = await ev(() => ({ cd: G.player.cds.sunslash || 0, hold: IN.aimHold })); await page.keyboard.up('KeyQ');
  const auto = await ev(() => { setSetting('groundIndicators', 'auto'); return IN.aimMode(); });
  check('aim: desktop hold-to-aim (explicit "hold") — indicator after 0.15 s, cast on release; quick press casts; "off" and the kbm default "auto" cast on press', hm.mode === 'hold' && !early.show && early.cd === 0 && held.show && held.drawn && held.cd === 0 && after.cd > 0 && after.hold === null && quick > 0 && off.cd > 0 && off.hold === null && auto === 'off', { hm, early, held, after, quick, off, auto });
  await ev(() => { G.enemies.length = 0; });
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
  // ---------- 4e. big maps (DESIGN §25): a synthetic 112x112 zone generated by tools/engine-tour.js synthMap ----------
  const SYN = synthMap();
  const big0 = await ev(async (rec) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    G.world.maps.synth112 = rec; THEME_OF.synth112 = rec.theme; delete G.maps.synth112; G.prog.gates = {}; G.prog.secrets = {};
    const t0 = performance.now(); enterMap('synth112'); G.state = 'play'; G.banner = null; const enterMs = performance.now() - t0;
    const m = G.map, cg = chunkGrid(m), startRes = !!chunkResident(m, chunkAt(m, isoX(m.start.x, m.start.y), isoY(m.start.x, m.start.y, tileH(m, m.start.x, m.start.y))));
    await w(300);
    return { enterMs: Math.round(enterMs), startRes, size: CHUNK.size, max: CHUNK.max, nonEmpty: cg.empty.filter(e => !e).length, sections: m.sections.map(s => s.id).join(), gutters: m.gutter.reduce((a, b) => a + (b ? 1 : 0), 0), lazyCols: m.columns.filter(c => !c.img).length > m.columns.length / 2 };
  }, SYN);
  check('bigmap: synthetic 112x112 loads chunked (start chunk built at entry, 512 px chunks, cap 24, lazy columns, gutters, 4 sections)', big0.startRes && big0.size === 512 && big0.max === 24 && big0.lazyCols && big0.gutters > 100 && big0.sections === 'main,outer,under,vault,arena', big0);
  // chunk LRU: with the cap lowered to 6, touring the 4 sections evicts (columns freed with their chunk), never a visible chunk, and standing still does not thrash
  const lru = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player, keep = CHUNK.max; CHUNK.max = 6; p.invulnT = 99;
    const ev0 = CHUNK.evicted; let maxRes = 0, visOk = true;
    for (const s of m.sections.filter(q => q.tiles)) {
      p.x = s.cx; p.y = s.cy; p.z = tileH(m, p.x, p.y); G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
      for (let k = 0; k < 40; k++) { await w(30); maxRes = Math.max(maxRes, CHUNK.cache.size); }
      const vis = chunkAt(m, camX, camY); if (!chunkResident(m, vis)) visOk = false;
    }
    const e0 = CHUNK.evicted; await w(2500); const thrash = CHUNK.evicted - e0;   // standing still: nothing is evicted (and rebuilt)
    let freed = 0, orphan = 0; const cg = chunkGrid(m);
    for (let i = 0; i < cg.nx * cg.ny; i++) { const res = !!chunkResident(m, i); for (const c of cg.cols[i]) { if (!res && !c.img) freed++; if (!res && c.img) orphan++; } }
    const r = { maxRes, evicted: CHUNK.evicted - ev0, visOk, thrash, freed, orphan, jobs: CHUNK.jobs.size };
    CHUNK.max = keep; return r;
  });
  check('chunks: LRU eviction keeps <= cap resident, the camera chunk always resident, evicted chunks free their columns, no rebuild thrash standing still', lru.maxRes <= 6 && lru.evicted > 0 && lru.visOk && lru.thrash === 0 && lru.freed > 0 && lru.orphan === 0, lru);
  // spatial grid: drawScene + movement + triggers query buckets
  const grid = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player; p.x = m.start.x; p.y = m.start.y; await w(200);
    const near = nearColliders(m, p.x, p.y, 1).length, objs = gridQuery(m, 'objs', p.x - 4, p.y - 4, p.x + 4, p.y + 4).length;
    return { near, colliders: m.colliders.length, objs, objects: m.objects.length, checked: G.trig.checked, triggers: m.triggers.length };
  });
  check('grid: 8x8-tile buckets for colliders / objects; updateTriggers tests only bucketed area cards', grid.near < grid.colliders / 10 && grid.objs < grid.objects / 10 && grid.checked < grid.triggers / 2, grid);
  // light budget: at most 40 visible lights (the hero's own light kept)
  const lb = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player, extra = [];
    for (let k = 0; k < 90; k++) extra.push({ sx: isoX(p.x, p.y) + (k % 15 - 7) * 24, sy: isoY(p.x, p.y) + ((k / 15) | 0) * 16 - 40, r: 40, col: '#ffbe73', a: 0.8 });
    m.lights.push(...extra); await w(200);
    const r = { inView: LIGHT_STATS.inView, drawn: LIGHT_STATS.drawn };
    m.lights.splice(m.lights.length - extra.length, extra.length); return r;
  });
  check('lights: at most 40 drawn when more are in view', lb.inView > 40 && lb.drawn === 40, lb);
  // enemy sleep: > 18 tiles = dormant (1 Hz heartbeat, frozen), at most 24 awake, waking resumes the same enemy
  const sl = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player; G.enemies.length = 0; p.invulnT = 999;
    const s = m.sections.find(q => q.id === 'outer'); p.x = s.cx; p.y = s.cy;
    const ring = (n, r0, r1) => { const out = []; for (let i = 0; out.length < n && i < 400; i++) { const a = i * 2.39, r = r0 + (i % 7) / 6 * (r1 - r0), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (walkable(m, x, y, tileH(m, x, y))) { const e = spawnEnemy('slime', x, y, 0); e.cd = 99; out.push(e); } } return out; };
    const near = ring(10, 3, 9), far = ring(12, 26, 34); await w(1600);
    const f0 = far[0], pos0 = [f0.x, f0.y], hb0 = f0.hbs || 0; await w(1100);
    const r = { nearAwake: near.filter(e => !e.dormant).length, farDormant: far.filter(e => e.dormant).length, frozen: f0.x === pos0[0] && f0.y === pos0[1], hb: (f0.hbs || 0) - hb0 };
    const more = ring(30, 4, 15); await w(200);
    r.awakeCap = G.enemies.filter(e => !e.dead && !e.dormant).length; r.total = G.enemies.length; r.capDormantFar = more.concat(near).filter(e => e.dormant).every(e => e._d >= Math.max(...G.enemies.filter(q => !q.dormant).map(q => q._d)) - 1e-6);
    p.x = f0.x + 2; p.y = f0.y; await w(250);
    r.woke = !f0.dormant && G.enemies.includes(f0); r.nearNowDormant = near.filter(e => e.dormant).length;
    G.enemies.length = 0; return r;
  });
  check('sleep: enemies beyond 18 tiles sleep (frozen, 1 Hz heartbeat), the near ones stay awake', sl.nearAwake === 10 && sl.farDormant === 12 && sl.frozen && sl.hb >= 1 && sl.hb <= 2, sl);
  check('sleep: at most 24 awake (the farthest sleep), waking is the same enemy resuming', sl.awakeCap === 24 && sl.capDormantFar && sl.woke && sl.nearNowDormant === 10, sl);
  // warp action: 0.4 s fade inside the map; trigger state, enemies and the map object survive
  const wa = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player; p.x = m.start.x; p.y = m.start.y; await w(150);
    G.trig.fired.banner = true; const fired0 = Object.keys(G.trig.fired).length, dummy = spawnEnemy('dummy', p.x + 2, p.y, 0);
    let peak = 0; const t0 = G.t;
    runAction({ type: 'warp', to: 'vault_mid' });
    const going = !!G.warp; while (G.warp) { peak = Math.max(peak, G.fade); await w(16); }
    const dur = G.t - t0, a = m.anchors.vault_mid;
    const r = { going, peak: +peak.toFixed(2), dur: +dur.toFixed(2), d: +dist(p.x, p.y, a.x, a.y).toFixed(2), sameMap: G.map === m, fired: Object.keys(G.trig.fired).length >= fired0, dummy: G.enemies.includes(dummy), fade: G.fade, sec: sectionAt(m, p.x, p.y).id, cam: Math.abs(G.cam.x - isoX(p.x, p.y)) < 40 };
    runAction({ type: 'warp', to: { x: m.start.x, y: m.start.y } }); while (G.warp) await w(16);
    r.xy = dist(p.x, p.y, m.start.x, m.start.y) < 0.01; r.bad = startWarp('no_such_anchor') === false;
    G.enemies.length = 0; return r;
  });
  check('warp: { type: warp, to: anchor | {x,y} } fades ~0.4 s inside the same map (no reload, triggers + enemies kept, camera snapped)', wa.going && wa.peak > 0.85 && wa.dur > 0.3 && wa.dur < 0.7 && wa.d < 0.01 && wa.sameMap && wa.fired && wa.dummy && wa.fade === 0 && wa.sec === 'vault' && wa.cam && wa.xy && wa.bad, wa);
  // keyed warp door + sealed door
  const wd = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player, d = m.objects.find(o => o.warpdoor && o.gid === 'door_under'), up = m.anchors.door_up;
    p.x = d.x + 0.6; p.y = d.y + 0.6; await w(200);
    const locked = G.prompt && G.prompt.kind === 'warpdoor' ? G.prompt.text : null; interact(p); await w(500);
    const stayed = dist(p.x, p.y, d.x, d.y) < 2;
    runAction({ type: 'loot', rarity: 'uncommon', count: 1, item: 'key_synth' }); await w(200);
    const unlock = G.prompt && G.prompt.text; interact(p); while (G.warp) await w(16); await w(50);
    const r = { locked, stayed, unlock, arrived: dist(p.x, p.y, up.x, up.y) < 2.5, sec: sectionAt(m, p.x, p.y).id, saved: G.prog.gates['synth112:door_under'] === true };
    await w(200); r.back = G.prompt && G.prompt.text;
    const v = m.objects.find(o => o.gid === 'door_vault'); p.x = v.x + 0.6; p.y = v.y + 0.6; await w(200); r.sealed = G.prompt && G.prompt.text;
    runAction({ type: 'openGate', id: 'door_vault' }); await w(150); r.opened = G.prompt && G.prompt.text;
    return r;
  });
  check('warpdoor: keyed door stays locked without its key, unlocks with key_*, warps to its anchor (saved); open:false door is sealed until openGate', wd.locked === 'Locked' && wd.stayed && wd.unlock === 'Unlock' && wd.arrived && wd.sec === 'under' && wd.saved && wd.back === 'Climb out' && wd.sealed === 'Sealed' && wd.opened === 'Enter the vault', wd);
  await shotM2b('bigmap_warpdoor_vault');
  // shrine-to-shrine warp: from a discovered shrine to another; blocked while an enemy is awake
  const sw = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player, S = id => m.objects.find(o => o.shrineId === id);
    const s1 = S('synth_s1'), s2 = S('synth_s2'); G.enemies.length = 0;
    p.x = s2.x + 1; p.y = s2.y + 1; await w(400); p.x = s1.x + 1; p.y = s1.y + 1; await w(400);
    const found = (G.prog.shrines.synth112 || []).slice().sort().join();
    openFullMap(); const mode = G.ui.map && G.ui.map.mode, targets = shrineTargets().map(o => o.shrineId).join(); closeFullMap();
    const e = spawnEnemy('slime', p.x + 4, p.y, 0); e.cd = 99; await w(100);
    const awake = anyEnemyAwake(), blocked = shrineWarp('synth_s2') === false, msg = G.msg && G.msg.s, noWarp = !G.warp;
    G.enemies.length = 0; await w(50);
    const ok = shrineWarp('synth_s2'); while (G.warp) await w(16);
    return { found, mode, targets, awake, blocked, msg, noWarp, ok, at: +dist(p.x, p.y, s2.x, s2.y).toFixed(2), unknown: shrineWarp('synth_s3') === false };
  });
  check('shrine warp: discovered shrines listed on the map screen (shrine mode); refused while an enemy is awake; works once none is', sw.found.includes('synth_s1') && sw.found.includes('synth_s2') && sw.mode === 'shrine' && sw.targets.split(',').includes('synth_s2') && !sw.targets.split(',').includes('synth_s1') && sw.awake && sw.blocked && /awake/.test(sw.msg || '') && sw.noWarp && sw.ok && sw.at < 2.6 && sw.unknown, sw);
  // inline arena: dying mid-fight reopens the gate on respawn, the adds and broken pillars reset, the fight re-arms
  const ar = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player, tr = m.triggers.find(t => t.id === 'arena_in').when;
    // earlier tours walked through the arena: start from a fresh visit (fight not settled, gate never opened)
    G.enemies.length = 0; G.prog.trig.synth112 = []; delete G.prog.gates['synth112:arena_gate']; enterMap('synth112'); G.state = 'play';
    const s3 = m.objects.find(o => o.shrineId === 'synth_s3'); setCheckpoint(s3.x, s3.y + 1);
    p.x = tr.x; p.y = tr.y; p.invulnT = 999; await w(900);
    const gateShut = m.colliders.some(c => c.gid === 'arena_gate'), arena = G.arena && G.arena.id, adds = G.enemies.filter(e => e.arena === 'synth_arena').length;
    const pil = G.arena.pillars[0], broke = pil ? breakPillar(pil[0], pil[1]) : false, brokenType = pil ? m.type[pil[1]][pil[0]] : null;
    p.invulnT = 0; G.state = 'play'; hurtPlayer(1e9, p.x, p.y); const died = G.state === 'dead';
    respawn(); await w(150);
    const r = { gateShut, arena, adds, pillars: G.arena ? -1 : 0, broke, brokenType, died, gateOpen: !m.colliders.some(c => c.gid === 'arena_gate'), arenaAfter: G.arena, addsAfter: G.enemies.length, pillarBack: pil ? m.type[pil[1]][pil[0]] === 'pillar' && m.block[pil[1]][pil[0]] : true, rearmed: !G.trig.fired.arena_in, savedShut: !(G.prog.gates || {})['synth112:arena_gate'] };
    p.invulnT = 999; p.x = tr.x; p.y = tr.y; await w(600); r.again = !!(G.arena && G.arena.id === 'synth_arena') && m.colliders.some(c => c.gid === 'arena_gate');
    G.enemies.length = 0; G.arena = null; return r;
  });
  check('arena: entering closes the gate and tags the adds; dying -> respawn reopens the gate, clears the adds, restores broken pillars, re-arms the fight', ar.gateShut && ar.arena === 'synth_arena' && ar.adds >= 1 && ar.broke && ar.brokenType === 'x' && ar.died && ar.gateOpen && ar.arenaAfter === null && ar.addsAfter === 0 && ar.pillarBack && ar.rearmed && ar.savedShut && ar.again, ar);
  // fog of war + discovered sections / shrines survive the save (v3 plus fields, migration defaults)
  const fog = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player;
    for (const s of m.sections.filter(q => q.tiles)) { p.x = s.cx; p.y = s.cy; await w(150); }
    const vis0 = m.mini.vis.reduce((a, b) => a + b, 0), d = JSON.parse(JSON.stringify(saveData()));
    const str = d.world.fog.synth112, secs = (d.world.sections.synth112 || []).slice().sort().join(), shr = (d.world.shrines.synth112 || []).length;
    const keys = Object.keys(d).sort().join(), v = d.version;
    applySave(G.player, migrate(d)); miniBuild(m);
    const vis1 = m.mini.vis.reduce((a, b) => a + b, 0), same = m.mini.vis.every((b, i) => b === fogDecode(str, m.W, m.H)[i]);
    const old = JSON.parse(JSON.stringify(d)); delete old.world.fog; delete old.world.sections; delete old.world.shrines; const mo = migrate(old);
    return { vis0, vis1, same, len: str.length, secs, shr, keys, v, migFog: JSON.stringify(mo.world.fog), migSec: JSON.stringify(mo.world.sections), secAfter: (G.prog.sections.synth112 || []).length };
  });
  check('save: fog bitmap + discovered sections / shrines persist per map in world (v3, same top-level keys, migration defaults)', fog.vis0 > 300 && fog.vis1 === fog.vis0 && fog.same && fog.len < 3000 && fog.secs === 'arena,main,outer,under,vault'.split(',').filter(s => fog.secs.includes(s)).join() && fog.secs.includes('under') && fog.shr >= 2 && fog.v === 3 && fog.keys === 'bestiary,bindings,bosses,fishing,player,quests,settings,skills,slot,stats,t,version,world,zone100' && fog.migFog === '{}' && fog.migSec === '{}' && fog.secAfter >= 4, fog);
  // minimap: HUD local 24-tile window; full-map screen (M) with fog + section insets, underground dark until found
  const mm = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map;
    const before = (G.prog.sections.synth112 || []).slice(); G.prog.sections.synth112 = before.filter(s => s !== 'under');
    window.__padOn = false; IN.device = 'kbm';
    openFullMap(); await w(250);
    const c = fullMapCanvas(m).getContext('2d'), sec = m.sections.find(s => s.id === 'under');
    let dark = 0, n = 0; for (let j = 2; j < 38; j += 6) for (let i = 2; i < 50; i += 6) { const px = c.getImageData(m.mini.ox + i - j, m.mini.oy + i + j, 1, 1).data; n++; if (px[0] < 12 && px[1] < 12 && px[2] < 20) dark++; }
    const open = !!G.ui.map, paused = G.trig.t; await w(200); const frozen = G.trig.t === paused;   // the game step is paused (G.t keeps ticking for UI)
    G.prog.sections.synth112 = before; m.mini.fullKey = null;
    return { win: MINI_WIN, N: m.mini.N, open, frozen, darkFrac: +(dark / n).toFixed(2), sec: !!sec };
  });
  await shotM2b('bigmap_fullmap');
  await ev(() => closeFullMap());
  check('minimap: HUD shows a 24-tile window; the full-map screen opens (game paused), undiscovered underground stays dark', mm.win === 24 && mm.N === 112 + 112 + 60 && mm.open && mm.frozen && mm.darkFrac > 0.9, mm);
  await ev(() => { G.enemies.length = 0; G.boss = null; enterMap('vale'); G.state = 'play'; G.player.invulnT = 0; delete G.maps.synth112; });
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
  // ---------- 6b. phone settings (?phone=1): 256 px chunks, 12 resident, 16 awake; touring the synthetic zone stays under the cap ----------
  const p3 = await br.newPage({ viewport: { width: 960, height: 540 } }); p3.on('pageerror', e => errs.push('pageerror(phone): ' + e.message));
  await p3.goto(`${base}/index.html?scene=play&phone=1`, { waitUntil: 'load' });
  await p3.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const ph = await p3.evaluate(async (rec) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    G.world.maps.synth112 = rec; THEME_OF.synth112 = rec.theme; enterMap('synth112'); G.state = 'play'; G.banner = null; const m = G.map, p = G.player; p.invulnT = 999;
    let maxRes = 0;
    for (const s of m.sections.filter(q => q.tiles)) { p.x = s.cx; p.y = s.cy; p.z = tileH(m, p.x, p.y); G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12; for (let k = 0; k < 50; k++) { await w(30); maxRes = Math.max(maxRes, CHUNK.cache.size); } }
    const e0 = CHUNK.evicted; await w(2500);
    return { size: CHUNK.size, max: CHUNK.max, cap: SLEEP.cap, coarse: COARSE_POINTER, maxRes, evicted: CHUNK.evicted, thrash: CHUNK.evicted - e0 };
  }, SYN);
  check('phone: ?phone=1 -> 256 px chunks, <= 12 resident while touring (LRU evicts, no thrash), 16 awake, one fog layer', ph.size === 256 && ph.max === 12 && ph.cap === 16 && ph.coarse && ph.maxRes <= 12 && ph.evicted > 0 && ph.thrash === 0, ph);
  await p3.close();
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll play checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
