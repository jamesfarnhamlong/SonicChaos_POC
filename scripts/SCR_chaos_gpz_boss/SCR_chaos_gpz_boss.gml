/// Research 44e0714: live-slot $51 interpreter. No THZ boss rules or bitmap flips.
/// GameMaker adapter: one controller owns 19 live slot structs, dispatched after
/// player/terrain. Dynamic allocation searches $D700..$D980; deletion clears on
/// the next visit. Links address slots, deliberately surviving slot reuse.
function chaos_51_slot(cp_slot,cp_type,cp_param,cp_x,cp_y) {
    return {slot:cp_slot,type:cp_type,parameter:cp_param,state:0,requested:0,
        frame:0,timer:0,pc:0,callback:0,xu:cp_x*256,yu:cp_y*256,vx:0,vy:0,
        lower:0,upper:0,phase:0,phase_counter:0,mode:0,health:0,mux:0,
        ex:0,ey:0,flags:0,contact_bits:0,loop_count:0,accel:0,remaining:0,base_x:cp_x,base_y:cp_y,seed:0};
}
function chaos_51_new() {
    var cp_slots=[];
    for (var cp_i=0;cp_i<19;cp_i++) array_push(cp_slots,chaos_51_slot($D540+cp_i*64,0,0,0,0));
    cp_slots[7]=chaos_51_slot($D700,$51,0,1728,270);
    return {slots:cp_slots,head:cp_slots[7],last_child:0,tick:0,active:false,
        camera_mode:0,camera_left:0,camera_right:1664,camera_bottom:0,
        camera_x:0,camera_y:0,viewport_w:256,viewport_h:192,hud_age:0,selector:0,palette:0,clear:false,
        camera_owned:false,last_view_valid:false,last_view_x:0,last_view_y:0,
        irq_counter:0,random_byte:0,sound:0,spawns:[],data_ready:true};
}
function chaos_51_sound(cp_b,cp_sound) { cp_b.sound=cp_sound;global.chaosLastSoundRequest=cp_sound; }
/// Widescreen presentation only: keep the canonical fight RIGHT edge (1919).
/// Additional width is exposed to the left; the 256 target remains 1664/1663.
function chaos_51_fight_camera_target(cp_width) { return 1664-max(0,cp_width-256); }
/// Presentation only. At the existing 348x196 view, +16 leaves 20 logical
/// pixels below the approved floor registration (world 288): ~37 at 640x360.
/// 256-wide control, 192-high views and 4:3 presentation keep canonical Y96.
function chaos_51_fight_camera_y(cp_width,cp_height) {
    if (cp_width<=256 || cp_height<=192 || cp_width/cp_height<=1.5) return 96;
    return 96+round(16*min(1,(cp_height-192)/4));
}
/// At 256 retain the recovered split-byte predicate, including its wrap bands.
/// At wider widths both directions use the live viewport and approved PNG bounds.
/// Bounds are exclusive alpha edges, minus origin 64 plus Draw registration +1.
function chaos_51_detached_remove(cp_b,cp_s,cp_left) {
    var cp_x=chaos_51_x(cp_s);
    if (cp_b.viewport_w<=256) return cp_left ? ((cp_x&255)<64 && (cp_x>>8)<7) : ((cp_x&255)>=128 && (cp_x>>8)>=7);
    var cp_l=[-9,-9,-10,-9,-9,-9,-11,-10,-10];
    var cp_r=[12,12,12,12,13,12,13,11,11];
    var cp_frame=clamp(cp_s.frame-1,0,8);
    return cp_x+cp_r[cp_frame]<=cp_b.camera_x || cp_x+cp_l[cp_frame]>=cp_b.camera_x+cp_b.viewport_w;
}
function chaos_51_get(cp_b,cp_addr) {
    var cp_i=(cp_addr-$D540)/64;
    if (cp_i<0 || cp_i>=19 || floor(cp_i)!=cp_i) return noone;
    return cp_b.slots[cp_i];
}
function chaos_51_alloc(cp_b,cp_type,cp_param,cp_x,cp_y,cp_dynamic) {
    var cp_start=cp_dynamic ? 7 : 0, cp_end=cp_dynamic ? 18 : 16;
    for (var cp_i=cp_start;cp_i<cp_end;cp_i++) {
        if (cp_b.slots[cp_i].type!=0) continue;
        var cp_s=chaos_51_slot($D540+cp_i*64,cp_type,cp_param,cp_x,cp_y);
        cp_b.slots[cp_i]=cp_s;
        cp_b.last_child=cp_s.slot;
        array_push(cp_b.spawns,[cp_b.tick,cp_type,cp_param,cp_x,cp_y,cp_s.slot]);
        return cp_s;
    }
    cp_b.last_child=0; return noone;
}
function chaos_51_x(cp_s) { return floor(cp_s.xu/256) & $FFFF; }
function chaos_51_y(cp_s) { return floor(cp_s.yu/256) & $FFFF; }
function chaos_51_s16(cp_v) { return ((cp_v+$8000)&$FFFF)-$8000; }
function chaos_51_move(cp_s) { cp_s.xu=(cp_s.xu+cp_s.vx+16777216) mod 16777216; cp_s.yu=(cp_s.yu+cp_s.vy+16777216) mod 16777216; }
function chaos_51_defeat_check(cp_b,cp_s) {
    var cp_upper=chaos_51_get(cp_b,cp_s.upper);
    if (cp_upper!=noone && (cp_upper.state==$0E || cp_upper.state==$11)) { cp_s.requested=$10; return true; }
    return false;
}
function chaos_51_follow(cp_b,cp_s) {
    var cp_h=cp_b.head;
    if (cp_s.parameter==0) {
        cp_h.phase_counter=(cp_h.phase_counter+1)&255;
        if (cp_h.state==$0D || (cp_h.phase_counter&7)==0) cp_h.phase=(cp_h.phase+1)&255;
    }
    var cp_lower=chaos_51_get(cp_b,cp_s.lower);
    if (cp_lower!=noone && cp_lower.type==$51 && cp_lower.state!=$12) {
        if (cp_lower.state==$0B || cp_lower.state==$0F || cp_lower.state==$13 || cp_lower.state==$14) {
            cp_s.requested=cp_s.parameter==0 ? $0C : $09; return;
        }
        var cp_off=chaos_51_sway()[(cp_h.phase+cp_s.parameter)&31];
        // Follow writes integer words only, preserving the object's fractional bytes.
        cp_s.xu=((chaos_51_x(cp_lower)+cp_off[0])&$FFFF)*256+(cp_s.xu&255);
        cp_s.yu=((chaos_51_y(cp_lower)+cp_off[1])&$FFFF)*256+(cp_s.yu&255);
        return;
    }
    if (chaos_51_y(cp_s)>270) cp_s.requested=8;
    else if (chaos_51_y(cp_s)<270) cp_s.requested=cp_s.parameter==0 ? $0C : 9;
}
function chaos_51_contact(cp_b,cp_s,cp_c,cp_present,cp_detached) {
    cp_s.contact_bits=0;
    if (!cp_detached) {
        if (cp_s.parameter==0) cp_b.head.mux=(cp_b.head.mux+1) mod 5;
        if (cp_s.parameter!=(cp_b.head.mux&7)) return 0;
    }
    if (!cp_present || (cp_c.move&64)!=0 || (cp_s.flags&64)!=0 || cp_s.ex==0) return 0;
    var cp_bits=SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_51_x(cp_s),chaos_51_y(cp_s),cp_c.state==$0F ? 9 : 8,24,cp_s.ex,cp_s.ey);
    cp_s.contact_bits=cp_bits;
    if (cp_bits==0) return 0;
    chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));
    if (cp_detached) chaos_request_stage(cp_c);
    else {
        chaos_51_sound(cp_b,$AB);
        cp_c.vx=floor(cp_c.xu/256)<chaos_51_x(cp_s) ? -1024 : 1024;
    }
    return cp_bits;
}
function chaos_51_callback(cp_b,cp_s,cp_pc,cp_c,cp_present) {
    switch (cp_pc) {
        case $032F: return;
        case $03EF: if (cp_b.sound==0) chaos_51_sound(cp_b,$C4);return;
        case $9A99:
            if (cp_s.parameter!=0) return;
            cp_b.camera_right=1664; cp_s.xu=1856*256;
            var cp_y=(floor(cp_c.yu/256)-16)&255;
            cp_s.mode=cp_y<128 ? 0 : (cp_y>=224 ? 2 : 1);
            cp_s.health=cp_s.mode==0 ? 5 : (cp_s.mode==1 ? 8 : 10);
            cp_b.camera_mode=1;chaos_51_sound(cp_b,$8C);return;
        case $9AE0: if (cp_s.parameter!=0) cp_s.requested=cp_s.parameter+1; return;
        case $81A6:
            var cp_hud=chaos_51_alloc(cp_b,$12,0,0,0,false);
            if (cp_hud!=noone) cp_s.lower=cp_hud.slot;return;
        case $9B37: cp_b.selector=$14;cp_b.palette=13;return;
        case $9AED: cp_b.camera_mode=2;return;
        case $9AF7:
            if (abs(cp_b.camera_x-chaos_51_fight_camera_target(cp_b.viewport_w))<4 && abs(cp_b.camera_y-chaos_51_fight_camera_y(cp_b.viewport_w,cp_b.viewport_h))<4) { cp_s.timer=1;cp_s.pc=$9A90; } return;
        case $0407: cp_b.camera_left=cp_b.camera_x;cp_b.camera_mode=3;return;
        case $9B91: if (cp_b.head.mode!=2) cp_s.requested=6;return;
        case $A141:
            var cp_child=chaos_51_get(cp_b,cp_b.last_child);
            if (cp_child!=noone) { cp_s.lower=cp_child.slot;cp_child.upper=cp_s.slot; } return;
        case $9CAC: cp_s.health--;if (cp_s.health==0) cp_s.requested=$0E;return;
        case $9DB9: case $034A: cp_s.type=$FF;return;
        case $9E1F:
            if (chaos_51_defeat_check(cp_b,cp_s)) return;
            chaos_51_follow(cp_b,cp_s);chaos_51_contact(cp_b,cp_s,cp_c,cp_present,false);return;
        case $9E29: case $A063:
            chaos_51_follow(cp_b,cp_s);
            var cp_bits=chaos_51_contact(cp_b,cp_s,cp_c,cp_present,false);
            if (cp_pc==$9E29 && cp_bits!=0 && chaos_attack_posture(cp_c)) {
                cp_s.requested=$0D;cp_c.vy=-1024;chaos_51_sound(cp_b,$B6);
            } return;
        case $9EF9:
            chaos_51_move(cp_s);
            if (chaos_51_y(cp_s)<270) { cp_s.yu=270*256+(cp_s.yu&255);cp_s.requested=$0A; } return;
        case $9F14: case $A038:
            if (cp_pc==$9F14) {
                if (chaos_51_defeat_check(cp_b,cp_s)) return;
                chaos_51_contact(cp_b,cp_s,cp_c,cp_present,false);
            }
            cp_s.vy=chaos_51_s16(cp_s.vy+32);chaos_51_move(cp_s);
            if (chaos_51_y(cp_s)>=270) {
                cp_s.yu=270*256+(cp_s.yu&255);
                if (cp_pc==$A038) cp_s.requested=1;
                else { cp_s.timer=1;cp_s.pc=$9C0F; }
            } return;
        case $9F4E:
            if (chaos_51_defeat_check(cp_b,cp_s)) return;
            chaos_51_contact(cp_b,cp_s,cp_c,cp_present,false);chaos_51_move(cp_s);
            var cp_x=chaos_51_x(cp_s);
            if (cp_x>1810) cp_s.accel=-2;
            if (cp_x<=1802) cp_s.accel=2;
            cp_s.vx=chaos_51_s16(cp_s.vx+cp_s.accel);
            var cp_phase=cp_s.phase+1+((floor(cp_c.xu/256)+cp_s.parameter+cp_x)&3);
            cp_s.phase=cp_phase&255;
            if (cp_phase>255) {
                var cp_left=floor(cp_c.xu/256)<cp_x;
                cp_s.requested=(cp_s.parameter&1)!=0 ? (cp_left ? $13 : $14) : (cp_left ? $0B : $0F);
            } return;
        case $9FD2: case $A005: case $A06A: case $A087:
            if (chaos_51_defeat_check(cp_b,cp_s)) return;
            chaos_51_contact(cp_b,cp_s,cp_c,cp_present,true);
            var cp_left=cp_pc==$9FD2 || cp_pc==$A06A;
            if (cp_pc==$9FD2 || cp_pc==$A005) cp_s.vx=chaos_51_s16(cp_s.vx+(cp_left ? -1 : 1)*(cp_b.head.mode==0 ? 32 : 64));
            else {
                cp_s.vy=chaos_51_s16(cp_s.vy+32);
                if (chaos_51_y(cp_s)>=270) { cp_s.yu=270*256+(cp_s.yu&255);cp_s.vy=-1024; }
            }
            chaos_51_move(cp_s);
            if (chaos_51_detached_remove(cp_b,cp_s,cp_left)) cp_s.type=$FF;
            return;
        case $9D26:
            if (!cp_present || (cp_c.contacts&2)==0) return;
            cp_b.camera_left=cp_b.camera_x;cp_b.camera_right=1920;cp_b.camera_bottom=96;cp_b.camera_mode=4;
            cp_s.type=$FF;cp_b.clear=true;
            global.chaosBossNextAct=chaos_51_destination(); // numeric results/loader handoff; MGHZ room remains deferred
            chaos_51_alloc(cp_b,$0A,0,0,0,false);chaos_goal_request_state20(cp_c);return;
        // Approved $34 scripts, update parity and parameter+1 animation cycles.
        case $8C41:
            cp_s.phase=0;cp_s.remaining=cp_s.parameter;cp_s.seed=((cp_s.slot-$D500)>>6)+1;
            cp_s.requested=(cp_b.irq_counter&1)!=0 ? 1 : 2;return;
        case $8C9F: cp_s.phase=(cp_s.phase+1)&255;return;
        case $8CFD: cp_s.remaining--;if (cp_s.remaining<0) cp_s.type=$FF;return;
        case $8CA3:
            cp_s.requested=(cp_b.irq_counter&1)!=0 ? 1 : 2;
            // Presentation-only deterministic byte source stands in for $D2E2.
            var cp_r=cp_b.random_byte,cp_t=cp_b.irq_counter&255;
            cp_s.xu=(cp_s.base_x+(((cp_r^cp_s.phase)&cp_t)-cp_s.seed&15)-8)*256+(cp_s.xu&255);
            cp_s.yu=(cp_s.base_y-(((((cp_r>>1)|((cp_r&1)<<7))&(((cp_t<<1)|(cp_t>>7))&255))^(chaos_51_y(cp_s)&255))+cp_s.seed&15))*256+(cp_s.yu&255);return;
        case $9C86:
            cp_s.requested=cp_s.parameter==0 ? 2 : 1;
            if (cp_s.parameter==0) {
                global.chaosFinishTime=global.minutes*60+global.seconds;
                global.chaosBossBonus=chaos_boss_bonus(global.chaosFinishTime,global.ring);
                global.chaosBossClearScore=global.ring*10+global.chaosBossBonus.steps+500;
            } return;
        case $9C99: cp_s.xu=floor(cp_c.xu/256)*256;cp_s.yu=floor(cp_c.yu/256)*256;return;
        case $A265: cp_s.requested=1;cp_b.hud_age=0;cp_s.base_y=32;return;
        case $A26E:
            if ((cp_s.timer&1)==0) return;
            cp_b.hud_age++;cp_s.base_y=(cp_s.base_y-1)&255;
            if (((cp_s.base_y+16)&255)>=248) cp_s.type=$FF;return;
    }
}
/// $64FA + commands: load records until one callback can run; requested state is
/// consumed next visit, except the source command-0 state redirect in this visit.
function chaos_51_script(cp_b,cp_s,cp_c,cp_present) {
    if (cp_s.pc==0 || cp_s.state!=cp_s.requested) {
        cp_s.state=cp_s.requested;cp_s.pc=chaos_51_table(cp_s.type)[cp_s.state];
    } else { cp_s.timer=(cp_s.timer-1)&255;if (cp_s.timer!=0) return; }
    for (var cp_guard=0;cp_guard<128;cp_guard++) {
        var cp_r=chaos_51_record(cp_s.type,cp_s.pc);
        if (array_length(cp_r)==0) { show_debug_message("Unresolved GPZ script "+string(cp_s.pc));return; }
        cp_s.pc=cp_r[0];var cp_cmd=cp_r[1];
        if (cp_cmd==-1) {
            cp_s.timer=cp_r[2];cp_s.frame=cp_r[3];cp_s.callback=cp_r[4];
            cp_s.ex=cp_s.type==$51 && cp_s.frame>=1 && cp_s.frame<=9 ? 12 : (cp_s.type==$51 && cp_s.frame>=10 ? 4 : 0);
            cp_s.ey=cp_s.ex==12 ? 32 : (cp_s.ex==4 ? 16 : 0);return;
        }
        switch (cp_cmd) {
            case 0: cp_s.state=cp_s.requested;cp_s.pc=chaos_51_table(cp_s.type)[cp_s.state];break;
            case 1: chaos_51_callback(cp_b,cp_s,cp_r[2]+cp_r[3]*256,cp_c,cp_present);break;
            case 2: cp_s.vx=chaos_51_s16(cp_r[2]+cp_r[3]*256);cp_s.vy=chaos_51_s16(cp_r[4]+cp_r[5]*256);break;
            case 3: cp_s.requested=cp_r[2];break;
            case 4: chaos_51_alloc(cp_b,cp_r[2],cp_r[7],chaos_51_x(cp_s)+chaos_51_s16(cp_r[3]+cp_r[4]*256),chaos_51_y(cp_s)+chaos_51_s16(cp_r[5]+cp_r[6]*256),true);break;
            case 6: chaos_51_sound(cp_b,cp_r[2]);break;
            case 7: cp_s.pc=cp_r[2]+cp_r[3]*256;break;
            case 9: if (cp_r[2]==56) cp_s.accel=cp_r[3]; else if (cp_r[2]==57 && cp_r[3]==255) cp_s.accel-=256;break;
            case 12: break; // keep-alive fields: dedicated slots do not enter mapped sleep/delete
            case 14: cp_s.loop_count=cp_r[2];break;
            case 15: cp_s.loop_count--;if (cp_s.loop_count!=0) cp_s.pc=cp_r[2]+cp_r[3]*256;break;
        }
    }
}
function chaos_51_tick(cp_b,cp_vp,cp_c,cp_present) {
    cp_b.sound=0;
    cp_b.camera_x=cp_vp.left;cp_b.camera_y=cp_vp.top;cp_b.viewport_w=cp_vp.w;cp_b.viewport_h=cp_vp.h;
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=cp_b.slots[cp_i];
        if (cp_s.type==0) continue;
        if (cp_s.type==$FF) { cp_b.slots[cp_i]=chaos_51_slot(cp_s.slot,0,0,0,0);continue; }
        chaos_51_script(cp_b,cp_s,cp_c,cp_present);
        chaos_51_callback(cp_b,cp_s,cp_s.callback,cp_c,cp_present);
    }
    cp_b.tick++;
}
function chaos_51_runtime_phase() {
    if (chaos_gpz_act()!=3 || !instance_exists(OBJ_chaos_object_51)) return;
    var cp_o=instance_find(OBJ_chaos_object_51,0),cp_b=cp_o.chaosBoss51;
    var cp_p=instance_find(OBJ_player,0);
    if (!instance_exists(cp_p) || !variable_instance_exists(cp_p,"chaosCore")) return;
    var cp_vp=chaos_vp_current(),cp_c=cp_p.chaosCore;
    if (!cp_b.active) {
        // State 0 starts at CREATION, including the asleep outer band. Keepalive
        // then takes ownership; there is no THZ distance/awake-trigger gate.
        if (!SCR_chaos_placement_scan(cp_o,cp_vp,1728,270)) return;
        cp_b.active=true;
    }
    cp_b.irq_counter=cp_b.tick&255;
    cp_b.random_byte=(cp_b.tick*73+19)&255;
    chaos_51_tick(cp_b,cp_vp,cp_c,true);
    global.chaosHudSlide=-min(64,cp_b.hud_age);
    SCR_chaos_core_publish(cp_p);
}
function chaos_51_camera_step() {
    if (chaos_gpz_act()!=3 || !instance_exists(OBJ_chaos_object_51)) return;
    var cp_b=instance_find(OBJ_chaos_object_51,0).chaosBoss51;
    var cp_vp=chaos_vp_current(),cp_x=cp_vp.left,cp_y=cp_vp.top;
    if (!cp_b.active) {
        // Save the final normal-camera view, after the zone's Y override.
        // GameMaker object-follow can replace it before the next End Step.
        if (cp_vp.w>256) { cp_b.last_view_x=cp_x;cp_b.last_view_y=cp_y;cp_b.last_view_valid=true; }
        return;
    }
    if (cp_vp.w>256 && !cp_b.camera_owned && cp_b.last_view_valid) {
        cp_x=cp_b.last_view_x;cp_y=cp_b.last_view_y;
    }
    cp_b.camera_owned=true;
    __view_set(e__VW.Object,0,noone);
    if (cp_b.camera_mode==2 || cp_b.camera_mode==3) {
        // Explicit widescreen framing adapter; canonical WORLD boss X is untouched.
        var cp_target=chaos_51_fight_camera_target(cp_vp.w);
        // Wide handoff approaches from either side, never snapping to the
        // exclusive limit. Preserve the exact original sequence at width256.
        if (cp_vp.w>256) cp_x+=sign(cp_target-1-cp_x);
        else { cp_x+=sign(cp_target-cp_x);cp_x=min(cp_target-1,cp_x); }
        cp_y+=sign(chaos_51_fight_camera_y(cp_vp.w,cp_vp.h)-cp_y);
        if (cp_b.camera_mode==3) cp_b.camera_left=cp_x-1;
    } else if (instance_exists(OBJ_player)) {
        var cp_follow_x=clamp(round(instance_find(OBJ_player,0).x-cp_vp.w/2),cp_b.camera_left,cp_b.camera_right-1);
        var cp_follow_y=cp_b.camera_mode==4 ? chaos_51_fight_camera_y(cp_vp.w,cp_vp.h) : clamp(round(instance_find(OBJ_player,0).y-cp_vp.h/1.5),0,max(0,room_height-cp_vp.h));
        // Explicit wide transition adapter: bound mode1 takeover and mode4
        // release to four logical pixels/update; actors and limits stay intact.
        if (cp_vp.w>256) { cp_x+=clamp(cp_follow_x-cp_x,-4,4);cp_y+=clamp(cp_follow_y-cp_y,-4,4); }
        else { cp_x=cp_follow_x;cp_y=cp_follow_y; }
    }
    cp_b.camera_x=cp_x;cp_b.camera_y=cp_y;
    __view_set(e__VW.XView,0,cp_x);__view_set(e__VW.YView,0,cp_y);
}
