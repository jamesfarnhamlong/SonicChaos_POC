# AQZ P1 F3 — underwater movement modifier audit

Acceptance update: F2 and this source-side audit evidence are now accepted. See [AQZ P1 acceptance](aqz-p1-acceptance.md). The report below preserves its original audit-time status.

## Result

No movement-selector discrepancy found. The proposed dry-acceleration explanation
for James's underwater/skim observation is rejected by the controlled measurements.
No shipping behavior, assets or presentation changed; no F3 gameplay package created.
F2 remains uncommitted and not Windows-accepted as a complete AQZ P1 milestone.
Its visual registration, springs, THZ3 bounce and AQZ3 chain now have Windows approval.
P2 remains untouched.

Branch: `poc/aqz-p1-foundation-water`.
Base: `5d99a38d1f439ac02cd9d3010d09f70cc57aa575`.
Accepted player closure: Research `81b82941e7f44865e0d551484bee82d28d600d43`.
Research working main additionally contains `89641f8` natural spring census;
this audit imports no new behavior from it. Water facts use accepted A2 cache
`POC_notes/rom-cache/aqz/water-runtime.json` and original ROM routines.
Verified ROM SHA-256:
`eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.

## Native measurements

All acceleration/gravity/velocity values below are signed 8.8 integer units, /256.
Both AQZ1 and AQZ2 produced the same dry/wet values.

| Control | Dry | Submerged |
|---|---:|---:|
| Walk/run same-direction base acceleration | +16 | +2 |
| Walk from vx=0, first update | +32 | +4 |
| Executing brake state $07, moving right / holding Left | -32 | -4 |
| First opposing-input update while still executing walk $05 | -16 | -2 |
| Jump $0A / fall $0E / spring $0B same-direction base acceleration | +16 | +4 |
| Those air controls from vx=0, first update | +32 | +8 |
| Ordinary airborne gravity | +48 | +24 |
| Spring $0B gravity | +24 | +12 |
| Attack launch $1B gravity | +36 | +18 |
| Airborne downward Y cap | 1792 | 1024 |

Near zero, the ROM doubles acceleration when `((abs(vx)+128)&65535)>>8 == 0`.
The requested 16/2 and 16/4 are base entries, not the very first rest update.
Braking entered naturally from $05 follows $05(-16/-2) -> $07(-32/-4).
Signed direction entries and neutral drag are separate tables; there is no blanket
water multiplier. The full existing A2 signed-input vectors also pass.

The ordinary horizontal cap remained 1024 (4.0) in these identical-baseline controls,
for dry and water. This does not redefine other power-up/launch maxima.
Existing A2 jump vectors (-1088 dry / -832 water), hurt/death/drowning and vertical
state/cap coverage pass unchanged; no replacement physics selector was introduced.

## Water ownership / native actual-room check

The full-adapter captures run in actual AQZ1 and AQZ2 rooms, with native player
Step and unchanged core attachment, animation, water controllers, object phase
and publication. Only the excluded diagnostic copies use empty terrain, synthetic
flat support, input injection and X retention at 128 to isolate control from route
obstacles. Camera placement accompanies the synthetic player placement, keeping
the canonical screen-death rule active without accidentally invoking it.
Two warm-up updates allow original controller publication before seeding controls.

Measured each update:

- actual attached core zone = 4;
- controller WORLD waterline = 568 / 788;
- WORLD Y vs line is classified before the input routine;
- `cp_c.water` consumed by input = 0 dry / 255 submerged;
- `SCR_cc_input` chooses table 0/1 dry or 3/4 submerged (neutral uses table 2);
- applied acceleration and integrated X match original $4141 / $402A;
- one updater call per actual player update;
- core water survives state/publish; output `global.playerWater` agrees;
- instance Y remains core Y + chaosAnchorOffset.

The shared call order is water/air updater -> control -> X -> Y -> terrain.
`global.playerWater` is output after the core tick; it is not the selector input.
Neither a mismatched adapter field nor a dry-table override was found.

## Threshold / skim correlation

From vx=0, holding Right, first `abs(signed vx high byte) >= 4` after integration:

| Control | Dry update | Submerged update |
|---|---:|---:|
| Ground walk, actual AQZ1 adapter | 60 | 480 |
| Ground walk, actual AQZ2 adapter | 60 | 480 |
| Fixed-state $0A/$0B/$0E/$1B selector controls | 60 | 240 |

These measure the speed predicate, not a bounce event. Walking is not attacking;
air controls isolate their selector and start each tested callback with negative
Y speed. The gate runs before this update's acceleration, so reaching the speed
threshold afterward does not trigger it retroactively. Existing F threshold tests
still match original $4BC0, including negative signed-high-byte asymmetry.
The gate, attack rules and updater order were not changed.

The POC does not reach the threshold early from accidental dry acceleration in
these controls. The reported original-game feel difference remains unresolved;
it is not evidence to tune the gate or maximum speed. Manager can compare the
native traces against original gameplay with matching start state, speed and input.
These controls do not claim a complete original-game route or wall-clock comparison.

## Evidence and verification

Native immutable-F2 selector bench: 16,800 callbacks, 117,600 assertions, 3,013
unique original-Z80 control/integration/gravity cases. Fixed-state air callbacks
are selector controls, not continuous flight. Synthetic support is diagnostic only.

Full adapter: 2,880 actual player updates across eight dry/wet walk/brake runs,
31,688 assertions; 753 unique original-Z80 control/integration cases.
New control assertions total: 149,288. No mismatches.

- Full accepted regression: 75/75 commands PASS.
- Player state/animation: 24,838 assertions PASS.
- Native shared fixtures: 7,625 assertions / 980 updates PASS.
- Native AQZ3 oracle: 480 updates x 13 fields = 6,240 values, zero mismatches.
- Spring: 170,497; terrain-ring: 511,407; attack: 95,991 assertions PASS.
- AQZ water/physics, player assets, footwear, navigation and hygiene PASS.
- `git diff --check` PASS.
- Both diagnostic projects compiled and executed natively.
- 3,699 shipping runtime/resource files remain byte-identical to the F2 archive.

Machine result: `verification/aqz-p1/followup-f3-water/audit-result.json`.
Full-adapter comparison: `full-adapter-summary.json` in that directory.
Manager-friendly combined native data: `full-adapter-controls.csv`.
Raw native per-run JSONL: `aqz1-dry`, `aqz1-wet`, `aqz2-dry`, `aqz2-wet`, plus
`-brake` variants. Selector/gravity bench: `native-controls.jsonl` and `summary.json`.
CSV velocities/accelerations are integer /256, not pixels per second.

Reproduction tools:
`verification/prepare_aqz_p1_f3_water_native.py`,
`verification/verify_aqz_p1_f3_water_native.py`,
`verification/prepare_aqz_p1_f3_water_live.py`,
`verification/verify_aqz_p1_f3_water_live.py`.
They use the immutable F2 ZIP and excluded `build/aqz-p1/F3-water-*` projects.
Verifier Python needs the Research Z80 package path; no ROM bytes are published.

Stop for Manager/Windows comparison. No commit. No P2 work.
