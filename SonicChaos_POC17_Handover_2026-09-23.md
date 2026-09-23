# Sonic Chaos THZ1 POC handover

Status: 23 September 2026  
Last Windows test archive: `SonicChaos_Act1_POC_17_4.zip`  
ROM used for verification: Sonic Chaos SMS 1.2, SHA-256
`eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`

## Project rules

- The ROM is the source of truth for object identity, placement, graphics and
  behavior.
- Do not invent objects, placements, collision helpers or replacement artwork.
- Unknown types remain numerically named and absent from the POC until their
  behavior and presentation are decoded.
- Keep physics in original integer/fixed-point units. Presentation and sample-
  engine damage aftermath remain explicit adapters where the ROM path has not
  yet been ported.
- The user manually updates the public repositories from accepted test ZIPs.

Repositories:

- Reference/disassembly: <https://github.com/jamesfarnhamlong/sonic-chaos-reference>
- GameMaker POC: <https://github.com/jamesfarnhamlong/SonicChaos_POC>

At the end of this thread, the local POC checkout still reports Git `main` at
POC 16 with the POC 17 work as uncommitted changes. The local reference checkout
also contains uncommitted object-graphics/type-`$27` work. The next thread must
fetch/check both repositories before editing because the user is continuing ROM
research and may push newer files. Preserve user changes; do not reset either
worktree.

## Playable milestones reached

### POC 14.5: shared movement baseline

- Integer/fixed-point movement and collision path substantially replaced the
  inherited sample-engine physics for THZ1.
- The first curved ramp rolls, launches and returns to ordinary movement.
- Both loops and the six canonical moving platforms function through existing
  bounded adapters.
- The opening red spring reaches the same tested height as the ROM. Remaining
  differences are mainly spring/player animation scheduling.

### POC 15/15.1: springs, moving spikes and canonical layout

- Object `$26` concealed springs use recovered parameters and state behavior.
- The far-right spring is dormant/hidden and appears only when triggered.
- Object `$1B` was confirmed as the four retracting spike sets. Its 18-pixel
  rise/retract cycle and active damage phases were ported.
- Object, terrain-spring, platform, ring and monitor placements were regenerated
  from the ROM caches. Fabricated badniks and the fabricated finish marker were
  removed.

### POC 16: twisting/Mobius strip

- Original player state `$22` is implemented.
- The four 28-entry tables (112 dispatch entries), entry speed/direction rules,
  angle/magnitude movement, tile alignment and rolling exit are ported.
- Windows testing confirms traversal works. Slow entry rejects/falls as expected.
- Sonic remains in a rolling ball more often than the ROM presentation, but the
  user accepts this as an animation/engine difference for now.

### POC 17: ROM-derived Act 1 objects and hazard correction

- Type `$27` has all three canonical placements:
  `(3504,224)`, `(2288,768)`, `(2240,112)`.
- Its ROM-derived frames `$01/$02`, `-2.5` leftward motion, 64-pixel proximity
  stop, signed 8.8 vertical oscillation callbacks, `$80` counter underflow and
  384-pixel removal boundary are implemented.
- The tester observed one airborne instance moving right-to-left, stopping and
  continuing, consistent with the port. Keep the numeric name `$27`; repository
  caches currently contain inconsistent semantic guesses and should not override
  verified behavior.
- Type `$21` remains deliberately absent because the user is independently
  reverse-engineering it. Six records are known at:
  `(800,606,$08)`, `(1248,862,$06)`, `(2048,318,$06)`,
  `(3152,894,$03)`, `(3296,286,$04)`, `(2400,254,$02)`.
- Static spike layout block `$3D` uses surface type `5`. The original floor-
  contact hazard condition at `$6ACE` is now ported instead of relying on a
  guessed death-mask object. The four canonical cells remain unchanged.
- Moving spikes use ROM mapping frame `$0E` (`$8D30`). Their currently shipped
  presentation is bottom-aligned to the floor, exposing 18, 24, 30 and 32 pixels;
  the damage interval uses the same coordinates. This change still needs a
  clean Windows confirmation after the earlier floating-Y report.

## Current unresolved Windows issue: spring rectangle

POC 17.4 still shows a cyan/light-blue rectangular background around the same
lower-route upright red spring. It is the spring immediately before the static
spikes, corresponding to layout block `$31` at world `(2112,832)` and object
`OBJ_chaos_spring_49`.

What was tried:

1. All five standalone terrain-spring sprites (`$30/$31/$33/$36/$38`) had their
   dominant blue/cyan background made alpha zero in both the root PNG and the
   required GameMaker `layers/` copy.
2. POC 17.4 normalized every transparent pixel to exact `(0,0,0,0)`, matching
   the already-working object-`$26` spring sprite.
