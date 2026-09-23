// 14.5: integer ROM movement core. No GameMaker instance or sprite dependencies.
// These functions are also executed unchanged by verification/verify_core.js.
// Units: coordinates 16.8; velocities signed 8.8; ONE original update per call.
function SCR_cc_s16(cp_n) { return ((cp_n + 32768) & 65535) - 32768; }
function SCR_cc_new(cp_x, cp_y) {
    return {xu:round(cp_x*256), yu:round(cp_y*256), vx:0, vy:0,
        state:1, next:1, move:0, bg:0, contacts:0, objects:0, support:0,
        player_flags:0, plane:0, previous:0, tile:255, modifier:0,
        input_delta:0, surface_delta:0, maximum:1024, water:0,
        held:0, pressed:0, jump_ticks:0, sound:0, unsupported:0,
        hazard:0, angle:0, magnitude:0, twist_variant:0, level:0};
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
    var cp_index = (((cp_ay >> 5) & 127)*128 + ((cp_ax >> 5) & 255));
    var cp_address = (49153 + cp_index) & 65535;
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
    var cp_raw = cp_s.vertical;
    var cp_mod = cp_s.modifier;
    if ((cp_solid && (cp_raw & 63) == 32) || (!cp_solid && (cp_raw & 63) == 0)) {
        if (cp_s.index >= 128) {
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
function SCR_cc_spring(cp_c, cp_kind, cp_tile) {
    if (cp_c.state == 17) return;
    if (cp_kind == 9 || cp_kind == 20) {
        if ((cp_c.bg & 2) == 0) return;
        if (cp_kind == 20) cp_c.vx = cp_tile >= 56 ? -1024 : 1024;
        if (cp_c.vy < 0) return;
        cp_c.vy = cp_kind == 9 ? -1920 : -1792; // THZ, D297=0
        cp_c.next = cp_kind == 9 ? 11 : 28;
        cp_c.move = cp_kind == 9 ? ((cp_c.move | 1) & ~2) : (cp_c.move | 3);
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
function SCR_cc_floor(cp_c) {
    var cp_old_mod = cp_c.modifier; cp_c.modifier = 0;
    var cp_dy = cp_c.state == 33 ? -14 : (cp_c.state == 18 ? 8 : 0);
    var cp_s = SCR_cc_lookup(floor(cp_c.xu/256),floor(cp_c.yu/256)+18+cp_dy,cp_c.plane);
    cp_c.tile = cp_s.tile;
    SCR_cc_project_floor(cp_c,cp_s);
    cp_c.previous = cp_s.flags;
    var cp_kind = cp_s.flags & 31;
    if (cp_kind == 18) SCR_cc_ramp(cp_c,cp_old_mod,cp_s.tile);
    else if (cp_kind == 5) {
        // $6ACE: ordinary floor hazards act only after floor contact. Tiles
        // $F4/$F5 are exempt in the original handler.
        if ((cp_s.tile & 254) != 244 && (cp_c.bg & 2) != 0 &&
            (cp_c.player_flags & 128) == 0) cp_c.hazard = 1;
    }
    else if (cp_kind == 9 || cp_kind == 20) SCR_cc_spring(cp_c,cp_kind,cp_s.tile);
    else if (cp_kind == 23) SCR_cc_twist_enter(cp_c,cp_s.tile);
    else if (cp_kind == 0 || cp_kind == 6 || cp_kind == 7) {
        // $6C45/$6C4D: empty floor can request falling even when projection returned early.
        if ((cp_c.objects & 32) == 0) cp_c.bg &= ~2;
        SCR_cc_merge(cp_c);
        if ((cp_c.contacts & 2) == 0 && (cp_c.move & 1) == 0) {
            if (cp_c.state == 9) { cp_c.next = 10; cp_c.vy = 0; cp_c.move |= 3; cp_c.bg &= ~2; }
            else SCR_cc_fall(cp_c);
        }
    } else if (cp_kind != 1 && cp_kind != 2 && cp_kind != 3 && cp_kind != 4 &&
               cp_kind != 10 && cp_kind != 15 && cp_kind != 17 && cp_kind != 21 &&
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
        if (cp_kind == 5 || cp_kind == 13 || cp_kind == 19 || cp_kind == 22 || cp_kind == 30) {
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
    if (cp_kind == 5 || cp_kind == 13 || cp_kind == 19 || cp_kind == 20 || cp_kind == 21 || cp_kind == 28) {
        cp_c.unsupported = cp_kind; return;
    }
    if ((cp_s.flags & 128) == 0 || (cp_s.ay & 65504) == (cp_y & 65504)) return;
    var cp_value = cp_s.vertical & 63;
    if (cp_value == 0) return;
    if ((cp_s.vertical & 64) == 0) cp_value = 32;
    var cp_local = cp_s.ay & 31;
    if (cp_value < cp_local) return;
    cp_c.yu = (cp_c.yu+(cp_value-cp_local)*256)&16777215;
    cp_c.bg |= 1; SCR_cc_merge(cp_c); cp_c.vy = 256; cp_c.bg &= ~1;
}
function SCR_cc_shared(cp_c) {
    SCR_cc_input(cp_c);
    if (cp_c.state < 5) cp_c.surface_delta = 0;
    SCR_cc_x(cp_c); SCR_cc_y(cp_c);
    SCR_cc_floor(cp_c); SCR_cc_sides(cp_c); SCR_cc_ceiling(cp_c); SCR_cc_merge(cp_c);
    if ((cp_c.pressed & 48) != 0) SCR_cc_jump(cp_c);
}
// Ordinary state wrappers. Animation-script scheduling and special states remain out of scope.
function SCR_cc_tick(cp_c) {
    cp_c.state = cp_c.next; cp_c.sound = 0; cp_c.unsupported = 0; cp_c.hazard = 0;
    if (cp_c.state == 34) { SCR_cc_twist_tick(cp_c); return; }
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
    } else if ((cp_c.state == 10 || cp_c.state == 14) && cp_ground) SCR_cc_walk(cp_c);
}
