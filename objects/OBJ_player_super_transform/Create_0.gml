/// @description  Lost shields and power-ups

with(OBJ_power_shield) 
{
    instance_destroy();
}
with(OBJ_power_invincibility)
{
    instance_destroy();
}

global.playerBlink = false;

/// Sprites

SCR_player_sprites();

sprite_index = SPR_player_super_transform;
image_alpha = 1;

/// SFX

if (global.music == 1)
{
    audio_stop_all();
    audio_play_sound(SND_super_sonic_trans, 10, false);
}

/// Time to..

// Change to Super player
alarm[0] = 15; 

