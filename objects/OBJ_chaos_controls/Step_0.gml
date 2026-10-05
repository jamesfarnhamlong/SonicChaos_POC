// F10 opens the explicit developer selector. Unpause first.
if (chaos_in_level() && keyboard_check_pressed(vk_f10)) { chaos_debug_open(); exit; }
// R restarts the Chaos test. F2 switches between Chaos and the engine sample.
if (global.chaosDamageBlinkTimer > 0) {
    global.chaosDamageBlinkTimer--;
    global.playerBlink = global.chaosDamageBlinkTimer > 0;
}

if (keyboard_check_pressed(vk_f2)) {
    game_set_speed(30, gamespeed_fps); // Chaos zone Create restores its own test clock.
    global.checkPoint = false;
    global.ring = 0;
    global.seconds = 0;
    global.minutes = 0;
    if (room == ROM_chaos_thz1) room_goto(ROM_zone_1);
    else room_goto(ROM_chaos_thz1);
}
if (chaos_in_level() && keyboard_check_pressed(ord("R"))) { global.checkPoint = false; room_restart(); }
if (chaos_in_level() && instance_exists(OBJ_player)) {
    if (OBJ_player.y > room_height + 32) room_restart();
}

if (chaos_in_level()) {
 // The shared power selector/timer ($D532/$D44C) now counts down inside the player update (SCR_chaos_power_tick), where the ROM does it.
 if (global.chaosNotice > 0) global.chaosNotice--;
 if (room == ROM_chaos_thz1 && instance_exists(OBJ_player_char) && !global.chaosComplete) {
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
 }
 // Act clear arrives only from player state $20 (type $18 -> $19 -> $20); contact alone never completes the act.
 if (!global.chaosComplete && instance_exists(chaos_goal_player()) && variable_instance_exists(chaos_goal_player(),"chaosCore") && chaos_goal_player().chaosCore.act_clear) {
  chaos_act_complete();
 }
 if (global.chaosGoalContact || (global.chaosComplete && !chaos_is_thz3() && chaos_gpz_act()!=3)) {
  with(OBJ_count_time) alarm[0] = -1;
 }
 if (global.chaosGoalContact && !global.chaosComplete && instance_exists(chaos_goal_player()) && instance_exists(OBJ_chaos_object_18) && variable_instance_exists(chaos_goal_player(),"chaosCore")) {
  chaos_goal_trace(chaos_goal_player().chaosCore, instance_find(OBJ_chaos_object_18,0).x);
 }
}

if (chaos_in_level() && keyboard_check_pressed(vk_f3)) {
    global.chaosDebug = !global.chaosDebug;
}
