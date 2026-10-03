"""Independent canonical SAT reconstruction from verified ROM, compare imported pixels."""
import hashlib,json,sys,re
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
import thz1_object_assets as a
rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes()
assert hashlib.sha256(rom).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
report=json.loads((ROOT/'POC_notes/rom-cache/thz-fidelity-followup.json').read_text())
vram,_=a.build_vram(rom,a.load_json(a.GRAPHICS_MAP));pal=a.thz1_sprite_palette(rom)
spr=ROOT/'sprites/SPR_chaos_object_27'
yy=json.loads((spr/'SPR_chaos_object_27.yy').read_text())
for r in report['bee']['rows']:
    if not r['mirror']:continue
    pixels=bytearray(32*24*4)
    for p in r['sat']:
        tile=p['pattern'];rows=a.tile_pixels(vram,tile)+a.tile_pixels(vram,tile+1)
        for y,line in enumerate(rows):
            for x,col in enumerate(line):
                xx,yypos=16+p['x']+x,20+p['y']+y;pos=(yypos*32+xx)*4
                if col and 0<=xx<32 and 0<=yypos<24 and not pixels[pos+3]:pixels[pos:pos+4]=bytes(pal[col])
    f=yy['frames'][r['frame']-1]['name']
    for image in [spr/(f+'.png'),*[spr/'layers'/f/(l['name']+'.png') for l in yy['layers']]]:
        assert Image.open(image).convert('RGBA').tobytes()==pixels
assert 'image_xscale = 1;' in (ROOT/'objects/OBJ_chaos_object_27/Create_0.gml').read_text()
print('PASS: both bee frames/layers exactly match original mirrored SAT, no second flip')
