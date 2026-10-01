# Shared viewport-semantics adapter

Source of facts: Research `docs/viewport-semantics-audit.md` and `data/rom-cache/viewport-semantics.json` (main @ `0f73ec0`).
Code: `scripts/SCR_chaos_viewport` (vocabulary, lifecycle bands), `scripts/SCR_chaos_goal` (act-clear camera/clamp),
`scripts/SCR_chaos_placement` (`SCR_chaos_spawn_cell`, a thin wrapper over the lifecycle bands).
Checks: `node verification/verify_viewport_adapter.js` (widths 256/290/348/400/640 x six camera origins) and
`node verification/verify_act_completion.js` (full `$18 -> $19 -> $20 -> clear` chain at the same widths).

## Vocabulary

| Primitive | Helper | Meaning |
|---|---|---|
| `WORLD(x)` | `chaos_vp_world(x)` | canonical world coordinate; never widened |
| `EDGE(LEFT/RIGHT, n)` | `chaos_vp_edge(vp, CHAOS_VP_LEFT/RIGHT, n)` | `left + n` / `left + w + n` (RIGHT is the exclusive edge) |
| `CENTER(n)` | `chaos_vp_center(vp, n)`, `chaos_vp_left_for_center(w, x, n)` | `left + w/2 + n`, and its inverse for camera targets |
| `PLAYER_DIST(n)` | `chaos_vp_dist_lt/ge(a, b, n)` | `abs(a-b) < n` / `>= n`; takes no view |
| `LOCKED_CAMERA(c)` | `chaos_vp_locked(c, w)` | a view frozen at `c`; its EDGE/CENTER are fixed world X values |

A view is `{left, top, w, h}`; `chaos_vp_current()` reads camera 0.

## Where each relationship is used

* Act clear: `EDGE(RIGHT,+33)` (`chaos_goal_clear_dx`; 256 px -> `$121`). Freeze: `EDGE(RIGHT,-7)`.
* Sign pan: X target `CENTER(0)` (signX - w/2), exclusive right limit (stops one px short), Y target `signY - $99`; 1 px/update both axes.
* Player clamp between sign contact and state `$20`: `EDGE(LEFT,+16) .. EDGE(RIGHT,-9)`.
* Generic lifecycle (`chaos_vp_lifecycle_cell`): visible `[LEFT,RIGHT)`, awake margin 32, sleep/create ring 32..96, deletion beyond 96,
  measured from each real edge. Vertical bands are the ROM's 256 px central window and do not follow the horizontal width.
* Type `$27`: wake/sleep/create/delete from the generic bands; trigger `PLAYER_DIST(64)`; removal `PLAYER_DIST(384)`.

## Deliberate GameMaker deviations (not ROM behaviour)

1. Player edge clamp uses full-width integers against the live view. The ROM tests the low byte of `playerX - cam` (a player at
   `d >= 256` is teleported to the left edge) and compensates for the update's speed; neither is reproduced.
2. WORLD takes precedence over CENTER on the sign pan: the camera stops at `min(signX - w/2 - 1, worldRight - w)` so the last visible column is
   never beyond the canonical map. CENTER(0) holds when the world has room (256 px: camera 3831); at 348 px the camera is 3748 and the sign sits
   right of centre. Windows showed that exposing beyond-map space (black void) is not viable. During state `$20` the final EDGE(RIGHT,+33) run
   still ends past the map edge, invisibly: terrain columns >= 4096 read as open only inside the state-`$20` tick (the ROM lookup would wrap them
   into the next map row), and the player's Y is held while beyond the map.
3. Camera Y target is `signY - $99` from the view top. The default view is 196 px tall (SMS: 192), so the sign sits ~3 px higher in
   proportion than the original.
4. Camera updates run in the zone end step (after the player step); freeze/clear timing can differ from the ROM by one update.

## Generic lifecycle users

`$10` monitors, `$21` and `$27` run the shared placement scan (`SCR_chaos_placement_scan`) and the shared bands (`SCR_chaos_spawn_cell`).
`$09` rings, `$26` springs and `$28` platforms have no lifecycle window in the POC: they are persistent room instances / manager records with
player-relative contact (the rings' `PLAYER_DIST`-style proximity, springs `|dx| < 12`), so there is no view arithmetic to migrate. The ROM would
sleep/recreate them by the same bands; reproducing that (e.g. platform motion pausing while asleep, `$28` keep-alive with the 640 x 672 player
radius) would change accepted motion phase and is left as a separate, explicitly-scoped step.

## Widescreen retention adapter (GameMaker, not ROM)

Windows showed the canonical sleep/delete/recreate timing is visually too aggressive in widescreen. Entry stays canonical (create in the
outer ring, wake at EDGE +-32). For an object that has already been awake, `SCR_chaos_lifetime_cell` (-> `chaos_vp_retained_cell`) extends
OFFSCREEN retention by `widescreen_extra = max(0, viewWidth - 256)`: sleep at `32 + extra`, delete at `96 + extra` (horizontal, both sides;
vertical unchanged). At 256 px it is exactly canonical; at 348 px: sleep 124, delete 188. A previously-awake sleeping object still wakes at the
canonical edge. True deletion releases the slot and recreation rebuilds from the placement record (no persistence). Used by `$10`, `$21`, `$27`.
