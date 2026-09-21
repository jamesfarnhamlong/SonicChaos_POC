/// @description  Solid wall?

if ((instance_exists(OBJ_player_char) || instance_exists(OBJ_player_climbing)) 
    && global.playerSpinDash == false)
{
    // Solid true
    instance_change(OBJ_platform_fake_wall_solid, true);
}
else 
{
    // Solid false and destroy
    if (instance_exists(OBJ_player) && place_meeting(x-1,y,OBJ_player))
    {
        if (global.music == 1)
        {
            if (audio_is_playing(SFX_platform_destroy))
            {
                audio_stop_sound(SFX_platform_destroy);
            }
            audio_play_sound(SFX_platform_destroy, 10, false);
        }
        
        instance_create(x-8, y-8, OBJ_platform_fake_wall_destroy_l_1);
        instance_create(x-8, y, OBJ_platform_fake_wall_destroy_l_2);
        instance_create(x+8, y-8, OBJ_platform_fake_wall_destroy_r_1);
        instance_create(x+8, y, OBJ_platform_fake_wall_destroy_r_2);
        
        instance_destroy();
    }
}

