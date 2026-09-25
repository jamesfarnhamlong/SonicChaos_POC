# Sonic Chaos Act 1 POC 18.5

POC 18 is the first post-research integration pass after POC 17.4. It keeps the accepted movement, ramp, loop, twist, spring, spike and platform baselines while integrating the completed numeric type `$10`, `$21`, and `$27` studies.

POC 18.1 incorporated the first Windows-test feedback: spring-cell compositing was corrected without exposing the black clear plane, ring-frame transparent pixels were normalized, verified type `$18` goal-sign graphics were added, and the F4-F7 debug warp shortcuts were removed. POC 18.2 retained the Windows-confirmed spring fix and floor-aligned the verified type `$18` presentation. POC 18.3 removed permanent ring artwork baked into the flattened terrain beneath the 142 collectible objects. POC 18.4 closes the two Task 05 integration blockers: selector-dependent type `$10` frame `$0B` graphics and the bounded 32-frame type `$05` presentation for selector `$06`. It also corrects the stale ring-verifier assertion while retaining the accepted Draw adapter.

POC 18.5 integrates the bounded Task 06 Windows-discrepancy audit: recovered player state `$11`, the exact lower-half side profile for the four fixed `$3D` spike cells, and integer-anchor contact for type `$21`. Type `$10` floating presentation is verified canonical and intentionally unchanged.

## Coordination baseline

- Starting POC `main`: `acf154b76b2145099c7c9155c280b660b96299ca` (POC 18.4; its commit title accidentally says POC 18.3).
- Actual reference `main`: `65670d29295d87d71109b1983206a74f2bbeeb6a`.
- The requested Task 06 coordination commit is `479990227e48543a853cdd36f52365cb5cc1536a`. At implementation time it was a child of `65670d2` on `origin/research/thz1-windows-discrepancies`, not an ancestor of `main`. No unmerged implementation evidence was consumed: the audited documents and deterministic cache were already present on `main`, whose `STATUS.md` marks Task 06 complete.
- Canonical Task 05 inputs: `STATUS.md`, `docs/thz1-closure-audit.md`, `docs/object-10.md`, `data/rom-cache/thz1/closure-audit.json`, `object-10.json`, `object-10-graphics.json`, and `tools/thz1_object_10_graphics.py`.
- Canonical Task 06 inputs from reference `main`: `docs/thz1-windows-discrepancies.md`, `docs/player-state-11.md`, and `data/rom-cache/thz1/windows-discrepancies.json` (POC cache SHA-256 `ff44a01015a78140031b1a31c52d89b50cc97540e90836d72917f49cd97f9e3f`).

## ROM/reference verified

