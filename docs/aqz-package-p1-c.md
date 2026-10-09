# AQZ P1 C: camera palette mode and mapped bubble runtime

Uncommitted branch `poc/aqz-p1-foundation-water`, base `5d99a38d1f439ac02cd9d3010d09f70cc57aa575`. Research main remains `eb4bf953dcb2f1ad57c629543b55c8536eb688cb`. Package B is not accepted; no P2 work.

## Root causes and bounded fixes

**Palette mode:** the compiled Windows draw trace reproduced automatic vertical camera follow overriding the canonical clamp after End Step. AQZ1 drew at cameraY552, then572 instead of respecting max528. WORLD568 consequently changed from delta16/split to delta-4/whole-screen indexed $30/$31. Recorded draws: 925 split at552; seven stale split draws at572 during transition; 551 whole-screen indexed draws at572. No draw selected indexed whole-screen and fixed IRQ simultaneously. No playerWater-driven palette-mode selection or recursive RGB conversion was found.

AQZ now disables automatic vertical follow in zone Create and every End Step, using the existing explicit camera-follow/clamp path. Horizontal follow remains operational. The deep AQZ1 verification trace reaches cameraY528 and retains split mode; AQZ2 reaches784 and retains its split. Canonical palette bytes, controller publication order, WORLD waterline, and palette request transitions were not changed.

**Missing mapped bubbles:** AQZ's D2E2 fourth-update scan called a placement helper with another fourth-update throttle. Actual creation checks were every16 updates. A 6.5 px/update approach can skip the entire64 px outer creation band; initial-fill-only interior creation then prevents a late emitter creation. Existing stationary scheduler checks hid this. AQZ now classifies placements on its single existing fourth-update gate, preserving initial fill, canonical outer bands, occupied slots, allocation failure and lifecycle rules. This explains phase-dependent absence; the original James traversal was not recorded, so attribution of every reported missing bubble to that scan phase remains subject to retest.

## End-to-end Windows evidence

Verification-only compiled copies exercised approach, low/deep camera states and water exit/re-entry. Synthetic player position and camera alignment were confined to those copies; one AQZ1 visibility fixture protected the player from terrain hazards so the observation could run long enough. These fixtures are excluded from the package. This is bounded renderer/lifecycle evidence, not a claim of normal gameplay acceptance or a new drowning playtest.

Both 850-pass Windows traces allocate the canonical mapped emitters: AQZ1(768,686), AQZ2(2496,942). Relative to emitter creation, child allocations occur130/250/362 then490/610/722: small/small/large repeated. They receive first-free dynamic slots, initialize and rise through their callbacks, and reach `SPR_chaos_aqz_bubble` Draw. AQZ1 recorded552 small-frame draws and136 large-frame3 draws; AQZ2 recorded740 and192 respectively. Medium growth frames are also reached. An AQZ1 captured Windows frame visibly contains the bubble. No sprite registration, cadence, position, art or lifecycle fallback was changed.

Compact actual trace evidence is in `verification/aqz-p1/windows-c-trace-summary.json`; raw traces and the screenshot remain under `build/aqz-p1`, excluded from the source ZIP. F6 toggles an opt-in live trace in a normal AQZ room, writing `aqz-runtime-trace.jsonl` to GameMaker's save directory (normally `%LOCALAPPDATA%/SonicChaos_POC`). It records camera/waterline/delta, split enable/R10/cut, whole/lower palette sources and player water, emitter scan state, allocated slot, child parameter/state/position/asleep/frame, Draw reached/skipped, and deletion reason. Logging defaults off and changes no gameplay decisions.

## Preserved contracts and presentation adapter

Static AQZ terrain spikes still call the direct $48F7 path after testing movement invulnerability bit7. Selector6 protection remains on ordinary object/request $48BC processing. A shipped floor-dispatch regression explicitly confirms this distinction; no spike behavior fix. AQZ census has no mapped $1B family.

Package B ring cadence remains four frames, eight updates/frame. Rocket remains300 decrements, with water not cancelling it. Underwater movement, air-counter/update timing, drowning and shared debug navigation remain covered by existing regressions.

The rendering adapter still samples immutable indexed terrain/effect textures and immutable player palette proxies. It uses separate above, fixed IRQ and indexed $30/$31 lookup arrays. At the256 px fidelity baseline, the split enable domain is the original192 lines; lower raster selection starts at R10+1, translated to WORLD cameraY. Fully-submerged/offscreen transitions request indexed $30/$31; below-domain transitions request above palettes. There is no RGB compensation transform, no prior-output recycling and no gameplay-coordinate change. Effect5 and11 remain independent.

Canonical caches consumed remain implementation-manifest, object-census, art-approval, water-runtime, original-checks and water-game-checks from accepted Research main. Generated source also retains the explicit immutable player-palette adapter metadata.

## Validation and remaining review

Focused assertions: runtime15,928; integration70; assets2,573; Package B follow-up1,000; immutable palette174,838; C scan/spike/palette locks658; portable navigation242. C sweeps288 approach combinations over both acts,256/348/640 widths,4/6.5/7 px/update and16 scan phases. Full regression:68/68 commands PASS, including Research oracles, project hygiene and git diff --check. Source and freshly extracted project compile with authenticated GameMaker LTS2026 runtime2026.0.0.23; package report records the final extraction result.

AQZ2/AQZ3 route observations remain open exactly as documented in Package B. No deferred $3F/$3C/$3D/$59-$5D implementations, substitute routes or collision removals. The original blockage/lodged-block locations have not been supplied, so their exact canonical classification remains unresolved. Windows must retest low AQZ1 palette, deep/backtracking/restart/drowning transitions, and both emitter locations. Package C remains unaccepted and uncommitted; stop for Manager/Windows review.
