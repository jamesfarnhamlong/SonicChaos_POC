// GameMaker-only presentation adapter. The instance Y remains the canonical
// physics/patrol anchor; only the visible sprite is registered 18px lower.
draw_sprite_ext(sprite_index,image_index,x,y+18,image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
