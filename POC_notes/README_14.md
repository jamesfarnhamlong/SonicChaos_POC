# Turquoise Hill Act 1 — prototype 14

Open `SonicChaos_POC.yyp` in GameMaker LTS2026. Press F5, choose Start Game / first stage. R restarts; F2 opens the Open Sonic SMS sample; F3 toggles debug. The sample rooms retain their previous movement.

This prototype starts replacing the player collision path with the verified Sonic Chaos SMS 1.2 routines documented in the separate `sonic-chaos-reference` package:

- The THZ layout now has all 256 decoded base collision headers and 16 alternate-plane headers, each containing flags, modifier, vertical (X-indexed), and horizontal (Y-indexed) profiles. Data is generated from the verified exporter, not painted terrain masks.
- Normal and rolling players probe from the original foot/side positions. Ordinary solid and one-way floor projection retains the **previous** header flags and looks at the tile above when needed, including vertical samples exceeding 32. The old whole-sprite sweep, mask floor halt, and mask ground-follow loop no longer govern THZ player terrain.
- Ordinary side projection uses the ROM's horizontal profile and only stops motion at a matching boundary. The type `$12` first curve uses the previous modifier and a signed 8.8 ramp impulse to request state `$1B` when the original branch is eligible. The initial-roll tile branch is retained.
- The two-times-per-update prototype scale now gives normal airborne gravity 0.75, ramp gravity 0.5625, upright spring ascent gravity 0.375, ordinary jump impulse -8.5, and a falling cap +14. The upright spring changes to falling with +2 at its apex, corresponding to +1 in the original.
- F3 reports tile, previous flags, modifier and movement state. Near the first curve, look for tile 34 (modifier 14), then tile 35 (modifier 10, type 18); an eligible passage should show ramp state 27 and negative Y speed. Exact coordinates may differ slightly because the legacy player sprite's bounding box is not the original Chaos sprite.

**Run this build in a fresh folder**, preserving all resource directories. Check starting/idle, the first curve walking and rolling, the adjacent tall wall, one upright spring (including apex and landing), a loop, a moving platform, and the right-side finish. Send the F3 tile/flags/modifier/state and screen recording at any failure.

This is a bounded port of the *ordinary* collision and ramp branch. Special tile effects, complete state interpreter, plane-switch triggers, alternative side-handler dispatch, enemy probes, object type `$26` spring rules, and original scheduler timing still need integration. Loop path handling and the twist remain the v13 prototypes. The GameMaker build cannot be compiled in this environment; ROM-derived header values and edited script structure were checked offline. Do not take a successful local source check as Windows gameplay validation.
