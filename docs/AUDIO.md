# Music & sound design (authoritative; expert-reviewed)

## Identity: "music box in a cathedral"
Celesta / music-box leads (short triangle or sine with a fast decay plus a 2–4 ms detuned twin), soft square pads with
slow filter sweeps, a sub-sine bass, and generous generated reverb. Chiptune timbres, lullaby writing. 60–110 BPM;
dotted rhythms and 6/8 for the dream feel.

**Director decision: no audio files.** Everything is synthesized at runtime. The four timbres oscillators do worst
(wood-block, glass bell, choir "ah", cymbal swell) are rendered once at boot with an `OfflineAudioContext`
(FM/additive + filtered noise) into reusable `AudioBuffer`s — no licensing, no codec split for Safari, works from file://.

## Motifs (three themes from one 8-note lullaby)
* **Aerin's Lullaby** (the seed): Ionian, 6/8, 8 notes rising then falling a 6th. First heard on the title at 72 BPM.
* **Pip's theme:** the lullaby's first 4 notes at double speed, staccato triangle, a playful upward turn — a 2-bar tag
  under Pip's dialogue and on discoveries.
* **Morrow's theme:** the lullaby in Aeolian at half speed in the bass, the last interval inverted (falls a 6th).
  Fragments at every guardian's death line, in full at the Spire, back to Ionian in the epilogue when he wakes.
* **The reveal is musical:** the Ruins' background pad plays Morrow's theme as a slow chord progression from Act II; at
  the Caldera twist it resolves into the lullaby's major version, one scene before the line.

## Palette per zone
| Zone | Instruments | BPM / mode | Mood |
|---|---|---|---|
| Title / Vale | music box, pad, wind bed | 72, D Ionian, 6/8 | lullaby, safe |
| Pinewood / Root Hollow | plucked square, sine flute with vibrato, wood-block | 96, G Mixolydian | morning adventure; dungeon = same patterns, lead dropped, low drone + drips |
| Ruins / Warden Crypt | stacked-square organ, detuned-saw choir pad, toms | 80, A Aeolian | sacred, hollow; Morrow's chords |
| Grotto / Drowned Vault | glass-bell leads with long delay, noise waves, sub bass | 70, F Lydian | underwater (low-pass 1.2 kHz on everything) |
| Caldera / Forge Deep | saw bass, anvil hits, rhythmic pulse | 110, E Phrygian | forge rhythm (percussion stays on outside combat) |
| Spire | pad + Morrow's theme on high music box, no drums | 60, D Aeolian → Ionian | dread turning tender |
| Drifting Isles / Starlit Shoals / Gloaming Below | Vale palette in Dorian / Grotto palette at 55 BPM / Ruins palette with reversed envelopes | | |
| Fishing & cooking | music box + bass, 60 BPM, 8-bar loop; zone music ducked −12 dB | | cozy |
| Death | the lullaby's last 3 notes, slowed, one voice, reverb tail | | |
| Victory stinger | Pip's tag + major chord swell, 3 s | | |
| Credits | the full lullaby with all three motifs layered, ~4 min | | |

**Boss music = vertical layers** running in sync: A pad + bass (phase 1), B percussion (on first aggro), C lead /
counter-melody (phase 2), D choir + Morrow fragment (phase 3 / enrage). Phase changes crossfade stems on the next bar
with a `stinger('phase')` on the beat. Each guardian has its own key and a 1-bar signature rhythm; Morrow's fight is
the lullaby itself, with stem D becoming Pip's theme at the sacrifice.

## Engine (`js/audio.js`, Opus)
* **Clock:** a scheduler every 25 ms with 120 ms lookahead on `AC.currentTime` (200 ms on phones). Notes are never
  timed with `setTimeout` or rAF. Global tempo and bar position, so stingers and transitions quantize to beat or bar.
* **Data (`js/music.js`):** `MUSIC = { zone: { bpm, key, bars, layers: { pad, bass, lead, perc, extra }, intensity } }`.
  A pattern is one string per 16-step bar (`"C4..E4..G4.....|"`), 4–8 bars per layer, transposed by key so one lullaby
  pattern serves every motif variant.
* **Patches:** `{ osc: square|triangle|saw|sine|noise|buffer, detune, unison, adsr, filter:{type,freq,q,env},
  send:{delay,reverb} }`, played on a pool of 24 pre-created voices. Delay = DelayNode + feedback; chorus = two detuned
  voices; reverb = one ConvolverNode per zone colour with a generated 2–3 s stereo impulse (1.5 s on phones).
* **Layers:** each layer is a GainNode; `setLayer(name, 0..1, fadeBars)` ramps on bar boundaries. Combat intensity:
  aggro → percussion up over 1 bar and lead down a notch; > 3 enemies or an elite → extra layer; all clear → 2-bar decay.
  The dungeon variant is the same patterns with a different patch set and layer mask.
* **Transitions:** zone change fades over 1 bar during the rift fade and the new zone starts on its bar 1; boss = hard
  cut on the beat + stinger. Stingers (level-up, legendary drop, discovery, reaction, Codex) are 1–2-bar phrases on the
  UI bus, pitched to the current key.
* **Ducking:** music bus −9 dB under dialogue (100 ms down, 600 ms up), −12 dB fishing, −20 dB death.
* **Mobile:** ≤ 12 music voices, 1 convolver, no `extra` layer on `pointer: coarse`, suspend on `visibilitychange`.

