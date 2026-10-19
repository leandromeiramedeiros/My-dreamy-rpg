# My Dreamy RPG — Design Bible (Director's document)

Every studio member reads this before touching code. If the code and this file disagree,
raise it in your report; do not silently invent a new schema.

## 0. Hard technical rules

* **Runs from `file://`.** Classic `<script>` files, shared globals, no ES modules, no bundler, no npm runtime deps.
* Any new `js/*.js` file must be added to **both** `index.html` and `editor.html` (editor play-tests the game scripts)
  in the right order. Prefer extending existing files over new ones.
* Scene renders at 480×270, scaled 2×. HUD is 960×540. Keep pixel-art crispness (nearest-neighbour).
* `js/world.js` is editor-owned data (maps, triggers, tuning, enemies). Extend it through its existing format so
  `editor.html` still loads and edits it. Generate big map data with a node script under `tools/` rather than hand-typing.
* Must stay 60 fps on a mid laptop. Particles are pooled/capped (hard cap ~600 live particles).
* Before declaring done: `node tools/smoke.js` must pass (zero console errors on all scenes).
* Save game lives in `localStorage` key `dreamy.save.v1`; wrap every access in try/catch.

## 1. Pitch

*"The Dream is unravelling."* A short, complete action-RPG on floating islands. **About 2 hours from title to credits on the main path** (first run, average player), plus ~45 min of optional content.
Albion-style "you are what you wear" skills, Diablo-style loot with rarity, sockets and gems, and a hero whose
gear visibly changes him — the better the gear, the more it glows.

## 2. Story (brief but competent)
> **Superseded by `docs/STORY.md`** (premise, twist, endings, beat sheet with final lines, every boss and mini-boss,
> the BOSS_MOVES library). The table below is kept for the zone order only.

**Hero:** Aerin, a young Dreamwarden who wakes in the Whispering Vale with no memory and a dim lantern-spirit, **Pip**.
**Antagonist:** **Morrow, the Unwaking King** — once the first Dreamwarden, he refused to wake when his dream ended,
and now drags every island into his endless night. The **Gloam** (shadow-stuff) is his dream leaking out.
**Goal:** Relight the four **Dawn Shards** guarded by corrupted Wardens, then climb the Sleepless Spire and wake Morrow.

| Act | Zone | Beat | Guardian (boss) |
|---|---|---|---|
| Prologue | Whispering Vale (hub) | Aerin wakes. Pip explains the Gloam. Tutorial on dummies, first loot chest. The Elder Stone (hub NPC) | — |
| I | Misty Pinewood | Forest creatures are fleeing. Ogres and trolls gone mad. | **Old Bramblehorn**, troll king — Shard of Root |
| II | Gloomspire Ruins | The ruined Warden temple. Reveals Morrow was a Warden. | **The Gloam Warden** (existing boss) — Shard of Stone |
| III | Sunken Grotto (new) | Flooded crystal caves, glowing water, frost/crystal enemies. | **Lady Mirelle**, drowned Warden — Shard of Tide |
| IV | Emberfall Caldera (new) | Volcanic island, lava rivers, fire imps, golems. | **Kharzul the Cinder Colossus** — Shard of Flame |
| Finale | Sleepless Spire (new) | Night sky, starfields, gloom knights. Pip's sacrifice is hinted. | **Morrow, the Unwaking King** (3 phases) |
| Epilogue | Whispering Vale at dawn | Islands heal. Credits. New Game+ unlocked (keep gear, enemies ×1.6). | — |

Pip **does** sacrifice itself in the finale: it becomes the Dawn Burst ultimate (§7) and is gone in the epilogue,
rekindled as a tiny flame after the credits. Story delivery: short dialogue boxes (portrait + name + 1–3 lines, click/tap/space to advance), banners on zone entry,
a lore tablet or two per zone. No cutscene engine needed beyond a `dialogue` trigger action and camera pan.
Each zone ends with the guardian's last words revealing one piece of Morrow's story.

## 3. Progression

* **Level 1 → 40** (see §11 for bands). XP from kills, chests, room clears. Curve: `xpToNext(L) = round(60 * L^1.55)`, tuned so a level-up
  lands roughly every 2 minutes.
  Target levels: Vale 1–3, Pinewood 3–10, Ruins 10–17, Grotto 17–24, Caldera 24–31, Spire 31–38; 39–40 optional/NG+.
* Per level: +4% base HP, +3% base damage. **No talent tree** (cut, see §5).
* Death: respawn at the **last checkpoint shrine touched** with full HP, lose 10% of the current level's XP progress.
  Trigger state (fired triggers, cleared rooms, opened gates, opened chests) **persists** across death and in the save;
  only the encounter you died in resets. Boss fights restart cleanly.
* **Balance rule:** all gear, affix and gem bonuses are **additive** into one sum per stat (e.g. one `power` %),
  then multiplied once. Temporary buffs stay multiplicative but are capped. No 10× stacking.
* Checkpoints / autosave on zone entry, after each boss, and on inventory close.

## 4. Items

### 4.1 Item instance schema (single source of truth)
```js
{ uid: 'i_123', base: 'dawnblade', slot: 'weapon'|'head'|'chest'|'boots',
  rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic',
  ilvl: 12, reqLvl: 10, affixes: [{ stat: 'crit', v: 0.06 }], sockets: [null, 'ruby_2', null] }
```
The bases (`ITEMS` in `data.js`) stay the "family" that decides the skill set (sword/staff/bow, helm skill, etc.).
Bases gain tiers so higher-level versions exist: e.g. Sword family = Rusty Blade (L1) → Dawnblade (L6) → Sunforged
Blade (L14) → Aurora Edge (L22) → Dawn Eternal (legendary, L28). Same for staff, bow, and each armour set.

### 4.2 Rarity tiers
| Rarity | Colour | Stat mult | Affixes | Max sockets | Visual tier on hero |
|---|---|---|---|---|---|
| Common | `#d8d8d8` | 1.00 | 0 | 0–1 | plain |
| Uncommon | `#6ee36e` | 1.15 | 1 | 1 | faint rim light |
| Rare | `#5aa8ff` | 1.35 | 2 | 1–2 | soft glow + occasional sparkle |
| Epic | `#c070ff` | 1.60 | 3 | 2–3 | pulsing glow + trailing motes |
| Legendary | `#ffb030` | 1.90 | 3 + unique power | 3 | strong glow, orbiting embers, light on ground |
| Mythic | `#ff4f7a`→ animated | 2.30 | 4 + unique | 3 | aura, rising particles, colour cycling, bloom |

Mythic is the apex: in the first run it drops only from **Morrow** (guaranteed one) and the secret cache in the Spire;
in NG+ it rolls everywhere. Legendary first-run drops are the **five named uniques** (§4.5).

Drop weights by enemy class (normal / elite / boss) scale with zone; bosses guarantee ≥ rare and first-kill legendary.
Required level gates equip; the inventory shows red requirement text and refuses.

### 4.3 Sockets and gems
* Items roll 0–3 sockets within their rarity cap. A rare **Socket Rune** adds one (max 3).
* Gems: 6 types × **3 grades** (Chipped, Clear, Radiant). 3 of a grade combine into the next at the
  Elder Stone. Gems can be removed for free (they return to the bag). A first run should socket 12–15 gems.
* **Build identity = weapon family + element + the gems that amplify it.** Amplification is the chase, not affixes.

