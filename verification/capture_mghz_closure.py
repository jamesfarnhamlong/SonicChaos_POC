"""Isolated M1.1 diagnosis: native sign chain and scenery A/B, no shipping telemetry."""
from pathlib import Path
import argparse,json
from package_mghz import ROOT,snapshot
ap=argparse.ArgumentParser();ap.add_argument('--name',required=True);ap.add_argument('--scenes',choices=['all','line','platform'],default='all');ap.add_argument('--baseline-sampling',action='store_true');args=ap.parse_args()
build=ROOT/'build/mghz-m11';build.mkdir(exist_ok=True);dest=build/args.name;snapshot(dest)
out=build/(args.name+'-output');out.mkdir()
def append(rel,t):p=dest/rel;p.write_text(p.read_text()+'\n'+t+'\n')
for n in ('SCR_save_game','SCR_load_game'):(dest/f'scripts/{n}/{n}.gml').write_text('function '+n+'() {}\n')
p=dest/'options/windows/options_windows.yy';p.write_text(p.read_text().replace('"option_windows_disable_sandbox":false','"option_windows_disable_sandbox":true'))
m=json.loads((ROOT/'POC_notes/rom-cache/mghz/implementation-manifest.json').read_text())
ids=sum(m['acts']['mghz2']['layout']['rows'],[]);i=ids.index(89);tx=i%128*32;ty=i//128*32
scenes=[]
for act,sy in ((1,366),(2,270)):
 for spin in (False,True):scenes.append([act,'sign',int(spin),3946,sy-4,3748,sy-153,f'sign-{act}-{int(spin)}'])
for mode in ('all','no-strip','no-palettes','none','nearest'):
 scenes.append([2,mode,0,tx,ty-18,tx-64+.25,ty-64+.25,'twist-'+mode])
 scenes.append([3,mode,0,3200,350,3000.25,256.25,'boss-area-'+mode])
