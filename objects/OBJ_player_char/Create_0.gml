/// @description  Variables

// Sprites Control
playerImaStop = 0 //0 = stop, 1 = waiting, 2 = up, 3 = down
okStop = true; // Don't repeat the sprite waiting
speed_spr = 0; // Sprite speed (frames)

// Jump Control
global.playerJump = false;
global.playerJumpSpring = false;

// Fly Control
playerFly = false; //se player ta voando
timeFly = true; //se ainda pode voar (tempo)

// Spin Dash Control
global.playerSpinDash = false;
spinSpeed = 0;
spinSfx = 1;
spinSpr = 0.4;

// Moves Control
playerBreakL = false;
playerBreakR = false;
okBreak = true; // Don't looping break sound fx
releasedLeft = false;
releasedRight = false;

// Ramp Control
yRamp = 0;
up = 0;
down = 0;

/// Controls

SCR_buttons();
SCR_player_sprites();

if (global.playerBlink == true) 
{
    alarm[2] = 4;
}


if (room == ROM_chaos_thz1) { SCR_chaos_player_init(id); SCR_chaos_core_attach(id); }
