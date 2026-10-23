'use strict';
// OLD BRAMBLEHORN, MOVES (ramblehorn_moves): the guardian's move anims (attack 6, stomp 2, grab 2) in their own bank file
// (models/bramblehorn.js). Not an enemy row: render.js FEN.split draws these anims for ramblehorn.
module.exports = require('./bramblehorn.js').make('moves');
