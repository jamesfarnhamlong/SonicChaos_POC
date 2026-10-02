// Canonical THZ3 terrain: three 1024-wide sprites (2560x512 px) rendered from the level package layout (POC_notes/extract_chaos_level.py --act thz3).
draw_sprite(SPR_chaos_thz3_terrain_0,0,0,0);
draw_sprite(SPR_chaos_thz3_terrain_1,0,1024,0);
draw_sprite(SPR_chaos_thz3_terrain_2,0,2048,0);
// Type-13 breakables ($9C) that the player has broken: the ROM writes block $9D into the map ($7898). THZ3 map width is 80 cells (ROM row stride).
if (variable_global_exists("chaosBrokenCells")) {
    for (var cp_b = 0; cp_b < array_length(global.chaosBrokenCells); cp_b++) {
        var cp_cell = global.chaosBrokenCells[cp_b];
        draw_sprite(SPR_chaos_thz2_block_9d,0,(cp_cell mod 80)*32,(cp_cell div 80)*32);
    }
}
