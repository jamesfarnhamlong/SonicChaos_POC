if (room == ROM_chaos_thz1) {
    var cam = view_camera[0];
    var vx = camera_get_view_x(cam);
    var vy = camera_get_view_y(cam);
    var vh = camera_get_view_height(cam);
    draw_set_font(-1);
    draw_set_halign(fa_left);
    draw_set_valign(fa_top);
    draw_set_alpha(0.7);
    draw_set_color(c_black);
    draw_rectangle(vx, vy+vh-15, vx+camera_get_view_width(cam), vy+vh, false);
    draw_set_alpha(1);
    draw_set_color(c_white);
    draw_text_transformed(vx+4, vy+vh-13, "THZ POC 18.5 | R: restart  F3: debug", 0.65, 0.65, 0);
    if (global.chaosNotice > 0) draw_text_transformed(vx+4,vy+vh-40,"CHECKPOINT SAVED",0.75,0.75,0);
    // Type $18 presentation is ROM-derived; the completion trigger remains the bounded POC adapter.
    if (global.chaosComplete) {
        draw_text_transformed(vx+4, vy+vh-27, "ACT 1 COMPLETE!  " + string(global.chaosFinishTime) + "s  /  " + string(global.chaosFinishRings) + " rings", 0.75, 0.75, 0);
    }
}

if (room == ROM_chaos_thz1 && global.chaosDebug && instance_exists(OBJ_player)) {
    var p = instance_find(OBJ_player, 0);
    var footx = p.x;
    var footy = variable_instance_exists(p,"chaosCore") ? p.chaosCore.yu/256+18 : p.bbox_bottom;
    var tx = floor(footx / 32) * 32;
    var ty = floor(footy / 32) * 32;
    draw_set_alpha(0.45);
    draw_set_color(c_lime);
    draw_rectangle(tx, ty, tx + 32, ty + 32, true);
    draw_set_alpha(1);
    draw_set_color(c_red);
    draw_circle(footx, footy, 3, false);
    draw_set_color(c_white);
    var floor_hit = variable_instance_exists(p,"chaosGrounded") && p.chaosGrounded;
    draw_text(vx+5, vy+15, "x="+string(floor(p.x))+" y="+string(floor(p.y))+
      " foot="+string(floor(footy))+" grounded="+string(floor_hit)+
      " speed="+string_format(variable_instance_exists(p,"chaosCore") ? p.chaosCore.vx/256 : p.hspeed,1,2)+","+string_format(variable_instance_exists(p,"chaosCore") ? p.chaosCore.vy/256 : p.vspeed,1,2));
    if (variable_instance_exists(p,"chaosMotionState")) {
        draw_text(vx+5, vy+48, "tile="+string(p.chaosTile)+
          " surface="+string(p.chaosPreviousFlags)+" modifier="+string(p.chaosModifier)+
          " state="+string(p.chaosMotionState)+(variable_instance_exists(p,"chaosCore") ? " ->"+string(p.chaosCore.next)+" flags="+string(p.chaosCore.contacts)+" unported="+string(p.chaosCore.unsupported) : ""));
    }
    var cp_object = instance_nearest(p.x,p.y,OBJ_chaos_object_spring_26_normal);
    var cp_weak = instance_nearest(p.x,p.y,OBJ_chaos_object_spring_26_weak);
    var cp_span = instance_nearest(p.x,p.y,OBJ_chaos_object_spring_26_span);
    if (!instance_exists(cp_object) || (instance_exists(cp_weak) &&
        point_distance(p.x,p.y,cp_weak.x,cp_weak.y) < point_distance(p.x,p.y,cp_object.x,cp_object.y))) cp_object = cp_weak;
    if (!instance_exists(cp_object) || (instance_exists(cp_span) &&
        point_distance(p.x,p.y,cp_span.x,cp_span.y) < point_distance(p.x,p.y,cp_object.x,cp_object.y))) cp_object = cp_span;
    var cp_spike = instance_nearest(p.x,p.y,OBJ_chaos_spikes);
    if (instance_exists(cp_object)) draw_text(vx+5,vy+65,"$26 state="+string(cp_object.chaosState)+
        " offset="+string(cp_object.chaosOffset)+" param="+string(cp_object.chaosParameter));
    if (instance_exists(cp_spike)) draw_text(vx+5,vy+81,"$1B state="+string(cp_spike.chaosState)+
        " offset="+string(cp_spike.chaosOffset));
}

if (room == ROM_chaos_thz1 && global.chaosDebug && instance_exists(OBJ_player)) {
    var cp_runner = instance_find(OBJ_player, 0);
    if (variable_instance_exists(cp_runner, "chaosLoopActive")) {
        draw_text(vx+5, vy+31, "loop="+string(cp_runner.chaosLoopActive)+
          " path="+string(floor(cp_runner.chaosLoopCursor/256))+
          " plane="+string(global.chaosLoopPlanes[0])+","+string(global.chaosLoopPlanes[1])+
          " riding="+string(cp_runner.chaosSupport != noone));
    }
}
