/// @description  Water

if (instance_exists(OBJ_player))
{
    // In
    if (place_meeting(x,y+vspeed,OBJ_player) && global.playerWater == false)
    {
        global.playerWater = true;
        
        if (global.music == 1 && onWater == false)
        {
            if (audio_is_playing(SFX_sonic_water)) 
            {
                audio_stop_sound(SFX_sonic_water);
            }
            audio_play_sound(SFX_sonic_water, 10, false);
        }
        onWater = true;
    }
    // Out
    if (!place_meeting(x,y+vspeed,OBJ_player) && OBJ_player.y < y &&
        global.playerWater == true && onWater == true)
    {
        global.playerWater = false;
        onWater = false;
    }
}


