// Shared solid-object contact classification, translated from the original overlap helper $6328 and the projection
// table reached through $5FA0. Plain numbers only, so verification/verify_type10_contact.js executes this shipped code
// against ROM ground truth (verification/type10-contact-fixtures.json).
// All positions are the fixed integer anchors of the player core and of the object; extents are the ROM fields:
// Sonic 8 x 24 ($D52C/$D52D; 9 x 24 only in state $0F), type $10 object 10 x 24 (+$2C/+$2D).
// Result bits (low nibble of object +$21): 1 = player above the box, 2 = player below, 4 = player right of it,
// 8 = player left of it, 0 = no contact. Exactly one bit is kept: the axis with the smaller penetration
// (a horizontal win needs strictly smaller penetration; ties go to the vertical axis).
function SCR_chaos_box_contact(cp_px, cp_py, cp_ox, cp_oy, cp_pex, cp_pey, cp_oex, cp_oey) {
    var cp_dx = cp_px - cp_ox;
    var cp_dy = cp_py - cp_oy;
    var cp_bits = 0;
    var cp_pen_h = 0;
    var cp_pen_v = 0;
    if (cp_dx >= 0) {
        if (cp_dx > 255) return 0;
        cp_pen_h = cp_pex + cp_oex - cp_dx;
        if (cp_pen_h < 0) return 0;
        cp_bits = 4;
    } else {
        var cp_mx = -cp_dx;
        if (cp_mx > 255) return 0;
        cp_pen_h = cp_pex + cp_oex - cp_mx;
        if (cp_pen_h < 0) return 0;
        cp_bits = 8;
    }
    if (cp_dy >= 0) {
        if (cp_dy > 255) return 0;
        cp_pen_v = cp_pey - cp_dy;
        if (cp_pen_v < 0) return 0;
        return (cp_pen_h < cp_pen_v) ? cp_bits : 2;
    }
    var cp_my = -cp_dy;
    if (cp_my > 255) return 0;
    cp_pen_v = cp_oey - cp_my;
    if (cp_pen_v < 0) return 0;
    return (cp_pen_h < cp_pen_v) ? cp_bits : 1;
}

// $5FA0 projection targets for the player anchor. Returns [x, y]; the axis a contact does not move is returned unchanged.
// bit 1 (top): y = oy - oey; bit 2 (bottom): y = oy + pey; bit 4: x = ox + pex + oex; bit 8: x = ox - pex - oex.
function SCR_chaos_box_projection(cp_bits, cp_px, cp_py, cp_ox, cp_oy, cp_pex, cp_pey, cp_oex, cp_oey) {
    if (cp_bits == 1) return [cp_px, cp_oy - cp_oey];
    if (cp_bits == 2) return [cp_px, cp_oy + cp_pey];
    if (cp_bits == 4) return [cp_ox + cp_pex + cp_oex, cp_py];
    if (cp_bits == 8) return [cp_ox - cp_pex - cp_oex, cp_py];
    return [cp_px, cp_py];
}

// Type $27 (flying bee) contact. The active callbacks ($89AC/$89DF/$8A06) call the shared overlap helper $6328 with Sonic 8 x 24 against the
// object's mapping extents 9 x 14 (+$2C/+$2D from frames 1/2), which gives dx -17..+17 and dy -14..+24 inclusive (collision-geometry audit,
// POC_notes/rom-cache/object-27-contact.json). Fixed integer anchors only: no sprite or mask bounds. Returns true on overlap; what an overlap
// DOES (no damage request; attack/power-up converts to $0F) is decided by the caller.
function chaos_type27_contact(cp_px, cp_py, cp_ox, cp_oy) {
    return SCR_chaos_box_contact(cp_px, cp_py, cp_ox, cp_oy, 8, 24, 9, 14) != 0;
}

// Type $09 placed-ring collection ($617E, vectors $0380/$0383): strict proximity on the fixed integer anchors, no player or object extents:
// abs(objectX - playerX) < 12 AND abs(objectY - playerY) < 12 (dx/dy 0..11 collect, 12 fails on either signed axis; POC_notes/rom-cache/object-09-proximity.json).
// Layout (terrain) rings are a different source population ($753E terrain top probe) and do NOT use this test.
function chaos_ring_proximity(cp_px, cp_py, cp_rx, cp_ry) {
    return abs(cp_rx - cp_px) < 12 && abs(cp_ry - cp_py) < 12;
}
