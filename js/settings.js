'use strict';
// ---------------------------------------------------------------------------
// settings.js — settings + accessibility DATA (HUD.md "Pause / settings", CONTROLS.md "Accessibility",
// DESIGN §16.1.5 difficulty). The settings screen (Sonnet) draws from SETTINGS_SCHEMA and calls setSetting().
// Loaded right after util.js in index.html and editor.html; no dependencies.
//
// API
//   SETTINGS                      live values (read-only for callers; write through setSetting)
//   SETTINGS_SCHEMA               [{ key, label, group, type:'slider'|'toggle'|'choice', min, max, step, options:[{v,label}] }]
//   setSetting(key, value) -> the stored (validated) value; persists immediately
//   resetSettings(group?)         back to defaults (one group or all)
//   settingsData() / applySettings(obj)   the save's `settings` block (also mirrored to localStorage
//                                 'dreamy.settings.v1' so they hold on the title screen and across New Dream)
//   onSettingsChange(fn)          fn(key, value) after every change
//   Getters used by the game:  sfxVol() musicVol() shakeMul() hitstopOn() flashCap() damageNumbersOn()
//     damageTakenMul() (Story 0.6, Normal 1) bossHitCap() (max share of max HP per telegraphed boss hit: Story 0.30, Normal 0.45) aimAssistCone() (radians half-angle; off 0 / low 6° / high 10° = the
//     20° cone) attackToggle() textPx() (body px 14/18/22) moveDeadzone() aimDeadzone()
// ---------------------------------------------------------------------------
const SETTINGS_SCHEMA = [
  { key: 'music', label: 'Music', group: 'audio', type: 'slider', min: 0, max: 1, step: 0.25, def: 0.75 },
  { key: 'sfx', label: 'Sound effects', group: 'audio', type: 'slider', min: 0, max: 1, step: 0.25, def: 0.75 },
  { key: 'muted', label: 'Mute all', group: 'audio', type: 'toggle', def: false },
  { key: 'captions', label: 'Sound captions', group: 'audio', type: 'toggle', def: false },
  { key: 'master', label: 'Master volume', group: 'audio', type: 'slider', min: 0, max: 1, step: 0.25, def: 0.75 },
  { key: 'ui', label: 'UI sounds', group: 'audio', type: 'slider', min: 0, max: 1, step: 0.25, def: 0.75 },
  { key: 'ambient', label: 'Ambience', group: 'audio', type: 'slider', min: 0, max: 1, step: 0.25, def: 0.75 },
  { key: 'mono', label: 'Mono audio', group: 'audio', type: 'toggle', def: false },
  { key: 'reduceBass', label: 'Reduce bass', group: 'audio', type: 'toggle', def: false },
  { key: 'difficulty', label: 'Difficulty', group: 'game', type: 'choice', def: 'normal', options: [{ v: 'story', label: 'Story' }, { v: 'normal', label: 'Normal' }] },
  { key: 'shake', label: 'Screen shake', group: 'display', type: 'slider', min: 0, max: 100, step: 25, def: 100 },
  { key: 'hitstop', label: 'Hitstop', group: 'display', type: 'toggle', def: true },
  { key: 'flashReduce', label: 'Reduce flashes', group: 'display', type: 'toggle', def: false },
  { key: 'damageNumbers', label: 'Damage numbers', group: 'display', type: 'toggle', def: true },
  { key: 'damageNumberSize', label: 'Damage number size', group: 'display', type: 'choice', def: 'M', options: [{ v: 'S', label: 'S' }, { v: 'M', label: 'M' }, { v: 'L', label: 'L' }] },
  { key: 'textSize', label: 'Text size', group: 'display', type: 'choice', def: 'M', options: [{ v: 'S', label: 'S' }, { v: 'M', label: 'M' }, { v: 'L', label: 'L' }] },
  { key: 'rarityShapes', label: 'Rarity shapes (colourblind)', group: 'display', type: 'toggle', def: false },
  { key: 'attackMode', label: 'Attack', group: 'controls', type: 'choice', def: 'hold', options: [{ v: 'hold', label: 'Hold' }, { v: 'toggle', label: 'Toggle' }] },
  { key: 'aimAssist', label: 'Aim assist', group: 'controls', type: 'choice', def: 'high', options: [{ v: 'off', label: 'Off' }, { v: 'low', label: 'Low' }, { v: 'high', label: 'High' }] },
  { key: 'deadzone', label: 'Stick deadzone', group: 'controls', type: 'slider', min: 0.1, max: 0.4, step: 0.02, def: 0.22 },
  { key: 'doubleTapDodge', label: 'Double-tap dodge (touch)', group: 'controls', type: 'toggle', def: true },
  { key: 'leftHanded', label: 'Left-handed touch', group: 'controls', type: 'toggle', def: false },
  { key: 'vibration', label: 'Vibration (haptics)', group: 'controls', type: 'toggle', def: true },
  { key: 'groundIndicators', label: 'Ground indicators', group: 'controls', type: 'choice', def: 'auto', options: [{ v: 'auto', label: 'Auto' }, { v: 'off', label: 'Off' }, { v: 'hold', label: 'On hold' }, { v: 'always', label: 'Always' }] },
  { key: 'showAll9', label: 'Show all 9 skills (tablets)', group: 'controls', type: 'toggle', def: false },
];
const SETTINGS = {};
const SETTINGS_KEY = 'dreamy.settings.v1';
const _settingsFns = [];
function _validSetting(d, v) {
  if (d.type === 'toggle') return typeof v === 'boolean' ? v : d.def;
  if (d.type === 'choice') return d.options.some(o => o.v === v) ? v : d.def;
  const n = +v; if (!isFinite(n)) return d.def;
  return Math.round(clamp(n, d.min, d.max) / d.step) * d.step;
}
function setSetting(key, v) {
  const d = SETTINGS_SCHEMA.find(q => q.key === key); if (!d) return undefined;
  SETTINGS[key] = _validSetting(d, v);
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* private mode */ }
  for (const fn of _settingsFns) try { fn(key, SETTINGS[key]); } catch (e) { /* listener error */ }
  return SETTINGS[key];
}
function applySettings(obj) {
  for (const d of SETTINGS_SCHEMA) SETTINGS[d.key] = _validSetting(d, obj && obj[d.key] !== undefined ? obj[d.key] : d.def);
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* ignore */ }
}
function resetSettings(group) { for (const d of SETTINGS_SCHEMA) if (!group || d.group === group) SETTINGS[d.key] = d.def; applySettings(SETTINGS); }
const settingsData = () => Object.assign({}, SETTINGS);
const onSettingsChange = fn => { _settingsFns.push(fn); };
(function loadSettings() {
  let o = null; try { o = JSON.parse(localStorage.getItem(SETTINGS_KEY)); } catch (e) { o = null; }
  for (const d of SETTINGS_SCHEMA) SETTINGS[d.key] = _validSetting(d, o && o[d.key] !== undefined ? o[d.key] : d.def);
})();

