// THZ1 numeric object type $10. Parameter names remain deliberately numeric.
chaosOriginX = x; chaosOriginY = y; chaosParameter = 0;
if ((x == 656 && y == 846) || (x == 1712 && y == 494)) chaosParameter = $06;
if ((x == 336 && y == 270) || (x == 1472 && y == 110)) chaosParameter = $04;
if (x == 2688 && y == 686) chaosParameter = $02;
chaosState = 0; chaosActive = false; chaosConsumed = false;
chaosYU = round(y*256); chaosVY = 0; chaosAnimTick = 0; chaosReplaceTick = 0;
image_speed = 0; image_index = 0; visible = false;
