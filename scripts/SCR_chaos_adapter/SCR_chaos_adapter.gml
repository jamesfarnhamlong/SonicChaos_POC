// GameMaker-only bridge. Shared core owns terrain integration; built-in motion stays zero.
// Loops, object-$26 springs, monitors/combat remain explicit POC adapters. Type $28 platforms and type $1B spikes run AFTER the player's pass (SCR_chaos_objects_phase).
function SCR_chaos_core_attach(cp_p) {
    if (!variable_global_exists("chaosMovementTables")) SCR_chaos_core_data();
    // Stable sprite-to-ROM anchor; never derive physics probes from animated bbox.
    cp_p.chaosAnchorOffset = 18 - (sprite_get_bbox_bottom(SPR_player_mask)-sprite_get_yoffset(SPR_player_mask));
    cp_p.chaosCore = SCR_cc_new(cp_p.x, cp_p.y-cp_p.chaosAnchorOffset);
    cp_p.chaosCore.zone = chaos_is_sez() ? 2 : (chaos_is_mghz() ? 3 : (chaos_is_gpz() ? 1 : 0));
    cp_p.chaosCore.level = cp_p.chaosCore.zone;
    if (chaos_is_gpz() || chaos_is_mghz() || chaos_is_sez()) cp_p.chaosCore.yu=round(cp_p.y*256); // Research loader start is the canonical anchor, before the sprite adapter.
    cp_p.chaosCore.previous = SCR_cc_lookup(cp_p.x,cp_p.chaosCore.yu/256+18,0).flags;
    cp_p.chaosCore.vx = round(cp_p.hspeed*256);
    cp_p.chaosCore.vy = round(cp_p.vspeed*256);
    cp_p.chaosCoreLastX = cp_p.x;
    cp_p.chaosCoreLastY = cp_p.y;
    cp_p.chaosQueuedBounce = false;
    cp_p.chaosAdapterLoop = false;
    cp_p.chaosSpringVisual = false;
    // Per-update object-contact accumulator (D523 bits 6/7/5 staged by solid objects in the object phase, merged and cleared by SCR_chaos_adapter_step). Created here, the one place every
    // object-phase writer reaches first (objects call SCR_chaos_core_attach when no core exists), so no reader or writer ever sees it unset.
    cp_p.chaosBoxContacts = 0;
    cp_p.chaosShoeOwner = noone;      // $D3A4 equivalent: the attached type-$2F object (GameMaker instance id)
}
function SCR_chaos_core_publish(cp_p) {
    var cp_c = cp_p.chaosCore;
    cp_p.x = cp_c.xu/256;
    cp_p.y = chaos_signed_yu(cp_c.yu)/256+cp_p.chaosAnchorOffset; // SIGNED: the core keeps Y as an unsigned 24-bit value; above world Y 0 it must not publish ~65535
    cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
    cp_p.chaosGrounded = (cp_c.contacts & 2) != 0 && (cp_c.move & 1) == 0;
    cp_p.chaosModifier = cp_c.modifier; cp_p.chaosPreviousFlags = cp_c.previous;
    cp_p.chaosPlane = cp_c.plane; cp_p.chaosTile = cp_c.tile;
    cp_p.chaosMotionState = cp_c.state; cp_p.chaosSpringVertical = cp_c.next == 11;
    if (cp_c.next == 11) cp_p.chaosSpringVisual = true;
    if (cp_p.chaosGrounded) cp_p.chaosSpringVisual = false;
    cp_p.hspeed = 0; cp_p.vspeed = 0; cp_p.gravity = 0;
    var cp_state11 = cp_c.state == $11 || cp_c.next == $11;
    global.playerJump = !cp_state11 && (cp_c.move & 3) != 0;
    global.playerJumpSpring = !cp_state11 && (cp_c.next == 11 || cp_c.next == 28);
    global.playerSpinDash = !cp_state11 && cp_c.next == 15;
    global.playerFly = false;
    // ROM attack posture ($D503 bit 1): the ONLY thing badnik routines read (never 'airborne'). global.playerJump above is the legacy (move & 3) approximation.
    // The stored bit is published as is: Rocket entry clears it, state $11 never forces it either way, state $12 inherits it (docs/powerup-shoes-audit.md section 5/7).
    global.chaosAttackPosture = (cp_c.move & 2) != 0;
    cp_p.chaosAttack = global.chaosAttackPosture;
}
function SCR_chaos_core_sprites(cp_p) {
    var cp_c = cp_p.chaosCore;
    with (cp_p) {
        SCR_player_sprites();
        var cp_footwear = cp_c.state == $11 || cp_c.next == $11 || cp_c.state == $12 || cp_c.next == $12;
        // $48A7 owns the facing bit in the footwear states (a Rocket reversal changes facing while the old velocity still points the other way).
        if (cp_footwear) image_xscale = (cp_c.player_flags & 16) != 0 ? -1 : 1;
        else if (cp_c.vx != 0) image_xscale = sign(cp_c.vx);
        if (image_xscale < 0) cp_c.player_flags |= 16; else cp_c.player_flags &= ~16;
        var cp_sprite = SPR_player_walk;
        var cp_state11_visual = cp_c.state == $11 || cp_c.next == $11;
        var cp_state12_visual = cp_c.state == $12 || cp_c.next == $12;
        var cp_hurt_visual = cp_c.state == $1E || cp_c.next == $1E;
        // Task 07: exact ROM frames $38/$39/$3A. The core owns the canonical
        // 8/4/8/4 timing; GameMaker animation timing is deliberately disabled.
        if (cp_state11_visual) cp_sprite = SPR_chaos_player_state_11;
        else if (cp_state12_visual) cp_sprite = SPR_player_jump;   // state $12's script is the single spring-pose record $0B
        else if (cp_hurt_visual) cp_sprite = SPR_player_falling;
        // State $20 owns the run-off animation. The ROM handoff can retain
        // attack/airborne bits for this first update; they must not select the
        // GameMaker spin/fall sprites while the clear handler is running.
        else if (cp_c.state == $20) cp_sprite = cp_c.vx == 0 ? SPR_player_stop :
            (abs(cp_c.vx) >= 1024 ? SPR_player_run : SPR_player_walk);
        // GameMaker presentation adapter, matching the existing loop run/spin
        // policy; the recovered coordinate tables alone control the anchor.
        else if (cp_c.state == $13) cp_sprite = (cp_c.move&2) != 0 ? SPR_player_spin : SPR_player_run;
        else if (cp_c.next == 15) cp_sprite = SPR_player_spin_dash;
        else if (cp_c.state == 34 || cp_c.next == 9 || (cp_c.move & 2) != 0) cp_sprite = SPR_player_spin;
        else if (cp_p.chaosSpringVisual && cp_c.vy < 0) cp_sprite = SPR_player_jump;
        else if ((cp_c.move & 1) != 0) cp_sprite = SPR_player_falling;
        else if (cp_c.next == 3) cp_sprite = SPR_player_up;
        else if (cp_c.next == 4) cp_sprite = SPR_player_down;
        else if (cp_c.vx == 0) cp_sprite = SPR_player_stop;
        else if (cp_c.next == 7 || cp_c.next == 8) cp_sprite = SPR_player_break;
        else if (abs(cp_c.vx) >= 1024) cp_sprite = SPR_player_run;
        if (sprite_index != cp_sprite) { sprite_index = cp_sprite; image_index = 0; }
        // Chaos angle $40 is level rightward motion, so it is the sprite's zero.
        image_angle = cp_c.state == 34 ? (cp_c.angle-64)*360/256 : 0;
        if (cp_c.state == $13) {
            var cp_route_index=cp_c.route_progress>>8;
            var cp_before=max(0,cp_route_index-3), cp_after=min(511,cp_route_index+3);
            image_angle=point_direction(global.chaosRoute19X[cp_before],global.chaosRoute19Y[cp_before],
                global.chaosRoute19X[cp_after],global.chaosRoute19Y[cp_after]);
        }
        if (cp_state11_visual) {
            image_index = cp_c.state11_frame == $38 ? 0 :
                (cp_c.state11_frame == $39 ? 1 : 2);
            image_speed = 0;
        }
        else if (cp_state12_visual) { image_index = 0; image_speed = 0; }
        else image_speed = (cp_p.chaosSpringVisual && cp_c.vy < 0) ? 0 :
            (cp_c.vx == 0 ? 0.15 : clamp(abs(cp_c.vx)/4096,0.075,0.325));
    }
}
function SCR_chaos_adapter_step(cp_p) {
    if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
    var cp_c = cp_p.chaosCore;
    // Explicit external placement (platform carry/debug/checkpoint), not collision snapping.
    if (cp_p.x != cp_p.chaosCoreLastX || cp_p.y != cp_p.chaosCoreLastY) {
        cp_c.xu = round(cp_p.x*256);
        cp_c.yu = round((cp_p.y-cp_p.chaosAnchorOffset)*256);
    }
    with (cp_p) { SCR_buttons(); }
    cp_c.held = (global.btUp ? 1 : 0) | (global.btDown ? 2 : 0) |
        (global.btLeft ? 4 : 0) | (global.btRight ? 8 : 0) | (global.btSpace ? 16 : 0);
    cp_c.pressed = global.btSpacePress ? 16 : 0;
    if (cp_p.chaosQueuedBounce) {
        // Existing sample combat rebound retained as a labelled adapter, not a ROM finding.
        cp_c.vy = -round(min(1088,max(256,abs(cp_c.vy)))*1.1);
        cp_c.move |= 3; cp_c.bg &= ~2; cp_c.next = 10; cp_c.jump_ticks = 32;
        cp_p.chaosSupport = noone; cp_p.chaosQueuedBounce = false;
    }
    // Legacy loop/platform helpers receive velocity only while called synchronously.
    cp_p.hspeed = cp_c.vx/256; cp_p.vspeed = cp_p.chaosGrounded ? 0 : cp_c.vy/256;
    cp_p.gravity = 0;
    global.valGravity = 48/256;
    cp_p.chaosAdapterLoop = SCR_chaos_player_begin(cp_p);
    cp_c.xu = round(cp_p.x*256); cp_c.yu = round((cp_p.y-cp_p.chaosAnchorOffset)*256);
    cp_c.ring_probe_valid = false; // ordinary terrain-ring probe ($753E): set below only for an update that reaches it
    if (cp_p.chaosAdapterLoop) {
        cp_p.chaosBoxContacts = 0;   // no merge this update: never carry staged object contacts across a loop
        SCR_chaos_power_tick(cp_p,cp_c);
        cp_p.hspeed = 0; cp_p.vspeed = 0; cp_p.gravity = 0;
        cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
        return;
    }
    // Platform ownership ($D3C0) persists on the core between the object phase and the next player pass; only an external release (spring launch, loop entry, hurt) clears
    // the GameMaker reference. The player's speeds and flags are NOT touched here: a rider keeps its Y speed and the airborne bit until the landing is registered.
    if (!instance_exists(cp_p.chaosSupport)) cp_c.support = 0;
    cp_c.objects = cp_c.support != 0 ? 32 : 0;
    // Immunity and ring inputs of the recovered damage path ($48F7 / $48BC live in the core).
    cp_c.rings = global.ring; cp_c.shield = global.powerShield;
    cp_c.immune = global.playerSuper || global.powerInv || (global.playerBlink && (cp_c.move & 128) == 0);
    // Wall flags written by an object phase (type $1B side contact) reach the X integration TWO updates later: the object phase writes $D521 after update N, the end-of-pass merge of
    // update N+1 copies it into $D523, and the X integration of update N+2 reads that (Research: a walker stops two updates after the contact). Two-stage pipeline:
    cp_c.objects |= cp_c.box_ready; cp_c.box_ready = cp_c.box_contacts; cp_c.box_contacts = 0;
    // Solid type-$10 boxes report side contacts here (see OBJ_chaos_object_10); consumed once.
    cp_c.objects |= cp_p.chaosBoxContacts; cp_p.chaosBoxContacts = 0;
    // Sample monitor collision supplies object-side flags; never rewrites terrain profiles.
    if ((cp_c.move & 3) == 0) {
        with (cp_p) {
            if (cp_c.vx > 0 && place_meeting(x+cp_c.vx/256,y,OBJ_monitors)) cp_c.objects |= 64;
            if (cp_c.vx < 0 && place_meeting(x+cp_c.vx/256,y,OBJ_monitors)) cp_c.objects |= 128;
        }
    }
    SCR_cc_merge(cp_c);
    cp_c.state11_active = global.chaosPowerTimer > 0;   // $D44C != 0 (the callback tests the shared timer, not the selector)
    cp_c.state11_camera_y = floor(camera_get_view_y(view_camera[0]));
    cp_c.camera_x = floor(camera_get_view_x(view_camera[0])); // state $20 act-clear threshold input
    cp_c.clear_dx = chaos_goal_clear_dx(camera_get_view_width(view_camera[0])); // widescreen adapter: view right edge + 33 (canonical $121 on the 256 px screen)
    // Dedicated GameMaker adapter resolves breakable $47 before the ordinary
    // terrain sensors. A successful attack therefore cannot become damage.
    SCR_chaos_block47_step(cp_p);
    // ROM $4A74: while power code 3 is active the maximum-X-speed field $D373 is written $0600 every update (walking
    // states otherwise store $0400). Written before the tick so the horizontal integration uses it.
    if (global.chaosPowerCode == $03) cp_c.maximum = $0600;
    // Shadow +$07 animation counter (ROM engine $64FA, runs BEFORE the state callback). Inputs are what the previous update left behind: the requested
    // state, the X speed high byte, floor contact ($D522 bit 1) and side contacts ($D523 & $0C). Never driven by GameMaker image_index/image_speed.
    var cp_anim_t = SCR_cc_anim_update(cp_c);
    if (chaos_is_mghz()) cp_c.frame_counter = global.chaosMghzEffects.frame;
    if (chaos_is_sez()) cp_c.frame_counter = global.chaosSezEffects.frame;
    SCR_cc_tick(cp_c);
    SCR_chaos_footwear_phase(cp_p,cp_c);
    // Widescreen room boundary adapter. Original camera-relative 256px clipping is omitted.
    // State $20 runs past the map edge exactly as the ROM does (shared terrain lookup), so the boundary adapter yields to it.
    if (cp_c.state != 32 && (cp_c.xu < 16*256 || cp_c.xu > (room_width-9)*256)) {
        cp_c.xu = clamp(cp_c.xu,16*256,(room_width-9)*256); cp_c.vx = 0;
    }
    // Original player edge clamp, active between sign contact and state $20: EDGE(LEFT,+16)..EDGE(RIGHT,-9) of the live view as
    // full-width integers (GameMaker adapter; the ROM's 8-bit low-byte clamp is not reproduced, see chaos_goal_clamp_player).
    if ((global.chaosGoalContact || (chaos_gpz_act()==3 && instance_exists(OBJ_chaos_object_51) && instance_find(OBJ_chaos_object_51,0).chaosBoss51.active) || chaos_56_owns_camera()) && cp_c.state != 32 && cp_c.next != 32) {
        var cp_clamp = chaos_goal_clamp_player(chaos_vp_current(), cp_c.xu, cp_c.vx);
        cp_c.xu = cp_clamp.xu; cp_c.vx = cp_clamp.vx;
    }
    if (chaos_is_thz3() && instance_exists(OBJ_chaos_object_50) && cp_c.state != 32 && cp_c.next != 32) {
        var cp_boss=instance_find(OBJ_chaos_object_50,0).chaosBoss;
        if (cp_boss.camera_mode == 3) {
            var cp_arena=chaos_boss_clamp(cp_c.xu,cp_c.vx,chaos_vp_current().w);
            cp_c.xu=cp_arena.xu; cp_c.vx=cp_arena.vx;
        }
    }
    SCR_chaos_core_publish(cp_p);
    // Terrain-ring probe ($753E): one integer point from the update's FINAL anchor (after movement, projection and the room/clamp adapters; the platform phase runs later, as in the ROM) using the
    // current +$07 counter. States outside the recovered 26-state list (loop, twist, act-clear, ...) never probe. The ring manager consumes it.
    if (!cp_c.terrain_escape) chaos_ring_probe_update(cp_c, cp_anim_t);
    SCR_chaos_core_sprites(cp_p);
    if (global.music == 1) {
        if (cp_c.sound == 1) audio_play_sound(SFX_sonic_jump,10,false);
        if (cp_c.sound == 2) audio_play_sound(SFX_sonic_spring,10,false);
    }
    // $48BC: the damage gate runs once at the end of every player update (a static-spike hurt already ran inside the terrain pass). Recovered hurt consequences are applied
    // to the GameMaker side here; every other damage source keeps the sample-engine path (SCR_chaos_sample_damage -> SCR_chaos_apply_hazard_damage), outside this milestone.
    if (!cp_c.crush_death && cp_c.state != 19) SCR_cc_damage_gate(cp_c); // direct $4984 bypasses the hurt gate
    SCR_chaos_hurt_apply(cp_p);
    if (!cp_c.hurt_pending) with (cp_p) { SCR_chaos_sample_damage(); }
}
function SCR_chaos_adapter_end(cp_p) {
    if (!variable_instance_exists(cp_p,"chaosCore")) return;
    var cp_c = cp_p.chaosCore;
    if (cp_p.chaosAdapterLoop && cp_p.chaosReleasePending) {
        cp_c.xu = round(cp_p.x*256); cp_c.yu = round((cp_p.y-cp_p.chaosAnchorOffset)*256);
        cp_c.vx = round(cp_p.chaosReleaseX*256); cp_c.vy = round(cp_p.chaosReleaseY*256);
        cp_c.bg = 0; cp_c.contacts = 0; cp_c.move = 1; cp_c.next = 14;
        cp_c.plane = global.chaosLoopPlanes[cp_p.chaosLoopNumber];
        cp_p.chaosReleasePending = false;
        cp_c.previous = SCR_cc_lookup(cp_p.x,cp_c.yu/256+18,cp_c.plane).flags;
    }
    cp_p.hspeed = 0; cp_p.vspeed = 0; cp_p.gravity = 0;
    cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
}
// Mapped type $26 spring logic lives in SCR_chaos_spring (recovered ROM model); only its drawing remains here.
function SCR_chaos_object_spring_draw(cp_o) {
    if (chaos_is_sez() && (!cp_o.chaosLive || cp_o.chaosAsleep)) return;
    if (cp_o.chaosOffset <= 0) return; // Original frame zero is concealed.
    var cp_cap_y = cp_o.chaosBaseY-cp_o.chaosOffset;
    draw_set_color(make_color_rgb(230,230,230));
    for (var cp_y=cp_cap_y+7; cp_y<cp_o.chaosBaseY; cp_y+=4) {
        var cp_side = (((cp_y-cp_cap_y) div 4) & 1) ? 3 : -3;
        draw_line_width(cp_o.chaosDrawX-cp_side,cp_y,cp_o.chaosDrawX+cp_side,cp_y+4,2);
    }
    draw_set_color(c_white);
    draw_sprite(chaos_is_sez() ? SPR_chaos_sez_spring : (chaos_is_gpz() ? SPR_chaos_gpz_spring : SPR_chaos_object_26),0,cp_o.chaosDrawX,cp_cap_y+17);
}

