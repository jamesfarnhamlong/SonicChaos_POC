/// @description  Sprites

if (plateAction == 2)
{
    sprite_index = SPR_plate_extra_life;
    image_index = global.player-1;
}
else
{
    sprite_index = SPR_plate_action;
    image_index = plateAction;
}
image_speed = 0;

/// Sfx

if (global.music == 1)
{
    audio_stop_all();
    audio_play_sound(SFX_plate_action, 10, false);
    audio_play_sound(SND_plate_finish, 10, false);
}

/// Lost powers

with (OBJ_power_invincibility) 
{
    instance_destroy();
}

/// Reset CheckPoint

global.checkPoint = false;
global.checkPointX = 0;
global.checkPointY = 0;

/// Times to...

alarm[1] = 20; // Go to Part II
alarm[2] = 180; // Transition Fade-out

