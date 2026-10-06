/// SEZ S2 terrain mechanics: surface $0C / block $AF / dynamic type $13 (crumble ledge) and surface $1A / block $A7 (booster pad).
/// Research 6e169d7, data/rom-cache/sez/surface-runtime-contracts.json (mirrored byte for byte at POC_notes/rom-cache/sez/). Constants: SCR_chaos_sez_s2_data (generated).
/// Plain numbers and structs only (verification/verify_sez_s2.js executes this shipped code). Canonical ROM behaviour, the GameMaker adapters and the integration limits are labelled.
///
/// Update order (ROM $64FA..$5DD1): the player's whole pass first (terrain floor pass incl. handler $6B79, ring probe incl. booster $7646), then the object scheduler,
/// slots 0..18 ascending. SCR_chaos_objects_phase calls chaos_s2_phase after the player's Step, the same order the other object systems use.
///
/// Adapters (NOT ROM facts): (1) the break's camera test is EDGE(LEFT,0) of the live GameMaker view; (2) the lifecycle uses the accepted generic widescreen retention
/// (chaos_vp_retained_cell: horizontal extension max(0, width-256), vertical bands canonical); (3) the 19-slot pool is an occupancy model, NOT a whole-game slot interpreter:
/// it sees the crumble parents, the shards and the accepted lost-ring structs. Other mapped SEZ objects are plain GameMaker instances and do not reserve slots here.

