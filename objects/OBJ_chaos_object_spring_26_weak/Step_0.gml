// Object $26 remains a provisional adapter, separate from decoded terrain springs.
if (cooldown > 0) cooldown--;
if (cooldown == 0 && instance_exists(OBJ_player_char)) {
    var cp_p = instance_nearest(x+16,y+16,OBJ_player_char);
    if (cp_p.bbox_right >= x-2 && cp_p.bbox_left <= x+33 &&
        cp_p.bbox_bottom >= y-2 && cp_p.bbox_top <= y+31) {
        if (SCR_chaos_object_spring(cp_p,launch_y)) {
            cooldown = 20;
            if (global.music == 1) audio_play_sound(SFX_sonic_spring,10,false);
        }
    }
}
