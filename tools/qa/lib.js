'use strict';
// tools/qa/lib.js -- QA play-test harness: launches the real game (file://) in Chromium, installs OBSERVER-ONLY hooks,
// and provides a bot that plays through real inputs (keyboard + mouse, gamepad stub, or touch). No teleports, no god mode.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..'), QA = __dirname, SHOTS = path.join(QA, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAD_STUB = () => {
  const mk = id => ({ id, index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
  window.__pad = mk('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)');
  window.__padOn = false;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__padOn ? window.__pad : null] });
  window.__btn = (i, on) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; window.__padOn = true; };
  window.__axes = a => { window.__pad.axes = a.slice(); window.__padOn = true; };
};

// ---------------------------------------------------------------- in-page instrumentation (observe only)
function installHooks() {
  const Q = window.__qa = { ev: [], fr: [], kills: {}, dmg: [], talks: [], loots: [], t0: performance.now() };
  const log = (k, o) => Q.ev.push(Object.assign({ k, gt: +G.t.toFixed(2), map: G.map && G.map.id }, o));
  const ra = runAction; window.runAction = a => { log('action', { type: a.type, id: a.id || a.pack || a.enemy || undefined, text: a.text || a.title || undefined }); return ra(a); };
  const tk = talk; window.talk = a => { const D = a.id && DIALOGUE[a.id]; log('talk', { id: a.id || null, first: ((D ? (D.lines || [D.banner]) : (a.lines || [a.title || a.text]))[0]) || '' }); return tk(a); };
  const hp = hurtPlayer;
  window.hurtPlayer = function (dmg, sx, sy, el) {
    const p = G.player, before = p.hp, r = hp.apply(this, arguments);
    if (r) {
      let src = null, bd = 99; for (const e of G.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; src = e; } }
      Q.dmg.push({ gt: +G.t.toFixed(2), map: G.map.id, dmg: Math.round(before - p.hp), el, src: src ? src.type : null, dist: +bd.toFixed(1), warn: G.lastWarn && G.t - G.lastWarn.t < 3 ? G.lastWarn.move : null, tele: teleCovers ? teleNowCovers() : false, hp: Math.round(p.hp), max: Math.round(p.maxHp), x: +p.x.toFixed(1), y: +p.y.toFixed(1) });
    }
    return r;
  };
  function teleNowCovers() { try { return G.effects.some(f => f.type === 'tele'); } catch (e) { return false; } }
  const ke = killEnemy; window.killEnemy = e => { if (!e.dead && !e.dummy) { Q.kills[e.type] = (Q.kills[e.type] || 0) + 1; log('kill', { type: e.type, boss: !!e.boss }); } return ke(e); };
  const dl = dropLoot; window.dropLoot = (x, y, list) => { log('loot', { n: list.length, kinds: list.map(d => d.kind === 'item' ? 'item:' + d.it.slot + '/' + d.it.rarity : d.kind) }); return dl(x, y, list); };
  let last = performance.now();
  const frame = now => { const dt = now - last; last = now; if (Q.fr.length < 400000) Q.fr.push(dt); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  Q.drain = () => { const f = Q.fr; Q.fr = []; return f; };
  Q.evDrain = () => { const e = Q.ev; Q.ev = []; return e; };
  Q.dmgDrain = () => { const e = Q.dmg; Q.dmg = []; return e; };

  // ---------- grid pathfinder over the real walkable() / colliders (planning only; the bot still has to walk it with keys)
  const RES = 0.5;
  let grid = null; Q.avoid = [];
  function buildGrid(margin) {
    const m = G.map, W = Math.ceil(m.W / RES), H = Math.ceil(m.H / RES), pass = new Uint8Array(W * H), hh = new Float32Array(W * H), drop = new Uint8Array(W * H);
    const cols = m.colliders.filter(c => c.r > 0);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = (i + 0.5) * RES, y = (j + 0.5) * RES, h = tileH(m, x, y); hh[j * W + i] = h;
      const rr = margin > 0 ? 0.36 : 0.24;
      let ok = walkable(m, x, y, h) && walkable(m, x + rr, y, h) && walkable(m, x - rr, y, h) && walkable(m, x, y + rr, h) && walkable(m, x, y - rr, h);
      if (ok) for (const c of cols) { if (Math.abs(c.z - h) > 1.5) continue; if (Math.hypot(x - c.x, y - c.y) < c.r + 0.28 + margin) { ok = false; break; } }
      if (ok) for (const a of Q.avoid) if (a.map === m.id && Math.hypot(x - a.x, y - a.y) < 0.9) { ok = false; break; }
      pass[j * W + i] = ok ? 1 : 0;
      if (m.dropIn && m.dropIn[Math.floor(y) * m.W + Math.floor(x)]) drop[j * W + i] = 1;   // §29 G3 drop-down landing: any step DOWN into it
    }
    return { W, H, pass, hh, drop, key: m.id + '|' + m.colliders.length + '|' + margin + '|' + Q.avoid.length, margin };
  }
  function getGrid(margin) { const k = G.map.id + '|' + G.map.colliders.length + '|' + margin + '|' + Q.avoid.length; if (!grid || grid.key !== k) grid = buildGrid(margin); return grid; }
  function stepOK(g, i, j, ni, nj) {
    if (ni < 0 || nj < 0 || ni >= g.W || nj >= g.H || !g.pass[nj * g.W + ni]) return false;
    const dh = g.hh[nj * g.W + ni] - g.hh[j * g.W + i]; if (Math.abs(dh) > 1.0 && !(dh < 0 && g.drop[nj * g.W + ni])) return false;
    if (ni !== i && nj !== j && (!g.pass[j * g.W + ni] || !g.pass[nj * g.W + i])) return false;
    return true;
  }
  function los(g, ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.25);
    let pi = Math.floor(ax / RES), pj = Math.floor(ay / RES);
    for (let k = 1; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n, i = Math.floor(x / RES), j = Math.floor(y / RES); if (i === pi && j === pj) continue; const dh = g.hh[j * g.W + i] - g.hh[pj * g.W + pi]; if (!g.pass[j * g.W + i] || (Math.abs(dh) > 1.0 && !(dh < 0 && g.drop[j * g.W + i]))) return false; pi = i; pj = j; }
    return true;
  }
  Q.path = (tx, ty, margin = 0.12) => {
    const p = G.player;
    for (const mg of [margin, 0.0]) {
      const g = getGrid(mg), W = g.W;
      let si = Math.floor(p.x / RES), sj = Math.floor(p.y / RES);
      const near = (ci, cj) => { if (g.pass[cj * W + ci]) return [ci, cj]; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = ci + di, b = cj + dj; if (a >= 0 && b >= 0 && a < g.W && b < g.H && g.pass[b * W + a]) return [a, b]; } return null; };
      const S = near(si, sj), T = near(Math.floor(tx / RES), Math.floor(ty / RES)); if (!S || !T) continue;
      const open = [[0, S[0], S[1]]], gs = new Map(), from = new Map(), key = (i, j) => j * W + i; gs.set(key(S[0], S[1]), 0);
      let found = false, iter = 0;
      const heap = open; // simple binary heap
      const push = n => { heap.push(n); let i = heap.length - 1; while (i > 0) { const pI = (i - 1) >> 1; if (heap[pI][0] <= heap[i][0]) break;[heap[pI], heap[i]] = [heap[i], heap[pI]]; i = pI; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break;[heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
      while (heap.length && iter++ < 60000) {
        const [, i, j] = pop(); if (i === T[0] && j === T[1]) { found = true; break; }
        const gc = gs.get(key(i, j));
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const ni = i + di, nj = j + dj; if (!stepOK(g, i, j, ni, nj)) continue;
          const ng = gc + (di && dj ? 1.414 : 1), k = key(ni, nj); if (gs.has(k) && gs.get(k) <= ng) continue;
          gs.set(k, ng); from.set(k, key(i, j)); push([ng + Math.hypot(T[0] - ni, T[1] - nj), ni, nj]);
        }
      }
      if (!found) continue;
      const cells = []; let k = key(T[0], T[1]); while (k !== undefined) { cells.push([(k % W + 0.5) * RES, (Math.floor(k / W) + 0.5) * RES]); k = from.get(k); } cells.reverse();
      // string-pull smoothing
      const out = [[p.x, p.y]]; let a = 0;
      while (a < cells.length - 1) { let b = cells.length - 1; while (b > a + 1 && !los(g, out[out.length - 1][0], out[out.length - 1][1], cells[b][0], cells[b][1])) b--; out.push(cells[b]); a = b; }
      out.shift(); const last = out[out.length - 1];
      if (last && Math.hypot(last[0] - tx, last[1] - ty) > 0.5 && Math.hypot(tx - last[0], ty - last[1]) < 1.6) out.push([tx, ty]);
      return { pts: out, margin: mg, reachedExact: Math.hypot(cells[cells.length - 1][0] - tx, cells[cells.length - 1][1] - ty) < 1.2 };
    }
    return null;
  };

  // ---------- snapshot
  Q.snap = () => {
    const p = G.player, m = G.map, o = { t: +G.t.toFixed(2), st: G.state, ui: { map: !!G.ui.map, open: !!G.ui.open, help: !!G.ui.help, pause: !!G.ui.pause, settings: !!G.ui.settings }, fadeDir: G.fadeDir, fade: +(G.fade || 0).toFixed(2), dev: IN.device };
    if (!p) return o;
    o.map = m && m.id; o.W = m && m.W; o.warp = !!G.warp; try { const sc = sectionAt(m, p.x, p.y); o.sec = sc && sc.id; } catch (e) { o.sec = null; }
    let wk = null; try { wk = item('weapon', p.gear.weapon).kind; } catch (e) { /* */ }
    o.p = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: p.z, hp: Math.round(p.hp), maxHp: Math.round(p.maxHp), mp: Math.round(p.mp), maxMp: Math.round(p.maxMp), pot: p.potions, lvl: p.level, xp: Math.round(p.xp), dead: p.dead, ult: Math.round(p.ult), dash: !!p.dash, rootT: p.rootT, slowT: p.slowT, invul: p.invulnT > 0, aim: p.aim, wk, wid: p.gear.weapon, st: Math.round(p.st), castT: p.castT, casting: !!p.cast, bag: p.bag.filter(Boolean).length, dust: p.dust };
    o.sk = {}; for (const s of ['q', 'e', 'r', 'f', 'c', 'shift', '1', '2', '3']) { try { const id = slotSkill(p, s); if (id) o.sk[s] = { id, cd: +((p.cds[id] || 0)).toFixed(2), mp: Math.round((SKILLS[id].mp || 0)), st: SKILLS[id].st || 0 }; } catch (e) { /* */ } }
    o.en = G.enemies.filter(e => !e.dead).map(e => ({ type: e.type, x: +e.x.toFixed(2), y: +e.y.toFixed(2), hp: Math.round(e.hp), max: Math.round(e.maxHp), boss: !!e.boss, dummy: !!e.dummy, asleep: !!e.asleep, spawnT: +(e.spawnT || 0).toFixed(2), r: e.r, elite: !!(e.mods && e.mods.length), state: e.state, lvl: e.lvl, stun: e.stunT > 0, still: e.move === 'stationary' }));
    o.boss = G.boss && !G.boss.dead ? { type: G.boss.type, hp: Math.round(G.boss.hp), max: Math.round(G.boss.maxHp), phase: G.boss.phaseN || 0, x: +G.boss.x.toFixed(2), y: +G.boss.y.toFixed(2), lvl: G.boss.lvl, state: G.boss.state } : null;
    o.warn = G.lastWarn ? { boss: G.lastWarn.boss, move: G.lastWarn.move, type: G.lastWarn.type, wind: G.lastWarn.wind, open: G.lastWarn.open, t: G.lastWarn.t } : null;
    o.tele = G.effects.filter(f => f.type === 'tele').map(f => ({ kind: f.kind, x: +f.x.toFixed(2), y: +f.y.toFixed(2), r: f.r, ang: f.ang, arc: f.arc, len: f.len, w: f.w, t: +f.t.toFixed(2), life: f.life }));
    o.covered = (() => { try { return teleCovers(p.x, p.y); } catch (e) { return false; } })();
    o.zones = G.zones ? G.zones.length : 0;
    o.prompt = G.prompt ? { kind: G.prompt.kind, text: G.prompt.text, x: G.prompt.x, y: G.prompt.y } : null;
    o.obj = G.objective; o.msg = G.msg && G.msg.t > 0 ? G.msg.s : null; o.pend = G.pendingSpawns; o.banner = G.banner && G.banner.t > 0 ? G.banner.s : null;
    o.fired = G.trig ? Object.keys(G.trig.fired) : [];
    o.drops = G.drops.map(d => ({ x: +d.x.toFixed(2), y: +d.y.toFixed(2), rar: d.rar, name: d.name, kind: d.kind, t: +d.t.toFixed(1) }));
    o.portals = m ? m.portals.map(q => ({ id: q.id, to: q.to, x: q.x, y: q.y, open: !!q.open, ok: !!G.world.maps[q.to] })) : [];
    o.quests = JSON.parse(JSON.stringify((G.prog && G.prog.quests) || {}));
    o.keys = Object.keys((G.prog && G.prog.secrets) || {}).filter(k => G.prog.secrets[k]);
    o.deaths = G.stats.deaths; o.col = m ? m.colliders.length : 0; o.checkpoint = G.checkpoint ? { map: G.checkpoint.map, x: G.checkpoint.x, y: G.checkpoint.y } : null;
    o.deadT = G.deadT; o.talkQ = G.talk ? G.talk.length : 0; o.tablet = !!G.tablet; o.touch = !!G.touch; o.tpage = typeof TOUCH !== 'undefined' ? TOUCH.page : 0;
    o.hudh = G.safe ? 1 : 0;
    return o;
  };
  // mouse/display coordinate of a world point (display space = 960x540)
  // true when the engine's own movement probes reject every direction (a real wedge, not just a collider or a goal we already reached)
  Q.isWedged = () => {
    const p = G.player, m = G.map, h0 = tileH(m, p.x, p.y), r = p.r * 0.8;
    const ok = (x, y) => walkable(m, x + r, y, h0) && walkable(m, x - r, y, h0) && walkable(m, x, y + r, h0) && walkable(m, x, y - r, h0);
    let freeDirs = 0;
    for (let a = 0; a < 16; a++) { const dx = Math.cos(a * 0.3927) * 0.06, dy = Math.sin(a * 0.3927) * 0.06; if (ok(p.x + dx, p.y) && dx !== 0 || ok(p.x, p.y + dy) && dy !== 0) freeDirs++; }
    return { wedged: freeDirs === 0, freeDirs, h0 };
  };
  Q.restore = (x, y) => { const p = G.player; Q.avoid.push({ map: G.map.id, x: p.x, y: p.y }); p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; };
  // TESTER ASSIST (logged as a finding every time): nudges a wedged hero to the nearest spot where the engine's own edge probes pass
  Q.unwedge = () => {
    const p = G.player, m = G.map, r = p.r * 0.8; let best = null, bd = 9;
    for (let ang = 0; ang < 6.28; ang += 0.2) for (let d = 0.1; d <= 1.2; d += 0.1) {
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d, h = tileH(m, x, y);
      if (walkable(m, x, y, h) && walkable(m, x + r, y, h) && walkable(m, x - r, y, h) && walkable(m, x, y + r, h) && walkable(m, x, y - r, h) && walkable(m, x + r * 1.5, y, h) && walkable(m, x - r * 1.5, y, h) && walkable(m, x, y + r * 1.5, h) && walkable(m, x, y - r * 1.5, h)) { if (d < bd) { bd = d; best = [x, y]; } }
    }
    Q.avoid.push({ map: m.id, x: p.x, y: p.y });
    if (best) { const from = [p.x, p.y]; p.x = best[0]; p.y = best[1]; return { from, to: best }; }
    return null;
  };
  Q.view = (x, y, z) => { const p = G.player; const v = worldToView(x, y, z == null ? p.z : z); return [v[0] * 2, v[1] * 2]; };
  Q.canvas = () => { const r = DISP.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, DW, DH }; };
  Q.objects = () => G.map.objects.filter(o => o.warpdoor || o.shrineId || o.chest || o.lever || o.checkpoint || o.tablet || o.use || o.fish || o.barrier).map(o => ({ warp: !!o.warpdoor, shrineId: o.shrineId || null, x: +o.x.toFixed(2), y: +o.y.toFixed(2), chest: !!o.chest && !o.opened, lever: !!o.lever, pulled: !!o.pulled, shrine: !!o.checkpoint, tablet: !!o.tablet, use: o.use ? o.use.kind : null, barrier: o.barrier || null, gid: o.gid || null, fish: !!o.fish, id: o.src && o.src.id, label: o.src && o.src.label, title: o.src && o.src.title, tier: o.src && o.src.tier }));
  Q.isEq = (slot, uid) => !!(G.player.equip[slot] && G.player.equip[slot].uid === uid);
  Q.bag = () => G.player.bag.map((it, i) => it && !it.gem ? { i, uid: it.uid, slot: it.slot, rarity: it.rarity, base: it.base, ilvl: it.ilvl, reqLvl: it.req != null ? it.req : it.reqLvl, name: itemName(it), fam: (typeof FAMILY_TIERS !== 'undefined' && Object.keys(FAMILY_TIERS).find(f => FAMILY_TIERS[f].some(t => t.split(':')[0] === it.base))) || null, curFam: G.player.gear.weapon, score: itemScore(it), eq: itemScore(G.player.equip[it.slot]) } : null).filter(Boolean);
  function itemScore(it) { if (!it) return 0; const r = RARITY[it.rarity] ? RARITY[it.rarity].i : 0; return r * 1000 + (it.ilvl || it.reqLvl || 0) * 10 + (it.dmg || it.power || 0); }
  Q.focusList = () => UI.focus.list.map(r => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h }));
  Q.touchBtns = () => touchButtons().map(b => ({ slot: b.slot, x: b.x, y: b.y, r: b.r }));
  Q.touchMenu = () => touchMenu();
  Q.touchAim = () => (typeof TOUCH_AIM !== 'undefined' && TOUCH_AIM) ? { slot: TOUCH_AIM.slot, cancel: TOUCH_AIM.cancel, clamped: TOUCH_AIM.clamped, shape: TOUCH_AIM.aim.shape } : null;
  Q.equip = i => { const it = G.player.bag[i]; return it ? equipItem(G.player, it) : 'none'; };
  window.__qaReady = true;
}

