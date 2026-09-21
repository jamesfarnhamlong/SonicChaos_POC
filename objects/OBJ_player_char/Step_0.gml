if (room == ROM_chaos_thz1) { SCR_chaos_adapter_step(id); exit; }

/// @description  Controls and Gravity

// Keyboard and Gamepads buttons map
SCR_buttons();

// Gravity
SCR_physics();
SCR_physics_ramp();

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

/// Stop

if (hspeed == 0 && global.playerJump == false)
{
    if (global.btUp) 
    {
        playerImaStop = 2;
    }
    if (global.btDown) 
    {
        playerImaStop = 3;
    }
    if (global.btUpRel || global.btDownRel) 
    {
        playerImaStop = 0;
        okStop = true;
    }
    
    // Stop on floor
    if (playerImaStop == 0 && gravity == 0) 
    {
        sprite_index = SPR_player_stop;
        image_speed = 0.3;
    }
    // Falling Down air
    if (playerImaStop == 0 && gravity == global.valGravity) 
    {
        sprite_index = SPR_player_walk;
        image_speed = 0.4;
    }
    // Time to waiting 
    if (playerImaStop == 0 && okStop == true) 
    {
        alarm[0] = 120; 
        okStop = false;
    }
    // Waiting
    if (playerImaStop == 1) 
    {
        sprite_index = SPR_player_wait;
        if (image_index >= 3)
        {
            image_index = 1;
        }
        image_speed = 0.15;
    }
    // Looking up
    if (playerImaStop == 2) 
    {
        sprite_index = SPR_player_up;
        image_speed = 0.3;
    }
    // Lowered
    if (playerImaStop == 3 && global.playerSpinDash == false) 
    {
        sprite_index = SPR_player_down;
        image_speed = 0.3;
    }
}

/// Moves

// Left <--
if (global.btLeft && !global.btRight)
{
    if (hspeed > -1 && hspeed < 4) 
    {
        hspeed = 0;
    }
    if (hspeed > -1 && hspeed > 3) 
    {
        playerBreakL = true;
    }
    if (hspeed == 0) 
    {
        hspeed = -1.1;
    }
    if (hspeed > -global.valSpeedMax && hspeed < 1) 
    {
        hspeed -= global.valSpeed;
        image_xscale = -1;
        releasedLeft = false;
    }
}
if (global.btLeftRel && playerBreakL == false)
{
    releasedLeft = true;
}

// Right -->
if (global.btRight && !global.btLeft)
{
    if (hspeed < -1 && hspeed > -4) 
    {
        hspeed = 0;
    }
    if (hspeed < -1 && hspeed < -3) 
    {
        playerBreakR = true;
    }
    if (hspeed == 0) 
    {
        hspeed = 1.1;
    }
    if (hspeed > -1 && hspeed < global.valSpeedMax) 
    {
        hspeed += global.valSpeed;
        image_xscale = 1;
        releasedRight = false;
    }
}
if (global.btRightRel && playerBreakR == false )
{
    releasedRight = true;
}

// Speed Control
SCR_physics_speed();
// Apply the same terrain ramp resolution after speed and direction are known.
if (room == ROM_chaos_thz1) SCR_physics_ramp();
// Break Control
if (global.playerJump == true) 
{
    SCR_physics_break_jump();
}
else 
{
    SCR_physics_break();
}

/// Collision Monitors

// Wall
if (place_meeting(x+hspeed, y, OBJ_monitors) && global.playerJump == false && 
    global.playerSpinDash == false)
{
    while (hspeed != 0) 
    {
        hspeed = 0;
    }
    playerImaStop = 0;
    okStop = false;
}

/// Spin Dash

