/// @description  Icons

vx = __view_get( e__VW.XView, 0 ) + __view_get( e__VW.WView, 0 ) - 66;
vy = __view_get( e__VW.YView, 0 ) + 14;

// Player
draw_sprite(SPR_icon_life, 0, vx, vy);

if (global.playerSuper == true)
{
    draw_sprite(SPR_icon_players_super, global.player-1, vx, vy);
} 
else
{
    draw_sprite(SPR_icon_players, global.player-1, vx, vy);
}

// Separator
draw_sprite(SPR_font_x, -1, vx+22, vy);

/// Numbers

vx = __view_get( e__VW.XView, 0 ) + __view_get( e__VW.WView, 0 ) - 35;
vy = __view_get( e__VW.YView, 0 ) + 17;

font = font_add_sprite(SPR_font_numbers,48,false,1);
draw_set_font(font);
draw_set_colour(c_white);
draw_set_halign(fa_left);

if (global.life < 10)
{
    draw_text(vx, vy, string_hash_to_newline("0"));
    draw_text(vx+8, vy, string_hash_to_newline(global.life));
}
else
{
    draw_text(vx, vy, string_hash_to_newline(global.life));
}

draw_set_colour(c_white);
draw_set_halign(fa_left);

