/// @description  Center Screen

SCR_screen();

__view_set( e__VW.Object, 0, self );

x = room_width/2;
y = room_height/2;

/// Fade-In Effect

instance_create(0,0,OBJ_effect_fade_in);

/// Stop All Sounds

audio_stop_all();

/// Time to back to Start

alarm[0] = 90;

