# World brief: placement brief per zone

Terms: [../GLOSSARY.md](../GLOSSARY.md). The client builds every zone in Godot; the studio ships the data, systems and sprites.
This is the **placement brief**: what each zone must contain and how it should pace. No coordinates, no tiles.
Enemy grammar: [enemies-bosses.md](enemies-bosses.md). World verbs: [elements-statuses.md](elements-statuses.md).
Beats and lines: [story.md](story.md). Tile and prop assets: [asset-pipeline.md](asset-pipeline.md). Import contract: [../PORTING.md](../PORTING.md).
Mockup arenas that test the same rules: [arenas.md](arenas.md).

## Source of truth: `zones.json`
The content of this brief lives in editable data, `handoff/data/zones.json` (planned, M9): one object per zone with `name`, `sections`, `hooks`,
`pacing` numbers, `encounter` slots, `secrets`, `setPieces` and `signature` moment. This file describes the brief and points to the data; change zone
names, hooks or pacing in `zones.json` and the client's build follows. Until it exists, this file is the only copy.

## How to use
* Each zone is a checklist: sections, enemies, elite pockets, boss, shrines, chests, three verb puzzles, five secrets, set pieces,
  signature moment. Sizes are suggested footprints; the pacing numbers below are the targets.
* Zones are joined by warp doors (0.4 s fade, no load, trigger state kept). Underground is a palette and lighting look, not a different engine.
* Dialogue, quests and boss scripts are tables the studio ships; where they fire is the client's call. Trigger vocabulary: [../PORTING.md](../PORTING.md).

## Pacing per zone
* A point of interest every 12 to 15 tiles, a landmark about every 30. 15 to 25 s between fights; 8 to 9 fights per zone.
* 3 shrines with shrine-to-shrine warp (only when no enemy is awake). 2 shortcut loops. Return rifts at shrines.
* 5 secrets per zone (one per section plus one crossing). 3 verb puzzles per zone.
* Main path about 130 min over the game, 100% about 4.5 h. A zone over 24 min loses a room, not a corridor. Dungeons stay at 2 rooms.
* Layout: a winding main path with 3 to 5 height levels; landmarks visible from afar; 150 to 200 objects on a 56-tile map.
* Object kinds: chests (wood, silver, gold), shrines, lore tablets, levers, gates, key doors, hidden walls, receivers, fishing spots.
* Boss deaths respawn at the nearest shrine. The boss door shows "Recommended ilvl N, yours M" (information, never a lock).
* Elite pockets: 2 to 3 per zone near the boss, each guarantees a Rare of at least boss ilvl minus 2 on first clear.
* Sleep and wake: enemies sleep beyond 18 tiles (1 Hz heartbeat); at most 24 awake (16 on phone) at once.

## Encounter grammar slots
* Outer zone: room 1 teaches the zone's new enemy; room 2 mixes it with an archetype that resists the likely weapon;
  room 3 adds a caster or summoner; the elite guards the dungeon key.
* Dungeon: room 1 shows the elite modifier's element in numbers; room 2 is a lever or gate fight;
  the mini-boss is 3 `BOSS_MOVES` plus the zone's resist identity (60 to 90 s).
* Pack rules (anchor, pressure, support, ranged; one wrong-weapon pack per zone) live in [enemies-bosses.md](enemies-bosses.md).

## Secrets
* Signposted, environmental or logic. Rewards escalate: gem, Socket Rune, gold chest with a guaranteed Rare or better. Never a Legendary.
* Each is a trigger area plus `openGate` or `loot`.

## Opening timeline (Vale, the first 10 minutes)
The hero starts bare in a nightshirt. The Origin ring is found, never pre-equipped. The only new line: Pip's "Three days. You've been asleep three days."
Pip is a light parented to the hero that drifts toward each objective.
* 0:45 the sword. About 2:00 the first chest: Common Iron Mail, the Origin ring, a Chipped gem. 2:20 a fished gem into the mail's socket.
* 3:50 Iron Cap on a child's bed. 4:50 boots from the slime ambush.
* About 7:00 the first Uncommon. About 9:00 the elite's Rare weapon and key. 10:00 the Hollow door shows "Recommended ilvl".
* Vale: dummies and the Elder Stone within 15 tiles of the start, the first chest at 10 tiles, 2 shrines. The hub grows visible rifts as Shards relight.

