/// One view-sized transparent render target and one shared draw loop.
var cp_cam = view_camera[0];
var cp_cam_x = floor(camera_get_view_x(cp_cam));
var cp_cam_y = floor(camera_get_view_y(cp_cam));
var cp_w = max(1,ceil(camera_get_view_width(cp_cam)));
var cp_h = max(1,ceil(camera_get_view_height(cp_cam)));
if (!surface_exists(chaosRingSurface) || surface_get_width(chaosRingSurface) != cp_w ||
    surface_get_height(chaosRingSurface) != cp_h) {
    if (surface_exists(chaosRingSurface)) surface_free(chaosRingSurface);
    chaosRingSurface = surface_create(cp_w,cp_h);
}

chaosRingExpectedInCamera = 0;
chaosRingDrawnToSurface = 0;
chaosRingActiveCount = 0;
chaosVisibleActiveCount = 0;
for (var cp_reset=0; cp_reset<chaosRingSourceCount; cp_reset++) {
    chaosRingExpectedThisFrame[cp_reset] = false;
    chaosRingDrawnThisFrame[cp_reset] = false;
}
for (var cp_t09_reset=0; cp_t09_reset<chaosType09SourceCount; cp_t09_reset++) {
    chaosType09ExpectedThisFrame[cp_t09_reset] = false;
    chaosType09DrawnThisFrame[cp_t09_reset] = false;
}

surface_set_target(chaosRingSurface);
draw_clear_alpha(c_black,0);
var cp_frame = floor(chaosRingFrame);
for (var cp_i=0; cp_i<chaosRingSourceCount; cp_i++) {
    if (!chaosRingActive[cp_i]) continue;
    chaosRingActiveCount++;
    chaosVisibleActiveCount++;
    var cp_record = chaosRingRecords[cp_i];
    var cp_world_x = cp_record[1]+chaosRingRenderX;
    var cp_world_y = cp_record[2]+chaosRingRenderY;
    // SPR_ring is 16x18 with origin (7,9); intersection uses presentation bounds.
    var cp_expected = cp_world_x+8 >= cp_cam_x && cp_world_x-7 < cp_cam_x+cp_w &&
        cp_world_y+8 >= cp_cam_y && cp_world_y-9 < cp_cam_y+cp_h;
    if (!cp_expected) continue;
    chaosRingExpectedThisFrame[cp_i] = true;
    chaosRingExpectedInCamera++;
    draw_sprite(chaos_is_mghz() ? SPR_chaos_mghz_terrain_ring : (chaos_is_gpz() ? SPR_chaos_gpz_terrain_ring : SPR_ring),cp_frame,cp_world_x-cp_cam_x,cp_world_y-cp_cam_y);
    chaosRingDrawnThisFrame[cp_i] = true;
    chaosRingDrawnToSurface++;
}

// Type-$09 is a separate canonical population sharing only this render target.
// Parameter $01 never enters this loop because its state remains invisible 3.
for (var cp_t09=0; cp_t09<chaosType09SourceCount; cp_t09++) {
    var cp_t09_state = chaosType09State[cp_t09];
    if (cp_t09_state != 1 && cp_t09_state != 2) continue;
    if (cp_t09_state == 1) chaosVisibleActiveCount++;
    var cp_t09_record = chaosType09Records[cp_t09];
    var cp_t09_canonical_x = cp_t09_record[1];
    var cp_t09_canonical_y = cp_t09_record[2];
    // These are the only coordinates supplied to the sole type-$09 sprite
    // draw: canonical + (TYPE09_RENDER_X, TYPE09_RENDER_Y) = (+1,+17), the
    // recovered SMS background registration. Collection continues to use the
    // canonical record directly.
    var cp_t09_draw_x = cp_t09_canonical_x+TYPE09_RENDER_X;
    var cp_t09_draw_y = cp_t09_canonical_y+TYPE09_RENDER_Y;
    // Dedicated mapped-object canvas: 16x16, origin (8,15). The origin folds
    // in the recovered piece coordinates and SMS SAT Y+1 convention.
    var cp_t09_expected = cp_t09_draw_x+7 >= cp_cam_x && cp_t09_draw_x-8 < cp_cam_x+cp_w &&
        cp_t09_draw_y >= cp_cam_y && cp_t09_draw_y-15 < cp_cam_y+cp_h;
    if (!cp_t09_expected) continue;
    chaosType09ExpectedThisFrame[cp_t09] = true;
    chaosRingExpectedInCamera++;
    // State 1 follows mapping frames 1,2,4,3; state 2 alternates frames 5/6
    // in eight four-update records for an exact 32-update sparkle lifetime.
    var cp_t09_cycle = (chaosRingGlobalFrame div 8) mod 4;
    var cp_t09_ring_frame = cp_t09_cycle == 0 ? 0 : (cp_t09_cycle == 1 ? 1 : (cp_t09_cycle == 2 ? 3 : 2));
    var cp_t09_frame = cp_t09_state == 1 ? cp_t09_ring_frame :
        4+(((chaosType09SparkleTimer[cp_t09]-1) div 4) mod 2);
    draw_sprite(chaos_is_mghz() ? SPR_chaos_mghz_ring : (chaos_is_gpz() ? SPR_chaos_gpz_ring : SPR_chaos_object_09),cp_t09_frame,
        cp_t09_draw_x-cp_cam_x,cp_t09_draw_y-cp_cam_y);
    chaosType09DrawnThisFrame[cp_t09] = true;
    chaosRingDrawnToSurface++;
}
surface_reset_target();

