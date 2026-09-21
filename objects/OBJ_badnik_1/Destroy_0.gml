/// @description  Acitons

// Effect
instance_create(x,y,OBJ_explosion);

// Player Jump
with(OBJ_player_char)
{
    SCR_physics_jump_objects();
}

