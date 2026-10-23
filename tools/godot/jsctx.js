'use strict';
// tools/godot/jsctx.js -- loads the JS reference build (tag js-final) headless in a Node vm context, the way tools/balsim.js
// did: the classic scripts of index.html in order up to game.js (minus the sprite builders), then status.js and arenas.js,
// sharing one global scope. Returns { ctx, ev, ROOT }. Read-only: nothing in the reference checkout is written.
//   REF = --ref=<dir> | $JS_REF | ../My-dreamy-rpg/.claude/worktrees/js-reference (the js-final checkout)
const fs = require('fs'), path = require('path'), vm = require('vm');

function refRoot() {
  const a = process.argv.find(x => x.startsWith('--ref='));
  if (a) return path.resolve(a.slice(6));
  if (process.env.JS_REF) return path.resolve(process.env.JS_REF);
  const guess = [path.resolve(__dirname, '../../../js-reference'), path.resolve(__dirname, '../../.claude/worktrees/js-reference'), path.resolve(__dirname, '../..')];
  for (const g of guess) if (fs.existsSync(path.join(g, 'js', 'data.js')) && fs.existsSync(path.join(g, 'index.html'))) return g;
  throw new Error('JS reference not found: pass --ref=<js-final checkout> or set JS_REF');
}

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function load() {
  const ROOT = refRoot();
  const SMath = Object.create(Math); SMath.random = mulberry32(7);
  const noop = () => {};
  const ctx = {
    console: { log: noop, warn: noop, error: (...a) => console.error(...a) }, Math: SMath, Date, JSON, URLSearchParams,
    location: { search: '?balsim=1', pathname: '/' }, localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    document: { getElementById: () => null, createElement: () => ({ getContext: () => null, style: {} }), addEventListener: noop },
    addEventListener: noop, requestAnimationFrame: noop, setTimeout: noop, navigator: {}, performance: { now: () => 0 },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  // CT templates (data.js): record each row's template name + options, so the seed reads them as data (CT.dash -> a Dash block)
  vm.runInContext(`var __ct = (k, o) => Object.assign(CT[k](o), { __ct: k, __o: o });`, ctx);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const order = [...html.matchAll(/<script\s+src="js\/([a-z0-9_-]+)\.js"/g)].map(m => m[1]);
  const LOAD = order.slice(0, order.indexOf('game') + 1).filter(f => !['sprites', 'art', 'enemyart'].includes(f));
  if (!LOAD.includes('itemdata')) LOAD.splice(LOAD.indexOf('items') + 1, 0, 'itemdata');
  for (const extra of ['status', 'arenas']) if (!LOAD.includes(extra)) LOAD.push(extra);
  for (const f of LOAD) {
    let src = fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
    if (f === 'data') src = src.replace(/\.\.\.CT\.(\w+)\(/g, '...__ct(\'$1\', ');
    vm.runInContext(src, ctx, { filename: 'js/' + f + '.js' });
  }
  const ev = s => vm.runInContext(s, ctx);
  ev(`buildPlayerSprites = () => { const f = [0, 0, 0, 0]; return { front: f, frontF: f, back: f, backF: f }; }; var worldToView = () => [0, 0];
    var IN = { aim: { mode: 'auto' }, move: { x: 0, y: 0, mag: 0 }, assist: () => false, glyph: () => '', pressed: () => false, held: () => false }; var __NG = 1;`);
  ev('var ART = { custom: {}, customF: {}, boss: {} }; if (typeof applyTuning === "function") applyTuning(WORLD_DATA.tuning); if (typeof applyWorldEnemies === "function") applyWorldEnemies(WORLD_DATA.enemies);');
  return { ctx, ev, ROOT, LOAD };
}

module.exports = { load };
