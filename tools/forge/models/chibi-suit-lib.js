'use strict';
// CHIBI SUIT LIB — shared bits of the 11 suits in models/chibi-suit-<suit>.js (the Warden suit lives in chibi-gear.js): the suit
// table (piece ids, the contract with the data lane), ramp helpers and the shells every suit starts from (torso, arms, legs,
// boots, head dome). Exports no `pieces`, so the file loaders skip it. Units are px on the chibi rig (see models/chibi.js).
const FORGE = require('../forge.js');
const { both, metal, piece } = require('./chibi-palette.js');

// suit id -> [head, chest, boots] piece families (tiers: <family>.t1 .. .t6)
const SUITS = {
  crusader: ['crusaderhelm', 'crusader', 'crusaderboots'], juggernaut: ['juggernauthelm', 'juggernaut', 'juggernautboots'],
  dreamweave: ['dreamweavehelm', 'dreamweave', 'clothsandals'], frostweave: ['arcanecowl', 'frostweave', 'frostweaveboots'],
  stormweave: ['stormweavehelm', 'stormweave', 'stormweaveboots'], stalker: ['stalkerhelm', 'stalker', 'stalkershoes'],
  thornwarden: ['wardenhood', 'thornwarden', 'thornwardenboots'], duelist: ['duelisthelm', 'duelist', 'duelistboots'],
  shade: ['shadehelm', 'shade', 'shadeboots'], nightshade: ['nightshadehelm', 'nightshade', 'nightshadeboots'], mirage: ['miragehelm', 'mirage', 'mirageboots'],
};

// CIE L* of #rrggbb (the palette lint's measure): a ramp must rise strictly and start >= 8 above the outline #0c0714
const lstar = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
const lighten = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - f) + 255 * f).toString(16).padStart(2, '0')).join('');
const OUT_L = lstar('#0c0714');
const okRamp = r => r.every((h, i) => !i || lstar(h) > lstar(r[i - 1])) && lstar(r[0]) - OUT_L >= 8.5;
const fix = r => { for (let i = 0; i < 40 && !okRamp(r); i++) r = r.map(h => lighten(h, 0.04)); return r; };
const ramp = hex => fix(FORGE.ramp(hex));                              // [shadow, low, mid, high] (hex, hue-shifted, lint-safe)
const mk = (hex, glint) => metal(fix([...FORGE.ramp(hex), glint || '#f4f4ff']));   // a metal: the ramp of one mid colour + a glint
const flat = hex => ({ ramp: [hex, hex, hex, hex], flat: 2 });         // an emissive: one tone, unshaded
const gem = hex => ({ ramp: fix([...FORGE.ramp(hex), '#ffffff']), lift: 1, spec: 0.9 });
const cloth = hex => ramp(hex);

// ---- shells -----------------------------------------------------------------------------------------------------------------
// the trunk: chest + spine ellipsoids (the Warden plate's volume); o scales: {k: width, kz: depth, cy, bot}
const torso = (mat, part, o = {}) => { const k = o.k || 1, kz = o.kz || k, ky = o.ky || 1;
  return [{ bone: 'chest', mat, part, shape: 'ell', c: [0, 0.9, 0.35], r: [4.6 * k, 4.9 * ky, 3.55 * kz], clip: [0, -1, 0, 3.6] },
    { bone: 'spine', mat, part, shape: 'ell', c: [0, 1.4, 0], r: [5.05 * k, 2.7, 3.95 * kz], clip: [0, -1, 0, 1.5] }]; };
// arms: m = { up, fore, hand } materials (hand optional: none), k = girth
const arms = (m, o = {}) => { const k = o.k || 1;
  return both(s => [
    { bone: 'upper' + s, mat: m.up, part: 'arm' + s, shape: 'cap', a: [0, -0.3, 0], b: [0, -2.2, 0], ra: 1.55 * k, rb: 1.45 * k },
    { bone: 'fore' + s, mat: m.fore || m.up, part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.9, 0], ra: 1.5 * k, rb: 1.45 * k },
    ...(m.hand ? [{ bone: 'hand' + s, mat: m.hand, part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.6 * k, 1.55 * k, 1.6 * k] }] : []),
  ]); };
// boots: a foot and a shin sleeve; o: { k: girth, top: cuff height (shin y of the top), len: toe length }
const boots = (mat, part, o = {}) => { const k = o.k || 1, L = o.len || 1;
  return both(s => [
    { bone: 'foot' + s, mat, part: part + s, shape: 'ell', c: [0, -1.0, 0.8 * L], r: [2.15 * k, 1.95, 2.85 * L], clip: [0, -1, 0, 2.6] },
    { bone: 'shin' + s, mat: o.shin || mat, part: part + s, shape: 'cap', a: [0, o.top == null ? 0.1 : o.top, 0.05], b: [0, -2.4, 0.1], ra: 1.78 * k, rb: 1.72 * k },
  ]); };
// the open-faced dome (the bascinet's volume), cheek guards optional
const dome = (mat, part, o = {}) => [{ bone: 'head', mat, part, shape: 'ell', c: [0, 6.7, -0.3], r: [6.9 * (o.k || 1), 6.5 * (o.ky || 1), 6.4 * (o.k || 1)], clip: [[0, -0.22, 0.98, 2.4], [0, -1, 0, -1.0]] }];
// a limb-hugging cap hung from a bone, tip fanned out: a spike / horn / feather from a to b
const spike = (bone, mat, part, a, b, ra, rb) => ({ bone, mat, part, shape: 'cap', a, b, ra, rb: rb == null ? 0.12 : rb });

module.exports = { SUITS, ramp, mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both };