// ---------------------------------------------------------------- the bot
class Bot {
  constructor(page, drv, name) {
    this.page = page; this.drv = drv; this.name = name; this.t0 = Date.now();
    this.out = { name, maps: {}, deaths: [], bosses: [], events: [], findings: [], errors: [], potions: {}, shots: [], dead: [], stuck: [], fps: {}, talks: [], warns: [], damage: [] };
    this.lastNovel = Date.now(); this.novelKey = ''; this.mapStart = null; this.curMap = null; this.shotN = 0;
    this.pathCache = null; this.posHist = []; this.lastWarnT = -1; this.seenTalk = {}; this.deathShot = false;
    this.lastPot = 0; this.lastSkill = 0; this.lastDodge = 0; this.stuckN = 0; this.prevPot = null; this.canvas = null;
    this.state = null; this.dir = null;
  }
  el() { return ((Date.now() - this.t0) / 1000).toFixed(1); }
  log(msg, o) { const line = `[${this.name} ${this.el()}s] ${msg}` + (o ? ' ' + JSON.stringify(o) : ''); console.log(line); this.out.events.push({ at: +this.el(), msg, ...(o || {}) }); }
  find(sev, title, detail, shot) { this.out.findings.push({ at: +this.el(), sev, title, detail, shot: shot || null, map: this.state && this.state.map }); this.log(`FINDING[${sev}] ${title}`, { detail }); }
  async shot(tag) {
    const f = `${this.name}-${String(++this.shotN).padStart(3, '0')}-${tag}.png`.replace(/[^\w.\-]/g, '_');
    try { await this.page.screenshot({ path: path.join(SHOTS, f) }); } catch (e) { return null; }
    this.out.shots.push({ at: +this.el(), tag, file: 'tools/qa/shots/' + f, map: this.state && this.state.map });
    return 'tools/qa/shots/' + f;
  }
  save() { try { fs.writeFileSync(path.join(QA, `run-${this.name}.json`), JSON.stringify(this.out, null, 1)); } catch (e) { /* */ } }
  async snap() { const s = await this.page.evaluate(() => window.__qa.snap()); this.state = s; return s; }
  ev(fn, a) { return this.page.evaluate(fn, a); }