function SCR_chaos_cancel_state11(cp_p) {
    if (!instance_exists(cp_p) || !variable_instance_exists(cp_p,"chaosCore")) return;
    var cp_c = cp_p.chaosCore;
    // $48F7 tests the CURRENT state ($D501 == $11) only. It clears the selector $D532 and the queued reward bit 3, restores the level music and requests sound $C3,
    // then enters hurt $1E ($4942). The timer $D44C is left alone and the rings are not touched.
    if (cp_c.state != $11) return;
    if (global.chaosPowerCode == $06) global.powerInv = false;   // POC mirror of selector 6
    global.chaosPowerCode = 0;
    cp_c.reward_queue &= ~8;
    global.chaosLastSoundRequest = $C3;
    global.chaosMusicRestoreRequested = true;
    cp_c.state = $1E; cp_c.next = $1E;
    cp_c.state11_active = false;
}

/// GameMaker side of a recovered hurt ($48F7, SCR_cc_hurt_rom): rings, scatter object, death object, blink presentation. Also mirrors the core's invulnerability
/// ($D3B1 countdown, +$03 bit 7) into global.playerBlink so the sample-engine consumers (badniks, monitors, blinking) see the same immunity.
function SCR_chaos_hurt_apply(cp_p) {
    var cp_c = cp_p.chaosCore;
    var cp_inv = (cp_c.move & 128) != 0;
    if (cp_c.hurt_pending) {
        if (cp_c.crush_death) {
            global.chaosLastSoundRequest=$96;
            global.chaosCrushDeathPhase=1; // one final object move, then freeze
            with (cp_p) instance_change(OBJ_player_death,true);
            return;
        }
        var cp_rocket_hurt = cp_c.hurt_rocket;
        SCR_chaos_cancel_state11(cp_p);
        if (cp_c.hurt_death) {
            with (cp_p) instance_change(OBJ_player_death,true);
            return;
        }
        if (cp_c.hurt_shield) global.powerShield = false;
        else global.ring = cp_c.rings;
        // Recovered type-$06 lost rings (SCR_chaos_lost_ring): collectable, bouncing, no timer / blink. The legacy decorative OBJ_player_lost_b is no longer used here.
        if (cp_c.hurt_scatter > 0) SCR_chaos_lost_rings_emit(cp_p,cp_c.hurt_rings_lost);
        with (cp_p) alarm[2] = 1;
        cp_p.chaosSupport = noone;
        cp_p.chaosSpringVisual = false;
        SCR_chaos_core_publish(cp_p);
        if (global.music == 1 && !cp_rocket_hurt) audio_play_sound(SFX_sonic_lost_rings,10,false);
    }
    if (cp_inv) { global.playerBlink = true; cp_p.chaosRomBlink = true; }
    else if (variable_instance_exists(cp_p,"chaosRomBlink") && cp_p.chaosRomBlink) {
        cp_p.chaosRomBlink = false;
        if (global.chaosDamageBlinkTimer <= 0) global.playerBlink = false;
    }
}

