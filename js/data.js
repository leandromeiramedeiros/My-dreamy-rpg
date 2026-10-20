'use strict';
// ---------------------------------------------------------------------------
// Gear roster and skills.  Albion-style: what you WEAR decides your weapon /
// armour skills (Q E R from the weapon, F chest, C helmet, Shift boots), while
// the three CHARACTER skills (1 2 3) are chosen freely by the player.
// ---------------------------------------------------------------------------
const ITEMS = {
  weapon: [
    { id: 'dawnblade', name: 'Dawnblade', kind: 'sword', element: 'slash', icon: 'sword', color: '#ffcf6a', desc: 'Sword forged from the first light of morning. Close-range, cleaving combos.',
      basic: { name: 'Dawn Cut', dmg: 44, rate: 0.42 }, q: ['sunslash', 'heroic'], e: ['dashstrike', 'whirl'], r: ['judgement', 'dawnwave'] },
    { id: 'starfall', name: 'Starfall Staff', kind: 'staff', element: 'arcane', icon: 'staff', color: '#7fe6ff', desc: 'A staff that remembers the night sky. Ranged spells and huge area damage.',
      basic: { name: 'Arcane Bolt', dmg: 38, rate: 0.48 }, q: ['firebolt', 'frostshard'], e: ['barrage', 'gravity'], r: ['meteor', 'starstorm'] },
    { id: 'moonbow', name: 'Moonbow', kind: 'bow', element: 'pierce', icon: 'bow', color: '#c9d8ff', desc: 'Strung with moonlight. Fast shots, traps and evasive tumbles.',
      basic: { name: 'Moon Arrow', dmg: 33, rate: 0.36 }, q: ['multishot', 'piercing'], e: ['tumble', 'snare'], r: ['arrowrain', 'moonbeam'] },
  ],
  head: [
    { id: 'knighthelm', name: 'Knight Helm', icon: 'helm', color: '#cfd6ea', skill: 'warcry', stats: { def: 0.08 }, desc: '+8% defence.',
      pal: { H: '#cfd6ea', h: '#8e97b8', L: '#ffffff', R: '#e0475e' } },
    { id: 'arcanecowl', name: 'Arcane Cowl', icon: 'helm', color: '#9c7ae0', skill: 'frostnova', stats: { power: 0.1 }, desc: '+10% power.',
      pal: { H: '#5d3fa8', h: '#3d2878', L: '#9c7ae0' } },
    { id: 'wardenhood', name: 'Warden Hood', icon: 'helm', color: '#6aa77e', skill: 'mend', stats: { regen: 5 }, desc: '+5 HP/s regeneration.',
      pal: { H: '#3f7a58', h: '#2a5340', L: '#6aa77e' } },
  ],
  chest: [
    { id: 'knightplate', name: 'Knight Plate', icon: 'chest', color: '#a9b4d4', skill: 'bulwark', stats: { def: 0.2, hp: 220 }, res: { slash: 0.25, pierce: 0.25, lightning: -0.25 }, desc: '+20% defence, +220 HP.',
      pal: { A: '#a9b4d4', a: '#6d779e', l: '#e6ecfa', C: '#3b5bb5', c: '#263f86', P: '#4b4f6e' } },
    { id: 'dreamrobe', name: 'Dreamweave Robe', icon: 'chest', color: '#9c7ae0', skill: 'manasurge', stats: { power: 0.25, mp: 120, mpRegen: 5 }, res: { arcane: 0.25, slash: -0.25, pierce: -0.25 }, desc: '+25% power, +120 MP.',
      pal: { A: '#7a5cc4', a: '#4f3a8f', l: '#b8a0f0', C: '#2f2466', c: '#1f1846', P: '#5a3f9c' } },
    { id: 'stalkerjacket', name: 'Stalker Jacket', icon: 'chest', color: '#c08a5e', skill: 'shadowveil', stats: { crit: 0.18, haste: 0.15 }, res: { pierce: 0.25, fire: -0.25 }, desc: '+18% crit, +15% attack speed.',
      pal: { A: '#8c5d3f', a: '#5e3d2a', l: '#c08a5e', C: '#2f6b4f', c: '#1f4a37', P: '#3e3a4a' } },
  ],
  boots: [
    { id: 'knightgreaves', name: 'Knight Greaves', icon: 'boots', color: '#b9c2dc', skill: 'charge', stats: { def: 0.05 }, desc: '+5% defence.', pal: { O: '#b9c2dc' } },
    { id: 'clothsandals', name: 'Cloud Sandals', icon: 'boots', color: '#e7c9a0', skill: 'blink', stats: { mpRegen: 3 }, desc: '+3 MP/s.', pal: { O: '#e7c9a0' } },
    { id: 'stalkershoes', name: 'Stalker Shoes', icon: 'boots', color: '#7a5038', skill: 'sprint', stats: { speed: 0.45 }, desc: '+12% move speed.', pal: { O: '#6b4430' } },
  ],
};
const CHAR_SKILLS = ['secondwind', 'orbit', 'chain', 'dreamveil', 'bless', 'shootingstar'];
const item = (slot, id) => ITEMS[slot].find(i => i.id === id);

