function chaos_aqz_act() {
    if (room == ROM_chaos_aqz1) return 1;
    if (room == ROM_chaos_aqz2) return 2;
    if (room == ROM_chaos_aqz3) return 3;
    return 0;
}
function chaos_is_aqz() { return chaos_aqz_act() != 0; }
function chaos_aqz_start() {
 switch (chaos_aqz_act()) { case 1: return SCR_chaos_aqz1_start(); case 2: return SCR_chaos_aqz2_start(); case 3: return SCR_chaos_aqz3_start(); } return [0,0];
}
function chaos_aqz_camera() {
 switch (chaos_aqz_act()) { case 1: return SCR_chaos_aqz1_camera(); case 2: return SCR_chaos_aqz2_camera(); case 3: return SCR_chaos_aqz3_camera(); } return [0,0];
}
function chaos_aqz_bounds() { switch (chaos_aqz_act()) { case 1:return SCR_chaos_aqz1_bounds();case 2:return SCR_chaos_aqz2_bounds();case 3:return SCR_chaos_aqz3_bounds(); } return [0,8,0,0]; }
function chaos_sez_act() {
    if (room == ROM_chaos_sez1) return 1;
    if (room == ROM_chaos_sez2) return 2;
    if (room == ROM_chaos_sez3) return 3;
    return 0;
}
function chaos_is_sez() { return chaos_sez_act() != 0; }
function chaos_sez_start() {
 switch (chaos_sez_act()) { case 1: return SCR_chaos_sez1_start(); case 2: return SCR_chaos_sez2_start(); case 3: return SCR_chaos_sez3_start(); } return [0,0];
}
function chaos_sez_camera() {
 switch (chaos_sez_act()) { case 1: return SCR_chaos_sez1_camera(); case 2: return SCR_chaos_sez2_camera(); case 3: return SCR_chaos_sez3_camera(); } return [0,0];
}
function chaos_mghz_act() {
    if (room == ROM_chaos_mghz1) return 1;
    if (room == ROM_chaos_mghz2) return 2;
    if (room == ROM_chaos_mghz3) return 3;
    return 0;
}
function chaos_is_mghz() { return chaos_mghz_act() != 0; }
function chaos_mghz_start() {
 switch (chaos_mghz_act()) { case 1: return SCR_chaos_mghz1_start(); case 2: return SCR_chaos_mghz2_start(); case 3: return SCR_chaos_mghz3_start(); } return [0,0];
}
function chaos_mghz_camera() {
 switch (chaos_mghz_act()) { case 1: return SCR_chaos_mghz1_camera(); case 2: return SCR_chaos_mghz2_camera(); case 3: return SCR_chaos_mghz3_camera(); } return [0,0];
}
/// Shared level-selection helpers. THZ1 behaviour is unchanged; THZ2 reuses the same core.
function chaos_in_level() { return room == ROM_chaos_thz1 || room == ROM_chaos_thz2 || room == ROM_chaos_thz3 || chaos_is_gpz() || chaos_is_mghz() || chaos_is_sez() || chaos_is_aqz(); }
function chaos_gpz_act() {
    if (room == ROM_chaos_gpz1) return 1;
    if (room == ROM_chaos_gpz2) return 2;
    if (room == ROM_chaos_gpz3) return 3;
    return 0;
}
function chaos_is_gpz() { return chaos_gpz_act() != 0; }
function chaos_gpz_start() {
    switch (chaos_gpz_act()) { case 1: return SCR_chaos_gpz1_start(); case 2: return SCR_chaos_gpz2_start(); case 3: return SCR_chaos_gpz3_start(); }
    return [0,0];
}
function chaos_gpz_camera() {
    switch (chaos_gpz_act()) { case 1: return SCR_chaos_gpz1_camera(); case 2: return SCR_chaos_gpz2_camera(); case 3: return SCR_chaos_gpz3_camera(); }
    return [0,0];
}
function chaos_level_terrain_rings() {
 switch (chaos_aqz_act()) { case 1:return SCR_chaos_aqz1_terrain_rings();case 2:return SCR_chaos_aqz2_terrain_rings();case 3:return SCR_chaos_aqz3_terrain_rings(); }
 switch (chaos_sez_act()) { case 1: return SCR_chaos_sez1_terrain_rings(); case 2: return SCR_chaos_sez2_terrain_rings(); case 3: return SCR_chaos_sez3_terrain_rings(); }
 switch (chaos_mghz_act()) { case 1: return SCR_chaos_mghz1_terrain_rings(); case 2: return SCR_chaos_mghz2_terrain_rings(); case 3: return SCR_chaos_mghz3_terrain_rings(); }
    switch (chaos_gpz_act()) { case 1: return SCR_chaos_gpz1_terrain_rings(); case 2: return SCR_chaos_gpz2_terrain_rings(); case 3: return SCR_chaos_gpz3_terrain_rings(); }
    return chaos_is_thz3() ? SCR_chaos_thz3_terrain_rings() : (chaos_is_thz2() ? SCR_chaos_thz2_terrain_rings() : SCR_chaos_ring_data());
}
function chaos_level_type09() {
 switch (chaos_aqz_act()) { case 1:return SCR_chaos_aqz1_type09();case 2:return SCR_chaos_aqz2_type09();case 3:return SCR_chaos_aqz3_type09(); }
 switch (chaos_sez_act()) { case 1: return SCR_chaos_sez1_type09(); case 2: return SCR_chaos_sez2_type09(); case 3: return SCR_chaos_sez3_type09(); }
 switch (chaos_mghz_act()) { case 1: return SCR_chaos_mghz1_type09(); case 2: return SCR_chaos_mghz2_type09(); case 3: return SCR_chaos_mghz3_type09(); }
    switch (chaos_gpz_act()) { case 1: return SCR_chaos_gpz1_type09(); case 2: return SCR_chaos_gpz2_type09(); case 3: return SCR_chaos_gpz3_type09(); }
    return chaos_is_thz3() ? SCR_chaos_thz3_type09() : (chaos_is_thz2() ? SCR_chaos_thz2_type09() : SCR_chaos_type09_data());
}
function chaos_is_thz2() { return room == ROM_chaos_thz2; }
function chaos_is_thz3() { return room == ROM_chaos_thz3; }

