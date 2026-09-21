/// @description  Card Selected

if (global.saveGame == slot)
{
    __view_set( e__VW.Object, 0, self );
}

/// Read Data Slot

if (global.saveGame == slot)
{
    SCR_load_game();
    SCR_load_cards();
}

