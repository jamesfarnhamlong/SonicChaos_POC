"""Original SMS VDP backdrop audit across AQZ1/2 water raster modes."""
from pathlib import Path
import sys,json
r=Path(__file__).resolve().parents[1];sys.path.insert(0,str(r.parent/'sonic-chaos-reference-work/tools'))
import rom as R
from sez_surfaces_rig import ZoneGame
rom=R.load(r.parent/'source/Sonic Chaos (Europe).sms');checks=0;out={}
for act,line,width in [(0,568,168),(1,788,128)]:
 g=ZoneGame(rom,4,act,hooks={0x9DDD:'controller',0x0652:'irq'});s,m=g.s,g.m;cpu=bytes(s.cpu.get_state_view());observed=[]
 def restore():g.e.restore();s.cpu.get_state_view()[:]=cpu
 g.restore_snapshot=restore
 def sample(mm):
  global checks
  assert s.reg[7]==0 and s.cram[16]==16;checks+=2
  observed.append([s.reg[7],s.cram[16],s.cram[0],m[0xD132]])
 g.hook(0x0683,sample);g.hook(0x1CD2,sample)
 for delta in (-96,-1,0,1,96,192,193,240):
  def cam(mm,d=delta):
   if mm.slot[2]==12:s.w16(0xD176,line-d)
  g.pre[0x9DDD]=cam
  def setup(mm):s.w16(0xD176,line-delta);s.w16(0xD286,line-delta);m[0xD131]=255
  g.begin(944,line-20,cur=14,f3=1,floor=False,width=width,types=(12,13,14,50),apply=setup)
  g.run(12);sample(None);g.pre.clear()
 assert {x[2] for x in observed}>={5,16,20},set(x[2] for x in observed)
 draw=(r/f'objects/OBJ_chaos_aqz{act+1}_terrain/Draw_0.gml').read_text()
 assert draw.index('make_color_rgb(0,0,85)')<draw.index('draw_rectangle')<draw.index('chaos_aqz_palette_begin(false)');checks+=1
 out[f'aqz{act+1}']=dict(register7=0,backdrop_cram_index=16,backdrop_cram=16,rgb=[0,0,85],observed=sorted(set(map(tuple,observed))))
# The Windows-accepted I gameplay and every other existing file remain byte-identical.
import zipfile,hashlib,ast,importlib.util
zpath=r.parent/'releases/SonicChaos_AQZ_P4_20261010_I.zip'
assert hashlib.sha256(zpath.read_bytes()).hexdigest()=='21fc6eabebadb18d538eaf24508704c116efe8f18db72a90d6844a9d0f123088'
allowed={'POC_notes/generate_aqz_foundation.py','objects/OBJ_chaos_aqz1_terrain/Draw_0.gml','objects/OBJ_chaos_aqz2_terrain/Draw_0.gml','verification/verify_aqz_p4_i_backdrop.py','verification/verify_aqz_p4_c.js'}
with zipfile.ZipFile(zpath) as z:
 for name in z.namelist():
  rel=name.split('/',1)[1]
  if rel=='verification/verify_aqz_p4_c.js':
   assert (r/rel).read_text().rstrip()==z.read(name).decode().replace('\r\n','\n').rstrip();checks+=1
  if rel not in allowed:
   assert (r/rel).read_bytes()==z.read(name),rel;checks+=1
spec=importlib.util.spec_from_file_location('generator',r/'POC_notes/generate_aqz_foundation.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class Captured(Exception):pass
sources=[]
def capture(src,*args):sources.append(src);raise Captured()
mod.compile=capture
try:mod.main()
except Captured:pass
tree=ast.parse(sources[0]);writes=[n for n in ast.walk(tree) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and isinstance(n.value.func,ast.Attribute) and n.value.func.attr=='write_text' and 'Draw_0.gml' in ast.unparse(n)]
assert len(writes)==1
for act in (1,2,3):
 obj=f'OBJ_chaos_aqz{act}_terrain';draw=(r/'objects'/obj/'Draw_0.gml').read_text();tmp=r/'build/aqz-p4-i2/importer-fixture';(tmp/'objects'/obj).mkdir(parents=True,exist_ok=True)
 draws=[line.replace('make_color_rgb(0,0,85)','make_color_rgb(1,1,1)') for line in draw.splitlines() if line not in ['chaos_aqz_palette_begin(false);','chaos_aqz_palette_end();']]
 exec(compile(ast.Module(body=writes,type_ignores=[]),'<importer>','exec'),dict(ROOT=tmp,obj=obj,key=f'aqz{act}',draws=draws))
 assert (tmp/'objects'/obj/'Draw_0.gml').read_text()==draw;checks+=1
b=r/'build/aqz-p4-i2';b.mkdir(parents=True,exist_ok=True);report=dict(status='PASS',assertions=checks,rom_sha256=R.SHA256,acts=out);(b/'water-backdrop-results.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
