'use strict';
// Shared density helpers for the rule files (docs/design/world-maps.md G2; world-art minutes §2.3, §6.1 item 4). Not a recipe (leading _).
//   DENSITY   the x2.5 count factor applied to every rule's n
//   sstep     smoothstep
//   glade(c)  0 inside one open glade per 15 x 15 tiles (a hashed disc, r 2.2-3.4), 1 elsewhere, with a 1-tile soft rim, so
//             density has rhythm instead of an even carpet. Multiply a tree / big-prop rule's p by it.
//   verge(c)  1 on a corridor verge (0.6 < dPath < 2.5), 0 elsewhere: the verge gets its own lighter tree rule
const DENSITY = 2.5;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hashI = (i, j, s) => { let h = (i | 0) * 374761393 + (j | 0) * 668265263 + (s | 0) * 982451653; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const GLADE = 15;
function glade(c) {
  const ci = Math.floor(c.x / GLADE), cj = Math.floor(c.y / GLADE); let best = 1;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {   // a disc may reach over its cell edge
    const i = ci + di, j = cj + dj, gx = (i + 0.2 + 0.6 * hashI(i, j, 51)) * GLADE, gy = (j + 0.2 + 0.6 * hashI(i, j, 52)) * GLADE, r = 2.2 + 1.2 * hashI(i, j, 53);
    best = Math.min(best, sstep(r, r + 1, Math.hypot(c.x - gx, c.y - gy)));
  }
  return best;
}
const verge = c => c.dPath > 0.6 && c.dPath < 2.5 ? 1 : 0;
module.exports = { DENSITY, sstep, glade, verge };
