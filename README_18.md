# Sonic Chaos Act 1 POC 18.4

POC 18 is the first post-research integration pass after POC 17.4. It keeps the accepted movement, ramp, loop, twist, spring, spike and platform baselines while integrating the completed numeric type `$10`, `$21`, and `$27` studies.

POC 18.1 incorporated the first Windows-test feedback: spring-cell compositing was corrected without exposing the black clear plane, ring-frame transparent pixels were normalized, verified type `$18` goal-sign graphics were added, and the F4-F7 debug warp shortcuts were removed. POC 18.2 retained the Windows-confirmed spring fix and floor-aligned the verified type `$18` presentation. POC 18.3 removed permanent ring artwork baked into the flattened terrain beneath the 142 collectible objects. POC 18.4 closes the two Task 05 integration blockers: selector-dependent type `$10` frame `$0B` graphics and the bounded 32-frame type `$05` presentation for selector `$06`. It also corrects the stale ring-verifier assertion while retaining the accepted Draw adapter.

## Coordination baseline

- Starting POC `main`: `231aeaf6d898ec572ee803609ac9a4f9bf97f392` (`Sonic Chaos Act 1 POC 18.3`).
- Reference `main`: `918b39b5f996ff9bfd553415e1319e5cb8c88d59`.
- Canonical Task 05 inputs: `STATUS.md`, `docs/thz1-closure-audit.md`, `docs/object-10.md`, `data/rom-cache/thz1/closure-audit.json`, `object-10.json`, `object-10-graphics.json`, and `tools/thz1_object_10_graphics.py`.

## ROM/reference verified

- The THZ1 census has 53 raw object records. The 24 raw type-`$09` records remain separate from the 142 layout-derived ring positions.
- Type `$10` has five placements with parameters `$06/$06/$04/$04/$02`. Interaction requires `$D503.1`; successful top/side contact also requires downward Y velocity. Bottom contact launches player and object apart without consumption. Successful contact awards `10 00 00`, queues the exact numeric parameter effect, and converts to `$0F`.
- Type `$21` has six placements. Its parameter is a leftward patrol span of `parameter * 16`, initial velocity is `(-$0080,+$0200)`, top contact launches at `$F940`, ordinary side contact requests damage, and attack/power `$06` contact converts to `$0F` with score bytes `10 00 00`.
- Type `$27` has three mirrored placements, X velocity `$FD80`, strict `<64` activation after movement, 65 add and 64 subtract callbacks, 129 total oscillation callbacks, and strict `>=384` removal. Ordinary overlap does not request damage and stalls the callback.
- Canonical semantic names for `$10/$21/$27` remain unresolved. Numeric names are retained.
- Task 05 proves that type `$10` frame `$0B` exposes selector-dependent tiles `$4C-$51`, while frame `$0C` is fixed. Selector `$02/$04/$06` frame-`$0B` RGBA hashes are respectively `2bb087b4...b3b6d`, `4e142bbe...abc4`, and `3790c8be...24f0`; all use fixed frame-`$0C` hash `9571cc57...3a7`.
- Type `$05` parameter zero has exactly 32 visible frames `$01-$20`, one 8×16 piece per frame, using only preloaded common tiles `$20/$22`. Its exact original special-render anchor remains unresolved.

## POC implementation

