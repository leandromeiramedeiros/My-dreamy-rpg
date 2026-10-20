# Proposed DESIGN.md section (draft for the director to merge)

Numbering note: PRODUCTION.md already reserves "§32" for the VFX director's element particle language. If that section
lands as §32, merge this as **§33** and change the cross-references; the text below says §32 as the task named it.

---

## 32. Elements: roles, statuses, reactions and world verbs (elements meeting 2026-10-20; director-approved pending client decisions C1-C10)
Full minutes: `docs/meetings/2026-10-20-elements.md`. Supersedes §5b's status table and §15.4's "seven, no more"; amends
§20.2 (system 3 = "elements, reactions and world verbs"), §23.2 (Bow E, Halberd Q, Fans Q, Orb R lines) and the VFX
minutes' B2/B3 draft. The visual and data contract (VFX A2, A9, B4, B5) stands unchanged.

### 32.1 Roster
* **Hero damage elements (9):** slash, pierce (physical, kept split), fire, frost, lightning, nature, arcane, holy, **wind**
  (story name *Breath*). `DMG_ELS` and `RES_ELS` both list wind (`RES_SHORT.wind = 'Wi'`).
* **shatter** stays in `DMG_ELS` as the Shatter reaction's damage type only (no ladder, resist, gem or skill).
* **gloom** is enemy-only (Dread / Gloomed on the hero). **Wet** is a surface flag on bodies (no damage, resist or gem).
* Rejected or merged: earth → Rent + cracks + glyphs; water → Wet; light/dark → holy/gloom; poison → nature; blood → slash;
  void → gloom/arcane; time/gravity → tags; sound → cut.

### 32.2 Build-up and ladders (one mechanism; `js/status.js`, VFX B5 shape)
* Every elemental hit adds **build** = `25 · w · proc · (1 + statusChance + elementAmp)`; `w` = §27 weight, `proc` = §18.6
  proc coefficient (basic 1.0, projectile 0.6, zone tick 0.3, reflected 0.3, summon 0.4, Echo 0.5). Weak ×1.5, resist ×0.5,
  immune 0. Bosses ×0.25, elites ×0.5. Tiers at **50 / 100**. Decay 20/s after 1.5 s without a hit.
* **Two ladders live per body** (+ Wet + the stagger bar). Poison stacks ×3, Marks ×5; everything else refreshes.
* A reaction consumes its ladder and starts a **4 s (boss 8 s) reaction cooldown** on that body's tier 2. This is a cooldown,
  never a resistance: bosses are never immune to statuses (§5b).
* Cast options `burn / slow / freeze / stun` become build amounts through one mapping table (`freeze: true` = tier-2 build at
  once, so Frost Nova still freezes). Heals carry the `heal` tag, no element.
* Hero side: tier 2 is never a hard CC. Frozen → **Numb** (0.5 s root, dodge breaks it); Lifted → a 1-tile knockback; Rooted
  as today (dodge i-frames beat it); Dazzled → aim assist off 1 s; Shocked → MP regen 0 for 2 s; DoTs tick 2 % max HP / 0.5 s.
  Cleanse: potions (Cleansing Sash), shrines, holy skills, Dreamveil.

