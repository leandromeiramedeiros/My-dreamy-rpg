#!/usr/bin/env node
'use strict';
// M2a play test: drives the real game in headless Chromium through the action layer.
//  1. synthetic gamepad (navigator.getGamepads stub): move, twin-stick aim, attack, Interact a chest,
//     open the inventory, navigate the bag grid with the d-pad, close with B
//  2. device switching: prompt glyphs on the skill bar + the interact prompt change kbm -> pad (Xbox, PS) -> touch
//  3. combat feel (§15.3): MP on basic hits, ultimate charge gate, dodge-cancel refund, skill ranks
//  4. rebinding round-trip through the save, and a v2 -> v3 save migration with no data loss
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
  const sel = await ev(() => { const list = UI.focus.list; const r = list.find(q => q.x >= 316 && q.y >= 78); if (r) UI.focus.set(r.id, true); return r && r.id; });
  await tap(0); await wait(60);
  check('pad: A selects the focused bag item', await ev(() => G.ui.sel != null), sel);
  check('focus ring is drawn on pad', await ev(() => UI.focus.showing()));
  await tap(5); await wait(80);
  check('pad: RB switches tab', await ev(() => G.ui.tab === 'skills'));
  await tap(1);   // B
  await wait(120);
  check('pad: B closes the inventory', await ev(() => G.ui.open === false));
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
