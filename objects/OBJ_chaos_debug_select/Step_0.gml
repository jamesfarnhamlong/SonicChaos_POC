SCR_buttons();
var cp_row = selected < 18 ? floor(selected / 3) : 6 + selected - 18;
var cp_col = selected < 18 ? selected mod 3 : 0;
var cp_rows = 6 + array_length(entries) - 18;
if (global.btUpPress) cp_row = (cp_row + cp_rows - 1) mod cp_rows;
if (global.btDownPress) cp_row = (cp_row + 1) mod cp_rows;
if (cp_row < 6) {
    if (global.btLeftPress) cp_col = (cp_col + 2) mod 3;
    if (global.btRightPress) cp_col = (cp_col + 1) mod 3;
    selected = cp_row * 3 + cp_col;
} else selected = 18 + cp_row - 6;
if (global.btSpacePress || global.btStartPress) {
    if (!chaos_debug_launch(entries[selected])) message = "UNAVAILABLE - ROOM NOT IMPLEMENTED";
}
if (keyboard_check_pressed(vk_escape) || global.btAPress) room_goto(ROM_menu_title);
