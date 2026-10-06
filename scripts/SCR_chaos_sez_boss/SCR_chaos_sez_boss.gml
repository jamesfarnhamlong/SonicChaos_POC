/// SEZ3 boss $54 and its dynamic child $55 (Research eff4cecf03bfcef8638b39c0f7676abbfd32f26e, data/rom-cache/sez/boss-54-runtime.json + boss-54-fullgame.json, mirrored at
/// POC_notes/rom-cache/sez/; generated tables and constants: SCR_chaos_sez_boss_data). Plain numbers and structs only: verification/verify_sez_s5.js executes this shipped code.
///
/// One live-slot interpreter. The boss, its children and the shared $12 HUD / $34 puff / $0A bonus / $0F smoke objects are script slots inside the SAME 19-slot array the S2
/// crumble objects and the accepted lost rings occupy (global.chaosS2, SCR_chaos_sez_s2): the mapped creator and the script spawn command ($5EE1) use slots 7..17 (11),
/// the HUD / bonus allocator ($5E9C) slots 0..15 (16). The scheduler visits slots ascending; chaos_s2_phase calls chaos_54_visit for every boss-chain slot, so a child allocated
/// above its parent runs in the creating update and one allocated below it in the next. Each visit = animation script ($64FA) -> callback -> lifecycle ($61E1, skipped in
/// state 0). Types $FE -> $FF -> cleared take separate visits. Nothing owns a parent pointer for $55: boss defeat or conversion never removes it. Art is never mirrored.
///
/// Evidence: boss states 0..12 with their exact callback orders (audit docs/sez3-boss-54-audit.md), the SEZ HP rule (post-projection height + cooldown; the attack bit controls
/// the rebound only), the final-hit arbitration (request 4 is written immediately, the enclosing callback continues and may overwrite it), the $55 child (damage only, gravity-free,
/// fractional +2.75 Y) and the floor-only clear. $54/$55 use WORLD thresholds 610 / 622 / 626, never terrain probes.
///
/// GAMEMAKER ADAPTERS (not ROM behaviour), each isolated below:
///   * WIDESCREEN ARENA FRAMING: width 256 is the canonical camera ((2976,462) pan target, settled (2975,462), 1 px/update on both axes). Wider views keep the canonical arena
///     RIGHT edge (3232 at the lock): the pan target is cameraX = 3232 - viewWidth (settled one pixel short, as the exclusive right limit does at 256), camera Y stays 462, the pan is
///     bounded to 4 logical px/update and never waits for or gates combat. Boss, world, terrain and every world threshold (610/622/626, the right stop and escape selectors at
///     world 3187/3183) keep their canonical coordinates, so only the amount of arena visible LEFT of the lock grows.
///   * CACHED SCREEN BYTES: the ROM compares the +$1A byte written by the previous sprite pass. At 256 the 8-bit wrap is kept; in a wider view the same RIGHT-relative relationships
///     (screen 212 = EDGE(RIGHT,-44) right stop, screen 208 = EDGE(RIGHT,-48) escape selector) are compared as signed full-width integers.
///   * PLAYER EDGE CLAMP and the $5FA0 side guards use the live viewport edges (EDGE(LEFT,+16) .. EDGE(RIGHT,-9), LEFT+32 / RIGHT-32), without the SMS low-byte wrap.
///   * $55 lifetime uses the actual viewport edges with the canonical margins (no mapped-object retention adapter); the boss keepalive keeps it out of outer-window deletion.
///   * the frame counter D12F is the SEZ effect frame counter; $D2E2 (used only by $34 jitter) is a deterministic presentation stand-in.