/// DEV_SPAWN / UNVERIFIED - GameMaker-only playable spawn, NOT canonical level data.
/// The package start words (SCR_chaos_thz2_start, raw $D511/$D514 = 110,398) have unresolved
/// field meanings, so no THZ1-derived offset is applied; the dev spawn just uses the raw values.
#macro CHAOS_THZ2_DEV_SPAWN_X 110
#macro CHAOS_THZ2_DEV_SPAWN_Y 398
/// THZ3: the package start words (SCR_chaos_thz3_start, raw $D511/$D514 = 110,224) are equally unresolved; same DEV_SPAWN / UNVERIFIED treatment.
#macro CHAOS_THZ3_DEV_SPAWN_X 110
#macro CHAOS_THZ3_DEV_SPAWN_Y 224

/// Developer route: THZ2 replaces the THZ1 layout in the shared collision array.
function chaos_level_install_layout() {
    // ROM row stride = map width: 128 in THZ1 / THZ2, 80 in THZ3 (SCR_cc_lookup, ring probe and loop layout read it).
    global.chaosMapWidth = chaos_is_thz3() ? SCR_chaos_thz3_map_width() : 128;
    global.chaosConsumedPlatforms = [];
    if (chaos_is_aqz()) {
        var cp_ids;
        switch (chaos_aqz_act()) {
            case 1: global.chaosMapWidth = SCR_chaos_aqz1_map_width(); cp_ids = SCR_chaos_aqz1_tile_ids(); SCR_chaos_aqz1_profiles(); break;
            case 2: global.chaosMapWidth = SCR_chaos_aqz2_map_width(); cp_ids = SCR_chaos_aqz2_tile_ids(); SCR_chaos_aqz2_profiles(); break;
            case 3: global.chaosMapWidth = SCR_chaos_aqz3_map_width(); cp_ids = SCR_chaos_aqz3_tile_ids(); SCR_chaos_aqz3_profiles(); break;
        }
        global.chaosSourceTileIds = cp_ids;
        global.chaosTileIds = array_create(array_length(cp_ids),0);
        array_copy(global.chaosTileIds,0,cp_ids,0,array_length(cp_ids));
        global.chaosBrokenCells = [];
        global.chaosS2 = chaos_s2_new(); // S2: the layout reload restores every $AF and the level clear ($297E) zeroes the remembered cell $D356 and the object slots
        global.chaosSez54 = noone;       // S5: the boss controller (placement record, camera limits) is rebuilt by chaos_level_spawn_objects
        global.chaosAqzEnv=chaos_aqz_env_new(chaos_aqz_act());
        chaos_aqz_create_water(global.chaosAqzEnv,global.chaosS2);
        return;
    }
    if (chaos_is_sez()) {
        var cp_ids;
        switch (chaos_sez_act()) {
            case 1: global.chaosMapWidth = SCR_chaos_sez1_map_width(); cp_ids = SCR_chaos_sez1_tile_ids(); SCR_chaos_sez1_profiles(); break;
            case 2: global.chaosMapWidth = SCR_chaos_sez2_map_width(); cp_ids = SCR_chaos_sez2_tile_ids(); SCR_chaos_sez2_profiles(); break;
            case 3: global.chaosMapWidth = SCR_chaos_sez3_map_width(); cp_ids = SCR_chaos_sez3_tile_ids(); SCR_chaos_sez3_profiles(); break;
        }
        global.chaosSourceTileIds = cp_ids;
        global.chaosTileIds = array_create(array_length(cp_ids),0);
        array_copy(global.chaosTileIds,0,cp_ids,0,array_length(cp_ids));
        global.chaosBrokenCells = [];
        global.chaosS2 = chaos_s2_new(); // S2: the layout reload restores every $AF and the level clear ($297E) zeroes the remembered cell $D356 and the object slots
        global.chaosSez54 = noone;       // S5: the boss controller (placement record, camera limits) is rebuilt by chaos_level_spawn_objects
        return;
    }
    if (chaos_is_mghz()) {
        var cp_ids;
        switch (chaos_mghz_act()) {
            case 1: global.chaosMapWidth = SCR_chaos_mghz1_map_width(); cp_ids = SCR_chaos_mghz1_tile_ids(); SCR_chaos_mghz1_profiles(); break;
            case 2: global.chaosMapWidth = SCR_chaos_mghz2_map_width(); cp_ids = SCR_chaos_mghz2_tile_ids(); SCR_chaos_mghz2_profiles(); break;
            case 3: global.chaosMapWidth = SCR_chaos_mghz3_map_width(); cp_ids = SCR_chaos_mghz3_tile_ids(); SCR_chaos_mghz3_profiles(); break;
        }
        global.chaosSourceTileIds = cp_ids;
        global.chaosTileIds = array_create(array_length(cp_ids),0);
        array_copy(global.chaosTileIds,0,cp_ids,0,array_length(cp_ids));
        global.chaosBrokenCells = [];
        return;
    }
    if (chaos_is_gpz()) {
        var cp_ids;
        switch (chaos_gpz_act()) {
            case 1: global.chaosMapWidth = SCR_chaos_gpz1_map_width(); cp_ids = SCR_chaos_gpz1_tile_ids(); SCR_chaos_gpz1_profiles(); break;
            case 2: global.chaosMapWidth = SCR_chaos_gpz2_map_width(); cp_ids = SCR_chaos_gpz2_tile_ids(); SCR_chaos_gpz2_profiles(); break;
            case 3: global.chaosMapWidth = SCR_chaos_gpz3_map_width(); cp_ids = SCR_chaos_gpz3_tile_ids(); SCR_chaos_gpz3_profiles(); break;
        }
        global.chaosSourceTileIds = cp_ids;
        global.chaosTileIds = array_create(array_length(cp_ids),0);
        array_copy(global.chaosTileIds,0,cp_ids,0,array_length(cp_ids));
        global.chaosBrokenCells = [];
        return;
    }
    if (!chaos_is_thz2() && !chaos_is_thz3()) return;
    var cp_ids = chaos_is_thz3() ? SCR_chaos_thz3_tile_ids() : SCR_chaos_thz2_tile_ids();
    global.chaosSourceTileIds = cp_ids;
    global.chaosTileIds = array_create(array_length(cp_ids), 0);
    array_copy(global.chaosTileIds, 0, cp_ids, 0, array_length(cp_ids));
    global.chaosBrokenCells = [];
}

