// POC 20 temporary grounded presentation policy. Policy +17 plus the shared
// recovered SAT +1 yields the accepted +18 draw anchor. This is not claimed as
// final ROM registration; physics, +18 probe and contact use canonical y.
var cp_render_anchor_y = SCR_chaos_mapped_render_y(y,17);
draw_sprite_ext(sprite_index,image_index,x,cp_render_anchor_y,image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
