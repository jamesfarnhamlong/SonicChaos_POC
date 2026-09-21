/// @description  Collision with Player

if instance_exists(OBJ_player)
{
    // Player destroy monitor with Spin Dash/Attack
    if (y-26 > OBJ_player.y)
    {
        destroy = true;
        solid = false;
    }
    // Player walk on monitor
    if (y < OBJ_player.y)
    {
        destroy = false;
    }
}

