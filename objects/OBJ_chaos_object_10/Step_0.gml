if (chaosConsumed) {
    chaosReplaceTick++;
    image_index = min(2,chaosReplaceTick div 5);
    if (chaosReplaceTick >= 24) instance_destroy();
    exit;
}

// Generic mapped-object lifecycle (placement scan $8000 + lifetime routine $61E1) through the shared viewport adapter: created in the
// outer ring (or in the initial fill), asleep beyond EDGE(+-32), removed beyond EDGE(+-96). The anchor stays the canonical record.
var cp_vp = chaos_vp_current();
if (!chaosActive) {
    if (!SCR_chaos_placement_scan(id,cp_vp,chaosOriginX,chaosOriginY)) exit;
    chaosAsleep = true;
    x = chaosOriginX; y = chaosOriginY; chaosYU = round(y*256); chaosVY = 0;
    if (global.player != 1 && chaosParameter == $04) chaosParameter = $01;
    chaosState = 2; chaosAnimTick = 0; chaosActive = true; visible = false;
    global.chaosType10GraphicsSelector = chaosParameter;
}
var cp_cell = SCR_chaos_lifetime_cell(id,cp_vp,floor(x),floor(y));
if (cp_cell == 3) { chaosActive = false; chaosAsleep = true; visible = false; exit; } // $FE: occupancy released
chaosAsleep = (cp_cell >= 2); visible = !chaosAsleep;
if (chaosAsleep) exit; // callbacks do not run while asleep

chaosAnimTick++;
image_index = (chaosAnimTick div 5) & 1;

if (chaosState == 3) {
    chaosYU += chaosVY; chaosVY += $0040;
    y = chaosYU/256;
    var cp_floor = SCR_chaos_object_floor_project(x,y);
    if (cp_floor.grounded && chaosVY >= 0) {
        y = cp_floor.y; chaosYU = round(y*256); chaosVY = 0; chaosState = 2;
    }
    exit;
}

var cp_p = instance_find(OBJ_player,0);
if (!instance_exists(cp_p)) exit;
if (!variable_instance_exists(cp_p,"chaosCore")) SCR_chaos_core_attach(cp_p);
var cp_c = cp_p.chaosCore;

// One shared contact classification for EVERY type-$10 variant (the reward parameter is never consulted here). This is the
// original overlap helper $6328 with the player's and the box's fixed integer anchors: exactly one of top (1), bottom (2),
// right (4) or left (8) is kept, chosen by the smaller penetration, never by comparing the player's Y with the box's Y.
var cp_bits = SCR_chaos_box_contact(floor(cp_c.xu/256),floor(cp_c.yu/256),floor(x),floor(y),8,24,10,24);
if (cp_bits == 0) exit;

// $5FA0 solid-object projection (bottom and side contacts): Sonic is moved out of the box and cannot pass through it.
// Top-of-box standing is not projected here (unchanged from the accepted behaviour; see README_THZ2_FOUNDATION.md).
if (cp_bits != 1) {
    var cp_proj = SCR_chaos_box_projection(cp_bits,floor(cp_c.xu/256),floor(cp_c.yu/256),floor(x),floor(y),8,24,10,24);
    if (cp_bits == 2 && (cp_c.contacts & 2) != 0) {
        // D523 bit 1: already blocked from below, so the original does not push down.
    } else {
        cp_c.xu = cp_proj[0]*256 + (cp_c.xu & 255);
        cp_c.yu = cp_proj[1]*256 + (cp_c.yu & 255);
        cp_p.x = cp_c.xu/256; cp_p.y = cp_c.yu/256+cp_p.chaosAnchorOffset;
        cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
    }
    // Object-contact flags for the next player update ($63E3): a box to Sonic's right blocks rightward motion (64 -> contact 4),
    // a box to his left blocks leftward motion (128 -> contact 8).
    if (cp_bits == 8) cp_p.chaosBoxContacts = 64;
    if (cp_bits == 4) cp_p.chaosBoxContacts = 128;
}

// $D503.1 is mandatory. Power code $06 alone does not substitute.
var cp_state11 = cp_c.state == $11 || cp_c.next == $11;
var cp_attack = chaos_attack_posture(cp_c); // bit 1 ONLY (docs/player-attack-badnik-audit.md section 6); invincibility alone does not break a monitor
if (!cp_attack) exit;

// Bottom contact: neither direction nor requested state is tested.
if (cp_bits == 2) {
    cp_c.vy = $0200;
    chaosVY = -$0200; chaosState = 3;
    exit;
}

// Top contact rejects the requested states $0F/$10/$15/$1A; every remaining top or side contact needs a nonzero, downward Y velocity.
if (cp_bits == 1 && (cp_c.next == $0F || cp_c.next == $10 || cp_c.next == $15 || cp_c.next == $1A)) exit;
if (cp_c.vy <= 0) exit;

if (cp_c.state != 9) cp_c.vy = -$0400;
SCR_chaos_type10_reward(chaosParameter,cp_p);
SCR_chaos_enemy_score_100_bytes();
chaosConsumed = true; chaosActive = false; chaosReplaceTick = 0;
sprite_index = chaos_is_gpz() ? SPR_chaos_gpz_poof : SPR_chaos_object_0F; image_index = 0; visible = true;
