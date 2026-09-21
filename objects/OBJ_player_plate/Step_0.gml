/// @description  Gravity

SCR_physics();
SCR_physics_ramp();

if (place_free(x, y+1)) 
{
    gravity = global.valGravity;
}
else 
{
    gravity = 0;
}

// Maximum fall height
if (vspeed > global.valVspeed) 
{
    vspeed = global.valVspeed;
}

/// Auto run

if (hspeed > -1 && hspeed < global.valSpeedMax) 
{
    hspeed += global.valSpeed;
    image_xscale = 1;
}

// Speed limit
SCR_physics_speed();

/// Collision Platforms

// ----------- Floor ---------------

if ((!place_free(x+hspeed, y+vspeed) && !place_meeting(x+hspeed, y, OBJ_collision_wall)) || // Floor
    (!place_free(x, y+vspeed) && place_meeting(x+hspeed, y, OBJ_collision_wall))) // Floor + Wall
{
    vspeed = 0;
    global.playerJump = false;
    global.playerJumpSpring = false;
    
    // Stop fly
    if (global.player == 3 && playerFly == true) 
    {
        hspeed = 0; //Only Knuckles
    }
    playerFly = false;
    timeFly = true;
}


// ----------- Wall ---------------
    
if (place_meeting(x+hspeed, y, OBJ_collision_wall))
{
    while (hspeed != 0) 
    {
        hspeed = 0;
    }
    playerImaStop = 0;
    okStop = false;
}
    
    
// ----------- Roof ---------------
    
if (place_meeting(x, y+vspeed/2, OBJ_collision_roof))
{
    while (vspeed < 0) 
    {
        vspeed = 0;
    }
}


