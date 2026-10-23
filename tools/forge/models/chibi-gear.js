'use strict';
// CHIBI GEAR — the knight line for the chibi rig (models/chibi.js) in five SHAPE tiers, each baked as its own piece
// (<family>.t1 .. .t5): every tier keeps the one below it and adds plates, trim, gems, spikes, wings or glow.
//   T1 Squire   iron kettle hat, quilted gambeson, leather boots, wooden buckler, Rusty Blade, short cloak
//   T2 Footman  nasal helm, steel cuirass + mail + a leather shoulder strap, greaves, steel heater shield, Dawnblade, knee cloak
//   T3 Knight   crested bascinet + plume, two-lame pauldrons, gold trim, red tabard + emblem, Sunforged Blade, clasped cape
//   T4 Paladin  winged helm + forehead gem, spiked pauldrons, chest sapphire + filigree, kite shield, Aurora Edge, fur collar
//   T5 Radiant  pearl plate: closed crown helm with a glowing visor, fanned pauldrons, sun core + runes, sun shield, Dawn Eternal,
//               deep-blue sun cape
//   T6 Mythic   (.t6) the T5 shapes in night-forged steel plus ONE unique part per line and one emissive hue: the Warden suit is
//               Shardheart Plate (frost crystals: shard crown + wings, crystal heart, pauldron and heel shards, crystal mantle),
//               the sword Morrowbane (holy: a sun halo behind the guard), the Heater wears gold crest wings. The glow is a flat
//               1 px run of at most 4 px per frame (tools/forge/tiers.js counts it); gems are ordinary shaded ramps.
// Family ids follow js/data.js (knighthelm / warden / knightgreaves; the weapon is the sword family).
const { SIDES, both, TIERS, metal, METAL, GOLD, MAIL, LEATHER, STRAP, WOOD, QUILT, STITCH, CLOTH, FEATHER, FUR, SAPPHIRE, RUBY, CORE, VISOR, RUST, CROSS, SUN,
  GLOW, flatOf, FROSTG, HOLYG, rotv, piece, notAttack, r3, ring } = require('./chibi-palette.js');

