// Original placement-manager window, translated from the bank-$1C placement scan ($8000..$80B0) and the post-update
// lifetime routine ($61E1). Plain numbers only, so verification/verify_placement_lifecycle.js executes this shipped code
// against the ROM's 32x32 spawn map (verification/placement-spawn-map.json).
//
// The ROM map has 16-pixel cells over [-128, 384) on each axis, relative to a 256 px window. Those bands are viewport-relative
// (class D), so they are expressed through the shared adapter (SCR_chaos_viewport) against the REAL view width: the left bands
// hang off LEFT, the right bands off RIGHT. Canonical object anchors are never moved. On a 256 px view this equals the ROM map
// cell for cell (proved by verification/verify_placement_lifecycle.js and verify_viewport_adapter.js).
//   3 = outside the accepted window (never created; a live placement-backed object out here is removed),
//   2 = outer ring: created on any scan and kept, but asleep (creation bit 6 stays set),
//   1 / 0 = interior: created only during the initial fill ($D440 == 0); an existing object is awake.
function SCR_chaos_spawn_cell(cp_vp, cp_world_x, cp_world_y) {
    return chaos_vp_lifecycle_cell(cp_vp, cp_world_x, cp_world_y);
}

/// Placement scan ($8000, once per 4th update) for a record whose occupancy byte is clear. cp_o carries chaosScanTick and
/// chaosInitialFillDone. Returns true when the record is created this update: cell 2 (outer ring) on any scan, cells 0/1 only during the
/// initial fill. Shared by every mapped-object type that uses the generic lifecycle ($10, $21, $27).
function SCR_chaos_placement_scan(cp_o, cp_vp, cp_world_x, cp_world_y) {
    var cp_due = (cp_o.chaosScanTick mod 4) == 0;
    cp_o.chaosScanTick++;
    if (!cp_due) return false;
    var cp_cell = SCR_chaos_spawn_cell(cp_vp, cp_world_x, cp_world_y);
    var cp_fill = !cp_o.chaosInitialFillDone;
    cp_o.chaosInitialFillDone = true; // $D440 is set once the first pass completes
    var cp_create = (cp_cell == 2 || (cp_cell < 2 && cp_fill));
    if (cp_create) cp_o.chaosWoken = false; // a (re)created object has not been awake yet: entry stays canonical
    return cp_create;
}

/// Lifetime cell of an existing object ($61E1) with the widescreen retention adapter (chaos_vp_retained_cell). Marks the object as woken as
/// soon as it is awake, which is what arms the extended retention. Used by every migrated mapped-object type ($10, $21, $27).
function SCR_chaos_lifetime_cell(cp_o, cp_vp, cp_world_x, cp_world_y) {
    var cp_cell = chaos_vp_retained_cell(cp_vp, cp_world_x, cp_world_y, !cp_o.chaosAsleep, cp_o.chaosWoken);
    if (cp_cell <= 1) cp_o.chaosWoken = true;
    return cp_cell;
}

/// $2C shares $27 callbacks, but the existing THZ retention adapter stays opt-in.
function chaos_flying_lifetime_cell(cp_o, cp_vp, cp_x, cp_y) {
    if (cp_o.chaosCanonicalLifecycle) return SCR_chaos_spawn_cell(cp_vp,cp_x,cp_y);
    return SCR_chaos_lifetime_cell(cp_o,cp_vp,cp_x,cp_y);
}
