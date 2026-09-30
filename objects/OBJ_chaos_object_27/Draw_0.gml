// GameMaker-only presentation adapter (central class-wide offset). The canonical placement, trigger geometry, collision box and
// movement all keep the object anchor (x,y); only the drawn sprite is registered per the recovered mapped-object arithmetic.
draw_sprite_ext(sprite_index,image_index,
    x+chaos_render_offset_x($27),y+chaos_render_offset_y($27),image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
