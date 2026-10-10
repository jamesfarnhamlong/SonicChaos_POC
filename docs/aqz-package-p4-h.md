# AQZ P4 H — sliding upper-salvo envelope

Uncommitted on `poc/aqz-p4-boss-59-5d`, based on accepted P3
`1b089a5fdfa31acc27c8f06866ae66f091c3d455`. Windows acceptance pending.
AQZ canonical data/oracle remains Research `89641f8093e62401cd81f94e6ac889422f600472`.
Research main is `c4c389c28fe686713d9371fb925f60eb4014191c`; AQZ inputs are unchanged.

## Scope

H changes only the width348 upper type$5C salvo. G's lower body routing, attached
left/right $5D missiles, collision, HP/cooldown, full player traversal, child
entrance and locked wide clear camera/run-off are retained. Width256 retains
canonical callbacks numerically; original cache/script tables and artwork are
unchanged. Shared hurt and lost-ring scatter are untouched.

## Explicit GameMaker gameplay adapter

The usable player anchor interval is screenX16..339, a span of323px. The selected
threat band spans256px (eight32px floor blocks), leaving67px of possible sliding
travel. On entry into boss state14, including subsequent salvo repeats, latch:

`L = clamp(floor(playerWorldX) - cameraX - 128, 16, 83)`

The band is `[L, L+256]`: left16..272, middle48..304, right83..339. Selection
happens before the original counter16 setup wait (17 callbacks) and missile allocation. No later
player position is read to select or steer the upper shots.

The script still allocates seven type$5C records in its original order and
update. Parameters0..5 are the six recovered curved re-entry paths. Parameter6
retains its original out-of-view sentinel trajectory and completion role; H
neither invents an eighth projectile nor turns the sentinel into an extra shot.
Original allocation source offsets, delays16/48/80/112/144/176/208, boss rise,
state order and repeating salvo clock are unchanged.

When a real shot receives the existing re-entry signal, assign one floor target:

| Parameter | Floor target relative to L |
|---|---:|
|0|0|
|1|56|
|2|112|
|3|152|
|4|192|
|5|256|

This is deliberately a spread, not six exact-player aims. The nonuniform spacing
accounts for the opposite curved approaches and their actual floor-height
contact intervals. Even spacing leaves gaps at the central/right handover.
The existing combined horizontal contact reach remains20px for these frames.
Sonic can move between shots or leave the selected band.

Original left-side re-entry starts remain EDGE(LEFT,-16); right-side starts
become EDGE(RIGHT,+16), screenX364 instead of272. Top-edge starts remain at their
recovered screenX64/192. Original Y positions, angle table, turn direction,
four-movement-call turn cadence and vertical velocity are retained.

For each shot, integrate that original vertical/angle trajectory to its first
WORLD floor-anchor crossing atY238. Let N be its movement count and Xc its
unadapted horizontal endpoint from the chosen re-entry start. Latch a fixed-point
horizontal velocity bias:

`bias = round((targetWorldX * 256 - Xc) / N)`

Add this same constant bias whenever the original angle table refreshes VX.
VY is untouched. This is an explicit width348 initial-trajectory adapter, not a
canonical missile speed claim. It permits a spread across the wider floor
without changing missile art, collision, forced hurt or vertical timing.
The bias is chosen once; neither the movement nor the turning callback consults
Sonic afterward. Canonical initial emission from the boss remains attached.

## Verification and Windows acceptance

`verify_aqz_p4_h.js` sweeps all324 usable stationary X positions through three
complete upper phases using the actual shipped script scheduler, allocator,
lifecycle and projectile contact helper. Every position is contacted in every
phase. Nine representative positions also run ordinary no-input player/core and
terrain physics until natural projectile hurt/death. Separate checks compare
allocation timing/order, vertical paths, all seven parameters and post-selection
movement without retargeting. G lower-combat and presentation checks remain in
the full regression batch; identity checks compare their functions directly
against the G review package and canonical core against A.

Run `verification/run_aqz_p4_h_checks.py` (also the generic P4 runner), then compile
source and freshly extracted package. The ignored `build/aqz-p4-h/package-report.json`
records exact totals, SHA-256 and native compilation/startup results.

Windows acceptance remains authoritative. Test stationary left, middle and
right positions through repeated upper phases, then move after selection to
confirm a regional spread that can be dodged. No subsequent milestone is started.