  // ---- bookkeeping each tick: map timers, FPS, novelty, detectors
  async observe(s) {
    const now = Date.now();
    if (!this.lastEvDrain || now - this.lastEvDrain > 1200) {
      this.lastEvDrain = now; const evs = await this.page.evaluate(() => window.__qa.evDrain());
      for (const e of evs) { (this.out.pev = this.out.pev || []).push(Object.assign({ at: +this.el() }, e)); if (e.k === 'kill' && e.boss) this.bossKilled = e.type; if (e.k === 'talk') { const key = e.map + ':' + (e.id || e.first); (this.seenTalk[key] = this.seenTalk[key] || []).push(+this.el()); } }
    }
    if (s.map && s.map !== this.curMap) {
      if (this.curMap) await this.closeMap(now);
      this.curMap = s.map; this.mapStart = now;
      this.out.maps[s.map] = this.out.maps[s.map] || { enters: 0, ms: 0, deaths: 0, potions: 0, kills: 0, lvlIn: s.p && s.p.lvl, dmgTaken: 0, stuck: 0 };
      this.out.maps[s.map].enters++; this.out.maps[s.map].lvlIn = s.p.lvl;
      this.log(`enter map ${s.map}`, { lvl: s.p.lvl, hp: s.p.hp }); this.novel('map');
    }
    if (s.p) {
      const nk = [s.fired.length, s.obj, s.p.lvl, Object.keys(s.quests).join() + JSON.stringify(s.quests), s.portals.map(q => q.open).join(), s.col, s.p.dust, s.p.bag, s.en.length, s.p.pot, s.boss ? s.boss.phase : 0].join('|');
      if (nk !== this.novelKey) { this.novelKey = nk; this.novel('state'); }
      if (this.prevPot != null && s.p.pot < this.prevPot && s.p.hp > 0) { this.out.potions[s.map] = (this.out.potions[s.map] || 0) + 1; this.out.maps[s.map].potions++; this.log('potion drunk', { hp: s.p.hp, max: s.p.maxHp }); }
      this.prevPot = s.p.pot;
      if (now - this.lastNovel > 60000) { const f = await this.shot('deadtime'); this.find('minor', 'Dead time: >60 s with no new trigger/objective/XP/kill/loot event', { map: s.map, pos: [s.p.x, s.p.y], obj: s.obj, sinceMs: now - this.lastNovel }, f); this.lastNovel = now; }
      // new warnings
      if (s.warn && s.warn.t !== this.lastWarnT) { this.lastWarnT = s.warn.t; this.out.warns.push({ gt: s.warn.t, at: +this.el(), boss: s.warn.boss, move: s.warn.move, type: s.warn.type, wind: s.warn.wind, open: s.warn.open }); this.warnJustNow = { t: Date.now(), w: s.warn }; }
      // drops overlapping
      const D = s.drops; let ov = 0; for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) if (Math.hypot(D[i].x - D[j].x, D[i].y - D[j].y) < 0.3) ov++;
      if (ov && !this.reportedOverlap) { this.reportedOverlap = true; const f = await this.shot('loot-overlap'); this.find('polish', 'Loot drops stack on top of each other (<0.3 tiles apart)', { pairs: ov, n: D.length, names: D.map(d => d.name) }, f); }
      // unreachable/old drops
      for (const d of D) if (d.t > 25 && !this.reportedOld) { this.reportedOld = true; const f = await this.shot('old-drop'); this.find('minor', 'A drop sat on the ground >25 s without being picked up', { drop: d, ppos: [s.p.x, s.p.y] }, f); }
      // boss timer
      if (s.boss && !this.bossRun) { this.bossRun = { type: s.boss.type, lvl: s.p.lvl, bossLvl: s.boss.lvl, at: +this.el(), t0: Date.now(), deaths0: s.deaths, hp: s.boss.max, pot0: s.p.pot, map: s.map, maxHp: s.p.maxHp, wk: s.p.wid }; this.log('BOSS START ' + s.boss.type, this.bossRun); }
      if (this.bossRun && s.boss) this.bossRun.minHpPct = Math.min(this.bossRun.minHpPct == null ? 100 : this.bossRun.minHpPct, Math.round(s.p.hp / s.p.maxHp * 100));
      if (this.bossRun && !s.boss && s.st === 'play') { const b = this.bossRun; this.bossRun = null; b.dur = +((Date.now() - b.t0) / 1000).toFixed(1); b.deaths = s.deaths - b.deaths0; b.killed = !!this.bossKilled || s.deaths === b.deaths0;   /* the boss bar went away without a death = a kill (the kill event's boss flag is not always set) */ this.bossKilled = null; b.potions = Math.max(0, b.pot0 - s.p.pot); this.out.bosses.push(b); this.log('BOSS END ' + b.type, b); this.save(); }
      // enemy stuck in wall check
      this.enemyStuck(s);
    }
  }
  novel() { this.lastNovel = Date.now(); }
  enemyStuck(s) {
    this.eh = this.eh || {};
    const now = Date.now();
    for (const e of s.en) {
      if (e.dummy || e.asleep || e.spawnT > 0 || e.boss || e.still) continue;   // turrets (move: stationary) never move by design
      const k = e.type + '@' + Math.round(e.x * 2) + ',' + Math.round(e.y * 2), d = Math.hypot(e.x - s.p.x, e.y - s.p.y);
      const h = this.eh[e.type + e.lvl + '|' + s.map];
      if (!h || Math.hypot(h.x - e.x, h.y - e.y) > 0.15) this.eh[e.type + e.lvl + '|' + s.map] = { x: e.x, y: e.y, t: now };
      else if (d < 14 && d > 2.2 && now - h.t > 7000 && !h.rep && !e.stun && s.en.filter(q => q.type === e.type).length === 1) { h.rep = 1; this.pendingEnemyStuck = { e, d, map: s.map }; }
    }
  }
  async closeMap(now) {
    const m = this.out.maps[this.curMap]; m.ms += now - this.mapStart;
    const fr = await this.page.evaluate(() => window.__qa.drain());
    const f = fr.filter(x => x < 1000); f.sort((a, b) => a - b);
    const avg = f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0;
    const F = this.out.fps[this.curMap] || (this.out.fps[this.curMap] = { frames: 0, sumMs: 0, p95s: [] });
    F.frames += f.length; F.sumMs += avg * f.length; if (f.length) F.p95s.push({ p95: f[Math.floor(f.length * 0.95)], max: f[f.length - 1] });
    const dm = await this.page.evaluate(() => window.__qa.dmgDrain());
    this.out.damage.push(...dm); m.dmgTaken += dm.reduce((a, b) => a + b.dmg, 0);
    this.save();
  }

  // ---- movement helpers (driver handles keys / stick / touch)
  async setMove(sx, sy) { await this.drv.move(sx, sy); }
  // screen-space vector from a world delta (matches isoX/isoY)
  static scr(dx, dy) { const sx = dx - dy, sy = dx + dy, l = Math.hypot(sx, sy) || 1; return [sx / l, sy / l]; }
  async aimWorld(x, y) { const v = await this.page.evaluate(([x, y]) => window.__qa.view(x, y), [x, y]); await this.drv.aimAt(v[0], v[1], x, y, this.state); }

  // ---- reactions. returns true if the tick was consumed (we did not navigate)
  async react(s, g) {
    const p = s.p;
    if (s.st === 'title') { await this.drv.title(s); return true; }
    if (s.st === 'dead') { await this.setMove(0, 0); await this.drv.attack(false); await this.onDead(s); return true; }
    this.deathShot = false;
    if (s.warp) { await this.setMove(0, 0); await sleep(120); return true; }
    if (s.ui.map) { await this.setMove(0, 0); await this.drv.closeMap(s); await sleep(250); return true; }
    if (s.ui.open || s.ui.help || s.ui.pause || s.ui.settings) { await this.setMove(0, 0); await this.drv.attack(false); await this.drv.closeMenu(s); await sleep(250); return true; }
    if (s.fadeDir) { await this.setMove(0, 0); await sleep(80); return true; }
    // potion
    if (p.hp / p.maxHp < 0.35 && p.pot > 0 && Date.now() - this.lastPot > 1100) { this.lastPot = Date.now(); await this.drv.potion(); this.log('drink potion', { hp: p.hp, max: p.maxHp, pot: p.pot, map: s.map }); }
    // QA run 5: dodge ON the boss warning (G.lastWarn): the hit lands ~wind s after warn.t, so Shift ~0.2 s before that, sidestepping lines/cones and leaving circles
    if (s.boss && s.warn && s.warn.boss === s.boss.type && s.warn.wind > 0 && ['line', 'circle', 'cone'].includes(s.warn.type) && !p.dash && p.st >= 20 && Date.now() - this.lastDodge > 650) {
      const age = s.t - s.warn.t, bd = Math.hypot(p.x - s.boss.x, p.y - s.boss.y);
      if (age >= s.warn.wind - 0.42 && age <= s.warn.wind + 0.05 && bd < 9 && this.dowT !== s.warn.t) { this.dowT = s.warn.t;   // once per warning, widened window (run 5: only 5 dodges fired, poll tick ~100 ms)
        let dx = p.x - s.boss.x, dy = p.y - s.boss.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        if (s.warn.type !== 'circle') { const tl = s.tele.find(f => f.kind === 'line' || f.kind === 'cone'); const ang = tl ? tl.ang : Math.atan2(-dy, -dx); const cr = (p.x - (tl ? tl.x : s.boss.x)) * Math.sin(ang) - (p.y - (tl ? tl.y : s.boss.y)) * Math.cos(ang), sg = cr >= 0 ? 1 : -1; dx = -Math.sin(ang) * sg; dy = Math.cos(ang) * sg; }
        const [sx, sy] = Bot.scr(dx, dy); await this.drv.attack(false); await this.setMove(sx, sy); await sleep(35);
        this.lastDodge = Date.now(); await this.drv.dodge(sx, sy); this.out.dodgeOnWarn = (this.out.dodgeOnWarn || 0) + 1; this.log('dodge on warn', { move: s.warn.move, type: s.warn.type, age: +age.toFixed(2) }); return true;
      }
    }
    // telegraph avoidance
    if (s.covered || s.tele.length) { if (await this.avoidTele(s)) return true; }
    // combat
    const hostile = s.en.filter(e => !e.dummy && (g && g.wake ? true : !e.asleep) && e.spawnT < 0.5);   // g.wake: also attack sleepers (Fox Warrens)
    const dummyGoal = g && g.dummies;
    const engage = hostile.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < (g && g.engageR || 10) || e.boss);
    if (engage.length || (dummyGoal && s.en.some(e => e.dummy))) return await this.fight(s, engage, g);
    await this.drv.attack(false);
    // interact when something is useful and asked
    return false;
  }
  async avoidTele(s) {
    const p = s.p; if (!s.tele.length) return false;
    let danger = null;
    for (const f of s.tele) {
      const near = f.kind === 'circle' ? Math.hypot(p.x - f.x, p.y - f.y) < f.r + 1.2 : f.kind === 'cone' ? Math.hypot(p.x - f.x, p.y - f.y) < f.r + 1.2 : f.kind === 'line' ? true : false;
      if (near) { danger = f; break; }
    }
    if (!danger && !s.covered) return false;
    const f = danger || s.tele[0]; let dx, dy;
    if (f.kind === 'line') { const ax = Math.cos(f.ang), ay = Math.sin(f.ang), rx = p.x - f.x, ry = p.y - f.y, cr = rx * ay - ry * ax; const sgn = cr >= 0 ? 1 : -1; dx = -ay * sgn; dy = ax * sgn; }
    else if (f.kind === 'cone') { const a = Math.atan2(p.y - f.y, p.x - f.x), da = Math.atan2(Math.sin(a - f.ang), Math.cos(a - f.ang)); const side = da >= 0 ? 1 : -1; dx = Math.cos(f.ang + side * 1.57); dy = Math.sin(f.ang + side * 1.57); dx += Math.cos(a) * 0.6; dy += Math.sin(a) * 0.6; }
    else { dx = p.x - f.x; dy = p.y - f.y; if (Math.hypot(dx, dy) < 0.05) { dx = 1; dy = 0; } }
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const [sx, sy] = Bot.scr(dx, dy);
    await this.drv.attack(false);
    await this.setMove(sx, sy);
    const remain = (f.life || 1) - (f.t || 0);
    if (s.covered && remain < 0.38 && Date.now() - this.lastDodge > 700 && !p.dash) { this.lastDodge = Date.now(); await this.drv.dodge(sx, sy); this.log('dodge telegraph', { kind: f.kind, remain: +remain.toFixed(2) }); }
    await sleep(40);
    return true;
  }
  async fight(s, engage, g) {
    const p = s.p; let tg = null, bd = 1e9;
    const pool = engage.length ? engage : s.en.filter(e => e.dummy);
    for (const e of pool) { const d = Math.hypot(e.x - p.x, e.y - p.y) - (e.boss ? 1 : 0); if (d < bd) { bd = d; tg = e; } }
    if (!tg) return false;
    const d = Math.hypot(tg.x - p.x, tg.y - p.y);
    const ranged = p.wk !== 'sword';
    const want = ranged ? 4.2 : 1.15 + tg.r * 0.6;
    await this.aimWorld(tg.x, tg.y);
    if (g && g.dummies && tg.dummy) { g.dummyHits = g.dummyHits || 0; }
    if (d > want + 0.25) {
      const path = await this.page.evaluate(([x, y]) => window.__qa.path(x, y), [tg.x, tg.y]);
      let wx = tg.x - p.x, wy = tg.y - p.y;
      if (path && path.pts.length && d > 2.0) { wx = path.pts[0][0] - p.x; wy = path.pts[0][1] - p.y; if (Math.hypot(wx, wy) < 0.3 && path.pts[1]) { wx = path.pts[1][0] - p.x; wy = path.pts[1][1] - p.y; } }
      const [sx, sy] = Bot.scr(wx, wy); await this.setMove(sx, sy);
    } else if (ranged && d < 2.2) { const [sx, sy] = Bot.scr(p.x - tg.x, p.y - tg.y); await this.setMove(sx, sy); }
    else await this.setMove(0, 0);
    if (d < (ranged ? 8 : 2.2)) await this.drv.attack(true); else await this.drv.attack(false);
    // skills
    if (Date.now() - this.lastSkill > 260 && d < 7.5 && !p.casting) {
      for (const sl of ['r', 'q', 'e', 'f', 'c', '1', '2', '3']) {
        const k = s.sk[sl]; if (!k || k.cd > 0) continue;
        if (sl === 'r' && p.ult < 100) continue;
        if (k.mp > p.mp) continue;
        if ((sl === '1' || sl === '2' || sl === '3') && !(p.hp / p.maxHp < 0.7 || tg.boss || engage.length >= 3)) continue;
        this.lastSkill = Date.now(); await this.drv.skill(sl, tg, s); break;
      }
    }
    await sleep(45);
    return true;
  }
  async onDead(s) {
    if (!this.deathShot) {
      this.deathShot = true;
      const f = await this.shot('death');
      const last = (await this.page.evaluate(() => window.__qa.dmg.slice(-4)));
      const rec = { at: +this.el(), map: s.map, x: s.p.x, y: s.p.y, lvl: s.p.lvl, boss: s.boss ? s.boss.type : null, bossHp: s.boss ? Math.round(s.boss.hp / s.boss.max * 100) : null, near: s.en.filter(e => !e.dummy).map(e => e.type), last, shot: f, pot: s.p.pot, obj: s.obj };
      this.out.deaths.push(rec); this.out.maps[s.map].deaths++;
      this.log('DEATH', rec); this.novel(); this.save();
    }
    if (s.deadT > 1.3) await this.drv.respawn(s); else await sleep(120);
  }

  // ---- navigation toward a point. g = { x, y, r, until, timeout, name, interact }
  async nav(s, g) {
    const p = s.p, tx = g.x, ty = g.y;
    const d = Math.hypot(tx - p.x, ty - p.y);
    // stuck detection
    const now = Date.now(); this.posHist.push([now, p.x, p.y]); while (this.posHist.length && now - this.posHist[0][0] > 2500) this.posHist.shift();
    let stuck = false;
    if (this.posHist.length > 20 && now - this.posHist[0][0] > 2200) { const [, ox, oy] = this.posHist[0]; if (Math.hypot(p.x - ox, p.y - oy) < 0.25 && !(p.rootT > 0) && !p.casting) stuck = true; }
    if (!this.trail) this.trail = [];
    if (!this.trail.length || Math.hypot(this.trail[this.trail.length - 1][1] - p.x, this.trail[this.trail.length - 1][2] - p.y) > 0.3) { this.trail.push([now, p.x, p.y]); if (this.trail.length > 60) this.trail.shift(); }
    if (stuck && !g._noMove) {
      const wd = await this.page.evaluate(() => window.__qa.isWedged());
      if (!wd.wedged) { stuck = false; this.posHist = []; g.softStuck = (g.softStuck || 0) + 1; this.pathCache = null; const ang = Math.random() * 6.28; const [sx, sy] = Bot.scr(Math.cos(ang), Math.sin(ang)); await this.setMove(sx, sy); await sleep(350); return; }
    }
    if (stuck && !g._noMove) {
      this.stuckN++; this.posHist = []; g.stuckN = (g.stuckN || 0) + 1; this.out.maps[s.map].stuck++;
      if (g.stuckN === 3 || g.stuckN === 8) { const f = await this.shot('stuck'); this.out.stuck.push({ at: +this.el(), map: s.map, pos: [p.x, p.y], goal: g.name, shot: f, n: g.stuckN }); this.log('bot stuck', { pos: [p.x, p.y], goal: g.name, n: g.stuckN }); }
      this.pathCache = null;
      if (g.stuckN >= 3 && g.stuckN % 2 === 1) {
        const f = await this.shot('wedged');
        let back = null; for (let k = this.trail.length - 1; k >= 0; k--) { const t = this.trail[k]; if (now - t[0] > 1500 && Math.hypot(t[1] - p.x, t[2] - p.y) > 0.6) { back = t; break; } }
        const r = back ? await this.page.evaluate(([x, y]) => { window.__qa.restore(x, y); return { to: [x, y] }; }, [back[1], back[2]]) : await this.page.evaluate(() => window.__qa.unwedge());
        this.trail = [];
        this.find('blocker', 'Hero is wedged: zero movement in all 8 directions and Dodge does not free it (needed a tester nudge)', { map: s.map, pos: [p.x, p.y], nudgedTo: r && r.to, goal: g.name, escape: 'only the pause menu TO HUB, or dying, would free a real player' }, f);
      }
      // wiggle sideways
      const ang = Math.random() * 6.28; const [sx, sy] = Bot.scr(Math.cos(ang), Math.sin(ang)); await this.setMove(sx, sy); await sleep(300);
      if (g.stuckN >= 2) { await this.drv.dodge(sx, sy); this.log('unstick: dodge', { n: g.stuckN, pos: [p.x, p.y] }); }   // what a stuck human tries next
      await sleep(500); return;
    }
    if (!this.pathCache || now - this.pathCache.t > 450 || this.pathCache.tx !== tx || this.pathCache.ty !== ty || this.pathCache.map !== s.map || this.pathCache.col !== s.col) {
      const r = await this.page.evaluate(([x, y]) => window.__qa.path(x, y), [tx, ty]);
      this.pathCache = { t: now, tx, ty, map: s.map, col: s.col, r };
      if (!r) { g.noPath = (g.noPath || 0) + 1; if (g.noPath === 3) { const f = await this.shot('nopath'); this.find('info', `No walkable path to goal "${g.name}"`, { from: [p.x, p.y], to: [tx, ty], map: s.map }, f); } }
      else if (!r.reachedExact && d > 3) { g.partial = (g.partial || 0) + 1; }
    }
    const r = this.pathCache.r; let wx = tx - p.x, wy = ty - p.y;
    if (r && r.pts.length) {
      // aim for the first waypoint at least 0.9 tiles away
      let w = r.pts.find(q => Math.hypot(q[0] - p.x, q[1] - p.y) > 0.9) || r.pts[r.pts.length - 1];
      wx = w[0] - p.x; wy = w[1] - p.y;
    }
    const [sx, sy] = Bot.scr(wx, wy);
    await this.setMove(sx, sy);
    // aim along travel so the cursor does not sit somewhere odd
    await sleep(55);
  }

  // ---- a goal: walk to (x,y) / until predicate; fights whatever engages. returns 'ok' | 'timeout'
  async goal(g) {
    const t0 = Date.now(); g.timeout = g.timeout || 150000; g.r = g.r || 1.2; this.pathCache = null; this.log(`goal: ${g.name}`);
    let ok = 'timeout';
    for (;;) {
      const s = await this.snap(); await this.observe(s);
      if (!s.p) { await sleep(100); continue; }
      if (g.until && g.until(s)) { ok = 'ok'; break; }
      if (!g.until && s.p && !g.fightOnly && Math.hypot(g.x - s.p.x, g.y - s.p.y) < g.r && s.st === 'play') { ok = 'ok'; break; }
      if (Date.now() - t0 > g.timeout) break;
      if (this.pendingEnemyStuck) { const q = this.pendingEnemyStuck; this.pendingEnemyStuck = null; const f = await this.shot('enemy-stuck'); this.find('major', `Enemy "${q.e.type}" not moving for 7 s while hero is ${q.d.toFixed(1)} tiles away`, { enemy: q.e, map: q.map }, f); }
      if (await this.react(s, g)) continue;
      if (g.fightOnly) { await this.setMove(0, 0); await sleep(120); continue; }
      if (g.x == null) { await this.setMove(0, 0); await sleep(120); continue; }
      // interact if the prompt is for what we want
      if (g.interact && s.prompt && Math.hypot(s.prompt.x - g.x, s.prompt.y - g.y) < (g.ir || 2.2) && (g.interact === true || g.interact === s.prompt.kind)) {
        await this.setMove(0, 0); await this.drv.interact(s); await sleep(450);
        if (g.once) { ok = 'ok'; break; }
        continue;
      }
      await this.nav(s, g);
    }
    await this.setMove(0, 0); await this.drv.attack(false);
    this.log(`goal ${g.name}: ${ok}`, { sec: ((Date.now() - t0) / 1000).toFixed(1) });
    if (ok === 'timeout' && !g.noFinding) { const f = await this.shot('goal-timeout-' + g.name); const s = this.state; this.find(g.softlock ? 'blocker' : 'major', `Goal timed out: ${g.name}`, { after_s: (g.timeout / 1000), pos: s.p && [s.p.x, s.p.y], obj: s.obj, noPath: g.noPath || 0, stuckN: g.stuckN || 0 }, f); }
    return ok;
  }
  // clear the area: fight until no hostile and no pending spawns for a couple of seconds
  async clear(name, timeout = 120000, extra = {}) {
    let calm = 0, t0 = Date.now();
    return this.goal(Object.assign({ name, fightOnly: true, timeout, engageR: 14, until: s => { const h = s.en.filter(e => !e.dummy).length; if (!h && !s.pend && s.st === 'play') { calm++; } else calm = 0; return calm > 14; } }, extra));
  }
  async idle(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await this.snap(); await this.observe(s); if (await this.react(s, { engageR: 12 })) continue; await this.setMove(0, 0); await sleep(120); } }
}

