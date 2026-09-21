/// @description  Sprite

image_speed = 0.6;
image_alpha = 0.8;

/// Attract Rings to me

with (OBJ_ring)
{
    if (point_in_rectangle(x, y, __view_get( e__VW.XView, 0 )-5, __view_get( e__VW.YView, 0 )-5, __view_get( e__VW.XView, 0 )+__view_get( e__VW.WView, 0 )+5, __view_get( e__VW.YView, 0 )+__view_get( e__VW.HView, 0 )+5))
    {
        if (global.powerShieldMagnet == true)
        {
            shield_x = instance_nearest(x, y, OBJ_power_shield_magnet).x;
            shield_y = instance_nearest(x, y, OBJ_power_shield_magnet).y;
            
            direction = point_direction(x, y, shield_x, shield_y);
            speed += 0.40;
            
            if (place_meeting(x, y, OBJ_power_shield_magnet))
            {
                instance_destroy();
            }
        }
    }
}

/// Disable power

if (global.powerShield == false)
{
    instance_destroy();
}

