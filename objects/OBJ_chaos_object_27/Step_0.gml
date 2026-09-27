// THZ1 numeric object type $27. Task 08 replaces only generic lifetime and
// presentation timing; proximity, oscillation, contact and removal stay intact.
var cp_cam = view_camera[0];
var cp_cam_x = camera_get_view_x(cp_cam);
var cp_cam_y = camera_get_view_y(cp_cam);

if (!chaosActive) {
    // The placement scan runs every four object updates and creates after the
    // current scheduler pass with an empty frame.
    if ((global.chaosGlobalFrame & 3) != 0) exit;
    var cp_origin_rx = chaosOriginX-cp_cam_x;
    var cp_origin_ry = chaosOriginY-cp_cam_y;
    if (cp_origin_rx < -96 || cp_origin_rx > 351 ||
        cp_origin_ry < -96 || cp_origin_ry > 351) exit;
    x = chaosOriginX;
    y = chaosOriginY;
    chaosXU = round(x*256);
    chaosYU = round(y*256);
    chaosState = 0;
    chaosVX = 0;
    chaosVY = 0;
    chaosCounter = 0;
    chaosOscTick = 0;
    chaosAnimTick = 0;
    chaosPresentation = 0;
    chaosActive = true;
    visible = false;
    exit;
}

var cp_rx = x-cp_cam_x;
var cp_ry = y-cp_cam_y;
var cp_accepted = cp_rx >= -96 && cp_rx <= 351 && cp_ry >= -96 && cp_ry <= 351;
if ((chaosState == 0 || chaosState == 1) && !cp_accepted) {
    // Pre-trigger generic cleanup releases occupancy for later recreation.
    chaosActive = false;
    chaosPresentation = 0;
    visible = false;
    exit;
}

var cp_sat_active = cp_rx >= -32 && cp_rx <= 287 && cp_ry >= -32 && cp_ry <= 287;
if (!cp_sat_active) {
    visible = false;
    exit;
}

if (chaosState == 0) {
    // First update: empty state 0 requests state 1; piece count remains zero.
    chaosState = 1;
    chaosPresentation = 1;
    visible = false;
    exit;
}
if (chaosPresentation == 1) {
    // Second update: state 1 loads nonempty frame 1 and can enter SAT output.
    chaosPresentation = 2;
    chaosVX = -$0280;
    image_index = 0;
}
visible = true;

chaosAnimTick++;
image_index = (chaosAnimTick div 2) & 1;
var cp_p = instance_find(OBJ_player,0);

// State 3 tests the strict removal boundary before overlap or movement.
if (chaosState == 3 && instance_exists(cp_p) && abs(floor(x)-floor(cp_p.x)) >= 384) {
    chaosActive = false;
    chaosPresentation = 0;
    visible = false;
    exit;
}

var cp_overlap = false;
if (instance_exists(cp_p)) {
    cp_overlap = cp_p.bbox_right >= x-9 && cp_p.bbox_left <= x+9 &&
        cp_p.bbox_bottom >= y-14 && cp_p.bbox_top <= y;
}
if (cp_overlap) {
    var cp_attack = cp_p.object_index == OBJ_player_char_spin || global.playerJump ||
        global.playerSpinDash || global.playerSuper || global.powerInv;
    if (cp_attack) {
        SCR_chaos_enemy_score_100_bytes();
        chaosSilentDestroy = false;
        instance_destroy();
    }
    // Ordinary overlap requests no damage and stalls movement/counter decrement.
    exit;
}

if (chaosState == 1) {
    chaosXU += chaosVX;
    x = chaosXU/256;
    // Activation compares post-movement integer X and is strictly less than 64.
    if (instance_exists(cp_p) && abs(floor(x)-floor(cp_p.x)) < 64) {
        chaosState = 2;
        chaosVX = 0;
        chaosVY = 0;
        chaosCounter = $80;
        chaosOscTick = 0;
    }
} else if (chaosState == 2) {
    chaosOscTick++;
    // Exact callback schedule: 32 add, 64 subtract, then 33 add updates.
    if (chaosOscTick <= 32 || chaosOscTick >= 97) chaosVY += $0003;
    else chaosVY -= $0003;
    chaosYU += chaosVY;
    y = chaosYU/256;
    chaosCounter = (chaosCounter-1) & $FF;
    if (chaosCounter == $FF) {
        chaosState = 3;
        chaosVX = -$0280;
        chaosVY = 0;
    }
} else if (chaosState == 3) {
    // Horizontal travel resumes on update 130, one update after underflow.
    chaosXU += chaosVX;
    x = chaosXU/256;
}