if (hspeed > -1 && hspeed < 1 && global.playerJump == false)
{
    //---------- Controls -------------//
    
    // SFX speed
    if (spinSpeed > 12) 
    {
        spinSfx = 4.5;
    }
    if (spinSpeed < 13) 
    {
        spinSfx = 3.6;
    }
    if (spinSpeed < 12) 
    {
        spinSfx = 2.7;
    }
    if (spinSpeed < 10) 
    {
        spinSfx = 2;
    }
    if (spinSpeed < 9) 
    {
        spinSfx = 1.8;
    }
    
    // Speed
    if (spinSpeed > 15) 
    {
        spinSpeed = 15;
    }
    if (spinSpeed < 1) 
    {
        spinSpeed = 0;
    }
    
    // Sprite
    if (spinSpeed > 11) 
    {
        spinSpr = 0.7;
    }
    if (spinSpeed < 12) 
    {
        spinSpr = 0.5;
    }
    if (spinSpeed < 8) 
    {
        spinSpr = 0.4;
    }
    
    //-------------- Action --------------//

    // Activate Spin Dash
    if (global.btDown && global.btSpacePress && global.playerSpinDash == false)
    {
        global.playerSpinDash = true;
        sprite_index = SPR_player_spin_dash;
        image_speed = spinSpr;
        spinSpeed = 8;
    }
    
    // More Speed
    if (global.btSpacePress && global.playerSpinDash == true)
    {
        spinSpeed += 1;
        image_speed = spinSpr;
        if (global.music == 1)
        {
            audio_stop_sound(SFX_sonic_spin);
            audio_play_sound(SFX_sonic_spin, 10, false);
            audio_sound_pitch(SFX_sonic_spin, spinSfx);
        }
    }
    
    // Released
    if (global.playerSpinDash == true && global.btDownRel)
    {
        global.playerSpinDash = false;
        global.valSpinSpeed = spinSpeed;
        spinSpeed = 0;
        if (global.music == 1)
        {
            audio_stop_sound(SFX_sonic_spin);
            audio_play_sound(SFX_sonic_spin_dash, 11, false);
            audio_sound_pitch(SFX_sonic_spin, 1); // Reset audio speed
        }
        instance_change(OBJ_player_char_spin,true);
    }
}

// Pressed another button
if (global.playerSpinDash == true && global.btLeftPress ||
    global.btRightPress || global.btUpPress)
{
    global.playerSpinDash = false;
    spinSpeed = 0;
    audio_sound_pitch(SFX_sonic_spin, 1); // Reset audio speed
}

/// Spin Attack

if (hspeed > 1 || hspeed < -1)
{
    if (global.playerJump == false && global.btDownPress)
    {
        if (global.music == 1)
        {
            audio_stop_sound(SFX_sonic_spin);
            audio_play_sound(SFX_sonic_spin, 10, false);
        }
        instance_change(OBJ_player_char_spin,true);
    }
}

/// Super

// Activate
if (global.btSpacePress && global.playerJump == true && 
    global.ring > 49 && global.chaoEmerald == 7 && 
    global.playerSuper == false && !gravity == 0)
{
    instance_change(OBJ_player_super_transform, true);
    exit;
}

// Stars Effect
if ((hspeed > 0 && hspeed > 6 || hspeed < 0 && hspeed < -6) && global.playerSuper == true)
{
    if !(instance_exists(OBJ_power_super_stars))
    {
        instance_create(choose(x-12,x-6,x+6,x+12), y-10, OBJ_power_super_stars);
    }
}

/// Fly and Climbing


// ----------- Tails -----------------

if (global.player == 2)
{
    // Fly
    if (global.btSpacePress && global.playerJump == true &&
        global.playerFly == false && timeFly == true)
    {
        // Action
        global.playerBlink = false;
        global.playerFly = true;
        
        vspeed = 0;
        
        // Sprite
        sprite_index = SPR_player_fly;
        image_speed = 0.65;
        
        // Countdown
        timeline_index = TIME_tails_fly;
        timeline_running = true;
        timeline_position = 0;
        timeline_loop = false;
    }
    
    // More speed
    if (global.btSpacePress && global.playerFly == true && y > 50)
    {
        vspeed -= 3;
    }
}