function chaos_54_slot(cp_type,cp_param,cp_x,cp_y,cp_token) {
    var cp_s=chaos_s2_slot();
    cp_s.type=cp_type; cp_s.parameter=cp_param; cp_s.boss=true;
    cp_s.x=cp_x; cp_s.y=cp_y; cp_s.xu=cp_x*256; cp_s.yu=cp_y*256; cp_s.vx=0; cp_s.vy=0;
    cp_s.state=0; cp_s.requested=0; cp_s.frame=0; cp_s.asleep=false; cp_s.woken=true;
    cp_s.pc=0; cp_s.timer=0; cp_s.callback=0; cp_s.loop_count=0; cp_s.ex=0; cp_s.ey=0;
    cp_s.saved_x=cp_x; cp_s.saved_y=cp_y; cp_s.saved_frame=0;
    cp_s.hp=0; cp_s.cooldown=0; cp_s.defeated=0; cp_s.drop=0; cp_s.counter=0;
    cp_s.hud=-1; cp_s.limit_right=0; cp_s.sx=0; cp_s.sy=0;
    cp_s.keep=false; cp_s.bit0=false; cp_s.token=cp_token; cp_s.src_type=0;
    cp_s.remaining=0; cp_s.seed=0; cp_s.phase=0; cp_s.anim=0;
    return cp_s;
}
function chaos_54_new() {
    return {active:false,created:false,tick:0,d12f:0,random_byte:0,sound:0,sound_log:[],
        camera_mode:0,camera_left:0,camera_right:CHAOS_54_RIGHT_LIMIT,camera_bottom:CHAOS_54_BOTTOM_INITIAL,pan_x:0,pan_y:0,camera_x:0,camera_y:0,viewport_w:256,viewport_h:192,
        cam_lead:-1,frozen:false,camera_owned:false,last_view_valid:false,last_view_x:0,last_view_y:0,
        palette:0,selector:0,hud_y:32,hud_count:0,flash:[],flash_white:false,player_sx:0,
        clear:false,screen_pass:true,latch_clear:true,spawns:[],last_spawn:-1,hits:[],defeated_tick:-1,clear_tick:-1,
        record:[],occupied:false,consumed:false,slot:-1,chaosScanTick:0,chaosInitialFillDone:false,chaosWoken:false};
}
/// The mapped placement record of SEZ3 (token 5, world (3200,622)). Called by chaos_level_spawn_objects; other acts never register one.
function chaos_54_register(cp_r) {
    global.chaosSez54=chaos_54_new();
    global.chaosSez54.record=cp_r;
}
function chaos_54_state() {
    if (!variable_global_exists("chaosSez54") || chaos_sez_act() != 3) return noone;
    return global.chaosSez54;
}
function chaos_54_x(cp_s) { return floor(cp_s.xu/256) & $FFFF; }
function chaos_54_y(cp_s) { return floor(cp_s.yu/256) & $FFFF; }
function chaos_54_s16(cp_v) { return ((cp_v+$8000)&$FFFF)-$8000; }
function chaos_54_sound(cp_b,cp_sound) { cp_b.sound=cp_sound; global.chaosLastSoundRequest=cp_sound; array_push(cp_b.sound_log,[cp_b.tick,cp_sound]); }
/// $0338: 24-bit position += sign-extended 8.8 velocity.
function chaos_54_move(cp_s) {
    cp_s.xu=(cp_s.xu+cp_s.vx+16777216) mod 16777216;
    cp_s.yu=(cp_s.yu+cp_s.vy+16777216) mod 16777216;
}
/// $5EE1 (dynamic, 7..17) / $5E9C (HUD / bonus, 0..15) first-free allocation inside the shared 19-slot pool; a full range skips the whole spawn command.
function chaos_54_alloc(cp_b,cp_pool,cp_type,cp_param,cp_x,cp_y,cp_dynamic) {
    var cp_free=cp_dynamic ? chaos_object_free_slot(cp_pool.slots,7,18) : chaos_object_free_slot(cp_pool.slots,0,16);
    cp_b.last_spawn=cp_free;
    if (cp_free < 0) return -1;
    cp_pool.slots[cp_free]=chaos_54_slot(cp_type,cp_param,cp_x,cp_y,0);
    array_push(cp_b.spawns,[cp_b.tick,cp_type,cp_param,cp_x,cp_y,cp_free]);
    return cp_free;
}
// ---- camera limits (D280 left, D282 right, D27E bottom) ---------------------------------------------------------------------------------------
/// $8199: raise the left limit to the camera; remember the current right limit in +$25 (high) / +$27 (low) - the bytes around the HP byte +$26.
function chaos_54_left_limit(cp_b,cp_s,cp_vp) {
    if (cp_b.camera_left < cp_vp.left) cp_b.camera_left=cp_vp.left;
    cp_s.limit_right=cp_b.camera_right;
}
/// Horizontal camera target of the locked arena. WIDTH 256 = canonical pan target (2976); wider views keep the canonical arena right edge (3232 at the lock):
/// cameraX = 3232 - width. The exclusive right limit makes the settled camera one pixel short, as at 256.
function chaos_54_target_x(cp_w) { return CHAOS_54_CAMERA_X-(cp_w-CHAOS_54_RIGHT_FRAME); }
/// Strict PLAYER_DIST trigger: |dx| < 160 and |dy| < 304, whatever the view.
function chaos_54_trigger(cp_s,cp_c) {
    return abs(chaos_54_x(cp_s)-floor(cp_c.xu/256)) < CHAOS_54_TRIGGER_X && abs(chaos_54_y(cp_s)-floor(cp_c.yu/256)) < CHAOS_54_TRIGGER_Y;
}
/// Cached screen X (+$1A, written by the previous sprite pass) against EDGE(RIGHT,cp_edge): the 8-bit byte compare at 256, the signed full-width relationship wider.
function chaos_54_screen_ge(cp_b,cp_sx,cp_edge) {
    if (cp_b.viewport_w > 256) return cp_sx >= cp_b.viewport_w+cp_edge;
    return (cp_sx & 255) >= 256+cp_edge;
}
/// $A339 escape selector: boss screen X >= EDGE(RIGHT,-48) AND the cached player screen X is not left of the boss' (unsigned byte compare at 256).
/// WIDESCREEN-ONLY GAMEPLAY ADAPTER (not ROM behaviour, width > 256 only): the same relationship mirrored onto the left edge: boss screen X <= EDGE(LEFT,+48) AND the cached
/// player screen X is not right of the boss'. Both requests feed the existing state 11 -> 12 escape / drop (state 12 copies the player X). At exactly 256 px nothing is added.
function chaos_54_escape(cp_b,cp_s) {
    if (cp_b.viewport_w > 256 && cp_s.sx <= CHAOS_54_MIRROR_ESCAPE && cp_b.player_sx <= cp_s.sx) return true;
    if (!chaos_54_screen_ge(cp_b,cp_s.sx,CHAOS_54_EDGE_ESCAPE)) return false;
    if (cp_b.viewport_w > 256) return cp_b.player_sx >= cp_s.sx;
    return (cp_b.player_sx & 255) >= (cp_s.sx & 255);
}
/// States 7 / 8: only a NONNEGATIVE X speed is zeroed when the cached screen X reaches EDGE(RIGHT,-44), after the integration. There is no mirrored left stop in the ROM.
/// WIDESCREEN-ONLY GAMEPLAY ADAPTER (width > 256): a NEGATIVE speed is zeroed when the cached screen X is <= EDGE(LEFT,+44), so the boss can use the whole wider arena.
function chaos_54_right_stop(cp_b,cp_s) {
    if (cp_s.vx >= 0 && chaos_54_screen_ge(cp_b,cp_s.sx,CHAOS_54_EDGE_STOP)) cp_s.vx=0;
    else if (cp_s.vx < 0 && cp_b.viewport_w > 256 && cp_s.sx <= CHAOS_54_MIRROR_STOP) cp_s.vx=0;
}
// ---- player contact ($6328 overlap, $5FA0 projection, $8105 rebound, $A3D8 / $814D / $630B) -----------------------------------------------------
/// Closed overlap bits. Boss geometry: object extents come from the current frame; Sonic is 8x24 (9x24 in state $0F). Hurt/dying Sonic reports no contact; blink and
/// invincibility do not (the boss never sets object +$03 bit 7). Minimum penetration, vertical wins ties.
function chaos_54_bits(cp_s,cp_c) {
    if ((cp_c.move & 64) != 0) return 0;
    return SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_54_x(cp_s),chaos_54_y(cp_s),cp_c.state == $0F ? 9 : 8,24,cp_s.ex,cp_s.ey);
}
/// $5FA0: solid projection with the D523 terrain guards and the EDGE(LEFT,+32) / EDGE(RIGHT,-32) side guards of the LIVE view.
/// cp_terrain is the D523 low nibble (1 top-blocked, 2 bottom-blocked, 4 right wall, 8 left wall). Returns [x,y] integer anchors.
function chaos_54_project(cp_bits,cp_px,cp_py,cp_ox,cp_oy,cp_pex,cp_oex,cp_oey,cp_terrain,cp_vp) {
    var cp_x=cp_px,cp_y=cp_py;
    if (cp_bits == 1 && (cp_terrain & 1) == 0) cp_y=cp_oy-cp_oey;
    else if (cp_bits == 2 && (cp_terrain & 2) == 0) cp_y=cp_oy+24;
    else if (cp_bits == 8 && (cp_terrain & 8) == 0 && chaos_vp_edge(cp_vp,CHAOS_VP_LEFT,CHAOS_54_GUARD_LEFT) < cp_px) cp_x=cp_ox-cp_pex-cp_oex;
    else if (cp_bits == 4 && (cp_terrain & 4) == 0 && cp_px <= chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,CHAOS_54_GUARD_RIGHT)) cp_x=cp_ox+cp_pex+cp_oex;
    return [cp_x,cp_y];
}
function chaos_54_project_player(cp_s,cp_c,cp_bits,cp_vp) {
    var cp_pos=chaos_54_project(cp_bits,floor(cp_c.xu/256),floor(cp_c.yu/256),chaos_54_x(cp_s),chaos_54_y(cp_s),cp_c.state == $0F ? 9 : 8,cp_s.ex,cp_s.ey,cp_c.bg & 15,cp_vp);
    cp_c.xu=cp_pos[0]*256+(cp_c.xu&255); cp_c.yu=cp_pos[1]*256+(cp_c.yu&255);
}
/// $8105: request player state $1B and write the response speeds; movement and floor flags are preserved. Bits: 1 top, 2 bottom, 4 Sonic right of the boss, 8 left.
function chaos_54_reaction(cp_c,cp_bits) {
    if (cp_bits == 4) { cp_c.vx=1536; cp_c.vy=-cp_c.vy; }
    else if (cp_bits == 8) { cp_c.vx=-1536; cp_c.vy=-cp_c.vy; }
    else if (cp_bits == 2) cp_c.vy=1536;
    else cp_c.vy=-1024;
    cp_c.next=27;
}
/// $0374 command 7: the sprite-palette flash command (entries 13/14 white for command calls 4..7, SEZ palette 14 restored on call 8), four command slots.
function chaos_54_queue_flash(cp_b) {
    if (array_length(cp_b.flash) < CHAOS_54_FLASH_SLOTS) array_push(cp_b.flash,0);
}
function chaos_54_flash_step(cp_b) {
    var cp_keep=[];
    cp_b.flash_white=false;
    for (var cp_i=0;cp_i<array_length(cp_b.flash);cp_i++) {
        var cp_n=cp_b.flash[cp_i]+1;
        if (cp_n >= CHAOS_54_FLASH_FIRST && cp_n <= CHAOS_54_FLASH_LAST) cp_b.flash_white=true;
        if (cp_n < CHAOS_54_FLASH_END) array_push(cp_keep,cp_n);
    }
    cp_b.flash=cp_keep;
}
/// $A3D8 (states 7..11). Order: re-request 4 from +$35, the cooldown +$34 decrements on EVERY call (old 1 therefore permits a hit on this call), overlap (hurt suppresses),
/// shared contact flag D520/D521, projection, the bottom-with-floor damage request, the state-11 flag +$36 (projection stays, everything below is suppressed), sound $B6 for
/// every contact (also during the HP cooldown), the attack-bit rebound, and finally the HP rule: NOT bottom-classified, cooldown zero and the PROJECTED player Y <= bossY - 16.
/// The attack bit does not gate HP. HP 0 sets +$35 = FF and requests state 4 immediately; the enclosing callback continues and may overwrite it. Returns the overlap bits.
function chaos_54_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) {
    if (cp_s.defeated != 0) cp_s.requested=4;
    if (cp_s.cooldown != 0) cp_s.cooldown=(cp_s.cooldown-1)&255;
    if (!cp_present) return 0;
    var cp_bits=chaos_54_bits(cp_s,cp_c);
    if (cp_bits == 0) return 0;
    chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));
    chaos_54_project_player(cp_s,cp_c,cp_bits,cp_vp);
    if (cp_s.drop != 0) return cp_bits;
    if (cp_bits == 2 && (cp_c.contacts & 2) != 0) chaos_request_stage(cp_c);
    chaos_54_sound(cp_b,CHAOS_54_SND_ATTACK);
    if (chaos_attack_posture(cp_c)) chaos_54_reaction(cp_c,cp_bits);
    if (cp_bits != 2 && cp_s.cooldown == 0 && floor(cp_c.yu/256) <= chaos_54_y(cp_s)-CHAOS_54_HIT_DY) {
        cp_s.cooldown=CHAOS_54_COOLDOWN;
        chaos_54_queue_flash(cp_b);
        cp_s.hp=(cp_s.hp-1)&255;
        array_push(cp_b.hits,[cp_b.tick,cp_s.hp]);
        if (cp_s.hp == 0) { cp_s.defeated=255; cp_s.requested=4; cp_b.defeated_tick=cp_b.tick; }
    }
    return cp_bits;
}
/// $814D (state 6): solid projection, then any non-attacking contact queues damage and an attacking one rebounds; HP is untouched and no sound is requested.
function chaos_54_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp) {
    if (!cp_present) return 0;
    var cp_bits=chaos_54_bits(cp_s,cp_c);
    if (cp_bits == 0) return 0;
    chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits));
    chaos_54_project_player(cp_s,cp_c,cp_bits,cp_vp);
    if (chaos_attack_posture(cp_c)) chaos_54_reaction(cp_c,cp_bits); else chaos_request_stage(cp_c);
    return cp_bits;
}
/// $630B (child $55 state 3): closed overlap with the forced 2x4 extents. It raises the shared contact flag D520/D521 (side nibble of the $6328 bit) and queues the damage request
/// ($D3B0, which $48BC consumes before any contact flag, so even an attacking Sonic is hurt). No projection, no attack branch.
function chaos_54_damage_contact(cp_s,cp_c,cp_present) {
    if (!cp_present) return 0;
    var cp_bits=chaos_54_bits(cp_s,cp_c);
    if (cp_bits != 0) { chaos_contact_stage(cp_c,chaos_contact_nibble(cp_bits)); chaos_request_stage(cp_c); }
    return cp_bits;
}
/// $5F54: conversion to smoke $0F (state/timer/script cleared; token and parameter zero; position kept; the frame is shown once as the source type).
function chaos_54_convert(cp_s) {
    cp_s.src_type=cp_s.type;
    cp_s.type=$0F; cp_s.state=0; cp_s.requested=0; cp_s.timer=0; cp_s.pc=0;
    cp_s.keep=false; cp_s.asleep=false; cp_s.bit0=false; cp_s.token=0; cp_s.parameter=0;
    cp_s.loop_count=0;
}
// ---- callbacks -----------------------------------------------------------------------------------------------------------------------------------
/// $81A6 -> $5E9C. The slot pointer is saved in +$34/+$35 (low/high byte of D540 + 64 * slot); an exhausted allocator leaves IY = D940 = slot 16, an unrelated slot whose type
/// state 2 then waits on.
function chaos_54_hud_alloc(cp_b,cp_pool,cp_s) {
    var cp_i=chaos_54_alloc(cp_b,cp_pool,$12,0,0,0,false);
    cp_s.hud=cp_i < 0 ? 16 : cp_i;
    cp_s.cooldown=($D540+cp_s.hud*64) & 255; cp_s.defeated=(($D540+cp_s.hud*64) >> 8) & 255;
}
/// $A291: combat init. Selector $15, palette 14, HP 8, request 6, clears +$34/+$35/+$36/+$0A/+$1E/X speed, anchor shifted (-64,-192), Y speed +0.75. The saved right limit
/// (+$25/+$27, around the HP byte +$26) is not touched. No flags3 bit 7 and no facing bit are set.
function chaos_54_combat_init(cp_b,cp_s) {
    cp_b.selector=$15; cp_b.palette=14;
    cp_s.hp=CHAOS_54_HP; cp_s.requested=6;
    cp_s.cooldown=0; cp_s.defeated=0; cp_s.drop=0; cp_s.loop_count=0; cp_s.counter=0; cp_s.vx=0;
    cp_s.xu=(chaos_54_x(cp_s)-64)*256+(cp_s.xu&255); cp_s.yu=(chaos_54_y(cp_s)-192)*256+(cp_s.yu&255);
    cp_s.vy=CHAOS_54_COMBAT_VY;
}
/// $81BD (state 5): floor bit 1 ONLY (no world-X gate). Clear: left limit = camera, pan released, saved right limit restored, player state $20 requested, $0A/0 bonus
/// controller allocated, boss converted to $0F. Nothing happens before the gate: the camera stays locked while Sonic is airborne.
function chaos_54_clear(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp) {
    if (!cp_present) return;
    if ((cp_c.contacts & 2) == 0) return;
    chaos_goal_request_state20(cp_c);
    chaos_54_sound(cp_b,CHAOS_54_SND_CLEAR);
    cp_b.camera_left=cp_vp.left;
    cp_b.camera_mode=4;
    cp_b.camera_right=cp_vp.w > 256 ? room_width-cp_vp.w : cp_s.limit_right;          // saved right limit (3840 at 256); wide: worldWidth - viewportWidth, exclusive
    chaos_54_alloc(cp_b,cp_pool,$0A,0,0,0,false);
    cp_b.clear=true; cp_b.clear_tick=cp_b.tick;
    global.chaosBossNextAct=chaos_54_destination();
    chaos_54_convert(cp_s);
}
function chaos_54_callback(cp_b,cp_pool,cp_s,cp_pc,cp_c,cp_present,cp_vp) {
    switch (cp_pc) {
        case $032F: return;
        // ---- shared boss framework (states 0..3) ----
        case $974C:
            cp_s.keep=true;
            global.chaosSezBossActive=true;                          // D44E = zone + 1 = 3: effect 5 pauses
            chaos_54_hud_alloc(cp_b,cp_pool,cp_s);
            if (cp_b.camera_mode == 0) cp_b.camera_mode=1;
            chaos_54_left_limit(cp_b,cp_s,cp_vp);
            cp_s.requested=1;
            if (cp_present && cp_c.next == 18) cp_c.next=14;          // requested Spring Shoes $12 -> fall $0E (the recovered sign / boss conversion)
            return;
        case $9771:
            chaos_54_left_limit(cp_b,cp_s,cp_vp);
            if (!cp_present || !chaos_54_trigger(cp_s,cp_c)) return;
            if (cp_b.camera_right >= cp_vp.left) cp_b.camera_right=cp_vp.left;     // $0356: right limit := camera
            cp_b.camera_mode=2;
            cp_s.requested=2;
            return;
        case $97C1:
            if (cp_pool.slots[cp_s.hud].type != 0) return;           // waits for the HUD slot's type byte to clear, not for the camera
            cp_b.camera_mode=3;                                      // bottom limit 462, pan target (2976,462); the pan routine runs in the camera phase (it writes the right limit)
            cp_b.camera_bottom=CHAOS_54_BOTTOM_LIMIT;
            cp_b.pan_x=chaos_54_target_x(cp_vp.w); cp_b.pan_y=CHAOS_54_CAMERA_Y;
            cp_s.requested=3;
            return;
        case $A291: chaos_54_combat_init(cp_b,cp_s); return;
        // ---- combat ----
        case $A2EA:
            chaos_54_entry_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            chaos_54_move(cp_s);
            if (chaos_54_y(cp_s) >= CHAOS_54_Y_LAND) cp_s.requested=9;
            return;
        case $A2FA:
            chaos_54_move(cp_s);
            chaos_54_right_stop(cp_b,cp_s);
            cp_s.vy=chaos_54_s16(cp_s.vy+CHAOS_54_GRAVITY_RISE);
            chaos_54_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            if (cp_s.vy >= 0) cp_s.requested=(cp_s.requested+1)&255;     // updated signed Y speed: INC the request (7 -> 8; a pending 4 -> 5)
            return;
        case $A312:
            chaos_54_move(cp_s);
            chaos_54_right_stop(cp_b,cp_s);
            chaos_54_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            cp_s.vy=chaos_54_s16(cp_s.vy+CHAOS_54_GRAVITY_FALL);
            if (chaos_54_y(cp_s) >= CHAOS_54_Y_DROP) cp_s.requested=(cp_s.requested+1)&255;
            return;
        case $A32A:
            chaos_54_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            chaos_54_move(cp_s);
            if (chaos_54_y(cp_s) >= CHAOS_54_Y_DROP) cp_s.requested=(cp_s.requested+1)&255;
            return;
        case $A339:
            chaos_54_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            chaos_54_move(cp_s);
            if (chaos_54_y(cp_s) >= CHAOS_54_Y_LAND) {
                cp_s.counter=(cp_s.counter+1)&255;                                    // bounce: every third cycle launches higher
                if (cp_s.counter >= CHAOS_54_BOUNCE_CYCLE) { cp_s.counter=0; cp_s.vy=CHAOS_54_BOUNCE_VY_THIRD; } else cp_s.vy=CHAOS_54_BOUNCE_VY;
                cp_s.vx=(cp_present && chaos_54_x(cp_s)-floor(cp_c.xu/256) >= CHAOS_54_BOUNCE_DX) ? -CHAOS_54_BOUNCE_VX : CHAOS_54_BOUNCE_VX;   // signed: every negative difference is < 96
                // WIDESCREEN-ONLY GAMEPLAY ADAPTER (not ROM behaviour): the ROM direction rule hovers the boss ~96 px right of a Sonic hiding at the left, so the mirrored left stop / escape could never be
                // reached. In a view wider than 256 a Sonic whose cached screen X is inside the left escape zone (<= EDGE(LEFT,+48)) keeps the boss running left toward the edge.
                if (cp_present && cp_b.viewport_w > 256 && cp_b.player_sx <= CHAOS_54_MIRROR_ESCAPE) cp_s.vx=-CHAOS_54_BOUNCE_VX;
                cp_s.requested=chaos_54_escape(cp_b,cp_s) ? 11 : 7;
            }
            return;
        case $A396:
            cp_s.vy=chaos_54_s16(cp_s.vy+CHAOS_54_GRAVITY_ESCAPE);
            chaos_54_move(cp_s);
            cp_s.drop=255;                                                            // projection still runs; sound / rebound / HP / damage are suppressed
            chaos_54_combat_contact(cp_b,cp_s,cp_c,cp_present,cp_vp);
            if (cp_s.asleep) cp_s.requested=(cp_s.requested+1)&255;                   // the PREVIOUS lifecycle's sleep bit
            return;
        case $A3AF:
            if (cp_present) cp_s.xu=floor(cp_c.xu/256)*256+(cp_s.xu&255);            // drop onto Sonic: X := player X (fraction kept), no movement this callback
            cp_s.drop=0;
            cp_s.requested=8;
            return;
        // ---- defeat: frame preservation of the shared explosion script, then the state-5 clear gate ----
        case $9A1E: cp_s.timer=1; cp_s.saved_frame=cp_s.frame; return;
        case $9A29: cp_s.timer=1; cp_s.frame=cp_s.saved_frame; return;
        case $9A2F: cp_s.timer=4; cp_s.frame=cp_s.saved_frame; return;
        case $81BD: chaos_54_clear(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp); return;
        // ---- child $55 ----
        case $A481:
            cp_s.vx=CHAOS_54_CHILD_VX; cp_s.vy=CHAOS_54_CHILD_VY;
            cp_s.requested=3;
            return;
        case $A498: cp_s.requested=2; return;                                         // state 1: naturally unreachable
        case $A49D: cp_s.parameter=0; chaos_54_convert(cp_s); return;                 // no attack test, no score
        case $A4A4:
            cp_s.ex=CHAOS_54_CHILD_EX; cp_s.ey=CHAOS_54_CHILD_EY;                     // the callback overrides the mapping extents
            chaos_54_damage_contact(cp_s,cp_c,cp_present);                            // contact BEFORE movement; no gravity
            chaos_54_move(cp_s);
            if (chaos_54_y(cp_s) >= CHAOS_54_CHILD_Y) cp_s.requested=2;
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
            cp_s.keep=false; cp_s.asleep=false;
            cp_s.phase=0; cp_s.anim=0; cp_s.remaining=cp_s.parameter;
            cp_s.saved_x=chaos_54_x(cp_s); cp_s.saved_y=chaos_54_y(cp_s);
            cp_s.seed=chaos_54_slot_index(cp_pool,cp_s)+2;                            // $0332: slot index + 2
            cp_s.requested=(cp_b.d12f & 1) != 0 ? 1 : 2;
            return;
        case $8C9F: cp_s.anim=(cp_s.anim+1)&255; return;
        case $8CFD:
            cp_s.remaining--;
            if (cp_s.remaining < 0) cp_s.type=$FF;
            return;
        case $8CA3:
            cp_s.requested=(cp_b.d12f & 1) != 0 ? 1 : 2;
            var cp_r=cp_b.random_byte,cp_t=cp_b.d12f&255;                             // $D2E2 jitter: deterministic presentation stand-in
            cp_s.xu=(cp_s.saved_x+((((cp_r^cp_s.anim)&cp_t)-cp_s.seed)&15)-8)*256+(cp_s.xu&255);
            var cp_ry=(((((cp_r>>1)|((cp_r&1)<<7))&(((cp_t<<1)|(cp_t>>7))&255))^(chaos_54_y(cp_s)&255))+cp_s.seed)&15;
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
            cp_s.requested=1; cp_s.keep=false; cp_s.bit0=true;
            return;
        case $03EF: if (cp_b.sound == 0) chaos_54_sound(cp_b,CHAOS_54_SND_EXPLOSION); return;
        case $A0C6: cp_s.type=$FF; return;
        case $A0E7: return;
        case $034A: cp_s.type=$FE; return;
    }
}
function chaos_54_slot_index(cp_pool,cp_s) {
    for (var cp_i=0;cp_i<19;cp_i++) if (cp_pool.slots[cp_i] == cp_s) return cp_i;
    return 0;
}
// ---- the script engine ($64FA) -------------------------------------------------------------------------------------------------------------------
function chaos_54_load_frame(cp_s) {
    var cp_e=chaos_54_extent(cp_s.type,cp_s.frame);                  // +$2C/+$2D from the frame's mapping record
    cp_s.ex=cp_e[0]; cp_s.ey=cp_e[1];
}
function chaos_54_script(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp) {
    if (cp_s.pc == 0 || cp_s.state != cp_s.requested) {
        cp_s.state=cp_s.requested; cp_s.pc=chaos_54_table(cp_s.type)[cp_s.state];
    } else { cp_s.timer=(cp_s.timer-1)&255; if (cp_s.timer != 0) return; }
    for (var cp_guard=0;cp_guard<128;cp_guard++) {
        var cp_r=chaos_54_record(cp_s.type,cp_s.pc);
        if (array_length(cp_r) == 0) { show_debug_message("Unresolved SEZ boss script "+string(cp_s.type)+":"+string(cp_s.pc)); return; }
        cp_s.pc=cp_r[0]; var cp_cmd=cp_r[1];
        if (cp_cmd == -1) {
            cp_s.timer=cp_r[2]; cp_s.frame=cp_r[3]; cp_s.callback=cp_r[4];
            chaos_54_load_frame(cp_s); return;
        }
        switch (cp_cmd) {
            case 0: cp_s.state=cp_s.requested; cp_s.pc=chaos_54_table(cp_s.type)[cp_s.state]; break;
            case 1: chaos_54_callback(cp_b,cp_pool,cp_s,cp_r[2],cp_c,cp_present,cp_vp); break;
            case 2: cp_s.vx=chaos_54_s16(cp_r[2]); cp_s.vy=chaos_54_s16(cp_r[3]); break;
            case 3: cp_s.requested=cp_r[2]; break;
            case 4:
                chaos_54_alloc(cp_b,cp_pool,cp_r[2],cp_r[5],(chaos_54_x(cp_s)+cp_r[3])&$FFFF,(chaos_54_y(cp_s)+cp_r[4])&$FFFF,true);
                break;
            case 5:
                // a record whose callback is the 2nd operand and whose timer/frame come from the called routine
                cp_s.callback=cp_r[3];
                chaos_54_callback(cp_b,cp_pool,cp_s,cp_r[2],cp_c,cp_present,cp_vp);
                chaos_54_load_frame(cp_s);
                return;
            case 6: chaos_54_sound(cp_b,cp_r[2]); break;
            case 7: cp_s.pc=cp_r[2]; break;
            case 14: cp_s.loop_count=cp_r[2]; break;
            case 15: cp_s.loop_count--; if (cp_s.loop_count != 0) cp_s.pc=cp_r[2]; break;
        }
    }
}
/// $61E1, after every state != 0 visit. Bit 6 = outside the interior (asleep); outside the outer band the object is removed unless +$04 bit 1 keeps it. The boss keepalive
/// therefore never deletes it, while the child ($55, token 0) becomes $FF. Presentation bands are the canonical ones of the live view (no retention adapter).
function chaos_54_lifecycle(cp_b,cp_s,cp_vp) {
    cp_s.asleep=false;
    var cp_cell=SCR_chaos_spawn_cell(cp_vp,chaos_54_x(cp_s),chaos_54_y(cp_s));
    if (cp_cell < 3) { if ((cp_cell & 2) != 0) cp_s.asleep=true; return; }
    cp_s.asleep=true;
    if (cp_s.keep) return;
    cp_s.type=cp_s.token != 0 ? $FE : $FF; cp_s.state=0;
}
/// Placement occupancy ($D404): cleared when a placement-backed object is removed ($FF with token), retained by the conversion that detaches the token.
function chaos_54_release(cp_b,cp_s) {
    if (cp_s.token == CHAOS_54_TOKEN) cp_b.occupied=false;
}
function chaos_54_visit(cp_b,cp_pool,cp_i,cp_c,cp_present,cp_vp) {
    var cp_s=cp_pool.slots[cp_i];
    if (!cp_s.boss || cp_s.type == 0) return;
    if (cp_s.type == $FE) { cp_s.type=$FF; cp_s.state=0; return; }
    if (cp_s.type == $FF) {
        if (cp_s.token != 0) chaos_54_release(cp_b,cp_s);        // $5EF8: placement occupancy byte cleared
        cp_pool.slots[cp_i]=chaos_s2_slot();
        return;
    }
    chaos_54_script(cp_b,cp_pool,cp_s,cp_c,cp_present,cp_vp);
    if (cp_s.callback != 0) chaos_54_callback(cp_b,cp_pool,cp_s,cp_s.callback,cp_c,cp_present,cp_vp);
    if (cp_s.state != 0) chaos_54_lifecycle(cp_b,cp_s,cp_vp);    // $5E29: state 0 skips $61E1
}
// ---- scheduler hooks (called by chaos_s2_phase, the shared 19-slot scheduler pass) ---------------------------------------------------------------------
/// Start of a scheduler pass. Returns the controller, or noone when this act has no boss record.
function chaos_54_pass_begin(cp_vp) {
    var cp_b=chaos_54_state();
    if (cp_b == noone) return noone;
    if (cp_b.latch_clear) cp_b.sound=0;                         // the sound engine consumes DE04 every frame (the Research lab never does)
    cp_b.viewport_w=cp_vp.w; cp_b.viewport_h=cp_vp.h; cp_b.camera_x=cp_vp.left; cp_b.camera_y=cp_vp.top;
    cp_b.d12f=variable_global_exists("chaosSezEffects") ? (global.chaosSezEffects.frame & 255) : (cp_b.tick & 255);
    cp_b.random_byte=(cp_b.tick*73+19) & 255;
    return cp_b;
}
/// End of a pass: palette flash, the sprite pass that writes the screen caches the NEXT update's callbacks read, then the mapped placement scan ($8000, every 4th update):
/// a created object is first visited by the next pass (the Research rows show the freshly created slot unvisited), and the HUD slide offset.
function chaos_54_pass_end(cp_b,cp_pool,cp_c,cp_present,cp_vp) {
    chaos_54_flash_step(cp_b);
    for (var cp_k=0;cp_k<19 && cp_b.screen_pass;cp_k++) {
        var cp_s=cp_pool.slots[cp_k];
        if (!cp_s.boss || cp_s.type == 0 || cp_s.asleep) continue;   // renderer $2240 skips coordinate preparation for flags4 bit 6 (asleep): the cache stays stale
        cp_s.sx=chaos_54_x(cp_s)-cp_vp.left; cp_s.sy=chaos_54_y(cp_s)-cp_vp.top;
    }
    if (cp_b.screen_pass && cp_present) cp_b.player_sx=floor(cp_c.xu/256)-cp_vp.left;
    chaos_54_scan(cp_b,cp_pool,cp_vp);
    cp_b.tick++;
    global.chaosHudSlide=-min(64,cp_b.hud_count);
}
/// Placement scan for the single mapped record: created in the first free slot of 7..17 at the EDGE outer ring on any scan, in the interior only during the initial fill.
/// The creator sets state/request 0, flags3 0, flags4 = $40 (asleep), the placement token and the occupancy byte.
function chaos_54_scan(cp_b,cp_pool,cp_vp) {
    if (array_length(cp_b.record) == 0 || cp_b.occupied || cp_b.consumed) return false;
    var cp_due=(cp_b.chaosScanTick mod 4) == 0;
    cp_b.chaosScanTick++;
    if (!cp_due) return false;
    var cp_r=cp_b.record;
    var cp_cell=SCR_chaos_spawn_cell(cp_vp,cp_r[1],cp_r[2]);
    var cp_fill=!cp_b.chaosInitialFillDone;
    cp_b.chaosInitialFillDone=true;
    if (!(cp_cell == 2 || (cp_cell < 2 && cp_fill))) return false;
    var cp_slot=chaos_object_free_slot(cp_pool.slots,7,18);
    if (cp_slot < 0) return false;
    var cp_s=chaos_54_slot($54,cp_r[5],cp_r[1],cp_r[2],cp_r[0]);
    cp_s.asleep=true; cp_s.woken=false;
    cp_pool.slots[cp_slot]=cp_s;
    cp_b.occupied=true; cp_b.created=true; cp_b.active=true; cp_b.slot=cp_slot;
    return true;
}
function chaos_54_slot_of(cp_pool,cp_type) {
    for (var cp_i=0;cp_i<19;cp_i++) if (cp_pool.slots[cp_i].boss && cp_pool.slots[cp_i].type == cp_type) return cp_i;
    return -1;
}
/// Whole scheduler pass over the boss chain only (the lab / replay entry point): begin, ascending visits, end. chaos_s2_phase runs the same three hooks around its own slots.
function chaos_54_tick(cp_b,cp_pool,cp_vp,cp_c,cp_present) {
    if (cp_b.latch_clear) cp_b.sound=0;
    cp_b.viewport_w=cp_vp.w; cp_b.viewport_h=cp_vp.h; cp_b.camera_x=cp_vp.left; cp_b.camera_y=cp_vp.top;
    for (var cp_i=0;cp_i<19;cp_i++) chaos_54_visit(cp_b,cp_pool,cp_i,cp_c,cp_present,cp_vp);
    chaos_54_pass_end(cp_b,cp_pool,cp_c,cp_present,cp_vp);
}
// ---- camera (explicit presentation adapter; see header) ------------------------------------------------------------------------------------------
/// True from boss creation until the room ends: the boss owns the camera and the player edge clamp.
function chaos_54_owns_camera() {
    var cp_b=chaos_54_state();
    return cp_b != noone && cp_b.active;
}
function chaos_54_follow_x(cp_b,cp_vp,cp_player_x) {
    var cp_hi=max(cp_b.camera_left,min(cp_b.camera_right,room_width-cp_vp.w));
    return clamp(round(cp_player_x-cp_vp.w/2),cp_b.camera_left,cp_hi);
}
/// The zone's ordinary vertical follow (SEZ has no capped variant): Sonic at 2/3 of the view height, inside the room.
function chaos_54_follow_y(cp_vp,cp_player_y) {
    return clamp(round(cp_player_y-cp_vp.h/1.5),0,max(0,room_height-cp_vp.h));
}
/// Shared $5832 horizontal step. cp_k = playerX - camera (the low byte at width 256), cp_lead = the working lead D28A. Deadzone lead +- 8, +7 right cap,
/// -7 left cap with the exact -8..-1 range preserved. No player velocity is read.
function chaos_54_follow_delta(cp_k,cp_lead) {
    var cp_lo=cp_lead-CHAOS_54_DEADZONE,cp_hi=cp_lead+CHAOS_54_DEADZONE;
    if (cp_k < cp_lo) { var cp_d=cp_k-cp_lo; return cp_d >= -CHAOS_54_DEADZONE ? cp_d : CHAOS_54_FOLLOW_LEFT; }
    if (cp_k <= cp_hi) return 0;
    var cp_u=cp_k-cp_hi;
    return cp_u < CHAOS_54_DEADZONE ? cp_u : CHAOS_54_FOLLOW_RIGHT;
}
/// $4CB0: a step that would leave [left, right) is dropped entirely (rejected, never clamped to the boundary).
function chaos_54_limit_delta(cp_x,cp_delta,cp_left,cp_right) {
    if (cp_delta < 0) return (cp_x+cp_delta < cp_left || cp_x+cp_delta < 0) ? 0 : cp_delta;
    if (cp_delta > 0) return cp_x+cp_delta >= cp_right ? 0 : cp_delta;
    return 0;
}
/// Working lead after the $58E1 slew (1 px/update toward the facing target): 104 right / 136 left at 256. GAMEMAKER ADAPTER: wider, CENTER-24 / CENTER+8.
function chaos_54_lead_target(cp_w,cp_left_facing) {
    if (cp_w > 256) return floor(cp_w/2)+(cp_left_facing ? CHAOS_54_LEAD_LEFT-128 : CHAOS_54_LEAD_RIGHT-128);
    return cp_left_facing ? CHAOS_54_LEAD_LEFT : CHAOS_54_LEAD_RIGHT;
}
/// One post-clear horizontal follow update. Returns the new camera X and advances cp_b.cam_lead.
function chaos_54_post_clear_x(cp_b,cp_w,cp_x,cp_px,cp_left_facing) {
    var cp_target=chaos_54_lead_target(cp_w,cp_left_facing);
    if (cp_b.cam_lead < 0) cp_b.cam_lead=chaos_54_lead_target(cp_w,false);
    cp_b.cam_lead+=clamp(cp_target-cp_b.cam_lead,-CHAOS_54_LEAD_SLEW,CHAOS_54_LEAD_SLEW);
    var cp_d=0;
    if (cp_w > 256) cp_d=clamp(chaos_54_follow_delta(cp_px-cp_x,cp_b.cam_lead),-4,4);          // explicit smooth adapter, both directions
    else if (cp_px != cp_x) cp_d=chaos_54_follow_delta((cp_px-cp_x)&255,cp_b.cam_lead);        // canonical: low byte of the difference, exact zero bypasses
    return cp_x+chaos_54_limit_delta(cp_x,cp_d,cp_b.camera_left,cp_b.camera_right);
}
/// $5956 pan toward the locked arena. 256: +-1 px on both axes at once, the exclusive right limit stops an approach from the left one pixel short (2975), an approach from the
/// right ends exactly on the target. Wider: bounded to 4 logical px/update toward the adapted target.
function chaos_54_pan(cp_b,cp_vp,cp_x,cp_y) {
    var cp_tx=chaos_54_target_x(cp_vp.w),cp_ty=CHAOS_54_CAMERA_Y;
    if (cp_vp.w > 256) {
        cp_x+=clamp(cp_tx-1-cp_x,-4,4); cp_y+=clamp(cp_ty-cp_y,-4,4);
    } else {
        if (cp_x < cp_tx) cp_x=min(cp_x+1,cp_tx-1); else if (cp_x > cp_tx) cp_x--;
        cp_y+=sign(cp_ty-cp_y);
    }
    return [cp_x,cp_y];
}
function chaos_54_camera_step() {
    var cp_b=chaos_54_state();
    if (chaos_sez_act() != 3 || cp_b == noone) return;
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
    var cp_wide=cp_vp.w > 256;
    var cp_px=cp_pl != noone ? floor(cp_core.xu/256) : cp_x+cp_vp.w/2;
    var cp_py=cp_pl != noone ? floor(cp_core.yu/256) : cp_y+cp_vp.h/1.5;
    if (cp_b.camera_mode == 3) {
        cp_b.camera_right=cp_b.pan_x;                           // the pan routine's D282 := target (exclusive right limit)
        var cp_pan=chaos_54_pan(cp_b,cp_vp,cp_x,cp_y);
        // an approach from the right lowers the retained left limit (the ROM writes D280 := target; the wide adapter keeps the limit its own intro/pan produced)
        if (cp_pan[0] < cp_b.camera_left) cp_b.camera_left=cp_pan[0];
        cp_x=cp_pan[0]; cp_y=cp_pan[1];
        cp_b.frozen=false;
    } else if (cp_b.camera_mode == 4) {
        // Pan released and the saved right limit restored; the shared state-$20 freeze (EDGE(RIGHT,-7)) holds the camera once Sonic is past it.
        var cp_in20=cp_core != noone && (cp_core.state == 32 || cp_core.next == 32);
        if (!cp_b.frozen && cp_in20 && cp_px >= chaos_vp_edge(cp_vp,CHAOS_VP_RIGHT,CHAOS_ACT_FREEZE_EDGE)) cp_b.frozen=true;
        if (!cp_b.frozen) {
            // Width 256: the recovered shared $5832 follow (bidirectional, lead slew, deadzone, +-7, retained left / restored right limits). Wider: smooth adapter.
            var cp_fy=min(CHAOS_54_BOTTOM_LIMIT,chaos_54_follow_y(cp_vp,cp_py));
            if (cp_core != noone) cp_x=chaos_54_post_clear_x(cp_b,cp_vp.w,cp_x,cp_px,(cp_core.player_flags & 16) != 0);
            if (cp_wide) cp_y+=clamp(cp_fy-cp_y,-4,4); else cp_y=cp_fy;
        }
    } else {
        // mode 1: follow with the left limit raised to the camera (no backscroll); mode 2: horizontal lock at the trigger camera, vertical follow continues
        var cp_fx2=chaos_54_follow_x(cp_b,cp_vp,cp_px),cp_fy2=chaos_54_follow_y(cp_vp,cp_py);
        if (cp_wide) { cp_x+=clamp(cp_fx2-cp_x,-4,4); cp_y+=clamp(cp_fy2-cp_y,-4,4); }
        else { cp_x=cp_fx2; cp_y=cp_fy2; }
    }
    cp_b.camera_x=cp_x; cp_b.camera_y=cp_y;
    __view_set(e__VW.XView,0,cp_x); __view_set(e__VW.YView,0,cp_y);
}
// ---- drawing ($34 / $0A / $0F use the same SAT registration as the boss, see the importer) ---------------------------------------------------------
function chaos_54_sprite_frame(cp_type,cp_frame) {
    if (cp_type == $54) return cp_frame <= 8 ? cp_frame-1 : cp_frame-7;     // mapping frames 1..8, 15, 16
    if (cp_type == $55) return cp_frame-17;
    if (cp_type == $34) return cp_frame-1;
    if (cp_type == $0A) return cp_frame-5;
    return cp_frame-7;
}
function chaos_54_draw() {
    var cp_b=chaos_54_state();
    if (!chaos_is_sez() || cp_b == noone || !cp_b.active || !variable_global_exists("chaosS2")) return;
    var cp_pool=global.chaosS2;
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=cp_pool.slots[cp_i];
        if (!cp_s.boss || cp_s.type == 0 || cp_s.type >= $F0 || cp_s.frame == 0) continue;
        var cp_type=(cp_s.type == $0F && cp_s.state == 0) ? cp_s.src_type : cp_s.type;
        var cp_sprite=-1;
        if (cp_type == $54) cp_sprite=cp_b.flash_white ? SPR_chaos_sez_boss_54_flash : SPR_chaos_sez_boss_54;
        else if (cp_type == $55) cp_sprite=cp_b.flash_white ? SPR_chaos_sez_boss_55_flash : SPR_chaos_sez_boss_55;
        else if (cp_type == $34) cp_sprite=SPR_chaos_sez_puff;
        else if (cp_type == $0A) cp_sprite=SPR_chaos_sez_sparkle;
        else if (cp_type == $0F) cp_sprite=SPR_chaos_sez_boss_poof;                             // same +(1,18) registration as the rest of the boss chain
        if (cp_sprite == -1) continue;
        draw_sprite(cp_sprite,chaos_54_sprite_frame(cp_type,cp_s.frame),chaos_54_x(cp_s),chaos_54_y(cp_s));
    }
}
