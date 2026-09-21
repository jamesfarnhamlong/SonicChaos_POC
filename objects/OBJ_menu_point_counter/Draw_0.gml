/// @description Score Time Rings

draw_sprite(SPR_point_counter_text,-1,160,242);

font = font_add_sprite(SPR_font_numbers,48,false,1);
draw_set_font(font);

draw_set_colour(c_white);
draw_set_halign(fa_right);
draw_text(336,242,string_hash_to_newline(score));
draw_text(336,266,string_hash_to_newline(global.timeBonus));
draw_text(298,290,string_hash_to_newline(global.ringBonus));
draw_set_colour(c_white);
draw_set_halign(fa_right);

