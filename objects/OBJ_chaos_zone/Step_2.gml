chaos_59_diag_keys(); // AQZ_DIAG_ONLY
// Object phase of the update: the player's whole pass (Step) has run, so type $28 platforms and type $1B spikes now move / test / carry (the ROM order), BEFORE the camera
// reads the player's position below. Runs here rather than in OBJ_chaos_controls so the camera is guaranteed to see the carried position.
SCR_chaos_objects_phase();
if (chaos_is_mghz() || chaos_is_aqz()) __view_set(e__VW.VSpeed,0,0); // player instance changes must not re-enable uncapped automatic Y travel
// Sign-pan mode (from $18 contact) disables the follow camera on both axes; chaos_goal_camera_step drives X and Y instead.
if (instance_exists(OBJ_player) && !global.chaosPan.active && (!chaos_is_thz3() || !instance_exists(OBJ_chaos_object_50) || instance_find(OBJ_chaos_object_50,0).chaosBoss.camera_mode == 0) && (chaos_gpz_act()!=3 || !instance_exists(OBJ_chaos_object_51) || !instance_find(OBJ_chaos_object_51,0).chaosBoss51.active) && !chaos_56_owns_camera() && !chaos_54_owns_camera() && !chaos_59_owns_camera()) {
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
chaos_56_camera_step();
chaos_54_camera_step();
chaos_59_camera_step(); // AQZ3 boss $59 arena (P4)

if (chaos_is_mghz()) chaos_mghz_effect_step(global.chaosMghzEffects,global.chaosMghzBossActive,global.chaosMghzPaletteControl);

if (chaos_is_sez()) chaos_sez_effect_step(global.chaosSezEffects, global.chaosSezBossActive, 0); // $D44E: the SEZ3 boss shared init (chaos_54_callback $974C) sets chaosSezBossActive, which pauses effect 5

if (chaos_is_aqz()) {
    if (keyboard_check_pressed(vk_f6)) global.chaosAqzTrace=variable_global_exists("chaosAqzTrace") ? !global.chaosAqzTrace : true;
    var cp_bounds=chaos_aqz_bounds(),cp_cam=view_camera[0];
    var cp_bottom=global.chaosAqzEnv.camera_bottom >= 0 ? global.chaosAqzEnv.camera_bottom : cp_bounds[3];
    // Widescreen camera framing adapter: canonical WORLD right edge, maxX - excess width.
    __view_set(e__VW.XView,0,clamp(camera_get_view_x(cp_cam),cp_bounds[0],max(cp_bounds[0],cp_bounds[2]-max(0,camera_get_view_width(cp_cam)-256))));
    __view_set(e__VW.YView,0,clamp(camera_get_view_y(cp_cam),cp_bounds[1],cp_bottom));
    chaos_aqz_effect_step(global.chaosAqzEnv,variable_global_exists("chaosAqzBossActive") && global.chaosAqzBossActive);
}

if (keyboard_check_pressed(vk_f7)) global.chaosPlayerTrace=variable_global_exists("chaosPlayerTrace") ? !global.chaosPlayerTrace : true;

chaos_59_diag_frame(); // AQZ_DIAG_ONLY
