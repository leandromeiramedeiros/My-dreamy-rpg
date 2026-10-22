// Sound effect recipes, boss telegraph cues and sound captions.
// Plain data, synthesized at runtime (docs/design/audio.md, "Sound design" and "Mixing rules").
// Layer: { osc: sine|square|triangle|saw|noise, f0, f1 (Hz, sweeps f0 -> f1), dur (s), gain,
//          filter?: { type, freq, q }, delay? (s offset inside the sound) }
// prio 0-3 (higher wins voice stealing), bus sfx|ui|ambient, vary = pitch randomization (0 = none).

const SFX_RECIPES = {
  // ---- UI (no pitch variation) -------------------------------------------------
  ui_hover:   { layers: [{ osc: 'sine', f0: 1800, f1: 1800, dur: 0.002, gain: 0.05 }], prio: 1, bus: 'ui', vary: 0 },
  ui_confirm: { layers: [
                  { osc: 'sine', f0: 880, f1: 880, dur: 0.12, gain: 0.06 },
                  { osc: 'sine', f0: 1320, f1: 1320, dur: 0.12, gain: 0.05, delay: 0.03 }], prio: 1, bus: 'ui', vary: 0 },
  ui_back:    { layers: [{ osc: 'sine', f0: 660, f1: 330, dur: 0.14, gain: 0.05 }], prio: 1, bus: 'ui', vary: 0 },
  ui_tab:     { layers: [{ osc: 'noise', f0: 1200, f1: 900, dur: 0.04, gain: 0.04, filter: { type: 'bandpass', freq: 1200, q: 1.5 } }], prio: 1, bus: 'ui', vary: 0 },
  ui_equip:   { layers: [
                  { osc: 'triangle', f0: 900, f1: 1200, dur: 0.1, gain: 0.05 },
                  { osc: 'noise', f0: 3000, f1: 2000, dur: 0.06, gain: 0.03, filter: { type: 'bandpass', freq: 3000, q: 2 } }], prio: 1, bus: 'ui', vary: 0 },
  ui_socket:  { layers: [{ osc: 'sine', f0: 2200, f1: 2100, dur: 0.25, gain: 0.06, filter: { type: 'highpass', freq: 1200, q: 0.7 } }], prio: 1, bus: 'ui', vary: 0 },
  ui_salvage: { layers: [{ osc: 'noise', f0: 2500, f1: 600, dur: 0.18, gain: 0.08, filter: { type: 'bandpass', freq: 1500, q: 1 } }], prio: 1, bus: 'ui', vary: 0 },
  ui_error:   { layers: [{ osc: 'square', f0: 220, f1: 220, dur: 0.08, gain: 0.05 }], prio: 1, bus: 'ui', vary: 0 },

  // ---- Footsteps (every 0.28 s, +-8 % pitch, -18 dB) ---------------------------
  step_grass: { layers: [{ osc: 'noise', f0: 900, f1: 500, dur: 0.12, gain: 0.02, filter: { type: 'lowpass', freq: 900, q: 0.5 } }], prio: 0, bus: 'sfx', vary: 0.08 },
  step_stone: { layers: [
                  { osc: 'sine', f0: 1400, f1: 900, dur: 0.02, gain: 0.03 },
                  { osc: 'noise', f0: 2000, f1: 1200, dur: 0.03, gain: 0.02, filter: { type: 'bandpass', freq: 2000, q: 2 } }], prio: 0, bus: 'sfx', vary: 0.08 },
  step_wood:  { layers: [{ osc: 'square', f0: 200, f1: 180, dur: 0.05, gain: 0.02, filter: { type: 'lowpass', freq: 800, q: 1 } }], prio: 0, bus: 'sfx', vary: 0.08 },
  step_water: { layers: [{ osc: 'noise', f0: 4000, f1: 2000, dur: 0.16, gain: 0.03, filter: { type: 'highpass', freq: 1500, q: 0.7 } }], prio: 0, bus: 'sfx', vary: 0.08 },
  step_sand:  { layers: [{ osc: 'noise', f0: 700, f1: 400, dur: 0.14, gain: 0.02, filter: { type: 'lowpass', freq: 700, q: 0.5 } }], prio: 0, bus: 'sfx', vary: 0.08 },
  step_metal: { layers: [{ osc: 'sine', f0: 3200, f1: 3000, dur: 0.05, gain: 0.015 }], prio: 0, bus: 'sfx', vary: 0.08 },

  // ---- Weapons -----------------------------------------------------------------
  swing:  { layers: [{ osc: 'noise', f0: 2400, f1: 400, dur: 0.14, gain: 0.06, filter: { type: 'bandpass', freq: 2400, q: 1.2 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  swing2: { layers: [{ osc: 'noise', f0: 2400 * 1.0595, f1: 400 * 1.0595, dur: 0.14, gain: 0.06, filter: { type: 'bandpass', freq: 2500, q: 1.2 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  swing3: { layers: [{ osc: 'noise', f0: 2400 * 1.1225, f1: 400 * 1.1225, dur: 0.16, gain: 0.07, filter: { type: 'bandpass', freq: 2650, q: 1.2 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  staff:  { layers: [
            { osc: 'sine', f0: 500, f1: 1100, dur: 0.25, gain: 0.06 },
            { osc: 'sine', f0: 2200, f1: 2600, dur: 0.12, gain: 0.02, delay: 0.12 }], prio: 2, bus: 'sfx', vary: 0.06 },
  bow:    { layers: [
            { osc: 'triangle', f0: 300, f1: 900, dur: 0.1, gain: 0.05 },
            { osc: 'noise', f0: 3000, f1: 1500, dur: 0.12, gain: 0.02, filter: { type: 'highpass', freq: 2000, q: 0.7 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  dagger:       { layers: [
                    { osc: 'noise', f0: 3500, f1: 2000, dur: 0.02, gain: 0.07, filter: { type: 'bandpass', freq: 3500, q: 3 } },
                    { osc: 'noise', f0: 3500, f1: 2000, dur: 0.02, gain: 0.07, delay: 0.02, filter: { type: 'bandpass', freq: 3500, q: 3 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  dagger_thud:  { layers: [
                    { osc: 'noise', f0: 3500, f1: 2000, dur: 0.02, gain: 0.07, filter: { type: 'bandpass', freq: 3500, q: 3 } },
                    { osc: 'noise', f0: 3500, f1: 2000, dur: 0.02, gain: 0.07, delay: 0.02, filter: { type: 'bandpass', freq: 3500, q: 3 } },
                    { osc: 'sine', f0: 110, f1: 45, dur: 0.18, gain: 0.12, delay: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },
  twohand_windup: { layers: [{ osc: 'noise', f0: 300, f1: 1800, dur: 0.4, gain: 0.05, filter: { type: 'bandpass', freq: 600, q: 0.8 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  twohand_hit:    { layers: [
                    { osc: 'sine', f0: 60, f1: 50, dur: 0.25, gain: 0.18 },
                    { osc: 'noise', f0: 1500, f1: 300, dur: 0.15, gain: 0.1, filter: { type: 'lowpass', freq: 2000, q: 0.7 } },
                    { osc: 'sine', f0: 45, f1: 35, dur: 0.6, gain: 0.08, delay: 0.1 }], prio: 3, bus: 'sfx', vary: 0.06 },
  twohand_charge: { layers: [{ osc: 'noise', f0: 500, f1: 2400, dur: 0.3, gain: 0.04, filter: { type: 'bandpass', freq: 800, q: 1 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  slash: { layers: [{ osc: 'noise', f0: 2400, f1: 400, dur: 0.18, gain: 0.07, filter: { type: 'bandpass', freq: 2400, q: 1.2 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  heavy: { layers: [
           { osc: 'noise', f0: 900, f1: 80, dur: 0.3, gain: 0.12, filter: { type: 'bandpass', freq: 900, q: 1 } },
           { osc: 'square', f0: 140, f1: 50, dur: 0.3, gain: 0.05 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dash:  { layers: [{ osc: 'noise', f0: 600, f1: 2400, dur: 0.18, gain: 0.06, filter: { type: 'bandpass', freq: 600, q: 1.2 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  boom:  { layers: [
           { osc: 'noise', f0: 300, f1: 40, dur: 0.6, gain: 0.18, filter: { type: 'lowpass', freq: 600, q: 0.7 } },
           { osc: 'sine', f0: 90, f1: 30, dur: 0.5, gain: 0.15 }], prio: 3, bus: 'sfx', vary: 0.06 },
  shout: { layers: [{ osc: 'saw', f0: 180, f1: 90, dur: 0.4, gain: 0.06 }], prio: 2, bus: 'sfx', vary: 0.06 },
  hit:   { layers: [{ osc: 'square', f0: 220, f1: 90, dur: 0.08, gain: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },
  hurt:  { layers: [{ osc: 'saw', f0: 160, f1: 60, dur: 0.2, gain: 0.07 }], prio: 3, bus: 'sfx', vary: 0.06 },
  die:   { layers: [{ osc: 'noise', f0: 400, f1: 60, dur: 0.4, gain: 0.08, filter: { type: 'bandpass', freq: 400, q: 1 } }], prio: 3, bus: 'sfx', vary: 0 },
  trap:  { layers: [{ osc: 'square', f0: 800, f1: 200, dur: 0.1, gain: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },

  // ---- Damage types (9) --------------------------------------------------------
  dmg_slash:     { layers: [{ osc: 'noise', f0: 3000, f1: 500, dur: 0.15, gain: 0.07, filter: { type: 'bandpass', freq: 3000, q: 1.2 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_pierce:    { layers: [
                   { osc: 'noise', f0: 4000, f1: 4000, dur: 0.01, gain: 0.07, filter: { type: 'highpass', freq: 2500, q: 0.7 } },
                   { osc: 'sine', f0: 1600, f1: 2400, dur: 0.22, gain: 0.03, delay: 0.01 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_fire:      { layers: [
                   { osc: 'noise', f0: 500, f1: 1500, dur: 0.05, gain: 0.06, filter: { type: 'bandpass', freq: 900, q: 2 } },
                   { osc: 'noise', f0: 600, f1: 1800, dur: 0.05, gain: 0.06, delay: 0.05, filter: { type: 'bandpass', freq: 1100, q: 2 } },
                   { osc: 'noise', f0: 500, f1: 1500, dur: 0.05, gain: 0.06, delay: 0.1, filter: { type: 'bandpass', freq: 1300, q: 2 } },
                   { osc: 'noise', f0: 700, f1: 1700, dur: 0.05, gain: 0.06, delay: 0.15, filter: { type: 'bandpass', freq: 1000, q: 2 } },
                   { osc: 'noise', f0: 200, f1: 80, dur: 0.4, gain: 0.08, filter: { type: 'lowpass', freq: 300, q: 0.7 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_frost:     { layers: [
                   { osc: 'sine', f0: 2600, f1: 1800, dur: 0.25, gain: 0.05 },
                   { osc: 'triangle', f0: 3800, f1: 3200, dur: 0.12, gain: 0.02, delay: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_nature:    { layers: [
                   { osc: 'noise', f0: 1200, f1: 400, dur: 0.2, gain: 0.05, filter: { type: 'lowpass', freq: 1200, q: 1 } },
                   { osc: 'sine', f0: 700, f1: 1400, dur: 0.06, gain: 0.04, delay: 0.02 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_lightning: { layers: [{ osc: 'saw', f0: 2000, f1: 200, dur: 0.01, gain: 0.07 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_arcane:    { layers: [
                   { osc: 'sine', f0: 500, f1: 1100, dur: 0.25, gain: 0.05 },
                   { osc: 'sine', f0: 707, f1: 1556, dur: 0.25, gain: 0.03 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_holy:      { layers: [
                   { osc: 'triangle', f0: 523, f1: 523, dur: 0.5, gain: 0.04 },
                   { osc: 'triangle', f0: 659, f1: 659, dur: 0.5, gain: 0.035, delay: 0.03 },
                   { osc: 'triangle', f0: 784, f1: 784, dur: 0.5, gain: 0.03, delay: 0.06 }], prio: 2, bus: 'sfx', vary: 0.06 },
  dmg_gloom:     { layers: [{ osc: 'sine', f0: 150, f1: 150, dur: 0.4, gain: 0.08, filter: { type: 'lowpass', freq: 400, q: 1 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  fire:  { layers: [{ osc: 'noise', f0: 500, f1: 1500, dur: 0.25, gain: 0.07, filter: { type: 'bandpass', freq: 500, q: 1.5 } }], prio: 2, bus: 'sfx', vary: 0.06 },
  frost: { layers: [{ osc: 'triangle', f0: 2600, f1: 1800, dur: 0.25, gain: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },
  arcane:{ layers: [
           { osc: 'triangle', f0: 500, f1: 1100, dur: 0.25, gain: 0.05 },
           { osc: 'sine', f0: 750, f1: 1650, dur: 0.25, gain: 0.03 }], prio: 2, bus: 'sfx', vary: 0.06 },
  zap:   { layers: [{ osc: 'saw', f0: 3000, f1: 300, dur: 0.25, gain: 0.03 }], prio: 2, bus: 'sfx', vary: 0.06 },

  // ---- Statuses ----------------------------------------------------------------
  st_burn:   { layers: [
               { osc: 'noise', f0: 2500, f1: 2500, dur: 0.02, gain: 0.04, filter: { type: 'highpass', freq: 2000, q: 0.7 } },
               { osc: 'noise', f0: 2500, f1: 2500, dur: 0.02, gain: 0.03, delay: 0.09, filter: { type: 'highpass', freq: 2000, q: 0.7 } }], prio: 1, bus: 'sfx', vary: 0.06 },
  st_chill:  { layers: [{ osc: 'sine', f0: 2400, f1: 3000, dur: 0.2, gain: 0.03 }], prio: 1, bus: 'sfx', vary: 0.06 },
  st_freeze: { layers: [
               { osc: 'noise', f0: 4000, f1: 1500, dur: 0.12, gain: 0.07, filter: { type: 'highpass', freq: 2000, q: 1 } },
               { osc: 'sine', f0: 1800, f1: 900, dur: 0.15, gain: 0.04, delay: 0.05 }], prio: 2, bus: 'sfx', vary: 0.06 },
  st_poison: { layers: [{ osc: 'sine', f0: 300, f1: 600, dur: 0.06, gain: 0.04 }, { osc: 'sine', f0: 400, f1: 800, dur: 0.06, gain: 0.03, delay: 0.08 }], prio: 1, bus: 'sfx', vary: 0.06 },
  st_shock:  { layers: [{ osc: 'square', f0: 120, f1: 120, dur: 0.06, gain: 0.03, filter: { type: 'bandpass', freq: 1200, q: 2 } }], prio: 1, bus: 'sfx', vary: 0.06 },
  st_break:  { layers: [
               { osc: 'sine', f0: 2400, f1: 2400, dur: 0.5, gain: 0.06 },
               { osc: 'sine', f0: 3600, f1: 3600, dur: 0.4, gain: 0.03, delay: 0.02 },
               { osc: 'noise', f0: 4000, f1: 2000, dur: 0.1, gain: 0.05, filter: { type: 'highpass', freq: 2500, q: 1 } }], prio: 3, bus: 'sfx', vary: 0.03 },

  // ---- Reactions (each a learnable 2-note interval) ----------------------------
  rx_shatter:  { layers: [
                 { osc: 'noise', f0: 5000, f1: 3000, dur: 0.15, gain: 0.06, filter: { type: 'highpass', freq: 3000, q: 1 } },
                 { osc: 'sine', f0: 1046, f1: 1046, dur: 0.2, gain: 0.05, delay: 0.02 },
                 { osc: 'sine', f0: 698, f1: 698, dur: 0.25, gain: 0.05, delay: 0.14 }], prio: 3, bus: 'sfx', vary: 0.03 },
  rx_wildfire: { layers: [
                 { osc: 'noise', f0: 400, f1: 2000, dur: 0.4, gain: 0.07, filter: { type: 'bandpass', freq: 900, q: 1 } },
                 { osc: 'sine', f0: 392, f1: 392, dur: 0.2, gain: 0.05, delay: 0.1 },
                 { osc: 'sine', f0: 523, f1: 523, dur: 0.25, gain: 0.05, delay: 0.2 }], prio: 3, bus: 'sfx', vary: 0.03 },
  rx_conduct:  { layers: [
                 { osc: 'saw', f0: 2400, f1: 300, dur: 0.06, gain: 0.04 },
                 { osc: 'saw', f0: 2400, f1: 300, dur: 0.06, gain: 0.04, delay: 0.07 },
                 { osc: 'saw', f0: 2400, f1: 300, dur: 0.06, gain: 0.04, delay: 0.14 }], prio: 3, bus: 'sfx', vary: 0.03 },
  rx_overload: { layers: [
                 { osc: 'saw', f0: 220, f1: 220, dur: 0.5, gain: 0.05 },
                 { osc: 'saw', f0: 223, f1: 223, dur: 0.5, gain: 0.05 },
                 { osc: 'saw', f0: 330, f1: 330, dur: 0.45, gain: 0.03, delay: 0.1, filter: { type: 'lowpass', freq: 1800, q: 1 } }], prio: 3, bus: 'sfx', vary: 0.03 },
  rx_purify:   { layers: [
                 { osc: 'sine', f0: 1047, f1: 1047, dur: 0.6, gain: 0.05 },
                 { osc: 'sine', f0: 1319, f1: 1319, dur: 0.6, gain: 0.04, delay: 0.05 }], prio: 3, bus: 'sfx', vary: 0.03 },
  rx_rupture:  { layers: [
                 { osc: 'sine', f0: 70, f1: 40, dur: 0.4, gain: 0.16 },
                 { osc: 'sine', f0: 2000, f1: 2000, dur: 0.08, gain: 0.05, delay: 0.1 }], prio: 3, bus: 'sfx', vary: 0.03 },
  rx_detonate: { layers: [
                 { osc: 'sine', f0: 160, f1: 35, dur: 0.6, gain: 0.16 },
                 { osc: 'noise', f0: 3000, f1: 800, dur: 0.3, gain: 0.05, delay: 0.1, filter: { type: 'bandpass', freq: 2000, q: 1 } }], prio: 3, bus: 'sfx', vary: 0.03 },
  codex:       { layers: [
                 { osc: 'sine', f0: 1046, f1: 1046, dur: 0.15, gain: 0.05 },
                 { osc: 'sine', f0: 1318, f1: 1318, dur: 0.15, gain: 0.05, delay: 0.12 },
                 { osc: 'sine', f0: 1568, f1: 1568, dur: 0.15, gain: 0.05, delay: 0.24 },
                 { osc: 'sine', f0: 2093, f1: 2093, dur: 0.35, gain: 0.05, delay: 0.36 }], prio: 2, bus: 'ui', vary: 0 },

  // ---- Stingers, level-up, loot, drops -----------------------------------------
  levelup: { layers: [
             { osc: 'triangle', f0: 523, f1: 528, dur: 0.32, gain: 0.06 },
             { osc: 'triangle', f0: 659, f1: 666, dur: 0.32, gain: 0.06, delay: 0.09 },
             { osc: 'triangle', f0: 784, f1: 792, dur: 0.32, gain: 0.06, delay: 0.18 },
             { osc: 'triangle', f0: 1047, f1: 1058, dur: 0.32, gain: 0.06, delay: 0.27 },
             { osc: 'sine', f0: 1568, f1: 2093, dur: 0.6, gain: 0.03, delay: 0.27 }], prio: 2, bus: 'ui', vary: 0 },
  victory: { layers: [
             { osc: 'triangle', f0: 659, f1: 659, dur: 1.0, gain: 0.05 },
             { osc: 'triangle', f0: 784, f1: 784, dur: 1.0, gain: 0.05 },
             { osc: 'triangle', f0: 988, f1: 988, dur: 1.0, gain: 0.05 },
             { osc: 'sine', f0: 1318, f1: 1318, dur: 1.2, gain: 0.03, delay: 0.1 }], prio: 2, bus: 'ui', vary: 0 },
  pickup: { layers: [{ osc: 'sine', f0: 880, f1: 1320, dur: 0.09, gain: 0.04 }], prio: 1, bus: 'ui', vary: 0 },
  loot:   { layers: [
            { osc: 'triangle', f0: 660, f1: 1320, dur: 0.25, gain: 0.05 },
            { osc: 'sine', f0: 990, f1: 1980, dur: 0.3, gain: 0.03, delay: 0.06 }], prio: 2, bus: 'ui', vary: 0 },
  chest:  { layers: [
            { osc: 'square', f0: 180, f1: 420, dur: 0.22, gain: 0.04 },
            { osc: 'noise', f0: 2000, f1: 600, dur: 0.2, gain: 0.04, filter: { type: 'bandpass', freq: 2000, q: 2 } }], prio: 2, bus: 'sfx', vary: 0.03 },
  // drop1 (common) .. drop5 (legendary/mythic): one more pentatonic note per rarity step
  drop1: { layers: [{ osc: 'triangle', f0: 660, f1: 661, dur: 0.26, gain: 0.038 }], prio: 2, bus: 'ui', vary: 0 },
  drop2: { layers: [
           { osc: 'triangle', f0: 660, f1: 661, dur: 0.30, gain: 0.041 },
           { osc: 'triangle', f0: 825, f1: 826, dur: 0.30, gain: 0.041, delay: 0.07 }], prio: 2, bus: 'ui', vary: 0 },
  drop3: { layers: [
           { osc: 'triangle', f0: 660, f1: 661, dur: 0.34, gain: 0.044 },
           { osc: 'triangle', f0: 825, f1: 826, dur: 0.34, gain: 0.044, delay: 0.07 },
           { osc: 'triangle', f0: 1040, f1: 1041, dur: 0.34, gain: 0.044, delay: 0.14 }], prio: 2, bus: 'ui', vary: 0 },
  drop4: { layers: [
           { osc: 'triangle', f0: 660, f1: 661, dur: 0.38, gain: 0.047 },
           { osc: 'triangle', f0: 825, f1: 826, dur: 0.38, gain: 0.047, delay: 0.07 },
           { osc: 'triangle', f0: 1040, f1: 1041, dur: 0.38, gain: 0.047, delay: 0.14 },
           { osc: 'triangle', f0: 1310, f1: 1311, dur: 0.38, gain: 0.047, delay: 0.21 },
           { osc: 'sine', f0: 2640, f1: 3520, dur: 0.5, gain: 0.02, delay: 0.21 }], prio: 2, bus: 'ui', vary: 0 },
  drop5: { layers: [
           { osc: 'triangle', f0: 660, f1: 661, dur: 0.42, gain: 0.05 },
           { osc: 'triangle', f0: 825, f1: 826, dur: 0.42, gain: 0.05, delay: 0.07 },
           { osc: 'triangle', f0: 1040, f1: 1041, dur: 0.42, gain: 0.05, delay: 0.14 },
           { osc: 'triangle', f0: 1310, f1: 1311, dur: 0.42, gain: 0.05, delay: 0.21 },
           { osc: 'triangle', f0: 1650, f1: 1651, dur: 0.42, gain: 0.05, delay: 0.28 },
           { osc: 'sine', f0: 2640, f1: 3520, dur: 0.5, gain: 0.02, delay: 0.28 }], prio: 3, bus: 'ui', vary: 0 },
  legendary_choir:    { layers: [
                      { osc: 'sine', f0: 262, f1: 262, dur: 2.0, gain: 0.04 },
                      { osc: 'sine', f0: 330, f1: 330, dur: 2.0, gain: 0.035 },
                      { osc: 'sine', f0: 392, f1: 392, dur: 2.0, gain: 0.03 }], prio: 3, bus: 'ui', vary: 0 },
  legendary_stinger:  { layers: [
                      { osc: 'triangle', f0: 523, f1: 523, dur: 1.0, gain: 0.05 },
                      { osc: 'triangle', f0: 659, f1: 659, dur: 1.0, gain: 0.05, delay: 0.5 },
                      { osc: 'triangle', f0: 784, f1: 784, dur: 1.4, gain: 0.05, delay: 1.0 }], prio: 3, bus: 'ui', vary: 0 },
  mythic_swell:       { layers: [{ osc: 'noise', f0: 300, f1: 6000, dur: 0.9, gain: 0.06, filter: { type: 'bandpass', freq: 1500, q: 0.8 } }], prio: 3, bus: 'ui', vary: 0 },

  // ---- Enemies by archetype (+-10 % pitch per instance) ------------------------
  en_beast_growl:   { layers: [{ osc: 'saw', f0: 110, f1: 80, dur: 0.5, gain: 0.05, filter: { type: 'lowpass', freq: 600, q: 1 } }], prio: 1, bus: 'sfx', vary: 0.1 },
  en_beast_bark:    { layers: [
                    { osc: 'square', f0: 360, f1: 220, dur: 0.08, gain: 0.05 },
                    { osc: 'square', f0: 340, f1: 200, dur: 0.08, gain: 0.05, delay: 0.12 }], prio: 2, bus: 'sfx', vary: 0.1 },
  en_armour_scrape: { layers: [{ osc: 'noise', f0: 3000, f1: 1500, dur: 0.3, gain: 0.04, filter: { type: 'bandpass', freq: 2500, q: 2 } }], prio: 1, bus: 'sfx', vary: 0.1 },
  en_armour_clank:  { layers: [
                    { osc: 'sine', f0: 1800, f1: 1700, dur: 0.12, gain: 0.05 },
                    { osc: 'noise', f0: 3000, f1: 2000, dur: 0.03, gain: 0.04, filter: { type: 'highpass', freq: 2000, q: 1 } }], prio: 2, bus: 'sfx', vary: 0.1 },
  en_squelch:       { layers: [{ osc: 'sine', f0: 260, f1: 90, dur: 0.22, gain: 0.07 }, { osc: 'noise', f0: 900, f1: 300, dur: 0.2, gain: 0.03, filter: { type: 'lowpass', freq: 900, q: 1 } }], prio: 1, bus: 'sfx', vary: 0.1 },
  en_ethereal:      { layers: [
                    { osc: 'sine', f0: 440, f1: 440, dur: 0.9, gain: 0.04 },
                    { osc: 'sine', f0: 554, f1: 554, dur: 0.9, gain: 0.03 },
                    { osc: 'sine', f0: 659, f1: 659, dur: 0.9, gain: 0.03 }], prio: 1, bus: 'sfx', vary: 0.1 },
  en_ethereal_death:{ layers: [
                    { osc: 'sine', f0: 659, f1: 330, dur: 0.9, gain: 0.04 },
                    { osc: 'sine', f0: 554, f1: 277, dur: 0.9, gain: 0.03 }], prio: 2, bus: 'sfx', vary: 0.1 },
  en_golem_grind:   { layers: [{ osc: 'noise', f0: 500, f1: 900, dur: 0.5, gain: 0.06, filter: { type: 'bandpass', freq: 700, q: 2 } }], prio: 1, bus: 'sfx', vary: 0.1 },
  en_golem_thud:    { layers: [
                    { osc: 'sine', f0: 80, f1: 40, dur: 0.3, gain: 0.15 },
                    { osc: 'noise', f0: 800, f1: 200, dur: 0.12, gain: 0.05, filter: { type: 'lowpass', freq: 800, q: 1 } }], prio: 2, bus: 'sfx', vary: 0.1 },

  // ---- Fishing & cooking -------------------------------------------------------
  fish_cast:   { layers: [{ osc: 'noise', f0: 400, f1: 2400, dur: 0.4, gain: 0.04, filter: { type: 'bandpass', freq: 900, q: 1 } }], prio: 1, bus: 'sfx', vary: 0.03 },
  fish_plop:   { layers: [{ osc: 'sine', f0: 500, f1: 180, dur: 0.15, gain: 0.07 }], prio: 1, bus: 'sfx', vary: 0.03 },
  fish_bite:   { layers: [
               { osc: 'square', f0: 1400, f1: 1400, dur: 0.03, gain: 0.04 },
               { osc: 'square', f0: 1400, f1: 1400, dur: 0.03, gain: 0.04, delay: 0.12 }], prio: 2, bus: 'sfx', vary: 0.03 },
  fish_reel:   { layers: [{ osc: 'square', f0: 900, f1: 1400, dur: 0.6, gain: 0.03, filter: { type: 'bandpass', freq: 1200, q: 3 } }], prio: 1, bus: 'sfx', vary: 0.03 },
  fish_snap:   { layers: [
               { osc: 'noise', f0: 4000, f1: 2000, dur: 0.05, gain: 0.08, filter: { type: 'highpass', freq: 2000, q: 1 } },
               { osc: 'sine', f0: 200, f1: 90, dur: 0.1, gain: 0.05 }], prio: 2, bus: 'sfx', vary: 0.03 },
  fish_splash: { layers: [{ osc: 'noise', f0: 3000, f1: 800, dur: 0.35, gain: 0.07, filter: { type: 'bandpass', freq: 1500, q: 0.8 } }], prio: 2, bus: 'sfx', vary: 0.03 },
  cook_sizzle: { layers: [{ osc: 'noise', f0: 5000, f1: 3000, dur: 0.8, gain: 0.03, filter: { type: 'highpass', freq: 3000, q: 0.7 } }], prio: 1, bus: 'sfx', vary: 0.03 },

  // ---- Shrine & portal ---------------------------------------------------------
  shrine:      { layers: [
               { osc: 'triangle', f0: 523, f1: 523, dur: 0.9, gain: 0.04 },
               { osc: 'triangle', f0: 659, f1: 659, dur: 0.9, gain: 0.035 },
               { osc: 'triangle', f0: 784, f1: 784, dur: 0.9, gain: 0.03 },
               { osc: 'noise', f0: 1500, f1: 1200, dur: 0.6, gain: 0.03, delay: 0.2, filter: { type: 'bandpass', freq: 1500, q: 2 } }], prio: 2, bus: 'sfx', vary: 0.03 },
  portal:      { layers: [
               { osc: 'sine', f0: 200, f1: 800, dur: 1.2, gain: 0.08 },
               { osc: 'triangle', f0: 300, f1: 1200, dur: 1.2, gain: 0.04 }], prio: 2, bus: 'sfx', vary: 0.03 },
  portal_swell:{ layers: [
               { osc: 'noise', f0: 400, f1: 4000, dur: 0.6, gain: 0.05, filter: { type: 'bandpass', freq: 1200, q: 1 } },
               { osc: 'sine', f0: 1200, f1: 300, dur: 0.6, gain: 0.04, delay: 0.6 }], prio: 3, bus: 'sfx', vary: 0.03 },

  // ---- Generic gameplay (already used by game.js) ------------------------------
  heal:   { layers: [
          { osc: 'sine', f0: 520, f1: 1040, dur: 0.4, gain: 0.05 },
          { osc: 'sine', f0: 780, f1: 1560, dur: 0.4, gain: 0.03 }], prio: 2, bus: 'sfx', vary: 0.06 },
  shield: { layers: [{ osc: 'triangle', f0: 400, f1: 600, dur: 0.3, gain: 0.06 }], prio: 2, bus: 'sfx', vary: 0.06 },
  blink:  { layers: [{ osc: 'sine', f0: 2000, f1: 400, dur: 0.15, gain: 0.05 }], prio: 2, bus: 'sfx', vary: 0.06 },
  beam:   { layers: [{ osc: 'saw', f0: 200, f1: 1200, dur: 0.5, gain: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },
  veil:   { layers: [
          { osc: 'sine', f0: 300, f1: 150, dur: 0.8, gain: 0.07 },
          { osc: 'sine', f0: 450, f1: 225, dur: 0.8, gain: 0.04 }], prio: 2, bus: 'sfx', vary: 0.06 },
  wave:   { layers: [{ osc: 'triangle', f0: 400, f1: 1600, dur: 0.3, gain: 0.05 }], prio: 2, bus: 'sfx', vary: 0.06 },
  roar:   { layers: [
          { osc: 'saw', f0: 120, f1: 40, dur: 1.0, gain: 0.1 },
          { osc: 'noise', f0: 400, f1: 80, dur: 1.0, gain: 0.08, filter: { type: 'bandpass', freq: 400, q: 1 } }], prio: 3, bus: 'sfx', vary: 0.06 },

  // ---- Boss telegraph cues: one 0.3 s cue per BOSS_MOVES shape (fired at telegraph start) ---
  warn_cone:       { layers: [{ osc: 'noise', f0: 400, f1: 2400, dur: 0.3, gain: 0.08, filter: { type: 'bandpass', freq: 1200, q: 1 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_circle:     { layers: [{ osc: 'sine', f0: 110, f1: 55, dur: 0.3, gain: 0.2 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_line:       { layers: [{ osc: 'sine', f0: 1200, f1: 2000, dur: 0.3, gain: 0.07 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_rain:       { layers: [
                   { osc: 'triangle', f0: 3000, f1: 3000, dur: 0.02, gain: 0.05 },
                   { osc: 'triangle', f0: 3000, f1: 3000, dur: 0.02, gain: 0.05, delay: 0.05 },
                   { osc: 'triangle', f0: 3000, f1: 3000, dur: 0.02, gain: 0.05, delay: 0.1 },
                   { osc: 'triangle', f0: 3000, f1: 3000, dur: 0.02, gain: 0.05, delay: 0.15 },
                   { osc: 'triangle', f0: 3000, f1: 3000, dur: 0.02, gain: 0.05, delay: 0.2 },
                   { osc: 'triangle', f0: 3000, f1: 3000, dur: 0.02, gain: 0.05, delay: 0.25 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_ring:       { layers: [{ osc: 'sine', f0: 50, f1: 90, dur: 0.3, gain: 0.18 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_unblockable:{ layers: [
                   { osc: 'square', f0: 880, f1: 880, dur: 0.15, gain: 0.07 },
                   { osc: 'square', f0: 660, f1: 660, dur: 0.15, gain: 0.07, delay: 0.15 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_charge:     { layers: [{ osc: 'saw', f0: 90, f1: 260, dur: 0.3, gain: 0.07, filter: { type: 'lowpass', freq: 900, q: 1 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_volley:     { layers: [
                   { osc: 'triangle', f0: 1500, f1: 1500, dur: 0.04, gain: 0.05 },
                   { osc: 'triangle', f0: 1500, f1: 1500, dur: 0.04, gain: 0.05, delay: 0.1 },
                   { osc: 'triangle', f0: 1500, f1: 1500, dur: 0.04, gain: 0.05, delay: 0.2 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_beam:       { layers: [{ osc: 'saw', f0: 300, f1: 1500, dur: 0.3, gain: 0.05 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_pull:       { layers: [{ osc: 'sine', f0: 300, f1: 900, dur: 0.3, gain: 0.07, filter: { type: 'highpass', freq: 200, q: 0.7 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_summon:     { layers: [{ osc: 'triangle', f0: 200, f1: 400, dur: 0.3, gain: 0.07 }, { osc: 'triangle', f0: 300, f1: 600, dur: 0.3, gain: 0.05, delay: 0.1 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_zone:       { layers: [{ osc: 'noise', f0: 200, f1: 200, dur: 0.3, gain: 0.07, filter: { type: 'lowpass', freq: 500, q: 1 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_arena:      { layers: [{ osc: 'sine', f0: 120, f1: 60, dur: 0.3, gain: 0.1, filter: { type: 'lowpass', freq: 400, q: 1 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_blink:      { layers: [{ osc: 'sine', f0: 1600, f1: 2400, dur: 0.3, gain: 0.05 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_mirror:     { layers: [{ osc: 'sine', f0: 1046, f1: 1046, dur: 0.3, gain: 0.05, filter: { type: 'bandpass', freq: 1046, q: 4 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_shield:     { layers: [{ osc: 'triangle', f0: 400, f1: 800, dur: 0.3, gain: 0.06 }], prio: 3, bus: 'sfx', vary: 0 },
  warn_vanish:     { layers: [{ osc: 'noise', f0: 3000, f1: 300, dur: 0.3, gain: 0.07, filter: { type: 'bandpass', freq: 1500, q: 1 } }], prio: 3, bus: 'sfx', vary: 0 },
  warn_roar:       { layers: [{ osc: 'saw', f0: 100, f1: 50, dur: 0.3, gain: 0.08 }], prio: 3, bus: 'sfx', vary: 0 },
};

const WARN_SFX = {
  cone: 'warn_cone',
  circle: 'warn_circle',
  line: 'warn_line',
  charge: 'warn_charge',
  volley: 'warn_volley',
  rain: 'warn_rain',
  ring: 'warn_ring',
  beam: 'warn_beam',
  pull: 'warn_pull',
  summon: 'warn_summon',
  zone: 'warn_zone',
  arenaShrink: 'warn_arena',
  blink: 'warn_blink',
  mirror: 'warn_mirror',
  shield: 'warn_shield',
  vanish: 'warn_vanish',
  roar: 'warn_roar',
  unblockable: 'warn_unblockable',
};

const SFX_CAPTIONS = {
  // boss telegraphs
  warn_cone: '[boss wind-up]', warn_circle: '[boss wind-up]', warn_line: '[boss wind-up]',
  warn_charge: '[boss charge]', warn_volley: '[boss wind-up]', warn_rain: '[boss wind-up]',
  warn_ring: '[boss wind-up]', warn_beam: '[boss beam]', warn_pull: '[boss pull]',
  warn_summon: '[summoning]', warn_zone: '[hazard forming]', warn_arena: '[arena shifting]',
  warn_blink: '[boss blink]', warn_mirror: '[mirror images]', warn_shield: '[boss shield]',
  warn_vanish: '[boss vanishes]', warn_roar: '[boss roar]', warn_unblockable: '[unblockable attack]',
  roar: '[roar]', boom: '[explosion]', heavy: '[heavy impact]', twohand_hit: '[heavy impact]',
  twohand_windup: '[charging swing]', twohand_charge: '[charging]',
  // player combat
  swing: '[sword swing]', swing2: '[sword swing]', swing3: '[sword swing]', slash: '[slash]',
  staff: '[staff cast]', bow: '[arrow shot]', dagger: '[dagger]', dagger_thud: '[dagger hit]',
  dash: '[dash]', blink: '[blink]', hit: '[hit]', hurt: '[you are hit]', die: '[defeated]',
  trap: '[trap triggered]', beam: '[beam]', veil: '[veil]', wave: '[wave]', shout: '[shout]',
  shield: '[shield]', heal: '[healed]',
  // damage types
  dmg_slash: '[slash damage]', dmg_pierce: '[pierce damage]', dmg_fire: '[fire damage]',
  dmg_frost: '[frost damage]', dmg_nature: '[nature damage]', dmg_lightning: '[lightning damage]',
  dmg_arcane: '[arcane damage]', dmg_holy: '[holy damage]', dmg_gloom: '[gloom damage]',
  fire: '[fire]', frost: '[frost]', arcane: '[arcane]', zap: '[lightning]',
  // statuses
  st_burn: '[burning]', st_chill: '[chilled]', st_freeze: '[frozen]', st_poison: '[poisoned]',
  st_shock: '[shocked]', st_break: '[stagger break]',
  // reactions
  rx_shatter: '[shatter reaction]', rx_wildfire: '[wildfire reaction]', rx_conduct: '[conduct reaction]',
  rx_overload: '[overload reaction]', rx_purify: '[purify reaction]', rx_rupture: '[rupture reaction]',
  rx_detonate: '[detonate reaction]', codex: '[codex entry]',
  // stingers and loot
  levelup: '[level up]', victory: '[victory]', loot: '[loot]', pickup: '[item picked up]', chest: '[chest opened]',
  drop1: '[item drop]', drop2: '[rare drop]', drop3: '[epic drop]', drop4: '[legendary drop]', drop5: '[mythic drop]',
  legendary_choir: '[legendary drop]', legendary_stinger: '[legendary drop]', mythic_swell: '[mythic drop]',
  // enemies
  en_beast_growl: '[beast growl]', en_beast_bark: '[beast lunge]', en_armour_scrape: '[armoured enemy]',
  en_armour_clank: '[armoured enemy]', en_squelch: '[slime]', en_ethereal: '[spirit]',
  en_ethereal_death: '[spirit fades]', en_golem_grind: '[golem]', en_golem_thud: '[golem stomp]',
  // fishing, shrine, portal
  fish_bite: '[fish bites]', fish_reel: '[reeling in]', fish_snap: '[line snaps]', fish_splash: '[catch]',
  shrine: '[shrine]', portal: '[portal]', portal_swell: '[portal opening]',
};
