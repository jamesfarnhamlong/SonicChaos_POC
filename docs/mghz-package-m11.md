# MGHZ Package M1.1 closure

Windows accepted by James on 2026-10-04, based on accepted lost rings `82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed` plus the M1 foundation. Research bases are `ac04dfe` / `7315df2`; the reviewed follow-up is now committed as `a779fde37130a834e099c985345adb9df648caaa`. James broadly accepted M1. This closure includes shared sign-player selection, completed-act display metadata, the existing bounded renderer diagnosis, and the reviewed platform/overhead correction. Maps, palettes and approved art remain unchanged. The platform findings come from the user-reviewed Research follow-up `m1-windows-followup.json`, mirrored without modification; they are newer than the two committed M1 Research bases.

## Shared sign chain

Canonical records instantiate once: MGHZ1 index 35 `(3968,366)`, MGHZ2 index 43 `(3968,270)`, type `$18`, parameter 0. Each selects `$A962`. MGHZ3 has no sign and remains boss-clear excluded.

The adapter can retain `OBJ_player_char_spin` after its core returns to ordinary walking. The sign, child, pan camera and completion checks previously searched only `OBJ_player_char`. Native M1 replay confirmed that the spin instance crossed the sign without contact in both acts; standing instances already completed normally.

`chaos_goal_player()` now selects either playable instance through the common `OBJ_player` parent, validates its core, and rejects death/other objects. The existing `$18 → $19 → $20` routines, contact bounds, speeds, timer rules and edge thresholds are unchanged. No act-specific clear substitute exists. Completed-act text now reads the current act metadata instead of treating an out-of-progression developer room as THZ1.

Native 348 px verification, updates from fixture entry:

| Act / instance | Timer stop / contact | `$19` child | Active `$20` | Shared clear |
| --- | ---: | ---: | ---: | ---: |
| MGHZ1 standing | 2 | 133 | 282 | 357 |
| MGHZ1 spin | 3 | 134 | 283 | 355 |
| MGHZ2 standing | 2 | 133 | 282 | 357 |
| MGHZ2 spin | 3 | 134 | 283 | 355 |

The timer alarm is `-1` from contact onward in every row. Debug launches retain their existing save/progression policy. Results/prize presentation remains the already documented shared POC limitation; selecting `$A962` does not claim that the deferred prize panel has been implemented.

## Horizontal/background sampling diagnosis

Effects 2 and 3 still write background palette entries 4 and 11 on their recovered cadence. Effect `$0E` still uploads all 64 bytes to tiles `$1A8/$1A9`, with the canonical overlapping sources, flips and boss-active pause hook. Both tiles are drawn; there is no omitted half or row.

Only blocks `$D2/$D3` reference those animated tiles, in mapping slots 12–15 (the bottom eight pixels of each block). `verification/mghz-m11/animated-tile-references.csv` lists all 412 tile references across all three loaded layouts, including each canonical cell, attribute and flip. Empty green terrain is `$FE`; it is not twist geometry.

The native A/B keeps map, animation phase and fractional camera fixed. The reported straight line **persists when every dynamic-effect overlay is disabled**, and persists with nearest sampling restricted to dynamic overlays. Disabling the static foreground pass removes it; nearest sampling of that pass also removes it with canonical priority rendering retained.

The source is internal atlas bleed in the generic static priority pass, not the animated strip. The transparent top row of block `$3C` samples the opaque grey bottom row of neighbouring atlas block `$2C`. In the reproduced MGHZ2 view, the affected air above world `(992..1007,128)` becomes dark green `(69,133,69)` with alpha 207 instead of canonical `(85,170,85)` / alpha 255. The same art is fully transparent at those source pixels; the approved boards contain no line there. The native fixed capture restores canonical green across the complete line. The diagnosis sheet shows this actual straight-line A/B, not just animation edge fringes.

The MGHZ branch of `OBJ_chaos_terrain_foreground` now uses nearest filtering for the complete priority pass and restores the prior filter afterward. `chaos_mghz_terrain_dynamic()` uses the same scope for its palette/strip atlas parts, also removing independent sampling fringes around animated scenery. Global texture filtering and other zones' rendering remain unchanged. The final capture restores 197 background pixels in this view, including 34 affected by the static priority pass. All 42 MGHZ source art frames and the original MGHZ cache JSONs are byte-identical to the delivered M1 ZIP. James confirmed the artifact is fixed in Windows M1.1.
Screenshots: `verification/mghz-m11/diagnosis-sheet.png`. The enlargement uses nearest scaling of native pixels; no image pixels were painted over.

## Rising platform correction

