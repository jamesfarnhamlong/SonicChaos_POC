/// One owner for two separate canonical THZ1 ring populations.
depth = 0; // Explicit order: terrain 100 -> ring manager 0 -> player -50.
// Population A: terrain-derived blocks $40-$43.
chaosRingRecords = chaos_is_thz2() ? SCR_chaos_thz2_terrain_rings() : SCR_chaos_ring_data();
chaosRingSourceCount = array_length(chaosRingRecords);
chaosRingQuadIndex = chaos_terrain_ring_index(chaosRingRecords); // $753E probe point -> record
chaosRingActive = array_create(chaosRingSourceCount,true);
chaosRingExpectedThisFrame = array_create(chaosRingSourceCount,false);
chaosRingDrawnThisFrame = array_create(chaosRingSourceCount,false);
// Population B: raw object-list type $09. Parameter $00 is visible state 1;
// parameter $01 is invisible state 3 and is never submitted to the renderer.
chaosType09Records = chaos_is_thz2() ? SCR_chaos_thz2_type09() : SCR_chaos_type09_data();
chaosType09SourceCount = array_length(chaosType09Records);
chaosType09VisibleCount = 0;
chaosType09HiddenCount = 0;
chaosType09State = array_create(chaosType09SourceCount,0);
chaosType09Collected = array_create(chaosType09SourceCount,false);
chaosType09SparkleTimer = array_create(chaosType09SourceCount,0);
chaosType09ExpectedThisFrame = array_create(chaosType09SourceCount,false);
chaosType09DrawnThisFrame = array_create(chaosType09SourceCount,false);
for (var cp_t09=0; cp_t09<chaosType09SourceCount; cp_t09++) {
    if (chaosType09Records[cp_t09][3] == 0) {
        chaosType09State[cp_t09] = 1;
        chaosType09VisibleCount++;
    } else {
        chaosType09State[cp_t09] = 3;
        chaosType09HiddenCount++;
    }
}
chaosRingFrame = 0;
chaosRingGlobalFrame = 0;
chaosRingSurface = -1;
chaosRingMode = 0;
chaosRingExpectedInCamera = 0;
chaosRingDrawnToSurface = 0;
chaosRingActiveCount = chaosRingSourceCount;
chaosVisibleActiveCount = chaosRingSourceCount+chaosType09VisibleCount;
chaosRingDumpRequested = false;
chaosRingRenderX = 0;
chaosRingRenderY = 0;
