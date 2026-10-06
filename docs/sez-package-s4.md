# SEZ S4 enemies `$20` and `$23` — Windows acceptance pending

Research canonical `8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c` (`research: close SEZ enemy types 20 and 23 runtime contracts`),
contract `data/rom-cache/sez/enemies-20-23-runtime.json` (mirrored byte for byte at `POC_notes/rom-cache/sez/`).
Accepted POC base `914a9d5b20fa1edd4d7fafab4a9d575f84709507` (SEZ S3). Work is deliberately **uncommitted**.

Scope: the 15 natural mapped placements — seven `$20` and eight `$23` — from the canonical SEZ rows (no hand-authored placements). Boss `$54/$55`, the monitor repair, the three parked
Spring Shoes / box / fall-state observations, slope/facing presentation and results are untouched. No new art was authored: the approved `$20`/`$23` compositions of the SEZ art package
are imported by the existing importer (`SPR_chaos_sez_enemy_20` = bit4=1, `SPR_chaos_sez_enemy_20_conv` = the unmirrored conversion frame, `SPR_chaos_sez_enemy_23`).

## Implementation (`SCR_chaos_sez_enemy`, struct records driven from `SCR_chaos_objects_phase`)

| Subject | Kind |
|---|---|
| one record per canonical row; placement scan, creator sleep bit, state-0 initialiser at N+1, active script at N+2 (`$20` still sees the creator sleep bit and first moves/tests contact at N+3, `$23` at N+2) | ROM behaviour |
| `$20`: init vx −0.5 / vy +2 / counter 128 / request 3; walking callback: sleep gate → shared contact (ends the callback) → counter −1 (zero: hop, vy −3, no move) → terrain probe `(X∓4, Y+10)` block `$47/$F6/$F7` (same hop, counter kept) → move → object floor; no ledge turn; parameter never read | ROM behaviour |
| `$20` hop: sleep gate → **move → contact** → gravity +0.125 → landing only when the updated signed Y speed ≥ 0 and block-header bit 6/7 at `(X, Y+18)`; landing requests 3, counter 128, vy +2, no projection | ROM behaviour |
| `$23`: init/relaunch vx −1 / vy −2, no facing change; leap: contact → move → gravity +0.0625 → flag-only landing gate → request rest, `+$1E := $40`, floor projection in the same callback; rest = 12 × frame 2, 4 × frame 1, 6 × frame 2 contact callbacks (22), then one relaunch callback; the cycle length comes only from terrain (flat natural floor: 65 + 22 + 1 = 88) | ROM behaviour |
| `$23` never gates on sleep; `$20` callback pauses asleep while its animation keeps advancing; wake does not reinitialise | ROM behaviour |
| object floor `$77CB/$70E7`: shared profile projection with the object's **+7** one-way penetration limit (the player's is +9), upper-cell correction, surface `$0E` handler (±256 X; no SEZ block uses it) | ROM behaviour |
| contact: shared `$6328 → $5F3D → $48BC` helpers with frame-dependent extents (`$20` 7×20; `$23` frame 1 9×26, frame 2 7×20); attack bit 1 or selector 6 defeats, airborne alone does not, hurt bit 6 suppresses, blink keeps defeat eligibility; no enemy-specific damage | ROM behaviour (shared) |
| defeat: immediate conversion (accepted shared `$0F` smoke object with the SEZ poof), +10 and the `10 00 00` BCD bytes, the inherited last frame drawn once unmirrored for `$20`, placement occupancy **retained** (never recreates until the act restarts) | ROM behaviour + accepted shared presentation |
| ordinary lifecycle deletion (generic bands visible `[0,256)`, awake `[-32,288)`, lifetime `[-96,352)`, both axes) releases occupancy two passes later; recreation is fresh at the canonical anchor | ROM behaviour; the accepted post-wake horizontal retention adapter is reused (`SCR_chaos_lifetime_cell`), vertical bands canonical |

## Verification

`verification/run_sez_s4_checks.py` — see `build/sez-s4/package-report.json` for the final totals.