The shared ceiling surface `$0D` dispatch now follows `$7464`: owner clear breaks the block; owner present goes directly to `$4984`. It requests death `$1F`, preserves rings, sets Y speed -5.0, clears the recovered floor/player flags, and bypasses shield, blink, invincibility and ring-loss handling. It does not project Sonic or mutate the block. The final object pass moves the platform once, releases ownership, then freezes the object list. Other death presentation remains the existing adapter.

The stationary `$28/$05` callback also retains the top-contact flag produced by its `$033B` call before carry starts. This reaches the next player's contact merge, making initial landing, retained Y speed and the complete jump-window boundary match the original fixture. No empirical clamp or push-out was added.

Natural rides start 39 px above the canonical platform with Y speed +1.0. Update numbers below are zero-based, matching Research:

| Case | Result |
|---|---|
| MGHZ2 record 12 `(2768,624)` | Direct death on update 104, player Y 517, platform 531 -> 530 |
| MGHZ2 record 13 `(3024,560)` | Direct death on update 136, player Y 421, platform 435 -> 434 |
| MGHZ2 record 12, jump pad on update 60 for three frames | Owner clears, `$9C` becomes `$9D` on update 75 at Y 517, Y speed -464/256; Sonic continues upward |
| MGHZ1 record 10 `(2768,414)` | `$F9` floor capture on update 194, Y 217 -> 206, owner releases |
| MGHZ1 record 11 `(2960,830)` | `$F9` floor capture on update 450, Y 377 -> 366, owner releases |

The existing one-way rule already produces the canonical 11 px single-update capture; no solid-ceiling rule was added for `$F9`. Eight retained-speed capture depths and all 90 jump pad timings (20..109) match Research. The original emulator reads pad one frame after the rig sets it; a `$3FEF` PC-hook check confirmed this before adapting test input timing. Gameplay input timing was not altered.

Tests cover 256/348/640 viewports, ring retention, shield/blink/invincibility bypass, no ceiling projection, no crush block mutation, ownership release, final object movement and freeze. Native Windows replay verifies all five milestones and screenshots. Evidence: `verification/mghz-m11/platform-correction.json`, `native-platform-correction-rows.json`, `native-platform-correction-results.json`, and `platform-correction-sheet.png`.

The old oscillation records/screenshots are historical pre-correction evidence only; they are not the current response. Off-centre synthetic ordinary-solid contacts remain outside this narrow recovered correction.

## Current `$0D` presentation

MGHZ blocks `$9B/$9C` draw their intact approved block bitmap with a fixed frame. `SCR_cc_break13` immediately replaces the struck cell with `$9D`, appends its index to `chaosBrokenCells`, and the next terrain draw reveals the pre-rendered `$9D` replacement. There is no animation timer, fragment object, smoke transient, fade or sound request in this mutation. The downward attacking floor path retains its existing `-4.25` rebound; side and ceiling dispatch retain their existing recovered rules.

The `$0F/$40` smoke animation belongs to the separate surface `$16` / block `$47` path, not MGHZ surface `$0D`. The reviewed follow-up now proves four type `$07` fragments and sound `$A3`; their MGHZ fragment art remains unaudited. This collision closure preserves the current immediate replacement presentation and adds no substitute fragments or animation.

## Verification / reproducibility

- The 24-command M1/shared regression batch passes, including sign-event closure and platform correction checks.
- Native before/after checks cover both sign acts and both playable instances, immediate timer stop, child sequence, state `$20`, shared clear and `$A962`.
- Native overlay A/B and immutable M1 art/cache comparison pass; independent ROM tile/palette parity remains covered.
- The 48 native 256 / 348 px render captures are compared against ROM pixels after the sampling fix.
- Source and fresh ZIP extraction compile with GameMaker VM. Package validation preserves one project folder / one intended `.yyp`, excludes ROMs/build debris, and compares extracted source bytes.

Reproduce fixtures with `verification/capture_mghz_closure.py --name UNIQUE --scenes line --baseline-sampling` (old sampling A/B), without the flag (shipping fix), or `--scenes platform` (historical overlap setup). Use `capture_mghz_platform_correction.py` and `verify_mghz_native_platform_correction.py` for the new canonical cases. Compile each isolated project and run its VM output. Verification sheets and native records are packaged under `verification/mghz-m11`. Normal shipping gameplay contains no fixture input, capture telemetry or forced player positioning.

Windows M1.1 is accepted. M1 exclusions remain unchanged. The milestone is authorized for commit and push; root AGENTS updates remain with Manager-san.

The observed fall-control loss and monitor-wall snag reproduce unchanged at accepted parent `82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed` and are **not MGHZ regressions**. Paired source fixtures and 373 native trace rows agree between accepted parent and current code. No fall thresholds, monitor geometry or shared collision behavior were changed to address them. See [the diagnosis](mghz-fall-control-diagnosis.md). Final pre-commit checks are recorded in `verification/mghz-m11/acceptance-validation.json`.
