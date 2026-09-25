var cp_cam = view_camera[0];
var cp_left = camera_get_view_x(cp_cam)-128;
var cp_right = camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)+384;

// Generic off-range cleanup releases placement occupancy. A room instance is
// retained as the POC's bounded placement adapter, then recreated from origin.
if (!chaosActive) {
    if (chaosOriginX < cp_left || chaosOriginX >= cp_right) exit;
    x = chaosOriginX; y = chaosOriginY;
    chaosXU = round(x*256); chaosYU = round(y*256);
    chaosLeftBound = chaosOriginX-(chaosParameter << 4);
    chaosVX = -$0080; chaosVY = $0200;
    chaosState = 3; chaosAnimTick = 0;
    chaosActive = true; visible = true; image_xscale = -1;
}
if (x < cp_left || x >= cp_right) {
    chaosActive = false; visible = false; exit;
}

chaosAnimTick++;
image_index = (chaosAnimTick div 8) & 1;

if (chaosState == 1) {
    // Verified falling state: X zero, initial +2.0 Y, then +$0040 each update.
    chaosYU += chaosVY;
    chaosVY += $0040;
    y = chaosYU/256;
    exit;
}

chaosXU += chaosVX;
chaosYU += chaosVY;
x = chaosXU/256; y = chaosYU/256;

var cp_floor = SCR_chaos_object_floor_project(x,y);
if (!cp_floor.grounded) {
    chaosState = 1; chaosVX = 0; chaosVY = $0200;
    exit;
}
y = cp_floor.y; chaosYU = round(y*256);

// Reversal is strict: equality does not reverse, so half-pixel motion crosses
// each integer bound before velocity and orientation toggle.
if (chaosVX < 0 && floor(x) < chaosLeftBound) {
    chaosVX = $0080; chaosState = 4; image_xscale = 1;
} else if (chaosVX > 0 && floor(x) > chaosOriginX) {
    chaosVX = -$0080; chaosState = 3; image_xscale = -1;
}

var cp_p = instance_find(OBJ_player,0);
if (!instance_exists(cp_p)) exit;
if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
// Task 06: original $6328 compares fixed integer anchors and extents, never
// animated GameMaker sprite bounds.
var cp_player_x = floor(cp_p.chaosCore.xu/256);
var cp_player_y = floor(cp_p.chaosCore.yu/256);
var cp_object_x = floor(chaosXU/256);
var cp_object_y = floor(chaosYU/256);
var cp_overlap = abs(cp_player_x-cp_object_x) <= 20 &&
    cp_player_y >= cp_object_y-26 && cp_player_y <= cp_object_y+18;
if (!cp_overlap) exit;

// The top branch precedes attack checks in the original callback.
if (cp_player_y <= cp_object_y-4) {
    SCR_chaos_type21_top_bounce(cp_p);
    exit;
}

var cp_state11 = cp_p.chaosCore.state == $11 || cp_p.chaosCore.next == $11;
var cp_attack = (!cp_state11 && (cp_p.object_index == OBJ_player_char_spin ||
    global.playerJump || global.playerSpinDash)) || global.playerSuper || global.powerInv;
if (cp_attack) {
    chaosDefeated = true;
    SCR_chaos_enemy_score_100_bytes();
    instance_create(x,y-13,OBJ_explosion);
    with (cp_p) SCR_physics_jump_objects();
    instance_destroy();
    exit;
}

SCR_chaos_apply_hazard_damage(cp_p);
