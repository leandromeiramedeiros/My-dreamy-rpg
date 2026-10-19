'use strict';
// ---------------------------------------------------------------------------
// music.js — all MUSIC DATA for the game (patches + patterns). No audio code lives here except the tiny pure
// parser at the bottom (MUSIC_UTIL), shared by tools/music-preview.html and the real engine (js/audio.js).
// Classic script, no dependencies; works from file://. Authoritative spec: docs/AUDIO.md.
//
// IDENTITY: "music box in a cathedral" — celesta/music-box leads, soft square pads, sub-sine bass, generous reverb.
//
// ============================== PATTERN NOTATION ==============================
// A layer is { patch, bars:[ 'cell cell cell ...', ... ] }. One string per bar, cells separated by single spaces.
// One cell = one 16th-note STEP:
//     meter '4/4' -> 16 cells per bar   (bpm = quarter notes per minute; step = 60/bpm/4 s)
//     meter '6/8' -> 12 cells per bar   (bpm = DOTTED-quarter beats per minute, 2 beats per bar; step = 60/bpm/6 s)
//   (The single deviation from AUDIO.md's "16-step bar": 16 sixteenths cannot hold six eighths. Engine: stepsPerBar
//    = MUSIC_UTIL.stepsPerBar(meter).)  In 6/8 an eighth = 2 cells, a dotted quarter = 6; lullaby lilt = "quarter + eighth" = 4+2.
//
// MELODIC layers (pad, bass, lead, extra):
//     C4  F#4  Bb3  Eb5      a note name + octave (C4 = middle C, sharps '#', flats 'b') STARTS a note
//     D3+A3+F#4              notes joined with '+' are one chord (no spaces) — all start together
//     -                      SUSTAIN: keeps the note from the cell before sounding one more step (ties may cross bar lines,
//                            but never wrap round the loop point)
//     .                      REST / release: the sounding note is released here; a '.' by itself plays nothing
//   A note's gate = its own cell + the '-' cells after it. A note with no '-' lasts a single step (a pluck/staccato).
//   Example, 6/8 (quarter, eighth, quarter, eighth):  "F#4 - - - A4 - D5 - - - E5 -"
//   Noise patches (windBed, ...) ignore pitch except to track the filter (filter.track); the note only gates them.
//
// PERCUSSION layers (perc): each cell is a hit or a rest:
//     x  X     hit of the layer's 'patch'  (lowercase = soft, velocity 0.55; UPPERCASE = accent, velocity 1.0)
//     o  O     hit of the layer's 'alt' patch (same velocity rule)    [usually x = high/dry, o = low/drum]
//     C2 C6    (optional) a note name = a pitched hit of 'patch' (osc patches play at that pitch)
//     .        rest        -  ignored
//
// SONG FIELDS
//   kind:'song'|'motif'|'stinger'   title   bpm   key:'D'   mode:'ionian'...   meter   bars (loop length)
//   loop:false for one-shots        mix:{layer:0..1} default layer levels       intensity:{state:{layer:level}} combat etc.
//   harmony:'D | Bm | ...'          human-readable chord per bar ('G A' = two chords in one bar), documentation only
//   layers:{ pad, bass, lead, perc, extra }  each { patch, bars:[...], alt?, transpose? (semitones) }
//   Every layer's bars.length divides song.bars (it loops); a layer may be absent.
//   Stingers/motifs are written in D (key:'D'); the engine transposes by MUSIC_UTIL.keyOffset(song.key, currentKey).
//   Boss songs also have stems:{A:[layers],...}, phases:['A','AB','ABC','ABCD'] and signature:{steps:[...]} (1-bar rhythm).
//
// PATCH FIELDS  { osc:'sine|triangle|square|saw|noise', detune (cents, unison spread +-), unison (voices; the 2nd+ voices
//   start 3 ms late = the chorus twin), adsr:[a,d,s,r] seconds & s=0..1 level, filter:{type:'lowpass|highpass|bandpass',
//   freq, q, env (Hz added at note start, decaying to 0 over a+d), track (0..1, cutoff follows pitch)},
//   send:{delay,reverb} 0..1, gain, vibrato:{rate,depth(cents),delay}, freq/sweep (percussion & drips: start Hz -> end Hz) }
// ---------------------------------------------------------------------------

