"""Excluded native diagnostic copy; calls shipping implementations unchanged."""
from pathlib import Path
import json,shutil,zipfile,subprocess,sys,argparse
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--label',default='E-native');args=parser.parse_args()
assert args.label.replace('-','').isalnum()
stage=ROOT/'build/aqz-p1'/args.label/'project'
assert not stage.exists(),'Use a unique native diagnostic directory'
with zipfile.ZipFile(ROOT.parent/'releases/SonicChaos_AQZ_P1_20261009_D.zip') as archive:
 for name in archive.namelist():
  rel=name.split('/',1)[1]
  if not rel or name.endswith('/'):continue
  dest=stage/rel;dest.resolve().relative_to(stage.resolve());dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(archive.read(name))
project=json.loads((ROOT/'SonicChaos_POC.yyp').read_text())
for r in project['resources']:
 directory=(ROOT/r['id']['path']).parent
 shutil.copytree(directory,stage/directory.relative_to(ROOT),dirs_exist_ok=True)
shutil.copy2(ROOT/'SonicChaos_POC.yyp',stage/'SonicChaos_POC.yyp')
subprocess.run([sys.executable,str(ROOT/'verification/prepare_player_state_native_audit.py'),'--stage',str(stage)],check=True)
p=stage/'objects/OBJ_chaos_zone/Create_0.gml';s=p.read_text()
s=s.replace('var weak=global.auditMode=="weak",boss=','var natural=global.auditMode=="aqz-natural";var weak=global.auditMode=="weak",boss=')
s=s.replace('if(boss) {\n  var b=', 'if(natural) {c.xu=110*256;c.yu=238*256;c.state=1;c.next=1;c.move=0;c.vx=0;c.vy=0;c.bg=2;c.contacts=2;c.previous=SCR_cc_lookup(110,256,0).flags;}\n if(boss) {\n  var b=')
p.write_text(s)
p=stage/'scripts/SCR_buttons/SCR_buttons.gml';s=p.read_text().replace('global.btRight=corridor&&!global.btLeft;','global.btRight=corridor&&!global.btLeft&&(global.auditMode!="aqz-natural"||global.auditTick>=2);');p.write_text(s)
p=stage/'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml';s=p.read_text().replace('playerJump:global.playerJump,','facing:(p.chaosCore.player_flags>>4)&1,animation:variable_struct_exists(p.chaosCore,"visual_anim")?p.chaosCore.visual_anim:{},playerJump:global.playerJump,');p.write_text(s)
p=stage/'objects/OBJ_chaos_zone/Draw_0.gml';s=p.read_text().replace('global.auditTick++;','if(global.auditTick==9||global.auditTick==31||global.auditTick==143||global.auditTick==369)screen_save("player-E-"+global.auditMode+"-"+string(global.auditTick)+".png");\n global.auditTick++;');p.write_text(s)
print(stage/'SonicChaos_POC.yyp')