3. Packaging validates root/layer equality and 854-856 transparent pixels per
   32x32 spring frame.

The rectangle nevertheless remains in GameMaker. This means the small spring
sprite is not the complete source of the visible square.

Strong next lead:

- THZ terrain is also drawn through four 1024x1024 sprites:
  `SPR_chaos_terrain_0..3`.
- World `(2112,832)` lies in `SPR_chaos_terrain_2` at local `(64,832)`.
- That terrain PNG is fully opaque and contains the spring/layout cell with its
  blue/cyan background baked into the decoded map artwork.
- The full-map diagnostic crop around the cell reproduces the spring beside the
  canonical spikes.

Next fix should therefore trace the terrain/map generation and its composition
with the THZ background. Make the layout block's background pixels follow the
original transparent/background-plane rule and regenerate the affected terrain
quadrant plus GameMaker layer copy. Do not paint over the rectangle manually,
delete the canonical block, or add a placement-specific cover object.

The thin translucent lime outline sometimes seen during testing is separate:
F3 debug draws the currently sampled 32x32 tile outline with `c_lime` at 45%
alpha in `objects/OBJ_chaos_controls/Draw_0.gml`. It is not spring artwork.

## Other known differences and limits

- Spring and player roll animations remain visibly different from the ROM.
  The current adapter deliberately uses inherited GameMaker sprites and does
  not implement the full original state-script/animation scheduler.
- Loop/twist traversal works, but rolling presentation is overused.
- Object activation/despawn timing and the PAL/NTSC scheduler are not fully
  established. Per-update physics must not be retuned to compensate for an
  unverified real-time cadence.
- Loops and moving platforms remain bounded adapters rather than complete ROM
  translations.
- Type `$18` is the dynamically loaded goal sign in the reference research but
  has not yet replaced the temporary POC completion logic.
- Types `$09` and `$10` resolve to the ring/sparkle and monitor families in the
  graphics research; they are not additional THZ enemies.
- GameMaker is unavailable in the Linux workspace. Every archive still needs a
  Windows compile and playtest.

## Verification currently passing

- 15,660 cases execute the shipped GML movement core.
- POC 16 verifies all 112 twist dispatch entries and 1,078 entry/boundary cases.
- Original Z80 handler checks pass for object `$26`, object `$1B` and object
  `$27` callbacks/boundaries.
- Canonical layout verification reports:
  9 terrain springs, 4 concealed springs, 4 moving spikes, 4 static spike cells,
  3 type-`$27` objects, 6 platforms, 142 rings and 4 monitors.
- Packaging validates all GameMaker `.yy` resource paths, required root/layer
  PNGs, data-card defaults and absence of ROM files.

The last archive produced in this thread is POC 17.4, SHA-256:
`2514b164d71cdea8a8c28cd0af7a1871f1ad56c99522d3c6523be143042b521c`.
It is useful as a regression baseline, but the spring rectangle is explicitly
not fixed.

## Recommended next pass

1. **Synchronize both repositories.** Review the user's newest ROM decoding,
   especially the independent type-`$21` work, before touching the POC.
2. **Fix the `$31` terrain composition at its source.** Trace how
   `TurquoiseHill_full_map.png` and `SPR_chaos_terrain_0..3` were generated.
   Regenerate rather than hand-paint; confirm the block at `(2112,832)` becomes
   transparent against both the blue and dark backgrounds.
3. **Re-test moving/static spikes.** Confirm raised/lowered Y alignment, matching
   collision, and the newly ported type-5 static hazard on Windows.
4. **Integrate type `$21` only after the research lands.** Use exact six ROM
   records, decoded parameters, reachable frames/palette and handler states.
   Do not infer behavior from its appearance.
5. **Finish THZ1 object population.** Audit activation/despawn and contact for
   `$21/$27`, then implement the ROM-derived goal object `$18` rather than the
   temporary coordinate completion check.
6. **Animation/state pass.** Trace enough of the original scheduler to correct
   excessive rolling and spring-flight animation without changing verified
   movement impulses.
7. **Cadence and completion audit.** Measure original hardware/emulator update
   cadence and slowdown separately from fixed per-update physics; then perform
   repeated full Act 1 runs on both routes.

## Suggested first acceptance test in the new thread

After synchronizing and fixing the terrain generator, build one narrow archive
that changes only the `$31` cell composition. Test the spring at `(2112,832)`
with F3 both off and on:

- no cyan/green filled rectangle with F3 off;
- only the expected thin sampled-tile outline with F3 on;
- red spring artwork, launch direction and height unchanged;
- adjacent static spikes still damage on floor contact;
- no changes to any canonical placement.