const sfxVol = () => SETTINGS.muted ? 0 : SETTINGS.sfx / 0.75;          // 0.75 = the volume the synth was tuned at
const musicVol = () => SETTINGS.muted ? 0 : SETTINGS.music;
const shakeMul = () => SETTINGS.shake / 100;
const hitstopOn = () => SETTINGS.hitstop;
const flashCap = () => SETTINGS.flashReduce ? 0.5 : 1;                     // render.js: bloom + light flash multiplier
const damageNumbersOn = () => SETTINGS.damageNumbers;
const damageTakenMul = () => SETTINGS.difficulty === 'story' ? 0.6 : 1;
// DESIGN §20.3 "one mistake never kills": no single telegraphed boss hit takes more than this share of the hero's ACTUAL max HP
const bossHitCap = () => SETTINGS.difficulty === 'story' ? 0.30 : 0.45;
const aimAssistCone = () => ({ off: 0, low: 6, high: 10 }[SETTINGS.aimAssist] || 0) * Math.PI / 180;
const attackToggle = () => SETTINGS.attackMode === 'toggle';
const textPx = () => ({ S: 14, M: 18, L: 22 }[SETTINGS.textSize] || 18);
const moveDeadzone = () => SETTINGS.deadzone;
const aimDeadzone = () => Math.min(0.5, SETTINGS.deadzone + 0.06);
