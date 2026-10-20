#!/usr/bin/env node
'use strict';
// tools/m1-world.js -- idempotently applies the M1 (inventory & loot) additions to js/world.js:
// zone level bands, the Vale starter chest + checkpoint shrines, room-clear `loot` / `checkpoint` actions,
// and damage types for the editor-made enemies. Safe to re-run after a map regeneration.
//   node tools/m1-world.js [path/to/world.js]
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'js', 'world.js');
const src = fs.readFileSync(file, 'utf8');
const w = new Function(src + ';return WORLD_DATA;')();
const worldSource = d => "'use strict';\n// The game world: maps, triggers (logic) and tuning. Edit it visually with editor.html,\n// which can publish straight back to this file on GitHub.\nconst WORLD_DATA = " + JSON.stringify(d, null, 1) + ';\n';

// DESIGN §3/§11 bands (always written, so a re-run follows the design)
const LEVELS = { vale: [1, 3], pinewood: [3, 10], roothollow: [3, 10], pinewood_boss: [6, 10], ruins: [10, 17] };   // Act I maps now carry the same band from their recipes (tools/maps/recipes)
// vale / pinewood used to get a hand-placed chest, shrine and tablet here (coordinates of the old 24x24 / 26x26 maps). The generated
// 40x40 / 56x56 maps place their own, so only maps without a recipe are listed (none today).
const OBJECTS = {};
// trigger id -> actions appended once (matched by type)
const ACTIONS = {
  ruins: { clear1: [{ type: 'loot', rarity: 'uncommon', count: 1 }], clear2: [{ type: 'loot', rarity: 'uncommon', count: 1 }],
    bossintro: [{ type: 'checkpoint', text: 'Checkpoint: before the Warden' }] },
};
const ENEMIES = {
  ogre: { element: 'slash', res: { fire: -0.5 }, tags: ['beast'] },
  troll: { element: 'slash', res: { fire: -0.5, pierce: 0.5 }, tags: ['beast'] },
};

let n = 0;
for (const [id, lv] of Object.entries(LEVELS)) { const m = w.maps[id]; if (m && String(m.level) !== String(lv)) { m.level = lv; n++; } }
for (const m of Object.values(w.maps)) m.objects.forEach(o => { if (o.t === 'checkpoint') { o.t = 'shrine'; n++; } });   // early M1 builds used 'checkpoint'
for (const [id, list] of Object.entries(OBJECTS)) {
  const m = w.maps[id]; if (!m) continue;
  for (const o of list) if (!m.objects.some(q => q.t === o.t && Math.hypot(q.x - o.x, q.y - o.y) < 0.5)) { m.objects.push(o); n++; }
}
for (const [id, trs] of Object.entries(ACTIONS)) {
  const m = w.maps[id]; if (!m) continue;
  for (const [tid, acts] of Object.entries(trs)) {
    const tr = (m.triggers || []).find(t => t.id === tid); if (!tr) continue;
    for (const a of acts) if (!tr.actions.some(q => q.type === a.type)) { tr.actions.push(a); n++; }
  }
}
for (const [k, add] of Object.entries(ENEMIES)) {
  const e = w.enemies && w.enemies[k]; if (!e) continue;
  for (const f in add) if (e[f] == null) { e[f] = add[f]; n++; }
}
fs.writeFileSync(file, worldSource(w));
console.log(`m1-world: ${n} change(s) -> ${path.relative(process.cwd(), file)}`);
