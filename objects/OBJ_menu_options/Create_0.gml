/// @description  Center Screen

SCR_screen();

__view_set( e__VW.Object, 0, self );

x = room_width/2;
y = room_height/2;

/// Variables

option = 1;
optionLimit = 5; // how many options?

yy = (room_height/2)+16;

/// Colors

c_yellow_dark = make_colour_rgb(255,201,14);

/// Fade-In Effect

instance_create(0,0,OBJ_effect_fade_in);

/// Time to create Buttons

alarm[0] = 15;