function SCR_chaos_apply_hazard_damage(cp_p) {
    if (global.playerSuper || global.playerBlink || global.powerInv) return;
    if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
    if (cp_p.chaosCore.state == $11) {
        // $48F7 Rocket branch: rings (also zero), shield and the ordinary no-ring death selection are bypassed; the shared hurt result is applied.
        cp_p.chaosCore.rings = global.ring;
        SCR_cc_hurt_rom(cp_p.chaosCore);
        SCR_chaos_hurt_apply(cp_p);
        return;
    }
    if (!global.powerShield && global.ring <= 0) {
        with (cp_p) instance_change(OBJ_player_death,true);
        return;
    }
    if (global.powerShield) global.powerShield = false;
    else {
        var cp_lost = global.ring;
        global.ring = 0;
        SCR_chaos_lost_rings_emit(cp_p,cp_lost);
    }
    global.playerBlink = true;
    // Immunity intentionally outlasts the bounded hurt state so recovered
    // movement can occur while blinking without disabling terrain sensing.
    global.chaosDamageBlinkTimer = 90;
    with (cp_p) alarm[2] = 1;
    SCR_cc_hurt_enter(cp_p.chaosCore);
    cp_p.chaosSupport = noone;
    cp_p.chaosGrounded = false;
    cp_p.chaosSpringVisual = false;
    if (global.music == 1) audio_play_sound(SFX_sonic_lost_rings,10,false);
}

