// Refresh broken $47 cells as canonical block $46 on the terrain layer.
// The opaque palette-0 index-zero pixels replace the flattened $47 art with
// the surrounding sky colour, while depth 100 keeps Sonic and effects in front.
draw_self();
for (var cp_block47 = 0; cp_block47 < 4; cp_block47++) {
    if (global.chaosBlock47Broken[cp_block47])
        draw_sprite(SPR_chaos_block_46,0,3328+cp_block47*32,256);
}
