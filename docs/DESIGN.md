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
* **Chest:** Bulwark, Mana Surge, Shadow Veil, ***Thornmail*** (nature, reflects poison; restored for the Pacifist build, §18.5).
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
2. **Music and sound:** see **`docs/AUDIO.md`** (authoritative). A WebAudio step sequencer (16 steps, 3 voices: square / triangle / noise) on the existing `tone()`, one
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
* Skill cap raised from 12 to **22 new casts**, paid for by cutting **Stormcall** (Smoke Bomb takes its role); Thornmail is kept (§18.5). Each new family ships with 2 options per slot; third options only if ahead of schedule.
* Art: daggers (main + off-hand layers) and two-hander (large layer, shoulder-carry idle) ×5 tiers, stab and overhead
  attack poses, 25 icons, Shade overlays ×3 slots ×5 tiers — about a week for Sonnet B.
* **M4:** daggers, Shade family, Origins at New Dream. **M5:** two-handers. Nothing on the 2-hour main path depends on them;
  from M4 the starting chest can roll any family.

## 18. Combo layer: tags, triggers, Duos, rune-words, aspects (expert-reviewed; authoritative)
Goal: the "I found a broken-in-a-good-way interaction" feeling, without per-combo code or tuning.

### 18.1 Tags and the effect table
* Every skill gets `tags` from {projectile, zone, dash, nova, cone, line, channel, summon, mark, charge, buff, heal,
  ultimate, melee, ranged, spin} plus its element/type. The cast `ctx` also carries `shape`, `count`, `onHit[]`, `onEnd[]`,
  `spawnAt`.
* **One effect table** drives gems, sets, legendaries, Duos, rune-words, origins, pearls, food and trigger affixes:
  `EFFECTS: [{ id, src, when, ifTags, ifState, do(ctx), icd, name, hint }]` with
  `when ∈ cast | hit | kill | dodge | statusApplied | reaction | ultimate`. **No effect ever names a skill**, so a new
  weapon family inherits every combo for free.
* **Triggers:** the four event hooks (cast, dodge, kill, ultimate) are first-class combo inputs; "on dodge: recast your last
  zone skill at your old position" is the richest effect type.

### 18.2 Duos, rune-words, aspects
* **Duos** — named cross-slot synergies (two tag conditions). 12 for 1.0.
* **Rune-words** — ordered 3-gem socket patterns on one item that replace the gems' stats with a named power. 10 for 1.0,
  hinted in the Codex and sold as recipes by the Elder Stone. The fishing rod's socket counts as a 4th socket for
  rune-word patterns.