// Four canonical THZ1 terrain cells only. This adapter does not reinterpret
// type $10 objects or move the source cells; it changes $47 to empty $46.
function SCR_chaos_block47_step(cp_p) {
    if (chaos_is_gpz() || chaos_is_mghz() || chaos_is_sez()) return false; // GPZ uses canonical terrain dispatch, not the accepted THZ1 four-cell swept adapter.
    if (!variable_instance_exists(cp_p,"chaosCore")) return false;
    var cp_c = cp_p.chaosCore;
    // Breakable $47 needs the canonical attack bit and excludes the states $0F/$10/$15/$1A (spring audit); the legacy playerJump / spin-object predicates are gone.
    var cp_attack = chaos_attack_posture(cp_c) && cp_c.state != $0F && cp_c.state != $10 && cp_c.state != $15 && cp_c.state != $1A;
    if (!cp_attack) return false;

    var cp_x = cp_c.xu/256;
    var cp_y = cp_c.yu/256;
    var cp_next_x = cp_x+cp_c.vx/256;
    var cp_next_y = cp_y+cp_c.vy/256;
    var cp_swept_left = min(cp_x-9,cp_next_x-9);
    var cp_swept_right = max(cp_x+9,cp_next_x+9);
    var cp_swept_top = min(cp_y-6,cp_next_y-6);
    var cp_swept_bottom = max(cp_y+18,cp_next_y+18);
    if (cp_swept_bottom < 256 || cp_swept_top >= 288) return false;

    var cp_first = cp_c.vx < 0 ? 3 : 0;
    var cp_last = cp_c.vx < 0 ? -1 : 4;
    var cp_delta = cp_c.vx < 0 ? -1 : 1;
    for (var cp_slot = cp_first; cp_slot != cp_last; cp_slot += cp_delta) {
        if (global.chaosTileIds[1128+cp_slot] != 71) continue;
        var cp_left = 3328+cp_slot*32;
        var cp_right = cp_left+32;
        if (cp_swept_right < cp_left || cp_swept_left >= cp_right) continue;

        // GameMaker contact adapter: a descending attack that crosses the top
        // plane rebounds; a pure horizontal entry keeps its existing motion.
        var cp_top_impact = cp_c.vy > 0 && cp_y+18 <= 256 && cp_next_y+18 >= 256;
        global.chaosTileIds[1128+cp_slot] = 70;
        global.ring += 10;
        if (cp_top_impact) {
            cp_c.vy = -1088; // $FBC0 = -4.25 px/update; cp_c.vx is preserved.
            cp_c.move |= 1;
            cp_c.bg &= ~2; cp_c.contacts &= ~2;
            cp_p.chaosSupport = noone;
            cp_p.chaosGrounded = false;
        }
        instance_create_depth(cp_left+16,264,-21,OBJ_chaos_object_0F_transient);
        return true;
    }
    return false;
}

