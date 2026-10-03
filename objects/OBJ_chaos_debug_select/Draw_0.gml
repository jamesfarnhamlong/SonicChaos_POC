// Logical canvas scales into widescreen and retro views.
var cp_w = __view_get(e__VW.WView, 0);
var cp_h = __view_get(e__VW.HView, 0);
var cp_scale = min(cp_w / 420, cp_h / 250);
var cp_x = (cp_w - 420 * cp_scale) / 2;
var cp_y = (cp_h - 250 * cp_scale) / 2;
draw_set_font(-1);
draw_set_halign(fa_left);
draw_set_valign(fa_top);
draw_set_color(c_white);
draw_text_transformed(cp_x + 8 * cp_scale, cp_y, "DEVELOPER LEVEL SELECT", cp_scale, cp_scale, 0);
for (var cp_z = 0; cp_z < 6; cp_z++) {
    var cp_yrow = cp_y + (30 + cp_z * 20) * cp_scale;
    draw_set_color(c_white);
    draw_text_transformed(cp_x + 8 * cp_scale, cp_yrow, entries[cp_z * 3].zone, cp_scale, cp_scale, 0);
    for (var cp_a = 0; cp_a < 3; cp_a++) {
        var cp_i = cp_z * 3 + cp_a;
        draw_set_color(selected == cp_i ? c_yellow : (entries[cp_i].enabled ? c_white : c_gray));
        var cp_label = (selected == cp_i ? ">" : " ") + "ACT-" + string(entries[cp_i].act);
        draw_text_transformed(cp_x + (230 + cp_a * 62) * cp_scale, cp_yrow, cp_label, cp_scale, cp_scale, 0);
    }
}
draw_set_color(c_white);
draw_text_transformed(cp_x + 8 * cp_scale, cp_y + 153 * cp_scale, "DEV TESTS (RESERVED)", cp_scale, cp_scale, 0);
for (var cp_t = 18; cp_t < array_length(entries); cp_t++) {
    draw_set_color(selected == cp_t ? c_yellow : c_gray);
    draw_text_transformed(cp_x + 8 * cp_scale, cp_y + (170 + (cp_t - 18) * 17) * cp_scale,
        (selected == cp_t ? "> " : "  ") + entries[cp_t].zone, cp_scale, cp_scale, 0);
}
draw_set_color(c_white);
draw_text_transformed(cp_x + 8 * cp_scale, cp_y + 223 * cp_scale, "ARROWS / D-PAD  SPACE / A: START  ESC / B: TITLE", cp_scale * 0.8, cp_scale * 0.8, 0);
draw_text_transformed(cp_x + 8 * cp_scale, cp_y + 237 * cp_scale, message == "" ? "GRAY = UNAVAILABLE    F10 IN LEVEL: RETURN" : message, cp_scale * 0.8, cp_scale * 0.8, 0);
