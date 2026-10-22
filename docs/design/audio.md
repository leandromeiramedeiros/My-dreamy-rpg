# Music and sound design

Terms: [../GLOSSARY.md](../GLOSSARY.md). Reactions: [elements-statuses.md](elements-statuses.md). Boss telegraphs: [enemies-bosses.md](enemies-bosses.md).

## Identity: "music box in a cathedral"
Celesta and music-box leads (short triangle or sine with a fast decay plus a 2 to 4 ms detuned twin), soft square pads with slow filter sweeps,
a sub-sine bass, and generous generated reverb. Chiptune timbres, lullaby writing. 60 to 110 BPM; dotted rhythms and 6/8 for the dream feel.

No audio files. Everything is synthesized at runtime. The four timbres oscillators do worst (wood-block, glass bell, choir "ah", cymbal swell)
are rendered once at boot with an `OfflineAudioContext` (FM or additive plus filtered noise) into reusable `AudioBuffer`s.
No licensing, no codec split for Safari, works from `file://`.

## Motifs (three themes from one 8-note lullaby)
* **Aerin's Lullaby** (the seed): Ionian, 6/8, 8 notes rising then falling a 6th. First heard on the title at 72 BPM.
* **Pip's theme:** the lullaby's first 4 notes at double speed, staccato triangle, a playful upward turn. A 2-bar tag under Pip's dialogue and on discoveries.
* **Morrow's theme:** the lullaby in Aeolian at half speed in the bass, the last interval inverted (falls a 6th). Fragments at every guardian's death line,
  in full at the Spire, back to Ionian in the epilogue when he wakes.
* The reveal is musical: the Ruins' pad plays Morrow's theme as a slow chord progression from Act II; at the Caldera twist it resolves into
  the lullaby's major version, one scene before the line.

## Palette per zone
| Zone | Instruments | BPM / mode | Mood |
|---|---|---|---|
| Title / Vale | music box, pad, wind bed | 72, D Ionian, 6/8 | lullaby, safe |
| Pinewood / Root Hollow | plucked square, sine flute with vibrato, wood-block | 96, G Mixolydian | morning adventure; dungeon = same patterns, lead dropped, low drone and drips |
| Ruins / Warden Crypt | stacked-square organ, detuned-saw choir pad, toms | 80, A Aeolian | sacred, hollow; Morrow's chords |
| Grotto / Drowned Vault | glass-bell leads with long delay, noise waves, sub bass | 70, F Lydian | underwater (low-pass 1.2 kHz on everything) |
| Caldera / Forge Deep | saw bass, anvil hits, rhythmic pulse | 110, E Phrygian | forge rhythm (percussion stays on outside combat) |
| Spire | pad plus Morrow's theme on high music box, no drums | 60, D Aeolian to Ionian | dread turning tender |
| Drifting Isles / Starlit Shoals / Gloaming Below | Vale palette in Dorian / Grotto palette at 55 BPM / Ruins palette with reversed envelopes | | |
| Fishing and cooking | music box and bass, 60 BPM, 8-bar loop; zone music ducked 12 dB | | cozy |
| Death | the lullaby's last 3 notes, slowed, one voice, reverb tail | | |
| Victory stinger | Pip's tag plus a major chord swell, 3 s | | |
| Credits | the full lullaby with all three motifs layered, about 4 min | | |

Boss music is vertical layers in sync: A pad and bass (phase 1), B percussion (on first aggro), C lead or counter-melody (phase 2), D choir plus a Morrow fragment (final phase or enrage).
Phase changes crossfade stems on the next bar with `stinger('phase')` on the beat. Each guardian has its own key and a 1-bar signature rhythm.
Morrow's fight is the lullaby itself, with stem D becoming Pip's theme at the sacrifice.

## Engine (`js/audio.js`, `js/music.js`, `js/sfxdata.js`)
* Clock: a scheduler every 25 ms with 120 ms lookahead on `AC.currentTime` (200 ms on phones). Notes are never timed with `setTimeout` or rAF.
  Global tempo and bar position, so stingers and transitions quantize to beat or bar.
* Data: `MUSIC = { zone: { bpm, key, bars, layers: { pad, bass, lead, perc, extra }, intensity } }`. A pattern is one string per 16-step bar
  (`"C4..E4..G4.....|"`), 4 to 8 bars per layer, transposed by key so one lullaby pattern serves every motif variant.
* Patches: `{ osc: square|triangle|saw|sine|noise|buffer, detune, unison, adsr, filter:{type,freq,q,env}, send:{delay,reverb} }` on a pool of 24 pre-created voices.
  Delay = DelayNode plus feedback; chorus = two detuned voices; reverb = one ConvolverNode per zone colour with a generated 2 to 3 s stereo impulse (1.5 s on phones).
* Layers: each layer is a GainNode; `setLayer(name, 0..1, fadeBars)` ramps on bar boundaries. Combat: aggro brings percussion up over 1 bar and the lead down a notch;
  more than 3 enemies or an elite adds the extra layer; all clear decays over 2 bars. The dungeon variant is the same patterns with a different patch set and layer mask.