// Bounded object-floor adapter using the same decoded THZ collision header and
// vertical-profile arithmetic as the player core. The returned Y is the object
// anchor used by the original ground-patrol callback.
function SCR_chaos_object_floor_project(cp_x, cp_y) {
    // Probe 18 pixels below the object anchor, then apply the profile
    // correction to the original, unshifted anchor Y.
    var cp_s = SCR_cc_lookup(floor(cp_x),floor(cp_y)+18,0);
    if ((cp_s.flags & 192) == 0) return {grounded:false,y:cp_y};
    var cp_solid = (cp_s.flags & 128) != 0;
    var cp_value = cp_s.vertical;
    if (cp_solid) cp_value &= 63;
    var cp_total = (cp_value+(cp_s.ay & 31)) & 255;
    if (cp_total < 32) return {grounded:false,y:cp_y};
    return {grounded:true,y:cp_y-(cp_total-32)};
}

// Type $21 top contact requests player state $0B with signed 8.8 velocity
// $F940. This deliberately bypasses the stronger terrain-spring impulses.
function SCR_chaos_type21_top_bounce(cp_p) {
    if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
    var cp_c = cp_p.chaosCore;
    cp_c.vy = -1728;
    cp_c.next = 11;
    cp_c.move = (cp_c.move|1)&~2;
    cp_c.bg &= ~2; cp_c.contacts &= ~2;
    cp_p.chaosSupport = noone;
    cp_p.chaosGrounded = false;
    cp_p.chaosSpringVisual = true;
    global.playerJumpSpring = true; // spring-flight physics only: the stomp CLEARS the attack bit ($480C), so no attack predicate is set here
    if (global.music == 1) audio_play_sound(SFX_sonic_spring,10,false);
}

