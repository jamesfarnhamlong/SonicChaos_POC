# Sonic Chaos POC 19.1 — THZ1 final runtime closure

POC 19.1 integrates the reviewed Task 08 contract for Turquoise Hill Act 1 only. It does not add or infer Act 2 or Act 3 content.

## POC 19.1 Windows corrections

- Block `$47` replacement art now refreshes on the terrain layer, behind Sonic and transient effects. The recovered `$6AE3` response writes `$FBC0` to vertical velocity; POC 19.0 incorrectly applied that value horizontally. Horizontal velocity and player state now remain unchanged.
- Type `$21` physics remains byte-identical to POC 18.6, including the anchor-plus-18 floor probe and all contact behavior. Its sprite origin is restored to 36 and an explicit draw event presents it at `object_y + 18`, as requested for Windows reconciliation.

## What changed

- Restored all 24 canonical raw type `$09` placements from the reviewed cache: 11 visible rotating collectibles and 13 invisible even-frame triggers. These remain distinct from the 142 layout-derived normal rings.
- Kept type `$21` physics and its anchor-plus-18 floor lookup unchanged, while moving only its rendered sprite down by one pixel.
- Corrected the four layout block `$47` cells to the verified palette-aware orange/yellow/grey artwork. Qualifying contact replaces each cell with `$46`, awards ten packed-BCD rings, and creates transient type `$0F`, parameter `$40`.
- Replaced type `$27`'s broad X-only lifetime with the verified two-axis accepted and active rectangles, including the original two-update empty-to-visible sequence.
- Accounted for all 53 canonical raw THZ1 placement records while retaining all 142 terrain-derived normal rings as a separate population.

## Automated verification

The focused Task 08 checks cover exact type `$09` placement data and lifetime rules, the isolated type `$21` display correction, block `$47` palette/art/interaction, type `$27` visibility timing, and the 53-record coverage gate. The existing movement, layout, twist, object, Task 06, and Task 07 regression suites are also run before packaging.

The source package does not contain the Sonic Chaos ROM. Asset import remains deterministic and requires the separately held canonical ROM plus reviewed research repository.

## Windows acceptance checklist

1. Enter Turquoise Hill Act 1 and confirm the newly restored visible collectibles appear at the expected placements and can be collected.
2. Pass through hidden trigger placements and confirm the ring counter increments without visible collectible art.
3. Check the spring-backed ground enemy from the side. Its display is now explicitly 18 pixels below the unchanged physics anchor; confirm it visually sits on the terrain while side contact and floor following remain intact.
4. Near the end, confirm the four monitor-looking terrain blocks are orange/yellow/grey rather than red/magenta. Qualifying contact should break each one and award ten rings.
5. Approach the flying-enemy placements and watch the first appearance. Confirm there is no obvious return of the premature broad-range activation; an original-timed first display already inside the viewport can be valid.
6. Traverse the full act and check normal rings, loops, ramps, springs, spikes, platforms, and the end section for regressions.

POC 19.1 Windows acceptance is pending. Do not treat the automated package result as gameplay acceptance.
