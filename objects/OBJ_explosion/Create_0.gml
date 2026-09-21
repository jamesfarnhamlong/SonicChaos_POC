/// @description  Sprite

sprite_index = SPR_explosion;
image_speed = 0.3;

/// SFX

if (global.music == 1) 
{
    if (audio_is_playing(SFX_explosion)) 
    {
        audio_stop_sound(SFX_explosion);
    }
    audio_play_sound(SFX_explosion, 10, false);
}

