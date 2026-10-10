"""Verify pinned AQZ P4 caches and every approved SAT sprite pixel."""
from pathlib import Path
import hashlib,json,sys,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];R=ROOT.parent/'sonic-chaos-reference-work';sys.path.insert(0,str(R/'tools'));import aqz_art_approval as A
commit='89641f8093e62401cd81f94e6ac889422f600472';cache=ROOT/'POC_notes/rom-cache/aqz';checks=0
def eq(a,b):
 global checks
 assert a==b;checks+=1
r=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes();eq(hashlib.sha256(r).hexdigest(),'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607')
for name in ['boss-59-runtime','boss-59-game-checks']:
 eq(json.loads((cache/(name+'.json')).read_bytes()),json.loads(subprocess.check_output(['git','-C',str(R),'show',commit+':data/rom-cache/aqz/'+name+'.json'])))
meta,art=A.build(r);assets=json.loads((cache/'boss-59-assets.json').read_bytes())
for typ,tag in [(89,'59-00-00'),(90,'5A-child'),(91,'5B-child'),(92,'5C-child'),(93,'5D-child')]:
 for flash in [False,True]:
  name=f'SPR_chaos_aqz_boss_{typ:02x}'+('_flash' if flash else '');dest=ROOT/'sprites'/name;yy=json.loads((dest/(name+'.yy')).read_text());eq([yy['width'],yy['height'],yy['sequence']['xorigin'],yy['sequence']['yorigin']],[128,128,63,78])
  for i,f in enumerate(art['subjects'][tag]['frames']):
   expected=Image.new('RGBA',(128,128))
   for piece in reversed(f['images'][0]['pieces']):
    for y,row in enumerate(piece['pixels']):
     for x,v in enumerate(row):
      if v:expected.putpixel((64+piece['x']+x,96+piece['y']+y),(255,255,255,255) if flash and v in [13,14] else (v+17,1,1,255))
   actual=Image.open(dest/(yy['frames'][i]['name']+'.png')).convert('RGBA');eq(actual.tobytes(),expected.tobytes())
   for a,b in zip(actual.getdata(),expected.getdata()):eq(a,b)
   rec=next(a for a in assets['assets'] if a['resource']==name and a['frame']==f['frame']);eq(hashlib.sha256(actual.tobytes()).hexdigest(),rec['rgba_sha256'])
out={'assertions':checks,'status':'PASS'};(ROOT/'build/aqz-p4/asset-results.json').write_text(json.dumps(out,indent=2)+'\n');print(out)
