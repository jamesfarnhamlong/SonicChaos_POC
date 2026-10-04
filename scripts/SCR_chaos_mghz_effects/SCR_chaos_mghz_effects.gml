/// MGHZ effects $02/$03/$0E. ROM-routine event phase starts at slot init;
/// phase against the original global PAL frame clock remains unresolved.
function chaos_mghz_effect_new() {
    return {frame:0, palette_tick:0, strip_tick:0, strip_frame:0, cram4:62, cram11:48};
}
function chaos_mghz_effect_step(cp_e,cp_boss_active,cp_palette_control) {
    cp_e.frame++;
    if (cp_palette_control != 0) return; // dispatcher $D492
    cp_e.palette_tick++;
    // First writes are on call 10 (Research labels that update 9).
    if ((cp_e.palette_tick mod 10) == 0) {
        var cp_phase=(cp_e.palette_tick div 10)-1;
        var cp_cycle2=[48,0,20,40,0,0];
        var cp_cycle3=[20,40,0,17,60,40,0,20,51,0];
        cp_e.cram4=cp_cycle2[cp_phase mod 6];
        cp_e.cram11=cp_cycle3[cp_phase mod 10];
    }
    // $D44E freezes the complete slot: pause countdown as well as pixels.
    if (cp_boss_active) return;
    cp_e.strip_tick++;
    if ((cp_e.strip_tick mod 4) == 0) cp_e.strip_frame=((cp_e.strip_tick div 4) mod 2) == 1 ? 1 : 2;
}
function chaos_mghz_cram_colour(cp_value) {
    return make_color_rgb((cp_value&3)*85,((cp_value>>2)&3)*85,((cp_value>>4)&3)*85);
}
function chaos_mghz_terrain_dynamic(cp_front) {
    // Parts share an atlas with neighbouring blocks. Linear filtering samples
    // across those internal boundaries at fractional camera coordinates,
    // leaking palette-mask pixels into otherwise empty green cells.
    var cp_filter=gpu_get_texfilter();
    gpu_set_texfilter(false);
    var cp_cam=view_camera[0];
    var cp_left=max(0,floor(camera_get_view_x(cp_cam)/32));
    var cp_top=max(0,floor(camera_get_view_y(cp_cam)/32));
    var cp_right=min(global.chaosMapWidth-1,floor((camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)-1)/32));
    var cp_bottom=min(room_height div 32-1,floor((camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam)-1)/32));
    var cp_e=global.chaosMghzEffects;
    var cp_mask4=cp_front ? SPR_chaos_mghz_palette_4_front : SPR_chaos_mghz_palette_4;
    var cp_mask11=cp_front ? SPR_chaos_mghz_palette_11_front : SPR_chaos_mghz_palette_11;
    var cp_strip=cp_front ? SPR_chaos_mghz_strip_front : SPR_chaos_mghz_strip;
    for (var cp_row=cp_top; cp_row<=cp_bottom; cp_row++) {
        for (var cp_col=cp_left; cp_col<=cp_right; cp_col++) {
            var cp_index=cp_row*global.chaosMapWidth+cp_col;
            if (cp_index >= 4095) continue; // original loader: no manufactured 4096th cell
            var cp_block=global.chaosTileIds[cp_index];
            // Terrain-ring pixels belong to their manager, replacement art to $46.
            if (cp_block >= 64 && cp_block <= 69) cp_block=70;
            var cp_sx=(cp_block mod 16)*32, cp_sy=(cp_block div 16)*32;
            var cp_x=cp_col*32, cp_y=cp_row*32;
            if (!cp_front && (cp_block == 155 || cp_block == 156)) draw_sprite_part(SPR_chaos_mghz_blocks,0,cp_sx,cp_sy,32,32,cp_x,cp_y);
            draw_sprite_part_ext(cp_mask4,0,cp_sx,cp_sy,32,32,cp_x,cp_y,1,1,chaos_mghz_cram_colour(cp_e.cram4),1);
            draw_sprite_part_ext(cp_mask11,0,cp_sx,cp_sy,32,32,cp_x,cp_y,1,1,chaos_mghz_cram_colour(cp_e.cram11),1);
            draw_sprite_part(cp_strip,cp_e.strip_frame,cp_sx,cp_sy,32,32,cp_x,cp_y);
        }
    }
    gpu_set_texfilter(cp_filter);
}
