// Object phase of one gameplay update: the ROM runs the player's whole pass first (terrain, damage gate) and the object list afterwards. OBJ_chaos_zone calls this at the top of its
// End Step event, i.e. after the player's Step (SCR_chaos_adapter_step) and before the camera follows the player. Order inside the phase: type $28 platforms, then type $1B spikes, each in instance order.
// (THZ1/THZ2 platforms and spikes never overlap, so the relative order of the two lists is unobservable.) The pure rules live in SCR_chaos_platform / SCR_chaos_spike1b.
// DEVIATION (adapter): while the GameMaker loop adapter owns the player (chaosLoopActive) no contact is evaluated; the ROM would still test it.
function SCR_chaos_objects_phase() {
    if (!chaos_in_level()) return;
    var cp_p = instance_find(OBJ_player,0);
    var cp_have = false;
    var cp_present = false;
    var cp_c = noone;
    if (instance_exists(cp_p) && (cp_p.object_index == OBJ_player_char || cp_p.object_index == OBJ_player_char_spin) && variable_instance_exists(cp_p,"chaosCore")) {
        cp_have = true;
        cp_c = cp_p.chaosCore;
        cp_present = !(variable_instance_exists(cp_p,"chaosLoopActive") && cp_p.chaosLoopActive);
    }
    // $D520 / $D3B0 written by badnik Step events (and the sample-damage path) during this update become visible to the player's NEXT $48BC.
    if (cp_have) chaos_contact_promote(cp_c);
    var cp_changed = false;
    var cp_count = instance_number(OBJ_chaos_platform);
    for (var cp_i = 0; cp_i < cp_count; cp_i++) {
        if (chaos_platform28_step(instance_find(OBJ_chaos_platform,cp_i), cp_c, cp_present)) cp_changed = true;
    }
    var cp_cam = view_camera[0];
    var cp_left = camera_get_view_x(cp_cam)-64;
    var cp_right = cp_left+camera_get_view_width(cp_cam)+128;
    cp_count = instance_number(OBJ_chaos_spikes);
    for (var cp_k = 0; cp_k < cp_count; cp_k++) {
        var cp_spike = instance_find(OBJ_chaos_spikes,cp_k);
        if (chaos_spike1b_step(cp_spike, cp_c, cp_present, cp_spike.x >= cp_left && cp_spike.x <= cp_right)) cp_changed = true;
    }
    if (!cp_have) return;
    // GameMaker mirror of the owner ($D3C0 on the core).
    var cp_owner = noone;
    if (cp_c.support != 0) {
        for (var cp_j = 0; cp_j < instance_number(OBJ_chaos_platform); cp_j++) {
            var cp_platform = instance_find(OBJ_chaos_platform,cp_j);
            if (cp_platform.chaosOwnerId == cp_c.support) cp_owner = cp_platform;
        }
    }
    cp_p.chaosSupport = cp_owner;
    if (cp_changed) SCR_chaos_core_publish(cp_p);
}
