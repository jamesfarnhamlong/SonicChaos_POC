/// @description  Physics

SCR_physics();

// Gravity
gravity = global.valGravity;

if (vspeed > global.valVspeed)
{
    vspeed = global.valVspeed;
}

// Direction

// If place free is true, throw me back
if (place_free(x, y+1))
{
    if (velo <= 1.1)
    {
        velo = 1.1;
        if (image_xscale == 1) 
        {
            hspeed = -velo;
        }
        if (image_xscale == -1) 
        {
            hspeed = velo;
        }
    }
}
// If floor collision is true, stop me
else
{
    if (velo <= 1.1)
    {
        velo = 0; 
        hspeed = 0;
    }
}

/// Move Speed

if (velo > 0)
{
    velo -= 0.02;
    if (image_xscale == 1) 
    {
        hspeed += -velo;
    }
    if (image_xscale == -1) 
    {
        hspeed += velo;
    }
}

/// Collision Monitors

// Floor
if (place_meeting(x, y+vspeed, OBJ_monitors))
{
    vspeed = 0;
}

// Wall
if (place_meeting(x+hspeed, y, OBJ_monitors))
{
    while (hspeed != 0) 
    {
        hspeed = 0; 
        velo -= velo;
    }
}

// Roof
if (place_meeting(x, y-22, OBJ_monitors))
{
    while (vspeed < 0) 
    {
        vspeed = 0;
    }
}

/// Collision Platforms

// ----------- Floor ---------------

if ((!place_free(x+hspeed, y+vspeed) && !place_meeting(x+hspeed, y, OBJ_collision_wall)) || // Floor
    (!place_free(x, y+vspeed) && place_meeting(x+hspeed, y, OBJ_collision_wall))) // Floor + Wall
{
    vspeed = 0;
    if (hspeed = 0)
    {
        timeline_index = TIME_player_blink;
        timeline_position = 0;
        timeline_running = true;
        timeline_loop = false;
        instance_change(OBJ_player_char,true);
    }
}


// ----------- Wall ---------------
    
if (place_meeting(x-12, y, OBJ_collision_wall) || 
    place_meeting(x+12, y, OBJ_collision_wall))
{
    while (hspeed != 0) 
    {
        hspeed = 0;
    }
}
    
// ----------- Roof ---------------
    
if (place_meeting(x, y+vspeed/2, OBJ_collision_roof))
{
    while (vspeed < 0) 
    {
        vspeed = 0;
    }
}


/// Margin

//View
if (x-9+hspeed < __view_get( e__VW.XView, 0 ) || x+6+hspeed > __view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 ))
{   
    hspeed = 0;
    velo = 0;
}

//Room
if (x+9+hspeed <= 9 || x+hspeed >= room_width-9)
{
    hspeed = 0;
    velo = 0;
}

/// Outside room

if (y > room_height) 
{
    instance_change(OBJ_player_death, true);
}

