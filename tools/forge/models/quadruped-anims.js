'use strict';
// QUADRUPED — the shared four-legged rig and animation set for forge beasts (models/shadehound.js; later the Thornback Boar
// and other beasts). Like models/humanoid-anims.js, poses are joint turns and small offsets, not lengths, so one table drives
// any body built with bones(dims): a long hound, a squat boar. Units are pixels, y up, the beast faces +z; its RIGHT side is
// -x. Bone names:
//   hips > chest > neck > head > jaw;  hips > tail1 > tail2 > tail3
//   chest > legFR/L > shinFR/L > pawFR/L (front: shoulder, elbow -> wrist, paw);  hips > legBR/L > shinBR/L > pawBR/L (hind:
//   thigh, hock, paw). Every leg bone hangs down its -y; a tail bone runs back along its -z.
// Turns: rot x NEGATIVE swings a leg FORWARD and lifts the head / neck (nose up), positive swings back / nose down; the
// jaw opens with positive; hips rot x pitches the whole body (negative = rearing, nose up). The hind legs rest bent (thigh forward, hock back, paw forward: digitigrade).
// anims(o) -> { idle, walk, attack, hit, death }: o.k scales the offsets (the body's size), o.stride the leg swing,
// o.ms overrides frame timings ({ attack: [...] }). ms = per-frame timing for board.js / the GIF; the game drives the
// attack's frames from the real AI timing (render.js: wind = f0-1, the action state = f2-3, rec = f4-5) and the death's from
// the corpse fling.
//   idle   6 frames (200 / 200 / 400 / 200 / 200 / 400): breathing, the tail sways
//   walk   6 frames @ 100 ms (the run: a bounding trot, diagonal pairs; no separate run, as the bible's walk)
//   attack 6 frames, the lunge (charge part: wind 0.6 s, lunge 0.5 s, rec 0.5 s): crouch -> coiled -> leap, jaws open ->
//          bite -> land -> stand
//   hit    1 frame: the head snaps up and back, the body flinches back
//   death  3 frames: recoil -> legs buckle -> on its side
const SIDES = [['R', -1], ['L', 1]];

// dims: { hip: y of the hip joints, len: hips -> chest (z), up: chest above the hips, wide: half the leg spread, drop: the
// shoulders below the chest joint, neck: [y, z], head: [y, z], jaw: [y, z], front: [upper, lower], back: [thigh, shin],
// tail: [y, z of the root, segment length] }
function bones(d) {
  const out = [
    { name: 'hips', at: [0, d.hip, -d.len / 2] },
    { name: 'chest', parent: 'hips', at: [0, d.up || 0, d.len] },
    { name: 'neck', parent: 'chest', at: [0, d.neck[0], d.neck[1]] },
    { name: 'head', parent: 'neck', at: [0, d.head[0], d.head[1]] },
    { name: 'jaw', parent: 'head', at: [0, d.jaw[0], d.jaw[1]] },
    { name: 'tail1', parent: 'hips', at: [0, d.tail[0], d.tail[1]] },
    { name: 'tail2', parent: 'tail1', at: [0, 0, -d.tail[2]] },
    { name: 'tail3', parent: 'tail2', at: [0, 0, -d.tail[2]] },
  ];
  for (const [s, k] of SIDES) out.push(
    { name: 'legF' + s, parent: 'chest', at: [d.wide * k, -(d.drop || 0), 0] },
    { name: 'shinF' + s, parent: 'legF' + s, at: [0, -d.front[0], 0] },
    { name: 'pawF' + s, parent: 'shinF' + s, at: [0, -d.front[1], 0] },
    { name: 'legB' + s, parent: 'hips', at: [d.wide * k, 0, 0] },
    { name: 'shinB' + s, parent: 'legB' + s, at: [0, -d.back[0], 0] },
    { name: 'pawB' + s, parent: 'shinB' + s, at: [0, -d.back[1], 0] });
  return out;
}