scenes.extend([[1,'platform',9,1152,226,1000,96,'platform-1-9'],[2,'platform',13,3024,546,2860,400,'platform-2-13']])
if args.scenes=='line':scenes=[[2,mode,0,960,170,800.75,32.75,'line-'+mode]for mode in ('all','no-strip','no-palettes','none','nearest','no-foreground','nearest-foreground')]
if args.scenes=='platform':scenes=[s for s in scenes if s[1]=='platform']
append('objects/OBJ_system/Create_0.gml','global.chaosGoalContact=false;global.clScenes='+json.dumps(scenes)+';global.clIndex=0;global.clRows=[];global.chaosDebugSession=true;global.checkPoint=false;global.screenSize=1;global.windowSize=1;window_set_fullscreen(false);room_goto(global.clScenes[0][0]==1?ROM_chaos_mghz1:(global.clScenes[0][0]==2?ROM_chaos_mghz2:ROM_chaos_mghz3));')
append('objects/OBJ_chaos_zone/Create_0.gml','''
global.clTick=0;global.clPending=false;
with (OBJ_effect_fade_in) instance_destroy();
var cs=global.clScenes[global.clIndex];
if(cs[1]=="sign" && cs[2]) with(OBJ_player_char) instance_change(OBJ_player_char_spin,true);
var pp=instance_find(OBJ_player,0),cc=pp.chaosCore;
cc.xu=cs[3]*256;cc.yu=cs[4]*256;cc.state=cs[2]?9:5;cc.next=cc.state;cc.vx=256;cc.vy=0;cc.move=0;cc.bg=2;cc.contacts=2;SCR_chaos_core_publish(pp);
if(cs[1]=="platform") {cc.state=14;cc.next=14;cc.vx=0;cc.move=1;cc.bg=0;cc.contacts=0;SCR_chaos_core_publish(pp);}
__view_set(e__VW.WView,0,348);__view_set(e__VW.HView,0,196);__view_set(e__VW.WPort,0,640);__view_set(e__VW.HPort,0,360);window_set_size(640,360);
__view_set(e__VW.XView,0,cs[5]);__view_set(e__VW.YView,0,cs[6]);
if(cs[1]!="sign" && cs[1]!="platform") __view_set(e__VW.Object,0,noone);
''')
append('objects/OBJ_chaos_zone/Step_2.gml','''
global.clTick++;var cs=global.clScenes[global.clIndex];
if(cs[1]!="sign" && cs[1]!="platform") {var rp=instance_find(OBJ_player,0);rp.chaosCore.xu=cs[3]*256;rp.chaosCore.yu=cs[4]*256;rp.chaosCore.vx=0;rp.chaosCore.vy=0;rp.chaosCore.state=1;rp.chaosCore.next=1;rp.chaosCore.move=0;SCR_chaos_core_publish(rp);}
if(cs[1]!="sign" && cs[1]!="platform") {__view_set(e__VW.Object,0,noone);__view_set(e__VW.XView,0,cs[5]);__view_set(e__VW.YView,0,cs[6]);__view_set(e__VW.WView,0,348);__view_set(e__VW.HView,0,196);__view_set(e__VW.WPort,0,348);__view_set(e__VW.HPort,0,196);if(surface_exists(application_surface))surface_resize(application_surface,348,196);}
var pp=instance_find(OBJ_player,0),ss=instance_find(OBJ_chaos_object_18,0),cc=pp.chaosCore;
var platforms=[];
if(cs[1]=="platform") for(var j=0;j<instance_number(OBJ_chaos_platform);j++){var po=instance_find(OBJ_chaos_platform,j);if(po.chaosPlacementIndex==cs[2])array_push(platforms,{placement:po.chaosPlacementIndex,x:po.chaosX,y:po.chaosY,vy:po.chaosVY/256,mode:po.chaosMode,owner_id:po.chaosOwnerId});}
array_push(global.clRows,{scene:cs[7],tick:global.clTick,sign_count:instance_number(OBJ_chaos_object_18),sign:instance_exists(ss)?[ss.chaosSign.state,ss.chaosSign.tick]:noone,prize:instance_exists(ss)?ss.chaosPrizeTableCpu:noone,player_object:object_get_name(pp.object_index),x:cc.xu/256,y:chaos_signed_yu(cc.yu)/256,state:cc.state,next:cc.next,floor:cc.bg&2,grounded:pp.chaosGrounded,contacts:cc.contacts,move:cc.move,owner:cc.support,owner_flags:cc.objects,platforms:platforms,projections:global.clProj,timer_alarm:instance_exists(OBJ_count_time)?OBJ_count_time.alarm[0]:-999,contact:global.chaosGoalContact,complete:global.chaosComplete,child_count:instance_number(OBJ_chaos_object_19),camera:[__view_get(e__VW.XView,0),__view_get(e__VW.YView,0)],filter:gpu_get_texfilter()});
global.clProj=[];
if(global.clTick==20 || (cs[1]=="sign" && global.clTick==320) || (cs[1]=="platform" && (global.clTick==31 || global.clTick==36 || global.clTick==152 || global.clTick==160 || global.clTick==278 || global.clTick==311))) global.clPending=true;
if(global.clTick>=(cs[1]=="sign"?600:(cs[1]=="platform"?700:22))) {
 global.clIndex++;
 if(global.clIndex>=array_length(global.clScenes)) {var f=file_text_open_write("OUT/rows.json");file_text_write_string(f,json_stringify(global.clRows));file_text_close(f);game_end();}
 else {var a=global.clScenes[global.clIndex][0];room_goto(a==1?ROM_chaos_mghz1:(a==2?ROM_chaos_mghz2:ROM_chaos_mghz3));}
}
'''.replace('OUT',out.as_posix()))
p=dest/'objects/OBJ_chaos_controls/OBJ_chaos_controls.yy';v=json.loads(p.read_text());v['eventList'].append({'$GMEvent':'v1','%Name':'','collisionObjectId':None,'eventNum':64,'eventType':8,'isDnD':False,'name':'','resourceType':'GMEvent','resourceVersion':'2.0'});p.write_text(json.dumps(v,indent=2))
(p.parent/'Draw_64.gml').write_text('if(global.clPending){var cs=global.clScenes[global.clIndex];surface_save(application_surface,"'+out.as_posix()+'/"+cs[7]+"-"+string(global.clTick)+".png");global.clPending=false;}')
p=dest/'scripts/SCR_buttons/SCR_buttons.gml';t=p.read_text();i=t.rfind('}');p.write_text(t[:i]+'global.btLeft=false;global.btRight=global.clScenes[global.clIndex][1]=="sign"&&!global.chaosGoalContact;global.btUp=false;global.btDown=false;global.btSpace=false;global.btSpacePress=false;\n'+t[i:])
p=dest/'scripts/SCR_chaos_mghz_effects/SCR_chaos_mghz_effects.gml';t=p.read_text()
if args.baseline_sampling:t=t.replace('var cp_filter=gpu_get_texfilter();','').replace('gpu_set_texfilter(false);','').replace('gpu_set_texfilter(cp_filter);','')
t=t.replace('function chaos_mghz_terrain_dynamic(cp_front) {','function chaos_mghz_terrain_dynamic(cp_front) {\n var dm=global.clScenes[global.clIndex][1];if(dm=="none")return;var oldFilter=gpu_get_texfilter();if(dm=="nearest")gpu_set_texfilter(false);')
t=t.replace('draw_sprite_part_ext(cp_mask','if(dm!="no-palettes") draw_sprite_part_ext(cp_mask').replace('draw_sprite_part(cp_strip','if(dm!="no-strip") draw_sprite_part(cp_strip')
pos=t.rfind('}');t=t[:pos]+'gpu_set_texfilter(oldFilter);\n'+t[pos:];p.write_text(t)
append('objects/OBJ_system/Create_0.gml','global.clProj=[];')
p=dest/'scripts/SCR_chaos_core/SCR_chaos_core.gml';t=p.read_text()
for name in ('SCR_cc_project_floor','SCR_cc_ceiling_profile'):
 t=t.replace('function '+name+'(', 'function '+name+'_original(')
 t+='\nfunction '+name+'(cc,ss){var before=cc.yu/256;'+name+'_original(cc,ss);if(before!=cc.yu/256)array_push(global.clProj,{path:"'+name+'",before:before,after:cc.yu/256,index:ss.index,block:ss.tile,flags:ss.flags,probe:[ss.ax,ss.ay],owner:cc.support,floor:cc.bg&2,state:cc.state,next:cc.next});}\n'
p.write_text(t)
p=dest/'objects/OBJ_chaos_terrain_foreground/Draw_0.gml';t=p.read_text()
if args.baseline_sampling:t=t.replace('if (chaos_is_mghz()) gpu_set_texfilter(false);','').replace('if (chaos_is_mghz()) gpu_set_texfilter(cp_mghz_filter);','')
t='var fm=global.clScenes[global.clIndex][1];if(fm=="no-foreground")exit;var ff=gpu_get_texfilter();if(fm=="nearest-foreground")gpu_set_texfilter(false);\n'+t+'\ngpu_set_texfilter(ff);\n';p.write_text(t)
print(dest/'SonicChaos_POC.yyp')
