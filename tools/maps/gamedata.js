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
module.exports = { DIALOGUE: dlg.DIALOGUE, QUESTS: dlg.QUESTS, ENEMY_DATA: en.ENEMY_DATA, ENCOUNTERS: en.ENCOUNTERS, packs, engineHasSpawnPack };
