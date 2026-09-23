# Sonic Chaos Act 1 POC 16

POC 16 replaces the ordinary-physics glide across the twisting strip with the
original player state `$22`.

## Implemented

- Right entry uses tiles `$59/$5C`, requires at least `+3.0` X speed in THZ and
  accepts only the original states 5, 6, 9, `$10` and `$1A`.
- Left entry uses tiles `$73/$72/$6B` and requires speed strictly below `-3.0`.
- All four ROM variants and all 112 tile-to-handler entries are exported. THZ
  naturally selects variants 0 and 1.
- Angle/magnitude conversion uses the signed 256-byte ROM table, arithmetic
  right shift and 16.8 position integration.
- Tile-relative X/Y alignment, magnitude changes, ignored ROM writes and the two
  deliberately immediate-return helpers follow the instructions literally.
- Leaving surface type `$17` clears angle/magnitude and requests rolling state 9.
- The adapter displays the spin sprite with state-driven rotation without changing
  the core trajectory.

## Verification

`verification/verify_v16_twist.js` executes the shipped GML core. It compares all
112 dispatch slots and 1,078 entry/boundary cases with fixtures produced by
executing the original Z80. It also traverses the actual THZ strip completely in
both directions and checks the rolling exit. The previous 15,660 movement cases,
30 object comparisons and canon-layout audit remain passing.

GameMaker is not installed here, so Windows compilation and three gameplay passes
in each direction are still required.

## Enemy research/cache

Act 1 contains six type-`$21` flying enemies and three type-`$27` Motobugs. Their
exact ROM records and world anchors are in `POC_notes/enemy-placements.json`.
`POC_notes/rom-cache/enemy-art/` contains the positively identified Chaos tile art
for both flying directions and Motobug. These are native tile atlases only: exact
frame composition, origins, object grounding and AI are deliberately deferred, so
POC 16 adds no guessed enemy instances or graphics to the room.
