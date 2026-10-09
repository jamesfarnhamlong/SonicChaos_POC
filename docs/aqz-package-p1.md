> Historical package A notes. Package B changes and current limitations are in `aqz-package-p1-b.md`.

# Aqua Planet Zone P1 — Windows review

Branch `poc/aqz-p1-foundation-water`, base `5d99a38d1f439ac02cd9d3010d09f70cc57aa575`. Integration branch `poc/thz1-cleanup` was fast-forwarded and pushed to that exact baseline. P1 is uncommitted pending Windows acceptance.

Research main: `eb4bf953dcb2f1ad57c629543b55c8536eb688cb`. Consumed unchanged caches: `implementation-manifest.json`, `object-census.json`, `art-approval.json`, `water-runtime.json`, `original-checks.json`, `water-game-checks.json`. Generator verifies the local ROM SHA-256, correct bank-relative mapping conversion and the approved composition cache before producing resources. No replacement art or hand-authored room objects.

## Implemented systems

Three canonical rooms, dimensions/start/camera/layout, both collision planes, AQZ2 4095-cell ceiling, terrain/type $09 rings, monitors including Rocket Shoes, AQZ1/2 ordinary sign clear, type $30 strong spring through the shared $26 path, accepted terrain springs/routes/breakable/crumble/booster/hurt/lost-ring contracts. Later mapped families $3F, $3C/$3D and $59-$5D remain recorded and filtered. AQZ3 has no temporary clear.

AQZ1/2 water controllers, initial WORLD line 768 and subsequent 568/788 publication, equality/submerged crossing, signed-high-byte attack gate, state-specific underwater control/gravity/jump/Rocket behavior, updater-call air clock, bubbles, splash, countdown, 16-call frozen recovery, drowning and ordinary restart convergence. AQZ3 allocates no controllers and never calls the water updater. Loop paths latch water and air. The water interpreter uses the shared nineteen-slot SEZ scheduler; sixteen-slot general and eleven-slot dynamic allocation ranges retain first-free/failure semantics. Existing shared systems outside that pool retain their accepted GameMaker lifecycle adapters; this milestone does not redesign their global slot ownership.

Mapped bubble creation follows the nineteen-slot pass on every fourth D2E2 pass. Controller callbacks visit in slot order; raster preparation uses the previous published waterline before each controller publishes its own line. Player crossing precedes movement. Effect 5 (three updates) and effect 11 (eight updates) remain separate.

## Explicit presentation adapters

`SHD_chaos_aqz_palette` decodes generated AQZ textures carrying exact palette indices (opaque R=index+1, G=B=1 byte; transparent alpha unchanged). Three independent 32-entry sources remain above-water CRAM, fixed IRQ CRAM at ROM $0688, and indexed palettes $30/$31 for wholly submerged rendering. No generic tint substitutes for these sources.

The split adapter uses the original 192-line enable relationship, WORLD waterline minus camera Y, with the first lower-color row at R10+1. It retains the recovered offscreen enable/disable and palette-request state. This is a GameMaker raster approximation, not literal SMS IRQ emulation or a hardware timing observation. The 256-pixel fidelity view keeps canonical coordinates; wider camera framing reduces the right bound by excess viewport width. No gameplay coordinate moves for the split.

Imported AQZ art retains exact indices. Retained openSonicSMS RGB player/shared art has no canonical index channel: lower/full rendering maps each RGB pixel to the nearest above-water sprite-CRAM entry (duplicates choose first). This preserves its composition but is a presentation approximation requiring Windows comparison. The air-recovery composition is ROM-derived and indexed. Refresh-register breath-bubble phase uses the deterministic update byte; it does not alter air thresholds, allocator failure, or player physics. Sound requests are published through the existing request interface; this package does not invent missing canonical audio assets.

## Validation and review

Focused runtime: 15,928 assertions, including boundary sweeps, original lifecycle vectors and both 2,040-call air-clock traces plus recovery traces. Integration: 70 assertions. Asset/cache/layout/collision/pixel checks: 2,465 assertions. Portable navigation: 242 assertions. Research AQZ: 17 tests. Full regression inventory: 65/65 commands passed. Project hygiene and `git diff --check` pass. Relevant SEZ/ring checks were repeated after the final mapped-scan/render changes.

Compile with GameMaker LTS2026 runtime 2026.0.0.23. The unknown-user Igor profile fails before compilation; the authenticated profile successfully compiles GML, shader and assets. `verification/compile_aqz_p1.ps1` uses that profile and distinct output/data and ZIP paths. Source and fresh-extraction compile evidence and package SHA-256 are recorded outside the source package under `build/aqz-p1/package-report.json`. No compile exit code alone is treated as success; logs and outputs are checked.

Windows acceptance remains pending. Review AQZ1/2 split palettes, crossing and exit, repeated attack gate, Rocket Shoes, small versus large bubbles, air recovery/countdown/drowning/restart, sign return to Level Select, AQZ3 dry behavior, and accepted shared mechanics. Raster hardware timing, the legacy RGB palette adapter and actual gameplay appearance require human comparison. No new unresolved ROM behavior was substituted. P2/P3/P4 remain blocked on P1 acceptance.