* **Aspects** — legendaries transform a **tag**, not a skill ("projectile → spiral of 3", "dash → leaves a mirror image
  that recasts your last skill once", "zone → follows you", "nova → fires twice, the second at your aim point").
  7 for 1.0, on the existing named legendaries.
* **Trigger affixes** on Epic+ items: e.g. "on dodge: Frost Nova (r1)", "on kill: 1 Mark on the nearest enemy".

### 18.3 Combo Codex
A tab beside the Bestiary: silhouettes of Duos and rune-words, revealed on first trigger with a pop ("FROST TORNADO —
discovered") and a one-time reward (Dust + a Clear gem for the first 5, then cosmetics). Undiscovered entries show a
hint ("a cold helm and a spinning blade…"); discovered ones show their ingredients so builds can be reproduced. Pip gives
one hint per zone for an undiscovered entry the player's **current gear can already trigger** (computed from equipped tags).

### 18.4 Examples (the 1.0 set is chosen from these)
| Combo | Inputs → result |
|---|---|
| Frost Tornado | Frost Nova + a spin skill → each spin re-applies Chill in a ring; Shatter on the 3rd spin |
| Afterimage Meteor | Blink + Meteor → lands where you blinked *from*, 0.5 s sooner |
| Knives from the Dark | Smoke Bomb + Fan of Knives → knives fired from the smoke always backstab |
| Orbit | Gravity Well + any projectile → projectiles circle the well for 2 s, hitting repeatedly |
| Catapult | Snare Trap + Charge → dashing through your trap launches it ahead as a rolling net |
| Thunderstorm | Static Field + Rain of Arrows → arrows landing in the field Shock; Conduct chains the zone |
| Burning Halo | Arcane Orbit + Cinder Cleave → orbs turn to fire and Detonate when a charged swing passes through |
| Battering Ram | Bulwark + Shoulder Charge → the shield rides the charge, reflecting projectiles |
| Thorn Garden | Caltrops + Dreamveil → slowed enemies in caltrops are poisoned twice as fast |
| Phantom Cut | Dash Strike + Shadow Veil → dashing while invisible leaves an image that repeats the cut |
| Marked Circuit | Chain Lightning + Marks → prefers Marked targets, refunds 1 Mark per jump |
| Faultline Arrow | Piercing Shot along an Earthbreaker crack → a line explosion |
| Stormfire (rune-word) | Ruby·Topaz·Ruby → Burn stacks arc to Shocked enemies |
| Glacier (rune-word) | Sapphire·Diamond·Sapphire → Freeze on bosses becomes 1 s Brittle (next Shatter +100 %) |
| Dreamroot (rune-word) | Emerald·Emerald·Amethyst → your zones heal you 1 %/s while you stand in them |
| Nautilus (aspect) | "projectile → spiral" on Multishot → 5 arrows spiral outward |
| Walking Garden (aspect) | "zone → follows you" on Briar Field → a poison lawn that walks with you |
| Dragging Well (aspect) | Cinderstride "dash → casts your last zone" + Gravity Well → every dodge drops a well |
| Rally | Second Wind + kill streak → heal scales with the streak, +10 % per kill during the heal |
| Zealot | Blessing + holy skills → holy Purifies on *any* status while Blessed |
| Standard Bearer | Warbanner + Colossus Strike → a charged hit makes the banner explode in holy light |
| Fireproof | Cinderkoi dish + Pyromancer → your own Detonates no longer knock you back |
**Wild builds the engine must allow:** *Pacifist* (Thornmail + Walking Garden + Bloom + Mend: never press attack),
*Dodge Healer* (decoy dodge + Moonmaw pearl: dodging through enemies heals 3 %), *Turret* (traps count as summons +
"summon → fires your basic attack" + Arcane Orbit), *Glass Cannon* (charged Colossus Strike + Marked Circuit + Blessing +
Brittle), *Chain Reaction* (Wildfire + Stormfire + Orbit: the room cooks itself).

### 18.5 Remakes so every skill joins combos
* Blessing of Dawn → **Zealot's Light**: +25 % damage and your next 3 skills gain the holy tag.
* Mana Surge → **Overflow**: restores MP and your next zone skill is cast twice.
* Sprint → **Afterimage**: speed + 3 taunting images (summon tag).
* Second Wind → **Rally**; Mend → **Bloom** (heal ticks poison enemies touching you); Bulwark gains baseline projectile
  reflect; War Cry adds 1 Mark to everything it hits and staggers.
* **Thornmail is restored** (chest, nature: reflects poison) for the Pacifist build — the new-skill cap stays 22.
* Set 3-piece bonuses become **tag rules**: Plate "melee skills gain poise", Robe "zone skills follow you",
  Jacket "projectiles pierce once", Shade "dashes leave decoys".
* Origin passives become **triggers** (e.g. Mystic: every 4th cast is free).
* Affixes stay plain numbers (the noise floor), plus the trigger affixes above on Epic+.

### 18.6 Teaching and guardrails (engine-side, global)
* Tooltips show tags as icons and an auto-generated "Synergises with: zone, dash" line (reverse lookup of the effect
  table); hovering a gem or legendary highlights every skill on the bar it would affect; first-trigger pop + Codex.
* **Internal cooldown** per effect (default 0.5 s); **proc coefficient** per hit source (basic 1.0, projectile 0.6, zone
  tick 0.3, reflected 0.3, summon 0.4) scales trigger chances and reaction damage; **chain depth 2** (an effect-triggered
  hit cannot trigger further effects); **reaction damage cap 300 % weapon damage per second**; **live caps** (zones 2,
  summons 3, images 1); boss **damage per hit capped at 25 % of its HP**; reflected/thorn damage capped at 40 % of power.
* The event bus hooks `damageEnemy`, casts, dodges and kills — never per particle or fx.

### 18.7 Placement
* **M4:** engine (tags on ctx, event bus, ICD/proc/chain/caps, aspect hooks in `spawnProj` / `zone` / `dashPlayer`,
  decoy/summon entity), Combo Codex tab, 6 Duos, 3 rune-words, the §18.5 remakes. Haiku tags all skills and authors data.
* **M5:** aspects on the existing legendaries, more Duos. **M6:** the rest; the wild builds verified in the arena.
* Budget for 1.0: 12 Duos / 10 rune-words / 7 aspects; the Codex can grow in NG+. Nothing on the 2-hour path depends on it.

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
  universal dodge, one side quest, 3 secrets, return-rift, the first Skill Rune drop and 2 Dream Tomes, audio engine + Vale/Pinewood music and core SFX per `docs/AUDIO.md`, map pre-rastering and fade transitions, 3 save
  slots, the first 10 minutes per §16.2, scripted play test.
* **M3 The Hero, Icons & Items v2:** layered hero, gear overlays, rarity glow & particles, paper-doll in the new Tab screen, the
  icon set wired into the HUD, hero status-icon row, enemies rescaled, unified `rarityFx`; **§19 items v2 core: implicits,
  named prefix/suffix tiers + naming grammar, 4 trinket slots with boon tables, caps table, tooltip v2, temper, save v4,
  starter origin ring, trinket icons + belt/amulet overlays** (ring resonance and belt gem-wrap boons land with the M4
  combo engine; uniques 2–3 per milestone M4–M7; attune in M5).
* **M4 Act II** (~45 min): Ruins (3 maps), Gloam Warden ported, 5 status effects + enemy status icons, set bonuses,
  Bestiary tab, the 7 reactions, Skills tab with ranks and modifiers, **combo layer engine + Combo Codex (§18)**, **Thief: daggers + Shade leathers + Origins (§17)**.
* **M5 Act III** (~65 min): Grotto (3 maps), Mirelle, **Warrior: two-handers (§17)**, gem amplification complete, Drifting Isles if ahead of schedule.
* **M6 Act IV** (~85 min): Caldera (3 maps), Kharzul, hub arena, two new character skills.
* **M7 Finale** (~110–120 min): Spire (3 maps), Morrow, Pip companion and sacrifice, ending, credits, NG+ and modifiers.
* **M8 Polish:** timed 2-hour playthrough, music loops, minimap fog-of-war, mastery, achievements, secret vaults, README.

Team lanes: **Sonnet A** = maps + triggers (3 maps per milestone); **Sonnet B** = enemies, mini-boss data, UI, icons,
quests; **Opus** = systems, rendering, boss move library, save schema, arena, Pip; **Haiku** = per-zone balance sheet,
lore, resist/set/quest data, and a **timed scripted main-path run** reporting minutes per zone (the 2-hour ship gate).

Review gates: every map ships a screenshot and a timed main-path walk; every boss ships one screenshot per telegraph.

Ship gate per milestone: smoke + play test green → director review → PR → merge to `claude/dreamy-rpg-concept` (= live on Pages).

## 19. Equipment v2: affixes, item detail, trinkets (expert-reviewed; director-approved; supersedes §4 affix rules)

**Principle:** M1 items are a correct skeleton but two Rare swords differ only in numbers. v2 gives every item an
*identity*. **Gear = skills, trinkets = rules** (trinkets are passive only; the Albion rule stays clean).

### 19.1 Affixes
* **Implicit** (1 per base, fixed, not rerollable): each of the 60 family tiers gets a distinct implicit line
  (Sunforged Blade "+10 % Shatter damage", Hunter's Bow "+1 pierce", Linen Robe "+10 % MP on hit"). `BASES[id].implicit`.
  The tier's implicit *is* the variant; no extra base types (hero overlay cost).
* **Prefixes** (offence/utility: power, crit, critDmg, haste, skillDmg, cdr, element dmg %, status chance %, +Mark cap,
  charge speed) and **suffixes** (defence/sustain: hp, def, regen, mpRegen, speed, resists, resAll on Legendary+,
  on-dodge / on-kill triggers on Epic+).
* **3 named tiers per affix**, gated by ilvl (T1 1+, T2 14+, T3 28+): `power:[{name:'Keen',r:[3,6]},{name:'Fierce',
  r:[7,11]},{name:'Savage',r:[12,18]}]`.
* **Counts:** Common 0 · Uncommon 1 (P or S) · Rare 1P+1S · Epic 3 (2P+1S or 1P+2S) · Legendary 2P+2S + unique rule ·
  Mythic 3P+2S + unique rule + 1 aspect (§18).
* `req = max(base, ilvl−2)`; drop ilvl = enemy level ±2; ilvl 20+ may roll the rarity's max sockets.
* **No affix reroll** (§4.4 stands); pearls (§13) remain the only post-drop change to a legendary rule.

### 19.2 Crafting at the Elder Stone (Dust only)
* **Temper:** raise one affix by one tier, once per item; 20 / 60 / 150 Dust (Rare / Epic / Legendary+).
* **Imbue:** add a socket for Dust; the Socket Rune drop remains the free route.
* ~~Attune~~ **cut** (§20 anti-bloat).

### 19.3 Detailed items
* **Tooltip v2, top to bottom (≤ 12 lines; on touch, affixes collapse to icon + number):**
  1. the generated name, in rarity colour
  2. icon row with family and tier
  3. "Lv 14 · ilvl 16 · Rare"
  4. the implicit, in dim blue
  5. affixes, P then S, with tier pips ◆◆◇ and green/red compare deltas
  6. sockets, as gem icons
  7. the unique rule, in gold
  8. the family line ("Knight 2/3 — 3: melee gains poise")
  9. granted skills, as icons
  10. the auto "Synergises with: zone, dash" line from §18 tags
  11. one line of flavour
  12. footer: "Found: Root Hollow · Kills 212 · Tempered"
* **Naming:** `[prefix-tier name] [base] [of the suffix noun]`, e.g. "Fierce Sunforged Blade of the Fox".
  * Suffix nouns come from a table per stat: speed = Fox, hp = Oak, resFire = Ember…
  * Rare+ items get both parts and Uncommon gets one; uniques keep their own names; Mythic draws from a 30-name table.
  * Haiku writes the word lists and the director reviews them once for tone (no silly names near the twist).
* **Flavour:** 1 line per family tier (60) plus 1 per unique, in STORY.md voice.
* **History:** `it.hist = {found, kills, bossKills, tempered}`. Kills count on the equipped weapon only. At 500 kills
  the weapon gains a cosmetic trail ("my sword").
* **Visuals:** a tempered item gets a bright edge highlight on its hero overlay. The implicit's element shows as a gem
  dot on the icon frame.

### 19.4 Trinkets: Ring ×2, Amulet, Belt
* **Tiers:** 3 (reqLvl 1 / 16 / 32), with the same rarities as other gear. Mythic trinkets are NG+ only.
* **Boons:** one per trinket from its slot's table (≈ 12 per slot). Uncommon gets a minor boon, Rare+ a major one, and
  Legendary a unique boon plus a rule.
* **Amulet → the ultimate.** 1P+1S, 1 socket.
  * Example boons: +15 % charge from reactions; R gains the frost tag; R costs 80 charge; the first R in each fight is free.
  * **Unique:** *Pip's Lantern* (R casts twice at 50 %), the reward of Pip's three-lanterns quest (Spire). This is the
    director's placement: it ties the item to the story.
* **Belt → consumables, sustain, and the gear it wraps.** S only, 1 socket; implicit +1 potion charge.
  * Example boons: potions also cleanse; kill-heal +50 %; cooking buffs last 15 min; salvage Dust ×1.5.
  * **The wrap-around boon:** the best gem in chest *or* boots counts +1 grade, clamped at Radiant (one socket only; §20 balance).
* **Rings → elements and reactions.** P only, 0 sockets.
  * Example boons: +15 % fire damage and +10 % Burn chance; Shatter radius +1; Conduct +1 jump; backstab arc +30°;
    +1 Mark cap; charged swings 0.25 s faster; projectiles +1 pierce.
  * **Ring resonance:** two rings of the same element give that element's reaction +25 % and an aura colour on the hero.
    A Duo pair (fire + nature, frost + slash…) primes that Duo's reaction. Each pair is a Codex discovery.
* **Origin starter ring:** the Origin passive (§17.1) *is* a free starter ring's boon, so ring slot 1 means something
  at minute 3.
* **Acquisition:**
  * the first ring from the first Vale chest
  * the amulet from Bramblehorn's choice chest
  * the belt from the first secret vault
  * after that, trinkets are 15 % of drops
* **On the hero and in icons:**
  * Rings don't show on the hero; an optional glint marks Epic+ rings.
  * The belt is a band overlay with a buckle pixel, and the amulet a 2 px pendant in its element colour. Both get the
    rarity rim glow.
  * Icons: ring, amulet and belt × 3 tiers with element tints, plus the unique icons (≈ 15).
* **Paper doll** (HUD.md, 220 px column): ring1 (24,88), ring2 (176,88), amulet (100,64), belt (100,300).

### 19.5 Uniques: 18 total
* 7 boss and optional-boss drops (already designed).
* 6 trinket uniques (2 per slot type).
* 5 **world uniques**, found only in secret vaults or Sunken Chests from fishing. They are built on §18 tags so they
  work with every family (e.g. "Comet Band: projectiles curve toward Marked enemies").
* Each unique has a fixed implicit and rule plus 2 random affixes, so two copies differ.
* **No set items:** the armour-family 2/3 bonuses already cover it. Instead there is a **full-dream bonus**: 3 family
  pieces plus that family's weapon apply the family's tag rule to trinket boons too.

### 19.6 Guardrails
* One `CAPS` table, applied in `recalcStats`: cdr 40 %, crit 60 %, haste 50 %, gear power 150 %, reaction bonus 50 %,
  Mark cap 5, potions 5.
* Trinket resists: at most +10 % per resist line and +15 % resAll across all four trinkets. The hero clamp [−0.5, +0.6]
  still applies.
* Boon ids never stack: two "+1 Mark cap" rings count as one.
* Every boon is an `EFFECTS` row (§18, `src:'trinket'`), so the ICD, proc, chain-depth and boss caps apply automatically.

### 19.7 Save v4
* `player.equip` gains `ring1, ring2, amulet, belt`.
* Items gain `implicit`, `affixes[].tier`, `boon`, `hist` and `tempered`.
* `migrate(v3→v4)` fills each implicit from its base and assigns the tier of old affixes from their ilvl.

### 19.8 Who builds it
* **Haiku:** affix, name, implicit, flavour and boon tables (data, written in M2b's idle time).
* **Opus:** `makeItem` v2, trinket slots and equip, CAPS, temper/imbue, save v4 (M3), then resonance and wrap boons on
  the §18 bus (M4).
* **Sonnet B:** tooltip v2, the 4 new paper-doll slots, names on drop toasts (M3); the Elder Stone craft panel (M5).
* **Sonnet art:** trinket icons, belt and amulet overlays, the tempered highlight (M3).

**Cut:** base-type variants, set items, affix reroll, a 5th trinket slot, sockets on rings, and skills on trinkets.

## 20. Balance framework and scope budget (expert audit; director-approved; supersedes conflicting numbers anywhere above)

### 20.1 Play-time target (decided with the client)
**Dense, plus replay.** The main path runs **~95–110 min** and 100 % takes **~3–3.5 h**. The original 2 h / 4–5 h is
reached through honest replay (NG+ modifiers, a second family or origin run), never through padding.

### 20.2 Scope budget (hard caps)
* ~~Maps: 17 max~~ **superseded by §22: 27 maps, each with its own hook (client decision).** Former list: These are:
  * the hub
  * 5 outer zones
  * 5 boss arenas
  * **2 mandatory dungeons:** Root Hollow, the teaching dungeon, and Forge Deep, the Caldera showcase
  * 3 optional vaults (the former Warden Crypt, Drowned Vault and Spire gauntlet; the Twin Vigils fold into the Spire
    ascent's last room)
  * Drifting Isles (Sorrel)
  * a one-floor Gloaming Below with one boss
* **Cut:** Starlit Shoals (the Moonmaw moves to the Vale moon pond) and Gloaming floor 2.
* **Systems: 10.** Anything else must live inside one of these or be cut:
  1. loot and affixes
  2. gems
  3. elements and reactions
  4. skills and ranks
  5. trinkets and aspects
  6. bestiary and Codex (one book)
  7. quests
  8. fishing and cooking
  9. crafting (temper, imbue)
  10. NG+ modifiers
* **Merges and cuts:**
  * Dream Tomes merge into Skill Runes: one item that teaches a weapon option or a character skill.
  * Rune-words are **cut**. Rules have two homes: aspects on legendaries, boons on trinkets.
  * Attune is cut.
  * Origin passives become the starter ring.
  * NG+ is one modifiers screen and promises no NG+-only content.
  * Mastery and achievements share one page.
* **Trimmed:**
  * arena to 5 tiers, as a balance test bed
  * hunt milestones to 10 and 25 kills
  * fishing to 18 fish (3 per zone) plus the legendaries, with 4 rods
  * secrets to 1 *good* secret per map, preferring visible puzzles to hidden cracks
* **Freshness:** 14–16 min per zone on the main path; a zone goes stale at 18 min.
* **Pacing check:** at least one new idea every 10 min of the main path. Fishing moves from the Vale to Pinewood.
* **Do not cut:** reactions, trinkets, the bestiary as a teacher, fishing core, the twist, the Codex.
* **Enemy roster:** see §21 (expert enemy review). Rule: more types are welcome, but **every enemy in a zone has a
  distinct verb**. No palette swaps.

### 20.3 Power curves (the targets the sim enforces)
The reference hero has the expected gear for each band (Rare → Epic, 2 gems per zone, 2 trinkets by Act II and 4 by
Act IV, no tempering).

| Band | L | Hero DPS | Hero eHP | TTK common | TTK elite | 3 enemies' DPS |
|---|---|---|---|---|---|---|
| Vale | 1–3 | 60 | 900 | 2 s | — | 25 |
| Pinewood | 3–10 | 110→220 | 1.1k→1.9k | 2.5–3.5 s | 12 s | 45→90 |
| Ruins | 10–17 | 220→420 | 1.9k→3.0k | 3–4 s | 14 s | 90→160 |
| Grotto | 17–24 | 420→700 | 3.0k→4.4k | 3–4 s | 15 s | 160→250 |
| Caldera | 24–31 | 700→1.1k | 4.4k→6.2k | 3.5–4.5 s | 16 s | 250→370 |
| Spire | 31–38 | 1.1k→1.6k | 6.2k→8.5k | 4–5 s | 18 s | 370→520 |

* **Common TTK** stays between 2.5 and 5 s across the whole game.
* **Survival:** standing in 3 commons, the hero dies in 10–14 s.
* **Boss length:**
  * mini-boss: 60–90 s
  * guardian: 150–240 s
  * Morrow: about 300 s
  * boss HP = length × ref DPS × uptime, where uptime is 0.7 for mini-bosses and 0.6 for guardians
* **Boss damage:** a telegraphed big hit takes 35–45 % of ref eHP, chip damage 8–12 %. Three mistakes kill; one never does.
* **Expected tuning:** `enemyHpMul` 1.10 → **~1.08 per level**, and gear tier steps of about 45 %. The sim decides.
* **XP:** bosses give 1 level and mini-bosses 0.5. Each zone has an XP band ceiling: XP drops to 10 % once you are 3
  levels above the band. A 2 h player meets Morrow at ~36 and a completionist at 38–40, about a 1.2× advantage.

### 20.4 Item power points (1 pp = +1 % DPS or eHP)
* tier upgrade: 40 pp on weapons, 25 on armour
* rarity step: 15
* affix tiers: T1 4, T2 8, T3 13; a temper adds 4–5
* gems: Chipped 4, Clear 8, Radiant 14 (a Radiant gem never beats a T3 affix)
* implicit: 5
* unique rule: 15–25 within its build, ≤ 5 outside it
* **Trinkets: ≤ 25 % of total gear power**, resonance included
* **An optimal build beats a random one by 1.6× DPS and 1.4× eHP**, reactions included; the CI band is 1.3–2.2×.

### 20.5 Skills, MP and the ultimate
* **Reactions:** 20–30 % of DPS for a reaction build, never more than 40 %.
* **Ultimate:** one cast per ~40 s baseline and ~25 s with reactions and the amulet; floor 18 s. Charge gain is capped at
  5 % per hit and 10 % per reaction.
* **MP:**
  * The rhythm is a ~6 s builder/spender cycle.
  * `mpOnHit` is **per family** (§17: daggers 6, sword 8, two-hander 14), basic attacks only, once per swing (not per
    target).
  * A hard cap of **40 MP/s** from hits. This fixes the uncapped M2a value.
* **Skill gap:** damage per MP within a slot ≤ 1.3×; best vs worst skill in a role ≤ 1.5×.
* **Caps:**
  * cdr is **40 %**, which matches the code; §19.6 is corrected.
  * Ring resonance counts **inside** the 50 % reaction-bonus cap.
  * The real ceiling is the sim's final-damage check (optimal ≤ 2.2× reference); the 1.6× buff cap alone doesn't
    guarantee it.

### 20.6 Economy and difficulty
* **Dust:**
  * A main-path run earns ~900–1,200 Dust.
  * Planned spend is ~700 Dust (6 tempers, 2 imbues, 3 Chipped gems, 2 runes). Income stays at ~1.3× spend.
  * A completionist earns ~3,000, enough to temper every slot once.
* **Potions:** about 1.2 per room on Normal and 0.6 on Story.
* **Difficulty modes:**
  * Story: damage taken ×0.6, telegraphs +0.2 s.
  * Normal: the reference.
  * NG+: ×1.6, absorbed by ilvl 40–44 and Mythic drops.
  * No Hard mode on a first run.

### 20.7 Tooling and CI
* **Sheets:** Haiku generates CSV sheets from the game data with a node script, never by hand. They live in
  `tools/balance/`:
  * hero_curve, enemy_curve, boss_length
  * item_pp, skill_table
  * dust_flow, xp_path
* **Sim:** `tools/balsim.js` (Opus).
  * It runs the real `SKILLS` and damage math headless, with a scripted rotation of basic ×3 → skill → dodge.
  * It runs against each zone's reference enemy and boss, for the reference, random and optimal builds, on Story,
    Normal and NG+.
* **CI red flags** (each fails `node tools/smoke.js`):
  * common TTK below 1.5 s or above 7 s
  * a mini-boss under 45 s or over 120 s
  * a guardian under 100 s or over 300 s
  * the optimal/random ratio outside 1.3–2.2×
  * reaction share above 40 %
  * an ultimate faster than every 15 s
  * any stat sum over its cap
  * Dust sinks larger than income
  * more than 2 potions per room
  * a hero level at Morrow outside 34–40 on either path
* **When:** the sim and sheets land in **M2b**, and every later milestone ships only with the sim green.

## 21. Enemy roster and behaviour parts (expert review; director-approved; supersedes §11.4 roster counts)

**Rule:** more enemies are good **if each one adds a verb**, meaning a different player decision. Palette or stat
swaps ("Elder Ogre") are banned. A zone variant counts as half an enemy: at most 2 per zone, each with one new part.

### 21.1 Roster: 28 commons (every row is a distinct decision)
| Zone | Enemies (verb → what the player does) |
|---|---|
| Vale | Dream Moth (swarm that drifts to light → AoE basics) · dummy |
| Pinewood | Gloom Slime (splits → finish smalls) · Shade Hound (line lunge → sidestep, punish) · Bramble Shaman (poison zones + **heals** → kill first) · Ogre (cone brute → dodge through, stagger) · Thornback Boar (**burrows** → keep moving; surfaces staggered) · Mountain Troll (**sleeper**; Root Hollow only → skip or prep) |
| Ruins | Wisp (kiting shooter → close with dash/holy) · Gloom Knight (**shield-front** → flank or break) · Grave Chanter (**summons** wisps, Dread aura → interrupt) · Pillar Mimic (ambush → read the room) · Shadeling Swarm (6 tiny chasers → nova) · Void Archer (**sniper** line from off-screen → line of sight) |
| Grotto | Frost Jelly (split + Chill puddles) · Tide Crab (shield-front + **teleport** on bubbles) · Glowfin Shoal (orbiting swarm → nova timing) · Deepsinger (**aura-buffer** −50 % dmg → pull/kill her) · Lightning Eel (water-path-bound charges → fight on dry tiles) · Crystal Sentinel (turret, sweeping beam → cover timing) |
| Caldera | Cinder Imp (**bomber** → range or dodge the fuse; Chill defuses) · Slag Golem (poise brute → charged swings) · Ash Wraith (teleport backstab → turn, counter) · Forge Priest (**trap-layer** lava mines + heals golems) · Magma Hopper (hops, fire pools, splits) |
| Spire | Vigil Knight (linked shield pair → hit the one not blocking) · Star Archer (3-shot sniper from islets) · Dread Herald (aura + summons swarms → priority target) · **Unmade** (copies the hero's silhouette and last skill shape; ties to the twist) · Void Bomber (bomber swarm of 3) |

Each row also defines element / damage type, weak / resist, and the reaction it teaches. The expert's table is the
source for those; Haiku transcribes it into `ENEMY_DATA` when the part runtime lands.

**Bosses (10 main + vault bosses):** Bramblehorn, Gloam Warden, Mirelle, Kharzul and Morrow; mini-bosses Mossjaw and
Slagheart; optional Sorrel's Echo and the Unwaking Child.

**Director ruling:** the **Oathless** (Crypt vault) and **Brinemother** (Drowned Vault) stay as **vault bosses**, built
cheaply: Gloom Knight and Tide Crab rows at boss scale with 2 elite mods and a boss bar, so they need no new art. The
**Twin Vigils** are the Vigil Knight linked pair in the Spire ascent's last room.

**Cut order if art slips:** the 5th enemy of each zone first (Boar, Mimic, Eel, Magma Hopper, Void Bomber), never a
support or ranged enemy.

### 21.2 Behaviour parts (enemies are data)
`{name, sprite, hp, speed, dmg, el, dmgType, stagger, res, tags, parts:[...], params:{part:{...}}}`
* **Movement (one):** chase, kite, orbit, charge, burrow, teleport, path-bound, stationary, sleep, mimic.
* **Attack (1–2):** brute (reuses the BOSS_MOVES cone/circle), shoot, beam, sniper, bomber, zone-caster, trap-layer.
* **Support (0–1):** healer (4 s telegraphed heal, ≤ 30 % of the target's HP), aura-buffer, summon, shield-front,
  linked.
* **Death and group:** split, zone-on-death, swarm (a swarm counts as **one** enemy for XP and loot).
* The editor's Enemies tab shows parts as checkboxes with param fields. Once the runtime exists, a new enemy costs one
  data row (Haiku), one 12-frame sprite set (~0.5 Sonnet-day) and 3 sound recipes (Haiku).
* **Director ruling:** the part runtime moves **from M4 to M2b**, because Pinewood's healer, burrower and sleeper need
  it. The existing hopper, shooter, charger and brute become the first 4 data rows.

### 21.3 Elite modifiers (8)
* Shielded (a periodic front shield to break)
* Storm (Shock aura that arcs when adjacent)
* Burning (fire trail)
* Frozen (rare)
* Gloomed (Dread aura)
* **Twin** (a linked copy at 50 %; replaces Fast, which was only a stat)
* **Vampiric** (heals on hit)
* **Summoner** (a periodic swarm)

### 21.4 Encounter rules (validated by Haiku's sheet from the trigger data)
* **Roles:** each pack has 1 anchor (brute or armoured), 2–4 pressure (chase, charge or swarm), 0–1 support and 0–1
  ranged.
* After room 1, every room has a support or ranged enemy that is the correct first target.
* Each zone has one pack combining two supports (e.g. healer + shield-front).
* Each zone has one pack that is the wrong weapon on purpose.
* No pack has two enemies with the same movement part.
* Elites never spawn alongside healers.
* Sleepers and mimics appear at most once per map, and only after a shrine.
* Swarms always have a visible source.

### 21.5 Pacing and budget
* **Bestiary:** ~56 entries (28 commons, ~12 bosses, fish).
* **Main-path pacing:** a new enemy every ~4 min and a new verb every ≤ 6 min. Pinewood holds the troll back for Root
  Hollow.
* **CI data checks:**
  * any 10-minute main-path window without a new enemy type
  * any zone whose rooms use fewer than 4 movement parts
* **Art per milestone (Sonnet-days):** M2b 4 · M4 4 · M5 4.5 · M6 5 · M7 5 · lane O 3, about 26 in total.

## 22. The 27 maps and the studio (expert review; client chose 27 maps; supersedes §20.2's map list)

**Rule:** a map exists only if it has a hook the previous map didn't. If a map's hook slips, cut the map; never ship it
as corridors. Mechanics must be beatable by skill, never timers you wait out.

### 22.1 Main path (16 maps, ~110 min)
| # | Map | Kind / size | Hook |
|---|---|---|---|
| 1 | Whispering Vale | hub 40 | tutorial, Elder Stone; the hub visibly heals each act |
| 2 | Misty Pinewood | outer 56 | enemy debuts; fleeing animals form a trail; fishing introduced |
| 3 | Root Hollow | dungeon 32 (2 rooms) | key door, lever bridge, burrowing boars, Mossjaw |
| 4 | Bramblehorn's Clearing | boss 22 | root-pillar arena |
| 5 | Gloomspire Ruins | outer 56 | shield knights, snipers; the pillar names (twist seed) |
| 6 | Warden Crypt | dungeon 36 | **darkness**: your light radius, relight lanterns; mimics and summoners |
| 7 | Warden's Hall | boss 22 | falling pillars in phase 3 |
| 8 | Sunken Grotto | outer 64 | **tide** tiles on a timer; water-bound eels |
| 9 | Drowned Vault | dungeon 36 | **airlock** gates (only one open at a time); crabs, Deepsinger |
| 10 | Mirelle's Basin | boss 24 | ring arena that floods each phase |
| 11 | Emberfall Caldera | outer 64 | lava rivers crossed on timed cooling-slag **platforms** |
| 12 | Forge Deep | dungeon 36 | furnace bellows **wind** zones; trap-layer priests |
| 13 | The Anvil | boss 24 | the lava floor spreads each phase |
| 14 | Spire Ascent | ascent 48 | 5 height levels (falling sends you back to the last ledge); snipers; Twin Vigils in the last room |
| 15 | The Sleepless Court | 36 | void tiles vanish in a learnable rhythm; Dread Herald; the Unmade |
| 16 | Morrow's Throne | boss 28 | three phases, Pip's light |

### 22.2 Optional (11 maps; brings 100 % to ~4–4.5 h)
| # | Map | Hook |
|---|---|---|
| 17 | Vale Moon Pond (hub extension, 16) | night fishing; the pearl ritual for the true ending |
| 18 | Fox Warrens (vault 14) | **noise**: sneak past sleeping trolls |
| 19 | Oath Reliquary (vault 16) | mimic gallery; the Oathless vault boss |
| 20 | Glowfin Shallows (vault 16) | swarm fight on shrinking sandbars (tide) |
| 21 | Slag Chambers (vault 16) | wind + mine puzzle; Slagheart optional encounter |
| 22 | Vigil Walk (vault 16) | sniper gauntlet solved with cover |
| 23 | Drifting Isles (48, L34–40) | rift-hop bridges; Sorrel's Echo; the sixth legendary |
| 24 | Starlit Shoals (32) | **no combat**, fishing only; where the real Aerin drowned; **the Moonmaw lives here** (director ruling: story placement) |
| 25 | The Gloaming Below (36, post-game) | corrupted elites, the Gloomed tint (−10 % res), no shrines (**Story mode gets one**); the Unwaking Child |
| 26 | Dream Arena (24) | 5 tiers of mixed role packs; the balance test bed |
| 27 | Pip's Lanterns (rooftop islet 12) | pure story: three lanterns, three memories; powers the true ending |

Brinemother is the Drowned Vault's mini-boss. Each vault elite (Oathless, Slagheart, Twin Vigils) shares one data row
with its common-enemy version.

### 22.3 Keeping the cost per map low
* **New stamps** (Opus, built once): `vault`, `ascent`, `arena`, `islet-chain`.
* **Mechanic modules:** recipe fields that emit triggers. Each is a generator option plus one engine feature,
  ~1–2 days each, reused across maps:
  * `darkness`
  * `tide:{period}`
  * `airlock:[gates]`
  * `wind:[zones]`
  * `platforms:[timed]`
  * `noise:{sleepers}`
* **Per map:** a recipe drafted by Haiku, tuned by the level designer (Sonnet), and passed through `engine-check`, at
  about 0.5–1 day per map.
* Decoration comes from per-zone palette rules. Only rooms are hand-tuned.

### 22.4 Studio
* **Tiers:**
  * **Opus:** engine and cross-system invariants. Its risk is over-building, so I review the diff against the brief's
    non-goals.
  * **Sonnet:** art, UI, music, levels. Its risk is drifting from the spec, so I review screenshots against the spec's
    numbers.
  * **Haiku:** data, tests, sheets. Its risk is inventing ids that don't exist, so `tools/validate-ids.js` catches them.
* **File ownership is the lock.** A task that spans two owners' files is split into two prompts with an API contract
  between them.
* **Concurrency:** at most **4 agents at once** (1 Opus, 2 Sonnet, 1–2 Haiku).
* **Merge order per milestone:** engine (Opus) → data (Haiku) → content and UI (Sonnet) → QA.
* **Every owned file starts with a header:** purpose, exported globals, what it must never do, and which tests to run.
* **Every prompt** is ≤ 25 lines: goal, owned files, allowed APIs, spec sections, non-goals, acceptance, report format.
  Data tasks also include one filled example row.
* **Agent reuse:** reuse an agent for a series of same-shaped tasks. Spawn fresh after a merge or a spec change. Never
  reuse an Opus session across milestones.
* **Effort:** Opus high only for engine work; Sonnet medium; Haiku low.
* **New roles:**
  * **QA play-tester** (Sonnet): scripted routes each build, reporting death spots, soft-locks and unreadable telegraphs.
  * **Level designer** (Sonnet): owns the recipes.
  * **Balance tuner** (Haiku + balsim): proposes number diffs.
  * **Writer** (Haiku): lore lines only. Finale lines stay director-written.
  * **Build captain** (Haiku): runs every check and keeps the README.
* **Director ruling:** agents still never commit. The director commits after the checks pass.


## 23. Weapon classes and variants: 5 classes × 3 variants (client request; expert-designed; director-approved; supersedes §15.5's multi-option slots and §17's family lists where they conflict)

**Principle:** a **class** owns the rhythm (basic combo, MP generation, class passive, aim grammar). A **variant** owns its
damage type, the status it reinforces, its three skills, its decision, and a unique look at every tier. Each variant has
exactly **one Q/E/R plus one Skill Rune alternate per slot** (a rune now reads "Rapier: Q → Flèche"). Alternates are
sidegrades (±10 % DPS, a different shape or status). Existing casts are re-homed onto variants. **Origins** give the T1 of
one variant; the other variants drop from zone 1. Armour stays class-agnostic (F/C/Shift).

### 23.1 Classes and passives
| Class | Rhythm | Passive | Variants |
|---|---|---|---|
| Blades | 3-hit, 0.42 s, 8 MP/hit | 3rd hit is a wide sweep, cancel-friendly | Sword · Rapier · Mace |
| Greatarms | 2-hit, 0.62 s, 14 MP, charge 1 s ×1.8 | poise | Axe · Hammer · Halberd |
| Shots | 1 shot, 0.36 s | **Focus**: still for 0.6 s → next shot crits | Bow · Crossbow · Chakram |
| Foci | bolt, 0.48 s, builds MP | reactions refund 10 % MP | Staff · Spellbook · Orb |
| Shadows | 4-hit (§17) | backstab + Marks | Daggers · Claws · Fans |

### 23.2 Roster (Q / E / R · runes · status · decision)
* **Sword**: the measured blade, slash.
  * Skills: Q Sunslash, E Dash Strike, R Radiant Judgement.
  * Runes: Heroic Strike, Whirling Blade, Dawn Wave.
  * Reinforces Shatter and holy.
  * Decision: when to commit the dash.
* **Rapier**: the duelist's needle, pierce. 4 quick thrusts.
  * Skills:
    * Q Flèche: a line, +25 % crit.
    * E **Riposte**: a 1 s parry; a block staggers the attacker 3 and refunds the cooldown (ICD 1 s).
    * R Perforate: 5 hits; staggered targets take guaranteed crits.
  * Runes: Lunge-step, Feint, Coup de Grâce (execute).
  * Reinforces Rupture and Shock.
  * Decision: parry timing.
* **Mace**: the warden's hammerlet. Every hit staggers 1.
  * Skills:
    * Q Crush.
    * E Shield Bash: reflects projectiles mid-dash.
    * R Consecrate: a holy zone that heals and primes Purify.
  * Runes: Quake, Rally, Hammerfall.
  * Reinforces Stagger, Detonate and holy.
  * Decision: break bars or zone control.
* **Axe**: the splitter.
  * Skills: Q Cleave, E Shoulder Charge, R Colossus Strike (held).
  * Runes: Cinder Cleave, Whirlwind, Avalanche.
  * Reinforces Detonate and Wildfire.
  * Decision: charge or release.
* **Hammer**: the earthshaker, stagger 3. Basic hit 2 is a slam.
  * Skills:
    * Q Earthbreaker: persistent cracks.
    * E Seismic Leap.
    * R Aftershock: 3 rings that re-stagger and guarantee a break on staggerMax ≤ 9.
  * Runes: Ice Quake, Tremor, Meteor Hammer.
  * Reinforces Shatter and Rupture.
  * Decision: where your cracks are.
* **Halberd**: the reach, 1.5× range. Basics alternate thrust and sweep.
  * Skills:
    * Q Sweep: knockback.
    * E **Brace**: a spear-wall counter.
    * R Skewer: pins a boss-class enemy for 1.5 s.
  * Runes: Storm Sweep, Vault, Pike Square.
  * Reinforces Conduct and Rupture.
  * Decision: spacing at 2–3 tiles.
* **Bow**: the volley.
  * Skills: Q Multishot, E Tumble, R Rain of Arrows.
  * Runes: Venom Volley, Snare, Moonbeam.
  * Reinforces Poison, Wildfire and Chill zones.
  * Decision: spread or focus.
* **Crossbow**: the bolt, stagger 2. A **4-bolt clip with a 1 s reload** (dodge-cancellable; reloading while still gives
  Focus).
  * Skills: Q Piercing Bolt, E Bolas (root + Mark), R Ballista (1.2 s channel, ≤ 25 % of boss HP).
  * Runes: Explosive Bolt, Grapple, Hail.
  * Reinforces Rupture and Shock.
  * Decision: manage the clip.
* **Chakram**: the return, ranged slash. A thrown disc that returns, hitting twice.
  * Skills: Q Ricochet, E Orbit Disc, R Guillotine.
  * Runes: Split, Blade Dance, Eclipse.
  * Reinforces Shatter at range and Conduct.
  * Decision: line up the return.
* **Staff**: the elementalist.
  * Skills: Q Firebolt, E Gravity Well, R Meteor.
  * Runes: Static Field, Blink-cast, Starstorm.
  * Reinforces Burn, Detonate and Wildfire.
  * Decision: place the circle.
* **Spellbook**: the ritualist. **Pages**: each skill cast adds a page (max 3), and basics consume pages to grow (bolt →
  3 bolts → beam).
  * Skills:
    * Q Frost Shards.
    * E Arcane Barrage: +1 missile per page.
    * R Rune of Binding: freezes on its 3rd pulse.
  * Runes: Hex, Ward, Tome Burst.
  * Reinforces Chill → Shatter and Overload.
  * Decision: spend pages or save them.
* **Orb**: the channeler. **Channel**: hold for a beam that drains 6 MP/s; tap for a bolt that builds MP. Beam DPS ≤ bolt
  DPS +15 %.
  * Skills: Q Chain Lightning, E Lightning Orb, R Tempest.
  * Runes: Ball Lightning, Mirror Orb, Singularity.
  * Reinforces Shock, Conduct and Overload.
  * Decision: beam or build.
* **Daggers**: as in §17.2. Poison and Rupture.
* **Claws**: the beast. **Frenzy**: +5 % attack speed per consecutive hit, max +50 %, decays after 1.5 s.
  * Skills: Q Rend, E Pounce, R Savage.
  * Runes: Maul, Shadow Pounce, Bloodmoon.
  * Reinforces Burn and stagger.
  * Decision: never stop hitting.
* **Fans**: the dancer, mid-range. Returning fans; Marks on any hit, each Mark slows 10 %.
  * Skills: Q Veil Dance (Chill), E Mirage Step (taunting decoy), R Thousand Petals (freezes on its last tick).
  * Runes: Ice Fans, Flourish, Silk Storm.
  * Reinforces Chill, Shatter and control.
  * Decision: control the room from mid-range.

Every variant uses at least 3 aim shapes. The new shape is the channel-beam.

### 23.3 Tier names (T1 → T5 → Mythic)
The look on the hero escalates through the tiers: grey → ornate → sun- or moon-etched → glowing → made of light.

| Variant | T1 | T2 | T3 | T4 | T5 | Mythic |
|---|---|---|---|---|---|---|
| Sword | Rusty Blade | Dawnblade | Sunforged Blade | Aurora Edge | Dawn Eternal | Morrowbane |
| Rapier | Tin Needle | Moonpoint | Silver Estoc | Starpoint | Needle Eternal | *Sorrel's Needle* |
| Mace | Iron Cudgel | Dawnmace | Sunwarden Mace | Aurora Maul | Vow Eternal | *Lamplighter* |
| Axe | Splitting Axe | Dawnbreaker | Sunforged Axe | Aurora Cleaver | Dawn Colossus | Forgehand |
| Hammer | Sledge | Sunhammer | Mountain Maul | Aurora Anvil | Hammer Eternal | Chainbreaker |
| Halberd | Pike | Dawnglaive | Sun Halberd | Aurora Partisan | Reach Eternal | Vigil's Glaive |
| Bow | Hunter's Bow | Moonbow | Silverwing | Eclipse Longbow | Moon Eternal | Moonmaw's Bow |
| Crossbow | Hand Crossbow | Dawn Arbalest | Sunbolt | Aurora Ballista | Bolt Eternal | Four Wardens |
| Chakram | Rim | Moon Chakram | Silverring | Eclipse Ring | Ring Eternal | Aerin's Halo |
| Staff | Willow Wand | Starfall Staff | Comet Rod | Nebula Sceptre | Night Eternal | Emberfall |
| Spellbook | Primer | Dreambook | Sun Codex | Aurora Grimoire | Book Eternal | The Names on the Pillars |
| Orb | Glass Bauble | Starfall Orb | Comet Orb | Nebula Sphere | Orb Eternal | *Last Light* |
| Daggers | (§17 tiers) | | | | | Reliquary |
| Claws | Bone Claws | Nightclaws | Silvertalon | Eclipse Claws | Claws Eternal | Bramblehorn's Roots |
| Fans | Paper Fans | Moonfans | Silverplume | Eclipse Fans | Fans Eternal | Mirelle's Tide |

Director renames are in italics. Pip's Lantern and Sorrel's Vow are already existing uniques, and "Last Light" honours Pip
without making the hero wield it.

### 23.4 Balance (balsim gets a variant loop)
* DPS parity across all 15 variants is **±15 % at equal tier**.
* Each variant's utility score (i-frames, control and sustain per minute) stays within 0.8–1.2× of its class mean.
* Rune alternates stay within ±10 % of the base skill; balsim flags anything over 15 %.
* A variant's status bonus is +15 % `statusChance`, additive and never a multiplier.
* Caps per variant:
  * the Riposte has a 1 s ICD
  * a Ballista bolt deals ≤ 25 % of boss HP
  * Aftershock only guarantees a break on staggerMax ≤ 9
  * the Chakram sim assumes 60 % return uptime
  * Frenzy caps at +50 %
  * pages reset on swap

### 23.5 Mastery, swapping, story
* **Variant mastery** has 5 ranks earned by kills and replaces weapon mastery. At rank 3 you get the rune alternate free.
  At rank 5 a **hybrid twist** unlocks, e.g.:
  * the Sword's Judgement staggers
  * the Rapier's Riposte reflects projectiles
  * the Hammer's cracks last 6 s
  * the Orb's beam Conducts
  * the Crossbow's clip holds 6
* **Two weapon slots.** Swap with a 1 s cooldown. Swapping triggers the **Changeover** Duo (the next skill costs 0 MP),
  at most once per 8 s, and it counts in parity. This lands in M5.
* **Story:** every Mythic is a story object found on the 27 maps. Each variant appears first as an **enemy weapon**
  (halberd knights, crossbow archers, orb-channelling chanters).

### 23.6 Cost, code, migration, schedule
* **Art: a parts kit per class**, built first in **M3** with the hero wiring (director ruling: the expert said M4).
  * Each variant gets one silhouette template. Each tier is a palette plus 2–3 part swaps.
  * 90 weapon layers + ~105 icons ≈ 6–7 Sonnet-weeks, staged by milestone.
  * One new attack pose per class: thrust, channel, throw.
* **Code:**
  * 8 new mechanics: channel-beam, returning projectile, parry, reload clip, pages, frenzy, decoy-taunt, persistent
    cracks.
  * At most **36 new cast functions**. The existing 42 are reused.
* **Data and saves:**
  * `WEAPONS[class].variants[id]`, with FAMILY_TIERS keyed by variant.
  * Save migration: dawnblade→sword, starfall→staff, moonbow→bow, nightfang→daggers, dawnbreaker→axe.
  * Runes are stored as `variant:slot`.
* **Schedule:**
  * M3: the structure refactor, migration and parts kit.
  * M4: Rapier, Mace and Crossbow, **plus prototypes of the Orb beam and the Crossbow reload on touch** before the rest
    is committed.
  * M5: Spellbook, Orb, Chakram and weapon swap.
  * M6: Hammer, Halberd and Claws.
  * M7: Fans and all Mythics.
  * M8: mastery twists.
* **Cut order if behind:** Fans → Halberd → Chakram → Claws → Mace. Never cut Rapier, Crossbow, Spellbook, Orb or Hammer;
  they carry the new mechanics.
* **Risk:** the art collides with the 27 maps and 28 enemies in M4–M7. The parts kit must land in M3, or one of the three
  slips.

## 24. Armour classes × 3 suits (client request; expert-designed; director-approved; supersedes §15.5's armour option lists and §17.4)

**Structure:** 4 armour classes, each with 3 **suits**. A suit is a variant that spans chest, helm and boots. Pieces mix
freely.
* **The class owns:**
  * the ±25 % chest resist profile
  * the stat shape
  * the class 3-piece tag rule:
    * Heavy: melee skills gain poise
    * Caster: zones follow you
    * Medium: projectiles pierce once
    * Shadow: dashes leave decoys
* **The suit owns:**
  * its F/C/Shift skills
  * the status it reinforces
  * its implicits
  * its look
  * a **suit twist** that applies when you wear all 3 matching pieces
* **Skill Runes:** for armour these exist on the chest only, as F alternates. Helms and boots get none (the anti-bloat
  line).
* **Boots:** every boots skill keeps i-frames, but each moves differently: dash, leap, blink, slide, sidestep, carry,
  roll, pass-through.
* **Origins:** each Origin gives the T1 chest of its suit (Knight → Warden, Mystic → Dreamweave, Ranger → Stalker,
  Thief → Shade, Warrior → Juggernaut).
* **Merged:**
  * Thornmail becomes the Thornwarden chest.
  * The Shade set becomes the Shade suit twist.
  * Sprint is cut.
  * Dreamveil moves to the Mirage helm.
  * The belt's gem-wrap now reads "chest and boots of the same class".

| Class (profile) | Suit — F / C / Shift · reinforces · decision |
|---|---|
| **Heavy** (HP/def; slash/pierce +25, lightning −25) | **Warden**: Bulwark (projectile reflect is baseline at T3+) / War Cry / Charge · Stagger, Rupture · face the volley. **Crusader**: Consecrated Guard (holy zone) / Judgement Bell / Vault · Purify, holy · zone or chase. **Juggernaut**: Brace (poise, then shove) / Ground Slam (cracks) / Bull Rush (carries an enemy, 0.25 s of i-frames) · Stagger, Shatter, Detonate · tank the hit on purpose |
| **Caster** (MP/power; arcane +25, physical −25) | **Dreamweave**: Mana Surge / Arcane Ward (a shield that pops into a nova) / Blink · Overload · shield or nova. **Frostweave**: Winter's Veil / Frost Nova / Glide (leaves a frost trail) · Chill → Shatter · where you leave ice. **Stormweave**: Static Cloak / Stormcall / Flash Step (leaves a lightning line) · Shock, Conduct · take hits to charge |
| **Medium** (crit/haste; pierce +25, fire −25) | **Stalker**: Shadow Veil / Hunter's Mark / Tumble · Rupture, Focus · open from stealth. **Thornwarden**: Briar Mantle / Mend (Bloom) / Root Vault (leaves a snare) · Poison → Wildfire · kite through snares. **Duelist**: En Garde (parry; shares an ICD with the Rapier's Riposte) / Taunt / Side-step (cd 3) · Rupture, Shock · parry or dodge |
| **Shadow** (speed/crit; pierce +25, nature −25) | **Shade**: Fade Step / Smoke Bomb / Shadowstep (leaves a decoy) · Marks, Overload · where the decoy stands. **Nightshade**: Venom Coat / Toxin Flask / Slink (backstab from any angle) · Poison → Wildfire · spread or stack. **Mirage**: Mirror Image / Dreamveil / Phase (pass through enemies) · control, summons · images as decoys or damage |

Tier names and per-tier visuals follow the expert's table, kept in the production log.
* Examples:
  * Warden: Iron Mail → Knight Plate → Sunforged Plate → Aurora Plate → Aegis of Dawn → Mythic Shardheart Plate
  * Duelist: Swordsman's Coat → … → Blade Eternal, Mythic Oathless Jacket
* **Director ruling on Mythic names:** there are too many "Sorrel's" and "Pip's" items, and "Warden's Lantern" collides
  with the Lantern Plate. All Mythic names get one naming pass across §23 and §24 before M7, so each story name is used
  once. Done: see §24.2.
* **Combos** use tags, never slot checks. Examples:
  * Rapier + Duelist: two parries sharing one ICD
  * Hammer + Juggernaut: the "Faultline" Duo; their cracks share a tag
  * Chakram + Stormweave: Conduct both ways
  * Crossbow + Stalker: crits while reloading
  * Spellbook + Dreamweave: double glyphs
  * Fans + Mirage: images that throw fans
  * Mace + Crusader: the "Sanctuary" Duo, with one zone and no stacking
* **Suit twists:** for example, Juggernaut: poise never breaks below 25 % HP; Stormweave: Conduct +1 jump. All of them are
  `EFFECTS src:'suit'`.
* **Balance (balsim armour loop):**
  * eHP within ±10 % inside a class.
  * Utility within 0.8–1.2× of the slot mean.
  * No slot variant above a 60 % pick rate in the optimal-build search.
  * Total i-frame uptime ≤ 50 %.
  * Poise capped at 75 %.
  * One summon cap of 3 covering images, decoys and summons.
  * Suit resists shift at most ±10 % toward the suit's element, and the hero clamp still applies.
* **Cost:**
  * 216 overlays + 216 icons ≈ 13 Sonnet-weeks with the parts kit (36 silhouettes, tiers made of palette + part swaps).
  * At most 5 new mechanics: parry-for-all, glide trail, phase, carry-dash, mirror images.
  * At most 36 new casts.
  * Save v4 migration: knightplate→warden, dreamrobe→dreamweave, stalkerjacket→stalker.
* **Schedule (to be confirmed by the scope decision below):**
  * M4: the structure and the 4 Origin suits, plus the Juggernaut chest.
  * M5: Frostweave, Thornwarden.
  * M6: Crusader, Duelist, Nightshade.
  * M7: Stormweave, Mirage and the Mythics.
* **Cut order:** Mirage → Stormweave → Crusader → Nightshade → Duelist.
* **Scope warning:** §23 and §24 together do not fit M4–M7 alongside the 27 maps and 28 enemies. The client chooses
  (§24.1).

### 24.1 Scope decision (client)
**Everything stays:** 15 weapon variants (§23), 12 armour suits (§24), 27 maps (§22), 28 enemies (§21). The client
accepts that the finale arrives roughly 8 studio-weeks later. Every tier is fully drawn; no placeholder tiers. To protect
the schedule:
* The weapon and armour **parts kit** is built in M3, before any variant art.
* Art runs as a continuous lane: one art agent on variants and one on enemies, in parallel with maps.
* The cut orders in §23.6 and §24 stay on file as emergency levers only.

### 24.2 Mythic names (naming pass)
Naming pass over the 15 weapon variants (§23.3) and 12 suits (§24), per the director ruling above. Each story name is used by
one Mythic only. The director renames (*Sorrel's Needle*, *Lamplighter*, *Last Light*) and the existing uniques (Pip's
Lantern, Sorrel's Vow, Morrowbane) are kept. No name gives away the twist (STORY.md).

| Class | Variant | Mythic name | Refers to |
|---|---|---|---|
| Blades | Sword | Morrowbane | Morrow's boss drop at the Spire (existing unique) |
| Blades | Rapier | *Sorrel's Needle* | Sorrel, the exiled fifth Warden (director rename) |
| Blades | Mace | *Lamplighter* | Pip, the last light (director rename) |
| Greatarms | Axe | Forgehand | Kharzul, who forged the Shards in Emberfall Caldera |
| Greatarms | Hammer | Chainbreaker | Caldera tablet: "He forged the chains after." |
| Greatarms | Halberd | Vigil's Glaive | The Twin Vigils who guard the Spire gauntlet |
| Shots | Bow | Moonmaw's Bow | Moonmaw of the Starlit Shoals (Mythic chance) |
| Shots | Crossbow | Four Wardens | Tablet "Four Wardens. One would not wake."; four-bolt clip |
| Shots | Chakram | Aerin's Halo | Aerin, Morrow's daughter; the disc returns in a ring |
| Foci | Staff | Emberfall | Emberfall Caldera; the fire the staff calls down (Meteor) |
| Foci | Spellbook | The Names on the Pillars | Gloomspire plaza pillars; each page is a name |
| Foci | Orb | *Last Light* | Pip's light (director rename) |
| Shadows | Daggers | Reliquary | Oath Reliquary's mimic vault; the Thief's backstab and Marks |
| Shadows | Claws | Bramblehorn's Roots | Bramblehorn, keeper of Misty Pinewood's roots |
| Shadows | Fans | Mirelle's Tide | Lady Mirelle of the Sunken Grotto |
| Heavy | Warden | Shardheart Plate | The Shards, glowing at the chest (replaces Warden's Lantern) |
| Heavy | Crusader | Gloomspire Vestment | Gloomspire Ruins, where the Wardens swore |
| Heavy | Juggernaut | Forge Deep Cuirass | Forge Deep, where Slagheart the armoured golem stands; the tank's chest |
| Caster | Dreamweave | Nightlong Shroud | Spire ascent tablet: "He said: one more night." |
| Caster | Frostweave | Brinemother's Veil | Brinemother of the Drowned Vault |
| Caster | Stormweave | Gravewind | The Drifting Isles, the Wardens' graves; their storm lightning |
| Medium | Stalker | Pinewood Mist | Misty Pinewood, where the trees are running |
| Medium | Thornwarden | Briarwatch Mantle | Bramblehorn's Clearing, the briar-ringed arena at Misty Pinewood's heart |
| Medium | Duelist | Oathless Jacket | The Oathless, the armoured knight of the Oath Reliquary |
| Shadow | Shade | Gloamveil | Woven from the Gloaming Below, where Morrow buried his nightmares |
| Shadow | Nightshade | Mossjaw's Skin | Mossjaw, the Root Hollow mini-boss |
| Shadow | Mirage | Glasswarp Silk | The Unmade (Spire enemy) copies your silhouette; mirror images |

## 25. Fewer, bigger maps: 4× area (client decision; expert plan; director-approved; supersedes §22's map list, keeps every hook)

**27 maps become 8.** Each zone is now one big map divided into **sections** (outer, underground/interior, vault,
arena). The sections share one grid and are separated by 3-tile void gutters (drawn as cliffs or darkness). You move
between them through **warp doors**: a 0.4 s fade within the same map, with no load and no lost trigger state.
Underground is a palette and lighting look, not a separate layer. Guardian arenas are inline walled rooms with gates.
Morrow keeps his own map.

| # | Map | Size | Sections (absorbs) |
|---|---|---|---|
| 1 | Whispering Vale | 80×80 | hub · Moon Pond (night fishing, pearl ritual; opens after Act IV) · Pip's Lanterns islet (opened by the Spire key) · Dream Arena islet |
| 2 | Misty Pinewood | 112×112 | forest (animal trail, fishing debut) · Root Hollow (underground SW: key door, lever, boars, sleeper, Mossjaw) · Fox Warrens (vault, noise) · Bramblehorn's Clearing (inline arena, NE) |
| 3 | Gloomspire Ruins | 112×112 | plaza (pillar names) · Warden Crypt (darkness) · Warden's Hall (arena) · Oath Reliquary (vault, mimics, Oathless) |
| 4 | Sunken Grotto | 112×112 | caves (tide) · Drowned Vault (airlocks, Brinemother) · Mirelle's Basin (arena) · Glowfin Shallows (vault) · Starlit Shoals (north coast, no combat, Moonmaw) |
| 5 | Emberfall Caldera | 112×112 | rim (lava platforms) · Forge Deep (wind) · The Anvil (arena) · Slag Chambers (vault, Slagheart) |
| 6 | The Sleepless Spire | 96×128 | ascent (5 ledges, Twin Vigils) · Sleepless Court (void rhythm) · Vigil Walk (optional vault) |
| 7 | Morrow's Throne | 28×28 | separate finale map |
| 8 | The Drifting Isles | 96×96 | isles (rift-hop, Sorrel's Echo) · The Gloaming Below (post-game, underground, the Unwaking Child) |

### 25.1 Pacing rules per big map
* **Points of interest:** one every 12–15 tiles, and a landmark every ~30 tiles, visible from the previous one.
* **Shrines:** 3 per map, with **shrine-to-shrine warp**. You can only warp while no enemy is awake (director-approved
  rule).
* **Routes:** 2 shortcut loops back to the shrines, and 15–25 s between fights.
* **Fights:** 8–9 per map (outer 3 rooms + an elite, underground 2 rooms + the mini-boss, vault 1–2 rooms, the arena).
* **Secrets:** 5 per map: one per section, plus one that crosses between sections.
* **Times:**
  * Main path ≈ **130 min**. The client accepts the extra minutes that come with bigger maps.
  * **Hard cap: any map that measures over 24 min on the timed run loses a room**, not a corridor.
  * Merged dungeons stay at 2 rooms, and vault sections stay optional.
  * 100 % ≈ 4.5 h.
* **Boss deaths:** dying in an inline arena respawns you at the nearest shrine. The arena resets its adds and pillars.

### 25.2 Tech (required)
* **Ground:** a chunked ground raster.
  * 512 px chunks rendered lazily over idle frames, with ≤ 24 resident and LRU eviction. Phones use 256 px chunks with
    12 resident.
  * Only the start chunk is rendered behind the fade.
* **Spatial grid:** 8×8-tile buckets for objects, columns, colliders and area triggers.
* **Enemy sleep:** enemies sleep beyond 18 tiles (a 1 Hz heartbeat). At most 24 are awake (16 on phones). Off-screen
  projectiles and zones beyond 20 tiles are culled.
* **Minimap:**
  * On the HUD, a local 24-tile window.
  * A full-map screen (M / D-pad down) with fog of war and section insets.
  * The fog bitmap is stored in the save.
* **Save:** adds per-map `sections` and `shrines` discovered.
* **Budgets:** at most 40 visible lights. Phone p95 ≤ 20 ms on the engine-check tour of every section.
* **Generator:** a `zone` stamp that composes the outer, dungeon, vault and boss sub-stamps with offsets, plus auto void
  gutters, `warpdoor` objects, the `warp` trigger action, and per-section ambient/palette. Until the stamp lands, a zone
  can be built as merged recipes placed by offset.

### 25.3 Act I (rebuilt before the slice ships)
* **Vale:** 80×80. Sections: pond, lanterns, arena islet. 2 shrines. The dummies and the Stone are within 15 tiles of the
  start, the first chest at 10 tiles.
* **Pinewood:** 112×112, using the expert's zone recipe (kept in docs/PRODUCTION.md).
  * The forest has 3 shrines, a creek, 2 shortcut loops, the elite, and the tablet.
  * The Hollow is underground SW, entered by warp door with the key and left by a root-stair up to shrine 3.
  * The Warrens vault is behind the pond secret.
  * The Clearing arena sits behind a gate.
* **Fallback:** if `warp` isn't ready, the Hollow stays a separate 56×20 map for the slice and merges in M4.

**Flags:**
* If the client later wants *more* maps at this size, the art lane breaks first.
* Eight full rasters must never be resident at once. The chunk cache is mandatory on phones.

## 26. Multi-bar boss phases, the gear loop, skill-variant legendaries (client request; expert-designed; director-approved)

### 26.1 Boss phases: one HP bar per phase
* **Bar count:** mini-boss 2, guardian 3, act boss 4, Morrow 5. Each bar is its own pool.
  * Damage clamps at the end of the bar, so one burst can't skip a phase.
  * Between bars there is a 1.2–1.8 s transition with the onEnter telegraph.
  * The HUD shows a segmented bar.
* **Each new phase turns three knobs:**
  1. One new move.
  2. One existing move gains a *cunning* form: a feint, a delayed second hit, or aim at the hero's predicted position.
  3. More aggression: `windMul` goes 1.0 → 0.85 → 0.7 → … and the gaps between moves get shorter.
* **Fairness floors still apply:**
  * Melee-range telegraphs keep a wind-up of at least ~0.55 s, so a 0.3 s reaction plus a sidestep fits.
  * The 45 % hit cap (Story 30 %) and `bossFairness` stay.
* **Harder through pattern, not numbers:**
  * The §20 fight-length bands stay.
  * Difficulty comes from the extra phases and the cunning forms.
  * A Hard mode arrives later as an NG+ modifier.
* **Engine:** `bosses.js` already supports `phases[].hpBelow / moves / onEnter / windMul`. The new work is the bar clamp,
  the segmented bar, cunning move forms and data for every boss. Mossjaw (2 bars) and Bramblehorn (3 bars) are rebuilt first.

### 26.2 The gear loop: farm until you can beat the boss
* **The balsim live table target changes** (this reverses the M2b ruling that an under-geared hero must always win):
  * at −1 gear tier: **3–4 / 6 wins**
  * at reference gear: **6 / 6 wins**
  * Red flags: a −1-tier win rate outside 3–4/6, or anything under 6/6 at reference. On Story, also 0/6 at −2 tiers.
* **The boss door shows "Recommended ilvl N · yours M".** This is information, never a lock.
* **Elite pockets:** each map has 2–3 near its boss. The first clear of each guarantees a Rare at or above (boss ilvl − 2).
  This farming is optional and fits inside the 24-min map cap (about 6 min of it).
* **Retries are cheap:** a shrine-to-boss warp makes a retry cost about 20 s, not a walk.
* Caves, vaults and side sections are where the loop happens. They exist already, so the loop adds content density,
  not map count.

### 26.3 Skill-variant legendaries: borrowed verbs
* A skill-variant legendary is an **aspect that swaps one skill slot for a sibling variant's skill in the same class**.
  * Example: a Sword legendary carries the Rapier's Q while keeping the Sword's E and R.
  * It reuses §23's cast functions, so it adds zero new casts against the 36 cap.
  * It enables cross-variant builds.
* **Count:** one per class, 5 in total, *inside* the 18-unique budget. They are the 5 world uniques of §19.5, found in
  vaults or by fishing: discoveries, not boss drops.
* **Balance:** the borrowed skill uses the host weapon's power (pp units), and its rune slot is locked while the legendary
  is equipped.
* They ship as each sibling variant lands (M4–M7).

### 26.4 Mobile performance: stay on Canvas 2D (expert ruling)
* **Why no engine switch:** every hitch found so far was algorithmic (the synchronous map build, a per-pixel moon
  redraw), not a Canvas 2D ceiling. The file:// and no-build constraints plus the working codebase make a rewrite a
  milestone-sized risk.
* **Perf lane order:**
  1. Measure on a real device, using an on-screen p95 readout behind `?perf=1`.
  2. Split the play.js perf budget by phase: ground, entities, lights, bloom, HUD.
  3. On phone, render at 0.5–0.75 DPR with smoothing off, then upscale.
  4. Lights and bloom at quarter resolution with a light cap. On phone, a particle cap and frame-skip. No per-frame
     allocations.
  5. Static layers go to offscreen canvases (the same pattern as the cached hero).
* **Switch criterion:** only if, after steps 1–5, a mid-range Android still shows p95 > 25 ms *and* the profile is
  draw-call bound. Even then, swap only render.js's sprite path to a thin WebGL batcher behind the same draw API.
  That is a renderer swap, never a game-engine switch.

## 27. Hit feel: power-scaled hitlag, death fling and tumble (expert meeting 2026-10-20; director-approved)
Full minutes: `docs/meetings/2026-10-20-feel-ui.md` (R1, R2). Summary:
* **Hitlag**
  * **Formula:**
    * Computed in one place, `damageEnemy`, using `r = dmg / e.maxHp` (the phase bar's max once §26.1 lands) and the skill
      weight `w` (basic 1.0, heavy 1.5, ultimate 2.0).
    * **Target-only freeze** on every hit, projectiles included: `clamp(round((2 + 6r) * w), 2, 8)` steps. It adds zero
      input latency.
    * **Global freeze** (largest applicable row, in steps):

      | Trigger | Steps |
      |---|---|
      | crit | 3 |
      | kill | 3 |
      | r ≥ 0.25 | 4 |
      | r ≥ 0.5, or an ultimate | 6 |
      | boss BREAK | 8 |

      A budget of 12 steps per rolling 0.5 s applies. Any request over budget becomes target-only.
  * **AoE:** one global freeze per cast, taken from the highest r. Damage-over-time ticks never hitlag.
  * **Loop fix:** count freeze in unscaled steps, before slowmo is applied. This fixes the boss-death freeze stretching to 0.7 s.
  * **Setting:** Off / Light / Full. The companion signals below stay on even when it is Off.
  * **Companion signals** (all scale with r):
    * damage-number size
    * enemy flash
    * knockback × (0.7 + 0.6r)
    * hit particles 5 + 8r
    * the hit sound pitches lower on heavier hits
* **"Ragdoll" means a death fling, not physics.**
  * Corpse records are pooled: 8 on phone, 12 on desktop.
  * The body arcs away from the hit, bounces once, squashes and dissolves into motes. Speed and height scale with r.
  * Pixel sprites are never rotated.
  * Loot, XP and triggers stay immediate.
  * **Exceptions:**
    * Damage-over-time kills slump in place.
    * Swarm members squash-pop.
    * Bosses hold a death pose and dissolve in stages. They never fling.
* **Tumble:** a non-boss hit with r ≥ 0.3 adds knockback ×1.5, a 0.3 s stun and a visual hop. The hop is a draw offset only;
  it never writes `e.z`.
* **Cut:** verlet bodies, gibs, sprite rotation, boss fling, camera zoom punch, slowmo on ordinary kills, additive hitstop.

## 28. The opening: the hero starts bare (story & pacing expert 2026-10-20; director-approved; supersedes §16.2 timings and §17.1 "starting kit")
Full feedback: `docs/meetings/2026-10-20-opening.md`.
* **Start:** the hero wakes in the Dreamer's bed in a nightshirt, empty-handed. Pip is a small warm light. The HUD fades in
  one piece per new noun.
* **When each slot fills:**

  | Time | What fills |
  |---|---|
  | 0:45 | the weapon, a sword standing in the grass |
  | ~2:00 | the first chest: Common Iron Mail + the Origin ring + a Chipped gem; the bag opens on the mail |
  | 2:20 | a fishing gem goes into the mail's socket |
  | 3:50 | the Iron Cap, lying on a child's bed in the cottage (a silent twist seed) |
  | 4:50 | the boots, dropped by the slime ambush |
  | ~7:00 | the first Uncommon, from Pinewood room 1 |
  | ~9:00 | the elite's Rare weapon, dropped with the key |
  | 10:00 | the Hollow door shows "Recommended ilvl", which introduces the §26.2 loop |

* **The Origin ring is found, never pre-equipped.** The ledge chest's `loot:'ring'` is removed.
* **The twist is seeded by placement and silence.** The only new line is Pip's "Three days. You've been asleep three days."
  Every STORY.md line stays.
* **Pip gets a body now:** a light parented to the hero that drifts toward each objective. The full companion stays M7.

## 29. World art pass: ground, cliffs, island edges, trees, density, tall set pieces (expert level designer 2026-10-20; director-approved)
The full report is `docs/meetings/2026-10-20-world-art.md`, with renders in `docs/meetings/world-art/`. Client complaints: the
look of the tile maps, ugly trees, no volume or density, floaty borders. Client wants tall set pieces and vantage points.

### 29.1 Diagnosis
* **Ground speckle:** per-pixel hash jitter and "flecks" make the ground read as confetti (`maps.js:surfaceColor`).
* **Hard joins:** there are no transition tiles between ground types.
* **Lollipop trees:** the Vale trees are frozen PNG sheets (`sprites.js`, applied over `art.js` by `applySprites`). Each is one
  ellipse with an outline.
* **Cardboard cliffs:** cliffs have 1 strata row and no occlusion (shadowing at the base), overhang or cast shadow.
* **Flat maps:** 83 % of the Vale is flat.
* **Bald paths:** trees are spaced at 5 per 10×10 tiles, and paths are bald.
* **North/west coasts have no thickness:** this is the biggest floaty cue. The underside curtain is uniform and ends in a line.

### 29.2 Fix groups, each its own PR, in this order
1. **Ground grammar, cliff faces v2, island edge v2, palette pass:** ~5 agent-days.
   * Ground and cliffs:
     * Remove the speckle.
     * 4 variants per tile.
     * 47-blob transitions.
     * Lip highlights.
     * 3-band strata with occlusion at the base, an overhang lip and baked wedge shadows.
     * Height fog.
   * Coasts:
     * A raised north/west coast band.
     * A 3-band skirt: lobes, then roots, then an alpha fade.
     * The island's shadow on a 2-layer cloud sea.
     * Hue-shifted 7-step ramps.
2. **Trees v2, a canopy layer over the hero with fade, density ×2.5, 16 ground-decal kinds per zone:** ~5 agent-days.
3. **Tall set pieces:** ~6 agent-days.
   * New generator pieces: `stack`, `switchback`, root ladder and drop-down ledge.
   * The Vale's *Dreamer's Cairn* (h 14) and Pinewood's *Hawk's Rest* (h 16).
   * A vantage reveal cinematic: fog fill plus a full-map blit.
   * Occlusion fixes: hero silhouette, cutaway, camera height bias, culling pads, sort key.
* **Later zones** get one signature tall piece and one vantage each:

  | Zone | Tall piece | Height |
  |---|---|---|
  | Ruins | Broken Stair | h 20 |
  | Grotto | Tide Well, inverted | — |
  | Caldera | Rim Walk | h 24 |
  | Spire | 6 ledges | to h 30 |

### 29.3 Process
* Each zone gets a mood board (`docs/art/<zone>.md`).
* Each section names one signature moment.
* Landmark briefs, variation budgets and anti-samey generator rules are audited by `build.js`.
* Art stays procedural in code. Approved output is frozen to sprite sheets. Props of 24 px or less are hand-written ASCII.
* **Hero zone:** the Misty Pinewood outer section is polished to the bar first, then the rules port to the Vale.

### 29.4 Acceptance bar
Measured on 6 fixed camera shots in each PR:
* Silhouette test at 120×68.
* At least 5 value bands.
* Fewer than 50 specks per frame.
* Density per frame: at least 10 trees and 20 clutter items.
* No edge without thickness, and at least 3 strata per cliff.
* At least 3 height levels in 4 of the 6 shots.
* Trees show three leaf masses and a rim light.
* Perf gate: phone p95 ≤ 25 ms after the pass, and ≤ 20 ms before M4 ships.

## 30. Legendary: the spirit clone, "Echo" (client request, inspired by Dragon's Dogma "Wild Fury"; director-approved)
* **Fantasy:** a colourful, translucent spirit of the hero appears just after you attack and repeats your attacks in
  succession while you keep fighting.
* **Mechanics**
  * Every basic attack and Q/E cast is recorded as `{skillId, aimRel}`.
  * **Position:** the clone stands where the hero was 0.4 s ago, read from a 24-frame ring buffer. It is an after-image,
    not a pet, so it follows you through a dodge.
  * **Timing:** it replays each recorded attack 0.4 s later through the existing cast functions, with `src:'echo'`. That
    adds no new casts.
  * **Queue:** at most 4 attacks; the oldest is dropped.
  * **Lifetime:** it fades after 2 s without an attack and re-forms on the next one.
  * **Damage:** the original hit's final damage × **k = 0.4** (a start value; balsim decides). It is **retyped to magic**:
    the element with your highest amplification (`argmax` of the element % bonuses), arcane by default, never
    slash/physical. Reactions apply, so a fire build's echo Burns.
* **Exclusions** (these are the balance):
  * **Never R.** This also stops it stacking with Pip's Lantern.
  * No MP on hit, and ult charge at 50 %.
  * **No on-hit procs:** an EFFECTS chain guard means echo hits can't trigger boons, affix triggers or the echo itself.
  * Not a summon: untargetable, no aggro, and it doesn't count toward the §24 summon cap.
  * **Hit feel:** target-only hitlag of at most 2 steps, never a global freeze. Half particles.
* **Balance gate (balsim):** on reference gear at its drop level, an element-focused build gains +25–30 % DPS and an
  unfocused build at most +15 %. Bramblehorn-class fights must stay inside their length band. If they don't, lower k first.
* **Visual:** the cached layered hero, tinted, at alpha ~0.5 with additive blending and the mythic aura's hue cycle. It is
  made of cached blits only.
* **Engine:** one new EFFECTS hook, `when:'cast'`, in `useSkill`. It is built right after the §27 hit-feel lane, because it
  shares that pipeline.
* **Name and placement:** the rule id is `echo`. The story expert names it at placement (no reused character names). It
  drops late (Act III+) as a reward for a built character.
* **Unique budget:** a **19th unique (client decision)**, on a weapon legendary that works with every weapon class. It is the one deliberate exception to the §19.5 cap of 18; the cap stays at 19 from here on.

## 31. Lumina study: adoption decisions (client + expert game director, 2026-10-20)
Source: gitlab.com/stubborn-hug/lumina. Minutes: docs/meetings/2026-10-20-lumina.md. Client decision: the author confirmed
it is open source; we may copy code/data, crediting every lift in docs/CREDITS.md. Take techniques, never identity
(no gold/navy UI, no compositions, no Cinderheart-as-a-whole).
* **Tilt-shift: none.** Keep the crisp look; no band blur, no bokeh-disc pass.
* **Combat VFX:** pixel FX atlas (grey-level frames tinted per element, dithered fade, data-driven effect table).
  Prototype 3 effects first (slash, fire burst, frost hit); the client approves them before the full swap in M5.
* **Lock-on: never.** Free aim only; the melee magnet (M4) covers target assist.
* **Time of day / weather: named moods only.** A fixed mood per section or vantage, taken from Lumina's keyframe table and
  recoloured to our ramps; mist/overcast as a mood in M5. No running clock, no rain or snow.
* **Stamina at 0:** "winded" (the action fires; recovery ×1.35). Never refused.
* **Kharzul:** takes at most two of Cinderheart's eight mechanics, never the brazier charge; the rest are spread across
  the other bosses as §26.1 cunning-form data.
* **M3 rides existing lanes:**
  * Perf lane: emitter-only bloom, governor hysteresis, light-cap hysteresis, fog clear zone (desktop tier).
  * §29 G2: leaf-cluster crowns, the ground-detail scatter grammar and travelling gusts.
  * §27: victim jitter of ±1 px.
* **M4 (about 18 days):**
  * input buffer and cancel windows
  * melee magnet
  * poise and rear crits
  * attack tokens (melee 3 / ranged 2)
  * a global telegraph grammar
  * pickups v2
  * a trigger condition grammar (StoryCondition)
  * quest stages with live counters
  * perfect dodge
  * the Cinderheart knobs as boss data

## 32. Element particle language and status visuals (expert VFX director, 2026-10-20; director-approved)
Full minutes: `docs/meetings/2026-10-20-element-vfx.md`, which is the build spec. This section is the summary; §33 rules the
status *mechanics*.

* **Client request:** every element shows its own particles everywhere it appears, HUD and menus included.
* **One registry, `ELFX` (new `js/elfx.js`):** per element it holds a 4-colour ramp, a motif in pixels, a motion model,
  rates, light, and HUD colour. The five divergent colour tables are derived from it, and so is the §31 pixel-FX atlas.
* **Motifs:**

  | Element | Motif |
  |---|---|
  | fire | rising, flickering ember diamonds |
  | frost | falling 5 px snowflakes |
  | lightning | jittering 2-frame zigzag strobe |
  | nature | tumbling leaves |
  | arcane | rising bars, plus runes orbiting the target |
  | holy | slow motes that blink into a cross |
  | slash | streaks |
  | pierce | darts |
  | shatter | bouncing shards |
  | wind | per the A9 template, see §33 |

  Lightning and holy are told apart by shape, motion and lifetime.
* **Rendering:** grey-level sheets are baked once and tinted per element through one tint cache, shared with the atlas.
  Motion is closed-form, so frame-skip stays safe. World particles join `G.parts`, inside the existing caps. A separate
  screen-space `UIP` pool serves HUD and menus (48 / 24 / 12 slots).
* **Where particles never go:** damage numbers, HP bars, tooltip text, touch controls, the minimap, the bag at rest.
* **Budget:** zero net cost on phone (moves per-draw spawns into update), parts phase ≤ 0.6 ms on phone. Particles never
  enter bloom.
* **Settings:** a new `particles` setting (Full / Reduced / Off), defaulting to Reduced under prefers-reduced-motion.
* **Status visuals:** each status gets a tint key, a cached overlay (char, ice, vine, rent), a pose (Frozen holds,
  Shocked jitters), a decal, and an 8×8 over-head glyph with a stack digit.
* **The §31 prototype board** becomes:
  * 3 atlas effects (slash, fire burst, frost hit);
  * the slash, fire and frost particle sets;
  * the lightning/holy 16 px chip pair;
  * the perf pair.
* **Estimates:** P0–P7 ≈ 7.5 agent-days and S1–S5 ≈ 7 agent-days (see the minutes). Each added element costs about
  +0.5 agent-days.

## 33. Elements: roles, statuses, reactions and world verbs (elements meeting 2026-10-20; director-approved; client decided C1 (Wind yes), C3 (Opal yes), C6 (world keys on the main path), C8 (new M4b); the rest default to the recommendation)
Full minutes: `docs/meetings/2026-10-20-elements.md`. Supersedes §5b's status table and §15.4's "seven, no more"; amends
§20.2 (system 3 = "elements, reactions and world verbs"), §23.2 (Bow E, Halberd Q, Fans Q, Orb R lines) and the VFX
minutes' B2/B3 draft. The visual and data contract (VFX A2, A9, B4, B5) stands unchanged.

### 33.1 Roster
* **Hero damage elements (9):** slash, pierce (physical, kept split), fire, frost, lightning, nature, arcane, holy, **wind**
  (story name *Breath*). `DMG_ELS` and `RES_ELS` both list wind (`RES_SHORT.wind = 'Wi'`).
* **shatter** stays in `DMG_ELS` as the Shatter reaction's damage type only (no ladder, resist, gem or skill).
* **gloom** is enemy-only (Dread / Gloomed on the hero). **Wet** is a surface flag on bodies (no damage, resist or gem).
* Rejected or merged: earth → Rent + cracks + glyphs; water → Wet; light/dark → holy/gloom; poison → nature; blood → slash;
  void → gloom/arcane; time/gravity → tags; sound → cut.

### 33.2 Build-up and ladders (one mechanism; `js/status.js`, VFX B5 shape)
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

### 33.3 Reactions: eight named, all readable (ceiling 8)
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

### 33.4 Wiring
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

### 33.5 World verbs (elements on objects: the same registry, receivers, build)
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

### 33.6 Visuals (per the VFX minutes; nothing new per frame)
Wind = the A9 curl row (teal, `dash`, no light); Buffeted = tint + 1 px sideways offset; Lifted = the §27 hop offset ×1.5 +
3 curls. Drift = the carried element's motif in a ring. Wet = tint + a 1 px highlight, droplets on apply, a baked 2 px rim
on wet tiles. Ice tiles and walls use the frost ramp with ≤ 1 glint light per 4 tiles. Holy base colour is pale white-gold
(D1 B). Phone p95 ≤ 20.0 ms with 6 status bodies and one burning grass ring in view (A7 gate).

### 33.7 Schedule and scope (≈ 36 agent-days of new work; client-authorised)
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
* **Client approval (2026-10-20):** the FX board in tools/shots/m3-fxboard (3 atlas effects, 11 particle sets, statuses,
  HUD mock) is **APPROVED** as the look. The full rollout (P2–P6, S1–S5) is scheduled in M4a/M5, gated on no net phone cost.

## 34. Legendary: "The Stopped Hour" and its skill, Hush (client request 2026-10-22; director-designed)
* **Fantasy:** the world slows to a quarter of its speed while the hero moves at full speed. Enemies, projectiles,
  wind, knockback and particles all crawl. It burns MP fast.
* **Placement (Loadout v3):** a Legendary weapon unique, rule `stillhour`. Like Twice-Told (§30), it rolls on the finder's
  own weapon variant. The rule **replaces the item's spell with Hush**: Q in the HAND slot, E in the OFFHAND slot. Action
  and ultimate are unchanged. Drops once, on a boss-class kill at L13+ (Act II on). It never drops on the same kill as
  Twice-Told. It is the **20th unique** (the §30 cap of 19 rises to 20; client request).
* **Activation:** a toggle. Start cost 30 MP; drain **60 MP per real second** (base pool 260 ≈ 3.8 s real ≈ 15 s of world
  time). It ends on a second press, at 0 MP, on hero death, on a boss-death slow-mo, or on a map change. Cooldown 3 s
  after it ends. While it is active: hits build **no MP**, ult charge builds at ×0.5, MP regen stops.
* **Time model:** one world scale, `G.timeScale` (1 normally, **0.25** in Hush), applied in the fixed step as
  `sdt = dt × worldScale(entity)`. It replaces `enemyTimeScale()`.

  | World time (×0.25) | Real time (×1) |
  |---|---|
  | enemies (movement, attacks, AI timers, boss telegraphs, spawns) | hero movement, attacks, dodges, cooldowns |
  | all projectiles, including the hero's once they leave the hand | input, HUD, menus, camera |
  | knockback and displacement on enemies | knockback on the hero |
  | the wind field (`WIND.sample` time), particles and ELFX, world animations | hitlag (§27; it is real-time already) |
  | status durations and DoT ticks, reactions | the Hush drain itself |
* **Resistance:** elites at ×0.375, bosses at **×0.5**. Boss phase transitions and invulnerable windows ignore Hush.
* **Merges:** with Dreamveil (enemies at 0.35), the slower one wins (min, never multiplied). A boss-death slow-mo ends
  Hush first.
* **Balance:** hero damage ×0.6 while Hush is active (the hero acts 4× faster than the world). The Echo spirit (§30) runs
  on world time, so its replays crawl too. Balsim gate: a Hush rotation gains at most +20 % boss-fight DPS on reference
  gear; Bramblehorn-class fights stay inside their length band.
* **Feel:** 0.15 s ease in and out of the scale. The world desaturates (−40 %) with a cool tint; the hero keeps full
  colour plus a short after-image. World SFX play at half rate, music gets an 800 Hz low-pass, and a soft heartbeat
  plays at 1 Hz. The MP bar shimmers while it drains. On phone: tint only, no desaturate pass (≈ 0 ms cost).
* **Engineering:** one `worldScale(e)` replaces `enemyTimeScale()`. Audit every timer that reads real time
  (`performance.now`, setTimeout, `G.t` users) for world-vs-real. Saves never store Hush as active. Pause freezes both
  clocks.
* **Tests (play.js):**
  * over 1 s real: an enemy moves 0.25×, an elite 0.375×, a boss 0.5×; the hero's speed is unchanged;
  * MP: −30 at start, then −60/s; Hush ends at 0 MP; the cooldown is 3 s;
  * a hero projectile slows to 0.25× once it leaves the hand;
  * Dreamveil + Hush = 0.25, not 0.0875;
  * the wind phase and a DoT tick both advance at 0.25×;
  * a boss-death slow-mo ends Hush.
* **Build:** M4a, in the Loadout lane (after the hot-fix frees game.js). Glossary rows added with this section.
