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
 if (global.chaosPowerTimer > 0) {
  global.chaosPowerTimer--;
  if (global.chaosPowerTimer == 0) {
   if (global.chaosPowerCode == $06) global.powerInv = false;
   if (global.chaosPowerCode == $04) {
    global.chaosLastSoundRequest = $81;
    global.chaosMusicRestoreRequested = true;
   }
   // ROM $4A74 clears only codes 4 and 6 at timer zero; code 3 is not cleared (see docs/thz2-thz3-object-deltas.md).
   if (global.chaosPowerCode != $03) global.chaosPowerCode = 0;
  }
 }
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
 if (!global.chaosComplete && instance_exists(OBJ_player_char) && variable_instance_exists(instance_find(OBJ_player_char,0),"chaosCore") && instance_find(OBJ_player_char,0).chaosCore.act_clear) {
  chaos_act_complete();
 }
 if (global.chaosGoalContact || global.chaosComplete) {
  with(OBJ_count_time) alarm[0] = -1;
 }
 if (global.chaosGoalContact && !global.chaosComplete && instance_exists(OBJ_player_char) && instance_exists(OBJ_chaos_object_18) && variable_instance_exists(instance_find(OBJ_player_char,0),"chaosCore")) {
  chaos_goal_trace(instance_find(OBJ_player_char,0).chaosCore, instance_find(OBJ_chaos_object_18,0).x);
 }
}

if (chaos_in_level() && keyboard_check_pressed(vk_f3)) {
    global.chaosDebug = !global.chaosDebug;
}

// Developer shortcut (F10): toggle THZ1 <-> THZ2 in-level. Normal selection is the data-select act table (chaos_acts()).
if (chaos_in_level() && keyboard_check_pressed(vk_f10)) {
    global.checkPoint = false;
    global.ring = 0;
    room_goto(chaos_is_thz2() ? ROM_chaos_thz1 : ROM_chaos_thz2);
}
