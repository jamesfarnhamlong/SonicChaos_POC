/// Developer infrastructure only. Save/progression indices remain in chaos_acts().
function chaos_debug_entries() {
    var cp_zones = ["TURQUOISE HILL", "GIGALOPOLIS", "SLEEPING EGG", "MECHA GREEN HILL", "AQUA PLANET", "ELECTRIC EGG"];
    var cp_entries = [];
    var cp_acts = chaos_acts();
    for (var cp_z = 0; cp_z < array_length(cp_zones); cp_z++) {
        for (var cp_a = 1; cp_a <= 3; cp_a++) {
            var cp_room = noone;
            if (cp_z == 0) cp_room = cp_acts[cp_a - 1].room;
            if (cp_z == 1) {
                switch (cp_a) { case 1: cp_room=ROM_chaos_gpz1; break; case 2: cp_room=ROM_chaos_gpz2; break; case 3: cp_room=ROM_chaos_gpz3; break; }
            }
            if (cp_z == 2) { switch (cp_a) { case 1: cp_room=ROM_chaos_sez1; break; case 2: cp_room=ROM_chaos_sez2; break; case 3: cp_room=ROM_chaos_sez3; break; } }
            if (cp_z == 3) { switch (cp_a) { case 1: cp_room=ROM_chaos_mghz1; break; case 2: cp_room=ROM_chaos_mghz2; break; case 3: cp_room=ROM_chaos_mghz3; break; } }
            if (cp_z == 4) { switch (cp_a) { case 1:cp_room=ROM_chaos_aqz1;break;case 2:cp_room=ROM_chaos_aqz2;break;case 3:cp_room=ROM_chaos_aqz3;break; } }
            array_push(cp_entries, {zone: cp_zones[cp_z], act: cp_a, room: cp_room,
                enabled: cp_room != noone && room_exists(cp_room), classification: "act"});
        }
    }
    var cp_tests = ["ROCKET SHOES TEST", "SPRING SHOES TEST", "FUTURE MECHANICS / BOSS"];
    for (var cp_t = 0; cp_t < array_length(cp_tests); cp_t++) {
        array_push(cp_entries, {zone: cp_tests[cp_t], act: 0, room: noone,
            enabled: false, classification: "test"});
    }
    return cp_entries;
}
function chaos_debug_open() {
    global.chaosDebugReturnTicks = -1;
    instance_activate_all();
    audio_stop_all();
    global.chaosDebugSession = true;
    room_goto(ROM_chaos_debug_select);
}
function chaos_debug_reset() {
    // Debug launches only. Room transition destroys nonpersistent player/core,
    // boss/arena controllers, objects, ring flags/surfaces and placement ownership.
    global.chaosDebugReturnTicks = -1;
    global.checkPoint = false;
    global.checkPointX = 0;
    global.checkPointY = 0;
    global.player = 1;
    global.life = 3;
    global.playerSprite = 0;
    global.specialStage = false;
    global.playerJump = false;
    global.playerJumpSpring = false;
    global.playerSpinDash = false;
    global.chaosAttackPosture = false;
    global.chaosOwnerSeq = 0;
    global.chaosComplete = false;
    global.chaosGoalContact = false;
    global.chaosFinishTime = 0;
    global.chaosFinishRings = 0;
    global.chaosBossBonus = 0;
    global.chaosBossClearScore = 0;
    global.chaosBossSparkleOn = false;
    global.ringBonus = 0;
    global.timeBonus = 0;
    score = 0;
    // Zone Create reinstalls map width/layout/loops, spawn, camera and objects.
    // Fresh controls Create clears power codes/timers and monitor effect allocation.
}
function chaos_debug_launch(cp_entry) {
    if (!cp_entry.enabled || cp_entry.room == noone || !room_exists(cp_entry.room)) return false;
    global.chaosDebugSession = true;
    chaos_debug_reset();
    var cp_index = chaos_act_index_for_room(cp_entry.room);
    if (cp_index > 0) global.selectedAct = cp_index;
    room_goto(cp_entry.room);
    return true;
}

// Shared developer completion return. Only in-level controls tick this path.
function chaos_debug_return_tick() {
    if (!variable_global_exists("chaosDebugSession") || !global.chaosDebugSession
        || !variable_global_exists("chaosDebugReturnTicks")
        || global.chaosDebugReturnTicks <= 0) return false;
    global.chaosDebugReturnTicks--;
    if (global.chaosDebugReturnTicks != 0) return false;
    chaos_debug_open();
    return true;
}