/// Legacy -thz2 shortcut opens the developer selector from zone-goto.
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
 switch (chaos_aqz_act()) { case 1:return SCR_chaos_aqz1_objects();case 2:return SCR_chaos_aqz2_objects();case 3:return SCR_chaos_aqz3_objects(); }
 switch (chaos_sez_act()) { case 1: return SCR_chaos_sez1_objects(); case 2: return SCR_chaos_sez2_objects(); case 3: return SCR_chaos_sez3_objects(); }
 switch (chaos_mghz_act()) { case 1: return SCR_chaos_mghz1_objects(); case 2: return SCR_chaos_mghz2_objects(); case 3: return SCR_chaos_mghz3_objects(); }
    switch (chaos_gpz_act()) { case 1: return SCR_chaos_gpz1_objects(); case 2: return SCR_chaos_gpz2_objects(); case 3: return SCR_chaos_gpz3_objects(); }
    if (chaos_is_thz2()) return SCR_chaos_thz2_objects();
    if (chaos_is_thz3()) return SCR_chaos_thz3_objects();
    return []; // THZ1 objects remain the accepted room-authored instances (the row format is identical for a future THZ1 table)
}

function chaos_level_spawn_objects() {
    if (chaos_is_mghz()) global.chaosM3=chaos_m3_new();
    global.chaosSpawnedByType = array_create(256, 0);
    global.chaosSkippedByType = array_create(256, 0);
    global.chaosSpawnedIndices = [];
    global.chaosSezEnemies = [];   // S4 enemy records: a room (re)start rebuilds them, so defeated placements return only with the act
    global.chaosSez54 = noone;     // S5: the SEZ3 boss controller exists only when the act's record is registered below
    var cp_rows = chaos_level_object_rows();
    for (var cp_i = 0; cp_i < array_length(cp_rows); cp_i++) {
        var cp_r = cp_rows[cp_i];
        var cp_type = cp_r[3];
        if (chaos_is_mghz() && (cp_type == $57 || cp_type == $58 || (cp_type == $56 && chaos_mghz_act() != 3))) { global.chaosSkippedByType[cp_type]++; continue; } // $57/$58 exist only as script children of $56
        if (chaos_is_sez() && (cp_type == $20 || cp_type == $23)) {
            // S4: mapped enemies are struct records driven by SCR_chaos_sez_enemy (placement scan, occupancy and defeat retention live in the record).
            chaos_sez_enemy_register(cp_r); global.chaosSpawnedByType[cp_type]++; array_push(global.chaosSpawnedIndices,cp_r[0]); continue;
        }
        if (chaos_is_sez() && cp_type == $54) {
            // S5: the mapped boss is a script slot of the shared 19-slot scheduler (SCR_chaos_sez_boss); the scan creates it, nothing is placed as a GameMaker instance.
            chaos_54_register(cp_r); global.chaosSpawnedByType[cp_type]++; array_push(global.chaosSpawnedIndices,cp_r[0]); continue;
        }
        if (chaos_is_sez() && (cp_type == $13 || cp_type == $55 || (cp_type == $28 && cp_r[5] != $83 && cp_r[5] != $84 && cp_r[5] != $86 && cp_r[5] != $04))) { global.chaosSkippedByType[cp_type]++; continue; } // pending: no speculative runtime ($13 is never placed: S2 creates it only from the surface-$0C floor handler, SCR_chaos_sez_s2)
        if (chaos_is_aqz() && (cp_type == $3C || cp_type == $3D)) {
            chaos_aqz_enemy_register(cp_r);global.chaosSpawnedByType[cp_type]++;array_push(global.chaosSpawnedIndices,cp_r[0]);continue;
        }
        if (chaos_is_aqz() && cp_type == $0C) {
            array_push(global.chaosAqzEnv.emitters,{record:cp_r,occupied:false,slot:-1,chaosScanTick:0,chaosInitialFillDone:false});
            global.chaosSpawnedByType[cp_type]++;array_push(global.chaosSpawnedIndices,cp_r[0]);continue;
        }
        var cp_inst = noone;
        switch (cp_type) {
            case $24:
            case $2E:
                if (chaos_is_mghz()) {
                    chaos_m3_record(global.chaosM3,cp_r,noone);
                    global.chaosSpawnedByType[cp_type]++;
                    array_push(global.chaosSpawnedIndices,cp_r[0]);
                }
                break;
            case $09: break; // ring manager
            case $10: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_10); chaos_type10_configure(cp_inst, cp_r[5]); break;
            case $1B: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_spikes); if (chaos_is_sez() || chaos_is_aqz()) chaos_sez_mapped_init(cp_inst,cp_r); break; // canonical placement
            case $18: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_18); break;
            case $21: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_21); chaos_type21_configure(cp_inst, cp_r[5], cp_r[4]); break;
            case $25: if (chaos_is_gpz()) { cp_inst = instance_create(cp_r[1],cp_r[2],OBJ_chaos_object_25); cp_inst.chaosParameter=cp_r[5]; } break;
            case $30: if (chaos_is_aqz() && cp_r[5] == 0) cp_inst=chaos_spawn_type26(cp_r); break;
            case $26: cp_inst = chaos_spawn_type26(cp_r); break;
            case $27: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_27); break;
            case $28: cp_inst = chaos_spawn_type28(cp_r); break;
            case $3F: if (chaos_is_aqz()) cp_inst = chaos_spawn_type3f(cp_r); break;
            case $2F: if ((chaos_is_mghz() || chaos_is_sez()) && cp_r[5] == $00) { cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_2F); cp_inst.chaosParameter = cp_r[5]; } break; // Spring Shoes, numeric parameter $00 only
            case $2C: if (chaos_is_gpz()) cp_inst = instance_create(cp_r[1],cp_r[2],OBJ_chaos_object_2C); break;
            case $50: if (chaos_is_thz3()) cp_inst = instance_create(cp_r[1],cp_r[2],OBJ_chaos_object_50); break;
            case $51: if (chaos_gpz_act()==3) cp_inst=instance_create(cp_r[1],cp_r[2],OBJ_chaos_object_51); break;
            case $56: if (chaos_mghz_act()==3) cp_inst=instance_create(cp_r[1],cp_r[2],OBJ_chaos_object_56); break; // MGHZ3 boss: creation by the mapped scan, script slot in global.chaosM3
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
        if (chaos_is_mghz() && (cp_inst != noone || cp_type == $09)) chaos_m3_record(global.chaosM3,cp_r,cp_inst);
    }
}

