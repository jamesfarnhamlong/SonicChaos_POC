// GAME MAKER PRESENTATION ADAPTER: source placement and interaction keep the
// canonical instance anchor. Only intact TV graphics render 18px lower.
if (chaosConsumed) { draw_self(); exit; }
draw_sprite_ext(sprite_index,image_index,x,y+18,image_xscale,image_yscale,
    image_angle,image_blend,image_alpha);
