"""Pixel checks from shipped strip Draw calls and the unchanged approved sprite."""
import json,math
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
raw=json.loads((ROOT/'build/aqz-p1/strip-d-draws.json').read_text());folder=ROOT/'sprites'/raw['sprite'];yy=json.loads((folder/(folder.name+'.yy')).read_text());sprite=Image.open(folder/(yy['frames'][1]['name']+'.png')).convert('RGBA');origin=yy['sequence']['xorigin'];checks=0

def check(value):
 global checks
 assert value
 checks+=1
check(sprite.getbbox()==(24,28,40,39));check(origin==31);check(sprite.size==(64,64))
coverage={}
for row in raw['cases']:
 width=row['width'];cam=math.floor(row['cameraX']);out=Image.new('RGBA',(width,64));canonical=Image.new('RGBA',(256,64));tile=Image.new('RGBA',(256,64))
 # Each original instance's first draw is the unmodified canonical anchor.
 bases=[]
 for draw in row['draws']:
  dx=draw['x']-cam
  out.alpha_composite(sprite,(dx-origin,0))
  if 0<=dx<256:bases.append(draw)
 check(len(bases)==2)
 for draw in bases:
  dx=draw['x']-cam
  canonical.alpha_composite(sprite,(dx-origin,0))
  for shift in [-256,0,256]:tile.alpha_composite(sprite,(dx-origin+shift,0))
 if width==256:check(out.tobytes()==canonical.tobytes())
 else:
  expected=Image.new('RGBA',(width,64))
  for x in range(0,width,256):expected.paste(tile,(x,0))
  check(out.tobytes()==expected.tobytes()) # every pixel, including both seams
  for boundary in range(256,width,256):
   check([out.getpixel((boundary,y)) for y in range(64)]==[tile.getpixel((0,y)) for y in range(64)])
 key=(width,row['cameraX']);seen=coverage.setdefault(key,set())
 alpha=out.getchannel('A')
 for x in range(width):
  if alpha.crop((x,0,x+1,64)).getbbox():seen.add(x)
for (width,cam),seen in coverage.items():
 check(seen==set(range(width)) if width>256 else seen==set(range(1,256)))
(ROOT/'build/aqz-p1/strip-d-pixel-results.json').write_text(json.dumps({'status':'PASS','assertions':checks,'cases':len(raw['cases']),'coverage':'whole canonical phase cycle; canonical sparse shimmer retained each frame','baseline':'256px exact original clipped draw; wider view periodic raster with edge-overlap copies'},indent=2)+'\n')
print('AQZ D strip pixels',checks,'assertions PASS')
