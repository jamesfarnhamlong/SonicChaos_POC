/// Shared level-selection helpers. THZ1 behaviour is unchanged; THZ2 reuses the same core.
function chaos_in_level() { return room == ROM_chaos_thz1 || room == ROM_chaos_thz2 || room == ROM_chaos_thz3; }
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
    if (chaos_is_thz2()) return SCR_chaos_thz2_objects();
    if (chaos_is_thz3()) return SCR_chaos_thz3_objects();
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
            case $1B: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_spikes); break; // moving spike: anchor = canonical record (THZ3 (752,128))
            case $18: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_18); break;
            case $21: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_21); chaos_type21_configure(cp_inst, cp_r[5]); break;
            case $26: cp_inst = chaos_spawn_type26(cp_r); break;
            case $27: cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_object_27); break;
            case $28: cp_inst = chaos_spawn_type28(cp_r); break;
            case $50: if (chaos_is_thz3()) cp_inst = instance_create(cp_r[1],cp_r[2],OBJ_chaos_object_50); break;
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
        case $01: cp_inst.sprite_index = SPR_chaos_object_10_01; break; // THZ3 ten-ring monitor (selector $01)
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

/// Type $28 from a canonical row (docs/platform-spike-collision-audit.md 1.1): parameter $0A = state 11 vertical lift (1 px/update, first leg up, reversal period 16 * aux1
/// updates); parameter $84 = state 5 weight-sag platform. Any other parameter is a different ROM state this milestone does not support: never guessed.
function chaos_spawn_type28(cp_r) {
    if (cp_r[5] != $0A && cp_r[5] != $84) return noone;
    var cp_inst = instance_create(cp_r[1], cp_r[2], OBJ_chaos_platform);
    chaos_platform28_configure(cp_inst, cp_r[5], cp_r[7]); // the THZ1 Create event keys off THZ1 X values; the canonical row replaces it
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

/// Final act-clear handoff, shared by every act. Called once, when player state $20 sets the act-clear flag
/// (SCR_cc_state32_tick, ROM $83A6 -> $D293). Sign acts stop at $18 contact; THZ3's boss does not stop it.
/// POC adaptation: the ROM runs its 198-frame clear sequence and results screen before it increments the next-act index
/// ($152F..$153E); those systems are not implemented, so saved progression advances here, through chaos_act_progress(),
/// and never earlier.
function chaos_act_complete() {
    global.chaosComplete = true;
    global.chaosFinishRings = global.ring;
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
    if (!global.chaosPan.active || !instance_exists(OBJ_player_char)) return;
    var cp_p = instance_find(OBJ_player_char,0);
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
