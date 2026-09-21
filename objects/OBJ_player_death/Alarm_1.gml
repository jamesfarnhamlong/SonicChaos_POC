/// @description  Restart zone or game over?

if (global.life > 0) 
{
    room_restart();
}
else
{
    room_goto(ROM_menu_game_over);
}

