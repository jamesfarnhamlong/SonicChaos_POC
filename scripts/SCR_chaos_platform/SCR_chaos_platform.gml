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
/// AQZ P2. Same bank-$1E contracts, separate script/lifecycle driver so accepted
/// $28 adapters keep their scheduling. Scripts below are decoded A3 records.
function chaos_platform3f_reset(cp_o) {
    cp_o.x=cp_o.chaosPlacementX; cp_o.y=cp_o.chaosPlacementY;
    var cp_p=cp_o.chaosPlacementParameter;
    // Shared initializer defaults, then the script engine enters state0.
    chaos_platform28_configure(cp_o,cp_p == $8B ? $05 : cp_p,cp_o.chaosPlacementAux1);
    cp_o.chaosWeight=(cp_p & $80) != 0;
    cp_o.chaosSavedMode=(cp_p & $3F)+1;
    cp_o.chaosMode=0; cp_o.chaosRequestedMode=0; cp_o.chaosScriptMode=-1;
    cp_o.chaosPC=0; cp_o.chaosCounter=0; cp_o.chaosCallback=0;
    cp_o.chaosFrame=0; cp_o.chaosDeltaY=0; cp_o.chaosXU=cp_o.x*256;
    cp_o.chaosToken=cp_o.chaosPlacementIndex; cp_o.chaosRuntimeParameter=cp_p;
    cp_o.chaosDelay=0; cp_o.chaosKeepalive=false;
    cp_o.chaosVX=0; cp_o.chaosVY=0;
}
/// $64FA: decrement duration before reading another record; state requests enter
/// on the next object phase. Script14 jumps into $8489 without changing state.
function chaos_platform3f_script(cp_o) {
    if (cp_o.chaosScriptMode != cp_o.chaosRequestedMode) {
        cp_o.chaosMode=cp_o.chaosRequestedMode; cp_o.chaosScriptMode=cp_o.chaosMode;
        cp_o.chaosPC=0; cp_o.chaosCounter=0;
    } else if (cp_o.chaosCounter > 0) cp_o.chaosCounter--;
    if (cp_o.chaosCounter > 0) return;
    var cp_script=chaos_platform3f_scripts()[cp_o.chaosMode];
    for (var cp_guard=0; cp_guard<64; cp_guard++) {
        var cp_op=cp_script[cp_o.chaosPC]; cp_o.chaosPC++;
        switch (cp_op[0]) {
            case 0: cp_o.chaosPC=0; break;
            case 1:
                cp_o.chaosCounter=cp_op[1]; cp_o.chaosFrame=cp_op[2]; cp_o.chaosCallback=cp_op[3]; return;
            case 2: cp_o.chaosVX=cp_op[1]; cp_o.chaosVY=cp_op[2]; break;
            case 3: cp_o.chaosDeltaX=0; cp_o.chaosDeltaY=0; break; // $8577
            case 4:
                if (cp_op[1] == 30) cp_o.chaosDelay=cp_op[2];
                if (cp_op[1] == 39) cp_o.chaosPhase=cp_op[2];
                break;
            case 5: cp_o.chaosKeepalive=true; break; // +$04 bit1
            case 6: cp_o.chaosPC=cp_op[1]; break;
        }
    }
}
/// $8814/$88A0: geometry/owner and projection; velocity gating is the caller's
/// job. Contact flags are staged for the NEXT player pass, never floor-forced.
function chaos_platform3f_support(cp_o,cp_c,cp_present,cp_gate) {
    if (!cp_present) return false;
    var cp_owner=cp_c.support, cp_ex=cp_c.state == $0F ? 9 : 8;
    var cp_bits=0;
    if (cp_gate && (cp_owner == 0 || cp_owner == cp_o.chaosOwnerId))
        cp_bits=SCR_chaos_box_contact(floor(cp_c.xu/256),chaos_signed_world_y(cp_c.yu),cp_o.chaosX,cp_o.chaosY,cp_ex,24,16,16);
    chaos_platform3f_contact_flags(cp_c,cp_bits);
    if ((cp_bits & 12) != 0) cp_c.box_ready &= $33; // $8843 removes side walls
    if (cp_bits == 1) { cp_c.support=cp_o.chaosOwnerId; return true; }
    if (cp_owner == cp_o.chaosOwnerId) cp_c.support=0;
    return false;
}
function chaos_platform3f_contact_flags(cp_c,cp_bits) {
    if (cp_bits != 0) cp_c.box_ready=(cp_c.box_ready & 15) | ((cp_bits ^ ((cp_bits & 3) != 0 ? 3 : 12)) << 4);
}
/// Shared sag operates on the moving anchor, independent of route/fall velocity.
function chaos_platform3f_sag(cp_o,cp_supported) {
    var cp_home=cp_o.chaosHomeY;
    if (!cp_supported) cp_o.chaosSagReturning=false; // $8843 clears +$33 immediately
    cp_o.chaosHomeY=cp_o.chaosY-cp_o.chaosSag;
    chaos_platform28_sag(cp_o,cp_supported);
    cp_o.chaosHomeY=cp_home;
    cp_o.chaosYU=cp_o.chaosY*256+(cp_o.chaosYU & 255);
}
function chaos_platform3f_move(cp_o) {
    var cp_x=cp_o.chaosX, cp_y=cp_o.chaosY;
    cp_o.chaosXU=(cp_o.chaosXU+cp_o.chaosVX) & 16777215;
    cp_o.chaosYU=(cp_o.chaosYU+cp_o.chaosVY) & 16777215;
    cp_o.chaosX=floor(cp_o.chaosXU/256); cp_o.chaosY=floor(cp_o.chaosYU/256);
    cp_o.chaosDeltaX=cp_o.chaosX-cp_x; cp_o.chaosDeltaY=cp_o.chaosY-cp_y;
}
/// One original callback, prior asleep flag still intact. Test entry also used
/// by the deterministic oracle runner. No terrain/water reads in this routine.
function chaos_platform3f_callback(cp_o,cp_c,cp_present) {
    var cp_cb=cp_o.chaosCallback, cp_supported=false;
    if (cp_cb == $8585) {
        cp_o.chaosRequestedMode=(cp_o.chaosPlacementParameter & $7F) == 11 ? 13 : cp_o.chaosSavedMode;
        return false;
    }
    if (cp_cb == $85FE) {
        if (cp_o.chaosAsleep || !cp_present || cp_c.vy < 0) return false;
        var cp_ex=cp_c.state == $0F ? 9 : 8;
        var cp_bits=SCR_chaos_box_contact(floor(cp_c.xu/256),chaos_signed_world_y(cp_c.yu),cp_o.chaosX,cp_o.chaosY,cp_ex,24,16,16);
        chaos_platform3f_contact_flags(cp_c,cp_bits);
        if (cp_bits == 1) cp_o.chaosRequestedMode=(cp_c.zone == 4 && cp_o.chaosAct == 1) ? 14 : cp_o.chaosSavedMode;
        return false;
    }
    if (cp_cb == $87E2) {
        // Shared state7 callback: overlap, first movement, carry, counters and
        // reversal exactly as accepted SEZ. Own removal is PLAYER_DIST.
        var cp_delete=cp_present && (abs(cp_o.chaosX-floor(cp_c.xu/256)) >= 640 || abs(cp_o.chaosY-chaos_signed_world_y(cp_c.yu)) >= 672);
        if (cp_present) {
            var cp_ex=cp_c.state == $0F ? 9 : 8;
            var cp_px=floor(cp_c.xu/256), cp_py=chaos_signed_world_y(cp_c.yu);
            var cp_trigger=cp_o.chaosLatch != 0;
            if (!cp_trigger) {
                var cp_bits=SCR_chaos_box_contact(cp_px,cp_py,cp_o.chaosX,cp_o.chaosY,cp_ex,24,16,16);
                chaos_platform3f_contact_flags(cp_c,cp_bits); cp_trigger=cp_bits != 0;
            }
            if (cp_trigger && cp_c.vy >= 0 && (cp_c.support == 0 || cp_c.support == cp_o.chaosOwnerId)) {
                var cp_bits=SCR_chaos_box_contact(cp_px,cp_py,cp_o.chaosX+cp_o.chaosVX/256,cp_o.chaosY,cp_ex,24,16,16);
                chaos_platform3f_contact_flags(cp_c,cp_bits);
                if ((cp_bits & 12) != 0) cp_c.box_ready &= $33;
            }
        }
        var cp_xbefore=cp_o.chaosX;
        var cp_changed=chaos_platform28_step7(cp_o,cp_c,cp_present);
        if (!cp_changed && cp_o.chaosX != cp_xbefore) cp_o.chaosSagReturning=false;
        cp_o.chaosXU=cp_o.chaosX*256; cp_o.chaosYU=cp_o.chaosY*256;
        if (cp_delete) { cp_o.chaosLive=false; cp_o.chaosToken=0; }
        return cp_changed;
    }
    if (cp_cb == $8719) {
        if (cp_o.chaosAsleep) {
            if (cp_o.chaosPhase != 0) {
                cp_o.chaosConsumed=true; cp_o.chaosLive=false;
                cp_o.chaosRuntimeParameter=$80; cp_o.chaosToken=0;
                array_push(global.chaosConsumedPlatforms,cp_o.chaosPlacementIndex);
            }
            return false;
        }
        if (cp_o.chaosPhase == 255) {
            cp_o.chaosVY=SCR_cc_s16(cp_o.chaosVY+48);
            chaos_platform3f_move(cp_o);
        } else if (cp_o.chaosPhase == 128) {
            if (cp_o.chaosDelay == 0) cp_o.chaosPhase=255;
            else cp_o.chaosDelay--;
        }
        cp_supported=chaos_platform3f_support(cp_o,cp_c,cp_present,cp_present && cp_c.vy >= 0);
        chaos_platform3f_sag(cp_o,cp_supported);
        if (cp_supported && cp_o.chaosPhase == 0) cp_o.chaosPhase=128;
    } else if (cp_cb == $8628 || cp_cb == $86A1) {
        if (cp_o.chaosAsleep) chaos_platform3f_move(cp_o); // original double integration
        chaos_platform3f_move(cp_o);
        var cp_gate=cp_present && (cp_cb == $8628 ? cp_c.vy >= 0 : cp_o.chaosVY <= cp_c.vy);
        cp_supported=chaos_platform3f_support(cp_o,cp_c,cp_present,cp_gate);
        chaos_platform3f_sag(cp_o,cp_supported);
    }
    if (cp_supported) chaos_platform28_carry(cp_o,cp_c);
    return cp_supported;
}
/// Scheduler callback -> generic lifetime -> mapped creation. No retention
/// extension. Spent occupancy is kept in the shell until act restart.
function chaos_platform3f_phase(cp_o,cp_c,cp_present,cp_vp) {
    if (cp_o.chaosConsumed) return false;
    if (!cp_o.chaosLive) return false;
    chaos_platform3f_script(cp_o);
    var cp_changed=chaos_platform3f_callback(cp_o,cp_c,cp_present);
    if (cp_o.chaosLive && cp_o.chaosCallback != $8585) {
        var cp_cell=SCR_chaos_spawn_cell(cp_vp,cp_o.chaosX,cp_o.chaosY);
        cp_o.chaosAsleep=cp_cell >= 2;
        if (cp_cell == 3 && !cp_o.chaosKeepalive) { cp_o.chaosLive=false; cp_o.chaosToken=0; }
    }
    if (!cp_o.chaosLive && cp_present && cp_c.support == cp_o.chaosOwnerId) cp_c.support=0;
    cp_o.x=cp_o.chaosX; cp_o.y=cp_o.chaosY;
    return cp_changed;
}
function chaos_platform3f_scan(cp_o,cp_pool,cp_vp) {
    if (cp_o.chaosOccupied || cp_o.chaosConsumed) return;
    var cp_cell=SCR_chaos_spawn_cell(cp_vp,cp_o.chaosPlacementX,cp_o.chaosPlacementY);
    var cp_fill=!cp_o.chaosInitialFillDone;
    cp_o.chaosInitialFillDone=true;
    if (!(cp_cell == 2 || (cp_cell < 2 && cp_fill))) return;
    var cp_slot=chaos_object_free_slot(cp_pool.slots,7,18);
    if (cp_slot < 0) return;
    chaos_platform3f_reset(cp_o);
    cp_o.chaosLive=true; cp_o.chaosAsleep=true; cp_o.chaosOccupied=true; cp_o.chaosSlot=cp_slot;
    var cp_s=chaos_s2_slot(); cp_s.type=$3F; cp_s.platform3f=cp_o;
    cp_pool.slots[cp_slot]=cp_s;
}
/// Cleanup $FE->$FF->zero. Cleared-token fall paths keep occupancy spent; normal
/// deletion releases the shell only on cleanup and allows original recreation.
function chaos_platform3f_visit(cp_s,cp_pool,cp_i,cp_c,cp_have,cp_vp) {
    var cp_o=cp_s.platform3f;
    if (cp_s.type == $FE) { cp_s.type=$FF; return false; }
    if (cp_s.type == $FF) {
        if (!cp_o.chaosConsumed) cp_o.chaosOccupied=false;
        cp_o.chaosSlot=-1; cp_pool.slots[cp_i]=chaos_s2_slot(); return false;
    }
    var cp_changed=chaos_platform3f_phase(cp_o,cp_c,cp_have,cp_vp);
    if (!cp_o.chaosLive) cp_s.type=$FE;
    return cp_changed;
}
/// Generated from reviewed AQZ A3; only states 0/4/7/13/14 are registered.
function chaos_platform3f_scripts() { return [[[1,224,0,34181],[0]],[[2,256,0],[1,224,1,34344],[6,1]],[[2,0,-256],[1,224,1,34465],[6,1]],[[1,224,1,34584],[0]],[[2,0,0],[4,30,80],[1,224,1,34585],[6,2]],[[1,224,1,34714],[0]],[[5,4,2],[2,0,-256],[1,224,1,34738],[6,2]],[[5,4,2],[2,256,0],[1,224,1,34786],[6,2]],[[1,224,1,34834],[0]],[[1,224,1,34835],[0]],[[5,4,2],[2,256,0],[1,224,1,34402],[6,2]],[[5,4,2],[2,0,-256],[1,224,1,34522],[6,2]],[[3,34167],[2,0,256],[1,32,1,34465],[3,34167],[2,256,0],[1,128,1,34344],[1,144,1,34344],[4,30,80],[4,39,128],[2,0,0],[6,11],[1,224,1,34585],[6,11]],[[2,0,0],[1,32,1,34302],[0]],[[3,34167],[2,256,0],[1,160,1,34344],[3,34167],[2,0,256],[1,64,1,34465],[3,34167],[2,256,0],[1,96,1,34344],[3,34167],[2,0,-256],[1,128,1,34465],[1,128,1,34465],[4,30,80],[4,39,128],[2,0,0],[6,17],[1,224,1,34585],[6,17]]]; }
