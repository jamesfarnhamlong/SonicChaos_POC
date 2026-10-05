# MGHZ Package M4 — MGHZ3 boss `$56` / projectiles `$57` `$58`

Base POC: `191a60104655990e31fcb5389979a314abac80cb` (`poc/thz1-cleanup`, MGHZ M3 accepted).
Canonical Research: `badba9d085906054e4f15fa1d1a960ca2ae0abdd`
(`data/rom-cache/mghz/boss-56-{runtime,fullgame,implementation-manifest}.json`, mirrored byte for byte under `POC_notes/rom-cache/mghz/`).
Package: `SonicChaos_MGHZ_Boss_56_20261005_M4.zip`. **Status: UNCOMMITTED, awaiting GameMaker IDE compile and James's Windows acceptance.**

## What was built

| Piece | Where |
|---|---|
| importer: caches → generated tables/macros/sprites | `POC_notes/import_mghz_boss.py` |
| generated numeric state tables (types 86/87/88 + shared 18/52/10/15), manifest constants, throw selector, extents, sounds | `scripts/SCR_chaos_mghz_boss_data/` |
| interpreter + callbacks + camera/draw adapters | `scripts/SCR_chaos_mghz_boss/` |
| host object (Create/Draw only) | `objects/OBJ_chaos_object_56/` |
| approved art (unmirrored) | `sprites/SPR_chaos_mghz_boss_56`, `_flash`, `_puff_34`, `_sparkle_0A`, `_poof_0F` |
| wiring | `SCR_chaos_level` (spawn `$56` in MGHZ3 only), `SCR_chaos_objects` (phase), `OBJ_chaos_zone/Step_2` (camera), `SCR_chaos_adapter` (edge clamp), three HUD draw objects (slide), `SCR_chaos_mghz_m3` (boss slots skipped/created by the mapped scan, never drawn by M3) |
| POC-side ROM fixtures | `POC_notes/generate_mghz_boss_oracles.py` → `boss-56-poc-oracles.json` |

No behaviour constant is hand-authored where the caches carry it: state scripts/records, anchor, trigger, camera offsets, 288/430, HP, cooldown, clear X, throw selector,
frame extents, edge/guard relationships, sound requests and the flash window are generated into macros/tables from the manifest/runtime caches. The callbacks (the code the caches only
hash) were implemented from the byte-verified Z80 and then locked against the cache oracles below.

### Runtime model (256-px parity first)

* One live-slot interpreter shares the 19-slot array of the MGHZ object bridge (`global.chaosM3`). Script children use the 11-slot `$5EE1` pool (slots 7..17) and skip the whole
  spawn command when it is full; `$12` HUD / `$0A` bonus use the 16-slot `$5E9C` pool (0..15). The scheduler visits slots in ascending order, so a child allocated above its parent
  runs in the creating update and one below it waits for the next. Each visit is script engine → callback → lifecycle (`$61E1`, skipped in state 0); `$FE → $FF → clear` take separate visits.
* Creation is the generic mapped scan (every fourth update, EDGE bands, initial-fill exception): the boss slot appears 288..351 px beyond the right edge. Nothing about the boss/trigger
  widens with the view; the trigger is the strict `|dx|<160`, `|dy|<304` PLAYER_DIST test.
* Contact is `$A62D`: cooldown decrements every call, full `$5FA0` projection (D523 terrain guards + EDGE side guards of the live view) precedes the attack branch, grounded below-contact
  runs the shared `$4984` death setup (through the existing hurt hand-off), attack = `D503` bit 1 only, only top contact decrements HP (11 hits, `$FF` underflow), `$8105` reaction, `$B6`,
  flash command 7 (four slots, white on calls 4..7). States 6..9 call with A=`$FF`; `$0A/$0B/$0C` call with A=0. State `$0A` exists in the table and is never requested.
* `$57/$58` have no owner pointer; parent defeat/clear never touches them; lifecycle and early removal are their own.
* Defeat: state 4 (five `$34` puffs, 24×6 frame-restoration calls, state 5 on zero-based tick 148) → state-5 callback restores the camera limits every call and requests player `$20` only
  when WORLD playerX ≥ 3356 **and** the floor bit is set → `$0A` bonus/sparkle controller, boss → shared `$0F` smoke (token cleared, record stays occupied). The timer is never stopped;
  `chaos_act_complete()` and the numeric AQZ1 request (`{zone:4,act:0}`) are the existing path. No results graphics/audio were added.