const MUSIC_PATCHES = {
  // ---- leads / keys
  musicBox:  { osc:'triangle', detune:5, unison:2, adsr:[0.002, 0.45, 0.0, 0.8], filter:{ type:'lowpass', freq:4200, q:0.4, env:3000 }, send:{ delay:0.28, reverb:0.5 }, gain:0.4 },
  celesta:   { osc:'sine',     detune:4, unison:2, adsr:[0.001, 0.3, 0.0, 0.6],  filter:{ type:'lowpass', freq:7000, q:0.3, env:0 },    send:{ delay:0.3,  reverb:0.55 }, gain:0.25 },
  glassPing: { osc:'sine',     detune:6, unison:2, adsr:[0.001, 0.55, 0.0, 1.0], filter:{ type:'lowpass', freq:9000, q:0.3, env:0 },    send:{ delay:0.4,  reverb:0.6 }, gain:0.3 },
  pipTri:    { osc:'triangle', detune:0, unison:1, adsr:[0.002, 0.07, 0.0, 0.05], filter:{ type:'lowpass', freq:5200, q:0.5, env:0 },   send:{ delay:0.22, reverb:0.3 }, gain:0.3 },
  deathBox:  { osc:'triangle', detune:4, unison:2, adsr:[0.003, 1.0, 0.1, 2.4],  filter:{ type:'lowpass', freq:3000, q:0.4, env:1500 }, send:{ delay:0.35, reverb:0.9 }, gain:0.4 },
  drop:      { osc:'sine',     detune:0, unison:1, adsr:[0.001, 0.25, 0.0, 0.6], filter:{ type:'lowpass', freq:8000, q:0.3, env:0 },    send:{ delay:0.6,  reverb:0.6 }, gain:0.2 },
  pluckLead: { osc:'square',   detune:6, unison:2, adsr:[0.003, 0.14, 0.12, 0.12], filter:{ type:'lowpass', freq:3000, q:1.0, env:2500 }, send:{ delay:0.25, reverb:0.3 }, gain:0.2 },
  flute:     { osc:'sine',     detune:0, unison:1, adsr:[0.08, 0.1, 0.85, 0.25], filter:{ type:'lowpass', freq:3500, q:0.5, env:0 },    send:{ delay:0.3, reverb:0.45 }, gain:0.1, vibrato:{ rate:5.2, depth:14, delay:0.25 } },
  morrowVoice:{ osc:'sine',    detune:5, unison:2, adsr:[0.12, 0.4, 0.7, 0.9],   filter:{ type:'lowpass', freq:900, q:0.6, env:300 },   send:{ delay:0.15, reverb:0.6 }, gain:0.15, vibrato:{ rate:4.6, depth:10, delay:0.4 } },
  brassLead: { osc:'saw',      detune:8, unison:2, adsr:[0.005, 0.15, 0.5, 0.12], filter:{ type:'lowpass', freq:1800, q:2.0, env:2500 }, send:{ delay:0.2, reverb:0.3 }, gain:0.2 },
  brassSting:{ osc:'saw',      detune:10, unison:2, adsr:[0.01, 0.2, 0.5, 0.4],  filter:{ type:'lowpass', freq:1600, q:1.5, env:2000 }, send:{ delay:0.15, reverb:0.4 }, gain:0.12 },
  // ---- pads
  softPad:   { osc:'square',   detune:9, unison:2, adsr:[0.7, 0.5, 0.7, 1.4],    filter:{ type:'lowpass', freq:1100, q:0.8, env:700 },  send:{ delay:0.1, reverb:0.55 }, gain:0.03 },
  darkPad:   { osc:'square',   detune:7, unison:2, adsr:[0.9, 0.6, 0.7, 1.6],    filter:{ type:'lowpass', freq:520, q:0.7, env:250 },   send:{ delay:0.05, reverb:0.6 }, gain:0.035 },
  dungeonPad:{ osc:'square',   detune:12, unison:2, adsr:[1.2, 0.8, 0.7, 2.0],   filter:{ type:'lowpass', freq:380, q:0.9, env:150 },   send:{ delay:0.1, reverb:0.8 }, gain:0.035 },
  bossPad:   { osc:'saw',      detune:10, unison:3, adsr:[0.6, 0.5, 0.7, 1.2],   filter:{ type:'lowpass', freq:700, q:1.0, env:500 },   send:{ delay:0.1, reverb:0.5 }, gain:0.04 },
  swellPad:  { osc:'saw',      detune:10, unison:3, adsr:[0.6, 0.4, 0.8, 1.4],   filter:{ type:'lowpass', freq:1600, q:0.8, env:800 },  send:{ delay:0.1, reverb:0.6 }, gain:0.05 },
  choir:     { osc:'saw',      detune:14, unison:3, adsr:[0.9, 0.6, 0.75, 1.6],  filter:{ type:'lowpass', freq:1400, q:1.5, env:0 },    send:{ delay:0.15, reverb:0.85 }, gain:0.06, vibrato:{ rate:4.8, depth:8, delay:0.5 } },
  // ---- bass
  lullBass:  { osc:'triangle', detune:0, unison:1, adsr:[0.01, 0.3, 0.6, 0.3],   filter:{ type:'lowpass', freq:500, q:0.5, env:0 },     send:{ delay:0, reverb:0.15 }, gain:0.15 },
  subBass:   { osc:'sine',     detune:0, unison:1, adsr:[0.01, 0.25, 0.7, 0.25],  filter:{ type:'lowpass', freq:400, q:0.4, env:0 },     send:{ delay:0, reverb:0.1 }, gain:0.22 },
  pluckBass: { osc:'square',   detune:0, unison:1, adsr:[0.003, 0.14, 0.2, 0.08], filter:{ type:'lowpass', freq:700, q:1.0, env:900 },   send:{ delay:0, reverb:0.1 }, gain:0.12 },
  sawBass:   { osc:'saw',      detune:0, unison:1, adsr:[0.004, 0.2, 0.5, 0.1],   filter:{ type:'lowpass', freq:380, q:2.0, env:700 },   send:{ delay:0, reverb:0.1 }, gain:0.15 },
  // ---- beds / drones
  windBed:   { osc:'noise',    detune:0, unison:1, adsr:[1.8, 1.0, 0.8, 2.5],    filter:{ type:'bandpass', freq:600, q:0.6, env:300, track:0.5 }, send:{ delay:0, reverb:0.5 }, gain:0.12 },
  drone:     { osc:'saw',      detune:6, unison:2, adsr:[1.8, 1.0, 0.8, 2.5],    filter:{ type:'lowpass', freq:220, q:1.0, env:0 },     send:{ delay:0, reverb:0.6 }, gain:0.09 },
  // ---- percussion (freq -> sweep = pitch glide in Hz; noise = filtered noise burst)
  woodblock: { osc:'triangle', freq:880, sweep:700, unison:1, adsr:[0.001, 0.05, 0.0, 0.04], filter:{ type:'bandpass', freq:1100, q:4, env:0 }, send:{ delay:0.15, reverb:0.25 }, gain:0.35 },
  tom:       { osc:'sine',     freq:150, sweep:60,  unison:1, adsr:[0.002, 0.18, 0.0, 0.1],  filter:{ type:'lowpass', freq:600, q:0.5, env:0 },  send:{ delay:0, reverb:0.3 }, gain:0.5 },
  softThump: { osc:'sine',     freq:90,  sweep:55,  unison:1, adsr:[0.002, 0.15, 0.0, 0.1],  filter:{ type:'lowpass', freq:400, q:0.5, env:0 },  send:{ delay:0, reverb:0.2 }, gain:0.3 },
  shaker:    { osc:'noise',    unison:1, adsr:[0.005, 0.05, 0.0, 0.04], filter:{ type:'highpass', freq:5500, q:0.6, env:0 }, send:{ delay:0.1, reverb:0.2 }, gain:0.1 },
  drip:      { osc:'sine',     freq:1800, sweep:900, unison:1, adsr:[0.001, 0.07, 0.0, 0.12], filter:{ type:'lowpass', freq:6000, q:0.3, env:0 }, send:{ delay:0.55, reverb:0.8 }, gain:0.14 },
  deepTom:   { osc:'sine',     freq:110, sweep:45,  unison:1, adsr:[0.002, 0.25, 0.0, 0.15], filter:{ type:'lowpass', freq:350, q:0.5, env:0 },  send:{ delay:0, reverb:0.5 }, gain:0.45 },
  bossKick:  { osc:'sine',     freq:120, sweep:42,  unison:1, adsr:[0.001, 0.22, 0.0, 0.1],  filter:{ type:'lowpass', freq:500, q:0.5, env:0 },  send:{ delay:0, reverb:0.2 }, gain:0.35 },
  bossWood:  { osc:'triangle', freq:700, sweep:500, unison:1, adsr:[0.001, 0.06, 0.0, 0.05], filter:{ type:'bandpass', freq:900, q:3, env:0 }, send:{ delay:0.1, reverb:0.3 }, gain:0.32 },
  cymbal:    { osc:'noise',    unison:1, adsr:[0.01, 0.9, 0.0, 0.6],   filter:{ type:'highpass', freq:6000, q:0.5, env:0 }, send:{ delay:0, reverb:0.5 }, gain:0.12 },
};

const MUSIC = {};

