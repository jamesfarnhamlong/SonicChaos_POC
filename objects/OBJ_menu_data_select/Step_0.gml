/// @description  Movements

SCR_buttons();

// Up, Down
if (global.btLeftPress)
{
    global.saveGame -= 1;
}
if (global.btRightPress) 
{
    global.saveGame += 1;
}

// Limit
if (global.saveGame > global.memoryCards) 
{
    global.saveGame = 1;
}
if (global.saveGame < 1)
{
    global.saveGame = global.memoryCards;
}

/// Save Slot Selected

if (global.btLeftPress || global.btRightPress)
{
    // Open Archive
    ini_open ("settings.ini");
    
    // Save Varibles
    ini_write_real ("system", "saveGame", global.saveGame);
    
    // Close Archive
    ini_close ();
}

/// Go To Zone

if (global.btSpacePress && press == false)
{
    alarm[1] = 2; // fade-out
    alarm[2] = 30; // go to zone...
    press = true;
}