/// Type $10: the canonical parameter selects the graphics resource (numeric selectors only) and the reward branch in
/// SCR_chaos_type10_reward. The THZ1 Create event still derives its parameter from THZ1 coordinates; this overrides it.
function chaos_type10_configure(cp_inst, cp_param) {
    cp_inst.chaosParameter = cp_param;
    cp_inst.chaosGraphicsSelector = cp_param;
    if (chaos_is_aqz()) {
        switch (cp_param) {
            case 1:cp_inst.sprite_index=SPR_chaos_aqz_monitor_01;break;
            case 2:cp_inst.sprite_index=SPR_chaos_aqz_monitor_02;break;
            case 3:cp_inst.sprite_index=SPR_chaos_aqz_monitor_03;break;
            case 4:cp_inst.sprite_index=SPR_chaos_aqz_monitor_04;break;
            case 6:cp_inst.sprite_index=SPR_chaos_aqz_monitor_06;break;
        } return;
    }
    if (chaos_is_sez()) {
        switch (cp_param) {
            case 1: cp_inst.sprite_index=SPR_chaos_sez_monitor_01; break;
            case 2: cp_inst.sprite_index=SPR_chaos_sez_monitor_02; break;
            case 4: cp_inst.sprite_index=SPR_chaos_sez_monitor_04; break; // Rocket Shoes reward icon
            case 6: cp_inst.sprite_index=SPR_chaos_sez_monitor_06; break;
        } return;
    }
    if (chaos_is_mghz()) {
        switch (cp_param) {
            case 1: cp_inst.sprite_index=SPR_chaos_mghz_monitor_01; break;
            case 2: cp_inst.sprite_index=SPR_chaos_mghz_monitor_02; break;
            case 4: cp_inst.sprite_index=SPR_chaos_mghz_monitor_04; break; // Rocket Shoes reward icon
            case 6: cp_inst.sprite_index=SPR_chaos_mghz_monitor_06; break;
        } return;
    }
    if (chaos_is_gpz()) {
        switch (cp_param) {
            case 1: cp_inst.sprite_index = SPR_chaos_gpz_monitor_01; break;
            case 2: cp_inst.sprite_index = SPR_chaos_gpz_monitor_02; break;
            case 3: cp_inst.sprite_index = SPR_chaos_gpz_monitor_03; break;
            case 4: cp_inst.sprite_index = SPR_chaos_gpz_monitor_04; break;
            case 6: cp_inst.sprite_index = SPR_chaos_gpz_monitor_06; break;
        }
        return;
    }
    switch (cp_param) {
        case $03: cp_inst.sprite_index = SPR_chaos_object_10_03; break;
        case $01: cp_inst.sprite_index = SPR_chaos_object_10_01; break; // THZ3 ten-ring monitor (selector $01)
        case $04: cp_inst.sprite_index = SPR_chaos_object_10_04; break;
        case $06: cp_inst.sprite_index = SPR_chaos_object_10_06; break;
        default: cp_inst.sprite_index = SPR_chaos_object_10; break; // selector $02 art (the accepted default resource)
    }
}

