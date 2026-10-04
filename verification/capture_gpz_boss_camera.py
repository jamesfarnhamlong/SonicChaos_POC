"""Prepare isolated GameMaker render/trace fixtures; never instrument shipping code.

Initial actor/camera positions and the final-health request are controlled fixture
inputs. Afterwards the real player, placement manager, boss and camera run normally.
"""
import argparse,json,shutil,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'build/gpz-boss-e1/extracted/SonicChaos_GPZ3_Boss_51_20261003_E1'
BUILD=ROOT/'build/gpz-boss-e2'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--baseline',action='store_true');ap.add_argument('--approach',action='store_true');a=ap.parse_args()
    name=('baseline' if a.baseline else 'updated')+('-approach' if a.approach else '');dest=BUILD/('fixture-'+name)
    assert not dest.exists(),dest
    shutil.copytree(BASE,dest)
    if not a.baseline:
        p=Path('scripts/SCR_chaos_gpz_boss/SCR_chaos_gpz_boss.gml');shutil.copy2(ROOT/p,dest/p)
    def append(p,t):
        q=dest/p;q.write_text(q.read_text()+'\n'+t+'\n')
    # All diagnostic output remains in the workspace. Disable file sandbox only
    # in this isolated compiler fixture; shipping options are untouched.
    p=dest/'options/windows/options_windows.yy';p.write_text(p.read_text().replace('"option_windows_disable_sandbox": false','"option_windows_disable_sandbox": true').replace('"option_windows_disable_sandbox":false','"option_windows_disable_sandbox":true'))
    # Suppress legacy save/config writes in this isolated screenshot session.
    for n in ['SCR_save_game','SCR_load_game']:
        p=dest/f'scripts/{n}/{n}.gml'
        if p.exists():p.write_text('function '+n+'() {}\n')
    append('objects/OBJ_system/Create_0.gml',r'''
global.screenSize=1;global.windowSize=1;global.chaosDebugSession=true;
global.checkPoint=false;global.player=1;global.playerSuper=false;
window_set_fullscreen(false);room_goto(ROM_chaos_gpz3);
''')
    append('objects/OBJ_chaos_zone/Create_0.gml',r'''
global.captureTick=0;global.captureRows=[];global.capturePending=false;
global.captureDone=false;global.captureHit=false;
// Controlled starting point only. No actor/camera teleports during handoff.
var fp=instance_find(OBJ_player,0);fp.chaosCore.xu=START_X*256;fp.chaosCore.yu=START_Y*256;
fp.chaosCore.state=14;fp.chaosCore.next=14;fp.chaosCore.move=1;
SCR_chaos_core_publish(fp);
__view_set(e__VW.XView,0,START_CAMERA);__view_set(e__VW.YView,0,64);
window_set_size(640,360);surface_resize(application_surface,640,360);
__view_set(e__VW.WPort,0,640);__view_set(e__VW.HPort,0,360);
'''.replace('START_X','1376' if a.approach else '1760').replace('START_Y','270' if a.approach else '160').replace('START_CAMERA','1200' if a.approach else '1420'))
    if a.approach:
        p=dest/'scripts/SCR_buttons/SCR_buttons.gml';t=p.read_text();i=t.rfind('}')
        t=t[:i]+'''if (room==ROM_chaos_gpz3 && instance_exists(OBJ_player)) {
 global.btRight=instance_find(OBJ_player,0).x<1600;global.btLeft=false;
 global.btUp=false;global.btDown=false;global.btSpace=false;global.btSpacePress=false;
}
'''+t[i:];p.write_text(t)
    target='chaos_51_fight_camera_y(v.w,v.h)' if not a.baseline else '96'
    out=(BUILD/(name+'-runtime-trace.json')).as_posix()
    append('objects/OBJ_chaos_zone/Step_2.gml',r'''
global.captureTick++;
var v=chaos_vp_current(),fp=instance_find(OBJ_player,0);
var exists=instance_exists(OBJ_chaos_object_51),mode=0,bx=-1,by=-1,alive=false,bottom=0,leftlimit=0,rightlimit=0;
var bt=0,cleared=false;
if (exists) {
 var b=instance_find(OBJ_chaos_object_51,0).chaosBoss51;
 mode=b.camera_mode;bx=chaos_51_x(b.head);by=chaos_51_y(b.head);alive=b.active;
 bottom=b.camera_bottom;leftlimit=b.camera_left;rightlimit=b.camera_right;bt=b.tick;cleared=b.clear;
 if (bt==300 && !global.captureDone) global.capturePending=true;
 if (bt==350 && !global.captureHit) { b.head.health=1;b.head.requested=$0D;global.captureHit=true; }
}
var px=fp.chaosCore.xu/256,py=chaos_signed_yu(fp.chaosCore.yu)/256;
array_push(global.captureRows,{update:global.captureTick,boss_tick:bt,created:exists,active:alive,
 camera_left:v.left,camera_top:v.top,camera_mode:mode,
 sonic_world:[px,py],sonic_screen:[px-v.left,py-v.top],
 boss_world:[bx,by],boss_screen:[bx-v.left,by-v.top],
 fight_target:[chaos_51_fight_camera_target(v.w)-1,TARGET_Y],
 limits:[leftlimit,rightlimit,bottom],viewport:[v.w,v.h],clear:cleared,
 player_state:fp.chaosCore.state,player_requested:fp.chaosCore.next});
if (global.captureTick>=1000) {
 var f=file_text_open_write("OUTPUT");file_text_write_string(f,json_stringify(global.captureRows));file_text_close(f);game_end();
}
'''.replace('TARGET_Y',target).replace('OUTPUT',out))
    p=dest/'objects/OBJ_chaos_controls/OBJ_chaos_controls.yy'
    obj=json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
    obj['eventList'].append({'$GMEvent':'v1','%Name':'','collisionObjectId':None,'eventNum':64,'eventType':8,'isDnD':False,'name':'','resourceType':'GMEvent','resourceVersion':'2.0'})
    p.write_text(json.dumps(obj,indent=2))
    screenshot=(BUILD/(name+'-640x360.png')).as_posix()
    (p.parent/'Draw_64.gml').write_text('if (global.capturePending && !global.captureDone) { surface_save(application_surface,"'+screenshot+'");global.captureDone=true;global.capturePending=false; }\n')
    print(dest/'SonicChaos_POC.yyp')
if __name__=='__main__':main()
