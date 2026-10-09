# AQZ P1 B — Windows follow-up A1B

Uncommitted on `poc/aqz-p1-foundation-water`, base `5d99a38d1f439ac02cd9d3010d09f70cc57aa575`; Research main `eb4bf953dcb2f1ad57c629543b55c8536eb688cb`. P1 remains unaccepted. No P2/P3/P4 objects or substitute routes added.

## Palette adapter

A's shader performed nearest-RGB palette conversion on arbitrary unindexed input and decoded index markers after vertex tint. The ring surface itself was cleared each Draw and shader-reset before compositing; no previous-output surface feedback, mutated canonical cache, or player palette mutation was found. The precise Windows trigger has not been captured, so a confirmed double-conversion call stack is not claimed.

B removes runtime RGB conversion entirely. Existing Sonic/Rocket sprite compositions have immutable adapter copies: original RGB is preserved byte-for-byte; opaque alpha carries the nearest canonical above-water sprite index plus one (transparent alpha remains zero). This is an adapter encoding, not new/replacement artwork. Metadata origins/frame counts and original sprites/masks remain intact. In the dedicated player draw, the shader recovers full opacity and selects a palette directly using that stored index. Above-water player RGB remains original. Copies are always sampled from original sprite textures; transformed output is never input to subsequent selection. Spin and ordinary-death player objects now use the same single-source draw path.

For other AQZ indexed art, decoding occurs before vertex tint/alpha. Unindexed RGB is passed through; there is no generic underwater remapping of already-rendered RGB. The ring surface is still cleared, transformed once and composited after shader reset. Both encoded and player outputs are idempotent under a repeated adapter pass.

Canonical bytes and gameplay water semantics are unchanged. Three sources remain distinct: above-water CRAM, fixed IRQ CRAM, and indexed $30/$31 CRAM. The original 192-line enable domain and first-lower-row R10+1 approximation remain; offscreen transition requests and restart initialization match the existing Research oracle sweeps. Tests exercise deep/split/above/repeated selection and reset paths from immutable input. CPU/source assertions do not substitute for a Windows GPU raster observation.

## Cadence, bubbles and Rocket

AQZ had incorrectly fallen through the legacy terrain-ring clock: 0.25 frames/update, four updates/frame. It now joins the accepted GPZ/MGHZ/SEZ clock: four frames, eight updates/frame, 32-update cycle. The shipped Step event is checked over 96 updates for all four zone paths.

Mapped type $0C exists and executes at AQZ1 (768,686), AQZ2 (2496,942). A 900-pass scheduler trace at each anchor allocates the mapped emitter on pass1 and emits small/small/large on passes131/251/363, then491/611/723. The extra first pass is mapped creation before the first callback; relative to callback1, the Research schedule is130/250/362. Dynamic allocation uses first-free slots7..17. No visibility fallback or frequency change.

Ordinary Rocket duration passes 300 decrements with dry and submerged water flags. Water does not cancel it. No Rocket gameplay change.

## Route classification evidence

AQZ3 has no $3F/$3C/$3D records. Its four mapped records are $59 at (1856,238), monitors at (816,366) and (1552,142), and $30 at (944,256). The actual shared $30 gate/launch executes at that anchor: runtime springY268, grounded playerY238, Y speed -1888/256, requested $0B, D448=255. Canonical generated layouts/collision remain checked against the ROM. Around the spring, column29 is empty at rows6/7, floor block$0A at row8 and ceiling spring block$3B at row9; adjacent solid walls are canonical. No collision was removed.

The Windows screenshot/coordinates were not present in the follow-up message. Therefore the observed AQZ3 blockage cannot yet be matched to an exact cell or classified as the intended boss boundary. This remains a Windows-review blocker; passing the spring test alone does not prove the observed route is traversable.

AQZ2 lower-route deferred candidates are $3F (2096,669), $3C (1088,814)/(1216,814), and $3D (272,782), plus the other exact census records retained in the cache. Missing these systems is expected P1 incompleteness, but attribution of James's specific route still requires its location. The upper route has canonical shared crumble block$AF at cells(42,9)/(43,9), world(1344,288)/(1376,288). If the lodged observation occurred there it belongs to P1's shared $13 contract; without its coordinate/trace it is not classified as a defect or patched. These limitations are explicit rather than guessed.

## Validation and retest

Focused: runtime15,928; integration70; assets2,573; A1B cadence/emitter/spring/Rocket1,000; immutable palette174,838 assertions; portable navigation242. Full accepted inventory and its retries are recorded in build/aqz-p1/full-results.json. Formatting-only IDE changes were restored against packageA where parsed values were identical; remaining metadata values were preserved and written as valid JSON for existing verifiers. No accepted placement or animation timing was changed as a fixture workaround.

Source and fresh package extraction must compile with authenticated GameMaker LTS2026 runtime2026.0.0.23. Package excludes ROMs, build debris and the preserved parked GPZ/options files. No commit before Windows acceptance. Retest palette entry/exit, repeated crossing, AQZ2 deep/backtracking, drowning/restart, ring cadence, and supply the AQZ3/AQZ2 observed route coordinates for the remaining classification.
