/// @description  Solid ?

if (instance_exists(OBJ_player))
{
    if (y < OBJ_player.y)
    {
        solid = false;
    }
    if (y-10 > OBJ_player.y)
    {
        solid = true;
    }
}

