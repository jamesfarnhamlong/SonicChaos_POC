/// MGHZ3 boss $56 and projectiles $57/$58 (Research badba9d085906054e4f15fa1d1a960ca2ae0abdd; mirrored caches in
/// POC_notes/rom-cache/mghz/boss-56-*.json, generated tables in SCR_chaos_mghz_boss_data).
///
/// One live-slot interpreter. Boss, children and the shared $12 HUD / $34 puff / $0A bonus / $0F smoke objects are script slots inside the SAME 19-slot
/// array the MGHZ object bridge (SCR_chaos_mghz_m3, global.chaosM3) uses for placement occupancy and lost rings:
///   script children  $5EE1  slots 7..17 (11), failure silently skips the whole spawn command
///   HUD / bonus      $5E9C  slots 0..15 (16)
///   scheduler        $5DD1  ascending slot order; a child allocated above its parent runs in the creating update, below it in the next one
/// Each visit = animation script ($64FA) -> callback -> lifecycle ($61E1, skipped in state 0). Types $FE -> $FF -> cleared take separate visits.
/// Nothing here owns a parent pointer for $57/$58: parent defeat never removes them. Art is never mirrored.
///
/// GAMEMAKER ADAPTERS (not ROM behaviour), each isolated below:
///   * WIDESCREEN ARENA FRAMING: width 256 is the canonical camera ((3061,256) pan target, settled (3060,256), 1 px/update). Wider views reframe horizontally so
///     the boss stays at screen X = viewWidth-48 (nominal; settled viewWidth-47, the same exclusive-limit pixel as 256) with camera Y fixed at 256; the pan is
///     bounded to 4 logical px/update and never waits for / gates combat. Boss/world/terrain anchors never move.
///   * PLAYER EDGE CLAMP and $5FA0 side guards use the live viewport edges (LEFT+16..RIGHT-9, LEFT+32 / RIGHT-32), without the SMS low-byte wrap.
///   * $57/$58 lifetime uses the actual viewport edges with canonical margins (no mapped-enemy retention). The even-counter early removal stays at the
///     canonical raw screenX < 176 && screenY >= 120 (8-bit wrapped screen coordinates at 256; plain signed screen X in a wider view).
///   * the frame counter D12F is the shared MGHZ effect frame counter; $D2E2 (used only by $34 jitter) is a deterministic presentation stand-in.
function chaos_56_slot(cp_type,cp_param,cp_x,cp_y,cp_token) {
    var cp_s=chaos_m3_slot(cp_type,cp_param,cp_x,cp_y,cp_token);
    cp_s.boss=true; cp_s.external=false; cp_s.asleep=false; cp_s.woken=true;
    cp_s.pc=0; cp_s.timer=0; cp_s.callback=0; cp_s.loop_count=0; cp_s.ex=0; cp_s.ey=0;
    cp_s.saved_x=cp_x; cp_s.saved_y=cp_y; cp_s.saved_frame=0; cp_s.hp=0; cp_s.cooldown=0;
    cp_s.hud=-1; cp_s.flag7=false; cp_s.limit_right=0; cp_s.sx=0; cp_s.sy=0; cp_s.contact=0;
    cp_s.remaining=0; cp_s.seed=0; cp_s.phase=0; cp_s.anim=0; cp_s.src_type=0; cp_s.bit0=false;
    return cp_s;
}
function chaos_56_new() {
    return {active:false,created:false,tick:0,d12f:0,random_byte:0,sound:0,
        camera_mode:0,camera_left:0,camera_right:CHAOS_56_RIGHT_LIMIT,camera_x:0,camera_y:0,viewport_w:256,viewport_h:192,
        cam_lead:-1,frozen:false,camera_owned:false,last_view_valid:false,last_view_x:0,last_view_y:0,
        palette:0,selector:0,hud_y:32,hud_count:0,flash:[],flash_white:false,
        clear:false,screen_pass:true,latch_clear:true,spawns:[],last_spawn:-1,hits:[],defeated_tick:-1,clear_tick:-1,pan_target_x:0};
}
function chaos_56_x(cp_s) { return floor(cp_s.xu/256) & $FFFF; }
function chaos_56_y(cp_s) { return floor(cp_s.yu/256) & $FFFF; }
function chaos_56_s16(cp_v) { return ((cp_v+$8000)&$FFFF)-$8000; }
function chaos_56_sound(cp_b,cp_sound) { cp_b.sound=cp_sound; global.chaosLastSoundRequest=cp_sound; }
/// $0338: 24-bit position += sign-extended 8.8 velocity.
function chaos_56_move(cp_s) {
    cp_s.xu=(cp_s.xu+cp_s.vx+16777216) mod 16777216;
    cp_s.yu=(cp_s.yu+cp_s.vy+16777216) mod 16777216;
}
function chaos_56_find(cp_b,cp_type) {
    var cp_m=global.chaosM3;
    for (var cp_i=0;cp_i<19;cp_i++) if (cp_m.slots[cp_i].boss && cp_m.slots[cp_i].type == cp_type) return cp_i;
    return -1;
}
/// $5EE1 (dynamic, 7..17) / $5E9C (16-slot) first-free allocation.
function chaos_56_alloc(cp_b,cp_type,cp_param,cp_x,cp_y,cp_dynamic) {
    var cp_m=global.chaosM3;
    var cp_free=cp_dynamic ? chaos_object_free_slot(cp_m.slots,7,18) : chaos_object_free_slot(cp_m.slots,0,16);
    cp_b.last_spawn=cp_free;
    if (cp_free < 0) return -1;
    var cp_s=chaos_56_slot(cp_type,cp_param,cp_x,cp_y,0);
    cp_m.slots[cp_free]=cp_s;
    array_push(cp_b.spawns,[cp_b.tick,cp_type,cp_param,cp_x,cp_y,cp_free]);
    return cp_free;
}
// ---- camera limits (D280 left, D282 right, D27E bottom) ---------------------------------------------------------------
/// $8199: raise the left limit to the camera; remember the current right limit in +$25/+$27.
function chaos_56_left_limit(cp_b,cp_s,cp_vp) {
    if (cp_b.camera_left < cp_vp.left) cp_b.camera_left=cp_vp.left;
    cp_s.limit_right=cp_b.camera_right;
}
/// Horizontal camera target of the locked arena. WIDTH 256 = canonical pan target (3061); wider views keep the boss at
/// RIGHT-48: cameraX = anchorX - (width - 48). The exclusive limit makes the settled camera one pixel short, as at 256.
function chaos_56_target_x(cp_w) { return CHAOS_56_ANCHOR_X-(cp_w-CHAOS_56_RIGHT_FRAME); }
function chaos_56_trigger(cp_s,cp_c) {
    return abs(chaos_56_x(cp_s)-floor(cp_c.xu/256)) < CHAOS_56_TRIGGER_X && abs(chaos_56_y(cp_s)-floor(cp_c.yu/256)) < CHAOS_56_TRIGGER_Y;
}
/// $A6B8: rising (+$19 bit 7 set) and Y < 288.  $A69F: not rising and Y >= 430.
function chaos_56_rise_turn(cp_s) { return cp_s.vy < 0 && chaos_56_y(cp_s) < CHAOS_56_RISE_Y; }
function chaos_56_floor_hit(cp_s) { return cp_s.vy >= 0 && chaos_56_y(cp_s) >= CHAOS_56_FALL_Y; }
// ---- player contact ($A62D, $5FA0, $8105) ------------------------------------------------------------------------------------
/// Boss geometry: object extents come from the current frame; Sonic is 8x24 (9x24 in state $0F). Closed intervals, minimum penetration, vertical wins ties.
function chaos_56_bits(cp_s,cp_c,cp_bypass) {
    if (!cp_bypass && (cp_c.move & 64) != 0) return 0;   // $6328: hurt/dying player reports no contact unless the object sets +$03 bit 7
    return SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_56_x(cp_s),chaos_56_y(cp_s),cp_c.state == $0F ? 9 : 8,24,cp_s.ex,cp_s.ey);
}
/// $5FA0: full solid projection with the D523 terrain guards and the EDGE(LEFT,+32) / EDGE(RIGHT,-32) side guards of the LIVE view.
/// Returns [x,y] (integer anchors). cp_terrain is the D523 low nibble (1 top-blocked, 2 bottom-blocked, 4 right wall, 8 left wall).
function chaos_56_project(cp_bits,cp_px,cp_py,cp_ox,cp_oy,cp_pex,cp_oex,cp_oey,cp_terrain,cp_vp) {
    var cp_x=cp_px,cp_y=cp_py;
    if (cp_bits == 1 && (cp_terrain & 1) == 0) cp_y=cp_oy-cp_oey;
    else if (cp_bits == 2 && (cp_terrain & 2) == 0) cp_y=cp_oy+24;
    else if (cp_bits == 8 && (cp_terrain & 8) == 0 && chaos_vp_edge(cp_vp,CHAOS_VP_LEFT,CHAOS_56_GUARD_LEFT) < cp_px) cp_x=cp_ox-cp_pex-cp_oex;
    else if (cp_bits == 4 && (cp_terrain & 4) == 0 && cp_px <= chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,CHAOS_56_GUARD_RIGHT)) cp_x=cp_ox+cp_pex+cp_oex;
    return [cp_x,cp_y];
}
/// $8105: request player state $1B and write the response speeds; movement/floor flags are preserved.
function chaos_56_reaction(cp_c,cp_bits) {
    if (cp_bits == 4) { cp_c.vx=1536; cp_c.vy=-cp_c.vy; }
    else if (cp_bits == 8) { cp_c.vx=-1536; cp_c.vy=-cp_c.vy; }
    else if (cp_bits == 2) cp_c.vy=1536;
    else cp_c.vy=-1024;
    cp_c.next=27;
}
/// $0374 command 7: the sprite-palette flash command (entries 13/14 white for command calls 4..7), four command slots.
function chaos_56_queue_flash(cp_b) {
    if (array_length(cp_b.flash) < CHAOS_56_FLASH_SLOTS) array_push(cp_b.flash,0);
}
function chaos_56_flash_step(cp_b) {
    var cp_keep=[];
    cp_b.flash_white=false;
    for (var cp_i=0;cp_i<array_length(cp_b.flash);cp_i++) {
        var cp_n=cp_b.flash[cp_i]+1;
        if (cp_n >= CHAOS_56_FLASH_FIRST && cp_n <= CHAOS_56_FLASH_LAST) cp_b.flash_white=true;
        if (cp_n < CHAOS_56_FLASH_END) array_push(cp_keep,cp_n);
    }
    cp_b.flash=cp_keep;
}
/// $A62D. cp_allow = A: 255 vulnerable combat call, 0 nonvulnerable. Returns the contact bits. cp_p is the player instance (death hand-off only).
function chaos_56_contact(cp_b,cp_s,cp_c,cp_present,cp_allow,cp_vp,cp_p) {
    if (cp_s.cooldown != 0) cp_s.cooldown--;                      // every call, including no-overlap/nonvulnerable ones
    cp_s.contact=0;
    if (!cp_present) return 0;
    var cp_bits=chaos_56_bits(cp_s,cp_c,cp_s.flag7);
    if (cp_bits == 0) return 0;
    cp_s.contact=cp_bits;
    var cp_pex=cp_c.state == $0F ? 9 : 8;
    var cp_terrain=cp_c.bg & 15;                                   // D523: terrain-side contact flags (the floor bit D522.1 below is the merged support byte)
    var cp_pos=chaos_56_project(cp_bits,floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_56_x(cp_s),chaos_56_y(cp_s),cp_pex,cp_s.ex,cp_s.ey,cp_terrain,cp_vp);
    cp_c.xu=cp_pos[0]*256+(cp_c.xu&255); cp_c.yu=cp_pos[1]*256+(cp_c.yu&255);
    // below-classified contact with floor bit 1 set: $0425 -> $4984 player death setup (sound $96), before any attack handling
    if (cp_bits == 2 && (cp_c.contacts & 2) != 0) {
        SCR_cc_crush_death(cp_c);
        if (cp_p != noone) SCR_chaos_hurt_apply(cp_p);
    }
    var cp_attack=chaos_attack_posture(cp_c);                       // D503 bit 1 only: not airborne, not the visual frame, not invincibility
    if (cp_allow == 0) {
        if (cp_attack) chaos_56_reaction(cp_c,cp_bits); else chaos_request_stage(cp_c);
        return cp_bits;
    }
    if (!cp_attack) { chaos_request_stage(cp_c); return cp_bits; }
    chaos_56_reaction(cp_c,cp_bits);
    chaos_56_sound(cp_b,CHAOS_56_SND_ATTACK);
    if (cp_bits != 1 || cp_s.cooldown != 0) return cp_bits;
    cp_s.cooldown=CHAOS_56_COOLDOWN;
    chaos_56_queue_flash(cp_b);
    cp_s.hp=cp_s.hp-1;
    array_push(cp_b.hits,[cp_b.tick,cp_s.hp<0 ? 255 : cp_s.hp]);
    if (cp_s.hp < 0) { cp_s.hp=255; cp_s.requested=4; cp_b.defeated_tick=cp_b.tick; }
    return cp_bits;
}
/// $A77F / $0434 -> $6328: closed overlap, queue the damage request. No projection and no attack branch.
function chaos_56_damage_contact(cp_s,cp_c,cp_present) {
    if (!cp_present) return 0;
    var cp_bits=chaos_56_bits(cp_s,cp_c,cp_s.flag7);
    if (cp_bits != 0) chaos_request_stage(cp_c);
    return cp_bits;
}
/// $5F54: conversion to smoke $0F (state/timer/script cleared; token and parameter zero; position kept).
function chaos_56_convert(cp_s) {
    cp_s.src_type=cp_s.type;                                         // presentation: the saved frame is shown for the conversion update
    cp_s.type=$0F; cp_s.state=0; cp_s.requested=0; cp_s.timer=0; cp_s.pc=0;
    cp_s.keep=false; cp_s.asleep=false; cp_s.bit0=false; cp_s.token=0; cp_s.parameter=0;
    cp_s.loop_count=0;                                                // frame, extents and callback are NOT cleared by $5F54
}
/// $A761 early-removal gate on EVEN counters: raw screenX < 176 AND raw screenY >= 120. The ROM compares the low bytes of the screen coordinates
/// of the PREVIOUS update's sprite pass; at width 256 that 8-bit wrap is kept, in a wider view the signed screen X is compared (the wrap would
/// make the gate fire at arbitrary places in a view wider than 256). Screen Y is the same fixed relationship at every width.
function chaos_56_early_removal(cp_b,cp_s) {
    if ((cp_b.d12f & 1) != 0) return false;
    var cp_sx=cp_b.viewport_w > 256 ? cp_s.sx : (cp_s.sx & 255);
    return cp_sx < CHAOS_56_EARLY_X && (cp_s.sy & 255) >= CHAOS_56_EARLY_Y;
}
// ---- callbacks ---------------------------------------------------------------------------------------------------------------
/// $81A6 -> $5E9C. The slot's +$3F byte receives register H, a leftover of the calling routine ($97 from $974C, $D4 from $A576); $12 never reads it.
function chaos_56_hud_alloc(cp_b,cp_s,cp_h) {
    var cp_i=chaos_56_alloc(cp_b,$12,cp_h,0,0,false);
    cp_s.hud=cp_i < 0 ? 16 : cp_i;                                  // allocator failure leaves IY at slot 16
}
function chaos_56_callback(cp_b,cp_s,cp_pc,cp_c,cp_present,cp_vp,cp_p) {
    var cp_m=global.chaosM3;
    switch (cp_pc) {
        case $032F: return;
        // ---- shared boss framework (state 0..3) ----
        case $974C:
            cp_s.keep=true;
            global.chaosMghzBossActive=true;                       // D44E = zone+1: freezes the $1A8/$1A9 strip slot
            chaos_56_hud_alloc(cp_b,cp_s,$97);
            if (cp_b.camera_mode == 0) cp_b.camera_mode=1;
            chaos_56_left_limit(cp_b,cp_s,cp_vp);
            cp_s.requested=1;
            if (cp_present && cp_c.next == 18) cp_c.next=14;        // requested Spring Shoes $12 -> fall $0E (the recovered sign/boss conversion)
            return;
        case $9771:
            chaos_56_left_limit(cp_b,cp_s,cp_vp);
            if (!cp_present || !chaos_56_trigger(cp_s,cp_c)) return;
            if (cp_b.camera_right >= cp_vp.left) cp_b.camera_right=cp_vp.left;   // $0356: right limit := camera
            cp_b.camera_mode=2;
            cp_s.requested=2;
            return;
        case $97C1:
            if (cp_m.slots[cp_s.hud].type != 0) return;            // waits for the HUD slot's type byte to clear
            // the pan routine runs in the next camera phase; the POC camera step follows the object phase, which is that phase
            cp_b.camera_mode=3;
            cp_s.requested=3;
            return;
        case $A576:
            cp_b.selector=$16; cp_b.palette=15;
            chaos_56_hud_alloc(cp_b,cp_s,$D4);
            cp_s.flag7=true; cp_s.hp=CHAOS_56_HP; cp_s.requested=$0B; cp_s.cooldown=0;
            return;
        // ---- combat ----
        case $A597:
            if (chaos_56_rise_turn(cp_s)) { cp_s.requested=$0B; return; }
            if (chaos_56_floor_hit(cp_s)) { cp_s.requested=6; return; }
            chaos_56_move(cp_s);
            chaos_56_contact(cp_b,cp_s,cp_c,cp_present,255,cp_vp,cp_p);
            return;
        case $A5B7: cp_s.requested=chaos_56_throw_selector(cp_b.d12f); return;      // $A5FD: 8 + ((D12F + ROM[$0200+D12F]) & 1), table from the cache
        case $A5BA:
            chaos_56_contact(cp_b,cp_s,cp_c,cp_present,255,cp_vp,cp_p);
            chaos_56_move(cp_s);
            cp_s.vx=chaos_56_s16(-cp_s.vx);
            return;
        case $A5C6:
            // $A613: B=6; playerY < bodyY (carry) keeps 6. Otherwise CALL $A69F and JR Z - the branch tests the Z FLAG the routine leaves behind (its
            // LD A,n does not touch flags), which is set only for a non-rising body whose Y is exactly 430. Every other case (rising, or any other Y) gives 7.
            // The Research scheduler oracle (state 8 at Y 333 -> 7) confirms the flag reading.
            cp_s.requested=6;
            if (cp_present && floor(cp_c.yu/256) >= chaos_56_y(cp_s) && !(cp_s.vy >= 0 && chaos_56_y(cp_s) == CHAOS_56_FALL_Y)) cp_s.requested=7;
            return;
        case $A5C9:
            cp_s.xu=cp_s.saved_x*256+(cp_s.xu&255);
            chaos_56_contact(cp_b,cp_s,cp_c,cp_present,255,cp_vp,cp_p);
            return;
        case $A5DA:
            chaos_56_contact(cp_b,cp_s,cp_c,cp_present,0,cp_vp,cp_p);
            return;
        case $A5E0:
            chaos_56_move(cp_s);
            chaos_56_contact(cp_b,cp_s,cp_c,cp_present,0,cp_vp,cp_p);
            cp_s.vy=chaos_56_s16(cp_s.vy+24);
            if (chaos_56_floor_hit(cp_s)) { chaos_56_sound(cp_b,CHAOS_56_SND_LANDING); cp_s.requested=$0C; }
            return;
        // ---- defeat: state-4 frame preservation, then the state-5 clear gate ----
        // +$38 is shared: the hit cooldown during combat, the saved frame during the defeat records (the boss no longer runs contact then)
        case $9A1E: cp_s.timer=1; cp_s.cooldown=cp_s.frame; return;
        case $9A29: cp_s.timer=1; cp_s.frame=cp_s.cooldown; return;
        case $9A2F: cp_s.timer=4; cp_s.frame=cp_s.cooldown; return;
        case $81BD:
            cp_b.camera_mode=4;                                     // $035C pan disabled; $0353-restored right limit
            cp_b.camera_right=cp_vp.w > 256 ? room_width-cp_vp.w : cp_s.limit_right;   // worldWidth-viewportWidth (3584 at 256), exclusive
            if (!cp_present) return;
            if (floor(cp_c.xu/256) < CHAOS_56_CLEAR_X || (cp_c.contacts & 2) == 0) return;   // WORLD(playerX) >= 3356 AND floor bit 1
            chaos_goal_request_state20(cp_c);                       // $03F5 -> $4892 (also requests the act-clear jingle $97)
            chaos_56_sound(cp_b,CHAOS_56_SND_CLEAR);
            chaos_56_alloc(cp_b,$0A,0,0,0,false);                   // bonus / sparkle controller
            cp_b.clear=true; cp_b.clear_tick=cp_b.tick;
            global.chaosBossNextAct=chaos_56_destination();
            chaos_56_convert(cp_s);                                 // $033E: smoke $0F, token 0 (occupancy byte stays set); the timer keeps running
            return;
        // ---- $57 / $58 ----
        case $A724: cp_s.requested=1; cp_s.bit0=true; return;                // SET 0,(IX+4)
        case $A77F: chaos_56_damage_contact(cp_s,cp_c,cp_present); return;
        case $A72D:
            if (cp_s.parameter == 0) { cp_s.requested=2; cp_s.vx=-512; }
            else {
                cp_s.yu=((chaos_56_y(cp_s)-8)&$FFFF)*256+(cp_s.yu&255);
                cp_s.requested=3; cp_s.vx=-544;
            }
            cp_s.vy=0;
            return;
        case $A79A:
            cp_s.vx=-544; cp_s.vy=cp_s.parameter == 0 ? -112 : 112;
            cp_s.requested=1;
            return;
        case $A761:
            if (cp_s.asleep) { cp_s.parameter=0; chaos_56_convert(cp_s); return; }
            chaos_56_move(cp_s);
            if (chaos_56_early_removal(cp_b,cp_s)) { cp_s.parameter=0; chaos_56_convert(cp_s); return; }
            chaos_56_damage_contact(cp_s,cp_c,cp_present);
            return;
        // ---- shared $12 HUD slide ----
        case $A265: cp_s.keep=true; cp_s.requested=1; return;
        case $A26E:
            if ((cp_s.timer & 1) == 0) return;
            cp_b.hud_y=(cp_b.hud_y-1)&255; cp_b.hud_count++;
            if (((cp_b.hud_y+16)&255) >= 248) cp_s.type=$FF;
            return;
        // ---- shared $34 puff ----
        case $8C41:
            cp_s.keep=false; cp_s.asleep=false;                     // (IX+4) := 0
            cp_s.phase=0; cp_s.anim=0; cp_s.remaining=cp_s.parameter;
            cp_s.saved_x=chaos_56_x(cp_s); cp_s.saved_y=chaos_56_y(cp_s);
            cp_s.seed=chaos_56_slot_index(cp_s)+2;                  // $0332: slot index + 2
            cp_s.requested=(cp_b.d12f & 1) != 0 ? 1 : 2;
            return;
        case $8C9F: cp_s.anim=(cp_s.anim+1)&255; return;
        case $8CFD:
            cp_s.remaining--;
            if (cp_s.remaining < 0) cp_s.type=$FF;
            return;
        case $8CA3:
            cp_s.requested=(cp_b.d12f & 1) != 0 ? 1 : 2;
            // $D2E2 jitter: deterministic presentation stand-in; initial offsets from the cache stay exact
            var cp_r=cp_b.random_byte,cp_t=cp_b.d12f&255;
            cp_s.xu=(cp_s.saved_x+((((cp_r^cp_s.anim)&cp_t)-cp_s.seed)&15)-8)*256+(cp_s.xu&255);
            var cp_ry=(((((cp_r>>1)|((cp_r&1)<<7))&(((cp_t<<1)|(cp_t>>7))&255))^(chaos_56_y(cp_s)&255))+cp_s.seed)&15;
            cp_s.yu=(cp_s.saved_y-cp_ry)*256+(cp_s.yu&255);
            return;
        // ---- shared $0A bonus / sparkle ----
        case $9C86:
            cp_s.requested=1;
            if (cp_s.parameter != 0) return;
            cp_s.requested=2;
            global.chaosFinishTime=global.minutes*60+global.seconds;
            global.chaosBossBonus=chaos_boss_bonus(global.chaosFinishTime,global.ring);
            global.chaosBossClearScore=global.ring*10+global.chaosBossBonus.steps+500;
            if (cp_present) { cp_s.xu=floor(cp_c.xu/256)*256; cp_s.yu=floor(cp_c.yu/256)*256; }
            return;
        case $9C99:
            if (cp_present) { cp_s.xu=floor(cp_c.xu/256)*256; cp_s.yu=floor(cp_c.yu/256)*256; }
            return;
        // ---- shared $0F smoke (parameter 0 reaches state 1; $FF would be the moving variant, never requested here) ----
        case $A060:
            if (cp_s.parameter == $FF) { cp_s.requested=4; return; }
            cp_s.requested=1; cp_s.keep=false; cp_s.bit0=true;       // $A089: RES 4 / SET 0,(IX+4)
            return;
        case $03EF: if (cp_b.sound == 0) chaos_56_sound(cp_b,CHAOS_56_SND_EXPLOSION); return;
        case $A0C6: cp_s.type=$FF; return;
        case $A0E7: return;
        case $034A: cp_s.type=$FE; return;
    }
}
function chaos_56_slot_index(cp_s) {
    var cp_m=global.chaosM3;
    for (var cp_i=0;cp_i<19;cp_i++) if (cp_m.slots[cp_i] == cp_s) return cp_i;
    return 0;
}
// ---- the script engine ($64FA) ---------------------------------------------------------------------------------------------
function chaos_56_load_frame(cp_s) {
    var cp_e=chaos_56_extent(cp_s.type,cp_s.frame);                  // +$2C/+$2D from the frame's mapping record
    cp_s.ex=cp_e[0]; cp_s.ey=cp_e[1];
}
function chaos_56_script(cp_b,cp_s,cp_c,cp_present,cp_vp,cp_p) {
    if (cp_s.pc == 0 || cp_s.state != cp_s.requested) {
        cp_s.state=cp_s.requested; cp_s.pc=chaos_56_table(cp_s.type)[cp_s.state];
    } else { cp_s.timer=(cp_s.timer-1)&255; if (cp_s.timer != 0) return; }
    for (var cp_guard=0;cp_guard<128;cp_guard++) {
        var cp_r=chaos_56_record(cp_s.type,cp_s.pc);
        if (array_length(cp_r) == 0) { show_debug_message("Unresolved MGHZ boss script "+string(cp_s.type)+":"+string(cp_s.pc)); return; }
        cp_s.pc=cp_r[0]; var cp_cmd=cp_r[1];
        if (cp_cmd == -1) {
            cp_s.timer=cp_r[2]; cp_s.frame=cp_r[3]; cp_s.callback=cp_r[4];
            chaos_56_load_frame(cp_s); return;
        }
        switch (cp_cmd) {
            case 0: cp_s.state=cp_s.requested; cp_s.pc=chaos_56_table(cp_s.type)[cp_s.state]; break;
            case 1: chaos_56_callback(cp_b,cp_s,cp_r[2],cp_c,cp_present,cp_vp,cp_p); break;
            case 2: cp_s.vx=chaos_56_s16(cp_r[2]); cp_s.vy=chaos_56_s16(cp_r[3]); break;
            case 3: cp_s.requested=cp_r[2]; break;
            case 4:
                var cp_i=chaos_56_alloc(cp_b,cp_r[2],cp_r[5],(chaos_56_x(cp_s)+cp_r[3])&$FFFF,(chaos_56_y(cp_s)+cp_r[4])&$FFFF,true);
                break;
            case 5:
                // record whose callback is the 2nd operand and whose timer/frame come from the called routine
                cp_s.callback=cp_r[3];
                chaos_56_callback(cp_b,cp_s,cp_r[2],cp_c,cp_present,cp_vp,cp_p);
                chaos_56_load_frame(cp_s);
                return;
            case 6: chaos_56_sound(cp_b,cp_r[2]); break;
            case 7: cp_s.pc=cp_r[2]; break;
            case 14: cp_s.loop_count=cp_r[2]; break;
            case 15: cp_s.loop_count--; if (cp_s.loop_count != 0) cp_s.pc=cp_r[2]; break;
        }
    }
}
/// $61E1, after every state != 0 visit. Bit 6 = outside the interior (asleep); outside the outer band the object is removed unless +$04 bit 1 keeps it.
function chaos_56_lifecycle(cp_b,cp_s,cp_vp) {
    cp_s.asleep=false;
    var cp_cell=SCR_chaos_spawn_cell(cp_vp,chaos_56_x(cp_s),chaos_56_y(cp_s));
    if (cp_cell < 3) { if ((cp_cell & 2) != 0) cp_s.asleep=true; return; }
    cp_s.asleep=true;
    if (cp_s.keep) return;
    cp_s.type=cp_s.token != 0 ? $FE : $FF; cp_s.state=0;
}
function chaos_56_visit(cp_b,cp_i,cp_c,cp_present,cp_vp,cp_p) {
    var cp_m=global.chaosM3,cp_s=cp_m.slots[cp_i];
    if (!cp_s.boss || cp_s.type == 0) return;
    if (cp_s.type == $FE) { cp_s.type=$FF; cp_s.state=0; return; }
    if (cp_s.type == $FF) {
        if (cp_s.token != 0) chaos_m3_release(cp_m,cp_s);        // $5EF8: placement occupancy byte cleared
        cp_m.slots[cp_i]=chaos_m3_slot(0,0,0,0,0);
        return;
    }
    chaos_56_script(cp_b,cp_s,cp_c,cp_present,cp_vp,cp_p);
    if (cp_s.callback != 0) chaos_56_callback(cp_b,cp_s,cp_s.callback,cp_c,cp_present,cp_vp,cp_p);
    if (cp_s.state != 0) chaos_56_lifecycle(cp_b,cp_s,cp_vp);       // $5E29: state 0 skips $61E1
}
function chaos_56_tick(cp_b,cp_vp,cp_c,cp_present,cp_p) {
    if (cp_b.latch_clear) cp_b.sound=0;                              // the sound engine consumes DE04 every frame (the Research lab never does)
    cp_b.viewport_w=cp_vp.w; cp_b.viewport_h=cp_vp.h; cp_b.camera_x=cp_vp.left; cp_b.camera_y=cp_vp.top;
    var cp_m=global.chaosM3;
    for (var cp_i=0;cp_i<19;cp_i++) chaos_56_visit(cp_b,cp_i,cp_c,cp_present,cp_vp,cp_p);
    chaos_56_flash_step(cp_b);
    // sprite pass: screen coordinates the NEXT update's callbacks read (the Research scheduler lab never runs it: screen_pass=false keeps them 0)
    for (var cp_k=0;cp_k<19 && cp_b.screen_pass;cp_k++) {
        var cp_s=cp_m.slots[cp_k];
        if (!cp_s.boss || cp_s.type == 0) continue;
        cp_s.sx=chaos_56_x(cp_s)-cp_vp.left; cp_s.sy=chaos_56_y(cp_s)-cp_vp.top;
    }
    cp_b.tick++;
}
// ---- object phase ------------------------------------------------------------------------------------------------------------
/// True from boss creation until the room ends: the boss owns the camera and the player edge clamp.
function chaos_56_owns_camera() {
    return chaos_mghz_act() == 3 && instance_exists(OBJ_chaos_object_56) && instance_find(OBJ_chaos_object_56,0).chaosBoss56.active;
}
/// Runs after the player's whole pass (player/terrain first, then the ascending-slot scheduler), before platforms/spikes.
function chaos_56_runtime_phase() {
    if (chaos_mghz_act() != 3 || !instance_exists(OBJ_chaos_object_56) || !variable_global_exists("chaosM3")) return;
    var cp_b=instance_find(OBJ_chaos_object_56,0).chaosBoss56;
    var cp_p=chaos_goal_player(),cp_c=noone,cp_present=false;
    if (cp_p != noone) { cp_c=cp_p.chaosCore; cp_present=true; }
    if (!cp_b.created) {
        // Creation belongs to the mapped placement scan (SCR_chaos_mghz_m3), which builds the script slot at the EDGE bands.
        if (chaos_56_find(cp_b,$56) < 0) return;
        cp_b.created=true; cp_b.active=true;
    }
    cp_b.d12f=variable_global_exists("chaosMghzEffects") ? (global.chaosMghzEffects.frame & 255) : (cp_b.tick & 255);
    cp_b.random_byte=(cp_b.tick*73+19) & 255;
    chaos_56_tick(cp_b,chaos_vp_current(),cp_c,cp_present,cp_p);
    global.chaosHudSlide=-min(64,cp_b.hud_count);
    // contact may have projected Sonic; a death hand-off (instance_change) leaves nothing to publish
    var cp_after=chaos_goal_player();
    if (cp_present && cp_after != noone) SCR_chaos_core_publish(cp_after);
}
// ---- camera (explicit presentation adapter; see header) ----------------------------------------------------------------------------
function chaos_56_follow_x(cp_b,cp_vp,cp_player_x) {
    var cp_hi=max(cp_b.camera_left,min(cp_b.camera_right,room_width-cp_vp.w));
    return clamp(round(cp_player_x-cp_vp.w/2),cp_b.camera_left,cp_hi);
}
/// The zone's capped MGHZ vertical follow (+-7 per update at 256).
function chaos_56_follow_y(cp_vp,cp_player_y,cp_cur_y) {
    var cp_target=clamp(round(cp_player_y-cp_vp.h/1.5),0,max(0,room_height-cp_vp.h));
    return cp_cur_y+clamp(cp_target-cp_cur_y,-7,7);
}
/// Wide views never jump while following Sonic into the lock: convergence is limited to 4 logical px/update.
function chaos_56_step_cap(cp_c) { return 4; }
/// Shared $5832 horizontal step. cp_k = playerX - camera (the low byte at width 256), cp_lead = the working lead D28A. Deadzone lead+-8, +7 right cap,
/// -7 left cap with the exact -8..-1 range preserved. No player velocity is read.
function chaos_56_follow_delta(cp_k,cp_lead) {
    var cp_lo=cp_lead-CHAOS_56_DEADZONE,cp_hi=cp_lead+CHAOS_56_DEADZONE;
    if (cp_k < cp_lo) { var cp_d=cp_k-cp_lo; return cp_d >= -CHAOS_56_DEADZONE ? cp_d : CHAOS_56_FOLLOW_LEFT; }
    if (cp_k <= cp_hi) return 0;
    var cp_u=cp_k-cp_hi;
    return cp_u < CHAOS_56_DEADZONE ? cp_u : CHAOS_56_FOLLOW_RIGHT;
}
/// $4CB0: a step that would leave [left, right) is dropped entirely (rejected, never clamped to the boundary).
function chaos_56_limit_delta(cp_x,cp_delta,cp_left,cp_right) {
    if (cp_delta < 0) return (cp_x+cp_delta < cp_left || cp_x+cp_delta < 0) ? 0 : cp_delta;
    if (cp_delta > 0) return cp_x+cp_delta >= cp_right ? 0 : cp_delta;
    return 0;
}
/// Working lead after the $58E1 slew (1 px/update toward the facing target): 104 right / 136 left at 256.
/// GAMEMAKER ADAPTER: in a wider view the same relationships are CENTER-24 / CENTER+8.
function chaos_56_lead_target(cp_w,cp_left_facing) {
    if (cp_w > 256) return floor(cp_w/2)+(cp_left_facing ? CHAOS_56_LEAD_LEFT-128 : CHAOS_56_LEAD_RIGHT-128);
    return cp_left_facing ? CHAOS_56_LEAD_LEFT : CHAOS_56_LEAD_RIGHT;
}
/// One post-defeat horizontal follow update. Returns the new camera X and advances cp_b.cam_lead.
function chaos_56_post_defeat_x(cp_b,cp_w,cp_x,cp_px,cp_left_facing) {
    var cp_target=chaos_56_lead_target(cp_w,cp_left_facing);
    if (cp_b.cam_lead < 0) cp_b.cam_lead=chaos_56_lead_target(cp_w,false);
    cp_b.cam_lead+=clamp(cp_target-cp_b.cam_lead,-CHAOS_56_LEAD_SLEW,CHAOS_56_LEAD_SLEW);
    var cp_d=0;
    if (cp_w > 256) cp_d=clamp(chaos_56_follow_delta(cp_px-cp_x,cp_b.cam_lead),-4,4);   // explicit smooth adapter, both directions
    else if (cp_px != cp_x) cp_d=chaos_56_follow_delta((cp_px-cp_x)&255,cp_b.cam_lead); // canonical: low byte of the difference, exact zero bypasses
    return cp_x+chaos_56_limit_delta(cp_x,cp_d,cp_b.camera_left,cp_b.camera_right);
}
function chaos_56_pan(cp_b,cp_vp,cp_x,cp_y) {
    var cp_tx=chaos_56_target_x(cp_vp.w),cp_ty=CHAOS_56_CAMERA_Y;
    if (cp_vp.w > 256) {
        cp_x+=clamp(cp_tx-1-cp_x,-4,4); cp_y+=clamp(cp_ty-cp_y,-4,4);
    } else {
        // canonical $5956: +-1 on both axes at once; the exclusive right limit stops an approach from the left one pixel short
        if (cp_x < cp_tx) cp_x=min(cp_x+1,cp_tx-1); else if (cp_x > cp_tx) cp_x--;
        cp_y+=sign(cp_ty-cp_y);
    }
    return [cp_x,cp_y];
}
function chaos_56_camera_step() {
    if (chaos_mghz_act() != 3 || !instance_exists(OBJ_chaos_object_56)) return;
    var cp_b=instance_find(OBJ_chaos_object_56,0).chaosBoss56;
    var cp_vp=chaos_vp_current(),cp_x=cp_vp.left,cp_y=cp_vp.top;
    if (!cp_b.active) {
        // Remember the final normal camera (after the zone's Y step) for the first takeover.
        if (cp_vp.w > 256) { cp_b.last_view_x=cp_x; cp_b.last_view_y=cp_y; cp_b.last_view_valid=true; }
        return;
    }
    if (cp_vp.w > 256 && !cp_b.camera_owned && cp_b.last_view_valid) { cp_x=cp_b.last_view_x; cp_y=cp_b.last_view_y; }
    cp_b.camera_owned=true;
    __view_set(e__VW.Object,0,noone);
    var cp_pl=chaos_goal_player(),cp_core=cp_pl != noone ? cp_pl.chaosCore : noone;
    var cp_wide=cp_vp.w > 256,cp_cap=chaos_56_step_cap(cp_core);
    var cp_px=cp_pl != noone ? floor(cp_core.xu/256) : cp_x+cp_vp.w/2;
    var cp_py=cp_pl != noone ? floor(cp_core.yu/256) : cp_y+cp_vp.h/1.5;
    if (cp_b.camera_mode == 3) {
        var cp_pan=chaos_56_pan(cp_b,cp_vp,cp_x,cp_y);
        // an approach from the right lowers the retained left limit (the ROM writes D280 := target; the wide adapter keeps the limit its own intro/pan produced)
        if (cp_pan[0] < cp_b.camera_left) cp_b.camera_left=cp_pan[0];
        cp_x=cp_pan[0]; cp_y=cp_pan[1];
        cp_b.frozen=false;
    } else if (cp_b.camera_mode == 4) {
        // Pan disabled and the saved right limit restored; the shared state-$20 freeze (EDGE(RIGHT,-7)) holds the camera once Sonic is past it.
        var cp_in20=cp_core != noone && (cp_core.state == 32 || cp_core.next == 32);
        if (!cp_b.frozen && cp_in20 && cp_px >= chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,CHAOS_ACT_FREEZE_EDGE)) cp_b.frozen=true;
        if (!cp_b.frozen) {
            // Width 256: the recovered shared $5832 follow (bidirectional, lead slew, deadzone, +-7, retained left / restored right limits). Wider: smooth adapter.
            var cp_fy=min(CHAOS_56_CAMERA_Y,chaos_56_follow_y(cp_vp,cp_py,cp_y));
            if (cp_core != noone) cp_x=chaos_56_post_defeat_x(cp_b,cp_vp.w,cp_x,cp_px,(cp_core.player_flags & 16) != 0);
            if (cp_wide) cp_y+=clamp(cp_fy-cp_y,-4,4); else cp_y=cp_fy;
        }
    } else {
        // mode 1: follow with the left limit raised to the camera (no backscroll); mode 2: horizontal lock at the trigger camera, vertical follow continues
        var cp_fx2=chaos_56_follow_x(cp_b,cp_vp,cp_px),cp_fy2=chaos_56_follow_y(cp_vp,cp_py,cp_y);
        if (cp_wide) { cp_x+=clamp(cp_fx2-cp_x,-cp_cap,cp_cap); cp_y+=clamp(cp_fy2-cp_y,-cp_cap,cp_cap); }
        else { cp_x=cp_fx2; cp_y=cp_fy2; }
    }
    cp_b.camera_x=cp_x; cp_b.camera_y=cp_y;
    __view_set(e__VW.XView,0,cp_x); __view_set(e__VW.YView,0,cp_y);
}
// ---- drawing ($34/$0A/$0F use the same SAT registration as the boss, see the importer) ----------------------------------------------
function chaos_56_sprite_frame(cp_type,cp_frame) {
    if (cp_type == $56 || cp_type == $57 || cp_type == $58) return cp_frame <= 6 ? cp_frame-1 : cp_frame-5;
    if (cp_type == $34) return cp_frame-1;
    if (cp_type == $0A) return cp_frame-5;
    return cp_frame-7;
}
function chaos_56_draw() {
    if (chaos_mghz_act() != 3 || !variable_global_exists("chaosM3") || !instance_exists(OBJ_chaos_object_56)) return;
    var cp_b=instance_find(OBJ_chaos_object_56,0).chaosBoss56;
    if (!cp_b.active) return;
    var cp_m=global.chaosM3;
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=cp_m.slots[cp_i];
        if (!cp_s.boss || cp_s.type == 0 || cp_s.type >= $F0 || cp_s.frame == 0) continue;
        var cp_type=(cp_s.type == $0F && cp_s.state == 0) ? cp_s.src_type : cp_s.type;
        var cp_sprite=-1;
        if (cp_type == $56 || cp_type == $57 || cp_type == $58) cp_sprite=cp_b.flash_white ? SPR_chaos_mghz_boss_56_flash : SPR_chaos_mghz_boss_56;
        else if (cp_type == $34) cp_sprite=SPR_chaos_mghz_boss_puff_34;
        else if (cp_type == $0A) cp_sprite=SPR_chaos_mghz_boss_sparkle_0A;
        else if (cp_type == $0F) cp_sprite=SPR_chaos_mghz_boss_poof_0F;                  // same +(1,18) registration as the rest of the boss chain
        if (cp_sprite == -1) continue;
        draw_sprite(cp_sprite,chaos_56_sprite_frame(cp_type,cp_s.frame),chaos_56_x(cp_s),chaos_56_y(cp_s));
    }
}
