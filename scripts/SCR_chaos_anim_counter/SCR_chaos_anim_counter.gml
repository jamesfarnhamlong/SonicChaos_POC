// Shadow of the player animation engine's TIMING counter +$07 (ROM $64FA, called at $361D before the state callback). Plain numbers only, so
// verification/verify_terrain_ring_probe.js executes this shipped code against the Research fixtures (POC_notes/rom-cache/player-animation-counter.json).
// It exists solely because the terrain-ring probe $753E reads bit 0 of the CURRENT counter. It is NOT driven by GameMaker image_index/image_speed and does
// not model animation frames. SCOPE: it is PARITY-FAITHFUL for that consumer. It is not claimed to be an exact schedule for every state: in state $0B (spring
// ascent) $D448 bit 0 selects which even durations load (the ROM sets it for strong springs: upright terrain spring, $21 top contact, ...), and the POC supplies d448 = 0 (it has
// no $D448 source). Research (90b4b05, state_0b_fixture) shows every duration on both $0B paths is even, so the parity sequence - hence the probe depth - is identical;
// only the exact counter VALUES differ between the strong and weak paths. State: cur (+$01), t (+$07), ptr (op index inside the state's record program, -1 = no program yet), loop (+$33).
//
// Per player update, BEFORE the state callback / movement (inputs are what the previous update left behind):
//   req   the requested state (+$02) at the start of the update (a request made by the callback of update n applies at the start of n+1)
//   hi    signed high byte of the X speed ($D517)       floor  $D522 bit 1 (background floor contact)
//   side  $D523 & $0C non-zero                            d448   $D448 bit 0 (state $0B only; unresolved in Research, the POC supplies 0)
function SCR_cc_anim_new() {
    return {cur:0, t:0, ptr:-1, loop:0};
}
function SCR_cc_anim_programs() {
    if (!variable_global_exists("chaosAnimPrograms")) {
        global.chaosAnimPrograms = SCR_chaos_anim_programs();
        global.chaosAnimTables = SCR_chaos_anim_selector_tables();
    }
    return global.chaosAnimPrograms;
}
function SCR_cc_anim_has(cp_prog, cp_state) {
    return cp_state >= 0 && cp_state < array_length(cp_prog) && is_array(cp_prog[cp_state]);
}
/// Selector routines: the duration is loaded into +$07 only when the counter reloads.
function SCR_cc_anim_selector(cp_sel, cp_hi, cp_floor, cp_side) {
    var cp_a = min(abs(cp_hi) & 255, 15);
    if (cp_sel == 1) return cp_side ? 2 : global.chaosAnimTables[0][cp_a];
    if (cp_sel == 2) return 4;
    if (cp_sel == 3) return cp_floor ? global.chaosAnimTables[1][cp_a] : 3;
    if (cp_sel == 4) return 3;
    return 6;
}
/// next_record(): walk the state's record program from ptr until a record or a selector loads the counter.
function SCR_cc_anim_next(cp_a, cp_req, cp_hi, cp_floor, cp_side, cp_d448) {
    var cp_prog = SCR_cc_anim_programs();
    while (true) {
        var cp_op = cp_prog[cp_a.cur][cp_a.ptr];
        var cp_k = cp_op[0];
        if (cp_k == 0) { cp_a.t = cp_op[1]; cp_a.ptr++; return; }
        if (cp_k == 1) {                                  // FF 00: restart; adopt the requested state if it differs
            if (cp_a.cur != cp_req) cp_a.cur = cp_req;
            if (!SCR_cc_anim_has(cp_prog, cp_a.cur)) { cp_a.ptr = -1; return; }
            cp_a.ptr = 0;
        } else if (cp_k == 2) { cp_req = cp_op[1]; cp_a.ptr++; }          // FF 03 s: request state s (FF 00 follows in the same update)
        else if (cp_k == 3) { cp_a.t = SCR_cc_anim_selector(cp_op[1], cp_hi, cp_floor, cp_side); cp_a.ptr++; return; }   // FF 05 selector
        else if (cp_k == 4) cp_a.ptr = cp_op[1];                                           // FF 07 jump
        else if (cp_k == 5) cp_a.ptr = ((cp_op[2] == 1) ? ((cp_d448 & 1) != 0) : true) ? cp_op[1] : cp_a.ptr + 1;   // FF 08 conditional jump
        else if (cp_k == 6) { cp_a.loop = cp_op[1]; cp_a.ptr++; }                          // FF 0E loop count
        else if (cp_k == 7) { cp_a.loop--; cp_a.ptr = (cp_a.loop == 0) ? cp_a.ptr + 1 : cp_op[1]; }   // FF 0F loop
        else cp_a.ptr++;                                                                   // no effect on the counter
    }
}
/// One engine call. Returns +$07 afterwards (the value the update's terrain-ring probe sees).
///   ptr zero (first update) : load the CURRENT state's script, ignoring req      req != cur : switch state and reload at once
///   otherwise               : DEC +$07; at zero the next record loads
function SCR_cc_anim_step(cp_a, cp_req, cp_hi, cp_floor, cp_side, cp_d448) {
    var cp_prog = SCR_cc_anim_programs();
    if (cp_a.ptr < 0) {
        if (SCR_cc_anim_has(cp_prog, cp_a.cur)) { cp_a.ptr = 0; SCR_cc_anim_next(cp_a, cp_req, cp_hi, cp_floor, cp_side, cp_d448); return cp_a.t; }
        if (cp_req != cp_a.cur) {
            cp_a.cur = cp_req;
            if (SCR_cc_anim_has(cp_prog, cp_a.cur)) { cp_a.ptr = 0; SCR_cc_anim_next(cp_a, cp_req, cp_hi, cp_floor, cp_side, cp_d448); }
        }
        return cp_a.t;
    }
    if (cp_req != cp_a.cur) {
        cp_a.cur = cp_req;
        if (!SCR_cc_anim_has(cp_prog, cp_a.cur)) { cp_a.ptr = -1; return cp_a.t; }
        cp_a.ptr = 0;
        SCR_cc_anim_next(cp_a, cp_req, cp_hi, cp_floor, cp_side, cp_d448);
        return cp_a.t;
    }
    cp_a.t = (cp_a.t - 1) & 255;
    if (cp_a.t == 0) SCR_cc_anim_next(cp_a, cp_req, cp_hi, cp_floor, cp_side, cp_d448);
    return cp_a.t;
}
/// The call the player adapter makes once per update BEFORE the state callback and movement: inputs are taken from the core exactly as the ROM engine
/// reads them (requested state, $D517 high byte, $D522 bit 1 = bg floor, $D523 & $0C = merged side contacts, $D448 bit 0 = 0 in the POC).
function SCR_cc_anim_update(cp_c) {
    if (!variable_struct_exists(cp_c, "anim")) cp_c.anim = SCR_cc_anim_new();
    return SCR_cc_anim_step(cp_c.anim, cp_c.next, cp_c.vx >> 8, (cp_c.bg & 2) != 0, (cp_c.contacts & 12) != 0, 0);
}
