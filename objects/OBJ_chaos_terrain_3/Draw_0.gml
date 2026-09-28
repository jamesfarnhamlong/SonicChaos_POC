// Overlay only the four canonical $47 cells. This leaves every other terrain
// pixel byte-for-byte unchanged and replaces broken cells with block $46.
draw_self();
for (var cp_block47 = 0; cp_block47 < 4; cp_block47++) {
    // Presentation and collision intentionally read the same mutable terrain.
    var cp_broken = global.chaosTileIds[1128+cp_block47] == 70;
    draw_sprite(cp_broken ? SPR_chaos_block_46 : SPR_chaos_block_47,0,
        3328+cp_block47*32,256);
}
