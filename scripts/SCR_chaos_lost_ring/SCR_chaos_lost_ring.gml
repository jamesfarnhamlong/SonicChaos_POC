// Recovered player hurt / lost-ring scatter: collectable type-$06 objects (Research 399f95bf03d3054d7f88ef6693eb935fc0c1ea13,
// docs/player-hurt-ring-scatter-audit.md, data/rom-cache/player-hurt-ring-scatter.json; mirrored in POC_notes/rom-cache/).
// Plain numbers and structs only, so verification/verify_lost_rings.js executes this shipped code. Replaces the legacy decorative OBJ_player_lost_b for ring loss.
//
// Canonical ROM behaviour (BYTE-VERIFIED / CONTROLLED in Research):
//   emission     N = min(7, tens digit of the BCD ring counter + 1); decimal 1-9 -> 1, 15 -> 2, 32 -> 4, 47 -> 5, 64 -> 7; the held count becomes 0
//   spawn        player anchor X, anchor Y - 16, init pass = the hurt update (no motion, no lifecycle test), token H = 0..N-1
//   velocity     8.8 fixed point by token: X {0,-1.25,+1.25,-2.5,+2.5,-3.25,+3.25}, Y {-5.0,-4.625,-4.625,-3.5,-3.5,-2.0,-2.0} px/update
//   per update   [pickup test from pass 17] ; vy += 0.125 ; x += vx ; y += vy ; ceiling / floor probe ; deferred off-screen delete (bit 6)
//   probes       block-header flags only, NO wall test: falling (vy >= 0) bit 6 or 7 at (x, y+18) -> bounce ; rising (vy < 0) bit 7 at (x, y+2) -> vy := -vy
//   bounce       starts at -4.0, each floor contact adds +0.5 and becomes the new Y speed (-3.5 ... -0.5); the 8th contact carries and deletes the ring (no sparkle)
//   pickup       passes 1..16 locked out; from pass 17 |dx| <= 11 and |dy| <= 11 against the player ANCHOR, tested at the ring's position BEFORE this update's motion;
//                no player-state condition (hurt, blink, invulnerable, any state); +1 ring (shared counter), 28-update sparkle (frames 5/6), then gone
//   lifecycle    no timer and no blink. $61E1 after every state-1/2 callback (not the init pass): anchor in the camera band -> stays; band cell 2 -> the ring's own
//                callback deletes it on the NEXT update; cell 3 -> deleted at once. 256 px view: horizontal [-32, 288) from the camera, vertical analogous (256 px window)
//   pool         only the first 16 object slots are allocatable; allocation failure is silent and does not shift tokens
//
// GAMEMAKER ADAPTERS (not ROM behaviour):
//   * WIDESCREEN HORIZONTAL RETENTION: the horizontal lifecycle bands hang off the REAL view edges (never off a fixed 256) and are additionally extended by
//     max(0, viewWidth - 256) on both sides (chaos_vp_band_x_retained, the accepted $10/$21/$27 + GPZ3 ball policy). A lost ring therefore never disappears at the old 4:3
//     edge while still visibly on screen. At 256 px the extension is zero and the lifecycle is exactly the canonical SMS one. Vertical bands are never widened.
//   * the sprite reuses the accepted type-$09 mapping and registration (frames 1,2,4,3 flight, 5/6 sparkle); the exact $06 registration is not separately proven.
//   * other objects' slot occupancy is not modelled; the 16-ring pool bound is the only emulation of the object-slot limit.
//   * the ring never alpha-blinks, never has a lifetime timer and is never decorative; player blink/invulnerability is a separate system.
#macro CHAOS_LR_MAX_EMIT 7
#macro CHAOS_LR_POOL 16
#macro CHAOS_LR_LOCKOUT 16
#macro CHAOS_LR_PICKUP_LIMIT 12
#macro CHAOS_LR_SPARKLE 28
#macro CHAOS_LR_GRAVITY 32
#macro CHAOS_LR_BOUNCE_START -1024
#macro CHAOS_LR_BOUNCE_STEP 128
#macro CHAOS_LR_SPAWN_DY -16
#macro CHAOS_LR_FLOOR_PROBE_DY 18
#macro CHAOS_LR_CEILING_PROBE_DY 2

