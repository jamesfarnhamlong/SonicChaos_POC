// Shared act-clear chain: type $18 goal sign -> type $19 child -> player state $20 -> act-clear flag.
// Recovered in sonic-chaos-reference-work docs/object-18-act-clear.md (f138130). Plain numbers only, so
// verification/verify_act_completion.js executes this shipped code. Nothing here knows an act, room or coordinate:
// the sign anchor is the canonical object record; THZ1 and THZ2 share every line.
//
// Implemented: $18 contact (shared overlap $6328 via SCR_chaos_box_contact), timer stop, hop/spin/landing, $19 spawn timing,
// $19 floor wait and player-state-$20 request, $20 run (SCR_cc_state32_tick) and the act-clear flag.
// Deferred (documented, not guessed): ring-count prize and retry/retouch (state 6), $19 panel graphics/digits/sounds, the bonus
// value, the results screen/tally, camera-follow release at d > $F8, object freeze after the flag, sounds $F8/$AA/$AB/$BC/$89.
#macro CHAOS_SONIC_EXT_X 8
#macro CHAOS_SONIC_EXT_Y 24
#macro CHAOS_GOAL_EXT_X 12
#macro CHAOS_GOAL_EXT_Y 42
#macro CHAOS_GOAL_REQUESTED_STATE $18
#macro CHAOS_GOAL_HOP_START 3
#macro CHAOS_GOAL_CHILD_TICK 131
#macro CHAOS_GOAL_CHILD_REQUEST_AGE 148
#macro CHAOS_GOAL_CAMERA_DX $80
#macro CHAOS_GOAL_CAMERA_PAN_SPEED 4
#macro CHAOS_SMS_VIEW_W 256
#macro CHAOS_ACT_CLEAR_DX_SMS $121
#macro CHAOS_GOAL_FRAME_MARGIN 24
#macro CHAOS_GOAL_LEFT_MARGIN 8

/// $A88E gate + shared overlap. Runs only while X speed != 0 or the requested player state is $18; nothing else
/// (direction, rolling, jumping, Y speed) matters. Sonic's extents are 8 x 24 and the sign's frame-1 extents 12 x 42.
function chaos_goal_contact(cp_px, cp_py, cp_vx, cp_requested, cp_sx, cp_sy) {
    if (cp_requested != CHAOS_GOAL_REQUESTED_STATE && cp_vx == 0) return false;
    return SCR_chaos_box_contact(cp_px, cp_py, cp_sx, cp_sy,
        CHAOS_SONIC_EXT_X, CHAOS_SONIC_EXT_Y, CHAOS_GOAL_EXT_X, CHAOS_GOAL_EXT_Y) != 0;
}

/// Sign state machine ($18 states 3 -> 4 -> 5). tick counts updates from the contact update (= 0).
/// hop_yu is the 8.8 offset from the canonical anchor (the instance keeps its canonical y; only drawing adds the offset).
function chaos_goal_sign_new() {
    return {state:3, tick:0, hop_yu:0, hop_vy:0, moved:false, contact:false, spawn_child:false, child_spawned:false};
}
function chaos_goal_sign_step(cp_s, cp_contact) {
    cp_s.contact = false; cp_s.spawn_child = false;
    if (cp_s.state == 3) {
        if (cp_contact) {
            cp_s.state = 4; cp_s.tick = 0; cp_s.hop_yu = 0; cp_s.hop_vy = -1024; cp_s.moved = false;
            cp_s.contact = true; // timer stops this update; the player is not touched
        }
    } else if (cp_s.state == 4) {
        cp_s.tick++;
        if (cp_s.tick >= CHAOS_GOAL_HOP_START) {
            if (cp_s.moved && cp_s.hop_yu >= 0) { cp_s.hop_yu = 0; cp_s.state = 5; } // $A8FA: landed (+130)
            else { cp_s.hop_vy = min(cp_s.hop_vy + 16, 1536); cp_s.hop_yu += cp_s.hop_vy; cp_s.moved = true; }
        }
    } else if (cp_s.state == 5) {
        cp_s.tick++;
        if (!cp_s.child_spawned && cp_s.tick >= CHAOS_GOAL_CHILD_TICK) { cp_s.child_spawned = true; cp_s.spawn_child = true; }
    }
}

/// Type $19, reduced to the part that reaches $20: after 148 updates, once per update unless the player is already in
/// state $20, request state $20 when the player is on the floor (no timeout).
function chaos_goal_child_new() { return {age:0, requested:false}; }
function chaos_goal_child_step(cp_c, cp_grounded, cp_player_in_state20) {
    cp_c.age++;
    if (cp_c.age < CHAOS_GOAL_CHILD_REQUEST_AGE || cp_player_in_state20) return false;
    if (!cp_grounded) return false;
    cp_c.requested = true;
    return true;
}

/// $4892: request player state $20 (the core runs the $83A6 handler from the next update).
function chaos_goal_request_state20(cp_core) {
    cp_core.next = 32;
}

/// Act-clear threshold, camera-relative. Two explicit concepts:
///   canonical SMS:        playerX - cameraX >= CHAOS_ACT_CLEAR_DX_SMS ($121 = 289) on the 256 px screen, i.e. 33 px beyond the right edge;
///   GameMaker widescreen: the same 33 px beyond the CURRENT visible right edge = viewWidth + ($121 - 256).
/// chaos_goal_clear_dx(256) reproduces the canonical value exactly; the view width is read from the live camera, never from an act.
function chaos_goal_clear_dx(cp_view_w) {
    return cp_view_w + (CHAOS_ACT_CLEAR_DX_SMS - CHAOS_SMS_VIEW_W);
}

/// POC camera adapter for the act-clear chain (NOT canonical; the ROM pans to (signX-$80, signY-$99) at an unrecovered speed and
/// releases at d > $F8, none of which is reproduced). Rules, identical for every act:
///   1. from contact until state $20 is requested the camera pans toward the sign target at CHAOS_GOAL_CAMERA_PAN_SPEED, but is
///      always dragged so Sonic stays framed (CHAOS_GOAL_FRAME_MARGIN px from either edge) - it can never leave him behind or
///      run ahead of him;
///   2. it never scrolls left (the ROM's left scroll limit $D280 is raised to the camera X);
///   3. from the update state $20 is requested the camera is frozen, so the canonical run off the right edge is measurable.
function chaos_goal_camera_next(cp_cam, cp_px, cp_view_w, cp_room_w, cp_target, cp_frozen) {
    if (cp_frozen) return cp_cam;
    var cp_max = max(0, cp_room_w - cp_view_w);
    var cp_t = clamp(cp_target, 0, cp_max);
    var cp_n = cp_cam + clamp(cp_t - cp_cam, -CHAOS_GOAL_CAMERA_PAN_SPEED, CHAOS_GOAL_CAMERA_PAN_SPEED);
    cp_n = clamp(cp_n, cp_px - (cp_view_w - CHAOS_GOAL_FRAME_MARGIN), cp_px - CHAOS_GOAL_FRAME_MARGIN);
    cp_n = max(cp_n, cp_cam);
    return clamp(cp_n, 0, cp_max);
}

/// POC adapter paired with the camera's left lock: while the sequence runs before state $20, Sonic is kept inside the view's left edge.
function chaos_goal_left_limit_xu(cp_cam) {
    return (floor(cp_cam) + CHAOS_GOAL_LEFT_MARGIN) * 256;
}
