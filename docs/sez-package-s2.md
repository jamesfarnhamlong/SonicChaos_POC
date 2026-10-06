# SEZ S2 terrain mechanics — Windows acceptance pending

Research canonical main `6e169d78f0918c74db4f12d89e410dc50423e3e8`
(`research: audit SEZ crumble ledge (surface 0C / type 13) and booster pad (surface 1A)`).
Accepted POC base `00e893353bca78a1bd945132711a388b33da88f5` (SEZ S1R). Work is deliberately **uncommitted**.

Scope is exactly the two contracts in `data/rom-cache/sez/surface-runtime-contracts.json`
(mirrored at `POC_notes/rom-cache/sez/`, together with `surfaces-0c-1a.json`):

* surface `$0C` / block `$AF` / dynamic type `$13` — crumble ledge
* surface `$1A` / block `$A7` — booster pad, plus effect-5 tile `$158`

Out of scope and untouched: `$28/$86`, `$28/$04`, `$20/$23`, boss `$54/$55`, the shared monitor repair and the parked
slope/jump/fall/facing presentation issues. THZ/GPZ/MGHZ behaviour is unchanged (every hook is zone-2 gated).

## What was implemented

Source facts vs adapters are kept apart (labels from the Research audit).

| Subject | Where | Kind |
|---|---|---|
| `$6B79` floor handler, dispatched by the **floor pass** on the foot sample (anchor X, Y+18, +8 state `$12`, −14 `$21`) | `SCR_cc_floor` → `SCR_cc_crumble_floor` | ROM behaviour |
| rising player: nothing at all; otherwise Y speed := 0 on **every** call; remembered cell `$D356`; spawn once per distinct cell; remembered even when the spawn failed | `SCR_cc_crumble_floor`, `global.chaosS2.remembered` | ROM behaviour |
| parent = first free slot of 0..15 (silent no-op when full); shards = script command 4, first free slots 7..17, only the first *k* shards when *k* are free, a child below its parent starts one update later | `chaos_s2_spawn_parent`, `chaos_s2_spawn_children`, scheduler order slots 0..18 | ROM behaviour on an occupancy model (see limits) |
| timeline from spawn update `T`: hold `T+1..T+16`, `$B0` at `T+17`, sound `$A3` + 4 shards + removal at `T+18`, first shard moves `T+22/27/24/20`, `y_k = y0 + k(k+3)` | `chaos_s2_step13` | ROM behaviour |
| rider hold `$A344`: **no presence test**, player state `$0E` or jump latch clear, Y := object Y − 40 (= cell top − 16), Y speed := 0, fraction kept — the walk-off hover is preserved | `chaos_s2_rider_hold` | ROM behaviour (not "fixed") |
| break `$A36A`: cell := `$B0` through the layout the terrain reads, unless asleep or `objectX < cameraX` (strict) → object removed, `$AF` stays and stays remembered | `chaos_s2_break`, `chaos_s2_replace_cell` | ROM behaviour; camera test = `EDGE(LEFT,0)` of the live view |
| layout persists until act restart (`chaos_level_install_layout` reloads `$AF`, clears `$D356` and the pool) | `SCR_chaos_level` | ROM behaviour |
| shards: no contact, no damage (source-locked: the S2 runtime contains no contact/damage/attack path) | `verify_sez_s2.js` §8 | ROM behaviour |
| generic lifetime of parent/shards | `chaos_vp_retained_cell` (accepted horizontal retention `max(0,width−256)`, vertical bands canonical); width 256 is checked against Research's decoded 32×32 class table | **GameMaker adapter** (candidate named in the contract) |
| `$A7` booster dispatched only from the terrain-ring probe `$753E` (anchor Y−8 / +2 by the `+$07` counter parity the adapter already shadows), last step of the terrain pass, before state-callback post-processing | `SCR_cc_terrain_probe` (core shim) → `chaos_sez_terrain_probe` → `SCR_cc_booster_probe` | ROM behaviour |
| effect needs floor flag: X speed and max X speed = +7.0, `+$03 := (+$03 \| 2) & $FE`, requested state `$10`, sound request `$BD`; Y speed, facing, position, floor flags untouched; fixed rightward; re-fires every update | `SCR_cc_booster_probe`, `chaos_sez_booster_post` | ROM behaviour |
| Rocket Shoes: the pad replaces `$11` by `$10`, selector/timer left set; Spring Shoes: replaced by a shared handler → accepted owner event 5 | core state-`$11` tick (`booster == 0` guard), `SCR_cc_state18_tick` unchanged | ROM behaviour (Spring Shoes end to end on a pad has no natural SEZ route: Research-UNRESOLVED) |
| effect 5: tile `$158` alternates every 3 effect calls, first `$8DFD`, paused while boss-active (`global.chaosSezBossActive`, wired; no SEZ boss until S5) | `chaos_sez_effect_step`, zone Step_2 | ROM behaviour (S1 helper, pause now wired) |
| art: baked backdrop shows `$B0` (blank) at every `$AF` cell; the intact `$AF` art is drawn from the block atlas while the layout holds `$AF`; shards use the accepted shard art (type `$13` frame 15 is the same mapping record as `$07` frame 15) | `generate_sez_foundation.py`, `chaos_sez_terrain_dynamic`, `chaos_s2_draw` | presentation |

