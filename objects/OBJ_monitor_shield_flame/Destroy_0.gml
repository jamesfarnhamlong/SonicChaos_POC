/// @description  Actions

// Variables
global.powerShield = true;
global.powerShieldFlame = true;

// Create Power
if (instance_exists(OBJ_power_shield))
{
    with(OBJ_power_shield) // Change shield light
    {
        instance_change(OBJ_power_shield_flame, false);
    }
}
else
{
    if !(instance_exists(OBJ_power_shield_magnet))
    {
        instance_create(OBJ_player.x, OBJ_player.y, OBJ_power_shield_flame);
    }
}

// Player Jump
with(OBJ_player_char)
{
    SCR_physics_jump_objects();
}

// Effects
instance_create(x+11, y+11, OBJ_explosion);

