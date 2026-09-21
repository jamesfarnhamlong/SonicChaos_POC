if (room == ROM_chaos_thz1) { SCR_chaos_adapter_end(id); exit; }


// Chaos ground-following after horizontal movement. Ignore real jumps and pits.
if (room == ROM_chaos_thz1 && !global.playerJump && chaosSupport == noone && place_free(x, y + 1)) {
    for (var drop = 1; drop <= 20; drop++) {
        if (!place_free(x, y + drop + 1)) {
            y += drop;
            vspeed = 0;
            break;
        }
    }
}
