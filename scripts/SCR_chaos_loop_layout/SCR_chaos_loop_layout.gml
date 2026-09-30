// Loop geometry recovered from the canonical layout instead of level-specific coordinates.
// ROM $6CBA/$6CCD: a loop is entered when the previous floor tile is $51 (rightward, plane 0) or $52 (leftward,
// plane 1); the entry origin snaps to that 32-pixel cell. A loop is therefore the adjacent tile pair $51,$52; its
// centre is the X of the $52 cell and its row is that cell's Y. Plain numbers/arrays so the shipped function can
// also be executed by verification/verify_thz2_loops_twist.js.
function SCR_chaos_loop_layout(cp_ids) {
    var cp_centers = [];
    var cp_rows = [];
    var cp_count = array_length(cp_ids);
    for (var cp_i = 1; cp_i < cp_count; cp_i++) {
        if (cp_ids[cp_i] == 82 && cp_ids[cp_i - 1] == 81 && (cp_i % 128) != 0) {
            array_push(cp_centers, (cp_i % 128) * 32);
            array_push(cp_rows, floor(cp_i / 128) * 32);
        }
    }
    return {centers: cp_centers, rows: cp_rows};
}
