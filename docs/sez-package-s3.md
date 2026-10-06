# SEZ S3 platforms — Windows acceptance pending

Research canonical `ed9122b3d5ac11442714ecaef4cc4316c4706342` (`research: audit SEZ type 28 contact mover and fixed platform`),
contract `data/rom-cache/sez/platform-28-runtime.json` (mirrored byte for byte at `POC_notes/rom-cache/sez/`).
Accepted POC base `baccfeefad3832db05b366d729d2c62441701d75` (SEZ S2). Work is deliberately **uncommitted**.

Scope: the two remaining SEZ type `$28` variants. `$83/$84` (and every other `$28` path) are unchanged. S4 enemies, the boss, the monitor repair and the
parked Spring Shoes/fall observation are untouched. No new art: both variants use the approved `SPR_chaos_sez_platform`.

## Implementation

| Subject | Where | Kind |
|---|---|---|
| `$86` = state 7 (`chaosMode 7`): `+$30` = 16 callbacks per block, `+$37` = aux1 blocks per leg as a **byte** (zero wraps to 256), latch 0 waiting / 1 outbound / 2 returning, X speed ±1 | `chaos_platform28_configure`, `chaos_platform28_step7` | ROM behaviour |
| trigger: any `$6328` contact bit of the **pre-move** anchor (closed `|dx| ≤ 8+16`, `-16 ≤ dy ≤ 24`; player extent 9 in state `$0F`), no speed/state/floor/attack/owner gate; no overlap returns before movement, support and counters | `chaos_platform28_step7` | ROM behaviour |
| first move in the same update as the trigger; counter-derived travel `16*aux1` per leg, **no coordinate clamp**; reversal after the final move of each leg; final return move resets the latch and a still-overlapping rider retriggers at once | `chaos_platform28_step7` | ROM behaviour |
| support after the move (top triangle at the post-move anchor, Y speed ≥ 0, else release), shared 8 px sag (`$86` has bit 7), carry with the integer X delta computed before the reversal, velocities untouched | step7 + shared `chaos_platform28_support_ex/sag/carry` | ROM behaviour (shared routines) |
| leaving/jumping off or re-contacting never stops or resets the excursion | counters only | ROM behaviour |
| keepalive from the first callback: the generic lifetime never deletes it and the callback keeps running **asleep** (bit 6 only drives drawing); own `$8908` PLAYER_DIST test `|dx| ≥ 640` / `|dy| ≥ 672` marks removal at the callback start, that callback still runs, recreation starts fresh from the canonical placement (counters, latch, X reset). Not widened at any view width | `chaos_platform28_lifecycle`, `chaosDistDelete` | ROM behaviour; the existing post-wake retention only affects the asleep/draw flag |
| `$04` = state 5 with the sag enable (parameter bit 7) clear: the shared `$84` callback with sag gated by `chaosWeight`; stationary, aux unused; no axis-swap variant exists | configure + state-5 branch | ROM behaviour |
| loader: `$86`/`$04` are now created from the canonical SEZ rows; every other unsupported `$28` parameter stays skipped | `chaos_spawn_type28`, `chaos_level_spawn_objects` | importer-driven |

The three natural SEZ ranges emerge from the canonical aux values only: `$18` → 384 px (SEZ1 #4), `$30` → 768 px (SEZ1 #5), `$1C` → 448 px (SEZ2 #2). SEZ1 #2 is the `$04` platform.

Importers: `generate_sez_foundation.py` / `generate_sez_s2.py` are re-pinned to `ed9122b` (they refresh `implementation-manifest.json` / `object-census.json`: classification text only),
`generate_sez_s3.py` mirrors `platform-28-runtime.json` and asserts its identities. All three read a clean checkout of Research main at the pinned commit.

## Verification

Run `verification/run_sez_s3_checks.py` (see the final numbers in `build/sez-s3/package-report.json`).

* **S3 oracle suite** (`verify_sez_s3.js`), shipped GML:
  * all 70 Research trigger vectors (platform X/Y, latch, counters, sag, owner, carried player X/Y, velocity) plus the 5 rising-trigger vectors;
  * the trigger rectangle over the Research grid (dx −26..26, dy −25..29, Y speed −1/0/1/256) for six player states (including `$0F` = 25) and two owners;
  * support: post-move triangle, signed Y gate, owner, snap to `platformY−14` — and the same for `$04`;
  * all 8 movement oracles at every listed update (X, speed, latch, `+$30`, `+$37`); **every aux1 0..255**: excursion exactly `+16·aux` (byte 0 = 256), back to the origin after `32·aux` updates with counters reloaded;
    the natural 384/768/448 ranges; continuous rider across the return (immediate retrigger); jump-off and re-contact mid-excursion;
  * shared sag sequence on a state-7 rider; the 12 Research state-5 comparison traces (`$04` flat, `$84` 1..8,8,7..0) for six aux values;
  * lifecycle: the 14 keepalive vectors at 256/348/640 px, running asleep, removal mark + same-callback movement, fresh recreation;
  * natural creation of all five placements through the real loader, scan and object phase with a real rider.
* S1 foundation suite, S2 suite, accepted THZ/GPZ/MGHZ inventory, GML lint, asset suites and the Research tests (foundation, surfaces, platform-28) — see the batch.

## Notes / limits

* The oracle `dx` field is a scratch byte (the ROM keeps the last moved value while the platform waits and only writes it on the Y-speed ≥ 0 path); it never reaches the player and is compared only where it is live.
* Whole-game "natural rider" Research vectors depend on a parked-player fixture that publishes no start state; the natural placements are verified by creation, range, sag and the counter vectors instead of row replay.
* Shared support keeps the accepted fixed 8 px player half-width; only state 7 uses the contract's 9 px in player state `$0F`.
* Contact bits mirrored into `$D521` by object contact are not modelled for these platforms (as for the accepted `$83/$84` support path).

## Compile status

Standalone Igor loads and links the project, then stops at `GMAssetCompiler.dll` (status −1) before GML compilation (same as M2–M4, S1, S2); its exit code is not compile evidence.
GameMaker IDE compile/launch of the source and extracted package remains James's gate.

## Suggested Windows pass

1. SEZ1 (1584,96) `$86` (384 px) and (2128,576) `$86` (768 px): touch it from the top, side or underneath — it starts at once and carries you right, turns back at the end and returns; step off mid-trip and it still finishes; stand on it through the return and it immediately starts again.
2. SEZ2 (1776,960) `$86` (448 px): same. Check the 8 px dip while riding.
3. SEZ1 (1264,320) `$04`: stands still and does not dip.
4. Walk far away (more than 640 px) while one is mid-trip, come back: it is back at its origin, waiting.
5. Window widths 256/348/640: nothing about the distances changes.

## Windows acceptance and parked items

Accepted: `$86` right-and-return mover; the Spring Shoes pickup on the grey `$04` platform is canonical (confirmed from ROM placement data); no unexplained `$28` discrepancy.

Parked (no S3 change; each needs a deterministic reproduction before shared contact/player behaviour is touched):
* inconsistent Spring Shoes interaction with nearby breakable/reward boxes;
* one apparently wide box-breaking contact;
* the earlier non-deterministic Spring Shoes / fall-state terrain-lock observation (also recorded in the S2 notes).
