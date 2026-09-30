// Original placement-manager window, translated from the bank-$1C placement scan ($8000..$80B0) and the post-update
// lifetime routine ($61E1). Plain numbers only, so verification/verify_placement_lifecycle.js executes this shipped code
// against the ROM's 32x32 spawn map (verification/placement-spawn-map.json).
//
// Positions are relative to the camera's top-left corner. The map has 16-pixel cells over [-128, 384) on each axis:
//   3 = outside the accepted window (never created; a live placement-backed object out here is removed),
//   2 = outer ring: created on any scan and kept, but asleep (creation bit 6 stays set),
//   1 / 0 = interior: created only during the initial fill ($D440 == 0); an existing object is awake.
function SCR_chaos_spawn_cell(cp_rel_x, cp_rel_y) {
    var cp_cx = floor((cp_rel_x + 128) / 16);
    var cp_cy = floor((cp_rel_y + 128) / 16);
    if (cp_rel_x + 128 < 0 || cp_rel_y + 128 < 0 || cp_cx > 31 || cp_cy > 31) return 3;
    if (cp_cx < 2 || cp_cx > 29 || cp_cy < 2 || cp_cy > 29) return 3;
    if (cp_cx < 6 || cp_cx > 25 || cp_cy < 6 || cp_cy > 25) return 2;
    if (cp_cx < 8 || cp_cx > 23 || cp_cy < 8 || cp_cy > 23) return 1;
    return 0;
}
