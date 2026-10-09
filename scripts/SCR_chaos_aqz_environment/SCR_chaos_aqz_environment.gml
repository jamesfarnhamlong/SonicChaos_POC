/// AQZ A2 source-traced water/air scheduler. Integer fields mirror RAM, no wall clock.
/// Both controllers own publication. All creations are first-free, silent on failure.
/// Presentation and deterministic refresh phase are explicit GameMaker adapters.
function chaos_aqz_env_new(cp_act) {
    return {act:cp_act,line:cp_act < 3 ? 768 : 0,fine:0,coarse:0,calls:0,passes:0,
        enabled:0,raster:255,palette:0,requests:[0,0],camera_bottom:-1,death:false,
        d12f:0,d2e2:0,refresh:0,sound:0,spawns:[],publications:[],emitters:[],
        effect5_tick:0,effect5_image:0,effect11_tick:0,effect11_image:0};
}
function chaos_aqz_slot(cp_type,cp_param,cp_x,cp_y,cp_token) {
    var cp_s=chaos_s2_slot();
    cp_s.aqz=true;cp_s.trace_slot=-1;cp_s.type=cp_type;cp_s.parameter=cp_param;cp_s.token=cp_token;
    cp_s.x=cp_x;cp_s.y=cp_y;cp_s.xu=cp_x*256;cp_s.yu=cp_y*256;
    cp_s.vx=0;cp_s.vy=0;cp_s.state=0;cp_s.requested=0;cp_s.pc=0;cp_s.timer=0;
    cp_s.callback=0;cp_s.ex=0;cp_s.ey=0;cp_s.keep=false;cp_s.hidden=false;cp_s.strip=0;
    return cp_s;
}
function chaos_aqz_alloc(cp_e,cp_pool,cp_type,cp_param,cp_x,cp_y,cp_dynamic,cp_token) {
    var cp_i=chaos_object_free_slot(cp_pool.slots,cp_dynamic ? 7 : 0,cp_dynamic ? 18 : 16);
    if (cp_i < 0) return -1;
    cp_pool.slots[cp_i]=chaos_aqz_slot(cp_type,cp_param,cp_x,cp_y,cp_token);
    cp_pool.slots[cp_i].trace_slot=cp_i;
    chaos_aqz_trace("allocate",{slot:cp_i,type:cp_type,parameter:cp_param,x:cp_x,y:cp_y});
    array_push(cp_e.spawns,[cp_e.passes,cp_type,cp_param,cp_x,cp_y,cp_i]);
    return cp_i;
}
function chaos_aqz_create_water(cp_e,cp_pool) {
    if (cp_e.act >= 3) return;
    chaos_aqz_alloc(cp_e,cp_pool,$0D,0,0,0,false,0);
    chaos_aqz_alloc(cp_e,cp_pool,$0D,1,0,0,false,0);
    cp_e.line=768;
}
function chaos_aqz_cross(cp_e,cp_c,cp_pool) {
    var cp_prior=cp_c.water;
    cp_c.water=(floor(cp_c.yu/256)&65535) >= cp_e.line ? 255 : 0;
    chaos_player_trace("water_gate",{state:cp_c.state,next:cp_c.next,y:floor(cp_c.yu/256),line:cp_e.line,prior:cp_prior,water:cp_c.water,vx:cp_c.vx,high_signed:((cp_c.vx&65535)>>8)-(((cp_c.vx&65535)&32768) != 0 ? 256 : 0),vy:cp_c.vy,d503:cp_c.move,calls:cp_e.calls});
    if (!cp_c.water) return;
    if (!cp_prior) chaos_aqz_alloc(cp_e,cp_pool,$0E,0,0,0,false,0);
    // ABS of the SIGNED HIGH BYTE. E.g. -1023 ($FC01) qualifies; +1023 does not.
    var cp_hi=(cp_c.vx&65535)>>8;
    if ((cp_hi&128) != 0) cp_hi=256-cp_hi;
    var cp_gate=cp_c.vy >= 0 && (cp_c.move&2) != 0 && cp_hi >= 4;
    if (cp_gate) cp_c.vy=-768;
    chaos_player_trace("water_gate_result",{pass:cp_gate,vy:cp_c.vy,calls:cp_e.calls});
}
function chaos_aqz_water_update(cp_e,cp_c,cp_pool) {
    if (cp_e.act >= 3) return;
    cp_e.calls++;
    chaos_aqz_cross(cp_e,cp_c,cp_pool);
    if (!cp_c.water) { cp_e.coarse=0;return; }
    cp_e.fine=(cp_e.fine+1)&255;
    if (cp_e.fine < 120) return;
    cp_e.fine=0;
    if ((cp_e.refresh&4) == 0) chaos_aqz_alloc(cp_e,cp_pool,$0C,3,0,0,false,0);
    cp_e.coarse=(cp_e.coarse+1)&255;
    if (cp_e.coarse == 11) chaos_aqz_alloc(cp_e,cp_pool,$32,0,0,0,false,0);
    if (cp_e.coarse == 17) cp_c.next=$1F;
}
function chaos_aqz_raster(cp_e,cp_camera_y) {
    cp_e.requests=[0,0];
    var cp_delta=cp_e.line-cp_camera_y;
    if (cp_delta > 0 && cp_delta <= 192) { cp_e.enabled=255;cp_e.raster=cp_delta;return; }
    if (cp_e.enabled) {
        cp_e.requests=cp_delta <= 0 ? [48,49] : [25,10];
        cp_e.palette=cp_delta <= 0 ? 1 : 0;
        cp_e.raster=255;cp_e.enabled=0;
    }
}
function chaos_aqz_sound(cp_e,cp_sound) { cp_e.sound=cp_sound;global.chaosLastSoundRequest=cp_sound; }
function chaos_aqz_bubble_contact(cp_e,cp_s,cp_c,cp_have) {
    if (!cp_have || (cp_e.d12f&3) == 0) return false;
    var cp_dx=floor(cp_c.xu/256)-floor(cp_s.xu/256),cp_dy=(floor(cp_c.yu/256)&65535)-floor(cp_s.yu/256);
    var cp_ex=cp_c.state == $0F ? 9 : 8;
    if (abs(cp_dx) > cp_ex+cp_s.ex || cp_dy < -cp_s.ey || cp_dy > 24) return false;
    cp_c.next=$25;cp_s.type=$FE;return true;
}
function chaos_aqz_callback(cp_e,cp_pool,cp_s,cp_c,cp_have,cp_vp) {
    var cp_trace_reason="script_end";
    switch (cp_s.callback) {
        case $032F: break;
        case $0362: cp_s.type=$FF;break;
        case $9CF6:
            cp_s.vy=-192;cp_s.requested=cp_s.parameter+1;
            if (cp_s.parameter == 3) { cp_s.requested=2; if (cp_have) { cp_s.xu=cp_c.xu;cp_s.yu=(cp_c.yu-4096)&16777215; } }
            break;
        case $9D39:
            if (cp_s.asleep) { cp_trace_reason="asleep";cp_s.type=$FE;break; }
            if (chaos_aqz_bubble_contact(cp_e,cp_s,cp_c,cp_have)) { cp_trace_reason="large_air_contact";break; }
        case $9D50:
            if (cp_s.asleep || ((cp_e.d2e2&3) != 0 && floor(cp_s.yu/256)-cp_s.ey < cp_e.line)) { cp_trace_reason=cp_s.asleep ? "asleep" : "waterline";cp_s.type=$FE;break; }
            cp_s.vx=SCR_cc_s16(cp_s.vx+((cp_e.d12f&16) != 0 ? 4 : -4));
            cp_s.xu=(cp_s.xu+cp_s.vx)&16777215;cp_s.yu=(cp_s.yu+cp_s.vy)&16777215;
            break;
        case $9DAD:
            cp_s.yu=(cp_e.act == 1 ? 568 : 788)*256;cp_s.requested=1;cp_s.keep=true;break;
        case $9DDD:
            cp_s.strip=(cp_s.strip+1)&15;
            cp_s.xu=(cp_vp.left+chaos_aqz_strip_tables()[cp_s.parameter][cp_s.strip])*256;
            // Prepare against PREVIOUS D450, then publish. Sequential slot visits matter.
            chaos_aqz_raster(cp_e,cp_vp.top);
            array_push(cp_e.publications,[cp_e.passes,cp_s.parameter,cp_e.line,cp_e.raster]);
            cp_e.line=floor(cp_s.yu/256);break;
        case $9FAA:
            if (cp_have) cp_s.xu=cp_c.xu;
            cp_s.yu=cp_e.line*256;cp_s.requested=1;break;
        case $9500:
            if (cp_have) { cp_s.xu=cp_c.xu;cp_s.yu=(cp_c.yu-34*256)&16777215; }
            cp_s.keep=true;cp_s.requested=1;break;
        case $9527:
            cp_s.hidden=(cp_s.timer&4) != 0;
            if (cp_e.coarse == 0) { cp_s.type=$FF;break; }
            if (cp_have) { cp_s.xu=cp_c.xu;cp_s.yu=(cp_c.yu-40*256)&16777215; } break;
        case $9555:
            if (cp_have) { cp_c.next=$28;cp_c.move|=1;cp_c.player_flags=0;cp_c.vy=0;cp_c.input_delta=0;cp_c.bg&=~2;cp_c.contacts&=~2; }
            cp_e.camera_bottom=cp_vp.top;chaos_aqz_sound(cp_e,$96);cp_s.type=$FF;break;
    }
    cp_s.x=floor(cp_s.xu/256);cp_s.y=floor(cp_s.yu/256);
    if (cp_s.type >= $FE) chaos_aqz_trace("callback_delete",{slot:cp_s.trace_slot,reason:cp_trace_reason,callback:cp_s.callback,parameter:cp_s.parameter,x:cp_s.x,y:cp_s.y,asleep:cp_s.asleep,frame:cp_s.frame});
}
function chaos_aqz_visit(cp_e,cp_pool,cp_s,cp_c,cp_have,cp_vp) {
    if (cp_s.type == 0) return;
    if (cp_s.type == $0C) chaos_aqz_trace("bubble_visit",{slot:cp_s.trace_slot,parameter:cp_s.parameter,state:cp_s.state,x:cp_s.x,y:cp_s.y,asleep:cp_s.asleep,frame:cp_s.frame,type:cp_s.type});
    if (cp_s.type == $FE) { cp_s.type=$FF;return; }
    if (cp_s.type == $FF) { cp_s.type=0;cp_s.state=0;cp_s.requested=0;cp_s.frame=0;cp_s.timer=0;cp_s.pc=0;cp_s.callback=0;cp_s.token=0;cp_s.xu=0;cp_s.yu=0;cp_s.vx=0;cp_s.vy=0;cp_s.x=0;cp_s.y=0;cp_s.keep=false;cp_s.hidden=false;return; }
    if (cp_s.state != cp_s.requested || cp_s.timer == 0) {
        cp_s.state=cp_s.requested;cp_s.pc=0;cp_s.timer=0;
    } else cp_s.timer--;
    if (cp_s.timer == 0) {
        var cp_scripts=chaos_aqz_object_scripts();
        var cp_states=variable_struct_get(cp_scripts,string(cp_s.type));
        var cp_ops=cp_states[cp_s.state];
        var cp_record=false;
        while (!cp_record) {
            var cp_op=cp_ops[cp_s.pc];cp_s.pc++;
            switch (cp_op[0]) {
                case 0: cp_s.pc=0;break;
                case 7: cp_s.pc=cp_op[1];break;
                case 6: chaos_aqz_sound(cp_e,cp_op[1]);break;
                case 4: chaos_aqz_alloc(cp_e,cp_pool,cp_op[1],cp_op[2],floor(cp_s.xu/256)+cp_op[3],floor(cp_s.yu/256)+cp_op[4],true,0);break;
                case 1:
                    cp_s.timer=cp_op[1];cp_s.frame=cp_op[2];cp_s.callback=cp_op[3];
                    var cp_ext=variable_struct_get(variable_struct_get(chaos_aqz_object_extents(),string(cp_s.type)),string(cp_s.frame));
                    cp_s.ex=cp_ext[0];cp_s.ey=cp_ext[1];cp_record=true;break;
            }
        }
    }
    chaos_aqz_callback(cp_e,cp_pool,cp_s,cp_c,cp_have,cp_vp);
    if (cp_s.state == 0 || cp_s.type >= $FE) return;
    var cp_life=chaos_vp_lifecycle_cell(cp_vp,cp_s.x,cp_s.y);
    cp_s.asleep=cp_life >= 2;
    if (cp_life == 3 && !cp_s.keep) { chaos_aqz_trace("lifecycle_delete",{slot:cp_s.trace_slot,reason:"outside_lifetime_window",type:cp_s.type,parameter:cp_s.parameter,x:cp_s.x,y:cp_s.y,cell:cp_life});cp_s.type=$FF; }
}
function chaos_aqz_effect_step(cp_e,cp_boss) {
    cp_e.d12f=(cp_e.d12f+1)&255;cp_e.d2e2=(cp_e.d2e2+1)&255;
    // Refresh-register presentation approximation; never changes counter thresholds.
    cp_e.refresh=cp_e.d12f;
    if (!cp_boss) { cp_e.effect5_tick++; if ((cp_e.effect5_tick mod 3) == 0) cp_e.effect5_image=((cp_e.effect5_tick div 3) mod 2) == 1 ? 1 : 2; }
    cp_e.effect11_tick++;
    if ((cp_e.effect11_tick mod 8) == 0) cp_e.effect11_image=((cp_e.effect11_tick div 8)-1) mod 16+1;
}
function chaos_aqz_air_tick(cp_e,cp_c) {
    if (cp_c.state == $25) {
        if (!cp_c.air_active) { cp_c.air_active=true;cp_c.air_ticks=16;chaos_aqz_sound(cp_e,$AE); }
        cp_e.coarse=0;cp_c.air_ticks--;
        if (cp_c.air_ticks == 0) { cp_c.next=$0E;cp_c.air_active=false; }
        return;
    }
    if (cp_c.state == $28) {
        if ((floor(cp_c.yu/256)&65535)-cp_c.camera_y >= 216) cp_e.death=true;
        cp_c.vy=cp_e.death ? 4096 : 128;SCR_cc_y(cp_c);return;
    }
    // $1F entered directly by air updater; countdown alone owns the $28 tail.
    cp_c.move|=64;SCR_cc_y(cp_c);
}

