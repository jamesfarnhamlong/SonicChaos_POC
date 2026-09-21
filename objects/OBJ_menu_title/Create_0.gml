/// @description Restart system variables

instance_create(0,0,OBJ_system);

/// Center Screen

SCR_screen();

__view_set( e__VW.Object, 0, self );

x = room_width/2;
y = room_height/2;

/// Fade-In Effect

instance_create(0,0,OBJ_effect_fade_in);

/// Time to create Buttons + Options

alarm[0] = 15;

/// Music

if (global.music == 1)
{
    // your code here
}

