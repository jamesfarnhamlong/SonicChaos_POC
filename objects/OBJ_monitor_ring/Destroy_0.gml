/// @description  Actions

// Points
global.ring += 10;

// Player Jump
with(OBJ_player_char)
{
    SCR_physics_jump_objects();
}

// Effects
instance_create(x+11, y+11, OBJ_explosion_silent);

if (global.music == 1)
{
    audio_play_sound(SFX_ring, 10, false);
}

