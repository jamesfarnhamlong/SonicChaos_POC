if (chaosConsumed) {
    chaosReplaceTick++;
    image_index = min(2,chaosReplaceTick div 5);
    if (chaosReplaceTick >= 24) instance_destroy();
    exit;
}

var cp_cam = view_camera[0];
var cp_left = camera_get_view_x(cp_cam)-128;
var cp_right = camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)+384;
if (!chaosActive) {
    if (chaosOriginX < cp_left || chaosOriginX >= cp_right) exit;
    x = chaosOriginX; y = chaosOriginY; chaosYU = round(y*256); chaosVY = 0;
    if (global.player != 1 && chaosParameter == $04) chaosParameter = $01;
    chaosState = 2; chaosAnimTick = 0; chaosActive = true; visible = true;
    global.chaosType10GraphicsSelector = chaosParameter;
}
if (x < cp_left || x >= cp_right) {
    chaosActive = false; visible = false; exit;
}

chaosAnimTick++;
image_index = (chaosAnimTick div 5) & 1;

if (chaosState == 3) {
    chaosYU += chaosVY; chaosVY += $0040;
    y = chaosYU/256;
    var cp_floor = SCR_chaos_object_floor_project(x,y);
    if (cp_floor.grounded && chaosVY >= 0) {
        y = cp_floor.y; chaosYU = round(y*256); chaosVY = 0; chaosState = 2;
    }
    exit;
}

var cp_p = instance_find(OBJ_player,0);
if (!instance_exists(cp_p)) exit;
var cp_overlap = cp_p.bbox_right >= x-10 && cp_p.bbox_left <= x+10 &&
    cp_p.bbox_bottom >= y-24 && cp_p.bbox_top <= y;
if (!cp_overlap) exit;

// $D503.1 is mandatory. Power code $06 alone does not substitute.
var cp_state11 = variable_instance_exists(cp_p,"chaosCore") &&
    (cp_p.chaosCore.state == $11 || cp_p.chaosCore.next == $11);
var cp_attack = !cp_state11 &&
    (cp_p.object_index == OBJ_player_char_spin || global.playerJump || global.playerSpinDash);
if (!cp_attack) exit;
if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
var cp_c = cp_p.chaosCore;

var cp_bottom = cp_p.y > y;
if (cp_bottom) {
    cp_c.vy = $0200;
    chaosVY = -$0200; chaosState = 3;
    exit;
}

var cp_top = cp_p.y <= y-4;
if (cp_top && (cp_c.next == $0F || cp_c.next == $10 || cp_c.next == $15 || cp_c.next == $1A)) exit;
if (cp_c.vy <= 0) exit;

if (cp_c.state != 9) cp_c.vy = -$0400;
SCR_chaos_type10_reward(chaosParameter,cp_p);
SCR_chaos_enemy_score_100_bytes();
chaosConsumed = true; chaosActive = false; chaosReplaceTick = 0;
sprite_index = SPR_chaos_object_0F; image_index = 0; visible = true;
