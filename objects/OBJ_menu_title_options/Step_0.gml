/// @description  Movements

SCR_buttons();


// Up, Down
if (global.btUpPress)
{
    option -= 1;
}
if (global.btDownPress) 
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

/// Actions (Go to...)

if (global.btSpacePress && press == false)
{
    instance_create(0,0,OBJ_effect_fade_out);
    
    if (option == 1) // Start Game
    {
        alarm[1] = 30;
    }
    if (option == 2) // Options
    {
        alarm[2] = 30;
    }
    
    press = true;
}


