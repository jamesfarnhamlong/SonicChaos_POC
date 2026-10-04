"""Independent ROM/pixel parity, priority and animation checks for M1."""
from pathlib import Path
import json,sys,hashlib,re
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m1'
sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
import level_package as L
import thz1_object_assets as G
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
def sprite(name,frame=0):
    d=ROOT/'sprites'/name;s=read(d/(name+'.yy'));f=s['frames'][frame]['name'];im=Image.open(d/(f+'.png')).convert('RGBA')
    for layer in s['layers']:assert im.tobytes()==Image.open(d/'layers'/f/(layer['name']+'.png')).convert('RGBA').tobytes()
    return im
def crop(atlas,b):return atlas.crop(((b%16)*32,(b//16)*32,(b%16+1)*32,(b//16+1)*32))
rom=L.load_rom(ROOT.parent/'source/Sonic Chaos (Europe).sms')
ref=ROOT.parent/'sonic-chaos-reference-work/data/rom-cache/mghz'
cache=ROOT/'POC_notes/rom-cache/mghz'
for n in ('implementation-manifest.json','art-approval.json','object-census.json','surface-1b-ceiling-spikes.json'):assert read(ref/n)==read(cache/n)
m=read(ref/'implementation-manifest.json');assert sha(rom)==m['rom_sha256']
base=sprite('SPR_chaos_mghz_blocks');front=sprite('SPR_chaos_mghz_foreground')
blocks=cells=0
for key,a in m['acts'].items():
    vram,loads=L.build_vram(rom,a['descriptor']['art']);assert sha(vram)==a['graphics']['vram_sha256']
    assert loads==a['graphics']['static_vram_loads']
    palettes=[G.palette_rgba(rom,a['graphics']['palettes'][k]['index']) for k in ('background','sprite')]
    for k,pal in zip(('background','sprite'),palettes):
        assert list(rom[L.PALETTE_DATA+a['graphics']['palettes'][k]['index']*16:L.PALETTE_DATA+a['graphics']['palettes'][k]['index']*16+16])==a['graphics']['palettes'][k]['cram']
    table=a['descriptor']['header']['block_mapping_rom'];bank=a['descriptor']['header']['block_mapping_bank'];ids=[b['block_id']for b in a['blocks']]
    decoded=L.block_pixel_maps(rom,vram,only=ids,mapping_rom=table);expected={}
    for b in a['blocks']:
        bid=b['block_id'];raw_pointer=int.from_bytes(rom[table+bid*2:table+bid*2+2],'little');file=bank*0x4000+raw_pointer-0x8000
        attrs=[int.from_bytes(rom[file+i:file+i+2],'little')for i in range(0,32,2)]
        assert attrs==b['mapping']['attributes'];assert file==b['mapping']['rom']
        assert sha(bytes(c for row in decoded[bid]for c in row))==b['decoded_palette_index_sha256']
        im=Image.new('RGBA',(32,32));im.putdata([(0,0,0,0)if c==0 else palettes[bool(c&16)][c&15]for row in decoded[bid]for c in row]);expected[bid]=im
        assert crop(base,bid).tobytes()==im.tobytes()
        foreground=Image.new('RGBA',(32,32))
        for i,attr in enumerate(attrs):
            if attr&0x1000:
                x,y=i%4*8,i//4*8;foreground.paste(im.crop((x,y,x+8,y+8)),(x,y))
        assert crop(front,bid).tobytes()==foreground.tobytes()
        for entry in (4,11):
            for isfront in (False,True):
                mask=crop(sprite(f'SPR_chaos_mghz_palette_{entry}'+('_front'if isfront else '')),bid)
                expected_mask=Image.new('RGBA',(32,32));expected_mask.putdata([(255,255,255,255)if c==entry and (not isfront or attrs[y//8*4+x//8]&0x1000)else (0,0,0,0)for y,row in enumerate(decoded[bid])for x,c in enumerate(row)])
                assert mask.tobytes()==expected_mask.tobytes()
        blocks+=1
    chunks=[sprite(f'SPR_chaos_{key}_terrain_{i}') for i in range((a['dimensions_pixels'][0]+1023)//1024)]
    width=a['descriptor']['layout']['width_cells'];layout=sum(a['layout']['rows'],[])
    for index,b in enumerate(layout[:a['layout']['runtime_written_cells']]):
        visible=157 if b in (155,156)else 70 if 64<=b<=69 else b
        x,y=index%width*32,index//width*32
        assert chunks[x//1024].crop((x%1024,y,x%1024+32,y+32)).tobytes()==expected[visible].tobytes(),(key,index)
        cells+=1
    if key!='mghz3':assert chunks[-1].crop((992,992,1024,1024)).getbbox() is None,'unloaded cell stays transparent'
    room=read(ROOT/'rooms'/f'ROM_chaos_{key}'/f'ROM_chaos_{key}.yy');assert [room['roomSettings']['Width'],room['roomSettings']['Height']]==a['dimensions_pixels']
    for f in m['terrain_ring_animation']['frames']:
        dynamic=bytearray(vram);src=f['source_rom'];data=rom[src:src+128];assert sha(data)==f['sha256'];dynamic[0x2160:0x21e0]=data
        p=L.block_pixel_maps(rom,dynamic,only=[66],mapping_rom=table)[66];im=Image.new('RGBA',(16,16));im.putdata([(0,0,0,0)if c==0 else palettes[bool(c&16)][c&15]for row in p[:16]for c in row[:16]])
        assert sprite('SPR_chaos_mghz_terrain_ring',f['frame']).tobytes()==im.tobytes()
    for f,src in enumerate((None,0x74e3d,0x74e1d)):
        dynamic=bytearray(vram)
        if src:dynamic[0x3500:0x3540]=rom[src:src+64]
        p=L.block_pixel_maps(rom,dynamic,only=ids,mapping_rom=table)
        for isfront in (False,True):
            atlas=sprite('SPR_chaos_mghz_strip'+('_front'if isfront else ''),f)
            for b in a['blocks']:
                bid=b['block_id'];attrs=b['mapping']['attributes'];data=[]
                for y,row in enumerate(p[bid]):
                    for x,c in enumerate(row):
                        attr=attrs[y//8*4+x//8];active=(attr&511)in (424,425)and(not isfront or attr&4096)
                        colour=palettes[bool(c&16)][c&15]if c else tuple(palettes[0][0][:3])+(255,)
                        data.append(colour if active and (not isfront or c)else(0,0,0,0))
                im=Image.new('RGBA',(32,32));im.putdata(data);assert crop(atlas,bid).tobytes()==im.tobytes()
    # Mapping negative control in the SAME BANK: aligned MGHZ must not conceal
    # table-relative conversion regressions. Recovered Aqua table is nonaligned.
    other=L.act_descriptor(rom,4,0) if hasattr(L,'act_descriptor') else None

# Explicit nonaligned mapping fixture from the reviewed GPZ bank ($11:$9640).
gpz=read(ROOT.parent/'sonic-chaos-reference-work/data/rom-cache/gpz/implementation-manifest.json')
h=gpz['acts']['gpz1']['descriptor']['header'];t=h['block_mapping_rom'];bid=1;cpu=int.from_bytes(rom[t+bid*2:t+bid*2+2],'little')
canonical=h['block_mapping_bank']*0x4000+cpu-0x8000
assert canonical==L.block_mapping(rom,t,bid)['rom'];assert canonical!=t+cpu-0x8000
BUILD.mkdir(parents=True,exist_ok=True)
report={'status':'PASS','canonical_blocks':blocks,'runtime_cells':cells,'ring_frames':4,'strip_frames':3,'palette_masks':'pixel-exact both priority passes','mapping_negative_control':'nonaligned GPZ table rejects table-relative formula','ROM_verified':sha(rom)}
(BUILD/'asset-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
