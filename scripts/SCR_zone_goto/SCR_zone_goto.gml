function SCR_zone_goto(cp_act = global.selectedAct) {
	// Sonic Chaos acts: cp_act indexes chaos_acts(). -thz2 now opens the developer selector.
	var cp_entry = chaos_act_entry(cp_act);
	global.selectedAct = chaos_act_clamp(cp_act);
	if (chaos_dev_thz2_requested()) chaos_debug_open();
	else room_goto(cp_entry.room);
}
