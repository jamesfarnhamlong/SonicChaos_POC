// Draw exactly one integer subimage in THZ1. This bypasses the inherited
// automatic sequence path that accumulated prior ring silhouettes on Windows.
if (room == ROM_chaos_thz1)
    draw_sprite_part(SPR_ring,floor(chaosTHZFrame),0,1,16,16,chaosQuadrantLeft,chaosQuadrantTop);
else draw_self();
