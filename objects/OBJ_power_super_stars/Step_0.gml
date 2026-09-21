/// @description  Directions

if (instance_exists(OBJ_player))
{
    if (OBJ_player.image_xscale = -1)
    {
        direction = 0;
    }
    if (OBJ_player.image_xscale = 1)
    {
        direction = 180;
    }
    motion_set(direction, -OBJ_player.hspeed/2.5);
}

