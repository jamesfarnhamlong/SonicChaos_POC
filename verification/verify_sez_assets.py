"""ROM-backed S1 pixel/mapping checks, including every backdrop cell and priority pass."""
from pathlib import Path
import hashlib,json,os,sys
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/sez-s1';BUILD.mkdir(parents=True,exist_ok=True)
RESEARCH=Path(os.environ.get('SONIC_RESEARCH_MAIN')or ROOT.parent/'sonic-chaos-reference-work')   # a clean canonical-main checkout (another Research branch may be checked out in the working tree)
sys.path.insert(0,str(RESEARCH/'tools'))
import level_package as L
import thz1_object_assets as G
import sez_art_approval as A
sys.path.insert(0,str(ROOT/'POC_notes'))
from generate_mghz_footwear import compose,ANCHOR,REGISTRATION
checks=0
def check(ok,msg=''):
    global checks
    assert ok,msg
    checks+=1
def read(p):return json.loads(p.read_text())
def sprite(name,frame=0):
    d=ROOT/'sprites'/name;s=read(d/(name+'.yy'));f=s['frames'][frame]['name'];im=Image.open(d/(f+'.png')).convert('RGBA')
    for layer in s['layers']:check(im.tobytes()==Image.open(d/'layers'/f/(layer['name']+'.png')).convert('RGBA').tobytes(),name+' layer')
    return im,s
