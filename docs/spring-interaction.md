# Spring interaction (type `$26` and terrain springs)

Research: `docs/spring-interaction-audit.md` (198b959). Mirror: `POC_notes/rom-cache/spring-interaction.json` (`verification/make_spring_data.py`).
Checks: `node verification/verify_spring_interaction.js` (Research grids replayed through the POC terrain pipeline + the shipped type `$26` step).

**Audit result (before editing)** - terrain springs already matched Research: all 110,592 upright/diagonal and 57,096 horizontal grid cells reproduce with 0 mismatches.
Mismatches found and fixed:

| Area | Old POC | Now |
|---|---|---|
| `$26` fixed X | `abs(dx) <= 12` (inclusive) | `abs(dx) < 12` |
| `$26` coordinates | float GameMaker foot position | canonical integer anchors (`floor(xu/256)`, `floor(yu/256)`), object rest Y = placement Y + 12 |
| `$26` floor flag | not required | `$D522` bit 1 (`bg & 2`) required |
| `$26` span | fixed 6-row window around `playerX & $FFF0`, immediate launch | `X0 <= px < X0 + span` and `abs(Y - py) < $30`; state 9 on the next update launches without re-testing gates |
| `$D448` | not stored | stored on the core (strong `$FF`, weak 0, diagonal 0, upright terrain `$FF`); presentation only, no gameplay meaning |
| diagonal | sound only after the Y gate | vx, facing bit, `$D448 = 0` and sound written before the Y-speed gate |
| terrain springs in loop/twist/act-clear | evaluated in `$20` (shared terrain pass) | inert in states `$0C/$0D/$13/$22/$20` (`SCR_cc_terrain_spring_state`) |
| attack posture | only the legacy `global.playerJump` (`move & 3`) approximation | additionally `global.chaosAttackPosture` / `chaosAttack` = ROM `$D503` bit 1 (`move & 2`) |

Unchanged and verified: strong/weak launches (-7.375 / -5.0), 42 / 20 update lockout, upright terrain `-7.5` (attack clear), THZ diagonal `+-4.0 / -7.0` (attack set), horizontal `+-6.0`
with cap `$0600` and no Y/floor gate (attack set), state `$11` blocks all terrain springs, requested state `$21` blocks type `$26`.

Deliberate deviations: type `$26` is not evaluated while the GameMaker loop adapter owns the player (`chaosLoopActive`; the ROM would still fire); spring objects are persistent
instances, so the "object awake" gate is unobservable (a player within the contact window is always inside the awake band); `$D448` is stored but the shadow animation counter still
receives 0 (parity-faithful, see `docs/terrain-ring-probe.md`); `global.playerJump` still drives the legacy badnik code (a later badnik audit should read `chaosAttackPosture`).

**Top-of-screen death** (proven by the Windows diagnostic: `core raw 65535 -> signed -1 -> instance y 65540 -> controls_restart`, `wrap 1`): fixed narrowly.
The POC core keeps Y as an unsigned 24-bit value, so crossing world Y 0 published ~65535 and the POC death tests (`y > room_height`, restart backstop `y > room_height + 32`) fired,
while the ROM test is signed. Now: `SCR_chaos_core_publish` publishes the SIGNED Y (`chaos_signed_yu`), and `SCR_chaos_sample_damage` applies the recovered rule
`signed anchor Y - camera Y >= $D0` (`chaos_vertical_death`, independent of room height and view width). No clamp at world Y 0; spring launches untouched. Checks:
`node verification/verify_death_boundary.js`. The temporary on-screen diagnostic used to prove the cause has been removed.
