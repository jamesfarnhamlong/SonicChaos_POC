// Collision flag $41: allow rising through; ROM profile handles landing.
if (room == ROM_chaos_thz1 && instance_exists(OBJ_player)) {
    var runner = instance_find(OBJ_player,0);
    solid = !runner.chaosLoopActive && runner.vspeed >= 0 && runner.bbox_bottom <= y;
}
