/// Nontransparent pixels in SMS $1000 mapping cells draw above player depth -50.
if (chaosTerrainForegroundSprite == -1) exit;
var cp_cam = view_camera[0];
var cp_left = max(0,floor(camera_get_view_x(cp_cam)/32));
var cp_top = max(0,floor(camera_get_view_y(cp_cam)/32));
var cp_right = min(global.chaosMapWidth-1,floor((camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)-1)/32));
var cp_bottom = min(floor((array_length(global.chaosTileIds)-1)/global.chaosMapWidth),
    floor((camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam)-1)/32));
for (var cp_row=cp_top; cp_row<=cp_bottom; cp_row++) {
    for (var cp_col=cp_left; cp_col<=cp_right; cp_col++) {
        var cp_index=cp_row*global.chaosMapWidth+cp_col;
        if (cp_index >= array_length(global.chaosTileIds)) continue;
        var cp_block=global.chaosTileIds[cp_index];
        draw_sprite_part(chaosTerrainForegroundSprite,0,(cp_block mod 16)*32,
            floor(cp_block/16)*32,32,32,cp_col*32,cp_row*32);
    }
}
