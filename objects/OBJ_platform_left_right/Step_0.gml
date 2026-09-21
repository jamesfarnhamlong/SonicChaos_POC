/// @description  Directions

if (pDirection == 0) // Left
{
    x -= pSpeed;
    if (place_meeting (x, y-1, OBJ_player) && solid == true)
    {
        OBJ_player.x -= pSpeed;
    }
}

if (pDirection == 1) // Right
{
    x += pSpeed;
    if (place_meeting (x, y-1, OBJ_player) && solid == true)
    {
        OBJ_player.x += pSpeed;
    }
}

/// Collision wall block

if (place_meeting(x, y, OBJ_collision_platforms) && wall == false)
{
    pSpeed = 0;
    pDirection++;
    
    alarm[0] = 5;
    
    wall = true;
}

/// Limiter

if (pDirection > 1)
{
    pDirection = 0;
}

