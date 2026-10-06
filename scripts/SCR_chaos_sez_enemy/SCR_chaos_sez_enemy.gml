/// SEZ S4: mapped enemies type $20 (hopping walker) and type $23 (terrain-dependent leaper). Research 8b7fc8a, data/rom-cache/sez/enemies-20-23-runtime.json (mirrored at
/// POC_notes/rom-cache/sez/). Plain numbers and structs only (verification/verify_sez_s4.js executes this shipped code); one record per canonical placement row, no GameMaker
/// instance. Callbacks follow the ROM order: the player's whole pass first, then the object scheduler (SCR_chaos_objects_phase), then the shared contact promotion.
///
/// Engine model per active object update: age 1 = state-0 initialiser (no contact, no movement, visibility skipped); from age 2 the engine loads the requested state script
/// (animation record restarts), the callback runs, the animation advances, then visibility (generic lifetime) updates the sleep bit for the NEXT callback.
///   $20: walking (state 3) and hopping (state 4) callbacks return while the prior sleep bit is set; animation keeps running asleep.
///   $23: no sleep gate anywhere.
/// Natural creation after object pass N: N+1 state-0 initialiser; N+2 loads the active script ($20 still sees the creator's sleep bit and returns, visibility then clears it, so its
/// first movement/contact is N+3; $23 moves and tests contact at N+2).
/// Adapters (NOT ROM facts): the accepted post-wake horizontal retention (SCR_chaos_lifetime_cell); defeat smoke uses the accepted shared $0F object with the SEZ poof art.

