// 14.5: integer ROM movement core. No GameMaker instance or sprite dependencies.
// These functions are also executed unchanged by verification/verify_core.js.
// Units: coordinates 16.8; velocities signed 8.8; ONE original update per call.
function SCR_cc_s16(cp_n) { return ((cp_n + 32768) & 65535) - 32768; }
function SCR_cc_new(cp_x, cp_y) {
    return {xu:round(cp_x*256), yu:round(cp_y*256), vx:0, vy:0,
        state:1, next:1, move:0, bg:0, contacts:0, objects:0, support:0,
        player_flags:0, plane:0, previous:0, tile:255, modifier:0,
        foot_block:255, special:0, surface_counter:0, frame_counter:0,
        route_progress:0, route_x:0, route_y:0, terrain_escape:false,
        input_delta:0, surface_delta:0, maximum:1024, water:0,
        held:0, pressed:0, jump_ticks:0, sound:0, unsupported:0,
        hazard:0, angle:0, magnitude:0, twist_variant:0, level:0,
        state11_active:false, state11_camera_y:0,
        state11_anim_tick:0, state11_frame:56, hurt_ticks:0, zone:0,
        camera_x:0, act_clear:false, clear_dx:289,
        // Damage ($48F7 / $48BC, platform-spike milestone): rings and the immunity inputs are supplied by the adapter each update; the core never reads GameMaker globals.
        rings:0, shield:false, immune:false, invuln:0, damage_request:0, box_contacts:0, box_ready:0, contact:0, contact_nib:0, stage_contact:0, stage_nib:0, stage_request:0, hurt_rom:false,
        hurt_pending:false, hurt_death:false, hurt_rings_lost:0, hurt_scatter:0, hurt_shield:false, crush_death:false};
}
function SCR_cc_merge(cp_c) {
    cp_c.contacts = cp_c.bg;
    if (cp_c.support != 0 || ((cp_c.move & 2) == 0 && (cp_c.player_flags & 128) == 0))
        cp_c.contacts |= (cp_c.objects >> 4) & 15;
}
// $4141: camera boundary clipping belongs to the widescreen adapter, not this function.
function SCR_cc_input(cp_c) {
    if (cp_c.state >= 30) return; // states >=41 are outside this bounded translation
    var cp_table = cp_c.water ? 3 : 0;
    var cp_pair = (cp_c.held & 4) ? 0 : 1;
    if ((cp_c.held & 12) == 0) {
        cp_c.input_delta = 0;
        if (cp_c.vx == 0) return; // original retains surface delta here
        cp_table = 2;
        cp_pair = cp_c.vx < 0 ? 0 : 1;
    } else if (cp_c.vx < 0) cp_table++;
    var cp_delta = global.chaosMovementTables[cp_table][cp_c.state][cp_pair];
    if ((((abs(cp_c.vx) + 128) & 65535) >> 8) == 0) cp_delta *= 2;
    cp_c.input_delta = SCR_cc_s16(cp_delta);
    cp_c.surface_delta = global.chaosSurfaceDeltas[floor(cp_c.modifier / 2)];
}
// $402A: high-byte limits are deliberately not a symmetric floating point clamp.
function SCR_cc_x(cp_c) {
    var cp_v = SCR_cc_s16(cp_c.vx + cp_c.input_delta + cp_c.surface_delta);
    var cp_block = cp_v < 0 ? 8 : 4;
    if ((cp_c.contacts & cp_block) != 0) {
        cp_c.vx = 0; cp_c.input_delta = 0; return;
    }
    var cp_hi = (cp_v & 65535) >> 8;
    var cp_max_hi = (cp_c.maximum & 65535) >> 8;
    if (cp_v >= 0 && cp_hi >= cp_max_hi) cp_v = cp_c.maximum;
    if (cp_v < 0 && cp_hi < ((-cp_max_hi) & 255)) cp_v = -cp_c.maximum;
    cp_c.vx = cp_v;
    cp_c.xu = (cp_c.xu + cp_v) & 16777215;
}
// $4097: +7/+9 downward contact integration precedes floor projection.
function SCR_cc_y(cp_c) {
    var cp_v = cp_c.vy;
    if (cp_c.state != 17) {
        if ((cp_c.move & 1) != 0) {
            var cp_g = cp_c.state == 11 ? 24 : (cp_c.state == 27 ? 36 : 48);
            if (cp_c.water) cp_g /= 2;
            cp_v = SCR_cc_s16(cp_v + cp_g);
            var cp_terminal = cp_c.water ? 1024 : 1792;
            if (cp_v >= cp_terminal) cp_v = cp_terminal;
        } else {
            if (cp_c.support != 0) return;
            cp_v = SCR_cc_s16(abs(cp_v));
        }
    }
    if ((cp_c.bg & 2) != 0) cp_v = (cp_c.modifier == 10 || cp_c.modifier == 12) ? 2304 : 1792;
    cp_c.vy = cp_v;
    cp_c.yu = (cp_c.yu + cp_v) & 16777215;
}
// $7666: caller passes effective probe Y, including the original +18.
function SCR_cc_lookup(cp_x, cp_y, cp_plane) {
    var cp_ax = floor(cp_x) & 65535;
    var cp_ay = floor(cp_y) & 65535;
    if ((cp_ay & 32768) != 0) cp_ay = 0;
    // ROM row-offset table: the row stride is the act's map width (128 in THZ1/THZ2, 80 in THZ3); columns past the width wrap into the next row exactly as the ROM does.
    var cp_w = 128;
    if (variable_global_exists("chaosMapWidth")) cp_w = global.chaosMapWidth; // set by chaos_level_install_layout (128 in THZ1/THZ2, 80 in THZ3)
    var cp_index = (((cp_ay >> 5) & 127)*cp_w + ((cp_ax >> 5) & 255));
    var cp_address = (49153 + cp_index) & 65535;
    // GAMEMAKER PRESENTATION ADAPTER: the ROM lookup wraps columns beyond the current act's map width into the next row.
    // Only during state $20, keep those beyond-map columns open so the recovered EDGE(RIGHT,+33) run can finish.
    // THZ1/2 have 128 columns (4096 px); THZ3 has 80 (2560 px).
    if (global.chaosBeyondMapOpen && cp_ax >= cp_w*32) return {tile:255, flags:0, modifier:0,
        vertical:0, horizontal:0, ax:cp_ax, ay:cp_ay, index:-1};
    if ((cp_address & 61440) != 49152) return {tile:255, flags:0, modifier:0,
        vertical:0, horizontal:0, ax:cp_ax, ay:cp_ay, index:-1};
    var cp_tile = global.chaosTileIds[cp_index];
    var cp_h = global.chaosHeaders0[cp_tile];
    if ((cp_h[0] & 32) != 0 && cp_plane != 0) cp_h = global.chaosHeaders1[cp_tile];
    return {tile:cp_tile, flags:cp_h[0], modifier:cp_h[1],
        vertical:cp_h[2][cp_ax & 31], horizontal:cp_h[3][cp_ay & 31],
        ax:cp_ax, ay:cp_ay, index:cp_index};
}
// $6F61/$7056 ordinary path only (special IX+$24 branches are not implemented).
function SCR_cc_project_floor(cp_c, cp_s) {
    if ((cp_c.previous & 192) == 0 || cp_c.vy < 0) return;
    var cp_solid = (cp_c.previous & 128) != 0;
    // $6FBB: retained strip bit plus REQUESTED $14 bypasses any one-way support.
    if (!cp_solid && (cp_c.special & 1) != 0 && cp_c.next == 20) { cp_c.bg &= ~2; SCR_cc_merge(cp_c); return; }
    // $7010..$7055: previous bit6-only flags plus retained oil bit. Probe
    // four pixels lower; no shallow-penetration clamp and no speed/state edit.
    if (!cp_solid && (cp_c.special & 2) != 0) {
        cp_c.bg &= ~2;
        // $7010 increments D35A without looking up another block/profile.
        var cp_total_sink = (cp_s.vertical + ((cp_s.ay+4) & 31)) & 255;
        if (cp_total_sink >= 32) {
            cp_c.yu = (cp_c.yu - (cp_total_sink-32)*256 + cp_c.surface_counter*256)&16777215;
            cp_c.bg |= 2; cp_c.modifier = cp_s.modifier;
        }
        SCR_cc_merge(cp_c); return;
    }
    var cp_raw = cp_s.vertical;
    var cp_mod = cp_s.modifier;
    if ((cp_solid && (cp_raw & 63) == 32) || (!cp_solid && (cp_raw & 63) == 0)) {
        if (cp_s.index >= (variable_global_exists("chaosMapWidth") ? global.chaosMapWidth : 128)) {
            var cp_above = SCR_cc_lookup(cp_s.ax, cp_s.ay-32, cp_c.plane);
            var cp_upper = cp_above.vertical & 63;
            if ((cp_above.flags & 64) != 0) {
                if ((cp_above.flags & 31) != 9 && cp_upper != 0) cp_raw = cp_upper + 32;
            } else if ((cp_above.flags & 128) != 0) {
                cp_mod = cp_above.modifier;
                cp_c.yu = (cp_c.yu - cp_upper*256) & 16777215;
            }
        }
    }
    if (!cp_solid) cp_c.bg &= ~2;
    var cp_value = cp_raw;
    if (cp_solid) {
        if ((cp_raw & 64) != 0 && (cp_c.previous & 31) == 28) cp_value = 32;
        cp_value &= 63;
    }
    var cp_total = (cp_value + (cp_s.ay & 31)) & 255;
    if (cp_total >= 32 && (cp_solid || cp_total-32 < (((cp_c.vy >> 8)+9) & 255))) {
        cp_c.yu = (cp_c.yu - (cp_total-32)*256) & 16777215;
        cp_c.bg |= 2;
        cp_c.modifier = cp_mod;
        SCR_cc_merge(cp_c);
    }
}
function SCR_cc_stand(cp_c) {
    cp_c.move &= ~3; cp_c.next = 1; cp_c.vx = 0; cp_c.maximum = 1024;
}
function SCR_cc_walk(cp_c) {
    cp_c.move &= ~67; cp_c.next = 5; cp_c.maximum = 1024;
}
function SCR_cc_fall(cp_c) {
    if (cp_c.state == 10) return;
    cp_c.next = 14; cp_c.vy = 256; cp_c.move = (cp_c.move | 1) & ~2; cp_c.bg &= ~2;
    cp_c.special &= ~1; cp_c.surface_counter = 0;
}
function SCR_cc_roll(cp_c) {
    if (((cp_c.vx & 65535) >> 8) == 0) {
        cp_c.vx = 0; cp_c.next = 4; cp_c.move &= ~66; return;
    }
    cp_c.next = 9; cp_c.maximum = 1536; cp_c.move = (cp_c.move | 2) & ~1;
}
function SCR_cc_jump(cp_c) {
    if ((cp_c.move & 1) != 0 || cp_c.state == 17 || (cp_c.tile & 252) == 144) return;
    cp_c.move |= 3; cp_c.next = 10; cp_c.vy = cp_c.water ? -832 : -1088;
    cp_c.yu = (cp_c.yu-256) & 16777215; cp_c.bg &= ~2; cp_c.jump_ticks = 0; cp_c.sound = 1;
    cp_c.special &= ~1; cp_c.surface_counter = 0;
}
// $69B2: the negative-velocity contact test is the inverse of the positive one.
function SCR_cc_ramp(cp_c, cp_previous_mod, cp_tile) {
    if (cp_c.vy < 0) return;
    if (cp_previous_mod != 0) {
        if (cp_c.state == 27 || cp_c.vx == 0) return;
        if (cp_c.vx >= 0 && (cp_c.contacts & 2) == 0) return;
        if (cp_c.vx < 0 && (cp_c.contacts & 2) != 0) return;
        var cp_magnitude = abs(cp_c.vx);
        cp_c.vy = SCR_cc_s16(-(cp_magnitude + floor(cp_magnitude/2)));
        cp_c.next = 27; cp_c.move |= 3; cp_c.bg &= ~2;
    } else {
        SCR_cc_merge(cp_c);
        if ((cp_c.contacts & 2) == 0) return;
        cp_c.vx = SCR_cc_s16(cp_c.vx + ((cp_tile == 31 || cp_tile >= 34) ? -1024 : 1024));
        SCR_cc_roll(cp_c);
    }
}
// Terrain springs live in the terrain dispatch ($690B). The ROM never evaluates them in the loop states $0C/$0D/$13, the twist $22 or act-clear $20, and
// state $11 blocks them (docs/spring-interaction-audit.md section 9; verification/verify_spring_interaction.js).
function SCR_cc_terrain_spring_state(cp_state) {
    return cp_state != 12 && cp_state != 13 && cp_state != 19 && cp_state != 32 && cp_state != 34;
}
// Upright (type 9, $6A75 -> $480C): floor flag, Y speed not negative (zero passes); X speed untouched, vy := -7.5, state $0B, attack posture CLEAR (D503 bit 1), D448 := $FF.
// Diagonal (type $14, $6A90 -> $482D): floor flag; X speed, facing, D448 := 0 and the sound are written BEFORE the Y-speed gate; then vy := -7.0 (THZ, D297 = 0),
//   state $1C, attack posture SET (bits 0 and 1).
// Horizontal (type 10, side cores): no Y-speed or floor gate; vx := +-6.0, cap $0600, state 9, attack posture SET (bit 1), airborne bit clear; Y speed untouched.
function SCR_cc_spring(cp_c, cp_kind, cp_tile) {
    if (cp_c.state == 17 || !SCR_cc_terrain_spring_state(cp_c.state)) return;
    if (cp_kind == 9 || cp_kind == 20) {
        if ((cp_c.bg & 2) == 0) return;
        if (cp_kind == 20) {
            cp_c.vx = cp_tile >= 56 ? -1024 : 1024;
            if (cp_tile >= 56) cp_c.player_flags |= 16; else cp_c.player_flags &= ~16; // facing bit (+$04 bit 4), set for left launches
            cp_c.d448 = 0; cp_c.sound = 2;
        }
        if (cp_c.vy < 0) return;
        cp_c.vy = cp_kind == 9 ? -1920 : (cp_c.zone == 0 ? -1792 : -1408); // ROM $D297 zone distinction
        cp_c.next = cp_kind == 9 ? 11 : 28;
        cp_c.move = cp_kind == 9 ? ((cp_c.move | 1) & ~2) : (cp_c.move | 3);
        if (cp_kind == 9) cp_c.d448 = 255;
    } else {
        cp_c.next = 9; cp_c.vx = cp_kind == 1 ? 1536 : -1536;
        cp_c.maximum = 1536; cp_c.move = (cp_c.move | 2) & ~1;
    }
    cp_c.bg &= ~2; cp_c.sound = 2;
}
// $6E56: enter the angle-driven twist state from one of five actual gate tiles.
function SCR_cc_twist_enter(cp_c, cp_tile) {
    var cp_right = cp_tile == 89 || cp_tile == 92;
    var cp_left = cp_tile == 115 || cp_tile == 114 || cp_tile == 107;
    if (!cp_right && !cp_left) return false;
    if (cp_right) {
        if (cp_c.vx < 0) return false;
        if (cp_c.level == 3) {
            if (cp_c.vx < 1280) cp_c.vx = 1280;
        } else if (cp_c.vx < 768) return false;
    } else {
        if (cp_c.vx >= -768) return false;
    }
    if (cp_c.state == 34 || (cp_c.state != 5 && cp_c.state != 6 && cp_c.state != 9 &&
        cp_c.state != 16 && cp_c.state != 26)) return false;
    cp_c.angle = cp_right ? 64 : 192;
    cp_c.twist_variant = cp_c.level == 3 ? (cp_right ? 2 : 3) : (cp_right ? 0 : 1);
    var cp_abs = abs(SCR_cc_s16(cp_c.vx)) & 65535;
    cp_c.magnitude = ((cp_abs << 5) & 65535) >> 8;
    cp_c.next = 34;
    return true;
}
function SCR_cc_twist_set_y(cp_c, cp_sonic_offset) {
    var cp_fraction = cp_c.yu & 255;
    var cp_integer = floor(cp_c.yu/256) & 65535;
    cp_integer = ((cp_integer-cp_sonic_offset) & 65504)+46;
    cp_c.yu = ((cp_integer & 65535)*256+cp_fraction) & 16777215;
}
function SCR_cc_twist_x_f0(cp_c) {
    var cp_fraction = cp_c.xu & 255;
    var cp_integer = floor(cp_c.xu/256) & 65535;
    cp_integer = ((cp_integer+6) & 65504)+10;
    cp_c.xu = ((cp_integer & 65535)*256+cp_fraction) & 16777215;
}
function SCR_cc_twist_x_12(cp_c) {
    var cp_fraction = cp_c.xu & 255;
    var cp_integer = floor(cp_c.xu/256) & 65535;
    cp_integer = (cp_integer & 65280) | (((cp_integer & 255) & 224)+22);
    cp_c.xu = ((cp_integer & 65535)*256+cp_fraction) & 16777215;
}
function SCR_cc_twist_x_1d(cp_c) {
    var cp_fraction = cp_c.xu & 255;
    var cp_integer = floor(cp_c.xu/256) & 65535;
    cp_integer = (cp_integer & 65280) | ((((cp_integer & 255)+16) & 224)+4);
    cp_c.xu = ((cp_integer & 65535)*256+cp_fraction) & 16777215;
}
function SCR_cc_twist_inc(cp_c) { if (cp_c.magnitude < 160) cp_c.magnitude = (cp_c.magnitude+2)&255; }
function SCR_cc_twist_dec(cp_c) {
    cp_c.magnitude = (cp_c.magnitude-1)&255;
    if (cp_c.magnitude < 16) cp_c.twist_variant = 2;
}
// Bank 12 $95F1..$974C. Addresses are retained so the exported 112-entry ROM
// dispatch can be audited directly against data/twist-dispatch.csv.
function SCR_cc_twist_handler(cp_c, cp_handler) {
    switch (cp_handler) {
        case 38385: case 38388: case 38433: case 38441:
            cp_c.angle=64; SCR_cc_twist_set_y(cp_c,32); break;
        case 38396: case 38404: cp_c.angle=40; break;
        case 38412: cp_c.angle=64; break;
        case 38417: case 38425: cp_c.angle=88; break;
        case 38449: case 38452: case 38514:
            cp_c.angle=192; SCR_cc_twist_set_y(cp_c,16); break;
        case 38460: case 38476: case 38522:
            cp_c.angle=192; SCR_cc_twist_set_y(cp_c,32); break;
        case 38468: case 38484: cp_c.angle=168; break;
        case 38492: break;
        case 38493: cp_c.angle=192; break;
        case 38498: case 38506: cp_c.angle=216; break;
        case 38530: cp_c.angle=104; SCR_cc_twist_inc(cp_c); break;
        case 38538: cp_c.angle=64; SCR_cc_twist_set_y(cp_c,32); SCR_cc_twist_inc(cp_c); break;
        case 38549: cp_c.angle=120; SCR_cc_twist_inc(cp_c); break;
        case 38557: SCR_cc_twist_x_12(cp_c); cp_c.angle=128; SCR_cc_twist_inc(cp_c); break;
        case 38560: cp_c.angle=128; SCR_cc_twist_inc(cp_c); break;
        case 38568: cp_c.angle=168; SCR_cc_twist_inc(cp_c); break;
        case 38576: SCR_cc_twist_x_f0(cp_c); cp_c.angle=128; SCR_cc_twist_inc(cp_c); break;
        case 38579: cp_c.angle=128; SCR_cc_twist_inc(cp_c); break;
        case 38587: SCR_cc_twist_x_1d(cp_c); cp_c.angle=128; SCR_cc_twist_inc(cp_c); break;
        case 38598: cp_c.angle=112; SCR_cc_twist_inc(cp_c); break;
        case 38606: cp_c.angle=80; SCR_cc_twist_inc(cp_c); break;
        case 38614: cp_c.angle=96; SCR_cc_twist_inc(cp_c); break;
        case 38622: cp_c.angle=192; SCR_cc_twist_set_y(cp_c,32); SCR_cc_twist_dec(cp_c); break;
        case 38633: cp_c.angle=220; SCR_cc_twist_dec(cp_c); break;
        case 38641: cp_c.angle=240; SCR_cc_twist_dec(cp_c); break;
        case 38649: SCR_cc_twist_x_f0(cp_c); SCR_cc_twist_x_1d(cp_c); cp_c.angle=0; SCR_cc_twist_dec(cp_c); break;
        case 38652: SCR_cc_twist_x_1d(cp_c); cp_c.angle=0; SCR_cc_twist_dec(cp_c); break;
        case 38663: cp_c.angle=40; SCR_cc_twist_dec(cp_c); break;
        case 38671: cp_c.angle=4; SCR_cc_twist_dec(cp_c); break;
        case 38679: cp_c.angle=0; SCR_cc_twist_dec(cp_c); break;
        case 38687: SCR_cc_twist_x_12(cp_c); cp_c.angle=0; SCR_cc_twist_dec(cp_c); break;
        case 38698: cp_c.angle=232; SCR_cc_twist_dec(cp_c); break;
        case 38706: cp_c.angle=224; SCR_cc_twist_dec(cp_c); break;
        case 38714: cp_c.angle=216; SCR_cc_twist_dec(cp_c); break;
        case 38722: cp_c.angle=192; SCR_cc_twist_set_y(cp_c,32); SCR_cc_twist_dec(cp_c); break;
    }
}
function SCR_cc_twist_vector(cp_c) {
    var cp_x = global.chaosAngleTable[cp_c.angle&255]*cp_c.magnitude;
    var cp_y = global.chaosAngleTable[(cp_c.angle+192)&255]*cp_c.magnitude;
    cp_c.vx = SCR_cc_s16(floor(cp_x/16)); cp_c.vy = SCR_cc_s16(floor(cp_y/16));
    cp_c.xu = (cp_c.xu+cp_c.vx)&16777215; cp_c.yu = (cp_c.yu+cp_c.vy)&16777215;
}
function SCR_cc_twist_tick(cp_c) {
    SCR_cc_floor(cp_c);
    if ((cp_c.previous&63) != 23 || cp_c.tile < 88 || cp_c.tile > 115) {
        cp_c.angle=0; cp_c.magnitude=0; cp_c.next=9; return;
    }
    SCR_cc_twist_handler(cp_c,global.chaosTwistHandlers[cp_c.twist_variant&3][cp_c.tile-88]);
    SCR_cc_twist_vector(cp_c);
}
// Surface type 13 (THZ2 block $9C): breakable terrain. Every entry ends in $7898, which replaces the collided
// map cell with $9D. The break itself is delegated to SCR_chaos_break_block (GameMaker adapter).
function SCR_cc_break13(cp_index) { SCR_chaos_break_block(cp_index); }
// $72B6 (right probe) / $72DD (left probe): requires the rolling flag (+3 bit 1) and |X-velocity high byte| >= 3;
// a right-side hit with high byte < 7 adds +$40, a left-side hit with negated high byte < 7 adds -$40; then breaks.
function SCR_cc_break13_side(cp_c, cp_s, cp_right) {
    if ((cp_c.move & 2) == 0) return false;
    var cp_hi = (cp_c.vx >> 8) & 255;
    var cp_magnitude = (cp_hi & 128) != 0 ? ((256 - cp_hi) & 255) : cp_hi;
    if (cp_magnitude < 3) return false;
    if (cp_right) { if (cp_hi < 7) cp_c.vx = SCR_cc_s16(cp_c.vx + 64); }
    else if (((256 - cp_hi) & 255) < 7) cp_c.vx = SCR_cc_s16(cp_c.vx - 64);
    SCR_cc_break13(cp_s.index);
    return true;
}
// $6B2C: current state not $0F/$10/$15/$1A and rolling flag set -> Y velocity $FBC0, airborne, break.
function SCR_cc_break13_floor(cp_c, cp_s) {
    if (cp_c.state == 15 || cp_c.state == 16 || cp_c.state == 21 || cp_c.state == 26) return;
    if ((cp_c.move & 2) == 0) return;
    cp_c.vy = -1088;
    cp_c.bg &= ~2; cp_c.contacts &= ~2; cp_c.move |= 1;
    SCR_cc_break13(cp_s.index);
}
function SCR_cc_floor(cp_c) {
    var cp_previous_block = cp_c.foot_block;
    var cp_old_mod = cp_c.modifier; cp_c.modifier = 0;
    var cp_dy = cp_c.state == 33 ? -14 : (cp_c.state == 18 ? 8 : 0);
    var cp_s = SCR_cc_lookup(floor(cp_c.xu/256),floor(cp_c.yu/256)+18+cp_dy,cp_c.plane);
    cp_c.tile = cp_s.tile;
    cp_c.foot_block = cp_s.tile; // $D497/$D36B are foot samples, never side/ceiling samples.
    SCR_cc_project_floor(cp_c,cp_s);
    cp_c.previous = cp_s.flags;
    var cp_kind = cp_s.flags & 31;
    if (cp_kind == 16 && SCR_cc_route19_try(cp_c,cp_previous_block,cp_s.tile)) return;
    if (cp_kind == 18) SCR_cc_ramp(cp_c,cp_old_mod,cp_s.tile);
    else if (cp_kind == 5) {
        // $6ACE (docs/platform-spike-collision-audit.md 2.2): tile & $FE != $F4, floor flag $D522 bit 1 set (after the previous surface's projection above),
        // and +$03 bit 7 (invulnerable, move & 128) clear, then the hurt entry $48F7 DIRECTLY (not through the $48BC request gate). Nothing else: no state, no speed.
        if ((cp_s.tile & 254) != 244 && (cp_c.bg & 2) != 0 && (cp_c.move & 128) == 0) {
            if (cp_c.zone == 3) { cp_c.hazard=1; SCR_cc_hurt_rom(cp_c); }
            else SCR_cc_terrain_hurt(cp_c);
        }
    }
    else if (cp_kind == 9 || cp_kind == 20) SCR_cc_spring(cp_c,cp_kind,cp_s.tile);
    else if (cp_kind == 23) SCR_cc_twist_enter(cp_c,cp_s.tile);
    else if (cp_kind == 13) SCR_cc_break13_floor(cp_c,cp_s); // $6B2C
    else if (cp_kind == 22) { if (cp_c.zone != 0) SCR_cc_break16_floor(cp_c,cp_s); else cp_c.unsupported=22; } // $6AE3; accepted THZ adapter remains separate
    else if (cp_kind == 25) { cp_c.special |= 1; cp_c.surface_counter = (cp_c.surface_counter+1)&255; }
    else if (cp_kind == 27) {
        // $6B14: $D12F counts displayed frames, not contact calls.
        cp_c.special |= 2;
        if ((cp_c.frame_counter & 3) == 0) cp_c.surface_counter = (cp_c.surface_counter+1)&255;
    }
    else if (cp_kind == 0 || cp_kind == 6 || cp_kind == 7) {
        if (cp_kind == 0) cp_c.special &= ~3; // $6C4D (6/7) enters AFTER the two RES instructions.
        // $6C45/$6C4D: empty floor can request falling even when projection returned early.
        if ((cp_c.objects & 32) == 0) cp_c.bg &= ~2;
        SCR_cc_merge(cp_c);
        if ((cp_c.contacts & 2) == 0 && (cp_c.move & 1) == 0) {
            if (cp_c.state == 9) { cp_c.next = 10; cp_c.vy = 0; cp_c.move |= 3; cp_c.bg &= ~2; }
            else SCR_cc_fall(cp_c);
        }
    } else if (cp_kind != 1 && cp_kind != 2 && cp_kind != 3 && cp_kind != 4 &&
               cp_kind != 10 && cp_kind != 15 && cp_kind != 16 && cp_kind != 17 && cp_kind != 21 &&
               cp_kind != 24 && cp_kind != 26 && cp_kind != 28 && cp_kind != 29 && cp_kind != 30) {
        cp_c.unsupported = cp_kind; // recorded, never substituted by coordinate-specific fixes
    }
}
// $71B2/$7257 ordinary projection; cp_right selects the tested side.
function SCR_cc_project_side(cp_c, cp_s, cp_right) {
    var cp_raw = cp_s.horizontal, cp_extent = cp_raw & 63;
    if ((cp_s.flags & 128) == 0 || cp_extent == 0) return false;
    var cp_local = cp_s.ax & 31, cp_delta = -1;
    if (cp_right) {
        if ((cp_raw & 64) != 0) cp_delta = cp_s.ax - (((cp_s.ax+32)&65504)-cp_extent);
        else if (cp_local < cp_extent) cp_delta = cp_local;
        if (cp_delta < 0) return false;
        cp_c.xu = (cp_c.xu-cp_delta*256)&16777215; cp_c.bg |= 4;
    } else {
        if ((cp_raw & 64) != 0) {
            cp_delta = ((cp_s.ax+32)&65504)-1-cp_s.ax;
            if (cp_delta >= cp_extent) cp_delta = -1;
        } else if (cp_local < cp_extent) cp_delta = cp_extent-cp_local-1;
        if (cp_delta < 0) return false;
        cp_c.xu = (cp_c.xu+cp_delta*256)&16777215; cp_c.bg |= 8;
    }
    SCR_cc_merge(cp_c); return true;
}
function SCR_cc_sides(cp_c) {
    cp_c.bg &= ~12;
    for (var cp_side = 0; cp_side < 2; cp_side++) {
        var cp_right = cp_side == 0;
        var cp_s = SCR_cc_lookup(floor(cp_c.xu/256)+(cp_right ? 9 : -9),floor(cp_c.yu/256)+6,cp_c.plane);
        if (cp_right && cp_s.tile == 161 && cp_c.plane != 0) { cp_c.plane = 0; continue; }
        if (!cp_right && cp_s.tile == 162 && cp_c.plane == 0) { cp_c.plane = 1; continue; }
        var cp_kind = cp_s.flags & 31;
        // Task 06: THZ1 block $3D/type 5 has a decoded horizontal profile.
        // Its upper half has extent zero and its lower half extent 32. Other
        // type-5 tiles remain bounded as unsupported special dispatches.
        if (cp_kind == 13 && SCR_cc_break13_side(cp_c,cp_s,cp_right)) continue; // $72B6/$72DD; else ordinary projection
        if (cp_kind == 22 && cp_s.tile == 71 && cp_c.zone != 0) {
            // $736B/$7389: side entry has its own attack/state/Y gate, no bounce.
            if (cp_c.state != 15 && cp_c.state != 21 && (cp_c.move & 2) != 0 && cp_c.vy >= 0) SCR_chaos_break16_block(cp_s.index);
            else SCR_cc_project_side(cp_c,cp_s,cp_right);
            continue;
        }
        if (cp_kind == 5 && cp_s.tile >= 60 && cp_s.tile <= 63) {
            // $7306/$7329: blocks $3C/$3D (flags $85, horizontal profile rows 0..15 = none, 16..31 = full) are an ordinary wall; a requested hurt state ($1E) returns without
            // pushing. The damaging side tiles $F4/$F5 do not occur in any THZ layout.
            if (cp_c.next != 30) SCR_cc_project_side(cp_c,cp_s,cp_right);
            continue;
        }
        if (cp_kind == 5 ||
            cp_kind == 19 || (cp_kind == 22 && cp_s.tile != 71) || cp_kind == 30) {
            cp_c.unsupported = cp_kind; // special dispatch not falsely presented as ordinary ROM behaviour
            continue;
        }
        if (SCR_cc_project_side(cp_c,cp_s,cp_right) && cp_kind == 10)
            SCR_cc_spring(cp_c,cp_right ? -1 : 1,cp_s.tile);
    }
}
function SCR_cc_ceiling(cp_c) {
    cp_c.bg &= ~1;
    if (cp_c.support == 0 && ((cp_c.bg & 2) != 0 || cp_c.vy >= 0)) return;
    var cp_y = floor(cp_c.yu/256);
    var cp_s = SCR_cc_lookup(floor(cp_c.xu/256),cp_y-6,cp_c.plane);
    var cp_kind = cp_s.flags & 31;
    if (cp_kind == 13) {
        // $7464: owner clear -> $7898; supported rider -> direct $4984.
        // This branch precedes solid-ceiling projection and never tests rings.
        if (cp_c.support == 0) SCR_cc_break13(cp_s.index);
        else SCR_cc_crush_death(cp_c);
        return;
    }
    if (cp_kind == 28) {
        // $746E: only if the decoded underside is strictly above the player anchor.
        var cp_bottom=(cp_s.ay & 65504)+((cp_s.vertical & 64) != 0 ? (cp_s.vertical & 63) : 32);
        if (cp_bottom >= cp_y) return;
        SCR_cc_ceiling_profile(cp_c,cp_s); return;
    }
    if (cp_kind == 20) { SCR_cc_ceiling_spring(cp_c,cp_s); return; }
    if (cp_kind == 5) { SCR_cc_ceiling_spike(cp_c,cp_s); return; }
    if (cp_kind == 5 || cp_kind == 13 || cp_kind == 19 || cp_kind == 21) {
        cp_c.unsupported = cp_kind; return;
    }
    if ((cp_s.flags & 128) == 0 || (cp_s.ay & 65504) == (cp_y & 65504)) return;
    SCR_cc_ceiling_profile(cp_c,cp_s);
}
function SCR_cc_ceiling_spike(cp_c,cp_s) {
    // $74E7: special ceiling profile, current hurt state keeps projection only.
    var cp_height=cp_s.vertical & 63, cp_local=cp_s.ay & 31;
    if (cp_height == 0 || (cp_height != 32 && (cp_s.vertical & 64) == 0) || cp_height < cp_local) return;
    cp_c.yu=(cp_c.yu+(cp_height-cp_local)*256)&16777215;
    cp_c.bg |= 1; SCR_cc_merge(cp_c);
    if (cp_c.state == 30) return;
    if ((cp_s.tile & 254) == 62 && (cp_c.move & 128) == 0) {
        // Direct $48F7: $D532 == 6 does not suppress this terrain entry.
        cp_c.hazard=1; SCR_cc_hurt_rom(cp_c); return;
    }
    cp_c.vy=256; cp_c.bg &= ~1;
}
function SCR_cc_ceiling_profile(cp_c,cp_s) {
    var cp_value = cp_s.vertical & 63;
    if (cp_value == 0) return;
    if ((cp_s.vertical & 64) == 0) cp_value = 32;
    var cp_local = cp_s.ay & 31;
    if (cp_value < cp_local) return;
    cp_c.yu = (cp_c.yu+(cp_value-cp_local)*256)&16777215;
    cp_c.bg |= 1; SCR_cc_merge(cp_c); cp_c.vy = 256; cp_c.bg &= ~1;
}
function SCR_cc_ceiling_spring(cp_c,cp_s) {
    // $749D: only $3A/$3B; raw profile must be full32 or have bit6, inclusive height.
    if ((cp_s.tile & 254) != 58) return;
    var cp_height=cp_s.vertical & 63, cp_local=cp_s.ay & 31;
    if (cp_height == 0 || (cp_height != 32 && (cp_s.vertical & 64) == 0) || cp_height < cp_local) return;
    cp_c.yu=(cp_c.yu+(cp_height-cp_local)*256)&16777215;
    cp_c.bg |= 1; SCR_cc_merge(cp_c);
    cp_c.vy=1408; cp_c.vx=1024; cp_c.next=27; cp_c.move |= 3; cp_c.sound=2;
}
function SCR_cc_break16_floor(cp_c,cp_s) {
    // $6AE3 attack/state gates, then side-contact or nonnegative Y speed.
    if ((cp_c.move & 2) == 0 || cp_c.state == 15 || cp_c.state == 16 || cp_c.state == 21 || cp_c.state == 26) return;
    if ((cp_c.bg & 12) == 0 && cp_c.vy < 0) return;
    cp_c.vy=-1088; cp_c.move |= 1; cp_c.bg &= ~2; cp_c.contacts &= ~2;
    SCR_chaos_break16_block(cp_s.index);
}
function SCR_cc_shared(cp_c) {
    SCR_cc_input(cp_c);
    if (cp_c.state < 5) cp_c.surface_delta = 0;
    SCR_cc_x(cp_c); SCR_cc_y(cp_c);
    SCR_cc_floor(cp_c);
    if (cp_c.terrain_escape) return; // original loop setter discards the terrain return.
    SCR_cc_sides(cp_c); SCR_cc_ceiling(cp_c); SCR_cc_merge(cp_c);
    if ((cp_c.pressed & 48) != 0) SCR_cc_jump(cp_c);
}
function SCR_cc_state11_enter(cp_c) {
    cp_c.vx = 0; cp_c.vy = 0; cp_c.maximum = 1792; cp_c.next = 17;
    cp_c.move &= ~66;
    cp_c.state11_anim_tick = 0; cp_c.state11_frame = 56;
    cp_c.state11_active = true;
}
// GameMaker hurt adapter: state $1E remains in this core and deliberately
// reuses the ordinary terrain pipeline instead of changing player objects.
function SCR_cc_hurt_enter(cp_c) {
    cp_c.state = 30; cp_c.next = 30; cp_c.hurt_ticks = 30;
    cp_c.vx = (cp_c.player_flags & 16) != 0 ? 288 : -288;
    cp_c.vy = -1024;
    cp_c.input_delta = 0; cp_c.surface_delta = 0;
    cp_c.move = (cp_c.move | 1) & ~2;
    cp_c.bg &= ~2; cp_c.contacts &= ~2;
}
function SCR_cc_hurt_tick(cp_c) {
    SCR_cc_shared(cp_c);
    var cp_grounded = (cp_c.contacts & 2) != 0;
    if (cp_grounded && cp_c.vy >= 0) {
        cp_c.vy = 0;
        cp_c.move &= ~1;
    } else cp_c.move |= 1;
    cp_c.hurt_ticks = max(0,cp_c.hurt_ticks-1);
    if (cp_c.hurt_rom && !cp_grounded) cp_c.next = 30;              // recovered hurt entry ($48F7): the control lock lasts until landing
    else if (cp_c.hurt_ticks > 0) cp_c.next = 30;
    else if (cp_grounded) { SCR_cc_walk(cp_c); cp_c.hurt_rom = false; }
    else { cp_c.next = 14; cp_c.move |= 1; }
}
// Hurt entry $48F7 on the recovered ROM model (docs/platform-spike-collision-audit.md section 4; POC_notes/rom-cache/platform-spike-collision.json hurt_consequences).
// The adapter supplies rings / shield / immune each update and applies the GameMaker side (global rings, scatter object, death object) from the hurt_* result fields.
//   no rings : requested state $1F, Y speed -5.0 ($FB00), X speed unchanged, no invulnerability.
//   rings    : requested state $1E, rings := 0, min(7, tens digit + 1) collectable type-$06 scatter rings (chaos_lr_count; the ROM counter is BCD, never rings >> 4), invulnerability counter $D3B1 := $78 (120), +$03 |= $C1 (bit 7 invulnerable,
//              bit 6, bit 0 airborne), floor flag cleared, Y speed -4.0 (+1.0 when the ceiling flag $D522 bit 0 is set), X speed -1.0 (+1.0 when $D523 bit 3, a left wall).
//              The knockback direction depends only on the left-wall bit, never on which side the hazard was.
// A shield (POC power-up, not a ROM mechanic) is consumed instead of the rings; everything else is the same hurt entry.
function SCR_cc_hurt_rom(cp_c) {
    cp_c.hurt_pending = true; cp_c.hurt_death = false; cp_c.hurt_rings_lost = 0; cp_c.hurt_scatter = 0; cp_c.hurt_shield = false;
    cp_c.support = 0;                                               // the state setter ($476D) releases the platform owner $D3C0
    if (cp_c.rings <= 0 && !cp_c.shield) {
        cp_c.hurt_death = true; cp_c.next = 31; cp_c.vy = -1280;
        return;
    }
    if (cp_c.shield) cp_c.hurt_shield = true;
    else { cp_c.hurt_rings_lost = cp_c.rings; cp_c.hurt_scatter = chaos_lr_count(cp_c.rings); cp_c.rings = 0; }
    cp_c.vy = (cp_c.bg & 1) != 0 ? 256 : -1024;
    cp_c.vx = (cp_c.contacts & 8) != 0 ? 256 : -256;
    cp_c.next = 30; cp_c.invuln = 120; cp_c.move |= 193;
    cp_c.bg &= ~2; cp_c.contacts &= ~2; cp_c.hurt_rom = true; cp_c.hurt_ticks = 0;
    cp_c.input_delta = 0; cp_c.surface_delta = 0;
}
// $4984, reached directly by a supported rider in ceiling surface $0D.
// The owner survives this player pass; state replacement releases it before
// the final object move. No $48F7 ring/shield/invulnerability decision occurs.
function SCR_cc_crush_death(cp_c) {
    cp_c.next=31; cp_c.move |= 1; cp_c.player_flags=0;
    cp_c.vy=-1280; cp_c.bg &= ~2; cp_c.sound=$96;
    cp_c.crush_death=true; cp_c.hurt_pending=true; cp_c.hurt_death=true;
    cp_c.hurt_rings_lost=0; cp_c.hurt_scatter=0; cp_c.hurt_shield=false;
}
// Terrain hazard entry: called by the foot handler $6ACE after it has tested +$03 bit 7 itself. Power-ups that make Sonic immune (POC adapter input) suppress it.
function SCR_cc_terrain_hurt(cp_c) {
    if (cp_c.immune) return;
    cp_c.hazard = 1;
    SCR_cc_hurt_rom(cp_c);
}
// $48BC, once at the end of every player update (docs/player-attack-badnik-audit.md section 5). Priority order:
//   +$03 bit 7 (invulnerable): the counter $D3B1 counts down once per call (120 -> 0); the 121st call clears bits 7/6 and discards the pending request. Nothing else is processed.
//   +$03 bit 6 (hurt / dying): the contact flag $D520 is cleared only.
//   immune ($D532 == 6, invincibility): the request $D3B0 and $D520 are cleared.
//   request $D3B0 != 0: hurt, whatever the attack bit is (type $21 side contact, type $1B top, ...).
//   $D520 == 0: nothing.   $D520 != 0 with the attack bit (+$03 bit 1): rebound by the high nibble of $D521 (above $20: Y speed -3.0; below $10: +0.5 unless the current state is 9;
//   side: none); without the attack bit: hurt.
// Objects write $D520 / $D3B0 AFTER the player's pass (staged by SCR_chaos_attack, promoted by the object phase), so an overlap in update n is consumed in update n+1.
function SCR_cc_damage_gate(cp_c) {
    if ((cp_c.move & 128) != 0) {
        if (cp_c.invuln > 0) cp_c.invuln--;
        else { cp_c.move &= ~192; cp_c.damage_request = 0; }
        cp_c.contact = 0;                                       // adapter simplification: no stale contact survives the invulnerability
        return false;
    }
    if ((cp_c.move & 64) != 0) { cp_c.contact = 0; return false; }
    if (cp_c.immune) { cp_c.damage_request = 0; cp_c.contact = 0; return false; }
    if (cp_c.damage_request != 0) {
        cp_c.damage_request = 0; cp_c.contact = 0;
        SCR_cc_hurt_rom(cp_c);
        return true;
    }
    if (cp_c.contact == 0) return false;
    cp_c.contact = 0;
    if ((cp_c.move & 2) != 0) {
        if ((cp_c.contact_nib & 16) != 0) { if (cp_c.state != 9) cp_c.vy = 128; }
        else if ((cp_c.contact_nib & 32) != 0) { cp_c.vy = -768; cp_c.bg &= ~2; cp_c.contacts &= ~2; cp_c.move |= 1; }   // above: floor flag cleared, airborne set
        return false;
    }
    SCR_cc_hurt_rom(cp_c);
    return true;
}
// Task 06: state $11 callback $3A7C. Coordinates and velocities retain the
// core's integer 16.8 / signed 8.8 representation.
function SCR_cc_state11_tick(cp_c) {
    if ((cp_c.held & 1) != 0) {
        cp_c.vy = SCR_cc_s16(cp_c.vy-64);
        if (cp_c.vy < -768) cp_c.vy = -1024;
    } else if ((cp_c.held & 2) != 0) {
        cp_c.vy = SCR_cc_s16(cp_c.vy+64);
        if (cp_c.vy > 768) cp_c.vy = 1024;
    }
    else if (cp_c.vy > 0) cp_c.vy = max(0,cp_c.vy-32);
    else if (cp_c.vy < 0) cp_c.vy = min(0,cp_c.vy+32);

    // Original 192-line gameplay viewport limits use the integer player
    // anchor, not animated sprite bounds.
    var cp_integer_y = floor(cp_c.yu/256);
    if (cp_integer_y-cp_c.state11_camera_y < 25) {
        cp_c.yu = (cp_c.state11_camera_y+25)*256; cp_c.vy = 0;
    } else if (cp_integer_y-cp_c.state11_camera_y >= 192) {
        cp_c.yu = (cp_c.state11_camera_y+191)*256; cp_c.vy = 0;
    }

    SCR_cc_shared(cp_c); // shared X input, terrain collision, no state-$11 gravity

    // Shared empty-floor handling normally requests state $0E. State $11's
    // own callback remains active until its timer ends and only adopts the
    // grounded/airborne contact representation here.
    if (cp_c.state11_active) {
        cp_c.next = 17;
        if ((cp_c.contacts & 2) != 0) {
            cp_c.move &= ~1;
            if (cp_c.vy > 0) cp_c.vy = 0;
        } else cp_c.move |= 1;
    }

    var cp_phase = cp_c.state11_anim_tick % 24;
    cp_c.state11_frame = cp_phase < 8 ? 56 : (cp_phase < 12 ? 57 :
        (cp_phase < 20 ? 58 : 57));
    cp_c.state11_anim_tick = (cp_c.state11_anim_tick+1) % 24;

    if (!cp_c.state11_active) SCR_cc_fall(cp_c);
}
// Player state $20 (act-clear run), handler $83A6. Input is never read. Y speed is cleared, X speed is raised by $10 per update to
// the $0600 cap, and movement uses the shared terrain pipeline. With d = playerX - cameraX the act-clear flag is set when d reaches
// clear_dx. CANONICAL (SMS, 256 px screen): clear_dx = $121 = 289 (the ROM tests d > $120), which is the default in SCR_cc_new.
// The GameMaker widescreen adapter overrides clear_dx per update with viewWidth + 33 (SCR_chaos_goal: chaos_goal_clear_dx), keeping
// the original relationship "33 px beyond the visible right edge". The canonical $121 is never edited here.
function SCR_cc_state32_tick(cp_c) {
    // The beyond-map adapter (SCR_cc_lookup) is open ONLY for the duration of this state-$20 tick, so no other state, object or frame can see it.
    global.chaosBeyondMapOpen = true; SCR_cc_state32_body(cp_c); global.chaosBeyondMapOpen = false;
}
function SCR_cc_state32_body(cp_c) {
    if (cp_c.act_clear) { cp_c.vx = 0; cp_c.next = 32; return; }
    cp_c.vy = 0; cp_c.player_flags &= ~16; // never mirrored
    var cp_d = floor(cp_c.xu/256) - cp_c.camera_x;
    var cp_hold_y = cp_c.yu; // beyond the canonical map (invisible final pixels) the vertical position is held explicitly
    var cp_beyond = floor(cp_c.xu/256) >= (variable_global_exists("chaosMapWidth") ? global.chaosMapWidth : 128)*32;
    if (cp_d < 0 || cp_d >= cp_c.clear_dx) { cp_c.vx = 0; cp_c.act_clear = true; cp_c.next = 32; return; } // negative d compares as a huge 16-bit value
    if (cp_c.vx < 0) cp_c.vx = 0;
    cp_c.input_delta = (cp_c.vx >> 8) < 6 ? 16 : 0; cp_c.surface_delta = 0; cp_c.maximum = 1536;
    SCR_cc_x(cp_c); SCR_cc_y(cp_c);
    SCR_cc_floor(cp_c); SCR_cc_sides(cp_c); SCR_cc_ceiling(cp_c); SCR_cc_merge(cp_c);
    if (cp_beyond) cp_c.yu = cp_hold_y;
    cp_c.vy = 0; cp_c.next = 32;
}
// Ordinary state wrappers. Animation-script scheduling and special states remain out of scope.
function SCR_cc_tick(cp_c) {
    cp_c.terrain_escape = false;
    cp_c.state = cp_c.next; cp_c.sound = 0; cp_c.unsupported = 0; cp_c.hazard = 0; cp_c.hurt_pending = false; cp_c.crush_death=false;
    if (cp_c.state == 34) { SCR_cc_twist_tick(cp_c); return; }
    if (cp_c.state == 19) { SCR_cc_route19_tick(cp_c); return; }
    if (cp_c.state == 17) { SCR_cc_state11_tick(cp_c); return; }
    if (cp_c.state == 32) { SCR_cc_state32_tick(cp_c); return; }
    if (cp_c.state == 30) { SCR_cc_hurt_tick(cp_c); return; }
    if ((cp_c.state == 7 && (cp_c.contacts & 8) != 0) || (cp_c.state == 8 && (cp_c.contacts & 4) != 0)) {
        SCR_cc_walk(cp_c); return;
    }
    // Crouch -> spin charge ($3759/$4701), release ($39E6/$4719).
    if (cp_c.state == 4 && (cp_c.pressed & 48) != 0) {
        cp_c.vx = 0; cp_c.move = (cp_c.move | 2) & ~64; cp_c.next = 15; return;
    }
    if (cp_c.state == 15) {
        SCR_cc_floor(cp_c); SCR_cc_sides(cp_c); SCR_cc_ceiling(cp_c); SCR_cc_merge(cp_c);
        if ((cp_c.contacts & 8) != 0) cp_c.xu = (cp_c.xu+1024)&16777215;
        else if ((cp_c.contacts & 4) != 0) cp_c.xu = (cp_c.xu-1024)&16777215;
        if ((cp_c.held & 2) == 0) {
            cp_c.maximum = 1792; cp_c.vx = (cp_c.player_flags & 16) != 0 ? -1792 : 1792;
            cp_c.move |= 2; cp_c.next = 16;
        }
        return;
    }
    if (cp_c.state == 10) {
        if ((cp_c.held & 48) == 0) cp_c.jump_ticks = 32;
        else {
            cp_c.jump_ticks = (cp_c.jump_ticks+1)&255;
            if (cp_c.jump_ticks < 14) cp_c.vy = cp_c.water ? -832 : -1088;
        }
    }
    SCR_cc_shared(cp_c);
    if (cp_c.next != cp_c.state) return;
    var cp_speed = abs(cp_c.vx), cp_ground = (cp_c.contacts & 2) != 0;
    if (cp_c.state == 1 || cp_c.state == 2 || cp_c.state == 3 || cp_c.state == 4) {
        if (cp_c.state == 2 && (cp_c.held & 48) != 0) { SCR_cc_jump(cp_c); return; }
        if (cp_c.state != 4 && ((cp_c.state == 1 && cp_c.vx != 0) || (cp_c.held & 12) != 0)) { SCR_cc_walk(cp_c); return; }
        if (cp_c.state == 3 && (cp_c.held & 2) != 0) { cp_c.vx = 0; cp_c.next = 4; cp_c.move &= ~66; return; }
        if (cp_c.state == 3 && (cp_c.held & 1) != 0) return;
        if (cp_c.state == 4 && (cp_c.held & 1) == 0 && (cp_c.held & 2) != 0) return;
        if ((cp_c.held & 1) != 0) { cp_c.vx = 0; cp_c.next = 3; }
        else if ((cp_c.held & 2) != 0) { cp_c.vx = 0; cp_c.next = 4; cp_c.move &= ~66; }
        else if (cp_c.state == 3 || cp_c.state == 4) SCR_cc_stand(cp_c);
    } else if (cp_c.state == 5 || cp_c.state == 6 || cp_c.state == 7 || cp_c.state == 8) {
        if ((cp_c.special&1) != 0 && SCR_cc_strip_suffix(cp_c)) return;
        if ((cp_c.held & 2) != 0 && (cp_c.state == 6 || (cp_c.state == 5 && ((cp_c.vx >> 8)+1 & 255) >= 2))) { SCR_cc_roll(cp_c); return; }
        if (cp_c.state != 6 && (cp_c.held & 12) == 0 && cp_speed < 32 && abs(cp_c.surface_delta) < 24) { SCR_cc_stand(cp_c); return; }
        if (cp_c.state == 5 && !cp_c.water && floor(cp_speed/256) == (cp_c.maximum >> 8)) {
            cp_c.next = 6; cp_c.move &= ~3; return;
        }
        if (cp_c.state == 6 && abs(cp_c.vx >> 8) < 4) { SCR_cc_walk(cp_c); return; }
        if ((cp_c.state == 5 || cp_c.state == 6) && (cp_c.move & 1) == 0 && (cp_c.vx >> 8) != 0 && (cp_c.vx >> 8) != -1) {
            if (cp_c.vx >= 0 && (cp_c.held & 4) != 0) { cp_c.next = 7; cp_c.move &= ~2; }
            if (cp_c.vx < 0 && (cp_c.held & 8) != 0) { cp_c.next = 8; cp_c.move &= ~2; }
        }
        if (cp_c.state == 7 && ((cp_c.contacts & 8) != 0 || ((cp_c.vx < 0) != ((cp_c.held & 8) != 0)))) SCR_cc_walk(cp_c);
        if (cp_c.state == 8 && ((cp_c.contacts & 4) != 0 || ((cp_c.vx < 0) != ((cp_c.held & 8) != 0)))) SCR_cc_walk(cp_c);
    } else if (cp_c.state == 9 || cp_c.state == 16) {
        if (cp_c.vx >= 0 && (cp_c.held & 4) != 0) { if ((cp_c.move & 1) == 0) { cp_c.next = 7; cp_c.move &= ~2; } }
        else if (cp_c.vx < 0 && (cp_c.held & 8) != 0) { if ((cp_c.move & 1) == 0) { cp_c.next = 8; cp_c.move &= ~2; } }
        else if (cp_c.modifier == 0 && cp_speed < 16) {
            if ((cp_c.held & 2) != 0) { cp_c.vx = 0; cp_c.next = 4; cp_c.move &= ~66; }
            else SCR_cc_stand(cp_c);
        }
    } else if (cp_c.state == 27) {
        if (cp_ground) { cp_c.move &= ~1; if (cp_speed < 64) SCR_cc_stand(cp_c); }
    } else if (cp_c.state == 11 || cp_c.state == 28) {
        if (cp_ground) SCR_cc_walk(cp_c);
        else if (cp_c.vy >= 0) SCR_cc_fall(cp_c);
    } else if ((cp_c.state == 10 || cp_c.state == 14 || cp_c.state == 20 || cp_c.state == 29) && cp_ground) SCR_cc_walk(cp_c);
}