// ----------------------------------------------------------------------------
// AERIN'S LULLABY — the seed motif (D Ionian, 6/8, 72). Notes: F#4 A4 D5 E5 | C#5 B4 A4 F#5. Last interval = rising major 6th (A4->F#5).
// Morrow (below) plays the same 8 notes in D Aeolian at half speed, last interval inverted (falls a 6th).
MUSIC.lullaby = {
  kind:'motif', title:"Aerin's Lullaby", key:'D', mode:'ionian', meter:'6/8', bpm:72, bars:8,
  harmony: 'D | Bm | A | G A | D | Bm | G A | D',
  layers: {
    pad: { patch:'softPad', bars: [
        'D3+A3+F#4 - - - - - - - - - - -',  // 1
        'B2+F#3+D4 - - - - - - - - - - -',  // 2
        'A2+E3+C#4 - - - - - - - - - - -',  // 3
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 4
        'D3+A3+F#4 - - - - - - - - - - -',  // 5
        'B2+F#3+D4 - - - - - - - - - - -',  // 6
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 7
        'D3+A3+F#4 - - - - - - - - - - -',  // 8
      ] },
    bass: { patch:'lullBass', bars: [
        'D2 - - . A2 . D2 - - . A2 .',  // 1
        'B1 - - . F#2 . B1 - - . F#2 .',  // 2
        'A1 - - . E2 . A1 - - . E2 .',  // 3
        'G2 - - . D3 . A1 - - . E2 .',  // 4
        'D2 - - . A2 . D2 - - . A2 .',  // 5
        'B1 - - . F#2 . B1 - - . F#2 .',  // 6
        'G2 - - . D3 . A1 - - . E2 .',  // 7
        'D2 - - . A2 . D2 - - . A2 .',  // 8
      ] },
    lead: { patch:'musicBox', bars: [
        'F#4 - - - A4 - D5 - - - E5 -',  // 1
        'C#5 - - - B4 - A4 - - - F#5 -',  // 2
        'E5 - - - D5 - C#5 - - - B4 -',  // 3
        'A4 - - - - - - - . . . .',  // 4
        'F#4 - - - A4 - D5 - - - E5 -',  // 5
        'C#5 - - - B4 - A4 - - - F#5 -',  // 6
        'G5 - - - F#5 - E5 - - - C#5 -',  // 7
        'D5 - - - - - - - - - - -',  // 8
      ] },
  },
};

// ----------------------------------------------------------------------------
// PIP'S TAG — the lullaby's first 4 notes (F#4 A4 D5 E5) at double speed, staccato triangle, then a playful upward turn to A5 and a D6 wink.
MUSIC.pip_tag = {
  kind:'motif', title:"Pip's Tag", key:'D', mode:'ionian', meter:'6/8', bpm:72, bars:2,
  harmony: 'D | D',
  layers: {
    bass: { patch:'pluckBass', bars: [
        'D3 . . . . . A2 . . . . .',  // 1
        'D3 . . . . . A2 . . . . .',  // 2
      ] },
    lead: { patch:'pipTri', bars: [
        'F#4 A4 D5 E5 . . D5 E5 F#5 G5 A5 .',  // 1
        'A5 . F#5 . D6 . . . . . . .',  // 2
      ] },
  },
};

// ----------------------------------------------------------------------------
// MORROW'S THEME — the lullaby (F A D E | C Bb A) in D Aeolian at HALF speed in the bass register; the last interval is inverted:
// A3 -> C3 FALLS a major 6th (the lullaby leaps UP A4 -> F#5). Then the bass sinks Bb - A - D.
MUSIC.morrow = {
  kind:'motif', title:"Morrow's Theme", key:'D', mode:'aeolian', meter:'6/8', bpm:72, bars:8,
  harmony: 'Dm | Am | F Bb | Dm | F | Gm | A | Dm',
  layers: {
    pad: { patch:'darkPad', bars: [
        'D3+A3+F4 - - - - - - - - - - -',  // 1
        'A2+E3+C4 - - - - - - - - - - -',  // 2
        'F3+C4+A4 - - - - - Bb2+F3+D4 - - - - -',  // 3
        'D3+A3+F4 - - - - - - - - - - -',  // 4
        'F3+C4+A4 - - - - - - - - - - -',  // 5
        'G2+D3+Bb3 - - - - - - - - - - -',  // 6
        'A2+E3+C#4 - - - - - - - - - - -',  // 7
        'D3+A3+F4 - - - - - - - - - - -',  // 8
      ] },
    bass: { patch:'subBass', bars: [
        'D2 - - - - - - - - - - .',  // 1
        'A1 - - - - - - - - - - .',  // 2
        'F2 - - - - - - . Bb1 - - .',  // 3
        'D2 - - - - - - - - - - .',  // 4
        'F2 - - - - - - - - - - .',  // 5
        'G2 - - - - - - - - - - .',  // 6
        'A1 - - - - - - - - - - .',  // 7
        'D2 - - - - - - - - - - .',  // 8
      ] },
    lead: { patch:'morrowVoice', bars: [
        'F3 - - - A3 - - - D4 - - -',  // 1
        'E4 - - - - - - - - - - -',  // 2
        'C4 - - - - - - - Bb3 - - -',  // 3
        'A3 - - - - - - - - - - -',  // 4
        'C3 - - - - - - - - - - -',  // 5
        'Bb2 - - - - - - - - - - -',  // 6
        'A2 - - - - - - - - - - -',  // 7
        'D3 - - - - - - - - - - -',  // 8
      ] },
  },
};

