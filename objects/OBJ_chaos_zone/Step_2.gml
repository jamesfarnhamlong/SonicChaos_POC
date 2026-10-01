// Sign-pan mode (from $18 contact) disables the follow camera on both axes; chaos_goal_camera_step drives X and Y instead.
if (instance_exists(OBJ_player) && !global.chaosPan.active) {
 var vh = __view_get(e__VW.HView,0);
 __view_set(e__VW.YView,0,clamp(round(OBJ_player.y-vh/1.5),0,max(0,room_height-vh)));
}
chaos_goal_camera_step();
