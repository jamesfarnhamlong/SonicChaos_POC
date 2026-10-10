/// AQZ P4 numeric $59-$5D. Canonical 256 behavior; explicit wide route adapters.
/// Shared 19-slot scheduler; fixed D700 fields refer to pool slot7, never a parent pointer.
function chaos_59_slot(cp_type,cp_param,cp_x,cp_y,cp_token) {
    var cp_s=chaos_s2_slot();
    cp_s.type=cp_type; cp_s.parameter=cp_param; cp_s.boss=true;cp_s.boss59=true;
    cp_s.x=cp_x; cp_s.y=cp_y; cp_s.xu=cp_x*256; cp_s.yu=cp_y*256; cp_s.vx=0; cp_s.vy=0;
    cp_s.state=0; cp_s.requested=0; cp_s.frame=0; cp_s.asleep=false; cp_s.woken=true;
    cp_s.pc=0; cp_s.timer=0; cp_s.callback=0; cp_s.loop_count=0; cp_s.ex=0; cp_s.ey=0;
    cp_s.saved_x=cp_x; cp_s.saved_y=cp_y; cp_s.saved_frame=0;
    cp_s.flags3=0;cp_s.hp=0; cp_s.cooldown=0; cp_s.defeated=0; cp_s.drop=0; cp_s.counter=0;
    cp_s.hud=-1; cp_s.limit_right=0; cp_s.sx=0; cp_s.sy=0;
    cp_s.keep=false; cp_s.bit0=false; cp_s.token=cp_token; cp_s.src_type=0;
    cp_s.angle=0;cp_s.saved_request=0;cp_s.field23=0;cp_s.field24=0;cp_s.field34=0;cp_s.field35=0;cp_s.field38=0;cp_s.delay=0;cp_s.contact=0;cp_s.magnitude=128;
    cp_s.salvo_left=0;cp_s.salvo_gain=1;cp_s.salvo_target=0;cp_s.wide_entered=false;
    cp_s.wide_route=0;cp_s.wide_fire_x=0;cp_s.wide_body_x=0;
    cp_s.diag_record=0; // AQZ_DIAG_ONLY
    cp_s.view_dx=0; // Explicit viewport translation; canonical xu is never relocated.
    cp_s.remaining=0; cp_s.seed=0; cp_s.phase=0; cp_s.anim=0;
    return cp_s;
}
function chaos_59_new() {
    return {target_valid:false,target_xu:0,target_yu:0,target_tick:-1,active:false,created:false,tick:0,d12f:0,d2e2:0,random_byte:0,sound:0,sound_log:[],
        camera_mode:0,camera_left:0,camera_right:CHAOS_59_RIGHT_LIMIT,camera_bottom:CHAOS_59_BOTTOM_INITIAL,pan_x:0,pan_y:0,camera_x:0,camera_y:0,viewport_w:256,viewport_h:192,
        intro_dx:-1,intro_stable:0,intro_ready:false,fight_x:1727,fight_y:78,cam_lead:-1,frozen:false,camera_owned:false,last_view_valid:false,last_view_x:0,last_view_y:0,
        palette:0,selector:0,hud_y:32,hud_count:0,flash:[],flash_white:false,player_sx:0,
        clear:false,screen_pass:true,latch_clear:true,spawns:[],last_spawn:-1,hits:[],defeated_tick:-1,clear_tick:-1,
        record:[],occupied:false,consumed:false,slot:-1,chaosScanTick:0,chaosInitialFillDone:false,chaosWoken:false};
}
function chaos_59_register(cp_r) {
    global.chaosAqz59=chaos_59_new();
    global.chaosAqz59.record=cp_r;
}
function chaos_59_state() {
    if (!variable_global_exists("chaosAqz59") || chaos_aqz_act() != 3) return noone;
    return global.chaosAqz59;
}
function chaos_59_x(cp_s) { return floor(cp_s.xu/256) & $FFFF; }
function chaos_59_y(cp_s) { return floor(cp_s.yu/256) & $FFFF; }
/// P4 C adapters. WORLD anchors/scripts remain in their original coordinate space.
function chaos_59_view_x(cp_s) {
    return chaos_59_x(cp_s)+(variable_struct_exists(cp_s,"view_dx") ? cp_s.view_dx : 0);
}
function chaos_59_camera_bound(cp_world_w,cp_view_w) {return max(0,cp_world_w-cp_view_w);}
function chaos_59_viewport_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp) {
    chaos_59_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp);
    // WORLD2048 - settled camera1727 =321 = EDGE(RIGHT,+65) at256.
    if (cp_pc == $AC38 && cp_vp.w > 256) {
        // One fixed phase translation. Account for canonical movement during the
        // remaining 1px camera pan and a 16-update settled presentation pause.
        // No live child is ever rebased against a moving viewport edge.
        if (cp_b.intro_dx < 0) {
            var cp_wait=max(abs(cp_b.pan_x-1-cp_vp.left),abs(cp_b.pan_y-cp_vp.top))+16;
            cp_b.intro_dx=cp_vp.w-256+ceil(cp_wait/2);
        }
        cp_s.view_dx=cp_b.intro_dx;
    }
    if (cp_pc == $81BD && cp_b.clear && cp_vp.w > 256) {
        cp_b.camera_left=cp_b.fight_x; cp_b.camera_right=cp_b.fight_x;
    }
}
function chaos_59_s16(cp_v) { return ((cp_v+$8000)&$FFFF)-$8000; }
function chaos_59_sound(cp_b,cp_sound) { cp_b.sound=cp_sound; global.chaosLastSoundRequest=cp_sound; array_push(cp_b.sound_log,[cp_b.tick,cp_sound]); }
function chaos_59_move(cp_s) {
    cp_s.xu=(cp_s.xu+cp_s.vx+16777216) mod 16777216;
    cp_s.yu=(cp_s.yu+cp_s.vy+16777216) mod 16777216;
}
function chaos_59_diag_impl_alloc(cp_b,cp_pool,cp_type,cp_param,cp_x,cp_y,cp_dynamic) {
    var cp_free=cp_dynamic ? chaos_object_free_slot(cp_pool.slots,7,18) : chaos_object_free_slot(cp_pool.slots,0,16);
    cp_b.last_spawn=cp_free;
    if (cp_free < 0) return -1;
    cp_pool.slots[cp_free]=chaos_59_slot(cp_type,cp_param,cp_x,cp_y,0);
    array_push(cp_b.spawns,[cp_b.tick,cp_type,cp_param,cp_x,cp_y,cp_free]);
    return cp_free;
}
function chaos_59_left_limit(cp_b,cp_s,cp_vp) {
    if (cp_b.camera_left < cp_vp.left) cp_b.camera_left=cp_vp.left;
    cp_s.limit_right=cp_b.camera_right;
}
function chaos_59_target_x(cp_w) { return 1728; }

function chaos_59_trigger(cp_s,cp_c) { return abs(chaos_59_x(cp_s)-floor(cp_c.xu/256))<96 && abs(chaos_59_y(cp_s)-floor(cp_c.yu/256))<304; }

