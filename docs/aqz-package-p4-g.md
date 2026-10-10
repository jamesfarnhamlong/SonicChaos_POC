# AQZ P4 G — edge-complete body route and attached aimed missiles

Uncommitted on `poc/aqz-p4-boss-59-5d`, based on accepted P3 commit
`1b089a5fdfa31acc27c8f06866ae66f091c3d455`. Windows acceptance is pending.
AQZ facts/data remain pinned to Research
`89641f8093e62401cd81f94e6ac889422f600472`. Research main is now
`c4c389c28fe686713d9371fb925f60eb4014191c`; its AQZ caches and runtime oracle
are unchanged from the pinned checkpoint.

Only width348 receives G combat adapters. Width256 retains canonical scripts,
placements, callbacks, source offsets, collision, contact/HP/cooldown, allocator,
velocities and lifecycle. 640 is not a combat fidelity target.

## Horizontal body route

348 uses stop targets44..311, replacing F's47..300. Original collision extents
are untouched. Player traversal remains16..339 through the shared full-width
movement rules; no boss-specific player wall exists.

The proportional speed candidate is validated:
`round(160 * (311-44) / (208-47)) = 265` fixed-point units, or1.03515625px per
movement callback. The original speed is160/256 =0.625. An unconstrained
canonical jump takes66 movement calls at either width, with horizontal travel
41.25 versus68.3203125. Every Y position, VY, gravity update and requested-state
transition agrees. Stops retain the original pre-move convention and one-step
overshoot. Wide targets read live screen X; the256 byte/cache test is unchanged.

The existing approach latches Sonic's X at jump initialization, bounded to the
boss route44..311. It stops at that goal rather than overshooting Sonic on every
jump. This is a348 horizontal route adapter; it does not clamp the player.
It prevents a wider jump repeatedly passing over a stationary central player
without descending close enough to contact him.

Actual body-only natural sequence traces run shipped player physics and the
real descending contact helper, deleting missile slots only to isolate body
threat. Both extreme stationary positions receive state9/frame4 contact:

| Player screen X | Boss precise screen X | Boss WORLD Y | VY after update | Helper result |
|---|---|---|---|---|
|16|44.1171875|216.25|5.4375|8|
|339|311.1875|216.25|5.4375|4|

These are actual helper results with ordinary player flags, rather than a union
of bounds across unrelated heights. Recorded boss anchors remain44..311 in
these cases. Original art remains visually on-screen or minimally near an edge;
no route target places the boss outside the viewport.

## Attached missiles and derived firing goal

F's detached(+20,+23) spawn is removed. Script command CPU$A89C, state10/frame3,
uses the canonical boss offset(-8,-32) at both supported widths. Natural boss
Y191 produces missileY159. Canonical floor-standing SonicY238 selects downward
steering1, with initialVY0 and existing+8/256 after each move.

First floor contact is move60:
`159 + (8/256)*(60*59/2) = 214.3125`.
Horizontal travel magnitude is `60*2.25 =135`. Existing combined horizontal
contact reach is12. Thus for player screenX P, first-contact firing anchors are:

- left-going: bossX =P+8+135 =P+143;
- right-going: bossX =P+8-135 =P-127.

For P16 the left-going target is boss159/source151, first floor intersection16.
For P339 the right-going target is boss212/source204, first intersection339.
Both are visibly inside the arena. Candidate targets are bounded44..311; a
candidate is valid if its predicted first floor intersection is within12 of
Sonic. If both are valid, choose the nearer firing position. At middle X169/170,
a bounded candidate differs by only1..2px and remains within the same unchanged
contact reach. Source offsets and collision geometry never move to compensate.

## Body / firing goals inside the original loop

A348-only route flag chooses horizontal goals within the existing jump loop:

1. Body approach follows the latched player X, bounded44..311.
2. Descending body proximity at the floor lane selects a firing goal for the
   next existing jump. The current jump is not restarted or extended.
3. Existing jumps approach that visible firing goal at265/256, stopping there.
4. When a naturally scheduled attached shot has a first floor intersection
   within12 of Sonic, the remaining jump resumes the body goal at the same speed.

No script operation, duration, state, jump counter or vertical callback is
added. All shots still occur at the original command/timing, including shots
fired while approaching the useful position. The flag changes only horizontal
routing and records explicit adapter goals; it is not a recovered ROM state.
Allocation failure does not select a successful-shot return goal.

