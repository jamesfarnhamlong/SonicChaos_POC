// Destroy persistent gameplay controls so launches reset power-up state.
with (OBJ_chaos_controls) instance_destroy();
game_set_speed(30, gamespeed_fps);
SCR_screen();
__view_set(e__VW.Object, 0, noone);
__view_set(e__VW.XView, 0, 0);
__view_set(e__VW.YView, 0, 0);
entries = chaos_debug_entries();
selected = 0;
message = "";