## Whispering Vale (hub, about 80x80)
* Sections: hub; Moon Pond (night fishing, pearl ritual, opens after Act IV); Pip's Lanterns islet (opened by the Spire key; three lanterns,
  three memories, powers the true ending); Dream Arena islet (balance test bed, 5 tiers).
* Enemies: Dream Moth. No boss. Side quest: the Stone's lost lantern. Set piece: Dreamer's Cairn (h14, levels 4, 9, 14); Stone's Crown summit.
* Signature moment: climbing the Cairn at dawn to see the sea of clouds; the first rift opens ("The Pinewood screams.").

## Misty Pinewood (Act I, about 112x112)
* Sections: forest (creek, 3 shrines, 2 shortcut loops, an elite, a tablet); Root Hollow (underground SW: key door, lever, boars, sleeper, Mossjaw);
  Fox Warrens (vault, noise and sneak); Bramblehorn's Clearing (inline arena NE, four root pillars).
* Enemies: Gloom Slime, Shade Hound, Bramble Shaman, Ogre, Thornback Boar, Mountain Troll. Boss: Old Bramblehorn; mini: Mossjaw.
* Side quest: a fox kit's mother (ogres). Set piece: Hawk's Rest (h16).
* Signature moment: from Hawk's Rest the trees are visibly running; the fleeing fox sets the tone.

## Gloomspire Ruins (Act II, about 112x112)
* Sections: plaza; Warden Crypt (darkness: light sources only); Warden's Hall (arena); Oath Reliquary (vault, mimics, the Oathless).
* Enemies: Wisp, Gloom Knight, Grave Chanter, Pillar Mimic, Shadeling Swarm, Void Archer. Boss: The Gloam Warden; mini: the Oathless.
* Side quest: the names on the pillars (one reads AERIN). Set piece: Broken Stair (h20).
* Signature moment: reading the pillar names; the one that matches the hero's.

## Sunken Grotto (Act III, about 112x112)
* Sections: caves (tide tiles on a timer); Drowned Vault (airlock gates, Brinemother); Mirelle's Basin (flooded ring arena);
  Glowfin Shallows (vault); Starlit Shoals (north coast, no combat, the Moonmaw, optional).
* Enemies: Frost Jelly, Tide Crab, Glowfin Shoal, Deepsinger, Lightning Eel, Crystal Sentinel. Boss: Lady Mirelle; mini: Brinemother.
* Side quest: relight the fishermen's lanterns. Set piece: the inverted Tide Well.
* Signature moment: the tide goes out and a drowned lantern line lights the way down.

## Emberfall Caldera (Act IV, about 112x112)
* Sections: rim (lava platforms); Forge Deep (wind vents); The Anvil (forge platform arena); Slag Chambers (vault, Slagheart).
* Enemies: Cinder Imp, Slag Golem, Ash Wraith, Forge Priest, Magma Hopper. Boss: Kharzul the Cinder Colossus; mini: Slagheart.
* Side quest: Kharzul's apprentice golem. Set piece: Rim Walk (h24).
* Signature moment: Pip admits the twist at the top of the rim ("I was going to tell you at the top.").

## The Sleepless Spire (finale ascent, about 96x128)
* Sections: ascent (5 ledges, a fall returns you to the last ledge; the Twin Vigils); Sleepless Court (void-tile rhythm);
  Vigil Walk (optional vault).
* Enemies: Vigil Knight (linked pair), Star Archer, Dread Herald, Unmade, Void Bomber. Mini: Twin Vigils.
* Side quest: Pip's three lanterns. Set piece: 6 ledges to h30.
* Signature moment: the last ledge, where Pip chooses ("Whatever happens up there, I chose this.").

## Morrow's Throne (about 28x28)
* One arena map for Morrow, the Unwaking King: P1 sword-knight, P2 dream-warp (void tiles vanish), P3 giant form with starfall.
  Pip's light is the safe zone in phase 3; Dawn Burst ends it. Signature moment: the Dawn Burst. Shrine 20 s away.

## Optional: The Drifting Isles (about 96x96)
* Sections: isles (rift-hop, the Wardens' graves, Sorrel's Echo); The Gloaming Below (post-game underground, the Unwaking Child).
* Signature moment: the fifth Warden's grave, and Sorrel's Vow.

## Status of this brief
Zone names, section names, hooks and pacing numbers are the client's build targets, easy to change in `zones.json`. Signature moments are studio proposals the client may change.
