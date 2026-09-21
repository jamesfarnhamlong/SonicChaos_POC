/// @description  Sprites

SCR_player_sprites();

sprite_index = SPR_player_super_transform;

if (global.player == 1) // Sonic
{
    if (image_index >= 6) 
    {
        image_index = 4;
    }
    image_speed = 0.5;
}
else // Others
{
    if (image_index >= 2) 
    {
        image_index = 2;
    }
    image_speed = 0.5;
}


/// Gravity

gravity = 0.2;
speed = -4;

