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
    cp_o.chaosVX = 0; cp_o.chaosPhase = 0; cp_o.chaosDelay = 80; cp_o.chaosYU = cp_o.y * 256;
    cp_o.chaosWeight = (cp_param & $80) != 0;
    cp_o.chaosTouchPhase = 0; cp_o.chaosConsumed = false; cp_o.chaosRequestedMode=0;
    if (cp_param == $83) { cp_o.chaosMode=4; cp_o.chaosVY=0; cp_o.chaosPeriod=0; return true; }
    if (cp_param == $89) { cp_o.chaosMode=10; cp_o.chaosVX=256; cp_o.chaosVY=0; cp_o.chaosPeriod=16*cp_aux1; return true; }
    if (cp_param == $05) { cp_o.chaosMode=13; cp_o.chaosVY=0; cp_o.chaosPeriod=16*cp_aux1; return true; }
    if (cp_param == $0A) { cp_o.chaosMode = 11; cp_o.chaosVY = -256; cp_o.chaosPeriod = 16 * cp_aux1; return true; }
    if (cp_param == $84) { cp_o.chaosMode = 5; cp_o.chaosVY = 0; cp_o.chaosPeriod = 0; return true; }
    // SEZ S3 (Research ed9122b, data/rom-cache/sez/platform-28-runtime.json). $04: the same state-5 callback as $84 with the sag enable (parameter bit 7) clear: stationary, aux unused.
    if (cp_param == $04) { cp_o.chaosMode = 5; cp_o.chaosVY = 0; cp_o.chaosPeriod = 0; return true; }
    // $86: state 7, contact-started right-and-return mover. +$30 = 16 callbacks per block, +$37 = aux1 blocks per leg (byte zero wraps to 256), latch 0 waiting / 1 outbound / 2 returning.
    if (cp_param == $86) {
        cp_o.chaosMode = 7; cp_o.chaosVX = 256; cp_o.chaosVY = 0;
        cp_o.chaosAux = cp_aux1 & 255; cp_o.chaosPeriod = 16 * (cp_o.chaosAux == 0 ? 256 : cp_o.chaosAux);
        cp_o.chaosC30 = 16; cp_o.chaosC37 = cp_o.chaosAux; cp_o.chaosLatch = 0; cp_o.chaosDistDelete = false;
        return true;
    }
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
/// Same contact/claim/release with an explicit player half-width (state 7 uses 9 in player state $0F, 8 otherwise: Research trigger/support geometry).
function chaos_platform28_support_ex(cp_o, cp_c, cp_test_y, cp_ex) {
    var cp_px = floor(cp_c.xu / 256), cp_py = floor(cp_c.yu / 256);
    var cp_owner = cp_c.support;
    if (chaos_platform28_gate(cp_o.chaosVY, cp_c.vy) && (cp_owner == 0 || cp_owner == cp_o.chaosOwnerId) &&
        SCR_chaos_box_contact(cp_px, cp_py, cp_o.chaosX, cp_test_y, cp_ex, 24, 16, 16) == 1) {
        cp_c.support = cp_o.chaosOwnerId;
        return true;
    }
    if (cp_owner == cp_o.chaosOwnerId) cp_c.support = 0;
    return false;
}
/// SEZ type $28 state 7 ($87E2 / $8662 / $8925). Order: [$8908 PLAYER_DIST removal mark, done by the lifecycle] -> latch 0: shared overlap of the PRE-move anchor, any contact bit,
/// no speed/state/floor/owner gate; no overlap returns before movement/support/counters -> move once (+-1 px) -> top support at the post-move anchor when player Y speed >= 0
/// (else release) -> shared sag -> carry (X delta computed before the reversal) -> counters: +$30 16 -> +$37 aux1 -> reload and negate X speed -> latch 2 while moving left.
/// Counter-derived travel (16 * aux1 per leg), no coordinate clamp. Runs while asleep (the keepalive bit is set from the first callback).
function chaos_platform28_step7(cp_o, cp_c, cp_present) {
    var cp_ex = (cp_present && cp_c.state == 15) ? 9 : 8;
    if (cp_o.chaosLatch == 0) {
        if (!cp_present || SCR_chaos_box_contact(floor(cp_c.xu/256), floor(cp_c.yu/256), cp_o.chaosX, cp_o.chaosY, cp_ex, 24, 16, 16) == 0) return false;
        cp_o.chaosLatch = 1;
    }
    var cp_changed = false;
    cp_o.chaosDeltaX = cp_o.chaosVX / 256;
    cp_o.chaosX += cp_o.chaosDeltaX;
    var cp_supported = cp_present && cp_c.vy >= 0 && chaos_platform28_support_ex(cp_o, cp_c, cp_o.chaosY, cp_ex);
    if (cp_present && cp_c.vy < 0 && cp_c.support == cp_o.chaosOwnerId) cp_c.support = 0;
    chaos_platform28_sag(cp_o, cp_supported);
    if (cp_supported) { chaos_platform28_carry(cp_o, cp_c); cp_changed = true; }
    cp_o.chaosC30--;
    if (cp_o.chaosC30 == 0) {
        cp_o.chaosC30 = 16; cp_o.chaosC37 = (cp_o.chaosC37 - 1) & 255;     // byte counter: aux1 zero wraps to 256 blocks
        if (cp_o.chaosC37 == 0) { cp_o.chaosC37 = cp_o.chaosAux; cp_o.chaosVX = -cp_o.chaosVX; }
    }
    if (cp_o.chaosVX < 0) cp_o.chaosLatch = 2;
    else if (cp_o.chaosLatch == 2) cp_o.chaosLatch = 0;
    return cp_changed;
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
    if (cp_o.chaosMode == 7) {
        cp_changed = chaos_platform28_step7(cp_o, cp_c, cp_present);
        if (cp_o.chaosDistDelete) {                           // $8908 marked the object $FE: this callback ran, cleanup follows; recreation starts from the canonical placement
            cp_o.chaosDistDelete = false; cp_o.chaosLive = false;
            if (cp_present && cp_c.support == cp_o.chaosOwnerId) cp_c.support = 0;
        }
        cp_o.y = cp_o.chaosY; cp_o.x = cp_o.chaosX;
        return cp_changed;
    }
    if (cp_o.chaosRequestedMode == 6) { cp_o.chaosMode=6; cp_o.chaosRequestedMode=0; cp_o.chaosVY=-256; }
    if (cp_o.chaosMode == 4) {
        if (cp_o.chaosPhase == 255) {
            cp_o.chaosVY = SCR_cc_s16(cp_o.chaosVY + 48);
            cp_o.chaosYU = (cp_o.chaosYU + cp_o.chaosVY) & 16777215;
            cp_o.chaosY = floor(cp_o.chaosYU/256);
            if (cp_present && chaos_platform28_support(cp_o,cp_c,cp_o.chaosY)) { chaos_platform28_carry(cp_o,cp_c); cp_changed=true; }
        } else {
            // $8719: countdown before contact; trigger update loads 80 without decrement.
            if (cp_o.chaosPhase == 128) {
                if (cp_o.chaosDelay == 0) cp_o.chaosPhase=255;
                else cp_o.chaosDelay--;
            }
            var cp_supported=cp_present && chaos_platform28_support(cp_o,cp_c,cp_o.chaosY);
            if (cp_supported && cp_o.chaosPhase == 0) cp_o.chaosPhase=128;
            chaos_platform28_sag(cp_o,cp_supported);
            cp_o.chaosYU=cp_o.chaosY*256;
            if (cp_supported) { chaos_platform28_carry(cp_o,cp_c); cp_changed=true; }
        }
    } else if (cp_o.chaosMode == 13) {
        // $85FE only classifies contact and requests state 6. No carry until its next callback.
        if (cp_present && cp_c.vy >= 0 && chaos_platform28_support_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),cp_o.chaosX,cp_o.chaosY)) {
            cp_o.chaosRequestedMode=6; cp_o.chaosTouchPhase=0;
            // $85FE calls $033B even before ownership/carry begins. Its top
            // contact reaches the next player pass's $D521 -> $D523 merge.
            cp_c.box_ready |= 32;
        }
    } else if (cp_o.chaosMode == 10) {
        // $8662: movement/contact/carry precede the reversal counter ($8925).
        cp_o.chaosDeltaX=cp_o.chaosVX/256;
        cp_o.chaosX+=cp_o.chaosDeltaX;
        var cp_supported=cp_present && cp_c.vy >= 0 && chaos_platform28_support(cp_o,cp_c,cp_o.chaosY);
        if (cp_present && cp_c.vy < 0 && cp_c.support == cp_o.chaosOwnerId) cp_c.support=0;
        chaos_platform28_sag(cp_o,cp_supported);
        if (cp_supported) { chaos_platform28_carry(cp_o,cp_c); cp_changed=true; }
        cp_o.chaosTick++;
        if (cp_o.chaosTick >= cp_o.chaosPeriod) { cp_o.chaosVX=-cp_o.chaosVX; cp_o.chaosTick=0; }
    } else if (cp_o.chaosMode == 6) {
        // $87B2 waits for any contact once state 6 is active; then uses $86DA.
        if (cp_o.chaosTouchPhase == 0) {
            if (!cp_present || chaos_platform28_contact_bits(floor(cp_c.xu/256),floor(cp_c.yu/256),cp_o.chaosX,cp_o.chaosY) == 0) { cp_o.x=cp_o.chaosX; cp_o.y=cp_o.chaosY; return false; }
            cp_o.chaosTouchPhase=1;
        }
        cp_o.chaosY+=cp_o.chaosVY/256;
        if (cp_present && chaos_platform28_support(cp_o,cp_c,cp_o.chaosY)) { chaos_platform28_carry(cp_o,cp_c); cp_changed=true; }
        cp_o.chaosTick++;
        if (cp_o.chaosTick >= cp_o.chaosPeriod) { cp_o.chaosVY=-cp_o.chaosVY; cp_o.chaosTick=0; }
        if (cp_o.chaosVY >= 0) cp_o.chaosTouchPhase=2;
        else if (cp_o.chaosTouchPhase == 1 && cp_o.chaosTick == 0) cp_o.chaosTouchPhase=0;
    } else if (cp_o.chaosMode == 11) {
        // $86DA: reversal counter ($8925, period 16 * aux1), gate, move 1 px, then the contact test at the POST-move Y.
        if (cp_o.chaosTick >= cp_o.chaosPeriod) { cp_o.chaosVY = -cp_o.chaosVY; cp_o.chaosTick = 0; }
        cp_o.chaosY += cp_o.chaosVY / 256;
        cp_o.chaosTick++;
        if (cp_present && chaos_platform28_support(cp_o, cp_c, cp_o.chaosY)) { chaos_platform28_carry(cp_o, cp_c); cp_changed = true; }
    } else {
        // $879A: gate, contact test at the PRE-sag Y ($8814), then the sag step, then the carry at the post-sag Y.
        var cp_supported = cp_present && chaos_platform28_support(cp_o, cp_c, cp_o.chaosY);
        if (cp_o.chaosWeight) {                                  // parameter bit 7 = sag enable ($84 sags; SEZ $04 is fixed)
            if (cp_supported && !cp_o.chaosSagReturning) {
                if (cp_o.chaosSag < CHAOS_PLATFORM_SAG_LIMIT) cp_o.chaosSag++;
                else cp_o.chaosSagReturning = true;              // one hold update at 8
            } else if (cp_o.chaosSag > 0) cp_o.chaosSag--;       // return 7..0 while still ridden, or after release
            if (!cp_supported && cp_o.chaosSag == 0) cp_o.chaosSagReturning = false;
            cp_o.chaosY = cp_o.chaosHomeY + cp_o.chaosSag;
        }
        if (cp_supported) { chaos_platform28_carry(cp_o, cp_c); cp_changed = true; }
    }
    cp_o.y = cp_o.chaosY;
    cp_o.x = cp_o.chaosX;
    return cp_changed;
}

/// $88FB: one sag/recovery cycle; rest while ridden, rearm after release.
function chaos_platform28_sag(cp_o,cp_supported) {
    if (!cp_o.chaosWeight) return;
    if (cp_supported && !cp_o.chaosSagReturning) {
        if (cp_o.chaosSag < 8) cp_o.chaosSag++;
        else cp_o.chaosSagReturning=true;
    } else if (cp_o.chaosSag > 0) cp_o.chaosSag--;
    if (!cp_supported && cp_o.chaosSag == 0) cp_o.chaosSagReturning=false;
    cp_o.chaosY=cp_o.chaosHomeY+cp_o.chaosSag;
}