// ---- head ------------------------------------------------------------------------------------------------------------
function knighthelm(t) {
  const M = t === 6, P = [], stamps = [], mats = { metal: metal(M ? METAL[3] : METAL[t - 1]), gold: GOLD, plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], feather: { ramp: ['#6a6a8a', '#a8b0d0', '#e4e8f8', '#ffffff'], fine: true }, gem: SAPPHIRE, visor: VISOR, slot: flatOf('#141022'), shard: FROSTG, glow: flatOf(GLOW.frost) };
  if (t === 1) {                                                // kettle hat: a crown and a wide brim, the fringe and side locks show
    P.push({ bone: 'head', mat: 'metal', part: 'helm', shape: 'ell', c: [0, 9.0, -0.1], r: [6.6, 4.2, 6.1], clip: [0, -1, 0, -7.6] },
      { bone: 'head', mat: 'metal', part: 'brim', shape: 'disc', c: [0, 8.0, 0.1], r: [8.4, 0.55, 7.8] });
  } else if (t === 2) {                                         // nasal helm: a pointed dome, a riveted band, a nose bar
    P.push({ bone: 'head', mat: 'metal', part: 'helm', shape: 'ell', c: [0, 7.0, -0.2], r: [6.85, 6.2, 6.35], clip: [[0, -0.22, 0.98, 2.7], [0, -1, 0, -2.2]] },
      { bone: 'head', mat: 'metal', part: 'helm', shape: 'cap', a: [0, 11.8, -0.3], b: [0, 14.2, -0.8], ra: 2.2, rb: 0.35 },
      { bone: 'head', mat: 'metal', part: 'band', shape: 'disc', c: [0, 7.6, -0.2], r: [6.95, 0.65, 6.4] },
      { bone: 'head', mat: 'metal', part: 'nasal', shape: 'cap', a: [0, 8.0, 6.15], b: [0, 4.4, 6.2], ra: 0.55, rb: 0.5 });
  } else if (M) {                                               // Mythic: the open bascinet in silver, a frost brow band and a crown of five upright ice shards
    P.push({ bone: 'head', mat: 'metal', part: 'helm', shape: 'ell', c: [0, 6.7, -0.3], r: [6.9, 6.5, 6.4], clip: [[0, -0.22, 0.98, 2.4], [0, -1, 0, -1.0]] },
      { bone: 'head', mat: 'shard', part: 'trim', shape: 'disc', c: [0, 7.9, 0], r: [7.0, 0.6, 6.45] },
      ...both((s, k) => [{ bone: 'head', mat: 'metal', part: 'cheek', shape: 'ell', c: [4.9 * k, 3.4, 2.9], r: [1.7, 2.8, 1.9], rot: [0, 0, -0.12 * k] }]),
      ...[[-3.6, 5.4], [-1.8, 7.6], [0, 9.8], [1.8, 7.6], [3.6, 5.4]].map(([x, h]) => ({ bone: 'head', mat: 'shard', part: 'crown', shape: 'cap', a: [x, 11.2, -0.3], b: [x * 1.05, 11.2 + h, -0.3], ra: 0.9, rb: 0.1 })));
    stamps.push({ bone: 'head', at: [0, 7.9, 6.4], n: [0, 0, 1], facing: 0.3, on: 'shard', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  } else if (t < 5) {                                           // bascinet: dome, gold brow band, cheek guards, crest fin
    P.push({ bone: 'head', mat: 'metal', part: 'helm', shape: 'ell', c: [0, 6.7, -0.3], r: [6.9, 6.5, 6.4], clip: [[0, -0.22, 0.98, 2.4], [0, -1, 0, -1.0]] },
      { bone: 'head', mat: 'gold', part: 'trim', shape: 'disc', c: [0, 7.9, 0], r: [7.0, 0.6, 6.45] },
      ...both((s, k) => [{ bone: 'head', mat: 'metal', part: 'cheek', shape: 'ell', c: [4.9 * k, 3.4, 2.9], r: [1.7, 2.8, 1.9], rot: [0, 0, -0.12 * k] }]),
      { bone: 'head', mat: 'gold', part: 'crest', shape: 'ell', c: [0, 12.4, -0.6], r: [0.65, 1.5, 5.2] });
    if (t === 3) P.push({ bone: 'head', mat: 'plume', part: 'plume', shape: 'cap', a: [0, 12.8, -2.6], b: [0, 13.6, -6.2], ra: 1.4, rb: 1.1 },
      { bone: 'head', mat: 'plume', part: 'plume', shape: 'cap', a: [0, 13.6, -6.2], b: [0, 10.8, -8.4], ra: 1.1, rb: 0.55 });
    else P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 8.7, 6.1], r: [1.0, 1.0, 0.55] },
      { bone: 'head', mat: 'gold', part: 'trim', shape: 'ell', c: [0, 8.7, 5.9], r: [1.45, 1.4, 0.45] });
  } else {                                                      // radiant: closed helm, visor plate with a glowing T slit, crown
    P.push({ bone: 'head', mat: 'metal', part: 'helm', shape: 'ell', c: [0, 6.7, -0.2], r: [7.05, 6.7, 6.6], clip: [0, -1, 0, -0.2] },
      { bone: 'head', mat: 'metal', part: 'visor', shape: 'ell', c: [0, 4.6, 4.2], r: [5.6, 3.6, 2.8], clip: [0, -1, 0, -1.0] },
      { bone: 'head', mat: 'slot', part: 'visor', shape: 'ell', c: [0, 5.7, 4.3], r: [3.9, 0.85, 2.75] },
      ...[1, -1].map(k => ({ bone: 'head', mat: 'visor', part: 'visor', shape: 'ell', c: [1.7 * k, 5.7, 6.75], r: [0.8, 0.55, 0.55] })),
      { bone: 'head', mat: 'gold', part: 'crown', shape: 'disc', c: [0, 10.6, -0.2], r: [6.3, 0.7, 5.9] },
      ...[-50, -25, 0, 25, 50].map(d => { const a = d * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a);
        return { bone: 'head', mat: 'gold', part: 'crown', shape: 'cap', a: [5.6 * sn, 10.8, 5.3 * cs - 0.2], b: [7.0 * sn, 14.0, 6.6 * cs - 0.6], ra: 0.9, rb: 0.25 }; }));
  }
  if (t === 4 || t === 5) {                                     // wings: four feathers fanned out of a root at each temple (7cf2f23; fine: the 1 px tips stay)
    const g = t === 5 ? 1.35 : 1.1;
    P.push(...both((s, k) => [[3.6, 0.35], [3.2, 0.75], [2.7, 1.1], [2.2, 1.45]].map(([L, a], i) => {
      const rt = [-0.6, 0, -a * k], half = rotv([0, L * g * 0.95, 0], rt);
      return { bone: 'head', mat: 'feather', part: `wing${s}${i}`, shape: 'ell', c: [6.1 * k + half[0], 8.0 + half[1], -1.4 + half[2]], r: [0.5, L * g, 1.15], rot: rt };
    })));
  }
  return piece('knighthelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: t === 1 ? ['hair'] : ['hair', 'bangs', 'hairSide'] });
}

