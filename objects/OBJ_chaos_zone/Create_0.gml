// Native fixed-point updates, not the old velocity*2 / acceleration*4 approximation.
// 60Hz is the prototype test clock; PAL/NTSC scheduler fidelity is still unverified.
global.chaosTickRate = 60;
game_set_speed(global.chaosTickRate, gamespeed_fps);
SCR_chaos_motion_data();
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
    instance_create(142, 658, OBJ_player_char);
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


// Keep the opening terrain in view on entry.
__view_set(e__VW.VBorder, 0, round(__view_get(e__VW.HView, 0) / 2));
__view_set(e__VW.XView, 0, 0);
__view_set(e__VW.YView, 0, 550);
if (!instance_exists(OBJ_chaos_controls)) instance_create(0, 0, OBJ_chaos_controls);

global.chaosComplete = false;
global.chaosNotice = 0;
if (!global.checkPoint) global.chaosCheckpointIndex = 0;

global.chaosLoopFrames = 0;
global.chaosLoopLast = -1;

global.chaosDebug = false;