| Gem | Stat in armour | In weapon | Skill amplification (any slot) |
|---|---|---|---|
| Ruby | +HP | +damage % | Fire skills +% dmg, fireball/meteor gain burn |
| Sapphire | +MP & MP regen | +cooldown reduction | Frost skills slow longer, frost nova radius + |
| Emerald | +HP regen | +attack speed | Heals and Mend stronger; poison on hit |
| Topaz | +crit chance | +crit damage | Lightning skills chain +1 target per 2 grades |
| Amethyst | +power % | +skill damage | Arcane/void skills +area radius |
| Diamond | +defence % | +all stats small | Ultimate (R) cooldown −% |

Each skill in `SKILLS` gets an `element` tag (fire/frost/nature/lightning/arcane/physical/holy) so gems can amplify it.

### 4.5 Named legendaries (one per guardian, first-kill guaranteed)
Each changes a skill's *rule*, not just numbers:
* **Root-Crown** (helm, Bramblehorn): Snare / Frost Nova roots bosses for 1 s.
* **Warden's Lantern Plate** (chest, Gloam Warden): Bulwark reflects projectiles.
* **Tide-Edge** (sword family, Mirelle): Dash Strike leaves a frost trail that slows.
* **Cinderstride Boots** (Kharzul): the boots skill leaves a fire trail and grants lava immunity for 2 s.
* **Dawn Eternal / Morrowbane** (Mythic weapon, Morrow): R ultimate resets on boss phase change.

### 4.4 Inventory
* Bag: 30 slots (grid 6×5), stackable gems/potions. Equipped panel shows the paper-doll hero rendered live with gear.
* Tooltips: rarity-coloured name, ilvl/req, base stats, affixes, sockets, skill list, compare vs. equipped (green/red deltas).
* Actions: equip, unequip, socket gem (drag or click-select), salvage into **Dream Dust** (spent at the Elder Stone on
  Socket Runes and Chipped gems; **no affix reroll**). Potions: health potions on a hotkey (4), 3 charges, refilled at checkpoints.

## 5. Skills
* Weapon gives LMB + Q/E/R; chest F, helmet C, boots Shift (existing system kept).
* Character skills 1/2/3 unlock by level: 2 at L1, more at L5, L10, L15, L20 (8 total: existing 6 + 2 new).
* Skill modifiers come from per-skill ranks (§15.2).
* **Universal dodge:** every boots skill has ≥0.25 s i-frames so telegraphs are fair for every build.
* **Kill-heal** (existing +HP/+MP per kill) scales with a kill streak (`p.combo`).
* Weapon skill options (two choices per slot) unlock with weapon tier: second option at weapon reqLvl ≥ 10.

