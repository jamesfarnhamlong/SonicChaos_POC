/// Shared level-selection helpers. THZ1 behaviour is unchanged; THZ2 reuses the same core.
function chaos_in_level() { return room == ROM_chaos_thz1 || room == ROM_chaos_thz2; }
function chaos_is_thz2() { return room == ROM_chaos_thz2; }

/// DEV_SPAWN / UNVERIFIED - GameMaker-only playable spawn, NOT canonical level data.
/// The package start words (SCR_chaos_thz2_start, raw $D511/$D514 = 110,398) have unresolved
/// field meanings, so no THZ1-derived offset is applied; the dev spawn just uses the raw values.
#macro CHAOS_THZ2_DEV_SPAWN_X 110
#macro CHAOS_THZ2_DEV_SPAWN_Y 398

/// Developer route: THZ2 replaces the THZ1 layout in the shared collision array.
function chaos_level_install_layout() {
    if (!chaos_is_thz2()) return;
    var cp_ids = SCR_chaos_thz2_tile_ids();
    global.chaosSourceTileIds = cp_ids;
    global.chaosTileIds = array_create(array_length(cp_ids), 0);
    array_copy(global.chaosTileIds, 0, cp_ids, 0, array_length(cp_ids));
    global.chaosBrokenCells = [];
}

/// -thz2 on the command line launches THZ2 directly from the zone-goto route.
function chaos_dev_thz2_requested() {
    for (var cp_i = 1; cp_i <= parameter_count(); cp_i++) {
        if (parameter_string(cp_i) == "-thz2") return true;
    }
    return false;
}

/// Generic canonical object loader. Rows come from the research package (SCR_chaos_thz2_objects: index, x, y, type, flags,
/// parameter, aux0, aux1, ROM offset, source class); nothing is placed in the room. Every supported type is dispatched from
/// its raw record; each instance keeps its placement provenance (chaosPlacement*). Unsupported types are counted, never guessed.
/// Type $09 is deliberately not instantiated here: the ring manager owns those records (SCR_chaos_thz2_type09).
function chaos_level_object_rows() {
    if (chaos_is_thz2()) return SCR_chaos_thz2_objects();
    return []; // THZ1 objects remain the accepted room-authored instances (the row format is identical for a future THZ1 table)
}

function chaos_level_spawn_objects() {
    global.chaosSpawnedByType = array_create(256, 0);
    global.chaosSkippedByType = array_create(256, 0);
    global.chaosSpawnedIndices = [];
    var cp_rows = chaos_level_object_rows();
    for (var cp_i = 0; cp_i < array_length(cp_rows); cp_i++) {
        var cp_r = cp_rows[cp_i];
        var cp_type = cp_r[3];
        var cp_inst = noone;
        switch (cp_type) {
            case $09: break; // ring manager
            case $10: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_10); chaos_type10_configure(cp_inst, cp_r[5]); break;
            case $18: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_18); break;
            case $21: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_21); chaos_type21_configure(cp_inst, cp_r[5]); break;
            case $26: cp_inst = chaos_spawn_type26(cp_r); break;
            case $27: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_27); break;
            case $28: cp_inst = chaos_spawn_type28(cp_r); break;
            default: global.chaosSkippedByType[cp_type]++; break;
        }
        if (cp_inst != noone) {
            cp_inst.chaosPlacementIndex = cp_r[0];
            cp_inst.chaosPlacementRom = cp_r[8];
            cp_inst.chaosSourceClass = cp_r[9];
            cp_inst.chaosPlacementFlags = cp_r[4];
            global.chaosSpawnedByType[cp_type]++;
            array_push(global.chaosSpawnedIndices, cp_r[0]);
        }
    }
}

/// Type $10: the canonical parameter selects the graphics resource (numeric selectors only) and the reward branch in
/// SCR_chaos_type10_reward. The THZ1 Create event still derives its parameter from THZ1 coordinates; this overrides it.
function chaos_type10_configure(cp_inst, cp_param) {
    cp_inst.chaosParameter = cp_param;
    cp_inst.chaosGraphicsSelector = cp_param;
    switch (cp_param) {
        case $03: cp_inst.sprite_index = SPR_chaos_object_10_03; break;
        case $04: cp_inst.sprite_index = SPR_chaos_object_10_04; break;
        case $06: cp_inst.sprite_index = SPR_chaos_object_10_06; break;
        default: cp_inst.sprite_index = SPR_chaos_object_10; break; // selector $02 art (the accepted default resource)
    }
}

