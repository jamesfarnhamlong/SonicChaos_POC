// Presentation only: source placement, floor projection, and contact keep the
// canonical instance anchor. The accepted POC adapter is named centrally.
if (chaosConsumed) { draw_self(); exit; }
draw_sprite_ext(sprite_index,image_index,
    x+chaos_render_offset_x($10),y+chaos_render_offset_y($10),image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
