/// @description  Actions

// Points
global.powerInv = true;

// Create Power
instance_create(0, 0, OBJ_power_invincibility);

// Player Jump
with(OBJ_player_char)
{
    SCR_physics_jump_objects();
}

// Effects
instance_create(x+11, y+11, OBJ_explosion_silent);

if (global.music == 1)
{
    audio_stop_all();
    audio_play_sound(SND_power_invincibility, 10, false);
}

