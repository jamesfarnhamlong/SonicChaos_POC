// POC 20 mapped-object presentation. Room/ROM y remains the canonical anchor;
// the shared helper owns recovered SAT Y+1 and any explicit temporary policy.
if (chaosConsumed) { draw_self(); exit; }
chaosCanonicalAnchorY = y;
chaosRenderAnchorY = SCR_chaos_mapped_render_y(chaosCanonicalAnchorY,chaosRenderPolicyY);
chaosCanvasOriginY = sprite_get_yoffset(sprite_index);
chaosFirstVisiblePixelY = chaosRenderAnchorY+chaosFirstVisibleRelativeY;
chaosLastVisiblePixelY = chaosRenderAnchorY+chaosLastVisibleRelativeY;
draw_sprite_ext(sprite_index,image_index,x,chaosRenderAnchorY,image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
