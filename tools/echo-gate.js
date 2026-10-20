#!/usr/bin/env node
'use strict';
// tools/echo-gate.js — the §30 Echo balance gate. Reuses tools/balsim.js's model (the real game code in a vm, seeded
// Math.random, reference gear, the basic x3 -> skill -> dodge rotation): everything above balsim's "run" marker is loaded
// as is (so this never drifts from the sim), then gate() below runs in that scope.
// Rotation DPS against a neutral (no res, no tags), frozen, 1e9-HP hound, with and without the 'echo' rule on the weapon:
//   unfocused = balsim 'reference' gear (diamonds) with a non-element ring boon (markCap)
//   focused   = the same gear, the family's element gem in every socket + that element's ring boon
//               (sword amethyst / arcane, staff ruby / fire, bow topaz / lightning)
// Gate (§30): focused mean +25..30 % DPS, every unfocused row <= +15 %. Exit 1 on a miss.
//   node tools/echo-gate.js [--T=300] [--L=18,22,28,34] [--fam=sword,staff,bow] [--k= --floor= --a0= --full=] [--brief] [--seed=N]
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, 'balsim.js'), 'utf8');
const CUT = SRC.indexOf('// ---------------------------------------------------------------- run');
if (CUT < 0) { console.error('echo-gate: balsim.js "run" marker not found'); process.exit(2); }
const MODEL = SRC.slice(SRC.indexOf('\n', SRC.indexOf("'use strict';")), CUT);

function gate() {
  const FOCUS = { sword: ['amethyst', 'arcanePower'], staff: ['ruby', 'fireBurn'], bow: ['topaz', 'lightningPower'] };
  for (const k of ['k', 'floor', 'a0', 'full']) if (arg(k, '') !== '') ev(`ECHO.${k} = ${+arg(k, '')}`);
  function run(fam, L, mode, echo, T) {
    ev(`simMap(${bandOf(L).lo}, ${bandOf(L).hi})`);
    ev(`simHero(${JSON.stringify(FAMS[fam])}, ${L}, '${rarityAt(L)}', 'reference')`);
    ev(`(() => { const p = G.player; G.echo = null; const F = ${JSON.stringify(FOCUS[fam])};
      const r2 = p.equip.ring2; if (r2 && r2.boon) r2.boon = Object.assign({}, r2.boon, { id: '${mode}' === 'focused' ? F[1] : 'markCap' });
      if ('${mode}' === 'focused') for (const s of EQUIP_SLOTS) { const it = p.equip[s]; if (it && it.sockets) it.sockets = it.sockets.map(() => F[0] + '_${gemGrade(L)}'); }
      if (${echo}) p.equip.weapon.rule = 'echo';
      recalcStats(p, true); })()`);
    ctx.__t = ev(`(() => { const e = spawnEnemy('hound', 27, 24, 0); e.hp = e.maxHp = 1e9; e.res = {}; e.tags = []; e.stunT = 9; G.__ultFirst = null; return e; })()`);
    ev(`(() => { G.__dm = { hero: 0, echo: 0 }; if (!G.__wrapped) { G.__wrapped = 1; const D = damageEnemy;
      damageEnemy = function (e, b, o = {}) { const c = o.cast !== undefined ? o.cast : CAST, h0 = e.hp, r = D(e, b, o); G.__dm[c && c.src === 'echo' ? 'echo' : 'hero'] += h0 - e.hp; return r; }; } })()`);
    const rr = ev(`simRotation(__t, ${T}, ${standoffOf(fam)})`);
    return { dps: (1e9 - ctx.__t.hp) / T, el: ev(`G.echo ? G.echo.el : '-'`), n: ev(`G.echo ? G.echo.count : 0`), ults: rr.ultAt.length, dm: ev('G.__dm'),
      amp: ev(`Math.round(Math.max(...ECHO.els.map(el => echoAmpOf(G.player, el))) * 100)`) };
  }
  const T = +arg('T', 300), LV = arg('L', '18,22,28,34').split(',').map(Number), FAMF = arg('fam', 'sword,staff,bow').split(',');
  const rows = [];
  for (const L of LV) for (const fam of FAMF) for (const mode of ['unfocused', 'focused']) {
    const a = run(fam, L, mode, false, T), b = run(fam, L, mode, true, T);
    rows.push({ L, fam, mode, 'top el %': b.amp, el: b.el, dps: Math.round(a.dps), 'dps+echo': Math.round(b.dps), 'gain %': +((b.dps / a.dps - 1) * 100).toFixed(1),
      'echo share %': Math.round(b.dm.echo / (b.dm.echo + b.dm.hero) * 100), replays: b.n, 'R casts': a.ults + '/' + b.ults });
  }
  if (!process.argv.includes('--brief')) console.table(rows);
  const U = rows.filter(x => x.mode === 'unfocused'), F = rows.filter(x => x.mode === 'focused'), mean = r => r.reduce((s, x) => s + x['gain %'], 0) / r.length;
  const fm = mean(F), umax = Math.max(...U.map(x => x['gain %'])), pass = fm >= 25 && fm <= 30 && umax <= 15;
  console.log(`echo k=${ev('ECHO.k')} floor=${ev('ECHO.floor')} a0=${ev('ECHO.a0')} full=${ev('ECHO.full')}  T=${T}s`);
  console.log(`  focused   mean +${fm.toFixed(1)} %  (rows ${Math.min(...F.map(x => x['gain %']))}..${Math.max(...F.map(x => x['gain %']))})   gate +25..30 % mean`);
  console.log(`  unfocused mean +${mean(U).toFixed(1)} %  max +${umax} %   gate <= +15 %`);
  console.log(pass ? 'ECHO GATE: PASS' : 'ECHO GATE: FAIL');
  process.exitCode = pass ? 0 : 1;
}
new Function('require', '__dirname', 'process', 'console', MODEL + '\n;(' + gate.toString() + ')();')(require, __dirname, process, console);
