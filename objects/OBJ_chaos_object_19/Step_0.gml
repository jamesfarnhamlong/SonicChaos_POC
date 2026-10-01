if (!instance_exists(OBJ_player_char)) exit;
var cp_p = instance_find(OBJ_player_char,0);
if (!variable_instance_exists(cp_p,"chaosCore")) exit;
var cp_c = cp_p.chaosCore;
if (chaos_goal_child_step(chaosChild, cp_p.chaosGrounded, cp_c.state == 32 || cp_c.next == 32)) chaos_goal_request_state20(cp_c);
