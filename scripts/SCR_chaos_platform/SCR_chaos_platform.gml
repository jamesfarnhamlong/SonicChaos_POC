// Type $28 THZ platforms on the recovered ROM model (sonic-chaos-reference-work docs/platform-spike-collision-audit.md sections 1.1-1.4;
// POC_notes/rom-cache/platform-spike-collision.json). Plain numbers and the shared core struct only - no mask, sprite, bbox or GameMaker position is read.
//
// Gameplay anchor = the object's integer anchor (chaosY; the canonical placement Y for lifts, placement Y + sag for the weight platforms). Sonic is the core anchor
// (floor(xu/256), floor(yu/256)). With dx = playerX - platformX and dy = playerY - platformY the support region is the TRIANGLE
//     dy in [-16, -1]  and  abs(dx) <= 8 + abs(dy)            (all edges inclusive; the $6328 box 16x16 against Sonic 8x24, "player above" bit only)
// plus the relative-speed gate $8866: platformYSpeed <= playerYSpeed (signed 8.8). Sonic's state, floor flag and attack posture are NOT inputs.
// Per object update (the player's whole pass, including terrain and damage, has already run):
//     reversal check -> move -> contact test (post-move Y; state 5: pre-sag Y) -> claim / release $D3C0 -> sag step (state 5) -> carry
// carry: player Y := platformY - 14 (fraction kept), player X += the platform's X delta (0 for every THZ placement). No speed is changed: the retained player Y speed is what
// the next update's gate sees. Top-only: no side or underside projection exists (an underside contact only sets an unread ceiling bit), so nothing here pushes Sonic.
//
// Placement parameters (docs 1.1): $0A = state 11 vertical lift, 1 px/update, first leg UP, reversal period 16 * aux1 updates; $84 = state 5 weight-sag platform.
// Presentation (adapter only): the platform art's first opaque row is anchor + 2 (docs section 7); OBJ_chaos_platform draws it there. Collision never inherits that offset.
#macro CHAOS_PLATFORM_CARRY_DY 14
#macro CHAOS_PLATFORM_SAG_LIMIT 8

/// $6328 contact bits for Sonic (8 x 24) against the platform box (16 x 16): 1 = player above, 2 = below, 4/8 = right/left, 0 = none.
function chaos_platform28_contact_bits(cp_px, cp_py, cp_ox, cp_oy) {
    return SCR_chaos_box_contact(cp_px, cp_py, cp_ox, cp_oy, 8, 24, 16, 16);
}
/// The support region: only the "player above" bit supports.
function chaos_platform28_support_contact(cp_px, cp_py, cp_ox, cp_oy) {
    return chaos_platform28_contact_bits(cp_px, cp_py, cp_ox, cp_oy) == 1;
}
/// $8866: signed 8.8 comparison; true = the gate passes (no "skip this update" return).
function chaos_platform28_gate(cp_platform_vy, cp_player_vy) {
    return cp_platform_vy <= cp_player_vy;
}
/// Object parameter -> instance configuration. Returns false for a parameter this milestone does not support (never guessed).
function chaos_platform28_configure(cp_o, cp_param, cp_aux1) {      // chaosOwnerId is assigned by Create_0
    cp_o.chaosTick = 0; cp_o.chaosSag = 0; cp_o.chaosSagReturning = false;
    cp_o.chaosX = cp_o.x; cp_o.chaosY = cp_o.y; cp_o.chaosHomeY = cp_o.y; cp_o.chaosDeltaX = 0;
    if (cp_param == $0A) { cp_o.chaosMode = 11; cp_o.chaosVY = -256; cp_o.chaosPeriod = 16 * cp_aux1; return true; }
    if (cp_param == $84) { cp_o.chaosMode = 5; cp_o.chaosVY = 0; cp_o.chaosPeriod = 0; return true; }
    return false;
}
/// Contact test + claim / release of $D3C0 for one platform ($8814 / $8843 / $8866). cp_test_y is the platform Y the contact test sees.
/// Returns true when this platform supports Sonic after the call.
function chaos_platform28_support(cp_o, cp_c, cp_test_y) {
    var cp_px = floor(cp_c.xu / 256), cp_py = floor(cp_c.yu / 256);
    var cp_owner = cp_c.support;
    if (chaos_platform28_gate(cp_o.chaosVY, cp_c.vy) && (cp_owner == 0 || cp_owner == cp_o.chaosOwnerId) &&
        chaos_platform28_support_contact(cp_px, cp_py, cp_o.chaosX, cp_test_y)) {
        cp_c.support = cp_o.chaosOwnerId;
        return true;
    }
    if (cp_owner == cp_o.chaosOwnerId) cp_c.support = 0;     // $8843: only the owner releases
    return false;
}
/// $88A0: player Y := platform Y - 14 (integer part; the fraction is kept), player X += the platform's X delta of this update.
function chaos_platform28_carry(cp_o, cp_c) {
    cp_c.yu = ((cp_o.chaosY - CHAOS_PLATFORM_CARRY_DY) * 256 + (cp_c.yu & 255)) & 16777215;
    if (cp_o.chaosDeltaX != 0) cp_c.xu = (cp_c.xu + cp_o.chaosDeltaX * 256) & 16777215;
}
/// One object update. cp_c is the player core (or any value when cp_present is false: the platform still moves). Returns true when it changed the player.
function chaos_platform28_step(cp_o, cp_c, cp_present) {
    var cp_changed = false;
    cp_o.chaosDeltaX = 0;
    if (cp_o.chaosMode == 11) {
        // $86DA: reversal counter ($8925, period 16 * aux1), gate, move 1 px, then the contact test at the POST-move Y.
        if (cp_o.chaosTick >= cp_o.chaosPeriod) { cp_o.chaosVY = -cp_o.chaosVY; cp_o.chaosTick = 0; }
        cp_o.chaosY += cp_o.chaosVY / 256;
        cp_o.chaosTick++;
        if (cp_present && chaos_platform28_support(cp_o, cp_c, cp_o.chaosY)) { chaos_platform28_carry(cp_o, cp_c); cp_changed = true; }
    } else {
        // $879A: gate, contact test at the PRE-sag Y ($8814), then the sag step, then the carry at the post-sag Y.
        var cp_supported = cp_present && chaos_platform28_support(cp_o, cp_c, cp_o.chaosY);
        if (cp_supported && !cp_o.chaosSagReturning) {
            if (cp_o.chaosSag < CHAOS_PLATFORM_SAG_LIMIT) cp_o.chaosSag++;
            else cp_o.chaosSagReturning = true;                  // one hold update at 8
        } else if (cp_o.chaosSag > 0) cp_o.chaosSag--;           // return 7..0 while still ridden, or after release
        if (!cp_supported && cp_o.chaosSag == 0) cp_o.chaosSagReturning = false;
        cp_o.chaosY = cp_o.chaosHomeY + cp_o.chaosSag;
        if (cp_supported) { chaos_platform28_carry(cp_o, cp_c); cp_changed = true; }
    }
    cp_o.y = cp_o.chaosY;
    return cp_changed;
}
