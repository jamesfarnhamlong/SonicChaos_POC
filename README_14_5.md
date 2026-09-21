# Sonic Chaos — Turquoise Hill Act 1 POC 14.5

Extract into a **new folder**, open `SonicChaos_POC.yyp` in GameMaker LTS2026,
Run, and choose the first stage. This is a source project, not a compiled Windows EXE.
Keep v14 alongside it for comparison. The original v14 package is unchanged.

## What changed

The playable Chaos controller now has one terrain-movement authority:
`SCR_chaos_core`. The sample player's legacy Step/End Step movement exits before
it can apply competing acceleration, friction, gravity, jump cuts or wall masks.
The F2 sample room still uses its original controller.

- Native signed 8.8 velocities and 16.8 positions, including wrapping and
  high-byte limits; no velocity-times-two/acceleration-times-four approximation.
- ROM input/friction tables and surface modifiers, current versus requested
  states, movement flags, background contacts and merged object contacts.
- Original +7/+9 downward ground-following integration followed by projection;
  previous surface flags and previous modifier are retained for the correct phase.
- Floor behaviour dispatch is separate from floor projection. In particular,
  a projection early return does not suppress ramp or empty-floor behaviour.
- Asymmetric positive/negative ramp eligibility and original launch arithmetic.
- Both side probes, delayed horizontal blocking, alternate collision-plane triggers,
  ordinary ceiling projection, and the real 4,095-cell runtime map boundary.
- Terrain springs are dispatched from ROM tile contacts, not broad sprite overlaps.
  Upright/diagonal/horizontal impulses are in original per-update units. The upright
  spring changes to falling at its original apex transition.
- Ordinary standing/walking/running/braking/crouching/rolling/jumping/falling,
  spring and ramp wrappers; crouch-spin charge/release. Sprite selection is a
  separate presentation adapter and explicitly selects idle at rest.
- A fixed sprite-to-ROM anchor offset replaces animated bounding-box physics probes.

The project options were set to **30 updates/second**. Chaos now selects a **60 Hz
test clock** and executes one native update each step; F2 restores the sample's
30 Hz clock. This is an explicit test configuration, not proof of the original
PAL/NTSC scheduler or real-time cadence. Physics fixture comparisons are per update.

## What is *not* claimed fixed

This is a bounded rebuild, not a complete ROM-equivalent engine.

- The twist/Möbius strip's special state is **still unported**.
- Loops and moving platforms retain the existing POC adapters. Their integration
  with the new controller needs Windows play-testing.
- Object-type `$26` springs retain the old provisional parameters, converted to
  native units. They are not the same verified code path as terrain springs.
- Special floor/side/ceiling handlers (including breakables, hazards, push and
  twist paths), the `$24` special projection branches, top-special probe, full
  animation/state-script scheduler, speed shoes and non-Sonic abilities remain
  incomplete. Unsupported contacted surface types appear as `unported=` in F3.
- Monitor interaction, enemy rebound, damage/ring loss/death, checkpoints and
  room-edge clipping are explicit sample-game adapters, not claimed ROM translations.
  Enemy/effect animation and timers may need recalibration at the new test clock.
- No arbitrary coordinate fixes, map-added springs, guessed breakable walls or
  painted collision replacements were introduced.

## Verification performed

`verification/verify_core.js` executes the **actual shipped GML core source** in
a JavaScript harness (the core deliberately uses syntax common to both). It does
not test a separately rewritten physics model. Fixtures come from original Z80
instructions using the checked Sonic Chaos SMS 1.2 ROM.

- 15,660 subroutine/state fixtures passed: lookup, input, horizontal/vertical
  integration, signed ramp branches, floor/side projection, ordinary ceilings,
  terrain spring setters and 16 ordinary state-wrapper entry points.
- The 48-update first-ramp shared-movement trace matches the ROM.
- The 160-update upright-spring trace matches the ROM: an empty-map launch from
  Y=800 reaches Y=503.75, a 296.25-pixel rise; falling is requested on update 80
  with +1 vertical velocity.
- These results do **not** verify every collision special, interaction or scheduler.
  The wrapper matrix is bounded to the tested RAM fixtures.
- **GameMaker compilation and interactive Windows testing were not available.**
  A passing JavaScript source test is not a GameMaker compiler result.

Re-run the included numerical checks with Node:

```text
node verification/verify_core.js
```

To regenerate fixtures, use the separate `SonicChaos_Engine_Reference_01` tools,
Python with its pinned Z80 dependency, and your matching ROM:

```text
python verification/make_fixtures.py "path/to/SonicChaos.sms" "path/to/sonic-chaos-reference"
```

Required ROM SHA-256:
`eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.
No full ROM is included. `integrate_v145.py` records the one-shot migration from
a copied v14 project; do not run it on an already migrated 14.5 project.
Older `POC_notes/README_*` files are historical; this README supersedes them.

## Windows test order

1. Start, stop and turn on flat ground. Check that Sonic returns to idle.
2. Approach the first curved slope slowly and at full speed, then try rolling.
   Test both directions and repeat each case; no embedded feet or unexplained halt.
3. Run into the adjacent tall wall and jump beneath a platform. Check side and ceiling contacts.
4. Test upright and diagonal terrain springs; watch the apex and horizontal momentum.
   Confirm the restored end-area spring is present and usable.
5. Test the moving lift (F4), loops (F5/F6; F7 reverse), rings, enemies, monitors,
   taking damage, respawning, and F2 out/back.

R restarts; F3 toggles the debug overlay. Send a video with F3 visible if something
fails: it now shows the ROM foot probe, tile, previous flags, modifier, native
velocities, current/requested state, contact flags and unsupported surface type.
Grounded `vy=7` (occasionally 9) is intentional internal ground-following velocity;
it does not mean Sonic should visibly fall seven pixels each frame.
