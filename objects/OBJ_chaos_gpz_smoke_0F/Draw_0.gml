// MGHZ enemy defeat reuses the accepted MGHZ $0F poof resource (no separate approved smoke board exists); like the monitor poof it is drawn at the converted anchor.
if (variable_instance_exists(id,"chaosAnchorDraw") && chaosAnchorDraw) draw_sprite(sprite_index,image_index,x,y);
else draw_sprite(sprite_index,image_index,x+1,y+18);
