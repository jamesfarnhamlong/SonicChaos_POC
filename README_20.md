# POC 20.0 — THZ1 engine reconciliation

Diagnostic build **POC 20.0A** identifies itself in-game as `THZ POC 20.0A` and, with F3 enabled, `BUILD: POC20-A TASK09`. It adds runtime contact/type-`$27` telemetry after the first Windows run contradicted source-only verification. It is not POC 20.1.

This cleanup keeps THZ1 scope and applies the reviewed Task 09 contracts. Damage now remains in the Chaos player core; immunity gates damage only, never terrain sensing. Terrain block `$47` uses one merged post-sensor response, layout rings use their canonical 16x16 quadrant rectangles, and type `$27` separates allocation/update/SAT lifetime phases.

The type `$21` `+18` grounded draw policy remains an explicit temporary presentation adapter. Type `$10` coordinates are unchanged and now use an explicit canonical/render/canvas path with measured pixel bounds. Their final registration against the original game remains unresolved and requires visual comparison; do not move placement data to compensate.

## Short Windows checklist

1. Take damage on flat and sloped terrain while moving; Sonic must remain in Chaos collision and must not fall through during hurt/blink.
2. With invincibility or rocket shoes active, confirm terrain collision remains normal.
3. Compare extra-life, rocket-shoes and invincibility TVs against original footage; report the exact vertical delta if still high.
4. Confirm the spring badnik remains grounded and its side/top behaviour still works.
5. Inspect rings around the twisting/Mobius terrain for quadrant alignment.
6. Roll into a ten-ring terrain box from both sides; it must break, launch straight upward, add exactly ten rings, and leave replacement terrain.
7. Approach the flying badnik normally and watch for unnatural pop-in or recreation.
8. Traverse the full act: loops, ramps, springs, spikes, platforms, twist and finish.

The automated suite validates source/resources and deterministic core fixtures. It does not compile GameMaker or substitute for the original-game visual comparison.
