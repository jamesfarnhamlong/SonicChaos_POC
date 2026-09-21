/// @description  Solid wall?

if ((instance_exists(OBJ_player_char) || instance_exists(OBJ_player_climbing))
    && global.playerSpinDash == false)
{
    //Solid true
}
else
{
    // Solid false
    instance_change(OBJ_platform_fake_wall, true);
}

