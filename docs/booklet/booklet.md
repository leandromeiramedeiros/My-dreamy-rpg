# Karea's Dream: the Booklet

A pocket companion for building the game in Godot. Every name is canonical; click one to open its glossary entry. **§N Term** points into
`docs/GLOSSARY.md` (section N, the Term column). **§—** means the term is not in the glossary yet (see Open questions).
Lines marked *Idea* are studio proposals, not canon.

Sources: `docs/design/story.md`, `world-brief.md`, `names.md`, `items.md`, `loadout.md`, `weapons-and-skills.md`,
`armour-suits.md`, `elements-statuses.md`, `enemies-bosses.md`, `progression-economy-saves.md`; names checked in `js/`.

---

## 1. Story

**Premise.** Morrow (§14 Morrow) was the first Dreamwarden. When his daughter Karea died in the waking world he refused to
wake and dreamed her back. The Gloam (§12 Gloam) is the cost: his dream drowns the other Wardens' (§12 Wardens) islands.
The four Wardens tried to wake him; he made them guardians of his sleep. Pip (§12 Pip) is the last light of the real
Karea's lantern. The hero, Karea (§12 Karea, formerly Aerin), is three days old: she is Morrow's dream of his daughter.
**Twist (end of Act IV):** relighting the Dawn Shards (§15) does not wake Morrow; it wakes *you*.

