/// @description  Default values

// Physics
speed = 0;

// Lost vulnerability
global.playerBlink = false;


/// Lost shields

with(OBJ_power_shield) 
{
    instance_destroy();
}

/// Sprites

SCR_player_sprites();

sprite_index = SPR_player_death;
image_speed = 0;

// Opacity
image_alpha = 1;
global.playerBlink = false;

/// Jump

vspeed = -12;

/// Music

if (global.music == 1) 
{
    audio_stop_all();
    audio_play_sound(SND_sonic_death, 10, false);
}

/// Times to..

alarm[0] = 100; // Actions and Fade-out
alarm[1] = 150; // Level restart or Game Over?
alarm[2] = 2; // Destroy Super Sonic

