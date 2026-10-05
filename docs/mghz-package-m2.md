# MGHZ Package M2 - type `$21`, Rocket Shoes, Spring Shoes `$2F`

Base: accepted/pushed M1.1 checkpoint `d1986b3` (all work uncommitted pending Windows acceptance).
Research consumed: `ac04dfe` (foundation/art, approved PNG boards), `7315df2` (oil/ceiling), `a779fde` (M1 follow-up), `150977e` (footwear audit; cache mirrored
as `POC_notes/rom-cache/powerup-shoes.json`), `docs/object-21.md`, `asm/recovered/player_state_11_handler.asm`, `player_state_12_handler.asm`, `object_2f_*.asm`,
`object_21_*.asm` and the ROM `$48BC/$48F7/$4942/$5F27/$3FEF/$45ED` disassembly. Canonical Windows route: MGHZ1 Rocket monitor `(1312,110)` (record 13), Spring Shoes
`(1552,238)` (record 12), `$21` `(1744,238)` parameter `$0A` (record 22).

## Type `$21` (flags `$10`)
- All 15 MGHZ records spawn (MGHZ1 6, MGHZ2 9) at canonical X/Y with their parameters (patrol span = parameter x 16). Flags bit 4 selects the `$B210` alternate start:
  latch 1, state 5 (moving left, bit 4 **clear**), toggling 5<->6 (state 6 = bit 4 **set**). THZ keeps 3/4 with the opposite bit-4 relation. `SPR_chaos_mghz_object_21`
  holds both runtime orientations (frames 0,1 = bit4 0; 2,3 = bit4 1); nothing is flipped at runtime.
- Cadence (Research original-routine traces, all 15 records: every recorded reversal and the total reversal count over 720 updates): update 1 init, update 2 state switch, patrol
  from update 3; **every reversal is followed by one switch update without a patrol callback**, so the first reversal is at `2 + 32*p + 1` and return legs take one update longer.
  The accepted THZ adapter (no init/switch updates) is unchanged.
- Contact, top stomp (-6.75, `$0B`, attack cleared, survives), side/low attack defeat (score `10 00 00`, `$0F` smoke), non-attacking hurt through `$D3B0 -> $48BC`,
  lifecycle/placement persistence are the existing shared paths. MGHZ defeat presentation reuses the accepted MGHZ `$0F` poof art (no approved smoke board exists).

## Rocket Shoes (monitor `$10/$04`, selector `$D532 = 4`, state `$11`)
Implemented from `$3A7C` (`SCR_cc_state11_tick`):
- Breaking the monitor only queues `$D3A3` bit 3; the next player update runs the old state, then writes selector 4 / timer 300 / sound `$85` and requests `$11`
  (zero speeds, maximum 7.0, attack bit cleared). First full callback is update N+2, entering with timer 300; 300 callbacks enter 300..1, the 301st (timer 0) still moves, then
  `$463C` falls (`$0E`, +1.0) and the level music is restored. The timer is the shared `$D44C`; it now counts down inside the player update (`SCR_chaos_power_tick`), not in the controls object.
- Facing from Left/Right (`$48A7`, Left wins), then the facing direction is ORed into the held input every update; dry `$0010` / water `$0002`, cap 7.0.
- Vertical: Up/Down +-`$40` with the **signed-high-byte** clamps (the old POC clamped at `> $0300`; the ROM clamps at `>= $0300`), neutral -/+`$20` by high byte (oscillates through zero), viewport clamp
  screen Y `< 24` / `>= 192` (the old POC used `< 25`), floor tail (floor flag cleared, anchor up 2, Y speed 0). The POC-only "empty floor requests fall" artifact no longer applies to `$11`
  (the original fixture keeps requested state `$11` and Y speed over empty floor).
- Attack bit: the stored bit only; nothing in `$11` derives it from velocity/airborne (the old adapter forced it false).
- Damage (`$48F7` Rocket branch): rings (also 0) and shield untouched, no scatter, no death selection; selector and queued reward cleared, music restored, sound `$C3`, hurt `$1E`
  (`+$03 |= $C1`, 120 invulnerability). The ordinary hurt/scatter/death paths are unchanged and regression-tested.

## Spring Shoes (`$2F`, state `$12`, owner `$D3A4`)
- `OBJ_chaos_object_2F` (states 1 offer, 3/4 attached, 5 falling; frames per the ROM script table). Attach: non-rising Sonic, current state != `$12`, top contact (extents 8x16); attack bit inherited.
  The Research attachment sweep (10 rows) is reproduced. Bottom/side contacts use the shared solid projection; a grounded attacking side contact stands Sonic 16 px away.
- `SCR_cc_state18_tick`: shared movement (ordinary gravity/control, foot probe +8), facing, then in ROM order: action button (detach + `$45ED` jump), side contact (detach + hurt *movement*
  `$494F`, no damage flags), floor contact (relaunch `-7.5`, Y-1, owner state 3). No selector, no timer. The owner follows at player Y+16 (frame 3) / +11.