function chaos_59_bits(cp_s,cp_c) {
    if ((cp_c.move & 64) != 0) return 0;
    return SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_59_view_x(cp_s),chaos_59_y(cp_s),cp_c.state == $0F ? 9 : 8,24,cp_s.ex,cp_s.ey);
}
function chaos_59_project(cp_bits,cp_px,cp_py,cp_ox,cp_oy,cp_pex,cp_oex,cp_oey,cp_terrain,cp_vp) {
    var cp_x=cp_px,cp_y=cp_py;
    if (cp_bits == 1 && (cp_terrain & 1) == 0) cp_y=cp_oy-cp_oey;
    else if (cp_bits == 2 && (cp_terrain & 2) == 0) cp_y=cp_oy+24;
    else if (cp_bits == 8 && (cp_terrain & 8) == 0 && chaos_vp_edge(cp_vp,CHAOS_VP_LEFT,CHAOS_54_GUARD_LEFT) < cp_px) cp_x=cp_ox-cp_pex-cp_oex-1;
    else if (cp_bits == 4 && (cp_terrain & 4) == 0 && cp_px <= chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,CHAOS_54_GUARD_RIGHT)) cp_x=cp_ox+cp_pex+cp_oex+1;
    return [cp_x,cp_y];
}
function chaos_59_project_player(cp_s,cp_c,cp_bits,cp_vp) {
    var cp_pos=chaos_59_project(cp_bits,floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_59_view_x(cp_s),chaos_59_y(cp_s),cp_c.state == $0F ? 9 : 8,cp_s.ex,cp_s.ey,cp_c.bg & 15,cp_vp);
    cp_c.xu=cp_pos[0]*256+(cp_c.xu&255); cp_c.yu=cp_pos[1]*256+(cp_c.yu&255);
}
function chaos_59_reaction(cp_c,cp_bits) {
    if (cp_bits == 4) { cp_c.vx=1536; cp_c.vy=-cp_c.vy; }
    else if (cp_bits == 8) { cp_c.vx=-1536; cp_c.vy=-cp_c.vy; }
    else if (cp_bits == 2) cp_c.vy=1536;
    else cp_c.vy=-1024;
    cp_c.next=27;
}
function chaos_59_queue_flash(cp_b) {
    if (array_length(cp_b.flash) < CHAOS_54_FLASH_SLOTS) array_push(cp_b.flash,0);
}
function chaos_59_flash_step(cp_b) {
    var cp_keep=[];
    cp_b.flash_white=false;
    for (var cp_i=0;cp_i<array_length(cp_b.flash);cp_i++) {
        var cp_n=cp_b.flash[cp_i]+1;
        if (cp_n >= CHAOS_54_FLASH_FIRST && cp_n <= CHAOS_54_FLASH_LAST) cp_b.flash_white=true;
        if (cp_n < CHAOS_54_FLASH_END) array_push(cp_keep,cp_n);
    }
    cp_b.flash=cp_keep;
}
function chaos_59_diag_impl_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) {
    if (cp_s.angle != 0) { cp_s.requested=11;cp_s.vx=0;return 0; }
    if (cp_s.cooldown != 0) cp_s.cooldown=(cp_s.cooldown-1)&255;
    var cp_bits=0;
    if (cp_present) {
        cp_bits=chaos_59_bits(cp_s,cp_c);cp_s.contact=cp_bits;
        if (cp_bits != 0) {
            chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));chaos_59_project_player(cp_s,cp_c,cp_bits,cp_vp);
            if (chaos_attack_posture(cp_c)) {
                chaos_59_reaction(cp_c,cp_bits);
                if (cp_s.cooldown == 0) {
                    chaos_59_queue_flash(cp_b);chaos_59_sound(cp_b,$B6);cp_s.requested=20;cp_s.cooldown=16;
                    var cp_hp=cp_s.hp;cp_s.hp=(cp_hp-1)&255;array_push(cp_b.hits,[cp_b.tick,cp_s.hp]);
                    if (cp_hp == 0) {cp_s.angle=255;cp_b.defeated_tick=cp_b.tick;return cp_bits;}
                }
            }
        }
    }
    if (cp_s.counter == 0 && cp_present && abs(floor(cp_c.yu/256)-chaos_59_y(cp_s)) < 32) cp_s.requested=10;
    return cp_bits;
}

function chaos_59_diag_impl_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) {
    if (!cp_present) return 0;
    var cp_bits=chaos_59_bits(cp_s,cp_c);cp_s.contact=cp_bits;
    if (cp_bits == 0) return 0;
    chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));
    chaos_59_project_player(cp_s,cp_c,cp_bits,cp_vp);
    if (chaos_attack_posture(cp_c)) chaos_59_reaction(cp_c,cp_bits); else chaos_request_stage(cp_c);
    return cp_bits;
}
function chaos_59_diag_impl_damage_contact(cp_s,cp_c,cp_present) {
    if (!cp_present) return 0;
    var cp_bits=chaos_59_bits(cp_s,cp_c);cp_s.contact=cp_bits;
    if (cp_bits != 0) { chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits)); chaos_request_stage(cp_c); }
    return cp_bits;
}
function chaos_59_convert(cp_s) {
    cp_s.src_type=cp_s.type;
    cp_s.type=$0F; cp_s.state=0; cp_s.requested=0; cp_s.timer=0; cp_s.pc=0;
    cp_s.keep=false; cp_s.asleep=false; cp_s.bit0=false; cp_s.token=0; cp_s.parameter=0;
    cp_s.loop_count=0;
}
function chaos_59_hud_alloc(cp_b,cp_pool,cp_s) {
    var cp_i=chaos_59_alloc(cp_b,cp_pool,$12,0,0,0,false);
    cp_s.hud=cp_i < 0 ? 16 : cp_i;
    cp_s.field34=($D540+cp_s.hud*64) & 255; cp_s.field35=(($D540+cp_s.hud*64) >> 8) & 255;
}
function chaos_59_combat_init(cp_b,cp_s,cp_pool) {
    cp_b.selector=23;cp_b.palette=16;chaos_59_hud_alloc(cp_b,cp_pool,cp_s);
    cp_s.requested=6;cp_s.yu=((chaos_59_y(cp_s)-224)&65535)*256+(cp_s.yu&255);
    cp_s.hp=10;cp_s.counter=6;cp_s.field34=6;cp_s.field23=0;cp_s.field24=0;
}

