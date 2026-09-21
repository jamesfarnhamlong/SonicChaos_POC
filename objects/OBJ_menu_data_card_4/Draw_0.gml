/// @description  Card Selected

if (global.saveGame == slot)
{
    font = font_add_sprite(SPR_font_system,46,true,2);
    draw_set_font(font);
    
    //Icon + Zone Name
    draw_sprite(SPR_data_zones,loadIcon,x,y-40);
    draw_sprite_ext(SPR_data_form,-1,x,y,1,1,0,c_yellow_dark,1);
    draw_set_halign(fa_center);
    draw_set_colour(c_yellow_dark);
    draw_text(x,y+15,string_hash_to_newline(loadZone));
    draw_set_colour(c_white);
    draw_set_halign(fa_left);
    
    //Lives
    draw_sprite(SPR_data_icon_life,0,x-50,y+31);
    draw_set_colour(c_white);
    draw_set_halign(fa_left);
    
    if (global.life < 10)
    {
        draw_sprite(SPR_font_system,2,x-25,y+32);
        draw_text(x-16,y+32,string_hash_to_newline(global.life));
    }
    else 
    {
        draw_text(x-25,y+32,string_hash_to_newline(global.life));
    }    
    
    draw_set_colour(c_white);
    draw_set_halign(fa_left);
    
    //Emeralds
    draw_sprite(SPR_data_icon_emerald,0,x+10,y+31);
    draw_sprite(SPR_font_system,global.chaoEmerald+2,x+25,y+32);
    draw_sprite(SPR_font_system,9,x+42,y+32);
}
else
{
    draw_sprite_ext(SPR_data_form,-1,x,y,1,1,0,c_silver_dark,1);
}