function chaos_s2_slot() {
    return {type:0,parameter:0,x:0,y:0,yu:0,raw_x:0,raw_y:0,cell:-1,state:0,requested:0,tick:0,age:0,frame:0,vy:0,asleep:false,woken:false,ring_ref:noone};
}
function chaos_s2_new() {
    var cp_slots=[];
    for (var cp_i=0;cp_i<19;cp_i++) array_push(cp_slots,chaos_s2_slot());
    // remembered = $D356 (layout-RAM cell pointer, 0 after the level clear $297E); spawns / replaced / sounds are observable logs for the oracle checks.
    return {slots:cp_slots,remembered:0,passes:0,spawns:[],children:[],replaced:[],removed_by_edge:[],sounds:[],hold_updates:0};
}
/// Lazily created so a core-level caller (floor pass) never meets a missing pool; chaos_level_install_layout creates it (act start / restart).
function chaos_s2_state() {
    if (!variable_global_exists("chaosS2")) global.chaosS2=chaos_s2_new();
    return global.chaosS2;
}
/// $6B79 is reached only through the floor pass: the ROM states that run it (contract trigger.states_that_run_the_floor_pass_and_so_the_handler) plus the $21 foot offset
/// the shared pass carries. State $20 (act clear) is not in the list even though the accepted POC act-clear adapter walks the terrain pipeline: the handler stays off for it.
function chaos_s2_floor_state(cp_state) {
    var cp_list=chaos_sez_s2_contract().crumble.handler_states;
    for (var cp_i=0;cp_i<array_length(cp_list);cp_i++) if (cp_list[cp_i] == cp_state) return true;
    return false;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// Floor handler $6B79 (surface $0C). cp_s is the lookup of the CURRENT foot sample (anchor X, anchor Y + 18 + the shared +8 / -14 state offsets), made before the one-way projection
// moved the player; cp_s.ax / cp_s.ay are those probed coordinates ($D358 / $D35A) and cp_s.index the layout cell ($D354 = $C001 + index).
function SCR_cc_crumble_floor(cp_c,cp_s) {
    if (!chaos_s2_floor_state(cp_c.state)) return false;
    if (cp_c.vy < 0) return false;                 // BIT 7,(IX+$19): rising -> RET with no write at all (no zero, no spawn, no remembered-cell update)
    cp_c.vy=0;                                      // Y speed := 0 on EVERY call, before the remembered-cell test (standing on the cell zeroes it each update)
    var cp_b=chaos_s2_state();
    var cp_pointer=49153+cp_s.index;                // layout RAM $C001 + cy * width + cx
    if (cp_b.remembered == cp_pointer) return false;
    chaos_s2_spawn_parent(cp_b,cp_s.ax,cp_s.ay,cp_s.index);
    cp_b.remembered=cp_pointer;                     // also when the allocation failed (full pool): that cell then never crumbles until another crumble cell is touched
    return true;
}
/// $5EB7: first free slot of 0..15; silently nothing when full. Returns the slot or -1.
function chaos_s2_spawn_parent(cp_b,cp_x,cp_y,cp_cell) {
    var cp_i=chaos_object_free_slot(cp_b.slots,0,16);
    if (cp_i < 0) return -1;
    var cp_s=chaos_s2_slot();
    cp_s.type=$13;cp_s.parameter=0;cp_s.raw_x=cp_x;cp_s.raw_y=cp_y;cp_s.x=cp_x;cp_s.y=cp_y;cp_s.yu=cp_y*256;cp_s.cell=cp_cell;
    cp_b.slots[cp_i]=cp_s;
    array_push(cp_b.spawns,[cp_b.passes,cp_i,cp_x,cp_y,cp_cell]);
    return cp_i;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
/// $A344. Applies iff player state == $0E OR +$03 bit 0 (jump latch / airborne) clear. NO presence test: no X or Y comparison with the object, so a player who walked off the
/// ledge is still pulled to object Y - 40 (cell top - 16) and hovers (verified original behaviour; never gate it on presence, never hold at cell top - 18).
/// Position fraction is untouched (the word $D514 is written); Y speed word zeroed. $D521 bit 1 has no reader (inert) and is not modelled.
function chaos_s2_rider_hold(cp_s,cp_c) {
    if (cp_c.state != $0E && (cp_c.move & 1) != 0) return false;
    cp_c.yu=((((cp_s.y-40) & $FFFF)*256)+(cp_c.yu & 255)) & 16777215;
    cp_c.vy=0;
    return true;
}
/// $A36A. Replaced unless the object is asleep (+$04 bit 6) or objectX < cameraX (strict; EDGE(LEFT,0) of the live view); then the object only removes itself and the cell
/// stays $AF AND stays remembered. The layout cell becomes block $B0 (empty air: flags $00, profiles 0 / $40) through the layout the terrain probes read.
function chaos_s2_break(cp_b,cp_s,cp_vp) {
    if (cp_s.asleep || cp_s.x < chaos_vp_edge(cp_vp,CHAOS_VP_LEFT,0)) {
        cp_s.type=$FF;
        array_push(cp_b.removed_by_edge,[cp_b.passes,cp_s.cell]);
        return false;
    }
    chaos_s2_replace_cell(cp_s.cell);
    array_push(cp_b.replaced,[cp_b.passes,cp_s.cell]);
    return true;
}
function chaos_s2_replace_cell(cp_index) {
    var cp_contract=chaos_sez_s2_contract();
    global.chaosTileIds[cp_index]=cp_contract.crumble.replacement_block;
    if (!variable_global_exists("chaosBrokenCells")) global.chaosBrokenCells=[];
    array_push(global.chaosBrokenCells,cp_index);
}
/// Script command 4 ($5EE1: first free slot of 7..17, silent when none) for the four shards, in the order offsets 0, 8, 16, 24 (parameters 3, 8, 5, 1).
function chaos_s2_spawn_children(cp_b,cp_s) {
    var cp_contract=chaos_sez_s2_contract().crumble;
    for (var cp_n=0;cp_n<array_length(cp_contract.shard_parameters);cp_n++) {
        var cp_i=chaos_object_free_slot(cp_b.slots,7,18);
        if (cp_i < 0) continue;
        var cp_k=chaos_s2_slot();
        cp_k.type=$13;cp_k.parameter=cp_contract.shard_parameters[cp_n];
        cp_k.raw_x=cp_s.x+cp_contract.shard_dx[cp_n];cp_k.raw_y=cp_s.y+cp_contract.shard_dy;
        cp_k.x=cp_k.raw_x;cp_k.y=cp_k.raw_y;cp_k.yu=cp_k.y*256;
        cp_b.slots[cp_i]=cp_k;
        array_push(cp_b.children,[cp_b.passes,cp_i,cp_k.parameter,cp_k.x,cp_k.y]);
    }
}
/// One scheduler visit of a type-$13 object (parent: parameter 0; shard: parameter != 0). Returns true when the rider hold moved the player this pass.
function chaos_s2_step13(cp_b,cp_s,cp_i,cp_c,cp_have,cp_vp) {
    var cp_hold=false;
    cp_s.age++;
    var cp_init=cp_s.age == 1;
    if (cp_s.state != cp_s.requested) { cp_s.state=cp_s.requested;cp_s.tick=0;if (cp_s.state == 3) cp_s.vy=$200; }
    if (cp_s.state == 0) {                                  // $A2DD (record dur 224, frame 0)
        cp_s.frame=0;
        if (cp_s.parameter != 0) cp_s.requested=3;
        else { cp_s.x=(cp_s.raw_x & $FFE0)+14;cp_s.y=(cp_s.raw_y & $FFE0)+24;cp_s.yu=cp_s.y*256;cp_s.requested=1; }
    } else if (cp_s.state == 1) {                           // 16 x $A344, 1 x $A36A, then sound $A3 + 4 x spawn + $A33F
        cp_s.frame=0;
        if (cp_s.tick < 16) {
            if (cp_have && chaos_s2_rider_hold(cp_s,cp_c)) { cp_hold=true;cp_b.hold_updates++; }
        } else if (cp_s.tick == 16) {
            if (!chaos_s2_break(cp_b,cp_s,cp_vp)) { cp_s.tick++;return false; }
        } else {
            global.chaosLastSoundRequest=$A3;
            array_push(cp_b.sounds,[cp_b.passes,$A3]);
            chaos_s2_spawn_children(cp_b,cp_s);
            cp_s.type=$FF;                                  // $A33F
            return false;
        }
        cp_s.tick++;
    } else if (cp_s.state == 3) {                           // $A31B shard
        cp_s.frame=15;
        if (cp_s.asleep) { cp_s.type=$FF;return false; }
        if (cp_s.parameter != 0) cp_s.parameter--;
        else {
            cp_s.vy=SCR_cc_s16(cp_s.vy+$200);
            cp_s.yu=(cp_s.yu+cp_s.vy) & 16777215;
            cp_s.y=floor(cp_s.yu/256);
        }
        cp_s.tick++;
    }
    if (cp_init || cp_s.type == $FF) return cp_hold;
    // Generic lifetime ($61E1) after the callback; the accepted widescreen retention keeps the vertical bands canonical.
    var cp_cell=chaos_vp_retained_cell(cp_vp,cp_s.x,cp_s.y,!cp_s.asleep,cp_s.woken);
    if (cp_cell <= 1) cp_s.woken=true;
    cp_s.asleep=cp_cell >= 2;
    if (cp_cell == 3) cp_s.type=$FF;
    return cp_hold;
}
/// Accepted lost rings (type $06) reserve slots 0..15 first-free, exactly as the MGHZ bridge does; they never change ring gameplay.
function chaos_s2_ring_bridge(cp_b) {
    var cp_rings=chaos_lr_list();
    for (var cp_n=0;cp_n<array_length(cp_rings);cp_n++) {
        var cp_lr=cp_rings[cp_n],cp_found=false;
        for (var cp_i=0;cp_i<19;cp_i++) if (cp_b.slots[cp_i].ring_ref == cp_lr) cp_found=true;
        if (cp_found || !cp_lr.alive) continue;
        var cp_slot=chaos_object_free_slot(cp_b.slots,0,16);
        if (cp_slot < 0) continue;
        var cp_s=chaos_s2_slot();cp_s.type=$06;cp_s.ring_ref=cp_lr;
        cp_b.slots[cp_slot]=cp_s;
    }
}
/// The object scheduler pass for the S2 pool. Returns true when the player's core was moved (the caller republishes it).
function chaos_s2_phase(cp_c,cp_have) {
    if (!chaos_is_sez()) return false;
    var cp_b=chaos_s2_state(),cp_vp=chaos_vp_current(),cp_hold=false;
    chaos_s2_ring_bridge(cp_b);
    cp_b.passes++;
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=cp_b.slots[cp_i];
        if (cp_s.type == 0) continue;
        if (cp_s.ring_ref != noone) {
            if (!cp_s.ring_ref.alive) cp_s.type=$FF;
            if (cp_s.type == $FF) cp_b.slots[cp_i]=chaos_s2_slot();   // freed the visit after the ring ended
            continue;
        }
        if (cp_s.type == $FF) { cp_b.slots[cp_i]=chaos_s2_slot();continue; }
        if (cp_s.type != $13) continue;   // occupancy-only placeholders (fixtures) are never run
        if (chaos_s2_step13(cp_b,cp_s,cp_i,cp_c,cp_have,cp_vp)) cp_hold=true;
    }
    return cp_hold;
}
/// Shards only (the parent is invisible: mapping frame 0 has no pieces). Sprite = the accepted SEZ shard art (type $07 frame 15 is the same mapping record as $13 frame 15).
function chaos_s2_draw() {
    if (!chaos_is_sez() || !variable_global_exists("chaosS2")) return;
    for (var cp_i=0;cp_i<19;cp_i++) {
        var cp_s=global.chaosS2.slots[cp_i];
        if (cp_s.type != $13 || cp_s.frame != 15 || cp_s.asleep) continue;
        draw_sprite(SPR_chaos_sez_shard,0,cp_s.x,cp_s.y);
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------
/// Booster $7646, dispatched ONLY by the terrain-ring probe $753E: the last step of the terrain pass (after floor, sides and ceiling, before the merge), so it sees the update's
/// projected position and the floor flag BEFORE any state callback post-processing (Rocket Shoes' floor tail, ...). The probe point is the one the ring manager publishes
/// (chaos_ring_probe_point: anchor Y - 8 / + 2 by the parity of the +$07 counter the adapter stored in probe_counter); only the 26 states of the shared probe reach it.
/// Surface $1A is read from the probed cell's header. Effect, with the floor flag (+$22 bit 1) set: X speed and max X speed := +7.0 (always rightward),
/// +$03 := (+$03 | 2) & $FE (attack posture on, jump latch off), requested state $10. Y speed, facing, position and floor flags are untouched.
/// Returns 0 (not on a pad), 1 (handler reached, no effect: floor flag clear) or 2 (launched).
function SCR_cc_booster_probe(cp_c,cp_px,cp_py) {
    var cp_contract=chaos_sez_s2_contract().booster;
    var cp_s=SCR_cc_lookup(cp_px,cp_py,cp_c.plane);
    if ((cp_s.flags & 31) != cp_contract.surface) return 0;
    if ((cp_c.bg & 2) == 0) return 1;
    cp_c.vx=cp_contract.x_speed;
    cp_c.maximum=cp_contract.max_x_speed;
    cp_c.move=(cp_c.move | 2) & ~1;
    cp_c.next=cp_contract.requested_state;
    cp_c.booster=cp_c.booster+1;
    return 2;
}
/// The terrain-pass probe hook (reached from the core's SCR_cc_terrain_probe for zone 2 only: the booster is the only surface-$1A dispatcher; other zones' $753E handlers are unresolved in Research).
function chaos_sez_terrain_probe(cp_c) {
    if (!chaos_ring_probe_eligible(cp_c.state)) return 0;
    var cp_probe=chaos_ring_probe_point(floor(cp_c.xu/256),floor(cp_c.yu/256),cp_c.probe_counter);
    return SCR_cc_booster_probe(cp_c,cp_probe[0],cp_probe[1]);
}
/// Adapter step after the player's tick: the sound request $BD is rewritten by every launch ($DE04). The Spring Shoes owner needs no special case: a shared handler that replaces
/// requested state $12 already raises owner event 5 inside SCR_cc_state18_tick (end to end with a real $2F shoe on a pad has no natural SEZ route: Research-UNRESOLVED).
function chaos_sez_booster_post(cp_c) {
    if (cp_c.booster > 0) global.chaosLastSoundRequest=chaos_sez_s2_contract().booster.sound_request;
}
