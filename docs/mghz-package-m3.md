# MGHZ Package M3 — $24 / $2E

Base POC: `af7f0b43029cc1994e655eb9243e27120b5278ae`.
Canonical Research main: `7ba4d8a7bfb7f8164462fbf50db05c4b63cec0fe`.
**Windows acceptance: PASS — James, 2026-10-05. GameMaker compile/launch: PASS.**
Accepted for the M3 checkpoint on `poc/thz1-cleanup`.
Package: `SonicChaos_MGHZ_24_2E_20261005_M3.zip`.

## Implementation

The existing generic MGHZ importer supplies all 12 $24 and both $2E records;
there are no room-authored placements or act-specific strip lengths. The audit
cache is mirrored byte for byte at `POC_notes/rom-cache/mghz/object-24-2e.json`.

`SCR_chaos_mghz_m3` executes the new objects after the player/terrain update.
$24 uses the canonical strict horizontal <48 / absolute speed <$100 trigger
with no Y/state/posture test; 16 moving shake passes (+2,+4,+2,0 repeated),
then the seventeenth setup pass without movement or contact. Fall moves before
adding $10 gravity, drifts ±$80 and samples the header of the cell at (x,y+18).
All 12 placements match the Research 56-pass, 96-pixel landing fixtures, with
fractional positions preserved. Landing consumes the placement, adds ten to
the existing GameMaker `score` counter and publishes the canonical BCD award
bytes. The $D292-equivalent score gate is present in the numeric runtime;
MGHZ has no implemented boss/bonus mode that sets it yet.

Conversion preserves the saved $24 frame in its slot for that pass, then uses
the accepted shared $0F timeline, MGHZ poof sprite and sound request $C4. The
conversion-to-slot-clear sequence is 41 passes. No substitute art/audio was
added. $24 uses the shared closed overlap classification and staged $0434
damage request; attack/roll/jump do not defeat it or rebound Sonic. The existing
player damage gate handles invincibility, blink and hurt suppression.

$2E is a keep-alive parent with no contact. Its strip is left-open/right-closed,
anchor Y ±2; four frame-4 passes are followed by three spawn commands and an
immediate strip recheck, for a five-pass burst period. Child offsets, velocities,
gravity, 12 moving passes and $FE/$FF/cleanup are locked directly to Research
rows for both player flag-bit-4 directions. Art remains unmirrored.

## Allocation and adapters

The ordered 19-slot representation uses the original first-free allocator for
slots **7..17 inclusive** for both new placements and children. Full allocation
silently skips each creation command; a child allocated below its parent is
not revisited until the following pass. $FE/$FF release takes separate visits.
The allocator helper is also used by the existing GPZ3 slot interpreter without
changing its ranges or ordering.

Existing M1/M2 GameMaker instances contribute occupancy references in placement
order; accepted lost-ring structs reserve the overlapping slots in their
0..15 allocator range. These bridges do not alter their gameplay, visuals,
contacts or simulation. The sampled MGHZ1 strip scene reproduces slots 7/8
for its platforms and slot 9 for the emitter. **The bridge follows the accepted
POC lifetimes of other subsystems; it is not a whole-game ROM slot interpreter.**
Exact mixed-scene pool occupancy can therefore differ where those existing
subsystems already differ from the ROM. That remains an integration limit,
not an unresolved rule inside the new $24/$2E state machines.

$24 uses the existing viewport EDGE bands for initial creation/wake, with no
extra retention on entry. Only the already accepted post-awake horizontal
retention adapter extends its subsequent lifetime. The player trigger,
terrain sampler, collision geometry and vertical bands are unchanged at all
widths. At 256 the lifecycle matches the canonical bands exactly; sleeping
airborne pieces freeze, removed pieces recreate at their original anchor,
converted pieces remain consumed.

$2E creation explicitly uses a 256-pixel view window at every display width.
Its initialized parent is permanently keep-alive. A fresh approach from the
right outside the original origin creation window has no parent and no splash;
the implementation does not force-create one. Neither strip length nor child
physics is widened.

