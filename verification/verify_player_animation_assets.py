"""Verify approved player art, recovered origins, indexed companion registration and cache provenance."""
from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
REF=ROOT.parent/'sonic-chaos-reference-work'
CACHE=ROOT/'POC_notes/rom-cache'
j=json.loads((CACHE/'player-spring-airborne.json').read_text())
assets=json.loads((CACHE/'player-spring-airborne-poc-assets.json').read_text())
project=json.loads((ROOT/'SonicChaos_POC.yyp').read_text())
registered={r['id']['name']:r['id']['path'] for r in project['resources']}
checks=0
def eq(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
sha=lambda b:hashlib.sha256(b).hexdigest()
eq(assets['research'],'81b82941e7f44865e0d551484bee82d28d600d43')
eq((CACHE/'player-spring-airborne.json').read_bytes(),(REF/'data/rom-cache/player-spring-airborne.json').read_bytes())
eq(len(assets['assets']),36)
for a in assets['assets']:
 name=a['resource'];meta=j['frames']['frames']['0x%02X'%a['frame']]
 png=ROOT/a['png'];image=Image.open(png).convert('RGBA')
 yy=json.loads((ROOT/registered[name]).read_text())
 eq(image.size,(meta['canvas_width'],meta['canvas_height']))
 eq([yy['sequence']['xorigin'],yy['sequence']['yorigin']],[meta['gamemaker_origin_x'],meta['gamemaker_origin_y']])
 eq(yy['sequence']['length'],1.0)
 eq(sha(image.tobytes()),a['rgba_sha256']);eq(sha(png.read_bytes()),a['png_sha256'])
 frame=yy['frames'][0]['name'];layer=yy['layers'][0]['name']
 eq(png.read_bytes(),(png.parent/'layers'/frame/(layer+'.png')).read_bytes())
 approved=REF/'build/player-spring-airborne'/('frame-%02X.png'%a['frame'])
 if not a['aqz_indexed']:
  eq(png.read_bytes(),approved.read_bytes())
  eq(sha(image.tobytes()),meta['rgba_sha256_thz1_palette'])
 else:
  eq(image.getchannel('A').tobytes(),Image.open(approved).convert('RGBA').getchannel('A').tobytes())
  for r,g,b,alpha in image.getdata():
   if alpha:eq(g,1);eq(b,1);eq(17<=r<=32,True)
manifest=json.loads((CACHE/'manifest.json').read_text())
for n in ['player-spring-airborne.json','player-spring-airborne-poc-assets.json']:
 eq(manifest['files'][n],{'sha256':sha((CACHE/n).read_bytes()),'bytes':(CACHE/n).stat().st_size})
adapter=(ROOT/'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml').read_text()
eq(adapter.index('if (chaos_player_animation_present(cp_p)) return;')<adapter.index('SCR_player_sprites();'),True)
eq('cp_p.mask_index = SPR_player_mask;' in adapter,True)
result={'status':'PASS','assertions':checks,'approved_frames':18,'indexed_companions':18,'unchanged_png_import':True}
(ROOT/'build/aqz-p1/player-animation-assets-results.json').write_text(json.dumps(result,indent=2)+'\n')
print('Player animation assets',checks,'assertions PASS')
