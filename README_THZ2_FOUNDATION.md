# THZ2 foundation and traversal milestone

**Status: Windows accepted.** Accepted: level-select integration, terrain/layout, 133 terrain rings, 9 visible + 4 hidden type-$09, all
canonical type-$26 springs, type-$9C breakable terrain, canonical type-$28 platforms, upper and lower route traversal, layout-derived
loop/twist mechanics, and THZ1 regression behaviour. Not included: enemies, monitors and other THZ2 objects.

Scope: THZ2 terrain/layout, terrain rendering, 133 terrain rings, 9 visible and 4 hidden type-$09 records.
No badniks, monitors, springs (objects), platforms, spikes (objects), loops-as-objects or other object types.

Data: canonical level package `sonic-chaos-reference` `research/thz2-thz3-level-package` @ 27a8348, vendored read-only in
`POC_notes/rom-cache/levels/` (see SOURCE.md). `POC_notes/generate_chaos_level_data.py` emits
`scripts/SCR_chaos_level_thz2_data` (layout cells, rings, type-$09 with source class) and asserts every hash.
`POC_notes/extract_chaos_level.py` renders the terrain (control run reproduces THZ1 terrain pixel-for-pixel).
The THZ2 room contains only the terrain object and the zone object; nothing is placed by hand.

Launch THZ2 from the data-select screen (see "Level select integration"). Developer shortcuts: F10 toggles THZ1/THZ2 in-level; the command-line argument `-thz2` launches THZ2.
R restarts, F2 and F3 behave as in THZ1. Type-$09 uses the accepted adapter (X+1, Y+17), unchanged.

Not modelled in THZ2 yet: object-driven loop/platform helpers, checkpoints and finish trigger (THZ1-only), tile priority.
Verification: `python verification/verify_thz2_foundation.py`.

Player start: the package exports the start words raw (110,398); their field meanings are UNRESOLVED and no offset is applied
to canonical data. The playable spawn is a separate `DEV_SPAWN / UNVERIFIED` (`CHAOS_THZ2_DEV_SPAWN_*` in SCR_chaos_level) set to the raw values.

## Traversability milestone additions

Research inputs: `sonic-chaos-reference` `research/thz2-thz3-object-deltas` @ e95aeaf.

* **Level select:** see "Level select integration" below. F10 toggles in-level and `-thz2` are developer shortcuts only.
* **Type $26:** all ten canonical THZ2 records are created from `SCR_chaos_thz2_type26` (8 x `$00` strong, 1 x `$01` weak,
  1 x `$88` span). `$88` = bit 7 span mode, low seven bits x 16 = 128 px, weak launch (strength comes from aux1). Existing
  THZ1 spring objects/logic are reused; nothing is placed in the room.
* **Breakable terrain:** THZ2 does not use block `$47`. Its breakable is surface type 13 = block `$9C`, six cells at
  (128,704) (160,704) (192,704) (288,704) (320,704) (352,704). ROM entries: side probes `$72B6/$72DD` (rolling flag and
  |X velocity high byte| >= 3; right hit with high byte < 7 adds +$40, left hit adds -$40), floor `$6B2C` (rolling, state not
  `$0F/$10/$15/$1A`: Y velocity `$FBC0`), ceiling `$7464`; all write block `$9D` (`$7898`). The four fragment objects
  (type `$07`) and the `$D3B2` timer are UNRESOLVED and not presented.
* The six blocks seal a cave containing the type-`$10` record at (64,718); they are not required to leave the start area.

## Traversal mechanics pass (type $28, loops, twist)

* **Type $28:** the three canonical THZ2 records are created from `SCR_chaos_thz2_type28`. Parameter `$0A` = the THZ1 vertical
  lift (1 px/update, first leg up) with reversal period `16 * aux1` updates: (552,720) aux1 `$19` = 400, (3672,608) aux1 `$13` =
  304. Parameter `$84` (1552,304) = the THZ1 sag/bob platform. No ranges or directions were invented; the position range follows
  from the period (a `$19` lift spans y 720 -> 320).
* **Loops:** `chaosLoopCenters/Rows/Planes` are no longer THZ1 constants. `SCR_chaos_loop_layout` derives them from the
  canonical layout using the ROM entry tiles (`$6CBA/$6CCD`: previous tile `$51` = rightward entry, `$52` = leftward). THZ1
  reproduces `[2368,2880]/[416,512]` exactly; THZ2 yields `[1088,2528]/[384,672]`. Path tables, speed decay, plane switching and
  exit are the shared THZ1 code. The alternate-exit tile `$57` does not occur in either level.
* **Twist:** already tile-driven in the shared core; verified on all three THZ2 strips in both directions.

## Level select integration

The original data-select screen shows five save slots (`global.saveGame`, Left/Right). Each slot saves a zone code
(`zoneGoto`) = its real progression. Both that code and the temporary highlighted act (`global.selectedAct`, never saved)
index the single act table `chaos_acts()` in `SCR_chaos_level`; every index is clamped into the table
(`chaos_act_clamp`), so nothing resolves past the last implemented entry. Showing a slot initialises `selectedAct` from its
saved progression; **Up/Down** change only `selectedAct` (small "UP/DOWN: ACT" hint on the card); START launches
`chaos_act_entry(selectedAct).room`. Finishing an act updates saved progression with `chaos_act_progress` (monotonic, clamped
to the last act). F10 and `-thz2` are developer shortcuts only. To add THZ3, append one entry to `chaos_acts()`.
Presentation TODO: no Sonic Chaos preview art exists, so all entries reuse the existing palm-tree frame of `SPR_data_zones`.
