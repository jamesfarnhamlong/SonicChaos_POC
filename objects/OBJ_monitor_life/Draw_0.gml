/// @description  Players icons

draw_rectangle_colour(x+2, y+2, x+20, y+17, c_white, c_white, c_white, c_white, false);
draw_sprite(SPR_icon_players, global.player-1, x+3, y+1);

draw_self();

