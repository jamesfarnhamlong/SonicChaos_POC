# Sonic Chaos Act 1 POC 17

POC 17 replaces the provisional moving-spike drawing with ROM-derived graphics
and adds the three canonical THZ1 type-`$27` objects. Type `$21` remains absent
while its behavior is independently reverse-engineered.

## Retracting spikes (`$1B`)

- All four placements remain exactly `(1344,864)`, `(1936,864)`, `(2464,864)`
  and `(2912,864)`.
- The existing recovered 18-pixel rise/retract cycle and active damage phases
  are unchanged.
- The procedural triangles are replaced by mapping frame `$0E` (`$8D30`) from
  the checked ROM.
- The full ROM frame is 32 pixels high. Its exposed portion stays anchored to
  the floor: 18 pixels while lowered, then 24, 30 and 32 while rising.
- Damage bounds use the same floor-aligned visible interval, preventing the
  floating hit region seen in the first 17.2 recording.

## Terrain-spring transparency

- Blocks `$30/$31/$33/$36/$38` had their palette-zero background imported as
  opaque blue/cyan, producing a green rectangular box in-game.
- Only that dominant background colour is replaced with true transparent black
  `(0,0,0,0)` in the root and GameMaker layer PNGs. This matches the working
  object-`$26` sprite and avoids retaining cyan RGB beneath zero alpha; the
  spring artwork and canonical placements are unchanged.
- A thin translucent lime outline seen with F3 enabled is the existing sampled-
  tile debug overlay, not part of any spring sprite.

## Static spike blocks (`$3D`)

- The four canonical cells remain `(1504,832)`, `(1536,832)`, `(2208,832)` and
  `(2240,832)`; no hazard objects or placements were added.
- Their collision header is surface type `5`. The original `$6ACE` condition is
  now ported: damage is requested after ordinary floor projection establishes
  contact, except for the original `$F4/$F5` tile exemption and player damage
  disable flag.

## Object type `$27`

- The three ROM placements are `(3504,224)`, `(2288,768)` and `(2240,112)`.
- Mapping frames `$01/$02` use records `$91FB/$9206` and the ROM-selected THZ1
  sprite palette `$06`.
- State 1 moves left at `-2.5` and enters state 2 inside 64 horizontal pixels
  of Sonic.
- State 2 stops horizontally, follows the animation-script `+$0003/-$0003`
  signed 8.8 Y-velocity pattern, and runs through the `$80` counter underflow.
- State 3 restores `-2.5` movement and removes the object at 384 pixels.
- The object remains numerically named `$27`; visual appearance is not treated
  as proof of a canonical enemy name.

## Graphics provenance

`POC_notes/rom-cache/thz1-object-sprites.json` records the ROM hash, palette
selection, mapping records and SHA-256 of every new sprite PNG. The corrected
THZ1 sprite palette is `$06` at ROM `$3B6AD`; the earlier inspection cache used
background palette `$15` and must not be treated as final object colour data.

## Verification

- `verification/verify_v17_type27.py` executes the original initialization,
  acceleration, counter-underflow and distance-boundary callbacks.
- `verification/verify_v151_layout.py` now checks all three `$27` placements in
  addition to the existing canonical layout.
- POC 16's 112-entry twisting-strip dispatch and 1,078 entry/boundary cases,
  plus the earlier 15,660 movement cases, remain passing.

GameMaker is not installed here. Windows compilation and gameplay validation
remain required, particularly presentation direction, activation timing,
collision feel and the spike foreground reveal.

## Packaging correction

The corrected archive includes GameMaker's required per-frame `layers/` PNG
copies for both new sprites. All five data-select cards also initialize
`loadIcon` and `loadZone` in Create, preventing their Draw event from reading an
unset variable before the selected-slot Step loads save data.
