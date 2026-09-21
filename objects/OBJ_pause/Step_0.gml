/// @description  Transition Effect

if (fade == "out")
{
    alpha += 0.25;
    
    if (alpha > 1) 
    {
        alpha = 1;
    }
}

if (fade == "in")
{
    alpha -= 0.25;
    
    if (alpha < 0) 
    {
        instance_destroy();
    }
}

/// Controls

// Selected Colors
switch(option)
{
    case 1:
        c1 = c_yellow_dark;
        c2 = c_white;
        break;
    case 2:
        c1 = c_white;
        c2 = c_yellow_dark;
        break;
}

// Limits
if (option > 2)
{
    option = 1;
}

// Buttons
SCR_buttons();

if (global.btUpPress || global.btDownPress) 
{
    option++;
}

// Actions
if (global.btSpacePress && press == false)
{
    // Resume
    if (option == 1 && pause == true)
    {
        instance_activate_all();
        audio_resume_all();
        fade = "in";
        press = true;
    }
    // Back to menu
    if (option == 2)
    {
        alarm[1] = 8;
        press = true;
    }
}


/// Buttons Press Animation

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

if (global.btSpace) 
{
    press_action = 1;
}
if (global.btSpaceRel) 
{
    press_action = 0;
}

