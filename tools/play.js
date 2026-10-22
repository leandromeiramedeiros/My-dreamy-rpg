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
const { synthMap } = require('./lib/synthmap.js');   // the synthetic 112x112 zone (DESIGN §25 checks)
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
  await ev(() => UI.focus.set('set:hitstop', true)); await wait(60); await tap(15); await wait(80);
  const dd = await ev(() => SETTINGS.hitstop);
  await tap(14); await wait(80);
  check('pause: d-pad left / right change sliders and choices (Hitlag Full -> Off -> Full)', m1 === m0 - 0.25 && dd === 'off' && await ev(() => SETTINGS.hitstop === 'full'), { m0, m1, dd });
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
    const p = G.player; p.wsk.sword.e = 'whirl'; recalcStats(p); p.cds = {}; p.mp = 200; p.st = p.maxSt; p.dash = null;
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
    return { v: s.version, level: q.level, xp: q.xp, dust: q.dust, q: q.wsk.sword.q, csk: q.csk.join(), chest: !!G.prog.chests['vale:4.5,17.2'], boss: !!G.prog.firsts['ruins:boss'], trig: G.prog.trig.vale.join(), slime: G.seen.slime.kills, res: G.seen.slime.res.slash, cp: G.checkpoint.x, bag: q.bag.filter(Boolean).length === p.bag.filter(Boolean).length };
  });
  check('save: v2 -> v4 migration keeps everything (pre-v4 wsk key dawnblade -> sword)', mig.v === 4 && mig.level === 7 && mig.xp === 120 && mig.dust === 33 && mig.q === 'heroic' && mig.csk === 'orbit,chain' && mig.chest && mig.boss && mig.trig === 't1' && mig.slime === 4 && mig.res === -0.5 && mig.cp === 2 && mig.bag, mig);
  const st = await ev(() => { const a = setSetting('difficulty', 'story'), b = setSetting('shake', 999); setSetting('shake', 100); return { a, b, has: 'difficulty' in SETTINGS, row: SETTINGS_SCHEMA.some(d => d.key === 'difficulty'), fn: typeof damageTakenMul }; });
  check('settings: validated setters; no Difficulty setting (Story removed, Normal only)', st.a === undefined && st.b === 100 && !st.has && !st.row && st.fn === 'undefined', st);
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
  await ev(() => { __reset(); const p = G.player; p.equip.weapon = makeItem('moonbow', 'rare', p.level, { sockets: 0 }); recalcStats(p); p.wsk.bow.r = 'moonbeam'; p.ult = 100; });
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
  check('boss: Bramblehorn stomp telegraph (circle r3, wind 0.9 >= 0.6, open 1.5 >= 1.2, warnSfx hook) and its hit lands', bh.boss && bh.name === 'Old Bramblehorn' && bh.type === 'circle' && bh.move === 'stomp' && bh.wind >= 0.6 && bh.open >= 1.2 && bh.sfx === 'warn_circle' && bh.r === 3 && bh.phases === 3 && bh2.hurt && bh2.fair, Object.assign(bh, bh2));
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
      // the camera chunk is budgeted (render.js CAM_CHUNK_MS a frame, the low-res preview meanwhile; QA perf): resident within ~2 s
      for (let k = 0; k < 70 && !chunkResident(m, chunkAt(m, camX, camY)); k++) { await w(30); maxRes = Math.max(maxRes, CHUNK.cache.size); }
      const vis = chunkAt(m, camX, camY); if (!chunkResident(m, vis)) visOk = false;
    }
    for (let k = 0; k < 200 && (GROUND_STATS.visMissing || CHUNK.jobs.size); k++) await w(25);   // let the last builds land
    const e0 = CHUNK.thrash; await w(2500); const thrash = CHUNK.thrash - e0;   // standing still: nothing is evicted and rebuilt
    let freed = 0, orphan = 0; const cg = chunkGrid(m);
    for (let i = 0; i < cg.nx * cg.ny; i++) { const res = !!chunkResident(m, i); for (const c of cg.cols[i]) { if (!res && !c.img) freed++; if (!res && c.img) orphan++; } }
    const r = { maxRes, evicted: CHUNK.evicted - ev0, visOk, thrash, freed, orphan, jobs: CHUNK.jobs.size };
    CHUNK.max = keep; return r;
  });
  check('chunks: LRU eviction keeps <= cap resident, the camera chunk resident within ~2 s of a jump, evicted chunks free their columns, no rebuild thrash standing still', lru.maxRes <= 6 && lru.evicted > 0 && lru.visOk && lru.thrash === 0 && lru.freed > 0 && lru.orphan === 0, lru);
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
  check('save: fog bitmap + discovered sections / shrines persist per map in world (v4, same top-level keys, migration defaults)', fog.vis0 > 300 && fog.vis1 === fog.vis0 && fog.same && fog.len < 3000 && fog.secs === 'arena,main,outer,under,vault'.split(',').filter(s => fog.secs.includes(s)).join() && fog.secs.includes('under') && fog.shr >= 2 && fog.v === 4 && fog.keys === 'bestiary,bindings,bosses,fishing,player,quests,settings,skills,slot,stats,t,version,world,zone100' && fog.migFog === '{}' && fog.migSec === '{}' && fog.secAfter >= 4, fog);
  // settling is per trigger: walking away from a live pack (it goes dormant) and dying must respawn it, not clear it
  const stl = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, p = G.player, tr = m.triggers.find(t => t.id === 'pack0').when;
    G.enemies.length = 0; G.prog.trig.synth112 = []; enterMap('synth112'); G.state = 'play'; p.invulnT = 999;
    p.x = tr.x; p.y = tr.y; await w(900); const spawned = G.enemies.filter(e => e.trig === 'pack0').length;
    p.x = Math.min(m.W - 6, tr.x + 30); p.y = tr.y - 30 > 46 ? tr.y - 30 : tr.y; await w(1200);
    const dormant = G.enemies.filter(e => e.trig === 'pack0' && e.dormant).length, settledEarly = (G.prog.trig.synth112 || []).includes('pack0');
    p.invulnT = 0; hurtPlayer(1e9, p.x, p.y); respawn(); await w(300);
    const r = { spawned, dormant, settledEarly, settled: (G.prog.trig.synth112 || []).includes('pack0'), doneFired: !!G.trig.fired.pack0_done, rearmed: !G.trig.fired.pack0 };
    p.invulnT = 999; p.x = tr.x; p.y = tr.y; await w(900); r.again = G.enemies.filter(e => e.trig === 'pack0').length;
    G.enemies.length = 0; return r;
  });
  check('settle: a pack left dormant is not settled; dying respawns it (no free pack_done), re-entering spawns it again', stl.spawned >= 3 && stl.dormant >= 3 && !stl.settledEarly && !stl.settled && !stl.doneFired && stl.rearmed && stl.again >= 3, stl);
  // a new run never inherits (or re-saves) the previous run's fog
  const nf = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, keep = G.prog, old = m.mini.vis.reduce((a, b) => a + b, 0);
    G.prog = { chests: {}, firsts: {}, trig: {} }; await w(200);
    const str = saveData().world.fog.synth112, vis = str ? fogDecode(str, m.W, m.H).reduce((a, b) => a + b, 0) : 0;
    G.prog = keep; m.mini = null; return { old, fresh: vis };
  });
  check('fog: a new game starts with only its own reveal (the old run\'s fog is not carried into its save)', nf.old > 600 && nf.fresh > 0 && nf.fresh < 400, nf);
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
  // B1 regression (QA REPORT): the two Pinewood stair wedges. Each spot: all 8 stick directions from the exact wedge
  // position; the hero must leave in most of them, and must never climb the 2-high bank (no 2-step).
  await ev(() => { G.enemies.length = 0; G.boss = null; enterMap('pinewood'); G.state = 'play'; G.banner = null; G.player.invulnT = 999; G.enemies.length = 0; });
  const DIRS8 = [[0, -1], [-1, 0], [0, 1], [1, 0], [-0.7, -0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7]];
  for (const [X, Y] of [[32.96, 93.97], [14.98, 89.92]]) {
    const res = [];
    for (const [ax, ay] of DIRS8) {
      await ev(([X, Y]) => { const p = G.player; G.enemies.length = 0; p.x = X; p.y = Y; p.z = tileH(G.map, X, Y); p.dash = null; p.rootT = 0; p.stuckT = 0; p.unstuck = 0; }, [X, Y]);
      await ev(a => window.__axes([a[0], a[1], 0, 0]), [ax, ay]);
      await wait(600);
      await ev(() => window.__axes([0, 0, 0, 0])); await wait(80);
      const q = await ev(([X, Y]) => ({ d: +Math.hypot(G.player.x - X, G.player.y - Y).toFixed(2), tx: Math.floor(G.player.x), un: G.player.unstuck || 0 }), [X, Y]);
      res.push(q);
    }
    // stick (0.7, 0.7) = world +x: from both spots that is the tile across a 2-height edge (spot 1 climbs 0 -> 2, spot 2 drops 2 -> 0)
    const out = res.filter(r => r.d > 0.3).length, across = res[5];
    check(`B1 wedge (${X}, ${Y}) Pinewood stairs: the hero walks out (>= 5 of 8 directions) and still cannot cross the 2-height edge`, out >= 5 && across.tx === Math.floor(X) && res.every(r => r.un === 0), res.map(r => r.d));
  }
  // unstick safety: a hero shut inside a blocked tile (nothing can move it) is nudged to the nearest free tile after ~1.5 s of input
  const uns = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const m = G.map, p = G.player; p.x = 44.5; p.y = 88.5; p.z = tileH(m, p.x, p.y); p.stuckT = 0; p.unstuck = 0;
    const i = Math.floor(p.x), j = Math.floor(p.y), was = m.block[j][i]; m.block[j][i] = true;
    window.__axes([1, 0, 0, 0]); await w(900); const mid = p.unstuck; await w(1300); window.__axes([0, 0, 0, 0]); await w(80);
    const r = { mid, un: p.unstuck, x: +p.x.toFixed(2), y: +p.y.toFixed(2), free: !m.block[Math.floor(p.y)][Math.floor(p.x)] };
    m.block[j][i] = was; return r;
  });
  check('unstick: zero displacement under input for 1.5 s with no free direction -> nudged to the nearest walkable tile (not before)', uns.mid === 0 && uns.un === 1 && uns.free, uns);
  const wall = await ev(async () => {   // pushing into a plain wall (other directions open) never teleports
    const w = ms => new Promise(r => setTimeout(r, ms)); const p = G.player; p.x = 32.96; p.y = 93.97; p.z = tileH(G.map, p.x, p.y); p.unstuck = 0; p.stuckT = 0;
    window.__axes([0.7, 0.7, 0, 0]); await w(2200); window.__axes([0, 0, 0, 0]); await w(80); return { un: p.unstuck, x: +p.x.toFixed(2) };
  });
  check('unstick: holding into a wall for 2 s does not teleport the hero', wall.un === 0 && wall.x < 33, wall);
  // retries (QA m1 / m2): after a death the objective comes from progress, not from the cards' array order; boss intro
  // dialogue and zone banners play once per save; clearing the Fox Warrens closes its "sneak past" line
  const rt = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), m = G.map, card = id => m.triggers.find(t => t.id === id), out = {}, talks = [];
    const tk = window.talk; window.talk = a => { talks.push(a.id || 'inline'); return tk(a); };
    const keep = { prog: G.prog, cp: G.checkpoint }; G.prog = { chests: {}, firsts: {}, trig: {}, quests: {}, once: { 'zone:pinewood': 1 } };   // already arrived once
    G.player.invulnT = 999;
    for (const id of ['h_intro', 'h_r1_done', 'h_r2_done', 'h_boss']) fireTrigger(card(id));
    out.boss = currentObjective(); G.enemies.length = 0; await w(50);
    G.checkpoint = { map: 'pinewood', x: 23.5, y: 6.5 }; G.banner = null; respawn(); G.player.invulnT = 999; G.enemies.length = 0;
    out.afterDeath = currentObjective(); out.zoneBanner = G.banner && G.banner.s;
    fireTrigger(card('boss')); out.talk1 = talks.filter(t => t === 'boss_bramblehorn_intro').length; G.enemies.length = 0;
    respawn(); G.player.invulnT = 999; G.enemies.length = 0; G.banner = null;
    out.bramble = currentObjective(); fireTrigger(card('boss')); out.talk2 = talks.filter(t => t === 'boss_bramblehorn_intro').length; out.bossBanner2 = G.banner && G.banner.s; G.enemies.length = 0;
    fireTrigger(card('w_enter')); out.sneak = currentObjective(); G.enemies.length = 0;
    for (const id of ['w_hall', 'w_vault', 'w_done']) { fireTrigger(card(id)); G.enemies.length = 0; }
    out.afterVault = currentObjective(); out.saved = !!(saveData().world.obj.pinewood && saveData().world.once);
    window.talk = tk; G.prog = keep.prog; G.checkpoint = keep.cp; G.delays.length = 0; G.talk = []; G.pendingSpawns = 0;
    return out;
  });
  check('retries: objective recomputed after a death (Mossjaw, Bramblehorn) and after the Warrens vault; boss intro + zone banner once per save', /Mossjaw/.test(rt.boss) && rt.afterDeath === rt.boss && !rt.zoneBanner && rt.talk1 === 1 && rt.talk2 === 1 && !rt.bossBanner2 && /Bramblehorn/.test(rt.bramble) && /[Ss]neak/.test(rt.sneak) && !/[Ss]neak/.test(rt.afterVault) && rt.saved, rt);
  // boss damage fairness (§20.3 / QA M1): no boss hit cap (client ruling, M3 hot-fix: a boss hit can kill); roar warns first
  const cap = await ev(() => {
    const p = G.player, r = {}; p.invulnT = 0; p.dash = null;
    p.hp = p.maxHp; p.invulnT = 0; hurtPlayer(1e5, p.x, p.y, 'nature', { boss: true }); r.boss = p.dead; p.dead = false; G.state = 'play';
    p.hp = p.maxHp; p.invulnT = 0; hurtPlayer(1e5, p.x, p.y, 'nature'); r.plain = p.dead; p.dead = false; G.state = 'play'; p.hp = p.maxHp; p.invulnT = 999;
    const b = spawnEnemy('bramblehorn', p.x + 3, p.y, 0); startMove(b, { type: 'roar', banner: 'x', dur: 0.4 }); r.roarWind = G.lastWarn.wind; r.roarTele = G.effects.some(e => e.type === 'tele' && e.src === b);
    r.fair = bossFairness('bramblehorn').length + bossFairness('mossjaw').length; G.enemies.length = 0; G.boss = null; G.effects.length = 0;
    return r;
  });
  check('boss hits: no cap (a huge boss hit kills, like any other damage); roar has a wind-up + telegraph; Mossjaw / Bramblehorn pass bossFairness', cap.boss === true && cap.plain === true && cap.roarWind >= 0.6 && cap.roarTele && cap.fair === 0, cap);
  await ev(() => { G.enemies.length = 0; G.boss = null; enterMap('vale'); G.state = 'play'; G.player.invulnT = 0; });
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
  // ---------- 4z. QA fixes: title focus, loot-label de-overlap, boss bar + tracker, touch banner ----------
  const SHOTS = path.join(ROOT, 'tools', 'shots', 'qa-fixes'); fs.mkdirSync(SHOTS, { recursive: true });
  const fresh = async (query, init) => {
    const pg = await br.newPage({ viewport: { width: 960, height: 540 } }); pg.on('pageerror', e => errs.push('pageerror(qa): ' + e.message));
    if (init) await pg.addInitScript(init);
    await pg.goto(`${base}/index.html${query || ''}`, { waitUntil: 'load' });
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); await wait(500); return pg;
  };
  { // title: default focus is NEW DREAM (no save) and Enter / A start the game; a save makes CONTINUE the default
    const t1 = await fresh('');
    const f0 = await t1.evaluate(() => UI.focus.current() && UI.focus.current().id);
    await t1.screenshot({ path: path.join(SHOTS, 'title.png') });
    await t1.keyboard.press('Enter'); await wait(900);
    const k1 = await t1.evaluate(() => G.state);
    check('title: keyboard Enter starts the game (default focus NEW DREAM, not SLOT 2)', f0 === 'title:new' && k1 === 'play', { f0, k1 });
    await t1.evaluate(() => { const d = saveData(); localStorage.setItem(saveKey(1), JSON.stringify(d)); }); await t1.reload({ waitUntil: 'load' });
    await t1.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); await wait(500);
    const f1 = await t1.evaluate(() => ({ hasSave: !!G.save, id: UI.focus.current() && UI.focus.current().id }));
    check('title: with a save the default focus is CONTINUE', f1.hasSave && f1.id === 'title:continue', f1);
    await t1.evaluate(() => localStorage.clear()); await t1.close();
    const t2 = await fresh('', PAD_STUB);
    await t2.evaluate(() => window.__btn(0, true)); await wait(150); await t2.evaluate(() => window.__btn(0, false)); await wait(900);
    check('title: pad A starts the game', await t2.evaluate(() => G.state) === 'play');
    await t2.close();
  }
  { // loot labels: 10 drops in a pile -> <= 6 labels, none overlapping, Commons fade after 2 s, Alt shows all
    const lp = await fresh('?scene=play');
    const r = await lp.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), p = G.player; G.banner = null; G.enemies.length = 0; G.drops.length = 0;
      const kinds = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'common', 'common'];
      // the pile sits 2.5 tiles off: spawnDrop scatters 0.5-1.4 tiles, and a drop landing within the 0.65-tile pickup radius of
      // the hero was auto-picked after 0.5 s (the old +0.4 offset lost 0-4 of the 10 at random)
      kinds.forEach((k, i) => { const it = rollItem ? rollItem(p.level, k) : null; spawnDrop(p.x + 2.5, p.y + 2.5, { kind: 'item', it }); });
      await w(900);
      const grab = () => (HUD.dropLabels || []).map(q => ({ x: q.x, y: q.y, w: q.w, rar: q.rar }));
      const ov = L => { let n = 0; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (Math.abs(L[i].x - L[j].x) < (L[i].w + L[j].w) / 2 && Math.abs(L[i].y - L[j].y) < 15) n++; return n; };
      const a = grab(), out = { n: G.drops.length, shown: a.length, overlaps: ov(a), rarOrder: a.map(q => q.rar).join() };
      dropAll.alt = true; await w(150); const all = grab(); out.allShown = all.length; out.uniq = new Set(G.drops.map(d => d.name + '|' + d.rar)).size; out.allOverlaps = ov(all); dropAll.alt = false;
      return out;
    });
    await lp.screenshot({ path: path.join(SHOTS, 'loot-pile.png') });
    check('loot: 10 drops -> at most 6 labels, none overlapping, best rarity first', r.n >= 8 && r.shown <= 6 && r.shown >= 1 && r.overlaps === 0, r);
    check('loot: Alt shows every label (duplicates merged), still without overlap', r.allShown === r.uniq && r.allShown >= 5 && r.allOverlaps === 0, r);
    const cm = await lp.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), p = G.player; G.drops.length = 0;
      p.x += 3; spawnDrop(p.x - 3, p.y, { kind: 'item', it: rollItem(p.level, 'common') }); await w(300);
      for (const d of G.drops) d.t = 3;   // 3 s old
      await w(200); return { common: (HUD.dropLabels || []).length };
    });
    check('loot: Common labels fade after 2 s', cm.common === 0, cm);
    await lp.close();
  }
  { // boss fight: the tracker sits below the bar, the wave counter hides during the intro, long objectives wrap inside the column
    const bp = await fresh('?scene=boss'); await wait(2500);
    const bo = await bp.evaluate(() => {
      G.enemies.length = 0; G.boss = null; G.banner = null; G.player.invulnT = 999; spawnEnemy('boss', G.player.x + 4, G.player.y, 0);
      G.objective = 'The Gnarlroot Ogre (south-east, by the loop road) holds the Hollow key. The road north of the shrine leads to the root door of the Hollow and beyond.';
      const b = G.boss; return { boss: !!b, up: typeof bossBarUp === 'function' && bossBarUp(), intro: typeof bossIntro === 'function' && bossIntro() };
    });
    await bp.evaluate(() => { G.banner = null; G.pendingSpawns = 2; G.enemies.forEach(e => { if (!e.boss) e.dead = true; }); if (G.boss) { G.boss.spawnT = 0; G.boss.hp = G.boss.maxHp * 0.8; } }); await wait(400);
    await bp.screenshot({ path: path.join(SHOTS, 'boss-tracker.png') });
    const hv = await bp.evaluate(() => {
      const wrapped = hudWrapLines(G.objective, 700, 'body', 2), narrow = hudWrapLines(G.objective, 200, 'body', 2);
      G.banner = { s: 'THE TROLL KING', sub: 'x', t: 3, max: 3.4, boss: true };
      return { lines: wrapped.length, narrow, fits: narrow.every(l => UI.measure(l, 'body') <= 200), introHides: bossIntro() };
    });
    check('hud: boss bar up -> tracker is drawn below it; long objective wraps / ellipsizes within the column; wave counter hidden in the boss intro', bo.boss && bo.up && hv.narrow.length === 2 && hv.fits && hv.introHides, { bo, hv });
    await bp.close();
  }
  { // touch: the zone banner sits below the tracker + the three top-left buttons
    const tp = await fresh('?scene=play');
    const tb = await tp.evaluate(async () => {
      const c = document.getElementById('game'); c.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 5, clientX: 100, clientY: 100, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 5, clientX: 100, clientY: 100, bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      G.objective = 'Enter the Warden\'s Grove (east). The root door waits north of the road and past the old stone bridge.';
      G.banner = { s: 'Gloom in the garden', sub: 'Whispering Vale', t: 2.6, max: 2.6 };
      await new Promise(r => setTimeout(r, 450));
      const btns = touchMenu();
      return { touch: G.touch, bottom: Math.max(0, ...btns.map(b => b.y + b.h)) };
    });
    await tp.screenshot({ path: path.join(SHOTS, 'touch-banner.png') });
    check('touch: zone banner draws below the top-left buttons', tb.touch === true && (tb.bottom === 0 || tb.bottom <= 164), tb);
    await tp.close();
  }
  // ---------- 4f. M3 step 2 engine: items v2, trinkets, boons, CAPS, temper / imbue, chest contract ----------
  {
    const v2 = await ev(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      G.enemies.length = 0; G.drops.length = 0;
      // a new game's hero: the Origin starter ring (Rusty Blade -> blades -> Knight), boon live
      const np = makePlayer(), kit = starterLoot(np), sr = kit.find(d => d.kind === 'item' && d.it.slot === 'ring');
      out.starter = { bare: np.equip.ring1 === null, kit: kit.map(d => d.kind === 'gem' ? 'gem:' + d.gem : d.it.base + '/' + d.it.rarity + '/' + d.it.sockets.length).join(), base: sr && sr.it.base };
      G.player = np; if (sr) equipItem(np, sr.it); out.starter.boon = !!(np.boons && np.boons.originKnight); out.starter.name = sr && itemName(sr.it);
      const p = G.player = makePlayer(); p.level = 14; p.x = G.map.start.x; p.y = G.map.start.y; p.equip.weapon = firstKitPiece('weapon'); recalcStats(p, true);   // §28: makePlayer is bare
      // an L14 drop: every affix T2 (ilvl 14..15 -> T2), the name from the T2 prefix / suffix noun, req = max(base, ilvl - 2), flavour + hist
      const bad = [];
      for (let k = 0; k < 40; k++) {
        const it = rollItem(14, pick2(['uncommon', 'rare', 'epic']), pick2(['weapon', 'head', 'chest', 'boots'])), b = baseOf(it.base), why = [];
        if (it.affixes.some(a => a.tier !== 2)) why.push('tier');
        const [np2, ns2] = [it.affixes.filter(a => a.kind === 'P').length, it.affixes.filter(a => a.kind === 'S').length];
        if (it.rarity === 'uncommon' && np2 + ns2 !== 1 || it.rarity === 'rare' && (np2 !== 1 || ns2 !== 1) || it.rarity === 'epic' && np2 + ns2 !== 3) why.push('counts');
        const P = it.affixes.find(a => a.kind === 'P'), S = it.affixes.find(a => a.kind === 'S');
        const pre = P && AFFIX_V2.prefix[P.id][1].name, suf = S && 'of the ' + SUFFIX_NOUN[S.id];
        const want = it.rarity === 'uncommon' ? [pre || null, pre ? null : suf] : [pre || null, suf || null];
        if (it.name.prefix !== want[0] || it.name.suffix !== want[1] || itemName(it) !== [want[0], b.name, want[1]].filter(Boolean).join(' ')) why.push('name ' + itemName(it));
        if (it.req !== Math.max(b.reqLvl, it.ilvl - 2) || !itemFlavor(it) || !it.hist || it.implicit.id !== IMPLICITS[it.base].stat) why.push('req/flavour/hist/implicit');
        if (why.length) bad.push(why.join(','));
      }
      out.l14 = { bad, sample: itemName(rollItem(14, 'rare', 'weapon')) };
      // implicits apply: the Rusty Blade's +4 % slash damage lands in p.sum
      out.implicit = +(p.sum.slashDmg || 0).toFixed(3);
      // CAPS: stack cdr (T3 cdr on every gear slot, a cdr ring) -> p.cdr stays 0.40; crit 0.60; haste 0.50; potions 5
      const stack = (id, n) => ['weapon', 'head', 'chest', 'boots'].forEach(s => { p.equip[s] = makeTestItem({ slot: s, rarity: 'legendary', ilvl: 34, affixes: [{ id, tier: 3, v: n }] }); });
      p.level = 40;
      stack('cdr', 0.15); p.equip.ring2 = makeTestItem({ slot: 'ring', rarity: 'rare', affixes: [{ id: 'cdr', tier: 3, v: 0.08 }] }); recalcStats(p, true);
      out.cdr = { sum: +p.sum.cdr.toFixed(3), cdr: p.cdr };
      stack('crit', 0.2); recalcStats(p, true); out.crit = { sum: +p.sum.crit.toFixed(3), crit: p.crit };
      stack('haste', 0.2); recalcStats(p, true); out.haste = p.haste;
      stack('power', 0.5); recalcStats(p, true); out.power = { sum: +p.sum.power.toFixed(2), bonus: p.bonus };
      p.equip.belt = makeTestItem({ slot: 'belt', rarity: 'rare', boon: 'potionCap', affixes: [{ id: 'resFire', tier: 3, v: 0.2 }, { id: 'resAll', tier: 3, v: 0.1 }] });
      p.equip.amulet = makeTestItem({ slot: 'amulet', rarity: 'legendary', affixes: [{ id: 'resAll', tier: 3, v: 0.1 }] });
      recalcStats(p, true); out.pot = p.maxPotions; out.res = { fire: +(p.sum.resFire || 0).toFixed(3), all: +p.sum.resAll.toFixed(3) };
      // belt implicit: +1 potion charge alone -> 4, and pickup fills to it
      p.equip.belt = makeTestItem({ slot: 'belt', rarity: 'uncommon', boon: 'killHeal', affixes: [] }); recalcStats(p, true); p.potions = 3;
      pickup(p, { kind: 'potion', x: p.x, y: p.y, z: 0, rar: 'uncommon' }); out.belt = { max: p.maxPotions, potions: p.potions };
      // boon ids never stack; two same-element rings resonate (+25 % to that element's reaction, inside the 50 % cap)
      p.equip.ring1 = makeTestItem({ slot: 'ring', rarity: 'rare', boon: 'fireBurn' }); p.equip.ring2 = makeTestItem({ slot: 'ring', rarity: 'rare', boon: 'fireBurn' }); recalcStats(p, true);
      out.stack = { boons: Object.keys(p.boons).filter(k => k === 'fireBurn').length, fireDmg: +(p.sum.fireDmg || 0).toFixed(3), res: p.resonance };
      // keyless equip of a third ring replaces the WEAKER ring (an Uncommon ring1 vs a Rare ring2)
      p.equip.ring1 = makeTestItem({ slot: 'ring', rarity: 'uncommon', boon: 'projPierce' }); const keep = p.equip.ring2, nr = makeTestItem({ slot: 'ring', rarity: 'epic', boon: 'holyPower' });
      p.bag = Array(BAG_SIZE).fill(null); bagAdd(p, nr); equipItem(p, nr); out.ringRule = p.equip.ring1 === nr && p.equip.ring2 === keep;
      // temper: Rare 20 Dust, one tier up, once; the prefix name follows the tier; refusals
      const it = makeItem('dawnblade', 'rare', 14, { affixes: ['power', 'hp'], q: 0.5 }); p.dust = 100;
      const t0 = { v: it.affixes[0].v, name: itemName(it) }, r1 = temperItem(it, 'power', p);
      out.temper = { r1, tier: it.affixes[0].tier, v0: t0.v, v1: it.affixes[0].v, name0: t0.name, name1: itemName(it), dust: p.dust, again: temperItem(it, 'hp', p), tempered: it.tempered,
        unc: temperItem(makeItem('dawnblade', 'uncommon', 14), 'power', p), t3: temperItem(makeItem('sunforged', 'rare', 30, { affixes: ['power', 'hp'] }), 'power', p) };
      p.dust = 5; out.temper.poor = temperItem(makeItem('dawnblade', 'epic', 14, { affixes: ['power', 'crit', 'hp'] }), 'crit', p);
      // imbue: +1 socket for Dust up to the rarity max; rings never
      p.dust = 200; const im = makeItem('dawnblade', 'rare', 14, { sockets: 1 });
      out.imbue = { r1: imbueItem(im, p), n: im.sockets.length, dust: p.dust, full: imbueItem(im, p), ring: imbueItem(makeTestItem({ slot: 'ring' }), p) };
      // the chest contract: loot 'ring' -> one extra ring >= Uncommon; 'amulet' -> a Rare amulet (and the trinket-drop gate opens)
      const chest = loot => ({ x: p.x + 2, y: p.y, z: 0, chest: true, src: { x: 900 + G.drops.length, y: 900, tier: 'wood', loot } });
      G.drops.length = 0; G.prog.secrets = {}; openChest(chest('ring')); await w(900);
      const ring = G.drops.filter(d => d.kind === 'item' && d.it.slot === 'ring').pop();   // the marker's trinket is pushed last (a random L14 trinket drop may come first)
      G.drops.length = 0; openChest(chest('amulet')); await w(900);
      const amu = G.drops.filter(d => d.kind === 'item' && d.it.slot === 'amulet').pop();
      out.chest = { ring: ring && ring.it.rarity, ringBoon: !!(ring && ring.it.boon), amulet: amu && amu.it.rarity, gate: trinketDropsOn(p) };
      // trinkets are ~15 % of item drops once the gate is open
      let n = 0; for (let k = 0; k < 2000; k++) if (isTrinket(rollItem(20, 'rare'))) n++; out.share = n / 2000;
      G.drops.length = 0;
      return out;
    });
    check('v2: a new game starts ring-less; the first Vale chest gives Common Iron Mail (1 socket) + the Origin ring (Knight, boon live) + a Chipped gem', v2.starter.bare && v2.starter.kit === 'ironmail/common/1,origin_knight/uncommon/0,gem:ruby_1' && v2.starter.base === 'origin_knight' && v2.starter.boon, v2.starter);
    check(`v2: L14 drops roll T2 affixes with the §19.1 counts and grammar names, req = max(base, ilvl - 2), flavour + hist (${v2.l14.sample})`, v2.l14.bad.length === 0, v2.l14.bad.slice(0, 5));
    check('v2: implicits apply in statsOf (Rusty Blade +4 % slash damage)', v2.implicit === 0.04, v2.implicit);
    check('CAPS: stacked cdr gear stays at 40 % (crit 60 %, haste 50 %, gear power 150 %)', v2.cdr.sum > 0.4 && v2.cdr.cdr === 0.4 && v2.crit.crit === 0.6 && v2.haste === 0.5 && v2.power.bonus === 1.5, { cdr: v2.cdr, crit: v2.crit, haste: v2.haste, power: v2.power });
    check('CAPS: potions 5; trinket resists +10 % per line, +15 % resAll across trinkets', v2.pot === 5 && v2.res.fire === 0.1 && Math.abs(v2.res.all - 0.15) < 1e-9, { pot: v2.pot, res: v2.res });
    check('belt: implicit +1 potion charge (max 4), pickup fills to it', v2.belt.max === 4 && v2.belt.potions === 4, v2.belt);
    check('boons: ids never stack (two Ember Sign rings = one +15 % fire); same-element rings resonate +25 %', v2.stack.boons === 1 && v2.stack.fireDmg === 0.15 && v2.stack.res && v2.stack.res.el === 'fire' && v2.stack.res.bonus === 0.25, v2.stack);
    check('rings: a keyless equip with both ring slots full replaces the weaker ring', v2.ringRule === true);
    const T = v2.temper;
    check(`temper: Rare costs 20 Dust, +1 tier once, value + name follow (${T.name0} -> ${T.name1})`, T.r1 === '' && T.tier === 3 && T.v1 > T.v0 && T.dust === 80 && T.name1 !== T.name0 && T.tempered && T.tempered.affix === 'power' && T.again === 'Already tempered', T);
    check('temper: refuses Uncommon, a T3 affix and too little Dust', /Rare or better/.test(T.unc) && /highest tier/.test(T.t3) && /Needs 60 Dust/.test(T.poor), { unc: T.unc, t3: T.t3, poor: T.poor });
    check('imbue: +1 socket for 60 Dust (Rare), refuses past the rarity max and on rings', v2.imbue.r1 === '' && v2.imbue.n === 2 && v2.imbue.dust === 140 && /No room/.test(v2.imbue.full) && /Rings/.test(v2.imbue.ring), v2.imbue);
    check("chest contract: loot 'ring' drops a ring >= Uncommon with a boon, 'amulet' a Rare amulet; trinket drops unlock", ['uncommon', 'rare', 'epic'].includes(v2.chest.ring) && v2.chest.ringBoon && v2.chest.amulet === 'rare' && v2.chest.gate, v2.chest);
    check(`drops: trinkets are ~15 % of item drops after Act I (${(v2.share * 100).toFixed(1)} %)`, v2.share > 0.12 && v2.share < 0.18, v2.share);
  }
  // ---------- 4g. §29 G2 world art: trees v2, canopy over the hero, sway, directional shadows, ground decals ----------
  {
    const tp = await br.newPage({ viewport: { width: 960, height: 540 } }); tp.on('pageerror', e => errs.push('pageerror(g2): ' + e.message));
    await tp.goto(`${base}/index.html?map=vale`, { waitUntil: 'load' });
    await tp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const T = await tp.evaluate(() => {
      const kinds = ['round', 'poplar', 'blossom', 'teal', 'oak', 'birch'], pk = ['giant', 'tall', 'young'];
      const ok = c => !!(c && c.trunk && c.canopy && c.canopyF && c.canopyF.length === 3 && c.swayF && c.swayF[1] === c && c.cbox && c.cbox[3] > c.cbox[1]);
      const sheets = kinds.map(k => ART.trees[k]).concat(pk.map(k => ART.pines[k]));
      const m = G.map, trees = m.objects.filter(o => o.tree);
      return {
        frozen: !TREES_LIVE && kinds.every(k => SPRITE_ART['tree_' + k + '_00']) && pk.every(k => SPRITE_ART['pine_' + k + '_00']) && !SPRITE_ART.tree_round_0,
        counts: kinds.map(k => ART.trees[k].length).concat(pk.map(k => ART.pines[k].length)), allSplit: sheets.every(a => a.every(ok)),
        bush: ART.bush.length && !!ART.bush[0].canopy, trees: trees.length, flipped: trees.filter(o => o.flip).length,
        litRight: m.theme.moon.x >= RW / 2, ruinsLeft: THEMES.ruins.moon.x < RW / 2,
        sway: trees.filter(o => o.img.swayF).length ? trees.filter(o => hash2(Math.floor(o.x * 7), Math.floor(o.y * 7), 77) < 0.25).length / trees.length : 0,
      };
    });
    check('trees v2: frozen sheets (js/sprites.js, 2 frames trunk|canopy; the old lollipop tree_*_0..3 gone) load as composites with trunk / canopy / 3 sway frames / canopy box; 12 sheets a broadleaf, 3 / 6 / 6 pines; bushes v2', T.frozen && T.allSplit && T.counts.join() === '12,12,12,12,12,12,3,6,6' && T.bush, T);
    check('trees v2: lit-side sheets, no random flip (the Vale is right-lit: 0 mirrored trees; the left-lit ruins theme mirrors them)', T.litRight && T.ruinsLeft && T.trees > 300 && T.flipped === 0, { trees: T.trees, flipped: T.flipped });
    check('sway: about 1 tree in 4 is in the swaying subset', T.sway > 0.2 && T.sway < 0.3, +T.sway.toFixed(3));
    // the hero steps under a wide canopy beside its trunk: the canopy splits off, fades 1 -> 0.35 within ~0.2 s, and fades back after
    const F = await tp.evaluate(async () => {
      const m = G.map, p = G.player, raf = () => new Promise(r => requestAnimationFrame(r));
      const place = (x, y) => { p.x = x; p.y = y; p.z = tileH(m, x, y); p.dash = null; p.invulnT = 9999; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; G.enemies.length = 0; G.state = 'play'; };
      let pick = null;
      for (const o of m.objects.filter(o => o.tree && o.img.swayF && o.img.width >= 30).sort((a, b) => Math.hypot(a.x - m.start.x, a.y - m.start.y) - Math.hypot(b.x - m.start.x, b.y - m.start.y))) {
        for (const [dx, dy] of [[0.3, -0.55], [-0.55, 0.3], [0.2, -0.6]]) { const x = o.x + dx, y = o.y + dy; if (walkable(m, x, y, tileH(m, x, y)) && Math.abs(tileH(m, x, y) - o.z) < 0.1 && !nearColliders(m, x, y, 0.5).some(c => c !== o && dist(x, y, c.x, c.y) < c.r + 0.3)) { pick = { o, x, y }; break; } }
        if (pick) break;
      }
      if (!pick) return { pick: false };
      place(pick.o.x + 1.6, pick.o.y + 1.6); for (let k = 0; k < 20; k++) await raf();
      const front = pick.o._fade;
      place(pick.x, pick.y); const t0 = G.t; let tReach = null;
      for (let k = 0; k < 40; k++) { await raf(); if (tReach == null && pick.o._fade <= TREE_FADE + 0.001) tReach = G.t - t0; }
      const under = { fade: pick.o._fade, split: pick.o._split };
      place(pick.o.x + 2.2, pick.o.y + 2.2); for (let k = 0; k < 40; k++) await raf();
      return { pick: true, front, tReach: tReach == null ? null : +tReach.toFixed(3), under, back: pick.o._fade, backSplit: pick.o._split };
    });
    check('canopy: in front of a tree it is one composite (fade 1); under it the canopy splits off and fades to 0.35 within ~0.2 s; walking out fades it back', F.pick && F.front === 1 && F.under.split && Math.abs(F.under.fade - 0.35) < 0.002 && F.tReach != null && F.tReach <= 0.3 && F.back === 1 && !F.backSplit, F);
    const S = await tp.evaluate(async () => {
      const m = G.map, raf = () => new Promise(r => requestAnimationFrame(r)), seen = new Set(); let maxN = 0;
      for (let k = 0; k < 150; k++) { await raf(); maxN = Math.max(maxN, TREE_FRAME.n); for (const o of m.objects) if (o.tree && o._sw && o._fr) seen.add(o._fr); }
      const ts = shadowTiles(m); let dirShadows = 0; for (const L of ts.tiles.values()) for (const e of L.list) if (e.ts) dirShadows++;
      const g = groundPrep(m); let dec = 0, kinds = new Set();
      for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) for (const d of decalsAt(m, i, j)) { dec++; kinds.add(d.k); }
      return { frames: [...seen].sort(), maxN, cap: TREE_SWAY_MAX, dirShadows, decals: dec, kinds: kinds.size, set: DECALS_OF(m).length, perTile: +(dec / g.W * 32).toFixed(2) };
    });
    check('sway: the gust moves swaying trees to both -1 and +1 px frames; at most 60 sway a frame (near band)', S.frames.includes(-1) && S.frames.includes(1) && S.maxN <= S.cap && S.maxN > 0, S);
    check('shadows (desktop): trees bake directional silhouettes into the static shadow tiles (0 live draws)', S.dirShadows > 300, S.dirShadows);
    check('decals: 16 kinds per zone, all used on the Vale, baked (no objects)', S.set === 16 && S.kinds === 16 && S.decals > 2000, S);
    await tp.close();
    const pp = await br.newPage({ viewport: { width: 960, height: 540 } }); pp.on('pageerror', e => errs.push('pageerror(g2 phone): ' + e.message));
    await pp.goto(`${base}/index.html?map=pinewood&phone=1`, { waitUntil: 'load' });
    await pp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const P = await pp.evaluate(() => { const ts = shadowTiles(G.map); let dir = 0, ell = 0; for (const L of ts.tiles.values()) for (const e of L.list) { if (e.ts) dir++; else ell++; } const sp = new Set(G.map.objects.filter(o => o.tree).map(o => o.src.t)); return { dir, ell, species: [...sp].sort() }; });
    check('shadows (phone): trees keep the ellipse; Pinewood has >= 5 tree species (pines x3, oak, birch, dead)', P.dir === 0 && P.ell > 500 && ['pine', 'pine_giant', 'pine_young', 'tree_birch', 'tree_oak'].every(k => P.species.includes(k)), P);
    await pp.close();
  }
  // ---------- 5. frame time ----------
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await wait(500);
  const ft = await ev(() => new Promise(res => { const d = []; let last = performance.now(); const t0 = last; const n = () => { const t = performance.now(); d.push(t - last); last = t; if (t - t0 < 8000) requestAnimationFrame(n); else res(d); }; requestAnimationFrame(n); }));
  ft.splice(0, 5); ft.sort((a, b) => a - b);
  const avg = ft.reduce((a, b) => a + b, 0) / ft.length, p95 = ft[Math.floor(ft.length * 0.95)];
  check('perf: 60 fps (avg frame <= 17.5 ms)', avg <= 17.5, { avg: +avg.toFixed(2), p95: +p95.toFixed(2), frames: ft.length });
  // DESIGN §26.4 step 2: the frame split by phase (?perf=flush: each phase's deferred raster forced into it), with loose per-phase
  // budgets that catch an algorithmic regression (an O(n) pass, an uncached per-pixel draw), not load noise. Off = nothing installed.
  {
    const off = await ev(() => ({ on: PERF.on, native: /\[native code\]/.test(CanvasRenderingContext2D.prototype.drawImage.toString()), tier: QUALITY.tier }));
    const pp = await br.newPage({ viewport: { width: 960, height: 540 } }); pp.on('pageerror', e => errs.push('pageerror(perf split): ' + e.message));
    await pp.goto(`${base}/index.html?scene=play&perf=flush`, { waitUntil: 'load' });
    await pp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await wait(500); await pp.evaluate(() => __perf(true, true)); await wait(4000);
    const pf = await pp.evaluate(() => __perf(true)), ph = pf.ph, sum = (...k) => +k.reduce((a, q) => a + (ph[q] || 0), 0).toFixed(2);
    const split = { ground: sum('chunks', 'ground', 'falls', 'sea'), sky: sum('sky.base', 'sky.moon', 'sky.mtn', 'sky'), entities: sum('decals', 'entities', 'fx'), fog: sum('fog.1', 'fog'), lights: sum('lights.lm', 'lights.mul', 'lights'), bloom: sum('bloom', 'grade.soft', 'grade'), hud: sum('blit', 'hud'), update: sum('update') };
    const BUDGET = { ground: 4, sky: 4, entities: 5, fog: 2.5, lights: 4.5, bloom: 4.5, hud: 7, update: 3 };
    const over = Object.keys(BUDGET).filter(k => split[k] > BUDGET[k]);
    check('perf: phase split under budget (ms/frame, ?perf=flush)', over.length === 0 && pf.draws > 0, { split, over, draws: pf.draws, parts: pf.parts });
    const ov = await pp.evaluate(() => { const c = DISP.getContext('2d').getImageData(330 * HUD_K, 10 * HUD_K, 1, 1).data; return { txt: !!PERF_RING.txt, px: [c[0], c[1], c[2]] }; });
    check('perf: ?perf overlay draws its readout; with ?perf unset nothing is wrapped (native drawImage, PERF.on false), desktop tier high', ov.txt && !off.on && off.native && off.tier === 'high', { ov, off });
    await pp.close();
  }
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
  // ---------- 6a. §28 the bare start: null gear slots everywhere (stats, skills, attack, menus, save / load, pickups) ----------
  {
    const bp = await br.newPage({ viewport: { width: 960, height: 540 } }); const berr = []; bp.on('pageerror', e => berr.push(e.message));
    await bp.goto(`${base}/index.html?map=vale`, { waitUntil: 'load' });
    await bp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const b28 = await bp.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      G.state = 'play'; G.banner = null; const p = G.player = makePlayer(); p.x = G.map.start.x; p.y = G.map.start.y; p.z = tileH(G.map, p.x, p.y); p.invulnT = 99;
      out.bare = { slots: EQUIP_SLOTS.filter(k => p.equip[k]).length, gear: Object.values(p.gear).join(), wdmg: p.wdmg, dmgBase: +p.dmgBase.toFixed(2), skills: ['q', 'e', 'r', 'f', 'c', 'shift'].map(k => slotSkill(p, k)).join() };
      // the shove: 1 damage-ish (no sword damage), knockback; Q refuses, the barefoot roll dodges
      G.enemies.length = 0; const e = spawnEnemy('slime', p.x + 0.9, p.y, 0); e.spawnT = 0; const hp0 = e.hp; p.aim = 0; p.atkT = 0; basicAttack(p); await w(120);
      out.shove = { dmg: +(hp0 - e.hp).toFixed(1), lmb: skillSlotState(p, 'lmb').name, q: useSkill(p, 'q'), roll: (p.st = p.maxSt, useSkill(p, 'shift')) };
      G.enemies.length = 0; p.dash = null; await w(300);
      // menus with every slot empty: character, inventory, loadout panel
      for (const t of ['skills', 'inv']) { openInv(t); await w(200); } G.ui.sel = null; await w(150); closeInv();
      // save / load: empty slots stay empty; an unreadable gear item falls back to the slot's first-kit Common (never a lost slot)
      const s1 = migrate(JSON.parse(JSON.stringify(saveData()))), q1 = makePlayer(); applySave(q1, s1);
      out.load = { empty: EQUIP_SLOTS.filter(k => q1.equip[k]).length };
      const s2 = migrate(JSON.parse(JSON.stringify(saveData()))); s2.player.equip.head = { id: 'i_9', base: 'no_such_base', rarity: 'rare', affixes: [], sockets: [] };
      const q2 = makePlayer(); applySave(q2, s2); out.load.fallback = q2.equip.head && q2.equip.head.base + '/' + q2.equip.head.rarity; out.load.others = ['weapon', 'chest', 'boots'].filter(k => q2.equip[k]).length;
      G.player = p;
      // pickups flagged `equip` go on when the slot is empty, into the bag when it is not
      const cap = makeItem('ironcap', 'common', 1); pickup(p, { kind: 'item', it: cap, rar: 'common', x: p.x, y: p.y, z: p.z, equip: true });
      const cap2 = makeItem('ironcap', 'common', 1); pickup(p, { kind: 'item', it: cap2, rar: 'common', x: p.x, y: p.y, z: p.z, equip: true });
      out.wear = { head: p.equip.head === cap, second: p.bag.includes(cap2), c: slotSkill(p, 'c') };
      // the ambush's fixed boots: Common Iron Boots for an empty slot; a hero already in boots gets the old Uncommon+ roll
      const L0 = []; const dl = window.dropLoot; window.dropLoot = (x, y, list) => L0.push(list.map(d => d.it ? d.it.base + '/' + d.it.rarity : d.kind));
      lootAction({ type: 'loot', item: 'ironboots', rarity: 'common', x: p.x, y: p.y }); p.equip.boots = makeItem('ironboots', 'common', 1); recalcStats(p, false);
      lootAction({ type: 'loot', item: 'ironboots', rarity: 'common', x: p.x, y: p.y }); window.dropLoot = dl;
      out.boots = { fresh: L0[0].join(), worn: L0[1].length === 1 && !/^ironboots/.test(L0[1][0]) && !/\/common$/.test(L0[1][0]) };
      // a game that did not start bare (every save from before §28): the HUD is whole
      const sec = G.prog.secrets.opening; G.prog.secrets.opening = undefined; out.hudWhole = ['bars', 'map', 'q', 'pot', 'skills'].every(k => hudShown(k) === 1); G.prog.secrets.opening = sec;
      return out;
    });
    check('§28 bare hero: every slot null; p.gear keeps default ids for render; wdmg 1; no Q E R F C, SHIFT = barefoot Roll', b28.bare.slots === 0 && b28.bare.wdmg === 1 && b28.bare.skills === ',,,,,roll' && b28.bare.gear === 'sword,knighthelm,warden,knightgreaves', b28.bare);
    check('§28 bare hero: LMB is a weak Shove (<= 3 damage), Q refuses, the roll dodges', b28.shove.lmb === 'Shove' && b28.shove.dmg > 0 && b28.shove.dmg <= 3 && b28.shove.q === false && b28.shove.roll === true, b28.shove);
    check('§28 save / load: empty gear slots stay empty; an unreadable gear item becomes the slot\'s first-kit Common', b28.load.empty === 0 && b28.load.fallback === 'ironcap/common' && b28.load.others === 0, b28.load);
    check('§28 pickups: a first-kit piece goes on into an empty slot, a second one goes to the bag', b28.wear.head && b28.wear.second && b28.wear.c === 'warcry', b28.wear);
    check('§28 garden boots: fixed Common Iron Boots (no roll); a hero already in boots gets the old Uncommon+ roll instead', b28.boots.fresh === 'ironboots/common' && b28.boots.worn, b28.boots);
    check('§28 a game that did not start bare keeps the whole HUD', b28.hudWhole);
    check('§28 bare-hero menus, attack and save paths raise no page errors', berr.length === 0, berr.slice(0, 3));
    await bp.close();
  }
  // ---------- 6b. phone settings (?phone=1): 256 px chunks, 12 resident, 16 awake; touring the synthetic zone stays under the cap ----------
  const p3 = await br.newPage({ viewport: { width: 960, height: 540 } }); p3.on('pageerror', e => errs.push('pageerror(phone): ' + e.message));
  await p3.goto(`${base}/index.html?scene=play&phone=1`, { waitUntil: 'load' });
  await p3.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const ph = await p3.evaluate(async (rec) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    G.world.maps.synth112 = rec; THEME_OF.synth112 = rec.theme; enterMap('synth112'); G.state = 'play'; G.banner = null; const m = G.map, p = G.player; p.invulnT = 999;
    let maxRes = 0;
    for (const s of m.sections.filter(q => q.tiles)) { p.x = s.cx; p.y = s.cy; p.z = tileH(m, p.x, p.y); G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12; for (let k = 0; k < 50; k++) { await w(30); maxRes = Math.max(maxRes, CHUNK.cache.size); } }
    for (let k = 0; k < 200 && (GROUND_STATS.visMissing || CHUNK.jobs.size); k++) await w(25);
    const e0 = CHUNK.thrash; await w(2500);
    return { size: CHUNK.size, max: CHUNK.max, cap: SLEEP.cap, coarse: COARSE_POINTER, maxRes, evicted: CHUNK.evicted, thrash: CHUNK.thrash - e0, tourThrash: CHUNK.thrash, tier: QUALITY.tier, partCap: PART.cap, hudK: HUD_K, gov: GOV.on, rung: GOV.rungs[GOV.ri] };
  }, SYN);
  check('phone: §26.4 caps - quality tier phone (or low), particle cap 300, the resolution governor on (DPR rung 0.5..1; at DPR 1 the store stays 1x)', ['phone', 'low'].includes(ph.tier) && ph.partCap === 300 && ph.gov && ph.rung >= 0.5 && ph.rung <= 1 && ph.hudK === 1, { tier: ph.tier, partCap: ph.partCap, hudK: ph.hudK, gov: ph.gov, rung: ph.rung });
  check('phone: ?phone=1 -> 256 px chunks, <= 12 resident while touring (LRU evicts, no thrash), 16 awake, one fog layer', ph.size === 256 && ph.max === 12 && ph.cap === 16 && ph.coarse && ph.maxRes <= 12 && ph.evicted > 0 && ph.thrash === 0, ph);
  await p3.close();
  // ======================= M3 UI lane (tooltip v2, paper doll, ring rule, ICONS routing) — owned by the UI agent =======================
  {
    const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
    pg.on('pageerror', e => errs.push('pageerror(m3-ui): ' + e.message));
    pg.on('console', m => { if (m.type() === 'error') errs.push('console(m3-ui): ' + m.text()); });
    await pg.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    if (!(await pg.evaluate(() => typeof ICONS !== 'undefined'))) await pg.addScriptTag({ path: path.join(ROOT, 'js', 'icons.js') });
    await wait(300);
    const m3 = (fn, arg) => pg.evaluate(fn, arg);
    // fill the 8 slots + bag with makeTestItem items; trap the legacy mirrors (reqLvl / uid / affix.stat) and spy on ICONS.item
    await m3(() => {
      const p = G.player; p.level = 40; window.__legacy = 0; window.__iconArgs = [];
      const trap = it => { for (const k of ['reqLvl', 'uid']) Object.defineProperty(it, k, { get() { window.__legacy++; return k === 'uid' ? this.id : this.req; }, configurable: true });
        for (const a of it.affixes) Object.defineProperty(a, 'stat', { get() { window.__legacy++; return this.id; }, configurable: true }); return it; };
      window.__trap = trap;
      const t = o => trap(makeTestItem(o));
      p.equip.weapon = t({ slot: 'weapon', variant: 'sword', tier: 1, rarity: 'rare', ilvl: 12, sockets: ['ruby_2', null] });
      p.equip.head = t({ slot: 'head', variant: 'knighthelm', tier: 1, rarity: 'uncommon' });
      p.equip.chest = t({ slot: 'chest', variant: 'warden', tier: 2, rarity: 'epic', ilvl: 16, sockets: ['diamond_2', null], tempered: true });
      p.equip.boots = t({ slot: 'boots', variant: 'knightgreaves', tier: 1, rarity: 'rare' });
      p.equip.ring1 = t({ slot: 'ring', rarity: 'rare', boon: 'fireBurn' });
      p.equip.ring2 = t({ slot: 'ring', tier: 1, rarity: 'epic', ilvl: 18, boon: 'frostPower' });
      p.equip.amulet = t({ slot: 'amulet', rarity: 'rare' });
      p.equip.belt = t({ slot: 'belt', rarity: 'uncommon' });
      p.bag = Array(BAG_SIZE).fill(null);
      window.__sword = t({ slot: 'weapon', variant: 'sword', tier: 2, rarity: 'rare', ilvl: 18, sockets: ['topaz_1'] });
      window.__ring = t({ slot: 'ring', rarity: 'legendary', tier: 2, ilvl: 30 });
      window.__lantern = t({ unique: 'pipslantern', hist: { found: 'spire', kills: 0, bossKills: 0 } });
      [window.__sword, window.__ring, window.__lantern, t({ unique: 'rootcrown' })].forEach(e => bagAdd(p, e));
      recalcStats(p, true);
      const f = ICONS.item; ICONS.item = function (b, ...r) { window.__iconArgs.push(b); return f.call(this, b, ...r); };
      openInv('inv'); G.ui.sel = null;
    });
    await wait(500);
    // -- paper doll: the 4 trinket slots at the §19.4 positions (relative to the panel), all 8 slots focusable / hit-testable
    const doll = await m3(() => ({ rel: EQ_REL, pos: EQ_POS, keys: EQUIP_SLOTS, ids: UI.focus.list.map(r => r.id).filter(i => i.startsWith('eq:')) }));
    check('paper doll: ring1 (24,88) ring2 (176,88) amulet (100,64) from the panel origin, belt tightened to (100,256) (R3 #6); 8 slots registered',
      JSON.stringify([doll.rel.ring1, doll.rel.ring2, doll.rel.amulet, doll.rel.belt]) === '[[24,88],[176,88],[100,64],[100,256]]' && doll.keys.every(k => doll.ids.includes('eq:' + k)) && doll.ids.length === 8, doll);
    // -- tooltip rows: <= 12 lines for every kind, name in rarity colour, v2 names only (legacy mirrors never read)
    const tip = await m3(() => {
      const p = G.player, out = [];
      const all = EQUIP_SLOTS.map(k => p.equip[k]).concat(p.bag.filter(Boolean));
      for (const it of all) for (const touch of [false, true]) {
        const T = itemTipRows(p, it, { w: 308, touch, cmp: replacedBy(p, it) });
        out.push({ n: T.count, k: T.rows.map(r => r.k).join(','), touch, col: T.rows[0].col === rarityCol(it.rarity), name: T.rows[0].lines.join(' ') === itemName(it) || T.rows[0].lines.length > 1 });
      }
      return { out, legacy: window.__legacy };
    });
    check('tooltip v2: <= 12 lines for all 8 slots + bag items, desktop and touch', tip.out.every(o => o.n <= 12), tip.out.map(o => o.n));
    check('tooltip v2: name first, in rarity colour; touch collapses affixes (chips) and drops family / synergy / flavour',
      tip.out.every(o => o.k.startsWith('name,head,lv') && o.col) && tip.out.filter(o => o.touch).every(o => !/\baff\b|family|syn|flavor/.test(o.k)) && tip.out.filter(o => !o.touch).some(o => /aff/.test(o.k)), tip.out.slice(0, 4));
    // -- compare: the Rare bag sword vs the equipped Rare sword shows deltas; the legendary trinket shows boon + rule + synergy
    const cmpT = await m3(() => {
      const p = G.player, T = itemTipRows(p, window.__sword, { w: 308, touch: false, cmp: replacedBy(p, window.__sword) }), L = itemTipRows(p, window.__lantern, { w: 308, touch: false, cmp: null });
      const head = T.rows.find(r => r.k === 'head'), aff = T.rows.filter(r => r.k === 'aff');
      return { dmgDelta: head.stats[0].d, affD: aff.map(a => +a.d.toFixed(3)), hasCmp: aff.every(a => a.hasCmp), lk: L.rows.map(r => r.k) };
    });
    check('tooltip v2: Rare weapon has compare deltas vs the equipped weapon; unique trinket shows boon + gold rule + synergy + footer',
      cmpT.dmgDelta > 0 && cmpT.hasCmp && cmpT.affD.length === 2 && ['boon', 'rule', 'syn', 'flavor', 'footer'].every(k => cmpT.lk.includes(k)), cmpT);
    // -- ICONS routing: every ICONS.item call got a BASE id (never a variant / suit id); trinkets resolved through baseOf
    const ic = await m3(() => {
      const bad = window.__iconArgs.filter(b => !baseOf(b) || ['sword', 'staff', 'bow', 'warden', 'dreamweave', 'stalker', 'ring', 'amulet', 'belt'].includes(b));
      return { n: window.__iconArgs.length, bad: [...new Set(bad)], toast: (() => { const e = G.player.bag.find(x => x && x.rarity === 'rare'); const q = UI.toast({ text: itemName(e), rarity: 'rare' }); return { framed: !!q.framed, w: q.icon && q.icon.width }; })() };
    });
    check('icons: ICONS.item only with base ids; loot toast uses the 24 px ICONS art', ic.n > 0 && ic.bad.length === 0 && ic.toast.framed && ic.toast.w === 24, ic);
    // -- drop labels / pickup toast use the generated v2 name
    const drop = await m3(() => {
      const it = makeTestItem({ slot: 'weapon', variant: 'sword', tier: 1, rarity: 'rare', ilvl: 12 }); G.drops = [];
      spawnDrop(G.player.x + 1, G.player.y, { kind: 'item', it }); const d = G.drops[0];
      return { name: d.name, want: itemName(it), rar: d.rar, hasPart: !!(it.name.prefix || it.name.suffix) };
    });
    check('drop label: the generated v2 name in rarity colour', drop.name === drop.want && drop.rar === 'rare' && drop.hasPart, drop);
    // -- ring rule. 1) empty ring slot fills first, no prompt. 2) both full: the bag ring enters pick mode, focus on the weaker ring, confirm replaces ONLY that one
    const ring = await m3(() => {
      const p = G.player, r = {}; G.ui.ringPick = null;
      const ring1 = p.equip.ring1, ring2 = p.equip.ring2, spare = window.__ring, bi = p.bag.indexOf(spare);
      r.weaker = weakerRing(p);                                  // ring1 is Rare, ring2 Epic -> ring1
      bagClickMenu(bi, false);
      r.pick = G.ui.ringPick === spare; r.stillBag = p.bag.includes(spare); r.unchanged = p.equip.ring1 === ring1 && p.equip.ring2 === ring2;
      r.focus = UI.focus.id; r.cmp = replacedBy(p, spare, null) === ring1;
      clickEquipSlot('ring2');                                    // the player chose ring2 (the stronger one): that one is replaced
      r.after = { ring1: p.equip.ring1 === ring1, ring2: p.equip.ring2 === spare, oldInBag: p.bag.includes(ring2), pickCleared: !G.ui.ringPick };
      // empty slot first: clear ring2, equip another ring from the bag -> straight into ring2, no pick
      const other = makeTestItem({ slot: 'ring', rarity: 'uncommon' }); p.equip.ring2 = null; bagAdd(p, other);
      bagClickMenu(p.bag.indexOf(other), false);
      r.empty = { in2: p.equip.ring2 === other, noPick: !G.ui.ringPick };
      return r;
    });
    check('ring rule: empty slot fills first; both full -> pick mode (focus on the weaker ring, compare vs it), confirm replaces only the chosen ring',
      ring.weaker === 'ring1' && ring.pick && ring.stillBag && ring.unchanged && ring.focus === 'eq:ring1' && ring.cmp && ring.after.ring1 && ring.after.ring2 && ring.after.oldInBag && ring.after.pickCleared && ring.empty.in2 && ring.empty.noPick, ring);
    // -- mouse: real hit-test on the doll slot; pad: focus.move reaches every slot; touch: tap compares first, second tap confirms
    await m3(() => { const p = G.player; p.equip.ring2 = makeTestItem({ slot: 'ring', rarity: 'rare' }); window.__ring2 = makeTestItem({ slot: 'ring', rarity: 'epic', ilvl: 20 }); bagAdd(p, window.__ring2); G.ui.ringPick = null; G.ui.sel = null; });
    await wait(300);
    const mouse = await m3(() => {
      const p = G.player, e = window.__ring2, before = p.equip.ring1;
      const [bx, by] = (() => { const i = p.bag.indexOf(e); return [COL2 + 10 + (i % 6) * 54 + 10, 108 + Math.floor(i / 6) * 54 + 10]; })();
      UI.click(bx, by);                                           // mouse click on the bag ring -> pick mode
      const pick = G.ui.ringPick === e;
      const [rx, ry] = EQ_POS.ring1; UI.click(rx + 10, ry + 10);   // click the ring1 doll slot
      return { pick, equipped: p.equip.ring1 === e, oldOut: !p.equip.ring1 || p.equip.ring1 !== before };
    });
    check('mouse: click bag ring then the ring1 doll slot replaces ring1', mouse.pick && mouse.equipped && mouse.oldOut, mouse);
    await m3(() => { const p = G.player; window.__ring3 = makeTestItem({ slot: 'ring', rarity: 'legendary', tier: 2, ilvl: 30 }); bagAdd(p, window.__ring3); G.ui.sel = null; G.ui.ringPick = null; UI.focus.set('eq:ring1', true); });
    await wait(250);
    const pad = await m3(() => {
      // every doll slot is reachable from every other with d-pad moves (BFS over UI.focus.move), and ring1 -> right goes toward ring2 / amulet
      const ids = EQUIP_SLOTS.map(k => 'eq:' + k), edges = {};
      for (const id of ids) { edges[id] = []; for (const d of ['up', 'down', 'left', 'right']) { UI.focus.set(id, true); const r = UI.focus.move(d); if (r && ids.includes(r.id)) edges[id].push(r.id); } }
      const seen = new Set(['eq:ring1']), q = ['eq:ring1']; while (q.length) for (const n of edges[q.shift()]) if (!seen.has(n)) { seen.add(n); q.push(n); }
      return { reach: seen.size, edges };
    });
    check('pad / keyboard focus: all 8 paper-doll slots are reachable with the d-pad', pad.reach === 8, pad);
    const touch = await m3(() => {
      const p = G.player, e = window.__ring3, r = {}; G.touch = true; IN.device = 'touch'; G.ui.sel = null; G.ui.ringPick = null;
      const bi = p.bag.indexOf(e), keep1 = p.equip.ring1, keep2 = p.equip.ring2;
      bagClickMenu(bi, false); r.first = { pick: !G.ui.ringPick, sel: G.ui.sel === e };          // first tap only shows the ring
      bagClickMenu(bi, false); r.second = { pick: G.ui.ringPick === e };                         // second tap starts the pick
      clickEquipSlot('ring2'); r.cand = { cand: G.ui.ringCand === 'ring2', unchanged: p.equip.ring2 === keep2 };   // tap a ring: compare only
      clickEquipSlot('ring2'); r.done = { ring2: p.equip.ring2 === e, ring1: p.equip.ring1 === keep1 };            // tap again: replace
      const T = itemTipRows(p, e, { w: 308, touch: true }); r.touchRows = T.rows.map(x => x.k);
      G.touch = false; IN.device = 'kbm'; return r;
    });
    check('touch: tap shows the ring, second tap starts the pick, tap a ring slot compares, tap again replaces; tooltip collapsed',
      touch.first.pick && touch.first.sel && touch.second.pick && touch.cand.cand && touch.cand.unchanged && touch.done.ring2 && touch.done.ring1 && touch.touchRows.includes('chips'), touch);
    check('legacy mirrors (reqLvl / affix.stat / uid) were never read by the UI render, tooltip or equip paths', (await m3(() => window.__legacy)) === 0);
    await pg.close();
  }
  // ======================= end M3 UI lane =======================
  // ======================= UI fixes R3 (docs/meetings/2026-10-20-feel-ui.md "R3 Prioritized UI fixes") — owned by the UI agent =======================
  {
    const mk = async (opts, url = '?scene=play') => {
      const c = await br.newContext(opts), pg = await c.newPage();
      pg.on('pageerror', e => errs.push('pageerror(r3): ' + e.message));
      pg.on('console', m => { if (m.type() === 'error') errs.push('console(r3): ' + m.text()); });
      await pg.goto(`${base}/index.html${url}`, { waitUntil: 'load' });
      await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
      if (!(await pg.evaluate(() => typeof ICONS !== 'undefined'))) await pg.addScriptTag({ path: path.join(ROOT, 'js', 'icons.js') });
      await wait(300);
      return { c, pg, e: (f, a) => pg.evaluate(f, a) };
    };
    const frames = (pg, n = 3) => pg.evaluate(n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    const { c: c1, pg: pg1, e } = await mk({ viewport: { width: 960, height: 540 } });
    // 1. help overlay: the buttons clear the last row, the whole panel is on the canvas (keyboard rows and touch rows)
    const help = {};
    for (const touch of [false, true]) {
      await e(t => { G.touch = t; IN.device = t ? 'touch' : 'kbm'; G.ui.help = true; }, touch); await frames(pg1);
      help[touch ? 'touch' : 'kbm'] = await e(() => { const r = HUD.helpRect; G.ui.help = false; return { clear: r.btnY - r.lastRowY, top: r.y, bottom: r.y + r.h }; });
    }
    await e(() => { G.touch = false; IN.device = 'kbm'; });
    check('R3 #1 help overlay: SETTINGS / CLOSE sit below the last row (>= 40 px), panel inside 540 px, keyboard and touch rows',
      Object.values(help).every(h => h.clear >= 40 && h.top >= 0 && h.bottom <= 540), help);
    // 3. tracker: wraps at the minimap's left edge in <= 2 lines + ellipsis; "Foes left" only in a live wave; the banner clears the touch buttons
    const trk = await e(() => {
      const long = 'Open the chest west of the glade. Then find the Stone\'s lantern and bring it back to the Elder Stone, then talk to Pip about the rift beyond the old bridge.';
      const L = hudWrapLines(long, TRACKER_RIGHT - 16 - 20, 'body', 2), r = { n: L.length, w: Math.max(...L.map(l => UI.measure(l, 'body'))), ell: /…$/.test(L[L.length - 1]), right: TRACKER_RIGHT };
      G.pendingSpawns = 0; G.arena = { id: 'a', map: G.map.id, done: true, gates: [] }; G.enemies.push({ type: 'slime', hp: 5, maxHp: 5, dead: false, x: 1, y: 1, z: 0, arena: 'a' });
      r.doneArena = waveLive(); G.arena = { id: 'a', map: G.map.id, done: false, gates: [] }; r.liveArena = waveLive();
      G.arena = null; r.idle = waveLive(); G.pendingSpawns = 1; r.pending = waveLive(); G.pendingSpawns = 0; G.enemies.pop();
      return r;
    });
    check('R3 #3 tracker: objective wraps at x < 816 (2 lines + "..."); "Foes left" only while a wave / live arena runs (not after the arena, not idle)',
      trk.n === 2 && trk.w <= trk.right - 16 - 20 && trk.ell && !trk.doneArena && trk.liveArena && !trk.idle && trk.pending, trk);
    const bn = await e(() => { G.touch = true; IN.device = 'touch'; G.banner = { s: 'Test', sub: 'x', t: 5, max: 5 }; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { const m = touchMenu()[0]; const o = { by: HUD.bannerY, btnBottom: m.y + m.h }; G.banner = null; G.touch = false; IN.device = 'kbm'; r(o); }))); });
    check('R3 #3 touch: the zone banner starts below the three icon buttons', bn.by >= bn.btnBottom + 8, bn);
    // 4. tooltip copy: units, "0%", zone display names, a compact compare, skill names
    await e(() => {
      const p = G.player; p.level = 30;
      p.equip.weapon = makeTestItem({ slot: 'weapon', variant: 'sword', tier: 1, rarity: 'rare', ilvl: 12, sockets: ['ruby_2', null], hist: { found: 'pinewood', kills: 3, bossKills: 0 } });
      window.__r3 = makeTestItem({ slot: 'weapon', variant: 'sword', tier: 2, rarity: 'rare', ilvl: 18, sockets: ['topaz_1'], hist: { found: 'spire', kills: 0, bossKills: 0 } });
      window.__r3l = makeTestItem({ unique: 'pipslantern', hist: { found: 'spire', kills: 0, bossKills: 0 } });
      p.bag = Array(BAG_SIZE).fill(null); bagAdd(p, window.__r3); bagAdd(p, window.__r3l); p.cdr = 0.0004; p.skillDmg = -0.003; p.haste = 0; recalcStats(p, true); p.cdr = 0.0004; p.skillDmg = -0.003;
    });
    const copy = await e(() => {
      const p = G.player, cmp = replacedBy(p, window.__r3), T = itemTipRows(p, window.__r3, { w: 308, touch: false, cmp }), TT = itemTipRows(p, window.__r3, { w: 308, touch: true, cmp }), L = itemTipRows(p, window.__r3l, { w: 308 });
      const D = compareDeltas(window.__r3, cmp), rows = statRows(p, false), short = statRows(p, true).map(r => r[0]), skills = TT.rows.find(r => r.k === 'skills');
      const hp = p.equip.weapon.affixes[0];
      return {
        zones: [zoneName('spire'), zoneName('pinewood'), zoneName('caldera'), zoneName('nowhere_land')], found: L.rows.find(r => r.k === 'footer').parts[0],
        negZero: rows.concat(statRows(p, true)).some(r => /-0%/.test(String(r[1]))) || /-0%/.test(affixText('cdr', -0.0004)) || /-0%/.test(affixText('skillDmg', -0.001)), cdr: rows.find(r => r[0] === 'CDR')[1],
        deltas: D.map(d => d.text), nDelta: D.length, labels: rows.map(r => r[0]), short, chip: chipText('hp', 63), unit: affixText('hp', 63), skillNames: skills && skills.skills.length === 3, touchK: TT.rows.map(r => r.k).join(','),
        n: [T.count, TT.count], hasChips: TT.rows.some(r => r.k === 'chips')
      };
    });
    check('R3 #4 copy: zone display names ("Sleepless Spire", not "spire"), no "-0%" anywhere, units on affixes and touch chips ("+63 HP")',
      copy.zones[0] === 'Sleepless Spire' && copy.zones[1] === 'Misty Pinewood' && copy.zones[2] === 'Emberfall Caldera' && copy.zones[3] === 'Nowhere land' && copy.found === 'Found: Sleepless Spire' && !copy.negZero && copy.cdr === '0%' && copy.chip === '+63 HP' && copy.unit === '+63 HP', copy);
    check('R3 #4 compare: up to 3 stat deltas (damage first, with units); Q/E/R names row at touch width; tooltip within 12 lines',
      copy.nDelta >= 1 && copy.nDelta <= 3 && copy.deltas.every(t => /^[+-]\d/.test(t) && !/^[+-]0/.test(t)) && copy.skillNames && copy.hasChips && copy.n.every(n => n <= 12), copy);
    // draw it for real (the compare block, no "vs equipped: <name>" line) and the idle loadout pane
    await e(() => { G.touch = false; IN.device = 'kbm'; openInv('inv'); G.ui.sel = window.__r3; }); await frames(pg1);
    const drawn = await e(() => ({ ids: UI.focus.list.map(r => r.id), tip: true }));
    check('R3 #4 compare: EQUIP / SELL stay below the compare block (no overlap)', drawn.ids.includes('btn:equip') && drawn.ids.includes('btn:sell2'), drawn.ids.length);
    await e(() => { G.ui.sel = null; }); await frames(pg1);
    const idle = await e(() => { const p = G.player; return { shown: Math.abs(G.t - HUD.loadoutT) < 0.2, gap: EQ_POS.belt[1] - (EQ_POS.chest[1] + 48), labels: statRows(p, false).map(r => r[0]), short: statRows(p, true).map(r => r[0]) }; });
    check('R3 #6 inventory idle: loadout summary shows when nothing is selected; belt sits <= 16 px under the boots; full stat words (short only on phone)',
      idle.shown && idle.gap <= 16 && ['Skill dmg', 'Regen', 'Potions', 'Speed'].every(l => idle.labels.includes(l)) && ['SkDmg', 'Rgn', 'Pots', 'Spd'].every(l => idle.short.includes(l)) && !['SkDmg', 'Rgn', 'Pots', 'Spd'].some(l => idle.labels.includes(l)), idle);
    // 5. quest log: only started quests under ACTIVE (no spoilers at level 1); full titles; no "not started"
    const quests = {};
    for (const [k, st] of [['none', {}], ['one', { vale_lantern: { step: 0 } }], ['done', { vale_lantern: 'done', pinewood_foxkit: { step: 1 } }]]) {
      await e(st => { G.player.level = 1; G.prog.quests = st; G.ui.qSel = null; openInv('quests'); }, st); await frames(pg1);
      quests[k] = await e(() => ({ ids: UI.focus.list.map(r => r.id).filter(i => i.startsWith('q:')), head: QUESTS.length }));
    }
    check('R3 #5 quest log: ACTIVE lists only started quests (0 at level 1 with none started, no caldera / spire spoilers); finished ones move to DONE',
      quests.none.ids.length === 0 && quests.one.ids.join() === 'q:vale_lantern' && quests.done.ids.length === 2 && quests.none.head >= 7, quests);
    const titleFmt = await e(() => ({ lines: wrapLines("The Stone's Lost Lantern of the Elder", 'small', 192, 2), ok: !String(drawQuestsTab).includes('not started') }));
    check('R3 #5 quest log: titles wrap to 2 lines; the "not started" state is gone', titleFmt.lines.length <= 2 && titleFmt.ok, titleFmt.lines);
    await e(() => { closeInv(); G.prog.quests = {}; });
    // 8. HUD juice is live: ghost bar after damage, skill-ready flash, HP < 25% pulse, level-up ring (pixel reads on the display canvas)
    const px = (x, y) => e(([x, y]) => { const d = DISP.getContext('2d').getImageData(Math.round(x * HUD_K), Math.round(y * HUD_K), 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);
    await e(() => { const p = G.player; p.hp = p.maxHp; G.t += 0; }); await frames(pg1, 4);
    await e(() => { const p = G.player; p.hp = p.maxHp * 0.7; }); await frames(pg1, 3);
    const ghost = await px(310, 465);
    check('R3 #8 HUD ghost bar: after damage a light fill trails the HP bar (live)', ghost.every(v => v > 170), ghost);
    await e(() => { const p = G.player; p.hp = p.maxHp * 0.2; }); await frames(pg1, 4);
    const red = []; for (let i = 0; i < 12; i++) { red.push((await px(18, 488))[0]); await wait(45); }
    check('R3 #8 HUD low-HP pulse: the portrait frame breathes red at 2 Hz (red channel varies)', Math.max(...red) - Math.min(...red) > 25, red);
    await e(() => { const p = G.player; p.hp = p.maxHp; p.cds = p.cds || {}; p.cds[skillSlotState(p, 'q').id] = 0.25; }); await wait(120);
    const rdy = await e(() => new Promise(r => { let seen = false, n = 0; const f = () => { const h = HUD.ready.q; if (h && h.t != null && G.t - h.t < 0.13) seen = true; if (++n < 40) requestAnimationFrame(f); else r({ seen, cd: G.player.cds.q }); }; requestAnimationFrame(f); }));
    check('R3 #8 skill-ready rim flash fires when a cooldown ends (HUD.ready.q.t within 120 ms)', rdy.seen, rdy);
    const ring = await e(() => { const p = G.player; HUD.lvl.n = p.level; p.level += 1; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }).then(() => px(160, 508));
    check('R3 #8 level-up gold ring is drawn around the XP bar', ring[0] > 200 && ring[1] > 150 && ring[2] < 160, ring);
    await e(() => { G.player.level -= 1; });
    // boss bar, phase model: one full-width bar at frac; n - i filled diamonds, the rest faded; a break (i 1 -> 2) fades the rightmost
    // filled diamond and refills the bar from empty during the transition; no bossBars -> the single bar, no diamonds
    const seg = await e(() => new Promise(r => {
      const keep = window.bossBars, kb = G.boss, out = {}; G.state = 'play';
      G.boss = { hp: 500, maxHp: 1500, dead: false, spawnT: 0, res: {}, stagger: 0, phase2: false, boss: true, x: 0, y: 0, z: 0, type: 'boss', hgt: 3 };
      let st = { n: 3, i: 1, frac: 0.5, transition: false }; window.bossBars = () => st;
      const fr = (n, f) => { const g = () => (--n <= 0 ? f() : requestAnimationFrame(g)); requestAnimationFrame(g); };
      fr(3, () => {
        out.before = Object.assign({}, HUD.bossSegs);
        st = { n: 3, i: 2, frac: 0, transition: true };
        fr(3, () => {
          out.mid = Object.assign({}, HUD.bossSegs); out.midFading = HUD.bossSegs.dia.includes('fading');
          setTimeout(() => {
            st = { n: 3, i: 2, frac: 0.8, transition: false };
            fr(3, () => {
              out.after = Object.assign({}, HUD.bossSegs); window.bossBars = undefined; HUD.bossSegs = null;
              fr(3, () => { out.fallbackNoSegs = !HUD.bossSegs; window.bossBars = keep; G.boss = kb; r(out); });
            });
          }, 700);
        });
      });
    }));
    check('R3 boss bar: n=3 i=1 -> one bar at frac, 2 filled + 1 faded diamond; a break i 1 -> 2 fades the rightmost filled diamond and refills the bar from empty (SHIELDED); after: 1 filled; no bossBars -> single bar',
      seg.before.bar === 0.5 && seg.before.dia.join() === 'full,full,faded' && seg.mid.refill && seg.mid.bar < 0.5 && seg.mid.dia.join() === 'full,fading,faded' && seg.after.dia.join() === 'full,faded,faded' && seg.after.bar === 0.8 && seg.fallbackNoSegs, seg);
    await c1.close();
    // 2. phone portrait: the rotate card flag follows the orientation on a touch device (and never trips on desktop)
    {
      const { c, pg } = await mk({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const up = await pg.evaluate(() => G.portrait);
      await pg.setViewportSize({ width: 844, height: 390 }); await wait(250);
      const side = await pg.evaluate(() => G.portrait);
      await pg.setViewportSize({ width: 390, height: 844 }); await wait(250);
      const again = await pg.evaluate(() => G.portrait);
      const desk = await mk({ viewport: { width: 540, height: 960 } }); const dp = await desk.pg.evaluate(() => G.portrait); await desk.c.close();
      check('R3 #2 portrait: touch device upright -> rotate card; sideways -> no card; a tall desktop window (mouse) never shows it', up === true && side === false && again === true && dp === false, { up, side, again, desktopTall: dp });
      await c.close();
    }
    // 8. title: one box width for slots and entries, 2 px rules, a "?" entry instead of the controls text wall
    {
      const { c, pg } = await mk({ viewport: { width: 960, height: 540 } }, '');
      await pg.evaluate(() => { newGame(); saveGame(); G.state = 'title'; G.save = readSave(); G.ui.slotInfo = null; G.ui.settings = false; G.ui.help = false; });
      await wait(500);
      const t = await pg.evaluate(() => ({ list: UI.focus.list.filter(r => r.id.startsWith('title:')).map(r => ({ id: r.id, w: r.w })), wall: typeof titleControlsHint !== 'undefined' }));
      const ws = [...new Set(t.list.filter(r => /slot|continue|new|settings/.test(r.id)).map(r => r.w))];
      check('R3 #8 title: slot boxes and entries share one width; "?" help entry exists; the controls text wall is gone', ws.length === 1 && t.list.some(r => r.id === 'title:help') && !t.wall, t);
      await pg.evaluate(() => { G.ui.help = true; }); await wait(300);
      const th = await pg.evaluate(() => ({ ids: UI.focus.list.map(r => r.id), started: G.state }));
      check('R3 #8 title "?" opens the help overlay (SETTINGS / CLOSE) without starting the game', th.ids.includes('btn:help-close') && th.started === 'title', th);
      await c.close();
    }
  }
  // ======================= end UI fixes R3 =======================
  // ---------- hit feel (DESIGN §27, meeting 2026-10-20 R1 + R2): hitlag by power, death fling, tumble ----------
  {
    const FEEL_DIR = path.join(__dirname, 'shots', 'm3-feel'); fs.mkdirSync(FEEL_DIR, { recursive: true });
    const injectHF = () => ev(() => {
      // a controlled bench: no crits, no buffs, a 1e6-HP slime so r = dmg / maxHp is chosen exactly (frand +-10 % aside)
      window.__hf = {
        reset() { G.state = 'play'; G.ui.open = false; G.ui.pause = false; G.ui.help = false; G.banner = null; G.enemies.length = 0; G.projs.length = 0; G.zones.length = 0; G.delays.length = 0; resetCorpses(); hitlagReset(); setSetting('hitstop', 'full'); const p = G.player; p.crit = 0; p.critR = null; p.buffs = {}; p.dead = false; p.hp = p.maxHp; },
        mob(type, dx, dy, hp) { const p = G.player, e = spawnEnemy(type, p.x + dx, p.y + dy, 0); e.hp = e.maxHp = hp; e.cd = 9; return e; },
        // the base damage that lands about frac of the target's max HP (measured on a scratch enemy, then scaled)
        base(frac, hp) { const e = __hf.mob('slime', 5, 5, 1e9); damageEnemy(e, 100, {}); const per = (1e9 - e.hp) / 100; G.enemies.splice(G.enemies.indexOf(e), 1); hitlagReset(); return frac * hp / per; },
        steps(n) { for (let i = 0; i < n; i++) { let rdt = STEP; const fr = hitlagStep(); if (G.slowmo > 0) { G.slowmo -= rdt; rdt *= 0.35; } update(fr ? 0 : rdt, rdt); } },
      };
    });
    await injectHF();
    // 1. a 5 % hit freezes the target ~2 steps and no global freeze; a 40 % hit freezes it longer, freezes the world (r >= 0.25: 4)
    //    and tumbles it (stun 0.3, a hop that is a draw offset: e.z untouched); flash, knockback, number size and pitch follow r
    const H = await ev(() => {
      __hf.reset(); const out = {}, pitches = [], keep = AUDIO.sfx;
      AUDIO.sfx = (id, pos, o) => { if (id === 'hit') pitches.push(o && o.pitch || 0); return false; };
      try {
        for (const [k, frac] of [['weak', 0.05], ['heavy', 0.4]]) {
          __hf.reset(); const hp = 1e6, b = __hf.base(frac, hp), e = __hf.mob('slime', 1.2, 0, hp);
          pitches.length = k === 'weak' ? 0 : 1; damageEnemy(e, b, { knock: 0.3 });
          const t = G.texts[G.texts.length - 1];
          const o = { r: +((hp - e.hp) / hp).toFixed(3), ft: e.hitFreeze, fg: G.hitstopF, flash: +e.flash.toFixed(3), kx: +Math.hypot(e.kx, e.ky).toFixed(2), stun: e.stunT, hop: e.hopZ > 0, numR: t && t.r };
          let n = 0; while (e.hitFreeze > 0 && n < 20) { updateEnemies(STEP); n++; }
          o.frozenSteps = n; let maxHop = 0; for (let i = 0; i < 40; i++) { updateEnemies(STEP); maxHop = Math.max(maxHop, e.hopZ); }
          o.maxHop = +maxHop.toFixed(2); o.zKept = Math.abs(e.z - tileH(G.map, e.x, e.y)) < 0.1; out[k] = o;
        }
      } finally { AUDIO.sfx = keep; }
      out.pitches = pitches; return out;
    });
    check('hit feel: a 5 % hit freezes only the target, ~2 steps (no global freeze, no tumble)', H.weak.ft === 2 && H.weak.frozenSteps === 2 && H.weak.fg === 0 && !H.weak.hop, H.weak);
    check('hit feel: a 40 % hit freezes the target longer (4-5 steps) and the world 4 steps (r >= 0.25); it tumbles (0.3 s stun, a hop drawn as an offset, e.z untouched)',
      H.heavy.ft >= 4 && H.heavy.ft <= 5 && H.heavy.frozenSteps === H.heavy.ft && H.heavy.fg === 4 && H.heavy.hop && H.heavy.stun >= 0.29 && H.heavy.maxHop > 0.1 && H.heavy.zKept, H.heavy);
    check('hit feel: companion signals scale with r: flash 0.1 + 0.1r, knockback x(0.7 + 0.6r) (x1.5 tumble), number r carried, hit sound pitched lower',
      Math.abs(H.weak.flash - (0.1 + 0.1 * H.weak.r)) < 0.01 && Math.abs(H.heavy.flash - (0.1 + 0.1 * H.heavy.r)) < 0.01 && H.heavy.kx > H.weak.kx * 1.5 && H.weak.numR < 0.06 && H.heavy.numR > 0.33
      && H.pitches.length === 2 && H.pitches[0] > -60 && H.pitches[1] < -200, { weak: H.weak, heavy: H.heavy, pitches: H.pitches });
    // 1b. a §30 spirit-clone replay (cast src 'echo'): target-only <= 2 steps, never global, no MP, half ult charge
    const Ec = await ev(() => {
      __hf.reset(); const p = G.player, hp = 1e6, b = __hf.base(0.6, hp), e = __hf.mob('slime', 1.2, 0, hp), mp0 = p.mp = 10;
      p.mpHits = []; damageEnemy(e, b, { cast: { basic: true, src: 'echo' } }); const echo = { ft: e.hitFreeze, fg: G.hitstopF, mp: p.mp - mp0 };
      __hf.reset(); const e2 = __hf.mob('slime', 1.2, 0, hp); p.mp = 10; p.ult = 0; p.mpHits = []; damageEnemy(e2, b, { cast: { basic: true } });
      const real = { ft: e2.hitFreeze, fg: G.hitstopF, mp: p.mp - 10 };
      p.ult = 0; damageEnemy(e2, 20, { cast: { basic: true, src: 'echo' } }); echo.ult = p.ult; p.ult = 0; damageEnemy(e2, 20, { cast: { basic: true } }); real.ult = p.ult;   // small hits: the charge never caps
      return { echo, real };
    });
    check('hit feel: a src:echo hit is target-only (2 steps), never a global freeze, gains no MP and half the ult charge',
      Ec.echo.ft === 2 && Ec.echo.fg === 0 && Ec.echo.mp === 0 && Ec.real.fg > 0 && Ec.real.mp > 0 && Ec.echo.ult > 0 && Math.abs(Ec.echo.ult / Ec.real.ult - 0.5) < 0.15, Ec);
    // 2. AoE: one global freeze per cast from the largest r, never per target / summed; every target still gets its own freeze;
    //    hit particles are capped per cast
    const A = await ev(() => {
      __hf.reset(); const p = G.player, hp = 1e6, b = __hf.base(0.3, hp), es = [];
      for (let k = 0; k < 6; k++) es.push(__hf.mob('slime', 1.5 + Math.cos(k) * 0.6, Math.sin(k) * 0.6, hp));
      G.parts.length = 0; const s0 = G.hitstopSpent;
      const n = hitArea(p.x + 1.5, p.y, 1.6, b, {});
      return { n, spent: G.hitstopSpent - s0, fg: G.hitstopF, ft: es.map(e => e.hitFreeze), parts: G.parts.length };
    });
    check('hit feel: AoE cast on 6 targets (r ~0.3) = ONE global freeze of 4 steps (budget charged 4, not 24); each target frozen; <= 24 hit particles',
      A.n === 6 && A.fg === 4 && A.spent === 4 && A.ft.every(f => f >= 3) && A.parts <= 24, A);
    // 3. the budget: 12 global steps per rolling 0.5 s (30 steps); a request over budget becomes target-only
    const B = await ev(() => {
      __hf.reset(); const frozen = [], spent = []; let refused = 0;
      for (let i = 0; i < 120; i++) { if (hitstop(6) < 0) refused++; hitlagBudgetTick(); frozen.push(hitlagStep() ? 1 : 0); spent.push(G.hitstopSpent); }
      let win = 0; for (let i = 0; i + 30 <= frozen.length; i++) { let s = 0; for (let j = i; j < i + 30; j++) s += frozen[j]; win = Math.max(win, s); }
      __hf.reset(); const hp = 1e6, b = __hf.base(0.4, hp), e = __hf.mob('slime', 1.2, 0, hp);
      G.hitstopSpent = 12;   // a saturated window: the 40 % hit's 4-step global request is refused and lands on the target
      damageEnemy(e, b, {});
      return { refused, maxSpent: Math.max(...spent), win, total: frozen.reduce((a, b) => a + b, 0), overF: G.hitstopF === 0, overFt: e.hitFreeze };
    });
    check('hit feel: global freeze budget holds (<= 12 steps granted per rolling 30-step window, max 6 per request + 6 carried); over budget -> target-only',
      B.refused > 0 && B.maxSpent <= 12 && B.win <= 18 && B.total <= 4 * 12 + 6 && B.overF && B.overFt >= 4, B);
    // 4. corpses: a fling for a real hit, a slump for a DoT kill, a squash-pop (no record) for a swarm member, the pool cap,
    //    and loot / XP / counters immediate (e.dead the same step)
    const C = await ev(() => {
      __hf.reset(); const out = {}, p = G.player;
      let e = __hf.mob('slime', 1.2, 0, 100); const k0 = G.kills.any || 0;
      damageEnemy(e, 1e5, {}); out.deadNow = e.dead; out.killedNow = (G.kills.any || 0) === k0 + 1;
      const c = G.corpses[0]; out.fling = c && c.mode; out.vAway = c && c.vx > 0; out.fg = G.hitstopF;
      __hf.steps(20); out.flew = c && Math.hypot(c.x - e.x, c.y - e.y); out.inList = G.enemies.includes(e);
      e = __hf.mob('slime', -1.2, 0, 100); damageEnemy(e, 1e5, { dot: true }); out.dot = G.corpses[G.corpses.length - 1].mode;
      const n0 = G.corpses.length, sw = spawnEnemy('dreammoth', p.x + 2, p.y + 2, 0), mem = G.enemies.filter(q => q.swarm === sw.swarm);
      damageEnemy(mem[1], 1e6, {}); out.swarmNoCorpse = G.corpses.length === n0; out.pop = G.effects.some(f => f.type === 'ghost' && f.sq);
      for (let k = 0; k < 20; k++) { const m = __hf.mob('slime', 1 + (k % 5) * 0.3, (k / 5 | 0) * 0.3, 50); damageEnemy(m, 1e5, {}); }
      out.cap = CORPSE.cap; out.n = G.corpses.length; out.pooled = G.corpses.length + CORPSE.pool.length;
      __hf.steps(90); out.after = G.corpses.length; out.poolBack = CORPSE.pool.length;
      return out;
    });
    check('hit feel R1: a kill flings a corpse away from the hit (pooled record, e.dead + kill counted the same step; an r = 1 kill freezes 6 steps); DoT kill slumps; a swarm member squash-pops with no record',
      C.deadNow && C.killedNow && C.fling === 'fling' && C.vAway && C.flew > 0.3 && C.fg === 6 && !C.inList && C.dot === 'slump' && C.swarmNoCorpse && C.pop, C);
    check(`hit feel R1: corpse cap holds (desktop ${C.cap}): 22 kills keep ${C.cap} records, the pool never grows, all return after they dissolve`,
      C.cap === 12 && C.n === 12 && C.pooled === 12 && C.after === 0 && C.poolBack === 12, C);
    // 5. boss death: the 15-step freeze is ~0.25 s of real time inside the boss slow-mo (the old loop stretched it to ~0.7 s);
    //    the boss holds a death pose (no fling)
    const D = await ev(() => new Promise(res => {
      __hf.reset(); const p = G.player, b = spawnEnemy('boss', p.x + 3, p.y, 0); b.cd = 9;
      b.hp = 0; killEnemy(b, b.maxHp, {});   // the killing-blow path (damageEnemy -> killEnemy), past any phase gate
      const c = G.corpses.find(q => q.e === b), t0 = performance.now(), f0 = G.hitstopF;
      const tick = () => { if (G.hitstopF > 0 && performance.now() - t0 < 3000) requestAnimationFrame(tick); else res({ f0, ms: Math.round(performance.now() - t0), slowmo: G.slowmo > 0, mode: c && c.mode, still: c && c.vx === 0 && c.vy === 0 }); };
      requestAnimationFrame(tick);
    }));
    check('hit feel: boss death freeze = 15 steps ~0.25 s real time under slow-mo (was ~0.7 s); the boss holds a death pose, no fling',
      D.f0 === 15 && D.ms >= 180 && D.ms <= 340 && D.slowmo && D.mode === 'boss' && D.still, D);
    // 6. settings: the old boolean migrates before validation (applySettings / setSetting / the stored localStorage block);
    //    Off = no global freeze, target 2 steps, signals still scale; Light caps the global freeze at 3
    const S = await ev(() => {
      const out = {};
      applySettings(Object.assign(settingsData(), { hitstop: false })); out.applyFalse = SETTINGS.hitstop;
      applySettings(Object.assign(settingsData(), { hitstop: true })); out.applyTrue = SETTINGS.hitstop;
      out.setFalse = setSetting('hitstop', false); out.setLight = setSetting('hitstop', 'light'); out.bad = setSetting('hitstop', 'loud');
      const run = mode => { __hf.reset(); setSetting('hitstop', mode); const hp = 1e6, b = __hf.base(0.7, hp), e = __hf.mob('slime', 1.2, 0, hp); damageEnemy(e, b, { knock: 0.3 }); return { fg: G.hitstopF, ft: e.hitFreeze, flash: +e.flash.toFixed(2), kx: +Math.hypot(e.kx, e.ky).toFixed(2) }; };
      out.off = run('off'); out.light = run('light'); out.full = run('full');
      const s = settingsData(); s.hitstop = false; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
      return out;
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    S.stored = await ev(() => { const v = SETTINGS.hitstop; setSetting('hitstop', 'full'); return v; });
    check('hit feel: setting hitstop Off / Light / Full; boolean true -> full, false -> off (apply, set, stored block) BEFORE validation; Off: no global, target 2, flash + knockback still scale; Light caps the global at 3',
      S.applyFalse === 'off' && S.applyTrue === 'full' && S.setFalse === 'off' && S.setLight === 'light' && S.bad === 'full' && S.stored === 'off'
      && S.off.fg === 0 && S.off.ft === 2 && S.off.flash > 0.15 && S.off.kx > 4 && S.light.fg === 3 && S.full.fg === 6, S);
    // 7. frame strips (tools/shots/m3-feel): a weak hit, a heavy hit (tumble), a kill fling, on the freshly reloaded page; the loop
    //    is paused and stepped by hand, one screenshot per listed step count
    await injectHF();
    const shotFrames = async (name, setup, plan) => {
      await ev(setup);
      const files = [];
      for (const [i, n] of plan.entries()) {
        await ev(n => { __hf.steps(n); render(); }, n);
        const f = path.join(FEEL_DIR, `${name}-${String(i).padStart(2, '0')}.png`); await page.screenshot({ path: f, clip: { x: 420, y: 140, width: 380, height: 200 } }); files.push(f);
      }
      return files;
    };
    await ev(() => { running = false; });
    await wait(100);
    const clean = 'G.drops.length = 0; G.texts.length = 0; G.banner = null; G.msg = null; G.effects.length = 0; G.parts.length = 0;';
    const setupHit = frac => `(() => { __hf.reset(); ${clean} const hp = 1e6, b = __hf.base(${frac}, hp); G.texts.length = 0; const p = G.player; G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
      const e = __hf.mob('thornbackboar', 1.9, -0.9, hp); e.state = 'idle'; __hf.steps(2); damageEnemy(e, b, { knock: 0.4 }); })()`;
    const weak = await shotFrames('1-weak-hit', setupHit(0.05), [0, 1, 1, 1, 2, 4]);
    const heavy = await shotFrames('2-heavy-hit', setupHit(0.4), [0, 2, 2, 3, 3, 4, 6, 10]);
    const kill = await shotFrames('3-kill-fling', `(() => { __hf.reset(); ${clean} const p = G.player; G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y, p.z) - 12;
      const e = __hf.mob('thornbackboar', 1.5, -0.8, 300); const s = __hf.mob('slime', 1.4, 0.2, 300); __hf.steps(2); damageEnemy(e, 5000, { knock: 0.4 }); damageEnemy(s, 5000, { knock: 0.4 }); })()`, [0, 3, 4, 5, 6, 6, 6, 8, 8, 10]);
    await ev(() => { running = true; last = performance.now(); acc = 0; requestAnimationFrame(loop); });
    // one strip per sequence (frames left to right) for review
    const strip = (files, out) => require('child_process').spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nim=[Image.open(f) for f in fs]\nw,h=im[0].size\ns=Image.new('RGB',(w*len(im),h))\nfor i,m in enumerate(im): s.paste(m,(i*w,0))\ns.save(sys.argv[1])`, out, ...files]);
    const st = [strip(weak, path.join(FEEL_DIR, 'strip-1-weak-hit.png')), strip(heavy, path.join(FEEL_DIR, 'strip-2-heavy-hit.png')), strip(kill, path.join(FEEL_DIR, 'strip-3-kill-fling.png'))];
    check('hit feel: frame strips written to tools/shots/m3-feel (weak hit, heavy hit, kill fling)', weak.length && heavy.length && kill.length && fs.existsSync(path.join(FEEL_DIR, 'strip-3-kill-fling.png')), { frames: weak.length + heavy.length + kill.length, strips: st.map(s => s.status) });
    // 8. phone caps: the corpse pool is 8
    {
      const pp = await br.newPage({ viewport: { width: 960, height: 540 } }); pp.on('pageerror', e => errs.push('pageerror(feel phone): ' + e.message));
      await pp.goto(`${base}/index.html?scene=play&phone=1`, { waitUntil: 'load' });
      await pp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
      const ph = await pp.evaluate(() => { G.enemies.length = 0; const p = G.player; for (let k = 0; k < 12; k++) { const e = spawnEnemy('slime', p.x + 1 + k * 0.1, p.y, 0); e.hp = e.maxHp = 50; damageEnemy(e, 1e5, {}); } return { cap: CORPSE.cap, n: G.corpses.length, pooled: G.corpses.length + CORPSE.pool.length }; });
      check('hit feel: phone corpse cap 8 (12 kills keep 8 records)', ph.cap === 8 && ph.n === 8 && ph.pooled === 8, ph);
      await pp.close();
    }
  }
  // ---------- boss phases (§26.1 multi-bar phases, cunning forms, fairness; bosses.js / enemydata.js) ----------
  {
    const bp = await br.newPage({ viewport: { width: 960, height: 540 } }); bp.on('pageerror', e => errs.push('pageerror(boss phases): ' + e.message));
    await bp.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
    await bp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const w = ms => bp.evaluate(ms => new Promise(r => setTimeout(r, ms)), ms);
    const bars = await bp.evaluate(() => {
      G.enemies.length = 0; G.effects.length = 0; const p = G.player; p.invulnT = 999;
      const m = BOSSES.mossjaw, bh = BOSSES.bramblehorn, b = spawnEnemy('bramblehorn', p.x + 6, p.y, 0); b.spawnT = 0; b.cd = 99; G.boss = b;
      const bb0 = bossBars(b), hp0 = b.hp;
      const r1 = damageEnemy(b, 1e7, { el: 'fire' }); const bb1 = bossBars(b), f1 = b.hp / b.maxHp;
      const r2 = damageEnemy(b, 1e7, { el: 'fire' }); const hp2 = b.hp;   // inside the transition: invulnerable
      window.__bph = { b };
      return { p3: bh.phases[2].hpBelow, mBars: m.bars && m.phases.length, bBars: bh.bars && bh.phases.length, total: b.maxHp === hp0, bb0, r1, bb1, f1, floor: bh.phases[1].hpBelow, r2, same: hp2 === b.hp && Math.abs(hp2 - b.maxHp * bh.phases[1].hpBelow) < 1,
        warden: bossBars(spawnEnemy('boss', p.x - 8, p.y, 0)).n, lastBar: G.lastBar && G.lastBar.bar };
    });
    await w(1800);
    const bars2 = await bp.evaluate(() => {
      const b = window.__bph.b, bb = bossBars(b), r = damageEnemy(b, 10, { el: 'fire' }), hp = b.hp;
      damageEnemy(b, 1e7, { el: 'fire' }); const bb3 = bossBars(b);   // bar 2 -> clamps at bar 3's top
      return { transOver: bb.transition === 0, hits: r && hp < b.maxHp * BOSSES.bramblehorn.phases[1].hpBelow, i2: bb3.i, f2: +(b.hp / b.maxHp).toFixed(3), max2: Math.round(bb3.max), alive: !b.dead };
    });
    await w(1800);
    const bars3 = await bp.evaluate(() => { const b = window.__bph.b; damageEnemy(b, 1e8, { el: 'fire' }); const out = { dead: b.dead }; G.enemies.length = 0; G.boss = null; G.effects.length = 0; return out; });
    check('boss phases: Mossjaw 2 bars, Bramblehorn 3; e.maxHp = total; one 1e7 hit clamps at bar 1\'s end (no skipped phase) and starts a 1.2-1.8 s invulnerable transition; bar 2 clamps too; the last bar kills; bossBars { n, i, frac, max, transition }; the Warden stays 1 bar',
      bars.mBars === 2 && bars.bBars === 3 && bars.total && bars.bb0.n === 3 && bars.bb0.i === 0 && bars.bb0.frac > 0.999 && Math.abs(bars.bb0.max - bars.bb1.max * (1 - bars.floor) / (bars.floor - bars.p3)) < 2 && bars.r1 === true && bars.bb1.i === 1 && Math.abs(bars.f1 - bars.floor) < 1e-3
        && bars.bb1.transition >= 1.2 && bars.bb1.transition <= 1.8 && bars.r2 === false && bars.same && bars.lastBar === 1 && bars.warden === 1
        && bars2.transOver && bars2.hits && bars2.i2 === 2 && Math.abs(bars2.f2 - bars.p3) < 2e-3 && bars2.alive && bars3.dead, { bars, bars2, bars3 });
    // cunning forms: Mossjaw bar 2 lunge feint (fake wind-up, then the real one); Bramblehorn bar 2 trunkSwipe -> backhand (delayed second hit); bar 3 rootGrab lead-aim
    const cun = await bp.evaluate(async () => {
      const wt = ms => new Promise(r => setTimeout(r, ms)), p = G.player, out = {}; p.invulnT = 999; G.enemies.length = 0; G.effects.length = 0;
      const m = spawnEnemy('mossjaw', p.x + 5, p.y, 0); m.spawnT = 0; m.cd = 99; m.hp = m.maxHp * 0.4; await wt(100);
      m.bk.mv = null; m.bk.queue.length = 0; m.cd = 99; startMove(m, 'lunge'); out.feint = G.lastWarn.feint; out.tele0 = G.effects.some(e => e.type === 'tele' && e.src === m);
      for (let k = 0; k < 30 && !G.lastWarn.afterFeint; k++) await wt(50); out.feintAt = +(G.t - G.lastWarn.t).toFixed(2); out.afterFeint = !!G.lastWarn.afterFeint && G.lastWarn.move === 'lunge'; out.realWind = G.lastWarn.wind; out.phaseM = m.bk.phase; G.enemies.length = 0; G.effects.length = 0;
      const b = spawnEnemy('bramblehorn', p.x + 2, p.y, 0); b.spawnT = 0; b.hp = b.maxHp * 0.5; await wt(100);
      b.bk.mv = null; b.bk.queue.length = 0; b.cd = 99; startMove(b, 'trunkSwipe'); out.then = G.lastWarn.then; out.p2 = b.bk.phase;
      await wt(1700); out.second = G.lastWarn.move;
      b.hp = b.maxHp * 0.2; await wt(100); b.bk.mv = null; b.bk.queue.length = 0; b.cd = 99; G.effects.length = 0;
      b.bk.pv = { x: p.x, y: p.y, vx: 0, vy: 3 }; startMove(b, 'rootGrab'); const t = G.effects.find(e => e.type === 'tele' && e.src === b && e.kind === 'line');
      out.lead = G.lastWarn.lead; out.p3 = b.bk.phase; out.leadOff = t ? Math.abs(angDiff(t.ang, Math.atan2(p.y - b.y, p.x - b.x))) : 0;
      out.fair = bossFairness('mossjaw').length + bossFairness('bramblehorn').length;
      BOSSES.__ft = { kind: 'mini', bars: true, transition: 2.5, r: 0.9, moveDefs: { c: { type: 'cone', arc: 100, r: 3, wind: 0.6, feint: 0.2, open: 1.2 }, l: { type: 'line', w: 0.6, wind: 0.8, lead: 0.9 } },
        phases: [{ hpBelow: 1, moves: { c: 1 }, forms: {} }, { hpBelow: 0.5, moves: { c: 1, l: 1 }, forms: {} }] };
      out.rules = bossFairness('__ft').map(f => f.rule.split(':')[0].split(' ')[0]).sort().join(); delete BOSSES.__ft;
      G.enemies.length = 0; G.boss = null; G.effects.length = 0; return out;
    });
    check('boss phases: cunning forms — Mossjaw bar 2 lunge feints (0.4 s fake, re-aimed real wind-up >= 0.55 s); Bramblehorn bar 2 trunkSwipe -> backhand; bar 3 rootGrab lead-aims; bossFairness clean for both and flags fast cones (walk-out), short feints, long leads, bad transitions, missing onEnter',
      cun.feint === 0.4 && cun.tele0 && cun.afterFeint && cun.realWind >= 0.55 && cun.phaseM === 1 && cun.then === 'backhand' && cun.p2 === 1 && cun.second === 'backhand' && cun.lead === 0.45 && cun.p3 === 2 && cun.leadOff > 0.05 && cun.fair === 0
        && ['a', 'bar', 'feint', 'lead-aim', 'walk-out'].every(k => cun.rules.split(',').includes(k)), cun);
    // the tamed howl (QA run-big M3): at most 2 hounds, a 12 s rest, hounds -20 % HP / -30 % bite, a readable cue, and they flee when Mossjaw dies
    const howl = await bp.evaluate(async () => {
      const wt = ms => new Promise(r => setTimeout(r, ms)), p = G.player, out = {}; p.invulnT = 999; G.enemies.length = 0; G.effects.length = 0; G.shrink = null;   // Bramblehorn's root ring from the check above
      const m = spawnEnemy('mossjaw', p.x + 2, p.y, 0); m.spawnT = 0; m.hp = m.maxHp * 0.4; syncPhase(m); await wt(100); m.bk.mv = null; m.bk.queue.length = 0; m.cd = 99;
      startMove(m, 'howl'); out.wind = G.lastWarn.wind; out.sfx = G.lastWarn.sfx; out.rest = +(m.bk.rest.howl - G.t).toFixed(1); await wt(1300);
      const hs = G.enemies.filter(e => e.summoner === m && !e.dead), base = Math.round(ENEMY.shadehound.hp * enemyHpMul(hs[0] ? hs[0].lvl : 1));
      out.n = hs.length; out.hpK = hs[0] ? +(hs[0].maxHp / base).toFixed(2) : 0; out.dmK = hs[0] ? +(hs[0].dm / enemyDmgMul(hs[0].lvl)).toFixed(2) : 0;
      out.max = BOSSES.mossjaw.moveDefs.howl.max;
      m.bk.rest.howl = 0; m.bk.mv = null; m.cd = 99; startMove(m, 'howl'); await wt(1300); out.capped = G.enemies.filter(e => e.summoner === m && !e.dead).length;
      m.hp = 1; m.bk.transT = 0; damageEnemy(m, 1e6, { el: 'fire' }); out.bossDead = m.dead; for (let k = 0; k < 40 && G.enemies.some(e => e.summoner === m && !e.dead); k++) await wt(100); /* the boss-death slowmo stretches the 1.2 s flee */ out.left = G.enemies.filter(e => e.summoner === m && !e.dead).length;
      G.enemies.length = 0; G.boss = null; G.effects.length = 0; return out;
    });
    check('boss phases: Mossjaw howl — max 2 hounds (a recast at 2 adds none), 12 s rest, hounds x0.8 HP / x0.7 bite, cue >= 0.55 s, hounds flee + despawn on the boss death',
      howl.n === 2 && howl.max === 2 && howl.capped === 2 && howl.rest >= 11.5 && howl.hpK > 0.75 && howl.hpK < 0.85 && Math.abs(howl.dmK - 0.7) < 0.02 && howl.wind >= 0.55 && howl.bossDead && howl.left === 0, howl);
    await bp.close();
  }
  // ---------- §30 Echo: the spirit clone (game.js ECHO, rule 'echo'; render.js drawEcho; strip: tools/shots/m3-echo) ----------
  {
    const ECHO_DIR = path.join(__dirname, 'shots', 'm3-echo'); fs.mkdirSync(ECHO_DIR, { recursive: true });
    const xp = await br.newPage({ viewport: { width: 960, height: 540 } }); xp.on('pageerror', e => errs.push('pageerror(echo): ' + e.message));
    await xp.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
    await xp.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await xp.evaluate(() => { running = false; });
    await wait(100);
    const X = await xp.evaluate(() => {
      const p = G.player, out = {};
      const steps = (n, vx = 0) => { for (let i = 0; i < n; i++) { const fr = hitlagStep(); if (vx) p.x += vx; update(fr ? 0 : STEP, STEP); } };
      const attackStep = () => { const h = IN.held; IN.held = a => a === 'attack'; try { steps(1); } finally { IN.held = h; } };   // a basic attack inside a game step (handleInput -> playerActions)
      const reset = () => { G.state = 'play'; G.ui.open = false; G.banner = null; G.msg = null; G.enemies.length = 0; G.projs.length = 0; G.zones.length = 0; G.delays.length = 0; G.effects.length = 0; G.echo = null;
        hitlagReset(); p.cast = null; p.dash = null; p.atkT = 0; p.cds = {}; p.buffs = {}; p.invulnT = 999; p.mp = p.maxMp; p.ult = 0; p.crit = 0; p.critR = null; p.autoAtk = false; };
      // the unique: a Legendary on the finder's own weapon variant, rule + unique 'echo', the 19th unique
      p.equip.weapon = makeItem('dawnblade', 'rare', 12); recalcStats(p, true);
      const U = makeUnique('echo', 24); out.item = { unique: U.unique, rule: U.rule, rarity: U.rarity, variant: BASES[U.base].variant, hero: p.gear.weapon, name: itemName(U), slot: U.slot,
        count: Object.keys(UNIQUES).length + TRINKET_UNIQUES.length + WORLD_UNIQUES.length };
      // the Act III+ gate: a boss-class first kill below L17 drops nothing extra, at L17+ once per save
      G.prog.secrets = G.prog.secrets || {}; delete G.prog.secrets['unique:echo'];
      out.gate = [lateUniqueDrop({ lvl: 12 }, 'boss'), lateUniqueDrop({ lvl: 20 }, 'elite'), lateUniqueDrop({ lvl: 20 }, 'boss'), lateUniqueDrop({ lvl: 30 }, 'boss')];
      delete G.prog.secrets['unique:echo'];
      p.equip.weapon.rule = 'echo';
      const Q = slotSkill(p, 'q'), E = slotSkill(p, 'e'); out.q = Q; out.e = E;
      // 1. spawn delay: the spirit forms on the 24th fixed step (0.4 s) after the attack, where the hero stood then
      reset(); p.aim = 0; G.mouse.wx = p.x + 3; G.mouse.wy = p.y; attackStep(); const x0 = p.x, s1 = { alive: !!(G.echo && G.echo.alive), n: G.echo ? G.echo.count : -1, q: G.echo ? G.echo.q.length : 0 };
      let k = 0; while (k < 60 && !(G.echo && G.echo.count)) { steps(1, 0.05); k++; }
      out.spawn = { s1, steps: k, at: { x: +G.echo.g.x.toFixed(2), x0: +x0.toFixed(2) }, heroX: +(p.x - x0).toFixed(2) };
      // 2. replay order: basic, Q, E in succession, replayed in the same order; the queue holds at most 4 (the oldest dropped)
      reset(); const ord = []; const D0 = damageEnemy;
      p.aim = 0; basicAttack(p); steps(2); p.cast = null; p.dash = null; useSkill(p, 'q'); steps(2); p.cast = null; p.dash = null; p.swing = null; useSkill(p, 'e'); out.qLen = G.echo.q.map(r => r.slot).join();
      steps(60); out.order = G.echo.log.slice();
      reset(); for (let i = 0; i < 6; i++) { p.atkT = 0; p.cast = null; basicAttack(p); } out.queued = G.echo.q.length; steps(40); out.replayed6 = G.echo.count;
      // 3. never R: an ultimate is not recorded or replayed
      reset(); p.ult = 100; const okR = useSkill(p, 'r'); out.r = { cast: okR, queued: G.echo ? G.echo.q.length : 0 }; steps(40); out.r.replays = G.echo ? G.echo.count : 0;
      // 4. retyping: the hero's most-amplified element, arcane when none; never slash
      reset(); const sum = p.sum, keep = Object.assign({}, sum); for (const el of DMG_ELS) sum[el + 'Dmg'] = 0; p.amp = {};
      out.el0 = echoElement(p); sum.fireDmg = 0.1; sum.frostDmg = 0.3; sum.slashDmg = 0.9; out.el1 = echoElement(p); sum.slashDmg = 0;
      const hits = []; damageEnemy = function (e, b, o = {}) { const c = o.cast !== undefined ? o.cast : CAST; const h0 = e.hp, r = D0(e, b, o); hits.push({ echo: !!(c && c.src === 'echo'), el: c && c.el, dmg: h0 - e.hp }); return r; };
      const m = spawnEnemy('slime', p.x + 1.1, p.y, 0); m.hp = m.maxHp = 1e9; m.res = {}; m.cd = 99; m.stunT = 99;
      p.aim = 0; basicAttack(p); steps(40); damageEnemy = D0;
      const hh = hits.filter(h => h.echo), hr = hits.filter(h => !h.echo);
      out.retype = { echoHits: hh.length, els: [...new Set(hh.map(h => h.el))].join(), heroEl: hr.length && hr[0].el, ratio: hh.length && hr.length ? +(hh[0].dmg / hr[0].dmg).toFixed(2) : 0, kf: +(ECHO.k * echoFocus(p, 'frost')).toFixed(2) };
      Object.assign(sum, keep);
      // 5. the §27 echo guard on a replayed hit: no MP, half (k-scaled) ult charge, target-only freeze <= 2, no global freeze, no
      //    'hit' EFFECTS, no skill-rank progress, no Veil consumed; a replayed dash moves the spirit, never the hero; not a summon
      reset(); const m2 = spawnEnemy('slime', p.x + 1.1, p.y, 0); m2.hp = m2.maxHp = 1e9; m2.res = {}; m2.cd = 99; m2.stunT = 99;
      const ranks0 = (p.ranks[Q] && p.ranks[Q].hits) || 0, E0 = emitEffects, fxHit = []; emitEffects = (w, c) => { if (w === 'hit' && c.cast && c.cast.src === 'echo') fxHit.push(c); return E0(w, c); };
      p.aim = 0; useSkill(p, 'q');   // the hero's own Sunslash lands now (its MP / charge / rank before the snapshot)
      const ranks1 = (p.ranks[Q] && p.ranks[Q].hits) || 0, mpR = p.mpRegen; p.mpRegen = 0;
      p.mp = 10; p.mpHits = []; p.ult = 0; hitlagReset(); m2.hitFreeze = 0; p.buffs.veil = { t: 9, max: 9 }; const hx = p.x, hy = p.y; let maxF = 0, maxG = 0, n0 = G.echo.count;
      for (let i = 0; i < 30; i++) { steps(1); maxF = Math.max(maxF, m2.hitFreeze || 0); maxG = Math.max(maxG, G.hitstopF); }
      emitEffects = E0; p.mpRegen = mpR;
      out.guard = { replays: G.echo.count - n0, mp: +(p.mp - 10).toFixed(3), ult: +p.ult.toFixed(3), maxF, maxG, fxHit: fxHit.length, rank: ((p.ranks[Q] && p.ranks[Q].hits) || 0) - ranks1, heroRank: ranks1 - ranks0, veil: !!p.buffs.veil, heroMoved: +Math.hypot(p.x - hx, p.y - hy).toFixed(3),
        hpLost: m2.maxHp - m2.hp > 0, summon: G.enemies.includes(G.echo.g) || !!(G.summons && G.summons.includes(G.echo.g)) };
      // a dash skill replayed by the spirit: the hero stays put
      const dashId = ['dashstrike', 'heroic', 'tumble'].find(id => SKILLS[id]); reset(); const g0 = echoState(p).g; const hx2 = p.x; echoReplay(p, G.echo, { id: dashId, slot: 'e', basic: false, a: 0, dx: 0, dy: 0, combo: 0, ctx: newCtx(SKILLS[dashId].element) });
      steps(30); out.dash = { id: dashId, heroMoved: +Math.abs(p.x - hx2).toFixed(3), spiritDash: g0 === G.echo.g };
      // 6. fade: full alpha while idle < 1.5 s, fading over the last 0.5 s, gone after 2 s idle; it re-forms on the next attack
      reset(); p.aim = 0; attackStep(); steps(24); const a0 = G.echo.alive; steps(60); const a1 = G.echo.alpha; steps(45); const a2 = G.echo.alpha; steps(20); const a3 = G.echo.alive;
      p.atkT = 0; attackStep(); steps(24); out.fade = { a0, a1: +a1.toFixed(2), a2: +a2.toFixed(2), gone: !a3, reform: G.echo.alive, count: G.echo.count };
      // 7. the rule off: no state, no ring
      reset(); p.equip.weapon.rule = null; basicAttack(p); steps(30); out.off = G.echo === null;
      p.equip.weapon.rule = 'echo'; reset();
      return out;
    });
    check('echo: the 19th unique (Twice-Told): a Legendary weapon with rule + unique "echo" on the finder\'s own weapon variant; drops once on a boss-class kill at L17+ (Act III)',
      X.item.unique === 'echo' && X.item.rule === 'echo' && X.item.rarity === 'legendary' && X.item.slot === 'weapon' && X.item.variant === X.item.hero && X.item.name === 'Twice-Told' && X.item.count <= 19
      && X.gate[0] === null && X.gate[1] === null && X.gate[2] === 'echo' && X.gate[3] === null, { item: X.item, gate: X.gate });
    check('echo: the spirit forms 0.4 s (24 fixed steps) after the attack, standing where the hero stood then (an after-image: it trails a moving hero)',
      !X.spawn.s1.alive && X.spawn.s1.n === 0 && X.spawn.s1.q === 1 && X.spawn.steps === 24 && Math.abs(X.spawn.at.x - X.spawn.at.x0) < 0.06 && X.spawn.heroX > 1, X.spawn);
    check('echo: replays basic, Q, E in the order cast; the queue holds 4 (6 rapid basics replay 4)',
      X.qLen === 'lmb,q,e' && X.order.join() === ['lmb', X.q, X.e].join() && X.queued === 4 && X.replayed6 === 4, { qLen: X.qLen, order: X.order, queued: X.queued, replayed6: X.replayed6 });
    check('echo: never R (an ultimate is neither recorded nor replayed)', X.r.cast && X.r.queued === 0 && X.r.replays === 0, X.r);
    check('echo: retyped to the most-amplified element (arcane with none, never slash); a replayed hit is that element at k x focus of the hero\'s hit',
      X.el0 === 'arcane' && X.el1 === 'frost' && X.retype.echoHits >= 1 && X.retype.els === 'frost' && X.retype.heroEl === 'slash' && X.retype.ratio > X.retype.kf * 0.7 && X.retype.ratio < X.retype.kf * 1.6, { el0: X.el0, el1: X.el1, retype: X.retype });
    check('echo: the §27 guard on replayed hits: no MP, half k-scaled ult charge, target-only freeze <= 2, no global freeze, no "hit" EFFECTS, no skill ranks, Veil kept, hero unmoved, not a summon; a replayed dash moves only the spirit',
      X.guard.replays >= 1 && X.guard.hpLost && X.guard.mp === 0 && X.guard.ult > 0 && X.guard.maxF <= 2 && X.guard.maxF >= 1 && X.guard.maxG === 0 && X.guard.fxHit === 0 && X.guard.rank === 0 && X.guard.veil
      && X.guard.heroMoved === 0 && !X.guard.summon && X.dash.heroMoved === 0 && X.dash.spiritDash, { guard: X.guard, dash: X.dash });
    check('echo: fades after 2 s idle (full until 1.5 s, then fading) and re-forms on the next attack; no state without the rule',
      X.fade.a0 && X.fade.a1 === 1 && X.fade.a2 > 0 && X.fade.a2 < 1 && X.fade.gone && X.fade.reform && X.off, { fade: X.fade, off: X.off });
    // the strip: the hero walks right swinging; the spirit trails 0.4 s behind, replaying each swing in the echo's element
    const files = [];
    await xp.evaluate(() => {
      const p = G.player; G.enemies.length = 0; G.projs.length = 0; G.effects.length = 0; G.parts.length = 0; G.texts.length = 0; G.drops.length = 0; G.echo = null; G.banner = null; G.msg = null;
      p.sum.fireDmg = 0.35; p.cast = null; p.atkT = 0; p.aim = 0; p.face = 1; p.invulnT = 999;
      for (let k = 0; k < 3; k++) { const e = spawnEnemy('thornbackboar', p.x + 1.4 - k * 0.5, p.y + 0.6 + k * 1.3, 0); e.hp = e.maxHp = 1e9; e.cd = 99; e.stunT = 99; e.state = 'idle'; }
      window.__es = (n) => { for (let i = 0; i < n; i++) { const fr = hitlagStep(); if (!fr) { p.x -= 0.03; p.y += 0.06; p.moving = true; p.walkT += STEP; } if (p.atkT <= 0 && !p.cast) { p.aim = 0; basicAttack(p); } update(fr ? 0 : STEP, STEP); p.moving = true; } G.cam.x = isoX(p.x, p.y) - 20; G.cam.y = isoY(p.x, p.y, p.z) - 12; render(); };
    });
    for (const [i, n] of [20, 6, 6, 6, 6, 6, 6, 6].entries()) {
      await xp.evaluate(n => __es(n), n);
      const f = path.join(ECHO_DIR, `echo-${String(i).padStart(2, '0')}.png`); await xp.screenshot({ path: f, clip: { x: 300, y: 130, width: 360, height: 220 } }); files.push(f);
    }
    const alive = await xp.evaluate(() => !!(G.echo && G.echo.alive && G.echo.count > 0));
    const strip = require('child_process').spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nim=[Image.open(f) for f in fs]\nw,h=im[0].size\ns=Image.new('RGB',(w*len(im),h))\nfor i,m in enumerate(im): s.paste(m,(i*w,0))\ns.save(sys.argv[1])`, path.join(ECHO_DIR, 'strip-echo.png'), ...files]);
    check('echo: frame strip written to tools/shots/m3-echo (8 frames, the spirit replaying the hero\'s swings)', alive && files.length === 8 && strip.status === 0 && fs.existsSync(path.join(ECHO_DIR, 'strip-echo.png')), { frames: files.length, alive, status: strip.status });
    await xp.close();
  }
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll play checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