const merge = (...o) => { const out = {}; for (const p of o) for (const k in p) out[k] = Object.assign({}, out[k] || {}, p[k]); return out; };
// one leg: [upper, lower, paw] turns (x), added to the leg's rest
const REST = { F: [0, 0, 0], B: [-0.5, 0.95, -0.45] };
const leg = (id, t) => { const R = REST[id[0]]; return { ['leg' + id]: { rot: [R[0] + t[0], 0, 0] }, ['shin' + id]: { rot: [R[1] + t[1], 0, 0] }, ['paw' + id]: { rot: [R[2] + t[2], 0, 0] } }; };
const legs = (FR, FL, BR, BL) => merge(leg('FR', FR), leg('FL', FL), leg('BR', BR), leg('BL', BL));
// the tail: lift raises the root (rot x positive turns a -z bone up), the rest droops, sway swings it sideways
const tail = (lift, sway) => ({ tail1: { rot: [lift, sway, 0] }, tail2: { rot: [-0.3, sway * 0.8, 0] }, tail3: { rot: [-0.3, sway * 0.8, 0] } });
const Z = [0, 0, 0];

function anims(o = {}) {
  const k = o.k || 1, st = o.stride || 1, ms = o.ms || {};
  const off = v => v.map(x => x * k);
  const A = {
    idle: {
      frames: 6, ms: ms.idle || [200, 200, 400, 200, 200, 400],
      pose: f => { const d = [0, 0.5, 1, 1, 0.5, 0][f], s = [0, 0.12, 0.2, 0.12, 0, -0.1][f];
        return merge(legs(Z, Z, Z, Z), tail(0.35, s), { chest: { off: off([0, -0.35 * d, 0]) }, neck: { rot: [0.05 * d, 0, 0] }, head: { rot: [-0.05 * d, 0, 0] }, jaw: { rot: [0.04, 0, 0] } }); },
    },
    // the run: a bounding trot. Frame f of 6: the FR + BL pair at phase f / 6, the FL + BR pair half a cycle later. A leg
    // reaches forward, plants, sweeps back under the body, then folds (wrist / hock) as it comes forward again
    walk: {
      frames: 6, ms: ms.walk || [100, 100, 100, 100, 100, 100],
      pose: f => {
        const ph = q => (f / 6 + q) * 2 * Math.PI;
        const front = q => { const p = ph(q), sw = -0.55 * st * Math.cos(p), lift = Math.max(0, Math.sin(p)); return [sw, 0.9 * st * lift, -0.5 * lift]; };
        const back = q => { const p = ph(q), sw = -0.5 * st * Math.cos(p), lift = Math.max(0, Math.sin(p)); return [sw - 0.25 * lift, 0.5 * lift, 0.3 * lift]; };
        const bob = [0.8, 0, -0.4, 0.8, 0, -0.4][f];
        return merge(legs(front(0), front(0.5), back(0.5), back(0)), tail(0.55, [0.15, 0.05, -0.1, -0.15, -0.05, 0.1][f]),
          { hips: { off: off([0, bob, 0]), rot: [[0.05, 0, -0.05, 0.05, 0, -0.05][f], 0, 0] }, neck: { rot: [0.15, 0, 0] }, head: { rot: [-0.1 + 0.05 * bob, 0, 0] } });
      },
    },
    attack: {
      frames: 6, ms: ms.attack || [300, 300, 250, 250, 250, 250],
      pose: f => [
        // 0 wind: weight back, head low, lips back
        merge(legs([-0.1, 0.25, -0.1], [-0.1, 0.25, -0.1], [-0.25, 0.35, -0.1], [-0.25, 0.35, -0.1]), tail(0.2, 0),
          { hips: { off: off([0, -1.2, -0.6]), rot: [0.08, 0, 0] }, neck: { rot: [0.45, 0, 0] }, head: { rot: [-0.25, 0, 0] }, jaw: { rot: [0.2, 0, 0] } }),
        // 1 coiled: haunches down, front legs braced, jaws parting
        merge(legs([-0.25, 0.45, -0.15], [-0.25, 0.45, -0.15], [-0.45, 0.65, -0.2], [-0.45, 0.65, -0.2]), tail(0.1, 0),
          { hips: { off: off([0, -2.4, -1.0]), rot: [-0.12, 0, 0] }, neck: { rot: [0.35, 0, 0] }, head: { rot: [-0.3, 0, 0] }, jaw: { rot: [0.35, 0, 0] } }),
        // 2 leap: stretched out, front legs reaching, hind legs thrown back, jaws wide
        merge(legs([-1.1, 0.2, -0.2], [-1.0, 0.3, -0.2], [0.9, -0.5, 0.6], [0.95, -0.5, 0.6]), tail(0.5, 0),
          { hips: { off: off([0, 1.6, 0.8]), rot: [-0.12, 0, 0] }, neck: { rot: [-0.1, 0, 0] }, head: { rot: [0.05, 0, 0] }, jaw: { rot: [0.6, 0, 0] } }),
        // 3 bite: the jaws snap shut, front paws coming down
        merge(legs([-0.75, 0.1, -0.1], [-0.65, 0.2, -0.1], [0.6, -0.3, 0.4], [0.65, -0.3, 0.4]), tail(0.6, 0.1),
          { hips: { off: off([0, 0.8, 0.8]), rot: [0.1, 0, 0] }, neck: { rot: [0.2, 0, 0] }, head: { rot: [0.0, 0, 0] }, jaw: { rot: [0.0, 0, 0] } }),
        // 4 land: front legs take the weight, hind legs swing under
        merge(legs([-0.2, 0.25, -0.2], [-0.1, 0.3, -0.2], [-0.2, 0.3, -0.1], [-0.15, 0.3, -0.1]), tail(0.45, -0.1),
          { hips: { off: off([0, -0.8, 0.2]), rot: [0.12, 0, 0] }, neck: { rot: [0.25, 0, 0] }, head: { rot: [-0.1, 0, 0] }, jaw: { rot: [0.1, 0, 0] } }),
        // 5 stand
        merge(legs(Z, Z, Z, Z), tail(0.4, 0), { hips: { off: off([0, -0.2, 0]) }, neck: { rot: [0.1, 0, 0] }, jaw: { rot: [0.05, 0, 0] } }),
      ][f],
    },
    hit: {
      frames: 1, ms: ms.hit || [200],
      pose: () => merge(legs([0.25, 0.2, 0], [0.2, 0.25, 0], [-0.1, 0.2, 0], [-0.1, 0.2, 0]), tail(0.1, 0.2),
        { hips: { off: off([0, -0.6, -0.8]), rot: [-0.12, 0.1, 0] }, neck: { rot: [-0.35, 0, 0] }, head: { rot: [-0.25, 0, 0] }, jaw: { rot: [0.3, 0, 0] } }),
    },
    // death: recoils, the legs buckle, it rolls onto its side (hips rot z), legs stiff
    death: {
      frames: 3, ms: ms.death || [180, 180, 400],
      pose: f => [
        merge(legs([0.3, 0.3, 0], [0.25, 0.3, 0], [-0.1, 0.3, 0], [-0.1, 0.3, 0]), tail(0, 0.2),
          { hips: { off: off([0, -0.8, -1.0]), rot: [-0.18, 0, 0] }, neck: { rot: [-0.45, 0, 0] }, head: { rot: [-0.2, 0, 0] }, jaw: { rot: [0.4, 0, 0] } }),
        merge(legs([-0.2, 0.9, 0], [-0.2, 0.9, 0], [-0.5, 0.9, 0], [-0.5, 0.9, 0]), tail(-0.2, 0),
          { hips: { off: off([0, -4.0, -0.6]), rot: [0.1, 0, 0.35] }, neck: { rot: [0.5, 0, 0] }, head: { rot: [0.2, 0, 0] }, jaw: { rot: [0.25, 0, 0] } }),
        merge(legs([-0.5, 0.3, 0], [-0.3, 0.2, 0], [0.4, -0.4, 0], [0.3, -0.3, 0]), tail(-0.1, 0.3),
          { hips: { off: off([0, -6.0, 0]), rot: [0, 0, 1.45] }, neck: { rot: [0.25, 0.2, 0] }, head: { rot: [0.1, 0, 0] }, jaw: { rot: [0.3, 0, 0] } }),
      ][f],
    },
  };
  return A;
}

