# GPZ3 $51 — final widescreen presentation pass (E.2)

The implementation builds on accepted base
`84c3e108177bca06b490c5857307e02147cb2901`. E core is Windows accepted;
E.1 gameplay/horizontal framing/projectile lifetime are approved. This pass
changes only the wide camera presentation/handoff. Final-run presentation,
boss/controller world coordinates, collision, floor Y270, sway, throws and
E.1 projectile physics/lifetime remain unchanged.

## Native viewport and vertical framing

James clarified that640x360 is the displayed image, **not** a world viewport.
The existing logical view remains348x196. At that size fight camera top is112,
16 logical pixels below the former96. The approved SAT registration and terrain
put the visible floor at world288; the new strip below it is
`196 - (288 - 112) = 20` logical pixels, or36.73 displayed pixels.

The canonical256-wide fixture keeps exact Y96, including its update sequence.
192-high views and4:3 presentation also retain96. Taller widescreen views blend
the explicit +16 offset over192..196 logical height. Horizontal target remains
`1664 - max(0,width-256) - 1`:1571 at348,1279 at640. No logical view dimensions
or zoom are changed. Raw canonical clear-bottom limit96 is retained; its wide
presentation target remains112 through release to avoid a vertical discontinuity.

Actual GameMaker2026.0.0.23 application-surface screenshots,640x360:

- `verification/gpz-boss/e2-baseline-640x360.png`
- `verification/gpz-boss/e2-updated-640x360.png`

The new capture was visually inspected before packaging: the floor strip is
visible, the stack/player are fully framed and the approved right-edge boss
relationship is retained. These are rendered captures, not synthetic artwork.
The isolated fixture has controlled initial actor/camera placement and one final
health request; no actor/camera teleports occur during the measured handoffs.

## Entry and exit diagnosis

Four real-run1000-update traces cover a static arena fixture and a walking
approach beginning before mapped placement activation, before/after correction.
`e2-*-runtime-trace.json` records every update's camera left/top/mode, logical
viewport, Sonic and head world/screen X/Y, fight targets, canonical
left/right/bottom limits, mapped-active status and player active/requested state.
Head world X can sway normally; controller initialization remains1856.
The wrapper instance exists before its mapped creation; `active` marks the
placement-manager activation used for the creation milestone.

Findings and explicit **GameMaker widescreen transition adapters**:

- **Placement loader:**348-wide activation is earlier than the256 control
  because the existing outer bands follow the real viewport edge. This is
  expected existing behavior; no placement or activation rule changes. Before/
  after walking fixtures both activate on update57.
- **Normal-to-boss takeover:** GameMaker object-follow can overwrite camera Y
  before End Step. The normal zone camera normally overrides it; on first boss
  activation that intermediate view leaked into the handoff. Before correction
  the approach trace has a31-logical-pixel camera step. The wide controller now
  remembers the last displayed normal-camera view and takes ownership from it.
- **Pan entry:** the old exclusive-limit clamp could snap X when approaching
  from the right. In the static fixture it jumped15 pixels. Wide pan now
  approaches the same exclusive target from either side at1 pixel/update.
  Canonical256 uses the original arithmetic and clamp exactly.
- **Player clamp:** the original viewport clamp is unchanged. In the approach
  fixture Sonic is about130 logical pixels from the left at settled fight, not
  at a clamp boundary. It does not cause the observed camera jumps.
- **Clear release:** the old direct player-centred follow produced another
  15-pixel step in the static fixture. Wide mode1 takeover and mode4 release now
  move at most4 logical pixels/axis/update toward the existing targets/limits.
  The complete updated approach trace has no active camera step larger than4.
  Both approach fixtures request final clear/release on update668; clear gate,
  defeat timing and shared state$20 logic are unchanged.

Pan begins update186 in both walking fixtures. The old camera-ready/locked mode
starts update233; the new top112 is closer to the approach view and is ready
update229. This is target-distance-dependent camera pan, not a boss timing hack.
Summary and milestone rows: `verification/gpz-boss/e2-camera-summary.json`.

## Evidence and packaging

Approved PNG boards remain binding and explicitly referenced:

- `verification/gpz-enemies/approved/51-stack-registration.png`
- `verification/gpz-enemies/approved/51-sequence-summary.png`
- `verification/gpz-enemies/approved/51-mode-direction.png`
- `verification/gpz-enemies/approved/support-approval.png`

Imported composition preview remains `verification/gpz-boss/poc-boss-sheet.png`.
No art bytes, origin, SAT piece composition or mirroring change in E.2.
Normal head+balls1/2/3 and separate mode2 ball4 remain distinct approved variants.

Verification:27-command batch, including11,442 camera assertions plus the
takeover-overwrite regression, exact640-row256 control, native runtime trace/
PNG checks,150,352 E.1 adapter and109,895 canonical boss assertions, existing
GPZ/THZ/regular-enemy/art/completion checks and `git diff --check`.
Grounded clear is checked at256x192,640x192 and the actual348x196 view.

Both shipping source and freshly ZIP-extracted project compile. Capture hooks,
fixture executables, sandbox setting changes, build outputs, ROMs and unrelated
diagnostics are excluded from the Windows package. The capture generator writes
only isolated copies under ignored build output; shipping options are untouched.
The historical E/E.1 ZIPs remain available. James accepted Windows Package E.2
on2026-10-04 and authorized the `feat: add GPZ3 boss` checkpoint. Acceptance
includes the complete boss and E.1/E.2 camera/projectile adapters. The accepted
ZIP SHA256 is `5ec97af8456274d1c6a7252297d5b07cd258626c0cdfccfe24832dcbc83e2983`.
Ring recovery is outside this final presentation pass; Research's new ring-loss
audit399f95b is not consumed here. Boss canonical caches still consume44e0714.
