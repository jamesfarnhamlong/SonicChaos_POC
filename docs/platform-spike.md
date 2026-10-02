# Platform and spike fidelity (type `$28`, terrain one-way `$0D`, static spikes `$3C/$3D`, moving spike `$1B`)

Research: `docs/platform-spike-collision-audit.md` (54cbd3a). Mirror: `POC_notes/rom-cache/platform-spike-collision.json` (`verification/make_platform_spike_data.py`).
Checks: `node verification/verify_platform_spike.js` (shipped GML through the real adapter against the Research cache). Old-POC replay: `docs/platform-spike-replay.md`
(`node verification/replay_legacy_platform_spike.js`, executes the accepted checkpoint `7799c34` from git).

## Identity (canonical)

| Thing | Meaning |
|---|---|
| object type `$28` | THZ **platform** (support / carry; no damage anywhere in its code) |
| object type `$1B` | **moving (retracting) spike** |
| terrain type 5, blocks `$3C/$3D` (flags `$85`) | **static spikes** (no object) |

No POC document, test or identifier called `$28` a spike. Canonical placements are byte-identical (checked against `HEAD` and the Research cache).

## What the old POC did (replayed, not assumed)

The accepted checkpoint was run through its real adapter with GameMaker mocked at the instance / camera boundary only (`verification/chaos_world_harness.js`) and measured against the
Research rows: **24 of 61 oracle checks pass on the old POC** (platform 10/28, static spike 10/15, terrain one-way 2/2, damage 0/2, moving spike 2/14; full table in `docs/platform-spike-replay.md`).
The terrain code was already right; the object code and the damage consequences were not.

