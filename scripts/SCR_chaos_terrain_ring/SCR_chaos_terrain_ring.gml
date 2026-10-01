// Ordinary terrain-ring collection: the ROM $753E point probe (surface type $07, ring blocks $40..$45), expressed against the POC's extracted
// per-quadrant ring records. Plain numbers only (verification/verify_terrain_ring_probe.js executes this code against the Research fixtures).
// Research: sonic-chaos-reference-work docs/terrain-ring-collection.md, docs/player-animation-counter.md.
//
//   probe X = player anchor X;  probe Y = max(0, anchorY - 8) when bit 0 of the CURRENT +$07 counter is even, max(0, anchorY + 2) when odd
//   (DE = -26 / -16 plus the +18 terrain bias of $7725); block = (probeX >> 5, probeY >> 5) of the 32 px layout; quadrant = ((x>>4)&1) + 2*((y>>4)&1)
//   The probe is a single integer point: no player extents, mask, velocity or state-specific offset. It runs after movement and terrain projection.
//   Not called in the loop states $0C/$0D/$13, twist $22, act-clear $20 and the other states outside the 26-state list.
//   Effect position = the probe point. Only surface $07 is implemented ($1D, $1A, $14 are unresolved in Research and deliberately absent).
function chaos_ring_probe_eligible(cp_state) {
    var cp_list = SCR_chaos_anim_probe_states();
    for (var cp_i = 0; cp_i < array_length(cp_list); cp_i++) if (cp_list[cp_i] == cp_state) return true;
    return false;
}
/// Returns [probeX, probeY] for the update's final anchor and the current counter value.
function chaos_ring_probe_point(cp_anchor_x, cp_anchor_y, cp_counter) {
    return [cp_anchor_x, max(0, cp_anchor_y + (((cp_counter & 1) != 0) ? 2 : -8))];
}
/// Ring records are [index, x, y, block, cell_index, quadrant, ...] with cell_index = row * 128 + column. Returns an array indexed by
/// cell_index * 4 + quadrant holding the record's position in cp_records (or -1).
function chaos_terrain_ring_index(cp_records) {
    var cp_idx = array_create(128 * 64 * 4, -1);
    for (var cp_i = 0; cp_i < array_length(cp_records); cp_i++) cp_idx[cp_records[cp_i][4] * 4 + cp_records[cp_i][5]] = cp_i;
    return cp_idx;
}
/// Record number whose quadrant contains the probe point, or -1 (outside the 128 x 64 layout, or no ring quadrant there).
function chaos_terrain_ring_at(cp_index, cp_px, cp_py) {
    if (cp_px < 0 || cp_py < 0 || (cp_px >> 5) > 127 || (cp_py >> 5) > 63) return -1;
    return cp_index[(((cp_py >> 5) * 128) + (cp_px >> 5)) * 4 + ((cp_px >> 4) & 1) + 2 * ((cp_py >> 4) & 1)];
}
/// The call the player adapter makes once per update AFTER movement, terrain projection and the position adapters: publishes the probe point (or none)
/// for the ring manager. cp_counter is the value returned by SCR_cc_anim_update for this same update.
function chaos_ring_probe_update(cp_c, cp_counter) {
    cp_c.ring_probe_valid = chaos_ring_probe_eligible(cp_c.state);
    if (cp_c.ring_probe_valid) {
        var cp_probe = chaos_ring_probe_point(floor(cp_c.xu / 256), floor(cp_c.yu / 256), cp_counter);
        cp_c.ring_probe_x = cp_probe[0]; cp_c.ring_probe_y = cp_probe[1];
    }
}