`$B0` (flags `$00`, vertical 0, horizontal `$40`, both planes) is emitted by the importer from the Research static block-header table; its
mapping (16 × blank tile 192) and empty pixels are re-checked against the ROM.

Importer order: `generate_sez_foundation.py` (now pinned to `6e169d7`, refuses a Research working tree that differs from canonical `main`) then
`generate_sez_s2.py` (mirrors the contract byte for byte from `main`, asserts every identity/timing/hash, writes `SCR_chaos_sez_s2_data`, registers the scripts).
Both are idempotent: re-running leaves the tree unchanged.

## Verification

All numbers from `verification/run_sez_s2_checks.py` (46/46 commands) — see "Compile status" for what was *not* verified.

* **S2 shipped-GML oracle suite — 503,484 assertions** (`verify_sez_s2.js`)
  * Research table vectors executed against the shipped functions: `$6B79` handler (30), `$A344` hold (66), `$A36A` break (20), `$A2DD` init (6 + 30 positions),
    shard schedule (5, plus every parameter 1..255 with `y_k = y0 + k(k+3)`), `$7646` handler (6 + the full `+$22` × `+$03` 65,536 matrix),
    `$753E` probe (14 + 19,200-case X × Y × parity × floor-flag grid), floor-pass trigger (48).
  * Floor-pass sweep through the real `SCR_cc_floor`: **106,704** cases (state × previous flags × Y speed × floor flag × X (19) × foot row (39) × remembered cell) and
    **3,072** `+$03`/state cases — handler reached iff the foot sample is inside `$AF`; independent of posture, blink, invulnerability.
  * **All 8 Research whole-game traces replayed row for row through the real adapter step and object phase** (x, y, X/Y speed, state, requested state, floor flag,
    movement byte for every row) with the object events (`h0c`, `spawn13`, `13s0`, `13rider`, `13break`, `replace`, `h1a`): drop (67,6), revisit, rise-through,
    A→B→A, full pool, walk-off hover (28..29,10), six-cell strip (62..67,14), pad (42,17) → four-cell bridge.
  * **All 36 SEZ `$AF` cells dropped on**: object/hold anchors, 16 hold updates at `cell top − 16`, break at `T+17`, `$B0` write, children at `T+18` in slots 7..10
    with parameters 3/8/5/1 at the contract positions, parent slot freed `T+19`, first moves `T+22/27/24/20`, `y_k`.
  * Pool: lost-ring occupancy of slots 0..15, parent slot, child slots, *k*-free table (7 rows), child-below-parent delay; removal by camera (`objectX < cameraX`, strict, 256/348/640) and by sleep leave
    `$AF` intact and remembered with no new object; persistence; act-restart restore; shards have no contact; lifecycle at 256/348/640 vs the decoded class table.
  * Booster: standing start (3 launches at X offsets 17/24/31, 1792×3 then the shared −5/update), all 12 entry-speed rows (5 launches rightward, exactly 1 from the right at 30/31 and the pad
    still sends Sonic right), every SEZ2/3 pad, all 20 contract states launch at the first update, the non-probe states (`$0C`, `$0D`, `$13`, `$16`, `$1F`, `$20`, `$21`, `$23`) never do, Rocket Shoes cancel, Spring Shoes parity 0/1.
* Asset suites: S1 14,553 (the baked backdrop check now expects `$B0` at every `$AF` cell) + S2 119 (mirrors identical to Research `main`, 36 baked `$B0` cells, shard art == type `$13` frame 15,
  effect-5 ROM image hashes, resource registration).
