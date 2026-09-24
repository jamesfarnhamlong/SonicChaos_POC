// Draw exactly one integer subimage in THZ1. This bypasses the inherited
// automatic sequence path that accumulated prior ring silhouettes on Windows.
if (room == ROM_chaos_thz1) draw_sprite(SPR_ring, chaosTHZFrame, x, y);
else draw_self();
