vx = __view_get( e__VW.XView, 0 ) + 22;
vy = __view_get( e__VW.YView, 0 ) + 25;

font = font_add_sprite(SPR_font_numbers, 48, false, 1);
draw_set_font(font);
draw_set_colour(c_white);
draw_set_halign(fa_left);

// Minutes
if (zeroX == 8)
{
    draw_sprite(SPR_font_numbers, 0, vx, vy);
}
draw_text(vx+zeroX, vy, string_hash_to_newline(global.minutes));

// Two Points
draw_sprite(SPR_font_two_points, -1, vx+zeroX+10, vy);

// Seconds
if (global.seconds < 10)
{
    draw_sprite(SPR_font_numbers, 0, vx+zeroX+16, vy);
    draw_text(vx+zeroX+24, vy, string_hash_to_newline(global.seconds));
}
else 
{
    draw_text(vx+zeroX+16, vy, string_hash_to_newline(global.seconds));
}

draw_set_colour(c_white);
draw_set_halign(fa_left);