- `POC_notes/extract_chaos.py` treats spring blocks `$30/$31/$33/$36/$38` as foreground cells and derives each flattened cell's backdrop from its immediate cardinal boundary. This preserves an opaque GameMaker terrain bitmap while preventing both the old cyan rectangle and the POC 18 black clear-plane rectangle.
- The `$31` cell at world `(2112,832)` / terrain-2 local `(64,832)` now has 856 context-blue backdrop pixels and 168 spring pixels, all opaque. Spring artwork and placement are unchanged.
- All six existing `SPR_ring` frames retain their artwork and original `image_speed = 0.25` animation. Windows testing established that the moving object was correct: layout blocks `$40/$41/$42/$43` also contained a static copy of the ring artwork in the flattened terrain. `POC_notes/extract_chaos.py` now treats those four block classes as object-only foreground, replaces their 72 terrain cells with the verified background plane, and preserves all 142 separately decoded collectible positions.
- Type `$21` uses six exact placements, ROM-derived frames `$01/$02`, signed 8.8 movement, strict patrol reversal, decoded terrain floor profiles, mirrored orientation, top bounce, side damage, defeat, and bounded placement recreation.
- Type `$27` no longer inherits generic badnik damage. Its strict boundaries, exact oscillation, ordinary-contact stall, defeat, and recreation paths follow the formal audit.
- Type `$10` keeps its five exact records and accepted contact/reward code unchanged. `$02` uses `SPR_chaos_object_10`, `$04` uses `SPR_chaos_object_10_04`, and `$06` uses `SPR_chaos_object_10_06`. In each resource frame 0 is exact ROM frame `$0B`; frame 1 is the same fixed ROM frame `$0C`. The existing two-frame cadence is unchanged.
- `SPR_chaos_object_05` contains all 32 exact mapping presentations. `OBJ_chaos_object_05_effect` is created only by numeric selector `$06`, remains a singleton, follows the active player as a clearly labelled POC presentation anchor, and ends with the existing `$06` power-code timer. It is not placed at the consumed type-`$10` coordinates and adds no gameplay mechanics.
- The committed `OBJ_ring/Draw_0.gml` remains an accepted POC presentation adapter: THZ1 draws `SPR_ring` with integer `chaosTHZFrame` at the object's current `x,y`, while other rooms use `draw_self()`. Verification now checks that adapter instead of incorrectly demanding its absence.
- Type `$18` remains placed at the verified `(3960,558)` coordinate with the five ROM-derived dynamic frames. Its presentation is drawn 22 pixels lower at the decoded local ground surface (`y=580`), without changing the canonical room record. Before completion it displays verified state-3 frame `$01`; the existing POC completion adapter selects the verified state-4 frame sequence. This does not claim that the POC trigger is original behavior.
- F4-F7 lift/loop/reverse warp shortcuts and their placement helper are removed. R restart and F3 diagnostics remain.
- Generic occupancy is represented by bounded room-instance adapters: ordinary off-range cleanup resets a placement; a consumed/defeated instance is destroyed for the loaded room.

## Files and resources changed

- Terrain pipeline/cache: `POC_notes/extract_chaos.py`, terrain root/layer PNGs, `terrain-assets.json`, and cache manifest.
- Metadata/art: canonical `object-10-graphics.json`, import manifest `object-10-poc-assets.json`, updated `thz1-object-sprites.json`, and cache manifest.
- POC 18.4 resources: updated selector-`$02` `SPR_chaos_object_10`; new `SPR_chaos_object_10_04`, `SPR_chaos_object_10_06`, `SPR_chaos_object_05`, and `OBJ_chaos_object_05_effect`.
- Deterministic pipeline: `POC_notes/import_type10_graphics.py` consumes the output of reference `tools/thz1_object_10_graphics.py`, verifies the canonical ROM/palette/RGBA hashes, and emits GameMaker root/layer PNG pairs and metadata.
- Reconciled resources: `OBJ_chaos_object_27`, `SCR_chaos_adapter`, `OBJ_chaos_controls`, THZ1 room instances, project resources, and verification/package scripts.

## Automated verification