/// Objects emitted for a DECIMAL ring count: min(7, tens digit + 1) for 1..99, none for 0 (death, no scatter). The ROM counter is BCD, so this is the decimal tens digit,
/// never rings >> 4. A POC counter above 99 (impossible in the ROM, which wraps to 00 with an extra life) emits the maximum.
function chaos_lr_count(cp_rings) {
    if (cp_rings <= 0) return 0;
    return min(CHAOS_LR_MAX_EMIT, floor(cp_rings / 10) + 1);
}
function chaos_lr_vx(cp_token) {
    var cp_table = [0, -320, 320, -640, 640, -832, 832];
    return cp_table[cp_token];
}
function chaos_lr_vy(cp_token) {
    var cp_table = [-1280, -1184, -1184, -896, -896, -512, -512];
    return cp_table[cp_token];
}

/// One ring in its init state (age 0). xu / yu / vx / vy / bounce are 8.8 fixed point (pixel = floor(v / 256)).
function chaos_lr_new(cp_token, cp_anchor_x, cp_anchor_y) {
    return {token: cp_token, xu: cp_anchor_x * 256, yu: (cp_anchor_y + CHAOS_LR_SPAWN_DY) * 256, vx: chaos_lr_vx(cp_token), vy: chaos_lr_vy(cp_token),
        bounce: CHAOS_LR_BOUNCE_START, age: 0, sparkle: -1, bit6: false, alive: true, contacts: 0};
}

/// The shared list of live rings (plain structs; no GameMaker instances). Created on demand and cleared by chaos_lr_reset.
function chaos_lr_list() {
    if (!variable_global_exists("chaosLostRings")) global.chaosLostRings = [];
    return global.chaosLostRings;
}
function chaos_lr_reset() {
    global.chaosLostRings = [];
}

/// Emit the scatter for a ring loss: count from the decimal ring count, anchored at the player anchor. Returns the number actually allocated (pool of 16).
function chaos_lr_emit(cp_rings, cp_anchor_x, cp_anchor_y) {
    var cp_list = chaos_lr_list();
    var cp_count = chaos_lr_count(cp_rings);
    var cp_made = 0;
    for (var cp_token = 0; cp_token < cp_count; cp_token++) {
        if (array_length(cp_list) >= CHAOS_LR_POOL) continue;      // silent allocation failure, tokens do not shift
        array_push(cp_list, chaos_lr_new(cp_token, cp_anchor_x, cp_anchor_y));
        cp_made++;
    }
    return cp_made;
}

/// Lifecycle cell of a ring anchor ($61E1): 0/1 active, 2 deferred delete, 3 delete now. Horizontal bands follow the real view edges and the widescreen retention adapter
/// (identical to the canonical SMS bands at 256 px); the vertical band is the ROM's 256 px window below the camera top and is never widened.
function chaos_lr_cell(cp_vp, cp_x, cp_y) {
    return max(chaos_vp_band_x_retained(cp_vp, cp_x), chaos_vp_band_y(cp_vp, cp_y));
}

/// Header flags of the 32x32 block addressed by the ring anchor (same `$7725` lookup the player core uses; plane 0; outside the map reads as air).
function chaos_lr_flags(cp_pixel_x, cp_pixel_y, cp_dy) {
    return SCR_cc_lookup(cp_pixel_x, cp_pixel_y + cp_dy, 0).flags;
}

/// Anchor pixel of a ring.
function chaos_lr_pixel_x(cp_r) {
    return floor(cp_r.xu / 256);
}
function chaos_lr_pixel_y(cp_r) {
    return floor(cp_r.yu / 256);
}