**Run shape.** Prologue (Vale) → Act I Pinewood → Act II Ruins → Act III Grotto → Act IV Caldera → Finale (Spire,
Morrow's Throne) → default ending; optional Drifting Isles, The Gloaming Below, Pip's Lanterns → true ending; NG+.
Level bands: Vale 1–3, Pinewood 3–10, Ruins 10–17, Grotto 17–24, Caldera 24–31, Spire 31–38; Morrow at 34–40.

### Storyboard (34 panels)

**Prologue: Whispering Vale**
1. `s01-wake.jpg` Karea wakes on the Dreamer's bed in a nightshirt. Pip: "Up. You were sleeping like you meant it." / "Three days. You've been asleep three days."
2. `s02-sword.jpg` 0:45 the sword; 2:00 the first chest (Iron Mail, the Origin ring, a Chipped gem). Pip: "That glow? Keep it. Gear remembers you."
3. `s03-stone.jpg` The Elder Stone: "The Stone knows her. The Stone does not say." Side quest: the Stone's lost lantern.
4. `s04-cairn.jpg` Dawn on the Dreamer's Cairn, the sea of clouds; the first Rift opens. Pip: "The Pinewood screams. Let's be rude back."

**Act I: Misty Pinewood**
5. `s05-running.jpg` From Hawk's Rest the trees are running. Pip: "Everything with legs is leaving."
6. `s06-foxkit.jpg` Side quest: a fox kit's mother, taken by Ogres.
7. `s07-mossjaw.jpg` Root Hollow. Pip: "Under the wood, it's quieter. I hate it." Mini-boss Mossjaw bursts from the roots.
8. `s08-bramblehorn.jpg` Bramblehorn's Clearing, four root pillars. Old Bramblehorn: "Little dream. You smell like him." Teaches dodging.
9. `s09-roots.jpg` "Tell him... the roots held. Tell him I stayed." Drops Root-Crown; the first Dawn Shard relights.

**Act II: Gloomspire Ruins**
10. `s10-pillars.jpg` "Where the Wardens swore." Pip: "Don't read the names on the pillars." One of them is KAREA.
11. `s11-crypt.jpg` Warden Crypt: darkness, light sources only. Pip is the lamp.
12. `s12-oathless.jpg` Oath Reliquary: the Oathless raises its shield-wall; hit its back.
13. `s13-gloamwarden.jpg` Warden's Hall. The Gloam Warden: "I guarded his sleep. I do not guard it well." At 20% the hall goes dark; only the lantern's light is safe. Death: "He dreamed a girl. Did you meet her?" (Warden's Lantern Plate).

**Act III: Sunken Grotto**
14. `s14-tide.jpg` The tide goes out; a line of drowned lanterns lights the way down. Pip: "Still lit. Fishermen's. Someone keeps them."
15. `s15-brinemother.jpg` Drowned Vault: Brinemother pulls the tide and calls her jellies.
16. `s16-mirelle.jpg` Lady Mirelle: "You again. You always come this far." Death: "Third time... this time, reach him." (Tide-Edge). Pip: "She said 'again'. Don't ask me. Later."
17. `s17-shoals.jpg` Optional, Starlit Shoals: where the real Karea drowned. No combat. The Moonmaw circles below.

**Act IV: Emberfall Caldera**
18. `s18-rim.jpg` "His anger, cooling." Rim Walk over the lava platforms.
19. `s19-kharzul.jpg` The Anvil. Kharzul the Cinder Colossus: "Walk the fire, dream-girl. See if you're real." Death: "You burn. Real things burn. Go wake your father." (Cinderstride Boots).
20. `s20-twist.jpg` The twist, at the top of the rim. Pip: "...Yes. I was going to tell you at the top."

**Finale: Sleepless Spire and Morrow's Throne**
21. `s21-ascent.jpg` Ascent tablets: "He named her Karea." / "He stopped eating." / "He said: one more night."
22. `s22-vigils.jpg` The Twin Vigils: mirrored charges and a rotating link-beam.
23. `s23-ledge.jpg` The last ledge. Pip: "Whatever happens up there, I chose this."
24. `s24-morrow1.jpg` Morrow: "You came. You always come. Sit with me a while." Phase 1, Sword-Knight.
25. `s25-morrow2.jpg` Phase 2, Dream-Warp: "I can't lose you twice." Void tiles vanish; holy reveals the real Morrow.
26. `s26-morrow3.jpg` Phase 3, The Unwaking: starfall. Pip: "Take my light. Burn him awake." Pip's light is the only safe zone.
27. `s27-dawnburst.jpg` The Dawn Burst (§15). Morrow: "...morning. It's morning, little one." Drops Morrowbane.

**Default ending**
28. `s28-default.jpg` Dawn in the Vale. Morrow lets the dream end, which means letting you end. Karea fades gently; Pip rekindles as a spark. Card: "The Dream was never for him." (30 s)

**Optional path and true ending**
29. `s29-isles.jpg` Drifting Isles: the Wardens' graves. The fifth Warden, Sorrel, woke Morrow once and was exiled. Sorrel's Echo mirrors your skills.
30. `s30-child.jpg` The Gloaming Below: Morrow's buried nightmares, corrupted guardians; the Unwaking Child is Karea's shadow.
31. `s31-lanterns.jpg` Pip's Lanterns islet: three lanterns, three memories (Pip's three-lanterns quest powers the true ending).
32. `s32-pearl.jpg` Moon Pond after Act IV: the pearl ritual; you carry the Moonmaw's pearl into the finale.
33. `s33-true.jpg` True ending (100%: every Fishing Log legendary, the Gloaming Below cleared, every lore tablet read, Pip's lantern quest done): Morrow wakes and Karea stays. The dream keeps one island.

**NG+**
34. `s34-ngplus.jpg` "Morrow dreams again." Enemies x1.6, Mythic rolls everywhere, corrupted elites; Pip's lines show it remembers the last run.

---

## 2. Zones

One page per zone. Map image first, then the placement brief. Pacing for every outer zone: a point of interest every
12–15 tiles, a landmark every ~30, 8–9 fights, 3 shrines, 2 shortcut loops, 5 secrets (one per section plus one crossing,
one of them elemental), 3 verb puzzles, 2–3 elite pockets near the boss, 3–5 height levels, 150–200 objects. Zones join by
Warp doors (0.4 s fade). The boss door shows Recommended ilvl (§18). Secrets reward gem → Socket rune → gold chest (never a Legendary).

### 2.1 Whispering Vale (§16) · Prologue, hub · ~80x80 · L1–3 · `map-vale.jpg`
* Sections: hub; Moon Pond (night fishing, pearl ritual, opens after Act IV); Pip's Lanterns islet (Spire key; three lanterns); Dream Arena islet (5 tiers).
* Landmarks: Dreamer's bed (start shrine), Elder Stone and Training dummies within 15 tiles of the start, first chest at 10 tiles, 2 shrines; Dreamer's Cairn (h14, levels 4/9/14); Stone's Crown summit.
* Enemies: Dream Moth. No boss. Verb puzzle: the torch room under the Dreamer's Cairn (the Vale has 1).
* Side quest: the Stone's lost lantern. Signature: the Cairn at dawn, the first Rift. The hub grows a visible Rift per relit Dawn Shard.
* *Idea:* put the 5 Rifts on the island rim, one per compass bearing of its zone, so the hub reads as a clock of progress.

### 2.2 Misty Pinewood (§16) · Act I · ~112x112 · L3–10 · `map-pinewood.jpg`
* Sections: forest (creek, 3 shrines, 2 shortcut loops, an elite, a tablet); Root Hollow (underground SW: key door, lever, boars, sleeper, Mossjaw); Fox Warrens (vault, noise and sneak); Bramblehorn's Clearing (inline arena NE, four root pillars).
* Enemies: Gloom Slime, Shade Hound, Bramble Shaman, Ogre, Thornback Boar, Mountain Troll; elites Gnarlroot Brute, Thornsow Matriarch. Guardian: Old Bramblehorn; mini: Mossjaw.
* Verbs: brambles on the Warrens door (fire), creek freeze (frost), grass-fire boar den (Dry grass).
* Set piece: Hawk's Rest (h16). Side quest: the fox kit's mother. Signature: the trees are running.

### 2.3 Gloomspire Ruins (§16) · Act II · ~112x112 · L10–17 · `map-ruins.jpg`
* Sections: plaza; Warden Crypt (darkness, light sources only); Warden's Hall (arena); Oath Reliquary (vault, mimics, the Oathless).
* Enemies: Wisp, Gloom Knight, Grave Chanter, Pillar Mimic, Shadeling Swarm, Void Archer. Guardian: The Gloam Warden; mini: Oathless.
* Verbs: conduits (lightning), a Reliquary holy seal, Belfry glyphs (arcane).
* Set piece: Broken Stair (h20). Side quest: the names on the pillars (reveals KAREA early). Signature: reading the name that matches yours.

### 2.4 Sunken Grotto (§16) · Act III · ~112x112 · L17–24 · `map-grotto.jpg`
* Sections: caves (tide tiles on a timer); Drowned Vault (airlock gates, Brinemother); Mirelle's Basin (flooded ring arena); Glowfin Shallows (vault); Starlit Shoals (north coast, no combat, the Moonmaw, optional).
* Enemies: Frost Jelly, Tide Crab, Glowfin Shoal, Deepsinger, Lightning Eel, Crystal Sentinel. Guardian: Lady Mirelle; mini: Brinemother.
* Verbs: tide pool, Vault Ice wall (fire), Shallows Crystal wall (frost then a physical hit).
* Set piece: the inverted Tide Well. Side quest: relight the fishermen's lanterns. Signature: the tide goes out, the drowned lanterns light the way.

### 2.5 Emberfall Caldera (§16) · Act IV · ~112x112 · L24–31 · `map-caldera.jpg`
* Sections: rim (lava platforms); Forge Deep (wind vents); The Anvil (forge platform arena); Slag Chambers (vault, Slagheart).
* Enemies: Cinder Imp, Slag Golem, Ash Wraith, Forge Priest, Magma Hopper. Guardian: Kharzul the Cinder Colossus; mini: Slagheart.
* Verbs: Windmill (wind), frozen lava path (Vent capped by frost → obsidian), four forge Braziers.
* Set piece: Rim Walk (h24). Side quest: Kharzul's apprentice golem. Signature: Pip admits the twist at the top of the rim.

### 2.6 Sleepless Spire (§16) · Finale ascent · ~96x128 · L31–38 · `map-spire.jpg`
* Sections: ascent (5 ledges; a fall returns you to the last ledge; the Twin Vigils); Sleepless Court (void-tile rhythm); Vigil Walk (optional vault).
* Enemies: Vigil Knight (linked pair), Star Archer, Dread Herald, Unmade, Void Bomber. Mini: Twin Vigils.
* Verbs: cloud bank (Fog bank, wind), Vigil Walk Seal (holy), void Raft.
* Set piece: 6 ledges to h30. Side quest: Pip's three lanterns (gives the Spire key to Pip's Lanterns). Signature: the last ledge, Pip chooses.

### 2.7 Morrow's Throne (§16) · Finale · ~28x28 · `map-throne.jpg`
* One arena for Morrow: P1 Sword-Knight, P2 Dream-Warp (void tiles vanish), P3 giant form with starfall. Pip's light is the safe zone in P3; the Dawn Burst ends it. Shrine 20 s away.

### 2.8 Drifting Isles (§16) · Optional · ~96x96 · L38+ · `map-isles.jpg`
* Sections: isles (rift-hop, the Wardens' graves, Sorrel's Echo); The Gloaming Below (post-game underground).
* Verbs: Rafts (wind) and a three-isle Conduit chain. Signature: the fifth Warden's grave, and Sorrel's Vow.

### 2.9 The Gloaming Below (§—) · Post-game, under the Isles · L40 · `map-gloaming.jpg`
* Morrow's buried nightmares: corrupted versions of all four guardians; floor boss the Unwaking Child (three stolen guardian moves per phase; Mythic chance).
* *Idea:* four themed floors (forest, ruins, grotto, caldera) dropping by Drop-down ledges to a last chamber with a small bed.

---

## 3. Systems (one paragraph each)

* **Loadout v3, Lead / Support (§4).** Nothing is learned; skills come from what Karea wears. HAND: M1 action, Q spell, Shift+Q ultimate. OFFHAND: M2, E, Shift+E. Head R, chest F, boots V (the dodge). Pockets Z/X/C. One shared ultimate bar.
* **Weapon classes (§5).** Blades, Greatarms, Shots, Foci, Shadows; 15 variants, each with one action, spell, ultimate that never change with tier.
* **Shields and companions (§6).** Buckler, Heater, Tower (offhand only); Grimoire, Quiver, Warhorn are decks of Pages, Arrows, Calls (§7).
* **Pairings and Grips (§4, §7).** An offhand must fit its HAND's fantasy. 14 Grips are named pairings found in the Codex.
* **Armour (§8).** 12 suits in 4 classes (Heavy, Caster, Medium, Shadow); three pieces give the Suit twist; Full-dream bonus with the matching weapon.
* **Elements, statuses, reactions (§3).** Nine hero elements (wind is Breath); two-tier status ladders; eight reactions; hero tier 2 is never hard CC.
* **World verbs (§17).** Receivers flip State on element hits; Pip's charge carries a World source's element 8 tiles. Never gate main progress on a specced element.
* **Items (§9).** Rarity Common → Mythic, affixes by prefix/suffix, Temper and Imbue at the Elder Stone, 30-slot Bag, tooltips ≤12 lines.
* **Gems (§10).** Six gems plus the Opal, three grades; combine 3→1 at the Elder Stone; removal is free.
* **Progression (§2 Level).** L1–40, no talent tree; Mastery ranks by kills; skill ranks by use.
* **Economy (§10 Dream Dust).** One currency; the Elder Stone is the shop. Income ~1.3x planned spend.
* **Fishing (§18 Dreamfishing).** Hold Interact to cast across 3 rings; reel against a tension bar; cook at shrines; Fishing Log.
* **Bosses (§14).** Multi-bar phases, Cunning forms, stagger bar, telegraphs ≥0.6 s, loot answers the mechanic.
* **Bestiary and Codex (§18).** Hunt milestones at 10/25/50 kills; Grips reveal on first trigger.
* **Modes and saves (§15 Difficulty mode, §19 Save version).** Normal only, then NG+; three save slots.

---

## 4. Catalogue

Where used: gear lines are not zone-bound, so the column gives the tier gate → zone (T1 L1 Vale/Pinewood · T2 L8 late
Pinewood/Ruins · T3 L16 Ruins/Grotto · T4 L24 Caldera · T5 L32 Spire · Mythic L36 Morrow, Isles, NG+).

### 4.1 Weapon lines (15) · §5.2–5.7
| Line | Class · § | Spell / Ultimate | T1 → T5 · Mythic | Where used |
|---|---|---|---|---|
| Sword | Blades · §5.2 | Sunslash / Radiant Judgement | Rusty Blade → Dawn Eternal · Morrowbane | Vale 0:45 starter; Morrowbane drops from Morrow |
| Rapier | Blades · §5.2 | Flèche / Perforate | Tin Needle → Needle Eternal · Sorrel's Needle | Duelist builds; Mythic tied to Sorrel (Isles) |
| Mace | Blades · §5.2 | Crush / Consecrate | Iron Cudgel → Vow Eternal · Lamplighter | Heater/Warhorn pairs; strong vs Ruins gloom (holy) |
| Axe | Greatarms · §5.4 | Cleave / Colossus Strike | Splitting Axe → Dawn Colossus · Forgehand | Warrior origin; Mythic named for the Caldera |
| Hammer | Greatarms · §5.4 | Earthbreaker / Aftershock | Sledge → Hammer Eternal · Chainbreaker | Stagger answer for Kharzul, Slagheart |
| Halberd | Greatarms · §5.4 | Sweep / Skewer | Pike → Reach Eternal · Vigil's Glaive | Reach; Mythic named for the Spire |
| Bow | Shots · §5.5 | Multishot / Rain of Arrows | Hunter's Bow → Moon Eternal · Moonmaw's Bow | Ranger origin; Mythic tied to Starlit Shoals |
| Crossbow | Shots · §5.5 | Piercing Bolt / Ballista | Hand Crossbow → Bolt Eternal · Four Wardens | Pierce vs Ruins (weak pierce) |
| Chakram | Shots · §5.5 | Ricochet / Guillotine | Rim → Ring Eternal · Karea's Halo | Only 1H Shot; Lodestar Grip |
| Staff | Foci · §5.6 | Firebolt / Meteor | Willow Wand → Night Eternal · Emberfall | Mystic origin; fire vs Pinewood |
| Wand | Foci · §5.6 | Frost Shards / Rune of Binding | Birch Twig → Spark Eternal · Wishbone | Frost vs Caldera |
| Orb | Foci · §5.6 | Chain Lightning / Tempest | Glass Bauble → Orb Eternal · Last Light | Lightning vs Grotto, Conduct |
| Daggers | Shadows · §5.3 | Fan of Knives / Death Mark | Shiv → Fangs Eternal · Reliquary | Thief origin; Mythic named for Oath Reliquary |
| Claws | Shadows · §5.3 | Rend / Savage | Bone Claws → Claws Eternal · Bramblehorn's Roots | Frenzy; Mythic named for Act I |
| Fans | Shadows · §5.3 | Veil Dance / Thousand Petals | Paper Fans → Fans Eternal · Mirelle's Tide | Wind carrier; Mythic named for Act III |

### 4.2 Shields (3) and companions (3) · §6
| Item | Action / Spell / Ultimate | T1 → T5 · Mythic | Pairs with | Where used |
|---|---|---|---|---|
| Buckler · §6 | Parry+ / Bash / Aegis | Wooden Buckler → Buckler Eternal · Hearthlid | any melee 1H, Chakram | Knight kit; Vanguard, Cornered |
| Heater · §6 | Block / Shield Bash / Bulwark Charge | Oak Heater → Oath Eternal · Sunken Crest | Sword, Mace, Chakram | Sanctuary; Mythic named for the Grotto |
| Tower · §6 | Wall / Shove / Fortress | Door Shield → Wall Eternal · The Last Gate | Sword, Mace | Volley bosses (Gloam Warden) |
| Grimoire · §6 | Turn / Grimoire cast / Chapter | Primer → Book Eternal · The Names on the Pillars | Staff, Wand, Orb, Sword | Pages from the Elder Stone; Mythic named for Act II |
| Quiver · §6 | Nock / Quiver loose / Quiver Storm | Leather Quiver → Quiver Eternal · Thousandth Arrow | Bow, Crossbow | Fletcher, Siegeworks |
| Warhorn · §6 | Bellow / Warhorn call / Last Stand | Cow Horn → Call Eternal · Hollowhorn | Axe, Hammer, Halberd, Sword, Mace | Warband, Faultline, Hedgewall |

### 4.3 Pages, Arrows, Calls (deck entries) · §7
Sold one per zone at the Elder Stone; more at lore tablets, vaults and bosses. Capacity by companion tier 2/3/4/5/6/6.
| Entry | Kind | One line |
|---|---|---|
| Arcane Barrage | Page | Five homing missiles |
| Arcane Orbit | Page | Three orbs circle you 8 s |
| Blessing of Dawn | Page | +40% damage for 8 s |
| Chain Lightning | Page (also Orb spell) | Leaps between up to 6 enemies |
| Dawn Wave | Page and Arrow | A piercing crescent of light |
| Dreamveil | Page (also Mirage head) | Enemies at 35% speed for 4 s |
| Frost Shards | Page (also Wand spell) | Three piercing, slowing shards |
| Gravity Well | Page | A well that drags and grinds |
| Moonbeam | Page and Arrow | A long beam of moonlight |
| Second Wind | Page | Heal 35% of max HP |
| Shooting Star | Page | A star at your cursor |
| Starstorm | Page | Falling stars over an area |
| Piercing Shot | Arrow | Charged arrow, pierces a line |
| Snare Trap | Arrow | Trap that roots and wounds |
| Venom / Fire / Frost / Bola / Grapple / Split / Blast Arrow | Arrow (7) | Poison · burst · Chill · root 1.5 s · drag · split · wide blast |
| War Cry | Call (also Warden head) | Roar that stuns and knocks back |
| Rally | Call | Heal 12%, +15% damage 6 s |
| Taunt | Call (also Duelist head) | Foes turn on you; −20% damage taken 3 s |
| Quake-call | Call | A quake that leaves cracks |
| Stand | Call | Poise and −30% damage 3 s, then a shove |

### 4.4 Grips (14) · §7
| Grip | Pair | Rule |
|---|---|---|
| Vanguard | Sword + Buckler | A parry primes Sunslash +40% |
| Twin Fangs | Daggers + Daggers | Marks cap +1 |
| Twin Stars | Wand + Orb | Overload refunds 2 s |
| Archmage | Staff + Grimoire | Chapter costs 80 charge |
| Fletcher | Bow + Quiver | Loosed arrow +40% crit |
| Warband | Axe + Warhorn | Calls also Detonate |
| Dancer | Rapier + Fans | Step shares Parry's cooldown |
| Sanctuary | Mace + Heater | One zone, no stacking |
| Faultline | Hammer + Warhorn | (rule not written yet) |
| Lodestar | Chakram + Orb | Ricochet bounces twice more and zaps |
| Cornered | Claws + Buckler | (rule not written yet) |
| Spellblade | Sword + Grimoire | Pages retype Sunslash |
| Hedgewall | Halberd + Warhorn | Bellow primes +40% and a 0.6 s pin |
| Siegeworks | Crossbow + Quiver | Crossbow clip 6 |

### 4.5 Suits (12) · §8
Order of skills: chest F / head R / boots V. T1 pieces head · chest · boots. Origins give the T1 chest.
| Suit · class | Skills | T1 pieces | Mythic | Where used |
|---|---|---|---|---|
| Warden · Heavy | Bulwark / War Cry / Charge | Iron Cap · Iron Mail · Iron Boots | Shardheart Plate | Knight origin; Vale opening (Iron Mail 2:00, Iron Cap 3:50) |
| Crusader · Heavy | Consecrated Guard / Judgement Bell / Vault | Pot Helm · Quilted Gambeson · Hobnail Boots | Gloomspire Vestment | Holy vs Ruins, Spire |
| Juggernaut · Heavy | Brace / Ground Slam / Bull Rush | Bucket Helm · Scrap Plate · Iron Clogs | Forge Deep Cuirass | Warrior origin; Caldera stagger |
| Dreamweave · Caster | Mana Surge / Arcane Ward / Blink | Linen Circlet · Linen Robe · Rope Sandals | Nightlong Shroud | Mystic origin |
| Frostweave · Caster | Winter's Veil / Frost Nova / Glide | Novice Hood · Wool Robe · Felt Slippers | Brinemother's Veil | Frost vs Caldera |
| Stormweave · Caster | Static Cloak / Stormcall / Flash Step | Canvas Hood · Oilcloth Robe · Rush Sandals | Gravewind | Conduct in the Grotto |
| Stalker · Medium | Shadow Veil / Hunter's Mark / Tumble | Leather Cap · Leather Jerkin · Soft Shoes | Pinewood Mist | Ranger origin |
| Thornwarden · Medium | Briar Mantle / Mend / Root Vault | Ranger Cap · Moss Coat · Bark Boots | Briarwatch Mantle | Poison into Wildfire (Pinewood) |
| Duelist · Medium | En Garde / Taunt / Side-step | Feather Cap · Swordsman's Coat · Cuffed Boots | Oathless Jacket | Parry builds |
| Shade · Shadow | Fade Step / Smoke Bomb / Shadowstep | Rag Cowl · Rag Leathers · Rag Wraps | Gloamveil | Thief origin |
| Nightshade · Shadow | Venom Coat / Toxin Flask / Slink | Cloth Mask · Herbalist Vest · Moss Shoes | Mossjaw's Skin | Poison stacking |
| Mirage · Shadow | Mirror Image / Dreamveil / Phase | Gauze Veil · Gauze Silks · Gauze Slippers | Glasswarp Silk | Images, summons |
Full tier ladders (T1→T5 per piece): `docs/design/names.md`, §8 "<Suit> tiers".

### 4.6 Gems (7) and grades · §10
| Gem | Element | Armour / Weapon | Where used |
|---|---|---|---|
| Ruby | fire | +HP / +damage | Resist for the Caldera lava (Kharzul) |
| Sapphire | frost | +MP / +cdr | Sapphire rod widens the bite window |
| Emerald | nature | +HP regen / +attack speed | Pinewood resist |
| Topaz | lightning | +crit / +crit damage | Grotto weakness |
| Amethyst | arcane / gloom | +power % / +skill damage | Void fishing (Cinder rod + Amethyst) |
| Diamond | neutral | +def %, all resists / ultimate cooldown | Any |
| Opal | wind (Breath) | move speed / wind damage | Wind builds |
Grades: Chipped, Clear, Radiant (§10 Gem grade). First Chipped gem in the first Vale chest; 2:20 a fished gem.

### 4.7 Consumables, currency, upgrades · §10
| Item | One line | Where used |
|---|---|---|
| Health Potion | Heal 40% max HP; ~1.2 per room | Everywhere; refill at shrines |
| Mana Flask | Restore 50% max MP | Pockets |
| Fire Bomb | Bomb that bursts into flame | Pockets; burns Brambles |
| Dream Oil (Ember, Rime, Storm, Seed, Rune, Dawn, Breath Oil) | 60 s element coat on basic hits | Elder Stone; the backup for every verb puzzle |
| Dream Dust | The one currency, from Salvage | Elder Stone sinks |
| Socket rune | Adds a socket (max 3) | Secrets, quests |
| Pearl slot | Extra socket on a Legendary | Elder Stone, for a legendary fish |
| Food buff (§—) | Cooked fish, 10 min | Shrine fires |

### 4.8 Uniques (code has 18; doc cap 20) · §11
| Unique | Slot | Rule | Where used |
|---|---|---|---|
| Root-Crown · §11 | head | Snare and Frost Nova root bosses 1 s | Old Bramblehorn, Act I |
| Warden's Lantern Plate · §11 | chest | Bulwark reflects projectiles | The Gloam Warden, Act II |
| Tide-Edge · §11 | weapon | Frost trail, Wet | Lady Mirelle, Act III |
| Cinderstride Boots · §11 | boots | Fire trail, 2 s lava immunity | Kharzul, Act IV |
| Morrowbane · §11 | Sword (Mythic) | Ultimate resets on a boss phase change | Morrow, finale |
| Sorrel's Vow · §— | boots? | Boots skill gets a second charge | Sorrel's Echo, Isles |
| Twice-Told · §11 | any weapon | Grants Echo | Late drop |
| The Stopped Hour · §11 | any weapon | Spell becomes Hush | Late drop |
| Pip's Lantern · §— (amulet) | amulet | Ultimate casts twice at 50% | Pip's three-lanterns quest |
| Drowned Compass · §11 | amulet | R reveals hidden chests | Trinket unique |
| Ashen Signet · §11 | ring | Burn ticks spread Burn | Trinket unique |
| Kindred Band · §11 | ring | Ring resonance doubles | Trinket unique |
| Cinder Sash · §11 | belt | Potions leave an ember | Trinket unique |
| Girdle of Quiet Dusk · §11 | belt | Potions refill on boss phase change | Trinket unique |
| Comet Band · §11 | ring | Projectiles curve toward Marked | World unique (vault / Sunken Chest) |
| Tidewoven Clasp · §11 | belt | Zone skills follow you | World unique |
| Afterimage Pendant · §11 | amulet | Dashes recast your last skill | World unique |
| Summoner's Thread · §— | ring | Summons fire your basic attack | World unique |
| Hollow Bell · §— | belt | Novas fire twice | World unique |
| Morrow's Regret · §— | ? | (named in items.md only) | Unplaced |
| Kharzul's Anvil · §— | ? | (named in items.md only) | Unplaced |
Trinket bases (§9): Tarnished Band, Dreamsilver Band, Starmetal Band (ring); Lantern Charm, Dreamglass Pendant, Starhollow Amulet (amulet); Rope Sash, Mistwoven Belt, Moonlit Girdle (belt). Origin rings: Ring of the Shield, Ring of the Dream, Ring of the Trail, Ring of the Unseen, Ring of the Vow. Affixes and ~36 trinket boons: §9 (not repeated here).

### 4.9 Statuses (22) · §3
| Element | Tier 1 / Tier 2 | Hero side |
|---|---|---|
| fire | Burning 3 s / Ablaze 4 s | DoT |
| frost | Chilled / Frozen 1 s | Frozen → Numb (0.5 s root) |
| lightning | Jolted / Shocked 2.5 s | Shocked stops MP regen 2 s |
| nature | Poisoned 5 s / Rooted 1.2 s | |
| arcane | Marked (to 5) / Unravelled | |
| holy | Smitten / Dazzled 1.5 s | Dazzled: aim assist off 1 s |
| slash | Bleeding (§—) / Rent | |
| pierce | Pierced / Pinned | |
| wind | Buffeted / Lifted 0.8 s | Lifted → 1-tile knockback; bosses never Lifted |
| gloom (enemy) | Dread / Gloomed | Wisp bolts land Dread; Morrow's Dread aura |
| surface | Wet (flag) | Mirelle bar 2 floods the arena |

### 4.10 Reactions (8) and silent interactions (4) · §3
| Reaction | Trigger → effect | Where it is the answer |
|---|---|---|
| Shatter | physical on Frozen → AoE | Brinemother; Kharzul (after Frost); Slagheart |
| Wildfire | fire on Poisoned → Burn spreads 2 tiles | Mossjaw; Bramblehorn's saplings |
| Conduct | lightning on Chilled or Wet → Shock jumps | Lady Mirelle; Twin Vigils (Chilled pair) |
| Overload | arcane on Shocked → damage, cooldown cut | The Gloam Warden |
| Purify | holy on Burning or Poisoned → heals | Twin Vigils; gloom enemies |
| Rupture | pierce on a full stagger bar → crit | Oathless; Kharzul (after Shatter) |
| Detonate | stagger ≥3 on Burning → consumes Burn | Warband Grip; useless on Slagheart (immune Burn) |
| Drift | wind on a tier-1 status → carries it | Wind builds (≤3 wind casts in the game) |
| Thaw · Quench · Flash-freeze · Dry | fire ends Frozen · frost ends Burning · frost on Wet freezes · fire/wind ends Wet | Grotto and Caldera puzzles |

### 4.11 Enemies (29 commons + 3 others) · §13
| Enemy | Zone · act | One line |
|---|---|---|
| Dream Moth | Vale · Prologue | Swarm drifting to light |
| Training dummy | Vale · Prologue | Tutorial target |
| Gloom Slime | Pinewood · I | Splits |
| Shade Hound | Pinewood · I | Line lunge |
| Bramble Shaman | Pinewood · I | Poison zones and heals |
| Ogre | Pinewood · I | Cone brute; fox kit quest |
| Thornback Boar | Pinewood · I | Root Hollow, grass-fire den |
| Mountain Troll | Pinewood · I | Resists pierce |
| Gnarlroot Brute | Pinewood · I | Elite brute |
| Thornsow Matriarch | Pinewood · I | Elite |
| Wisp | Ruins · II | Kiting shooter, bolt lands Dread |
| Gloom Knight | Ruins · II | Shield-front: 85% front block |
| Grave Chanter | Ruins · II | Teleporting caster, raises bound wisps |
| Pillar Mimic | Ruins · II | Sleeps as a pillar, wakes at 1.8 tiles |
| Shadeling Swarm | Ruins · II | Orbiting swarm, 5 bodies, one kill |
| Void Archer | Ruins · II | Kiting sniper, 3-bolt fan |
| Frost Jelly | Grotto · III | Splitting jelly |
| Tide Crab | Grotto · III | (verb not written yet) |
| Glowfin Shoal | Grotto · III | Orbiting swarm |
| Deepsinger | Grotto · III | Aura-buffer |
| Lightning Eel | Grotto · III | (verb not written yet) |
| Crystal Sentinel | Grotto · III | (verb not written yet) |
| Cinder Imp | Caldera · IV | Bomber |
| Slag Golem | Caldera · IV | Poise brute |
| Ash Wraith | Caldera · IV | Teleport backstab |
| Forge Priest | Caldera · IV | (verb not written yet) |
| Magma Hopper | Caldera · IV | (verb not written yet) |
| Vigil Knight | Spire · Finale | Linked shield pair |
| Star Archer | Spire · Finale | Sniper |
| Dread Herald | Spire · Finale | Aura and summons |
| Unmade | Spire · Finale | Copies the hero |
| Void Bomber | Spire · Finale | (verb not written yet) |
Elite modifiers (§13, 8): Shielded, Storm elite, Burning elite, Rime, Gloomed elite, Twin, Vampiric, Summoner. Archetypes: Armoured, Amorphous, Ethereal, Beasts.

### 4.12 Bosses (12) · §14
| Boss | Kind · where · level | Element · weak | Counter · drop |
|---|---|---|---|
| Mossjaw | Mini · Root Hollow, Act I · L5 | nature · fire | Wildfire · Epic |
| Old Bramblehorn | Guardian · Bramblehorn's Clearing · L8 | nature · fire | Wildfire on saplings · Root-Crown |
| Oathless | Mini · Oath Reliquary, Act II · L12 | gloom · holy, pierce | Rupture · Epic |
| The Gloam Warden | Guardian · Warden's Hall · L14 | gloom (Ethereal) · holy | Overload · Warden's Lantern Plate |
| Brinemother | Mini · Drowned Vault, Act III · L18 | frost · slash | Shatter · Epic |
| Lady Mirelle | Guardian · Mirelle's Basin · L20 | frost · lightning | Conduct · Tide-Edge |
| Slagheart | Mini · Slag Chambers / Forge Deep, Act IV · L25 | fire · frost, stagger | Shatter after Frost · Epic |
| Kharzul the Cinder Colossus | Guardian · The Anvil · L26 | fire · frost | Shatter then Rupture · Cinderstride Boots |
| Twin Vigils | Mini · Spire ascent · L33 | gloom · holy | Purify; Conduct · Epic |
| Morrow | Guardian (finale) · Morrow's Throne · L34 | immune gloom · holy | Dawn Burst · Morrowbane |
| Sorrel's Echo | Optional · Drifting Isles · L38 | lightning | Mirrors your skills · Sorrel's Vow |
| Unwaking Child | Optional · The Gloaming Below · L40 | gloom | Stolen guardian moves · Mythic chance |

### 4.13 Characters and NPCs · §12
| Name | One line | Where used |
|---|---|---|
| Karea · §12 (Glossary: formerly Karea) | The hero, the Dreamer; Morrow's dream of his daughter | Everywhere |
| Pip · §12 | Lantern spirit; carries Pip's charge; becomes the Dawn Burst | Everywhere; Pip's Lanterns |
| Morrow · §14 | The Unwaking King; the first Dreamwarden | Morrow's Throne; both endings |
| Wardens · §12 | The four (Old Bramblehorn, The Gloam Warden, Lady Mirelle, Kharzul) | Acts I–IV |
| Sorrel · §12 | The fifth Warden; woke Morrow once, exiled | Drifting Isles |
| Elder Stone · §10 | Hub shop: temper, imbue, gems, pages, Dream Oil, fish trades, Origin re-roll | Vale hub |
| Fox kit · §— | Asks for its mother | Pinewood side quest |
| Apprentice golem · §— | Kharzul's apprentice | Caldera side quest |
| Fishermen · §— | Keep the drowned lanterns lit (unseen) | Grotto side quest |
| Origins · §12 | Knight, Mystic, Ranger, Thief, Warrior: starter kit and ring | Opening; re-choose once at the Stone |

### 4.14 World objects (§16, §17)
| Object | One line | Where used |
|---|---|---|
| Checkpoint shrine / Dawn shrine | Respawn, warp; holy World source | 3 per zone; Dreamer's bed in the Vale |
| Rift | Portal between maps | Vale hub rim (one per Dawn Shard) |
| Warp door | Door into a section | Every dungeon and vault |
| Treasure chest | Wood, silver, gold | Every zone; secrets |
| Lore tablet | Readable lore stone | Every zone; true ending needs all |
| Lever · Gate · Key door · Hidden wall | Switch logic | Root Hollow, Drowned Vault (airlocks) |
| Fishing spot | Dreamfishing point | 2 per outer map + 1 hidden; Moon Pond |
| Torch | fire lights it | Vale torch room |
| Brazier | Lit = fire World source | Caldera forge braziers |
| Bramble | fire burns it away | Pinewood, Fox Warrens door |
| Ice wall | fire melts it (double build) | Grotto, Drowned Vault |
| Seed | nature grows a vine bridge | *Idea:* Pinewood creek |
| Conduit | lightning live 10 s, chains | Ruins; Isles three-isle chain |
| Fog bank | wind clears it | Spire cloud bank |
| Windmill | wind spins it, gusts a zone | Caldera |
| Raft | wind drifts it to its mooring | Spire void raft; Isles |
| Glyph | arcane lights it | Ruins Belfry |
| Seal | holy breaks it | Oath Reliquary; Vigil Walk |
| Crystal wall | frost rimes, physical breaks | Glowfin Shallows |
| Vent | frost caps it → obsidian | Caldera frozen lava path |
| Rime crystal · Storm crystal | frost / lightning World sources | Near frost and lightning puzzles |
| Dry grass · Grass fire | fire spreads ≤16 tiles | Pinewood boar den |
| Drop-down ledge · Root ladder | One-way drop; climb | Height levels everywhere |
| Sunbeam | Light object | Crypt light puzzles (*Idea*) |

### 4.15 Fishing (§— except Dreamfishing, Fishing spot)
Rods: Twig, Dawn Rod, Cinder, Moonline. Legendary fish: Mossback, Dawnminnow, Frostgill, Cinderkoi, Voidlamprey, Moonmaw.
18 fish plus legendaries; 4 commons, 1 rare, 1 legendary per zone; 15% of bites are treasure (Sunken Chests).

### Catalogue size
Weapon lines 15 · shields 3 · companions 3 · deck entries 26 · Grips 14 · suits 12 (36 pieces) · gems 7 · consumables
and upgrades 8 · uniques 21 · trinket bases 9 + origin rings 5 · statuses 22 · reactions 8 + 4 silent · enemies 32 (+ 8 elite
modifiers) · bosses 12 · characters and NPCs 10 · world objects 24 rows · rods 4 · legendary fish 6.

---

## 5. Assets for Godot

Already in `handoff/` (PNG + JSON sidecar): hero body and hair (8 dirs, core and atk sheets); gear sword, staff, shield,
buckler, grimoire, cape, warden, knighthelm, knightgreaves (6 tiers each); enemies Ogre, Mountain Troll, Shade Hound, Bramble
Shaman; props (trees, pines, bushes, rocks, chest, shrine, tablet, sign, brazier, crystal, lantern, warpdoor, house, decals);
terrain sets and palettes for Vale, Pinewood, Ruins. Portraits: Pip, Elder Stone, fox kit (`tools/out/art/`).

| Zone / system | Art still needed |
|---|---|
| Whispering Vale | Dreamer's bed, Dreamer's Cairn stack, Stone's Crown, Moon Pond, Pip's Lanterns (3), Dream Arena ring, Training dummy, Dream Moth, Rift (5 tints), torch |
| Misty Pinewood | Gloom Slime, Thornback Boar, Gnarlroot Brute, Thornsow Matriarch, Mossjaw, Old Bramblehorn, root pillars, Hawk's Rest, creek ice, Bramble, dry grass, fox kit and mother |
| Gloomspire Ruins | Ruins terrain exists; Wisp, Gloom Knight, Grave Chanter, Pillar Mimic, Shadeling Swarm, Void Archer, Oathless, The Gloam Warden; name pillars, Broken Stair, conduits, glyphs, seal, dark-crypt light set |
| Sunken Grotto | Terrain set and palette; Frost Jelly, Tide Crab, Glowfin Shoal, Deepsinger, Lightning Eel, Crystal Sentinel, Brinemother, Lady Mirelle, Moonmaw; tide tiles, drowned lanterns, Tide Well, ice wall, crystal wall, airlock gates |
| Emberfall Caldera | Terrain set and palette; Cinder Imp, Slag Golem, Ash Wraith, Forge Priest, Magma Hopper, Slagheart, Kharzul; lava and obsidian tiles, windmill, vents, forge braziers, apprentice golem |
| Sleepless Spire | Terrain set and palette; Vigil Knight, Star Archer, Dread Herald, Unmade, Void Bomber, Twin Vigils; ledges, void tiles, cloud bank, void raft, ascent tablets |
| Morrow's Throne | Cloud throne, crumbling void tiles, starfall FX, Morrow (3 forms), Pip's light zone, Dawn Burst FX |
| Drifting Isles / The Gloaming Below | Isle tiles, rafts, Warden graves (5), Sorrel's Echo, Unwaking Child, corrupted guardian variants |
| Hero gear | 13 more weapon lines, 2 shields, Quiver, Warhorn, 11 more suits x 3 pieces x 6 tiers, trinkets, Mythic looks |
| Systems | Status icons (12x12), reaction name pops, element dots, gem icons (7 x 3 grades), Dream Oil coats, fish (24) and rods (4), boss bars, Codex and Bestiary cards |
| Story | Portraits: Karea, Morrow, the four Wardens, Sorrel; ending cards; epilogue card |

---

## 6. Extras

* `x1-keyart.jpg` Key art: Karea and Pip before the five guardians' silhouettes.
* `x2-memory.jpg` *Idea, alternate opening:* a memory of the waking world, the real Karea with her lantern on a pier; the flame looks like Pip.
* `x3-hubrifts.jpg` The Vale late in the game: five Rifts ring the island, Dawn Shards over the Elder Stone.
* `x4-golem.jpg` *Idea:* Kharzul's apprentice golem follows Karea with a tiny hammer.
* *Idea:* each Guardian's death leaves a small memorial prop in the Vale hub (roots, a lantern, a shell, an anvil).
* *Idea:* NG+ swaps the Vale's palette one notch toward dusk so returning players feel the "again".
* *Idea:* the KAREA pillar glows faintly once the twist has landed, rewarding a revisit.

---

## 7. Open questions

0. **Rename (client ruling 2026-10-23).** The game is *Karea's Dream* and the hero is Karea (formerly Aerin). `docs/GLOSSARY.md` §12 and `story.md` still say Aerin, and so do the beat line "He named her Aerin" and the Chakram Mythic (§5.7 "Aerin's Halo"); this booklet already writes Karea and Karea's Halo. The glossary needs the rename with Aerin under "Not".
1. **Play length.** The brief targets 7–10 h; `world-brief.md` says main path ~130 min and 100% ~4.5 h. Which is the target? (Scaling would mean more rooms per zone or longer Acts.)
2. **Missing glossary entries:** Sorrel's Vow, Kharzul's Anvil, Morrow's Regret, Summoner's Thread, Hollow Bell, Pip's Lantern (the amulet; §16 has only the Vale section), Starlit Shoals, The Gloaming Below, Vigil Walk, Sleepless Court, Slag Chambers, Glowfin Shallows, Mirelle's Basin, The Anvil, Belfry, Sunken Chest, Dreamwarden, Bleeding, food buff, fish and rod names, fox kit, apprentice golem.
3. **Uniques.** `items.md` names Morrow's Regret and Kharzul's Anvil; neither is in code (`UNIQUES`, `TRINKET_UNIQUES`, `WORLD_UNIQUES`). Code holds 18 incl. Summoner's Thread and Hollow Bell; doc cap is 20. Sorrel's Vow's slot is unstated.
4. **Spire ledges.** Ascent "5 ledges" vs set piece "6 ledges to h30".
5. **Potions.** §10 Potion "max 3" vs `items.md` caps "potions 5".
6. **Slagheart's home.** `story.md` says Forge Deep; `world-brief.md` puts it in Slag Chambers (vault).
7. **Zone count.** §16 Zone says eight; the brief lists nine maps (Throne and The Gloaming Below are maps inside zones?). Which are numbered zones 6–8?
8. **Gem count.** `items.md` "six types" plus the Opal; §10 Gem lists six. Is the Opal a seventh gem in UI and drop tables?
9. **Legendary fish per zone.** Six legendaries are named but not mapped to zones (Moonmaw is Starlit Shoals).
10. **Unwritten verbs.** Tide Crab, Lightning Eel, Crystal Sentinel, Forge Priest, Magma Hopper, Void Bomber have no one-line verb yet; Faultline and Cornered Grips have no rule text.
11. **Origin starter items.** The Origin ring is "found" in the first chest, but the Origin choice moment (and its UI) is not placed in the opening timeline.