## Verification

- Shipped-GML M3 suite: **66,053 assertions**. Direct locks include both shake
  templates, all twelve fractional landings, the 24,990-case Research contact
  grid, strip boundaries, both child row tables, pool exhaustion and scheduler
  delay; additional sweeps cover player states, sleep/recreation/consumption,
  widescreen retention, score, shared player damage and runtime occupancy.
- Full batch: **34/34 commands passed**. M1/M2, $21 and footwear (1,758
  assertions), lost rings, shared contact/lifecycle, terrain rings, springs,
  platforms/spikes, shared $0F, GPZ and THZ boss/clear regressions included.
- Original Research suite: **45 tests passed**, verified local ROM SHA-256
  `eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.
- Assets: **61 assertions**, nine imported frames, both acts; zero pixel
  differences against independently recomposed approved Research art. Shared
  $0F tile bytes also match THZ1. The visually inspected verification PNG is
  `verification/mghz-m3/m3-verification-sheet.png`; it uses shipped-GML frame/
  coordinate samples and shipped sprite pixels, not a claimed native screenshot.
- `git diff --check` passed. Relevant new YY/resource/frame/layer references are
  included in the project; Igor successfully loaded/linked the asset project.

Standalone Igor then failed **before GML compilation**: `Permission Error :
Unable to obtain permission to execute`, `GMAssetCompiler.dll` status -1.
The wrapper shell exit code is not evidence of compilation. Permissions were
not changed. James subsequently confirmed GameMaker compile/launch PASS and
Windows gameplay acceptance. The package sidecar report preserves the earlier
standalone attempts as historical evidence; they do not supersede IDE acceptance.

James tested the $24 falling hazards and $2E oil splash emitters in GameMaker:
behaviour, graphics and general MGHZ regression looked good. The downhill/fall
presentation glitch and spring/jump/facing oscillation (including after the $21
top-stomp rebound and into a fall-looking state) were classified as pre-existing,
parked issues, not M3 blockers. They are unchanged in this checkpoint.

Reproduction: run `verification/run_mghz_m3_checks.py` with the bundled Python
and the Research venv's site-packages on PYTHONPATH. Run the original Research
tests with its existing `.venv/Scripts/python.exe -m unittest
tests.test_mghz_object_24_2e`.

## Changed files and scope

- New runtime: `scripts/SCR_chaos_mghz_m3/` (GML and YY).
- Wiring: `SonicChaos_POC.yyp`, `scripts/SCR_chaos_level/`,
  `scripts/SCR_chaos_objects/`, `objects/OBJ_chaos_zone/Draw_0.gml`.
- Shared allocator call only: `scripts/SCR_chaos_gpz_boss/SCR_chaos_gpz_boss.gml`.
- Approved art: `sprites/SPR_chaos_mghz_object_24/` and
  `sprites/SPR_chaos_mghz_object_2E/` (nine frames plus editable layer copies).
- Importer/caches: `POC_notes/generate_mghz_m3.py`,
  `POC_notes/rom-cache/mghz/object-24-2e.json`, `m3-assets.json`.
- Verification: `verification/chaos_world_harness.js`, `verify_mghz.js`,
  `verify_mghz_m3.js`, `verify_mghz_m3_assets.py`, `run_mghz_m3_checks.py`,
  `package_mghz_m3.py`, `verification/mghz-m3/` and this report.

$56/$57/$58 remain excluded. $2D creates no instances. Parked animation,
slope/spring presentation and shared monitor push/pull work was not changed.
Pre-existing untracked GPZ diagnostic files are preserved and excluded from
this package. The existing M2 verification PNG was restored after its checker
regenerated it; it is not an M3 change.

No new art approval gate is needed. Windows compilation/gameplay acceptance
passed. The inherited mixed-scene occupancy limit above remains documented.

AGENTS candidate update: MGHZ M3 $24/$2E are implemented, fixture-verified and
Windows accepted; dynamic M3 allocation uses slots 7..17; $2E initial
creation is intentionally not widened. Root AGENTS.md was not edited.
