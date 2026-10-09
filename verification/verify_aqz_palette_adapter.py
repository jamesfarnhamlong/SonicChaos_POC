"""Immutable input and idempotence checks; not a GPU/hardware raster observation."""
from pathlib import Path
import json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];cache=ROOT/'POC_notes/rom-cache/aqz';checks=0
pal=json.loads((cache/'water-runtime.json').read_text())['raster']['palette_modes']
def rgb(v):return ((v&3)*85,((v>>2)&3)*85,((v>>4)&3)*85)
colors=[list(map(rgb,pal[n])) for n in ['above_water_cram','split_irq_cram','fully_submerged_cram']]
def check(value):
 global checks
 assert value
 checks+=1
def yy(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
def render(pixel,proxy,mode):
 r,g,b,a=pixel;idx=a-1 if proxy else r-1
 encoded=(16<=idx<32) if proxy else (g==b==1 and 0<=idx<32)
 if not encoded:return pixel
 col=(r,g,b) if proxy and mode==0 else colors[mode][idx]
 return (*col,255 if proxy else a)
for row in json.loads((cache/'player-palette-adapter.json').read_text())['copies']:
 src=ROOT/'sprites'/row['source'];dst=ROOT/'sprites'/row['adapter'];s=yy(src/(src.name+'.yy'));d=yy(dst/(dst.name+'.yy'))
 check(len(s['frames'])==len(d['frames']));check([s['sequence'][v] for v in ['xorigin','yorigin']]==[d['sequence'][v] for v in ['xorigin','yorigin']])
 for sf,df in zip(s['frames'],d['frames']):
  before=list(Image.open(src/(sf['name']+'.png')).convert('RGBA').getdata());after=list(Image.open(dst/(df['name']+'.png')).convert('RGBA').getdata());check(len(before)==len(after))
  for base,proxy in zip(before,after):
   check(base[:3]==proxy[:3]);check(bool(base[3])==bool(proxy[3]));check(render(proxy,True,0)==base)
  for pixel in set(after):
   for mode in range(3):
    first=render(pixel,True,mode);check(render(first,True,mode)==first)
    # Repeated crossings/deep/backtrack/restart always resample the same source.
    for selection in [0,1,2,1,0,2,0]:
     expected=pixel if pixel[3]==0 else ((*pixel[:3],255) if selection==0 else (*colors[selection][pixel[3]-1],255))
     check(render(pixel,True,selection)==expected)
for idx in range(32):
 for mode in range(3):
  first=render((idx+1,1,1,255),False,mode);check(render(first,False,mode)==first)
shader=(ROOT/'shaders/SHD_chaos_aqz_palette/SHD_chaos_aqz_palette.fsh').read_text();check('distance' not in shader and 'nearest' not in shader);check('texture2D(gm_BaseTexture,v_vTexcoord);' in shader);check('vec4(output_rgb,alpha)*v_vColour' in shader)
# Cached ring surface is cleared and converted once; composite has reset the shader.
s=(ROOT/'objects/OBJ_chaos_ring_manager/Draw_0.gml').read_text();check(s.index('draw_clear_alpha')<s.index('chaos_aqz_palette_begin')<s.index('chaos_aqz_palette_end')<s.index('draw_surface('))
(ROOT/'build/aqz-p1/palette-results.json').write_text(json.dumps({'status':'PASS','assertions':checks,'limit':'CPU adapter/source locks; Windows raster comparison remains required'},indent=2)+'\n');print('Palette adapter',checks,'assertions PASS')