function chaos_aqz_pass_begin() {
    var cp_e=global.chaosAqzEnv,cp_b=chaos_s2_state(),cp_vp=chaos_vp_current();
    cp_e.passes++;cp_e.sound=0;
}
function chaos_aqz_mapped_scan() {
    var cp_e=global.chaosAqzEnv,cp_b=chaos_s2_state(),cp_vp=chaos_vp_current();
    if ((cp_e.d2e2&3) != 0) return;
    for (var cp_i=0;cp_i<array_length(cp_e.emitters);cp_i++) {
        var cp_r=cp_e.emitters[cp_i];
        if (cp_r.occupied && cp_b.slots[cp_r.slot].type == 0) cp_r.occupied=false;
        var cp_scan_cell=SCR_chaos_spawn_cell(cp_vp,cp_r.record[1],cp_r.record[2]);
        chaos_aqz_trace("emitter_scan",{occupied:cp_r.occupied,scan_tick:cp_r.chaosScanTick,cell:cp_scan_cell,cameraX:cp_vp.left,cameraY:cp_vp.top,width:cp_vp.w});
        if (cp_r.occupied) continue;
        // The D2E2 gate above already owns the canonical fourth-update scan.
        // Do not pass through the independently throttled instance Step helper.
        var cp_fill=!cp_r.chaosInitialFillDone;
        cp_r.chaosInitialFillDone=true;cp_r.chaosScanTick++;
        if (!(cp_scan_cell == 2 || (cp_scan_cell < 2 && cp_fill))) continue;
        var cp_slot=chaos_aqz_alloc(cp_e,cp_b,$0C,0,cp_r.record[1],cp_r.record[2],true,cp_r.record[0]);
        if (cp_slot >= 0) { cp_r.slot=cp_slot;cp_r.occupied=true; }
    }
}
function chaos_aqz_draw() {
    if (!chaos_is_aqz()) return;
    var cp_pool=chaos_s2_state();
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=cp_pool.slots[cp_i];
        if (variable_struct_exists(cp_s,"aqz") && cp_s.aqz && cp_s.type == $0C && (cp_s.frame == 0 || cp_s.asleep || cp_s.hidden))
            chaos_aqz_trace("draw_skipped",{slot:cp_i,parameter:cp_s.parameter,state:cp_s.state,x:cp_s.x,y:cp_s.y,asleep:cp_s.asleep,frame:cp_s.frame,reason:cp_s.asleep ? "asleep" : (cp_s.hidden ? "hidden" : "frame_zero")});
        if (!variable_struct_exists(cp_s,"aqz") || !cp_s.aqz || cp_s.type == 0 || cp_s.type >= $FE || cp_s.frame == 0 || cp_s.asleep || cp_s.hidden) continue;
        var cp_sprite=noone;
        switch (cp_s.type) { case $0C:cp_sprite=SPR_chaos_aqz_bubble;break;case $0D:cp_sprite=SPR_chaos_aqz_waterline;break;case $0E:cp_sprite=SPR_chaos_aqz_splash;break;case $32:cp_sprite=SPR_chaos_aqz_countdown;break; }
        if (cp_sprite != noone) {
            chaos_aqz_trace("draw",{slot:cp_i,type:cp_s.type,parameter:cp_s.parameter,state:cp_s.state,x:cp_s.x,y:cp_s.y,asleep:cp_s.asleep,frame:cp_s.frame,sprite:sprite_get_name(cp_sprite)});
            if (cp_s.type == $0D) chaos_aqz_water_strip_draw(cp_sprite,cp_s.frame,cp_s.x,cp_s.y);
            else draw_sprite(cp_sprite,cp_s.frame,cp_s.x,cp_s.y);
        }
    }
}
/// GameMaker presentation adapter: repeat the canonical camera-relative 256px
/// strip period. The two original objects still own phase, frame and WORLD Y.
/// At 256px the draw call is exactly unchanged. Wider views include neighboring
/// periods whose sprite bounds overlap the viewport; clipping belongs to Draw.
/// The left neighbor preserves the one-pixel SAT registration overlap at a seam.
function chaos_aqz_water_strip_draw(cp_sprite,cp_frame,cp_x,cp_y) {
    draw_sprite(cp_sprite,cp_frame,cp_x,cp_y);
    var cp_vp=chaos_vp_current();
    if (cp_vp.w <= 256) return;
    var cp_left=sprite_get_xoffset(cp_sprite);
    var cp_right=sprite_get_width(cp_sprite)-cp_left;
    for (var cp_offset=-256;cp_offset<cp_vp.w+256;cp_offset+=256) {
        if (cp_offset == 0) continue;
        var cp_repeat_x=cp_x+cp_offset;
        if (cp_repeat_x-cp_left < cp_vp.left+cp_vp.w && cp_repeat_x+cp_right > cp_vp.left)
            draw_sprite(cp_sprite,cp_frame,cp_repeat_x,cp_y);
    }
}
function chaos_aqz_terrain_dynamic(cp_front) {
    var cp_cam=view_camera[0],cp_e=global.chaosAqzEnv;
    var cp_left=max(0,floor(camera_get_view_x(cp_cam)/32)),cp_top=max(0,floor(camera_get_view_y(cp_cam)/32));
    var cp_right=min(global.chaosMapWidth-1,floor((camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)-1)/32));
    var cp_bottom=min(room_height div 32-1,floor((camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam)-1)/32));
    for (var cp_row=cp_top;cp_row<=cp_bottom;cp_row++) for (var cp_col=cp_left;cp_col<=cp_right;cp_col++) {
        var cp_index=cp_row*global.chaosMapWidth+cp_col;
        if (cp_index >= 4095) continue;
        var cp_block=global.chaosTileIds[cp_index];
        if (cp_block >= 64 && cp_block <= 69) cp_block=70;
        var cp_sx=(cp_block mod 16)*32,cp_sy=(cp_block div 16)*32,cp_x=cp_col*32,cp_y=cp_row*32;
        if (!cp_front && (cp_block == 155 || cp_block == 156 || cp_block == 71 || cp_block == 175)) draw_sprite_part(SPR_chaos_aqz_blocks,0,cp_sx,cp_sy,32,32,cp_x,cp_y);
        draw_sprite_part(cp_front ? SPR_chaos_aqz_effect5_front : SPR_chaos_aqz_effect5,cp_e.effect5_image,cp_sx,cp_sy,32,32,cp_x,cp_y);
        draw_sprite_part(cp_front ? SPR_chaos_aqz_effect11_front : SPR_chaos_aqz_effect11,cp_e.effect11_image,cp_sx,cp_sy,32,32,cp_x,cp_y);
    }
}

