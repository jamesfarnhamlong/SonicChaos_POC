/// SOLO is decisive: overwrite completed game output, then show only the ring surface.
if (chaosRingMode == 1) {
    draw_set_color(c_black);
    draw_rectangle(0,0,display_get_gui_width(),display_get_gui_height(),false);
    draw_set_color(c_white);
    if (surface_exists(chaosRingSurface)) draw_surface(chaosRingSurface,0,0);
}

// Detailed diagnostics live in the F9 audit file. F8 modes retain only a
// small unobtrusive label; normal gameplay draws no ring debug text.
if (chaosRingMode != 0) {
    draw_set_halign(fa_left); draw_set_valign(fa_top); draw_set_font(-1);
    draw_set_alpha(1); draw_set_color(c_white);
    draw_text(4,4,chaosRingMode == 1 ? "RING SOLO" : "RING COVERAGE");
}
