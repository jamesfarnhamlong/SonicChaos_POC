/// @description Variaveis

// Stop blink
global.playerBlink = false;

// Stop fly
global.playerFly = false;

// Sprites Control
playerImaStop = 0 //0 = stop, 1 = waiting, 2 = up, 3 = down
okStop = true; // Don't repeat the sprite waiting
speed_spr = 0; // Sprite speed (frames)

// Jump Control
global.playerJumpSpring = false;

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

/// Start speed

hspeed = 1.1;

/// Sprites

SCR_player_sprites();
image_alpha = 1;