// ---- chest -----------------------------------------------------------------------------------------------------------
function warden(t) {
  const M = t === 6;                                            // Mythic Shardheart Plate: the suit keeps its silver-blue steel; frost is only trim, shards and glow
  const mats = { metal: metal(M ? METAL[3] : METAL[t - 1]), mail: MAIL, leather: LEATHER, strap: STRAP, gold: M ? FROSTG : GOLD, cloth: M ? CLOTH[3] : CLOTH[t - 1], quilt: QUILT, stitch: STITCH, gem: M ? FROSTG : t === 4 ? { ramp: [SAPPHIRE.ramp[0], SAPPHIRE.ramp[1], SAPPHIRE.ramp[2], CLOTH[3][3]], lift: 1 } : SAPPHIRE, core: CORE, glow: flatOf(GLOW.frost) };
  const P = [], stamps = [];
  if (t === 1) {                                                // quilted gambeson with padded shoulder rolls
    P.push({ bone: 'chest', mat: 'quilt', part: 'coat', shape: 'ell', c: [0, 0.8, 0.1], r: [4.55, 4.95, 3.5], clip: [0, -1, 0, 3.9] },
      { bone: 'spine', mat: 'quilt', part: 'coat', shape: 'ell', c: [0, 1.2, 0], r: [5.0, 2.8, 3.9], clip: [0, -1, 0, 1.7] },
      ...[-2.6, -0.9, 0.9, 2.6].map(x => ({ bone: 'chest', mat: 'stitch', part: 'coat', shape: 'ell', c: [x, 0.6, 0.1], r: [0.32, 4.6, 3.56], clip: [0, -1, 0, 3.9] })),
      { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.1, 0], r: [4.65, 0.62, 3.75], weight: 2 },
      { bone: 'spine', mat: 'metal', part: 'belt', shape: 'box', c: [0, 3.1, 3.7], h: [0.75, 0.65, 0.3], round: 0.2 },
      ...both(s => [
        { bone: 'upper' + s, mat: 'quilt', part: 'arm' + s, shape: 'ell', c: [0, 0.1, 0], r: [2.0, 1.5, 2.0] },
        { bone: 'upper' + s, mat: 'quilt', part: 'arm' + s, shape: 'cap', a: [0, -0.3, 0], b: [0, -2.2, 0], ra: 1.55, rb: 1.5 },
        { bone: 'fore' + s, mat: 'quilt', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.9, 0], ra: 1.5, rb: 1.45 },
        { bone: 'hand' + s, mat: 'leather', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.6, 1.55, 1.6] },
      ]));
  } else {                                                      // plate: breastplate, gorget, faulds over mail, pauldrons, arms
    P.push({ bone: 'chest', mat: 'metal', part: 'plate', shape: 'ell', c: [0, 0.9, 0.35], r: [4.6, 4.9, 3.55], clip: [0, -1, 0, 3.6] },
      { bone: 'chest', mat: 'metal', part: 'gorget', shape: 'ell', c: [0, 4.3, 0.1], r: [3.7, 1.3, 3.1] },
      { bone: 'spine', mat: 'metal', part: 'fauld', shape: 'ell', c: [0, 1.4, 0], r: [5.05, 2.7, 3.95], clip: [0, -1, 0, 1.5] },
      { bone: 'spine', mat: 'mail', part: 'mail', shape: 'ell', c: [0, 0.0, 0], r: [4.9, 1.9, 3.8], clip: [0, -1, 0, 1.9] },
      { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.1, 0], r: [4.65, 0.62, 3.75], weight: 2 },
      { bone: 'spine', mat: t >= 3 ? 'gold' : 'metal', part: 'belt', shape: 'box', c: [0, 3.1, 3.7], h: [0.8, 0.7, 0.3], round: 0.2 },
      ...both((s, k) => [
        { bone: 'upper' + s, mat: 'metal', part: 'pauldron' + s, shape: 'ell', c: [0, 0.25, 0], r: t === 5 ? [2.8, 2.3, 2.8] : [2.5, 2.1, 2.5], clip: [0, -1, 0, 1.0] },
        { bone: 'upper' + s, mat: 'mail', part: 'arm' + s, shape: 'cap', a: [0, -0.3, 0], b: [0, -2.2, 0], ra: 1.55, rb: 1.45 },
        { bone: 'fore' + s, mat: 'metal', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.9, 0], ra: 1.55, rb: 1.5 },
        { bone: 'hand' + s, mat: t === 2 ? 'mail' : 'metal', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.65, 1.6, 1.65] },
      ]));
  }
  if (t === 2) {                                                // leather strap from the right shoulder to the left hip, iron buckle
    // 1 px conn4 strokes laid just over the breastplate, front and back (a 4-connected staircase in one tone: no stray pixels)
    const STR = [[-3.3, 3.9], [-1.6, 2.4], [0, 0.7], [1.5, -0.9], [2.6, -2.4]], zOn = (x, y, k) => k * (0.35 + 3.55 * Math.sqrt(Math.max(0, 1 - (x / 4.6) ** 2 - ((y - 0.9) / 4.9) ** 2)) + (k > 0 ? 0.9 : 0.2));   // the back one sits low, under a cape
    for (const k of [1, -1]) for (let i = 0; i + 1 < STR.length; i++) {
      const [x0, y0] = STR[i], [x1, y1] = STR[i + 1];
      P.push({ bone: 'chest', mat: 'strap', part: 'strap', shape: 'line', conn4: true, a: [x0, y0, Math.round(zOn(x0, y0, k) * 100) / 100], b: [x1, y1, Math.round(zOn(x1, y1, k) * 100) / 100] });
    }
    P.push({ bone: 'chest', mat: 'metal', part: 'strap', shape: 'ell', c: [-1.26, 2.4, 3.65], r: [0.75, 0.75, 0.45], weight: 3 });
  }
  if (t >= 3) {                                                 // ridge, gold trim, a second pauldron lame, tabard + emblem
    P.push({ bone: 'chest', mat: 'metal', part: 'plate', shape: 'ell', c: [0, 0.8, 3.45], r: [0.55, 3.9, 0.55] },
      { bone: 'chest', mat: 'gold', part: 'trim', shape: 'disc', c: [0, -3.2, 0.3], r: [4.75, 0.5, 3.65] },
      { bone: 'chest', mat: 'gold', part: 'trim', shape: 'disc', c: [0, 3.4, 0.2], r: [3.95, 0.45, 3.3] },
      { bone: 'spine', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, 0.1, 3.95], h: [1.95, 2.4, 0.32], round: 0.3 },
      { bone: 'spine', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, 0.1, -3.95], h: [1.95, 2.4, 0.32], round: 0.3 },
      ...both(s => [
        { bone: 'upper' + s, mat: 'metal', part: 'lame' + s, shape: 'ell', c: [0, -1.1, 0], r: [2.4, 1.1, 2.4], clip: [0, -1, 0, 1.9] },
        { bone: 'upper' + s, mat: M ? 'metal' : 'gold', part: 'trim', shape: 'disc', c: [0, -0.85, 0], r: [2.65, 0.42, 2.65] },
        { bone: 'fore' + s, mat: 'metal', part: 'arm' + s, shape: 'ell', c: [0, 0.2, 0.3], r: [1.6, 1.3, 1.6] },
        { bone: 'fore' + s, mat: M ? 'metal' : 'gold', part: 'arm' + s, shape: 'ell', c: [0, -1.75, 0], r: [1.7, 0.4, 1.7] },
      ]));
    if (t === 3) stamps.push({ bone: 'spine', at: [0, 0.6, 4.25], n: [0, 0, 1], facing: 0.3, on: 'cloth', px: CROSS });
  }
  if (t >= 4) {                                                 // spikes, chest gem in a gold setting, filigree, tabard trim
    P.push({ bone: 'chest', mat: t === 5 ? 'core' : 'gem', part: 'plate', shape: 'ell', c: [0, 1.5, 3.85], r: M ? [1.25, 1.5, 0.8] : [1.0, 1.05, 0.6] },
      { bone: 'chest', mat: 'gold', part: 'trim', shape: 'ell', c: [0, 1.5, 3.62], r: [1.5, 1.55, 0.5] },
      ...both((s, k) => [
        { bone: 'chest', mat: 'gold', part: 'trim', shape: 'ell', c: [2.1 * k, 2.3, 3.15], r: [0.34, 1.7, 0.45], rot: [0, 0, 0.75 * k] },
        { bone: 'spine', mat: 'gold', part: 'tabard', shape: 'box', c: [1.95 * k, 0.1, 3.97], h: [0.32, 2.4, 0.36], round: 0.2 },
        { bone: 'upper' + s, mat: 'gold', part: 'pauldron' + s, shape: 'cap', a: [0, 1.6, 0], b: [1.3 * k, 4.0, -0.5], ra: 0.75, rb: 0.15 },
        { bone: 'upper' + s, mat: 'gold', part: 'pauldron' + s, shape: 'cap', a: [0, 1.3, -1.0], b: [0.9 * k, 3.2, -2.0], ra: 0.6, rb: 0.12 },
      ]));
  }
  if (t >= 5) {                                                // fanned pauldron spikes, sun rays, glowing runes (Mythic: frost shards, crystal heart)
    P.push(...both((s, k) => [
      { bone: 'upper' + s, mat: 'gold', part: 'pauldron' + s, shape: 'cap', a: [0.8 * k, 1.2, -0.4], b: [2.6 * k, 3.4, -0.9], ra: 0.7, rb: 0.15 },
      { bone: 'upper' + s, mat: 'gold', part: 'pauldron' + s, shape: 'cap', a: [1.4 * k, 0.6, -0.6], b: [3.2 * k, 1.8, -1.2], ra: 0.6, rb: 0.12 },
      { bone: 'spine', mat: M ? 'gem' : 'core', part: 'fauld', shape: 'ell', c: [2.4 * k, 1.0, 3.75], r: [0.3, 0.9, 0.4] },
    ]),
    );
    if (M) {                                                    // crystal heart: shards radiate from the chest gem
      for (const [dx, dy, L] of [[0, 1, 3.4], [-0.8, 0.6, 2.8], [0.8, 0.6, 2.8]]) { const n = Math.hypot(dx, dy);
        P.push({ bone: 'chest', mat: 'gem', part: 'plate', shape: 'cap', a: [dx / n * 1.0, 1.5 + dy / n * 1.0, 3.9], b: [dx / n * L, 1.5 + dy / n * L, 4.5], ra: 0.7, rb: 0.12 }); }
      stamps.push({ bone: 'chest', at: [0, 1.5, 4.5], n: [0, 0, 1], facing: 0.3, on: 'gem', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
    } else stamps.push({ bone: 'chest', at: [0, 1.5, 4.3], n: [0, 0, 1], facing: 0.3, on: 'core', px: SUN.concat([[-3, 0, '#c08a20'], [3, 0, '#c08a20'], [-2, -2, '#e8b830'], [2, -2, '#e8b830'], [-2, 2, '#e8b830'], [2, 2, '#e8b830']]) });
  }
  return piece('warden', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

// ---- boots -----------------------------------------------------------------------------------------------------------
function knightgreaves(t) {
  const M = t === 6;                                            // Mythic: frost shard spurs and fins
  const mats = { metal: metal(M ? METAL[3] : METAL[t - 1]), leather: LEATHER, gold: M ? FROSTG : GOLD, gem: M ? FROSTG : SAPPHIRE, core: M ? flatOf(GLOW.frost) : CORE, feather: M ? FROSTG : GOLD };
  const P = both((s, k) => {
    const L = t === 1 ? [
      { bone: 'foot' + s, mat: 'leather', part: 'boot' + s, shape: 'ell', c: [0, -1.0, 0.8], r: [2.15, 1.95, 2.85], clip: [0, -1, 0, 2.6] },
      { bone: 'shin' + s, mat: 'leather', part: 'boot' + s, shape: 'cap', a: [0, -0.6, 0], b: [0, -2.4, 0], ra: 1.75, rb: 1.7 },
      { bone: 'shin' + s, mat: 'leather', part: 'cuff' + s, shape: 'ell', c: [0, -0.4, 0], r: [1.95, 0.55, 1.95] },
    ] : [
      { bone: 'foot' + s, mat: 'metal', part: 'boot' + s, shape: 'ell', c: [0, -1.0, 0.85], r: [2.2, 2.0, 2.9], clip: [0, -1, 0, 2.6] },
      { bone: 'shin' + s, mat: 'metal', part: 'boot' + s, shape: 'cap', a: [0, 0.1, 0.1], b: [0, -2.4, 0.15], ra: 1.8, rb: 1.75 },
      { bone: 'shin' + s, mat: 'metal', part: 'knee' + s, shape: 'ell', c: [0, 0.3, 0.6], r: [1.35, 1.25, 1.25] },
    ];
    if (t >= 3) L.push({ bone: 'shin' + s, mat: 'gold', part: 'knee' + s, shape: 'disc', c: [0, 0.0, 0.6], r: [1.45, 0.35, 1.35] },
      { bone: 'foot' + s, mat: 'gold', part: 'boot' + s, shape: 'ell', c: [0, -1.6, 3.0], r: [1.2, 0.9, 0.8] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'gold', part: 'knee' + s, shape: 'cap', a: [0, 0.5, 1.2], b: [0, 2.8, 3.0], ra: 0.75, rb: 0.12 },
      { bone: 'shin' + s, mat: 'gold', part: 'knee' + s, shape: 'disc', c: [0, -2.0, 0.1], r: [1.95, 0.4, 1.9] },
      { bone: 'foot' + s, mat: 'gem', part: 'boot' + s, shape: 'ell', c: [0, -0.4, 2.6], r: [0.55, 0.55, 0.45] });
    if (t >= 5) L.push({ bone: 'foot' + s, mat: 'feather', part: 'fin' + s, shape: 'ell', c: [1.9 * k, -0.2, -1.0], r: M ? [0.4, 2.3, 1.2] : [0.4, 1.8, 1.0], rot: [-0.9, 0, 0.5 * k] },
      { bone: 'shin' + s, mat: 'core', part: 'boot' + s, shape: 'ell', c: [0, -1.2, 1.8], r: M ? [0.3, 0.7, 0.3] : [0.3, 1.0, 0.3] });
    if (M) L.push({ bone: 'foot' + s, mat: 'feather', part: 'fin' + s, shape: 'cap', a: [0, -0.6, -2.4], b: [0, 1.6, -5.0], ra: 0.9, rb: 0.12 });   // heel shard spur
    return L;
  });
  return piece('knightgreaves', 'boots', t, { bias: 0.3, mats, prims: P });
}

// ---- off hand: the heater shield's face looks out to the left-front, raised square-on to block when hit -----------------------
const heaterClip = (top, cut) => [[0, 1, 0, top], [0.75, -0.66, 0, cut], [-0.75, -0.66, 0, cut]];
function heater(t) {
  const mats = { face: [WOOD, metal(METAL[1]), CLOTH[2], CLOTH[3], metal(METAL[4]), metal(METAL[5])][t - 1], rim: t === 1 ? METAL[0] : t === 2 ? metal(MAIL) : GOLD, gem: t === 6 ? HOLYG : SAPPHIRE, core: CORE, gold: GOLD, glow: flatOf(GLOW.holy) };
  const P = [], stamps = [];
  if (t === 1) P.push({ bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.3, 0.9], r: [2.8, 2.8, 0.5] },
    { bone: 'offhand', mat: 'rim', part: 'rim', shape: 'ell', c: [0, 0.3, 0.72], r: [3.15, 3.15, 0.42] },
    { bone: 'offhand', mat: 'rim', part: 'shield', shape: 'ell', c: [0, 0.3, 1.35], r: [0.95, 0.95, 0.55] });
  else if (t <= 3) { P.push({ bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.6, 0.9], r: [3.3, 4.4, 0.55], clip: heaterClip(3.2, 2.4) },
      { bone: 'offhand', mat: 'rim', part: 'rim', shape: 'ell', c: [0, 0.6, 0.72], r: [3.7, 4.9, 0.45], clip: heaterClip(3.55, 2.85) });
    if (t === 3) P.push({ bone: 'offhand', mat: 'gold', part: 'rim', shape: 'ell', c: [0, 0.6, 1.15], r: [0.7, 3.7, 0.4] }, { bone: 'offhand', mat: 'gold', part: 'rim', shape: 'ell', c: [0, 1.2, 1.5], r: [1.9, 1.9, 0.75] });   // T3: a gold boss on the face
  }
  else if (t === 4) P.push({ bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.2, 0.95], r: [3.4, 5.3, 0.6], clip: [[0, 1, 0, 3.8], [0.8, -0.6, 0, 2.6], [-0.8, -0.6, 0, 2.6]] },
    { bone: 'offhand', mat: 'rim', part: 'rim', shape: 'ell', c: [0, 0.2, 0.75], r: [3.8, 5.8, 0.5], clip: [[0, 1, 0, 4.15], [0.8, -0.6, 0, 3.0], [-0.8, -0.6, 0, 3.0]] },
    { bone: 'offhand', mat: 'gem', part: 'shield', shape: 'ell', c: [0, 1.0, 1.55], r: [1.0, 1.0, 0.55] },
    { bone: 'offhand', mat: 'gold', part: 'shield', shape: 'ell', c: [0, 1.0, 1.35], r: [1.45, 1.45, 0.45] },
    ...[1, -1].map(k => ({ bone: 'offhand', mat: 'gold', part: 'rim', shape: 'cap', a: [3.0 * k, 3.6, 0.9], b: [3.9 * k, 4.8, 0.9], ra: 0.55, rb: 0.12 })));
  else if (t === 6) {                                           // Mythic: the Heater again (broad, pointed), a gold crest with two raised wings and a holy gem
    P.push({ bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.2, 0.95], r: [3.5, 5.4, 0.6], clip: [[0, 1, 0, 3.9], [0.8, -0.6, 0, 2.7], [-0.8, -0.6, 0, 2.7]] },
      { bone: 'offhand', mat: 'rim', part: 'rim', shape: 'ell', c: [0, 0.2, 0.75], r: [3.9, 5.9, 0.5], clip: [[0, 1, 0, 4.25], [0.8, -0.6, 0, 3.1], [-0.8, -0.6, 0, 3.1]] },
      { bone: 'offhand', mat: 'gem', part: 'shield', shape: 'ell', c: [0, 0.8, 1.55], r: [1.05, 1.3, 0.6] },
      { bone: 'offhand', mat: 'gold', part: 'shield', shape: 'ell', c: [0, 0.8, 1.35], r: [1.5, 1.75, 0.45] },
      ...[1, -1].flatMap(k => [{ bone: 'offhand', mat: 'gold', part: 'rim', shape: 'cap', a: [3.4 * k, 3.4, 0.9], b: [5.2 * k, 6.2, 0.9], ra: 0.75, rb: 0.12 },
        { bone: 'offhand', mat: 'gold', part: 'rim', shape: 'cap', a: [3.7 * k, 2.4, 0.9], b: [5.9 * k, 4.2, 0.9], ra: 0.65, rb: 0.12 }]));
    stamps.push({ bone: 'offhand', at: [0, 0.8, 2.1], n: [0, 0, 1], facing: 0.2, on: 'gem', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  } else P.push({ bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.4, 0.95], r: [3.5, 3.5, 0.6] },
    { bone: 'offhand', mat: 'core', part: 'shield', shape: 'ell', c: [0, 0.4, 1.5], r: [1.3, 1.3, 0.55] },
    ...[0, 45, 90, 135, 180, 225, 270, 315].map(d => { const a = d * Math.PI / 180;
      return { bone: 'offhand', mat: 'gold', part: 'rim', shape: 'cap', a: [3.2 * Math.cos(a), 0.4 + 3.2 * Math.sin(a), 0.9], b: [4.6 * Math.cos(a), 0.4 + 4.6 * Math.sin(a), 0.85], ra: 0.7, rb: 0.15 }; }));
  if (t === 3) stamps.push({ bone: 'offhand', at: [0, 1.2, 1.45], n: [0, 0, 1], facing: 0.2, on: 'face', px: CROSS });
  return piece('heater', 'offhand', t, { mats, prims: P, stamps }, {
    pose: a => ({ offhand: a === 'hit' ? { aim: [0, 1, 0.2], roll: [0.25, 0, 0.97] } : a === 'dash' ? { aim: [0.1, 1, -0.2], roll: [0.9, 0, -0.4] } : { aim: [0.15, 1, 0.1], roll: [0.75, 0, 0.66] } }),
  });
}

