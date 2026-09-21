# Sonic Chaos Act 1 POC — Windows test v08

Open `SonicChaos_POC.yyp` with the same recent GameMaker IDE/runtime that ran v07. Start Turquoise Hill as before. This folder is a separate copy of the project; v07 remains available.

### Controls for this test

- **F4**: put Sonic on the first lift near the start of the act. Wait for it to rise; jump off when the upper route is reachable.
- **F5**: approach the first loop from the left at running speed.
- **F6**: approach the second loop from the left.
- **F7**: approach the second loop from the right. This checks the reverse path.
- **F3**: show coordinates, floor contact, active loop index, collision plane and platform support. **R** restarts; **F2** switches to the original engine sample.

Normal movement into the first lift and loops should also work; the shortcuts simply reduce repeated travel while testing. They place Sonic at fixed positions, so visual animation on the first frame may settle the next frame. Collect the **first compile error text** if GameMaker reports one, or a short clip and F3 values where movement fails.

### Implemented

- All six platforms from the original THZ1 object table use original world coordinates. The first moves between Y=464 and 320, the second between Y=512 and 304, and the other four have rider-dependent bobbing. The moving platform carries Sonic and accepts a downward landing without falling through a 1-pixel collision band.
- Replaces the old 10-frame teleport out of loops with the original bank-13 left/right position lookup paths, fixed-point distance cursor, speed changes, low-speed falloff and exits. The collision layer flips partway around the loop, using both collision profiles stored for the lower loop blocks and side columns.
- Re-extracted the 32x16 platform art from the supplied ROM's THZ artwork with its background palette.
- Standard upright and diagonal spring launches are now much closer in travel height and direction to the original. Because the sample engine uses different player gravity and friction, these five launch magnitudes remain POC tuning, not a ROM-exact physics port. Horizontal spring impulses keep existing vertical movement and were reduced to eight.

`POC_notes/thz1_objects.csv` includes **corrected** positions: stored X and Y each have a 256-pixel bias. `POC_notes/thz1_platforms.json` explains platform parameters. `POC_notes/movement08_data.json` contains the decoded loop samples used for this build.

### Known gaps

This is an instrumented prototype. It needs your Windows GameMaker compile and gameplay check; calculations were exercised outside the GameMaker runtime and all project references were checked. The twist/Möbius section still uses earlier contour approximations; the newly recovered special state has not been integrated. Loop upper-rim contact and exact roll/fall animations remain approximate, as do camera activation and other object/enemy placements. Do not infer that a missing breakable block is the route past the first ledge; the supplied map and original clip identify a lift there.

Research details and byte-identical Z80 source recovery are in the separately supplied `SonicChaos_Disassembly_Continuation_01.zip`.
