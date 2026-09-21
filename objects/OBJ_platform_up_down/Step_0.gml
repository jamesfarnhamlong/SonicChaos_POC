/// @description  Sine wave moves

pTime += 2;

y = ystart + pWaveSize * sin (pTime / pSpeed * pi);

/// Player collision

if (place_meeting (x, y-5, OBJ_player) && solid == true)
{
    OBJ_player.y = y-14;
}

