if (room == ROM_chaos_thz1) {
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
    // Type $18 presentation is ROM-derived; the completion trigger remains the bounded POC adapter.
    if (global.chaosComplete) {
        draw_text_transformed(vx+4, vy+vh-27, "ACT 1 COMPLETE!  " + string(global.chaosFinishTime) + "s  /  " + string(global.chaosFinishRings) + " rings", 0.75, 0.75, 0);
    }
}