// helper: clamp a cast target to a max range from the player
function targetIn(p, tx, ty, range) {
  const d = dist(p.x, p.y, tx, ty);
  if (d <= range) return [tx, ty];
  return [p.x + (tx - p.x) / d * range, p.y + (ty - p.y) / d * range];
}

// element = damage type per DESIGN §5b: slash | pierce | fire | frost | nature | lightning | arcane | holy (gloom: enemies only).
// stagger (0-3) rides on heavy hits (stored on the target; the stagger bar is M4). Gems amplify by element (items.js).
const SKILLS = {
  // ---------------- Dawnblade ----------------
  sunslash: { name: 'Sunslash', element: 'slash', icon: 'arc', color: '#ffcf6a', cd: 3, mp: 18, aim:{shape:'cone',range:2.1,arc:2.5}, desc: 'Sweep a wide arc of dawnlight in front of you.',
    cast(p, a) { swingWeapon(p, 0.26, 2.8); hitCone(p.x, p.y, a, 2.5, 2.1, 95, { knock: 0.35 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 2.6, r: 2.1, col: '#ffd77a', life: 0.28, w: 5 }); sfx('slash'); } },
  heroic: { name: 'Heroic Strike', element: 'slash', stagger: 3, icon: 'strike', color: '#ffb84a', cd: 5, mp: 25, aim:{shape:'cone',range:1.9,arc:1.7}, desc: 'Lunge forward and smash — stuns for 1s.',
    cast(p, a) {
      dashPlayer(p, Math.cos(a), Math.sin(a), 1.4, 0.12, { onEnd: () => {
        swingWeapon(p, 0.2, 2.2); hitCone(p.x, p.y, a, 1.7, 1.9, 170, { stun: 1.0, knock: 0.7 });
        fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.8, r: 1.9, col: '#fff2b0', life: 0.3, w: 7 }); shake(5); hitstop(0.06); sfx('heavy');
      } });
    } },
  dashstrike: { name: 'Dash Strike', element: 'slash', icon: 'dash', color: '#ffd77a', cd: 6, mp: 25, aim:{shape:'dash',range:3.8,len:3.8,w:1.0}, desc: 'Dash through enemies, cutting everything in your path.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 3.8, 0.22, { trail: '#ffe9a0', hit: { dmg: 85, r: 1.0, knock: 0.3 }, invuln: true }); sfx('dash'); } },
  whirl: { name: 'Whirling Blade', element: 'slash', icon: 'spin', color: '#ffe08a', cd: 7, mp: 30, aim:{shape:'self',range:0,r:2.0}, desc: 'Spin three times, hitting all around you.',
    cast(p) {
      for (let k = 0; k < 3; k++) delay(k * 0.22, () => {
        p.spin = 0.22; hitArea(p.x, p.y, 2.0, 60, { knock: 0.25 });
        fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: k * 2.1, arc: Math.PI * 2, r: 2.0, col: '#ffe9a0', life: 0.22, w: 4 }); sfx('slash');
      });
    } },
  judgement: { name: 'Radiant Judgement', element: 'holy', icon: 'beam', color: '#fff2b0', cd: 16, mp: 60, aim:{shape:'circle',range:6,r:2.5}, desc: 'ULTIMATE — call a pillar of light: huge damage and a long stun.',
    cast(p, a, tx, ty) {
      [tx, ty] = targetIn(p, tx, ty, 6);
      fx({ type: 'marker', x: tx, y: ty, r: 2.5, col: '#ffe9a0', life: 0.5 });
      delay(0.5, () => { hitArea(tx, ty, 2.5, 340, { stun: 1.4 }); fx({ type: 'pillar', x: tx, y: ty, col: '#fff2b0', life: 0.7, r: 2.5 }); burst(tx, ty, 0, 40, ['#fff6d6', '#ffd77a', '#ffffff'], 5); shake(8); hitstop(0.08); sfx('boom'); });
    } },
  dawnwave: { name: 'Dawn Wave', element: 'holy', icon: 'wave', color: '#ffe9a0', cd: 12, mp: 45, aim:{shape:'proj',range:10.8,w:1.0}, desc: 'ULTIMATE — release a crescent of light that pierces everything.',
    cast(p, a) { swingWeapon(p, 0.25, 2.4); spawnProj({ x: p.x, y: p.y, z: p.z + 1.4, ang: a, speed: 9, r: 1.0, dmg: 220, pierce: 99, life: 1.2, kind: 'wave', col: '#ffe9a0', knock: 0.4 }); sfx('wave'); } },
  // ---------------- Starfall Staff ----------------
  firebolt: { name: 'Firebolt', element: 'fire', icon: 'fire', color: '#ff8a4a', cd: 2.5, mp: 18, aim:{shape:'proj',range:13.2,w:0.35}, desc: 'Hurl a bolt that explodes and burns.',
    cast(p, a) { castAnim(p); spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a, speed: 11, r: 0.35, dmg: 120, life: 1.2, kind: 'fire', col: '#ff9a4a', burn: 3, explode: { r: 1.1, dmg: 45 } }); sfx('fire'); } },
  frostshard: { name: 'Frost Shards', element: 'frost', icon: 'frost', color: '#9fe8ff', cd: 3, mp: 20, aim:{shape:'proj',range:9.6,w:0.3}, desc: 'Fire three piercing shards that slow.',
    cast(p, a) { castAnim(p); for (const o of [-0.22, 0, 0.22]) spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a + o, speed: 12, r: 0.3, dmg: 68, life: 0.8, kind: 'frost', col: '#bff4ff', pierce: 1, slow: 2 }); sfx('frost'); } },
  barrage: { name: 'Arcane Barrage', element: 'arcane', icon: 'orbs', color: '#c79bff', cd: 6, mp: 30, aim:{shape:'proj',range:14.4,w:0.3}, desc: 'Five homing missiles seek out foes.',
    cast(p, a) { castAnim(p); for (let k = 0; k < 5; k++) delay(k * 0.07, () => spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a + (k - 2) * 0.35, speed: 8, r: 0.3, dmg: 48, life: 1.8, kind: 'arcane', col: '#d6b0ff', homing: 7 })); sfx('arcane'); } },
  gravity: { name: 'Gravity Well', element: 'arcane', icon: 'well', color: '#a07aff', cd: 9, mp: 35, aim:{shape:'circle',range:7,r:2.8}, desc: 'Open a well that drags enemies in and grinds them.',
    cast(p, a, tx, ty) { castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7); zone({ x: tx, y: ty, r: 2.8, life: 2.6, tick: 0.25, dmg: 26, pull: 3.2, col: '#a07aff', kind: 'well' }); sfx('arcane'); } },
  meteor: { name: 'Meteor', element: 'fire', icon: 'meteor', color: '#ff7a4a', cd: 18, mp: 70, aim:{shape:'circle',range:7,r:2.7}, desc: 'ULTIMATE — call down a meteor. Massive area damage + burn.',
    cast(p, a, tx, ty) {
      castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7);
      fx({ type: 'marker', x: tx, y: ty, r: 2.7, col: '#ff8a4a', life: 0.9 });
      fx({ type: 'meteor', x: tx, y: ty, life: 0.9, col: '#ff9a4a' });
      delay(0.9, () => { hitArea(tx, ty, 2.7, 400, { burn: 4, knock: 0.6 }); fx({ type: 'ring', x: tx, y: ty, r: 3, col: '#ffb070', life: 0.5 }); burst(tx, ty, 0, 60, ['#ffd27a', '#ff8a4a', '#ff4a3a', '#fff'], 7); shake(10); hitstop(0.1); sfx('boom'); });
    } },
  starstorm: { name: 'Starstorm', element: 'holy', icon: 'stars', color: '#bfe8ff', cd: 16, mp: 60, aim:{shape:'circle',range:7,r:2.4}, desc: 'ULTIMATE — a storm of falling stars over an area.',
    cast(p, a, tx, ty) {
      castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7);
      fx({ type: 'marker', x: tx, y: ty, r: 2.6, col: '#bfe8ff', life: 2.2 });
      for (let k = 0; k < 14; k++) delay(0.1 + k * 0.14, () => {
        const r = Math.sqrt(Math.random()) * 2.4, an = Math.random() * 6.28, sx = tx + Math.cos(an) * r, sy = ty + Math.sin(an) * r;
        fx({ type: 'meteor', x: sx, y: sy, life: 0.25, col: '#cfeaff', small: true });
        delay(0.25, () => { hitArea(sx, sy, 1.0, 85, {}); burst(sx, sy, 0, 10, ['#ffffff', '#bfe8ff'], 3); shake(2); });
      });
      sfx('arcane');
    } },
  // ---------------- Moonbow ----------------
  multishot: { name: 'Multishot', element: 'pierce', icon: 'arrows', color: '#c9d8ff', cd: 3, mp: 18, aim:{shape:'cone',range:10.5,arc:0.56}, desc: 'Loose a fan of five arrows.',
    cast(p, a) { castAnim(p); for (let k = -2; k <= 2; k++) spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a + k * 0.14, speed: 15, r: 0.25, dmg: 50, life: 0.7, kind: 'arrow', col: '#e7eeff' }); sfx('bow'); } },
  piercing: { name: 'Piercing Shot', element: 'pierce', icon: 'pierce', color: '#a6c8ff', cd: 4, mp: 22, aim:{shape:'proj',range:13.2,w:0.4}, desc: 'A charged arrow that pierces every enemy in a line.',
    cast(p, a) { castAnim(p); spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 22, r: 0.4, dmg: 175, life: 0.6, kind: 'arrow', col: '#cfe0ff', pierce: 99, big: true, knock: 0.4 }); sfx('bow'); shake(2); } },
  tumble: { name: 'Tumble', element: 'pierce', icon: 'roll', color: '#9ad8ff', cd: 5, mp: 12, aim:{shape:'dash',range:2.8,len:2.8}, desc: 'Roll away from your aim; your next shots deal +30% for 3s.',
    cast(p, a) { dashPlayer(p, -Math.cos(a), -Math.sin(a), 2.8, 0.2, { invuln: true, roll: true }); addBuff(p, 'focus', 3); sfx('dash'); } },
  snare: { name: 'Snare Trap', element: 'nature', icon: 'trap', color: '#8fe0a0', cd: 8, mp: 20, aim:{shape:'circle',range:5,r:1.4}, desc: 'Throw a trap that roots and wounds the first enemies to step in.',
    cast(p, a, tx, ty) { [tx, ty] = targetIn(p, tx, ty, 5); zone({ x: tx, y: ty, r: 1.4, life: 8, trap: true, dmg: 95, stun: 2.2, col: '#8fe0a0', kind: 'trap' }); sfx('trap'); } },
  arrowrain: { name: 'Rain of Arrows', element: 'pierce', icon: 'rain', color: '#c9d8ff', cd: 16, mp: 60, aim:{shape:'circle',range:7.5,r:2.4}, desc: 'ULTIMATE — arrows rain down on an area, slowing everything.',
    cast(p, a, tx, ty) { castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7.5); zone({ x: tx, y: ty, r: 2.4, life: 3.2, tick: 0.2, dmg: 32, slow: 1, col: '#c9d8ff', kind: 'rain' }); sfx('bow'); } },
  moonbeam: { name: 'Moonbeam', element: 'holy', icon: 'moonbeam', color: '#d8e4ff', cd: 15, mp: 55, aim:{shape:'line',range:11,len:11,w:0.9}, desc: 'ULTIMATE — channel a beam of moonlight down a long line.',
    cast(p, a) {
      castAnim(p, 0.4); p.rootT = 0.35;
      fx({ type: 'line', x: p.x, y: p.y, ang: a, len: 11, w: 0.9, col: '#d8e4ff', life: 0.35, tele: true });
      delay(0.35, () => { hitLine(p.x, p.y, a, 11, 0.9, 310, { knock: 0.5 }); fx({ type: 'beam', x: p.x, y: p.y, z: p.z + 1.5, ang: a, len: 11, col: '#e8f0ff', life: 0.4 }); shake(6); hitstop(0.06); sfx('beam'); });
    } },
  // ---------------- Armour ----------------
  bulwark: { name: 'Bulwark', element: 'slash', stagger: 2, icon: 'shield', color: '#a9b4d4', cd: 14, mp: 20, aim:{shape:'self',range:0,r:1.7}, desc: 'CHEST — take 60% less damage for 3.5s and shove foes away.',
    cast(p) { addBuff(p, 'bulwark', 3.5); hitArea(p.x, p.y, 1.7, 30, { knock: 1.0 }); fx({ type: 'ring', x: p.x, y: p.y, r: 1.8, col: '#cfe0ff', life: 0.35 }); sfx('shield'); } },
  manasurge: { name: 'Mana Surge', element: 'arcane', icon: 'surge', color: '#9c7ae0', cd: 18, mp: 0, aim:{shape:'self',range:0,r:1.4}, desc: 'CHEST — restore 120 MP and gain +30% power for 6s.',
    cast(p) { p.mp = Math.min(p.maxMp, p.mp + 120); addBuff(p, 'surge', 6); fx({ type: 'ring', x: p.x, y: p.y, r: 1.4, col: '#c7a8ff', life: 0.5 }); burst(p.x, p.y, p.z + 1, 20, ['#c7a8ff', '#ffffff'], 2); sfx('arcane'); } },
  shadowveil: { name: 'Shadow Veil', element: 'arcane', icon: 'cloak', color: '#6aa77e', cd: 15, mp: 20, aim:{shape:'self',range:0}, desc: 'CHEST — vanish for 3s (+40% speed); your next hit is a guaranteed critical.',
    cast(p) { addBuff(p, 'veil', 3); burst(p.x, p.y, p.z + 1, 20, ['#2f6b4f', '#1a1326', '#8fe0a0'], 2); sfx('dash'); } },
  warcry: { name: 'War Cry', element: 'slash', stagger: 2, icon: 'shout', color: '#ffcf6a', cd: 12, mp: 20, aim:{shape:'self',range:0,r:2.6}, desc: 'HELMET — a roar that stuns and knocks back nearby enemies.',
    cast(p) { hitArea(p.x, p.y, 2.6, 40, { stun: 1.3, knock: 0.9 }); fx({ type: 'ring', x: p.x, y: p.y, r: 2.7, col: '#ffd77a', life: 0.4 }); shake(4); sfx('shout'); } },
  frostnova: { name: 'Frost Nova', element: 'frost', icon: 'nova', color: '#9fe8ff', cd: 12, mp: 25, aim:{shape:'self',range:0,r:2.6}, desc: 'HELMET — freeze all nearby enemies in place for 2s.',
    cast(p) { hitArea(p.x, p.y, 2.6, 60, { stun: 2.0, freeze: true }); fx({ type: 'ring', x: p.x, y: p.y, r: 2.7, col: '#bff4ff', life: 0.5 }); burst(p.x, p.y, 0.5, 30, ['#ffffff', '#bff4ff', '#7fd2ff'], 4); sfx('frost'); } },
  mend: { name: 'Mend', element: 'nature', icon: 'heart', color: '#8fe0a0', cd: 14, mp: 25, aim:{shape:'self',range:0}, desc: 'HELMET — heal 25% of max HP over 4s.',
    cast(p) { addBuff(p, 'mend', 4); sfx('heal'); } },
  charge: { name: 'Charge', element: 'slash', stagger: 3, icon: 'charge', color: '#b9c2dc', cd: 7, st: 35, aim:{shape:'dash',range:4.2,len:4.2,w:1.0}, desc: 'BOOTS — charge forward, bowling enemies over.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 4.2, 0.26, { trail: '#cfe0ff', hit: { dmg: 60, r: 1.0, knock: 1.0 }, invuln: true }); sfx('dash'); } },
  blink: { name: 'Blink', element: 'arcane', icon: 'blink', color: '#e7c9a0', cd: 6, st: 30, aim:{shape:'dash',range:3.6,len:3.6}, desc: 'BOOTS — teleport a short distance toward your aim.',
    cast(p, a) { blinkPlayer(p, a, 3.6); sfx('blink'); } },
  sprint: { name: 'Sprint', element: 'nature', icon: 'sprint', color: '#c08a5e', cd: 9, st: 30, aim:{shape:'self',range:0}, desc: 'BOOTS — +80% move speed for 3s and shake off slows.',
    cast(p) { addBuff(p, 'sprint', 3); p.slowT = 0; burst(p.x, p.y, 0.2, 10, ['#ffffff', '#e7d6c0'], 2); sfx('dash'); } },
  // ---------------- Character (chosen freely) ----------------
  secondwind: { name: 'Second Wind', element: 'nature', icon: 'heart', color: '#ff8fb0', cd: 25, mp: 30, aim:{shape:'self',range:0}, desc: 'CHARACTER — instantly heal 35% of max HP.',
    cast(p) { healPlayer(p, p.maxHp * 0.35 * healMul(p)); fx({ type: 'ring', x: p.x, y: p.y, r: 1.2, col: '#ffb0c8', life: 0.5 }); burst(p.x, p.y, p.z + 1, 24, ['#ffb0c8', '#ffffff', '#8fe0a0'], 2); sfx('heal'); } },
  orbit: { name: 'Arcane Orbit', element: 'arcane', icon: 'orbit', color: '#c79bff', cd: 16, mp: 35, aim:{shape:'self',range:0}, desc: 'CHARACTER — three orbs circle you for 8s, burning anything they touch.',
    cast(p) { addBuff(p, 'orbit', 8); sfx('arcane'); } },
  chain: { name: 'Chain Lightning', element: 'lightning', icon: 'chain', color: '#9fe0ff', cd: 7, mp: 30, aim:{shape:'circle',range:7,r:3}, desc: 'CHARACTER — lightning leaps between up to 6 enemies.',
    cast(p, a, tx, ty) { castAnim(p); chainLightning(p, tx, ty); sfx('zap'); } },
  dreamveil: { name: 'Dreamveil', element: 'arcane', icon: 'veil', color: '#ffb0e0', cd: 30, mp: 40, aim:{shape:'self',range:0,r:8}, desc: 'CHARACTER — bend the dream: enemies move at 35% speed for 4s.',
    cast(p) { addBuff(p, 'dreamveil', 4); fx({ type: 'ring', x: p.x, y: p.y, r: 8, col: '#ffb0e0', life: 0.8 }); sfx('veil'); } },
  bless: { name: 'Blessing of Dawn', element: 'holy', icon: 'bless', color: '#ffe08a', cd: 24, mp: 30, aim:{shape:'self',range:0}, desc: 'CHARACTER — +40% damage for 8s.',
    cast(p) { addBuff(p, 'bless', 8); fx({ type: 'pillar', x: p.x, y: p.y, col: '#ffe9a0', life: 0.5, r: 0.8 }); sfx('heal'); } },
  shootingstar: { name: 'Shooting Star', element: 'fire', icon: 'star', color: '#fff2b0', cd: 6, mp: 22, aim:{shape:'circle',range:7,r:1.6}, desc: 'CHARACTER — a star crashes down at your cursor.',
    cast(p, a, tx, ty) {
      [tx, ty] = targetIn(p, tx, ty, 7);
      fx({ type: 'meteor', x: tx, y: ty, life: 0.35, col: '#fff2b0', small: true });
      delay(0.35, () => { hitArea(tx, ty, 1.6, 170, { knock: 0.4 }); fx({ type: 'ring', x: tx, y: ty, r: 1.7, col: '#fff2b0', life: 0.35 }); burst(tx, ty, 0, 24, ['#fff', '#fff2b0', '#ffd77a'], 4); shake(4); sfx('boom'); });
    } },
};

const BUFFS = {
  bulwark: { name: 'Bulwark', icon: 'shield', color: '#a9b4d4' },
  surge: { name: 'Mana Surge', icon: 'surge', color: '#9c7ae0' },
  veil: { name: 'Shadow Veil', icon: 'cloak', color: '#6aa77e' },
  mend: { name: 'Mend', icon: 'heart', color: '#8fe0a0' },
  sprint: { name: 'Sprint', icon: 'sprint', color: '#c08a5e' },
  orbit: { name: 'Arcane Orbit', icon: 'orbit', color: '#c79bff' },
  dreamveil: { name: 'Dreamveil', icon: 'veil', color: '#ffb0e0' },
  bless: { name: 'Blessing', icon: 'bless', color: '#ffe08a' },
  focus: { name: 'Focus', icon: 'roll', color: '#9ad8ff' },
};
