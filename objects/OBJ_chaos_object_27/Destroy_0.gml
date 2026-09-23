if (!chaosSilentDestroy) {
    instance_create(x,y,OBJ_explosion);
    with (OBJ_player_char) SCR_physics_jump_objects();
}
