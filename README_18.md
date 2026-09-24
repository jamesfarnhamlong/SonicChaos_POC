# Sonic Chaos Act 1 POC 18.3

POC 18 is the first post-research integration pass after POC 17.4. It keeps the accepted movement, ramp, loop, twist, spring, spike and platform baselines while integrating the completed numeric type `$10`, `$21`, and `$27` studies.

POC 18.1 incorporated the first Windows-test feedback: spring-cell compositing was corrected without exposing the black clear plane, ring-frame transparent pixels were normalized, verified type `$18` goal-sign graphics were added, and the F4-F7 debug warp shortcuts were removed. POC 18.2 retained the Windows-confirmed spring fix and floor-aligned the verified type `$18` presentation. POC 18.3 removes the actual ring fault: permanent ring artwork baked into the flattened terrain beneath the 142 collectible objects.

## Coordination baseline

- Starting POC `main`: `a3b03825e600bc71279a0386b8c1d5f9bce81441` (`SonicChaos_Act1_POC_17_4`).
- Starting reference `main`: `7d3efe86128eacd97ace4b6bc87b1fb247f8e9ad`.
- Reference refreshed after Task 04 merged: `232ca2c47772c39d15929ebb8979d3965a497e32`.
- Canonical documents used: `STATUS.md`, `docs/object-10.md`, `docs/object-21.md`, `docs/object-27.md`, and `docs/thz1-object-census.md`.

## ROM/reference verified

- The THZ1 census has 53 raw object records. The 24 raw type-`$09` records remain separate from the 142 layout-derived ring positions.
- Type `$10` has five placements with parameters `$06/$06/$04/$04/$02`. Interaction requires `$D503.1`; successful top/side contact also requires downward Y velocity. Bottom contact launches player and object apart without consumption. Successful contact awards `10 00 00`, queues the exact numeric parameter effect, and converts to `$0F`.
- Type `$21` has six placements. Its parameter is a leftward patrol span of `parameter * 16`, initial velocity is `(-$0080,+$0200)`, top contact launches at `$F940`, ordinary side contact requests damage, and attack/power `$06` contact converts to `$0F` with score bytes `10 00 00`.
- Type `$27` has three mirrored placements, X velocity `$FD80`, strict `<64` activation after movement, 65 add and 64 subtract callbacks, 129 total oscillation callbacks, and strict `>=384` removal. Ordinary overlap does not request damage and stalls the callback.
- Canonical semantic names for `$10/$21/$27` remain unresolved. Numeric names are retained.

## POC implementation

- `POC_notes/extract_chaos.py` treats spring blocks `$30/$31/$33/$36/$38` as foreground cells and derives each flattened cell's backdrop from its immediate cardinal boundary. This preserves an opaque GameMaker terrain bitmap while preventing both the old cyan rectangle and the POC 18 black clear-plane rectangle.
- The `$31` cell at world `(2112,832)` / terrain-2 local `(64,832)` now has 856 context-blue backdrop pixels and 168 spring pixels, all opaque. Spring artwork and placement are unchanged.
- All six existing `SPR_ring` frames retain their artwork and original `image_speed = 0.25` animation. Windows testing established that the moving object was correct: layout blocks `$40/$41/$42/$43` also contained a static copy of the ring artwork in the flattened terrain. `POC_notes/extract_chaos.py` now treats those four block classes as object-only foreground, replaces their 72 terrain cells with the verified background plane, and preserves all 142 separately decoded collectible positions.
- Type `$21` uses six exact placements, ROM-derived frames `$01/$02`, signed 8.8 movement, strict patrol reversal, decoded terrain floor profiles, mirrored orientation, top bounce, side damage, defeat, and bounded placement recreation.
- Type `$27` no longer inherits generic badnik damage. Its strict boundaries, exact oscillation, ordinary-contact stall, defeat, and recreation paths follow the formal audit.
- Type `$10` replaces four old layout-art-derived sample monitor instances with the five exact object records. It uses ROM-derived frames `$0B/$0C` and replacement frames `$07/$08/$09`. Numeric effects are dispatched without item names. The verified type-`$05` allocation contract is recorded, but no unverified type-`$05` presentation was invented.
- Type `$18` remains placed at the verified `(3960,558)` coordinate with the five ROM-derived dynamic frames. Its presentation is drawn 22 pixels lower at the decoded local ground surface (`y=580`), without changing the canonical room record. Before completion it displays verified state-3 frame `$01`; the existing POC completion adapter selects the verified state-4 frame sequence. This does not claim that the POC trigger is original behavior.
- F4-F7 lift/loop/reverse warp shortcuts and their placement helper are removed. R restart and F3 diagnostics remain.
- Generic occupancy is represented by bounded room-instance adapters: ordinary off-range cleanup resets a placement; a consumed/defeated instance is destroyed for the loaded room.

## Files and resources changed

- Terrain pipeline/cache: `POC_notes/extract_chaos.py`, terrain root/layer PNGs, `terrain-assets.json`, and cache manifest.
- Metadata/art: canonical `object-10.json`, `object-21.json`, `object-27.json`, corrected `object-records.json`, `object-census.json`, expanded `thz1-object-sprites.json`, and `object-18-graphics.json`.
- New resources: `SPR_chaos_object_10`, `SPR_chaos_object_0F`, `SPR_chaos_object_18`, `SPR_chaos_object_21`, `OBJ_chaos_object_10`, `OBJ_chaos_object_18`, and `OBJ_chaos_object_21`.
- Reconciled resources: `OBJ_chaos_object_27`, `SCR_chaos_adapter`, `OBJ_chaos_controls`, THZ1 room instances, project resources, and verification/package scripts.