def crop(atlas,b):return atlas.crop(((b%16)*32,(b//16)*32,(b%16+1)*32,(b//16+1)*32))
sha=lambda b:hashlib.sha256(b).hexdigest()
rom=L.load_rom(ROOT.parent/'source/Sonic Chaos (Europe).sms')
ref=RESEARCH/'data/rom-cache/sez';cache=ROOT/'POC_notes/rom-cache/sez'
for n in ('implementation-manifest.json','art-approval.json','object-census.json'):check(read(ref/n)==read(cache/n),n+' canonical cache')
m=read(ref/'implementation-manifest.json');check(sha(rom)==m['rom_sha256'])
base,_=sprite('SPR_chaos_sez_blocks');front,_=sprite('SPR_chaos_sez_foreground')
blocks=cells=0
starts=[]
for key,a in m['acts'].items():
    vram,loads=L.build_vram(rom,a['descriptor']['art']);check(sha(vram)==a['graphics']['vram_sha256']);check(loads==a['graphics']['static_vram_loads'])
    palettes=[G.palette_rgba(rom,a['graphics']['palettes'][k]['index']) for k in ('background','sprite')]
    table=a['descriptor']['header']['block_mapping_rom'];bank=a['descriptor']['header']['block_mapping_bank'];ids=[b['block_id']for b in a['blocks']]
    check(table%0x4000==0x2A40,'nonaligned SEZ mapping table')
    decoded=L.block_pixel_maps(rom,vram,only=ids,mapping_rom=table);expected={}
    for b in a['blocks']:
        bid=b['block_id'];cpu=int.from_bytes(rom[table+bid*2:table+bid*2+2],'little');off=bank*0x4000+cpu-0x8000
        attrs=[int.from_bytes(rom[off+i:off+i+2],'little')for i in range(0,32,2)]
        check(attrs==b['mapping']['attributes']);check(off==b['mapping']['rom']);check(off!=table+cpu-0x8000,'reject stale mapping formula')
        check(sha(bytes(c for row in decoded[bid]for c in row))==b['decoded_palette_index_sha256'])
        im=Image.new('RGBA',(32,32));im.putdata([(0,0,0,0)if c==0 else palettes[bool(c&16)][c&15]for row in decoded[bid]for c in row]);expected[bid]=im
        check(crop(base,bid).tobytes()==im.tobytes())
        foreground=Image.new('RGBA',(32,32))
        for i,attr in enumerate(attrs):
            if attr&0x1000:
                x,y=i%4*8,i//4*8;foreground.paste(im.crop((x,y,x+8,y+8)),(x,y))
        check(crop(front,bid).tobytes()==foreground.tobytes());blocks+=1
    b0=L.block_pixel_maps(rom,vram,only=[176],mapping_rom=table)[176];check(not any(c for row in b0 for c in row),'$B0 is empty air');check(L.block_mapping(rom,table,176)['attributes']==[192]*16);expected[176]=Image.new('RGBA',(32,32))
    chunks=[sprite(f'SPR_chaos_{key}_terrain_{i}')[0]for i in range(4)]
    layout=[v for row in a['layout']['rows']for v in row]
    for i,b in enumerate(layout[:4095]):
        visible=157 if b in (155,156)else 176 if b==175 else 70 if b==71 or b in range(64,70)else b
        x,y=i%128*32,i//128*32
        check(chunks[x//1024].crop((x%1024,y,x%1024+32,y+32)).tobytes()==expected[visible].tobytes(),key+' backdrop '+str(i));cells+=1
    check(chunks[3].crop((992,992,1024,1024)).getbbox() is None,'unloaded final cell never rendered')
    for f in range(4):
        dyn=bytearray(vram);dyn[0x29A0:0x2A20]=rom[0x7455D+f*128:0x7455D+(f+1)*128]
        rows=L.block_pixel_maps(rom,dyn,only=[0x42],mapping_rom=table)[0x42]
        im=Image.new('RGBA',(16,16));im.putdata([(0,0,0,0)if c==0 else palettes[bool(c&16)][c&15]for row in rows[:16]for c in row[:16]])
        check(im.tobytes()==sprite('SPR_chaos_sez_terrain_ring',f)[0].tobytes(),'zone-2 ring upload')
    for isfront in (False,True):
        for frame,source in enumerate((None,0x74DFD,0x74DDD)):
            atlas,_=sprite('SPR_chaos_sez_effect5'+('_front'if isfront else ''),frame)
            dyn=bytearray(vram)
            if source is not None:dyn[0x2B00:0x2B20]=rom[source:source+32]
            p=L.block_pixel_maps(rom,dyn,only=ids,mapping_rom=table)
            for b in a['blocks']:
                bid=b['block_id'];attrs=b['mapping']['attributes'];data=[]
                for y,row in enumerate(p[bid]):
                    for x,c in enumerate(row):
                        attr=attrs[y//8*4+x//8];active=(attr&511)==0x158 and(not isfront or attr&4096)
                        colour=palettes[bool(c&16)][c&15]if c else tuple(palettes[0][0][:3])+(255,)
                        data.append(colour if active and(not isfront or c)else(0,0,0,0))
                im=Image.new('RGBA',(32,32));im.putdata(data);check(crop(atlas,bid).tobytes()==im.tobytes(),'effect 5 priority')
    # ROM-backed start preview (presentation QA, not native gameplay acceptance).
    full=Image.new('RGBA',(4096,1024),tuple(palettes[0][0]))
    for i,b in enumerate(layout[:4095]):full.alpha_composite(expected[b],(i%128*32,i//128*32))
    x,y=a['start']['camera'];starts.append(full.crop((x,y,x+640,y+224)).resize((960,336),Image.Resampling.NEAREST))
full=A.build(rom);check(A.manifest_for(full)==read(ref/'art-approval.json'),'complete approval recheck')
for t,name in ((0x28,'platform'),(0x2F,'spring_shoes')):
    subject=full['subjects'][str(t)];palette=subject['palette']
    frames=[f for f in subject['frames']if f['frame']!=0]
    for i,f in enumerate(frames):
        actual,yy=sprite('SPR_chaos_sez_'+name,i)
        check(actual.tobytes()==compose(f['images'][0],palette).tobytes(),'approved '+name)
        check([yy['sequence']['xorigin'],yy['sequence']['yorigin']]==[ANCHOR[0]-REGISTRATION[0],ANCHOR[1]-REGISTRATION[1]])
for rec in read(cache/'generated-assets.json')['assets']:
    check(sha(sprite(rec['resource'],rec['frame'])[0].tobytes())==rec['rgba_sha256'],'generated pixel hash')
board=Image.new('RGB',(960,3*360),(20,20,24));draw=ImageDraw.Draw(board)
for i,im in enumerate(starts):draw.text((8,i*360+5),'SEZ'+str(i+1)+' canonical start - asset preview',(255,255,255));board.paste(im,(0,i*360+24))
board.save(BUILD/'start-previews.png')
out={'status':'PASS','assertions':checks,'canonical_blocks':blocks,'backdrop_cells':cells,'ring_frames':4,'effect5_frames':3,'ROM_verified':sha(rom),'art_approval':'recomputed and matched'}
(BUILD/'asset-results.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
