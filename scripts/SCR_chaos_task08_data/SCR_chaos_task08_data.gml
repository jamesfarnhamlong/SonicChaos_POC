// Generated from reviewed data/rom-cache/thz1/object-09.json.
function SCR_chaos_type09_placements() {
    return [
        [14,3124,548,$00],
        [15,3160,522,$00],
        [16,3208,512,$00],
        [17,2880,384,$00],
        [18,2832,448,$00],
        [19,2840,408,$00],
        [20,2928,448,$00],
        [21,2920,408,$00],
        [37,3367,830,$00],
        [38,3394,798,$00],
        [39,3422,774,$00],
        [40,816,844,$01],
        [41,864,844,$01],
        [42,944,844,$01],
        [43,1040,844,$01],
        [44,1728,588,$01],
        [45,1760,588,$01],
        [46,1856,588,$01],
        [47,1968,588,$01],
        [48,2048,588,$01],
        [49,2080,588,$01],
        [50,2400,684,$01],
        [51,2512,684,$01],
        [52,2640,684,$01]
    ];
}

function SCR_chaos_type09_create_all() {
    var cp_rows = SCR_chaos_type09_placements();
    for (var cp_i = 0; cp_i < array_length(cp_rows); cp_i++) {
        var cp_row = cp_rows[cp_i];
        var cp_o = instance_create_depth(cp_row[1],cp_row[2],-20,OBJ_chaos_object_09);
        cp_o.chaosRecordIndex = cp_row[0];
        cp_o.chaosParameter = cp_row[3];
    }
}
