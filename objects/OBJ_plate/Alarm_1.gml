/// @description  Sfx and Values

//------------ EGGMAN ----------------

if (plateAction == 0) 
{
    if (global.music == 1) 
    {
        audio_play_sound(SFX_sonic_lost_rings, 10, false);
    }
}

//------------ SPECIAL STAGE ----------------

if (plateAction == 1)
{
    if (global.music == 1) 
    {
        audio_play_sound(SFX_bumper, 10, false);
    }
    global.specialStage = true;
}

//------------ EXTRA LIFE ----------------

if (plateAction == 2) 
{
    if (global.music == 1) 
    {
        audio_play_sound(SFX_life, 10, false);
    }
    global.life += 1;
}

//------------ 10 RINGS ----------------

if (plateAction == 3)
{
    if (global.music == 1) 
    {
        audio_play_sound(SFX_ring, 10, false);
    }
    global.ring += 10;
}

