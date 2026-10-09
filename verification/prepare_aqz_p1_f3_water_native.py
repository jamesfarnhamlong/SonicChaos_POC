"""Native selector bench: immutable F2 runtime, synthetic flat support in diagnostic copy only."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1];stage=ROOT/'build/aqz-p1/F3-water-native/project';assert not stage.exists()
with zipfile.ZipFile(ROOT.parent/'releases/SonicChaos_AQZ_P1_20261009_F2.zip') as z:
 for name in z.namelist():
  rel=name.split('/',1)[1]
  if rel and not name.endswith('/'):
   p=stage/rel;p.resolve().relative_to(stage.resolve());p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(name))
def append(rel,s):
 p=stage/rel;p.write_text(p.read_text()+'\n'+s)
append('objects/OBJ_menu_title/Create_0.gml','global.waterBench=true;global.waterBenchTick=0;chaos_debug_launch(chaos_debug_entries()[12]);')
for obj in ['OBJ_player_char','OBJ_player_char_spin']:
 p=stage/'objects'/obj/'Step_0.gml';p.write_text('if(variable_global_exists("waterBench"))exit;\n'+p.read_text())
append('objects/OBJ_chaos_zone/Create_0.gml',r'''
global.waterBenchHandle=file_text_open_write("F3-water-native.jsonl");global.waterCases=[];
for(var act=1;act<=2;act++) for(var wet=0;wet<=1;wet++) for(var kind=0;kind<7;kind++) {
 var states=[5,7,10,14,11,27,5];var state=states[kind];var p=SCR_cc_new(128,0),e=chaos_aqz_env_new(act);e.line=act==1?568:788;
 p.state=state;p.next=state;p.zone=4;p.vx=kind==1||kind==6?1024:0;p.water=wet?0:255;
 array_push(global.waterCases,{act:act,wet:wet,kind:kind,state:state,p:p,e:e});
}
''')
p=stage/'objects/OBJ_chaos_zone/Step_2.gml';p.write_text(r'''
repeat(600) {
for(var i=0;i<array_length(global.waterCases);i++) {
 var t=global.waterCases[i],p=t.p;global.chaosAqzEnv=t.e;global.waterCase=t;
 p.xu=128*256;p.yu=(t.e.line+(t.wet?64:-64))*256;p.state=t.state;p.next=t.state;
 p.move=t.kind>=2&&t.kind<=5?1:0;if(t.kind==2)p.move|=2;
 p.bg=p.move&1?0:2;p.contacts=p.bg;p.held=t.kind==1||t.kind==6?4:8;p.pressed=0;p.vy=p.move&1?-256:0;
 global.waterRow={update:global.waterBenchTick+1,act:t.act,wet:t.wet,kind:t.kind,world_y:p.yu/256,waterline:t.e.line,water_before:p.water,state:p.state,request_before:p.next,vx_before:p.vx,held:p.held,vy_before:p.vy,calls_before:t.e.calls};
 SCR_cc_tick(p);
 var r=global.waterRow;r.next=p.next;r.vx_after=p.vx;r.vy_after=p.vy;r.water_after=p.water;r.calls_after=t.e.calls;r.threshold=abs(p.vx>>8)>=4;
 file_text_write_string(global.waterBenchHandle,json_stringify(r));file_text_writeln(global.waterBenchHandle);
}
global.waterBenchTick++;
if(global.waterBenchTick>=600){file_text_close(global.waterBenchHandle);game_end();exit;}
}
''')
p=stage/'scripts/SCR_chaos_core/SCR_chaos_core.gml';s=p.read_text().replace('function SCR_cc_input(cp_c)','function water_original_input(cp_c)').replace('function SCR_cc_x(cp_c)','function water_original_x(cp_c)');s+=r'''
function SCR_cc_input(cp_c) {
 var r=global.waterRow;r.water_at_input=cp_c.water;r.vx_at_input=cp_c.vx;r.state_at_input=cp_c.state;
 water_original_input(cp_c);r.acceleration=cp_c.input_delta;r.surface_delta=cp_c.surface_delta;
}
function SCR_cc_x(cp_c){water_original_x(cp_c);global.waterRow.vx_after_control=cp_c.vx;global.waterRow.cap=cp_c.maximum;}
'''
# Synthetic level support isolates selector from obstacles, slopes and room traversal.
import re
for name in ['SCR_cc_floor','SCR_cc_sides','SCR_cc_ceiling','SCR_cc_terrain_probe']:
 s=s.replace('function '+name+'(', 'function water_unused_'+name+'(',1)
s+=r'''
function SCR_cc_floor(cp_c){cp_c.bg=(cp_c.move&1)?0:2;}
function SCR_cc_sides(cp_c){}
function SCR_cc_ceiling(cp_c){}
function SCR_cc_terrain_probe(cp_c){}
''';p.write_text(s)
print(stage/'SonicChaos_POC.yyp')