| Element | Role | Tier 1 | Tier 2 | Boss | Gem / hooks |
|---|---|---|---|---|---|
| fire | explosive force + burning | **Burning** 3 s: 14 / 0.5 s, +10 % fire dmg taken | **Ablaze** 4 s: tick ×2; every fire hit on it splashes 30 % to 1 tile; expiry burst applies Burning 1 tile | Ablaze allowed, tick ×0.5 | Ruby; `fireDmg`; `fireBurn`; Ashen Signet |
| frost | slow → stop → break | **Chilled** 3 s: speed ×0.6, wind-up ×1.2 | **Frozen** 1 s (boss 0.25 s): no action; **any physical hit Shatters**, a fire hit Thaws | never twice in 8 s | Sapphire; `frostDmg`; `frostPower`, `shatterRadius`; Tide-Edge (+Wet trail) |
| lightning | mini-stuns → chains | **Jolted** 3 s: 0.15 s micro-stun on apply (interrupts wind-ups ≤ 0.3 s; ICD 1.5 s; bosses flinch only), next lightning hit crits | **Shocked** 2.5 s: +20 % dmg taken; Shocked bodies ≤ 2 tiles arc to each other 10 % / 0.5 s | +10 %; arcs boss → minions only | Topaz (+1 jump / 2 grades); `lightningPower` (+1 s Shock), `conductJump` |
| nature | attrition + roots; the enabler | **Poisoned** 5 s: 8 / 0.5 s ×3 stacks, −20 % healing | **Rooted** 1.2 s: can attack, can't move | Rooted → 1 s Chilled | Emerald; `naturePower` |
| arcane | reliable neutral; marks | **Marked** ×5, 6 s: +4 % taken / mark; ignores 50 % resist | **Unravelled**: 5 marks → 30 % weapon dmg each, 1 s speed ×0.5 | marks ×0.25 build | Amethyst; `markCap` (un-dormed at S4), `arcanePower` |
| holy | gloom answer; cleanse, reveal | **Smitten** 4 s: +50 % holy taken if gloom, +15 % else | **Dazzled** 1.5 s (boss 0.4 s, once / 10 s): loses its target | reveals Morrow's mirror | no gem; `holyDmg`, `resHoly`, `holyPower` |
| slash | wounds, armour break | **Bleeding** 4 s: 6 / 0.5 s, ×2 while moving | **Rent** 4 s: −15 % def (boss −8 %), +1 stagger per hit | stagger bar = tier 3 | `slashDmg`; implicits |
| pierce | precision, exposure | **Pierced** 3 s: +10 % crit vs it | **Pinned** 0.6 s (boss 0): stun + stagger +1 | Pierced only | `pierceDmg`, `pierce` |
| **wind** | displacement + spread | **Buffeted** 3 s: pushed 1 tile along the gust; wind-up ×1.2; its projectiles drift 15° | **Lifted** 0.8 s (elite 0.4 s, boss never): knocked up (hop offset, still hittable), drawn 1 tile to the gust's centre, lands with 0.3 s stun; flying = grounded 1.2 s; armoured → Buffeted only | never Lifted; Buffeted = 0.5-tile shove in `open ≥ 1 s` moves | **Opal** (C3): armour speed / `resWind`, weapon chargeSpeed, amp = radius; `windPower`, `driftReach` |
| Wet (surface) | enabler | standing in / under water, rain zones, Tide-Edge trail; lasts 4 s | – | only by arena rule (Mirelle bar 2) | – |
| gloom (enemy) | hero debuff | **Dread**: −15 % dmg dealt, −20 % MP regen | **Gloomed** 3 s: vignette, −10 % resists in gloom areas | – | `resGloom`, Amethyst |

### 32.3 Reactions: eight named, all readable (ceiling 8)
| Reaction | Trigger | Effect |
|---|---|---|
| Shatter | physical (slash / pierce / stagger ≥ 1) on Frozen or 3× Chill | consumes; 150 % weapon dmg AoE 1.5 tiles, typed shatter |
| Wildfire | fire on Poisoned | consumes; Burning spreads 2 tiles |
| Conduct | lightning on Chilled **or Wet** | Shock jumps to every Chilled / Wet body within 3 tiles |
| Overload | arcane on Shocked | consumes; +40 % dmg, −1 s cooldown |
| Purify | holy on Burning / Poisoned | consumes; heals 5 % max HP, +50 % vs gloom |
| Rupture | pierce on a full stagger bar | consumes the break; guaranteed crit (Medium rule: spreads Poison) |
| Detonate | stagger ≥ 3 on Burning | consumes Burn, 30 % weapon dmg per stack |
| **Drift** | wind on a body with any tier-1 status | that status is carried to every body in the gust (≤ 6, build ×0.5, 1 Poison stack / 1 Mark, never tier 2) |
* Each has a unique input pair, a name pop, its own sfx (`rx_drift` added) and motif, and a bestiary line.
* **Silent interactions (no pop, no sfx; 4, may grow to 6):** Thaw (fire on Frozen: ends it, +15 %, cosmetic steam that never
  hides a telegraph), Quench (frost ends Burning, applies Chilled), Flash-freeze (frost on Wet → Frozen at once, ICD 6 s),
  Dry (fire or 2 s of wind ends Wet).
