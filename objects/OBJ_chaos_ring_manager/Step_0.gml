if (chaos_is_gpz() || chaos_is_mghz() || chaos_is_sez()) {
    // Original terrain tile upload $7450A: four frames, eight updates each.
    chaosRingFrame = (chaosRingGlobalFrame div 8) mod 4;
} else {
    chaosRingFrame += 0.25;
    var cp_frames = max(1,sprite_get_number(SPR_ring));
    while (chaosRingFrame >= cp_frames) chaosRingFrame -= cp_frames;
}

// Type-$09 state 2 is exactly 32 updates of alternating mapping frames 5/6.
for (var cp_t09=0; cp_t09<chaosType09SourceCount; cp_t09++) {
    if (chaosType09State[cp_t09] != 2) continue;
    chaosType09SparkleTimer[cp_t09]++;
    if (chaosType09SparkleTimer[cp_t09] > 32) chaosType09State[cp_t09] = -1;
}

if (keyboard_check_pressed(vk_f8)) chaosRingMode = (chaosRingMode+1) mod 3;
if (keyboard_check_pressed(vk_f9)) chaosRingDumpRequested = true;