A controlled4000-update clock comparison suppresses contact consequences only
for that timing oracle. Width256 and348 each initialize exactly50 jumps; every
update agrees on state/request, frame, timer, PC, callback, counter, Y and VY.
The routing uses existing repeating jumps; there is no extra hop.

At allocation,348 latches `-576` if Sonic is at/left of the source, or `+576` if
he is right of it. The original initializer applies that latched horizontal
velocity after its canonical initialization. Magnitude2.25, VY, vertical
selector/increments, collision4x16, forced hurt and lifecycle remain unchanged.
There is no subsequent X retargeting. Crossing Sonic to the opposite side before
initialization and repeatedly during100 flight calls leaves VX unchanged.

Right-going348 shots draw the same recovered sprite/frame/composition with
horizontal scale-1 about its registered anchor. Left-going and all256 shots
retain the original draw path. No artwork, cache, source coordinates or hitbox
is changed. Draw fixtures check resource, registration and direction explicitly.

## Verification and Windows limits

The fixed-width fixture runs shipped GML, actual player/terrain physics, slot
scripts and natural allocations. Ordinary waiting tests cover every permitted
integer floor X at256 and348 for up to2400 updates. Width256 retains its previous
safe positions16..18 and237..247. At348 no sampled floor position survives.

Separate missile-contribution tests suppress only body overlap at that helper,
keeping real missile/player physics and damage. Every X16..339 is threatened
by naturally allocated attached missiles; the longest case takes497 updates.
The far-left case is hit after the return toward source151 (416 updates total);
the far-right case is hit from source197, first floor intersection332 within
reach12 of339 (173 updates total). A later source204 intersects339 exactly.
The boss stays engaged inside the view rather than chasing an offscreen source.

144 ordinary continuous-jump episodes approach from both directions, with
three boss start positions, four distances and three hold lengths. Each causes
at most one HP decrement. All1044 canonical256 contact calls are independently
replayed through ROM$AAB5. Core collision/attack/cooldown/11-hit underflow and
$5B/$5C/$5D/allocator/defeat-clear regressions remain protected by the A oracle.

C/F stable six-child entrance, fixed translation, settled-camera pause,
canonical source trajectories, smooth boss entrance, full arena traversal,
locked wide clear camera and state$20 EDGE(RIGHT,+33) run-off remain intact.
The C presentation functions compare unchanged; the draw comparison permits
only the explicit right-going missile mirror. Shared hurt/lost-ring code is
unchanged and outside this milestone.

These are bounded deterministic checks, not Windows combat acceptance.
James must judge the body approaches, firing return route, missile attachment
and directional artwork in live play. Passing fixtures do not override videos.

## Capture and package

F11 in AQZ3 starts a capture and cycles A-left /B-right /C-central; F12 saves
and stops. Files `aqz-p4-g-<case>-<id>.jsonl` are in
`C:\Users\james\AppData\Local\SonicChaos_POC\` on this Windows installation.
The runtime prints the actual absolute path. Start before the boss trigger to
capture allocation/camera entry. Each frame flushes and closes the file.

Trace events include actual WORLD/live/cached screen positions, camera,
executed record/next PC, state/request/frame, route mode/goal, VX/VY,
player core flags and instance bounds, body/projectile helper inputs/results,
allocation and allocation-time aim snapshots, selector and lifecycle reasons.
Capture-on/off gameplay identity is checked over400 complete updates.
Optional native argument `-aqz-trace-io-selftest` tests the file writer without
changing room/player state; it is not an actual Windows combat capture.

Full runner: `verification/run_aqz_p4_g_checks.py`. Unique source package:
`SonicChaos_AQZ_P4_20261010_G.zip`, one project folder/YYP, no ROM/build debris.
Both source and freshly extracted package are compiled and launched separately;
reports/SHA-256 are under ignored `build/aqz-p4-g/`. No commit or push.
Stop for James's Windows acceptance.

Final verification:88/88 regression commands PASS and1,317,545 focused
assertions PASS. This includes144 continuous-jump episodes,1044 ROM-replayed
contacts,324 missile-only floor positions and the4000-update/50-jump clock
comparison. Strict allocation direction is tested at one fixed-point unit
left/equal/right of the source. Source compile, startup and native trace I/O
passed. Fresh-package compile/startup are independently checked before delivery.
Windows combat acceptance remains pending.