* **Cascade bound:** a status applied by a reaction is `viaReaction` (1 s lockout, build ×0.5); chain depth 2; reaction dmg
  ≤ 300 % weapon dmg/s per body; the shatter-typed AoE starts no ladder. Reaction share stays 20-30 % of DPS (≤ 40 %).

### 32.4 Wiring
* **Skills:** Gale (new character skill, Act I tome at Hawk's Rest on the main route: cone gust, Buffeted, the Drift
  carrier); Bow E Tumble adds a 0-dmg gust on its aim side; Halberd Q Sweep → wind (Storm Sweep = wind + lightning); Fans Q
  Veil Dance → wind; Orb R Tempest = lightning + wind; Gravity Well keeps arcane and gains the `vortex` tag; Dreamveil applies
  no ladder. Every class reaches fire, frost or lightning plus wind through a variant, rune or character skill; nothing is
  mandatory (the Duelist build stays whole). ≤ 3 wind casts; the §23 cap of 36 holds.
* **Gems:** `elementAmp` adds build as well as damage. A **Radiant** element gem in the weapon retypes 30 % of basic-attack
  damage to its element (build ×0.3) and counts as that element for world receivers (tooltip says so).
* **Affixes / boons / uniques:** `windDmg`, `resWind` fall out of the lists; `statusChance` un-dormed at S1, `markCap` at S4;
  ring boons `windPower`, `driftReach` (in `RING_EL`); Tide-Edge's trail is frost + Wet; Root-Crown reads "bosses stay Rooted
  1 s"; no new uniques (cap 19).
* **Echo (§30):** wind is excluded from the argmax; Echo hits apply no wind status; Echo build ×0.5.
* **Enemies:** family rows — beast neutral; armoured resist wind (Lifted → Buffeted); amorphous resist pierce and Lifted;
  ethereal and flying weak wind; fire-aligned immune Burn; frost-aligned weak lightning (Wet); gloom weak holy. The elite
  `frozen` mod becomes **Rime** (Chill aura + the elite is Wet) and is no longer rare.
* **Bosses:** `phases[].res / el` may shift a weakness **once per fight**, re-revealed on the bar (Mirelle bar 2 = Wet arena,
  bar 3 weak fire; Kharzul bar 4 weak stagger). Act I bosses do not shift.
* **Consumables:** Dream Oil per element (Elder Stone, Dust): coats the weapon 60 s, basics count as that element (build ×0.3);
  a world key. Cooked fish keep §13's resist / element lines.
* **Pip:** carries a **charge** from a world source (lit brazier = fire, rime crystal = frost, storm crystal = lightning, dawn
  shrine = holy) to a receiver within 8 tiles (a 3 s flight on the §28 light); M7 companion rule "flare" Dazzles the enemy
  attacking you (ICD 12 s).
* **Gear loop:** each elite pocket near a boss is themed on the boss's weakness and guarantees a matching-element Rare on
  first clear.
* **Saves:** no item fields; `e.status` is runtime; `G.prog.state[map][id]` is a tolerant addition; no version bump.

