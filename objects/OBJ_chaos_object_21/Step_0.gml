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
var cp_overlap = cp_p.bbox_right >= x-11 && cp_p.bbox_left <= x+11 &&
    cp_p.bbox_bottom >= y-26 && cp_p.bbox_top <= y;
if (!cp_overlap) exit;

// The top branch precedes attack checks in the original callback.
if (cp_p.y <= y-4) {
    SCR_chaos_type21_top_bounce(cp_p);
    exit;
}

var cp_attack = cp_p.object_index == OBJ_player_char_spin || global.playerJump ||
    global.playerSpinDash || global.playerSuper || global.powerInv;
if (cp_attack) {
    chaosDefeated = true;
    SCR_chaos_enemy_score_100_bytes();
    instance_create(x,y-13,OBJ_explosion);
    with (cp_p) SCR_physics_jump_objects();
    instance_destroy();
    exit;
}

SCR_chaos_apply_hazard_damage(cp_p);
