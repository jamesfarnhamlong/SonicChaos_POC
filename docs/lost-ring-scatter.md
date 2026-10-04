# Recoverable hurt / lost-ring scatter (POC implementation)

Consumes Research `399f95bf03d3054d7f88ef6693eb935fc0c1ea13` (`docs/player-hurt-ring-scatter-audit.md`, cache mirrored at
`POC_notes/rom-cache/player-hurt-ring-scatter.json`). The legacy decorative `OBJ_player_lost_b` is no longer used by any chaos-level hurt path
(it remains only for the old sample rooms through `OBJ_player_lost_a`).

## Implementation
* `scripts/SCR_chaos_lost_ring` - pure numbers/structs: count, velocity tables, motion, probes, bounce, pickup, sparkle, lifecycle.
* Hurt entry `SCR_cc_hurt_rom` computes `hurt_scatter = chaos_lr_count(rings)` (decimal tens digit + 1, cap 7; replaces the inherited `rings >> 4`).
  `SCR_chaos_hurt_apply` and the legacy `SCR_chaos_apply_hazard_damage` emit the rings at the core anchor (X, Y-16).
* `SCR_chaos_objects_phase` calls `SCR_chaos_lost_rings_phase` first (the rings sit in the lowest free object slots), after the whole player pass.
  Pickup adds `global.ring += 1` and plays `SFX_ring`, exactly like type `$09`.
* `OBJ_chaos_zone` Draw_0 draws the rings (depth -10, between ring manager and player); Create clears the list on every room start.
  The ring manager (`Draw_0`, `Step_2`) is untouched, so terrain-ring and type-`$09` behaviour is unchanged.

## Canonical rules kept
count `min(7, tens+1)`; spawn (X, Y-16); X `{0,-1.25,+1.25,-2.5,+2.5,-3.25,+3.25}`, Y `{-5,-4.625,-4.625,-3.5,-3.5,-2,-2}`; gravity +0.125 uncapped;
no wall test; falling probe header bit 6|7 at Y+18, rising probe bit 7 at Y+2; bounces -3.5..-0.5, 8th contact deletes (no sparkle); pickup locked out
passes 1..16, from pass 17 `|dx|,|dy| <= 11` on anchors, tested before the ring moves, no player-state condition; sparkle 28 updates (frames 5/6); no timer, no alpha blink.

## Adapters (GameMaker, not ROM)
* **Widescreen horizontal retention.** At 256 px the lifecycle is exactly the ROM's (`[-32,288)` plus the one-update deferred delete for the outer ring, cell 3 immediate).
  At wider views the horizontal bands hang off the real view edges and are extended by `viewWidth - 256` on both sides (`chaos_vp_band_x_retained`, the accepted `$10/$21/$27`
  and GPZ3-ball policy). Vertical bands are never widened. A ring is never retired while visibly on screen.
* Sprite = accepted type-`$09` mapping and `(+1,+17)` registration; `$06` frame registration is not separately proven (Research unresolved item).
* Other objects' slot occupancy is not modelled; only the 16-ring pool bound is. Rings do not survive a room restart.

## Verification
`node verification/verify_lost_rings.js` - 1/15/32/47/64 rings, all 100 counts vs the ROM table, velocity tables, pickup lockout boundary (passes 15/16/17), the 29x29 pickup box,
recollection while hurt/blinking through the real adapter (first pickup at pass 17), player-state matrix, flat-floor traces of all 7 tokens (both ROM runs), bounce speeds, 8th-contact
deletion, one-way landing / rise-through, solid ceiling reversal, no-wall column, 120 random worlds x 7 rings x 420 updates against an independent port of the Research model,
and 256 vs widescreen lifecycle (ROM runs at 256; closed-form bands for 256..1280; visibility invariant; full thrown-ring lifetimes at 256 and 640).
`verification/platform_spike_battery_terrain.js` G1 now expects the corrected decimal counts (the old rows fed raw bytes to the BCD counter).

## Acceptance
Windows Package A (`SonicChaos_LostRings_Scatter_20261004_A`) accepted by James. The high-screen case (a ring leaving the top of the view and not returning) was traced with
`node verification/trace_lost_ring_top.js`: vertical retirement is the canonical `[-32, 288)` band with the one-update deferred delete (immediate below camY-96), at 256 and 640 px;
the vertical band is not widened. Expected behaviour, no code change.