- The THZ1 census has 53 raw object records. The 24 raw type-`$09` records remain separate from the 142 layout-derived ring positions.
- Type `$10` has five placements with parameters `$06/$06/$04/$04/$02`. Interaction requires `$D503.1`; successful top/side contact also requires downward Y velocity. Bottom contact launches player and object apart without consumption. Successful contact awards `10 00 00`, queues the exact numeric parameter effect, and converts to `$0F`.
- Type `$21` has six placements. Its parameter is a leftward patrol span of `parameter * 16`, initial velocity is `(-$0080,+$0200)`, top contact launches at `$F940`, ordinary side contact requests damage, and attack/power `$06` contact converts to `$0F` with score bytes `10 00 00`.
- Type `$27` has three mirrored placements, X velocity `$FD80`, strict `<64` activation after movement, 65 add and 64 subtract callbacks, 129 total oscillation callbacks, and strict `>=384` removal. Ordinary overlap does not request damage and stalls the callback.
- Canonical semantic names for `$10/$21/$27` remain unresolved. Numeric names are retained.
- Task 05 proves that type `$10` frame `$0B` exposes selector-dependent tiles `$4C-$51`, while frame `$0C` is fixed. Selector `$02/$04/$06` frame-`$0B` RGBA hashes are respectively `2bb087b4...b3b6d`, `4e142bbe...abc4`, and `3790c8be...24f0`; all use fixed frame-`$0C` hash `9571cc57...3a7`.
- Type `$05` parameter zero has exactly 32 visible frames `$01-$20`, one 8×16 piece per frame, using only preloaded common tiles `$20/$22`. Its exact original special-render anchor remains unresolved.
- State `$11` uses signed 8.8 vertical control: UP subtracts `$0040`, DOWN adds `$0040`, neutral approaches zero by `$0020`, and the verified clamps are ±`$0400`. Shared horizontal movement remains active with maximum `$0700`; the 192-line viewport clamps its anchor to camera Y +25/+191. Timer expiry requests falling state `$0E` at Y velocity `+$0100`; valid damage cancels numeric power `$04`.
- Fixed spike block `$3D` has flags `$85`, a flat floor at Y 848, no side extent in local rows 0–15, and full side extent in rows 16–31. Damage belongs only to the established floor-contact hazard path.
- Type `$21` contact is equality-inclusive at `abs(dx) <= 20` and `-26 <= dy <= 18`, using integer core/object anchors. `dy <= -4` bounces before attack tests; lower contact damages or defeats according to the verified attack/selector rules. It is never a solid wall.
- All five type `$10` placements use their exact ROM Y anchors. The visible air below them is canonical.

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
- State `$11` is integrated directly into `SCR_chaos_core`: exact vertical arithmetic, shared horizontal/terrain movement, gameplay-coordinate viewport limits, action suppression, timer exit, and damage cancellation. The inherited project lacks exact ROM player frames `$38/$39/$3A`; `SPR_player_falling` is therefore used as an explicitly documented non-rolling presentation adapter while `state11_frame` preserves the exact `8×$38, 4×$39, 8×$3A, 4×$39` schedule.
- The four full-cell `OBJ_CHAOS_mask_12` instances at `(1504,832)`, `(1536,832)`, `(2208,832)`, and `(2240,832)` were removed. Only block `$3D` / kind `$05` is admitted to ordinary side-profile projection; other kind-5 side cases remain bounded as unsupported.
- Type `$21` now uses `floor(core.xu/256)`, `floor(core.yu/256)`, and its fixed-point object anchor for contact. Animated `bbox_*` values no longer affect its ROM classification.

## Files and resources changed

- Terrain pipeline/cache: `POC_notes/extract_chaos.py`, terrain root/layer PNGs, `terrain-assets.json`, and cache manifest.
- Metadata/art: canonical `object-10-graphics.json`, import manifest `object-10-poc-assets.json`, updated `thz1-object-sprites.json`, and cache manifest.
- POC 18.4 resources: updated selector-`$02` `SPR_chaos_object_10`; new `SPR_chaos_object_10_04`, `SPR_chaos_object_10_06`, `SPR_chaos_object_05`, and `OBJ_chaos_object_05_effect`.
- Deterministic pipeline: `POC_notes/import_type10_graphics.py` consumes the output of reference `tools/thz1_object_10_graphics.py`, verifies the canonical ROM/palette/RGBA hashes, and emits GameMaker root/layer PNG pairs and metadata.
- Reconciled resources: `OBJ_chaos_object_27`, `SCR_chaos_adapter`, `OBJ_chaos_controls`, THZ1 room instances, project resources, and verification/package scripts.
- POC 18.5 changes: `SCR_chaos_core`, `SCR_chaos_adapter`, type `$10/$21` Step adapters, `OBJ_chaos_controls`, the THZ1 room, `windows-discrepancies.json`, its cache manifest entry, Task 06 verification scripts/results, package verification, and this handover.

## Automated verification

- 15,660 movement-core fixture cases pass.
- All 112 twist dispatch entries and 1,078 twist entry/boundary cases pass.
- Selected original-Z80 type `$26/$1B` checks pass (30 comparisons).
- Original-Z80 type `$27` initialization, acceleration, underflow, and strict 383/384 removal checks pass.
- Twenty-one canonical reference unit tests for `$10/$21/$27` and animation-command reachability pass.
- Layout checks confirm 5 type-`$10`, 6 type-`$21`, 3 type-`$27`, 4 moving spikes, 4 static spikes, 6 platforms, 9 terrain springs, and 142 separate layout rings, with zero legacy layout-monitor instances.
- POC 18.4 checks additionally prove the three exact selector-`$0B` hashes, one shared `$0C`, the preserved type-`$10` reward path, 32 exact type-`$05` frame reconstructions using only `$20/$22`, selector-`$06`-only singleton activation, player-relative adapter labelling, and the accepted ring Draw structure. POC 18.5 only suppresses the stale inherited rolling/attack flag while state `$11` is active.
- Task 06 executes the shipped core for six vertical-control cases, shared left/right movement, action suppression, both viewport clamps, falling-state expiry, the exact 24-update numeric animation schedule, and 128 `$3D` side-profile edge projections. Integration checks prove four removed masks, all recovered type `$21` overlap boundaries/branches, damage cancellation wiring, unchanged moving type `$1B`, and unchanged type `$10` coordinates/art.