// ----------------------------------------------------------------------------
// TITLE — 16 bars. Bars 1-8: the lullaby alone over a pad, then the music-box arpeggio joins at bar 5 and the whole tune lifts an octave for bars 9-16.
MUSIC.title = {
  kind:'song', title:'Title', key:'D', mode:'ionian', meter:'6/8', bpm:72, bars:16,
  harmony: 'D | Bm | A | G A | D | Bm | G A | D | D | Bm | A | G A | D | Bm | G A | D',
  mix: {pad:1, bass:1, lead:1, perc:1, extra:1},
  layers: {
    pad: { patch:'softPad', bars: [
        'D3+A3+F#4 - - - - - - - - - - -',  // 1
        'B2+F#3+D4 - - - - - - - - - - -',  // 2
        'A2+E3+C#4 - - - - - - - - - - -',  // 3
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 4
        'D3+A3+F#4 - - - - - - - - - - -',  // 5
        'B2+F#3+D4 - - - - - - - - - - -',  // 6
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 7
        'D3+A3+F#4 - - - - - - - - - - -',  // 8
        'D3+A3+F#4 - - - - - - - - - - -',  // 9
        'B2+F#3+D4 - - - - - - - - - - -',  // 10
        'A2+E3+C#4 - - - - - - - - - - -',  // 11
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 12
        'D3+A3+F#4 - - - - - - - - - - -',  // 13
        'B2+F#3+D4 - - - - - - - - - - -',  // 14
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 15
        'D3+A3+F#4 - - - - - - - - - - -',  // 16
      ] },
    bass: { patch:'lullBass', bars: [
        'D2 - - . A2 . D2 - - . A2 .',  // 1
        'B1 - - . F#2 . B1 - - . F#2 .',  // 2
        'A1 - - . E2 . A1 - - . E2 .',  // 3
        'G2 - - . D3 . A1 - - . E2 .',  // 4
        'D2 - - . A2 . D2 - - . A2 .',  // 5
        'B1 - - . F#2 . B1 - - . F#2 .',  // 6
        'G2 - - . D3 . A1 - - . E2 .',  // 7
        'D2 - - . A2 . D2 - - . A2 .',  // 8
        'D2 - - . A2 . D2 - - . A2 .',  // 9
        'B1 - - . F#2 . B1 - - . F#2 .',  // 10
        'A1 - - . E2 . A1 - - . E2 .',  // 11
        'G2 - - . D3 . A1 - - . E2 .',  // 12
        'D2 - - . A2 . D2 - - . A2 .',  // 13
        'B1 - - . F#2 . B1 - - . F#2 .',  // 14
        'G2 - - . D3 . A1 - - . E2 .',  // 15
        'D2 - - . A2 . D2 - - . A2 .',  // 16
      ] },
    lead: { patch:'musicBox', bars: MUSIC.lullaby.layers.lead.bars.concat([
      'F#5 - - - A5 - D6 - - - E6 -',  // 1
      'C#6 - - - B5 - A5 - - - F#6 -',  // 2
      'E6 - - - D6 - C#6 - - - B5 -',  // 3
      'A5 - - - - - - - . . . .',  // 4
      'F#5 - - - A5 - D6 - - - E6 -',  // 5
      'C#6 - - - B5 - A5 - - - F#6 -',  // 6
      'B5 - - - A5 - F#5 - - - E5 -',  // 7
      'D5 - - - - - - - - - - -',  // 8
    ]) },
    perc: { patch:'shaker', alt:'softThump', bars: [
        '. . . . . . . . . . . .',  // 1
        '. . . . . . . . . . . .',  // 2
        '. . . . . . . . . . . .',  // 3
        '. . . . . . . . . . . .',  // 4
        '. . . . . . . . . . . .',  // 5
        '. . . . . . . . . . . .',  // 6
        '. . . . . . . . . . . .',  // 7
        '. . . . . . . . . . . .',  // 8
        'x . . . . . x . . . . .',  // 9
        'x . . . . . x . . . . .',  // 10
        'x . . . . . x . . . . .',  // 11
        'x . . . . . x . . . . .',  // 12
        'x . . . . . x . . . . .',  // 13
        'x . . . . . x . . . . .',  // 14
        'x . . . . . x . . . . .',  // 15
        'x . . . . . x . . . . .',  // 16
      ] },
    extra: { patch:'celesta', bars: [
        '. . . . . . . . . . . .',  // 1
        '. . . . . . . . . . . .',  // 2
        '. . . . . . . . . . . .',  // 3
        '. . . . . . . . . . . .',  // 4
        'D3 - A3 - D4 - F#4 - D4 - A3 -',  // 5
        'B2 - F#3 - B3 - D4 - B3 - F#3 -',  // 6
        'G2 - D3 - G3 - A2 - E3 - A3 -',  // 7
        'D3 - A3 - D4 - F#4 - D4 - A3 -',  // 8
        'D3 - A3 - D4 - F#4 - D4 - A3 -',  // 9
        'B2 - F#3 - B3 - D4 - B3 - F#3 -',  // 10
        'A2 - E3 - A3 - C#4 - A3 - E3 -',  // 11
        'G2 - D3 - G3 - A2 - E3 - A3 -',  // 12
        'D3 - A3 - D4 - F#4 - D4 - A3 -',  // 13
        'B2 - F#3 - B3 - D4 - B3 - F#3 -',  // 14
        'G2 - D3 - G3 - A2 - E3 - A3 -',  // 15
        'D3 - A3 - D4 - F#4 - D4 - A3 -',  // 16
      ] },
  },
};

// ----------------------------------------------------------------------------
// VALE — 16 bars of safe, open 6/8. New tune in the lullaby's lilt; bars 9-10 quote the seed (F#4 A4 D5 E5 | C#5 B4 A4 F#5) in the middle of the song.
MUSIC.vale = {
  kind:'song', title:'Whispering Vale', key:'D', mode:'ionian', meter:'6/8', bpm:72, bars:16,
  harmony: 'D | A | Bm | F#m | G | D | G | A | D | Bm | G | D | Em | A | G A | D',
  mix: {pad:1, bass:0.9, lead:1, perc:0.8, extra:1},
  layers: {
    pad: { patch:'softPad', bars: [
        'D3+A3+F#4 - - - - - - - - - - -',  // 1
        'A2+E3+C#4 - - - - - - - - - - -',  // 2
        'B2+F#3+D4 - - - - - - - - - - -',  // 3
        'F#3+C#4+A4 - - - - - - - - - - -',  // 4
        'G2+D3+B3 - - - - - - - - - - -',  // 5
        'D3+A3+F#4 - - - - - - - - - - -',  // 6
        'G2+D3+B3 - - - - - - - - - - -',  // 7
        'A2+E3+C#4 - - - - - - - - - - -',  // 8
        'D3+A3+F#4 - - - - - - - - - - -',  // 9
        'B2+F#3+D4 - - - - - - - - - - -',  // 10
        'G2+D3+B3 - - - - - - - - - - -',  // 11
        'D3+A3+F#4 - - - - - - - - - - -',  // 12
        'E3+B3+G4 - - - - - - - - - - -',  // 13
        'A2+E3+C#4 - - - - - - - - - - -',  // 14
        'G2+D3+B3 - - - - - A2+E3+C#4 - - - - -',  // 15
        'D3+A3+F#4 - - - - - - - - - - -',  // 16
      ] },
    bass: { patch:'lullBass', bars: [
        'D2 - - . A2 . D2 - - . A2 .',  // 1
        'A1 - - . E2 . A1 - - . E2 .',  // 2
        'B1 - - . F#2 . B1 - - . F#2 .',  // 3
        'F#2 - - . C#3 . F#2 - - . C#3 .',  // 4
        'G2 - - . D3 . G2 - - . D3 .',  // 5
        'D2 - - . A2 . D2 - - . A2 .',  // 6
        'G2 - - . D3 . G2 - - . D3 .',  // 7
        'A1 - - . E2 . A1 - - . E2 .',  // 8
        'D2 - - . A2 . D2 - - . A2 .',  // 9
        'B1 - - . F#2 . B1 - - . F#2 .',  // 10
        'G2 - - . D3 . G2 - - . D3 .',  // 11
        'D2 - - . A2 . D2 - - . A2 .',  // 12
        'E2 - - . B2 . E2 - - . B2 .',  // 13
        'A1 - - . E2 . A1 - - . E2 .',  // 14
        'G2 - - . D3 . A1 - - . E2 .',  // 15
        'D2 - - . A2 . D2 - - . A2 .',  // 16
      ] },
    lead: { patch:'musicBox', bars: [
        'A4 - - - F#4 - A4 - - - D5 -',  // 1
        'C#5 - - - A4 - E5 - - - - -',  // 2
        'D5 - - - B4 - F#5 - - - E5 -',  // 3
        'C#5 - - - A4 - C#5 - - - - -',  // 4
        'B4 - - - D5 - G5 - - - F#5 -',  // 5
        'A5 - - - - - F#5 - - - D5 -',  // 6
        'G5 - - - F#5 - E5 - - - D5 -',  // 7
        'E5 - - - C#5 - A4 - - - - -',  // 8
        'F#4 - - - A4 - D5 - - - E5 -',  // 9
        'C#5 - - - B4 - A4 - - - F#5 -',  // 10
        'G5 - - - F#5 - D5 - - - - -',  // 11
        'D5 - - - E5 - F#5 - - - - -',  // 12
        'G5 - - - E5 - B4 - - - - -',  // 13
        'C#5 - - - E5 - A5 - - - - -',  // 14
        'G5 - - - D5 - E5 - - - C#5 -',  // 15
        'D5 - - - - - - - . . . .',  // 16
      ] },
    perc: { patch:'shaker', alt:'softThump', bars: [
        'o . . . . . x . . . . .',  // 1
        'o . . . . . x . . . x .',  // 2
      ] },
    extra: { patch:'windBed', bars: [
        'D4 - - - - - - - - - - -',  // 1
        '- - - - - - - - - - - -',  // 2
        '- - - - - - - - - - - -',  // 3
        '- - - - - - - - - - - -',  // 4
        'A3 - - - - - - - - - - -',  // 5
        '- - - - - - - - - - - -',  // 6
        '- - - - - - - - - - - -',  // 7
        '- - - - - - - - - - - -',  // 8
        'F#4 - - - - - - - - - - -',  // 9
        '- - - - - - - - - - - -',  // 10
        '- - - - - - - - - - - -',  // 11
        '- - - - - - - - - - - -',  // 12
        'E4 - - - - - - - - - - -',  // 13
        '- - - - - - - - - - - -',  // 14
        '- - - - - - - - - - - -',  // 15
        '- - - - - - - - - - - -',  // 16
      ] },
  },
};

