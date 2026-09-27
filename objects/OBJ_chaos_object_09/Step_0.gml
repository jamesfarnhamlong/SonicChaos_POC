// A collected placement has detached from generic occupancy. Parameter $00
// completes its exact 32-update frame-$05/$06 presentation; parameter $01
// has no visible terminal presentation.
if (chaosCollected) {
    if (chaosParameter == $00 && !chaosFinished) {
        image_index = 4 + ((chaosSparkleTick div 4) & 1);
        chaosSparkleTick++;
        if (chaosSparkleTick >= 32) {
            chaosFinished = true;
            visible = false;
        }
    }
    exit;
}

var cp_cam = view_camera[0];
var cp_rx = chaosOriginX-camera_get_view_x(cp_cam);
var cp_ry = chaosOriginY-camera_get_view_y(cp_cam);
var cp_accepted = cp_rx >= -96 && cp_rx <= 351 && cp_ry >= -96 && cp_ry <= 351;
if (!cp_accepted) {
    // Uncollected generic cleanup releases occupancy; this bounded room
    // adapter becomes available for recreation when the camera returns.
    chaosActive = false;
    visible = false;
    exit;
}
if (!chaosActive) {
    x = chaosOriginX;
    y = chaosOriginY;
    chaosState = chaosParameter == $00 ? 1 : 3;
    chaosAnimTick = 0;
    chaosActive = true;
}

var cp_active = cp_rx >= -32 && cp_rx <= 287 && cp_ry >= -32 && cp_ry <= 287;
visible = cp_active && chaosParameter == $00;
if (!cp_active) exit;

if (chaosParameter == $00) {
    // State 1: frames $01,$02,$04,$03, eight updates each.
    var cp_rotation = [0,1,3,2];
    image_index = cp_rotation[(chaosAnimTick div 8) & 3];
    chaosAnimTick = (chaosAnimTick+1) & 31;
} else {
    // Hidden parameter $01 callback runs only on even global frames.
    visible = false;
    if ((global.chaosGlobalFrame & 1) != 0) exit;
}

var cp_p = instance_find(OBJ_player,0);
if (!instance_exists(cp_p)) exit;
if (abs(floor(x)-floor(cp_p.x)) >= 12 || abs(floor(y)-floor(cp_p.y)) >= 12) exit;

global.chaosType10D29A = SCR_chaos_bcd_add(global.chaosType10D29A,1);
global.ring += 1;
global.chaosLastSoundRequest = $BF;
chaosCollected = true;
chaosActive = false;
if (chaosParameter == $00) {
    chaosState = 2;
    chaosSparkleTick = 0;
    image_index = 4;
    visible = true;
} else {
    chaosFinished = true;
    visible = false;
}
