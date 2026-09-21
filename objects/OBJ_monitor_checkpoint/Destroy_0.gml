/// @description  Actions

// Points
global.checkPoint = true; // If you have caught...
global.checkPointX = x+11; // Coordinate X to create the player
global.checkPointY = y-11; // Coordinate Y to create the player

// Player Jump
with(OBJ_player_char)
{
    SCR_physics_jump_objects();
}

// Effects
instance_create(x+11, y+11, OBJ_explosion);