// ---- weapon: Rusty Blade, Dawnblade, Sunforged Blade, Aurora Edge, Dawn Eternal ------------------------------------------
function sword(t) {
  const len = [9.0, 11.5, 12.5, 13.0, 14.5, 15.0][t - 1], M = t === 6;
  const mats = { blade: t === 1 ? RUST : metal(METAL[t - 1]), guard: t === 1 ? METAL[0] : t === 2 ? metal(METAL[1]) : GOLD,
    grip: LEATHER, gem: t === 3 ? RUBY : M ? HOLYG : SAPPHIRE, edge: { ramp: ['#4ab8e0', '#7fe8ff', '#bff6ff', '#ffffff'], lift: 2 }, fuller: MAIL, core: CORE, feather: FEATHER, glow: flatOf(GLOW.holy) };
  const P = [
    { bone: 'weapon', mat: 'grip', part: 'hilt', shape: 'cap', a: [0, -1.3, 0], b: [0, 1.3, 0], ra: 0.62, rb: 0.62 },
    { bone: 'weapon', mat: 'blade', part: 'blade', shape: 'cap', a: [0, 2.1, 0], b: [0, len, 0], ra: [0.85, 0.95, 1.05, 1.3, 1.6, 1.5][t - 1], rb: [0.45, 0.4, 0.45, 0.5, 0.55, 0.5][t - 1] },
  ];
  if (t <= 2) P.push({ bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'cap', a: [-2.1 - 0.3 * t, 1.7, 0], b: [2.1 + 0.3 * t, 1.7, 0], ra: 0.55, rb: 0.55 },
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'ell', c: [0, -1.8, 0], r: [0.8, 0.8, 0.8] });
  else P.push(...[1, -1].flatMap(k => [                       // curved quillons + a gem pommel in a gold cap
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'cap', a: [0, 1.75, 0], b: [2.2 * k, 2.0, 0], ra: 0.62, rb: 0.5 },
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'cap', a: [2.2 * k, 2.0, 0], b: [2.9 * k, 3.1, 0], ra: 0.5, rb: 0.28 },
  ]), { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'ell', c: [0, -1.85, 0], r: [0.95, 0.75, 0.95] },
  { bone: 'weapon', mat: t === 5 ? 'core' : 'gem', part: 'hilt', shape: 'ell', c: [0, -2.3, 0], r: [0.75, 0.75, 0.75] });
  if (t === 3) P.push({ bone: 'weapon', mat: 'fuller', part: 'blade', shape: 'ell', c: [0, 6.5, 0], r: [0.3, 3.8, 1.06] });
  if (t === 4) P.push({ bone: 'weapon', mat: 'edge', part: 'blade', shape: 'cap', a: [0.6, 2.6, 0], b: [0.3, len - 0.4, 0], ra: 0.55, rb: 0.2 },
    { bone: 'weapon', mat: 'gem', part: 'hilt', shape: 'ell', c: [0, 1.9, 0], r: [0.7, 0.7, 0.7] },
    ...[1, -1].map(k => ({ bone: 'weapon', mat: 'feather', part: 'hilt', shape: 'ell', c: [2.4 * k, 2.4, 0], r: [0.5, 1.6, 0.8], rot: [0, 0, -0.9 * k] })));
  if (t === 5) P.push({ bone: 'weapon', mat: 'core', part: 'blade', shape: 'ell', c: [0, 8.0, 0], r: [0.38, 5.2, 1.62] },
    { bone: 'weapon', mat: 'core', part: 'hilt', shape: 'ell', c: [0, 1.95, 0], r: [0.9, 0.9, 0.9] },
    ...[-30, 0, 30, 150, 180, 210].map(d => { const a = d * Math.PI / 180;
      return { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'cap', a: [0, 1.9, 0], b: [3.0 * Math.cos(a), 1.9 + 1.8 * Math.sin(a), 0], ra: 0.55, rb: 0.15 }; }));
  if (M) P.push(...ring('weapon', 'guard', 'halo', [0, 2.0, -0.7], 3.7, 10, 0.55),             // Morrowbane: a gold sun halo behind the guard
    { bone: 'weapon', mat: 'glow', part: 'blade', shape: 'ell', c: [0, 7.5, 0], r: [0.3, 1.5, 1.25] });
  return piece('sword', 'weapon', t, { mats, prims: P }, {
    class: 'sword', sockets: { tip: { bone: 'weapon', at: [0, len, 0] } },
    pose: notAttack(a => ({ weapon: { aim: a === 'cast' ? [-0.3, -0.6, 0.75] : a === 'hit' ? [-0.5, -0.4, 0.75] : a === 'dash' ? [-0.3, -0.2, -0.93] : [-0.7, -0.4, 0.6] } })),
  });
}

