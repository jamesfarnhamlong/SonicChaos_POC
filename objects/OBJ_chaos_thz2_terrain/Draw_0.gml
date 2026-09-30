// Canonical THZ2 terrain: four 1024x1024 quadrants rendered from the level package layout.
draw_sprite(SPR_chaos_thz2_terrain_0,0,0,0);
draw_sprite(SPR_chaos_thz2_terrain_1,0,1024,0);
draw_sprite(SPR_chaos_thz2_terrain_2,0,2048,0);
draw_sprite(SPR_chaos_thz2_terrain_3,0,3072,0);
// Type-13 breakables ($9C) that the player has broken: the ROM writes block $9D into the map ($7898).
if (variable_global_exists("chaosBrokenCells")) {
    for (var cp_b = 0; cp_b < array_length(global.chaosBrokenCells); cp_b++) {
        var cp_cell = global.chaosBrokenCells[cp_b];
        draw_sprite(SPR_chaos_thz2_block_9d,0,(cp_cell mod 128)*32,(cp_cell div 128)*32);
    }
}
