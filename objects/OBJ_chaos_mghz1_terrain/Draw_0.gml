draw_set_color(make_color_rgb(85,170,85));
var cp_cam=view_camera[0];
draw_rectangle(camera_get_view_x(cp_cam),camera_get_view_y(cp_cam),camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam),camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam),false);
draw_set_color(c_white);
draw_sprite(SPR_chaos_mghz1_terrain_0,0,0,0);
draw_sprite(SPR_chaos_mghz1_terrain_1,0,1024,0);
draw_sprite(SPR_chaos_mghz1_terrain_2,0,2048,0);
draw_sprite(SPR_chaos_mghz1_terrain_3,0,3072,0);
chaos_mghz_terrain_dynamic(false);
