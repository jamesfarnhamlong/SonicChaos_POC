// Type $1B moving (retracting) spike on the recovered ROM model (sonic-chaos-reference-work docs/platform-spike-collision-audit.md section 3 and 4;
// POC_notes/rom-cache/platform-spike-collision.json). Gameplay reads only the object's integer anchor and the player core anchor: no mask, sprite, bbox or position of the
// GameMaker instance. The four THZ1 placements are at Y 864 (flags 0, parameter 0); there are none in THZ2.
//
// Cycle (102 updates): state 4 hidden 48 updates, state 1 rising 3 updates (Y -= 6 each: 858, 852, 846), state 2 raised 48 updates at 846, state 3 retracting 3 updates (+6 each).
// The contact helper $ACFD runs in states 1 and 2 ONLY and BEFORE the Y move of state 1, so the damage rows are relative to the PRE-move anchor (864, 858, 852, then 846).
// A new object runs state 0 (initialise, cooldown $1F := 0, request state 1) first; the first state-1 update is the next one.
//
// Contact = the shared overlap helper $6328 (Sonic 8 x 24 against 16 x 24), exactly one bit kept:
//   player above (dy in -24..-1 and abs(dx) <= abs(dy), a 45-degree CONE) and Y speed >= 0 and cooldown 0 -> damage request $D3B0 := $FF, bounce Y speed -4.0, cooldown 16
//   side / below contact never damages. A grounded player in attack posture (floor flag, +$03 bit 1) is pushed to X = objectX +23 (player to the right) or -23, requested state 1,
//   X speed 0; a non-attacking player gets the wall flag for the next update instead (the shared merge ignores it in attack posture).
//   a rising player (Y speed < 0) and a non-zero cooldown skip the whole helper; the cooldown ($1F) counts down only inside states 1 and 2.
// The helper does NOT test the player's invulnerability: the request and the bounce are written regardless and the damage gate ($48BC, SCR_cc_damage_gate) rejects the request
// while +$03 bit 7 is set. A request is consumed by the player's NEXT update (the object runs after the player's pass).
#macro CHAOS_SPIKE1B_RISE 18
#macro CHAOS_SPIKE1B_STEP 6
#macro CHAOS_SPIKE1B_HOLD 48
#macro CHAOS_SPIKE1B_COOLDOWN 16

/// $6328 bits for Sonic against the spike box: 1 = above, 2 = below, 4 = player to the right, 8 = player to the left, 0 = none.
function chaos_spike1b_contact_bits(cp_px, cp_py, cp_ox, cp_oy) {
    return SCR_chaos_box_contact(cp_px, cp_py, cp_ox, cp_oy, 8, 24, 16, 24);
}
/// The damage cone alone (above-bit, Y speed gate and cooldown excluded).
function chaos_spike1b_cone(cp_px, cp_py, cp_ox, cp_oy) {
    return chaos_spike1b_contact_bits(cp_px, cp_py, cp_ox, cp_oy) == 1;
}
/// Helper outcome: 0 none, 1 damage request + bounce, 2 push (grounded attacker), 3 wall flag (non-attacking side / below contact). Cooldown handled by the caller.
function chaos_spike1b_outcome(cp_bits, cp_vy, cp_floor, cp_attack) {
    if (cp_vy < 0 || cp_bits == 0) return 0;
    if (cp_bits == 1) return 1;
    return (cp_floor && cp_attack) ? 2 : 3;
}
/// $ACFD for one update at the (pre-move) anchor Y cp_oy. Returns true when it changed the player.
function chaos_spike1b_contact(cp_o, cp_c, cp_oy) {
    if (cp_o.chaosCooldown != 0) { cp_o.chaosCooldown--; return false; }
    var cp_px = floor(cp_c.xu / 256), cp_py = floor(cp_c.yu / 256);
    var cp_bits = chaos_spike1b_contact_bits(cp_px, cp_py, cp_o.chaosX, cp_oy);
    var cp_out = chaos_spike1b_outcome(cp_bits, cp_c.vy, (cp_c.bg & 2) != 0, (cp_c.move & 2) != 0);
    if (cp_out == 1) {
        cp_c.damage_request = 255; cp_c.vy = -1024; cp_o.chaosCooldown = CHAOS_SPIKE1B_COOLDOWN;
        return true;
    }
    if (cp_out == 2) {
        cp_c.xu = ((cp_o.chaosX + (cp_bits == 4 ? 23 : -23)) * 256 + (cp_c.xu & 255)) & 16777215;
        cp_c.next = 1; cp_c.vx = 0;
        return true;
    }
    if (cp_out == 3) {
        if (cp_bits == 8) cp_c.box_contacts |= 64; else if (cp_bits == 4) cp_c.box_contacts |= 128;
        return cp_bits != 2;
    }
    return false;
}
/// One object update. cp_awake: the object is inside the activation window (GameMaker adapter: the camera band the POC has always used; the ROM's sleep/delete
/// lifecycle for this type is not audited and is not modelled). Returns true when the player was changed.
function chaos_spike1b_step(cp_o, cp_c, cp_present, cp_awake) {
    var cp_changed = false;
    if (!cp_o.chaosActive) {
        if (!cp_awake) return false;
        cp_o.chaosActive = true; cp_o.chaosState = 1; cp_o.chaosCooldown = 0; cp_o.chaosTimer = 0; // state 0: init, request state 1
        return false;
    }
    if (cp_o.chaosState == 1) {
        if (cp_present) cp_changed = chaos_spike1b_contact(cp_o, cp_c, cp_o.chaosY);
        cp_o.chaosY -= CHAOS_SPIKE1B_STEP;
        if (cp_o.chaosBaseY - cp_o.chaosY >= CHAOS_SPIKE1B_RISE) { cp_o.chaosState = 2; cp_o.chaosTimer = CHAOS_SPIKE1B_HOLD; }
    } else if (cp_o.chaosState == 2) {
        if (cp_present) cp_changed = chaos_spike1b_contact(cp_o, cp_c, cp_o.chaosY);
        cp_o.chaosTimer--;
        if (cp_o.chaosTimer <= 0) cp_o.chaosState = 3;
    } else if (cp_o.chaosState == 3) {
        cp_o.chaosY += CHAOS_SPIKE1B_STEP;
        if (cp_o.chaosY >= cp_o.chaosBaseY) { cp_o.chaosY = cp_o.chaosBaseY; cp_o.chaosState = 4; cp_o.chaosTimer = CHAOS_SPIKE1B_HOLD; }
    } else {
        cp_o.chaosTimer--;
        if (cp_o.chaosTimer <= 0) cp_o.chaosState = 1;
    }
    cp_o.chaosOffset = cp_o.chaosBaseY - cp_o.chaosY;       // presentation input only (SCR_chaos_spike_draw)
    return cp_changed;
}
