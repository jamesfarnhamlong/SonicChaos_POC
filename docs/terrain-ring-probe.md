# Terrain-ring probe and the shadow `+$07` counter

Research: `docs/terrain-ring-collection.md`, `docs/player-animation-counter.md` (97ec3ae). Mirrors: `POC_notes/rom-cache/terrain-ring-collection.json`,
`POC_notes/rom-cache/player-animation-counter.json` (regenerate with `verification/make_anim_counter_data.py`, which also writes the generated program table
`scripts/SCR_chaos_anim_counter_data`). Checks: `node verification/verify_terrain_ring_probe.js`.

* `SCR_chaos_anim_counter`: shadow of the animation engine's timing only (state, counter, record-program position, loop counter). Called once per player update
  by the adapter BEFORE the state callback/movement (`SCR_cc_anim_update`); inputs: requested state, X speed high byte, `bg & 2`, `contacts & 12`, `$D448` bit 0 (POC: 0).
  Never reads GameMaker `image_index`/`image_speed`. Fresh start = ROM start (state 0 script, then state 1).
* `SCR_chaos_terrain_ring`: probe point = (anchor X, `max(0, anchorY - 8)` for an even counter / `anchorY + 2` for an odd one), published after movement, projection, the
  room/clamp adapters and platform support (`chaos_ring_probe_update`) only for the 26 ring-probing states. The ring manager maps the point to the extracted per-quadrant
  record (`chaos_terrain_ring_at`), collects once, and spawns the effect at the probe point. Surface `$07` only (`$1D`, `$1A`, `$14` are unresolved).
* The old mask overlap path for terrain rings is removed. Type `$09` (strict `< 12` anchor proximity) is unchanged.

Scope of the counter: it is **parity-faithful for the terrain-ring probe**, not claimed to be an exact schedule for every state. In state `$0B`, `$D448` bit 0 can change the
exact counter schedule; the POC fixes it at 0 and Research reports that every duration on both `$0B` paths is even, so the parity used by `$753E` cannot change.

Research 90b4b05 (`state_0b_fixture`, `d448_audit`; mirrored, `verify_terrain_ring_probe.js` section 1b): the ROM sets `$D448` for strong springs, which loads a different set of even durations in state `$0B` (counter values differ from update 56), but the parity sequence is identical for both paths and under random `$D448` toggling. The POC's fixed `$D448 = 0` is therefore sufficient for terrain-ring `$753E`; strong-spring `$0B` counter VALUES are not claimed exact.

Known mismatches: state `$0B` `$D448` bit 0 is fixed at 0 (see above); the `$0B` d448 path (CPU `$8189`) is completed from the Research fixtures (the cache's op listing ends at `$8187`);
loop states bypass the engine entirely (the adapter returns early), so the counter does not advance there (a state change always reloads it); extracted ring records stand in for the ROM's terrain-block replacement.
