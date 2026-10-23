'use strict';
// THE GLOAM WARDEN, MOVES (gloamwarden_moves): the boss's move anims (attack 6 = the cleave, slam 2, volley 2, charge 1) in
// their own bank file (models/gloamwarden.js). Not an enemy row: render.js FEN.split draws these anims for gloamwarden.
module.exports = require('./gloamwarden.js').make('moves');
