/// @description  Controls and Gravity

// Keyboard and Gamepads buttons map
SCR_buttons();

// Gravity
SCR_physics();

gravity = 0;

/// Moves and Sprites

// ----------------- Moves -----------------

// UP
if (global.btUp && !global.btDown)
{
    if (place_meeting(x, y+1, OBJ_collision_roof) || y < 16 || 
        place_meeting(x, y+1, OBJ_collision_ramp_1_ghost) || 
        place_meeting(x, y+1, OBJ_collision_ramp_2_ghost))
    {
        vspeed = 0; // Max height
    }
    else
    {
        if (place_meeting(x+1, y, OBJ_collision_wall) || place_meeting(x-1, y, OBJ_collision_wall))
        {
            vspeed = -2;
            imgFrame -= 0.4;
        }
        else
        {
            vspeed = 0;
            climb = true;
        }
    }
}
if (global.btUpRel)
{
    vspeed = 0;
}

// DOWN
if (global.btDown && !global.btUp)
{
    if (place_meeting(x+1, y, OBJ_collision_wall) || place_meeting(x-1, y, OBJ_collision_wall))
    {
        vspeed = 2;
        imgFrame += 0.4;
    }
    else
    {
        vspeed = 0;
        fall = true;
    }
}
if (global.btDownRel)
{
    vspeed = 0;
}


// ----------------- Sprites -----------------

SCR_player_sprites();

sprite_index = SPR_player_climbing;
image_index = round(imgFrame);
image_speed = 0;

// Control
if (imgFrame > 3)
{
    imgFrame = 0;
}
if (imgFrame < 0)
{
    imgFrame = 3;
}

/// Jump

if ((place_meeting(x+1, y, OBJ_collision_wall) && place_meeting(x+1, y+25, OBJ_collision_floor_edge)) || //Collision -->
    (place_meeting(x-1, y, OBJ_collision_wall) && place_meeting(x-10, y+25, OBJ_collision_floor_edge)) || //Collision <--
    climb == true) 
{
    global.playerFly = false;
    global.playerJump = true;
    
    vspeed = -global.valJumpMax/1.4;
    
    instance_change(OBJ_player_char, false);
}

/// Fall down

if (global.btSpacePress || fall == true)
{
    global.playerFly = false;
    global.playerJump = true;
    
    // Invert position as fall down
    if (image_xscale == 1)
    {
        image_xscale = -1;
    }
    else if (image_xscale == -1)
    {
        image_xscale = 1;
    }
    
    instance_change(OBJ_player_char, false);
}

/// Platform Collision

// Wall
if (place_meeting(x+1, y, OBJ_collision_wall) || place_meeting(x-1, y, OBJ_collision_wall))
{
    hspeed = 0;
}

// Floor
if (place_meeting(x, y+1, OBJ_collision_floor)) 
{
    vspeed = 0;
    instance_change(OBJ_player_char, true);
}

/// Deaths

if (place_meeting(x,y,OBJ_collision_death) && global.playerSuper == false && global.playerBlink == false)
{
    // If not have invincibility
    if (global.powerInv == false) 
    {
        // If have a Shield
        if (global.powerShield == true) 
        {
            instance_change(OBJ_player_lost_a, true);
        }
        else
        {
            if (global.ring > 0) 
            {
                instance_change(OBJ_player_lost_a, true);
            }
            else
            {
                instance_change(OBJ_player_death, true);
            }
        }
    }
}

// Outside Room
if (y > room_height) 
{
    instance_change(OBJ_player_death, true);
}


