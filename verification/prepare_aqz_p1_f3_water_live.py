"""Full-adapter native controls in actual AQZ1/2 rooms, synthetic flat support only."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1];stage=ROOT/'build/aqz-p1/F3-water-live/project';assert not stage.exists()
with zipfile.ZipFile(ROOT.parent/'releases/SonicChaos_AQZ_P1_20261009_F2.zip') as z:
 for n in z.namelist():
  rel=n.split('/',1)[1]
  if rel and not n.endswith('/'):
   p=stage/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(n))
def append(rel,s):
 p=stage/rel;p.write_text(p.read_text()+'\n'+s)
append('objects/OBJ_menu_title/Create_0.gml',r'''
if(parameter_count()>0){global.liveMode=parameter_string(1);global.liveAct=string_pos("aqz2",global.liveMode)>0?2:1;global.liveWet=string_pos("wet",global.liveMode)>0;global.liveBrake=string_pos("brake",global.liveMode)>0;global.liveLimit=global.liveBrake?120:600;global.liveActive=false;global.liveWarmup=0;global.liveTick=0;global.liveHandle=file_text_open_write("F3-live-"+global.liveMode+".jsonl");chaos_debug_launch(chaos_debug_entries()[global.liveAct+11]);}
''')
append('objects/OBJ_chaos_zone/Create_0.gml',r'''
if(variable_global_exists("liveMode")) {for(var i=0;i<array_length(global.chaosTileIds);i++)global.chaosTileIds[i]=254;}
''')
append('objects/OBJ_chaos_zone/Step_2.gml',r'''
if(variable_global_exists("liveMode")) {
 var p=instance_find(OBJ_player,0),c=p.chaosCore;
 if(!global.liveActive){global.liveWarmup++;if(global.liveWarmup>=2){global.liveY=global.chaosAqzEnv.line+(global.liveWet?64:-64);c.xu=128*256;c.yu=global.liveY*256;c.vx=global.liveBrake?1024:0;c.vy=0;c.state=5;c.next=5;c.move=0;c.bg=2;c.contacts=2;c.previous=0;c.modifier=0;SCR_chaos_core_publish(p);__view_set(e__VW.YView,0,max(0,global.liveY-96));global.liveActive=true;}}
 else {var r=global.liveRow;r.next=c.next;r.final_water=c.water;r.global_water=global.playerWater;r.instance_y=p.y;r.core_y=chaos_signed_yu(c.yu)/256;r.anchor_offset=p.chaosAnchorOffset;r.zone=c.zone;file_text_write_string(global.liveHandle,json_stringify(r));file_text_writeln(global.liveHandle);c.xu=128*256;SCR_chaos_core_publish(p);global.liveTick++;if(global.liveTick>=global.liveLimit){file_text_close(global.liveHandle);game_end();}}
}
''')
p=stage/'scripts/SCR_buttons/SCR_buttons.gml';s=p.read_text().replace('function SCR_buttons() {',r'''function SCR_buttons() {
if(variable_global_exists("liveActive")&&global.liveActive){global.btUp=false;global.btDown=false;global.btLeft=global.liveBrake;global.btRight=!global.liveBrake;global.btSpace=false;global.btSpacePress=false;return;}
''');p.write_text(s)
p=stage/'scripts/SCR_chaos_core/SCR_chaos_core.gml';s=p.read_text()
for name in ['SCR_cc_input','SCR_cc_x','SCR_cc_floor']:
 s=s.replace('function '+name+'(', 'function live_original_'+name+'(',1)
s+=r'''
function SCR_cc_input(cp_c){
 if(variable_global_exists("liveActive")&&global.liveActive)global.liveRow={update:global.liveTick+1,act:global.liveAct,wet:global.liveWet,state:cp_c.state,request_before:cp_c.next,water:cp_c.water,world_y:chaos_signed_yu(cp_c.yu)/256,waterline:global.chaosAqzEnv.line,vx_before:cp_c.vx,held:cp_c.held,cap:cp_c.maximum,updater_calls:global.chaosAqzEnv.calls};
 live_original_SCR_cc_input(cp_c);
 if(variable_global_exists("liveActive")&&global.liveActive){global.liveRow.acceleration=cp_c.input_delta;global.liveRow.surface_delta=cp_c.surface_delta;}
}
function SCR_cc_x(cp_c){live_original_SCR_cc_x(cp_c);if(variable_global_exists("liveActive")&&global.liveActive){global.liveRow.vx_after_control=cp_c.vx;global.liveRow.threshold=abs(cp_c.vx>>8)>=4;}}
function SCR_cc_floor(cp_c){if(variable_global_exists("liveActive")&&global.liveActive){cp_c.yu=global.liveY*256;cp_c.bg=2;return;}live_original_SCR_cc_floor(cp_c);}
''';p.write_text(s)
print(stage/'SonicChaos_POC.yyp')
