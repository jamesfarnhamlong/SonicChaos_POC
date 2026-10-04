"""Isolated actual GameMaker render fixture; shipping source never instrumented."""
from pathlib import Path
import json,argparse
from package_mghz import ROOT,BUILD,snapshot
ap=argparse.ArgumentParser();ap.add_argument('--name',default='capture-fixture');args=ap.parse_args()
dest=BUILD/args.name;snapshot(dest)
m=json.loads((ROOT/'POC_notes/rom-cache/mghz/implementation-manifest.json').read_text())
scenes=[]
for width,height in ((256,224),(348,196)):
    for i in (1,2,3):
        a=m['acts'][f'mghz{i}'];scenes.append([i,width,height,*a['start']['camera'],*a['start']['player_anchor'],f'mghz{i}-start-{width}'])
    scenes.extend([[1,width,height,1280,720,1410,784,f'oil-{width}'],[1,width,height,96,432,180,530,f'spike-3e-{width}'],[2,width,height,864,320,1020,400,f'spike-3f-{width}']])
    for block,label in ((89,'twist'),(210,'scenery')):
        a=m['acts']['mghz2'];ids=sum(a['layout']['rows'],[]);i=ids.index(block);x=i%128*32;y=i//128*32
        scenes.append([2,width,height,max(0,x-64),max(0,y-64),x,y-18,f'{label}-{width}'])
def append(rel,t):p=dest/rel;p.write_text(p.read_text()+'\n'+t+'\n')
for n in ('SCR_save_game','SCR_load_game'):(dest/f'scripts/{n}/{n}.gml').write_text('function '+n+'() {}\n')
p=dest/'options/windows/options_windows.yy';p.write_text(p.read_text().replace('"option_windows_disable_sandbox":false','"option_windows_disable_sandbox":true').replace('"option_windows_disable_sandbox": false','"option_windows_disable_sandbox": true'))
append('objects/OBJ_system/Create_0.gml','global.captureScenes='+json.dumps(scenes)+';global.captureIndex=0;global.captureRows=[];global.chaosDebugSession=true;global.checkPoint=false;global.screenSize=1;global.windowSize=1;window_set_fullscreen(false);room_goto(ROM_chaos_mghz1);')
append('objects/OBJ_chaos_zone/Create_0.gml','''
global.captureTick=0;global.capturePending=false;
with (OBJ_effect_fade_in) instance_destroy();
var cs=global.captureScenes[global.captureIndex];
var pp=instance_find(OBJ_player,0);pp.chaosCore.xu=cs[5]*256;pp.chaosCore.yu=cs[6]*256;SCR_chaos_core_publish(pp);
__view_set(e__VW.WView,0,cs[1]);__view_set(e__VW.HView,0,cs[2]);
__view_set(e__VW.WPort,0,cs[1]);__view_set(e__VW.HPort,0,cs[2]);
window_set_size(cs[1],cs[2]);
__view_set(e__VW.XView,0,cs[3]);__view_set(e__VW.YView,0,cs[4]);
__view_set(e__VW.Object,0,noone); // fixture camera; gameplay camera acceptance remains separate
''')
out=(BUILD/'captures').as_posix();Path(out).mkdir(exist_ok=True)
append('objects/OBJ_chaos_zone/Step_2.gml','''
global.captureTick++;
var cs=global.captureScenes[global.captureIndex];
// Controlled render camera only. The actual player/core/rings/scenery still run.
__view_set(e__VW.XView,0,cs[3]);__view_set(e__VW.YView,0,cs[4]);
__view_set(e__VW.WView,0,cs[1]);__view_set(e__VW.HView,0,cs[2]);
__view_set(e__VW.WPort,0,cs[1]);__view_set(e__VW.HPort,0,cs[2]);
if (surface_exists(application_surface)) surface_resize(application_surface,cs[1],cs[2]);
if (global.captureTick==4 || global.captureTick==8 || global.captureTick==20) global.capturePending=true;
if (global.captureTick>=22) {
    global.captureIndex++;
    if (global.captureIndex>=array_length(global.captureScenes)) {
        var cf=file_text_open_write("OUT/runtime-rows.json");file_text_write_string(cf,json_stringify(global.captureRows));file_text_close(cf);game_end();
    } else {
        var nextact=global.captureScenes[global.captureIndex][0];
        if (nextact==1) room_goto(ROM_chaos_mghz1);
        if (nextact==2) room_goto(ROM_chaos_mghz2);
        if (nextact==3) room_goto(ROM_chaos_mghz3);
    }
}
'''.replace('OUT',out))
p=dest/'objects/OBJ_chaos_controls/OBJ_chaos_controls.yy';v=json.loads(p.read_text());v['eventList'].append({'$GMEvent':'v1','%Name':'','collisionObjectId':None,'eventNum':64,'eventType':8,'isDnD':False,'name':'','resourceType':'GMEvent','resourceVersion':'2.0'});p.write_text(json.dumps(v,indent=2))
(p.parent/'Draw_64.gml').write_text('''
if (variable_global_exists("capturePending") && global.capturePending) {
    var cs=global.captureScenes[global.captureIndex];
    surface_save(application_surface,"OUT/"+cs[7]+"-"+string(global.captureTick)+".png");
    var pp=instance_find(OBJ_player,0);
    var ce=global.chaosMghzEffects;
    array_push(global.captureRows,{scene:cs[7],update:global.captureTick,viewport:[__view_get(e__VW.WView,0),__view_get(e__VW.HView,0)],camera:[__view_get(e__VW.XView,0),__view_get(e__VW.YView,0)],anchor:[pp.chaosCore.xu/256,chaos_signed_yu(pp.chaosCore.yu)/256],effects:[ce.frame,ce.cram4,ce.cram11,ce.strip_frame]});
    global.capturePending=false;
}
'''.replace('OUT',out))
# All synthetic diagnostic input is confined to this fixture.
p=dest/'scripts/SCR_buttons/SCR_buttons.gml';t=p.read_text();i=t.rfind('}');p.write_text(t[:i]+'global.btLeft=false;global.btRight=false;global.btUp=false;global.btDown=false;global.btSpace=false;global.btSpacePress=false;\n'+t[i:])
print(dest/'SonicChaos_POC.yyp')
