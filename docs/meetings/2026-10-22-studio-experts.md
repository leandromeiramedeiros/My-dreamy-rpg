# Game Studio Experts meeting — hero style, loadout v3, lighting, wind, tools (My-dreamy-rpg)

Date 2026-10-22. Design only; no code. Attending (13): creative director (CD), technical director (TD), game designer
(GDes), lead programmer (LP), art director (AD), gameplay programmer (GP), engine programmer (EP), tools programmer (TP),
UI programmer (UIP), systems designer (SD), level designer (LD), technical artist (TA), UX designer (UX). The studio
director relayed the client's brief (five parts, verbatim in the brief).

Grounding: DESIGN §0, §6, §15, §19, §23, §24, §26–§33; PRODUCTION.md; HUD.md; CONTROLS.md; the six 2026-10-20 minutes.
Code: js/elfx.js, tools/fx-board.js, js/render.js (lights 1577–1790, trees 403–450, bloom 1729–1790, fog 328–339),
js/hero.js + js/parts-art.js (24×34 paper doll, ASCII parts kit), js/sprites.js (125 PNG data-URIs in a classic script),
js/items.js / js/itemdata.js (SLOTS, TRINKET_SLOTS, AFFIX_V2, BOONS, CAPS), js/data.js (WEAPONS[class].variants, SKILLS,
`q/e/r` pairs), js/enemyart.js (faces right + flip), js/input.js (DEFAULTS: flat code arrays, no modifier chords; Shift =
dodge; D = move-right), tools/ (full inventory). Remote branch `origin/claude/sprite-forge` (4 commits, 2026-10-21):
tools/forge/forge.js (510 lines: 3D volumes on a bone rig → G-buffer → palette → outline, deterministic, pure JS),
build.js (PNG + sha256 + lint + runtime-compose byte check), models (hero, chibi, chibi-gear 5 shape tiers, wanderer,
capling), preview.html dressing room. Boards viewed: chibi-tiers.png, crude-vs-pixel.png, hero.knight.png.
Reference: Pixelblog 55 / 56 / 58 (slynyrd), technique summarised in our own words in Part 1.

## Facts that shaped the answers
F1. `input.js` bindings are flat `KeyboardEvent.code` arrays. There is no modifier-chord support; `ShiftLeft/Right`
    and `Mouse2` are the dodge today; `KeyD` is move-right. The client's "HEAD = D" collides with WASD.
F2. The game runs from `file://` (§0). A PNG loaded through `<img>` from `file://` taints a canvas in Chromium, so
    `getImageData` throws. The forge's runtime `compose()` reads pixels. The existing safe pattern is js/sprites.js:
    base64 data-URIs inside a classic script (125 sprites today).
F3. Phone p95 is ~20.3 ms against a 20 ms budget, measured by tools/perf.js under Playwright CPU throttle (real-phone
    readings are dropped by the client). Every addition in Parts 1–3 needs a named offset.
F4. The forge branch output (chibi-tiers.png: five shape tiers, T1 squire → T5 radiant, three directions) already reads
    as pixel art with per-tier geometry, metal glints, trim and glow mats. crude-vs-pixel.png shows the "rendered" look
    the pixel pass must still kill: smooth gradients on big rounded masses, 1-px stray clusters.
F5. §23 gives every variant Q / E / R plus a rune alternate per slot; §15 gives 10 character skills on 1/2/3 and Dream
    Tomes; §24 gives suits F / C / Shift. The client retires hero skills and fixes 12 actives + 2 chords. All of that
    content is re-homed, not deleted (Part 4.6).
F6. tools/qa/old is 259 MB of tracked PNG/JSON (1,069 PNGs in git); tools/shots and tools/qa/shots are already
    git-ignored. Another lane owns tools/qa, tools/maps, js/world.js, js/maps.js, js/game.js right now.
F7. Trees already sway from a travelling gust (`WIND`, `gustFrame`, 3 canopy frames, ≤ 60 trees near the hero). Gravity
    Well carries the `vortex` tag (§33). §33 fixes wind resistance rows (armoured → Buffeted only, elite ×0.5, boss never
    Lifted).
F8. Lighting today: half-res coloured lightmap multiply (radial sprites, `lightPool` cap 40 / 24 / 16 with hysteresis),
    additive halos, emitter-only bloom at 1/4 + 1/8 (particles excluded), soft-light grade (desktop), 1–3 tiled fog
    layers with a clear zone, forest god-ray texture, pre-rendered prop shadows, skewed tree silhouettes (desktop),
    flat ellipses for entities. ELFX rows already carry a `light` field per element.

---

## Part 1 — The reference style and the sprite forge