// $3EF7 / $3CFC: unsigned 24-bit progress, integer table positions, retained fractions.
function SCR_cc_route19_try(cp_c, cp_previous_block, cp_block) {
    if (cp_block != 82 || cp_previous_block != 87 || cp_c.plane != 0 || (cp_c.bg&2) == 0) return false;
    SCR_cc_route19_enter(cp_c); return true;
}
function SCR_cc_route19_enter(cp_c) {
    cp_c.route_x = floor(cp_c.xu/256)&65504;
    cp_c.route_y = (floor(cp_c.yu/256)&65504)+4;
    cp_c.xu = cp_c.route_x*256+(cp_c.xu&255);
    cp_c.yu = cp_c.route_y*256+(cp_c.yu&255);
    cp_c.route_progress=0; cp_c.next=19; cp_c.terrain_escape=true;
}
function SCR_cc_route19_tick(cp_c) {
    if (!variable_global_exists("chaosRoute19X")) {
        global.chaosRoute19X=SCR_chaos_gpz_loop_x(); global.chaosRoute19Y=SCR_chaos_gpz_loop_y();
    }
    cp_c.route_progress=(cp_c.route_progress+(cp_c.vx&65535))&16777215;
    var cp_progress=cp_c.route_progress>>8;
    cp_c.xu=(((cp_c.route_x+global.chaosRoute19X[cp_progress])&65535)*256)+(cp_c.xu&255);
    cp_c.yu=(((cp_c.route_y+global.chaosRoute19Y[cp_progress])&65535)*256)+(cp_c.yu&255);
    if (cp_progress < 144) {
        if ((cp_c.vx&65535) < 10) {
            cp_c.xu=(cp_c.xu+(floor(cp_c.xu/256)<=cp_c.route_x ? 8 : -2)*256)&16777215;
            cp_c.next=29; cp_c.vy=128; cp_c.move=(cp_c.move|1)&~2;
            cp_c.bg &= ~2; cp_c.contacts &= ~2; return;
        }
        cp_c.vx=SCR_cc_s16(cp_c.vx-10);
    } else { cp_c.plane=1; cp_c.vx=SCR_cc_s16(cp_c.vx+12); }
    // $48BC precedes the success test. The bailout above skips it entirely.
    SCR_cc_damage_gate(cp_c);
    if (cp_progress >= 416) {
        cp_c.next=10; cp_c.vx=0; cp_c.vy=cp_c.maximum; cp_c.move |= 3;
        cp_c.bg &= ~2; cp_c.contacts &= ~2;
    }
}
// Dry walk tests FULL absolute speed equality before strip fall. Run tests the
// signed high byte (left -769 survives; right +1023 does not). Forced idle is inert.
function SCR_cc_strip_suffix(cp_c) {
    if (cp_c.state == 5 && !cp_c.water) {
        if ((abs(cp_c.vx)>>8) == (cp_c.maximum>>8)) { cp_c.next=6; cp_c.move &= ~3; return true; }
        if ((cp_c.special&1) != 0) {
            cp_c.next=20; cp_c.vy=256; cp_c.move=(cp_c.move|1)&~2;
            cp_c.bg &= ~2; cp_c.contacts &= ~2; cp_c.surface_counter=0; return true;
        }
    }
    if (cp_c.state == 6 && abs(cp_c.vx>>8) < 4) { SCR_cc_walk(cp_c); return true; }
    return false;
}
