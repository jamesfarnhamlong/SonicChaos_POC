if (instance_exists(OBJ_player)) {
 var vh = __view_get(e__VW.HView,0);
 __view_set(e__VW.YView,0,clamp(round(OBJ_player.y-vh/1.5),0,max(0,room_height-vh)));
}