function chaos_59_clear(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp) {
    if (!cp_present) return;
    if ((cp_c.contacts & 2) == 0) return;
    chaos_goal_request_state20(cp_c);
    chaos_59_sound(cp_b,CHAOS_54_SND_CLEAR);
    cp_b.camera_left=cp_vp.left;
    cp_b.camera_mode=4;
    cp_b.camera_right=cp_s.limit_right;
    chaos_59_alloc(cp_b,cp_pool,$0A,0,0,0,false);
    cp_b.clear=true; cp_b.clear_tick=cp_b.tick;
    global.chaosBossNextAct=chaos_59_destination();
    chaos_59_convert(cp_s);
}
function chaos_59_fixed(cp_pool) {
 var cp_p=cp_pool.slots[7];
 if (!variable_struct_exists(cp_p,"field23")) cp_p.field23=0;
 if (!variable_struct_exists(cp_p,"field24")) cp_p.field24=0;
 if (!variable_struct_exists(cp_p,"field34")) cp_p.field34=0;
 if (!variable_struct_exists(cp_p,"counter")) cp_p.counter=0;
 return cp_p;
}
function chaos_59_positive_y(cp_s) { var cp_y=chaos_59_y(cp_s);return cp_y > 238 && cp_y < 32768; }
function chaos_59_velocity(cp_s) {var cp_v=chaos_59_velocities()[cp_s.angle&255];cp_s.vx=floor((cp_v[1]/8)*cp_s.saved_request/16);cp_s.vy=floor((cp_v[2]/8)*cp_s.saved_request/16);cp_s.vx=round(cp_s.vx*cp_s.salvo_gain);}
/// P4 I: retain a valid player-phase snapshot through death/instance replacement.
/// The natural trigger must have observed Sonic before combat can reach a salvo.
function chaos_59_target_snapshot(cp_b,cp_c,cp_present) {
    if (cp_present && cp_c != noone) {
        cp_b.target_valid=true;cp_b.target_xu=cp_c.xu;cp_b.target_yu=cp_c.yu;cp_b.target_tick=cp_b.tick;
    }
}
function chaos_59_main_entry(cp_s,cp_vp) {
    if (cp_vp.w == 348 && !cp_s.wide_entered) {
        // WORLD1856 - LOCKED_CAMERA1727 =129 = EDGE(RIGHT,-127).
        // Applied only after the children, while the main boss is above the view.
        cp_s.xu+=(348-256)*256;cp_s.wide_entered=true;
    }
}
function chaos_59_salvo_begin(cp_b,cp_s,cp_vp) {
    if (cp_vp.w != 348) return;
    if (!cp_b.target_valid) {show_error("AQZ59 salvo without a prior valid player snapshot",true);return;}
    cp_s.salvo_left=clamp(floor(cp_b.target_xu/256)-cp_vp.left-128,0,92);
}
function chaos_59_salvo_launch(cp_s,cp_parent,cp_vp) {
    if (cp_vp.w != 348 || cp_s.parameter >= 6) return;
    var cp_p=chaos_59_parameters()[cp_s.parameter],cp_table=chaos_59_velocities();
    var cp_x=cp_p[0]*256+(cp_s.xu&255),cp_y=cp_s.yu,cp_angle=cp_s.angle,cp_n=0,cp_turn=cp_p[3];
    var cp_origin=cp_x;
    // Integrate the canonical curve to the floor anchor; vertical timing and
    // angle/turn cadence stay original. Only a positive X scale is latched.
    for (var cp_i=0;cp_i<1024;cp_i++) {
        var cp_v=cp_table[cp_angle&255];
        cp_x+=floor((cp_v[1]/8)*cp_s.saved_request/16);
        cp_y+=floor((cp_v[2]/8)*cp_s.saved_request/16);cp_n++;
        if (floor(cp_y/256)>=238) break;
        if ((cp_n mod 4)==0 && !((cp_turn<0 && cp_angle<80)||(cp_turn>=0 && cp_angle>=176))) cp_angle=(cp_angle+cp_turn)&255;
    }
    var cp_shift=cp_parent.salvo_left,cp_start=cp_p[0]+cp_shift;
    // Side returns still enter from outside the actual viewport, never from
    // an interior band edge. Top returns translate with the selected band.
    if (cp_p[0] == -16) cp_start=-16;
    if (cp_p[0] == 272) cp_start=364;
    cp_s.salvo_target=cp_vp.left+cp_x/256+cp_shift;
    cp_s.salvo_gain=((cp_x+cp_shift*256)-(cp_start*256+(cp_s.xu&255)))/(cp_x-cp_origin);
    cp_s.xu=(cp_vp.left+cp_start)*256+(cp_s.xu&255);
    chaos_59_velocity(cp_s);
}
/// P4 G: only 348 has a gameplay adapter. Canonical span161 -> wide span267.
/// +/-265/256 keeps the same vertical callback count while scaling X travel.
function chaos_59_jump_speed(cp_speed,cp_w) { return cp_w == 348 ? 265 : cp_speed; }
/// 348 firing waypoint from the original first floor contact: 60*2.25=135.
/// Source bossX-8; choose a visible target with unchanged combined shot reach12.
function chaos_59_fire_target(cp_s,cp_c,cp_vp) {
    // Canonical left-going $5D only: source bossX-8, first floor travel -135.
    return cp_vp.left+clamp(floor(cp_c.xu/256)-cp_vp.left+143,44,311);
}
function chaos_59_face(cp_s,cp_c,cp_speed) {
    var cp_vp=chaos_vp_current(),cp_target=floor(cp_c.xu/256);
    if (cp_s.type == $59) {
        cp_speed=chaos_59_jump_speed(cp_speed,cp_vp.w);
        if (cp_vp.w == 348) {
            if (cp_s.wide_route == 1) {cp_s.wide_fire_x=chaos_59_fire_target(cp_s,cp_c,cp_vp);cp_target=cp_s.wide_fire_x;}
            else {cp_target=clamp(cp_target,cp_vp.left+44,cp_vp.left+311);cp_s.wide_body_x=cp_target;}
        }
    }
    cp_s.vx=chaos_59_view_x(cp_s)<cp_target ? cp_speed : -cp_speed;
}
function chaos_59_patrol_stop(cp_s,cp_vp) {
    if (cp_vp.w != 348) return (cp_s.vx < 0 && (cp_s.sx&255) < 48) || (cp_s.vx >= 0 && (cp_s.sx&255) >= 208);
    var cp_x=chaos_59_view_x(cp_s)-cp_vp.left;
    if (cp_s.wide_route == 1 || cp_s.wide_body_x != 0) {
        var cp_target=(cp_s.wide_route == 1 ? cp_s.wide_fire_x : cp_s.wide_body_x)-cp_vp.left;
        if ((cp_s.vx < 0 && cp_x<=cp_target) || (cp_s.vx>0 && cp_x>=cp_target)) return true;
    }
    return (cp_s.vx < 0 && cp_x < 45) || (cp_s.vx >= 0 && cp_x >= 311);
}
/// Switch route goals after actual descending body proximity. This changes only
/// the next existing jump's X goal, never scripts, states, counters or Y motion.
function chaos_59_body_route(cp_s,cp_c,cp_present,cp_vp) {
    if (cp_vp.w != 348 || !cp_present || cp_s.wide_route != 0 || cp_s.vy<=0) return;
    if (chaos_59_y(cp_s)>=214 && abs(chaos_59_view_x(cp_s)-floor(cp_c.xu/256))<=28) {
        cp_s.wide_route=1;cp_s.wide_fire_x=chaos_59_fire_target(cp_s,cp_c,cp_vp);
    }
}
function chaos_59_diag_impl_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp) {
    var cp_parent=chaos_59_fixed(cp_pool);
    switch (cp_pc) {
        case $032F: return;
        case $974C:
            cp_s.keep=true;global.chaosAqzBossActive=true;chaos_59_hud_alloc(cp_b,cp_pool,cp_s);
            cp_b.camera_mode=1;chaos_59_left_limit(cp_b,cp_s,cp_vp);cp_s.requested=1;
            if (cp_present && cp_c.next == 18) cp_c.next=14;
            return;
        case $9771:
            cp_s.limit_right=cp_b.camera_right;
            if (cp_present && chaos_59_trigger(cp_s,cp_c)) {cp_b.camera_mode=2;cp_s.requested=2;}
            return;
        case $97C1:
            if (cp_pool.slots[cp_s.hud].type != 0) return;
            cp_b.camera_mode=3;cp_b.pan_x=(chaos_59_x(cp_s)-128)&65535;cp_b.pan_y=(chaos_59_y(cp_s)-160)&65535;
            cp_b.camera_bottom=cp_b.pan_y;cp_s.requested=3;return;
        case $A9A5: chaos_59_combat_init(cp_b,cp_s,cp_pool);return;
        case $A9E0: return;
        case $A9E1:
            cp_s.counter=(cp_s.counter-1)&255;
            if (cp_s.counter == 0) {cp_s.requested=7;cp_s.counter=64;}return;
        case $A9F3:
            if (cp_s.field34 != 0) return;
            var cp_count=cp_s.counter;cp_s.counter=(cp_count-1)&255;
            if (cp_count == 0) {cp_s.requested=8;cp_s.vx=0;cp_s.vy=0;chaos_59_main_entry(cp_s,cp_vp);}return;
        case $AA13:
            chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);chaos_59_move(cp_s);cp_s.vy=chaos_59_s16(cp_s.vy+16);
            if (chaos_59_positive_y(cp_s)) {cp_s.vy=-1536;cp_s.vx=-chaos_59_jump_speed(160,cp_vp.w);cp_s.requested=9;cp_s.angle=0;cp_s.counter=0;cp_s.cooldown=0;}return;
        case $AA4D:
            if (cp_present) chaos_59_face(cp_s,cp_c,160);cp_s.vy=-1536;return;
        case $AA68: cp_s.counter=255;
        case $AA6C:
            if (chaos_59_patrol_stop(cp_s,cp_vp)) cp_s.vx=0;
            chaos_59_move(cp_s);cp_s.vy=chaos_59_s16(cp_s.vy+48);
            if (cp_s.vy >= 0 && chaos_59_positive_y(cp_s)) {cp_s.requested=17;cp_s.vx=0;cp_s.vy=0;return;}
            chaos_59_body_route(cp_s,cp_c,cp_present,cp_vp);
            chaos_59_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);return;
        case $AAB5: chaos_59_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);return;
        case $AB1D:
            cp_s.vy=chaos_59_s16(cp_s.vy+32);chaos_59_move(cp_s);chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            if (chaos_59_positive_y(cp_s)) {cp_s.requested=12;cp_s.cooldown=48;cp_s.vx=0;cp_s.vy=-256;cp_s.counter=96;}
            else if (cp_s.counter == 16) cp_s.counter=0;
            return;
        case $AB60:
            chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            if (((cp_s.cooldown-1)&255) != 0) {cp_s.cooldown=(cp_s.cooldown-1)&255;return;}
            chaos_59_move(cp_s);var cp_old=cp_s.counter;cp_s.counter=(cp_old-1)&255;
            if (cp_old == 0) {cp_s.flags3=cp_s.flags3&127;cp_s.requested=13;cp_s.vy=0;cp_s.counter=0;}return;
        case $AB8D:
            chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            if (cp_parent.field24 != 0) {cp_s.requested=14;cp_s.field23=0;cp_s.field24=0;cp_s.counter=16;chaos_59_salvo_begin(cp_b,cp_s,cp_vp);}return;
        case $ABA5:
            chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);var cp_old2=cp_s.counter;cp_s.counter=(cp_old2-1)&255;
            if (cp_old2 == 0) {cp_s.counter=6;cp_s.requested=18;}return;
        case $ABEB: chaos_59_move(cp_s);chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);return;
        case $ABBA:
            chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            if (cp_s.counter == 0) {cp_s.requested=19;cp_s.counter=64;}return;
        case $ABCB:
            if (cp_s.counter == 0) {cp_s.requested=14;cp_s.counter=16;chaos_59_salvo_begin(cp_b,cp_s,cp_vp);return;}
            cp_s.counter=(cp_s.counter-1)&255;
            if (chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) != 0) cp_s.requested=5;
            return;
        case $81BD: chaos_59_clear(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp);return;
        case $AC38:
            cp_s.keep=true;cp_s.flags3=cp_s.flags3&127;cp_s.requested=1;cp_s.xu=2048*256+(cp_s.xu&255);cp_s.yu=238*256+(cp_s.yu&255);
            cp_s.vx=-128;cp_s.vy=-512;cp_s.hp=1;cp_s.counter=2;cp_s.cooldown=0;return;
        case $AC71:
            cp_s.contact=0;
            if (cp_s.cooldown != 0) cp_s.cooldown=(cp_s.cooldown-1)&255;
            else if (cp_present) {
                var cp_hit=chaos_59_bits(cp_s,cp_c);cp_s.contact=cp_hit;
                if (cp_hit != 0) {chaos_contact_stage(cp_c,chaos_contact_nibble(cp_hit));cp_s.saved_request=cp_s.requested;cp_s.requested=3;return;}
            }
            cp_s.vy=chaos_59_s16(cp_s.vy+20);chaos_59_move(cp_s);
            if (cp_s.vy >= 0 && chaos_59_positive_y(cp_s)) {
                cp_s.vy=-512;var cp_l=cp_s.counter;cp_s.counter=(cp_l-1)&255;
                if (cp_l == 0) {cp_s.counter=2;if (cp_present) chaos_59_face(cp_s,cp_c,128);cp_s.requested=cp_s.vx < 0 ? 1 : 2;}
            }return;
        case $ACE3:
            cp_s.cooldown=4;chaos_59_move(cp_s);cp_s.requested=cp_s.saved_request;cp_s.vy=(cp_s.contact&1) != 0 ? 512 : -512;
            chaos_59_queue_flash(cp_b);chaos_59_sound(cp_b,$B6);var cp_hp=cp_s.hp;cp_s.hp=(cp_hp-1)&255;
            if (cp_hp == 0) {cp_parent.field34=(cp_parent.field34-1)&255;cp_s.requested=4;}return;
        case $AD24: cp_s.parameter=0;chaos_59_convert(cp_s);return;
        case $AD3B: cp_s.keep=true;cp_s.requested=1;cp_s.vy=-256;return;
        case $AD4D:
            if (cp_s.asleep) {cp_s.type=$FF;cp_parent.field24=255;return;}chaos_59_move(cp_s);return;
        case $AD96: cp_s.requested=1;cp_s.keep=true;cp_s.counter=0;cp_s.angle=0;cp_s.saved_request=128;chaos_59_velocity(cp_s);return;
        case $ADAE:
            chaos_59_move(cp_s);chaos_59_damage_contact(cp_s,cp_c,cp_present);
            if (cp_s.asleep) cp_s.requested=2;return;
        case $ADBE:
            if (cp_parent.field23 == 0) return;
            var cp_p=chaos_59_parameters()[cp_s.parameter];cp_s.xu=((cp_vp.left+cp_p[0])&65535)*256+(cp_s.xu&255);cp_s.yu=((cp_vp.top+cp_p[1])&65535)*256+(cp_s.yu&255);
            cp_s.angle=cp_p[2];cp_s.field38=cp_p[3]&255;cp_s.delay=cp_p[4];cp_s.requested=5;chaos_59_velocity(cp_s);chaos_59_salvo_launch(cp_s,cp_parent,cp_vp);return;
        case $AE27:
            if (cp_s.delay != 0) {cp_s.delay--;return;}cp_s.requested=3;cp_s.cooldown=4;return;
        case $AE3B:
            chaos_59_move(cp_s);cp_s.cooldown=(cp_s.cooldown-1)&255;
            if (cp_s.cooldown == 0) {cp_s.cooldown=4;chaos_59_callback(cp_b,cp_pool,cp_s,$AE88,cp_c,cp_present,cp_vp);}
            chaos_59_damage_contact(cp_s,cp_c,cp_present);if (chaos_59_positive_y(cp_s)) cp_s.requested=4;return;
        case $AE5B:
            var cp_step=chaos_59_s16(cp_s.field38 >= 128 ? cp_s.field38-256 : cp_s.field38),cp_f=16;
            if (cp_step < 0) cp_f=cp_s.angle >= 88 ? 20 : 22;else cp_f=cp_s.angle < 168 ? 16 : 18;
            cp_s.frame=cp_f+(cp_s.counter&1);cp_s.counter=(cp_s.counter+1)&255;cp_s.timer=3;return;
        case $AE88:
            var cp_turn=cp_s.field38 >= 128 ? cp_s.field38-256 : cp_s.field38;
            if ((cp_turn < 0 && cp_s.angle < 80) || (cp_turn >= 0 && cp_s.angle >= 176)) return;
            cp_s.angle=(cp_s.angle+cp_turn)&255;
            chaos_59_velocity(cp_s);return;
        case $AEA3: cp_s.parameter=0;cp_parent.counter=(cp_parent.counter-1)&255;chaos_59_convert(cp_s);return;
        case $AEE9:
            cp_s.requested=1;cp_s.cooldown=0;cp_s.vx=-576;cp_s.vy=0;
            if (cp_present && abs(floor(cp_c.yu/256)-chaos_59_y(cp_s)) >= 32) cp_s.cooldown=floor(cp_c.yu/256)<chaos_59_y(cp_s) ? 255 : 1;
            return;
        case $AF1E:
            if (cp_s.asleep) {cp_s.type=$FF;return;}chaos_59_move(cp_s);chaos_59_damage_contact(cp_s,cp_c,cp_present);
            if (cp_s.cooldown != 0) cp_s.vy=chaos_59_s16(cp_s.vy+(cp_s.cooldown == 1 ? 8 : -8));return;
        default: chaos_54_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp);return;
    }
}


