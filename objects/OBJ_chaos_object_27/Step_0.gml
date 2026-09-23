// Activate when the original placement reaches the camera neighbourhood.
if (!chaosActive) {
    var cp_cam = view_camera[0];
    var cp_left = camera_get_view_x(cp_cam)-64;
    var cp_right = cp_left+camera_get_view_width(cp_cam)+128;
    if (x < cp_left || x > cp_right) exit;

    chaosActive = true;
    chaosState = 1;
    chaosVX = -2.5; // ROM $FD80 (signed 8.8)
    chaosVY = 0;
}

chaosAnimTick++;
image_index = (chaosAnimTick div 2) & 1; // Both active scripts use duration $02.

if (chaosState == 1) {
    x += chaosVX;

    // $89AC requests state 2 when Sonic is within $40 horizontally.
    if (instance_exists(OBJ_player)) {
        var cp_p = instance_find(OBJ_player,0);
        if (abs(x-cp_p.x) < 64) {
            chaosState = 2;
            chaosVX = 0;
            chaosVY = 0;
            chaosTimer = 129;      // $80 counts through the underflow update.
            chaosWaveTimer = 32;   // Eight two-frame pairs at +$0003.
            chaosWaveAccel = 3/256;
        }
    }
} else if (chaosState == 2) {
    // $89DF/$89F3 adjust signed 8.8 Y velocity by +/-$0003.
    chaosVY += chaosWaveAccel;
    y += chaosVY;
    chaosWaveTimer--;

    if (chaosWaveTimer <= 0) {
        chaosWaveAccel = -chaosWaveAccel;
        chaosWaveTimer = 64; // Subsequent script loops contain sixteen pairs.
    }

    chaosTimer--;
    if (chaosTimer <= 0) {
        chaosState = 3;
        chaosVX = -2.5;
        chaosVY = 0;
    }
} else {
    x += chaosVX;

    // $8A29 removes the object once it is at least $0180 from Sonic.
    if (instance_exists(OBJ_player)) {
        var cp_p2 = instance_find(OBJ_player,0);
        if (abs(x-cp_p2.x) >= 384) {
            chaosSilentDestroy = true;
            instance_destroy();
        }
    }
}

SCR_badnik_death();
