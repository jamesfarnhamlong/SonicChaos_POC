/// @description  Sprites

vx = __view_get( e__VW.XView, 0 ) + xstart;
vy = __view_get( e__VW.YView, 0 ) + ystart;

// Buttons
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
if (press_left == 1)
{
    draw_sprite (SPR_button_dpad_press, 2, vx+19, vy+__view_get( e__VW.HView, 0 )-71);
}
if (press_right == 1) 
{
    draw_sprite (SPR_button_dpad_press, 3, vx+19, vy+__view_get( e__VW.HView, 0 )-71);
}
if (press_action == 1) 
{
    draw_sprite (SPR_button_action_press, -1, vx+__view_get( e__VW.WView, 0 )-51, vy+__view_get( e__VW.HView, 0 )-54);
}
draw_set_alpha(1);

/// Pause

vx = __view_get( e__VW.XView, 0 ) + xstart;
vy = __view_get( e__VW.YView, 0 ) + ystart;

draw_set_alpha(trans3);
draw_sprite (SPR_button_pause, -1, vx+__view_get( e__VW.WView, 0 )-79, vy+18);
draw_set_alpha(1);

