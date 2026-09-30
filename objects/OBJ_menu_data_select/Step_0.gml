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

/// Highlighted act (Up, Down)
// Saved zoneGoto stays the slot's real progression. The highlighted act (global.selectedAct) is temporary: it starts from
// the slot's saved progression whenever a slot is shown, Up/Down change only it, and START launches it. Both index chaos_acts().

if (slotShown != global.saveGame)
{
    slotShown = global.saveGame;
    ini_open ("saveGame" + string(global.saveGame) + ".ini");
    global.selectedAct = chaos_act_clamp(ini_read_real ("classicMode", "zoneGoto", 1));
    ini_close ();
}
if (global.btUpPress || global.btDownPress)
{
    global.selectedAct = chaos_act_step(global.selectedAct, global.btDownPress ? 1 : -1);
}

/// Go To Zone

if (global.btSpacePress && press == false)
{
    alarm[1] = 2; // fade-out
    alarm[2] = 30; // go to zone...
    press = true;
}

