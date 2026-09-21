/// @description  Variables

fade = "out";
alpha = 0;
press = false;

option = 1;
pause = false;

/// Colors

c1 = c_white;
c2 = c_white;

c_yellow_dark = make_colour_rgb(255,201,14);

/// Controls

SCR_buttons();

alarm[0] = 2; // Pause

/// Load Icon + Zone Names

SCR_load_cards();

/// Buttons

press_up = 0;
press_down = 0;
press_action = 0;

// Opacidade
if (global.buttons == 1) 
{
    trans1 = 0.15; 
    trans2 = 0.8;
}
else
{
    trans1 = 0;
    trans2 = 0;
}

