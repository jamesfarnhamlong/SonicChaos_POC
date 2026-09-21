/// @description  Sprite

image_speed = 0.6;
image_alpha = 0.8;

/// Lost power..

if (global.powerShield == false || global.playerWater == true)
{
    instance_destroy();
}

