if (!instance_exists(chaos_goal_player())) exit;
var cp_p = chaos_goal_player();
if (!variable_instance_exists(cp_p,"chaosCore")) exit;
var cp_c = cp_p.chaosCore;
if (chaos_goal_child_step(chaosChild, cp_p.chaosGrounded, cp_c.state == 32 || cp_c.next == 32)) chaos_goal_request_state20(cp_c);
