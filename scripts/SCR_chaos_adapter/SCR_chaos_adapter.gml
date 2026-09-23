// GameMaker-only bridge. Shared core owns terrain integration; built-in motion stays zero.
// Loops, object-$26 springs, moving platforms, monitors/combat remain explicit POC adapters.
function SCR_chaos_core_attach(cp_p) {
    if (!variable_global_exists("chaosMovementTables")) SCR_chaos_core_data();
    // Stable sprite-to-ROM anchor; never derive physics probes from animated bbox.
    cp_p.chaosAnchorOffset = 18 - (sprite_get_bbox_bottom(SPR_player_mask)-sprite_get_yoffset(SPR_player_mask));
    cp_p.chaosCore = SCR_cc_new(cp_p.x, cp_p.y-cp_p.chaosAnchorOffset);
    cp_p.chaosCore.previous = SCR_cc_lookup(cp_p.x,cp_p.y-cp_p.chaosAnchorOffset+18,0).flags;
    cp_p.chaosCore.vx = round(cp_p.hspeed*256);
    cp_p.chaosCore.vy = round(cp_p.vspeed*256);
    cp_p.chaosCoreLastX = cp_p.x;
    cp_p.chaosCoreLastY = cp_p.y;
    cp_p.chaosQueuedBounce = false;
    cp_p.chaosAdapterLoop = false;
    cp_p.chaosSpringVisual = false;
}
function SCR_chaos_core_publish(cp_p) {
    var cp_c = cp_p.chaosCore;
    cp_p.x = cp_c.xu/256;
    cp_p.y = cp_c.yu/256+cp_p.chaosAnchorOffset;
    cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
    cp_p.chaosGrounded = (cp_c.contacts & 2) != 0 && (cp_c.move & 1) == 0;
    cp_p.chaosModifier = cp_c.modifier; cp_p.chaosPreviousFlags = cp_c.previous;
    cp_p.chaosPlane = cp_c.plane; cp_p.chaosTile = cp_c.tile;
    cp_p.chaosMotionState = cp_c.state; cp_p.chaosSpringVertical = cp_c.next == 11;
    if (cp_c.next == 11) cp_p.chaosSpringVisual = true;
    if (cp_p.chaosGrounded) cp_p.chaosSpringVisual = false;
    cp_p.hspeed = 0; cp_p.vspeed = 0; cp_p.gravity = 0;
    global.playerJump = (cp_c.move & 3) != 0;
    global.playerJumpSpring = cp_c.next == 11 || cp_c.next == 28;
    global.playerSpinDash = cp_c.next == 15;
    global.playerFly = false;
}
function SCR_chaos_core_sprites(cp_p) {
    var cp_c = cp_p.chaosCore;
    with (cp_p) {
        SCR_player_sprites();
        if (cp_c.vx != 0) image_xscale = sign(cp_c.vx);
        if (image_xscale < 0) cp_c.player_flags |= 16; else cp_c.player_flags &= ~16;
        var cp_sprite = SPR_player_walk;
        if (cp_c.next == 15) cp_sprite = SPR_player_spin_dash;
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
        image_speed = (cp_p.chaosSpringVisual && cp_c.vy < 0) ? 0 :
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
    if (cp_p.chaosAdapterLoop) {
        cp_p.hspeed = 0; cp_p.vspeed = 0; cp_p.gravity = 0;
        cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
        return;
    }
    cp_c.support = instance_exists(cp_p.chaosSupport) ? 1 : 0;
    cp_c.objects = cp_c.support ? 32 : 0;
    if (cp_c.support) { cp_c.move &= ~1; cp_c.bg &= ~2; cp_c.vy = 0; SCR_cc_merge(cp_c); }
    // Sample monitor collision supplies object-side flags; never rewrites terrain profiles.
    if ((cp_c.move & 3) == 0) {
        with (cp_p) {
            if (cp_c.vx > 0 && place_meeting(x+cp_c.vx/256,y,OBJ_monitors)) cp_c.objects |= 64;
            if (cp_c.vx < 0 && place_meeting(x+cp_c.vx/256,y,OBJ_monitors)) cp_c.objects |= 128;
        }
    }
    SCR_cc_merge(cp_c);
    var cp_previous_foot = cp_c.yu/256+18;
    SCR_cc_tick(cp_c);
    // Widescreen room boundary adapter. Original camera-relative 256px clipping is omitted.
    if (cp_c.xu < 16*256 || cp_c.xu > (room_width-9)*256) {
        cp_c.xu = clamp(cp_c.xu,16*256,(room_width-9)*256); cp_c.vx = 0;
    }
    SCR_chaos_core_publish(cp_p);
    // Moving object surfaces remain separate from the ROM terrain map.
    if (cp_c.vy >= 0 && (cp_c.move & 1) != 0) {
        var cp_count = instance_number(OBJ_chaos_platform);
        for (var cp_i = 0; cp_i < cp_count; cp_i++) {
            var cp_platform = instance_find(OBJ_chaos_platform,cp_i);
            if (SCR_chaos_platform_overlap(cp_p,cp_platform) &&
                cp_previous_foot <= cp_platform.chaosPreviousY && cp_c.yu/256+18 >= cp_platform.y-1 &&
                cp_c.yu/256+18 <= cp_platform.y+20) {
                cp_c.yu = round((cp_platform.y-19)*256);
                cp_c.vy = 0; cp_c.support = 1; cp_c.objects = 32;
                cp_p.chaosSupport = cp_platform; SCR_cc_walk(cp_c); SCR_cc_merge(cp_c);
                SCR_chaos_core_publish(cp_p); break;
            }
        }
    }
    if ((cp_c.move & 1) != 0 && cp_c.vy < 0) {
        cp_p.chaosSupport = noone; cp_c.support = 0; cp_c.objects = 0;
    }
    SCR_chaos_core_sprites(cp_p);
    if (global.music == 1) {
        if (cp_c.sound == 1) audio_play_sound(SFX_sonic_jump,10,false);
        if (cp_c.sound == 2) audio_play_sound(SFX_sonic_spring,10,false);
    }
    // Keep sample-engine damage/ring-loss/death behaviour, outside the physics core.
    with (cp_p) { SCR_chaos_sample_damage(); }
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
function SCR_chaos_object_spring(cp_p, cp_launch_y) {
    if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
    var cp_c = cp_p.chaosCore;
    if (cp_c.vy < 0 || cp_p.chaosLoopActive) return false;
    // Bank 30 $82E7/$8410 supplies original signed 8.8 impulses.
    // Terrain spring types DO NOT use this object adapter.
    cp_c.vy = round(cp_launch_y*256); cp_c.next = 11; cp_c.move = (cp_c.move|1)&~2;
    cp_c.bg &= ~2; cp_c.contacts &= ~2;
    cp_p.chaosSupport = noone; cp_p.chaosGrounded = false;
    cp_p.chaosSpringVisual = true;
    with (cp_p) {
        SCR_player_sprites(); sprite_index = SPR_player_jump;
        image_index = 0; image_speed = 0; image_angle = 0;
    }
    return true;
}

function SCR_chaos_object_spring_contact(cp_o, cp_p, cp_trigger_x) {
    if (!variable_instance_exists(cp_p,"chaosCore") || cp_p.chaosLoopActive) return false;
    var cp_c = cp_p.chaosCore;
    if (cp_c.vy < 0 || cp_c.next == 33) return false;
    var cp_foot = cp_c.yu/256 + 18;
    // $7825A first moves the object anchor down 12. State 7 then compares the
    // player anchor with object Y-28, a six-pixel window. In foot coordinates
    // that is layout Y-3 through layout Y+2, not the retraction base itself.
    return abs(cp_p.x-cp_trigger_x) <= 12 &&
        cp_foot >= cp_o.chaosLayoutY-3 && cp_foot <= cp_o.chaosLayoutY+2;
}

function SCR_chaos_object_spring_step(cp_o) {
    var cp_p = instance_find(OBJ_player,0);
    if (!instance_exists(cp_p) ||
        (cp_p.object_index != OBJ_player_char && cp_p.object_index != OBJ_player_char_spin)) return;
    var cp_trigger_x = cp_o.chaosBaseX;

    // Parameter $8A: bit 7 selects state 8; low seven bits form a 16-pixel span.
    // State 8 aligns the concealed spring beneath Sonic before requesting state 9.
    if (cp_o.chaosState == 8) {
        cp_o.chaosOffset = 0;
        cp_o.chaosDrawX = cp_o.chaosBaseX;
        if (cp_p.x >= cp_o.chaosBaseX && cp_p.x < cp_o.chaosBaseX+cp_o.chaosSpan) {
            cp_trigger_x = floor(cp_p.x/16)*16;
            if (SCR_chaos_object_spring_contact(cp_o,cp_p,cp_trigger_x)) {
                cp_o.chaosDrawX = cp_trigger_x;
                if (SCR_chaos_object_spring(cp_p,cp_o.launch_y)) {
                    cp_o.chaosState = 3; cp_o.chaosTimer = 28;
                    if (global.music == 1) audio_play_sound(SFX_sonic_spring,10,false);
                }
            }
        }
        return;
    }

    // State 7 is the fixed concealed/contact state used by parameters $00/$01.
    if (cp_o.chaosState == 7) {
        cp_o.chaosOffset = 0; cp_o.chaosDrawX = cp_o.chaosBaseX;
        if (SCR_chaos_object_spring_contact(cp_o,cp_p,cp_o.chaosBaseX) &&
            SCR_chaos_object_spring(cp_p,cp_o.launch_y)) {
            cp_o.chaosState = (cp_o.chaosParameter == 1) ? 3 : 1;
            cp_o.chaosTimer = 28;
            if (global.music == 1) audio_play_sound(SFX_sonic_spring,10,false);
        }
        return;
    }

    // States 1/3 extend by seven pixels while subtracting seven from counter $1E.
    if (cp_o.chaosState == 1 || cp_o.chaosState == 3) {
        cp_o.chaosTimer -= 7;
        if (cp_o.chaosTimer < 0) {
            cp_o.chaosState = (cp_o.chaosState == 1) ? 2 : 4;
            cp_o.chaosTimer = (cp_o.chaosState == 2) ? 32 : 10;
        } else cp_o.chaosOffset += 7;
        return;
    }

    // States 2/4 hold extended; state-script duration then selects retract 5/6.
    if (cp_o.chaosState == 2 || cp_o.chaosState == 4) {
        cp_o.chaosTimer--;
        if (cp_o.chaosTimer < 0) cp_o.chaosState = (cp_o.chaosState == 2) ? 5 : 6;
        return;
    }

    // States 5/6 retract in four seven-pixel steps and return to the saved state.
    if (cp_o.chaosState == 5 || cp_o.chaosState == 6) {
        cp_o.chaosOffset = max(0,cp_o.chaosOffset-7);
        if (cp_o.chaosOffset == 0) cp_o.chaosState = cp_o.chaosRestState;
    }
}

function SCR_chaos_object_spring_draw(cp_o) {
    if (cp_o.chaosOffset <= 0) return; // Original frame zero is concealed.
    var cp_cap_y = cp_o.chaosBaseY-cp_o.chaosOffset;
    draw_set_color(make_color_rgb(230,230,230));
    for (var cp_y=cp_cap_y+7; cp_y<cp_o.chaosBaseY; cp_y+=4) {
        var cp_side = (((cp_y-cp_cap_y) div 4) & 1) ? 3 : -3;
        draw_line_width(cp_o.chaosDrawX-cp_side,cp_y,cp_o.chaosDrawX+cp_side,cp_y+4,2);
    }
    draw_set_color(c_white);
    draw_sprite(SPR_chaos_object_26,0,cp_o.chaosDrawX,cp_cap_y+17);
}

function SCR_chaos_apply_hazard_damage(cp_p) {
    if (global.playerSuper || global.playerBlink || global.powerInv) return;
    with (cp_p) {
        if (global.powerShield || global.ring > 0) instance_change(OBJ_player_lost_a,true);
        else instance_change(OBJ_player_death,true);
    }
}

function SCR_chaos_spike_step(cp_o) {
    var cp_cam = view_camera[0];
    var cp_left = camera_get_view_x(cp_cam)-64;
    var cp_right = cp_left+camera_get_view_width(cp_cam)+128;
    if (!cp_o.chaosActive) {
        if (cp_o.x < cp_left || cp_o.x > cp_right) return;
        cp_o.chaosActive = true; cp_o.chaosState = 1;
    }

    // Type $1B: rise/fall by six pixels; states 2/4 each last $30 updates.
    if (cp_o.chaosState == 1) {
        cp_o.chaosOffset = min(18,cp_o.chaosOffset+6);
        if (cp_o.chaosOffset == 18) { cp_o.chaosState = 2; cp_o.chaosTimer = 48; }
    } else if (cp_o.chaosState == 2) {
        cp_o.chaosTimer--;
        if (cp_o.chaosTimer <= 0) cp_o.chaosState = 3;
    } else if (cp_o.chaosState == 3) {
        cp_o.chaosOffset = max(0,cp_o.chaosOffset-6);
        if (cp_o.chaosOffset == 0) { cp_o.chaosState = 4; cp_o.chaosTimer = 48; }
    } else {
        cp_o.chaosTimer--;
        if (cp_o.chaosTimer <= 0) cp_o.chaosState = 1;
    }

    // Original AC8B/ACC3 damage checks run only while rising or raised.
    if (cp_o.chaosOffset > 0 && (cp_o.chaosState == 1 || cp_o.chaosState == 2) &&
        instance_exists(OBJ_player)) {
        var cp_p = instance_find(OBJ_player,0);
        if (cp_p.bbox_right >= cp_o.x-16 && cp_p.bbox_left <= cp_o.x+16 &&
            cp_p.bbox_bottom >= cp_o.chaosBaseY-cp_o.chaosOffset &&
            cp_p.bbox_top <= cp_o.chaosBaseY) SCR_chaos_apply_hazard_damage(cp_p);
    }
}

function SCR_chaos_spike_draw(cp_o) {
    if (cp_o.chaosOffset <= 0) return;
    var cp_bottom = cp_o.chaosBaseY;
    for (var cp_i=0; cp_i<3; cp_i++) {
        var cp_l = cp_o.x-15+cp_i*10;
        var cp_r = cp_l+10;
        var cp_m = (cp_l+cp_r)/2;
        draw_set_color(make_color_rgb(180,48,64));
        draw_triangle(cp_l,cp_bottom,cp_r,cp_bottom,cp_m,cp_bottom-cp_o.chaosOffset,false);
        draw_set_color(c_white);
        draw_triangle(cp_l+2,cp_bottom-2,cp_r-2,cp_bottom-2,
            cp_m,cp_bottom-cp_o.chaosOffset+2,false);
    }
}

function SCR_chaos_sample_damage() {
/// Deaths

if (place_meeting(x,y,OBJ_collision_death) && global.playerSuper == false && global.playerBlink == false)
{
    // If not have invincibility
    if (global.powerInv == false) 
    {
        // If have a Shield
        if (global.powerShield == true) 
        {
            instance_change(OBJ_player_lost_a, true);
        }
        else
        {
            if (global.ring > 0) 
            {
                instance_change(OBJ_player_lost_a, true);
            }
            else
            {
                instance_change(OBJ_player_death, true);
            }
        }
    }
}

// Outside Room
if (y > room_height) 
{
    instance_change(OBJ_player_death, true);
}


/// Deaths Badniks

if (place_meeting(x,y,OBJ_badniks) && global.playerSuper == false && 
    global.playerJump == false && global.playerSpinDash == false &&
    global.playerBlink == false)
{
    // If not have invincibility
    if (global.powerInv == false) 
    {
        // If have a Shield
        if (global.powerShield == true) 
        {
            instance_change(OBJ_player_lost_a, true);
        }
        else
        {
            if (global.ring > 0) 
            {
                instance_change(OBJ_player_lost_a, true);
            }
            else
            {
                instance_change(OBJ_player_death, true);
            }
        }
    }
}

}
