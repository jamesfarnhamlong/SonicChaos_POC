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
    instance_create(112, 290, OBJ_player_char);
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

