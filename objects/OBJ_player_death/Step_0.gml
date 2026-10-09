if (chaos_is_aqz() && variable_global_exists("chaosAqzEnv") && global.chaosAqzEnv.death) { speed=0;gravity=0;exit; }
/// @description  Gravity

gravity = 0.7;

if (vspeed > 16)
{
    vspeed = 16;
}

