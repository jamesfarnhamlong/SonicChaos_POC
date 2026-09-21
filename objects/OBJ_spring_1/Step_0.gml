/// @description  If collision is true

if (instance_exists(OBJ_player))
{
    if (y-20 > OBJ_player.y)
    {
        upward = true;
    }
    if (y < OBJ_player.y)
    {
        upward = false;
    }
}