## Sound design (all `SFX` data recipes)
* **UI:** hover 2 ms 1.8 kHz tick; confirm two sines a 5th apart; back descending; tab filtered noise 40 ms; equip
  metallic triangle 900→1200 + cloth noise; socket a gem = glass ping pitched by gem type; salvage crunch; error square
  220 Hz 80 ms.
* **Footsteps** every 0.28 s, ±8 % pitch, −18 dB: grass soft LP noise; stone click + noise; wood hollow square 200 Hz;
  water HP-noise splash; sand/ash long LP noise; metal/crystal tiny ring.
* **Weapons:** sword noise 2.4k→400, the 3-hit combo rising a semitone per hit; staff sine 500→1100 + sparkle; bow
  triangle twang + air; **daggers** two very short snicks 20 ms apart, 4th hit adds a thud; **two-hander** rising wind-up
  noise 0.4 s, impact = 60 Hz thump + noise burst + sub tail, charged swings rise in pitch with charge.
* **Damage types:** slash noise sweep; pierce click + whistle; fire 4 crackle bursts + low whoosh; frost 2.6k→1.8k sine +
  glass; nature wet noise + "thwip"; lightning 10 ms saw crack; arcane two sines a tritone apart bending together; holy
  key-aware triad swell; gloom reversed-envelope 150 Hz.
* **Statuses:** Burn crackle ticks; Chill shimmer, Freeze ice crack; Poison bubbling; Shock buzz per tick; stagger
  break = metallic ring + "BREAK" bell.
* **Reactions — each is a learnable 2-note interval:** Shatter glass + falling 5th; Wildfire whoosh + rising 4th;
  Conduct triple zap arpeggio; Overload detuned saw bloom; Purify major-3rd bell; Rupture deep thud + crit ping; Detonate
  bass drop + crackle. Combo/Codex discovery = Pip's 4-note tag on glass.
* **Drops:** one pentatonic note per rarity step (existing `dropN`); Legendary adds the choir + a 2-bar stinger;
  Mythic adds a reverse cymbal swell before the chime.
* **Enemies by archetype** (±10 % pitch per instance): beasts growl + bark on lunge; armoured scrape/clank; amorphous
  wet squelch; ethereal slow-vibrato sine chord, reversed death; golems stone grind + thud.
* **Boss telegraph cues (fairness):** every `BOSS_MOVES` entry has a `warnSfx` fired at telegraph start, one distinct
  0.3 s cue per shape — cone rising noise, circle low drum, line whistle, rain high tick cluster, ring sub swell,
  unblockable two-tone alarm. Wind-ups ≥ 0.6 s, so the cue always comes ≥ 0.6 s before the hit.
* **Ambient beds** (2 quiet layers, varied every ~2 min): Vale wind + crickets; Pinewood birds + leaves; Ruins wind
  through stone + drips; Grotto drips + low hum; Caldera rumble + bubbling; Spire void tone + distant choir; dungeons
  reverb-heavy drips.
* **Fishing:** cast whoosh, plop, bite tick ×2, reel ratchet (8–16 Hz pulses rising with tension), snap, splash +
  rarity chime, cooking sizzle. **Shrine:** glass chord + fire crackle. **Portal:** sweep + reverse swell before entry.

## Mixing rules
* Buses: master → music / sfx / ui / ambient, with a gentle compressor on master (threshold −12 dB, ratio 3).
* Priority 0–3 per sfx; at most 16 sfx voices and 3 per sound id; the oldest lowest-priority voice is stolen.
* ±6 % pitch randomization on repeated sfx (none on UI); hit sounds rotate 3 variants; the same sfx at most 6×/s;
  nothing but music longer than 1.5 s.
* Spatial: `StereoPannerNode` pan = (screenX / 480 − 0.5) × 0.8; attenuation = (1 − clamp(dist / 14))²; off-screen −12 dB,
  but telegraph cues are never silent.
* Mute works on buses, never by skipping scheduling (or the music desyncs on unmute).

## Accessibility
* A visual twin for every gameplay cue: telegraph shapes already draw; off-screen boss warnings add a screen-edge flash in
  the element colour; dialogue subtitles are always on; optional **sound captions** ("[boss wind-up]", "[legendary drop]")
  bottom-left, sized by the text-size setting.
* Sliders: master, music, sfx, ui, ambient. **Mono** toggle. "Reduce bass" option.

## Plan
* Files: `js/audio.js` (engine), `js/music.js` (patches + patterns), the `SFX` table moved out of game.js.
* **Opus:** engine, boot-time rendered buffers, buses, scheduler, ducking, spatial, voice pool.
* **Sonnet:** compose patterns as data (the lullaby first, then zones, then boss stems) and the ambient beds.
* **Haiku:** the SFX recipe table, `warnSfx` per boss move, caption strings, and a smoke test that plays every sfx id and
  every music state through an `OfflineAudioContext` with zero errors.
* **Milestones:** engine + Vale / Pinewood / Root Hollow / Bramblehorn stems + core SFX in **M2b**; Ruins and Grotto in
  M4–M5; Caldera, Spire and credits in M6–M7; mix pass and captions in M8.
* **Risks:** autoplay (create the context on the first gesture and `resume()` on every pointerdown/keydown until running;
  the title works silently); Safari (`webkitAudioContext`, missing `StereoPannerNode` on old iOS → fallback to no pan);
  convolver cost on phones; CPU (pool nodes, never a convolver per note, cap voices).