function chaos_59_slot_index(cp_pool,cp_s) {
    for (var cp_i=0;cp_i<19;cp_i++) if (cp_pool.slots[cp_i] == cp_s) return cp_i;
    return 0;
}
function chaos_59_load_frame(cp_s) {
    var cp_e=chaos_59_extent(cp_s.type,cp_s.frame);
    cp_s.ex=cp_e[0]; cp_s.ey=cp_e[1];
}
/// Script allocation preserves the ROM launcher (-8,-32). At348 the canonical
/// left-going launch releases the wide firing waypoint back to body approach.
function chaos_59_script_alloc(cp_b,cp_pool,cp_s,cp_r,cp_c,cp_present,cp_vp) {
    var cp_x=(chaos_59_x(cp_s)+cp_r[3])&$FFFF,cp_y=(chaos_59_y(cp_s)+cp_r[4])&$FFFF;
    var cp_slot=chaos_59_alloc(cp_b,cp_pool,cp_r[2],cp_r[5],cp_x,cp_y,true);
    if (cp_vp.w != 348 || cp_r[2] != $5D || cp_slot<0 || !cp_present) return;
    var cp_vx=-576;
    // After each natural attached left-going launch, resume
    // the body goal using the same horizontal speed and remaining jump calls.
    // A bounded firing waypoint must not trap the route when Sonic is behind it.
    var cp_floor_x=cp_x-135;
    if (cp_s.wide_route == 1) {
        cp_s.wide_route=0;cp_s.wide_body_x=clamp(floor(cp_c.xu/256),cp_vp.left+44,cp_vp.left+311);
        cp_s.vx=chaos_59_view_x(cp_s)<floor(cp_c.xu/256) ? 265 : -265;
    }
    if (chaos_59_diag_on()) chaos_59_diag_emit("launch-aim",{slot:cp_slot,vx:cp_vx/256,source_x:cp_x,source_y:cp_y,player_x:cp_c.xu/256,player_y:cp_c.yu/256,floor_x:cp_floor_x});
}
function chaos_59_script(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp) {
    if (cp_s.pc == 0) cp_s.pc=chaos_59_table(cp_s.type)[cp_s.state];
    else if (cp_s.state != cp_s.requested) {
        cp_s.state=cp_s.requested;cp_s.pc=chaos_59_table(cp_s.type)[cp_s.state];
    } else {cp_s.timer=(cp_s.timer-1)&255;if(cp_s.timer != 0)return;}
    for (var cp_guard=0;cp_guard<128;cp_guard++) {
        var cp_r=chaos_59_record(cp_s.type,cp_s.pc);
        if (array_length(cp_r) == 0) { show_debug_message("Unresolved AQZ boss script "+string(cp_s.type)+":"+string(cp_s.pc)); return; }
        cp_s.diag_record=cp_s.pc; // AQZ_DIAG_ONLY: record being executed, not next PC
        cp_s.pc=cp_r[0]; var cp_cmd=cp_r[1];
        if (cp_cmd == -1) {
            cp_s.timer=cp_r[2]; cp_s.frame=cp_r[3]; cp_s.callback=cp_r[4];
            chaos_59_load_frame(cp_s); return;
        }
        switch (cp_cmd) {
            case 0: cp_s.state=cp_s.requested; cp_s.pc=chaos_59_table(cp_s.type)[cp_s.state]; break;
            case 1: chaos_59_callback(cp_b,cp_pool,cp_s,cp_r[2],cp_c,cp_present,cp_vp); break;
            case 2: cp_s.vx=chaos_59_s16(cp_r[2]); cp_s.vy=chaos_59_s16(cp_r[3]); break;
            case 3: cp_s.requested=cp_r[2]; break;
            case 4:
                chaos_59_script_alloc(cp_b,cp_pool,cp_s,cp_r,cp_c,cp_present,cp_vp);
                break;
            case 5:

                cp_s.callback=cp_r[3];
                chaos_59_callback(cp_b,cp_pool,cp_s,cp_r[2],cp_c,cp_present,cp_vp);
                chaos_59_load_frame(cp_s);
                return;
            case 6: chaos_59_sound(cp_b,cp_r[2]); break;
            case 7: cp_s.pc=cp_r[2]; break;
            case 9:
                if (cp_r[2] == 30) cp_s.counter=cp_r[3];
                if (cp_r[2] == 35) cp_s.field23=cp_r[3];
                if (cp_r[2] == 36) cp_s.field24=cp_r[3];
                break;
            case 14: cp_s.loop_count=cp_r[2]; break;
            case 15: cp_s.loop_count--; if (cp_s.loop_count != 0) cp_s.pc=cp_r[2]; break;
        }
    }
}
function chaos_59_diag_impl_lifecycle(cp_b,cp_s,cp_vp) {
    cp_s.asleep=false;
    var cp_cell=SCR_chaos_spawn_cell(cp_vp,chaos_59_view_x(cp_s),chaos_59_y(cp_s));
    if (cp_cell < 3) { if ((cp_cell & 2) != 0) cp_s.asleep=true; return; }
    cp_s.asleep=true;
    if (cp_s.keep) return;
    cp_s.type=cp_s.token != 0 ? $FE : $FF; cp_s.state=0;
}
function chaos_59_release(cp_b,cp_s) {
    if (cp_s.token == CHAOS_59_TOKEN) cp_b.occupied=false;
}
function chaos_59_visit(cp_b,cp_pool,cp_i,cp_c,cp_present,cp_vp) {
    var cp_s=cp_pool.slots[cp_i];
    if (!variable_struct_exists(cp_s,"boss59") || !cp_s.boss59 || cp_s.type == 0) return;
    if (cp_s.type == $FE) { cp_s.type=$FF; cp_s.state=0; return; }
    if (cp_s.type == $FF) {
        if (cp_s.token != 0) chaos_59_release(cp_b,cp_s);
        cp_pool.slots[cp_i]=chaos_s2_slot();
        return;
    }
    // Wide phase-1 visibility/contact gate; source scripts and movement keep running.
    if (cp_s.type == $59 && cp_vp.w == 348) chaos_59_target_snapshot(cp_b,cp_c,cp_present);
    var cp_visible=cp_present && !(cp_vp.w > 256 && cp_s.type == $5A && !cp_b.intro_ready);
    chaos_59_script(cp_b,cp_pool,cp_s,cp_c,cp_visible,cp_vp);
    if (cp_s.callback != 0) chaos_59_viewport_callback(cp_b,cp_pool,cp_s,cp_s.callback,cp_c,cp_visible,cp_vp);
    if (cp_s.state != 0) chaos_59_lifecycle(cp_b,cp_s,cp_vp);
}
function chaos_59_pass_begin(cp_vp) {
    var cp_b=chaos_59_state();
    if (cp_b == noone) return noone;
    if (cp_b.latch_clear) cp_b.sound=0;
    cp_b.viewport_w=cp_vp.w; cp_b.viewport_h=cp_vp.h; cp_b.camera_x=cp_vp.left; cp_b.camera_y=cp_vp.top;
    cp_b.d12f=global.chaosAqzEnv.d12f;cp_b.d2e2=global.chaosAqzEnv.d2e2;
    cp_b.random_byte=(cp_b.tick*73+19) & 255;
    return cp_b;
}
function chaos_59_pass_end(cp_b,cp_pool,cp_c,cp_present,cp_vp) {
    chaos_59_flash_step(cp_b);
    for (var cp_k=0;cp_k<19 && cp_b.screen_pass;cp_k++) {
        var cp_s=cp_pool.slots[cp_k];
        if (!variable_struct_exists(cp_s,"boss59") || !cp_s.boss59 || cp_s.type == 0 || cp_s.asleep) continue;
        cp_s.sx=chaos_59_view_x(cp_s)-cp_vp.left; cp_s.sy=chaos_59_y(cp_s)-cp_vp.top;
    }
    if (cp_b.screen_pass && cp_present) cp_b.player_sx=floor(cp_c.xu/256)-cp_vp.left;
    chaos_59_scan(cp_b,cp_pool,cp_vp);
    cp_b.tick++;
    global.chaosHudSlide=-min(64,cp_b.hud_count);
}
function chaos_59_scan(cp_b,cp_pool,cp_vp) {
    if (array_length(cp_b.record) == 0 || cp_b.occupied || cp_b.consumed) return false;
    var cp_due=(cp_b.d2e2 & 3) == 0;
    cp_b.chaosScanTick++;
    if (!cp_due) return false;
    var cp_r=cp_b.record;
    var cp_cell=SCR_chaos_spawn_cell(cp_vp,cp_r[1],cp_r[2]);
    var cp_fill=!cp_b.chaosInitialFillDone;
    cp_b.chaosInitialFillDone=true;
    if (!(cp_cell == 2 || (cp_cell < 2 && cp_fill))) return false;
    var cp_slot=chaos_object_free_slot(cp_pool.slots,7,18);
    if (cp_slot < 0) return false;
    var cp_s=chaos_59_slot($59,cp_r[5],cp_r[1],cp_r[2],cp_r[0]);
    cp_s.asleep=true; cp_s.woken=false;
    cp_pool.slots[cp_slot]=cp_s;
    cp_b.occupied=true; cp_b.created=true; cp_b.active=true; cp_b.slot=cp_slot;
    return true;
}
function chaos_59_slot_of(cp_pool,cp_type) {
    for (var cp_i=0;cp_i<19;cp_i++) if (variable_struct_exists(cp_pool.slots[cp_i],"boss59") && cp_pool.slots[cp_i].boss59 && cp_pool.slots[cp_i].type == cp_type) return cp_i;
    return -1;
}
function chaos_59_tick(cp_b,cp_pool,cp_vp,cp_c,cp_present) {
    if (cp_b.latch_clear) cp_b.sound=0;
    cp_b.viewport_w=cp_vp.w; cp_b.viewport_h=cp_vp.h; cp_b.camera_x=cp_vp.left; cp_b.camera_y=cp_vp.top;
    for (var cp_i=0;cp_i<19;cp_i++) chaos_59_visit(cp_b,cp_pool,cp_i,cp_c,cp_present,cp_vp);
    chaos_59_pass_end(cp_b,cp_pool,cp_c,cp_present,cp_vp);
}
function chaos_59_owns_camera() {
    var cp_b=chaos_59_state();
    return cp_b != noone && cp_b.active;
}
function chaos_59_follow_x(cp_b,cp_vp,cp_player_x) {
    var cp_hi=max(cp_b.camera_left,min(cp_b.camera_right,room_width-cp_vp.w));
    return clamp(round(cp_player_x-cp_vp.w/2),cp_b.camera_left,cp_hi);
}
function chaos_59_follow_y(cp_vp,cp_player_y) {
    return clamp(round(cp_player_y-cp_vp.h/1.5),0,max(0,room_height-cp_vp.h));
}
function chaos_59_follow_delta(cp_k,cp_lead) {
    var cp_lo=cp_lead-CHAOS_59_DEADZONE,cp_hi=cp_lead+CHAOS_59_DEADZONE;
    if (cp_k < cp_lo) { var cp_d=cp_k-cp_lo; return cp_d >= -CHAOS_59_DEADZONE ? cp_d : CHAOS_59_FOLLOW_LEFT; }
    if (cp_k <= cp_hi) return 0;
    var cp_u=cp_k-cp_hi;
    return cp_u < CHAOS_59_DEADZONE ? cp_u : CHAOS_59_FOLLOW_RIGHT;
}
function chaos_59_limit_delta(cp_x,cp_delta,cp_left,cp_right) {
    if (cp_delta < 0) return (cp_x+cp_delta < cp_left || cp_x+cp_delta < 0) ? 0 : cp_delta;
    if (cp_delta > 0) return cp_x+cp_delta >= cp_right ? 0 : cp_delta;
    return 0;
}
function chaos_59_lead_target(cp_w,cp_left_facing) {
    if (cp_w > 256) return floor(cp_w/2)+(cp_left_facing ? CHAOS_59_LEAD_LEFT-128 : CHAOS_59_LEAD_RIGHT-128);
    return cp_left_facing ? CHAOS_59_LEAD_LEFT : CHAOS_59_LEAD_RIGHT;
}
function chaos_59_post_clear_x(cp_b,cp_w,cp_x,cp_px,cp_left_facing) {
    var cp_target=chaos_59_lead_target(cp_w,cp_left_facing);
    if (cp_b.cam_lead < 0) cp_b.cam_lead=chaos_59_lead_target(cp_w,false);
    cp_b.cam_lead+=clamp(cp_target-cp_b.cam_lead,-CHAOS_59_LEAD_SLEW,CHAOS_59_LEAD_SLEW);
    var cp_d=0;
    if (cp_w > 256) cp_d=clamp(chaos_59_follow_delta(cp_px-cp_x,cp_b.cam_lead),-4,4);
    else if (cp_px != cp_x) cp_d=chaos_59_follow_delta((cp_px-cp_x)&255,cp_b.cam_lead);
    return cp_x+chaos_59_limit_delta(cp_x,cp_d,cp_b.camera_left,min(cp_b.camera_right,chaos_59_camera_bound(room_width,cp_w)));
}
function chaos_59_pan(cp_b,cp_vp,cp_x,cp_y) {
    var cp_tx=cp_b.pan_x,cp_ty=cp_b.pan_y;
    if (cp_x < cp_tx) cp_x=min(cp_x+1,cp_tx-1);else if (cp_x > cp_tx) cp_x--;
    cp_y+=sign(cp_ty-cp_y);return [cp_x,cp_y];
}

