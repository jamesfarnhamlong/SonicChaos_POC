/// @description  Time Counter

if (global.playerPlate = false && !instance_exists(OBJ_player_death))
{
    if (alarm[0] = -1)
    {
        alarm[0] = room_speed;
    }
}

if (global.seconds >= 60)
{
    global.minutes += 1;
    global.seconds = 0;
}

/// End time 9:59

if (global.minutes >= 10)
{
    global.minutes = 9;
    global.seconds = 59;
}

/// Death Player
if (global.minutes == 9 && global.seconds == 59)
{
    with(OBJ_player) 
    {
        instance_change(OBJ_player_death, true);
    }
}

/// If rings more than 100

if (global.ring > 99) // Add 8 pixels space to second zero
{
    zeroX = 8;
}
else
{
    zeroX = 0;
}