/// Type $21: parameter * 16 is the leftward patrol span (docs/object-21.md).
/// Placement flags bit 4 ($10, every MGHZ record) selects the $B210 alternate start (latch 1, states 5/6); THZ records carry $00. The MGHZ resource holds both runtime orientations.
function chaos_type21_configure(cp_inst, cp_param, cp_flags) {
    cp_inst.chaosParameter = cp_param;
    cp_inst.chaosLeftBound = cp_inst.chaosOriginX - (cp_param << 4);
    cp_inst.chaosAltStart = (cp_flags & $10) != 0;
    if (cp_inst.chaosAltStart && chaos_is_mghz()) cp_inst.sprite_index = SPR_chaos_mghz_object_21;
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
    if (chaos_is_sez() || chaos_is_aqz()) chaos_sez_mapped_init(cp_inst,cp_r);
    if ((cp_param & $80) != 0) {
        cp_inst.chaosSpan = (cp_param & $7F) * 16;
        if (cp_r[7] == 0) { cp_inst.chaosParameter = 0; cp_inst.launch_y = -7.375; }
    }
    return cp_inst;
}

/// Type $28 from a canonical row (docs/platform-spike-collision-audit.md 1.1): parameter $0A = state 11 vertical lift (1 px/update, first leg up, reversal period 16 * aux1
/// updates); parameter $84 = state 5 weight-sag platform. Any other parameter is a different ROM state this milestone does not support: never guessed.
function chaos_spawn_type28(cp_r) {
    if (cp_r[5] != $0A && cp_r[5] != $84 && cp_r[5] != $83 && cp_r[5] != $89 && cp_r[5] != $05 && cp_r[5] != $86 && cp_r[5] != $04) return noone;
    var cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_platform);
    chaos_platform28_configure(cp_inst, cp_r[5], cp_r[7]); // the THZ1 Create event keys off THZ1 X values; the canonical row replaces it
    if (chaos_is_gpz() || chaos_is_mghz() || chaos_is_sez()) {
        cp_inst.sprite_index = chaos_is_sez() ? SPR_chaos_sez_platform : (chaos_is_mghz() ? SPR_chaos_mghz_platform : SPR_chaos_gpz_platform);
        cp_inst.chaosGpzLifecycle = true;
        cp_inst.chaosLive=false; cp_inst.chaosAsleep=true; cp_inst.chaosScanTick=0; cp_inst.chaosInitialFillDone=false;
        cp_inst.chaosPlacementX = cp_r[1]; cp_inst.chaosPlacementY = cp_r[2];
        cp_inst.chaosPlacementParameter = cp_r[5]; cp_inst.chaosPlacementAux1 = cp_r[7];
    }
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
        {zone: "THZ", act: 2, room: ROM_chaos_thz2, name: "Turquoise Hill 2", icon: 1},
        {zone: "THZ", act: 3, room: ROM_chaos_thz3, name: "Turquoise Hill 3", icon: 1}
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

