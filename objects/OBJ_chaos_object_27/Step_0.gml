// THZ type $27 (numeric), reconciled with the completed formal audit and the original placement-token lifecycle.
// Placement manager ($8000 scan every four updates, occupancy byte, spawn map at $8146) and lifetime routine ($61E1):
//   - a record with a clear occupancy byte is created when its camera-relative cell is 2 (any scan) or 0/1 (initial fill only);
//   - creation sets sleep bit 6; the first update runs state 0, later updates clear/keep bit 6 by cell (0/1 awake, 2 asleep);
//   - before the trigger (bit 1 clear) leaving the accepted window (cell 3) removes it and releases occupancy ($FE cleanup);
//   - after the 64-pixel trigger bit 1 keeps it alive until state 3's >=384 separation test releases occupancy;
//   - a defeated object detaches its token (instance_destroy), so it never returns in this level session.
// Removal therefore does NOT make the same placement reappear while Sonic stays where the placement is an interior cell.
var cp_cam = view_camera[0];
var cp_cam_x = floor(camera_get_view_x(cp_cam));
var cp_cam_y = floor(camera_get_view_y(cp_cam));
var cp_scan_now = (chaosScanTick mod 4) == 0;
chaosScanTick++;

if (!chaosActive) {
    // Placement scan: only while the occupancy byte is clear.
    if (!cp_scan_now) exit;
    var cp_cell = SCR_chaos_spawn_cell(chaosOriginX-cp_cam_x,chaosOriginY-cp_cam_y);
    var cp_fill = !chaosInitialFillDone;
    chaosInitialFillDone = true; // $D440 is set once the first pass completes
    if (!(cp_cell == 2 || (cp_cell < 2 && cp_fill))) exit;
    x = chaosOriginX; y = chaosOriginY;
    chaosXU = round(x*256); chaosYU = round(y*256);
    chaosState = 1; chaosVX = -$0280; chaosVY = 0;
    chaosCounter = 0; chaosOscTick = 0; chaosAnimTick = 0;
    chaosActive = true; chaosAsleep = true; chaosAge = 0; visible = false;
    exit;
}
chaosAge++;

var cp_p = instance_find(OBJ_player,0);

// State-1 callback $89AC returns while creation/sleep bit 6 is set; state 0 (first update) only requests state 1.
var cp_run_state1 = chaosState == 1 && chaosAge >= 2 && !chaosAsleep;
if (chaosState == 1 && !cp_run_state1) {
    // no callback this update; the lifetime routine below still runs from the second update
    if (chaosAge >= 2) {
        var cp_cell_s = SCR_chaos_spawn_cell(floor(x)-cp_cam_x,floor(y)-cp_cam_y);
        if (cp_cell_s == 3) { chaosActive = false; visible = false; chaosAsleep = true; exit; } // $FE: occupancy released
        chaosAsleep = (cp_cell_s >= 2);
        visible = !chaosAsleep;
    }
    exit;
}

chaosAnimTick++;
image_index = (chaosAnimTick div 2) & 1;

// State 3 tests the strict removal boundary before overlap or movement ($8A29: type $FE, occupancy released).
if (chaosState == 3 && instance_exists(cp_p) && abs(floor(x)-floor(cp_p.x)) >= 384) {
    chaosActive = false; visible = false; chaosAsleep = true; exit;
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

// Post-update lifetime routine ($61E1): cell 3 = off range (only removes a not-yet-triggered object; bit 1 keeps a triggered one),
// cell 2 = asleep (not displayed), cells 0/1 = awake.
var cp_cell_l = SCR_chaos_spawn_cell(floor(x)-cp_cam_x,floor(y)-cp_cam_y);
if (cp_cell_l == 3 && chaosState == 1) { chaosActive = false; visible = false; chaosAsleep = true; exit; }
chaosAsleep = (cp_cell_l >= 2);
visible = !chaosAsleep;
