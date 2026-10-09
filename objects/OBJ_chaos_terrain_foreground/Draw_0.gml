chaos_aqz_palette_begin(false);
/// Nontransparent pixels in SMS $1000 mapping cells draw above player depth -50.
if (chaosTerrainForegroundSprite == -1) { chaos_aqz_palette_end(); exit; }
// MGHZ transparent atlas parts must not sample the neighbouring block's
// priority pixels. Restore the caller's filter after this complete pass.
var cp_mghz_filter=gpu_get_texfilter();
if (chaos_is_mghz() || chaos_is_sez()) gpu_set_texfilter(false);
var cp_cam = view_camera[0];
var cp_left = max(0,floor(camera_get_view_x(cp_cam)/32));
var cp_top = max(0,floor(camera_get_view_y(cp_cam)/32));
var cp_right = min(global.chaosMapWidth-1,floor((camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)-1)/32));
var cp_bottom = min(floor((array_length(global.chaosTileIds)-1)/global.chaosMapWidth),
    floor((camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam)-1)/32));
for (var cp_row=cp_top; cp_row<=cp_bottom; cp_row++) {
    for (var cp_col=cp_left; cp_col<=cp_right; cp_col++) {
        var cp_index=cp_row*global.chaosMapWidth+cp_col;
        if (cp_index >= array_length(global.chaosTileIds) || (chaos_is_sez() && cp_index >= 4095)) continue;
        var cp_block=global.chaosTileIds[cp_index];
        draw_sprite_part(chaosTerrainForegroundSprite,0,(cp_block mod 16)*32,
            floor(cp_block/16)*32,32,32,cp_col*32,cp_row*32);
    }
}

if (chaos_is_mghz()) chaos_mghz_terrain_dynamic(true);
if (chaos_is_mghz() || chaos_is_sez()) gpu_set_texfilter(cp_mghz_filter);

if (chaos_is_sez()) chaos_sez_terrain_dynamic(true);

if (chaos_is_aqz()) chaos_aqz_terrain_dynamic(true);

chaos_aqz_palette_end();
