/// @description  Variables

// Speed of direction
velo = 0.4;

// Reset player speed
hspeed = 0;

// Opacity
alpha = 0.6;

// Blink
alarm[1] = 2;
global.playerBlink = true;

/// Controls 

SCR_player_sprites();
SCR_physics();

/// Direction and Jump

// Direction
if !(place_free(x,y+1))
{
    if (image_xscale == 1) // <--
    {
        hspeed = -velo;
    }
    if (image_xscale == -1) // -->
    {
        hspeed = velo;
    }
}

// Jump
vspeed = -global.valSpeedMax*1.2;

/// Music

if (global.music == 1)
{
    audio_play_sound(SFX_sonic_lost_rings, 10, false);
}

/// If shield is true

if (global.powerShield == false)
{
    instance_create(x,y, OBJ_player_lost_b);
}

if (global.powerShield == true)
{
    global.powerShield = false;
}

