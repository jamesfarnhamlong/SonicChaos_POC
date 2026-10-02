// Object phase of the update: the player's whole pass (Step) has run, so type $28 platforms and type $1B spikes now move / test / carry (the ROM order), BEFORE the camera
// reads the player's position below. Runs here rather than in OBJ_chaos_controls so the camera is guaranteed to see the carried position.
SCR_chaos_objects_phase();
// Sign-pan mode (from $18 contact) disables the follow camera on both axes; chaos_goal_camera_step drives X and Y instead.
if (instance_exists(OBJ_player) && !global.chaosPan.active && (!chaos_is_thz3() || !instance_exists(OBJ_chaos_object_50) || instance_find(OBJ_chaos_object_50,0).chaosBoss.camera_mode == 0)) {
 var vh = __view_get(e__VW.HView,0);
 __view_set(e__VW.YView,0,clamp(round(OBJ_player.y-vh/1.5),0,max(0,room_height-vh)));
}
chaos_goal_camera_step();
chaos_boss_camera_step();
