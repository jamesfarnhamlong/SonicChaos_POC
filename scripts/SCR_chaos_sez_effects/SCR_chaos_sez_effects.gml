/// SEZ S1 effect 5: canonical three-update uploads; absolute clock phase unresolved.
function chaos_sez_effect_new() { return {frame:0,tick:0,image:0}; }
/// Only S1 manifest-proven generic EDGE types use this placement shell.
/// Reuses accepted scan/retention functions; never changes the canonical anchor.
function chaos_sez_mapped_init(cp_o,cp_r) {
    cp_o.chaosPlacementX=cp_r[1]; cp_o.chaosPlacementY=cp_r[2];
    cp_o.chaosLive=false; cp_o.chaosAsleep=true; cp_o.chaosWoken=false;
    cp_o.chaosScanTick=0; cp_o.chaosInitialFillDone=false; cp_o.chaosSezRecreated=false;
}
function chaos_sez_mapped_awake(cp_o,cp_x,cp_y) {
    var cp_vp=chaos_vp_current();
    if (!cp_o.chaosLive) {
        if (!SCR_chaos_placement_scan(cp_o,cp_vp,cp_o.chaosPlacementX,cp_o.chaosPlacementY)) return false;
        cp_o.chaosLive=true; cp_o.chaosAsleep=true; cp_o.chaosSezRecreated=true;
        cp_x=cp_o.chaosPlacementX; cp_y=cp_o.chaosPlacementY;
    }
    var cp_cell=SCR_chaos_lifetime_cell(cp_o,cp_vp,cp_x,cp_y);
    cp_o.chaosAsleep=cp_cell >= 2;
    if (cp_cell == 3) cp_o.chaosLive=false;
    return cp_o.chaosLive && !cp_o.chaosAsleep;
}
function chaos_sez_effect_step(cp_e,cp_boss_active,cp_palette_control) {
    cp_e.frame++;
    if (cp_palette_control != 0 || cp_boss_active) return;
    cp_e.tick++;
    if ((cp_e.tick mod 3) == 0) cp_e.image=((cp_e.tick div 3) mod 2) == 1 ? 1 : 2;
}
function chaos_sez_terrain_dynamic(cp_front) {
    var cp_filter=gpu_get_texfilter(); gpu_set_texfilter(false);
    var cp_cam=view_camera[0];
    var cp_left=max(0,floor(camera_get_view_x(cp_cam)/32));
    var cp_top=max(0,floor(camera_get_view_y(cp_cam)/32));
    var cp_right=min(global.chaosMapWidth-1,floor((camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam)-1)/32));
    var cp_bottom=min(31,floor((camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam)-1)/32));
    var cp_effect=cp_front ? SPR_chaos_sez_effect5_front : SPR_chaos_sez_effect5;
    for (var cp_row=cp_top; cp_row<=cp_bottom; cp_row++) {
        for (var cp_col=cp_left; cp_col<=cp_right; cp_col++) {
            var cp_index=cp_row*global.chaosMapWidth+cp_col;
            if (cp_index >= 4095) continue; // unloaded sentinel is never terrain
            var cp_block=global.chaosTileIds[cp_index];
            if (cp_block >= 64 && cp_block <= 69) cp_block=70;
            var cp_sx=(cp_block mod 16)*32,cp_sy=(cp_block div 16)*32;
            var cp_x=cp_col*32,cp_y=cp_row*32;
            if (!cp_front && (cp_block == 155 || cp_block == 156 || cp_block == 71))
                draw_sprite_part(SPR_chaos_sez_blocks,0,cp_sx,cp_sy,32,32,cp_x,cp_y);
            draw_sprite_part(cp_effect,global.chaosSezEffects.image,cp_sx,cp_sy,32,32,cp_x,cp_y);
        }
    }
    gpu_set_texfilter(cp_filter);
}
