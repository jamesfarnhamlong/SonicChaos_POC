/// @description  Load data icons and zones names
function SCR_load_cards() {

	if (global.allZones == false || instance_exists(OBJ_pause))
	{
	    // The card title and icon come from the act table; the saved zone code is the entry.
	    var cp_entry = chaos_act_entry(global.selectedAct);
	    loadIcon = cp_entry.icon;
	    loadZone = cp_entry.name;
	}
	else // Clear all game
	{
	    loadIcon = 2; //Super Sonic
	    loadZone = "clear"; //clear game
	}



}
