'use strict';
// REF PARTS — hand-authored pixel parts for the ref rig (client ruling: hybrid parts). The 3D rig poses them, gives them
// depth and sockets; these grids give the look the volumes cannot: crisp hair spikes with the blue streak, the face.
// One grid per facing (forge.js picks the grid of the bone's facing, nearest 45 deg; 8 true directions, never mirrored).
// Authored at 32 px from the measured reference proportions only (tools/forge/ref/SPEC.json numbers: head + hair about
// 14 x 11 px, face 6-8 x 4 px, hair = navy mass + a 5-7 px blue streak + a 2 px cyan glint). No reference pixel is copied
// here: this file is tracked, the reference is not.
//
// One drawing per facing, shared by every sprite of the head; each sprite's key takes only its own characters:
//   N hair navy   b hair blue   c hair cyan glint   |   o skin   s skin shadow   e eye (navy)
// `at` = the cell pinned on the sprite's bone point (the chin / nape).
const HEAD = {
  S: { at: [9, 11], rows: [
    '............N...',
    '...........NN...',
    '........NNNNN...',
    '......NNbNNNNN..',
    '....NNNNbNNNNNN.',
    '.NNNNNNNbccNNNNN',
    'NNNNNNNNbbbbNNN.',
    '..NNNNNNNNNNNNN.',
    '...NNNNoooooNN..',
    '...NNNeoooeoN...',
    '....NNeoooeoN...',
    '.....Nssssss....',
  ] },
  SE: { at: [10, 11], rows: [
    '..........N.....',
    '.........NN.....',
    '......NNNNNN....',
    '....NNNbNNNNN...',
    '..NNNNNbNNNNNN..',
    'NNNNNNNbccNNNNN.',
    '.NNNNNNbbbbNNN..',
    '..NNNNNNooooNN..',
    '...NNNNeooeoN...',
    '...NNNNeooeo....',
    '....NNNsssss....',
  ] },
  E: { at: [10, 8], rows: [
    '.......NN.......',
    '......NNNN......',
    '....NNNNNNN.....',
    '..NNNNbNNNNN....',
    'NNNNNNbccNNNN...',
    '.NNNNNbbbbNNNN..',
    '..NNNNNNNNoooo..',
    '...NNNNNNooeoo..',
    '...NNNNNoooeoo..',
    '....NNNNsssoo...',
    '.....NN..ss.....',
  ] },
  NE: { at: [9, 7], rows: [
    '.........N......',
    '........NNN.....',
    '.....NNNNNNN....',
    '...NNNNbNNNNN...',
    '.NNNNNNbccNNNNN.',
    'NNNNNNNbbbbNNN..',
    '..NNNNNNNNNNNs..',
    '...NNNNNNNNNss..',
  ] },
  N: { at: [7, 5], rows: [
    '.......NN.......',
    '......NNNN......',
    '....NNNNNNNN....',
    '..NNNNbNNNNNNN..',
    'NNNNNNbccNNNNNNN',
    '.NNNNNbbbbNNNNN.',
    '..NNNNNNNNNNNN..',
    '...NNNNNNNNNN...',
    '....NNNNNNNN....',
  ] },
  NW: { at: [5, 7], rows: [
    '......N.........',
    '.....NNN........',
    '....NNNNNNN.....',
    '...NNNNNbNNN....',
    '.NNNNNNNbccNNNN.',
    '..NNNNNNbbbbNNNN',
    '..sNNNNNNNNNNN..',
    '..ssNNNNNNNNN...',
  ] },
  W: { at: [6, 8], rows: [
    '.......NN.......',
    '......NNNN......',
    '.....NNNNNNN....',
    '....NNNNNbNNNN..',
    '...NNNNNNbccNNNN',
    '..NNNNNNNbbbbNN.',
    '..ooooNNNNNNNN..',
    '..ooeooNNNNNN...',
    '..ooeoooNNNNN...',
    '...oosssNNNN....',
    '.....ss..NN.....',
  ] },
  SW: { at: [5, 10], rows: [
    '.....N..........',
    '.....NN.........',
    '....NNNNNN......',
    '...NNNNNbNNN....',
    '..NNNNNNbccNNN..',
    '.NNNNNNNbbbbNNNN',
    '..NNNNNNNNNNNNN.',
    '..NNooooNNNNNN..',
    '..NoeooeoNNNN...',
    '...oeooeoNNNN...',
    '...ssssssNN.....',
  ] },
};

