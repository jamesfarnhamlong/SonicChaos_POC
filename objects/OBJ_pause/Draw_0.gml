/// @description  Black Background

draw_set_alpha(alpha);
draw_sprite_stretched (SPR_black_screen, -1, __view_get( e__VW.XView, 0 ), __view_get( e__VW.YView, 0 ), 1000, 1000);
draw_set_alpha(1);

/// Transition Effect

if (fade == "in") exit;

/// Icon + Zone Name

font = font_add_sprite(SPR_font_system,46,true,2);
draw_set_font(font);
    
draw_sprite(SPR_data_zones,loadIcon,__view_get( e__VW.XView, 0 )+(__view_get( e__VW.WView, 0 )/2),__view_get( e__VW.YView, 0 )+52);
draw_sprite_ext(SPR_data_form_2,-1,__view_get( e__VW.XView, 0 )+(__view_get( e__VW.WView, 0 )/2),__view_get( e__VW.YView, 0 )+50,1,1,0,c_yellow_dark,1);
draw_set_halign(fa_center);
draw_set_colour(c_yellow_dark);
draw_text(__view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 )/2,__view_get( e__VW.YView, 0 )+100,string_hash_to_newline(loadZone));
draw_set_colour(c_white);
draw_set_halign(fa_left);

/// Options

font = font_add_sprite(SPR_font_system,46,false,1);
draw_set_font(font);

draw_set_halign(fa_center);
draw_set_colour(c1);
draw_text(__view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 )/2, __view_get( e__VW.YView, 0 )+__view_get( e__VW.HView, 0 )-60, string_hash_to_newline("resume game"));
draw_set_colour(c2);
draw_text(__view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 )/2, __view_get( e__VW.YView, 0 )+__view_get( e__VW.HView, 0 )-45, string_hash_to_newline("back to menu"));
draw_set_colour(c_white);
draw_set_halign(fa_left);

/// Buttons

vx = __view_get( e__VW.XView, 0 ) + xstart;
vy = __view_get( e__VW.YView, 0 ) + ystart;

draw_set_alpha(trans1);
draw_sprite (SPR_button_dpad, -1, vx+19, vy+__view_get( e__VW.HView, 0 )-71);
draw_sprite (SPR_button_action, -1, vx+__view_get( e__VW.WView, 0 )-51, vy+__view_get( e__VW.HView, 0 )-54);
draw_set_alpha(1);
    
// Press
draw_set_alpha(trans2);

if (press_up == 1)
{
    draw_sprite (SPR_button_dpad_press, 0, vx+19, vy+__view_get( e__VW.HView, 0 )-71);
}
if (press_down == 1)
{
    draw_sprite (SPR_button_dpad_press, 1, vx+19, vy+__view_get( e__VW.HView, 0 )-71);
}
if (press_action == 1)
{
    draw_sprite (SPR_button_action_press, -1, vx+__view_get( e__VW.WView, 0 )-51, vy+__view_get( e__VW.HView, 0 )-54);
}

draw_set_alpha(1);


