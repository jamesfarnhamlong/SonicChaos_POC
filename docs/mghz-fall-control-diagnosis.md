# MGHZ fall/control classification — diagnostic only

**Pre-existing shared-player / solid-contact behavior. No M1 regression reproduced; this does not hold M1 acceptance.** No gameplay source, thresholds, geometry, canonical data or release ZIP was changed during this diagnosis. No commit was made during diagnosis; the accepted MGHZ milestone now includes this record.

James identified MGHZ1's long special-fall strip and the ring monitor immediately before the end area. The supplied board registers the upper surface `$19` strip at cells X102..111 / Y12 (world Y384), the lower strip at X95..109 / Y27 (Y864), and mapped `$10`, parameter 1, record 16 at `(3568,814)`. These long strips are terrain `$85/$87`, not mapped `$28/$83` objects and not GPZ solid surface `$1C`.

## Evidence and baseline comparison

`verification/diagnose_mghz_fall_control.js` executes shipped player, monitor and platform GML from both the current source and accepted `82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed`. All **33 paired cases have identical frame records**. Records include active/requested states, movement/attack/airborne bits, floor/combined contacts, held input, input delta, X/Y speed, platform ownership, foot block/profile, each floor projection's input/output and monitor contact classification.

Since the accepted checkpoint predates MGHZ, its MGHZ-area comparisons explicitly inject the same canonical MGHZ1 layout/profiles into a GPZ host room; no accepted player/contact function is replaced. Separate controls use the accepted GPZ2 layout without any MGHZ data: surface `$19` at `(528,686)` and its existing ring monitor, record 12 `(3472,878)`, beside solid terrain. The latter reproduces the same repeated monitor/terrain projection conflict.

Both checkpoints also compiled and ran native GameMaker GPZ2 diagnostics. All **373 recorded gameplay rows match by value**, including the special-fall control behavior and 13 right-side monitor contacts. Fixtures place the player/camera explicitly, make the canonical monitor awake after teleport, and remove unrelated enemies/moving spikes; terrain and collision geometry are unchanged. Native screenshots are retained in the diagnosis sheet. The controlled start is not claimed to reconstruct James's exact input history.

## Special fall and passage through the strips

Example: start `(3408,366)`, active/requested `$05`, X speed +1.0, floor/contact set, and hold Right.

| Update | Active / requested | Position | X speed / input delta | Flags / support |
|---|---|---|---|---|
| 0 | `$05 / $14` | `(3409.0625,366)` | 272/256, delta16 | move `$01`, floor clear, strip bit0 set, owner0 |
| 1 | `$14 / $14` | `(3410.125,367.1875)` | 272/256, delta0, held `$08` | airborne, not attacking, floor clear, owner0 |
| 82 | `$14 / $14` | `(3496.1875,847)` | 272/256, delta0 | lower `$87` foot contact sets strip bit0 again |
| 83 | `$14 / $14` | `(3497.25,854)` | 272/256, delta0 | requested `$14` + bit0 bypasses one-way projection |
| 110 | `$14 / $14` then death adapter | Y1043 | retained X speed | screen-relative death boundary reached |

Left and alternating Left/Right reach `held` correctly, but `$14` has zero horizontal acceleration in every imported dry/water movement table. Ordinary fall `$0E` has nonzero control entries. This is not lost keyboard input. `$14` remains active until landing; clearing the strip marker in empty terrain does not itself switch it to `$0E`. On approaching another `$19` strip, its contact handler can set the marker before the first eligible support pass, and the next projection bypasses it. This behavior is identical at the accepted checkpoint.

There is no mapped platform owner on these terrain strips. Separate `$28/$83` controls still claim/carry the player in both ordinary `$0E` and special `$14`; the special-fall state alone does not disable that platform family. No universal speed cutoff, capture widening or fall threshold change was made.

The `$14` movement table and `$19` entry/bypass rules are ROM-derived, documented in Research `docs/gpz-surface19-audit.md`. This diagnosis does **not** claim that the entire long fall / re-entry lifecycle is visibly faithful to the original game; that remains a shared-player Research/original-game comparison question.

## Ring-monitor snag

Example: start on the upper strip at `(3504,366)`, X speed +1.0, hold Right. At updates 76/77 the monitor classifies the player to its right (`bits=$04`). Its shared solid projection moves X to `3586.1875`, inside the neighbouring wall beginning at X3584. On the next player pass, terrain pushes X back to `3575.1875`. The monitor pushes him right again on subsequent contacts.

The opposing right-terrain / left-monitor flags produce combined horizontal contact bits `$0C`; X integration zeros velocity while Right is held. The monitor is not broken: movement attack bit1 is clear. At update 78 terrain projection writes Y782 and requests walking; the following pass requests ordinary fall `$0E`. Repeated floor projections later pop Y near750, then fall resumes, so this is a genuine collision/presentation snag rather than only a different animation.

Removing **only the monitor in the fixture** leaves Sonic settled at Y814; changing to Left after update95 lets him escape. Both A/B controls are identical at `82ebc89`. A ring monitor on the accepted GPZ2 map produces the same mechanism; the native accepted/current traces likewise agree. The M1 monitor Step diff changes only its destruction sprite selection, not contact classification, projection, attack or input handling.

## Relationship and disposition

The two observations can share the initial `$19 -> $14` entry and lack of air steering. The persistent monitor snag adds a distinct, pre-existing solid-projection conflict; it also reproduces from ordinary `$0E`, without special fall. They should not be treated as one new MGHZ collision regression or fixed by tuning fall thresholds.

Classify this as the previously parked shared-player fall/control issue **plus shared monitor/terrain projection behavior**, now with gameplay-relevant traces. M1 foundation acceptance is not held by it. Before changing shared behavior, compare the full special-fall lifecycle and the monitor-side solid interaction with Research/original-game evidence.

Evidence: `verification/mghz-m11/fall-control-classification.json`, `fall-control-diagnosis.json`, `fall-control-native-accepted.json`, `fall-control-native-current.json`, and `fall-control-native-sheet.png`. Reproduce the paired source runs with `node verification/diagnose_mghz_fall_control.js`. Native fixture generator: `verification/capture_fall_control_diagnosis.py`, operating only under `build/fall-control-native`.

AGENTS candidate update (not applied): promote the parked fall presentation issue to a shared gameplay investigation; reference these baseline-identical `$14` and monitor/terrain traces. Keep it separate from accepted MGHZ foundation work.