### Explicit adapters (GameMaker, not ROM)

* **Widescreen arena framing.** Width 256 is canonical: pan target (3061,256), settled (3060,256), 1 px/update on both axes (an approach from the right ends on 3061, as the ROM routine does).
  For any wider view the camera X target is `3269-(W-48)`; the settled camera is one pixel short, so the boss sits at screen X `W-48` nominal / `W-47` settled
  (256: 208 / 209; 348: 300/301; 640: 592/593). Camera Y is always 256. The wide pan is bounded to 4 logical px/update per axis, never snaps, approaches from either side, and combat
  progression never waits for it (the HUD gate arms the pan 100 updates after creation; combat starts the update after). Boss/world/terrain anchors are untouched; collision never uses the framing.
* **Camera hand-offs.** Mode 1 (creation→trigger) follows with the left limit raised to the camera (no backscroll); mode 2 (trigger→HUD gone) holds X at the trigger camera while Y follows;
  mode 3 pans; mode 4 (state 5 onward) restores the saved right limit (3584 or the room edge), never scrolls left, follows capped at 4 px or Sonic's own speed, and freezes at EDGE(RIGHT,-7) in
  state `$20`. The ROM's horizontal follow speed after the lock is unrecovered, so this release is an adapter. First wide takeover starts from the previously displayed view (GPZ3 precedent).
* **Player edge clamp** `LEFT+16 .. RIGHT-9` and the `$5FA0` side guards `LEFT+32` / `RIGHT-32` use the live viewport as full-width integers (no SMS low-byte wrap) from boss creation until `$20`.
* **Projectiles.** `$57/$58` use the actual viewport edges with the canonical margins (asleep at EDGE(LEFT,-33), gone at -97; vertical window unchanged): no 256-window deletion, no mapped-enemy retention.
  The even-counter early-removal gate stays at canonical raw `screenX < 176 && screenY >= 120` (8-bit wrapped at width 256; signed screen X in a wider view, wrapped screen Y at every width). It is deliberately
  not converted to `RIGHT-80`.
* **Frame counter.** `D12F` is the shared MGHZ effect frame counter (`global.chaosMghzEffects.frame`); `$D2E2` (only the `$34` jitter) is a deterministic presentation stand-in.
* **Palette flash.** Command 7 drives a white flash variant of the boss/children sprites (entries 13/14); the executor runs once per update after the scheduler.
* **Art registration.** Boss/children/puffs/sparkles/smoke use the existing +(1,18) registration through the sprite origin; the boss chain's `$0F` uses a new `SPR_chaos_mghz_boss_poof_0F`
  (identical pixels to the accepted enemy poof, which is registered without the +(1,18) term — left untouched for the enemies).

## Discrepancies found (ROM vs the Research prose) — please route to Research

1. **`$57` warning phase is a damage hazard.** The audit says the 24-call warning phase (frames 14/13, callback `$A77F`) has no contact callback. `$A77F` is `CALL $0434` (`$6328` +
   `D3B0=$FF`), and the original code run in Research's own Oracle queues a hurt request for overlap with the 4×16 box (`boss-56-poc-oracles.json`, 16 sweeps ×1,025 hits each, hurt posture excluded,
   scheduler rows show the request on every call of the warning phase). The shipped GML follows the ROM.
2. **`$A613` (post-throw 06/07 selector).** The prose says 07 only if playerY ≥ bodyY **and** the body's non-rising Y ≥ 430 test succeeds. The routine branches on the **Z flag** `$A69F` leaves behind (its `LD A,n` does not
   touch flags): 07 for any playerY ≥ bodyY except a non-rising body at exactly Y 430. The scheduler oracle (state 8 at Y 333 → 7) and the whole-game replay confirm this reading; the shipped GML follows the ROM.
