# MGHZ Package M4R — MGHZ3 boss `$56/$57/$58`, reconciled with Research `e0f42f8`

Supersedes the earlier `SonicChaos_MGHZ_Boss_56_20261005_M4.zip` (left untouched). Base POC `191a601` (uncommitted work). Canonical Research:
`e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f` (main; `boss-56-{runtime,fullgame,implementation-manifest}.json` mirrored byte for byte). Package `SonicChaos_MGHZ_Boss_56_20261005_M4R.zip`.
**UNCOMMITTED; GameMaker IDE compile and Windows acceptance pending.** The M4 description in `docs/mghz-package-m4.md` still applies except where this page changes it.

## Reconciliation result

* `$57` warning contact (`$A77F` = `$0434`, all 24 calls) and the Z-driven `$A613` selector: unchanged — Research confirmed both; the fixtures still pass. New: every recorded `A77F` phase of the original trace
  (293) equals one `$57` damage-contact call in the replay.
* **Width-256 post-defeat camera now reproduces the recovered shared `$5832`** (`chaos_56_post_defeat_x`): follow starts in the first camera phase after the state-05 callback enables it (the POC camera step follows the object phase, i.e.
  the ROM's next camera update) and runs while the clear gate is still false; bidirectional; working lead slews 1 px/update toward 104 (facing right) / 136 (facing left) from `player_flags & 16`; ±8 deadzone (`k = (playerX-camera) & 255`, exact zero
  bypasses); steps +7 / −7 with the exact −1..−8 range preserved; no player velocity read; retained runtime left limit (whatever the boss-intro path produced — nothing hard-coded); restored right limit `3584` exclusive; a step that would leave
  `[left,right)` is rejected, never clamped. The state-20 EDGE(RIGHT,−7) freeze and the camera-Y rules are unchanged. The pan no longer carries the extra one-update delay (same reasoning).
* **Widescreen adapter (explicit):** the same relationships as `CENTER−24` (right) / `CENTER+8` (left) with the 1 px/update lead slew and ±8 deadzone, both directions, ±4 px/update, no speed term; the right boundary is
  `worldWidth − viewportWidth` (3584 at 256), exclusive/rejecting; the left limit is whatever the adapted intro/pan produced (a pan from the right lowers it to the settled lock). The RIGHT−48 lock and camera Y 256 are untouched until state 05.
* **Replay inputs are recorded, not fitted.** `replayFullGame` consumes Research's per-phase `D12F` and post-physics player state (`after_player_before_objects`, with that phase's camera). `frame+96` and the 384..412 parked-Y range are gone;
  the replay now proves the recorded values matter (counter shifted by 1 → 252 mismatching passes; Y −20 → 273). Synthetic tail ticks after the trace use the last recorded post-physics position.
* Harness fix found on the way: `room_width/room_height` in `chaos_world_harness.js` were frozen at 4096/1024 by `Object.assign`; they are live accessors now (all existing suites re-run green).

## Verification

* 256 parity (shipped GML vs caches, now format 2): scheduler scenarios, sweeps, trace replay with recorded phases (**0 mismatches, 530 passes**, 12 boundaries without a pass skipped), plus the post-defeat camera:
  330 Research oracle rows, the exhaustive 5×3×2×256 input product, limit rejection, exact −8, the low-byte case (3368/3060 → 3053) and the 160-phase delayed-release replay (right and left moves) reproducing every recorded candidate.
* Totals (`verification/run_mghz_boss_checks.py`): see `verification/mghz-m4/focused-results.json`; 39 batch commands; Research `test_mghz*.py` 159 tests OK (37 boss); `git diff --check` clean.
* Compile: Igor loads and links the project, then stops at the `GMAssetCompiler.dll` permission error (as M2/M3/M4). The IDE remains the gate.

Untouched: monitor/contact repair, slope/spring/facing presentation, results graphics/audio.
