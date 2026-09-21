/// @description  Countdown Time

if (countStart == true && countTime == true)
{
    // Countdown Points
    global.timeBonus -= 100;
    score += 100;
    
    // SFX
    if (global.music == 1) 
    {
        if !(audio_is_playing(SFX_score1))
        {
            audio_play_sound(SFX_score1, 10, true);
        }
    }
    
    // Countdown End
    if (global.timeBonus <= 0)
    {
        global.timeBonus = 0;
        
        // Get over before Rings
        if (global.music == 1 && countRings == false)
        {
            audio_stop_sound(SFX_score1);
            if !(audio_is_playing(SFX_score2))
            {
                audio_play_sound(SFX_score2, 10, false);
            }
        }
        
        // Stop count
        countTime = false;
    }
}

/// Countdown Rings

if (countStart == true && countRings == true)
{
    // Countdown Points
    global.ringBonus -= 1; 
    score += 100;
    
    // SFX
    if (global.music == 1)
    {
        if !(audio_is_playing(SFX_score1))
        {
            audio_play_sound(SFX_score1, 10, true);
        }
    }
    
    // Countdown End
    if (global.ringBonus <= 0)
    {
        global.ringBonus = 0;
        
        // Get over before Time
        if (global.music == 1 && countTime == false)
        {
            audio_stop_sound(SFX_score1);
            if !(audio_is_playing(SFX_score2))
            {
                audio_play_sound(SFX_score2, 10, false);
            }
        }
        
        // Stop count
        countRings = false;
    }
}

/// Stop Countdown

if (countStop == false && countTime == false && countRings == false)
{
    alarm[1] = 60; // Fade-out and next zone
    countStop = true;
}

