draw_sprite(SPR_chaos_gpz1_terrain_0,0,0,0);
draw_sprite(SPR_chaos_gpz1_terrain_1,0,1024,0);
draw_sprite(SPR_chaos_gpz1_terrain_2,0,2048,0);
draw_sprite(SPR_chaos_gpz1_terrain_3,0,3072,0);
draw_sprite(SPR_chaos_gpz1_terrain_4,0,4096,0);
for (var cp_cell=0; cp_cell<array_length(global.chaosTileIds); cp_cell++) { if (global.chaosTileIds[cp_cell]==71) draw_sprite(SPR_chaos_gpz_block_47,0,(cp_cell mod global.chaosMapWidth)*32,(cp_cell div global.chaosMapWidth)*32); }
