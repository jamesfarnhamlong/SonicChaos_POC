/// @description  Go To ...

//if (global.specialStage == true)
//{
    //instance_create(0,0,OBJ_effect_fade_out_white);
    //alarm[10] = 40; // Special Stage
//}
//else
//{
    instance_create(0,0,OBJ_effect_fade_out);
    alarm[11] = 40; // Next Zone
//}

/// Next Zone

global.zoneGoto++;

/// Save Game

SCR_save_game();

