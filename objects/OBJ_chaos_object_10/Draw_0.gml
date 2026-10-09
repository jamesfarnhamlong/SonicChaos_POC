chaos_aqz_palette_begin(false);
// Presentation only: source placement, floor projection, and contact keep the
// canonical instance anchor. The accepted POC adapter is named centrally.
if (chaosConsumed) { draw_self(); chaos_aqz_palette_end(); exit; }
draw_sprite_ext(sprite_index,image_index,
    x+chaos_render_offset_x($10),y+chaos_render_offset_y($10),image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);

chaos_aqz_palette_end();
