# AQZ P2 A — type $3F

Uncommitted Windows acceptance candidate on `poc/aqz-p2-platform-3f`, based exactly
on accepted P1 `7ca3336eed3c204f3c794082c7c91d15f76ec42c`. Canonical Research main:
`89641f8093e62401cd81f94e6ac889422f600472`. Only $3F is enabled; $3C/$3D and
$59–$5D remain filtered. No P3 work is included.

## Runtime and data

`generate_aqz_p2.py` mirrors the reviewed A3 runtime/game caches from the pinned
Research commit. The existing canonical room/object tables supply the placements;
there are no manual room instances or modified anchors. It imports frame0/1 from
the approved A1 SAT compositions, verifying both $80/$32 and $80/$00 subjects.
The identical visible pixels use the accepted indexed AQZ palette and +(1,18)
renderer registration, with no gameplay/collision offset.

The level loader creates placement shells using the existing platform object.
The $8B override reads the active AQZ room's zero-based act; the legacy player
core `level` field remains a zone selector and is not repurposed.
They reserve first-free mapped slots 7..17 in the existing AQZ pool. Its ascending
object pass runs the decoded original scripts, callbacks and post-callback
lifecycle; the mapped scan follows the callback pass. Newly created state0 does
not execute until the next pass, initializer state0 preserves the asleep flag,
and callbacks see the prior asleep flag. Cleanup visits $FE, $FF, then free.
Released shells recreate from the canonical row; triggered fall shells retain
spent occupancy until act restart.

The adapter reuses the accepted shared state7 movement/counter routine, sag rules,
carry projection and overlap helper. The $3F driver supplies decoded scripts,
canonical velocity gates, staged contact flags and lifecycle/token rules. Release
immediately clears the sag-return latch. Side contact cannot create a platform
wall; underside/top flags retain their original staged behavior. Existing $28
callbacks and all player physics remain unchanged.

| Placement | Implemented path |
|---|---|
| AQZ1 #1 $86 WORLD(2128,480) | state7, any shared rectangle trigger, same-callback +1 movement; aux1=$32 means 800 callbacks/pixels per leg; counter reversal/return and re-trigger; runs asleep; removal at abs(X)>=640 or abs(Y)>=672, never widened |
| AQZ1 #2 $83 WORLD(3408,272) | state4 top support/sag/carry; 80 callbacks decrement delay, next arms fall, following starts +48/256 gravity; triggered sleeping deletion spends occupancy |
| AQZ2 #2 $8B WORLD(2096,669) | state13 awake/non-rising/top gate, zone4/act1 override requests14; next phase starts script14; +160X,+64Y,+96X,-128Y,-128Y over 576 callbacks; net(+256,-192); 80-callback delay, arm, uncapped falling tail while numeric state stays14 |
| AQZ3 | no $3F placements |

Route callbacks integrate twice while asleep and consume one duration. State14
does not keep alive, reset its route, sample terrain/water or clamp its endpoint.
Horizontal/falling support uses playerVy>=0; vertical route support uses signed
platformVy<=playerVy. Projection preserves fractions, velocities, state and floor
flags. The original player-distance rules remain independent of viewport width.

## Verification

- Shipping GML versus original-Z80 snapshots: **170,853 assertions**, including
  **5,725 callback rows** (3,025 A3 snapshots + 2,700 supplemental original-ROM
  interrupted-sag/contact controls) and **2,982 natural scheduler rows**.
- Sweeps include state-$0F geometry, all state13 oracle predicates, post-move
  classification, signed speed/owner gates, counter boundaries, removal equality
  at 256/348/640px, prior-asleep ordering, pool exhaustion, cleanup, spent and
  released occupancy, fresh recreation, and identical dry/wet/blocked-map routes.
  A separate real adapter-frame smoke test exercises all three natural placements
  through the player step, slot scheduler, loader and published support reference.
- Exact approved art/cache/P1 preservation checks: **16,428 assertions**.
- Accepted P1 suite: **75/75 commands** after resolving the pure-rule static
  boundary check by moving resource assignment to the loader. This includes shared
  player/platform, all accepted zones, navigation, hygiene and diff checks.
- Research A3: **8/8 methods**, **70,468 original-routine assertions**, **2,982
  whole-game rows**. Complete P2 batch: **78/78 commands**.

Natural scheduler replay supplies the original loader/refresh event timing and
non-carried player/terrain outputs as inputs. It verifies object state, movement,
timers, asleep state, ownership, occupancy and carried player projection at every
boundary; it does not claim to emulate the original player CPU or IRQ timing.
The accepted P1 deterministic refresh adapter is unchanged. Callback fixtures
separately verify the platform results without whole-game terrain interference.

Reproduce with Research .venv Python and bundled Pillow on PYTHONPATH:

```text
POC_notes/generate_aqz_p2.py --research ../sonic-chaos-reference-work --rom LOCAL_ROM
verification/make_aqz_p2_controls.py --research ../sonic-chaos-reference-work --rom LOCAL_ROM
verification/run_aqz_p2_checks.py
verification/package_aqz_p2.py
```

## Package and acceptance

Source package: `releases/SonicChaos_AQZ_P2_20261009_A.zip`. One top-level project
folder, exactly one `SonicChaos_POC.yyp`, no ROM, ZIP/build products, backup
projects, or parked untracked diagnostics/options. Every freshly extracted file
is byte-checked against the packaged source. SHA-256 and final compile/launch
results are recorded in `build/aqz-p2/package-report.json` and the adjacent release
report. Source and fresh extraction are compiled with Igor VM and launched on
Windows; a wrapper exit code alone is not used as compilation evidence.

No unresolved runtime/art dependency or new Windows-visible difference has been
identified by the automated checks. James/Manager Windows gameplay/presentation
acceptance remains pending for all three placements. Verify contact-start/carry
and turnaround for $86, sag/delayed fall for $83, and all route turns followed by
the falling tail for $8B. P1 underwater-feel monitoring is outside this package.

Remain uncommitted; stop at this package. No P3 rollout is authorized here.

AGENTS candidate after acceptance: AQZ P2 type $3F is implemented through shared
platform callbacks with AQZ state14 and canonical spent/released token handling;
the next rollout is P3 $3C/$3D. Manager should consolidate only after acceptance.
