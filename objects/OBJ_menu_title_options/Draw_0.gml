/// @description  Options

font = font_add_sprite(SPR_font_system,46,true,3);
draw_set_font(font);

draw_set_halign(fa_center);

draw_text_colour(x,y,string_hash_to_newline("start game"),c1,c1,c1,c1,1);
draw_text_colour(x,y+16,string_hash_to_newline("options"),c2,c2,c2,c2,1);

draw_set_halign(fa_left);

