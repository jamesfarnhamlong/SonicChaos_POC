// Object phase of one gameplay update: the ROM runs the player's whole pass first (terrain, damage gate) and the object list afterwards. OBJ_chaos_zone calls this at the top of its
// End Step event, i.e. after the player's Step (SCR_chaos_adapter_step) and before the camera follows the player. Order inside the phase: type $28 platforms, then type $1B spikes, each in instance order.
// (THZ1/THZ2 platforms and spikes never overlap, so the relative order of the two lists is unobservable.) The pure rules live in SCR_chaos_platform / SCR_chaos_spike1b.
// DEVIATION (adapter): while the GameMaker loop adapter owns the player (chaosLoopActive) no contact is evaluated; the ROM would still test it.
function SCR_chaos_objects_phase() {
    if (!chaos_in_level()) return;
    if (variable_global_exists("chaosCrushDeathPhase") && global.chaosCrushDeathPhase == 2) return;
    var cp_p = instance_find(OBJ_player,0);
    if (!instance_exists(cp_p) && variable_global_exists("chaosCrushDeathPhase") && global.chaosCrushDeathPhase == 1)
        cp_p = instance_find(OBJ_player_death,0);
    var cp_have = false;
    var cp_present = false;
    var cp_c = noone;
    if (instance_exists(cp_p) && (cp_p.object_index == OBJ_player_char || cp_p.object_index == OBJ_player_char_spin) && variable_instance_exists(cp_p,"chaosCore")) {
        cp_have = true;
        cp_c = cp_p.chaosCore;
        cp_present = !(variable_instance_exists(cp_p,"chaosLoopActive") && cp_p.chaosLoopActive);
    }
    // Recovered lost rings (type $06) occupy the first free object slots, so they run early in the scheduler: before the boss / enemy / platform objects below.
    // The player's whole pass has already run, so the pickup test sees the post-player-phase anchor. Independent of every player state (loop adapter, hurt, blink, ...).
    SCR_chaos_lost_rings_phase(cp_have, cp_c);
    // SEZ S2 crumble objects ($13): scheduler slots 0..18 ascending, parents (slots 0..15) before the placement objects below. The rider hold moves the player's core Y after
    // the terrain pass (republished at the end of this phase).
    var cp_s2_hold = chaos_is_sez() ? chaos_s2_phase(cp_c, cp_have) : false;
    // $D520 / $D3B0 written by badnik Step events (and the sample-damage path) during this update become visible to the player's NEXT $48BC.
    // Boss contact runs in this object phase so its staged request reaches the next player update.
    chaos_boss_runtime_phase();
    chaos_51_runtime_phase();
    chaos_56_runtime_phase();
    // GPZ ordinary enemies run after final player/terrain movement, before contact promotion.
    // Shells remain after $FE deletion; destroyed defeated shells retain occupancy until room reset.
    if (chaos_is_gpz()) {
        var cp_enemies=chaos_level_object_rows();
        for (var cp_ei=0; cp_ei<array_length(cp_enemies); cp_ei++) {
            var cp_et=cp_enemies[cp_ei][3];
            if (cp_et != $25 && cp_et != $2C) continue;
            var cp_eobj=cp_et == $25 ? OBJ_chaos_object_25 : OBJ_chaos_object_2C;
            for (var cp_ej=0; cp_ej<instance_number(cp_eobj); cp_ej++) {
                var cp_enemy=instance_find(cp_eobj,cp_ej);
                if (cp_enemy.chaosPlacementIndex != cp_enemies[cp_ei][0]) continue;
                with (cp_enemy) { chaosEnemyPhase=true; event_perform(ev_step,ev_step_normal); }
                if (instance_exists(cp_enemy)) cp_enemy.chaosEnemyPhase=false;
                break;
            }
        }
    }
    // SEZ S4 mapped enemies $20/$23 (struct records), then the shared contact promotion below.
    if (chaos_is_sez()) chaos_sez_enemy_phase(cp_c, cp_have);
    if (cp_have) chaos_contact_promote(cp_c);
    var cp_changed = cp_s2_hold;
    var cp_count = instance_number(OBJ_chaos_platform);
    for (var cp_i = 0; cp_i < cp_count; cp_i++) {
        var cp_o=instance_find(OBJ_chaos_platform,cp_i);
        if (variable_instance_exists(cp_o,"chaosGpzLifecycle") && cp_o.chaosGpzLifecycle) {
            if (chaos_platform28_lifecycle(cp_o,cp_c,cp_have,chaos_vp_current()) && chaos_platform28_step(cp_o,cp_c,cp_present)) cp_changed=true;
        } else if (chaos_platform28_step(cp_o, cp_c, cp_present)) cp_changed = true;
    }
    var cp_cam = view_camera[0];
    var cp_left = camera_get_view_x(cp_cam)-64;
    var cp_right = cp_left+camera_get_view_width(cp_cam)+128;
    cp_count = instance_number(OBJ_chaos_spikes);
    for (var cp_k = 0; cp_k < cp_count; cp_k++) {
        var cp_spike = instance_find(OBJ_chaos_spikes,cp_k);
        if (chaos_is_sez()) {
            if (!chaos_sez_mapped_awake(cp_spike,cp_spike.chaosX,cp_spike.chaosY)) continue;
            if (cp_spike.chaosSezRecreated) {
                cp_spike.chaosActive=false; cp_spike.chaosY=cp_spike.chaosBaseY;
                cp_spike.chaosOffset=0; cp_spike.chaosCooldown=0;
                cp_spike.chaosSezRecreated=false;
            }
            if (chaos_spike1b_step(cp_spike,cp_c,cp_present,true)) cp_changed=true;
            continue;
        }
        if (chaos_spike1b_step(cp_spike, cp_c, cp_present, cp_spike.x >= cp_left && cp_spike.x <= cp_right)) cp_changed = true;
    }
    // M1/M2 lifetimes have now updated: their occupancy bridge is current.
    chaos_m3_runtime_phase(cp_c,cp_have);
    if (cp_have) chaos_contact_promote(cp_c);
    if (variable_global_exists("chaosCrushDeathPhase") && global.chaosCrushDeathPhase == 1) {
        // $4984 leaves the owner intact; the final object pass releases it.
        if (instance_exists(cp_p) && variable_instance_exists(cp_p,"chaosCore")) {
            cp_p.chaosCore.support=0; cp_p.chaosSupport=noone;
        }
        global.chaosCrushDeathPhase=2;
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

/// GPZ placement shells retain provenance after deletion; consumed state4 shells never recreate.
/// No widescreen retention extension is applied to these platform variants.
function chaos_platform28_lifecycle(cp_o,cp_c,cp_have,cp_vp) {
    if (cp_o.chaosConsumed) return false;
    if (!cp_o.chaosLive) {
        if (!SCR_chaos_placement_scan(cp_o,cp_vp,cp_o.chaosPlacementX,cp_o.chaosPlacementY)) return false;
        cp_o.x=cp_o.chaosPlacementX; cp_o.y=cp_o.chaosPlacementY;
        chaos_platform28_configure(cp_o,cp_o.chaosPlacementParameter,cp_o.chaosPlacementAux1);
        cp_o.chaosLive=true;
    }
    var cp_cell=chaos_is_sez() ? SCR_chaos_lifetime_cell(cp_o,cp_vp,cp_o.chaosX,cp_o.chaosY) : SCR_chaos_spawn_cell(cp_vp,cp_o.chaosX,cp_o.chaosY);
    if (cp_o.chaosMode == 7) {
        // SEZ $86 (state 7): keepalive from the first callback, so the generic lifetime never deletes it and it keeps running asleep (bit 6 only drives SAT eligibility / drawing).
        // Its own $8908 PLAYER_DIST test (|dx| >= 640 or |dy| >= 672, never widened) marks removal; the callback still runs this update, then SCR_chaos_platform removes it.
        cp_o.chaosAsleep = cp_cell >= 2;
        cp_o.chaosDistDelete = cp_have && (abs(cp_o.chaosX-floor(cp_c.xu/256)) >= 640 || abs(cp_o.chaosY-chaos_signed_world_y(cp_c.yu)) >= 672);
        return true;
    }
    // $8908 moving-platform keep-alive: canonical distance window, independent of viewport width.
    if (cp_o.chaosMode == 10 || cp_o.chaosMode == 6 || cp_o.chaosMode == 11) {
        if (cp_have && abs(cp_o.chaosX-floor(cp_c.xu/256)) < 640 && abs(cp_o.chaosY-chaos_signed_world_y(cp_c.yu)) < 672) cp_cell=0;
    }
    cp_o.chaosAsleep=cp_cell >= 2;
    if (cp_o.chaosAsleep && cp_o.chaosMode == 4 && cp_o.chaosPhase != 0) {
        cp_o.chaosConsumed=true; cp_o.chaosLive=false;
        array_push(global.chaosConsumedPlatforms,cp_o.chaosPlacementIndex);
    } else if (cp_cell == 3) cp_o.chaosLive=false;
    if ((!cp_o.chaosLive || cp_o.chaosAsleep) && cp_have && cp_c.support == cp_o.chaosOwnerId) cp_c.support=0;
    return cp_o.chaosLive && !cp_o.chaosAsleep;
}
