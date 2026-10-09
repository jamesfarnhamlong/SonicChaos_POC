from pathlib import Path
import re,shutil,zipfile,argparse
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Build an excluded diagnostic copy; never patch the active runtime.')
parser.add_argument('--stage',type=Path)
args=parser.parse_args()
stage=args.stage or root/'build/player-state-native/project'
if not args.stage:
 with zipfile.ZipFile(root.parent/'releases/SonicChaos_AQZ_P1_20261009_D.zip') as archive:
  for name in archive.namelist():
   parts=name.split('/',1)
   if len(parts)<2 or not parts[1] or name.endswith('/'):continue
   target=stage/parts[1]
   target.resolve().relative_to(stage.resolve()) # reject any archive path outside the diagnostic project
   target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(name))
assert stage.is_dir()
for d in ['scripts','objects']:
 for src in (root/d).rglob('*.gml'):
  dst=stage/src.relative_to(root)
  if dst.parent.exists():shutil.copy2(src,dst)
def append(rel,text):
 p=stage/rel;p.write_text(p.read_text()+'\n'+text)
append('objects/OBJ_menu_title/Create_0.gml',r'''
if (parameter_count()>0 && string_pos("--audit=",parameter_string(1))==1) {
 global.auditMode=string_delete(parameter_string(1),1,8);global.auditTick=0;
 global.auditHandle=file_text_open_write("player-audit-"+global.auditMode+".jsonl");
 var entries=chaos_debug_entries();var entry=14;
 if(global.auditMode=="weak")entry=0;
 if(string_pos("boss",global.auditMode)==1)entry=2;
 chaos_debug_launch(entries[entry]);
}
''')
p=stage/'scripts/SCR_buttons/SCR_buttons.gml';s=p.read_text().replace('function SCR_buttons() {',r'''function SCR_buttons() {
 if(variable_global_exists("auditMode")) {
  var corridor=string_pos("aqz",global.auditMode)==1;
  global.btLeft=string_pos("horizontal",global.auditMode)==1 || corridor&&global.auditMode=="aqz-failure"&&global.auditTick>=20&&global.auditTick<24;
  global.btRight=corridor&&!global.btLeft;global.btUp=false;global.btDown=false;
  global.btSpace=false;global.btSpacePress=false;global.btA=false;global.btStart=false;
  global.btLeftPress=false;global.btRightPress=false;global.btUpPress=false;global.btDownPress=false;global.btAPress=false;global.btStartPress=false;
  global.btLeftRel=false;global.btRightRel=false;global.btUpRel=false;global.btDownRel=false;global.btSpaceRel=false;global.btARel=false;global.btStartRel=false;
  return;
 }
''');p.write_text(s)
append('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml',r'''
function audit_snapshot(c) {
 return {state:c.state,next:c.next,d503:c.move,d448:variable_struct_exists(c,"d448")?c.d448:-1,
 x:c.xu/256,y:chaos_signed_yu(c.yu)/256,vx:c.vx/256,vy:c.vy/256,bg:c.bg,contacts:c.contacts,
 plane:c.plane,foot:c.foot_block};
}
function audit_write(row) {file_text_write_string(global.auditHandle,json_stringify(row));file_text_writeln(global.auditHandle);}
function audit_player(p,kind) {
 audit_write({kind:kind,update:global.auditTick,core:audit_snapshot(p.chaosCore),
 playerJump:global.playerJump,playerJumpSpring:global.playerJumpSpring,
 springVisual:p.chaosSpringVisual,sprite:sprite_get_name(p.sprite_index),image_index:p.image_index,
 image_speed:p.image_speed,broken:variable_global_exists("chaosBrokenCells")?global.chaosBrokenCells:[]});
}
''')
append('objects/OBJ_chaos_zone/Create_0.gml',r'''
if(variable_global_exists("auditMode")) {
 var p=instance_find(OBJ_player,0),c=p.chaosCore;
 var weak=global.auditMode=="weak",boss=string_pos("boss",global.auditMode)==1;
 c.xu=(weak?1912:496)*256;c.yu=(weak?846:334)*256;
 c.state=5;c.next=5;c.move=0;c.vx=0;c.vy=0;c.bg=2;c.contacts=2;c.previous=0;
 if(boss) {
  var b=chaos_boss_new();c.xu=b.xu;c.yu=(b.y-48)*256;
  c.state=10;c.next=10;c.move=3;c.vy=256;c.bg=0;c.contacts=0;c.d448=global.auditMode=="boss255"?255:0;
 }
 if(string_pos("horizontal",global.auditMode)==1) {c.xu=1030*256;c.yu=234*256;c.vx=-1024;c.vy=0;c.move=3;c.bg=0;c.contacts=0;c.state=global.auditMode=="horizontal9"?9:14;c.next=c.state;}
 SCR_chaos_core_publish(p);SCR_chaos_core_sprites(p);
 if(boss) {
  var result=chaos_boss_contact(b,c,true);SCR_chaos_core_publish(p);
  audit_player(p,"contact-result-"+string(result));
 }
 __view_set(e__VW.XView,0,max(0,c.xu/256-128));__view_set(e__VW.YView,0,max(0,c.yu/256-96));
 audit_player(p,"seed");
}
''')
append('objects/OBJ_chaos_zone/Step_2.gml',r'''
if(variable_global_exists("auditMode")) {
 var p=instance_find(OBJ_player,0);
 if(instance_exists(p)&&variable_instance_exists(p,"chaosCore"))audit_player(p,"zone-end");
 else audit_write({kind:"missing-player",update:global.auditTick});
}
''')
append('objects/OBJ_chaos_zone/Draw_0.gml',r'''
if(variable_global_exists("auditMode")) {
 var p=instance_find(OBJ_player,0);
 if(instance_exists(p)&&variable_instance_exists(p,"chaosCore"))audit_player(p,"update");
 global.auditTick++;
 if(global.auditTick>=(string_pos("aqz",global.auditMode)==1?500:120)) {
  file_text_close(global.auditHandle);game_end();
 }
}
''')
# Wrappers in verification copy only; original implementations called exactly once.
wraps={'SCR_cc_fall':None,'SCR_cc_spring':None,'SCR_cc_ceiling_spring':None,'SCR_cc_project_floor':None,'SCR_cc_project_side':None,'SCR_cc_ceiling_profile':None,'SCR_cc_break13_floor':None,'SCR_cc_break13_side':None,'SCR_cc_break16_floor':None,'chaos_spring26_launch':None}
for rel in ['scripts/SCR_chaos_core/SCR_chaos_core.gml','scripts/SCR_chaos_spring/SCR_chaos_spring.gml']:
 p=stage/rel;s=p.read_text();extra=''
 for name in wraps:
  m=re.search(r'function '+name+r'\(([^)]*)\)\s*\{',s)
  if not m:continue
  params=m.group(1);args=[a.strip() for a in params.split(',')];obj=args[0]
  s=s[:m.start()]+s[m.start():].replace('function '+name+'(', 'function audit_original_'+name+'(',1)
  extra+='\nfunction '+name+'('+params+') {\n'
  extra+=' if(!variable_global_exists("auditMode")) return audit_original_'+name+'('+params+');\n'
  extra+=' var before=audit_snapshot('+obj+');var result=audit_original_'+name+'('+params+');\n'
  meta=[]
  for a in args[1:]:
   if a=='cp_s':meta.append('sample:{tile:cp_s.tile,index:cp_s.index,flags:cp_s.flags,ax:cp_s.ax,ay:cp_s.ay}')
   else:meta.append(a+':'+a)
  extra+=' audit_write({kind:"call",update:global.auditTick,call:"'+name+'",before:before,after:audit_snapshot('+obj+'),result:is_undefined(result)?-1:result'+(','+','.join(meta) if meta else '')+'});return result;\n}\n'
 p.write_text(s+extra)
print(stage/'SonicChaos_POC.yyp')
