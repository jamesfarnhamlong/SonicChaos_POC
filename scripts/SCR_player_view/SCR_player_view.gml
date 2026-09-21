/// @description  View follows the player
function SCR_player_view() {

	if (instance_exists(OBJ_player))
	{
	    __view_set( e__VW.Object, 0, OBJ_player );
	    __view_set( e__VW.HBorder, 0, round(__view_get( e__VW.WView, 0 ) / 2.3) );
	    __view_set( e__VW.VBorder, 0, 0 );
	    __view_set( e__VW.HSpeed, 0, -1 );
	    __view_set( e__VW.VSpeed, 0, -1 );
	}



}