// ----------- Knuckles -----------------

if (global.player == 3)
{
    // Fly
    if (global.playerFly == false && global.btSpacePress && 
        global.playerJump == true && global.playerJumpSpring == false)
    {
        // Action
        global.playerBlink = false;
        global.playerFly = true;
        
        vspeed = 0;
        hspeed = 0;
        
        if (image_xscale == 1) 
        {
            hspeed = 8;
        }
        if (image_xscale == -1) 
        {
            hspeed = -8;
        }
        
        // Sprite
        sprite_index = SPR_player_fly;
        image_speed = 0.65;
    }
    
    // Climbing
    if (place_meeting(x+hspeed, y, OBJ_collision_wall) && global.playerFly == true)
    {
        instance_change(OBJ_player_climbing, true);
    }
}


// ------------ Cancel Fly ----------

if (global.btDownPress && global.playerFly == true)
{
    global.playerFly = false;
    timeFly = false;
    timeline_index = TIME_tails_fly;
    timeline_running = false;
    timeline_position = 0;
    hspeed = 0;
}


/// Jump Flame - Shield

if (global.btSpacePress && global.playerJump == true && global.playerJumpSpring == false &&
    global.playerFly == false && global.powerShieldFlame == true && global.player == 1)
{
    // Start variables
    global.playerBlink = false;
    global.playerFly = true;
    
    // Stop moves
    vspeed = 0;
    hspeed = 0;
    
    // Direction..
    if (image_xscale == 1) 
    {
        hspeed = hspeed+global.valJumpMax;
        releasedRight = true;
    }
    if (image_xscale == -1) 
    {
        hspeed = -hspeed-global.valJumpMax;
        releasedLeft = true;
    }
    
    // Sprite
    sprite_index = SPR_player_spin;
    image_speed = 0.65;
    
    // Fire effect
    instance_create(x, y, OBJ_power_shield_flame_jump);
}

/// Jump

if (global.btSpaceRel && vspeed < 0 && global.playerSpinDash == false && 
    global.playerJumpSpring == false) 
{
    vspeed *= 0.5;
}

if (global.btSpacePress && global.playerJump == false && global.playerJumpSpring == false && 
    global.playerSpinDash == false && global.playerFly == false)
{
    // Sprite
    sprite_index = SPR_player_spin;
    image_speed = 0.65;
    
    // SFX
    if (global.music == 1) 
    {
        audio_play_sound(SFX_sonic_jump, 10, false);
    }
    
    // Action
    vspeed = -global.valJumpMax;
    global.playerJump = true;
    playerImaStop = 0;
    okStop = true;
}

/// Collision Platforms

// ----------- Floor ---------------

if (room != ROM_chaos_thz1 &&
    ((!place_free(x+hspeed, y+vspeed) && !place_meeting(x+hspeed, y, OBJ_collision_wall)) || // Floor
    (!place_free(x, y+vspeed) && place_meeting(x+hspeed, y, OBJ_collision_wall)))) // Floor + Wall
{
    vspeed = 0;
    global.playerJump = false;
    global.playerJumpSpring = false;
    
    // Stop fly
    if (global.player == 3 && global.playerFly == true) 
    {
        //Only Knuckles
        while (hspeed != 0) 
        {
            hspeed = 0;
        }
    }
    global.playerFly = false;
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

/// Margin

// View
if (x-9+hspeed < __view_get( e__VW.XView, 0 ) || x+6+hspeed > __view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 ))
{   
    hspeed = 0;
}

// Room
if (x+9+hspeed <= 9 || x+hspeed >= room_width-9)
{
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


/// Deaths Badniks

if (place_meeting(x,y,OBJ_badniks) && global.playerSuper == false && 
    global.playerJump == false && global.playerSpinDash == false &&
    global.playerBlink == false)
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