// ---------------------------------------------------------------- drivers
class KbmDriver {
  constructor(page) { this.page = page; this.keys = new Set(); this.mouseDown = false; this.cv = null; }
  async cvr() { return (this.cv = await this.page.evaluate(() => window.__qa.canvas())); }
  async key(k, on) { if (on && !this.keys.has(k)) { this.keys.add(k); await this.page.keyboard.down(k); } else if (!on && this.keys.has(k)) { this.keys.delete(k); await this.page.keyboard.up(k); } }
  async tap(k, ms = 70) { await this.page.keyboard.down(k); await new Promise(r => setTimeout(r, ms)); await this.page.keyboard.up(k); }
  async move(sx, sy) {
    const m = Math.hypot(sx, sy);
    const th = 0.38;
    await this.key('KeyD', m > 0 && sx > th); await this.key('KeyA', m > 0 && sx < -th); await this.key('KeyS', m > 0 && sy > th); await this.key('KeyW', m > 0 && sy < -th);
    if (m > 0 && !this.keys.size) { /* tiny vector: pick dominant axis */ if (Math.abs(sx) > Math.abs(sy)) await this.key(sx > 0 ? 'KeyD' : 'KeyA', true); else await this.key(sy > 0 ? 'KeyS' : 'KeyW', true); }
  }
  async attack(on) { if (on && !this.mouseDown) { this.mouseDown = true; await this.page.mouse.down(); } else if (!on && this.mouseDown) { this.mouseDown = false; await this.page.mouse.up(); } }
  async aimAt(vx, vy) { if (!this.cv) await this.cvr(); const c = this.cv; await this.page.mouse.move(c.l + vx / c.DW * c.w, c.t + vy / c.DH * c.h); }
  async skill(sl) { const k = { q: 'KeyQ', e: 'KeyE', r: 'KeyR', f: 'KeyF', c: 'KeyC', 1: 'Digit1', 2: 'Digit2', 3: 'Digit3' }[sl]; await this.tap(k, 60); }
  async dodge() { await this.tap('ShiftLeft', 60); }
  async potion() { await this.tap('Digit4', 60); }
  async interact() { await this.tap('Space', 70); }
  async closeMenu(s) { await this.tap('Escape', 70); }
  async closeMap() { await this.tap('KeyM', 70); }
  async openMap() { await this.tap('KeyM', 70); }
  async respawn() { await this.tap('Space', 80); }
  async title() { if (!this.cv) await this.cvr(); const c = this.cv; await this.page.mouse.move(c.l + 480 / c.DW * c.w, c.t + 372 / c.DH * c.h); await sleep(150); await this.page.mouse.click(c.l + 480 / c.DW * c.w, c.t + 372 / c.DH * c.h); await sleep(800); }
  async clickDisp(x, y) { if (!this.cv) await this.cvr(); const c = this.cv; await this.page.mouse.move(c.l + x / c.DW * c.w, c.t + y / c.DH * c.h); await sleep(60); await this.page.mouse.click(c.l + x / c.DW * c.w, c.t + y / c.DH * c.h); }
  async reset() { for (const k of [...this.keys]) await this.key(k, false); await this.attack(false); }
}


