function SCR_physics_jump_objects() {
    if (room == ROM_chaos_thz1 && variable_instance_exists(id,"chaosCore")) { chaosQueuedBounce = true; return; }
	if (global.playerFly == true) exit;

	SCR_physics();
	global.playerJumpSpring = false;

	// Jump
	if (vspeed > 0 && vspeed < global.valJumpMax || 
	    vspeed < 0 && vspeed > -global.valJumpMax)
	{
	    vspeed = -abs(vspeed)*1.1;
	}

	// Jump limit
	if (vspeed > global.valJumpMax || vspeed < -global.valJumpMax) 
	{
	    vspeed = -global.valJumpMax*1.1;
	}



}
