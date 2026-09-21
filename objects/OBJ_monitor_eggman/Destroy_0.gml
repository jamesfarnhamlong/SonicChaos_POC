/// @description  Actions

// Lost powers or death
with(OBJ_player) 
{
    if (global.playerSuper == false && global.playerBlink == false)
    {
        // If not have invincibility
        if (global.powerInv == false) 
        {
            // If have a Shield
            if (global.powerShield == true) 
            {
                instance_change(OBJ_player_lost_a, true);
            }
            else
            {
                if (global.ring > 0) 
                {
                    instance_change(OBJ_player_lost_a, true);
                }
                else
                {
                    instance_change(OBJ_player_death, true);
                }
            }
        }
    }
}

// Effects
instance_create(x+11, y+11, OBJ_explosion);

