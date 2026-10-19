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

const LEVELS = { vale: [1, 2], pinewood: [2, 8], pinewood_boss: [6, 8], ruins: [8, 14] };
const OBJECTS = {
  vale: [{ t: 'chest', x: 4.5, y: 17.2, starter: true }, { t: 'checkpoint', x: 2.6, y: 21.2 }],
  pinewood: [{ t: 'chest', x: 13.2, y: 3.0, tier: 'silver' }, { t: 'checkpoint', x: 6.8, y: 19.2 }],
};
// trigger id -> actions appended once (matched by type)
const ACTIONS = {
  ruins: { clear1: [{ type: 'loot', rarity: 'uncommon', count: 1 }], clear2: [{ type: 'loot', rarity: 'uncommon', count: 1 }],
    bossintro: [{ type: 'checkpoint', text: 'Checkpoint: before the Warden' }] },
  pinewood: { ogres_done: [{ type: 'loot', rarity: 'uncommon', count: 1 }], calm: [{ type: 'loot', rarity: 'rare', count: 1 }] },
};
const ENEMIES = {
  ogre: { element: 'slash', res: { fire: -0.5 }, tags: ['beast'] },
  troll: { element: 'slash', res: { fire: -0.5, pierce: 0.5 }, tags: ['beast'] },
};

let n = 0;
for (const [id, lv] of Object.entries(LEVELS)) { const m = w.maps[id]; if (m && !Array.isArray(m.level)) { m.level = lv; n++; } }
for (const [id, list] of Object.entries(OBJECTS)) {
  const m = w.maps[id]; if (!m) continue;
  for (const o of list) if (!m.objects.some(q => q.t === o.t)) { m.objects.push(o); n++; }
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
