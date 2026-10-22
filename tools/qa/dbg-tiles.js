'use strict';
// node tools/qa/dbg-tiles.js <map> x0 y0 x1 y1 -- ASCII dump of heights (0-9, a=10..) / blocked (#) / void (space) / water (~) + colliders (o)
const { launch } = require('./lib');
(async () => {
  const [map, x0, y0, x1, y1] = process.argv.slice(2);
  const { br, page } = await launch({ query: '?map=' + map });
  const out = await page.evaluate(([x0, y0, x1, y1]) => {
    const m = G.map, L = [];
    L.push('     ' + Array.from({ length: x1 - x0 + 1 }, (_, k) => String((x0 + k) % 10)).join(''));
    for (let j = y0; j <= y1; j++) {
      let s = String(j).padStart(4) + ' ';
      for (let i = x0; i <= x1; i++) {
        const t = m.type[j] && m.type[j][i];
        if (!t) { s += ' '; continue; }
        const col = m.colliders.some(c => c.r > 0 && Math.floor(c.x) === i && Math.floor(c.y) === j);
        if (m.block[j][i]) s += '#'; else if (col) s += 'o'; else if (/water|w/.test(t) && t !== 'x') s += t[0] === 'w' ? '~' : (m.h[j][i]).toString(36); else s += (m.h[j][i]).toString(36);
      }
      L.push(s);
    }
    return L.join('\n');
  }, [+x0, +y0, +x1, +y1]);
  console.log(out); await br.close();
})();
