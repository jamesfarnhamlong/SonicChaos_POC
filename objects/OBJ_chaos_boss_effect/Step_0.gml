// Non-contact ROM support effects. Sprite frame durations come from the decoded scripts.
chaosAge++;
if (chaosType == $0A && chaosParameter == 0) {
    // $0A parameter 0 is persistent: every eight updates it follows Sonic and emits parameter $FF.
    visible=false;
    if (chaosAge mod 8 == 0 && instance_exists(OBJ_player)) {
        var cp_p=instance_find(OBJ_player,0);
        if (variable_instance_exists(cp_p,"chaosCore")) {
            var cp_c=cp_p.chaosCore;
            var cp_dy=(chaosAge mod 16 == 8) ? -12 : -8;
            x=floor(cp_c.xu/256); y=floor(cp_c.yu/256);
            chaos_boss_effect($0A,x,y+cp_dy,$FF,28);
        }
    }
} else if (chaosType == $34) {
    var cp_t=(chaosAge-1) mod (chaosLife > 200 ? 50 : 26);
    image_index=cp_t < 4 ? 3 : (cp_t < 8 ? 0 : (cp_t < 12 ? 1 : (cp_t < 16 ? 2 : (cp_t < 20 ? 1 : 2))));
    visible=cp_t > 0;
} else if (chaosType == $0A) {
    image_index=floor((chaosAge-1)/4) mod 2;
} else if (chaosType == $0F) {
    image_index=floor((chaosAge-1)/4) mod 3;
}
if (chaosParameter != 0 || chaosType != $0A) if (chaosAge >= chaosLife) instance_destroy();