/// Type $21 defeat presentation (the ROM converts the slot to type $0F). THZ keeps the accepted sample explosion; the MGHZ alt-start object reuses the accepted MGHZ
/// $0F poof art with the shared $0F timeline (chaos_gpz_smoke_frames) at the converted anchor.
function chaos_type21_defeat(cp_o) {
    if (cp_o.chaosAltStart) {
        var cp_smoke = instance_create(cp_o.x,cp_o.y,OBJ_chaos_gpz_smoke_0F);
        cp_smoke.sprite_index = SPR_chaos_mghz_poof;
        cp_smoke.chaosPlacementToken = 0;
        cp_smoke.chaosAnchorDraw = true;
    } else instance_create(cp_o.x,cp_o.y-13,OBJ_explosion);
}

// Preserve the verified original three-byte award independently of the sample
// engine's unrelated decimal score display.
function SCR_chaos_enemy_score_100_bytes() {
    global.chaosLastEnemyScore0 = $10;
    global.chaosLastEnemyScore1 = $00;
    global.chaosLastEnemyScore2 = $00;
}

function SCR_chaos_bcd_add(cp_value, cp_amount) {
    var cp_decimal = ((cp_value >> 4) & 15)*10+(cp_value & 15)+cp_amount;
    cp_decimal = clamp(cp_decimal,0,99);
    return ((cp_decimal div 10) << 4) | (cp_decimal mod 10);
}