// ----------------------------------------------------------------------------
// PINEWOOD — morning adventure (G Mixolydian, 96). Plucked-square lead with the dotted bounce; flute counter-line; wood-block + tom.
// Bars 13-14 hide the lullaby seed in G: B4 D5 G5 A5 | F5 E5 D5 B5 (the leap up a 6th, D5->B5).
MUSIC.pinewood = {
  kind:'song', title:'Misty Pinewood', key:'G', mode:'mixolydian', meter:'4/4', bpm:96, bars:16,
  harmony: 'G | F | C | G | G | F | C | Dm | Em | C | G | F | Em | C | F | Dm',
  mix: {pad:1, bass:1, lead:1, perc:0.5, extra:0.6},
  intensity: {calm:{pad:1, bass:1, lead:1, perc:0.5, extra:0.6}, combat:{pad:1, bass:1, lead:0.7, perc:1, extra:1}},
  layers: {
    pad: { patch:'softPad', bars: [
        'G2+D3+B3 - - - - - - - - - - - - - - -',  // 1
        'F3+C4+A4 - - - - - - - - - - - - - - -',  // 2
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 3
        'G2+D3+B3 - - - - - - - - - - - - - - -',  // 4
        'G2+D3+B3 - - - - - - - - - - - - - - -',  // 5
        'F3+C4+A4 - - - - - - - - - - - - - - -',  // 6
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 7
        'D3+A3+F4 - - - - - - - - - - - - - - -',  // 8
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 9
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 10
        'G2+D3+B3 - - - - - - - - - - - - - - -',  // 11
        'F3+C4+A4 - - - - - - - - - - - - - - -',  // 12
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 13
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 14
        'F3+C4+A4 - - - - - - - - - - - - - - -',  // 15
        'D3+A3+F4 - - - - - - - - - - - - - - -',  // 16
      ] },
    bass: { patch:'pluckBass', bars: [
        'G2 - - . G2 . D3 . G2 - - . G2 . D3 .',  // 1
        'F2 - - . F2 . C3 . F2 - - . F2 . C3 .',  // 2
        'C2 - - . C2 . G2 . C2 - - . C2 . G2 .',  // 3
        'G2 - - . G2 . D3 . G2 - - . G2 . D3 .',  // 4
        'G2 - - . G2 . D3 . G2 - - . G2 . D3 .',  // 5
        'F2 - - . F2 . C3 . F2 - - . F2 . C3 .',  // 6
        'C2 - - . C2 . G2 . C2 - - . C2 . G2 .',  // 7
        'D2 - - . D2 . A2 . D2 - - . D2 . A2 .',  // 8
        'E2 - - . E2 . B2 . E2 - - . E2 . B2 .',  // 9
        'C2 - - . C2 . G2 . C2 - - . C2 . G2 .',  // 10
        'G2 - - . G2 . D3 . G2 - - . G2 . D3 .',  // 11
        'F2 - - . F2 . C3 . F2 - - . F2 . C3 .',  // 12
        'E2 - - . E2 . B2 . E2 - - . E2 . B2 .',  // 13
        'C2 - - . C2 . G2 . C2 - - . C2 . G2 .',  // 14
        'F2 - - . F2 . C3 . F2 - - . F2 . C3 .',  // 15
        'D2 - - . D2 . A2 . D2 - - . D2 . A2 .',  // 16
      ] },
    lead: { patch:'pluckLead', bars: [
        'G4 - - B4 D5 - - - B4 - G4 - D5 - B4 -',  // 1
        'A4 - - C5 F5 - - - E5 - C5 - A4 - - -',  // 2
        'G4 - - C5 E5 - - - D5 - C5 - E5 - G5 -',  // 3
        'D5 - - - - - B4 - G4 - - - . . . .',  // 4
        'G4 - - B4 D5 - - - G5 - - - F5 - D5 -',  // 5
        'A4 - C5 - F5 - - - A5 - - - G5 - F5 -',  // 6
        'E5 - - - G5 - - - C6 - - - B5 - G5 -',  // 7
        'A5 - - F5 D5 - - - A4 - - - . . . .',  // 8
        'E5 - - G5 B5 - - - A5 - G5 - E5 - - -',  // 9
        'G5 - - E5 C5 - - - E5 - G5 - C6 - - -',  // 10
        'D5 - - B4 G4 - - - B4 - D5 - G5 - - -',  // 11
        'A5 - - - G5 - F5 - C5 - - - A4 - - -',  // 12
        'B4 - D5 - G5 - A5 - - - - - . . . .',  // 13
        'F5 - - - E5 - D5 - - - - - B5 - - -',  // 14
        'A5 - - F5 C5 - - - F5 - - - A5 - - -',  // 15
        'D5 - F5 - A5 - - - G5 - F5 - E5 - D5 -',  // 16
      ] },
    perc: { patch:'bossWood', alt:'tom', bars: [
        'O . . x . . x . o . . x . . x .',  // 1
        'O . . x . . x . o . . x . . x .',  // 2
        'O . . x . . x . o . . x . . x .',  // 3
        'O . . x . . x . o . . x . X x .',  // 4
      ] },
    extra: { patch:'flute', bars: [
        'D5 - - - - - - - - - - - - - - -',  // 1
        'C5 - - - - - - - - - - - - - - -',  // 2
        'E5 - - - - - - - - - - - - - - -',  // 3
        'D5 - - - - - - - - - - - - - - -',  // 4
        'B4 - - - - - - - - - - - - - - -',  // 5
        'C5 - - - - - - - - - - - - - - -',  // 6
        'E5 - - - - - - - - - - - - - - -',  // 7
        'F5 - - - - - - - - - - - - - - -',  // 8
        'E5 - - - - - - - - - - - - - - -',  // 9
        'G5 - - - - - - - - - - - - - - -',  // 10
        'D5 - - - - - - - - - - - - - - -',  // 11
        'C5 - - - - - - - - - - - - - - -',  // 12
        'B4 - - - - - - - - - - - - - - -',  // 13
        'C5 - - - - - - - - - - - - - - -',  // 14
        'A4 - - - - - - - - - - - - - - -',  // 15
        'F4 - - - - - - - - - - - - - - -',  // 16
      ] },
  },
};