## Automated verification

- 15,660 movement-core fixture cases pass.
- All 112 twist dispatch entries and 1,078 twist entry/boundary cases pass.
- Selected original-Z80 type `$26/$1B` checks pass (30 comparisons).
- Original-Z80 type `$27` initialization, acceleration, underflow, and strict 383/384 removal checks pass.
- Twenty-one canonical reference unit tests for `$10/$21/$27` and animation-command reachability pass.
- Layout checks confirm 5 type-`$10`, 6 type-`$21`, 3 type-`$27`, 4 moving spikes, 4 static spikes, 6 platforms, 9 terrain springs, and 142 separate layout rings, with zero legacy layout-monitor instances.
- POC 18.3 checks confirm the `$27` 129-callback trajectory and `$0003` displacement, all `$21` bounds, the exact `$18` placement and five graphics frames, the 22-pixel type-`$18` presentation offset, all 72 ring-bearing terrain cells reduced to background-only pixels, all 142 ring objects preserved with their original animation, resource paths/layer copies, opaque context-composited spring cells, removal of F4-F7 warps, and no ROM files in the package.

## Windows gameplay observed

The first POC 18 Windows run built and reached THZ1. The tester reported the new badnik behavior, spring impulses, and general physics as good. POC 18.1 testing confirmed the spring boxes were fixed and the type-`$18` animation worked. POC 18.2 confirmed the goal post was floor-aligned and established that the rings were not leaving animation trails: a correct animated ring was drawn over a permanent flat terrain copy. POC 18.3 removes those terrain copies and restores the unmodified ring animation path. Numeric type-`$10` box/physics behavior remains present, while its unresolved child/icon presentation remains absent.

The five type-`$10` anchors and mapping extents were also audited after a report that a center-stage instance appeared to float. Every placement uses the verified ROM mapping bounds `x=-12..+11`, `y=-24..+7`; the recovered floor callback settles the object anchor 18 pixels above a surface, leaving the same 11-pixel visual separation at floor-backed placements. No placement-specific offset was introduced because that relationship is consistent with the formal mapping and controlled landing trace.

## Still unresolved / deliberately held

- Full original animation/state scheduling remains absent; spring-flight and post-loop/twist rolling presentation can differ.
- Original type `$18` completion/contact/lifetime logic remains held. The verified presentation is connected to the pre-existing bounded POC completion adapter, not promoted as original behavior.
- Type `$09` records were not collapsed into layout-derived rings.
- Type `$28` retains the bounded platform adapter; aux1 was not reinterpreted as an art base.
- Type `$10`'s allocated type `$05` child remains unpresented because its full behavior is unresolved. Parameters `$02/$04/$06` retain numeric names; no “rocket shoes” identity or extra behavior is claimed.

## Windows acceptance checklist

1. Extract into a new folder, open `SonicChaos_POC.yyp` in GameMaker LTS 2026, build, and reach THZ1.
2. Spot-check terrain springs with F3 off. POC 18.1 Windows testing confirmed the box fix; verify it remains unchanged, including the red `$31` spring at `(2112,832)`.
3. With F3 on, confirm only the thin sampled-tile outline appears.
4. Confirm static spikes `(1504,832)`, `(1536,832)`, `(2208,832)`, `(2240,832)` still damage and adjacent terrain is unchanged.
5. Confirm moving spikes `(1344,864)`, `(1936,864)`, `(2464,864)`, `(2912,864)` remain floor aligned, reveal roughly 18/24/30/32 pixels, and damage only while rising/raised.
6. Confirm all six type-`$21` placements; patrol spans differ by parameter, floor following/reversal work, top contact bounces, side contact damages, and attack defeat works.
7. Confirm all three type-`$27` placements; right-to-left movement, stop/oscillate/resume, no ordinary-overlap damage, and attack destruction work.
8. Confirm every ring has only one visible copy: the animated collectible. Collect representative rings and verify no flat ring remains in the terrain. Confirm cadence, placement, camera movement, and collection remain unchanged.
9. Confirm all five type-`$10` placements and parameters. Ordinary overlap does nothing; a qualifying downward rolling/attack top or side hit converts to `$0F`; a bottom hit launches player/object apart without consumption; test the distinct numeric `$02/$04/$06` effects without naming them.
   Also compare the five instances' vertical presentation. Their shared mapping/floor relationship is ROM-derived; report any placement that differs from the others rather than judging one in isolation.
10. Confirm the type `$18` goal-sign room placement remains `(3960,558)`, its sprite now sits on the ground at presentation Y `580`, and it still cycles through its ROM-derived frames when the existing POC completion adapter fires. Do not treat that trigger as a validation of original completion logic.
11. Confirm F4-F7 no longer warp Sonic. R restart and F3 diagnostics should still work.
12. Run the regression route: opening ramp, upright spring, loop 1, loop 2, twist strip, platforms, lower route, upper route, and end of reachable Act 1.