// ---- ENEMY ADDITIONS (M4b enemy forge): extra anims for the burrowers and bosses (boar, Thornsow, Mossjaw) ---------------
// more(o) -> { burrow, erupt, howl, idle4, walk4 }, the same o as anims(o):
//   burrow 2 frames (the burrow part's wind: render.js plays f0 -> f1 over it): front paws dig, the snout goes down, the
//          haunches rise -> deeper, the whole body pitched into the hole (the dirt mound takes over once e.under)
//   erupt  2 frames (the rec after an eruption): bursting up out of the ground, reared, legs tucked -> landing
//   howl   1 frame (a boss summon): sat back on the haunches, the head thrown up, the jaws wide
//   idle4 / walk4: 4-frame idle (breathing 0, 1, 1, 0 with the tail swing) and 4-frame trot for boss-scale bodies (the bank cap)
function more(o = {}) {
  const k = o.k || 1, st = o.stride || 1, off = v => v.map(x => x * k);
  return {
    burrow: {
      frames: 2, ms: [300, 300],
      pose: f => [
        merge(legs([-0.9, 0.9, -0.6], [0.3, 0.4, 0.2], [-0.35, 0.5, -0.1], [-0.35, 0.5, -0.1]), tail(0.6, 0.2),
          { hips: { off: off([0, -0.4, 0.4]), rot: [0.3, 0, 0] }, neck: { rot: [0.6, 0, 0] }, head: { rot: [0.35, 0, 0] }, jaw: { rot: [0.25, 0, 0] } }),
        merge(legs([0.3, 0.6, 0.2], [-0.8, 0.8, -0.5], [-0.6, 0.8, -0.2], [-0.6, 0.8, -0.2]), tail(0.9, -0.2),
          { hips: { off: off([0, -2.0, 0.8]), rot: [0.5, 0, 0] }, neck: { rot: [0.7, 0, 0] }, head: { rot: [0.4, 0, 0] }, jaw: { rot: [0.3, 0, 0] } }),
      ][f],
    },
    erupt: {
      frames: 2, ms: [250, 300],
      pose: f => [
        merge(legs([-1.1, 1.2, -0.4], [-0.9, 1.1, -0.4], [0.4, 0.2, 0.3], [0.5, 0.2, 0.3]), tail(0.1, 0),
          { hips: { off: off([0, 3.0, 0.4]), rot: [-0.45, 0, 0] }, neck: { rot: [-0.3, 0, 0] }, head: { rot: [-0.1, 0, 0] }, jaw: { rot: [0.6, 0, 0] } }),
        merge(legs([-0.3, 0.35, -0.2], [-0.2, 0.35, -0.2], [-0.25, 0.4, -0.1], [-0.2, 0.4, -0.1]), tail(0.5, 0.1),
          { hips: { off: off([0, -1.0, 0.3]), rot: [0.1, 0, 0] }, neck: { rot: [0.2, 0, 0] }, head: { rot: [-0.05, 0, 0] }, jaw: { rot: [0.15, 0, 0] } }),
      ][f],
    },
    howl: {
      frames: 1, ms: [600],
      pose: () => merge(legs([-0.25, 0.2, 0], [-0.25, 0.2, 0], [-0.9, 1.4, -0.5], [-0.9, 1.4, -0.5]), tail(-0.1, 0),
        { hips: { off: off([0, -1.8, -0.4]), rot: [-0.45, 0, 0] }, neck: { rot: [-0.55, 0, 0] }, head: { rot: [-0.45, 0, 0] }, jaw: { rot: [0.7, 0, 0] } }),
    },
    idle4: {
      frames: 4, ms: [300, 300, 300, 300],
      pose: f => { const d = [0, 1, 1, 0][f], s = [0, 0.15, -0.05, -0.15][f];
        return merge(legs(Z, Z, Z, Z), tail(0.35, s), { chest: { off: off([0, -0.4 * d, 0]) }, neck: { rot: [0.06 * d, 0, 0] }, head: { rot: [-0.06 * d, 0, 0] }, jaw: { rot: [0.04 + 0.06 * d, 0, 0] } }); },
    },
    walk4: {
      frames: 4, ms: [150, 150, 150, 150],
      pose: f => {
        const ph = q => (f / 4 + q) * 2 * Math.PI;
        const front = q => { const p = ph(q), sw = -0.5 * st * Math.cos(p), lift = Math.max(0, Math.sin(p)); return [sw, 0.85 * st * lift, -0.45 * lift]; };
        const back = q => { const p = ph(q), sw = -0.45 * st * Math.cos(p), lift = Math.max(0, Math.sin(p)); return [sw - 0.25 * lift, 0.5 * lift, 0.3 * lift]; };
        const bob = [0.6, -0.3, 0.6, -0.3][f];
        return merge(legs(front(0), front(0.5), back(0.5), back(0)), tail(0.5, [0.12, -0.04, -0.12, 0.04][f]),
          { hips: { off: off([0, bob, 0]), rot: [[0.04, -0.03, 0.04, -0.03][f], 0, 0] }, neck: { rot: [0.12, 0, 0] }, head: { rot: [-0.08 + 0.05 * bob, 0, 0] } });
      },
    },
  };
}

module.exports = { bones, anims, more, SIDES, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'] };