## 5b. Damage types, resistances and weaknesses (revised after expert review)
**Damage types (tags on every hit):** **slash, pierce** (the two physical types), **fire, frost, nature, lightning,
arcane, holy**, plus enemy-only **gloom** (Morrow's void). There is no blunt type: heavy hits carry a `stagger` value
(0–3) instead, which is what "blunt" means in play (clubs, golems, shield bash).

**Who deals what** (authoritative tags live in `data.js`; Haiku owns the tagging pass):
* **Sword = slash:** Dawn Cut, Sunslash, Dash Strike, Whirling Blade; Heroic Strike slash + stagger 3; Judgement and Dawn Wave holy.
* **Staff:** Arcane Bolt, Barrage, Gravity Well arcane; Firebolt, Meteor fire; Frost Shards frost; Starstorm holy.
* **Bow = pierce:** Moon Arrow, Multishot, Piercing Shot, Rain of Arrows pierce; Snare nature; Moonbeam holy.
* **Armour/character skills:** Bulwark shove, War Cry, Charge deal slash with stagger 2–3; Frost Nova frost; Chain Lightning
  lightning; Shooting Star fire; Arcane Orbit arcane.
* Gems in a **weapon** can convert part of the weapon's damage (Radiant Ruby in a sword: 30% of slash becomes fire).

**Status effects (five; each readable in one hit):**
| Type | Status | Effect |
|---|---|---|
| Slash / pierce + stagger | Stagger | hits fill a stagger bar (`staggerMax`); full = stun (bosses: 2 s break window, bar shown) |
| Fire | Burn | damage over time 3 s, stacks ×3 |
| Frost | Chill → Freeze | slow 30%; 3 stacks = 1.2 s freeze (bosses: slow only) |
| Nature | Poison | damage over time 5 s (Burn's code, green), −20% enemy healing |
| Lightning | Shock | next hit taken +20% (no arc; Chain Lightning already arcs) |
* **Arcane** has no status: it ignores 50% of the target's resistance (the reliable "neutral" element).
* **Holy** has no status: +50% damage against gloom-tagged enemies.
* **Gloom (enemy only)** applies **Dread**, the only hero debuff: −25% MP regen for 3 s, cleansed by holy skills or Dreamveil.
* Status chance = skill base chance + the matching gem's bonus.

**Enemy resistances: hand-authored tiers.** weak −50%, neutral 0, resist +50%, immune +100% (bosses only, only to their
own element, never to statuses). Default is `res: {}` (all neutral); authors list only non-zero entries.
Damage = `dmg × (1 − res)`; arcane uses `res × 0.5`. Archetypes make weapon choice felt:
* **Armoured** (gloom knights, golems): resist slash, neutral pierce, high stagger threshold with a long break window.
* **Amorphous** (slimes, jellies): resist pierce, weak to slash.
* **Ethereal** (wisps, shades): resist slash and pierce, weak to holy and lightning.
* **Beasts** (hounds, ogres, trolls): neutral physical, weak to fire or frost by zone.
```js
golem: { name: 'Cinder Golem', ai: 'brute', hp: 1400, element: 'fire', dmgType: 'slash', stagger: 3, staggerMax: 6,
  res: { slash: 0.5, pierce: 0.5, fire: 1.0, frost: -0.5 }, tags: ['armoured'] }
```

**Hero resistances: continuous and additive** (per the §3 balance rule), clamped to **[−50%, +60%]**.
* **Chest family sets the hero's built-in strength and weakness (±25%), always shown on the portrait:**
  Plate: slash/pierce +25, lightning −25 · Robe: arcane +25, slash/pierce −25 · Jacket: pierce +25, fire −25.
  Helmets and boots give skills, not resistances, so the player only has one thing to read.
* **Armour-socketed gems:** Chipped/Clear/Radiant = 10/20/30 to their element: Ruby fire, Sapphire frost, Emerald nature,
  Topaz lightning, Amethyst arcane and gloom; Diamond 5/10/15 to everything.
* **Affixes:** `resSlash`, `resPierce`, `resFire`, `resFrost`, `resNature`, `resLightning`, `resArcane`, `resGloom` (10–20),
  `resAll` (10, legendaries).
* **No hidden temporary weaknesses.** Gloom areas apply a visible "Gloomed" tint (−10% all resistances) tied to a
  trigger area and cleansed at shrines.

**Zone identities:**
| Zone | Enemies deal | Enemies weak to | Enemies resist |
|---|---|---|---|
| Pinewood | slash, nature | fire; beasts weak to slash | nature; trolls resist pierce |
| Ruins | gloom, arcane, slash (knights) | holy, pierce; wisps weak to lightning | arcane; knights resist slash; wisps resist physical |
| Grotto | frost, lightning, pierce (crystal shards) | lightning, fire; slimes weak to slash | frost; slimes resist pierce |
| Caldera | fire, slash + stagger (golems) | frost; golems break easily under stagger | fire (immune to Burn); golems resist slash and pierce |
| Spire | gloom, arcane, all | holy | gloom; knights resist slash |

**Teaching it without a wiki:**
* Damage numbers are coloured by type; WEAK is large and yellow, RESIST small and grey, IMMUNE shows "IMMUNE".
* The **first weak or resist hit against an enemy type** pops a 1.5 s nameplate ("WEAK: FIRE") and from then on that
  enemy's weakness and resistance icons show beside its health bar. That is the whole bestiary.
* Boss bars always show weaknesses. The inventory shows the hero's resistances as one row of icons with numbers,
  with compare deltas when hovering gear or gems.

## 6. Hero visuals ("you see what you wear")
* Base hero redrawn at higher detail (≈24×32 px instead of 16×24): face, hair, cape, hands, shading, 4-dir-ish (front/back,
  mirrored sides), walk (4 frames), idle breathe, attack pose.
* **Layered paper-doll**: body → boots → chest → cape → helmet → weapon. Each base item has its own overlay sprite
  (not just palette swap), and tiers within a family visibly upgrade (more trim, pauldrons, crests, gem insets).
* Rarity FX on each equipped piece, driven by a single `rarityFx(tier)` table: rim glow colour, glow alpha, pulse speed,
  particle rate, particle kind (sparkle / mote / ember / star), light radius added to the lightmap. Mythic gets an aura.
* Socketed gems are visible as coloured pixels on the item.
* Same renderer draws the paper-doll in the inventory screen at 3× scale.

## 6b. Icons
* All icons are hand-shaded pixel art at **24×24** (drawn crisp at 2×/3× in the HUD), built in `js/icons.js`.
  They replace the old 16-px white line glyphs.
* **Skill icons:** one per skill id, with a full-colour subject (flame, blade, arrow volley…), 3–4 tone shading, dark outline
  and an element-coloured frame (fire orange, frost cyan, nature green, lightning yellow, arcane violet, physical steel, holy gold).
  Cooldown sweep and "not enough MP" dim are drawn by the HUD on top.
* **Item icons:** per family *and tier*, so a tier-4 sword looks ornate and a tier-0 rusty. Rarity is shown by the slot frame
  (border colour + inner glow, animated shimmer for legendary/mythic), plus small gem dots for filled sockets.
* **Gems:** 6 types × 3 grades (Chipped, Clear, Radiant). Higher grades get more facets and sparkle. **Misc:** potion, Dream Dust, Socket Rune, chest, XP, gold key, shrine, lore tablet.
* API: `ICONS.skill(id)`, `ICONS.item(base, tier, rarity, gems)`, `ICONS.gem(type, grade)`, `ICONS.misc(name)`, `ICONS.frame(ctx, x, y, size, rarity, t)`.

## 7. Enemies and bosses
* Each zone: 4–6 enemy types (reuse behaviours hopper/shooter/charger/brute + new: `caster` (AoE telegraphs),
  `summoner`, `elite` modifier (bigger, coloured aura, +HP, drops better)).
* Bosses: 2–3 phases each, telegraphed attacks only (fairness), enrage banners, health bar with name.
* **Data-driven boss system:** a `BOSS_MOVES` library (cleave, slam, volley, charge, voidrain, summon, lavaring, pull,
  beam, tidewave…), each = telegraph shape + wind-up + hit, built on the existing `fx` / `tele` / `zone` effects.
  Each boss is data in `world.js` enemies: sprite, stats, phases[] with move weights, HP thresholds and banners.
  The Gloam Warden is ported to it first.
* **Each boss has one mechanic the loot answers:** Bramblehorn's root grabs (dodge / Snare), Mirelle's pull
  (Dreamveil, stand-firm), Kharzul's lava floor (boots, fire resistance from Ruby), Morrow's void tiles (blink).
* **Elites:** a flag on the spawn action: 1.4× size, aura light, +150% HP, a modifier (Fast / Shielded / Burning),
  guaranteed Rare drop.
* Enemies are rescaled to sit right next to the 24×32 hero (M3).
* Morrow final boss: P1 sword-knight, P2 dream-warp (arena tiles vanish / void zones), P3 giant form with
  starfall, Pip lends you a "Dawn Burst" ultimate for the finale.

## 8. Pacing target (~70 min)
| Segment | Minutes |
|---|---|
| Intro + Vale tutorial | 5 |
| Pinewood + Bramblehorn | 12 |
| Ruins + Gloam Warden | 12 |
| Grotto + Mirelle | 13 |
| Caldera + Kharzul | 13 |
| Spire + Morrow | 12 |
| Inventory/gem/hub time | 5+ |

Each zone: ~3 encounter areas, 1 optional elite + chest, 1 lore tablet, 1 checkpoint, boss arena.

## 8b. Map scale and intricacy
Current maps are 22–26 tiles square, about one screen of open ground. That is too small. The player moves 3.7 tiles/s,
so the design rule is **15–25 s of walking between fights**. Targets (revised after the senior director review):

| Zone | Minutes | Outer map (tiles) | Boss map (tiles) | Rooms | Fights |
|---|---|---|---|---|---|
| Vale hub | 5 | 36–40 | — | tutorial + chest | dummies |
| Pinewood | 12 | 56 | 22 | 3 + elite | 4 + boss |
| Ruins | 12 | 48 | 22 (existing arena, enlarged) | 3 | 4 + boss |
| Grotto | 13 | 64 | 24 | 3 + secret | 4–5 + boss |
| Caldera | 13 | 64 | 24 | 3 + elite | 4–5 + boss |
| Spire | 12 | 48 (vertical) | 28 (3-phase arena) | 3 | 4 + boss |

* **Each zone = one outer map + one compact boss map.** Outer map: 3 rooms 12–16 tiles across (60–90 s of fighting each),
  2 side branches (20–30 s), 1 shortcut, 1 elite, 1 lore tablet, 1 checkpoint shrine ≈ 9–10 min. Boss map 2–3 min.
  Irregular island shapes (not squares), plus small floating islets reached by bridges.
* **Layout grammar per map:** a winding main path with 3 encounter "rooms" (clearings, plazas, cave chambers) linked by
  corridors; 2+ side branches (dead-ends hide a chest, a lore tablet or an elite); **verticality** using 3–5 height
  levels with stairs and ramps, cliffs as walls; at least one shortcut that opens back to the checkpoint; landmarks
  visible from afar (giant tree, tower, waterfall, lava fall) so the player can navigate.
* **Set dressing density:** dense props along edges and in clusters (150–200 objects on a 56-tile map), open space only where
  fights happen. Each zone gets its own tile palette, props and ambient particles.
* **Secrets:** each map has 1 hidden path (an illusory wall or a cracked bridge) leading to a Socket Rune or a gem cache.
* **Interactables:** chests (wood / silver / gold by tier), checkpoint shrines, lore tablets, switch-gated portals,
  levers that lower bridges or open gates (implemented as triggers in `world.js`).
* **Tech:** maps are authored with node generator scripts in `tools/maps/` (noise-shaped coast, path carving, room
  stamps, prop scattering with seeded RNG), output in the `world.js` format and then fine-tuned in `editor.html`.
  The renderer must cull objects to the view so large maps stay at 60 fps (the ground raster is `(W+H)*16` px wide,
  so up to 64-tile maps fit one canvas; no chunking needed). The minimap gets fog-of-war revealed as you explore.
* The Vale hub grows too (36–40 tiles): cottage, Elder Stone, a garden, the dummies, and visible rifts to every zone,
  which open as Shards are relit.

## 8c. Gameplay loop and reward cadence
* **30 s:** read the telegraph → dodge → skill → basic chain → kill-heal. Damage numbers, XP ticks, a drop about every
  3rd kill (Common/Uncommon), rarity-scaled drop fanfare (light beam, pitch-stepped chime, bouncing item).
* **Encounter (3–5 min, one room):** 2 waves + 1 pressure enemy (caster or elite). Room clear = 1 guaranteed ≥Uncommon
  (trigger `loot` action), ~1 level-up, a chest with a gem.
* **Zone (10–15 min):** 3 rooms + elite + boss. Rare+ from the elite, 2–3 gems, a Socket Rune in the secret, boss =
  named Legendary + a skill unlock / modifier choice + the next rift opens. **One new weapon tier per zone**, so the
  sword visibly changes every zone.
* **Hub between zones:** combine gems, re-socket for the next boss's element, Elder Stone story beat, spend Dust.
* **Whole game (~70 min):** 5 named Legendaries + 1 Mythic, ~6 weapon tiers, 12–15 gems socketed, a full matching set
  by the Spire. **NG+** (enemies ×1.6, keep gear) unlocks Mythic rolls everywhere and corrupted elites.
* **Onboarding:** the first chest in the Vale drops an Uncommon weapon *and* a gem, each with one Pip line explaining it.
* **Audio:** a short synth music loop per zone plus boss music, on the existing `tone()` synth.

## 9. Studio roles and file ownership
| Who | Strengths used for | Default files |
|---|---|---|
| **Director** (me) | design, briefs, review, merge/ship | `docs/DESIGN.md` |
| **Opus** | core systems, rendering, AI, tricky refactors; **owns the seams** (`equipItem`, `statsOf`, `recalcStats`, `buildPlayerSprites(gear instances)`, ICONS stub, boss move library) | `game.js`, `render.js`, `data.js` core, `items.js` |
| **Sonnet** | content: maps, triggers, story/dialogue, enemies, UI screens, sprites | `world.js`, `hud.js`, `maps.js`, `art.js` |
| **Haiku** | smoke **and scripted play tests** (kill → drop → equip → save → reload → die → checkpoint; 60 s fps sample on the largest map), data tables, balance sheets, docs | `tools/`, `README.md`, tables |

## 12. Completionist scope: 4.5–5 hours at 100 %
The main path stays ~2 hours. Optional content fills 2.5–3 more hours:

| Optional layer | Content | Min |
|---|---|---|
| Secrets | 3 per outer map + 1 per dungeon = 20, ~1.5 min each | 30 |
| Side quests | 1 per zone (5) + 2 hub chains | 35 |
| Vaults | 5 key-gated vault maps (12–16 tiles): a puzzle room + gold chest | 30 |
| Optional zone: Drifting Isles | 48 tiles, L20–26, sixth named legendary | 20 |
| Optional zone: Starlit Shoals | 48 tiles, L28–34, Mythic chance | 20 |
| Post-game: The Gloaming Below | 2 floors × 36 tiles, corrupted elites, L36–40 | 30 |
| Arena | 10 tiers × ~2.5 min, Epic every 5 tiers | 25 |
| Hunts / bestiary completion | 50-kill milestones (mostly overlaps the above) | 15 |
| Fishing | see §13 | 20–30 |
| **Optional total** | | **~225** |
| **100 % first run** | main 120 + optional | **~5.5 h** (NG+ excluded) |

Trim to 4.5 h by dropping Starlit Shoals first if behind. Map count: 17 critical + 5 vaults + 2 optional zones +
2 Gloaming floors + arena = **27 maps**.
* **Lane O (optional content)** ships one layer inside each milestone from M4: M4 vaults + secrets for Acts I–II;
  M5 side quests + Drifting Isles; M6 arena + hunts; M7 Gloaming Below + Starlit Shoals; M8 completion pass (timed 100 %
  run). A third Sonnet lane owns lane O (maps and triggers only).
* Risks: 27 maps is 9× what exists (optional zones are cut first); completion minutes are estimates (±30 %) until the
  scripted runs exist; L36–40 balance is tested in the arena, so the arena is built before the Gloaming Below.

## 15. Skill system (supersedes §5 and the skill lines of §11.1 / §11.6)
"You are what you wear" stays: weapon family = LMB + Q/E/R, chest F, helm C, boots Shift (dodge with i-frames),
character skills 1/2/3 chosen freely. On top of that loadout, skills now **grow, combine and are found**.

### 15.1 Acquisition (skills are found, not dripped)
* **Weapon skills** come with the weapon family. The **second option per slot is a Skill Rune** that drops (Rare+ tables,
  mini-bosses guaranteed, the Elder Stone sells one per zone for Dust) and is learned permanently for that family.
* **Character skills:** 2 known at L1; the rest are **Dream Tomes** found at lore tablets and side quests (one per zone,
  two in the Vale) plus one from each guardian's last words. Levels gate equipping (L5/10/15/20/25/30).
* **Armour skills** come with the piece.

### 15.2 Skill ranks and modifiers
* Every skill has **Rank 1–5**, earned by use (~25 casts that hit per rank), stored per skill id. Each rank +6 %
  damage/effect. Ranks 3 and 5 each open a **modifier slot**: pick 1 of 2 modifiers for that skill.
  This replaces the level-based modifier picks and the separate weapon-mastery system.
* Modifiers are **data only** (`SKILL_MODS: { id, skill, apply(ctx) }`) and may only change numbers the cast reads
  (`ctx.dmg, ctx.r, ctx.stun, ctx.element, ctx.extraProj`, …) — never new code branches.
* Respec: modifiers free at the Elder Stone; character skill slots swappable anywhere outside combat; runes and tomes are
  permanent.

### 15.3 Resource rhythm
* **Basic attacks generate 8 MP per hit** (builder); skills spend MP. Flat MP regen is small.
* **Ultimates (R) use a charge bar** 0–100 fed by damage dealt and **doubled by reactions**; castable at 100, the slot glows
  gold. Roughly one ultimate every ~40 s, more for players who play reactions.
* Stamina is for the dodge only.
* **Cancel rules:** dodge cancels any cast after its first 0.1 s (refund 50 % MP); attacks cancel into skills; skills
  never cancel into attacks.

### 15.4 Reactions (synergy core; one table in `damageEnemy`)
| Reaction | Trigger | Effect |
|---|---|---|
| Shatter | slash/stagger hit on Frozen or 3× Chill | consumes; 150 % weapon damage AoE 1.5 tiles |
| Wildfire | fire on Poisoned | consumes; Burn spreads to enemies within 2 tiles |
| Conduct | lightning on Chilled | Shock jumps to every Chilled enemy within 3 tiles |
| Overload | arcane on Shocked | consumes; +40 % damage, 1 s off the skill's cooldown |
| Purify | holy on Burn/Poison | consumes; heals 5 % max HP, +50 % vs gloom |
| Rupture | pierce on a full stagger bar | consumes the break; guaranteed crit |
| Detonate | stagger ≥ 3 on Burning | consumes Burn stacks, each = 30 % weapon damage |
Each reaction pops its name in its element colour with its own sound. Seven, no more.

### 15.5 Roster (existing + 9 new casts; hard cap 12 new, reuse fx types)
* **Sword** (basic 3-hit slash): Q Sunslash / Heroic Strike · E Dash Strike / Whirling Blade · R Radiant Judgement /
  Dawn Wave (Cinder Cleave moved to the two-hander, §17.3).
* **Staff** (basic arcane bolt): Q Firebolt / Frost Shards / ***Static Field*** (lightning zone, applies Shock) ·
  E Arcane Barrage / Gravity Well · R Meteor / Starstorm.
* **Bow** (basic pierce): Q Multishot / Piercing Shot · E Tumble / Snare Trap / ***Venom Volley*** (nature, sets up
  Wildfire) · R Rain of Arrows / Moonbeam.
* **Chest:** Bulwark, Mana Surge, Shadow Veil (Thornmail cut, see §17.7).
* **Helm:** War Cry, Frost Nova, Mend (Stormcall cut, see §17.7).
* **Boots:** Charge, Blink, Sprint (all with i-frames).
* **Character pool (10):** Second Wind, Arcane Orbit, Chain Lightning, Dreamveil, Blessing of Dawn, Shooting Star,
  ***Dawn Lance*** (holy line, Purify), ***Briar Field*** (nature zone, Poison), ***Ember Mark*** (next 3 hits burn),
  ***Thunderclap*** (lightning + stagger 2).

### 15.6 Gems, legendaries and sets plug in without stacking
* Gems add **status chance and reaction size** (e.g. Ruby: +burn chance, Detonate +10 %), never extra multipliers beyond
  the one additive `power` sum.
* Legendaries change rules (§4.5). Set bonuses change which reaction a family favours: Plate 3 — Shatter also staggers;
  Robe 3 — Overload refunds 2 s; Jacket 3 — Rupture spreads Poison.
* Everything feeds the capped `power` / `statusChance` / `reactionBonus` sums.

### 15.7 Build archetypes the game must support
1. **Shatter Knight** — sword, Knight set, Frost Nova, Sapphires in armour; Heroic Strike after Nova.
2. **Pyromancer** — staff, Dreamweave robe, Rubies, Ember Mark + Firebolt + Meteor; Detonate with Thunderclap.
3. **Stormcaller** — Static Field + Chain Lightning + Smoke Bomb (Shade Mask), Topaz; Conduct off Frost Shards.
4. **Venom Ranger** — Venom Volley + Snare + Briar Field, Stalker set, Emeralds; Wildfire with Shooting Star.
5. **Breaker** — Piercing Shot + War Cry + Charge, Diamonds; Rupture on every break; best against golems and bosses.
6. **Dawn Paladin** — holy sword R + Dawn Lance + Blessing, Mend, Diamonds; Purify sustain, gloom killer.
7. **Void Mage** — Gravity Well + Barrage + Blink + Arcane Orbit, Amethysts; Overload cooldown loop.
8. **Duelist** — Dash Strike + Charge boots + Shadow Veil, crit affixes; no reactions needed. This build must stay viable
   so players who ignore statuses (often touch/pad players) aren't punished.

### 15.8 UI and feel
* Every delayed skill shows its shape on the ground and a 2–3 frame wind-up on the hero; held skills glow brighter per
  0.25 s held.
* When a target in range carries a status your skill would react with, a small element dot shows on that skill's icon
  ("this will Shatter").
* Tooltip: name, rank bar, element/type icon, MP, cooldown, **damage computed with your current power**, status + chance,
  reactions it triggers, modifier slots, which gems amplify it.
* The ultimate charge bar replaces R's cooldown sweep.

## 16. Polish, economy, save schema and technology (expert review; authoritative)
### 16.1 Commercial-feel polish list
1. **Hit feedback hierarchy:** enemy white flash 2 frames, 1 px knockback shake, reaction pops with unique sfx, hitstop
   scaled by damage %.
2. **Music:** a WebAudio step sequencer (16 steps, 3 voices: square / triangle / noise) on the existing `tone()`, one
   4-bar loop per zone + a boss stinger; pattern tables in data. (M2b)
3. **Transitions:** rift fade → map-name banner → control hint; the next map pre-rasters during the fade / on portal
   proximity. (M2b)
4. **Onboarding:** no help screen; contextual prompts via `IN.glyph()` the first time each system matters (first drop,
   first gem, first Chill on an enemy: "slash to Shatter").
5. **Difficulty:** a per-level-band sheet (enemy HP/DPS vs expected player power) checked by the scripted run, and a
   **Story / Normal** setting (Story = damage taken ×0.6). (M2a setting, sheet by Haiku)
6. **Save UX:** autosave glyph (2 s), title "Continue" shows zone / level / playtime, **3 save slots**. (M2b)
7. **Settings + accessibility** from HUD.md and CONTROLS.md ship in **M2a**, not M8.
8. **No hitching:** cached light sprites, pre-rastered maps, pooled particles with a verified hard cap.
9. **Art consistency:** one shared palette (`PAL`) for icons, hero, UI frames and enemy recolours; enemies rescaled to the
   24×34 hero (M3).
10. **Death/retry:** respawn at the arena entrance, the boss intro is skipped on retries, "Retry" within 1 s.

### 16.2 The first 10 minutes (every minute adds one new noun)
0:00 title (soft music, Continue / New Dream) → 0:10 wake in the Vale, Pip's line, move prompt, camera pan to the
cottage → 0:40 dummies teach attack, dodge, Q (one prompt each, numbers + white flash) → 1:30 first chest: beam, Uncommon
weapon + Chipped gem, Pip's two lines, Tab opens on the item with Equip highlighted; equipping visibly changes the hero
→ 2:30 fishing spot beside the chest: one cast, guaranteed gem, log unlocked → 3:30 Elder Stone riddle, lost-lantern
quest, first Tome → 4:30 scripted ambush (3 slimes) in the garden: first drop, first kill-heal, Level 2 → 5:30 rift to
Pinewood opens, banner, a fox flees → 6:30 room 1 ogres teach the brute telegraph, an elite aura visible ahead → 8:00
first Shatter pop if the player has frost; bestiary badge → 9:30 shrine (checkpoint, potions, cooking fire) → 10:00 the
Root Hollow door and the key hint.

### 16.3 Dust economy
Salvage is currently the only Dust source. Haiku owns one sheet listing every **source** with a rate (salvage by
rarity, hunt milestones, fishing treasure, chests, arena tiers, quest rewards) and every **sink** with a price (Socket
Rune, Chipped gem, Skill Rune at the Elder Stone, rod tiers); respec stays free. Balance target: a player who salvages
everything can afford one Socket Rune + one Skill Rune per zone.

### 16.4 One elite table
Elite modifiers and elite element badges are the same thing: one `ELITE_MODS` table (Fast, Shielded, Burning, Frozen,
Storm, Gloomed), each with its aura colour, badge icon, added element and stat changes.

### 16.5 Save schema (named now so every lane uses the same shape)
Key `dreamy.save.v1`, field `version`, one `migrate(save)`. Top-level fields:
`player` (level, xp, equip, bag, dust, potions, tool), `skills` ({ id: { rank, xp, mods:[...] } }, known runes, known tomes,
equipped character skills, ultimate charge not saved), `world` (map, checkpoint, trigger state per map, opened chests,
secrets found, gates/levers state), `bosses` ({ id: { kills, firstKill } }), `bestiary` ({ type: { seen, kills, res:{},
reactions:{} } }), `fishing` ({ fish: { caught, best } }, pearls applied), `quests` ({ id: { step, done } }),
`zone100` ({ zone: true }), `settings` (audio, accessibility, difficulty), `bindings`, `stats` (playtime, deaths),
`slot` (1–3).

### 16.6 Technology roadmap (Canvas 2D, classic scripts, file://)
**Now (M2a–M3):**
1. **Cached light sprites:** pre-render one 64×64 radial sprite per (colour, alpha) and `drawImage` it scaled instead of
   building `createRadialGradient` per light per frame.
2. **Map rastering off the critical path:** split `rasterGround` into row bands over several frames, and pre-raster the
   next map during the portal fade.
3. **Fixed-step update** at 1/60 with an accumulator (deterministic reactions, hitstop and scripted tests).
4. **Sprite atlases:** blit the many small hero/icon canvases into 2–3 atlases at boot.
5. **Particle pool** with a hard cap and budget scaling (ambient motes are dropped first).
6. **Mobile:** scene stays 480×270; HUD at min(DPR, 2); pause the loop on `visibilitychange`; one fog layer on
   `pointer: coarse`.
7. **WebAudio step sequencer** for music (M2b).

**Later (M5–M6):** water reflections (sprites flipped at 30 % into a clipped water region + a 1 px per-row sine offset,
the same trick for Caldera heat haze); a one-time palette quantize of static layers; ground rastering in a classic
worker via a `blob:` URL with a synchronous fallback.

**Not planned:** a WebGL2 renderer (rewrites render.js, hero/icon generation and every fx; the current look is already
achieved in 2D), normal-mapped lighting (art cost), `ctx.filter` (unsupported on Safari). A CRT/scanline overlay only as an
off-by-default setting.

**Rules:** feature-detect OffscreenCanvas and workers; vibrate / fullscreen / gamepad only after a user gesture; every
perf change is measured with Haiku's 60 s sample on the largest map logging **p95 frame time**, not the average.

## 17. Thief and Warrior: two new weapon families + Origins (expert-reviewed)
The game stays classless ("you are what you wear"). The class fantasy comes from **two new weapon families**, one new
armour family, and an **Origin** chosen at New Dream.

### 17.1 Origins
A starting kit + one small additive passive + a title. Re-choosable once at the Elder Stone, so it is flavour, not a lock.
Pip's first line and the portrait frame change per origin.
| Origin | Starting kit | Passive |
|---|---|---|
| Knight | sword, Knight Plate | +10 % defence |
| Mystic | staff, Dreamweave Robe | +10 % MP on hit |
| Ranger | bow, Stalker Jacket | +10 % crit damage |
| **Thief** | daggers, Shade leathers | +10 % damage from behind |
| **Warrior** | two-hander, Knight Plate | +1 stagger on weapon skills |

### 17.2 Dual Daggers — "Nightfang" family (Thief)
Tiers: Shiv → Nightfang → Twin Eclipse → Widow's Kiss → Night Eternal.
* **Basic:** 4-hit pierce combo (rate 0.28, 55 % of sword damage per hit; hit 4 adds 1 stagger); 6 MP per hit.
* **Backstab:** any pierce hit from the target's rear 120° arc gets +30 % crit chance (works on every enemy).
* **Marks (0–3):** each skill hit adds a Mark (pips over the enemy); finishers consume them (`ctx.marks`).
* Q: **Fan of Knives** (pierce cone, +1 Mark per enemy) / **Venom Slash** (nature, 2 hits, Poison) / *Shadow Hook*
  (pierce line, pulls one enemy; third option only if ahead of schedule).
* E: **Flicker** (arcane, blink behind the aimed enemy; next hit is a backstab) / **Caltrops** (nature zone, Slow + Poison) /
  *Smoke Veil* (third option).
* R: **Death Mark** (consumes all Marks: 120 % weapon damage per Mark; guaranteed Rupture if staggered) /
  **Thousand Cuts** (dash through enemies in a line 3×, pierce, Poison).
* Drives Wildfire, Rupture and Overload. Weak into Amorphous enemies (resist pierce) by design.

### 17.3 Two-handers — "Dawnbreaker" family (Warrior)
Greatsword, greataxe and warhammer are its **tiers**: Splitting Axe → Dawnbreaker → Sunhammer → Aurora Maul → Dawn Colossus.
* **Basic:** 2-hit slash combo (rate 0.62, 170 % of sword damage, stagger 2 per hit; hit 2 is a 180° sweep); 14 MP per hit.
* **Poise (hyper-armour) while swinging:** hits taken deal 50 % and never interrupt; capped at 50 %, and disabled by
  boss moves flagged `unblockable: true`.
* **Charged swings:** holding a weapon skill up to 1 s scales damage ×1.0 → ×1.8 and stagger +1 (on touch: hold the button).
* Q: **Cleave** (slash cone 160°, stagger 2) / **Earthbreaker** (slash line slam with 3 cracks, stagger 3) /
  **Cinder Cleave** (fire; moved here from the sword).
* E: **Shoulder Charge** (slash dash, knock-up, stagger 2, 0.2 s i-frames) / **Warbanner** (holy zone: +20 % damage and
  poise, 6 s) / *Whirlwind* (third option: moving 4-spin).
* R: **Colossus Strike** (hold ≥ 1 s, circle r3, 400 % weapon damage, stagger 6) / **Avalanche** (frost, 3 expanding
  rings, Chill ×3).
* Drives Shatter, Detonate and Rupture. Best into Armoured; weak into Ethereal.

### 17.4 Shade leathers (new armour family, Thief)
Resists: pierce +25, nature −25. Helm **Shade Mask** → C: *Smoke Bomb* (arcane, vanish 1 s + Shock aura).
Chest **Shade Harness** → F: *Fade Step* (short blink behind the target). Boots **Shade Treads** → Shift: a dodge that leaves
a decoy. Set: 2 pieces = backstab arc 180°; 3 pieces = Marks cap 4. The Warrior uses Knight Plate (its stagger set bonus is
shared with the sword).

### 17.5 Balance
* On a dummy, all five families deal within ±8 % at equal tier (Haiku's DPS sheet). Two-hander +25 % vs Armoured,
  daggers +25 % from behind, sword +0 % everywhere with the best reaction coverage (slash + holy).
* The sword stays relevant: cancel-friendly mid-range, keeps the holy ultimates, poise only on Heroic Strike.
* The two-hander pays with −35 % attack rate, −12 % move speed while swinging and no dodge-cancel during a charged swing.
* Daggers pay with −45 % per-hit damage and the pierce weakness of slimes and jellies.
* **Skill Runes drop for your equipped weapon family 70 % of the time.**

### 17.6 New builds (added to §15.7)
9. **Night Assassin** — daggers + Shade set + Flicker / Fan of Knives / Death Mark, Topaz + Emeralds; backstab crits, Rupture.
10. **Plague Dancer** — daggers Venom Slash + Caltrops + Briar Field, Jacket set, Rubies for Wildfire.
11. **Juggernaut** — two-hander + Plate 3 + War Cry + Avalanche, Diamonds; the boss stagger-break build.
12. **Cinder Berserker** — two-hander Cinder Cleave + Earthbreaker + Ember Mark, Rubies; Detonate chains.

### 17.7 Legendaries, skill cap, placement
* Named legendaries: **Morrow's Regret** (daggers, from the Twin Vigils: Death Mark refunds the charge bar if it kills) and
  **Kharzul's Anvil** (two-hander, an alternative choice from Kharzul's chest: charged swings reach ×1.8 in 0.5 s).
* Skill cap raised from 12 to **22 new casts**, paid for by cutting **Thornmail** and **Stormcall** (Shade Harness and Smoke
  Bomb take their roles). Each new family ships with 2 options per slot; third options only if ahead of schedule.
* Art: daggers (main + off-hand layers) and two-hander (large layer, shoulder-carry idle) ×5 tiers, stab and overhead
  attack poses, 25 icons, Shade overlays ×3 slots ×5 tiers — about a week for Sonnet B.
* **M4:** daggers, Shade family, Origins at New Dream. **M5:** two-handers. Nothing on the 2-hour main path depends on them;
  from M4 the starting chest can roll any family.

## 13. Dreamfishing
Fishing is a **second loot channel** that pays in the currencies the loop already wants (gems, Runes, keys, boss-prep
food), not fish for their own sake.

**Where:** 2 spots per outer map at water edges (Vale pond, Pinewood brook, Grotto crystal pools…), 1 hidden spot per
zone behind a secret (it counts as that map's third secret). Late "impossible" spots need a rod tier: **lava fishing**
in the Caldera (Cinder rod, T3), **void fishing** at the Spire's edges (Gloam rod, T4), **moon fishing** in the Vale
pond once all Shards are lit (post-game/NG+). Spots are `fishspot` objects with a `pool` id, placed in the editor.

**Minigame (one mechanic, all inputs):**
1. Hold Interact to cast; hold time sets distance over 3 rings on the water (farther ring = rarer pool).
2. **The water shows the fish:** glowing shadows sized and coloured by rarity swim in the rings before you cast, so
   choosing a ring is a visible decision; legendary shadows are huge and appear only under their condition.
   The bobber waits 1–4 s (the first cast at a new spot bites at once); a **bite** = dip + splash + a **0.8 s** "!" window
   (1.0 s with a Sapphire rod); press Interact to hook (miss = the fish flees).
3. **Reel** with a tension bar (48×6 px on the 480 grid, above the hero): the fish pulls in telegraphed bursts, its
   glowing shadow visible in the water. Hold Interact to reel, release to rest; 1 s in the red snaps the line.
4. Rare fish add one "turn" burst, legendaries two: push the stick / mouse / drag toward the arrow on the bobber.
   No catch lasts more than 20 s.
5. The catch lands with a rarity loot beam. Nothing faster than 4 Hz; 10–20 s per catch.
Touch: hold the attack button to reel, drag anywhere to turn. Keyboard: Space. Gamepad: hold A + left stick.

**Catches** (`FISH` table): 4 common fish per zone keyed to its element (Mossback, Dawnminnow, Frostgill, Cinderkoi,
Voidlamprey, Moonmaw…), 1 rare per zone (far ring), 1 legendary per zone (hidden spot + rod tier + a condition hinted
in the log). 15 % of bites are treasure instead: Chipped/Clear gems weighted to the zone element, Dream Dust, the hidden
spot's Socket Rune (guaranteed the first time), the zone's **vault key** (one of the ways to get it), cosmetic hats and
rod skins, and a 1 % Sunken Chest (Rare+ item).

**What fish are for:**
1. **Cooking at any shrine fire** (1 fish = 1 dish, no recipes): a 10-minute food buff. Zone fish = +15 to that zone's
   resistance; rare fish = +10 % damage of an element; legendary fish = a unique effect (Moonmaw: kill-heal doubled).
   One food buff at a time, shown in the status row, **kept through death** and shown on the boss-intro card
   ("Cinderkoi: fire resist +15"). Each zone's fish counters that zone's guardian (written into the `FISH` table).
2. **Fishing Log** tab inside the Bestiary (silhouette → caught, size records). Rewards at 10/20/30 entries: a Socket
   Rune, a Radiant gem of your choice, the Mythic rod. Hunts count fish.
3. **Elder Stone trades:** 3 rare fish → a Clear gem of your choice; a legendary fish → a **pearl slot** added to one
   legendary item, holding that fish's unique effect (Moonmaw pearl: kill-heal ×2). No rerolls: each boss keeps *its* rule.
4. **The rod** is equipped in a fifth, non-combat `tool` slot: **4 tiers** (Twig → Dawn Rod → Cinder → Moonline; void fishing
   uses a Cinder rod with an Amethyst), rarity like gear, **one socket** (Ruby = lava spots earlier; Sapphire = longer bite window; Topaz = more
   treasure; Diamond = the line can't snap once per catch). Rods drop from fishing or are bought with Dust, and the rod
   shows on the hero's back.

**Budget:** 5–10 min on the main path (the first spot sits next to the first Vale chest, Pip points it out once, and the first catch is a guaranteed
Chipped gem),
~35–45 min for the full log (30 fish + 5 legendaries), inside the completionist optional time.
**Art/audio:** per zone a bobber and 5 fish sprites (16×8, also the water shadow and the 3× log art), rod overlay ×5
tiers, tension-bar strip, cooking-fire prop; sfx cast whoosh, plop, bite tick, reel ratchet (pitch rises with tension),
snap, splash-catch, sizzle; music ducks 30 % while fishing.
**Implementation:** `js/fishing.js` (Sonnet gameplay, Opus reviews input): state machine
`idle → casting → waiting → bite → reeling → caught | snapped` driven by the Interact action; `G.fishing`; `fishspots` in
`world.js` (editor gets a spot tool); `FISH`, `FOOD`, `ROD` tables in data.js (Haiku); catches go through the normal drop
and `rarityFx` path; log state in the save. **Milestone M5** (optional lane), lava/void spots in M7.

## 14. Controls
See **`docs/CONTROLS.md`**: one input layer of actions (`js/input.js`) shared by keyboard + mouse, gamepad and touch,
automatic button prompts for the last-used device, aim assist on stick/touch, a focus model for menus, rebinding and
accessibility options. Interact is on Space (keyboard) / A (pad) / a context button (touch).

## 11. Expanded scope: the 2-hour game (supersedes conflicting numbers in §2, §3, §8, §8b, §8c)
Rule: reach 2 hours through **fight density per zone, not walking** (keep 15–25 s between fights). Every zone is now
**outer map → mandatory dungeon (the Shard lies below; the outer map's elite drops the key) → boss map**.

| Segment | Maps (tiles) | Min | Fights |
|---|---|---|---|
| Intro + Vale tutorial + first chest | hub 40 | 7 | dummies + 1 scripted ambush |
| Pinewood: outer → Root Hollow → Bramblehorn | 56 / 32 / 22 | 18 | 3 rooms + elite, 2 rooms + mini-boss, boss |
| Ruins: outer → Warden Crypt → Gloam Warden | 56 / 36 / 22 | 18 | same shape |
| Grotto: outer → Drowned Vault → Mirelle | 64 / 36 / 24 | 20 | same shape |
| Caldera: outer → Forge Deep → Kharzul | 64 / 36 / 24 | 20 | same shape |
| Spire: ascent → gauntlet → Morrow (3 phases) | 48 / 36 / 28 | 24 | 3 rooms, 3-wave gauntlet + elite pair, boss |
| Hub returns (gems, re-socket, story, quests) | — | 13 | — |
| **Total** | **16 maps + hub** | **120** | ~38 encounters, 5 mini-bosses, 5 bosses |

**Optional (beyond the 120):** **Drifting Isles** (48 tiles, L34–40, mixed elements, key from Kharzul; sixth named
legendary + Mythic chance), one **secret vault per zone** (12–16 tiles, reached from a map secret), the **hub arena**.

### 11.1 Progression and cadence
* Level 1→40, about one level every 3 minutes. Gear tiers at reqLvl **1 / 8 / 16 / 24 / 32**, Mythic at 36.
* Drops: ~every 3rd kill; room clear ≥Uncommon; elite Rare+; **mini-boss guaranteed Epic with ≥2 sockets**;
  boss = named Legendary; Morrow = Mythic.
* Gems: 4–5 per zone (chest, mini-boss, secret, quest) → 22–25 socketed by the end; one Socket Rune per dungeon.
* Skills are acquired and grown per §15 (Dream Tomes, Skill Runes, per-skill ranks with modifier slots).
* Potions: 3 charges, refilled at shrines; every dungeon has a midpoint shrine.
* **Per zone the player gets:** 1 gear tier-up, 1 Epic, 1 Legendary, 4–5 gems, 1 Rune, 2 choice moments, ~7 levels.

### 11.2 Encounter grammar
* **Outer map:** room 1 teaches the zone's new enemy; room 2 mixes it with an archetype that resists the player's
  likely weapon; room 3 adds a caster or summoner; the elite guards the dungeon key.
* **Dungeon:** room 1 = the elite modifier's element in numbers; room 2 = a lever/gate fight; mini-boss built strictly
  from 3 `BOSS_MOVES` plus the zone's resist identity, 60–90 s.
* **Boss:** as §7. Any zone measuring over 22 minutes gets a room cut, not a walk cut.

### 11.3 Hidden treasure
* **3 secrets per outer map, 1 per dungeon:** one signposted (cracked-wall texture, a lantern pointing at it, a Pip line
  "the wall hums"), one environmental (a path visible on the minimap but not from the ground), one logic (a lever opens a
  bridge seen earlier).
* Rewards escalate gem → Socket Rune → gold chest with a guaranteed Rare+. Never a Legendary (those stay on bosses).
* Every secret is a trigger area + `openGate`/`loot` action, so it stays editable in `editor.html`.

### 11.4 Bestiary (revised after expert review)
* A tab on the Tab screen holding two lists: **Bestiary** and **Fishing Log** (same silhouette → seen model, same
  milestone pips). List grouped by zone with counters ("7/9 seen"); a new-entry badge on the Tab icon.
* Entry: sprite at 4× on a dark vignette, name, archetype tag **with its one-sentence rule** ("Armoured — resists slash,
  breaks under stagger"), weak/resist row (each element revealed by §5b first-hit discovery, unknown = "?"),
  **"Best reaction"** line auto-derived from its resists + §15.4 (e.g. Golem → "Chill, then slash: Shatter"), revealed the
  first time you trigger that reaction on it. This line is the tutorial for the reaction system.
* **Hunt milestones:** 10 kills = full resist row revealed; 25 = drop hint + Dream Dust; 50 = permanent +5 % damage to
  that type (`huntBonus`, additive). Bosses: kill = lore2; 3 kills (arena / NG+) = their move list with telegraph names.
* **Voice:** Pip's voice for common enemies; a guardian's lore2 is in the guardian's own words (STORY.md voice rules).
* Quests reference bestiary ids (an entry shows a "Quest" marker until the quest is done). A zone's bestiary + fish +
  tablets complete = the **zone 100 %** stamp the true ending checks.

### 11.5 Status icons (12×12, `ICONS.status(id)`)
* **On enemies** (over the health bar; stacks as a corner digit, time as a pie sweep): Burn, Chill/Freeze, Poison, Shock,
  Slowed, Rooted, Stunned, plus a permanent elite-modifier badge (Burning, Frozen, Storm, Shielded, Fast). Stagger is a bar.
* **On the hero** (one row above the skill bar, max 8, debuffs first and red-tinted, time as a sweep, never text):
  every buff in `BUFFS` (Bulwark, Mana Surge, Shadow Veil, Mend, Sprint, Arcane Orbit, Dreamveil, Blessing, Focus) plus
  Dread, Gloomed, Burning, Chilled, Poisoned, kill streak (digit), potion cooldown. Debuffs also tint the portrait.

### 11.6 New systems (adopted)
| System | Priority | Milestone |
|---|---|---|
| Dungeons with keys and doors (now mandatory, one per zone) | must | M2 onward |
| Set bonuses: 2/3-piece per armour family (Plate 3: stagger +50%; Robe 3: arcane ignores 75% resist; Jacket 3: pierce crits poison) | must | M4 |
| Side quests via triggers: 1–2 per zone, NPC gives them, rewards a choice of gem or Rune; `quest` action + 3-line HUD log + Quests tab | should | M2 (one), then each zone |
| Hub arena: scaling waves, Dust, guaranteed Epic every 5 rounds (endgame + balance test bed) | should | M6 |
| Pip companion: follows you, auto-picks up loot nearby, lights darkness, calls out a new enemy's first weakness | should | M7 |
| Return-rift at each checkpoint shrine to the hub (fast travel) | should | M2 |
| **Dream Record** page (achievements folded into bestiary / log / zone-100 % milestones) | nice | M8 |
| NG+ modifiers: elites everywhere / no kill-heal / gloom everywhere, each raising drop rarity | nice | M7 |

**Rejected:** potion/rune crafting and enchanting, gold and merchants (Dream Dust is the one currency; the Elder Stone is the
shop), reputation, minigames other than fishing (fishing is in, see §13), day/night, mounts, a separate hard mode (NG+ modifiers cover it).

### 11.7 Generator and tech
* Three stamps: `outer` (coast + 3 rooms + branches + 3 secrets), `dungeon` (cave/crypt palette, 2 rooms + mini-boss arena +
  locked door + lever shortcut, 3–5 height levels), `boss` (arena + fence). The generator emits trigger cards
  (`spawn`, `loot`, `openGate`, `checkpoint`, `dialogue`, `quest`), not just tiles; set dressing comes from generator
  density and only rooms are hand-tuned.
* New world objects: chest (wood/silver/gold), shrine, lore tablet, lever, gate, key door, fake wall (`hidden`).
* Portals carry an arrival point (`to: {map, x, y}`) so you return where you left.
* Save schema grows (bestiary, quests, secrets, mastery): keep key `dreamy.save.v1`, add a `version` field and a single
  `migrate(save)` function from day one.

## 10. Milestone plan (each one ships live) — sized to the 2-hour game
* **M1 Foundation + Inventory & Loot** (in flight): item instances, rarity, levels (cap 40), sockets & gems (3 grades),
  additive stats, damage types + resistances plumbing (§5b), loot drops with fanfare, inventory UI, save/load with
  `version` + `migrate`, checkpoint shrines + persisted trigger state, death/respawn, discovery hooks (`G.seen`,
  first-hit weakness reveal) and the `huntBonus` slot, smoke test harness.
* **M2a HUD, controls and combat feel** (ships on the existing maps): the complete "Dream Glass" UI from `docs/HUD.md`
  (`ui.js` primitives + `input.js` action layer and focus model by Opus, bitmap font, all HUD elements and Tab screens
  rebuilt on it by Sonnet B), gamepad support, the §15 rhythm (MP-on-hit, ultimate charge, dodge-cancel, skill ranks),
  the settings + accessibility screen with the Story/Normal toggle, and the §16.6 "now" performance items 1, 3, 5, 6.
* **M2b Act I slice** (~25 min playable): Pinewood outer + Root Hollow dungeon + Bramblehorn, hub 40, the data-driven boss
  system with a mini-boss, key/door, levers/gates, dialogue/camera/loot/checkpoint/quest actions, intro and Pip, elites,
  universal dodge, one side quest, 3 secrets, return-rift, the first Skill Rune drop and 2 Dream Tomes, music sequencer, map pre-rastering and fade transitions, 3 save
  slots, the first 10 minutes per §16.2, scripted play test.
* **M3 The Hero & Icons:** layered hero, gear overlays, rarity glow & particles, paper-doll in the new Tab screen, the
  icon set wired into the HUD, hero status-icon row, enemies rescaled, unified `rarityFx`.
* **M4 Act II** (~45 min): Ruins (3 maps), Gloam Warden ported, 5 status effects + enemy status icons, set bonuses,
  Bestiary tab, the 7 reactions, Skills tab with ranks and modifiers.
* **M5 Act III** (~65 min): Grotto (3 maps), Mirelle, gem amplification complete, Drifting Isles if ahead of schedule.
* **M6 Act IV** (~85 min): Caldera (3 maps), Kharzul, hub arena, two new character skills.
* **M7 Finale** (~110–120 min): Spire (3 maps), Morrow, Pip companion and sacrifice, ending, credits, NG+ and modifiers.
* **M8 Polish:** timed 2-hour playthrough, music loops, minimap fog-of-war, mastery, achievements, secret vaults, README.

Team lanes: **Sonnet A** = maps + triggers (3 maps per milestone); **Sonnet B** = enemies, mini-boss data, UI, icons,
quests; **Opus** = systems, rendering, boss move library, save schema, arena, Pip; **Haiku** = per-zone balance sheet,
lore, resist/set/quest data, and a **timed scripted main-path run** reporting minutes per zone (the 2-hour ship gate).

Review gates: every map ships a screenshot and a timed main-path walk; every boss ships one screenshot per telegraph.

Ship gate per milestone: smoke + play test green → director review → PR → merge to `claude/dreamy-rpg-concept` (= live on Pages).
