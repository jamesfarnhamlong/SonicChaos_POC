// THZ type $27 (numeric), reconciled with the completed formal audit and the original placement-token lifecycle.
// Placement manager ($8000 scan every four updates, occupancy byte, spawn map at $8146) and lifetime routine ($61E1):
//   - a record with a clear occupancy byte is created when its camera-relative cell is 2 (any scan) or 0/1 (initial fill only);
//   - creation sets sleep bit 6; the first update runs state 0, later updates clear/keep bit 6 by cell (0/1 awake, 2 asleep);
//   - before the trigger (bit 1 clear) leaving the accepted window (cell 3) removes it and releases occupancy ($FE cleanup);
//   - after the 64-pixel trigger bit 1 keeps it alive until state 3's >=384 separation test releases occupancy;
//   - a defeated object detaches its token (instance_destroy), so it never returns in this level session.
// Removal therefore does NOT make the same placement reappear while Sonic stays where the placement is an interior cell.
// Wake/sleep/create/delete are the GENERIC viewport lifecycle bands (SCR_chaos_viewport): EDGE(LEFT/RIGHT, 32/96) of the live view,
// so a wider view changes WHEN the bee wakes, never WHERE it is. The anchor stays WORLD(origin); the 64 px trigger and the 384 px
// removal below are PLAYER_DIST rules and are deliberately independent of the view.
var cp_vp = chaos_vp_current();

if (!chaosActive) {
    // Placement scan: only while the occupancy byte is clear (shared with the other generic-lifecycle types).
    if (!SCR_chaos_placement_scan(id,cp_vp,chaosOriginX,chaosOriginY)) exit;
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
        var cp_cell_s = SCR_chaos_lifetime_cell(id,cp_vp,floor(x),floor(y));
        if (cp_cell_s == 3) { chaosActive = false; visible = false; chaosAsleep = true; exit; } // $FE: occupancy released
        chaosAsleep = (cp_cell_s >= 2);
        visible = !chaosAsleep;
    }
    exit;
}

chaosAnimTick++;
image_index = (chaosAnimTick div 2) & 1;

// State 3 tests the strict removal boundary before overlap or movement ($8A29: type $FE, occupancy released).
if (chaosState == 3 && instance_exists(cp_p) && chaos_vp_dist_ge(floor(x),floor(cp_p.x),384)) {
    chaosActive = false; visible = false; chaosAsleep = true; exit;
}

// Contact is the recovered ROM box ($6328: Sonic 8x24 vs object 9x14 -> dx -17..+17, dy -14..+24) on the fixed integer anchors, tested before this
// update's movement. GameMaker sprite/mask bounds and the +18 render adapter play no part in it.
var cp_overlap = false;
if (instance_exists(cp_p)) {
    if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
    var cp_c = cp_p.chaosCore;
    cp_overlap = chaos_type27_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),floor(x),floor(y));
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
    if (instance_exists(cp_p) && chaos_vp_dist_lt(floor(x),floor(cp_p.x),64)) {
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
var cp_cell_l = SCR_chaos_lifetime_cell(id,cp_vp,floor(x),floor(y));
if (cp_cell_l == 3 && chaosState == 1) { chaosActive = false; visible = false; chaosAsleep = true; exit; }
chaosAsleep = (cp_cell_l >= 2);
visible = !chaosAsleep;
