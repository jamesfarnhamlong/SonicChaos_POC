// Chaos v08: loop lookup movement and collision planes. Type $28 platforms live in SCR_chaos_platform (recovered ROM model).
// Called only in ROM_chaos_thz1. Legacy movement remains in the engine sample.
function SCR_chaos_player_init(cp_p) {
    cp_p.chaosLoopActive = false;
    cp_p.chaosLoopCursor = 0;
    cp_p.chaosLoopVelocity = 0;
    cp_p.chaosLoopDirection = 1;
    cp_p.chaosLoopNumber = 0;
    cp_p.chaosLoopOriginX = 0;
    cp_p.chaosLoopOriginY = 0;
    cp_p.chaosLoopExitSpeed = 0;
    cp_p.chaosLoopCooldown = 0;
    cp_p.chaosSkipEnd = false;
    cp_p.chaosReleasePending = false;
    cp_p.chaosReleaseX = 0;
    cp_p.chaosReleaseY = 0;
    cp_p.chaosSupport = noone;
    cp_p.chaosPreviousFoot = cp_p.bbox_bottom;
    cp_p.chaosSpringFrames = 0;
    cp_p.chaosSpringVertical = false;
    cp_p.chaosPlane = 0;
    cp_p.chaosModifier = 0;
    cp_p.chaosGrounded = false;
    cp_p.chaosMotionState = 1;
    cp_p.chaosTile = 255;
    cp_p.chaosPreviousFlags = 0;
    if (variable_global_exists("chaosHeaders0")) {
        cp_p.chaosPreviousFlags = SCR_cc_lookup(cp_p.x,cp_p.bbox_bottom,0).flags;
    }
}

function SCR_chaos_world_begin() {
    var cp_p = instance_find(OBJ_player, 0);
    var cp_playable = instance_exists(cp_p);
    if (cp_playable) cp_playable = (cp_p.object_index == OBJ_player_char || cp_p.object_index == OBJ_player_char_spin);
    if (cp_playable && !variable_instance_exists(cp_p, "chaosLoopActive")) SCR_chaos_player_init(cp_p);
    var cp_on_loop = false;
    if (cp_playable) cp_on_loop = cp_p.chaosLoopActive;
    // Platforms are NOT advanced here: the ROM updates objects after the player's whole pass (SCR_chaos_objects_phase, controls End Step).
    if (cp_playable && !cp_on_loop) {
        for (var cp_loop = 0; cp_loop < array_length(global.chaosLoopCenters); cp_loop++) {
            var cp_center = global.chaosLoopCenters[cp_loop];
            if (cp_p.x < cp_center - 96) global.chaosLoopPlanes[cp_loop] = 0;
            if (cp_p.x >= cp_center + 96) global.chaosLoopPlanes[cp_loop] = 1;
        }
    }
    // Each local floor/column instance has both decoded collision profiles.
    var cp_floor_count = instance_number(OBJ_chaos_loop_base);
    for (var cp_j = 0; cp_j < cp_floor_count; cp_j++) {
        var cp_floor = instance_find(OBJ_chaos_loop_base, cp_j);
        if (variable_instance_exists(cp_floor, "chaosPlaneSprite0")) {
            var cp_plane = global.chaosLoopPlanes[cp_floor.chaosLoopNumber];
            cp_floor.sprite_index = (cp_plane == 0) ? cp_floor.chaosPlaneSprite0 : cp_floor.chaosPlaneSprite1;
            cp_floor.solid = (cp_plane == 0) ? cp_floor.chaosPlaneSolid0 : cp_floor.chaosPlaneSolid1;
        }
    }
}

function SCR_chaos_loop_try_enter(cp_p) {
    if (cp_p.chaosLoopCooldown > 0 || cp_p.vspeed < -0.5 || global.playerFly) return false;
    if (abs(cp_p.hspeed) < 0.25) return false;
    for (var cp_i = 0; cp_i < array_length(global.chaosLoopCenters); cp_i++) {
        var cp_center = global.chaosLoopCenters[cp_i];
        var cp_row = global.chaosLoopRows[cp_i];
        var cp_dir = sign(cp_p.hspeed);
        var cp_cross = (cp_dir > 0) ?
            (cp_p.x <= cp_center && cp_p.x + cp_p.hspeed >= cp_center) :
            (cp_p.x >= cp_center && cp_p.x + cp_p.hspeed <= cp_center);
        // Restrict entry to the bottom crossing, not the upper path or a jump.
        if (!cp_cross || cp_p.bbox_bottom < cp_row + 12 || cp_p.bbox_bottom > cp_row + 33) continue;
        if ((cp_dir > 0 && global.chaosLoopPlanes[cp_i] != 0) ||
            (cp_dir < 0 && global.chaosLoopPlanes[cp_i] != 1)) continue;
        cp_p.chaosLoopActive = true;
        cp_p.chaosLoopNumber = cp_i;
        cp_p.chaosLoopDirection = cp_dir;
        cp_p.chaosLoopOriginX = cp_center;
        // Original center origin uses +4. Adapt to the sample sprite's foot:
        // crossing surface is row+22; leave the collision foot one pixel above.
        cp_p.chaosLoopOriginY = cp_row + 21 - (cp_p.bbox_bottom - cp_p.y);
        cp_p.chaosLoopCursor = 0;
        cp_p.chaosLoopVelocity = round(min(abs(cp_p.hspeed), 8) * 256);
        cp_p.chaosLoopExitSpeed = min(abs(cp_p.hspeed), 8);
        cp_p.chaosSupport = noone;
        cp_p.chaosSpringFrames = 0;
        global.playerSpinDash = false;
        return true;
    }
    return false;
}