// Type $10 parameters retain numeric identities. These fields mirror the
// verified RAM effects without assigning conventional item names.
function SCR_chaos_type10_reward(cp_parameter, cp_p) {
    global.chaosType10QueuedMask = 1 << (cp_parameter-1);
    if (cp_parameter == $02) {
        if (!variable_global_exists("chaosType10D299")) global.chaosType10D299 = 0;
        global.chaosType10D299 = SCR_chaos_bcd_add(global.chaosType10D299,1);
        global.chaosLastSoundRequest = $A9;
    } else if (cp_parameter == $04) {
        if (global.player == 1) {
            // Breaking the monitor only queues $D3A3 bit 3 (object phase N). The player's next update runs its old state first; the reward dispatcher then writes
            // selector 4 / timer 300 and requests $11 (SCR_chaos_footwear_phase), so the first $11 callback is update N+2.
            if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
            cp_p.chaosCore.reward_queue |= 8;
        } else {
            if (!variable_global_exists("chaosType10D29A")) global.chaosType10D29A = 0;
            global.chaosType10D29A = SCR_chaos_bcd_add(global.chaosType10D29A,10);
        }
    } else if (cp_parameter == $01) {
        // THZ3 parameter $01 (branch $4AC0): BCD $D29A += $10 with the ordinary carry (docs/thz2-thz3-object-deltas.md section 3.3): ten rings; the sample HUD already turns 100 rings into a life.
        global.ring += 10;
        if (!variable_global_exists("chaosType10D29A")) global.chaosType10D29A = 0;
        global.chaosType10D29A = SCR_chaos_bcd_add(global.chaosType10D29A,10);
    } else if (cp_parameter == $03) {
        // THZ2 parameter $03 (dispatch branch $4B0F): power code 3 and a 900-update timer. No sound, no player state
        // request, no velocity change. The effect is the per-update maximum-X-speed field below.
        global.chaosPowerCode = $03;
        global.chaosPowerTimer = 900;
    } else if (cp_parameter == $06) {
        global.chaosPowerCode = $06;
        global.chaosPowerTimer = 600;
        global.chaosLastSoundRequest = $84;
        global.powerInv = true;
        // The audited contract proves allocation of type $05 parameter zero;
        // POC 18.4 adds only its verified 32-frame presentation. The exact
        // original special-render anchor remains unresolved, so this bounded
        // adapter follows the active player and never uses the container X/Y.
        global.chaosType05Allocated = true;
        global.chaosType05Parameter = 0;
        if (!instance_exists(OBJ_chaos_object_05_effect))
            instance_create(cp_p.x, cp_p.y, OBJ_chaos_object_05_effect);
    }
    global.chaosType10QueuedMask = 0;
}

function SCR_chaos_spike_draw(cp_o) {
    if (chaos_is_sez() && (!cp_o.chaosLive || cp_o.chaosAsleep)) return;
    // Mapping frame $0E is 24x32. The ROM moves it upward only 18 pixels;
    // presentation keeps the exposed portion bottom-aligned to the floor so
    // it grows upward from 18 pixels at rest to the complete raised frame.
    var cp_visible = min(32,18+cp_o.chaosOffset);
    draw_sprite_part(
        chaos_is_sez() ? SPR_chaos_sez_spike : (chaos_is_mghz() ? SPR_chaos_mghz_spike : (chaos_is_gpz() ? SPR_chaos_gpz_spike : SPR_chaos_object_1B)),0,
        4,4,24,cp_visible,
        cp_o.x-12,cp_o.chaosBaseY-cp_visible
    );
}

