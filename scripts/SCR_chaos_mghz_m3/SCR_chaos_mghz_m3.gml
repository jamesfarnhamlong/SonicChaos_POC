/// Research 7ba4d8a, mghz/object-24-2e.json. Integer anchors, 8.8 motion.
/// One ordered slot array: placement and script creation both use $5EE1 (7..17).
/// Existing M1/M2 instances retain their gameplay; occupancy bridges share their
/// placement/lifetime with this scheduler, rather than an unlimited particle pool.
function chaos_object_free_slot(cp_slots,cp_first,cp_end) {
    for (var cp_i=cp_first;cp_i<cp_end;cp_i++) if (cp_slots[cp_i].type == 0) return cp_i;
    return -1;
}
function chaos_m3_slot(cp_type,cp_param,cp_x,cp_y,cp_token) {
    return {type:cp_type,parameter:cp_param,xu:cp_x*256,yu:cp_y*256,
        origin_x:cp_x,origin_y:cp_y,token:cp_token,state:0,requested:0,
        tick:0,frame:0,vx:0,vy:0,asleep:true,woken:false,keep:false,
        external:false,ref:noone,ring_ref:noone,aux0:0,aux1:0,age:0,converted:false,boss:false};
}
function chaos_m3_new() {
    var cp_slots=[];
    for (var cp_i=0;cp_i<19;cp_i++) array_push(cp_slots,chaos_m3_slot(0,0,0,0,0));
    return {slots:cp_slots,records:[],scan_tick:0,initial:true,score:0,
        score_disabled:false,spawns:[],passes:0};
}
function chaos_m3_record(cp_b,cp_r,cp_ref) {
    array_push(cp_b.records,{row:cp_r,ref:cp_ref,occupied:false,consumed:false});
}
function chaos_m3_x(cp_s) { return floor(cp_s.xu/256); }
function chaos_m3_y(cp_s) { return floor(cp_s.yu/256); }
function chaos_m3_move(cp_s) {
    cp_s.xu=(cp_s.xu+cp_s.vx+16777216) mod 16777216;
    cp_s.yu=(cp_s.yu+cp_s.vy+16777216) mod 16777216;
}
/// $0434 -> $6328; attack posture is deliberately irrelevant. Hurt/blink/
/// invincibility are handled by the existing shared player $48BC path.
function chaos_m3_contact24(cp_s,cp_c) {
    if ((cp_c.move&64) != 0) return 0;
    var cp_bits=SCR_chaos_box_contact(floor(cp_c.xu/256),chaos_signed_world_y(cp_c.yu),
        chaos_m3_x(cp_s),chaos_m3_y(cp_s),cp_c.state == $0F ? 9 : 8,24,4,11);
    if (cp_bits != 0) {
        chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));
        chaos_request_stage(cp_c);
    }
    return cp_bits;
}
function chaos_m3_trigger24(cp_s,cp_c) {
    return !cp_s.asleep && abs(chaos_m3_x(cp_s)-floor(cp_c.xu/256)) < 48 && abs(cp_c.vx) < $100;
}
function chaos_m3_strip(cp_s,cp_c) {
    var cp_x=floor(cp_c.xu/256);
    return cp_x > cp_s.origin_x && cp_x <= cp_s.origin_x+cp_s.aux1*16 &&
        abs(chaos_signed_world_y(cp_c.yu)-cp_s.origin_y) < 3;
}
/// Object sampler $7725: block HEADER at (x,y+18), not player probes/profiles.
function chaos_m3_terrain(cp_x,cp_y) {
    var cp_row=floor(cp_y/32),cp_col=floor(cp_x/32);
    var cp_index=cp_row*global.chaosMapWidth+cp_col;
    if (cp_x < 0 || cp_y < 0 || cp_col >= global.chaosMapWidth || cp_index >= min(4095,array_length(global.chaosTileIds))) return 0;
    return global.chaosHeaders0[global.chaosTileIds[cp_index]][0];
}
function chaos_m3_consume(cp_b,cp_token) {
    for (var cp_i=0;cp_i<array_length(cp_b.records);cp_i++)
        if (cp_b.records[cp_i].row[0] == cp_token) cp_b.records[cp_i].consumed=true;
}
function chaos_m3_step24(cp_b,cp_s,cp_c,cp_have) {
    if (cp_s.state != cp_s.requested) { cp_s.state=cp_s.requested;cp_s.tick=0; }
    if (cp_s.state == 0) { cp_s.frame=0;cp_s.requested=1;return; }
    if (cp_s.state == 1) {
        cp_s.frame=1+(floor(cp_s.tick/8) mod 3);cp_s.tick++;
        if (cp_s.asleep) return;
        if (cp_have) {
            chaos_m3_contact24(cp_s,cp_c);
            if (chaos_m3_trigger24(cp_s,cp_c)) cp_s.requested=2;
        }
        return;
    }
    if (cp_s.state == 2) {
        if (cp_s.tick < 16) {
            cp_s.frame=(cp_s.tick mod 4) < 2 ? 1 : 2;
            cp_s.vx=(cp_s.tick mod 4) < 2 ? $200 : -$200;
            cp_s.tick++;
            if (cp_s.asleep) return;
            if (cp_have) chaos_m3_contact24(cp_s,cp_c);
            chaos_m3_move(cp_s);
        } else {
            // T+17 $B4D1 ignores sleep, but neither contacts nor moves.
            cp_s.frame=3;cp_s.vx=cp_s.parameter == 0 ? $80 : -$80;
            cp_s.vy=0;cp_s.requested=3;
        }
        return;
    }
    cp_s.frame=1+(floor(cp_s.tick/4) mod 3);cp_s.tick++;
    if (cp_s.asleep) return;
    if (cp_have) chaos_m3_contact24(cp_s,cp_c);
    chaos_m3_move(cp_s);cp_s.vy=SCR_cc_s16(cp_s.vy+$10);
    if ((chaos_m3_terrain(chaos_m3_x(cp_s),chaos_m3_y(cp_s)+18)&$C0) == 0) return;
    chaos_m3_consume(cp_b,cp_s.token);
    if (!cp_b.score_disabled) cp_b.score+=10;
    cp_s.token=0;cp_s.type=$0F;cp_s.state=0;cp_s.requested=0;
    cp_s.age=0;cp_s.asleep=false;cp_s.woken=false;cp_s.converted=true;
    // Saved frame survives this conversion pass. Shared $0F starts next pass.
}
function chaos_m3_burst(cp_b,cp_s) {
    var cp_dx=[4,0,-4],cp_dy=[0,-2,-4];
    for (var cp_n=1;cp_n<=3;cp_n++) {
        var cp_i=chaos_object_free_slot(cp_b.slots,7,18);
        if (cp_i < 0) continue; // $5EE1 carry: silently skip this spawn command
        var cp_k=chaos_m3_slot($2E,cp_n,chaos_m3_x(cp_s)+cp_dx[cp_n-1],chaos_m3_y(cp_s)+cp_dy[cp_n-1],0);
        cp_k.aux0=cp_s.aux0;cp_k.aux1=cp_s.aux1;
        cp_b.slots[cp_i]=cp_k;
        array_push(cp_b.spawns,[cp_b.passes,cp_i,cp_n,chaos_m3_x(cp_k),chaos_m3_y(cp_k)]);
    }
}
function chaos_m3_step2e(cp_b,cp_s,cp_c,cp_have) {
    if (cp_s.state != cp_s.requested) { cp_s.state=cp_s.requested;cp_s.tick=0; }
    if (cp_s.state == 0) {
        cp_s.frame=0;
        if (cp_s.parameter == 0) { cp_s.keep=true;cp_s.requested=1; }
        else {
            cp_s.vx=(cp_have && (cp_c.player_flags&16) != 0 ? 1 : -1)*(160+16*cp_s.parameter);
            cp_s.vy=-$100;cp_s.requested=3;
        }
        return;
    }
    if (cp_s.state == 3) {
        cp_s.frame=1+min(2,floor(cp_s.tick/4));
        if (cp_s.tick >= 12) { cp_s.type=$FE;return; }
        cp_s.tick++;chaos_m3_move(cp_s);cp_s.vy=SCR_cc_s16(cp_s.vy+$10);return;
    }
    if (cp_s.state == 2) {
        if (cp_s.tick < 4) { cp_s.frame=4;cp_s.tick++;return; }
        chaos_m3_burst(cp_b,cp_s);
        cp_s.state=1;cp_s.requested=1;cp_s.tick=0;
    }
    cp_s.frame=0;
    if (cp_have && chaos_m3_strip(cp_s,cp_c)) { cp_s.xu=floor(cp_c.xu/256)*256;cp_s.requested=2; }
}
/// Creation/wake uses the existing EDGE bands. Only $2E pins width to 256:
/// invisible keep-alive parents must not be force-created on a wide right approach.
function chaos_m3_entry_view(cp_vp,cp_type) {
    if (cp_type == $2E) return chaos_vp_new(cp_vp.left,cp_vp.top,256,cp_vp.h);
    return cp_vp;
}
function chaos_m3_scan(cp_b,cp_vp) {
    var cp_due=(cp_b.scan_tick mod 4) == 0;cp_b.scan_tick++;
    if (!cp_due) return;
    for (var cp_i=0;cp_i<array_length(cp_b.records);cp_i++) {
        var cp_rec=cp_b.records[cp_i],cp_r=cp_rec.row;
        if (cp_rec.occupied || cp_rec.consumed) continue;
        var cp_cell=SCR_chaos_spawn_cell(chaos_m3_entry_view(cp_vp,cp_r[3]),cp_r[1],cp_r[2]);
        if (!(cp_cell == 2 || (cp_cell < 2 && cp_b.initial))) continue;
        var cp_slot=chaos_object_free_slot(cp_b.slots,7,18);
        if (cp_slot < 0) continue;
        var cp_s=chaos_m3_slot(cp_r[3],cp_r[5],cp_r[1],cp_r[2],cp_r[0]);
        cp_s.aux0=cp_r[6];cp_s.aux1=cp_r[7];
        cp_s.external=cp_r[3] != $24 && cp_r[3] != $2E;cp_s.ref=cp_rec.ref;
        if (cp_r[3] == $56) cp_s=chaos_56_slot($56,cp_r[5],cp_r[1],cp_r[2],cp_r[0]); // MGHZ3 boss: script-driven slot (SCR_chaos_mghz_boss)
        cp_b.slots[cp_slot]=cp_s;cp_rec.occupied=true;
    }
    cp_b.initial=false;
}
function chaos_m3_release(cp_b,cp_s) {
    for (var cp_i=0;cp_i<array_length(cp_b.records);cp_i++)
        if (cp_b.records[cp_i].row[0] == cp_s.token) cp_b.records[cp_i].occupied=false;
}
function chaos_m3_phase(cp_b,cp_c,cp_have,cp_vp) {
    chaos_m3_scan(cp_b,cp_vp);cp_b.passes++;
    for (var cp_i=7;cp_i<18;cp_i++) {
        var cp_s=cp_b.slots[cp_i];
        if (cp_s.type == 0) continue;
        if (cp_s.boss) continue; // $56/$57/$58 and their $12/$34/$0A/$0F support run in chaos_56_tick
        if (cp_s.type == $FE) { cp_s.type=$FF;cp_s.state=0;continue; }
        if (cp_s.type == $FF) { chaos_m3_release(cp_b,cp_s);cp_b.slots[cp_i]=chaos_m3_slot(0,0,0,0,0);continue; }
        if (cp_s.external) {
            if (cp_s.ring_ref != noone) {
                if (!cp_s.ring_ref.alive) cp_s.type=$FF;
                continue;
            }
            // Occupancy only: accepted gameplay events still own these objects.
            if (cp_s.ref != noone) {
                if (!instance_exists(cp_s.ref)) { chaos_m3_consume(cp_b,cp_s.token);cp_s.type=$FE;continue; }
                cp_s.xu=round(cp_s.ref.x*256);cp_s.yu=round(cp_s.ref.y*256);
                if (variable_instance_exists(cp_s.ref,"chaosConsumed") && cp_s.ref.chaosConsumed) {
                    chaos_m3_consume(cp_b,cp_s.token);
                    continue; // its accepted replacement presentation still owns this slot
                }
                if (variable_instance_exists(cp_s.ref,"chaosLive") && !cp_s.ref.chaosLive) { cp_s.type=$FE;continue; }
                if (variable_instance_exists(cp_s.ref,"chaosActive") && !cp_s.ref.chaosActive) { cp_s.type=$FE;continue; }
            }
            if (SCR_chaos_spawn_cell(cp_vp,chaos_m3_x(cp_s),chaos_m3_y(cp_s)) == 3) cp_s.type=$FE;
            continue;
        }
        var cp_init=cp_s.state == 0 && cp_s.requested == 0;
        if (cp_s.type == $24) chaos_m3_step24(cp_b,cp_s,cp_c,cp_have);
        else if (cp_s.type == $2E) chaos_m3_step2e(cp_b,cp_s,cp_c,cp_have);
        else if (cp_s.type == $0F) {
            // Same accepted $0F frames/art as M2, with its init blank pass.
            if (cp_s.age == 0) cp_s.frame=0;
            else {
                var cp_frames=chaos_gpz_smoke_frames();
                cp_s.frame=cp_frames[min(cp_s.age-1,array_length(cp_frames)-1)];
                if (cp_s.age == 1) global.chaosLastSoundRequest=$C4;
                if (cp_s.age >= array_length(cp_frames)) cp_s.type=$FF;
            }
            cp_s.age++;
        }
        if (cp_init || cp_s.converted || cp_s.type >= $F0) continue;
        var cp_cell=chaos_vp_retained_cell(cp_vp,chaos_m3_x(cp_s),chaos_m3_y(cp_s),!cp_s.asleep,cp_s.woken);
        if (cp_s.type == $2E) cp_cell=SCR_chaos_spawn_cell(chaos_m3_entry_view(cp_vp,$2E),chaos_m3_x(cp_s),chaos_m3_y(cp_s));
        if (cp_cell <= 1) cp_s.woken=true;
        cp_s.asleep=cp_cell >= 2;
        if (cp_cell == 3 && !cp_s.keep) cp_s.type=cp_s.token == 0 ? $FF : $FE;
    }
}
function chaos_m3_runtime_phase(cp_c,cp_have) {
    if (!chaos_is_mghz() || !variable_global_exists("chaosM3")) return;
    var cp_b=global.chaosM3,cp_score=cp_b.score;
    // Preserve the accepted ring simulation. Its live rings reserve shared
    // object slots before the M3 burst, including the overlapping 7..15 range.
    var cp_rings=chaos_lr_list();
    for (var cp_n=0;cp_n<array_length(cp_rings);cp_n++) {
        var cp_lr=cp_rings[cp_n],cp_found=false;
        for (var cp_i=0;cp_i<19;cp_i++) if (cp_b.slots[cp_i].ring_ref == cp_lr) cp_found=true;
        if (cp_found || !cp_lr.alive) continue;
        var cp_slot=chaos_object_free_slot(cp_b.slots,0,16);
        if (cp_slot < 0) continue;
        var cp_s=chaos_m3_slot($06,0,0,0,0);cp_s.external=true;cp_s.ring_ref=cp_lr;
        cp_b.slots[cp_slot]=cp_s;
    }
    // Slots 0..6 are not in the script allocator, but ring occupancy must clear.
    for (var cp_i=0;cp_i<7;cp_i++) {
        var cp_s=cp_b.slots[cp_i];
        if (cp_s.ring_ref != noone && !cp_s.ring_ref.alive) cp_b.slots[cp_i]=chaos_m3_slot(0,0,0,0,0);
    }
    chaos_m3_phase(cp_b,cp_c,cp_have,chaos_vp_current());
    if (cp_b.score != cp_score) {
        SCR_chaos_enemy_score_100_bytes();
        score+=cp_b.score-cp_score; // existing GameMaker score counter
    }
}
function chaos_m3_draw() {
    if (!chaos_is_mghz() || !variable_global_exists("chaosM3")) return;
    for (var cp_i=7;cp_i<18;cp_i++) {
        var cp_s=global.chaosM3.slots[cp_i];
        if (cp_s.external || cp_s.boss || cp_s.frame == 0 || cp_s.type >= $F0 || cp_s.type == 0) continue;   // boss script slots are drawn by chaos_56_draw
        if (cp_s.type == $24 && cp_s.asleep) continue;
        if (cp_s.type == $0F && !cp_s.converted) continue;
        if (cp_s.type == $0F && cp_s.age == 0) draw_sprite(SPR_chaos_mghz_object_24,cp_s.frame,chaos_m3_x(cp_s),chaos_m3_y(cp_s));
        else if (cp_s.type == $0F) draw_sprite(SPR_chaos_mghz_poof,cp_s.frame-7,chaos_m3_x(cp_s),chaos_m3_y(cp_s));
        else draw_sprite(cp_s.type == $24 ? SPR_chaos_mghz_object_24 : SPR_chaos_mghz_object_2E,cp_s.frame,chaos_m3_x(cp_s),chaos_m3_y(cp_s));
    }
}