// ----------------------------------------------------------------------------
// ROOT HOLLOW — the Pinewood patterns re-used verbatim (same arrays by reference), darker patch set, pad & lead an octave down,
// lead masked out (mix.lead = 0; combat brings it back at 0.5), `extra` = low drone, `perc` = drips + deep tom.
MUSIC.roothollow = {
  kind:'song', title:'Root Hollow', key:'G', mode:'mixolydian', meter:'4/4', bpm:96, bars:16,
  harmony: 'G | F | C | G | G | F | C | Dm | Em | C | G | F | Em | C | F | Dm',
  mix: {pad:1, bass:1, lead:0, perc:0.45, extra:1},
  intensity: {calm:{pad:1, bass:1, lead:0, perc:0.45, extra:1}, combat:{pad:1, bass:1, lead:0.5, perc:1, extra:1}},
  layers: {
    pad: { patch:'dungeonPad', transpose:-12, bars: MUSIC.pinewood.layers.pad.bars },
    bass: { patch:'subBass', bars: MUSIC.pinewood.layers.bass.bars },
    lead: { patch:'pluckLead', transpose:-12, bars: MUSIC.pinewood.layers.lead.bars },
    perc: { patch:'drip', alt:'deepTom', bars: MUSIC.pinewood.layers.perc.bars },
    extra: { patch:'drone', bars: [
        'G1 - - - - - - - - - - - - - - -',  // 1
        '- - - - - - - - - - - - - - - -',  // 2
        '- - - - - - - - - - - - - - - -',  // 3
        '- - - - - - - - - - - - - - - -',  // 4
        '- - - - - - - - - - - - - - - -',  // 5
        '- - - - - - - - - - - - - - - -',  // 6
        '- - - - - - - - - - - - - - - -',  // 7
        '- - - - - - - - - - - - - - - -',  // 8
        '- - - - - - - - - - - - - - - -',  // 9
        '- - - - - - - - - - - - - - - -',  // 10
        '- - - - - - - - - - - - - - - -',  // 11
        '- - - - - - - - - - - - - - - -',  // 12
        '- - - - - - - - - - - - - - - -',  // 13
        '- - - - - - - - - - - - - - - -',  // 14
        '- - - - - - - - - - - - - - - -',  // 15
        '- - - - - - - - - - - - - - - -',  // 16
      ] },
  },
};

// ----------------------------------------------------------------------------
// BOSS: OLD BRAMBLEHORN (E Aeolian, 104). Four vertical stems that run in sync: A pad+bass (phase 1), B percussion (first aggro),
// C lead/counter-melody (phase 2), D choir + Morrow fragment (phase 3 / enrage). Signature rhythm = stomp-stomp-grab: hits on steps 0,3,6,10,12 (bass + kick).
// Stem D bars 1-4 / 9-12: Morrow's theme in E Aeolian (G B E F# | D C B), doubled in octaves, last interval B->D falls a major 6th.
MUSIC.boss_bramblehorn = {
  kind:'song', title:'Old Bramblehorn', key:'E', mode:'aeolian', meter:'4/4', bpm:104, bars:16,
  harmony: 'Em | Em | C | D | Em | Em | C | B5 | Am | Am | C | D | Em | C | D | B5',
  mix: {pad:1, bass:1, lead:1, perc:1, extra:1},
  stems: {'A':['pad', 'bass'], 'B':['perc'], 'C':['lead'], 'D':['extra']}, phases: ['A','AB','ABC','ABCD'],
  signature: {'steps': [0, 3, 6, 10, 12]},
  layers: {
    pad: { patch:'bossPad', bars: [
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 1
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 2
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 3
        'D3+A3+F#4 - - - - - - - - - - - - - - -',  // 4
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 5
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 6
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 7
        'B2+F#3+B3 - - - - - - - - - - - - - - -',  // 8
        'A2+E3+C4 - - - - - - - - - - - - - - -',  // 9
        'A2+E3+C4 - - - - - - - - - - - - - - -',  // 10
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 11
        'D3+A3+F#4 - - - - - - - - - - - - - - -',  // 12
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 13
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 14
        'D3+A3+F#4 - - - - - - - - - - - - - - -',  // 15
        'B2+F#3+B3 - - - - - - - - - - - - - - -',  // 16
      ] },
    bass: { patch:'sawBass', bars: [
        'E2 - . E2 - . E2 - - . E2 . B2 - - .',  // 1
        'E2 - . E2 - . E2 - - . E2 . B2 - - .',  // 2
        'C2 - . C2 - . C2 - - . C2 . G2 - - .',  // 3
        'D2 - . D2 - . D2 - - . D2 . A2 - - .',  // 4
        'E2 - . E2 - . E2 - - . E2 . B2 - - .',  // 5
        'E2 - . E2 - . E2 - - . E2 . B2 - - .',  // 6
        'C2 - . C2 - . C2 - - . C2 . G2 - - .',  // 7
        'B1 - . B1 - . B1 - - . . . . . . .',  // 8
        'A1 - . A1 - . A1 - - . A1 . E2 - - .',  // 9
        'A1 - . A1 - . A1 - - . A1 . E2 - - .',  // 10
        'C2 - . C2 - . C2 - - . C2 . G2 - - .',  // 11
        'D2 - . D2 - . D2 - - . D2 . A2 - - .',  // 12
        'E2 - . E2 - . E2 - - . E2 . B2 - - .',  // 13
        'C2 - . C2 - . C2 - - . C2 . G2 - - .',  // 14
        'D2 - . D2 - . D2 - - . D2 . A2 - - .',  // 15
        'B1 - . B1 - . B1 - - . . . . . . .',  // 16
      ] },
    lead: { patch:'brassLead', bars: [
        'E4 - . G4 - . B4 - - . A4 . G4 - - .',  // 1
        'B4 - . D5 - . E5 - - . D5 . B4 - - .',  // 2
        'C5 - . E5 - . G5 - - . E5 . C5 - - .',  // 3
        'D5 - . F#5 - . A5 - - . F#5 . D5 - - .',  // 4
        'E4 - . G4 - . B4 - - . A4 . G4 - - .',  // 5
        'B4 - . D5 - . E5 - - . G5 . E5 - - .',  // 6
        'G5 - . E5 - . C5 - - . E5 . G5 - - .',  // 7
        'F#5 - . D#5 - . B4 - - . . . . . . .',  // 8
        'A4 - . C5 - . E5 - - . D5 . C5 - - .',  // 9
        'E5 - . C5 - . A4 - - . C5 . E5 - - .',  // 10
        'C5 - . E5 - . G5 - - . E5 . C5 - - .',  // 11
        'A5 - . F#5 - . D5 - - . F#5 . A5 - - .',  // 12
        'E5 - . B4 - . G4 - - . B4 . E5 - - .',  // 13
        'E5 - . G5 - . C6 - - . B5 . G5 - - .',  // 14
        'F#5 - . A5 - . D6 - - . C#6 . A5 - - .',  // 15
        'B5 - - . F#5 - - . D#5 - - . B4 - - -',  // 16
      ] },
    perc: { patch:'bossWood', alt:'bossKick', bars: [
        'O . . x . . O . . . X . x . x .',  // 1
        'O . . x . . O . . . X . x . x .',  // 2
        'O . . x . . O . . . X . x . x .',  // 3
        'O . . x . . O . . . X . o o O O',  // 4
      ] },
    extra: { patch:'choir', bars: [
        'G3+G4 - - - B3+B4 - - - E4+E5 - - - - - - -',  // 1
        'F#4+F#5 - - - - - - - - - - - - - - -',  // 2
        'D4+D5 - - - - - C4+C5 - - - B3+B4 - - - - -',  // 3
        'D3+D4 - - - - - - - - - - - - - - -',  // 4
        'E4+B4+G5 - - - - - - - - - - - - - - -',  // 5
        'C4+G4+E5 - - - - - - - - - - - - - - -',  // 6
        'D4+A4+F#5 - - - - - - - - - - - - - - -',  // 7
        'B3+F#4+B4 - - - - - - - - - - - - - - -',  // 8
        'G3+G4 - - - B3+B4 - - - E4+E5 - - - - - - -',  // 9
        'F#4+F#5 - - - - - - - - - - - - - - -',  // 10
        'D4+D5 - - - - - C4+C5 - - - B3+B4 - - - - -',  // 11
        'D3+D4 - - - - - - - - - - - - - - -',  // 12
        'E4+B4+G5 - - - - - - - - - - - - - - -',  // 13
        'C4+G4+E5 - - - - - - - - - - - - - - -',  // 14
        'D4+A4+F#5 - - - - - - - - - - - - - - -',  // 15
        'B3+F#4+B4 - - - - - - - - - - - - - - -',  // 16
      ] },
  },
};

