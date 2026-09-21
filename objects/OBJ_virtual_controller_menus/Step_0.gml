/// @description  Controls

SCR_buttons();

/// Opacity

if (global.buttons == 1) 
{
    trans1 = 0.35; 
    trans2 = 0.8;
}
else
{
    trans1 = 0;
    trans2 = 0;
}

/// Animations

if (global.btUp) 
{
    press_up = 1;
}
if (global.btUpRel) 
{
    press_up = 0;
}

if (global.btDown) 
{
    press_down = 1;
}
if (global.btDownRel) 
{
    press_down = 0;
}

if (global.btLeft) 
{
    press_left = 1;
}
if (global.btLeftRel) 
{
    press_left = 0;
}

if (global.btRight) 
{
    press_right = 1;
}
if (global.btRightRel) 
{
    press_right = 0;
}

if (global.btSpace) 
{
    press_action = 1;
}
if (global.btSpaceRel) 
{
    press_action = 0;
}


