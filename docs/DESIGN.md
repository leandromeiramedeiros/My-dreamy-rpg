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

*"The Dream is unravelling."* A short, complete action-RPG on floating islands. 60–80 minutes from title to credits.
Albion-style "you are what you wear" skills, Diablo-style loot with rarity, sockets and gems, and a hero whose
gear visibly changes him — the better the gear, the more it glows.

## 2. Story (brief but competent)

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

Story delivery: short dialogue boxes (portrait + name + 1–3 lines, click/tap/space to advance), banners on zone entry,
a lore tablet or two per zone. No cutscene engine needed beyond a `dialogue` trigger action and camera pan.
Each zone ends with the guardian's last words revealing one piece of Morrow's story.

## 3. Progression

* **Level 1 → 30.** XP from kills, chests, quests. Curve: `xpToNext(L) = round(60 * L^1.55)`.
  Target levels: Vale 1–2, Pinewood 2–8, Ruins 8–14, Grotto 14–20, Caldera 20–26, Spire 26–30.
* Per level: +4% base HP, +3% base damage, +1 **Talent point**.
* Death: respawn at the zone's last checkpoint (rift shrine) with full HP, lose nothing but 10% of the
  current level's XP progress. Boss fights restart cleanly.
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

Drop weights by enemy class (normal / elite / boss) scale with zone; bosses guarantee ≥ rare and first-kill legendary.
Required level gates equip; the inventory shows red requirement text and refuses.

### 4.3 Sockets and gems
* Items roll 0–3 sockets within their rarity cap. A rare **Socket Rune** adds one (max 3).
* Gems: 6 types × 5 grades (Chipped, Flawed, Clear, Brilliant, Radiant). 3 of a grade combine into the next at the
  Elder Stone. Gems can be removed for free (they return to the bag).

| Gem | Stat in armour | In weapon | Skill amplification (any slot) |
|---|---|---|---|
| Ruby | +HP | +damage % | Fire skills +% dmg, fireball/meteor gain burn |
| Sapphire | +MP & MP regen | +cooldown reduction | Frost skills slow longer, frost nova radius + |
| Emerald | +HP regen | +attack speed | Heals and Mend stronger; poison on hit |
| Topaz | +crit chance | +crit damage | Lightning skills chain +1 target per 2 grades |
| Amethyst | +power % | +skill damage | Arcane/void skills +area radius |
| Diamond | +defence % | +all stats small | Ultimate (R) cooldown −% |

Each skill in `SKILLS` gets an `element` tag (fire/frost/nature/lightning/arcane/physical/holy) so gems can amplify it.

### 4.4 Inventory
* Bag: 30 slots (grid 6×5), stackable gems/potions. Equipped panel shows the paper-doll hero rendered live with gear.
* Tooltips: rarity-coloured name, ilvl/req, base stats, affixes, sockets, skill list, compare vs. equipped (green/red deltas).
* Actions: equip, unequip, socket gem (drag or click-select), salvage into **Dream Dust** (used to reroll affixes / buy
  Socket Runes at the Elder Stone). Potions: health potions on a hotkey (4), 3 charges, refilled at checkpoints.

## 5. Skills
* Weapon gives LMB + Q/E/R; chest F, helmet C, boots Shift (existing system kept).
* Character skills 1/2/3 unlock by level: 2 at L1, more at L5, L10, L15, L20 (8 total: existing 6 + 2 new).
* **Talents:** 1 point per level into a small tree of 3 branches (Might / Arcana / Grace), 5 ranks per node.
  Kept simple: ~12 nodes total, each +% stat or a skill modifier.
* Weapon skill options (two choices per slot) unlock with weapon tier: second option at weapon reqLvl ≥ 10.

## 6. Hero visuals ("you see what you wear")
* Base hero redrawn at higher detail (≈24×32 px instead of 16×24): face, hair, cape, hands, shading, 4-dir-ish (front/back,
  mirrored sides), walk (4 frames), idle breathe, attack pose.
* **Layered paper-doll**: body → boots → chest → cape → helmet → weapon. Each base item has its own overlay sprite
  (not just palette swap), and tiers within a family visibly upgrade (more trim, pauldrons, crests, gem insets).
* Rarity FX on each equipped piece, driven by a single `rarityFx(tier)` table: rim glow colour, glow alpha, pulse speed,
  particle rate, particle kind (sparkle / mote / ember / star), light radius added to the lightmap. Mythic gets an aura.
* Socketed gems are visible as coloured pixels on the item.
* Same renderer draws the paper-doll in the inventory screen at 3× scale.

## 7. Enemies and bosses
* Each zone: 4–6 enemy types (reuse behaviours hopper/shooter/charger/brute + new: `caster` (AoE telegraphs),
  `summoner`, `elite` modifier (bigger, coloured aura, +HP, drops better)).
* Bosses: 2–3 phases each, telegraphed attacks only (fairness), enrage banners, health bar with name.
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

## 9. Studio roles and file ownership
| Who | Strengths used for | Default files |
|---|---|---|
| **Director** (me) | design, briefs, review, merge/ship | `docs/DESIGN.md` |
| **Opus** | core systems, rendering, AI, tricky refactors | `game.js`, `render.js`, `data.js` core, `items.js` |
| **Sonnet** | content: maps, triggers, story/dialogue, enemies, UI screens, sprites | `world.js`, `hud.js`, `maps.js`, `art.js` |
| **Haiku** | smoke tests, data tables, balance sheets, docs, screenshots | `tools/`, `README.md`, tables |

## 10. Milestone plan (each one ships live)
* **M1 Foundation + Inventory & Loot** — item instances, rarity, level/XP, sockets & gems, loot drops, inventory UI,
  save/load, death/respawn, smoke test harness.
* **M2 The Hero** — detailed layered hero, gear overlays per tier, rarity glow & particles, paper-doll in inventory.
* **M3 Story & Act I–II** — dialogue system, intro, Pip, Elder Stone hub, Pinewood boss Bramblehorn, Ruins re-paced.
* **M4 Act III–IV** — Sunken Grotto + Emberfall Caldera, new enemies and two bosses, gem amplification complete, talents.
* **M5 Finale** — Sleepless Spire, Morrow, ending, credits, NG+.
* **M6 Polish & balance** — pacing to ≥60 min, audio, README, screenshots.

Ship gate per milestone: smoke test green → director review → PR → merge to `claude/dreamy-rpg-concept` (= live on Pages).
