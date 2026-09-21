/// @description  Variables

imgFrame = 0;
climb = false; // Up
fall = false; // Down

/// Default values

// Physics
hspeed = 0;
vspeed = 0;
gravity = 0;

// Lost vulnerability
global.playerBlink = false;


/// Sprites

SCR_player_sprites();

sprite_index = SPR_player_climbing;
image_alpha = 1;

/// Distance adjusments

if (image_xscale == 1)
{
    hspeed++;
}
if (image_xscale == -1)
{
    hspeed--;
}

