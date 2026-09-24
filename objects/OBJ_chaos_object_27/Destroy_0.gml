if (!chaosSilentDestroy) {
    instance_create(x,y,OBJ_explosion);
    var cp_p = instance_find(OBJ_player,0);
    if (instance_exists(cp_p)) with (cp_p) SCR_physics_jump_objects();
}