/// 1-based chaos_acts() index of a room, or 0 when the room is not an act (developer rooms never advance progression).
function chaos_act_index_for_room(cp_room) {
    var cp_acts = chaos_acts();
    for (var cp_i = 0; cp_i < array_length(cp_acts); cp_i++) {
        if (cp_acts[cp_i].room == cp_room) return cp_i + 1;
    }
    return 0;
}
/// Presentation metadata also covers developer-launched acts outside save progression.
function chaos_current_act_number() {
    var cp_act=chaos_aqz_act();
    if (cp_act == 0) cp_act=chaos_sez_act();
    if (cp_act == 0) cp_act=chaos_mghz_act();
    if (cp_act == 0) cp_act=chaos_gpz_act();
    if (cp_act != 0) return cp_act;
    return chaos_act_entry(chaos_act_index_for_room(room)).act;
}

/// Final act-clear handoff, shared by every act. Called once, when player state $20 sets the act-clear flag
/// (SCR_cc_state32_tick, ROM $83A6 -> $D293). Sign acts stop at $18 contact; THZ3's boss does not stop it.
/// POC adaptation: the ROM runs its 198-frame clear sequence and results screen before it increments the next-act index
/// ($152F..$153E); those systems are not implemented, so saved progression advances here, through chaos_act_progress(),
/// and never earlier.
function chaos_act_complete() {
    var cp_first_complete = !global.chaosComplete;
    global.chaosComplete = true;
    global.chaosFinishRings = global.ring;
    // Developer UI adapter: 90 updates (1.5 seconds at the Chaos 60 Hz clock).
    if (cp_first_complete && variable_global_exists("chaosDebugSession") && global.chaosDebugSession
        && (!variable_global_exists("chaosDebugReturnTicks") || global.chaosDebugReturnTicks == -1)) {
        global.chaosDebugReturnTicks = 90;
    }
    var cp_act = chaos_act_index_for_room(room);
    if (cp_act > 0 && (!variable_global_exists("chaosDebugSession") || !global.chaosDebugSession)) {
        global.zoneGoto = chaos_act_progress(global.zoneGoto, cp_act);
        SCR_save_game();
    }
}

