// Generic mapped-object lifecycle (placement scan $8000 + lifetime routine $61E1) through the shared viewport adapter. A room instance is
// retained as the POC's bounded placement adapter. ROM semantics: asleep = callbacks do not run (movement pauses); removal = the object ceases to
// exist; recreation rebuilds it from the canonical placement record (origin X/Y, patrol restarts). Entry (create/wake) is canonical; the
// widescreen retention adapter (SCR_chaos_lifetime_cell) only delays sleep/removal of an object that has already been awake.
var cp_vp = chaos_vp_current();
if (!chaosActive) {
    if (!SCR_chaos_placement_scan(id,cp_vp,chaosOriginX,chaosOriginY)) exit;
    chaosAsleep = true;
    x = chaosOriginX; y = chaosOriginY;
    chaosXU = round(x*256); chaosYU = round(y*256);
    chaosLeftBound = chaosOriginX-(chaosParameter << 4);
    chaosVX = -$0080; chaosVY = $0200;
    chaosState = 3; chaosAnimTick = 0;
    chaosActive = true; visible = false; image_xscale = -1;
}
var cp_cell = SCR_chaos_lifetime_cell(id,cp_vp,floor(x),floor(y));
if (cp_cell == 3) { chaosActive = false; chaosAsleep = true; visible = false; exit; } // $FE: occupancy released
chaosAsleep = (cp_cell >= 2); visible = !chaosAsleep;
if (chaosAsleep) exit; // callbacks do not run while asleep

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
// Canonical contact ($6328 box dx +-19, dy -26..+24) and attack decision: chaos_type21_resolve. The top branch (playerY <= objY - 4) precedes the attack test for any posture.
var cp_res = chaos_type21_resolve(cp_p.chaosCore,cp_object_x,cp_object_y,global.powerInv);
if (cp_res == 1) { SCR_chaos_type21_top_bounce(cp_p); exit; }
if (cp_res == 2) {
    // Side / low contact while attacking: defeated, no rebound (the ROM gives the player none).
    chaosDefeated = true;
    SCR_chaos_enemy_score_100_bytes();
    instance_create(x,y-13,OBJ_explosion);
    instance_destroy();
}
// cp_res == 3: the request D3B0 is staged; $48BC hurts Sonic in his next update.
