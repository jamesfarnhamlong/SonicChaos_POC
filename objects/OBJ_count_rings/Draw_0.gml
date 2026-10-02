vx = __view_get( e__VW.XView, 0 ) + 20;
vy = __view_get( e__VW.YView, 0 ) + 6;
if (chaos_is_thz3()) vy += global.chaosHudSlide; // type $12: visible HUD slide, 0.5 px/update

// Icon
draw_sprite(SPR_icon_ring, -1, vx, vy);

// Numbers
font = font_add_sprite(SPR_font_numbers,48,false,1);
draw_set_font(font);
draw_set_colour(c_white);
draw_set_halign(fa_left);

if (global.ring < 10)
{
    draw_sprite(SPR_font_numbers, 0, vx+18, vy+3);
    draw_text(vx+26, vy+3, string_hash_to_newline(global.ring));
}
else 
{
    draw_text(vx+18, vy+3, string_hash_to_newline(global.ring));
}

draw_set_colour(c_white);
draw_set_halign(fa_left);