class PadDriver {
  constructor(page) { this.page = page; this.L = [0, 0]; this.R = [0, 0]; this.btnHeld = new Set(); }
  async axes() { await this.page.evaluate(([l, r]) => window.__axes([l[0], l[1], r[0], r[1]]), [this.L, this.R]); }
  async b(i, on) { await this.page.evaluate(([i, on]) => window.__btn(i, on), [i, on]); }
  async tap(i, ms = 80) { await this.b(i, true); await sleep(ms); await this.b(i, false); await sleep(30); }
  async move(sx, sy) { this.L = [sx, sy]; await this.axes(); }
  async attack(on) { if (on !== this.atk) { this.atk = on; await this.b(7, on); } }
  async aimAt(vx, vy, x, y, st) { if (!st || !st.p) return; const [ax, ay] = Bot.scr(x - st.p.x, y - st.p.y); this.R = [ax, ay]; await this.axes(); }
  async skill(sl) { const i = { q: 5, e: 4, r: 11, f: 2, c: 3, 1: 14, 2: 12, 3: 15 }[sl]; await this.tap(i, 70); }
  async dodge() { await this.tap(6, 70); }
  async potion() { await this.tap(1, 70); }
  async interact() { await this.tap(0, 70); }
  async closeMenu() { await this.tap(1, 80); }
  async closeMap() { await this.tap(1, 80); }
  async openMap() { await this.tap(13, 80); }
  async respawn() { await this.tap(0, 80); }
  async title() { await this.tap(0, 90); await sleep(500); await this.tap(13, 90); await sleep(300); await this.tap(0, 90); await sleep(800); }   // QA run 4: A alone on the default Slot-2 focus never starts the game; D-pad down + A does (see dbg-padtitle.js)
  async reset() { this.L = [0, 0]; this.R = [0, 0]; await this.axes(); await this.attack(false); }
}

