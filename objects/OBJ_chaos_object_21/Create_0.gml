// THZ1 numeric object type $21. Parameters come from the six canonical records.
chaosOriginX = x;
chaosOriginY = y;
chaosParameter = 0;
if (x == 800  && y == 606) chaosParameter = $08;
if (x == 1248 && y == 862) chaosParameter = $06;
if (x == 2048 && y == 318) chaosParameter = $06;
if (x == 3152 && y == 894) chaosParameter = $03;
if (x == 3296 && y == 286) chaosParameter = $04;
if (x == 2400 && y == 254) chaosParameter = $02;

chaosLeftBound = chaosOriginX-(chaosParameter << 4);
chaosState = 0;
chaosActive = false;
chaosXU = round(x*256);
chaosYU = round(y*256);
chaosVX = -$0080;
chaosVY = $0200;
chaosAnimTick = 0;
chaosDefeated = false;
image_speed = 0;
image_index = 0;
image_xscale = -1;
visible = false;
