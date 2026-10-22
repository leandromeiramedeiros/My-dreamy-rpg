'use strict';
// node tools/qa/dbg-path.js <map> <fromX> <fromY> <toX> <toY> [...more toX toY] -- prints the bot planner's path (lib.js __qa.path) and
// which trigger circles it crosses (debug only: places the hero directly).
const { launch } = require('./lib');
(async () => {
  const a = process.argv.slice(2), map = a[0], fx = +a[1], fy = +a[2], tg = [];
  for (let i = 3; i + 1 < a.length; i += 2) tg.push([+a[i], +a[i + 1]]);
  const { br, page } = await launch({ query: '?map=' + map });
  if (process.env.PRE) console.log('pre:', await page.evaluate(process.env.PRE));   // e.g. PRE="openGate('arena_gate')"
  for (const [tx, ty] of tg) {
    const r = await page.evaluate(([fx, fy, tx, ty]) => {
      const p = G.player, m = G.map; p.x = fx; p.y = fy; p.z = tileH(m, fx, fy);
      const r = window.__qa.path(tx, ty); if (!r) return null;
      let len = 0, prev = [fx, fy]; const hits = new Set();
      for (const q of r.pts) { const n = Math.ceil(Math.hypot(q[0] - prev[0], q[1] - prev[1]) / 0.5); for (let k = 1; k <= n; k++) { const x = prev[0] + (q[0] - prev[0]) * k / n, y = prev[1] + (q[1] - prev[1]) * k / n; for (const t of m.triggers) { const w = t.when || {}; if (w.type === 'enter_area' && Math.hypot(x - w.x, y - w.y) < (+w.r || 1)) hits.add(t.id); } } len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
      return { len: +len.toFixed(1), n: r.pts.length, exact: r.reachedExact, pts: r.pts.map(q => q.map(v => +v.toFixed(1)).join(',')).join(' '), hits: [...hits] };
    }, [fx, fy, tx, ty]);
    console.log(`to ${tx},${ty}:`, JSON.stringify(r));
  }
  await br.close();
})();
