depth = -10;
mask_index = SPR_chaos_platform_mask; // unused by gameplay (the ROM model reads anchors only); kept so the resource is unchanged
if (!variable_global_exists("chaosOwnerSeq")) global.chaosOwnerSeq = 0;
global.chaosOwnerSeq++;
chaosOwnerId = global.chaosOwnerSeq;  // plays the role of the ROM object id written to $D3C0 while this platform supports Sonic
// THZ1 room-authored instances: canonical parameter/aux1 of the two lift placements and the sag platforms (THZ2 and later acts configure from the canonical row in
// chaos_spawn_type28). Lift reversal period = 16 * aux1 ($09 -> 144, $0D -> 208).
chaosMode = 5; chaosVY = 0; chaosPeriod = 0; chaosTick = 0; chaosSag = 0; chaosSagReturning = false;
chaosX = x; chaosY = y; chaosHomeY = y; chaosDeltaX = 0;
if (x == 592) chaos_platform28_configure(id, $0A, $09);
else if (x == 3664) chaos_platform28_configure(id, $0A, $0D);
else chaos_platform28_configure(id, $84, 0);