function SCR_chaos_loop_release(cp_p, cp_horizontal, cp_vertical) {
    cp_p.chaosLoopActive = false;
    cp_p.chaosLoopCooldown = 20;
    cp_p.chaosReleasePending = true;
    cp_p.chaosReleaseX = cp_horizontal;
    cp_p.chaosReleaseY = cp_vertical;
    cp_p.image_angle = 0;
    cp_p.releasedLeft = false;
    cp_p.releasedRight = false;
    global.playerJump = true;
    global.playerJumpSpring = false;
}

function SCR_chaos_loop_tick(cp_p) {
    cp_p.chaosSkipEnd = true;
    cp_p.hspeed = 0;
    cp_p.vspeed = 0;
    cp_p.gravity = 0;
    global.playerJump = true;
    global.playerJumpSpring = false;
    global.playerFly = false;
    cp_p.chaosLoopCursor += cp_p.chaosLoopVelocity;
    var cp_index = floor(cp_p.chaosLoopCursor / 256);
    var cp_sample = min(cp_index, 394);
    var cp_trace_x = (cp_p.chaosLoopDirection > 0) ? global.chaosLoopRightX : global.chaosLoopLeftX;
    var cp_trace_y = (cp_p.chaosLoopDirection > 0) ? global.chaosLoopRightY : global.chaosLoopLeftY;
    cp_p.x = cp_p.chaosLoopOriginX + cp_trace_x[cp_sample];
    cp_p.y = cp_p.chaosLoopOriginY + cp_trace_y[cp_sample];
    var cp_before = max(0, cp_sample - 3);
    var cp_after = min(394, cp_sample + 3);
    var cp_angle = point_direction(cp_trace_x[cp_before], cp_trace_y[cp_before],
        cp_trace_x[cp_after], cp_trace_y[cp_after]);
    cp_p.image_xscale = cp_p.chaosLoopDirection;
    cp_p.image_angle = cp_angle + ((cp_p.chaosLoopDirection < 0) ? 180 : 0);
    // Sprite aliases belong to the player instance; initialize before accessing.
    if (!variable_instance_exists(cp_p, "SPR_player_run")) {
        with (cp_p) { SCR_player_sprites(); }
    }
    cp_p.sprite_index = (cp_p.object_index == OBJ_player_char_spin) ? cp_p.SPR_player_spin : cp_p.SPR_player_run;
    cp_p.image_speed = 0.5;
    if (cp_index < 144) {
        cp_p.chaosLoopVelocity -= 10;
        if (cp_p.chaosLoopVelocity < 0) {
            // Original low-speed falloff; gravity resumes on the next normal step.
            SCR_chaos_loop_release(cp_p, 0, 0);
            return;
        }
    } else {
        global.chaosLoopPlanes[cp_p.chaosLoopNumber] = (cp_p.chaosLoopDirection > 0) ? 1 : 0;
        cp_p.chaosLoopVelocity += 12;
    }
    if (cp_index >= 384) SCR_chaos_loop_release(cp_p,
        cp_p.chaosLoopDirection * cp_p.chaosLoopExitSpeed, 0);
}

function SCR_chaos_player_begin(cp_p) {
    if (!variable_instance_exists(cp_p, "chaosLoopActive")) SCR_chaos_player_init(cp_p);
    cp_p.chaosSkipEnd = false;
    if (cp_p.chaosLoopCooldown > 0) cp_p.chaosLoopCooldown--;
    if (cp_p.chaosLoopActive || SCR_chaos_loop_try_enter(cp_p)) {
        SCR_chaos_loop_tick(cp_p);
        return true;
    }
    cp_p.chaosPreviousFoot = cp_p.bbox_bottom;
    return false;
}

// One grounded probe for the sample engine's normal and rolling player states.
// Probe both sides of the feet against the terrain's existing precise masks.
function SCR_chaos_floor_contact(cp_p) {
    if (instance_exists(cp_p.chaosSupport)) return true;
    return cp_p.chaosGrounded;
}
