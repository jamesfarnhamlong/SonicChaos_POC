# AQZ P1 D: widescreen water strip

Uncommitted `poc/aqz-p1-foundation-water`, accepted base `5d99a38d1f439ac02cd9d3010d09f70cc57aa575`; canonical Research main `eb4bf953dcb2f1ad57c629543b55c8536eb688cb`. No P2 work. Package C Windows checks passed palette stability, visible bubbles, large-bubble air recovery, drowning/restart and terrain-ring cadence.

## Bounded presentation adapter

The two recovered $0D objects retain their canonical callback, frame, table phase and WORLD waterline Y. Their tables remain 8..248 in16px steps and the second table is rotated by eight entries. No new controller, placement, artwork or animation clock was added.

`chaos_aqz_water_strip_draw` in `SCR_chaos_aqz_environment` always draws the original sprite at the original canonical anchor first. At viewport width256 it returns immediately: exactly the Package C draw output. At larger widths it repeats that same draw at integer256px offsets, including neighboring periods whose sprite bounds overlap the visible viewport. Positions follow the source controller's camera-relative anchor, retaining its integer quantization; they are not snapped to an unrelated WORLD tile grid. Extra copies inherit the same frame and Y. Rendering clips at the viewport, and sprites are never stretched.

The approved sprite has an opaque16px footprint, x24..39 in a64px canvas with x-origin31. Its last canonical anchor248 therefore has a one-pixel overhang at256. Including the intersecting left neighbor in wide mode wraps that existing registration pixel at the left edge; adjacent periods match the complete periodic raster at256 and512 with no gap or duplicated phase at those boundaries. The256px baseline remains exactly unchanged. Canonical first-domain controller anchors/phases are preserved at every width; only wider-view edge overlap and extension are adapter behavior.

This is a sparse moving shimmer, as in the canonical two-instance pattern. Coverage checks span its16-phase cycle; the adapter does not fill the original gaps with extra artwork on each individual frame.

Only the water-strip Draw dispatch uses this helper. No change to canonical caches, waterline, split/raster, palette buffers/selection, Effect5/11, water flags, movement, counters, allocation or lifecycle. Bubble/splash/countdown drawing remains unchanged.

## Validation

Focused D runtime/draw:3,749 assertions,288 cases over widths256/348/640,16 phases and cameraX0/1/127/256/1023/1023.5. Tests execute the shipped helper and source-traced controller callback, proving the original call and eight-entry phase offset, camera scrolling/quantization, fixed256px repetitions, unchanged environment state and WORLD Y.

Pixel verifier:885 assertions using the actual unchanged approved sprite and those shipped draw-call traces. The256px bitmap matches the original clipped output exactly. Wider output matches an independently folded periodic canonical raster at every pixel and phase, including256/512 boundaries. Every horizontal pixel is reached during the canonical cycle at348/640. The one-pixel uncovered left edge of the original256px clipped baseline is retained there.

Repeated submerged updater calls at WORLD Y700 continue to set Y speed-3.0 for attack/high signed-X-byte cases, without requiring a crossing or creating an entry splash. Existing Research-backed crossing/state tests remain intact.

The full P1/shared regression inventory is70 commands, including portable navigation, project hygiene, Research oracles and git diff --check. Source and fresh package extraction are compiled with authenticated GameMaker LTS2026 runtime2026.0.0.23; final results are recorded in build/aqz-p1/package-report.json. Verification-only screenshot fixtures are excluded from the archive.

## Stop point

Package D contains one top-level source project and one intended .yyp; it excludes ROMs/build debris and preserves the parked19 GPZ diagnostics and six platform-options directories in the workspace. Existing AQZ2/AQZ3 route observations remain open; no deferred-family or collision changes.

Remain uncommitted. Stop for the short Windows visual check of shimmer coverage and repeat boundaries while scrolling, especially at348/640 widths. No P2 before P1 acceptance.
