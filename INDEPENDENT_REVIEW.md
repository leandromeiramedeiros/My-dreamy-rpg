# Independent Review: *My Dreamy RPG*

**Prepared for:** the Game Director, the CEO and the technical team
**Build reviewed:** default branch at commit `2f3dd67` (M3 merged; the project is "paused until Friday" per `RESUME.md`)
**Date:** 21 October 2026
**Reviewer's position:** independent, with no stake in the team, its tools or its plan. This is written the way I would write a greenlight review for a publisher or a studio board. Praise is given where it is earned. Criticism is specific and comes with the evidence and a fix.

---

## How to read this document

| If you are… | Read | Time |
|---|---|---|
| **CEO** | §1 (verdict), §6 (market), §7.5–7.6 (positioning, legal and AI risk), §13 (risk register), §14 (decisions needed) | 20 min |
| **Game Director** | §1, §3 (what works), §7 (core problems), §8 (system-by-system design review), §10 (keep / implement / cut), §11 (plan) | 45 min |
| **Technical team** | §1, §4 (evidence), §9 (technical review), §10.2, §12 (process) | 30 min |

Every claim is either something I measured on this build (§4 says how) or is cited to a source in Appendix D. Where sources disagree or are weak, I say so.

---

## 1. Executive summary

### 1.1 The verdict

**There is a beautiful 30-minute game in this repository, attached to a plan that cannot be finished.**

The playable build covers Act I:

* the Whispering Vale hub;
* Misty Pinewood with the Root Hollow dungeon and the Fox Warrens vault;
* the mini-boss Mossjaw and the guardian Old Bramblehorn.

It runs in any browser with no install. In my headless runs it held a locked 60 fps on desktop, with zero console errors across every page. The art direction has a real identity. The story premise is moving. The internal tooling would be the envy of most indie studios:

* a balance simulator that runs the real game code;
* a QA bot that plays with real inputs;
* save-migration fixtures;
* a level generator and a visual editor.

All of it was built in about **two days of commits** (137 commits, 19–20 October 2026).

Around that build sits a design bible and a set of meeting minutes totalling **78,737 words**. That is the length of a novel, or about 3,000 words of plan per minute of playable game. The plan describes a different game from the one being played:

* 15 weapon variants and 12 armour suits, each with 5 hand-drawn tiers;
* 9 damage elements with two status tiers each, 8 named reactions and 4 "silent" interactions;
* 15 elemental world objects;
* 28 common enemies and 13 or more bosses, 19 uniques, 4 trinket slots with boon tables, gems, tempering;
* fishing with cooking and pearls, a combo codex, a bestiary with hunt milestones, NG+ modifiers;
* a true ending gated on 100 % completion.

The plan has been redrawn repeatedly: 17 maps, then 27, then 8 large ones, and a main path of 70, then 120, then 95–110, then 130 minutes. The team's own estimates put weapon and armour art alone at **~20 Sonnet-weeks**, before enemies, maps, elements and five more acts.

The essential problem is not that the team can't build these things; on this evidence it can build almost anything quickly. The problem is that **no human has yet confirmed that the 30-second combat loop is fun.** The only "players" so far are a scripted bot and a balance simulator, and they disagree:

* the simulator says the bosses are fair;
* the bot, in the team's own QA report, beat Mossjaw 3 times in 35 attempts and Bramblehorn 0 times in 19;
* in my own full bot run on today's build, it reproduced the open QA stall in the Pinewood (§4.3).

### 1.2 The eleven recommendations