// The breastplate (armour piece), chest bone: d a A L = the plate ramp shadow / low / mid / high, N = navy (collar, belt).
// Bands from the measured reference: shadowed upper chest under the collar, a lit lower plate, the belt.
// Anchors: S, E, SW fitted on the board (converged); SE, NE, N, NW, W hand-set at the drawing's centre (there the fit
// ran to its search bound, i.e. it was hiding the sprite, not placing it).
const PLATE = {
  S: { at: [3, 3], rows: [
    '.NNddddNN.',
    '.NNddddNN.',
    '.aALLLLAa.',
    '.aAAAAAAa.',
    '.aaAAAAaa.',
    '..NNddNN..',
    '..NNNNNN..',
  ] },
  SE: { at: [5, 2], rows: [
    'NNddddNN..',
    'NNddddNN..',
    'aALLLAAa..',
    'aAAAAAAa..',
    'aaAAAAaa..',
    '.NNddNN...',
    '.NNNNNN...',
  ] },
  E: { at: [6, -1], rows: [
    '.NNddd..',
    '.Ndddd..',
    '.aALLAa.',
    '.aAAAAa.',
    '.aaAAaa.',
    '.NNddNN.',
    '..NNNN..',
  ] },
  NE: { at: [5, 2], rows: [
    '..aaddddaa',
    '..adddddda',
    '..aaaAAaaa',
    '..aaaAAaaa',
    '..ddaaaadd',
    '...NNNNNN.',
    '...NNNNNN.',
  ] },
  N: { at: [5, 2], rows: [
    '.aaddddaa.',
    '.adddddda.',
    '.aaaAAaaa.',
    '.aaaAAaaa.',
    '.ddaaaadd.',
    '..NNNNNN..',
    '..NNNNNN..',
  ] },
  NW: { at: [5, 2], rows: [
    'aaddddaa..',
    'adddddda..',
    'aaaAAaaa..',
    'aaaAAaaa..',
    'ddaaaadd..',
    '.NNNNNN...',
    '.NNNNNN...',
  ] },
  W: { at: [4, 2], rows: [
    '..dddNN.',
    '..ddddN.',
    '.aALLAa.',
    '.aAAAAa.',
    '.aaAAaa.',
    '.NNddNN.',
    '..NNNN..',
  ] },
  SW: { at: [4, 2], rows: [
    '..NNddddNN',
    '..NNddddNN',
    '..aALLLLAa',
    '..aAAAAAAa',
    '..aaAAAAaa',
    '...NNddNN.',
    '...NNNNNN.',
  ] },
};

// a pauldron (both shoulders, every facing: a lit dome reads the same from any side), upper arm bone
const DOME = { at: [2, 1], rows: ['.LLA.', 'LLAAa', 'aaAaa'] };
const PAULDRON = Object.fromEntries(['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'].map(d => [d, DOME]));

// the base shirt's front: the breastplate's drawings (the same cut, other colours; models/ref.js keys them), pinned at the
// drawing's own centre rather than at the plate's fitted anchors
const SHIRT = Object.fromEntries(Object.entries(PLATE).map(([d, g]) => [d, { at: [Math.floor(g.rows[0].length / 2), 2], rows: g.rows }]));
// a hand (both, every facing): o skin, s skin shadow; hand bone
const FIST = { at: [1, 1], rows: ['.oo', 'soo', 'ss.'] };
const HAND = Object.fromEntries(['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'].map(d => [d, FIST]));
// the shield (offhand bone, the way its face points): the red face with its rim and boss, edge-on, or the wooden back
//   y rim light   t rim   r face   R face shadow   Y boss   |   B wood dark   s wood
const ROUND = { at: [4, 4], rows: ['..yyyy..', '.yyrrrr.', 'yyrrrrrt', 'yrrYYrrt', 'yrrYYrrt', 'yrrrrrtt', '.rrRRtt.', '..RRRR..'] };
const EDGE = { at: [1, 4], rows: ['yt', 'yt', 'yt', 'yt', 'yt', 'yt', 'tt', 'tt'] };
const BACK = { at: [4, 4], rows: ['..BBBB..', '.BBssBB.', 'BssssssB', 'BssBBssB', 'BssBBssB', 'BssssssB', '.BBssBB.', '..BBBB..'] };
const SHIELD_FACE = { S: ROUND, SE: ROUND, SW: ROUND, E: EDGE, W: EDGE, NE: null, N: null, NW: null };
const SHIELD_BACK = { S: null, SE: null, SW: null, E: null, W: null, NE: BACK, N: BACK, NW: BACK };

// load-time lint: equal row widths, no lone pixel of one character (the build lint's rule, per drawing)
function lint(name, set) {
  for (const [d, g] of Object.entries(set)) {
    if (g === null) continue;
    const R = g.rows, w = R[0].length;
    R.forEach((r, y) => { if (r.length !== w) throw new Error(`${name}.${d} row ${y}: width ${r.length} != ${w}`); });
    for (let y = 0; y < R.length; y++) for (let x = 0; x < w; x++) {
      const c = R[y][x]; if (c === '.') continue;
      const same = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (R[y + dy] || '')[x + dx] === c);
      if (!same) throw new Error(`${name}.${d}: lone '${c}' at ${x},${y}`);
    }
  }
  return set;
}

module.exports = { HEAD: lint('HEAD', HEAD), PLATE: lint('PLATE', PLATE), PAULDRON: lint('PAULDRON', PAULDRON), HAND: lint('HAND', HAND), SHIRT,
  SHIELD_FACE: lint('SHIELD_FACE', SHIELD_FACE), SHIELD_BACK: lint('SHIELD_BACK', SHIELD_BACK), lint };
