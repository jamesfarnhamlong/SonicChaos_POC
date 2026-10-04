"""Diagnostic-only native baseline/current GPZ2 cases; no shipping changes."""
from pathlib import Path
import json
from package_mghz import ROOT,snapshot
BUILD=ROOT/'build/fall-control-native'
snapshot(BUILD/'current')
scenes=[['strip-right',528,686,5,256,90],['monitor-right',3460,780,14,256,140],['monitor-left',3460,780,14,256,140]]
for name in ('base','current'):
 dest=BUILD/name;out=BUILD/(name+'-output');out.mkdir(exist_ok=True)
 def append(rel,t):p=dest/rel;p.write_text(p.read_text()+'\n'+t+'\n')
 for n in ('SCR_save_game','SCR_load_game'):(dest/f'scripts/{n}/{n}.gml').write_text('function '+n+'() {}\n')
 p=dest/'options/windows/options_windows.yy';p.write_text(p.read_text().replace('"option_windows_disable_sandbox":false','"option_windows_disable_sandbox":true'))
 append('objects/OBJ_system/Create_0.gml','global.fdScenes='+json.dumps(scenes)+';global.fdIndex=0;global.fdTick=-1;global.fdRows=[];global.fdContacts=[];global.fdPending=false;global.chaosDebugSession=true;global.checkPoint=false;global.screenSize=1;global.windowSize=1;room_goto(ROM_chaos_gpz2);')
 append('objects/OBJ_chaos_zone/Create_0.gml','''
 global.fdTick=-1;global.fdContacts=[];with(OBJ_effect_fade_in)instance_destroy();with(OBJ_chaos_object_25)instance_destroy();with(OBJ_chaos_object_2C)instance_destroy();with(OBJ_chaos_spikes)instance_destroy();
 var ds=global.fdScenes[global.fdIndex],fp=instance_find(OBJ_player,0);if(!instance_exists(fp))fp=instance_find(OBJ_player_death,0);var fc=fp.chaosCore;
 fc.xu=ds[1]*256;fc.yu=ds[2]*256;fc.state=ds[3];fc.next=ds[3];fc.vx=ds[4];fc.vy=0;fc.move=ds[3]==5?0:1;fc.bg=ds[3]==5?2:0;fc.contacts=fc.bg;fc.previous=SCR_cc_lookup(ds[1],ds[2]+18,0).flags;SCR_chaos_core_publish(fp);fp.chaosQueuedBounce=false;with(OBJ_chaos_object_10){if(chaosOriginX==3472&&chaosOriginY==878){chaosActive=true;chaosState=2;chaosAsleep=false;chaosInitialFillDone=true;chaosWoken=true;}}
 __view_set(e__VW.Object,0,noone);__view_set(e__VW.WView,0,348);__view_set(e__VW.HView,0,196);__view_set(e__VW.XView,0,ds[1]-128);__view_set(e__VW.YView,0,ds[2]-96);window_set_fullscreen(false);window_set_size(640,360);
 ''')
 append('objects/OBJ_chaos_zone/Step_2.gml','''
 global.fdTick++;var ds=global.fdScenes[global.fdIndex],fp=instance_find(OBJ_player,0);if(!instance_exists(fp))fp=instance_find(OBJ_player_death,0);var fc=fp.chaosCore;
 var fs=SCR_cc_lookup(floor(fc.xu/256),floor(fc.yu/256)+18,fc.plane);
 array_push(global.fdRows,{scene:ds[0],tick:global.fdTick,x:fc.xu/256,y:fc.yu/256,state:fc.state,next:fc.next,move:fc.move,floor:fc.bg&2,contacts:fc.contacts,held:fc.held,input_delta:fc.input_delta,vx:fc.vx,vy:fc.vy,owner:fc.support,special:fc.special,block:fs.tile,flags:fs.flags,monitor:global.fdContacts});global.fdContacts=[];
 if(global.fdTick==78||global.fdTick==89||global.fdTick==139)global.fdPending=true;
 if(global.fdTick>=ds[5]||fc.next==31){global.fdIndex++;if(global.fdIndex>=array_length(global.fdScenes)){var ff=file_text_open_write("OUT/rows.json");file_text_write_string(ff,json_stringify(global.fdRows));file_text_close(ff);game_end();}else room_goto(ROM_chaos_gpz2);}
 '''.replace('OUT',out.as_posix()))
 p=dest/'scripts/SCR_buttons/SCR_buttons.gml';t=p.read_text();i=t.rfind('}');p.write_text(t[:i]+'''global.btLeft=global.fdScenes[global.fdIndex][0]=="monitor-left";global.btRight=!global.btLeft;global.btUp=false;global.btDown=false;global.btSpace=false;global.btSpacePress=false;
 '''+t[i:])
 p=dest/'objects/OBJ_chaos_object_10/Step_0.gml';t=p.read_text();t=t.replace('if (cp_bits == 0) exit;','if(cp_bits!=0)array_push(global.fdContacts,{x:x,y:y,bits:cp_bits,player_x:cp_c.xu/256,player_y:cp_c.yu/256});\nif (cp_bits == 0) exit;');p.write_text(t)
 p=dest/'objects/OBJ_chaos_controls/OBJ_chaos_controls.yy';v=json.loads(p.read_text());v['eventList'].append({'$GMEvent':'v1','%Name':'','collisionObjectId':None,'eventNum':64,'eventType':8,'isDnD':False,'name':'','resourceType':'GMEvent','resourceVersion':'2.0'});p.write_text(json.dumps(v,indent=2))
 (p.parent/'Draw_64.gml').write_text('if(global.fdPending){var ds=global.fdScenes[global.fdIndex];surface_save(application_surface,"'+out.as_posix()+'/"+ds[0]+"-"+string(global.fdTick)+".png");global.fdPending=false;}')
 print(dest/'SonicChaos_POC.yyp')