/// One scheduler pass of a ring (pass 0 = the spawn / hurt update). cp_have: the player anchor (cp_px, cp_py) is valid. cp_vp: live view {left, top, w, h}.
/// Returns "" or the last event of the pass: "pickup", "bounce", "ceiling", "bounce_exhausted", "offscreen_bit6", "offscreen_delete", "sparkle_end".
function chaos_lr_step(cp_r, cp_have, cp_px, cp_py, cp_vp) {
    if (!cp_r.alive) return "";
    var cp_age = cp_r.age;
    cp_r.age++;
    var cp_event = "";
    if (cp_age == 0) return "";                                   // init pass: no motion, no lifecycle test
    if (cp_r.sparkle >= 0) {
        cp_r.sparkle++;
        if (cp_r.sparkle > CHAOS_LR_SPARKLE) { cp_r.alive = false; return "sparkle_end"; }
    } else {
        // Pickup test first, at the position before this update's motion. No player state, hurt, blink or invulnerability condition exists.
        if (cp_have && cp_age > CHAOS_LR_LOCKOUT && abs(chaos_lr_pixel_x(cp_r) - cp_px) < CHAOS_LR_PICKUP_LIMIT && abs(chaos_lr_pixel_y(cp_r) - cp_py) < CHAOS_LR_PICKUP_LIMIT) {
            cp_r.sparkle = 0;
            cp_event = "pickup";
        } else {
            cp_r.vy += CHAOS_LR_GRAVITY;
            cp_r.xu += cp_r.vx;
            cp_r.yu += cp_r.vy;
            var cp_x = chaos_lr_pixel_x(cp_r);
            var cp_y = chaos_lr_pixel_y(cp_r);
            if (cp_r.vy < 0) {
                if ((chaos_lr_flags(cp_x, cp_y, CHAOS_LR_CEILING_PROBE_DY) & 128) != 0) { cp_r.vy = -cp_r.vy; cp_event = "ceiling"; }
            } else if ((chaos_lr_flags(cp_x, cp_y, CHAOS_LR_FLOOR_PROBE_DY) & 192) != 0) {
                var cp_next = cp_r.bounce + CHAOS_LR_BOUNCE_STEP;
                if (cp_next >= 0) { cp_r.alive = false; return "bounce_exhausted"; }
                cp_r.bounce = cp_next;
                cp_r.vy = cp_next;
                cp_r.contacts++;
                cp_event = "bounce";
            }
            if (cp_r.bit6) { cp_r.alive = false; return "offscreen_bit6"; }   // set by the previous pass's lifecycle test
        }
    }
    var cp_cell = chaos_lr_cell(cp_vp, chaos_lr_pixel_x(cp_r), chaos_lr_pixel_y(cp_r));
    if (cp_cell >= 3) { cp_r.alive = false; return "offscreen_delete"; }
    cp_r.bit6 = cp_cell == 2;
    return cp_event;
}

/// Sub-image of the accepted type-$09 ring mapping to draw (0..5 = mapping frames 1,2,4,3 flight and 5,6 sparkle), or -1 for the invisible init pass / a dead ring.
/// Evaluated AFTER a pass (age = passes executed). Flight: four-update records [1,2,4,3] starting with pass 1 and repeating every 16 passes; sparkle: seven four-update records
/// 5,6,5,6,5,6,5 (28 updates). The init pass shows mapping frame 0, which is not drawn (its content is not proven).
function chaos_lr_frame(cp_r) {
    if (!cp_r.alive || cp_r.age < 2) return -1;
    if (cp_r.sparkle >= 1) {
        if (cp_r.sparkle > CHAOS_LR_SPARKLE) return -1;
        return 4 + (floor((cp_r.sparkle - 1) / 4) % 2);
    }
    var cp_cycle = floor((cp_r.age - 2) / 4) % 4;
    return cp_cycle == 0 ? 0 : (cp_cycle == 1 ? 1 : (cp_cycle == 2 ? 3 : 2));
}

/// Object phase for the whole list (called once per gameplay update, after the player's pass, from SCR_chaos_objects_phase). The player anchor comes from the core's
/// fixed-point position. Each pickup adds one ring through the shared counter and plays the ring sound. Returns the number of pickups this update.
function SCR_chaos_lost_rings_phase(cp_have, cp_core) {
    var cp_list = chaos_lr_list();
    if (array_length(cp_list) == 0) return 0;
    var cp_vp = chaos_vp_current();
    var cp_px = 0;
    var cp_py = 0;
    if (cp_have) {
        cp_px = floor(cp_core.xu / 256);
        cp_py = chaos_signed_world_y(cp_core.yu);
    }
    var cp_alive = [];
    var cp_picked = 0;
    for (var cp_i = 0; cp_i < array_length(cp_list); cp_i++) {
        var cp_r = cp_list[cp_i];
        var cp_event = chaos_lr_step(cp_r, cp_have, cp_px, cp_py, cp_vp);
        if (cp_event == "pickup") {
            cp_picked++;
            global.ring += 1;
            if (global.music == 1) {
                if (audio_is_playing(SFX_ring)) audio_stop_sound(SFX_ring);
                audio_play_sound(SFX_ring, 10, false);
            }
        }
        if (cp_r.alive) array_push(cp_alive, cp_r);
    }
    global.chaosLostRings = cp_alive;
    return cp_picked;
}

/// GameMaker side of a ring loss: emit the scatter at the player's core anchor and return the number created. Shared by the recovered hurt entry and the legacy hazard path.
function SCR_chaos_lost_rings_emit(cp_p, cp_rings) {
    var cp_core = cp_p.chaosCore;
    return chaos_lr_emit(cp_rings, floor(cp_core.xu / 256), chaos_signed_world_y(cp_core.yu));
}
