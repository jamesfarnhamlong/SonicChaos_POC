/// AQZ P3: original numeric $3C/$3D contracts. WORLD anchors and 16.8 fractions.
/// Shared pool visits callbacks before lifecycle; mapped scan follows the pass.
function chaos_aqz_enemy_register(cp_r) {
    array_push(global.chaosAqzEnv.enemies,{record:cp_r,occupied:false,spent:false,slot:-1,initial:false});
}
function chaos_aqz_enemy_scan(cp_e,cp_pool,cp_vp) {
    for (var cp_i=0;cp_i<array_length(cp_e.enemies);cp_i++) {
        var cp_r=cp_e.enemies[cp_i];
        if (cp_r.occupied && cp_pool.slots[cp_r.slot].type == 0) cp_r.occupied=false;
        if (cp_r.occupied || cp_r.spent) continue;
        var cp_cell=SCR_chaos_spawn_cell(cp_vp,cp_r.record[1],cp_r.record[2]);
        var cp_fill=!cp_r.initial;cp_r.initial=true;
        if (!(cp_cell == 2 || (cp_cell < 2 && cp_fill))) continue;
        var cp_slot=chaos_aqz_alloc(cp_e,cp_pool,cp_r.record[3],cp_r.record[5],cp_r.record[1],cp_r.record[2],true,cp_r.record[0]);
        if (cp_slot < 0) continue;
        var cp_s=cp_pool.slots[cp_slot];
        cp_s.enemy=true;cp_s.placement=cp_r;cp_s.origin_y=cp_r.record[2];cp_s.counter=0;cp_s.script_state=-1;
        cp_s.asleep=true;cp_s.flags3=cp_r.record[4];
        cp_r.slot=cp_slot;cp_r.occupied=true;
    }
}
function chaos_aqz_enemy_script(cp_s) {
    if (cp_s.script_state != cp_s.requested) {
        cp_s.state=cp_s.requested;cp_s.script_state=cp_s.state;cp_s.pc=0;cp_s.timer=0;
    } else if (cp_s.timer > 0) cp_s.timer--;
    if (cp_s.timer > 0) return;
    for (var cp_guard=0;cp_guard<64;cp_guard++) {
        var cp_ops=variable_struct_get(chaos_aqz_enemy_scripts(),string(cp_s.type))[cp_s.state];
        var cp_op=cp_ops[cp_s.pc];cp_s.pc++;
        switch (cp_op[0]) {
            case 0: cp_s.pc=0;break;
            case 7: cp_s.pc=cp_op[1];break;
            case 2: cp_s.vx=cp_op[1];cp_s.vy=cp_op[2];break;
            case 3:
                cp_s.requested=cp_op[1];cp_s.state=cp_s.requested;cp_s.script_state=cp_s.state;cp_s.pc=0;break;
            case 1:
                cp_s.timer=cp_op[1];cp_s.frame=cp_op[2];cp_s.callback=cp_op[3];
                cp_s.ex=cp_s.frame == 0 ? 0 : 3;cp_s.ey=cp_s.frame == 0 ? 0 : (cp_s.type == $3C ? 13 : 21);return;
        }
    }
}
function chaos_aqz_enemy_contact(cp_s,cp_c,cp_have,cp_clock) {
    if (!cp_have || cp_s.asleep || (cp_c.move&64) != 0) return 0;
    if (cp_s.type == $3C && (cp_clock&1) != 0) return 0;
    var cp_bits=SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),cp_s.x,cp_s.y,cp_c.state == $0F ? 9 : 8,24,cp_s.ex,cp_s.ey);
    if (cp_bits == 0) return 0;
    chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));
    if (cp_s.type == $3C) { chaos_request_stage(cp_c);return 1; }
    if (!chaos_attack_or_invincible(cp_c,global.powerInv)) return 1;
    // Shared $5F3D: spent occupancy, no direct player rebound. Shared player pass owns response.
    cp_s.placement.spent=true;cp_s.token=0;cp_s.parameter=0;
    SCR_chaos_enemy_score_100_bytes();score+=10;
    cp_s.src_type=cp_s.type;cp_s.type=$0F;cp_s.smoke_tick=-1;
    cp_s.state=0;cp_s.requested=0;cp_s.timer=0;cp_s.pc=0;cp_s.asleep=false;cp_s.keep=false;
    return 2;
}
function chaos_aqz_enemy_callback(cp_s,cp_c,cp_have,cp_clock) {
    if (cp_s.callback == $9251) {
        cp_s.requested=cp_s.parameter == 0 ? 1 : 5;
        if (cp_s.parameter != 0) cp_s.yu=(cp_s.yu+12*256)&$FFFFFF;
    } else if (cp_s.callback == $9304) {
        if (cp_s.parameter > 0) cp_s.parameter--;else cp_s.requested=1;
    } else if (cp_s.type == $3C) {
        if (cp_s.callback == $926F) cp_s.yu=(cp_s.yu-4*256)&$FFFFFF;
        if (cp_s.callback == $9274) cp_s.yu=(cp_s.yu+4*256)&$FFFFFF;
        cp_s.y=floor(cp_s.yu/256);
        chaos_aqz_enemy_contact(cp_s,cp_c,cp_have,cp_clock);
    } else if (cp_s.callback == $932B) {
        if (cp_s.asleep) return;
        if (chaos_aqz_enemy_contact(cp_s,cp_c,cp_have,cp_clock) != 0) return;
        if (cp_s.counter > 0) {
            cp_s.counter--;if (cp_s.counter == 0) cp_s.requested=cp_s.requested == 1 ? 2 : 1;
            return;
        }
        cp_s.vy=SCR_cc_s16(cp_s.vy+24);
        cp_s.xu=(cp_s.xu+cp_s.vx)&$FFFFFF;cp_s.yu=(cp_s.yu+cp_s.vy)&$FFFFFF;
        cp_s.x=floor(cp_s.xu/256);cp_s.y=floor(cp_s.yu/256);
        if (cp_s.vy >= 0 && cp_s.y >= cp_s.origin_y) cp_s.counter=32;
    }
    cp_s.x=floor(cp_s.xu/256);cp_s.y=floor(cp_s.yu/256);
}
function chaos_aqz_enemy_visit(cp_e,cp_pool,cp_s,cp_c,cp_have,cp_vp) {
    if (cp_s.type == $FE) {cp_s.type=$FF;return;}
    if (cp_s.type == $FF) {cp_s.type=0;return;}
    if (cp_s.type == $0F) {
        cp_s.smoke_tick++;
        var cp_frames=chaos_gpz_smoke_frames();cp_s.frame=cp_frames[cp_s.smoke_tick];
        if (cp_s.smoke_tick == 0) global.chaosLastGraphicsRequest=$14;
        if (cp_s.smoke_tick >= array_length(cp_frames)-1) cp_s.type=$FF;
        return;
    }
    chaos_aqz_enemy_script(cp_s);
    chaos_aqz_enemy_callback(cp_s,cp_c,cp_have,cp_e.d12f);
    if (cp_s.state == 0 || cp_s.type >= $FE) return;
    var cp_life=chaos_vp_lifecycle_cell(cp_vp,cp_s.x,cp_s.y);
    cp_s.asleep=cp_life >= 2;
    if (cp_life == 3) cp_s.type=cp_s.token != 0 ? $FE : $FF;
}
/// Generated A4 scripts from pinned Research. State3 is not naturally registered.
function chaos_aqz_enemy_scripts() { return {"60":[[[1,224,0,37457],[0]],[[1,4,1,37487],[3,2]],[[1,32,1,37508],[3,3]],[[1,4,1,37492],[3,4]],[[1,32,1,37508],[3,1]],[[1,4,2,37492],[3,6]],[[1,32,2,37508],[3,7]],[[1,4,2,37487],[3,8]],[[1,32,2,37508],[3,5]]],"61":[[[1,224,0,37636],[0]],[[2,192,-512],[1,8,1,37675],[1,8,2,37675],[7,1]],[[2,-192,-512],[1,8,3,37675],[1,8,4,37675],[7,1]],[[2,0,-128],[1,40,1,824],[2,0,0],[1,8,2,824],[1,8,3,824],[1,8,4,824],[1,8,1,824],[1,8,2,824],[1,8,3,824],[1,8,4,824],[2,0,128],[1,40,1,824],[1,16,1,37631],[0]]]}; }