function chaos_59_camera_step() {
    var cp_b=chaos_59_state();
    if (chaos_aqz_act() != 3 || cp_b == noone) return;
    var cp_vp=chaos_vp_current(),cp_x=cp_vp.left,cp_y=cp_vp.top;
    if (!cp_b.active) {

        if (cp_vp.w > 256) { cp_b.last_view_x=cp_x; cp_b.last_view_y=cp_y; cp_b.last_view_valid=true; }
        return;
    }
    if (cp_vp.w > 256 && !cp_b.camera_owned && cp_b.last_view_valid) { cp_x=cp_b.last_view_x; cp_y=cp_b.last_view_y; }
    cp_b.camera_owned=true;
    __view_set(e__VW.Object,0,noone);
    var cp_pl=chaos_goal_player(),cp_core=cp_pl != noone ? cp_pl.chaosCore : noone;
    var cp_wide=cp_vp.w > 256;
    var cp_px=cp_pl != noone ? floor(cp_core.xu/256) : cp_x+cp_vp.w/2;
    var cp_py=cp_pl != noone ? floor(cp_core.yu/256) : cp_y+cp_vp.h/1.5;
    if (cp_b.camera_mode == 3) {
        cp_b.camera_right=cp_b.pan_x;
        var cp_pan=chaos_59_pan(cp_b,cp_vp,cp_x,cp_y);

        if (cp_pan[0] < cp_b.camera_left) cp_b.camera_left=cp_pan[0];
        cp_x=cp_pan[0]; cp_y=cp_pan[1];
        cp_b.frozen=false;
        if (cp_wide) {
            var cp_settled=(cp_x == cp_b.pan_x-1 || cp_x == cp_b.pan_x) && cp_y == cp_b.pan_y;
            cp_b.intro_stable=cp_settled ? cp_b.intro_stable+1 : 0;
            if (cp_settled) {cp_b.fight_x=cp_x;cp_b.fight_y=cp_y;}
            if (cp_b.intro_stable >= 16) cp_b.intro_ready=true;
        }
    } else if (cp_b.camera_mode == 4 && cp_wide) {
        // Explicit wide clear adapter: state $20 runs off the fixed fight view.
        cp_x=cp_b.fight_x; cp_y=cp_b.fight_y; cp_b.frozen=true;
    } else if (cp_b.camera_mode == 4) {

        var cp_in20=cp_core != noone && (cp_core.state == 32 || cp_core.next == 32);
        if (!cp_b.frozen && cp_in20 && cp_px >= chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,CHAOS_ACT_FREEZE_EDGE)) cp_b.frozen=true;
        if (!cp_b.frozen) {

            var cp_fy=min(CHAOS_59_BOTTOM_LIMIT,chaos_59_follow_y(cp_vp,cp_py));
            if (cp_core != noone) cp_x=chaos_59_post_clear_x(cp_b,cp_vp.w,cp_x,cp_px,(cp_core.player_flags & 16) != 0);
            if (cp_wide) cp_y+=clamp(cp_fy-cp_y,-4,4); else cp_y=cp_fy;
        }
    } else {

        var cp_fx2=chaos_59_follow_x(cp_b,cp_vp,cp_px),cp_fy2=chaos_59_follow_y(cp_vp,cp_py);
        if (cp_wide) { cp_x+=clamp(cp_fx2-cp_x,-4,4); cp_y+=clamp(cp_fy2-cp_y,-4,4); }
        else { cp_x=cp_fx2; cp_y=cp_fy2; }
    }
    cp_x=min(cp_x,chaos_59_camera_bound(room_width,cp_vp.w));
    cp_b.camera_x=cp_x; cp_b.camera_y=cp_y;
    __view_set(e__VW.XView,0,cp_x); __view_set(e__VW.YView,0,cp_y);
}
function chaos_59_sprite_frame(cp_type,cp_frame) {
 if (cp_type >= $59 && cp_type <= $5D) {
  var cp_frames=variable_struct_get(chaos_59_frames(),string(cp_type));
  for (var cp_i=0;cp_i<array_length(cp_frames);cp_i++) if (cp_frames[cp_i] == cp_frame) return cp_i;
  return 0;
 }
 return chaos_54_sprite_frame(cp_type,cp_frame);
}
function chaos_59_draw() {
 var cp_b=chaos_59_state();if (cp_b == noone || !cp_b.active) return;
 var cp_pool=chaos_s2_state();
 for (var cp_i=0;cp_i<19;cp_i++) {
  var cp_s=cp_pool.slots[cp_i];
  if (!variable_struct_exists(cp_s,"boss59") || !cp_s.boss59 || cp_s.type == 0 || cp_s.type >= $F0 || cp_s.frame == 0 || cp_s.asleep) continue;
  if (cp_b.viewport_w > 256 && cp_s.type == $5A && !cp_b.intro_ready) continue;
  var cp_type=(cp_s.type == $0F && cp_s.state == 0) ? cp_s.src_type : cp_s.type,cp_sprite=-1;
  switch (cp_type) {
   case $59:cp_sprite=cp_b.flash_white ? SPR_chaos_aqz_boss_59_flash : SPR_chaos_aqz_boss_59;break;
   case $5A:cp_sprite=cp_b.flash_white ? SPR_chaos_aqz_boss_5a_flash : SPR_chaos_aqz_boss_5a;break;
   case $5B:cp_sprite=SPR_chaos_aqz_boss_5b;break;
   case $5C:cp_sprite=SPR_chaos_aqz_boss_5c;break;
   case $5D:cp_sprite=SPR_chaos_aqz_boss_5d;break;
   case $34:cp_sprite=SPR_chaos_sez_puff;break;
   case $0A:cp_sprite=SPR_chaos_sez_sparkle;break;
   case $0F:cp_sprite=SPR_chaos_sez_boss_poof;break;
  }
  if (cp_sprite != -1) {
   draw_sprite(cp_sprite,chaos_59_sprite_frame(cp_type,cp_s.frame),chaos_59_view_x(cp_s),chaos_59_y(cp_s));
  }
 }
}

