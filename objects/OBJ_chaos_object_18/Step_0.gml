// Sign state 3 tests contact every update (shared overlap, movement gate); contact is NOT act completion.
var cp_contact = false;
if (chaosSign.state == 3 && instance_exists(chaos_goal_player())) {
    var cp_p = chaos_goal_player();
    if (variable_instance_exists(cp_p,"chaosCore")) {
        var cp_c = cp_p.chaosCore;
        cp_contact = chaos_goal_contact(floor(cp_c.xu/256), floor(cp_c.yu/256), cp_c.vx, cp_c.next, x, y);
    }
}
chaos_goal_sign_step(chaosSign, cp_contact);
if (chaosSign.contact) chaos_goal_begin(id);
if (chaosSign.spawn_child) instance_create(x, y, OBJ_chaos_object_19);
chaosHopDy = chaosSign.hop_yu/256;
// Presentation: the existing verified state-4 frame sequence while hopping, frame 1 held once landed (state 5).
if (chaosSign.state == 4) {
    chaosState = 4;
    image_index = chaosSpinFrames[floor(chaosSpinTick / 2) mod array_length(chaosSpinFrames)];
    chaosSpinTick++;
} else {
    chaosState = chaosSign.state;
    chaosSpinTick = 0;
    image_index = 0;
}
