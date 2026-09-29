/// @description GameMaker-only presentation offsets for canonical THZ1 object anchors.
/// These values must never be used by collision, movement, placement, or lifetime code.
#macro TYPE09_RENDER_X 0
#macro TYPE09_RENDER_Y 0
#macro TYPE10_RENDER_X 0
#macro TYPE10_RENDER_Y_ADAPTER 18
#macro TYPE18_RENDER_X 0
#macro TYPE18_RENDER_Y_ADAPTER 22
#macro TYPE21_RENDER_X 0
#macro TYPE21_RENDER_Y_ADAPTER 18

function chaos_render_offset_x(cp_type) {
    switch (cp_type) {
        case $09: return TYPE09_RENDER_X;
        case $10: return TYPE10_RENDER_X;
        case $18: return TYPE18_RENDER_X;
        case $21: return TYPE21_RENDER_X;
    }
    return 0;
}

function chaos_render_offset_y(cp_type) {
    switch (cp_type) {
        // +8 failed Windows acceptance. Keep zero until ROM/emulator research
        // establishes the missing presentation-stage detail.
        case $09: return TYPE09_RENDER_Y;
        // Retained accepted POC presentation policies; not canonical ROM coordinates.
        case $10: return TYPE10_RENDER_Y_ADAPTER;
        case $18: return TYPE18_RENDER_Y_ADAPTER;
        case $21: return TYPE21_RENDER_Y_ADAPTER;
    }
    return 0;
}
