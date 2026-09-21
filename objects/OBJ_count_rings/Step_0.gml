/// @description  Minimun Rings

if (global.ring < 0)
{
    global.ring = 0;
}

if (global.ring == 0)
{
    hundred = 100;
}

/// Extra lifes

if (global.ring > hundred)
{
    if (global.music == 1)
    {
        audio_play_sound(SFX_life, 10, false);
    }
    global.life += 1;
    hundred += 100;
}

/// Super countdown

// Second counter (-1 ring)
if (global.playerSuper == true && global.ring > 0)
{
    if (alarm[0] = -1)
    {
        alarm[0] = room_speed;
    }
}

// No more rings
if (global.ring < 1) 
{
    global.playerSuper = false;
}

