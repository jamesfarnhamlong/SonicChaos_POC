if (room == ROM_chaos_thz1) { SCR_chaos_adapter_step(id); exit; }

/// @description  Controls

// Keyboard and Gamepads buttons map
SCR_buttons();

/// Gravity 

SCR_physics();

if (room == ROM_chaos_thz1) {
    gravity = (chaosGrounded || instance_exists(chaosSupport)) ? 0 : global.valGravity;
} else if (place_free(x, y+1))
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

// Maximum spin speed
if (hspeed > 15) 
{
    hspeed = 15;
}
if (hspeed < -15)
{
    hspeed = -15;
}

/// Image Speed + Sprites

// Image Speed
if (hspeed > 0 && hspeed > 7 || hspeed < 0 && hspeed < -7) 
{
    spriteSpeed = 0.8;
}
if (hspeed > 0 && hspeed < 8 || hspeed < 0 && hspeed > -8) 
{
    spriteSpeed = 0.7;
}
if (hspeed > 0 && hspeed < 7 || hspeed < 0 && hspeed > -7) 
{
    spriteSpeed = 0.6;
}
if (hspeed > 0 && hspeed < 6 || hspeed < 0 && hspeed > -6) 
{
    spriteSpeed = 0.5;
}

// Sprite
SCR_player_sprites();
sprite_index = SPR_player_spin;
image_speed = spriteSpeed;

/// Moves

// -->
if ((room == ROM_chaos_thz1 && hspeed > 0) || (room != ROM_chaos_thz1 && image_xscale == 1)) 
{   
    // Moves
    hspeed -= global.valSpeed;
    if (hspeed <= 0) 
    {
        hspeed = 0;
    }
    
    // Hold
    if (global.btLeftPress)
    {
        hspeed = hspeed/5;
    }
}

// <--
if ((room == ROM_chaos_thz1 && hspeed < 0) || (room != ROM_chaos_thz1 && image_xscale == -1)) 
{
    // Moves
    hspeed += global.valSpeed;
    if (hspeed >= 0) 
    {
        hspeed = 0;
    }
    
    // Hold
    if (global.btRightPress)
    {
        hspeed = hspeed/5;
    }
}

// Back to normal

if (hspeed == 0 && ((room == ROM_chaos_thz1 && SCR_chaos_floor_contact(id)) ||
    (room != ROM_chaos_thz1 && !place_free(x, y+2))))
{
    instance_change(OBJ_player_char,true);
}

/// Jump

if ((room == ROM_chaos_thz1 && SCR_chaos_floor_contact(id)) ||
    (room != ROM_chaos_thz1 && !place_free(x, y+1)))
{
    if (global.btSpaceRel && vspeed < 0) 
    {
        vspeed *= 0.5;
    }
    
    if (global.btSpacePress && global.playerJump == false)
    {
        // Music
        if (global.music == 1) 
        {
            audio_play_sound(SFX_sonic_jump, 10, false);
        }
        
        // Action
        vspeed = -global.valJumpMax;
        global.playerJump = true;
        instance_change (OBJ_player_char,false);
        
        if (image_xscale == -1) 
        {
            with(OBJ_player_char) 
            {
                releasedLeft = true;
            }
        }
        
        if (image_xscale == 1) 
        {
            with(OBJ_player_char) 
            {
                releasedRight = true;
            }
        }
        exit;
    }  
}

/// Pressure

if (y > y+1) 
{
    hspeed += abs(hspeed)*2;
}

if (room == ROM_chaos_thz1) {
    SCR_physics_ramp_spin();
}

/// Collision Platforms

// ----------- Floor ---------------

if (room != ROM_chaos_thz1 &&
    ((!place_free(x+hspeed, y+vspeed) && !place_meeting(x+hspeed, y, OBJ_collision_wall)) || // Floor
    (!place_free(x, y+vspeed) && place_meeting(x+hspeed, y, OBJ_collision_wall)))) // Floor + Wall
{
    vspeed = 0;
    global.playerJump = false;
}


// ----------- Wall ---------------
    
if (place_meeting(x+hspeed, y, OBJ_collision_wall))
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

// View
if (x-9+hspeed < __view_get( e__VW.XView, 0 ) || x+6+hspeed > __view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 ))
{   
    if (gravity == 0) 
    {
        sprite_index = SPR_player_stop;
    }
    hspeed = 0;
}

// Room
if (x+9+hspeed <= 9 || x+hspeed >= room_width-9)
{
    if (gravity == 0) 
    {
        sprite_index = SPR_player_stop;
    }
    hspeed = 0;
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
