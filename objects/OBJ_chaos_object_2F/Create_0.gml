// Numeric object type $2F, parameter $00 (Spring Shoes; docs/powerup-shoes-audit.md section 6). A mapped, placement-backed object: it is created by the generic
// placement scan, offers itself while Sonic lands on it, follows the player while player state $12 lasts and falls away afterwards.
// Object states (ROM script table $78B1A): 0 init -> 1 offer (mapping frames 1/2, 8 updates each), 3 attached (frame 3 for 12 updates), 4 attached (frame 4),
// 5 detached/falling. chaosRequest is the ROM's requested state (+$02): written by the player callback (3 after every bounce, 5 on detach) or by the object itself.
chaosOriginX = x; chaosOriginY = y; chaosParameter = 0;
chaosState = 0; chaosRequest = 0; chaosFrame = 1; chaosAnimTick = 0;
chaosActive = false; chaosWoken = false; chaosAsleep = true; chaosScanTick = 0; chaosInitialFillDone = false; // generic placement lifecycle (SCR_chaos_placement)
chaosYU = round(y*256); chaosVY = 0;
sprite_index = chaos_is_sez() ? SPR_chaos_sez_spring_shoes : SPR_chaos_mghz_spring_shoes;
image_speed = 0; image_index = 0; visible = false;