function SCR_chaos_sample_damage() {
    if (place_meeting(x,y,OBJ_collision_death)) SCR_chaos_apply_hazard_damage(id);
    // Recovered death rule ($401A): fatal iff the SIGNED screen Y (anchor Y - camera Y) is >= $D0. Above the camera is never fatal. (Non-core objects keep the room test.)
    var cp_fatal = variable_instance_exists(id,"chaosCore") ? chaos_vertical_death(chaosCore.yu, camera_get_view_y(view_camera[0])) : (y > room_height);
    if (cp_fatal) { instance_change(OBJ_player_death,true); return; }
    // Shared recovered damage path: stage the request $D3B0; $48BC hurts Sonic in his next update.
    if (place_meeting(x,y,OBJ_badniks) && variable_instance_exists(id,"chaosCore") && !chaos_attack_or_invincible(chaosCore,global.powerInv))
        chaos_request_stage(chaosCore);
}

// $7898: the collided map cell becomes $9D (empty, collision flags $00). Fragments (four type-$07 objects) and
// the $D3B2 timer set by the floor entry are UNRESOLVED and deliberately not presented.
function SCR_chaos_break_block(cp_index) {
    if (!variable_global_exists("chaosBrokenCells")) global.chaosBrokenCells = [];
    if (global.chaosTileIds[cp_index] == 157) return;
    global.chaosTileIds[cp_index] = 157;
    array_push(global.chaosBrokenCells, cp_index);
}

/// $7857 -> $46 and $4AC2 ten-ring reward. Shared terrain mutation, no monitor overlap.
function SCR_chaos_break16_block(cp_index) {
    if (global.chaosTileIds[cp_index] != 71) return;
    global.chaosTileIds[cp_index]=70;
    array_push(global.chaosBrokenCells,cp_index);
    global.ring += 10;
    // Canonical type $0F parameter $40 uses the existing ROM-derived smoke frames.
    var cp_width=global.chaosMapWidth;
    var cp_fx=instance_create_depth((cp_index mod cp_width)*32+16,(cp_index div cp_width)*32+8,-20,OBJ_chaos_object_0F_transient);
    cp_fx.chaosParameter=$40;
    if (chaos_is_sez()) cp_fx.sprite_index=SPR_chaos_sez_poof;
    else if (chaos_is_gpz()) cp_fx.sprite_index=SPR_chaos_gpz_poof;
}

/// Shared selector/timer ($D532 / $D44C) end-of-player-update step plus the queued Rocket reward ($D3A3 bit 3). Order inside one update: the old state's callback,
/// then the decrement, then the reward dispatcher. A Rocket reward therefore leaves the timer at 300 for the first full callback (300 callbacks enter with 300..1; the
/// next one enters with zero). Speed-up (code 3) is not cleared at zero (docs/thz2-thz3-object-deltas.md); codes 4 and 6 are.
function SCR_chaos_power_tick(cp_p, cp_c) {
    if (global.chaosPowerTimer > 0) {
        global.chaosPowerTimer--;
        if (global.chaosPowerTimer == 0) {
            if (global.chaosPowerCode == $06) global.powerInv = false;
            if (global.chaosPowerCode != $03) global.chaosPowerCode = 0;
        }
    }
    if ((cp_c.reward_queue & 8) != 0) {
        cp_c.reward_queue &= ~8;
        global.chaosPowerCode = $04;
        global.chaosPowerTimer = 300;
        global.chaosLastSoundRequest = $85;
        SCR_cc_state11_enter(cp_c);
    }
}

/// Everything footwear-related that follows the player's callback: shared timer/reward, and the Spring Shoes owner ($D3A4): positioning ($3BA8 -> $5F27: owner X = player X,
/// owner Y = player Y + 16 while the owner shows mapping frame 3, else + 11) and the owner-state requests the callback writes (3 after each bounce, 5 on detach).
function SCR_chaos_footwear_phase(cp_p, cp_c) {
    // The Rocket exit callback ($3AB5: timer zero) restores the level music itself ($189B) before it requests falling.
    if (cp_c.state11_exit) { global.chaosLastSoundRequest = $81; global.chaosMusicRestoreRequested = true; }
    SCR_chaos_power_tick(cp_p,cp_c);
    var cp_owner = cp_p.chaosShoeOwner;
    var cp_has = instance_exists(cp_owner);
    if (cp_c.state == $12 && cp_has) {
        cp_owner.x = floor(cp_c.xu/256);
        cp_owner.y = chaos_signed_world_y(cp_c.yu) + (cp_owner.chaosFrame == 3 ? 16 : 11);
        cp_owner.chaosYU = round(cp_owner.y*256);
    }
    if (cp_has && cp_c.owner_event != 0) cp_owner.chaosRequest = cp_c.owner_event;
    if (cp_c.state != $12 && cp_c.next != $12) cp_p.chaosShoeOwner = noone;
}
