/// @description  Collision with player

if (place_meeting(x, y-1, OBJ_player) && solid == true)
{
    if (goFall == true)
    {
        alarm[0] = 4; // Time to fall down
        goFall = false
    }
}

/// Gravity

if (collision == true)
{
    gravity = 0.4; // Fall down
    
    if (fall == true) 
    {   
        if (global.music == 1)
        {
            if (audio_is_playing(SFX_platform_bridge))
            {
                audio_stop_sound(SFX_platform_bridge);
            }
            audio_play_sound(SFX_platform_bridge, 10, false);
        }
        
        alarm[1] = 90; // Time to recreate
        
        fall = false;
    }
}
else
{
    gravity = 0;
}


