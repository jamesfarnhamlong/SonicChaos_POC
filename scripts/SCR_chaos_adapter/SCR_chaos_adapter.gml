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
        else if ((cp_c.move & 2) != 0) cp_sprite = SPR_player_spin;
        else if (cp_c.next == 11 && cp_c.vy < 0) cp_sprite = SPR_player_jump;
        else if ((cp_c.move & 1) != 0) cp_sprite = SPR_player_falling;
        else if (cp_c.next == 3) cp_sprite = SPR_player_up;
        else if (cp_c.next == 4) cp_sprite = SPR_player_down;
        else if (cp_c.vx == 0) cp_sprite = SPR_player_stop;
        else if (cp_c.next == 7 || cp_c.next == 8) cp_sprite = SPR_player_break;
        else if (abs(cp_c.vx) >= 1024) cp_sprite = SPR_player_run;
        if (sprite_index != cp_sprite) { sprite_index = cp_sprite; image_index = 0; }
        image_angle = 0;
        image_speed = cp_c.vx == 0 ? 0.15 : clamp(abs(cp_c.vx)/4096,0.075,0.325);
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
    // Object $26 parameters are still the pre-14.5 approximation, now in native units.
    // Terrain spring types DO NOT use this adapter; they dispatch inside the core.
    cp_c.vy = round(cp_launch_y*128); cp_c.next = 11; cp_c.move = (cp_c.move|1)&~2;
    cp_c.bg &= ~2; cp_c.contacts &= ~2;
    cp_p.chaosSupport = noone; cp_p.chaosGrounded = false;
    return true;
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
