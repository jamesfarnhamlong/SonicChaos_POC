/// @description  Gravity

if (global.playerPlate == true)
{
    if (place_free(x, y+1)) 
    {
        gravity = 0.2;
    }
    else 
    {
        gravity = 0;
    }
    if (vspeed > 18) 
    {
        vspeed = 18;
    }
    if (vspeed < -7) 
    {
        vspeed = -7;
    }
}

/// Collisions

// Floor
if (!place_free(x, y+vspeed))
{
    if (global.playerPlate == true && plateStep == 1) 
    {
        plateStep = 2;
    }
    vspeed = 0;
}

// Roof
if (place_meeting(x, y+vspeed, OBJ_collision_roof))
{
    if (speed > 0) 
    {
        vspeed -= vspeed/2;
    }
}

/// Spin + View

if (global.playerPlate == true && plateStep == 0)
{
    // View
    __view_set( e__VW.Object, 0, OBJ_plate );
    __view_set( e__VW.HBorder, 0, round(__view_get( e__VW.WView, 0 )/2) );
    __view_set( e__VW.VBorder, 0, round(__view_get( e__VW.HView, 0 )/2/1.4) );
    __view_set( e__VW.HSpeed, 0, 5 );
    __view_set( e__VW.VSpeed, 0, 5 );
    
    // Jump
    if (OBJ_player.hspeed > 3) 
    {
        vspeed = -OBJ_player.hspeed/1.2;
    }
    if (OBJ_player.hspeed > -1 && OBJ_player.hspeed < 4) 
    {
        vspeed = -3;
    }
    if (OBJ_player.hspeed < -3) 
    {
        vspeed = OBJ_player.hspeed/1.2;
    }
    if (OBJ_player.hspeed < 1 && OBJ_player.hspeed > -4) 
    {
        vspeed = -3;
    }
    
    // Sprite
    sprite_index = SPR_plate_spin;
    image_speed = 0.5;
    
    // Music
    if (global.music == 1) 
    {
        audio_play_sound(SFX_plate_spin, 10, false);
    }
    
    // Action
    plateStep = 1;
}

/// Go To Actions

if (global.playerPlate == true && plateStep == 2)
{
    //------------ EGGMAN ----------------
    
    if (global.ring < 50)
    {
        plateAction = 0;
    }
    
    //------------ SPECIAL STAGE ----------------
    
    //if (global.ring > 49 && global.chaoEmerald < 7)
    //{
        //plateAction = 1;
    //}

    //------------ EXTRA LIFE ----------------
    
    if (global.ring < 50 && global.minutes = 1 && global.seconds < 31)
    {
        plateAction = 2;
    }
    
    //------------ 10 RINGS ----------------
    
    if (global.ring = 0)
    {
        plateAction = 3;
    }
    
    alarm[0] = 2; // Go to action
    plateStep = 3;
}

/// Change Player

if (global.playerPlate == true && plateStep > 1)
{
    with(OBJ_player_char) 
    {
        instance_change(OBJ_player_plate, true);
    }
    with(OBJ_player_char_spin) 
    {
        instance_change(OBJ_player_plate, true);
    }
    
    // If Super player is true
    if (global.playerSuper == true)
    {
        global.playerSuper = false;
    }
}