* Transitions: a zone change fades over 1 bar during the rift fade and the new zone starts on its bar 1; a boss is a hard cut on the beat plus a stinger.
  Stingers (level-up, legendary drop, discovery, reaction, Codex) are 1 to 2-bar phrases on the UI bus, pitched to the current key.
* Ducking: music bus 9 dB under dialogue (100 ms down, 600 ms up), 12 dB for fishing, 20 dB on death.
* Mobile: at most 12 music voices, 1 convolver, no `extra` layer on `pointer: coarse`, suspend on `visibilitychange`.
* Autoplay: create the context on the first gesture and `resume()` on every pointerdown and keydown until running; the title works silently.
  Safari: `webkitAudioContext`, and no pan where `StereoPannerNode` is missing.

## Sound design (`SFX` data recipes)
* UI: hover 2 ms 1.8 kHz tick; confirm two sines a 5th apart; back descending; tab filtered noise 40 ms; equip metallic triangle 900 to 1200 plus cloth noise;
  socket a gem = glass ping pitched by gem type; salvage crunch; error square 220 Hz 80 ms.
* Footsteps every 0.28 s, 8% pitch spread, -18 dB: grass soft LP noise; stone click plus noise; wood hollow square 200 Hz; water HP-noise splash; sand and ash long LP noise; metal and crystal tiny ring.
* Weapons: sword noise 2.4k to 400, the 3-hit combo rising a semitone per hit; staff sine 500 to 1100 plus sparkle; bow triangle twang plus air; daggers two very short snicks 20 ms apart,
  the 4th hit adds a thud; two-hander rising wind-up noise 0.4 s, impact = 60 Hz thump plus noise burst plus sub tail, charged swings rise in pitch with charge.
* Damage types: slash noise sweep; pierce click plus whistle; fire 4 crackle bursts plus low whoosh; frost 2.6k to 1.8k sine plus glass; nature wet noise plus "thwip";
  lightning 10 ms saw crack; arcane two sines a tritone apart bending together; holy key-aware triad swell; gloom reversed-envelope 150 Hz.
* Statuses: Burn crackle ticks; Chill shimmer, Freeze ice crack; Poison bubbling; Shock buzz per tick; stagger break = metallic ring plus "BREAK" bell.
* Reactions (eight, each a learnable 2-note interval, ids `rx_*`): Shatter glass plus falling 5th; Wildfire whoosh plus rising 4th; Conduct triple zap arpeggio;
  Overload detuned saw bloom; Purify major-3rd bell; Rupture deep thud plus crit ping; Detonate bass drop plus crackle; Drift a soft airy sweep (`rx_drift`).
  Combo and Codex discovery = Pip's 4-note tag on glass.
* Drops: one pentatonic note per rarity step; Legendary adds the choir plus a 2-bar stinger; Mythic adds a reverse cymbal swell before the chime.
* Enemies by archetype (10% pitch spread per instance): beasts growl and bark on lunge; armoured scrape and clank; amorphous wet squelch; ethereal slow-vibrato sine chord, reversed death; golems stone grind and thud.
* Boss telegraph cues (fairness): every `BOSS_MOVES` entry has a `warnSfx` fired at telegraph start, one distinct 0.3 s cue per shape: cone rising noise, circle low drum, line whistle,
  rain high tick cluster, ring sub swell, unblockable two-tone alarm. Wind-ups are at least 0.6 s, so the cue always comes at least 0.6 s before the hit.
* Ambient beds (2 quiet layers, varied about every 2 min): Vale wind and crickets; Pinewood birds and leaves; Ruins wind through stone and drips; Grotto drips and low hum;
  Caldera rumble and bubbling; Spire void tone and distant choir; dungeons reverb-heavy drips.
* Fishing: cast whoosh, plop, bite tick x2, reel ratchet (8 to 16 Hz pulses rising with tension), snap, splash plus rarity chime, cooking sizzle. Shrine: glass chord plus fire crackle. Portal: sweep plus reverse swell before entry.

## Mixing rules
* Buses: master to music, sfx, ui, ambient, with a gentle compressor on master (threshold -12 dB, ratio 3).
* Priority 0 to 3 per sfx; at most 16 sfx voices and 3 per sound id; the oldest lowest-priority voice is stolen.
* 6% pitch randomization on repeated sfx (none on UI); hit sounds rotate 3 variants; the same sfx at most 6 times a second; nothing but music longer than 1.5 s.
* Spatial: `StereoPannerNode` pan = (screenX / 480 - 0.5) x 0.8; attenuation = (1 - clamp(dist / 14))^2; off-screen -12 dB, but telegraph cues are never silent.
* Mute works on buses, never by skipping scheduling (or the music desyncs on unmute).

## Accessibility
* A visual twin for every gameplay cue: telegraph shapes already draw; off-screen boss warnings add a screen-edge flash in the element colour;
  dialogue subtitles are always on; optional sound captions ("[boss wind-up]", "[legendary drop]") bottom-left, sized by the text-size setting.
* Sliders: master, music, sfx, ui, ambient. Mono toggle. "Reduce bass" option.

## Tests
A smoke test plays every sfx id and every music state through an `OfflineAudioContext` with zero errors.
