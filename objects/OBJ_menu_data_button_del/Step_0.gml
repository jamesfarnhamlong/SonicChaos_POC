/// @description  Delete Action

if (press == true)
{
    if (show_question("Delete data?"))
    {
        if (global.music == 1)
        {
            if (audio_is_playing(SFX_explosion))
            {
                audio_stop_sound(SFX_explosion);
            }
            audio_play_sound(SFX_explosion, 10, false);
        }
        
        // Open Archive
        ini_open ("saveGame" + string(global.saveGame) + ".ini");
        
        // Default Values
        ini_write_real ("classicMode", "life", 3);
        ini_write_real ("classicMode", "chaoEmerald", 0);
        ini_write_real ("classicMode", "score", 0);
        ini_write_real ("classicMode", "zoneGoto", 1);
        ini_write_real ("classicMode", "specialStageGoto", 1);
        ini_write_real ("classicMode", "allZones", false);
        
        // Close archive
        ini_close(); 
    }
    press = false;
}