| Area | Old POC (measured) | ROM / now |
|---|---|---|
| `$28` support region | mask bbox: rows `dy -19..-17` only, `dx` about +-22..19 (rectangle) | triangle `dy -16..-1`, `abs(dx) <= 8 + abs(dy)` |
| `$28` rider height | `platformY - 19` | `platformY - 14` |
| `$28` Y speed | zeroed on landing | retained (the next gate sees it) |
| `$28` speed gate | `vy >= 0` for every platform | `platformVy <= playerVy` (lift up: `>= -1.0`, lift down: `>= +1.0`, sag: `>= 0`) |
| update order | platform advanced at Begin Step, before the player | player pass -> object update -> move -> contact -> carry |
| sag platform | sinks one update after the claim; landing registered in the claim update | sinks in the claim update (test at the pre-sag Y, carry at the post-sag Y); landing registered by the next player pass |
| step off / reversal / retained-speed-0 reclaim | different by the 5 px height and the update order | Research rows reproduced exactly |
| `$28` jump detach, top-only, THZ1/THZ2 lift periods, sag 1..8,8,7..0 | **already matched** (locked, not rewritten) | same |
| terrain one-way `$0D` | **already matched** (36 combinations, 1,692 rows; no side / ceiling push) | same, locked |
| static spike foot / side / ceiling probes, previous-surface and floor-flag bookkeeping, the rising band | **already matched** (82,080 foot cells, side / ceiling grids, band rows) | same, locked |
| static spike `$3C` (THZ2, two cells) | side probe treated as an unsupported special tile (no wall) | wall identical to `$3D` |
| invulnerability gate of the static spike | read `+$04` bit 7 (never set) - effectively absent | `+$03` bit 7 (`move & 128`) |
| hurt consequences | X speed +-1.125 from facing, 30-update lock, 90-update blink | X speed -1.0 (+1.0 with a left wall), Y -4.0, lock until landing, 120-update invulnerability |
| `$1B` | bbox overlap (any side, below, rising), post-move, no cooldown, no push / wall; a walker or roller that touches the side is hurt and knocked back (X speed -1.125) | cone, rising gate, pre-move test, cooldown 16, push +-23, wall, request one update before the hurt |
| `$1B` 102-update cycle (3 / 48 / 3 / 48, 6 px steps) | **already matched** (only the ROM's state-0 init update before the first rise was missing) | same |

### Static-spike "diagonal phasing"
The recovered terrain model needs no change. The foot table, the side / ceiling probes and the previous-surface / floor-flag lifetime in `SCR_cc_floor` already reproduce Research cell for
cell (E1-E4). What the ROM does is deterministic: a **rising** player (Y speed < 0) in the 12-pixel band (anchor Y 830..841) is neither projected, damaged nor pushed; a first foot sample inside the
block with previous surface = air does nothing (one-update lag); everything else hurts or is walled. That band is locked by tests and must not be "fixed". The only mismatches in the old
spike path were the ones in the table above (wrong invulnerability byte, `$3C`, hurt consequences / timings). Ten Research E1/E2 teleport examples were replayed on the real layout: the four
whose start speed exceeds the walking maximum reproduce exactly; the other six depend on first-update speed bookkeeping the cache does not record (diagnostic K2, **unresolved**).

## Implementation

| File | Role |
|---|---|
| `scripts/SCR_chaos_platform/SCR_chaos_platform.gml` | type `$28`: triangle (`SCR_chaos_box_contact` = `$6328`, bit 1 only), gate, claim / release of `$D3C0` (`core.support`), sag, carry |
| `scripts/SCR_chaos_spike1b/SCR_chaos_spike1b.gml` | type `$1B`: cycle, `$ACFD` contact, cooldown, push, wall flags |
| `scripts/SCR_chaos_objects/SCR_chaos_objects.gml` | object phase: platforms then spikes, GameMaker mirror of the owner, publish |
| `objects/OBJ_chaos_zone/Step_2.gml` | runs the object phase at End Step, after the player's Step and before the camera follows the player |
| `scripts/SCR_chaos_core/SCR_chaos_core.gml` | foot handler `$6ACE` (+`$03` bit 7 gate, direct hurt), `$3C/$3D` side wall, `SCR_cc_hurt_rom` (`$48F7`), `SCR_cc_damage_gate` (`$48BC`), hurt-until-landing |
| `scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml` | removed the mask-based platform landing / zeroing; ring / immunity inputs; two-stage wall pipeline; damage gate; GameMaker side of a recovered hurt |
| `scripts/SCR_chaos_motion/SCR_chaos_motion.gml` | removed the platform advance / landing prediction (loop code untouched) |
| `objects/OBJ_chaos_platform`, `OBJ_chaos_spikes` | Create events configure the new fields; the spike object has no own update; the platform art is drawn at anchor + 2 (presentation only) |

* **Order.** Player update (including terrain and the static-spike hurt) -> `$48BC` damage gate -> objects in slot order. Lifts test after moving, sag platforms before sinking; carry sets
  rider Y = platform Y - 14 (fraction kept) and adds the platform X delta (0 for every THZ placement); no speed is touched.
* **`$28`.** Parameter `$0A` = state 11 lift (1 px/update, first leg up, reversal period `16 * aux1`: 144 / 208 in THZ1, 400 / 304 in THZ2); `$84` = state 5 weight sag. Other ROM states are
  not placed in THZ and are not guessed. Top-only: nothing pushes Sonic from the side or from below.
* **`$1B`.** Contact is `$6328` (Sonic 8x24 vs 16x24): the cone is the "player above" bit; Y speed `>= 0`; cooldown 16 (counted only in states 1 / 2); request `$FF` + bounce -4.0 one update
  before the hurt; grounded attacker pushed to X +-23 (requested state 1, X speed 0); a walker gets the wall flag, which reaches the X integration two updates later (Research: it stops two
  updates after the contact). The helper does not read invulnerability; `$48BC` rejects the request.
* **Damage.** Terrain hazards call `$48F7` directly (after the `+$03` bit 7 test); objects go through the `$48BC` gate. Invulnerability counts 119..0 once per gate call and clears on the
  121st; the static spike can hurt again in the first update without it. `$48F7` consequences are implemented in the core; the GameMaker side (global rings, scatter object, death object,
  blink mirror) is `SCR_chaos_hurt_apply`.
* **Attack posture.** `$1B` reads only the canonical attack bit (`move & 2` = `$D503` bit 1, the same bit as `global.chaosAttackPosture`). No enemy consumer of `global.playerJump` was touched.

## Scope decisions / deliberate adapters

* The recovered hurt (`$48F7`) and gate (`$48BC`) now serve every researched THZ source: static spikes, `$1B`, type `$27` / `$21` contact and the sample badnik contact (see `docs/attack-posture.md`). Only `OBJ_collision_death` still calls the legacy `SCR_chaos_apply_hazard_damage` (a sample-engine pit/death helper, not a researched THZ object).
* Death keeps the sample engine's death object (the ROM state `$1F` request and Y speed -5.0 are produced and tested in the core).
* While the GameMaker loop adapter owns the player no platform / spike contact is evaluated (the ROM would still test it).
* `$1B` activation stays the POC's camera band (`x` within the view +-64) and, once active, the spike always runs; the ROM's sleep / delete lifecycle for this type and the lift removal
  (`+$04` bit 1, 640 / 672 px) are not audited and not modelled. A new `$1B` runs its state-0 init update before the first rise.
* Presentation: the platform art is drawn 2 px below its anchor (Research: first opaque row = anchor + 2). Collision never uses it.

## Unresolved

* Lifecycle of `$28` / `$1B` objects (creation phase, sleeping, deletion) and therefore the absolute cycle phase when Sonic arrives.
* Side-wall behaviour during the `$1B` cooldown (the helper is skipped; the wall flags are therefore assumed absent), and the push direction for a *below* contact of a grounded attacker (-23 assumed).
* First-update speed bookkeeping of the Research teleport examples with start speed below the walking maximum (K2).
* `$28` platform art offset +2 and the visual overlap with Sonic have not been compared on Windows.