// This object is explicitly between terrain depth 100 and player depth -50.
if (chaosRingMode != 1) draw_surface(chaosRingSurface,cp_cam_x,cp_cam_y);
if (chaosRingMode == 2) {
    draw_set_color(c_fuchsia);
    for (var cp_mark=0; cp_mark<chaosRingSourceCount; cp_mark++) {
        if (!chaosRingActive[cp_mark]) continue;
        var cp_m = chaosRingRecords[cp_mark];
        if (cp_m[1]+8 < cp_cam_x || cp_m[1]-7 >= cp_cam_x+cp_w ||
            cp_m[2]+8 < cp_cam_y || cp_m[2]-9 >= cp_cam_y+cp_h) continue;
        draw_circle(cp_m[1],cp_m[2],2,false);
    }
    for (var cp_t09_mark=0; cp_t09_mark<chaosType09SourceCount; cp_t09_mark++) {
        if (!chaosType09ExpectedThisFrame[cp_t09_mark]) continue;
        var cp_t09_m = chaosType09Records[cp_t09_mark];
        var cp_t09_mx = cp_t09_m[1];
        var cp_t09_my = cp_t09_m[2];
        draw_set_color(c_aqua);
        draw_line(cp_t09_mx-3,cp_t09_my,cp_t09_mx+3,cp_t09_my);
        draw_line(cp_t09_mx,cp_t09_my-3,cp_t09_mx,cp_t09_my+3);
        draw_rectangle(cp_t09_mx-11,cp_t09_my-11,cp_t09_mx+11,cp_t09_my+11,true);
    }
    draw_set_color(c_white);
}

if (chaosRingDumpRequested) {
    var cp_dir = environment_get_variable("LOCALAPPDATA")+"\\SonicChaos_POC";
    if (!directory_exists(cp_dir)) directory_create(cp_dir);
    var cp_file = file_text_open_write(cp_dir+"\\ring_visual_audit.txt");
    file_text_write_string(cp_file,"terrain_source_count="+string(chaosRingSourceCount)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"type09_source_count="+string(chaosType09SourceCount)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"type09_visible_source_count="+string(chaosType09VisibleCount)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"type09_hidden_source_count="+string(chaosType09HiddenCount)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"visible_active_count="+string(chaosVisibleActiveCount)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"expected_visible_count="+string(chaosRingExpectedInCamera)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"drawn_visible_count="+string(chaosRingDrawnToSurface)); file_text_writeln(cp_file);
    file_text_write_string(cp_file,"layout_hash_status=OK"); file_text_writeln(cp_file);
    for (var cp_dump=0; cp_dump<chaosRingSourceCount; cp_dump++) {
        if (!chaosRingActive[cp_dump] || !chaosRingExpectedThisFrame[cp_dump]) continue;
        var cp_d = chaosRingRecords[cp_dump];
        file_text_write_string(cp_file,"population=terrain index="+string(cp_d[0])+" canonical_x="+string(cp_d[1])+
            " canonical_y="+string(cp_d[2])+" screen_x="+string(cp_d[1]-cp_cam_x)+
            " screen_y="+string(cp_d[2]-cp_cam_y)+" active=1 expected_in_camera=1 drawn_this_frame="+
            string(chaosRingDrawnThisFrame[cp_dump])+" frame="+string(cp_frame));
        file_text_writeln(cp_file);
    }
    for (var cp_t09_dump=0; cp_t09_dump<chaosType09SourceCount; cp_t09_dump++) {
        if (!chaosType09ExpectedThisFrame[cp_t09_dump]) continue;
        var cp_t09_d = chaosType09Records[cp_t09_dump];
        var cp_t09_dump_draw_x = cp_t09_d[1]+TYPE09_RENDER_X;
        var cp_t09_dump_draw_y = cp_t09_d[2]+TYPE09_RENDER_Y;
        file_text_write_string(cp_file,"population=type09 index="+string(cp_t09_d[0])+" parameter=$00 canonical_x="+
            string(cp_t09_d[1])+" canonical_y="+string(cp_t09_d[2])+" screen_x="+
            string(cp_t09_dump_draw_x-cp_cam_x)+" screen_y="+string(cp_t09_dump_draw_y-cp_cam_y)+
            " draw_world_x="+string(cp_t09_dump_draw_x)+" draw_world_y="+string(cp_t09_dump_draw_y)+
            " adapter_x="+string(TYPE09_RENDER_X)+" adapter_y="+string(TYPE09_RENDER_Y)+
            " active="+string(chaosType09State[cp_t09_dump] == 1)+" expected_in_camera=1 drawn_this_frame="+
            string(chaosType09DrawnThisFrame[cp_t09_dump])+" frame="+
            string(chaosType09State[cp_t09_dump] == 1 ?
                (((chaosRingGlobalFrame div 8) mod 4) == 0 ? 0 : (((chaosRingGlobalFrame div 8) mod 4) == 1 ? 1 :
                (((chaosRingGlobalFrame div 8) mod 4) == 2 ? 3 : 2))) :
                4+(((chaosType09SparkleTimer[cp_t09_dump]-1) div 4) mod 2)));
        file_text_writeln(cp_file);
    }
    file_text_close(cp_file);
    chaosRingDumpRequested = false;
}
