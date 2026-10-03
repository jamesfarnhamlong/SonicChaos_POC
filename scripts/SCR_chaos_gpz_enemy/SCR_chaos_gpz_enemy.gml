/// ROM $5F54 conversion: ordinary defeat detaches placement token but retains occupancy.
/// The POC destroys the bounded placement shell permanently until the room is reset.
function chaos_gpz_enemy_defeat(cp_o) {
    cp_o.chaosSilentDestroy=true;
    var cp_smoke=instance_create(cp_o.x,cp_o.y,OBJ_chaos_gpz_smoke_0F);
    cp_smoke.chaosPlacementToken=0;
}

/// $25 strict unsigned-word patrol bound helper ($62D5); equality never reverses.
function chaos_gpz_patrol_reverse(cp_xu,cp_vx,cp_left,cp_right) {
    var cp_x=floor(cp_xu/256)&$FFFF;
    return cp_vx < 0 ? cp_x < (cp_left&$FFFF) : cp_x > (cp_right&$FFFF);
}

/// $77CB -> $70E7 uses the shared floor-profile projection, including the
/// upper-cell correction when a full block is encountered. Keep +18 in the
/// probe only. The older bounded THZ object helper omits that upper-cell path.
function chaos_gpz_enemy_floor_project(cp_x,cp_y,cp_vy) {
    var cp_s=SCR_cc_lookup(floor(cp_x),floor(cp_y)+18,0);
    var cp_c=SCR_cc_new(cp_x,cp_y);
    cp_c.previous=cp_s.flags; cp_c.vy=cp_vy;
    SCR_cc_project_floor(cp_c,cp_s);
    return {grounded:(cp_c.bg&2)!=0,y:cp_c.yu/256};
}
