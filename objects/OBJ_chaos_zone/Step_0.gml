// Activate collision geometry around the camera, including the next spring landing.
instance_deactivate_object(OBJ_collision_floor);
instance_deactivate_object(OBJ_collision_wall);
instance_deactivate_object(OBJ_collision_roof);
instance_activate_region(__view_get(e__VW.XView,0)-384,__view_get(e__VW.YView,0)-512,__view_get(e__VW.WView,0)+768,__view_get(e__VW.HView,0)+1024,true);