// ---- back: the cape hangs on the rig's spring chain (models/chibi.js: bones cape, cape1..3, SEG px each, squashed flat):
// one tapered capsule per segment it reaches, so its length is fixed and only its swing and billow change. Collar, clasps,
// fur, hem trim and emblem by tier
const SEG = require('./chibi.js').CAPE_SEG, CHAIN = ['cape', 'cape1', 'cape2', 'cape3'];
const onChain = s => { const k = Math.min(CHAIN.length - 1, Math.floor(s / SEG)); return [CHAIN[k], r3(s - SEG * k)]; };   // arc length -> [bone, local -y]
function cape(t) {
  const M = t === 6, len = [5.6, 10.2, 10.2, 10.4, 11.4, 10.8][t - 1], ra = 3.0, rb = [3.8, 4.6, 4.6, 4.7, 5.0, 5.0][t - 1], wAt = s => ra + (rb - ra) * s / len;
  const mats = { cloth: CLOTH[t - 1], gold: M ? FROSTG : GOLD, fur: t === 5 ? GOLD : FUR, gem: t === 3 ? RUBY : M ? FROSTG : SAPPHIRE, glow: flatOf(GLOW.frost) };
  const P = [{ bone: 'chest', mat: 'cloth', part: 'collar', shape: 'ell', c: [0, 4.1, -0.4], r: [4.0, 1.35, 3.4] }];
  for (let k = 0; k * SEG < len; k++) {
    const s0 = k * SEG, s1 = Math.min(len, s0 + SEG), clip = [];
    if (!k) clip.push([0, 1, 0, 0]);                              // no rounding above the collar
    if (s1 >= len) clip.push([0, -1, 0, r3(s1 - s0)]);                // a straight hem
    P.push(Object.assign({ bone: CHAIN[k], mat: 'cloth', part: 'cape', shape: 'cap', a: [0, 0, -0.5], b: [0, -r3(s1 - s0), -0.5], ra: r3(wAt(s0)), rb: r3(wAt(s1)) }, clip.length ? { clip } : {}));
  }
  const stamps = [];
  if (t >= 3) P.push(...[1, -1].map(k => ({ bone: 'chest', mat: 'gem', part: 'collar', shape: 'ell', c: [2.4 * k, 4.4, 2.9], r: [0.75, 0.75, 0.5] })));
  if (t >= 4) {
    const [hb, hy] = onChain(len - 0.001);
    P.push({ bone: 'chest', mat: 'fur', part: 'fur', shape: 'ell', c: [0, 4.2, -0.5], r: [4.3, 1.6, 3.7] });
    if (!M) P.push({ bone: hb, mat: 'gold', part: 'cape', shape: 'cap', a: [0, -hy + 1.0, -0.6], b: [0, -hy, -0.6], ra: r3(wAt(len) - 0.2), rb: r3(wAt(len) + 0.1), clip: [[0, -1, 0, hy], [0, 1, 0, r3(1.0 - hy)]] });
  }
  if (M) {                                                      // Shardheart: a crystal mantle on the shoulders, shard teeth along the hem, a glow run on the back
    const [hb2, hy2] = onChain(len - 0.001);
    P.push(...[1, -1].flatMap(k => [{ bone: 'chest', mat: 'gem', part: 'collar', shape: 'cap', a: [3.9 * k, 4.6, -0.6], b: [5.0 * k, 8.0, -0.9], ra: 0.8, rb: 0.12 }]),
      ...[-2.4, 2.4].map(x => ({ bone: hb2, mat: 'gem', part: 'cape', shape: 'cap', a: [x, -hy2 + 0.2, -0.7], b: [x, -hy2 - 2.4, -0.7], ra: 0.8, rb: 0.1 })));
    const [gb, gy] = onChain(5.2);
    stamps.push({ bone: gb, at: [0, -gy, -1.9], n: [0, 0, -1], facing: 0.2, on: 'cloth', px: [[0, 0, 'glow'], [0, 1, 'glow']] });
  }
  if (t === 5) { const [eb, ey] = onChain(5.2); stamps.push({ bone: eb, at: [0, -ey, -1.9], n: [0, 0, -1], facing: 0.2, on: 'cloth', px: SUN }); }
  const [hb, hy] = onChain(len - 0.001);
  return piece('cape', 'back', t, { mats, prims: P, stamps }, { sockets: { capeTop: { bone: 'cape', at: [0, 0, 0] }, capeHem: { bone: hb, at: [0, -hy, 0] } } });
}

