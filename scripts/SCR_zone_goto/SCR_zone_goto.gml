function SCR_zone_goto() {
	switch (global.zoneGoto)
	{
	    case 1: room_goto(ROM_chaos_thz1); break;
	    case 2: room_goto(ROM_zone_2); break;
    
	    default: game_restart(); break; // Error
	}



}
