/// @description  Options

font = font_add_sprite(SPR_font_system,46,true,3);
draw_set_font(font);

draw_set_halign(fa_left);

draw_text_colour(x-80,yy,string_hash_to_newline("music: "+string(t1)),c1,c1,c1,c1,1);
draw_text_colour(x-80,yy+16,string_hash_to_newline("buttons: "+string(t2)),c2,c2,c2,c2,1);
draw_text_colour(x-80,yy+16*2,string_hash_to_newline("window size: "+string(t3)),c3,c3,c3,c3,1);
draw_text_colour(x-80,yy+16*3,string_hash_to_newline("screen size: "+string(t4)),c4,c4,c4,c4,1);
draw_text_colour(x-80,yy+16*4,string_hash_to_newline("back"),c5,c5,c5,c5,1);

draw_set_halign(fa_left);