## Windows gameplay observed

The first POC 18 Windows run built and reached THZ1. The tester reported the new badnik behavior, spring impulses, and general physics as good. POC 18.1 testing confirmed the spring boxes were fixed and the type-`$18` animation worked. POC 18.2 confirmed the goal post was floor-aligned. POC 18.3 removed the flat terrain copies under rings. POC 18.4 Windows testing confirmed the type-`$10` icons and invincibility state; its feedback exposed the missing state `$11`, fixed-spike mask discrepancy, and animated-bbox type `$21` approximation addressed here.

The five type-`$10` anchors and mapping extents were formally audited after the floating-object report. The first four floor-adjacent placements retain 10 empty scanlines before the collision surface; the `$02` placement is intentionally much more suspended. No placement, origin, settling, or drawing offset was changed.

POC 18.5 Windows acceptance remains pending.

## Still unresolved / deliberately held

- Full original animation/state scheduling remains absent; spring-flight and post-loop/twist rolling presentation can differ.
- Original type `$18` completion/contact/lifetime logic remains held. The verified presentation is connected to the pre-existing bounded POC completion adapter, not promoted as original behavior.
- Type `$09` records were not collapsed into layout-derived rings.
- Type `$28` retains the bounded platform adapter; aux1 was not reinterpreted as an art base.
- The exact original type `$05` special-render anchor remains future fidelity. The player-relative position is explicitly a POC adapter. Parameters `$02/$04/$06` and type `$05` retain numeric identities.
- Exact original state-`$11` player artwork is unavailable in current POC resources. Its movement/state contract and numeric frame schedule are canonical; the visible falling sprite is a POC presentation adapter.

## Closure gate

- Blocker 1 — selector-dependent type `$10` tiles `$4C-$51`: **RESOLVED** in source and automated pixel verification.
- Blocker 2 — selector-`$06` type `$05` 32-frame visible effect: **RESOLVED** using the bounded player-relative presentation adapter.
- Ring verifier contradiction: **RESOLVED**; the accepted Draw adapter is now positively verified.
- Automated candidate classification: **THZ1 POC READY WITH DOCUMENTED ADAPTERS**. This is not `THZ1 POC RESEARCH-CLOSED`, and Windows acceptance remains required.
- Player state `$11`: **RESOLVED** in source and automated core verification.
- Static `$3D` spike collision: **RESOLVED**; four full-cell masks removed and the decoded upper/lower side split used.
- Type `$21` anchor contact: **RESOLVED** using fixed integer anchors/extents.
- Type `$10` floating: **CANONICAL — UNCHANGED**.

## Windows acceptance checklist — plain English

1. Extract the archive into a fresh folder, build it, and enter Turquoise Hill Act 1.
2. Leave the apparently floating TV objects where they are; their gaps are verified original behavior.
3. Break either TV showing the rocket-shoe-looking graphic. Sonic should stop looking rolled, move left/right in the temporary airborne state, accelerate with UP/DOWN, drift toward zero vertical speed with neither held, ignore normal jump/roll input, and fall normally when the roughly 300-update effect ends.
4. Take valid damage during that temporary state. It should cancel instead of continuing through the hurt sequence.
5. Test the four fixed terrain spikes. Skimming through part of the visible upper half from the side is expected. The lower half must side-block, landing on the spike floor must damage Sonic, and there must be no invisible full-height wall.
6. Test the spring-backed wheeled enemy (type `$21`). Clean or shallow-high contact should bounce; normal lower-side contact should damage; rolling/attacking or invincibility against the lower side should defeat it; it must never push Sonic like a wall; clearly out-of-range underside contact must do nothing.
7. Break an invincibility TV and confirm invincibility plus its orbiting 32-frame effect still work. The other two TV variants must not create that orbiting effect.
8. Confirm all TV icons remain correct, rings have no duplicate/trail, and spring rectangles remain fixed.
9. Check type `$27`, moving spikes, platforms, the first ramp, both loops, and the twist strip for obvious regressions.
10. Confirm R restart and F3 diagnostics work, while F4–F7 remain disabled.
