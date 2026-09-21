/// @description  Save options

// Open Archive
ini_open ("settings.ini");

// Save Varibles
ini_write_real ("system", "screenSize", global.screenSize);
ini_write_real ("system", "windowSize", global.windowSize);
ini_write_real ("system", "buttons", global.buttons);
ini_write_real ("system", "music", global.music);

// Close Archive
ini_close ();

/// Back

room_goto(ROM_menu_title);