- Canonical springs override: terrain springs replace the state before the relaunch; for mapped `$26` the relaunch of the same update is judged on its pre-bounce speed/floor flag (adapter,
  below) so the result is exactly the canonical value (-7.375 / -5.0 / terrain -7.5, `$0B`, attack cleared).
- Owner cleanup: whenever `$12` is replaced (jump, hurt, spring, Rocket pickup, side wall) the owner requests state 5 and falls (+1.5, then +0.5/update); the owner pointer is cleared.

## GameMaker adapters (not ROM facts)
1. Power selector/timer: counted in `SCR_chaos_footwear_phase` after the player's tick (the ROM does it in the player update); the controls object no longer decrements it.
2. Mapped `$26` springs vs the shoe relaunch: `shoe_bounced` / `shoe_prev_vy` let the object phase judge the contact on pre-bounce values (Research states the override outcome; the ordering was not traced).
3. `$21` alt start models the two init updates and the post-reversal switch update; THZ left as accepted.
4. MGHZ `$21`/`$2F` sprites carry the approved SAT registration (+1,+18) in their origin and draw at the canonical anchor.
5. Player facing in states `$11/$12` follows the canonical facing bit (not the velocity sign).

## Art (no substitutes)
`POC_notes/generate_mghz_footwear.py` builds `SPR_chaos_mghz_object_21`, `SPR_chaos_mghz_spring_shoes` (mapping frames 1..4) and `SPR_chaos_mghz_monitor_04` through the Research
composition code; frame hashes are asserted against `art-approval.json`, and the selector-2 monitor is reproduced byte-for-byte as a construction check.
`verification/verify_mghz_footwear_assets.py` proves the POC sprites pixel-identical to the Research composition **and to the approved board panels** (all frames, both orientations,
terrain-context registration at the boards' canonical placements) and writes `verification/mghz-m2/footwear-reference-sheet.png`. No difference was found. Terrain art untouched.

## Verification
`py -3 verification/run_mghz_m2_checks.py` (focused `verify_mghz_footwear.js`, 28 node batteries incl. M1.1 / lost rings / springs / monitors / terrain rings / THZ `$21`, asset comparison,
`git diff --check`). Failing at `d1986b3` already, unrelated and untouched: `verify_ring_proximity` (stale Draw_0 text comparison) and `verify_thz3_foundation` (stale ring-manager source-text lock).
Stale-test repairs: `verify_thz2_objects`, `verify_type10_step`, `verify_placement_lifecycle` (missing stubs/fields after M1/GPZ), `verify_mghz` (M2 spawn expectations),
`verify_thz3_foundation` (harness now hosts real `$10` instances; its other stale lock remains). Compile: `verification/compile_mghz_m2.ps1 -Project <yyp> -Out <dir>` (Igor VM).

## Unresolved / observations (not changed)
- Research text says state `$12` neutral friction is +-`$0020`; the ROM table row (`no_direction`, state `$12`) is +-20 decimal (`$0014`), which the shared table (and this build) uses.
- Research `bounce_sweep` rows with side-contact bits show no hurt movement, while the state-`$12` asm (`$3B5E`) takes the side-wall branch; implemented per the asm.
- `$12` wearers stand 8 px higher (foot probe +8): a mapped spring's 6-row contact window can be missed. Faithful to the probe offset; flag for Windows.
- Fall `$14`/`$0E` control, platform support while falling and the monitor side-projection snag were not touched (parallel audit).
- Rocket flight near `$1B` oil / `$3E/$3F` ceiling spikes in MGHZ2 was not specifically exercised.

## M2.1 (Windows feedback; uncommitted, no new package yet)
1. **Act clear while wearing Spring Shoes - fixed.** Cause: the type `$19` child (`$AB8C`) requests state `$20` only while the floor flag `$D522` bit 1 is set; a state-`$12` wearer clears that flag
   in the same update it lands (`$3B6B`), so the object phase never saw a floor and the request never fired (traced in the harness: stall reproduced before the fix). `OBJ_chaos_object_19`
   now judges the flag on the pre-relaunch value (`shoe_bounced`, the same ordering adapter as mapped springs). `$20` then replaces `$12` through the normal request; the owner detaches
   (pointer cleared, object state 5) and no timer is added. Regression: `verify_mghz_footwear.js` section "Spring Shoes act clear" (state `$12` + owner -> sign -> state `$20`, no owner -> act-clear flag).
   **Open for Research:** the original's static `$AB8C` gating suggests the ROM may behave the same way (floor flag cleared by the relaunch); whether the original sees the pre-relaunch flag was not traced.
2. **Spring Shoes presentation - unchanged, waiting for the Research fixture** (approved art untouched).
3. **Downhill glitch - classified: not an M2 regression.** `verification/trace_mghz_slope.js` replays identical input through the shipped GML of `d1986b3` and of current M2 (per update: X/Y, state/requested,
   speeds, move/bg/contact flags, foot tile, modifier, previous-surface flags, shadow animation counter). 54 paired runs (MGHZ1/2, 24 start points x both directions, plus long runs with periodic jumps)
   are byte-identical. No M2 code touches ordinary states; the only shared-path edits are state-`$11` guards. Exact reproduction of James's video location is still needed; any fix belongs to the parallel
   shared-player audit, not M2.

## M2.2 (Research reconciliation `spring-shoes-presentation-audit`, Research branch commit `4149f84`; uncommitted)
- **Pre-relaunch sign-floor adapter removed.** `OBJ_chaos_object_19` is back to its accepted form. The canonical footwear clear is the sign wake: `OBJ_chaos_object_18` converts a *requested* `$12`
  to `$0E` once per wake (`chaos_footwear_wake_convert`, `$A87D`; type `$50` creation calls the same helper), with the wake band being the existing viewport lifecycle `EDGE(RIGHT,+32)` (screen X < 288 at 256 px,
  `viewWidth + 32` on wide views, re-armed when the sign leaves the lifetime window). No timer; `$D3A4`-equivalent is not cleared by the conversion - the owner detaches through the ordinary `$8BC3` rule and
  the adapter pointer is released when the state is no longer `$12`. The narrow already-awake-sign stall is kept (tested).
- **Mapped `$26` adapter removed.** Mapped springs are inert for state `$12` (rebound clears the floor flag, +8 probe, window). Terrain upright spring (`$0B`), manual jump (`$0A`), `$21` stomp (`$0B`),
  `$21` damage (`$1E`) and the side-wall branch (`$1E`, rings kept, no invulnerability) detach through state replacement. **James's diagonal spring is a terrain spring** (POC has no mapped diagonal; kind 20,
  blocks `$36/$38`): `SCR_cc_spring` writes requested `$1C` (MGHZ vy -5.5, attack set), and the state replacement is the detach. Preserved.
