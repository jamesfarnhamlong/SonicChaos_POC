depth = -10; // draws the recovered lost rings (Draw_0): above the ring manager (0) and terrain, below the player (-50)
global.chaosCrushDeathPhase=0;
global.chaosMghzBossActive = false; // future $D44E boss framework hook
global.chaosSezBossActive = false; // $D44E equivalent: SEZ boss (S5) is not implemented; effect 5 honours the pause
global.chaosMghzPaletteControl = 0; // $D492 dispatcher gate
global.chaosMghzEffects = chaos_mghz_effect_new();
global.chaosSezEffects = chaos_sez_effect_new();
chaos_lr_reset(); // recovered lost rings (type $06) never survive a room start / act restart
global.chaosBeyondMapOpen = false; // GameMaker adapter flag: set only while player state $20 runs (SCR_cc_lookup)
// Native fixed-point updates, not the old velocity*2 / acceleration*4 approximation.
// 60Hz is the prototype test clock; PAL/NTSC scheduler fidelity is still unverified.
global.chaosTickRate = 60;
game_set_speed(global.chaosTickRate, gamespeed_fps);
SCR_chaos_motion_data();
chaos_level_install_layout(); // THZ2: canonical package layout replaces the THZ1 collision map.
chaos_level_apply_loops(); // loop centres/rows come from the layout's $51/$52 entry tiles (ROM $6CBA/$6CCD)
// The break transient is non-persistent and room_restart destroys it. Clear
// its only global request marker along with the freshly copied terrain state.
global.chaosLastSoundRequest = 0;
// Turquoise Hill Act 1 opening, extracted from Sonic Chaos SMS.
global.ring = 0;
global.seconds = 0;
global.minutes = 0;
global.buttons = 0;
global.playerBlink = false;
global.playerFly = false;
global.playerSuper = false;
global.powerInv = false;
global.powerShield = false;
global.powerShieldFlame = false;
global.powerShieldMagnet = false;
/// @description  Variables

global.playerPlate = false;

/// Screen Adjustment

SCR_screen();

/// Fade-In Effect

instance_create(0,0,OBJ_effect_fade_in);

/// Control Objects

alarm[0] = 2;

/// Player

// Reset Water Variable
global.playerWater = false;

// Create Player in...
if (global.checkPoint == true)
{
    instance_create(global.checkPointX, global.checkPointY, OBJ_player_char);
}
else
{
    if (chaos_is_sez()) {
        var cp_start=chaos_sez_start();
        instance_create(cp_start[0],cp_start[1],OBJ_player_char);
    } else if (chaos_is_mghz()) {
        var cp_start=chaos_mghz_start();
        instance_create(cp_start[0],cp_start[1],OBJ_player_char);
    } else if (chaos_is_gpz()) {
        var cp_start = chaos_gpz_start();
        instance_create(cp_start[0],cp_start[1],OBJ_player_char);
    } else if (chaos_is_thz3()) {
        // DEV_SPAWN / UNVERIFIED: player-start word semantics are unresolved in the package.
        instance_create(CHAOS_THZ3_DEV_SPAWN_X, CHAOS_THZ3_DEV_SPAWN_Y, OBJ_player_char);
    } else if (chaos_is_thz2()) {
        // DEV_SPAWN / UNVERIFIED: player-start word semantics are unresolved in the package.
        instance_create(CHAOS_THZ2_DEV_SPAWN_X, CHAOS_THZ2_DEV_SPAWN_Y, OBJ_player_char);
    } else instance_create(142, 658, OBJ_player_char);
}

// If Shield is true
if (global.powerShieldFlame == true)
{
    instance_create(OBJ_player.x, OBJ_player.y, OBJ_power_shield_flame);
}
else if (global.powerShieldMagnet == true)
{
    instance_create(OBJ_player.x, OBJ_player.y, OBJ_power_shield_magnet);
}
else if (global.powerShield == true)
{
    instance_create(OBJ_player.x, OBJ_player.y, OBJ_power_shield);
}

/// Player View X

SCR_player_view();
if (chaos_is_mghz()) __view_set(e__VW.VSpeed,0,0); // horizontal automatic follow stays; vertical is the capped End Step adapter


// Keep the opening terrain in view on entry.
__view_set(e__VW.VBorder, 0, round(__view_get(e__VW.HView, 0) / 2));
__view_set(e__VW.XView, 0, 0);
__view_set(e__VW.YView, 0, 550);
// Debug-only fresh camera, including THZ3's shorter room.
if (chaos_is_sez()) {
    var cp_camera=chaos_sez_camera();
    __view_set(e__VW.XView,0,cp_camera[0]);
    __view_set(e__VW.YView,0,cp_camera[1]);
} else if (chaos_is_mghz()) {
    var cp_camera=chaos_mghz_camera();
    __view_set(e__VW.XView,0,cp_camera[0]);
    __view_set(e__VW.YView,0,cp_camera[1]);
} else if (chaos_is_gpz()) {
    var cp_camera = chaos_gpz_camera();
    __view_set(e__VW.XView,0,cp_camera[0]);
    __view_set(e__VW.YView,0,cp_camera[1]);
} else if (variable_global_exists("chaosDebugSession") && global.chaosDebugSession) {
    __view_set(e__VW.YView, 0, clamp(round(OBJ_player.y - __view_get(e__VW.HView, 0) / 1.5), 0, max(0, room_height - __view_get(e__VW.HView, 0))));
}
if (!instance_exists(OBJ_chaos_controls)) instance_create(0, 0, OBJ_chaos_controls);
if (!instance_exists(OBJ_chaos_ring_manager)) instance_create_depth(0,0,0,OBJ_chaos_ring_manager);

global.chaosComplete = false;
global.chaosGoalContact = false;
global.chaosPan = chaos_goal_pan_new();
global.chaosHudSlide = 0;
global.chaosBossNextAct = noone;
global.chaosTraceFrame = 0;
global.chaosTraceLastCam = -1;
global.chaosNotice = 0;
if (!global.checkPoint) global.chaosCheckpointIndex = 0;

global.chaosLoopFrames = 0;
global.chaosLoopLast = -1;

global.chaosDebug = false;

// THZ2: every supported canonical object type is created from package data, not from room instances.
chaos_level_spawn_objects();
