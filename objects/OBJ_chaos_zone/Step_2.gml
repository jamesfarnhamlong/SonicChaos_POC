// Object phase of the update: the player's whole pass (Step) has run, so type $28 platforms and type $1B spikes now move / test / carry (the ROM order), BEFORE the camera
// reads the player's position below. Runs here rather than in OBJ_chaos_controls so the camera is guaranteed to see the carried position.
SCR_chaos_objects_phase();
if (chaos_is_mghz()) __view_set(e__VW.VSpeed,0,0); // player instance changes must not re-enable uncapped automatic Y travel
// Sign-pan mode (from $18 contact) disables the follow camera on both axes; chaos_goal_camera_step drives X and Y instead.
if (instance_exists(OBJ_player) && !global.chaosPan.active && (!chaos_is_thz3() || !instance_exists(OBJ_chaos_object_50) || instance_find(OBJ_chaos_object_50,0).chaosBoss.camera_mode == 0) && (chaos_gpz_act()!=3 || !instance_exists(OBJ_chaos_object_51) || !instance_find(OBJ_chaos_object_51,0).chaosBoss51.active)) {
 var vh = __view_get(e__VW.HView,0);
 var cp_target_y=clamp(round(OBJ_player.y-vh/1.5),0,max(0,room_height-vh));
 if (chaos_is_mghz()) {
     var cp_current_y=__view_get(e__VW.YView,0);
     cp_target_y=cp_current_y+clamp(cp_target_y-cp_current_y,-7,7); // recovered follow cap permits oil plunge to outrun camera
 }
 __view_set(e__VW.YView,0,cp_target_y);
}
chaos_goal_camera_step();
chaos_boss_camera_step();
chaos_51_camera_step();

if (chaos_is_mghz()) chaos_mghz_effect_step(global.chaosMghzEffects,global.chaosMghzBossActive,global.chaosMghzPaletteControl);
