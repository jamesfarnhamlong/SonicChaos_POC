// THZ3 type $50. Numeric constants are generated from the mirrored Research manifest.
// The model uses 8.8 X and canonical WORLD anchors. Camera and sprite presentation are separate adapters.
function chaos_boss_new() {
    return {state:-1, xu:CHAOS_BOSS_WORLD_X*256, y:CHAOS_BOSS_WORLD_Y, vx:0,
        age:0, state_age:0, hp:CHAOS_BOSS_HP, phase:0, reaction:0, cooldown:0,
        hud_age:0, camera_mode:0, camera_min:0, camera_right:0, camera_x:0, camera_y:0,
        defeat_age:0, puff_index:0, frame:0, saved_frame:0, mirrored:false, flash:0, converted:false, converted_age:0,
        start_clear:false, spawn_puff:-1, spawn_poof:false};
}
function chaos_boss_x(cp_b) { return floor(cp_b.xu/256); }
// The ROM's shared registration places the composed mapping 18 px below the stored world anchor.
// Gameplay contact continues to use cp_b.y, never this presentation coordinate.
function chaos_boss_draw_y(cp_b) { return cp_b.y+CHAOS_BOSS_DRAW_Y_OFFSET; }
function chaos_boss_creation_band(cp_vp, cp_x) {
    var cp_out = cp_x-chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,0);
    return cp_out >= CHAOS_BOSS_CREATE_MIN_OUT && cp_out <= CHAOS_BOSS_CREATE_MAX_OUT;
}
function chaos_boss_trigger(cp_b, cp_px, cp_py) {
    return chaos_vp_dist_lt(cp_px,CHAOS_BOSS_WORLD_X,CHAOS_BOSS_TRIGGER_X)
        && chaos_vp_dist_lt(cp_py,CHAOS_BOSS_WORLD_Y,CHAOS_BOSS_TRIGGER_Y);
}
// GameMaker widescreen boss-arena adapter. At 256 px these are exact ROM-derived
// WORLD limits; wider views extend only the arena/patrol right edges.
function chaos_boss_arena_extra(cp_view_w) { return max(0,cp_view_w-CHAOS_VP_SMS_W); }
function chaos_boss_patrol_right(cp_view_w) {
    var cp_extra=chaos_boss_arena_extra(cp_view_w);
    if (cp_extra == 0) return CHAOS_BOSS_PATROL_RIGHT;
    // $6328 closed contact reach: boss 20 + player 8 = 28 px.
    return max(CHAOS_BOSS_PATROL_RIGHT+cp_extra,
        CHAOS_BOSS_ARENA_RIGHT+cp_extra-(CHAOS_BOSS_EXT_X+CHAOS_BOSS_PLAYER_EXT_X));
}
function chaos_boss_clamp(cp_xu, cp_vx, cp_view_w) {
    var cp_min = CHAOS_BOSS_ARENA_LEFT*256;
    var cp_max = (CHAOS_BOSS_ARENA_RIGHT+chaos_boss_arena_extra(cp_view_w))*256;
    if (cp_xu < cp_min) return {xu:cp_min,vx:cp_vx < 0 ? 0 : cp_vx};
    if (cp_xu > cp_max) return {xu:cp_max,vx:cp_vx > 0 ? 0 : cp_vx};
    return {xu:cp_xu,vx:cp_vx};
}
function chaos_boss_contact_bits(cp_b, cp_c) {
    return SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_boss_x(cp_b),cp_b.y,
        CHAOS_BOSS_PLAYER_EXT_X,CHAOS_BOSS_PLAYER_EXT_Y,CHAOS_BOSS_EXT_X,CHAOS_BOSS_EXT_Y);
}
function chaos_boss_set_state(cp_b, cp_state) { cp_b.state=cp_state; cp_b.state_age=0; }
function chaos_boss_move(cp_b) { cp_b.xu += cp_b.vx; }
// Result: 0 none, 1 non-attack damage request, 2 top bounce, 3 valid hit, 4 eighth hit.
function chaos_boss_contact(cp_b, cp_c, cp_can_hit) {
    if (cp_b.cooldown > 0) { cp_b.cooldown--; return 0; }
    var cp_bits = chaos_boss_contact_bits(cp_b,cp_c);
    if (cp_bits == 0) return 0;
    var cp_project = SCR_chaos_box_projection(cp_bits,floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_boss_x(cp_b),cp_b.y,
        CHAOS_BOSS_PLAYER_EXT_X,CHAOS_BOSS_PLAYER_EXT_Y,CHAOS_BOSS_EXT_X,CHAOS_BOSS_EXT_Y);
    cp_c.xu=cp_project[0]*256; cp_c.yu=cp_project[1]*256;
    if (cp_bits == 1 && cp_can_hit) {
        if (cp_c.vy < 0) return 0; // rising attack does not bounce
        cp_c.vy=-1024; cp_c.next=11; cp_c.move=(cp_c.move|1)&~2;
        cp_c.bg &= ~2; cp_c.contacts &= ~2;
        global.chaosLastSoundRequest=$A6;
        return 2;
    }
    // Unlike ordinary badniks, +$03 bit 7 bypasses the player's hurt bit 6.
    if (!chaos_attack_posture(cp_c)) {
        chaos_request_stage(cp_c);
        cp_b.cooldown=2;
        return 1;
    }
    if (cp_bits == 4) cp_c.vx=1536;
    else if (cp_bits == 8) cp_c.vx=-1536;
    if (cp_bits == 2) cp_c.vy=1536;
    else if (cp_bits == 1) cp_c.vy=-1024;
    else cp_c.vy=-cp_c.vy;
    cp_c.next=27; cp_c.move|=3; cp_c.bg &= ~2; cp_c.contacts &= ~2;
    global.chaosLastSoundRequest=$B6;
    if (!cp_can_hit) return 0;
    cp_b.hp--;
    cp_b.flash=4;
    return cp_b.hp == 0 ? 4 : 3;
}
function chaos_boss_reaction(cp_b, cp_top) {
    var cp_base=cp_b.state;
    cp_b.reaction=cp_base;
    chaos_boss_set_state(cp_b,cp_base+(cp_top ? 1 : 2));
}
// One object phase, after the player's movement. cp_vp is the live viewport before this update's camera step.
function chaos_boss_tick(cp_b, cp_vp, cp_c, cp_present) {
    cp_b.start_clear=false; cp_b.spawn_puff=-1; cp_b.spawn_poof=false;
    if (cp_b.state == CHAOS_BOSS_CONVERTED) { cp_b.converted_age++; return; } // GameMaker camera/emitter adapter after ROM slot conversion
    if (cp_b.state == -1) {
        if (!chaos_boss_creation_band(cp_vp,CHAOS_BOSS_WORLD_X)) return;
        chaos_boss_set_state(cp_b,0);
    }
    cp_b.age++; cp_b.state_age++;
    if (cp_b.flash > 0) cp_b.flash--;
    if (cp_b.state >= 0 && cp_b.state <= 3) cp_b.hud_age++;
    if (cp_b.state == 0) {
        cp_b.camera_min=cp_vp.left; cp_b.camera_mode=1;
        chaos_boss_set_state(cp_b,1); return;
    }
    if (cp_b.state == 1) {
        cp_b.camera_min=max(cp_b.camera_min,cp_vp.left);
        if (cp_present && chaos_boss_trigger(cp_b,floor(cp_c.xu/256),floor(cp_c.yu/256))) {
            cp_b.camera_right=cp_vp.left; cp_b.camera_mode=2; chaos_boss_set_state(cp_b,2);
        }
        return;
    }
    if (cp_b.state == 2) {
        // Type $12 slides for 97 updates after state 0 created it; its disappearance gates state 3.
        if (cp_b.hud_age >= 98) { cp_b.camera_mode=3; cp_b.camera_x=cp_vp.left; cp_b.camera_y=cp_vp.top; chaos_boss_set_state(cp_b,3); }
        return;
    }
    if (cp_b.state == 3) {
        cp_b.vx=-128; cp_b.hp=CHAOS_BOSS_HP; cp_b.phase=0;
        chaos_boss_set_state(cp_b,18); return;
    }
    if (cp_b.state == 18) {
        chaos_boss_move(cp_b);
        if (cp_present) chaos_boss_contact(cp_b,cp_c,false);
        if (chaos_boss_x(cp_b)-cp_b.camera_x <= 223) chaos_boss_set_state(cp_b,6);
        cp_b.frame=1+(floor(cp_b.state_age/16) mod 2); return;
    }
    if (cp_b.state == 4) {
        if (cp_b.defeat_age < 5) cp_b.spawn_puff=cp_b.defeat_age;
        cp_b.frame=(cp_b.defeat_age mod 6) < 4 ? cp_b.saved_frame : 0;
        cp_b.defeat_age++;
        if (cp_b.defeat_age >= CHAOS_BOSS_DEFEAT_UPDATES) chaos_boss_set_state(cp_b,5);
        return;
    }
    if (cp_b.state == 5) {
        if (cp_present && (cp_c.contacts & 2) != 0) {
            cp_b.camera_mode=4; cp_b.converted=true; cp_b.start_clear=true; cp_b.spawn_poof=true;
            chaos_goal_request_state20(cp_c); chaos_boss_set_state(cp_b,CHAOS_BOSS_CONVERTED);
        }
        return;
    }
    if (cp_b.state >= 7 && cp_b.state <= 17 && (cp_b.state mod 3) != 0) {
        // Reaction families: 7/8, 10/11, 13/14, 16/17.
        if (cp_b.state == 7 || cp_b.state == 10 || cp_b.state == 13 || cp_b.state == 16) chaos_boss_move(cp_b);
        if (cp_b.state_age >= 20) {
            var cp_was_hit = cp_b.state == 8 || cp_b.state == 11 || cp_b.state == 14 || cp_b.state == 17;
            chaos_boss_set_state(cp_b,cp_b.reaction);
            if (cp_was_hit) { cp_b.vx=0; cp_b.phase=1; }
        }
        return;
    }
    if (!chaos_boss_vulnerable_state(cp_b.state)) return;
    if (cp_present) {
        var cp_result=chaos_boss_contact(cp_b,cp_c,true);
        if (cp_result == 2 || cp_result == 3) { chaos_boss_reaction(cp_b,cp_result == 2); return; }
        if (cp_result == 4) { cp_b.defeat_age=0; cp_b.saved_frame=cp_b.frame; chaos_boss_set_state(cp_b,4); return; }
    }
    if (cp_b.state == 6 || cp_b.state == 12) {
        var cp_left=cp_b.state == 6;
        if (cp_b.phase == 0 && (cp_left ? chaos_boss_x(cp_b)<CHAOS_BOSS_PATROL_LEFT : chaos_boss_x(cp_b)>=chaos_boss_patrol_right(cp_vp.w))) cp_b.phase=255;
        if (cp_b.phase == 255) {
            cp_b.vx += cp_left ? 4 : -4;
            if (cp_left ? cp_b.vx >= -8 : cp_b.vx < 0) { chaos_boss_set_state(cp_b,cp_left ? 9 : 15); }
        } else if (cp_b.phase == 1) {
            cp_b.vx += cp_left ? -4 : 4;
            if (cp_left ? cp_b.vx < -128 : cp_b.vx >= 128) cp_b.phase=0;
        }
        chaos_boss_move(cp_b);
    } else if (cp_b.state == 9) {
        cp_b.vx+=2; chaos_boss_move(cp_b);
        if (cp_b.vx >= 32) { cp_b.phase=1; chaos_boss_set_state(cp_b,12); cp_b.mirrored=true; }
    } else if (cp_b.state == 15) {
        cp_b.vx-=2; chaos_boss_move(cp_b);
        if (cp_b.vx < -32) { cp_b.phase=1; chaos_boss_set_state(cp_b,6); cp_b.mirrored=false; }
    }
    cp_b.frame=(cp_b.state == 9 || cp_b.state == 15) ? 5 : 1+(floor(cp_b.state_age/16) mod 2);
}

