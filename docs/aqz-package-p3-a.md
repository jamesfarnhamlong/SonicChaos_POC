# AQZ P3 A — canonical numeric enemies $3C/$3D

Uncommitted Windows acceptance candidate on `poc/aqz-p3-enemies-3c-3d` in
`SonicChaos_POC_aqz_p3`, based exactly on accepted P2
`d4705ce63ddafcfcab663c5bc75da493cdd297bd`. Canonical Research main:
`89641f8093e62401cd81f94e6ac889422f600472`. No P4 implementation.

The loader registers all 11 $3C and 19 $3D placements from the existing canonical
AQZ rows. No anchors, room placements, water/player physics or P2 platform
callbacks change. Reproducible importer `POC_notes/generate_aqz_p3.py` pins the
Research commit, verifies the local-only Europe v1.2 ROM hash and imports the
approved SAT compositions and decoded scripts. Frames use the existing indexed
AQZ palette and +(1,18) SAT registration, without a collision offset or bitmap flip.

$3C uses four 4px movement callbacks, 32-callback dwells and opposite parameter0/1
cycles (parameter1 shifts the runtime anchor +12 once; saved placement stays
unchanged). Movement and animation continue asleep. Contact follows movement,
requires the shared even VBlank-phase adapter and stages $630B forced hurt.
Attack cannot defeat it; the shared next player pass owns selector6/blink/hurt
handling. There is no water physics.

$3D parameters0/4/8 decrement only during initialization, followed by a request1
callback. State1/2 set X speed +/-192/256 and Y -512/256. Active callbacks return
asleep; otherwise shared contact comes first and any overlap ends the callback.
Then dwell decrements or gravity24/256 and integration run. Descending integerY
compares inclusively with saved WORLD originY and starts 32 callbacks of dwell.
Positions/fractions and overshoot survive relaunch. No natural state3 transition,
waterline read, buoyancy, drag, terrain probe or terminal-speed cap is introduced.

Both use the existing AQZ 19-slot scheduler, mapped slots7..17 and first-free
allocation. Callback sees prior sleep; canonical generic lifecycle follows it;
creation follows the slot pass on the existing fourth-update scan. No new
widescreen retention rule. Outside-window deletion passes FE->FF->free, releases
occupancy and permits fresh creation. $3D attack/selector6 defeat retains spent
placement occupancy and keeps its slot through shared parameter-zero smoke.
Rebound/damage remain staged for the next shared player pass. Smoke reuses the
accepted shared poof art and renderer registration; conversion shows the enemy
frame once. P4 boss types remain excluded.

Verification executes shipping GML: 224,050 assertions, 7,200 original-Z80
callback rows, 5,399 natural loader/scheduler rows, original contact/origin/sleep
boundaries plus exhaustive movement-flag/selector/geometry sweeps. One AQZ2 #10
natural fixture starts already live; its exported first row is an input snapshot,
then the remaining179 rows are compared. Callback-time synthetic camera controls
are reconstructed from the canonical fixture driver: recorded end-of-update
camera values are not substituted. Original IRQ/loader phases are oracle inputs;
this does not claim a CPU/IRQ emulator in GameMaker. Historical compiled player
registration evidence is rechecked by the accepted P1 batch, not a fresh P3 capture.

Assets/cache/P2 preservation: 32,823 assertions. Research A4: 9 focused methods,
177,802 original-routine assertions and 15,032 game fixture rows (not POC replay
assertions). Complete batch: **81/81 commands PASS**, including navigation, project hygiene,
accepted P1/P2 regressions and Research A3/A4. Source/fresh compile evidence is saved under
`build/aqz-p3`; release SHA-256 is in the adjacent release report. The broad THZ3
reproducibility check now normalizes CRLF/LF text before hashing generated GML;
its semantic equality and Research cache identity checks remain intact.

Reproduce (Research venv Python, bundled Pillow site-packages on PYTHONPATH):

```
POC_notes/generate_aqz_p3.py --research ../sonic-chaos-reference-work --rom LOCAL_ROM
verification/run_aqz_p3_checks.py
verification/package_aqz_p3.py
```

Package: `releases/SonicChaos_AQZ_P3_20261009_A.zip`, one top-level project,
one intended `.yyp`, no ROMs, backup projects, parked work or build debris.
Each extracted file is byte-checked; source and fresh extraction must compile
with `Igor complete.` and launch through the runtime main loop.

Stop uncommitted for James's Windows acceptance. Compare both $3C orientations
and 16px travel, forced hurt while attacking, $3D staggered initialization,
opposite hops/dwell, ordinary damage and attack/invincibility defeat, and
sleep/backtrack/recreation. Do not start P4.

AGENTS candidate after acceptance: P3 adds canonical $3C/$3D from P2 d4705ce;
$3C is forced-hurt-only and moves asleep; $3D parameters are initializer delays
and uses saved WORLD originY, with spent defeat occupancy. Manager consolidates
only after Windows acceptance.
