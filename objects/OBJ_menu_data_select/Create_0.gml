/// @description  Center Screen

SCR_screen();

__view_set( e__VW.Object, 0, self );

x = 250;
y = room_height/2;

/// Fade-In Effect

instance_create(0,0,OBJ_effect_fade_in);

///Variables

press = false;

/// Colors

c_yellow_dark = make_colour_rgb(255,201,14);

/// Time to create Buttons + Data Slots

alarm[0] = 15;