3. The `$12` HUD's slide counter (`$DB34..$DB3F`) is a **global** that persists across the second `$12` allocated at state 3 (deleted within 3 updates because the counter is already past its limit). It is modelled as one persistent value.
4. The full-game trace's rows do not record the frame counter or the physics-settled Sonic Y (rows hold the driver's written position). The replay fixes `D12F=(frame+96)&255` (one of the 14 of 256 offsets that reproduce every throw selection and
   parity-dependent record of the whole fight; the other 242 diverge) and a parked Y in 384..412 (marks show Sonic standing near Y 398); see the test.
5. Consequence of keeping the early-removal gate raw (as instructed): in views wide enough that LEFT+176 reaches the diagonal projectiles' world X when they cross screen Y 120 (about ≥ 490 px), the lower `$58` diagonal is converted to smoke while still visible
   (≈ 100 px from the left edge at 640). That is the stated policy, flagged only so Windows testing can judge it.

## Verification

* **256 parity** (shipped GML vs Research caches): scheduler scenarios for states 4, 6–12 (every slot field, per tick), strict trigger grid + boundary sweeps, vertical 288/430 sweeps, HP/cooldown cadence, the full 3,840-row contact/consumer
  sweep and its 20 stored rows, exhaustive geometry, child launch/removal/geometry (all gate rows plus a byte sweep), clear gate, 192 projection-guard rows, both creation fills, allocator exhaustion/order, pan rows, flash rows, sound requests, and a
  **whole-fight replay of the emulated original trace: 0 mismatching rows** across 530 compared boundaries (7 boundaries without a scheduler pass skipped) (HUD ×2, intro, 11 hit/throw cycles, children, explosions, smoke, clear request).
* **Integration** (shipped object phase/camera step/adapter): creation band, strict trigger, HUD slide, lock + pan, clamp, defeat, 11 hits, independent projectiles, world-gated clear, state `$20`, completion, grounded-below death — at 256, 348×196, 640×192.
* **Widescreen**: composition `W-48/W-47`, camera Y 256, pan ≤4 px (≤1 at 256) from many starts on both sides, unchanged anchor/geometry, identical boss trajectory at 7 widths, projectile lifetimes, independence from defeat/clear, clear gate.
* Totals from `verification/run_mghz_boss_checks.py`: 335,502 (256 parity) + 305 (integration) + 124,463 (widescreen) + 4,332 (assets) = **464,602 boss assertions**; **39/39** batch commands (M1–M3, footwear, lost rings, spikes/platforms, springs,
  THZ/GPZ regressions, debug select, act completion, assets, static GML lint, `git diff --check`). Research `test_mghz*.py`: 151 tests OK (29 boss) on the verified ROM.
* Assets: 31 frames recomposed from the verified ROM, byte-identical (0 pixel differences), approved hashes matched, verification sheet `verification/mghz-m4/m4-verification-sheet.png` (composition from shipped sprites, not a native screenshot).

## Compile status

GameMaker's standalone Igor loads and links the asset project (`SUCCESSFUL LOAD AND LINK`) and then stops before GML compilation with `GMAssetCompiler.dll … Permission Error` (status -1), exactly as in M2/M3; permissions were not changed.
`verification/lint_mghz_boss_gml.py` is a static sanity check (resolved calls/resources/macros, balanced brackets, no JavaScript syntax), **not** a compiler. **The GameMaker IDE compile/launch remains the gate.**

## Not changed

Shared monitor/contact repair, slope/fall/spring/facing presentation defects, results graphics/audio, and the enemy `$0F` poof were not touched. `$57/$58` are never placements; `$2D` creates nothing.

## AGENTS candidate updates (root `AGENTS.md` was not edited)

* MGHZ3 boss `$56/$57/$58` is implemented (uncommitted until Windows acceptance): one live-slot interpreter inside the shared 19-slot array (`global.chaosM3`), generated from the Research caches, locked against
  the cache oracles and a 530-boundary replay of the original full-game trace; widescreen framing keeps the boss at screen X `RIGHT-48` (settled `RIGHT-47`) with camera Y 256 and a ≤4 px/update wide pan.
* Research prose corrections (ROM wins): the `$57` warning phase **is** a damage hazard; `$A613` selects 06/07 by the Z-flag semantics described above.
* Registration rule for the boss chain: every mapped object, including `$0F`/`$34`/`$0A`, uses the shared +(1,18); the accepted enemy `$0F` poof resource is registered without it (unchanged).
