// Numeric object type $21. THZ1 parameters come from the six canonical records; THZ2/THZ3/MGHZ rows override them through chaos_type21_configure.
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
chaosWoken = false; // widescreen retention adapter: has been awake since (re)creation
chaosAsleep = true; chaosScanTick = 0; chaosInitialFillDone = false; // generic placement lifecycle (SCR_chaos_placement)
chaosXU = round(x*256);
chaosYU = round(y*256);
chaosVX = -$0080;
chaosVY = $0200;
chaosAnimTick = 0;
chaosDefeated = false;
// $B210 flags bit 4 (the MGHZ start path): latch +$3F = 1 and requested state 5 instead of 3. THZ records carry flags $00 and keep states 3/4.
chaosAltStart = false;
chaosLatch = 0;
chaosBit4 = true;        // object +$04 bit 4: selects the alternate art base and the mirrored coordinate stream
chaosInitDelay = 0;      // updates spent in the init/state-switch records before the first patrol callback (alt start only)
chaosOrientPending = false;
image_speed = 0;
image_index = 0;
visible = false;
image_xscale = -1;