### 1.1 What the reference actually specifies (our words)
| Topic | From the reference (Pixelblog 55 / 56 / 58) | Studio rule (ours; the reference says nothing) |
|---|---|---|
| View | 3/4 top-down, 8 directions | same; camera elevation 28° in the forge |
| Body size | front dummy 26 × 32 px, on a 16 px tile grid | body 26 × 32 inside a 48 × 48 frame (weapon reach, plumes, smears) |
| Proportion | "slightly chibi", longer limbs than a classic chibi so motion reads | ~2.9 heads; head 11 px, torso 10, legs 11 |
| Directions drawn | 5 (S, SE, E, NE, N); SW, W, NW mirrored — but asymmetric gear forced unique frames for all 8 | **true 8, never mirrored**: the forge renders all 8, so the sword stays in the right hand everywhere |
| Idle | uneven holds: extremes long, in-betweens short | 4 frames: 420 / 140 / 420 / 140 ms; breathe = chest −1 px, cape +1 |
| Walk / run | 6 frames, 100 ms each; head bob per stride −1, −1, +2 px (rise faster than fall); a "pass" frame with legs under the torso | walk 6 @ 100 ms with that bob; no separate run |
| Hair / cape | hair shifts on frames 2 and 4 only; cape physics is a separate pass | hair layer offset on 2 / 4; cape bone rotates 2 steps behind the chest |
| Attack | 6 frames: anticipation (1, variable hold), smear frames, follow-through (1, +1 px reach, no smear), recover (1). No smear on anticipation / recover. Sword 100/50/50/50/100/50 = 400 ms; spear 200/50/50/50/150/50 = 550; hammer 250/50/50/50/300/100 = 800 (+ a rebound frame and screen shake) | Blades 400 ms (= §23's 0.42 s), Shadows 300, Shots 360, Foci 480, **Greatarms 620** (250/50/50/50/150/70; §23's 0.62 s wins over the 800 ms reference, the rebound frame stays). The hit lands on the first smear frame |
| Smears | angular and sharp, not curved; stronger read | generated from the weapon-tip socket path (f−1 → f → f+1), 2 tones of the weapon's ramp, no outline |
| Weapon hand | same hand in all 8 directions; per-direction hitbox tweaks | same; the hitbox is data, never the sprite |
| Layering | base body first, gear on separate layers; arm swing reduced when holding sword + shield | base → gear by depth (forge G-buffer), arm pose per class |
| Noise rule | flickering sub-pixels and edge artefacts are noise; simplify clusters, reduce palette, check at full speed | lint: no 1-px lone cluster, ≤ 5 tones per material, ≤ 24 colours per piece |
| Outline / light / ramp | not given | 1 px near-black (#0c0714) outer outline; dark inner line only on depth jumps; light from top-left-front; 4-step hue-shifted ramps (shadow → violet, light → warm) + 1 glint tone on metal and gems |
| Other anims | not covered | hurt 1, death 3 (+ dissolve), dodge 4, cast 4, block 1, channel 2 (loop), carry 1 |

Facing rule for free aim (the reference is a movement-faces game): the hero faces the aim direction while attacking,
casting, blocking or holding a skill (sticky 0.4 s), otherwise the move direction. Legs always play the walk cycle.

### 1.2 Disagreement: hand-drawn Aseprite frames vs the forge
AD: the reference is hand-drawn frame by frame; a renderer will always read "rendered". TD/TP: 8 dirs × 43 frames × 340
pieces is 118 k frames; no hand pipeline reaches that, and the forge output on the board already passes the squint test.
TA: the gap is the pixel pass, not the geometry — kill gradients on big masses (quantise per material to 4 tones + glint,
posterise normals), force cluster size ≥ 2 px, bias the outline to the silhouette. Resolved: **forge, with a hand-pixel
lint and a client-approved side-by-side board as the M4a gate** (forge frame next to a hand-painted reference frame, same
pose, same direction; the client must not be able to tell which is which at 2×).

### 1.3 Forge verdict on `origin/claude/sprite-forge`
**Reuse tools/forge/* (forge.js, build.js, models/, preview.html). Drop the branch's RESUME.md / CREDITS.md /
package.json changes** (they diverge from main). Retune, don't rewrite:
* New rig `models/ref.js` between `chibi` (31 px, 2.3 heads) and `hero` (33 px, 6 heads): 32 px, 2.9 heads, limbs long
  enough for the 6-frame walk to read. `chibi` and `hero` stay as regression fixtures for one milestone, then go.
* `humanoid-anims.js` gets the reference timing table (1.1), the 6-frame walk with the −1/−1/+2 bob, the 6-frame attack
  per class (blades / greatarms / shots / foci / shadows + block / channel / cast / dodge / hurt / death).
* Pixel pass additions: per-material tone cap, cluster lint (≥ 2 px), outline-only-on-silhouette, smear generator from
  the exported `weapon` / `offhand` sockets.
* The forge exports per frame: sockets (handR, handL, head, chest, cast, weaponTip, offhandTip), a rim mask (edge pixels
  with an 8-way outward normal: Part 2 uses it), and the piece's screen bbox.

### 1.4 The sprite forge pipeline (deterministic, local)
```
models/<rig>.js + models/<line>-gear.js (tier rows T1..T5 + Mythic)   -- hand-authored data (Sonnet), linted
        |  node tools/forge/build.js <rig> [lines]                     -- same input -> same sha256
        v
tools/forge/out/<piece>.bank.png (G-buffer sheet: coverage, material, depth, tone)  + <piece>.meta.json (sockets, rims, bbox)
        |  node tools/forge/pack.js                                      -- base64 into classic scripts (F2)
        v
js/forge-bank/<line>.js  (one script per item line: `FORGE_BANK.<line> = {t1:{...}, t2:{...}}`, lazy <script> insert)
        |  runtime js/forge-rt.js: FORGE.compose(bank, {dir, anim, frame, pieces}) once per LOADOUT CHANGE -> cached sheet
        v
render.js drawPlayer / drawEnemy / drawNpc: ONE drawImage per frame (as hero.js's cached sheet today)
```
* **Runtime layering = depth resolve of baked pieces** (nearest layer wins per pixel, inner line between parts), which
  build.js already proves byte-equal to the offline render. No painter's-order table per direction is needed; the order
  falls out of the geometry (a cape behind the body in S, in front in N).
* **Composite on loadout change only**, never per frame. Budget: a full 8-dir × 43-frame composite ≤ 120 ms on the phone
  tier, time-sliced over 3 frames behind the equip animation; the bag's 3× paper doll composes one direction (≤ 10 ms).
* **Bank size**: chibi.knight.png is 32 KB for a whole loadout; per piece ≈ 18–30 KB PNG, ≈ 25–40 KB as base64. 342
  pieces ≈ 9–13 MB total, but a player loads only equipped lines (≈ 8 scripts ≈ 300 KB) plus the starter bundle. Lines
  load on first drop of that line (the drop toast covers the fetch). Pages lazy-insert `<script>` tags, file://-safe.
* **Tier and rarity parameterisation** (one table, `FORGE_FX`):

  | Axis | What changes | Mechanism |
  |---|---|---|
  | Tier T1 → T5 | geometry: each tier keeps the one below and adds plates, trim, gems, crests, wings; T5 "made of light" uses flat emissive mats | per-tier prim lists in the gear file (chibi-gear.js pattern) |
  | Mythic | T5 geometry + a unique part + hue-cycling emissive mats | 6th row |
  | Common / Uncommon | palette; Uncommon adds the trim material's glint tone | `tiers[].mat` palette swap |
  | Rare | + rim light in the implicit's element colour (Part 2 rim pass, static) | `rarityFx` |
  | Epic | + emissive mats lit (visor, gem cores), + a light (r 24, a 0.25) | `rarityFx.light` |
  | Legendary | + ELFX emitters pinned to sockets (weaponTip, chest gem), + a layered sound on swing | sockets × ELFX row |
  | Mythic | + aura (existing hero.js aura), + hue cycle, + a trail at 500 kills (§19.3) | `rarityFx.aura` |
  | Gems | the socket cell's pixel takes the gem ramp (exists) | material override |
  | Tempered | bright edge highlight (exists) | outline material swap |

### 1.5 Art budget in model units (the forge changes the unit from frames to model data)
| Content | Lines of model data (from chibi-gear.js: ~250 lines for a 6-piece suit line × 5 tiers) | Author days (Sonnet) |
|---|---|---|
| Hero rig + anims + base body, 2 hair styles, 3 skins | 400 | 3 (Opus: the rig and pixel pass) |
| 12 suits × 3 pieces × 6 tiers | 12 × 250 = 3,000 | 12 |
| 15 weapon lines + 3 shields + 3 companions × 6 tiers | 21 × 60 = 1,260 | 7 |
| Humanoid enemies + NPCs (knights, archers, chanters, villagers, Oathless, Vigils, Morrow) reuse hero gear + 6 enemy-only pieces | 500 | 3 |
| Beast rigs (quadruped, flyer, blob, golem) + 22 non-humanoid commons + 12 bosses | 2,400 | 14 (bosses are Opus) |
| **Total** | **≈ 7,600 lines** | **≈ 39 agent-days**, fully parallel, each line reviewable on the dressing-room board |
Frames per humanoid piece: 8 dirs × 43 = 344. Beasts: 4 dirs (S, N, E, W rendered; no mirroring either). Amorphous and
swarm: 1 dir. Bosses: scale 2–3 in a 96 or 128 px frame.

---

## Part 2 — Lighting and status architecture

### 2.1 Disagreement: a new light buffer vs extending what exists
EP wanted a full normal-mapped deferred pass (the forge can bake normals). TD: a per-pixel normal pass is a software
rasteriser cost we cannot pay on phone; every `getImageData` loop is the thing §26.4 removed. Resolved: **keep the
half-res coloured lightmap as the light buffer; add rim light and dynamic shadows as cached per-sprite blits driven by
the forge's rim masks**, and make bloom a strict emitter whitelist.

### 2.2 The architecture (one table; everything else derives)
| Layer | What | Cost model | high / phone / low |
|---|---|---|---|
| Light buffer | the existing half-res lightmap, coloured, multiplied; `lightPool` cap with hysteresis; ambient per section | one cached radial blit per light | 40 / 24 / 16 lights |
| Dynamic lights | every emitter pushes `{sx, sy, r, col, a, flicker, bloom}`: lit statuses (Burning r 24 a 0.3 flicker, Shocked r 16 a 0.35 strobe, Smitten r 20 a 0.2, Frozen r 16 a 0.2 cool), Epic+ gear, projectiles, world objects (braziers, conduits, ice glints), Pip, spells; `a ≤ 0.35` for statuses | per-light blit | same cap; status lights are the first to lose a slot (cost + 0.5) |
| Rim light | per entity: the forge rim mask for (frame, dir), tinted by the dominant light's colour, picked by the light vector quantised to 8; additive, alpha = light strength at the body; also the static rarity rim (Rare+) | 1 cached blit per lit entity | all entities ≤ 12 / hero + bosses + elites / off |
| Shadows | entity ellipse offset and stretched away from the strongest nearby light (vector, clamp 6 px); desktop adds the skewed silhouette for hero + bosses (TREE_SHADOW pattern); world props stay pre-rendered | 1 ellipse or 1 blit | silhouette / ellipse+offset / ellipse |
| Bloom | emitter-only, unchanged pipeline; new `bloom` weight per light (statuses 0.4, gear 0.6, spells 1.0, lanterns 1.0); a "no white-out" guard: ≤ 3 % near-white pixels in a 64 px window around any enemy (A7.3) | as today | full / half (every other frame) / off |
| Status layers on entities | `STATUS_FX[status]` = { tint, overlay sheet (char / ice / vine / rent / wet, cached per sprite), motif emitter pinned to sockets (head, hands, chest), light, pose (Frozen holds, Shocked jitters, Lifted hop), glyph } — applied at runtime over the composed sprite, never baked | overlay blit + emitter (ELFX, closed-form) | 12 / 6 / 3 emitting bodies |
| Status on the world | receivers and tiles (§33.5) push the same rows: burning grass tiles emit fire motif + light (cap 4 emitting tiles), ice tiles glint 1 light per 4 tiles, wet tiles 1 px rim; fog banks blown by wind (Part 3) | per tile emitter | 4 / 2 / 0 tiles |
| Status on the HUD | portrait rim pulses in the status colour; status row icons get the UIP motif (§32); the bar frame of a skill that would react shows the element dot; boss bar chips | UIP pool | 48 / 24 / 12 slots |
| Particles with physics | ELFX closed-form models + 2 new: `bounce` (gravity, ground plane at spawn height, restitution 0.4, 2 bounces: shards, embers landing, gems) and `drift` (constant wind vector sampled at spawn + gust phase; frame-skip safe) | closed form, no per-particle state | caps as §32 |
| God rays | keep only in forest / cave-mouth sections; the cached ray texture (RAYS) gets a wind phase (Part 3) and a 2-stop intensity by section mood; add canopy dapple lights (2–3 per covering canopy, r 24, a 0.3) | cached | on / on (cached) / off |
| Fog & mist | height-aware: fog alpha ×0.6 on raised tiles (the height data exists), mist pools baked per chunk in gutters and water edges (a mask, 1 blit per chunk), the clear zone stays; wind scrolls the layers along `WIND.ambient` | per chunk + 1–3 layers | 3 layers / 1 / 1 |

Rules: additive passes never stack on the same target more than twice (light halo + bloom); status light alpha ≤ 0.35;
lights from the same body merge into one record (a Burning + Shocked body pushes one light with the mixed colour).

### 2.3 Perf budget (phone tier = tools/perf.js, `?quality=phone`, CPU throttle; desktop = `high`)
| Phase | phone ≤ | desktop ≤ | Offset that pays for it |
|---|---|---|---|
| lights (lm + mul + halos) | 2.5 ms | 3.0 ms | status lights merge per body; `lightSized` cache already |
| rim | 0.4 ms | 0.8 ms | hero + bosses only on phone; mask blits are cached per (frame, dir, col8) |
| shadows | 0.3 ms | 0.6 ms | ellipse path unchanged; silhouettes desktop only |
| bloom | 1.2 ms | 1.6 ms | unchanged pipeline |
| status overlays + emitters | 0.5 ms | 0.8 ms | the per-draw spawn migration (§32 P2) returns ≥ 0.3 ms |
| fog + rays | 0.8 ms | 1.4 ms | mist pools are chunk-baked; rays cached |
| **frame p95** | **≤ 20.0 ms** on pine-fight with 6 status bodies + 4 dynamic spell lights + a burning grass ring | **≤ 16.7 ms** | gate on every lighting PR |

---

## Part 3 — Wind as a force

### 3.1 The field
`WIND.sample(x, y, t) → {vx, vy, s}` (tiles/s, strength 0..1) = **ambient + Σ emitters**, capped at |W| ≤ 3 tiles/s for props.
* **Ambient**: per map / section mood: a base vector (direction, 0.2–0.8) and the existing travelling gust front
  (`WIND.dx/dy/k`, period ~25 tiles, ~1.7 tiles/s) plus the two-frequency sway; closed form, no state.
* **Emitters** (≤ 4 live, pooled, oldest dropped): `{ kind, x, y, dir, r, force, life, falloff }`:

  | Kind | Shape | Sign | Source |
  |---|---|---|---|
  | vector | cone / line along `dir` | push | Gale, Tumble gust, Storm Sweep, Fans' Veil Dance, fog-bank verb |
  | radial | disc | push | Tempest, a wind blast landing, Shatter ring (weak) |
  | pull | disc | pull | Gravity Well (`vortex` tag), Singularity |
  | blast | ring, 0.15 s impulse | push | ultimates with the wind tag; the Lifted landing |
  | zone | disc, slow swirl | push (tangent) | windmill vents, Drifting Isles mood |

### 3.2 What it drives
| Receiver | Response | Cost |
|---|---|---|
| Trees | canopy frame = quantise(W·x̂ screen) → 5 frames (−2..+2 px on the top 60 %) instead of 3; the near band (≤ 60) samples the field, the far band keeps the ambient closed form; a blast adds a 2-frame whip then a decaying swing (per-tree phase, no state beyond `_fr`) | as today + 2 sheets |
| Grass / bushes / banners / lanterns / hanging roots | 2–3 frame flip by W sign and strength; lanterns swing (draw offset), banners stream along W | per visible prop, chunk-batched |
| Ground decals | leaf litter and petals shed `drift` particles when s > 0.6 (rate 0.5/s per decal in view, pooled) | ELFX |
| Particles | every `drift`/`rise`/`fall` model adds W sampled at spawn (frame-skip safe); smoke and fog layers scroll with ambient | 0 per frame |
| Projectiles | wind-element Buffeted drift (15°) exists; emitters add `force × 0.3` lateral drift to arrows and bolts inside the emitter | per projectile |
| Enemies | push = W × (1 − resist) × mass factor per family: beast 1.0, armoured 0.3 (Buffeted only), amorphous 0.5 (never Lifted), ethereal / flying 1.5; **elite ×0.5, boss ×0 (a 0.5-tile shove only inside `open ≥ 1 s` moves, per §33)**; the status side (Buffeted / Lifted / Drift) stays §33's | `applyWindForce` in the enemy update |
| Hero | pushed by emitters only (never ambient), ×0.5; a dodge ignores it; Buffeted on the hero per §33 | 1 sample |
| Fog banks / cloud banks (world verb) | blown along the emitter's vector: the bank's tilePatch moves and thins (§33.5 fogbank) | existing receiver |
| God rays, fog layers | scroll phase from ambient | 0 |

### 3.3 Disagreement: physical spring trees vs frame quantisation
GP wanted per-tree spring state (angle, velocity) for whip-back. EP/TD: 350 pines × state × integration on phone, and
the sheets would need many frames. Resolved: 5 quantised frames, the "whip" is a 2-frame override + a decaying phase
offset computed closed-form from the blast time; enemies and small props get real velocity (they already have `knock`).

Perf: `WIND.sample` ≤ 0.2 ms per frame for 60 trees + 40 enemies + 4 emitters (pure arithmetic, no allocation).

---

## Part 4 — Loadout v3: no hero skills, everything from equipment (most of the meeting)

### 4.1 The reading of the brief (one interpretation, everything derives from it)
* An **item line** (weapon variant, shield, companion) has exactly **3 skills: action, spell, ultimate**. They never change
  with tier or rarity; tier and rarity scale numbers and visuals (§23.4 parity rules stay).
* The **slot** the item sits in decides its keys: HAND → M1 / Q / Shift+Q; OFFHAND → M2 / E / Shift+E.
* The slot also decides the **role** of the action: a hand action is the primary combo (builds MP, carries the class
  passive); an offhand action is that class's **off-action** (a reactive verb: no MP, costs stamina). The spell and the
  ultimate are the same skill in either slot. That is what makes placement matter without doubling the skill count.
* **No hero skills.** Character skills 1/2/3, Dream Tomes and rune alternates are gone as hero-owned things and come back
  as **loot** (4.6).
* **Armour actives** stay §24's suits: chest = R, head = (D, see Choice 1), boots = F (every boots skill is the dodge
  with i-frames). **Belt or satchel** gives three pockets on Z / X / C.

### 4.2 Competing proposals, stress-tested
| | A "Mirror" | B "Lead / Support" | C "Deck everywhere" |
|---|---|---|---|
| Rule | any 1H in either slot, identical kit; 2H fill both slots with 6 skills | 1H in either slot; the slot changes the ACTION by class rule; spell / ult identical; 2H fill the hand and take a worn companion in the offhand | every item is a deck of pages; keys cycle |
| Placement matters? | no (fails the brief) | yes: combo vs reactive, class passive vs off-passive, which spell is on Q vs E | yes, but by menu, not by hand |
| Skill count | 6 per 2H (breaks "3 skills") | 3 per line + 5 class off-actions (shared) | explodes |
| Degenerate | dual-Orb beam ×2 | caught by: off-actions build 0 MP, one shared ult bar, pages share a 1 s rhythm | pad / touch unplayable |
| UI load | 12 keys | 12 keys + 2 chords | > 12 |
| Art cost | 0 extra | 5 off-action poses (block, brace, snapshot, ward, step) | 0 |
| Verdict | reject | **adopt** | reject; keep the deck idea for the mage's offhand only |

### 4.3 Slot matrix (the rule the engine enforces; `validate-ids` checks every pair)
| Item class | Hands | HAND slot | OFFHAND slot | Notes |
|---|---|---|---|---|
| Blades: Sword, Rapier, Mace | 1H | yes | yes (off-action **Parry**: 0.25 s window → riposte stagger 3, ICD 1 s) | Rapier's Riposte and Mace's Shield Bash fold into Parry / the shield lines |
| Shadows: Daggers, Claws, Fans | 1H | yes | yes (off-action **Step**: 0.6-tile sidestep with a backstab mark, no i-frames) | |
| Chakram | 1H | yes | yes (off-action = Shots' **Snapshot**) | the only 1H Shot |
| Foci: Wand (new, replaces Spellbook as a hand focus), Orb | 1H | yes | yes (off-action **Ward**: hold, a mana shield that pops to a nova on release) | Spellbook moves to the companions as the Grimoire |
| Greatarms: Axe, Hammer, Halberd | 2H | yes | — (takes a **worn** companion only) | **hold M1** = the 2H **Heavy**: the §23 1 s charge, ×1.8, poise (a property of the basic, as §23 words it) |
| Shots: Bow, Crossbow | 2H | yes | — (worn companion only) | **hold M1** = **Focus**: hold to aim, next shot crits (§23 Focus) |
| Foci: Staff | 2H | yes | — (worn companion only) | **hold M1** = **Channel**: the beam (§23 Orb's channel moves here), tap = bolt |
| Shields: Buckler, Heater, Tower | held offhand | — | yes | 3 skills each (4.4) |
| Companions (worn): Grimoire, Quiver, Warhorn | worn | — | yes, with any hand item | they float / hang: a staff + a grimoire, a bow + a quiver, an axe + a horn, a sword + a grimoire |
| Empty offhand | — | — | allowed | with a 1H in hand: M2 = that class's off-action at ×1.0, E / Shift+E empty; with a 2H: M2 / E / Shift+E empty. Never better than an item (no "two-hand bonus") |
Key count: 1H + 1H / shield / companion = 6; 2H + companion = 6 (M1 Q ⇧Q + the companion's M2 E ⇧E); 2H alone = 3; 1H
alone = 4. M2 always belongs to the offhand item. Two shields, two grimoires, a shield with a bow: impossible by the matrix.

### 4.4 The three skills per line (action / spell / ultimate) — re-homing §23
Weapon variants keep §23's **Q as the spell and R as the ultimate**; §23's E skills and rune alternates become loot (4.6).
Exceptions: Rapier spell = Flèche, ult = Perforate (Riposte → Parry); Mace spell = Crush, ult = Consecrate (Shield Bash →
the Heater's spell); Orb spell = Chain Lightning, ult = Tempest (its channel → the Staff's M2 and the Ward off-action);
Wand (new): bolt action, spell Frost Shards, ult Rune of Binding (the old Spellbook kit minus pages).
New lines:
| Line | Action (M2, hold) | Spell (E) | Ultimate (Shift+E) | Decision |
|---|---|---|---|---|
| Buckler | Parry+ (0.35 s window, reflects projectiles at T3+) | Bash: stagger 2, short dash | Aegis: 3 s, every parry restores 10 % HP | timing |
| Heater | Block: 70 % damage taken from the front, poise | Shield Bash (ex-Mace E): reflect mid-dash | Bulwark Charge: carry the first enemy hit (the §24 Bull Rush verb) | face the volley |
| Tower | Wall: 100 % front block, speed ×0.5, projectiles stop | Shove: a physical line knockback that spawns a wind *emitter* (Part 3; not a wind-element cast, so §33's ≤ 3 wind casts holds) | Fortress: a 4 s dome that blocks projectiles for everyone inside | hold ground or move |
| Grimoire (mage deck) | **Turn**: next page + a 0-MP cantrip bolt of that page's element | **Cast** the active page (its MP) | **Chapter**: casts every page in order over 1.5 s (full ult charge) | which page is up |
| Quiver (ranger deck) | **Nock**: next arrow + a quick snapshot | **Loose** the active arrow (Venom, Fire, Frost, Bola, Grapple, Split, Explosive…) | **Quiver Storm**: a rain of every arrow type | which arrow is up |
| Warhorn (warrior deck-lite) | **Shove**: guard-break push, stagger 1 | **Call**: the active call (War Cry, Rally, Taunt, Quake-call, Stand) | **Last Stand**: 4 s poise + 30 % damage, then −20 % speed for 3 s | when to call |
Pages (capacity by tier 2 / 3 / 4 / 5 / 6 / 6) are items: "Page of Firebolt", tier T1–T5 and a rarity, dropped like gems,
socketed into the Grimoire's page slots in the bag; the Quiver and Warhorn hold arrows and calls the same way. Pages are
**re-homed cast functions, zero new casts**: the 10 character skills (Second Wind, Arcane Orbit, Chain Lightning,
Dreamveil, Blessing, Shooting Star, Dawn Lance, Briar Field, Ember Mark, Thunderclap), Gale, the 15 rune alternates and
the 15 dropped E skills ≈ 40 pages / arrows / calls (mage ~18, ranger ~10, warrior ~8, 4 shared "any deck" pages such
as Second Wind). Reaction pages exist for every element, so the mage reaches every reaction.

Does the deck generalise? **Yes for Shots and Greatarms (Quiver, Warhorn), no for Blades / Shadows / Foci-1H**: those
classes express through dual-wield pairings (4.5) and would only get a worse grimoire. Three decks, no more.

### 4.5 Expression: passives, pairings, unlocks
* **Class passive** comes from the HAND item only (Blades' wide 3rd hit, Greatarms' poise, Shots' Focus, Foci's MP refund,
  Shadows' Marks). The OFFHAND gives its class **off-passive** (Blades: parry window +0.1 s; Shadows: Step leaves a
  decoy at T3+; Foci: cantrips cost 0 MP; Shots: snapshot crits; Shields: block costs stamina not HP; companions: none).
* **MP and charge**: only the hand action builds MP (8 / hit; off-actions build 0). **One shared ultimate charge bar**;
  either ult spends it (cast the one that fits the moment: the decision). Pages share a 1.0 s casting rhythm.
* **Grips** (named pairings; EFFECTS `src:'grip'`, tags never slot checks, ≈ 14, each a Codex discovery): Sword + Buckler
  "Vanguard" (a parry primes Sunslash +40 %), Daggers + Daggers "Twin Fangs" (Marks ×2 cap +1), Wand + Orb "Twin Stars"
  (Overload refunds 2 s), Staff + Grimoire "Archmage" (Chapter costs 80 charge), Bow + Quiver "Hunter" (Loose costs no
  Focus), Axe + Warhorn "Warband" (calls also Detonate), Rapier + Fans "Dancer" (Step shares Parry's ICD), Mace + Heater
  "Sanctuary" (one zone, no stacking, from §24), Hammer + Warhorn "Faultline", Chakram + Orb "Orbit", Claws + Buckler
  "Cornered", Sword + Grimoire "Spellblade" (pages retype Sunslash), Halberd + Quiver "Pike Square", Crossbow + Quiver
  "Arbalest" (clip 6). A Grip shows as a glint between the hands on the hero and an aura colour.
* **Unlocks** (what "new skills unlocked" means): variant mastery stays (§23.5: rank 3 = the second **form** of the spell,
  rank 5 = the hybrid twist); Grips are discovered; pages / arrows / calls are found (lore tablets, vaults, bosses, the
  Elder Stone sells one per zone); suit twists (§24) at 3 pieces; the belt's wrap boon; skill-variant legendaries (§26.3)
  now swap the spell for a sibling's. **Skill ranks 1–5 by use stay; modifier slots are cut** (the second form replaces them).
* **Degenerate builds and the cap that kills each**: Staff + Grimoire spamming 6 pages → the 1 s page rhythm + MP (pages
  cost full MP, the bolt builds it); dual-Orb → one Orb's off-action is Ward, not a second beam; Tower + anything → speed
  ×0.5 while walling, Wall costs 8 stamina/s; parry chains (Buckler + Blades off-passive) → the shared 1 s parry ICD;
  Chapter + Pip's Lantern → the amulet doubles only the hand ult; Echo (§30) replays hand actions and the Q spell only,
  never pages or offhand skills.

### 4.6 What this retires or re-homes (the lean DESIGN depends on this list)
| From | Status |
|---|---|
| §15 character skills 1/2/3, Dream Tomes, modifier slots | retired; the casts become pages / arrows / calls |
| §23 Q / E / R + rune alternates per variant | Q → spell, R → ult; E skills + runes → the deck pool |
| §23.5 two weapon slots + Changeover | retired (the offhand is the second weapon) |
| §23 Spellbook (pages on a hand weapon) | → Grimoire companion; Wand takes the Foci 1H seat |
| §24 Warden Bulwark, Juggernaut Brace as chest verbs | stay as chest actives; the shield lines own blocking proper |
| §19.4 belt | Belt (boon + 3 consumable pockets) or Satchel (3 pockets that also hold tools: bombs, traps, flasks, oils; +1 bag row; no boon) |
| §28 opening | **proposed, director to ratify** (it changes an approved §28 beat): the sword at 0:45, the Buckler from the slime ambush (replaces the boots), boots from Pinewood room 1; the first page from the Vale lore tablet |
| §30 Echo | replays hand action + Q only |
| HUD.md skill bar | 4 groups of 3 (4.7) |

### 4.7 Hotkey map (all three devices)
| Active | KBM (client-fixed) | Pad | Touch (wheel v3) |
|---|---|---|---|
| Hand action | Mouse 1 (hold) | RT | big attack button (Ø 96) |
| Offhand action | Mouse 2 (hold) | LT | second button (Ø 72) left of it |
| Hand spell | Q | RB | inner arc Q |
| Offhand spell | E | LB | inner arc E |
| Hand ultimate | Shift+Q | R3 (right-stick click) | the attack button's charge ring, tapped when full |
| Offhand ultimate | Shift+E | L3 | the offhand button's charge ring |
| Chest | R | X / □ | outer arc |
| Head | **D → see Choice 1 (V recommended)** | Y / △ | outer arc |
| Boots (dodge, i-frames) | F | B / ○ | double-tap move or outer arc |
| Pockets 1 / 2 / 3 | Z / X / C | D-pad left / up / right | outer arc, page 2 |
| Interact | Space | A / ✕ | context button |
| Bag / map / pause | Tab · M · Esc | Back · D-pad down · Start | buttons under the tracker |
Engineering: `input.js` needs **modifier-aware bindings** (`'Shift+KeyQ'` codes; Shift alone no longer dodges; the rebind
screen shows chords and refuses a chord whose base key is bound in the same context). Pad: R3 / L3 are free today. The
ult chord fires on key-down of Q while Shift is held, so Q-then-Shift never fires an ult by accident. UX: an ult that is
not charged shows the chord tag dim; the charge ring on the attack buttons replaces the gold slot on touch.

HUD skill bar (960 grid; V pending Choice 1): four groups of three 44 px slots — [M1 Q ⇧Q] [M2 E ⇧E] [R V F] [Z X C], gap 14 between
groups: 12 × 44 + 9 × 6 + 3 × 14 = 624 px from x 168 to 792; the potion slot goes (pockets replace it). Touch: inner arc
Q / E / R, outer arc V / F / Z / X / C with the page toggle as today.

---

## Part 5 — Tools, footprint, documentation

### 5.1 Tool list (deterministic generators and validators; all local, Node 24 / Python 3.13 / Playwright)
| Tool | Kind | Status |
|---|---|---|
| tools/forge/build.js + forge.js + pack.js + preview.html | sprite generator (8-dir sheets, banks, base64 scripts, dressing room, sha256, lint, byte-equal compose check) | reuse branch + retune (M4a) |
| tools/forge/icons.js | item icons rendered from the same models at a fixed 3/4 pose (24 × 24), so icon = item, deterministic; replaces hand icons for gear | new (M4a) |
| tools/forge/board.js | the side-by-side approval board (forge vs reference frame; tier strips; rarity FX strip) | new (M4a) |
| tools/fx-board.js / .html | ELFX + atlas board | keep |
| tools/maps/build.js, art-audit.js, engine-check.js, gen.js | map generator + audits | keep (other lane) |
| tools/balsim.js, tools/balance/sheets.js | balance | keep; add the loadout-v3 loop (hand × offhand × suit search, ±15 % parity, ≤ 60 % pick rate) |
| tools/validate-ids.js | ids | keep; add slot-matrix, page capacity, grip pair and hotkey-conflict checks |
| tools/save-migrate.js + fixtures | saves | keep; v5 (hand / offhand / pockets / pages) |
| tools/perf.js | perf gate | keep; add phase budgets from 2.3 as asserts |
| tools/smoke.js, play.js, act1-route.js, qa/run-big.js, qa/lib.js | tests | keep; play.js gains the 12-active routes on 3 devices |
| tools/freeze-trees.js | freeze procedural art to sprites.js | keep (generalise to `tools/freeze.js`) |
| tools/palette-lint.js | ramp validator: every material ramp 4 + glint, hue shift direction, contrast vs the outline; runs on forge models and ELFX rows | new (Haiku, M4a) |
| tools/check.js | one entry point that runs smoke → validate-ids → balsim → save-migrate → perf gate → forge lint in order (the "run suites one at a time" rule, enforced) | new (Haiku, M4a) |
| tools/docs-lint.js | DESIGN section numbering, dead cross-references, "superseded" markers | new (Haiku, M4a) |

### 5.2 Delete / retire list (paths; the M4a cleanup lane; items marked ⚠ wait for the owning lane)
Delete now:
* `tools/qa/old/` (259 MB, ~1,069 tracked PNGs + run JSONs) ⚠ coordinate with the QA lane; history purge is Choice 8.
* `tools/qa/dbg-equip.js`, `dbg-kbtitle.js`, `dbg-padtitle.js`, `dbg-stuck.js`, `dbg-stuck2.js`, `dbg-touch.js`,
  `dbg-touch.out.json` ⚠ (one-off debug scripts).
* `tools/shots-hud.js`, `tools/shots-m3-art.js`, `tools/shots-m3-ui.js`, `tools/shots-m3-ui-fixes.js`, `tools/echo-gate.js`
  (one-off milestone shot scripts; their scenes move into play.js's shot list).
* `tools/m1-world.js` (the M1 world build; superseded by tools/maps). `tools/engine-tour.js` (duplicate of
  tools/maps/engine-check.js; keep the latter).
* `tools/hero-preview.html`, `tools/icon-preview.html`, `tools/enemy-preview.html` (replaced by the forge dressing room
  and board). `tools/ui-preview.html`, `tools/music-preview.html` stay until their systems are touched again.
* `docs/boss.png`, `docs/mobile.png`, `docs/title.png`, `docs/loadout.png`, `docs/vale.png`, `docs/pinewood.png`,
  `docs/trolls.png`, `docs/editor-*.png` (2.7 MB of old-HUD shots; README links go to tools/shots at review time).
* `docs/meetings/2026-10-20-elements-design-draft.md` (superseded by the elements minutes).
* `tools/balance/*.csv` outputs (generated; regenerate on demand; gitignore `tools/balance/out/`).
Retire when the forge lands (M4a end; render.js still reads them today):
* `js/hero.js` (24×34 paper doll), `js/parts-art.js` (ASCII parts kit), the tree keys of `js/sprites.js` that
  `applySprites` overrides, `js/enemyart.js` (per enemy as its forge model lands), the `demo` rapier set, `js/icons.js`
  item icons (skill / misc icons stay).
* On the forge branch: `tools/forge/out/*` (generated), `models/chibi*.js`, `models/hero.js`, `models/wanderer.js` once
  `ref.js` is approved.
Keep: everything else in tools/, docs/meetings/*.md, docs/meetings/world-art/*.png (6 renders referenced by §29).

### 5.3 Documentation plan: the lean DESIGN.md (outline only; ≤ 700 lines; supersession by deletion, not by appending)
```
0  Hard technical rules (as today)                       7  Enemies, bosses, phases (§21, §26.1, cunning forms)
1  Pitch + story pointer (STORY.md)                      8  Elements: ladders, reactions, world verbs (§33, §32 pointer)
2  Progression, economy, saves (v5 schema)               9  Visual bible: sprite spec, forge pipeline, tier/rarity FX,
3  Loadout v3: slots, matrix, 3 skills, decks, grips,       lighting + status layers, wind field (Parts 1–3 of this file)
   hotkeys, armour suits, pockets (replaces §5/15/17/    10 World: maps, zone recipes, set pieces, acceptance bar (§25, §29)
   18/23/24 skill text; tier names stay as tables)       11 HUD / controls / UX pointers (HUD.md, CONTROLS.md)
4  Items: bases, tiers, rarities, affixes, trinkets,     12 Balance framework, caps, CI red flags (§20 + loadout loop)
   gems, pages, uniques (§4/19/26.3 merged)              13 Production: milestones, lanes, tools (PRODUCTION.md pointer)
5  Combat feel: hitlag, fling, telegraphs (§27, §31 M4)  Appendix A: tier name tables (§23.3, §24, PRODUCTION §24 + the 6 new lines)
6  Hero: Origins, mastery, Echo (§17.1, §23.5, §30)       Appendix B: decisions log (one line per client decision, dated)
```
Rules: every section is current truth; nothing says "supersedes"; old text lives in git, not in the file. PRODUCTION.md
keeps only the status table, the current milestone's lanes and the backlog; meeting minutes stay as the audit trail.

---

## DECISIONS
1. **Style = the reference's measurable rules** (1.1 table) with true 8 directions (never mirrored), 32 px hero in a
   48 px frame, 6-frame walk / attack with the reference timing, angular generated smears, 1 px outline, 4-tone
   hue-shifted ramps + glint.
2. **The sprite forge is the only sprite source for 8-dir sprites** (hero, gear, humanoid enemies, NPCs; beasts at 4
   dirs, amorphous at 1). Reuse `origin/claude/sprite-forge` tools/forge/* only; retune the rig to `ref.js`; add the
   pixel pass + lint; the client-approved side-by-side board is the M4a gate.
3. **Banks ship as base64 classic scripts per item line, lazy-inserted** (file:// safe, F2); runtime composite on loadout
   change only; one drawImage per frame.
4. **Lighting**: keep the half-res light buffer; add forge rim masks (8-way), light-aware entity shadows, a bloom emitter
   whitelist with weights, status layers at runtime (never baked), height-aware fog with baked mist pools, god rays
   only in forest / cave sections, particles with `bounce` and `drift`; phone tiers per 2.2; budget per 2.3; zero net
   phone cost per PR.
5. **Wind** = `WIND.sample` (ambient closed form + ≤ 4 emitters: vector / radial / pull / blast / zone); 5 canopy
   frames; props, particles, projectiles, enemies (with §33's resistance rows), hero (emitters only) respond; perf
   ≤ 0.2 ms.
6. **Loadout v3 = "Lead / Support"**: 3 skills per line; HAND → M1/Q/⇧Q (combo, MP, class passive), OFFHAND →
   M2/E/⇧E (class off-action, same spell and ult); slot matrix 4.3; two-handers take worn companions only; shields are
   an offhand-only class (Buckler / Heater / Tower); one shared ult bar; off-actions build 0 MP.
7. **No hero skills**: character skills, Dream Tomes, rune alternates and the dropped E skills become ~40 pages / arrows /
   calls (zero new casts). Decks: Grimoire (mage), Quiver (ranger), Warhorn (warrior); no deck for Blades / Shadows /
   Foci-1H. Spellbook → Grimoire; Wand is the new Foci 1H.
8. **Expression** = class passive (hand) + off-passive (offhand) + 14 Grips + suit twists + mastery forms + found pages;
   modifier slots and the §23.5 weapon swap are cut.
9. **Hotkeys** as the client fixed them, with modifier-aware bindings; pad R3 / L3 = ults; touch = two charge rings; the
   head key is Choice 1.
10. **Belt or Satchel** on one slot: belt = boon + 3 consumable pockets; satchel = 3 pockets that also take tools, no boon.
11. **Tools**: the list in 5.1; one `tools/check.js` runner; delete list 5.2; lean DESIGN per 5.3.
12. **Art is bought in model lines, not frames**: ≈ 7,600 lines / 39 agent-days for everything (1.5), parallel.

## Risks
| Risk | Mitigation |
|---|---|
| The forge reads "rendered" to the client | the pixel pass + lint + the side-by-side board gate before any content lane starts; a hand-painted frame set (3 frames) is the reference on the board |
| Bank download on phones (9–13 MB total) | per-line lazy scripts; the starter bundle ≤ 400 KB; measure first paint |
| Phone p95 with rim + status lights + wind | every lane names its offset; the gate is the local throttled perf run; low tier drops rim / status lights / god rays first |
| 12 actives + 2 chords overload touch | the wheel keeps 2 pages; the two charge rings; quick-cast tap stays; a one-thumb clear remains the test |
| Pages drown the bag | pages stack by id, sort into a "Pages" tab, 1 tooltip line each |
| Dual-wield parity explodes the balsim search space | the loop samples 4 kits per class pair, not the full product; CI red flag at > 60 % pick rate |
| The forge rig change invalidates the branch's gear files | gear files are bone-relative; `ref.js` keeps the bone names; `chibi` stays a fixture one milestone |
| ELFX phone cost (known) | unchanged: its own gate (A7) |

---

## Choices for the client
1. **Head hotkey (D collides with WASD move-right).** A: **V** (R / V / F column beside WASD; recommended) · B: G ·
   C: keep D and move walking to the arrow keys (not recommended).
2. **Hero scale.** A: **32 px body in a 48 px frame** (the reference's 26 × 32; recommended) · B: 40 px body in a 64 px
   frame (more detail, +60 % bank size, a map rescale).
3. **Sprite pipeline.** A: **reuse the forge branch, retuned** (recommended) · B: hand-drawn Aseprite frames (not
   reachable at 118 k frames) · C: drop the forge, keep the ASCII parts kit at 4 dirs (fails the brief).
4. **How banks ship.** A: **base64 scripts per item line, lazy** (recommended; file:// safe) · B: render in the browser
   with the forge at equip time (no download, ~1–3 s per loadout on phone, risky) · C: PNG files + a local server only.
5. **Mage arsenal.** A: **Grimoire pages** (recommended; generalises to Quiver and Warhorn) · B: rune sockets on the
   staff (3–4 extra spells, no companion) · C: spell scrolls in the satchel for everyone (no class identity).
6. **Two-hander offhand.** A: **worn companions** (Quiver / Grimoire / Warhorn; recommended) · B: no companions: a
   two-hander's M2 / E / ⇧E stay empty (3 keys, no new lines, less mage arsenal).
7. **Belt vs satchel.** A: **both, one slot** (recommended) · B: one belt with 3 pockets and a boon (simpler, no tools).
8. **Repo history.** A: **purge tools/qa/old from history with git filter-repo** (clone 300 MB → ~40 MB; a one-time client
   action, recommended) · B: delete going forward only.

## Proposed M4a / M4b

**M4a — foundations on a vertical slice (Vale + Pinewood; ≈ 5 weeks, 5 lanes in parallel).** Proves the vision: the
forge hero with four lines at every tier, loadout v3 with the 12 actives on three devices, lighting + status layers,
wind, the cleaned repo and the lean docs.
| Lane | Model | Owns (files) | Acceptance |
|---|---|---|---|
| Forge | Opus (rig, pixel pass, runtime) + Sonnet (gear lines) | tools/forge/*, js/forge-rt.js (implements the `HERO.build(look)` contract render.js already consumes, plus rim masks on the result), js/forge-bank/*; **no render.js** | ref rig approved on the board; Sword, Buckler, Staff, Grimoire × 6 tiers × 8 dirs, Warden suit × 6 tiers; sha256 stable; 0 lone pixels; ≤ 30 KB per piece; compose byte-equal; composite ≤ 120 ms phone; 3 humanoid enemies (knight, archer, chanter) |
| Loadout | Opus (engine) + Sonnet (UI) | js/data.js, items.js, itemdata.js, input.js, hud.js, menus.js, touch.js, game.js cast routing ⚠ (after the hotfix lane frees it) | 12 actives + 2 chords on kbm / pad / touch (play.js routes); slot matrix enforced; 12 pages live; save v5 round-trip; balsim parity ±15 % over Sword+Buckler, Staff+Grimoire, Sword+Daggers, Bow+Quiver at T1–T3 |
| Lighting + status | Opus | **all of js/render.js** (incl. the drawPlayer / drawEnemy swap to the forge-rt result), js/elfx.js, js/status.js (new; S1–S5 from §33) | rim ≤ 0.4 ms, lights ≤ 2.5 ms, status ≤ 0.5 ms phone; p95 ≤ 20.0 ms pine-fight (6 status bodies, 4 spell lights, grass ring); white-out ≤ 3 %; 8 reactions + statuses visible on entities, world tiles and HUD |
| Wind | Sonnet | js/wind.js (new), art.js canopy sheets (5 frames), freeze tool; render.js hook via `WIND.sample` only | ≤ 0.2 ms; 5 frames; Gale + Tumble + Gravity Well emitters; enemy push per the resistance table; Lifted boss = CI red |
| Cleanup + docs + tools | Haiku (deletes, check.js, docs-lint, palette-lint) + Sonnet (DESIGN rewrite) | tools/check.js, tools/docs-lint.js, tools/palette-lint.js, docs/DESIGN.md, docs/PRODUCTION.md, deletes in 5.2 | tracked repo ≤ 40 MB (after Choice 8) ; DESIGN ≤ 700 lines, docs-lint green; `node tools/check.js` green |
Gate: the client approves the board (forge vs reference) and plays the slice on phone and desktop.

**M4b — full content rollout (≈ 8 weeks; two art agents continuous).** Every line and suit at every tier, all enemies
through the forge, the deck pools, Act II Ruins, elements in the world, balance and QA.
| Lane | Model | Owns | Acceptance |
|---|---|---|---|
| Gear art A (suits) | Sonnet | tools/forge/models/suits/*.js | 12 suits × 3 pieces × 6 tiers, board-approved per suit; lint green |
| Gear art B (weapons, shields, companions) | Sonnet | tools/forge/models/weapons/*.js | 21 lines × 6 tiers; icons from forge; rarity FX strip per line |
| Enemy forge | Sonnet (commons) + Opus (bosses) | tools/forge/models/enemies/*.js, js/enemyart.js retirement | 28 commons + 13 bosses; Act I enemies replaced; bestiary portraits from forge |
| Skills content | Opus (8 new mechanics: parry-for-all, reload, frenzy, returning disc, decoy, cracks, channel, pages) + Sonnet (data) + Haiku (naming: T1–T5 + Mythic names for Wand, Buckler, Heater, Tower, Quiver, Warhorn under the §24.2 one-story-name rule; "The Names on the Pillars" moves to the Grimoire) | data.js, skills data, grips table, Appendix A names | 21 lines × 3 skills, ~40 pages / arrows / calls, 14 grips; ≤ 36 new casts; balsim loop green; naming pass docs-lint green |
| Act II Ruins | Sonnet (level) | tools/maps recipes, js/world.js | the §25 Ruins maps with the Broken Stair, 3 verb puzzles, elite pockets; bot run clean |
| Elements in the world | Opus | receivers, states, tilePatch, Pip's charge, Dream Oil, Opal, 15 objects (§33.5) | the old M4b list, numbers unchanged |
| Balance + QA | Opus (balsim) + Haiku (bot runs, shots) | tools/balsim.js, tools/qa | all red flags green; `run-big.js` all devices to the end of Act II |
Gate: 100 % of sprites forge-made (no legacy sheet drawn in play), phone p95 ≤ 20 ms on every zone shot, the lean docs
current, M4b ships to Pages.

## Client rulings (2026-10-22)
1. Hotkeys: **R = head, F = chest, V = boots (dodge)**. Movement stays WASD. (Replaces 4.7's R chest / D head / F boots.)
2. Hero scale: 32 px body in a 48 px frame (A).
3. Mage arsenal: Grimoire pages, generalised to Quiver and Warhorn (A).
4. Two-hander offhand: worn companions (A).
5. **Directions: 8 for every creature with a facing** (hero, gear, NPCs, humanoids, beasts, bosses); 1 only for amorphous / swarm. (Replaces 1.5's 4-dir beasts; model-line cost unchanged, render time and bank size for beasts ×2.)
6. Repo history: purge tools/qa/old with git filter-repo + force-push (A), done by the director after all open branches merge.
7. Director takes the recommendations on the rest: forge retuned (Choice 3 A), base64 lazy banks (4 A), belt and satchel on one slot (7 A).
8. **The hero follows the SlyNyrd reference sprite as closely as possible** (client license: personal projects). No source files: the forge lane recreates it from the blog images (kept in a git-ignored reference folder, never committed), fits the `ref` rig to them (proportions, palette, timing, poses), and the M4a board compares against those images.
