"""Independent pixel checks of priority overlay and original terrain-ring uploads."""
import hashlib
import json
from pathlib import Path
import re
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
def gm(p): return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
def sprite(name,frame=0):
    directory=ROOT/'sprites'/name
    meta=gm(directory/(name+'.yy'))
    return Image.open(directory/(meta['frames'][frame]['name']+'.png')).convert('RGBA')

manifest=gm(ROOT/'POC_notes/rom-cache/gpz/implementation-manifest.json')
atlas=Image.open(ROOT/'verification/gpz-art-sanity/block-atlas.png').convert('RGBA')
foreground=sprite('SPR_chaos_gpz_foreground')
checked=0
for act in manifest['acts'].values():
    for block in act['blocks']:
        b=block['block_id']; bx,by=(b%16)*32,(b//16)*32
        if b in act['rings']['presence_and_replacement_tables']['ring_blocks']:
            assert not any(v&0x1000 for v in block['mapping']['attributes']), 'terrain-ring overlay must not redraw static ring pixels'
        original=atlas.crop((bx,by,bx+32,by+32))
        overlay=foreground.crop((bx,by,bx+32,by+32))
        assert Image.alpha_composite(original,overlay).tobytes()==original.tobytes()
        # Synthetic player fill must survive every transparent/nonpriority hole.
        player=Image.new('RGBA',(32,32),(255,0,255,255))
        composite=Image.alpha_composite(player,overlay)
        for y in range(32):
            for x in range(32):
                priority=block['mapping']['attributes'][(y//8)*4+x//8]&0x1000
                expected=atlas.getpixel((bx+x,by+y)) if priority else (0,0,0,0)
                assert foreground.getpixel((bx+x,by+y))==expected,(b,x,y)
                assert composite.getpixel((x,y))==(expected if expected[3] else (255,0,255,255))
                checked+=1
    key=next(k for k,v in manifest['acts'].items() if v is act)
    create=(ROOT/'objects'/f'OBJ_chaos_{key}_terrain'/'Create_0.gml').read_text()
    assert 'instance_create_depth(0,0,-60,OBJ_chaos_terrain_foreground)' in create
    # Background remains pixel-identical, including canonical priority cells.
    width=act['descriptor']['layout']['width_cells']
    cells=sum(act['layout']['rows'],[])[:act['layout']['runtime_written_cells']]
    chunks=[sprite(f'SPR_chaos_{key}_terrain_{n}') for n in range((act['dimensions_pixels'][0]+1023)//1024)]
    for i,b in enumerate(cells):
        visible=70 if b==71 or b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b
        x,y=(i%width)*32,(i//width)*32
        assert chunks[x//1024].crop((x%1024,y,x%1024+32,y+32)).tobytes()==atlas.crop(((visible%16)*32,(visible//16)*32,(visible%16+1)*32,(visible//16+1)*32)).tobytes()

rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes()
assert hashlib.sha256(rom).hexdigest()==manifest['rom_sha256']
assert rom[0x2b00:0x2b06]==bytes.fromhex('00805d858029')
assert rom[0x2a53:0x2a5b]==bytes.fromhex('3a97d2876f260011')
word=lambda p:int.from_bytes(rom[p:p+2],'little')
ring_act_table=word(word(0x2a5b)+2)
assert [word(ring_act_table+act*2) for act in range(3)]==[0x2b00]*3
assert rom[0x7450a:0x74519]==bytes.fromhex('3a2fd1e607c03a51d33cfe043801af')
palette=manifest['acts']['gpz1']['graphics']['palettes']['sprite']['cram']
meta=gm(ROOT/'sprites/SPR_chaos_gpz_terrain_ring/SPR_chaos_gpz_terrain_ring.yy')
assert len(meta['frames'])==4
for frame in range(4):
    image=sprite('SPR_chaos_gpz_terrain_ring',frame)
    for y in range(16):
        for x in range(16):
            tile=(y//8)*2+x//8
            p=0x7455d+frame*128+tile*32+(y%8)*4
            index=sum(((rom[p+plane]>>(7-x%8))&1)<<plane for plane in range(4))
            v=palette[index]
            expected=((v&3)*85,((v>>2)&3)*85,((v>>4)&3)*85,255) if index else (0,0,0,0)
            assert image.getpixel((x,y))==expected,(frame,x,y)
print(f'PASS: {checked} priority pixels, unchanged three-act background cells, four ROM planar ring frames')

# Standalone draw-order preview of the pictured GPZ1 horizontal pipe.
# Uses the actual player sprite; this is a compositing fixture, not gameplay.
act=manifest['acts']['gpz1']; background=Image.new('RGBA',(256,64))
overlay=Image.new('RGBA',(256,64))
for row in range(2):
    for col in range(8):
        b=act['layout']['rows'][8+row][27+col]
        box=((b%16)*32,(b//16)*32,(b%16+1)*32,(b//16+1)*32)
        background.paste(atlas.crop(box),(col*32,row*32))
        overlay.paste(foreground.crop(box),(col*32,row*32))
sonic=sprite('SPR_sonic_walk')
sonic_meta=gm(ROOT/'sprites/SPR_sonic_walk/SPR_sonic_walk.yy')['sequence']
old=background.copy()
for anchor_x in (912,944):
    # Shared adapter sprite-origin registration: canonical anchorY + 5.
    old.alpha_composite(sonic,(anchor_x-864-sonic_meta['xorigin'],294+5-256-sonic_meta['yorigin']))
new=Image.alpha_composite(old,overlay)
assert new.tobytes()!=old.tobytes(),'canonical foreground occludes the actual Sonic sprite'
preview=Image.new('RGBA',(768,440),(18,22,30,255));draw=ImageDraw.Draw(preview)
for i,(label,im) in enumerate([('Old flattened terrain: Sonic in front',old),('Canonical priority pass: pipe pixels in front',new)]):
    draw.text((8,i*220+5),label,fill='white')
    preview.alpha_composite(im.resize((768,192),Image.Resampling.NEAREST),(0,i*220+24))
preview.save(ROOT/'verification/gpz-art-sanity/pipe-priority-preview.png')
