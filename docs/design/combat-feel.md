# Combat feel: hitlag, fling, Echo, Hush

Terms: [../GLOSSARY.md](../GLOSSARY.md). Skills: [weapons-and-skills.md](weapons-and-skills.md). Wind and world time: [wind.md](wind.md).

## Hitlag
Computed in `damageEnemy` with `r = dmg / e.maxHp` (the phase bar's max) and weight `w` (basic 1.0, heavy 1.5, ultimate 2.0).
* Target-only freeze: `clamp(round((2 + 6r) * w), 2, 8)` steps.
* Global freeze rows: crit 3, kill 3, r >= 0.25 gives 4, r >= 0.5 or an ultimate gives 6, boss BREAK 8.
* Budget: 12 steps per rolling 0.5 s; over budget becomes target-only.
* AoE: one global freeze per cast. DoT never hitlags. Freeze counts unscaled steps, before slow-mo.
* Setting: Off / Light / Full. Companion signals stay on in every setting:
  damage-number size, flash, knockback x(0.7 + 0.6r), particles 5 + 8r, a lower hit-sound pitch.
* Victim jitter +-1 px.

## Death fling (not physics)
* Corpse pool 8 on phone, 12 on desktop. The body arcs, bounces once, squashes, dissolves into motes. Sprites are never rotated.
  Loot and XP are immediate.
* Exceptions: DoT kills slump; swarm members squash-pop; bosses hold a death pose and dissolve in stages, no fling.
* Tumble: a non-boss hit with r >= 0.3 adds knockback x1.5, a 0.3 s stun and a visual hop (draw offset only, never `e.z`).
* Not used: verlet bodies, gibs, sprite rotation, boss fling, camera zoom punch, slow-mo on ordinary kills, additive hitstop.

## Standing rules
* No lock-on: free aim, melee magnet only. No tilt-shift. Named moods per section or vantage; no running clock, rain or snow.
* Stamina at 0 is "winded": the action fires, recovery x1.35; it is never refused.
* Attack tokens: melee 3, ranged 2. Input buffer and cancel windows. Poise and rear crits. Perfect dodge.
* Global telegraph grammar and pickups v2. Pixel-FX atlas: slash, fire burst and frost hit are approved prototypes.

## Echo (Twice-Told, rule `echo`)
* Records `{skillId, aimRel}` for the hand action and the Q spell only.
* The clone is an after-image 0.4 s behind (24-frame ring buffer). It replays 0.4 s later with `src:'echo'`. Queue 4; fades after 2 s idle.
* Damage = original final x 0.4, retyped to the hero's highest-amplified magic element (arcane default; wind excluded;
  no wind status; status build x0.5).
* Never the ultimate, pages or offhand. No MP on hit, ultimate charge 50%. No on-hit procs (chain guard). Not a summon.
* Hitlag target-only at most 2 steps; half particles.
* Visual: tinted cached hero at alpha ~0.5, additive. Drops late (Act III on). Runs on world time under Hush. Never stacks with Pip's Lantern.
* Balance gate: an element-focused build gains 25 to 30% DPS, an unfocused one at most 15%.

## Hush (The Stopped Hour, rule `stillhour`)
A Legendary weapon unique rolled on the finder's own weapon variant. The rule replaces that item's spell with Hush
(Q in HAND, E in OFFHAND). Drops once, on a boss-class kill at level 13 or higher, never on the same kill as Twice-Told.
* Toggle: starts for 30 MP, drains 60 MP per real second. Ends on a second press, 0 MP, hero death, boss-death slow-mo
  or a map change. Cooldown 3 s.
* While active: no MP from hits, ultimate charge x0.5, MP regen stops. Hero damage x0.6.
* `G.timeScale` 0.25 and `sdt = dt * worldScale(entity)`. Elites x0.375, bosses x0.5.
  Boss phase transitions and invulnerable windows ignore Hush. Dreamveil with Hush uses the slower value (min), not the product.
* World time: enemies, projectiles (the hero's too, once they leave the hand), enemy knockback, wind field,
  particles and ELFX, world animations, status durations, DoT and reactions.
* Real time: hero movement, attacks, dodges and cooldowns, input, HUD, camera, hero knockback, hitlag, the Hush drain.
* Feel: 0.15 s ease; world desaturated 40% with a cool tint; SFX at half rate; music low-passed at 800 Hz; 1 Hz heartbeat;
  MP bar shimmer. Phone: tint only. See [audio.md](audio.md).
* Engineering: every real-time timer is audited. Saves never store Hush as active. Pause freezes both clocks.
* Balance gate: at most +20% boss-fight DPS in balsim.
* Tests (`js-final:tools/play.js`): enemy 0.25x, elite 0.375x, boss 0.5x, hero unchanged; MP -30 then -60/s, ends at 0 MP, cooldown 3 s;
  a hero projectile slows once it leaves the hand; Dreamveil + Hush = 0.25, not 0.0875; a wind phase and a DoT tick advance
  at 0.25x; boss-death slow-mo ends Hush.
