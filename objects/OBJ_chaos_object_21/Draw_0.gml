// GameMaker-only presentation adapter. The canonical physics/patrol anchor
// and the +18 floor probe remain independent of this renderer policy.
// The MGHZ resource (alt start) carries the approved SAT registration (+1,+18) in its origin and both runtime orientations as frames, so it draws at the anchor.
var cp_dx = chaosAltStart ? 0 : chaos_render_offset_x($21);
var cp_dy = chaosAltStart ? 0 : chaos_render_offset_y($21);
draw_sprite_ext(sprite_index,image_index,
    x+cp_dx,y+cp_dy,image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