// AQZ DIAGNOSTIC BEGIN: observation only; no gameplay values are changed.
function chaos_59_diag_state() {
    if (!variable_global_exists("chaosAqzCombatTrace")) global.chaosAqzCombatTrace={active:false,case_index:-1,path:"",rows:[],seq:0,player:noone};
    return global.chaosAqzCombatTrace;
}
function chaos_59_diag_on() {return variable_global_exists("chaosAqzCombatTrace") && global.chaosAqzCombatTrace.active;}
function chaos_59_diag_emit(cp_event,cp_data) {
    if (!chaos_59_diag_on()) return;
    var cp_d=global.chaosAqzCombatTrace,cp_b=chaos_59_state();
    array_push(cp_d.rows,{update:cp_b == noone ? -1 : cp_b.tick,seq:cp_d.seq,event:cp_event,data:cp_data});cp_d.seq++;
}
function chaos_59_diag_value(cp_s,cp_name) {return variable_struct_exists(cp_s,cp_name) ? variable_struct_get(cp_s,cp_name) : noone;}
function chaos_59_diag_snapshot(cp_s,cp_c,cp_vp) {
    var cp_p=noone;
    if (is_struct(cp_c)) cp_p={world_x:cp_c.xu/256,world_y:cp_c.yu/256,screen_x:cp_c.xu/256-cp_vp.left,screen_y:cp_c.yu/256-cp_vp.top,
        vx:cp_c.vx/256,vy:cp_c.vy/256,state:cp_c.state,requested:cp_c.next,move:cp_c.move,attack:(cp_c.move&2)!=0,hurt:(cp_c.move&64)!=0,
        bg:cp_c.bg,contacts:cp_c.contacts,hurt_pending:chaos_59_diag_value(cp_c,"hurt_pending"),hurt_ticks:chaos_59_diag_value(cp_c,"hurt_ticks"),immune:chaos_59_diag_value(cp_c,"immune"),invuln:chaos_59_diag_value(cp_c,"invuln"),stage_contact:chaos_59_diag_value(cp_c,"stage_contact"),stage_request:chaos_59_diag_value(cp_c,"stage_request")};
    return {type:cp_s.type,state:cp_s.state,substate:cp_s.requested,frame:cp_s.frame,record:cp_s.diag_record,next_record:cp_s.pc,callback:cp_s.callback,
        timer:cp_s.timer,counter:cp_s.counter,hp:cp_s.hp,cooldown:cp_s.cooldown,angle:cp_s.angle,field23:cp_s.field23,field24:cp_s.field24,field34:cp_s.field34,
        world_x:cp_s.xu/256,world_y:cp_s.yu/256,screen_x:cp_s.xu/256+cp_s.view_dx-cp_vp.left,screen_y:cp_s.yu/256-cp_vp.top,
        cached_sx:cp_s.sx,cached_sy:cp_s.sy,vx:cp_s.vx/256,vy:cp_s.vy/256,extent_x:cp_s.ex,extent_y:cp_s.ey,
        asleep:cp_s.asleep,keep:cp_s.keep,view_dx:cp_s.view_dx,player:cp_p,camera_x:cp_vp.left,camera_y:cp_vp.top,width:cp_vp.w,height:cp_vp.h,
        salvo_shift:cp_s.salvo_left,salvo_target:cp_s.salvo_target,salvo_gain:cp_s.salvo_gain,
        route_left:cp_vp.w==348 ? 44 : 47,route_right:cp_vp.w==348 ? 311 : 208,route_mode:cp_s.wide_route,route_target:cp_s.wide_route==1 ? cp_s.wide_fire_x-cp_vp.left : (cp_s.wide_body_x!=0 ? cp_s.wide_body_x-cp_vp.left : (cp_s.vx<0 ? (cp_vp.w==348 ? 44 : 47) : (cp_vp.w==348 ? 311 : 208)))};
}
function chaos_59_diag_flush() {
    if (!chaos_59_diag_on()) return;
    var cp_d=global.chaosAqzCombatTrace;
    if (array_length(cp_d.rows)==0) return;
    var cp_f=file_text_open_append(cp_d.path);
    for (var cp_i=0;cp_i<array_length(cp_d.rows);cp_i++) {file_text_write_string(cp_f,json_stringify(cp_d.rows[cp_i]));file_text_writeln(cp_f);}
    file_text_close(cp_f);cp_d.rows=[];
}
function chaos_59_diag_keys() {
    if (keyboard_check_pressed(vk_f12) && chaos_59_diag_on()) {
        chaos_59_diag_emit("stop",{});chaos_59_diag_flush();global.chaosAqzCombatTrace.active=false;
        show_debug_message("AQZ trace saved: "+game_save_id+global.chaosAqzCombatTrace.path);
    }
    if (!keyboard_check_pressed(vk_f11) || chaos_aqz_act()!=3) return;
    var cp_d=chaos_59_diag_state();chaos_59_diag_flush();
    cp_d.case_index=(cp_d.case_index+1) mod 3;var cp_names=["A-left","B-right","C-central"];
    cp_d.path="aqz-p4-i-"+cp_names[cp_d.case_index]+"-"+string(get_timer())+".jsonl";cp_d.seq=0;cp_d.rows=[];cp_d.active=true;
    chaos_59_diag_emit("start",{capture:cp_names[cp_d.case_index],version:"P4 I",units:"pixels / callback; WORLD anchors and live screen coordinates"});
    show_debug_message("AQZ trace started: "+game_save_id+cp_d.path);
}
function chaos_59_diag_frame() {
    if (!chaos_59_diag_on()) return;
    var cp_vp=chaos_vp_current(),cp_pool=chaos_s2_state(),cp_c=global.chaosAqzCombatTrace.player;
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=cp_pool.slots[cp_i];
        if (variable_struct_exists(cp_s,"boss59") && cp_s.boss59 && cp_s.type!=0) chaos_59_diag_emit("update",{slot:cp_i,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    }
    if (instance_exists(OBJ_player)) {
        var cp_p=instance_find(OBJ_player,0);
        chaos_59_diag_emit("player-instance",{x:cp_p.x,y:cp_p.y,bbox_left:cp_p.bbox_left,bbox_right:cp_p.bbox_right,bbox_top:cp_p.bbox_top,bbox_bottom:cp_p.bbox_bottom,mask_index:cp_p.mask_index});
    }
    chaos_59_diag_flush();
}
function chaos_59_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) {
    if (chaos_59_diag_on()) chaos_59_diag_emit("body-helper-before",{present:cp_present,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    var cp_result=chaos_59_diag_impl_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
    if (chaos_59_diag_on()) chaos_59_diag_emit("body-helper-after",{result:cp_result,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    return cp_result;
}
function chaos_59_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) {
    if (chaos_59_diag_on()) chaos_59_diag_emit("entry-helper-before",{present:cp_present,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    var cp_result=chaos_59_diag_impl_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
    if (chaos_59_diag_on()) chaos_59_diag_emit("entry-helper-after",{result:cp_result,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    return cp_result;
}
function chaos_59_damage_contact(cp_s,cp_c,cp_present) {
    var cp_on=chaos_59_diag_on(),cp_vp=chaos_vp_current();
    if (cp_on) chaos_59_diag_emit("projectile-helper-before",{present:cp_present,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    var cp_result=chaos_59_diag_impl_damage_contact(cp_s,cp_c,cp_present);
    if (cp_on) chaos_59_diag_emit("projectile-helper-after",{result:cp_result,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
    return cp_result;
}
function chaos_59_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp) {
    if (chaos_59_diag_on()) {global.chaosAqzCombatTrace.player=cp_c;chaos_59_diag_emit("callback-before",{address:cp_pc,snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});}
    chaos_59_diag_impl_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp);
    if (chaos_59_diag_on()) chaos_59_diag_emit("callback-after",{address:cp_pc,reason:cp_pc==$AF1E && cp_s.type==$FF ? "projectile-asleep-delete" : "",snapshot:chaos_59_diag_snapshot(cp_s,cp_c,cp_vp)});
}
function chaos_59_lifecycle(cp_b,cp_s,cp_vp) {
    chaos_59_diag_impl_lifecycle(cp_b,cp_s,cp_vp);
    if (chaos_59_diag_on()) chaos_59_diag_emit("lifecycle",{reason:cp_s.type==$FE || cp_s.type==$FF ? "outside-outer-window-delete" : (cp_s.asleep ? (cp_s.keep ? "asleep-keep" : "asleep-band") : "awake"),snapshot:chaos_59_diag_snapshot(cp_s,global.chaosAqzCombatTrace.player,cp_vp)});
}
function chaos_59_alloc(cp_b,cp_pool,cp_type,cp_param,cp_x,cp_y,cp_dynamic) {
    var cp_result=chaos_59_diag_impl_alloc(cp_b,cp_pool,cp_type,cp_param,cp_x,cp_y,cp_dynamic);
    if (chaos_59_diag_on()) {
        var cp_vp=chaos_vp_current();
        chaos_59_diag_emit("allocation",{type:cp_type,parameter:cp_param,slot:cp_result,world_x:cp_x,world_y:cp_y,screen_x:cp_x-cp_vp.left,screen_y:cp_y-cp_vp.top,
            source:chaos_59_diag_snapshot(cp_pool.slots[7],global.chaosAqzCombatTrace.player,cp_vp)});
    }
    return cp_result;
}
// CLI-only native regression: isolated structs, no room/player/global gameplay writes.
function chaos_59_diag_absent_selftest() {
    var cp_b=chaos_59_new(),cp_s=chaos_59_slot($59,0,1856,141,0);
    var cp_pool={slots:array_create(19,noone)},cp_vp={left:1727,top:78,w:348,h:196};cp_pool.slots[7]=cp_s;
    chaos_59_target_snapshot(cp_b,{xu:2027*256,yu:238*256},true);
    chaos_59_target_snapshot(cp_b,noone,false);
    cp_s.counter=0;chaos_59_callback(cp_b,cp_pool,cp_s,$ABCB,noone,false,cp_vp);
    if (cp_s.requested!=14 || cp_s.salvo_left!=92) {show_error("AQZ ABCB native snapshot regression",true);return;}
    cp_s.field24=255;cp_s.requested=13;chaos_59_callback(cp_b,cp_pool,cp_s,$AB8D,noone,false,cp_vp);
    if (cp_s.requested!=14 || cp_s.salvo_left!=92 || cp_b.target_xu!=2027*256) {show_error("AQZ AB8D native snapshot regression",true);return;}
    show_debug_message("AQZ ABSENT PLAYER SELFTEST PASS: AB8D/ABCB, snapshotX=2027, band=92");
}
// Optional native file-I/O smoke test; no room, player or gameplay writes.
function chaos_59_diag_io_selftest() {
    chaos_59_diag_absent_selftest();
    var cp_path="aqz-p4-i-io-selftest.jsonl",cp_f=file_text_open_append(cp_path);
    file_text_write_string(cp_f,json_stringify({event:"diagnostic-io-selftest",version:"P4 I",passed:true}));file_text_writeln(cp_f);file_text_close(cp_f);
    show_debug_message("AQZ DIAGNOSTIC IO SELFTEST PASS: "+game_save_id+cp_path);
}
for (var cp_diag_arg=1;cp_diag_arg<=parameter_count();cp_diag_arg++) {
    if (parameter_string(cp_diag_arg)=="-aqz-trace-io-selftest") chaos_59_diag_io_selftest();
}
// AQZ DIAGNOSTIC END
