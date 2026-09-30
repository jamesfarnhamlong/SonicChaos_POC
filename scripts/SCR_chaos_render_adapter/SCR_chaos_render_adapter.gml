/// @description GameMaker-only presentation offsets for canonical THZ1 object anchors.
/// These values must never be used by collision, movement, placement, or lifetime code.
// Type $09: ROM research (sonic-chaos-reference 3b302be) proves one shared SMS presentation
// relationship: X +1 (R8 = -(cam_x+1)), Y +18 (R9 = (cam_y+17) mod 224 plus SAT Y+1).
// The dedicated $09 asset already folds SAT Y+1 into its origin, so only X +1, Y +17 remain.
#macro TYPE09_RENDER_X 1
#macro TYPE09_RENDER_Y 17
#macro TYPE10_RENDER_X 0
#macro TYPE10_RENDER_Y_ADAPTER 18
#macro TYPE18_RENDER_X 0
#macro TYPE18_RENDER_Y_ADAPTER 22
#macro TYPE21_RENDER_X 0
#macro TYPE21_RENDER_Y_ADAPTER 18
// Type $27: ROM-derived mapped-object registration (visible rows +3..+17 below the anchor; the plain draw was 18 px too high,
// docs/mapped-object-screen-registration.md) and confirmed against the SMS emulator in Windows testing. A class-wide GameMaker
// presentation correction, NOT a canonical placement offset; collision, trigger and movement keep the canonical anchor.
#macro TYPE27_RENDER_X 0
#macro TYPE27_RENDER_Y 18

function chaos_render_offset_x(cp_type) {
    switch (cp_type) {
        case $09: return TYPE09_RENDER_X;
        case $10: return TYPE10_RENDER_X;
        case $18: return TYPE18_RENDER_X;
        case $21: return TYPE21_RENDER_X;
        case $27: return TYPE27_RENDER_X;
    }
    return 0;
}

function chaos_render_offset_y(cp_type) {
    switch (cp_type) {
        // The earlier +8 experiment failed Windows acceptance. 17 is the recovered
        // R9 (cam_y+17) term; the asset origin already contains the SAT Y+1 term.
        case $09: return TYPE09_RENDER_Y;
        // Retained accepted POC presentation policies; not canonical ROM coordinates.
        case $10: return TYPE10_RENDER_Y_ADAPTER;
        case $18: return TYPE18_RENDER_Y_ADAPTER;
        case $21: return TYPE21_RENDER_Y_ADAPTER;
        case $27: return TYPE27_RENDER_Y;
    }
    return 0;
}