- **Presentation capture** (`verification/capture_spring_shoes_presentation.js` -> `verification/mghz-m2/spring-shoes-presentation-capture.json`, per update: state/requested/frame, Sonic X/Y/vy/facing,
  shoe state/frame/timer/X/Y) against `traces.mghz1_plain`. It exposed a real runtime discrepancy that was the likely "too active" cause: the original's top-contact `$5FA0` projection places Sonic on the box and
  stages the object-floor contact, so the **first `$12` update already rebounds**; the POC attached without that, rebounded two updates late and restarted the shoe's frame-3 record twice. Fixed in
  `OBJ_chaos_object_2F` (anchor Y = object Y - 16, staged floor contact). Result: contacts 12/93/174/255 (period 81), frame 3 x12 / frame 4 x69, shoe X = Sonic X, offset +16 for C+1..C+12 else +11,
  Sonic single frame `$0B`, never mirrored; all 31 Research rows match (Y within +-1: the Research trace has no sub-pixel start phase, the capture uses 96/256).
- Downhill slope: unchanged, classified pre-existing (54 paired runs identical to `d1986b3`).

## M2.3 - `chaosBoxContacts` lifecycle (Windows crash on first `$2F` contact)
- **Cause:** `chaosBoxContacts` is a per-update contact accumulator (staged object bits that mirror into D523: 64 = blocked right, 128 = blocked left, 32 = object floor, merged by `SCR_chaos_adapter_step`, then cleared).
  It was only ever created by the first monitor *side* contact and read behind a `variable_instance_exists()` guard in the adapter; `$2F`'s new OR (`x = x | 32`) was the first read-before-write. The harness hid this because JavaScript reads `undefined`.
- **Audit:** writers are `OBJ_chaos_object_10` (assign 64/128) and `OBJ_chaos_object_2F` (assign 64/128, OR 32); the single reader/clearer is `SCR_chaos_adapter_step`. No other reads.
- **Fix (lifecycle, not a local fallback):** the accumulator is created (0) in `SCR_chaos_core_attach` - the guaranteed first step for every object-phase writer, which attach the core when absent - and in `SCR_chaos_player_init`;
  the adapter reads/clears it unconditionally (guard removed), and the loop-adapter early return clears it so no staged bit survives a skipped merge.
- **Regression:** `verify_mghz_footwear.js` section "chaosBoxContacts lifecycle" runs the first eligible `$2F` update on a *strict* player (a Proxy that throws on reading any unset property, as GameMaker does); it fails without the fix.

## Acceptance (M2.3, Windows, James)
Windows Package M2.3 accepted; source and fresh-ZIP GameMaker launch PASS (recorded by James). Accepted scope: MGHZ `$21`, Rocket Shoes, Spring Shoes `$2F`, sign-wake `$12 -> $0E`, mapped `$26` inert for `$12`,
canonical terrain-spring / `$21` / side-wall detach, corrected pickup/presentation timing, `chaosBoxContacts` lifecycle.
Recorded classifications: the downhill slope glitch is pre-existing (identical at `d1986b3`), not an M2 regression; `$14` zero air control and strip pass-through are canonical; the monitor repeated push/pull
remains a separate known POC divergence (parallel shared-player audit). Not part of this commit: the unrelated GPZ diagnostics in the working tree.
