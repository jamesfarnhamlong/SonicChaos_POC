/// @description  Time Out Actions

// Disable power
global.powerInv = false;

// SFX
if (global.music == 1) 
{
    audio_stop_sound(SND_power_invincibility);
}

