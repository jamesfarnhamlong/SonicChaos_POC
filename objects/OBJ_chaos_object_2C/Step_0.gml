if (!chaosEnemyPhase) exit;
event_inherited(); // $27 callbacks, strict post-move 64 / pre-move 384, 129-count oscillator
// The ROM scheduler still runs lifetime when contact returns from a callback.
// The shared THZ event exits at contact; complete that scheduler tail here.
if (!instance_exists(id) || !chaosActive || chaosAge < 2) exit;
var cp_cell=SCR_chaos_spawn_cell(chaos_vp_current(),floor(x),floor(y));
if (cp_cell == 3 && chaosState == 1) { chaosActive=false; chaosAsleep=true; visible=false; exit; }
chaosAsleep=cp_cell >= 2; visible=!chaosAsleep;