/// Type $18 contact (sign state 3 -> 4): the level timer stops immediately and sign-pan mode starts. Progression is NOT touched here
/// and the player is not locked (docs/object-18-act-clear.md section 7). The sign anchor is the canonical object record.
function chaos_goal_begin(cp_sign) {
    global.chaosGoalContact = true;
    global.chaosFinishTime = global.minutes*60+global.seconds;
    with (OBJ_count_time) alarm[0] = -1;
    chaos_goal_pan_begin(global.chaosPan, cp_sign.x, cp_sign.y);
}

/// Camera for the act-clear chain, applied from the zone's end step: the recovered pan/freeze (chaos_goal_pan_step) driven by the
/// live view. While pan mode is active the follow camera is off on BOTH axes, like the ROM ($5832 is skipped in pan mode).
function chaos_goal_camera_step() {
    if (!global.chaosPan.active || !instance_exists(chaos_goal_player())) return;
    var cp_p = chaos_goal_player();
    if (!variable_instance_exists(cp_p,"chaosCore")) return;
    var cp_core = cp_p.chaosCore;
    var cp_vp = chaos_vp_current();
    __view_set(e__VW.Object, 0, noone);
    chaos_goal_pan_step(global.chaosPan, cp_vp.left, cp_vp.top, cp_vp.w, cp_vp.h, room_width, room_height,
        floor(cp_core.xu/256), cp_core.state == 32 || cp_core.next == 32);
    if (global.chaosPan.x != cp_vp.left) __view_set(e__VW.XView, 0, global.chaosPan.x);
    if (global.chaosPan.y != cp_vp.top) __view_set(e__VW.YView, 0, global.chaosPan.y);
}

