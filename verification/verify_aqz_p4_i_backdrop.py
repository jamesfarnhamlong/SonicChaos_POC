"""AQZ3 original VDP backdrop and POC solid-fill presentation audit."""
from pathlib import Path
import sys,json,importlib.util,ast,hashlib
r=Path(__file__).resolve().parents[1];sys.path.insert(0,str(r.parent/'sonic-chaos-reference-work/tools'));sys.path.insert(0,str(r/'POC_notes'))
import rom as R
from sez_surfaces_rig import ZoneGame
from PIL import Image
checks=0
def check(x):
 global checks
 assert x
 checks+=1
rom=R.load(r.parent/'source/Sonic Chaos (Europe).sms');g=ZoneGame(rom,4,2);s=g.s;rows=[]
for _ in range(90):
 s.run_frame();check(s.reg[7]==0);check(s.cram[16]==0x10);check(s.cram[0]==0x10);check(s.mem[0xD443]==0);rows.append([s.reg[7],s.cram[16],s.cram[0]])
cache=json.loads((r/'POC_notes/rom-cache/aqz/implementation-manifest.json').read_text())['acts']['aqz3']['graphics']['palettes'];check(cache['sprite']['cram'][0]==16);check(rom[cache['sprite']['file']]==16);check(rom[cache['background']['file']]==16);check(rom[0x3B64D+16*16]==16) # boss palette16 also preserves backdrop zero
rgb=[(16&3)*85,((16>>2)&3)*85,((16>>4)&3)*85];check(rgb==[0,0,85])
draw=(r/'objects/OBJ_chaos_aqz3_terrain/Draw_0.gml').read_text();check(draw.index('make_color_rgb(0,0,85)')<draw.index('draw_rectangle')<draw.index('chaos_aqz_palette_begin(false)')<draw.index('draw_sprite'))
# Recover importer-generated source without executing its asset-writing main.
spec=importlib.util.spec_from_file_location('aqz_importer',r/'POC_notes/generate_aqz_foundation.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Captured(Exception):pass
captured=[]
def capture(src,*args):captured.append(src);raise Captured()
module.compile=capture
try:module.main()
except Captured:pass
check(len(captured)==1);ast.parse(captured[0]);check("if key in ('aqz1','aqz2','aqz3')" in captured[0]);check('draws[1:4]' in captured[0] and 'draws[4:]' in captured[0])
tree=ast.parse(captured[0]);writes=[n for n in ast.walk(tree) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and isinstance(n.value.func,ast.Attribute) and n.value.func.attr=='write_text' and 'Draw_0.gml' in ast.unparse(n)]
check(len(writes)==1)
tmp=r/'build/aqz-p4-i/importer-fixture';obj='OBJ_chaos_aqz3_terrain';(tmp/'objects'/obj).mkdir(parents=True,exist_ok=True)
draws=[line.replace('make_color_rgb(0,0,85)','make_color_rgb(1,1,1)') for line in draw.splitlines() if line not in ['chaos_aqz_palette_begin(false);','chaos_aqz_palette_end();']]
exec(compile(ast.Module(body=writes,type_ignores=[]),'<terrain-draw-importer>','exec'),dict(ROOT=tmp,obj=obj,key='aqz3',draws=draws))
check((tmp/'objects'/obj/'Draw_0.gml').read_text()==draw)
# The actual empty scenery pixels expose the fill. Original art is untouched.
transparent=0
for n in [1,2]:
 files=list((r/f'sprites/SPR_chaos_aqz3_terrain_{n}').glob('*.png'));check(len(files)==1);im=Image.open(files[0]).convert('RGBA');x0=max(1727,n*1024)-n*1024;x1=min(2075,n*1024+im.width)-n*1024
 if x1>x0:transparent+=im.crop((x0,78,x1,274)).getchannel('A').histogram()[0]
check(transparent>0)
report=dict(status='PASS',assertions=checks,rom_sha256=R.SHA256,observed_register_cram=sorted(set(map(tuple,rows))),rgb=rgb,frames=90,transparent_fight_pixels=transparent,sprite_palette_file=cache['sprite']['file'],background_palette_file=cache['background']['file'],old_fill='vertex tint (1,1,1) under indexed-texture shader; not a CRAM lookup',new_fill='opaque RGB(0,0,85) before indexed shader')
b=r/'build/aqz-p4-i';b.mkdir(exist_ok=True);(b/'backdrop-results.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
