if (chaos_in_level()) {
    var cam = view_camera[0];
    var vx = camera_get_view_x(cam);
    var vy = camera_get_view_y(cam);
    var vh = camera_get_view_height(cam);
    draw_set_font(-1);
    draw_set_halign(fa_left);
    draw_set_valign(fa_top);
    draw_set_alpha(1);
    draw_set_color(c_white);
    if (global.chaosNotice > 0) draw_text_transformed(vx+4,vy+vh-40,"CHECKPOINT SAVED",0.75,0.75,0);
    // Type $18 presentation is ROM-derived; act clear comes from player state $20 (SCR_chaos_goal).
    if (global.chaosComplete) {
        var cp_complete_act=chaos_current_act_number();
        draw_text_transformed(vx+4, vy+vh-27, "ACT " + string(cp_complete_act) + " COMPLETE!  " + string(global.chaosFinishTime) + "s  /  " + string(global.chaosFinishRings) + " rings", 0.75, 0.75, 0);
    }
}
