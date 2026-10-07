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

// Buttons and three-entry wrap navigation.
SCR_buttons();
if (!press) {
    if (global.btUpPress) option--;
    if (global.btDownPress) option++;
    if (option > 3) option = 1;
    if (option < 1) option = 3;
}
c1 = (option == 1) ? c_yellow_dark : c_white;
c2 = (option == 2) ? c_yellow_dark : c_white;
c3 = (option == 3) ? c_yellow_dark : c_white;

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
    // Level Select safely reactivates the paused world.
    if (option == 2 && pause == true)
    {
        press = true;
        chaos_debug_open();
        exit;
    }
    // Back to title
    if (option == 3)
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

