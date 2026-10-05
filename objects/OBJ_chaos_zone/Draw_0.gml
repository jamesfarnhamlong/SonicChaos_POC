// Recovered lost rings (type $06, SCR_chaos_lost_ring): world-space anchors drawn with the accepted type-$09 mapping and registration (GameMaker presentation adapter).
// No alpha, blink or timer: only the canonical flight frames 1,2,4,3 and the pickup sparkle 5/6 (chaos_lr_frame). Depth is set in Create (between ring manager 0 and player -50).
var cp_lr_list = chaos_lr_list();
chaos_m3_draw();
for (var cp_lr_i=0; cp_lr_i<array_length(cp_lr_list); cp_lr_i++) {
    var cp_lr = cp_lr_list[cp_lr_i];
    var cp_lr_frame = chaos_lr_frame(cp_lr);
    if (cp_lr_frame < 0) continue;
    draw_sprite(chaos_is_sez() ? SPR_chaos_sez_ring : (chaos_is_mghz() ? SPR_chaos_mghz_ring : (chaos_is_gpz() ? SPR_chaos_gpz_ring : SPR_chaos_object_09)),cp_lr_frame,
        chaos_lr_pixel_x(cp_lr)+TYPE09_RENDER_X,chaos_lr_pixel_y(cp_lr)+TYPE09_RENDER_Y);
}
