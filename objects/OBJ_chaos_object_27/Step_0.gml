// THZ1 numeric object type $27, reconciled with the completed formal audit.
var cp_cam = view_camera[0];
var cp_left = camera_get_view_x(cp_cam)-128;
var cp_right = camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)+384;

if (!chaosActive) {
    if (chaosOriginX < cp_left || chaosOriginX >= cp_right) exit;
    x = chaosOriginX; y = chaosOriginY;
    chaosXU = round(x*256); chaosYU = round(y*256);
    chaosState = 1; chaosVX = -$0280; chaosVY = 0;
    chaosCounter = 0; chaosOscTick = 0; chaosAnimTick = 0;
    chaosActive = true; visible = true;
}

// Before the proximity trigger, generic off-range deletion releases occupancy
// and a later camera return recreates the original placement.
if (chaosState == 1 && (x < cp_left || x >= cp_right)) {
    chaosActive = false; visible = false; exit;
}

chaosAnimTick++;
image_index = (chaosAnimTick div 2) & 1;

var cp_p = instance_find(OBJ_player,0);

// State 3 tests the strict removal boundary before overlap or movement.
if (chaosState == 3 && instance_exists(cp_p) && abs(floor(x)-floor(cp_p.x)) >= 384) {
    chaosActive = false; visible = false; exit;
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
        chaosState = 2; chaosVX = 0; chaosVY = 0;
        chaosCounter = $80; chaosOscTick = 0;
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
        chaosState = 3; chaosVX = -$0280; chaosVY = 0;
    }
} else if (chaosState == 3) {
    // Horizontal travel resumes on update 130, one update after underflow.
    chaosXU += chaosVX;
    x = chaosXU/256;
}
