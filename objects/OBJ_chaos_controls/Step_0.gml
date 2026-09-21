// R restarts the Chaos test. F2 switches between Chaos and the engine sample.
if (keyboard_check_pressed(vk_f2)) {
    game_set_speed(30, gamespeed_fps); // Chaos zone Create restores its own test clock.
    global.checkPoint = false;
    global.ring = 0;
    global.seconds = 0;
    global.minutes = 0;
    if (room == ROM_chaos_thz1) room_goto(ROM_zone_1);
    else room_goto(ROM_chaos_thz1);
}
if (room == ROM_chaos_thz1 && keyboard_check_pressed(ord("R"))) { global.checkPoint = false; room_restart(); }
if (room == ROM_chaos_thz1 && instance_exists(OBJ_player)) {
    if (OBJ_player.y > room_height + 32) room_restart();
}

if (room == ROM_chaos_thz1) {
 if (global.chaosNotice > 0) global.chaosNotice--;
 if (instance_exists(OBJ_player_char) && !global.chaosComplete) {
  var p = instance_find(OBJ_player_char,0);
  // Save a safe ground position after each section, whichever route was chosen.
  var section = min(3,floor(p.x/1024));
  if (section > global.chaosCheckpointIndex && abs(p.vspeed)<0.1 && global.playerJump == false && (!variable_instance_exists(p,"chaosSupport") || p.chaosSupport == noone)) {
   global.chaosCheckpointIndex = section;
   global.checkPoint = true;
   global.checkPointX = p.x;
   global.checkPointY = p.y;
   global.chaosNotice = 120;
  }
  if (p.x >= 3970 && p.y > 450) {
   global.chaosComplete = true;
   global.chaosFinishTime = global.minutes*60+global.seconds;
   global.chaosFinishRings = global.ring;
   with(OBJ_count_time) alarm[0] = -1;
  }
 }
 if (global.chaosComplete) {
  with(OBJ_count_time) alarm[0] = -1;
 }
}

if (room == ROM_chaos_thz1 && keyboard_check_pressed(vk_f3)) {
    global.chaosDebug = !global.chaosDebug;
}