/// Presentation adapter: R10 underflow represented by first lower-color row delta+1.
/// Enable domain stays original 192 lines even in a taller view. No gameplay coordinate changes.
/// Indexed AQZ art is exact. Legacy shared RGB player art uses nearest sprite-CRAM color.
function chaos_aqz_palette_begin(cp_surface_local) {
    if (!chaos_is_aqz() || !variable_global_exists("chaosAqzEnv")) return;
    var cp_e=global.chaosAqzEnv;
    if (!variable_struct_exists(cp_e,"colors")) {
        var cp_source=chaos_aqz_palette_sources();cp_e.colors=[];
        var cp_modes=[cp_source.above_water_cram,cp_source.split_irq_cram,cp_source.fully_submerged_cram];
        for (var cp_mode=0;cp_mode<3;cp_mode++) {
            var cp_rgb=[];
            for (var cp_i=0;cp_i<32;cp_i++) { var cp_cram=cp_modes[cp_mode][cp_i];array_push(cp_rgb,(cp_cram&3)/3,((cp_cram>>2)&3)/3,((cp_cram>>4)&3)/3); }
            array_push(cp_e.colors,cp_rgb);
        }
    }
    cp_e.filter=gpu_get_texfilter();gpu_set_texfilter(false);
    shader_set(SHD_chaos_aqz_palette);
    shader_set_uniform_f(shader_get_uniform(SHD_chaos_aqz_palette,"player_source"),0);
    shader_set_uniform_f_array(shader_get_uniform(SHD_chaos_aqz_palette,"above"),cp_e.colors[0]);
    shader_set_uniform_f_array(shader_get_uniform(SHD_chaos_aqz_palette,"split"),cp_e.colors[1]);
    shader_set_uniform_f_array(shader_get_uniform(SHD_chaos_aqz_palette,"submerged"),cp_e.colors[2]);
    shader_set_uniform_f(shader_get_uniform(SHD_chaos_aqz_palette,"screen_top"),cp_surface_local ? 0 : camera_get_view_y(view_camera[0]));
    shader_set_uniform_f(shader_get_uniform(SHD_chaos_aqz_palette,"irq_cut"),cp_e.raster+1);
    var cp_mode=cp_e.act == 3 ? 0 : (cp_e.enabled ? 2 : cp_e.palette);
    shader_set_uniform_f(shader_get_uniform(SHD_chaos_aqz_palette,"palette_mode"),cp_mode);
    chaos_aqz_trace("palette_draw",{cameraY:camera_get_view_y(view_camera[0]),world_line:cp_e.line,delta:cp_e.line-camera_get_view_y(view_camera[0]),enabled:cp_e.enabled,r10:cp_e.raster,split_row:cp_e.raster+1,mode:cp_mode,base_source:cp_mode == 1 ? "indexed_30_31" : "above",lower_source:cp_mode == 2 ? "fixed_irq" : "none",player_water:global.playerWater,surface_local:cp_surface_local});
}
function chaos_aqz_palette_end() {
    if (!chaos_is_aqz() || !variable_global_exists("chaosAqzEnv")) return;
    shader_reset();
    if (variable_struct_exists(global.chaosAqzEnv,"filter")) gpu_set_texfilter(global.chaosAqzEnv.filter);
}

