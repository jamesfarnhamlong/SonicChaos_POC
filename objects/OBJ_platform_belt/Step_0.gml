/// @description  Sprite

if (image_xscale == 1)
{
    sprite_index = SPR_platform_belt_right;
}
else
{
    sprite_index = SPR_platform_belt_left;
}
image_speed = 0.4;


/// Move player direction

if (place_meeting (x, y-1, OBJ_player) && solid == true)
{
    if (image_xscale == 1)
    {
        OBJ_player.x += 2;
    }
    else
    {
        OBJ_player.x -= 2;
    }
}

