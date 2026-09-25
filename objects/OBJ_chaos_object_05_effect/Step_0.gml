// Original callback $998A retains type $05 only while $D532 == $06. The POC's
// existing numeric power code/timer is the bounded lifetime signal.
if (global.chaosPowerCode != $06 || global.chaosPowerTimer <= 0) {
    global.chaosType05Allocated = false;
    instance_destroy();
    exit;
}

var cp_p = instance_find(OBJ_player, 0);
if (instance_exists(cp_p)) {
    x = cp_p.x;
    y = cp_p.y;
}

image_index = chaosFrame;
chaosFrame = (chaosFrame + 1) mod 32;