const pieces = {};
for (const t of TIERS) for (const fn of [knighthelm, warden, knightgreaves, sword, heater, cape]) { const p = fn(t); pieces[p.id] = p; }
// the other lines of this rig: models/chibi-<line>.js each export { pieces }
for (const f of require('fs').readdirSync(__dirname).sort()) if (/^chibi-[a-z]+\.js$/.test(f) && !['chibi-gear.js', 'chibi-palette.js', 'chibi-wpal.js'].includes(f)) Object.assign(pieces, require('./' + f).pieces);   // weapon, shield and companion lines (suits: chibi-suit-*.js, loaded by their own lane)
// the other 11 suits: models/chibi-suit-<suit>.js each export { pieces } (chibi-suit-lib.js: the suit table and shared shells)
for (const f of require('fs').readdirSync(__dirname).filter(f => /^chibi-suit-.+\.js$/.test(f)).sort()) { const m = require('./' + f); if (m.pieces) Object.assign(pieces, m.pieces); }
const set = t => ['knighthelm', 'warden', 'knightgreaves', 'sword', 'heater', 'cape'].map(f => `${f}.t${t}`);
const loadouts = { bare: [], squire: set(1), footman: set(2), knight: set(3), paladin: set(4), radiant: set(5) };
// one board loadout per suit tier (head, chest, boots): crusader1 .. crusader6, for every suit piece that exists
for (const [suit, fams] of Object.entries(require('./chibi-suit-lib.js').SUITS)) for (const t of [1, 2, 3, 4, 5, 6]) { const ids = fams.map(f => `${f}.t${t}`).filter(id => pieces[id]); if (ids.length) loadouts[suit + t] = ids; }
module.exports = { pieces, loadouts };
