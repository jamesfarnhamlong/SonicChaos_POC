/// @description  Movements

if (keyboard_check_pressed(vk_f10) && !press) { chaos_debug_open(); exit; }
SCR_buttons();


// Up, Down
if (!press && global.btUpPress)
{
    option -= 1;
}
if (!press && global.btDownPress)
{
    option += 1;
}


// Limit
if (option > optionLimit) 
{
    option = 1;
}
if (option < 1) 
{
    option = optionLimit;
}

///Color Selected

if (option == 1) 
{
    c1 = c_yellow_dark;
}
else 
{
    c1 = c_white;
}

if (option == 2) 
{
    c2 = c_yellow_dark;
}
else 
{
    c2 = c_white;
}

c3 = (option == 3) ? c_yellow_dark : c_white;

/// Actions (Go to...)

if (global.btSpacePress && press == false)
{
    instance_create(0,0,OBJ_effect_fade_out);
    
    if (option == 1) // Start Game
    {
        alarm[1] = 30;
    }
    if (option == 2) // Level Select
    {
        alarm[2] = 30;
    }
    if (option == 3) // Options
    {
        alarm[2] = 30;
    }
    
    press = true;
}


