/// @description  Player get ring

if (room == ROM_chaos_thz1) {
    chaosTHZFrame = (chaosTHZFrame+0.25) mod 6;
    var cp_p = instance_find(OBJ_player,0);
    if (instance_exists(cp_p) && cp_p.bbox_right >= chaosQuadrantLeft &&
        cp_p.bbox_left <= chaosQuadrantRight && cp_p.bbox_bottom >= chaosQuadrantTop &&
        cp_p.bbox_top <= chaosQuadrantBottom) instance_destroy();
} else if (place_meeting(x, y, OBJ_player)) instance_destroy();