### 32.5 World verbs (elements on objects: the same registry, receivers, build)
* **Primitives:** a **receiver** (`el: { accept, build, oil }` on an object, hit through `hitReceivers(x, y, r, el, w)` from
  the four hit sites), a **state** (`o.state` from `states[]`, action `setState`, saved and replayed on settle like
  `openGate`), a **condition** (WHEN `object_state`, WHEN `element_hit`; StoryCondition atoms `state:`, `hits:`), plus
  `tilePatch { tiles, life }` with `dirtyChunk` (≤ 4 chunks, time-sliced; also the Grotto's tide).
* **Objects (15):** torch, brazier (lit / unlit), bramble, icewall, seed (vine), conduit, fogbank, windmill, raft (two bridge
  tile sets A / B, never animated), glyph, seal, crystal_wall, vent, rime_crystal, storm_crystal (+ the shrine as a dawn
  source). Tiles `i` ice and `o` obsidian appear only through patches, inherit the bank's height, revert on expiry and push
  the hero to the bank. Grass props burn (fire zone r 0.7, spreads 0.4 s / tile, cap 16 tiles, 4 emitting, one fire per map).
* **Verbs:** light / extinguish torches and braziers · burn brambles and webs · melt ice walls · freeze rivers, ponds and
  tide pools into bridges · freeze waterfalls into climbs · thaw · power conduits (the Wardens' wire) · blow fog and cloud
  banks · spin windmills · push rafts · grow vines and bridges · reveal glyphs and hidden walls · break holy seals · shatter
  crystal walls (frost then physical) · Wet surfaces · grass and oil fire spread · freeze a lava crossing (Caldera, 8 s).
* **Rules:** (1) **never gate main progress on a specced element**: every main-path verb has a world source within 20 tiles
  (Pip's charge) or a Dream Oil at the Stone; the generator audit fails any main route that needs a `via`; (2) one of the
  five secrets per map is the elemental secret, skill-only (`oil: false`), hinted by Pip; (3) **3 verb puzzles per big map**
  (teach / shortcut / secret), 1 in the Vale, 0 in arenas; (4) one new verb per section; (5) nothing is a trap (thaw pushes
  you out, fire never blocks the only exit, rafts wait); (6) lasting states persist (lit, grown, broken), transient ones
  reset (ice, fog, fire).
* **Placement:** Vale: the torch room under the Dreamer's Cairn (3 sconces, Pip carries the hearth's flame, the hidden door).
  Pinewood: brambles on the Warrens door, the creek freeze at the ford islet (replaces the lever bridge), the grass-fire boar
  den from Hawk's Rest (+ the Gale tome). Ruins: conduits across the plaza to the Crypt, the Reliquary's holy seal, the
  Belfry glyphs (the Names). Grotto: freeze the tide pool, melt the Vault's ice wall, shatter the Shallows' crystal wall.
  Caldera: the Forge Deep windmill, the frozen lava path, extinguish the four forge braziers. Spire: blow the cloud bank,
  the Vigil Walk seal, the void raft. Isles: rafts as the rift-hop, a three-isle conduit chain.
* **Editor / generator:** state dropdown + preview, four new cards, a `tilePatch` ghost, a problems check; `OBJ` rows,
  `via` secrets, five puzzle stamps (torchRing, fordFreeze, grassRing, wireRun, sealDoor).

### 32.6 Visuals (per the VFX minutes; nothing new per frame)
Wind = the A9 curl row (teal, `dash`, no light); Buffeted = tint + 1 px sideways offset; Lifted = the §27 hop offset ×1.5 +
3 curls. Drift = the carried element's motif in a ring. Wet = tint + a 1 px highlight, droplets on apply, a baked 2 px rim
on wet tiles. Ice tiles and walls use the frost ramp with ≤ 1 glint light per 4 tiles. Holy base colour is pale white-gold
(D1 B). Phone p95 ≤ 20.0 ms with 6 status bodies and one burning grass ring in view (A7 gate).

### 32.7 Schedule and scope (≈ 36 agent-days of new work; client-authorised)
* **M4a** Act II Ruins + statuses S1-S5 + the eight reactions + Wind combat (Gale, Tumble gust) + bestiary + combo layer +
  Thief/Origins (+ ≈ 6.5 d on the planned lanes).
* **M4b (new) Elements in the world** (~4 weeks, two agents + art): receivers, states, `tilePatch`, Pip's charge, Dream Oil,
  Opal, 15 objects, grass fire, generator + editor, the Vale / Pinewood / Ruins puzzles, balsim + CI (≈ 22 d).
* **M5** + Wet, icefall, crystal, tide patch, Grotto puzzles, Mirelle's shift (+4 d) · **M6** + windmill, vents, frozen lava,
  extinguish, Caldera puzzles, Kharzul's shift (+3.5 d) · **M7** + fog banks, rafts, Pip's flare, Spire / Isles puzzles (+3 d).
* **CI red flags added:** a Lifted boss; more than 8 named reactions; a main route that needs a `via`; reaction share > 40 %
  with Drift; an ice patch over 24 tiles; two grass fires on one map.
* **Cut order if M4b slips:** raft → windmill frames → fog bank → Opal (Wind amplifies through rings only) → the Ruins'
  shortcut puzzle. Never cut: Pip's charge, the torch room, brambles, the creek freeze, Gale, Drift.
