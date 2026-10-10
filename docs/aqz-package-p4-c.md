# AQZ P4 C - full-width fight; pending Windows acceptance

P3 base `1b089a5fdfa31acc27c8f06866ae66f091c3d455`, branch
`poc/aqz-p4-boss-59-5d`. All P4 changes remain uncommitted. P4 B is rejected.
P4 A is the accepted core reference (package SHA256
`2827ed06dbd4c039664626941a0888386f3c898dd7ade8a2ebef9fd3fa89cf9c`).
Research main: `89641f8093e62401cd81f94e6ac889422f600472`.

## Full-width arena and hit chain

B's player clamp is removed completely, including its phase latch/helper.
The shared viewport edge limits are restored. World camera settles at X1727/Y78.
These screen envelopes are unions over the unchanged boss route:

| Width | P4 A / C player | Rejected B player | Boss anchor | Normal body contact |
|---|---|---|---|---|
|256|16..247|16..247|47..208|19..236|
|348 (normal Windows 16:9)|16..339|19..236|47..208|19..236|
|640 (additional fixture)|16..631|19..236|47..208|19..236|

No wall exists inside the full-width player envelope. The original 3px left
body dead strip remains. Boss route, geometry and velocities are unchanged.
The body envelope is not expanded to the wide right edge. $5D always moves left;
no claim is made that it can shoot to the right of its source anchor.

72 honest one-button jump episodes cover left/right approaches, four starting
distances and three button-hold durations at all three widths. Every HP and
cooldown transition is recorded. Each episode produces zero or one hit and
wide traces equal their width256 counterparts. All 468 contact-helper inputs
from those canonical-width episodes are replayed through original ROM $AAB5:
HP, cooldown, player X/Y velocity and requested state match (2340 assertions).
The wall-induced repeated-hit drain is classified as a rejected B adapter
consequence. No cooldown or core contact change is made.

## Phase-1 source trace and stable entry adapter

Canonical child source initializer remains WORLD(2048,238), VX=-128/256.
The first canonical opaque anchor bounds at the settled X1727 camera imply
321 = EDGE(RIGHT,+65). Allocation/callback timing is independent of pan arrival.
`verification/aqz-p4/phase1-entry-source-trace.json` records the original native
loader/scheduler trace, including camera at allocation, first movement and first
opaque frame. In that controlled trace the first child initializes on update106
(camera1446,136), moves on107 (1447,135), and first has opaque visible pixels
on335 (camera1675,78). Later children initialize at170/234/298/362/426.
This synthetic source trace establishes timing, not a replacement for James's
original-game visible reference: camera first, stable pause, right-edge entry.

For widths >256 C computes ONE translation for the entire child phase at the
first initializer:

`view_dx = W-256 + ceil((remaining_pan_updates + 16)/2)`

The added half-pixel-per-update distance accounts for source motion during the
remaining one-pixel camera pan and a 16-update settled presentation gate.
All six children use this same fixed translation. It is never recomputed or
rebased for a live child. Drawing/contact are hidden until the camera has been
settled for 16 updates. Scripts, callbacks, Y motion, HP, signals and allocator
continue normally; source anchors are not rewritten. Translated contact,
facing and lifecycle use the same coordinate as drawing. Once the gate opens,
the first child is still beyond the right edge and enters through its existing
motion; later children retain canonical spacing. This is explicitly a wide
presentation/gameplay adapter, not ROM behavior. At width256 the gate and added
translation are absent. All six opaque entrances are tested against the actual
sprite bounds for four camera starting positions and both wide widths.

## $5D range/lifecycle diagnosis

$5D initializes VX=-576/256 (-2.25), VY=0. Initial player Y distance >=32 selects
one fixed steering direction, adding +/-8/256 after each move. Contact remains
the canonical forced-hurt path. The next callback deletes an asleep projectile.
The existing shared lifecycle already tests the real [LEFT,RIGHT) wide viewport
plus its canonical horizontal margins; it does not truncate at screen X256.
An exhaustive shot/target sweep from the existing boss route confirms that a
live projectile is never asleep/deleted inside the active viewport and can
contact Sonic at screen X16..157 in the tested floor-Y238 shot sweep, including
the entire left body dead strip (X16..18). No extra retention
is necessary. Adding a speculative retention window would not extend a strictly
left-moving shot into the right side of the arena, so no $5D runtime edit is made.
Coverage, initial velocity, steering and deletion are recorded in the fixture.

## Locked wide clear camera

At width >256 the settled encounter camera is saved and remains fixed through
clear (X1727,Y78). The restored canonical source limit is still produced by the
unchanged clear callback; a separate adapter then locks the exposed wide limits
to the encounter camera. The camera driver bypasses post-clear following only
for wide views. World-width-minus-view-width remains the absolute output cap.
At width256 the canonical restored right limit is2304 and follow/freeze behavior
is unchanged. Player state $20 skips the ordinary player edge clamp and runs
through EDGE(RIGHT,+33): screen289/381/673 at widths256/348/640. No world offset
or shortened run is used. Fixed wide views end before world X2560, so there is
no black world beyond terrain.

Floor-bit-only gate, timer, state $20, $0A/0, boss $0F/0 and numeric zone5/act0
successor remain unchanged. Lost-ring scatter is untouched. Protected P4 A core
functions, canonical caches and sprites retain identity checks. P1-P3, navigation,
hygiene, full regression, source/fresh-package compilation and startup evidence
are included in ignored `build/aqz-p4-c`. Reproduce with
`verification/run_aqz_p4_c_checks.py` using Research Python and bundled Pillow.
Stop for Windows acceptance; do not commit.

## Verification totals

87/87 regression commands PASS. P4 runtime 61,751 assertions; viewport/entry/
projectile/jump fixtures 2,123,750; native jump-contact replay 2,340; asset checks
1,048,717; accepted-core identity 170. Source compile/startup PASS. Fresh-package
compile/startup and package SHA256 are recorded in the final package report.
