/// Centralized collection executes after ordinary movement updates.
if (!chaos_in_level() || !instance_exists(OBJ_player)) exit;
var cp_player = instance_find(OBJ_player,0);
for (var cp_i=0; cp_i<chaosRingSourceCount; cp_i++) {
    if (!chaosRingActive[cp_i]) continue;
    var cp_record = chaosRingRecords[cp_i];
    var cp_x = cp_record[1];
    var cp_y = cp_record[2];
    if (cp_player.bbox_right < cp_x-6 || cp_player.bbox_left > cp_x+7 ||
        cp_player.bbox_bottom < cp_y-8 || cp_player.bbox_top > cp_y+7) continue;
    chaosRingActive[cp_i] = false;
    global.ring += 1;
    instance_create(cp_x,cp_y,OBJ_ring_stars);
}

// Raw type-$09 behavior remains separate from terrain-ring collection.
// A collected placement remains occupied for the act. An uncollected record
// may leave and re-enter the camera without losing availability, which is the
// manager equivalent of original offscreen cleanup followed by recreation.
for (var cp_t09=0; cp_t09<chaosType09SourceCount; cp_t09++) {
    if (chaosType09Collected[cp_t09]) continue;
    var cp_t09_record = chaosType09Records[cp_t09];
    var cp_t09_parameter = cp_t09_record[3];
    if (cp_t09_parameter == 1 && (chaosRingGlobalFrame mod 2) != 0) continue;
    if (abs(cp_player.x-cp_t09_record[1]) >= 12 || abs(cp_player.y-cp_t09_record[2]) >= 12) continue;

    chaosType09Collected[cp_t09] = true;
    global.ring += 1;
    if (global.music == 1) {
        if (audio_is_playing(SFX_ring)) audio_stop_sound(SFX_ring);
        audio_play_sound(SFX_ring,10,false);
    }
    if (cp_t09_parameter == 0) {
        chaosType09State[cp_t09] = 2;
        chaosType09SparkleTimer[cp_t09] = 0;
    } else {
        chaosType09State[cp_t09] = -1;
    }
}
chaosRingGlobalFrame++;
