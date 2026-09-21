/// @description  Collision (Beta)

if (instance_exists(OBJ_player))
{
    if (OBJ_player.y < y+(getHeight / 2+abs(OBJ_player.hspeed)) && 
        !place_meeting(x, y+abs(OBJ_player.vspeed), OBJ_player))
    {
        solid = true;
    }
    else if (OBJ_player.y > y+getHeight)
    {
        solid = false;
    }
}

