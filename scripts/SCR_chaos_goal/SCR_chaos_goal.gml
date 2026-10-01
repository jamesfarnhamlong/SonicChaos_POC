// Shared act-clear chain: type $18 goal sign -> type $19 child -> player state $20 -> act-clear flag.
// Recovered in sonic-chaos-reference-work docs/object-18-act-clear.md (f138130). Plain numbers only, so
// verification/verify_act_completion.js executes this shipped code. Nothing here knows an act, room or coordinate:
// the sign anchor is the canonical object record; THZ1 and THZ2 share every line.
//
// Implemented: $18 contact (shared overlap $6328 via SCR_chaos_box_contact), timer stop, hop/spin/landing, $19 spawn timing,
// $19 floor wait and player-state-$20 request, $20 run (SCR_cc_state32_tick) and the act-clear flag.
// The camera is the recovered one (1 px/update X+Y pan to the sign, freeze at EDGE(RIGHT,-7), clear at EDGE(RIGHT,+33)), expressed
// through SCR_chaos_viewport.
// Deferred (documented, not guessed): ring-count prize and retry/retouch (state 6), $19 panel graphics/digits/sounds, the bonus
// value, the results screen/tally, object freeze after the flag, sounds $F8/$AA/$AB/$BC/$89.
#macro CHAOS_SONIC_EXT_X 8
#macro CHAOS_SONIC_EXT_Y 24
#macro CHAOS_GOAL_EXT_X 12
#macro CHAOS_GOAL_EXT_Y 42
#macro CHAOS_GOAL_REQUESTED_STATE $18
#macro CHAOS_GOAL_HOP_START 3
#macro CHAOS_GOAL_CHILD_TICK 131
#macro CHAOS_GOAL_CHILD_REQUEST_AGE 148
// Sign pan ($AA22.., vector $0359): camera target (signX-$80, signY-$99) = sign at CENTER(0) horizontally, 153 px below the view top.
#macro CHAOS_GOAL_PAN_TOP_OFFSET $99
// State $20 handler $83A6 compares d = playerX - cameraX: freeze at d > $F8 (= RIGHT - 7), act clear at d > $120 (= RIGHT + 33).
#macro CHAOS_ACT_FREEZE_DX_SMS $F9
#macro CHAOS_ACT_CLEAR_DX_SMS $121
#macro CHAOS_ACT_FREEZE_EDGE -7
#macro CHAOS_ACT_CLEAR_EDGE 33
// Player edge clamp ($4141/$4281, active until state $20): anchor kept within LEFT+16 .. RIGHT-9 (original cam+$10 .. cam+$F7).
#macro CHAOS_GOAL_CLAMP_LEFT 16
#macro CHAOS_GOAL_CLAMP_RIGHT -9

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

/// Act-clear threshold, camera-relative: EDGE(RIGHT, +33) of the live view.
///   canonical SMS:        playerX - cameraX >= CHAOS_ACT_CLEAR_DX_SMS ($121 = 289) on the 256 px screen, i.e. 33 px beyond the right edge;
///   GameMaker widescreen: the same 33 px beyond the CURRENT visible right edge = viewWidth + ($121 - 256).
/// chaos_goal_clear_dx(256) reproduces the canonical value exactly; the view width is read from the live camera, never from an act.
function chaos_goal_clear_dx(cp_view_w) {
    return chaos_vp_edge(chaos_vp_new(0, 0, cp_view_w, 0), CHAOS_VP_RIGHT, CHAOS_ACT_CLEAR_EDGE);
}

/// Sign-pan state (pan mode, $D15F bit 0). One per level session; the sign anchor is the canonical object record (WORLD).
///   x / y   : camera position after the last step (outputs of chaos_goal_pan_step)
///   frozen  : camera frozen by $0407 (stays frozen for the rest of the act)
function chaos_goal_pan_new() {
    return {active: false, sign_x: 0, sign_y: 0, frozen: false, x: 0, y: 0};
}

/// Sign contact: pan mode starts and the follow camera is disabled (original: vector $0359 at the $18 state 3 -> 4 update).
function chaos_goal_pan_begin(cp_pan, cp_sign_x, cp_sign_y) {
    cp_pan.active = true; cp_pan.frozen = false; cp_pan.sign_x = cp_sign_x; cp_pan.sign_y = cp_sign_y;
}

