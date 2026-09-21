/// @description  Variables

// Sprite speed
spriteSpeed = 0.65;

// Ramp Control
yRamp = 0;
up = 0;
down = 0;

/// Controls

SCR_buttons();

/// Sprites

SCR_player_sprites();

sprite_index = SPR_player_spin;
image_speed = spriteSpeed;

// If Blink is true
if (global.playerBlink == true) 
{
    alarm[2] = 4;
}

/// Spin Dash Speed

if (hspeed == 0)
{
    if (image_xscale == 1) // -->
    {
        hspeed = global.valSpinSpeed;
    }
    
    if (image_xscale == -1) // <--
    {
        hspeed = -global.valSpinSpeed;
    }
}


if (room == ROM_chaos_thz1) { SCR_chaos_player_init(id); SCR_chaos_core_attach(id); }
