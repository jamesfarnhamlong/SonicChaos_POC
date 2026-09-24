// Chaos v08: original platform counters, loop lookup movement and collision planes.
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

function SCR_chaos_platform_advance(cp_platform, cp_ridden) {
    cp_platform.chaosPreviousY = cp_platform.y;
    if (cp_platform.chaosTravel > 0) {
        // Bank 30 $86DA/$8925: 1 pixel/update, reverse every 16 * aux1.
        cp_platform.y += cp_platform.chaosMoveY;
        cp_platform.chaosTravelTick++;
        if (cp_platform.chaosTravelTick >= cp_platform.chaosTravel) {
            cp_platform.chaosTravelTick = 0;
            cp_platform.chaosMoveY = -cp_platform.chaosMoveY;
        }
    } else {
        // The four subtype $84 platforms depress up to eight pixels, then return.
        if (cp_ridden && !cp_platform.chaosSagReturning) {
            if (cp_platform.chaosSag < 8) cp_platform.chaosSag++;
            else cp_platform.chaosSagReturning = true;
        } else if (cp_platform.chaosSag > 0) {
            cp_platform.chaosSag--;
        }
        if (!cp_ridden && cp_platform.chaosSag == 0) cp_platform.chaosSagReturning = false;
        cp_platform.y = cp_platform.chaosHomeY + cp_platform.chaosSag;
    }
    cp_platform.chaosDeltaY = cp_platform.y - cp_platform.chaosPreviousY;
}

function SCR_chaos_platform_overlap(cp_p, cp_platform) {
    return cp_p.bbox_right >= cp_platform.x - 16 && cp_p.bbox_left < cp_platform.x + 16;
}

function SCR_chaos_land_on_platform(cp_p, cp_platform) {
    var cp_foot_offset = cp_p.bbox_bottom - cp_p.y;
    cp_p.y = cp_platform.y - cp_foot_offset - 1;
    cp_p.vspeed = 0;
    cp_p.gravity = 0;
    cp_p.chaosSupport = cp_platform.id;
    cp_p.chaosGrounded = true;
    cp_p.chaosMotionState = 1;
    global.playerJump = false;
    global.playerJumpSpring = false;
    global.playerFly = false;
    cp_platform.solid = true;
}

function SCR_chaos_world_begin() {
    var cp_p = instance_find(OBJ_player, 0);
    var cp_playable = instance_exists(cp_p);
    if (cp_playable) cp_playable = (cp_p.object_index == OBJ_player_char || cp_p.object_index == OBJ_player_char_spin);
    if (cp_playable && !variable_instance_exists(cp_p, "chaosLoopActive")) SCR_chaos_player_init(cp_p);
    var cp_on_loop = false;
    if (cp_playable) cp_on_loop = cp_p.chaosLoopActive;
    var cp_count = instance_number(OBJ_chaos_platform);
    for (var cp_i = 0; cp_i < cp_count; cp_i++) {
        var cp_platform = instance_find(OBJ_chaos_platform, cp_i);
        var cp_ridden = false;
        if (cp_playable && !cp_on_loop) {
            cp_ridden = cp_p.chaosSupport == cp_platform.id && cp_p.vspeed >= 0 &&
                SCR_chaos_platform_overlap(cp_p, cp_platform) &&
                abs(cp_p.bbox_bottom - (cp_platform.y - 1)) <= 3;
        }
        SCR_chaos_platform_advance(cp_platform, cp_ridden);
        cp_platform.solid = false;
        if (cp_ridden) SCR_chaos_land_on_platform(cp_p, cp_platform);
        if (cp_playable && !cp_on_loop && cp_p.vspeed >= 0 && cp_p.bbox_bottom <= cp_platform.y) {
            cp_platform.solid = true;
        }
    }
    if (cp_playable && !cp_on_loop) {
        for (var cp_loop = 0; cp_loop < 2; cp_loop++) {
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
    for (var cp_i = 0; cp_i < 2; cp_i++) {
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
    // Detach as soon as Sonic jumps or walks off a moving platform.
    if (instance_exists(cp_p.chaosSupport)) {
        var cp_support = cp_p.chaosSupport;
        if (cp_p.vspeed < 0 || !SCR_chaos_platform_overlap(cp_p,cp_support) ||
            abs(cp_p.bbox_bottom-(cp_support.y-1)) > 3) cp_p.chaosSupport = noone;
    } else cp_p.chaosSupport = noone;
    // Resolve a predicted downward crossing before the legacy Step can zero
    // vspeed short of the surface. Rising players pass through from below.
    if (cp_p.vspeed >= 0 && cp_p.chaosSupport == noone) {
        var cp_count = instance_number(OBJ_chaos_platform);
        var cp_candidate = noone;
        var cp_top = room_height + 1024;
        var cp_next_foot = cp_p.bbox_bottom + cp_p.vspeed + global.valGravity;
        for (var cp_i = 0; cp_i < cp_count; cp_i++) {
            var cp_platform = instance_find(OBJ_chaos_platform,cp_i);
            var cp_next_left = cp_p.bbox_left + cp_p.hspeed;
            var cp_next_right = cp_p.bbox_right + cp_p.hspeed;
            if (cp_next_right < cp_platform.x-16 || cp_next_left >= cp_platform.x+16) continue;
            if (cp_p.bbox_bottom <= cp_platform.y && cp_next_foot >= cp_platform.y-1 && cp_platform.y < cp_top) {
                cp_candidate = cp_platform;
                cp_top = cp_platform.y;
            }
        }
        if (instance_exists(cp_candidate)) SCR_chaos_land_on_platform(cp_p,cp_candidate);
    }
    return false;
}

// One grounded probe for the sample engine's normal and rolling player states.
// Probe both sides of the feet against the terrain's existing precise masks.
function SCR_chaos_floor_contact(cp_p) {
    if (instance_exists(cp_p.chaosSupport)) return true;
    return cp_p.chaosGrounded;
}