* S1 foundation suite (326,149), accepted THZ/GPZ/MGHZ regression inventory, GML lint (2 new files), `git diff --check`.
* Research: 34 foundation tests and 60 surface tests (2,287 counted checks) pass on a clean `6e169d7` checkout. ROM SHA-256 verified:
  `eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.

## Research discrepancies / questions (none blocks S2)

1. `crumble_drop_sez1_67_6`: `fixture.start_anchor` says Y 120 but the trace's own rows and the whole-game summary (spawn update 15) only fit a start of **Y 154**; every row reproduces from 154
   (the revisit trace, spawn 24, does start at 120). Metadata only.
2. `crumble_a_b_a_*`: the rows show the new X from update 7 / 11 and the spawns at 8 / 12; the POC reproduces them exactly when the teleport lands at the **end** of update 7 / 11
   (the text says "after update 6 / 10").
3. State `$20` (act clear) is listed as *not* running the floor pass, and `$21` also, while the contract's own controlled floor-pass vectors include `$21` and the accepted POC act-clear adapter walks the terrain
   pipeline. S2 follows the whole-game list for `$20` (handler off) and the vectors for `$21`. No `$AF` lies near a sign, so nothing observable depends on it.
4. Forced-state first-update scan: our core reproduces all 20 contract states that launch; it also launches in `$11` (no Rocket timer), `$15`, `$17`, `$1D`, `$1E`. Those fixtures start every state with the floor
   flag set, while the ROM callbacks clear it first; they are informational, not oracle failures.
5. Rocket/Spring Shoes pad fixtures publish no start state (positions/speeds), so only their contract statements (state replacement, selector/timer kept, parity 0/1 depth, owner detach) are asserted, not the row sequences.
6. Other scene objects ('alloc11' / 'alloc16' rows) occupy pool slots in the recorded traces; child counts after the first batch are therefore not compared in the A→B→A and bridge traces (see limits).
7. Research's shared working tree currently has branch `research/sez-platform-28` checked out with modified S1 caches (staged). Importers/tests here read canonical `main` blobs or a clean `main` clone, never that working tree.

## Limits (explicit, not hidden)

* The slot pool is an **occupancy model, not a whole-game slot interpreter**: it sees crumble parents, shards and the accepted lost rings. Other mapped SEZ objects (springs, monitors, spikes, platforms, shoes) are
  GameMaker instances and do not reserve slots, so a crowded scene can create more shards than the ROM would. The first-free/full-pool/*k*-free rules themselves are exact.
* Sound requests (`$A3`, `$BD`) are recorded in `global.chaosLastSoundRequest` only; their audio mapping is unresearched.
* Rider-hold bit `$D521.1` has no reader and is not modelled; the failed-spawn write to slot 16's `+$30/+$31` is inert and not modelled.
* The facing flag is not written by the pad (verified at core level); the accepted sprite adapter derives facing from X speed, so a left-facing Sonic is drawn facing right in the same update.
* THZ/AQZ/EEZ `$AF` cells (the runtime is global in the ROM) are not enabled here; only SEZ's three acts are in scope.

## Compile status

See `build/sez-s2/package-report.json`. Standalone Igor loads the project but stops at `GMAssetCompiler.dll` (status −1) before GML compilation, exactly as for M2–M4 and S1; its exit code is not compile
evidence. **GameMaker IDE compile/launch of the source and the extracted package remains James's gate.** `lint_sez_s2_gml.py` is a static sanity check, not a compiler.

## Suggested Windows pass

1. SEZ1 (62..67,14) bridge: run right at normal speed. Each cell drops away ~17 frames after first touch, shards fall staggered (1, 3, 5, 8 frames), Sonic never falls.
2. SEZ1 (28..29,10): walk **left** off the end and watch the ~9-frame hover (verified original behaviour — do not report it as a bug).
3. SEZ1 (67,6): drop onto the ledge, then jump off and land again on the same cell: no second crumble; touch (68,6) then (67,6) again before it breaks: a second object for (67,6).
4. SEZ2 (42,17): walk into the pad: Sonic shoots right at 7 px/frame, repeated launches while inside the 32 px column; hold LEFT right after (skid); approach from the right: bounced back right; B1 during the launch jumps.
5. SEZ2 pad → (44..47,18): the launch carries Sonic across the four-cell bridge, cells crumble behind him. SEZ3 pads (34,7), (72,22).
6. Rocket Shoes (monitor) into a pad: Rocket is replaced by the roll state; Spring Shoes are not expected near a pad.
7. Pad art: two roller-like pieces alternate every 3 frames; broken ledges stay blank until R / death restarts the act.
8. Window widths 256/348/640: breaking is unchanged; shards keep falling off-screen without lingering.

## Reproduction (local ROM only)

```
PYTHONPATH=<Pillow + Research venv site-packages>
SONIC_RESEARCH_MAIN=<clean checkout of Research main 6e169d7>   SONIC_CHAOS_ROM=<verified ROM>
python POC_notes/generate_sez_foundation.py --research $SONIC_RESEARCH_MAIN --rom $SONIC_CHAOS_ROM
python POC_notes/generate_sez_s2.py         --research $SONIC_RESEARCH_MAIN --rom $SONIC_CHAOS_ROM
python verification/run_sez_s2_checks.py    # 46 commands
python verification/package_sez_s2.py --prepare
```

AGENTS candidate update (root `AGENTS.md` untouched): *SEZ S2 implements `$0C/$13` crumble and `$1A` booster from Research `6e169d7`: floor-pass handler + 19-slot occupancy pool (slots 0..15 parents, 7..17 shards),
booster inside the terrain pass at the `$753E` probe point; importers read canonical Research `main` only.*

## Windows acceptance and deferred item

Accepted: crumble ledges, canonical hover, booster pad, booster-to-bridge sequence, broken-cell presentation, pad animation.

**Deferred (no S2 change):** once, with Spring Shoes near broken/breakable terrain, Sonic entered a fall state after a bounce, had no steering, kept bouncing
against terrain and drifted slowly downward. Not game-breaking, not reproduced, not remembered from the original. Needs a deterministic reproduction
(trace/video) before any Research/POC change; note that state `$14`-style zero air steering and Spring Shoes `$12` side-wall handling are canonical.

Post-acceptance, verification-only edit: the S2 checks now pin Research commit `6e169d7` (ancestor of `main`, blobs read at that commit) because Research `main` advanced with S3.