/// Nominal pan targets for the CURRENT view: X puts the sign at CENTER(0) (original signX-$80 on 256 px), Y puts it
/// CHAOS_GOAL_PAN_TOP_OFFSET below the view top (original signY-$99).
function chaos_goal_pan_target_x(cp_pan, cp_view_w) {
    return chaos_vp_left_for_center(cp_view_w, cp_pan.sign_x, 0);
}
function chaos_goal_pan_target_y(cp_pan) {
    return cp_pan.sign_y - CHAOS_GOAL_PAN_TOP_OFFSET;
}

/// One camera update of the recovered pan ($5956) plus the state-$20 freeze ($83A6 -> $0407). Writes cp_pan.x / cp_pan.y.
///   X: +1 px/update toward the nominal target. The ROM's right limit ($D282 := target) is EXCLUSIVE, so the camera stops one pixel
///      short: signX - W/2 - 1 (3831 for the 256 px THZ sign). The left lock ($0353) is raised to the camera every update, so X never
///      scrolls left even when the follow camera was already ahead of the target.
///   Y: +/-1 px/update, simultaneously with X, to the exact target (no limit quirk).
///   WORLD takes precedence over CENTER: the camera never exposes non-world space. The effective right limit is
///   min(desiredCameraX - 1, canonicalWorldRight - viewWidth) with desiredCameraX = signX - viewWidth/2, so the sign sits at CENTER(0) (+1) when the
///   world has room and right of centre when the canonical map edge is reached first (GameMaker presentation compromise; the last visible column
///   is then the last world column). cp_world_w is the canonical world width (both THZ rooms are the 4096 px map).
///   Y keeps a [0, room_height - viewHeight] bound (vertical is not widened; the sign target is always inside it on THZ).
///   Freeze: once player state $20 runs and playerX >= EDGE(RIGHT,-7) of the view the camera is frozen (original d > $F8);
///           from then on cp_pan.x / cp_pan.y never change. EDGE(RIGHT,+33) of this frozen camera is the act-clear threshold.
function chaos_goal_pan_step(cp_pan, cp_cam_x, cp_cam_y, cp_view_w, cp_view_h, cp_world_w, cp_room_h, cp_player_x, cp_in_state20) {
    cp_pan.x = cp_cam_x; cp_pan.y = cp_cam_y;
    if (!cp_pan.active || cp_pan.frozen) return;
    var cp_limit_x = min(chaos_goal_pan_target_x(cp_pan, cp_view_w) - 1, max(0, cp_world_w - cp_view_w));
    if (cp_cam_x < cp_limit_x) cp_pan.x = cp_cam_x + 1;
    var cp_target_y = clamp(chaos_goal_pan_target_y(cp_pan), 0, max(0, cp_room_h - cp_view_h));
    cp_pan.y = cp_cam_y + sign(cp_target_y - cp_cam_y);
    if (cp_in_state20 && cp_player_x >= chaos_vp_edge(chaos_vp_new(cp_pan.x, 0, cp_view_w, 0), CHAOS_VP_RIGHT, CHAOS_ACT_FREEZE_EDGE))
        cp_pan.frozen = true;
}

/// Player edge clamp while the sign sequence runs (contact until state $20). Original: low byte of (playerX - cam) < $10 -> cam+$10,
/// >= $F8 -> cam+$F7, X speed zeroed. GAMEMAKER ADAPTER (deliberate deviation): the same relationship is applied to the live view as
/// full-width integers, EDGE(LEFT,+16) .. EDGE(RIGHT,-9), so Sonic stays inside the displayed view. The 8-bit low-byte test (which
/// teleports a player at d >= 256 to the left edge) and the per-update speed compensation are NOT reproduced.
/// Returns {xu, vx, hit}: xu is 8.8 fixed point like the core, vx unchanged unless the clamp fired.
function chaos_goal_clamp_player(cp_vp, cp_xu, cp_vx) {
    var cp_lo = chaos_vp_edge(cp_vp, CHAOS_VP_LEFT, CHAOS_GOAL_CLAMP_LEFT) * 256;
    var cp_hi = chaos_vp_edge(cp_vp, CHAOS_VP_RIGHT, CHAOS_GOAL_CLAMP_RIGHT) * 256;
    if (cp_xu < cp_lo) return {xu: cp_lo, vx: 0, hit: true};
    if (cp_xu > cp_hi) return {xu: cp_hi, vx: 0, hit: true};
    return {xu: cp_xu, vx: cp_vx, hit: false};
}
