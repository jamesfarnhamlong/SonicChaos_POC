# AQZ P4 F — fixed 256 / 348 combat modes

Uncommitted on `poc/aqz-p4-boss-59-5d`, based on accepted P3
`1b089a5fdfa31acc27c8f06866ae66f091c3d455`. Canonical Research checkpoint:
`89641f8093e62401cd81f94e6ac889422f600472`. Windows acceptance is pending.

James rejected E combat. F replaces E's offscreen chase and projectile entry
retention. It preserves C's fixed child translation, settled-camera pause,
smooth boss entrance, full-width player movement and locked wide clear camera.
640 is not a combat fidelity target. Only width348 receives F gameplay changes;
width256 keeps canonical source tables, coordinates, callbacks and geometry.

## Explicit 348 gameplay adapter

The canonical boss route endpoints are screen47..208 (span161). At348 they
are47..300 = LEFT+47 .. RIGHT-48 (span253). The player's range is16..339;
there is no boss-specific player clamp. Original body extent20 plus Sonic8
produces contact reach28 and body refuges16..18 /329..339, matching the
canonical edge margins. The stop still occurs before motion, with the original
one-step endpoint overshoot. Live screen X replaces cached byte X only at348.

Horizontal speed is rounded to 8.8 fixed point:
`round(160 * 253 / 161) = 251`, or0.98046875px/callback. Canonical speed is
160/256 =0.625. Both existing jump initializers use this speed at348. Facing
still follows Sonic, with no E lead or offscreen target. There is no extra hop.
The isolated full arc takes66 movement calls at either width: X displacement
41.25 versus64.7109375. Y positions, Y velocities, gravity and requested-state
sequence are equal on every call. The jump traverses approximately25.6% of
the patrol span in either mode. Canonical script records remain unchanged.

The boss remains within screen47..301 throughout the supported combat route;
its body is visible at either stop. No collision, damage, cooldown, HP,
allocator, child, $5C parameter6, defeat or clear-sequence change is made.

## Separate $5D launch adapter

The canonical state10/frame3 script command at CPU$A89C launches at
boss(-8,-32). With bossY191, this gives shotY159. A floor-standing Sonic atY238
selects downward steering1. VX=-2.25, initialVY0, acceleration+8/256 after each
move: first floor-overlap is move60 atY214.3125, X displacement-135.
At the canonical right stop208, source200 first intersects the floor atX65;
horizontal reach12 means rightmost floor contact77. Even a visible348 boss at
300 with the original source292 only reaches floorX157, contact169. Merely
extending lifetime cannot cover the right floor lane.

**348 GameMaker spawn adapter:** the same script command allocates the same
$5D at boss(+20,+23), a change of(+28,+55) from the ROM offset. Natural shotY
is214, the lowest change that places it in the closed floor-contact band
214..254. It starts at the body's right boundary, rather than requiring an
offscreen boss. The existing initializer sees floor-player distance24<32 and
selects0, so the missile moves left at its original speed with originalVY0.
At bossX300, sourceX320: first moving contact anchor317.75, integer317, reach12,
rightmost floor target329. This retains a small right refuge330..339.

The initializer still uses the actual player Y and the existing32px selector
rule. Jumping/falling Sonic can select the original upward/downward steering;
there is no repeated retargeting, mirror, rearward velocity or randomness.
$5D's callback, collision4x16, forced hurt and generic sleep/delete lifecycle
are unchanged from A. E's outside-right entry retention is removed. The adapter
changes runtime allocation coordinates only; the canonical spawn script/cache
remains(-8,-32). Windows must judge the low launch's visible presentation.

## Actual phase and floor fixtures

`verify_aqz_p4_f.js` uses shipped GML, real player/terrain physics and the shared
slot/script scheduler. Per-update descending helper traces record state,
frame, X/Y, VX/VY, player X/Y, flags and helper result. Body-only cases delete
missile slots to isolate body threat; they do not move or pin Sonic.

At348, descending state9/frame4 hits X19 at bossX47.62109375,Y216.25 and X328
at bossX300.58203125,Y216.25. Neither literal edge16 nor339 receives descending
body contact. The equivalent256 traces are retained as observations, not
rewritten to match the wide results. The known disagreement between earlier
synthetic left-edge conclusions and James's original-game observation remains
for direct Windows comparison; passing tests do not establish visible fidelity.

Ordinary waiting sweeps cover every permitted integer floor X at256/348.
At348 only330..339 survive the bounded2400-update sweep; low missiles can
contest the left body refuge. A separate missile-only contribution fixture
suppresses body overlap at that helper and tests every useful X19..329 with
real scripts, natural allocation, player physics and missile damage.

144 continuous one-button jump episodes approach from both sides, through
three boss start positions, four distances and three hold lengths. Each yields
at most one boss HP decrement. All1044 width256 helper contacts are replayed
independently through original ROM$AAB5. C's six-child entry, stable pause,
canonical source anchors/trajectories, full arena traversal and fixed wide
state$20 EDGE(RIGHT,+33) run-off are also checked.

## Windows capture controls

F11 in AQZ3 starts a new JSONL capture, cycling A-left /B-right /C-central.
Press F11 before the encounter to capture allocation and camera entry as well.
F12 flushes and stops. Rows flush and close the file every update. Capture files
are `aqz-p4-f-A-left-<id>.jsonl` (or B-right/C-central) in the GameMaker save
sandbox. Native source startup confirmed the path
`C:\Users\james\AppData\Local\SonicChaos_POC\`. The exact absolute path is printed in GameMaker's output when capture
starts/stops; the configured Windows game name is `openSonicSMS`.

Each update records active boss/support slots, canonical WORLD coordinates,
live and cached screen coordinates, camera dimensions/position, state/request,
frame, executed script record versus next record, callback, VX/VY, HP/cooldown,
extents, route endpoints/target, player core flags and instance/mask bounds.
Events include before/after body and projectile helpers with results,
allocation/source/player snapshots, initializer steering selector (cooldown),
and sleep/delete reasons. Records are observations and do not drive gameplay.

Use three fresh captures: stationary far left for several cycles; stationary
far right for several cycles; a short normal central fight. Include low launch
presentation and descending body contact in the Windows comparison.

`verify_aqz_p4_f_diagnostics.js` compares all gameplay state across400 updates
with capture off/on, validates JSONL events and F11/F12, and checks closed file
handles. Optional compiled-runtime argument `-aqz-trace-io-selftest` writes one
separate I/O smoke-test row and prints its absolute path; it never changes the
room or player and is not a real combat capture.

Ring investigation is closed. Shared hurt/lost-ring code is byte-identical to
accepted A. No scatter change or hurt/scatter diagnostic remains in F.

## Delivery checks

Run `verification/run_aqz_p4_f_checks.py`: full accepted-zone/shared P1-P3
regressions, navigation, project hygiene, source/ROM boss oracles, assets,
identity, diagnostics and fixed-width fixtures. Source and freshly extracted
package are compiled and launched separately; both must reach the main loop.
Native I/O self-test results are checked separately from actual combat captures.
Package has one top-level folder and one intended YYP, no ROM/build debris.
The ignored `build/aqz-p4-f/package-report.json` records final verification and
SHA-256. No commit or push; stop for James's Windows acceptance.

Final full regression:88/88 commands PASS, including navigation/hygiene and
P1-P3. Focused P4 validation totals1,309,759 assertions. Source compile/startup
and native diagnostic file I/O passed; fresh extraction is independently
compiled/launched before delivery. Windows combat captures/acceptance remain
pending. These automated results do not replace James's gameplay judgment.
