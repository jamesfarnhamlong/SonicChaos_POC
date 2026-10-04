"""Native fixture snapshot only: canonical natural rides and jump-off, no shipping telemetry."""
from pathlib import Path
import json
from package_mghz import ROOT,snapshot
dest=ROOT/'build/mghz-m11/platform-correction-source';snapshot(dest)
out=ROOT/'build/mghz-m11/platform-correction-output';out.mkdir(parents=True,exist_ok=True)
def append(rel,text):
 p=dest/rel;p.write_text(p.read_text()+'\n'+text+'\n')
for name in ('SCR_save_game','SCR_load_game'):(dest/f'scripts/{name}/{name}.gml').write_text('function '+name+'() {}\n')
p=dest/'options/windows/options_windows.yy';p.write_text(p.read_text().replace('"option_windows_disable_sandbox":false','"option_windows_disable_sandbox":true'))
scenes=[[2,12,2768,624,5,-1,116,'mghz2-12-crush'],[2,13,3024,560,5,-1,148,'mghz2-13-crush'],[2,12,2768,624,5,60,90,'mghz2-12-jump'],[1,10,2768,414,0,-1,210,'mghz1-10-snap'],[1,11,2960,830,0,-1,465,'mghz1-11-snap']]
append('objects/OBJ_system/Create_0.gml','global.pcScenes='+json.dumps(scenes)+';global.pcIndex=0;global.pcU=-1;global.pcRows=[];global.pcEvent=[];global.pcProj=[];global.pcPending=false;global.chaosDebugSession=true;global.checkPoint=false;global.screenSize=1;global.windowSize=1;room_goto(ROM_chaos_mghz2);')
append('objects/OBJ_chaos_zone/Create_0.gml','''
global.pcU=-1;global.pcEvent=[];global.pcProj=[];
with(OBJ_effect_fade_in)instance_destroy();
var s=global.pcScenes[global.pcIndex],p=instance_find(OBJ_player,0),c=p.chaosCore;
c.xu=s[2]*256;c.yu=(s[3]-39)*256;c.state=14;c.next=14;c.vx=0;c.vy=256;c.move=1;c.bg=0;c.contacts=0;global.ring=s[4];SCR_chaos_core_publish(p);
__view_set(e__VW.WView,0,348);__view_set(e__VW.HView,0,196);__view_set(e__VW.WPort,0,640);__view_set(e__VW.HPort,0,360);window_set_fullscreen(false);window_set_size(640,360);__view_set(e__VW.XView,0,s[2]-128);__view_set(e__VW.YView,0,s[3]-39-96);
''')
append('objects/OBJ_chaos_zone/Step_2.gml','''
global.pcU++;var s=global.pcScenes[global.pcIndex];if(global.pcU==5)global.ring=s[4];var p=instance_find(OBJ_player,0);if(!instance_exists(p))p=instance_find(OBJ_player_death,0);var c=p.chaosCore,ps=[];
for(var i=0;i<instance_number(OBJ_chaos_platform);i++){var o=instance_find(OBJ_chaos_platform,i);if(o.chaosPlacementIndex==s[1])array_push(ps,{y:o.chaosY,vy:o.chaosVY,mode:o.chaosMode});}
array_push(global.pcRows,{scene:s[7],u:global.pcU,y:c.yu/256,vy:c.vy,state:c.state,next:c.next,move:c.move,floor:c.bg&2,owner:c.support,rings:global.ring,object:object_get_name(p.object_index),platform:ps,events:global.pcEvent,projections:global.pcProj,freeze:global.chaosCrushDeathPhase});
if(array_length(global.pcEvent)||array_length(global.pcProj))global.pcPending=true;
global.pcEvent=[];global.pcProj=[];
if(global.pcU>=s[6]){global.pcIndex++;if(global.pcIndex>=array_length(global.pcScenes)){var f=file_text_open_write("OUT/rows.json");file_text_write_string(f,json_stringify(global.pcRows));file_text_close(f);game_end();}else room_goto(global.pcScenes[global.pcIndex][0]==1?ROM_chaos_mghz1:ROM_chaos_mghz2);}
'''.replace('OUT',out.as_posix()))
p=dest/'scripts/SCR_buttons/SCR_buttons.gml';t=p.read_text();i=t.rfind('}');p.write_text(t[:i]+'''var j=global.pcScenes[global.pcIndex][5],u=global.pcU+1;global.btLeft=false;global.btRight=false;global.btUp=false;global.btDown=false;global.btSpace=j>=0&&u>=j+1&&u<j+4;global.btSpacePress=j>=0&&u==j+1;
'''+t[i:])
p=dest/'scripts/SCR_chaos_core/SCR_chaos_core.gml';t=p.read_text()
for name in ('SCR_cc_project_floor','SCR_cc_ceiling_profile'):
 t=t.replace('function '+name+'(', 'function '+name+'_native_original(')
 t+='\nfunction '+name+'(c,s){var oldY=c.yu;'+name+'_native_original(c,s);if(c.yu!=oldY&&s.tile==$F9)array_push(global.pcProj,{path:"'+name+'",before:oldY/256,after:c.yu/256,block:s.tile,owner:c.support,floor:c.bg&2});}\n'
t=t.replace('function SCR_cc_crush_death(cp_c) {','function SCR_cc_crush_death(cp_c) {\narray_push(global.pcEvent,{kind:"death",y:floor(cp_c.yu/256),owner:cp_c.support});')
t=t.replace('function SCR_cc_break13(cp_index) {','function SCR_cc_break13(cp_index) {\narray_push(global.pcEvent,{kind:"break",index:cp_index});')
p.write_text(t)
p=dest/'objects/OBJ_chaos_controls/OBJ_chaos_controls.yy';v=json.loads(p.read_text());v['eventList'].append({'$GMEvent':'v1','%Name':'','collisionObjectId':None,'eventNum':64,'eventType':8,'isDnD':False,'name':'','resourceType':'GMEvent','resourceVersion':'2.0'});p.write_text(json.dumps(v,indent=2))
(p.parent/'Draw_64.gml').write_text('if(global.pcPending){var s=global.pcScenes[global.pcIndex];surface_save(application_surface,"'+out.as_posix()+'/"+s[7]+"-"+string(global.pcU)+".png");global.pcPending=false;}')
print(dest/'SonicChaos_POC.yyp')
