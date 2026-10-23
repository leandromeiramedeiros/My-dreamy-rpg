'use strict';
// THE OATHLESS, MOVES (oathless_moves): the mini-boss's move anims (attack 6 = the cleave, wall 1, volley 2) in their own
// bank file (models/oathless.js). Not an enemy row: render.js FEN.split draws these anims for oathless.
module.exports = require('./oathless.js').make('moves');