class TouchDriver {
  constructor(page) { this.page = page; this.pts = new Map(); this.cdp = null; this.stick = null; this.cv = null; this.atkOn = false; }
  async init() { this.cdp = await this.page.context().newCDPSession(this.page); }
  async c() { return (this.cv = await this.page.evaluate(() => window.__qa.canvas())); }
  async send(type) {
    const c = this.cv || await this.c();
    const tp = [...this.pts.entries()].map(([id, q]) => ({ x: c.l + q.x / c.DW * c.w, y: c.t + q.y / c.DH * c.h, id }));
    await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: tp });
  }
  async down(id, x, y) { this.pts.set(id, { x, y }); await this.send('touchStart'); }
  async mv(id, x, y) { this.pts.set(id, { x, y }); await this.send('touchMove'); }
  async up(id) { if (!this.pts.has(id)) return; const q = this.pts.get(id); await this.send('touchMove'); const c = this.cv; const tp = [...this.pts.entries()].filter(([k]) => k !== id).map(([k, v]) => ({ x: c.l + v.x / c.DW * c.w, y: c.t + v.y / c.DH * c.h, id: k })); await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: tp }); this.pts.delete(id); }
  async btn(slot) { const b = (await this.page.evaluate(() => window.__qa.touchBtns())).find(q => q.slot === slot); return b; }
  async tapAt(x, y, ms = 70) { const id = 50 + ((Math.random() * 40) | 0); await this.down(id, x, y); await sleep(ms); await this.up(id); await sleep(40); }
  async tapBtn(slot) { const b = await this.btn(slot); if (!b) return false; await this.tapAt(b.x, b.y); return true; }
  async move(sx, sy) {
    const m = Math.hypot(sx, sy);
    if (m === 0) { if (this.stick) { await this.up(1); this.stick = null; } return; }
    if (!this.stick) { this.stick = { x: 180, y: 380 }; await this.down(1, 180, 380); }
    await this.mv(1, this.stick.x + sx * 50, this.stick.y + sy * 50);
  }
  async attack(on) { if (on && !this.atkOn) { this.atkOn = true; const b = await this.btn('atk'); await this.down(2, b.x, b.y); } else if (!on && this.atkOn) { this.atkOn = false; await this.up(2); } }
  async aimAt() { }
  async page_(n) { const st = await this.page.evaluate(() => window.__qa.snap().tpage); if (st !== n) { await this.tapBtn('toggle'); await sleep(250); } }
  async skill(sl) {
    if (['1', '2', '3'].includes(sl)) { await this.page_(1); await this.tapBtn(sl); await sleep(120); await this.page_(0); }
    else { await this.page_(0); await this.tapBtn(sl); }
  }
  async dodge() { await this.tapBtn('shift'); }
  async potion() { await this.tapBtn('pot'); }
  async interact() { await this.tapBtn('interact'); }
  async closeMenu() {
    const fl = await this.page.evaluate(() => window.__qa.focusList());
    const cand = fl.find(r => /close|back|resume|wake/i.test(r.id)) || null;
    if (cand) { await this.tapAt(cand.x + cand.w / 2, cand.y + cand.h / 2); return; }
    await this.tapAt(930, 20);
  }
  async closeMap() { await this.tapAt(480, 500); }
  async openMap() { await this.tapAt(880, 70); }
  async respawn() { const fl = await this.page.evaluate(() => window.__qa.focusList()); const r = fl.find(q => q.id === 'btn:wake'); if (r) await this.tapAt(r.x + r.w / 2, r.y + r.h / 2); else await this.tapAt(480, 320); }
  async title() { await this.tapAt(480, 372); await sleep(900); }
  async openBag() { const m = (await this.page.evaluate(() => window.__qa.touchMenu())).find(q => q.id === 'gear'); await this.tapAt(m.x + m.w / 2, m.y + m.h / 2); }
  async clickDisp(x, y) { await this.tapAt(x, y, 90); }
  async reset() { await this.move(0, 0); await this.attack(false); }
}

async function launch(opts = {}) {
  const br = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await br.newContext(Object.assign({ viewport: { width: 960, height: 540 } }, opts.context || {}));
  if (opts.pad) await ctx.addInitScript(PAD_STUB);
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push({ at: Date.now(), kind: 'pageerror', msg: e.message, stack: (e.stack || '').split('\n').slice(0, 4).join(' | ') }));
  page.on('console', m => { if (m.type() === 'error') errors.push({ at: Date.now(), kind: 'console', msg: m.text() }); });
  page.on('requestfailed', r => errors.push({ at: Date.now(), kind: 'requestfailed', msg: r.url() }));
  const url = 'file://' + path.join(ROOT, 'index.html') + (opts.query || '');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  await sleep(500);
  await page.evaluate(installHooks);
  return { br, ctx, page, errors, url };
}

module.exports = { launch, Bot, KbmDriver, PadDriver, TouchDriver, sleep, SHOTS, QA, ROOT, PAD_STUB };
