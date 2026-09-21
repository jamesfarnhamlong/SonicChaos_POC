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

/// Moves control

if (place_meeting(x, y-1, OBJ_player) && global.playerFly == false)
{
    x = OBJ_player.x;
    
    if (OBJ_player.hspeed > 0 || OBJ_player.hspeed < 0)
    {
        image_speed = 1;
    }
    if (OBJ_player.hspeed = 0)
    {
        image_speed = 0;
    }
}
else
{
    image_speed = 0;
}

