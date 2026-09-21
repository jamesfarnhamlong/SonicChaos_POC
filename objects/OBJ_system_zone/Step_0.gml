/// @description  Loading optimization (optional)

// This function makes the game lighter
// Creates objects inside and near of view

instance_deactivate_object(OBJ_collision_floor);
instance_deactivate_object(OBJ_collision_wall);
instance_deactivate_object(OBJ_collision_roof);

instance_activate_region (__view_get( e__VW.XView, 0 )-256, __view_get( e__VW.YView, 0 )-256, __view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 )+256, __view_get( e__VW.YView, 0 )+__view_get( e__VW.HView, 0 )+256, true);

