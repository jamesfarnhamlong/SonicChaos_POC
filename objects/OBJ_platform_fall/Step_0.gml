/// @description  Collision with player

if (place_meeting(x, y-1, OBJ_player) && solid == true)
{
    if (goFall == true)
    {
        alarm[0] = 15; // Time to fall down
        goFall = false
    }
}

/// Gravity

if (collision == true)
{
    gravity = 0.4; // Fall down
    
    if (fall == true) 
    {
        alarm[1] = 90; // Time to recreate
        
        fall = false;
    }
}
else
{
    gravity = 0;
}