// ----------------------------------------------------------------------------
// FISHING & COOKING — cozy 60 BPM, 8-bar loop (G Ionian): music box, soft pad, plucked bass, a woodblock bobber and water-drop plinks. (zone music ducks -12 dB)
MUSIC.fishing = {
  kind:'song', title:'Fishing', key:'G', mode:'ionian', meter:'4/4', bpm:60, bars:8,
  harmony: 'G | Em | C | D | G | Em | Am | D',
  mix: {pad:1, bass:1, lead:1, perc:1, extra:1},
  layers: {
    pad: { patch:'softPad', bars: [
        'G2+D3+B3 - - - - - - - - - - - - - - -',  // 1
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 2
        'C3+G3+E4 - - - - - - - - - - - - - - -',  // 3
        'D3+A3+F#4 - - - - - - - - - - - - - - -',  // 4
        'G2+D3+B3 - - - - - - - - - - - - - - -',  // 5
        'E3+B3+G4 - - - - - - - - - - - - - - -',  // 6
        'A2+E3+C4 - - - - - - - - - - - - - - -',  // 7
        'D3+A3+F#4 - - - - - - - - - - - - - - -',  // 8
      ] },
    bass: { patch:'lullBass', bars: [
        'G2 - - . D3 - - . G2 - - . D3 - - .',  // 1
        'E2 - - . B2 - - . E2 - - . B2 - - .',  // 2
        'C2 - - . G2 - - . C2 - - . G2 - - .',  // 3
        'D2 - - . A2 - - . D2 - - . A2 - - .',  // 4
        'G2 - - . D3 - - . G2 - - . D3 - - .',  // 5
        'E2 - - . B2 - - . E2 - - . B2 - - .',  // 6
        'A1 - - . E2 - - . A1 - - . E2 - - .',  // 7
        'D2 - - . A2 - - . D2 - - . A2 - - .',  // 8
      ] },
    lead: { patch:'musicBox', bars: [
        'B4 - - - D5 - - - G5 - - - - - D5 -',  // 1
        'E5 - - - - - D5 - B4 - - - G4 - - -',  // 2
        'C5 - - - E5 - - - G5 - - - E5 - - -',  // 3
        'F#5 - - - - - E5 - D5 - - - - - - -',  // 4
        'B4 - - - D5 - - - G5 - - - A5 - - -',  // 5
        'G5 - - - - - F#5 - E5 - - - B4 - - -',  // 6
        'A4 - - - C5 - - - E5 - - - - - D5 -',  // 7
        'F#5 - - - D5 - - - A4 - - - - - - -',  // 8
      ] },
    perc: { patch:'woodblock', alt:'softThump', bars: [
        '. . . . x . . . . . . . x . . .',  // 1
      ] },
    extra: { patch:'drop', bars: [
        '. . . . . . . . . . . . . . . .',  // 1
        '. . . . . . . . . . . . . . B5 .',  // 2
        '. . . . . . . . . . . . . . . .',  // 3
        '. . . . . . . . . . . . . . A5 .',  // 4
        '. . . . . . . . . . . . . . . .',  // 5
        '. . . . . . . . . . . . . . B5 .',  // 6
        '. . . . . . . . . . . . . . . .',  // 7
        '. . . . . . . . . . . . . . A5 .',  // 8
      ] },
  },
};

// ----------------------------------------------------------------------------
// DEATH — the lullaby's last three notes (B4 A4 F#5), slowed to a crawl, one music-box voice, long reverb tail. Does not resolve. One-shot.
MUSIC.death = {
  kind:'song', title:'Death', key:'D', mode:'ionian', meter:'6/8', bpm:44, bars:4, loop:false,
  harmony: '(none)',
  layers: {
    lead: { patch:'deathBox', bars: [
        'B4 - - - - - A4 - - - - -',  // 1
        'F#5 - - - - - - - - - - -',  // 2
        '. . . . . . . . . . . .',  // 3
        '. . . . . . . . . . . .',  // 4
      ] },
  },
};

// ----------------------------------------------------------------------------
// VICTORY — Pip's tag (compressed to 4/4) running into a swelling D-major chord and a bell arpeggio. ~3 s. One-shot.
MUSIC.victory = {
  kind:'stinger', title:'Victory', key:'D', mode:'ionian', meter:'4/4', bpm:120, bars:2, loop:false,
  harmony: 'D | D',
  layers: {
    pad: { patch:'swellPad', bars: [
        '. . . . . . . . D3+A3+D4+F#4+A4 - - - - - - -',  // 1
        '- - - - - - - - - - - - . . . .',  // 2
      ] },
    bass: { patch:'lullBass', bars: [
        '. . . . . . . . D2 - - - - - - .',  // 1
        'D2 - - - - - - - - - - . . . . .',  // 2
      ] },
    lead: { patch:'pipTri', bars: [
        'F#4 A4 D5 E5 . . D5 E5 F#5 G5 A5 . . . . .',  // 1
        'D5 - F#5 - A5 - D6+F#6+A5 - - - - - - - - -',  // 2
      ] },
    extra: { patch:'glassPing', bars: [
        '. . . . . . . . . . . . . . . .',  // 1
        '. . . . . . D6 - A6 - - - - - - -',  // 2
      ] },
  },
};

