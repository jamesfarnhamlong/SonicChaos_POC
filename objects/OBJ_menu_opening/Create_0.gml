/// @description  Center Screen

SCR_screen();

__view_set( e__VW.Object, 0, self );

x = room_width/2;
y = room_height/2;

/// Fade-in Effect

instance_create(0,0,OBJ_effect_fade_in);

/// Time to ...

// Fade-out
alarm[0] = 80;

// Next Room
alarm[1] = 120;

