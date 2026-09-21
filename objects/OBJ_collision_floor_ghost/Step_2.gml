/// @description  Pass between platform

if (instance_exists(OBJ_player))
{
    if (y < OBJ_player.y)
    {
        solid = false;
    }
    if (y-12 > OBJ_player.y)
    {
        solid = true;
    }
}