// ----------------------------------------------------------------------------
// STINGER level-up — a bright D-major arpeggio climb. Written in D; engine transposes to the current key.
MUSIC.st_levelup = {
  kind:'stinger', title:'Level Up', key:'D', mode:'ionian', meter:'4/4', bpm:132, bars:2, loop:false,
  harmony: 'D | D',
  layers: {
    pad: { patch:'swellPad', bars: [
        'D4+A4+F#5 - - - - - - - - - - - - - - -',  // 1
        'D3+A3+D4+F#4 - - - - - - - - - - - . . . .',  // 2
      ] },
    bass: { patch:'lullBass', bars: [
        'D2 - - . A2 - - . D3 - - - - - - .',  // 1
        'D2 - - - - - - - - - - . . . . .',  // 2
      ] },
    lead: { patch:'glassPing', bars: [
        'D5 - F#5 - A5 - D6 - A5 - D6 - F#6 - - -',  // 1
        'D6+F#6+A6 - - - - - - - - - - - . . . .',  // 2
      ] },
  },
};

// ----------------------------------------------------------------------------
// STINGER legendary drop — choir amen (IV-I) under a rising pentatonic glass line (2 bars).
MUSIC.st_legendary = {
  kind:'stinger', title:'Legendary Drop', key:'D', mode:'ionian', meter:'4/4', bpm:84, bars:2, loop:false,
  harmony: 'D | G D',
  layers: {
    pad: { patch:'choir', bars: [
        'D4+A4+F#5 - - - - - - - - - - - - - - -',  // 1
        'G3+D4+B4 - - - - - - - D4+A4+F#5 - - - - - - -',  // 2
      ] },
    bass: { patch:'subBass', bars: [
        'D2 - - - - - - - - - - - - - - .',  // 1
        'G2 - - - - - - . D2 - - - - - - .',  // 2
      ] },
    lead: { patch:'glassPing', bars: [
        'D5 - - - F#5 - - - A5 - - - D6 - - -',  // 1
        'E6 - - - F#6 - - - A6 - - - - - - -',  // 2
      ] },
  },
};

// ----------------------------------------------------------------------------
// STINGER discovery / combo — Pip's 4-note tag (F#5 A5 D6 E6) on glass. 1 bar.
MUSIC.st_discovery = {
  kind:'stinger', title:'Discovery', key:'D', mode:'ionian', meter:'4/4', bpm:120, bars:1, loop:false,
  harmony: 'D',
  layers: {
    lead: { patch:'glassPing', bars: [
        'F#5 - A5 - D6 - E6 - - - - - - - . .',  // 1
      ] },
  },
};

// ----------------------------------------------------------------------------
// STINGER boss phase change — three stabbed fifths climbing D - D - F - D' with a cymbal swell on the beat. 1 bar, written in D.
MUSIC.st_phase = {
  kind:'stinger', title:'Phase Change', key:'D', mode:'aeolian', meter:'4/4', bpm:104, bars:1, loop:false,
  harmony: 'Dm',
  layers: {
    bass: { patch:'sawBass', bars: [
        'D2 - - - - - - - - - - - - - . .',  // 1
      ] },
    lead: { patch:'brassSting', bars: [
        'D4+A4 - . . D4+A4 - . . F4+C5 - . . D5+A5 - - -',  // 1
      ] },
    perc: { patch:'cymbal', alt:'bossKick', bars: [
        'X . . . . . . . O . . . . . . .',  // 1
      ] },
  },
};

// ---------------------------------------------------------------------------
// MUSIC_UTIL — pure helpers (no WebAudio). Shared by the preview and the engine so they cannot drift.
//   stepsPerBar(meter)            12 | 16
//   stepSeconds(song)             duration of one cell at song.bpm
//   noteToMidi('F#4') -> 66 | null      midiToFreq(m)      keyOffset('D','G') -> semitones to transpose D material to G (-6..+5)
//   parseLayer(layer, meter, isPerc) -> { steps, events:[{ step, dur, notes:[midi], vel, patch:'x'|'o'|null }] }  (throws on bad data)
//   validate(song) -> [] or list of problems (cell counts, loop divisibility, unknown patches)
// ---------------------------------------------------------------------------
const MUSIC_UTIL = (() => {
  const PCS = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
  const stepsPerBar = (meter) => (meter === '6/8' ? 12 : 16);
  const stepSeconds = (song) => 60 / song.bpm / (song.meter === '6/8' ? 6 : 4);
  const noteToMidi = (n) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return m ? PCS[m[1]] + 12 * (+m[2] + 1) : null; };
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const keyOffset = (from, to) => { let d = (PCS[to] - PCS[from] + 12) % 12; return d > 6 ? d - 12 : d; };
  function parseLayer(layer, meter, isPerc) {
    const n = stepsPerBar(meter); const events = []; let cur = null; let step = 0;
    layer.bars.forEach((b, bi) => {
      const cells = b.trim().split(/\s+/);
      if (cells.length !== n) throw new Error('bar ' + (bi + 1) + ' has ' + cells.length + ' cells, expected ' + n + ': ' + b);
      for (const c of cells) {
        if (c === '.') { cur = null; }
        else if (c === '-') { if (cur && !isPerc) cur.dur++; }
        else if (isPerc && /^[xXoO]$/.test(c)) { events.push({ step, dur: 1, notes: [], vel: c === c.toUpperCase() ? 1 : 0.55, patch: c.toLowerCase() }); cur = null; }
        else {
          const notes = c.split('+').map(noteToMidi);
          if (notes.some((m) => m === null)) throw new Error('bad cell "' + c + '" in bar ' + (bi + 1));
          cur = { step, dur: 1, notes, vel: 0.8, patch: null }; events.push(cur); if (isPerc) cur = null;
        }
        step++;
      }
    });
    return { steps: step, events };
  }
  function validate(song, patches) {
    const out = []; const n = stepsPerBar(song.meter);
    for (const name in song.layers) {
      const L = song.layers[name];
      if (patches) for (const p of [L.patch, L.alt]) if (p && !patches[p]) out.push(name + ': unknown patch ' + p);
      if (song.bars % L.bars.length) out.push(name + ': ' + L.bars.length + ' bars do not divide song.bars ' + song.bars);
      try { parseLayer(L, song.meter, name === 'perc'); } catch (e) { out.push(name + ': ' + e.message); }
    }
    return out;
  }
  return { stepsPerBar, stepSeconds, noteToMidi, midiToFreq, keyOffset, parseLayer, validate };
})();
