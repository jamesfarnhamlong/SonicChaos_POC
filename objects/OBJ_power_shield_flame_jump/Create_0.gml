/// @description  Sprite

if (instance_exists(OBJ_player))
{
    image_xscale = OBJ_player.image_xscale;
}

image_speed = 0.6;

/// Sfx

if (global.music == 1)
{
    if (audio_is_playing(SFX_sonic_spin_dash))
    {
        audio_stop_sound(SFX_sonic_spin_dash);
    }
    audio_play_sound(SFX_sonic_spin_dash, 12, false);
}

/// Time to destroy

alarm[0] = 6;