/// ROM mapping origins are unchanged. Shared SMS renderer registration is
/// terrain-space +(1,18): R8 background +1, R9 +17 and SAT Y +1.
/// Research mapped-object-registration.json, shared_renderer; player slot D500.
/// Legacy artwork retains its engine registration. This function has no writes.
function chaos_player_draw_registration(cp_o) {
    if (chaos_player_rom_resource(cp_o.sprite_index) && variable_instance_exists(cp_o,"chaosCore"))
        return {x:floor(cp_o.chaosCore.xu/256)+1,y:floor(chaos_signed_yu(cp_o.chaosCore.yu)/256)+18};
    return {x:cp_o.x,y:cp_o.y};
}
/// Only immutable sprite textures enter this pass; its RGB result is never recycled.
function chaos_aqz_player_draw(cp_o) {
    var cp_draw=chaos_player_draw_registration(cp_o);
    if (variable_global_exists("chaosPlayerTrace") && global.chaosPlayerTrace) {
        var cp_c=cp_o.chaosCore;
        chaos_player_trace("draw",{core_x:cp_c.xu/256,core_y:chaos_signed_yu(cp_c.yu)/256,instance_x:cp_o.x,instance_y:cp_o.y,anchor_offset:cp_o.chaosAnchorOffset,state:cp_c.state,next:cp_c.next,d503:cp_c.move,d448:variable_struct_exists(cp_c,"d448") ? cp_c.d448 : -1,animation:variable_struct_exists(cp_c,"visual_anim") ? cp_c.visual_anim : {},sprite:sprite_get_name(cp_o.sprite_index),image_index:cp_o.image_index,width:sprite_get_width(cp_o.sprite_index),height:sprite_get_height(cp_o.sprite_index),origin_x:sprite_get_xoffset(cp_o.sprite_index),origin_y:sprite_get_yoffset(cp_o.sprite_index),mask:sprite_get_name(cp_o.mask_index),bbox:[cp_o.bbox_left,cp_o.bbox_top,cp_o.bbox_right,cp_o.bbox_bottom],draw_x:cp_draw.x,draw_y:cp_draw.y,manual_x:cp_draw.x-cp_o.x,manual_y:cp_draw.y-cp_o.y});
    }
    if (!chaos_is_aqz()) { draw_sprite_ext(cp_o.sprite_index,cp_o.image_index,cp_draw.x,cp_draw.y,cp_o.image_xscale,cp_o.image_yscale,cp_o.image_angle,cp_o.image_blend,cp_o.image_alpha);return; }
    chaos_aqz_palette_begin(false);
    var cp_base=chaos_aqz_player_source(cp_o.sprite_index);
    shader_set_uniform_f(shader_get_uniform(SHD_chaos_aqz_palette,"player_source"),cp_base == cp_o.sprite_index ? 0 : 1);
    draw_sprite_ext(cp_base,cp_o.image_index,cp_draw.x,cp_draw.y,cp_o.image_xscale,cp_o.image_yscale,cp_o.image_angle,cp_o.image_blend,cp_o.image_alpha);
    chaos_aqz_palette_end();
}

/// Opt-in live Windows trace. No behavior changes; F6 toggles during an AQZ act.
function chaos_aqz_trace(cp_event,cp_data) {
    if (!variable_global_exists("chaosAqzTrace") || !global.chaosAqzTrace) return;
    var cp_f=file_text_open_append("aqz-runtime-trace.jsonl");
    file_text_write_string(cp_f,json_stringify({event:cp_event,act:chaos_aqz_act(),pass:global.chaosAqzEnv.passes,data:cp_data}));
    file_text_writeln(cp_f);file_text_close(cp_f);
}

/// Opt-in F7 trace for Windows discrepancy reproduction; no gameplay writes.
function chaos_player_trace(cp_event,cp_data) {
    if (!variable_global_exists("chaosPlayerTrace") || !global.chaosPlayerTrace) return;
    var cp_f=file_text_open_append("player-runtime-trace.jsonl");
    file_text_write_string(cp_f,json_stringify({event:cp_event,data:cp_data}));
    file_text_writeln(cp_f);file_text_close(cp_f);
}
