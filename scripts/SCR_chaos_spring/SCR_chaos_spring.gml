// Mapped type $26 springs on the recovered ROM model (sonic-chaos-reference-work docs/spring-interaction-audit.md sections 2.1, 2.2, 3, 4, 5, 10;
// POC_notes/rom-cache/spring-interaction.json). Terrain springs (upright, diagonal, horizontal) are NOT here: they live in the terrain dispatch of SCR_chaos_core.
//
// Gameplay anchor = the object position: placement X and rest Y = placement Y + 12. Contact uses the player's canonical integer anchor ($D511/$D514) - never
// a sprite, mask or the GameMaker instance position. The art is drawn from the same object position (SCR_chaos_object_spring_draw), presentation only.
//   fixed  : abs(playerX - X) < 12 (strict) and playerY in [Y - 33, Y - 28] (inclusive, six rows)
//   span   : parameter bit 7; width (parameter & $7F) * 16; X0 <= playerX < X0 + width and abs(Y - playerY) < $30; no |dx| < 12 rule. The trigger (state 8) is
//            followed by state 9 on the NEXT update, which moves the object X to playerX & $FFF0 and launches without re-testing the gates.
//   gates  : Y speed not negative (zero passes), floor flag ($D522 bit 1), requested state != $21. The current state is not read.
//   launch : vy := -7.375 (strong, parameter 0 / span with aux1 0) or -5.0 (weak); X speed untouched; request state $0B; airborne bit set, attack posture CLEAR;
//            D448 := $FF (strong) / 0 (weak); the object then extends 28 px, holds and retracts and ignores the player for 42 (strong) / 20 (weak) updates.
function chaos_spring26_fixed_contact(cp_px, cp_py, cp_ox, cp_oy) {
    return abs(cp_px - cp_ox) < 12 && cp_py >= cp_oy - 33 && cp_py <= cp_oy - 28;
}
function chaos_spring26_span_contact(cp_px, cp_py, cp_x0, cp_span, cp_oy) {
    return cp_px >= cp_x0 && cp_px < cp_x0 + cp_span && abs(cp_oy - cp_py) < 48;
}
/// cp_vy is the signed 8.8 Y speed, cp_floor the floor-contact flag, cp_requested the requested state ($21 = 33 blocks).
function chaos_spring26_gate(cp_vy, cp_floor, cp_requested) {
    return cp_vy >= 0 && cp_floor && cp_requested != 33;
}
/// $480C as called by the type $26 handlers. D448 is written by the caller BEFORE the setter, so it is stored even when the setter then rejects a
/// negative Y speed (state 9 can reach that). Returns true when the launch was applied.
function chaos_spring26_launch(cp_c, cp_strong) {
    cp_c.d448 = cp_strong ? 255 : 0;
    if (cp_c.vy < 0) return false;
    cp_c.vy = cp_strong ? -1888 : -1280;
    cp_c.next = 11;
    cp_c.move = (cp_c.move | 1) & ~2;         // airborne, attack posture clear: spring flight is not "attacking"
    cp_c.bg &= ~2; cp_c.contacts &= ~2; cp_c.sound = 2;
    return true;
}
/// GameMaker-only presentation/support side of a launch (sprite pose, support release); never part of the recovered gameplay values.
function chaos_spring26_launch_presentation(cp_p) {
    cp_p.chaosSupport = noone; cp_p.chaosGrounded = false;
    cp_p.chaosSpringVisual = true;
    with (cp_p) {
        SCR_player_sprites(); sprite_index = SPR_player_jump;
        image_index = 0; image_speed = 0; image_angle = 0;
    }
}
/// One object update. State 7 = fixed rest, 8 = span rest, 9 = span launch (pending), 1/3 extend, 2/4 hold, 5/6 retract (strong 1/2/5, weak 3/4/6).
/// The extension timeline reproduces the emulated original: 4 extension updates, hold, 4 retract updates, contact evaluated again 42 (strong) / 20 (weak)
/// updates after the launch update.
function SCR_chaos_object_spring_step(cp_o) {
    var cp_p = instance_find(OBJ_player,0);
    if (!instance_exists(cp_p) ||
        (cp_p.object_index != OBJ_player_char && cp_p.object_index != OBJ_player_char_spin)) return;
    if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
    var cp_c = cp_p.chaosCore;
    var cp_px = floor(cp_c.xu/256), cp_py = floor(cp_c.yu/256);
    var cp_oy = cp_o.chaosLayoutY + 12;                      // canonical rest anchor (placement Y + 12)
    var cp_strong = cp_o.chaosParameter == 0;
    // DEVIATION: the GameMaker loop adapter drives the player outside the core while a loop is active, so no contact is evaluated then (the ROM would still fire).
    var cp_free = !(variable_instance_exists(cp_p,"chaosLoopActive") && cp_p.chaosLoopActive);

    if (cp_o.chaosState == 8) {                              // span rest: trigger
        cp_o.chaosOffset = 0; cp_o.chaosDrawX = cp_o.chaosBaseX;
        if (cp_free && chaos_spring26_gate(cp_c.vy, (cp_c.bg & 2) != 0, cp_c.next) &&
            chaos_spring26_span_contact(cp_px, cp_py, cp_o.chaosBaseX, cp_o.chaosSpan, cp_oy)) cp_o.chaosState = 9;
        return;
    }
    if (cp_o.chaosState == 9) {                              // span launch: object X := playerX & $FFF0; no gate re-test
        cp_o.chaosOffset = 0; cp_o.chaosDrawX = (cp_px & 65520);
        if (chaos_spring26_launch(cp_c, cp_strong)) {
            chaos_spring26_launch_presentation(cp_p);
            if (global.music == 1) audio_play_sound(SFX_sonic_spring,10,false);
        }
        cp_o.chaosState = (cp_o.chaosParameter == 1) ? 3 : 1; cp_o.chaosTimer = 28;
        return;
    }
    if (cp_o.chaosState == 7) {                              // fixed rest: contact
        cp_o.chaosOffset = 0; cp_o.chaosDrawX = cp_o.chaosBaseX;
        if (cp_free && chaos_spring26_gate(cp_c.vy, (cp_c.bg & 2) != 0, cp_c.next) &&
            chaos_spring26_fixed_contact(cp_px, cp_py, cp_o.chaosBaseX, cp_oy) && chaos_spring26_launch(cp_c, cp_strong)) {
            chaos_spring26_launch_presentation(cp_p);
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

// ---------------------------------------------------------------------------------------------------------------------------------------
// Vertical death boundary (docs/spring-interaction-audit.md section 8). The ROM kills only when the SIGNED screen Y
// ($D51C = playerY - cameraY) is >= $D0 (208); a negative screen Y (above the camera) is never fatal. The POC core keeps Y as an UNSIGNED 24-bit value
// ((yu + v) & 16777215); it is published to GameMaker as a SIGNED value (chaos_signed_yu) so an excursion above world Y 0 never reads as a pit.
function chaos_signed_world_y(cp_yu) {
    var cp_y = floor(cp_yu / 256) & 65535;
    return (cp_y >= 32768) ? cp_y - 65536 : cp_y;
}
function chaos_rom_screen_death(cp_screen_y) {
    return cp_screen_y >= 208;
}
/// The core's unsigned 24-bit 8.8 Y as a signed value (fraction kept): raw $FFFF.xx -> -1.xx. Used when publishing to GameMaker so that "above world Y 0" is negative.
function chaos_signed_yu(cp_yu) {
    return ((cp_yu + 8388608) & 16777215) - 8388608;
}
/// Ordinary below-screen death ($401A): signed anchor Y minus the camera Y, fatal at $D0 (208) and below. Independent of the room height and of the view width.
function chaos_vertical_death(cp_yu, cp_cam_y) {
    return chaos_rom_screen_death(chaos_signed_world_y(cp_yu) - cp_cam_y);
}
