// GameMaker-only presentation adapter. The canonical physics/patrol anchor
// and the +18 floor probe remain independent of this renderer policy.
draw_sprite_ext(sprite_index,image_index,
    x+chaos_render_offset_x($21),y+chaos_render_offset_y($21),image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