function chaos_sez_enemy_new(cp_r) {
    return {index:cp_r[0],type:cp_r[3],param:cp_r[5],ox:cp_r[1],oy:cp_r[2],
        active:false,defeated:false,cooldown:0,
        chaosScanTick:0,chaosInitialFillDone:false,chaosWoken:false,chaosAsleep:true,
        x:cp_r[1],y:cp_r[2],xu:cp_r[1]*256,yu:cp_r[2]*256,vx:0,vy:0,timer:0,state:0,req:0,anim:0,frame:0,age:0,convDraw:0,convFrame:1,hits:0};
}
function chaos_sez_enemy_register(cp_r) {
    if (!variable_global_exists("chaosSezEnemies")) global.chaosSezEnemies=[];
    array_push(global.chaosSezEnemies,chaos_sez_enemy_new(cp_r));
}
/// Creation (placement scan hit): a fresh object at the canonical anchor, creator sleep bit set, state 0.
function chaos_sez_enemy_create(cp_e) {
    cp_e.x=cp_e.ox; cp_e.y=cp_e.oy; cp_e.xu=cp_e.ox*256; cp_e.yu=cp_e.oy*256;
    cp_e.vx=0; cp_e.vy=0; cp_e.timer=0; cp_e.state=0; cp_e.req=0; cp_e.anim=0; cp_e.frame=0; cp_e.age=0;
    cp_e.active=true; cp_e.chaosAsleep=true; cp_e.chaosWoken=false;
}
/// Animation records: the frame shown by the callback that runs `cp_n` callbacks after the state script loaded.
///   $20 state 3: 10 x frame 1, 10 x frame 2, repeating;  state 4: 4 x frame 1, 4 x frame 2, repeating
///   $23 state 1: frame 1;  state 2: 12 x frame 2, 4 x frame 1, 6 x frame 2, then the relaunch record (frame 1)
function chaos_sez_enemy_frame(cp_type,cp_state,cp_n) {
    if (cp_state == 0) return 0;
    if (cp_type == $20) return cp_state == 3 ? 1 + ((cp_n div 10) & 1) : 1 + ((cp_n div 4) & 1);
    if (cp_state == 1) return 1;
    if (cp_n < 12) return 2;
    if (cp_n < 16) return 1;
    if (cp_n < 22) return 2;
    return 1;
}
/// Frame-dependent contact extents (half-width, half-height): $20 frames 1/2 7x20; $23 frame 1 9x26, frame 2 7x20; frame 0 never tests contact.
function chaos_sez_enemy_extent(cp_type,cp_frame) {
    if (cp_frame == 0) return [0,0];
    if (cp_type == $23 && cp_frame == 1) return [9,26];
    return [7,20];
}
/// Shared $6328 -> $5F3D / next-update $48BC path. 0 none, 1 eligible overlap (no defeat), 2 defeat.
function chaos_sez_enemy_contact(cp_e,cp_c,cp_have) {
    if (!cp_have) return 0;
    var cp_ext=chaos_sez_enemy_extent(cp_e.type,cp_e.frame);
    return chaos_ordinary_enemy_resolve(cp_c,floor(cp_e.xu/256),floor(cp_e.yu/256),global.powerInv,cp_ext[0],cp_ext[1]);
}
/// $60FB: 8.8 speed added to the 16.8 anchor accumulator (fractions kept, no cap).
function chaos_sez_enemy_move(cp_e) {
    cp_e.xu=(cp_e.xu+cp_e.vx)&$FFFFFF; cp_e.yu=(cp_e.yu+cp_e.vy)&$FFFFFF;
    cp_e.x=floor(cp_e.xu/256); cp_e.y=floor(cp_e.yu/256);
}
/// $614E/$6136 flag-only landing gate: block header (plane 0) bit 6 or 7 at (X, Y+18). No profile test.
function chaos_sez_enemy_landing_flags(cp_x,cp_y) {
    return (SCR_cc_lookup(cp_x,cp_y+18,0).flags & $C0) != 0;
}
/// $70E7 object floor projection (the player's $6F61/$7056 sibling): same profile arithmetic, upper-cell correction and solid/one-way split, but the one-way
/// penetration limit is (Y speed high byte + 7) instead of the player's + 9 (Research: "one-way bit6 requires nonnegative Y speed and penetration below the high-speed-byte-plus-7
/// threshold"). Returns {grounded, yu}. The block flags of the sample are the object's "previous" flags.
function chaos_sez_enemy_project(cp_xu,cp_yu,cp_vy) {
    var cp_s=SCR_cc_lookup(floor(cp_xu/256),floor(cp_yu/256)+18,0);
    var cp_prev=cp_s.flags;
    if ((cp_prev & 192) == 0 || cp_vy < 0) return {grounded:false,yu:cp_yu};
    var cp_solid=(cp_prev & 128) != 0, cp_raw=cp_s.vertical, cp_y=cp_yu;
    if ((cp_solid && (cp_raw & 63) == 32) || (!cp_solid && (cp_raw & 63) == 0)) {
        if (cp_s.index >= (variable_global_exists("chaosMapWidth") ? global.chaosMapWidth : 128)) {
            var cp_above=SCR_cc_lookup(cp_s.ax,cp_s.ay-32,0);
            var cp_upper=cp_above.vertical & 63;
            if ((cp_above.flags & 64) != 0) {
                if ((cp_above.flags & 31) != 9 && cp_upper != 0) cp_raw=cp_upper+32;
            } else if ((cp_above.flags & 128) != 0) cp_y=(cp_y-cp_upper*256) & 16777215;
        }
    }
    var cp_value=cp_raw;
    if (cp_solid) {
        if ((cp_raw & 64) != 0 && (cp_prev & 31) == 28) cp_value=32;
        cp_value=cp_value & 63;
    }
    var cp_total=(cp_value+(cp_s.ay & 31)) & 255;
    if (cp_total >= 32 && (cp_solid || cp_total-32 < (((cp_vy >> 8)+7) & 255))) return {grounded:true,yu:(cp_y-(cp_total-32)*256) & 16777215};
    return {grounded:false,yu:cp_y};
}
/// $77CB object floor: shared projection, then the surface-$0E handler $7836 (block $F0: X -= 256, other blocks X += 256 when the projection set the floor flag). Velocities untouched.
function chaos_sez_enemy_floor(cp_e) {
    var cp_s=SCR_cc_lookup(floor(cp_e.xu/256),floor(cp_e.yu/256)+18,0);
    var cp_f=chaos_sez_enemy_project(cp_e.xu,cp_e.yu,cp_e.vy);
    cp_e.yu=cp_f.yu; cp_e.y=floor(cp_e.yu/256);
    if (cp_f.grounded && (cp_s.flags & 31) == 14) {
        cp_e.xu=(cp_e.xu+(cp_s.tile == $F0 ? -65536 : 65536))&$FFFFFF; cp_e.x=floor(cp_e.xu/256);
    }
    return cp_f.grounded;
}
/// $20 walking-callback terrain probe: block id at (X-4, Y+10) while moving left, (X+4, Y+10) otherwise; $47/$F6/$F7 request the hop.
function chaos_sez_enemy_hop_block(cp_e) {
    var cp_px=floor(cp_e.xu/256)+(cp_e.vx < 0 ? -4 : 4), cp_py=floor(cp_e.yu/256)+10;
    var cp_t=SCR_cc_lookup(cp_px,cp_py,0).tile;
    return cp_t == $47 || cp_t == $F6 || cp_t == $F7;
}
/// Ordinary defeat: immediate conversion to type $0F (+10, BCD 10 00 00), placement occupancy retained (never recreated), token released from the object. The inherited last frame is
/// drawn once for the conversion update (bit4 cleared, i.e. unmirrored for $20), then the shared smoke object runs.
function chaos_sez_enemy_defeat(cp_e) {
    SCR_chaos_enemy_score_100_bytes();
    score+=10;
    cp_e.defeated=true; cp_e.active=false; cp_e.convDraw=1; cp_e.convFrame=max(1,cp_e.frame);
    var cp_smoke=instance_create(cp_e.x,cp_e.y,OBJ_chaos_gpz_smoke_0F);
    cp_smoke.chaosPlacementToken=0; cp_smoke.sprite_index=SPR_chaos_sez_poof;
    cp_e.hits++;
}
/// Handle a contact result inside a callback. Returns true when the callback must end (any eligible overlap ends it, defeated or not).
function chaos_sez_enemy_contact_end(cp_e,cp_hit) {
    if (cp_hit == 0) return false;
    if (cp_hit == 2) chaos_sez_enemy_defeat(cp_e);
    return true;
}
function chaos_sez_enemy_callback20(cp_e,cp_c,cp_have) {
    if (cp_e.state == 3) {
        if (cp_e.chaosAsleep) return;
        if (chaos_sez_enemy_contact_end(cp_e,chaos_sez_enemy_contact(cp_e,cp_c,cp_have))) return;
        cp_e.timer=(cp_e.timer-1)&255;
        if (cp_e.timer == 0 || chaos_sez_enemy_hop_block(cp_e)) { cp_e.req=4; cp_e.vy=-768; return; }
        chaos_sez_enemy_move(cp_e);
        chaos_sez_enemy_floor(cp_e);
    } else if (cp_e.state == 4) {
        if (cp_e.chaosAsleep) return;
        chaos_sez_enemy_move(cp_e);
        if (chaos_sez_enemy_contact_end(cp_e,chaos_sez_enemy_contact(cp_e,cp_c,cp_have))) return;
        cp_e.vy=SCR_cc_s16(cp_e.vy+32);
        if (cp_e.vy < 0) return;
        if (chaos_sez_enemy_landing_flags(cp_e.x,cp_e.y)) { cp_e.req=3; cp_e.vy=512; cp_e.timer=128; }
    }
}
function chaos_sez_enemy_callback23(cp_e,cp_c,cp_have) {
    if (cp_e.state == 1) {
        if (chaos_sez_enemy_contact_end(cp_e,chaos_sez_enemy_contact(cp_e,cp_c,cp_have))) return;
        chaos_sez_enemy_move(cp_e);
        cp_e.vy=SCR_cc_s16(cp_e.vy+16);
        if (cp_e.vy < 0) return;
        if (chaos_sez_enemy_landing_flags(cp_e.x,cp_e.y)) { cp_e.req=2; cp_e.timer=64; chaos_sez_enemy_floor(cp_e); }   // +$1E := $40 (never read again)
    } else if (cp_e.state == 2) {
        if (cp_e.anim < 22) { chaos_sez_enemy_contact_end(cp_e,chaos_sez_enemy_contact(cp_e,cp_c,cp_have)); return; }
        cp_e.vx=-256; cp_e.vy=-512; cp_e.req=1;           // $B3FD relaunch: no contact, no movement
    }
}
/// One scheduler visit of an active enemy.
function chaos_sez_enemy_step(cp_e,cp_c,cp_have,cp_vp) {
    cp_e.age++;
    if (cp_e.age == 1) {                                   // state-0 initialiser ($B100 / $B3FD): no contact, no movement, visibility skipped
        if (cp_e.type == $20) { cp_e.vx=-128; cp_e.vy=512; cp_e.timer=128; cp_e.req=3; }
        else { cp_e.vx=-256; cp_e.vy=-512; cp_e.req=1; }
        return;
    }
    if (cp_e.req != cp_e.state) { cp_e.state=cp_e.req; cp_e.anim=0; }
    cp_e.frame=chaos_sez_enemy_frame(cp_e.type,cp_e.state,cp_e.anim);
    if (cp_e.type == $20) chaos_sez_enemy_callback20(cp_e,cp_c,cp_have);
    else chaos_sez_enemy_callback23(cp_e,cp_c,cp_have);
    if (cp_e.defeated) return;
    cp_e.anim++;
    // Generic lifetime after the callback (accepted widescreen retention keeps vertical bands canonical). Outside the lifetime the object is removed; its occupancy is released two passes later.
    var cp_cell=SCR_chaos_lifetime_cell(cp_e,cp_vp,cp_e.x,cp_e.y);
    if (cp_cell == 3) { cp_e.active=false; cp_e.cooldown=2; cp_e.chaosAsleep=true; return; }
    cp_e.chaosAsleep=cp_cell >= 2;
}
/// Object phase for every SEZ enemy record (rows ascending = slot order approximation). cp_c / cp_have: the player's core.
function chaos_sez_enemy_phase(cp_c,cp_have) {
    if (!chaos_is_sez() || !variable_global_exists("chaosSezEnemies")) return;
    var cp_vp=chaos_vp_current(), cp_list=global.chaosSezEnemies;
    for (var cp_i=0;cp_i<array_length(cp_list);cp_i++) {
        var cp_e=cp_list[cp_i];
        if (cp_e.defeated) continue;
        if (!cp_e.active) {
            if (cp_e.cooldown > 0) { cp_e.cooldown--; continue; }
            if (SCR_chaos_placement_scan(cp_e,cp_vp,cp_e.ox,cp_e.oy)) chaos_sez_enemy_create(cp_e);
            continue;
        }
        chaos_sez_enemy_step(cp_e,cp_c,cp_have,cp_vp);
    }
}
function chaos_sez_enemy_draw() {
    if (!chaos_is_sez() || !variable_global_exists("chaosSezEnemies")) return;
    var cp_list=global.chaosSezEnemies;
    for (var cp_i=0;cp_i<array_length(cp_list);cp_i++) {
        var cp_e=cp_list[cp_i];
        if (cp_e.convDraw > 0) {
            cp_e.convDraw=0;
            draw_sprite(cp_e.type == $20 ? SPR_chaos_sez_enemy_20_conv : SPR_chaos_sez_enemy_23,cp_e.convFrame-1,cp_e.x,cp_e.y);
            continue;
        }
        if (!cp_e.active || cp_e.chaosAsleep || cp_e.frame == 0) continue;
        draw_sprite(cp_e.type == $20 ? SPR_chaos_sez_enemy_20 : SPR_chaos_sez_enemy_23,cp_e.frame-1,cp_e.x,cp_e.y);
    }
}