1. **Freeze scope today.** No new system, element, slot, variant, map or meeting-driven feature until items 2–4 are done.
2. **Put Act I in front of humans within two weeks.** That means 3–5 observed testers per round, several rounds, desktop and phone, and then 15–30 total. Fix what they find. Children of Morta's team credits weekly playtests from week 2 with keeping it on course [Game Developer post-mortem].
3. **Re-scope 1.0 to roughly a third of the current plan** (§10.3, §11): 5 weapon classes with 1 variant each, 4 armour classes, 5 elements, 4 reactions, 4–5 zones, the complete story.
4. **Ship Act I as a free public demo.** Use itch.io and the web, plus a Steam page and demo. The Steam demo median playtime is about 14 minutes [howtomarketagame survey], so the first 14 minutes must carry the hook. Act I is already the right size for a demo.
5. **Decide the audience: narrative action-adventure, not loot-ARPG.** The story, the art and the brand point there, and the comparable hits (Hyper Light Drifter, Death's Door, Tunic, Spiritfarer, Omori) live there.
6. **Close three risks before anything goes public:**
   * the unlicensed Lumina code (§7.6);
   * the editor's "Publish" button, which commits straight to the live branch with no test gate and silently overwrites newer work (§9.4);
   * the AI-content disclosure and copyright position (§7.6).
7. **Fix the save model for phones.** Safari deletes `localStorage` after 7 days without a visit [WebKit ITP]. For a "phone-first" browser game, that means silently lost saves. Use home-screen install guidance, an export/import of the save, or a cloud save.
8. **Add a CI gate.** Today `pages.yml` deploys every push with no test step. Smoke, balsim and validate-ids should be required.
9. **Turn the docs into a ≤ 400-line current spec plus a backlog.** Agents are briefed from a bible that contradicts itself (§7.4).
10. **Fix combat readability before adding a single effect.** Today's bot screenshots show the hero as a white bloom blob and purple telegraphs on a purple floor (§8.10). VFX and lighting work (ELFX, the lighting meeting) should *reduce* glare in fights, not add to it.
11. **Keep everything in §3.** That is the real asset: art direction, the bare-start opening, the story and voice rules, the fairness rules, the hit-feel model, and the tooling.

### 1.3 Scorecard

| Area | Score (1–10) | One line |
|---|---|---|
| Art direction and atmosphere | **8** | Distinctive, cohesive palette and mood |
| Combat readability | **4** | Bloom whites out the hero; purple telegraphs on purple floors; loot labels over fights |
| Story and writing | **7** | Strong premise in a well-loved lineage (FFX, Link's Awakening); excellent voice rules |
| Combat feel (as built) | **6** | Correct principles (telegraphs, scaled hitlag, i-frames); unproven by humans; boss spikes |
| Level design (Act I) | **6** | Good grammar and secrets; stalls, stale objectives and dead time in practice |
| Systems design (as planned) | **4** | Individually clever, collectively overloaded for a "dreamy", short, phone-first game |
| UI / UX | **5** | Coherent "Dream Glass" style; 11 skill slots and dense menus; poor colour-blind separation |
| Technical foundation | **6** | Exceptional tooling and perf discipline; global-script architecture, no CI gate, unsafe publish path |
| Production and scope control | **2** | Cut lists exist but are "emergency levers only"; the plan only grows |
| Market positioning | **3** | No audience, platform, price or name decided |
| Legal and reputational risk | **4** | Unlicensed code lifts; AI-content exposure not yet planned for |

---

## 2. Scope of this review

### 2.1 Methods
* **Documents.** I read everything in `docs/`, plus `README.md`, `RESUME.md`, `docs/PRODUCTION.md`, `tools/qa/REPORT.md` and `docs/CREDITS.md`:
  * `DESIGN.md` (§0–§33, 1,987 lines);
  * `STORY.md`, `HUD.md`, `CONTROLS.md` and `AUDIO.md`;
  * the seven meeting minutes from 20 October 2026.
* **The build.** I played it headless in Chromium at 960×540 and at a phone viewport of 844×390:
  * the title screen and New Dream from the keyboard;
  * the Vale opening and the Pinewood start;
  * the boss showcase, the inventory and loadout screens, and the editor.
* **The team's own tools.** I ran them on an isolated copy of the repository, so nothing was written to the project:
  * `balsim.js` and `validate-ids.js`;
  * a full run of the QA bot `tools/qa/run-big.js kbm all`.
* **My own measurements:**
  * frame-time sampling on desktop and under 4× CPU phone emulation;
  * an ESLint pass over `js/`;
  * a colour-vision-deficiency simulation of the element colours (Machado matrices, CIE Lab distances);
  * inventory counts of the game's data tables.
* **Web research.** About 85 searches and fetches, including primary post-mortems, covering:
  * direct comparables (pixel action-RPGs and action-adventures);
  * systems precedents (Albion Online, Genshin Impact, Magicka, Wizard of Legend, Breath of the Wild, Divinity: Original Sin 2, Noita, Diablo III and IV, Hades, Last Epoch);
  * narrative precedents (Final Fantasy X, Link's Awakening, Omori, Spiritfarer, To the Moon);
  * Steam market data (releases, niches, demos, Next Fest, wishlists, refunds, completion rates, languages, Steam Deck);
  * distribution (web portals, itch.io, NW.js wrappers, subscriptions, Kickstarter, publishers, the Brazil Games program);
  * AI-content market data, AI copyright and disclosure, privacy rules for telemetry;
  * browser-platform constraints (Safari storage, WebGPU, `file://` origins);
  * research on AI-assisted code quality and AI "studio" workflows.

### 2.2 Limits
* **Headless play is not a human play-test.** I did not beat the bosses by hand.
* **No real phone was available.** My phone numbers are emulated, with software rendering and no GPU, so they overstate frame time. I treat them as a warning to verify, not a verdict.
* **Market numbers are often third-party estimates** (Raijin, Gamalytic-style trackers, survey write-ups). I flag those.

---

## 3. What the game does well (protect all of this)

### 3.1 An art direction with its own identity
* **The palette has rules, not just taste:** cool violet shadows, warm highlights, hue-shifted 7-step ramps and a plum outline.
* **The world has a distinctive silhouette:** floating islands over a cloud sea, root-curtain undersides, and mist bands.
* **The first frames hold up.** The Vale wake-up, the Pinewood dawn (an orange sky behind pine silhouettes) and the Ruins night (a red moon over purple flagstones) all compare well with commercial pixel-art releases.
* **The world-art pass (§29) used measurable acceptance bars:**
  * a silhouette test at 120×68;
  * at least 5 value bands;
  * fewer than 50 specks per frame;
  * at least 3 strata per cliff;
  * minimum tree and clutter density.

  I rarely see art direction run with numbers. Keep it.

### 3.2 A clear core fantasy, and an opening that sells it
"You are what you wear" comes from Albion Online, where a naked character "has no combat potential whatsoever" [PC Gamer]. Pairing it with "you see what you wear" is a strong pillar. **The bare-start opening (§28) is the best design decision in the repository:**

* the hero wakes in a nightshirt;
* the sword stands in the grass at 0:45;
* the mail, cap and boots arrive across the first five minutes;
* the HUD reveals itself one noun at a time.

The silhouette change *is* the reward. This is exactly how to teach a pillar without a tutorial screen.

### 3.3 A story worth finishing
* **The premise:** the hero is a three-day-old dream of the first Dreamwarden's dead daughter, and relighting the Shards wakes *her*, not him. It is tragic, clear and earned.
* **The precedents** are some of the most loved twists in the medium: Final Fantasy X, where Tidus is a dream of the fayth and fades when the dream ends [Giant Bomb and others], and Link's Awakening, where the island is the Wind Fish's dream and waking erases it [Zelda Universe, Wikipedia]. That is good company. The originality has to come from execution: Pip, the gear-as-identity link, and the "three days" seed.
* **The voice rules are disciplined.** Lines are ≤ 12 words, each speaker has a register, and the twist is seeded by silence (the Iron Cap on a child's bed). Lines like *"Little dream. You smell like him."* and *"Tell him… the roots held. Tell him I stayed."* are genuinely good.
* **The music concept** fits this: one lullaby yields Aerin's, Pip's and Morrow's themes, and the reveal is musical.

### 3.4 Correct combat principles
* Every big hit is telegraphed, with a fairness floor (wind-up of at least 0.55 s) and a punish window. Human simple visual reaction time is about 200–280 ms, and telegraphs must *move early* to be readable [infil.net, NVIDIA research], so these floors are sensible.
* **Hitlag is scaled by damage share and computed in one place** (`damageEnemy`). It has a global-freeze budget (12 steps per 0.5 s) and target-only freezes that add no input latency. This is exactly the lesson of Sakurai's "hit stop" talk and Vlambeer's "Art of Screenshake" [Destructoid, Upcomer, infovore].
* **A death "fling" instead of physics ragdolls, with sprites never rotated.** Tone-appropriate ("a dream fading, not a gore pile") and cheap.
* **Universal i-frame dodges**, and "harder through pattern, not numbers" for boss phases.
* **A boss single-hit cap** (`bossHitCap`, 45 % of the hero's real max HP, or 30 % on Story) is now in code. It fixes the one-shot the QA report found.

### 3.5 Tooling well above indie norms
* **`balsim.js`** runs the real game code headless. It checks time-to-kill bands, boss lengths, the optimal/random build ratio, Dust economy, potions per room and XP paths, and **fails the smoke test on red flags**. Balance-as-CI is rare even at mid-size studios.
* **The QA bot** plays from the title screen with real keyboard, gamepad and touch inputs. It produced a ranked findings report with repro scripts.
* **`tools/play.js`** has 203 checks: input, devices, rebinding, save migration, the big-map engine and phone caps.
* **The rest of the kit:** save v3 → v4 migration with real fixtures, an ID validator, a map generator with recipes and audits, perf tiers, a resolution governor, a light pool, and a `?perf=1` overlay.

This is why re-scoping is cheap here. **The tools let you cut and rebalance with confidence.**

### 3.6 Zero-friction access
A URL is all it takes, on desktop or phone. HTML5 is not a commercial ceiling:

* CrossCode shipped on Steam as an HTML5/JavaScript game in NW.js [Siliconera, GamingOnLinux];
* Vampire Survivors ran on Phaser (HTML5) until version 1.6 [Wikipedia, GamingOnLinux].

For demos, play-tests and portal distribution, this is a real advantage (§6.6).

### 3.7 Input breadth from day one
Keyboard and mouse, gamepad with glyph prompts, and touch with a floating stick and drag-to-aim (with free cancel) were designed in M2a rather than bolted on. The QA bot verified touch aim, cancel and page toggle. I confirmed that **Enter on the title now starts the game** (QA finding M2 is fixed).

---

## 4. Evidence gathered on this build

### 4.1 What exists (measured)
| Item | Planned (DESIGN §22, §23, §24, §25, §33) | Built today |
|---|---|---|
| Maps | 8 big maps (formerly 27) | **3:** Vale 80×80 (26 triggers, 972 objects), Pinewood 112×112 (61 triggers, 2,200 objects), old Ruins arena 22×22 |
| Main path | ~130 min | **~25–40 min** (bot: Vale ~1.7 min, Pinewood forest ~5–10 min, Hollow ~3 min, plus bosses) |
| Bosses | 5 guardians, 5 minis, optional bosses | Bramblehorn (3 bars), Mossjaw (2 bars), legacy Gloam Warden |
| Weapon variants | 15 | 3 families (sword, staff, bow) with 3 items per slot |
| Skills | ≤ 36 new casts plus the existing ones | 34 skills |
| Enemy rows | 28 commons | 19 legacy and 10 part-based rows |
| Status, reactions, elements in the world | 9 elements, 8 reactions, 15 objects | **0 % reaction share** (balsim: "no reaction code until M4") |
| Fishing, cooking, Codex, NG+ | fully designed | **not built** (no `fishing.js`, status or combo module) |
| Dialogue / quests | full beat sheet | 38 lines, 7 quests |

**Interpretation:** roughly 10–15 % of the planned *content* exists, but probably half or more of the planned *engine*. That is the right order. The question is what to put on that engine, and for whom.

### 4.2 Team checks (re-run by me)
* **`balsim.js`:** "no red flags (6 explained, 5 notes)". The notes:
  * weapon parity 1.41 at level 1 and 1.43 at level 3 (target ≤ 1.3);
  * live Mossjaw at −1 gear tier: median kill 128 s (target 90);
  * live Bramblehorn at −1 tier: median 255 s (target 240);
  * trinkets at 26 % of reference DPS at L31 (cap 25 %);
  * reaction share 0 %.
* **`balsim.js` boss win rates:**
  * reference gear wins 6/6 against both bosses;
  * −1 tier wins about 3.5–3.8/6;
  * the sim's player steps out of telegraphs 0.3 s after they appear and makes scheduled mistakes.
* **`validate-ids.js`:** 0 errors, 32 warnings (references to planned maps such as Grotto, Caldera and Spire).

### 4.3 Full QA-bot run (`run-big.js kbm all`, today's build)
The team's bot played Act I from the title screen with real keyboard and mouse input:

* **Vale:** done in 100 s at level 1 with 0 deaths. The opening beats fired in order: wake, sword, chest, cap, ambush, boots, rift.
* **Pinewood:**
  * r1 cleared at 185 s, level 2;
  * the key elite was killed at 224 s, level 3.
* **The open blocker in `RESUME.md` reproduced.** After a shrine warp back to shrine 1, the bot sat **240 s** waiting for the "r2" plaza to clear.
  * The tracker read "Find the root door of the Hollow" throughout.
  * The bot logged four consecutive "dead time > 60 s" findings and a *major* "goal timed out: r2 clear".
  * Whether this is a game-state bug (r2 marked fired, room never resolved) or a harness assumption is still undiagnosed. Either way, `RESUME.md`'s Friday hot-fix acceptance ("`run-big.js kbm all` reaches the end of Act I with no blockers") is **not met** on this build.
* **Polish findings repeated from the old report:** loot labels stacking (< 0.3 tiles), and an unattended drop (the intended Iron Cap).
* **Later sections:** *see Appendix B for the full run (Hollow, Mossjaw, Clearing, Bramblehorn) as recorded.*

### 4.4 My own measurements
* **Desktop**, 960×540, Pinewood: load-to-play 1.8 s; frame time average 16.6 ms, p95 16.7 ms, max 16.8 ms. That is a locked 60 fps.
* **Phone emulation**, 844×390 at DPR 2 with 4× CPU throttle, headless and without a GPU:
  * Pinewood: load-to-play 3.3 s; p50 33.3 ms, **p95 50 ms**, max 67 ms;
  * boss scene: p95 49.9 ms.

  The team's last recorded phone p95 is about 20.3 ms. My setup overstates cost, because software rendering has no GPU, so the true figure is between the two. **Only a real mid-range phone settles it, and the client dropped real-phone readings** (`RESUME.md`).
* **Lint** (ESLint on `js/*.js`, browser globals):
  * 4,718 references to names defined in *other* files, 431 distinct cross-file globals;
  * 0 names that are truly undefined anywhere;
  * 334 unused variables;
  * 539 lines longer than 200 characters, the longest 455;
  * 874 properties on `window` at runtime.
* **White-out around the hero**, measured against the team's *own* acceptance bar. The VFX minutes require that in a 64×64 px window around the target, pixels with min(r,g,b) ≥ 250 are **≤ 3 %**. On today's bot screenshots (the camera centres on the hero):

  | Frame | Near-white px, centre window | Worst nearby window |
  |---|---|---|
  | Vale wake (Pip's glow), `kbm-002` | 14.1 % | 14.1 % |
  | Hollow arrival, `kbm-049` | 12.6 % | 19.7 % |
  | Hollow gallery (shrine), `kbm-052` | **50.4 %** | **68.2 %** |
  | Mossjaw fight start, `kbm-055` | **25.7 %** | **31.4 %** |

  That is **4–23× over the team's own limit** in ordinary play. Death screens are desaturated and read 0 %, so they are excluded.
* **Colour-vision simulation** of the element colours (§8.11): several pairs fall under ΔE 12 (hard to tell apart at 14 px), including **arcane vs gloom in the HUD at ΔE 0.1 for deuteranopes**, which makes them identical.

---

## 5. How the plan has evolved

| Topic | First stated | Later | Latest |
|---|---|---|---|
| Main-path length | 70 min (§8) | 120 min (§11) | 95–110 (§20.1), then **130** (§25.1) |
| Map count | 16 + hub (§11) | 17 cap (§20.2), then **27** (§22) | **8 big maps** (§25) |
| Reactions | "Seven, no more" (§15.4) | — | **8**, plus 4 silent interactions (§33.3) |
| Elements | 7 tags (§4.3) | 8 damage types + gloom (§5b) | **9 hero elements**, including Wind (§33.1) |
| Uniques | 5 named legendaries (§4.5) | 18 cap (§19.5) | **19** (Echo, "the one deliberate exception", §30) |
| Weapons | 3 families (§4) | 5 families (§17) | **15 variants × 5 tiers + Mythic** (§23) |
| Armour | 3 sets (§4) | 4 families (§17) | **12 suits × 5 tiers + Mythic** (§24) |
| Milestones | M1–M8 | M2 → M2a / M2b | M4 → **M4a / M4b** (a new month of world verbs) |
| Cut orders | "Trim Starlit Shoals first" (§12) | cut lists per system (§21, §23, §24, §33) | "**emergency levers only**" (§24.1) |

The minutes show how this happens:

* **Client requests become binding direction.** The elements meeting records "The client's examples are binding direction", "The client's three examples are binding (fire, cold, lightning)", and "Kept as a client decision".
* **Experts propose cuts, and decisions keep the scope.** §24 itself warns that "§23 and §24 together do not fit M4–M7 alongside the 27 maps and 28 enemies"; §24.1 then records "Everything stays".
* **Each meeting adds a lane:** M4b, about 4 weeks of world verbs, was created in one meeting.

This is the most important pattern in the project. It is a governance problem, not a talent problem.

---

## 6. Market and competitive landscape

### 6.1 Direct comparables: what it took to ship them
| Game | Team | Time to ship | Main length | List price | Sales or players (source quality) |
|---|---|---|---|---|---|
| **Hyper Light Drifter** | 2 → ~6 | ~3 yrs; delayed 2014 → 2016 "due to the expanded scope" | ~8 h | $19.99 | ~712k on Steam (Raijin est.) |
| **Death's Door** | 2 core + 8–10 credited | ~3.5 yrs full production | ~9 h | $19.99 | ~442k on Steam (est.); 100k players in week 1 |
| **Tunic** | 1 → small team | 2015 → 2022 | ~12.5 h | $29.99 | ~317k on Steam (est.) |
| **CrossCode** (HTML5, NW.js) | small team | 2011 → 2018 | long RPG | — | 400k+ on PC by 2020; ~464k–591k on Steam (est.) |
| **Children of Morta** | 5 → 18 | planned **6 months**, shipped after **~5 years** | — | — | 1M+ all platforms (publisher) |
| **Moonlighter** | small | Kickstarter 2016 → 2018 | — | — | 2M+ (publisher) |
| **Minishoot' Adventures** | 2 | years (studio since 2011) | ~7 h | — | 7,849 Steam reviews, Overwhelmingly Positive |
| **Chained Echoes** | 1 | 7 yrs | — | $24.99 | 7,300 Steam reviews, 88 % |
| **Sea of Stars** | small, then grew | — | — | — | 250k in week 1; 4M players incl. subscriptions |
| **Halls of Torment** (retro Diablo-like) | small | Early Access May 2023 → 1.0 Sep 2024 | — | low | 70k in week 1; 1M+ |
| **Hades** | ~20 | ~20 months of Early Access | — | — | 700k in Early Access; 1M days after 1.0 |
| **Dreamscaper** (dream-themed ARPG) | 3 | Kickstarter + ~1 yr Early Access | median 3.9 h played | — | 88 % of 3,143 Steam reviews |
| **Spiritfarer** (death, bittersweet) | Thunder Lotus | — | — | — | 1M by Dec 2021 |
| **Omori** (dream-world RPG) | OMOCAT | — | — | — | 1M+ by Dec 2022 |
| **To the Moon** (short narrative) | Freebird | — | ~4 h | $9.99 (consoles) | acclaimed (Metacritic 84) |
| **Hyper Light Breaker** (HLD studio's scope-up) | Heart Machine | Early Access 2025 | — | — | **development ended after ~9 months; studio laid off nearly everyone, Sep 2026** |

**Lessons:**
1. **Every hit in this space has a narrow verb set executed perfectly.** Hyper Light Drifter has one sword, a few guns and a dash. Death's Door has 5 weapons and 4 spells, with no loot stats. Tunic has one weapon line. None has a loot-affix economy. Our plan has more systems than all of them combined.
2. **Even the narrow games took 3–7 years.** AI agents compress implementation, not judgment (§12).
3. **Children of Morta is the closest warning.** It was planned as a 6-month game and took 5 years; the team grew from 5 to 18. Its post-mortem lists exactly our risks:
   * "the game's feedback to the player was not very clear";
   * the UI was rebuilt at least three times;
   * "a colossal pre-production phase";
   * the story drifted until it "was not really about a family";
   * as systems were added, outside players struggled to understand the game.

   It also lists our cure: **weekly playtests from week 2** [Game Developer].
4. **Hyper Light Breaker is the second warning.** The studio behind one of our best comparables expanded scope, and the project ended in Early Access [VGC, Game Informer, MassivelyOP].
5. **Short, emotional, bittersweet games sell when they are excellent:** Spiritfarer, Omori and To the Moon. Our story belongs in that shelf, not in Diablo's.

### 6.2 Systems precedents: what we borrow, and what they teach
| System in our plan | Precedent | What the precedent teaches |
|---|---|---|
| Gear = skills | **Albion Online** [PC Gamer, Engadget] | It works, and it overwhelms. Albion's own team reported "This feels overwhelming, I don't know what to do after the tutorial" as common feedback and rebuilt its new-player experience in 2025 [MassivelyOP]. |
| 9 elements, 8 reactions, 2 ladders | **Genshin Impact** (7 elements) | Reactions carry Genshin's combat, but its Dendro reactions are routinely described as "challenging" and "intimidating" even for a live service with years to teach [Icy Veins, A Little Bit Human]. |
| Element combos | **Magicka** (8 elements), **Wizard of Legend** (5 elements, 100+ arcana) | Combos shine when they *are* the game, and they are taught by experimentation in a game built around them [Wikipedia, ModDB]. |
| Elements on world objects (M4b) | **Breath of the Wild**'s chemistry engine; **Divinity: Original Sin 2** surfaces; **Noita** | BotW runs on three rules: elements change materials, elements change each other, materials don't change materials [GamesBeat, GDC 2017 coverage]. Our §33 has 15 objects, receivers, states, tile patches and conditions. Start from BotW's three rules and 3–4 verbs. |
| Affixes, implicits, boons, tempering | **Diablo III Loot 2.0**, **Diablo IV Season 4 "Loot Reborn"** | Both cut volume and complexity: fewer, better drops [Engadget], and affixes down to 2 on rares and 3 on legendaries so players spend "more time fighting rather than sorting" [mein-mmo, MP1st]. |
| Build choices | **Hades** boons | One choice of three at a time, readable icons, iterated in public across ~20 months of Early Access, where "each Major Update was heavily informed" by players [PC Gamer, Supergiant]. |
| Many skills on touch | **Diablo Immortal** | A main attack plus **up to 4 skill buttons**, auto-aim with hold-to-aim [Wikipedia, Shacknews]. We show **11** chips plus a potion. |
| Action on phones | **Dead Cells** mobile | Even an excellent port is "fine 90 % of the time"; deaths to fumbled virtual buttons are the rest. Its controls are movable and resizable [TouchArcade, MacStories]. |
| Companion who guides (Pip) | **Navi, Fi** (Zelda) | Fi's over-explaining was Skyward Sword's most-cited complaint, and the HD remaster made her interruptions optional [Zelda Dungeon, Wikipedia]. Pip's "one hint per zone" rule is right; guard it. |
| Pixel art plus modern lighting | **HD-2D** (Octopath Traveler) | Its developers said early builds "went too far on the resolution and saturation, losing the appeal of pixel art" [Siliconera / Famitsu]. Our bloom whited out the hero in two of my captures (§8.10). |
| Difficulty options | **Celeste** Assist Mode | Player-side assists (speed, invincibility) beat stripping content [Vice, Game Accessibility Guidelines]. Our Story mode is a good start. |

### 6.3 The Steam market in numbers
* **Volume.** About **19,600–20,300 new games on Steam in 2025** [Game World Observer and others]. Pixel-art games alone: **6,422 releases between August 2023 and August 2025**, with about **5 %** reaching 500+ reviews [OP Game Marketing, using Gamalytic estimates].
* **Revenue rule of thumb.** About **1,000 reviews ≈ $150k gross** [Steam Page Analyzer]. Median indie earnings are tiny: third-party estimates put about two-thirds of releases under $1,000 [ziva.sh, unverified].
* **Niches:**
  * the Action Roguelike niche reached 1,000 reviews **3.5 %** of the time, against 4.2 % for all of Steam; its best price bucket was $15–19.99 (24.1 %) [Steam Page Analyzer];
  * the **Cozy** niche did far better: **11 %** reached 1,000 reviews, and **45 %** of $20+ cozy games did.

  "Dreamy" sits close to cozy in tone. That is a positioning opportunity (§7.5).
* **Demos and Next Fest.**
  * The median demo session is **about 14 minutes** (130-game survey) [howtomarketagame].
  * Next Fest results scale with pre-fest wishlists, and demos launched months before the fest earned about **2.5×** the wishlists of demos launched during it [Zukowski survey, via secondary write-ups].
* **Wishlists.** Third-party benchmarks suggest about 5,000–7,000 wishlists at launch as a floor; about 12 % of wishlists convert to day-1 sales (secondary, wide variance) [Steam Page Analyzer, presskit.gg].
* **Refunds.** Steam refunds are automatic under 2 hours of play within 14 days. One short-game developer reports about 55,000 refunds out of about 270,000 sales (their own claim) [Galaxus/Digitec]. **A short game must be worth keeping after 2 hours.** That argues for a 3–4 hour main path, a strong ending and real replay value, or a lower price.
* **Completion.** The median finish rate for games is about **36–39 %** [Galaxus, Two Average Gamers]; even Baldur's Gate 3 is 23 % [Notebookcheck]. A *true ending gated on 100 %* (fishing legendaries, a post-game floor, every tablet) will be seen by low single-digit percentages of players.
* **Languages.** Simplified Chinese (33.6 %) and English (33.5 %) dominate; Brazilian Portuguese is 2.8 % [Valve via WN Hub]. Plan localisation (the ≤ 12-word line rule makes it cheap).
* **Steam Deck.** The Deck took 48 % of tracked handheld-PC shipments in 2024 (IDC) [VoxBooster]. Because the game is pad-friendly, Deck Verified is cheap reach.
* **Early Access.** 60.6 % of Early Access games reach 1.0, but only about 20 % of graduates earn more in their 1.0 month than in their Early Access launch month [Steam Page Analyzer, GameDiscoverCo via WN Hub]. Early Access is a feedback tool, not a revenue plan.

### 6.4 Pricing and length
* **Typical list prices:**
  * Hyper Light Drifter and Death's Door: $19.99 for about 8–9 hours;
  * Tunic: $29.99 for about 12 hours;
  * To the Moon: $9.99 for about 4 hours.
* **Player heuristic:** roughly $2–3 per hour for adventures (anecdotal) [itch.io forum, game-wisdom].
* **Implication:** a 2-hour game sits at $5–10 and in the refund danger zone. A 3–4 hour, tightly made 1.0 at $12–15 is the defensible spot, *or* go free-to-try on the web with a paid full game.

### 6.5 Funding climate
* **Publishers are signing less.** Humble Games laid off its whole team in 2024, and former staff said it had signed nothing for 2026–27 [GamesBeat, Aftermath].
* **Publishers want a playable slice and evidence:** wishlists, Discord growth, structured playtest results [Game Developer, Wayline].
* **Kickstarter for games is smaller than it was:** $25.2M across 1,335 campaigns in 2024, against a $51M peak in 2013; no 2025 game campaign with a goal over $2.5M succeeded [GameDev Reports].
* **Subscription buyers (Apple Arcade, Netflix) are reportedly shifting** toward their own and licensed content (single, unverified source).
* **If the company is Brazilian** (the commit timestamps suggest UTC−3), the **Brazil Games** export program (Abragames with ApexBrasil, renewed for 2025–26) offers trade-show delegations (GDC 2025: 48 companies; Tokyo Game Show 2025) and an accelerator with investor access [Mercado & Consumo, App Developer Magazine, Techloy]. Brazilian indies such as Unsighted and Dandara have done well internationally [OpenCritic, Canaltech].

### 6.6 Distribution channels for a browser-native game
| Channel | Fit | Notes |
|---|---|---|
| **Web portals** (Poki, CrazyGames) | Good for a free Act I | Poki reports 100M+ monthly players and 600+ partner studios; revenue terms are negotiated and not public [CB Insights, cinevva, Playgama]. Portal audiences favour short sessions, which suits a 20–30 min demo. |
| **itch.io** | Good for play-tests and the demo | It hosts HTML5 builds as static sites in an iframe [Archive Team wiki]. |
| **Steam** (NW.js or Electron wrapper) | Main premium channel | CrossCode proves the path. NW.js and Electron perform alike, since both are Chromium; Tauri is smaller but lacks built-in Steamworks; test on Deck [jslegenddev, Construct forums]. |
| **Mobile stores** | Later | Premium mobile is hard. Diablo Immortal's 4-button layout is the reference for touch ARPGs. |
| **Consoles** | Much later | Needs a native engine or wrapper, plus certification. |

### 6.7 The AI factor (CEO attention)
This project is, by design, built almost entirely by AI agents: code, sprites, synthesized music, text and design. That is a production advantage and a market risk.

* **Players are hostile to visible generative AI:**
  * Quantic Foundry's 2025 survey (N = 1,799): **85 % negative**, **63 % "very negative"** [Quantic Foundry];
  * Circana: about **25 %** of US players are less likely to buy a game they know used generative AI [via collegefairs / letsdatascience].
* **AI-disclosing games underperform.** Game Oracle's analysis of 9,879 Steam games released in 2025 found about **53 % fewer reviews** for those with AI disclosures, after controls; about 21 % of releases disclosed [Notebookcheck, Digital Citizen].
* **Reputational events are real:**
  * the Indie Game Awards **rescinded** Clair Obscur's Game of the Year and Debut awards in December 2025 over placeholder AI textures [AV Club, Push Square];
  * Vapor World was review-bombed to 36 % over AI cutscenes [Everything Edinburgh].
* **Developers are turning against it too.** In GDC's 2026 survey, 52 % of developers say generative AI harms the industry, up from 30 % the year before; 36 % use it [GDC / BusinessWire].
* **Disclosure is required.** Steam requires disclosure of AI-generated content that ships to players; AI used only as a development tool is out of scope after the early-2026 revision [VGC, Game Developer]. Here the shipped assets themselves are agent-made. Some are procedurally generated by agent-written code, which is a grey area, so plan for disclosure.
* **Copyright is limited.** The US Copyright Office (Part 2 report, January 2025) holds that **prompts alone do not give sufficient human authorship**. AI output is protectable only where human creative contribution is perceptible: selection, arrangement, modification [Mintz, Crowell]. **What you can own needs to be designed**: a human-authored story, human art direction, curated and modified assets, and a written record of it.

**Recommendation:** make the *human* creative direction the brand (story, art direction, music concept, curation). Document human authorship. Disclose honestly. Avoid award programs with AI bans. Consider commissioning a human artist for key art, the hero sprite and capsule art, and a human composer for the main lullaby. Those are the most visible assets, and the ones players most object to as AI [Quantic Foundry].

---

## 7. The core problems, ranked by business risk

### 7.1 Scope: a decade of indie work scheduled as months
The comparables (§6.1) took 3–7 years for *narrower* games. The plan's own estimates already exceed what the milestone calendar can hold:

* weapons, ~6–7 Sonnet-weeks;
* armour, ~13 Sonnet-weeks;
* enemies, ~26 Sonnet-days;
* elements, ~36 agent-days;
* VFX, ~14.5 agent-days;
* Lumina M4 items, ~18 agent-days.

These estimates leave out iteration, play-testing and review time.

The usual answer is that agents are fast. They are, but **implementation is not the bottleneck; judgment is.** Every added system multiplies four things:

* **The balance space.** §18 already needs internal cooldowns, proc coefficients, chain depth, live caps and per-hit boss caps just to stay stable.
* **The teaching load.** §16.2 asks for "one new noun per minute", and the plan holds well over 100 nouns.
* **Play-testing.** A human must feel each combination that matters.
* **Art consistency.** 216 armour overlays plus 216 icons, plus 90 weapon layers and ~105 icons.

Outside research supports the caution:

* the first agent game-building benchmark (GameCraft-Bench, 140 Godot tasks) found the best agent at **41 %**, with art and presentation at 37 % and content depth at 39 %. Agents "struggle to deliver complete games with sufficient content, functional visual feedback, and coherent presentation" [arXiv 2606.17861];
* a 2025 randomized trial found experienced developers *felt* 20 % faster with AI tools but were **19 % slower** (early-2025 tools; the authors caution against generalising) [METR via eWeek, The Decoder].

### 7.2 Nobody knows whether it is fun
* **The bot** (QA report, runs 1–6, pre-M3): Mossjaw killed **3/35**, Bramblehorn **0/19**. Two Mossjaw lunges killed weak-gear heroes in under 5 s.
* **The sim** (today): reference gear wins 6/6, −1 tier wins ~3.5–3.8/6.
* **My bot run** (today): the r2 stall reproduced, with 4 minutes of dead time (§4.3, Appendix B).

Neither instrument is a person.

**Structural issue.** Boss damage is computed as `dmgPct × REF_EHP(bossLevel)`, a fixed reference independent of the hero's actual HP or gear (`js/bosses.js:264`). Worked example from the code:

* Mossjaw's lunge is `0.6 × REF_EHP(5)` ≈ 0.6 × 1,329 ≈ **797** damage before defence.
* The bot's hero today had **902–928 max HP** at level 9–10, against the sim's reference of 1,249. So every lunge lands at the **45 % cap**.
* In today's run, a summoned shade hound's lunge also hit for 418 (45 %).

In other words, "three mistakes kill" becomes "two mistakes plus chip damage kill". The new 45 % cap (`js/game.js:879`) stops one-shots, but a hero on an unlucky gear roll still takes *proportionally* bigger hits. With two big hits and chip damage, they die in about 2 seconds. A loot game that punishes bad RNG with near-one-shots produces "unfair" reviews. It contradicts the team's own rule: "Three mistakes kill; one never does" (§20.3).

**What to do:**
1. Run human play-tests of Act I before any M4 work: several rounds of 3–5 observed players, then a wider round [Game Developer, "How many players should you playtest with?"].
2. Scale boss damage partly by the hero's real max HP. For example, take the larger of 70 % of the reference value and the share of real HP; keep the cap.
3. Make boss retries cost under 10 seconds: shrine-to-arena warp, intro skipped on retry. Verify both ship (QA m2 found the intro replaying 4–13 times).
4. Add opt-in, anonymous death and quit telemetry: map, position, cause, level, gear score. It must be **opt-in** for GDPR and LGPD (Spanish and Belgian regulators issued game-specific guidance in June 2026) [Fieldfisher].

### 7.3 Collectively overwhelming systems
The pitch says *dreamy*, *short and complete*, *phone-first*. The planned rule surface asks a player to learn:

* LMB plus 10 bound skills;
* 9 elements × 2 status tiers, plus Wet, Dread and Gloomed;
* 8 reactions plus 4 silent ones;
* gems (6 × 3 grades, with different stats in armour and weapons);
* prefix and suffix affixes with named tiers, implicits, and 4 trinket slots with boons and ring resonance;
* tempering, imbuing, skill ranks and modifiers, suit twists, aspects, Duos, Echo, Dream Oil;
* fishing with rod tiers and sockets, cooking buffs and pearls.

The inventory screen I captured already shows 30 bag slots, a 9-icon resistance grid, 6 skill lines with element tags, set text and 10 stats, **before** any M4 system exists.

The precedents in §6.2 all say the same thing: Albion, Diablo III, Diablo IV and Genshin each had to simplify or re-teach. Hades did the opposite and won: **one readable choice at a time.**

**Recommendation: a written complexity budget, enforced like the perf budget.** For a 3–4 hour game:

* **5 elements:** physical, fire, frost, lightning, holy/gloom;
* **one status each**;
* **4 reactions**;
* **gems *or* trinkets, not both**;
* affixes: 2 on rare, 3 on epic and legendary, as in Diablo IV after "Loot Reborn";
* **no Codex, Duos or aspects in 1.0**;
* **6 touch buttons at most.**

Every new noun must displace an old one.

### 7.4 The design bible has become a liability
`DESIGN.md` claims to be the single source of truth, yet it contradicts itself (§5), and the reader has to know which section supersedes which. There are 21 "supersede" notes across the docs. Agents are briefed from these files. **An agent reading §18.4 will build rune-words, which were cut in §20.2. An agent reading §8 will pace for 70 minutes.** QA found the Vale beat order differs between three documents (opening minutes §1).

Industry practice moved away from long design bibles for exactly this reason. Stone Librande's GDC talk on one-page designs argues that almost nobody reads long documents [Game Developer]. Practitioners now recommend lean, per-system one-pagers written just before each system is built [Bugnet, Game Developer].

**Recommendation:**
* the planned "documentation meeting" should produce **one ≤ 400-line current spec** (rules and numbers, no history);
* add `docs/BACKLOG.md` for deferred ideas, `docs/DECISIONS.md` (one dated line each) and `docs/archive/` for the rest;
* agents are briefed from the spec only.

### 7.5 Positioning: who is it for, and where do they find it?
No document answers four questions:

1. **Audience.** The narrative-adventure player (Tunic, Hyper Light Drifter, Spiritfarer, Omori) or the loot-build player (Diablo, Last Epoch)? The plan serves both, and therefore neither. Quantic Foundry's "Slayer" type wants to be "the heroic protagonist in a cinematic story" and "care[s] very little about power progression" [Quantic Foundry]. That is our story audience, and they won't sort affixes.
2. **Platform.** Web, Steam, mobile or console?
3. **Price.** A free web demo with a premium full game? A $12–15 premium game?
4. **Name.** "My Dreamy RPG" is a working title. It is unsearchable and reads as placeholder, and the "dream" namespace is crowded: itch.io alone has *Dreamy Quest RPG*, *Dreamworld RPG* and *One Dreamy Night*, and there is a *Dream Tactics* [itch.io search, Siliconera]. Capsule art and title drive clicks on Steam [How To Market A Game, Wayline].

**Recommendation:** position as a **dreamy, bittersweet action-adventure with gear you can see**. Lean into the cozy-adjacent tone, the niche with the best outcomes in §6.3, while keeping real combat. Name the game before the demo. Ship Act I free on the web and itch.io, then a Steam page with the demo, aiming at a Next Fest at least 2–3 months after the demo launches.

### 7.6 Legal, IP and reputational exposure
1. **Lumina code lifts.** `docs/CREDITS.md` lists **nine** adaptations from `gitlab.com/stubborn-hug/lumina` and states: "Lumina has no licence file yet; the client accepted the risk."
   * On 21 October 2026 the repository showed **no licence, 2 commits, created 5 October 2026**.
   * Code without a licence is all rights reserved by default; public visibility and forking are not a licence to reuse [InfoWorld, romkey.com].
   * Credit lines are courtesy, not permission.
   * **Action:** get a written licence (an MIT or Apache file in their repo, or a signed email you archive) before any commercial release, or re-implement the nine items from the idea. Most are small: a governor, a gust formula, a scatter grammar, particle maths.
2. **AI disclosure and copyright:** see §6.7. Decide the store-page wording deliberately, and document human authorship.
3. **Reference images for the hero redesign** are planned "as style references only". Keep that lineage documented.
4. **Telemetry:** opt-in, with a privacy notice (GDPR and LGPD).
5. **Borrowed terms** ("aspects", "Wild Fury" as inspiration) are fine as mechanics. Avoid strongly branded names in shipped text.

### 7.7 A phone-first browser game whose saves vanish on iPhones
Saves live in `localStorage` (`dreamy.save.v1` and per-slot keys). **Safari, and every iOS browser, since all use WebKit, deletes all script-writable storage (localStorage and IndexedDB included) after 7 days of Safari use without interaction with the site.** Home-screen web apps keep their own counter [Didomi, WebKit Bugzilla, The Register]. A player who pauses for a week loses everything.

On `file://`, browsers historically shared or under-specified localStorage origins between local files [Chromium code review, Blink-dev].

**Actions:**
* add **Export / Import save** (a file or a copyable code) now;
* prompt "Add to Home Screen" on iOS;
* add a cloud save on the Steam build (Steam Cloud) and optionally on the web;
* test save survival on a real iPhone.

---

## 8. Design review, system by system

### 8.1 Core combat loop (the 30-second loop)
* **Strengths:** telegraph → dodge → skill → basic chain → kill-heal is a sound loop. MP-on-hit (8 per sword hit, capped at 40/s) creates a builder/spender rhythm. Dodge-cancel with a 50 % refund rewards reaction.
* **Concerns:**
  * **Weapon parity is outside target** (1.41 at L1, against ≤ 1.3).
  * **The ultimate cadence** is about 35 s for the sword but 57–60 s for an optimal staff or bow (balsim). The class that waits twice as long for its biggest moment will feel weaker.
  * The kill-heal and potions economy (0.81 potions per room against a ~1.2 target) is a sound start.
* **Recommendations:**
  * Equalise ultimate charge across families.
  * Adopt Lumina's input buffer and cancel windows (already planned for M4) *before* any new weapon.
  * Do one human feel pass on each of the three families, recorded on video and compared side by side.

### 8.2 Bosses
* **Strengths:** a data-driven `BOSS_MOVES` library (17 moves); multi-bar phases with damage clamps (a burst can't skip a phase); "cunning" forms; fairness lint (`bossFairness`).
* **Concerns:**
  * damage scaled to a reference hero, not the real one (§7.2);
  * the Bramblehorn fight gap is 30 s against a 15–25 s target (`RESUME.md`);
  * the old QA report found the bot dying 13 times in a row at Bramblehorn, mostly to stomp and root-grab;
  * the intro and banner repeat on every retry.
* **Recommendations:**
  * scale damage partly to the real hero;
  * **one learnable signature per boss**, introduced alone before it is combined with anything;
  * skip the intro on retry;
  * a 10-second retry loop;
  * add an assist option (Celeste-style), either a slower game speed or a "telegraphs +0.2 s" toggle on Normal, not only on Story.

### 8.3 Loot, items and economy
* **Strengths:** additive stat sums with one multiplier and a `CAPS` table; "no affix reroll"; item history ("my sword"). A balanced Dust economy: 1,095 income against 700 sinks.
* **Concerns:**
  * 60 implicits, prefixes and suffixes with named tiers, 4 trinkets with boons, gems with weapon/armour duality, temper and imbue. That is Diablo-depth itemization in a 2–4 hour game.
  * Diablo IV's "Loot Reborn" cut affixes to 2 on rares and 3 on legendaries so players could tell an upgrade at a glance [mein-mmo, MP1st].
* **Recommendations:**
  * 1.0 keeps rarity, 1–2 readable affixes, sockets and gems, and **one named unique per guardian**. Uniques that change a rule are the best part of the item design.
  * Trinkets, temper and imbue go to the backlog.
  * Show "Upgrade ▲ / Sidegrade ◆ / Worse ▼" on every drop label.

### 8.4 Elements, statuses and reactions
* **Strengths:** §33 is intelligent design work:
  * one build-up mechanism, cooldowns instead of immunities, cascade bounds;
  * the rule "never gate main progress on a specced element";
  * Pip carrying a fire charge to a brazier is a lovely idea.
* **Concerns:**
  * 9 elements × 2 tiers, 8 named reactions, 4 silent interactions, Wet as a surface, Dread and Gloomed, plus 15 world objects. That is Genshin-scale chemistry without Genshin's years to teach it.
  * Readability at 24 px on a phone is the binding constraint, and the colour test in §8.11 already fails for some pairs.
  * Wind was added the day after a "no more" cap, bringing a new gem (Opal) and a new reaction (Drift).
* **Recommendations:**
  * 1.0 ships **fire, frost, lightning, nature/poison and holy (vs gloom)**, plus physical. That is one status each and **four reactions**: Shatter, Wildfire, Conduct, Purify.
  * World verbs follow **Breath of the Wild's three rules**, with 3–4 verbs: burn, freeze, light, shatter [GamesBeat].
  * Wind stays an *environmental* force (gusts, fog banks), not a hero element.

### 8.5 Skills, loadout and HUD
* **Concerns:** LMB plus Q/E/R plus F/C/Shift plus 1/2/3 plus a potion is **11 bound actions**. On touch, the team built a paged wheel, which is clever, but Diablo Immortal ships **attack plus 4 skills** on phones [Shacknews]. In my 844×390 capture, the skill bar labels are tiny and the play area is letterboxed by about 75 px each side (also QA p2).
* **Recommendations:**
  * collapse to **attack, 3 weapon skills, 1 armour skill and dodge** (plus a potion) for 1.0;
  * character skills and helmet skills go to the backlog;
  * on touch: 6 buttons, movable and resizable as in Dead Cells mobile [MacStories];
  * fill the screen.

### 8.6 Level design (Act I)
* **Strengths:** points of interest every 12–15 tiles, landmarks, shortcut loops, signposted secrets ("the wall hums"), tall set pieces (Hawk's Rest, h 16) with a vantage reveal. The bot found every secret given the hints.
* **Concerns:**
  * the r2 stall after a shrine warp (reproduced today);
  * stale objective text after deaths and vault clears (QA m1);
  * loot labels piling up (reproduced);
  * stair-tile wedges (B1, not confirmed fixed);
  * the "Recommended ilvl" door hint invites farming in a short game.
* **Recommendations:**
  * fix objective state as data, so the objective is derived from trigger state and never left stale;
  * label de-overlap;
  * a "go back to your drops" marker on the minimap;
  * treat the gear-check loop (§26.2) as optional, with no human ever *needing* to farm on Normal.

### 8.7 The opening and onboarding
* **Strengths:** the §28 bare start, with each minute adding one noun.
* **Concerns:**
  * the bot reaches the end of the Vale in about 100 s and is still level 1, below the plan's "Level 2 at the ambush";
  * the Steam demo median is about 14 minutes [howtomarketagame], so **the first 14 minutes must contain the hook**: the first boss tease, the first wow vista, the first meaningful drop that visibly changes the hero, and Pip's first funny line;
  * vendor data suggests a majority of players skip tutorials (unverified) [Produktly], which supports the team's contextual-prompt approach.
* **Recommendation:** time a human's first 14 minutes and storyboard them as the trailer and demo hook. Move the Hawk's Rest vantage, the most spectacular moment, earlier if possible.

### 8.8 Pip, the companion
* **Strengths:** Pip as a guiding light (§28) is perfect. It is a story device, a navigation aid and a light source in one.
* **Concerns:** the plan gives Pip auto-loot, weakness callouts, Codex hints, charge-carrying, a "flare" and finale mechanics. The Navi and Fi lesson applies: a companion who talks too much becomes the game's most-cited complaint [Zelda Dungeon].
* **Recommendation:** a hard rule. Pip speaks unprompted at most once per new noun, and every hint is optional (on a button or a menu), as Skyward Sword HD changed.

### 8.9 Story delivery
* **Strengths:** the beat sheet, voice rules and guardian last words.
* **Concerns:**
  * the twist lands at the end of Act IV, after about 100 minutes of a plan that may not ship;
  * the true ending requires 100 %, fishing legendaries included;
  * the twist resembles FFX and Link's Awakening (fine, but players will notice).
* **Recommendations:**
  * build 1.0 so the twist lands by **Act III of a 4–5 zone game**;
  * gate the true ending on *story* acts (Pip's lanterns, the guardians' words), not on fishing completion;
  * write the twist so that knowing FFX doesn't spoil it. The "you chose this" Pip line and the gear-as-memory motif ("Gear remembers you") are the original angle; foreground them.

### 8.10 Art and readability
* **Strengths:** the environment art.
* **Concerns:**
  * **combat readability is the most serious visual problem.** In the QA bot's own screenshots from today's Mossjaw fight (`kbm-055-hollow-mossjaw-start`, `kbm-061-death`) and the Hollow gallery (`kbm-052`):
    * the hero renders as a **white bloom silhouette**;
    * the boss is hard to separate from the shrine lights and loot glow;
    * the **purple telegraph rings sit on a purple-lit floor**;
    * a loot label ("Hallowed Stalker Shoes of the Badger") floats over the fight.

    A player cannot dodge what they cannot read. That alone could explain part of the bot's, and any human's, boss deaths. Measured: 13–50 % near-white pixels around the hero, against the team's own ≤ 3 % bar (§4.4). The team already diagnosed this ("our bloom is fighting our fights", Lumina minutes §2), and emitter-only bloom shipped; the remaining glare comes from light sources around the hero (Pip, shrines, Echo, loot beams), which the bar does not yet police in normal play;
  * the hero is small (24×34 at 2×) against busy tree crowns, and in my own captures the hero was also **swallowed by Pip's or Echo's glow** (a white-blue blob);
  * the client already judged the hero sprite "too ugly";
  * HD-2D's own developers warn against saturation washing out pixel art [Siliconera].
* **Recommendations:**
  * a **combat-readability rule set**, enforced like the perf budget:
    * no bloom on the hero, enemies or telegraphs;
    * telegraphs in a reserved colour/value band never used by the environment of that zone (warm danger orange or red on violet worlds);
    * loot labels hidden while a boss bar is up;
    * ambient lights dimmed during fights;
  * a readability pass before the hero redesign: a silhouette rim, bloom excluded from the hero layer, a minimum ground contrast, and tested at phone size [Wayline pixel-art lesson];
  * consider a commissioned human artist for the hero sheet and key art (§6.7).

### 8.11 Accessibility (measured)
I simulated deuteranopia, protanopia and tritanopia on the element colours, using Machado matrices and CIE Lab distances. Pairs under ΔE 12 are hard to distinguish at 14 px:

| Palette | Deuteranopia | Protanopia | Tritanopia |
|---|---|---|---|
| Damage-number colours (`EL_COL` + wind) | slash/pierce 11.1, slash/wind 9.1, pierce/wind 7.9 | slash/pierce 10.1, slash/wind 7.2, pierce/frost 7.2, pierce/wind 10.3, nature/holy 10.9 | slash/pierce 8.0, slash/holy 11.1, frost/nature 10.6, **lightning/holy 4.1** |
| HUD element colours (`ELFX.hudCol`) | **arcane/gloom 0.1** | arcane/gloom 3.5 | nature/wind 11.9 |

About 1 in 12 men has red-green colour blindness (commonly cited ~8 %; I could not reach the NEI page itself). The Game Accessibility Guidelines say "ensure no essential information is conveyed by a fixed colour alone" [gameaccessibilityguidelines.com].

**Recommendations:**
* every element gets a **shape** (icon or glyph) wherever colour appears: damage numbers, statuses, frames;
* separate arcane from gloom by hue and value;
* add a colour-blind palette option;
* test with colour-blind players.

### 8.12 Audio
* **Strengths:** "music box in a cathedral", three motifs from one lullaby, and boss music as vertical stems. This is a composer's brief.
* **Concerns:** synthesized-at-runtime timbres are a creative constraint. Tiny-synth tooling suits SFX and prototypes; polished soundtracks usually need a composer [ZzFX / ZzFXM notes, js13k community].
* **Recommendation:** keep the synthesized SFX, and commission a human composer for the lullaby and the boss themes. It is the cheapest large quality and authorship win.

---

## 9. Technical review (for the technical team)

### 9.1 Strengths
* Performance is measured on p95 (not average), with quality tiers, a governor, pooled particles with hard caps, emitter-only bloom and a light pool. Desktop is locked at 60 fps.
* Data-driven bosses and enemy behaviour parts: content is data rows.
* Save versioning with one `migrate()`, real fixtures and v3 → v4 tested.
* Balance as CI (`balsim` red flags fail smoke).
* The §26.4 decision to stay on Canvas 2D is well argued: every hitch found so far was algorithmic.

### 9.2 Architecture debts that grow with scope
1. **One global namespace across 31 classic scripts.**
   * 431 cross-file globals and 4,718 cross-file references, with load order mirrored by hand in `index.html` and `editor.html`.
   * `game.js` is 1,847 lines, `render.js` 1,787, `items.js` 1,230; 539 lines exceed 200 characters.
   * Two agents adding a global with the same name is a silent bug.
   * GitClear's 2025 analysis of 211M changed lines found AI-era codebases accumulating duplicated code (copy/paste exceeding moved code for the first time) while refactoring fell below 10 % of changes [GitClear via secondary coverage].
   * **Recommendation:** keep classic scripts at runtime if you want `file://`, but add a two-day build step: an ordered concatenation, one namespace object per file, and `tsc --checkJs` with JSDoc types in CI. Schedule a "refactor/dedupe" lane each milestone.
2. **`js/world.js` (356 KB) has two writers:** the editor and the map generator (`build.js --merge`, `m1-world.js`). Pick one source of truth per map, or store editor edits as a patch layer over generated output.
3. **Sprites as data URIs in JS** (`sprites.js`, 244 KB): no caching, noisy diffs. If a build step exists, emit PNG atlases.
4. **No CI test gate.** `.github/workflows/pages.yml` deploys every push to the default branch without running anything. Add a required job (smoke, balsim, validate-ids, `play.js`) before deploy. One hour of work.
5. **Tolerated flaky checks** (the `play.js` warp fade, perf under load) train everyone, agents included, to ignore red. Fix them or delete them.

### 9.3 Platform risks
* **Safari's 7-day storage deletion** (§7.7).
* **Phone performance is unverified on hardware** (§4.4); "real-phone readings" were dropped. Restore one real mid-range Android and one iPhone reading per milestone.
* **WebGPU is now in all major browsers**, including Safari 26 on iOS, but engines treat it as opt-in, with WebGL2 as the safe fallback [web.dev, App Developer Magazine]. No action for 1.0; the §26.4 "thin WebGL batcher behind the same draw API" remains the right escape hatch. Canvas versus WebGL benchmarks are old and device-dependent [html5gamedevs, W3C list], so measure on your targets.
* **Steam packaging:** NW.js (the CrossCode path) or Electron with steamworks.js, tested on Deck. Tauri is smaller but needs custom Steamworks bindings [jslegenddev, GDevelop forum].

### 9.4 Security and data integrity: the editor's Publish button
`js/editor.js:693–704`:

* reads a fine-grained GitHub token from `localStorage`;
* fetches the *current* SHA of `js/world.js` on the target branch, which defaults to the repo's default branch, the one Pages deploys;
* PUTs the editor's world over it.

Because the SHA is fetched immediately before the PUT, **there is no conflict detection. Any change to `world.js` made after the editor loaded is silently overwritten**: generator merges, another editor session, an agent's commit. A draft saved in `localStorage` days earlier can revert a whole milestone of map work. With no CI gate, it then goes live in about a minute. The token also sits in storage readable by any script on the same origin as the game.

**Recommendations:**
* Publish creates a **branch and pull request**;
* send the SHA of the version the editor *loaded*, so stale drafts are rejected;
* require CI to pass before merge;
* never serve the editor from the same origin as a monetised or third-party-scripted build.

### 9.5 Test strategy
The team's suites are strong on engine invariants. They are weak on *experience*:

* no test asserts that the objective text matches the trigger state;
* no human-timing benchmark;
* the bot's goals are coordinates that drift as recipes change (`RESUME.md` notes the bot "walked to the old shrine 3 spot").

**Recommendations:**
* derive bot goals from game data (objective markers), as was partly done for shrine 3;
* add an "objective consistency" assertion in `play.js`;
* add a 3-minute "smoke play" of the opening to CI.

---

## 10. Keep / Implement / Cut

### 10.1 KEEP (protect from future cuts)
| Keep | Why |
|---|---|
| Art direction, §29 metrics, per-zone mood boards | The game's face; a measurable process |
| The bare-start opening (§28) and the HUD revealing itself | The best expression of the pillar |
| STORY.md premise, voice rules, guardian last words, the lullaby motif plan | The emotional differentiator |
| Telegraph fairness floors, scaled hitlag (§27), death fling, i-frame dodges | Correct, cheap and felt |
| `BOSS_MOVES`, multi-bar phases, enemy behaviour parts | Content as data |
| balsim, QA bot, `play.js`, save fixtures, validate-ids, the perf governor | They make re-scoping safe |
| The editor (with a PR-based publish) | Non-programmers can make content |
| Touch drag-to-aim with free cancel; gamepad glyphs | Platform reach |
| Pip as a guiding light | Story, onboarding and light in one entity |
| Echo legendary (§30) | Already built and distinctive; one late reward, not a system |
| "Never gate main progress on a specced element" (§33.5) | A rule that protects players |

### 10.2 IMPLEMENT (missing, ranked)
| # | Implement | Evidence | Size |
|---|---|---|---|
| 1 | **Human play-tests of Act I** (rounds of 3–5, observed; then 15–30) | §7.2; Children of Morta's weekly playtests | 2 weeks, then continuous |
| 2 | **Fix the r2 stall and stale objectives;** derive objectives from trigger state | §4.3, QA m1 | 2–4 days |
| 3 | **CI gate before the Pages deploy** | §9.2 | 1 hour |
| 4 | **Editor Publish → pull request, with stale-SHA rejection** | §9.4 | 1 day |
| 5 | **Save export/import, an iOS home-screen prompt, cloud save on Steam** | §7.7 | 2–3 days |
| 6 | **Boss damage partly scaled to the real hero;** intro skipped on retry; 10-second retries | §7.2, §8.2 | 2 days |
| 7 | **Lumina: a written licence, or a re-implementation** | §7.6 | 1 day to 1 week |
| 8 | **Opt-in death and quit telemetry** with a privacy notice | §7.2 | 2–3 days |
| 9 | **Combat-readability rule set and hero readability pass** (no bloom on combatants or telegraphs, a reserved telegraph colour band, labels hidden in boss fights, a hero rim) | §8.10, bot screenshots | 3–5 days |
| 10 | **Colour-blind-safe element shapes and palette option** | §8.11 | 3 days |
| 11 | **Phone HUD: 6 buttons, movable, no letterbox** | §8.5 | 1 week |
| 12 | **A ≤ 400-line current spec, BACKLOG.md, DECISIONS.md** | §7.4 | 2–3 days |
| 13 | **Name, audience, platform and price decision** | §7.5 | Leadership |
| 14 | **A real-device perf reading per milestone** | §4.4 | 30 min each |
| 15 | **AI-disclosure wording and an authorship record;** human key art and lullaby | §6.7 | Leadership plus a budget line |
| 16 | **Type-checked build step and namespaces** | §9.2 | 2 days |

### 10.3 CUT or DEFER (out of 1.0; backlog, revisit after demo data)
| Cut / defer | Instead | Why |
|---|---|---|
| 15 weapon variants | **5 classes × 1 variant** (sword, greataxe, bow, staff, daggers) | Biggest art cost; five distinct rhythms are plenty |
| 12 suits × 5 drawn tiers | **4 classes × 1 suit × 3 tiers** (palette and trim) | ~13 Sonnet-weeks by the team's own estimate |
| 9 elements, two tiers each, 8 reactions, 4 silent | **5 elements, 1 status each, 4 reactions** | Readability on a phone; Genshin needed years |
| Wind as a hero element, Opal, Drift | Wind as an environmental force | Added past a self-imposed cap |
| M4b, 15 world objects | **4 verbs** (burn, freeze, light, shatter) on BotW's 3 rules | Same delight, a fraction of the cost |
| Combo Codex, Duos, aspects, trigger affixes | Tooltip hints later | §18 needs its own safety layer just to exist |
| Trinkets ×4 with boons, ring resonance, temper/imbue | Gems plus one unique per guardian | Diablo III and IV both simplified |
| Fishing, cooking, rods with sockets, pearls | One fishing *story* moment (the Moonmaw), no economy | A second loot channel is a second game |
| True ending gated on 100 % | Gated on story acts | About 37 % of players finish games at all |
| 8 big maps, optional isles, Shoals, Gloaming, arena, NG+ | **5 zones** (Vale, Pinewood, Ruins, Grotto *or* Caldera, Spire + Morrow) | Each big map is about 2,000 objects and 60 triggers to tune |
| 28 commons | **~16** (4 per zone, each with a distinct verb) | Keep §21's "distinct verb" rule with fewer rows |
| Character skills 1/2/3 and helmet skill | Attack + 3 weapon skills + armour skill + dodge | 11 to 6 buttons |
| Variant mastery, weapon swap, Changeover Duo, Origins picker | Drop | No player has asked for them yet |

**The resulting 1.0** is about **3–4 hours**: 5 zones including the hub and finale, 5 weapon classes, 4 armour classes, 5 elements, 4 reactions, about 16 commons, 4 guardians, 2–3 minis and Morrow, and the complete story. That is still more combat kit than Death's Door, and it is **finishable**.

---

## 11. Proposed plan: 90 days to evidence

| Weeks | Goal | Exit criterion (KPI) |
|---|---|---|
| **0–2: Stabilise and listen** | §10.2 items 2–8; telemetry; play-test rounds 1–2 (3–5 people each, observed) | Act I finishable by ≥ 80 % of testers; no stall or wedge; Bramblehorn median attempts ≤ 3 on Normal |
| **2–3: Decide** | Leadership: audience, platform, price, name, AI stance; the ≤ 400-line spec for the reduced 1.0 | Signed-off spec; BACKLOG.md; DECISIONS.md |
| **3–6: Act I to demo quality** | Hero readability and redesign, phone HUD, colour-blind pass, lullaby, capsule art, a 60–90 s trailer cut from real play | Public demo on itch.io and the web; Steam page live; demo median play ≥ 14 min; positive feedback ≥ 80 % |
| **6–12: Act II on the reduced systems** | Ruins, 4 statuses and 4 reactions, 1 new weapon class, built on demo telemetry | Play-test round 3 (15–30 people); Act I fixes visible in telemetry; wishlists trending toward 5–7k |
| **Gate at week 12** | Review wishlists, demo completion, reviews, Discord growth | Continue as scoped, pivot, or stop, on data. Plan Next Fest ≥ 2–3 months after the demo |

**Calendar anchors** (Valve's published schedule):
* the October 2026 Next Fest (19–26 October) is already running;
* **February 2027** runs 22 February – 1 March, with registration closing **10 January 2027**;
* **June 2027** runs 14–21 June [Steamworks, PC Gamer, Steam Page Analyzer].

Demos launched months before a fest earn about 2.5× the wishlists of demos launched during it (§6.3). **I recommend the June 2027 Next Fest**, with the public demo out by about March 2027. February 2027 is possible but would mean debuting the demo at the fest itself.

---

## 12. Process review: the AI studio

The director-plus-agents workflow has strong conventions:

* file ownership as the lock;
* briefs of 25 lines or fewer, with non-goals and acceptance criteria;
* the director commits only after checks pass;
* an ID validator for data agents;
* at most 4 agents at once.

It produced a remarkable amount, quickly. Three structural risks:

1. **Meetings are scope generators.** Each expert consult (elements, VFX, Lumina, world art) produced a well-reasoned *expansion*, with a cut order attached and then waived (§5). **Fix:** every brief and meeting must answer "What does this replace? What do we cut to afford it?", and the answer is binding.
2. **Reviewers share a mind.** A critique of a popular 49-agent "game studio" setup makes the point: "independent" reviewers are "the same model running different system prompt priming on the same session context", and "the planning tool becomes the project" [Production Alchemist]. Here, the sim, the bot, the screenshot review and the expert panel are all agent-run, and two of them already disagree. **Fix:** human play-test data is the tiebreaker. Write it into the ship gate.
3. **Human attention is the scarce resource.** Every Sonnet screenshot review, Fable meeting and director brief consumes the client's attention: 96 "client" mentions across the docs, many of them decisions. That attention is better spent playing the game with players. **Fix:** decisions in a one-line log, a weekly 30-minute review, and the rest of the client's time spent in play-tests.

---

## 13. Risk register

| # | Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|---|
| R1 | Scope never converges; nothing ships | High | Critical | Director, CEO | §10.3 cuts; binding "what does this replace" rule |
| R2 | Core loop not fun for humans | Medium | Critical | Director | Play-tests from week 0; telemetry |
| R3 | AI-content backlash or delisting from awards and events | Medium | High | CEO | Honest disclosure, a human-authored brand, human key art and music, an authorship record |
| R4 | Copyright weakness of AI assets | Medium | Medium | CEO / legal | Human selection and modification documented; human-authored story and key assets |
| R5 | Lumina licence dispute | Low–Medium | Medium | CEO / tech | Written licence or re-implementation |
| R6 | iOS saves deleted after 7 days | High (for iPhone users) | High | Tech | Export/import, home-screen prompt, cloud save |
| R7 | Editor publish overwrites work or breaks live | Medium | High | Tech | PR-based publish, stale-SHA check, CI gate |
| R8 | Phone performance below 30 fps on mid devices | Medium | High | Tech | Real-device readings; quality tiers; the WebGL batcher as an escape hatch |
| R9 | Discoverability (20k releases a year) | High | High | CEO | Name, capsule, demo, Next Fest plan, portal funnel |
| R10 | Refunds on a short game | Medium | Medium | CEO / Director | 3–4 h main path, price $12–15, strong ending |
| R11 | Spec drift misdirects agents | High | Medium | Director | ≤ 400-line spec, a decisions log, an archive |
| R12 | Accessibility complaints (colour) | Medium | Low–Medium | Director | Shapes plus palette option |

---

## 14. Decisions needed

**From the CEO, within two weeks:**
1. Approve the **scope freeze** and the **reduced 1.0** (§10.3).
2. Choose the **audience and platform**: I recommend narrative action-adventure; web demo, then Steam.
3. Approve a small **human-asset budget**: hero sheet, key and capsule art, lullaby and boss themes.
4. Settle the **Lumina licence** and the **AI-disclosure policy**.
5. Name the game.

**From the Game Director:**
1. A play-test plan and dates.
2. The complexity budget (§7.3), written into the spec.
3. Pip's speaking rule; the true-ending gate on story, not fishing.

**From the technical team:**
1. The CI gate and PR-based publish (this week).
2. Save export/import (this week).
3. Real-device perf readings (this milestone).

---

## 15. Notes to each audience

**To the Game Director:** your instincts on feel, fairness, readability and story are right; the documents prove it. The failure mode is saying yes. You already wrote the right rule in §22: "A map exists only if it has a hook the previous map didn't. If a map's hook slips, cut the map." Apply it to *systems*, and make the cut orders real again.

**To the CEO:** you own an unusually cheap production engine and a genuinely attractive Act I. For the next month, spend on **information** (play-tests, a public demo, wishlists), not on **content**. The current plan has no cost ceiling because it has no scope ceiling; fix the scope and the cost becomes forecastable. The biggest *external* risk is not technical but reputational, from AI content. Get ahead of it with honest disclosure and a few human-made hero assets.

**To the technical team:** the engine is healthy for its age. This week: the CI gate, PR-based publish with stale-SHA rejection, and save export. This milestone: a type-checked build step and namespaces, a single source of truth for `world.js`, and a real phone on the desk. Keep the sim and the bot, and calibrate them against human data.

---

## 16. Closing

There is a lovely game here. It is the story of a three-day-old girl who is a grieving man's dream, told through gear that changes her and a small light that knows more than it says. It can be played in an evening, on a phone, and remembered. Most of the 78,737 words around it describe a different game: a build-crafting loot engine with fifteen weapons, nine elements and a fishing economy. That game will take years to finish, if it can be finished, and it will bury the smaller, better one.

**Ship the small game first. Let the players earn the big one.**

---

## Appendix A: commands and measurements

All runs were on an isolated copy of the repository (`/tmp/.../scratchpad/repo`), so nothing was written to the project.

* **Repository:**
  * commit `2f3dd67`;
  * 137 commits from 2026-10-19 18:27 UTC to 2026-10-20;
  * `js/` is 42,742 lines (`world.js` 22,527); `tools/` is 9,539 lines;
  * docs (`docs/*.md`, `docs/meetings/*.md`) total 78,737 words.
* **Maps in `WORLD_DATA`:**
  * vale 80×80: 26 triggers, 972 objects;
  * pinewood 112×112: 61 triggers, 2,200 objects;
  * ruins 22×22: 8 triggers.
* **Runtime table counts** (read in the browser): `SKILLS` 34, `ITEMS` 3 per slot, `IMPLICITS` 60, `ENEMY` 19 + `ENEMY_DATA` 10, `BOSS_MOVES` 17, `EFFECTS` 44, `ELITE_MODS` 8, `DIALOGUE` 38, `QUESTS` 7, `SETTINGS` 25, `UNIQUES` 6.
* **`node tools/balsim.js`:** no red flags (6 explained, 5 notes; §4.2). **`node tools/validate-ids.js`:** 0 errors, 32 warnings.
* **Frame timing** (Playwright; requestAnimationFrame deltas over 300–360 frames):
  * desktop Vale: average 16.7 ms, p95 16.8 ms;
  * desktop Pinewood: p95 16.7 ms;
  * phone emulation (844×390, DPR 2, CDP 4× CPU throttle, headless with no GPU): Pinewood p50 33.3 ms, p95 50 ms; boss scene p95 49.9 ms.
* **ESLint** (script mode, browser globals): 4,718 `no-undef` (cross-file), 431 distinct names, 0 names undefined everywhere, 334 `no-unused-vars`.
* **Code references:**
  * boss damage `js/bosses.js:264` (`moveDmg`), reference table `js/bosses.js:61`;
  * hero hit cap `js/game.js:879`;
  * editor publish `js/editor.js:693–704`;
  * saves `js/items.js:965–968`;
  * deploy `.github/workflows/pages.yml` (no test step).
* **Colour-vision simulation:** Machado et al. (2009) severity-1 matrices on linear RGB, CIE Lab (D65), ΔE76; results in §8.11.

## Appendix B: full QA-bot run on today's build (`run-big.js kbm all`)

| Marker (bot clock) | Level | Deaths | Note |
|---|---|---|---|
| vale-start 1.3 s | 1 | 0 | New Dream from the title |
| vale-done 100.5 s | 1 | 0 | All opening beats fired; one loot-overlap finding |
| pinewood-enter 121.4 s | 1 | 0 | |
| pinewood-r1-done 185.1 s | 2 | 0 | |
| pinewood-key 223.7 s | 3 | 0 | Elite killed, key dropped |
| r2 clear, timed out 555.4 s | 4 | 0 | **Stall:** 240 s at shrine 1 after a warp; tracker "Find the root door of the Hollow"; 4 × dead-time findings; 1 × major |
| *(remaining markers: see the update below)* | | | |

## Appendix C: comparables at a glance
See §6.1 (shipped comparables), §6.2 (systems precedents) and §3.3 / §8.9 (narrative precedents).

## Appendix D: sources

**Comparable games: development, sales, length**
* Hyper Light Drifter: [Wikipedia](https://en.wikipedia.org/wiki/Hyper_Light_Drifter), [MCV "When We Made…"](https://www.mcvuk.com/development-news/when-we-made-hyper-light-drifter/), [Raijin estimate](https://raijin.gg/app/257850/Hyper_Light_Drifter), [Deku Deals length](https://www.dekudeals.com/items/hyper-light-drifter-special-edition), [Slickdeals price](https://slickdeals.net/f/19659162-4-99-hyper-light-drifter-steam)
* Death's Door: [MCV](https://mcvuk.com/?p=217809), [Windows Central](https://windowscentral.com/deaths-door-interview-zelda-big-indie-win-xbox), [Analog Stick Gaming](https://www.analogstickgaming.com/game-reviews/2021/7/21/deaths-door), [PC Gamer: 100k players](https://www.pcgamer.com/uk/deaths-door-reaches-over-100000-players-in-its-first-week/), [Raijin](https://raijin.gg/app/894020/Deaths_Door), [Deku Deals](https://www.dekudeals.com/items/deaths-door), [The Outer Haven review](https://www.theouterhaven.net/2021/07/deaths-door-review/), [Vaporlens summary](https://vaporlens.app/app/894020/deaths_door)
* Tunic: [Wikipedia](https://en.wikipedia.org/wiki/Tunic_(video_game)), [Game Informer](https://gameinformer.com/2022/05/30/tracing-threads-the-making-of-tunic), [Finji](https://finji.co/news/2025/10/30/Tunic-LostinCult.html), [Raijin](https://raijin.gg/app/553420/TUNIC), [Deku Deals](https://www.dekudeals.com/items/tunic?format=all)
* CrossCode: [Siliconera](https://www.siliconera.com/crosscode-developer-reflects-rpgs-six-years-evolution/), [GamingOnLinux](https://gamingonlinux.com/2014/12/demo-available-for-upcoming-puzzleaction-rpg-crosscode), [Wikipedia](https://en.wikipedia.org/wiki/CrossCode), [Raijin](https://raijin.gg/app/368340/CrossCode/sales-revenue), [GamesHedge](https://www.gameshedge.com/crosscode-release-ps4-nintendo-switch/)
* Children of Morta: [Game Developer post-mortem](https://www.gamedeveloper.com/design/postmortem-children-of-morta), [GamingBolt](https://gamingbolt.com/11-bit-studios-celebrates-2-million-copies-of-moonlighter-and-1-million-copies-of-children-of-morta-sold), [Game Informer review](https://gameinformer.com/review/children-of-morta/children-of-morta-review-family-matters)
* Moonlighter: [GamingBolt](https://gamingbolt.com/11-bit-studios-celebrates-2-million-copies-of-moonlighter-and-1-million-copies-of-children-of-morta-sold), [Nintendo Dojo](https://www.nintendojo.com/news/moonlighter-announced-for-switch)
* Minishoot' Adventures: [Wikipedia](https://en.wikipedia.org/wiki/Minishoot%27_Adventures), [God is a Geek](https://www.godisageek.com/2024/04/minishoot-adventures-how-long-to-beat)
* Chained Echoes: [Gematsu](https://gematsu.com/2022/11/chained-echoes-launches-december-8), [Automaton](https://automaton-media.com/articles/newsjp/chained-echoes-20260312-428586/)
* Sea of Stars: [Game World Observer](https://gameworldobserver.com/2023/09/06/sea-of-stars-sales-250k-copies-compared-to-the-messenger), [MP1st](https://mp1st.com/news/sea-of-stars-hits-an-impressive-milestone-as-over-4-million-players-have-played-it-since-launch)
* Halls of Torment: [Wikipedia](https://en.wikipedia.org/wiki/Halls_of_Torment), [GamingOnLinux](https://www.gamingonlinux.com/2023/06/halls-of-torment-hits-over-70k-sales-in-the-first-week/page=1/), [Game*Spark](https://www.gamespark.jp/article/2024/10/18/146102.html)
* Hades and Hades II: [PC Gamer on Early Access](https://www.pcgamer.com/uk/a-journey-through-early-access-helped-make-hades-a-masterpiece/), [Supergiant patch notes](https://www.supergiantgames.com/blog/hades-superstar-update-patch-notes/), [WN Hub: Hades II](https://wnhub.io/news/analytics/item-48907), [KeenGamer: 1M](https://www.keengamer.com/articles/news/hades-has-already-sold-1-million-copies/), [Giant Bomb](https://www.giantbomb.com/games/3030-71297/)
* Spiritfarer: [Game Developer](https://www.gamedeveloper.com/press-release/a-fond-farewell-spiritfarer-sells-1-million-units-farewell-edition-is-out-today); Omori: [GoNintendo](https://www.gonintendo.com/contents/14452-omori-sales-has-surpassed-the-1-million-mark-worldwide); To the Moon: [Wikipedia](https://www.Wikipedia.org/wiki/To_The_Moon), [Gematsu](https://www.gematsu.com/2024/09/to-the-moon-for-ps5-xbox-series-and-xbox-one-launches-october-8)
* Dreamscaper: [OpenCritic](https://opencritic.com/game/10004/view), [Nodal](https://nodal.gg/game/dreamscaper-1040420), [RPG Site](https://www.rpgsite.net/news/11338-dreamscaper-comes-out-of-early-access-on-august-12-2021)
* Hyper Light Breaker / Heart Machine: [VGC](https://www.videogameschronicle.com/news/development-ends-on-hyper-light-breaker-as-studio-heart-machine-says-its-making-layoffs), [Game Informer](https://gameinformer.com/2026/09/17/hyper-light-drifter-maker-heart-machine-lays-off-nearly-everyone), [MassivelyOP](https://massivelyop.com/2026/09/18/hyper-light-breaker-developer-heart-machine-lays-off-nearly-everyone-at-the-studio/)
* Last Epoch: [Wikipedia](https://en.wikipedia.org/wiki/Last_Epoch), [Game World Observer](https://gameworldobserver.com/2024/02/26/last-epoch-peaks-at-265k-concurrent-players-launch-server-issues)
* Vampire Survivors: [Wikipedia](https://en.wikipedia.org/wiki/Vampire_Survivors), [GamingOnLinux](https://www.gamingonlinux.com/2023/07/vampire-survivors-switching-to-new-game-engine-on-august-17)
* Hollow Knight: Silksong scope: [Shacknews](https://shacknews.com/article/135433/hollow-knight-silksong-delayed-first-half-2023), [Checkpoint Gaming](https://checkpointgaming.net/news/2025/08/hollow-knight-silksong-finally-has-a-release-date-6-years-after-announcement/)
* Unsighted / Brazilian indies: [Wikipedia](https://en.wikipedia.org/wiki/Unsighted), [OpenCritic](https://opencritic.com/game/12036/unsighted), [GDC Vault: Brazilian indie decade](https://gdcvault.com/play/1034774/Independent-Games-Summit-A-Decade)

**Systems precedents**
* Albion Online: [PC Gamer](https://www.pcgamer.com/uk/how-i-became-the-leather-shoe-guy-in-albion-online), [Engadget](https://www.engadget.com/2014-02-28-new-albion-online-dev-video-details-classless-system.html), [mein-mmo](https://mein-mmo.de/en/kampfsystem-albion-online,57796/), [MassivelyOP interview 2025](https://massivelyop.com/2025/07/22/interview-albion-onlines-head-of-ops-on-the-newbie-experience-streamlined-leveling-and-more/), [Steam discussion](https://steamcommunity.com/app/761890/discussions/0/3842179510155509357)
* Genshin Impact: [Icy Veins](https://icy-veins.com/genshin-impact/elements-and-elemental-reactions), [A Little Bit Human](https://alittlebithuman.com/genshin-impact-how-do-dendro-reactions-work/)
* Magicka: [Wikipedia](https://en.wikipedia.org/wiki/Magicka); Wizard of Legend: [ModDB](https://www.moddb.com/features/a-closer-look-at-arcana-combinations-in-wizard-of-legend), [Nintendo Life](https://www.nintendolife.com/reviews/switch-eshop/wizard_of_legend); Noita: [Wikipedia](https://en.wikipedia.org/wiki/Noita_(video_game)), [PC Gamer](https://www.pcgamer.com/au/noita-is-a-hilarious-horrifying-wizard-death-experiment-where-every-pixel-is-simulated)
* Breath of the Wild chemistry: [GamesBeat](https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/), [Thumbsticks](https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies); Divinity: Original Sin II: [Giant Bomb](https://giantbomb.com/wiki/Games/Divinity_Original_Sin_II)
* Diablo: [Engadget: Reaper of Souls](https://www.engadget.com/2013-08-21-diablo-3-reaper-of-souls-expansion-revealed.html), [Diablo Wiki: Loot 2.0](https://diablo.fandom.com/wiki/Loot_2.0), [mein-mmo: Season 4](https://mein-mmo.de/en/diablo-4-season-4-patch-notes-show-what-gets-better-less-loot-but-stronger,1121161/), [MP1st](https://mp1st.com/news/diablo-4-season-4-loot-reborn-out-may-14-brings-item-updates-and-here-are-the-changes), [Insider Gaming](https://insider-gaming.com/diablo-4-season-4-loot-reborn-revealed/), [mein-mmo: D4 affix criticism](https://mein-mmo.de/en/diablo-4-game-pass-warum-hass,1109313/), [Siliconera: aspects](https://www.siliconera.com/how-to-extract-aspects-in-diablo-iv/)
* Diablo Immortal touch: [Wikipedia](https://en.wikipedia.org/wiki/Diablo_Immortal), [Shacknews](https://www.shacknews.com/article/130623/diablo-immortal-preview); Dead Cells mobile: [MacStories](https://www.macstories.net/reviews/game-day-dead-cells/), [TouchArcade](https://toucharcade.com/2019/05/07/dead-cells-mobile-blog-post/)
* Companions: [Zelda Dungeon](https://zeldadungeon.net/hey-listen-a-look-at-the-problems-of-links-companions), [Skyward Sword (Wikipedia)](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Skyward_Sword), [Nintendo Wire: HD changes](https://nintendowire.com/news/2021/07/13/the-legend-of-zelda-skyward-sword-hd-has-more-quality-of-life-improvements-than-you-think/)
* HD-2D: [Wikipedia](https://en.wikipedia.org/wiki/HD-2D), [Siliconera](https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/)
* Game feel: [Destructoid on Sakurai](https://destructoid.com/?p=341429), [Upcomer](https://upcomer.com/sakurai-starts-new-youtube-channel-sharing-game-development-secrets/), [infovore on screenshake](https://infovore.org/tag/feel/), [infil.net reaction times](https://ki.infil.net/reaction.html), [NVIDIA research](https://developer.nvidia.com/blog/predicting-how-images-influence-visual-reaction-speed/), [GMTK Cuphead bosses](https://amara.org/v/C3BEq)
* Assist modes: [Vice on Celeste](https://www.vice.com/en/article/d3w887/celeste-difficulty-assist-mode), [Game Accessibility Guidelines: Celeste](https://gameaccessibilityguidelines.com/celeste-assist-mode)

**Narrative precedents**
* Final Fantasy X: [Giant Bomb](https://giantbomb.com/wiki/Characters/Tidus), [Gfinity](https://www.gfinityesports.com/article/theres-never-a-bad-time-to-celebrate-final-fantasy-10s-beautifully-bittersweet-ending); Link's Awakening: [Zelda Universe](https://zeldauniverse.net/features/questioning-reality-the-story-of-links-awakening/), [Wikipedia](https://www.wikipedia.org/wiki/Koholint); Omori: [Wikipedia](https://Www.wikipedia.org/wiki/OMORI); Yume Nikki: [Wikipedia](https://en.wikipedia.org/wiki/Yume_Nikki)

**Market data**
* Steam volume and revenue: [Game World Observer](https://gameworldobserver.com/2025/12/22/indie-projects-generated-a-quarter-of-the-total-game-revenue-on-steam-by-the-end-of-2025-analytics), [ziva.sh (secondary)](https://ziva.sh/blogs/indie-game-revenue), [Steam Page Analyzer: median](https://www.steampageanalyzer.com/blog/median-steam-game-2026)
* Niches: [Steam Page Analyzer: Cozy](https://www.steampageanalyzer.com/niches/cozy), [Action Roguelike](https://www.steampageanalyzer.com/niches/action-roguelike), [OP Game Marketing: pixel art](https://opgamemarketing.substack.com/p/so-youre-making-a-pixel-art-game), [Destructoid on cozy](https://www.destructoid.com/this-genre-exploded-on-steam-in-2025-and-proves-were-still-resisting-our-grim-reality/)
* Next Fest dates: [Steamworks: Feb 2027](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/feb_2027), [PC Gamer: 2027 schedule](https://www.pcgamer.com/games/steam-reveals-all-the-sale-dates-and-themed-events-for-the-first-half-of-2027/), [Steam Page Analyzer: Oct 2026](https://www.steampageanalyzer.com/blog/steam-next-fest-october-2026)
* Name collisions: [Dreamy Quest RPG (itch.io)](https://clockworksociety.itch.io/dreamy-quest-rpg), [Dreamworld RPG (itch.io)](https://lef.itch.io), [One Dreamy Night (itch.io)](https://phoxphorus.itch.io/one-dreamy-night), [Siliconera: Next Fest RPG demos (Dream Tactics)](https://www.siliconera.com/best-steam-next-fest-2025-jrpg-and-rpg-demos/)
* Demos, Next Fest, wishlists: [howtomarketagame: demo median](https://howtomarketagame.com/2022/10/26/what-is-a-good-median-play-time-for-a-demo-benchmark/), [Steam Page Analyzer: demos](https://www.steampageanalyzer.com/blog/how-long-should-a-steam-demo-be), [Steam Page Analyzer: after Next Fest](https://www.steampageanalyzer.com/blog/after-steam-next-fest), [Alinea](https://alineaanalytics.substack.com/p/wishlist-to-buyer-conversions-for), [GameDiscoverCo](https://newsletter.gamediscover.co/p/steam-demo-showcases-officially-good), [presskit.gg](https://presskit.gg/field-guides/how-many-wishlists-to-launch), [Steam Page Analyzer: wishlists](https://www.steampageanalyzer.com/blog/how-many-wishlists-before-launch)
* Refunds: [Tom's Guide](https://www.tomsguide.com/gaming/steam-has-changed-its-policy-for-issuing-refunds-heres-what-you-should-know-before-playing-an-early-access-game), [Galaxus](https://www.galaxus.de/en/page/indie-dev-calls-on-steam-to-change-its-refund-policy-43238)
* Completion rates: [Galaxus](https://www.galaxus.fr/en/page/hardly-anyone-finishes-games-so-why-are-they-so-long-37002), [Two Average Gamers](https://www.twoaveragegamers.com/game-completion-rates/), [Notebookcheck: BG3](https://www.notebookcheck.net/Baldur-s-Gate-3-Despite-over-15-million-copies-sold-only-23-of-players-actually-played-it-to-completion.1126313.0.html)
* Languages: [WN Hub: Valve at Gamescom 2025](https://wnhub.io/news/stores-and-publishing/item-48667), [TechNode](https://technode.com/2024/03/05/simplified-chinese-overtakes-english-as-the-most-commonly-used-language-on-steam/); Steam Deck: [VoxBooster](https://voxbooster.com/blog/handheld-gaming-statistics-2026), [GamingOnLinux](https://www.gamingonlinux.com/2026/01/valve-amended-the-steam-survey-for-december-2025-linux-actually-hit-another-all-time-high/comment_id=287976)
* Early Access: [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-early-access-graduation), [WN Hub / GameDiscoverCo](https://wnhub.io/news/stores-and-publishing/item-49521), [Lin et al., EMSE 2017](https://sail.cs.queensu.ca/data/pdfs/EMSE2017_AnEmpiricalStudyOfEarlyAccessGamesOnTheSteamPlatform.pdf)
* Pricing: [game-wisdom](https://game-wisdom.com/?p=12103), [itch.io forum](https://itch.io/post/296900), [Bugnet](https://bugnet.io/blog/how-long-should-your-indie-game-be)
* Funding: [GamesBeat: Humble Games](https://gamesbeat.com/humble-games-layoffs-shut-down-ziff-davis/), [Aftermath](https://aftermath.site/humble-games-layoffs-closure-ziff-davis-ign), [GameDev Reports: Kickstarter](https://gamedevreports.substack.com/p/kickstarter-in-2025-and-before), [Shacknews: Apple Arcade](https://www.shacknews.com/article/138949/apple-arcade-uncertainty-mobile-games), [Game Developer: what publishers look for](https://www.gamedeveloper.com/business/publishing-103-what-publishers-look-for-in-games), [Wayline: pitching](https://www.wayline.io/blog/pitch-indie-game-publishers-steam-wishlist-campaign), [Steam Page Analyzer: marketing budget](https://www.steampageanalyzer.com/blog/indie-game-marketing-budget)
* Brazil: [Mercado & Consumo](https://mercadoeconsumo.com.br/27/01/2025/noticias/abragames-e-apexbrasil-renovam-parceria-para-apoiar-industria-brasileira-de-games/), [App Developer Magazine](https://appdevelopermagazine.com/brazil-games-and-apexbrasil-to-participate-in-gdc-2025/amp/), [Techloy](https://www.techloy.com/brazil-is-bringing-its-gaming-scene-to-tokyo-game-show-2025/), [Canaltech](https://canaltech.com.br/games/os-melhores-jogos-brasileiros-de-2021-205104/)
* Web portals and distribution: [CB Insights: Poki](https://www.cbinsights.com/company/poki), [Superjump](https://www.superjumpmagazine.com/what-pokis-100-million-monthly-gamers-reveal-about-the-future-of-browser-games/), [cinevva: Poki](https://app.cinevva.com/guides/publish-game-poki), [cinevva: CrazyGames](https://app.cinevva.com/guides/publish-game-crazygames), [Playgama](https://playgama.com/blog/?p=14181), [Archive Team: itch.io](https://wiki.archiveteam.org/index.php/Itch.io), [jslegenddev: wrappers](https://jslegenddev.substack.com/p/the-struggle-of-wrapping-a-javascript), [GDevelop forum: Tauri](https://forum.gdevelop.io/t/implementing-steam-achievements-with-tauri/73202), [Mozilla BrowserQuest](https://hacks.mozilla.org/2012/03/browserquest/), [Realm of the Mad God](https://en.wikipedia.org/wiki/Realm_of_the_Mad_God), [Flare engine](https://www.linuxlinks.com/flare), [Mindustry on Steam](https://www.gamingonlinux.com/2019/09/mindustry-the-factorio-like-tower-defense-game-is-now-on-steam/), [DiabloWeb](https://pcgamer.com/games/rpg/you-can-play-the-original-and-best-version-of-diablo-in-your-browser-again)
* Audience: [Quantic Foundry gamer types](https://quanticfoundry.com/gamer-types/), [Quantic Foundry insight report](https://quanticfoundry.com/insight-report/), [Ampere via GameDev Reports](https://gamedevreports.substack.com/p/ampere-analysis-most-players-still); capsule and title: [howtomarketagame](https://howtomarketagame.com/2022/07/18/how-do-you-get-streamers-to-cover-your-game-get-a-better-capsule/), [Wayline](https://www.wayline.io/learn/market-your-game/0)

**AI: market, legal, practice**
* Player sentiment: [Quantic Foundry](https://quanticfoundry.com/2025/12/18/gen-ai/), [Games Market](https://www.gamesmarket.global/quantic-foundry-most-gamers-are-negative-about-the-use-of-gen-ai-in-video-games), [letsdatascience](https://letsdatascience.com/news/gamers-push-back-against-ai-generated-game-content-020ccc28)
* Sales impact: [Notebookcheck](https://www.notebookcheck.net/Study-suggests-AI-is-hurting-video-game-sales.1328725.0.html), [Digital Citizen](https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/)
* Events: [AV Club: Clair Obscur IGA](https://www.avclub.com/clair-obscur-genai-iga-awards-rescinded), [Push Square](https://www.pushsquare.com/news/2025/12/ps5-fave-expedition-33-stripped-of-indie-game-awards-but-not-for-the-reasons-you-may-think), [Everything Edinburgh: Vapor World](https://everythingedinburgh.com/games/news/vapor-world-steam-ai-cutscene-backlash/)
* Industry: [GDC 2026 State of the Industry](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/), [BusinessWire](https://www.businesswire.com/news/home/20260129438528/en/2026-State-of-the-Game-Industry-Report-Reveals-Widening-Effect-of-Layoffs-Broader-Perspectives-on-Generative-AI-Unionization-Tariffs-and-More)
* Steam disclosure: [VGC](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use), [Game Developer](https://gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam)
* Copyright: [Mintz](https://www.mintz.com/insights-center/viewpoints/54731/2025-02-07-us-copyright-office-publishes-second-part-report-ai), [Crowell](https://www.crowell.com/en/insights/client-alerts/us-copyright-office-releases-part-2-of-artificial-intelligence-report-clarifying-copyrightability-of-generative-ai-outputs), [Akin Gump](https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/us-copyright-office-releases-part-2-of-ai-report)
* AI building games and code quality: [GameCraft-Bench (arXiv 2606.17861)](https://arxiv.org/pdf/2606.17861), [AI Weekly](https://aiweekly.co/alerts/claude-code-tops-ai-game-building-benchmark-at-41), [METR via eWeek](https://eweek.com/news/news-ai-tools-slow-developer-productivity-study), [The Decoder](https://the-decoder.com/ai-coding-can-make-developers-slower-even-if-they-feel-faster/), [GitClear coverage (i-programmer)](https://www.i-programmer.info/news/105-artificial-intelligence/17871-gitclear-reveals-ais-negative-impact-on-code-quality.html), [Production Alchemist: 49-agent studios](https://www.productionalchemist.com/p/claude-code-game-studios-49-agents), [cinevva: solo devs shipping with AI](https://app.cinevva.com/news/2026-03-22-solo-devs-shipping-games-with-ai)

**Legal, privacy, platform**
* Unlicensed code: [InfoWorld](https://www.infoworld.com/article/2615869/github-needs-to-take-open-source-seriously.html), [romkey.com](https://romkey.com/2018/07/24/please-license-your-code); Lumina repository checked: [gitlab.com/stubborn-hug/lumina](https://gitlab.com/stubborn-hug/lumina)
* Privacy: [Fieldfisher: Spanish and Belgian GDPR guidance for games](https://www.fieldfisher.com/en/insights/spanish-and-belgian-gdpr-guidance-for-the-video-game-industry), [CLM Controller: LGPD in games](https://clmcontroller.com.br/en/management/lgpd-in-online-gaming-companies-avoid-fines-by-following-data-regulations/)
* Safari storage: [Didomi](https://docs.didomi.io/releases-and-announcements/announcements/apple-implements-7-day-cap-on-script-writable-storage), [WebKit Bugzilla](https://bugs.webkit.org/show_bug.cgi?id=237350), [The Register](https://www.theregister.com/2020/03/26/apple_relax_were_not_totally/)
* `file://` origins: [Chromium code review](https://codereview.chromium.org/1140203002/), [Blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/--KjSROtcMQ/m/C7Ce13NRnRgJ)
* WebGPU: [web.dev](https://web.dev/blog/webgpu-supported-major-browsers), [App Developer Magazine](https://appdevelopermagazine.com/webgpu-in-ios-26/amp/), [cinevva](https://app.cinevva.com/guides/webgpu-vs-webgl-games); Canvas vs WebGL: [W3C list](https://lists.w3.org/Archives/Public/public-whatwg-archive/2014Aug/0038.html), [html5gamedevs](https://www.html5gamedevs.com/topic/16584-game-engine-stress-test-and-performance), [js-game-rendering-benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark)

**Process, documentation, play-testing, accessibility, audio**
* Play-testing: [Game Developer: how many players](https://gamedeveloper.com/design/how-many-players-should-you-playtest-with-), [VGM: first-hour drop-off](https://vgm.co/blog/what-your-day-30-drop-off-is-actually-telling-you-about-your-game-s-first-hour)
* Design documents: [Game Developer: one-page designs (Librande)](https://gamedeveloper.com/design/video-one-page-designs), [MCV: death of the GDD](https://www.mcvuk.com/development-news/death-of-the-game-design-document/), [Bugnet](https://bugnet.io/blog/how-to-write-a-game-design-document-people-read)
* Scope practice: [Wayline](https://www.wayline.io/blog/scope-creep-indie-games-avoiding-development-hell)
* Accessibility: [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/), [Can I Play That](https://caniplaythat.com/?p=8897)
* Pixel-art readability: [Wayline lesson](https://www.wayline.io/learn/pixel-art/4)
* Audio tooling: [ZzFXM](https://keithclark.co.uk/articles/zzfxm/), [zzfx on npm](https://npmjs.com/package/zzfx)
