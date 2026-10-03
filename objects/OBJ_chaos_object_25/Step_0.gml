if (!chaosEnemyPhase) exit;
var cp_vp=chaos_vp_current();
if (!chaosActive) {
    if (!SCR_chaos_placement_scan(id,cp_vp,chaosOriginX,chaosOriginY)) exit;
    x=chaosOriginX; y=chaosOriginY;
    chaosXU=round(x*256); chaosYU=round(y*256);
    chaosLeftBound=(floor(chaosOriginX)-(chaosParameter << 4))&$FFFF;
    chaosVX=-$80; chaosVY=$200; chaosState=1; chaosAnimTick=0; chaosAge=0;
    chaosActive=true; chaosAsleep=true; visible=false;
    sprite_index=SPR_chaos_gpz_enemy_25_mirror;
    exit; // state0 initializer only; no patrol callback
}
chaosAge++;
// $B573 integrates +2 Y then runs the generic +18 foot-probe projection.
// No player gravity and no $21 floor-loss state.
if (!chaosAsleep) {
    sprite_index=chaosState == 1 ? SPR_chaos_gpz_enemy_25_mirror : SPR_chaos_gpz_enemy_25;
    image_index=(chaosAnimTick div 8)&1; chaosAnimTick++;
    chaosXU=(chaosXU+chaosVX)&$FFFFFF; chaosYU=(chaosYU+chaosVY)&$FFFFFF;
    x=chaosXU/256; y=chaosYU/256;
    var cp_floor=chaos_gpz_enemy_floor_project(x,y,chaosVY);
    y=cp_floor.y; chaosYU=round(y*256);
    if (chaos_gpz_patrol_reverse(chaosXU,chaosVX,chaosLeftBound,chaosOriginX)) {
        chaosVX=-chaosVX; chaosState=chaosState == 1 ? 2 : 1;
        chaosAnimTick=0; // opposite state starts its first record on next callback
        // Reversal returns before overlap, but the scheduler still runs lifetime.
    } else {
        var cp_p=instance_find(OBJ_player,0);
        if (instance_exists(cp_p)) {
            if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
            var cp_hit=chaos_ordinary_enemy_resolve(cp_p.chaosCore,floor(x),floor(y),global.powerInv,7,17);
            if (cp_hit == 2) {
                SCR_chaos_enemy_score_100_bytes();
                chaos_gpz_enemy_defeat(id); instance_destroy(); exit;
            }
        }
    }
}
// State1/2 lifetime after callback; no widescreen retention extension.
var cp_cell=SCR_chaos_spawn_cell(cp_vp,floor(x),floor(y));
if (cp_cell == 3) { chaosActive=false; chaosAsleep=true; visible=false; exit; }
chaosAsleep=cp_cell >= 2; visible=!chaosAsleep;