// $041F, used by the $0A parameter-0 child. Time is sampled at conversion while the timer keeps running.
// H is the 30-second time class; L is the BCD ring count minus BCD $11 with wrap.
function chaos_boss_bonus(cp_seconds, cp_rings) {
    var cp_h=max(0,9-floor(cp_seconds/30));
    var cp_l=((cp_rings-11) mod 100+100) mod 100;
    return {packed:(cp_h << 8) | (floor(cp_l/10)*16 + (cp_l mod 10)), steps:cp_h*100+cp_l};
}
function chaos_boss_effect(cp_type, cp_x, cp_y, cp_param, cp_life) {
    var cp_e=instance_create_depth(cp_x,cp_y,-21,OBJ_chaos_boss_effect);
    cp_e.chaosType=cp_type; cp_e.chaosParameter=cp_param; cp_e.chaosLife=cp_life;
    if (cp_type == $34) cp_e.sprite_index=SPR_chaos_boss_puff_34;
    else if (cp_type == $0A) cp_e.sprite_index=SPR_chaos_boss_sparkle_0A;
    else cp_e.sprite_index=SPR_chaos_boss_poof_0F;
    cp_e.image_speed=0; cp_e.visible=cp_type != $0A || cp_param != 0; return cp_e;
}
function chaos_boss_runtime_phase() {
    if (!chaos_is_thz3() || !instance_exists(OBJ_chaos_object_50)) return;
    var cp_inst=instance_find(OBJ_chaos_object_50,0);
    var cp_b=cp_inst.chaosBoss;
    var cp_p=instance_find(OBJ_player,0);
    var cp_present=instance_exists(cp_p) && variable_instance_exists(cp_p,"chaosCore");
    var cp_c=cp_present ? cp_p.chaosCore : noone;
    var cp_old_state=cp_b.state;
    chaos_boss_tick(cp_b,chaos_vp_current(),cp_c,cp_present);
    if (cp_b.converted) cp_inst.chaosType=cp_b.converted_age < 38 ? $0F : $FF;
    if (cp_old_state == -1 && cp_b.state == 1) global.chaosLastSoundRequest=$8C;
    if (cp_present && cp_old_state >= 6 && cp_old_state <= 18) SCR_chaos_core_publish(cp_p);
    var cp_mapping=chaos_boss_mapping(cp_b.state,cp_b.state_age);
    // State 3 requests 18 this update; frame 1 is loaded by state 18 on the next update.
    if (cp_old_state == 3 && cp_b.state == 18) cp_mapping={frame:0,mirrored:false};
    // State 4 callbacks restore the saved frame for four updates, then frame 0 for two.
    if (cp_b.state == 4) cp_mapping={frame:cp_b.frame,mirrored:cp_b.mirrored};
    cp_inst.x=cp_b.xu/256; cp_inst.y=chaos_boss_draw_y(cp_b);
    cp_inst.visible=cp_mapping.frame != 0;
    var cp_flash=cp_b.flash > 0 && cp_mapping.frame != 0;
    cp_inst.sprite_index=cp_mapping.mirrored
        ? (cp_flash ? SPR_chaos_boss_50_mirror_flash : SPR_chaos_boss_50_mirror)
        : (cp_flash ? SPR_chaos_boss_50_flash : SPR_chaos_boss_50);
    cp_inst.image_index=cp_mapping.frame-1;
    global.chaosHudSlide=cp_b.state == -1 ? 0 : -min(64, floor(cp_b.hud_age/2));
    if (cp_b.spawn_puff >= 0) {
        global.chaosLastSoundRequest=$C4;
        var cp_offs=chaos_boss_puff_offsets()[cp_b.spawn_puff];
        // $34's later random jitter is presentation only; the initial offsets are ROM-derived.
        chaos_boss_effect($34,chaos_boss_x(cp_b)+cp_offs[0],cp_b.y+cp_offs[1],4,chaos_boss_puff_lifetimes()[cp_b.spawn_puff]);
    }
    if (cp_b.start_clear && cp_present) {
        global.chaosFinishTime=global.minutes*60+global.seconds;
        global.chaosBossBonus=chaos_boss_bonus(global.chaosFinishTime,global.ring);
        global.chaosBossClearScore=global.ring*10+global.chaosBossBonus.steps+500;
        chaos_boss_effect($0A,0,0,0,-1); // type $0A parameter 0: persistent sparkle controller
        global.chaosLastSoundRequest=$97;
        if (cp_b.spawn_poof) chaos_boss_effect($0F,chaos_boss_x(cp_b),cp_b.y,0,38);
        SCR_chaos_core_publish(cp_p);
    }
}
function chaos_boss_camera_step() {
    if (!chaos_is_thz3() || !instance_exists(OBJ_chaos_object_50)) return;
    var cp_b=instance_find(OBJ_chaos_object_50,0).chaosBoss;
    if (cp_b.camera_mode == 0) return;
    var cp_vp=chaos_vp_current();
    var cp_x=cp_vp.left, cp_y=cp_vp.top;
    __view_set(e__VW.Object,0,noone);
    if (cp_b.camera_mode == 1) {
        // Follow Sonic while raising the left limit: no backscroll after boss creation.
        if (instance_exists(OBJ_player)) cp_x=max(cp_b.camera_min,min(room_width-cp_vp.w,round(instance_find(OBJ_player,0).x-cp_vp.w/2)));
        cp_b.camera_min=max(cp_b.camera_min,cp_x);
    } else if (cp_b.camera_mode == 2) cp_x=cp_b.camera_right;
    else if (cp_b.camera_mode == 3) {
        cp_x=cp_vp.left+sign(CHAOS_BOSS_CAMERA_X-cp_vp.left);
        cp_y=cp_vp.top+sign(CHAOS_BOSS_CAMERA_Y-cp_vp.top);
        cp_b.camera_x=cp_x; cp_b.camera_y=cp_y;
    } else if (cp_b.camera_mode == 4) {
        // Release to the shared state-$20 camera tail. The right limit is worldWidth-viewWidth.
        if (instance_exists(OBJ_player)) cp_x=clamp(round(instance_find(OBJ_player,0).x-cp_vp.w/2),cp_vp.left,room_width-cp_vp.w);
        cp_b.camera_min=cp_x;
    }
    __view_set(e__VW.XView,0,cp_x);
    __view_set(e__VW.YView,0,cp_y);
}
