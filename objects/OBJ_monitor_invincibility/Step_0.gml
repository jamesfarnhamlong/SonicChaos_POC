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

/// If Super is true change me to ring

if (global.playerSuper == true && changeMe == false)
{
    instance_create(x, y, OBJ_monitor_ring);
    x = -99;
    y = -99;
    changeMe = true;
}