* **S4 oracle suite** (`verify_sez_s4.js`, shipped GML): the 15 controlled 420-update traces (every recorded row: state, requested state, frame, anchor, fractions, speeds, counter, extent);
  **all 15 natural placements** through the real loader, placement scan and object phase against the Research whole-game transitions (every transition row incl. fractions/timers) and
  per-update vectors (frame and extent); timer sweep 0..255, the three terrain-trigger blocks, early hop with the counter kept, gravity/landing boundary vectors (±1), the 256-block flag-only landing table,
  animation cadence/extents, sleep, all 256 parameter bytes replayed 180 updates each, **the all-block × 32-foot-row floor oracle for every block of the three acts**, surface-`$0E` handler,
  60 contact vectors per extent set plus the closed normal/state-`$0F` boxes, 64 reactions per set (attack / selector 6 / bit 6 / blink / airborne, defeat → `$0F`, +10, retained occupancy),
  64 lifecycle vectors, retention adapter at 256/348/640, first-active-update difference; real-adapter scenes (attack defeat, non-attack damage with ring scatter, selector-6 defeat, hurt-state immunity,
  defeated non-recreation, ordinary delete → fresh recreation).
* S1/S2/S3 suites, the accepted THZ/GPZ/MGHZ inventory, asset suites (S1 backdrop + S4 approved enemy art), Research tests (foundation, surfaces, platform-28, enemies-20-23), GML lint, `git diff --check`.

## S2 allocator integration finding (reported, no fix)

`verification/explore_sez_s4_pool.js` runs the natural SEZ1 six-cell crumble bridge (62..67,14) at 2..7 px/update. It compares the shard count per crumble group in the S2-only pool with the same run
where the live `$20/$23` records are also charged to the shared 7..17 slots, as ROM placed objects would be:

| speed px/update | S2-only groups | with live enemies charged |
|---|---|---|
| 2, 3 | 4 4 4 4 4 4 | identical |
| 4 | 4 4 4 4 4 4 | 4 4 **3** 4 **3** 4 |
| 5 | 4 4 3 2 4 4 4 4 | 4 4 **2 2** 4 4 4 4 |
| 6 | 4 4 3 4 4 3 4 4 | 4 4 **2** 4 4 **2** 4 4 |
| 7 | 4 4 4 4 4 4 4 4 | 4 4 **3** 4 4 **3** 4 4 |

A natural case exists: at ≥ 4 px/update the pool is tight even without enemies (the S2 trace at 3 px/update is exact), and two live enemies near the bridge change how many shards some groups get. The effect is cosmetic
(fewer falling shard particles; no collision, no timing of the break, hold or `$B0` write). The shipped runtime keeps the documented S2 occupancy model — **the enemies are not charged to the crumble pool**, so the POC can show more
shards than the ROM would at those speeds. Whether to bridge placed-object occupancy into the pool is left for Manager/Research decision before any change.

## Notes / limits

* Natural traces replay exactly with the camera and player parked as the Research fixture describes; real play adds contact, sleep and retention, which are verified separately.
* The conversion frame and smoke use the accepted shared `$0F` object with the SEZ poof art (the audit lists conversion presentation as downstream acceptance).
* Enemy contact runs against the single player core; there is no multi-object scheduler order beyond ascending row order.
* Sound requests (`$C4` smoke, `$A4`/`$96` damage) follow the existing shared paths; audio mapping is unchanged.

## Compile status

Standalone Igor loads and links the project, then stops at `GMAssetCompiler.dll` (status −1) before GML compilation (as M2–M4, S1–S3). GameMaker IDE compile/launch of the source and extracted package remains James's gate.

## Suggested Windows pass

1. SEZ1 (1232,142) and SEZ2 (1616,78): the first `$20` hops early on the `$47` block; the others hop on the 128-callback counter. They walk left only, never turn at ledges, and keep their animation when you scroll them off-screen while their movement pauses.
2. Every `$20`: a spin/jump attack defeats it (+10, smoke), a plain touch hurts you; invincibility defeats it; back-tracking does not bring a defeated one back, but one that scrolled away un-defeated returns at its start point.
3. `$23` leapers (SEZ1 (1760,430), (2112,430), (2576,142), (2800,430); SEZ2 (2192,750), (2256,494), (2704,206), (2704,430)): they leap left, rest, relaunch; the hitbox is larger while the tall frame shows; they keep cycling while off-screen.
4. SEZ1 crumble bridge (62..67,14) with the `$23` at (2112,430) beside it: shard counts may differ slightly from the original at ≥ 4 px/update (reported above).

## Windows acceptance

Accepted; no new gameplay or presentation issues observed. The documented allocator limitation is preserved exactly as reported above (live `$20/$23` objects can reduce canonical crumble-shard
allocation in the original shared slot pool, so the POC may show extra cosmetic shards; collision, crumble timing, hold and `$B0` replacement are unaffected). No per-enemy count adjustment was added.
