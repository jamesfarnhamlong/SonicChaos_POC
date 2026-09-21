/// @description  Actions

// Variable
global.powerShield = true;

// Create Power
if !(instance_exists(OBJ_power_shield_magnet) || instance_exists(OBJ_power_shield_flame))
{
    instance_create(OBJ_player.x, OBJ_player.y, OBJ_power_shield);
}

// Player Jump
with(OBJ_player_char)
{
    SCR_physics_jump_objects();
}

// Effects
instance_create(x+11, y+11, OBJ_explosion);

