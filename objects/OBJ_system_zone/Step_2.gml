/// @description Player View Y

if (instance_exists(OBJ_player) && __view_get( e__VW.Object, 0 ) == OBJ_player)
{
    if (__view_get( e__VW.YView, 0 ) > 0 || __view_get( e__VW.YView, 0 ) < room_height)
    {
        __view_set( e__VW.YView, 0, round(OBJ_player.y - __view_get( e__VW.HView, 0 ) / 1.5) );
    }
}

