'use strict';
// MOSSJAW, MOVES (mossjaw_moves): the Mossjaw rig's move anims (attack 6: lunge / root-spit, burrow 2) in their own bank
// file, so each of the boss's two files stays under the 160 KB cap (models/mossjaw.js). Not an enemy row: render.js
// FEN.split draws these anims for mossjaw.
module.exports = require('./mossjaw.js').make('moves');