/// Type $21: parameter * 16 is the leftward patrol span (docs/object-21.md).
function chaos_type21_configure(cp_inst, cp_param) {
    cp_inst.chaosParameter = cp_param;
    cp_inst.chaosLeftBound = cp_inst.chaosOriginX - (cp_param << 4);
}

/// Type $26 from a canonical row. Parameter bit 7 = span mode with width (parameter & $7F) * 16; without bit 7 the
/// parameter is the strength ($00 strong, $01 weak). Span strength comes from aux1 (zero = strong), never from the parameter.
function chaos_spawn_type26(cp_r) {
    var cp_param = cp_r[5];
    var cp_object = noone;
    if ((cp_param & $80) != 0) cp_object = OBJ_chaos_object_spring_26_span;
    else if (cp_param == $00) cp_object = OBJ_chaos_object_spring_26_normal;
    else if (cp_param == $01) cp_object = OBJ_chaos_object_spring_26_weak;
    if (cp_object == noone) return noone; // undecoded parameter: never guessed
    var cp_inst = instance_create(cp_r[1], cp_r[2], cp_object);
    if ((cp_param & $80) != 0) {
        cp_inst.chaosSpan = (cp_param & $7F) * 16;
        if (cp_r[7] == 0) { cp_inst.chaosParameter = 0; cp_inst.launch_y = -7.375; }
    }
    return cp_inst;
}

/// Type $28 from a canonical row. Existing THZ1 platform behaviour is reused (1 pixel/update, first leg up). Parameter $0A =
/// vertical mover with reversal period 16 * aux1 updates; parameter $84 = the sag/bob platform (chaosTravel 0).
function chaos_spawn_type28(cp_r) {
    var cp_travel = -1;
    if (cp_r[5] == $0A) cp_travel = 16 * cp_r[7];
    else if (cp_r[5] == $84) cp_travel = 0;
    if (cp_travel < 0) return noone;
    var cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_platform);
    cp_inst.chaosTravel = cp_travel; // the THZ1 Create event keys travel off THZ1 X values; canonical aux1 replaces it
    return cp_inst;
}

/// Loop centres/rows/planes from the active canonical layout (both levels). THZ1 yields exactly the values that were
/// previously hard-coded ([2368,2880], [416,512]); THZ2 yields its own loops.
function chaos_level_apply_loops() {
    var cp_loops = SCR_chaos_loop_layout(global.chaosTileIds);
    global.chaosLoopCenters = cp_loops.centers;
    global.chaosLoopRows = cp_loops.rows;
    global.chaosLoopPlanes = array_create(array_length(cp_loops.centers), 0);
}

/// The Sonic Chaos act table: the single source for the data-select screen. The saved zone code (zoneGoto, 1-based)
/// indexes this list, so the card title, icon and the room START launches all come from one entry. Adding THZ3 later means
/// adding one entry here (and its room resource). Icon frames index SPR_data_zones; no Sonic Chaos preview art exists yet, so
/// the entries share the existing palm-tree frame (presentation TODO).
function chaos_acts() {
    return [
        {zone: "THZ", act: 1, room: ROM_chaos_thz1, name: "Turquoise Hill 1", icon: 1},
        {zone: "THZ", act: 2, room: ROM_chaos_thz2, name: "Turquoise Hill 2", icon: 1}
    ];
}
function chaos_act_count() { return array_length(chaos_acts()); }
/// Codes are 1-based. saved zoneGoto = actual progression; global.selectedAct = the highlighted / played act. Both index
/// chaos_acts() and are always clamped into it, so nothing can resolve past the last implemented entry.
function chaos_act_clamp(cp_code) { return clamp(cp_code, 1, chaos_act_count()); }
function chaos_act_entry(cp_code) { return chaos_acts()[chaos_act_clamp(cp_code) - 1]; }
/// Step the highlighted act by +1 / -1 with wrap.
function chaos_act_step(cp_code, cp_delta) {
    var cp_count = chaos_act_count();
    return ((chaos_act_clamp(cp_code) - 1 + cp_delta + cp_count) mod cp_count) + 1;
}
/// Saved progression after finishing act cp_played: never goes backwards, never past the last implemented entry.
function chaos_act_progress(cp_saved, cp_played) {
    return chaos_act_clamp(max(chaos_act_clamp(cp_saved), chaos_act_clamp(cp_played) + 1));
}