/// Diagnostic trace of the act-clear sequence (one CSV row per update from contact until the clear), written to
/// <working_directory>/act_clear_trace.csv for Windows retests. Logging only: it never feeds gameplay. Developer-gated: it writes
/// nothing unless the F3 diagnostic toggle (global.chaosDebug) is on, so normal play never touches the disk.
function chaos_goal_trace(cp_core, cp_sign_x) {
    if (!global.chaosDebug) return;
    var cp_path = working_directory + "act_clear_trace.csv";
    var cp_new = !file_exists(cp_path);
    var cp_f = file_text_open_append(cp_path);
    if (cp_new) file_text_write_string(cp_f, "room,frame_since_contact,player_x,view_x,view_y,view_w,sign_x,pan_target_x,pan_target_y,player_screen_x,state,next,vx,clear_dx,clear_d,state20_started,camera_moved,camera_frozen,act_clear" + chr(10));
    var cp_vp = chaos_vp_current();
    var cp_pan = global.chaosPan;
    global.chaosTraceFrame++;
    var cp_row = room_get_name(room) + "," + string(global.chaosTraceFrame) + "," + string(floor(cp_core.xu/256)) + "," + string(cp_vp.left) + "," + string(cp_vp.top) + "," +
        string(cp_vp.w) + "," + string(cp_sign_x) + "," + string(chaos_goal_pan_target_x(cp_pan, cp_vp.w)) + "," + string(chaos_goal_pan_target_y(cp_pan)) + "," +
        string(floor(cp_core.xu/256) - cp_vp.left) + "," +
        string(cp_core.state) + "," + string(cp_core.next) + "," + string(cp_core.vx) + "," + string(cp_core.clear_dx) + "," +
        string(floor(cp_core.xu/256) - cp_core.camera_x) + "," + string(cp_core.state == 32 || cp_core.next == 32) + "," +
        string(cp_vp.left != global.chaosTraceLastCam) + "," + string(cp_pan.frozen) + "," + string(cp_core.act_clear) + chr(10);
    file_text_write_string(cp_f, cp_row);
    file_text_close(cp_f);
    global.chaosTraceLastCam = cp_vp.left;
}

/// AQZ P2 placement factory; rendering resources never enter the platform rules.
function chaos_spawn_type3f(cp_r) {
    if (cp_r[5] != $83 && cp_r[5] != $86 && cp_r[5] != $8B) return noone;
    var cp_o=instance_create(cp_r[1],cp_r[2],OBJ_chaos_platform);
    cp_o.chaosType3f=true; cp_o.chaosGpzLifecycle=true;
    cp_o.chaosPlacementX=cp_r[1]; cp_o.chaosPlacementY=cp_r[2];
    cp_o.chaosPlacementParameter=cp_r[5]; cp_o.chaosPlacementAux1=cp_r[7];
    cp_o.chaosPlacementIndex=cp_r[0]; cp_o.chaosScanTick=0; cp_o.chaosInitialFillDone=false;
    cp_o.chaosConsumed=false; cp_o.chaosLive=false; cp_o.chaosAsleep=true;
    cp_o.chaosOccupied=false; cp_o.chaosSlot=-1;
    cp_o.chaosAct=chaos_aqz_act()-1; // ROM $D298; core.level is a legacy zone selector
    cp_o.sprite_index=SPR_chaos_aqz_platform; cp_o.image_speed=0;
    chaos_platform3f_reset(cp_o);
    return cp_o;
}
