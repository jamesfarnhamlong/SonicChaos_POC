// POC 19.1 Windows presentation override: display only is 18 pixels below
// the verified physics anchor. Physics, floor probe and contact stay unchanged.
draw_sprite_ext(sprite_index,image_index,x,y+18,image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
