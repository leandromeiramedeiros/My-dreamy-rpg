'use strict';
// Game data the map recipes read at build time (classic scripts evaluated in isolation, nothing is duplicated here):
//   DIALOGUE, QUESTS   <- js/dialogue.js         ENCOUNTERS, ENEMY_DATA <- js/enemydata.js
// packs: id -> { id, zone, members, roles{anchor,pressure,support,ranged}, wrongWeapon, after }
const fs = require('fs'), path = require('path');
const JS = path.join(__dirname, '..', '..', 'js');
const load = (file, names) => new Function(fs.readFileSync(path.join(JS, file), 'utf8') + ';return {' + names.join(',') + '};')();
const dlg = load('dialogue.js', ['DIALOGUE', 'QUESTS']);
const en = load('enemydata.js', ['ENEMY_DATA', 'ENCOUNTERS']);
const packs = {};
for (const [zone, list] of Object.entries(en.ENCOUNTERS)) for (const p of list) packs[p.id] = Object.assign({ zone }, p);
// does the engine run the spawnPack trigger action yet?  (decides T.packMode in build.js)
const engineHasSpawnPack = () => /spawnPack/.test(fs.readFileSync(path.join(JS, 'game.js'), 'utf8'));
// M2c engine features the generator adapts to (detected from CODE, comment lines stripped: js/maps.js documents the contract before it lands).
//   gutter   tiles 'v' / 'k' for the void gutters (maps.js isGutter)        warpdoor  OBJ_TYPES.warpdoor (maps.js)
//   warp     the `warp` trigger action (game.js)                            arena     the `arena` + `closeGate` actions and open gates (game.js)
const codeOf = f => { try { return fs.readFileSync(path.join(JS, f), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n'); } catch (e) { return ''; } };
const engineHas = () => { const maps = codeOf('maps.js'), game = codeOf('game.js'); return { gutter: /const isGutter\b/.test(maps), warpdoor: /^\s*warpdoor:\s*\{/m.test(maps) && /function startWarp\b/.test(game), warp: /case 'warp'/.test(game), arena: /case 'arena'/.test(game) && /case 'closeGate'/.test(game) }; };
module.exports = { engineHas, DIALOGUE: dlg.DIALOGUE, QUESTS: dlg.QUESTS, ENEMY_DATA: en.ENEMY_DATA, ENCOUNTERS: en.ENCOUNTERS, packs, engineHasSpawnPack };