- 15,660 movement-core fixture cases pass.
- All 112 twist dispatch entries and 1,078 twist entry/boundary cases pass.
- Selected original-Z80 type `$26/$1B` checks pass (30 comparisons).
- Original-Z80 type `$27` initialization, acceleration, underflow, and strict 383/384 removal checks pass.
- Twenty-one canonical reference unit tests for `$10/$21/$27` and animation-command reachability pass.
- Layout checks confirm 5 type-`$10`, 6 type-`$21`, 3 type-`$27`, 4 moving spikes, 4 static spikes, 6 platforms, 9 terrain springs, and 142 separate layout rings, with zero legacy layout-monitor instances.
- POC 18.4 checks additionally prove the three exact selector-`$0B` hashes, one shared `$0C`, unchanged type-`$10` contact source, 32 exact type-`$05` frame reconstructions using only `$20/$22`, selector-`$06`-only singleton activation, player-relative adapter labelling, and the accepted ring Draw structure.

## Windows gameplay observed

The first POC 18 Windows run built and reached THZ1. The tester reported the new badnik behavior, spring impulses, and general physics as good. POC 18.1 testing confirmed the spring boxes were fixed and the type-`$18` animation worked. POC 18.2 confirmed the goal post was floor-aligned. POC 18.3 removed the flat terrain copies under rings. POC 18.4 now requires Windows confirmation of the newly integrated type-`$10/$05` presentation and regression route.

The five type-`$10` anchors and mapping extents were also audited after a report that a center-stage instance appeared to float. Every placement uses the verified ROM mapping bounds `x=-12..+11`, `y=-24..+7`; the recovered floor callback settles the object anchor 18 pixels above a surface, leaving the same 11-pixel visual separation at floor-backed placements. No placement-specific offset was introduced because that relationship is consistent with the formal mapping and controlled landing trace.

## Still unresolved / deliberately held

- Full original animation/state scheduling remains absent; spring-flight and post-loop/twist rolling presentation can differ.
- Original type `$18` completion/contact/lifetime logic remains held. The verified presentation is connected to the pre-existing bounded POC completion adapter, not promoted as original behavior.
- Type `$09` records were not collapsed into layout-derived rings.
- Type `$28` retains the bounded platform adapter; aux1 was not reinterpreted as an art base.
- The exact original type `$05` special-render anchor remains future fidelity. The player-relative position is explicitly a POC adapter. Parameters `$02/$04/$06` and type `$05` retain numeric identities.

## Closure gate

- Blocker 1 — selector-dependent type `$10` tiles `$4C-$51`: **RESOLVED** in source and automated pixel verification.
- Blocker 2 — selector-`$06` type `$05` 32-frame visible effect: **RESOLVED** using the bounded player-relative presentation adapter.
- Ring verifier contradiction: **RESOLVED**; the accepted Draw adapter is now positively verified.
- Automated candidate classification: **THZ1 POC READY WITH DOCUMENTED ADAPTERS**. This is not `THZ1 POC RESEARCH-CLOSED`, and Windows acceptance remains required.

## Windows acceptance checklist

1. Fresh extraction builds and enters THZ1.
2. All five type `$10` objects remain at `(656,846)`, `(1712,494)`, `(336,270)`, `(1472,110)`, and `(2688,686)`.
3. The two `$06` instances visibly use the same `$06` selected content.
4. The two `$04` instances visibly use the same `$04` selected content.
5. The `$02` instance visibly uses the `$02` selected content.
6. The three numeric selector presentations visibly differ where their ROM frame `$0B` differs.
7. Selected content appears only in `$0B`; alternating `$0C` remains the same fixed frame for all three.
8. No cyan, green, or black rectangle surrounds type `$10`.
9. Breaking `$06` activates the 32-frame type `$05` presentation.
10. Type `$05` follows the player-relative bounded POC anchor and is never drawn at the consumed object position; breaking another `$06` while active does not create uncontrolled duplicates.
11. `$02` and `$04` never activate type `$05`.
12. Type `$0F` destruction still works.
13. The existing numeric `$06` reward behavior remains unchanged.
14. Rings show one animated copy, no trail, and no flat terrain duplicate after collection.
15. The spring-box fix remains intact.
16. Type `$21/$27/$18`, spikes, platforms, loops, twist and first ramp show no obvious regression.
17. R restart and F3 diagnostics still work.
18. F4-F7 remain disabled.
