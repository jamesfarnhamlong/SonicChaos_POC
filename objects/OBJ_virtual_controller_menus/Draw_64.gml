/// @description  Touch Map

global.virtualUp = virtual_key_add (33, __view_get( e__VW.HView, 0 )-89, 26, 32, vk_up);
global.virtualDown = virtual_key_add (33, __view_get( e__VW.HView, 0 )-33, 26, 32, vk_down);
global.virtualLeft = virtual_key_add (2, __view_get( e__VW.HView, 0 )-71, 30, 54, vk_left);
global.virtualRight = virtual_key_add (60, __view_get( e__VW.HView, 0 )-71, 30, 54, vk_right);
global.virtualSpace = virtual_key_add (__view_get( e__VW.WView, 0 )-63, __view_get( e__VW.HView, 0 )-65, 50, 50, vk_space);

display_set_gui_size (__view_get( e__VW.WView, 0 ),__view_get( e__VW.HView, 0 ));


