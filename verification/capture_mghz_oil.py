"""Native oil/camera/death regression, real shipping player and camera updates."""
from pathlib import Path
import json,argparse
from package_mghz import ROOT,BUILD,snapshot
ap=argparse.ArgumentParser();ap.add_argument('--name',default='oil-fixture');args=ap.parse_args();dest=BUILD/args.name;snapshot(dest)
def append(rel,t):p=dest/rel;p.write_text(p.read_text()+'\n'+t+'\n')
for n in ('SCR_save_game','SCR_load_game'):(dest/f'scripts/{n}/{n}.gml').write_text('function '+n+'() {}\n')
p=dest/'options/windows/options_windows.yy';p.write_text(p.read_text().replace('"option_windows_disable_sandbox":false','"option_windows_disable_sandbox":true'))
append('objects/OBJ_system/Create_0.gml','global.oilWidth=256;global.oilRows=[];global.chaosDebugSession=true;global.checkPoint=false;global.screenSize=1;global.windowSize=1;window_set_fullscreen(false);room_goto(ROM_chaos_mghz1);')
append('objects/OBJ_chaos_zone/Create_0.gml','''
global.oilTick=0;
with (OBJ_effect_fade_in) instance_destroy();
var pp=instance_find(OBJ_player,0);pp.chaosCore.xu=1450*256;pp.chaosCore.yu=778*256;
pp.chaosCore.state=1;pp.chaosCore.next=1;pp.chaosCore.move=0;pp.chaosCore.bg=2;pp.chaosCore.contacts=2;pp.chaosCore.previous=$5B;pp.chaosCore.special=2;
SCR_chaos_core_publish(pp);
__view_set(e__VW.WView,0,global.oilWidth);__view_set(e__VW.HView,0,global.oilWidth==256?224:196);
__view_set(e__VW.XView,0,1300);__view_set(e__VW.YView,0,666);
''')
append('objects/OBJ_chaos_zone/Step_2.gml','''
global.oilTick++;
var pp=instance_find(OBJ_player,0),alive=instance_exists(pp)&&variable_instance_exists(pp,"chaosCore"),done=!alive;
if (alive) {
    var pc=pp.chaosCore;done=pc.next==31 || pc.state==31;
    array_push(global.oilRows,{width:global.oilWidth,update:global.oilTick,y:chaos_signed_yu(pc.yu)/256,camera:__view_get(e__VW.YView,0),counter:pc.surface_counter,next:pc.next,move:pc.move,floor:pc.bg&2,death:done});
}
else array_push(global.oilRows,{width:global.oilWidth,update:global.oilTick,death:true,player_core_replaced:true});
if (done || global.oilTick>=180) {
    if (global.oilWidth==256) {global.oilWidth=348;room_goto(ROM_chaos_mghz1);}
    else {var f=file_text_open_write("OUT");file_text_write_string(f,json_stringify(global.oilRows));file_text_close(f);game_end();}
}
'''.replace('OUT',(BUILD/'native-oil-rows.json').as_posix()))
p=dest/'scripts/SCR_buttons/SCR_buttons.gml';t=p.read_text();i=t.rfind('}');p.write_text(t[:i]+'global.btLeft=false;global.btRight=false;global.btUp=false;global.btDown=false;global.btSpace=false;global.btSpacePress=false;\n'+t[i:])
print(dest/'SonicChaos_POC.yyp')
